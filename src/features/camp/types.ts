import type {
  CharacterId,
  ModuleId,
  Profile,
  RecipeId,
  TrackId,
  WeaponId,
} from '../../profile/types';
export type CampProps = {
  profile: Profile;
  onBuy: (id: RecipeId) => void;
  onSelectWeapon: (id: WeaponId) => void;
  onSelectCharacter: (id: CharacterId) => void;
  onTrack: (id: TrackId) => void;
  onStart: () => void;
  onOpenHelp: () => void;
  onToggleModule: (id: ModuleId) => void;
  onUnlockModule: (id: ModuleId) => void;
  onUpgradeModule: (id: ModuleId) => void;
  onExpandBackpack: () => void;
};
export type Tab = 'action' | 'equipment' | 'workshop';
