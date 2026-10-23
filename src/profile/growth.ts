import { MODULES, RECIPES } from '../config/catalog';
import { moduleCapacity } from './loadout';
import type { Materials, ModuleId, Profile, Recipe, RecipeId, TrackedGoal } from './types';
export function canPay(p: Materials, cost: Materials): boolean {
  return p.alloy >= cost.alloy && p.chips >= cost.chips && p.cores >= cost.cores;
}

function pay(p: Profile, cost: Materials): Profile {
  return {
    ...p,
    alloy: p.alloy - cost.alloy,
    chips: p.chips - cost.chips,
    cores: p.cores - cost.cores,
  };
}

export function unlockModule(p: Profile, id: ModuleId): Profile | null {
  const item = MODULES.find((m) => m.id === id);
  if (!item || p.modules.includes(id) || !canPay(p, item.cost)) return null;
  return { ...pay(p, item.cost), modules: [...p.modules, id] };
}

export function moduleUpgradeCost(p: Profile, id: ModuleId): Materials {
  const level = p.moduleLevels[id] ?? 0;
  const slots = MODULES.find((m) => m.id === id)?.slots ?? 1;
  return {
    alloy: 20 * (level + 1),
    chips: slots === 1 ? level : level + 1,
    cores: slots === 3 && level === 1 ? 1 : 0,
  };
}

export function upgradeModule(p: Profile, id: ModuleId): Profile | null {
  const level = p.moduleLevels[id] ?? 0,
    cost = moduleUpgradeCost(p, id);
  if (!p.modules.includes(id) || level >= 2 || !canPay(p, cost)) return null;
  return { ...pay(p, cost), moduleLevels: { ...p.moduleLevels, [id]: level + 1 } };
}

export function backpackCost(p: Profile): Materials {
  return {
    alloy: 45 * (p.bagLevel + 1),
    chips: 2 * (p.bagLevel + 1),
    cores: p.bagLevel === 1 ? 1 : 0,
  };
}

export function expandBackpack(p: Profile): Profile | null {
  const cost = backpackCost(p);
  return p.bagLevel >= 2 || !canPay(p, cost) ? null : { ...pay(p, cost), bagLevel: p.bagLevel + 1 };
}

export function getRecipe(id: RecipeId): Recipe {
  return RECIPES.find((x) => x.id === id)!;
}

export function getRecipeState(p: Profile, id: RecipeId) {
  const r = getRecipe(id);
  const level = id === 'health' ? p.healthLevel : id === 'magnet' ? p.magnetLevel : 0;
  const owned =
    id === 'scatter' || id === 'drone'
      ? p.weapons.includes(id)
      : id === 'engineer'
        ? p.characters.includes('engineer')
        : id === 'trail'
          ? p.trail
          : level > 0;
  const maxed = r.maxLevel ? level >= r.maxLevel : owned;
  const cost = { ...r.cost, alloy: r.cost.alloy * (r.maxLevel ? level + 1 : 1) };
  return {
    owned,
    level,
    maxed,
    canAfford: !maxed && p.alloy >= cost.alloy && p.chips >= cost.chips && p.cores >= cost.cores,
    cost,
  };
}

export function getTrackedGoal(p: Profile): TrackedGoal {
  if (p.tracked === 'bag') {
    const cost = backpackCost(p),
      complete = p.bagLevel >= 2;
    return {
      id: 'bag',
      title: complete ? '六格战术背包' : `扩容至 ${moduleCapacity(p) + 1} 格`,
      description: '多一个模块位置，让防护、穿甲和搜集能力组成新的出战搭配。',
      cost,
      complete,
      canAfford: !complete && canPay(p, cost),
      kind: 'bag',
    };
  }
  if (p.tracked.startsWith('module:')) {
    const id = p.tracked.slice(7) as ModuleId,
      item = MODULES.find((m) => m.id === id);
    if (item) {
      const complete = p.modules.includes(id);
      return {
        id: p.tracked,
        title: item.name,
        description: item.description,
        cost: item.cost,
        complete,
        canAfford: !complete && canPay(p, item.cost),
        kind: 'module',
      };
    }
  }
  const item = RECIPES.find((r) => r.id === p.tracked) || RECIPES[2],
    state = getRecipeState(p, item.id);
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    cost: state.cost,
    complete: state.maxed,
    canAfford: state.canAfford,
    kind: 'recipe',
  };
}

export function purchase(p: Profile, id: RecipeId): Profile | null {
  const s = getRecipeState(p, id);
  if (!s.canAfford) return null;
  const next: Profile = {
    ...p,
    alloy: p.alloy - s.cost.alloy,
    chips: p.chips - s.cost.chips,
    cores: p.cores - s.cost.cores,
  };
  if (id === 'health') next.healthLevel++;
  if (id === 'magnet') next.magnetLevel++;
  if (id === 'scatter' || id === 'drone') {
    next.weapons = [...p.weapons, id];
    next.selectedWeapon = id;
  }
  if (id === 'engineer') {
    next.characters = [...p.characters, 'engineer'];
    next.selectedCharacter = 'engineer';
  }
  if (id === 'trail') next.trail = true;
  if (next.tracked === id && getRecipeState(next, id).maxed) {
    next.tracked =
      (['scatter', 'drone', 'engineer', 'trail', 'health', 'magnet'] as RecipeId[]).find(
        (target) => !getRecipeState(next, target).maxed,
      ) ?? id;
  }
  return next;
}
