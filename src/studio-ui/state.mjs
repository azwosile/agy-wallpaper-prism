// Wallpaper Prism Studio UI — Layer 1 Core State, Net, Persistence & Patch Engine
// Strict DAG L1: imports ONLY ../shared/schema.mjs and ../shared/i18n.mjs.
// Zero `export let` live bindings; all mutable state lives in `store` / `hooks`.

import {
  PLUGIN_VERSION,
  DEFAULT_DEBUG_PORT,
  CANARY_STATES,
  LIBRARY_KINDS,
  CONTENT_RATINGS,
  REGION_IDS,
  REGION_OPTICAL_KEYS,
  DEFAULT_REGION_ENTRY,
  FACTORY_PRESETS,
  DEFAULT_CONFIG,
  PER_WALLPAPER_OVERRIDE_KEYS,
  sanitizeConfig,
  resolveEffectiveConfig,
  mergeRegionsPatch,
} from '../shared/schema.mjs';

import { t, resolveLocale } from '../shared/i18n.mjs';

export const MAX_UPLOAD_BYTES = 512 * 1024 * 1024; // 512 MB
export const CONFIG_THROTTLE_MS = 60;
export const API_TIMEOUT_MS = 8000;
export const VIRTUAL_SCROLL_THRESHOLD = 30;
export const OPEN_REGIONS_STORAGE_KEY = 'prism.openRegions.v22';

export const REGION_UI_ORDER = Object.freeze([
  // Shell Chrome
  'topbar',
  'wco',
  'sidebar',
  'workspace',
  // Chat Bubbles & Content
  'userBubble',
  'assistantBubble',
  'codeBlock',
  // Interactive Controls & Overlays
  'controls',
  'composer',
  'rightPane',
  'popover',
  // Global Canvas, Media & Visual Extensions
  'global',
]);

export const REGION_RESET_EXTRA_KEYS = Object.freeze({
  topbar: Object.freeze({ topbarStyle: DEFAULT_CONFIG.topbarStyle }),
  wco: Object.freeze({ transparentWindowControls: DEFAULT_CONFIG.transparentWindowControls }),
  sidebar: Object.freeze({
    sidebarOpacity: null,
    sidebarBlur: null,
    leftSidebarRadius: DEFAULT_CONFIG.leftSidebarRadius,
    sidebarListStyle: DEFAULT_CONFIG.sidebarListStyle,
    sidebarTypographyMode: DEFAULT_CONFIG.sidebarTypographyMode,
    sidebarFontSize: null,
  }),
  workspace: Object.freeze({
    hideWelcomeLogo: DEFAULT_CONFIG.hideWelcomeLogo,
    contrastFloor: DEFAULT_CONFIG.contrastFloor,
    chatGlassFidelity: DEFAULT_CONFIG.chatGlassFidelity,
  }),
  card: Object.freeze({}),
  userBubble: Object.freeze({}),
  assistantBubble: Object.freeze({}),
  codeBlock: Object.freeze({
    codeReadabilityMode: DEFAULT_CONFIG.codeReadabilityMode,
  }),
  controls: Object.freeze({}),
  composer: Object.freeze({ caretColor: DEFAULT_CONFIG.caretColor }),
  rightPane: Object.freeze({ rightSidebarRadius: DEFAULT_CONFIG.rightSidebarRadius }),
  popover: Object.freeze({ floaterSolidBase: DEFAULT_CONFIG.floaterSolidBase }),
});

// Extra Studio-specific bilingual labels supplementing shared/i18n.mjs
export const EXTRA_COPY = Object.freeze({
  zh: Object.freeze({
    scopeAll: '全部',
    scopeWorkshop: '创意工坊',
    scopeLocal: '本地与上传',
    batchMode: '批量选择',
    batchHide: '隐藏已选',
    batchPlaylist: '加入轮播',
    batchClear: '退出批量',
    densityGrid: '画廊视图',
    densityCompact: '紧凑视图',
    nonEmptyGuard: '至少需要保留一个激活的筛选项',
    uploadBusy: '正在流式上传媒体…',
    uploadDone: '壁纸上传成功并已加入资源库',
    uploadTooLarge: '文件超过 512 MB 上限',
    inspectorBtn: '属性',
    wePropsEmpty: '该壁纸未声明 Wallpaper Engine 自定义属性 (project.json)',
    wePropsTitle: 'Wallpaper Engine 动态属性',
    savePresetPlaceholder: '输入配置快照名称…',
    savePresetDescPlaceholder: '简短描述（可选）…',
    presetSaved: '配置快照已保存',
    presetImported: '配置快照导入成功',
    playlistNamePlaceholder: '新建轮播列表名称…',
    playlistSaved: '轮播列表已更新',
    playlistNeedTwo: '轮播列表至少需要选择 2 张未隐藏壁纸',
    fsSelectCurrent: '选择当前目录',
    fsUp: '上级目录',
    fsEmpty: '当前目录下没有子文件夹',
    statsTotal: '总壁纸数',
    statsWorkshop: '创意工坊 431960',
    statsUploads: '本地与上传',
    statsSteam: 'Steam 路径',
    skinGateLabel: '启用整窗棱镜玻璃皮肤',
    skinReapply: '立即应用棱镜皮肤',
    skinToggleToastOn: '棱镜皮肤已启用',
    skinToggleToastOff: '已禁用棱镜皮肤，已还原宿主默认外观',
    extractedTitle: '32×32 动态色度直方图取色',
    dblClickFramingHint: '双击标题可一键归零 X / Y / 缩放 (50% / 50% / 100%)',
    slideInterval: '多图幻灯片切换秒数 (0=跟随WE)',
    interactiveWeb: '转发鼠标悬停/点击交互至网页壁纸',
    filterPreset: '快速色彩滤镜预设',
    addFolder: '添加壁纸目录…',
    removeFolder: '移除',
    noCustomFolders: '暂未添加额外扫描目录',
    requestTimeout: '请求超时（8 秒），请重试',
    opticsFiltersTitle: '壁纸光学与滤镜',
    playFramingTitle: '画面填充与自由构图',
    playEngineTitle: '播放速度与 WebGL 场景引擎',
    quickSpeed: '快捷倍速',
    libraryTelemetry: '资源库统计',
    orderLabel: '轮播顺序',
    triggerLabel: '切换时机',
    playlistsLabel: '播放列表',
    selectVisible: '全选可见',
    clearBtn: '清空',
    savePlaylist: '💾 保存播放列表',
    editorOpenModalHint: '放大打开可视化外观编辑器',
    editorZoomEdit: '放大编辑',
    retryMedia: '↻ 重试加载',
    switchGentleAuto: '切回温和自动恢复',
    dirtyBadge: '已修改',
    fontCustomPlaceholder: "自定义字体栈，例如 'Noto Sans SC', sans-serif",
    fontInvalidHint: '检测到不安全字符，提交时将自动过滤',
    clickExactHint: '点击输入精确数值',
  }),
  en: Object.freeze({
    scopeAll: 'All',
    scopeWorkshop: 'Workshop',
    scopeLocal: 'Local & Uploads',
    batchMode: 'Batch Select',
    batchHide: 'Hide Selected',
    batchPlaylist: 'Add to Playlist',
    batchClear: 'Done',
    densityGrid: 'Gallery',
    densityCompact: 'Compact',
    nonEmptyGuard: 'At least one filter chip must remain active',
    uploadBusy: 'Streaming upload in progress…',
    uploadDone: 'Media uploaded and added to library',
    uploadTooLarge: 'File exceeds 512 MB maximum limit',
    inspectorBtn: 'Inspect',
    wePropsEmpty: 'No custom Wallpaper Engine properties declared in project.json',
    wePropsTitle: 'Wallpaper Engine Properties',
    savePresetPlaceholder: 'Snapshot name…',
    savePresetDescPlaceholder: 'Short description (optional)…',
    presetSaved: 'Profile snapshot saved',
    presetImported: 'Profile snapshot imported',
    playlistNamePlaceholder: 'New playlist name…',
    playlistSaved: 'Rotation playlist updated',
    playlistNeedTwo: 'Select at least 2 unhidden wallpapers for a playlist',
    fsSelectCurrent: 'Select Current Folder',
    fsUp: 'Parent Dir',
    fsEmpty: 'No subdirectories in this folder',
    statsTotal: 'Total Wallpapers',
    statsWorkshop: 'Workshop 431960',
    statsUploads: 'Uploads & Local',
    statsSteam: 'Steam Root',
    skinGateLabel: 'Enable Whole-Window Prism Skin',
    skinReapply: 'Apply Prism Skin Now',
    skinToggleToastOn: 'Prism skin enabled',
    skinToggleToastOff: 'Prism skin disabled — native host restored',
    extractedTitle: '32×32 Chroma Histogram Accent',
    dblClickFramingHint: 'Double-click label to reset X / Y / Scale (50% / 50% / 100%)',
    slideInterval: 'Slideshow Crossfade Seconds (0=WE)',
    interactiveWeb: 'Forward pointer events to Web/Scene wallpaper',
    filterPreset: 'Quick Optical Filter Preset',
    addFolder: 'Add Custom Folder…',
    removeFolder: 'Remove',
    noCustomFolders: 'No extra wallpaper directories configured',
    requestTimeout: 'Request timed out (8s) — please retry',
    opticsFiltersTitle: 'Wallpaper Optics & Filters',
    playFramingTitle: 'Framing & Alignment',
    playEngineTitle: 'Playback Speed & Scene Engine',
    quickSpeed: 'Quick Speed',
    libraryTelemetry: 'Library Telemetry',
    orderLabel: 'Order',
    triggerLabel: 'Trigger',
    playlistsLabel: 'Playlists',
    selectVisible: 'Select Visible',
    clearBtn: 'Clear',
    savePlaylist: '💾 Save Playlist',
    editorOpenModalHint: 'Open Visual Appearance Editor',
    editorZoomEdit: 'Visual Edit',
    retryMedia: '↻ Retry',
    switchGentleAuto: 'Switch to Gentle Auto',
    dirtyBadge: 'Modified',
    fontCustomPlaceholder: "Custom font stack, e.g. 'Inter', sans-serif",
    fontInvalidHint: 'Unsafe CSS font syntax detected — will be sanitized',
    clickExactHint: 'Click to enter exact value',
  }),
});

