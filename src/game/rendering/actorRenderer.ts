import { palette } from '../../config/palette';
import { distance, TAU } from '../../shared/math';
import type { GameSession } from '../core/GameSession';
import type { Enemy, Pickup, PickupKind } from '../types';
import { SPRITE_ANGLE } from './sprites';

export function drawPickup(this: GameSession, p: Pickup): void {
  const c = this.ctx,
    y = p.y + Math.sin(p.phase * 3) * 2,
    colors: Record<PickupKind, string> = {
      xp: palette.green,
      fragment: palette.purple,
      core: palette.purple,
      heal: palette.green,
      shield: palette.blue,
      overcharge: palette.gold,
      speed: palette.cyan,
    },
    color = colors[p.type];
  c.fillStyle = color;
  if (p.type === 'xp' || p.type === 'fragment') {
    this.polygon(p.x, y, p.type === 'xp' ? 4 : 5, 4, p.type === 'xp' ? 0 : Math.PI / 4);
    c.fill();
    return;
  }
  if (p.type === 'core') {
    c.shadowColor = color;
    c.shadowBlur = 20;
    this.polygon(p.x, y, 15, 6, this.visualTime);
    c.fill();
    c.shadowBlur = 0;
    this.label('异常核心', p.x, y - 29, color, 13);
    return;
  }
  c.fillStyle = '#142a35';
  c.fillRect(p.x - 12, y - 12, 24, 24);
  c.strokeStyle = color;
  c.lineWidth = 2;
  c.strokeRect(p.x - 12, y - 12, 24, 24);
  this.label(
    ({ heal: '+', shield: '◇', overcharge: 'ϟ', speed: '»' } as Record<string, string>)[p.type],
    p.x,
    y + 6,
    color,
    20,
  );
  if (distance(p, this.player) < 140)
    this.label(
      (
        { heal: '医疗包', shield: '护盾包', overcharge: '超载补给', speed: '推进补给' } as Record<
          string,
          string
        >
      )[p.type],
      p.x,
      y - 28,
      color,
      13,
    );
}

export function drawSprite(
  this: GameSession,
  key: string,
  x: number,
  y: number,
  size: number,
  angle: number,
  flash = false,
): boolean {
  const image = this.sprites.get(key);
  if (!image || !image.complete || !image.naturalWidth) return false;
  const c = this.ctx,
    w = image.naturalWidth,
    h = image.naturalHeight,
    ratio = size / Math.max(w, h);
  c.save();
  c.translate(x, y);
  c.rotate(angle + SPRITE_ANGLE);
  if (flash) c.filter = 'brightness(0) invert(1)';
  c.drawImage(image, (-w * ratio) / 2, (-h * ratio) / 2, w * ratio, h * ratio);
  c.restore();
  return true;
}

