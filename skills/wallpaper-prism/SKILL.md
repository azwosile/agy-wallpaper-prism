---
name: wallpaper-prism
description: Open and control the Wallpaper Prism sidecar studio, Obsidian Prism floating-island or flush glass workbench skin, Quick Prism in-host popover (Ctrl+Alt+W), Dual-Form Visual Region Editor, CDP Live Host Region Picker, and Steam Wallpaper Engine / local wallpaper library. Use when the user asks to open Wallpaper Prism, change wallpapers or glass presets, inspect or customize live Antigravity UI regions or sidebar styles, check CDP host status, update the plugin, or restore Antigravity's native appearance.
---

# Wallpaper Prism (`agy-wallpaper-prism`)

`agy-wallpaper-prism` (`v2.3.0`) brings `dsh-plugin-wallpaper-engine` media parity and `obsidian-prism` layered acrylic aesthetics to Google Antigravity with **zero Agent context/token overhead** and **zero modifications to `app.asar`**.

---

## 1. Opening the Wallpaper Prism Studio Pane

Whenever the user asks to browse wallpapers, adjust Prism glass settings, open the visual region editor, pick a live host region, manage snapshots or playlists, check for updates, or configure host connection settings, surface a clickable `sidecar://` pill so they can toggle the Studio pane in one click:

