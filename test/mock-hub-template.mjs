/**
 * Realistic Mock Antigravity 2.34.0 Hub + IDE Workbench HTML Generator (`test/mock-hub-template.mjs`)
 *
 * Mirrors verified Antigravity 2.34.0 Hub DOM & CSS specificity (`body.dark` / `body.light` at `0,1,1`,
 * inner `#root .dark` token reset, `.browser-hole-opaque` non-browser pane shields, 3-layer Electron
 * `WebContentsView` `[data-browser-hole]` + `data-has-browser-hole="true"` ancestor chain up to `<html>` & `<body>`,
 * `.settings-modal-container` + inner `.dark` & `hover:bg-background` tabs, `[role="menu"]` popovers,
 * `.monaco-workbench` IDE fallback elements, and sibling plugin overlays
 * (`#ag-usage-monitor-capsule`, `#ag-context-meter`, `#gemini-neko-pet-root`)).
 */
export function buildMockAntigravityHubHtml({
  initialTheme = 'dark',
  title = 'Antigravity 2.34.0 — agy-wallpaper-prism',
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

    /* Specificity (0,1,1) — exact Antigravity 2.0/2.34.0 Hub cascade */
    body.dark {
      --background: #070708;
      --body-background: #070708;
      --shell: #070708;
      --content: #070708;
      --foreground: #ffffff;
      --card: #131317;
      --card-border: rgba(255, 255, 255, 0.07);
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

    /* Antigravity 2.34.0 layout & inner .dark variable reset + .browser-hole-opaque + --shell-canvas */
    #root .dark {
      --background: #070708;
      --content: #070708;
      --sidebar: #111114;
    }
    #root .light {
      --background: #f7f7f8;
      --content: #f7f7f8;
      --sidebar: #eeeef1;
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

    /* Antigravity 2.34.0 3-Layer WCV native hole punch-through */
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

    .bg-background { background-color: var(--background); }
    .hover\\:bg-background { background-color: transparent; }
    .hover\\:bg-background:hover { background-color: var(--background); }
    .bg-sidebar { background-color: var(--sidebar); }
    .bg-card { background-color: var(--card); border: 1px solid var(--card-border); }
    .bg-popover { background-color: var(--popover); }

    .agy-shell {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      background-color: var(--shell);
    }

    [data-testid="title-menu-bar"] {
      height: 36px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 14px;
      background-color: var(--sidebar);
      border-bottom: 1px solid var(--border);
      font-size: 12px;
      user-select: none;
    }

    .hub-title-left { display: flex; align-items: center; gap: 10px; font-weight: 600; letter-spacing: 0.01em; }
    .hub-badge {
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 500;
      background: rgba(102, 157, 246, 0.16);
      color: #8ab4f8;
      border: 1px solid rgba(102, 157, 246, 0.32);
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

    .nav-section-label {
      font-size: 10.5px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      opacity: 0.56;
      padding: 0 6px;
      margin-bottom: 4px;
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
    .surface-composer-card {
      position: relative;
      padding: 12px 14px 10px;
      border-radius: 12px;
      background-color: var(--card);
      border: 1px solid var(--card-border);
      display: flex;
      flex-direction: column;
      gap: 8px;
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
          <header data-testid="title-menu-bar">
            <div class="hub-title-left">
              <span>◆ Antigravity 2.34.0</span>
              <span style="opacity:0.45">/</span>
              <span>agy-wallpaper-prism</span>
              <span class="hub-badge">Gentle Fail-Open v2.0</span>
            </div>
            <div style="display:flex;align-items:center;gap:12px;opacity:0.75">
              <span>Swarm · v2.0 Verified</span>
              <span>Ephemeral Zero-Enable CDP</span>
            </div>
          </header>

          <div data-testid="sidebar-split"${holeAncAttr}>
            <aside class="agy-sidebar bg-sidebar">
              <div>
                <div class="nav-section-label">Workspaces</div>
                <div class="nav-item active">
                  <span>agy-wallpaper-prism</span>
                  <span class="dot-online"></span>
                </div>
                <div class="nav-item"><span>antigravity-observer</span></div>
              </div>
              <div>
                <div class="nav-section-label">Swarm v2.0 Roster</div>
                <div class="nav-item"><span>@coordinator</span><span class="dot-online"></span></div>
                <div class="nav-item"><span>@resilience-designer</span><span class="dot-online"></span></div>
                <div class="nav-item"><span>@gentle-skin-architect</span><span class="dot-online"></span></div>
                <div class="nav-item"><span>@crash-forensics</span><span class="dot-online"></span></div>
                <div class="nav-item active"><span>@v2-verifier</span><span class="dot-online"></span></div>
              </div>
              <div style="margin-top:auto">
                <div class="nav-section-label">Enabled Plugins</div>
                <div class="nav-item active"><span>◆ Wallpaper Prism</span><span style="font-size:10.5px;opacity:0.7">v2.0.0</span></div>
                <div class="nav-item"><span>🐾 Gemini Neko</span><span style="font-size:10.5px;opacity:0.7">HUD</span></div>
              </div>
            </aside>

            <div class="split-gutter" title="Resize Sidebar"></div>

            <div style="display:flex;flex:1;min-width:0;min-height:0"${holeAncAttr}>
              <div data-testid="aux-pane-split"${holeAncAttr}>
                <main id="hub-main-pane" class="hub-main-pane browser-hole-opaque">
                  <section data-testid="conversation-view">
                    <div class="msg-user bg-card">
                      Verify <strong>Gentle Fail-Open v2.0</strong> on Antigravity <code>2.34.0</code>: zero-enable CDP, first-frame media gate, and synchronous <code>[data-browser-hole]</code> rounded GPU cutout.
                    </div>

                    <div class="msg-agent">
                      <div>
                        Active <code>data-agy-prism-wallpaper="ready"</code> with <code>z-index: -1</code> inert stage and synchronous <code>clip-path: path(...)</code> over Built-in Browser <code>clipView (z=0)</code>:
                      </div>

                      <pre class="md-code-block"><code><span class="tok-cm">// Gentle Fail-Open v2.0: decode Frame 1 first, then punch rounded [data-browser-hole]</span>
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
                    <div id="antigravity" class="agentSidePanelInputBox">
                      <div class="surface-composer-card agy-composer" data-testid="agent-input-box">
                        <!-- Probe element: if backdrop-filter leaked onto .surface-composer-card instead of ::before, this fixed element would get trapped! -->
                        <div id="composer-fixed-probe" style="position:fixed;top:0;left:0;width:4px;height:4px;pointer-events:none;opacity:0"></div>
                        <textarea id="hub-composer-input" placeholder="Ask Antigravity or press Ctrl+Alt+W to summon Quick Prism…"></textarea>
                        <div class="agy-composer-footer">
                          <span class="footer-chip">Claude Opus 4.6</span>
                          <span class="footer-chip">2.34.0 WCV</span>
                          <button id="hub-interactive-btn" type="button" class="hub-send-btn" onclick="window.__hubInteractiveClicks=(window.__hubInteractiveClicks||0)+1">Send</button>
                          <span style="margin-left:auto;opacity:0.65;font-size:11px">Ctrl+Alt+W · Quick Prism</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </main>

                <div class="split-gutter" title="Resize Aux Pane"></div>

                <div id="hub-aux-pane" class="hub-aux-pane browser-hole-ancestor" data-pane-id="aux-browser-pane" data-testid="sidecar-iframe-slot"${holeAncAttr}>
                  <!-- Antigravity 2.34.0 3-Layer Built-in Browser Island -->
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
                    <div style="font-weight:600">Prism v2.0 Optical Telemetry</div>
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

    <!-- Antigravity 2.34.0 off-screen probes inside #root: inner .dark + .browser-hole-opaque + settings modal + menu -->
    <div id="v234-inner-dark-probe" class="h-full w-full dark" style="position:fixed;left:-9999px;top:0;width:400px;height:300px;pointer-events:none">
      <div class="agy-inset-shell">
        <div class="agy-sheet" data-sheet-inset="true">
          <div id="v234-browser-hole-probe" class="browser-hole-opaque">
            <div id="v234-main-body-probe" data-main-content-body="true"></div>
          </div>
        </div>
      </div>
      <div id="hub-inner-menu-probe" role="menu" class="agy-menu bg-popover" style="width:180px;padding:8px">Inner Dark Menu</div>
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
    <div class="part sidebar"><div class="composite title"></div></div>
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
    // Mirrors Antigravity 2.34.0 Bqb(doc) ancestor propagation for [data-browser-hole]
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
  </script>
</body>
</html>`;
}
