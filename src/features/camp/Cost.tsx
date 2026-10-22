import type { Materials, Profile } from '../../profile/types';
import { materials } from './campPresentation';
export function Cost({ profile, cost }: { profile: Profile; cost: Materials }) {
  return (
    <div className="camp-cost">
      {materials
        .filter((m) => cost[m.key] > 0)
        .map(({ key, label, Icon }) => (
          <span key={key} className={profile[key] >= cost[key] ? 'is-enough' : ''}>
            <Icon size={15} />
            <b>{cost[key]}</b>
            {label}
          </span>
        ))}
    </div>
  );
}