export function detectInitialHostPolarity() {
  try {
    if (typeof document !== 'undefined') {
      if (document.body?.classList?.contains('light')) return 'light';
      if (document.body?.classList?.contains('dark')) return 'dark';
    }
    if (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: light)').matches
    ) {
      return 'light';
    }
  } catch {
    // ignore non-DOM environments
  }
  return 'dark';
}

export function loadOpenRegions() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return {};
    const raw = window.localStorage.getItem(OPEN_REGIONS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const clean = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (v === true && (REGION_UI_ORDER.includes(k) || REGION_IDS.includes(k))) {
        clean[k] = true;
      }
    }
    return clean;
  } catch {
    return {};
  }
}

export function saveOpenRegions(map = store.openRegions) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const out = {};
    if (map && typeof map === 'object') {
      for (const [k, v] of Object.entries(map)) {
        if (v === true) out[k] = true;
      }
    }
    window.localStorage.setItem(OPEN_REGIONS_STORAGE_KEY, JSON.stringify(out));
  } catch {
    // ignore storage quota or private mode restrictions
  }
}

function readDismissedUpdateVersion() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return '';
    return window.localStorage.getItem('prism.dismissedUpdateVersion') || '';
  } catch {
    return '';
  }
}

// Single mutable reactive state container (no `export let` live bindings).
export const store = {
  ready: false,
  activeTab: 'library', // 'library' | 'skin' | 'playback' | 'system'
  config: sanitizeConfig(DEFAULT_CONFIG),
  skinEnabled: true,
  activeItem: null,
  introItem: null,
  introUploading: false,
  introShowAllKinds: false,
  items: [],
  presets: [...FACTORY_PRESETS],
  hostStatus: { debuggable: false, attached: false, cdpPort: DEFAULT_DEBUG_PORT, targets: 0 },
  canary: {
    state: 'idle',
    trippedReason: '',
    lastArmTs: 0,
    lastHealthyTs: 0,
    browserSessionId: '',
  },
  sessionAwake: false,
  canaryBusy: false,
  wakeBusy: false,
  masterToggleBusy: false,
  profileOpBusy: false,
  saveStatus: 'idle', // 'idle' | 'saving' | 'saved' | 'error'
  autosaveState: 'idle', // alias kept in sync with saveStatus
  saveError: '',
  lastStateRev: 0,
  autostart: {
    normalShortcutEnabled: false,
    anyShortcutEnabled: false,
    patchedShortcuts: [],
    shortcuts: [],
    sidecarAutoStartsOnBoot: true,
    autoRestoreLastSettings: true,
    backupPath: '',
    configPath: '',
    busy: false,
    bannerDismissed: false,
  },
  stats: {},
  mediaOrigin: '',
  studioHttpOrigin: '',
  pid: 0,
  version: PLUGIN_VERSION,
  hostPolarity: detectInitialHostPolarity(),

  // Library UI state
  searchQuery: '',
  libScope: 'all', // 'all' | 'favorites' | 'workshop' | 'local'
  batchMode: false,
  batchSelected: new Set(),
  uploading: false,
  dragDepth: 0,
  virtualWindow: { start: 0, end: 96, padTop: 0, padBottom: 0, cols: 3 },

  // Slide-over drawers ('playlist' | 'inspector' | 'hidden' | 'fs' | 'presets' | null)
  drawer: null,
  inspectWallpaperId: '',
  playlistDraft: {
    editingId: '',
    name: '',
    order: 'random',
    trigger: 'interval',
    interval: 15,
    pickedIds: new Set(),
  },
  presetDraft: {
    name: '',
    description: '',
    includeWallpaper: false,
  },
  presetRenameTargetId: '',
  presetRenameDraft: '',
  fsBrowser: {
    targetKind: 'uploadDir', // 'uploadDir' | 'cacheDir' | 'addCustomFolder'
    current: '',
    parent: '',
    quickRoots: [],
    entries: [],
    loading: false,
    manualPath: '',
  },

  // 8-region accordion open state (persisted to localStorage['prism.openRegions.v22'], all collapsed by default)
  openRegions: loadOpenRegions(),

  // Dual-mode Visual Appearance Editor state
  editorMode: 'none', // 'none' | 'modal' | 'popout'
  editorModalOpen: false,
  isPopoutMode: false,
  selectedRegion: 'sidebar',
  canvasZoom: 1,
  canvasPanX: 0,
  canvasPanY: 0,
  canvasShowPopover: false,
  canvasShowEmptyLogo: false,
  canvasPreviewTheme: null, // null (follow config) | 'dark' | 'light'

  // Phase 2 CDP Live Host Region Picker state
  inspectorPicking: false,
  inspectorBusy: false,
  inspectorSessionId: '',
  inspectorTargetCount: 0,
  inspectorLastPicked: '',
  inspectorLastPickedAt: 0,
  inspectorError: '',

  // 2-step inline confirmation (never window.confirm / alert)
  armedConfirm: null, // { key, timer }
  toasts: [],

  // Progressive-disclosure per-component tint drawer state (at most 1 open)
  expandedTintComp: '',

  // Auto-update status, banner & post-update reconnect overlay state
  update: {
    checking: false,
    applying: false,
    checked: false,
    hasUpdate: false,
    currentVersion: PLUGIN_VERSION,
    latestVersion: null,
    latestTag: null,
    releaseUrl: 'https://github.com/azwosile/agy-wallpaper-prism/releases',
    publishedAt: null,
    changelog: '',
    changelogSummary: '',
    offline: false,
    rateLimited: false,
    checkedAt: null,
    canSelfUpdate: true,
    isGitCheckout: false,
    isSymlink: false,
    disabledReason: '',
    notesOpen: false,
    error: '',
    standaloneRestartNeeded: false,
    dismissedVersion: readDismissedUpdateVersion(),
    reconnect: {
      active: false,
      timedOut: false,
      targetVersion: '',
      attempts: 0,
      maxAttempts: 24,
      sawDown: false,
      prevPid: 0,
    },
  },

  // Centralized mutable runtime handles (replaces legacy module-level `let`s)
  runtime: {
    booted: false,
    isDormant: false,
    isDeepDormant: false,
    isMiniStageInViewport: true,
    lastAppliedRev: 0,
    lastRevEpoch: '',
    pointerDownInsideScroller: false,
    pointerHoldSafetyTimer: null,
    imeComposing: false,
    deferredExternalSnapshot: null,
    pendingToggleTarget: null,
    configDebounceTimer: null,
    configFlushInFlight: false,
    configFlushInFlightForce: false,
    configFlushPending: false,
    configFlushPendingForce: false,
    configFlushForce: false,
    configFlushKeepalive: false,
    configFlushPromise: null,
    lastConfigFlushAt: 0,
    pendingConfigPatch: {},
    saveFadeTimer: null,
    currentStageMediaSig: '',
    slideshowTimer: null,
    statusPollTimer: null,
    studioEventSource: null,
    studioLastSseAt: 0,
    studioSyncPollTimer: null,
    previewWatchdogTimer: null,
    deepSleepTimer: null,
    externalSyncInFlight: false,
    updateReconnectTimer: null,
    updateBootCheckTimer: null,
    activeHoverThumbTimer: null,
    activeHoverThumbImg: null,
    serverHasStaticThumbFfmpeg: null,
    dormantDraftSnapshot: null,
    tempObjectUrls: new Set(),
    accentMemCache: new Map(),
    frozenThumbLru: new Map(),
    miniStageObserver: null,
    rootResizeObserver: null,
  },
};

// Upward UI callback registry injected by app.mjs (eliminates reverse DAG imports).
export const hooks = {
  renderActiveSurface: () => {},
  renderToastStack: () => {},
  syncOpticalCssVars: () => {},
  syncMiniPreviewMedia: () => {},
  updateTopStatusIndicators: () => {},
  updateLeftRailPanels: () => {},
  syncRegionBadgesInDom: () => {},
  syncSurfaceTintsHeaderInDom: () => {},
  onSaveStatusChange: () => {},
};

export function registerHooks(impl = {}) {
  if (!impl || typeof impl !== 'object') return;
  for (const [k, fn] of Object.entries(impl)) {
    if (typeof fn === 'function') {
      hooks[k] = fn;
    }
  }
}

// ============================================================================
// Localization, Formatting & Security Helpers
// ============================================================================
export function curLocale() {
  return resolveLocale(store.config.language);
}

export function tr(key, params = null) {
  return t(key, params, curLocale());
}

