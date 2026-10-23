import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Backpack,
  Box,
  ChevronRight,
  Crosshair,
  Flame,
  Gauge,
  Heart,
  Hexagon,
  Info,
  Layers,
  LogOut,
  Maximize2,
  Package,
  Pause,
  Radio,
  Settings2,
  Shield,
  SkipForward,
  Skull,
  Sparkles,
  Target,
  Volume2,
  VolumeX,
  Wind,
  Zap,
} from 'lucide-react';
import type { CSSProperties, Dispatch, RefObject, SetStateAction } from 'react';
import { CHARACTER_NAMES, MODULES, WEAPON_NAMES } from '../../config/catalog';
import { StarbreakGame } from '../../game/core/StarbreakGame';
import type { GameHud } from '../../game/types';
import type { Profile } from '../../profile/types';
import type { Preferences } from '../../storage/battlePreferences';
import { clock, goals, moduleIcons, type Goal, type Menu } from './battlePresentation';

interface HudProps {
  hud: GameHud | null;
  profile: Profile;
  prefs: Preferences;
  goal: Goal;
  speed: number;
  setMenu: Dispatch<SetStateAction<Menu>>;
  setSpeed: Dispatch<SetStateAction<number>>;
  track: (id: Goal) => void;
  audioToggle: () => void;
  fullscreen: () => void;
  engine: RefObject<StarbreakGame | null>;
  move: (key: string, active: boolean) => void;
}
export default function BattleHud({
  hud,
  profile,
  prefs,
  goal,
  speed,
  setMenu,
  setSpeed,
  track,
  audioToggle,
  fullscreen,
  engine,
  move,
}: HudProps) {
  const h = hud,
    alive = h?.hp ?? 110,
    maxHp = h?.maxHp ?? 110;
  const tutorial = h?.tutorialStep || '找到金色资源仓，靠近后按 E 启动。';
  return (
    <>
      <header className="field-header">
        <div className="field-brand">
          <Crosshair size={26} />
          <div>
            <b>星域突围</b>
            <span>
              边境行动 <time>{clock(h?.time ?? 0)}</time>
            </span>
          </div>
        </div>
        <section className="field-navigation" aria-label="目标导航">
          <div className="field-target">
            <Target size={18} />
            <strong>{h?.target?.name || '探索异常矿区'}</strong>
            <span>
              {h?.target
                ? h.target.direction + ' · ' + Math.round(h.target.distance) + 'm'
                : '寻找资源事件'}
            </span>
          </div>
          <div className="field-goals">
            {goals.map(({ id, name, Icon }) => (
              <button
                key={id}
                className={goal === id ? 'selected' : ''}
                aria-pressed={goal === id}
                disabled={id === 'boss' && !h?.bossRevealed}
                title={id === 'boss' && !h?.bossRevealed ? '完成两个资源事件后揭示' : '追踪' + name}
                onClick={() => track(id)}
              >
                <Icon size={15} />
                {name}
              </button>
            ))}
          </div>
        </section>
        <div className="field-actions">
          <button
            className="field-icon-button"
            aria-label="退出本局"
            title="退出本局，返回营地"
            onClick={() => setMenu('exit')}
          >
            <LogOut size={20} />
          </button>
          <button
            className="field-icon-button"
            aria-label={prefs.sound ? '关闭音效' : '开启音效'}
            onClick={audioToggle}
          >
            {prefs.sound ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <button
            className="field-icon-button"
            aria-label="界面与反馈设置"
            onClick={() => setMenu('settings')}
          >
            <Settings2 size={20} />
          </button>
          <button
            className="field-icon-button field-fullscreen"
            aria-label="全屏"
            onClick={fullscreen}
          >
            <Maximize2 size={20} />
          </button>
          <button className="field-icon-button" aria-label="暂停" onClick={() => setMenu('pause')}>
            <Pause size={20} />
          </button>
        </div>
      </header>
      <section className="field-loot">
        <div className="field-label">
          <Package size={16} />
          待带出战利品
        </div>
        <div className="field-materials">
          <div>
            <Box size={18} />
            <b>{h?.alloy ?? 0}</b>
            <span>合金</span>
          </div>
          <div>
            <Layers size={18} />
            <b>{h?.chips ?? 0}</b>
            <span>芯片</span>
          </div>
          <div>
            <Sparkles size={18} />
            <b>{h?.cores ?? 0}</b>
            <span>核心</span>
          </div>
        </div>
        <div className="field-fragments">
          <Hexagon size={15} />
          <span>异常碎片</span>
          <b>
            {h?.fragments ?? 0}
            <small> / 10</small>
          </b>
        </div>
        <p>成功撤离后入库 · 碎片仅限本局</p>
      </section>
      <section className={'field-threat threat-' + (h?.danger ?? 0)}>
        <div className="field-label">
          <Radio size={16} />
          区域威胁 <b>{['低', '中', '高', '极高'][Math.min(h?.danger ?? 0, 3)]}</b>
        </div>
        <div className="field-threat-bars">
          {[0, 1, 2, 3].map((n) => (
            <i className={n <= (h?.danger ?? 0) ? 'filled' : ''} key={n} />
          ))}
        </div>
        <p>
          资源事件 <b>{h?.events ?? 0}</b>
          <span> / </span>揭示 Boss <b>{Math.min(h?.events ?? 0, 2)}/2</b>
        </p>
        <small>
          {h?.bossKilled
            ? '核心守卫已击败'
            : h?.bossRevealed
              ? 'Boss 可选，可随时先撤离'
              : '深入探索会遇到更强敌群'}
        </small>
      </section>
      {h?.message && (
        <div className="field-announcement" role="status" aria-live="polite">
          {h.message}
        </div>
      )}
      {h && h.bossHp > 0 && h.bossMaxHp > 0 && (
        <section className="field-boss">
          <div>
            <Skull size={18} />
            <b>矿区守卫者</b>
            <span>
              {Math.ceil(h.bossHp)} / {h.bossMaxHp}
            </span>
          </div>
          <div className="field-boss-track">
            <i style={{ width: (h.bossHp / h.bossMaxHp) * 100 + '%' }} />
          </div>
          <p>看预警躲避，利用后摇输出 · 离开据点可中止挑战</p>
        </section>
      )}
      {!!h?.combo && (
        <div className={'field-combo ' + (h.comboTime > 0 ? 'empowered' : '')}>
          <strong>{h.combo}</strong>
          <div>
            无伤连杀
            <span>
              {h.comboTime > 0 ? '亢奋 ' + Math.ceil(h.comboTime) + 's' : '10 连杀触发亢奋'}
            </span>
          </div>
        </div>
      )}
      <section className="field-status-zone" aria-label="角色效果">
        <div className="field-supplies">
          {h?.supplies.map((s) => {
            const Icon = s.id === 'speed' ? Wind : s.id === 'combo' ? Flame : Gauge;
            return (
              <button
                key={s.id}
                className={'field-buff buff-' + s.id}
                onClick={() => setMenu('effects')}
                aria-label={s.name + '，剩余' + Math.ceil(s.remaining) + '秒'}
              >
                <span
                  className="field-buff-ring"
                  style={
                    { '--buff-angle': Math.min(1, s.remaining / 8) * 360 + 'deg' } as CSSProperties
                  }
                >
                  <Icon size={23} />
                </span>
                <strong>{s.id === 'speed' ? '推进' : s.id === 'combo' ? '亢奋' : '超载'}</strong>
                <b>{Math.ceil(s.remaining)}s</b>
              </button>
            );
          })}
        </div>
        <button
          className="field-loadout"
          onClick={() => setMenu('effects')}
          aria-label="查看出战模块和本局效果"
        >
          <Backpack size={17} />
          {profile.equippedModules.map((id) => {
            const Icon = moduleIcons[id] || Hexagon;
            const spent = id === 'rescue' && h && !h.rescueAvailable;
            return (
              <span
                key={id}
                className={spent ? 'spent' : ''}
                title={MODULES.find((m) => m.id === id)?.name + (spent ? '：本局已耗尽' : '')}
              >
                <Icon size={20} />
                {spent && <small>已用</small>}
              </span>
            );
          })}
          <Info size={14} />
          <small>状态</small>
        </button>
        <div className="field-contracts">
          {h?.contracts.map((c, i) => (
            <button
              className={c.positive ? 'positive' : 'negative'}
              key={i}
              onClick={() => setMenu('effects')}
            >
              <Sparkles size={13} />
              {c.name}
            </button>
          ))}
        </div>
      </section>
      <div className="field-objective-hint">
        <Target size={15} />
        <span>{tutorial}</span>
      </div>
      {h?.extractProgress ? (
        <div className="field-extraction">
          <div>
            <Radio size={23} />
            <strong>接应抵达中</strong>
            <b>{Math.max(0, Math.ceil((1 - h.extractProgress) * 10))}s</b>
          </div>
          <p>留在圈内移动防守，离开会取消接应</p>
          <div className="field-extraction-track">
            <i style={{ width: h.extractProgress * 100 + '%' }} />
          </div>
        </div>
      ) : h?.interaction ? (
        <button className="field-interact" onClick={() => engine.current?.interact()}>
          <kbd>E</kbd>
          <span>{h.interaction.replace(/^E\s*/, '')}</span>
          <ChevronRight size={18} />
        </button>
      ) : null}
      <section className="field-vitals">
        <div className="field-vital-heading">
          <span className="field-avatar">
            <Crosshair size={24} />
          </span>
          <div>
            <strong>{CHARACTER_NAMES[profile.selectedCharacter]}</strong>
            <small>{WEAPON_NAMES[profile.selectedWeapon]}</small>
          </div>
          <b>Lv.{h?.level ?? 1}</b>
        </div>
        <div className="field-hp">
          <Heart size={17} />
          <div>
            <i style={{ width: Math.max(0, alive / maxHp) * 100 + '%' }} />
          </div>
          <strong>
            {Math.ceil(alive)}
            <small> / {maxHp}</small>
          </strong>
        </div>
        <div className="field-shield">
          <Shield size={14} />
          {Math.ceil(h?.shield ?? 0)} 护盾<span>击杀 {h?.kills ?? 0}</span>
        </div>
        <div className="field-xp">
          <i style={{ width: Math.min(100, ((h?.xp ?? 0) / (h?.xpNeeded ?? 1)) * 100) + '%' }} />
        </div>
        <div className="field-dash">
          <kbd>空格</kbd>
          <Zap size={15} />
          <span>{h?.dashReady ? '冲刺就绪' : '冲刺冷却'}</span>
          <kbd>E</kbd>
          <span>交互</span>
        </div>
      </section>
      <div className="field-speed">
        <button
          onClick={() => {
            const n = speed === 1 ? 2 : speed === 2 ? 3 : 1;
            setSpeed(n);
            engine.current?.setSpeed(n);
          }}
          title="同时加快所有移动、攻击与效果计时"
        >
          <SkipForward size={15} />
          {speed}× 演示速度
        </button>
      </div>
      <div className="field-touch">
        <div className="field-dpad">
          {(['up', 'left', 'down', 'right'] as const).map((d, i) => {
            const Icon = [ArrowUp, ArrowLeft, ArrowDown, ArrowRight][i];
            return (
              <button
                key={d}
                className={'dir-' + d}
                aria-label={'向' + { up: '上', left: '左', down: '下', right: '右' }[d] + '移动'}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  move(d, true);
                }}
                onPointerUp={() => move(d, false)}
                onPointerCancel={() => move(d, false)}
                onLostPointerCapture={() => move(d, false)}
              >
                <Icon size={24} />
              </button>
            );
          })}
        </div>
        <div>
          <button className="field-touch-action" onClick={() => engine.current?.interact()}>
            <Radio size={23} />
            交互
          </button>
          <button
            className="field-touch-action dash"
            onPointerDown={(e) => {
              e.preventDefault();
              engine.current?.dash();
            }}
          >
            <Zap size={25} />
            冲刺
          </button>
        </div>
      </div>
    </>
  );
}
