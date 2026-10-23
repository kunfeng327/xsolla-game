import type { GameSession } from '../core/GameSession';

/** Preserve update order: clocks, actors, damage, pickups/events, then extraction. */
export function update(this: GameSession, dt: number): void {
  this.elapsed += dt;
  this.flowTimer -= dt;
  this.muzzleTime = Math.max(0, this.muzzleTime - dt);
  this.damageTextTimer = Math.max(0, this.damageTextTimer - dt);
  this.messageTime = Math.max(0, this.messageTime - dt);
  this.updatePlayerTimers(dt);
  this.updateBuffTimers(dt);
  this.updateMovement(dt);
  this.updateDirector(dt);
  this.updateWeapons(dt);
  this.updateEnemies(dt);
  this.updateProjectiles(dt);
  if (this.player.hp <= 0) {
    this.finish('dead');
    return;
  }
  this.updatePickups(dt);
  this.updateEvents();
  this.updateEffects(dt);
  if (this.player.hp <= 0) {
    this.finish('dead');
    return;
  }
  if (this.activeExtraction) {
    this.updateExtraction(dt);
    if (!this.running) return;
  }
  this.hudTimer += dt;
  if (this.hudTimer >= 0.08) {
    this.hudTimer = 0;
    this.emitHud();
  }
}
