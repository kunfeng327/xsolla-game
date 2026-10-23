import { MODULES } from '../config/catalog';
import type { ModuleId, Profile } from './types';
export function moduleCapacity(p: Profile): number {
  return 4 + p.bagLevel;
}

export function moduleUsage(ids: ModuleId[]): number {
  return [...new Set(ids)].reduce((n, id) => n + (MODULES.find((m) => m.id === id)?.slots ?? 0), 0);
}

export function toggleModule(p: Profile, id: ModuleId): Profile | null {
  if (!p.modules.includes(id)) return null;
  const equipped = p.equippedModules.includes(id)
    ? p.equippedModules.filter((m) => m !== id)
    : [...p.equippedModules, id];
  return moduleUsage(equipped) > moduleCapacity(p) ? null : { ...p, equippedModules: equipped };
}

/** Snapshot mutable equipped state so camp edits cannot affect an active run. */
export function createRunLoadout(profile: Profile): Profile {
  return {
    ...profile,
    equippedModules: [...profile.equippedModules],
    moduleLevels: { ...profile.moduleLevels },
  };
}
