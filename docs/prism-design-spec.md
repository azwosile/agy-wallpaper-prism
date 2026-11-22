# `agy-wallpaper-prism` — Obsidian Prism UI & Workbench Glass Skin Design Specification

> **Document Owner**: `prism-designer`
> **Target Plugin**: `agy-wallpaper-prism` (Antigravity Native Plugin + Sidecar Studio + CDP Host Prism Skin)
> **Design Lineage**:
> 1. **[`RMvdesi/obsidian-prism`](https://github.com/RMvdesi/obsidian-prism)** (*Obsidian Prism / 黑曜棱镜 v1.0.5* — Optical UI, 4-palette daylight/obsidian color architecture, concentric micro-bevel radii, damped-spring choreography, `SIDECAR_THEME_VARS` iframe bridge, and injected `settings-panel.js` topdeck for Google Antigravity).
> 2. **[`damiankorcz/Prism-Theme`](https://github.com/damiankorcz/Prism-Theme)** (*Obsidian Prism Theme* — Modular SCSS `Pt / Tint / Shade` HSL surface derivation, Flush vs. Floating Island pane framing, paired Light/Dark community color presets, and calm Style-Settings control ergonomics).
> 3. **`dsh-plugin-wallpaper-engine`** (*DeepSeek Harness Liquid Glass Wallpaper Engine* — Full-viewport media stage, Steam `431960` Workshop / Video / Web / Scene playback, rotation playlists, power-saving lifecycle, and per-wallpaper optical profiles).

---

## 1. Design Philosophy & Post-Mortem of Legacy `wallpaper-studio`

### 1.1 Why Redesign Both the Skin and Control UI?

Inspection of the legacy `agy-plugin-wallpaper-engine` (`host/wallpaper-inject.js`, `host/panel-inject.js`, `web/studio.css`, `web/studio.mjs`) alongside live Antigravity DOM telemetry (`out-host/hub-survey.json`, `antigravity-observer/hud/preload_hud.js`) revealed six structural shortcomings that `agy-wallpaper-prism` resolves cleanly:

| Legacy Shortcoming (`agy-plugin-wallpaper-engine`) | Root Cause in Code | `agy-wallpaper-prism` Remedy |
| :--- | :--- | :--- |
| **1. Toy "Second Desktop" Sidecar UI** | `web/studio.css` rendered a redundant full-bleed wallpaper stage with oversized Clock (`36px`) + Pomodoro cards and a `440px` slide-over `.drawer`. Inside Antigravity's `360px–480px` Aux Pane, it felt cramped, visually noisy, and alien to the host IDE. | Replace with **Prism Studio Deck**: a calm, native-feeling Style-Settings control surface with a compact **16:9 Live Workbench Mini-Preview** header, responsive `320px -> 1200px+` breakpoints, collapsible sections, and zero redundant desktop widgets. |
| **2. `#app` Auto-Height Black-Screen Collapse** | `web/studio.css` originally omitted `#app { height: 100% }`, collapsing absolute-positioned stage views to `197px` over `#070708` (`v0.3.1` incident). | Enforce explicit flex/grid viewport lock on `html, body, #app` (`height: 100dvh; display: flex; flex-direction: column; overflow: hidden`) with non-collapsing scrollable panes (`min-height: 0`). |
| **3. Hardcoded Dark-Only Sidecar & Unstyled Inputs** | `web/studio.css` hardcoded dark rgba literals (`rgba(15, 20, 32, 0.90)`), lacked `@media` queries, lacked light-mode tokens, and had zero custom `input[type="range"]` CSS. | Unify Sidecar Studio and Host Popover on the exact same `--prism-*` Light/Dark token system, synced live via `/preload.js` + `postMessage` (`prism-theme-sync`) + `/api/state`. |
| **4. Single-Knob Flat Alpha (`widgetFill`)** | `wallpaper-inject.js` scaled `card`, `sidebar`, and `popover` linearly from a single `widgetFill` float with fixed RGB, lacking specular borders, `172deg` optical sheen, Pt/Tint/Shade tonal steps, or color presets. | Introduce **6-Tier Translucent Acrylic Hierarchy**, `Pt / Tint / Shade` color math, **8 Paired Light/Dark Color Schemes**, and **Dynamic Wallpaper Accent Extraction**. |
| **5. Flush-Only Pane Framing** | Legacy CSS hollowed `#root` and tinted `.bg-sidebar`, leaving edge-to-edge boxes with no architectural breathing room for the wallpaper. | Support **Dual Layout Modes**: **Flush Integrated (`flush`)** and **Floating Panels / Island Layout (`islands`)** with rounded concentric corners (`12px`), clean inter-pane gaps (`8px`), and toggleable specular borders & elevation shadows. |
| **6. Disconnected Trigger & Incomplete Quick Controls** | `panel-inject.js` only offered a bottom-left floating button (`30×30px`) and lacked 1-click slider resets, inline numeric editing, playlist rotation controls, and Color Scheme swatches. | Provide **Composer-Footer / Statusbar Prism Pill** + optional **Corner Glass Orb** + **`Ctrl+Alt+W`**, tactile Style-Settings sliders with tabular readouts & 1-click reset dots (`↺`), and quick transport/playlist controls. |

---

### 1.2 Four Core Optical Laws of `agy-wallpaper-prism`

1. **6-Tier Translucent Surface Hierarchy**:
   Every surface sits on a deliberate optical elevation plane (`Stage -> Hollowed Canvas -> Sidebar Acrylic -> Reading/Editor Well -> Elevated Card & Composer -> Near-Opaque Popover/Modal`). Higher elevation = higher background alpha + stronger `backdrop-filter` blur + brighter top specular edge.
2. **Concentric Micro-Bevel Geometry (`R_outer = R_inner + d`)**:
   Adopted directly from `RMvdesi/obsidian-prism` (`workbench/styles/v2-tokens.css#L30-L35`). When an outer Floating Island has radius `12px` and padding `6px`, nested cards use `8px` and inner buttons/inputs use `6px` (`--prism-r-island > --prism-r-card > --prism-r-ctl > --prism-r-xs`), eliminating pinched corners.
3. **Bounded `backdrop-filter` & Zero-Reflow Discipline**:
   Per `RMvdesi/obsidian-prism` (`README.md#L104`, *"移除常驻大面积 `backdrop-filter` 模糊开销"*):
   - **DO** apply `backdrop-filter: blur() saturate()` to bounded chrome surfaces: Sidebar Island, Titlebar, Composer Capsule, Floating Popovers, Context Menus, Command Palette, and Quick Prism Sheet.
   - **NEVER** apply `backdrop-filter` to continuously scrolling containers (`[data-testid="conversation-view"]`, `.monaco-scrollable-element`, `.monaco-editor .view-lines`, `.xterm-rows`) or per-message/per-line nodes. Primary Editor/Chat readability uses zero-cost translucent color veils (`--prism-surface-chat`, `--prism-surface-editor`) plus the stage's static central vignette.
   - **NEVER** apply `backdrop-filter`, `transform`, or `filter` to ancestor wrappers (`html`, `body`, `#root`, `.agy-shell`) that contain `position: fixed` modals/popovers, because CSS `backdrop-filter` creates a new containing block that traps fixed children (`dsh-plugin-wallpaper-engine` F3.2 guardrail).
4. **Specular Hairline Lighting**:
   Glass feels physical—not muddy—through a `1px` top inner highlight (`inset 0 1px 0 var(--prism-specular-top)`), a subtle top-down `172deg` sheen gradient (`--prism-sheen`), and a `1px` neutral-polarity hairline border (`rgba(var(--prism-pt-rgb), var(--prism-border-alpha))`).

---

## 2. Complete `--prism-*` CSS Custom Property Token Specification

### 2.1 Root Specificity & Dataset State Contract

Antigravity's Hub declares its native theme tokens (`--background`, `--card`, `--sidebar`, `--border`, `--primary`, etc.) on **`body.dark` and `body.light` — specificity `(0,1,1)`**. A plain `:root` rule `(0,1,0)` loses the cascade.

Therefore, the Host Skin Kernel MUST anchor all overrides on:
```css
html[data-agy-prism-skin],
html[data-agy-prism-skin] body {
  /* Specificity (0,1,1) on html and (0,1,2) on body — cleanly beats body.dark without touching host files */
}
```

#### Root `<html>` Dataset Attributes
| Attribute | Allowed Values | Default | Purpose |
| :--- | :--- | :--- | :--- |
| `data-agy-prism-skin` | `"1.0.0"` (semver) | — | Master skin active gate; removing it restores 100% native host CSS |
| `data-prism-theme` | `"dark"` \| `"light"` | `"dark"` (auto-synced) | Resolved active luminance polarity |
| `data-prism-scheme` | `"prism-default"` \| `"warm-carbon"` \| `"catppuccin"` \| `"nord"` \| `"rose-pine"` \| `"tokyo-night"` \| `"gruvbox"` \| `"host-native"` | `"prism-default"` | Active paired Light/Dark color scheme |
| `data-prism-accent-mode` | `"dynamic"` \| `"palette"` \| `"cobalt"` \| `"iris"` \| `"amber"` \| `"emerald"` \| `"rose"` \| `"mono"` \| `"custom"` | `"dynamic"` | Accent source strategy |
| `data-prism-layout` | `"islands"` \| `"flush"` | `"islands"` | **Floating Panels / Island Layout** vs. **Flush Integrated** |
| `data-prism-corners` | `"sharp"` \| `"balanced"` \| `"soft"` | `"balanced"` | Concentric corner radius tier |
| `data-prism-borders` | `"on"` \| `"subtle"` \| `"off"` | `"on"` | Specular `1px` perimeter borders on islands & cards |
| `data-prism-shadows` | `"on"` \| `"off"` | `"on"` | Ambient drop shadows under floating islands |
| `data-prism-kind` | `"image"` \| `"video"` \| `"web"` \| `"scene"` \| `"none"` | `"image"` | Active wallpaper media engine |

---

### 2.2 Master `--prism-*` Token Table (Dark Obsidian vs. Light Frost)

All RGB triplet tokens (`*-rgb`) use comma-separated integers (`R, G, B`) so alpha formulas `rgba(var(--prism-*-rgb), <alpha>)` work universally across Chromium and standalone previews without nested `color-mix` rounding drift.

#### A. Polarity, `Pt / Tint / Shade` Base & Accent Tokens
| Token Name | Dark Default (`Obsidian`) | Light Default (`Daylight Crystal`) | Description |
| :--- | :--- | :--- | :--- |
| `--prism-pt-rgb` | `255, 255, 255` | `15, 23, 42` | **Foreground Polarity (`Pt`)** — ink base for hairline borders, hover states, tracks, and scrollbars |
| `--prism-shade-rgb` | `9, 9, 11` (`#09090B`) | `232, 238, 246` (`#E8EEF6`) | **Deep Shade (`Shade`)** — recessed sidebar / rail / sunken tray base |
| `--prism-base-rgb` | `14, 14, 17` (`#0E0E11`) | `244, 247, 251` (`#F4F7FB`) | **Primary Canvas (`Base`)** — main editor / chat well base |
| `--prism-tint-1-rgb` | `20, 20, 24` (`#141418`) | `255, 255, 255` (`#FFFFFF`) | **Elevated Surface 1 (`Tint-1`)** — cards, composer dock, codeblocks |
| `--prism-tint-2-rgb` | `28, 28, 34` (`#1C1C22`) | `233, 239, 248` (`#E9EFF8`) | **Elevated Surface 2 (`Tint-2`)** — active pills, secondary buttons, hover cards |
| `--prism-popover-rgb` | `22, 22, 28` (`#16161C`) | `252, 253, 255` (`#FCFDFF`) | **Floating Overlay (`Popover`)** — menus, command palette, modals, Quick Prism sheet |
| `--prism-wall-tint-rgb` | `102, 157, 246` | `37, 99, 235` | Dynamic RGB extracted from active wallpaper (auto-updated on wallpaper change) |
| `--prism-wall-tint-mix` | `6%` | `4%` | Ambient wallpaper hue cast blended into glass surfaces (`0%`–`18%`) |
| `--prism-fg` | `#F2F2F5` | `#0F172A` | Primary readable text (`>= 11:1` over solid base) |
| `--prism-fg-2` | `#C4C4CE` | `#334155` | Secondary UI labels, inactive tab text |
| `--prism-fg-muted` | `#8A8A98` | `#5B6B82` | Captions, hints, metadata, timestamps |
| `--prism-fg-faint` | `#626270` | `#7C8CA5` | Placeholders, disabled labels, subtle ticks |
| `--prism-accent` | `#669DF6` | `#2563EB` | Active primary accent (overridden by Dynamic Wallpaper Extraction or Accent Preset) |
| `--prism-accent-rgb` | `102, 157, 246` | `37, 99, 235` | RGB channels of `--prism-accent` |
| `--prism-accent-fg` | `#FFFFFF` | `#FFFFFF` | Contrast text on `--prism-accent` buttons (`#14120E` when high-luminance amber/mono) |
| `--prism-accent-soft` | `rgba(var(--prism-accent-rgb), 0.14)` | `rgba(var(--prism-accent-rgb), 0.11)` | Selected card/chip/tab tint fill |
| `--prism-accent-border` | `rgba(var(--prism-accent-rgb), 0.48)` | `rgba(var(--prism-accent-rgb), 0.42)` | Focused input & active preset border |
| `--prism-link` | `#8AB4F8` | `#1D4ED8` | Markdown & UI hyperlink color |
| `--prism-ok` | `#50A37B` | `#059669` | Connected / Running / Inserted semantic status |
| `--prism-warn` | `#F2B84B` | `#D97706` | Paused / Throttled / Modified semantic status |
| `--prism-danger` | `#E5534B` | `#DC2626` | Error / Restore-Armed / Removed semantic status |

#### B. Stage & Optical Veil Tokens (`#prism-ws-stage`, `z-index: 0`)
| Token Name | Dark Default | Light Default | Range / Formula |
| :--- | :--- | :--- | :--- |
| `--prism-wall-image` | `none` | `none` | `url("http://127.0.0.1:<port>/...")` when `kind="image"` |
| `--prism-wall-fit` | `cover` | `cover` | `cover` \| `contain` \| `fill` |
| `--prism-wall-pos` | `50% 50%` | `50% 50%` | Focal point alignment |
| `--prism-media-opacity` | `1` | `1` | `0.05` – `1.00` |
| `--prism-media-blur` | `0px` | `0px` | `0px` – `64px` (when `> 0`, media gets `transform: scale(1.04)` to hide blur-bleed edges) |
| `--prism-media-brightness` | `100%` | `102%` | `40%` – `160%` |
| `--prism-media-contrast` | `100%` | `98%` | `50%` – `150%` |
| `--prism-media-saturate` | `105%` | `100%` | `0%` – `200%` |
| `--prism-scrim-color` | `rgb(9, 9, 11)` | `rgb(244, 247, 251)` | Auto-follows `--prism-shade-rgb` unless user sets custom color |
| `--prism-scrim-opacity` | `0.26` | `0.48` | User `0.00`–`0.92`; in Light `auto` mode mapped via `clamp(0.32 + userScrim * 0.62, 0.18, 0.94)` so dark ink never loses contrast over dark/busy wallpapers |
| `--prism-vignette-opacity` | `0.42` | `0.34` | `0` when vignette off; radial mask protecting central reading axis |
| `--prism-vignette-gradient` | `radial-gradient(ellipse 56% 64% at 50% 48%, rgba(9,9,11,0.06) 0%, rgba(9,9,11,0.28) 58%, rgba(9,9,11,0.62) 100%)` | `radial-gradient(ellipse 56% 64% at 50% 48%, rgba(255,255,255,0.42) 0%, rgba(244,247,251,0.24) 60%, rgba(232,238,246,0.52) 100%)` | Central reading vignette (`RMvdesi/obsidian-prism` `v2-components.css#L893-L915` pattern) |
| `--prism-grain-alpha` | `0.022` | `0.016` | `0.000` – `0.150` SVG `feTurbulence` (`baseFrequency="0.85" numOctaves="3"`) |

#### C. 6-Tier Translucent Glass Surface Hierarchy
All surface alphas derive smoothly from a single intuitive master knob **`--prism-glass-opacity`** (`g`, user slider `0.30` – `0.98`, default **`0.76`** in Dark / **`0.82`** in Light) plus optional per-tier overrides:

| Tier | Token Name | Dark Alpha Formula (`g = 0.76`) | Light Alpha Formula (`g = 0.82`) | `backdrop-filter` | Target Surfaces |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **0. Canvas** | `--prism-surface-canvas` | `transparent` (`0`) | `transparent` (`0`) | `none` | `#root`, `.agy-shell`, `.monaco-workbench` outer frame (lets wallpaper shine through island gaps!) |
| **1. Sidebar / Nav** | `--prism-surface-sidebar` | `clamp(g * 0.72, 0.24, 0.96)` -> **`0.547`** | `clamp(g * 0.80, 0.42, 0.97)` -> **`0.656`** | `blur(var(--prism-blur-md)) saturate(140%)` | Left Sidebar, Activity Bar, Aux Pane outer shell, Statusbar, Titlebar |
| **2. Chat Well** | `--prism-surface-chat` | `clamp(g * 0.42, 0.00, 0.88)` -> **`0.319`** (`0` in Flush Minimal) | `clamp(g * 0.62, 0.28, 0.92)` -> **`0.508`** | **`none`** *(scroll perf guardrail)* | Main conversation stage island (`[data-testid="conversation-view"]` wrapper) |
| **3. Code / Editor** | `--prism-surface-editor` | `clamp(g * 0.94, 0.72, 0.98)` -> **`0.720`** | `clamp(g * 0.96, 0.84, 0.99)` -> **`0.840`** | **`none`** *(scroll perf guardrail)* | `.part.editor`, `.monaco-editor-background`, `.part.panel` (Terminal), Diff views |
| **4. Elevated Card & Composer** | `--prism-surface-card`<br>`--prism-surface-composer` | Card: `clamp(g * 0.78, 0.32, 0.96)` -> **`0.593`**<br>Composer: `clamp(g * 0.92, 0.48, 0.98)` -> **`0.699`** | Card: `clamp(g * 0.86, 0.50, 0.98)` -> **`0.705`**<br>Composer: `clamp(g * 0.94, 0.65, 0.99)` -> **`0.771`** | Card: `none`<br>Composer: `blur(var(--prism-blur-lg)) saturate(145%)` | User message bubbles, markdown codeblocks (`pre`), `[data-testid="agent-input-box"]`, `.surface-composer-card` |
| **5. Floating Popover & Modal** | `--prism-surface-popover` | `clamp(max(g + 0.14, 0.88), 0.88, 0.99)` -> **`0.900`** | `clamp(max(g + 0.14, 0.93), 0.93, 0.99)` -> **`0.960`** | `blur(var(--prism-blur-xl)) saturate(155%)` | Context menus, Radix poppers, `[role="dialog"]`, `.quick-input-widget`, `.monaco-hover`, `#agy-prism-popover` |

> **Ambient Wallpaper Tint Mix Formula**:
> Every surface RGB blends `--prism-wall-tint-rgb` at `--prism-wall-tint-mix` (`6%` dark / `4%` light) before applying alpha:
> ```css
> --prism-sidebar-tinted: color-mix(in srgb, rgb(var(--prism-shade-rgb)) calc(100% - var(--prism-wall-tint-mix)), rgb(var(--prism-wall-tint-rgb)));
> --prism-surface-sidebar: color-mix(in srgb, var(--prism-sidebar-tinted) calc(var(--prism-alpha-sidebar) * 100%), transparent);
> ```
> Fallback for environments without nested `color-mix`: precompute the mixed `rgba(r, g, b, alpha)` directly in JS inside `wallpaper-inject.js` (0 runtime CSS overhead!).

#### D. Blur, Specular Borders, Sheen & Shadow Tokens
| Token Name | Dark Value | Light Value | Notes |
| :--- | :--- | :--- | :--- |
| `--prism-blur-sm` | `10px` | `10px` | Badges, compact pills |
| `--prism-blur-md` | `16px` | `16px` | Sidebar, Titlebar, Statusbar (scaled by user `--prism-glass-blur` knob `0px`–`32px`) |
| `--prism-blur-lg` | `20px` | `20px` | Composer capsule, floating docks |
| `--prism-blur-xl` | `26px` | `26px` | Popovers, Command Palette, Quick Prism sheet |
| `--prism-border-hairline` | `rgba(255, 255, 255, 0.075)` | `rgba(15, 23, 42, 0.095)` | Flush splitters, row dividers (`0.04` when `borders="subtle"`, `transparent` when `"off"`) |
| `--prism-border-island` | `rgba(255, 255, 255, 0.105)` | `rgba(15, 23, 42, 0.125)` | Floating Island `1px` perimeter rim |
| `--prism-border-card` | `rgba(255, 255, 255, 0.090)` | `rgba(15, 23, 42, 0.115)` | Elevated cards & codeblocks |
| `--prism-border-popover` | `rgba(255, 255, 255, 0.145)` | `rgba(15, 23, 42, 0.160)` | Floating modals, menus, Quick Prism sheet |
| `--prism-specular-top` | `rgba(255, 255, 255, 0.075)` | `rgba(255, 255, 255, 0.880)` | `inset 0 1px 0 var(--prism-specular-top)` top edge catchlight |
| `--prism-sheen` | `linear-gradient(172deg, rgba(255,255,255,0.042) 0%, rgba(255,255,255,0) 38%)` | `linear-gradient(172deg, rgba(255,255,255,0.68) 0%, rgba(255,255,255,0) 40%)` | Signature `RMvdesi/obsidian-prism` optical surface sheen |
| `--prism-shadow-island` | `0 10px 28px -8px rgba(0, 0, 0, 0.46), 0 2px 6px rgba(0, 0, 0, 0.24)` | `0 10px 28px -10px rgba(15, 23, 42, 0.14), 0 2px 6px rgba(15, 23, 42, 0.06)` | `none` when `data-prism-layout="flush"` or `data-prism-shadows="off"` |
| `--prism-shadow-popover` | `0 28px 64px -14px rgba(0, 0, 0, 0.64), 0 2px 8px rgba(0, 0, 0, 0.30)` | `0 28px 64px -18px rgba(15, 23, 42, 0.28), 0 2px 8px rgba(15, 23, 42, 0.10)` | Always active on floating popovers & modals |

#### E. Layout & Concentric Radius Matrix (`Flush` vs. `Islands` × `Sharp | Balanced | Soft`)
| Token Name | `flush` Layout | `islands` + `sharp` | `islands` + `balanced` *(Default)* | `islands` + `soft` | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `--prism-workspace-pad` | `0px` | `6px` | **`8px`** | `10px` | Outer frame margin letting wallpaper frame the workspace |
| `--prism-island-gap` | `0px` | `6px` | **`8px`** *(user `4–16px`)* | `10px` | Clean gap between Sidebar, Main Editor/Chat, Aux Pane, Bottom Panel |
| `--prism-r-island` | `0px` | `6px` | **`12px`** | `16px` | Floating Island outer container corner radius |
| `--prism-r-sheet` | `12px` | `8px` | **`14px`** | `18px` | Modals, Quick Prism Popover, Command Palette |
| `--prism-r-card` | `8px` | `4px` | **`10px`** | `13px` | Settings groups, wallpaper thumbnail cards, composer |
| `--prism-r-ctl` | `6px` | `4px` | **`7px`** | `9px` | Buttons, inputs, segmented tab pills |
| `--prism-r-xs` | `4px` | `2px` | **`4px`** | `6px` | Inline `<code>`, `<kbd>`, format badges |
| `--prism-r-pill` | `999px` | `999px` | **`999px`** | `999px` | Switches, filter chips, statusbar triggers |

#### F. Typography & Damped-Spring Motion Tokens
```css
--prism-font-sans: 'Google Sans Flex', 'Google Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei UI', sans-serif;
--prism-font-mono: 'Google Sans Code', 'JetBrains Mono', 'Cascadia Code', 'SF Mono', Consolas, ui-monospace, monospace;

--prism-fs-micro:   10.5px; /* Uppercase monospace section headers, badges (letter-spacing: 0.06em) */
--prism-fs-xs:      11.5px; /* Hints, secondary metadata, chip labels, numeric readouts */
--prism-fs-sm:      12.5px; /* Primary control labels, segmented tabs, card titles */
--prism-fs-base:    13.5px; /* Sheet headers, primary body copy */
--prism-fs-lg:      15px;   /* Studio pane title */

--prism-dur-fast:   120ms;
--prism-dur-base:   180ms;
--prism-dur-spring: 280ms;
--prism-ease-out:    cubic-bezier(0.22, 1, 0.36, 1);
--prism-ease-spring: cubic-bezier(0.22, 1.08, 0.36, 1); /* Signature RMvdesi/obsidian-prism damped spring */
```

---

## 3. Adaptive Color Schemes & Dynamic Wallpaper Accent Engine

### 3.1 Built-in Paired Color Scheme Matrix (8 Presets × Dark & Light)

Every color scheme defines a **Dark Obsidian** palette and a **Light Frost** counterpart so switching OS/Antigravity theme (`Auto`) transitions harmoniously without manual reconfiguration:

| Preset ID | Display Name (ZH / EN) | Mode | `--prism-shade-rgb` (Sidebar) | `--prism-base-rgb` (Canvas/Editor) | `--prism-tint-1-rgb` (Card) | `--prism-fg` / `--prism-fg-muted` | Default `--prism-accent` / `--prism-link` |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`prism-default`** | **深空黑曜 / 白昼冷晶**<br>*Prism Default* | Dark<br>Light | `9, 9, 11` (`#09090B`)<br>`232, 238, 246` (`#E8EEF6`) | `14, 14, 17` (`#0E0E11`)<br>`244, 247, 251` (`#F4F7FB`) | `20, 20, 24` (`#141418`)<br>`255, 255, 255` (`#FFFFFF`) | `#F2F2F5` / `#8A8A98`<br>`#0F172A` / `#5B6B82` | `#669DF6` / `#8AB4F8`<br>`#2563EB` / `#1D4ED8` |
| **`warm-carbon`** | **暖炭玄岩 / 暖白画册**<br>*Warm Carbon & Alabaster* | Dark<br>Light | `16, 16, 15` (`#10100F`)<br>`235, 230, 220` (`#EBE6DC`) | `20, 20, 19` (`#141413`)<br>`246, 244, 238` (`#F6F4EE`) | `27, 26, 24` (`#1B1A18`)<br>`255, 253, 249` (`#FFFDF9`) | `#F2EFE9` / `#A39E93`<br>`#1C1814` / `#6B6257` | `#D97757` / `#E59377`<br>`#C25934` / `#B54D28` |
| **`catppuccin`** | **猫布奇诺 (Mocha / Latte)**<br>*Catppuccin* | Dark<br>Light | `24, 24, 37` (`#181825`)<br>`230, 233, 239` (`#E6E9EF`) | `30, 30, 46` (`#1E1E2E`)<br>`239, 241, 245` (`#EFF1F5`) | `49, 50, 68` (`#313244`)<br>`252, 253, 255` (`#FCFDFF`) | `#CDD6F4` / `#9399B2`<br>`#4C4F69` / `#6C6F85` | `#CBA6F7` / `#89B4FA`<br>`#8839EF` / `#1E66F5` |
| **`nord`** | **极地冰川 (Night / Snow)**<br>*Nord* | Dark<br>Light | `36, 41, 51` (`#242933`)<br>`229, 233, 240` (`#E5E9F0`) | `46, 52, 64` (`#2E3440`)<br>`236, 239, 244` (`#ECEFF4`) | `59, 66, 82` (`#3B4252`)<br>`248, 250, 252` (`#F8FAFC`) | `#ECEFF4` / `#9AA5B8`<br>`#2E3440` / `#5E6B80` | `#88C0D0` / `#81A1C1`<br>`#5E81AC` / `#4C6E99` |
| **`rose-pine`** | **松间玫瑰 (Main / Dawn)**<br>*Rosé Pine* | Dark<br>Light | `25, 23, 36` (`#191724`)<br>`242, 233, 225` (`#F2E9E1`) | `31, 29, 46` (`#1F1D2E`)<br>`250, 244, 237` (`#FAF4ED`) | `38, 35, 58` (`#26233A`)<br>`255, 250, 243` (`#FFFAF3`) | `#E0DEF4` / `#908CAA`<br>`#575279` / `#797593` | `#C4A7E7` / `#EBBCBA`<br>`#907AA9` / `#D7827E` |
| **`tokyo-night`** | **东京夜色 (Night / Day)**<br>*Tokyo Night* | Dark<br>Light | `22, 22, 30` (`#16161E`)<br>`213, 214, 219` (`#D5D6DB`) | `26, 27, 38` (`#1A1B26`)<br>`225, 226, 231` (`#E1E2E7`) | `36, 40, 59` (`#24283B`)<br>`242, 243, 247` (`#F2F3F7`) | `#C0CAF5` / `#787C99`<br>`#3760BF` / `#6172B0` | `#7AA2F7` / `#7DCFFF`<br>`#2E7DE9` / `#007197` |
| **`gruvbox`** | **复古暖砂 (Dark / Light)**<br>*Gruvbox* | Dark<br>Light | `29, 32, 33` (`#1D2021`)<br>`235, 219, 178` (`#EBDBB2`) | `40, 40, 40` (`#282828`)<br>`251, 241, 199` (`#FBF1C7`) | `60, 56, 54` (`#3C3836`)<br>`249, 245, 215` (`#F9F5D7`) | `#EBDBB2` / `#A89984`<br>`#3C3836` / `#7C6F64` | `#FABD2F` / `#83A598`<br>`#B57614` / `#076678` |
| **`host-native`** | **跟随宿主原生**<br>*Antigravity Native* | Dark<br>Light | `17, 17, 20` (`#111114`)<br>`238, 238, 241` (`#EEEEF1`) | `7, 7, 8` (`#070708`)<br>`247, 247, 248` (`#F7F7F8`) | `19, 19, 23` (`#131317`)<br>`255, 255, 255` (`#FFFFFF`) | *(Host `--foreground`)* | `#2F71E3` / `#6A9FCB`<br>`#0066CC` / `#0055AA` |

### 3.2 Accent Override Modes
Users can select how `--prism-accent` is resolved:
1. **`dynamic` *(Recommended Default)***: Extracted automatically from the active wallpaper (see §3.3), smoothly cross-fading over `420ms` during playlist transitions.
2. **`palette`**: Uses the active Color Scheme's signature accent from §3.1.
3. **Industrial Accent Tiers** (matching `RMvdesi/obsidian-prism` `style.css#L127-L135`):
   - `cobalt`: Dark `#669DF6` / Light `#2563EB`
   - `iris`: Dark `#A58AF8` / Light `#7C3AED`
   - `amber`: Dark `#F2B84B` (`--prism-accent-fg: #14120E`) / Light `#D97706` (`#FFFFFF`)
   - `emerald`: Dark `#50A37B` / Light `#059669`
   - `rose`: Dark `#F472B6` / Light `#DB2777`
   - `mono`: Dark `#D4D7E0` (`--prism-accent-fg: #0E0F14`) / Light `#334155` (`#FFFFFF`)
4. **`custom`**: User-selected hex color (`#RRGGBB`), automatically contrast-checked to set `--prism-accent-fg` (`#FFFFFF` vs `#0F172A`).

### 3.3 Dynamic Wallpaper Accent Extraction Algorithm (`extractWallpaperAccent`)

To work across **all** wallpaper types (Static Images, MP4/WebM Videos, Web/HTML iframes, and Steam Workshop `scene.pkg` items) without CORS taint or GPU stalls:
1. **Sampling Source Priority**:
   - First choice: Wallpaper item's loopback `thumbUrl` (`preview.jpg` / `preview.gif` / static image served by `source-server` with `Access-Control-Allow-Origin: *` and `<img crossOrigin="anonymous">`).
   - Second choice (if local video without preview): Capture frame at `loadeddata` (`video.currentTime > 0.1`) onto offscreen canvas.
   - Cache extracted `{ accentDark, accentLight, tintRgb }` keyed by `wallpaperId` in `prefs.json` / memory cache so switching back is `0ms` instant!
2. **32×32 Quantized Chroma-Weighted Histogram**:
   - Draw source onto `32 × 32` offscreen `<canvas>` (`1,024` pixels).
   - Convert each pixel `(r, g, b)` to HSL `(h, s, l)`:
     - Discard muddy/achromatic pixels where `l < 0.12`, `l > 0.90`, or `s < 0.16`.
     - Accumulate into `24` hue buckets (`15°` each), weighted by `weight = s * (1 - Math.abs(l - 0.5) * 1.4)`.
   - If all pixels are achromatic (e.g. monochrome B&W wallpaper), fall back cleanly to the active scheme's default accent (or `mono` `#D4D7E0` / `#475569`).
   - Take the winning hue bucket's weighted average `H`, clamp saturation `S = clamp(avgS, 0.52, 0.84)`, and compute tone-safe lightness:
     - **Dark Mode Accent**: `L = 0.68` (guarantees `>= 4.5:1` contrast against `#0E0E11` dark glass).
     - **Light Mode Accent**: `L = 0.44` (guarantees `>= 4.5:1` contrast against `#F4F7FB` light glass).
     - **Ambient Glass Tint (`--prism-wall-tint-rgb`)**: `H` at `S = 0.45, L = 0.50` blended at `--prism-wall-tint-mix` (`6%` dark / `4%` light).

---

## 4. Antigravity Workbench Selector Mapping & Readability Guardrails

### 4.1 Dual-Shell Architectural Reality

Live probing (`out-host/hub-survey.json`, `out-host/tokens.json`, `RMvdesi/obsidian-prism/style.css`) confirms that `agy-wallpaper-prism` must handle **two** DOM architectures seamlessly inside one stylesheet:
1. **Antigravity 2.0 Hub Shell (`https://127.0.0.1:<port>/`)** — React + Tailwind CSS v4 main desktop window (`.agy-shell`, `[data-testid="sidebar-split"]`, `[data-testid="conversation-view"]`, `.surface-composer-card`, embedded Monaco/CodeMirror/xterm blocks, and `plugin://` Sidecar Aux Panes).
2. **VS Code / Antigravity IDE Workbench (`.monaco-workbench`)** — Full workbench layout (`.part.activitybar`, `.part.sidebar`, `.part.editor`, `.part.panel`, `.part.auxiliarybar`, `.part.titlebar`, `.part.statusbar`).

### 4.2 Z-Index Stacking Ladder

| Layer | `z-index` | Element / Selector | Pointer Events | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Stage Wallpaper** | `0` | `#prism-ws-stage` (`video`, `iframe`, `canvas`, `.prism-scrim`, `.prism-vignette`, `.prism-grain`) | `none` (`auto` only when `interactiveWeb && kind === 'web'`) | Inserted as `document.body.firstChild` |
| **Host Application** | `1` | `#root`, `.monaco-workbench` | `auto` | Lifted cleanly above `#prism-ws-stage` |
| **Composer / Titlebar** | `8` – `15` | `[data-testid="sidebar-split"]`, `.surface-composer-card` | `auto` | Host internal stacking preserved |
| **Quick Prism Trigger** | `44` | `#agy-prism-popover .prism-corner-orb` | `auto` | Below host modals; Composer Footer Pill sits inline at `z-index: auto` |
| **Quick Prism Sheet** | `45` | `#agy-prism-popover .prism-sheet` | `auto` when `[data-open="true"]` | Above `#root` (`1`), strictly below Radix/Host modals (`50`) |
| **Host Modals & Menus** | `50` – `2500` | `.agy-dialog`, `[role="dialog"]`, `[data-radix-popper-content-wrapper]`, `.quick-input-widget`, `.context-view` | `auto` | Near-opaque glass (`>= 0.90` alpha) |
| **Sibling Corner HUDs** | `7000` – `2147482800` | `#ag-context-meter`, `#gemini-neko-pet-root`, `#gemini-neko-observer-modal` | Untouched | Explicitly excluded from all skin rules |

---

### 4.3 Complete Antigravity Selector Mapping Table

#### A. Antigravity 2.0 Hub Shell Selectors (`html[data-agy-prism-skin]`)
| Optical Tier | Exact Verified Host Selectors | Applied CSS Treatment |
| :--- | :--- | :--- |
| **Host Variable Bridge (`body`)** | `html[data-agy-prism-skin] body` | `--background: transparent !important; --body-background: transparent !important; --shell: transparent !important; --content: var(--prism-surface-chat) !important; --sidebar: var(--prism-surface-sidebar) !important; --sidebar-muted: rgba(var(--prism-pt-rgb), 0.048) !important; --sidebar-secondary: rgba(var(--prism-pt-rgb), 0.082) !important; --card: var(--prism-surface-card) !important; --card-border: var(--prism-border-card) !important; --border: var(--prism-border-hairline) !important; --popover: var(--prism-surface-popover) !important; --primary: var(--prism-accent) !important; --primary-foreground: var(--prism-accent-fg) !important; --link: var(--prism-link) !important; --scrim: rgba(var(--prism-shade-rgb), 0.68) !important; --onyx-frame: var(--prism-surface-sidebar) !important; --onyx-well: var(--prism-surface-chat) !important; --onyx-raised: var(--prism-surface-card) !important;` |
| **Tier 0: Hollowed Full-Bleed Wrappers** | `#root`, `#root > div`, `#root > div > div`, `#root > div > div > div`, `.agy-shell`, `.agy-inset-shell`, `.agy-sheet`, `.browser-hole-ancestor`, `body[data-has-browser-hole="true"]`, `[class*="bg-background"]:not([role="dialog"]):not([role="menu"])` | `background-color: transparent !important; background-image: none !important;` (No `backdrop-filter` or `transform` here!) |
| **Tier 1: Sidebar & Navigation Rail** | `[data-testid="sidebar-split"] > div:first-child`, `.agy-sidebar`, `[class*="bg-sidebar"]:not(button)` | `background-color: var(--prism-surface-sidebar) !important; background-image: var(--prism-sheen) !important; backdrop-filter: blur(var(--prism-blur-md)) saturate(140%); -webkit-backdrop-filter: blur(var(--prism-blur-md)) saturate(140%);` |
| **Tier 1b: Titlebar & Toolbar Chrome** | `[data-testid="title-menu-bar"]`, `[data-testid="pane-titlebar-toolbar"]` | Transparent in `islands` mode; `var(--prism-surface-sidebar)` + `1px` bottom border in `flush` mode; buttons get `border-radius: var(--prism-r-ctl)` |
| **Tier 2: Conversation / Chat Stage** | `[data-testid="conversation-view"]` | `background-color: var(--prism-surface-chat) !important; backdrop-filter: none !important;` (Zero scroll blur; protected by stage vignette) |
| **Tier 3: Embedded Code, Diffs & Terminal in Hub** | `.monaco-editor`, `.monaco-editor-background`, `.cm-editor`, `.xterm`, `[data-testid="background-task-command"]` | `background-color: var(--prism-surface-editor) !important; border-radius: var(--prism-r-card); border: 1px solid var(--prism-border-card);` |
| **Tier 4: Composer Capsule & User Cards** | `[data-testid="agent-input-box"]`, `#antigravity.agentSidePanelInputBox > .surface-composer-card`, `.surface-composer`, `.agy-composer` | `background-color: var(--prism-surface-composer) !important; background-image: var(--prism-sheen) !important; backdrop-filter: blur(var(--prism-blur-lg)) saturate(145%) !important; border: 1px solid var(--prism-border-card) !important; box-shadow: inset 0 1px 0 var(--prism-specular-top), var(--prism-shadow-island) !important; border-radius: var(--prism-r-card) !important;` |
| **Tier 4b: Aux / Sidecar Pane Slot** | `[data-testid="aux-pane-split"] > div:last-child`, `[data-testid="sidecar-iframe-slot"]` | Framed as Right Floating Island in `islands` mode; `iframe[data-testid="sidecar-iframe"]` synced via `prism-theme-sync` `postMessage` |
| **Tier 5: Floating Modals, Menus & Toasts** | `.agy-dialog`, `.agy-overlay`, `.agy-popover`, `.agy-menu`, `.agy-toast`, `[role="dialog"]`, `[role="menu"]`, `[role="listbox"]`, `[role="tooltip"]`, `[data-radix-popper-content-wrapper] > *`, `[data-testid="context-menu-popup"]`, `[data-testid="context-menu-submenu-popup"]`, `[data-testid="permissions-menu"]`, `[data-testid="add-resource-menu"]`, `[data-testid="toast-notification"]`, `[class*="bg-popover"]` | `background-color: var(--prism-surface-popover) !important; background-image: var(--prism-sheen) !important; backdrop-filter: blur(var(--prism-blur-xl)) saturate(155%) !important; border: 1px solid var(--prism-border-popover) !important; box-shadow: inset 0 1px 0 var(--prism-specular-top), var(--prism-shadow-popover) !important;` |

#### B. VS Code / Antigravity IDE Workbench Selectors (`.monaco-workbench`)
| Workbench Part | Exact Selectors | Applied CSS Treatment |
| :--- | :--- | :--- |
| **Workbench Root** | `.monaco-workbench`, `.monaco-workbench .monaco-grid-view`, `.monaco-workbench .monaco-split-view2 > .monaco-scrollable-element > .split-view-container > .split-view-view` | `background-color: transparent !important;` |
| **Titlebar & Statusbar** | `.monaco-workbench .part.titlebar`, `.monaco-workbench .part.statusbar` | `background-color: var(--prism-surface-sidebar) !important; backdrop-filter: blur(var(--prism-blur-md)) saturate(140%); border-color: var(--prism-border-hairline) !important;` |
| **Activity Bar & Primary Sidebar** | `.monaco-workbench .part.activitybar`, `.monaco-workbench .part.sidebar`, `.monaco-workbench .part.sidebar .composite.title` | `background-color: var(--prism-surface-sidebar) !important; background-image: var(--prism-sheen); backdrop-filter: blur(var(--prism-blur-md)) saturate(140%);` |
| **Editor Groups & Tab Header** | `.monaco-workbench .part.editor > .content`, `.editor-group-container`, `.tabs-and-actions-container`, `.tab.active` | Group island gets `var(--prism-surface-editor)`; inactive tabs `transparent`; `.tab.active` gets `var(--prism-accent-soft)` + `inset 0 2px 0 var(--prism-accent)` |
| **Monaco Code Canvas** | `.monaco-editor`, `.monaco-editor .margin`, `.monaco-editor-background`, `.monaco-editor .inputarea.ime-input` | `background-color: transparent !important;` (inherits parent `.editor-group-container`'s `var(--prism-surface-editor)` veil so gutter and lines match seamlessly with 0 scroll lag) |
| **Bottom Panel & Integrated Terminal** | `.monaco-workbench .part.panel`, `.xterm`, `.xterm .xterm-viewport`, `.xterm .xterm-screen` | `.part.panel` gets `var(--prism-surface-editor)` (`alpha >= 0.80`); `.xterm-viewport` forced `background-color: transparent !important;` |
| **Right Auxiliary Bar (Chat / Sidecar)** | `.monaco-workbench .part.auxiliarybar` | `background-color: var(--prism-surface-sidebar) !important; backdrop-filter: blur(var(--prism-blur-md)) saturate(140%);` |
| **Command Palette, Suggest & Hover** | `.quick-input-widget`, `.monaco-hover`, `.editor-widget.suggest-widget`, `.parameter-hints-widget`, `.context-view .monaco-menu-container` | `background-color: var(--prism-surface-popover) !important; backdrop-filter: blur(var(--prism-blur-xl)) saturate(155%) !important; border: 1px solid var(--prism-border-popover) !important; border-radius: var(--prism-r-sheet) !important; box-shadow: var(--prism-shadow-popover) !important;` |

---

### 4.4 Layout Modes CSS Blueprint: `Flush Integrated` vs. `Floating Islands`

```css
/* ==========================================================================
   MODE A: FLUSH INTEGRATED (data-prism-layout="flush")
   Edge-to-edge precision splits with 1px etched hairlines
   ========================================================================== */
html[data-agy-prism-skin][data-prism-layout="flush"] :is([data-testid="sidebar-split"], [data-testid="aux-pane-split"]) > div:nth-child(2) {
  width: 1px !important;
  background-color: var(--prism-border-hairline) !important;
}

/* ==========================================================================
   MODE B: FLOATING PANELS / ISLAND LAYOUT (data-prism-layout="islands")
   Wallpaper shines softly through clean gaps around rounded glass islands
   ========================================================================== */
html[data-agy-prism-skin][data-prism-layout="islands"] .agy-shell {
  padding: var(--prism-workspace-pad) !important;
  gap: var(--prism-island-gap) !important;
}

/* 1. Left Sidebar Island (Hub) */
html[data-agy-prism-skin][data-prism-layout="islands"] [data-testid="sidebar-split"] > div:first-child,
html[data-agy-prism-skin][data-prism-layout="islands"] .agy-sidebar {
  border-radius: var(--prism-r-island) !important;
  border: 1px solid var(--prism-border-island) !important;
  box-shadow: inset 0 1px 0 var(--prism-specular-top), var(--prism-shadow-island) !important;
  overflow: hidden;
}

/* 2. Interactive Transparent Resize Gutter between Islands (preserves drag-resize!) */
html[data-agy-prism-skin][data-prism-layout="islands"] :is([data-testid="sidebar-split"], [data-testid="aux-pane-split"]) > div:nth-child(2) {
  width: var(--prism-island-gap) !important;
  background: transparent !important;
  border: none !important;
  position: relative;
}
html[data-agy-prism-skin][data-prism-layout="islands"] :is([data-testid="sidebar-split"], [data-testid="aux-pane-split"]) > div:nth-child(2):hover::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 3px;
  height: 36px;
  border-radius: 999px;
  background: var(--prism-accent);
  opacity: 0.75;
}

/* 3. Primary Chat / Main Content Island & Right Aux / Sidecar Island (Hub) */
html[data-agy-prism-skin][data-prism-layout="islands"] [data-testid="aux-pane-split"] > div:first-child,
html[data-agy-prism-skin][data-prism-layout="islands"] [data-testid="aux-pane-split"] > div:last-child:not([hidden]):not([aria-hidden="true"]) {
  border-radius: var(--prism-r-island) !important;
  border: 1px solid var(--prism-border-island) !important;
  box-shadow: inset 0 1px 0 var(--prism-specular-top), var(--prism-shadow-island) !important;
  overflow: hidden;
}

/* 4. VS Code / Antigravity IDE Workbench Islands (.monaco-workbench) */
html[data-agy-prism-skin][data-prism-layout="islands"] .monaco-workbench :is(.part.activitybar, .part.sidebar, .part.editor .editor-group-container, .part.panel, .part.auxiliarybar) {
  margin: calc(var(--prism-island-gap) * 0.5) !important;
  border-radius: var(--prism-r-island) !important;
  border: 1px solid var(--prism-border-island) !important;
  box-shadow: inset 0 1px 0 var(--prism-specular-top), var(--prism-shadow-island) !important;
  overflow: hidden;
}
```

> **Toggleable Borders & Shadows Modifiers**:
> - `html[data-agy-prism-skin][data-prism-borders="off"]`: sets `--prism-border-island: transparent; --prism-specular-top: transparent;` for pure borderless floating glass.
> - `html[data-agy-prism-skin][data-prism-borders="subtle"]`: halves border alpha (`0.05` dark / `0.06` light).
> - `html[data-agy-prism-skin][data-prism-shadows="off"]`: sets `--prism-shadow-island: none;`.

---

### 4.5 Hard Readability & Coexistence Guardrails

1. **Monaco Code & Inline Codeblocks (`.monaco-editor .view-lines`, `pre`, `.cm-content`)**:
   - **Minimum Veil Contrast Floor**: When `contrastFloor: true` *(default `true`)*, `--prism-surface-editor` never drops below `0.72` alpha in Dark mode or `0.84` alpha in Light mode, even if the user drags Master Glass Opacity down to `0.30`.
   - **Selection & Find-Match Preservation**: Override `::selection` and `--editor-selection-background` to `rgba(var(--prism-accent-rgb), 0.38) !important` and keep `--editor-find-match-background: rgba(234, 179, 8, 0.38) !important` so search hits pop cleanly over glass.
   - **Zero Blur on `.view-lines`**: Never attach `backdrop-filter` to `.monaco-editor`, `.monaco-scrollable-element`, or `.view-lines` (prevents subpixel glyph blurring and 120Hz/180Hz scroll jank).
2. **Diff Views (`.monaco-diff-editor`, Hub Diff Artifacts)**:
   - Boost native `--editor-diff-inserted-line-background` (`rgba(46, 160, 67, 0.22) !important`) and `--editor-diff-removed-line-background` (`rgba(248, 81, 73, 0.22) !important`) so subtle red/green tints are never drowned out by saturated wallpapers.
3. **Integrated Terminal (`xterm.js`)**:
   - `.xterm-viewport` is forced `transparent`, while its container (`.part.panel` or Hub task terminal box) uses `--prism-surface-editor` (`alpha >= 0.80` dark / `>= 0.88` light).
   - If `xterm` mounts a WebGL `<canvas>` with an opaque theme fill, inject a non-destructive CSS rule targeting `.xterm-rows` + sync terminal background token `--vscode-terminal-background: transparent !important`.
4. **Chat Prose & Markdown Tables**:
   - Stage vignette (`--prism-vignette-gradient`) attenuates high-frequency wallpaper detail behind the central `760px` (`48rem`) conversation column while leaving peripheral sidebars and island margins vivid.
   - Markdown code blocks (`pre`, `.code-block`) and tables (`table`) receive `background-color: var(--prism-surface-card)` + `1px solid var(--prism-border-card)` so structured technical blocks sit on crisp elevated cards.
5. **Third-Party Plugin Coexistence**:
   - **Antigravity Observer (`gemini-neko-cockpit`)**: Never match `#gemini-neko-pet-root` (`z-index: 2147482800`), `#gemini-neko-stats-bar` (inserted `afterend` of `[data-testid="agent-input-box"]`), or `#gemini-neko-observer-modal`.
   - **`RMvdesi/obsidian-prism` Coexistence**: If `document.documentElement.hasAttribute('data-ag-prism')` is detected:
     - `agy-wallpaper-prism` uses its own isolated `<style id="agy-prism-ws-css">`, `<div id="prism-ws-stage">`, and `data-agy-prism-skin` attributes (zero ID or attribute collision with `ag-prism-css` / `data-ag-cs-*`).
     - When `scheme === 'host-native'` or `'prism-default'`, `agy-wallpaper-prism` can read `obsidian-prism`'s active `data-ag-cs-palette` (`obsidian` / `warm`) and `data-ag-cs-accent` automatically!

---

## 5. UI Blueprint (1): Sidecar Studio Pane (`sidecar://agy-wallpaper-prism/prism_studio/`)

### 5.1 Architectural Role & Responsive Breakpoints

Opened via chat pill `[Open Prism Studio](sidecar://agy-wallpaper-prism/prism_studio/)` or the Aux Pane `+ -> Plugins > Prism Wallpaper Studio` menu (`SIDECAR_UI_ENTRYPOINT_AUX_PANE`), **Prism Studio** is the full-featured library manager, live workbench previewer, and Obsidian Style-Settings control deck.

| Viewport Width | Layout Mode | Column Grid | Behavior |
| :--- | :--- | :--- | :--- |
| **`320px – 459px`** *(Narrow Aux Pane)* | **Compact Rail** | `1` settings col / `2` thumb cols | Sticky `104px` Live Mini-Preview strip + scrollable tab body; slider readouts stay single-line |
| **`460px – 839px`** *(Standard Aux Pane)* | **Balanced Deck** | `1` settings col / `3` thumb cols | Sticky `128px` Live Mini-Preview + horizontal Scene Preset cards |
| **`>= 840px`** *(Expanded / Maximized)* | **Split Studio** | **2-Pane Master-Detail**: Left (`56%`) Live Interactive Workbench Preview + Wallpaper Grid; Right (`44%`, `380px–440px`) Style Settings & Playback Inspector | Zero wasted whitespace when maximized (`978×937`+) |

### 5.2 Visual Anatomy & Wireframe (Standard Aux Pane `420px`)

```text
┌──────────────────────────────────────────────────────────┐
│ ◆ Prism Wallpaper Studio          [● Applied] [🌐 EN/中] │ <- Sticky Header (40px)
├──────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────┐ │
│ │  [Live 21:9 Workbench Island Mini-Preview Over Media]│ │ <- Live Preview Card (116px)
│ │  ┌────┐ ┌─────────────────────────┐ ┌──────┐         │ │    Shows real wallpaper + live
│ │  │Nav │ │ Chat / Code Glass Island│ │ Aux  │         │ │    glass opacity, island gaps,
│ │  └────┘ └─────────────────────────┘ └──────┘         │ │    scrim & extracted accent!
│ │  ▶ Cyber Rain 4K   [VIDEO · 60fps]   ⏮ ⏯ ⏭ 🔇 ★    │ │ <- Transport Overlay Bar
│ └──────────────────────────────────────────────────────┘ │
│  [🖼 壁纸库]  [✦ 棱镜外观]  [▶ 播放与引擎]  [⚙ 宿主状态]   │ <- Pill / Underline Tabs (34px)
├──────────────────────────────────────────────────────────┤
│  SCENE PRESETS                                           │ <- Scrollable Body (min-height:0)
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────┐ │
│  │ ✦ 通透棱镜 │ │ ❖ 浮岛画境 │ │ ◐ 柔焦阅读 │ │ 🍃 省电│ │
│  │ Crystal    │ │ Islands ●  │ │ Focus      │ │ Eco    │ │
│  └────────────┘ └────────────┘ └────────────┘ └────────┘ │
│                                                          │
│  ▾ 布局与浮岛几何 (LAYOUT & ISLANDS)            [重置组] │ <- Collapsible <details open>
│    布局模式              [ 紧凑一体  | ● 浮岛画境 ]      │ <- Segmented Pill (.prism-seg)
│    浮岛间距 (Island Gap) ──────●────────   8 px    [↺]   │ <- Tactile Slider + Reset Dot
│    圆角风格              [ 锐利 | ● 均衡 | 柔和 ]        │
│    高光微边框            [ ● 标准 | 柔和 | 关闭 ]        │
│    浮岛投影                                      [●──]   │ <- .prism-switch (34x19px)
│                                                          │
│  ▾ 主题配色与动态强调色 (COLOR SCHEME & ACCENT) [重置组] │
│    明暗跟随              [ ● 跟随宿主 | 深色 | 浅色 ]    │
│    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│    │ ●●● 深空黑曜 │ │ ●●● 暖炭玄岩 │ │ ●●● 猫布奇诺 │    │ <- 8 Visual Swatch Cards
│    └──────────────┘ └──────────────┘ └──────────────┘    │
│    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│    │ ●●● 极地冰川 │ │ ●●● 松间玫瑰 │ │ ●●● 东京夜色 │    │
│    └──────────────┘ └──────────────┘ └──────────────┘    │
│    强调色来源   [● 壁纸取色 #669DF6] [预设] [自定义 🎨]  │
│    玻璃环境染印 (Tint)   ────●──────────   6 %     [↺]   │
│                                                          │
│  ▾ 毛玻璃与阅读保护 (GLASS & READABILITY)       [重置组] │
│    界面不透明度          ──────────●────  76 %     [↺]   │
│    磨砂模糊半径          ────────●──────  16 px    [↺]   │
│    背景压暗遮罩 (Scrim)  ────●──────────  26 %     [↺]   │
│    中央阅读暗角 (Vignette)                       [●──]   │
│    代码/终端对比度安全底线                       [●──]   │
└──────────────────────────────────────────────────────────┘
```

### 5.3 Detailed Tab Specifications for Sidecar Studio

1. **Tab 1 — `Library` (`壁纸库`)**:
   - **Toolbar**: Instant Search Input (`250ms` debounce, `/` shortcut to focus) + Upload Local Media button (`+ 导入`) + Rescan button (`↻`).
   - **Filter Pill Row**: `全部 (All)`, `创意工坊 (Workshop 431960)`, `视频 (Video)`, `网页 (Web)`, `场景 (Scene)`, `图片 (Image)`, `★ 收藏`, `播放列表 (Playlist)`.
   - **Thumbnail Grid (`aspect-ratio: 16/10`)**:
     - Lazy-loaded `<img loading="lazy">` thumbnails from loopback media server; hover over Video cards plays muted low-res preview or subtle zoom (`scale(1.03)`).
     - Card Badges: Top-left active checkmark (`✓` in `--prism-accent`), bottom-left format pill (`MP4`, `WEB`, `SCENE`, `IMG`), top-right hover action buttons (`★` Favorite, `＋` Add to Rotation Playlist).
     - Unsupported `Application` projects are filtered out cleanly; `Scene` items without WebGL support display a clear `预览静帧 (Preview Fallback)` badge.
   - **Drag-and-Drop Overlay**: Dropping `.png/.jpg/.webp/.gif/.mp4/.webm/.zip` anywhere onto the Studio pane uploads into `~/.agy-wallpaper-prism/imports/` and applies immediately.

2. **Tab 2 — `Prism Skin` (`棱镜外观` — Style Settings Core)**:
   - **4 Optical Scene Preset Cards**:
     - **`crystal` (通透棱镜)**: `layout: "flush"`, `glassOpacity: 0.68`, `glassBlur: 18`, `scrimOpacity: 0.22`, `vignette: true`, `grainAlpha: 0.02`.
     - **`islands` (浮岛画境 — Default)**: `layout: "islands"`, `islandGap: 8`, `cornerStyle: "balanced"`, `glassOpacity: 0.76`, `glassBlur: 16`, `scrimOpacity: 0.26`, `borders: "on"`, `shadows: "on"`.
     - **`focus` (柔焦阅读)**: `layout: "islands"`, `islandGap: 6`, `glassOpacity: 0.88`, `mediaBlur: 14`, `scrimOpacity: 0.42`, `vignette: true`, `grainAlpha: 0`.
     - **`eco` (静帧省电)**: `paused: true`, `glassBlur: 0` (`glassSurfaces: false`), `glassOpacity: 0.90`, `grainAlpha: 0`, `fpsCap: 30`.
   - **Per-Wallpaper Optical Memory Toggle**: *"为此壁纸单独保存外观配置 (Save Overrides for Active Wallpaper)"* — stores optical overrides (`scrimOpacity`, `mediaBlur`, `wallPos`, `scheme`, `accent`) keyed by `wallpaperId`, automatically recalling them whenever that wallpaper rotates back in!
   - **4 Collapsible `<details class="prism-section">` Groups**:
     1. *Layout & Island Geometry*: Layout Mode (`flush` | `islands`), Island Gap (`0–16px`), Workspace Margin (`0–16px`), Corner Style (`sharp` | `balanced` | `soft`), Specular Borders (`on` | `subtle` | `off`), Island Shadows (`on` | `off`).
     2. *Color Scheme & Dynamic Accent*: Theme Polarity (`auto` | `dark` | `light`), 8 Visual Swatch Cards (each showing 3 color dots: Sidebar / Base / Accent), Accent Source (`dynamic` | `palette` | `cobalt` | `iris` | `amber` | `emerald` | `rose` | `mono` | `custom`), Ambient Wallpaper Tint (`0%–18%`).
     3. *Glass & Readability Guardrails*: Master Glass Opacity (`30%–98%`), Glass Blur (`0–32px`), Scrim Opacity (`0%–92%`), Scrim Custom Color, Central Reading Vignette (`bool`), Code/Terminal Contrast Floor (`bool`).
     4. *Wallpaper Optics*: Fit (`cover` | `contain` | `fill`), Wallpaper Opacity (`5%–100%`), Wallpaper Blur (`0–64px`), Brightness (`40%–160%`), Contrast (`50%–150%`), Saturation (`0%–200%`), Optical Film Grain (`0%–15%`).

3. **Tab 3 — `Playback & Engine` (`播放与引擎` — Full DSH Parity)**:
   - **Playlist & Auto-Rotation**: Enable Rotation switch, Mode (`Shuffle 随机` | `Sequential 顺序`), Interval (`1m` / `5m` / `15m` / `30m` / `60m` / Custom minutes), Active Queue list with drag-reorder / clear.
   - **Video & Audio**: Mute switch (with autoplay policy tooltip), Volume slider (`0%–100%`), Playback Speed (`0.25×` – `2.0×`), Target FPS Cap (`30` / `60` / `120` / `Native`).
   - **Smart Lifecycle / Power Saving**:
     - `pauseOnUnfocus`: Auto-pause video/WebGL when Antigravity window loses focus (`document.hidden` / `window.onblur`).
     - `pauseOnMinimized`: Auto-pause when window minimized (`visibilitychange`).
     - `pauseOnBattery`: Auto-throttle/pause when `navigator.getBattery()` reports discharging & `< 30%` or OS `prefers-reduced-motion`.
   - **Web & Wallpaper Engine Properties**:
     - `interactiveWeb`: Forward pointer events to Web wallpaper (`pointer-events: auto` on stage when hovering empty island gaps or desktop mode).
     - Dynamic `project.json` User Properties renderer: Automatically renders Wallpaper Engine `general.properties` (sliders, booleans, combos, colors) and forwards them via `window.wallpaperPropertyListener.applyUserProperties(...)` inside Web/Scene iframes!

4. **Tab 4 — `Host & Diagnostics` (`宿主与状态`)**:
   - **Primary Action Card**:
     - **`✦ 应用棱镜皮肤到整个窗口 (Apply Prism Skin to Host)`** (`POST /api/host/apply`) + **`还原宿主默认外观 (Restore Host Default)`** (2-step armed confirmation).
     - Quick Popover Trigger Placement selector: `Composer/Statusbar Pill` *(Default)* | `Bottom-Left Glass Orb` | `Both` | `Shortcut Only (Ctrl+Alt+W)`.
   - **Telemetry & Paths**: Live CDP status (`port`, `DevToolsActivePort` detection, Passive Daemon state `attached | standby | yielded | disabled`, Kernel version), Steam Workshop `431960` auto-detected roots, Custom Local Directories manager (`+ Add Folder` / `Remove`), JSON Config Import/Export, Language (`Auto` / `zh-CN` / `en`).

---

### 5.4 Style-Settings Tactile Control Primitives (CSS Specification)

```css
/* Mandatory Viewport Lock — prevents the v0.3.1 197px height-collapse bug */
html, body, #app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--prism-studio-bg, rgb(var(--prism-base-rgb)));
  color: var(--prism-fg);
  font-family: var(--prism-font-sans);
  font-size: var(--prism-fs-sm);
  -webkit-font-smoothing: antialiased;
}

/* Tactile Slider Row with Default Tick, Tabular Readout & 1-Click Reset */
.prism-slider-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  grid-template-rows: auto auto;
  align-items: center;
  column-gap: 8px;
  row-gap: 5px;
  padding: 7px 0;
  border-top: 1px solid var(--prism-border-hairline);
}
.prism-slider-val {
  font-family: var(--prism-font-mono);
  font-size: var(--prism-fs-xs);
  font-variant-numeric: tabular-nums;
  color: var(--prism-fg-2);
  padding: 1px 5px;
  border-radius: var(--prism-r-xs);
  cursor: text;
}
.prism-slider-val:hover {
  background: rgba(var(--prism-pt-rgb), 0.06);
  color: var(--prism-fg);
}
/* 1-Click Reset Button: faint & non-distracting at default, lit when modified */
.prism-reset-btn {
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: var(--prism-r-xs);
  background: transparent;
  color: var(--prism-fg-faint);
  opacity: 0;
  pointer-events: none;
  cursor: pointer;
  transition: opacity var(--prism-dur-fast) ease, color var(--prism-dur-fast) ease, background var(--prism-dur-fast) ease;
}
.prism-slider-row[data-dirty="true"] .prism-reset-btn {
  opacity: 0.78;
  pointer-events: auto;
}
.prism-slider-row[data-dirty="true"] .prism-reset-btn:hover {
  opacity: 1;
  color: var(--prism-accent);
  background: var(--prism-accent-soft);
}
.prism-range {
  grid-column: 1 / -1;
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 18px;
  background: transparent;
  cursor: pointer;
}
.prism-range::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 999px;
  background: linear-gradient(
    to right,
    var(--prism-accent) 0%,
    var(--prism-accent) var(--prism-pct, 50%),
    rgba(var(--prism-pt-rgb), 0.14) var(--prism-pct, 50%),
    rgba(var(--prism-pt-rgb), 0.14) 100%
  );
}
.prism-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  margin-top: -5px;
  border-radius: 50%;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.20);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
  transition: transform var(--prism-dur-fast) var(--prism-ease-spring);
}
.prism-range:active::-webkit-slider-thumb {
  transform: scale(1.15);
}
```

---

## 6. UI Blueprint (2): In-Host Quick Prism Popover (`#agy-prism-popover`)

### 6.1 Isolation, Lifecycle & Trigger Architecture

Injected into the host Hub/Workbench via CDP (`Page.addScriptToEvaluateOnNewDocument` + `Runtime.evaluate`) alongside the skin kernel, `host/panel-inject.js` is a zero-dependency ES2020 IIFE mounted inside `<div id="agy-prism-popover">` (`all: initial; position: fixed; z-index: 45`) with `<style id="agy-prism-popover-css">`.

#### Three Harmonious Ways to Summon Quick Prism
1. **Global Shortcut (`Ctrl+Alt+W` / `Cmd+Alt+W`)**:
   - Toggles the popover from anywhere in the host window.
   - Pressing `Escape` closes the popover (automatically yields without swallowing `Escape` if a host modal `[role="dialog"][aria-modal="true"]`, `[role="menu"]`, or `.quick-input-widget` is open).
2. **Subtle Statusbar / Composer-Footer Prism Pill (`#agy-prism-pill` — Primary Visual Trigger)**:
   - **In Antigravity Hub**: Appended cleanly inside `.agy-composer-footer` (`margin-left: 6px; height: 22px; padding: 0 8px; border-radius: 999px; font-size: 11px`), showing a 12px Prism diamond glyph + current scheme dot (`◆ Prism`). Note: `#gemini-neko-stats-bar` mounts *outside* `[data-testid="agent-input-box"]` (`afterend`), whereas `.agy-composer-footer` is the internal toolbar row, so zero collision occurs!
   - **In VS Code / IDE Workbench**: Inserted into `.part.statusbar > .right-items` as a native `22px` statusbar item.
3. **Optional Corner Glass Orb (`.prism-corner-orb` — Fallback / Secondary Trigger)**:
   - Rendered automatically whenever `.agy-composer-footer` / `.part.statusbar` is absent (e.g., Home screen or collapsed views) or when `triggerMode` is `"corner"` or `"both"`.
   - `28×28px` frosted pill anchored at `left: sidebar.right + 10px, bottom: 12px`, dynamically dodging `.agy-composer` bounding rects, resting at `opacity: 0.45` and rising to `opacity: 1.0` on hover.

### 6.2 Quick Prism Popover Wireframe (`384px × max 560px`)

```text
┌────────────────────────────────────────────────────┐
│ ◆ Prism   v1.0  [● 已连接]     ⏮  ⏯  ⏭  [↗]  [×]  │ <- Draggable Header (40px, dblclick resets pos)
├────────────────────────────────────────────────────┤
│  SCENE   [✦ 通透] [❖ 浮岛●] [◐ 柔焦] [🍃 省电]     │ <- Topdeck Preset Strip + Quick Layout Toggle
│  LAYOUT  [ 紧凑一体 Flush  |  ● 浮岛画境 Islands ] │
├────────────────────────────────────────────────────┤
│  [ 🖼 速选壁纸 ]    [ ✦ 光学精调 ]    [ ⚙ 状态 ]    │ <- 3 Segmented Subtabs
├────────────────────────────────────────────────────┤
│  配色  (●黑曜) (○暖炭) (○Mocha) (○Nord) (○Rosé) › │ <- Horizontal Scrollable Swatch Pills
│  强调色         [● 动态壁纸取色 #669DF6 ] [预设 ▾] │
│  ────────────────────────────────────────────────  │
│  界面不透明度    ──────────●────   76 %      [↺]   │ <- 180ms debounced live RPC push (`prefs.set`)
│  浮岛间距        ──────●────────    8 px     [↺]   │
│  背景压暗遮罩    ────●──────────   26 %      [↺]   │
│  壁纸柔焦模糊    ●──────────────    0 px     [↺]   │
│  ────────────────────────────────────────────────  │
│  毛玻璃磨砂界面                              [●──] │
│  中央阅读暗角                                [●──] │
│  窗口失焦自动暂停视频                        [●──] │
├────────────────────────────────────────────────────┤
│  当前: Cyber Rain 4K (MP4)     [还原宿主默认外观]  │ <- Footer Bar (2-step armed danger button)
└────────────────────────────────────────────────────┘
```

- **`[↗]` ("Open Full Studio") Button**: Navigates/opens the full `Prism Studio` Sidecar Aux Pane (or copies/triggers `sidecar://agy-wallpaper-prism/prism_studio/`), bridging the quick in-host popover and full Studio seamlessly.
- **Offline Resilience**: If `window.__agyPrismCall` is not yet bound (e.g., passive daemon in standby), displays a calm inline status banner with one-click retry and never throws uncaught exceptions.

---

## 7. Unified Visual Preferences Schema & Cross-Surface Sync Contract

Both **Sidecar Studio (`prefs-store.mjs`)**, **Host Skin Kernel (`wallpaper-inject.js`)**, and **In-Host Quick Popover (`panel-inject.js` / `panel-rpc.mjs`)** MUST read and write this canonical preference schema (`~/.agy-wallpaper-prism/prefs.json`):

```ts
export interface PrismVisualPrefs {
  // Active Source & Playlist
  wallpaperId: string;                              // '' when none
  kind: 'image' | 'video' | 'web' | 'scene' | 'none';
  sourcePath: string;
  sourceUrl: string;
  fit: 'cover' | 'contain' | 'fill';                // default: 'cover'
  wallPos: string;                                  // default: '50% 50%'

  // Optical Scene Preset & Per-Wallpaper Memory
  preset: 'crystal' | 'islands' | 'focus' | 'eco' | 'custom'; // default: 'islands'
  perWallpaperOverrides: Record<string, Partial<PrismVisualPrefs>>;

  // Layout & Concentric Geometry
  layoutMode: 'islands' | 'flush';                  // default: 'islands'
  islandGap: number;                                // 0..16 (px), default: 8
  workspacePad: number;                             // 0..16 (px), default: 8
  cornerStyle: 'sharp' | 'balanced' | 'soft';       // default: 'balanced'
  borders: 'on' | 'subtle' | 'off';                 // default: 'on'
  shadows: boolean;                                 // default: true

  // Adaptive Theme, Color Scheme & Dynamic Accent
  themeMode: 'auto' | 'dark' | 'light';             // default: 'auto'
  colorScheme:
    | 'prism-default'
    | 'warm-carbon'
    | 'catppuccin'
    | 'nord'
    | 'rose-pine'
    | 'tokyo-night'
    | 'gruvbox'
    | 'host-native';                                // default: 'prism-default'
  accentMode:
    | 'dynamic'
    | 'palette'
    | 'cobalt'
    | 'iris'
    | 'amber'
    | 'emerald'
    | 'rose'
    | 'mono'
    | 'custom';                                     // default: 'dynamic'
  customAccent: string;                             // default: '#669DF6'
  extractedAccent: {                                // cached per active wallpaper
    wallpaperId: string;
    darkHex: string;
    lightHex: string;
    tintRgb: string;                                // "R, G, B"
  } | null;
  wallTintMix: number;                              // 0..0.18, default: 0.06

  // Glass & Readability Guardrails
  glassSurfaces: boolean;                           // default: true
  glassOpacity: number;                             // 0.30..0.98, default: 0.76
  glassBlur: number;                                // 0..32 (px), default: 16
  scrimOpacity: number;                             // 0..0.92, default: 0.26
  scrimColor: string;                               // default: 'auto'
  vignette: boolean;                                // default: true
  contrastFloor: boolean;                           // default: true (locks >=0.72/0.84 on code/xterm)

  // Wallpaper Media Optics
  mediaOpacity: number;                             // 0.05..1.00, default: 1.0
  mediaBlur: number;                                // 0..64 (px), default: 0
  mediaBrightness: number;                          // 0.40..1.60, default: 1.0
  mediaContrast: number;                            // 0.50..1.50, default: 1.0
  mediaSaturate: number;                            // 0.00..2.00, default: 1.05
  grainAlpha: number;                               // 0.00..0.15, default: 0.022

  // Playback, Rotation & Smart Power Lifecycle
  muted: boolean;                                   // default: true
  volume: number;                                   // 0..1, default: 0.5
  paused: boolean;                                  // default: false
  playbackRate: number;                             // 0.25..2.0, default: 1.0
  fpsCap: 0 | 30 | 60 | 120;                        // 0 = native, default: 60
  pauseOnUnfocus: boolean;                          // default: true
  pauseOnMinimized: boolean;                        // default: true
  pauseOnBattery: boolean;                          // default: true
  interactiveWeb: boolean;                          // default: false
  rotationEnabled: boolean;                         // default: false
  rotationMode: 'shuffle' | 'sequential';           // default: 'shuffle'
  rotationIntervalSec: number;                      // 60..86400, default: 900 (15m)

  // UI & Trigger Ergonomics
  triggerMode: 'pill' | 'corner' | 'both' | 'shortcut-only'; // default: 'both'
  language: 'auto' | 'zh-CN' | 'en';                // default: 'auto'
}
```

### Cross-Surface Live Sync Flow (`< 16ms` Zero-Flicker Update)
1. **User drags slider in Sidecar Studio OR In-Host Popover** -> debounced (`120ms`–`180ms`, immediate on `change`/`pointerup`) write to `prefs.json` via `/api/prefs` (`window.sidecar.fetch`) or `__agyPrismCall` (`prefs.set`).
2. **Daemon broadcasts `{ event: "state", data }` to all attached Hub/Workbench targets** -> `window.__agyPrismSkin.setPrefs(next)` rebuilds `#agy-prism-ws-css` text in-place **without unmounting `<video>` or `<iframe>`**, preserving playback frame continuity.
3. **Host -> Sidecar Iframe Theme Bridge**: Whenever `themeMode`, `colorScheme`, or `extractedAccent` changes on the host, the host runtime posts `{ type: 'prism-theme-sync', payload: { theme, colorScheme, accent, cssVars } }` to `iframe[data-testid="sidecar-iframe"]` (`targetOrigin: '*'`), keeping the Sidecar Studio pane visually indistinguishable from native host chrome.
