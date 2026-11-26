/**
 * Realistic Mock Antigravity 2.34.0 / 2.35.1 Hub + IDE Workbench HTML Generator (`test/mock-hub-template.mjs`)
 *
 * Mirrors verified Antigravity 2.34.0 & 2.35.1 Hub DOM & CSS specificity (`body.dark` / `body.light` at `0,1,1`,
 * inner `#root .dark` token reset, `.browser-hole-opaque` non-browser pane shields, 3-layer Electron
 * `WebContentsView` `[data-browser-hole]` + `data-has-browser-hole="true"` ancestor chain up to `<html>` & `<body>`,
 * 2.35.1 `<div class="shrink-0 bg-sidebar">` wrapper around `[data-testid="title-menu-bar"]` + `P$c` dropdown
 * `[data-browser-occluder="true"]` + dynamic WCO height simulation, 5 empty/active conversation modes
 * (`chat` | `empty-en` | `empty-zh` | `empty-mask` | `empty-pseudo`) with `<button><p>...</p></button>` starter cards,
 * Chinese localization fixtures & upstream `dom-translator.js` simulation, `.settings-modal-container` + inner
 * `.dark` & `hover:bg-background` tabs, `[role="menu"]` popovers, `.monaco-workbench` IDE fallback elements, and
 * sibling plugin overlays (`#ag-usage-monitor-capsule`, `#ag-context-meter`, `#gemini-neko-pet-root`)).
 */
