import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { StarbreakGame } from '../../game/core/StarbreakGame';
import type { ContractChoice, GameHud, GameResult, UpgradeChoice } from '../../game/types';
import type { Profile } from '../../profile/types';
import {
  loadPreferences,
  savePreferences,
  type Preferences,
} from '../../storage/battlePreferences';
import BattleHud from './BattleHud';
import BattleMenu from './BattleMenu';
import ContractDialog from './ContractDialog';
import UpgradeDialog from './UpgradeDialog';
import './battle.css';
import TutorialDialog from '../tutorial/TutorialDialog';
import { completeTutorial, needsTutorial } from '../../storage/tutorialStorage';
import type { Goal, Menu } from './battlePresentation';
export default function BattlePage({
  profile,
  onFinish,
  onHelp,
  helpOpen,
  onExit,
}: {
  profile: Profile;
  onFinish: (r: GameResult) => void;
  onHelp: () => void;
  helpOpen: boolean;
  onExit: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    engine = useRef<StarbreakGame | null>(null),
    finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  const [hud, setHud] = useState<GameHud | null>(null),
    [choices, setChoices] = useState<UpgradeChoice[] | null>(null),
    [contracts, setContracts] = useState<ContractChoice[] | null>(null);
  const [menu, setMenu] = useState<Menu>(null),
    [speed, setSpeed] = useState(1),
    [fullError, setFullError] = useState(''),
    [prefs, setPrefs] = useState<Preferences>(loadPreferences),
    [goal, setGoal] = useState<Goal>('resource');
  const [tutorial, setTutorial] = useState(needsTutorial);
  const input = useRef(new Set<string>());
  useEffect(() => {
    if (!canvas.current) return;
    const g = new StarbreakGame(canvas.current, {
      weapon: profile.selectedWeapon,
      character: profile.selectedCharacter,
      healthLevel: profile.healthLevel,
      magnetLevel: profile.magnetLevel,
      trail: profile.trail,
      modules: profile.equippedModules,
      moduleLevels: profile.moduleLevels,
      objective: 'resource',
      onHud: setHud,
      onUpgrade: (c) => setChoices(c.length ? c : null),
      onContract: (c) => setContracts(c.length ? c : null),
      onFinish: (r) => finishRef.current(r),
    });
    engine.current = g;
    g.start();
    return () => {
      g.destroy();
      engine.current = null;
    };
  }, []);
  useEffect(() => {
    const paused = !!menu || !!choices || !!contracts || helpOpen || tutorial;
    if (paused) input.current.clear();
    engine.current?.setPaused(paused);
  }, [menu, choices, contracts, helpOpen, tutorial]);
  useEffect(() => {
    engine.current?.setAudioEnabled(prefs.sound);
    engine.current?.setScreenShake(prefs.shake);
    engine.current?.setHaptics(prefs.haptics);
    try {
      savePreferences(prefs);
    } catch {}
  }, [prefs]);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.code !== 'Escape' || helpOpen || choices || tutorial) return;
      e.preventDefault();
      if (contracts) {
        engine.current?.closeContract();
        setContracts(null);
      } else setMenu((v) => (v === 'exit' ? 'pause' : v ? null : 'pause'));
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [helpOpen, choices, contracts, tutorial]);
  useEffect(() => {
    const fn = () => {
      if (document.hidden) setMenu('pause');
    };
    document.addEventListener('visibilitychange', fn);
    return () => document.removeEventListener('visibilitychange', fn);
  }, []);
  useEffect(() => {
    const clearDirections = () => {
      input.current.clear();
      engine.current?.setInput(0, 0);
    };
    window.addEventListener('blur', clearDirections);
    return () => window.removeEventListener('blur', clearDirections);
  }, []);
  function move(key: string, active: boolean) {
    active ? input.current.add(key) : input.current.delete(key);
    engine.current?.setInput(
      (input.current.has('right') ? 1 : 0) - (input.current.has('left') ? 1 : 0),
      (input.current.has('down') ? 1 : 0) - (input.current.has('up') ? 1 : 0),
    );
  }
  function track(id: Goal) {
    setGoal(id);
    engine.current?.setObjective(id);
  }
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setFullError('可使用浏览器全屏快捷键 F11');
    }
  }
  function audioToggle() {
    const next = !prefs.sound;
    engine.current?.setAudioEnabled(next);
    setPrefs((p) => ({ ...p, sound: next }));
  }

  return (
    <main
      className="battle-shell field-shell"
      style={{ '--hud-scale': prefs.scale / 100 } as CSSProperties}
    >
      <canvas
        ref={canvas}
        className="battle-canvas"
        tabIndex={0}
        aria-label="星域突围：WASD移动、空格冲刺、E交互"
      />
      <div className="field-edge" />
      <BattleHud
        hud={hud}
        profile={profile}
        prefs={prefs}
        goal={goal}
        speed={speed}
        setMenu={setMenu}
        setSpeed={setSpeed}
        track={track}
        audioToggle={audioToggle}
        fullscreen={fullscreen}
        engine={engine}
        move={move}
      />
      {fullError && (
        <div className="toast" onClick={() => setFullError('')}>
          {fullError}
        </div>
      )}
      {choices && (
        <UpgradeDialog
          choices={choices}
          onChoose={(id) => {
            setChoices(null);
            engine.current?.chooseUpgrade(id);
          }}
        />
      )}
      {contracts && (
        <ContractDialog
          contracts={contracts}
          onChoose={(id) => {
            setContracts(null);
            engine.current?.chooseContract(id);
          }}
          onCancel={() => {
            engine.current?.closeContract();
            setContracts(null);
          }}
        />
      )}
      {menu && !choices && !contracts && !tutorial && (
        <BattleMenu
          menu={menu}
          profile={profile}
          hud={hud}
          prefs={prefs}
          setMenu={setMenu}
          setPrefs={setPrefs}
          audioToggle={audioToggle}
          onHelp={onHelp}
          onTutorial={() => {
            setMenu(null);
            setTutorial(true);
          }}
          onExit={() => {
            engine.current?.destroy();
            onExit();
          }}
        />
      )}
      {tutorial && (
        <TutorialDialog
          onClose={() => {
            completeTutorial();
            setTutorial(false);
          }}
        />
      )}
    </main>
  );
}
