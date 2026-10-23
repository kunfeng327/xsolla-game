import { Backpack, CircleHelp, Crosshair, Target, Wrench } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { useState } from 'react';
import { backpackCost, getTrackedGoal } from '../../profile/growth';
import { moduleCapacity, moduleUsage } from '../../profile/loadout';
import type { ModuleId, RecipeId, TrackId } from '../../profile/types';
import ActionPanel from './ActionPanel';
import './camp.css';
import { materials } from './campPresentation';
import EquipmentPanel from './EquipmentPanel';
import type { CampProps, Tab } from './types';
import WorkshopPanel from './WorkshopPanel';

export default function Camp(props: CampProps) {
  const {
    profile,
    onBuy,
    onSelectWeapon,
    onSelectCharacter,
    onTrack,
    onStart,
    onOpenHelp,
    onToggleModule,
    onUnlockModule,
    onUpgradeModule,
    onExpandBackpack,
  } = props;
  const [tab, setTab] = useState<Tab>('action');
  const first = profile.stats.runs === 0,
    goal = getTrackedGoal(profile),
    used = moduleUsage(profile.equippedModules),
    capacity = moduleCapacity(profile),
    expansion = backpackCost(profile);
  function track(id: TrackId) {
    onTrack(id);
    setTab('action');
  }
  function redeemGoal() {
    if (goal.kind === 'bag') onExpandBackpack();
    else if (goal.kind === 'module') onUnlockModule(goal.id.slice(7) as ModuleId);
    else onBuy(goal.id as RecipeId);
  }
  function tabKeyboard(event: KeyboardEvent<HTMLElement>) {
    const order: Tab[] = ['action', 'equipment', 'workshop'];
    const index = order.indexOf(tab);
    let next: Tab;
    if (event.key === 'ArrowRight') next = order[(index + 1) % 3];
    else if (event.key === 'ArrowLeft') next = order[(index + 2) % 3];
    else if (event.key === 'Home') next = 'action';
    else if (event.key === 'End') next = 'workshop';
    else return;
    event.preventDefault();
    setTab(next);
    event.currentTarget.querySelector<HTMLButtonElement>(`#camp-tab-${next}`)?.focus();
  }
  return (
    <div className="camp camp-v3">
      <header className="camp-header">
        <div className="camp-brand">
          <span className="camp-brand-mark">
            <Crosshair size={28} />
          </span>
          <div>
            <strong>星域突围</strong>
            <small>STARBREAK / 边境营地 07</small>
          </div>
        </div>
        <nav className="camp-nav" role="tablist" aria-label="营地功能" onKeyDown={tabKeyboard}>
          {(
            [
              { id: 'action', label: '行动', Icon: Target },
              { id: 'equipment', label: '装备', Icon: Backpack },
              { id: 'workshop', label: '工坊', Icon: Wrench },
            ] as const
          ).map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              id={`camp-tab-${id}`}
              role="tab"
              aria-controls={`camp-panel-${id}`}
              aria-selected={tab === id}
              tabIndex={tab === id ? 0 : -1}
              onClick={() => setTab(id)}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </nav>
        <div className="camp-wallet" aria-label="仓库物资">
          {materials.map(({ key, label, Icon }) => (
            <div className={`camp-resource resource-${key}`} key={key}>
              <Icon size={17} />
              <span>
                <small>{label}</small>
                <b>{profile[key].toLocaleString()}</b>
              </span>
            </div>
          ))}
        </div>
        <button className="camp-help" onClick={onOpenHelp} aria-label="查看行动指南">
          <CircleHelp size={21} />
          <span>指南</span>
        </button>
      </header>
      <main className="camp-main">
        <ActionPanel
          profile={profile}
          onStart={onStart}
          tab={tab}
          setTab={setTab}
          first={first}
          goal={goal}
          used={used}
          capacity={capacity}
          redeemGoal={redeemGoal}
        />
        <EquipmentPanel
          profile={profile}
          onSelectWeapon={onSelectWeapon}
          onSelectCharacter={onSelectCharacter}
          onToggleModule={onToggleModule}
          onUnlockModule={onUnlockModule}
          onUpgradeModule={onUpgradeModule}
          onExpandBackpack={onExpandBackpack}
          tab={tab}
          setTab={setTab}
          used={used}
          capacity={capacity}
          expansion={expansion}
          track={track}
        />
        <WorkshopPanel profile={profile} onBuy={onBuy} tab={tab} setTab={setTab} track={track} />
        <footer className="camp-footer">
          <span>
            <i />
            营地记录 <b>{profile.stats.runs}</b> 次行动 · <b>{profile.stats.extracts}</b> 次撤离 ·{' '}
            <b>{profile.stats.bossKills}</b> 次击败守卫
          </span>
          <span>本地存档已启用 · 前端试玩原型</span>
        </footer>
      </main>
    </div>
  );
}
