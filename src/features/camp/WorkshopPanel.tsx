import {
  ArrowLeft,
  ArrowRight,
  Backpack,
  CheckCircle2,
  ChevronRight,
  Crown,
  Gem,
  Grid2X2,
  Shield,
  Sparkles,
  Target,
  UserRound,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { RECIPES } from '../../config/catalog';
import { getRecipeState } from '../../profile/growth';
import type { RecipeId, TrackId } from '../../profile/types';
import { missing } from './campPresentation';
import { Cost } from './Cost';
import { RewardPreview } from './RewardPreview';
import ShopItemArt from './ShopItemArt';
import type { CampProps, Tab } from './types';
import './shop.css';

type Props = Pick<CampProps, 'profile' | 'onBuy'> & {
  tab: Tab;
  setTab: Dispatch<SetStateAction<Tab>>;
  track: (id: TrackId) => void;
};
const categories = [
  { id: 'all', name: '精选推荐', en: 'FEATURED', Icon: Crown },
  { id: 'weapon', name: '武器军械', en: 'WEAPONS', Icon: Zap },
  { id: 'agent', name: '先锋干员', en: 'OPERATIVES', Icon: UserRound },
  { id: 'appearance', name: '星域外观', en: 'COSMETICS', Icon: Sparkles },
  { id: 'upgrade', name: '战术强化', en: 'UPGRADES', Icon: Shield },
] as const;
type Category = (typeof categories)[number]['id'];
const productCategory: Record<RecipeId, Category> = {
  health: 'upgrade',
  magnet: 'upgrade',
  scatter: 'weapon',
  drone: 'weapon',
  engineer: 'agent',
  trail: 'appearance',
};
const productLabel: Record<RecipeId, string> = {
  health: '生存强化',
  magnet: '回收科技',
  scatter: '近战火力',
  drone: '战术武装',
  engineer: '精英干员',
  trail: '星核外观',
};
const displayOrder: RecipeId[] = ['scatter', 'drone', 'trail', 'engineer', 'health', 'magnet'];

export default function WorkshopPanel({ profile, onBuy, tab, setTab, track }: Props) {
  const [category, setCategory] = useState<Category>('all');
  const [selected, setSelected] = useState<RecipeId | null>(null);
  const detail = useRef<HTMLElement>(null);
  const featured = RECIPES.find((r) => r.id === 'engineer')!;
  const featureState = getRecipeState(profile, featured.id);
  const recipe = selected ? RECIPES.find((r) => r.id === selected)! : null;
  const state = selected ? getRecipeState(profile, selected) : null;
  useEffect(() => {
    if (!selected) return;
    const previous = document.activeElement as HTMLElement | null;
    detail.current?.focus();
    return () => previous?.focus();
  }, [selected]);
  return (
    <section
      id="camp-panel-workshop"
      className="camp-tab-section star-shop"
      role="tabpanel"
      aria-labelledby="camp-tab-workshop"
      hidden={tab !== 'workshop'}
    >
      <div className="shop-heading">
        <div>
          <span>
            STARBREAK <i>/</i> ORBITAL EXCHANGE
          </span>
          <h1>
            星域商城 <small>为下一次出击而生</small>
          </h1>
        </div>
        <button className="camp-outline-button" onClick={() => setTab('action')}>
          <ArrowLeft size={16} />
          返回营地
        </button>
      </div>
      <div className="shop-layout">
        <aside className="shop-sidebar" aria-label="商城分类">
          <div className="shop-sidebar-title">
            <Gem size={18} />
            <span>营地物资中心</span>
          </div>
          <nav>
            {categories.map(({ id, name, en, Icon }) => (
              <button
                key={id}
                onClick={() => setCategory(id)}
                aria-pressed={category === id}
                className={category === id ? 'active' : ''}
              >
                <Icon size={20} />
                <span>
                  {name}
                  <small>{en}</small>
                </span>
                <ChevronRight size={15} />
              </button>
            ))}
          </nav>
          <button className="shop-equipment-link" onClick={() => setTab('equipment')}>
            <Backpack size={20} />
            <span>
              模块与背包<small>装配 · 解锁 · 扩容</small>
            </span>
            <ArrowRight size={15} />
          </button>
          <div className="shop-sidebar-note">
            <Shield size={20} />
            <p>
              每次归来
              <br />
              都是新的起点
            </p>
            <small>物资兑换 · 永久保留</small>
          </div>
        </aside>
        <div className="shop-main">
          {category === 'all' && (
            <section className="shop-hero" aria-label="推荐干员：无人机工程师">
              <div className="shop-hero-orbit" aria-hidden="true" />
              <div className="shop-hero-copy">
                <span className="shop-hero-tag">
                  <Crown size={14} />
                  精英档案 / OPERATIVE 02
                </span>
                <p className="shop-hero-kicker">掌控战场的每一寸轨迹</p>
                <h2>
                  无人机<span>工程师</span>
                </h2>
                <p className="shop-hero-description">
                  以科技构筑防线，以无人机接管火力。
                  <br />
                  你的下一次突围，拥有更多可能。
                </p>
                <div className="shop-hero-perks">
                  <span>
                    <Shield size={14} />
                    初始护盾 +20
                  </span>
                  <span>
                    <Zap size={14} />
                    额外无人机 ×1
                  </span>
                </div>
                <button className="shop-gold-button" onClick={() => setSelected('engineer')}>
                  {featureState.maxed ? '查看干员档案' : '查看干员 · 永久解锁'}
                  <ArrowRight size={17} />
                </button>
                <Cost cost={featureState.cost} profile={profile} />
              </div>
              <div className="shop-hero-art">
                <ShopItemArt id="engineer" profile={profile} />
              </div>
              <div className="shop-hero-signature" aria-hidden="true">
                ENGINEER <span>02 / STARBREAK</span>
              </div>
            </section>
          )}
          <div className="shop-collection-heading">
            <div>
              <Grid2X2 size={17} />
              <h2>{categories.find((c) => c.id === category)!.name}</h2>
              <span>COLLECTION</span>
            </div>
            <span>战利品兑换 · 下一局生效</span>
          </div>
          <div className="shop-products">
            {displayOrder
              .filter((id) => category === 'all' || productCategory[id] === category)
              .map((id) => {
                const item = RECIPES.find((r) => r.id === id)!,
                  itemState = getRecipeState(profile, id);
                return (
                  <article className={`shop-product shop-product-${id}`} key={id}>
                    <button
                      className="shop-art-button"
                      onClick={() => setSelected(id)}
                      aria-label={`查看${item.title}详情`}
                    >
                      <span className="shop-product-label">{productLabel[id]}</span>
                      <ShopItemArt id={id} profile={profile} />
                      <span className="shop-art-caption">
                        STARBREAK / {String(displayOrder.indexOf(id) + 1).padStart(2, '0')}
                      </span>
                    </button>
                    <div className="shop-product-body">
                      <div className="shop-product-title">
                        <h3>{item.title}</h3>
                        {item.maxLevel && (
                          <span>
                            Lv.{itemState.level} / {item.maxLevel}
                          </span>
                        )}
                      </div>
                      <p>{item.description}</p>
                      <div className="shop-product-price">
                        {itemState.maxed ? (
                          <span className="camp-complete-label">
                            <CheckCircle2 size={15} />
                            {item.maxLevel ? '已满级' : '永久解锁'}
                          </span>
                        ) : (
                          <Cost cost={itemState.cost} profile={profile} />
                        )}
                      </div>
                      <div className="shop-product-actions">
                        <button className="shop-details-button" onClick={() => setSelected(id)}>
                          {itemState.maxed
                            ? '查看详情'
                            : itemState.canAfford
                              ? item.maxLevel
                                ? '立即强化'
                                : '立即兑换'
                              : '查看兑换'}
                          <ChevronRight size={15} />
                        </button>
                        <button
                          className="shop-track-button"
                          aria-label={`将${item.title}设为目标`}
                          title="设为搜集目标"
                          onClick={() => track(id)}
                        >
                          <Target size={17} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
          </div>
          <div className="shop-bottom-note">
            <Shield size={15} />
            仅使用游戏内物资兑换，解锁与强化永久保留。
          </div>
        </div>
      </div>
      {tab === 'workshop' && recipe && state && (
        <div className="modal-shade shop-detail-shade">
          <section
            ref={detail}
            tabIndex={-1}
            className={`shop-detail shop-product-${recipe.id}`}
            role="dialog"
            aria-modal="true"
            aria-label={`${recipe.title}兑换详情`}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setSelected(null);
              if (event.key === 'Tab') {
                const buttons =
                  detail.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
                if (!buttons?.length) return;
                if (
                  event.shiftKey &&
                  (document.activeElement === buttons[0] ||
                    document.activeElement === detail.current)
                ) {
                  event.preventDefault();
                  buttons[buttons.length - 1].focus();
                } else if (
                  !event.shiftKey &&
                  document.activeElement === buttons[buttons.length - 1]
                ) {
                  event.preventDefault();
                  buttons[0].focus();
                }
              }
            }}
          >
            <button
              className="shop-detail-close"
              onClick={() => setSelected(null)}
              aria-label="关闭兑换详情"
            >
              <X size={21} />
            </button>
            <div className="shop-detail-art">
              <ShopItemArt id={recipe.id} profile={profile} />
            </div>
            <div className="shop-detail-copy">
              <span className="shop-hero-tag">{productLabel[recipe.id]} / PERMANENT</span>
              <h2>{recipe.title}</h2>
              <p>{recipe.description}</p>
              <RewardPreview id={recipe.id} />
              <p className="shop-detail-note">
                永久保留 · 下一局生效
                {recipe.maxLevel ? ` · 当前 ${state.level}/${recipe.maxLevel} 级` : ''}
              </p>
              {state.maxed ? (
                <p className="camp-complete-label">
                  <CheckCircle2 size={17} />
                  {recipe.maxLevel ? '已达到强化上限' : '已拥有此物品'}
                </p>
              ) : (
                <>
                  <Cost cost={state.cost} profile={profile} />
                  <p className="shop-missing">{missing(profile, state.cost)}</p>
                  <button
                    className="shop-gold-button"
                    disabled={!state.canAfford}
                    onClick={() => {
                      onBuy(recipe.id);
                      setSelected(null);
                    }}
                  >
                    {recipe.maxLevel ? '确认强化' : '确认兑换并装备'}
                    <ArrowRight size={16} />
                  </button>
                </>
              )}
              <button
                className="camp-text-button"
                onClick={() => {
                  setSelected(null);
                  track(recipe.id);
                }}
              >
                <Target size={15} />
                设为搜集目标
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
