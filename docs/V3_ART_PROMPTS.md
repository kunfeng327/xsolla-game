# V3 机库背景来源

2026-10-21 使用 OpenAI imagegen 为本项目生成一张静态机库背景，作为首页原生 HTML/CSS 与可变装 SVG 干员的环境图层。战斗角色和道具的 Kenney CC0 素材来源另见 [ASSETS.md](ASSETS.md)。

- 项目内文件：`src/assets/hangar-v3.webp`（1672×941，约164KB）。
- 离线嵌入：`src/assets/hangar.ts` 以 `?inline` 引用本地 WebP，导出 `HANGAR_IMAGE`，运行时无需访问图片服务。
- 原始生成图保存在本机生成图片目录：`C:/Users/13364/.codex/generated_images/01a15957-52e4-7af2-81f8-97bfb10967a5/exec-5652e6ee-0de7-438f-b8f4-e5b96fa327f0.png`。该绝对路径仅为本机溯源，不是运行依赖。
- 将 PNG 转为 WebP，只做传输体积优化；没有进行内容修改。
- 这是 AI 生成的环境插画，不应标注为 Kenney CC0 素材或实机战斗截图。

## 实际使用的完整提示词

Create one polished game environment background illustration for STARBREAK, a small sci-fi extraction roguelite. Asset type: landscape 16:9 hangar background, no UI, no text, no logos, no people. A compact frontier deployment hangar with an empty circular raised preparation pad centered slightly left, a few industrial equipment racks and sealed cargo cases at the rear, a large open launch bay looking toward a distant alien mining landscape on the right. Clean stylized graphic 3D/cel-shaded illustration, cohesive low-poly hard-surface forms, readable silhouettes and deliberately limited detail, premium indie science-fiction art direction rather than photorealism. Dark blue-grey metal, restrained cyan practical lights and small warm amber warning strips, soft atmospheric depth, convincing pad shadows and gentle volumetric rays. The foreground central pad must remain unobstructed so an existing illustrated operative can be overlaid. Keep upper and far-left portions quieter and dark enough for functional HTML text overlays. Strong spatial composition, cinematic but friendly, no extreme contrast, no busy control consoles, no floating holographic labels, no lettering at all. Final background should work behind a responsive game preparation screen.
