export type WeaponId = 'pulse' | 'scatter' | 'drone';
export type CharacterId = 'gunner' | 'engineer';
export type RecipeId = 'health' | 'magnet' | 'scatter' | 'drone' | 'engineer' | 'trail';
export type Materials = { alloy:number; chips:number; cores:number };
export interface Profile extends Materials {
  healthLevel:number; magnetLevel:number; weapons:WeaponId[]; characters:CharacterId[]; trail:boolean;
  selectedWeapon:WeaponId; selectedCharacter:CharacterId; tracked:RecipeId;
  stats:{runs:number;extracts:number;bossKills:number;kills:number};
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
export function initialProfile():Profile { return {alloy:0,chips:0,cores:0,healthLevel:0,magnetLevel:0,weapons:['pulse'],characters:['gunner'],trail:false,selectedWeapon:'pulse',selectedCharacter:'gunner',tracked:'scatter',stats:{runs:0,extracts:0,bossKills:0,kills:0}} }
export function getRecipe(id:RecipeId):Recipe {return RECIPES.find(x=>x.id===id)!}
export function getRecipeState(p:Profile,id:RecipeId) {
  const r=getRecipe(id);const level=id==='health'?p.healthLevel:id==='magnet'?p.magnetLevel:0;
  const owned=id==='scatter'||id==='drone'?p.weapons.includes(id):id==='engineer'?p.characters.includes('engineer'):id==='trail'?p.trail:level>0;
  const maxed=r.maxLevel?level>=r.maxLevel:owned;
  const cost={...r.cost,alloy:r.cost.alloy*(r.maxLevel?level+1:1)};
  return {owned,level,maxed,canAfford:!maxed&&p.alloy>=cost.alloy&&p.chips>=cost.chips&&p.cores>=cost.cores,cost};
}
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
    return {...base,alloy:num(raw.alloy),chips:num(raw.chips),cores:num(raw.cores),healthLevel:num(raw.healthLevel,3),magnetLevel:num(raw.magnetLevel,3),weapons,characters,trail:raw.trail===true,
      selectedWeapon:weapons.includes(raw.selectedWeapon)?raw.selectedWeapon:'pulse',selectedCharacter:characters.includes(raw.selectedCharacter)?raw.selectedCharacter:'gunner',tracked:RECIPES.some(x=>x.id===raw.tracked)?raw.tracked:'scatter',
      stats:{runs:num(raw.stats?.runs),extracts:num(raw.stats?.extracts),bossKills:num(raw.stats?.bossKills),kills:num(raw.stats?.kills)}};
  } catch {return initialProfile()}
}
