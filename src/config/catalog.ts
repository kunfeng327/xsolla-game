import type { CharacterId, Recipe, TacticalModule, WeaponId } from '../profile/types';
export const MODULES: TacticalModule[] = [
  {
    id: 'magnet',
    name: '回收磁环',
    description: '拾取范围 +25%，每次强化再增加 10%。',
    slots: 1,
    rarity: 'green',
    cost: { alloy: 0, chips: 0, cores: 0 },
  },
  {
    id: 'insulation',
    name: '爆破隔热',
    description: '爆炸伤害降低 30%，每次强化再降低 10%。',
    slots: 1,
    rarity: 'green',
    cost: { alloy: 0, chips: 0, cores: 0 },
  },
  {
    id: 'fortress',
    name: '固若金汤',
    description: '弹丸伤害降低 25%，每次强化再降低 5%。',
    slots: 2,
    rarity: 'purple',
    cost: { alloy: 35, chips: 2, cores: 0 },
  },
  {
    id: 'shockwave',
    name: '冲刺震荡',
    description: '冲刺结束击退附近敌人，强化扩大作用范围。',
    slots: 2,
    rarity: 'purple',
    cost: { alloy: 35, chips: 2, cores: 0 },
  },
  {
    id: 'pierce',
    name: '穿甲核心',
    description: '子弹额外穿透 1 个敌人，强化每级伤害 +8%。',
    slots: 3,
    rarity: 'gold',
    cost: { alloy: 60, chips: 3, cores: 1 },
  },
  {
    id: 'rescue',
    name: '应急协议',
    description: '每局一次致命保护，恢复 30% 生命；强化每级 +10%。',
    slots: 3,
    rarity: 'gold',
    cost: { alloy: 60, chips: 2, cores: 1 },
  },
];

export const WEAPON_NAMES: Record<WeaponId, string> = {
  pulse: '脉冲步枪',
  scatter: '散射枪',
  drone: '环绕无人机',
};

export const CHARACTER_NAMES: Record<CharacterId, string> = {
  gunner: '先锋枪手',
  engineer: '无人机工程师',
};

export const RECIPES: Recipe[] = [
  {
    id: 'health',
    title: '生命强化',
    description: '每级增加 10 点初始生命，最多三级。',
    icon: 'heart',
    cost: { alloy: 30, chips: 0, cores: 0 },
    maxLevel: 3,
  },
  {
    id: 'magnet',
    title: '磁力拾取',
    description: '每级扩大 20% 物资与经验拾取范围，最多三级。',
    icon: 'magnet',
    cost: { alloy: 25, chips: 0, cores: 0 },
    maxLevel: 3,
  },
  {
    id: 'scatter',
    title: '散射枪',
    description: '永久解锁：扇形齐射，近距离清理包围。',
    icon: 'crosshair',
    cost: { alloy: 40, chips: 2, cores: 0 },
  },
  {
    id: 'drone',
    title: '环绕无人机',
    description: '永久解锁：无人机环绕攻击，用走位收割敌群。',
    icon: 'orbit',
    cost: { alloy: 60, chips: 4, cores: 0 },
  },
  {
    id: 'engineer',
    title: '无人机工程师',
    description: '永久解锁：额外一架环绕无人机，20 点护盾起步。',
    icon: 'bot',
    cost: { alloy: 80, chips: 0, cores: 3 },
  },
  {
    id: 'trail',
    title: '星核行者尾迹',
    description: '永久解锁：所有角色装配紫色星核粒子尾迹。',
    icon: 'sparkles',
    cost: { alloy: 40, chips: 0, cores: 2 },
  },
];