export function drawEnemy(this: GameSession, e: Enemy): void {
  const c = this.ctx,
    boss = e.type === 'boss',
    spriteReady = !!this.sprites.get(e.type)?.naturalWidth,
    color =
      boss || e.type === 'teleporter'
        ? palette.purple
        : e.type === 'lobber'
          ? palette.gold
          : e.type === 'shooter'
            ? palette.blue
            : palette.red;
  if (
    e.mode === 'aim' ||
    e.mode === 'windup-charge' ||
    e.mode === 'windup-fan' ||
    e.mode === 'windup-rush'
  ) {
    c.strokeStyle = e.mode === 'windup-charge' ? '#fa7c8688' : '#fa7c8644';
    c.lineWidth = e.mode === 'windup-charge' ? e.r * 1.5 : 2;
    c.setLineDash([9, 8]);
    for (const a of e.mode === 'windup-fan' ? [-0.66, 0, 0.66] : [0]) {
      c.beginPath();
      c.moveTo(e.x, e.y);
      c.lineTo(
        e.x + Math.cos(e.aim + a) * (boss ? 420 : 570),
        e.y + Math.sin(e.aim + a) * (boss ? 420 : 570),
      );
      c.stroke();
    }
    c.setLineDash([]);
  }
  if (e.mode === 'telegraph') {
    c.strokeStyle = palette.purple;
    c.lineWidth = 2;
    c.setLineDash([5, 5]);
    c.beginPath();
    c.arc(e.tx, e.ty, 38, 0, TAU);
    c.stroke();
    c.setLineDash([]);
    this.label('瞬移', e.tx, e.ty - 45, palette.purple, 11);
  }
  c.save();
  c.translate(e.x, e.y);
  c.fillStyle = '#0005';
  c.beginPath();
  c.ellipse(0, e.r * 0.65, e.r * 1.1, e.r * 0.55, 0, 0, TAU);
  c.fill();
  c.rotate(Math.atan2(this.player.y - e.y, this.player.x - e.x));
  if (!spriteReady) {
    if (boss) {
      for (let i = 0; i < 6; i++) {
        c.save();
        c.rotate((i / 6) * TAU + e.phase * 0.3);
        c.fillStyle = '#44335f';
        c.fillRect(36, -9, 18, 18);
        c.strokeStyle = palette.purple;
        c.strokeRect(36, -9, 18, 18);
        c.restore();
      }
      this.polygon(0, 0, 45, 6, Math.PI / 6);
      c.fillStyle = e.hit ? '#fff' : '#3c2e55';
      c.fill();
      c.strokeStyle = color;
      c.lineWidth = 3;
      c.stroke();
      this.polygon(0, 0, 21, 6, -e.phase);
      c.fillStyle = color;
      c.fill();
    } else {
      this.polygon(
        0,
        0,
        e.r,
        e.type === 'teleporter' ? 3 : e.type === 'shooter' ? 4 : e.type === 'lobber' ? 6 : 5,
        e.type === 'shooter' ? Math.PI / 4 : 0,
      );
      c.fillStyle = e.hit
        ? '#fff'
        : e.type === 'lobber'
          ? '#625337'
          : e.type === 'shooter'
            ? '#334c65'
            : e.type === 'teleporter'
              ? '#614772'
              : '#663f50';
      c.fill();
      c.strokeStyle = color;
      c.lineWidth = 2;
      c.stroke();
      c.fillStyle = color;
      c.fillRect(2, -4, e.r * 0.6, 8);
    }
  }
  c.restore();
  if (spriteReady) {
    c.save();
    c.strokeStyle = e.hit ? '#fff' : color;
    c.globalAlpha = 0.6;
    c.lineWidth = e.hit ? 3 : 1.4;
    c.beginPath();
    c.arc(e.x, e.y, e.r + 4, 0, TAU);
    c.stroke();
    c.globalAlpha = e.mode === 'emerge' ? 0.45 : 1;
    const bob = e.mode === 'idle' ? Math.sin(e.phase * 12) * 1.5 : 0;
    this.drawSprite(
      e.type,
      e.x,
      e.y + bob,
      boss ? 118 : 58,
      Math.atan2(this.player.y - e.y, this.player.x - e.x),
      e.hit > 0,
    );
    c.restore();
  }
  if (e.mode === 'emerge') {
    c.strokeStyle = color;
    c.setLineDash([4, 4]);
    c.beginPath();
    c.arc(e.x, e.y, e.r + 12, 0, TAU);
    c.stroke();
    c.setLineDash([]);
  }
  if (e.mode === 'strike') {
    c.strokeStyle = palette.purple;
    c.lineWidth = 2;
    c.beginPath();
    c.arc(e.x, e.y, 55, 0, TAU);
    c.stroke();
  }
  if (e.guard) {
    c.strokeStyle = palette.gold;
    c.lineWidth = 1;
    this.polygon(e.x, e.y - e.r - 23, 5, 3, Math.PI / 2);
    c.stroke();
  }
  if (e.hp < e.max || boss) {
    const w = boss ? 92 : 32;
    c.fillStyle = '#16242e';
    c.fillRect(e.x - w / 2, e.y - e.r - 12, w, 4);
    c.fillStyle = color;
    c.fillRect(e.x - w / 2, e.y - e.r - 12, w * Math.max(0, e.hp / e.max), 4);
  }
  if (boss)
    this.label(
      e.mode === 'recover'
        ? '守卫后摇 · 输出机会'
        : e.mode === 'windup-charge'
          ? '冲撞蓄力'
          : e.mode === 'windup-bomb'
            ? '地面轰炸'
            : e.mode === 'windup-fan'
              ? '扇形弹幕'
              : '核心守卫',
      e.x,
      e.y - 78,
      palette.purple,
      13,
    );
}

