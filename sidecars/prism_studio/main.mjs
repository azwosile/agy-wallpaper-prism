#!/usr/bin/env node
// Unified Authoritative Backend for agy-wallpaper-prism (Sidecar HTTP Server + Passive CDP Bridge).
// Serves Sidecar Studio UI (0 Agent Tokens) + all /api/* routes + Passive CDP Host Controller.

import { execFile } from 'node:child_process';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer, request as httpRequest } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath, pathToFileURL } from 'node:url';

import * as schemaModule from '../../src/shared/schema.mjs';
import {
  DEFAULT_DEBUG_PORT,
  PER_WALLPAPER_OVERRIDE_KEYS,
  PLUGIN_ID,
  PLUGIN_VERSION,
  PRISM_DOM,
  SCENE_PRESETS,
  SCENE_PRESET_IDS,
  SIDECAR_URI,
} from '../../src/shared/schema.mjs';
import {
  createWallpaperPrismEngine,
  hasRawTraversalAttempt,
  resolveDefaultPrismDataDir,
} from '../../src/engine/index.mjs';
import { createPrismUpdater, isManagedSidecar } from '../../src/engine/updater.mjs';
import * as hostModule from '../../src/host/index.mjs';
import {
  cleanHostEnv,
  createCanaryController,
  createDebugShortcut,
  createPassiveCdpBridge,
  disableNormalShortcutAutoLoad,
  enableNormalShortcutAutoLoad,
  evaluateTargetEphemeral,
  inspectNormalShortcuts,
  listCdpTargets,
  probeCdpPort,
  readDevToolsActivePort,
} from './cdp-bridge.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = resolve(__dirname, '..', '..');
const INDEX_HTML_PATH = join(__dirname, 'index.html');
const MAX_JSON_BYTES = 16 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 512 * 1024 * 1024;
const POPOUT_MODES = new Set(['visual-editor']);
const FALLBACK_REGION_IDS = Object.freeze([
  'topbar',
  'wco',
  'sidebar',
  'workspace',
  'card',
  'composer',
  'rightPane',
  'popover',
]);

function getValidRegionIdSet() {
  const list =
    Array.isArray(schemaModule.REGION_IDS) && schemaModule.REGION_IDS.length > 0
      ? schemaModule.REGION_IDS
      : FALLBACK_REGION_IDS;
  return new Set(list);
}

function launchSystemBrowserNoShell(targetUrl, { platform = process.platform, openExternalUrl = null } = {}) {
  if (typeof openExternalUrl === 'function') {
    return Promise.resolve(openExternalUrl(targetUrl)).then(() => ({ ok: true, launched: true }));
  }
  let bin;
  let args;
  if (platform === 'win32') {
    bin = process.env.SystemRoot
      ? `${process.env.SystemRoot}\\System32\\rundll32.exe`
      : 'rundll32.exe';
    args = ['url.dll,FileProtocolHandler', targetUrl];
  } else if (platform === 'darwin') {
    bin = 'open';
    args = [targetUrl];
  } else {
    bin = 'xdg-open';
    args = [targetUrl];
  }
  return new Promise((resolveLaunch, rejectLaunch) => {
    execFile(
      bin,
      args,
      { timeout: 8000, windowsHide: true, env: cleanHostEnv() },
      (err) => {
        if (err) rejectLaunch(err);
        else resolveLaunch({ ok: true, launched: true });
      },
    );
  });
}

const PRELOAD_SHIM_JS = `window.__agyDomTranslatorInitialized = true;
(function() {
  var params = new URLSearchParams(window.location.search);
  var boot = window.__SIDECAR_BOOT__ || {};
  var token = params.get('token') || boot.token || '';
  var conversationId = params.get('conversationId') || boot.conversationId || '';
  var workspaceUris = [];
  var wsListeners = new Set();

  window.addEventListener('message', function(event) {
    if (!event.data || typeof event.data !== 'object') return;
    if (event.data.type === 'theme-change') {
      var vars = (event.data.payload && event.data.payload.cssVariables) || {};
      Object.keys(vars).forEach(function(k) {
        document.documentElement.style.setProperty(k, vars[k]);
      });
      window.dispatchEvent(new CustomEvent('prism-host-theme', { detail: vars }));
    } else if (event.data.type === 'prism-theme-sync') {
      window.dispatchEvent(new CustomEvent('prism-theme-sync', { detail: event.data.payload || {} }));
    } else if (event.data.type === 'workspace-change') {
      var list = (event.data.payload && event.data.payload.workspaceUris) || [];
      workspaceUris = Array.isArray(list) ? list.slice() : [];
      wsListeners.forEach(function(fn) { try { fn(workspaceUris.slice()); } catch (_) {} });
    }
  });

  function secureFetch(url, options) {
    var init = Object.assign({}, options || {});
    var headers = new Headers(init.headers || {});
    var effToken = token || (window.__SIDECAR_BOOT__ && window.__SIDECAR_BOOT__.token) || '';
    if (effToken) headers.set('X-Sidecar-Token', effToken);
    if (init.body && typeof init.body === 'string' && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    init.headers = headers;
    return window.fetch(url, init);
  }

  if (!window.sidecar) {
    window.sidecar = {
      conversationId: conversationId,
      fetch: secureFetch,
      getWorkspaceUris: function() { return Promise.resolve(workspaceUris.slice()); },
      onWorkspaceChange: function(fn) {
        if (typeof fn !== 'function') return function() {};
        wsListeners.add(fn);
        return function() { wsListeners.delete(fn); };
      },
      ui: {
        toggleAuxPane: function(req) {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'toggle-aux-pane', payload: req || {} }, '*');
          }
        }
      }
    };
  }
})();`;

function resolveDefaultDataDir(explicitDir = '') {
  return resolveDefaultPrismDataDir(explicitDir);
}

function buildFallbackStaticCss(skinPayload = {}) {
  const cfg = skinPayload?.config || {};
  const tok = skinPayload?.tokensPreview?.dark || {};
  const item = skinPayload?.activeItem || null;
  const imgUrl = item && (item.kind === 'image' || item.thumbUrl) ? String(item.mediaUrl || item.thumbUrl || '') : '';
  const safeImg = imgUrl ? `url(${JSON.stringify(imgUrl)})` : 'none';
  const baseRgb = tok.baseRgb || '14, 14, 17';
  const sidebarAlpha = Number(cfg.glassOpacity ?? 0.78).toFixed(2);
  return [
    'html:not([data-has-browser-hole="true"]) { background-color: #09090b; }',
    'html[data-has-browser-hole="true"], html[data-has-browser-hole="true"] body { background: transparent !important; }',
    'body { isolation: isolate; background: transparent !important; }',
    `body::before { content: ""; position: fixed; inset: 0; z-index: -1; pointer-events: none; background-image: ${safeImg}; background-size: cover; background-position: center; opacity: ${Number(cfg.mediaOpacity ?? 1)}; clip-path: var(--prism-hole-clip, none); }`,
    `body:not([data-has-browser-hole="true"]) { --background: rgba(${baseRgb}, ${sidebarAlpha}); --sidebar: rgba(${baseRgb}, ${sidebarAlpha}); --primary: ${tok.accent || '#669DF6'}; }`,
  ].join('\n');
}

