import { CHUNK_SIZE, chunkCoord, makeChunk, circleBlocked, lineBlocked, worldHash } from './world';
import type { Point, Obstacle, Chunk, Site } from './world';
import { ART, SPRITE_ANGLE } from './art';
import { CombatAudio } from './audio';
export type Weapon = 'pulse' | 'scatter' | 'drone';
export type Character = 'gunner' | 'engineer';
export type UpgradeChoice = { id:string; name:string; description:string; kind:string };
export type ContractChoice = { id:'stable'|'overload'|'extreme'; name:string; description:string; odds:string; reward:string; risk:string };
export type GameHud = {
 hp:number;maxHp:number;shield:number;time:number;xp:number;xpNeeded:number;level:number;kills:number;
 alloy:number;chips:number;cores:number;extractionOpen:boolean;extractProgress:number;bossHp:number;bossMaxHp:number;
 status:string;dashReady:boolean;nearExtract:boolean;events:number;danger:number;fragments:number;
 contracts:{name:string;description:string;positive:boolean}[];combo:number;comboTime:number;
 supplies:{id:string;name:string;remaining:number}[];interaction:string;
 target:{name:string;distance:number;direction:string}|null;bossRevealed:boolean;bossActive:boolean;contractCount:number;
 bossKilled:boolean;explored:number;modules:string[];message:string;
 rescueAvailable:boolean;tutorialStep:string;damageMultiplier:number;attackMultiplier:number;moveMultiplier:number;playerSpeed:number;pressure:number;
};
export type GameResult = {success:boolean;reason:'extracted'|'dead'|'timeout';alloy:number;chips:number;cores:number;kills:number;time:number;level:number;bossKilled:boolean;collected:{alloy:number;chips:number;cores:number};events:number;contracts:number;maxCombo:number;explored:number;lastDamageSource?:string};
export type GameOptions = {
 weapon:Weapon;character:Character;healthLevel:number;magnetLevel:number;trail:boolean;
 modules?:string[];moduleLevels?:Partial<Record<string,number>>;objective?:Objective;sound?:boolean;screenShake?:boolean;
 onHud:(hud:GameHud)=>void;onUpgrade:(choices:UpgradeChoice[])=>void;onFinish:(result:GameResult)=>void;onContract:(choices:ContractChoice[])=>void;
};
export type Objective='resource'|'boss'|'extract'|'terminal';
type V=Point;
type PendingEnemy=V&{type:EnemyKind;delay:number;noLoot:boolean};
type DeathEffect=V&{kind:EnemyKind;r:number;life:number;max:number;angle:number};
type EnemyKind='normal'|'shooter'|'lobber'|'teleporter'|'boss';
type Enemy=V&{id:number;type:EnemyKind;hp:number;max:number;r:number;speed:number;hit:number;shot:number;phase:number;mode:string;timer:number;aim:number;tx:number;ty:number;pattern:number;guard?:string;path?:V;pathTime:number;noLoot?:boolean};
type Bullet=V&{vx:number;vy:number;damage:number;life:number;hostile:boolean;r:number;color:string;hits:number;hitIds:Set<number>};
type PickupKind='xp'|'fragment'|'core'|'heal'|'shield'|'overcharge'|'speed';
type Pickup=V&{id?:string;type:PickupKind;amount:number;phase:number;life:number};
type Particle=V&{vx:number;vy:number;life:number;max:number;size:number;color:string};
type FloatText=V&{text:string;color:string;life:number;max:number;size:number};
type Warning=V&{r:number;timer:number;max:number;damage:number;color:string};
type EventState={status:'idle'|'active'|'done';guards:number[]};
type InteractSite=Omit<Site,'kind'>&{kind:Site['kind']|'boss'};
const TAU=Math.PI*2;
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const distance=(a:V,b:V)=>Math.hypot(a.x-b.x,a.y-b.y);
const palette={cyan:'#7bf4e7',blue:'#7ca8ff',purple:'#bf94ff',gold:'#ffd680',red:'#fa7c86',green:'#a5e9a5'};
const UPGRADES:UpgradeChoice[]=[
 {id:'damage',name:'超载弹头',description:'武器伤害 +20%，最高 3.8 倍',kind:'火力'},
 {id:'rapid',name:'急速回路',description:'自动攻击速度 +15%，最高 2.8 倍',kind:'火力'},
 {id:'shield',name:'护盾充能',description:'立即补充 28 点护盾，上限 100',kind:'生存'},
 {id:'heal',name:'纳米修复',description:'立即恢复 35 点生命',kind:'生存'},
 {id:'speed',name:'推进强化',description:'移动速度提高，永久增幅上限 25%，缩短冲刺冷却',kind:'机动'},
 {id:'magnet',name:'引力吸附',description:'拾取半径 +20%',kind:'搜集'},
];
const CONTRACTS:ContractChoice[]=[
 {id:'stable',name:'稳定协议',description:'可靠补强当前装备，本局生效。',odds:'100% 正面',reward:'武器伤害 +8%',risk:'无负面效果'},
 {id:'overload',name:'超载协议',description:'承担风险，争取更强火力。本局生效。',odds:'60% 正面 / 40% 负面',reward:'武器伤害 +28%',risk:'失败：受到的伤害 +12%'},
 {id:'extreme',name:'极限协议',description:'追求改变打法的大奖。本局生效。',odds:'15% 大奖 / 85% 负面',reward:'伤害 +20%，子弹命中触发连锁电击',risk:'失败：受到的伤害 +25%'},
];
/** Local-only simulation. Geometry is regenerated; consumed sites survive chunk unloading. */
export class StarbreakGame {
 private canvas:HTMLCanvasElement;private ctx:CanvasRenderingContext2D;private options:GameOptions;private resizeObserver:ResizeObserver;
 private width=960;private height=640;private dpr=1;
 private player={x:0,y:0,hp:110,maxHp:110,shield:0,angle:-Math.PI/2,invulnerable:0,dashTime:0,dashCooldown:0,dx:0,dy:-1};
 private seed=Math.floor(Math.random()*0x7fffffff);private chunks=new Map<string,Chunk>();private visited=new Set<string>();
 private eventStates=new Map<string,EventState>();private usedTerminals=new Set<string>();private consumedSupplies=new Set<string>();
 private obstacles:Obstacle[]=[];private sites:Site[]=[];private currentChunk='';
 private extraction={x:0,y:115,r:85};private activeExtraction:Site|null=null;
 private bossSite:Site|null=null;private bossExtraction:Site|null=null;
 private enemies:Enemy[]=[];private bullets:Bullet[]=[];private pickups:Pickup[]=[];private particles:Particle[]=[];private texts:FloatText[]=[];private warnings:Warning[]=[];
 private keys=new Set<string>();private input={x:0,y:0};private running=false;private destroyed=false;private paused=false;private upgrading=false;private contracting=false;
 private raf=0;private last=0;private elapsed=0;private visualTime=0;private hudTimer=0;private spawnTimer=3;private shotTimer=.1;private droneTimer=0;private nextId=0;private speed=1;private shake=0;
 private level=1;private xp=0;private xpNeeded=6;private kills=0;private events=0;private fragments=0;private bag={alloy:0,chips:0,cores:0};
 private damage=1;private attackSpeed=1;private moveSpeed=1;private magnet=1;
 private extractionProgress=0;private bossKilled=false;private bossActive=false;
 private currentChoices:UpgradeChoice[]=[];private activeTerminal:Site|null=null;
 private contracts:GameHud['contracts']=[];private damageTaken=1;private chain=false;private chainCooldown=0;
 private supplyTimers={overcharge:0,speed:0};private combo=0;private maxCombo=0;private lastKill=-100;private comboTime=0;private rescueUsed=false;
 private message='';private messageTime=0;
 private objective:Objective='resource';private objectiveManual=false;private audio:CombatAudio;private shakeEnabled=true;private sprites=new Map<string,HTMLImageElement>();
 private pending:PendingEnemy[]=[];private deaths:DeathEffect[]=[];private cleanupTimer=0;private wave=0;private muzzleTime=0;private damageTextTimer=0;
 private velocity={x:0,y:0};private flow=new Map<string,V>();private flowTimer=0;private lastDamageSource='';private extractionWave=0;
 private keyDown=(event:KeyboardEvent)=>{
  const k=event.key.toLowerCase();this.audio.unlock();
  if(['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright',' ','e'].includes(k)&&this.running&&!this.paused){
   event.preventDefault();this.keys.add(k);if(k===' '&&!event.repeat)this.dash();if(k==='e'&&!event.repeat)this.interact();
  }
 };
 private keyUp=(event:KeyboardEvent)=>{this.keys.delete(event.key.toLowerCase());};
 private pointerDown=()=>{this.audio.unlock();};
 private blur=()=>{this.keys.clear();this.input={x:0,y:0};};
 constructor(canvas:HTMLCanvasElement,options:GameOptions){
  this.canvas=canvas;this.options=options;this.objective=options.objective||'resource';this.objectiveManual=!!options.objective&&options.objective!=='resource';this.audio=new CombatAudio(options.sound!==false);this.shakeEnabled=options.screenShake!==false;
  if(typeof Image!=='undefined')for(const [key,src]of Object.entries(ART)){const image=new Image();image.src=src;this.sprites.set(key,image);}
  const context=canvas.getContext('2d');if(!context)throw new Error('当前浏览器不支持 Canvas 2D');this.ctx=context;
  this.player.maxHp=110+options.healthLevel*10;this.player.hp=this.player.maxHp;this.player.shield=options.character==='engineer'?20:0;
  this.magnet=1+options.magnetLevel*.2+(this.hasModule('magnet')?.25+this.moduleLevel('magnet')*.1:0);
  if(this.hasModule('pierce'))this.damage+=this.moduleLevel('pierce')*.08;
  this.refreshChunks(true);this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);
  canvas.addEventListener('pointerdown',this.pointerDown);window.addEventListener('keydown',this.keyDown);window.addEventListener('keyup',this.keyUp);window.addEventListener('blur',this.blur);this.resize();
 }
 start(){if(this.running||this.destroyed)return;this.running=true;this.audio.unlock();this.last=performance.now();this.notify('首次行动：跟随金色标记，到资源仓按 E',palette.cyan);this.emitHud();this.raf=requestAnimationFrame(this.frame);}
 destroy(){this.running=false;this.destroyed=true;cancelAnimationFrame(this.raf);this.audio.destroy();this.resizeObserver.disconnect();this.canvas.removeEventListener('pointerdown',this.pointerDown);window.removeEventListener('keydown',this.keyDown);window.removeEventListener('keyup',this.keyUp);window.removeEventListener('blur',this.blur);}
 setPaused(value:boolean){this.paused=value;this.blur();this.last=performance.now();}
 setInput(x:number,y:number){if(x||y)this.audio.unlock();this.input={x:clamp(x,-1,1),y:clamp(y,-1,1)};}
 setSpeed(mult:number){this.speed=clamp(mult,.5,3);}
 setObjective(goal:Objective){this.objective=goal;this.objectiveManual=true;this.emitHud();}
 setAudioEnabled(enabled:boolean){this.audio.setEnabled(enabled);}
 setAudioVolume(volume:number){this.audio.setVolume(volume);}
 setScreenShake(enabled:boolean){this.shakeEnabled=enabled;}
 private movementMultiplier(){return this.moveSpeed*(this.supplyTimers.speed>0?1.25:1)*(this.comboTime>0?1.1:1);}
 dash(){if(!this.running||this.paused||this.upgrading||this.contracting||this.player.dashCooldown>0)return;this.audio.play('dash');this.player.dashTime=.18;this.player.invulnerable=.3;this.player.dashCooldown=3.3/Math.sqrt(this.moveSpeed);this.burst(this.player.x,this.player.y,palette.cyan,12,110);}
 chooseUpgrade(id:string){
  if(!this.upgrading||!this.currentChoices.some(c=>c.id===id))return;
  if(id==='damage')this.damage=Math.min(3.8,this.damage+.2);if(id==='rapid')this.attackSpeed=Math.min(2.8,this.attackSpeed+.15);
  if(id==='shield')this.player.shield=Math.min(100,this.player.shield+28);if(id==='heal')this.player.hp=Math.min(this.player.maxHp,this.player.hp+35);
  if(id==='speed')this.moveSpeed=Math.min(1.25,this.moveSpeed+.1);if(id==='magnet')this.magnet=Math.min(3,this.magnet+.2);
  if(id==='module-pierce')this.damage=Math.min(3.8,this.damage+.3);if(id==='module-fortress')this.player.shield=Math.min(100,this.player.shield+45);
  if(id==='module-shockwave'){this.player.dashCooldown=0;this.moveSpeed=Math.min(1.25,this.moveSpeed+.12);}
  if(id==='module-rescue')this.player.hp=Math.min(this.player.maxHp,this.player.hp+55);if(id==='module-insulation')this.player.shield=Math.min(100,this.player.shield+38);
  if(id==='module-magnet')this.magnet=Math.min(3,this.magnet+.4);
  this.audio.play('upgrade');this.float(this.player.x,this.player.y-45,this.currentChoices.find(c=>c.id===id)?.name||'',palette.cyan);this.upgrading=false;this.last=performance.now();this.options.onUpgrade([]);this.checkLevel();this.emitHud();
 }
 interact(){
  if(!this.running||this.paused||this.upgrading||this.contracting)return;const near=this.nearestInteraction();if(!near)return;
  if(near.kind==='boss'){this.spawnBoss();return;}
  if(near.kind==='resource'){
   const state=this.eventStates.get(near.id)||{status:'idle',guards:[]};if(state.status!=='idle')return;
   const count=near.rare?7:6;
   this.pruneDistantEnemies();if(this.enemies.length+count>42){this.notify('附近敌人过多，先清理再开启资源仓',palette.gold);return;}
   state.status='active';state.guards=[];this.eventStates.set(near.id,state);const formation=worldHash(Math.round(near.x),Math.round(near.y),this.seed)%2;
   for(let i=0;i<count;i++){const a=formation?Math.PI*.15+i/count*TAU:i/count*TAU,rad=formation?175+(i%2)*35:170;
    const pos=this.freePosition({x:near.x+Math.cos(a)*rad,y:near.y+Math.sin(a)*rad},21);
    const type:EnemyKind=i===count-1?'shooter':near.rare&&i===count-2?'lobber':'normal';const enemy=this.spawnEnemy(type,pos,near.id);if(enemy)state.guards.push(enemy.id);}
   this.notify('资源仓警报：击败标记守卫，领取一次性物资',palette.gold);this.emitHud();return;
  }
  if(near.kind==='terminal'){
   if(this.usedTerminals.has(near.id)){this.notify('此终端已使用，本局不会刷新',palette.purple);return;}
   if(this.contracts.length>=2){this.notify('本局已签订两份契约',palette.purple);return;}
   if(this.fragments<10){this.notify('还需 '+(10-this.fragments)+' 枚异常碎片，击败守卫可获得',palette.purple);return;}
   this.activeTerminal=near as Site;this.contracting=true;this.blur();this.options.onContract(CONTRACTS);this.emitHud();return;
  }
  if(near.kind==='extract'){
   if(this.activeExtraction){this.notify('接应正在抵达，留在圆圈内即可移动防守',palette.cyan);return;}
   this.activeExtraction=near as Site;this.extractionProgress=0;this.extractionWave=0;this.spawnTimer=99;this.queueWave(4,true,330);this.notify('接应已呼叫：守住 10 秒，离开圆圈可取消',palette.cyan);this.emitHud();
  }
 }
 chooseContract(id:ContractChoice['id']){
  if(!this.contracting||!this.activeTerminal||this.fragments<10||this.contracts.length>=2||this.usedTerminals.has(this.activeTerminal.id))return;
  if(!CONTRACTS.some(c=>c.id===id))return;this.fragments-=10;this.usedTerminals.add(this.activeTerminal.id);
  let name='',description='',positive=true;
  if(id==='stable'){this.damage=Math.min(3.8,this.damage+.08);name='稳定火控';description='本局武器伤害 +8%';}
  if(id==='overload'){if(Math.random()<.6){this.damage=Math.min(3.8,this.damage+.28);name='超载火控';description='本局武器伤害 +28%';}
   else{this.damageTaken+=.12;positive=false;name='回路泄漏';description='本局受到的伤害 +12%';}}
  if(id==='extreme'){if(Math.random()<.15){this.chain=true;this.damage=Math.min(3.8,this.damage+.2);name='雷霆连锁';description='本局伤害 +20%，命中触发连锁电击';}
   else{this.damageTaken+=.25;positive=false;name='脆弱协议';description='本局受到的伤害 +25%';}}
  this.audio.play('contract');this.contracts.push({name,description,positive});this.closeContract();this.notify((positive?'契约获得':'风险兑现')+'：'+name+' · 持续本局',positive?palette.purple:palette.red);this.emitHud();
 }
 closeContract(){this.contracting=false;this.activeTerminal=null;this.blur();this.last=performance.now();this.options.onContract([]);this.emitHud();}
 private hasModule(id:string){return this.options.modules?.includes(id)||false;}
 private moduleLevel(id:string){return clamp(this.options.moduleLevels?.[id]||0,0,2);}
 private danger(){const depth=Math.max(Math.abs(chunkCoord(this.player.x)),Math.abs(chunkCoord(this.player.y)));return clamp(Math.floor(depth/3)+Math.floor(this.events/3)+(this.bag.cores>0?1:0),0,3);}
 private resize(){const b=this.canvas.getBoundingClientRect();this.width=Math.max(280,b.width);this.height=Math.max(240,b.height);this.dpr=Math.min(2,window.devicePixelRatio||1);this.canvas.width=Math.round(this.width*this.dpr);this.canvas.height=Math.round(this.height*this.dpr);this.draw();}
 private frame=(now:number)=>{
  if(this.destroyed)return;const realDt=Math.min(.04,Math.max(0,(now-this.last)/1000));this.last=now;this.visualTime+=realDt;
  if(this.running&&!this.paused&&!this.upgrading&&!this.contracting){const total=realDt*this.speed,steps=Math.max(1,Math.ceil(total/.025));for(let i=0;i<steps&&this.running&&!this.upgrading&&!this.contracting;i++)this.update(total/steps);}
  this.draw();if(this.running)this.raf=requestAnimationFrame(this.frame);
 };
 private refreshChunks(force=false){
  const cx=chunkCoord(this.player.x),cy=chunkCoord(this.player.y),key=cx+','+cy;if(!force&&key===this.currentChunk)return;this.currentChunk=key;this.visited.add(key);
  const keep=new Set<string>();for(let x=cx-1;x<=cx+1;x++)for(let y=cy-1;y<=cy+1;y++){
   const k=x+','+y;keep.add(k);if(!this.chunks.has(k)){const chunk=makeChunk(x,y,this.seed);this.chunks.set(k,chunk);
    const sid=k+':supply';if(!this.consumedSupplies.has(sid)&&!this.pickups.some(p=>p.id===sid)){
     const kinds:PickupKind[]=['heal','shield','overcharge','speed'],h=worldHash(x,y,this.seed);this.pickups.push({id:sid,x:x*CHUNK_SIZE+25,y:y*CHUNK_SIZE+125,type:kinds[h%4],amount:1,phase:0,life:Infinity});}
   }
  }
  for(const k of this.chunks.keys())if(!keep.has(k))this.chunks.delete(k);
  this.sites=[...this.chunks.values()].flatMap(c=>c.sites);this.obstacles=[...this.chunks.values()].flatMap(c=>c.obstacles);
  if(this.bossSite)this.obstacles=this.obstacles.filter(o=>distance({x:o.x+o.w/2,y:o.y+o.h/2},this.bossSite!)>420);
  if(this.bossExtraction)this.sites.push(this.bossExtraction);
  const removed=new Set(this.enemies.filter(e=>e.type!=='boss'&&distance(e,this.player)>1600).map(e=>e.id));
  for(const [id,state]of this.eventStates)if(state.status==='active'&&state.guards.some(n=>removed.has(n))){state.status='idle';state.guards=[];this.enemies=this.enemies.filter(e=>e.guard!==id);}
  this.enemies=this.enemies.filter(e=>!removed.has(e.id));this.pickups=this.pickups.filter(p=>p.type==='core'||distance(p,this.player)<1700);
 }
 private freePosition(pos:V,r:number):V{
  if(!circleBlocked(pos,r,this.obstacles))return pos;
  for(let ring=1;ring<8;ring++)for(let j=0;j<12;j++){const a=j/12*TAU,p={x:pos.x+Math.cos(a)*ring*30,y:pos.y+Math.sin(a)*ring*30};if(!circleBlocked(p,r,this.obstacles))return p;}
  return{x:Math.round(pos.x/CHUNK_SIZE)*CHUNK_SIZE,y:Math.round(pos.y/CHUNK_SIZE)*CHUNK_SIZE};
 }
 private moveEntity(entity:V,dx:number,dy:number,r:number){
  const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/12));
  for(let i=0;i<steps;i++){
   if(!circleBlocked({x:entity.x+dx/steps,y:entity.y},r,this.obstacles))entity.x+=dx/steps;
   if(!circleBlocked({x:entity.x,y:entity.y+dy/steps},r,this.obstacles))entity.y+=dy/steps;
  }
 }
 private pruneDistantEnemies(){
  const far=Math.max(980,Math.hypot(this.width,this.height)/2+220);
  this.enemies=this.enemies.filter(e=>e.type==='boss'||e.guard||distance(e,this.player)<far);
 }
 private queueWave(count:number,noLoot=false,range=490){
  if(this.bossActive)return;this.pruneDistantEnemies();const nearby=this.enemies.filter(e=>distance(e,this.player)<900).length,limit=12+this.danger()*4;
  count=Math.min(count,Math.max(0,limit-nearby-this.pending.length),42-this.enemies.length-this.pending.length);if(count<=0)return;
  const moving=Math.hypot(this.velocity.x,this.velocity.y)>20,heading=moving?Math.atan2(this.velocity.y,this.velocity.x):this.wave*.72;
  for(let i=0;i<count;i++){const a=heading+(i%2?1:-1)*(.55+Math.floor(i/2)*.68)+(moving?0:Math.PI*.2),roll=Math.random();
   const type:EnemyKind=this.danger()>=2&&roll<.16?'teleporter':this.danger()>=1&&roll<.28?'lobber':i===count-1?'shooter':'normal';
   const lead=moving?Math.min(150,Math.hypot(this.velocity.x,this.velocity.y)*.55):0,pos=this.freePosition({x:this.player.x+Math.cos(a)*range+Math.cos(heading)*lead,y:this.player.y+Math.sin(a)*range+Math.sin(heading)*lead},22);
   this.pending.push({...pos,type,delay:.8+i*.07,noLoot});
  }this.wave++;
 }
 private updateDirector(dt:number){
  this.cleanupTimer-=dt;if(this.cleanupTimer<=0){this.cleanupTimer=.8;this.pruneDistantEnemies();}
  for(const p of this.pending){p.delay-=dt;if(p.delay<=0){if(distance(p,this.player)<130){p.delay=.25;continue;}this.spawnEnemy(p.type,{x:p.x,y:p.y},undefined,p.noLoot);p.delay=-99;}}
  this.pending=this.pending.filter(p=>p.delay>-90&&distance(p,this.player)<1300).slice(-16);
  if(this.bossActive){this.pending=[];return;}
  if(this.activeExtraction){if(this.extractionProgress>.35&&this.extractionWave===0){this.extractionWave=1;this.queueWave(4,true,340);}return;}
  this.spawnTimer-=dt;if(this.spawnTimer<=0){this.queueWave(5+this.danger());this.spawnTimer=4.6-this.danger()*.3;}
 }
 private route(enemy:Enemy,target:V,dt:number){
  let point=target;
  if(lineBlocked(enemy,target,this.obstacles,enemy.r+2)){
   if(this.flowTimer<=0){this.flowTimer=.55;this.buildFlow();}
   const cell=40,gx=Math.round(enemy.x/cell),gy=Math.round(enemy.y/cell),next=this.flow.get(gx+','+gy);if(next)point=next;
   else{enemy.pathTime-=dt;if(enemy.pathTime<=0){enemy.pathTime=.45;enemy.path=undefined;const candidates:V[]=[];
    for(const o of this.obstacles)if(lineBlocked(enemy,target,[o],enemy.r+2))for(const x of[o.x-enemy.r-10,o.x+o.w+enemy.r+10])for(const y of[o.y-enemy.r-10,o.y+o.h+enemy.r+10]){const p={x,y};if(!circleBlocked(p,enemy.r,this.obstacles)&&!lineBlocked(enemy,p,this.obstacles,enemy.r+1))candidates.push(p);}
    enemy.path=candidates.sort((a,b)=>distance(enemy,a)+distance(a,target)-distance(enemy,b)-distance(b,target))[0];}if(enemy.path)point=enemy.path;}
  }
  const dx=point.x-enemy.x,dy=point.y-enemy.y,d=Math.max(1,Math.hypot(dx,dy));this.moveEntity(enemy,dx/d*enemy.speed*dt,dy/d*enemy.speed*dt,enemy.r);
 }
 private buildFlow(){
  this.flow.clear();const cell=40,cx=Math.round(this.player.x/cell),cy=Math.round(this.player.y/cell),queue:{x:number;y:number}[]=[];const seen=new Set<string>();
  let start={x:cx,y:cy};if(circleBlocked({x:cx*cell,y:cy*cell},22,this.obstacles))for(const [dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]])if(!circleBlocked({x:(cx+dx)*cell,y:(cy+dy)*cell},22,this.obstacles)){start={x:cx+dx,y:cy+dy};break;}
  queue.push(start);seen.add(start.x+','+start.y);
  for(let i=0;i<queue.length&&i<1800;i++){const n=queue[i];for(const [dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const x=n.x+dx,y=n.y+dy,key=x+','+y;if(Math.abs(x-cx)>20||Math.abs(y-cy)>20||seen.has(key))continue;seen.add(key);if(circleBlocked({x:x*cell,y:y*cell},22,this.obstacles))continue;this.flow.set(key,{x:n.x*cell,y:n.y*cell});queue.push({x,y});}}
 }
 private update(dt:number){
  this.elapsed+=dt;this.flowTimer-=dt;this.muzzleTime=Math.max(0,this.muzzleTime-dt);this.damageTextTimer=Math.max(0,this.damageTextTimer-dt);this.messageTime=Math.max(0,this.messageTime-dt);this.player.invulnerable=Math.max(0,this.player.invulnerable-dt);this.player.dashCooldown=Math.max(0,this.player.dashCooldown-dt);
  const wasDashing=this.player.dashTime>0;this.player.dashTime=Math.max(0,this.player.dashTime-dt);
  if(wasDashing&&this.player.dashTime===0&&this.hasModule('shockwave')){const radius=100+this.moduleLevel('shockwave')*25;this.burst(this.player.x,this.player.y,palette.cyan,28,radius);
   for(const e of this.enemies)if(e.type!=='boss'&&distance(e,this.player)<radius){const d=Math.max(1,distance(e,this.player));this.moveEntity(e,(e.x-this.player.x)/d*70,(e.y-this.player.y)/d*70,e.r);this.hitEnemy(e,8);}}
  this.shake=Math.max(0,this.shake-dt*15);this.comboTime=Math.max(0,this.comboTime-dt);this.chainCooldown=Math.max(0,this.chainCooldown-dt);
  if(this.elapsed-this.lastKill>4)this.combo=0;this.supplyTimers.overcharge=Math.max(0,this.supplyTimers.overcharge-dt);this.supplyTimers.speed=Math.max(0,this.supplyTimers.speed-dt);
  let mx=this.input.x+(this.keys.has('d')||this.keys.has('arrowright')?1:0)-(this.keys.has('a')||this.keys.has('arrowleft')?1:0);
  let my=this.input.y+(this.keys.has('s')||this.keys.has('arrowdown')?1:0)-(this.keys.has('w')||this.keys.has('arrowup')?1:0);
  const ml=Math.hypot(mx,my);if(ml>0){mx/=Math.max(1,ml);my/=Math.max(1,ml);this.player.dx=mx;this.player.dy=my;}
  const dash=this.player.dashTime>0,v=175*this.movementMultiplier()*(dash?3.8:1),beforeMove={x:this.player.x,y:this.player.y};
  this.moveEntity(this.player,(dash?this.player.dx:mx)*v*dt,(dash?this.player.dy:my)*v*dt,16);this.velocity={x:(this.player.x-beforeMove.x)/dt,y:(this.player.y-beforeMove.y)/dt};this.refreshChunks();
  if(ml>.05&&(this.options.trail||dash)&&Math.random()<dt*35)this.particles.push({x:this.player.x,y:this.player.y,vx:-mx*20,vy:-my*20,life:.45,max:.45,color:this.options.trail?palette.purple:palette.cyan,size:dash?6:3});
  this.updateDirector(dt);
  this.shotTimer-=dt;if(this.shotTimer<=0)this.shoot();this.updateDrones(dt);
  for(const e of this.enemies){if(e.hp<=0)continue;e.hit=Math.max(0,e.hit-dt);e.phase+=dt;e.shot-=dt;this.updateEnemy(e,dt);}
  for(let i=0;i<this.enemies.length;i++)for(let j=i+1;j<this.enemies.length;j++){const a=this.enemies[i],b=this.enemies[j];if(a.type==='boss'||b.type==='boss')continue;const dx=a.x-b.x,dy=a.y-b.y,d=Math.hypot(dx,dy),min=a.r+b.r-3;
   if(d>.1&&d<min){const f=(min-d)*.18;this.moveEntity(a,dx/d*f,dy/d*f,a.r);this.moveEntity(b,-dx/d*f,-dy/d*f,b.r);}}
  for(const b of this.bullets){const before={x:b.x,y:b.y};b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
   if(lineBlocked(before,b,this.obstacles,b.r)){b.life=0;this.burst(b.x,b.y,b.color,2,30);continue;}
   if(b.hostile){if(distance(b,this.player)<b.r+15){this.hurt(b.damage,'bullet','敌方弹丸');b.life=0;}}
   else for(const e of this.enemies){if(e.hp<=0||b.life<=0||b.hitIds.has(e.id)||distance(b,e)>b.r+e.r)continue;b.hitIds.add(e.id);this.hitEnemy(e,b.damage);
    if(this.chain&&this.chainCooldown<=0){this.chainCooldown=.22;const others=this.enemies.filter(q=>q.id!==e.id&&q.hp>0&&distance(q,e)<155&&!lineBlocked(e,q,this.obstacles)).slice(0,2);for(const q of others){this.hitEnemy(q,b.damage*.55);this.burst(q.x,q.y,palette.blue,8,90);}}
    b.hits--;if(b.hits<=0)b.life=0;}
  }
  this.bullets=this.bullets.filter(b=>b.life>0&&distance(b,this.player)<1400).slice(-260);this.enemies=this.enemies.filter(e=>e.hp>0);
  for(const w of this.warnings){w.timer-=dt;if(w.timer<=0){if(distance(w,this.player)<w.r+12)this.hurt(w.damage,'explosion',this.bossActive?'守卫地面轰炸':'投掷怪爆炸');this.burst(w.x,w.y,w.color,25,160);}}
  this.warnings=this.warnings.filter(w=>w.timer>0).slice(-36);
  if(this.player.hp<=0){this.finish('dead');return;}
  this.updatePickups(dt);this.updateEvents();this.updateEffects(dt);
  if(this.player.hp<=0){this.finish('dead');return;}
  if(this.activeExtraction){if(distance(this.player,this.activeExtraction)>85){this.activeExtraction=null;this.extractionProgress=0;this.spawnTimer=1.8;this.notify('已离开接应范围，撤离取消；可重新呼叫',palette.gold);}
   else{this.extractionProgress+=dt/10;if(this.extractionProgress>=1){this.finish('extracted');return;}}}
  this.hudTimer+=dt;if(this.hudTimer>=.08){this.hudTimer=0;this.emitHud();}
 }
 private updateEnemy(e:Enemy,dt:number){
  if(e.type==='boss'){this.updateBoss(e,dt);return;}if(e.mode==='emerge'){e.timer-=dt;if(e.timer<=0)e.mode='idle';return;}
  const d=distance(e,this.player);if(d<e.r+16&&e.mode!=='telegraph'&&e.mode!=='strike'&&e.mode!=='windup-rush')this.hurt(e.type==='teleporter'?12:8,'contact',e.type==='normal'?'追击怪撞击':'敌人近战');
  if(e.type==='normal'){
   if(e.mode==='windup-rush'){e.timer-=dt;if(e.timer<=0){e.mode='rush';e.timer=.5;}return;}
   if(e.mode==='rush'){this.moveEntity(e,Math.cos(e.aim)*235*dt,Math.sin(e.aim)*235*dt,e.r);e.timer-=dt;if(e.timer<=0){e.mode='idle';e.shot=4.8;}return;}
   if(e.id%4===0&&e.shot<=0&&d>130&&d<290&&!lineBlocked(e,this.player,this.obstacles)){e.mode='windup-rush';e.timer=.55;e.aim=Math.atan2(this.player.y+clamp(this.velocity.y*.45,-70,70)-e.y,this.player.x+clamp(this.velocity.x*.45,-70,70)-e.x);return;}
   if(d>e.r+14)this.route(e,this.player,dt);return;
  }
  if(e.type==='shooter'){
   if(e.mode==='aim'){e.timer-=dt;if(e.timer<=0){this.hostileBullet(e,e.aim,285,10);e.mode='idle';e.shot=2.15;}return;}
   if((d>250||lineBlocked(e,this.player,this.obstacles))&&d>50)this.route(e,this.player,dt);
   if(d<125){const a=Math.atan2(e.y-this.player.y,e.x-this.player.x);this.moveEntity(e,Math.cos(a)*60*dt,Math.sin(a)*60*dt,e.r);}
   if(e.shot<=0&&d<490&&!lineBlocked(e,this.player,this.obstacles)){e.mode='aim';e.timer=.7;e.aim=Math.atan2(this.player.y-e.y,this.player.x-e.x);}return;
  }
  if(e.type==='lobber'){if(d>310||lineBlocked(e,this.player,this.obstacles)&&d>380)this.route(e,this.player,dt);if(e.shot<=0&&d<530){e.shot=3.3;this.warnings.push({x:this.player.x+clamp(this.velocity.x*.3,-65,65),y:this.player.y+clamp(this.velocity.y*.3,-65,65),r:65,timer:1.1,max:1.1,damage:17,color:palette.gold});this.burst(e.x,e.y,palette.gold,8,50);}return;}
  if(e.mode==='telegraph'){e.timer-=dt;if(e.timer<=0){e.x=e.tx;e.y=e.ty;e.mode='strike';e.timer=.35;this.burst(e.x,e.y,palette.purple,12,85);}return;}
  if(e.mode==='strike'){e.timer-=dt;if(e.timer<=0){if(d<62)this.hurt(15,'contact','瞬移怪突袭');e.mode='idle';e.shot=4.7;this.burst(e.x,e.y,palette.purple,15,100);}return;}
  if(d>80)this.route(e,this.player,dt);if(e.shot<=0&&d>105&&d<620){const p=this.freePosition({x:this.player.x+clamp(this.velocity.x*.95,-180,180),y:this.player.y+clamp(this.velocity.y*.95,-180,180)},e.r);e.tx=p.x;e.ty=p.y;e.mode='telegraph';e.timer=.75;}
 }
 private updateBoss(e:Enemy,dt:number){
  if(!this.bossSite)return;if(distance(this.player,this.bossSite)>570){this.enemies=this.enemies.filter(q=>q.id!==e.id);this.bossActive=false;this.bullets=this.bullets.filter(b=>!b.hostile);this.warnings=[];this.notify('已退出守卫据点，守卫恢复；可再次挑战',palette.gold);return;}
  const d=distance(e,this.player);if(d<e.r+15)this.hurt(18,'contact','核心守卫撞击');e.timer-=dt;
  if(e.mode==='windup-fan'&&e.timer<=0){const count=e.hp<e.max*.5?9:7;for(let i=0;i<count;i++)this.hostileBullet(e,e.aim+(i-(count-1)/2)*.22,185,13,6);e.mode='recover';e.timer=1.3;return;}
  if(e.mode==='windup-charge'&&e.timer<=0){e.mode='charge';e.timer=.65;return;}
  if(e.mode==='charge'){this.moveEntity(e,Math.cos(e.aim)*500*dt,Math.sin(e.aim)*500*dt,e.r);if(distance(e,this.bossSite)>330||e.timer<=0){e.mode='recover';e.timer=1.8;}return;}
  if(e.mode==='windup-bomb'&&e.timer<=0){for(const p of[{x:this.player.x,y:this.player.y},{x:this.player.x+115,y:this.player.y-60},{x:this.player.x-100,y:this.player.y+65}])this.warnings.push({...p,r:68,timer:1.45,max:1.45,damage:23,color:palette.red});e.mode='recover';e.timer=1.9;return;}
  if(e.mode.startsWith('windup'))return;if(e.mode==='recover'){if(e.timer<=0){e.mode='idle';e.timer=.45;}return;}
  if(d>200&&distance(e,this.bossSite)<260)this.route(e,this.player,dt);
  if(e.timer<=0){const index=e.pattern++%3;e.aim=Math.atan2(this.player.y-e.y,this.player.x-e.x);e.mode=index===0?'windup-fan':index===1?'windup-charge':'windup-bomb';e.timer=index===0?.85:index===1?1.05:.65;}
 }
 private hostileBullet(e:Enemy,a:number,v:number,damage:number,r=5){this.bullets.push({x:e.x+Math.cos(a)*(e.r+8),y:e.y+Math.sin(a)*(e.r+8),vx:Math.cos(a)*v,vy:Math.sin(a)*v,damage,life:5,hostile:true,r,color:palette.red,hits:1,hitIds:new Set()});}
 private updatePickups(dt:number){
  for(const p of this.pickups){p.phase+=dt;p.life-=dt;let d=distance(p,this.player);const supply=!['xp','fragment','core'].includes(p.type);
   if(d<(supply?38:70*this.magnet)){const v=Math.max(260,550-d);p.x+=(this.player.x-p.x)/Math.max(1,d)*v*dt;p.y+=(this.player.y-p.y)/Math.max(1,d)*v*dt;d=distance(p,this.player);}
   if(p.type==='heal'&&this.player.hp>=this.player.maxHp||p.type==='shield'&&this.player.shield>=100)continue;
   if(d>=22)continue;this.audio.play('pickup');
   if(p.type==='xp'&&this.level<12){this.xp+=p.amount;this.checkLevel();}if(p.type==='fragment')this.fragments=Math.min(99,this.fragments+p.amount);
   if(p.type==='core'){this.bag.cores+=p.amount;this.notify('异常核心已拾取 · 成功撤离后可永久解锁模块',palette.purple);}
   if(p.type==='heal'){this.player.hp=Math.min(this.player.maxHp,this.player.hp+30);this.float(this.player.x,this.player.y-35,'生命 +30',palette.green);}
   if(p.type==='shield'){this.player.shield=Math.min(100,this.player.shield+28);this.float(this.player.x,this.player.y-35,'护盾 +28',palette.blue);}
   if(p.type==='overcharge'){this.supplyTimers.overcharge=8;this.float(this.player.x,this.player.y-35,'超载：攻速 +40% · 8秒',palette.gold);}
   if(p.type==='speed'){this.supplyTimers.speed=8;this.player.dashCooldown=Math.max(0,this.player.dashCooldown-1);this.float(this.player.x,this.player.y-35,'推进：移速 +25% · 8秒',palette.cyan);}
   if(p.id)this.consumedSupplies.add(p.id);p.amount=0;this.burst(this.player.x,this.player.y,supply?palette.cyan:palette.green,5,50);
  }
  const retained=this.pickups.filter(p=>p.amount>0&&p.life>0);
  this.pickups=[...retained.filter(p=>p.type==='core'),...retained.filter(p=>p.type!=='core'&&distance(p,this.player)<1700).slice(-239)];
 }
 private updateEvents(){
  for(const site of this.sites){if(site.kind!=='resource')continue;const state=this.eventStates.get(site.id);if(state?.status!=='active')continue;
   if(state.guards.some(id=>this.enemies.some(e=>e.id===id&&e.hp>0)))continue;
   state.status='done';this.events++;const alloy=site.rare?38:28,chips=site.rare?3:2;this.bag.alloy+=alloy;this.bag.chips+=chips;this.fragments=Math.min(99,this.fragments+(this.events===1?10:5));
   if(this.events===1&&this.level===1){this.xp=Math.max(this.xp,this.xpNeeded);this.checkLevel();}
   this.notify('资源仓完成：+'+alloy+' 合金 / +'+chips+' 芯片 / +'+(this.events===1?10:5)+' 碎片',palette.gold);this.burst(site.x,site.y,palette.gold,30,140);
   const kinds:PickupKind[]=['heal','shield','overcharge','speed'];this.pickups.push({x:site.x+32,y:site.y+22,type:kinds[Math.floor(Math.random()*4)],amount:1,phase:0,life:90});
   if(this.events>=2&&!this.bossSite){const cx=chunkCoord(this.player.x)+1,cy=chunkCoord(this.player.y)-1;this.bossSite={id:'boss',kind:'resource',x:cx*CHUNK_SIZE,y:cy*CHUNK_SIZE,title:'核心守卫据点',rare:true};this.refreshChunks(true);this.notify('两个资源事件已完成：核心守卫据点已标记，可主动挑战或先撤离',palette.purple);}
  }
 }
 private checkLevel(){
  if(this.upgrading||this.contracting||this.level>=12||this.xp<this.xpNeeded||!this.running)return;
  this.xp-=this.xpNeeded;this.level++;this.xpNeeded=Math.round(6+this.level*2.4);this.upgrading=true;this.blur();const pool=[...UPGRADES];
  const synergies:Record<string,UpgradeChoice>={
   pierce:{id:'module-pierce',name:'穿甲校准',description:'穿甲模块协同：武器伤害 +30%',kind:'模块协同'},
   fortress:{id:'module-fortress',name:'堡垒充能',description:'防御模块协同：立即补充 45 护盾',kind:'模块协同'},
   shockwave:{id:'module-shockwave',name:'震荡推进',description:'冲刺模块协同：移速 +12%，重置冲刺',kind:'模块协同'},
   rescue:{id:'module-rescue',name:'应急修复',description:'应急模块协同：恢复 55 生命',kind:'模块协同'},
   insulation:{id:'module-insulation',name:'隔热补给',description:'隔热模块协同：立即补充 38 护盾',kind:'模块协同'},
   magnet:{id:'module-magnet',name:'回收增幅',description:'回收模块协同：拾取半径 +40%',kind:'模块协同'}
  };
  for(const id of this.options.modules||[])if(synergies[id])pool.push(synergies[id]);
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  this.currentChoices=pool.slice(0,3);this.emitHud();this.options.onUpgrade(this.currentChoices);
 }
 private shoot(){
  const priority=(e:Enemy)=>distance(e,this.player)*(e.type==='boss'?.65:1);
  const target=this.enemies.filter(e=>e.hp>0&&e.mode!=='telegraph'&&e.mode!=='emerge'&&distance(e,this.player)<400&&!lineBlocked(this.player,e,this.obstacles,2)).sort((a,b)=>priority(a)-priority(b))[0];
  if(!target){this.shotTimer=.09;return;}const a=Math.atan2(target.y-this.player.y,target.x-this.player.x);this.player.angle=a;this.muzzleTime=.075;this.audio.play(this.options.weapon);
  const weapon=this.options.weapon,spread=weapon==='scatter'?[-.24,-.12,0,.12,.24]:[0],power=this.damage*(this.comboTime>0?1.15:1);
  for(const offset of spread){const angle=a+offset;this.bullets.push({x:this.player.x+Math.cos(angle)*22,y:this.player.y+Math.sin(angle)*22,vx:Math.cos(angle)*690,vy:Math.sin(angle)*690,damage:(weapon==='scatter'?10:weapon==='drone'?13:20)*power,life:weapon==='scatter'?.55:.88,hostile:false,r:weapon==='scatter'?3:4,color:weapon==='scatter'?palette.gold:palette.cyan,hits:this.hasModule('pierce')?2:1,hitIds:new Set()});}
  this.shotTimer=(weapon==='scatter'?.62:weapon==='drone'?.49:.37)/(this.attackSpeed*(this.supplyTimers.overcharge>0?1.4:1));this.burst(this.player.x+Math.cos(a)*25,this.player.y+Math.sin(a)*25,palette.cyan,3,55);
 }
 private updateDrones(dt:number){
  if(this.options.weapon!=='drone'&&this.options.character!=='engineer')return;this.droneTimer-=dt;if(this.droneTimer>0)return;this.droneTimer=.24/this.attackSpeed;
  const count=(this.options.weapon==='drone'?3:0)+(this.options.character==='engineer'?1:0);
  for(let j=0;j<count;j++){const a=this.elapsed*2.1+j/count*TAU,pos={x:this.player.x+Math.cos(a)*78,y:this.player.y+Math.sin(a)*78};if(lineBlocked(this.player,pos,this.obstacles))continue;for(const e of this.enemies)if(e.hp>0&&distance(e,pos)<e.r+22&&!lineBlocked(pos,e,this.obstacles))this.hitEnemy(e,14*this.damage);}
 }
 private spawnEnemy(type:EnemyKind,pos?:V,guard?:string,noLoot=false){
  if(this.enemies.length>=42)return null;const a=Math.random()*TAU,range=480+Math.random()*100,at=this.freePosition(pos||{x:this.player.x+Math.cos(a)*range,y:this.player.y+Math.sin(a)*range},type==='boss'?46:type==='lobber'?21:18);
  const values=type==='boss'?{hp:1050,r:46,speed:30}:type==='lobber'?{hp:78,r:21,speed:90}:type==='teleporter'?{hp:52,r:17,speed:125}:type==='shooter'?{hp:50,r:17,speed:100}:{hp:54,r:18,speed:140};
  const scale=type==='boss'?1:1+this.danger()*.1,e:Enemy={id:this.nextId++,x:at.x,y:at.y,type,hp:values.hp*scale,max:values.hp*scale,r:values.r,speed:values.speed,hit:0,shot:1.8+Math.random(),phase:Math.random()*TAU,mode:type==='boss'?'idle':'emerge',timer:type==='boss'?1.3:.55,aim:0,tx:0,ty:0,pattern:0,guard,pathTime:0,noLoot};this.enemies.push(e);return e;
 }
 private spawnBoss(){
  if(!this.bossSite||this.bossKilled||this.bossActive)return;
  this.enemies=this.enemies.filter(e=>e.guard||distance(e,this.bossSite!)>650);this.bullets=this.bullets.filter(b=>!b.hostile);this.warnings=[];
  const boss=this.spawnEnemy('boss',{x:this.bossSite.x,y:this.bossSite.y-120});
  if(!boss){this.notify('请先清理附近守卫，再启动核心据点',palette.gold);return;}
  this.bossActive=true;this.pending=[];this.notify('核心守卫已激活：观察预警与后摇，离开据点可中止挑战',palette.purple);this.emitHud();
 }
 private hitEnemy(e:Enemy,amount:number){
  if(e.hp<=0||e.mode==='telegraph'||e.mode==='emerge')return;const wasHit=e.hit>0;e.hp-=amount;e.hit=.12;this.audio.play('hit');
  if(e.type!=='boss'&&!wasHit){const d=Math.max(1,distance(e,this.player));this.moveEntity(e,(e.x-this.player.x)/d*7,(e.y-this.player.y)/d*7,e.r);}
  if(this.damageTextTimer<=0){this.damageTextTimer=.09;this.float(e.x,e.y-e.r-8,Math.round(amount).toString(),e.type==='boss'?palette.purple:'#f5e5ca',.55,14);}
  this.burst(e.x,e.y,e.type==='boss'?palette.purple:palette.gold,5,85);if(e.hp>0)return;
  this.audio.play('kill');this.shake=Math.max(this.shake,e.type==='boss'?5:.55);this.deaths.push({x:e.x,y:e.y,kind:e.type,r:e.r,life:.18,max:.18,angle:Math.atan2(e.y-this.player.y,e.x-this.player.x)});
  this.kills++;this.combo=this.elapsed-this.lastKill<=4?this.combo+1:1;this.lastKill=this.elapsed;this.maxCombo=Math.max(this.maxCombo,this.combo);
  if(this.combo%10===0){this.audio.play('upgrade');this.comboTime=8;this.float(this.player.x,this.player.y-65,'无伤连杀：战斗亢奋 · 8 秒',palette.cyan,2.5,16);}
  this.burst(e.x,e.y,e.type==='boss'?palette.purple:palette.red,e.type==='boss'?70:12,e.type==='boss'?220:100);
  if(!e.noLoot){this.pickups.push({x:e.x,y:e.y,type:'xp',amount:e.type==='boss'?12:e.type==='normal'?1:2,phase:0,life:100});
   this.pickups.push({x:e.x+13,y:e.y+6,type:'fragment',amount:e.guard?2:1,phase:1,life:90});
   if(Math.random()<.16){const kinds:PickupKind[]=['heal','shield','overcharge','speed'];this.pickups.push({x:e.x-12,y:e.y+9,type:kinds[Math.floor(Math.random()*4)],amount:1,phase:0,life:45});}}
  if(e.type==='boss'){this.bossKilled=true;this.bossActive=false;this.bag.alloy+=35;this.bag.chips+=3;this.pickups.push({x:e.x,y:e.y,type:'core',amount:1,phase:0,life:Infinity});
   this.bossExtraction={id:'boss:extract',kind:'extract',x:this.bossSite!.x+125,y:this.bossSite!.y+130,title:'守卫接应站',rare:false};this.sites.push(this.bossExtraction);
   this.notify('核心守卫已击败：拾取核心，附近接应站已开放',palette.purple);this.shake=5;this.warnings=[];this.bullets=this.bullets.filter(b=>!b.hostile);}
 }
 private hurt(amount:number,kind:'contact'|'bullet'|'explosion'='contact',source?:string){
  if(this.player.invulnerable>0||!this.running)return;
  if(kind==='explosion'&&this.hasModule('insulation'))amount*=1-(.3+this.moduleLevel('insulation')*.1);
  if(kind==='bullet'&&this.hasModule('fortress'))amount*=1-(.25+this.moduleLevel('fortress')*.05);
  this.lastDamageSource=source||(kind==='explosion'?'范围爆炸':kind==='bullet'?'敌方弹丸':'近身碰撞');this.audio.play('hurt');amount=Math.max(1,Math.round(amount*this.damageTaken));const shieldDamage=Math.min(this.player.shield,amount);this.player.shield-=shieldDamage;this.player.hp-=amount-shieldDamage;
  this.player.invulnerable=.65;this.combo=0;this.comboTime=0;this.lastKill=-100;this.shake=3;this.float(this.player.x+15,this.player.y-28,'−'+amount,palette.red,.7,15);this.burst(this.player.x,this.player.y,shieldDamage?palette.blue:palette.red,10,95);
  if(this.player.hp<=0&&this.hasModule('rescue')&&!this.rescueUsed){this.rescueUsed=true;this.player.hp=Math.ceil(this.player.maxHp*(.3+this.moduleLevel('rescue')*.1));this.player.invulnerable=2.5;this.notify('应急协议触发：本局唯一一次濒死保护',palette.gold);}
 }
 private nearestInteraction():InteractSite|null{
  const candidates:InteractSite[]=this.sites.filter(s=>s.kind!=='resource'||!this.bossActive&&(this.eventStates.get(s.id)?.status||'idle')==='idle');
  if(this.bossSite&&!this.bossKilled&&!this.bossActive)candidates.push({...this.bossSite,kind:'boss'});
  return candidates.filter(s=>distance(s,this.player)<(s.kind==='extract'?82:s.kind==='boss'?160:76)).sort((a,b)=>distance(a,this.player)-distance(b,this.player))[0]||null;
 }
 private targetInfo():{point:V;name:string;color:string}|null{
  if(this.activeExtraction)return{point:this.activeExtraction,name:'守住接应区',color:palette.cyan};
  if(this.objective==='extract'||this.bag.cores>0&&this.objective==='resource'&&!this.objectiveManual){const e=this.nearestExtraction();return{point:e,name:e.title,color:palette.cyan};}
  if((this.objective==='boss'&&this.bossSite&&!this.bossKilled)||(this.bossActive&&this.bossSite))return{point:this.bossSite!,name:this.bossActive?'核心守卫战斗':'可选：核心守卫',color:palette.purple};
  if(this.objective==='terminal'){const terminal=this.sites.filter(s=>s.kind==='terminal'&&!this.usedTerminals.has(s.id)).sort((a,b)=>distance(a,this.player)-distance(b,this.player))[0];if(terminal)return{point:terminal,name:this.fragments>=10?'签订异常契约':'契约终端 · 需10碎片',color:palette.purple};}
  const s=this.sites.filter(s=>s.kind==='resource'&&(this.eventStates.get(s.id)?.status||'idle')!=='done').sort((a,b)=>distance(a,this.player)-distance(b,this.player))[0];
  return s?{point:s,name:s.title,color:palette.gold}:null;
 }
 private tutorialStep(){return this.activeExtraction?'守住接应圈，圈内可以移动':this.bossActive?'看预警躲招，后摇时输出':this.events===0?([...this.eventStates.values()].some(s=>s.status==='active')?'资源警报已触发：移动躲避，击败带金色标记的守卫':'找到金色资源仓，靠近按 E 启动'):this.events===1&&this.contracts.length===0?(this.fragments>=10?'已有契约碎片：可追踪紫色终端，或继续搜集':'契约还需 '+(10-this.fragments)+' 碎片：继续击败敌人收集'):this.events>=2&&!this.bossKilled?'选择：挑战守卫、继续搜集，或带回物资':this.bag.cores>0?'核心已到手：成功撤离后解锁金色模块':'回营地兑换物资，尝试另一套出战配置';}
 private nearestExtraction(){return this.sites.filter(s=>s.kind==='extract').sort((a,b)=>distance(a,this.player)-distance(b,this.player))[0]||{id:'origin:extract',kind:'extract' as const,x:0,y:115,title:'前哨接应站',rare:false};}
 private interactionText(){
  const s=this.nearestInteraction();if(!s)return'';if(s.kind==='boss')return'E 挑战核心守卫 · 可退出据点中止';
  if(s.kind==='extract')return this.activeExtraction?'接应中：圆圈内可自由移动防守':'E 呼叫接应 · 防守 10 秒';
  if(s.kind==='terminal')return this.usedTerminals.has(s.id)?'终端已使用':this.contracts.length>=2?'本局契约已满（2/2）':this.fragments>=10?'E 签订本局契约 · 消耗 10 碎片':'异常终端：还需 '+(10-this.fragments)+' 碎片';
  return'E 开启资源事件 · 清理守卫后获得物资';
 }
 private emitHud(){
  const boss=this.enemies.find(e=>e.type==='boss'&&e.hp>0),near=distance(this.player,this.nearestExtraction())<85,target=this.targetInfo(),angle=target?Math.atan2(target.point.y-this.player.y,target.point.x-this.player.x):0,directions=['东','东南','南','西南','西','西北','北','东北'];
  const supplies:GameHud['supplies']=[];if(this.supplyTimers.overcharge>0)supplies.push({id:'overcharge',name:'超载攻速 +40%',remaining:this.supplyTimers.overcharge});if(this.supplyTimers.speed>0)supplies.push({id:'speed',name:'推进移速 +25%',remaining:this.supplyTimers.speed});if(this.comboTime>0)supplies.push({id:'combo',name:'战斗亢奋',remaining:this.comboTime});
  this.options.onHud({hp:Math.max(0,this.player.hp),maxHp:this.player.maxHp,shield:this.player.shield,time:this.elapsed,xp:this.xp,xpNeeded:this.xpNeeded,level:this.level,kills:this.kills,alloy:this.bag.alloy,chips:this.bag.chips,cores:this.bag.cores,
   extractionOpen:true,extractProgress:this.extractionProgress,bossHp:boss?.hp||0,bossMaxHp:boss?.max||0,status:this.upgrading?'选择战术升级':this.contracting?'选择异常契约':this.activeExtraction?'守住接应区域':this.bag.cores>0?'核心已获得 · 寻找接应站':this.bossActive?'核心守卫挑战中':this.events>=2?'守卫据点已揭示 · 挑战或撤离':'完成两个资源事件，发现核心守卫',dashReady:this.player.dashCooldown<=0,nearExtract:near,
   events:this.events,danger:this.danger(),fragments:this.fragments,contracts:[...this.contracts],combo:this.combo,comboTime:this.comboTime,supplies,interaction:this.interactionText(),target:target?{name:target.name,distance:Math.round(distance(target.point,this.player)/10),direction:directions[(Math.round(angle/(Math.PI/4))+8)%8]}:null,bossRevealed:!!this.bossSite,bossActive:this.bossActive,contractCount:this.contracts.length,bossKilled:this.bossKilled,explored:this.visited.size,modules:[...(this.options.modules||[])],message:this.messageTime>0?this.message:'',rescueAvailable:this.hasModule('rescue')&&!this.rescueUsed,tutorialStep:this.tutorialStep(),damageMultiplier:this.damage*(this.comboTime>0?1.15:1),attackMultiplier:this.attackSpeed*(this.supplyTimers.overcharge>0?1.4:1),moveMultiplier:this.movementMultiplier(),playerSpeed:175*this.movementMultiplier(),pressure:this.enemies.filter(e=>e.hp>0&&distance(e,this.player)<320).length});
 }
 private finish(reason:GameResult['reason']){
  if(!this.running)return;this.running=false;this.blur();this.emitHud();const success=reason==='extracted';this.audio.play(success?'extract':'hurt');
  this.options.onFinish({success,reason,alloy:success?this.bag.alloy:Math.floor(this.bag.alloy*.2),chips:success?this.bag.chips:0,cores:success?this.bag.cores:0,kills:this.kills,time:this.elapsed,level:this.level,bossKilled:this.bossKilled,collected:{...this.bag},events:this.events,contracts:this.contracts.length,maxCombo:this.maxCombo,explored:this.visited.size,lastDamageSource:this.lastDamageSource});
 }
 private updateEffects(dt:number){for(const d of this.deaths){d.life-=dt;d.x+=Math.cos(d.angle)*dt*45;d.y+=Math.sin(d.angle)*dt*45;}this.deaths=this.deaths.filter(d=>d.life>0).slice(-24);for(const p of this.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.pow(.2,dt);p.vy*=Math.pow(.2,dt);p.life-=dt;}this.particles=this.particles.filter(p=>p.life>0).slice(-450);for(const t of this.texts){t.y-=dt*16;t.life-=dt;}this.texts=this.texts.filter(t=>t.life>0).slice(-25);}
 private burst(x:number,y:number,color:string,n=10,speed=100){for(let i=0;i<n;i++){const a=Math.random()*TAU,life=.25+Math.random()*.35;this.particles.push({x,y,vx:Math.cos(a)*speed*Math.random(),vy:Math.sin(a)*speed*Math.random(),life,max:life,size:1.5+Math.random()*3,color});}}
 private float(x:number,y:number,text:string,color:string,life=1.5,size=14){this.texts.push({x,y,text,color,life,max:life,size});}
 private notify(text:string,color:string){this.message=text;this.messageTime=4.2;/* The React announcement is the single long-message surface. */}
 private camera(){return{x:this.player.x-this.width/2,y:this.player.y-this.height/2};}
 private polygon(x:number,y:number,r:number,sides:number,angle=0){const c=this.ctx;c.beginPath();for(let j=0;j<sides;j++){const a=angle+j/sides*TAU;j?c.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r):c.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}c.closePath();}
 private label(text:string,x:number,y:number,color='#718397',size=11){const c=this.ctx;c.font='600 '+size+'px "Segoe UI", "Microsoft YaHei", sans-serif';c.fillStyle=color;c.textAlign='center';c.fillText(text,x,y);}
 private draw(){
  const c=this.ctx;if(!c)return;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle='#0c151d';c.fillRect(0,0,this.width,this.height);const cam=this.camera();
  const shake=this.shakeEnabled?this.shake:0;c.save();c.translate(-cam.x+(Math.random()-.5)*shake,-cam.y+(Math.random()-.5)*shake);this.drawFloor(cam);
  for(const p of this.pending){c.strokeStyle=p.noLoot?palette.red:palette.gold;c.globalAlpha=.35+Math.sin(this.visualTime*9)*.2;c.setLineDash([5,5]);c.beginPath();c.arc(p.x,p.y,23,0,TAU);c.stroke();c.setLineDash([]);c.globalAlpha=1;this.label('增援',p.x,p.y-32,p.noLoot?palette.red:palette.gold,12);}
  for(const d of this.deaths){c.save();c.globalAlpha=d.life/d.max;const scale=.55+d.life/d.max*.45;c.translate(d.x,d.y);c.rotate(d.angle);if(!this.drawSprite(d.kind,0,0,d.r*3.1*scale,0)){this.polygon(0,0,d.r*scale,5);c.fillStyle=palette.red;c.fill();}c.restore();}
  for(const site of this.sites)this.drawSite(site);if(this.bossSite)this.drawBossSite();
  for(const w of this.warnings){c.fillStyle='rgba(250,124,134,'+(.07+.16*(1-w.timer/w.max))+')';c.beginPath();c.arc(w.x,w.y,w.r,0,TAU);c.fill();c.strokeStyle=w.color;c.lineWidth=2;c.setLineDash([7,5]);c.stroke();c.setLineDash([]);c.beginPath();c.arc(w.x,w.y,w.r*(1-w.timer/w.max),0,TAU);c.stroke();this.label('!',w.x,w.y+7,w.color,24);}
  for(const p of this.pickups)this.drawPickup(p);for(const e of this.enemies)if(e.hp>0)this.drawEnemy(e);
  for(const b of this.bullets){c.strokeStyle=b.color;c.lineWidth=3;c.lineCap='round';c.beginPath();c.moveTo(b.x-b.vx*.016,b.y-b.vy*.016);c.lineTo(b.x,b.y);c.stroke();c.fillStyle=b.color;c.beginPath();c.arc(b.x,b.y,b.r,0,TAU);c.fill();}
  this.drawPlayer();for(const p of this.particles){c.globalAlpha=clamp(p.life/p.max,0,1);c.fillStyle=p.color;c.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size);}c.globalAlpha=1;
  for(const t of this.texts){c.globalAlpha=Math.min(1,t.life*2);c.shadowColor='#000';c.shadowBlur=5;this.label(t.text,t.x,t.y,t.color,t.size);}c.shadowBlur=0;c.globalAlpha=1;c.restore();
  this.drawNavigation(cam);this.drawMinimap();if(this.player.hp<this.player.maxHp*.28){c.strokeStyle='rgba(250,90,100,'+(.2+Math.sin(this.visualTime*5)*.1)+')';c.lineWidth=10;c.strokeRect(0,0,this.width,this.height);}
 }
 private drawFloor(cam:V){
  const c=this.ctx;for(const chunk of this.chunks.values()){const x=chunk.cx*CHUNK_SIZE-360,y=chunk.cy*CHUNK_SIZE-360;c.fillStyle=['#121e28','#17212a','#14222a','#1b232b','#16222a','#1d202c'][chunk.variant];c.fillRect(x,y,CHUNK_SIZE,CHUNK_SIZE);
   c.fillStyle='#a0cbc804';c.fillRect(chunk.cx*CHUNK_SIZE-35,y,70,CHUNK_SIZE);c.fillRect(x,chunk.cy*CHUNK_SIZE-35,CHUNK_SIZE,70);
   c.strokeStyle='#49707a19';c.lineWidth=1;c.setLineDash([8,15]);c.strokeRect(x+12,y+12,CHUNK_SIZE-24,CHUNK_SIZE-24);c.setLineDash([]);
   this.label(chunk.title+' / '+chunk.cx+','+chunk.cy,chunk.cx*CHUNK_SIZE,y+45,'#68808b',14);
   const h=worldHash(chunk.cx,chunk.cy,this.seed);for(let i=0;i<9;i++){const px=x+45+((h>>>i*2)%620),py=y+65+((h>>>i)%590);c.fillStyle='#8197a016';c.fillRect(px,py,4+i%4,3);}
  }
  c.strokeStyle='#7a969710';c.lineWidth=1;for(let x=Math.floor(cam.x/80)*80;x<cam.x+this.width+80;x+=80){c.beginPath();c.moveTo(x,cam.y);c.lineTo(x,cam.y+this.height);c.stroke();}for(let y=Math.floor(cam.y/80)*80;y<cam.y+this.height+80;y+=80){c.beginPath();c.moveTo(cam.x,y);c.lineTo(cam.x+this.width,y);c.stroke();}
  for(const o of this.obstacles){c.fillStyle='#03090c77';c.fillRect(o.x+8,o.y+12,o.w,o.h);c.fillStyle=o.kind==='rock'?'#34454e':'#354b58';c.fillRect(o.x,o.y,o.w,o.h);c.fillStyle='#526976';c.fillRect(o.x,o.y,o.w,7);c.strokeStyle='#78939b66';c.lineWidth=1;c.strokeRect(o.x,o.y,o.w,o.h);
   c.strokeStyle='#172b35';c.beginPath();c.moveTo(o.x+12,o.y+13);c.lineTo(o.x+o.w-12,o.y+o.h-13);c.stroke();
   if(this.sprites.get('crate')?.naturalWidth){const size=Math.min(58,o.w-8,o.h-8);this.drawSprite(o.kind==='rock'?'barrel':'crate',o.x+o.w/2,o.y+o.h/2,size,0);}
   if(o.kind==='wall'){c.fillStyle='#d6b27355';for(let x=o.x+10;x<o.x+o.w-10;x+=22)c.fillRect(x,o.y+o.h-6,10,3);}
  }
 }
 private drawSite(site:Site){
  const c=this.ctx;if(site.kind==='extract'){const active=this.activeExtraction?.id===site.id;c.fillStyle=active?'#7bf4e715':'#7bf4e709';this.polygon(site.x,site.y,90,6,Math.PI/6);c.fill();c.strokeStyle=active?palette.cyan:'#4d8d87';c.lineWidth=2;c.setLineDash([9,7]);c.beginPath();c.arc(site.x,site.y,85,0,TAU);c.stroke();c.setLineDash([]);
   c.fillStyle='#284c4b';c.fillRect(site.x-19,site.y-19,38,38);this.label('↑',site.x,site.y+10,palette.cyan,31);this.label(active?'接应 '+Math.max(0,Math.ceil((1-this.extractionProgress)*10))+' 秒':site.title,site.x,site.y+112,palette.cyan,14);
   if(active){c.strokeStyle=palette.cyan;c.lineWidth=6;c.beginPath();c.arc(site.x,site.y,92,-Math.PI/2,-Math.PI/2+this.extractionProgress*TAU);c.stroke();}return;
  }
  if(site.kind==='terminal'){const used=this.usedTerminals.has(site.id),color=used?'#56606e':palette.purple;c.save();c.translate(site.x,site.y);this.polygon(0,0,28,6,Math.PI/6);c.fillStyle='#382e4a';c.fill();c.strokeStyle=color;c.lineWidth=2;c.stroke();c.fillStyle=color;c.fillRect(-9,-12,18,22);c.fillStyle='#252035';c.fillRect(-5,-8,10,8);this.label(used?'已使用':'契约 · 10碎片',0,-43,color,14);c.restore();return;}
  const state=this.eventStates.get(site.id),done=state?.status==='done',active=state?.status==='active',color=done?'#5a727d':active?palette.red:site.rare?palette.blue:palette.gold;
  c.save();c.translate(site.x,site.y);c.fillStyle='#050d1344';c.beginPath();c.ellipse(0,20,42,14,0,0,TAU);c.fill();c.fillStyle=done?'#23313b':'#30424c';c.fillRect(-32,-23,64,44);c.strokeStyle=color;c.lineWidth=2;c.strokeRect(-32,-23,64,44);c.fillStyle=color;c.fillRect(-6,-8,12,13);c.strokeStyle='#10212a';c.beginPath();c.moveTo(-30,-7);c.lineTo(30,-7);c.stroke();
  if(this.sprites.get('chest')?.naturalWidth){c.fillStyle=done?'#17242c':'#23333b';c.fillRect(-33,-24,66,47);c.globalAlpha=done?.45:1;this.drawSprite('chest',0,0,76,0);c.globalAlpha=1;if(done){c.strokeStyle='#94c5a9';c.lineWidth=3;c.beginPath();c.moveTo(-9,0);c.lineTo(-2,7);c.lineTo(12,-8);c.stroke();}}
  if(!done){c.globalAlpha=.2+Math.sin(this.visualTime*3)*.1;c.beginPath();c.arc(0,0,46,0,TAU);c.strokeStyle=color;c.stroke();c.globalAlpha=1;}
  this.label(done?'已搜集':active?'清理守卫':site.title,0,-45,color,14);
  if(active){const n=state!.guards.filter(id=>this.enemies.some(e=>e.id===id&&e.hp>0)).length;this.label('剩余守卫 '+n,0,47,palette.red,13);}c.restore();
 }
 private drawBossSite(){
  if(!this.bossSite||this.bossKilled)return;const c=this.ctx,p=this.bossSite;c.strokeStyle=this.bossActive?'#bf94ff77':'#bf94ff33';c.lineWidth=3;c.setLineDash([15,12]);c.beginPath();c.arc(p.x,p.y,570,0,TAU);c.stroke();c.setLineDash([]);c.fillStyle='#bf94ff06';c.fill();
  if(!this.bossActive){this.polygon(p.x,p.y,58,6,this.visualTime*.1);c.strokeStyle=palette.purple;c.lineWidth=2;c.stroke();this.label('核心守卫据点',p.x,p.y-85,palette.purple,18);this.label('靠近后 E 挑战 · 奖励异常核心',p.x,p.y+90,palette.purple,13);}
 }
 private drawPickup(p:Pickup){
  const c=this.ctx,y=p.y+Math.sin(p.phase*3)*2,colors:Record<PickupKind,string>={xp:palette.green,fragment:palette.purple,core:palette.purple,heal:palette.green,shield:palette.blue,overcharge:palette.gold,speed:palette.cyan},color=colors[p.type];c.fillStyle=color;
  if(p.type==='xp'||p.type==='fragment'){this.polygon(p.x,y,p.type==='xp'?4:5,4,p.type==='xp'?0:Math.PI/4);c.fill();return;}
  if(p.type==='core'){c.shadowColor=color;c.shadowBlur=20;this.polygon(p.x,y,15,6,this.visualTime);c.fill();c.shadowBlur=0;this.label('异常核心',p.x,y-29,color,13);return;}
  c.fillStyle='#142a35';c.fillRect(p.x-12,y-12,24,24);c.strokeStyle=color;c.lineWidth=2;c.strokeRect(p.x-12,y-12,24,24);
  this.label(({heal:'+',shield:'◇',overcharge:'ϟ',speed:'»'} as Record<string,string>)[p.type],p.x,y+6,color,20);
  if(distance(p,this.player)<140)this.label(({heal:'医疗包',shield:'护盾包',overcharge:'超载补给',speed:'推进补给'} as Record<string,string>)[p.type],p.x,y-28,color,13);
 }
 private drawSprite(key:string,x:number,y:number,size:number,angle:number,flash=false){
  const image=this.sprites.get(key);if(!image||!image.complete||!image.naturalWidth)return false;const c=this.ctx,w=image.naturalWidth,h=image.naturalHeight,ratio=size/Math.max(w,h);c.save();c.translate(x,y);c.rotate(angle+SPRITE_ANGLE);if(flash)c.filter='brightness(0) invert(1)';c.drawImage(image,-w*ratio/2,-h*ratio/2,w*ratio,h*ratio);c.restore();return true;
 }
 private drawEnemy(e:Enemy){
  const c=this.ctx,boss=e.type==='boss',spriteReady=!!this.sprites.get(e.type)?.naturalWidth,color=boss||e.type==='teleporter'?palette.purple:e.type==='lobber'?palette.gold:e.type==='shooter'?palette.blue:palette.red;
  if(e.mode==='aim'||e.mode==='windup-charge'||e.mode==='windup-fan'||e.mode==='windup-rush'){c.strokeStyle=e.mode==='windup-charge'?'#fa7c8688':'#fa7c8644';c.lineWidth=e.mode==='windup-charge'?e.r*1.5:2;c.setLineDash([9,8]);
   for(const a of(e.mode==='windup-fan'?[-.66,0,.66]:[0])){c.beginPath();c.moveTo(e.x,e.y);c.lineTo(e.x+Math.cos(e.aim+a)*(boss?420:570),e.y+Math.sin(e.aim+a)*(boss?420:570));c.stroke();}c.setLineDash([]);}
  if(e.mode==='telegraph'){c.strokeStyle=palette.purple;c.lineWidth=2;c.setLineDash([5,5]);c.beginPath();c.arc(e.tx,e.ty,38,0,TAU);c.stroke();c.setLineDash([]);this.label('瞬移',e.tx,e.ty-45,palette.purple,11);}
  c.save();c.translate(e.x,e.y);c.fillStyle='#0005';c.beginPath();c.ellipse(0,e.r*.65,e.r*1.1,e.r*.55,0,0,TAU);c.fill();c.rotate(Math.atan2(this.player.y-e.y,this.player.x-e.x));
  if(!spriteReady){if(boss){for(let i=0;i<6;i++){c.save();c.rotate(i/6*TAU+e.phase*.3);c.fillStyle='#44335f';c.fillRect(36,-9,18,18);c.strokeStyle=palette.purple;c.strokeRect(36,-9,18,18);c.restore();}this.polygon(0,0,45,6,Math.PI/6);c.fillStyle=e.hit?'#fff':'#3c2e55';c.fill();c.strokeStyle=color;c.lineWidth=3;c.stroke();this.polygon(0,0,21,6,-e.phase);c.fillStyle=color;c.fill();}
  else{this.polygon(0,0,e.r,e.type==='teleporter'?3:e.type==='shooter'?4:e.type==='lobber'?6:5,e.type==='shooter'?Math.PI/4:0);c.fillStyle=e.hit?'#fff':e.type==='lobber'?'#625337':e.type==='shooter'?'#334c65':e.type==='teleporter'?'#614772':'#663f50';c.fill();c.strokeStyle=color;c.lineWidth=2;c.stroke();c.fillStyle=color;c.fillRect(2,-4,e.r*.6,8);}}
  c.restore();if(spriteReady){c.save();c.strokeStyle=e.hit?'#fff':color;c.globalAlpha=.6;c.lineWidth=e.hit?3:1.4;c.beginPath();c.arc(e.x,e.y,e.r+4,0,TAU);c.stroke();c.globalAlpha=e.mode==='emerge'?.45:1;const bob=e.mode==='idle'?Math.sin(e.phase*12)*1.5:0;this.drawSprite(e.type,e.x,e.y+bob,boss?118:58,Math.atan2(this.player.y-e.y,this.player.x-e.x),e.hit>0);c.restore();}
  if(e.mode==='emerge'){c.strokeStyle=color;c.setLineDash([4,4]);c.beginPath();c.arc(e.x,e.y,e.r+12,0,TAU);c.stroke();c.setLineDash([]);}
  if(e.mode==='strike'){c.strokeStyle=palette.purple;c.lineWidth=2;c.beginPath();c.arc(e.x,e.y,55,0,TAU);c.stroke();}
  if(e.guard){c.strokeStyle=palette.gold;c.lineWidth=1;this.polygon(e.x,e.y-e.r-23,5,3,Math.PI/2);c.stroke();}
  if(e.hp<e.max||boss){const w=boss?92:32;c.fillStyle='#16242e';c.fillRect(e.x-w/2,e.y-e.r-12,w,4);c.fillStyle=color;c.fillRect(e.x-w/2,e.y-e.r-12,w*Math.max(0,e.hp/e.max),4);}
  if(boss)this.label(e.mode==='recover'?'守卫后摇 · 输出机会':e.mode==='windup-charge'?'冲撞蓄力':e.mode==='windup-bomb'?'地面轰炸':e.mode==='windup-fan'?'扇形弹幕':'核心守卫',e.x,e.y-78,palette.purple,13);
 }
 private drawPlayer(){
  const c=this.ctx,p=this.player,engineer=this.options.character==='engineer',spriteReady=!!this.sprites.get(engineer?'engineer':'player')?.naturalWidth;c.save();c.translate(p.x,p.y);c.fillStyle='#0006';c.beginPath();c.ellipse(0,15,20,10,0,0,TAU);c.fill();
  if(p.shield>0){c.strokeStyle='#7ca8ff88';c.lineWidth=2;c.beginPath();c.arc(0,0,28,this.visualTime,this.visualTime+TAU);c.stroke();}
  if(this.comboTime>0){c.strokeStyle='#7bf4e7aa';c.lineWidth=2;c.beginPath();c.arc(0,0,35,0,TAU);c.stroke();}
  if(p.invulnerable>0)c.globalAlpha=.65+Math.sin(this.visualTime*40)*.25;c.rotate(p.angle);if(!spriteReady){c.fillStyle=engineer?'#b897f6':'#a9e8df';c.strokeStyle=engineer?'#dfc9ff':'#cafff6';c.lineWidth=2;this.polygon(0,0,18,6,Math.PI/6);c.fill();c.stroke();c.fillStyle='#183440';c.fillRect(-6,-10,12,20);c.fillStyle='#effffd';c.fillRect(2,-8,7,16);c.fillStyle='#526c80';c.fillRect(9,0,22,7);c.fillStyle=palette.cyan;c.fillRect(26,1,6,5);}c.restore();
  if(spriteReady){c.save();c.globalAlpha=p.invulnerable>0?.65:1;this.drawSprite(engineer?'engineer':'player',p.x,p.y+Math.sin(this.elapsed*14)*(Math.hypot(this.velocity.x,this.velocity.y)>5?1.8:0),60,p.angle);c.restore();}
  if(this.muzzleTime>0){const x=p.x+Math.cos(p.angle)*31,y=p.y+Math.sin(p.angle)*31;c.fillStyle='#fff4cd';this.polygon(x,y,7+this.muzzleTime*40,4,p.angle);c.fill();}
  if(this.options.weapon==='drone'||engineer){const count=(this.options.weapon==='drone'?3:0)+(engineer?1:0);c.strokeStyle='#7ca8ff20';c.setLineDash([4,10]);c.beginPath();c.arc(p.x,p.y,78,0,TAU);c.stroke();c.setLineDash([]);for(let j=0;j<count;j++){const a=this.elapsed*2.1+j/count*TAU,x=p.x+Math.cos(a)*78,y=p.y+Math.sin(a)*78;c.fillStyle=palette.blue;this.polygon(x,y,9,4,a);c.fill();c.fillStyle='#f4ffff';c.fillRect(x-2,y-2,4,4);}}
  c.fillStyle='#162d36';c.fillRect(p.x-20,p.y+29,40,3);c.fillStyle=palette.cyan;c.fillRect(p.x-20,p.y+29,40*Math.max(0,p.hp/p.maxHp),3);
 }
 private drawNavigation(cam:V){
  const c=this.ctx,target=this.targetInfo(),extract=this.nearestExtraction(),markers:{point:V;name:string;color:string}[]=[{point:extract,name:'撤离',color:palette.cyan}];
  if(target&&distance(target.point,extract)>10)markers.push(target);
  const terminal=this.sites.filter(s=>s.kind==='terminal'&&!this.usedTerminals.has(s.id)).sort((a,b)=>distance(a,this.player)-distance(b,this.player))[0];
  if(terminal&&this.fragments>=10&&this.contracts.length<2)markers.push({point:terminal,name:'契约',color:palette.purple});
  for(const marker of markers){const sx=marker.point.x-cam.x,sy=marker.point.y-cam.y;if(sx>70&&sx<this.width-70&&sy>200&&sy<this.height-150)continue;
   const a=Math.atan2(marker.point.y-this.player.y,marker.point.x-this.player.x),rx=Math.max(70,this.width/2-70),ry=Math.max(60,this.height/2-155),scale=Math.min(rx/Math.max(.001,Math.abs(Math.cos(a))),ry/Math.max(.001,Math.abs(Math.sin(a)))),x=this.width/2+Math.cos(a)*scale,y=this.height/2+Math.sin(a)*scale;
   c.save();c.translate(x,y);c.rotate(a);this.polygon(0,0,9,3);c.fillStyle=marker.color;c.fill();c.restore();this.label(marker.name+' '+Math.round(distance(marker.point,this.player)/10)+'m',x,y+25,marker.color,13);}
 }
 private drawMinimap(){
  if(this.width<600)return;const c=this.ctx,w=158,h=126,x=this.width-w-22,y=this.height-h-75,scale=.105;
  c.fillStyle='#07101ae8';c.fillRect(x,y,w,h);c.strokeStyle='#506b7766';c.lineWidth=1;c.strokeRect(x,y,w,h);this.label('区域雷达 · ∞',x+w/2,y+16,'#8faab4',10);
  c.save();c.beginPath();c.rect(x+5,y+24,w-10,h-29);c.clip();const px=(p:V)=>({x:x+w/2+(p.x-this.player.x)*scale,y:y+74+(p.y-this.player.y)*scale});
  for(const o of this.obstacles){const p=px(o);c.fillStyle='#536a7566';c.fillRect(p.x,p.y,o.w*scale,o.h*scale);}
  for(const site of this.sites){const p=px(site);c.fillStyle=site.kind==='extract'?palette.cyan:site.kind==='terminal'?palette.purple:(this.eventStates.get(site.id)?.status==='done'?'#455963':palette.gold);c.fillRect(p.x-2.5,p.y-2.5,5,5);}
  if(this.bossSite&&!this.bossKilled){const p=px(this.bossSite);c.strokeStyle=palette.purple;c.beginPath();c.arc(p.x,p.y,6,0,TAU);c.stroke();}
  c.fillStyle='#fff';c.beginPath();c.arc(x+w/2,y+74,3,0,TAU);c.fill();c.restore();
 }
}
