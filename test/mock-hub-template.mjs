/**
 * Realistic Mock Antigravity 2.0 Hub + IDE Workbench HTML Generator (`test/mock-hub-template.mjs`)
 *
 * Mirrors verified Antigravity 2.0 Hub DOM & CSS specificity (`body.dark` / `body.light` at `0,1,1`),
 * `#root > div > div > .agy-shell`, `[data-testid="sidebar-split"]`, `[data-testid="aux-pane-split"]`,
 * `[data-testid="conversation-view"]`, `.surface-composer-card`, `.agy-composer-footer`,
 * embedded code/diff/xterm blocks, `.monaco-workbench` IDE fallback elements, popovers/menus/tooltips,
 * and sibling plugin overlays (`#gemini-neko-pet-root`, `#ag-context-meter`).
 */
export function buildMockAntigravityHubHtml({ initialTheme = 'dark', title = 'Antigravity 2.0 — agy-wallpaper-prism' } = {}) {
  return `<!doctype html>
<html lang="zh-CN" class="${initialTheme}">
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

    /* Specificity (0,1,1) — exact Antigravity 2.0 Hub cascade trap */
    body.dark {
      --background: #070708;
      --body-background: #070708;
      --shell: #070708;
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

    .bg-background { background-color: var(--background); }
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
      width: 244px;
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
      padding: 22px 34px 14px;
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
      max-width: 76%;
      padding: 11px 15px;
      border-radius: 12px;
      line-height: 1.5;
    }
    .msg-agent {
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 92%;
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
      padding: 8px 34px 16px;
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
      min-height: 38px;
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

    .hub-aux-pane {
      width: 286px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      padding: 14px;
      gap: 10px;
      background-color: var(--sidebar);
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
  </style>
</head>
<body class="${initialTheme}">
  <div id="root">
    <div>
      <div>
        <div class="agy-shell bg-background">
          <header data-testid="title-menu-bar">
            <div class="hub-title-left">
              <span>◆ Antigravity 2.0</span>
              <span style="opacity:0.45">/</span>
              <span>agy-wallpaper-prism</span>
              <span class="hub-badge">Obsidian Prism v1.0</span>
            </div>
            <div style="display:flex;align-items:center;gap:12px;opacity:0.75">
              <span>Swarm · 6 Active</span>
              <span>CDP Passive Bridge</span>
            </div>
          </header>

          <div data-testid="sidebar-split">
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
                <div class="nav-section-label">Swarm Agents</div>
                <div class="nav-item"><span>@coordinator</span><span class="dot-online"></span></div>
                <div class="nav-item"><span>@legacy-cleaner</span><span class="dot-online"></span></div>
                <div class="nav-item"><span>@dsh-inspector</span><span class="dot-online"></span></div>
                <div class="nav-item"><span>@prism-designer</span><span class="dot-online"></span></div>
                <div class="nav-item"><span>@studio-builder</span><span class="dot-online"></span></div>
                <div class="nav-item active"><span>@verifier</span><span class="dot-online"></span></div>
              </div>
              <div style="margin-top:auto">
                <div class="nav-section-label">Enabled Plugins</div>
                <div class="nav-item active"><span>◆ Wallpaper Prism</span><span style="font-size:10.5px;opacity:0.7">v1.0.0</span></div>
                <div class="nav-item"><span>🐾 Gemini Neko</span><span style="font-size:10.5px;opacity:0.7">HUD</span></div>
              </div>
            </aside>

            <div class="split-gutter" title="Resize Sidebar"></div>

            <div style="display:flex;flex:1;min-width:0;min-height:0">
              <div data-testid="aux-pane-split">
                <main class="hub-main-pane">
                  <section data-testid="conversation-view">
                    <div class="msg-user bg-card">
                      Apply the <strong>Floating Islands</strong> Obsidian Prism glass layout over our Steam Workshop 4K aurora wallpaper, keeping code blocks and xterm terminals above WCAG contrast floors.
                    </div>

                    <div class="msg-agent">
                      <div>
                        Activated <code>data-prism-layout="islands"</code> with 6-tier acrylic elevation tokens on <code>html[data-agy-prism-skin] body</code> (specificity <code>0,1,2</code>) and <code>::before</code> backdrop-filter carriers:
                      </div>

                      <pre class="md-code-block"><code><span class="tok-cm">// Zero-copy virtual MP4 faststart + Obsidian Prism 6-tier surface hierarchy</span>
<span class="tok-kw">export async function</span> <span class="tok-fn">applyPrismSurface</span>(engine, wallpaperId) {
  <span class="tok-kw">const</span> state = <span class="tok-kw">await</span> engine.<span class="tok-fn">applyWallpaper</span>(wallpaperId, {
    layoutMode: <span class="tok-str">'islands'</span>,
    colorScheme: <span class="tok-str">'prism-default'</span>,
    contrastFloor: <span class="tok-kw">true</span>,
  });
  <span class="tok-kw">return</span> state.activePayload;
}</code></pre>

                      <div data-testid="background-task-command">
                        <div class="xterm">
                          <div class="xterm-viewport">
                            <div class="xterm-rows" style="color:#d4d8e8">
                              <div><span style="color:#50a37b">✓</span> [mp4-vfs] Virtual moov-first faststart ready (0 disk writes, HTTP 206 Range)</div>
                              <div><span style="color:#50a37b">✓</span> [pkg-scene] Extracted TEXB0004 LZ4 video stream (1920×1080 @ 60fps)</div>
                              <div><span style="color:#669df6">◆</span> [prism-skin] Islands gap=8px · blur=16px · code floor &gt;= 0.72 locked</div>
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
                          <span class="footer-chip">Context Mode</span>
                          <span style="margin-left:auto;opacity:0.65;font-size:11px">Ctrl+Alt+W · Quick Prism</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </main>

                <div class="split-gutter" title="Resize Aux Pane"></div>

                <aside class="hub-aux-pane" data-testid="sidecar-iframe-slot">
                  <div class="nav-section-label">Prism Optical Telemetry</div>
                  <div class="aux-card">
                    <div style="font-weight:600">6-Tier Glass Hierarchy</div>
                    <div style="opacity:0.78">Canvas: Hollowed (0.00)</div>
                    <div style="opacity:0.78">Sidebar Island: Frosted Blur 16px</div>
                    <div style="opacity:0.78">Chat Stage: Vignette Protected</div>
                    <div style="opacity:0.78">Code &amp; xterm: Floor &ge; 0.72</div>
                  </div>
                  <div class="aux-card">
                    <div style="font-weight:600">Media Streamer</div>
                    <div style="opacity:0.78">Origin: Loopback HTTP 206</div>
                    <div style="opacity:0.78">Faststart: Virtual moov-first</div>
                    <div style="opacity:0.78">Focus Guard: Active</div>
                  </div>
                </aside>
              </div>
            </div>
          </div>
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

  <!-- Floating menu & tooltip probes for >=90% solid readability guardrail verification -->
  <div id="hub-menu-probe" role="menu" class="agy-menu bg-popover" style="position:fixed;left:-9999px;top:0;width:180px;padding:8px">Menu Item</div>
  <div id="hub-tooltip-probe" role="tooltip" style="position:fixed;left:-9999px;top:0;padding:4px 8px;background:#111;color:#fff">Tooltip</div>

  <!-- Sibling plugin overlays that MUST remain 100% untouched -->
  <div id="ag-context-meter" style="position:fixed;top:7px;right:210px;z-index:7500;padding:2px 8px;border-radius:999px;background:rgba(16,185,129,0.16);border:1px solid rgba(16,185,129,0.35);color:#6ee7b7;font-size:11px;pointer-events:none">CTX 18%</div>
  <div id="gemini-neko-pet-root" style="position:fixed;right:18px;bottom:16px;z-index:2147482800;padding:6px 10px;border-radius:999px;background:rgba(24,24,34,0.88);border:1px solid rgba(255,255,255,0.14);color:#f5d0fe;font-size:11.5px;pointer-events:none">🐾 Neko HUD</div>
</body>
</html>`;
}
