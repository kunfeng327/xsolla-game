import type { Profile } from '../../profile/types';

/**
 * Compact, hand-drawn anime-inspired field operative.
 * Kept as inline SVG so the game stays self-contained and works offline.
 */
export function Operative({ profile }: { profile: Profile }) {
  const engineer = profile.selectedCharacter === 'engineer';
  const drone = profile.selectedWeapon === 'drone';
  const scatter = profile.selectedWeapon === 'scatter';
  const accent = engineer ? '#b9a7d9' : '#9bcbd0';
  const uid = engineer ? 'engineer' : 'scout';
  return (
    <svg
      className="camp-operative anime-operative"
      viewBox="0 0 520 620"
      role="img"
      aria-label={engineer ? '星域工程师角色立绘' : '星域侦察员角色立绘'}
    >
      <defs>
        <linearGradient id={uid + '-coat'} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#536477" />
          <stop offset="1" stopColor="#263445" />
        </linearGradient>
        <linearGradient id={uid + '-hair'} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#d7d5d0" />
          <stop offset="1" stopColor="#7e91a3" />
        </linearGradient>
        <radialGradient id={uid + '-halo'}>
          <stop stopColor={accent} stopOpacity=".28" />
          <stop offset="1" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="260" cy="530" rx="220" ry="75" fill={'url(#' + uid + '-halo)'} />
      <circle cx="260" cy="278" r="205" fill="#91a8bb" opacity=".035" />
      <path d="M105 541 Q126 463 181 435 L214 417 H307 L342 435 Q397 463 415 541Z" fill="#1b2838" stroke="#64798a" strokeWidth="2" />
      <path d="M174 449 L218 423 L260 464 L302 423 L346 449 L322 541 H198Z" fill={'url(#' + uid + '-coat)'} stroke="#8c9eac" strokeWidth="2" />
      <path d="M218 423 L260 464 L302 423 L291 492 L260 518 L229 492Z" fill="#d1d6d7" />
      <path d="M246 465 L260 481 L274 465 L282 541 H238Z" fill={accent} opacity=".8" />
      <path d="M186 452 L154 486 L167 535 L206 535 L218 477Z" fill="#35475a" stroke="#7d91a0" strokeWidth="2" />
      <path d="M334 452 L366 486 L353 535 L314 535 L302 477Z" fill="#35475a" stroke="#7d91a0" strokeWidth="2" />
      <path d="M198 531 L322 531 L339 562 Q260 581 181 562Z" fill="#202c3c" stroke="#718594" strokeWidth="2" />
      <rect x="226" y="488" width="68" height="28" rx="5" fill="#263849" stroke="#8a9da9" />
      <path d="M240 502 H280" stroke={accent} strokeWidth="3" strokeLinecap="round" />
      <path d="M219 417 L211 362 L202 323 L318 323 L309 362 L301 417 Q260 445 219 417Z" fill="#d6b8a7" />
      <path d="M202 329 Q188 277 204 219 Q213 168 260 160 Q308 164 319 218 Q333 272 318 329 L302 356 L218 356Z" fill={'url(#' + uid + '-hair)'} />
      <path d="M211 260 Q218 218 260 219 Q302 218 309 260 L301 320 Q288 348 260 350 Q232 348 219 320Z" fill="#e8cbbb" />
      <path d="M207 260 Q184 218 211 184 Q230 151 263 158 Q303 150 321 191 Q338 222 313 264 L302 232 L281 207 L248 221 L222 208Z" fill={'url(#' + uid + '-hair)'} />
      <path d="M213 255 Q224 230 246 240 L242 250 Q229 246 220 261Z" fill="#53687b" />
      <path d="M274 240 Q296 230 307 255 L300 261 Q291 246 277 250Z" fill="#53687b" />
      <ellipse cx="234" cy="266" rx="12" ry="15" fill="#f3f0e9" />
      <ellipse cx="286" cy="266" rx="12" ry="15" fill="#f3f0e9" />
      <ellipse cx="236" cy="269" rx="6" ry="10" fill={accent} />
      <ellipse cx="284" cy="269" rx="6" ry="10" fill={accent} />
      <circle cx="238" cy="265" r="3" fill="#263445" />
      <circle cx="282" cy="265" r="3" fill="#263445" />
      <path d="M224 247 L245 243 M275 243 L296 247" stroke="#46576a" strokeWidth="4" strokeLinecap="round" />
      <path d="M257 280 L253 294 L263 295" fill="none" stroke="#bd9588" strokeWidth="2" strokeLinecap="round" />
      <path d="M247 309 Q260 316 273 309" fill="none" stroke="#a36f70" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M210 287 Q214 319 237 337 L260 345 L283 337 Q306 319 310 287" fill="none" stroke="#c39b8e" strokeWidth="2" opacity=".7" />
      <path d="M200 224 Q177 238 185 282 L203 309 L211 281 L208 249Z" fill="#8598a8" />
      <path d="M320 224 Q343 238 335 282 L317 309 L309 281 L312 249Z" fill="#8598a8" />
      <path d="M196 219 L213 202 M324 219 L307 202" stroke="#e7e6df" strokeWidth="5" strokeLinecap="round" />
      <path d="M174 445 L198 427 L216 442 L202 461 L180 461Z" fill={accent} opacity=".9" />
      <path d="M346 445 L322 427 L304 442 L318 461 L340 461Z" fill={accent} opacity=".9" />
      {drone ? (
        <g transform="translate(370 365)">
          <path d="M-33 0 L-15 -16 H15 L33 0 L15 16 H-15Z" fill="#34485b" stroke={accent} strokeWidth="2" />
          <circle r="8" fill={accent} />
          <path d="M-45 -22 L-25 -12 M45 -22 L25 -12" stroke="#9cabb8" strokeWidth="3" strokeLinecap="round" />
        </g>
      ) : (
        <g transform="rotate(-15 360 408)">
          <rect x="336" y="360" width="24" height="108" rx="5" fill="#202d3c" stroke="#899aa7" strokeWidth="2" />
          <rect x="331" y="352" width="34" height="24" rx="4" fill="#536679" stroke="#a7b4bc" strokeWidth="2" />
          <path d="M348 382 V436" stroke={accent} strokeWidth="3" />
          {scatter && <path d="M339 400 H357 M339 411 H357" stroke="#d8b17b" strokeWidth="3" />}
        </g>
      )}
      {engineer && <g transform="translate(151 355)"><circle r="24" fill="#263547" stroke={accent} strokeWidth="2"/><path d="M-10 0 H10 M0 -10 V10" stroke={accent} strokeWidth="3"/></g>}
      <path d="M120 568 H400" stroke={accent} strokeWidth="2" opacity=".35" />
      <text x="260" y="594" textAnchor="middle" fill="#a8b8c5" fontSize="11" letterSpacing="4">STARBREAK / OPERATIVE</text>
    </svg>
  );
}
