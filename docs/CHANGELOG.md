# Changelog · 更新日志 (`agy-wallpaper-prism`)

**语言 / Language**: [简体中文](#简体中文更新日志) · [English](#english-changelog) · [返回 README](../README.md) · [文档索引](./README.md)

---

## 简体中文更新日志

### `v2.3.0` — 实时宿主区域拾取器、单实例围栏、无上限视频播放与双语文档

- **新特性：`#14 阶段二` CDP 真实宿主窗口点击拾取区域检查器**
  - 新增 `src/host/inspector-inject.js` 与受鉴权路由 `GET /host/<capToken>/inspector.js`、`POST /api/inspector/pick`、`POST /api/inspector/cancel` 及 RPC `inspector.picked` / `inspector.cancelled`。
  - 通过 `cdp-bridge.mjs :: startInspectorPick` / `cancelInspectorPick`（`evaluateTargetEphemeral`）按需挂载，**对 `buildHostMicroBootstrap`（`<= 6,144 B`）保持 `0 B` 增量**，同时兼容 `gentle-auto` 实时模式、`static-css` 纯静态模式与 `manual` / 停用皮肤状态。
  - 纯结构化 Antigravity `2.35.1` 几何命中测试（支持全部 8 个区域：`topbar`、`wco`、`sidebar`、`workspace`、`card`、`composer`、`rightPane`、`popover`，零文本匹配，兼容 `Antigravity-Chinese-Localization`），支持 `Esc`（优先于关闭编辑器弹窗）、右键取消与 45 秒超时，并在 Aux Pane 与 Popout IDE 双通道 SSE 实时聚焦检查器。
- **稳定性（PR `#11`，合并于 `88a6a0a`）：Sidecar 单实例所有权围栏与孤儿自退出**
  - 感谢 **`@zmzwynzj`** 贡献 **PR `#11`**（[`6b745b0`](https://github.com/zmzwynzj) `fix(sidecar,cdp): fence superseded sidecar instances and exit when orphaned`）：在 `server_info.json` 写入前移原子 `instanceId` 围栏、通过 `cdp-bridge.mjs :: yieldOwnership` 终止被接管实例 `600ms` SSE 重连抢占死循环，并在受管父进程消失时安全退出（`process.exit(0)`）。
  - 融合 `v2.2.0` 身份验证 `/api/shutdown` 接管、`install-local.mjs` 开关状态保活（`6fcef57`）、`DEV_WATCH_ENABLED` 生产轮询门禁（`P1`）与同 PID 端口/注册表防误删守卫（`P2`）。
- **媒体播放优化（`bb06577`）：解除 `fetch+blob` 内存上限并强化降级**
  - 将 `MAX_BLOB_MEDIA_BYTES` 设为 `Infinity`（`BLOB_FETCH_TIMEOUT_MS = 60000`），保障高码率直连视频播放与原生音频；非 `404` 失败或超时自动降级为 `MediaSource` `/mse-fmp4/` 或静态封面，`404`/`403`/`410` 严格保持 Fail-Open。
- **文档重构**：全面升级中英双语 [`README.md`](../README.md) 与 `v2.3.0` [`SKILL.md`](../skills/wallpaper-prism/SKILL.md)，新增 [`docs/README.md`](./README.md) 与 [`docs/CHANGELOG.md`](./CHANGELOG.md)，同步 [`docs/dsh-parity-spec.md`](./dsh-parity-spec.md) 至 `v2.3.0`。

### `v2.2.0` (`eca001d`) — 统一 8 区域架构、第一阶段可视化编辑器、4 套纯 CSS 侧栏与冷启动休眠

- **静默自动保存与独立命名配置快照（`#1`, `#2`, `D4`）**：`POST /api/config` 与阻塞式 CDP 推送解耦、`keepalive` 页面隐藏刷新、行内 `#prism-autosave-indicator` 状态提示；完整快照支持新建/覆盖/重命名/复制/导入导出与可选壁纸绑定，并实现非破坏性软停用（`<50ms` 无损切回）。
- **动态壁纸活性与三级资源优化（`#8`, `#11`, `#12`, `D6`）**：修复 `eco` 预设粘滞暂停、`probeMseVideoMime` 尾部 `moov`/HEVC/AV1 检测与 MSE 驱逐重建；工作台 21:9 预览默认静态优先省电，壁纸库支持悬停动态缩略图与 `>=30` 项虚拟化；实施 Layer B `COLD_DORMANT` / `SOFT_SLEEP` / `DEEP_SLEEP` 冷启动休眠、`MAX_STUDIO_SSE = 4`（`2 aux + 2 popout`）分区限流、嵌套模糊透明度剔除、`160×160` 静态噪点贴图及低 GPU 亚克力模式。
- **统一 8 区域 Schema、光学独立、WCO 与单载体输入框（`#3`, `#4`, `#5`, `#7`）**：确立 `topbar`、`wco`、`sidebar`、`workspace`、`card`、`composer`、`rightPane`、`popover` 8 区域结构，支持 `workspace`/`rightPane`/`wco`（`D18` `z-index: 0`）独立调参、透明度-边框/高光/阴影 0% 渐隐联动、4 层扁平单载体 Composer。
- **4 套纯 CSS 侧栏样式与中文汉化共存（`#6`, `#9`, `#10`, `#15`, `D5`）**：提供 `capsule`、`underline`、`accordion`、`tree` 四套零 DOM 变异列表风格、`11..15px` 均衡字号及 4 层 `Antigravity-Chinese-Localization` 兼容。
- **极简左侧栏与第一阶段双形态可视化区域编辑器（`#13`, `#14`, `D2`, `D3`, `D7`, `D8`）**：侧栏内嵌画布弹窗 + 独立浏览器 Popout IDE（`/?mode=visual-editor`）、11 项区域属性、8 套 CJK 安全字体与 WCAG AA `>= 4.5:1` 反锚点护栏；将 `src/studio-ui/` 模块化为 L0–L6 零依赖确定性构建。

### `v2.1.0` (`ded7824`) — 零抖动光学预设、2.35.1 顶栏胶囊、一键自更新与中英双语

- 解决 **Issue `#10`**（`@yuezhu114`）：光学场景预设（`crystal`/`islands`/`focus`/`eco`）与布局几何解耦，新增边缘柔化 `.agy-prism-blur-veil`。
- 合入 **`@zmzwynzj`** 的 **PR `#8`**（`00521cc`，页脚重挂载保活 `#agy-prism-pill`）与 **PR `#9`**（`f298c8d`，`deadPluginOrigins` TTL 与 `wake()` 活跃 SSE 快路径）。
- 新增 Antigravity `2.35.1` 紧凑顶栏（`pills`/`bar`）、`hideWelcomeLogo`、`0..64px` 模糊范围、7 组件 `surfaceTints`、全双语 UI（`zh`/`en`）以及基于 `semver.mjs` + `tar-safe.mjs` + `updater.mjs` 的 GitHub Release 一键自更新与 `.github/workflows/release.yml` 自动化发布流。

### `v2.0.6`–`v2.0.8` (`ba0b6de`, `8e51651`, `8e58e26`) — 跨协议流媒体、OOPIF 音频时钟与三端主开关

- 合入 **`@zmzwynzj`** 的 **PR `#6`**（`be354e7`）与 **PR `#7`**（`0c67d36` / `fa1f877`）：新增 `/video-stage/` 跨源 OOPIF 流式视频、Web Audio `GainNode` 音频时钟路由与 `Studio/Host` SSE 分区限流防止 6-socket 池饥饿。
- 新增 `MediaSource` `/mse-fmp4/` 零转码大视频流、HTTPS 图像零卡顿加载与三端 1 键主开关。

### `v2.0.1`–`v2.0.5` (`f836800`..`64bb724`) — 透明窗口控制、递归扫描、旧版迁移与交接手册

- 合入 **`@zmzwynzj`** 的 **PR `#3`**（`12a00a3`/`6b3a000`：抽屉事件防穿透、本地视频缩略图、快捷浮窗筛选分页）与 **PR `#5`**（`a949f96`：旧版 `~/.agy-wallpaper-prism` 自动无损迁移与 `DevToolsActivePort` 发现）。
- 新增 `customFolders` 深度 4 递归扫描（`82839c0`）、`v2.0.2` 默认透明 WCO 窗口按钮（`c55e43a`）、`v2.0.3` 侧栏悬停标题渐隐遮罩（`0f365fd`）、`v2.0.4` 修复 Issue `#4` 与暗/亮热力图对比度、以及 `v2.0.5` 初始 `docs/AI_HANDOFF.md`（`7ec0686`）。

### `v2.0.0` (`0cf1f1b`) & `v1.1.0` (`c81b44e`)

- **`v2.0.0`**：引入 Zero-Enable Ephemeral CDP、Antigravity `2.34.0` `[data-browser-hole]` GPU 镂空（含 **`@CarbonAnime`** PR `#2` `e382b23`）、两阶段 `fsync` Boot Canary 与普通快捷方式无中断自启（Fix `#1`）。
- **`v1.1.0`**：Wallpaper Prism 首个公开版本发布。

---

## English Changelog

### `v2.3.0` — Live Host Region Picker, Single-Instance Fencing, Uncapped Blob Playback & Bilingual Docs

- **New Feature: `#14 Phase 2` CDP Live Host Window Click-to-Pick Region Inspector**
  - Added `src/host/inspector-inject.js`, `GET /host/<capToken>/inspector.js`, strict `POST /api/inspector/pick` & `POST /api/inspector/cancel`, and RPC `inspector.picked` / `inspector.cancelled`.
  - Mounted on demand via `cdp-bridge.mjs :: startInspectorPick` / `cancelInspectorPick` (`evaluateTargetEphemeral`) with **`0 B` delta to `buildHostMicroBootstrap` (`<= 6,144 B`)**, supporting `gentle-auto`, `static-css`, `manual`, and `skinEnabled: false` states.
  - Strictly structural Antigravity `2.35.1` geometric hit-testing across all 8 regions (`topbar`, `wco`, `sidebar`, `workspace`, `card`, `composer`, `rightPane`, `popover`), zero text selectors, `<html>`-only `data-agy-prism-inspector="picking"`, `Esc` (prioritized ahead of closing the editor modal) / right-click / 45s timeout cancel, and dual-channel SSE focus sync across Aux Pane and Popout IDE.
- **Reliability (PR `#11`, merged in `88a6a0a`): Superseded Sidecar Fencing & Orphan Exit**
  - Credits **`@zmzwynzj`** for **PR `#11`** (`6b745b0`: `fix(sidecar,cdp): fence superseded sidecar instances and exit when orphaned`) introducing atomic `instanceId` fencing in `server_info.json`, `yieldOwnership` to break `600ms` SSE reconnect hijack loops, and managed parent-PID orphan exit (`process.exit(0)`).
  - Integrated with `v2.2.0` `/api/shutdown` takeover, `install-local.mjs` ON/OFF state preservation (`6fcef57`), `DEV_WATCH_ENABLED` production polling gate (`P1`), and same-PID port/registry guards (`P2`).
- **Media Playback (`bb06577`): Uncapped `fetch+blob` + MSE/Poster Fallback**
  - Set `MAX_BLOB_MEDIA_BYTES = Infinity` (`BLOB_FETCH_TIMEOUT_MS = 60000`) to restore direct looped playback with native audio, falling back automatically to `MediaSource` `/mse-fmp4/` or static poster on non-404 failures/timeouts while preserving Fail-Open behavior on `404`/`403`/`410`.
- **Documentation Overhaul**: Bilingual CN/EN [`README.md`](../README.md), refreshed `v2.3.0` [`SKILL.md`](../skills/wallpaper-prism/SKILL.md), new [`docs/README.md`](./README.md) & [`docs/CHANGELOG.md`](./CHANGELOG.md), and `v2.3.0` sync on [`docs/dsh-parity-spec.md`](./dsh-parity-spec.md).

### `v2.2.0` (`eca001d`) — Unified 8-Region Schema, Phase 1 Visual Editor, 4 CSS Sidebars & Dormancy

- **Silent Autosave & Named Profile Snapshots (`#1`, `#2`, `D4`)**: Decoupled `POST /api/config` + `keepalive` unload flush, inline `#prism-autosave-indicator`, named snapshot CRUD with optional `includeWallpaper` binding, and `<50ms` non-destructive soft-disable.
- **Media Liveness & Tier 1/2/3 Resource Optimization (`#8`, `#11`, `#12`, `D6`)**: Sticky `eco` pause fix, tail-`moov`/HEVC/AV1 `probeMseVideoMime` & MSE eviction recovery, static-first 21:9 preview, hover library thumbs + virtualization (`>=30`), Layer B `COLD_DORMANT`/`SOFT_SLEEP`/`DEEP_SLEEP`, `MAX_STUDIO_SSE = 4`, nested blur alpha culling, static noise tile, and low-GPU acrylic mode.
- **Unified 8-Region Schema, Optical Independence, WCO & Flattened Composer (`#3`, `#4`, `#5`, `#7`)**: Independent `workspace`/`rightPane`/`wco` (`D18` `z-index: 0`), opacity-linked `0%` border/sheen/shadow fade, and 4-layer Composer flattening.
- **4 Pure-CSS Sidebar Styles & CN L10n Compatibility (`#6`, `#9`, `#10`, `#15`, `D5`)**: `capsule`, `underline`, `accordion`, `tree` with zero DOM mutations, balanced `11..15px` typography, and 4-layer `Antigravity-Chinese-Localization` isolation.
- **Minimal Rail & Phase 1 Dual-Form Visual Region Editor (`#13`, `#14`, `D2`, `D3`, `D7`, `D8`)**: In-sidebar pan/zoom canvas + browser Popout IDE (`/?mode=visual-editor`), 11-property inspector, 8 CJK-safe font presets, WCAG AA `>= 4.5:1` guardrails, and modular L0–L6 `src/studio-ui/` zero-dep ESM build.

### `v2.1.0` (`ded7824`) — Zero-Jitter Optical Presets, 2.35.1 Topbar, 1-Click Updater & CN/EN i18n

- Resolved **Issue `#10`** (`@yuezhu114`) with geometry-decoupled optical scene presets and edge-clamped `.agy-prism-blur-veil`.
- Merged **`@zmzwynzj`**'s **PR `#8`** (`00521cc`) & **PR `#9`** (`f298c8d`) for `#agy-prism-pill` remount persistence and `deadPluginOrigins` TTL / `wake()` fast-path.
- Added Antigravity `2.35.1` compact topbar (`pills`/`bar`), `hideWelcomeLogo`, `0..64px` blur, 7-component `surfaceTints`, bilingual UI (`zh`/`en`), `semver.mjs` + `tar-safe.mjs` + `updater.mjs` 1-click GitHub Release updater, and `.github/workflows/release.yml`.

### `v2.0.6`–`v2.0.8` (`ba0b6de`, `8e51651`, `8e58e26`) — Cross-Scheme Streaming, OOPIF Audio & 3-Point Toggle

- Merged **`@zmzwynzj`**'s **PR `#6`** (`be354e7`) & **PR `#7`** (`0c67d36` / `fa1f877`) adding `/video-stage/` OOPIF playback, Web Audio `GainNode` audio-clock routing, and Studio/Host SSE caps.
- Added `MediaSource` `/mse-fmp4/` streaming, zero-stall HTTPS images, and 3-point 1-click master toggle.

### `v2.0.1`–`v2.0.5` (`f836800`..`64bb724`) — Transparent WCO, Recursive Scan, Migration & Handoff

- Merged **`@zmzwynzj`**'s **PR `#3`** (`12a00a3`/`6b3a000`) & **PR `#5`** (`a949f96`), plus depth-4 `customFolders` scanning (`82839c0`), transparent WCO controls (`c55e43a`), sidebar hover mask (`0f365fd`), `2.34.0` light-mode fixes (`dd80a87`), and initial `docs/AI_HANDOFF.md` (`7ec0686`).

### `v2.0.0` (`0cf1f1b`) & `v1.1.0` (`c81b44e`)

- **`v2.0.0`**: Zero-Enable Ephemeral CDP, `[data-browser-hole]` GPU cutout (including **`@CarbonAnime`** PR `#2` `e382b23`), two-phase `fsync` Boot Canary, and normal-shortcut auto-load (`Fixes #1`).
- **`v1.1.0`**: Initial public release of Wallpaper Prism.
