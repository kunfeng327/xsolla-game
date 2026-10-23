import { ArrowRight, Shield, Wind, Zap } from 'lucide-react';
import type { UpgradeChoice } from '../../game/types';

export default function UpgradeDialog({
  choices,
  onChoose,
}: {
  choices: UpgradeChoice[];
  onChoose: (id: string) => void;
}) {
  return (
    <div className="modal-shade field-choice-shade">
      <section
        className="field-choice-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="选择本局升级"
      >
        <div className="eyebrow">战术升级 · 战场已暂停</div>
        <h2>这一次，怎么变强？</h2>
        <p>选择一项强化，立即在本局生效。</p>
        <div className="field-choice-grid">
          {choices.map((c, i) => (
            <button key={c.id} onClick={() => onChoose(c.id)}>
              <span className="field-choice-index">0{i + 1}</span>
              <span className="field-choice-symbol">
                {c.kind === '生存' ? (
                  <Shield size={31} />
                ) : c.kind === '机动' ? (
                  <Wind size={31} />
                ) : (
                  <Zap size={31} />
                )}
              </span>
              <small>{c.kind}</small>
              <strong>{c.name}</strong>
              <p>{c.description}</p>
              <span className="field-choice-cta">
                选择强化 <ArrowRight size={18} />
              </span>
            </button>
          ))}
        </div>
        <small>已装配模块可提供专属升级 · 强化不会永久带回营地</small>
      </section>
    </div>
  );
}
