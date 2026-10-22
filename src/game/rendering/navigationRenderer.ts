import { palette } from '../../config/palette';
import { distance, TAU } from '../../shared/math';
import type { GameSession } from '../core/GameSession';
import type { V } from '../types';

export function drawNavigation(this: GameSession, cam: V): void {
  const c = this.ctx,
    target = this.targetInfo(),
    extract = this.nearestExtraction(),
    markers: { point: V; name: string; color: string }[] = [
      { point: extract, name: '撤离', color: palette.cyan },
    ];
  if (target && distance(target.point, extract) > 10) markers.push(target);
  const terminal = this.sites
    .filter((s) => s.kind === 'terminal' && !this.usedTerminals.has(s.id))
    .sort((a, b) => distance(a, this.player) - distance(b, this.player))[0];
  if (terminal && this.fragments >= 10 && this.contracts.length < 2)
    markers.push({ point: terminal, name: '契约', color: palette.purple });
  for (const marker of markers) {
    const sx = marker.point.x - cam.x,
      sy = marker.point.y - cam.y;
    if (sx > 70 && sx < this.width - 70 && sy > 200 && sy < this.height - 150) continue;
    const a = Math.atan2(marker.point.y - this.player.y, marker.point.x - this.player.x),
      rx = Math.max(70, this.width / 2 - 70),
      ry = Math.max(60, this.height / 2 - 155),
      scale = Math.min(
        rx / Math.max(0.001, Math.abs(Math.cos(a))),
        ry / Math.max(0.001, Math.abs(Math.sin(a))),
      ),
      x = this.width / 2 + Math.cos(a) * scale,
      y = this.height / 2 + Math.sin(a) * scale;
    c.save();
    c.translate(x, y);
    c.rotate(a);
    this.polygon(0, 0, 9, 3);
    c.fillStyle = marker.color;
    c.fill();
    c.restore();
    this.label(
      marker.name + ' ' + Math.round(distance(marker.point, this.player) / 10) + 'm',
      x,
      y + 25,
      marker.color,
      13,
    );
  }
}

export function drawMinimap(this: GameSession): void {
  if (this.width < 600) return;
  const c = this.ctx,
    w = 158,
    h = 126,
    x = this.width - w - 22,
    y = this.height - h - 75,
    scale = 0.105;
  c.fillStyle = '#07101ae8';
  c.fillRect(x, y, w, h);
  c.strokeStyle = '#506b7766';
  c.lineWidth = 1;
  c.strokeRect(x, y, w, h);
  this.label('区域雷达 · ∞', x + w / 2, y + 16, '#8faab4', 10);
  c.save();
  c.beginPath();
  c.rect(x + 5, y + 24, w - 10, h - 29);
  c.clip();
  const px = (p: V) => ({
    x: x + w / 2 + (p.x - this.player.x) * scale,
    y: y + 74 + (p.y - this.player.y) * scale,
  });
  for (const o of this.obstacles) {
    const p = px(o);
    c.fillStyle = '#536a7566';
    c.fillRect(p.x, p.y, o.w * scale, o.h * scale);
  }
  for (const site of this.sites) {
    const p = px(site);
    c.fillStyle =
      site.kind === 'extract'
        ? palette.cyan
        : site.kind === 'terminal'
          ? palette.purple
          : this.eventStates.get(site.id)?.status === 'done'
            ? '#455963'
            : palette.gold;
    c.fillRect(p.x - 2.5, p.y - 2.5, 5, 5);
  }
  if (this.bossSite && !this.bossKilled) {
    const p = px(this.bossSite);
    c.strokeStyle = palette.purple;
    c.beginPath();
    c.arc(p.x, p.y, 6, 0, TAU);
    c.stroke();
  }
  c.fillStyle = '#fff';
  c.beginPath();
  c.arc(x + w / 2, y + 74, 3, 0, TAU);
  c.fill();
  c.restore();
}
