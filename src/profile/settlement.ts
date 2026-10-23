import type { Materials, Profile } from './types';

/** Same demo reward rules: extract all, recover 20% alloy on failure. */
export function calculateRunRewards(collected: Materials, success: boolean): Materials {
  return {
    alloy: success ? collected.alloy : Math.floor(collected.alloy * 0.2),
    chips: success ? collected.chips : 0,
    cores: success ? collected.cores : 0,
  };
}
export interface SettlementRewards extends Materials {
  success: boolean;
  bossKilled: boolean;
  kills: number;
}
export function applySettlement(p: Profile, r: SettlementRewards): Profile {
  return {
    ...p,
    alloy: p.alloy + r.alloy,
    chips: p.chips + r.chips,
    cores: p.cores + r.cores,
    stats: {
      runs: p.stats.runs + 1,
      extracts: p.stats.extracts + (r.success ? 1 : 0),
      bossKills: p.stats.bossKills + (r.bossKilled ? 1 : 0),
      kills: p.stats.kills + r.kills,
    },
  };
}
