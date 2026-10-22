import { TAU } from '../../shared/math';
import type { GameSession } from '../core/GameSession';

export function updateEffects(this: GameSession, dt: number): void {
  for (const d of this.deaths) {
    d.life -= dt;
    d.x += Math.cos(d.angle) * dt * 45;
    d.y += Math.sin(d.angle) * dt * 45;
  }
  this.deaths = this.deaths.filter((d) => d.life > 0).slice(-24);
  for (const p of this.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.pow(0.2, dt);
    p.vy *= Math.pow(0.2, dt);
    p.life -= dt;
  }
  this.particles = this.particles.filter((p) => p.life > 0).slice(-450);
  for (const t of this.texts) {
    t.y -= dt * 16;
    t.life -= dt;
  }
  this.texts = this.texts.filter((t) => t.life > 0).slice(-25);
}

export function burst(
  this: GameSession,
  x: number,
  y: number,
  color: string,
  n = 10,
  speed = 100,
): void {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU,
      life = 0.25 + Math.random() * 0.35;
    this.particles.push({
      x,
      y,
      vx: Math.cos(a) * speed * Math.random(),
      vy: Math.sin(a) * speed * Math.random(),
      life,
      max: life,
      size: 1.5 + Math.random() * 3,
      color,
    });
  }
}

export function float(
  this: GameSession,
  x: number,
  y: number,
  text: string,
  color: string,
  life = 1.5,
  size = 14,
): void {
  this.texts.push({ x, y, text, color, life, max: life, size });
}

export function notify(this: GameSession, text: string, color: string): void {
  this.message = text;
  this.messageTime = 4.2; /* The React announcement is the single long-message surface. */
}
