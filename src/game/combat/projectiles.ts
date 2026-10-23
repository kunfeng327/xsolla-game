import { palette } from '../../config/palette';
import { distance } from '../../shared/math';
import type { GameSession } from '../core/GameSession';
import { lineBlocked } from '../world/chunks';

export function updateProjectiles(this: GameSession, dt: number): void {
  for (const b of this.bullets) {
    const before = { x: b.x, y: b.y };
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (lineBlocked(before, b, this.obstacles, b.r)) {
      b.life = 0;
      this.burst(b.x, b.y, b.color, 2, 30);
      continue;
    }
    if (b.hostile) {
      if (distance(b, this.player) < b.r + 15) {
        this.hurt(b.damage, 'bullet', '敌方弹丸');
        b.life = 0;
      }
    } else
      for (const e of this.enemies) {
        if (e.hp <= 0 || b.life <= 0 || b.hitIds.has(e.id) || distance(b, e) > b.r + e.r) continue;
        b.hitIds.add(e.id);
        this.hitEnemy(e, b.damage);
        if (this.chain && this.chainCooldown <= 0) {
          this.chainCooldown = 0.22;
          const others = this.enemies
            .filter(
              (q) =>
                q.id !== e.id &&
                q.hp > 0 &&
                distance(q, e) < 155 &&
                !lineBlocked(e, q, this.obstacles),
            )
            .slice(0, 2);
          for (const q of others) {
            this.hitEnemy(q, b.damage * 0.55);
            this.burst(q.x, q.y, palette.blue, 8, 90);
          }
        }
        b.hits--;
        if (b.hits <= 0) b.life = 0;
      }
  }
  this.bullets = this.bullets
    .filter((b) => b.life > 0 && distance(b, this.player) < 1400)
    .slice(-260);
  this.enemies = this.enemies.filter((e) => e.hp > 0);
  for (const w of this.warnings) {
    w.timer -= dt;
    if (w.timer <= 0) {
      if (distance(w, this.player) < w.r + 12)
        this.hurt(w.damage, 'explosion', this.bossActive ? '守卫地面轰炸' : '投掷怪爆炸');
      this.burst(w.x, w.y, w.color, 25, 160);
    }
  }
  this.warnings = this.warnings.filter((w) => w.timer > 0).slice(-36);
}
