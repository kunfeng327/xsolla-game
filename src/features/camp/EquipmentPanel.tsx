import {
  ArrowRight,
  Backpack,
  Check,
  CheckCircle2,
  Cpu,
  Crosshair,
  LockKeyhole,
  Target,
} from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import { MODULES } from '../../config/catalog';
import { canPay, moduleUpgradeCost } from '../../profile/growth';
import type { Materials, RecipeId, TrackId } from '../../profile/types';
import './camp.css';
import { effect, missing, moduleIcons, weaponInfo } from './campPresentation';
import { Capacity } from './Capacity';
import { Cost } from './Cost';
import type { CampProps, Tab } from './types';

type Props = Pick<
  CampProps,
  | 'profile'
  | 'onSelectWeapon'
  | 'onSelectCharacter'
  | 'onToggleModule'
  | 'onUnlockModule'
  | 'onUpgradeModule'
  | 'onExpandBackpack'
> & {
  tab: Tab;
  setTab: Dispatch<SetStateAction<Tab>>;
  used: number;
  capacity: number;
  expansion: Materials;
  track: (id: TrackId) => void;
};
export default function EquipmentPanel({
  profile,
  onSelectWeapon,
  onSelectCharacter,
  onToggleModule,
  onUnlockModule,
  onUpgradeModule,
  onExpandBackpack,
  tab,
  setTab,
  used,
  capacity,
  expansion,
  track,
}: Props) {
  return (
    <section
      id="camp-panel-equipment"
      className="camp-tab-section"
      role="tabpanel"
      aria-labelledby="camp-tab-equipment"
      hidden={tab !== 'equipment'}
    >
      <div className="camp-section-heading">
        <div>
          <span className="camp-eyebrow">行动之前，选择打法</span>
          <h1>装备整备</h1>
          <p>模块占格子，战利品独立存放。所有配置在下一局生效。</p>
        </div>
        <button className="camp-outline-button" onClick={() => setTab('action')}>
          返回行动 <ArrowRight size={17} />
        </button>
      </div>
      <div className="camp-equipment-top">
        <div>
          <h2>起始武器</h2>
          <div className="camp-weapon-options">
            {weaponInfo.map(({ id, title, subtitle, Icon }) => {
              const owned = profile.weapons.includes(id),
                selected = profile.selectedWeapon === id;
              return (
                <button
                  className={`camp-weapon-option ${selected ? 'is-selected' : ''}`}
                  key={id}
                  aria-pressed={selected}
                  onClick={() => (owned ? onSelectWeapon(id) : track(id as RecipeId))}
                >
                  <Icon size={23} />
                  <span>
                    <strong>{title}</strong>
                    <small>{subtitle}</small>
                  </span>
                  {selected ? <Check size={17} /> : !owned ? <LockKeyhole size={17} /> : null}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <h2>行动干员</h2>
          <div className="camp-character-options">
            {(
              [
                {
                  id: 'gunner',
                  label: '先锋枪手',
                  description: '稳定火力，基础生命110',
                  Icon: Crosshair,
                },
                {
                  id: 'engineer',
                  label: '无人机工程师',
                  description: '额外无人机与20初始护盾',
                  Icon: Cpu,
                },
              ] as const
            ).map(({ id, label, description, Icon }) => {
              const selected = profile.selectedCharacter === id,
                owned = profile.characters.includes(id);
              return (
                <button
                  key={id}
                  className={`camp-character-option ${selected ? 'is-selected' : ''}`}
                  aria-pressed={selected}
                  onClick={() => (owned ? onSelectCharacter(id) : track('engineer'))}
                >
                  <Icon size={23} />
                  <span>
                    <strong>{label}</strong>
                    <small>{description}</small>
                  </span>
                  {selected ? <Check size={17} /> : !owned ? <LockKeyhole size={17} /> : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="camp-pack-panel">
        <div>
          <div className="camp-slot-heading">
            <Backpack size={21} />
            <span>出战容量</span>
            <b>
              {used}
              <small> / {capacity} 格</small>
            </b>
          </div>
          <p>绿 / 紫 / 金模块占 1 / 2 / 3 格，已拥有模块可自由换装。</p>
        </div>
        <Capacity profile={profile} />
        <div className="camp-expansion">
          {profile.bagLevel < 2 ? (
            <>
              <Cost profile={profile} cost={expansion} />
              <small>{missing(profile, expansion)}</small>
              <div>
                <button className="camp-outline-button" onClick={() => track('bag')}>
                  <Target size={15} />
                  追踪扩容
                </button>
                <button
                  className="camp-buy"
                  disabled={!canPay(profile, expansion)}
                  onClick={onExpandBackpack}
                >
                  扩容到 {capacity + 1} 格
                </button>
              </div>
            </>
          ) : (
            <span className="camp-complete-label">
              <CheckCircle2 size={17} />
              已达到六格容量
            </span>
          )}
        </div>
      </div>
      <div className="camp-module-grid">
        {MODULES.map((item) => {
          const owned = profile.modules.includes(item.id),
            equipped = profile.equippedModules.includes(item.id),
            level = profile.moduleLevels[item.id] ?? 0,
            upgrade = moduleUpgradeCost(profile, item.id),
            fits = used + item.slots <= capacity,
            Icon = moduleIcons[item.id];
          return (
            <article
              key={item.id}
              className={`camp-module rarity-${item.rarity} ${equipped ? 'is-equipped' : ''}`}
            >
              <div className="camp-module-heading">
                <span className="camp-module-icon">
                  <Icon size={25} />
                </span>
                <div>
                  <span>
                    {item.rarity === 'green' ? '标准' : item.rarity === 'purple' ? '进阶' : '核心'}
                    模块 · {item.slots} 格
                  </span>
                  <h3>{item.name}</h3>
                </div>
                <b>{owned ? `${level}/2 强化` : '未解锁'}</b>
              </div>
              <p className="camp-module-effect">{effect(item.id, level)}</p>
              {owned ? (
                <>
                  <button
                    className="camp-equip-button"
                    aria-pressed={equipped}
                    disabled={!equipped && !fits}
                    onClick={() => onToggleModule(item.id)}
                  >
                    {equipped ? (
                      <>
                        <Check size={17} />
                        已装配 · 卸下
                      </>
                    ) : fits ? (
                      '装入出战背包'
                    ) : (
                      `需要 ${item.slots} 格，请先卸下其他模块`
                    )}
                  </button>
                  <div className="camp-module-footer">
                    {level < 2 ? (
                      <>
                        <small>强化后：{effect(item.id, level + 1)}</small>
                        <Cost cost={upgrade} profile={profile} />
                        <div>
                          <span>{missing(profile, upgrade)}</span>
                          <button
                            className="camp-buy"
                            disabled={!canPay(profile, upgrade)}
                            onClick={() => onUpgradeModule(item.id)}
                          >
                            强化
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="camp-complete-label">
                        <CheckCircle2 size={16} />
                        强化已满 · 占格不变
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="camp-module-footer">
                  <Cost cost={item.cost} profile={profile} />
                  <small>{missing(profile, item.cost)}</small>
                  <div>
                    <button className="camp-text-button" onClick={() => track(`module:${item.id}`)}>
                      <Target size={15} />
                      追踪解锁
                    </button>
                    <button
                      className="camp-buy"
                      disabled={!canPay(profile, item.cost)}
                      onClick={() => onUnlockModule(item.id)}
                    >
                      永久解锁
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
