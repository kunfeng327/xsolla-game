import type { ContractChoice, GameOptions, Objective } from '../types';
import { GameSession } from './GameSession';

/** Public client bridge: lifecycle and player commands, no profile persistence. */
export class StarbreakGame {
  private readonly session: GameSession;
  constructor(canvas: HTMLCanvasElement, options: GameOptions) {
    this.session = new GameSession(canvas, options);
  }
  start(): void {
    return this.session.start();
  }
  destroy(): void {
    return this.session.destroy();
  }
  setPaused(value: boolean): void {
    return this.session.setPaused(value);
  }
  setInput(x: number, y: number): void {
    return this.session.setInput(x, y);
  }
  setSpeed(mult: number): void {
    return this.session.setSpeed(mult);
  }
  setObjective(goal: Objective): void {
    return this.session.setObjective(goal);
  }
  setAudioEnabled(enabled: boolean): void {
    return this.session.setAudioEnabled(enabled);
  }
  setAudioVolume(volume: number): void {
    return this.session.setAudioVolume(volume);
  }
  setScreenShake(enabled: boolean): void {
    return this.session.setScreenShake(enabled);
  }
  dash(): void {
    return this.session.dash();
  }
  chooseUpgrade(id: string): void {
    return this.session.chooseUpgrade(id);
  }
  chooseContract(id: ContractChoice['id']): void {
    return this.session.chooseContract(id);
  }
  closeContract(): void {
    return this.session.closeContract();
  }
  interact(): void {
    return this.session.interact();
  }
}
