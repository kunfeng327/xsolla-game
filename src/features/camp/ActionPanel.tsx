import {
  ArrowRight,
  ArrowUpRight,
  Backpack,
  CheckCircle2,
  ChevronRight,
  Crosshair,
  Radio,
  Shield,
  Sparkles,
  Target,
} from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import { HANGAR_IMAGE } from '../../assets/hangar';
import { CHARACTER_NAMES, MODULES, WEAPON_NAMES } from '../../config/catalog';
import type { TrackedGoal } from '../../profile/types';
import './camp.css';
import { effect, materials, missing, moduleIcons, weaponInfo } from './campPresentation';
import { Capacity } from './Capacity';
import { Operative } from './Operative';
import { RewardPreview } from './RewardPreview';
import type { CampProps, Tab } from './types';

type Props = Pick<CampProps, 'profile' | 'onStart'> & {
  tab: Tab;
  setTab: Dispatch<SetStateAction<Tab>>;
  first: boolean;
  goal: TrackedGoal;
  used: number;
  capacity: number;
  redeemGoal: () => void;
};
export default function ActionPanel({
  profile,
  onStart,
  tab,
  setTab,
  first,
  goal,
  used,
  capacity,
  redeemGoal,
}: Props) {
  return (
    <section
      id="camp-panel-action"
      role="tabpanel"
      aria-labelledby="camp-tab-action"
      hidden={tab !== 'action'}
    >
      <div className="camp-statusline">
        <span>
          <i />
          营地整备完成
        </span>
        <span>无限探索 · 主动撤离 · 单人行动</span>
      </div>
      <div className="camp-home-grid">
        <aside className="camp-loadout-summary">
          <div className="camp-panel-kicker">
            出战配置 <span>已就绪</span>
          </div>
          <div className="camp-current-weapon">
            <Crosshair size={25} />
            <div>
              <small>当前武器</small>
              <strong>{WEAPON_NAMES[profile.selectedWeapon]}</strong>
            </div>
          </div>
          <p className="camp-loadout-description">
            {weaponInfo.find((w) => w.id === profile.selectedWeapon)!.subtitle}
          </p>
          <div className="camp-summary-divider" />
          <div className="camp-slot-heading">
            <Backpack size={17} />
            <span>战术背包</span>
            <b>
              {used}
              <small> / {capacity} 格</small>
            </b>
          </div>
          <Capacity profile={profile} />
          <div className="camp-selected-modules">
            {profile.equippedModules.length ? (
              profile.equippedModules.map((id) => {
                const item = MODULES.find((m) => m.id === id)!,
                  Icon = moduleIcons[id];
                return (
                  <div key={id} className={`rarity-${item.rarity}`}>
                    <Icon size={18} />
                    <span>
                      <strong>{item.name}</strong>
                      <small>{effect(id, profile.moduleLevels[id] ?? 0)}</small>
                    </span>
                  </div>
                );
              })
            ) : (
              <p>未装配模块，基础武器仍可直接出战。</p>
            )}
          </div>
          <button className="camp-outline-button" onClick={() => setTab('equipment')}>
            调整装备 <ChevronRight size={17} />
          </button>
          <div className="camp-preserved">
            <Shield size={15} />
            <span>已解锁装备与模块永久保留</span>
          </div>
        </aside>
        <section className="camp-scene" aria-label="干员出发机库">
          <img
            className="camp-scene-background"
            src={HANGAR_IMAGE}
            alt="青色灯光照亮的边境机库与远处矿区"
          />
          <div className="camp-scene-architecture" />
          <div className="camp-scene-floor" />
          <div className="camp-scene-scan" />
          <div className="camp-scene-title">
            <span>边境行动 / FRONTIER OPERATIONS</span>
            <h1>
              整装。
              <br />
              向未知出发。
            </h1>
          </div>
          <div className="camp-scene-location">
            <span>异常矿区</span>
            <b>07</b>
          </div>
          <Operative profile={profile} />
          <div className="camp-operator-name">
            <span className="camp-ready-dot" />
            <div>
              <strong>{CHARACTER_NAMES[profile.selectedCharacter]}</strong>
              <small>
                {profile.selectedWeapon === 'scatter'
                  ? '近距离突破'
                  : profile.selectedWeapon === 'drone'
                    ? '环绕战术协同'
                    : '稳定火力 · 自动攻击'}
              </small>
            </div>
          </div>
          <div className="camp-scene-note">
            <Radio size={15} />
            接应站在线
          </div>
        </section>
        <aside className="camp-mission-card">
          <div className="camp-panel-kicker">
            {goal.canAfford ? '营地成长' : first ? '首次边境行动' : '下一次行动'}
            <span className={goal.canAfford ? 'is-ready' : ''}>
              {goal.complete ? '已达成' : goal.canAfford ? '可以兑换' : '准备出发'}
            </span>
          </div>
          <h2>{first ? '带回你的第一份收获。' : '带着目标，再出发。'}</h2>
          <p className="camp-mission-copy">
            {first
              ? '靠近金色资源仓，按 E 启动。清理两个资源仓后，活着带回物资。'
              : '完成资源事件，选择继续深入，或带着收获主动撤离。'}
          </p>
          <div className="camp-goal-header">
            <Target size={17} />
            <span>{goal.complete ? '追踪目标已完成' : '本次成长目标'}</span>
          </div>
          <div className="camp-goal-title">
            <h3>{goal.title}</h3>
            <button
              className="camp-text-button"
              onClick={() => setTab('workshop')}
              aria-label="更换成长目标"
            >
              <ArrowUpRight size={16} />
              更换
            </button>
          </div>
          <RewardPreview id={goal.id} />
          <p className="camp-goal-effect">{goal.description}</p>
          <div className="camp-goal-progress">
            {materials
              .filter((m) => goal.cost[m.key] > 0)
              .map(({ key, label, Icon }) => (
                <div key={key}>
                  <div>
                    <span>
                      <Icon size={14} />
                      {label}
                    </span>
                    <b>
                      {Math.min(profile[key], goal.cost[key])}
                      <small> / {goal.cost[key]}</small>
                    </b>
                  </div>
                  <div className="camp-progress">
                    <i
                      style={{
                        width: `${Math.min(100, (profile[key] / goal.cost[key]) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
          </div>
          <p className={`camp-missing ${goal.canAfford ? 'is-ready' : ''}`}>
            {goal.complete ? '到工坊选择下一个目标' : missing(profile, goal.cost)}
          </p>
          {goal.canAfford && (
            <button className="camp-goal-redeem" onClick={redeemGoal}>
              <Sparkles size={17} />
              {goal.kind === 'bag'
                ? '立即扩容'
                : goal.kind === 'module'
                  ? '解锁模块'
                  : '兑换并应用'}
              <ArrowRight size={17} />
            </button>
          )}
          <div className="camp-launch-zone">
            <div>
              <CheckCircle2 size={16} />
              {first ? '基础装备已配置，可直接出发' : '当前配置已保存，出发即生效'}
            </div>
            <button className="camp-launch" onClick={onStart}>
              <Crosshair size={21} />
              <span>{first ? '首次出击' : '进入异常矿区'}</span>
              <ArrowRight size={22} />
            </button>
            <span className="camp-free-entry">无需入场费 · 没有整局倒计时</span>
          </div>
        </aside>
      </div>
      <div className="camp-home-bottom">
        <div className="camp-action-path">
          <span>
            <b>01</b>搜资源仓
          </span>
          <ChevronRight size={15} />
          <span>
            <b>02</b>
            {goal.cost.cores > 0 ? '挑战守卫并撤离' : '接应站撤离'}
          </span>
          <ChevronRight size={15} />
          <span>
            <b>03</b>回营地解锁
          </span>
        </div>
        <div className="camp-controls">
          <span>
            <kbd>WASD</kbd>移动
          </span>
          <span>
            <kbd>空格</kbd>冲刺
          </span>
          <span>
            <kbd>E</kbd>交互
          </span>
          <span>自动攻击</span>
        </div>
      </div>
    </section>
  );
}
