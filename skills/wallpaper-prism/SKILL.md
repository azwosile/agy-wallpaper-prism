---
name: wallpaper-prism
description: Open and control the Wallpaper Prism sidecar studio, Obsidian Prism floating-island or flush glass workbench skin, Quick Prism in-host popover (Ctrl+Alt+W), and Steam Wallpaper Engine / local wallpaper library. Use when the user asks to open Wallpaper Prism, change wallpapers or glass presets, inspect CDP host status, or restore Antigravity's native appearance.
---

# Wallpaper Prism (`agy-wallpaper-prism`)

`agy-wallpaper-prism` brings full `dsh-plugin-wallpaper-engine` parity and `obsidian-prism` layered acrylic aesthetics to Google Antigravity with **zero Agent context/token overhead** and **zero modifications to `app.asar`**.

---

## 1. Opening the Wallpaper Prism Studio Pane

Whenever the user asks to browse wallpapers, adjust Prism glass settings, manage playlists, or configure host connection settings, surface a clickable `sidecar://` pill so they can toggle the Studio pane in one click:

- [Wallpaper Prism](sidecar://agy-wallpaper-prism/prism_studio/)

To let the user enable, disable, or manage the plugin bundle itself on Antigravity's Customizations page, emit:

- [Wallpaper Prism](customization://agy-wallpaper-prism)

---

## 2. Two Complementary Surfaces

1. **Sidecar Studio (`sidecar://agy-wallpaper-prism/prism_studio/`)**:
   - Works immediately out-of-the-box in the right-hand Auxiliary Pane even when Antigravity was launched without `--remote-debugging-port`.
   - Features a **21:9 Live Workbench Island Preview**, virtualized **Steam Workshop `431960` + Local Library** browser, drag-and-drop `512 MB` uploads (SHA-256 deduplicated), playlists (`sequence` / `random`, timer or `videoEnd`), **8 paired Light/Dark color schemes**, **Dynamic Wallpaper Accent** extraction, **Floating Islands vs. Flush** layout geometry, and **Host & System** diagnostics.
2. **Whole-Window Prism Glass Skin + Quick Prism Popover (`Ctrl+Alt+W`)**:
   - Passively attaches over loopback Chrome DevTools Protocol (`DevToolsActivePort` or `127.0.0.1:9339`) when Antigravity runs with `--remote-debugging-port=9339`.
   - Injects `#agy-prism-stage` (`image`, `slideshow`, `video` with virtual `moov` faststart, sandboxed `web` & `scene.pkg` extractors), `#agy-prism-css` (6-tier `--prism-*` tokens beating `body.dark` specificity `0,1,1`), and `#agy-prism-popover` (`Ctrl+Alt+W`, composer-footer `◆ Prism` pill, or corner glass orb).

---

## 3. Safe CLI Diagnostics & Controls (`host/cli.mjs`)

The thin CLI communicates safely with the running Sidecar API (or local config store) and **never kills or restarts Antigravity**:

```powershell
# Inspect Sidecar, library, and CDP host connection status (read-only)
node "<plugin-dir>/host/cli.mjs" status

# Switch optical scene preset (crystal | islands | focus | eco)
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

> **Safety Rule for Agents**: Never kill or relaunch `Antigravity.exe`, never edit `~/.gemini/config/config.json`, and never touch `app.asar`. Because `sidecars/prism_studio/sidecar.json` runs with `restart_policy: "always"`, Antigravity automatically boots the Sidecar in the background on every cold launch (even if the Aux Pane is never opened) and restores `~/.agy-wallpaper-prism/config.json` within `<500ms`. If `cdpReachable` is `false`, enable Normal Shortcut Auto-Load via `enable-autostart` or guide the user to click **Enable Normal Shortcut Auto-Load** in the Studio pane's **Host & System** tab — zero interruption to the current session!
