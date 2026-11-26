# Wallpaper Prism (`agy-wallpaper-prism`)

> **Repository**: [https://github.com/azwosile/agy-wallpaper-prism](https://github.com/azwosile/agy-wallpaper-prism)  
> **Version**: `2.3.0` · **Zero Agent Tokens** · **Zero `app.asar` Modification** · **License**: MIT

**适用于 Google Antigravity 的棱镜液态玻璃皮肤与动态壁纸工作台**  
**Obsidian Prism Liquid Glass Skin & Wallpaper Engine Studio for Google Antigravity**

**语言 / Language**: [**简体中文**](#简体中文文档) · [**English**](#english-documentation) · [**更新日志 / Changelog**](docs/CHANGELOG.md) · [**文档索引 / Docs Index**](docs/README.md)

---

## 简体中文文档

### 1. 简介与 `v2.3.0` 核心亮点

`agy-wallpaper-prism` 为 Google Antigravity 2.x 带来基于 **Obsidian Prism** 光学层次体系的整窗液态玻璃皮肤，以及兼容 **Steam Wallpaper Engine (`431960`)** 与本地多媒体的动态壁纸工作台：

- **零 Agent 上下文 / Token 消耗**：插件默认不向模型注入任何 MCP 工具或系统提示词，渲染、流媒体与皮肤控制完全在带外 Sidecar 进程中运行。
- **零 `app.asar` 侵入修改**：通过 **Zero-Enable Ephemeral CDP**（零持久域：严格禁用 `Page.enable`、`Runtime.enable`、`Page.addScriptToEvaluateOnNewDocument` 与 `Runtime.addBinding`）进行安全挂载，并具备 **Fail-Open** 首帧就绪门控与双阶段 `fsync` 启动金丝雀熔断保护。

#### `v2.3.0` 新特性亮点

1. **CDP 真实宿主窗口点击拾取区域检查器（`#14 阶段二`）**
   - 在 **可视化外观编辑器** 或独立 **浏览器全屏编辑器（Popout IDE）** 中点击 **「🎯 拾取真实界面区域」**，即可直接在真实的 Antigravity 主窗口上悬停高亮并点选任意 8 个界面区域（`topbar`、`wco`、`sidebar`、`workspace`、`card`、`composer`、`rightPane`、`popover`）。
   - **零微引导体积增量**：Sidecar 通过 `POST /api/inspector/pick` 与 `evaluateTargetEphemeral` 按需挂载 `GET /host/<capToken>/inspector.js`（`src/host/inspector-inject.js`），**对 `buildHostMicroBootstrap`（上限 `<= 6,144 B`）保持 `0 B` 增量**。
   - **全模式通用**：纯结构化几何命中检测（零本地化文本匹配，100% 兼容中文汉化包），同时支持 **`gentle-auto` 实时模式**、**`static-css` 纯静态模式** 与 **`manual` / 停用皮肤状态**；支持 `Esc`、右键或 **「✕ 取消拾取」**（`POST /api/inspector/cancel`）随时退出，并内置 45 秒安全超时与 Aux Pane / Popout 双通道 SSE 实时同步。
2. **双形态可视化区域编辑器 & 统一 8 区域光学架构（`v2.2.0`–`v2.3.0`）**
   - **双形态工作流**：支持在 Sidecar 右侧工作台内全高弹出（`50%–200%` 缩放平移画布）以及在独立浏览器窗口打开全屏 3 栏 IDE（`/?mode=visual-editor`，由 `POST /api/studio/popout` 严格鉴权拉起，`CSP: frame-ancestors 'none'`，URL 零 `?token=`）。
   - **8 区域 × 11 项精调属性**：`topbar`、`wco`、`sidebar`、`workspace`、`card`、`composer`、`rightPane`、`popover` 各自独立调节毛玻璃开关、模糊半径（`0..64px`）、不透明度、色彩深浅、自定义底色、边框不透明度（支持随表面透明自动渐隐至 `0%`）、边框形态、圆角、字号、字体家族（内置 8 套 CJK 安全字体预设）与文字颜色（带反锚点 WCAG AA `>= 4.5:1` 智能护栏及一键原始色值解锁）。
   - **Topbar / WCO 融合（`D18`）**：支持 Antigravity `2.35.1` 紧凑顶栏形态（`pills` / `bar`）及独立调节右上角透明窗口控制胶囊 `#agy-prism-wco-pill`（`z-index: 0`）。
3. **无内存体积限制的直连视频播放与自动降级（`bb06577`）**
   - 移除宿主跨协议 `fetch+blob` 播放体积限制（`MAX_BLOB_MEDIA_BYTES = Infinity`，`BLOB_FETCH_TIMEOUT_MS = 60000`），完整保留视频原生音频；在非 `404` 失败或超时时自动无缝回退至 `MediaSource` `/mse-fmp4/` 零转码分片流或静态封面，同时严格保持 `404`/`403`/`410` 的 Fail-Open 容错。
4. **单实例 Sidecar 所有权围栏与孤儿自退出（PR `#11` + `v2.2.0` 接管加固）**
   - 合并来自 `@zmzwynzj` 的 **PR `#11`**（`88a6a0a`：`instanceId` 原子围栏、`cdp-bridge.mjs` 让权终止 `600ms` SSE 重连抢占死循环、受管父进程孤儿退避自退出），与 `v2.2.0` 身份校验 `/api/shutdown` 接管、`install-local.mjs` 开关状态保活及 `DEV_WATCH_ENABLED` 生产零轮询门禁协同工作，杜绝双进程抢占闪烁与孤儿进程残留。
5. **快捷浮窗（`Ctrl+Alt+W`）、4 套纯 CSS 侧栏与 Layer B 低功耗休眠**
   - 支持 **三端一键主开关**（工作台顶栏、`Ctrl+Alt+W` 快捷浮窗顶栏、输入框页脚 `#agy-prism-pill` 的 `Shift+Click` / 中键直切），非破坏性软停用可在 `<50ms` 内瞬间恢复。
   - **4 套纯 CSS 侧栏列表风格**（`capsule`、`underline`、`accordion`、`tree`，零 DOM 注入）+ `11..15px` 均衡字号 + 与 `Antigravity-Chinese-Localization` 四层隔离共存。
   - 静默自动保存（`keepalive` 退避落盘）、独立命名配置快照、21:9 静态优先预览、悬停动效缩略图，以及隐藏态 `COLD_DORMANT` -> `SOFT_SLEEP` -> `DEEP_SLEEP` 冷启动休眠。

---

### 2. 安装方式

#### 方式 A：通过 GitHub Releases 压缩包安装（推荐普通用户）

1. 前往 [GitHub Releases](https://github.com/azwosile/agy-wallpaper-prism/releases) 下载对应版本的 `agy-wallpaper-prism-v2.3.0.tar.gz`（或 `.zip`）以及 `agy-wallpaper-prism-v2.3.0.tar.gz.sha256` 校验文件。
2. 校验压缩包 SHA-256 完整性后，将其**完整解压为真实文件夹**（Windows 下**切勿**使用 NTFS 目录联接 Junction 或符号链接 Symlink，Antigravity 会跳过非真实目录）至：
   - `<USER_HOME>/.gemini/config/plugins/agy-wallpaper-prism`
3. 在 Antigravity 内打开 [Wallpaper Prism 扩展管理页](customization://agy-wallpaper-prism) 确认已启用，之后即可在工作台顶部或 **宿主与系统** 标签页使用 **GitHub Release 一键自更新**（自动校验 `.sha256` 与 `tar-safe.mjs` 安全解包并在失败时原子回滚）。

#### 方式 B：通过 Antigravity Customizations / Market 安装

- 在 Antigravity 打开 **Customizations / 扩展市场**（或点击 [Wallpaper Prism](customization://agy-wallpaper-prism)），搜索 `Wallpaper Prism`（`agy-wallpaper-prism`）并启用。

#### 方式 C：本地源码开发安装（需 Node.js `>= 22.0.0`）

```powershell
git clone https://github.com/azwosile/agy-wallpaper-prism.git
cd agy-wallpaper-prism

# 1. 编译单文件纯 LF 确定性 Studio 前端产物（零外部 npm 依赖）
node scripts/build.mjs

# 2. 以真实文件拷贝安装到 ~/.gemini/config/plugins/agy-wallpaper-prism 并热同步在途实例
node scripts/install-local.mjs
```

> **开发模式提示**：从 Git 仓库本地安装的版本内置了防覆盖守卫，一键更新按钮会返回 `409 ERR_GIT_DEV_CHECKOUT`；请使用 `git pull && node scripts/build.mjs && node scripts/install-local.mjs` 更新。

---

### 3. 快速开始与使用指南

1. **打开工作台面板**：在对话中点击 [Wallpaper Prism](sidecar://agy-wallpaper-prism/prism_studio/)，或在右侧辅助栏点击 **`+ -> Plugins -> Wallpaper Prism`**（未开启 CDP 时壁纸库与预览依然立即可用）。
2. **开启普通快捷方式自动加载（一次性，不中断当前对话）**：
   - 在工作台顶部或 **宿主与系统** 标签页点击 **`⚡ 一键开启普通快捷方式自动加载（不中断当前对话）`**（或执行 `npm run enable-autostart`）。
   - 插件会自动备份原参数并在桌面/开始菜单/任务栏的 `Antigravity.lnk` 上写入 `--remote-debugging-port=9339`；此后每次从普通图标启动 Antigravity 都会自动恢复上次壁纸与玻璃皮肤。
3. **切换壁纸与快捷控台（`Ctrl+Alt+W`）**：
   - 支持 **Steam Wallpaper Engine (`431960`)** 创意工坊与官方项目自动发现、`customFolders` 递归 4 层扫描、拖拽上传（上限 `512 MB`，SHA-256 自动去重）、多图幻灯片、`MP4/WebM/MOV/MKV`、`web` 交互壁纸及 `scene.pkg` 提取播放，并支持按时间间隔或「视频播完即换」的轮播列表。
   - 按 **`Ctrl+Alt+W`** 或点击输入框底栏 **`◆ Prism`** 胶囊（或角落微标）呼出 **Quick Prism 快捷浮窗**，随时切壁纸、调音量、切场景预设（`通透流光 Crystal` / `浮岛画境 Islands` / `沉静柔焦 Focus` / `极简省电 Eco`）。
4. **使用可视化编辑器与真实宿主区域拾取器（`v2.3.0`）**：
   - 进入 **棱镜外观** -> 点击 **「🎨 可视化编辑」**（或 **「↗ 浏览器全屏编辑」** 零令牌浏览 Popout IDE）。
   - 点击 **「🎯 拾取真实界面区域」**，回到 Antigravity 窗口将鼠标悬停于顶栏、侧栏、对话气泡、输入框或浮窗上，**左键点击**即可自动定位右侧检查器至对应区域；按 **`Esc`**、**右键点击** 或工作台内 **「✕ 取消拾取」** 可随时退出。

#### 快捷键速查

| 快捷键 / 手势 | 作用 |
|---|---|
| `Ctrl+Alt+W` | 唤起 / 收起宿主内 **Quick Prism 快捷浮窗** |
| `Shift+Click` 或中键点击 `#agy-prism-pill` | 一键软启用 / 软停用全窗皮肤与壁纸（`<50ms` 无损切换） |
| 拾取模式中 `左键` | 选中高亮的 Antigravity 真实区域并聚焦属性检查器 |
| 拾取模式中 `Esc` / `右键` | 取消真实宿主区域拾取（优先于关闭编辑器弹窗） |
| `Ctrl+Alt+Shift+R` 或连续 `4× Esc` | 紧急逃生舱：立即剥离全部 `#agy-prism-*` 图层并恢复原生外观 |

---

### 4. 架构与工程契约

```text
agy-wallpaper-prism/
├── plugin.json                     # 官方 10 键插件清单 (version: 2.3.0)
├── package.json                    # Node >=22 ESM 包配置与构建/打包/CLI 脚本
├── assets/logo.svg                 # 256×256 棱镜矢量图标
├── docs/                           # 双语文档导航、CHANGELOG、DSH 对齐规范与历史档案
├── skills/wallpaper-prism/SKILL.md # Agent 按需调度与安全 CLI 指南 (v2.3.0)
├── .github/workflows/release.yml   # GitHub Actions 自动化验证与三产物发布流
├── src/
│   ├── shared/                     # 8 区域统一 Schema、7 组版本锚点、SemVer 与 430 键中英字典
│   ├── engine/                     # Steam/WE 扫描、MP4 虚拟快启、PKGV/LZ4 解析、206+/mse-fmp4/、安全自更新
│   ├── host/                       # 宿主皮肤微核、Quick Prism 浮窗及 v2.3.0 实时区域拾取器 (inspector-inject.js)
│   └── studio-ui/                  # L0–L6 无环图模块化 Studio UI 与双形态可视化编辑器
├── sidecars/prism_studio/          # 单实例围栏 Sidecar HTTP 服务、媒体代理、Popout IDE 与无侵入 CDP 桥接
├── host/cli.mjs                    # 安全 CLI 工具（绝不强杀 Antigravity 进程）
└── test/verify-all.mjs             # 3 大自动化验证套件（清单/引擎/无头 Chrome E2E）
```

- **8 区域 Schema**：统一由 `src/shared/schema.mjs` (`REGION_IDS`) 定义 `topbar`、`wco`、`sidebar`、`workspace`、`card`、`composer`、`rightPane`、`popover`，支撑 11 项区域属性与 4 项侧栏专属排版属性，兼容 `v2.1.0` `surfaceTints` 无损迁移。
- **零依赖确定性构建**：`scripts/build.mjs` 通过词法解析将 `src/studio-ui/` 的 ES 模块依赖图与 `@import` CSS 内联编译为确定性纯 LF 单文件 `sidecars/prism_studio/index.html`（无第三方打包器依赖）。
- **CDP 安全与令牌边界**：
  - 严格执行 Zero-Enable Ephemeral CDP，微引导 `buildHostMicroBootstrap` 恒定 `<= 6,144 B`（`v2.3.0` 拾取器为按需注入，增量 `0 B`）。
  - Sidecar 全路由强制校验回环 `Host` 防 DNS 重绑定，敏感变更路由（`/api/config`、`/api/studio/popout`、`/api/inspector/pick`、`/api/inspector/cancel`、`/api/update/*` 等）强制校验 Header `X-Sidecar-Token`（`0o600` 权限落盘于 `server_info.json`）与同源 CSRF 防护。
  - 运行期配置与缓存持久化于 `ANTIGRAVITY_EXECUTABLE_DATA_DIR`（默认 `<USER_HOME>/.gemini/antigravity/sidecar_data/agy-wallpaper-prism/prism_studio/data`），首次启动自动无损迁移旧版 `~/.agy-wallpaper-prism`。

---

### 5. 开发与验证脚本

所有脚本严格对应 `package.json`（均需 Node.js `>= 22.0.0`）：

| 命令 | 底层脚本 | 用途说明 |
|---|---|---|
| `npm run build` | `node scripts/build.mjs` | 将 `src/studio-ui/` 确定性内联构建为纯 LF `sidecars/prism_studio/index.html` |
| `npm run install:local` | `node scripts/install-local.mjs` | 真实文件安装至 `<USER_HOME>/.gemini/config/plugins/agy-wallpaper-prism` 并热同步 |
| `npm test` | `node test/verify-all.mjs` | 运行全部 3 套自动化测试（提交前如有未提交修改，先设置 `$env:PRISM_ALLOW_DIRTY_GIT='1'`） |
| `npm run pack:release` | `node scripts/pack-release.mjs` | 生成 `dist/agy-wallpaper-prism-v2.3.0.{tar.gz,tar.gz.sha256,zip}` 三产物 |
| `npm run status` | `node host/cli.mjs status` | 只读检查 Sidecar、CDP、快捷方式、金丝雀与当前壁纸状态 |
| `npm run wake` | `node host/cli.mjs wake` | 温和唤醒并重新挂载宿主皮肤 |
| `npm run reset-canary` | `node host/cli.mjs reset-canary` | 清除启动金丝雀 `tripped` 熔断状态并恢复启用 |
| `npm run enable-autostart` | `node host/cli.mjs enable-autostart` | 为普通快捷方式备份并写入 `--remote-debugging-port=9339` |
| `npm run disable-autostart` | `node host/cli.mjs disable-autostart` | 从备份无损还原普通快捷方式启动参数 |
| `npm run restore` | `node host/cli.mjs restore` | 干净剥离皮肤并设置 `skinEnabled=false` |

更多 CLI 子命令：`node host/cli.mjs preset <crystal|islands|focus|eco>` 与 `node host/cli.mjs create-shortcut [--port 9339]`。

---

### 6. 常见问题与排障

- **工作台显示「待机中 (未开启 CDP)」或实时区域拾取提示未检测到宿主窗口**
  - 请先确认 Antigravity 是否带 `--remote-debugging-port` 启动：点击工作台 **宿主与系统** -> **一键开启普通快捷方式自动加载**（或执行 `npm run enable-autostart`），重启 Antigravity 即可生效。为防止与用户外部调试端口冲突，冷启动默认不主动探测公共 `9222` 端口。
- **大型视频壁纸未自动播放或显示为静态封面**
  - `v2.3.0` 已解除 `fetch+blob` 体积限制（`MAX_BLOB_MEDIA_BYTES = Infinity`，超时 `60s`）；若宿主网络环境或编码触发回退，引擎会自动尝试 `MediaSource` `/mse-fmp4/` 零转码分片流（需系统 `PATH` 中存在 `ffmpeg`）。若环境未安装 `ffmpeg`，视频将自动平滑降级为静态封面且不影响玻璃皮肤渲染。
- **多窗口 / 异常状态 / Windows 安装未生效**
  - Windows 下切勿使用 NTFS Junction/Symlink，请始终使用 `node scripts/install-local.mjs` 或解压真实目录。若曾存在旧版 Sidecar 残留，PR `#11` 的 `instanceId` 围栏与孤儿自退出会自动清理；可通过 `npm run status` 检查存活实例端口与状态。
- **如何快速还原 Antigravity 原生外观**
  - 任意时刻按 **`Ctrl+Alt+Shift+R`** 或连续按 **`4× Esc`**，或在工作台顶部开关 / `Ctrl+Alt+W` 浮窗一键关闭，也可运行 `npm run restore` 或 `npm run reset-canary`。
- **与 `Antigravity-Chinese-Localization` 汉化插件共存**
  - 皮肤与 `v2.3.0` 实时区域拾取器均只使用结构化选择器，状态属性仅挂载于 `<html>`（零 `<body>` DOM 变异），不会干扰汉化翻译生命周期。

---

### 7. 致谢与贡献者

- **特别致谢 [`@zmzwynzj`](https://github.com/zmzwynzj)**：
  - 贡献 **PR `#11`**（`fix(sidecar,cdp): fence superseded sidecar instances and exit when orphaned`，已合并于 `88a6a0a`），彻底解决了被接管 Sidecar 在 `600ms` SSE 重连窗口抢占宿主控制权以及父进程退出后成为孤儿驻留的难题。
  - 此前还持续贡献了 **PR `#3`**（`12a00a3`）、**PR `#5`**（`a949f96`）、**PR `#6`**（`be354e7`）、**PR `#7`**（`0c67d36` / `fa1f877`）、**PR `#8`**（`00521cc`）与 **PR `#9`**（`f298c8d`），是项目流媒体与宿主稳定性演进的核心贡献者。
- **感谢 [`@yuezhu114`](https://github.com/yuezhu114)**：提出 Issue `#10`，推动了零布局跳动光学预设与边缘柔化模糊遮罩（`.agy-prism-blur-veil`）的实现。
- **感谢 `@CarbonAnime`**：贡献 PR `#2`（`e382b23`），早期适配 Antigravity `2.34.0` 布局。
- **设计灵感与引擎基石**：[`RMvdesi/obsidian-prism`](https://github.com/RMvdesi/obsidian-prism)、[`damiankorcz/Prism-Theme`](https://github.com/damiankorcz/Prism-Theme) 与 [`elysia395/dsh-wallpaper-engine`](https://github.com/elysia395/dsh-wallpaper-engine)。

[⬆ 返回顶部](#wallpaper-prism-agy-wallpaper-prism)

---

## English Documentation

### 1. Overview & `v2.3.0` Release Highlights

`agy-wallpaper-prism` delivers an **Obsidian Prism** layered acrylic workbench skin and a full **Steam Wallpaper Engine (`431960`)** + local media studio for Google Antigravity 2.x:

- **Zero Agent Context/Token Overhead**: Registers no model-visible tools or prompt injections; all rendering, media streaming, and configuration run out-of-band in a gentle Sidecar process.
- **Zero `app.asar` Modification**: Attaches passively via **Zero-Enable Ephemeral CDP** (zero `Page.enable`, `Runtime.enable`, `Page.addScriptToEvaluateOnNewDocument`, or `Runtime.addBinding`), gated by a Fail-Open first-frame media stage and two-phase `fsync` Boot Canary circuit breaker.

#### What's New in `v2.3.0`

1. **CDP Live Host Window Click-to-Pick Region Inspector (`#14 Phase 2`)**
   - Click **`🎯 Pick Live Host Region`** inside the Visual Appearance Editor or fullscreen Popout IDE to hover-highlight and click any of the 8 canonical UI regions (`topbar`, `wco`, `sidebar`, `workspace`, `card`, `composer`, `rightPane`, `popover`) directly inside the live Antigravity window.
   - **Zero Micro-Bootstrap Overhead**: Invoked on demand via `POST /api/inspector/pick` and `evaluateTargetEphemeral`, loading `GET /host/<capToken>/inspector.js` (`src/host/inspector-inject.js`) with **`0 B` delta** to `buildHostMicroBootstrap` (`<= 6,144 B` cap).
   - **Works Across All Startup Modes**: Uses pure structural Antigravity `2.35.1` selectors (zero localized text matching, 100% compatible with `Antigravity-Chinese-Localization`) across **`gentle-auto`**, **`static-css`**, and **`manual` / `skinEnabled: false`** states; exits cleanly via `Esc`, right-click, **`✕ Cancel Pick`** (`POST /api/inspector/cancel`), or a 45s safety timeout, broadcasting live updates across both Aux Pane and Popout SSE channels.
2. **Dual-Form Visual Region Editor & Unified 8-Region Architecture (`v2.2.0`–`v2.3.0`)**
   - **Dual Forms**: Full-height in-sidebar pan/zoom (`50%–200%`) canvas modal + standalone browser Popout IDE (`/?mode=visual-editor` launched via strict `POST /api/studio/popout` with `CSP: frame-ancestors 'none'` and zero `?token=` in URL).
   - **8 Regions × 11 Properties**: Independent control over `topbar`, `wco`, `sidebar`, `workspace`, `card`, `composer`, `rightPane`, and `popover` (blur `0..64px`, opacity, shade tone, custom tint, opacity-linked border fade to `0%`, border style, radius, font size, 8 CJK-safe font presets, and text color protected by opposite-anchor WCAG AA `>= 4.5:1` guardrails with 1-click raw unlock).
   - **Topbar / WCO Fusion (`D18`)**: Supports Antigravity `2.35.1` compact topbar (`pills` / `bar`) and independent `#agy-prism-wco-pill` (`z-index: 0`) tuning.
3. **Uncapped Direct Blob Media Playback + Automatic MSE/Poster Fallback (`bb06577`)**
   - Removes the memory ceiling on cross-scheme loopback `fetch+blob` playback (`MAX_BLOB_MEDIA_BYTES = Infinity`, `BLOB_FETCH_TIMEOUT_MS = 60000`) while preserving native audio, falling back automatically to `MediaSource` `/mse-fmp4/` or static poster on non-404 errors/timeouts while keeping `404`/`403`/`410` Fail-Open.
4. **Single-Instance Sidecar Fencing & Orphan Exit (PR `#11` + `v2.2.0` Takeover)**
   - Merges **PR `#11`** by `@zmzwynzj` (`88a6a0a`: atomic `instanceId` ownership fencing in `server_info.json`, `yieldOwnership` breaking `600ms` SSE reconnect hijack loops, and managed parent-PID orphan auto-exit) alongside `v2.2.0` `/api/shutdown` takeover, `install-local.mjs` ON/OFF state preservation, and `DEV_WATCH_ENABLED` production polling suppression.
5. **Quick Prism (`Ctrl+Alt+W`), 4 Pure-CSS Sidebar Styles & Layer B Dormancy**
   - **3-Point 1-Click Master Toggle** (Studio topbar, Quick Prism topbar, `Shift+Click`/middle-click `#agy-prism-pill`) with `<50ms` non-destructive soft-disable/re-enable.
   - **4 Pure-CSS Sidebar List Styles** (`capsule`, `underline`, `accordion`, `tree` — zero DOM mutations), balanced `11..15px` typography, silent `keepalive` autosave, independent named snapshots, static-first 21:9 workbench preview, hover library thumbnails, and Layer B cold-start dormancy (`COLD_DORMANT` -> `SOFT_SLEEP` -> `DEEP_SLEEP`).

---

### 2. Installation

#### Method A — GitHub Releases Archive (Recommended for Users)

1. Download `agy-wallpaper-prism-v2.3.0.tar.gz` (or `.zip`) and `agy-wallpaper-prism-v2.3.0.tar.gz.sha256` from [GitHub Releases](https://github.com/azwosile/agy-wallpaper-prism/releases).
2. Verify the SHA-256 checksum and extract as a **real directory** (never an NTFS junction or symlink on Windows, which Antigravity ignores) into:
   - `<USER_HOME>/.gemini/config/plugins/agy-wallpaper-prism`
3. Manage or enable the plugin via [Wallpaper Prism Customizations](customization://agy-wallpaper-prism). Installed release builds support **1-Click GitHub Release Self-Update** inside Studio (**Host & System**) with `.sha256` verification, `tar-safe.mjs` validation, and atomic rollback.

#### Method B — Antigravity Market / Customizations UI

- Open Antigravity's Customizations marketplace (or click [Wallpaper Prism](customization://agy-wallpaper-prism)), search for `Wallpaper Prism` (`agy-wallpaper-prism`), and enable it.

#### Method C — Local Development from Source (Node.js `>= 22.0.0`)

```powershell
git clone https://github.com/azwosile/agy-wallpaper-prism.git
cd agy-wallpaper-prism

# 1. Compile deterministic pure-LF Studio bundle (zero external npm dependencies)
node scripts/build.mjs

# 2. Install via real-file copy into ~/.gemini/config/plugins/agy-wallpaper-prism + live reload
node scripts/install-local.mjs
```

> **Note**: Git dev checkouts intentionally block 1-click self-updates (`409 ERR_GIT_DEV_CHECKOUT`); update via `git pull && node scripts/build.mjs && node scripts/install-local.mjs`.

---

### 3. Quick Start & Usage

1. **Open Studio Aux Pane**: Click [Wallpaper Prism](sidecar://agy-wallpaper-prism/prism_studio/) in chat (or **Auxiliary Pane -> `+` -> Plugins -> Wallpaper Prism**).
2. **Enable Normal-Shortcut Auto-Load (One-Time, Zero Session Disruption)**:
   - Click **`Enable Normal Shortcut Auto-Load (Zero Interruption)`** in Studio's **Host & System** tab (or run `npm run enable-autostart`).
   - Backs up stock shortcut arguments and appends `--remote-debugging-port=9339` to your standard `Antigravity.lnk` icons so every future normal launch restores your glass skin and wallpaper automatically.
3. **Explore Media & Quick Prism (`Ctrl+Alt+W`)**:
   - Auto-discovers **Steam Wallpaper Engine (`431960`)**, scans `customFolders` up to depth 4, supports `512 MB` SHA-256 deduplicated drag-and-drop uploads, slideshows, `.mp4/.webm/.mov/.mkv` (virtual faststart + HTTP `206` + `/mse-fmp4/` + OOPIF `/video-stage/`), sandboxed `web` wallpapers, `scene.pkg` extraction, and timer/`videoEnd` rotation playlists.
   - Press **`Ctrl+Alt+W`** or click the **`◆ Prism`** composer-footer pill / corner orb for quick wallpaper, audio, and preset (`Crystal`, `Islands`, `Focus`, `Eco`) switching.
4. **Customize with Visual Editor & Live Host Region Picker (`v2.3.0`)**:
   - Open **Prism Skin -> `🎨 Visual Editor`** (or **`↗ Fullscreen in Browser`** for the zero-token Popout IDE).
   - Click **`🎯 Pick Live Host Region`**, hover over any element in the live Antigravity window, and **left-click** to jump the inspector straight to that region. Press **`Esc`**, **right-click**, or click **`✕ Cancel Pick`** anytime to cancel.

#### Keybindings & Shortcuts

| Shortcut / Gesture | Action |
|---|---|
| `Ctrl+Alt+W` | Toggle the in-host **Quick Prism Popover** |
| `Shift+Click` or middle-click `#agy-prism-pill` | Instant 1-click soft-enable / soft-disable (`<50ms` toggle) |
| `Left-Click` while picking | Pick highlighted live Antigravity region & focus its inspector |
| `Esc` / `Right-Click` while picking | Cancel live region picker (checked before closing Visual Editor modal) |
| `Ctrl+Alt+Shift+R` or `4× Esc` | Emergency panic strip: removes all `#agy-prism-*` layers immediately |

---

### 4. Architecture & Engineering Contracts

```text
agy-wallpaper-prism/
├── plugin.json                     # Official 10-key plugin manifest (version: 2.3.0)
├── package.json                    # Node >=22 ESM package & build/pack/CLI scripts
├── assets/logo.svg                 # 256×256 faceted Prism vector icon
├── docs/                           # Bilingual docs index, CHANGELOG, DSH parity spec & archives
├── skills/wallpaper-prism/SKILL.md # Agent navigation & safe CLI skill (v2.3.0)
├── .github/workflows/release.yml   # Automated CI verification & 3-artifact GitHub Release workflow
├── src/
│   ├── shared/                     # Canonical 8-region schema, version anchors, SemVer & 430-key zh/en i18n
│   ├── engine/                     # Steam/WE scanner, MP4 faststart VFS, PKGV/LZ4, 206+/mse-fmp4/, tar-safe updater
│   ├── host/                       # Skin microkernel, Quick Prism popover & v2.3.0 live picker (inspector-inject.js)
│   └── studio-ui/                  # Acyclic L0–L6 modular Studio UI & Dual-Form Visual Region Editor
├── sidecars/prism_studio/          # Fenced single-instance Sidecar HTTP server, media proxy, Popout IDE & CDP bridge
├── host/cli.mjs                    # Safe thin CLI (never kills or restarts Antigravity)
└── test/verify-all.mjs             # 3-suite Manifest, Engine/Updater & Headless Chrome E2E verification harness
```

- **8-Region Canonical Schema**: `REGION_IDS` (`topbar`, `wco`, `sidebar`, `workspace`, `card`, `composer`, `rightPane`, `popover`) in `src/shared/schema.mjs`, each carrying 11 optical/structural properties (plus 4 sidebar typography/list-style properties) with lossless `v2.1.0` `surfaceTints` migration.
- **Zero-Dependency Deterministic Build**: `scripts/build.mjs` compiles the acyclic `src/studio-ui/` module graph and CSS `@import` chain into deterministic pure-LF `sidecars/prism_studio/index.html` with zero external bundler dependencies.
- **CDP Security & Auth Boundaries**:
  - Strictly enforces Zero-Enable Ephemeral CDP; `buildHostMicroBootstrap` stays `<= 6,144 B` (`0 B` added by the on-demand Live Region Picker).
  - Enforces global loopback `Host` DNS-rebinding guards, header-only `X-Sidecar-Token` (`0o600` `server_info.json`), and strict CSRF Origin checks on mutating routes (`/api/config`, `/api/studio/popout`, `/api/inspector/pick`, `/api/inspector/cancel`, `/api/update/*`).
  - Persists user state under `ANTIGRAVITY_EXECUTABLE_DATA_DIR` (default `<USER_HOME>/.gemini/antigravity/sidecar_data/agy-wallpaper-prism/prism_studio/data`) with automatic non-destructive migration from legacy `~/.agy-wallpaper-prism`.

---

### 5. Development & Verification Scripts

All commands align verbatim with `package.json` (requires Node.js `>= 22.0.0`):

| Command | Script | Purpose |
|---|---|---|
| `npm run build` | `node scripts/build.mjs` | Build deterministic pure-LF single-file `sidecars/prism_studio/index.html` |
| `npm run install:local` | `node scripts/install-local.mjs` | Real-file install into `<USER_HOME>/.gemini/config/plugins/agy-wallpaper-prism` + live reload |
| `npm test` | `node test/verify-all.mjs` | Run all 3 verification suites (set `$env:PRISM_ALLOW_DIRTY_GIT='1'` when testing uncommitted edits) |
| `npm run pack:release` | `node scripts/pack-release.mjs` | Produce deterministic `dist/agy-wallpaper-prism-v2.3.0.{tar.gz,tar.gz.sha256,zip}` |
| `npm run status` | `node host/cli.mjs status` | Read-only diagnostic report (Sidecar, CDP, shortcuts, canary, active item) |
| `npm run wake` | `node host/cli.mjs wake` | Gently wake and mount the Prism skin |
| `npm run reset-canary` | `node host/cli.mjs reset-canary` | Clear tripped Boot Canary Safe Mode and re-enable skin |
| `npm run enable-autostart` | `node host/cli.mjs enable-autostart` | Back up and patch normal shortcuts with `--remote-debugging-port=9339` |
| `npm run disable-autostart` | `node host/cli.mjs disable-autostart` | Restore original shortcut arguments from backup |
| `npm run restore` | `node host/cli.mjs restore` | Cleanly strip skin and set `skinEnabled=false` |

Additional direct CLI commands: `node host/cli.mjs preset <crystal|islands|focus|eco>` and `node host/cli.mjs create-shortcut [--port 9339]`.

---

### 6. Troubleshooting

- **Standby (`cdpReachable: false`) or Live Picker reports no reachable host window**
  - Ensure Antigravity was launched with `--remote-debugging-port` by clicking **Enable Normal Shortcut Auto-Load** in **Host & System** (or running `npm run enable-autostart`), then restart Antigravity once. Prism intentionally avoids probing shared port `9222` on cold boot unless configured.
- **Video wallpaper does not play or falls back to static poster**
  - `v2.3.0` sets `MAX_BLOB_MEDIA_BYTES = Infinity` (`60s` timeout) for direct `fetch+blob` playback; if a stream stalls or errors (non-404), Prism falls back automatically to `MediaSource` `/mse-fmp4/` (requires `ffmpeg` on `PATH`) or a static poster while keeping glass chrome alive (`404`/`403`/`410` stay Fail-Open).
- **Multi-window / stale Sidecar / plugin not loading on Windows**
  - Never symlink or NTFS-junction the plugin directory on Windows; use `node scripts/install-local.mjs` or extract a real folder. PR `#11` fences superseded Sidecar instances and auto-exits orphans; run `npm run status` to inspect live PID/port health.
- **Instant native appearance recovery / Boot Canary tripped**
  - Press **`Ctrl+Alt+Shift+R`** or **`4× Esc`** anytime, toggle off from Studio / Quick Prism, or run `npm run restore` / `npm run reset-canary`.
- **Coexistence with `Antigravity-Chinese-Localization`**
  - Both the skin and `v2.3.0` Live Region Picker rely strictly on structural DOM selectors and `<html>`-only state attributes (`0` `<body>` mutations), preventing translation interference.

---

### 7. Acknowledgments & Contributors

- **Special thanks to [`@zmzwynzj`](https://github.com/zmzwynzj)**:
  - Contributed **PR `#11`** (`fix(sidecar,cdp): fence superseded sidecar instances and exit when orphaned`, merged in `88a6a0a`), eliminating `600ms` SSE hijack loops by superseded Sidecars and ensuring orphaned instances exit cleanly.
  - Previously contributed **PR `#3`** (`12a00a3`), **PR `#5`** (`a949f96`), **PR `#6`** (`be354e7`), **PR `#7`** (`0c67d36` / `fa1f877`), **PR `#8`** (`00521cc`), and **PR `#9`** (`f298c8d`), driving major improvements across media streaming, data migration, and CDP stability.
- **Thanks to [`@yuezhu114`](https://github.com/yuezhu114)** for Issue `#10`, motivating zero-jitter optical presets and `.agy-prism-blur-veil`.
- **Thanks to `@CarbonAnime`** for PR `#2` (`e382b23`), adding early Antigravity `2.34.0` layout support.
- **Design & Parity Lineage**: [`RMvdesi/obsidian-prism`](https://github.com/RMvdesi/obsidian-prism), [`damiankorcz/Prism-Theme`](https://github.com/damiankorcz/Prism-Theme), and [`elysia395/dsh-wallpaper-engine`](https://github.com/elysia395/dsh-wallpaper-engine).

[⬆ Back to Top](#wallpaper-prism-agy-wallpaper-prism)
