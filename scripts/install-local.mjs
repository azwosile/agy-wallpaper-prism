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
import { DEFAULT_DEBUG_PORT, PLUGIN_ID, PRISM_DOM, SIDECAR_URI } from '../src/shared/schema.mjs';
import { buildClientSkinPayload, getHostSkinScript } from '../src/host/index.mjs';
import { evaluateTargetEphemeral, listCdpTargets, probeCdpPort, readDevToolsActivePort, selectHubTargets } from '../sidecars/prism_studio/cdp-bridge.mjs';
import { buildStudioBundle } from './build.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

function readJsonSafe(filePath) {
  try {
    if (!filePath || !existsSync(filePath)) return null;
    const raw = readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '').trim();
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Check whether a local PID is still alive without mutating process state. */
export function isPidAlive(pid) {
  const n = Number(pid);
  if (!Number.isInteger(n) || n <= 0) return false;
  try {
    process.kill(n, 0);
    return true;
  } catch (err) {
    return err?.code === 'EPERM';
  }
}

/** Resolve whether skinEnabled should be treated as active before/after local sync. */
export function resolveWasSkinEnabled({ preStatus, postStatus, preConfig, postConfig } = {}) {
  const checks = [
    preStatus?.skinEnabled,
    preStatus?.config?.skinEnabled,
    postStatus?.skinEnabled,
    postStatus?.config?.skinEnabled,
    preConfig?.skinEnabled,
    postConfig?.skinEnabled,
  ];
  return !checks.some((v) => v === false);
}

/** Collect candidate `{ pid, port, token }` Prism sidecars from data files and recent sidecar.log lines. */
export function collectPrismSidecarCandidates({ dataDir = '', logPath = '' } = {}) {
  const resolvedDataDir = dataDir ? resolve(dataDir) : resolveDefaultPrismDataDir();
  const resolvedLogPath = logPath ? resolve(logPath) : join(dirname(resolvedDataDir), 'logs', 'sidecar.log');
  const byKey = new Map();
  const tokenByPid = new Map();
  const tokenByPort = new Map();

  const rememberToken = (pid, port, token) => {
    if (typeof token !== 'string' || !token) return;
    if (pid > 0 && !tokenByPid.has(pid)) tokenByPid.set(pid, token);
    if (port > 0 && !tokenByPort.has(port)) tokenByPort.set(port, token);
  };

  const addCandidate = (raw, source) => {
    if (!raw || typeof raw !== 'object') return;
    if (raw.plugin && raw.plugin !== PLUGIN_ID) return;
    if (raw.studioUri && raw.studioUri !== SIDECAR_URI) return;
    const port = Number(raw.port);
    const pid = Number(raw.pid || raw.sidecarPid || 0);
    const token = typeof raw.token === 'string' ? raw.token : '';
    rememberToken(pid, port, token);
    if (!Number.isInteger(port) || port < 1 || port > 65535) return;
    const safePid = Number.isInteger(pid) && pid > 0 ? pid : 0;
    const key = `${safePid}:${port}`;
    const existing = byKey.get(key);
    if (existing) {
      if (!existing.token && token) existing.token = token;
      if (!existing.sources.includes(source)) existing.sources.push(source);
      return;
    }
    byKey.set(key, {
      pid: safePid,
      port,
      token,
      sources: [source],
    });
  };

  const serverInfo = readJsonSafe(join(resolvedDataDir, 'server_info.json'));
  addCandidate(serverInfo, 'server_info.json');

  const canary = readJsonSafe(join(resolvedDataDir, 'canary.json'));
  const canaryPid = Number.isInteger(Number(canary?.sidecarPid)) && Number(canary.sidecarPid) > 0
    ? Number(canary.sidecarPid)
    : 0;
  if (canary && Number(canary.port) > 0) {
    addCandidate({ pid: canaryPid, port: canary.port, token: canary.token }, 'canary.json');
  }

  const registry = readJsonSafe(join(resolvedDataDir, 'sidecar-registry.json'));
  const registryItems = Array.isArray(registry)
    ? registry
    : Array.isArray(registry?.instances)
      ? registry.instances
      : Array.isArray(registry?.entries)
        ? registry.entries
        : Array.isArray(registry?.items)
          ? registry.items
          : registry && typeof registry === 'object'
            ? Object.values(registry)
            : [];
  for (const entry of registryItems) {
    addCandidate(entry, 'sidecar-registry.json');
  }

  try {
    if (existsSync(resolvedLogPath)) {
      const rawLog = readFileSync(resolvedLogPath, 'utf8');
      const tailSlice = rawLog.length > 262144 ? rawLog.slice(-262144) : rawLog;
      const lines = tailSlice.split(/\r?\n/);
      const seenLogPairs = new Set();
      const listenRe = /\[prism_studio\]\s+listening on https?:\/\/(?:127\.0\.0\.1|localhost|\[::1\]):(\d{1,5})\b[^\n]*?\bpid=(\d+)/i;
      for (let i = lines.length - 1; i >= 0 && seenLogPairs.size < 24; i -= 1) {
        const m = listenRe.exec(lines[i]);
        if (!m) continue;
        const port = Number(m[1]);
        const pid = Number(m[2]);
        const pairKey = `${pid}:${port}`;
        if (seenLogPairs.has(pairKey)) continue;
        seenLogPairs.add(pairKey);
        addCandidate({ pid, port }, 'sidecar.log');
      }
    }
  } catch {
    /* ignore unreadable sidecar.log */
  }

  const candidates = [];
  for (const cand of byKey.values()) {
    if (!cand.token) {
      cand.token = (cand.pid > 0 && tokenByPid.get(cand.pid)) || tokenByPort.get(cand.port) || '';
    }
    if (canaryPid > 0 && cand.pid === canaryPid && !cand.sources.includes('canary.json')) {
      cand.sources.push('canary.json');
    }
    candidates.push(cand);
  }

  return {
    candidates,
    primaryFromInfo: serverInfo,
    canaryPid,
    dataDir: resolvedDataDir,
    logPath: resolvedLogPath,
  };
}

/** Verify candidate `{ pid, port }` identity via GET /api/status (never blind-kill by command line). */
export async function verifyPrismSidecarStatus(candidate, { fetchImpl = fetch, timeoutMs = 800 } = {}) {
  const port = Number(candidate?.port);
  const expectedPid = Number(candidate?.pid);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return { ok: false, reason: 'invalid_port', pid: 0, port: 0, status: null };
  }
  const baseUrl = `http://127.0.0.1:${port}`;
  const res = await fetchImpl(`${baseUrl}/api/status`, {
    signal: AbortSignal.timeout(timeoutMs),
  }).catch(() => null);
  if (!res?.ok) {
    return { ok: false, reason: res ? `http_${res.status}` : 'unreachable', pid: 0, port, status: null };
  }
  const st = await res.json().catch(() => null);
  if (!st || typeof st !== 'object' || st.ok === false) {
    return { ok: false, reason: 'invalid_status', pid: 0, port, status: null };
  }
  const statusPid = Number(st.pid);
  if (!Number.isInteger(statusPid) || statusPid <= 0) {
    return { ok: false, reason: 'missing_pid', pid: 0, port, status: st };
  }
  if (Number.isInteger(expectedPid) && expectedPid > 0 && statusPid !== expectedPid) {
    return { ok: false, reason: 'pid_mismatch', pid: statusPid, port, status: st };
  }
  if ((st.plugin && st.plugin !== PLUGIN_ID) || (st.studioUri && st.studioUri !== SIDECAR_URI)) {
    return { ok: false, reason: 'foreign_plugin', pid: statusPid, port, status: st };
  }

  let isPrism =
    st.studioUri === SIDECAR_URI ||
    st.plugin === PLUGIN_ID ||
    (typeof st.pluginOrigin === 'string' && st.pluginOrigin.startsWith('plugin://agy-wallpaper-prism--prism_studio'));
  if (!isPrism && st.plugin == null && st.studioUri == null && st.pluginOrigin == null) {
    const hzRes = await fetchImpl(`${baseUrl}/api/healthz`, {
      signal: AbortSignal.timeout(timeoutMs),
    }).catch(() => null);
    const hz = hzRes?.ok ? await hzRes.json().catch(() => null) : null;
    if (hz?.ok === true && hz?.plugin === PLUGIN_ID && Number(hz?.pid) === statusPid) {
      isPrism = true;
    }
  }
  if (!isPrism) {
    return { ok: false, reason: 'not_prism', pid: statusPid, port, status: st };
  }
  return { ok: true, reason: 'verified', pid: statusPid, port, status: st };
}

