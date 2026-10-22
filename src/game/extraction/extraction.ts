import { palette } from '../../config/palette';
import { calculateRunRewards } from '../../profile/settlement';
import { distance } from '../../shared/math';
import type { GameSession } from '../core/GameSession';
import type { GameResult, InteractSite } from '../types';
import type { Site } from '../world/chunks';

export function nearestExtraction(this: GameSession): Site {
  return (
    this.sites
      .filter((s) => s.kind === 'extract')
      .sort((a, b) => distance(a, this.player) - distance(b, this.player))[0] || {
      id: 'origin:extract',
      kind: 'extract' as const,
      x: 0,
      y: 115,
      title: '前哨接应站',
      rare: false,
    }
  );
}

export function finish(this: GameSession, reason: GameResult['reason']): void {
  if (!this.running) return;
  this.running = false;
  this.blur();
  this.emitHud();
  const success = reason === 'extracted';
  this.audio.play(success ? 'extract' : 'hurt');
  this.options.onFinish({
    success,
    reason,
    ...calculateRunRewards(this.bag, success),
    kills: this.kills,
    time: this.elapsed,
    level: this.level,
    bossKilled: this.bossKilled,
    collected: { ...this.bag },
    events: this.events,
    contracts: this.contracts.length,
    maxCombo: this.maxCombo,
    explored: this.visited.size,
    lastDamageSource: this.lastDamageSource,
  });
}

export function requestExtraction(this: GameSession, near: InteractSite): void {
  if (this.activeExtraction) {
    this.notify('接应正在抵达，留在圆圈内即可移动防守', palette.cyan);
    return;
  }
  this.activeExtraction = near as Site;
  this.extractionProgress = 0;
  this.extractionWave = 0;
  this.spawnTimer = 99;
  this.queueWave(4, true, 330);
  this.notify('接应已呼叫：守住 10 秒，离开圆圈可取消', palette.cyan);
  this.emitHud();
}

export function updateExtraction(this: GameSession, dt: number): void {
  if (!this.activeExtraction) return;
  if (distance(this.player, this.activeExtraction) > 85) {
    this.activeExtraction = null;
    this.extractionProgress = 0;
    this.spawnTimer = 1.8;
    this.notify('已离开接应范围，撤离取消；可重新呼叫', palette.gold);
  } else {
    this.extractionProgress += dt / 10;
    if (this.extractionProgress >= 1) {
      this.finish('extracted');
      return;
    }
  }
}
