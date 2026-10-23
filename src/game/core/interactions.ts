import type { GameSession } from '../core/GameSession';

export function interact(this: GameSession): void {
  if (!this.running || this.paused || this.upgrading || this.contracting) return;
  const near = this.nearestInteraction();
  if (!near) return;
  if (near.kind === 'boss') {
    this.spawnBoss();
    return;
  }
  if (near.kind === 'resource') {
    this.startResourceEvent(near);
    return;
  }
  if (near.kind === 'terminal') {
    this.openContract(near);
    return;
  }
  if (near.kind === 'extract') {
    this.requestExtraction(near);
    return;
  }
}
