export type WeaponId = 'pulse' | 'scatter' | 'drone';

export type CharacterId = 'gunner' | 'engineer';

export type RecipeId = 'health' | 'magnet' | 'scatter' | 'drone' | 'engineer' | 'trail';

export type Materials = { alloy: number; chips: number; cores: number };

export type ModuleId = 'magnet' | 'insulation' | 'fortress' | 'shockwave' | 'pierce' | 'rescue';

export type TrackId = RecipeId | 'bag' | `module:${ModuleId}`;

export interface TrackedGoal {
  id: TrackId;
  title: string;
  description: string;
  cost: Materials;
  complete: boolean;
  canAfford: boolean;
  kind: 'recipe' | 'module' | 'bag';
}

export interface TacticalModule {
  id: ModuleId;
  name: string;
  description: string;
  slots: 1 | 2 | 3;
  rarity: 'green' | 'purple' | 'gold';
  cost: Materials;
}

export interface Profile extends Materials {
  healthLevel: number;
  magnetLevel: number;
  weapons: WeaponId[];
  characters: CharacterId[];
  trail: boolean;
  selectedWeapon: WeaponId;
  selectedCharacter: CharacterId;
  tracked: TrackId;
  stats: { runs: number; extracts: number; bossKills: number; kills: number };
  bagLevel: number;
  modules: ModuleId[];
  equippedModules: ModuleId[];
  moduleLevels: Partial<Record<ModuleId, number>>;
}

export interface Recipe {
  id: RecipeId;
  title: string;
  description: string;
  icon: string;
  cost: Materials;
  maxLevel?: number;
}