export function buildMockAntigravityHubHtml({
  initialTheme = 'dark',
  title = 'Antigravity 2.35.1 — agy-wallpaper-prism',
  browserHoleActive = false,
} = {}) {
  const holeAncAttr = browserHoleActive ? ' data-has-browser-hole="true"' : '';
  const bodyHoleAttr = browserHoleActive
    ? ' data-has-browser-hole="true" data-has-three-layer-browser-hole="true"'
    : '';
  const leafHoleVal = browserHoleActive ? 'true' : 'false';

  return `<!doctype html>
<html lang="zh-CN" class="${initialTheme}"${holeAncAttr}>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style id="antigravity-native-tokens">
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Microsoft YaHei UI', sans-serif;
      font-size: 13px;
      -webkit-font-smoothing: antialiased;
    }

    /* Specificity (0,1,1) — exact Antigravity 2.0/2.34.0/2.35.1 Hub cascade */
    body.dark {
      --background: #070708;
      --body-background: #070708;
      --shell: #070708;
      --content: #070708;
      --foreground: #ffffff;
      --card: #131317;
      --card-border: rgba(255, 255, 255, 0.07);
      --color-card-border: rgba(255, 255, 255, 0.09);
      --card-edge: rgba(255, 255, 255, 0.08);
      --glass: rgba(19, 19, 23, 0.78);
      --glass-border: rgba(255, 255, 255, 0.14);
      --glass-highlight: rgba(255, 255, 255, 0.08);
      --sidebar: #111114;
      --sidebar-muted: rgba(255, 255, 255, 0.04);
      --sidebar-secondary: rgba(255, 255, 255, 0.07);
      --popover: #16161c;
      --border: rgba(255, 255, 255, 0.06);
      --primary: #2f71e3;
      --primary-foreground: #ffffff;
      --link: #6a9fcb;
      background-color: var(--background);
      color: var(--foreground);
    }

    body.light {
      --background: #f7f7f8;
      --body-background: #f7f7f8;
      --shell: #f7f7f8;
      --content: #f7f7f8;
      --foreground: #0f172a;
      --card: #ffffff;
      --card-border: rgba(15, 23, 42, 0.09);
      --color-card-border: rgba(15, 23, 42, 0.11);
      --card-edge: rgba(15, 23, 42, 0.09);
      --glass: rgba(255, 255, 255, 0.82);
      --glass-border: rgba(15, 23, 42, 0.12);
      --glass-highlight: rgba(255, 255, 255, 0.65);
      --sidebar: #eeeef1;
      --sidebar-muted: rgba(15, 23, 42, 0.04);
      --sidebar-secondary: rgba(15, 23, 42, 0.07);
      --popover: #ffffff;
      --border: rgba(15, 23, 42, 0.08);
      --primary: #0066cc;
      --primary-foreground: #ffffff;
      --link: #0055aa;
      background-color: var(--background);
      color: var(--foreground);
    }

    #root, #root > div, #root > div > div {
      width: 100%;
      height: 100%;
      background-color: var(--background);
    }

    /* Antigravity 2.34.0+ layout & inner .dark/.light variable reset + .browser-hole-opaque + --shell-canvas */
    #root .dark {
      --background: #070708;
      --color-background: #070708;
      --foreground: #ffffff;
      --color-foreground: #ffffff;
      --content: #070708;
      --sidebar: #111114;
      --color-sidebar: #111114;
    }
    #root .light {
      --background: #f7f7f8;
      --color-background: #f7f7f8;
      --foreground: #0f172a;
      --color-foreground: #0f172a;
      --content: #f7f7f8;
      --sidebar: #eeeef1;
      --color-sidebar: #eeeef1;
    }
    .dark .agy-inset-shell {
      --shell-canvas: color-mix(in srgb, #000 38%, var(--background));
    }
    .browser-hole-opaque:not([data-has-browser-hole="true"]) {
      background-color: var(--background);
    }
    body[data-has-browser-hole="true"] .agy-inset-shell .agy-sheet[data-sheet-inset] .browser-hole-opaque {
      background-color: var(--shell-canvas);
    }
    body[data-has-browser-hole="true"] .browser-hole-opaque:not([data-has-browser-hole="true"]) {
      background-color: var(--background);
    }
    .agy-sheet[data-sheet-inset] [data-main-content-body] {
      background-color: var(--background);
    }
    [data-main-content-body],
    [data-side-panel-body] {
      position: relative;
    }
    [data-main-content-body]::after,
    .agy-sheet [data-side-panel-body]::after {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      border: 1px solid var(--card-border);
      opacity: 0.72;
    }

    /* Antigravity 2.34.0+ 3-Layer WCV native hole punch-through */
    html[data-has-browser-hole="true"],
    body[data-has-browser-hole="true"] {
      --body-background: transparent;
      background-color: transparent;
    }
    #root[data-has-browser-hole="true"],
    #root > div[data-has-browser-hole="true"],
    #root > div > div[data-has-browser-hole="true"],
    .agy-shell[data-has-browser-hole="true"],
    .browser-hole-ancestor[data-has-browser-hole="true"],
    [data-pane-id][data-has-browser-hole="true"],
    [data-main-content-body][data-has-browser-hole="true"],
    [data-side-panel-body][data-has-browser-hole="true"],
    .agy-sheet[data-has-browser-hole="true"],
    [data-testid="builtin-browser-pane"][data-has-browser-hole="true"],
    [data-browser-hole="true"] {
      background-color: transparent !important;
      background-image: none !important;
    }

    .bg-background { background-color: var(--color-background, var(--background)); }
    .bg-foreground { background-color: var(--color-foreground, var(--foreground)); }
    .text-background { color: var(--color-background, var(--background)); }
    .ag-cs-home-heat-hint { background-color: var(--color-foreground, var(--foreground)); color: var(--color-background, var(--background)); }
    .hover\\:bg-background { background-color: transparent; }
    .hover\\:bg-background:hover { background-color: var(--color-background, var(--background)); }
    .bg-sidebar { background-color: var(--color-sidebar, var(--sidebar)); }
    .bg-card { background-color: var(--color-card, var(--card)); border: 1px solid var(--card-border); }
    .bg-popover { background-color: var(--popover); }
    .sticky, [data-sidebar-section-drop-id] { position: sticky; }
    .agy-card { background-color: transparent; }

    .agy-shell {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      background-color: var(--shell);
    }

    /* Antigravity 2.35.1 wrapper <div class="shrink-0 bg-sidebar"> around [data-testid="title-menu-bar"] */
    #v235-topbar-wrapper {
      height: 35px;
      flex-shrink: 0;
      width: 100%;
      background-color: var(--sidebar);
    }

    [data-testid="title-menu-bar"] {
      position: relative;
      height: 100%;
      width: 100%;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 10px;
      background-color: var(--sidebar);
      border-bottom: 1px solid var(--border);
      font-size: 12px;
      user-select: none;
    }

    .hub-title-left { display: flex; align-items: center; gap: 6px; font-weight: 600; letter-spacing: 0.01em; }
    .hub-title-right {
      display: flex;
      align-items: center;
      gap: 10px;
      opacity: 0.82;
      margin-right: max(0px, calc(var(--prism-wco-inset-right, 0px) - var(--prism-workspace-pad, 0px)));
    }
    .hub-badge {
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 500;
      background: rgba(102, 157, 246, 0.16);
      color: #8ab4f8;
      border: 1px solid rgba(102, 157, 246, 0.32);
    }
    .hub-menu-btn {
      background: transparent;
      border: none;
      color: inherit;
      padding: 2px 7px;
      font: inherit;
      font-weight: 500;
      cursor: pointer;
    }

    [data-testid="sidebar-split"] {
      display: flex;
      flex: 1;
      min-height: 0;
      width: 100%;
    }

    .agy-sidebar {
      width: 228px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      padding: 12px;
      gap: 12px;
      background-color: var(--sidebar);
    }

    .split-gutter {
      width: 1px;
      flex-shrink: 0;
      background-color: var(--border);
      cursor: col-resize;
    }

    [data-testid="aux-pane-split"] {
      display: flex;
      flex: 1;
      min-width: 0;
      min-height: 0;
    }

    .hub-main-pane {
      flex: 1;
      min-width: 0;
      min-height: 0;
      display: flex;
      flex-direction: column;
      background-color: var(--background);
    }

    [data-testid="conversation-view"] {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 20px 28px 12px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    [data-testid="conversation-view"][data-mock-mode^="empty-"] {
      align-items: center;
      justify-content: center;
      gap: 16px;
    }

    /* Req #1 Empty New-Conversation Greeting, Starter Cards & Pseudo Watermark Fixtures */
    .mock-empty-hero {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      max-width: 560px;
      padding: 18px 12px;
    }
    .mock-welcome-heading {
      position: relative;
      z-index: 1;
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      line-height: 1.3;
      text-align: center;
    }
    .mock-welcome-pseudo-watermark {
      position: relative;
      width: 480px;
      padding-top: 72px;
      text-align: center;
    }
    .mock-welcome-pseudo-watermark::before {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      opacity: 0.24;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'%3E%3Cpath d='M48 10L82 84H64L48 48L32 84H14Z' fill='%23ffffff'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: center top;
      background-size: 96px 96px;
    }
    .mock-starter-grid {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      justify-content: center;
      max-width: 560px;
    }
    .mock-starter-card {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
      width: 170px;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid var(--card-border);
      background: var(--card);
      color: inherit;
      font: inherit;
      font-size: 12px;
      text-align: left;
      cursor: pointer;
    }
    .mock-starter-card p {
      margin: 0;
      line-height: 1.35;
    }

    .nav-section-label {
      font-size: 10.5px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      opacity: 0.56;
      padding: 0 6px;
      margin-bottom: 4px;
    }
    .mock-section-h2 {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 10.5px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      line-height: 1.25;
      color: inherit;
    }
    .mock-section-h2-toggle {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: transparent;
      border: none;
      padding: 0;
      color: inherit;
      font: inherit;
      letter-spacing: inherit;
      text-transform: inherit;
      cursor: pointer;
    }
    .mock-section-action-btn {
      width: 20px;
      height: 20px;
      min-width: 20px;
      min-height: 20px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      border-radius: 5px;
      border: none;
      background: transparent;
      color: inherit;
      font-size: 11px;
      cursor: pointer;
      opacity: 0.72;
    }
    .mock-project-btn {
      position: relative;
      width: 100%;
      min-height: 32px;
      text-align: left;
      padding: 6px 10px;
      border: none;
      border-radius: 8px;
      background-color: var(--sidebar);
      color: inherit;
      font: inherit;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .mock-conv-row {
      min-height: 32px;
      padding: 5px 10px;
      border-radius: 8px;
      font-size: 12.5px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      cursor: pointer;
    }
    .mock-conv-row.pl-\\[30px\\] {
      padding-left: 30px;
    }
    .mock-row-actions {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 2px;
      flex-shrink: 0;
    }
    .nav-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 7px 10px;
      border-radius: 7px;
      font-size: 12.5px;
      opacity: 0.86;
    }
    .nav-item.active {
      background: rgba(102, 157, 246, 0.15);
      border: 1px solid rgba(102, 157, 246, 0.32);
      opacity: 1;
      font-weight: 600;
    }
    .dot-online {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #50a37b;
      box-shadow: 0 0 8px rgba(80, 163, 123, 0.65);
    }

    .msg-user {
      align-self: flex-end;
      max-width: 80%;
      padding: 11px 15px;
      border-radius: 12px;
      line-height: 1.5;
    }
    .msg-agent {
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 94%;
      line-height: 1.55;
    }

    pre.md-code-block {
      margin: 0;
      padding: 12px 14px;
      border-radius: 10px;
      font-family: 'Cascadia Code', Consolas, monospace;
      font-size: 12px;
      line-height: 1.5;
      background-color: var(--card);
      border: 1px solid var(--card-border);
      overflow-x: auto;
    }
    .tok-kw { color: #c792ea; }
    .tok-fn { color: #82aaff; }
    .tok-str { color: #c3e88d; }
    .tok-cm { color: #697098; }

    [data-testid="background-task-command"] {
      padding: 10px 14px;
      border-radius: 10px;
      background-color: #0d0f14;
      border: 1px solid var(--card-border);
      font-family: 'Cascadia Code', Consolas, monospace;
      font-size: 11.5px;
    }

    .composer-dock {
      padding: 8px 28px 16px;
      flex-shrink: 0;
    }
    .mock-composer-outer-wrap {
      display: flex;
      flex-direction: column;
      width: 100%;
      flex-shrink: 0;
    }
    #antigravity\.agentSidePanelInputBox.surface-composer {
      position: relative;
      display: flex;
      flex-direction: column;
      padding: 1px;
      border-radius: 16px;
      background-color: var(--color-card-border);
    }
    .mock-composer-context-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 12px 4px;
      font-size: 11px;
      border-radius: 14px 14px 0 0;
      background-color: var(--glass);
      color: var(--foreground);
    }
    .surface-composer-card {
      position: relative;
      padding: 12px 14px 10px;
      border-radius: 15px;
      background-color: var(--card);
      border: 1px solid var(--card-border);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .mock-composer-attachment-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      align-self: flex-start;
      padding: 2px 8px;
      border-radius: 999px;
      border: 1px solid var(--card-border);
      background-color: var(--glass);
      font-size: 11px;
    }
    #hub-composer-input {
      width: 100%;
      min-height: 36px;
      resize: none;
      border: none;
      outline: none;
      background: transparent;
      color: inherit;
      font-family: inherit;
      font-size: 13px;
    }
    .agy-composer-footer {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11.5px;
      opacity: 0.9;
    }
    .footer-chip {
      padding: 2px 8px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--border);
    }
    .hub-send-btn {
      padding: 3px 10px;
      border-radius: 7px;
      border: 1px solid rgba(102, 157, 246, 0.45);
      background: rgba(102, 157, 246, 0.22);
      color: inherit;
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
    }

    .hub-aux-pane {
      width: 410px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      padding: 12px;
      gap: 10px;
      background-color: var(--sidebar);
    }
    .hub-aux-pane[data-has-browser-hole="true"] {
      padding: 0;
      background-color: transparent !important;
      border: none !important;
      box-shadow: none !important;
    }
    .aux-card {
      padding: 10px 12px;
      border-radius: 9px;
      background-color: var(--card);
      border: 1px solid var(--card-border);
      font-size: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .browser-toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 12px;
      background-color: var(--sidebar);
      border-bottom: 1px solid var(--border);
      font-size: 11.5px;
      user-select: none;
    }
    .browser-url-pill {
      flex: 1;
      padding: 3px 9px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--border);
      font-family: 'Cascadia Code', Consolas, monospace;
      font-size: 11px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  </style>
</head>
<body class="${initialTheme}"${bodyHoleAttr}>
  <div id="root"${holeAncAttr}>
    <div id="v234-root-theme-wrap" class="h-full w-full ${initialTheme}"${holeAncAttr}>
      <div${holeAncAttr}>
        <div class="agy-shell bg-background"${holeAncAttr}>
          <div id="v235-topbar-wrapper" class="shrink-0 bg-sidebar">
            <header data-testid="title-menu-bar">
              <div class="hub-title-left">
                <span id="hub-brand-label">Antigravity</span>
                <button id="hub-title-menu-btn" type="button" class="hub-menu-btn" data-testid="title-menu-bar-item">Workspace</button>
                <button id="hub-title-view-btn" type="button" class="hub-menu-btn" data-testid="title-menu-bar-item">View</button>
                <button id="hub-title-window-btn" type="button" class="hub-menu-btn" data-testid="title-menu-bar-item">Window</button>
                <span class="hub-badge">v2.2.0</span>
              </div>
              <div id="hub-title-menu-dropdown" data-browser-occluder="true" class="surface-opaque bg-sidebar" style="position:absolute;top:100%;left:14px;z-index:8000;width:200px;padding:6px 8px;pointer-events:none;visibility:hidden">
                <div id="hub-dropdown-inner-card" style="background-color:rgba(30,32,42,0.96);padding:5px 8px;border-radius:6px">Open Workspace</div>
              </div>
              <div id="titlebar-fixed-probe" style="position:fixed;top:0;left:0;width:4px;height:4px;pointer-events:none;opacity:0"></div>
              <div class="hub-title-right">
                <span>Swarm · v2.2</span>
                <span>Zero-Enable CDP</span>
              </div>
            </header>
          </div>

          <div data-testid="sidebar-split"${holeAncAttr}>
            <aside class="agy-sidebar bg-sidebar">
              <div>
                <div id="hub-sidebar-sticky-projects" data-index="0" data-sidebar-section-drop-id="main-section-header" class="bg-sidebar" style="position: sticky; top: 0px; z-index: 10; width: 100%">
                  <div data-testid="section-header" data-title="Projects">
                    <div id="hub-sidebar-sticky-inner" class="group/section-header bg-sidebar nav-section-label" style="display:flex;align-items:center;justify-content:space-between;gap:4px">
                      <h2 class="mock-section-h2"><button id="hub-sidebar-projects-title-btn" type="button" class="mock-section-h2-toggle"><span id="hub-sidebar-projects-label">Projects</span></button></h2>
                      <div style="display:inline-flex;align-items:center;gap:2px">
                        <button id="hub-proj-filter-btn" type="button" class="mock-section-action-btn" title="Filter projects">F</button>
                        <button id="hub-proj-add-btn" type="button" class="mock-section-action-btn" title="New project">+</button>
                      </div>
                    </div>
                  </div>
                </div>
                <div id="hub-project-folder-wrap" class="bg-sidebar" data-index="1" data-sidebar-section-drop-id="proj-uuid-1" data-sidebar-section-collapsed="false" style="padding: 4px 0 2px">
                  <div class="group/header" style="position:relative">
                    <div class="relative w-full group/headerbtn">
                      <button id="hub-project-header-btn" type="button" data-project-card="true" data-testid="project-header" aria-expanded="true" class="rounded-lg bg-sidebar mock-project-btn"><span>Antigravity plugins</span><div id="project-header-fixed-probe" style="position:fixed;top:0;left:0;width:4px;height:4px;pointer-events:none;opacity:0"></div></button>
                    </div>
                    <div class="absolute mock-row-actions" style="position:absolute;right:6px;top:6px"><button id="hub-project-more-btn" type="button" class="mock-section-action-btn" title="Project actions">⋯</button></div>
                  </div>
                </div>
                <div id="hub-proj-child-slot-1" data-sidebar-section-id="proj-uuid-1">
                  <div id="hub-proj-child-1" data-testid="conversation-row-sidebar" data-selected="true" class="nav-item active agy-sidebar-row mock-conv-row pl-[30px]">
                    <span>agy-wallpaper-prism</span>
                    <span class="dot-online"></span>
                  </div>
                </div>
                <div id="hub-proj-child-slot-2" data-sidebar-section-id="proj-uuid-1">
                  <div id="hub-proj-child-2" data-testid="conversation-row-sidebar" class="nav-item agy-sidebar-row mock-conv-row pl-[30px]"><span>antigravity-observer</span></div>
                </div>
                <div id="hub-sidebar-sticky-conversations" data-index="2" data-sidebar-section-drop-id="conversations-section-header" class="bg-sidebar" style="position: sticky; top: 0px; z-index: 9; width: 100%; margin-top: 6px">
                  <div data-testid="section-header" data-title="Conversations">
                    <div id="hub-sidebar-conv-inner" class="group/section-header bg-sidebar nav-section-label" style="display:flex;align-items:center;justify-content:space-between;gap:4px">
                      <h2 class="mock-section-h2"><button id="hub-sidebar-conv-title-btn" type="button" class="mock-section-h2-toggle"><span id="hub-sidebar-conv-label">Conversations</span></button></h2>
                    </div>
                  </div>
                </div>
                <div id="hub-standalone-conv-row" data-testid="conversation-row-sidebar" class="nav-item agy-sidebar-row mock-conv-row">
                  <span>Quick Prism Check</span>
                  <span style="font-size:10.5px;opacity:0.65">Now</span>
                </div>
              </div>
              <div>
                <div class="nav-section-label">Swarm v2.2 Roster</div>
                <div class="nav-item"><span>@coordinator</span><span class="dot-online"></span></div>
                <div class="nav-item"><span>@resilience-designer</span><span class="dot-online"></span></div>
                <div class="nav-item"><span>@gentle-skin-architect</span><span class="dot-online"></span></div>
                <div class="nav-item"><span>@crash-forensics</span><span class="dot-online"></span></div>
                <div class="nav-item active"><span>@v2-verifier</span><span class="dot-online"></span></div>
              </div>
              <div style="margin-top:auto">
                <div class="nav-section-label">Enabled Plugins</div>
                <div class="nav-item active"><span>◆ Wallpaper Prism</span><span style="font-size:10.5px;opacity:0.7">v2.2.0</span></div>
                <div class="nav-item"><span>🐾 Gemini Neko</span><span style="font-size:10.5px;opacity:0.7">HUD</span></div>
              </div>
            </aside>

            <div class="split-gutter" title="Resize Sidebar"></div>

            <div style="display:flex;flex:1;min-width:0;min-height:0"${holeAncAttr}>
              <div data-testid="aux-pane-split"${holeAncAttr}>
                <main id="hub-main-pane" class="hub-main-pane browser-hole-opaque">
                  <section data-testid="conversation-view" data-mock-mode="chat">
                    <div class="msg-user bg-card">
                      Verify <strong>Gentle Fail-Open v2.2</strong> on Antigravity <code>2.35.1</code>: zero-enable CDP, first-frame media gate, and synchronous <code>[data-browser-hole]</code> rounded GPU cutout.
                    </div>

                    <div class="msg-agent">
                      <div>
                        Active <code>data-agy-prism-wallpaper="ready"</code> with <code>z-index: -1</code> inert stage and synchronous <code>clip-path: path(...)</code> over Built-in Browser <code>clipView (z=0)</code>:
                      </div>

                      <svg id="chat-inline-svg" width="64" height="64" viewBox="0 0 64 64" style="display:block;margin:0 auto;opacity:0.4">
                        <circle cx="32" cy="32" r="24" fill="none" stroke="currentColor" stroke-width="3" />
                      </svg>

                      <pre class="md-code-block"><code><span class="tok-cm">// Gentle Fail-Open v2.2: decode Frame 1 first, then punch rounded [data-browser-hole]</span>
<span class="tok-kw">export async function</span> <span class="tok-fn">mountGentlePrismStage</span>(engine, wallpaperId) {
  <span class="tok-kw">const</span> state = <span class="tok-kw">await</span> engine.<span class="tok-fn">applyWallpaper</span>(wallpaperId, {
    startupMode: <span class="tok-str">'gentle-auto'</span>,
    liveBootDelay: <span class="tok-fn">1.5</span>,
    layoutMode: <span class="tok-str">'islands'</span>,
  });
  <span class="tok-kw">return</span> state.activePayload;
}</code></pre>

                      <div data-testid="background-task-command">
                        <div class="xterm">
                          <div class="xterm-viewport">
                            <div class="xterm-rows" style="color:#d4d8e8">
                              <div><span style="color:#50a37b">✓</span> [cdp-bridge] 0 Page.enable · 0 Runtime.enable · lazy panel.js (0 KB boot)</div>
                              <div><span style="color:#50a37b">✓</span> [browser-hole] Synchronous CCW rounded clip-path cutout (r=12px, alpha=0)</div>
                              <div><span style="color:#669df6">◆</span> [boot-canary] Two-phase fsync canary healthy · Ctrl+Alt+Shift+R armed</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  <div class="composer-dock">
                    <div id="mock-composer-outer-wrap" class="mock-composer-outer-wrap" data-testid="agent-input-box">
                      <div id="antigravity.agentSidePanelInputBox" class="surface-composer">
                        <div id="mock-composer-context-bar" class="mock-composer-context-bar"><span>Context: agy-wallpaper-prism (v2.2.0)</span><span style="opacity:0.68">WCV 2.35.1</span></div>
                        <div class="surface-composer-card agy-composer">
                          <!-- Probe element: if backdrop-filter leaked onto #antigravity.agentSidePanelInputBox or .surface-composer-card instead of ::before, this fixed element would get trapped! -->
                          <div id="composer-fixed-probe" style="position:fixed;top:0;left:0;width:4px;height:4px;pointer-events:none;opacity:0"></div>
                          <div id="mock-composer-attachment-chip" data-testid="composer-attachment-chip" class="mock-composer-attachment-chip"><span>blueprint.md</span><span style="opacity:0.65">×</span></div>
                          <textarea id="hub-composer-input" placeholder="Ask Antigravity or press Ctrl+Alt+W to summon Quick Prism…"></textarea>
                          <div class="agy-composer-footer">
                            <span class="footer-chip">Claude Opus 4.6</span>
                            <span class="footer-chip">2.35.1 WCV</span>
                            <button id="hub-interactive-btn" type="button" class="hub-send-btn" onclick="window.__hubInteractiveClicks=(window.__hubInteractiveClicks||0)+1">Send</button>
                            <span id="hub-voice-live-pill" data-testid="voice-live-pill" class="bg-foreground text-background" title="Start Voice mode" style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:999px">
                              <svg width="12" height="12" viewBox="0 0 12 12"><path fill="currentColor" d="M5 1h2v10H5zM2 4h2v4H2zM8 3h2v6H8z"/></svg>
                            </span>
                            <span style="margin-left:auto;opacity:0.65;font-size:11px">Ctrl+Alt+W · Quick Prism</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </main>

                <div class="split-gutter" title="Resize Aux Pane"></div>

                <div id="hub-aux-pane" class="hub-aux-pane browser-hole-ancestor" data-pane-id="aux-browser-pane" data-testid="sidecar-iframe-slot"${holeAncAttr}>
                  <!-- Antigravity 2.34.0/2.35.1 3-Layer Built-in Browser Island -->
                  <div id="hub-browser-sheet" class="agy-sheet" data-sheet-inset style="border-radius:12px;overflow:hidden;border:1px solid var(--card-border)"${holeAncAttr}>
                    <div data-testid="builtin-browser-pane"${holeAncAttr}>
                      <div class="browser-toolbar" style="height:40px">
                        <span style="opacity:0.62;letter-spacing:2px">← → ↻</span>
                        <span class="browser-url-pill">http://127.0.0.1:3000/live-preview</span>
                        <span class="hub-badge">WCV Hole</span>
                      </div>
                      <div data-testid="builtin-browser-placeholder" data-browser-hole="${leafHoleVal}" data-wcv-three-layer="true" style="height:360px"></div>
                    </div>
                  </div>

                  <div id="hub-aux-telemetry-card" class="aux-card" style="margin-top:2px">
                    <div style="font-weight:600">Prism v2.2 Optical Telemetry</div>
                    <div style="opacity:0.78">Stage: z-index -1 · inert · fail-open</div>
                    <div style="opacity:0.78">Browser Cutout: GPU clip-path (12px arc)</div>
                    <div style="opacity:0.78">Code &amp; Modal Floor: WCAG Locked</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Antigravity 2.34.0+ off-screen probes inside #root: inner .dark + [data-side-panel-body] + .browser-hole-opaque + Customizations + aux-pane-split + settings modal + menu -->
    <div id="v234-inner-dark-probe" class="h-full w-full dark" style="position:fixed;left:-9999px;top:0;width:400px;height:300px;pointer-events:none">
      <div class="agy-inset-shell">
        <aside id="v234-side-panel-probe" data-side-panel-body="true" class="bg-sidebar" style="width:220px;height:260px"><div id="v234-side-panel-inner-bg" class="bg-sidebar" style="height:28px">Group</div><div id="v234-drop-sticky-probe" class="bg-sidebar" data-sidebar-section-drop-id="main-section-header" style="height:24px">Projects</div><div id="v234-sidebar-fixed-probe" style="position:fixed;top:0;left:0;width:4px;height:4px"></div></aside>
        <div class="agy-sheet" data-sheet-inset="true">
          <div id="v234-browser-hole-probe" class="browser-hole-opaque">
            <div id="v234-main-body-probe" data-main-content-body="true">
              <div id="v234-customizations-probe" class="flex-1 flex flex-col overflow-hidden h-full min-h-0 bg-background">
                <div id="v234-cust-sticky-bar" class="sticky top-0 z-20 bg-background"><nav data-testid="plugins-tabs" class="agy-pill"></nav><div class="agy-field"><input data-testid="customizations-search" /></div></div>
                <div id="v234-cust-spotlight" class="agy-spotlight-card bg-card"></div>
                <div id="v234-cust-card" class="agy-card" data-testid="customization-card"></div>
                <div id="v234-cust-fixed-probe" style="position:fixed;top:0;left:0;width:4px;height:4px"></div>
              </div>
              <div id="v234-plugin-detail-probe" data-testid="plugin-detail" class="bg-card" style="padding:8px 12px;margin-top:6px;border-radius:8px;border:1px solid var(--card-border)">Plugin Detail</div>
            </div>
          </div>
          <div id="v234-aux-sheet-probe" class="agy-sheet" style="position:fixed;left:-9999px;top:320px;width:160px;height:60px;pointer-events:none"><div id="v234-sheet-body-probe" data-side-panel-body="true" style="width:100%;height:100%">Sheet Body</div></div>
          <div id="v234-aux-split-probe" data-testid="aux-pane-split" style="display:flex;width:360px;height:200px">
            <div id="v234-center-island-probe" class="browser-hole-opaque" style="flex:1;display:flex;flex-direction:column">
              <div id="v234-main-header-probe" data-main-content-header="true" class="bg-background" style="height:40px">Main Header</div>
              <div id="v234-center-conv-probe" data-testid="conversation-view" style="flex:1">Center Conversation</div>
            </div>
            <div id="v234-right-island-probe" class="browser-hole-opaque" style="width:160px;display:flex;flex-direction:column">
              <div id="v234-right-strip-probe" data-side-panel-strip="true" class="bg-sidebar" style="height:36px">Aux Strip</div>
              <div id="v234-right-body-probe" data-side-panel-body="true" class="bg-sidebar" style="flex:1">
                <div data-testid="side-panel-new-tab-view">
                  <input id="v234-new-tab-search-probe" data-testid="new-tab-search-input" type="text" placeholder="Search..." />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div id="hub-inner-menu-probe" role="menu" class="agy-menu bg-popover" style="width:180px;padding:8px">Inner Dark Menu</div>
      <div id="hub-heat-hint-probe" class="ag-cs-home-heat-hint" style="padding:4px 8px">Heatmap Hint</div>
    </div>

    <!-- Antigravity 2.34.0+ Image Preview Lightbox Portal inside #root > div (Issue #4 Bug 3) -->
    <div id="v234-lightbox-portal" style="display:none;position:fixed;inset:0;z-index:5000">
      <div id="v234-modal-backdrop-probe" data-testid="modal-backdrop" class="bg-black/45" style="position:absolute;inset:0;background-color:rgba(0, 0, 0, 0.45)"></div>
      <div id="v234-media-modal-probe" role="dialog" data-testid="media-modal" style="position:absolute;inset:0;display:flex;flex-direction:column;color:#ffffff">
        <div id="v234-media-zoom-probe" data-testid="media-modal-zoom-controls" class="bg-card" style="padding:4px 10px">- 100% +</div>
      </div>
    </div>

    <div id="v234-settings-backdrop-probe" class="fixed inset-0 settings-modal-backdrop" style="display:none;position:fixed;inset:0;z-index:5000">
      <div id="v234-settings-dialog-probe" class="agy-dialog bg-background settings-modal-container" style="width:640px;height:420px;display:flex;flex-direction:column">
        <div id="v234-settings-inner-dark" class="dark" style="display:flex;flex:1;min-height:0">
          <nav style="width:180px;padding:12px;display:flex;flex-direction:column;gap:6px">
            <button id="v234-settings-active-tab-probe" type="button" class="bg-background" style="padding:6px 10px;border-radius:6px;border:none;color:inherit">Appearance</button>
            <button id="v234-settings-hover-tab-probe" type="button" class="hover:bg-background" style="padding:6px 10px;border-radius:6px;border:none;color:inherit">General</button>
          </nav>
          <div id="v234-settings-detail-probe" class="bg-background" style="flex:1;padding:16px">Settings Detail Pane</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Off-screen VS Code / Antigravity IDE Workbench compatibility probe -->
  <div id="ide-workbench-probe" class="monaco-workbench" style="position:fixed;left:-9999px;top:0;width:800px;height:600px;pointer-events:none">
    <div class="part titlebar"></div>
    <div class="part activitybar"></div>
    <div class="part sidebar"><div class="composite title"></div><div class="content" id="ide-sidebar-content-probe" style="height:120px;background:var(--vscode-sideBar-background,#252526)"></div></div>
    <div class="part editor">
      <div class="content">
        <div class="editor-group-container">
          <div class="tabs-and-actions-container"><div class="tab active">index.ts</div></div>
          <div class="monaco-editor">
            <div class="monaco-editor-background"></div>
            <div class="monaco-scrollable-element"><div class="view-lines">const x = 1;</div></div>
          </div>
        </div>
      </div>
    </div>
    <div class="part panel"><div class="xterm"><div class="xterm-viewport"></div></div></div>
    <div class="part auxiliarybar"></div>
    <div class="part statusbar"><div class="right-items"></div></div>
    <div class="quick-input-widget" style="display:none"></div>
  </div>

  <!-- Floating menu & tooltip probes for >=94% solid readability guardrail verification -->
  <div id="hub-menu-probe" role="menu" class="agy-menu bg-popover" style="position:fixed;left:-9999px;top:0;width:180px;padding:8px">Menu Item</div>
  <div id="hub-tooltip-probe" role="tooltip" style="position:fixed;left:-9999px;top:0;padding:4px 8px;background:#111;color:#fff">Tooltip</div>

  <!-- Sibling plugin overlays that MUST remain 100% untouched -->
  <div id="ag-usage-monitor-capsule" style="position:fixed;top:7px;right:292px;z-index:7500;padding:2px 8px;border-radius:999px;background:rgba(59,130,246,0.18);border:1px solid rgba(59,130,246,0.38);color:#93c5fd;font-size:11px;pointer-events:none">AGY 42%</div>
  <div id="ag-context-meter" style="position:fixed;top:7px;right:210px;z-index:7500;padding:2px 8px;border-radius:999px;background:rgba(16,185,129,0.16);border:1px solid rgba(16,185,129,0.35);color:#6ee7b7;font-size:11px;pointer-events:none">CTX 18%</div>
  <div id="gemini-neko-pet-root" style="position:fixed;right:18px;bottom:16px;z-index:2147482800;padding:6px 10px;border-radius:999px;background:rgba(24,24,34,0.88);border:1px solid rgba(255,255,255,0.14);color:#f5d0fe;font-size:11.5px;pointer-events:none">🐾 Neko HUD</div>

  <script>
    (function () {
      var convEl = document.querySelector('#hub-main-pane [data-testid="conversation-view"]');
      var originalChatHtml = convEl ? convEl.innerHTML : '';

      function buildStarterCardsHtml(zh) {
        var cards = zh
          ? [
              ['重构侧栏毛玻璃', '支持独立组件不透明度与色深微调'],
              ['检查更新管线', '校验 SHA-256 与安全回滚机制'],
              ['运行回归测试', '覆盖空对话与多窗口场景'],
            ]
          : [
              ['Refine frosted glass', 'Tune per-component opacity and tone'],
              ['Verify auto-updater', 'Validate SHA-256 and atomic rollback'],
              ['Run E2E regressions', 'Cover empty state and localization'],
            ];
        return (
          '<div class="mock-starter-grid">' +
          cards
            .map(function (c, idx) {
              return (
                '<button id="mock-starter-btn-' + idx + '" type="button" class="mock-starter-card">' +
                '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="currentColor" opacity="0.55"/></svg>' +
                '<p style="font-weight:600">' + c[0] + '</p>' +
                '<p style="opacity:0.72">' + c[1] + '</p>' +
                '</button>'
              );
            })
            .join('') +
          '</div>'
        );
      }

      // Req #1: 5 Conversation Mode Fixtures ('chat' | 'empty-en' | 'empty-zh' | 'empty-mask' | 'empty-pseudo')
      window.__setMockConversationMode = function setMockConversationMode(mode) {
        var conv = document.querySelector('#hub-main-pane [data-testid="conversation-view"]');
        if (!conv) return '';
        var next = String(mode || 'chat');
        conv.setAttribute('data-mock-mode', next);
        if (next === 'chat') {
          conv.innerHTML = originalChatHtml;
          return next;
        }
        if (next === 'empty-en') {
          conv.innerHTML =
            '<div class="mock-empty-hero">' +
              '<svg id="mock-welcome-logo-svg" aria-hidden="true" width="96" height="96" viewBox="0 0 96 96" style="pointer-events:none;opacity:0.22;margin-bottom:-22px">' +
                '<path d="M48 10L82 84H64L48 48L32 84H14Z" fill="currentColor"/>' +
              '</svg>' +
              '<h1 id="mock-welcome-heading" class="mock-welcome-heading">Hey bai, what should we build today?</h1>' +
              buildStarterCardsHtml(false) +
            '</div>';
          return next;
        }
        if (next === 'empty-zh') {
          conv.innerHTML =
            '<div class="mock-empty-hero">' +
              '<svg id="mock-welcome-logo-svg-zh" aria-hidden="true" width="96" height="96" viewBox="0 0 96 96" style="pointer-events:none;opacity:0.22;margin-bottom:-22px">' +
                '<path d="M48 10L82 84H64L48 48L32 84H14Z" fill="currentColor"/>' +
              '</svg>' +
              '<h1 id="mock-welcome-heading-zh" class="mock-welcome-heading">嘿，白，今天想构建点什么？</h1>' +
              buildStarterCardsHtml(true) +
            '</div>';
          return next;
        }
        if (next === 'empty-mask') {
          var maskUrl = "url(\\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'%3E%3Cpath d='M48 10L82 84H64L48 48L32 84H14Z' fill='%23000'/%3E%3C/svg%3E\\")";
          conv.innerHTML =
            '<div class="mock-empty-hero">' +
              '<div id="mock-welcome-logo-mask" aria-hidden="true" style="width:104px;height:104px;pointer-events:none;opacity:0.25;background-color:currentColor;-webkit-mask-image:' + maskUrl + ';mask-image:' + maskUrl + ';-webkit-mask-size:contain;mask-size:contain;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-position:center;mask-position:center;margin-bottom:-20px"></div>' +
              '<h1 id="mock-welcome-heading-mask" class="mock-welcome-heading">Welcome back. Where should we pick up?</h1>' +
              buildStarterCardsHtml(false) +
            '</div>';
          return next;
        }
        if (next === 'empty-pseudo') {
          conv.innerHTML =
            '<div class="mock-empty-hero">' +
              '<div id="mock-welcome-pseudo-wrap" class="mock-welcome-pseudo-watermark">' +
                '<h1 id="mock-welcome-heading-pseudo" class="mock-welcome-heading">Good to see you. What&#39;s next?</h1>' +
              '</div>' +
              buildStarterCardsHtml(false) +
            '</div>';
          return next;
        }
        return next;
      };

      // Req #2: Open/Close P$c topbar dropdown menu ([data-browser-occluder="true"])
      window.__setMockTopbarDropdownOpen = function setMockTopbarDropdownOpen(open) {
        var dd = document.getElementById('hub-title-menu-dropdown');
        if (!dd) return false;
        var on = Boolean(open);
        dd.style.visibility = on ? 'visible' : 'hidden';
        dd.style.pointerEvents = on ? 'auto' : 'none';
        return on;
      };

      // Req #2: Dynamic WCO height/rect simulation (wcoH=30/35/40 + geometrychange dispatch)
      var mockWcoState = { visible: true, x: 0, y: 0, width: 1300, height: 35 };
      var mockWcoListeners = new Set();
      window.__setMockWco = function setMockWco(opts) {
        if (opts && typeof opts === 'object') {
          if (typeof opts.visible === 'boolean') mockWcoState.visible = opts.visible;
          if (Number.isFinite(Number(opts.x))) mockWcoState.x = Number(opts.x);
          if (Number.isFinite(Number(opts.y))) mockWcoState.y = Number(opts.y);
          if (Number.isFinite(Number(opts.width))) mockWcoState.width = Number(opts.width);
          if (Number.isFinite(Number(opts.height))) mockWcoState.height = Number(opts.height);
        }
        if (!navigator.windowControlsOverlay || !navigator.windowControlsOverlay.__isMockMutable) {
          Object.defineProperty(navigator, 'windowControlsOverlay', {
            configurable: true,
            value: {
              __isMockMutable: true,
              get visible() {
                return mockWcoState.visible;
              },
              getTitlebarAreaRect: function () {
                return {
                  x: mockWcoState.x,
                  y: mockWcoState.y,
                  width: mockWcoState.width,
                  height: mockWcoState.height,
                  left: mockWcoState.x,
                  top: mockWcoState.y,
                  right: mockWcoState.x + mockWcoState.width,
                  bottom: mockWcoState.y + mockWcoState.height,
                };
              },
              addEventListener: function (type, fn) {
                if (type === 'geometrychange' && typeof fn === 'function') mockWcoListeners.add(fn);
              },
              removeEventListener: function (type, fn) {
                if (type === 'geometrychange') mockWcoListeners.delete(fn);
              },
            },
          });
        }
        mockWcoListeners.forEach(function (fn) {
          try {
            fn({ type: 'geometrychange' });
          } catch (_) {}
        });
        return {
          visible: mockWcoState.visible,
          x: mockWcoState.x,
          width: mockWcoState.width,
          height: mockWcoState.height,
        };
      };
      // Pre-install mutable WCO shim before wallpaper-inject.js binds geometrychange
      window.__setMockWco(mockWcoState);

      // Req #6: Toggle bilingual topbar/sidebar labels (Antigravity / 工作区 / 视图 / 窗口)
      window.__setMockLocale = function setMockLocale(locale) {
        var zh = String(locale || '').toLowerCase().indexOf('zh') === 0;
        var ws = document.getElementById('hub-title-menu-btn');
        var vw = document.getElementById('hub-title-view-btn');
        var wn = document.getElementById('hub-title-window-btn');
        var projLabel = document.getElementById('hub-sidebar-projects-label');
        var convLabel = document.getElementById('hub-sidebar-conv-label');
        var input = document.getElementById('hub-composer-input');
        if (ws) ws.textContent = zh ? '工作区' : 'Workspace';
        if (vw) vw.textContent = zh ? '视图' : 'View';
        if (wn) wn.textContent = zh ? '窗口' : 'Window';
        if (projLabel) projLabel.textContent = zh ? '项目' : 'Projects';
        if (convLabel) convLabel.textContent = zh ? '对话' : 'Conversations';
        if (input) {
          input.setAttribute(
            'placeholder',
            zh
              ? '输入任何问题，输入 @ 提及，/ 触发操作'
              : 'Ask Antigravity or press Ctrl+Alt+W to summon Quick Prism…'
          );
        }
        return zh ? 'zh' : 'en';
      };
      window.__setMockProjectExpanded = function setMockProjectExpanded(expanded) {
        var on = expanded !== false;
        var btn = document.getElementById('hub-project-header-btn');
        var wrap = document.getElementById('hub-project-folder-wrap');
        if (btn) btn.setAttribute('aria-expanded', on ? 'true' : 'false');
        if (wrap) wrap.setAttribute('data-sidebar-section-collapsed', on ? 'false' : 'true');
      };

      // Req #6: Faithful upstream Antigravity-Chinese-Localization dom-translator.js simulation:
      //   1) Short-circuits immediately when window.__agyDomTranslatorInitialized === true
      //   2) Uses exact upstream codeClassPattern + while (cur && cur !== document.body) loop
      //      (intentionally ignores body.className, translate="no", data-no-translate, data-ag-no-i18n)
      window.__runMockDomTranslator = function runMockDomTranslator(opts) {
        var ignoreInitGuard = Boolean(opts && opts.ignoreInitGuard);
        if (!ignoreInitGuard && window.__agyDomTranslatorInitialized) {
          return { skippedInit: true, translatedCount: 0, touchedPrismIds: [] };
        }
        var codeClassPattern =
          /(?:^|[\\s_-])(monaco-editor|editor-instance|hljs|shiki|prism|codemirror|line-content|gutter|codeblock|code-block|code-line|view-line|xterm|xterm-rows|xterm-screen|xterm-accessibility)(?:$|[\\s_-])/i;
        var dict = {
          Workspace: '工作区',
          View: '视图',
          Window: '窗口',
          Projects: '项目',
          Previous: '上一步',
          Pause: '暂停',
          Next: '下一步',
          Status: '状态',
          Disabled: '已禁用',
          Cancel: '取消',
          Connected: '已连接',
          'Close (Esc)': '关闭 (Esc)',
          LAYOUT: '布局',
          Active: '活跃',
          Local: '本地',
          All: '全部',
          None: '无',
          'Conversations': '对话',
          'Ask Antigravity or press Ctrl+Alt+W to summon Quick Prism…': '询问 Antigravity 或按 Ctrl+Alt+W 呼出 Quick Prism…',
          'Start Voice mode': '开启语音模式',
          'Hey bai, what should we build today?': '嘿，bai，今天想构建点什么？',
        };
        function shouldSkipNode(node) {
          var cur = node && node.nodeType === 1 ? node : node && node.parentElement;
          while (cur && cur !== document.body) {
            if (codeClassPattern.test(String(cur.className || ''))) return true;
            cur = cur.parentElement;
          }
          return false;
        }
        var translatedCount = 0;
        var touchedPrismIds = [];
        var markTouched = function (el) {
          if (!el || !el.closest) return;
          var pNode = el.closest('[id^="agy-prism-"], #app');
          if (pNode && pNode.id && touchedPrismIds.indexOf(pNode.id) < 0) {
            touchedPrismIds.push(pNode.id);
          }
        };
        var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
        var curNode;
        while ((curNode = walker.nextNode())) {
          if (shouldSkipNode(curNode)) continue;
          if (curNode.nodeType === 3) {
            var raw = String(curNode.nodeValue || '');
            var trimmed = raw.trim();
            if (trimmed && Object.prototype.hasOwnProperty.call(dict, trimmed)) {
              curNode.nodeValue = raw.replace(trimmed, dict[trimmed]);
              translatedCount += 1;
              markTouched(curNode.parentElement);
            }
          } else if (curNode.nodeType === 1) {
            ['title', 'placeholder', 'aria-label'].forEach(function (attr) {
              var val = curNode.getAttribute(attr);
              if (!val) return;
              if (Object.prototype.hasOwnProperty.call(dict, val.trim())) {
                curNode.setAttribute(attr, dict[val.trim()]);
                translatedCount += 1;
                markTouched(curNode);
              } else if (curNode.id && curNode.id.indexOf('agy-prism-') === 0 && /Panel|Enable|Disable|Status/i.test(val)) {
                curNode.setAttribute(attr, val.replace(/Panel/gi, '面板'));
                translatedCount += 1;
                markTouched(curNode);
              }
            });
          }
        }
        return { skippedInit: false, translatedCount: translatedCount, touchedPrismIds: touchedPrismIds };
      };

      // Mirrors Antigravity 2.34.0+ Bqb(doc) ancestor propagation for [data-browser-hole]
      window.__setMockBrowserHole = function setMockBrowserHole(active) {
        var hole = document.querySelector('[data-testid="builtin-browser-placeholder"]');
        if (!hole) return false;
        var on = Boolean(active);
        hole.setAttribute('data-browser-hole', on ? 'true' : 'false');
        document.querySelectorAll('[data-has-browser-hole]').forEach(function (n) {
          n.removeAttribute('data-has-browser-hole');
        });
        document.body.removeAttribute('data-has-three-layer-browser-hole');
        if (on) {
          var cur = hole.parentElement;
          while (cur) {
            cur.setAttribute('data-has-browser-hole', 'true');
            cur = cur.parentElement;
          }
          document.documentElement.setAttribute('data-has-browser-hole', 'true');
          document.body.setAttribute('data-has-browser-hole', 'true');
          document.body.setAttribute('data-has-three-layer-browser-hole', 'true');
        }
        return on;
      };
    })();
  </script>
</body>
</html>`;
}
