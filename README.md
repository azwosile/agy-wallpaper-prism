# Wallpaper Prism (`agy-wallpaper-prism`)

> **Repository**: [https://github.com/azwosile/agy-wallpaper-prism](https://github.com/azwosile/agy-wallpaper-prism)  
> **Version**: `2.1.0` · **Zero Agent Tokens** · **Zero `app.asar` Modification**

**Obsidian Prism Glass Skin & Wallpaper Engine Studio for Google Antigravity**  
**适用于 Google Antigravity 的棱镜液态玻璃皮肤与动态壁纸工作台**

---

## Highlights · 核心特性

- **What's New in `v2.1.0` (Subsuming `v2.0.9` WIP · Issue `#10` · PR `#8` & `#9`)**:
  - **Zero-Jitter Optical Presets & Edge-Clamped Blur Veil (Issue `#10`)**: All 4 optical scene presets (`crystal`, `islands`, `focus`, `eco`) are cleanly decoupled from layout geometry (`layoutMode`/`islandGap`/`workspacePad`/`cornerStyle` preserved on switch, `fpsCap: 60` restored leaving `eco`); wallpaper blur renders via edge-clamped `.agy-prism-blur-veil` (Host) & `.mini-blur-veil` (Studio) with `0.00%` transform scale jump; `D2` `[data-browser-hole]` `ResizeObserver` target-identity deduplication eliminates reflow churn.
  - **Empty-Home Welcome Watermark Hide (`hideWelcomeLogo`)**: Optional pure-CSS toggle (`default: false`) hides Antigravity's centered welcome logo/watermark across empty-home & new-chat panes without DOM removal or fragile text matching.
  - **Antigravity `2.35.1` Compact Text-Only Topbar Pills (`topbarStyle`)**: Default `pills` mode wraps only active topbar menu/title clusters in compact rounded floating pills (`#agy-prism-topbar-pills`) with a transparent empty center, dynamic WCO pill geometry, non-clipping `P$c` dropdowns, `D18` `z-index` layering (`0 < 45`), and optional classic full-width `bar` mode.
  - **`0..64px` Macro/Nested Glass Blur & 7-Component Per-Surface Glass (`surfaceTints`)**: Widened `0..64px` blur range with 5 quick-stop chips (`0/8/18/36/56px`), two-tier `buildBackdrop` (macro `180%/190%` vs. nested `<= 115%` saturate cap), `60ms` leading+trailing drag throttle, and independent per-surface opacity, hex tint & luminance tone controls across **7 components** (`topbar`, `sidebar`, `workspace`, `rightPane`, `composer`, `card`, `popover`) backed by a 4-stage WCAG AA `>= 4.5:1` contrast engine, true Auto-follow (`resolveComponentDefaultAlpha`), bidirectional `sidebarOpacity` sync, and atomic Reset All.
  - **Hardened 1-Click Self-Updater & Loopback Security (`D1`)**: Built-in GitHub Release update checker (`6h` TTL + ETag `304` + rate-limit fallback) and 1-click installer (`/api/update/status`, `/api/update/apply`, `/api/healthz` reconnect polling) using pure-Node `tar-safe.mjs` (Zip-Slip/symlink/Windows-reserved/case-collision rejection + fail-closed `.sha256` verification + atomic rollback & `.git` dev-checkout protection), paired with a global loopback `Host` DNS-rebinding guard (`403`) and always-on 256-bit `X-Sidecar-Token` authentication (`0o600` `server_info.json`).
  - **PR `#8` & PR `#9` Hardened Reliability + `Antigravity-Chinese-Localization` Coexistence**: `1500ms` lazy `#agy-prism-pill` footer-remount keep-alive (`6090 B / 6144 B` micro-bootstrap), `350ms` `plugin://` `HEAD` probe with `alivePluginOrigins` & bounded TTL `deadPluginOrigins`, live-SSE `wake()` fast path, `window.__agyDomTranslatorInitialized = true` preload/iframe guards, non-`<body>` `agy-prism-*` classes, and bilingual `^`-anchored hub/`反重力` shortcut detection.
  - **Deterministic Pure-LF Build & Automated GitHub Releases**: Zero-dependency deterministic `zero-dep-inline` pure-LF bundler (`node scripts/build.mjs`), reproducible 3-artifact release packager (`npm run pack:release` -> `dist/agy-wallpaper-prism-v2.1.0.{tar.gz,tar.gz.sha256,zip}`), and automated `.github/workflows/release.yml` CI release pipeline.
- **Obsidian Prism Optical UI & 6-Tier Glass Skin (`--prism-*`)**:
  - **Floating Islands (`islands`)** vs. **Flush Integrated (`flush`)** workbench layouts with configurable island gaps, concentric corner radii (`Sharp` / `Balanced` / `Soft`), `1px` specular top rims, and `172°` optical sheen.
  - **8 Paired Light/Dark Color Schemes** (`Prism Default`, `Warm Carbon`, `Catppuccin`, `Nord`, `Rosé Pine`, `Tokyo Night`, `Gruvbox`, `Antigravity Native`) + **32×32 Chroma Dynamic Wallpaper Accent** extraction.
  - Built-in WCAG readability guardrails (`glassFidelity`, 3-tier `codeReadabilityMode` for code/diffs/terminals, `::before` `backdrop-filter` carriers that never trap `position: fixed`, rounded frosted `#agy-prism-wco-pill` Windows caption pill with `contextMeterAPI.syncOverlay` hijack guard, deeper rounded frosted `Projects` sticky header & `[data-testid="project-header"]` folder capsules, split `workspace` & `rightPane` `::before` carriers, high-contrast inverted `.text-background` Voice CTA badges, dimmed blurred image preview lightboxes, sidebar hover-action optical `mask-image` title fade + frosted button micro-pills, and `96%` solid popovers/menus/dialogs).
- **Steam Workshop & Local Multi-Format Media Pipeline**:
  - Automatic **Steam & Wallpaper Engine (`431960`)** Workshop + `defaultprojects` / `myprojects` + recursive 4-level `customFolders` discovery with `<15ms` cold-boot disk cache (`inventory-index.json`, `steam-roots.json`), on-demand FFmpeg local video thumbnails, and strict path-traversal containment.
  - Supports **Static Images**, **Multi-Image Slideshows**, **Looping Videos (`.mp4/.webm/.mov/.mkv` with cached virtual `moov` faststart, HTTP `206` Range, 3-tier cross-scheme `https:` streaming via privileged `plugin://` `/media-proxy/` `206` proxy [`350ms` `HEAD` + `alivePluginOrigins` + bounded TTL `deadPluginOrigins`] + `MediaSource` `/mse-fmp4/` zero-transcode `ffmpeg -c:v copy` fragmented streaming with rolling `<32 MiB` eviction for `971 MB+` / `>256 MiB` videos + `0ms fetch+blob` zero-stall loading for images, slideshows, accent extraction, thumbnails & poster fallback, cross-origin OOPIF `/video-stage/` Web Audio `GainNode` audio-clock routing with automatic monotonic video-clock fallback, `rVFC` anti-occlusion keep-alive & `900ms` anti-jank watchdog)**, **Interactive HTML/Web Wallpapers** (sandboxed with WE API shim & Focus Guard), and **`scene.pkg` Wallpapers** (cached `PKGV` + `LZ4` + `TEXB0004` embedded MP4/audio extraction & Aurora fallback).
  - **Playlists, Live Studio SSE Sync, Paginated Quick Popover & Smart Power Lifecycle**: `sequence` / `random` rotation on timer or `videoEnd`, real-time Studio `/api/events` SSE synchronization across `Ctrl+Alt+W` Quick Prism Popover & CLI updates (with `0x0` collapsed-iframe visibility guards & server-side `MAX_STUDIO_SSE = 2` / `MAX_HOST_SSE = 2` eviction preventing Chromium HTTP/1.1 6-socket pool starvation), `Local` source filter & 90-item `Load More` pagination, 7 GPU switch transitions, `512 MB` SHA-256 deduplicated drag-and-drop uploads, and auto-pause on minimize (`1.2s` debounce), blur, or battery.
- **Gentle Fail-Open CDP, Antigravity `2.34.0`/`2.35.1` `[data-browser-hole]` GPU Cutout, 3-Point 1-Click Master Toggle & Boot Canary**:
  - **Zero-Enable Ephemeral CDP & Lazy Quick Popover**: Zero `Page.enable`, `Runtime.enable`, `addScriptToEvaluateOnNewDocument`, or `addBinding`; 1-shot post-hydration idle bootstrap (`1.5s` default settle, `6090 B / 6144 B` cap) with lazy `Ctrl+Alt+W` `panel.js` loading and `z-index: -1` inert fail-open stage (*first-frame decoded before surface hollowing*).
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
├── plugin.json                     # Official 10-key Antigravity plugin manifest (v2.1.0)
├── package.json                    # Node >=22 ESM package & build/pack/install/CLI scripts
├── assets/logo.svg                 # Faceted Prism diamond vector icon
├── skills/wallpaper-prism/SKILL.md # On-demand agent navigation & CLI skill
├── .github/workflows/release.yml   # Automated CI verification & 3-artifact GitHub Release workflow
├── src/
│   ├── shared/                     # Canonical config schema (7-comp surfaceTints, 8 schemes), SemVer 2.0.0 (semver.mjs) & zh/en i18n
│   ├── engine/                     # Steam/WE scanner, MP4 faststart VFS, PKGV/LZ4 Scene parser, 206 + /mse-fmp4/ server, tar-safe.mjs & updater.mjs
│   ├── host/                       # Self-healing Hub/Workbench skin kernel (2.34.0/2.35.1) + Ctrl+Alt+W Quick Prism Popover & 1-click toggle
│   └── studio-ui/                  # Obsidian Prism Style-Settings Studio UI (bundled into pure-LF index.html)
├── sidecars/prism_studio/          # Authoritative Sidecar HTTP server + plugin:// 206 proxy + /api/update/* + /api/healthz + Passive CDP Bridge
├── host/cli.mjs                    # Safe thin CLI (status | wake | reset-canary | enable-autostart | disable-autostart | preset | restore | create-shortcut)
├── scripts/                        # Deterministic build.mjs + real-file install-local.mjs + 3-artifact pack-release.mjs
└── test/verify-all.mjs             # 3-suite automated Manifest/Engine/Updater/Bundle & Headless Chrome E2E verification harness
```
