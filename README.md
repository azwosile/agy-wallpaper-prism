# Wallpaper Prism (`agy-wallpaper-prism`)

> **Repository**: [https://github.com/azwosile/agy-wallpaper-prism](https://github.com/azwosile/agy-wallpaper-prism)  
> **Version**: `2.2.0` · **Zero Agent Tokens** · **Zero `app.asar` Modification**

**Obsidian Prism Glass Skin & Wallpaper Engine Studio for Google Antigravity**  
**适用于 Google Antigravity 的棱镜液态玻璃皮肤与动态壁纸工作台**

---

## Highlights · 核心特性

- **What's New in `v2.2.0`**:
  - **Silent Autosave, Independent Named Snapshots & Soft-Disable Stability (`#1`, `#2`, `D4`)**: Smooth silent autosave (`POST /api/config` decoupled from blocking CDP pushes, `< 2 KB` `fetch(..., { keepalive: true })` flush on `pagehide`/`visibilitychange`, inline `#prism-autosave-indicator` with zero success toast spam) backed by 4-layer `(regionId, propKey)` deep merge and monotonic `stateRev` + Epoch tracking; independent named profile snapshots (`save`, `overwrite`, `rename`, `duplicate`, optional `includeWallpaper` binding, `perWallpaperOverrides` conflict sync, and `pointerDownInsideScroller` + surgical `#prism-presets-grid` updates eliminating swallowed clicks); non-destructive soft-disable via `teardownSkinDomOnly()` (`W[K].apply({ skinEnabled: 0 })` within the `<= 6,144 B` micro-bootstrap cap) for `<50ms` instant re-enable without reloading `/stage.js`, delayed `/stage.js` `window.__agyPrismOn === false` zombie-revival guard, and native disabled styling on Studio's 21:9 preview (`data-skin-enabled="false"`).
  - **Dynamic Wallpaper Liveness & Tier 1/2/3 Resource Optimization (`#8`, `#11`, `#12`, `D6`)**: Fixes sticky `eco` `paused: true` across `applyWallpaper` & all 7 `FACTORY_PRESETS`, tail-`moov` / HEVC / AV1 detection in `probeMseVideoMime`, `checkVideoLiveness` MSE `MediaSource` rebuild on buffer eviction, `web-shim.mjs` muted autoplay fallback, and `evaluateAutoPause` wake dispatch; defaults Studio 21:9 preview to static-first power saving (`previewLiveMedia: false` with HUD live toggle that never pauses the host wallpaper), serves `/preview/<token>?static=1` + `libraryAnimatedThumbs: 'hover'` (`180ms` debounce + offscreen `<canvas>` fallback), virtualizes libraries at `>= 30` items, uses `IntersectionObserver` lazy thumbnails in Quick Prism, and enforces Layer B cold-start dormancy (`COLD_DORMANT` `0` requests/SSE/timers/videos in `0×0` hidden iframes, `T+0ms` `SOFT_SLEEP`, `T+5000ms` `DEEP_SLEEP` preserving drafts, `<30ms` wake) alongside production `watchTimer` disablement, `30s` deferred scanning, `MAX_STUDIO_SSE = 4` (`2 aux + 2 popout`), Alpha-gated nested blur culling (`Project` unconditional, `Sticky >= 0.88`, `Composer >= 0.92`), `>28px` soft-knee blur capped `<= 32px`, `160×160` static noise tile replacing SVG `<feTurbulence>`, `MAX_BLOB_MEDIA_BYTES = 48 MiB`, bounded `mp4-vfs` pin LRU (`<= 8`), and Tier 3 low-GPU acrylic mode.
  - **Unified 8-Region Schema, Optical Independence, WCO & Single-Carrier Composer (`#3`, `#4`, `#5`, `#7`)**: Canonical 8-region `regions` schema (`topbar`, `wco`, `sidebar`, `workspace`, `card`, `composer`, `rightPane`, `popover`) with independent `workspace` vs. `rightPane` blur (`--prism-right-pane-backdrop`), independent `wco` opacity/blur (Auto inherits `topbar`, `D18` `z-index: 0`), opacity-linked `borderOpacity`/`borderColor`/sheen/shadow fading cleanly to `0%` across all 16 surfaces (including `GLASS_CARRIER_MAIN_PAGES` and `flush` `::after` borders), and 4-layer Composer flattening onto `#antigravity.agentSidePanelInputBox::before` while preserving attachment chip borders.
  - **4 Pure-CSS Sidebar Styles, Balanced Typography & CN L10n Compatibility (`#6`, `#9`, `#10`, `#15`, `D5`)**: Keeps `capsule` default and adds `underline`, `accordion`, and `tree` as 100% pure-CSS presets (`data-prism-sidebar-style`, `0` DOM mutations, live & `static-css` parity), balanced typography hierarchy (`11..15px`), `18×18px` normalized section buttons, and 4-layer coexistence with `Antigravity-Chinese-Localization` (`<html>`-only `data-prism-*` / `--prism-*`, `0` `<body>` mutations, `agy-prism-*` isolation classes, and `window.__agyDomTranslatorInitialized` guard).
  - **Minimal Left Rail, 8 Collapsed Accordions & Phase 1 Visual Region Editor (`#13`, `#14`, `D2`, `D3`, `D7`, `D8`)**: Deduplicated widescreen (`>=840px`) minimal left rail (`0` duplicate optical sliders), 8-region appearance accordions collapsed by default with persistent `localStorage` state, 4 newly exposed schema controls (`floaterSolidBase`, `scrimColor`, `fxClickMode`, `fxTrailMode`), and Dual-Form Visual Region Editor (full-height in-sidebar zoom/pan canvas modal + standalone browser Popout IDE `/?mode=visual-editor` via strict `POST /api/studio/popout` with `CSP: frame-ancestors 'none'`, zero URL `?token=`, `execFile` launch, and live `channel=popout` SSE sync), 11-property inspector, 8 CJK-safe font presets, and opposite-anchor `enforceFgContrastRgb` WCAG AA `>= 4.5:1` guardrail with 1-click `allowRawFontColor` unlock.
  - **Deterministic Modular Build & Automated GitHub Releases**: Modular `src/studio-ui/` DAG + CSS `@import` inliner compiled by `node scripts/build.mjs` into deterministic pure-LF `sidecars/prism_studio/index.html`, packaged into 3 reproducible artifacts (`npm run pack:release` -> `dist/agy-wallpaper-prism-v2.2.0.{tar.gz,tar.gz.sha256,zip}`), and verified by `.github/workflows/release.yml`.
- **Previous Highlights (`v2.1.0` Baseline)**:
  - **Zero-Jitter Optical Presets & Edge-Clamped Blur Veil (Issue `#10`)**: 4 optical scene presets (`crystal`, `islands`, `focus`, `eco`) decoupled from layout geometry, edge-clamped `.agy-prism-blur-veil` / `.mini-blur-veil`, `hideWelcomeLogo`, Antigravity `2.35.1` `topbarStyle` (`pills` vs. `bar`), `0..64px` blur range, 1-click GitHub Release self-updater with `tar-safe.mjs` verification & atomic rollback, loopback `Host` guard (`403`), `X-Sidecar-Token` (`0o600` `server_info.json`), and PR `#8` / `#9` keep-alive hardening.
- **Obsidian Prism Optical UI & 8-Region Glass Skin (`--prism-*`)**:
  - **Floating Islands (`islands`)** vs. **Flush Integrated (`flush`)** workbench layouts with configurable island gaps, concentric corner radii (`Sharp` / `Balanced` / `Soft`), `1px` specular top rims, and `172°` optical sheen.
  - **8 Paired Light/Dark Color Schemes** (`Prism Default`, `Warm Carbon`, `Catppuccin`, `Nord`, `Rosé Pine`, `Tokyo Night`, `Gruvbox`, `Antigravity Native`) + **32×32 Chroma Dynamic Wallpaper Accent** extraction.
  - Built-in WCAG readability guardrails (`glassFidelity`, 3-tier `codeReadabilityMode` for code/diffs/terminals, `::before` `backdrop-filter` carriers that never trap `position: fixed`, rounded frosted `#agy-prism-wco-pill` Windows caption pill with `contextMeterAPI.syncOverlay` hijack guard, deeper rounded frosted `Projects` sticky header & `[data-testid="project-header"]` folder capsules, split `workspace` & `rightPane` `::before` carriers, high-contrast inverted `.text-background` Voice CTA badges, dimmed blurred image preview lightboxes, sidebar hover-action optical `mask-image` title fade + frosted button micro-pills, and `96%` solid popovers/menus/dialogs).
- **Steam Workshop & Local Multi-Format Media Pipeline**:
  - Automatic **Steam & Wallpaper Engine (`431960`)** Workshop + `defaultprojects` / `myprojects` + recursive 4-level `customFolders` discovery with `<15ms` cold-boot disk cache (`inventory-index.json`, `steam-roots.json`), on-demand FFmpeg local video thumbnails, and strict path-traversal containment.
  - Supports **Static Images**, **Multi-Image Slideshows**, **Looping Videos (`.mp4/.webm/.mov/.mkv` with cached virtual `moov` faststart, HTTP `206` Range, 3-tier cross-scheme `https:` streaming via privileged host `/media-proxy/` `206` proxy [`350ms` `HEAD` + `alivePluginOrigins` + bounded TTL `deadPluginOrigins`] + `MediaSource` `/mse-fmp4/` zero-transcode `ffmpeg -c:v copy` fragmented streaming with rolling `<32 MiB` eviction + `0ms fetch+blob` loading for images, slideshows, accent extraction, thumbnails & poster fallback, cross-origin OOPIF `/video-stage/` Web Audio `GainNode` audio-clock routing with automatic monotonic video-clock fallback, `rVFC` anti-occlusion keep-alive & `900ms` anti-jank watchdog)**, **Interactive HTML/Web Wallpapers** (sandboxed with WE API shim & Focus Guard), and **`scene.pkg` Wallpapers** (cached `PKGV` + `LZ4` + `TEXB0004` embedded MP4/audio extraction & Aurora fallback).
  - **Playlists, Live Studio SSE Sync, Paginated Quick Popover & Smart Power Lifecycle**: `sequence` / `random` rotation on timer or `videoEnd`, real-time Studio `/api/events` SSE synchronization across `Ctrl+Alt+W` Quick Prism Popover & CLI updates (with `0×0` collapsed-iframe visibility guards & partitioned `MAX_STUDIO_SSE = 4` [`2 aux + 2 popout`] / `MAX_HOST_SSE = 2` eviction preventing Chromium HTTP/1.1 6-socket pool starvation), `Local` source filter & 90-item `Load More` pagination, 7 GPU switch transitions, `512 MB` SHA-256 deduplicated drag-and-drop uploads, and auto-pause on minimize (`1.2s` debounce), blur, or battery.
- **Gentle Fail-Open CDP, Antigravity `2.34.0`/`2.35.1` `[data-browser-hole]` GPU Cutout, 3-Point 1-Click Master Toggle & Boot Canary**:
  - **Zero-Enable Ephemeral CDP & Lazy Quick Popover**: Zero `Page.enable`, `Runtime.enable`, `addScriptToEvaluateOnNewDocument`, or `addBinding`; 1-shot post-hydration idle bootstrap (`1.5s` default settle, `<= 6,144 B` cap) with lazy `Ctrl+Alt+W` `panel.js` loading and `z-index: -1` inert fail-open stage (*first-frame decoded before surface hollowing*).
  - **3-Point 1-Click Master Enable/Disable Switch**: Toggle Prism skin & wallpaper anytime from (1) Studio topbar `#prism-master-toggle-btn`, (2) `Ctrl+Alt+W` Quick Popover topbar `[data-testid="prism-power-toggle"]`, or (3) persistent `#agy-prism-pill` (`Shift+Click` / middle-click, preserved in DOM with `data-skin-enabled="false"` when skin is disabled so 1-click re-enable stays reachable), powered by `POST /api/skin/toggle` & RPC `skin.toggle` with automatic `tripped` Boot Canary recovery and wake.
  - **Two-Phase `fsync` Boot Canary & Instant Escape Hatch**: Co-keyed `ANTIGRAVITY_EXECUTABLE_DATA_DIR` storage with non-destructive `~/.agy-wallpaper-prism` migration, automatic Safe-Mode circuit breaker on unfinished boots, 3 selectable startup modes (`Gentle Auto 1.5s` / `Manual Wake` / `Static CSS`), and **`Ctrl+Alt+Shift+R` / `4× Esc`** instant full strip.
  - **1-Click Normal Shortcut Auto-Load**: Enable in-place `--remote-debugging-port=9339` on your standard Desktop / Start Menu / Taskbar `Antigravity.lnk` (with lossless `shortcut-backup.json` restore) right inside the Studio UI — **zero session interruption**.

---

## Quick Start · 快速开始

```powershell
git clone https://github.com/azwosile/agy-wallpaper-prism.git
cd agy-wallpaper-prism

# 1. Bundle the single-file Studio UI (deterministic zero-dep-inline pure-LF build, zero npm install needed)
node scripts/build.mjs

# 2. Install into ~/.gemini/config/plugins/agy-wallpaper-prism (real file copy, no NTFS junctions)
node scripts/install-local.mjs

# 3. (Optional) Pack reproducible GitHub Release artifacts into dist/ (.tar.gz, .tar.gz.sha256, .zip)
npm run pack:release
```

1. **Open Studio Side Pane**: Click `[Wallpaper Prism](sidecar://agy-wallpaper-prism/prism_studio/)` in chat (or open **Auxiliary Pane -> `+` -> Plugins -> Wallpaper Prism**).
2. **Enable Normal-Shortcut Auto-Load (One-Time, Zero Restart Now)**:
   - Click **`⚡ 一键开启普通快捷方式自动加载（不中断当前对话）`** at the top of Wallpaper Prism (or in the **`宿主与系统` / `Host & System`** tab).
   - Every future launch from your normal `Antigravity` icon automatically loads your last-used wallpaper & Prism glass skin!
   - Press **`Ctrl+Alt+W`** (or click the subtle **`◆ Prism`** composer-footer pill; **`Shift+Click`** or **middle-click** the pill, or use the Studio / Quick Popover topbar switch for instant 1-click enable/disable) anywhere in Antigravity to summon the **Quick Prism Popover**.
3. **1-Click Updates (GitHub Releases)**:
   - Installed non-git releases check official GitHub Releases automatically (`6h` TTL) or on demand via **Host & System -> Check for Updates**, verify SHA-256 + safe tar invariants, apply atomically with rollback, and reconnect over `/api/healthz`. Release builds are published automatically by `.github/workflows/release.yml` on `v*.*.*` tags (or locally via `npm run pack:release`).

---

## Architecture · 架构概览

```text
agy-wallpaper-prism/
├── plugin.json                     # Official 10-key Antigravity plugin manifest (v2.2.0)
├── package.json                    # Node >=22 ESM package & build/pack/install/CLI scripts
├── assets/logo.svg                 # Faceted Prism diamond vector icon
├── skills/wallpaper-prism/SKILL.md # On-demand agent navigation & CLI skill
├── .github/workflows/release.yml   # Automated CI verification & 3-artifact GitHub Release workflow
├── src/
│   ├── shared/                     # Canonical config schema (8-region regions, 8 schemes), SemVer 2.0.0 (semver.mjs) & zh/en i18n
│   ├── engine/                     # Steam/WE scanner, MP4 faststart VFS, PKGV/LZ4 Scene parser, 206 + /mse-fmp4/ server, tar-safe.mjs & updater.mjs
│   ├── host/                       # Self-healing Hub/Workbench skin kernel (2.34.0/2.35.1, 4 sidebar styles) + Ctrl+Alt+W Quick Prism Popover
│   └── studio-ui/                  # Modular Obsidian Prism Studio UI & Dual-Form Visual Editor (bundled into pure-LF index.html)
├── sidecars/prism_studio/          # Authoritative Sidecar HTTP server + media proxy + popout IDE + /api/update/* + /api/healthz + Passive CDP Bridge
├── host/cli.mjs                    # Safe thin CLI (status | wake | reset-canary | enable-autostart | disable-autostart | preset | restore | create-shortcut)
├── scripts/                        # Deterministic build.mjs + real-file install-local.mjs + 3-artifact pack-release.mjs
└── test/verify-all.mjs             # 3-suite automated Manifest/Engine/Updater/Bundle & Headless Chrome E2E verification harness
```
