import {
  Crosshair,
  Heart,
  Package,
  Radio,
  ScanLine,
  Shield,
  ShieldCheck,
  Skull,
  Sparkles,
  Target,
  Wind,
} from 'lucide-react';
export type Goal = 'resource' | 'boss' | 'extract' | 'terminal';
export type Menu = 'pause' | 'settings' | 'effects' | null;
export const clock = (t: number) =>
  Math.floor(t / 60)
    .toString()
    .padStart(2, '0') +
  ':' +
  Math.floor(t % 60)
    .toString()
    .padStart(2, '0');
export const goals: { id: Goal; name: string; Icon: typeof Target }[] = [
  { id: 'resource', name: '资源', Icon: Package },
  { id: 'boss', name: 'Boss', Icon: Skull },
  { id: 'extract', name: '撤离', Icon: Radio },
  { id: 'terminal', name: '契约', Icon: Sparkles },
];
export const moduleIcons: Record<string, typeof Target> = {
  magnet: ScanLine,
  insulation: Shield,
  fortress: ShieldCheck,
  shockwave: Wind,
  pierce: Crosshair,
  rescue: Heart,
};
