import { useId } from 'react';
import { ArrowRight, Check, ChevronRight, CircleHelp, Crosshair, Cpu, Hexagon, LockKeyhole, Magnet, Radio, Shield, Sparkles, Target, Zap } from 'lucide-react';
import { RECIPES, getRecipeState } from './model';
import type { Profile, RecipeId, WeaponId, CharacterId } from './model';
import './camp.css';

type CampProps = {
  profile: Profile;
  onBuy: (id: RecipeId) => void;
  onSelectWeapon: (id: WeaponId) => void;
  onSelectCharacter: (id: CharacterId) => void;
  onTrack: (id: RecipeId) => void;
  onStart: () => void;
  onOpenHelp: () => void;
};

const materials = [
  { key: 'alloy', label: '废合金', Icon: Hexagon },
  { key: 'chips', label: '战术芯片', Icon: Cpu },
  { key: 'cores', label: '异常核心', Icon: Sparkles },
] as const;

const weaponInfo: { id: WeaponId; title: string; subtitle: string; Icon: typeof Crosshair }[] = [
  { id: 'pulse', title: '脉冲步枪', subtitle: '精准 · 中距离', Icon: Crosshair },
  { id: 'scatter', title: '散射枪', subtitle: '扇形 · 近距离', Icon: Zap },
  { id: 'drone', title: '环绕无人机', subtitle: '环绕 · 范围攻击', Icon: Radio },
];

const recipeIcons: Record<RecipeId, typeof Shield> = { health: Shield, magnet: Magnet, scatter: Zap, drone: Radio, engineer: Cpu, trail: Sparkles };

