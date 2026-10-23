import type { Point } from '../game/world/chunks';
export const TAU = Math.PI * 2;
export const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
