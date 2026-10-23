import { Cpu, Crosshair, Hexagon, Magnet, Radio, Shield, Sparkles, Zap } from 'lucide-react';
import type { Materials, ModuleId, Profile, RecipeId, WeaponId } from '../../profile/types';
export const materials = [
  { key: 'alloy', label: '合金', Icon: Hexagon },
  { key: 'chips', label: '芯片', Icon: Cpu },
  { key: 'cores', label: '核心', Icon: Sparkles },
] as const;

export const recipeIcons: Record<RecipeId, typeof Shield> = {
  health: Shield,
  magnet: Magnet,
  scatter: Zap,
  drone: Radio,
  engineer: Cpu,
  trail: Sparkles,
};

export const moduleIcons: Record<ModuleId, typeof Shield> = {
  magnet: Magnet,
  insulation: Shield,
  fortress: Hexagon,
  shockwave: Zap,
  pierce: Crosshair,
  rescue: Sparkles,
};

export const weaponInfo: {
  id: WeaponId;
  title: string;
  subtitle: string;
  Icon: typeof Crosshair;
}[] = [
  { id: 'pulse', title: '脉冲步枪', subtitle: '稳定精准的自动火力', Icon: Crosshair },
  { id: 'scatter', title: '散射枪', subtitle: '扇形齐射，清理近处包围', Icon: Zap },
  { id: 'drone', title: '环绕无人机', subtitle: '环绕攻击，用走位收割', Icon: Radio },
];

export function missing(p: Profile, cost: Materials) {
  const parts = materials
    .filter((m) => p[m.key] < cost[m.key])
    .map((m) => `${cost[m.key] - p[m.key]} ${m.label}`);
  return parts.length ? `还差 ${parts.join('、')}` : '材料已齐';
}

export function effect(id: ModuleId, level: number) {
  if (id === 'magnet') return `拾取范围 +${25 + level * 10}%`;
  if (id === 'insulation') return `爆炸减伤 ${30 + level * 10}%`;
  if (id === 'fortress') return `弹丸减伤 ${25 + level * 5}%`;
  if (id === 'shockwave') return `冲刺结束击退周围 ${100 + level * 25} 范围敌人`;
  if (id === 'pierce') return `额外穿透 1 个敌人${level ? `，伤害 +${level * 8}%` : ''}`;
  return `每局一次致命保护，恢复 ${30 + level * 10}% 生命`;
}
