import type { Profile, RecipeId } from '../../profile/types';
import { Operative } from './Operative';

export default function ShopItemArt({ id, profile }: { id: RecipeId; profile: Profile }) {
  if (id === 'engineer' || id === 'trail')
    return (
      <Operative
        profile={{
          ...profile,
          selectedCharacter: id === 'engineer' ? 'engineer' : 'gunner',
          selectedWeapon: id === 'engineer' ? 'drone' : 'pulse',
          trail: id === 'trail',
          equippedModules: [],
        }}
      />
    );
  return (
    <svg viewBox="0 0 360 200" className="shop-item-art" aria-hidden="true">
      <ellipse cx="180" cy="171" rx="107" ry="11" fill="currentColor" opacity=".08" />
      <g fill="none" stroke="currentColor" opacity=".18">
        <circle cx="180" cy="94" r="72" />
        <circle cx="180" cy="94" r="83" strokeDasharray="3 12" />
        <path d="M60 94h33m174 0h33M180 5v20m0 140v20" />
      </g>
      {id === 'scatter' ? (
        <g transform="rotate(-22 180 100)" strokeLinejoin="round">
          <path
            d="M65 79h198v40H159l-12 40h-29l4-40H65Z"
            fill="#223f5d"
            stroke="#a2bfd0"
            strokeWidth="2"
          />
          <path
            d="M240 74h65v18h-65zm0 24h65v18h-65z"
            fill="#4c6c86"
            stroke="#d2dce6"
            strokeWidth="2"
          />
          <path d="M80 87h65v23H80Z" fill="#507184" />
          <path d="M158 85h66m-66 15h48" stroke="#f0c987" strokeWidth="5" />
          <path d="M166 117h25l-7 26h-28" fill="#1a2d41" stroke="#7c9caf" strokeWidth="2" />
          <path d="M278 80h29m-29 24h29" stroke="#f7daa3" strokeWidth="4" />
          <path d="M95 76V63h52v14" fill="#182d45" stroke="#93afc5" strokeWidth="2" />
        </g>
      ) : id === 'drone' ? (
        <g>
          <ellipse
            cx="180"
            cy="105"
            rx="110"
            ry="43"
            fill="none"
            stroke="currentColor"
            strokeDasharray="4 8"
            opacity=".5"
          />
          {[
            { x: 180, y: 65, s: 1.3 },
            { x: 83, y: 130, s: 0.85 },
            { x: 277, y: 130, s: 0.85 },
          ].map(({ x, y, s }) => (
            <g key={x} transform={`translate(${x} ${y}) scale(${s})`}>
              <path
                d="m-45 0 25-22h40L45 0 22 18h-44Z"
                fill="#2e466b"
                stroke="#a7bedc"
                strokeWidth="2"
              />
              <path
                d="m-33-15-23-7v22l18 10m71-25 23-7V0L38 10"
                fill="#243d55"
                stroke="#7f9dbf"
                strokeWidth="2"
              />
              <rect x="-12" y="-8" width="24" height="11" rx="3" fill="#bdc5ff" />
              <path d="M-20 21v15m40-15v15" stroke="#9abfff" strokeWidth="4" />
            </g>
          ))}
        </g>
      ) : id === 'health' ? (
        <g>
          <path
            d="m180 32 60 24v46c0 31-37 56-60 66-23-10-60-35-60-66V56Z"
            fill="#203e56"
            stroke="#acccd5"
            strokeWidth="3"
          />
          <path
            d="m180 44 48 20v37c0 24-28 45-48 55-20-10-48-31-48-55V64Z"
            fill="#335e70"
            stroke="#72a9b7"
          />
          <path d="M180 72v48m-24-24h48" stroke="#b2f3e0" strokeWidth="11" />
          <path
            d="m105 70-16 9v40l16 10m150-59 16 9v40l-16 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </g>
      ) : (
        <g>
          <ellipse
            cx="180"
            cy="99"
            rx="62"
            ry="53"
            fill="#223b59"
            stroke="#8caaca"
            strokeWidth="3"
          />
          <ellipse
            cx="180"
            cy="99"
            rx="45"
            ry="38"
            fill="#10243c"
            stroke="#99d8e5"
            strokeWidth="7"
          />
          <path d="M143 71v56m74-56v56" stroke="#c5e6ee" strokeWidth="4" />
          <path d="M172 84v30m16-30v30" stroke="#8edee7" strokeWidth="3" />
          <path
            d="m88 80 14 18-14 18m184-36-14 18 14 18M72 98h30m156 0h30"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
        </g>
      )}
    </svg>
  );
}
