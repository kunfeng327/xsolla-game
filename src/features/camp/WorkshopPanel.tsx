import { ArrowRight, Backpack, CheckCircle2, ChevronRight, Shield, Target } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import { RECIPES } from '../../config/catalog';
import { getRecipeState } from '../../profile/growth';
import type { TrackId } from '../../profile/types';
import './camp.css';
import { missing, recipeIcons } from './campPresentation';
import { Cost } from './Cost';
import { RewardPreview } from './RewardPreview';
import type { CampProps, Tab } from './types';

type Props = Pick<CampProps, 'profile' | 'onBuy'> & {
  tab: Tab;
  setTab: Dispatch<SetStateAction<Tab>>;
  track: (id: TrackId) => void;
};
export default function WorkshopPanel({ profile, onBuy, tab, setTab, track }: Props) {
  return (
    <section
      id="camp-panel-workshop"
      className="camp-tab-section"
      role="tabpanel"
      aria-labelledby="camp-tab-workshop"
      hidden={tab !== 'workshop'}
    >
      <div className="camp-section-heading">
        <div>
          <span className="camp-eyebrow">把收获，变成下一次的优势</span>
          <h1>营地工坊</h1>
          <p>选择一个成长目标，行动时就知道该搜集什么。</p>
        </div>
        <button className="camp-outline-button" onClick={() => setTab('action')}>
          返回行动 <ArrowRight size={17} />
        </button>
      </div>
      <div className="camp-workshop-shortcuts">
        <button
          onClick={() => {
            setTab('equipment');
          }}
        >
          <Backpack size={22} />
          <span>
            <strong>模块与背包扩容</strong>
            <small>尝试穿甲、防御和冲刺搭配</small>
          </span>
          <ArrowRight size={20} />
        </button>
        <div>
          <Shield size={18} />
          <span>解锁与强化永久保留，下一局生效。</span>
        </div>
      </div>
      <div className="camp-recipes">
        {RECIPES.map((recipe) => {
          const state = getRecipeState(profile, recipe.id),
            Icon = recipeIcons[recipe.id];
          return (
            <article
              key={recipe.id}
              className={`camp-recipe ${profile.tracked === recipe.id ? 'is-tracked' : ''}`}
            >
              <div className="camp-recipe-head">
                <span>
                  <Icon size={26} />
                </span>
                <button className="camp-text-button" onClick={() => track(recipe.id)}>
                  <Target size={15} />
                  {profile.tracked === recipe.id ? '当前目标' : '设为目标'}
                </button>
              </div>
              <div className="camp-recipe-title">
                <h2>{recipe.title}</h2>
                {recipe.maxLevel && (
                  <span>
                    {state.level}/{recipe.maxLevel} 强化
                  </span>
                )}
              </div>
              <p>{recipe.description}</p>
              <RewardPreview id={recipe.id} />
              <div className="camp-recipe-footer">
                {state.maxed ? (
                  <span className="camp-complete-label">
                    <CheckCircle2 size={17} />
                    {recipe.maxLevel ? '已满级' : '永久解锁'}
                  </span>
                ) : (
                  <>
                    <Cost cost={state.cost} profile={profile} />
                    <div>
                      <small>{missing(profile, state.cost)}</small>
                      <button
                        className="camp-buy"
                        disabled={!state.canAfford}
                        onClick={() => onBuy(recipe.id)}
                      >
                        {recipe.maxLevel ? '强化' : '解锁并装备'}
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
