import { Hexagon, LockKeyhole } from 'lucide-react';
import { MODULES } from '../../config/catalog';
import { moduleCapacity, moduleUsage } from '../../profile/loadout';
import type { Profile } from '../../profile/types';
export function Capacity({ profile }: { profile: Profile }) {
  const occupied = profile.equippedModules.flatMap((id) =>
    Array.from(
      { length: MODULES.find((m) => m.id === id)!.slots },
      () => MODULES.find((m) => m.id === id)!,
    ),
  );
  return (
    <div
      className="camp-slots"
      role="meter"
      aria-label="战术模块容量"
      aria-valuenow={moduleUsage(profile.equippedModules)}
      aria-valuemin={0}
      aria-valuemax={moduleCapacity(profile)}
    >
      {Array.from({ length: 6 }, (_, i) => {
        const item = occupied[i];
        return (
          <span
            key={i}
            className={
              i >= moduleCapacity(profile)
                ? 'is-locked'
                : item
                  ? `is-filled rarity-${item.rarity}`
                  : 'is-empty'
            }
            aria-label={
              i >= moduleCapacity(profile) ? '扩容后开放' : item ? item.name : '空闲模块格'
            }
            title={i >= moduleCapacity(profile) ? '扩容后开放' : item ? item.name : '空闲模块格'}
          >
            {i >= moduleCapacity(profile) ? (
              <LockKeyhole size={13} />
            ) : item ? (
              <Hexagon size={17} />
            ) : (
              <span>+</span>
            )}
          </span>
        );
      })}
    </div>
  );
}