function Operative({ engineer, trail }: { engineer: boolean; trail: boolean }) {
  const uid = useId().replace(/:/g, '');
  const color = engineer ? '#ffcd72' : '#78f8dd';
  return <svg className="camp-operative" viewBox="0 0 700 390" role="img" aria-label={engineer ? '无人机工程师站在出发平台上' : '枪手站在出发平台上'}>
    <defs>
      <radialGradient id={`${uid}-ground`}><stop stopColor={color} stopOpacity=".2" /><stop offset="1" stopColor={color} stopOpacity="0" /></radialGradient>
      <linearGradient id={`${uid}-armor`} x1="0" x2="1"><stop stopColor="#324954" /><stop offset=".5" stopColor="#6b858f" /><stop offset="1" stopColor="#233944" /></linearGradient>
      <linearGradient id={`${uid}-visor`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={color} /><stop offset="1" stopColor="#236a72" /></linearGradient>
      <filter id={`${uid}-glow`}><feGaussianBlur stdDeviation="4" /></filter>
    </defs>
    <path d="M0 329 92 282 163 302 221 243 305 277 389 239 482 278 549 250 700 316V390H0Z" fill="#111f29" />
    <path d="m0 364 108-44 93 23 98-34 97 40 106-19 88 24 110-22v58H0Z" fill="#0e1b24" />
    <ellipse cx="357" cy="317" rx="212" ry="62" fill={`url(#${uid}-ground)`} />
    <ellipse cx="357" cy="310" rx="152" ry="38" fill="#142731" stroke="#34535e" strokeWidth="2" />
    <ellipse cx="357" cy="305" rx="132" ry="30" fill="#192f38" stroke={color} strokeOpacity=".35" strokeDasharray="30 45" strokeWidth="2" />
    <ellipse cx="357" cy="303" rx="73" ry="17" fill="#0c1d25" stroke="#476570" />
    <path d="m185 316 17 20m322-20-17 20M309 273l-6-17m107 17 7-17" stroke={color} strokeOpacity=".7" strokeWidth="3" />
    {trail && <><path d="M339 290c-53-35-63-80-92-97m131 97c62-37 87-78 104-114" fill="none" stroke="#b992ff" strokeWidth="9" opacity=".3" filter={`url(#${uid}-glow)`} /><path d="M339 290c-53-35-63-80-92-97m131 97c62-37 87-78 104-114" fill="none" stroke="#cbb0ff" strokeWidth="2" opacity=".7" /></>}
    <ellipse cx="355" cy="302" rx="42" ry="10" fill="#050e15" opacity=".8" />
    <g className="camp-astronaut">
      <path d="m332 229-9 58 6 12h20l7-64m13-6 15 58-4 12h-21l-7-64" fill="#213742" stroke="#63808a" strokeWidth="2" />
      <path d="m325 283-2 15h28v-13m13 0v13h26l-6-15" fill="#15242f" stroke="#4b6977" />
      <path d="m329 170-14 24 7 44 28 10 31-11 8-43-13-24Z" fill={`url(#${uid}-armor)`} stroke="#92aab1" strokeWidth="1.5" />
      <path d="m334 178 16 13 19-13-3 39-17 12-17-12Z" fill="#172d36" stroke="#395762" />
      <path d="M341 198h16m-16 7h16" stroke={color} strokeWidth="3" />
      <path d="m319 178-14 3-14 40 10 10 13-7 13-34m56-12 14 4 15 38-10 11-13-7-14-34" fill="#34515e" stroke="#8aa0aa" strokeWidth="1.5" />
      <path d="m293 218 8 15 20-8-4-13m84 5-8 17-18-9 4-13" fill="#182b37" stroke="#526e7d" />
      <path d="M330 154c0-25 12-38 26-38s27 14 27 38l-6 23h-39Z" fill={`url(#${uid}-armor)`} stroke="#94afb5" strokeWidth="2" />
      <path d="m335 143 40-2-1 19-17 9-20-8Z" fill="#0b2632" />
      <path d="m339 146 31-1-1 10-13 6-16-6Z" fill={`url(#${uid}-visor)`} />
      <path d="M342 170h26m-21-48h17" stroke="#bdd7dc" strokeOpacity=".7" strokeWidth="2" />
      {!engineer && <g transform="rotate(-14 346 216)"><path d="M302 206h82v13h-35l-6 17h-13l1-17h-29Z" fill="#15252d" stroke="#78939c" strokeWidth="1.5" /><path d="M376 208h19v8h-19m-57-9h27v5h-27" fill={color} /></g>}
      {engineer && <><rect x="328" y="213" width="43" height="23" rx="3" fill="#183542" stroke={color} /><path d="M335 221h12m-12 6h27" stroke={color} strokeWidth="2" /></>}
    </g>
    {engineer && <g className="camp-companion"><ellipse cx="451" cy="156" rx="37" ry="9" fill={color} opacity=".12" /><path d="m424 149 15-10h27l15 10-15 12h-27Z" fill="#2f4b55" stroke="#a2b0b0" /><rect x="443" y="145" width="17" height="9" rx="3" fill={color} /><path d="M435 165v12m30-12v12" stroke={color} opacity=".6" strokeWidth="3" /></g>}
    <g fill="#4d6d77" opacity=".8"><path d="m129 269 25-8 9 13-30 7Z" /><path d="m521 291 19-14 23 9-8 12Z" /><path d="m571 322 16-9 19 13-20 5Z" /></g>
    <path d="M91 181v99m-8-84h17m-9-14 7 12" stroke="#496a77" strokeWidth="2" /><circle cx="91" cy="178" r="3" fill={color} />
  </svg>;
}

export default function Camp({ profile, onBuy, onSelectWeapon, onSelectCharacter, onTrack, onStart, onOpenHelp }: CampProps) {
  const target = RECIPES.find(item => item.id === profile.tracked) || RECIPES[2];
  const targetState = getRecipeState(profile, target.id);
  const completed = targetState.maxed || targetState.owned && !target.maxLevel;
  return <div className="camp">
    <header className="camp-header">
      <div className="camp-brand"><span className="camp-brand-mark"><Crosshair size={26} /></span><div><strong>星域突围<span>STARBREAK</span></strong><small>边境营地 · OUTPOST 07</small></div></div>
      <div className="camp-wallet" aria-label="仓库物资">{materials.map(({ key, label, Icon }) => <div className={`camp-resource camp-resource-${key}`} key={key}><Icon size={19} /><span><small>{label}</small><b>{profile[key].toLocaleString()}</b></span></div>)}</div>
      <button className="camp-help" onClick={onOpenHelp}><CircleHelp size={18} /><span>行动指南</span></button>
    </header>

    <main className="camp-main">
      <div className="camp-topline"><span><i /> 营地通讯正常</span><span>本地存档已启用 <span className="camp-topline-divider">/</span> FRONTIER SECTOR 07</span></div>
      <section className="camp-mission">
        <div className="camp-stage">
          <div className="camp-stage-stars" />
          <div className="camp-stage-orbit" />
          <div className="camp-stage-heading"><span className="camp-eyebrow">EXTRACTION PROTOCOL</span><h1>进入未知。<br /><em>带回未来。</em></h1><p>180 秒撤离行动</p></div>
          <div className="camp-stage-coordinate">XR-07<br /><span>28° 19′ N / 112° 48′ E</span></div>
          <Operative engineer={profile.selectedCharacter === 'engineer'} trail={profile.trail} />
          <div className="camp-operative-label"><span>已部署干员</span><strong>{profile.selectedCharacter === 'engineer' ? '无人机工程师' : '先锋枪手'}</strong><small>{profile.selectedCharacter === 'engineer' ? 'DRONE ENGINEER / 战术协同' : 'FRONTIER GUNNER / 稳定火力'}</small></div>
          <div className="camp-stage-badge"><Shield size={15} /> 装备永久保留</div>
        </div>
        <aside className="camp-briefing">
          <div className="camp-mission-title"><span className="camp-eyebrow">下一次行动</span><span className="camp-online"><i /> 单人行动</span></div>
          <h2>异常矿区 <span>07</span></h2><p className="camp-briefing-copy">搜集物资，判断风险。<br />只有成功撤离，才能带回稀有战利品。</p>
          <div className="camp-timeline"><div><b>00:00</b><span>搜集 / 成长</span></div><ChevronRight size={14} /><div><b>01:30</b><span>撤离门开启</span></div><ChevronRight size={14} /><div className="camp-timeline-danger"><b>02:00</b><span>Boss 降临</span></div></div>
          <div className="camp-objective">
            <div className="camp-objective-label"><Target size={15} /> 当前追踪目标{completed && <span>已达成</span>}</div>
            <div className="camp-objective-name"><strong>{target.title}</strong><small>{target.maxLevel ? `Lv.${targetState.level} / ${target.maxLevel}` : completed ? '已解锁' : '待解锁'}</small></div>
            <div className="camp-objective-resources">{materials.filter(({ key }) => targetState.cost[key] > 0).map(({ key, label, Icon }) => <div key={key}><div><span><Icon size={12} />{label}</span><b className={profile[key] >= targetState.cost[key] ? 'camp-enough' : ''}>{profile[key]}<small> / {targetState.cost[key]}</small></b></div><div className="camp-progress"><i style={{ width: `${Math.min(100, profile[key] / targetState.cost[key] * 100)}%` }} /></div></div>)}</div>
            {targetState.canAfford && !completed && <button className="camp-target-redeem" onClick={() => onBuy(target.id)}>材料已齐，立即兑换 <ArrowRight size={14} /></button>}
          </div>
          <button className="camp-launch" onClick={onStart}><span><Crosshair size={21} />开始行动</span><ArrowRight size={22} /></button>
          <p className="camp-control-hint"><kbd>W A S D</kbd> 移动 <span>·</span> <kbd>空格</kbd> 冲刺 <span>·</span> 自动攻击</p>
        </aside>
      </section>

      <section className="camp-loadout-section">
        <div className="camp-section-title"><div><span className="camp-section-index">01</span><h2>出发配置</h2><p>选择下一局的起始装备</p></div><span className="camp-section-meta">LOADOUT</span></div>
        <div className="camp-loadout-grid">
          <div className="camp-loadout-group"><span className="camp-group-label">起始武器</span><div className="camp-weapon-options">{weaponInfo.map(({ id, title, subtitle, Icon }) => {
            const owned = profile.weapons.includes(id), selected = profile.selectedWeapon === id;
            return <button key={id} className={`camp-equipment ${selected ? 'is-selected' : ''} ${!owned ? 'is-locked' : ''}`} aria-pressed={selected} onClick={() => owned ? onSelectWeapon(id) : onTrack(id as RecipeId)}><Icon size={22} /><span><strong>{title}</strong><small>{subtitle}</small></span>{selected ? <Check size={15} /> : !owned ? <LockKeyhole size={14} /> : null}</button>;
          })}</div></div>
          <div className="camp-loadout-group camp-character-group"><span className="camp-group-label">行动干员</span><div className="camp-character-options">{([{ id: 'gunner', label: '先锋枪手' }, { id: 'engineer', label: '工程师' }] as const).map(({ id, label }) => {
            const owned = profile.characters.includes(id), selected = profile.selectedCharacter === id;
            return <button key={id} className={`camp-character ${selected ? 'is-selected' : ''} ${!owned ? 'is-locked' : ''}`} aria-pressed={selected} onClick={() => owned ? onSelectCharacter(id) : onTrack('engineer')}>{id === 'gunner' ? <Crosshair size={19} /> : <Cpu size={19} />}<span>{label}</span>{selected ? <Check size={14} /> : !owned ? <LockKeyhole size={13} /> : null}</button>;
          })}</div></div>
        </div>
      </section>

      <section className="camp-workshop-section">
        <div className="camp-section-title"><div><span className="camp-section-index">02</span><h2>物资兑换</h2><p>把这次收获，变成下一次的优势</p></div><span className="camp-section-meta">WORKSHOP / 06</span></div>
        <div className="camp-recipes">{RECIPES.map(recipe => {
          const state = getRecipeState(profile, recipe.id), Icon = recipeIcons[recipe.id];
          const done = state.maxed || state.owned && !recipe.maxLevel;
          return <article className={`camp-recipe ${profile.tracked === recipe.id ? 'is-tracked' : ''} ${done ? 'is-completed' : ''}`} key={recipe.id}>
            <div className="camp-recipe-top"><span className={`camp-recipe-icon camp-icon-${recipe.id}`}><Icon size={22} /></span><button className="camp-track" aria-label={`${profile.tracked === recipe.id ? '正在追踪' : '追踪'}${recipe.title}`} aria-pressed={profile.tracked === recipe.id} onClick={() => onTrack(recipe.id)}><Target size={14} />{profile.tracked === recipe.id ? '已追踪' : '追踪'}</button></div>
            <div className="camp-recipe-title"><h3>{recipe.title}</h3>{recipe.maxLevel && <span>Lv.{state.level}<small> / {recipe.maxLevel}</small></span>}</div>
            <p>{recipe.description}</p>
            <div className="camp-recipe-bottom"><div className="camp-cost">{done ? <span className="camp-owned"><Check size={14} />{recipe.maxLevel ? '已满级' : '永久解锁'}</span> : materials.filter(({ key }) => state.cost[key] > 0).map(({ key, label, Icon: MaterialIcon }) => <span key={key} className={profile[key] < state.cost[key] ? 'is-short' : ''} title={`${label} ${profile[key]} / ${state.cost[key]}`}><MaterialIcon size={13} />{state.cost[key]}</span>)}</div><button className="camp-buy" disabled={done || !state.canAfford} onClick={() => onBuy(recipe.id)}>{done ? <Check size={15} /> : recipe.maxLevel ? '强化' : '兑换'}{!done && <ChevronRight size={14} />}</button></div>
          </article>;
        })}</div>
      </section>
      <footer className="camp-footer"><span><span className="camp-footer-dot" /> 营地记录 <b>{profile.stats.runs}</b> 次行动 <span>/</span> <b>{profile.stats.extracts}</b> 次成功撤离 <span>/</span> <b>{profile.stats.bossKills}</b> 次击败 Boss</span><span>FRONTEND PLAYTEST <span>·</span> 进度保存在当前浏览器</span></footer>
    </main>
  </div>;
}
