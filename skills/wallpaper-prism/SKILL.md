---
name: wallpaper-prism
description: Open and control the Wallpaper Prism sidecar studio, Obsidian Prism floating-island or flush glass workbench skin, Quick Prism in-host popover (Ctrl+Alt+W), and Steam Wallpaper Engine / local wallpaper library. Use when the user asks to open Wallpaper Prism, change wallpapers or glass presets, inspect CDP host status, check for updates, or restore Antigravity's native appearance.
---

# Wallpaper Prism (`agy-wallpaper-prism`)

`agy-wallpaper-prism` (`v2.1.0`) brings `dsh-plugin-wallpaper-engine` media parity and `obsidian-prism` layered acrylic aesthetics to Google Antigravity with **zero Agent context/token overhead** and **zero modifications to `app.asar`**.

---

## 1. Opening the Wallpaper Prism Studio Pane

Whenever the user asks to browse wallpapers, adjust Prism glass settings, manage playlists, check for updates, or configure host connection settings, surface a clickable `sidecar://` pill so they can toggle the Studio pane in one click:

- [Wallpaper Prism](sidecar://agy-wallpaper-prism/prism_studio/)

To let the user enable, disable, or manage the plugin bundle itself on Antigravity's Customizations page, emit:

- [Wallpaper Prism](customization://agy-wallpaper-prism)

---

## 2. Two Complementary Surfaces

1. **Sidecar Studio (`sidecar://agy-wallpaper-prism/prism_studio/`)**:
   - Works immediately out-of-the-box in the right-hand Auxiliary Pane even when Antigravity was launched without `--remote-debugging-port`.
   - Features a **21:9 Live Workbench Island Preview** (zero-jitter `.mini-blur-veil` + `0.85×` blur preview), virtualized **Steam Workshop `431960` + Local Library** browser, drag-and-drop `512 MB` uploads (SHA-256 deduplicated), playlists (`sequence` / `random`, timer or `videoEnd`), **8 paired Light/Dark color schemes**, **Dynamic Wallpaper Accent** extraction, **Floating Islands vs. Flush** layout geometry, **`0..64px` macro/nested glass blur**, **7-component per-surface glass opacity, tint & tone (`surfaceTints`)** with WCAG AA `>= 4.5:1` readability guardrails, **`hideWelcomeLogo`** empty-home watermark toggle, Antigravity `2.35.1` **`topbarStyle`** (`pills` compact floating pills vs. `bar`), **3-way startup strategy (`gentle-auto` 1.5s / `manual` / `static-css`) + Boot Canary**, and a **1-click secure GitHub Release self-updater** (SHA-256 + safe tar validation + atomic rollback) in the topbar banner and **Host & System** tab.
2. **Whole-Window Prism Glass Skin + Quick Prism Popover (`Ctrl+Alt+W`)**:
   - Attaches via Zero-Enable Ephemeral CDP (`DevToolsActivePort` or `127.0.0.1:9339`, zero persistent Inspector domains) when Antigravity runs with `--remote-debugging-port=9339`.
   - Injects `#agy-prism-stage` (`z-index: -1` inert fail-open stage with edge-clamped `.agy-prism-blur-veil`, virtual `moov` faststart, privileged host media proxy / `MediaSource` `/mse-fmp4/` / `0ms fetch+blob` streaming, sandboxed `web` & `scene.pkg` extractors, and `[data-browser-hole]` GPU cutout), `#agy-prism-css` (6-tier `--prism-*` + 7-component `--prism-surface-*` tokens beating `body.dark` specificity `0,1,1`), and lazy `#agy-prism-popover` (`Ctrl+Alt+W`, persistent `◆ Prism` composer-footer pill, or corner glass orb).
   - Supports **3-point 1-click master enable/disable** (Studio topbar switch, `Ctrl+Alt+W` popover topbar switch, or `Shift+Click` / middle-click on `#agy-prism-pill`), optical scene presets decoupled from layout geometry, and instant emergency strip via **`Ctrl+Alt+Shift+R`** or **`4× Esc`**.

---

## 3. Safe CLI Diagnostics & Controls (`host/cli.mjs`)

The thin CLI (`v2.1.0`) communicates safely with the running Sidecar API (authenticated via `X-Sidecar-Token` from `server_info.json`, or atomic offline `config.json`) and **never kills or restarts Antigravity**:

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

> **Safety Rule for Agents**: Never kill or relaunch `Antigravity.exe`, never edit `~/.gemini/config/config.json`, and never touch `app.asar`. Because `sidecars/prism_studio/sidecar.json` runs with gentle `"restart_policy": "on-failure"`, Antigravity manages the Sidecar cleanly without crash-looping and restores `config.json` from `ANTIGRAVITY_EXECUTABLE_DATA_DIR` (or `~/.gemini/antigravity/sidecar_data/agy-wallpaper-prism/prism_studio/data`; legacy `~/.agy-wallpaper-prism` is migrated non-destructively on first v2 boot) under the configured startup mode (`gentle-auto` 1.5s settle, `manual`, or `static-css`). Users can also toggle skin on/off in 1 click from the Studio topbar, `Ctrl+Alt+W` popover, or `Shift+Click` / middle-click on `#agy-prism-pill`, or strip immediately via `Ctrl+Alt+Shift+R` / `4× Esc`. If `cdpReachable` is `false`, enable Normal Shortcut Auto-Load via `enable-autostart` or guide the user to click **Enable Normal Shortcut Auto-Load** in the Studio pane's **Host & System** tab — zero interruption to the current session!
