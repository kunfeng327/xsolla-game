import { useId } from 'react';
import { CHARACTER_NAMES, WEAPON_NAMES } from '../../config/catalog';
import type { Profile } from '../../profile/types';
export function Operative({ profile }: { profile: Profile }) {
  const uid = useId().replace(/:/g, ''),
    engineer = profile.selectedCharacter === 'engineer',
    drone = profile.selectedWeapon === 'drone',
    scatter = profile.selectedWeapon === 'scatter',
    color = engineer ? '#d7b8ff' : '#8ce9dc';
  return (
    <svg
      className="camp-operative"
      viewBox="0 0 520 620"
      role="img"
      aria-label={`${CHARACTER_NAMES[profile.selectedCharacter]}，装备${WEAPON_NAMES[profile.selectedWeapon]}`}
    >
      <defs>
        <linearGradient id={`${uid}a`} x1="0" x2="1">
          <stop stopColor="#283a4b" />
          <stop offset=".45" stopColor="#81969d" />
          <stop offset=".65" stopColor="#526773" />
          <stop offset="1" stopColor="#1c2b3c" />
        </linearGradient>
        <linearGradient id={`${uid}b`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#a4fff0" />
          <stop offset="1" stopColor="#267983" />
        </linearGradient>
        <radialGradient id={`${uid}g`}>
          <stop stopColor={color} stopOpacity=".27" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <filter id={`${uid}blur`}>
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>
      <ellipse cx="260" cy="542" rx="230" ry="67" fill={`url(#${uid}g)`} />
      <ellipse cx="260" cy="540" rx="155" ry="38" fill="#0c1d27" stroke="#47606c" strokeWidth="2" />
      <ellipse
        cx="260"
        cy="533"
        rx="139"
        ry="31"
        fill="#1e333d"
        stroke={color}
        strokeOpacity=".4"
      />
      <path
        d="m109 542 16 17m286-17-16 17m-209-56-8-15m167 16 8-15"
        stroke={color}
        strokeWidth="4"
        opacity=".7"
      />
      {profile.equippedModules.includes('shockwave') && (
        <ellipse
          cx="260"
          cy="534"
          rx="184"
          ry="45"
          fill="none"
          stroke="#a3cafa"
          strokeDasharray="20 40"
          opacity=".45"
        />
      )}
      {profile.trail && (
        <g fill="none" stroke="#b89bfa">
          <path
            d="M226 510C111 415 165 300 110 230m190 283c122-79 80-185 130-251"
            strokeWidth="14"
            opacity=".2"
            filter={`url(#${uid}blur)`}
          />
          <path
            d="M226 510C111 415 165 300 110 230m190 283c122-79 80-185 130-251"
            strokeWidth="2"
            opacity=".8"
          />
        </g>
      )}
      <ellipse cx="263" cy="530" rx="66" ry="16" fill="#030c13" opacity=".8" />
      <g className="camp-operator-body">
        <path
          d="m209 333-12 91 5 82 27 6 20-82 11-61 13 62 13 82 29-6 10-81-15-93Z"
          fill="#1b2c3a"
          stroke="#70818b"
          strokeWidth="2"
        />
        <path
          d="m202 371 39 4-7 46-33-3m81-43 36-4 7 47-34 3"
          fill={`url(#${uid}a)`}
          stroke="#7c939c"
        />
        <path d="m202 440 27 4-8 52-18-4m91-48 26-4-3 52-19 4" fill="#314754" stroke="#647c87" />
        <path
          d="m204 506-11 24 3 8h44l2-29m44 0 3 29h45l2-8-20-24"
          fill="#162631"
          stroke="#73828a"
          strokeWidth="2"
        />
        <path d="M196 531h41m55 0h39" stroke={color} strokeWidth="2" opacity=".6" />
        <path
          d="m196 218-24 42 18 95 43 17h55l41-18 17-93-28-43Z"
          fill={`url(#${uid}a)`}
          stroke="#9db0b4"
          strokeWidth="2"
        />
        <path
          d="m205 227 55 24 54-24-8 75-46 23-46-23Z"
          fill="#233d47"
          stroke="#65858d"
          strokeWidth="2"
        />
        <path d="m225 249 34 13 35-13-4 38-31 14-29-14Z" fill="#152c37" />
        <rect x="242" y="270" width="34" height="9" rx="3" fill={color} />
        <path d="M223 309h73m-68 10h63" stroke="#88a5ac" opacity=".65" />
        <path
          d="m190 233-29 12-21 66 16 23 30-9 22-64m112-28 28 12 24 66-16 24-28-10-23-65"
          fill="#405562"
          stroke="#8fa1aa"
          strokeWidth="2"
        />
        <path
          d="m151 285 35 10-8 39-30 9-16-18m204-30 31-10 19 40-15 19-29-10"
          fill="#223844"
          stroke="#78939d"
          strokeWidth="2"
        />
        <path d="m158 257 17-8m167 0 17 9" stroke={color} strokeWidth="5" />
        <path
          d="m211 149 6-36 25-24h35l29 26 8 39-6 55-31 22h-39l-28-23Z"
          fill={`url(#${uid}a)`}
          stroke="#a2b3b7"
          strokeWidth="2"
        />
        <path d="m215 148 92-1-5 44-39 21-40-19Z" fill="#102734" stroke="#426976" strokeWidth="2" />
        <path d="m224 153 74-1-3 31-32 17-32-17Z" fill={`url(#${uid}b)`} />
        <path d="m232 159 55-1-1 5-51 2" stroke="#e4fff8" strokeWidth="3" opacity=".7" />
        <path d="M239 101h38m-43 112h53" stroke="#becbc9" strokeWidth="3" opacity=".7" />
        <rect x="204" y="159" width="11" height="32" rx="3" fill="#2f4653" stroke="#82949b" />
        <rect x="307" y="159" width="12" height="32" rx="3" fill="#2f4653" stroke="#82949b" />
        <path d="m198 338 20 8h82l20-9-5 23-24 10h-65l-24-11Z" fill="#182b38" stroke="#73909b" />
        <rect x="248" y="345" width="24" height="20" rx="3" fill="#b6c8c5" />
        <rect x="254" y="351" width="12" height="7" fill="#2f6164" />
        {profile.equippedModules.includes('insulation') && (
          <g>
            <rect x="179" y="268" width="16" height="23" rx="2" fill="#d7b37c" />
            <path d="m184 273 6 11m-6 0 6-11" stroke="#344550" strokeWidth="2" />
          </g>
        )}
        {profile.equippedModules.includes('rescue') && (
          <g>
            <rect x="300" y="311" width="24" height="22" rx="3" fill="#e1c788" />
            <path d="M312 316v12m-6-6h12" stroke="#3a4550" strokeWidth="4" />
          </g>
        )}
        {drone || engineer ? (
          <g transform="rotate(-13 260 309)">
            <rect
              x="206"
              y="289"
              width="113"
              height="45"
              rx="5"
              fill="#152d3a"
              stroke="#87b8c2"
              strokeWidth="2"
            />
            <path d="M220 302h40m-40 10h73m-73 10h50" stroke={color} strokeWidth="3" />
            <circle cx="300" cy="305" r="5" fill={color} />
          </g>
        ) : (
          <g transform="rotate(-14 264 307)">
            <path
              d={
                scatter
                  ? 'M147 294h199v31h-65l-10 32h-27l3-32H147Z'
                  : 'M145 294h191v25h-64l-10 35h-24l3-35h-96Z'
              }
              fill="#182b37"
              stroke="#9caeb3"
              strokeWidth="2"
            />
            {scatter ? (
              <>
                <rect x="331" y="291" width="42" height="11" rx="2" fill="#627b85" />
                <rect x="331" y="306" width="42" height="11" rx="2" fill="#627b85" />
                <path d="M357 294h17m-17 15h17" stroke="#ffd28d" strokeWidth="3" />
              </>
            ) : (
              <>
                <rect x="328" y="299" width="55" height="13" fill="#56727f" />
                <path d="M365 302h19m-194-3h70" stroke={color} strokeWidth="4" />
              </>
            )}
            <path
              d="m193 319 23 27 21-2 4-25m71-4 13 21 24-10-5-11"
              fill="#344c59"
              stroke="#7d949c"
            />
          </g>
        )}
      </g>
      {profile.equippedModules.includes('fortress') && (
        <ellipse
          cx="262"
          cy="320"
          rx="126"
          ry="222"
          fill="#7ca8ff05"
          stroke="#9dc9f9"
          strokeWidth="2"
          strokeDasharray="30 45"
          opacity=".45"
        />
      )}
      {(drone || engineer) &&
        Array.from({ length: drone ? 3 : 1 }, (_, i) => (
          <g
            key={i}
            className={`camp-drone camp-drone-${i}`}
            transform={`translate(${i === 0 ? 388 : i === 1 ? 113 : 403} ${i === 0 ? 230 : i === 1 ? 355 : 414})`}
          >
            <ellipse cx="0" cy="0" rx="44" ry="14" fill={color} opacity=".1" />
            <path
              d="m-32-8 20-12h25L35-8 15 10h-29Z"
              fill="#334b58"
              stroke="#8ea9b0"
              strokeWidth="2"
            />
            <rect x="-9" y="-8" width="20" height="9" rx="3" fill={color} />
            <path d="M-19 15v11m40-11v11" stroke={color} strokeWidth="3" />
          </g>
        ))}
    </svg>
  );
}
