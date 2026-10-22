/* Deterministic checks of the actual TypeScript model/engine. This is not browser QA. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
let count = 0;
function test(name, fn) { fn(); count++; process.stdout.write(`PASS ${name}\n`); }
function plain(v) { return JSON.parse(JSON.stringify(v)); }
function seeded(seed = 42) { let n = seed >>> 0; return () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; }; }
function runtime(saved = null, seed = 42) {
  const cache = new Map();
  const math = Object.create(Math); math.random = seeded(seed);
  const localStorage = { getItem: () => saved, setItem() {} };
  function load(file) {
    const filename = path.resolve(root, 'src', file.endsWith('.ts') ? file : `${file}.ts`);
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} }; cache.set(filename, module);
    const sandbox = { module, exports: module.exports, Math: math, performance: { now: () => 0 }, localStorage,
      ResizeObserver: class { observe() {} disconnect() {} }, requestAnimationFrame: () => 1, cancelAnimationFrame() {},
      window: { devicePixelRatio: 1, addEventListener() {}, removeEventListener() {} },
      document: { hidden: false }, console,
      require: (id) => id.startsWith('.') ? load(path.relative(path.join(root, 'src'), path.resolve(path.dirname(filename), id))) : require(id),
    };
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 } }).outputText;
    vm.runInNewContext(source, sandbox, { filename }); return module.exports;
  }
  return { model: load('model'), load, math };
}
function canvas() {
  const gradient = { addColorStop() {} };
  const ctx = new Proxy({}, { get: (_, key) => key === 'measureText' ? () => ({ width: 60 }) : key === 'createRadialGradient' || key === 'createLinearGradient' ? () => gradient : () => {}, set: () => true });
  return { width: 960, height: 640, getContext: () => ctx, getBoundingClientRect: () => ({ width: 960, height: 640 }), addEventListener() {}, removeEventListener() {} };
}
const r = runtime(), m = r.model;
function rich() { return { ...m.initialProfile(), alloy: 1000, chips: 100, cores: 20 }; }
test('fresh save has four slots, two free modules, and no free currency', () => {
  const p = m.initialProfile(); assert.equal(m.moduleCapacity(p), 4); assert.equal(m.moduleUsage(p.equippedModules), 2);
  assert.deepEqual(plain(p.modules), ['magnet', 'insulation']); assert.equal(p.alloy + p.chips + p.cores, 0);
});
test('unlock spends exactly the advertised price once and preserves caller state', () => {
  const p = rich(), before = plain(p), item = m.MODULES.find(x => x.id === 'fortress'), next = m.unlockModule(p, item.id);
  assert(next); for (const k of ['alloy', 'chips', 'cores']) assert.equal(next[k], p[k] - item.cost[k]);
  assert.deepEqual(plain(p), before); assert.equal(m.unlockModule(next, item.id), null); assert.equal(m.unlockModule(m.initialProfile(), item.id), null);
});
test('equipment enforces owned modules, uniqueness and total capacity', () => {
  let p = rich(); assert.equal(m.toggleModule(p, 'rescue'), null);
  p = m.unlockModule(p, 'pierce'); p = m.unlockModule(p, 'fortress');
  assert.equal(m.toggleModule(p, 'pierce'), null);
  p = m.toggleModule(p, 'insulation'); p = m.toggleModule(p, 'pierce'); assert.equal(m.moduleUsage(p.equippedModules), 4);
  assert.equal(m.toggleModule(p, 'fortress'), null);
  p = m.toggleModule(p, 'pierce'); assert.equal(p.equippedModules.includes('pierce'), false);
});
test('capacity expands to six with payment and cannot be expanded further', () => {
  let p = rich(); for (const capacity of [5, 6]) { const cost = m.backpackCost(p), prev = p; p = m.expandBackpack(p); assert(p); assert.equal(m.moduleCapacity(p), capacity); for (const k of ['alloy', 'chips', 'cores']) assert.equal(p[k], prev[k] - cost[k]); }
  assert.equal(m.expandBackpack(p), null); assert.equal(m.expandBackpack(m.initialProfile()), null);
});
test('module upgrades cost materials, stop at level two, keep slot cost fixed', () => {
  let p = rich(); const slots = m.moduleUsage(['magnet']);
  for (const lv of [1, 2]) { const cost = m.moduleUpgradeCost(p, 'magnet'), prev = p; p = m.upgradeModule(p, 'magnet'); assert.equal(p.moduleLevels.magnet, lv); for (const k of ['alloy', 'chips', 'cores']) assert.equal(p[k], prev[k] - cost[k]); }
  assert.equal(m.upgradeModule(p, 'magnet'), null); assert.equal(m.moduleUsage(['magnet']), slots); assert.equal(m.upgradeModule(p, 'rescue'), null);
});
test('legacy save keeps earned currency, unlocks and statistics during migration', () => {
  const legacy = { alloy: 54, chips: 2, cores: 1, weapons: ['pulse', 'scatter'], selectedWeapon: 'scatter', stats: { runs: 2, extracts: 1, bossKills: 0, kills: 73 } };
  const p = runtime(JSON.stringify(legacy)).model.loadProfile();
  assert.equal(p.alloy, 54); assert.equal(p.chips, 2); assert.equal(p.selectedWeapon, 'scatter'); assert.equal(p.stats.kills, 73);
  assert.equal(p.bagLevel, 0); assert.deepEqual(plain(p.equippedModules), ['magnet', 'insulation']);
});
test('save round-trip retains empty or legal selected loadout and module levels', () => {
  let p = rich(); p = m.unlockModule(p, 'fortress'); p = m.toggleModule(p, 'fortress'); p = m.upgradeModule(p, 'fortress');
  const loaded = runtime(JSON.stringify(p)).model.loadProfile(); assert.deepEqual(plain(loaded.equippedModules), plain(p.equippedModules)); assert.equal(loaded.moduleLevels.fortress, 1);
  p.equippedModules = []; assert.deepEqual(plain(runtime(JSON.stringify(p)).model.loadProfile().equippedModules), []);
});
test('invalid saves cannot load duplicated, unknown, unowned or over-capacity equipment', () => {
  const p = runtime(JSON.stringify({ alloy: -2, chips: '99', bagLevel: 99, modules: ['pierce', 'fortress'], equippedModules: ['pierce', 'pierce', 'fortress', 'rescue', 'unknown', 'magnet', 'insulation'], moduleLevels: { pierce: 999, fortress: -7 } })).model.loadProfile();
  assert.equal(p.alloy, 0); assert.equal(p.chips, 0); assert.equal(p.bagLevel, 2); assert.equal(new Set(p.equippedModules).size, p.equippedModules.length);
  assert(m.moduleUsage(p.equippedModules) <= m.moduleCapacity(p)); assert(p.equippedModules.every(id => p.modules.includes(id))); assert.equal(p.moduleLevels.pierce, 2); assert.equal(p.moduleLevels.fortress, 0);
  assert.deepEqual(plain(runtime('{bad json').model.loadProfile()), plain(m.initialProfile()));
});
if (process.argv.includes('--model')) { process.stdout.write(`${count} model checks passed.\n`); process.exit(0); }
// Engine checks are appended once the implementation is integrated.
const world = r.load('world');
test('chunks regenerate deterministically with stable site identifiers, including negative coordinates', () => {
  for (const [x, y] of [[0,0],[-1,0],[23,-37],[10000,10000]]) assert.deepEqual(plain(world.makeChunk(x,y,73)), plain(world.makeChunk(x,y,73)));
  const variants = new Set(); for (let seed=0; seed<60; seed++) variants.add(world.makeChunk(1,1,seed).variant); assert.equal(variants.size,6);
});
test('chunk boundary conversion is symmetric around the origin and supports unbounded travel', () => {
  assert.equal(world.chunkCoord(359),0); assert.equal(world.chunkCoord(360),1); assert.equal(world.chunkCoord(-360),0); assert.equal(world.chunkCoord(-361),-1);
  const far = world.makeChunk(10000,-10000,2); assert.equal(far.cx,10000); assert.equal(far.cy,-10000); assert(far.sites.some(s => Math.abs(s.x)>1000000));
});
test('cover blocks actor circles and bullet segments symmetrically, but not clear lanes', () => {
  const rocks = [{x:100,y:100,w:100,h:100,kind:'rock'}];
  assert.equal(world.circleBlocked({x:90,y:150},15,rocks),true); assert.equal(world.circleBlocked({x:70,y:150},15,rocks),false);
  assert.equal(world.lineBlocked({x:0,y:150},{x:300,y:150},rocks),true);
  assert.equal(world.lineBlocked({x:300,y:150},{x:0,y:150},rocks),true);
  assert.equal(world.lineBlocked({x:0,y:50},{x:300,y:50},rocks),false);
  assert.equal(world.lineBlocked({x:150,y:150},{x:150,y:150},rocks),true);
  assert.equal(world.lineBlocked({x:10,y:10},{x:10,y:10},rocks),false);
});
function reachable(chunk) {
  const ox=chunk.cx*world.CHUNK_SIZE, oy=chunk.cy*world.CHUNK_SIZE, step=20;
  const key=(x,y)=>`${x},${y}`;
  const queue=[[0,0]], seen=new Set([key(0,0)]);
  for(let i=0;i<queue.length;i++) { const [x,y]=queue[i]; for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx=x+dx,ny=y+dy,k=key(nx,ny); if(Math.abs(nx)>17||Math.abs(ny)>17||seen.has(k)||world.circleBlocked({x:ox+nx*step,y:oy+ny*step},18,chunk.obstacles))continue; seen.add(k);queue.push([nx,ny]); } }
  for(const site of chunk.sites) { assert.equal(world.circleBlocked(site,24,chunk.obstacles),false,`site inside cover ${site.id}`); assert(seen.has(key(Math.round((site.x-ox)/step),Math.round((site.y-oy)/step))),`site unreachable ${site.id}`); }
  for(const [x,y] of [[17,0],[-17,0],[0,17],[0,-17]])assert(seen.has(key(x,y)),`chunk exit blocked ${chunk.key}`);
}
test('six terrain templates keep all sites and four exits reachable for player-sized actors', () => {
  for(let seed=0;seed<12;seed++)for(const [x,y] of [[0,0],[1,1],[-1,2],[5,-3]])reachable(world.makeChunk(x,y,seed));
});
if(process.argv.includes('--world')){process.stdout.write(`${count} model/world checks passed.\n`);process.exit(0);}
function actualFinish(profile) {
  const text = fs.readFileSync(path.join(root,'src/App.tsx'),'utf8');
  const ast = ts.createSourceFile('App.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found;
  function walk(node) { if(ts.isFunctionDeclaration(node)&&node.name?.text==='finish')found=node; ts.forEachChild(node,walk); }
  walk(ast); assert(found,'App settlement function missing');
  let result, screen;
  const context={ module:{exports:{}}, finished:{current:false}, setProfile:fn=>{profile=fn(profile);}, setResult:r=>{result=r;}, setScreen:s=>{screen=s;} };
  const code=ts.transpileModule(`${found.getText(ast)}\nmodule.exports=finish;`, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2021}}).outputText;
  vm.runInNewContext(code,context);return {finish:context.module.exports,get profile(){return profile;},get result(){return result;},get screen(){return screen;}};
}
test('actual React settlement credits one result once and preserves permanent modules',()=>{
  let p=rich();p=m.unlockModule(p,'fortress');p=m.toggleModule(p,'fortress');p=m.upgradeModule(p,'fortress');
  const before=plain(p),host=actualFinish(p),result={success:true,reason:'extracted',alloy:30,chips:2,cores:1,kills:17,time:240,level:5,bossKilled:true,collected:{alloy:30,chips:2,cores:1},events:2,contracts:1,maxCombo:10,explored:4};
  host.finish(result);host.finish(result);
  assert.equal(host.profile.alloy,before.alloy+30);assert.equal(host.profile.chips,before.chips+2);assert.equal(host.profile.cores,before.cores+1);
  assert.equal(host.profile.stats.runs,before.stats.runs+1);assert.equal(host.profile.stats.extracts,before.stats.extracts+1);assert.equal(host.profile.stats.bossKills,before.stats.bossKills+1);assert.equal(host.profile.stats.kills,before.stats.kills+17);
  assert.deepEqual(plain(host.profile.equippedModules),before.equippedModules);assert.deepEqual(plain(host.profile.moduleLevels),before.moduleLevels);assert.equal(host.screen,'result');
});
if(process.argv.includes('--model-app')){process.stdout.write(`${count} model/world/App checks passed.\n`);process.exit(0);}
function battle(profile=m.initialProfile(), seed=42) {
  const rt=runtime(null,seed);let hud,choices=[],contracts=[],result;
  const Game=rt.load('game').StarbreakGame;
  const game=new Game(canvas(),{weapon:profile.selectedWeapon,character:profile.selectedCharacter,healthLevel:profile.healthLevel,magnetLevel:profile.magnetLevel,trail:profile.trail,modules:profile.equippedModules,moduleLevels:profile.moduleLevels,onHud:v=>{hud=v;},onUpgrade:v=>{choices=v;},onContract:v=>{contracts=v;},onFinish:v=>{result=v;}});
  game.start();return {game,rt,get hud(){return hud;},get choices(){return choices;},get contracts(){return contracts;},get result(){return result;}};
}
function isolated(b){b.game.spawnTimer=Infinity;b.game.shotTimer=Infinity;b.game.enemies=[];b.game.bullets=[];b.game.pickups=[];return b.game;}
function at(g,p){g.player.x=p.x;g.player.y=p.y;g.refreshChunks(true);}
function advance(g,seconds){for(let n=0;n<Math.ceil(seconds/.02)&&g.running;n++){if(g.upgrading)g.chooseUpgrade(g.currentChoices[0].id);g.update(Math.min(.02,seconds-n*.02));}}
function startResource(g,site){at(g,site);g.interact();const state=g.eventStates.get(site.id);assert.equal(state?.status,'active');assert(state.guards.length>0);return state;}
function clearResource(g,site){const state=startResource(g,site);for(const id of state.guards){const e=g.enemies.find(e=>e.id===id);assert(e);g.hitEnemy(e,9999);}g.updateEvents();assert.equal(state.status,'done');}
function equipped(ids,levels={}){return {...m.initialProfile(),modules:[...new Set(['magnet','insulation',...ids])],equippedModules:ids,moduleLevels:levels};}
test('actual engine starts, emits the expanded HUD and runs beyond the old 180-second cutoff',()=>{
  const b=battle(),g=isolated(b);g.elapsed=179.99;g.update(.02);assert(g.running);assert.equal(b.result,undefined);g.elapsed=3600;g.update(.02);assert(g.running);g.emitHud();assert(b.hud.time>3600);assert.equal(b.hud.extractionOpen,true);assert.equal(b.hud.bossRevealed,false);g.destroy();
});
test('frame pause freezes combat, exploration and effect clocks',()=>{
  const {game:g}=battle();g.supplyTimers.overcharge=8;const t=g.elapsed;g.setPaused(true);g.frame(40);assert.equal(g.elapsed,t);assert.equal(g.supplyTimers.overcharge,8);g.setPaused(false);g.frame(80);assert(g.elapsed>t);assert(g.supplyTimers.overcharge<8);g.destroy();
});
test('completed resource events award once and keep state after chunk unloading',()=>{
  const {game:g}=battle();const site=g.sites.find(s=>s.id==='0,0:resource');clearResource(g,site);assert.equal(g.events,1);assert.equal(g.bag.alloy,28);assert.equal(g.bag.chips,2);
  g.updateEvents();assert.equal(g.bag.alloy,28);at(g,{x:7200,y:-7200});assert(g.chunks.size<=9);at(g,site);assert.equal(g.eventStates.get(site.id).status,'done');g.interact();g.updateEvents();assert.equal(g.events,1);assert.equal(g.bag.alloy,28);g.destroy();
});
test('two events reveal an optional Boss, public interaction starts it, retreat resets it',()=>{
  const {game:g}=battle();const first=g.sites.find(s=>s.id==='0,0:resource');clearResource(g,first);assert.equal(g.bossSite,null);
  const second=g.sites.find(s=>s.id==='1,0:resource');clearResource(g,second);assert(g.bossSite);assert.equal(g.bossActive,false);assert.equal(g.enemies.some(e=>e.type==='boss'),false);
  at(g,g.bossSite);g.interact();assert.equal(g.bossActive,true);let boss=g.enemies.find(e=>e.type==='boss');assert(boss);g.hitEnemy(boss,100);assert(boss.hp<boss.max);
  at(g,{x:g.bossSite.x+700,y:g.bossSite.y});g.updateBoss(boss,.01);assert.equal(g.bossActive,false);assert.equal(g.enemies.some(e=>e.type==='boss'),false);
  at(g,g.bossSite);g.interact();boss=g.enemies.find(e=>e.type==='boss');assert.equal(boss.hp,boss.max);g.destroy();
});
test('Boss victory awards one core and a nearby extraction station, never twice',()=>{
  const b=battle(),g=b.game;g.bossSite={id:'boss',kind:'resource',x:720,y:-720,title:'test',rare:true};at(g,g.bossSite);g.interact();let boss=g.enemies.find(e=>e.type==='boss');assert(boss);g.hitEnemy(boss,99999);
  assert.equal(g.bossKilled,true);assert.equal(g.bossActive,false);assert(g.bossExtraction);assert.equal(g.pickups.filter(p=>p.type==='core').length,1);const amount=g.bag.alloy;
  g.hitEnemy(boss,99999);g.spawnBoss();assert.equal(g.bag.alloy,amount);assert.equal(g.pickups.filter(p=>p.type==='core').length,1);assert.equal(g.enemies.filter(e=>e.type==='boss'&&e.hp>0).length,0);
  const core=g.pickups.find(p=>p.type==='core');at(g,{x:7200,y:7200});assert(g.pickups.includes(core),'unclaimed core lost during cleanup');at(g,core);g.updatePickups(.001);assert.equal(g.bag.cores,1);g.destroy();
});
test('Boss presents three distinct telegraphed attacks and locks charge direction before release',()=>{
  const {game:g}=battle();g.bossSite={id:'boss',kind:'resource',x:720,y:-720,title:'test',rare:true};at(g,g.bossSite);g.interact();const boss=g.enemies.find(e=>e.type==='boss');
  for(const [index,mode] of [[0,'windup-fan'],[1,'windup-charge'],[2,'windup-bomb']]){boss.pattern=index;boss.mode='idle';boss.timer=0;g.updateBoss(boss,.01);assert.equal(boss.mode,mode);assert(boss.timer>0);const aim=boss.aim;g.player.x+=50;g.updateBoss(boss,.1);assert.equal(boss.aim,aim);}
  boss.mode='windup-bomb';boss.timer=0;g.updateBoss(boss,.01);assert(g.warnings.length>=3);assert(g.warnings.every(w=>w.timer>1));g.destroy();
});
test('extraction requires a request and ten seconds, permits movement and cancels on leaving',()=>{
  const b=battle(),g=isolated(b),site=g.sites.find(s=>s.id==='origin:extract');at(g,site);g.update(.02);assert.equal(g.activeExtraction,null);assert.equal(b.result,undefined);
  g.interact();assert(g.activeExtraction);g.spawnTimer=Infinity;advance(g,4);assert(g.extractionProgress>.39&&g.extractionProgress<.41);g.player.x+=20;advance(g,1);assert(g.extractionProgress>.49);assert.equal(b.result,undefined);
  g.player.x=site.x+100;g.update(.02);assert.equal(g.activeExtraction,null);assert.equal(g.extractionProgress,0);
  at(g,site);g.interact();g.spawnTimer=Infinity;advance(g,9.9);assert.equal(b.result,undefined);advance(g,.2);assert.equal(b.result.success,true);assert.equal(b.result.reason,'extracted');g.destroy();
});
test('lethal damage on the final extraction frame produces failure, not successful extraction',()=>{
  const b=battle(),g=isolated(b),site=g.sites.find(s=>s.id==='origin:extract');at(g,site);g.interact();g.spawnTimer=Infinity;g.extractionProgress=.999;g.player.hp=1;g.warnings=[{x:g.player.x,y:g.player.y,r:50,timer:.001,max:1,damage:999,color:'#fff'}];g.update(.02);assert(b.result);assert.equal(b.result.success,false);assert.equal(b.result.reason,'dead');g.destroy();
});
function terminal(g){return g.sites.find(s=>s.id==='origin:terminal');}
function openTerminal(g,site=terminal(g)){at(g,site);g.interact();return site;}
test('contract cancellation spends nothing; acceptance costs ten once and terminal cannot repeat',()=>{
  const b=battle(),g=isolated(b);g.fragments=20;const site=openTerminal(g);assert.equal(b.contracts.length,3);g.closeContract();assert.equal(g.fragments,20);assert.equal(g.usedTerminals.size,0);
  openTerminal(g,site);g.chooseContract('stable');assert.equal(g.fragments,10);assert.equal(g.contracts.length,1);assert.equal(g.contracts[0].positive,true);assert.equal(g.damage,1.08);g.chooseContract('stable');assert.equal(g.fragments,10);
  openTerminal(g,site);assert.equal(g.contracting,false);assert.equal(g.contracts.length,1);g.destroy();
});
test('all risk branches apply advertised outcomes, with no free retry or cross-run effect',()=>{
  for(const [id,roll,positive,damageTaken,chain]of[['overload',.59,true,1,false],['overload',.60,false,1.12,false],['extreme',.14,true,1,true],['extreme',.15,false,1.25,false]]){
    const b=battle(),g=isolated(b);g.fragments=10;openTerminal(g);b.rt.math.random=()=>roll;g.chooseContract(id);assert.equal(g.contracts[0].positive,positive);assert.equal(g.fragments,0);assert.equal(g.damageTaken,damageTaken);assert.equal(g.chain,chain);g.closeContract();assert.equal(g.contracts.length,1);g.destroy();
  }
  const {game:fresh}=battle();assert.equal(fresh.contracts.length,0);assert.equal(fresh.damageTaken,1);assert.equal(fresh.chain,false);fresh.destroy();
});
test('only two contracts can be signed per run, including across different terminals',()=>{
  const {game:g}=battle();g.fragments=40;openTerminal(g);g.chooseContract('stable');
  at(g,{x:805,y:95});const second=g.sites.find(s=>s.id==='1,0:terminal');assert(second);openTerminal(g,second);g.chooseContract('stable');assert.equal(g.contracts.length,2);assert.equal(g.fragments,20);
  g.contracting=true;g.activeTerminal={id:'third',kind:'terminal',x:g.player.x,y:g.player.y,title:'test',rare:false};g.chooseContract('extreme');assert.equal(g.contracts.length,2);assert.equal(g.fragments,20);g.closeContract();g.destroy();
});
test('upgrading damage never reduces a higher damage total supplied by contracts',()=>{
  const {game:g}=battle();g.damage=3.28;g.upgrading=true;g.currentChoices=[{id:'damage',name:'test',description:'',kind:''}];g.chooseUpgrade('damage');assert(g.damage>=3.28);g.destroy();
});
test('instant supplies respect caps; timed supplies refresh duration without multiplying permanent stats',()=>{
  const {game:g}=battle();g.pickups=[];g.player.hp=100;g.player.shield=90;
  const give=type=>{g.pickups.push({x:g.player.x,y:g.player.y,type,amount:1,phase:0,life:90});g.updatePickups(.001);};
  give('heal');give('shield');assert.equal(g.player.hp,g.player.maxHp);assert.equal(g.player.shield,100);
  give('overcharge');assert.equal(g.supplyTimers.overcharge,8);g.supplyTimers.overcharge=2;give('overcharge');assert.equal(g.supplyTimers.overcharge,8);assert.equal(g.attackSpeed,1);
  give('speed');give('speed');assert.equal(g.supplyTimers.speed,8);assert.equal(g.moveSpeed,1);g.spawnTimer=Infinity;g.shotTimer=Infinity;advance(g,8.1);assert.equal(g.supplyTimers.speed,0);assert.equal(g.supplyTimers.overcharge,0);g.destroy();
});
test('no-hit ten-kill streak grants eight-second burst; shield damage and long kill gaps reset it',()=>{
  const {game:g}=battle();g.pickups=[];for(let i=0;i<10;i++){const e=g.spawnEnemy('normal',{x:160+i*2,y:0});assert(e);g.hitEnemy(e,999);}assert.equal(g.combo,10);assert.equal(g.maxCombo,10);assert.equal(g.comboTime,8);
  g.player.shield=20;g.hurt(1,'bullet');assert.equal(g.combo,0);assert.equal(g.comboTime,0);assert.equal(g.player.shield,19);assert.equal(g.maxCombo,10);
  g.player.invulnerable=0;g.elapsed+=5;const e=g.spawnEnemy('normal',{x:180,y:0});g.hitEnemy(e,999);assert.equal(g.combo,1);g.elapsed+=4.1;g.spawnTimer=Infinity;g.shotTimer=Infinity;g.update(.01);assert.equal(g.combo,0);g.destroy();
});
test('magnet, explosion insulation and bullet armor apply their advertised upgrade levels',()=>{
  for(const [level,magnet,explosion,bullet]of[[0,1.25,70,75],[2,1.45,50,65]]){
    const {game:g}=battle(equipped(['magnet','insulation','fortress'],{magnet:level,insulation:level,fortress:level}));assert(Math.abs(g.magnet-magnet)<1e-9);g.hurt(100,'explosion');assert.equal(g.player.hp,g.player.maxHp-explosion);g.player.hp=g.player.maxHp;g.player.invulnerable=0;g.hurt(100,'bullet');assert.equal(g.player.hp,g.player.maxHp-bullet);g.destroy();
  }
});
test('piercing adds one distinct target and upgraded damage; emergency protocol triggers once per run',()=>{
  const {game:p}=battle(equipped(['pierce'],{pierce:2}));p.enemies=[];p.spawnEnemy('normal',{x:140,y:0});p.shoot();assert.equal(p.bullets[0].hits,2);assert(Math.abs(p.bullets[0].damage-23.2)<1e-9);p.destroy();
  for(const [level,hp]of[[0,33],[2,55]]){const {game:g}=battle(equipped(['rescue'],{rescue:level}));g.hurt(999,'contact');assert.equal(g.player.hp,hp);assert.equal(g.rescueUsed,true);g.player.invulnerable=0;g.hurt(999,'contact');assert(g.player.hp<=0);g.destroy();}
});
test('shockwave triggers at dash end and pushes nearby enemies rather than applying a passive bonus',()=>{
  const {game:g}=battle(equipped(['shockwave']));g.enemies=[];g.spawnTimer=Infinity;g.shotTimer=Infinity;const e=g.spawnEnemy('normal',{x:80,y:0});g.player.dashTime=.01;g.update(.02);assert(e.hp<e.max);assert(Math.hypot(e.x-g.player.x,e.y-g.player.y)>120);g.destroy();
});
test('teleport landing windup cannot deal immediate contact damage',()=>{
  const {game:g}=battle();g.enemies=[];const e=g.spawnEnemy('teleporter',{x:0,y:0});e.mode='strike';e.timer=.55;e.shot=5;const hp=g.player.hp;g.updateEnemy(e,.1);assert.equal(g.player.hp,hp);g.updateEnemy(e,.5);assert(g.player.hp<hp);g.destroy();
});
test('ordinary kills and extraction reinforcements cannot create bankable materials',()=>{
  const {game:g}=battle();g.enemies=[];g.pickups=[];let e=g.spawnEnemy('normal',{x:100,y:0});g.hitEnemy(e,999);assert.equal(g.bag.alloy+g.bag.chips+g.bag.cores,0);assert(g.pickups.every(p=>!['alloy','chip','core'].includes(p.type)));g.pickups=[];e=g.spawnEnemy('normal',{x:100,y:0},undefined,true);g.hitEnemy(e,999);assert.equal(g.pickups.length,0);g.destroy();
});
test('player movement and fast projectiles respect the same cover, including large knockback steps',()=>{
  const {game:g}=battle();g.enemies=[];g.pickups=[];g.obstacles=[{x:100,y:-80,w:20,h:160,kind:'wall'}];g.moveEntity(g.player,300,0,16);assert(g.player.x<=84,'large actor displacement crossed cover');
  g.player.x=250;g.player.y=0;const hp=g.player.hp;g.spawnTimer=Infinity;g.shotTimer=Infinity;g.bullets=[{x:0,y:0,vx:30000,vy:0,damage:50,life:1,hostile:true,r:4,color:'#fff',hits:1,hitIds:new Set()}];g.update(.01);assert.equal(g.player.hp,hp);assert.equal(g.bullets.length,0);g.destroy();
});
test('saturated enemy capacity cannot grant undefended resource rewards or leave an empty active Boss',()=>{
  const {game:g}=battle();g.enemies=[];for(let i=0;i<42;i++)g.spawnEnemy('normal',{x:300+i,y:250});const site=g.sites.find(s=>s.id==='0,0:resource');at(g,site);g.interact();g.updateEvents();assert.equal(g.events,0);assert.equal(g.bag.alloy,0);
  g.bossSite={id:'boss',kind:'resource',x:0,y:0,title:'test',rare:true};g.spawnBoss();assert(!g.bossActive||g.enemies.some(e=>e.type==='boss'&&e.hp>0));g.destroy();
});
test('long combat caps actors, projectiles and effects; wandering keeps only adjacent chunks',()=>{
  const {game:g}=battle();g.player.invulnerable=Infinity;
  for(let i=0;i<3000;i++){if(g.upgrading)g.chooseUpgrade(g.currentChoices[0].id);g.update(.04);assert(g.enemies.length<=42);assert(g.bullets.length<=260);assert(g.particles.length<=450);}
  for(let i=0;i<30;i++){at(g,{x:i*720,y:-i*720});g.update(.01);assert(g.chunks.size<=9);assert(g.enemies.filter(e=>e.type!=='boss').every(e=>Math.hypot(e.x-g.player.x,e.y-g.player.y)<=1601));}g.destroy();
});
test('actual event rewards -> extraction -> React settlement -> module unlock/equip -> next run effects',()=>{
  const profile=m.initialProfile(),b=battle(profile),g=b.game;clearResource(g,g.sites.find(s=>s.id==='0,0:resource'));clearResource(g,g.sites.find(s=>s.id==='1,0:resource'));
  assert.equal(g.bag.alloy,56);assert.equal(g.bag.chips,4);assert.equal(g.bossActive,false);g.enemies=[];g.pickups=[];g.bullets=[];g.warnings=[];const extract=g.sites.find(s=>s.kind==='extract');at(g,extract);g.interact();g.spawnTimer=Infinity;g.shotTimer=Infinity;advance(g,10.1);assert.equal(b.result.success,true);
  const host=actualFinish(profile);host.finish(b.result);let p=m.unlockModule(host.profile,'fortress');assert(p);p=m.toggleModule(p,'fortress');assert(p);assert.equal(p.alloy,21);assert.equal(p.chips,2);const saved=runtime(JSON.stringify(p)).model.loadProfile();
  const next=battle(saved),hp=next.game.player.hp;next.game.hurt(20,'bullet');assert.equal(next.game.player.hp,hp-15);assert.equal(next.game.events,0);assert.equal(next.game.contracts.length,0);assert.equal(next.game.combo,0);assert.equal(next.game.supplyTimers.overcharge,0);g.destroy();next.game.destroy();
});

test('actual Battle UI wires modules and closes upgrade/contract dialogs on empty callbacks',()=>{
  const text=fs.readFileSync(path.join(root,'src/BattleV2.tsx'),'utf8');
  const ast=ts.createSourceFile('BattleV2.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let node;
  function visit(n){if(ts.isNewExpression(n)&&n.expression.getText(ast)==='StarbreakGame')node=n;ts.forEachChild(n,visit);}visit(ast);assert(node);
  let captured,choiceState,contractState,finishedResult;
  const profile=equipped(['pierce'],{pierce:2});
  const context={module:{exports:{}},canvas:{current:canvas()},profile,setHud(){},setChoices:v=>{choiceState=v;},setContracts:v=>{contractState=v;},finishRef:{current:r=>{finishedResult=r;}},StarbreakGame:class{constructor(c,options){captured=options;}}};
  const code=ts.transpileModule('module.exports='+node.getText(ast)+';', {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2021}}).outputText;
  vm.runInNewContext(code,context);assert.deepEqual(plain(captured.modules),['pierce']);assert.equal(captured.moduleLevels.pierce,2);
  const upgrade=[{id:'damage',name:'test'}],contract=[{id:'stable',name:'test'}];captured.onUpgrade(upgrade);assert.equal(choiceState,upgrade);captured.onUpgrade([]);assert.equal(choiceState,null);
  captured.onContract(contract);assert.equal(contractState,contract);captured.onContract([]);assert.equal(contractState,null);
  const payload={success:true};captured.onFinish(payload);assert.equal(finishedResult,payload);
});
test('death result recovers exactly twenty percent alloy and no rare loot, keeping permanent ownership',()=>{
  const profile=equipped(['fortress'],{fortress:1}),b=battle(profile),g=b.game;g.bag={alloy:43,chips:3,cores:1};g.finish('dead');assert.equal(b.result.alloy,8);assert.equal(b.result.chips,0);assert.equal(b.result.cores,0);
  const host=actualFinish(profile);host.finish(b.result);assert.equal(host.profile.alloy,8);assert.equal(host.profile.stats.extracts,0);assert.deepEqual(plain(host.profile.equippedModules),['fortress']);assert.equal(host.profile.moduleLevels.fortress,1);g.destroy();
});

process.stdout.write(`${count} checks passed. Actual TS engine/model/App executed; no browser or hand-feel claim.\n`);
