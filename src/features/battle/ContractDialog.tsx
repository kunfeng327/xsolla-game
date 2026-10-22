import { ArrowRight, Sparkles } from 'lucide-react';
import type { ContractChoice } from '../../game/types';

export default function ContractDialog({
  contracts,
  onChoose,
  onCancel,
}: {
  contracts: ContractChoice[];
  onChoose: (id: ContractChoice['id']) => void;
  onCancel: () => void;
}) {
  return (
    <div className="modal-shade field-choice-shade">
      <section
        className="field-choice-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="异常契约选择"
      >
        <div className="eyebrow">异常契约 · 每局最多两份</div>
        <h2>稳定，还是冒险？</h2>
        <p>消耗 10 异常碎片，选择后揭晓。正负效果都持续到本局结束。</p>
        <div className="field-choice-grid">
          {contracts.map((c, i) => (
            <button
              key={c.id}
              className={'field-contract-choice choice-' + c.id}
              onClick={() => onChoose(c.id)}
            >
              <span className="field-choice-index">0{i + 1}</span>
              <span className="field-choice-symbol">
                <Sparkles size={31} />
              </span>
              <strong>{c.name}</strong>
              <b className="field-odds">{c.odds}</b>
              <p>{c.description}</p>
              <div className="field-payoff">
                <small>成功收益</small>
                {c.reward}
              </div>
              <div className="field-payoff risk">
                <small>失败代价</small>
                {c.risk}
              </div>
              <span className="field-choice-cta">
                签订协议 <ArrowRight size={18} />
              </span>
            </button>
          ))}
        </div>
        <button className="secondary field-cancel" onClick={onCancel}>
          暂不签订，不消耗碎片
        </button>
      </section>
    </div>
  );
}
