// Wallpaper Prism Studio UI — Obsidian Prism Style-Settings & Library Deck
// Exclusively owns src/studio-ui/app.mjs. Imports canonical schema & i18n from ../shared/*.

import {
  PLUGIN_VERSION,
  DEFAULT_DEBUG_PORT,
  STARTUP_MODES,
  CANARY_STATES,
  LIBRARY_KINDS,
  CONTENT_RATINGS,
  CORNER_STYLES,
  BORDER_MODES,
  THEME_MODES,
  CODE_READABILITY_MODES,
  FIT_MODES,
  FILTER_PRESETS,
  SWITCH_TRANSITIONS,
  SWITCH_DIRECTIONS,
  SWITCH_SPEEDS,
  SIDEBAR_RADII,
  COLOR_SCHEMES,
  COLOR_SCHEME_IDS,
  ACCENT_MODES,
  ACCENT_PRESETS,
  SCENE_PRESETS,
  SCENE_PRESET_IDS,
  FACTORY_PRESETS,
  DEFAULT_CONFIG,
  PER_WALLPAPER_OVERRIDE_KEYS,
  RESET_SCOPES,
  sanitizeConfig,
  resolveEffectiveConfig,
  resolveSchemeTokens,
  hexToRgbTriplet,
} from '../shared/schema.mjs';

import { t, resolveLocale } from '../shared/i18n.mjs';

