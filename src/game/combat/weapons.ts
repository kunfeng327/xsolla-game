import { palette } from '../../config/palette';
import { distance, TAU } from '../../shared/math';
import type { GameSession } from '../core/GameSession';
import type { Enemy } from '../types';
import { lineBlocked } from '../world/chunks';

export function shoot(this: GameSession): void {
  const priority = (e: Enemy) => distance(e, this.player) * (e.type === 'boss' ? 0.65 : 1);
  const target = this.enemies
    .filter(
      (e) =>
        e.hp > 0 &&
        e.mode !== 'telegraph' &&
        e.mode !== 'emerge' &&
        distance(e, this.player) < 400 &&
        !lineBlocked(this.player, e, this.obstacles, 2),
    )
    .sort((a, b) => priority(a) - priority(b))[0];
  if (!target) {
    this.shotTimer = 0.09;
    return;
  }
  const a = Math.atan2(target.y - this.player.y, target.x - this.player.x);
  this.player.angle = a;
  this.muzzleTime = 0.075;
  this.audio.play(this.options.weapon);
  const weapon = this.options.weapon,
    spread = weapon === 'scatter' ? [-0.24, -0.12, 0, 0.12, 0.24] : [0],
    power = this.damage * (this.comboTime > 0 ? 1.15 : 1);
  for (const offset of spread) {
    const angle = a + offset;
    this.bullets.push({
      x: this.player.x + Math.cos(angle) * 22,
      y: this.player.y + Math.sin(angle) * 22,
      vx: Math.cos(angle) * 690,
      vy: Math.sin(angle) * 690,
      damage: (weapon === 'scatter' ? 10 : weapon === 'drone' ? 13 : 20) * power,
      life: weapon === 'scatter' ? 0.55 : 0.88,
      hostile: false,
      r: weapon === 'scatter' ? 3 : 4,
      color: weapon === 'scatter' ? palette.gold : palette.cyan,
      hits: this.hasModule('pierce') ? 2 : 1,
      hitIds: new Set(),
    });
  }
  this.shotTimer =
    (weapon === 'scatter' ? 0.62 : weapon === 'drone' ? 0.49 : 0.37) /
    (this.attackSpeed * (this.supplyTimers.overcharge > 0 ? 1.4 : 1));
  this.burst(
    this.player.x + Math.cos(a) * 25,
    this.player.y + Math.sin(a) * 25,
    palette.cyan,
    3,
    55,
  );
}

export function updateDrones(this: GameSession, dt: number): void {
  if (this.options.weapon !== 'drone' && this.options.character !== 'engineer') return;
  this.droneTimer -= dt;
  if (this.droneTimer > 0) return;
  this.droneTimer = 0.24 / this.attackSpeed;
  const count =
    (this.options.weapon === 'drone' ? 3 : 0) + (this.options.character === 'engineer' ? 1 : 0);
  for (let j = 0; j < count; j++) {
    const a = this.elapsed * 2.1 + (j / count) * TAU,
      pos = { x: this.player.x + Math.cos(a) * 78, y: this.player.y + Math.sin(a) * 78 };
    if (lineBlocked(this.player, pos, this.obstacles)) continue;
    for (const e of this.enemies)
      if (e.hp > 0 && distance(e, pos) < e.r + 22 && !lineBlocked(pos, e, this.obstacles))
        this.hitEnemy(e, 14 * this.damage);
  }
}

export function hostileBullet(
  this: GameSession,
  e: Enemy,
  a: number,
  v: number,
  damage: number,
  r = 5,
): void {
  this.bullets.push({
    x: e.x + Math.cos(a) * (e.r + 8),
    y: e.y + Math.sin(a) * (e.r + 8),
    vx: Math.cos(a) * v,
    vy: Math.sin(a) * v,
    damage,
    life: 5,
    hostile: true,
    r,
    color: palette.red,
    hits: 1,
    hitIds: new Set(),
  });
}

export function updateWeapons(this: GameSession, dt: number): void {
  this.shotTimer -= dt;
  if (this.shotTimer <= 0) this.shoot();
  this.updateDrones(dt);
}
