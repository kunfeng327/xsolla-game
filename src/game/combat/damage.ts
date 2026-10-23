import { palette } from '../../config/palette';
import { distance } from '../../shared/math';
import type { GameSession } from '../core/GameSession';
import type { Enemy, PickupKind } from '../types';

export function hitEnemy(this: GameSession, e: Enemy, amount: number): void {
  if (e.hp <= 0 || e.mode === 'telegraph' || e.mode === 'emerge') return;
  const wasHit = e.hit > 0;
  e.hp -= amount;
  e.hit = 0.12;
  this.audio.play('hit');
  this.shake = Math.max(this.shake, e.type === 'boss' ? 2.2 : 1.4);
  this.impact.hit(e.type === 'boss', e.hp <= 0);
  if (e.type !== 'boss' && !wasHit) {
    const d = Math.max(1, distance(e, this.player));
    this.moveEntity(e, ((e.x - this.player.x) / d) * 7, ((e.y - this.player.y) / d) * 7, e.r);
  }
  if (this.damageTextTimer <= 0) {
    this.damageTextTimer = 0.09;
    this.float(
      e.x,
      e.y - e.r - 8,
      Math.round(amount).toString(),
      e.type === 'boss' ? palette.purple : '#f5e5ca',
      0.55,
      14,
    );
  }
  this.burst(e.x, e.y, e.type === 'boss' ? palette.purple : palette.gold, 5, 85);
  if (e.hp > 0) return;
  this.audio.play('kill');
  this.shake = Math.max(this.shake, e.type === 'boss' ? 5 : 0.55);
  this.deaths.push({
    x: e.x,
    y: e.y,
    kind: e.type,
    r: e.r,
    life: 0.18,
    max: 0.18,
    angle: Math.atan2(e.y - this.player.y, e.x - this.player.x),
  });
  this.kills++;
  this.combo = this.elapsed - this.lastKill <= 4 ? this.combo + 1 : 1;
  this.lastKill = this.elapsed;
  this.maxCombo = Math.max(this.maxCombo, this.combo);
  if (this.combo % 10 === 0) {
    this.audio.play('upgrade');
    this.comboTime = 8;
    this.float(
      this.player.x,
      this.player.y - 65,
      '无伤连杀：战斗亢奋 · 8 秒',
      palette.cyan,
      2.5,
      16,
    );
  }
  this.burst(
    e.x,
    e.y,
    e.type === 'boss' ? palette.purple : palette.red,
    e.type === 'boss' ? 70 : 12,
    e.type === 'boss' ? 220 : 100,
  );
  if (!e.noLoot) {
    this.pickups.push({
      x: e.x,
      y: e.y,
      type: 'xp',
      amount: e.type === 'boss' ? 12 : e.type === 'normal' ? 1 : 2,
      phase: 0,
      life: 100,
    });
    this.pickups.push({
      x: e.x + 13,
      y: e.y + 6,
      type: 'fragment',
      amount: e.guard ? 2 : 1,
      phase: 1,
      life: 90,
    });
    if (Math.random() < 0.16) {
      const kinds: PickupKind[] = ['heal', 'shield', 'overcharge', 'speed'];
      this.pickups.push({
        x: e.x - 12,
        y: e.y + 9,
        type: kinds[Math.floor(Math.random() * 4)],
        amount: 1,
        phase: 0,
        life: 45,
      });
    }
  }
  if (e.type === 'boss') {
    this.bossKilled = true;
    this.bossActive = false;
    this.bag.alloy += 35;
    this.bag.chips += 3;
    this.pickups.push({ x: e.x, y: e.y, type: 'core', amount: 1, phase: 0, life: Infinity });
    this.bossExtraction = {
      id: 'boss:extract',
      kind: 'extract',
      x: this.bossSite!.x + 125,
      y: this.bossSite!.y + 130,
      title: '守卫接应站',
      rare: false,
    };
    this.sites.push(this.bossExtraction);
    this.notify('核心守卫已击败：拾取核心，附近接应站已开放', palette.purple);
    this.shake = 5;
    this.warnings = [];
    this.bullets = this.bullets.filter((b) => !b.hostile);
  }
}

export function hurt(
  this: GameSession,
  amount: number,
  kind: 'contact' | 'bullet' | 'explosion' = 'contact',
  source?: string,
): void {
  if (this.player.invulnerable > 0 || !this.running) return;
  if (kind === 'explosion' && this.hasModule('insulation'))
    amount *= 1 - (0.3 + this.moduleLevel('insulation') * 0.1);
  if (kind === 'bullet' && this.hasModule('fortress'))
    amount *= 1 - (0.25 + this.moduleLevel('fortress') * 0.05);
  this.lastDamageSource =
    source || (kind === 'explosion' ? '范围爆炸' : kind === 'bullet' ? '敌方弹丸' : '近身碰撞');
  this.audio.play('hurt');
  amount = Math.max(1, Math.round(amount * this.damageTaken));
  const shieldDamage = Math.min(this.player.shield, amount);
  this.player.shield -= shieldDamage;
  this.player.hp -= amount - shieldDamage;
  this.player.invulnerable = 0.65;
  this.combo = 0;
  this.comboTime = 0;
  this.lastKill = -100;
  this.shake = 3;
  this.float(this.player.x + 15, this.player.y - 28, '−' + amount, palette.red, 0.7, 15);
  this.burst(this.player.x, this.player.y, shieldDamage ? palette.blue : palette.red, 10, 95);
  if (this.player.hp <= 0 && this.hasModule('rescue') && !this.rescueUsed) {
    this.rescueUsed = true;
    this.player.hp = Math.ceil(this.player.maxHp * (0.3 + this.moduleLevel('rescue') * 0.1));
    this.player.invulnerable = 2.5;
    this.notify('应急协议触发：本局唯一一次濒死保护', palette.gold);
  }
}
