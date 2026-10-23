import { ArrowRight, Shield, X } from 'lucide-react';
export default function HelpDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-shade" role="presentation">
      <section className="dialog help-dialog" role="dialog" aria-modal="true" aria-label="行动指南">
        <button className="icon-btn dialog-close" onClick={onClose} aria-label="关闭行动指南">
          <X />
        </button>
        <div className="eyebrow">FIELD MANUAL / 03</div>
        <h2>活着回来，才算你的。</h2>
        <p className="muted">
          地图向四周延伸，没有总倒计时。自动攻击视线内的敌人，利用掩体搜集资源，自主决定撤离。
        </p>
        <div className="help-controls">
          <div>
            <kbd>W A S D</kbd>
            <kbd>↑ ↓ ← →</kbd>
            <span>移动</span>
          </div>
          <div>
            <kbd>SPACE</kbd>
            <span>冲刺 / 短暂无敌</span>
          </div>
          <div>
            <kbd>E</kbd>
            <span>设施交互</span>
          </div>
          <div>
            <kbd>ESC</kbd>
            <span>暂停</span>
          </div>
        </div>
        <div className="help-steps">
          <p>
            <b>01 搜集</b>靠近资源仓按 E
            启动，再清除守卫。带出材料来自资源事件；普通怪提供经验、异常碎片和随机补给。
          </p>
          <p>
            <b>02 决定</b>完成两个资源事件后揭示 Boss 据点，靠近按 E
            主动挑战。也可以先在异常终端消耗 10 碎片签订契约，每局最多两份。
          </p>
          <p>
            <b>03 撤离</b>出生点附近的撤离站始终可用。按 E
            呼叫接应，在圈内守住十秒，可以边移动边战斗；离开区域会取消接应。
          </p>
          <p>
            <b>04 改装</b>成功带回全部物资；失败只保留 20%
            合金。到营地解锁与升级模块、扩容四至六格背包，再组合下一局的打法。
          </p>
        </div>
        <div className="notice">
          <Shield size={17} />
          装备和出战模块永久保留。升级、契约和随机补给只在本局生效；10 次持续无伤击杀触发短时亢奋。
        </div>
        <button className="primary full" onClick={onClose}>
          明白，准备行动 <ArrowRight size={17} />
        </button>
        <p className="tiny muted">
          触屏可使用左下方向键与右下冲刺、交互按钮。存档保存在当前浏览器。此原型没有接入真实支付。
        </p>
      </section>
    </div>
  );
}