export function trWithFallback(key, zhFallback, enFallback, params = null) {
  const val = tr(key, params);
  if (val && val !== key) return val;
  let fb = curLocale() === 'zh' ? zhFallback : enFallback;
  if (params && typeof params === 'object' && typeof fb === 'string') {
    fb = fb.replace(/\{(\w+)\}/g, (_, k) => (params[k] !== undefined ? String(params[k]) : `{${k}}`));
  }
  return fb;
}

export function tx(extraKey) {
  const loc = curLocale();
  return EXTRA_COPY[loc]?.[extraKey] ?? EXTRA_COPY.en[extraKey] ?? extraKey;
}

export function esc(val) {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatBytes(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(n >= 100 * 1024 * 1024 ? 0 : 1)} MB`;
}

export function sanitizeExternalReleaseUrl(rawUrl) {
  const fallback = 'https://github.com/azwosile/agy-wallpaper-prism/releases';
  const str = String(rawUrl || '').trim();
  if (!str) return fallback;
  try {
    const u = new URL(str);
    if (u.protocol === 'https:') return u.toString();
  } catch {
    // ignore invalid URL
  }
  return fallback;
}

export function formatUpdateTimestamp(ts) {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '—';
  }
}

export function stripHtml(str) {
  return String(str ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .trim();
}

export function withStaticPreviewParam(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;
  if (!trimmed.includes('/preview/')) return trimmed;
  const hashIdx = trimmed.indexOf('#');
  const base = hashIdx >= 0 ? trimmed.slice(0, hashIdx) : trimmed;
  const hash = hashIdx >= 0 ? trimmed.slice(hashIdx) : '';
  if (/(?:[?&])static=1(?:&|$)/.test(base)) return trimmed;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}static=1${hash}`;
}

export function isStudioViewportActive() {
  if (typeof document === 'undefined') return false;
  if (document.visibilityState !== 'visible' || document.hidden) return false;
  try {
    const w = (typeof window !== 'undefined' ? window.innerWidth : 0) || document.documentElement?.clientWidth || 0;
    const h = (typeof window !== 'undefined' ? window.innerHeight : 0) || document.documentElement?.clientHeight || 0;
    if (w <= 20 || h <= 20) return false;
    const appEl = document.getElementById('app');
    if (appEl && appEl.dataset?.prismReady === 'true' && typeof appEl.getBoundingClientRect === 'function') {
      const r = appEl.getBoundingClientRect();
      if (r.width <= 20 || r.height <= 20) return false;
    }
    return true;
  } catch {
    return true;
  }
}

// ============================================================================
// Sidecar Auth Token & AbortController-Guarded HTTP Client
// ============================================================================
export function getSidecarAuthToken() {
  try {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location?.search || '').get('token') || window.__SIDECAR_BOOT__?.token || '';
  } catch {
    return '';
  }
}

export async function apiFetch(url, init = {}) {
  const tok = getSidecarAuthToken();
  const hasSidecarFetch =
    typeof window !== 'undefined' && window.sidecar && typeof window.sidecar.fetch === 'function';
  if (hasSidecarFetch) {
    if (!tok) return window.sidecar.fetch(url, init);
    const headers = new Headers(init.headers || {});
    if (!headers.has('X-Sidecar-Token')) {
      headers.set('X-Sidecar-Token', tok);
    }
    return window.sidecar.fetch(url, { ...init, headers });
  }
  const headers = new Headers(init.headers || {});
  if (tok && !headers.has('X-Sidecar-Token')) {
    headers.set('X-Sidecar-Token', tok);
  }
  const fetchFn =
    typeof window !== 'undefined' && typeof window.fetch === 'function'
      ? window.fetch.bind(window)
      : globalThis.fetch;
  return fetchFn(url, { ...init, headers });
}

