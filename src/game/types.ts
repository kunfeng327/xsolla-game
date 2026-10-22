import type { Point, Site } from './world/chunks';

export type Weapon = 'pulse' | 'scatter' | 'drone';

export type Character = 'gunner' | 'engineer';

export type UpgradeChoice = { id: string; name: string; description: string; kind: string };

export type ContractChoice = {
  id: 'stable' | 'overload' | 'extreme';
  name: string;
  description: string;
  odds: string;
  reward: string;
  risk: string;
};

export type GameHud = {
  hp: number;
  maxHp: number;
  shield: number;
  time: number;
  xp: number;
  xpNeeded: number;
  level: number;
  kills: number;
  alloy: number;
  chips: number;
  cores: number;
  extractionOpen: boolean;
  extractProgress: number;
  bossHp: number;
  bossMaxHp: number;
  status: string;
  dashReady: boolean;
  nearExtract: boolean;
  events: number;
  danger: number;
  fragments: number;
  contracts: { name: string; description: string; positive: boolean }[];
  combo: number;
  comboTime: number;
  supplies: { id: string; name: string; remaining: number }[];
  interaction: string;
  target: { name: string; distance: number; direction: string } | null;
  bossRevealed: boolean;
  bossActive: boolean;
  contractCount: number;
  bossKilled: boolean;
  explored: number;
  modules: string[];
  message: string;
  rescueAvailable: boolean;
  tutorialStep: string;
  damageMultiplier: number;
  attackMultiplier: number;
  moveMultiplier: number;
  playerSpeed: number;
  pressure: number;
};

export type GameResult = {
  success: boolean;
  reason: 'extracted' | 'dead' | 'timeout';
  alloy: number;
  chips: number;
  cores: number;
  kills: number;
  time: number;
  level: number;
  bossKilled: boolean;
  collected: { alloy: number; chips: number; cores: number };
  events: number;
  contracts: number;
  maxCombo: number;
  explored: number;
  lastDamageSource?: string;
};

export type GameOptions = {
  weapon: Weapon;
  character: Character;
  healthLevel: number;
  magnetLevel: number;
  trail: boolean;
  modules?: string[];
  moduleLevels?: Partial<Record<string, number>>;
  objective?: Objective;
  sound?: boolean;
  screenShake?: boolean;
  onHud: (hud: GameHud) => void;
  onUpgrade: (choices: UpgradeChoice[]) => void;
  onFinish: (result: GameResult) => void;
  onContract: (choices: ContractChoice[]) => void;
};

export type Objective = 'resource' | 'boss' | 'extract' | 'terminal';

export type V = Point;

export type PendingEnemy = V & { type: EnemyKind; delay: number; noLoot: boolean };

export type DeathEffect = V & {
  kind: EnemyKind;
  r: number;
  life: number;
  max: number;
  angle: number;
};

export type EnemyKind = 'normal' | 'shooter' | 'lobber' | 'teleporter' | 'boss';

export type Enemy = V & {
  id: number;
  type: EnemyKind;
  hp: number;
  max: number;
  r: number;
  speed: number;
  hit: number;
  shot: number;
  phase: number;
  mode: string;
  timer: number;
  aim: number;
  tx: number;
  ty: number;
  pattern: number;
  guard?: string;
  path?: V;
  pathTime: number;
  noLoot?: boolean;
};

export type Bullet = V & {
  vx: number;
  vy: number;
  damage: number;
  life: number;
  hostile: boolean;
  r: number;
  color: string;
  hits: number;
  hitIds: Set<number>;
};

export type PickupKind = 'xp' | 'fragment' | 'core' | 'heal' | 'shield' | 'overcharge' | 'speed';

export type Pickup = V & {
  id?: string;
  type: PickupKind;
  amount: number;
  phase: number;
  life: number;
};

export type Particle = V & {
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
};

export type FloatText = V & {
  text: string;
  color: string;
  life: number;
  max: number;
  size: number;
};

export type Warning = V & { r: number; timer: number; max: number; damage: number; color: string };

export type EventState = { status: 'idle' | 'active' | 'done'; guards: number[] };

export type InteractSite = Omit<Site, 'kind'> & { kind: Site['kind'] | 'boss' };