/** Discover and shut down or SIGTERM verified orphan/duplicate Prism sidecars outside primary server_info.json. */
export async function cleanupOrphanPrismSidecars({
  dataDir = '',
  logPath = '',
  primaryPid = 0,
  primaryPort = 0,
  fetchImpl = fetch,
  isPidAliveImpl = isPidAlive,
  killPidImpl = (pid, sig) => process.kill(pid, sig),
  currentPid = process.pid,
  timeoutMs = 1200,
} = {}) {
  const { candidates } = collectPrismSidecarCandidates({ dataDir, logPath });
  const cleaned = [];
  const skipped = [];
  const handledPids = new Set();

  for (const cand of candidates) {
    if (cand.pid > 0 && cand.pid === currentPid) {
      skipped.push({ ...cand, reason: 'self_pid' });
      continue;
    }
    if (primaryPid > 0 && cand.pid === primaryPid) {
      skipped.push({ ...cand, reason: 'primary' });
      continue;
    }
    if (primaryPort > 0 && cand.port === primaryPort) {
      skipped.push({ ...cand, reason: 'primary_port' });
      continue;
    }
    if (cand.pid > 0 && !isPidAliveImpl(cand.pid)) {
      skipped.push({ ...cand, reason: 'not_alive' });
      continue;
    }

    const verified = await verifyPrismSidecarStatus(cand, { fetchImpl, timeoutMs: Math.min(timeoutMs, 900) });
    if (!verified.ok) {
      skipped.push({ ...cand, reason: verified.reason });
      continue;
    }
    const targetPid = verified.pid;
    if (targetPid === currentPid || (primaryPid > 0 && targetPid === primaryPid) || handledPids.has(targetPid)) {
      skipped.push({ ...cand, pid: targetPid, reason: targetPid === primaryPid ? 'primary' : 'duplicate_pid' });
      continue;
    }
    if (!isPidAliveImpl(targetPid)) {
      skipped.push({ ...cand, pid: targetPid, reason: 'not_alive' });
      continue;
    }
    handledPids.add(targetPid);

    const headers = { 'Content-Type': 'application/json' };
    if (cand.token) headers['X-Sidecar-Token'] = cand.token;
    const sdRes = await fetchImpl(`http://127.0.0.1:${cand.port}/api/shutdown`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ preserveHostDom: true, reason: 'install_local_cleanup' }),
      signal: AbortSignal.timeout(timeoutMs),
    }).catch(() => null);

    if (sdRes?.ok) {
      const deadline = Date.now() + 1200;
      while (Date.now() < deadline && isPidAliveImpl(targetPid)) {
        await new Promise((r) => setTimeout(r, 60));
      }
      if (!isPidAliveImpl(targetPid)) {
        cleaned.push({ pid: targetPid, port: cand.port, method: 'http_shutdown', version: verified.status?.version || '' });
        continue;
      }
    }

    // Legacy v2.1.0 lacks POST /api/shutdown (returns 404, or 401 before route dispatch when unauthenticated)
    const canSigterm =
      !sdRes ||
      sdRes.status === 404 ||
      sdRes.status === 405 ||
      (sdRes.status === 401 && !cand.token) ||
      sdRes.ok;
    if (canSigterm) {
      let terminated = false;
      try {
        killPidImpl(targetPid, 'SIGTERM');
        terminated = true;
      } catch (err) {
        if (err?.code === 'ESRCH') terminated = true;
      }
      if (terminated) {
        cleaned.push({
          pid: targetPid,
          port: cand.port,
          method: 'sigterm',
          httpStatus: sdRes?.status || 0,
          version: verified.status?.version || '',
        });
        continue;
      }
    }
    skipped.push({ ...cand, pid: targetPid, reason: `shutdown_http_${sdRes?.status || 'err'}` });
  }

  return { cleaned, skipped, candidateCount: candidates.length };
}

