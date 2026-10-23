/** Real-time throttling keeps multi-pellet and drone hits from sustaining vibration. */
export class ImpactFeedback {
  enabled = true;
  private lastPulse = -Infinity;
  hit(boss: boolean, killed: boolean): void {
    if (!this.enabled || typeof navigator === 'undefined' || !navigator.vibrate) return;
    const now = performance.now();
    if (now - this.lastPulse < 90) return;
    this.lastPulse = now;
    try {
      navigator.vibrate(killed ? (boss ? [25, 25, 40] : 22) : boss ? 16 : 10);
    } catch {}
  }
  stop(): void {
    if (typeof navigator === 'undefined' || !navigator.vibrate) return;
    try {
      navigator.vibrate(0);
    } catch {}
  }
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.stop();
  }
}
