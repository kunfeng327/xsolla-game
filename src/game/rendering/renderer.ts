import { palette } from '../../config/palette';

import { clamp, TAU } from '../../shared/math';

import type { GameSession } from '../core/GameSession';

export function camera(this: GameSession): { x: number; y: number } {
  return { x: this.player.x - this.width / 2, y: this.player.y - this.height / 2 };
}

export function polygon(
  this: GameSession,
  x: number,
  y: number,
  r: number,
  sides: number,
  angle = 0,
): void {
  const c = this.ctx;
  c.beginPath();
  for (let j = 0; j < sides; j++) {
    const a = angle + (j / sides) * TAU;
    j
      ? c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
      : c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  c.closePath();
}

export function label(
  this: GameSession,
  text: string,
  x: number,
  y: number,
  color = '#718397',
  size = 11,
): void {
  const c = this.ctx;
  c.font = '600 ' + size + 'px "Segoe UI", "Microsoft YaHei", sans-serif';
  c.fillStyle = color;
  c.textAlign = 'center';
  c.fillText(text, x, y);
}

export function draw(this: GameSession): void {
  const c = this.ctx;
  if (!c) return;
  c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  c.fillStyle = '#0c151d';
  c.fillRect(0, 0, this.width, this.height);
  const cam = this.camera();
  const shake = this.shakeEnabled ? this.shake : 0;
  c.save();
  c.translate(-cam.x + (Math.random() - 0.5) * shake, -cam.y + (Math.random() - 0.5) * shake);
  this.drawFloor(cam);
  for (const p of this.pending) {
    c.strokeStyle = p.noLoot ? palette.red : palette.gold;
    c.globalAlpha = 0.35 + Math.sin(this.visualTime * 9) * 0.2;
    c.setLineDash([5, 5]);
    c.beginPath();
    c.arc(p.x, p.y, 23, 0, TAU);
    c.stroke();
    c.setLineDash([]);
    c.globalAlpha = 1;
    this.label('增援', p.x, p.y - 32, p.noLoot ? palette.red : palette.gold, 12);
  }
  for (const d of this.deaths) {
    c.save();
    c.globalAlpha = d.life / d.max;
    const scale = 0.55 + (d.life / d.max) * 0.45;
    c.translate(d.x, d.y);
    c.rotate(d.angle);
    if (!this.drawSprite(d.kind, 0, 0, d.r * 3.1 * scale, 0)) {
      this.polygon(0, 0, d.r * scale, 5);
      c.fillStyle = palette.red;
      c.fill();
    }
    c.restore();
  }
  for (const site of this.sites) this.drawSite(site);
  if (this.bossSite) this.drawBossSite();
  for (const w of this.warnings) {
    c.fillStyle = 'rgba(250,124,134,' + (0.07 + 0.16 * (1 - w.timer / w.max)) + ')';
    c.beginPath();
    c.arc(w.x, w.y, w.r, 0, TAU);
    c.fill();
    c.strokeStyle = w.color;
    c.lineWidth = 2;
    c.setLineDash([7, 5]);
    c.stroke();
    c.setLineDash([]);
    c.beginPath();
    c.arc(w.x, w.y, w.r * (1 - w.timer / w.max), 0, TAU);
    c.stroke();
    this.label('!', w.x, w.y + 7, w.color, 24);
  }
  for (const p of this.pickups) this.drawPickup(p);
  for (const e of this.enemies) if (e.hp > 0) this.drawEnemy(e);
  for (const b of this.bullets) {
    c.strokeStyle = b.color;
    c.lineWidth = 3;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(b.x - b.vx * 0.016, b.y - b.vy * 0.016);
    c.lineTo(b.x, b.y);
    c.stroke();
    c.fillStyle = b.color;
    c.beginPath();
    c.arc(b.x, b.y, b.r, 0, TAU);
    c.fill();
  }
  this.drawPlayer();
  for (const p of this.particles) {
    c.globalAlpha = clamp(p.life / p.max, 0, 1);
    c.fillStyle = p.color;
    c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  c.globalAlpha = 1;
  for (const t of this.texts) {
    c.globalAlpha = Math.min(1, t.life * 2);
    c.shadowColor = '#000';
    c.shadowBlur = 5;
    this.label(t.text, t.x, t.y, t.color, t.size);
  }
  c.shadowBlur = 0;
  c.globalAlpha = 1;
  c.restore();
  this.drawNavigation(cam);
  this.drawMinimap();
  if (this.player.hp < this.player.maxHp * 0.28) {
    c.strokeStyle = 'rgba(250,90,100,' + (0.2 + Math.sin(this.visualTime * 5) * 0.1) + ')';
    c.lineWidth = 10;
    c.strokeRect(0, 0, this.width, this.height);
  }
}
