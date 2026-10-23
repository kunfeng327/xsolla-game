import type { TrackId } from '../../profile/types';
export function RewardPreview({ id }: { id: TrackId }) {
  const scatter = id === 'scatter',
    drone = id === 'drone' || id === 'engineer';
  return (
    <div
      className={`camp-reward-preview ${scatter ? 'is-scatter' : ''}`}
      aria-label={scatter ? '散射枪扇形齐射示意' : drone ? '环绕无人机能力示意' : '成长能力示意'}
    >
      <svg viewBox="0 0 260 92" aria-hidden="true">
        <path d="M0 46h260M130 0v92" stroke="currentColor" opacity=".06" />
        <circle cx="57" cy="46" r="17" fill="currentColor" opacity=".13" />
        <path d="M47 38h22v16H47Z" fill="currentColor" />
        {scatter ? (
          [-25, -12, 0, 12, 25].map((angle, i) => (
            <g key={i} transform={`rotate(${angle} 68 46)`}>
              <path d="M84 46h83" stroke="currentColor" strokeWidth="2" opacity=".2" />
              <rect
                className="camp-preview-round"
                x={112 + (i % 2) * 16}
                y="43"
                width="18"
                height="5"
                rx="2"
                fill="currentColor"
                style={{ animationDelay: `${i * 0.12}s` }}
              />
            </g>
          ))
        ) : drone ? (
          <>
            <ellipse
              cx="132"
              cy="46"
              rx="63"
              ry="29"
              fill="none"
              stroke="currentColor"
              strokeDasharray="4 7"
            />
            {[0, 120, 240].map((a) => (
              <g
                key={a}
                transform={`translate(${132 + Math.cos((a * Math.PI) / 180) * 63} ${46 + Math.sin((a * Math.PI) / 180) * 29})`}
              >
                <path d="m-8 0 8-6 8 6-8 6Z" fill="currentColor" />
              </g>
            ))}
          </>
        ) : (
          <>
            <path
              d="m110 46 23-24 23 24-23 24Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path d="M133 32v28m-14-14h28" stroke="currentColor" strokeWidth="3" />
            <path d="M177 46h49m-9-8 9 8-9 8" fill="none" stroke="currentColor" strokeWidth="2" />
          </>
        )}
      </svg>
      <span>能力预览</span>
    </div>
  );
}
