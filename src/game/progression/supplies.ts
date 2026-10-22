import { palette } from '../../config/palette';
import { distance } from '../../shared/math';
import type { GameSession } from '../core/GameSession';

export function updatePickups(this: GameSession, dt: number): void {
  for (const p of this.pickups) {
    p.phase += dt;
    p.life -= dt;
    let d = distance(p, this.player);
    const supply = !['xp', 'fragment', 'core'].includes(p.type);
    if (d < (supply ? 38 : 70 * this.magnet)) {
      const v = Math.max(260, 550 - d);
      p.x += ((this.player.x - p.x) / Math.max(1, d)) * v * dt;
      p.y += ((this.player.y - p.y) / Math.max(1, d)) * v * dt;
      d = distance(p, this.player);
    }
    if (
      (p.type === 'heal' && this.player.hp >= this.player.maxHp) ||
      (p.type === 'shield' && this.player.shield >= 100)
    )
      continue;
    if (d >= 22) continue;
    this.audio.play('pickup');
    if (p.type === 'xp' && this.level < 12) {
      this.xp += p.amount;
      this.checkLevel();
    }
    if (p.type === 'fragment') this.fragments = Math.min(99, this.fragments + p.amount);
    if (p.type === 'core') {
      this.bag.cores += p.amount;
      this.notify('异常核心已拾取 · 成功撤离后可永久解锁模块', palette.purple);
    }
    if (p.type === 'heal') {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 30);
      this.float(this.player.x, this.player.y - 35, '生命 +30', palette.green);
    }
    if (p.type === 'shield') {
      this.player.shield = Math.min(100, this.player.shield + 28);
      this.float(this.player.x, this.player.y - 35, '护盾 +28', palette.blue);
    }
    if (p.type === 'overcharge') {
      this.supplyTimers.overcharge = 8;
      this.float(this.player.x, this.player.y - 35, '超载：攻速 +40% · 8秒', palette.gold);
    }
    if (p.type === 'speed') {
      this.supplyTimers.speed = 8;
      this.player.dashCooldown = Math.max(0, this.player.dashCooldown - 1);
      this.float(this.player.x, this.player.y - 35, '推进：移速 +25% · 8秒', palette.cyan);
    }
    if (p.id) this.consumedSupplies.add(p.id);
    p.amount = 0;
    this.burst(this.player.x, this.player.y, supply ? palette.cyan : palette.green, 5, 50);
  }
  const retained = this.pickups.filter((p) => p.amount > 0 && p.life > 0);
  this.pickups = [
    ...retained.filter((p) => p.type === 'core'),
    ...retained.filter((p) => p.type !== 'core' && distance(p, this.player) < 1700).slice(-239),
  ];
}

export function updateBuffTimers(this: GameSession, dt: number): void {
  this.shake = Math.max(0, this.shake - dt * 15);
  this.comboTime = Math.max(0, this.comboTime - dt);
  this.chainCooldown = Math.max(0, this.chainCooldown - dt);
  if (this.elapsed - this.lastKill > 4) this.combo = 0;
  this.supplyTimers.overcharge = Math.max(0, this.supplyTimers.overcharge - dt);
  this.supplyTimers.speed = Math.max(0, this.supplyTimers.speed - dt);
}
