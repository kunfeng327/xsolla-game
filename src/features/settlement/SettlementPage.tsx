import { ArrowRight, Box, Check, ChevronRight, Shield, Skull, Target } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { GameResult } from '../../game/types';
import { getTrackedGoal } from '../../profile/growth';
import type { Materials, Profile } from '../../profile/types';
import { MaterialsView } from '../../shared/components/MaterialsView';
import { formatTime } from '../../shared/format';
export default function SettlementPage({
  result,
  profile,
  onCamp,
  onStart,
}: {
  result: GameResult;
  profile: Profile;
  onCamp: () => void;
  onStart: () => void;
}) {
  const target = getTrackedGoal(profile);
  const state = { canAfford: target.canAfford, maxed: target.complete, cost: target.cost };
  const [shown, setShown] = useState(false);
  useEffect(() => setShown(true), []);
  return (
    <main className={`result-screen ${shown ? 'show' : ''}`}>
      <div className="result-grid" />
      <div className={`result-emblem ${result.success ? 'success' : 'failed'}`}>
        {result.success ? <Shield size={43} /> : <Skull size={43} />}
      </div>
      <div className="eyebrow">{result.success ? 'EXTRACTION COMPLETE' : 'SIGNAL LOST'}</div>
      <h1>{result.success ? '成功撤离' : '行动结束'}</h1>
      <p className="result-subtitle">
        {result.success
          ? '舱门已关闭。战利品已安全存入仓库。'
          : '生命信号中断。救援回收了少量合金，永久装备已保留。'}
      </p>
      <section className="settlement-panel">
        <div className="section-heading">
          <span>
            <Box size={16} />
            本次入库
          </span>
          <small>{result.success ? '全部带出' : '合金回收 20% · 稀有物资丢失'}</small>
        </div>
        <MaterialsView value={result} plus />
        <div className="result-stats">
          <div>
            <small>行动时长</small>
            <b>{formatTime(result.time)}</b>
          </div>
          <div>
            <small>资源事件</small>
            <b>{result.events ?? 0}</b>
          </div>
          <div>
            <small>最高无伤连杀</small>
            <b>{result.maxCombo ?? 0}</b>
          </div>
          <div>
            <small>Boss</small>
            <b className={result.bossKilled ? 'cores' : ''}>
              {result.bossKilled ? '已击败' : '未挑战成功'}
            </b>
          </div>
        </div>
        <div className="result-extra">
          探索 {result.explored ?? 0} 个区域 · 契约 {result.contracts ?? 0} 份 · 消灭 {result.kills}{' '}
          个敌人
        </div>
        {!result.success && result.collected && (
          <p className="lost-note">
            本局背包：合金 {result.collected.alloy} / 芯片 {result.collected.chips} / 核心{' '}
            {result.collected.cores}
          </p>
        )}
        {!result.success && result.lastDamageSource && (
          <p className="lost-note">
            最后伤害来源：{result.lastDamageSource}。可利用掩体或冲刺躲避，受到攻击后短暂无敌。
          </p>
        )}
      </section>
      <section className={`goal-result ${state.canAfford ? 'ready' : ''}`}>
        <div className="goal-result-icon">{state.canAfford ? <Check /> : <Target />}</div>
        <div>
          <small>
            {state.maxed ? '追踪目标已完成' : state.canAfford ? '已满足兑换条件' : '下一次行动目标'}
          </small>
          <h3>{target.title}</h3>
          <p>
            {state.canAfford
              ? '回营地兑换，新装备下一局立即生效。'
              : state.maxed
                ? '到营地选择新目标，继续探索不同战斗方式。'
                : Object.entries(state.cost)
                    .filter(([, n]) => n > 0)
                    .map(
                      ([k, n]) =>
                        `${{ alloy: '合金', chips: '芯片', cores: '核心' }[k]} ${Math.min(profile[k as keyof Materials], n)}/${n}`,
                    )
                    .join(' · ')}
          </p>
        </div>
      </section>
      <div className="result-buttons">
        <button className="primary" onClick={onCamp}>
          <Box size={17} />
          {state.canAfford ? '回营地兑换' : '返回营地'}
          <ArrowRight size={17} />
        </button>
        <button className="secondary" onClick={onStart}>
          再次出发 <ChevronRight size={17} />
        </button>
      </div>
      <div className="saved-note">
        <Check size={13} />
        永久进度已保存 · 本局效果已清除
      </div>
    </main>
  );
}