- [Wallpaper Prism](sidecar://agy-wallpaper-prism/prism_studio/)

To let the user enable, disable, or manage the plugin bundle itself on Antigravity's Customizations page, emit:

- [Wallpaper Prism](customization://agy-wallpaper-prism)

---

## 2. Two Complementary Surfaces

1. **Sidecar Studio (`sidecar://agy-wallpaper-prism/prism_studio/`)**:
   - Works immediately out-of-the-box in the right-hand Auxiliary Pane even when Antigravity was launched without `--remote-debugging-port`.
   - Features a **static-first 21:9 Workbench Preview** (`previewLiveMedia: false` default for low CPU/GPU usage with a 1-click HUD live-media toggle that never pauses the host wallpaper, plus a native-appearance disabled overlay when Prism skin is turned off) and **Layer B Cold-Start Dormancy** (`COLD_DORMANT` in hidden `0×0` panes with zero network/SSE/video activity, `SOFT_SLEEP`, and `T+5s` `DEEP_SLEEP` preserving unsaved drafts).
   - Provides a virtualized **Steam Workshop `431960` + Local Library** (`30`-item threshold, static-first `/preview/<token>?static=1` thumbnails with `hover` animation and offscreen `<canvas>` fallback), `512 MB` SHA-256 deduplicated drag-and-drop uploads, playlists (`sequence` / `random`, timer or `videoEnd`), **8 paired Light/Dark color schemes**, and **Dynamic Wallpaper Accent** extraction.
   - Organizes **Prism Skin** with a **deduplicated minimal widescreen left rail** (`>=840px`), **8 collapsed-by-default region accordions** (`topbar`, `wco`, `sidebar`, `workspace`, `card`, `composer`, `rightPane`, `popover`) supporting independent `workspace`/`rightPane`/`wco` blur & opacity, opacity-linked borders/sheen (`0%` fade-out), **4 pure-CSS sidebar styles** (`capsule`, `underline`, `accordion`, `tree`) with balanced `11..15px` typography, **`hideWelcomeLogo`**, Antigravity `2.35.1` **`topbarStyle`** (`pills` vs. `bar`), **silent autosave** (`keepalive` flush, zero success toast), **independent named profile snapshots** (`save`, `overwrite`, `rename`, `duplicate`, optional wallpaper binding), and the **Dual-Form Visual Region Editor** (in-sidebar zoom/pan modal + standalone browser Popout IDE `/?mode=visual-editor` via strict `POST /api/studio/popout`, 11-property inspector, 8 CJK-safe font presets, opposite-anchor WCAG AA `>= 4.5:1` guardrails with 1-click raw color unlock).
   - **Phase 2 CDP Live Host Region Picker (`v2.3.0`)**: Clicking **`🎯 Pick Live Host Region`** (`🎯 拾取真实界面区域`) calls strict `POST /api/inspector/pick` -> `cdp-bridge.mjs :: startInspectorPick` -> on-demand `evaluateTargetEphemeral` mounting `GET /host/<capToken>/inspector.js` (`src/host/inspector-inject.js`, **`0 B` added to `buildHostMicroBootstrap <= 6,144 B`**). Users hover-highlight and click any of the 8 structural UI regions directly in the live Antigravity window (`live`, `static-css`, `manual`, and `skinEnabled: false` all supported, zero text selectors, `<html>`-only `data-agy-prism-inspector="picking"`). Selected regions arrive via `/host/<capToken>/rpc` (`inspector.picked`, validated against `getValidRegionIdSet()`) and broadcast `inspector-picked` + `inspector-status` across both Aux Pane and Popout SSE channels to focus the inspector. Cancels cleanly via `POST /api/inspector/cancel`, `Esc` (handled before closing the Visual Editor modal), right-click, or `45s` timeout.
   - Includes **3-way startup strategy (`gentle-auto` 1.5s / `manual` / `static-css`) + Boot Canary**, **single-instance Sidecar ownership fencing & orphan exit** (`instanceId` atomic fencing in `server_info.json`, `/api/shutdown` takeover, `yieldOwnership` breaking `600ms` SSE reconnect hijack loops, `DEV_WATCH_ENABLED` production polling gate, and safe `process.exit(0)` under `restart_policy: "on-failure"`), and a **1-click secure GitHub Release self-updater** (SHA-256 + safe tar validation + atomic rollback) in **Host & System**.
2. **Whole-Window Prism Glass Skin + Quick Prism Popover (`Ctrl+Alt+W`)**:
   - Attaches via Zero-Enable Ephemeral CDP (`DevToolsActivePort` or `127.0.0.1:9339`, zero persistent Inspector domains) when Antigravity runs with `--remote-debugging-port=9339`.
   - Injects `#agy-prism-stage` (`z-index: -1` inert fail-open stage with `contain: layout style`, edge-clamped `.agy-prism-blur-veil`, `>28px` soft-knee blur `<= 32px`, Alpha-gated nested blur culling, virtual `moov` faststart, uncapped `MAX_BLOB_MEDIA_BYTES = Infinity` `fetch+blob` direct playback with `60s` timeout and automatic fallback to `MediaSource` `/mse-fmp4/` or static poster on non-404 errors while keeping `404`/`403`/`410` Fail-Open, privileged host media proxy `206` Range streaming, sandboxed `web` & `scene.pkg` extractors, and `[data-browser-hole]` GPU cutout), `#agy-prism-css` (8-region `--prism-*` tokens beating `body.dark` specificity `0,1,1`, flattened single-carrier Composer `#antigravity.agentSidePanelInputBox::before`, `wco` `z-index: 0` capsule, 4 pure-CSS sidebar styles, and 4-layer `Antigravity-Chinese-Localization` compatibility), and lazy `#agy-prism-popover` (`Ctrl+Alt+W`, `IntersectionObserver` `?static=1` thumbnails, persistent `◆ Prism` composer-footer pill, or corner glass orb).
   - Supports **3-point 1-click master enable/disable** via non-destructive soft-disable (`<50ms` instant re-enable without reloading `/stage.js` from Studio topbar switch, `Ctrl+Alt+W` popover topbar switch, or `Shift+Click` / middle-click on `#agy-prism-pill`), optical scene presets decoupled from layout geometry, and instant emergency strip via **`Ctrl+Alt+Shift+R`** or **`4× Esc`**.

---

## 3. Safe CLI Diagnostics & Controls (`host/cli.mjs`)

The thin CLI (`v2.3.0`) communicates safely with the running Sidecar API (authenticated via `X-Sidecar-Token` from `server_info.json`, or atomic offline `config.json`) and **never kills or restarts Antigravity**:

```powershell
# Inspect Sidecar, library, canary, and CDP host connection status (read-only)
node "<plugin-dir>/host/cli.mjs" status

# Gently wake and mount the Prism skin via Sidecar (forces a fresh host probe)
node "<plugin-dir>/host/cli.mjs" wake

# Clear Boot Canary Safe Mode ("tripped") and re-enable skin cleanly
node "<plugin-dir>/host/cli.mjs" reset-canary

# Switch optical scene preset (crystal | islands | focus | eco — preserves user layout geometry)
node "<plugin-dir>/host/cli.mjs" preset islands

# Restore native host appearance cleanly (sets skinEnabled=false, never auto-reinjects)
node "<plugin-dir>/host/cli.mjs" restore

# Enable seamless Normal Shortcut Auto-Load in-place (backs up original .lnk args, zero restart now)
node "<plugin-dir>/host/cli.mjs" enable-autostart --port 9339

# Losslessly restore stock normal shortcut arguments from backup
node "<plugin-dir>/host/cli.mjs" disable-autostart

# Create a separate user Desktop shortcut with --remote-debugging-port=9339
node "<plugin-dir>/host/cli.mjs" create-shortcut --port 9339
```

> **Safety Rule for Agents**: Never kill or relaunch `Antigravity.exe`, never edit `~/.gemini/config/config.json`, and never touch `app.asar`. Because `sidecars/prism_studio/sidecar.json` runs with gentle `"restart_policy": "on-failure"`, Antigravity manages the Sidecar cleanly without crash-looping, superseded/orphaned instances exit cleanly with status `0`, and `config.json` is stored in `ANTIGRAVITY_EXECUTABLE_DATA_DIR` (or `~/.gemini/antigravity/sidecar_data/agy-wallpaper-prism/prism_studio/data`; legacy `~/.agy-wallpaper-prism` is migrated non-destructively on first v2 boot) under the configured startup mode (`gentle-auto` 1.5s settle, `manual`, or `static-css`). Users can also toggle skin on/off in 1 click from the Studio topbar, `Ctrl+Alt+W` popover, or `Shift+Click` / middle-click on `#agy-prism-pill`, or strip immediately via `Ctrl+Alt+Shift+R` / `4× Esc`. If `cdpReachable` is `false`, enable Normal Shortcut Auto-Load via `enable-autostart` or guide the user to click **Enable Normal Shortcut Auto-Load** in the Studio pane's **Host & System** tab — zero interruption to the current session!
