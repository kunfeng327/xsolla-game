# 源码导航与模块边界

本目录对应现有 React + TypeScript + Canvas 单人 Demo。当前没有 Go 登录、服务端资产、真实支付或 Datadog/K8s 实现。本次整理保留现有玩法、数值与存档键。

## 入口与完整流程

- 浏览器入口：`src/main.tsx`。
- 页面组织：`src/app/App.tsx`，协调营地、战局、结算及档案更新。
- 战斗接入：`src/features/battle/BattlePage.tsx`。
- 引擎公开入口：`src/game/core/StarbreakGame.ts`。
- 本局内部状态与生命周期：`src/game/core/GameSession.ts`。
- 更新顺序：`src/game/core/update.ts`。

营地档案 → 装配快照 → StarbreakGame → 单局运行 → GameResult → applySettlement → 保存档案 → 营地/下一局。

App 保留每局只接收一次结算的保护；具体材料与统计更新由 profile/settlement.ts 执行。中途刷新不会保存未结算战局。

## 按功能寻找代码

| 想修改什么 | 主要入口 |
| --- | --- |
| 页面切换、开局、接收结果、重置档案 | src/app/App.tsx |
| 营地行动首页 | src/features/camp/ActionPanel.tsx |
| 营地装备、模块装配与强化按钮 | src/features/camp/EquipmentPanel.tsx |
| 营地工坊、兑换和目标追踪 | src/features/camp/WorkshopPanel.tsx |
| 营地页签与键盘切换 | src/features/camp/Camp.tsx |
| HUD、导航按钮、触屏操作 | src/features/battle/BattleHud.tsx |
| 升级、契约、暂停和设置 | src/features/battle/UpgradeDialog.tsx、ContractDialog.tsx、BattleMenu.tsx |
| 帮助和结算页面 | src/features/help/HelpDialog.tsx、src/features/settlement/SettlementPage.tsx |
| 玩家移动、冲刺与模块等级读取 | src/game/combat/player.ts |
| 射击、无人机、敌方子弹生成 | src/game/combat/weapons.ts |
| 子弹移动、命中、穿透、连锁、范围爆炸 | src/game/combat/projectiles.ts |
| 小怪招式、追击寻路、刷怪压力与敌群分离 | src/game/combat/enemies.ts |
| Boss 启动、招式和退出据点 | src/game/combat/boss.ts |
| 受伤、护盾、击杀、掉落、连杀奖励、Boss 奖励 | src/game/combat/damage.ts |
| 地块、设施布局、掩体碰撞 | src/game/world/chunks.ts |
| 区块加载、资源事件、可交互目标 | src/game/world/exploration.ts |
| 经验、升级抽选、升级效果 | src/game/progression/upgrades.ts |
| 风险契约的消耗、概率与效果 | src/game/progression/contracts.ts |
| 补给拾取与临时效果计时 | src/game/progression/supplies.ts |
| 撤离请求、倒计时、取消与结束战局 | src/game/extraction/extraction.ts |
| 世界、角色、导航的绘制 | src/game/rendering/worldRenderer.ts、actorRenderer.ts、navigationRenderer.ts |
| 整帧绘制、粒子、飘字与通知 | src/game/rendering/renderer.ts、effects.ts |
| 声音合成与静音 | src/game/audio/CombatAudio.ts |
| 永久解锁、升级、兑换、扩容规则 | src/profile/growth.ts |
| 装配容量、装卸规则与开局快照 | src/profile/loadout.ts |
| 结算材料计算、入库与统计 | src/profile/settlement.ts |
| 默认档案与永久数据类型 | src/profile/initialProfile.ts、types.ts |
| 本地存档兼容和保存 | src/storage/profileStorage.ts |
| HUD 大小、音效和震屏偏好 | src/storage/battlePreferences.ts |
| 永久商品、模块与名称配置 | src/config/catalog.ts |
| 基础升级和契约展示选项 | src/config/progression.ts |

部分玩法天然跨模块，例如击杀后掉落在伤害模块生成拾取物，拾取后生效在补给模块处理；Boss 奖励在伤害模块处理，Boss 招式在 Boss 模块处理。修改时沿调用关系检查，不要复制规则。

## 边界约定

### React 页面与游戏引擎

React 通过 StarbreakGame 发送移动、交互、选择升级、暂停等命令，通过 onHud/onUpgrade/onContract/onFinish 接收状态。页面不要直接修改 GameSession 的敌人、生命或战利品。

GameSession 是单局内部协作上下文，集中持有当前角色、敌人、地图和计时状态。玩法函数使用显式的 `this: GameSession` 类型，并作为实例方法挂接，保留原来的执行顺序。调用时使用 `session.method()`；不要把系统函数脱离实例直接当回调使用。

这次按职责拆开实现，保留共享战局状态，没有引入新的游戏框架、服务或事件总线。只有 core 负责整个战局的启动、帧循环与销毁。

### 永久档案与局内状态

profile 处理跨局保留的材料、装备、模块、装配和统计。game 管理本局生命、敌人、临时升级、契约和待带出材料。createRunLoadout 复制当前装配；局内变化不直接写入永久档案。

### 规则与存储

profile 中的成长和结算函数不直接读写 localStorage。storage 负责浏览器读写、旧档案兼容和偏好保存。将来接 Go 时先替换数据边界。

### 配置与素材

config 保存已提取的目录配置、基础升级选项和配色；武器、敌人、Boss 的部分数值仍在对应玩法文件里，并未全部配置化。

原始图片保存在 src/assets/。sprites.ts 与 assets/hangar.ts 使用本地 `?inline` 导入，Vite 构建时生成 data URL，无需手工维护大型 Base64 字符串。素材许可和来源见 docs/ASSETS.md、docs/V3_ART_PROMPTS.md。

### 样式与共享代码

app/styles.css 保留原有全局基础和兼容样式；营地与战斗样式分别放在对应 feature。shared 只放当前确实共用的材料展示、时间格式化、几何工具。

## 本地开发与检查

在项目根目录执行：

```powershell
npm ci
npm run dev
npm run verify
npm run format:check
npm run build:offline
```

`npm run format` 统一 TypeScript、TSX、CSS、脚本和工程配置格式。自动生成的 dist/、demo/starbreak-play.html、package-lock.json 不参与格式化。

scripts/verify.cjs 是当前验证入口；verify-v2.cjs、verify-v3.cjs 保留为兼容命令，转发到同一套检查。规则检查执行内部 GameSession；公开 StarbreakGame 入口另外检查启动及清理。组件检查执行拆分后的真实组件和回调。

demo/starbreak-play.html 是可发给别人试玩的构建产物，不应作为开发源文件编辑。改完源码后运行 npm run build:offline 重新生成。
