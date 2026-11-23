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
import { buildClientSkinPayload } from '../src/host/index.mjs';
import { evaluateTargetEphemeral, listCdpTargets, probeCdpPort, readDevToolsActivePort, selectHubTargets } from '../sidecars/prism_studio/cdp-bridge.mjs';
import { buildStudioBundle } from './build.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

export async function installLocalPlugin({ destRoot = '' } = {}) {
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

  // Trigger clean in-process Sidecar host script reload (never SIGTERM under `restart_policy: "on-failure"`)
  if (!destRoot) {
    try {
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

      // Hot-upgrade any older in-memory `window.__agyPrism` or stale Sidecar/mediaOrigin inside already-open Hub windows
      const pf = readDevToolsActivePort();
      const cdpPorts = [...new Set([pf?.port, DEFAULT_DEBUG_PORT].filter((n) => Number.isInteger(n) && n > 0))];
      for (const cp of cdpPorts) {
        const pr = await probeCdpPort(cp).catch(() => ({ ok: false }));
        if (!pr.ok) continue;
        const targets = await listCdpTargets(pr.port, pr.host || '127.0.0.1').catch(() => []);
        for (const h of selectHubTargets(targets)) {
          const expr = `(function(){
            if (window.top && window !== window.top) return false;
            var payload = ${JSON.stringify(liveBootPayload)};
            var expectedPrefix = ${JSON.stringify(livePort ? `http://127.0.0.1:${livePort}/host/` : '')};
            if (payload) window.__AGY_PRISM_BOOT_PAYLOAD__ = payload;
            var hostBase = String(window.__agyPrismHostBase || '');
            var staleOrigin = Boolean(expectedPrefix) && (!hostBase || hostBase.indexOf(expectedPrefix) !== 0);
            var cur = window.__agyPrism;
            if (cur && cur.version === ${JSON.stringify(PRISM_DOM.skinVersion)}) {
              if (payload && typeof cur.applyPayload === 'function') cur.applyPayload(payload);
            }
            if (staleOrigin) {
              if (window.__agyPrismSse) {
                try { window.__agyPrismSse.close(); } catch (e) {}
                window.__agyPrismSse = null;
              }
              var sl = document.getElementById('agy-prism-stage-loader');
              if (sl) sl.remove();
              var pl = document.getElementById('agy-prism-panel-loader');
              if (pl) pl.remove();
              window.__agyPrismBootstrapped = false;
              return 'rebind';
            }
            if (cur && cur.version === ${JSON.stringify(PRISM_DOM.skinVersion)}) {
              return 'updated';
            }
            if (!hostBase) return false;
            var ex = document.getElementById('agy-prism-stage-loader');
            if (ex) ex.remove();
            var s = document.createElement('script');
            s.id = 'agy-prism-stage-loader';
            s.async = true;
            s.src = hostBase + '/stage.js?t=' + Date.now();
            (document.head || document.documentElement).appendChild(s);
            return 'reloaded';
          })()`;
          await evaluateTargetEphemeral(h.webSocketDebuggerUrl, expr).catch(() => {});
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
