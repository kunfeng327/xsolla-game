import type { Profile } from '../../profile/types';

/** Anime-inspired operative illustration, drawn as self-contained SVG. */
export function Operative({ profile }: { profile: Profile }) {
  const engineer = profile.selectedCharacter === 'engineer';
  const drone = profile.selectedWeapon === 'drone';
  const scatter = profile.selectedWeapon === 'scatter';
  const accent = engineer ? '#b9a7d9' : '#9bcbd0';
  const id = engineer ? 'sb-engineer' : 'sb-scout';
  return (
    <svg className="camp-operative anime-operative" viewBox="0 0 520 620" role="img"
      aria-label={engineer ? '星域工程师角色立绘' : '星域侦察员角色立绘'}>
      <defs>
        <linearGradient id={id+'-coat'} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#536477"/><stop offset="1" stopColor="#263445"/>
        </linearGradient>
        <linearGradient id={id+'-hair'} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#e0ded9"/><stop offset="1" stopColor="#8497aa"/>
        </linearGradient>
        <radialGradient id={id+'-halo'}>
          <stop stopColor={accent} stopOpacity=".32"/><stop offset="1" stopColor={accent} stopOpacity="0"/>
        </radialGradient>
      </defs>
      <ellipse cx="260" cy="530" rx="220" ry="76" fill={'url(#'+id+'-halo)'}/>
      <circle cx="260" cy="275" r="194" fill="#91a8bb" opacity=".07"/>
      <path d="M112 548 Q128 463 183 437 L215 418 H305 L340 437 Q393 463 409 548Z" fill="#1b2838" stroke="#687e90" strokeWidth="2"/>
      <path d="M177 448 L218 422 L260 463 L302 422 L343 448 L321 548 H199Z" fill={'url(#'+id+'-coat)'} stroke="#91a0ad" strokeWidth="2"/>
      <path d="M218 422 L260 463 L302 422 L291 490 L260 516 L229 490Z" fill="#d3d7d8"/>
      <path d="M246 464 L260 481 L274 464 L282 548 H238Z" fill={accent} opacity=".9"/>
      <path d="M186 451 L153 486 L167 535 L207 535 L218 477Z M334 451 L367 486 L353 535 L313 535 L302 477Z" fill="#35475a" stroke="#8194a3" strokeWidth="2"/>
      <path d="M198 532 L322 532 L339 561 Q260 580 181 561Z" fill="#202c3c" stroke="#718594" strokeWidth="2"/>
      <rect x="226" y="488" width="68" height="28" rx="5" fill="#263849" stroke="#8a9da9"/>
      <path d="M240 502 H280" stroke={accent} strokeWidth="3" strokeLinecap="round"/>
      <path d="M219 415 L211 362 L202 323 L318 323 L309 362 L301 415 Q260 443 219 415Z" fill="#d8bba9"/>
      <path d="M202 329 Q188 277 204 219 Q213 168 260 160 Q308 164 319 218 Q333 272 318 329 L302 356 L218 356Z" fill={'url(#'+id+'-hair)'}/>
      <path d="M211 260 Q218 218 260 219 Q302 218 309 260 L301 320 Q288 348 260 350 Q232 348 219 320Z" fill="#efd7c8"/>
      <path d="M207 260 Q184 218 211 184 Q230 151 263 158 Q303 150 321 191 Q338 222 313 264 L302 232 L281 207 L248 221 L222 208Z" fill={'url(#'+id+'-hair)'}/>
      <path d="M213 255 Q224 230 246 240 L242 250 Q229 246 220 261Z M274 240 Q296 230 307 255 L300 261 Q291 246 277 250Z" fill="#53687b"/>
      <ellipse cx="234" cy="266" rx="12" ry="15" fill="#f7f5ef"/><ellipse cx="286" cy="266" rx="12" ry="15" fill="#f7f5ef"/>
      <ellipse cx="236" cy="269" rx="6" ry="10" fill={accent}/><ellipse cx="284" cy="269" rx="6" ry="10" fill={accent}/>
      <circle cx="238" cy="265" r="3" fill="#263445"/><circle cx="282" cy="265" r="3" fill="#263445"/>
      <path d="M224 247 L245 243 M275 243 L296 247" stroke="#46576a" strokeWidth="4" strokeLinecap="round"/>
      <path d="M257 280 L253 294 L263 295 M247 309 Q260 316 273 309" fill="none" stroke="#ad7d72" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M200 224 Q177 238 185 282 L203 309 L211 281 L208 249Z M320 224 Q343 238 335 282 L317 309 L309 281 L312 249Z" fill="#8598a8"/>
      <path d="M196 219 L213 202 M324 219 L307 202" stroke="#e7e6df" strokeWidth="5" strokeLinecap="round"/>
      <path d="M174 445 L198 427 L216 442 L202 461 L180 461Z M346 445 L322 427 L304 442 L318 461 L340 461Z" fill={accent}/>
      {drone ? <g transform="translate(370 365)"><path d="M-33 0 L-15 -16 H15 L33 0 L15 16 H-15Z" fill="#34485b" stroke={accent} strokeWidth="2"/><circle r="8" fill={accent}/><path d="M-45 -22 L-25 -12 M45 -22 L25 -12" stroke="#9cabb8" strokeWidth="3" strokeLinecap="round"/></g>
      : <g transform="rotate(-15 360 408)"><rect x="336" y="360" width="24" height="108" rx="5" fill="#202d3c" stroke="#899aa7" strokeWidth="2"/><rect x="331" y="352" width="34" height="24" rx="4" fill="#536679" stroke="#a7b4bc" strokeWidth="2"/><path d="M348 382 V436" stroke={accent} strokeWidth="3"/>{scatter && <path d="M339 400 H357 M339 411 H357" stroke="#d8b17b" strokeWidth="3"/>}</g>}
      {engineer && <g transform="translate(151 355)"><circle r="24" fill="#263547" stroke={accent} strokeWidth="2"/><path d="M-10 0 H10 M0 -10 V10" stroke={accent} strokeWidth="3"/></g>}
      <path d="M120 568 H400" stroke={accent} strokeWidth="2" opacity=".45"/>
      <text x="260" y="594" textAnchor="middle" fill="#a8b8c5" fontSize="11" letterSpacing="4">STARBREAK / OPERATIVE</text>
    </svg>
  );
}