/** Reload primary Sidecar host scripts without altering skinEnabled. */
export async function reloadPrimarySidecar({ port, token = '', fetchImpl = fetch, timeoutMs = 1500 } = {}) {
  const numPort = Number(port);
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['X-Sidecar-Token'] = token;
  if (!Number.isInteger(numPort) || numPort < 1 || numPort > 65535) {
    return { reloaded: false, state: null, headers };
  }
  const reloadRes = await fetchImpl(`http://127.0.0.1:${numPort}/api/host/reload`, {
    method: 'POST',
    headers,
    body: '{}',
    signal: AbortSignal.timeout(timeoutMs),
  }).catch(() => null);
  const reloadJson = reloadRes?.ok ? await reloadRes.json().catch(() => null) : null;
  let st = reloadJson?.state || null;
  if (!st?.config) {
    const bootRes = await fetchImpl(`http://127.0.0.1:${numPort}/api/bootstrap`, {
      signal: AbortSignal.timeout(timeoutMs),
    }).catch(() => null);
    if (bootRes?.ok) st = await bootRes.json().catch(() => null);
  }
  return { reloaded: Boolean(reloadRes?.ok), state: st, headers };
}

/** Wake primary Sidecar ONLY when skinEnabled was not explicitly false before/after sync. */
export async function wakePrimarySidecarIfEnabled({
  port,
  token = '',
  wasSkinEnabled = true,
  state = null,
  fetchImpl = fetch,
  timeoutMs = 2500,
} = {}) {
  const numPort = Number(port);
  if (!Number.isInteger(numPort) || numPort < 1 || numPort > 65535) return { woke: false };
  if (wasSkinEnabled === false || state?.skinEnabled === false || state?.config?.skinEnabled === false) {
    return { woke: false };
  }
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['X-Sidecar-Token'] = token;
  const wakeRes = await fetchImpl(`http://127.0.0.1:${numPort}/api/skin/wake`, {
    method: 'POST',
    headers,
    body: '{}',
    signal: AbortSignal.timeout(timeoutMs),
  }).catch(() => null);
  return { woke: Boolean(wakeRes?.ok) };
}

