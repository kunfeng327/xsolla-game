export type Preferences = { scale: number; sound: boolean; shake: boolean; haptics: boolean };
const PREF_KEY = 'starbreak-battle-preferences-v3';
export function loadPreferences(): Preferences {
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  try {
    const raw = JSON.parse(localStorage.getItem(PREF_KEY) || 'null');
    return {
      scale: [100, 125, 150].includes(raw?.scale) ? raw.scale : 100,
      sound: raw?.sound !== false,
      shake: typeof raw?.shake === 'boolean' ? raw.shake : !reducedMotion,
      haptics: raw?.haptics !== false,
    };
  } catch {
    return { scale: 100, sound: true, shake: !reducedMotion, haptics: true };
  }
}
export function savePreferences(prefs: Preferences): void {
  localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
}
