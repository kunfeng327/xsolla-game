import { ArrowLeft, ArrowRight, Crosshair, Radio, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import './tutorial.css';

const briefings = [
  {
    title: '07号营地，呼叫先锋。',
    story:
      '异常矿区的守卫仍在游荡，营地需要你带回合金与战术芯片。你的第一份任务：回收物资，然后活着回来。',
    action: '这里没有整局倒计时。准备好后再出发，撤离时机由你决定。',
    keys: ['边境通讯', '任务简报'],
    label: '接入通讯',
  },
  {
    title: '保持移动，让武器接管火力。',
    story: '矿区信号不稳定，武器已切换自动索敌。不要停在敌群中央，利用掩体寻找安全路线。',
    action:
      'WASD / 方向键移动，空格冲刺并短暂无敌。触屏使用方向键、冲刺按钮。武器自动攻击视线内的敌人。',
    keys: ['W A S D', 'SPACE', '自动攻击'],
    label: '机动训练',
  },
  {
    title: '跟随金色信标，回收资源。',
    story: '我们已标记附近的资源仓。启动装置会惊动守卫，清理它们后才能取得物资。',
    action:
      '跟随顶部导航找到资源仓，靠近按 E 或点击「交互」。完成两处资源事件后揭示核心守卫，据点挑战可自行选择。',
    keys: ['金色标记', 'E 交互', '2 处资源事件'],
    label: '资源回收',
  },
  {
    title: '接应信号已就绪，别贪心。',
    story: '背包里的收获，带回营地才属于你。出生点附近的接应站始终可用，不必击败核心守卫也能撤离。',
    action:
      '选择顶部「撤离」导航，靠近接应站按 E，守在圈内 10 秒。期间可以移动和战斗，离开圈会取消本次接应。',
    keys: ['撤离导航', 'E 呼叫', '防守 10 秒'],
    label: '安全返航',
  },
  {
    title: '带着收获，成为更强的先锋。',
    story:
      '成功撤离后，合金、芯片与核心会进入仓库。营地商城可兑换散射枪、无人机和外观，装备页可装配模块。',
    action:
      '成功撤离带回全部物资；战败仅保留 20% 合金。主动退出本局不结算物资，永久装备保留。暂停菜单可随时重看本简报。',
    keys: ['搜集', '撤离', '兑换', '再次出发'],
    label: '营地成长',
  },
];

export default function TutorialDialog({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const dialog = useRef<HTMLElement>(null);
  const briefing = briefings[step];
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    return () => previous?.focus();
  }, []);
  return (
    <div className="modal-shade tutorial-shade">
      <section
        className="tutorial-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="新手行动简报"
        ref={dialog}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            onClose();
          }
          if (event.key === 'Tab') {
            const buttons =
              dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
            if (!buttons?.length) return;
            const first = buttons[0],
              last = buttons[buttons.length - 1];
            if (
              event.shiftKey &&
              (document.activeElement === first || document.activeElement === dialog.current)
            ) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <div className="tutorial-topline">
          <span>
            <Radio size={16} /> 营地 07 · 加密通讯
          </span>
          <button onClick={onClose} aria-label="跳过新手引导">
            <X size={20} />
          </button>
        </div>
        <div className="tutorial-content" aria-live="polite">
          <div className="tutorial-emblem">
            <Crosshair size={42} />
          </div>
          <div className="eyebrow">FIELD BRIEFING / 0{step + 1}</div>
          <h2>{briefing.title}</h2>
          <p>{briefing.story}</p>
          <div className="tutorial-orders">
            <span>行动指令 · {briefing.label}</span>
            <p>{briefing.action}</p>
          </div>
          <div className="tutorial-keys">
            {briefing.keys.map((key) => (
              <kbd key={key}>{key}</kbd>
            ))}
          </div>
        </div>
        <div
          className="tutorial-progress"
          aria-label={`第 ${step + 1} 步，共 ${briefings.length} 步`}
        >
          {briefings.map((b, index) => (
            <i key={b.label} className={index <= step ? 'active' : ''} />
          ))}
        </div>
        <div className="tutorial-footer">
          <button className="secondary" disabled={step === 0} onClick={() => setStep(step - 1)}>
            <ArrowLeft size={16} /> 上一步
          </button>
          <span>
            {step + 1} / {briefings.length}
          </span>
          <button
            className="primary"
            onClick={() => (step === briefings.length - 1 ? onClose() : setStep(step + 1))}
          >
            {step === briefings.length - 1 ? '收到，开始行动' : '继续通讯'}
            <ArrowRight size={16} />
          </button>
        </div>
        <button className="tutorial-skip" onClick={onClose}>
          跳过简报，直接行动
        </button>
      </section>
    </div>
  );
}
