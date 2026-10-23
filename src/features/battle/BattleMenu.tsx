import { Backpack, HelpCircle, Hexagon, Play, Settings2, Sparkles, X } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import { MODULES } from '../../config/catalog';
import type { GameHud } from '../../game/types';
import type { Profile } from '../../profile/types';
import type { Preferences } from '../../storage/battlePreferences';
import { moduleIcons, type Menu } from './battlePresentation';

interface MenuProps {
  menu: NonNullable<Menu>;
  profile: Profile;
  hud: GameHud | null;
  prefs: Preferences;
  setMenu: Dispatch<SetStateAction<Menu>>;
  setPrefs: Dispatch<SetStateAction<Preferences>>;
  audioToggle: () => void;
  onHelp: () => void;
}
export default function BattleMenu({
  menu,
  profile,
  hud,
  prefs,
  setMenu,
  setPrefs,
  audioToggle,
  onHelp,
}: MenuProps) {
  const h = hud;
  return (
    <div className="modal-shade">
      <section
        className={'dialog field-menu ' + (menu === 'effects' ? 'field-effects-menu' : '')}
        role="dialog"
        aria-modal="true"
        aria-label={
          menu === 'settings' ? '界面与反馈设置' : menu === 'effects' ? '本局状态详情' : '行动暂停'
        }
      >
        <button
          className="icon-btn dialog-close"
          onClick={() => setMenu(null)}
          aria-label="返回战场"
        >
          <X size={20} />
        </button>
        <div className="eyebrow">战场已暂停</div>
        <h2>
          {menu === 'settings'
            ? '界面与反馈'
            : menu === 'effects'
              ? '本局状态'
              : '休息一下，随时再出发。'}
        </h2>
        {menu === 'settings' ? (
          <>
            <div className="field-setting">
              <span>界面大小</span>
              <div>
                {[100, 125, 150].map((n) => (
                  <button
                    className={prefs.scale === n ? 'active' : ''}
                    onClick={() => setPrefs((p) => ({ ...p, scale: n }))}
                    key={n}
                  >
                    {n}%
                  </button>
                ))}
              </div>
            </div>
            <label className="field-setting">
              <span>战斗音效</span>
              <input type="checkbox" checked={prefs.sound} onChange={audioToggle} />
            </label>
            <label className="field-setting">
              <span>轻量震屏</span>
              <input
                type="checkbox"
                checked={prefs.shake}
                onChange={(e) => setPrefs((p) => ({ ...p, shake: e.target.checked }))}
              />
            </label>
            <p className="muted">音效在首次按键或点击后启用。所有偏好保存在当前浏览器。</p>
          </>
        ) : menu === 'effects' ? (
          <>
            <div className="field-stat-summary">
              <span>
                火力 <b>×{(h?.damageMultiplier ?? 1).toFixed(2)}</b>
              </span>
              <span>
                攻速 <b>×{(h?.attackMultiplier ?? 1).toFixed(2)}</b>
              </span>
              <span>
                机动 <b>+{Math.round(((h?.moveMultiplier ?? 1) - 1) * 100)}%</b>
              </span>
            </div>
            <div className="field-detail-list">
              {profile.equippedModules.map((id) => {
                const m = MODULES.find((v) => v.id === id)!;
                const Icon = moduleIcons[id] || Hexagon;
                return (
                  <article key={id}>
                    <Icon size={23} />
                    <div>
                      <strong>
                        {m.name}{' '}
                        <small>
                          Lv.{profile.moduleLevels[id] ?? 0} · {m.slots}格
                        </small>
                      </strong>
                      <p>{m.description}</p>
                      {id === 'rescue' && (
                        <b className={h?.rescueAvailable ? 'positive' : 'negative'}>
                          {h?.rescueAvailable ? '本局可触发一次' : '本局已耗尽'}
                        </b>
                      )}
                    </div>
                  </article>
                );
              })}
              {h?.contracts.map((c, i) => (
                <article key={'contract-' + i} className={c.positive ? 'positive' : 'negative'}>
                  <Sparkles size={23} />
                  <div>
                    <strong>{c.name}</strong>
                    <p>{c.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="muted">利用掩体与冲刺突破包围。探索没有固定总时限，撤离由你决定。</p>
            <button className="secondary full" onClick={() => setMenu('effects')}>
              <Backpack size={18} />
              查看本局效果
            </button>
            <button className="secondary full" onClick={() => setMenu('settings')}>
              <Settings2 size={18} />
              界面与反馈设置
            </button>
            <button className="secondary full" onClick={onHelp}>
              <HelpCircle size={18} />
              查看行动指南
            </button>
          </>
        )}
        <button className="primary full" onClick={() => setMenu(null)}>
          <Play size={18} />
          返回战场
        </button>
      </section>
    </div>
  );
}