export function injectBootIntoHtml(rawHtml, token = '', conversationId = '', { omitPreloadQueryToken = false } = {}) {
  const bootTag = `<script>window.__SIDECAR_BOOT__=${JSON.stringify({ token, conversationId })};</script>`;
  const preloadRe = /<script\b[^>]*\bsrc=(["'])\/preload\.js(?:\?[^"']*)?\1[^>]*>/i;
  let html;
  if (preloadRe.test(rawHtml)) {
    html = rawHtml.replace(preloadRe, (m) => `${bootTag}\n  ${m}`);
  } else if (/<head(?:\s[^>]*)?>/i.test(rawHtml)) {
    html = rawHtml.replace(/<head(?:\s[^>]*)?>/i, (m) => `${m}\n  ${bootTag}`);
  } else if (rawHtml.includes('</head>')) {
    html = rawHtml.replace('</head>', `${bootTag}\n</head>`);
  } else {
    html = `${bootTag}\n${rawHtml}`;
  }
  if (token && !omitPreloadQueryToken) {
    html = html.replace(/src=(["'])\/preload\.js\1/g, `src=$1/preload.js?token=${encodeURIComponent(token)}$1`);
  }
  return html;
}

function safeCompareTokens(a, b) {
  const sa = String(a || '');
  const sb = String(b || '');
  if (!sa || !sb) return false;
  const ba = Buffer.from(sa, 'utf8');
  const bb = Buffer.from(sb, 'utf8');
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

function isAllowedLoopbackHost(hostHeader) {
  const raw = String(hostHeader || '').trim();
  if (!raw) return false;
  const m = /^(?:127\.0\.0\.1|localhost|\[::1\])(?::(\d{1,5}))?$/i.exec(raw);
  if (!m) return false;
  if (m[1] !== undefined) {
    const port = Number(m[1]);
    if (!Number.isInteger(port) || port < 1 || port > 65535) return false;
  }
  return true;
}

function isAllowedStrictOrigin(originHeader) {
  const raw = String(originHeader || '').trim();
  if (!raw || raw === 'null') return true;
  if (/^plugin:\/\/[a-z0-9._-]+$/i.test(raw)) return true;
  if (/^vscode-webview:\/\/[a-z0-9._-]+$/i.test(raw)) return true;
  const m = /^https?:\/\/(?:127\.0\.0\.1|localhost|\[::1\])(?::(\d{1,5}))?$/i.exec(raw);
  if (!m) return false;
  if (m[1] !== undefined) {
    const port = Number(m[1]);
    if (!Number.isInteger(port) || port < 1 || port > 65535) return false;
  }
  return true;
}

function decorateUpdateStatus(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const hasUpdate = Boolean(raw.hasUpdate || raw.updateAvailable);
  return {
    ...raw,
    hasUpdate,
    updateAvailable: hasUpdate,
  };
}

function buildUpdateSummary(status) {
  if (!status || typeof status !== 'object') return null;
  const hasUpdate = Boolean(status.hasUpdate || status.updateAvailable);
  return {
    hasUpdate,
    updateAvailable: hasUpdate,
    currentVersion: status.currentVersion || PLUGIN_VERSION,
    latestVersion: status.latestVersion || null,
    latestTag: status.latestTag || null,
    releaseUrl: status.releaseUrl || '',
    canAutoUpdate: Boolean(status.canAutoUpdate),
    canSelfUpdate: Boolean(status.canSelfUpdate ?? status.canAutoUpdate),
    blockReason: status.blockReason || '',
  };
}

function sendJson(res, status, payload, extraHeaders = {}, opts = {}) {
  const { omitCors = false, onFlushed = null } = opts || {};
  const body = JSON.stringify(payload);
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  };
  if (!omitCors) {
    headers['Access-Control-Allow-Origin'] = '*';
  }
  Object.assign(headers, extraHeaders);
  res.writeHead(status, headers);
  if (typeof onFlushed === 'function') {
    res.end(body, () => {
      setImmediate(() => {
        try {
          onFlushed();
        } catch {
          /* ignore post-flush callback errors */
        }
      });
    });
  } else {
    res.end(body);
  }
}

function sendStrictJson(res, status, payload, extraHeaders = {}, onFlushed = null) {
  sendJson(res, status, payload, extraHeaders, { omitCors: true, onFlushed });
}

function readJsonBody(req, maxBytes = MAX_JSON_BYTES) {
  return new Promise((resolvePromise, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error('JSON request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (total === 0) {
        resolvePromise({});
        return;
      }
      try {
        resolvePromise(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (err) {
        reject(new Error(`Invalid JSON body: ${err.message}`));
      }
    });
    req.on('error', reject);
  });
}

function readRawBuffer(req, maxBytes = MAX_UPLOAD_BYTES) {
  return new Promise((resolvePromise, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error(`Upload exceeds ${Math.round(maxBytes / (1024 * 1024))} MB limit`));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolvePromise(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/**
 * Create and start the unified Prism Studio HTTP server + Engine + optional Passive CDP Bridge.
 */
export async function createPrismStudioServer(options = {}) {
  const hasExplicitDataDir = Boolean(
    (options.dataDir && String(options.dataDir).trim())
    || (process.env.AGY_PRISM_DATA_DIR && process.env.AGY_PRISM_DATA_DIR.trim()),
  );
  const dataDir = resolveDefaultDataDir(options.dataDir || '');
  const sidecarExecDataDir = process.env.ANTIGRAVITY_EXECUTABLE_DATA_DIR
    ? resolve(process.env.ANTIGRAVITY_EXECUTABLE_DATA_DIR)
    : dataDir;
  mkdirSync(dataDir, { recursive: true });

  const hostCapToken = options.hostCapToken
    ? String(options.hostCapToken)
    : randomBytes(32).toString('hex');
  let localSessionAwake = false;
  let boundOrigin = '';
  let server = null;
  const getPluginOrigin = () => {
    const addr = server?.address?.();
    const p = typeof addr === 'object' && addr ? addr.port : 0;
    return p > 0 ? `plugin://agy-wallpaper-prism--prism_studio-${p}` : '';
  };

  const envPort = parseInt(
    process.env.ANTIGRAVITY_SIDECAR_WEB_PORT ||
      process.env.ANTIGRAVITY_SIDECAR_PORT ||
      process.env.PORT ||
      '',
    10,
  );
  const listenPort = options.port !== undefined ? Number(options.port) : Number.isFinite(envPort) ? envPort : 0;
  const envAuthToken = String(
    process.env.ANTIGRAVITY_SIDECAR_UI_TOKEN ||
      process.env.ANTIGRAVITY_SIDECAR_AUTH_TOKEN ||
      process.env.ANTIGRAVITY_SIDECAR_WEB_TOKEN ||
      '',
  ).trim();
  const explicitOptionToken = options.token !== undefined ? String(options.token || '').trim() : '';
  const effectiveAuthToken = explicitOptionToken || envAuthToken || randomBytes(32).toString('hex');
  const startedAt = new Date().toISOString();
  const resolvedPluginRoot = options.pluginRoot ? resolve(options.pluginRoot) : PLUGIN_ROOT;
  const updaterEnv = options.env || process.env;
  let closed = false;
  let stateRev = 1;
  let deferredPushDepth = 0;
  let lastStudioBroadcastRev = 0;
  const bumpStateRev = () => {
    stateRev += 1;
    return stateRev;
  };
  const withDeferredPush = async (fn, { ensureRevBump = false } = {}) => {
    const startRev = stateRev;
    deferredPushDepth += 1;
    try {
      const res = await fn();
      if (ensureRevBump && stateRev === startRev) {
        bumpStateRev();
      }
      return res;
    } finally {
      deferredPushDepth = Math.max(0, deferredPushDepth - 1);
    }
  };
  const resolveHttpErrStatus = (err, fallback = 400) =>
    Number.isInteger(err?.statusCode) && err.statusCode >= 400 && err.statusCode < 600
      ? err.statusCode
      : fallback;

  const FALLBACK_INDEX_HTML =
    '<!doctype html><html><body><div id="app">Run node scripts/build.mjs first.</div></body></html>';
  let cachedIndexHtml = null;
  let cachedIndexMtimeMs = -1;
  let cachedIndexSize = -1;
  const getCachedIndexHtml = () => {
    try {
      if (!existsSync(INDEX_HTML_PATH)) {
        cachedIndexHtml = null;
        cachedIndexMtimeMs = -1;
        cachedIndexSize = -1;
        return FALLBACK_INDEX_HTML;
      }
      const st = statSync(INDEX_HTML_PATH);
      if (
        cachedIndexHtml !== null &&
        st.mtimeMs === cachedIndexMtimeMs &&
        st.size === cachedIndexSize
      ) {
        return cachedIndexHtml;
      }
      cachedIndexHtml = readFileSync(INDEX_HTML_PATH, 'utf8');
      cachedIndexMtimeMs = st.mtimeMs;
      cachedIndexSize = st.size;
      return cachedIndexHtml;
    } catch {
      return cachedIndexHtml || FALLBACK_INDEX_HTML;
    }
  };

  const engine =
    options.engine ||
    (await createWallpaperPrismEngine({
      dataDir,
      allowLegacyMigration: !hasExplicitDataDir,
      pluginRoot: resolvedPluginRoot,
      sidecarDataDir: sidecarExecDataDir,
    }));
  if (typeof engine.init === 'function') {
    await engine.init();
  }

  const updater =
    options.updater ||
    createPrismUpdater({
      pluginRoot: resolvedPluginRoot,
      dataDir,
      currentVersion: options.currentVersion || PLUGIN_VERSION,
      ...(options.updaterOptions || {}),
      onBeforeSync: async (ctx) => {
        if (typeof options.onBeforeSync === 'function') await options.onBeforeSync(ctx);
      },
      onRollback: async (err) => {
        if (typeof options.onRollback === 'function') await options.onRollback(err);
      },
      managedSidecar: options.managedSidecar,
      env: updaterEnv,
      fetchImpl: options.fetchImpl || options.updaterOptions?.fetchImpl || fetch,
    });

  try {
    updater.recoverPendingJournal?.();
  } catch {
    /* non-fatal startup journal recovery */
  }
  const justUpdatedMarker = (() => {
    try {
      return updater.consumeJustUpdatedMarker?.() || null;
    } catch {
      return null;
    }
  })();

  let cachedUpdateStatus = decorateUpdateStatus(
    (() => {
      try {
        return updater.getCachedStatus?.() || null;
      } catch {
        return null;
      }
    })(),
  );
  let updateApplyInFlight = false;
  let bootUpdateTimer = null;
  let retiredSweepTimer = null;

  const canaryController = createCanaryController({
    dataDir,
    pluginRoot: resolvedPluginRoot,
    onTripSafeMode: async () => {
      localSessionAwake = false;
      bumpStateRev();
      await engine.updateConfig({ skinEnabled: false });
      await engine.store?.flush?.();
    },
  });
  await canaryController.evaluateBoot('');

  let cdpBridge = null;
  const defaultSearchDirs = Array.isArray(options.shortcutSearchDirs) ? options.shortcutSearchDirs : null;
  let cachedAutostart = null;
  let cachedAutostartAt = 0;
  let autostartRefreshPromise = null;

  const getAutostartStatus = async ({ force = false, searchDirs = defaultSearchDirs, port = DEFAULT_DEBUG_PORT } = {}) => {
    const useCustomDirs = Array.isArray(searchDirs) && searchDirs !== defaultSearchDirs;
    if (!force && !useCustomDirs && cachedAutostart && Date.now() - cachedAutostartAt < 15_000) {
      return cachedAutostart;
    }
    if (!force && !useCustomDirs && cachedAutostart) {
      if (!autostartRefreshPromise) {
        autostartRefreshPromise = inspectNormalShortcuts({ searchDirs: defaultSearchDirs, dataDir, port })
          .then((res) => {
            cachedAutostart = res;
            cachedAutostartAt = Date.now();
            return res;
          })
          .catch(() => cachedAutostart)
          .finally(() => {
            autostartRefreshPromise = null;
          });
      }
      return cachedAutostart;
    }
    const fresh = await inspectNormalShortcuts({ searchDirs, dataDir, port });
    if (!useCustomDirs) {
      cachedAutostart = fresh;
      cachedAutostartAt = Date.now();
    }
    return fresh;
  };

  const normalizeLibrary = async (refresh = false) => {
    const raw = await engine.listLibrary({ refresh: Boolean(refresh) });
    if (Array.isArray(raw)) {
      return {
        items: raw,
        stats: { total: raw.length },
      };
    }
    return {
      items: Array.isArray(raw?.items) ? raw.items : [],
      stats: raw?.stats && typeof raw.stats === 'object' ? raw.stats : { total: Array.isArray(raw?.items) ? raw.items.length : 0 },
    };
  };

  const resolveActiveItem = async (cfg) => {
    if (typeof engine.getActivePayload === 'function') {
      const p = await engine.getActivePayload();
      if (p && typeof p === 'object') {
        if ('activeItem' in p) return p.activeItem;
        if ('item' in p) return p.item;
        if (p.id && p.kind) return p;
      }
    }
    const activeId = cfg?.activeWallpaperId || cfg?.wallpaperId || '';
    if (!activeId) return null;
    const lib = await normalizeLibrary(false);
    return lib.items.find((i) => i.id === activeId) || null;
  };

  const buildCanonicalState = async ({ includeAutostart = true } = {}) => {
    let config;
    let activeItem = null;
    let presets = [];
    let stats = {};
    let mediaOrigin = '';

    // Fast O(1) state read (<0.3ms): engine.getActivePayload() returns in-memory config, activeItem, presets, and stats directly without re-scanning or re-mapping the library!
    if (typeof engine.getActivePayload === 'function') {
      const p = await engine.getActivePayload();
      if (p && typeof p === 'object' && p.config) {
        config = p.config;
        activeItem = p.activeItem ?? null;
        presets = Array.isArray(p.presets) ? p.presets : [];
        stats = p.stats && typeof p.stats === 'object' ? p.stats : {};
        mediaOrigin = String(p.mediaOrigin || '');
      }
    }
    if (!config) {
      config = await engine.getConfig();
      activeItem = await resolveActiveItem(config);
      const lib = await normalizeLibrary(false);
      stats = lib.stats;
      const presetsRaw = typeof engine.listPresets === 'function' ? await engine.listPresets() : [];
      presets = Array.isArray(presetsRaw) ? presetsRaw : presetsRaw?.presets || [];
      mediaOrigin = typeof engine.getMediaOrigin === 'function' ? engine.getMediaOrigin() : '';
    }

    const autostart =
      options.inspectShortcuts === false || !includeAutostart
        ? cachedAutostart || {
            supported: process.platform === 'win32',
            normalShortcutEnabled: false,
            anyShortcutEnabled: false,
            port: config.debugPort || DEFAULT_DEBUG_PORT,
            sidecarAutoStartsOnBoot: true,
            autoRestoreLastSettings: true,
            shortcuts: [],
            patchedShortcuts: [],
          }
        : await getAutostartStatus({ force: false, port: config.debugPort || DEFAULT_DEBUG_PORT });

    const canary = cdpBridge ? cdpBridge.getCanary() : canaryController.getStatus();
    const startupMode = config.startupMode || 'gentle-auto';
    const sessionAwake =
      canary.state === 'tripped'
        ? false
        : cdpBridge
          ? cdpBridge.isSessionAwake(startupMode)
          : startupMode !== 'manual' || localSessionAwake;

    const baseHostStatus = cdpBridge
      ? cdpBridge.getStatus()
      : {
          phase: canary.state === 'tripped' ? 'tripped' : startupMode === 'manual' && !sessionAwake ? 'manual-standby' : 'standby',
          cdpReachable: false,
          port: config.debugPort || DEFAULT_DEBUG_PORT,
          pluginEnabled: true,
          canary,
          sessionAwake,
          attachedTargets: [],
          attachedCount: 0,
          version: PLUGIN_VERSION,
        };
    const hostStatus = {
      ...baseHostStatus,
      canary,
      sessionAwake,
      startupMode,
      liveBootDelay: config.liveBootDelay ?? 1.5,
      normalShortcutEnabled: Boolean(autostart.normalShortcutEnabled),
      anyShortcutEnabled: Boolean(autostart.anyShortcutEnabled),
      patchedShortcuts: autostart.patchedShortcuts || [],
      shortcuts: autostart.shortcuts || [],
      sidecarAutoStartsOnBoot: startupMode !== 'manual',
      autoRestoreLastSettings: startupMode !== 'manual',
    };
    return {
      stateRev,
      config,
      activeItem,
      skinEnabled: config.skinEnabled !== false && canary.state !== 'tripped',
      canary,
      sessionAwake,
      presets,
      hostStatus,
      autostart,
      normalShortcutEnabled: hostStatus.normalShortcutEnabled,
      patchedShortcuts: hostStatus.patchedShortcuts,
      sidecarAutoStartsOnBoot: hostStatus.sidecarAutoStartsOnBoot,
      autoRestoreLastSettings: hostStatus.autoRestoreLastSettings,
      stats,
      mediaOrigin,
      pluginOrigin: getPluginOrigin(),
      studioHttpOrigin: boundOrigin,
      pid: process.pid,
      version: PLUGIN_VERSION,
      studioUri: SIDECAR_URI,
      updateStatus: cachedUpdateStatus,
      updateSummary: buildUpdateSummary(cachedUpdateStatus),
    };
  };

  const studioSseClients = new Map(); // ServerResponse -> 'aux' | 'popout'
  const studioSseKeepalives = new Set();
  let studioBroadcastScheduled = false;
  let studioBroadcastPending = false;
  let studioBroadcastForce = false;

  const broadcastStudioState = async ({ force = false } = {}) => {
    if (studioSseClients.size === 0) return;
    if (force) studioBroadcastForce = true;
    if (studioBroadcastScheduled) {
      studioBroadcastPending = true;
      return;
    }
    studioBroadcastScheduled = true;
    try {
      do {
        studioBroadcastPending = false;
        const doForce = studioBroadcastForce;
        studioBroadcastForce = false;
        if (studioSseClients.size === 0) break;
        const st = await buildCanonicalState();
        if (!doForce && st.stateRev === lastStudioBroadcastRev) continue;
        const serialized = `event: state\ndata: ${JSON.stringify(st)}\n\n`;
        let wroteAny = false;
        for (const clientRes of [...studioSseClients.keys()]) {
          if (clientRes.writableEnded || clientRes.destroyed) {
            studioSseClients.delete(clientRes);
            continue;
          }
          try {
            clientRes.write(serialized);
            wroteAny = true;
          } catch {
            studioSseClients.delete(clientRes);
          }
        }
        if (wroteAny) lastStudioBroadcastRev = st.stateRev;
      } while (studioBroadcastPending);
    } catch {
      /* best-effort studio sync */
    } finally {
      studioBroadcastScheduled = false;
    }
  };

  let pushScheduled = false;
  let pushPending = false;
  const pushToHost = async () => {
    void broadcastStudioState();
    if (!cdpBridge) return;
    if (pushScheduled) {
      pushPending = true;
      return;
    }
    pushScheduled = true;
    try {
      do {
        pushPending = false;
        await cdpBridge.broadcastState().catch(() => {});
      } while (pushPending);
    } finally {
      pushScheduled = false;
    }
  };

  const REGION_OPTICAL_KEYS = Object.freeze([
    'glassEnabled',
    'blur',
    'opacity',
    'tone',
    'tint',
    'borderOpacity',
  ]);
  const REGION_OPTICAL_RESET_VALUES = Object.freeze({
    glassEnabled: null,
    blur: null,
    opacity: null,
    tone: 0,
    tint: '',
    borderOpacity: null,
  });
  const isPlainObj = (x) => Boolean(x && typeof x === 'object' && !Array.isArray(x));
  const hasOwn = (o, k) => Boolean(o && Object.prototype.hasOwnProperty.call(o, k));
  const PER_WALLPAPER_OVERRIDE_KEY_SET = new Set([
    ...PER_WALLPAPER_OVERRIDE_KEYS,
    'regions',
    'globalFontSize',
    'globalFontFamily',
    'globalFontColor',
  ]);

  const routeRpcConfigPatch = async (rawPatch) => {
    const patch = isPlainObj(rawPatch) ? { ...rawPatch } : {};
    if ('perWallpaperOverrides' in patch) return patch;
    const cfg = await engine.getConfig();
    const activeId = String(cfg?.activeWallpaperId || '');
    const existingOv =
      activeId && isPlainObj(cfg?.perWallpaperOverrides) && isPlainObj(cfg.perWallpaperOverrides[activeId])
        ? cfg.perWallpaperOverrides[activeId]
        : null;
    if (!existingOv) return patch;

    const nextOv = { ...existingOv };
    const hasPatchRegions = hasOwn(patch, 'regions');
    const hasPatchRegionsSidebar =
      hasPatchRegions &&
      (patch.regions === null || (isPlainObj(patch.regions) && hasOwn(patch.regions, 'sidebar')));
    const hasPatchSurfaceTints = hasOwn(patch, 'surfaceTints');
    const hasPatchSidebarOp = hasOwn(patch, 'sidebarOpacity');
    const hasPatchSidebarBlur = hasOwn(patch, 'sidebarBlur');
    let touchedOv = false;
    const topPatch = {};

    // Process `surfaceTints` before `regions` when both exist in the same patch so `regions` wins.
    const entries = Object.entries(patch).sort(([a], [b]) => {
      const rank = (k) => (k === 'surfaceTints' ? 1 : k === 'regions' ? 2 : 0);
      return rank(a) - rank(b);
    });

    for (const [k, v] of entries) {
      if (PER_WALLPAPER_OVERRIDE_KEY_SET.has(k)) {
        if (k === 'regions') {
          if (v === null) {
            nextOv.regions = null;
            nextOv.surfaceTints = null;
            if (!hasPatchSidebarOp && 'sidebarOpacity' in nextOv) nextOv.sidebarOpacity = null;
            if (!hasPatchSidebarBlur && 'sidebarBlur' in nextOv) nextOv.sidebarBlur = null;
          } else if (isPlainObj(v)) {
            const prevRegions = isPlainObj(nextOv.regions) ? { ...nextOv.regions } : {};
            if (isPlainObj(nextOv.surfaceTints)) {
              for (const [tRid, tVal] of Object.entries(nextOv.surfaceTints)) {
                if (!hasOwn(prevRegions, tRid) && isPlainObj(tVal)) {
                  prevRegions[tRid] = { ...tVal };
                }
              }
            }
            const mergedRegions = { ...prevRegions };
            let tintsBase = isPlainObj(nextOv.surfaceTints) ? { ...nextOv.surfaceTints } : null;
            let touchedTints = false;
            for (const [rid, rVal] of Object.entries(v)) {
              if (rVal === null) {
                mergedRegions[rid] = null;
                if (tintsBase) {
                  tintsBase[rid] = null;
                  touchedTints = true;
                }
              } else if (isPlainObj(rVal)) {
                const prevEntry = isPlainObj(prevRegions[rid]) ? prevRegions[rid] : {};
                mergedRegions[rid] = { ...prevEntry, ...rVal };
                const optPatch = {};
                let hasOpt = false;
                for (const ok of REGION_OPTICAL_KEYS) {
                  if (hasOwn(rVal, ok)) {
                    optPatch[ok] = rVal[ok];
                    hasOpt = true;
                  }
                }
                if (hasOpt) {
                  if (!tintsBase) tintsBase = {};
                  const prevT = isPlainObj(tintsBase[rid]) ? tintsBase[rid] : {};
                  tintsBase[rid] = { ...prevT, ...optPatch };
                  touchedTints = true;
                }
              }
            }
            nextOv.regions = mergedRegions;
            if (touchedTints && tintsBase) nextOv.surfaceTints = tintsBase;
            if (hasOwn(v, 'sidebar')) {
              const sbEntry = mergedRegions.sidebar;
              if (
                !hasPatchSidebarOp &&
                'sidebarOpacity' in nextOv &&
                (v.sidebar === null || (isPlainObj(v.sidebar) && hasOwn(v.sidebar, 'opacity')))
              ) {
                nextOv.sidebarOpacity = isPlainObj(sbEntry) ? (sbEntry.opacity ?? null) : null;
              }
              if (
                !hasPatchSidebarBlur &&
                'sidebarBlur' in nextOv &&
                (v.sidebar === null || (isPlainObj(v.sidebar) && hasOwn(v.sidebar, 'blur')))
              ) {
                nextOv.sidebarBlur = isPlainObj(sbEntry) ? (sbEntry.blur ?? null) : null;
              }
            }
          }
        } else if (k === 'surfaceTints') {
          if (v === null) {
            nextOv.surfaceTints = null;
            // Hard invariant: SCENE_PRESETS (`surfaceTints: null`) resets only optical 6 keys, preserving non-optical keys in `nextOv.regions`.
            if (!hasPatchRegions && isPlainObj(nextOv.regions)) {
              const clearedRegions = { ...nextOv.regions };
              for (const [rid, rEntry] of Object.entries(clearedRegions)) {
                if (isPlainObj(rEntry)) {
                  clearedRegions[rid] = { ...rEntry, ...REGION_OPTICAL_RESET_VALUES };
                }
              }
              nextOv.regions = clearedRegions;
            }
            if (!hasPatchSidebarOp && 'sidebarOpacity' in nextOv) nextOv.sidebarOpacity = null;
            if (!hasPatchSidebarBlur && 'sidebarBlur' in nextOv) nextOv.sidebarBlur = null;
          } else if (isPlainObj(v)) {
            const prevTints = isPlainObj(nextOv.surfaceTints) ? nextOv.surfaceTints : {};
            const mergedTints = { ...prevTints };
            let mergedRegions = isPlainObj(nextOv.regions) ? { ...nextOv.regions } : null;
            for (const [comp, compVal] of Object.entries(v)) {
              if (compVal === null) {
                mergedTints[comp] = null;
                if (mergedRegions && isPlainObj(mergedRegions[comp])) {
                  mergedRegions[comp] = { ...mergedRegions[comp], ...REGION_OPTICAL_RESET_VALUES };
                }
              } else if (isPlainObj(compVal)) {
                const prevComp = isPlainObj(prevTints[comp]) ? prevTints[comp] : {};
                mergedTints[comp] = { ...prevComp, ...compVal };
                if (!mergedRegions) mergedRegions = {};
                const prevR = isPlainObj(mergedRegions[comp]) ? mergedRegions[comp] : {};
                mergedRegions[comp] = { ...prevR, ...compVal };
              }
            }
            nextOv.surfaceTints = mergedTints;
            if (mergedRegions && !hasPatchRegions) {
              nextOv.regions = mergedRegions;
            }
            if (hasOwn(v, 'sidebar')) {
              const sbEntry = mergedTints.sidebar;
              if (
                !hasPatchSidebarOp &&
                'sidebarOpacity' in nextOv &&
                (v.sidebar === null || (isPlainObj(v.sidebar) && hasOwn(v.sidebar, 'opacity')))
              ) {
                nextOv.sidebarOpacity = isPlainObj(sbEntry) ? (sbEntry.opacity ?? null) : null;
              }
              if (
                !hasPatchSidebarBlur &&
                'sidebarBlur' in nextOv &&
                (v.sidebar === null || (isPlainObj(v.sidebar) && hasOwn(v.sidebar, 'blur')))
              ) {
                nextOv.sidebarBlur = isPlainObj(sbEntry) ? (sbEntry.blur ?? null) : null;
              }
            }
          }
        } else {
          // Preserve explicit `null` (e.g. sidebarBlur: null / sidebarOpacity: null) — NEVER delete the key!
          nextOv[k] = v;
          if ((k === 'sidebarOpacity' || k === 'sidebarBlur') && !hasPatchSurfaceTints && !hasPatchRegionsSidebar) {
            const propKey = k === 'sidebarOpacity' ? 'opacity' : 'blur';
            if (isPlainObj(nextOv.surfaceTints) && hasOwn(nextOv.surfaceTints, 'sidebar')) {
              const prevSb = isPlainObj(nextOv.surfaceTints.sidebar) ? nextOv.surfaceTints.sidebar : {};
              nextOv.surfaceTints = {
                ...nextOv.surfaceTints,
                sidebar: { ...prevSb, [propKey]: v },
              };
            }
            if (isPlainObj(nextOv.regions) && hasOwn(nextOv.regions, 'sidebar')) {
              const prevRsb = isPlainObj(nextOv.regions.sidebar) ? nextOv.regions.sidebar : {};
              nextOv.regions = {
                ...nextOv.regions,
                sidebar: { ...prevRsb, [propKey]: v },
              };
            }
          }
        }
        touchedOv = true;
      } else {
        topPatch[k] = v;
      }
    }
    if (!touchedOv) return patch;
    topPatch.perWallpaperOverrides = {
      ...(cfg.perWallpaperOverrides || {}),
      [activeId]: nextOv,
    };
    return topPatch;
  };

  const applyAnyPreset = async (presetId, opts = {}) => {
    const id = String(presetId || '').trim();
    if (!id) throw Object.assign(new Error('Missing presetId'), { statusCode: 400 });
    const overrideStrategy = opts?.overrideStrategy === 'clear' ? 'clear' : 'sync';
    let applied = null;
    await withDeferredPush(
      async () => {
        if (typeof engine.applyPreset === 'function') {
          applied = await engine.applyPreset(id, { overrideStrategy });
          if (applied?.config?.skinEnabled === false) {
            await engine.updateConfig({ skinEnabled: true });
          }
        } else if (SCENE_PRESET_IDS.includes(id)) {
          await engine.updateConfig({ ...SCENE_PRESETS[id].patch, skinEnabled: true });
        } else {
          throw Object.assign(new Error(`Unknown preset: ${id}`), { statusCode: 404 });
        }
      },
      { ensureRevBump: true },
    );
    if (cdpBridge) {
      await cdpBridge.wake({ forceProbe: false });
      void broadcastStudioState();
    } else {
      await pushToHost();
    }
    const state = await buildCanonicalState();
    return {
      state,
      preset: applied?.preset || null,
      overrideSynced: Boolean(applied?.overrideSynced),
      wallpaperFallback: applied?.wallpaperFallback || null,
      missingWallpaperId: applied?.wallpaperFallback?.missingId || '',
    };
  };

  const rpcHandlers = {
    'state.get': () => buildCanonicalState(),
    'bootstrap.get': () => buildCanonicalState(),
    'library.list': async (params = {}) => normalizeLibrary(Boolean(params.refresh)),
    'config.set': async (params = {}) => {
      const rawPatch = params.patch && typeof params.patch === 'object' && !Array.isArray(params.patch) ? params.patch : params;
      const shouldDebounce = params?.flush !== true;
      const patch = await routeRpcConfigPatch(rawPatch);
      await withDeferredPush(() => engine.updateConfig(patch, { debounce: shouldDebounce }), { ensureRevBump: true });
      const state = await buildCanonicalState();
      void pushToHost();
      return state;
    },
    'prefs.set': async (params = {}) => {
      const rawPatch = params.patch && typeof params.patch === 'object' && !Array.isArray(params.patch) ? params.patch : params;
      const shouldDebounce = params?.flush !== true;
      const patch = await routeRpcConfigPatch(rawPatch);
      await withDeferredPush(() => engine.updateConfig(patch, { debounce: shouldDebounce }), { ensureRevBump: true });
      const state = await buildCanonicalState();
      void pushToHost();
      return state;
    },
    'config.reset': async (params = {}) => {
      await withDeferredPush(() => engine.resetConfig(params.scope || 'all'), { ensureRevBump: true });
      await pushToHost();
      return buildCanonicalState();
    },
    'prefs.reset': async (params = {}) => {
      await withDeferredPush(() => engine.resetConfig(params.scope || 'all'), { ensureRevBump: true });
      await pushToHost();
      return buildCanonicalState();
    },
    'wallpaper.apply': async (params = {}) => {
      const wid = String(params.wallpaperId || params.id || '');
      localSessionAwake = true;
      await withDeferredPush(
        () => engine.applyWallpaper(wid, { ...(params.patch || {}), skinEnabled: true }),
        { ensureRevBump: true },
      );
      if (cdpBridge) {
        await cdpBridge.wake({ forceProbe: false });
        void broadcastStudioState();
      } else {
        await pushToHost();
      }
      return buildCanonicalState();
    },
    'playlist.step': async (params = {}) => {
      const dir = Number(params.direction) === -1 ? -1 : 1;
      await withDeferredPush(() => engine.stepPlaylist(dir, String(params.reason || 'rpc')), { ensureRevBump: true });
      await pushToHost();
      return buildCanonicalState();
    },
    'preset.apply': async (params = {}) => {
      localSessionAwake = true;
      const res = await applyAnyPreset(params.presetId || params.id || params.name, {
        overrideStrategy: params.overrideStrategy,
      });
      return {
        ...res.state,
        preset: res.preset,
        overrideSynced: res.overrideSynced,
        wallpaperFallback: res.wallpaperFallback,
        missingWallpaperId: res.missingWallpaperId,
      };
    },
    'accent.save': async (params = {}) => {
      const cfg = await engine.getConfig();
      const wid = String(params.wallpaperId || cfg.activeWallpaperId || '');
      const entry = {
        wallpaperId: wid,
        darkHex: String(params.darkHex || '#669DF6'),
        lightHex: String(params.lightHex || '#2563EB'),
        tintRgb: String(params.tintRgb || '102, 157, 246'),
      };
      const prev = cfg.extractedAccent;
      const prevCached = wid && cfg.accentCache ? cfg.accentCache[wid] : null;
      if (
        prev &&
        prev.wallpaperId === entry.wallpaperId &&
        prev.darkHex === entry.darkHex &&
        prev.lightHex === entry.lightHex &&
        prev.tintRgb === entry.tintRgb &&
        (!wid || prevCached)
      ) {
        return { ok: true, extractedAccent: entry, unchanged: true };
      }
      const accentCache = { ...(cfg.accentCache || {}) };
      if (wid) accentCache[wid] = entry;
      await withDeferredPush(() => engine.updateConfig({ extractedAccent: entry, accentCache }), { ensureRevBump: true });
      await pushToHost();
      return { ok: true, extractedAccent: entry };
    },
    'skin.restore': async () => {
      await withDeferredPush(() => engine.updateConfig({ skinEnabled: false }), { ensureRevBump: true });
      await pushToHost();
      return buildCanonicalState();
    },
    'skin.panicRestore': async () => {
      localSessionAwake = false;
      await withDeferredPush(async () => {
        await engine.updateConfig({ skinEnabled: false });
        await engine.store?.flush?.();
      }, { ensureRevBump: true });
      bumpStateRev();
      await pushToHost();
      const state = await buildCanonicalState();
      return { ok: true, skinEnabled: false, stateRev: state.stateRev, state };
    },
    'skin.wake': async (params = {}) => {
      localSessionAwake = true;
      await withDeferredPush(() => engine.updateConfig({ skinEnabled: true }), { ensureRevBump: true });
      bumpStateRev();
      if (cdpBridge) {
        await cdpBridge.wake({ forceProbe: params?.forceProbe !== false });
        void broadcastStudioState();
      } else {
        await pushToHost();
      }
      const state = await buildCanonicalState();
      return { ok: true, sessionAwake: true, stateRev: state.stateRev, state };
    },
    'skin.toggle': async (params = {}) => {
      const curSt = await buildCanonicalState();
      const nextEnabled = typeof params?.enabled === 'boolean' ? params.enabled : !curSt.skinEnabled;
      if (nextEnabled) {
        localSessionAwake = true;
        await withDeferredPush(
          async () => {
            if (canaryController.getStatus().state === 'tripped') {
              if (cdpBridge) await cdpBridge.resetCanary();
              else canaryController.reset();
            }
            await engine.updateConfig({ skinEnabled: true });
          },
          { ensureRevBump: true },
        );
        if (cdpBridge) {
          await cdpBridge.wake({ forceProbe: false });
          void broadcastStudioState();
        } else {
          await pushToHost();
        }
      } else {
        await withDeferredPush(() => engine.updateConfig({ skinEnabled: false }), { ensureRevBump: true });
        await pushToHost();
      }
      const state = await buildCanonicalState();
      return { ok: true, skinEnabled: nextEnabled, stateRev: state.stateRev, state };
    },
    'canary.get': async () => ({ ok: true, canary: cdpBridge ? cdpBridge.getCanary() : canaryController.getStatus() }),
    'canary.healthy': async (params = {}) => {
      const next = cdpBridge
        ? cdpBridge.markCanaryHealthy(String(params.targetId || ''))
        : canaryController.markHealthy(String(params.targetId || ''));
      return { ok: true, canary: next };
    },
    'canary.rollback': async (params = {}) => {
      localSessionAwake = false;
      const reason = String(params.reason || 'root_watchdog_rollback');
      const targetId = String(params.targetId || '');
      const next = cdpBridge
        ? await cdpBridge.rollbackCanary(reason, targetId)
        : await canaryController.rollback(reason, targetId);
      bumpStateRev();
      const state = await buildCanonicalState();
      return { ok: true, canary: next, stateRev: state.stateRev, state };
    },
    'canary.reset': async () => {
      localSessionAwake = true;
      await withDeferredPush(() => engine.updateConfig({ skinEnabled: true }), { ensureRevBump: true });
      bumpStateRev();
      const next = cdpBridge ? await cdpBridge.resetCanary() : canaryController.reset();
      await pushToHost();
      const state = await buildCanonicalState();
      return { ok: true, canary: next, stateRev: state.stateRev, state };
    },
    'autostart.get': async (params = {}) => {
      const cfg = await engine.getConfig();
      return getAutostartStatus({ force: Boolean(params.refresh), port: cfg.debugPort || DEFAULT_DEBUG_PORT });
    },
    'autostart.set': async (params = {}) => {
      const enabled = params.enabled !== false;
      const cfg = await engine.getConfig();
      const port = Number(params.port || cfg.debugPort || DEFAULT_DEBUG_PORT);
      const res = enabled
        ? await enableNormalShortcutAutoLoad({ port, searchDirs: defaultSearchDirs, dataDir })
        : await disableNormalShortcutAutoLoad({ searchDirs: defaultSearchDirs, dataDir });
      cachedAutostart = res;
      cachedAutostartAt = Date.now();
      bumpStateRev();
      const state = await buildCanonicalState();
      return { ok: res.ok, autostart: res, stateRev: state.stateRev, state };
    },
    'studio.open': async () => ({ ok: true, uri: SIDECAR_URI }),
  };

  if (options.startCdp !== false && process.env.AGY_PRISM_DISABLE_CDP !== '1') {
    cdpBridge = createPassiveCdpBridge({
      getEngineState: () => buildCanonicalState({ includeAutostart: false }),
      hostScripts: hostModule,
      rpcHandlers,
      getHostOrigin: () => boundOrigin,
      getPluginOrigin,
      capToken: hostCapToken,
      dataDir,
      pluginRoot: resolvedPluginRoot,
      canaryController,
      cdpPort: options.cdpPort || 0,
      pollMs: options.cdpPollMs ?? 3000,
      configPath: options.hostConfigPath || '',
      profileDir: options.profileDir || '',
      log: options.log || (() => {}),
    });
  }

  if (engine.events && typeof engine.events.on === 'function') {
    engine.events.on('change', () => {
      bumpStateRev();
    });
    engine.events.on('presets', () => {
      if (deferredPushDepth === 0) {
        void broadcastStudioState();
        if (cdpBridge) void cdpBridge.broadcastState({ sseOnly: true }).catch(() => {});
      }
    });
    for (const evName of ['skin', 'state', 'wallpaper', 'rotation']) {
      engine.events.on(evName, () => {
        if (evName === 'state') bumpStateRev();
        if (deferredPushDepth === 0) void pushToHost();
      });
    }
  }

  const validateToken = (req, urlObj, { headerOnly = false } = {}) => {
    const headerTok = typeof req.headers['x-sidecar-token'] === 'string' ? req.headers['x-sidecar-token'].trim() : '';
    if (safeCompareTokens(headerTok, effectiveAuthToken)) return true;
    if (headerOnly) return false;
    const queryTok = (urlObj.searchParams.get('token') || '').trim();
    return safeCompareTokens(queryTok, effectiveAuthToken);
  };

  const verifyHostCapToken = (candidate) => {
    const a = Buffer.from(String(candidate || ''), 'utf8');
    const b = Buffer.from(hostCapToken, 'utf8');
    return a.length === b.length && timingSafeEqual(a, b);
  };

  let close = async () => {};
  const triggerManagedSelfRestart = (applyResult) => {
    if (typeof options.onSelfRestart === 'function') {
      try {
        options.onSelfRestart(applyResult);
      } catch {
        /* ignore test hook error */
      }
      return;
    }
    if (!isManagedSidecar(updaterEnv, options.managedSidecar)) return;
    close({ preserveHostDom: true })
      .catch(() => {})
      .finally(() => {
        setTimeout(() => process.exit(1), 250);
      });
  };

  const handleRequest = async (req, res) => {
    // Global loopback Host DNS-rebinding guard (before OPTIONS, GET /, /preload.js, /host/*, /api/*)
    const rawHostHeader = Array.isArray(req.headers.host)
      ? req.headers.host.join(',').trim()
      : typeof req.headers.host === 'string'
        ? req.headers.host.trim()
        : '';
    const isInMemoryReq = !req.socket || typeof req.socket.setNoDelay !== 'function';
    const remoteAddr = String(req.socket?.remoteAddress || '');
    const isLoopbackRemote = remoteAddr === '127.0.0.1' || remoteAddr === '::1' || remoteAddr === '::ffff:127.0.0.1';
    if (rawHostHeader) {
      if (!isAllowedLoopbackHost(rawHostHeader)) {
        sendStrictJson(res, 403, { ok: false, code: 'ERR_DNS_REBINDING', error: 'Forbidden: non-loopback Host header' });
        return;
      }
    } else if (!isInMemoryReq && !isLoopbackRemote) {
      sendStrictJson(res, 403, { ok: false, code: 'ERR_DNS_REBINDING', error: 'Forbidden: missing Host header' });
      return;
    }

    const urlObj = new URL(req.url || '/', 'http://127.0.0.1');
    const pathname = urlObj.pathname;
    const reqOrigin = typeof req.headers.origin === 'string' && req.headers.origin ? req.headers.origin : '*';

    // Strict preflight interception for /api/update/*, /api/healthz & /api/studio/popout BEFORE global wildcard/PNA OPTIONS
    const isStrictRoute =
      pathname === '/api/healthz' ||
      pathname === '/api/update' ||
      pathname.startsWith('/api/update/') ||
      pathname === '/api/studio/popout';
    if (req.method === 'OPTIONS' && isStrictRoute) {
      const rawOrigin = typeof req.headers.origin === 'string' ? req.headers.origin.trim() : '';
      if (!isAllowedStrictOrigin(rawOrigin)) {
        sendStrictJson(res, 403, { ok: false, code: 'ERR_CSRF_ORIGIN', error: 'Forbidden: disallowed Origin' });
        return;
      }
      const preflightHeaders = {
        'Access-Control-Allow-Methods':
          pathname === '/api/update/apply' || pathname === '/api/studio/popout'
            ? 'POST, OPTIONS'
            : 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Sidecar-Token',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        Vary: 'Origin',
      };
      if (rawOrigin) {
        preflightHeaders['Access-Control-Allow-Origin'] = rawOrigin;
      }
      res.writeHead(204, preflightHeaders);
      res.end();
      return;
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': reqOrigin,
        Vary: 'Origin',
        'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Sidecar-Token, X-Prism-Token, Cache-Control, Range, If-Range, If-None-Match',
        'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, ETag, X-Prism-Mse-Mime, X-Prism-Animated-Preview',
        'Access-Control-Allow-Private-Network': 'true',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      });
      res.end();
      return;
    }

    // ---- Capability-Fenced Direct Host Bridge Routes (`/host/<256bitCapToken>/*`) ----
    const hostMatch = /^\/host\/([a-zA-Z0-9_-]{16,128})\/(stage\.js|panel\.js|static\.css|rpc|events)$/.exec(pathname);
    if (hostMatch) {
      const [, reqCap, asset] = hostMatch;
      const hostHeaders = {
        'Access-Control-Allow-Origin': reqOrigin,
        Vary: 'Origin',
        'Access-Control-Allow-Private-Network': 'true',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      };
      if (!verifyHostCapToken(reqCap)) {
        sendJson(res, 403, { ok: false, error: 'Forbidden: invalid host capability token' }, hostHeaders);
        return;
      }

      if (req.method === 'GET' && asset === 'stage.js') {
        const st = await buildCanonicalState();
        const skinPayload = hostModule.buildClientSkinPayload(st.config, st.activeItem, st.mediaOrigin, {
          skinEnabled: st.skinEnabled,
          slides: st.activeItem?.slides,
          pluginOrigin: getPluginOrigin(),
          stateRev: st.stateRev,
        });
        if (st.stateRev > 0 && skinPayload && typeof skinPayload === 'object' && !Number.isInteger(skinPayload.stateRev)) {
          skinPayload.stateRev = st.stateRev;
        }
        const body = `window.__AGY_PRISM_BOOT_PAYLOAD__ = ${JSON.stringify(skinPayload)};\n${hostModule.getHostSkinScript()}\n`;
        res.writeHead(200, { ...hostHeaders, 'Content-Type': 'text/javascript; charset=utf-8' });
        res.end(body);
        return;
      }

      if (req.method === 'GET' && asset === 'panel.js') {
        const st = await buildCanonicalState();
        const lib = await normalizeLibrary(false);
        const bootObj = { ...st, items: lib.items, connected: true };
        const openNow = urlObj.searchParams.get('open') === '1';
        const suffix = openNow
          ? '\nif (window.__agyPrismPanel && typeof window.__agyPrismPanel.open === "function") { window.__agyPrismPanel.open(); }\n'
          : '\n';
        const body = `window.__AGY_PRISM_PANEL_BOOT__ = ${JSON.stringify(bootObj)};\n${hostModule.getHostPanelScript()}${suffix}`;
        res.writeHead(200, { ...hostHeaders, 'Content-Type': 'text/javascript; charset=utf-8' });
        res.end(body);
        return;
      }

      if (req.method === 'GET' && asset === 'static.css') {
        const st = await buildCanonicalState();
        const skinPayload = hostModule.buildClientSkinPayload(st.config, st.activeItem, st.mediaOrigin, {
          skinEnabled: st.skinEnabled,
          slides: st.activeItem?.slides,
          pluginOrigin: getPluginOrigin(),
          stateRev: st.stateRev,
        });
        const css =
          typeof hostModule.buildStaticCssSheet === 'function'
            ? hostModule.buildStaticCssSheet(skinPayload)
            : buildFallbackStaticCss(skinPayload);
        res.writeHead(200, { ...hostHeaders, 'Content-Type': 'text/css; charset=utf-8' });
        res.end(css);
        return;
      }

      if (req.method === 'POST' && asset === 'rpc') {
        const parsed = await readJsonBody(req);
        const id = parsed?.id ?? null;
        const method = String(parsed?.method || '');
        const params = parsed?.params && typeof parsed.params === 'object' ? parsed.params : {};
        const handler = rpcHandlers[method];
        if (typeof handler !== 'function') {
          sendJson(res, 200, { id, ok: false, error: `Unknown RPC method: ${method}` }, hostHeaders);
          return;
        }
        try {
          const result = await handler(params);
          sendJson(res, 200, { id, ok: true, result: result === undefined ? null : result }, hostHeaders);
        } catch (err) {
          sendJson(res, 200, { id, ok: false, error: err?.message || String(err) }, hostHeaders);
        }
        return;
      }

      if (req.method === 'GET' && asset === 'events') {
        const isInMemory = typeof req.socket?.setNoDelay !== 'function';
        res.writeHead(200, {
          ...hostHeaders,
          'Content-Type': 'text/event-stream; charset=utf-8',
          Connection: isInMemory ? 'close' : 'keep-alive',
        });
        if (cdpBridge) {
          await cdpBridge.registerSseClient(req, res, isInMemory);
        } else {
          const st = await buildCanonicalState();
          const rev = Number(st.stateRev) || 0;
          const skinPayload = hostModule.buildClientSkinPayload(st.config, st.activeItem, st.mediaOrigin, {
            skinEnabled: st.skinEnabled,
            slides: st.activeItem?.slides,
            pluginOrigin: getPluginOrigin(),
            stateRev: rev,
          });
          if (rev > 0 && skinPayload && typeof skinPayload === 'object' && !Number.isInteger(skinPayload.stateRev)) {
            skinPayload.stateRev = rev;
          }
          res.write(`retry: 2500\ndata: ${JSON.stringify({ event: 'state', stateRev: rev, skinVersion: PRISM_DOM.skinVersion, startupMode: st.config.startupMode, skinEnabled: st.skinEnabled, skinPayload, data: st })}\n\n`);
          res.end();
        }
        return;
      }
    }

    // ---- Secure `plugin://` Same-Origin Streaming Media Proxy (`/media-proxy/<subRoute>/*`) ----
    if (pathname.startsWith('/media-proxy/')) {
      const proxyCors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, If-Range, If-None-Match, Content-Type',
        'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, ETag, X-Prism-Mse-Mime, X-Prism-Animated-Preview',
        'Access-Control-Allow-Private-Network': 'true',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      };
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        sendJson(res, 405, { ok: false, error: 'Method Not Allowed' }, proxyCors);
        return;
      }
      if (hasRawTraversalAttempt(req.url || '')) {
        sendJson(res, 403, { ok: false, error: 'Forbidden: path traversal blocked' }, proxyCors);
        return;
      }
      const proxyMatch = /^\/media-proxy\/(media|preview|slide|slides|audio|scene-video|scene-audio|video-stage|scene-live|web|scene-files|mse-fmp4)(\/.*)?$/.exec(pathname);
      if (!proxyMatch) {
        sendJson(res, 404, { ok: false, error: 'Unsupported media-proxy sub-route' }, proxyCors);
        return;
      }
      const [, subRoute, rest = ''] = proxyMatch;
      const upstreamPath = `/${subRoute}${rest}${urlObj.search}`;
      const fwdHeaders = {};
      if (req.headers.range) fwdHeaders.range = String(req.headers.range);
      if (req.headers['if-range']) fwdHeaders['if-range'] = String(req.headers['if-range']);
      if (req.headers['if-none-match']) fwdHeaders['if-none-match'] = String(req.headers['if-none-match']);

      const passthroughKeys = [
        'content-type',
        'content-length',
        'content-range',
        'accept-ranges',
        'cache-control',
        'etag',
        'x-prism-mse-mime',
        'x-prism-animated-preview',
      ];

      const isInMemory = typeof req.socket?.setNoDelay !== 'function';
      if (isInMemory && typeof engine.mediaServer?.inject === 'function') {
        const up = await engine.mediaServer.inject({
          method: req.method,
          url: upstreamPath,
          headers: fwdHeaders,
        });
        const outHeaders = { ...proxyCors };
        for (const hk of passthroughKeys) {
          if (up.headers && up.headers[hk] !== undefined) {
            outHeaders[hk] = up.headers[hk];
          }
        }
        res.writeHead(up.status || up.statusCode || 200, outHeaders);
        if (req.method === 'HEAD') res.end();
        else res.end(up.body);
        return;
      }

      const mediaOrigin = typeof engine.getMediaOrigin === 'function'
        ? String(engine.getMediaOrigin() || '').replace(/\/+$/, '')
        : '';
      if (!mediaOrigin) {
        sendJson(res, 503, { ok: false, error: 'Media server unavailable' }, proxyCors);
        return;
      }
      const targetUrl = new URL(`${mediaOrigin}${upstreamPath}`);
      await new Promise((resolveProxy) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          resolveProxy();
        };
        const upReq = httpRequest(
          {
            protocol: targetUrl.protocol,
            hostname: targetUrl.hostname,
            port: targetUrl.port,
            path: `${targetUrl.pathname}${targetUrl.search}`,
            method: req.method,
            headers: fwdHeaders,
          },
          (upRes) => {
            const outHeaders = { ...proxyCors };
            for (const hk of passthroughKeys) {
              if (upRes.headers[hk] !== undefined) {
                outHeaders[hk] = upRes.headers[hk];
              }
            }
            res.writeHead(upRes.statusCode || 200, outHeaders);
            if (req.method === 'HEAD') {
              upRes.resume();
              res.end();
              finish();
              return;
            }
            upRes.on('error', () => {
              try { res.end(); } catch { /* ignore */ }
              finish();
            });
            res.on('finish', finish);
            upRes.pipe(res);
          },
        );
        const abortUpstream = () => {
          if (!res.writableEnded) {
            try { upReq.destroy(); } catch { /* ignore */ }
          }
          finish();
        };
        req.on('aborted', abortUpstream);
        res.on('close', () => {
          if (!res.writableEnded) abortUpstream();
          else finish();
        });
        upReq.on('error', (err) => {
          if (!res.headersSent) {
            sendJson(res, 502, { ok: false, error: `Media proxy upstream error: ${err?.message || String(err)}` }, proxyCors);
          } else {
            try { res.end(); } catch { /* ignore */ }
          }
          finish();
        });
        upReq.end();
      });
      return;
    }

    // Static UI & Preload
    if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
      const indexHtml = getCachedIndexHtml();
      const modeParam = (urlObj.searchParams.get('mode') || '').trim().toLowerCase();
      const isVisualEditorMode = modeParam === 'visual-editor';
      const tok = urlObj.searchParams.get('token') || effectiveAuthToken;
      const convId = urlObj.searchParams.get('conversationId') || '';
      const htmlHeaders = {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      };
      if (isVisualEditorMode) {
        htmlHeaders['Content-Security-Policy'] = "frame-ancestors 'none'";
        htmlHeaders['X-Content-Type-Options'] = 'nosniff';
        htmlHeaders['Referrer-Policy'] = 'no-referrer';
      }
      res.writeHead(200, htmlHeaders);
      res.end(injectBootIntoHtml(indexHtml, tok, convId, { omitPreloadQueryToken: isVisualEditorMode }));
      return;
    }

    if (req.method === 'GET' && pathname === '/preload.js') {
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(PRELOAD_SHIM_JS);
      return;
    }

    // ---- Strict Non-Wildcard Healthz & Auto-Updater Routes ----
    if (req.method === 'GET' && pathname === '/api/healthz') {
      const rawOrigin = typeof req.headers.origin === 'string' ? req.headers.origin.trim() : '';
      if (rawOrigin && !isAllowedStrictOrigin(rawOrigin)) {
        sendStrictJson(res, 403, { ok: false, code: 'ERR_CSRF_ORIGIN', error: 'Forbidden: disallowed Origin' });
        return;
      }
      const extra = rawOrigin ? { 'Access-Control-Allow-Origin': rawOrigin, Vary: 'Origin' } : {};
      sendStrictJson(
        res,
        200,
        {
          ok: true,
          plugin: PLUGIN_ID,
          version: PLUGIN_VERSION,
          pid: process.pid,
          startedAt,
        },
        extra,
      );
      return;
    }

    if (req.method === 'GET' && pathname === '/api/update/status') {
      const rawOrigin = typeof req.headers.origin === 'string' ? req.headers.origin.trim() : '';
      if (rawOrigin && !isAllowedStrictOrigin(rawOrigin)) {
        sendStrictJson(res, 403, { ok: false, code: 'ERR_CSRF_ORIGIN', error: 'Forbidden: disallowed Origin' });
        return;
      }
      const force = urlObj.searchParams.get('force') === '1' || urlObj.searchParams.get('force') === 'true';
      const status = decorateUpdateStatus(await updater.checkForUpdate({ force }));
      cachedUpdateStatus = status;
      bumpStateRev();
      void broadcastStudioState();
      const extra = rawOrigin ? { 'Access-Control-Allow-Origin': rawOrigin, Vary: 'Origin' } : {};
      sendStrictJson(res, 200, status, extra);
      return;
    }

    if (req.method === 'POST' && pathname === '/api/update/apply') {
      const rawOrigin = typeof req.headers.origin === 'string' ? req.headers.origin.trim() : '';
      if (!isAllowedStrictOrigin(rawOrigin)) {
        sendStrictJson(res, 403, { ok: false, code: 'ERR_CSRF_ORIGIN', error: 'Forbidden: disallowed Origin' });
        return;
      }
      if (!validateToken(req, urlObj, { headerOnly: true })) {
        sendStrictJson(res, 401, {
          ok: false,
          code: 'ERR_AUTH_TOKEN_REQUIRED',
          error: 'Unauthorized: missing or invalid X-Sidecar-Token header',
        });
        return;
      }
      const rawCt = String(req.headers['content-type'] || '').trim();
      const hasJsonCt = rawCt.toLowerCase().includes('application/json');
      if (rawCt && !hasJsonCt) {
        sendStrictJson(res, 415, {
          ok: false,
          code: 'ERR_INVALID_CONTENT_TYPE',
          error: 'Unsupported Media Type: Content-Type must be application/json',
        });
        return;
      }
      const rawBodyBuf = await readRawBuffer(req, 64 * 1024);
      let body = {};
      if (rawBodyBuf.length > 0) {
        if (!hasJsonCt) {
          sendStrictJson(res, 415, {
            ok: false,
            code: 'ERR_INVALID_CONTENT_TYPE',
            error: 'Unsupported Media Type: Content-Type must be application/json',
          });
          return;
        }
        try {
          const parsed = JSON.parse(rawBodyBuf.toString('utf8'));
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            sendStrictJson(res, 400, { ok: false, code: 'ERR_INVALID_JSON', error: 'Request body must be a JSON object' });
            return;
          }
          body = parsed;
        } catch (err) {
          sendStrictJson(res, 400, { ok: false, code: 'ERR_INVALID_JSON', error: `Invalid JSON body: ${err?.message || String(err)}` });
          return;
        }
      }
      if (updateApplyInFlight || updater.isUpdateInProgress?.()) {
        sendStrictJson(res, 409, { ok: false, code: 'ERR_UPDATE_IN_PROGRESS', error: 'An update is already in progress' });
        return;
      }
      updateApplyInFlight = true;
      const extra = rawOrigin ? { 'Access-Control-Allow-Origin': rawOrigin, Vary: 'Origin' } : {};
      try {
        const result = await updater.applyUpdate({
          expectedVersion: typeof body.expectedVersion === 'string' ? body.expectedVersion : '',
          targetTag: typeof body.targetTag === 'string' ? body.targetTag : '',
        });
        if (!result.willRestart && result.updated) {
          cachedIndexHtml = null;
          hostModule.getHostSkinScript?.({ reload: true });
          hostModule.getHostPanelScript?.({ reload: true });
        }
        cachedUpdateStatus = decorateUpdateStatus(updater.getCachedStatus?.() || cachedUpdateStatus);
        const onFlushed = result.willRestart ? () => triggerManagedSelfRestart(result) : null;
        sendStrictJson(res, 200, result, extra, onFlushed);
      } catch (err) {
        const errStatus = resolveHttpErrStatus(err, 400);
        sendStrictJson(
          res,
          errStatus,
          {
            ok: false,
            code: err?.code || 'ERR_UPDATE_FAILED',
            error: err?.message || String(err),
          },
          extra,
        );
      } finally {
        updateApplyInFlight = false;
      }
      return;
    }

    // ---- Strict Popout Browser Launch Route (`D3`: zero URL token, strict origin/header/CT, no-shell execFile) ----
    if (req.method === 'POST' && pathname === '/api/studio/popout') {
      const rawOrigin = typeof req.headers.origin === 'string' ? req.headers.origin.trim() : '';
      if (!isAllowedStrictOrigin(rawOrigin)) {
        sendStrictJson(res, 403, { ok: false, code: 'ERR_CSRF_ORIGIN', error: 'Forbidden: disallowed Origin' });
        return;
      }
      if (!validateToken(req, urlObj, { headerOnly: true })) {
        sendStrictJson(res, 401, {
          ok: false,
          code: 'ERR_AUTH_TOKEN_REQUIRED',
          error: 'Unauthorized: missing or invalid X-Sidecar-Token header',
        });
        return;
      }
      const rawCt = String(req.headers['content-type'] || '').trim();
      if (!rawCt.toLowerCase().includes('application/json')) {
        sendStrictJson(res, 415, {
          ok: false,
          code: 'ERR_INVALID_CONTENT_TYPE',
          error: 'Unsupported Media Type: Content-Type must be application/json',
        });
        return;
      }
      let rawBodyBuf;
      try {
        rawBodyBuf = await readRawBuffer(req, 16 * 1024);
      } catch (err) {
        sendStrictJson(res, 413, {
          ok: false,
          code: 'ERR_BODY_TOO_LARGE',
          error: err?.message || 'Request body too large',
        });
        return;
      }
      let body = {};
      if (rawBodyBuf.length > 0) {
        try {
          const parsed = JSON.parse(rawBodyBuf.toString('utf8'));
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            sendStrictJson(res, 400, { ok: false, code: 'ERR_INVALID_JSON', error: 'Request body must be a JSON object' });
            return;
          }
          body = parsed;
        } catch (err) {
          sendStrictJson(res, 400, { ok: false, code: 'ERR_INVALID_JSON', error: `Invalid JSON body: ${err?.message || String(err)}` });
          return;
        }
      }
      const requestedMode =
        typeof body.mode === 'string' && body.mode.trim()
          ? body.mode.trim().toLowerCase()
          : 'visual-editor';
      if (!POPOUT_MODES.has(requestedMode)) {
        sendStrictJson(res, 400, {
          ok: false,
          code: 'ERR_INVALID_POPOUT_MODE',
          error: `Unsupported popout mode: ${requestedMode}`,
        });
        return;
      }
      let validRegion = '';
      if (body.region !== undefined && body.region !== null && body.region !== '') {
        if (typeof body.region !== 'string') {
          sendStrictJson(res, 400, {
            ok: false,
            code: 'ERR_INVALID_REGION',
            error: 'Region must be a valid region identifier',
          });
          return;
        }
        const trimmedRegion = body.region.trim();
        if (!getValidRegionIdSet().has(trimmedRegion)) {
          sendStrictJson(res, 400, {
            ok: false,
            code: 'ERR_INVALID_REGION',
            error: `Unsupported region: ${trimmedRegion}`,
          });
          return;
        }
        validRegion = trimmedRegion;
      }
      if (!/^http:\/\/127\.0\.0\.1:\d{1,5}$/.test(boundOrigin)) {
        sendStrictJson(res, 503, {
          ok: false,
          code: 'ERR_POPOUT_ORIGIN_UNAVAILABLE',
          error: 'Studio HTTP origin is not ready',
        });
        return;
      }
      const popoutUrl = `${boundOrigin}/?mode=${requestedMode}${validRegion ? `&region=${validRegion}` : ''}`;
      const extra = rawOrigin ? { 'Access-Control-Allow-Origin': rawOrigin, Vary: 'Origin' } : {};
      try {
        await launchSystemBrowserNoShell(popoutUrl, { openExternalUrl: options.openExternalUrl || null });
        sendStrictJson(
          res,
          200,
          {
            ok: true,
            url: popoutUrl,
            mode: requestedMode,
            ...(validRegion ? { region: validRegion } : {}),
            launched: true,
          },
          extra,
        );
      } catch (err) {
        sendStrictJson(
          res,
          500,
          {
            ok: false,
            code: 'ERR_POPOUT_LAUNCH_FAILED',
            error: err?.message || String(err),
          },
          extra,
        );
      }
      return;
    }

    if (req.method !== 'GET' && !validateToken(req, urlObj)) {
      sendJson(res, 401, { ok: false, error: 'Unauthorized: missing or invalid X-Sidecar-Token' });
      return;
    }

    // ---- GET APIs ----
    if (req.method === 'GET' && pathname === '/api/events') {
      const isInMemory = typeof req.socket?.setNoDelay !== 'function';
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        Connection: isInMemory ? 'close' : 'keep-alive',
      });
      const initial = await buildCanonicalState();
      const initialFrame = `retry: 2500\nevent: state\ndata: ${JSON.stringify(initial)}\n\n`;
      if (isInMemory) {
        res.write(initialFrame);
        res.end();
        return;
      }
      engine.triggerDeferredScanIfNeeded?.({ delayMs: 250 });
      // Cap concurrent Studio SSE sockets (Chromium HTTP/1.1 allows only 6 sockets/origin;
      // partition 2 aux + 2 popout = 4 total so Aux Pane & Popout never evict each other).
      const MAX_STUDIO_SSE = 4;
      const MAX_STUDIO_SSE_PER_CHANNEL = 2;
      const rawCh = (urlObj.searchParams.get('channel') || urlObj.searchParams.get('mode') || '').trim().toLowerCase();
      const sseChannel = rawCh === 'popout' || rawCh === 'visual-editor' ? 'popout' : 'aux';

      const evictOldest = (filterChannel) => {
        for (const [clientRes, ch] of studioSseClients.entries()) {
          if (filterChannel === null || ch === filterChannel) {
            studioSseClients.delete(clientRes);
            try { clientRes.end(); } catch {}
            return true;
          }
        }
        return false;
      };

      let chCount = 0;
      for (const ch of studioSseClients.values()) {
        if (ch === sseChannel) chCount += 1;
      }
      while (chCount >= MAX_STUDIO_SSE_PER_CHANNEL) {
        if (!evictOldest(sseChannel)) break;
        chCount -= 1;
      }
      while (studioSseClients.size >= MAX_STUDIO_SSE) {
        if (!evictOldest(null)) break;
      }
      studioSseClients.set(res, sseChannel);
      res.write(initialFrame);
      const ka = setInterval(() => {
        try {
          res.write(': keepalive\n\n');
        } catch {
          clearInterval(ka);
          studioSseKeepalives.delete(ka);
          studioSseClients.delete(res);
        }
      }, 15_000);
      ka.unref?.();
      studioSseKeepalives.add(ka);
      const cleanup = () => {
        clearInterval(ka);
        studioSseKeepalives.delete(ka);
        studioSseClients.delete(res);
      };
      req.on('close', cleanup);
      res.on('close', cleanup);
      return;
    }

    if (req.method === 'GET' && (pathname === '/api/bootstrap' || pathname === '/api/state')) {
      if (pathname === '/api/bootstrap') {
        engine.triggerDeferredScanIfNeeded?.({ delayMs: 250 });
      }
      sendJson(res, 200, await buildCanonicalState());
      return;
    }

    if (req.method === 'GET' && pathname === '/api/canary') {
      sendJson(res, 200, { ok: true, canary: cdpBridge ? cdpBridge.getCanary() : canaryController.getStatus() });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/library') {
      const refresh = urlObj.searchParams.get('refresh') === '1' || urlObj.searchParams.get('refresh') === 'true';
      sendJson(res, 200, await normalizeLibrary(refresh));
      return;
    }

    if (req.method === 'GET' && pathname === '/api/status') {
      const st = await buildCanonicalState();
      sendJson(res, 200, {
        ok: true,
        stateRev: st.stateRev,
        config: st.config,
        hostStatus: st.hostStatus,
        autostart: st.autostart,
        normalShortcutEnabled: st.normalShortcutEnabled,
        patchedShortcuts: st.patchedShortcuts,
        sidecarAutoStartsOnBoot: true,
        autoRestoreLastSettings: true,
        stats: st.stats,
        skinEnabled: st.skinEnabled,
        activeItem: st.activeItem,
        mediaOrigin: st.mediaOrigin,
        pluginOrigin: st.pluginOrigin,
        studioHttpOrigin: st.studioHttpOrigin,
        pid: process.pid,
        version: PLUGIN_VERSION,
        updateStatus: st.updateStatus,
        updateSummary: st.updateSummary,
      });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/host/autostart') {
      const refresh = urlObj.searchParams.get('refresh') !== '0';
      const cfg = await engine.getConfig();
      const autostart = await getAutostartStatus({
        force: refresh,
        port: cfg.debugPort || DEFAULT_DEBUG_PORT,
      });
      sendJson(res, 200, {
        ok: true,
        ...autostart,
        skinEnabled: cfg.skinEnabled !== false,
      });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/fs/browse') {
      const targetPath = urlObj.searchParams.get('path') || '';
      const result = await engine.browseDirs(targetPath);
      sendJson(res, 200, result);
      return;
    }

    if (req.method === 'GET' && pathname === '/api/presets/export') {
      const id = urlObj.searchParams.get('id') || '';
      const exported = await engine.exportPreset(id);
      if (!exported) {
        sendJson(res, 404, { ok: false, error: `Preset not found: ${id}` });
        return;
      }
      sendJson(res, 200, exported, {
        'Content-Disposition': `attachment; filename="prism-preset-${String(id).replace(/[^a-z0-9_-]/gi, '_')}.json"`,
      });
      return;
    }

    // ---- POST APIs ----
    if (req.method === 'POST' && pathname === '/api/upload') {
      const queryFilename = urlObj.searchParams.get('filename') || '';
      const queryTitle = urlObj.searchParams.get('title') || '';
      const ct = String(req.headers['content-type'] || '').toLowerCase();

      let uploadRes;
      if (ct.includes('application/json')) {
        const body = await readJsonBody(req, 80 * 1024 * 1024);
        const filename = String(body.filename || queryFilename || 'wallpaper.png');
        const title = String(body.title || queryTitle || '');
        let buf;
        if (typeof body.dataUrl === 'string' && body.dataUrl.includes(',')) {
          buf = Buffer.from(body.dataUrl.split(',')[1], 'base64');
        } else if (typeof body.base64 === 'string') {
          buf = Buffer.from(body.base64, 'base64');
        } else {
          throw new Error('Missing binary body or dataUrl');
        }
        uploadRes = await engine.uploadMedia({ filename, contentType: ct, streamOrBuffer: buf, title });
      } else {
        uploadRes = await engine.uploadMedia({
          filename: queryFilename || 'wallpaper.bin',
          contentType: ct || 'application/octet-stream',
          streamOrBuffer: req,
          title: queryTitle,
        });
      }
      await pushToHost();
      const state = await buildCanonicalState();
      sendJson(res, 200, {
        ok: true,
        item: uploadRes?.item || uploadRes,
        duplicate: Boolean(uploadRes?.duplicate),
        state,
      });
      return;
    }

    if (req.method === 'POST') {
      const body = await readJsonBody(req);

      if (pathname === '/api/config') {
        const patch = body && typeof body.patch === 'object' && !Array.isArray(body.patch) ? body.patch : body;
        const shouldDebounce = body?.flush !== true;
        await withDeferredPush(
          () => engine.updateConfig(patch || {}, { debounce: shouldDebounce }),
          { ensureRevBump: true },
        );
        const state = await buildCanonicalState();
        void pushToHost();
        sendJson(res, 200, { ok: true, stateRev: state.stateRev, state });
        return;
      }

      if (pathname === '/api/config/reset') {
        await withDeferredPush(() => engine.resetConfig(body?.scope || 'all'), { ensureRevBump: true });
        await pushToHost();
        const state = await buildCanonicalState();
        sendJson(res, 200, { ok: true, stateRev: state.stateRev, state });
        return;
      }

      if (pathname === '/api/wallpaper/apply') {
        const wallpaperId = String(body?.wallpaperId ?? body?.id ?? '');
        const extraPatch = body?.patch && typeof body.patch === 'object' ? body.patch : {};
        localSessionAwake = true;
        await withDeferredPush(
          () => engine.applyWallpaper(wallpaperId, { ...extraPatch, skinEnabled: true }),
          { ensureRevBump: true },
        );
        if (cdpBridge) {
          await cdpBridge.wake({ forceProbe: false });
          void broadcastStudioState();
        } else {
          await pushToHost();
        }
        const state = await buildCanonicalState();
        sendJson(res, 200, { ok: true, stateRev: state.stateRev, state });
        return;
      }

      if (pathname === '/api/playlist/step') {
        const direction = Number(body?.direction) === -1 ? -1 : 1;
        await withDeferredPush(
          () => engine.stepPlaylist(direction, String(body?.reason || 'manual')),
          { ensureRevBump: true },
        );
        await pushToHost();
        const state = await buildCanonicalState();
        sendJson(res, 200, { ok: true, stateRev: state.stateRev, state });
        return;
      }

      if (pathname === '/api/preset/apply') {
        localSessionAwake = true;
        const appliedRes = await applyAnyPreset(body?.presetId || body?.id || body?.name, {
          overrideStrategy: body?.overrideStrategy,
        });
        sendJson(res, 200, {
          ok: true,
          preset: appliedRes.preset,
          overrideSynced: appliedRes.overrideSynced,
          wallpaperFallback: appliedRes.wallpaperFallback,
          missingWallpaperId: appliedRes.missingWallpaperId,
          stateRev: appliedRes.state.stateRev,
          state: appliedRes.state,
        });
        return;
      }

      if (pathname === '/api/presets/save') {
        const rawPatch =
          body?.patch && typeof body.patch === 'object' && !Array.isArray(body.patch)
            ? body.patch
            : null;
        const saved = await withDeferredPush(
          () =>
            engine.savePreset({
              id: typeof body?.id === 'string' ? body.id.trim() : '',
              name: typeof body?.name === 'string' ? body.name : '',
              description: typeof body?.description === 'string' ? body.description : '',
              patch: rawPatch,
              includeWallpaper: Boolean(body?.includeWallpaper),
              mode: body?.mode === 'overwrite' ? 'overwrite' : 'create',
              commitPatch: body?.commitPatch !== false,
            }),
          { ensureRevBump: true },
        );
        const preset = saved?.preset || saved;
        const state = await buildCanonicalState();
        if (saved?.patchCommitted) {
          void pushToHost();
        } else {
          void broadcastStudioState();
          if (cdpBridge) void cdpBridge.broadcastState({ sseOnly: true }).catch(() => {});
        }
        sendJson(res, 200, {
          ok: true,
          preset,
          presets: state.presets,
          patchCommitted: Boolean(saved?.patchCommitted),
          stateRev: state.stateRev,
          state,
        });
        return;
      }

      if (pathname === '/api/presets/rename') {
        const id = String(body?.id || '').trim();
        const name = String(body?.name || '').trim();
        if (!id || !name) {
          sendJson(res, 400, { ok: false, error: 'Preset id and name are required' });
          return;
        }
        const renamed = await withDeferredPush(
          () =>
            engine.renamePreset({
              id,
              name,
              description: typeof body?.description === 'string' ? body.description : undefined,
            }),
          { ensureRevBump: true },
        );
        const state = await buildCanonicalState();
        void broadcastStudioState();
        if (cdpBridge) void cdpBridge.broadcastState({ sseOnly: true }).catch(() => {});
        sendJson(res, 200, {
          ok: true,
          preset: renamed?.preset || renamed,
          presets: state.presets,
          stateRev: state.stateRev,
          state,
        });
        return;
      }

      if (pathname === '/api/presets/duplicate') {
        const id = String(body?.id || '').trim();
        if (!id) {
          sendJson(res, 400, { ok: false, error: 'Preset id is required' });
          return;
        }
        const duplicated = await withDeferredPush(
          () =>
            engine.duplicatePreset({
              id,
              name: typeof body?.name === 'string' ? body.name : '',
              activate: Boolean(body?.activate),
            }),
          { ensureRevBump: true },
        );
        const state = await buildCanonicalState();
        void broadcastStudioState();
        if (cdpBridge) void cdpBridge.broadcastState({ sseOnly: true }).catch(() => {});
        sendJson(res, 200, {
          ok: true,
          preset: duplicated?.preset || duplicated,
          presets: state.presets,
          stateRev: state.stateRev,
          state,
        });
        return;
      }

      if (pathname === '/api/presets/delete') {
        await withDeferredPush(() => engine.deletePreset(String(body?.id || '')), { ensureRevBump: true });
        const state = await buildCanonicalState();
        void broadcastStudioState();
        if (cdpBridge) void cdpBridge.broadcastState({ sseOnly: true }).catch(() => {});
        sendJson(res, 200, { ok: true, presets: state.presets, stateRev: state.stateRev, state });
        return;
      }

      if (pathname === '/api/presets/import') {
        const rawPreset = body?.preset && typeof body.preset === 'object' ? body.preset : body;
        const imported = await withDeferredPush(() => engine.importPreset(rawPreset), { ensureRevBump: true });
        const preset = imported?.preset || imported;
        const state = await buildCanonicalState();
        void broadcastStudioState();
        if (cdpBridge) void cdpBridge.broadcastState({ sseOnly: true }).catch(() => {});
        sendJson(res, 200, { ok: true, preset, presets: state.presets, stateRev: state.stateRev, state });
        return;
      }

      if (pathname === '/api/wallpaper/props') {
        await withDeferredPush(
          () => engine.updateUserProps(String(body?.wallpaperId || ''), body?.props || {}),
          { ensureRevBump: true },
        );
        await pushToHost();
        const state = await buildCanonicalState();
        sendJson(res, 200, { ok: true, stateRev: state.stateRev, state });
        return;
      }

      if (pathname === '/api/upload/remove') {
        const wid = String(body?.wallpaperId || body?.id || '');
        await withDeferredPush(() => engine.removeUpload(wid), { ensureRevBump: true });
        await pushToHost();
        const lib = await normalizeLibrary(true);
        const state = await buildCanonicalState();
        sendJson(res, 200, { ok: true, items: lib.items, stateRev: state.stateRev, state });
        return;
      }

      if (pathname === '/api/storage/dir') {
        const kind = String(body?.kind || '');
        const dirPath = String(body?.path || '');
        await withDeferredPush(() => engine.setStorageDir(kind, dirPath), { ensureRevBump: true });
        await pushToHost();
        const state = await buildCanonicalState();
        sendJson(res, 200, { ok: true, config: state.config, stateRev: state.stateRev, state });
        return;
      }

      if (pathname === '/api/skin/restore') {
        await withDeferredPush(() => engine.updateConfig({ skinEnabled: false }), { ensureRevBump: true });
        await pushToHost();
        const state = await buildCanonicalState();
        sendJson(res, 200, { ok: true, stateRev: state.stateRev, state });
        return;
      }

      if (pathname === '/api/skin/wake') {
        const out = await rpcHandlers['skin.wake'](body || {});
        sendJson(res, 200, out);
        return;
      }

      if (pathname === '/api/skin/toggle') {
        const out = await rpcHandlers['skin.toggle'](body || {});
        sendJson(res, 200, out);
        return;
      }

      if (pathname === '/api/canary/reset') {
        const out = await rpcHandlers['canary.reset']();
        sendJson(res, 200, out);
        return;
      }

      if (pathname === '/api/host/reload') {
        cachedIndexHtml = null;
        hostModule.getHostSkinScript?.({ reload: true });
        hostModule.getHostPanelScript?.({ reload: true });
        if (cdpBridge?.reloadHostScripts) {
          await cdpBridge.reloadHostScripts().catch(() => {});
        } else {
          await pushToHost();
        }
        sendJson(res, 200, { ok: true, reloaded: true, state: await buildCanonicalState() });
        return;
      }

      if (pathname === '/api/host/autostart') {
        const enabled = body?.enabled !== false;
        const cfg = await engine.getConfig();
        const port = Number(body?.port || cfg.debugPort || DEFAULT_DEBUG_PORT);
        const searchDirs = Array.isArray(body?.searchDirs) ? body.searchDirs : defaultSearchDirs;
        const autostart = enabled
          ? await enableNormalShortcutAutoLoad({ port, searchDirs, dataDir })
          : await disableNormalShortcutAutoLoad({ searchDirs, dataDir });
        if (searchDirs === defaultSearchDirs) {
          cachedAutostart = autostart;
          cachedAutostartAt = Date.now();
        }
        if (enabled && port !== cfg.debugPort) {
          await engine.updateConfig({ debugPort: port });
        }
        bumpStateRev();
        const state = await buildCanonicalState();
        sendJson(res, 200, {
          ok: Boolean(autostart.ok),
          autostart,
          hostStatus: state.hostStatus,
          normalShortcutEnabled: state.normalShortcutEnabled,
          patchedShortcuts: state.patchedShortcuts,
          sidecarAutoStartsOnBoot: true,
          autoRestoreLastSettings: true,
          stateRev: state.stateRev,
          state,
        });
        return;
      }

      if (pathname === '/api/host/shortcut') {
        const port = Number(body?.port || DEFAULT_DEBUG_PORT);
        const destDir = typeof body?.destDir === 'string' ? body.destDir : '';
        const sc = await createDebugShortcut({ port, destDir });
        cachedAutostartAt = 0;
        const hostStatus = cdpBridge ? await cdpBridge.tick() : null;
        const state = await buildCanonicalState();
        sendJson(res, 200, { ok: true, shortcutPath: sc.shortcutPath, port: sc.port, hostStatus: state.hostStatus || hostStatus, state });
        return;
      }
    }

    sendJson(res, 404, { ok: false, error: `Route not found: ${req.method} ${pathname}` });
  };

  server = createServer((req, res) => {
    handleRequest(req, res).catch((err) => {
      if (!res.headersSent) {
        sendJson(res, resolveHttpErrStatus(err, 400), {
          ok: false,
          ...(err?.code ? { code: err.code } : {}),
          error: err?.message || String(err),
        });
      }
    });
  });

  await new Promise((resolvePromise, reject) => {
    server.once('error', reject);
    server.listen(listenPort, '127.0.0.1', () => resolvePromise());
  });

  const addr = server.address();
  const actualPort = addr && typeof addr === 'object' ? addr.port : listenPort;
  const origin = `http://127.0.0.1:${actualPort}`;
  boundOrigin = origin;

  if (cdpBridge) {
    await cdpBridge.start().catch(() => {});
  }

  // Post-update Studio iframe reload if `.just-updated.json` marker was consumed on boot
  if (justUpdatedMarker && options.startCdp !== false && process.env.AGY_PRISM_DISABLE_CDP !== '1') {
    const reloadStudioTimer = setTimeout(async () => {
      if (closed) return;
      try {
        const pf = readDevToolsActivePort(options.profileDir || '');
        const cdpPorts = [...new Set([options.cdpPort, pf?.port, DEFAULT_DEBUG_PORT].filter((n) => Number.isInteger(n) && n > 0))];
        for (const cp of cdpPorts) {
          const pr = await probeCdpPort(cp).catch(() => ({ ok: false }));
          if (!pr.ok) continue;
          const targets = await listCdpTargets(pr.port, pr.host || '127.0.0.1').catch(() => []);
          for (const t of targets) {
            if (typeof t?.url === 'string' && /^plugin:\/\/agy-wallpaper-prism--prism_studio/i.test(t.url) && t.webSocketDebuggerUrl) {
              await evaluateTargetEphemeral(t.webSocketDebuggerUrl, 'window.location.reload()').catch(() => {});
            }
          }
          break;
        }
      } catch {
        /* best-effort post-update iframe reload */
      }
    }, 800);
    reloadStudioTimer.unref?.();
  }

  // Non-blocking boot-time retired file GC (8s after startup)
  retiredSweepTimer = setTimeout(() => {
    retiredSweepTimer = null;
    if (closed) return;
    try {
      updater.sweepRetiredFiles?.();
    } catch {
      /* non-fatal GC */
    }
  }, 8000);
  retiredSweepTimer.unref?.();

  // Non-blocking background update check after boot (never blocks server startup)
  if (options.autoCheckUpdates !== false) {
    const delayMs = Number.isFinite(Number(options.bootUpdateCheckDelayMs))
      ? Math.max(0, Number(options.bootUpdateCheckDelayMs))
      : 1500;
    bootUpdateTimer = setTimeout(() => {
      bootUpdateTimer = null;
      if (closed) return;
      updater
        .checkForUpdate({ force: false })
        .then((st) => {
          if (closed) return;
          cachedUpdateStatus = decorateUpdateStatus(st);
          bumpStateRev();
          void broadcastStudioState();
        })
        .catch(() => {});
    }, delayMs);
    bootUpdateTimer.unref?.();
  }

  const serverInfoPath = join(dataDir, 'server_info.json');
  try {
    writeFileSync(
      serverInfoPath,
      `${JSON.stringify({ plugin: PLUGIN_ID, pid: process.pid, port: actualPort, token: effectiveAuthToken, startedAt }, null, 2)}\n`,
      { encoding: 'utf8', mode: 0o600 },
    );
  } catch {
    /* non-fatal */
  }

  close = async ({ preserveHostDom = false } = {}) => {
    closed = true;
    if (bootUpdateTimer) {
      clearTimeout(bootUpdateTimer);
      bootUpdateTimer = null;
    }
    if (retiredSweepTimer) {
      clearTimeout(retiredSweepTimer);
      retiredSweepTimer = null;
    }
    for (const ka of studioSseKeepalives) clearInterval(ka);
    studioSseKeepalives.clear();
    for (const clientRes of studioSseClients.keys()) {
      try { clientRes.end(); } catch { /* ignore */ }
    }
    studioSseClients.clear();
    if (cdpBridge) {
      await cdpBridge
        .stop({
          removeSkin: !preserveHostDom,
          removePanel: !preserveHostDom,
          preserveHostDom: Boolean(preserveHostDom),
        })
        .catch(() => {});
      cdpBridge = null;
    }
    if (typeof engine.close === 'function') {
      await engine.close().catch(() => {});
    }
    try {
      if (existsSync(serverInfoPath)) {
        const info = JSON.parse(readFileSync(serverInfoPath, 'utf8'));
        if (info?.pid === process.pid) rmSync(serverInfoPath, { force: true });
      }
    } catch {
      /* ignore */
    }
    server.closeAllConnections?.();
    await new Promise((r) => server.close(() => r()));
  };

  /** In-process HTTP request injector for sandboxed tests where outbound TCP loopback is blocked. */
  const inject = async ({ method = 'GET', url = '/', headers = {}, body = null } = {}) => {
    const lowerHeaders = {};
    for (const [k, v] of Object.entries(headers || {})) {
      lowerHeaders[k.toLowerCase()] = String(v);
    }
    let bodyBuf = Buffer.alloc(0);
    if (Buffer.isBuffer(body)) bodyBuf = body;
    else if (typeof body === 'string') bodyBuf = Buffer.from(body, 'utf8');
    else if (body && typeof body === 'object') {
      bodyBuf = Buffer.from(JSON.stringify(body), 'utf8');
      if (!lowerHeaders['content-type']) lowerHeaders['content-type'] = 'application/json';
    }

    const req = Readable.from(bodyBuf.length > 0 ? [bodyBuf] : []);
    req.method = String(method).toUpperCase();
    req.url = String(url);
    req.headers = lowerHeaders;
    req.destroy = () => {};

    let statusCode = 200;
    const resHeaders = {};
    const outChunks = [];
    let ended = false;
    let resolveDone;
    const donePromise = new Promise((r) => {
      resolveDone = r;
    });

    const res = {
      headersSent: false,
      writeHead(code, hdrs = {}) {
        statusCode = code;
        this.headersSent = true;
        for (const [k, v] of Object.entries(hdrs)) resHeaders[k.toLowerCase()] = v;
        return this;
      },
      write(chunk) {
        if (chunk) outChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
        return true;
      },
      end(chunk, encodingOrCb, cb) {
        if (ended) return;
        ended = true;
        if (chunk && typeof chunk !== 'function') {
          outChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
        }
        const rawBody = Buffer.concat(outChunks);
        const text = rawBody.toString('utf8');
        resolveDone({
          statusCode,
          headers: resHeaders,
          body: rawBody,
          text,
          json() {
            return JSON.parse(text);
          },
        });
        const doneCb = typeof chunk === 'function' ? chunk : typeof encodingOrCb === 'function' ? encodingOrCb : cb;
        if (typeof doneCb === 'function') {
          queueMicrotask(() => {
            try { doneCb(); } catch { /* ignore */ }
          });
        }
      },
    };

    try {
      await handleRequest(req, res);
    } catch (err) {
      if (!res.headersSent) {
        sendJson(res, resolveHttpErrStatus(err, 400), {
          ok: false,
          ...(err?.code ? { code: err.code } : {}),
          error: err?.message || String(err),
        });
      }
    }
    return donePromise;
  };

  return {
    server,
    port: actualPort,
    origin,
    pluginOrigin: getPluginOrigin(),
    token: effectiveAuthToken,
    hostCapToken,
    hostBaseUrl: `${origin}/host/${hostCapToken}`,
    startedAt,
    canary: canaryController,
    engine,
    updater,
    isManagedSidecar: () => isManagedSidecar(updaterEnv, options.managedSidecar),
    cdpBridge,
    rpcHandlers,
    getState: buildCanonicalState,
    inject,
    close,
  };
}

