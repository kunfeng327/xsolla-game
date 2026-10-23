import { palette } from '../../config/palette';
import { CONTRACTS } from '../../config/progression';
import type { GameSession } from '../core/GameSession';
import type { ContractChoice, InteractSite } from '../types';
import type { Site } from '../world/chunks';

export function chooseContract(this: GameSession, id: ContractChoice['id']): void {
  if (
    !this.contracting ||
    !this.activeTerminal ||
    this.fragments < 10 ||
    this.contracts.length >= 2 ||
    this.usedTerminals.has(this.activeTerminal.id)
  )
    return;
  if (!CONTRACTS.some((c) => c.id === id)) return;
  this.fragments -= 10;
  this.usedTerminals.add(this.activeTerminal.id);
  let name = '',
    description = '',
    positive = true;
  if (id === 'stable') {
    this.damage = Math.min(3.8, this.damage + 0.08);
    name = '稳定火控';
    description = '本局武器伤害 +8%';
  }
  if (id === 'overload') {
    if (Math.random() < 0.6) {
      this.damage = Math.min(3.8, this.damage + 0.28);
      name = '超载火控';
      description = '本局武器伤害 +28%';
    } else {
      this.damageTaken += 0.12;
      positive = false;
      name = '回路泄漏';
      description = '本局受到的伤害 +12%';
    }
  }
  if (id === 'extreme') {
    if (Math.random() < 0.15) {
      this.chain = true;
      this.damage = Math.min(3.8, this.damage + 0.2);
      name = '雷霆连锁';
      description = '本局伤害 +20%，命中触发连锁电击';
    } else {
      this.damageTaken += 0.25;
      positive = false;
      name = '脆弱协议';
      description = '本局受到的伤害 +25%';
    }
  }
  this.audio.play('contract');
  this.contracts.push({ name, description, positive });
  this.closeContract();
  this.notify(
    (positive ? '契约获得' : '风险兑现') + '：' + name + ' · 持续本局',
    positive ? palette.purple : palette.red,
  );
  this.emitHud();
}

export function closeContract(this: GameSession): void {
  this.contracting = false;
  this.activeTerminal = null;
  this.blur();
  this.last = performance.now();
  this.options.onContract([]);
  this.emitHud();
}

export function openContract(this: GameSession, near: InteractSite): void {
  if (this.usedTerminals.has(near.id)) {
    this.notify('此终端已使用，本局不会刷新', palette.purple);
    return;
  }
  if (this.contracts.length >= 2) {
    this.notify('本局已签订两份契约', palette.purple);
    return;
  }
  if (this.fragments < 10) {
    this.notify('还需 ' + (10 - this.fragments) + ' 枚异常碎片，击败守卫可获得', palette.purple);
    return;
  }
  this.activeTerminal = near as Site;
  this.contracting = true;
  this.blur();
  this.options.onContract(CONTRACTS);
  this.emitHud();
  return;
}
