const KEY = 'starbreak-field-briefing-v1';
export function needsTutorial(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'done';
  } catch {
    return true;
  }
}
export function completeTutorial(): void {
  try {
    localStorage.setItem(KEY, 'done');
  } catch {}
}
export function resetTutorial(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
