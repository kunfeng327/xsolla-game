export type WeaponId = 'pulse' | 'scatter' | 'drone';
export type CharacterId = 'gunner' | 'engineer';
export type RecipeId = 'health' | 'magnet' | 'scatter' | 'drone' | 'engineer' | 'trail';
export type Materials = { alloy:number; chips:number; cores:number };
export type ModuleId = 'magnet' | 'insulation' | 'fortress' | 'shockwave' | 'pierce' | 'rescue';
export type TrackId = RecipeId | 'bag' | `module:${ModuleId}`;
export interface TrackedGoal { id:TrackId; title:string; description:string; cost:Materials; complete:boolean; canAfford:boolean; kind:'recipe'|'module'|'bag' }
export interface TacticalModule { id:ModuleId; name:string; description:string; slots:1|2|3; rarity:'green'|'purple'|'gold'; cost:Materials }
export const MODULES:TacticalModule[] = [
  {id:'magnet',name:'回收磁环',description:'拾取范围 +25%，每次强化再增加 10%。',slots:1,rarity:'green',cost:{alloy:0,chips:0,cores:0}},
  {id:'insulation',name:'爆破隔热',description:'爆炸伤害降低 30%，每次强化再降低 10%。',slots:1,rarity:'green',cost:{alloy:0,chips:0,cores:0}},
  {id:'fortress',name:'固若金汤',description:'弹丸伤害降低 25%，每次强化再降低 5%。',slots:2,rarity:'purple',cost:{alloy:35,chips:2,cores:0}},
  {id:'shockwave',name:'冲刺震荡',description:'冲刺结束击退附近敌人，强化扩大作用范围。',slots:2,rarity:'purple',cost:{alloy:35,chips:2,cores:0}},
  {id:'pierce',name:'穿甲核心',description:'子弹额外穿透 1 个敌人，强化每级伤害 +8%。',slots:3,rarity:'gold',cost:{alloy:60,chips:3,cores:1}},
  {id:'rescue',name:'应急协议',description:'每局一次致命保护，恢复 30% 生命；强化每级 +10%。',slots:3,rarity:'gold',cost:{alloy:60,chips:2,cores:1}},
];
export interface Profile extends Materials {
  healthLevel:number; magnetLevel:number; weapons:WeaponId[]; characters:CharacterId[]; trail:boolean;
  selectedWeapon:WeaponId; selectedCharacter:CharacterId; tracked:TrackId;
  stats:{runs:number;extracts:number;bossKills:number;kills:number};
  bagLevel:number; modules:ModuleId[]; equippedModules:ModuleId[]; moduleLevels:Partial<Record<ModuleId,number>>;
}
export interface Recipe { id:RecipeId; title:string; description:string; icon:string; cost:Materials; maxLevel?:number }
export const STORAGE_KEY='starbreak-profile-v1';
export const WEAPON_NAMES:Record<WeaponId,string>={pulse:'脉冲步枪',scatter:'散射枪',drone:'环绕无人机'};
export const CHARACTER_NAMES:Record<CharacterId,string>={gunner:'先锋枪手',engineer:'无人机工程师'};
export const RECIPES:Recipe[]=[
  {id:'health',title:'生命强化',description:'每级增加 10 点初始生命，最多三级。',icon:'heart',cost:{alloy:30,chips:0,cores:0},maxLevel:3},
  {id:'magnet',title:'磁力拾取',description:'每级扩大 20% 物资与经验拾取范围，最多三级。',icon:'magnet',cost:{alloy:25,chips:0,cores:0},maxLevel:3},
  {id:'scatter',title:'散射枪',description:'永久解锁：扇形齐射，近距离清理包围。',icon:'crosshair',cost:{alloy:40,chips:2,cores:0}},
  {id:'drone',title:'环绕无人机',description:'永久解锁：无人机环绕攻击，用走位收割敌群。',icon:'orbit',cost:{alloy:60,chips:4,cores:0}},
  {id:'engineer',title:'无人机工程师',description:'永久解锁：额外一架环绕无人机，20 点护盾起步。',icon:'bot',cost:{alloy:80,chips:0,cores:3}},
  {id:'trail',title:'星核行者尾迹',description:'永久解锁：所有角色装配紫色星核粒子尾迹。',icon:'sparkles',cost:{alloy:40,chips:0,cores:2}},
];
export function initialProfile():Profile { return {alloy:0,chips:0,cores:0,healthLevel:0,magnetLevel:0,weapons:['pulse'],characters:['gunner'],trail:false,selectedWeapon:'pulse',selectedCharacter:'gunner',tracked:'scatter',stats:{runs:0,extracts:0,bossKills:0,kills:0},bagLevel:0,modules:['magnet','insulation'],equippedModules:['magnet','insulation'],moduleLevels:{}} }
export function moduleCapacity(p:Profile):number {return 4+p.bagLevel}
export function moduleUsage(ids:ModuleId[]):number {return [...new Set(ids)].reduce((n,id)=>n+(MODULES.find(m=>m.id===id)?.slots??0),0)}
export function canPay(p:Materials,cost:Materials):boolean {return p.alloy>=cost.alloy&&p.chips>=cost.chips&&p.cores>=cost.cores}
function pay(p:Profile,cost:Materials):Profile {return {...p,alloy:p.alloy-cost.alloy,chips:p.chips-cost.chips,cores:p.cores-cost.cores}}
export function toggleModule(p:Profile,id:ModuleId):Profile|null {
  if(!p.modules.includes(id))return null;
  const equipped=p.equippedModules.includes(id)?p.equippedModules.filter(m=>m!==id):[...p.equippedModules,id];
  return moduleUsage(equipped)>moduleCapacity(p)?null:{...p,equippedModules:equipped};
}
export function unlockModule(p:Profile,id:ModuleId):Profile|null {
  const item=MODULES.find(m=>m.id===id);if(!item||p.modules.includes(id)||!canPay(p,item.cost))return null;
  return {...pay(p,item.cost),modules:[...p.modules,id]};
}
export function moduleUpgradeCost(p:Profile,id:ModuleId):Materials {
  const level=p.moduleLevels[id]??0;const slots=MODULES.find(m=>m.id===id)?.slots??1;
  return {alloy:20*(level+1),chips:slots===1?level:level+1,cores:slots===3&&level===1?1:0};
}
export function upgradeModule(p:Profile,id:ModuleId):Profile|null {
  const level=p.moduleLevels[id]??0,cost=moduleUpgradeCost(p,id);
  if(!p.modules.includes(id)||level>=2||!canPay(p,cost))return null;
  return {...pay(p,cost),moduleLevels:{...p.moduleLevels,[id]:level+1}};
}
export function backpackCost(p:Profile):Materials {return {alloy:45*(p.bagLevel+1),chips:2*(p.bagLevel+1),cores:p.bagLevel===1?1:0}}
export function expandBackpack(p:Profile):Profile|null {
  const cost=backpackCost(p);return p.bagLevel>=2||!canPay(p,cost)?null:{...pay(p,cost),bagLevel:p.bagLevel+1};
}
export function getRecipe(id:RecipeId):Recipe {return RECIPES.find(x=>x.id===id)!}
export function getRecipeState(p:Profile,id:RecipeId) {
  const r=getRecipe(id);const level=id==='health'?p.healthLevel:id==='magnet'?p.magnetLevel:0;
  const owned=id==='scatter'||id==='drone'?p.weapons.includes(id):id==='engineer'?p.characters.includes('engineer'):id==='trail'?p.trail:level>0;
  const maxed=r.maxLevel?level>=r.maxLevel:owned;
  const cost={...r.cost,alloy:r.cost.alloy*(r.maxLevel?level+1:1)};
  return {owned,level,maxed,canAfford:!maxed&&p.alloy>=cost.alloy&&p.chips>=cost.chips&&p.cores>=cost.cores,cost};
}
export function getTrackedGoal(p:Profile):TrackedGoal {
  if(p.tracked==='bag'){
    const cost=backpackCost(p),complete=p.bagLevel>=2;
    return {id:'bag',title:complete?'六格战术背包':`扩容至 ${moduleCapacity(p)+1} 格`,description:'多一个模块位置，让防护、穿甲和搜集能力组成新的出战搭配。',cost,complete,canAfford:!complete&&canPay(p,cost),kind:'bag'};
  }
  if(p.tracked.startsWith('module:')){
    const id=p.tracked.slice(7) as ModuleId,item=MODULES.find(m=>m.id===id);
    if(item){const complete=p.modules.includes(id);return {id:p.tracked,title:item.name,description:item.description,cost:item.cost,complete,canAfford:!complete&&canPay(p,item.cost),kind:'module'};}
  }
  const item=RECIPES.find(r=>r.id===p.tracked)||RECIPES[2],state=getRecipeState(p,item.id);
  return {id:item.id,title:item.title,description:item.description,cost:state.cost,complete:state.maxed,canAfford:state.canAfford,kind:'recipe'};
}
function validTrack(id:unknown):id is TrackId {return typeof id==='string'&&(id==='bag'||RECIPES.some(r=>r.id===id)||MODULES.some(m=>`module:${m.id}`===id));}
export function purchase(p:Profile,id:RecipeId):Profile|null {
  const s=getRecipeState(p,id);if(!s.canAfford)return null;
  const next:Profile={...p,alloy:p.alloy-s.cost.alloy,chips:p.chips-s.cost.chips,cores:p.cores-s.cost.cores};
  if(id==='health')next.healthLevel++;
  if(id==='magnet')next.magnetLevel++;
  if(id==='scatter'||id==='drone'){next.weapons=[...p.weapons,id];next.selectedWeapon=id}
  if(id==='engineer'){next.characters=[...p.characters,'engineer'];next.selectedCharacter='engineer'}
  if(id==='trail')next.trail=true;
  if(next.tracked===id&&getRecipeState(next,id).maxed){
    next.tracked=(['scatter','drone','engineer','trail','health','magnet'] as RecipeId[]).find(target=>!getRecipeState(next,target).maxed)??id;
  }
  return next;
}
export function loadProfile():Profile {
  try {const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(!raw)return initialProfile();
    const base=initialProfile();const num=(v:unknown,max=999999)=>typeof v==='number'&&Number.isFinite(v)?Math.max(0,Math.min(max,Math.floor(v))):0;
    const weapons:WeaponId[]=['pulse',...(['scatter','drone'] as WeaponId[]).filter(x=>Array.isArray(raw.weapons)&&raw.weapons.includes(x))];
    const characters:CharacterId[]=Array.isArray(raw.characters)&&raw.characters.includes('engineer')?['gunner','engineer']:['gunner'];
    const bagLevel=num(raw.bagLevel,2);
    const modules=MODULES.filter(m=>m.rarity==='green'||Array.isArray(raw.modules)&&raw.modules.includes(m.id)).map(m=>m.id);
    const equippedModules:ModuleId[]=[];
    const requested=Array.isArray(raw.equippedModules)?raw.equippedModules:base.equippedModules;
    for(const id of requested)if(modules.includes(id)&&!equippedModules.includes(id)&&moduleUsage([...equippedModules,id])<=4+bagLevel)equippedModules.push(id);
    const moduleLevels:Partial<Record<ModuleId,number>>={};for(const id of modules)moduleLevels[id]=num(raw.moduleLevels?.[id],2);
    return {...base,alloy:num(raw.alloy),chips:num(raw.chips),cores:num(raw.cores),healthLevel:num(raw.healthLevel,3),magnetLevel:num(raw.magnetLevel,3),weapons,characters,trail:raw.trail===true,
      bagLevel,modules,equippedModules,moduleLevels,
      selectedWeapon:weapons.includes(raw.selectedWeapon)?raw.selectedWeapon:'pulse',selectedCharacter:characters.includes(raw.selectedCharacter)?raw.selectedCharacter:'gunner',tracked:validTrack(raw.tracked)?raw.tracked:'scatter',
      stats:{runs:num(raw.stats?.runs),extracts:num(raw.stats?.extracts),bossKills:num(raw.stats?.bossKills),kills:num(raw.stats?.kills)}};
  } catch {return initialProfile()}
}