/** Reload primary Sidecar scripts and conditionally wake only if skinEnabled was not false. */
export async function syncPrimarySidecar({
  port,
  token = '',
  wasSkinEnabled = true,
  fetchImpl = fetch,
  timeoutMs = 1500,
} = {}) {
  const rel = await reloadPrimarySidecar({ port, token, fetchImpl, timeoutMs });
  const wake = await wakePrimarySidecarIfEnabled({
    port,
    token,
    wasSkinEnabled,
    state: rel.state,
    fetchImpl,
    timeoutMs: Math.max(timeoutMs, 2500),
  });
  return { ...rel, woke: wake.woke };
}

export async function installLocalPlugin({ destRoot = '', skipSidecarReload = false, dataDir = '' } = {}) {
  const indexHtml = join(repoRoot, 'sidecars', 'prism_studio', 'index.html');
  if (!existsSync(indexHtml)) {
    await buildStudioBundle();
  }

  const prismDataDir = dataDir ? resolve(dataDir) : resolveDefaultPrismDataDir();
  let preDiskConfig = null;
  let preStatus = null;
  if (!destRoot && !skipSidecarReload) {
    preDiskConfig = readJsonSafe(join(prismDataDir, 'config.json'));
    const preInfo = readJsonSafe(join(prismDataDir, 'server_info.json'));
    if (preInfo && Number(preInfo.port) > 0 && (!preInfo.pid || isPidAlive(preInfo.pid))) {
      const verifiedPre = await verifyPrismSidecarStatus(preInfo, { timeoutMs: 800 });
      if (verifiedPre.ok) preStatus = verifiedPre.status;
    }
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
    join('src', 'shared', 'i18n.mjs'),
    join('src', 'engine', 'index.mjs'),
    join('src', 'host', 'index.mjs'),
    join('src', 'host', 'wallpaper-inject.js'),
    join('src', 'host', 'panel-inject.js'),
    join('src', 'host', 'inspector-inject.js'),
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
      const postDiskConfig = readJsonSafe(join(prismDataDir, 'config.json'));
      const postInfo = readJsonSafe(join(prismDataDir, 'server_info.json'));
      let primaryPid = 0;
      let livePort = 0;
      let liveToken = '';
      let postStatus = null;
      if (postInfo && Number(postInfo.port) > 0 && (!postInfo.pid || isPidAlive(postInfo.pid))) {
        const verifiedPrimary = await verifyPrismSidecarStatus(postInfo, { timeoutMs: 800 });
        if (verifiedPrimary.ok) {
          primaryPid = verifiedPrimary.pid;
          livePort = verifiedPrimary.port;
          liveToken = typeof postInfo.token === 'string' ? postInfo.token : '';
          postStatus = verifiedPrimary.status;
        }
      }

      const cleanupResult = await cleanupOrphanPrismSidecars({
        dataDir: prismDataDir,
        primaryPid,
        primaryPort: livePort,
      });
      if (cleanupResult.cleaned.length > 0) {
        const summary = cleanupResult.cleaned.map((c) => `${c.pid}:${c.port}(${c.method})`).join(', ');
        console.log(`[install] Cleaned ${cleanupResult.cleaned.length} orphan/duplicate Prism sidecar(s): ${summary}`);
      }

      const wasSkinEnabled = resolveWasSkinEnabled({
        preStatus,
        postStatus,
        preConfig: preDiskConfig,
        postConfig: postDiskConfig,
      });

      let liveBootPayload = null;
      let st = null;
      if (livePort > 0) {
        const rel = await reloadPrimarySidecar({ port: livePort, token: liveToken });
        st = rel.state;
        if (st?.config) {
          liveBootPayload = buildClientSkinPayload(st.config, st.activeItem, st.mediaOrigin, {
            skinEnabled: st.skinEnabled,
            slides: st.activeItem?.slides,
          });
        }
      }

      // Force-replace in-memory `window.__agyPrism` & `window.__agyPrismPanel` even on same-version (`2.3.0 -> 2.3.0`) hot installs
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
            var wasSkinOn = ${JSON.stringify(wasSkinEnabled !== false)};
            var cur = window.__agyPrism;
            var carry = payload || (cur && typeof cur.getLastPayload === 'function' ? cur.getLastPayload() : null) || window.__AGY_PRISM_BOOT_PAYLOAD__ || null;
            if (carry) window.__AGY_PRISM_BOOT_PAYLOAD__ = carry;
            var hostBase = String(window.__agyPrismHostBase || '');
            var staleOrigin = Boolean(expectedPrefix) && (!hostBase || hostBase.indexOf(expectedPrefix) !== 0);

            var hadPanel = Boolean(window.__agyPrismPanel);
            if (window.__agyPrismKt) { clearInterval(window.__agyPrismKt); window.__agyPrismKt = 0; }
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
              b.className = 'agy-prism-pill';
              b.type = 'button';
              b.setAttribute('translate', 'no');
              b.dataset.noTranslate = 'true';
              b.dataset.agNoI18n = '1';
              b.dataset.prismLazyStub = '1';
              b.textContent = '\\u25C6 Prism';
              b.style.cssText = 'all:initial;display:inline-flex;align-items:center;white-space:nowrap;flex-shrink:0;cursor:pointer;font:500 11px/18px system-ui,sans-serif;padding:2px 8px;border-radius:999px;color:#cbd5e1;background:rgba(20,20,26,.72);border:1px solid rgba(255,255,255,.14);z-index:44;';
              var f = document.querySelector('.agy-composer-footer,.composer-bar,[data-testid="agent-input-box"] footer');
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
            var skinOn = wasSkinOn && (!carry || carry.skinEnabled !== false);
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
            window.__agyPrismOn = true;
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
        const liveOriginPrefix = livePort ? `http://127.0.0.1:${livePort}/` : '';
        for (const t of targets) {
          const tUrl = String(t.url || '');
          if (
            (t.type === 'iframe' && tUrl.startsWith('plugin://agy-wallpaper-prism--prism_studio')) ||
            (t.type === 'page' && liveOriginPrefix && tUrl.startsWith(liveOriginPrefix))
          ) {
            await evaluateTargetEphemeral(t.webSocketDebuggerUrl, 'window.location.reload()').catch(() => {});
          }
        }
        break;
      }

      if (livePort > 0) {
        await wakePrimarySidecarIfEnabled({
          port: livePort,
          token: liveToken,
          wasSkinEnabled,
          state: st,
        });
      }

      if (wasSkinEnabled !== false && hotReplacedTargets.length > 0 && liveBootPayload?.activeItem && liveBootPayload?.skinEnabled !== false) {
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
