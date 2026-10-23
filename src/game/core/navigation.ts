import { palette } from '../../config/palette';
import { distance } from '../../shared/math';
import type { GameSession } from '../core/GameSession';
import type { GameHud, V } from '../types';

export function targetInfo(this: GameSession): { point: V; name: string; color: string } | null {
  if (this.activeExtraction)
    return { point: this.activeExtraction, name: '守住接应区', color: palette.cyan };
  if (
    this.objective === 'extract' ||
    (this.bag.cores > 0 && this.objective === 'resource' && !this.objectiveManual)
  ) {
    const e = this.nearestExtraction();
    return { point: e, name: e.title, color: palette.cyan };
  }
  if (
    (this.objective === 'boss' && this.bossSite && !this.bossKilled) ||
    (this.bossActive && this.bossSite)
  )
    return {
      point: this.bossSite!,
      name: this.bossActive ? '核心守卫战斗' : '可选：核心守卫',
      color: palette.purple,
    };
  if (this.objective === 'terminal') {
    const terminal = this.sites
      .filter((s) => s.kind === 'terminal' && !this.usedTerminals.has(s.id))
      .sort((a, b) => distance(a, this.player) - distance(b, this.player))[0];
    if (terminal)
      return {
        point: terminal,
        name: this.fragments >= 10 ? '签订异常契约' : '契约终端 · 需10碎片',
        color: palette.purple,
      };
  }
  const s = this.sites
    .filter(
      (s) => s.kind === 'resource' && (this.eventStates.get(s.id)?.status || 'idle') !== 'done',
    )
    .sort((a, b) => distance(a, this.player) - distance(b, this.player))[0];
  return s ? { point: s, name: s.title, color: palette.gold } : null;
}

export function tutorialStep(this: GameSession): string {
  return this.activeExtraction
    ? '守住接应圈，圈内可以移动'
    : this.bossActive
      ? '看预警躲招，后摇时输出'
      : this.events === 0
        ? [...this.eventStates.values()].some((s) => s.status === 'active')
          ? '资源警报已触发：移动躲避，击败带金色标记的守卫'
          : '找到金色资源仓，靠近按 E 启动'
        : this.events === 1 && this.contracts.length === 0
          ? this.fragments >= 10
            ? '已有契约碎片：可追踪紫色终端，或继续搜集'
            : '契约还需 ' + (10 - this.fragments) + ' 碎片：继续击败敌人收集'
          : this.events >= 2 && !this.bossKilled
            ? '选择：挑战守卫、继续搜集，或带回物资'
            : this.bag.cores > 0
              ? '核心已到手：成功撤离后解锁金色模块'
              : '回营地兑换物资，尝试另一套出战配置';
}

export function interactionText(this: GameSession): string {
  const s = this.nearestInteraction();
  if (!s) return '';
  if (s.kind === 'boss') return 'E 挑战核心守卫 · 可退出据点中止';
  if (s.kind === 'extract')
    return this.activeExtraction ? '接应中：圆圈内可自由移动防守' : 'E 呼叫接应 · 防守 10 秒';
  if (s.kind === 'terminal')
    return this.usedTerminals.has(s.id)
      ? '终端已使用'
      : this.contracts.length >= 2
        ? '本局契约已满（2/2）'
        : this.fragments >= 10
          ? 'E 签订本局契约 · 消耗 10 碎片'
          : '异常终端：还需 ' + (10 - this.fragments) + ' 碎片';
  return 'E 开启资源事件 · 清理守卫后获得物资';
}

export function emitHud(this: GameSession): void {
  const boss = this.enemies.find((e) => e.type === 'boss' && e.hp > 0),
    near = distance(this.player, this.nearestExtraction()) < 85,
    target = this.targetInfo(),
    angle = target ? Math.atan2(target.point.y - this.player.y, target.point.x - this.player.x) : 0,
    directions = ['东', '东南', '南', '西南', '西', '西北', '北', '东北'];
  const supplies: GameHud['supplies'] = [];
  if (this.supplyTimers.overcharge > 0)
    supplies.push({
      id: 'overcharge',
      name: '超载攻速 +40%',
      remaining: this.supplyTimers.overcharge,
    });
  if (this.supplyTimers.speed > 0)
    supplies.push({ id: 'speed', name: '推进移速 +25%', remaining: this.supplyTimers.speed });
  if (this.comboTime > 0)
    supplies.push({ id: 'combo', name: '战斗亢奋', remaining: this.comboTime });
  this.options.onHud({
    hp: Math.max(0, this.player.hp),
    maxHp: this.player.maxHp,
    shield: this.player.shield,
    time: this.elapsed,
    xp: this.xp,
    xpNeeded: this.xpNeeded,
    level: this.level,
    kills: this.kills,
    alloy: this.bag.alloy,
    chips: this.bag.chips,
    cores: this.bag.cores,
    extractionOpen: true,
    extractProgress: this.extractionProgress,
    bossHp: boss?.hp || 0,
    bossMaxHp: boss?.max || 0,
    status: this.upgrading
      ? '选择战术升级'
      : this.contracting
        ? '选择异常契约'
        : this.activeExtraction
          ? '守住接应区域'
          : this.bag.cores > 0
            ? '核心已获得 · 寻找接应站'
            : this.bossActive
              ? '核心守卫挑战中'
              : this.events >= 2
                ? '守卫据点已揭示 · 挑战或撤离'
                : '完成两个资源事件，发现核心守卫',
    dashReady: this.player.dashCooldown <= 0,
    nearExtract: near,
    events: this.events,
    danger: this.danger(),
    fragments: this.fragments,
    contracts: [...this.contracts],
    combo: this.combo,
    comboTime: this.comboTime,
    supplies,
    interaction: this.interactionText(),
    target: target
      ? {
          name: target.name,
          distance: Math.round(distance(target.point, this.player) / 10),
          direction: directions[(Math.round(angle / (Math.PI / 4)) + 8) % 8],
        }
      : null,
    bossRevealed: !!this.bossSite,
    bossActive: this.bossActive,
    contractCount: this.contracts.length,
    bossKilled: this.bossKilled,
    explored: this.visited.size,
    modules: [...(this.options.modules || [])],
    message: this.messageTime > 0 ? this.message : '',
    rescueAvailable: this.hasModule('rescue') && !this.rescueUsed,
    tutorialStep: this.tutorialStep(),
    damageMultiplier: this.damage * (this.comboTime > 0 ? 1.15 : 1),
    attackMultiplier: this.attackSpeed * (this.supplyTimers.overcharge > 0 ? 1.4 : 1),
    moveMultiplier: this.movementMultiplier(),
    playerSpeed: 175 * this.movementMultiplier(),
    pressure: this.enemies.filter((e) => e.hp > 0 && distance(e, this.player) < 320).length,
  });
}
