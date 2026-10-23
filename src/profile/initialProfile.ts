import type { Profile } from './types';
export function initialProfile(): Profile {
  return {
    alloy: 0,
    chips: 0,
    cores: 0,
    healthLevel: 0,
    magnetLevel: 0,
    weapons: ['pulse'],
    characters: ['gunner'],
    trail: false,
    selectedWeapon: 'pulse',
    selectedCharacter: 'gunner',
    tracked: 'scatter',
    stats: { runs: 0, extracts: 0, bossKills: 0, kills: 0 },
    bagLevel: 0,
    modules: ['magnet', 'insulation'],
    equippedModules: ['magnet', 'insulation'],
    moduleLevels: {},
  };
}
