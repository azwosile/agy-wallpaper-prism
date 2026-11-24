#!/usr/bin/env node
// Unified Authoritative Backend for agy-wallpaper-prism (Sidecar HTTP Server + Passive CDP Bridge).
// Serves Sidecar Studio UI (0 Agent Tokens) + all /api/* routes + Passive CDP Host Controller.

import { randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  DEFAULT_DEBUG_PORT,
  PLUGIN_ID,
  PLUGIN_VERSION,
  SCENE_PRESETS,
  SCENE_PRESET_IDS,
  SIDECAR_URI,
} from '../../src/shared/schema.mjs';
import { createWallpaperPrismEngine, resolveDefaultPrismDataDir } from '../../src/engine/index.mjs';
import * as hostModule from '../../src/host/index.mjs';
import {
  createCanaryController,
  createDebugShortcut,
  createPassiveCdpBridge,
  disableNormalShortcutAutoLoad,
  enableNormalShortcutAutoLoad,
  inspectNormalShortcuts,
} from './cdp-bridge.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = resolve(__dirname, '..', '..');
const INDEX_HTML_PATH = join(__dirname, 'index.html');
const MAX_JSON_BYTES = 16 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 512 * 1024 * 1024;

const PRELOAD_SHIM_JS = `(function() {
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
    if (token) headers.set('X-Sidecar-Token', token);
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

function injectBootIntoHtml(rawHtml, token = '', conversationId = '') {
  const bootTag = `<script>window.__SIDECAR_BOOT__=${JSON.stringify({ token, conversationId })};</script>`;
  let html = rawHtml.includes('</head>') ? rawHtml.replace('</head>', `${bootTag}\n</head>`) : `${bootTag}\n${rawHtml}`;
  if (token) {
    html = html.replace(/src=(["'])\/preload\.js\1/g, `src=$1/preload.js?token=${encodeURIComponent(token)}$1`);
  }
  return html;
}

function sendJson(res, status, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    ...extraHeaders,
  });
  res.end(body);
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

  const envPort = parseInt(
    process.env.ANTIGRAVITY_SIDECAR_WEB_PORT ||
      process.env.ANTIGRAVITY_SIDECAR_PORT ||
      process.env.PORT ||
      '',
    10,
  );
  const listenPort = options.port !== undefined ? Number(options.port) : Number.isFinite(envPort) ? envPort : 0;
  const authToken =
    options.token !== undefined
      ? String(options.token || '')
      : String(
          process.env.ANTIGRAVITY_SIDECAR_UI_TOKEN ||
            process.env.ANTIGRAVITY_SIDECAR_AUTH_TOKEN ||
            process.env.ANTIGRAVITY_SIDECAR_WEB_TOKEN ||
            '',
        );

  const engine =
    options.engine ||
    (await createWallpaperPrismEngine({
      dataDir,
      allowLegacyMigration: !hasExplicitDataDir,
      pluginRoot: PLUGIN_ROOT,
      sidecarDataDir: sidecarExecDataDir,
    }));
  if (typeof engine.init === 'function') {
    await engine.init();
  }

  const canaryController = createCanaryController({
    dataDir,
    pluginRoot: PLUGIN_ROOT,
    onTripSafeMode: async () => {
      localSessionAwake = false;
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

  const buildCanonicalState = async () => {
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
      options.inspectShortcuts === false
        ? {
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
      pid: process.pid,
      version: PLUGIN_VERSION,
      studioUri: SIDECAR_URI,
    };
  };

  const studioSseClients = new Set();
  const studioSseKeepalives = new Set();
  let studioBroadcastScheduled = false;

  const broadcastStudioState = async () => {
    if (studioSseClients.size === 0 || studioBroadcastScheduled) return;
    studioBroadcastScheduled = true;
    try {
      const st = await buildCanonicalState();
      const serialized = `event: state\ndata: ${JSON.stringify(st)}\n\n`;
      for (const clientRes of [...studioSseClients]) {
        try {
          clientRes.write(serialized);
        } catch {
          studioSseClients.delete(clientRes);
        }
      }
    } catch {
      /* best-effort studio sync */
    } finally {
      studioBroadcastScheduled = false;
    }
  };

  let pushScheduled = false;
  const pushToHost = async () => {
    void broadcastStudioState();
    if (!cdpBridge || pushScheduled) return;
    pushScheduled = true;
    try {
      await cdpBridge.broadcastState().catch(() => {});
    } finally {
      pushScheduled = false;
    }
  };

  const applyAnyPreset = async (presetId) => {
    const id = String(presetId || '').trim();
    if (!id) throw new Error('Missing presetId');
    if (SCENE_PRESET_IDS.includes(id)) {
      await engine.updateConfig({ ...SCENE_PRESETS[id].patch, skinEnabled: true });
    } else if (typeof engine.applyPreset === 'function') {
      await engine.applyPreset(id);
      await engine.updateConfig({ skinEnabled: true });
    } else {
      throw new Error(`Unknown preset: ${id}`);
    }
    await pushToHost();
    return buildCanonicalState();
  };

  const rpcHandlers = {
    'state.get': () => buildCanonicalState(),
    'bootstrap.get': () => buildCanonicalState(),
    'library.list': async (params = {}) => normalizeLibrary(Boolean(params.refresh)),
    'config.set': async (params = {}) => {
      const patch = params.patch && typeof params.patch === 'object' ? params.patch : params;
      await engine.updateConfig(patch, { debounce: true });
      await pushToHost();
      return buildCanonicalState();
    },
    'prefs.set': async (params = {}) => {
      const patch = params.patch && typeof params.patch === 'object' ? params.patch : params;
      await engine.updateConfig(patch, { debounce: true });
      await pushToHost();
      return buildCanonicalState();
    },
    'config.reset': async (params = {}) => {
      await engine.resetConfig(params.scope || 'all');
      await pushToHost();
      return buildCanonicalState();
    },
    'prefs.reset': async (params = {}) => {
      await engine.resetConfig(params.scope || 'all');
      await pushToHost();
      return buildCanonicalState();
    },
    'wallpaper.apply': async (params = {}) => {
      const wid = String(params.wallpaperId || params.id || '');
      localSessionAwake = true;
      await engine.applyWallpaper(wid, { ...(params.patch || {}), skinEnabled: true });
      if (cdpBridge) await cdpBridge.wake();
      else await pushToHost();
      return buildCanonicalState();
    },
    'playlist.step': async (params = {}) => {
      const dir = Number(params.direction) === -1 ? -1 : 1;
      await engine.stepPlaylist(dir, String(params.reason || 'rpc'));
      await pushToHost();
      return buildCanonicalState();
    },
    'preset.apply': async (params = {}) => {
      localSessionAwake = true;
      const st = await applyAnyPreset(params.presetId || params.id || params.name);
      if (cdpBridge) await cdpBridge.wake();
      return st;
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
      await engine.updateConfig({ extractedAccent: entry, accentCache });
      await pushToHost();
      return { ok: true, extractedAccent: entry };
    },
    'skin.restore': async () => {
      await engine.updateConfig({ skinEnabled: false });
      await pushToHost();
      return buildCanonicalState();
    },
    'skin.panicRestore': async () => {
      localSessionAwake = false;
      await engine.updateConfig({ skinEnabled: false });
      await engine.store?.flush?.();
      await pushToHost();
      return { ok: true, skinEnabled: false, state: await buildCanonicalState() };
    },
    'skin.wake': async () => {
      localSessionAwake = true;
      await engine.updateConfig({ skinEnabled: true });
      if (cdpBridge) await cdpBridge.wake();
      else await pushToHost();
      const state = await buildCanonicalState();
      return { ok: true, sessionAwake: true, state };
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
      const state = await buildCanonicalState();
      return { ok: true, canary: next, state };
    },
    'canary.reset': async () => {
      localSessionAwake = true;
      await engine.updateConfig({ skinEnabled: true });
      const next = cdpBridge ? await cdpBridge.resetCanary() : canaryController.reset();
      await pushToHost();
      const state = await buildCanonicalState();
      return { ok: true, canary: next, state };
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
      return { ok: res.ok, autostart: res, state: await buildCanonicalState() };
    },
    'studio.open': async () => ({ ok: true, uri: SIDECAR_URI }),
  };

  if (options.startCdp !== false && process.env.AGY_PRISM_DISABLE_CDP !== '1') {
    cdpBridge = createPassiveCdpBridge({
      getEngineState: buildCanonicalState,
      hostScripts: hostModule,
      rpcHandlers,
      getHostOrigin: () => boundOrigin,
      capToken: hostCapToken,
      dataDir,
      pluginRoot: PLUGIN_ROOT,
      canaryController,
      cdpPort: options.cdpPort || 0,
      pollMs: options.cdpPollMs ?? 3000,
      configPath: options.hostConfigPath || '',
      profileDir: options.profileDir || '',
      log: options.log || (() => {}),
    });
  }

  if (engine.events && typeof engine.events.on === 'function') {
    for (const evName of ['skin', 'state', 'wallpaper', 'rotation']) {
      engine.events.on(evName, () => {
        void pushToHost();
      });
    }
  }

  const validateToken = (req, urlObj) => {
    if (!authToken) return true;
    const headerTok = typeof req.headers['x-sidecar-token'] === 'string' ? req.headers['x-sidecar-token'].trim() : '';
    const queryTok = (urlObj.searchParams.get('token') || '').trim();
    return headerTok === authToken || queryTok === authToken;
  };

  const verifyHostCapToken = (candidate) => {
    const a = Buffer.from(String(candidate || ''), 'utf8');
    const b = Buffer.from(hostCapToken, 'utf8');
    return a.length === b.length && timingSafeEqual(a, b);
  };

  const handleRequest = async (req, res) => {
    const urlObj = new URL(req.url || '/', 'http://127.0.0.1');
    const pathname = urlObj.pathname;
    const reqOrigin = typeof req.headers.origin === 'string' && req.headers.origin ? req.headers.origin : '*';

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': reqOrigin,
        Vary: 'Origin',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Sidecar-Token, X-Prism-Token, Cache-Control',
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
        });
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
          const skinPayload = hostModule.buildClientSkinPayload(st.config, st.activeItem, st.mediaOrigin, {
            skinEnabled: st.skinEnabled,
          });
          res.write(`retry: 2500\ndata: ${JSON.stringify({ event: 'state', startupMode: st.config.startupMode, skinEnabled: st.skinEnabled, skinPayload, data: st })}\n\n`);
          res.end();
        }
        return;
      }
    }

    // Static UI & Preload
    if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
      const indexHtml = existsSync(INDEX_HTML_PATH)
        ? readFileSync(INDEX_HTML_PATH, 'utf8')
        : '<!doctype html><html><body><div id="app">Run node scripts/build.mjs first.</div></body></html>';
      const tok = urlObj.searchParams.get('token') || authToken;
      const convId = urlObj.searchParams.get('conversationId') || '';
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(injectBootIntoHtml(indexHtml, tok, convId));
      return;
    }

    if (req.method === 'GET' && pathname === '/preload.js') {
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(PRELOAD_SHIM_JS);
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
      // Cap concurrent Studio SSE sockets (Chromium HTTP/1.1 allows only 6 sockets/origin;
      // Antigravity keeps hidden conversation side-pane iframes alive in the DOM).
      const MAX_STUDIO_SSE = 2;
      while (studioSseClients.size >= MAX_STUDIO_SSE) {
        const oldest = studioSseClients.values().next().value;
        if (!oldest) break;
        studioSseClients.delete(oldest);
        try { oldest.end(); } catch {}
      }
      studioSseClients.add(res);
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

    if (req.method === 'GET' && pathname === '/api/bootstrap') {
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
        pid: process.pid,
        version: PLUGIN_VERSION,
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
        const patch = body && typeof body.patch === 'object' ? body.patch : body;
        await engine.updateConfig(patch || {}, { debounce: true });
        await pushToHost();
        sendJson(res, 200, { ok: true, state: await buildCanonicalState() });
        return;
      }

      if (pathname === '/api/config/reset') {
        await engine.resetConfig(body?.scope || 'all');
        await pushToHost();
        sendJson(res, 200, { ok: true, state: await buildCanonicalState() });
        return;
      }

      if (pathname === '/api/wallpaper/apply') {
        const wallpaperId = String(body?.wallpaperId ?? body?.id ?? '');
        const extraPatch = body?.patch && typeof body.patch === 'object' ? body.patch : {};
        localSessionAwake = true;
        await engine.applyWallpaper(wallpaperId, { ...extraPatch, skinEnabled: true });
        if (cdpBridge) await cdpBridge.wake();
        else await pushToHost();
        sendJson(res, 200, { ok: true, state: await buildCanonicalState() });
        return;
      }

      if (pathname === '/api/playlist/step') {
        const direction = Number(body?.direction) === -1 ? -1 : 1;
        await engine.stepPlaylist(direction, String(body?.reason || 'manual'));
        await pushToHost();
        sendJson(res, 200, { ok: true, state: await buildCanonicalState() });
        return;
      }

      if (pathname === '/api/preset/apply') {
        const state = await applyAnyPreset(body?.presetId || body?.id || body?.name);
        sendJson(res, 200, { ok: true, state });
        return;
      }

      if (pathname === '/api/presets/save') {
        const saved = await engine.savePreset({
          name: String(body?.name || 'Custom Preset'),
          description: String(body?.description || ''),
        });
        const preset = saved?.preset || saved;
        const state = await buildCanonicalState();
        sendJson(res, 200, { ok: true, preset, presets: state.presets, state });
        return;
      }

      if (pathname === '/api/presets/delete') {
        await engine.deletePreset(String(body?.id || ''));
        const state = await buildCanonicalState();
        sendJson(res, 200, { ok: true, presets: state.presets, state });
        return;
      }

      if (pathname === '/api/presets/import') {
        const rawPreset = body?.preset && typeof body.preset === 'object' ? body.preset : body;
        const imported = await engine.importPreset(rawPreset);
        const preset = imported?.preset || imported;
        const state = await buildCanonicalState();
        sendJson(res, 200, { ok: true, preset, presets: state.presets, state });
        return;
      }

      if (pathname === '/api/wallpaper/props') {
        await engine.updateUserProps(String(body?.wallpaperId || ''), body?.props || {});
        await pushToHost();
        sendJson(res, 200, { ok: true, state: await buildCanonicalState() });
        return;
      }

      if (pathname === '/api/upload/remove') {
        const wid = String(body?.wallpaperId || body?.id || '');
        await engine.removeUpload(wid);
        await pushToHost();
        const lib = await normalizeLibrary(true);
        sendJson(res, 200, { ok: true, items: lib.items, state: await buildCanonicalState() });
        return;
      }

      if (pathname === '/api/storage/dir') {
        const kind = String(body?.kind || '');
        const dirPath = String(body?.path || '');
        await engine.setStorageDir(kind, dirPath);
        await pushToHost();
        const state = await buildCanonicalState();
        sendJson(res, 200, { ok: true, config: state.config, state });
        return;
      }

      if (pathname === '/api/skin/restore') {
        await engine.updateConfig({ skinEnabled: false });
        await pushToHost();
        sendJson(res, 200, { ok: true, state: await buildCanonicalState() });
        return;
      }

      if (pathname === '/api/skin/wake') {
        const out = await rpcHandlers['skin.wake']();
        sendJson(res, 200, out);
        return;
      }

      if (pathname === '/api/canary/reset') {
        const out = await rpcHandlers['canary.reset']();
        sendJson(res, 200, out);
        return;
      }

      if (pathname === '/api/host/reload') {
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
        const state = await buildCanonicalState();
        sendJson(res, 200, {
          ok: Boolean(autostart.ok),
          autostart,
          hostStatus: state.hostStatus,
          normalShortcutEnabled: state.normalShortcutEnabled,
          patchedShortcuts: state.patchedShortcuts,
          sidecarAutoStartsOnBoot: true,
          autoRestoreLastSettings: true,
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

  const server = createServer((req, res) => {
    handleRequest(req, res).catch((err) => {
      if (!res.headersSent) {
        sendJson(res, 400, { ok: false, error: err?.message || String(err) });
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

  const serverInfoPath = join(dataDir, 'server_info.json');
  try {
    writeFileSync(
      serverInfoPath,
      `${JSON.stringify({ plugin: PLUGIN_ID, pid: process.pid, port: actualPort, token: authToken || null, startedAt: new Date().toISOString() }, null, 2)}\n`,
      'utf8',
    );
  } catch {
    /* non-fatal */
  }

  const close = async () => {
    for (const ka of studioSseKeepalives) clearInterval(ka);
    studioSseKeepalives.clear();
    for (const clientRes of studioSseClients) {
      try { clientRes.end(); } catch { /* ignore */ }
    }
    studioSseClients.clear();
    if (cdpBridge) {
      await cdpBridge.stop({ removeSkin: true, removePanel: true }).catch(() => {});
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
      end(chunk) {
        if (ended) return;
        ended = true;
        if (chunk) outChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
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
      },
    };

    try {
      await handleRequest(req, res);
    } catch (err) {
      if (!res.headersSent) sendJson(res, 400, { ok: false, error: err?.message || String(err) });
    }
    return donePromise;
  };

  return {
    server,
    port: actualPort,
    origin,
    token: authToken,
    hostCapToken,
    hostBaseUrl: `${origin}/host/${hostCapToken}`,
    canary: canaryController,
    engine,
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
  const instance = await createPrismStudioServer();
  console.log(
    `[prism_studio] listening on ${instance.origin} (media=${instance.engine.getMediaOrigin?.() || 'n/a'}, pid=${process.pid})`,
  );

  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    instance.close().finally(() => process.exit(0));
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  // Clean in-process host script hot-reload (never exits 0 under `restart_policy: "on-failure"`!)
  const watchedFiles = [
    join(PLUGIN_ROOT, 'src', 'host', 'wallpaper-inject.js'),
    join(PLUGIN_ROOT, 'src', 'host', 'panel-inject.js'),
  ];
  const mtimes = new Map();
  for (const wf of watchedFiles) {
    try {
      if (existsSync(wf)) mtimes.set(wf, statSync(wf).mtimeMs);
    } catch {
      /* ignore */
    }
  }
  const watchTimer = setInterval(() => {
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
      void instance.cdpBridge?.broadcastState?.().catch(() => {});
    }
  }, 4000);
  watchTimer.unref?.();
}