export function drawPlayer(this: GameSession): void {
  const c = this.ctx,
    p = this.player,
    engineer = this.options.character === 'engineer',
    spriteReady = !!this.sprites.get(engineer ? 'engineer' : 'player')?.naturalWidth;
  c.save();
  c.translate(p.x, p.y);
  c.fillStyle = '#0006';
  c.beginPath();
  c.ellipse(0, 15, 20, 10, 0, 0, TAU);
  c.fill();
  if (p.shield > 0) {
    c.strokeStyle = '#7ca8ff88';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(0, 0, 28, this.visualTime, this.visualTime + TAU);
    c.stroke();
  }
  if (this.comboTime > 0) {
    c.strokeStyle = '#7bf4e7aa';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(0, 0, 35, 0, TAU);
    c.stroke();
  }
  if (p.invulnerable > 0) c.globalAlpha = 0.65 + Math.sin(this.visualTime * 40) * 0.25;
  c.rotate(p.angle);
  if (!spriteReady) {
    c.fillStyle = engineer ? '#b897f6' : '#a9e8df';
    c.strokeStyle = engineer ? '#dfc9ff' : '#cafff6';
    c.lineWidth = 2;
    this.polygon(0, 0, 18, 6, Math.PI / 6);
    c.fill();
    c.stroke();
    c.fillStyle = '#183440';
    c.fillRect(-6, -10, 12, 20);
    c.fillStyle = '#effffd';
    c.fillRect(2, -8, 7, 16);
    c.fillStyle = '#526c80';
    c.fillRect(9, 0, 22, 7);
    c.fillStyle = palette.cyan;
    c.fillRect(26, 1, 6, 5);
  }
  c.restore();
  if (spriteReady) {
    c.save();
    c.globalAlpha = p.invulnerable > 0 ? 0.65 : 1;
    this.drawSprite(
      engineer ? 'engineer' : 'player',
      p.x,
      p.y +
        Math.sin(this.elapsed * 14) * (Math.hypot(this.velocity.x, this.velocity.y) > 5 ? 1.8 : 0),
      60,
      p.angle,
    );
    c.restore();
  }
  if (this.muzzleTime > 0) {
    const x = p.x + Math.cos(p.angle) * 31,
      y = p.y + Math.sin(p.angle) * 31;
    c.fillStyle = '#fff4cd';
    this.polygon(x, y, 7 + this.muzzleTime * 40, 4, p.angle);
    c.fill();
  }
  if (this.options.weapon === 'drone' || engineer) {
    const count = (this.options.weapon === 'drone' ? 3 : 0) + (engineer ? 1 : 0);
    c.strokeStyle = '#7ca8ff20';
    c.setLineDash([4, 10]);
    c.beginPath();
    c.arc(p.x, p.y, 78, 0, TAU);
    c.stroke();
    c.setLineDash([]);
    for (let j = 0; j < count; j++) {
      const a = this.elapsed * 2.1 + (j / count) * TAU,
        x = p.x + Math.cos(a) * 78,
        y = p.y + Math.sin(a) * 78;
      c.fillStyle = palette.blue;
      this.polygon(x, y, 9, 4, a);
      c.fill();
      c.fillStyle = '#f4ffff';
      c.fillRect(x - 2, y - 2, 4, 4);
    }
  }
  c.fillStyle = '#162d36';
  c.fillRect(p.x - 20, p.y + 29, 40, 3);
  c.fillStyle = palette.cyan;
  c.fillRect(p.x - 20, p.y + 29, 40 * Math.max(0, p.hp / p.maxHp), 3);
}
