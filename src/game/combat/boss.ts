import { palette } from '../../config/palette';
import { distance } from '../../shared/math';
import type { GameSession } from '../core/GameSession';
import type { Enemy } from '../types';

export function updateBoss(this: GameSession, e: Enemy, dt: number): void {
  if (!this.bossSite) return;
  if (distance(this.player, this.bossSite) > 570) {
    this.enemies = this.enemies.filter((q) => q.id !== e.id);
    this.bossActive = false;
    this.bullets = this.bullets.filter((b) => !b.hostile);
    this.warnings = [];
    this.notify('已退出守卫据点，守卫恢复；可再次挑战', palette.gold);
    return;
  }
  const d = distance(e, this.player);
  if (d < e.r + 15) this.hurt(18, 'contact', '核心守卫撞击');
  e.timer -= dt;
  if (e.mode === 'windup-fan' && e.timer <= 0) {
    const count = e.hp < e.max * 0.5 ? 9 : 7;
    for (let i = 0; i < count; i++)
      this.hostileBullet(e, e.aim + (i - (count - 1) / 2) * 0.22, 185, 13, 6);
    e.mode = 'recover';
    e.timer = 1.3;
    return;
  }
  if (e.mode === 'windup-charge' && e.timer <= 0) {
    e.mode = 'charge';
    e.timer = 0.65;
    return;
  }
  if (e.mode === 'charge') {
    this.moveEntity(e, Math.cos(e.aim) * 500 * dt, Math.sin(e.aim) * 500 * dt, e.r);
    if (distance(e, this.bossSite) > 330 || e.timer <= 0) {
      e.mode = 'recover';
      e.timer = 1.8;
    }
    return;
  }
  if (e.mode === 'windup-bomb' && e.timer <= 0) {
    for (const p of [
      { x: this.player.x, y: this.player.y },
      { x: this.player.x + 115, y: this.player.y - 60 },
      { x: this.player.x - 100, y: this.player.y + 65 },
    ])
      this.warnings.push({ ...p, r: 68, timer: 1.45, max: 1.45, damage: 23, color: palette.red });
    e.mode = 'recover';
    e.timer = 1.9;
    return;
  }
  if (e.mode.startsWith('windup')) return;
  if (e.mode === 'recover') {
    if (e.timer <= 0) {
      e.mode = 'idle';
      e.timer = 0.45;
    }
    return;
  }
  if (d > 200 && distance(e, this.bossSite) < 260) this.route(e, this.player, dt);
  if (e.timer <= 0) {
    const index = e.pattern++ % 3;
    e.aim = Math.atan2(this.player.y - e.y, this.player.x - e.x);
    e.mode = index === 0 ? 'windup-fan' : index === 1 ? 'windup-charge' : 'windup-bomb';
    e.timer = index === 0 ? 0.85 : index === 1 ? 1.05 : 0.65;
  }
}

export function spawnBoss(this: GameSession): void {
  if (!this.bossSite || this.bossKilled || this.bossActive) return;
  this.enemies = this.enemies.filter((e) => e.guard || distance(e, this.bossSite!) > 650);
  this.bullets = this.bullets.filter((b) => !b.hostile);
  this.warnings = [];
  const boss = this.spawnEnemy('boss', { x: this.bossSite.x, y: this.bossSite.y - 120 });
  if (!boss) {
    this.notify('请先清理附近守卫，再启动核心据点', palette.gold);
    return;
  }
  this.bossActive = true;
  this.pending = [];
  this.notify('核心守卫已激活：观察预警与后摇，离开据点可中止挑战', palette.purple);
  this.emitHud();
}
