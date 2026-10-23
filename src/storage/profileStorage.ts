import { MODULES, RECIPES } from '../config/catalog';
import { initialProfile } from '../profile/initialProfile';
import { moduleUsage } from '../profile/loadout';
import type { CharacterId, ModuleId, Profile, TrackId, WeaponId } from '../profile/types';
export const STORAGE_KEY = 'starbreak-profile-v1';

function validTrack(id: unknown): id is TrackId {
  return (
    typeof id === 'string' &&
    (id === 'bag' ||
      RECIPES.some((r) => r.id === id) ||
      MODULES.some((m) => `module:${m.id}` === id))
  );
}

export function loadProfile(): Profile {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!raw) return initialProfile();
    const base = initialProfile();
    const num = (v: unknown, max = 999999) =>
      typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : 0;
    const weapons: WeaponId[] = [
      'pulse',
      ...(['scatter', 'drone'] as WeaponId[]).filter(
        (x) => Array.isArray(raw.weapons) && raw.weapons.includes(x),
      ),
    ];
    const characters: CharacterId[] =
      Array.isArray(raw.characters) && raw.characters.includes('engineer')
        ? ['gunner', 'engineer']
        : ['gunner'];
    const bagLevel = num(raw.bagLevel, 2);
    const modules = MODULES.filter(
      (m) => m.rarity === 'green' || (Array.isArray(raw.modules) && raw.modules.includes(m.id)),
    ).map((m) => m.id);
    const equippedModules: ModuleId[] = [];
    const requested = Array.isArray(raw.equippedModules)
      ? raw.equippedModules
      : base.equippedModules;
    for (const id of requested)
      if (
        modules.includes(id) &&
        !equippedModules.includes(id) &&
        moduleUsage([...equippedModules, id]) <= 4 + bagLevel
      )
        equippedModules.push(id);
    const moduleLevels: Partial<Record<ModuleId, number>> = {};
    for (const id of modules) moduleLevels[id] = num(raw.moduleLevels?.[id], 2);
    return {
      ...base,
      alloy: num(raw.alloy),
      chips: num(raw.chips),
      cores: num(raw.cores),
      healthLevel: num(raw.healthLevel, 3),
      magnetLevel: num(raw.magnetLevel, 3),
      weapons,
      characters,
      trail: raw.trail === true,
      bagLevel,
      modules,
      equippedModules,
      moduleLevels,
      selectedWeapon: weapons.includes(raw.selectedWeapon) ? raw.selectedWeapon : 'pulse',
      selectedCharacter: characters.includes(raw.selectedCharacter)
        ? raw.selectedCharacter
        : 'gunner',
      tracked: validTrack(raw.tracked) ? raw.tracked : 'scatter',
      stats: {
        runs: num(raw.stats?.runs),
        extracts: num(raw.stats?.extracts),
        bossKills: num(raw.stats?.bossKills),
        kills: num(raw.stats?.kills),
      },
    };
  } catch {
    return initialProfile();
  }
}

export function saveProfile(profile: Profile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}
