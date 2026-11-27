# Wallpaper Prism (`agy-wallpaper-prism`)

> **Repository**: [https://github.com/azwosile/agy-wallpaper-prism](https://github.com/azwosile/agy-wallpaper-prism)  
> **Version**: `2.4.1` · **Zero Agent Tokens** · **Zero `app.asar` Modification** · **License**: MIT

**适用于 Google Antigravity 的棱镜液态玻璃皮肤与动态壁纸工作台**  
**Obsidian Prism Liquid Glass Skin & Wallpaper Engine Studio for Google Antigravity**

**语言 / Language**: [**简体中文**](#简体中文文档) · [**English**](#english-documentation) · [**更新日志 / Changelog**](docs/CHANGELOG.md) · [**文档索引 / Docs Index**](docs/README.md)

---

## 简体中文文档

### 1. 简介与 `v2.4.1` 核心亮点

`agy-wallpaper-prism` 为 Google Antigravity 2.x 带来基于 **Obsidian Prism** 光学层次体系的整窗液态玻璃皮肤，以及兼容 **Steam Wallpaper Engine (`431960`)** 与本地多媒体的动态壁纸工作台：

- **零 Agent 上下文 / Token 消耗**：插件默认不向模型注入任何 MCP 工具或系统提示词，渲染、流媒体与皮肤控制完全在带外 Sidecar 进程中运行。
- **零 `app.asar` 侵入修改**：通过 **Zero-Enable Ephemeral CDP**（零持久域：严格禁用 `Page.enable`、`Runtime.enable`、`Page.addScriptToEvaluateOnNewDocument` 与 `Runtime.addBinding`）进行安全挂载，并具备 **Fail-Open** 首帧就绪门控与双阶段 `fsync` 启动金丝雀熔断保护。

#### `v2.4.1` 新特性亮点

1. **可选自定义开场动画（Opening Animation，默认关闭）**
   - **默认关闭、零冷启动干扰**：`introEnabled` 默认为 `false`；开启后仅在每次启动 Antigravity 宿主窗口时自动播放一次全屏开场动画（通过 `window.__agyPrismIntroPlayed` 防重复播放），绝不在配置微调、热重载或 SSE 重连时误触发。
   - **双源自由设定**：
     - **Wallpaper 动态壁纸模式（`wallpaper`）**：可直接从已扫描的 **Steam Wallpaper Engine (`431960`)** 动态壁纸库或本地壁纸库中挑选任意视频、`Scene` 场景或 `Web` 壁纸作为开场动画（支持「✦ 选用当前壁纸」快捷设定）。
     - **自定义视频模式（`custom`）**：支持直接选择 / 上传本地视频文件（`MP4 / WebM / MOV / MKV / M4V / OGV`，最大 `512 MiB`），独立保存于 `<dataDir>/intro/`（SHA-256 去重），完全不混入壁纸库与轮播列表；复用回环 `HTTP 206`、跨协议 `fetch+blob` 与 `/mse-fmp4/` 完整流式管线。
   - **精细播放控制与即时宿主预览**：支持自定义播放时长（`0s` 播完自动结束至 `30s`，内置快捷时长按钮）、淡出过渡（`200–2000ms`）、画面适配（`铺满裁切 Cover` / `完整适应 Contain`）、静音/音量控制（浏览器拦截有声自动播放时自动静默降级不卡死）、底部进度条与跳过胶囊（支持点击画面、`Esc` / `空格` / `回车` 即时跳过），以及工作台内 **「▶ 立即在宿主窗口预览」**（`POST /api/intro/preview`）。
   - **严守五大工程红线**：对 `buildHostMicroBootstrap`（`<= 6,144 B`）保持 **`0 B` 增量**；内建 **`4.5s` 首帧解码 Fail-Open 看门狗**（媒体损坏或 404 时自动无痕退出绝不黑屏阻塞），设置 `data-browser-occluder="true"` 与防汉化隔离属性，并在软停用 / `Ctrl+Alt+Shift+R` 逃生时立即销毁叠加层与全部 Blob URL。
2. **12 区域对话气泡与宿主控件玻璃化体系（`v2.4.0` 默认无毛玻璃完整继承）**
   - 将统一 `REGION_IDS` 从 8 个扩展至 **12 个区域**：在原有 `topbar`、`wco`、`sidebar`、`workspace`、`card`、`composer`、`rightPane`、`popover` 基础上，正式拆出并独立精调 **用户消息气泡（`userBubble`）**、**AI 回复与任务卡（`assistantBubble`）**、**代码块与表格（`codeBlock`）** 与 **按钮及交互控件（`controls`）**。
   - **默认无毛玻璃（Zero-Blur Default）**：`userBubble`、`assistantBubble`、`codeBlock`、`controls` 与 `card` 五大新增/内容区域默认保持 **`无毛玻璃`（`style: 'none'`, `blur: 0`）** 锐利清透观感（并移除隐藏自动模糊与非浮窗 `.surface-glass` 误模糊）；其余 7 个工作台外框浮岛保留 `16px` 默认磨砂，同时新增一键 **`清透无雾 / Crisp Glass`（`crisp`）** 场景预设实现全区域 `0px` 零模糊。
   - **5 种玻璃材质风格 + 饱和度与投影深度**：每个区域均支持 **`无毛玻璃 / 毛玻璃 / 水晶玻璃 / 半透着色 / 纯色`**（`none` / `frosted` / `crystal` / `tinted` / `solid`，以及跟随默认 `auto`），搭配 **玻璃色彩饱和度（`50%–220%`）**、**投影深度倍率（`0–2×`）** 与零透明度无幽灵阴影守卫；共 **9 项光学属性** 随预设切换统一重置且绝不破坏排版圆角。
   - **精确防叠框与护眼隔离**：外层 `<pre>` 镂空单框渲染修复与语法高亮色保留；当 `assistantBubble` 开启模糊时自动抑制内部代码块嵌套 `backdrop-filter`；高优先级 `body[data-agy-theme]` 规则覆盖按钮、输入框、标签页、切换胶囊、滚动条滑块与语音胶囊（微按钮与行内 `code` 始终保持零模糊）。
   - **五端 100% 实时联动与静态对齐**：工作台 **12 区域分类手风琴**、**双形态可视化编辑器**（侧栏弹窗 + 浏览器全屏 Popout IDE）、**CDP 12 区域真实宿主点击拾取器**、**Quick Prism (`Ctrl+Alt+W`)** 行内风格循环切换胶囊以及 **`static-css` 纯静态模式** 全线打通。
3. **大型 / 4K60 HEVC 稳定流媒体、`Scene` 高清 `.tex` 解码与窄屏滚动（PR `#12` & `#13` + `F-01`）**
   - **Priority 0 大视频 MSE 直连与高码率 4K60 保护**：合入 **PR `#12`** 与 **PR `#13`**，对静音大/长视频（`>= 100 MiB` 或 `>= 90s`）优先直连回环 `/mse-fmp4/` 流，释放宿主代理通道避免工作台卡顿；支持 HEVC 非零初始 PTS 对齐、`48 MiB / 64 MiB / 80 MiB` 字节感知前瞻驱逐、`QuotaExceededError`（`<2s` 与暂停态）无闪烁恢复及循环重挂载无缝冻结衔接（Zero-Blanking Loop Remount）。
   - **解除静音自动无缝切流 & 代理并发扩容（`F-01`）**：`mediaKey` 追踪大视频音频流状态，开启声音时自动切至带音轨流媒体（不黑屏）；`MAX_CONCURRENT_STREAM_PROXIES` 提升至 `4`（TCP RST 防池饥饿 + `10s` 背压卡顿清理 + `seeking` 死锁自愈）。
   - **零依赖 `Scene` 高清 `.tex` 提取与 `web` 壁纸增强**：在 `pkg-scene.mjs` 中纯 Node 标准库实现 `TEXB0001..0004`（LZ4 解压、内嵌 `PNG/JPEG/WebP` 直出、以及 `RGBA8888 / DXT1 / DXT3 / DXT5` 纯 JS 转码 PNG）通过 `/scene-image/` 输出高清画面；为 `/media-proxy/web/` 注入 `<base href>`、`viewport` 与随机文件/媒体事件 Shim，并保持 `1:1` 缩放清晰无模糊。
   - **窄屏（`<840px`）工作台统一滚动**：修复窄侧栏下预览区与标签页统一滚动、粘性 `.prism-tabs-bar`（`scroll-margin-top: 56px` 防手风琴定位遮挡）、虚拟网格第 `27` 项后连续滚动与 `0×0` 容器深度休眠检测。
4. **跨版本稳固基座（`v2.3.0` 能力完整保留并升级）**
   - **CDP 真实宿主点击拾取检查器（`0 B` 微引导增量）**、**无上限直连视频播放（`MAX_BLOB_MEDIA_BYTES = Infinity`）**、**单实例 Sidecar `instanceId` 围栏与孤儿自退出（PR `#11`）**、**4 套纯 CSS 侧栏列表样式** 与 **三端一键开关 / `Ctrl+Alt+Shift+R` 紧急恢复** 均完整保留并同步支持 12 区域体系。

---

### 2. 安装方式

#### 方式 A：通过 GitHub Releases 压缩包安装（推荐普通用户）

1. 前往 [GitHub Releases](https://github.com/azwosile/agy-wallpaper-prism/releases) 下载对应版本的 `agy-wallpaper-prism-v2.4.1.tar.gz`（或 `.zip`）以及 `agy-wallpaper-prism-v2.4.1.tar.gz.sha256` 校验文件。
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
3. **切换壁纸、5 大场景预设与 Quick Prism（`Ctrl+Alt+W`）**：
   - 支持 **Steam Wallpaper Engine (`431960`)** 创意工坊与官方项目自动发现、`customFolders` 递归 4 层扫描、拖拽上传（上限 `512 MB`，SHA-256 自动去重）、多图幻灯片、`MP4/WebM/MOV/MKV`（含 4K60 MSE 字节流与无音轨解锁重挂载）、`web` 交互壁纸及 `scene.pkg` 高清 `.tex` 提取播放，支持定时或「视频播完即换」轮播列表。
   - 按 **`Ctrl+Alt+W`** 或点击输入框底栏 **`◆ Prism`** 胶囊（或角落微标）呼出 **Quick Prism 快捷浮窗**，随时切壁纸、调音量、在行内循环切换各组件玻璃材质风格，或一键应用 5 大场景预设（`清透无雾 Crisp Glass` / `通透流光 Crystal` / `浮岛画境 Islands` / `沉静柔焦 Focus` / `极简省电 Eco`）。
4. **配置可选开场动画（默认关闭）**：
   - 打开工作台 **播放** 标签页顶部的 **「🎬 开场动画」** 折叠区，按需开启 **「启用开场动画」**；在 **「Wallpaper 动态壁纸」**（直接选用 Wallpaper Engine / 本地动态壁纸）与 **「自定义视频」**（上传本地 MP4/WebM/MOV/MKV 视频）之间自由切换，并点击 **「▶ 立即在宿主窗口预览」** 实时查看效果。
5. **使用 12 区域可视化编辑器与真实宿主区域拾取器**：
   - 进入 **棱镜外观** -> 点击 **「🎨 可视化编辑」**（或 **「↗ 浏览器全屏编辑」** 零令牌浏览 Popout IDE），直接在画布中点击用户气泡、AI 回复/任务卡、代码块、宿主控件、功能卡片或外框任意区域调校 **5 种玻璃材质**、模糊半径、饱和度与投影深度。
   - 点击 **「🎯 拾取真实界面区域」**，回到 Antigravity 窗口将鼠标悬停于对话气泡、代码块、按钮控件、顶栏或浮窗上，**左键点击**即可自动定位检查器至对应区域；按 **`Esc`**、**右键点击** 或工作台内 **「✕ 取消拾取」** 可随时退出。

#### 快捷键速查

| 快捷键 / 手势 | 作用 |
|---|---|
| `Ctrl+Alt+W` | 唤起 / 收起宿主内 **Quick Prism 快捷浮窗** |
| `Shift+Click` 或中键点击 `#agy-prism-pill` | 一键软启用 / 软停用全窗皮肤与壁纸（`<50ms` 无损切换） |
| 拾取模式中 `左键` | 选中高亮的 Antigravity 真实区域（12 区域）并聚焦属性检查器 |
| 拾取模式中 `Esc` / `右键` | 取消真实宿主区域拾取（优先于关闭编辑器弹窗） |
| `Ctrl+Alt+Shift+R` 或连续 `4× Esc` | 紧急逃生舱：立即剥离全部 `#agy-prism-*` 图层并恢复原生外观 |

---

### 4. 架构与工程契约

```text
agy-wallpaper-prism/
├── plugin.json                     # 官方 10 键插件清单 (version: 2.4.1)
├── package.json                    # Node >=22 ESM 包配置与构建/打包/CLI 脚本
├── assets/logo.svg                 # 256×256 棱镜矢量图标
├── docs/                           # 双语文档导航、CHANGELOG、DSH 对齐规范与历史档案
├── skills/wallpaper-prism/SKILL.md # Agent 按需调度与安全 CLI 指南 (v2.4.1)
├── .github/workflows/release.yml   # GitHub Actions 自动化验证与三产物发布流
├── src/
│   ├── shared/                     # 12 区域统一 Schema、5 种玻璃风格、5 套光学预设与 498 键中英字典
│   ├── engine/                     # Steam/WE 扫描、MP4 虚拟快启、PKGV/LZ4/DXT 高清解析、206+/mse-fmp4/、安全自更新
│   ├── host/                       # 宿主皮肤微核、4K60 MSE 引擎、Quick Prism 浮窗及 12 区域拾取器 (inspector-inject.js)
│   └── studio-ui/                  # L0–L6 无环图模块化 Studio UI、窄屏统一滚动与双形态可视化编辑器
├── sidecars/prism_studio/          # 单实例围栏 Sidecar HTTP 服务、并发流控媒体代理、Popout IDE 与无侵入 CDP 桥接
├── host/cli.mjs                    # 安全 CLI 工具（绝不强杀 Antigravity 进程）
└── test/verify-all.mjs             # 自动化验证套件（清单/引擎/无头 Chrome E2E）
```

- **12 区域统一 Schema**：由 `src/shared/schema.mjs` (`REGION_IDS`) 统一定义 `topbar`、`wco`、`sidebar`、`workspace`、`card`、`userBubble`、`assistantBubble`、`codeBlock`、`controls`、`composer`、`rightPane`、`popover`，支持 **9 项光学属性**（`style`、`glassEnabled`、`blur`、`saturation`、`opacity`、`tone`、`tint`、`borderOpacity`、`elevation`）、**6 项结构排版属性**及 **4 项侧栏专属属性**，并与 `surfaceTints` 及旧版配置保持双向无损迁移。
- **零依赖确定性构建**：`scripts/build.mjs` 通过词法解析将 `src/studio-ui/` 的 ES 模块依赖图与 `@import` CSS 内联编译为确定性纯 LF 单文件 `sidecars/prism_studio/index.html`（无第三方打包器依赖）。
- **CDP 安全与令牌边界**：
  - 严格执行 Zero-Enable Ephemeral CDP，微引导 `buildHostMicroBootstrap` 恒定 `<= 6,144 B`（拾取器按需注入，增量 `0 B`）。
  - Sidecar 全路由强制校验回环 `Host` 防 DNS 重绑定，敏感变更路由（`/api/config`、`/api/studio/popout`、`/api/inspector/pick`、`/api/inspector/cancel`、`/api/update/*` 等）强制校验 Header `X-Sidecar-Token`（`0o600` 权限落盘于 `server_info.json`）与同源 CSRF 防护。
  - 运行期配置与缓存持久化于 `ANTIGRAVITY_EXECUTABLE_DATA_DIR`（默认 `<USER_HOME>/.gemini/antigravity/sidecar_data/agy-wallpaper-prism/prism_studio/data`），首次启动自动无损迁移旧版 `~/.agy-wallpaper-prism`。

---

### 5. 开发与验证脚本

所有脚本严格对应 `package.json`（均需 Node.js `>= 22.0.0`）：

| 命令 | 底层脚本 | 用途说明 |
|---|---|---|
| `npm run build` | `node scripts/build.mjs` | 将 `src/studio-ui/` 确定性内联构建为纯 LF `sidecars/prism_studio/index.html` |
| `npm run install:local` | `node scripts/install-local.mjs` | 真实文件安装至 `<USER_HOME>/.gemini/config/plugins/agy-wallpaper-prism` 并热同步 |
| `npm test` | `node test/verify-all.mjs` | 运行全部自动化测试套件（提交前如有未提交修改，先设置 `$env:PRISM_ALLOW_DIRTY_GIT='1'`） |
| `npm run pack:release` | `node scripts/pack-release.mjs` | 生成 `dist/agy-wallpaper-prism-v2.4.1.{tar.gz,tar.gz.sha256,zip}` 三产物 |
| `npm run status` | `node host/cli.mjs status` | 只读检查 Sidecar、CDP、快捷方式、金丝雀与当前壁纸状态 |
| `npm run wake` | `node host/cli.mjs wake` | 温和唤醒并重新挂载宿主皮肤 |
| `npm run reset-canary` | `node host/cli.mjs reset-canary` | 清除启动金丝雀 `tripped` 熔断状态并恢复启用 |
| `npm run enable-autostart` | `node host/cli.mjs enable-autostart` | 为普通快捷方式备份并写入 `--remote-debugging-port=9339` |
| `npm run disable-autostart` | `node host/cli.mjs disable-autostart` | 从备份无损还原普通快捷方式启动参数 |
| `npm run restore` | `node host/cli.mjs restore` | 干净剥离皮肤并设置 `skinEnabled=false` |

更多 CLI 子命令：`node host/cli.mjs preset <crisp|crystal|islands|focus|eco>` 与 `node host/cli.mjs create-shortcut [--port 9339]`。

---

### 6. 常见问题与排障

- **工作台显示「待机中 (未开启 CDP)」或实时区域拾取提示未检测到宿主窗口**
  - 请先确认 Antigravity 是否带 `--remote-debugging-port` 启动：点击工作台 **宿主与系统** -> **一键开启普通快捷方式自动加载**（或执行 `npm run enable-autostart`），重启 Antigravity 即可生效。为防止与用户外部调试端口冲突，冷启动默认不主动探测公共 `9222` 端口。
- **为什么新版气泡、任务卡或按钮默认没有毛玻璃模糊？**
  - 为保障长期阅读锐度与 GPU 帧率，`v2.4.0` 默认将 `userBubble`、`assistantBubble`、`codeBlock`、`controls` 与 `card` 设为 **「无毛玻璃」**。您可在 **棱镜外观**、**可视化编辑器** 或 **`Ctrl+Alt+W` Quick Prism** 中随时切换为 **「毛玻璃」** 或 **「水晶玻璃」**（拖动模糊滑块 `> 0px` 也会自动开启毛玻璃），或一键选择 **`通透流光 Crystal` / `浮岛画境 Islands`**。
- **4K60 / 大型视频壁纸播放、解除静音或静态封面降级**
  - 静音大/长视频（`>= 100 MiB` 或 `>= 90s`）会优先走 `/mse-fmp4/` 字节感知流式播放（`48–80 MiB` 缓冲窗口 + 无闪烁循环重挂载，需 `PATH` 中存在 `ffmpeg`）；打开音量时会自动切回带音轨流媒体；若环境未安装 `ffmpeg`，则自动走 `MAX_BLOB_MEDIA_BYTES = Infinity` 直连或平滑降级为静态封面。
- **多窗口 / 异常状态 / Windows 安装未生效**
  - Windows 下切勿使用 NTFS Junction/Symlink，请始终使用 `node scripts/install-local.mjs` 或解压真实目录。PR `#11` 单实例围栏会自动清理孤儿 Sidecar，且并发流代理池上限已扩至 `4` 路；可通过 `npm run status` 检查存活实例端口与状态。
- **如何快速还原 Antigravity 原生外观**
  - 任意时刻按 **`Ctrl+Alt+Shift+R`** 或连续按 **`4× Esc`**，或在工作台顶部开关 / `Ctrl+Alt+W` 浮窗一键关闭，也可运行 `npm run restore` 或 `npm run reset-canary`。
- **与 `Antigravity-Chinese-Localization` 汉化插件共存**
  - 皮肤与 12 区域实时拾取器均只使用结构化选择器，状态属性仅挂载于 `<html>`（零 `<body>` DOM 变异，零文本/`aria-label` 选择器），不会干扰汉化翻译生命周期。

---

### 7. 致谢与贡献者

- **特别致谢 [`@zmzwynzj`](https://github.com/zmzwynzj)**：
  - 贡献 **PR `#11`**（`fix(sidecar,cdp): fence superseded sidecar instances and exit when orphaned`，合并于 `88a6a0a`），彻底消除被接管 Sidecar 在 SSE 重连窗口抢占控制权与孤儿进程驻留问题。
  - 贡献 **PR `#12`**（`fix: stabilize large/4K60 HEVC video streaming, scene HD .tex & web adaptation, and narrow Studio scroll`，合并于 `235df43`），带来大视频 Priority 0 MSE 流控、HEVC 初始 PTS 对齐、纯 JS `Scene` 高清 `.tex` 解码（`PNG/JPEG/WebP/RGBA8888/DXT1/3/5`）、`web` 壁纸适配与 `<840px` 窄屏工作台统一滚动修复。
  - 贡献 **PR `#13`**（`fix(host): prevent high-bitrate 4K60 MSE QuotaExceededError black flash and blanking loop remount`，合并于 `4e918fb`），实现字节感知 4K60 MSE 前瞻驱逐、`QuotaExceededError` 恢复与循环重挂载零黑屏衔接。
  - 此前还持续贡献了 **PR `#3`**（`12a00a3`）、**PR `#5`**（`a949f96`）、**PR `#6`**（`be354e7`）、**PR `#7`**（`0c67d36` / `fa1f877`）、**PR `#8`**（`00521cc`）与 **PR `#9`**（`f298c8d`），是项目流媒体与宿主稳定性演进的核心贡献者。
- **感谢 [`@yuezhu114`](https://github.com/yuezhu114)**：提出 Issue `#10`，推动了零布局跳动光学预设与边缘柔化模糊遮罩（`.agy-prism-blur-veil`）的实现。
- **感谢 `@CarbonAnime`**：贡献 PR `#2`（`e382b23`），早期适配 Antigravity `2.34.0` 布局。
- **设计灵感与引擎基石**：[`RMvdesi/obsidian-prism`](https://github.com/RMvdesi/obsidian-prism)、[`damiankorcz/Prism-Theme`](https://github.com/damiankorcz/Prism-Theme) 与 [`elysia395/dsh-wallpaper-engine`](https://github.com/elysia395/dsh-wallpaper-engine)。

[⬆ 返回顶部](#wallpaper-prism-agy-wallpaper-prism)

---

## English Documentation

### 1. Overview & `v2.4.1` Release Highlights

`agy-wallpaper-prism` delivers an **Obsidian Prism** layered acrylic workbench skin and a full **Steam Wallpaper Engine (`431960`)** + local media studio for Google Antigravity 2.x:

- **Zero Agent Context/Token Overhead**: Registers no model-visible tools or prompt injections; all rendering, media streaming, and configuration run out-of-band in a gentle Sidecar process.
- **Zero `app.asar` Modification**: Attaches passively via **Zero-Enable Ephemeral CDP** (zero `Page.enable`, `Runtime.enable`, `Page.addScriptToEvaluateOnNewDocument`, or `Runtime.addBinding`), gated by a Fail-Open first-frame media stage and two-phase `fsync` Boot Canary circuit breaker.

#### What's New in `v2.4.1`

1. **Optional Customizable Opening Animation (Disabled by Default)**
   - **Zero Overhead When Off**: `introEnabled` defaults to `false`. When enabled, it plays a fullscreen opening animation once per Antigravity window launch (`window.__agyPrismIntroPlayed` session guard) and never retriggers on config edits, hot-reloads, or SSE reconnects.
   - **Dual Configurable Sources**:
     - **Wallpaper Engine / Library (`wallpaper`)**: Pick any dynamic wallpaper (`video`, `scene`, or `web`) from your scanned Steam Wallpaper Engine (`431960`) or local library, with a 1-click **Use Active Wallpaper** shortcut.
     - **Custom Video (`custom`)**: Upload any local video (`MP4 / WebM / MOV / MKV / M4V / OGV`, up to `512 MiB`) stored cleanly in `<dataDir>/intro/` (SHA-256 deduplicated, never cluttering your wallpaper library or playlists), powered by the full `HTTP 206` / cross-scheme `fetch+blob` / `/mse-fmp4/` streaming pipeline.
   - **Polished Playback & Live Host Preview**: Configure play duration (`0s` play-to-end up to `30s`), fade-out transition (`200–2000ms`), framing (`Cover` / `Contain`), mute & volume (with automatic muted fallback if autoplay with sound is blocked), bottom progress bar & skip pill (click, `Esc`, `Space`, or `Enter` to skip immediately), plus 1-click **Preview Intro in Host Window** (`POST /api/intro/preview`).
   - **Engineering Redlines Preserved**: **`0 B` delta** to `buildHostMicroBootstrap <= 6,144 B`, **`4.5s` Fail-Open first-frame watchdog** (broken/404 media dismisses cleanly without blocking the UI), `data-browser-occluder="true"` + CN-L10n isolation, and instant cleanup on soft-disable or `Ctrl+Alt+Shift+R`.
2. **12-Region Chat Bubbles & Host Controls Glassmorphism (`v2.4.0` Zero-Blur Default)**
   - Expands canonical `REGION_IDS` from 8 to **12 regions**: adding **User Bubble (`userBubble`)**, **Assistant Reply & Turn Cards (`assistantBubble`)**, **Code Blocks & Tables (`codeBlock`)**, and **Host Controls (`controls`)** alongside `topbar`, `wco`, `sidebar`, `workspace`, `card`, `composer`, `rightPane`, and `popover`.
   - **Zero-Blur Default on New Surfaces**: `userBubble`, `assistantBubble`, `codeBlock`, `controls`, and `card` default to **`No Blur` (`style: 'none'`, `blur: 0`)** for razor-sharp legibility out of the box (retiring hidden `chipBlurPx` auto-blur and stray non-popover `.surface-glass` blur). The 7 shell/overlay regions preserve `DEFAULT_CONFIG.glassBlur = 16`, while a new 1-click **`Crisp Glass` (`crisp`)** scene preset sets `0px` blur across every surface.
   - **5 Glass Styles + Saturation & Elevation**: Every region supports **`No Blur / Frosted / Crystal / Tinted / Solid`** (`none` / `frosted` / `crystal` / `tinted` / `solid`, plus `auto` default) with **Glass Saturation (`50%–220%`)**, **Shadow Elevation (`0–2×`)**, and a zero-alpha shadow guard (`alpha <= 0.01` emits zero phantom drop shadow). All **9 optical keys** reset cleanly with scene presets without disturbing layout geometry or typography.
   - **Single-Box Code Protection & High-Specificity Controls**: Hollows outer `<pre>` wrappers for single-box code cards while preserving syntax-highlight `<span>` colors, automatically suppresses nested `--prism-code-backdrop: none` inside blurred `[data-testid="planner-response-text"]`, and styles buttons, fields, tabs, toggle groups, voice pills, and overlay scrollbars under `body[data-agy-theme]` specificity while keeping micro-buttons and inline `code` unblurred.
   - **Unified Across All 5 Surfaces**: Fully wired across **Studio 12-Region Categorized Accordions**, **Dual-Form Visual Editor** (responsive in-sidebar Modal + fullscreen browser Popout IDE), **CDP 12-Region Live Host Picker**, **Quick Prism (`Ctrl+Alt+W`)** inline Glass Style cycler pills, and **`static-css` mode**.
3. **Large / 4K60 HEVC Streaming, Scene HD `.tex` & Web Adaptation, Narrow Studio Scroll (PR `#12` & PR `#13` + `F-01`)**
   - **Priority 0 MSE Streaming & 4K60 Protection**: Integrates **PR `#12`** and **PR `#13`** to route large/long muted videos (`>= 100 MiB` or `>= 90s`) through loopback `/mse-fmp4/` (keeping `plugin://` free for Studio), adding HEVC initial PTS alignment (`alignMseInitialPts`), byte-aware `48 / 64 / 80 MiB` 4K60 MSE lead capping & rolling eviction, bounded `QuotaExceededError` recovery without poster flashes, and non-blanking same-media loop remount.
   - **Unmute Auto-Remount & Concurrency Cap (`F-01`)**: Encodes audio-active state in `mediaKey` so unmuting a large video seamlessly remounts onto an audio-capable stream without blanking, and raises `MAX_CONCURRENT_STREAM_PROXIES` to `4` with TCP RST pool eviction, `10s` backpressure stall cleanup, and `seeking` deadlock self-healing.
   - **Zero-Dep Scene HD `.tex` Extractor & Web Fixes**: Adds pure-Node `TEXB0001..0004` decoding (`PNG/JPEG/WebP/RGBA8888/DXT1/DXT3/DXT5` -> `/scene-image/`) in `pkg-scene.mjs`, `/media-proxy/web/` `<base href>` + viewport + WE API shims, and crisp `1:1` `--prism-media-transform: none`.
   - **Narrow `<840px` Unified Studio Scroll**: Enables unified `.prism-workspace` vertical scrolling with sticky `.prism-tabs-bar` (`scroll-margin-top: 56px` accordion clearance), fixed virtual library scrolling past item 27, and `0×0` `#app` Soft/Deep Sleep detection.
4. **Hardened `v2.3.0` Foundation Retained & Upgraded**
   - Preserves `0 B` micro-bootstrap delta (`<= 6,144 B`), uncapped `MAX_BLOB_MEDIA_BYTES = Infinity` direct playback, PR `#11` single-instance Sidecar fencing & orphan exit, 4 pure-CSS sidebar list styles, and instant `Ctrl+Alt+Shift+R` / `4× Esc` native recovery.

---

### 2. Installation

#### Method A — GitHub Releases Archive (Recommended for Users)

1. Download `agy-wallpaper-prism-v2.4.1.tar.gz` (or `.zip`) and `agy-wallpaper-prism-v2.4.1.tar.gz.sha256` from [GitHub Releases](https://github.com/azwosile/agy-wallpaper-prism/releases).
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
3. **Explore Media, 5 Scene Presets & Quick Prism (`Ctrl+Alt+W`)**:
   - Auto-discovers **Steam Wallpaper Engine (`431960`)**, scans `customFolders` up to depth 4, supports `512 MB` SHA-256 deduplicated drag-and-drop uploads, slideshows, `.mp4/.webm/.mov/.mkv` (including 4K60 MSE streaming + unmute remount), sandboxed `web` wallpapers, `scene.pkg` HD `.tex` extraction, and timer/`videoEnd` rotation playlists.
   - Press **`Ctrl+Alt+W`** or click the **`◆ Prism`** composer-footer pill / corner orb to switch wallpapers, adjust volume, cycle per-component Glass Styles inline, or apply any of the 5 scene presets (**`Crisp Glass`**, `Crystal`, `Islands`, `Focus`, `Eco`).
4. **Customize with the 12-Region Visual Editor & Live Host Region Picker**:
   - Open **Prism Skin -> `🎨 Visual Editor`** (or **`↗ Fullscreen in Browser`** for the zero-token Popout IDE) to click user bubbles, assistant replies/turn cards, code blocks, host controls, standalone cards, or chrome regions and tune **5 Glass Styles**, blur, saturation, and shadow elevation live.
   - Click **`🎯 Pick Live Host Region`**, hover over any bubble, code block, control, topbar, or popover in the live Antigravity window, and **left-click** to focus the inspector straight to that region. Press **`Esc`**, **right-click**, or click **`✕ Cancel Pick`** anytime to cancel.

#### Keybindings & Shortcuts

| Shortcut / Gesture | Action |
|---|---|
| `Ctrl+Alt+W` | Toggle the in-host **Quick Prism Popover** |
| `Shift+Click` or middle-click `#agy-prism-pill` | Instant 1-click soft-enable / soft-disable (`<50ms` toggle) |
| `Left-Click` while picking | Pick highlighted live Antigravity region (12 regions) & focus inspector |
| `Esc` / `Right-Click` while picking | Cancel live region picker (checked before closing Visual Editor modal) |
| `Ctrl+Alt+Shift+R` or `4× Esc` | Emergency panic strip: removes all `#agy-prism-*` layers immediately |

---

### 4. Architecture & Engineering Contracts

```text
agy-wallpaper-prism/
├── plugin.json                     # Official 10-key plugin manifest (version: 2.4.1)
├── package.json                    # Node >=22 ESM package & build/pack/CLI scripts
├── assets/logo.svg                 # 256×256 faceted Prism vector icon
├── docs/                           # Bilingual docs index, CHANGELOG, DSH parity spec & archives
├── skills/wallpaper-prism/SKILL.md # Agent navigation & safe CLI skill (v2.4.1)
├── .github/workflows/release.yml   # Automated CI verification & 3-artifact GitHub Release workflow
├── src/
│   ├── shared/                     # 12-region schema, 5 glass styles, 5 scene presets & 498-key zh/en i18n
│   ├── engine/                     # Steam/WE scanner, MP4 faststart VFS, PKGV/LZ4/DXT HD extractor, 206+/mse-fmp4/, updater
│   ├── host/                       # Skin microkernel, 4K60 MSE engine, Quick Prism popover & 12-region picker (inspector-inject.js)
│   └── studio-ui/                  # Acyclic L0–L6 Studio UI, narrow <840px unified scroll & Dual-Form Visual Editor
├── sidecars/prism_studio/          # Fenced single-instance Sidecar HTTP server, capped proxy (4), Popout IDE & CDP bridge
├── host/cli.mjs                    # Safe thin CLI (never kills or restarts Antigravity)
└── test/verify-all.mjs             # Automated Manifest, Engine/Updater & Headless Chrome E2E verification harness
```

- **12-Region Canonical Schema**: `REGION_IDS` (`topbar`, `wco`, `sidebar`, `workspace`, `card`, `userBubble`, `assistantBubble`, `codeBlock`, `controls`, `composer`, `rightPane`, `popover`) in `src/shared/schema.mjs`, each carrying **9 optical properties** (`style`, `glassEnabled`, `blur`, `saturation`, `opacity`, `tone`, `tint`, `borderOpacity`, `elevation`), **6 structural/typography properties** (plus 4 sidebar properties), and lossless backward migration from `surfaceTints` / `v2.1.0` configs.
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
| `npm test` | `node test/verify-all.mjs` | Run all verification suites (set `$env:PRISM_ALLOW_DIRTY_GIT='1'` when testing uncommitted edits) |
| `npm run pack:release` | `node scripts/pack-release.mjs` | Produce deterministic `dist/agy-wallpaper-prism-v2.4.1.{tar.gz,tar.gz.sha256,zip}` |
| `npm run status` | `node host/cli.mjs status` | Read-only diagnostic report (Sidecar, CDP, shortcuts, canary, active item) |
| `npm run wake` | `node host/cli.mjs wake` | Gently wake and mount the Prism skin |
| `npm run reset-canary` | `node host/cli.mjs reset-canary` | Clear tripped Boot Canary Safe Mode and re-enable skin |
| `npm run enable-autostart` | `node host/cli.mjs enable-autostart` | Back up and patch normal shortcuts with `--remote-debugging-port=9339` |
| `npm run disable-autostart` | `node host/cli.mjs disable-autostart` | Restore original shortcut arguments from backup |
| `npm run restore` | `node host/cli.mjs restore` | Cleanly strip skin and set `skinEnabled=false` |

Additional direct CLI commands: `node host/cli.mjs preset <crisp|crystal|islands|focus|eco>` and `node host/cli.mjs create-shortcut [--port 9339]`.

---

### 6. Troubleshooting

- **Standby (`cdpReachable: false`) or Live Picker reports no reachable host window**
  - Ensure Antigravity was launched with `--remote-debugging-port` by clicking **Enable Normal Shortcut Auto-Load** in **Host & System** (or running `npm run enable-autostart`), then restart Antigravity once. Prism intentionally avoids probing shared port `9222` on cold boot unless configured.
- **Why are chat bubbles, turn cards, and host controls unblurred by default?**
  - `v2.4.0` keeps `userBubble`, `assistantBubble`, `codeBlock`, `controls`, and `card` at **`No Blur` (`style: 'none'`, `blur: 0`)** by default for crisp readability. Switch any region to **`Frosted`** or **`Crystal`** in **Prism Skin**, **Visual Editor**, or **Quick Prism (`Ctrl+Alt+W`)** (dragging blur `> 0px` auto-promotes to `Frosted`), or select the **`Crystal` / `Islands`** scene presets.
- **4K60 / large video wallpapers, unmuting, or static poster fallback**
  - Large/long muted videos (`>= 100 MiB` or `>= 90s`) use Priority 0 `/mse-fmp4/` byte-aware streaming (`48–80 MiB` lead/eviction window + non-blanking loop remount, requires `ffmpeg` on `PATH`); unmuting seamlessly remounts to an audio-capable stream (`plugin://` / `fetch+blob`); when `ffmpeg` is absent, Prism uses `MAX_BLOB_MEDIA_BYTES = Infinity` direct playback or falls back smoothly to a static poster (`404`/`403`/`410` stay Fail-Open).
- **Multi-window / stale Sidecar / plugin not loading on Windows**
  - Never symlink or NTFS-junction the plugin directory on Windows; use `node scripts/install-local.mjs` or extract a real folder. PR `#11` fences superseded Sidecar instances and auto-exits orphans, and `MAX_CONCURRENT_STREAM_PROXIES = 4` prevents multi-window pool contention; run `npm run status` to inspect live health.
- **Instant native appearance recovery / Boot Canary tripped**
  - Press **`Ctrl+Alt+Shift+R`** or **`4× Esc`** anytime, toggle off from Studio / Quick Prism, or run `npm run restore` / `npm run reset-canary`.
- **Coexistence with `Antigravity-Chinese-Localization`**
  - Both the skin and 12-region Live Region Picker rely strictly on structural DOM selectors and `<html>`-only state attributes (`0` `<body>` mutations, `0` text/`aria-label` selectors), preventing translation interference.

---

### 7. Acknowledgments & Contributors

- **Special thanks to [`@zmzwynzj`](https://github.com/zmzwynzj)**:
  - Contributed **PR `#11`** (`fix(sidecar,cdp): fence superseded sidecar instances and exit when orphaned`, merged in `88a6a0a`), eliminating SSE hijack loops by superseded Sidecars and ensuring orphaned instances exit cleanly.
  - Contributed **PR `#12`** (`fix: stabilize large/4K60 HEVC video streaming, scene HD .tex & web adaptation, and narrow Studio scroll`, merged in `235df43`), adding Priority 0 large-video MSE routing, HEVC initial PTS alignment, zero-dep Scene HD `.tex` decoding (`PNG/JPEG/WebP/RGBA8888/DXT1/3/5`), `web` wallpaper shims, and `<840px` unified Studio scrolling.
  - Contributed **PR `#13`** (`fix(host): prevent high-bitrate 4K60 MSE QuotaExceededError black flash and blanking loop remount`, merged in `4e918fb`), delivering byte-aware 4K60 MSE backpressure/eviction, startup/paused `QuotaExceededError` recovery without poster flashes, and non-blanking loop remount.
  - Previously contributed **PR `#3`** (`12a00a3`), **PR `#5`** (`a949f96`), **PR `#6`** (`be354e7`), **PR `#7`** (`0c67d36` / `fa1f877`), **PR `#8`** (`00521cc`), and **PR `#9`** (`f298c8d`), driving major improvements across media streaming, data migration, and CDP stability.
- **Thanks to [`@yuezhu114`](https://github.com/yuezhu114)** for Issue `#10`, motivating zero-jitter optical presets and `.agy-prism-blur-veil`.
- **Thanks to `@CarbonAnime`** for PR `#2` (`e382b23`), adding early Antigravity `2.34.0` layout support.
- **Design & Parity Lineage**: [`RMvdesi/obsidian-prism`](https://github.com/RMvdesi/obsidian-prism), [`damiankorcz/Prism-Theme`](https://github.com/damiankorcz/Prism-Theme), and [`elysia395/dsh-wallpaper-engine`](https://github.com/elysia395/dsh-wallpaper-engine).

[⬆ Back to Top](#wallpaper-prism-agy-wallpaper-prism)
