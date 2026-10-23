# 图片与文档参考

## 本项目实机素材

| 文件 | 内容 | 来源 |
| --- | --- | --- |
| `images/battle.png` | 散射枪战斗画面 | 原始 React 页面截图 |
| `images/camp.png` | 营地、目标和出战配置 | 原始 React 页面截图 |
| `images/settlement.png` | 成功带出 46 合金、2 芯片 | 原始 React 页面截图 |
| `images/upgrades.png` | 局内升级三选一 | 已有实机讲解录屏第 33 秒 |
| `images/boss.png` | 核心守卫交战 | 已有实机讲解录屏第 64 秒 |
| `images/workshop.png` | 六项营地兑换 | 已有实机讲解录屏第 81 秒 |

录屏使用本项目实际战斗引擎，带有为讲解制作的 HUD，部分片段加速，与 React 页面布局不同。截图只裁去底部字幕区，没有重绘玩法画面。它们不能作为账号、支付或后端已经实现的证据。

初版角色、场景、粒子和界面由本项目 SVG、Canvas 和 CSS 绘制。v3 增加下述 Kenney 原始 PNG，Canvas 继续负责地形、描边、光效、受击动作和粒子，界面图标来自 `lucide-react`。

## v3 游戏内素材

- 素材包：[Top-down Shooter — Kenney](https://kenney.nl/assets/top-down-shooter)。
- 作者：Kenney Vleugels（Kenney.nl）。
- 官方页面与压缩包内 `License.txt` 标注 Creative Commons Zero（CC0）。
- 获取日期：2026-10-21。
- 许可证原文：`src/assets/kenney/License.txt`。
- 来源、原文件名、像素尺寸及 SHA-256：`src/assets/kenney/manifest.json`。
- 选取的 PNG 为原包文件的逐字节副本，没有改色、重绘、裁切或删除署名。

| 使用名 | 原包文件 | 用途 |
| --- | --- | --- |
| `player` | `PNG/Robot 1/robot1_machine.png` | 先锋枪手 |
| `engineer` | `PNG/Survivor 1/survivor1_gun.png` | 工程师 |
| `normal` | `PNG/Zombie 1/zoimbie1_hold.png` | 普通追击者；原包文件名即为 `zoimbie1` |
| `shooter` | `PNG/Soldier 1/soldier1_machine.png` | 远程射手 |
| `lobber` | `PNG/Man Brown/manBrown_hold.png` | 范围投掷者 |
| `teleporter` | `PNG/Hitman 1/hitman1_silencer.png` | 瞬移突袭者 |
| `boss` | `PNG/Robot 1/robot1_reload.png` | 守卫者的机械角色基础，配合引擎独立轮廓与特效 |
| `chest` | `PNG/Tiles/tile_129.png` | 资源仓；与场景木箱复用同一张未修改原图 |
| `crate` | `PNG/Tiles/tile_129.png` | 场景木箱 |
| `barrel` | `PNG/Tiles/tile_317.png` | 场景桶体 |
| `rock` | `PNG/Tiles/tile_247.png` | 矿区岩石 |

资源仓与环境木箱复用 `crate.png`，由引擎的底座、金色标记与交互文字区分。原误选的 `tile_532.png` 是枪械图案，已从本版资源清单与运行时映射移除。

另附 `playerIdle`、`playerReload`、`engineerIdle`、`normalIdle`、`shooterIdle` 原始静态姿势。该素材包不是完整的角色行走动画；移动摇摆、命中形变与死亡表现由本项目代码实现。

`src/game/rendering/sprites.ts` 使用本地 PNG 的 `?inline` 导入，导出 `ART` 与 `SPRITE_ANGLE = 0`。Vite 在开发与构建时生成 data URL，源码不再手工保存图片 Base64。角色原图朝向屏幕右方（+X），渲染时可直接按瞄准角旋转。素材不依赖远程 CDN，仍可生成单文件离线 HTML。

这些 PNG 用于游戏内部展示。营地已采用独立生成的机库背景插画，其来源与生成说明见 [V3_ART_PROMPTS.md](V3_ART_PROMPTS.md)，不属于 Kenney 的 CC0 文件清单。

## README 组织方式参考

- [Phaser](https://github.com/phaserjs/phaser)：简短定位、演示素材和明确的安装入口。
- [React Three Fiber](https://github.com/pmndrs/react-three-fiber)：清晰的项目说明与快速上手内容。
- [Ourcade Dungeon Crawler Starter](https://github.com/ourcade/phaser3-dungeon-crawler-starter)：可玩入口、运行步骤和素材来源说明。

以上仅用于参考文档组织，没有复制其游戏图片、代码或许可证，也不表示本项目使用 Phaser 或 Three.js。