function bootPrismStudioApp() {
  const MAX_UPLOAD_BYTES = 512 * 1024 * 1024; // 512 MB

  // Canonical Sidecar + Standalone HTTP Fetch Wrapper
  const rawSidecarFetch = (url, init) =>
    window.sidecar?.fetch ? window.sidecar.fetch(url, init) : window.fetch(url, init);

  async function apiFetch(url, init = {}) {
    if (window.sidecar && typeof window.sidecar.fetch === 'function') {
      return window.sidecar.fetch(url, init);
    }
    const headers = new Headers(init.headers || {});
    try {
      const tok = new URLSearchParams(window.location.search).get('token');
      if (tok && !headers.has('X-Sidecar-Token')) {
        headers.set('X-Sidecar-Token', tok);
      }
    } catch {
      // ignore URL parse issues
    }
    return rawSidecarFetch(url, { ...init, headers });
  }

  async function apiJson(url, options = {}) {
    const init = { ...options };
    if (init.body && typeof init.body === 'object' && !(init.body instanceof Blob) && !(init.body instanceof ArrayBuffer) && !(init.body instanceof Uint8Array)) {
      const headers = new Headers(init.headers || {});
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      init.headers = headers;
      init.body = JSON.stringify(init.body);
    }
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
      throw new Error(msg);
    }
    return data;
  }

  // Extra Studio-specific bilingual labels supplementing shared/i18n.mjs
  const EXTRA_COPY = {
    zh: {
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
    },
    en: {
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
    },
  };

  // Detect initial host luminance polarity
  function detectInitialHostPolarity() {
    if (document.body?.classList?.contains('light')) return 'light';
    if (document.body?.classList?.contains('dark')) return 'dark';
    if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  }

  // Reactive Studio State Store
  const store = {
    ready: false,
    activeTab: 'library', // 'library' | 'skin' | 'playback' | 'system'
    config: sanitizeConfig(DEFAULT_CONFIG),
    skinEnabled: true,
    activeItem: null,
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

    // Slide-over drawers ('playlist' | 'inspector' | 'hidden' | 'fs' | null)
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
    },
    fsBrowser: {
      targetKind: 'uploadDir', // 'uploadDir' | 'cacheDir' | 'addCustomFolder'
      current: '',
      parent: '',
      quickRoots: [],
      entries: [],
      loading: false,
      manualPath: '',
    },

    // 2-step inline confirmation (never window.confirm / alert)
    armedConfirm: null, // { key, timer }
    toasts: [],
  };

  const accentMemCache = new Map();
  let configDebounceTimer = null;
  let configFlushInFlight = false;
  let pendingConfigPatch = {};
  let currentStageMediaSig = '';
  let slideshowTimer = null;
  let statusPollTimer = null;
  let studioEventSource = null;
  let studioLastSseAt = 0;
  let studioSyncPollTimer = null;
  let externalSyncInFlight = false;

  function curLocale() {
    return resolveLocale(store.config.language);
  }

  function tr(key, params = null) {
    return t(key, params, curLocale());
  }

  function trWithFallback(key, zhFallback, enFallback) {
    const val = tr(key);
    if (val && val !== key) return val;
    return curLocale() === 'zh' ? zhFallback : enFallback;
  }

  function getMasterToggleLabel(enabled) {
    return enabled
      ? trWithFallback('topbar.skinToggleOn', '已启用', 'Enabled')
      : trWithFallback('topbar.skinToggleOff', '已禁用', 'Disabled');
  }

  function getMasterToggleHint(enabled) {
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

  function tx(extraKey) {
    const loc = curLocale();
    return EXTRA_COPY[loc]?.[extraKey] ?? EXTRA_COPY.en[extraKey] ?? extraKey;
  }

  function esc(val) {
    return String(val ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatBytes(bytes) {
    const n = Number(bytes);
    if (!Number.isFinite(n) || n <= 0) return '';
    if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
    return `${(n / (1024 * 1024)).toFixed(n >= 100 * 1024 * 1024 ? 0 : 1)} MB`;
  }

  function showToast(message, tone = 'info', durationMs = 3600) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    store.toasts.push({ id, message: String(message), tone });
    if (store.toasts.length > 4) store.toasts.shift();
    renderToastStack();
    setTimeout(() => {
      store.toasts = store.toasts.filter((x) => x.id !== id);
      renderToastStack();
    }, durationMs);
  }

  function setArmedConfirm(key) {
    if (store.armedConfirm?.timer) {
      clearTimeout(store.armedConfirm.timer);
    }
    if (!key) {
      store.armedConfirm = null;
      renderActiveSurface();
      return;
    }
    const timer = setTimeout(() => {
      if (store.armedConfirm?.key === key) {
        store.armedConfirm = null;
        renderActiveSurface();
      }
    }, 6000);
    store.armedConfirm = { key, timer };
    renderActiveSurface();
  }

  function getActiveId() {
    return store.activeItem?.id || store.config.activeWallpaperId || store.config.wallpaperId || '';
  }

  function getEffectiveConfig() {
    return resolveEffectiveConfig(store.config, getActiveId());
  }

  function getResolvedPolarity(eff = getEffectiveConfig()) {
    if (eff.themeMode === 'light') return 'light';
    if (eff.themeMode === 'dark') return 'dark';
    return store.hostPolarity === 'light' ? 'light' : 'dark';
  }

  function hasPerWallpaperPin(wallpaperId = getActiveId()) {
    if (!wallpaperId) return false;
    const ov = store.config.perWallpaperOverrides?.[wallpaperId];
    return Boolean(ov && typeof ov === 'object' && Object.keys(ov).length > 0);
  }

  function isHostAttached(hs = store.hostStatus) {
    if (!hs || typeof hs !== 'object') return false;
    return Boolean(
      hs.phase === 'attached' ||
        Number(hs.attachedCount) > 0 ||
        hs.attached === true ||
        hs.cdpConnected === true,
    );
  }

  function resolvePreviewVideoUrl(item) {
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

  // ==========================================================================
  // < 16ms Zero-Reflow CSS Custom Property & Mini-Preview Sync
  // ==========================================================================
  function syncOpticalCssVars() {
    const eff = getEffectiveConfig();
    const polarity = getResolvedPolarity(eff);
    const tokens = resolveSchemeTokens(eff, polarity);
    const root = document.documentElement;

    root.dataset.prismTheme = polarity;
    root.dataset.prismScheme = eff.colorScheme;
    root.dataset.prismCorners = eff.cornerStyle;
    root.lang = curLocale() === 'en' ? 'en' : 'zh-CN';

    root.style.setProperty('--prism-accent', tokens.accent);
    root.style.setProperty('--prism-accent-rgb', tokens.accentRgb);
    root.style.setProperty('--prism-accent-fg', tokens.accentFg);
    root.style.setProperty('--prism-wall-tint-rgb', tokens.wallTintRgb);
    root.style.setProperty('--prism-wall-tint-mix', `${Math.round((eff.wallTintMix || 0) * 1000) / 10}%`);

    const stage = document.getElementById('prism-mini-stage');
    const hub = document.getElementById('prism-mini-hub');
    if (!stage || !hub) return;

    const fitCss = eff.fit === 'center' ? 'none' : eff.fit;
    const totalScale = ((eff.layerScale || 100) / 100) * (eff.mediaBlur > 0 ? 1.04 : 1);
    const scrimCol = eff.scrimColor && eff.scrimColor !== 'auto' ? eff.scrimColor : `rgb(${tokens.shadeRgb})`;
    const scrimAlpha = polarity === 'light' && (!eff.scrimColor || eff.scrimColor === 'auto') && eff.scrimOpacity > 0
      ? Math.min(0.94, 0.16 + eff.scrimOpacity * 0.78)
      : eff.scrimOpacity;

    const vigBg = polarity === 'light'
      ? 'radial-gradient(ellipse 58% 66% at 50% 48%, rgba(255,255,255,0.40) 0%, rgba(244,247,251,0.22) 60%, rgba(232,238,246,0.52) 100%)'
      : 'radial-gradient(ellipse 58% 66% at 50% 48%, rgba(9,9,11,0.06) 0%, rgba(9,9,11,0.30) 60%, rgba(9,9,11,0.64) 100%)';

    let extraFilter = '';
    if (eff.filterPreset === 'grayscale') extraFilter = ' grayscale(100%)';
    else if (eff.filterPreset === 'sepia') extraFilter = ' sepia(65%)';
    else if (eff.filterPreset === 'vivid') extraFilter = ' saturate(135%) contrast(108%)';
    else if (eff.filterPreset === 'warm') extraFilter = ' sepia(22%) saturate(118%)';
    else if (eff.filterPreset === 'cool') extraFilter = ' hue-rotate(12deg) saturate(110%)';
    else if (eff.filterPreset === 'darken') extraFilter = ' brightness(80%)';
    else if (eff.filterPreset === 'brighten') extraFilter = ' brightness(118%)';
    else if (eff.filterPreset === 'contrast') extraFilter = ' contrast(125%)';

    stage.style.setProperty('--sim-fit', fitCss);
    stage.style.setProperty('--sim-pos', `${eff.layerPosX}% ${eff.layerPosY}%`);
    stage.style.setProperty('--sim-media-opacity', String(eff.mediaOpacity));
    stage.style.setProperty('--sim-media-blur', `${Math.round(eff.mediaBlur * 0.45 * 10) / 10}px`);
    stage.style.setProperty('--sim-media-brightness', `${eff.mediaBrightness}%`);
    stage.style.setProperty('--sim-media-contrast', `${eff.mediaContrast}%`);
    stage.style.setProperty('--sim-media-saturate', `${eff.mediaSaturate}%`);
    stage.style.setProperty('--sim-scale-total', totalScale.toFixed(3));
    stage.style.setProperty('--sim-flip', eff.flip ? '-1' : '1');
    stage.style.setProperty('--sim-scrim-color', scrimCol);
    stage.style.setProperty('--sim-scrim-opacity', scrimAlpha.toFixed(3));
    stage.style.setProperty('--sim-vignette-bg', vigBg);
    stage.style.setProperty('--sim-vignette-opacity', eff.vignette ? (polarity === 'light' ? '0.36' : '0.44') : '0');
    stage.style.setProperty('--sim-grain-alpha', String(eff.grainAlpha));

    const mediaEl = stage.querySelector('.mini-media-el');
    if (mediaEl) {
      mediaEl.style.filter = `blur(var(--sim-media-blur, 0px)) brightness(var(--sim-media-brightness, 100%)) contrast(var(--sim-media-contrast, 100%)) saturate(var(--sim-media-saturate, 105%))${extraFilter}`;
      if (mediaEl.tagName === 'VIDEO') {
        if (Math.abs(mediaEl.playbackRate - (eff.playbackRate || 1)) > 0.02) {
          mediaEl.playbackRate = eff.playbackRate || 1;
        }
        if ((eff.paused || document.hidden) && !mediaEl.paused) {
          mediaEl.pause();
        } else if (!eff.paused && !document.hidden && mediaEl.paused) {
          mediaEl.play().catch(() => {});
        }
      }
    }

    // Simulated Workbench Islands Geometry & Glass Hierarchy
    const isIslands = eff.layoutMode === 'islands';
    hub.dataset.layout = eff.layoutMode;
    const baseR = eff.cornerStyle === 'sharp' ? 4 : eff.cornerStyle === 'soft' ? 12 : 8;
    const mapSidebarR = (raw) => {
      if (!isIslands) return '0px';
      if (raw === 'auto' || raw === 'native') return `${baseR}px`;
      const n = Number(raw);
      return Number.isFinite(n) ? `${Math.round(n * 0.65)}px` : `${baseR}px`;
    };

    const g = eff.glassSurfaces ? eff.glassOpacity : 0.96;
    const blurPx = eff.glassSurfaces ? Math.round(eff.glassBlur * 0.6) : 0;
    const fidBoost = (eff.glassFidelity / 100) * 0.14;
    const chatBoost = (eff.chatGlassFidelity / 100) * 0.14;

    const rgbSum = (trip) =>
      String(trip || '0, 0, 0')
        .split(',')
        .reduce((acc, s) => acc + (Number(s.trim()) || 0), 0);
    const sbBaseRgb =
      polarity !== 'light' && rgbSum(tokens.shadeRgb) > rgbSum(tokens.baseRgb)
        ? tokens.baseRgb
        : tokens.shadeRgb;
    const rawSbOp = eff.sidebarOpacity !== null && eff.sidebarOpacity !== undefined ? eff.sidebarOpacity : eff.glassOpacity;
    const sidebarAlpha = eff.glassSurfaces ? Math.min(0.98, Math.max(0.20, rawSbOp)) : 0.96;
    const sbBlurPx = eff.glassSurfaces ? Math.round(((eff.sidebarBlur !== null && eff.sidebarBlur !== undefined ? eff.sidebarBlur : eff.glassBlur)) * 0.6) : 0;
    const chatAlpha = Math.min(0.95, g * (polarity === 'light' ? 0.60 : 0.38) + chatBoost);
    const composerAlpha = Math.min(0.99, g * 0.92 + fidBoost * 0.3);

    const floorAlpha = eff.contrastFloor ? (polarity === 'light' ? 0.84 : 0.72) : 0.44;
    let editorBg = `rgba(${tokens.tint1Rgb}, ${Math.max(floorAlpha, g * 0.78).toFixed(3)})`;
    let codeBlur = 'none';
    if (eff.codeReadabilityMode === 'solid') {
      editorBg = `rgb(${tokens.tint1Rgb})`;
    } else if (eff.codeReadabilityMode === 'frosted') {
      editorBg = `rgba(${tokens.tint1Rgb}, ${Math.max(floorAlpha, g * 0.85).toFixed(3)})`;
      codeBlur = `blur(${Math.max(4, blurPx)}px)`;
    }

    const borderCss = eff.borders === 'off'
      ? '1px solid transparent'
      : eff.borders === 'subtle'
        ? `1px solid rgba(${tokens.ptRgb}, 0.06)`
        : `1px solid rgba(${tokens.ptRgb}, 0.14)`;

    const shadowCss = isIslands && eff.shadows
      ? `inset 0 1px 0 ${polarity === 'light' ? 'rgba(255,255,255,0.86)' : 'rgba(255,255,255,0.09)'}, 0 6px 16px rgba(0,0,0,${polarity === 'light' ? '0.12' : '0.38'})`
      : 'none';

    hub.style.setProperty('--sim-pad', isIslands ? `${Math.max(2, Math.round(eff.workspacePad * 0.75))}px` : '0px');
    hub.style.setProperty('--sim-gap', isIslands ? `${Math.max(0, Math.round(eff.islandGap * 0.75))}px` : '0px');
    hub.style.setProperty('--sim-r-island', isIslands ? `${baseR}px` : '0px');
    hub.style.setProperty('--sim-r-left', mapSidebarR(eff.leftSidebarRadius));
    hub.style.setProperty('--sim-r-right', mapSidebarR(eff.rightSidebarRadius));
    hub.style.setProperty('--sim-r-card', `${Math.max(3, baseR - 3)}px`);
    hub.style.setProperty('--sim-sidebar-bg', `rgba(${sbBaseRgb}, ${sidebarAlpha.toFixed(3)})`);
    hub.style.setProperty('--sim-sidebar-blur', `${sbBlurPx}px`);
    hub.style.setProperty('--sim-chat-bg', `rgba(${tokens.baseRgb}, ${chatAlpha.toFixed(3)})`);
    hub.style.setProperty('--sim-editor-bg', editorBg);
    hub.style.setProperty('--sim-code-blur', codeBlur);
    hub.style.setProperty('--sim-composer-bg', `rgba(${tokens.tint1Rgb}, ${composerAlpha.toFixed(3)})`);
    hub.style.setProperty('--sim-blur', `${blurPx}px`);
    hub.style.setProperty('--sim-blur-lg', `${Math.round(blurPx * 1.25)}px`);
    hub.style.setProperty('--sim-border', borderCss);
    hub.style.setProperty('--sim-shadow', shadowCss);
    hub.style.setProperty('--sim-caret', eff.caretColor || tokens.accent);

    const hudLayout = document.getElementById('mini-hud-layout');
    const hudAccent = document.getElementById('mini-hud-accent');
    if (hudLayout) {
      hudLayout.textContent = isIslands ? `ISLANDS · ${eff.islandGap}px` : 'FLUSH';
    }
    if (hudAccent) {
      hudAccent.textContent = `${eff.colorScheme.toUpperCase()} · ${tokens.accent.toUpperCase()}`;
    }
  }

  function releaseExistingPreviewVideo(wrap) {
    const oldVid = wrap?.querySelector('video');
    if (oldVid) {
      try {
        oldVid.pause();
        oldVid.removeAttribute('src');
        oldVid.load();
      } catch {
        // ignore decoder teardown issues
      }
      oldVid.remove();
    }
  }

  // Mount or update the media node inside the 21:9 mini-preview without flicker or resetting active video
  function syncMiniPreviewMedia() {
    const wrap = document.getElementById('mini-media-layer');
    if (!wrap) return;
    const item = store.activeItem || store.items.find((x) => x.id === getActiveId()) || null;
    const videoUrl = resolvePreviewVideoUrl(item);
    const eff = getEffectiveConfig();

    if (item?.schemeColor) {
      const col = weColorToHex(item.schemeColor);
      if (col) {
        wrap.style.background = `radial-gradient(circle at 30% 35%, ${col}88, transparent 60%), linear-gradient(135deg, ${col}44, #0a0c14)`;
      }
    }

    // Persistent <video> fast path: never recreate or reset src when URL is unchanged!
    if (videoUrl) {
      const existingVid = wrap.querySelector('video#prism-preview-video');
      if (existingVid && existingVid.dataset.mediaSrc === videoUrl) {
        syncOpticalCssVars();
        maybeExtractWallpaperAccent(item);
        return;
      }

      if (slideshowTimer) {
        clearInterval(slideshowTimer);
        slideshowTimer = null;
      }
      releaseExistingPreviewVideo(wrap);
      wrap.innerHTML = '';
      currentStageMediaSig = `video|${item.id}|${videoUrl}`;

      let posterImg = null;
      if (item.thumbUrl) {
        posterImg = document.createElement('img');
        posterImg.className = 'mini-poster-overlay';
        posterImg.alt = '';
        posterImg.onerror = () => posterImg.remove();
        posterImg.src = item.thumbUrl;
        wrap.appendChild(posterImg);
      }

      const vid = document.createElement('video');
      vid.id = 'prism-preview-video';
      vid.className = 'mini-media-el';
      // Mandatory Chromium muted-autoplay properties set BEFORE assigning src
      vid.defaultMuted = true;
      vid.muted = true;
      vid.playsInline = true;
      vid.autoplay = true;
      vid.loop = true;
      vid.preload = 'auto';
      vid.setAttribute('muted', '');
      vid.setAttribute('playsinline', '');
      vid.setAttribute('autoplay', '');
      vid.setAttribute('loop', '');
      vid.playbackRate = eff.playbackRate || 1;
      vid.dataset.mediaSrc = videoUrl;

      const hidePoster = () => {
        if (posterImg) posterImg.classList.add('is-hidden');
      };
      const ensurePlaying = () => {
        if (!getEffectiveConfig().paused && !document.hidden && vid.paused) {
          vid.play().catch(() => {});
        }
      };

      vid.addEventListener('loadedmetadata', ensurePlaying);
      vid.addEventListener('canplay', ensurePlaying);
      vid.addEventListener('loadeddata', hidePoster);
      vid.addEventListener('playing', hidePoster);
      vid.addEventListener('timeupdate', () => {
        if (vid.__effectiveEnd > 0 && !vid.seeking && vid.currentTime >= vid.__effectiveEnd) {
          vid.currentTime = 0;
          ensurePlaying();
        }
      });

      wrap.appendChild(vid);
      vid.src = videoUrl;
      ensurePlaying();

      syncOpticalCssVars();
      maybeExtractWallpaperAccent(item);
      return;
    }

    const sig = item ? `${item.id}|${item.kind}|${item.mediaUrl || ''}|${item.thumbUrl || ''}|${item.slidesUrl || ''}` : 'none';
    if (sig === currentStageMediaSig && wrap.children.length > 0) {
      syncOpticalCssVars();
      return;
    }
    currentStageMediaSig = sig;
    if (slideshowTimer) {
      clearInterval(slideshowTimer);
      slideshowTimer = null;
    }
    releaseExistingPreviewVideo(wrap);
    wrap.innerHTML = '';

    if (!item) {
      syncOpticalCssVars();
      return;
    }

    if (item.kind === 'slideshow' && (item.slidesUrl || Array.isArray(item.slides))) {
      const img = document.createElement('img');
      img.className = 'mini-media-el';
      img.alt = item.title || 'Slideshow';
      img.src = item.slides?.[0] || item.thumbUrl || item.mediaUrl || '';
      wrap.appendChild(img);
      const startCycle = (urls, intervalSec) => {
        if (urls.length > 0) {
          let idx = 0;
          img.src = urls[0];
          if (urls.length > 1) {
            const sec = Math.max(4, eff.pictureSlideSeconds || intervalSec || 12);
            slideshowTimer = setInterval(() => {
              if (getEffectiveConfig().paused || document.hidden) return;
              idx = (idx + 1) % urls.length;
              img.src = urls[idx];
            }, sec * 1000);
          }
        }
      };
      if (Array.isArray(item.slides) && item.slides.length > 0) {
        startCycle(item.slides, Math.round((item.slideIntervalMs || 12000) / 1000));
      } else if (item.slidesUrl) {
        const reqId = item.id;
        apiJson(item.slidesUrl)
          .then((manifest) => {
            if (getActiveId() !== reqId) return;
            const urls = Array.isArray(manifest?.slides)
              ? manifest.slides.map((s) => (typeof s === 'string' ? s : s?.url)).filter(Boolean)
              : [];
            startCycle(urls, manifest?.intervalSec || 12);
          })
          .catch(() => {});
      }
    } else {
      const src = (item.kind === 'image' ? item.mediaUrl || item.thumbUrl : item.thumbUrl || item.mediaUrl) || '';
      if (src) {
        const img = document.createElement('img');
        img.className = 'mini-media-el';
        img.alt = item.title || 'Wallpaper';
        img.onerror = () => img.remove();
        img.src = src;
        wrap.appendChild(img);
      }
    }

    syncOpticalCssVars();
    maybeExtractWallpaperAccent(item);
  }

  // ==========================================================================
  // 32x32 Offscreen Canvas Chroma-Weighted Histogram Accent Extractor
  // ==========================================================================
  function rgbToHsl(r, g, b) {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = 0;
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    else if (max === gn) h = ((bn - rn) / d + 2) / 6;
    else h = ((rn - gn) / d + 4) / 6;
    return [h * 360, s, l];
  }

  function hslToRgb(h, s, l) {
    const hn = (((h % 360) + 360) % 360) / 360;
    if (s === 0) {
      const v = Math.round(l * 255);
      return [v, v, v];
    }
    const hue2rgb = (p, q, tVal) => {
      let tt = tVal;
      if (tt < 0) tt += 1;
      if (tt > 1) tt -= 1;
      if (tt < 1 / 6) return p + (q - p) * 6 * tt;
      if (tt < 1 / 2) return q;
      if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return [
      Math.round(hue2rgb(p, q, hn + 1 / 3) * 255),
      Math.round(hue2rgb(p, q, hn) * 255),
      Math.round(hue2rgb(p, q, hn - 1 / 3) * 255),
    ];
  }

  function rgbToHex(r, g, b) {
    const hex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
    return `#${hex(r)}${hex(g)}${hex(b)}`;
  }

  function weColorToHex(raw) {
    if (!raw || typeof raw !== 'string') return '';
    const trimmed = raw.trim();
    if (/^#[0-9a-f]{3,6}$/i.test(trimmed)) return trimmed;
    const parts = trimmed.split(/[\s,]+/).map(Number);
    if (parts.length >= 3 && parts.every((n) => Number.isFinite(n))) {
      const isNormalized = parts[0] <= 1 && parts[1] <= 1 && parts[2] <= 1;
      const scale = isNormalized ? 255 : 1;
      return rgbToHex(parts[0] * scale, parts[1] * scale, parts[2] * scale);
    }
    return '';
  }

  function hexToWeColor(hex) {
    const trip = hexToRgbTriplet(hex, '102, 157, 246').split(',').map((s) => Number(s.trim()));
    return trip.map((v) => (v / 255).toFixed(4)).join(' ');
  }

  function computeHistogramAccentFromImageData(data, wallpaperId) {
    const buckets = Array.from({ length: 24 }, () => ({ w: 0, hSin: 0, hCos: 0, sSum: 0 }));
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 128) continue;
      const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
      if (l < 0.12 || l > 0.90 || s < 0.16) continue;
      const weight = s * Math.max(0.05, 1 - Math.abs(l - 0.5) * 1.4);
      const bIdx = Math.min(23, Math.floor(h / 15));
      const rad = (h * Math.PI) / 180;
      buckets[bIdx].w += weight;
      buckets[bIdx].hSin += Math.sin(rad) * weight;
      buckets[bIdx].hCos += Math.cos(rad) * weight;
      buckets[bIdx].sSum += s * weight;
    }

    let best = buckets[0];
    for (const b of buckets) {
      if (b.w > best.w) best = b;
    }

    if (best.w <= 0.01) {
      return {
        wallpaperId,
        darkHex: '#D4D7E0',
        lightHex: '#475569',
        tintRgb: '148, 163, 184',
      };
    }

    let winH = (Math.atan2(best.hSin, best.hCos) * 180) / Math.PI;
    if (winH < 0) winH += 360;
    const avgS = Math.min(0.84, Math.max(0.52, best.sSum / best.w));
    const [dr, dg, db] = hslToRgb(winH, avgS, 0.68);
    const [lr, lg, lb] = hslToRgb(winH, avgS, 0.44);
    const [trR, trG, trB] = hslToRgb(winH, 0.45, 0.50);

    return {
      wallpaperId,
      darkHex: rgbToHex(dr, dg, db),
      lightHex: rgbToHex(lr, lg, lb),
      tintRgb: `${trR}, ${trG}, ${trB}`,
    };
  }

  function syncExtractedSwatchesInDom() {
    const html = renderExtractedSwatchesHtml();
    const readout = document.getElementById('prism-extracted-readout');
    if (readout) readout.innerHTML = html;
    const railChips = document.getElementById('rail-extracted-chips');
    if (railChips) railChips.innerHTML = html;
  }

  function applyExtractedAccentResult(extracted, persistToServer = true) {
    if (!extracted || !extracted.wallpaperId) return;
    accentMemCache.set(extracted.wallpaperId, extracted);
    if (extracted.wallpaperId !== getActiveId()) return;
    const cur = store.config.extractedAccent;
    const alreadyInCache = Boolean(store.config.accentCache?.[extracted.wallpaperId]?.darkHex === extracted.darkHex);
    if (cur && cur.wallpaperId === extracted.wallpaperId && cur.darkHex === extracted.darkHex) {
      syncExtractedSwatchesInDom();
      return;
    }
    const nextCache = { ...(store.config.accentCache || {}), [extracted.wallpaperId]: extracted };
    store.config = sanitizeConfig({ extractedAccent: extracted, accentCache: nextCache }, store.config);
    syncOpticalCssVars();
    syncExtractedSwatchesInDom();
    if (persistToServer && !alreadyInCache) {
      queueConfigPatch({ extractedAccent: extracted, accentCache: nextCache }, false, false);
    } else if (persistToServer) {
      queueConfigPatch({ extractedAccent: extracted }, false, false);
    }
  }

  function maybeExtractWallpaperAccent(item) {
    if (!item || !item.id) return;
    const curExt = store.config.extractedAccent;
    if (curExt && curExt.wallpaperId === item.id && curExt.darkHex) {
      accentMemCache.set(item.id, curExt);
      syncExtractedSwatchesInDom();
      return;
    }
    const cached = accentMemCache.get(item.id) || store.config.accentCache?.[item.id];
    if (cached && cached.darkHex) {
      applyExtractedAccentResult({ ...cached, wallpaperId: item.id }, !store.config.accentCache?.[item.id]);
      return;
    }
    const srcUrl = item.thumbUrl || (item.kind === 'image' ? item.mediaUrl : '');
    if (!srcUrl) {
      const fallbackHex = weColorToHex(item.schemeColor);
      if (fallbackHex) {
        const trip = hexToRgbTriplet(fallbackHex).split(',').map((s) => Number(s.trim()));
        const [h, s] = rgbToHsl(trip[0], trip[1], trip[2]);
        const sat = Math.min(0.84, Math.max(0.52, s || 0.6));
        const [dr, dg, db] = hslToRgb(h, sat, 0.68);
        const [lr, lg, lb] = hslToRgb(h, sat, 0.44);
        const [trR, trG, trB] = hslToRgb(h, 0.45, 0.50);
        applyExtractedAccentResult({
          wallpaperId: item.id,
          darkHex: rgbToHex(dr, dg, db),
          lightHex: rgbToHex(lr, lg, lb),
          tintRgb: `${trR}, ${trG}, ${trB}`,
        });
      }
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const cvs = document.createElement('canvas');
        cvs.width = 32;
        cvs.height = 32;
        const ctx = cvs.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 32, 32);
        const imgData = ctx.getImageData(0, 0, 32, 32).data;
        const extracted = computeHistogramAccentFromImageData(imgData, item.id);
        applyExtractedAccentResult(extracted);
      } catch {
        // Ignore CORS-tainted canvas if external URL
      }
    };
    img.src = srcUrl;
  }

  // ==========================================================================
  // Server State Ingestion & Debounced Config Mutation
  // ==========================================================================
  function ingestServerState(payload) {
    if (!payload || typeof payload !== 'object') return;
    const s = payload.state && typeof payload.state === 'object' ? payload.state : payload;

    if (s.config && typeof s.config === 'object') {
      store.config = sanitizeConfig(s.config, store.config);
    }
    if (typeof s.skinEnabled === 'boolean') {
      store.skinEnabled = s.skinEnabled;
      store.config = sanitizeConfig({ skinEnabled: s.skinEnabled }, store.config);
    } else {
      store.skinEnabled = Boolean(store.config.skinEnabled);
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
      const nextState = CANARY_STATES.includes(canarySrc.state) ? canarySrc.state : (store.canary.state || 'idle');
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
    const autoSrc = (s.autostart && typeof s.autostart === 'object' ? s.autostart : null) || {};
    const hsSrc = (s.hostStatus && typeof s.hostStatus === 'object' ? s.hostStatus : null) || {};
    if (
      'normalShortcutEnabled' in s ||
      'normalShortcutEnabled' in autoSrc ||
      'normalShortcutEnabled' in hsSrc
    ) {
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
    if (typeof s.pid === 'number') store.pid = s.pid;
    if (typeof s.version === 'string') store.version = s.version;
  }

  function buildConfigPatchForKey(patch) {
    const activeId = getActiveId();
    if (!activeId || !hasPerWallpaperPin(activeId)) {
      return patch;
    }
    const globalPart = {};
    const ovPart = { ...(store.config.perWallpaperOverrides?.[activeId] || {}) };
    let touchedOv = false;
    for (const [k, v] of Object.entries(patch)) {
      if (PER_WALLPAPER_OVERRIDE_KEYS.includes(k)) {
        ovPart[k] = v;
        touchedOv = true;
      } else {
        globalPart[k] = v;
      }
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

  function applyLocalPatch(rawPatch, routeThroughPin = true) {
    const patch = routeThroughPin ? buildConfigPatchForKey(rawPatch) : rawPatch;
    store.config = sanitizeConfig(patch, store.config);
    if ('skinEnabled' in patch) store.skinEnabled = Boolean(patch.skinEnabled);
    syncOpticalCssVars();
    return patch;
  }

  function queueConfigPatch(rawPatch, immediate = false, routeThroughPin = true) {
    const patch = applyLocalPatch(rawPatch, routeThroughPin);
    pendingConfigPatch = { ...pendingConfigPatch, ...patch };
    if (configDebounceTimer) {
      clearTimeout(configDebounceTimer);
      configDebounceTimer = null;
    }
    if (immediate) {
      flushConfigPatch();
    } else {
      configDebounceTimer = setTimeout(flushConfigPatch, 140);
    }
  }

  async function flushConfigPatch() {
    if (configDebounceTimer) {
      clearTimeout(configDebounceTimer);
      configDebounceTimer = null;
    }
    const patch = pendingConfigPatch;
    pendingConfigPatch = {};
    if (!patch || Object.keys(patch).length === 0) return;
    configFlushInFlight = true;
    try {
      const res = await apiJson('/api/config', { method: 'POST', body: { patch } });
      ingestServerState(res);
      syncOpticalCssVars();
      updateTopStatusIndicators();
    } catch (err) {
      showToast(err.message || 'Failed to save config', 'danger');
    } finally {
      configFlushInFlight = false;
    }
  }

  // ==========================================================================
  // Safe WE project.json Properties Normalizer & Condition Evaluator
  // ==========================================================================
  function stripHtml(str) {
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

  function normalizeWeProperties(rawProps) {
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
        label = curLocale() === 'zh'
          ? (label['zh-chs'] || label['zh-cht'] || label.zh || label['en-us'] || label.en || key)
          : (label['en-us'] || label.en || label['zh-chs'] || key);
      }
      label = stripHtml(label) || key;
      const type = String(prop.type || 'textinput').toLowerCase();
      const options = Array.isArray(prop.options)
        ? prop.options.map((o) => {
            let oLabel = o?.label ?? o?.text ?? String(o?.value ?? '');
            if (oLabel && typeof oLabel === 'object') {
              oLabel = curLocale() === 'zh'
                ? (oLabel['zh-chs'] || oLabel['en-us'] || String(o?.value ?? ''))
                : (oLabel['en-us'] || oLabel['zh-chs'] || String(o?.value ?? ''));
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
        step: Number.isFinite(Number(prop.step)) && Number(prop.step) > 0
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

  // Zero-eval safe boolean condition parser for WE `condition` expressions
  function evaluateWeCondition(expr, valuesMap) {
    if (!expr || typeof expr !== 'string') return true;
    const tokens = [];
    const re = /\s*(==|!=|<=|>=|&&|\|\||[()!<>]|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|-?\d+(?:\.\d+)?|[A-Za-z0-9_$.]+)\s*/g;
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
      let left = parsePrimary();
      const op = peek();
      if (op === '==' || op === '!=' || op === '<=' || op === '>=' || op === '<' || op === '>') {
        next();
        const right = parsePrimary();
        // Loose numeric/string comparison matching WE behavior
        const lStr = String(left);
        const rStr = String(right);
        const lNum = Number(left);
        const rNum = Number(right);
        const bothNum = typeof left !== 'boolean' && typeof right !== 'boolean' && Number.isFinite(lNum) && Number.isFinite(rNum) && lStr !== '' && rStr !== '';
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

  // ==========================================================================
  // Library Filtering, Counts & Virtualized Window Calculation
  // ==========================================================================
  function computeLibraryModel() {
    const playable = store.items.filter((it) => it && it.kind !== 'application');
    const hiddenSet = new Set(store.config.hiddenIds || []);
    const favSet = new Set(store.config.favorites || []);
    const kindSet = new Set(store.config.typeFilter?.length ? store.config.typeFilter : LIBRARY_KINDS);
    const ratingSet = new Set(store.config.contentRatingFilter?.length ? store.config.contentRatingFilter : CONTENT_RATINGS);
    const q = store.searchQuery.trim().toLowerCase();

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
        hiddenCount++;
        hiddenItems.push(it);
        continue;
      }
      if (favSet.has(it.id)) favCount++;
      if (it.source === 'workshop') workshopCount++;
      if (it.source === 'upload' || it.source === 'local') localCount++;

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

  function computeVirtualSlice(totalCount) {
    if (totalCount <= 120) {
      return { start: 0, end: totalCount, padTop: 0, padBottom: 0 };
    }
    const scroller = document.getElementById('prism-tab-scroll');
    const viewW = scroller ? scroller.clientWidth - 28 : window.innerWidth - 32;
    const isWide = window.innerWidth >= 840;
    const cols = isWide ? Math.max(2, Math.floor((viewW + 11) / 206)) : window.innerWidth >= 480 ? 3 : 2;
    const isCompact = store.config.pickerLayout === 'fixed';
    const rowH = isCompact ? 136 : Math.round((viewW / cols) * 0.625) + 46;
    const totalRows = Math.ceil(totalCount / cols);
    const scrollTop = scroller ? Math.max(0, scroller.scrollTop - 160) : 0;
    const viewH = scroller ? scroller.clientHeight : 720;

    const firstRow = Math.max(0, Math.floor(scrollTop / rowH) - 3);
    const visibleRows = Math.ceil(viewH / rowH) + 6;
    const lastRow = Math.min(totalRows, firstRow + visibleRows);

    return {
      start: firstRow * cols,
      end: Math.min(totalCount, lastRow * cols),
      padTop: firstRow * rowH,
      padBottom: Math.max(0, (totalRows - lastRow) * rowH),
    };
  }

  // ==========================================================================
  // Reusable Tactile Control Renderers
  // ==========================================================================
  function sliderMeta(val, min, max, decimals = 0, suffix = '') {
    const pct = max > min ? Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100)) : 0;
    const numTxt = decimals > 0 ? Number(val).toFixed(decimals) : String(Math.round(Number(val)));
    return { pct: pct.toFixed(1), display: `${numTxt}${suffix}` };
  }

  function renderSliderRow({
    key,
    label,
    value,
    defaultValue,
    min,
    max,
    step = 1,
    scale = 1,
    decimals = 0,
    suffix = '',
    dblResetFraming = false,
    nullableFallbackKey = '',
    fallbackValue = null,
  }) {
    const uiMin = min * scale;
    const uiMax = max * scale;
    const uiStep = step * scale;
    if (nullableFallbackKey) {
      const isAuto = value === null || value === undefined;
      const resolvedVal = isAuto ? Number(fallbackValue) : Number(value);
      const uiVal = resolvedVal * scale;
      const isDirty = isAuto ? false : true;
      const { pct, display: rawDisplay } = sliderMeta(uiVal, uiMin, uiMax, decimals, suffix);
      const display = isAuto ? tr('glass.followMainFmt', { val: rawDisplay }) : rawDisplay;

      return `
      <div class="prism-slider-row" data-slider-key="${esc(key)}" data-dirty="${isDirty ? 'true' : 'false'}"
           data-nullable="true" data-fallback-key="${esc(nullableFallbackKey)}"
           data-scale="${scale}" data-min="${uiMin}" data-max="${uiMax}" data-step="${uiStep}"
           data-decimals="${decimals}" data-suffix="${esc(suffix)}" data-default="${Number(defaultValue)}">
        <span class="prism-slider-label" ${dblResetFraming ? `data-dblreset="true" title="${esc(tx('dblClickFramingHint'))}"` : ''}>${esc(label)}</span>
        <span class="prism-slider-val" data-action="edit-slider-val" title="Click to enter exact value">${esc(display)}</span>
        <button type="button" class="prism-reset-btn" data-action="reset-key" data-key="${esc(key)}" title="${esc(tr('common.reset'))}">↺</button>
        <input type="range" class="prism-range" data-config-slider="${esc(key)}"
               min="${uiMin}" max="${uiMax}" step="${uiStep}" value="${uiVal}"
               style="--prism-pct:${pct}%" />
      </div>
    `;
    }

    const uiVal = Number(value) * scale;
    const uiDef = Number(defaultValue) * scale;
    const isDirty = Math.abs(uiVal - uiDef) > uiStep * 0.25;
    const { pct, display } = sliderMeta(uiVal, uiMin, uiMax, decimals, suffix);

    return `
      <div class="prism-slider-row" data-slider-key="${esc(key)}" data-dirty="${isDirty ? 'true' : 'false'}"
           data-scale="${scale}" data-min="${uiMin}" data-max="${uiMax}" data-step="${uiStep}"
           data-decimals="${decimals}" data-suffix="${esc(suffix)}" data-default="${Number(defaultValue)}">
        <span class="prism-slider-label" ${dblResetFraming ? `data-dblreset="true" title="${esc(tx('dblClickFramingHint'))}"` : ''}>${esc(label)}</span>
        <span class="prism-slider-val" data-action="edit-slider-val" title="Click to enter exact value">${esc(display)}</span>
        <button type="button" class="prism-reset-btn" data-action="reset-key" data-key="${esc(key)}" title="${esc(tr('common.reset'))}">↺</button>
        <input type="range" class="prism-range" data-config-slider="${esc(key)}"
               min="${uiMin}" max="${uiMax}" step="${uiStep}" value="${uiVal}"
               style="--prism-pct:${pct}%" />
      </div>
    `;
  }

  function renderSwitchRow({ key, label, hint = '', checked }) {
    return `
      <div class="prism-ctl-row">
        <div class="prism-ctl-label">
          <span class="prism-ctl-name">${esc(label)}</span>
          ${hint ? `<span class="prism-ctl-hint">${esc(hint)}</span>` : ''}
        </div>
        <button type="button" role="switch" class="prism-switch" aria-checked="${checked ? 'true' : 'false'}"
                data-action="toggle-bool" data-key="${esc(key)}"></button>
      </div>
    `;
  }

  function renderSegRow({ key, label, value, options }) {
    return `
      <div class="prism-ctl-row">
        <div class="prism-ctl-label">
          <span class="prism-ctl-name">${esc(label)}</span>
        </div>
        <div class="prism-seg">
          ${options
            .map(
              (o) => `
            <button type="button" class="prism-seg-btn ${String(value) === String(o.value) ? 'is-active' : ''}"
                    data-action="set-enum" data-key="${esc(key)}" data-val="${esc(o.value)}">${esc(o.label)}</button>
          `,
            )
            .join('')}
        </div>
      </div>
    `;
  }

  function renderConfirmRow({ confirmKey, label, hint = '', btnLabel, danger = false, action, payload = '' }) {
    const armed = store.armedConfirm?.key === confirmKey;
    return `
      <div class="prism-confirm-row" data-armed="${armed ? 'true' : 'false'}">
        <div class="prism-ctl-label">
          <span class="prism-ctl-name">${esc(label)}</span>
          ${hint ? `<span class="prism-ctl-hint">${esc(hint)}</span>` : ''}
        </div>
        <div class="prism-confirm-actions">
          ${
            armed
              ? `
            <button type="button" class="prism-btn prism-btn-sm prism-btn-danger"
                    data-action="${esc(action)}" data-confirm-exec="${esc(confirmKey)}" data-payload="${esc(payload)}">✓ ${esc(tr('host.confirmPrompt'))}</button>
            <button type="button" class="prism-btn prism-btn-sm" data-action="cancel-confirm">${esc(tr('host.cancel'))}</button>
          `
              : `
            <button type="button" class="prism-btn prism-btn-sm ${danger ? 'prism-btn-danger' : ''}"
                    data-action="arm-confirm" data-confirm-key="${esc(confirmKey)}">${esc(btnLabel)}</button>
          `
          }
        </div>
      </div>
    `;
  }

  function renderScenePresetsHtml(eff) {
    const icons = { crystal: '✦', islands: '❖', focus: '◐', eco: '🍃' };
    const subsZh = { crystal: '64% 高透光感', islands: '8px 圆角浮岛', focus: '柔焦护眼阅读', eco: '静帧零模糊' };
    const subsEn = { crystal: '64% airy acrylic', islands: '8px glass islands', focus: 'Soft reading veil', eco: 'Paused 0-blur' };
    const isZh = curLocale() === 'zh';

    return `
      <div class="prism-scene-grid">
        ${SCENE_PRESET_IDS.map((id) => {
          const p = SCENE_PRESETS[id];
          const active = eff.preset === id;
          return `
            <button type="button" class="prism-scene-card ${active ? 'is-active' : ''}"
                    data-action="apply-scene-preset" data-preset="${esc(id)}">
              <div class="prism-scene-head">
                <span>${icons[id] || '◆'} ${esc(isZh ? p.nameZh : p.nameEn)}</span>
                ${active ? '<span style="color:var(--prism-accent)">●</span>' : ''}
              </div>
              <div class="prism-scene-sub">${esc(isZh ? subsZh[id] : subsEn[id])}</div>
            </button>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderExtractedSwatchesHtml() {
    const ext = store.config.extractedAccent;
    if (!ext) {
      return `<span class="prism-ctl-hint">${esc(curLocale() === 'zh' ? '等待壁纸缩略图采样…' : 'Sampling active wallpaper chroma…')}</span>`;
    }
    return `
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span class="prism-chip" style="cursor:default">
          <span class="prism-accent-dot" style="background:${esc(ext.darkHex)}"></span>
          <span>Dark ${esc(ext.darkHex)}</span>
        </span>
        <span class="prism-chip" style="cursor:default">
          <span class="prism-accent-dot" style="background:${esc(ext.lightHex)}"></span>
          <span>Light ${esc(ext.lightHex)}</span>
        </span>
        <span class="prism-chip" style="cursor:default">
          <span class="prism-accent-dot" style="background:rgb(${esc(ext.tintRgb)})"></span>
          <span>Tint rgb(${esc(ext.tintRgb)})</span>
        </span>
      </div>
    `;
  }

  // ==========================================================================
  // Tab 1: Library Renderer
  // ==========================================================================
  function renderWallpaperCardHtml(item, activeId, favSet) {
    const isActive = item.id === activeId;
    const isFav = favSet.has(item.id);
    const isPicked = store.batchMode && store.batchSelected.has(item.id);
    const hasPin = hasPerWallpaperPin(item.id);
    const thumb = item.thumbUrl || (item.kind === 'image' ? item.mediaUrl : '');
    const bgFallback = weColorToHex(item.schemeColor) || '#1a2236';

    return `
      <article class="prism-wall-card ${isActive ? 'is-active' : ''} ${isPicked ? 'is-batch-selected' : ''}"
               tabindex="0" data-action="card-click" data-id="${esc(item.id)}">
        <div class="prism-wall-thumb" style="background:linear-gradient(135deg, ${esc(bgFallback)}66, rgba(12,14,22,0.95))">
          ${thumb ? `<img loading="lazy" src="${esc(thumb)}" alt="${esc(item.title || 'Wallpaper')}" onerror="this.remove()" />` : ''}
          <div class="prism-card-top-left">
            ${isActive ? `<span class="prism-active-pill">✓ ${esc(curLocale() === 'zh' ? '当前' : 'Active')}</span>` : ''}
            ${store.batchMode ? `<span class="prism-fmt-tag">${isPicked ? '☑' : '☐'}</span>` : ''}
          </div>
          <div class="prism-card-top-right ${isFav || hasPin ? 'has-pinned' : ''}">
            <button type="button" class="prism-card-act ${isFav ? 'is-fav' : ''}"
                    data-action="toggle-fav" data-id="${esc(item.id)}" title="${esc(tr('lib.favorites'))}">★</button>
            <button type="button" class="prism-card-act"
                    data-action="open-inspector" data-id="${esc(item.id)}" title="${esc(tr('lib.inspector'))}">⚙</button>
            <button type="button" class="prism-card-act"
                    data-action="hide-item" data-id="${esc(item.id)}" title="${esc(tr('lib.hideOne'))}">🙈</button>
          </div>
          <div class="prism-card-bottom-badges">
            <span class="prism-fmt-tag">${esc(tr(`kind.${item.kind}`) || item.kind)}</span>
            ${item.resolution ? `<span class="prism-fmt-tag">${esc(item.resolution)}</span>` : ''}
          </div>
        </div>
        <div class="prism-wall-info">
          <span class="prism-wall-title" title="${esc(item.title || item.id)}">${esc(item.title || item.id)}</span>
          <span class="prism-wall-sub">${esc(item.source === 'workshop' ? 'WS' : item.source === 'upload' ? 'UP' : 'LOC')}</span>
        </div>
      </article>
    `;
  }

  function renderLibraryGridHtml(model = computeLibraryModel()) {
    const activeId = getActiveId();
    if (model.visibleItems.length === 0) {
      return `
        <div class="prism-empty-state">
          <div style="font-size:22px;opacity:0.65">❖</div>
          <div>${esc(tr('lib.empty'))}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
            <button type="button" class="prism-btn prism-btn-primary" data-action="trigger-upload">+ ${esc(tr('lib.upload'))}</button>
            <button type="button" class="prism-btn" data-action="refresh-library">↻ ${esc(tr('lib.refresh'))}</button>
          </div>
        </div>
      `;
    }

    const vSlice = computeVirtualSlice(model.visibleItems.length);
    store.virtualWindow = vSlice;
    const slice = model.visibleItems.slice(vSlice.start, vSlice.end);
    const density = store.config.pickerLayout === 'fixed' ? 'compact' : 'gallery';

    return `
      <div class="prism-grid-viewport" style="padding-top:${vSlice.padTop}px;padding-bottom:${vSlice.padBottom}px">
        <div class="prism-wall-grid" data-density="${density}">
          ${slice.map((it) => renderWallpaperCardHtml(it, activeId, model.favSet)).join('')}
        </div>
      </div>
    `;
  }

  function renderLibraryTab() {
    const model = computeLibraryModel();
    const activeGroup = (store.config.rotationGroups || []).find((g) => g.id === store.config.rotationGroupId);

    return `
      <div class="prism-card" style="display:flex;flex-direction:column;gap:9px">
        <div class="prism-lib-toolbar">
          <div class="prism-search-box">
            <span class="prism-search-icon">⌕</span>
            <input id="prism-lib-search" type="text" class="prism-search-input"
                   placeholder="${esc(tr('lib.searchPlaceholder'))}" value="${esc(store.searchQuery)}" />
            ${store.searchQuery ? `<button type="button" class="prism-search-clear" data-action="clear-search">✕</button>` : ''}
          </div>
          <button type="button" class="prism-btn prism-btn-primary" data-action="trigger-upload">
            ${store.uploading ? '⏳' : '＋'} ${esc(store.uploading ? tx('uploadBusy') : tr('lib.upload'))}
          </button>
          <button type="button" class="prism-btn" data-action="open-drawer" data-drawer="playlist">
            ↻ ${esc(tr('lib.playlists'))}${activeGroup ? ` · ${esc(activeGroup.name)}` : ''}
          </button>
          <button type="button" class="prism-btn" data-action="open-inspector" data-id="${esc(getActiveId())}">
            ⚙ ${esc(tx('inspectorBtn'))}
          </button>
          <button type="button" class="prism-btn" data-action="refresh-library" title="${esc(tr('lib.refresh'))}">↻</button>
        </div>

        <!-- Scope, Favorites, Hidden & Batch Row -->
        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px;align-items:center">
          <div class="prism-filter-group">
            <button type="button" class="prism-chip ${store.libScope === 'all' ? 'is-active' : ''}" data-action="set-lib-scope" data-scope="all">
              ${esc(tx('scopeAll'))} <span class="prism-chip-count">${model.totalPlayable - model.hiddenCount}</span>
            </button>
            <button type="button" class="prism-chip ${store.libScope === 'favorites' ? 'is-active' : ''}" data-action="set-lib-scope" data-scope="favorites">
              ★ ${esc(tr('lib.favorites'))} <span class="prism-chip-count">${model.favCount}</span>
            </button>
            <button type="button" class="prism-chip ${store.libScope === 'workshop' ? 'is-active' : ''}" data-action="set-lib-scope" data-scope="workshop">
              ${esc(tx('scopeWorkshop'))} <span class="prism-chip-count">${model.workshopCount}</span>
            </button>
            <button type="button" class="prism-chip ${store.libScope === 'local' ? 'is-active' : ''}" data-action="set-lib-scope" data-scope="local">
              ${esc(tx('scopeLocal'))} <span class="prism-chip-count">${model.localCount}</span>
            </button>
            <button type="button" class="prism-chip" data-action="open-drawer" data-drawer="hidden">
              🙈 ${esc(tr('lib.hidden'))} <span class="prism-chip-count">${model.hiddenCount}</span>
            </button>
          </div>

          <div class="prism-filter-group">
            ${
              store.batchMode
                ? `
              <button type="button" class="prism-btn prism-btn-sm" data-action="batch-hide">${esc(tx('batchHide'))} (${store.batchSelected.size})</button>
              <button type="button" class="prism-btn prism-btn-sm prism-btn-primary" data-action="batch-to-playlist">${esc(tx('batchPlaylist'))}</button>
              <button type="button" class="prism-btn prism-btn-sm" data-action="toggle-batch">${esc(tx('batchClear'))}</button>
            `
                : `
              <button type="button" class="prism-chip" data-action="toggle-batch">☑ ${esc(tx('batchMode'))}</button>
              <button type="button" class="prism-chip" data-action="toggle-density">
                ${esc(store.config.pickerLayout === 'fixed' ? tx('densityGrid') : tx('densityCompact'))}
              </button>
            `
            }
          </div>
        </div>

        <!-- Multi-Select Format & Content Rating Chips (with Non-Empty Guard) -->
        <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding-top:4px;border-top:1px solid var(--prism-border-hairline)">
          <div class="prism-filter-group">
            <span class="prism-filter-label">TYPE</span>
            ${LIBRARY_KINDS.map((k) => `
              <button type="button" class="prism-chip ${model.kindSet.has(k) ? 'is-active' : ''}"
                      data-action="toggle-kind-chip" data-kind="${esc(k)}">
                ${esc(tr(`kind.${k}`))} <span class="prism-chip-count">${model.kindCounts[k] || 0}</span>
              </button>
            `).join('')}
          </div>
          <div class="prism-filter-group">
            <span class="prism-filter-label">RATING</span>
            ${CONTENT_RATINGS.map((r) => `
              <button type="button" class="prism-chip ${model.ratingSet.has(r) ? 'is-active' : ''}"
                      data-action="toggle-rating-chip" data-rating="${esc(r)}">
                ${esc(tr(`rating.${r}`))} <span class="prism-chip-count">${model.ratingCounts[r] || 0}</span>
              </button>
            `).join('')}
          </div>
        </div>
      </div>

      <div id="prism-lib-grid-host">
        ${renderLibraryGridHtml(model)}
      </div>
    `;
  }

  // ==========================================================================
  // Tab 2: Prism Skin (Style Settings Core) Renderer
  // ==========================================================================
  function renderSkinPinBarHtml() {
    const activeId = getActiveId();
    const activeItem = store.activeItem || store.items.find((x) => x.id === activeId);
    const pinned = hasPerWallpaperPin(activeId);
    const isZh = curLocale() === 'zh';

    return `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:8px;min-width:0">
          <span class="prism-kind-badge">${esc(activeItem ? tr(`kind.${activeItem.kind}`) || activeItem.kind : 'SKIN')}</span>
          <strong style="font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
            ${esc(activeItem?.title || (isZh ? '全局棱镜玻璃外观' : 'Global Prism Skin'))}
          </strong>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          ${
            activeId
              ? `
            <label style="display:inline-flex;align-items:center;gap:6px;font-size:11.5px;cursor:pointer">
              <span>📌 ${esc(tr('lib.pinOverride'))}</span>
              <button type="button" role="switch" class="prism-switch" aria-checked="${pinned ? 'true' : 'false'}"
                      data-action="toggle-pin-override"></button>
            </label>
          `
              : ''
          }
          <button type="button" class="prism-btn prism-btn-sm" data-action="open-inspector" data-id="${esc(activeId)}">
            ⚙ ${esc(tx('inspectorBtn'))}
          </button>
        </div>
      </div>
    `;
  }

  function renderPrismSkinTab() {
    const eff = getEffectiveConfig();
    const isZh = curLocale() === 'zh';
    const polarity = getResolvedPolarity(eff);

    const visiblePresets = (store.presets?.length ? store.presets : FACTORY_PRESETS).filter(
      (p) => !(store.config.deletedFactoryPresets || []).includes(p.id),
    );

    return `
      <!-- Per-Wallpaper Optical Memory Top Bar (Scene Presets live exclusively in Left Rail) -->
      <div id="prism-skin-pin-bar" class="prism-card" style="padding:9px 12px">
        ${renderSkinPinBarHtml()}
      </div>

      <!-- Whole-Profile Snapshots Manager -->
      <details class="prism-section" open>
        <summary>
          <div class="prism-section-title-wrap">
            <span class="prism-section-chevron">▶</span>
            <span>${esc(tr('preset.profileTitle'))}</span>
          </div>
          <div style="display:flex;gap:5px">
            <button type="button" class="prism-btn prism-btn-sm" data-action="trigger-preset-import">📥 ${esc(tr('preset.import'))}</button>
          </div>
        </summary>
        <div class="prism-section-body">
          <div class="prism-swatch-grid" style="grid-template-columns:repeat(auto-fill,minmax(190px,1fr))">
            ${visiblePresets
              .map((p) => {
                const isAct = store.config.activeProfilePresetId === p.id;
                const pName = isZh ? p.name : p.nameEn || p.name;
                const pDesc = isZh ? p.description || '' : p.descriptionEn || p.description || '';
                const delKey = `del-preset:${p.id}`;
                const armed = store.armedConfirm?.key === delKey;
                return `
                  <div class="prism-card" style="padding:8px 10px;display:flex;flex-direction:column;gap:5px;border-color:${isAct ? 'var(--prism-accent)' : 'var(--prism-border-card)'}">
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
                      <strong style="font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(pName)}</strong>
                      ${isAct ? '<span style="color:var(--prism-accent);font-size:11px">●</span>' : ''}
                    </div>
                    ${pDesc ? `<div style="font-size:10.5px;color:var(--prism-fg-muted);line-height:1.3">${esc(pDesc)}</div>` : ''}
                    <div style="display:flex;gap:4px;margin-top:auto;padding-top:4px;flex-wrap:wrap">
                      <button type="button" class="prism-btn prism-btn-sm ${isAct ? 'prism-btn-primary' : ''}"
                              data-action="apply-profile-preset" data-id="${esc(p.id)}">${esc(tr('common.apply'))}</button>
                      <button type="button" class="prism-btn prism-btn-sm"
                              data-action="export-profile-preset" data-id="${esc(p.id)}">${esc(tr('preset.export'))}</button>
                      ${
                        armed
                          ? `<button type="button" class="prism-btn prism-btn-sm prism-btn-danger" data-action="delete-profile-preset" data-payload="${esc(p.id)}">✓</button>
                             <button type="button" class="prism-btn prism-btn-sm" data-action="cancel-confirm">✕</button>`
                          : `<button type="button" class="prism-btn prism-btn-sm" data-action="arm-confirm" data-confirm-key="${esc(delKey)}">🗑</button>`
                      }
                    </div>
                  </div>
                `;
              })
              .join('')}
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;padding-top:6px;border-top:1px solid var(--prism-border-hairline)">
            <input id="prism-preset-name-in" type="text" class="prism-input" style="flex:1 1 140px"
                   placeholder="${esc(tx('savePresetPlaceholder'))}" value="${esc(store.presetDraft.name)}" />
            <input id="prism-preset-desc-in" type="text" class="prism-input" style="flex:1 1 160px"
                   placeholder="${esc(tx('savePresetDescPlaceholder'))}" value="${esc(store.presetDraft.description)}" />
            <button type="button" class="prism-btn prism-btn-primary" data-action="save-profile-preset">💾 ${esc(tr('preset.save'))}</button>
          </div>
        </div>
      </details>

      <div class="prism-settings-columns">
        <!-- Section 1: Layout & Concentric Island Geometry -->
        <details class="prism-section" open>
          <summary>
            <div class="prism-section-title-wrap">
              <span class="prism-section-chevron">▶</span>
              <span>${esc(tr('layout.title'))}</span>
            </div>
            <button type="button" class="prism-btn prism-btn-sm"
                    data-action="reset-module" data-keys="layoutMode,islandGap,workspacePad,cornerStyle,leftSidebarRadius,rightSidebarRadius,borders,shadows,transparentWindowControls">↺</button>
          </summary>
          <div class="prism-section-body">
            ${renderSegRow({
              key: 'layoutMode',
              label: tr('layout.mode'),
              value: eff.layoutMode,
              options: [
                { value: 'islands', label: tr('layout.islands') },
                { value: 'flush', label: tr('layout.flush') },
              ],
            })}
            ${renderSliderRow({
              key: 'islandGap',
              label: tr('layout.islandGap'),
              value: eff.islandGap,
              defaultValue: DEFAULT_CONFIG.islandGap,
              min: 0,
              max: 20,
              step: 1,
              suffix: ' px',
            })}
            ${renderSliderRow({
              key: 'workspacePad',
              label: tr('layout.workspacePad'),
              value: eff.workspacePad,
              defaultValue: DEFAULT_CONFIG.workspacePad,
              min: 0,
              max: 20,
              step: 1,
              suffix: ' px',
            })}
            ${renderSegRow({
              key: 'cornerStyle',
              label: tr('layout.cornerStyle'),
              value: eff.cornerStyle,
              options: CORNER_STYLES.map((c) => ({ value: c, label: tr(`layout.${c}`) })),
            })}
            ${renderSegRow({
              key: 'leftSidebarRadius',
              label: tr('layout.leftSidebarRadius'),
              value: eff.leftSidebarRadius,
              options: SIDEBAR_RADII.map((r) => ({ value: r, label: r === 'auto' ? 'Auto' : r === 'native' ? 'Native' : `${r}px` })),
            })}
            ${renderSegRow({
              key: 'rightSidebarRadius',
              label: tr('layout.rightSidebarRadius'),
              value: eff.rightSidebarRadius,
              options: SIDEBAR_RADII.map((r) => ({ value: r, label: r === 'auto' ? 'Auto' : r === 'native' ? 'Native' : `${r}px` })),
            })}
            ${renderSegRow({
              key: 'borders',
              label: tr('layout.borders'),
              value: eff.borders,
              options: BORDER_MODES.map((b) => ({ value: b, label: tr(`layout.borders.${b}`) })),
            })}
            ${renderSwitchRow({
              key: 'shadows',
              label: tr('layout.shadows'),
              checked: eff.shadows,
            })}
            ${renderSwitchRow({
              key: 'transparentWindowControls',
              label: tr('layout.transparentWindowControls'),
              hint: tr('layout.transparentWindowControlsHint'),
              checked: eff.transparentWindowControls !== false,
            })}
          </div>
        </details>

        <!-- Section 2: 8 Paired Color Schemes & Dynamic Wallpaper Accent -->
        <details class="prism-section" open>
          <summary>
            <div class="prism-section-title-wrap">
              <span class="prism-section-chevron">▶</span>
              <span>${esc(tr('scheme.title'))}</span>
            </div>
            <button type="button" class="prism-btn prism-btn-sm"
                    data-action="reset-module" data-keys="themeMode,themeFollow,colorScheme,accentMode,customAccent,wallTintMix">↺</button>
          </summary>
          <div class="prism-section-body">
            ${renderSegRow({
              key: 'themeMode',
              label: tr('scheme.themeMode'),
              value: eff.themeMode,
              options: THEME_MODES.map((m) => ({ value: m, label: tr(`scheme.theme.${m}`) })),
            })}
            ${renderSwitchRow({
              key: 'themeFollow',
              label: tr('scheme.themeFollow'),
              checked: eff.themeFollow,
            })}

            <div style="padding:6px 0;border-top:1px solid var(--prism-border-hairline)">
              <div class="prism-ctl-name" style="margin-bottom:6px">${esc(tr('scheme.colorScheme'))}</div>
              <div class="prism-swatch-grid">
                ${COLOR_SCHEME_IDS.map((sid) => {
                  const sc = COLOR_SCHEMES[sid];
                  const active = eff.colorScheme === sid;
                  return `
                    <button type="button" class="prism-swatch-card ${active ? 'is-active' : ''}"
                            data-action="set-enum" data-key="colorScheme" data-val="${esc(sid)}">
                      <span class="prism-swatch-dots">
                        <span style="background:${esc(sc.swatchDark)}"></span>
                        <span style="background:${esc(sc.swatchLight)}"></span>
                        <span style="background:${esc(sc.swatchAccent)}"></span>
                      </span>
                      <span class="prism-swatch-name">${esc(isZh ? sc.nameZh.split(' ')[0] : sc.nameEn)}</span>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>

            <div style="padding:6px 0;border-top:1px solid var(--prism-border-hairline);display:flex;flex-direction:column;gap:6px">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span class="prism-ctl-name">${esc(tr('scheme.accentMode'))}</span>
                ${
                  eff.accentMode === 'custom'
                    ? `<label style="display:inline-flex;align-items:center;gap:5px">
                        <input type="color" class="prism-color-input" data-action="set-color-key" data-key="customAccent" value="${esc(eff.customAccent || '#669DF6')}" />
                        <span style="font-family:var(--prism-font-mono);font-size:11px">${esc(eff.customAccent)}</span>
                      </label>`
                    : ''
                }
              </div>
              <div class="prism-accent-strip">
                ${ACCENT_MODES.map((am) => {
                  let dotColor = COLOR_SCHEMES[eff.colorScheme]?.[polarity]?.accent || '#669DF6';
                  if (am === 'dynamic' && eff.extractedAccent) {
                    dotColor = polarity === 'light' ? eff.extractedAccent.lightHex : eff.extractedAccent.darkHex;
                  } else if (ACCENT_PRESETS[am]) {
                    dotColor = polarity === 'light' ? ACCENT_PRESETS[am].light : ACCENT_PRESETS[am].dark;
                  } else if (am === 'custom') {
                    dotColor = eff.customAccent || '#669DF6';
                  }
                  return `
                    <button type="button" class="prism-accent-chip ${eff.accentMode === am ? 'is-active' : ''}"
                            data-action="set-enum" data-key="accentMode" data-val="${esc(am)}">
                      <span class="prism-accent-dot" style="background:${esc(dotColor)}"></span>
                      <span>${esc(tr(`scheme.accent.${am}`))}</span>
                    </button>
                  `;
                }).join('')}
              </div>
              <div style="font-size:10.5px;color:var(--prism-fg-muted);padding-top:2px">${esc(tx('extractedTitle'))}</div>
              <div id="prism-extracted-readout">${renderExtractedSwatchesHtml()}</div>
            </div>

            ${renderSliderRow({
              key: 'wallTintMix',
              label: tr('scheme.wallTintMix'),
              value: eff.wallTintMix,
              defaultValue: DEFAULT_CONFIG.wallTintMix,
              min: 0,
              max: 0.18,
              step: 0.005,
              scale: 100,
              decimals: 1,
              suffix: ' %',
            })}
          </div>
        </details>

        <!-- Section 3: Glass & Readability Guardrails -->
        <details class="prism-section" open>
          <summary>
            <div class="prism-section-title-wrap">
              <span class="prism-section-chevron">▶</span>
              <span>${esc(tr('glass.title'))}</span>
            </div>
            <button type="button" class="prism-btn prism-btn-sm"
                    data-action="reset-module" data-keys="glassSurfaces,glassOpacity,glassBlur,sidebarOpacity,sidebarBlur,glassFidelity,chatGlassFidelity,codeReadabilityMode,contrastFloor,caretColor">↺</button>
          </summary>
          <div class="prism-section-body">
            ${renderSwitchRow({
              key: 'glassSurfaces',
              label: tr('glass.surfaces'),
              checked: eff.glassSurfaces,
            })}
            ${renderSliderRow({
              key: 'glassOpacity',
              label: tr('glass.opacity'),
              value: eff.glassOpacity,
              defaultValue: DEFAULT_CONFIG.glassOpacity,
              min: 0.30,
              max: 0.98,
              step: 0.01,
              scale: 100,
              decimals: 0,
              suffix: ' %',
            })}
            ${renderSliderRow({
              key: 'glassBlur',
              label: tr('glass.blur'),
              value: eff.glassBlur,
              defaultValue: DEFAULT_CONFIG.glassBlur,
              min: 0,
              max: 48,
              step: 1,
              suffix: ' px',
            })}
            ${renderSliderRow({
              key: 'sidebarOpacity',
              label: tr('glass.sidebarOpacity'),
              value: eff.sidebarOpacity,
              defaultValue: DEFAULT_CONFIG.glassOpacity,
              min: 0.20,
              max: 0.98,
              step: 0.01,
              scale: 100,
              decimals: 0,
              suffix: ' %',
              nullableFallbackKey: 'glassOpacity',
              fallbackValue: eff.glassOpacity,
            })}
            ${renderSliderRow({
              key: 'sidebarBlur',
              label: tr('glass.sidebarBlur'),
              value: eff.sidebarBlur,
              defaultValue: DEFAULT_CONFIG.glassBlur,
              min: 0,
              max: 48,
              step: 1,
              suffix: ' px',
              nullableFallbackKey: 'glassBlur',
              fallbackValue: eff.glassBlur,
            })}
            ${renderSliderRow({
              key: 'glassFidelity',
              label: tr('glass.fidelity'),
              value: eff.glassFidelity,
              defaultValue: DEFAULT_CONFIG.glassFidelity,
              min: 0,
              max: 100,
              step: 1,
              suffix: ' %',
            })}
            ${renderSliderRow({
              key: 'chatGlassFidelity',
              label: tr('glass.chatFidelity'),
              value: eff.chatGlassFidelity,
              defaultValue: DEFAULT_CONFIG.chatGlassFidelity,
              min: 0,
              max: 100,
              step: 1,
              suffix: ' %',
            })}
            ${renderSegRow({
              key: 'codeReadabilityMode',
              label: tr('glass.codeMode'),
              value: eff.codeReadabilityMode,
              options: CODE_READABILITY_MODES.map((m) => ({ value: m, label: tr(`glass.code.${m}`) })),
            })}
            ${renderSwitchRow({
              key: 'contrastFloor',
              label: tr('glass.contrastFloor'),
              checked: eff.contrastFloor,
            })}
            <div class="prism-ctl-row">
              <div class="prism-ctl-label">
                <span class="prism-ctl-name">${esc(tr('glass.caretColor'))}</span>
              </div>
              <div style="display:flex;align-items:center;gap:6px">
                <input type="color" class="prism-color-input" data-action="set-color-key" data-key="caretColor"
                       value="${esc(/^#[0-9a-f]{6}$/i.test(eff.caretColor) ? eff.caretColor : '#669DF6')}" />
                <button type="button" class="prism-btn prism-btn-sm ${!eff.caretColor ? 'prism-btn-primary' : ''}"
                        data-action="set-enum" data-key="caretColor" data-val="">Auto</button>
              </div>
            </div>
          </div>
        </details>

        <!-- Section 4: Media Optics & Optional Extensions -->
        <details class="prism-section" open>
          <summary>
            <div class="prism-section-title-wrap">
              <span class="prism-section-chevron">▶</span>
              <span>${esc(tr('optics.title'))}</span>
            </div>
            <button type="button" class="prism-btn prism-btn-sm"
                    data-action="reset-module" data-keys="scrimOpacity,scrimColor,vignette,mediaOpacity,mediaBlur,mediaBrightness,mediaContrast,mediaSaturate,grainAlpha,filterPreset">↺</button>
          </summary>
          <div class="prism-section-body">
            ${renderSliderRow({
              key: 'scrimOpacity',
              label: tr('optics.scrimOpacity'),
              value: eff.scrimOpacity,
              defaultValue: DEFAULT_CONFIG.scrimOpacity,
              min: 0,
              max: 0.92,
              step: 0.01,
              scale: 100,
              decimals: 0,
              suffix: ' %',
            })}
            ${renderSwitchRow({
              key: 'vignette',
              label: tr('optics.vignette'),
              checked: eff.vignette,
            })}
            ${renderSliderRow({
              key: 'mediaOpacity',
              label: tr('optics.mediaOpacity'),
              value: eff.mediaOpacity,
              defaultValue: DEFAULT_CONFIG.mediaOpacity,
              min: 0.05,
              max: 1.0,
              step: 0.01,
              scale: 100,
              decimals: 0,
              suffix: ' %',
            })}
            ${renderSliderRow({
              key: 'mediaBlur',
              label: tr('optics.mediaBlur'),
              value: eff.mediaBlur,
              defaultValue: DEFAULT_CONFIG.mediaBlur,
              min: 0,
              max: 64,
              step: 1,
              suffix: ' px',
            })}
            ${renderSliderRow({
              key: 'mediaBrightness',
              label: tr('optics.mediaBrightness'),
              value: eff.mediaBrightness,
              defaultValue: DEFAULT_CONFIG.mediaBrightness,
              min: 40,
              max: 160,
              step: 1,
              suffix: ' %',
            })}
            ${renderSliderRow({
              key: 'mediaContrast',
              label: tr('optics.mediaContrast'),
              value: eff.mediaContrast,
              defaultValue: DEFAULT_CONFIG.mediaContrast,
              min: 50,
              max: 150,
              step: 1,
              suffix: ' %',
            })}
            ${renderSliderRow({
              key: 'mediaSaturate',
              label: tr('optics.mediaSaturate'),
              value: eff.mediaSaturate,
              defaultValue: DEFAULT_CONFIG.mediaSaturate,
              min: 0,
              max: 200,
              step: 1,
              suffix: ' %',
            })}
            ${renderSliderRow({
              key: 'grainAlpha',
              label: tr('optics.grainAlpha'),
              value: eff.grainAlpha,
              defaultValue: DEFAULT_CONFIG.grainAlpha,
              min: 0,
              max: 0.15,
              step: 0.002,
              scale: 100,
              decimals: 1,
              suffix: ' %',
            })}
            <div class="prism-ctl-row">
              <span class="prism-ctl-name">${esc(tx('filterPreset'))}</span>
              <select class="prism-input" data-action="select-enum" data-key="filterPreset">
                ${FILTER_PRESETS.map((fp) => `<option value="${esc(fp)}" ${eff.filterPreset === fp ? 'selected' : ''}>${esc(fp)}</option>`).join('')}
              </select>
            </div>
          </div>
        </details>

        <!-- Section 5: Optional Interactive Visual Extensions -->
        <details class="prism-section span-full" open>
          <summary>
            <div class="prism-section-title-wrap">
              <span class="prism-section-chevron">▶</span>
              <span>${esc(tr('ext.title'))}</span>
            </div>
            <button type="button" class="prism-btn prism-btn-sm"
                    data-action="reset-module" data-keys="fxEnabled,parallaxEnabled,parallaxStrength">↺</button>
          </summary>
          <div class="prism-section-body">
            ${renderSwitchRow({
              key: 'fxEnabled',
              label: tr('ext.fxEnabled'),
              checked: eff.fxEnabled,
            })}
            ${renderSwitchRow({
              key: 'parallaxEnabled',
              label: tr('ext.parallaxEnabled'),
              checked: eff.parallaxEnabled,
            })}
            ${
              eff.parallaxEnabled
                ? renderSliderRow({
                    key: 'parallaxStrength',
                    label: tr('ext.parallaxStrength'),
                    value: eff.parallaxStrength,
                    defaultValue: DEFAULT_CONFIG.parallaxStrength,
                    min: 0,
                    max: 40,
                    step: 1,
                    suffix: ' px',
                  })
                : ''
            }
          </div>
        </details>
      </div>
    `;
  }

  // ==========================================================================
  // Tab 3: Playback & Engine Renderer
  // ==========================================================================
  function renderPlaybackTab() {
    const eff = getEffectiveConfig();

    return `
      <div class="prism-settings-columns">
        <!-- Switch Transitions & Slideshow -->
        <details class="prism-section" open>
          <summary>
            <div class="prism-section-title-wrap">
              <span class="prism-section-chevron">▶</span>
              <span>${esc(tr('play.transitions'))}</span>
            </div>
            <button type="button" class="prism-btn prism-btn-sm"
                    data-action="reset-module" data-keys="switchTransition,switchTransitionDir,switchTransitionSpeed,pictureSlideSeconds">↺</button>
          </summary>
          <div class="prism-section-body">
            ${renderSegRow({
              key: 'switchTransition',
              label: tr('play.transitionType'),
              value: eff.switchTransition,
              options: SWITCH_TRANSITIONS.map((st) => ({ value: st, label: st.toUpperCase() })),
            })}
            ${renderSegRow({
              key: 'switchTransitionDir',
              label: tr('play.transitionDir'),
              value: eff.switchTransitionDir,
              options: SWITCH_DIRECTIONS.map((d) => ({ value: d, label: d.toUpperCase() })),
            })}
            ${renderSegRow({
              key: 'switchTransitionSpeed',
              label: tr('play.transitionSpeed'),
              value: eff.switchTransitionSpeed,
              options: SWITCH_SPEEDS.map((sp) => ({ value: sp, label: sp })),
            })}
            ${renderSliderRow({
              key: 'pictureSlideSeconds',
              label: tx('slideInterval'),
              value: eff.pictureSlideSeconds,
              defaultValue: DEFAULT_CONFIG.pictureSlideSeconds,
              min: 0,
              max: 600,
              step: 5,
              suffix: ' s',
            })}
          </div>
        </details>

        <!-- Video Speed, FPS Cap & Scene WebGL Engine -->
        <details class="prism-section" open>
          <summary>
            <div class="prism-section-title-wrap">
              <span class="prism-section-chevron">▶</span>
              <span>${esc(tr('tab.playback'))}</span>
            </div>
            <button type="button" class="prism-btn prism-btn-sm"
                    data-action="reset-module" data-keys="playbackRate,fpsCap,sceneLive,sceneLiveFps,sceneAutoQuality,interactiveWeb">↺</button>
          </summary>
          <div class="prism-section-body">
            ${renderSliderRow({
              key: 'playbackRate',
              label: tr('play.speed'),
              value: eff.playbackRate,
              defaultValue: DEFAULT_CONFIG.playbackRate,
              min: 0.5,
              max: 2.0,
              step: 0.05,
              decimals: 2,
              suffix: '×',
            })}
            <div class="prism-ctl-row">
              <span class="prism-ctl-hint">Quick Speed</span>
              <div class="prism-seg">
                ${[0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => `
                  <button type="button" class="prism-seg-btn ${Math.abs(eff.playbackRate - r) < 0.02 ? 'is-active' : ''}"
                          data-action="set-num" data-key="playbackRate" data-val="${r}">${r}×</button>
                `).join('')}
              </div>
            </div>
            ${renderSegRow({
              key: 'fpsCap',
              label: tr('play.fpsCap'),
              value: eff.fpsCap,
              options: [
                { value: 0, label: tr('play.fpsUnlimited') },
                { value: 60, label: '60 FPS' },
                { value: 30, label: '30 FPS' },
              ],
            })}
            ${renderSwitchRow({
              key: 'sceneLive',
              label: tr('play.sceneLive'),
              checked: eff.sceneLive,
            })}
            ${renderSegRow({
              key: 'sceneLiveFps',
              label: tr('play.sceneFps'),
              value: eff.sceneLiveFps,
              options: [
                { value: 15, label: '15 FPS' },
                { value: 30, label: '30 FPS' },
                { value: 60, label: '60 FPS' },
              ],
            })}
            ${renderSwitchRow({
              key: 'sceneAutoQuality',
              label: tr('play.sceneAutoQuality'),
              checked: eff.sceneAutoQuality,
            })}
            ${renderSwitchRow({
              key: 'interactiveWeb',
              label: tx('interactiveWeb'),
              checked: eff.interactiveWeb,
            })}
          </div>
        </details>

        <!-- Free Framing & Alignment (dblclick resets X/Y/Scale) -->
        <details class="prism-section" open>
          <summary>
            <div class="prism-section-title-wrap">
              <span class="prism-section-chevron">▶</span>
              <span>${esc(tr('optics.fit'))} &amp; Free Framing</span>
            </div>
            <button type="button" class="prism-btn prism-btn-sm"
                    data-action="reset-module" data-keys="fit,flip,layerPosX,layerPosY,layerScale">↺</button>
          </summary>
          <div class="prism-section-body">
            ${renderSegRow({
              key: 'fit',
              label: tr('optics.fit'),
              value: eff.fit,
              options: FIT_MODES.map((f) => ({ value: f, label: tr(`optics.fit.${f}`) })),
            })}
            ${renderSwitchRow({
              key: 'flip',
              label: tr('optics.flip'),
              checked: eff.flip,
            })}
            ${renderSliderRow({
              key: 'layerPosX',
              label: tr('optics.posX'),
              value: eff.layerPosX,
              defaultValue: DEFAULT_CONFIG.layerPosX,
              min: 0,
              max: 100,
              step: 1,
              suffix: ' %',
              dblResetFraming: true,
            })}
            ${renderSliderRow({
              key: 'layerPosY',
              label: tr('optics.posY'),
              value: eff.layerPosY,
              defaultValue: DEFAULT_CONFIG.layerPosY,
              min: 0,
              max: 100,
              step: 1,
              suffix: ' %',
              dblResetFraming: true,
            })}
            ${renderSliderRow({
              key: 'layerScale',
              label: tr('optics.scale'),
              value: eff.layerScale,
              defaultValue: DEFAULT_CONFIG.layerScale,
              min: 50,
              max: 150,
              step: 1,
              suffix: ' %',
              dblResetFraming: true,
            })}
            <div class="prism-ctl-hint">${esc(tx('dblClickFramingHint'))}</div>
          </div>
        </details>

        <!-- Audio, Auto-Pause Lifecycle & Windows Desktop Sync -->
        <details class="prism-section" open>
          <summary>
            <div class="prism-section-title-wrap">
              <span class="prism-section-chevron">▶</span>
              <span>${esc(tr('play.autoPause'))}</span>
            </div>
            <button type="button" class="prism-btn prism-btn-sm"
                    data-action="reset-module" data-keys="muted,volume,pauseOnHidden,pauseOnBlur,pauseOnBattery,pauseOnFullscreen,desktopSync">↺</button>
          </summary>
          <div class="prism-section-body">
            <div class="prism-ctl-row">
              <span class="prism-ctl-name">${esc(eff.muted ? tr('transport.mute') : tr('transport.unmute'))}</span>
              <button type="button" class="prism-btn prism-btn-sm ${!eff.muted ? 'prism-btn-primary' : ''}" data-action="toggle-mute">
                ${eff.muted ? '🔇' : '🔊'} ${esc(eff.muted ? tr('transport.unmute') : tr('transport.mute'))}
              </button>
            </div>
            ${renderSliderRow({
              key: 'volume',
              label: tr('play.volume'),
              value: eff.volume,
              defaultValue: DEFAULT_CONFIG.volume,
              min: 0,
              max: 1,
              step: 0.05,
              scale: 100,
              decimals: 0,
              suffix: ' %',
            })}
            ${renderSwitchRow({
              key: 'pauseOnHidden',
              label: tr('play.pauseOnHidden'),
              checked: eff.pauseOnHidden,
            })}
            ${renderSwitchRow({
              key: 'pauseOnBlur',
              label: tr('play.pauseOnBlur'),
              checked: eff.pauseOnBlur,
            })}
            ${renderSwitchRow({
              key: 'pauseOnBattery',
              label: tr('play.pauseOnBattery'),
              checked: eff.pauseOnBattery,
            })}
            ${renderSwitchRow({
              key: 'pauseOnFullscreen',
              label: tr('play.pauseOnFullscreen'),
              checked: eff.pauseOnFullscreen,
            })}
            ${renderSwitchRow({
              key: 'desktopSync',
              label: tr('play.desktopSync'),
              checked: eff.desktopSync,
            })}
          </div>
        </details>
      </div>
    `;
  }

  // ==========================================================================
  // Tab 4: Host & System Renderer
  // ==========================================================================
  function renderSystemTab() {
    const hs = store.hostStatus || {};
    const attached = isHostAttached(hs);
    const port = hs.cdpPort || hs.port || store.config.debugPort || DEFAULT_DEBUG_PORT;
    const auto = store.autostart;
    const normalReady = Boolean(auto.normalShortcutEnabled);
    const startupMode = STARTUP_MODES.includes(store.config.startupMode) ? store.config.startupMode : 'gentle-auto';
    const bootDelaySec = Math.min(5.0, Math.max(0.5, Number(store.config.liveBootDelay ?? DEFAULT_CONFIG.liveBootDelay ?? 1.5)));
    const canaryState = CANARY_STATES.includes(store.canary?.state) ? store.canary.state : 'idle';
    const canaryStateLabel = tr(`canary.state.${canaryState}`);
    const canaryDotColor =
      canaryState === 'healthy'
        ? 'var(--prism-ok)'
        : canaryState === 'tripped'
          ? 'var(--prism-danger)'
          : canaryState === 'arming'
            ? 'var(--prism-warn)'
            : 'var(--prism-fg-faint)';

    const startupCards = [
      {
        id: 'gentle-auto',
        title: tr('host.startup.gentleAuto'),
        badge: Math.abs(bootDelaySec - 1.5) < 0.04
          ? tr('host.startup.gentleAutoBadge')
          : `${curLocale() === 'zh' ? '延迟' : 'Delay'} · ${bootDelaySec.toFixed(1)}s`,
        desc: tr('host.startup.gentleAutoDesc'),
      },
      {
        id: 'manual',
        title: tr('host.startup.manual'),
        badge: '',
        desc: tr('host.startup.manualDesc'),
      },
      {
        id: 'static-css',
        title: tr('host.startup.staticCss'),
        badge: '',
        desc: tr('host.startup.staticCssDesc'),
      },
    ];

    const defaultBaseDataDir = store.stats.dataDir || '~/.gemini/antigravity/sidecar_data/agy-wallpaper-prism/prism_studio/data';
    const shortcutsList = Array.isArray(auto.shortcuts) && auto.shortcuts.length > 0
      ? auto.shortcuts
      : (auto.patchedShortcuts || []).map((p) => ({
          path: p,
          name: String(p).split(/[\\/]/).pop() || p,
          location: 'desktop',
          hasDebugPort: true,
          debugPort: port,
          backedUp: true,
        }));
    const model = computeLibraryModel();

    return `
      <!-- v2.0.0 Startup Strategy, Boot Delay, Canary Circuit-Breaker & Panic Shortcut Card -->
      <div id="prism-startup-safety-card" class="prism-card" style="display:flex;flex-direction:column;gap:11px;${canaryState === 'tripped' ? 'border-color:rgba(var(--prism-danger-rgb),0.55)' : ''}">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:8px">
            <span class="prism-status-dot" style="background:${canaryDotColor}"></span>
            <strong style="font-size:13px">${esc(tr('host.startupTitle'))}</strong>
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            <span id="prism-canary-badge" class="prism-canary-badge" data-canary-state="${esc(canaryState)}" title="${esc(store.canary?.trippedReason || '')}">
              <span>${esc(tr('canary.badgeLabel'))}:</span>
              <strong>${esc(canaryStateLabel)}</strong>
            </span>
            ${
              canaryState === 'tripped'
                ? `<button type="button" class="prism-btn prism-btn-sm prism-btn-danger-solid" data-action="reset-canary" ${store.canaryBusy ? 'disabled' : ''}>
                     ${esc(tr('canary.resetAndWake'))}
                   </button>`
                : startupMode === 'manual' && !store.sessionAwake
                  ? `<button type="button" class="prism-btn prism-btn-sm prism-btn-primary" data-action="wake-skin" ${store.wakeBusy ? 'disabled' : ''}>
                       ${esc(tr('host.wakeNow'))}
                     </button>`
                  : ''
            }
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:6px">
          <span class="prism-ctl-name">${esc(tr('host.startupMode'))}</span>
          <div class="prism-startup-grid" role="radiogroup" aria-label="${esc(tr('host.startupMode'))}">
            ${startupCards
              .map(
                (sc) => `
              <button type="button" role="radio" aria-checked="${startupMode === sc.id ? 'true' : 'false'}"
                      class="prism-startup-card ${startupMode === sc.id ? 'is-active' : ''}"
                      data-startup-card="${esc(sc.id)}"
                      data-action="set-enum" data-key="startupMode" data-val="${esc(sc.id)}">
                <div class="prism-startup-card-top">
                  <span class="prism-startup-card-title">
                    <span class="prism-startup-radio" aria-hidden="true"></span>
                    <span>${esc(sc.title)}</span>
                  </span>
                  ${sc.badge ? `<span class="prism-startup-badge">[${esc(sc.badge)}]</span>` : ''}
                </div>
                <span class="prism-startup-card-desc">${esc(sc.desc)}</span>
              </button>
            `,
              )
              .join('')}
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:3px;padding-top:4px;border-top:1px solid var(--prism-border-hairline);${startupMode === 'manual' ? 'opacity:0.68' : ''}">
          ${renderSliderRow({
            key: 'liveBootDelay',
            label: tr('host.liveBootDelay'),
            value: bootDelaySec,
            defaultValue: DEFAULT_CONFIG.liveBootDelay,
            min: 0.5,
            max: 5.0,
            step: 0.1,
            scale: 1,
            decimals: 1,
            suffix: 's',
          })}
          <span id="prism-boot-delay-hint" class="prism-ctl-hint">
            ${esc(tr('host.liveBootDelayHint', { sec: bootDelaySec.toFixed(1) }))}
          </span>
        </div>

        <div id="prism-panic-shortcut-callout" class="prism-panic-callout">
          <div style="display:flex;flex-direction:column;gap:2px;min-width:0;flex:1 1 220px">
            <strong style="font-size:12px;color:var(--prism-fg)">🛡 ${esc(tr('host.panicShortcutTitle'))}</strong>
            <span style="color:var(--prism-fg-2);line-height:1.4">${esc(tr('host.panicShortcutHint'))}</span>
          </div>
          <div class="prism-kbd-group">
            <kbd class="prism-kbd">Ctrl+Alt+Shift+R</kbd>
            <span style="color:var(--prism-fg-muted);font-size:11px">/</span>
            <kbd class="prism-kbd">4× Esc</kbd>
          </div>
        </div>
      </div>

      <!-- Normal Shortcut Auto-Load & Cold-Boot Auto-Restore Card -->
      <div id="prism-autostart-card" class="prism-card" style="display:flex;flex-direction:column;gap:10px;border-color:${normalReady ? 'rgba(var(--prism-ok-rgb),0.45)' : 'rgba(var(--prism-warn-rgb),0.45)'}">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:8px">
            <span class="prism-status-dot" style="background:${normalReady ? 'var(--prism-ok)' : 'var(--prism-warn)'}"></span>
            <strong style="font-size:13px">${esc(tr('host.autostartTitle'))}</strong>
          </div>
          <span class="prism-kind-badge" style="color:${normalReady ? 'var(--prism-ok)' : 'var(--prism-warn)'};border-color:${normalReady ? 'rgba(var(--prism-ok-rgb),0.45)' : 'rgba(var(--prism-warn-rgb),0.45)'};background:${normalReady ? 'rgba(var(--prism-ok-rgb),0.14)' : 'rgba(var(--prism-warn-rgb),0.14)'}">
            ${normalReady ? '✓ AUTOSTART READY' : '◌ PENDING'}
          </span>
        </div>

        <div style="font-size:12px;color:var(--prism-fg-2);line-height:1.45">
          ${esc(normalReady ? tr('host.autostartReady') : tr('host.autostartPending'))}
        </div>

        <div id="prism-autorestore-badge" class="prism-autorestore-strip">
          <span style="color:${startupMode === 'manual' ? 'var(--prism-accent)' : 'var(--prism-ok)'};font-weight:700">${startupMode === 'manual' ? '❖' : '✓'}</span>
          <span>${esc(startupMode === 'manual' ? tr('host.startup.manualDesc') : tr('host.autoRestoreReady'))}</span>
        </div>

        ${
          shortcutsList.length > 0
            ? `
          <div class="prism-shortcut-list">
            ${shortcutsList
              .map(
                (sc) => `
              <div class="prism-shortcut-item">
                <div style="display:flex;align-items:center;gap:7px;min-width:0;flex:1">
                  <span class="prism-fmt-tag">${esc(sc.location || 'shortcut')}</span>
                  <span class="prism-shortcut-path" title="${esc(sc.path)}">${esc(sc.path || sc.name)}</span>
                </div>
                <div style="display:flex;align-items:center;gap:5px;flex-shrink:0">
                  ${
                    sc.hasDebugPort
                      ? `<span class="prism-chip" style="border-color:rgba(var(--prism-ok-rgb),0.45);color:var(--prism-ok);cursor:default">✓ :${esc(sc.debugPort || port)}</span>`
                      : `<span class="prism-chip" style="cursor:default">Stock</span>`
                  }
                  ${sc.backedUp ? `<span class="prism-chip" style="cursor:default">Backup ✓</span>` : ''}
                </div>
              </div>
            `,
              )
              .join('')}
          </div>
        `
            : ''
        }

        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
          ${
            !normalReady
              ? `
            <button type="button" class="prism-btn prism-btn-primary" data-action="set-autostart" data-enabled="true" ${auto.busy ? 'disabled' : ''}>
              ⚡ ${esc(tr('host.enableAutostart'))}
            </button>
          `
              : `
            <button type="button" class="prism-btn" data-action="set-autostart" data-enabled="true" ${auto.busy ? 'disabled' : ''}>
              ✓ ${esc(curLocale() === 'zh' ? '重新校验并同步快捷方式' : 'Re-verify Normal Shortcuts')}
            </button>
          `
          }
          <button type="button" class="prism-btn" data-action="refresh-autostart">↻ ${esc(curLocale() === 'zh' ? '刷新自启检测' : 'Check Shortcuts')}</button>
        </div>

        ${
          normalReady || (auto.patchedShortcuts && auto.patchedShortcuts.length > 0)
            ? renderConfirmRow({
                confirmKey: 'autostart:disable',
                label: tr('host.disableAutostart'),
                btnLabel: tr('host.disableAutostart'),
                action: 'exec-disable-autostart',
              })
            : ''
        }
      </div>

      <!-- Live CDP Host Connection Card -->
      <div class="prism-card" style="display:flex;flex-direction:column;gap:10px">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:8px">
            <span class="prism-status-dot" style="background:${attached ? 'var(--prism-ok)' : 'var(--prism-warn)'}"></span>
            <strong style="font-size:13px">${esc(tr('host.title'))}</strong>
          </div>
          <span class="prism-kind-badge">${esc(attached ? tr('status.connected') : tr('status.standby'))}</span>
        </div>

        <div class="prism-kv-grid">
          <div class="prism-kv-box">
            <span class="prism-kv-k">CDP State</span>
            <span class="prism-kv-v">${attached ? 'Attached' : 'Standby'} (:${esc(port)})</span>
          </div>
          <div class="prism-kv-box">
            <span class="prism-kv-k">Skin Gate</span>
            <span class="prism-kv-v">${store.skinEnabled ? tr('status.skinOn') : tr('status.skinOff')}</span>
          </div>
          <div class="prism-kv-box">
            <span class="prism-kv-k">Media Server</span>
            <span class="prism-kv-v">${esc(store.mediaOrigin || hs.mediaOrigin || '127.0.0.1')}</span>
          </div>
          <div class="prism-kv-box">
            <span class="prism-kv-k">Sidecar Engine</span>
            <span class="prism-kv-v">v${esc(store.version)}${store.pid ? ` · PID ${store.pid}` : ''}</span>
          </div>
        </div>

        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
          <button type="button" class="prism-btn" data-action="create-shortcut">
            🔗 ${esc(tr('host.createShortcut'))}
          </button>
          ${
            !store.skinEnabled
              ? `<button type="button" class="prism-btn prism-btn-primary" data-action="enable-skin">✦ ${esc(tx('skinReapply'))}</button>`
              : ''
          }
          <button type="button" class="prism-btn" data-action="refresh-status">↻ Poll Status</button>
        </div>

        ${renderSegRow({
          key: 'triggerMode',
          label: tr('host.triggerMode'),
          value: store.config.triggerMode,
          options: [
            { value: 'both', label: tr('host.trigger.both') },
            { value: 'pill', label: tr('host.trigger.pill') },
            { value: 'corner', label: tr('host.trigger.corner') },
            { value: 'shortcut-only', label: tr('host.trigger.shortcut') },
          ],
        })}

        ${renderSwitchRow({
          key: 'transparentWindowControls',
          label: tr('layout.transparentWindowControls'),
          hint: tr('layout.transparentWindowControlsHint'),
          checked: store.config.transparentWindowControls !== false,
        })}
      </div>

      <div class="prism-settings-columns">
        <!-- Storage Paths & Server-Side Folder Browser -->
        <div class="prism-card" style="display:flex;flex-direction:column;gap:8px">
          <strong style="font-size:12.5px">${esc(tr('host.storageTitle'))}</strong>

          <div class="prism-ctl-row">
            <div class="prism-ctl-label">
              <span class="prism-ctl-name">${esc(tr('host.uploadDir'))}</span>
              <span class="prism-ctl-hint" style="word-break:break-all">${esc(store.config.uploadDir || store.stats.uploadDir || `${defaultBaseDataDir}/uploads`)}</span>
            </div>
            <button type="button" class="prism-btn prism-btn-sm" data-action="open-fs-browser" data-kind="uploadDir">📂 ${esc(tr('host.browse'))}</button>
          </div>

          <div class="prism-ctl-row">
            <div class="prism-ctl-label">
              <span class="prism-ctl-name">${esc(tr('host.cacheDir'))}</span>
              <span class="prism-ctl-hint" style="word-break:break-all">${esc(store.config.cacheDir || store.stats.cacheDir || `${defaultBaseDataDir}/cache`)}</span>
            </div>
            <button type="button" class="prism-btn prism-btn-sm" data-action="open-fs-browser" data-kind="cacheDir">📂 ${esc(tr('host.browse'))}</button>
          </div>

          <div style="padding-top:6px;border-top:1px solid var(--prism-border-hairline);display:flex;flex-direction:column;gap:6px">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span class="prism-ctl-name">${esc(tr('host.customFolders'))}</span>
              <button type="button" class="prism-btn prism-btn-sm prism-btn-primary" data-action="open-fs-browser" data-kind="addCustomFolder">
                ＋ ${esc(tx('addFolder'))}
              </button>
            </div>
            ${
              (store.config.customFolders || []).length === 0
                ? `<span class="prism-ctl-hint">${esc(tx('noCustomFolders'))}</span>`
                : (store.config.customFolders || [])
                    .map((folder, idx) =>
                      renderConfirmRow({
                        confirmKey: `rm-folder:${idx}`,
                        label: folder,
                        btnLabel: tx('removeFolder'),
                        danger: true,
                        action: 'remove-custom-folder',
                        payload: folder,
                      }),
                    )
                    .join('')
            }
          </div>
        </div>

        <!-- Library Telemetry & Stats -->
        <div class="prism-card" style="display:flex;flex-direction:column;gap:8px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <strong style="font-size:12.5px">Library Telemetry</strong>
            <button type="button" class="prism-btn prism-btn-sm" data-action="refresh-library">↻ ${esc(tr('lib.refresh'))}</button>
          </div>
          <div class="prism-kv-grid">
            <div class="prism-kv-box">
              <span class="prism-kv-k">${esc(tx('statsTotal'))}</span>
              <span class="prism-kv-v">${model.totalPlayable}</span>
            </div>
            <div class="prism-kv-box">
              <span class="prism-kv-k">${esc(tx('statsWorkshop'))}</span>
              <span class="prism-kv-v">${model.workshopCount}</span>
            </div>
            <div class="prism-kv-box">
              <span class="prism-kv-k">${esc(tx('statsUploads'))}</span>
              <span class="prism-kv-v">${model.localCount}</span>
            </div>
            <div class="prism-kv-box">
              <span class="prism-kv-k">${esc(tx('statsSteam'))}</span>
              <span class="prism-kv-v">${esc(store.stats.steamRoot || (store.stats.steamFound ? 'Detected' : 'Local Mode'))}</span>
            </div>
          </div>
        </div>

        <!-- 3-Tier Non-Destructive Reset + Restore Host Default (Zero window.confirm!) -->
        <div class="prism-card span-full" style="display:flex;flex-direction:column;gap:7px">
          <strong style="font-size:12.5px">${esc(tr('host.dangerTitle'))}</strong>
          ${renderConfirmRow({
            confirmKey: 'reset:skin',
            label: tr('host.resetSkin'),
            btnLabel: '↺ Skin',
            action: 'exec-reset-scope',
            payload: 'skin',
          })}
          ${renderConfirmRow({
            confirmKey: 'reset:optics',
            label: tr('host.resetOptics'),
            btnLabel: '↺ Optics',
            action: 'exec-reset-scope',
            payload: 'optics',
          })}
          ${renderConfirmRow({
            confirmKey: 'reset:playback',
            label: tr('host.resetPlayback'),
            btnLabel: '↺ Playback',
            action: 'exec-reset-scope',
            payload: 'playback',
          })}
          ${renderConfirmRow({
            confirmKey: 'reset:all',
            label: tr('host.resetAll'),
            btnLabel: '↺ Reset All',
            danger: true,
            action: 'exec-reset-scope',
            payload: 'all',
          })}
          ${renderConfirmRow({
            confirmKey: 'restore:host',
            label: tr('host.restoreSkin'),
            btnLabel: tr('host.restoreSkin'),
            danger: true,
            action: 'exec-restore-host',
          })}
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // Slide-Over Drawers: Playlist CRUD, Wallpaper Inspector, Hidden, FS Browser
  // ==========================================================================
  function renderDrawerHtml() {
    if (!store.drawer) return '';

    if (store.drawer === 'hidden') {
      const model = computeLibraryModel();
      return `
        <div class="prism-drawer-backdrop" data-action="backdrop-close">
          <aside class="prism-drawer">
            <div class="prism-drawer-head">
              <span class="prism-drawer-title">🙈 ${esc(tr('lib.hidden'))} (${model.hiddenItems.length})</span>
              <button type="button" class="prism-icon-btn" data-action="close-drawer">✕</button>
            </div>
            <div class="prism-drawer-body">
              ${
                model.hiddenItems.length === 0
                  ? `<div class="prism-empty-state">${esc(curLocale() === 'zh' ? '当前没有已隐藏的壁纸' : 'No hidden wallpapers')}</div>`
                  : model.hiddenItems
                      .map(
                        (it) => `
                    <div class="prism-confirm-row">
                      <div style="display:flex;align-items:center;gap:8px;min-width:0">
                        ${it.thumbUrl ? `<img src="${esc(it.thumbUrl)}" alt="" onerror="this.remove()" style="width:42px;height:28px;object-fit:cover;border-radius:4px" />` : ''}
                        <span style="font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(it.title || it.id)}</span>
                      </div>
                      <button type="button" class="prism-btn prism-btn-sm" data-action="unhide-item" data-id="${esc(it.id)}">${esc(tr('lib.restoreOne'))}</button>
                    </div>
                  `,
                      )
                      .join('')
              }
            </div>
            <div class="prism-drawer-foot">
              ${
                model.hiddenItems.length > 0
                  ? `<button type="button" class="prism-btn prism-btn-primary" data-action="unhide-all">${esc(tr('lib.restoreAllHidden'))}</button>`
                  : ''
              }
              <button type="button" class="prism-btn" data-action="close-drawer">${esc(tr('common.close'))}</button>
            </div>
          </aside>
        </div>
      `;
    }

    if (store.drawer === 'playlist') {
      const groups = store.config.rotationGroups || [];
      const model = computeLibraryModel();
      const d = store.playlistDraft;
      const intervals = [1, 5, 15, 30, 60, 120, 360, 1440];

      return `
        <div class="prism-drawer-backdrop" data-action="backdrop-close">
          <aside class="prism-drawer">
            <div class="prism-drawer-head">
              <span class="prism-drawer-title">↻ ${esc(tr('lib.playlists'))}</span>
              <button type="button" class="prism-icon-btn" data-action="close-drawer">✕</button>
            </div>
            <div class="prism-drawer-body">
              ${renderSwitchRow({
                key: 'rotationEnabled',
                label: tr('playlist.enable'),
                checked: store.config.rotationEnabled,
              })}
              ${renderSegRow({
                key: 'rotationOrder',
                label: 'Order',
                value: store.config.rotationOrder,
                options: [
                  { value: 'sequence', label: tr('playlist.order.sequence') },
                  { value: 'random', label: tr('playlist.order.random') },
                ],
              })}
              ${renderSegRow({
                key: 'rotationTrigger',
                label: 'Trigger',
                value: store.config.rotationTrigger,
                options: [
                  { value: 'interval', label: tr('playlist.trigger.interval') },
                  { value: 'videoEnd', label: tr('playlist.trigger.videoEnd') },
                ],
              })}
              ${
                store.config.rotationTrigger === 'interval'
                  ? `
                <div style="display:flex;flex-direction:column;gap:5px">
                  <div style="display:flex;justify-content:space-between;align-items:center">
                    <span class="prism-ctl-name">${esc(tr('playlist.intervalMin'))}</span>
                    <input id="prism-rot-interval-in" type="number" min="1" max="1440" class="prism-input" style="width:78px"
                           value="${store.config.rotationInterval}" data-action="change-rot-interval" />
                  </div>
                  <div class="prism-filter-group">
                    ${intervals
                      .map(
                        (m) => `
                      <button type="button" class="prism-chip ${store.config.rotationInterval === m ? 'is-active' : ''}"
                              data-action="set-num" data-key="rotationInterval" data-val="${m}">${m}m</button>
                    `,
                      )
                      .join('')}
                  </div>
                </div>
              `
                  : ''
              }

              <!-- Saved Playlists + WE Import -->
              <div style="padding-top:8px;border-top:1px solid var(--prism-border-hairline);display:flex;flex-direction:column;gap:6px">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap">
                  <strong style="font-size:12px">Playlists (${groups.length})</strong>
                  <div style="display:flex;gap:4px">
                    <button type="button" class="prism-btn prism-btn-sm" data-action="import-we-playlist">📥 ${esc(tr('playlist.importWe'))}</button>
                    <button type="button" class="prism-btn prism-btn-sm" data-action="new-playlist-draft">＋ ${esc(tr('playlist.new'))}</button>
                  </div>
                </div>
                ${groups
                  .map((g) => {
                    const isAct = store.config.rotationGroupId === g.id;
                    const delKey = `del-pl:${g.id}`;
                    const armed = store.armedConfirm?.key === delKey;
                    return `
                      <div class="prism-confirm-row" style="border-color:${isAct ? 'var(--prism-accent)' : 'var(--prism-border-hairline)'}">
                        <div style="min-width:0">
                          <div style="font-weight:600;font-size:12px">${esc(g.name)} (${g.wallpaperIds.length})</div>
                          <div style="font-size:10.5px;color:var(--prism-fg-muted)">${esc(g.order)} · ${esc(g.trigger === 'videoEnd' ? 'videoEnd' : `${g.interval}m`)}</div>
                        </div>
                        <div style="display:flex;gap:4px">
                          <button type="button" class="prism-btn prism-btn-sm ${isAct ? 'prism-btn-primary' : ''}"
                                  data-action="activate-playlist" data-id="${esc(g.id)}">${esc(tr('common.apply'))}</button>
                          <button type="button" class="prism-btn prism-btn-sm"
                                  data-action="edit-playlist" data-id="${esc(g.id)}">✎</button>
                          ${
                            armed
                              ? `<button type="button" class="prism-btn prism-btn-sm prism-btn-danger" data-action="delete-playlist" data-payload="${esc(g.id)}">✓</button>`
                              : `<button type="button" class="prism-btn prism-btn-sm" data-action="arm-confirm" data-confirm-key="${esc(delKey)}">🗑</button>`
                          }
                        </div>
                      </div>
                    `;
                  })
                  .join('')}
              </div>

              <!-- Playlist Editor + Card Multi-Select -->
              <div style="padding-top:8px;border-top:1px solid var(--prism-border-hairline);display:flex;flex-direction:column;gap:7px">
                <div style="display:flex;gap:6px;align-items:center">
                  <input id="prism-pl-name-in" type="text" class="prism-input" style="flex:1"
                         placeholder="${esc(tx('playlistNamePlaceholder'))}" value="${esc(d.name)}" />
                  <span class="prism-chip">${d.pickedIds.size} picked</span>
                </div>
                <div style="display:flex;gap:5px">
                  <button type="button" class="prism-btn prism-btn-sm" data-action="pl-pick-all">Select Visible</button>
                  <button type="button" class="prism-btn prism-btn-sm" data-action="pl-pick-clear">Clear</button>
                </div>
                <div class="prism-mini-picker-grid">
                  ${model.visibleItems
                    .slice(0, 180)
                    .map((it) => {
                      const picked = d.pickedIds.has(it.id);
                      const thumb = it.thumbUrl || (it.kind === 'image' ? itemMediaThumb(it) : '');
                      return `
                        <div class="prism-mini-pick-item ${picked ? 'is-picked' : ''}"
                             data-action="toggle-pl-pick" data-id="${esc(it.id)}">
                          ${thumb ? `<img loading="lazy" src="${esc(thumb)}" alt="" onerror="this.remove()" />` : `<div style="aspect-ratio:16/10;background:rgba(var(--prism-accent-rgb),0.18)"></div>`}
                          <div class="prism-mini-pick-name">${picked ? '✓ ' : ''}${esc(it.title || it.id)}</div>
                        </div>
                      `;
                    })
                    .join('')}
                </div>
              </div>
            </div>
            <div class="prism-drawer-foot">
              <button type="button" class="prism-btn prism-btn-primary" data-action="save-playlist-draft">💾 Save Playlist</button>
              <button type="button" class="prism-btn" data-action="close-drawer">${esc(tr('common.close'))}</button>
            </div>
          </aside>
        </div>
      `;
    }

    if (store.drawer === 'inspector') {
      const targetId = store.inspectWallpaperId || getActiveId();
      const item = store.items.find((x) => x.id === targetId) || store.activeItem;
      if (!item) {
        return '';
      }
      const propsList = normalizeWeProperties(item.properties);
      const savedUserProps = store.config.userProps?.[item.id] || {};
      const valuesMap = {};
      for (const p of propsList) {
        valuesMap[p.key] = p.key in savedUserProps ? savedUserProps[p.key] : p.defaultValue;
      }
      const pinned = hasPerWallpaperPin(item.id);
      const isFav = (store.config.favorites || []).includes(item.id);
      const rmUploadKey = `rm-upload:${item.id}`;

      return `
        <div class="prism-drawer-backdrop" data-action="backdrop-close">
          <aside class="prism-drawer">
            <div class="prism-drawer-head">
              <span class="prism-drawer-title">⚙ ${esc(tr('lib.inspector'))}</span>
              <button type="button" class="prism-icon-btn" data-action="close-drawer">✕</button>
            </div>
            <div class="prism-drawer-body">
              <div class="prism-card" style="display:flex;flex-direction:column;gap:7px">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
                  <strong style="font-size:13px">${esc(item.title || item.id)}</strong>
                  <button type="button" class="prism-btn prism-btn-sm ${isFav ? 'prism-btn-primary' : ''}"
                          data-action="toggle-fav" data-id="${esc(item.id)}">★ ${esc(tr('lib.favorites'))}</button>
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:5px">
                  <span class="prism-chip">${esc(tr(`kind.${item.kind}`) || item.kind)}</span>
                  <span class="prism-chip">${esc(item.source)}</span>
                  ${item.resolution ? `<span class="prism-chip">${esc(item.resolution)}</span>` : ''}
                  ${item.fileSize ? `<span class="prism-chip">${esc(formatBytes(item.fileSize))}</span>` : ''}
                  ${item.workshopId ? `<span class="prism-chip">ID ${esc(item.workshopId)}</span>` : ''}
                </div>
                ${
                  Array.isArray(item.tags) && item.tags.length > 0
                    ? `<div style="display:flex;flex-wrap:wrap;gap:4px">${item.tags.map((tg) => `<span class="prism-fmt-tag">#${esc(tg)}</span>`).join('')}</div>`
                    : ''
                }
                <div class="prism-ctl-row">
                  <span class="prism-ctl-name">📌 ${esc(tr('lib.pinOverride'))}</span>
                  <button type="button" role="switch" class="prism-switch" aria-checked="${pinned ? 'true' : 'false'}"
                          data-action="toggle-pin-for" data-id="${esc(item.id)}"></button>
                </div>
                ${
                  item.source === 'upload'
                    ? renderConfirmRow({
                        confirmKey: rmUploadKey,
                        label: curLocale() === 'zh' ? '删除此本地上传文件' : 'Delete uploaded media file',
                        btnLabel: tr('preset.delete'),
                        danger: true,
                        action: 'remove-upload',
                        payload: item.id,
                      })
                    : ''
                }
              </div>

              <!-- WE project.json Properties with Live Condition Evaluation -->
              <div class="prism-card" style="display:flex;flex-direction:column;gap:6px">
                <strong style="font-size:12.5px">${esc(tx('wePropsTitle'))}</strong>
                ${
                  propsList.length === 0
                    ? `<span class="prism-ctl-hint">${esc(tx('wePropsEmpty'))}</span>`
                    : propsList
                        .filter((p) => evaluateWeCondition(p.condition, valuesMap))
                        .map((p) => {
                          const curVal = valuesMap[p.key];
                          if (p.type === 'text' || p.type === 'group') {
                            return `<div class="prism-section-tag" style="padding-top:6px">${esc(p.label)}</div>`;
                          }
                          if (p.type === 'bool') {
                            return `
                              <div class="prism-ctl-row">
                                <span class="prism-ctl-name">${esc(p.label)}</span>
                                <button type="button" role="switch" class="prism-switch" aria-checked="${curVal ? 'true' : 'false'}"
                                        data-action="we-prop-bool" data-wid="${esc(item.id)}" data-prop="${esc(p.key)}"></button>
                              </div>
                            `;
                          }
                          if (p.type === 'color') {
                            const hex = weColorToHex(String(curVal || '')) || '#669DF6';
                            return `
                              <div class="prism-ctl-row">
                                <span class="prism-ctl-name">${esc(p.label)}</span>
                                <input type="color" class="prism-color-input" value="${esc(hex)}"
                                       data-action="we-prop-color" data-wid="${esc(item.id)}" data-prop="${esc(p.key)}"
                                       data-orig-fmt="${String(curVal || '').startsWith('#') ? 'hex' : 'we'}" />
                              </div>
                            `;
                          }
                          if (p.type === 'combo' && p.options.length > 0) {
                            return `
                              <div class="prism-ctl-row">
                                <span class="prism-ctl-name">${esc(p.label)}</span>
                                <select class="prism-input" data-action="we-prop-combo" data-wid="${esc(item.id)}" data-prop="${esc(p.key)}">
                                  ${p.options
                                    .map(
                                      (o, oi) => `
                                    <option value="${oi}" ${String(o.value) === String(curVal) ? 'selected' : ''}>${esc(o.label)}</option>
                                  `,
                                    )
                                    .join('')}
                                </select>
                              </div>
                            `;
                          }
                          if (p.type === 'slider') {
                            const numV = Number.isFinite(Number(curVal)) ? Number(curVal) : p.min;
                            const { pct, display } = sliderMeta(numV, p.min, p.max, p.step < 1 ? 2 : 0, '');
                            return `
                              <div class="prism-slider-row" data-dirty="${numV !== Number(p.defaultValue) ? 'true' : 'false'}">
                                <span class="prism-slider-label">${esc(p.label)}</span>
                                <span class="prism-slider-val">${esc(display)}</span>
                                <button type="button" class="prism-reset-btn" data-action="we-prop-reset"
                                        data-wid="${esc(item.id)}" data-prop="${esc(p.key)}">↺</button>
                                <input type="range" class="prism-range" min="${p.min}" max="${p.max}" step="${p.step}" value="${numV}"
                                       style="--prism-pct:${pct}%" data-we-slider="${esc(p.key)}" data-wid="${esc(item.id)}" />
                              </div>
                            `;
                          }
                          return `
                            <div class="prism-ctl-row">
                              <span class="prism-ctl-name">${esc(p.label)}</span>
                              <input type="text" class="prism-input" value="${esc(curVal ?? '')}"
                                     data-action="we-prop-text" data-wid="${esc(item.id)}" data-prop="${esc(p.key)}" />
                            </div>
                          `;
                        })
                        .join('')
                }
              </div>
            </div>
            <div class="prism-drawer-foot">
              <button type="button" class="prism-btn prism-btn-primary" data-action="apply-wallpaper" data-id="${esc(item.id)}">
                ✦ ${esc(tr('common.apply'))}
              </button>
              <button type="button" class="prism-btn" data-action="close-drawer">${esc(tr('common.close'))}</button>
            </div>
          </aside>
        </div>
      `;
    }

    if (store.drawer === 'fs') {
      const fb = store.fsBrowser;
      return `
        <div class="prism-drawer-backdrop" data-action="backdrop-close">
          <aside class="prism-drawer">
            <div class="prism-drawer-head">
              <span class="prism-drawer-title">📂 ${esc(tr('host.browse'))}</span>
              <button type="button" class="prism-icon-btn" data-action="close-drawer">✕</button>
            </div>
            <div class="prism-drawer-body">
              <div class="prism-filter-group">
                ${(fb.quickRoots || [])
                  .map(
                    (qr) => `
                  <button type="button" class="prism-chip" data-action="fs-nav" data-path="${esc(qr.path || qr)}">
                    ${esc(qr.label || qr.name || qr.path || qr)}
                  </button>
                `,
                  )
                  .join('')}
                ${
                  fb.parent
                    ? `<button type="button" class="prism-chip" data-action="fs-nav" data-path="${esc(fb.parent)}">⬆ ${esc(tx('fsUp'))}</button>`
                    : ''
                }
              </div>

              <div style="display:flex;gap:6px">
                <input id="prism-fs-path-in" type="text" class="prism-input" style="flex:1;font-family:var(--prism-font-mono)"
                       value="${esc(fb.current)}" />
                <button type="button" class="prism-btn" data-action="fs-jump-input">Go</button>
              </div>

              <div class="prism-fs-list">
                ${
                  fb.loading
                    ? `<div style="padding:14px;color:var(--prism-fg-muted)">Loading…</div>`
                    : (fb.entries || []).length === 0
                      ? `<div style="padding:14px;color:var(--prism-fg-muted)">${esc(tx('fsEmpty'))}</div>`
                      : (fb.entries || [])
                          .map((ent) => {
                            const ePath = typeof ent === 'string' ? ent : ent.path;
                            const eName = typeof ent === 'string' ? ent : ent.name || ent.path;
                            return `
                              <button type="button" class="prism-fs-item" data-action="fs-nav" data-path="${esc(ePath)}">
                                <span>📁</span>
                                <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(eName)}</span>
                              </button>
                            `;
                          })
                          .join('')
                }
              </div>
            </div>
            <div class="prism-drawer-foot">
              <button type="button" class="prism-btn prism-btn-primary" data-action="fs-confirm-select">
                ✓ ${esc(tx('fsSelectCurrent'))}
              </button>
              <button type="button" class="prism-btn" data-action="close-drawer">${esc(tr('common.close'))}</button>
            </div>
          </aside>
        </div>
      `;
    }

    return '';
  }

  function itemMediaThumb(it) {
    return it.thumbUrl || it.mediaUrl || '';
  }

  // ==========================================================================
  // Shell Mount & Surgical Partial Updates
  // ==========================================================================
  function renderToastStack() {
    const host = document.getElementById('prism-toast-host');
    if (!host) return;
    host.innerHTML = store.toasts
      .map(
        (item) => `
      <div class="prism-toast" data-tone="${esc(item.tone)}">
        <span>${item.tone === 'ok' ? '✓' : item.tone === 'warn' ? '⚠' : item.tone === 'danger' ? '✕' : '◆'}</span>
        <span>${esc(item.message)}</span>
      </div>
    `,
      )
      .join('');
  }

  function renderAutostartBannerHtml() {
    const out = [];
    const canaryTripped = store.canary?.state === 'tripped';
    const isManualSleeping = !canaryTripped && store.config.startupMode === 'manual' && !store.sessionAwake;

    if (canaryTripped) {
      out.push(`
        <div id="prism-canary-tripped-banner" class="prism-autostart-banner prism-safety-banner" data-tone="tripped" role="alert">
          <div style="display:flex;align-items:flex-start;gap:8px;min-width:0;flex:1 1 260px">
            <span class="prism-status-dot" style="background:var(--prism-danger);margin-top:4px;flex-shrink:0"></span>
            <div style="display:flex;flex-direction:column;gap:2px;min-width:0">
              <strong style="font-size:12px;color:var(--prism-danger)">${esc(tr('canary.trippedBannerTitle'))}</strong>
              <span style="color:var(--prism-fg-2);line-height:1.4">${esc(tr('canary.trippedBannerDesc'))}${store.canary.trippedReason ? ` (${esc(store.canary.trippedReason)})` : ''}</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
            <button id="prism-canary-reset-btn" type="button" class="prism-btn prism-btn-sm prism-btn-danger-solid"
                    data-action="reset-canary" ${store.canaryBusy ? 'disabled' : ''}>
              ${esc(tr('canary.resetAndWake'))}
            </button>
          </div>
        </div>
      `);
    } else if (isManualSleeping) {
      out.push(`
        <div id="prism-manual-wake-banner" class="prism-autostart-banner prism-safety-banner" data-tone="manual-wake">
          <div style="display:flex;align-items:center;gap:8px;min-width:0;flex:1 1 240px">
            <span class="prism-status-dot" style="background:var(--prism-accent);flex-shrink:0"></span>
            <div style="display:flex;flex-wrap:wrap;align-items:baseline;gap:6px;min-width:0">
              <strong style="font-size:12px;color:var(--prism-fg)">${esc(tr('host.wakeBannerTitle'))}</strong>
              <span style="color:var(--prism-fg-2)">${esc(tr('host.wakeBannerDesc'))}</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
            <button id="prism-manual-wake-btn" type="button" class="prism-btn prism-btn-sm prism-btn-primary"
                    data-action="wake-skin" ${store.wakeBusy ? 'disabled' : ''}>
              ${esc(tr('host.wakeNow'))}
            </button>
          </div>
        </div>
      `);
    }

    const attached = isHostAttached();
    if (!canaryTripped && !isManualSleeping && !attached && !store.autostart.bannerDismissed) {
      const ready = Boolean(store.autostart.normalShortcutEnabled);
      out.push(`
        <div class="prism-autostart-banner" data-tone="${ready ? 'ready' : 'pending'}">
          <div style="display:flex;align-items:center;gap:7px;min-width:0;flex:1 1 220px">
            <span class="prism-status-dot" style="background:${ready ? 'var(--prism-ok)' : 'var(--prism-warn)'}"></span>
            <span style="overflow:hidden;text-overflow:ellipsis">${esc(ready ? tr('host.autostartReady') : tr('host.autostartPending'))}</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
            ${
              !ready
                ? `<button type="button" class="prism-btn prism-btn-sm prism-btn-primary"
                           data-action="set-autostart" data-enabled="true" ${store.autostart.busy ? 'disabled' : ''}>
                     ⚡ ${esc(tr('host.enableAutostart'))}
                   </button>`
                : `<button type="button" class="prism-btn prism-btn-sm" data-action="switch-tab" data-tab="system">
                     ✓ ${esc(curLocale() === 'zh' ? '查看自启详情' : 'Details')}
                   </button>`
            }
            <button type="button" class="prism-icon-btn" style="width:22px;height:22px"
                    data-action="dismiss-autostart-banner" title="${esc(tr('common.close'))}">✕</button>
          </div>
        </div>
      `);
    }

    return out.join('');
  }

  function updateTopStatusIndicators() {
    const masterBtn = document.getElementById('prism-master-toggle-btn');
    const masterTxt = document.getElementById('prism-master-toggle-text');
    if (masterBtn) {
      const enabledStr = store.skinEnabled ? 'true' : 'false';
      const busyStr = store.masterToggleBusy ? 'true' : 'false';
      masterBtn.setAttribute('aria-checked', enabledStr);
      masterBtn.dataset.enabled = enabledStr;
      masterBtn.setAttribute('aria-busy', busyStr);
      masterBtn.dataset.busy = busyStr;
      masterBtn.title = getMasterToggleHint(store.skinEnabled);
    }
    if (masterTxt) {
      masterTxt.textContent = getMasterToggleLabel(store.skinEnabled);
    }
    const pill = document.getElementById('prism-top-status-pill');
    const txt = document.getElementById('prism-top-status-text');
    const attached = isHostAttached();
    const canaryTripped = store.canary?.state === 'tripped';
    const isManualSleeping = !canaryTripped && store.config.startupMode === 'manual' && !store.sessionAwake;
    if (pill && txt) {
      const ready = Boolean(store.autostart.normalShortcutEnabled);
      if (canaryTripped) {
        pill.dataset.status = 'tripped';
        txt.textContent = tr('canary.state.tripped');
      } else if (isManualSleeping) {
        pill.dataset.status = 'manual';
        txt.textContent = tr('host.startup.manual');
      } else {
        pill.dataset.status = !store.skinEnabled ? 'off' : attached ? 'attached' : 'standby';
        txt.textContent = !store.skinEnabled
          ? tr('status.skinOff')
          : attached
            ? tr('status.connected')
            : ready
              ? `${tr('status.standby')} · ✓`
              : tr('status.standby');
      }
    }
    const bannerHost = document.getElementById('prism-autostart-banner-host');
    if (bannerHost) {
      bannerHost.innerHTML = renderAutostartBannerHtml();
    }
    const railCdp = document.getElementById('rail-cdp-chip');
    if (railCdp) {
      railCdp.className = `prism-chip ${attached ? 'is-active' : ''}`;
      railCdp.textContent = attached
        ? (curLocale() === 'zh' ? '● CDP 已连接' : '● CDP Attached')
        : (curLocale() === 'zh' ? '◌ CDP 待机' : '◌ CDP Standby');
    }
  }

  function renderTransportBarHtml() {
    const eff = getEffectiveConfig();
    const item = store.activeItem || store.items.find((x) => x.id === getActiveId());
    const activeGroup = (store.config.rotationGroups || []).find((g) => g.id === store.config.rotationGroupId);
    const playlistLabel = store.config.rotationEnabled
      ? activeGroup
        ? `↻ ${activeGroup.name}`
        : `↻ ${store.config.rotationInterval}m`
      : tr('transport.playlistNone');
    const volPct = Math.round((eff.volume ?? 0.5) * 100);
    const isFav = item && (store.config.favorites || []).includes(item.id);

    return `
      <div class="prism-now-meta">
        <span class="prism-kind-badge">${esc(item ? tr(`kind.${item.kind}`) || item.kind : 'PRISM')}</span>
        <span class="prism-now-title" title="${esc(item?.title || 'Obsidian Prism Aurora')}">${esc(item?.title || 'Obsidian Prism Aurora')}</span>
      </div>
      <div class="prism-transport-ctls">
        <button type="button" class="prism-icon-btn" data-action="step-playlist" data-dir="-1" title="${esc(tr('transport.prev'))}">⏮</button>
        <button type="button" class="prism-icon-btn ${!eff.paused ? 'is-active' : ''}" data-action="toggle-pause"
                title="${esc(eff.paused ? tr('transport.play') : tr('transport.pause'))}">${eff.paused ? '▶' : '⏸'}</button>
        <button type="button" class="prism-icon-btn" data-action="step-playlist" data-dir="1" title="${esc(tr('transport.next'))}">⏭</button>
        <button type="button" class="prism-icon-btn ${!eff.muted ? 'is-active' : ''}" data-action="toggle-mute"
                title="${esc(eff.muted ? tr('transport.unmute') : tr('transport.mute'))}">${eff.muted ? '🔇' : '🔊'}</button>
        <div class="prism-vol-inline">
          <input type="range" class="prism-range" min="0" max="100" step="5" value="${volPct}"
                 style="--prism-pct:${volPct}%" data-config-slider="volume" data-inline-vol="true" />
        </div>
        ${
          item
            ? `<button type="button" class="prism-icon-btn ${isFav ? 'is-active' : ''}"
                       data-action="toggle-fav" data-id="${esc(item.id)}" title="${esc(tr('lib.favorites'))}">★</button>`
            : ''
        }
        <button type="button" class="prism-playlist-pill" data-enabled="${store.config.rotationEnabled ? 'true' : 'false'}"
                data-action="open-drawer" data-drawer="playlist" title="${esc(tr('lib.playlists'))}">
          ${esc(playlistLabel)}
        </button>
      </div>
    `;
  }

  function computeQuickQueueItems(limit = 4) {
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
    for (let i = 0; i < playable.length && out.length < limit; i++) {
      pushUnique(playable[(actIdx + i) % playable.length]);
    }
    return out;
  }

  function renderRailExtrasHtml() {
    const eff = getEffectiveConfig();
    const isZh = curLocale() === 'zh';
    const activeId = getActiveId();
    const item = store.activeItem || store.items.find((x) => x.id === activeId);
    const attached = isHostAttached();
    const queueSlots = computeQuickQueueItems(4);
    const rotEnabled = Boolean(store.config.rotationEnabled);
    const rotMode = !rotEnabled
      ? 'off'
      : store.config.rotationTrigger === 'videoEnd'
        ? 'videoEnd'
        : store.config.rotationOrder === 'sequence'
          ? 'sequence'
          : 'random';

    return `
      <!-- 1. Canonical Scene Presets Card (Single Instance Across Studio) -->
      <div id="prism-rail-scene-card" class="prism-card" style="display:flex;flex-direction:column;gap:7px;padding:10px 12px">
        <span class="prism-section-tag">✦ ${esc(tr('preset.sceneTitle'))}</span>
        ${renderScenePresetsHtml(eff)}
      </div>

      <!-- 2. Active Media Telemetry & Quick Optics Card -->
      <div id="prism-rail-optics-card" class="prism-card prism-rail-optics-card prism-rail-desktop-only">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:6px">
          <span class="prism-section-tag">${esc(isZh ? '当前壁纸详情与光学速调' : 'Active Media & Quick Optics')}</span>
          ${
            activeId
              ? `<button type="button" class="prism-btn prism-btn-sm" data-action="open-inspector" data-id="${esc(activeId)}">⚙ ${esc(tx('inspectorBtn'))}</button>`
              : ''
          }
        </div>

        <div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center">
          <span class="prism-chip" style="cursor:default">${esc(item ? tr(`kind.${item.kind}`) || item.kind : 'PRISM')}</span>
          ${item?.resolution ? `<span class="prism-chip" style="cursor:default">${esc(item.resolution)}</span>` : ''}
          ${item?.fileSize ? `<span class="prism-chip" style="cursor:default">${esc(formatBytes(item.fileSize))}</span>` : ''}
          ${item?.workshopId ? `<span class="prism-chip" style="cursor:default">WS #${esc(item.workshopId)}</span>` : ''}
        </div>

        <div id="rail-extracted-chips">${renderExtractedSwatchesHtml()}</div>

        ${renderSegRow({
          key: 'fit',
          label: isZh ? '填充' : 'Fit',
          value: eff.fit,
          options: [
            { value: 'cover', label: 'Cover' },
            { value: 'contain', label: 'Contain' },
            { value: 'fill', label: 'Fill' },
          ],
        })}

        ${renderSliderRow({
          key: 'glassOpacity',
          label: isZh ? '界面透光度' : 'Glass Opacity',
          value: eff.glassOpacity,
          defaultValue: DEFAULT_CONFIG.glassOpacity,
          min: 0.30,
          max: 0.98,
          step: 0.01,
          scale: 100,
          decimals: 0,
          suffix: ' %',
        })}
        ${renderSliderRow({
          key: 'sidebarOpacity',
          label: isZh ? '侧栏玻璃不透明度' : 'Sidebar Opacity',
          value: eff.sidebarOpacity,
          defaultValue: DEFAULT_CONFIG.glassOpacity,
          min: 0.20,
          max: 0.98,
          step: 0.01,
          scale: 100,
          decimals: 0,
          suffix: ' %',
          nullableFallbackKey: 'glassOpacity',
          fallbackValue: eff.glassOpacity,
        })}
        ${renderSliderRow({
          key: 'scrimOpacity',
          label: isZh ? '背景压暗遮罩' : 'Contrast Scrim',
          value: eff.scrimOpacity,
          defaultValue: DEFAULT_CONFIG.scrimOpacity,
          min: 0,
          max: 0.92,
          step: 0.01,
          scale: 100,
          decimals: 0,
          suffix: ' %',
        })}
        ${renderSliderRow({
          key: 'mediaBlur',
          label: isZh ? '壁纸柔焦模糊' : 'Wallpaper Blur',
          value: eff.mediaBlur,
          defaultValue: DEFAULT_CONFIG.mediaBlur,
          min: 0,
          max: 64,
          step: 1,
          suffix: ' px',
        })}
      </div>

      <!-- 3. Playlist Queue & Smart Power Dock (flex: 1 fills bottom of Left Rail) -->
      <div id="prism-rail-dock-card" class="prism-card prism-rail-dock-card prism-rail-desktop-only">
        <div style="display:flex;flex-direction:column;gap:8px">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:6px">
            <span class="prism-section-tag">${esc(isZh ? '轮播队列与节能状态' : 'Playlist Queue & Smart Power')}</span>
            <button type="button" class="prism-btn prism-btn-sm" data-action="open-drawer" data-drawer="playlist">
              ↻ ${esc(tr('lib.playlists'))}
            </button>
          </div>

          ${
            queueSlots.length > 0
              ? `
            <div class="prism-rail-queue-strip">
              ${queueSlots
                .map((qIt) => {
                  const qThumb = qIt.thumbUrl || (qIt.kind === 'image' ? qIt.mediaUrl : '');
                  const qAct = qIt.id === activeId;
                  return `
                    <button type="button" class="prism-rail-qslot ${qAct ? 'is-active' : ''}"
                            data-action="card-click" data-id="${esc(qIt.id)}" title="${esc(qIt.title || qIt.id)}">
                      <div class="prism-rail-qslot-thumb">
                        ${qThumb ? `<img loading="lazy" src="${esc(qThumb)}" alt="" onerror="this.remove()" />` : ''}
                      </div>
                      <span class="prism-rail-qslot-title">${esc(qIt.title || qIt.id)}</span>
                    </button>
                  `;
                })
                .join('')}
            </div>
          `
              : ''
          }

          <div class="prism-seg" style="width:100%;justify-content:space-between">
            ${[
              { m: 'off', zh: '单张', en: 'Single' },
              { m: 'sequence', zh: '顺序', en: 'Seq' },
              { m: 'random', zh: '随机', en: 'Shuffle' },
              { m: 'videoEnd', zh: '播完换张', en: 'VideoEnd' },
            ]
              .map(
                (opt) => `
              <button type="button" class="prism-seg-btn ${rotMode === opt.m ? 'is-active' : ''}" style="flex:1"
                      data-action="quick-rot-mode" data-mode="${opt.m}">${esc(isZh ? opt.zh : opt.en)}</button>
            `,
              )
              .join('')}
          </div>
        </div>

        <div class="prism-rail-power-footer">
          <button type="button" class="prism-chip ${eff.pauseOnHidden ? 'is-active' : ''}"
                  data-action="toggle-bool" data-key="pauseOnHidden">
            🌙 ${esc(isZh ? '最小化暂停' : 'Min-Pause')}
          </button>
          <button type="button" class="prism-chip ${eff.pauseOnBlur ? 'is-active' : ''}"
                  data-action="toggle-bool" data-key="pauseOnBlur">
            👁 ${esc(isZh ? '失焦暂停' : 'Blur-Pause')}
          </button>
          <button id="rail-cdp-chip" type="button" class="prism-chip ${attached ? 'is-active' : ''}"
                  data-action="switch-tab" data-tab="system">
            ${esc(attached ? (isZh ? '● CDP 已连接' : '● CDP Attached') : (isZh ? '◌ CDP 待机' : '◌ CDP Standby'))}
          </button>
          <span class="prism-chip" style="cursor:default">⌨ Ctrl+Alt+W</span>
        </div>
      </div>
    `;
  }

  function updateLeftRailPanels() {
    const transportHost = document.getElementById('prism-transport-host');
    if (transportHost) transportHost.innerHTML = renderTransportBarHtml();
    const railExtras = document.getElementById('prism-rail-extras');
    if (railExtras) railExtras.innerHTML = renderRailExtrasHtml();
    const skinPinBar = document.getElementById('prism-skin-pin-bar');
    if (skinPinBar) skinPinBar.innerHTML = renderSkinPinBarHtml();
  }

  function patchActiveCardsInPlace(nextActiveId) {
    const activeLabel = curLocale() === 'zh' ? '当前' : 'Active';
    document.querySelectorAll('.prism-wall-card.is-active').forEach((card) => {
      if (card instanceof HTMLElement && card.dataset.id !== nextActiveId) {
        card.classList.remove('is-active');
        card.querySelector('.prism-active-pill')?.remove();
      }
    });
    document.querySelectorAll('.prism-wall-card').forEach((card) => {
      if (card instanceof HTMLElement && card.dataset.id === nextActiveId) {
        card.classList.add('is-active');
        const tl = card.querySelector('.prism-card-top-left');
        if (tl && !tl.querySelector('.prism-active-pill')) {
          const badge = document.createElement('span');
          badge.className = 'prism-active-pill';
          badge.textContent = `✓ ${activeLabel}`;
          tl.prepend(badge);
        }
      }
    });
    document.querySelectorAll('.prism-rail-qslot').forEach((slot) => {
      if (slot instanceof HTMLElement) {
        slot.classList.toggle('is-active', slot.dataset.id === nextActiveId);
      }
    });
  }

  function syncPairedSlidersInDom(sliderKey, rawVal, sourceInput = null) {
    document.querySelectorAll(`input[data-config-slider="${sliderKey}"]`).forEach((el) => {
      if (!(el instanceof HTMLInputElement) || el === sourceInput) return;
      if (el.dataset.inlineVol === 'true') {
        const volUi = Math.round(rawVal * 100);
        el.value = String(volUi);
        el.style.setProperty('--prism-pct', `${volUi}%`);
        return;
      }
      const row = el.closest('.prism-slider-row');
      const scale = Number(row?.dataset.scale || 1);
      const decimals = Number(row?.dataset.decimals || 0);
      const suffix = row?.dataset.suffix || '';
      const defRaw = Number(row?.dataset.default ?? 0);
      const min = Number(el.min);
      const max = Number(el.max);
      const uiVal = rawVal * scale;
      const pct = max > min ? Math.max(0, Math.min(100, ((uiVal - min) / (max - min)) * 100)) : 0;
      el.value = String(uiVal);
      el.style.setProperty('--prism-pct', `${pct.toFixed(1)}%`);
      if (row instanceof HTMLElement) {
        const valSpan = row.querySelector('.prism-slider-val');
        if (valSpan) {
          valSpan.textContent = `${decimals > 0 ? uiVal.toFixed(decimals) : Math.round(uiVal)}${suffix}`;
        }
        row.dataset.dirty = row.dataset.nullable === 'true' ? 'true' : (Math.abs(rawVal - defRaw) > 0.001 ? 'true' : 'false');
      }
    });
  }

  function syncNullableFollowersInDom(fallbackKey, fallbackRawVal) {
    document
      .querySelectorAll(`.prism-slider-row[data-nullable="true"][data-fallback-key="${fallbackKey}"]`)
      .forEach((fRow) => {
        if (!(fRow instanceof HTMLElement) || fRow.dataset.dirty === 'true') return;
        const fInput = fRow.querySelector('input.prism-range');
        if (!(fInput instanceof HTMLInputElement)) return;
        const fScale = Number(fRow.dataset.scale || 1);
        const fDecimals = Number(fRow.dataset.decimals || 0);
        const fSuffix = fRow.dataset.suffix || '';
        const fMin = Number(fInput.min);
        const fMax = Number(fInput.max);
        const fUiVal = Math.max(fMin, Math.min(fMax, fallbackRawVal * fScale));
        const { pct: fPct, display: rawDisp } = sliderMeta(fUiVal, fMin, fMax, fDecimals, fSuffix);
        fInput.value = String(fUiVal);
        fInput.style.setProperty('--prism-pct', `${fPct}%`);
        const fValSpan = fRow.querySelector('.prism-slider-val');
        if (fValSpan) {
          fValSpan.textContent = tr('glass.followMainFmt', { val: rawDisp });
        }
      });
  }

  function renderActiveTabContentHtml() {
    if (store.activeTab === 'skin') return renderPrismSkinTab();
    if (store.activeTab === 'playback') return renderPlaybackTab();
    if (store.activeTab === 'system') return renderSystemTab();
    return renderLibraryTab();
  }

  // Re-renders dynamic controls, tabs, transport, and drawers while keeping #prism-mini-stage video uninterrupted!
  function renderActiveSurface() {
    const app = document.getElementById('app');
    if (!app) return;

    if (!document.getElementById('prism-mini-stage')) {
      mountFullShell();
      return;
    }

    const brandSub = document.getElementById('prism-brand-sub');
    if (brandSub) brandSub.textContent = tr('app.subtitle');

    const langBtn = document.getElementById('prism-lang-btn');
    if (langBtn) langBtn.textContent = `🌐 ${tr('app.langToggle')}`;

    updateTopStatusIndicators();

    const transportHost = document.getElementById('prism-transport-host');
    if (transportHost) transportHost.innerHTML = renderTransportBarHtml();

    const railExtras = document.getElementById('prism-rail-extras');
    if (railExtras) railExtras.innerHTML = renderRailExtrasHtml();

    const tabsHost = document.getElementById('prism-tabs-bar');
    if (tabsHost) {
      const tabs = [
        { id: 'library', glyph: '❖', label: tr('tab.library') },
        { id: 'skin', glyph: '✦', label: tr('tab.skin') },
        { id: 'playback', glyph: '▶', label: tr('tab.playback') },
        { id: 'system', glyph: '⚙', label: tr('tab.system') },
      ];
      tabsHost.innerHTML = tabs
        .map(
          (tb) => `
        <button type="button" class="prism-tab-btn ${store.activeTab === tb.id ? 'is-active' : ''}"
                data-action="switch-tab" data-tab="${tb.id}">
          <span class="tab-glyph">${tb.glyph}</span>
          <span>${esc(tb.label)}</span>
        </button>
      `,
        )
        .join('');
    }

    const scroller = document.getElementById('prism-tab-scroll');
    const prevScroll = scroller ? scroller.scrollTop : 0;
    const activeFocusedId = document.activeElement?.id || '';
    const selStart = document.activeElement?.selectionStart ?? null;

    if (scroller) {
      scroller.innerHTML = renderActiveTabContentHtml();
      scroller.scrollTop = prevScroll;
    }

    if (activeFocusedId === 'prism-lib-search') {
      const searchEl = document.getElementById('prism-lib-search');
      if (searchEl) {
        searchEl.focus();
        if (selStart !== null) searchEl.setSelectionRange(selStart, selStart);
      }
    }

    const drawerHost = document.getElementById('prism-drawer-host');
    if (drawerHost) drawerHost.innerHTML = renderDrawerHtml();

    syncMiniPreviewMedia();
    syncOpticalCssVars();
  }

  function mountFullShell() {
    const app = document.getElementById('app');
    if (!app) return;

    app.innerHTML = `
      <header class="prism-topbar">
        <div class="prism-brand">
          <span class="prism-brand-diamond" aria-hidden="true">◆</span>
          <div class="prism-brand-text">
            <span class="prism-brand-title">${esc(tr('app.title'))}</span>
            <span id="prism-brand-sub" class="prism-brand-sub">${esc(tr('app.subtitle'))}</span>
          </div>
        </div>
        <div class="prism-topbar-actions">
          <button id="prism-master-toggle-btn" type="button" class="prism-master-toggle"
                  role="switch" aria-checked="${store.skinEnabled ? 'true' : 'false'}"
                  data-enabled="${store.skinEnabled ? 'true' : 'false'}"
                  data-action="toggle-skin-master"
                  title="${esc(getMasterToggleHint(store.skinEnabled))}">
            <span class="prism-master-toggle-dot"></span>
            <span id="prism-master-toggle-text">${esc(getMasterToggleLabel(store.skinEnabled))}</span>
          </button>
          <button id="prism-top-status-pill" type="button" class="prism-status-pill" data-status="standby"
                  data-action="switch-tab" data-tab="system">
            <span class="prism-status-dot"></span>
            <span id="prism-top-status-text">${esc(tr('status.standby'))}</span>
          </button>
          <button id="prism-lang-btn" type="button" class="prism-lang-btn" data-action="toggle-lang">
            🌐 ${esc(tr('app.langToggle'))}
          </button>
        </div>
      </header>
      <div id="prism-autostart-banner-host"></div>

      <div class="prism-workspace">
        <!-- Sticky 21:9 Live Workbench Island Mini-Preview & Left Rail on >=840px -->
        <section class="prism-stage-dock prism-left-rail" aria-label="${esc(tr('preview.label'))}">
          <div class="prism-preview-card">
            <div id="prism-mini-stage" class="prism-mini-stage prism-preview-stage">
              <div id="mini-media-layer" class="mini-media-layer"></div>
              <div class="mini-scrim"></div>
              <div class="mini-vignette"></div>
              <div class="mini-grain"></div>

              <!-- Simulated Antigravity 2.0 Hub Islands -->
              <div id="prism-mini-hub" class="mini-hub-shell" data-layout="islands">
                <div class="mini-island mini-sidebar">
                  <div class="mini-dots"><span></span><span></span><span></span></div>
                  <div class="mini-nav-row is-active"><span class="mini-bar" style="width:70%"></span></div>
                  <div class="mini-nav-row"><span class="mini-bar" style="width:52%"></span></div>
                  <div class="mini-nav-row"><span class="mini-bar" style="width:60%"></span></div>
                </div>

                <div class="mini-island mini-center">
                  <div style="display:flex;flex-direction:column;gap:3px">
                    <div class="mini-bar" style="width:38%;opacity:0.65"></div>
                    <div class="mini-code-card">
                      <span class="mini-code-kw">const</span> prism = <span class="mini-code-fn">glassSkin</span>({ mode: <span class="mini-code-str">'islands'</span> });
                    </div>
                  </div>
                  <div class="mini-composer">
                    <div class="mini-composer-input">
                      <span class="mini-caret"></span>
                      <span>Ask Antigravity…</span>
                    </div>
                    <div class="mini-composer-right">
                      <span class="mini-prism-pill">◆ Prism</span>
                      <span class="mini-send-dot"></span>
                    </div>
                  </div>
                </div>

                <div class="mini-island mini-aux">
                  <div class="mini-bar" style="width:58%;margin-bottom:2px"></div>
                  <div class="mini-nav-row is-active"><span class="mini-bar" style="width:76%"></span></div>
                  <div class="mini-nav-row"><span class="mini-bar" style="width:64%"></span></div>
                </div>
              </div>

              <div class="mini-hud-badges">
                <span id="mini-hud-layout" class="mini-hud-tag">ISLANDS · 8px</span>
                <span id="mini-hud-accent" class="mini-hud-tag">PRISM</span>
              </div>
            </div>

            <div id="prism-transport-host" class="prism-transport-bar"></div>
          </div>

          <div id="prism-rail-extras" class="prism-rail-extras"></div>
        </section>

        <!-- Main 4-Tab Studio Deck -->
        <main class="prism-main-deck">
          <nav id="prism-tabs-bar" class="prism-tabs-bar" role="tablist"></nav>
          <div id="prism-tab-scroll" class="prism-tab-body"></div>
        </main>
      </div>

      <div id="prism-drawer-host"></div>
      <div id="prism-drop-host"></div>
      <div id="prism-toast-host" class="prism-toast-stack"></div>

      <input id="prism-upload-input" type="file" hidden multiple
             accept=".jpg,.jpeg,.png,.webp,.gif,.bmp,.avif,.mp4,.webm,.mkv,.avi,.mov" />
      <input id="prism-preset-import-input" type="file" hidden accept=".json,application/json" />
    `;

    app.dataset.prismReady = 'true';
    renderActiveSurface();

    const scroller = document.getElementById('prism-tab-scroll');
    if (scroller) {
      let ticking = false;
      scroller.addEventListener('scroll', () => {
        if (store.activeTab !== 'library' || ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          ticking = false;
          const model = computeLibraryModel();
          if (model.visibleItems.length > 120) {
            const nextWin = computeVirtualSlice(model.visibleItems.length);
            if (nextWin.start !== store.virtualWindow.start || nextWin.end !== store.virtualWindow.end) {
              const gridHost = document.getElementById('prism-lib-grid-host');
              if (gridHost) gridHost.innerHTML = renderLibraryGridHtml(model);
            }
          }
        });
      });
    }
  }

  // ==========================================================================
  // File Upload (Drag & Drop + Picker up to 512 MB + SHA-256 Duplicate Toast)
  // ==========================================================================
  async function uploadFiles(fileList) {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    store.uploading = true;
    renderActiveSurface();

    for (const file of files) {
      if (file.size > MAX_UPLOAD_BYTES) {
        showToast(`${file.name}: ${tx('uploadTooLarge')}`, 'danger');
        continue;
      }
      try {
        const title = file.name.replace(/\.[^.]+$/, '');
        const qs = new URLSearchParams({ filename: file.name, title }).toString();
        const res = await apiFetch(`/api/upload?${qs}`, {
          method: 'POST',
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
          body: file,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || `Upload HTTP ${res.status}`);
        }
        if (data.duplicate) {
          showToast(tr('lib.duplicateToast'), 'warn', 4600);
        } else {
          showToast(tx('uploadDone'), 'ok');
        }
        if (data.item) {
          const idx = store.items.findIndex((x) => x.id === data.item.id);
          if (idx >= 0) store.items[idx] = data.item;
          else store.items.unshift(data.item);
          await applyWallpaperById(data.item.id);
        } else {
          await reloadLibrary(true);
        }
      } catch (err) {
        showToast(err.message || 'Upload failed', 'danger');
      }
    }

    store.uploading = false;
    renderActiveSurface();
  }

  // ==========================================================================
  // High-Level Domain Actions
  // ==========================================================================
  async function reloadLibrary(refresh = true) {
    try {
      const data = await apiJson(`/api/library?refresh=${refresh ? 1 : 0}`);
      if (Array.isArray(data.items)) store.items = data.items;
      if (data.stats) store.stats = { ...store.stats, ...data.stats };
      renderActiveSurface();
    } catch (err) {
      showToast(err.message || 'Failed to load library', 'danger');
    }
  }

  async function applyWallpaperById(wallpaperId, patch = undefined) {
    if (!wallpaperId) return;
    const item = store.items.find((x) => x.id === wallpaperId);
    if (item) {
      store.activeItem = item;
      store.config = sanitizeConfig({ activeWallpaperId: wallpaperId, wallpaperId, kind: item.kind }, store.config);
      patchActiveCardsInPlace(wallpaperId);
      syncMiniPreviewMedia();
      updateLeftRailPanels();
      updateTopStatusIndicators();
    }
    try {
      const body = patch ? { wallpaperId, patch } : { wallpaperId };
      const res = await apiJson('/api/wallpaper/apply', { method: 'POST', body });
      ingestServerState(res);
      const resolvedId = getActiveId();
      patchActiveCardsInPlace(resolvedId);
      syncMiniPreviewMedia();
      updateLeftRailPanels();
      updateTopStatusIndicators();
    } catch (err) {
      showToast(err.message || 'Failed to apply wallpaper', 'danger');
    }
  }

  async function executeSkinToggle(nextEnabled) {
    if (store.masterToggleBusy) return;
    const prevEnabled = store.skinEnabled;
    const targetEnabled = Boolean(nextEnabled);
    store.masterToggleBusy = true;
    store.skinEnabled = targetEnabled;
    store.config = sanitizeConfig({ skinEnabled: targetEnabled }, store.config);
    updateTopStatusIndicators();
    try {
      const res = await apiJson('/api/skin/toggle', {
        method: 'POST',
        body: { enabled: targetEnabled },
      });
      ingestServerState(res);
      if (typeof res?.skinEnabled === 'boolean' && typeof res?.state?.skinEnabled !== 'boolean') {
        store.skinEnabled = res.skinEnabled;
        store.config = sanitizeConfig({ skinEnabled: res.skinEnabled }, store.config);
      }
      if (targetEnabled && res?.state?.sessionAwake === undefined && res?.sessionAwake === undefined) {
        store.sessionAwake = true;
      }
      store.masterToggleBusy = false;
      syncOpticalCssVars();
      updateTopStatusIndicators();
      if (store.activeTab === 'system') {
        renderActiveSurface();
      }
      if (targetEnabled) {
        ensureStandbyStatusPoll();
      }
      showToast(
        store.skinEnabled ? tx('skinToggleToastOn') : tx('skinToggleToastOff'),
        store.skinEnabled ? 'ok' : 'info',
        3200,
      );
    } catch (err) {
      store.skinEnabled = prevEnabled;
      store.config = sanitizeConfig({ skinEnabled: prevEnabled }, store.config);
      store.masterToggleBusy = false;
      syncOpticalCssVars();
      updateTopStatusIndicators();
      if (store.activeTab === 'system') {
        renderActiveSurface();
      }
      showToast(err.message || (targetEnabled ? 'Enable failed' : 'Disable failed'), 'danger');
    }
  }

  async function openFsBrowser(kind) {
    const startPath =
      kind === 'uploadDir'
        ? store.config.uploadDir || ''
        : kind === 'cacheDir'
          ? store.config.cacheDir || ''
          : '';
    store.drawer = 'fs';
    store.fsBrowser = { ...store.fsBrowser, targetKind: kind, loading: true };
    renderActiveSurface();
    await browseFsPath(startPath);
  }

  async function browseFsPath(targetPath = '') {
    store.fsBrowser.loading = true;
    renderActiveSurface();
    try {
      const qs = targetPath ? `?path=${encodeURIComponent(targetPath)}` : '';
      const data = await apiJson(`/api/fs/browse${qs}`);
      store.fsBrowser = {
        ...store.fsBrowser,
        current: data.current || targetPath || '',
        parent: data.parent || '',
        quickRoots: Array.isArray(data.quickRoots) ? data.quickRoots : [],
        entries: Array.isArray(data.entries) ? data.entries : [],
        loading: false,
      };
    } catch (err) {
      store.fsBrowser.loading = false;
      showToast(err.message || 'Failed to browse directory', 'danger');
    }
    renderActiveSurface();
  }

  async function saveWePropUpdate(wallpaperId, propKey, newVal) {
    const prevForId = store.config.userProps?.[wallpaperId] || {};
    const nextProps = { ...prevForId, [propKey]: newVal };
    store.config = sanitizeConfig(
      { userProps: { ...(store.config.userProps || {}), [wallpaperId]: nextProps } },
      store.config,
    );
    renderActiveSurface();
    try {
      const res = await apiJson('/api/wallpaper/props', {
        method: 'POST',
        body: { wallpaperId, props: nextProps },
      });
      ingestServerState(res);
    } catch (err) {
      showToast(err.message || 'Failed to save wallpaper property', 'danger');
    }
  }

  // ==========================================================================
  // Delegated Event Listeners (Zero Memory Leaks, Zero Lost Slider Capture)
  // ==========================================================================
  function attachEventDelegation() {
    const app = document.getElementById('app');
    if (!app) return;

    // 1. Live <16ms Slider Dragging (`input`)
    app.addEventListener('input', (e) => {
      const tEl = e.target;
      if (!(tEl instanceof HTMLElement)) return;

      if (tEl.id === 'prism-lib-search' && tEl instanceof HTMLInputElement) {
        store.searchQuery = tEl.value;
        const gridHost = document.getElementById('prism-lib-grid-host');
        if (gridHost) gridHost.innerHTML = renderLibraryGridHtml();
        return;
      }

      if (tEl.id === 'prism-preset-name-in' && tEl instanceof HTMLInputElement) {
        store.presetDraft.name = tEl.value;
        return;
      }
      if (tEl.id === 'prism-preset-desc-in' && tEl instanceof HTMLInputElement) {
        store.presetDraft.description = tEl.value;
        return;
      }
      if (tEl.id === 'prism-pl-name-in' && tEl instanceof HTMLInputElement) {
        store.playlistDraft.name = tEl.value;
        return;
      }

      const sliderKey = tEl.dataset.configSlider;
      if (sliderKey && tEl instanceof HTMLInputElement) {
        const min = Number(tEl.min);
        const max = Number(tEl.max);
        const uiVal = Number(tEl.value);
        const pct = max > min ? ((uiVal - min) / (max - min)) * 100 : 0;
        tEl.style.setProperty('--prism-pct', `${pct.toFixed(1)}%`);

        if (tEl.dataset.inlineVol === 'true') {
          const vNorm = Math.round(uiVal) / 100;
          const patch = vNorm > 0 && getEffectiveConfig().muted
            ? { volume: vNorm, muted: false, audioEnabled: true }
            : { volume: vNorm };
          syncPairedSlidersInDom('volume', vNorm, tEl);
          queueConfigPatch(patch, false);
          return;
        }

        const row = tEl.closest('.prism-slider-row');
        const scale = Number(row?.dataset.scale || 1);
        const decimals = Number(row?.dataset.decimals || 0);
        const suffix = row?.dataset.suffix || '';
        const defRaw = Number(row?.dataset.default ?? 0);
        const rawVal = uiVal / scale;

        if (row) {
          const valSpan = row.querySelector('.prism-slider-val');
          if (valSpan) {
            valSpan.textContent = `${decimals > 0 ? uiVal.toFixed(decimals) : Math.round(uiVal)}${suffix}`;
          }
          row.dataset.dirty = row.dataset.nullable === 'true' ? 'true' : (Math.abs(rawVal - defRaw) > 0.001 ? 'true' : 'false');
        }
        if (sliderKey === 'liveBootDelay') {
          const delayHint = document.getElementById('prism-boot-delay-hint');
          if (delayHint) {
            delayHint.textContent = tr('host.liveBootDelayHint', { sec: rawVal.toFixed(1) });
          }
        }

        syncPairedSlidersInDom(sliderKey, rawVal, tEl);
        const extraPatch = sliderKey === 'volume' && rawVal > 0 && getEffectiveConfig().muted
          ? { volume: rawVal, muted: false, audioEnabled: true }
          : { [sliderKey]: rawVal };
        queueConfigPatch(extraPatch, false, sliderKey !== 'liveBootDelay');
        if (sliderKey === 'glassOpacity' || sliderKey === 'glassBlur') {
          const effNow = getEffectiveConfig();
          const depAuto =
            sliderKey === 'glassOpacity'
              ? effNow.sidebarOpacity === null || effNow.sidebarOpacity === undefined
              : effNow.sidebarBlur === null || effNow.sidebarBlur === undefined;
          if (depAuto) {
            syncNullableFollowersInDom(sliderKey, rawVal);
          }
        }
        return;
      }

      const weSliderKey = tEl.dataset.weSlider;
      if (weSliderKey && tEl instanceof HTMLInputElement) {
        const min = Number(tEl.min);
        const max = Number(tEl.max);
        const v = Number(tEl.value);
        const pct = max > min ? ((v - min) / (max - min)) * 100 : 0;
        tEl.style.setProperty('--prism-pct', `${pct.toFixed(1)}%`);
        const row = tEl.closest('.prism-slider-row');
        const valSpan = row?.querySelector('.prism-slider-val');
        if (valSpan) valSpan.textContent = Number(tEl.step) < 1 ? v.toFixed(2) : String(Math.round(v));
      }
    });

    // 2. Commit on `change` (sliders, color pickers, selects, file inputs)
    app.addEventListener('change', async (e) => {
      const tEl = e.target;
      if (!(tEl instanceof HTMLElement)) return;

      if (tEl.dataset.configSlider) {
        flushConfigPatch();
        return;
      }

      if (tEl.id === 'prism-upload-input' && tEl instanceof HTMLInputElement) {
        await uploadFiles(tEl.files);
        tEl.value = '';
        return;
      }

      if (tEl.id === 'prism-preset-import-input' && tEl instanceof HTMLInputElement) {
        const file = tEl.files?.[0];
        tEl.value = '';
        if (!file) return;
        try {
          const text = await file.text();
          const preset = JSON.parse(text);
          const res = await apiJson('/api/presets/import', { method: 'POST', body: { preset } });
          ingestServerState(res);
          if (Array.isArray(res.presets)) store.presets = res.presets;
          showToast(tx('presetImported'), 'ok');
          renderActiveSurface();
        } catch (err) {
          showToast(err.message || 'Invalid preset JSON', 'danger');
        }
        return;
      }

      if (tEl.dataset.action === 'set-color-key' && tEl instanceof HTMLInputElement) {
        const key = tEl.dataset.key;
        if (key) {
          queueConfigPatch({ [key]: tEl.value }, true);
          renderActiveSurface();
        }
        return;
      }

      if (tEl.dataset.action === 'select-enum' && tEl instanceof HTMLSelectElement) {
        const key = tEl.dataset.key;
        if (key) {
          queueConfigPatch({ [key]: tEl.value }, true);
          renderActiveSurface();
        }
        return;
      }

      if (tEl.dataset.action === 'change-rot-interval' && tEl instanceof HTMLInputElement) {
        const v = Math.max(1, Math.min(1440, Math.round(Number(tEl.value) || 15)));
        queueConfigPatch({ rotationInterval: v }, true);
        renderActiveSurface();
        return;
      }

      if (tEl.dataset.weSlider && tEl instanceof HTMLInputElement) {
        const wid = tEl.dataset.wid;
        const prop = tEl.dataset.weSlider;
        if (wid && prop) await saveWePropUpdate(wid, prop, Number(tEl.value));
        return;
      }

      if (tEl.dataset.action === 'we-prop-color' && tEl instanceof HTMLInputElement) {
        const wid = tEl.dataset.wid;
        const prop = tEl.dataset.prop;
        const val = tEl.dataset.origFmt === 'hex' ? tEl.value : hexToWeColor(tEl.value);
        if (wid && prop) await saveWePropUpdate(wid, prop, val);
        return;
      }

      if (tEl.dataset.action === 'we-prop-combo' && tEl instanceof HTMLSelectElement) {
        const wid = tEl.dataset.wid;
        const prop = tEl.dataset.prop;
        const item = store.items.find((x) => x.id === wid);
        const pDef = normalizeWeProperties(item?.properties).find((x) => x.key === prop);
        const opt = pDef?.options?.[Number(tEl.value)];
        if (wid && prop && opt !== undefined) {
          await saveWePropUpdate(wid, prop, opt.value);
        }
        return;
      }

      if (tEl.dataset.action === 'we-prop-text' && tEl instanceof HTMLInputElement) {
        const wid = tEl.dataset.wid;
        const prop = tEl.dataset.prop;
        if (wid && prop) await saveWePropUpdate(wid, prop, tEl.value);
      }
    });

    // 3. Double-Click Framing Reset (`layerPosX/Y/Scale` -> 50/50/100)
    app.addEventListener('dblclick', (e) => {
      const tEl = e.target;
      if (!(tEl instanceof HTMLElement)) return;
      const dblTarget = tEl.closest('[data-dblreset="true"]');
      if (dblTarget) {
        e.preventDefault();
        queueConfigPatch({ layerPosX: 50, layerPosY: 50, layerScale: 100 }, true);
        renderActiveSurface();
      }
    });

    // 4. Primary Click Dispatcher
    app.addEventListener('click', async (e) => {
      const tEl = e.target;
      if (!(tEl instanceof HTMLElement)) return;
      const actEl = tEl.closest('[data-action]');
      if (!actEl) return;
      const action = actEl.dataset.action;

      if (
        actEl.closest('.prism-card-top-right') &&
        action !== 'card-click'
      ) {
        e.stopPropagation();
      }

      switch (action) {
        case 'toggle-lang': {
          const nextLang = curLocale() === 'zh' ? 'en' : 'zh';
          queueConfigPatch({ language: nextLang }, true, false);
          renderActiveSurface();
          break;
        }
        case 'toggle-skin-master': {
          const nextEnabled = !store.skinEnabled;
          await executeSkinToggle(nextEnabled);
          break;
        }
        case 'switch-tab': {
          const tab = actEl.dataset.tab;
          if (tab && tab !== store.activeTab) {
            store.activeTab = tab;
            renderActiveSurface();
            const sc = document.getElementById('prism-tab-scroll');
            if (sc) sc.scrollTop = 0;
          }
          break;
        }
        case 'edit-slider-val': {
          const row = actEl.closest('.prism-slider-row');
          const rangeEl = row?.querySelector('input.prism-range');
          if (!row || !(rangeEl instanceof HTMLInputElement)) return;
          const scale = Number(row.dataset.scale || 1);
          const min = Number(row.dataset.min);
          const max = Number(row.dataset.max);
          const curNum = Number(rangeEl.value);

          const numIn = document.createElement('input');
          numIn.type = 'text';
          numIn.className = 'prism-slider-num-input';
          numIn.value = String(Math.round(curNum * 100) / 100);
          actEl.replaceWith(numIn);
          numIn.focus();
          numIn.select();

          let committed = false;
          const commit = (applyChange) => {
            if (committed) return;
            committed = true;
            if (applyChange) {
              const key = row.dataset.sliderKey;
              const rawTxt = numIn.value.trim();
              if (row.dataset.nullable === 'true' && (rawTxt === '' || rawTxt.toLowerCase() === 'auto')) {
                if (key) queueConfigPatch({ [key]: null }, true);
              } else {
                const numStr = rawTxt.replace(/[^0-9.-]/g, '');
                const parsed = numStr === '' ? NaN : Number(numStr);
                if (Number.isFinite(parsed)) {
                  const clampedUi = Math.max(min, Math.min(max, parsed));
                  const rawVal = clampedUi / scale;
                  if (key) queueConfigPatch({ [key]: rawVal }, true);
                }
              }
            }
            renderActiveSurface();
          };

          numIn.addEventListener('keydown', (ke) => {
            if (ke.key === 'Enter') {
              ke.preventDefault();
              commit(true);
            } else if (ke.key === 'Escape') {
              ke.preventDefault();
              commit(false);
            }
          });
          numIn.addEventListener('blur', () => commit(true));
          break;
        }
        case 'reset-key': {
          const key = actEl.dataset.key;
          if (key === 'sidebarOpacity' || key === 'sidebarBlur') {
            queueConfigPatch({ [key]: null }, true);
            renderActiveSurface();
          } else if (key && key in DEFAULT_CONFIG) {
            queueConfigPatch({ [key]: DEFAULT_CONFIG[key] }, true);
            renderActiveSurface();
          }
          break;
        }
        case 'reset-module': {
          e.preventDefault();
          const keys = (actEl.dataset.keys || '').split(',').filter(Boolean);
          const patch = {};
          for (const k of keys) {
            if (k === 'sidebarOpacity' || k === 'sidebarBlur') {
              patch[k] = null;
            } else if (k in DEFAULT_CONFIG) {
              patch[k] = DEFAULT_CONFIG[k];
            }
          }
          if (Object.keys(patch).length > 0) {
            queueConfigPatch(patch, true);
            renderActiveSurface();
          }
          break;
        }
        case 'toggle-bool': {
          const key = actEl.dataset.key;
          if (!key) return;
          const eff = getEffectiveConfig();
          queueConfigPatch(
            { [key]: !eff[key] },
            true,
            key !== 'rotationEnabled' && key !== 'themeFollow' && key !== 'transparentWindowControls',
          );
          renderActiveSurface();
          break;
        }
        case 'set-enum': {
          const key = actEl.dataset.key;
          const val = actEl.dataset.val ?? '';
          if (!key) return;
          const numCandidate = key === 'fpsCap' || key === 'sceneLiveFps' ? Number(val) : val;
          const patch = key === 'layoutMode' || key === 'colorScheme' ? { [key]: numCandidate, preset: 'custom' } : { [key]: numCandidate };
          queueConfigPatch(
            patch,
            true,
            key !== 'triggerMode' && key !== 'rotationOrder' && key !== 'rotationTrigger' && key !== 'startupMode',
          );
          renderActiveSurface();
          break;
        }
        case 'set-num': {
          const key = actEl.dataset.key;
          const val = Number(actEl.dataset.val);
          if (key && Number.isFinite(val)) {
            queueConfigPatch({ [key]: val }, true, key !== 'rotationInterval');
            renderActiveSurface();
          }
          break;
        }
        case 'apply-scene-preset': {
          const pid = actEl.dataset.preset;
          const sp = SCENE_PRESETS[pid];
          if (sp) {
            queueConfigPatch({ ...sp.patch, skinEnabled: true }, true);
            renderActiveSurface();
          }
          break;
        }
        case 'toggle-pin-override':
        case 'toggle-pin-for': {
          const wid = actEl.dataset.id || getActiveId();
          if (!wid) return;
          const nextMap = { ...(store.config.perWallpaperOverrides || {}) };
          if (nextMap[wid] && Object.keys(nextMap[wid]).length > 0) {
            delete nextMap[wid];
          } else {
            const eff = getEffectiveConfig();
            const snap = {};
            for (const k of PER_WALLPAPER_OVERRIDE_KEYS) {
              snap[k] = eff[k];
            }
            nextMap[wid] = snap;
          }
          queueConfigPatch({ perWallpaperOverrides: nextMap }, true, false);
          renderActiveSurface();
          break;
        }
        case 'toggle-pause': {
          const eff = getEffectiveConfig();
          queueConfigPatch({ paused: !eff.paused }, true, false);
          renderActiveSurface();
          break;
        }
        case 'toggle-mute': {
          const eff = getEffectiveConfig();
          const nextMuted = !eff.muted;
          const nextVol = !nextMuted && (!eff.volume || eff.volume <= 0) ? 0.5 : eff.volume;
          queueConfigPatch({ muted: nextMuted, audioEnabled: !nextMuted, volume: nextVol }, true);
          renderActiveSurface();
          break;
        }
        case 'quick-rot-mode': {
          const mode = actEl.dataset.mode || 'off';
          if (mode === 'off') {
            queueConfigPatch({ rotationEnabled: false }, true, false);
          } else if (mode === 'videoEnd') {
            queueConfigPatch({ rotationEnabled: true, rotationTrigger: 'videoEnd' }, true, false);
          } else if (mode === 'sequence') {
            queueConfigPatch({ rotationEnabled: true, rotationOrder: 'sequence', rotationTrigger: 'interval' }, true, false);
          } else {
            queueConfigPatch({ rotationEnabled: true, rotationOrder: 'random', rotationTrigger: 'interval' }, true, false);
          }
          updateLeftRailPanels();
          if (store.activeTab === 'playback') renderActiveSurface();
          break;
        }
        case 'step-playlist': {
          const dir = Number(actEl.dataset.dir) === -1 ? -1 : 1;
          try {
            const res = await apiJson('/api/playlist/step', { method: 'POST', body: { direction: dir, reason: 'manual' } });
            ingestServerState(res);
            patchActiveCardsInPlace(getActiveId());
            syncMiniPreviewMedia();
            updateLeftRailPanels();
          } catch (err) {
            showToast(err.message || 'Step playlist failed', 'danger');
          }
          break;
        }

        // Library Interactions
        case 'clear-search': {
          store.searchQuery = '';
          renderActiveSurface();
          break;
        }
        case 'set-lib-scope': {
          store.libScope = actEl.dataset.scope || 'all';
          renderActiveSurface();
          break;
        }
        case 'toggle-density': {
          const nextLayout = store.config.pickerLayout === 'fixed' ? 'classic' : 'fixed';
          queueConfigPatch({ pickerLayout: nextLayout }, true, false);
          renderActiveSurface();
          break;
        }
        case 'toggle-batch': {
          store.batchMode = !store.batchMode;
          store.batchSelected.clear();
          renderActiveSurface();
          break;
        }
        case 'batch-hide': {
          if (store.batchSelected.size === 0) return;
          const merged = Array.from(new Set([...(store.config.hiddenIds || []), ...store.batchSelected]));
          store.batchSelected.clear();
          store.batchMode = false;
          queueConfigPatch({ hiddenIds: merged }, true, false);
          renderActiveSurface();
          break;
        }
        case 'batch-to-playlist': {
          const picked = new Set(store.batchSelected);
          if (picked.size < 2) {
            showToast(tx('playlistNeedTwo'), 'warn');
            return;
          }
          store.playlistDraft = {
            editingId: '',
            name: `Playlist ${(store.config.rotationGroups || []).length + 1}`,
            order: store.config.rotationOrder || 'random',
            trigger: store.config.rotationTrigger || 'interval',
            interval: store.config.rotationInterval || 15,
            pickedIds: picked,
          };
          store.batchMode = false;
          store.batchSelected.clear();
          store.drawer = 'playlist';
          renderActiveSurface();
          break;
        }
        case 'toggle-kind-chip': {
          const k = actEl.dataset.kind;
          if (!k) return;
          const cur = new Set(store.config.typeFilter?.length ? store.config.typeFilter : LIBRARY_KINDS);
          if (cur.has(k)) {
            if (cur.size <= 1) {
              showToast(tx('nonEmptyGuard'), 'warn');
              return;
            }
            cur.delete(k);
          } else {
            cur.add(k);
          }
          queueConfigPatch({ typeFilter: Array.from(cur) }, true, false);
          renderActiveSurface();
          break;
        }
        case 'toggle-rating-chip': {
          const r = actEl.dataset.rating;
          if (!r) return;
          const cur = new Set(store.config.contentRatingFilter?.length ? store.config.contentRatingFilter : CONTENT_RATINGS);
          if (cur.has(r)) {
            if (cur.size <= 1) {
              showToast(tx('nonEmptyGuard'), 'warn');
              return;
            }
            cur.delete(r);
          } else {
            cur.add(r);
          }
          queueConfigPatch({ contentRatingFilter: Array.from(cur) }, true, false);
          renderActiveSurface();
          break;
        }
        case 'card-click': {
          const id = actEl.dataset.id;
          if (!id) return;
          if (store.batchMode) {
            if (store.batchSelected.has(id)) store.batchSelected.delete(id);
            else store.batchSelected.add(id);
            renderActiveSurface();
          } else {
            await applyWallpaperById(id);
          }
          break;
        }
        case 'apply-wallpaper': {
          const id = actEl.dataset.id;
          if (id) {
            store.drawer = null;
            await applyWallpaperById(id);
          }
          break;
        }
        case 'toggle-fav': {
          const id = actEl.dataset.id;
          if (!id) return;
          const favs = new Set(store.config.favorites || []);
          if (favs.has(id)) favs.delete(id);
          else favs.add(id);
          queueConfigPatch({ favorites: Array.from(favs) }, true, false);
          renderActiveSurface();
          break;
        }
        case 'hide-item': {
          const id = actEl.dataset.id;
          if (!id) return;
          const hidden = Array.from(new Set([...(store.config.hiddenIds || []), id]));
          queueConfigPatch({ hiddenIds: hidden }, true, false);
          renderActiveSurface();
          break;
        }
        case 'unhide-item': {
          const id = actEl.dataset.id;
          if (!id) return;
          const hidden = (store.config.hiddenIds || []).filter((x) => x !== id);
          queueConfigPatch({ hiddenIds: hidden }, true, false);
          renderActiveSurface();
          break;
        }
        case 'unhide-all': {
          queueConfigPatch({ hiddenIds: [] }, true, false);
          renderActiveSurface();
          break;
        }
        case 'trigger-upload': {
          document.getElementById('prism-upload-input')?.click();
          break;
        }
        case 'refresh-library': {
          await reloadLibrary(true);
          break;
        }

        // Drawers & Playlist CRUD
        case 'open-drawer': {
          const dr = actEl.dataset.drawer;
          if (dr === 'playlist' && !store.playlistDraft.name) {
            const firstGrp = (store.config.rotationGroups || [])[0];
            store.playlistDraft = firstGrp
              ? {
                  editingId: firstGrp.id,
                  name: firstGrp.name,
                  order: firstGrp.order,
                  trigger: firstGrp.trigger,
                  interval: firstGrp.interval,
                  pickedIds: new Set(firstGrp.wallpaperIds),
                }
              : {
                  editingId: '',
                  name: 'My Prism Playlist',
                  order: store.config.rotationOrder || 'random',
                  trigger: store.config.rotationTrigger || 'interval',
                  interval: store.config.rotationInterval || 15,
                  pickedIds: new Set(store.items.slice(0, 4).map((x) => x.id)),
                };
          }
          store.drawer = dr || null;
          renderActiveSurface();
          break;
        }
        case 'open-inspector': {
          const id = actEl.dataset.id || getActiveId() || store.items[0]?.id || '';
          if (!id) return;
          store.inspectWallpaperId = id;
          store.drawer = 'inspector';
          renderActiveSurface();
          break;
        }
        case 'backdrop-close':
          if (e.target !== actEl) return;
          // fall through
        case 'close-drawer': {
          store.drawer = null;
          renderActiveSurface();
          break;
        }
        case 'new-playlist-draft': {
          store.playlistDraft = {
            editingId: '',
            name: `Playlist ${(store.config.rotationGroups || []).length + 1}`,
            order: store.config.rotationOrder || 'random',
            trigger: store.config.rotationTrigger || 'interval',
            interval: store.config.rotationInterval || 15,
            pickedIds: new Set(),
          };
          renderActiveSurface();
          break;
        }
        case 'edit-playlist': {
          const gid = actEl.dataset.id;
          const g = (store.config.rotationGroups || []).find((x) => x.id === gid);
          if (g) {
            store.playlistDraft = {
              editingId: g.id,
              name: g.name,
              order: g.order,
              trigger: g.trigger,
              interval: g.interval,
              pickedIds: new Set(g.wallpaperIds),
            };
            renderActiveSurface();
          }
          break;
        }
        case 'toggle-pl-pick': {
          const id = actEl.dataset.id;
          if (!id) return;
          if (store.playlistDraft.pickedIds.has(id)) store.playlistDraft.pickedIds.delete(id);
          else store.playlistDraft.pickedIds.add(id);
          renderActiveSurface();
          break;
        }
        case 'pl-pick-all': {
          for (const it of computeLibraryModel().visibleItems) {
            store.playlistDraft.pickedIds.add(it.id);
          }
          renderActiveSurface();
          break;
        }
        case 'pl-pick-clear': {
          store.playlistDraft.pickedIds.clear();
          renderActiveSurface();
          break;
        }
        case 'save-playlist-draft': {
          const ids = Array.from(store.playlistDraft.pickedIds);
          if (ids.length < 2) {
            showToast(tx('playlistNeedTwo'), 'warn');
            return;
          }
          const gid = store.playlistDraft.editingId || `pl-${Date.now().toString(36)}`;
          const entry = {
            id: gid,
            name: store.playlistDraft.name.trim() || 'Playlist',
            wallpaperIds: ids,
            order: store.config.rotationOrder || 'random',
            trigger: store.config.rotationTrigger || 'interval',
            interval: store.config.rotationInterval || 15,
          };
          const groups = [...(store.config.rotationGroups || [])];
          const idx = groups.findIndex((x) => x.id === gid);
          if (idx >= 0) groups[idx] = entry;
          else groups.push(entry);

          queueConfigPatch({ rotationGroups: groups, rotationGroupId: gid, rotationEnabled: true }, true, false);
          showToast(tx('playlistSaved'), 'ok');
          renderActiveSurface();
          break;
        }
        case 'activate-playlist': {
          const gid = actEl.dataset.id;
          if (gid) {
            queueConfigPatch({ rotationGroupId: gid, rotationEnabled: true }, true, false);
            renderActiveSurface();
          }
          break;
        }
        case 'delete-playlist': {
          const gid = actEl.dataset.payload;
          setArmedConfirm(null);
          const groups = (store.config.rotationGroups || []).filter((x) => x.id !== gid);
          const nextActive = store.config.rotationGroupId === gid ? groups[0]?.id || '' : store.config.rotationGroupId;
          queueConfigPatch({ rotationGroups: groups, rotationGroupId: nextActive }, true, false);
          renderActiveSurface();
          break;
        }
        case 'import-we-playlist': {
          const wsItems = computeLibraryModel().visibleItems.filter((x) => x.source === 'workshop');
          const seedItems = wsItems.length >= 2 ? wsItems : computeLibraryModel().visibleItems;
          if (seedItems.length < 2) {
            showToast(tx('playlistNeedTwo'), 'warn');
            return;
          }
          const gid = `we-import-${Date.now().toString(36)}`;
          const groups = [
            ...(store.config.rotationGroups || []),
            {
              id: gid,
              name: 'WE Workshop Rotation',
              wallpaperIds: seedItems.slice(0, 60).map((x) => x.id),
              order: 'random',
              trigger: 'interval',
              interval: 15,
            },
          ];
          queueConfigPatch({ rotationGroups: groups, rotationGroupId: gid, rotationEnabled: true }, true, false);
          showToast(tx('playlistSaved'), 'ok');
          renderActiveSurface();
          break;
        }

        // WE Properties Click Actions
        case 'we-prop-bool': {
          const wid = actEl.dataset.wid;
          const prop = actEl.dataset.prop;
          if (!wid || !prop) return;
          const item = store.items.find((x) => x.id === wid);
          const pDef = normalizeWeProperties(item?.properties).find((x) => x.key === prop);
          const cur = store.config.userProps?.[wid]?.[prop] ?? pDef?.defaultValue ?? false;
          await saveWePropUpdate(wid, prop, !cur);
          break;
        }
        case 'we-prop-reset': {
          const wid = actEl.dataset.wid;
          const prop = actEl.dataset.prop;
          const item = store.items.find((x) => x.id === wid);
          const pDef = normalizeWeProperties(item?.properties).find((x) => x.key === prop);
          if (wid && prop && pDef) {
            await saveWePropUpdate(wid, prop, pDef.defaultValue);
          }
          break;
        }

        // Whole-Profile Presets CRUD
        case 'apply-profile-preset': {
          const presetId = actEl.dataset.id;
          if (!presetId) return;
          try {
            const res = await apiJson('/api/preset/apply', { method: 'POST', body: { presetId } });
            ingestServerState(res);
            syncMiniPreviewMedia();
            renderActiveSurface();
          } catch (err) {
            showToast(err.message || 'Failed to apply preset', 'danger');
          }
          break;
        }
        case 'save-profile-preset': {
          const name = store.presetDraft.name.trim() || `Custom Prism ${new Date().toLocaleTimeString()}`;
          const description = store.presetDraft.description.trim();
          try {
            const res = await apiJson('/api/presets/save', { method: 'POST', body: { name, description } });
            ingestServerState(res);
            if (Array.isArray(res.presets)) store.presets = res.presets;
            store.presetDraft = { name: '', description: '' };
            showToast(tx('presetSaved'), 'ok');
            renderActiveSurface();
          } catch (err) {
            showToast(err.message || 'Failed to save preset', 'danger');
          }
          break;
        }
        case 'export-profile-preset': {
          const id = actEl.dataset.id;
          if (!id) return;
          try {
            const data = await apiJson(`/api/presets/export?id=${encodeURIComponent(id)}`);
            const blob = new Blob([JSON.stringify(data.preset || data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `prism-preset-${id}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1500);
          } catch (err) {
            showToast(err.message || 'Export failed', 'danger');
          }
          break;
        }
        case 'trigger-preset-import': {
          e.preventDefault();
          document.getElementById('prism-preset-import-input')?.click();
          break;
        }
        case 'delete-profile-preset': {
          const id = actEl.dataset.payload;
          setArmedConfirm(null);
          if (!id) return;
          try {
            const res = await apiJson('/api/presets/delete', { method: 'POST', body: { id } });
            ingestServerState(res);
            if (Array.isArray(res.presets)) store.presets = res.presets;
            renderActiveSurface();
          } catch (err) {
            showToast(err.message || 'Delete preset failed', 'danger');
          }
          break;
        }

        // Host, Shortcut, Storage & 2-Step Inline Confirmations
        case 'arm-confirm': {
          setArmedConfirm(actEl.dataset.confirmKey || null);
          break;
        }
        case 'cancel-confirm': {
          setArmedConfirm(null);
          break;
        }
        case 'remove-upload': {
          const wid = actEl.dataset.payload;
          setArmedConfirm(null);
          if (!wid) return;
          try {
            const res = await apiJson('/api/upload/remove', { method: 'POST', body: { wallpaperId: wid } });
            if (Array.isArray(res.items)) store.items = res.items;
            else store.items = store.items.filter((x) => x.id !== wid);
            store.drawer = null;
            renderActiveSurface();
          } catch (err) {
            showToast(err.message || 'Remove upload failed', 'danger');
          }
          break;
        }
        case 'open-fs-browser': {
          await openFsBrowser(actEl.dataset.kind || 'uploadDir');
          break;
        }
        case 'fs-nav': {
          await browseFsPath(actEl.dataset.path || '');
          break;
        }
        case 'fs-jump-input': {
          const pathIn = document.getElementById('prism-fs-path-in');
          if (pathIn instanceof HTMLInputElement) {
            await browseFsPath(pathIn.value.trim());
          }
          break;
        }
        case 'fs-confirm-select': {
          const pathIn = document.getElementById('prism-fs-path-in');
          const chosen = (pathIn instanceof HTMLInputElement ? pathIn.value.trim() : '') || store.fsBrowser.current;
          if (!chosen) return;
          try {
            const res = await apiJson('/api/storage/dir', {
              method: 'POST',
              body: { kind: store.fsBrowser.targetKind, path: chosen },
            });
            ingestServerState(res);
            store.drawer = null;
            await reloadLibrary(true);
          } catch (err) {
            showToast(err.message || 'Failed to update folder', 'danger');
          }
          break;
        }
        case 'remove-custom-folder': {
          const path = actEl.dataset.payload;
          setArmedConfirm(null);
          if (!path) return;
          try {
            const res = await apiJson('/api/storage/dir', {
              method: 'POST',
              body: { kind: 'removeCustomFolder', path },
            });
            ingestServerState(res);
            await reloadLibrary(true);
          } catch (err) {
            showToast(err.message || 'Failed to remove folder', 'danger');
          }
          break;
        }
        case 'set-autostart':
        case 'exec-disable-autostart': {
          const enabled = action === 'exec-disable-autostart' ? false : actEl.dataset.enabled === 'true';
          setArmedConfirm(null);
          store.autostart.busy = true;
          renderActiveSurface();
          try {
            const port = store.config.debugPort || DEFAULT_DEBUG_PORT;
            const res = await apiJson('/api/host/autostart', {
              method: 'POST',
              body: { enabled, port },
            });
            ingestServerState(res);
            store.autostart.busy = false;
            showToast(tr(enabled ? 'host.autostartEnabledToast' : 'host.autostartDisabledToast'), enabled ? 'ok' : 'info', 5200);
            renderActiveSurface();
          } catch (err) {
            store.autostart.busy = false;
            showToast(err.message || 'Autostart update failed', 'danger');
            renderActiveSurface();
          }
          break;
        }
        case 'refresh-autostart': {
          try {
            const res = await apiJson('/api/host/autostart?refresh=1');
            ingestServerState(res);
            renderActiveSurface();
          } catch (err) {
            showToast(err.message || 'Autostart check failed', 'danger');
          }
          break;
        }
        case 'dismiss-autostart-banner': {
          store.autostart.bannerDismissed = true;
          updateTopStatusIndicators();
          break;
        }
        case 'create-shortcut': {
          try {
            const port = store.config.debugPort || DEFAULT_DEBUG_PORT;
            const res = await apiJson('/api/host/shortcut', { method: 'POST', body: { port } });
            showToast(`${tr('host.shortcutCreated')}${res.shortcutPath ? ` (${res.shortcutPath})` : ''}`, 'ok', 5500);
          } catch (err) {
            showToast(err.message || 'Shortcut creation failed', 'danger');
          }
          break;
        }
        case 'enable-skin': {
          await executeSkinToggle(true);
          break;
        }
        case 'wake-skin': {
          store.wakeBusy = true;
          renderActiveSurface();
          try {
            const res = await apiJson('/api/skin/wake', { method: 'POST', body: {} });
            ingestServerState(res);
            store.sessionAwake = true;
            store.skinEnabled = true;
            store.wakeBusy = false;
            showToast(tr('host.wakeSuccessToast'), 'ok', 4200);
            renderActiveSurface();
            ensureStandbyStatusPoll();
          } catch (err) {
            store.wakeBusy = false;
            showToast(err.message || 'Wake failed', 'danger');
            renderActiveSurface();
          }
          break;
        }
        case 'reset-canary': {
          store.canaryBusy = true;
          renderActiveSurface();
          try {
            const res = await apiJson('/api/canary/reset', { method: 'POST', body: {} });
            ingestServerState(res);
            if (!res?.canary && !res?.state?.canary) {
              store.canary = { ...store.canary, state: 'idle', trippedReason: '' };
            }
            store.sessionAwake = true;
            store.skinEnabled = true;
            store.canaryBusy = false;
            showToast(tr('canary.resetToast'), 'ok', 4500);
            renderActiveSurface();
            ensureStandbyStatusPoll();
          } catch (err) {
            store.canaryBusy = false;
            showToast(err.message || 'Canary reset failed', 'danger');
            renderActiveSurface();
          }
          break;
        }
        case 'refresh-status': {
          try {
            const st = await apiJson('/api/status');
            ingestServerState(st);
            renderActiveSurface();
          } catch (err) {
            showToast(err.message || 'Status poll failed', 'danger');
          }
          break;
        }
        case 'exec-reset-scope': {
          const scope = actEl.dataset.payload || 'all';
          setArmedConfirm(null);
          try {
            const res = await apiJson('/api/config/reset', { method: 'POST', body: { scope } });
            ingestServerState(res);
            syncMiniPreviewMedia();
            renderActiveSurface();
          } catch (err) {
            showToast(err.message || 'Reset failed', 'danger');
          }
          break;
        }
        case 'exec-restore-host': {
          setArmedConfirm(null);
          try {
            const res = await apiJson('/api/skin/restore', { method: 'POST', body: {} });
            ingestServerState(res);
            store.skinEnabled = false;
            renderActiveSurface();
          } catch (err) {
            showToast(err.message || 'Restore failed', 'danger');
          }
          break;
        }
        default:
          break;
      }
    });

    // 5. Keyboard Shortcuts: `/` search focus, `Enter`/`Space` card activation, 2-stage `Escape` unwind
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (store.armedConfirm) {
          e.preventDefault();
          setArmedConfirm(null);
          return;
        }
        if (store.drawer) {
          e.preventDefault();
          store.drawer = null;
          renderActiveSurface();
          return;
        }
        if (store.batchMode) {
          e.preventDefault();
          store.batchMode = false;
          store.batchSelected.clear();
          renderActiveSurface();
          return;
        }
      }

      const activeTag = document.activeElement?.tagName || '';
      const inEditable = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT';

      if (e.key === '/' && !inEditable && store.activeTab === 'library') {
        e.preventDefault();
        document.getElementById('prism-lib-search')?.focus();
        return;
      }

      if ((e.key === 'Enter' || e.key === ' ') && document.activeElement?.classList?.contains('prism-wall-card')) {
        e.preventDefault();
        document.activeElement.click();
      }
    });

    // 6. Drag-and-Drop Media Upload Overlay
    const renderDropOverlay = (visible) => {
      const dropHost = document.getElementById('prism-drop-host');
      if (!dropHost) return;
      dropHost.innerHTML = visible
        ? `
        <div class="prism-drop-overlay">
          <div style="font-size:28px;color:var(--prism-accent)">✦</div>
          <div style="font-size:14px;font-weight:650">${esc(tr('lib.upload'))}</div>
          <div style="font-size:12px;color:var(--prism-fg-muted)">${esc(tr('lib.dropHint'))}</div>
        </div>
      `
        : '';
    };

    window.addEventListener('dragenter', (e) => {
      if (!e.dataTransfer?.types?.includes('Files')) return;
      e.preventDefault();
      store.dragDepth++;
      renderDropOverlay(true);
    });
    window.addEventListener('dragover', (e) => {
      if (!e.dataTransfer?.types?.includes('Files')) return;
      e.preventDefault();
    });
    window.addEventListener('dragleave', (e) => {
      if (!e.dataTransfer?.types?.includes('Files')) return;
      store.dragDepth = Math.max(0, store.dragDepth - 1);
      if (store.dragDepth === 0) renderDropOverlay(false);
    });
    window.addEventListener('drop', async (e) => {
      if (!e.dataTransfer?.files?.length) return;
      e.preventDefault();
      store.dragDepth = 0;
      renderDropOverlay(false);
      await uploadFiles(e.dataTransfer.files);
    });

    // 7. Host Theme PostMessage, Preload CustomEvents & OS Media Query Sync
    const inferPolarityFromCssVars = (vars) => {
      const bg = String(vars?.['--background'] || vars?.['--body-background'] || '').trim();
      const hexM = /^#([0-9a-f]{6})$/i.exec(bg);
      if (hexM) {
        const h = hexM[1];
        const lum =
          (0.2126 * parseInt(h.slice(0, 2), 16) +
            0.7152 * parseInt(h.slice(2, 4), 16) +
            0.0722 * parseInt(h.slice(4, 6), 16)) /
          255;
        return lum > 0.55 ? 'light' : 'dark';
      }
      return null;
    };

    window.addEventListener('message', (e) => {
      const msg = e.data;
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'theme-change') {
        const inferred =
          msg.theme === 'light' || msg.polarity === 'light' || msg.isDark === false
            ? 'light'
            : msg.theme === 'dark' || msg.polarity === 'dark' || msg.isDark === true
              ? 'dark'
              : inferPolarityFromCssVars(msg.payload?.cssVariables);
        if (inferred && inferred !== store.hostPolarity) {
          store.hostPolarity = inferred;
          syncOpticalCssVars();
        }
      } else if (msg.type === 'prism-theme-sync' && msg.payload) {
        if (msg.payload.theme === 'light' || msg.payload.theme === 'dark') {
          store.hostPolarity = msg.payload.theme;
        }
        syncOpticalCssVars();
      }
    });

    window.addEventListener('prism-host-theme', (e) => {
      const inferred = inferPolarityFromCssVars(e.detail);
      if (inferred && inferred !== store.hostPolarity) {
        store.hostPolarity = inferred;
        syncOpticalCssVars();
      }
    });

    window.addEventListener('prism-theme-sync', (e) => {
      const p = e.detail;
      if (p && (p.theme === 'light' || p.theme === 'dark')) {
        store.hostPolarity = p.theme;
      }
      syncOpticalCssVars();
    });

    if (typeof window.matchMedia === 'function') {
      const mq = window.matchMedia('(prefers-color-scheme: light)');
      const onMq = (ev) => {
        store.hostPolarity = ev.matches ? 'light' : 'dark';
        syncOpticalCssVars();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onMq);
    }

    let lastPreviewVidT = -1;
    let previewStallTicks = 0;
    setInterval(() => {
      if (document.hidden || getEffectiveConfig().paused) {
        lastPreviewVidT = -1;
        previewStallTicks = 0;
        return;
      }
      const vid = document.getElementById('prism-preview-video');
      if (!(vid instanceof HTMLVideoElement) || vid.seeking || vid.readyState < 1) return;
      if (vid.paused) {
        vid.play().catch(() => {});
        lastPreviewVidT = vid.currentTime;
        return;
      }
      const curT = Number(vid.currentTime || 0);
      const dur = Number(vid.duration);
      if (lastPreviewVidT >= 0 && Math.abs(curT - lastPreviewVidT) < 0.002) {
        previewStallTicks += 1;
        if (Number.isFinite(dur) && dur > 1.2 && curT >= dur - 1.5) {
          if (curT > 0.8) vid.__effectiveEnd = Math.max(0.5, curT - 0.06);
          vid.currentTime = 0;
          vid.play().catch(() => {});
          previewStallTicks = 0;
          lastPreviewVidT = 0;
          return;
        }
        if (previewStallTicks >= 2) {
          vid.currentTime = Number.isFinite(dur) && dur > 1.5 && curT < dur - 1.2 ? Math.max(0, curT - 0.035) : 0;
          vid.play().catch(() => {});
          previewStallTicks = 0;
        }
      } else {
        previewStallTicks = 0;
      }
      lastPreviewVidT = curT;
    }, 1250);

    document.addEventListener('visibilitychange', () => {
      const vid = document.getElementById('prism-preview-video');
      if (vid instanceof HTMLVideoElement) {
        if (document.hidden) {
          if (!vid.paused) vid.pause();
        } else if (!getEffectiveConfig().paused && vid.paused) {
          vid.play().catch(() => {});
        }
      }
      if (!document.hidden) {
        void syncExternalStateNow();
        ensureLiveSyncPoll();
        if (!isHostAttached()) ensureStandbyStatusPoll();
      }
    });

    window.addEventListener('focus', () => {
      if (!document.hidden) {
        void syncExternalStateNow();
      }
    });

    window.addEventListener('resize', () => {
      if (store.activeTab === 'library' && store.items.length > 120) {
        const gridHost = document.getElementById('prism-lib-grid-host');
        if (gridHost) gridHost.innerHTML = renderLibraryGridHtml();
      }
    });
  }

  function externalStateSignature() {
    const c = store.config || {};
    const activeId = getActiveId();
    return JSON.stringify([
      activeId,
      store.activeItem?.mediaUrl || '',
      store.activeItem?.sceneVideoUrl || '',
      store.skinEnabled,
      c.paused,
      c.muted,
      c.volume,
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
      c.transparentWindowControls,
      c.cornerStyle,
      c.leftSidebarRadius,
      c.rightSidebarRadius,
      c.islandGap,
      c.workspacePad,
      c.codeReadabilityMode,
      c.borders,
      c.shadows,
      c.scrimOpacity,
      c.mediaBlur,
      c.vignette,
      c.pauseOnBlur,
      activeId ? c.perWallpaperOverrides?.[activeId] || null : null,
    ]);
  }

  function applyExternalStateSnapshot(payload) {
    if (!payload || typeof payload !== 'object') return;
    if (store.masterToggleBusy || configDebounceTimer || configFlushInFlight || Object.keys(pendingConfigPatch).length > 0) {
      return;
    }
    const wasAttached = isHostAttached();
    const prevCanaryState = store.canary?.state || 'idle';
    const prevSkinEnabled = store.skinEnabled;
    const prevActiveId = getActiveId();
    const prevSig = externalStateSignature();

    ingestServerState(payload);

    const nextActiveId = getActiveId();
    const nextSig = externalStateSignature();
    const canaryChanged = (store.canary?.state || 'idle') !== prevCanaryState;
    const skinChanged = store.skinEnabled !== prevSkinEnabled;
    const activeChanged = nextActiveId !== prevActiveId;
    const stateChanged = nextSig !== prevSig;

    updateTopStatusIndicators();

    if (activeChanged || stateChanged) {
      patchActiveCardsInPlace(nextActiveId);
      syncMiniPreviewMedia();
      syncOpticalCssVars();
      const activeEl = document.activeElement;
      const isDraggingRange = activeEl instanceof HTMLInputElement && activeEl.type === 'range';
      const isEditingField =
        activeEl instanceof HTMLTextAreaElement ||
        activeEl instanceof HTMLSelectElement ||
        (activeEl instanceof HTMLInputElement && activeEl.type !== 'button' && activeEl.type !== 'checkbox');
      if (!isDraggingRange) {
        updateLeftRailPanels();
        if (!isEditingField && (store.activeTab === 'skin' || store.activeTab === 'playback')) {
          const scroller = document.getElementById('prism-tab-scroll');
          if (scroller) {
            const prevScroll = scroller.scrollTop;
            scroller.innerHTML = renderActiveTabContentHtml();
            scroller.scrollTop = prevScroll;
          }
        }
      }
    }

    if ((!wasAttached && isHostAttached()) || canaryChanged || skinChanged) {
      if (store.activeTab === 'system' || store.canary?.state === 'tripped') {
        renderActiveSurface();
      }
    }
  }

  async function syncExternalStateNow() {
    if (externalSyncInFlight || !store.ready) return;
    externalSyncInFlight = true;
    try {
      const st = await apiJson('/api/status');
      applyExternalStateSnapshot(st);
    } catch {
      // silent background sync
    } finally {
      externalSyncInFlight = false;
    }
  }

  function connectStudioEvents() {
    if (typeof window.EventSource !== 'function' || studioEventSource) return;
    try {
      const tok = new URLSearchParams(window.location.search).get('token') || window.__SIDECAR_BOOT__?.token || '';
      const url = tok ? `/api/events?token=${encodeURIComponent(tok)}` : '/api/events';
      const es = new window.EventSource(url);
      studioEventSource = es;
      const handleEvent = (ev) => {
        studioLastSseAt = Date.now();
        try {
          const parsed = JSON.parse(ev.data);
          applyExternalStateSnapshot(parsed);
        } catch {
          // ignore malformed event payload
        }
      };
      es.addEventListener('state', handleEvent);
      es.onmessage = handleEvent;
      es.onerror = () => {
        // Keep EventSource auto-retry active while live sync poll serves as fallback
      };
    } catch {
      studioEventSource = null;
    }
  }

  function ensureLiveSyncPoll() {
    if (studioSyncPollTimer) return;
    studioSyncPollTimer = setInterval(() => {
      if (document.hidden || !store.ready) return;
      const sseFresh =
        studioEventSource &&
        studioEventSource.readyState === 1 &&
        studioLastSseAt > 0 &&
        Date.now() - studioLastSseAt < 20_000;
      if (sseFresh) return;
      void syncExternalStateNow();
    }, 2500);
  }

  function ensureStandbyStatusPoll() {
    const needsCanaryWatch = () => store.canary?.state === 'arming';
    if (statusPollTimer || (isHostAttached() && !needsCanaryWatch())) return;
    statusPollTimer = setInterval(async () => {
      if (document.hidden) return;
      if (isHostAttached() && !needsCanaryWatch()) {
        clearInterval(statusPollTimer);
        statusPollTimer = null;
        return;
      }
      try {
        const st = await apiJson('/api/status');
        applyExternalStateSnapshot(st);
        if (isHostAttached() && !needsCanaryWatch()) {
          clearInterval(statusPollTimer);
          statusPollTimer = null;
        }
      } catch {
        // silent background poll
      }
    }, 2500);
  }

  // ==========================================================================
  // Bootstrap & Standby-Only Host Status Poll (Zero Boot Spawns!)
  // ==========================================================================
  async function init() {
    mountFullShell();
    attachEventDelegation();

    try {
      const [bootRes, libRes] = await Promise.all([
        apiJson('/api/bootstrap').catch(() => null),
        apiJson('/api/library?refresh=0').catch(() => null),
      ]);

      if (libRes) {
        if (Array.isArray(libRes.items)) store.items = libRes.items;
        if (libRes.stats) store.stats = { ...store.stats, ...libRes.stats };
      }
      if (bootRes) {
        ingestServerState(bootRes);
      }
      store.ready = true;
      renderActiveSurface();
    } catch {
      // Offline / mock fallback renders cleanly with zero uncaught errors
      store.ready = true;
      renderActiveSurface();
    }

    connectStudioEvents();
    ensureLiveSyncPoll();
    ensureStandbyStatusPoll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}

bootPrismStudioApp();
