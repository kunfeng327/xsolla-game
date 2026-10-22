export type SoundCue =
  | 'pulse'
  | 'scatter'
  | 'drone'
  | 'hit'
  | 'kill'
  | 'pickup'
  | 'upgrade'
  | 'contract'
  | 'extract'
  | 'hurt'
  | 'dash';
/** Small original synth effects; no network, media assets or autoplay dependency. */
export class CombatAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = true;
  private volume = 0.22;
  private last = new Map<string, number>();
  private active = 0;
  constructor(enabled = true) {
    this.enabled = enabled;
  }
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (enabled) this.unlock();
    if (this.master) this.master.gain.value = enabled ? this.volume : 0;
  }
  setVolume(value: number) {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.master) this.master.gain.value = this.enabled ? this.volume : 0;
  }
  unlock() {
    if (!this.enabled || typeof window === 'undefined') return;
    try {
      const Constructor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Constructor) return;
      if (!this.context) {
        this.context = new Constructor();
        this.master = this.context.createGain();
        this.master.gain.value = this.volume;
        this.master.connect(this.context.destination);
      }
      if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
    } catch {
      /* Audio is optional; the game remains playable without a device. */
    }
  }
  play(cue: SoundCue) {
    if (!this.enabled) return;
    this.unlock();
    const c = this.context;
    if (!c || c.state !== 'running' || this.active >= 10) return;
    const now = c.currentTime,
      interval = cue === 'hit' ? 0.055 : cue === 'pickup' ? 0.07 : cue === 'kill' ? 0.07 : 0.045;
    if (now - (this.last.get(cue) ?? -10) < interval) return;
    this.last.set(cue, now);
    const settings: Record<SoundCue, [number, number, number, OscillatorType, number]> = {
      pulse: [580, 130, 0.075, 'square', 0.2],
      scatter: [180, 55, 0.12, 'sawtooth', 0.29],
      drone: [760, 340, 0.075, 'triangle', 0.18],
      hit: [220, 95, 0.035, 'triangle', 0.18],
      kill: [320, 75, 0.1, 'sawtooth', 0.19],
      pickup: [740, 1100, 0.07, 'sine', 0.18],
      upgrade: [520, 1450, 0.33, 'triangle', 0.28],
      contract: [240, 940, 0.32, 'sine', 0.27],
      extract: [620, 1240, 0.4, 'triangle', 0.3],
      hurt: [105, 48, 0.13, 'sawtooth', 0.26],
      dash: [360, 1000, 0.12, 'triangle', 0.13],
    };
    const [start, end, duration, wave, gain] = settings[cue];
    try {
      const oscillator = c.createOscillator(),
        envelope = c.createGain();
      oscillator.type = wave;
      oscillator.frequency.setValueAtTime(start, now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, end), now + duration);
      envelope.gain.setValueAtTime(0.0001, now);
      envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), now + 0.006);
      envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(envelope);
      envelope.connect(this.master || c.destination);
      this.active++;
      oscillator.onended = () => {
        this.active = Math.max(0, this.active - 1);
        oscillator.disconnect();
        envelope.disconnect();
      };
      oscillator.start(now);
      oscillator.stop(now + duration + 0.015);
    } catch {
      /* A muted or suspended audio context must not interrupt combat. */
    }
  }
  destroy() {
    const c = this.context;
    this.context = null;
    this.master = null;
    if (!c) return;
    const close = () => {
      try {
        void c.close().catch(() => {});
      } catch {}
    };
    if (typeof window !== 'undefined' && typeof window.setTimeout === 'function')
      window.setTimeout(close, 450);
    else close();
  }
}
