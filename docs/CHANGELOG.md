# Changelog · 更新日志 (`agy-wallpaper-prism`)

**语言 / Language**: [简体中文](#简体中文更新日志) · [English](#english-changelog) · [返回 README](../README.md) · [文档索引](./README.md)

---

## 简体中文更新日志

### `v2.4.0` — 12 区域对话气泡与控件玻璃化、默认无毛玻璃、4K60 MSE 零闪烁流控与 Scene 高清 `.tex` 解码

- **新特性：12 区域对话气泡与宿主控件玻璃化体系（默认无毛玻璃）**
  - 将 `REGION_IDS` 从 8 个扩展至 **12 个区域**（`src/shared/schema.mjs`）：新增 `userBubble`（用户消息气泡）、`assistantBubble`（AI 回复与任务卡）、`codeBlock`（代码块与表格）及 `controls`（按钮、输入框、分段切换、标签页、滚动条滑块与浮动胶囊），与原有 8 个区域统一归档。
  - **默认无毛玻璃与 `Crisp Glass`（`crisp`）预设**：`ZERO_BLUR_BY_DEFAULT_REGIONS`（`card`、`userBubble`、`assistantBubble`、`codeBlock`、`controls`）默认 `style: 'none'` / `blur: 0`，移除隐藏 `chipBlurPx` 自动模糊并收紧 `.surface-glass` 浮窗白名单；原有 7 个外框/浮窗区域保持 `glassBlur: 16`，新增 5 号预设 **`清透无雾 / Crisp Glass`（`crisp`）** 实现全区域 `0px` 零模糊。
  - **5 种玻璃材质风格与 9 项光学属性**：全面支持 `GLASS_STYLES`（`none` / `frosted` / `crystal` / `tinted` / `solid` + `auto`）、`saturation`（`50..220%`）与 `elevation`（`0..2×`，`F-02` 零透明度归零防护阻止透明正文产生幽灵阴影）；`REGION_OPTICAL_KEYS` 扩充至 9 项，`i18n.mjs` 扩充至 463 组中英双语词条。
  - **宿主 live & `static-css` 双引擎 `1:1` 对齐与防叠框守卫**：实现 `F-03` `body[data-agy-theme]` `(0,4,1)+` 控件高优先级规则、`F-04` 外层 `<pre>` 镂空单框渲染与语法保留 + `planner-response-text` 模糊时自动抑制内部代码块嵌套 `backdrop-filter` + `SOLID_POPOVERS` `.surface-glass` 精细排除、`F-06` 驼峰排版/连字符表面变量命名规范，以及 `.agy-takeover-frame` / `[data-testid="artifact-card"]` 卡片归属精确隔离。
  - **Studio UI、双形态可视化编辑器、拾取器与 Quick Prism 全端联动**：新增共享 `renderRegionStyleRow` / `renderRegionOpticalControlsHtml`（`controls.mjs`）、`F-05` 将 `codeReadabilityMode` 移入 `codeBlock` 并保留 `elevation` 浮点精度、Quick Prism 5 列预设 + 行内风格循环胶囊 + 9 键重置，以及 `inspector-inject.js` 12 区域实时拾取器（`0 B` 微引导增量，守卫 `#hub-interactive-btn -> composer`）。
- **流媒体、Scene 高清提取与窄屏修复（合入 PR `#12` `235df43`、PR `#13` `4e918fb` 与 `F-01` 加固）**
  - 感谢 **`@zmzwynzj`** 贡献 **PR `#12`**（`c88183c`）与 **PR `#13`**（`64229de`）：
    - **Priority 0 MSE 与 4K60 保护**：静音大/长视频（`>= 100 MiB` 或 `>= 90s`）直连 `/mse-fmp4/` 释放宿主流通道；支持 `alignMseInitialPts` HEVC 初始 PTS 对齐、`48/64/80 MiB` 字节感知前瞻驱逐、`<2s` 与暂停态 `QuotaExceededError` 无封面闪烁恢复、零黑屏同源循环重挂载（`abortWrapNetworkControllers` + `isSameMediaRemount` `cut`），以及 `vidSeekStallCount` `seeking` 死锁自愈。
    - **`F-01` 解静音无缝重挂载与流控扩容**：`mediaKey` 编码大视频音频状态以实现解除静音自动重挂载，并将 `sidecars/prism_studio/main.mjs` `MAX_CONCURRENT_STREAM_PROXIES` 提至 `4`（含 TCP RST 驱逐与 `10s` 背压清理）。
    - **零依赖 Scene 高清 `.tex` 与 `web` 适配**：`src/engine/pkg-scene.mjs` 纯 Node 标准库解码 `TEXB0001..0004`（LZ4 + `PNG/JPEG/WebP` + `RGBA8888/DXT1/3/5` -> `/scene-image/`），`web` 壁纸注入 `<base href>` / `viewport` / 随机文件与媒体监听 Shim 并支持 AC 下 `2×` DPR 与 `1:1` 清晰渲染。
    - **`<840px` 窄屏工作台统一滚动**：修复窄侧栏下 `.prism-workspace` 统一滚动、粘性 `.prism-tabs-bar`（`scroll-margin-top: 56px`）、第 27 项后虚拟滚动与 `0×0` `#app` Soft Sleep 检测。
- **文档与测试升级**：同步 [`README.md`](../README.md)、[`SKILL.md`](../skills/wallpaper-prism/SKILL.md)、[`CHANGELOG.md`](./CHANGELOG.md) 与 [`dsh-parity-spec.md`](./dsh-parity-spec.md) 至 `v2.4.0`，并在 `test/verify-all.mjs` 新增 `S3-08`（PR `#12` + `F-01`）、PR `#13` 4K60 MSE 检查与 `S3-09` / `S3-10` E2E 套件。

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

### `v2.4.0` — 12-Region Chat Bubbles & Controls Glassmorphism, Zero-Blur Default, 4K60 MSE Non-Blanking Streaming & Scene HD `.tex`

- **New Feature: 12-Region Chat Bubbles & Host Controls Glassmorphism (Default NO Frosted Glass)**
  - Expanded `REGION_IDS` from 8 to **12 regions** (`src/shared/schema.mjs`): added `userBubble` (user chat bubbles), `assistantBubble` (assistant prose, step rows, and turn cards), `codeBlock` (code block cards and Markdown tables), and `controls` (buttons, inputs, segmented toggles, tabs, overlay scrollbars, and floating pills) alongside the 8 existing regions.
  - **Zero-Blur Default & `Crisp Glass` (`crisp`) Preset**: `ZERO_BLUR_BY_DEFAULT_REGIONS` (`card`, `userBubble`, `assistantBubble`, `codeBlock`, `controls`) default to `style: 'none'` / `blur: 0`, retiring hidden `chipBlurPx` auto-blur and tightening non-popover `.surface-glass` exclusions. The 7 shell/overlay regions preserve `DEFAULT_CONFIG.glassBlur = 16`, while a new 5th scene preset **`Crisp Glass` (`crisp`)** sets `0px` blur everywhere.
  - **5 `GLASS_STYLES` & 9 Optical Properties**: Added `style` (`none` / `frosted` / `crystal` / `tinted` / `solid` + `auto`), `saturation` (`50..220%`), and `elevation` (`0..2×`, guarded by `F-02` zero-alpha shadow return so transparent prose emits zero phantom drop shadows); expanded `REGION_OPTICAL_KEYS` to 9 keys and `src/shared/i18n.mjs` to `463` paired `zh`/`en` entries.
  - **1:1 Live & `static-css` Host Parity (`F-03`, `F-04`, `F-06`)**: Added `body[data-agy-theme]` `(0,4,1)+` `!important` control rules (`F-03`), outer `<pre>` hollowing for single-box code cards with syntax `<span>` color preservation and nested `--prism-code-backdrop: none` suppression inside blurred `[data-testid="planner-response-text"]` (`F-04`), extended `SOLID_POPOVERS` `.surface-glass` exclusions, `F-06` camelCase typography vs kebab-case surface variables, and separated `.agy-takeover-card` (`card`) vs `[data-testid="artifact-card"]` (`assistantBubble`).
  - **Studio UI, Dual-Form Visual Editor, Picker & Quick Prism Alignment (`F-05`)**: Shared L3 `renderRegionStyleRow` / `renderRegionOpticalControlsHtml` in `src/studio-ui/controls.mjs`, `codeReadabilityMode` moved to `codeBlock`, float `elevation` slider precision in `app.mjs`, responsive `<720px` Modal + clickable 12-region mockups across Modal/Popout/21:9 Preview, Quick Prism 5-column presets + inline Glass Style cycler + 9-key resets, and `inspector-inject.js` 12-region Live Picker (`0 B` micro-bootstrap delta, `#hub-interactive-btn -> composer` preserved).
- **Media Streaming, Scene HD `.tex` & Narrow Studio Scroll (PR `#12` `235df43`, PR `#13` `4e918fb` & `F-01` Hardening)**
  - Credits **`@zmzwynzj`** for **PR `#12`** (`c88183c`) and **PR `#13`** (`64229de`):
    - **Priority 0 MSE & Byte-Aware 4K60 Protection**: Routes large/long muted videos (`>= 100 MiB` or `>= 90s`) via `/mse-fmp4/` to keep `plugin://` free for Studio UI; adds `alignMseInitialPts()` HEVC non-zero PTS alignment, byte-aware `48/64/80 MiB` lead capping & early rolling eviction (`<12s`), bounded `<2s` / paused `QuotaExceededError` recovery without poster flashes, non-blanking same-media loop remount (`abortWrapNetworkControllers` + `isSameMediaRemount` `cut`), and `vidSeekStallCount` deadlock self-healing.
    - **`F-01` Unmute Auto-Remount & Concurrency Cap (`4`)**: Encodes `mseAudioMode` (`a1`/`a0`) in `mediaKey` for seamless unmute remounts onto audio-capable streams, and raises `MAX_CONCURRENT_STREAM_PROXIES` to `4` in `sidecars/prism_studio/main.mjs` (with TCP RST eviction & `10s` stall cleanup).
    - **Zero-Dep Scene HD `.tex` & Web Adaptation**: Pure-Node `TEXB0001..0004` decoder (`PNG/JPEG/WebP/RGBA8888/DXT1/3/5` -> `/scene-image/<token>`) in `src/engine/pkg-scene.mjs`, `<base href>` / viewport / WE API shims for `/media-proxy/web/`, `2×` DPR on AC power, and crisp `1:1` `--prism-media-transform: none`.
    - **Narrow `<840px` Unified Studio Scroll**: Unified `.prism-workspace` scrolling with sticky `.prism-tabs-bar` (`scroll-margin-top: 56px` accordion clearance), fixed virtual library scrolling past item 27, and `0×0` `#app` Soft Sleep detection.
- **Docs & Verification**: Updated [`README.md`](../README.md), [`SKILL.md`](../skills/wallpaper-prism/SKILL.md), [`CHANGELOG.md`](./CHANGELOG.md), and [`dsh-parity-spec.md`](./dsh-parity-spec.md) to `v2.4.0`, and expanded `test/verify-all.mjs` with `S3-08` (PR `#12` + `F-01`), PR `#13` 4K60 MSE verification, and `S3-09` / `S3-10` E2E suites.

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
