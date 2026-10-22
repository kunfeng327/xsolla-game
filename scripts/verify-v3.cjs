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
function runtime(saved = null, seed = 42, environment = {}) {
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
      document: { hidden: false, addEventListener() {}, removeEventListener() {} }, console,
      ...environment,
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
test('tracked recipes, module unlocks and bag expansion survive save migration; unknown targets reset safely',()=>{
  for(const id of [...m.RECIPES.map(x=>x.id),'bag',...m.MODULES.map(x=>`module:${x.id}`)]){
    const profile={...rich(),tracked:id},loaded=runtime(JSON.stringify(profile)).model.loadProfile();
    assert.equal(loaded.tracked,id);assert.equal(m.getTrackedGoal(loaded).id,id);
  }
  for(const tracked of [null,7,'module:unknown','not-a-recipe'])assert.equal(runtime(JSON.stringify({tracked})).model.loadProfile().tracked,'scatter');
  assert.equal(runtime(JSON.stringify({alloy:47,weapons:['pulse','scatter'],selectedWeapon:'scatter'})).model.loadProfile().tracked,'scatter');
});
test('tracked goals expose current costs, completion and affordability for all three reward types',()=>{
  let p={...m.initialProfile(),tracked:'scatter'};let goal=m.getTrackedGoal(p);assert.equal(goal.kind,'recipe');assert.equal(goal.complete,false);assert.equal(goal.canAfford,false);assert.deepEqual(plain(goal.cost),{alloy:40,chips:2,cores:0});
  p={...rich(),tracked:'bag'};goal=m.getTrackedGoal(p);assert.equal(goal.kind,'bag');assert.equal(goal.canAfford,true);assert.equal(goal.cost.alloy,45);
  p=m.expandBackpack(p);assert.equal(m.getTrackedGoal(p).cost.alloy,90);p=m.expandBackpack(p);goal=m.getTrackedGoal(p);assert.equal(goal.complete,true);assert.equal(goal.canAfford,false);
  p={...rich(),tracked:'module:fortress'};goal=m.getTrackedGoal(p);assert.equal(goal.kind,'module');assert.equal(goal.canAfford,true);assert.deepEqual(plain(goal.cost),{alloy:35,chips:2,cores:0});p=m.unlockModule(p,'fortress');assert.equal(m.getTrackedGoal(p).complete,true);assert.equal(m.getTrackedGoal(p).canAfford,false);
  p={...rich(),tracked:'health',healthLevel:2};assert.equal(m.getTrackedGoal(p).cost.alloy,90);p=m.purchase(p,'health');assert.equal(p.healthLevel,3);assert.notEqual(p.tracked,'health');
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
function isolated(b){b.game.spawnTimer=Infinity;b.game.shotTimer=Infinity;b.game.enemies=[];b.game.pending=[];b.game.queueWave=()=>{};b.game.bullets=[];b.game.pickups=[];return b.game;}
function at(g,p){g.player.x=p.x;g.player.y=p.y;g.refreshChunks(true);}
function advance(g,seconds){for(let n=0;n<Math.ceil(seconds/.02)&&g.running;n++){if(g.upgrading)g.chooseUpgrade(g.currentChoices[0].id);g.update(Math.min(.02,seconds-n*.02));}}
function startResource(g,site){at(g,site);g.interact();const state=g.eventStates.get(site.id);assert.equal(state?.status,'active');assert(state.guards.length>0);return state;}
// Rule fixtures deliberately bypass emergence/combat. Natural pressure runs below do neither.
function clearResource(g,site){const state=startResource(g,site);for(const id of state.guards){const e=g.enemies.find(e=>e.id===id);assert(e);e.mode='idle';g.hitEnemy(e,9999);}g.updateEvents();assert.equal(state.status,'done');if(g.upgrading)g.chooseUpgrade(g.currentChoices[0].id);}
function equipped(ids,levels={}){return {...m.initialProfile(),modules:[...new Set(['magnet','insulation',...ids])],equippedModules:ids,moduleLevels:levels};}
function naturalRun(seed, policy, duration=60){
  const b=battle(m.initialProfile(),seed),g=b.game;let hurts=0,damage=0,firstUpgrade=null,closeSeconds=0,maxNear=0,minDistance=Infinity;
  const original=g.hurt.bind(g);g.hurt=(...args)=>{const before=g.player.hp+g.player.shield;original(...args);const lost=before-g.player.hp-g.player.shield;if(lost>0){hurts++;damage+=lost;}};
  for(let n=0;n<duration/.02&&g.running;n++){
    if(g.upgrading){if(firstUpgrade===null)firstUpgrade=g.elapsed;const preference=g.player.hp<g.player.maxHp*.55?['heal','shield','damage','rapid']:['damage','rapid','shield','magnet'];const choice=preference.map(id=>g.currentChoices.find(c=>c.id===id)).find(Boolean)||g.currentChoices[0];g.chooseUpgrade(choice.id);}
    if(policy==='east')g.setInput(1,0);
    if(policy==='orbit'){g.setInput(Math.cos(g.elapsed*.55),Math.sin(g.elapsed*.55));if(g.enemies.filter(e=>e.hp>0&&Math.hypot(e.x-g.player.x,e.y-g.player.y)<100).length>2)g.dash();}
    g.update(.02);
    const active=g.enemies.filter(e=>e.hp>0&&e.mode!=='emerge'),ds=active.map(e=>Math.hypot(e.x-g.player.x,e.y-g.player.y)),near=ds.filter(d=>d<180).length;
    if(ds.length)minDistance=Math.min(minDistance,...ds);if(near)closeSeconds+=.02;maxNear=Math.max(maxNear,near);
  }
  g.emitHud();const result={seed,policy,seconds:+g.elapsed.toFixed(2),alive:g.running,hp:+g.player.hp.toFixed(1),shield:+g.player.shield.toFixed(1),hurts,damage,kills:g.kills,firstUpgrade:firstUpgrade===null?null:+firstUpgrade.toFixed(2),closeSeconds:+closeSeconds.toFixed(2),maxNear,minDistance:Number.isFinite(minDistance)?+minDistance.toFixed(1):null,explored:g.visited.size};g.destroy();return result;
}
if(process.argv.includes('--balance')){
  const rows=[];for(const policy of ['stand','east','orbit'])for(const seed of [42,73,101])rows.push(naturalRun(seed,policy));process.stdout.write(JSON.stringify(rows,null,2)+'\n');process.exit(0);
}
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
  const {game:g}=battle();g.pickups=[];for(let i=0;i<10;i++){const e=g.spawnEnemy('normal',{x:160+i*2,y:0});assert(e);e.mode='idle';g.hitEnemy(e,999);}assert.equal(g.combo,10);assert.equal(g.maxCombo,10);assert.equal(g.comboTime,8);
  g.player.shield=20;g.hurt(1,'bullet');assert.equal(g.combo,0);assert.equal(g.comboTime,0);assert.equal(g.player.shield,19);assert.equal(g.maxCombo,10);
  g.player.invulnerable=0;g.elapsed+=5;const e=g.spawnEnemy('normal',{x:180,y:0});e.mode='idle';g.hitEnemy(e,999);assert.equal(g.combo,1);g.elapsed+=4.1;g.spawnTimer=Infinity;g.shotTimer=Infinity;g.update(.01);assert.equal(g.combo,0);g.destroy();
});
test('magnet, explosion insulation and bullet armor apply their advertised upgrade levels',()=>{
  for(const [level,magnet,explosion,bullet]of[[0,1.25,70,75],[2,1.45,50,65]]){
    const {game:g}=battle(equipped(['magnet','insulation','fortress'],{magnet:level,insulation:level,fortress:level}));assert(Math.abs(g.magnet-magnet)<1e-9);g.hurt(100,'explosion');assert.equal(g.player.hp,g.player.maxHp-explosion);g.player.hp=g.player.maxHp;g.player.invulnerable=0;g.hurt(100,'bullet');assert.equal(g.player.hp,g.player.maxHp-bullet);g.destroy();
  }
});
test('piercing adds one distinct target and upgraded damage; emergency protocol triggers once per run',()=>{
  const {game:p}=battle(equipped(['pierce'],{pierce:2}));p.enemies=[];p.spawnEnemy('normal',{x:140,y:0}).mode='idle';p.shoot();assert.equal(p.bullets[0].hits,2);assert(Math.abs(p.bullets[0].damage-23.2)<1e-9);p.destroy();
  for(const [level,hp]of[[0,33],[2,55]]){const {game:g}=battle(equipped(['rescue'],{rescue:level}));g.hurt(999,'contact');assert.equal(g.player.hp,hp);assert.equal(g.rescueUsed,true);g.player.invulnerable=0;g.hurt(999,'contact');assert(g.player.hp<=0);g.destroy();}
});
test('shockwave triggers at dash end and pushes nearby enemies rather than applying a passive bonus',()=>{
  const {game:g}=battle(equipped(['shockwave']));g.enemies=[];g.spawnTimer=Infinity;g.shotTimer=Infinity;const e=g.spawnEnemy('normal',{x:80,y:0});e.mode='idle';g.player.dashTime=.01;g.update(.02);assert(e.hp<e.max);assert(Math.hypot(e.x-g.player.x,e.y-g.player.y)>120);g.destroy();
});
test('teleport landing windup cannot deal immediate contact damage',()=>{
  const {game:g}=battle();g.enemies=[];const e=g.spawnEnemy('teleporter',{x:0,y:0});e.mode='strike';e.timer=.55;e.shot=5;const hp=g.player.hp;g.updateEnemy(e,.1);assert.equal(g.player.hp,hp);g.updateEnemy(e,.5);assert(g.player.hp<hp);g.destroy();
});
test('ordinary kills and extraction reinforcements cannot create bankable materials',()=>{
  const {game:g}=battle();g.enemies=[];g.pickups=[];let e=g.spawnEnemy('normal',{x:100,y:0});e.mode='idle';g.hitEnemy(e,999);assert.equal(g.bag.alloy+g.bag.chips+g.bag.cores,0);assert(g.pickups.every(p=>!['alloy','chip','core'].includes(p.type)));g.pickups=[];e=g.spawnEnemy('normal',{x:100,y:0},undefined,true);e.mode='idle';g.hitEnemy(e,999);assert.equal(g.pickups.length,0);g.destroy();
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

test('base movement is 175 in both cardinal and diagonal directions; permanent mobility has a hard cap',()=>{
  for(const [x,y]of[[1,0],[1,1]]){const b=battle(),g=isolated(b);g.obstacles=[];g.setInput(x,y);g.update(.1);assert(Math.abs(Math.hypot(g.player.x,g.player.y)-17.5)<1e-8);g.emitHud();assert.equal(b.hud.playerSpeed,175);g.destroy();}
  const b=battle(),g=isolated(b);for(let i=0;i<10;i++){g.upgrading=true;g.currentChoices=[{id:'speed',name:'test'}];g.chooseUpgrade('speed');}assert.equal(g.moveSpeed,1.25);g.supplyTimers.speed=8;g.comboTime=8;g.emitHud();assert(b.hud.playerSpeed<301);g.destroy();
});
test('director waves telegraph legal positions and postpone a spawn when the player enters its warning',()=>{
  for(const seed of [42,73,101]){const {game:g}=battle(m.initialProfile(),seed);g.spawnTimer=Infinity;g.enemies=[];g.pending=[];g.queueWave(5,false,360);assert(g.pending.length>0);
    for(const p of g.pending){assert(Math.hypot(p.x-g.player.x,p.y-g.player.y)>=130);assert.equal(world.circleBlocked(p,22,g.obstacles),false);assert(p.delay>=.8);}
    const warning=g.pending[0];at(g,warning);const hp=g.player.hp;g.updateDirector(.85);assert(g.pending.includes(warning));assert(warning.delay>0);assert.equal(g.enemies.some(e=>Math.hypot(e.x-g.player.x,e.y-g.player.y)<130),false);assert.equal(g.player.hp,hp);
    const e=g.spawnEnemy('normal',{x:g.player.x+75,y:g.player.y});assert.equal(e.mode,'emerge');const before=e.hp;g.hitEnemy(e,10);assert.equal(e.hp,before);g.updateEnemy(e,.1);assert.equal(g.player.hp,hp);g.destroy();}
});
test('distant ambient enemies release the director budget while local guards remain protected',()=>{
  const {game:g}=battle();g.enemies=[];for(let i=0;i<42;i++)assert(g.spawnEnemy('normal',{x:1400+i,y:0}));g.queueWave(5);assert(g.enemies.length<42);assert.equal(g.pending.length,5);
  const guard=g.spawnEnemy('normal',{x:1400,y:0},'test-resource');g.pruneDistantEnemies();assert(g.enemies.includes(guard));g.destroy();
});
test('real melee and ranged actors pursue around cover instead of walking through or abandoning it',()=>{
  for(const type of['normal','shooter']){const {game:g}=battle(),b={x:100,y:-120,w:40,h:240,kind:'wall'};g.spawnTimer=Infinity;g.shotTimer=Infinity;g.enemies=[];g.pickups=[];g.pending=[];g.obstacles=[b];const e=g.spawnEnemy(type,{x:260,y:0}),start={x:e.x,y:e.y};
    let closest=260;for(let n=0;n<300&&g.running;n++){g.update(.02);assert.equal(world.circleBlocked(e,e.r,[b]),false,'enemy crossed cover');closest=Math.min(closest,Math.hypot(e.x-g.player.x,e.y-g.player.y));}
    assert(Math.hypot(e.x-start.x,e.y-start.y)>100,`${type} stopped pursuing`);assert.equal(world.lineBlocked(e,g.player,[b]),false,`${type} never found a firing route around cover`);if(type==='normal')assert(closest<45);g.destroy();}
});
test('the first cleared resource guarantees one upgrade and ten contract fragments, with no repeat payout',()=>{
  const b=battle(),g=b.game,site=g.sites.find(s=>s.id==='0,0:resource'),state=startResource(g,site);for(const id of state.guards){const e=g.enemies.find(e=>e.id===id);e.mode='idle';g.hitEnemy(e,9999);}g.updateEvents();assert.equal(g.level,2);assert.equal(g.upgrading,true);assert.equal(b.choices.length,3);assert.equal(g.fragments,10);const xp=g.xp;g.updateEvents();assert.equal(g.level,2);assert.equal(g.fragments,10);assert.equal(g.xp,xp);g.destroy();
});
test('full health and shield do not consume a field supply; returning after damage consumes it exactly once',()=>{
  const {game:g}=battle();g.pickups=[];g.player.shield=100;const heal={id:'test:heal',x:0,y:0,type:'heal',amount:1,phase:0,life:Infinity},shield={id:'test:shield',x:0,y:0,type:'shield',amount:1,phase:0,life:Infinity};g.pickups=[heal,shield];g.updatePickups(.01);assert.equal(g.pickups.length,2);assert.equal(g.consumedSupplies.size,0);
  g.player.hp-=5;g.player.shield-=5;g.updatePickups(.01);assert.equal(g.player.hp,g.player.maxHp);assert.equal(g.player.shield,100);assert.equal(g.pickups.length,0);assert.equal(g.consumedSupplies.size,2);g.updatePickups(.01);assert.equal(g.consumedSupplies.size,2);g.destroy();
});
test('HUD reports emergency protocol ready then spent, and includes the damage source on death',()=>{
  const b=battle(equipped(['rescue'])),g=b.game;assert.equal(b.hud.rescueAvailable,true);g.hurt(999,'contact','test attacker');g.emitHud();assert.equal(b.hud.rescueAvailable,false);assert.equal(g.player.hp,33);g.player.invulnerable=0;g.hurt(999,'contact','final attacker');g.update(.01);assert.equal(b.result.lastDamageSource,'final attacker');g.destroy();
});
test('public objective switching chooses resources, extraction, terminals and revealed Boss independently',()=>{
  const defaultRun=battle();defaultRun.game.bag.cores=1;defaultRun.game.emitHud();assert.equal(defaultRun.game.targetInfo().point.kind,'extract');defaultRun.game.destroy();
  const b=battle(),g=b.game;g.setObjective('resource');assert.equal(g.targetInfo().point.kind,'resource');g.setObjective('extract');assert.equal(g.targetInfo().point.kind,'extract');g.setObjective('terminal');assert.equal(g.targetInfo().point.kind,'terminal');assert(b.hud.target.name.includes('碎片'));
  g.fragments=10;g.setObjective('terminal');assert.equal(b.hud.target.name,'签订异常契约');g.bossSite={id:'boss',kind:'resource',x:720,y:-720,title:'test',rare:true};g.setObjective('boss');assert.equal(g.targetInfo().point,g.bossSite);g.bag.cores=1;g.setObjective('resource');assert.equal(g.targetInfo().point.kind,'resource');g.setObjective('terminal');assert.equal(g.targetInfo().point.kind,'terminal');g.setObjective('extract');assert.equal(g.targetInfo().point.kind,'extract');g.destroy();
});

function componentHarness(file,props,initialStates={}){
  const rt=runtime(),states=[],refs=[];let cursor=0,refCursor=0,tree;
  const jsx=(type,props)=>({type,props:props||{}}),icons=new Proxy({},{get:()=>()=>null});
  const react={useState(initial){const index=cursor++;if(!(index in states))states[index]=index in initialStates?initialStates[index]:typeof initial==='function'?initial():initial;return[states[index],value=>{states[index]=typeof value==='function'?value(states[index]):value;}];},useId:()=>':test:',useEffect(){},useRef(value){const index=refCursor++;return refs[index]||(refs[index]={current:value});}};
  const context={module:{exports:{}},exports:{},localStorage:{getItem:()=>null,setItem(){}},window:{},document:{},console,require:id=>id==='react'?react:id==='react/jsx-runtime'?{jsx,jsxs:jsx,Fragment:'fragment'}:id==='lucide-react'?icons:id.endsWith('.css')?{}:id==='./game'?{}:id.startsWith('.')?rt.load(id.slice(2)):require(id)};context.exports=context.module.exports;
  const source=ts.transpileModule(fs.readFileSync(path.join(root,'src',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2021,jsx:ts.JsxEmit.ReactJSX}}).outputText;vm.runInNewContext(source,context,{filename:file});
  function expand(node){if(node===null||node===undefined||typeof node==='boolean')return null;if(Array.isArray(node))return node.map(expand);if(typeof node!=='object')return node;if(typeof node.type==='function')return expand(node.type(node.props));return{...node,props:{...node.props,children:expand(node.props.children)}};}
  function render(){cursor=0;refCursor=0;tree=expand(context.module.exports.default(props));return tree;}
  function all(node=tree,result=[]){if(Array.isArray(node))node.forEach(n=>all(n,result));else if(node&&typeof node==='object'){result.push(node);all(node.props.children,result);}return result;}
  const text=node=>node==null?'':Array.isArray(node)?node.map(text).join(''):typeof node==='object'?text(node.props.children):String(node);
  render();return{render,all,text,find:predicate=>all().find(predicate),states,refs};
}
const campProps=profile=>({profile,onBuy(){},onSelectWeapon(){},onSelectCharacter(){},onTrack(){},onStart(){},onOpenHelp(){},onToggleModule(){},onUnlockModule(){},onUpgradeModule(){},onExpandBackpack(){}});
test('actual Camp first action explains E and its three tabs switch visibility and keyboard focus',()=>{
  let started=0,helped=0;const h=componentHarness('Camp.tsx',{...campProps(m.initialProfile()),onStart:()=>started++,onOpenHelp:()=>helped++});assert(h.text(h.find(n=>n.props.className==='camp-mission-copy')).includes('按 E 启动'));
  const panels=()=>h.all().filter(n=>n.props.role==='tabpanel');assert.deepEqual(panels().filter(n=>!n.props.hidden).map(n=>n.props.id),['camp-panel-action']);
  h.find(n=>n.props.id==='camp-tab-equipment').props.onClick();h.render();assert.equal(panels().find(n=>!n.props.hidden).props.id,'camp-panel-equipment');assert.equal(h.find(n=>n.props.id==='camp-tab-equipment').props.tabIndex,0);
  let focused,prevented=false;h.find(n=>n.props.role==='tablist').props.onKeyDown({key:'End',preventDefault(){prevented=true;},currentTarget:{querySelector:selector=>({focus(){focused=selector;}})}});h.render();assert.equal(panels().find(n=>!n.props.hidden).props.id,'camp-panel-workshop');assert.equal(focused,'#camp-tab-workshop');assert(prevented);
  h.find(n=>n.props.className==='camp-launch').props.onClick();h.find(n=>n.props['aria-label']==='查看行动指南').props.onClick();assert.equal(started,1);assert.equal(helped,1);
});
test('actual Camp tracked redemption dispatches recipe, module and bag actions correctly',()=>{
  for(const [tracked,expected]of[['scatter','buy:scatter'],['module:fortress','module:fortress'],['bag','bag']]){let action;const h=componentHarness('Camp.tsx',{...campProps({...rich(),tracked}),onBuy:id=>{action='buy:'+id;},onUnlockModule:id=>{action='module:'+id;},onExpandBackpack:()=>{action='bag';}});const button=h.find(n=>n.props.className==='camp-goal-redeem');assert(button);button.props.onClick();assert.equal(action,expected);}
  let goal;const h=componentHarness('Camp.tsx',{...campProps(m.initialProfile()),onTrack:id=>{goal=id;}});h.find(n=>n.props.id==='camp-tab-equipment').props.onClick();h.render();const track=h.all().filter(n=>n.type==='button').find(n=>h.text(n)==='追踪扩容');assert(track);track.props.onClick();h.render();assert.equal(goal,'bag');assert.equal(h.find(n=>n.props.id==='camp-panel-action').props.hidden,false);
});
test('actual Battle HUD exposes effect details, scalable settings, mute toggle and objective buttons',()=>{
  const profile=equipped(['rescue']),hud={hp:100,maxHp:110,shield:0,time:10,xp:0,xpNeeded:6,level:1,kills:2,alloy:0,chips:0,cores:0,fragments:0,danger:0,events:0,bossRevealed:false,bossHp:0,bossMaxHp:0,contracts:[],supplies:[{id:'overcharge',name:'超载',remaining:6}],rescueAvailable:false,damageMultiplier:1,attackMultiplier:1.4,moveMultiplier:1,tutorialStep:'按 E 启动资源仓',dashReady:true};
  const h=componentHarness('BattleV2.tsx',{profile,onFinish(){},onHelp(){},helpOpen:false},{0:hud});assert(h.find(n=>n.props.className==='field-buff buff-overcharge'));assert(h.find(n=>n.type==='span'&&n.props.className==='spent'));assert(h.find(n=>n.type==='button'&&h.text(n)==='Boss').props.disabled);let tracked,muted;h.refs[1].current={setObjective:id=>{tracked=id;},setAudioEnabled:enabled=>{muted=!enabled;}};h.find(n=>n.type==='button'&&h.text(n)==='撤离').props.onClick();h.render();assert.equal(tracked,'extract');assert.equal(h.find(n=>n.type==='button'&&h.text(n)==='撤离').props['aria-pressed'],true);
  h.find(n=>n.props['aria-label']==='界面与反馈设置').props.onClick();h.render();assert(h.find(n=>n.props.role==='dialog'&&n.props['aria-label']==='界面与反馈设置'));h.find(n=>n.type==='button'&&h.text(n)==='150%').props.onClick();h.render();assert.equal(h.find(n=>n.type==='main').props.style['--hud-scale'],1.5);
  h.find(n=>n.props['aria-label']==='关闭音效').props.onClick();h.render();assert.equal(muted,true);assert(h.find(n=>n.props['aria-label']==='开启音效'));h.find(n=>n.props['aria-label']==='返回战场').props.onClick();h.render();assert.equal(h.all().filter(n=>n.props.role==='dialog').length,0);
});
test('audio is optional in a non-browser, denied device or absent WebAudio environment',()=>{
  for(const environment of[{window:undefined},{window:{}},{window:{AudioContext:class{constructor(){throw new Error('device denied');}}}}]){const Audio=runtime(null,42,environment).load('audio').CombatAudio,a=new Audio();for(const cue of['pulse','hit','kill','pickup','upgrade','contract','extract','hurt','dash'])a.play(cue);a.setEnabled(false);a.play('pulse');a.setEnabled(true);a.setVolume(0);a.destroy();}
});
test('mute suppresses synthesis and optional Image sprites remain self-contained PNG data',()=>{
  let played=0;const parameter={setValueAtTime(){},exponentialRampToValueAtTime(){}};class FakeAudio{constructor(){this.state='running';this.currentTime=0;this.destination={};}createOscillator(){return{frequency:parameter,connect(){},disconnect(){},start(){played++;},stop(){}};}createGain(){return{gain:parameter,connect(){},disconnect(){}};}close(){return Promise.resolve();}}
  const rt=runtime(null,42,{window:{devicePixelRatio:1,addEventListener(){},removeEventListener(){},AudioContext:FakeAudio},Image:class{constructor(){this.complete=false;this.naturalWidth=0;}set src(value){assert(value.startsWith('data:image/png;base64,'));}}});const Audio=rt.load('audio').CombatAudio,a=new Audio(false);a.play('pulse');assert.equal(played,0);a.setEnabled(true);a.play('pulse');assert.equal(played,1);a.setEnabled(false);a.play('kill');assert.equal(played,1);a.destroy();
  const art=rt.load('art');for(const key of['player','engineer','normal','shooter','lobber','teleporter','boss','chest','crate','barrel']){const bytes=Buffer.from(art.ART[key].split(',')[1],'base64');assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');}assert.equal(art.ART.chest,art.ART.crate,'resource chest must use the visually verified crate PNG');const Game=rt.load('game').StarbreakGame,g=new Game(canvas(),{weapon:'pulse',character:'gunner',healthLevel:0,magnetLevel:0,trail:false,onHud(){},onUpgrade(){},onContract(){},onFinish(){}});g.start();g.setAudioEnabled(false);g.setAudioVolume(.3);g.setScreenShake(false);g.destroy();
});

const balance=[];
if(!process.argv.includes('--rules'))test('default-profile natural runs create pressure and still permit active circling across three seeds',()=>{
  for(const policy of['stand','east','orbit'])for(const seed of[42,73,101])balance.push(naturalRun(seed,policy));
  for(const row of balance.filter(x=>x.policy==='stand')){assert(row.hurts>=2);assert(row.closeSeconds>=2);assert.equal(row.alive,false);assert(row.seconds<60);assert(row.firstUpgrade!==null&&row.firstUpgrade<40);}
  for(const row of balance.filter(x=>x.policy==='east')){assert(row.hurts>=1);assert(row.closeSeconds>=5);assert(row.explored>1);}
  for(const row of balance.filter(x=>x.policy==='orbit')){assert(row.alive);assert.equal(row.seconds,60);assert(row.firstUpgrade!==null);assert(row.kills>=15);}
});
if(balance.length)process.stdout.write('NATURAL_BALANCE '+JSON.stringify(balance)+'\n');

process.stdout.write(`${count} checks passed. Actual TS engine/model/App executed; no browser or hand-feel claim.\n`);
