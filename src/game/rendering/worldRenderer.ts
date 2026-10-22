import { palette } from '../../config/palette';
import { TAU } from '../../shared/math';
import type { GameSession } from '../core/GameSession';
import type { V } from '../types';
import type { Site } from '../world/chunks';
import { CHUNK_SIZE, worldHash } from '../world/chunks';

export function drawFloor(this: GameSession, cam: V): void {
  const c = this.ctx;
  for (const chunk of this.chunks.values()) {
    const x = chunk.cx * CHUNK_SIZE - 360,
      y = chunk.cy * CHUNK_SIZE - 360;
    c.fillStyle = ['#121e28', '#17212a', '#14222a', '#1b232b', '#16222a', '#1d202c'][chunk.variant];
    c.fillRect(x, y, CHUNK_SIZE, CHUNK_SIZE);
    c.fillStyle = '#a0cbc804';
    c.fillRect(chunk.cx * CHUNK_SIZE - 35, y, 70, CHUNK_SIZE);
    c.fillRect(x, chunk.cy * CHUNK_SIZE - 35, CHUNK_SIZE, 70);
    c.strokeStyle = '#49707a19';
    c.lineWidth = 1;
    c.setLineDash([8, 15]);
    c.strokeRect(x + 12, y + 12, CHUNK_SIZE - 24, CHUNK_SIZE - 24);
    c.setLineDash([]);
    this.label(
      chunk.title + ' / ' + chunk.cx + ',' + chunk.cy,
      chunk.cx * CHUNK_SIZE,
      y + 45,
      '#68808b',
      14,
    );
    const h = worldHash(chunk.cx, chunk.cy, this.seed);
    for (let i = 0; i < 9; i++) {
      const px = x + 45 + ((h >>> (i * 2)) % 620),
        py = y + 65 + ((h >>> i) % 590);
      c.fillStyle = '#8197a016';
      c.fillRect(px, py, 4 + (i % 4), 3);
    }
  }
  c.strokeStyle = '#7a969710';
  c.lineWidth = 1;
  for (let x = Math.floor(cam.x / 80) * 80; x < cam.x + this.width + 80; x += 80) {
    c.beginPath();
    c.moveTo(x, cam.y);
    c.lineTo(x, cam.y + this.height);
    c.stroke();
  }
  for (let y = Math.floor(cam.y / 80) * 80; y < cam.y + this.height + 80; y += 80) {
    c.beginPath();
    c.moveTo(cam.x, y);
    c.lineTo(cam.x + this.width, y);
    c.stroke();
  }
  for (const o of this.obstacles) {
    c.fillStyle = '#03090c77';
    c.fillRect(o.x + 8, o.y + 12, o.w, o.h);
    c.fillStyle = o.kind === 'rock' ? '#34454e' : '#354b58';
    c.fillRect(o.x, o.y, o.w, o.h);
    c.fillStyle = '#526976';
    c.fillRect(o.x, o.y, o.w, 7);
    c.strokeStyle = '#78939b66';
    c.lineWidth = 1;
    c.strokeRect(o.x, o.y, o.w, o.h);
    c.strokeStyle = '#172b35';
    c.beginPath();
    c.moveTo(o.x + 12, o.y + 13);
    c.lineTo(o.x + o.w - 12, o.y + o.h - 13);
    c.stroke();
    if (this.sprites.get('crate')?.naturalWidth) {
      const size = Math.min(58, o.w - 8, o.h - 8);
      this.drawSprite(
        o.kind === 'rock' ? 'barrel' : 'crate',
        o.x + o.w / 2,
        o.y + o.h / 2,
        size,
        0,
      );
    }
    if (o.kind === 'wall') {
      c.fillStyle = '#d6b27355';
      for (let x = o.x + 10; x < o.x + o.w - 10; x += 22) c.fillRect(x, o.y + o.h - 6, 10, 3);
    }
  }
}