function isMainEntry() {
  try {
    return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
  } catch {
    return false;
  }
}

if (isMainEntry()) {
  const DEV_WATCH_ENABLED = process.env.AGY_PRISM_DEV_WATCH === '1';
  // Clean in-process host script hot-reload (only enabled in dev mode via AGY_PRISM_DEV_WATCH=1;
  // never exits 0 under `restart_policy: "on-failure"`!)
  const watchedFiles = [
    join(PLUGIN_ROOT, 'src', 'host', 'wallpaper-inject.js'),
    join(PLUGIN_ROOT, 'src', 'host', 'panel-inject.js'),
  ];
  const mtimes = new Map();
  const refreshWatchedMtimes = () => {
    for (const wf of watchedFiles) {
      try {
        if (existsSync(wf)) mtimes.set(wf, statSync(wf).mtimeMs);
      } catch {
        /* ignore */
      }
    }
  };
  if (DEV_WATCH_ENABLED) refreshWatchedMtimes();

  let watchTimer = null;
  let instance = null;

  const pauseWatchTimer = () => {
    if (watchTimer) {
      clearInterval(watchTimer);
      watchTimer = null;
    }
  };

  const startWatchTimer = () => {
    if (!DEV_WATCH_ENABLED || watchTimer) return;
    refreshWatchedMtimes();
    watchTimer = setInterval(() => {
      let changed = false;
      for (const wf of watchedFiles) {
        try {
          if (!existsSync(wf)) continue;
          const cur = statSync(wf).mtimeMs;
          const prev = mtimes.get(wf) || 0;
          if (prev > 0 && cur > prev + 50) changed = true;
          mtimes.set(wf, cur);
        } catch {
          /* ignore */
        }
      }
      if (changed) {
        hostModule.getHostSkinScript?.({ reload: true });
        hostModule.getHostPanelScript?.({ reload: true });
        void instance?.cdpBridge?.broadcastState?.({ force: true }).catch(() => {});
      }
    }, 4000);
    watchTimer.unref?.();
  };

  instance = await createPrismStudioServer({
    onBeforeSync: pauseWatchTimer,
    onRollback: startWatchTimer,
  });
  console.log(
    `[prism_studio] listening on ${instance.origin} (media=${instance.engine.getMediaOrigin?.() || 'n/a'}, pid=${process.pid})`,
  );

  if (DEV_WATCH_ENABLED) startWatchTimer();

  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    pauseWatchTimer();
    instance.close().finally(() => process.exit(0));
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}
