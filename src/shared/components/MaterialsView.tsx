import { Box, Layers, Sparkles } from 'lucide-react';
import type { Materials } from '../../profile/types';
export function MaterialsView({ value, plus = false }: { value: Materials; plus?: boolean }) {
  return (
    <div className="material-list">
      <span className="alloy">
        <Box size={15} />
        {plus ? '+' : ''}
        {value.alloy}
        <small>合金</small>
      </span>
      <span className="chips">
        <Layers size={15} />
        {plus ? '+' : ''}
        {value.chips}
        <small>芯片</small>
      </span>
      <span className="cores">
        <Sparkles size={15} />
        {plus ? '+' : ''}
        {value.cores}
        <small>核心</small>
      </span>
    </div>
  );
}