export function drawSite(this: GameSession, site: Site): void {
  const c = this.ctx;
  if (site.kind === 'extract') {
    const active = this.activeExtraction?.id === site.id;
    c.fillStyle = active ? '#7bf4e715' : '#7bf4e709';
    this.polygon(site.x, site.y, 90, 6, Math.PI / 6);
    c.fill();
    c.strokeStyle = active ? palette.cyan : '#4d8d87';
    c.lineWidth = 2;
    c.setLineDash([9, 7]);
    c.beginPath();
    c.arc(site.x, site.y, 85, 0, TAU);
    c.stroke();
    c.setLineDash([]);
    c.fillStyle = '#284c4b';
    c.fillRect(site.x - 19, site.y - 19, 38, 38);
    this.label('↑', site.x, site.y + 10, palette.cyan, 31);
    this.label(
      active
        ? '接应 ' + Math.max(0, Math.ceil((1 - this.extractionProgress) * 10)) + ' 秒'
        : site.title,
      site.x,
      site.y + 112,
      palette.cyan,
      14,
    );
    if (active) {
      c.strokeStyle = palette.cyan;
      c.lineWidth = 6;
      c.beginPath();
      c.arc(site.x, site.y, 92, -Math.PI / 2, -Math.PI / 2 + this.extractionProgress * TAU);
      c.stroke();
    }
    return;
  }
  if (site.kind === 'terminal') {
    const used = this.usedTerminals.has(site.id),
      color = used ? '#56606e' : palette.purple;
    c.save();
    c.translate(site.x, site.y);
    this.polygon(0, 0, 28, 6, Math.PI / 6);
    c.fillStyle = '#382e4a';
    c.fill();
    c.strokeStyle = color;
    c.lineWidth = 2;
    c.stroke();
    c.fillStyle = color;
    c.fillRect(-9, -12, 18, 22);
    c.fillStyle = '#252035';
    c.fillRect(-5, -8, 10, 8);
    this.label(used ? '已使用' : '契约 · 10碎片', 0, -43, color, 14);
    c.restore();
    return;
  }
  const state = this.eventStates.get(site.id),
    done = state?.status === 'done',
    active = state?.status === 'active',
    color = done ? '#5a727d' : active ? palette.red : site.rare ? palette.blue : palette.gold;
  c.save();
  c.translate(site.x, site.y);
  c.fillStyle = '#050d1344';
  c.beginPath();
  c.ellipse(0, 20, 42, 14, 0, 0, TAU);
  c.fill();
  c.fillStyle = done ? '#23313b' : '#30424c';
  c.fillRect(-32, -23, 64, 44);
  c.strokeStyle = color;
  c.lineWidth = 2;
  c.strokeRect(-32, -23, 64, 44);
  c.fillStyle = color;
  c.fillRect(-6, -8, 12, 13);
  c.strokeStyle = '#10212a';
  c.beginPath();
  c.moveTo(-30, -7);
  c.lineTo(30, -7);
  c.stroke();
  if (this.sprites.get('chest')?.naturalWidth) {
    c.fillStyle = done ? '#17242c' : '#23333b';
    c.fillRect(-33, -24, 66, 47);
    c.globalAlpha = done ? 0.45 : 1;
    this.drawSprite('chest', 0, 0, 76, 0);
    c.globalAlpha = 1;
    if (done) {
      c.strokeStyle = '#94c5a9';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(-9, 0);
      c.lineTo(-2, 7);
      c.lineTo(12, -8);
      c.stroke();
    }
  }
  if (!done) {
    c.globalAlpha = 0.2 + Math.sin(this.visualTime * 3) * 0.1;
    c.beginPath();
    c.arc(0, 0, 46, 0, TAU);
    c.strokeStyle = color;
    c.stroke();
    c.globalAlpha = 1;
  }
  this.label(done ? '已搜集' : active ? '清理守卫' : site.title, 0, -45, color, 14);
  if (active) {
    const n = state!.guards.filter((id) =>
      this.enemies.some((e) => e.id === id && e.hp > 0),
    ).length;
    this.label('剩余守卫 ' + n, 0, 47, palette.red, 13);
  }
  c.restore();
}

export function drawBossSite(this: GameSession): void {
  if (!this.bossSite || this.bossKilled) return;
  const c = this.ctx,
    p = this.bossSite;
  c.strokeStyle = this.bossActive ? '#bf94ff77' : '#bf94ff33';
  c.lineWidth = 3;
  c.setLineDash([15, 12]);
  c.beginPath();
  c.arc(p.x, p.y, 570, 0, TAU);
  c.stroke();
  c.setLineDash([]);
  c.fillStyle = '#bf94ff06';
  c.fill();
  if (!this.bossActive) {
    this.polygon(p.x, p.y, 58, 6, this.visualTime * 0.1);
    c.strokeStyle = palette.purple;
    c.lineWidth = 2;
    c.stroke();
    this.label('核心守卫据点', p.x, p.y - 85, palette.purple, 18);
    this.label('靠近后 E 挑战 · 奖励异常核心', p.x, p.y + 90, palette.purple, 13);
  }
}
