#!/usr/bin/env node
// Local installer for agy-wallpaper-prism: copies real directories & files into
// ~/.gemini/config/plugins/agy-wallpaper-prism (NEVER uses NTFS junctions, which
// Antigravity's GetAllPlugins silently skips on Windows).

import { randomUUID } from 'node:crypto';
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolveDefaultPrismDataDir } from '../src/engine/store.mjs';
import { PRISM_DOM, DEFAULT_DEBUG_PORT } from '../src/shared/schema.mjs';
import { buildClientSkinPayload, getHostSkinScript } from '../src/host/index.mjs';
import { evaluateTargetEphemeral, listCdpTargets, probeCdpPort, readDevToolsActivePort, selectHubTargets } from '../sidecars/prism_studio/cdp-bridge.mjs';
import { buildStudioBundle } from './build.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

export async function installLocalPlugin({ destRoot = '', skipSidecarReload = false } = {}) {
  const indexHtml = join(repoRoot, 'sidecars', 'prism_studio', 'index.html');
  if (!existsSync(indexHtml)) {
    await buildStudioBundle();
  }

  const pluginsDir = destRoot
    ? resolve(destRoot)
    : join(
        process.env.ANTIGRAVITY_CONFIG_DIR ? resolve(process.env.ANTIGRAVITY_CONFIG_DIR) : join(homedir(), '.gemini', 'config'),
        'plugins',
      );
  const dstDir = join(pluginsDir, 'agy-wallpaper-prism');

  // If a symlink/junction ever existed at dstDir, replace it with a real directory
  if (existsSync(dstDir) && lstatSync(dstDir).isSymbolicLink()) {
    rmSync(dstDir, { recursive: true, force: true });
  }
  const stampPath = join(dstDir, '.prism-install-id');
  const existingStamp = existsSync(stampPath) ? readFileSync(stampPath, 'utf8').trim() : '';
  mkdirSync(dstDir, { recursive: true });
  if (!existingStamp) {
    writeFileSync(stampPath, `${randomUUID()}\n`, 'utf8');
  }

  const itemsToCopy = [
    'plugin.json',
    'package.json',
    'README.md',
    'assets',
    'skills',
    'sidecars',
    'src',
    'host',
    'docs',
  ];

  for (const rel of itemsToCopy) {
    const src = join(repoRoot, rel);
    if (!existsSync(src)) continue;
    cpSync(src, join(dstDir, rel), {
      recursive: true,
      force: true,
      dereference: true,
      filter: (p) => !p.includes('node_modules') && !p.endsWith('.tmp'),
    });
  }

  const required = [
    'plugin.json',
    join('assets', 'logo.svg'),
    join('skills', 'wallpaper-prism', 'SKILL.md'),
    join('sidecars', 'prism_studio', 'sidecar.json'),
    join('sidecars', 'prism_studio', 'main.mjs'),
    join('sidecars', 'prism_studio', 'cdp-bridge.mjs'),
    join('sidecars', 'prism_studio', 'index.html'),
    join('src', 'shared', 'schema.mjs'),
    join('src', 'engine', 'index.mjs'),
    join('src', 'host', 'index.mjs'),
    join('host', 'cli.mjs'),
  ];

  for (const rel of required) {
    if (!existsSync(join(dstDir, rel))) {
      throw new Error(`Installed plugin missing required file: ${rel}`);
    }
  }

  if (lstatSync(dstDir).isSymbolicLink()) {
    throw new Error('Destination directory must be a real directory, not a symlink/junction');
  }

  // Trigger clean in-process Sidecar host script reload (allow ~650ms for host plugin watcher to respawn Sidecar if version bumped)
  if (!destRoot && !skipSidecarReload) {
    try {
      await new Promise((r) => setTimeout(r, 650));
      const freshSkinScript = getHostSkinScript({ reload: true });
      const serverInfoPath = join(resolveDefaultPrismDataDir(), 'server_info.json');
      let liveBootPayload = null;
      let livePort = 0;
      let liveHeaders = { 'Content-Type': 'application/json' };
      if (existsSync(serverInfoPath)) {
        const info = JSON.parse(readFileSync(serverInfoPath, 'utf8'));
        const port = Number(info?.port);
        if (info?.plugin === 'agy-wallpaper-prism' && Number.isInteger(port) && port > 0) {
          livePort = port;
          if (info.token) liveHeaders['X-Sidecar-Token'] = info.token;
          const reloadRes = await fetch(`http://127.0.0.1:${port}/api/host/reload`, {
            method: 'POST',
            headers: liveHeaders,
            body: '{}',
            signal: AbortSignal.timeout(1500),
          }).catch(() => null);
          const reloadJson = reloadRes?.ok ? await reloadRes.json().catch(() => null) : null;
          let st = reloadJson?.state || null;
          if (!st?.config) {
            const bootRes = await fetch(`http://127.0.0.1:${port}/api/bootstrap`, {
              signal: AbortSignal.timeout(1500),
            }).catch(() => null);
            if (bootRes?.ok) st = await bootRes.json().catch(() => null);
          }
          if (st?.config) {
            liveBootPayload = buildClientSkinPayload(st.config, st.activeItem, st.mediaOrigin, {
              skinEnabled: st.skinEnabled,
              slides: st.activeItem?.slides,
            });
          }
        }
      }

      // Force-replace in-memory `window.__agyPrism` & `window.__agyPrismPanel` even on same-version (`2.0.6 -> 2.0.6`) hot installs
      const pf = readDevToolsActivePort();
      const cdpPorts = [...new Set([pf?.port, DEFAULT_DEBUG_PORT].filter((n) => Number.isInteger(n) && n > 0))];
      const hotReplacedTargets = [];
      for (const cp of cdpPorts) {
        const pr = await probeCdpPort(cp).catch(() => ({ ok: false }));
        if (!pr.ok) continue;
        const targets = await listCdpTargets(pr.port, pr.host || '127.0.0.1').catch(() => []);
        for (const h of selectHubTargets(targets)) {
          const expr = `(function(){
            if (window.top && window !== window.top) return false;
            var payload = ${JSON.stringify(liveBootPayload)};
            var expectedPrefix = ${JSON.stringify(livePort ? `http://127.0.0.1:${livePort}/host/` : '')};
            var targetVer = ${JSON.stringify(PRISM_DOM.skinVersion)};
            var cur = window.__agyPrism;
            var carry = payload || (cur && typeof cur.getLastPayload === 'function' ? cur.getLastPayload() : null) || window.__AGY_PRISM_BOOT_PAYLOAD__ || null;
            if (carry) window.__AGY_PRISM_BOOT_PAYLOAD__ = carry;
            var hostBase = String(window.__agyPrismHostBase || '');
            var staleOrigin = Boolean(expectedPrefix) && (!hostBase || hostBase.indexOf(expectedPrefix) !== 0);

            var hadPanel = Boolean(window.__agyPrismPanel);
            if (window.__agyPrismPanel) {
              try {
                if (typeof window.__agyPrismPanel.destroy === 'function') window.__agyPrismPanel.destroy();
              } catch (e) {}
              try {
                delete window.__agyPrismPanel;
              } catch (e) {
                window.__agyPrismPanel = undefined;
              }
            }
            var ep = document.getElementById('agy-prism-panel-loader');
            if (ep) ep.remove();
            var triggerMode = (carry && carry.config && carry.config.triggerMode) || 'both';
            if (hadPanel && triggerMode !== 'shortcut-only' && typeof window.__agyPrismSummonPanel === 'function' && !document.getElementById('agy-prism-pill') && document.body) {
              var b = document.createElement('button');
              b.id = 'agy-prism-pill';
              b.type = 'button';
              b.setAttribute('translate', 'no');
              b.dataset.noTranslate = 'true';
              b.dataset.agNoI18n = '1';
              b.dataset.prismLazyStub = '1';
              b.textContent = '\\u25C6 Prism';
              b.style.cssText = 'all:initial;cursor:pointer;font:500 11px/18px system-ui,sans-serif;padding:2px 8px;border-radius:999px;color:#cbd5e1;background:rgba(20,20,26,.72);border:1px solid rgba(255,255,255,.14);z-index:44;';
              var f = document.querySelector('.agy-composer-footer,[data-testid="agent-input-box"] footer');
              if (f) f.appendChild(b);
              else { b.style.position = 'fixed'; b.style.right = '14px'; b.style.bottom = '10px'; document.body.appendChild(b); }
              b.onclick = function(ev) { ev.preventDefault(); ev.stopPropagation(); window.__agyPrismSummonPanel(); };
            }

            if (cur) {
              try {
                if (typeof cur.destroy === 'function') cur.destroy();
              } catch (e) {}
              try {
                delete window.__agyPrism;
              } catch (e) {
                window.__agyPrism = undefined;
              }
            }

            if (staleOrigin) {
              if (window.__agyPrismSse) {
                try { window.__agyPrismSse.close(); } catch (e) {}
                window.__agyPrismSse = null;
              }
              var sl = document.getElementById('agy-prism-stage-loader');
              if (sl) sl.remove();
              window.__agyPrismBootstrapped = false;
              return 'rebind';
            }

            var startupMode = (carry && carry.config && carry.config.startupMode) || 'gentle-auto';
            var skinOn = !carry || carry.skinEnabled !== false;
            if (startupMode === 'static-css') {
              if (hostBase && skinOn) {
                var linkEl = document.getElementById('agy-prism-static-css');
                if (!linkEl) {
                  linkEl = document.createElement('link');
                  linkEl.id = 'agy-prism-static-css';
                  linkEl.rel = 'stylesheet';
                  (document.head || document.documentElement).appendChild(linkEl);
                }
                linkEl.href = hostBase + '/static.css?v=' + encodeURIComponent(targetVer) + '&t=' + Date.now();
              }
              return 'static-css-reloaded';
            }

            var ex = document.getElementById('agy-prism-stage-loader');
            if (ex) ex.remove();
            if (!skinOn) return 'disabled';
            return (function(){
              ${freshSkinScript}
              return window.__agyPrism ? 'hot-replaced' : false;
            })();
          })()`;
          const mode = await evaluateTargetEphemeral(h.webSocketDebuggerUrl, expr).catch(() => null);
          if (mode === 'hot-replaced' || mode === 'rebind') {
            hotReplacedTargets.push(h.webSocketDebuggerUrl);
          }
        }
        for (const t of targets) {
          if (t.type === 'iframe' && String(t.url || '').startsWith('plugin://agy-wallpaper-prism--prism_studio')) {
            await evaluateTargetEphemeral(t.webSocketDebuggerUrl, 'window.location.reload()').catch(() => {});
          }
        }
        break;
      }

      if (livePort) {
        await fetch(`http://127.0.0.1:${livePort}/api/skin/wake`, {
          method: 'POST',
          headers: liveHeaders,
          body: '{}',
          signal: AbortSignal.timeout(2500),
        }).catch(() => {});
      }

      if (hotReplacedTargets.length > 0 && liveBootPayload?.activeItem && liveBootPayload?.skinEnabled !== false) {
        const deadline = Date.now() + 2200;
        while (Date.now() < deadline) {
          let allReady = true;
          for (const wsUrl of hotReplacedTargets) {
            const ok = await evaluateTargetEphemeral(
              wsUrl,
              'Boolean(window.__agyPrism && typeof window.__agyPrism.status === "function" && window.__agyPrism.status().wallpaperReady)',
            ).catch(() => true);
            if (!ok) allReady = false;
          }
          if (allReady) break;
          await new Promise((r) => setTimeout(r, 120));
        }
      }
    } catch {
      /* best-effort live reload; never fail installation */
    }
  }

  return { dstDir };
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] || '')).href) {
  const { dstDir } = await installLocalPlugin();
  console.log(`[install] Installed agy-wallpaper-prism -> ${dstDir}`);
  console.log(`  Studio Pill: [Wallpaper Prism](sidecar://agy-wallpaper-prism/prism_studio/)`);
  console.log(`  Manage UI:   [Wallpaper Prism](customization://agy-wallpaper-prism)`);
}
