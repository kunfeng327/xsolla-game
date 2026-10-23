import { Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Battle from '../features/battle/BattlePage';
import Camp from '../features/camp/Camp';
import HelpDialog from '../features/help/HelpDialog';
import SettlementPage from '../features/settlement/SettlementPage';
import type { GameResult } from '../game/types';
import {
  expandBackpack,
  getRecipe,
  purchase,
  unlockModule,
  upgradeModule,
} from '../profile/growth';
import { initialProfile } from '../profile/initialProfile';
import { createRunLoadout, toggleModule } from '../profile/loadout';
import { applySettlement } from '../profile/settlement';
import type { ModuleId, Profile, RecipeId } from '../profile/types';
import { resetTutorial } from '../storage/tutorialStorage';
import { loadProfile, saveProfile } from '../storage/profileStorage';
export default function App() {
  const [profile, setProfile] = useState<Profile>(loadProfile);
  const [screen, setScreen] = useState<'camp' | 'battle' | 'result'>('camp');
  const [runProfile, setRunProfile] = useState(profile);
  const [result, setResult] = useState<GameResult | null>(null);
  const [runId, setRunId] = useState(0);
  const [help, setHelp] = useState(false);
  const [toast, setToast] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const finished = useRef(false);
  useEffect(() => {
    try {
      saveProfile(profile);
    } catch {
      setToast('浏览器未允许保存，关闭页面后本次进度可能丢失。');
    }
  }, [profile]);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(''), 3800);
    return () => clearTimeout(t);
  }, [toast]);
  function start() {
    finished.current = false;
    setRunProfile(createRunLoadout(profile));
    setRunId((n) => n + 1);
    setResult(null);
    setScreen('battle');
    window.scrollTo(0, 0);
  }
  function finish(r: GameResult) {
    if (finished.current) return;
    finished.current = true;
    setProfile((p) => applySettlement(p, r));
    setResult(r);
    setScreen('result');
  }
  function buy(id: RecipeId) {
    const next = purchase(profile, id);
    if (!next) {
      setToast('物资不足或已完成解锁');
      return;
    }
    setProfile(next);
    setToast(
      `${getRecipe(id).title}已${id === 'health' || id === 'magnet' ? '强化' : '解锁并装备'}，下一局生效。`,
    );
  }
  function changeModule(action: 'equip' | 'unlock' | 'upgrade', id: ModuleId) {
    const next =
      action === 'equip'
        ? toggleModule(profile, id)
        : action === 'unlock'
          ? unlockModule(profile, id)
          : upgradeModule(profile, id);
    if (!next) {
      setToast(
        action === 'equip'
          ? '模块未解锁或容量不足，请先卸下一项模块。'
          : '材料不足或已达到强化上限。',
      );
      return;
    }
    setProfile(next);
    setToast(
      action === 'equip'
        ? '出战配置已保存，下一局生效。'
        : action === 'unlock'
          ? '模块已永久解锁，可装入出战背包。'
          : '模块已强化，下一局生效。',
    );
  }
  return (
    <>
      <div className="app-shell">
        {screen === 'camp' && (
          <>
            <Camp
              profile={profile}
              onBuy={buy}
              onSelectWeapon={(w) => {
                if (profile.weapons.includes(w)) setProfile((p) => ({ ...p, selectedWeapon: w }));
              }}
              onSelectCharacter={(c) => {
                if (profile.characters.includes(c))
                  setProfile((p) => ({ ...p, selectedCharacter: c }));
              }}
              onTrack={(id) => setProfile((p) => ({ ...p, tracked: id }))}
              onToggleModule={(id) => changeModule('equip', id)}
              onUnlockModule={(id) => changeModule('unlock', id)}
              onUpgradeModule={(id) => changeModule('upgrade', id)}
              onExpandBackpack={() => {
                const next = expandBackpack(profile);
                if (next) {
                  setProfile(next);
                  setToast('背包已扩容，试试新的模块组合。');
                } else setToast('材料不足或已达到六格容量。');
              }}
              onStart={start}
              onOpenHelp={() => setHelp(true)}
            />
            <footer className="app-footer">
              <span>
                <i />
                本地存档已启用 · 前端试玩原型
              </span>
              <button onClick={() => setResetOpen(true)}>重置试玩进度</button>
              <span>REACT / CANVAS · BUILD 03</span>
            </footer>
          </>
        )}
        {screen === 'battle' && (
          <Battle
            key={runId}
            profile={runProfile}
            onFinish={finish}
            onExit={() => {
              finished.current = true;
              setScreen('camp');
              window.scrollTo(0, 0);
            }}
            onHelp={() => setHelp(true)}
            helpOpen={help}
          />
        )}{' '}
        {screen === 'result' && result && (
          <SettlementPage
            result={result}
            profile={profile}
            onCamp={() => {
              setScreen('camp');
              window.scrollTo(0, 0);
            }}
            onStart={start}
          />
        )}
      </div>
      {help && <HelpDialog onClose={() => setHelp(false)} />}{' '}
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
      {resetOpen && (
        <div className="modal-shade">
          <section className="dialog" role="dialog" aria-modal="true" aria-label="重置试玩进度">
            <div className="eyebrow">NEW SAVE</div>
            <h2>重新开始试玩？</h2>
            <p className="muted">将清空此浏览器中的材料、强化和解锁记录。</p>
            <div className="dialog-actions">
              <button className="secondary" onClick={() => setResetOpen(false)}>
                保留进度
              </button>
              <button
                className="danger-button"
                onClick={() => {
                  setProfile(initialProfile());
                  resetTutorial();
                  setResetOpen(false);
                  setToast('存档已重置，准备新的行动。');
                }}
              >
                确认重置
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
