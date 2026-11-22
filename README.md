# Wallpaper Prism (`agy-wallpaper-prism`)

> **Repository**: [https://github.com/azwosile/agy-wallpaper-prism](https://github.com/azwosile/agy-wallpaper-prism)  
> **Version**: `1.1.0` · **Zero Agent Tokens** · **Zero `app.asar` Modification**

**Obsidian Prism Glass Skin & Wallpaper Engine Studio for Google Antigravity**  
**适用于 Google Antigravity 的棱镜液态玻璃皮肤与动态壁纸工作台**

---

## Highlights · 核心特性

- **Obsidian Prism Optical UI & 6-Tier Glass Skin (`--prism-*`)**:
  - **Floating Islands (`islands`)** vs. **Flush Integrated (`flush`)** workbench layouts with configurable island gaps, concentric corner radii (`Sharp` / `Balanced` / `Soft`), `1px` specular top rims, and `172°` optical sheen.
  - **8 Paired Light/Dark Color Schemes** (`Prism Default`, `Warm Carbon`, `Catppuccin`, `Nord`, `Rosé Pine`, `Tokyo Night`, `Gruvbox`, `Antigravity Native`) + **32×32 Chroma Dynamic Wallpaper Accent** extraction.
  - Built-in WCAG readability guardrails (`glassFidelity`, 3-tier `codeReadabilityMode` for code/diffs/terminals, `::before` `backdrop-filter` carriers that never trap `position: fixed`, and `96%` solid popovers/menus/dialogs).
- **100% `dsh-plugin-wallpaper-engine` Media & Library Parity**:
  - Automatic **Steam & Wallpaper Engine (`431960`)** Workshop + `defaultprojects` / `myprojects` discovery with `<15ms` cold-boot disk cache (`inventory-index.json`, `steam-roots.json`) and strict path-traversal containment.
  - Supports **Static Images**, **Multi-Image Slideshows**, **Looping Videos (`.mp4/.webm/.mov` with cached virtual `moov` faststart & HTTP `206` Range)**, **Interactive HTML/Web Wallpapers** (sandboxed with WE API shim & Focus Guard), and **`scene.pkg` Wallpapers** (cached `PKGV` + `LZ4` + `TEXB0004` embedded MP4/audio extraction & 5-stage fallback).
  - **Playlists & Smart Power Lifecycle**: `sequence` / `random` rotation on timer or `videoEnd`, 7 GPU switch transitions, `512 MB` SHA-256 deduplicated drag-and-drop uploads, and auto-pause on minimize (`1.2s` debounce), blur, or battery.
- **Normal-Shortcut Auto-Load & Cold-Boot Restoration (`v1.1.0`)**:
  - **Zero-Spawn Cold Boot**: Antigravity automatically boots `sidecars/prism_studio/main.mjs` (`restart_policy: "always"`) in the background on every launch and restores your last-used wallpaper, Prism scheme, and layout from `~/.agy-wallpaper-prism/config.json` with zero child-process spawns.
  - **1-Click Normal Shortcut Auto-Load**: Enable in-place `--remote-debugging-port=9339` on your standard Desktop / Start Menu / Taskbar `Antigravity.lnk` (with lossless `shortcut-backup.json` restore) right inside the Studio UI — **zero session interruption**.

---

## Quick Start · 快速开始

```powershell
git clone https://github.com/azwosile/agy-wallpaper-prism.git
cd agy-wallpaper-prism

# 1. Bundle the single-file Studio UI (offline-capable, zero npm install needed)
node scripts/build.mjs

# 2. Install into ~/.gemini/config/plugins/agy-wallpaper-prism (real file copy, no NTFS junctions)
node scripts/install-local.mjs
```

1. **Open Studio Side Pane**: Click `[Wallpaper Prism](sidecar://agy-wallpaper-prism/prism_studio/)` in chat (or open **Auxiliary Pane -> `+` -> Plugins -> Wallpaper Prism**).
2. **Enable Normal-Shortcut Auto-Load (One-Time, Zero Restart Now)**:
   - Click **`⚡ 一键开启普通快捷方式自动加载（不中断当前对话）`** at the top of Wallpaper Prism (or in the **`宿主与系统` / `Host & System`** tab).
   - Every future launch from your normal `Antigravity` icon automatically loads your last-used wallpaper & Prism glass skin!
   - Press **`Ctrl+Alt+W`** (or click the subtle **`◆ Prism`** composer-footer pill) anywhere in Antigravity to summon the **Quick Prism Popover**.

---

## Architecture · 架构概览

```text
agy-wallpaper-prism/
├── plugin.json                     # Official 10-key Antigravity plugin manifest (v1.1.0)
├── assets/logo.svg                 # Faceted Prism diamond vector icon
├── skills/wallpaper-prism/SKILL.md # On-demand agent navigation & CLI skill
├── src/
│   ├── shared/                     # Canonical config schema, 8 schemes, presets & zh/en i18n
│   ├── engine/                     # Steam/WE scanner, MP4 faststart VFS, PKGV/LZ4 Scene parser, 206 media server
│   ├── host/                       # Self-healing Hub/Workbench skin kernel + Ctrl+Alt+W Quick Prism Popover
│   └── studio-ui/                  # Obsidian Prism Style-Settings Studio UI (bundled into index.html)
├── sidecars/prism_studio/          # Authoritative Sidecar HTTP server + Zero-Spawn Passive CDP Bridge
├── host/cli.mjs                    # Safe thin CLI (status | enable-autostart | disable-autostart | preset | restore)
├── scripts/                        # Offline build.mjs + real-file install-local.mjs
└── test/verify-all.mjs             # End-to-end automated engine, bundle & headless browser test suite
```