export async function apiJson(url, options = {}) {
  const { timeoutMs: rawTimeoutMs, signal: externalSignal, ...restOptions } = options || {};
  const init = { ...restOptions };
  const timeoutMs =
    rawTimeoutMs === 0
      ? 0
      : Number.isFinite(Number(rawTimeoutMs)) && Number(rawTimeoutMs) > 0
        ? Number(rawTimeoutMs)
        : API_TIMEOUT_MS;

  if (
    init.body &&
    typeof init.body === 'object' &&
    !(typeof Blob !== 'undefined' && init.body instanceof Blob) &&
    !(init.body instanceof ArrayBuffer) &&
    !(init.body instanceof Uint8Array)
  ) {
    const headers = new Headers(init.headers || {});
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    init.headers = headers;
    init.body = JSON.stringify(init.body);
  }

  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  let timeoutTimer = null;
  let onExternalAbort = null;

  if (ctrl) {
    if (externalSignal) {
      if (externalSignal.aborted) {
        ctrl.abort(externalSignal.reason || new Error('aborted'));
      } else if (typeof externalSignal.addEventListener === 'function') {
        onExternalAbort = () => ctrl.abort(externalSignal.reason || new Error('aborted'));
        externalSignal.addEventListener('abort', onExternalAbort, { once: true });
      }
    }
    if (timeoutMs > 0) {
      timeoutTimer = setTimeout(() => {
        ctrl.abort(new Error('timeout'));
      }, timeoutMs);
    }
    init.signal = ctrl.signal;
  }

  try {
    const res = await apiFetch(url, init);
    const text = await res.text();
    let data = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    }
    if (!res.ok) {
      const msg = data?.error || data?.message || `HTTP ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      err.code = data?.code || '';
      err.data = data;
      throw err;
    }
    return data;
  } catch (err) {
    if (err?.name === 'AbortError' || (ctrl && ctrl.signal.aborted)) {
      const te = new Error(
        trWithFallback('common.requestTimeout', EXTRA_COPY.zh.requestTimeout, EXTRA_COPY.en.requestTimeout),
      );
      te.code = 'ERR_TIMEOUT';
      te.status = 408;
      throw te;
    }
    throw err;
  } finally {
    if (timeoutTimer) clearTimeout(timeoutTimer);
    if (externalSignal && onExternalAbort && typeof externalSignal.removeEventListener === 'function') {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}

// ============================================================================
// State Accessors & Region Accordion Persistence
// ============================================================================
export function getActiveId() {
  return store.activeItem?.id || store.config.activeWallpaperId || store.config.wallpaperId || '';
}

export function getEffectiveConfig() {
  return resolveEffectiveConfig(store.config, getActiveId());
}

export function getResolvedPolarity(eff = getEffectiveConfig()) {
  if (eff.themeMode === 'light') return 'light';
  if (eff.themeMode === 'dark') return 'dark';
  return store.hostPolarity === 'light' ? 'light' : 'dark';
}

export function hasPerWallpaperPin(wallpaperId = getActiveId()) {
  if (!wallpaperId) return false;
  const ov = store.config.perWallpaperOverrides?.[wallpaperId];
  return Boolean(ov && typeof ov === 'object' && Object.keys(ov).length > 0);
}

export function isHostAttached(hs = store.hostStatus) {
  if (!hs || typeof hs !== 'object') return false;
  return Boolean(
    hs.phase === 'attached' ||
      Number(hs.attachedCount) > 0 ||
      hs.attached === true ||
      hs.cdpConnected === true,
  );
}

export function resolvePreviewVideoUrl(item) {
  if (!item || typeof item !== 'object') return '';
  if (item.kind === 'video') {
    return item.mediaUrl || item.videoUrl || '';
  }
  if (
    item.kind === 'scene' &&
    (item.sceneMode === 'video' || item.sceneMode === 'scene-video' || Boolean(item.sceneVideoUrl))
  ) {
    return item.sceneVideoUrl || item.mediaUrl || '';
  }
  return '';
}

export function getMasterToggleLabel(enabled) {
  return enabled
    ? trWithFallback('topbar.skinToggleOn', '已启用', 'Enabled')
    : trWithFallback('topbar.skinToggleOff', '已禁用', 'Disabled');
}

export function getMasterToggleHint(enabled) {
  return enabled
    ? trWithFallback(
        'topbar.skinToggleHintOn',
        '点击一键禁用棱镜皮肤与壁纸（还原宿主默认外观）',
        'Click to disable Prism skin & wallpaper',
      )
    : trWithFallback(
        'topbar.skinToggleHintOff',
        '点击一键启用棱镜皮肤与壁纸',
        'Click to enable Prism skin & wallpaper',
      );
}

export function isRegionOpen(regionId) {
  if (!regionId) return false;
  return Boolean(store.openRegions && store.openRegions[regionId] === true);
}

export function setRegionOpen(regionId, isOpen) {
  if (!regionId) return;
  if (!store.openRegions || typeof store.openRegions !== 'object') {
    store.openRegions = {};
  }
  if (isOpen) {
    store.openRegions[regionId] = true;
  } else {
    delete store.openRegions[regionId];
  }
  saveOpenRegions(store.openRegions);
}

export function setAllRegionsOpen(isOpen, regionIds = REGION_UI_ORDER) {
  const next = {};
  if (isOpen) {
    for (const id of regionIds) {
      next[id] = true;
    }
  }
  store.openRegions = next;
  saveOpenRegions(store.openRegions);
}

export function hasAnyRegionOpen(regionIds = REGION_UI_ORDER) {
  return regionIds.some((id) => isRegionOpen(id));
}

// ============================================================================
// 4-Layer (regionId, propKey) Patch Deep Merge & Per-Wallpaper Pin Router
// ============================================================================
function hasOwn(obj, k) {
  return Boolean(obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, k));
}

function clearOpticalKeysInRegionsMap(baseRegions) {
  const out =
    baseRegions && typeof baseRegions === 'object' && !Array.isArray(baseRegions) ? { ...baseRegions } : {};
  for (const id of REGION_IDS) {
    if (out[id] === null) continue;
    const prev = out[id] && typeof out[id] === 'object' ? { ...out[id] } : {};
    // Strictly reset ONLY the 9 optical keys; preserve borderStyle/radius/font*/allowRawFontColor/listStyle!
    for (const ok of REGION_OPTICAL_KEYS) {
      prev[ok] = DEFAULT_REGION_ENTRY[ok];
    }
    out[id] = prev;
  }
  return out;
}

function extractMirroredOpticalRegionsFromSurfaceTints(tintsObj) {
  const mirrored = {};
  if (!tintsObj || typeof tintsObj !== 'object' || Array.isArray(tintsObj)) return mirrored;
  for (const [id, sVal] of Object.entries(tintsObj)) {
    if (!REGION_IDS.includes(id)) continue;
    if (sVal === null) {
      const cleared = {};
      for (const ok of REGION_OPTICAL_KEYS) {
        cleared[ok] = DEFAULT_REGION_ENTRY[ok];
      }
      mirrored[id] = cleared;
    } else if (sVal && typeof sVal === 'object') {
      const opt = {};
      for (const ok of REGION_OPTICAL_KEYS) {
        if (hasOwn(sVal, ok)) opt[ok] = sVal[ok];
      }
      if (Object.keys(opt).length > 0) mirrored[id] = opt;
    }
  }
  return mirrored;
}

function extractMirroredSurfaceTintsFromRegions(regionsObj) {
  const mirrored = {};
  if (!regionsObj || typeof regionsObj !== 'object' || Array.isArray(regionsObj)) return mirrored;
  for (const [id, rVal] of Object.entries(regionsObj)) {
    if (!REGION_IDS.includes(id)) continue;
    if (rVal === null) {
      mirrored[id] = null;
    } else if (rVal && typeof rVal === 'object') {
      const opt = {};
      for (const ok of REGION_OPTICAL_KEYS) {
        if (hasOwn(rVal, ok)) opt[ok] = rVal[ok];
      }
      if (Object.keys(opt).length > 0) mirrored[id] = opt;
    }
  }
  return mirrored;
}

export function mergeSurfaceTintsPatch(baseTints, incomingTints) {
  if (incomingTints === null) return null;
  if (!incomingTints || typeof incomingTints !== 'object' || Array.isArray(incomingTints)) {
    return baseTints;
  }
  const out =
    baseTints && typeof baseTints === 'object' && !Array.isArray(baseTints) ? { ...baseTints } : {};
  for (const [comp, val] of Object.entries(incomingTints)) {
    if (val === null) {
      out[comp] = null;
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      const prev = out[comp] && typeof out[comp] === 'object' ? out[comp] : {};
      out[comp] = { ...prev, ...val };
    }
  }
  return out;
}

function syncLegacySidebarFieldIntoPatch(targetPatch, incomingPatch, legacyKey, regionProp) {
  if (!hasOwn(incomingPatch, legacyKey)) return;
  const resetFullRegions = incomingPatch.regions === null;
  const resetAllTints = incomingPatch.surfaceTints === null;
  const inRegionsTouched =
    resetFullRegions ||
    (incomingPatch.regions &&
      typeof incomingPatch.regions === 'object' &&
      (incomingPatch.regions.sidebar === null || hasOwn(incomingPatch.regions.sidebar, regionProp)));
  const inTintsTouched =
    resetAllTints ||
    (incomingPatch.surfaceTints &&
      typeof incomingPatch.surfaceTints === 'object' &&
      (incomingPatch.surfaceTints.sidebar === null || hasOwn(incomingPatch.surfaceTints.sidebar, regionProp)));
  if (inRegionsTouched || inTintsTouched) return;
  const v = incomingPatch[legacyKey];
  if (hasOwn(targetPatch, 'regions') && targetPatch.regions !== null) {
    targetPatch.regions = mergeRegionsPatch(targetPatch.regions, { sidebar: { [regionProp]: v } });
  }
  if (hasOwn(targetPatch, 'surfaceTints') && targetPatch.surfaceTints !== null) {
    targetPatch.surfaceTints = mergeSurfaceTintsPatch(targetPatch.surfaceTints, { sidebar: { [regionProp]: v } });
  }
}

export function mergeConfigPatches(prevPatch, nextPatch) {
  const prev = prevPatch && typeof prevPatch === 'object' ? prevPatch : {};
  const next = nextPatch && typeof nextPatch === 'object' ? nextPatch : {};
  const merged = { ...prev, ...next };

  // 1. (regionId, propKey)-granular regions merge (distinguishing regions:null full reset vs surfaceTints:null optical-only reset)
  if (hasOwn(next, 'regions')) {
    merged.regions = next.regions === null ? null : mergeRegionsPatch(prev.regions, next.regions);
    if (next.regions === null) {
      merged.surfaceTints = null;
    } else if (hasOwn(prev, 'surfaceTints') && prev.surfaceTints !== null && !hasOwn(next, 'surfaceTints')) {
      const mirroredTints = extractMirroredSurfaceTintsFromRegions(next.regions);
      if (Object.keys(mirroredTints).length > 0) {
        merged.surfaceTints = mergeSurfaceTintsPatch(prev.surfaceTints, mirroredTints);
      }
    }
  } else if (hasOwn(next, 'surfaceTints') && hasOwn(prev, 'regions') && prev.regions !== null) {
    if (next.surfaceTints === null) {
      merged.regions = clearOpticalKeysInRegionsMap(prev.regions);
    } else if (next.surfaceTints && typeof next.surfaceTints === 'object') {
      const mirrored = extractMirroredOpticalRegionsFromSurfaceTints(next.surfaceTints);
      if (Object.keys(mirrored).length > 0) {
        merged.regions = mergeRegionsPatch(prev.regions, mirrored);
      }
    }
  }

  // 2. surfaceTints backward-compatible deep merge
  if (hasOwn(prev, 'surfaceTints') && hasOwn(next, 'surfaceTints')) {
    merged.surfaceTints = mergeSurfaceTintsPatch(prev.surfaceTints, next.surfaceTints);
  }

  // 3. sidebarOpacity & sidebarBlur 4-branch bidirectional sync (100% aligned with schema.mjs)
  syncLegacySidebarFieldIntoPatch(merged, next, 'sidebarOpacity', 'opacity');
  syncLegacySidebarFieldIntoPatch(merged, next, 'sidebarBlur', 'blur');

  // 4. perWallpaperOverrides deep merge per wallpaperId (including regions & sidebarOpacity/sidebarBlur sync)
  if (
    prev.perWallpaperOverrides &&
    next.perWallpaperOverrides &&
    typeof prev.perWallpaperOverrides === 'object' &&
    typeof next.perWallpaperOverrides === 'object'
  ) {
    const ovs = { ...prev.perWallpaperOverrides };
    for (const [wid, ov] of Object.entries(next.perWallpaperOverrides)) {
      if (ov && typeof ov === 'object' && ovs[wid] && typeof ovs[wid] === 'object') {
        const nextOv = { ...ovs[wid], ...ov };
        if (hasOwn(ov, 'regions')) {
          nextOv.regions = ov.regions === null ? null : mergeRegionsPatch(ovs[wid].regions, ov.regions);
          if (ov.regions === null) {
            nextOv.surfaceTints = null;
          } else if (hasOwn(ovs[wid], 'surfaceTints') && ovs[wid].surfaceTints !== null && !hasOwn(ov, 'surfaceTints')) {
            const mirroredTints = extractMirroredSurfaceTintsFromRegions(ov.regions);
            if (Object.keys(mirroredTints).length > 0) {
              nextOv.surfaceTints = mergeSurfaceTintsPatch(ovs[wid].surfaceTints, mirroredTints);
            }
          }
        } else if (hasOwn(ov, 'surfaceTints') && hasOwn(ovs[wid], 'regions') && ovs[wid].regions !== null) {
          if (ov.surfaceTints === null) {
            nextOv.regions = clearOpticalKeysInRegionsMap(ovs[wid].regions);
          } else if (ov.surfaceTints && typeof ov.surfaceTints === 'object') {
            const mirrored = extractMirroredOpticalRegionsFromSurfaceTints(ov.surfaceTints);
            if (Object.keys(mirrored).length > 0) {
              nextOv.regions = mergeRegionsPatch(ovs[wid].regions, mirrored);
            }
          }
        }
        if (hasOwn(ovs[wid], 'surfaceTints') && hasOwn(ov, 'surfaceTints')) {
          nextOv.surfaceTints = mergeSurfaceTintsPatch(ovs[wid].surfaceTints, ov.surfaceTints);
        }
        syncLegacySidebarFieldIntoPatch(nextOv, ov, 'sidebarOpacity', 'opacity');
        syncLegacySidebarFieldIntoPatch(nextOv, ov, 'sidebarBlur', 'blur');
        ovs[wid] = nextOv;
      } else {
        ovs[wid] = ov;
      }
    }
    merged.perWallpaperOverrides = ovs;
  }

  return merged;
}

export function buildConfigPatchForKey(patch) {
  const activeId = getActiveId();
  if (!activeId || !hasPerWallpaperPin(activeId)) {
    return patch;
  }
  const globalPart = {};
  const ovPart = { ...(store.config.perWallpaperOverrides?.[activeId] || {}) };
  const clearingAllTints = patch.surfaceTints === null;
  const clearingFullRegions = patch.regions === null;
  let touchedOv = false;

  for (const [k, v] of Object.entries(patch)) {
    if (!PER_WALLPAPER_OVERRIDE_KEYS.includes(k)) {
      globalPart[k] = v;
      continue;
    }
    if (k === 'regions') {
      if (v === null) {
        ovPart.regions = null;
        ovPart.surfaceTints = null;
        ovPart.sidebarOpacity = null;
        ovPart.sidebarBlur = null;
      } else {
        // Strict (regionId, propKey)-granular deep merge; never clobber sibling regions!
        ovPart.regions = mergeRegionsPatch(ovPart.regions, v);
        if (ovPart.surfaceTints && typeof ovPart.surfaceTints === 'object') {
          const mirroredTints = extractMirroredSurfaceTintsFromRegions(v);
          if (Object.keys(mirroredTints).length > 0) {
            ovPart.surfaceTints = mergeSurfaceTintsPatch(ovPart.surfaceTints, mirroredTints);
          }
        }
        if (v && typeof v === 'object') {
          if (v.sidebar === null) {
            ovPart.sidebarOpacity = null;
            ovPart.sidebarBlur = null;
          } else if (v.sidebar && typeof v.sidebar === 'object') {
            if (hasOwn(v.sidebar, 'opacity')) ovPart.sidebarOpacity = v.sidebar.opacity;
            if (hasOwn(v.sidebar, 'blur')) ovPart.sidebarBlur = v.sidebar.blur;
          }
        }
      }
    } else if (k === 'surfaceTints') {
      ovPart.surfaceTints = mergeSurfaceTintsPatch(ovPart.surfaceTints, v);
      if (v === null) {
        if (!clearingFullRegions && ovPart.regions && typeof ovPart.regions === 'object') {
          ovPart.regions = clearOpticalKeysInRegionsMap(ovPart.regions);
        }
        ovPart.sidebarOpacity = null;
        ovPart.sidebarBlur = null;
      } else if (v && typeof v === 'object') {
        if (ovPart.regions && typeof ovPart.regions === 'object') {
          const mirrored = extractMirroredOpticalRegionsFromSurfaceTints(v);
          if (Object.keys(mirrored).length > 0) {
            ovPart.regions = mergeRegionsPatch(ovPart.regions, mirrored);
          }
        }
        if (v.sidebar === null) {
          ovPart.sidebarOpacity = null;
          ovPart.sidebarBlur = null;
        } else if (v.sidebar && typeof v.sidebar === 'object') {
          if (hasOwn(v.sidebar, 'opacity')) ovPart.sidebarOpacity = v.sidebar.opacity;
          if (hasOwn(v.sidebar, 'blur')) ovPart.sidebarBlur = v.sidebar.blur;
        }
      }
    } else {
      ovPart[k] = v;
      if (
        k === 'sidebarOpacity' &&
        !clearingAllTints &&
        !clearingFullRegions &&
        !(ovPart.surfaceTints === null && v === null)
      ) {
        ovPart.surfaceTints = mergeSurfaceTintsPatch(ovPart.surfaceTints, { sidebar: { opacity: v } });
        ovPart.regions = mergeRegionsPatch(ovPart.regions, { sidebar: { opacity: v } });
      }
      if (
        k === 'sidebarBlur' &&
        !clearingAllTints &&
        !clearingFullRegions &&
        !(ovPart.surfaceTints === null && v === null)
      ) {
        ovPart.surfaceTints = mergeSurfaceTintsPatch(ovPart.surfaceTints, { sidebar: { blur: v } });
        ovPart.regions = mergeRegionsPatch(ovPart.regions, { sidebar: { blur: v } });
      }
    }
    touchedOv = true;
  }

  if (!touchedOv) return patch;
  return {
    ...globalPart,
    perWallpaperOverrides: {
      ...(store.config.perWallpaperOverrides || {}),
      [activeId]: ovPart,
    },
  };
}

// ============================================================================
// Silent Auto-Save Inline Indicator, Throttled Flush & Keepalive Unload Flush
// ============================================================================
export function setSaveStatus(status, errorMsg = '') {
  const next = ['idle', 'saving', 'saved', 'error'].includes(status) ? status : 'idle';
  store.saveStatus = next;
  store.autosaveState = next;
  store.saveError = next === 'error' ? String(errorMsg || '') : '';

  const rt = store.runtime;
  if (rt.saveFadeTimer) {
    clearTimeout(rt.saveFadeTimer);
    rt.saveFadeTimer = null;
  }

  if (typeof document !== 'undefined') {
    const nodes = new Set();
    const primary = document.getElementById('prism-autosave-indicator');
    if (primary) nodes.add(primary);
    document.querySelectorAll('[data-autosave-indicator="true"]').forEach((el) => nodes.add(el));
    for (const el of nodes) {
      el.dataset.state = next;
      if (next === 'saving') {
        el.textContent = `◌ ${tr('autosave.saving')}`;
        el.title = '';
      } else if (next === 'saved') {
        el.textContent = tr('autosave.saved');
        el.title = '';
      } else if (next === 'error') {
        el.innerHTML = `<button type="button" class="prism-autosave-retry" data-action="retry-config-flush">${esc(tr('autosave.error'))} · ${esc(tr('autosave.retry'))}</button>`;
        el.title = store.saveError;
      } else {
        el.textContent = '';
        el.title = '';
      }
    }
  }

  if (next === 'saved') {
    rt.saveFadeTimer = setTimeout(() => {
      rt.saveFadeTimer = null;
      if (store.saveStatus === 'saved') {
        setSaveStatus('idle');
      }
    }, 2600);
  }

  hooks.onSaveStatusChange(next, store.saveError);
}

export function applyLocalPatch(rawPatch, routeThroughPin = true) {
  const patch = routeThroughPin ? buildConfigPatchForKey(rawPatch) : rawPatch;
  store.config = sanitizeConfig(patch, store.config);
  if (patch && 'skinEnabled' in patch) {
    store.skinEnabled = Boolean(patch.skinEnabled);
  }
  hooks.syncOpticalCssVars();
  return patch;
}

export function queueConfigPatch(rawPatch, immediate = false, routeThroughPin = true) {
  const rt = store.runtime;
  const patch = applyLocalPatch(rawPatch, routeThroughPin);
  rt.pendingConfigPatch = mergeConfigPatches(rt.pendingConfigPatch, patch);
  setSaveStatus('saving');

  if (immediate) {
    if (rt.configDebounceTimer) {
      clearTimeout(rt.configDebounceTimer);
      rt.configDebounceTimer = null;
    }
    void flushConfigPatch();
    return;
  }

  const elapsed = Date.now() - rt.lastConfigFlushAt;
  if (!rt.configFlushInFlight && elapsed >= CONFIG_THROTTLE_MS) {
    if (rt.configDebounceTimer) {
      clearTimeout(rt.configDebounceTimer);
      rt.configDebounceTimer = null;
    }
    void flushConfigPatch();
    return;
  }

  if (!rt.configDebounceTimer) {
    const delay = Math.max(16, CONFIG_THROTTLE_MS - Math.max(0, elapsed));
    rt.configDebounceTimer = setTimeout(() => {
      rt.configDebounceTimer = null;
      void flushConfigPatch();
    }, delay);
  }
}

export async function flushConfigPatch({ flush = false, keepalive = false } = {}) {
  const rt = store.runtime;
  if (rt.configDebounceTimer) {
    clearTimeout(rt.configDebounceTimer);
    rt.configDebounceTimer = null;
  }

  if (rt.configFlushInFlight) {
    const hasNewEdits = Boolean(rt.pendingConfigPatch && Object.keys(rt.pendingConfigPatch).length > 0);
    const needsForceFollowup = Boolean(flush && !rt.configFlushInFlightForce);
    if (hasNewEdits || needsForceFollowup) {
      rt.configFlushPending = true;
      if (needsForceFollowup) rt.configFlushPendingForce = true;
      if (flush) rt.configFlushForce = true;
      if (keepalive) rt.configFlushKeepalive = true;
    }
    while (rt.configFlushInFlight && rt.configFlushPromise) {
      try {
        await rt.configFlushPromise;
      } catch {
        // handled inside active flush
      }
    }
    // If another edit or force-flush arrived right after the in-flight run drained, drain it too (unless in error state).
    const stillHasWork = Boolean(
      store.saveStatus !== 'error' &&
        ((rt.pendingConfigPatch && Object.keys(rt.pendingConfigPatch).length > 0) || rt.configFlushPendingForce),
    );
    if (!stillHasWork) return;
  }

  if (flush) rt.configFlushForce = true;
  if (keepalive) rt.configFlushKeepalive = true;

  const hasPendingEdits = Boolean(rt.pendingConfigPatch && Object.keys(rt.pendingConfigPatch).length > 0);
  if (!hasPendingEdits && !rt.configFlushPendingForce) {
    rt.configFlushPending = false;
    rt.configFlushForce = false;
    rt.configFlushKeepalive = false;
    return;
  }

  rt.configFlushInFlight = true;
  const run = (async () => {
    try {
      while (
        (rt.pendingConfigPatch && Object.keys(rt.pendingConfigPatch).length > 0) ||
        rt.configFlushPendingForce
      ) {
        const useFlush = Boolean(rt.configFlushForce || rt.configFlushPendingForce);
        const useKeepalive = Boolean(rt.configFlushKeepalive);
        rt.configFlushPending = false;
        rt.configFlushForce = false;
        rt.configFlushPendingForce = false;
        rt.configFlushKeepalive = false;
        rt.configFlushInFlightForce = useFlush;

        const patch =
          rt.pendingConfigPatch && typeof rt.pendingConfigPatch === 'object' ? rt.pendingConfigPatch : {};
        rt.pendingConfigPatch = {};
        rt.lastConfigFlushAt = Date.now();
        setSaveStatus('saving');

        try {
          let sendPatch = patch;
          if (useKeepalive && sendPatch && typeof sendPatch === 'object' && 'accentCache' in sendPatch) {
            sendPatch = { ...sendPatch };
            delete sendPatch.accentCache;
          }
          const body = useFlush ? { patch: sendPatch, flush: true } : { patch: sendPatch };
          const reqOpts = { method: 'POST', body };
          if (useKeepalive) reqOpts.keepalive = true;
          const res = await apiJson('/api/config', reqOpts);
          const hasMoreWork = Boolean(
            (rt.pendingConfigPatch && Object.keys(rt.pendingConfigPatch).length > 0) ||
              rt.configFlushPending ||
              rt.configFlushPendingForce,
          );
          if (!hasMoreWork) {
            ingestServerState(res);
            hooks.syncOpticalCssVars();
            hooks.syncRegionBadgesInDom();
            hooks.syncSurfaceTintsHeaderInDom();
            hooks.updateTopStatusIndicators();
            setSaveStatus('saved');
          }
        } catch (err) {
          // Restore unsent patch so user edits are NEVER dropped on transient timeout/network error
          if (patch && Object.keys(patch).length > 0) {
            rt.pendingConfigPatch = mergeConfigPatches(patch, rt.pendingConfigPatch);
          }
          if (useFlush) {
            rt.configFlushPendingForce = true;
          }
          const msg = err?.message || tr('autosave.error');
          setSaveStatus('error', msg);
          showToast(msg, 'danger');
          break;
        } finally {
          rt.configFlushInFlightForce = false;
        }
      }
    } finally {
      rt.configFlushInFlight = false;
      rt.configFlushInFlightForce = false;
      rt.configFlushPromise = null;
    }
  })();

  rt.configFlushPromise = run;
  return run;
}

// Synchronous fire-and-forget unload persistence (< 2 KB payload, X-Sidecar-Token header via fetch keepalive)
export function flushConfigPatchKeepalive() {
  const rt = store.runtime;
  if (rt.configDebounceTimer) {
    clearTimeout(rt.configDebounceTimer);
    rt.configDebounceTimer = null;
  }
  if (!rt.pendingConfigPatch || Object.keys(rt.pendingConfigPatch).length === 0) return false;
  const dirty = { ...rt.pendingConfigPatch };
  // Strip bulky accent cache to keep unload payload strictly < 2 KB (far below 64 KiB keepalive limit)
  delete dirty.accentCache;
  if (Object.keys(dirty).length === 0) {
    rt.pendingConfigPatch = {};
    return false;
  }
  const bodyStr = JSON.stringify({ patch: dirty, flush: true });
  rt.pendingConfigPatch = {};
  rt.lastConfigFlushAt = Date.now();
  const tok = getSidecarAuthToken();
  const headers = { 'Content-Type': 'application/json' };
  if (tok) headers['X-Sidecar-Token'] = tok;
  try {
    void apiFetch('/api/config', {
      method: 'POST',
      keepalive: true,
      headers,
      body: bodyStr,
    }).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Server State & Auto-Update Ingestion (with Monotonic `stateRev` Guard)
// ============================================================================
export function ingestUpdateStatus(data, { fromBootstrap = false } = {}) {
  if (!data || typeof data !== 'object') return;
  const u = store.update;
  if (typeof data.currentVersion === 'string' && data.currentVersion) {
    u.currentVersion = data.currentVersion;
  }
  if ('latestVersion' in data) u.latestVersion = data.latestVersion || null;
  if ('latestTag' in data) u.latestTag = data.latestTag || null;
  if (typeof data.hasUpdate === 'boolean') u.hasUpdate = data.hasUpdate;
  else if (typeof data.updateAvailable === 'boolean') u.hasUpdate = data.updateAvailable;
  if (typeof data.releaseUrl === 'string' && data.releaseUrl) {
    u.releaseUrl = sanitizeExternalReleaseUrl(data.releaseUrl);
  }
  if ('publishedAt' in data) u.publishedAt = data.publishedAt || null;
  if (typeof data.changelog === 'string') u.changelog = data.changelog;
  else if (typeof data.releaseNotes === 'string') u.changelog = data.releaseNotes;
  if (typeof data.changelogSummary === 'string') u.changelogSummary = data.changelogSummary;
  else if (!u.changelogSummary && typeof data.releaseNotes === 'string') {
    u.changelogSummary = data.releaseNotes.split('\n')[0] || '';
  }
  if (typeof data.offline === 'boolean') u.offline = data.offline;
  if (typeof data.rateLimited === 'boolean') u.rateLimited = data.rateLimited;
  if ('checkedAt' in data && data.checkedAt) u.checkedAt = data.checkedAt;
  const envObj = data.installEnv && typeof data.installEnv === 'object' ? data.installEnv : null;
  if (typeof data.canSelfUpdate === 'boolean') u.canSelfUpdate = data.canSelfUpdate;
  else if (typeof data.canAutoUpdate === 'boolean') u.canSelfUpdate = data.canAutoUpdate;
  else if (envObj && typeof envObj.canSelfUpdate === 'boolean') u.canSelfUpdate = envObj.canSelfUpdate;
  else if (envObj && typeof envObj.canAutoUpdate === 'boolean') u.canSelfUpdate = envObj.canAutoUpdate;
  if (envObj && typeof envObj.isGitCheckout === 'boolean') u.isGitCheckout = envObj.isGitCheckout;
  if (envObj && typeof envObj.isSymlink === 'boolean') u.isSymlink = envObj.isSymlink;
  const reason = data.disabledReason || data.blockReason || envObj?.disabledReason || envObj?.blockReason || '';
  if (reason || envObj) u.disabledReason = String(reason);
  if (!fromBootstrap || data.checkedAt || data.latestVersion) {
    u.checked = true;
  }
}

export function ingestServerState(payload, { forceConfig = false } = {}) {
  if (!payload || typeof payload !== 'object') return false;
  const s = payload.state && typeof payload.state === 'object' ? payload.state : payload;
  const rt = store.runtime;

  // Monotonic `stateRev` out-of-order guard (with cross-restart epoch reset)
  const rawRev = payload.stateRev ?? s.stateRev;
  const rev = Number(rawRev);
  const epoch = String(payload.stateEpoch ?? s.stateEpoch ?? s.mediaOrigin ?? payload.mediaOrigin ?? '');
  if (epoch && rt.lastRevEpoch && epoch !== rt.lastRevEpoch) {
    rt.lastAppliedRev = 0;
    store.lastStateRev = 0;
  }
  if (epoch) {
    rt.lastRevEpoch = epoch;
  }
  if (Number.isFinite(rev) && rev > 0) {
    if (rev < rt.lastAppliedRev) {
      return false;
    }
    rt.lastAppliedRev = rev;
    store.lastStateRev = rev;
  }

  const hasPendingEdits = Boolean(
    !forceConfig && rt.pendingConfigPatch && Object.keys(rt.pendingConfigPatch).length > 0,
  );
  const toggleLocked = Boolean(!forceConfig && (store.masterToggleBusy || rt.pendingToggleTarget !== null));

  if (s.config && typeof s.config === 'object') {
    const serverCfg = sanitizeConfig(s.config, store.config);
    if (hasPendingEdits) {
      // Preserve unsent local slider edits on top of incoming server config
      store.config = sanitizeConfig(rt.pendingConfigPatch, serverCfg);
    } else {
      store.config = serverCfg;
    }
    if (toggleLocked) {
      store.config = sanitizeConfig({ skinEnabled: store.skinEnabled }, store.config);
    }
  }

  if (!toggleLocked) {
    if (typeof s.skinEnabled === 'boolean') {
      store.skinEnabled = s.skinEnabled;
      store.config = sanitizeConfig({ skinEnabled: s.skinEnabled }, store.config);
    } else {
      store.skinEnabled = Boolean(store.config.skinEnabled);
    }
  }

  if ('introItem' in s) {
    store.introItem = s.introItem || null;
  }
  if ('activeItem' in s) {
    store.activeItem = s.activeItem || null;
  } else if (store.config.activeWallpaperId && store.items.length > 0) {
    store.activeItem = store.items.find((x) => x.id === store.config.activeWallpaperId) || store.activeItem;
  }
  if (Array.isArray(s.presets) && s.presets.length > 0) {
    store.presets = s.presets;
  }
  if (s.hostStatus && typeof s.hostStatus === 'object') {
    store.hostStatus = { ...store.hostStatus, ...s.hostStatus };
  }

  const canarySrc =
    (s.canary && typeof s.canary === 'object' ? s.canary : null) ||
    (s.hostStatus?.canary && typeof s.hostStatus.canary === 'object' ? s.hostStatus.canary : null);
  if (canarySrc) {
    const nextState = CANARY_STATES.includes(canarySrc.state) ? canarySrc.state : store.canary.state || 'idle';
    store.canary = {
      ...store.canary,
      ...canarySrc,
      state: nextState,
      trippedReason: String(canarySrc.trippedReason || ''),
    };
  }
  if (typeof s.sessionAwake === 'boolean') {
    store.sessionAwake = s.sessionAwake;
  } else if (typeof s.hostStatus?.sessionAwake === 'boolean') {
    store.sessionAwake = s.hostStatus.sessionAwake;
  }

  // Guardrail V3: ONLY sync inspectorPicking when payload provides an object `inspectorStatus`
  if (s.inspectorStatus && typeof s.inspectorStatus === 'object') {
    const nextActive = Boolean(s.inspectorStatus.active);
    store.inspectorPicking = nextActive;
    store.inspectorSessionId = String(s.inspectorStatus.sessionId || '');
    store.inspectorTargetCount = Number(s.inspectorStatus.targetCount) || 0;
    if (typeof s.inspectorStatus.lastPickedRegion === 'string' && s.inspectorStatus.lastPickedRegion) {
      store.inspectorLastPicked = s.inspectorStatus.lastPickedRegion;
    }
    if (!nextActive) {
      store.inspectorBusy = false;
    }
  }

  const autoSrc = (s.autostart && typeof s.autostart === 'object' ? s.autostart : null) || {};
  const hsSrc = (s.hostStatus && typeof s.hostStatus === 'object' ? s.hostStatus : null) || {};
  if ('normalShortcutEnabled' in s || 'normalShortcutEnabled' in autoSrc || 'normalShortcutEnabled' in hsSrc) {
    store.autostart.normalShortcutEnabled = Boolean(
      s.normalShortcutEnabled ?? autoSrc.normalShortcutEnabled ?? hsSrc.normalShortcutEnabled,
    );
  }
  if ('anyShortcutEnabled' in s || 'anyShortcutEnabled' in autoSrc || 'anyShortcutEnabled' in hsSrc) {
    store.autostart.anyShortcutEnabled = Boolean(
      s.anyShortcutEnabled ?? autoSrc.anyShortcutEnabled ?? hsSrc.anyShortcutEnabled ?? store.autostart.normalShortcutEnabled,
    );
  }
  const patchedList = s.patchedShortcuts ?? autoSrc.patchedShortcuts ?? hsSrc.patchedShortcuts;
  if (Array.isArray(patchedList)) {
    store.autostart.patchedShortcuts = patchedList;
  }
  const scList = autoSrc.shortcuts ?? s.shortcuts ?? hsSrc.shortcuts;
  if (Array.isArray(scList)) {
    store.autostart.shortcuts = scList;
  }
  if ('sidecarAutoStartsOnBoot' in s || 'sidecarAutoStartsOnBoot' in autoSrc || 'sidecarAutoStartsOnBoot' in hsSrc) {
    store.autostart.sidecarAutoStartsOnBoot = Boolean(
      s.sidecarAutoStartsOnBoot ?? autoSrc.sidecarAutoStartsOnBoot ?? hsSrc.sidecarAutoStartsOnBoot ?? true,
    );
  }
  if ('autoRestoreLastSettings' in s || 'autoRestoreLastSettings' in autoSrc || 'autoRestoreLastSettings' in hsSrc) {
    store.autostart.autoRestoreLastSettings = Boolean(
      s.autoRestoreLastSettings ?? autoSrc.autoRestoreLastSettings ?? hsSrc.autoRestoreLastSettings ?? true,
    );
  }
  if (autoSrc.backupPath || s.backupPath) {
    store.autostart.backupPath = String(autoSrc.backupPath || s.backupPath);
  }
  if (autoSrc.configPath || s.configPath) {
    store.autostart.configPath = String(autoSrc.configPath || s.configPath);
  }
  if (s.stats && typeof s.stats === 'object') {
    store.stats = { ...store.stats, ...s.stats };
  }
  if (typeof s.mediaOrigin === 'string') store.mediaOrigin = s.mediaOrigin;
  if (typeof s.studioHttpOrigin === 'string') store.studioHttpOrigin = s.studioHttpOrigin;
  if (typeof s.pid === 'number') store.pid = s.pid;
  if (typeof s.version === 'string') {
    store.version = s.version;
    store.update.currentVersion = s.version;
  }

  const updSrc =
    (s.updateStatus && typeof s.updateStatus === 'object' ? s.updateStatus : null) ||
    (s.updateSummary && typeof s.updateSummary === 'object' ? s.updateSummary : null) ||
    (s.update && typeof s.update === 'object' ? s.update : null);
  if (updSrc) {
    ingestUpdateStatus(updSrc, { fromBootstrap: true });
  }
  return true;
}

// ============================================================================
// Toasts & 2-Step Inline Confirmations
// ============================================================================
export function showToast(message, tone = 'info', durationMs = 3600) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  store.toasts.push({ id, message: String(message), tone });
  if (store.toasts.length > 4) store.toasts.shift();
  hooks.renderToastStack();
  setTimeout(() => {
    store.toasts = store.toasts.filter((x) => x.id !== id);
    hooks.renderToastStack();
  }, durationMs);
}

export function setArmedConfirm(key) {
  if (store.armedConfirm?.timer) {
    clearTimeout(store.armedConfirm.timer);
  }
  if (!key) {
    store.armedConfirm = null;
    hooks.renderActiveSurface();
    return;
  }
  const timer = setTimeout(() => {
    if (store.armedConfirm?.key === key) {
      store.armedConfirm = null;
      hooks.renderActiveSurface();
    }
  }, 6000);
  store.armedConfirm = { key, timer };
  hooks.renderActiveSurface();
}

// ============================================================================
// Phase 2: CDP Live Host Region Picker Actions
// ============================================================================
export async function startInspectorPick() {
  if (store.inspectorBusy) {
    return { ok: false, busy: true };
  }
  if (store.inspectorPicking) {
    return cancelInspectorPick('studio-cancel');
  }
  store.inspectorBusy = true;
  store.inspectorError = '';
  hooks.renderActiveSurface();
  try {
    const res = await apiJson('/api/inspector/pick', {
      method: 'POST',
      body: { lang: curLocale() },
      timeoutMs: 8000,
    });
    store.inspectorBusy = false;
    store.inspectorPicking = Boolean(res?.active ?? true);
    store.inspectorSessionId = String(res?.sessionId || res?.inspectorStatus?.sessionId || '');
    store.inspectorTargetCount = Number(res?.targetCount ?? res?.inspectorStatus?.targetCount) || 1;
    store.inspectorError = '';
    hooks.renderActiveSurface();
    return res;
  } catch (err) {
    const code = String(err?.code || err?.data?.code || '');
    const isUnavailableCode =
      code === 'ERR_CDP_UNAVAILABLE' ||
      code === 'ERR_NO_HUB_TARGETS' ||
      code === 'ERR_PLUGIN_DISABLED' ||
      code === 'ERR_INSPECTOR_INJECT_FAILED';
    const msg = isUnavailableCode
      ? tr('editor.pickHostUnavailable')
      : err?.message || tr('editor.pickHostUnavailable');
    store.inspectorBusy = false;
    store.inspectorPicking = false;
    store.inspectorSessionId = '';
    store.inspectorTargetCount = 0;
    store.inspectorError = msg;
    showToast(msg, 'warn', 4800);
    hooks.renderActiveSurface();
    return { ok: false, code, error: msg };
  }
}

export async function cancelInspectorPick(reason = 'studio-cancel') {
  const cleanReason = typeof reason === 'string' && reason.trim() ? reason.trim().slice(0, 64) : 'studio-cancel';
  const wasPicking = Boolean(store.inspectorPicking || store.inspectorBusy);
  store.inspectorPicking = false;
  store.inspectorBusy = false;
  store.inspectorSessionId = '';
  store.inspectorTargetCount = 0;
  if (wasPicking) {
    hooks.renderActiveSurface();
  }
  try {
    return await apiJson('/api/inspector/cancel', {
      method: 'POST',
      body: { reason: cleanReason },
      timeoutMs: 5000,
    });
  } catch {
    return { ok: false, cancelled: false, reason: cleanReason };
  }
}

// ============================================================================
// Safe WE project.json Properties Normalizer & Zero-Eval Condition Parser
// ============================================================================
export function normalizeWeProperties(rawProps) {
  if (!rawProps) return [];
  const entries = Array.isArray(rawProps)
    ? rawProps.map((p, idx) => [p?.key || p?.name || `prop_${idx}`, p])
    : typeof rawProps === 'object'
      ? Object.entries(rawProps)
      : [];

  const list = [];
  for (const [key, prop] of entries) {
    if (!prop || typeof prop !== 'object') continue;
    let label = prop.text ?? prop.label ?? key;
    if (label && typeof label === 'object') {
      label =
        curLocale() === 'zh'
          ? label['zh-chs'] || label['zh-cht'] || label.zh || label['en-us'] || label.en || key
          : label['en-us'] || label.en || label['zh-chs'] || key;
    }
    label = stripHtml(label) || key;
    const type = String(prop.type || 'textinput').toLowerCase();
    const options = Array.isArray(prop.options)
      ? prop.options.map((o) => {
          let oLabel = o?.label ?? o?.text ?? String(o?.value ?? '');
          if (oLabel && typeof oLabel === 'object') {
            oLabel =
              curLocale() === 'zh'
                ? oLabel['zh-chs'] || oLabel['en-us'] || String(o?.value ?? '')
                : oLabel['en-us'] || oLabel['zh-chs'] || String(o?.value ?? '');
          }
          return { label: stripHtml(oLabel), value: o?.value };
        })
      : [];

    list.push({
      key: String(key),
      label,
      type,
      defaultValue: prop.value,
      min: Number.isFinite(Number(prop.min)) ? Number(prop.min) : 0,
      max: Number.isFinite(Number(prop.max)) ? Number(prop.max) : 100,
      step:
        Number.isFinite(Number(prop.step)) && Number(prop.step) > 0
          ? Number(prop.step)
          : prop.fraction
            ? 0.01
            : 1,
      options,
      condition: typeof prop.condition === 'string' ? prop.condition.trim() : '',
      order: Number.isFinite(Number(prop.order)) ? Number(prop.order) : 9999,
    });
  }

  list.sort((a, b) => (a.order !== b.order ? a.order - b.order : a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return list;
}

export function evaluateWeCondition(expr, valuesMap) {
  if (!expr || typeof expr !== 'string') return true;
  const tokens = [];
  const re =
    /\s*(==|!=|<=|>=|&&|\|\||[()!<>]|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|-?\d+(?:\.\d+)?|[A-Za-z0-9_$.]+)\s*/g;
  let m;
  while ((m = re.exec(expr)) !== null) {
    tokens.push(m[1]);
  }
  if (tokens.length === 0) return true;

  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  function resolveAtom(tok) {
    if (tok === undefined) return false;
    if (tok === 'true') return true;
    if (tok === 'false') return false;
    if ((tok.startsWith('"') && tok.endsWith('"')) || (tok.startsWith("'") && tok.endsWith("'"))) {
      return tok.slice(1, -1);
    }
    if (/^-?\d+(?:\.\d+)?$/.test(tok)) return Number(tok);
    const cleanKey = tok.endsWith('.value') ? tok.slice(0, -6) : tok;
    return valuesMap[cleanKey];
  }

  function parsePrimary() {
    const tok = peek();
    if (tok === '(') {
      next();
      const val = parseOr();
      if (peek() === ')') next();
      return val;
    }
    if (tok === '!') {
      next();
      return !parsePrimary();
    }
    return resolveAtom(next());
  }

  function parseCompare() {
    const left = parsePrimary();
    const op = peek();
    if (op === '==' || op === '!=' || op === '<=' || op === '>=' || op === '<' || op === '>') {
      next();
      const right = parsePrimary();
      const lStr = String(left);
      const rStr = String(right);
      const lNum = Number(left);
      const rNum = Number(right);
      const bothNum =
        typeof left !== 'boolean' &&
        typeof right !== 'boolean' &&
        Number.isFinite(lNum) &&
        Number.isFinite(rNum) &&
        lStr !== '' &&
        rStr !== '';
      if (op === '==') return bothNum ? lNum === rNum : left === right || lStr === rStr;
      if (op === '!=') return bothNum ? lNum !== rNum : left !== right && lStr !== rStr;
      if (op === '<') return lNum < rNum;
      if (op === '>') return lNum > rNum;
      if (op === '<=') return lNum <= rNum;
      if (op === '>=') return lNum >= rNum;
    }
    return Boolean(left);
  }

  function parseAnd() {
    let val = parseCompare();
    while (peek() === '&&') {
      next();
      const rhs = parseCompare();
      val = Boolean(val) && Boolean(rhs);
    }
    return val;
  }

  function parseOr() {
    let val = parseAnd();
    while (peek() === '||') {
      next();
      const rhs = parseAnd();
      val = Boolean(val) || Boolean(rhs);
    }
    return val;
  }

  try {
    return Boolean(parseOr());
  } catch {
    return true;
  }
}

// ============================================================================
// Library Model, Queue & State Change Signatures
// ============================================================================
export function computeLibraryModel() {
  const playable = store.items.filter((it) => it && it.kind !== 'application');
  const hiddenSet = new Set(store.config.hiddenIds || []);
  const favSet = new Set(store.config.favorites || []);
  const kindSet = new Set(store.config.typeFilter?.length ? store.config.typeFilter : LIBRARY_KINDS);
  const ratingSet = new Set(
    store.config.contentRatingFilter?.length ? store.config.contentRatingFilter : CONTENT_RATINGS,
  );
  const q = String(store.searchQuery || '').trim().toLowerCase();

  const kindCounts = Object.fromEntries(LIBRARY_KINDS.map((k) => [k, 0]));
  const ratingCounts = Object.fromEntries(CONTENT_RATINGS.map((r) => [r, 0]));
  let favCount = 0;
  let hiddenCount = 0;
  let workshopCount = 0;
  let localCount = 0;

  const visibleItems = [];
  const hiddenItems = [];

  for (const it of playable) {
    if (hiddenSet.has(it.id)) {
      hiddenCount += 1;
      hiddenItems.push(it);
      continue;
    }
    if (favSet.has(it.id)) favCount += 1;
    if (it.source === 'workshop') workshopCount += 1;
    if (it.source === 'upload' || it.source === 'local') localCount += 1;

    const k = LIBRARY_KINDS.includes(it.kind) ? it.kind : 'image';
    const r = CONTENT_RATINGS.includes(it.contentRating) ? it.contentRating : 'unrated';
    kindCounts[k] = (kindCounts[k] || 0) + 1;
    ratingCounts[r] = (ratingCounts[r] || 0) + 1;

    if (store.libScope === 'favorites' && !favSet.has(it.id)) continue;
    if (store.libScope === 'workshop' && it.source !== 'workshop') continue;
    if (store.libScope === 'local' && it.source !== 'upload' && it.source !== 'local') continue;
    if (!kindSet.has(k)) continue;
    if (!ratingSet.has(r)) continue;

    if (q) {
      const hay = `${it.title || ''} ${(it.tags || []).join(' ')} ${it.workshopId || ''} ${it.source || ''} ${it.kind || ''}`.toLowerCase();
      if (!hay.includes(q)) continue;
    }
    visibleItems.push(it);
  }

  return {
    totalPlayable: playable.length,
    visibleItems,
    hiddenItems,
    kindCounts,
    ratingCounts,
    favCount,
    hiddenCount,
    workshopCount,
    localCount,
    favSet,
    hiddenSet,
    kindSet,
    ratingSet,
  };
}

export function computeQuickQueueItems(limit = 4) {
  const hiddenSet = new Set(store.config.hiddenIds || []);
  const playable = store.items.filter((it) => it && it.kind !== 'application' && !hiddenSet.has(it.id));
  if (playable.length === 0) return [];
  const byId = new Map(playable.map((it) => [it.id, it]));
  const activeGroup = (store.config.rotationGroups || []).find((g) => g.id === store.config.rotationGroupId);

  const out = [];
  const pushUnique = (it) => {
    if (it && !out.some((x) => x.id === it.id) && out.length < limit) out.push(it);
  };

  if (activeGroup && Array.isArray(activeGroup.wallpaperIds)) {
    for (const wid of activeGroup.wallpaperIds) {
      pushUnique(byId.get(wid));
    }
  }
  for (const fid of store.config.favorites || []) {
    pushUnique(byId.get(fid));
  }
  const activeId = getActiveId();
  const actIdx = Math.max(0, playable.findIndex((x) => x.id === activeId));
  for (let i = 0; i < playable.length && out.length < limit; i += 1) {
    pushUnique(playable[(actIdx + i) % playable.length]);
  }
  return out;
}

export function externalStateSignature() {
  const c = store.config || {};
  const activeId = getActiveId();
  return JSON.stringify([
    activeId,
    store.activeItem?.mediaUrl || '',
    store.activeItem?.sceneVideoUrl || '',
    store.skinEnabled,
    store.hostStatus?.degradedToPoster || false,
    store.hostStatus?.degradeReason || '',
    c.startupMode,
    c.paused,
    c.muted,
    c.volume,
    c.previewLiveMedia,
    c.libraryAnimatedThumbs,
    c.rotationEnabled,
    c.rotationGroupId,
    c.rotationOrder,
    c.rotationTrigger,
    c.rotationInterval,
    c.preset,
    c.activeProfilePresetId,
    c.layoutMode,
    c.themeMode,
    c.colorScheme,
    c.accentMode,
    c.customAccent,
    c.glassSurfaces,
    c.glassOpacity,
    c.glassBlur,
    c.sidebarOpacity,
    c.sidebarBlur,
    c.regions,
    c.surfaceTints,
    c.topbarStyle,
    c.hideWelcomeLogo,
    c.transparentWindowControls,
    c.cornerStyle,
    c.leftSidebarRadius,
    c.rightSidebarRadius,
    c.sidebarListStyle,
    c.sidebarTypographyMode,
    c.sidebarFontSize,
    c.globalFontSize,
    c.globalFontFamily,
    c.globalFontColor,
    c.islandGap,
    c.workspacePad,
    c.codeReadabilityMode,
    c.contrastFloor,
    c.floaterSolidBase,
    c.borders,
    c.shadows,
    c.scrimOpacity,
    c.scrimColor,
    c.mediaBlur,
    c.vignette,
    c.fxEnabled,
    c.fxClickMode,
    c.fxTrailMode,
    c.pauseOnBlur,
    activeId ? c.perWallpaperOverrides?.[activeId] || null : null,
  ]);
}

export function updateStatusSignature() {
  const u = store.update;
  return JSON.stringify([
    u.checked,
    u.hasUpdate,
    u.currentVersion,
    u.latestVersion,
    u.latestTag,
    u.offline,
    u.checkedAt,
    u.canSelfUpdate,
    u.isGitCheckout,
    u.isSymlink,
    u.error,
  ]);
}
