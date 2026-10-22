import type { ContractChoice, UpgradeChoice } from '../game/types';
export const UPGRADES: UpgradeChoice[] = [
  { id: 'damage', name: '超载弹头', description: '武器伤害 +20%，最高 3.8 倍', kind: '火力' },
  { id: 'rapid', name: '急速回路', description: '自动攻击速度 +15%，最高 2.8 倍', kind: '火力' },
  { id: 'shield', name: '护盾充能', description: '立即补充 28 点护盾，上限 100', kind: '生存' },
  { id: 'heal', name: '纳米修复', description: '立即恢复 35 点生命', kind: '生存' },
  {
    id: 'speed',
    name: '推进强化',
    description: '移动速度提高，永久增幅上限 25%，缩短冲刺冷却',
    kind: '机动',
  },
  { id: 'magnet', name: '引力吸附', description: '拾取半径 +20%', kind: '搜集' },
];
export const CONTRACTS: ContractChoice[] = [
  {
    id: 'stable',
    name: '稳定协议',
    description: '可靠补强当前装备，本局生效。',
    odds: '100% 正面',
    reward: '武器伤害 +8%',
    risk: '无负面效果',
  },
  {
    id: 'overload',
    name: '超载协议',
    description: '承担风险，争取更强火力。本局生效。',
    odds: '60% 正面 / 40% 负面',
    reward: '武器伤害 +28%',
    risk: '失败：受到的伤害 +12%',
  },
  {
    id: 'extreme',
    name: '极限协议',
    description: '追求改变打法的大奖。本局生效。',
    odds: '15% 大奖 / 85% 负面',
    reward: '伤害 +20%，子弹命中触发连锁电击',
    risk: '失败：受到的伤害 +25%',
  },
];
