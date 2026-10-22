import { palette } from '../../config/palette';
import { clamp, distance } from '../../shared/math';
import type { GameSession } from '../core/GameSession';

export function movementMultiplier(this: GameSession): number {
  return this.moveSpeed * (this.supplyTimers.speed > 0 ? 1.25 : 1) * (this.comboTime > 0 ? 1.1 : 1);
}

export function dash(this: GameSession): void {
  if (
    !this.running ||
    this.paused ||
    this.upgrading ||
    this.contracting ||
    this.player.dashCooldown > 0
  )
    return;
  this.audio.play('dash');
  this.player.dashTime = 0.18;
  this.player.invulnerable = 0.3;
  this.player.dashCooldown = 3.3 / Math.sqrt(this.moveSpeed);
  this.burst(this.player.x, this.player.y, palette.cyan, 12, 110);
}

export function hasModule(this: GameSession, id: string): boolean {
  return this.options.modules?.includes(id) || false;
}

export function moduleLevel(this: GameSession, id: string): number {
  return clamp(this.options.moduleLevels?.[id] || 0, 0, 2);
}

export function updatePlayerTimers(this: GameSession, dt: number): void {
  this.player.invulnerable = Math.max(0, this.player.invulnerable - dt);
  this.player.dashCooldown = Math.max(0, this.player.dashCooldown - dt);
  const wasDashing = this.player.dashTime > 0;
  this.player.dashTime = Math.max(0, this.player.dashTime - dt);
  if (wasDashing && this.player.dashTime === 0 && this.hasModule('shockwave')) {
    const radius = 100 + this.moduleLevel('shockwave') * 25;
    this.burst(this.player.x, this.player.y, palette.cyan, 28, radius);
    for (const e of this.enemies)
      if (e.type !== 'boss' && distance(e, this.player) < radius) {
        const d = Math.max(1, distance(e, this.player));
        this.moveEntity(e, ((e.x - this.player.x) / d) * 70, ((e.y - this.player.y) / d) * 70, e.r);
        this.hitEnemy(e, 8);
      }
  }
}

export function updateMovement(this: GameSession, dt: number): void {
  let mx =
    this.input.x +
    (this.keys.has('d') || this.keys.has('arrowright') ? 1 : 0) -
    (this.keys.has('a') || this.keys.has('arrowleft') ? 1 : 0);
  let my =
    this.input.y +
    (this.keys.has('s') || this.keys.has('arrowdown') ? 1 : 0) -
    (this.keys.has('w') || this.keys.has('arrowup') ? 1 : 0);
  const ml = Math.hypot(mx, my);
  if (ml > 0) {
    mx /= Math.max(1, ml);
    my /= Math.max(1, ml);
    this.player.dx = mx;
    this.player.dy = my;
  }
  const dash = this.player.dashTime > 0,
    v = 175 * this.movementMultiplier() * (dash ? 3.8 : 1),
    beforeMove = { x: this.player.x, y: this.player.y };
  this.moveEntity(
    this.player,
    (dash ? this.player.dx : mx) * v * dt,
    (dash ? this.player.dy : my) * v * dt,
    16,
  );
  this.velocity = {
    x: (this.player.x - beforeMove.x) / dt,
    y: (this.player.y - beforeMove.y) / dt,
  };
  this.refreshChunks();
  if (ml > 0.05 && (this.options.trail || dash) && Math.random() < dt * 35)
    this.particles.push({
      x: this.player.x,
      y: this.player.y,
      vx: -mx * 20,
      vy: -my * 20,
      life: 0.45,
      max: 0.45,
      color: this.options.trail ? palette.purple : palette.cyan,
      size: dash ? 6 : 3,
    });
}
