import { palette } from '../../config/palette';
import { UPGRADES } from '../../config/progression';
import type { GameSession } from '../core/GameSession';
import type { UpgradeChoice } from '../types';

export function chooseUpgrade(this: GameSession, id: string): void {
  if (!this.upgrading || !this.currentChoices.some((c) => c.id === id)) return;
  if (id === 'damage') this.damage = Math.min(3.8, this.damage + 0.2);
  if (id === 'rapid') this.attackSpeed = Math.min(2.8, this.attackSpeed + 0.15);
  if (id === 'shield') this.player.shield = Math.min(100, this.player.shield + 28);
  if (id === 'heal') this.player.hp = Math.min(this.player.maxHp, this.player.hp + 35);
  if (id === 'speed') this.moveSpeed = Math.min(1.25, this.moveSpeed + 0.1);
  if (id === 'magnet') this.magnet = Math.min(3, this.magnet + 0.2);
  if (id === 'module-pierce') this.damage = Math.min(3.8, this.damage + 0.3);
  if (id === 'module-fortress') this.player.shield = Math.min(100, this.player.shield + 45);
  if (id === 'module-shockwave') {
    this.player.dashCooldown = 0;
    this.moveSpeed = Math.min(1.25, this.moveSpeed + 0.12);
  }
  if (id === 'module-rescue') this.player.hp = Math.min(this.player.maxHp, this.player.hp + 55);
  if (id === 'module-insulation') this.player.shield = Math.min(100, this.player.shield + 38);
  if (id === 'module-magnet') this.magnet = Math.min(3, this.magnet + 0.4);
  this.audio.play('upgrade');
  this.float(
    this.player.x,
    this.player.y - 45,
    this.currentChoices.find((c) => c.id === id)?.name || '',
    palette.cyan,
  );
  this.upgrading = false;
  this.last = performance.now();
  this.options.onUpgrade([]);
  this.checkLevel();
  this.emitHud();
}

export function checkLevel(this: GameSession): void {
  if (
    this.upgrading ||
    this.contracting ||
    this.level >= 12 ||
    this.xp < this.xpNeeded ||
    !this.running
  )
    return;
  this.xp -= this.xpNeeded;
  this.level++;
  this.xpNeeded = Math.round(6 + this.level * 2.4);
  this.upgrading = true;
  this.blur();
  const pool = [...UPGRADES];
  const synergies: Record<string, UpgradeChoice> = {
    pierce: {
      id: 'module-pierce',
      name: '穿甲校准',
      description: '穿甲模块协同：武器伤害 +30%',
      kind: '模块协同',
    },
    fortress: {
      id: 'module-fortress',
      name: '堡垒充能',
      description: '防御模块协同：立即补充 45 护盾',
      kind: '模块协同',
    },
    shockwave: {
      id: 'module-shockwave',
      name: '震荡推进',
      description: '冲刺模块协同：移速 +12%，重置冲刺',
      kind: '模块协同',
    },
    rescue: {
      id: 'module-rescue',
      name: '应急修复',
      description: '应急模块协同：恢复 55 生命',
      kind: '模块协同',
    },
    insulation: {
      id: 'module-insulation',
      name: '隔热补给',
      description: '隔热模块协同：立即补充 38 护盾',
      kind: '模块协同',
    },
    magnet: {
      id: 'module-magnet',
      name: '回收增幅',
      description: '回收模块协同：拾取半径 +40%',
      kind: '模块协同',
    },
  };
  for (const id of this.options.modules || []) if (synergies[id]) pool.push(synergies[id]);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  this.currentChoices = pool.slice(0, 3);
  this.emitHud();
  this.options.onUpgrade(this.currentChoices);
}
