export type Preferences = { scale: number; sound: boolean; shake: boolean };
const PREF_KEY = 'starbreak-battle-preferences-v3';
export function loadPreferences(): Preferences {
  try {
    const raw = JSON.parse(localStorage.getItem(PREF_KEY) || 'null');
    return {
      scale: [100, 125, 150].includes(raw?.scale) ? raw.scale : 100,
      sound: raw?.sound !== false,
      shake: raw?.shake !== false,
    };
  } catch {
    return { scale: 100, sound: true, shake: true };
  }
}
export function savePreferences(prefs: Preferences): void {
  localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
}
