// Host Prism Skin & Wallpaper Stage Microkernel for Antigravity (agy-wallpaper-prism v2.0.7).
//
// Gentle Fail-Open ES2020 browser IIFE loaded post-hydration (`stage.js`) or in headless verification harnesses.
// Zero `Page.enable`/`Runtime.enable`, zero `app.asar` modifications, `z-index: -1` inert stage,
// strict Frame-1 Media-Ready Gate, and synchronous `2.34.0` `[data-browser-hole]` rounded GPU cutout.
//
// Exposes `window.__agyPrism = { version, applyPayload, updateConfig, destroy, extractAccent,
// stepSlideshow, setPaused, syncBrowserHoles, heal, status, receive }`.
(function agyPrismSkinKernelMain() {
  'use strict';

  var VERSION = '2.0.7';
  var W = typeof window !== 'undefined' ? window : null;
  if (!W || !W.document) return { installed: false, reason: 'no-window' };
  if (W.top && W !== W.top) return { installed: false, reason: 'subframe' };
  var doc = W.document;

  var API_KEY = '__agyPrism';
  var BINDING_KEY = '__agyPrismCall';
  var STAGE_ID = 'agy-prism-stage';
  var STYLE_ID = 'agy-prism-css';
  var STATIC_STYLE_ID = 'agy-prism-static-css';
  var CARET_STYLE_ID = 'agy-prism-caret-css';
  var FX_CANVAS_ID = 'agy-prism-fx-canvas';
  var WCO_PILL_ID = 'agy-prism-wco-pill';
  var TARGET_WCO_HEIGHT = 35;
  var ROOT_ATTR = 'data-agy-prism-skin';
  var GLASS_ATTR = 'data-agy-prism-glass';
  var WALLPAPER_ATTR = 'data-agy-prism-wallpaper';
  var WCO_ATTR = 'data-agy-prism-wco';
  var ACTIVE_HOLE_SEL = '[data-browser-hole]:not([data-browser-hole="false"])';

  // Preserve state or tear down an older kernel cleanly before mounting.
  var prev = W[API_KEY];
  var carryPayload = null;
  if (prev && typeof prev === 'object') {
    if (prev.version === VERSION && typeof prev.alive === 'function' && prev.alive()) {
      try {
        if (W.__AGY_PRISM_BOOT_PAYLOAD__ && typeof prev.applyPayload === 'function') {
          prev.applyPayload(W.__AGY_PRISM_BOOT_PAYLOAD__);
        }
        prev.heal();
      } catch (_) {}
      return prev.status();
    }
    try {
      if (typeof prev.getLastPayload === 'function') carryPayload = prev.getLastPayload();
    } catch (_) {}
    try {
      if (typeof prev.destroy === 'function') prev.destroy();
    } catch (_) {}
  }

  // ---------------------------------------------------------------------------
  // 8 Paired Light & Dark Color Schemes (Obsidian Prism + Community Classics)
  // ---------------------------------------------------------------------------
  var COLOR_SCHEMES = {
    'prism-default': {
      dark: {
        pt: '255, 255, 255',
        shade: '9, 9, 11',
        base: '14, 14, 17',
        tint1: '20, 20, 24',
        tint2: '28, 28, 34',
        popover: '22, 22, 28',
        fg: '#F2F2F5',
        fg2: '#C4C4CE',
        muted: '#8A8A98',
        faint: '#626270',
        accent: '#669DF6',
        link: '#8AB4F8',
      },
      light: {
        pt: '15, 23, 42',
        shade: '232, 238, 246',
        base: '244, 247, 251',
        tint1: '255, 255, 255',
        tint2: '233, 239, 248',
        popover: '252, 253, 255',
        fg: '#0F172A',
        fg2: '#334155',
        muted: '#5B6B82',
        faint: '#7C8CA5',
        accent: '#2563EB',
        link: '#1D4ED8',
      },
    },
    'warm-carbon': {
      dark: {
        pt: '245, 240, 230',
        shade: '16, 16, 15',
        base: '20, 20, 19',
        tint1: '27, 26, 24',
        tint2: '34, 32, 29',
        popover: '25, 24, 22',
        fg: '#F2EFE9',
        fg2: '#CEC8BC',
        muted: '#A39E93',
        faint: '#6E6A61',
        accent: '#D97757',
        link: '#E59377',
      },
      light: {
        pt: '42, 32, 20',
        shade: '235, 230, 220',
        base: '246, 244, 238',
        tint1: '255, 253, 249',
        tint2: '239, 236, 227',
        popover: '253, 251, 247',
        fg: '#1C1814',
        fg2: '#3F3830',
        muted: '#6B6257',
        faint: '#8E8477',
        accent: '#C25934',
        link: '#B54D28',
      },
    },
    catppuccin: {
      dark: {
        pt: '205, 214, 244',
        shade: '24, 24, 37',
        base: '30, 30, 46',
        tint1: '49, 50, 68',
        tint2: '69, 71, 90',
        popover: '30, 30, 46',
        fg: '#CDD6F4',
        fg2: '#BAC2DE',
        muted: '#9399B2',
        faint: '#6C7086',
        accent: '#CBA6F7',
        link: '#89B4FA',
      },
      light: {
        pt: '76, 79, 105',
        shade: '230, 233, 239',
        base: '239, 241, 245',
        tint1: '252, 253, 255',
        tint2: '220, 224, 232',
        popover: '248, 249, 252',
        fg: '#4C4F69',
        fg2: '#5C5F77',
        muted: '#6C6F85',
        faint: '#8C8FA1',
        accent: '#8839EF',
        link: '#1E66F5',
      },
    },
    nord: {
      dark: {
        pt: '236, 239, 244',
        shade: '36, 41, 51',
        base: '46, 52, 64',
        tint1: '59, 66, 82',
        tint2: '67, 76, 94',
        popover: '46, 52, 64',
        fg: '#ECEFF4',
        fg2: '#D8DEE9',
        muted: '#9AA5B8',
        faint: '#7B88A1',
        accent: '#88C0D0',
        link: '#81A1C1',
      },
      light: {
        pt: '46, 52, 64',
        shade: '229, 233, 240',
        base: '236, 239, 244',
        tint1: '248, 250, 252',
        tint2: '216, 222, 233',
        popover: '250, 252, 254',
        fg: '#2E3440',
        fg2: '#3B4252',
        muted: '#5E6B80',
        faint: '#7B88A1',
        accent: '#5E81AC',
        link: '#4C6E99',
      },
    },
    'rose-pine': {
      dark: {
        pt: '224, 222, 244',
        shade: '25, 23, 36',
        base: '31, 29, 46',
        tint1: '38, 35, 58',
        tint2: '64, 61, 82',
        popover: '31, 29, 46',
        fg: '#E0DEF4',
        fg2: '#C8C4E2',
        muted: '#908CAA',
        faint: '#6E6A86',
        accent: '#C4A7E7',
        link: '#EBBCBA',
      },
      light: {
        pt: '87, 82, 121',
        shade: '242, 233, 225',
        base: '250, 244, 237',
        tint1: '255, 250, 243',
        tint2: '242, 233, 222',
        popover: '255, 251, 246',
        fg: '#575279',
        fg2: '#625D83',
        muted: '#797593',
        faint: '#9893A5',
        accent: '#907AA9',
        link: '#D7827E',
      },
    },
    'tokyo-night': {
      dark: {
        pt: '192, 202, 245',
        shade: '22, 22, 30',
        base: '26, 27, 38',
        tint1: '36, 40, 59',
        tint2: '47, 53, 73',
        popover: '26, 27, 38',
        fg: '#C0CAF5',
        fg2: '#A9B1D6',
        muted: '#787C99',
        faint: '#565F89',
        accent: '#7AA2F7',
        link: '#7DCFFF',
      },
      light: {
        pt: '52, 59, 88',
        shade: '213, 214, 219',
        base: '225, 226, 231',
        tint1: '242, 243, 247',
        tint2: '208, 210, 218',
        popover: '246, 247, 250',
        fg: '#343B58',
        fg2: '#404868',
        muted: '#6172B0',
        faint: '#848CB5',
        accent: '#2E7DE9',
        link: '#007197',
      },
    },
    gruvbox: {
      dark: {
        pt: '235, 219, 178',
        shade: '29, 32, 33',
        base: '40, 40, 40',
        tint1: '60, 56, 54',
        tint2: '80, 73, 69',
        popover: '40, 40, 40',
        fg: '#EBDBB2',
        fg2: '#D5C4A1',
        muted: '#A89984',
        faint: '#7C6F64',
        accent: '#FABD2F',
        link: '#83A598',
      },
      light: {
        pt: '60, 56, 54',
        shade: '235, 219, 178',
        base: '251, 241, 199',
        tint1: '249, 245, 215',
        tint2: '235, 219, 178',
        popover: '252, 248, 224',
        fg: '#3C3836',
        fg2: '#504945',
        muted: '#7C6F64',
        faint: '#928374',
        accent: '#B57614',
        link: '#076678',
      },
    },
    'host-native': {
      dark: {
        pt: '255, 255, 255',
        shade: '17, 17, 20',
        base: '7, 7, 8',
        tint1: '19, 19, 23',
        tint2: '28, 28, 34',
        popover: '20, 20, 26',
        fg: '#FFFFFF',
        fg2: '#BCBDC6',
        muted: '#87888F',
        faint: '#636470',
        accent: '#2F71E3',
        link: '#6A9FCB',
      },
      light: {
        pt: '15, 23, 42',
        shade: '238, 238, 241',
        base: '247, 247, 248',
        tint1: '255, 255, 255',
        tint2: '232, 233, 238',
        popover: '255, 255, 255',
        fg: '#1D1F21',
        fg2: '#3D4348',
        muted: '#5D676F',
        faint: '#8B949E',
        accent: '#0066CC',
        link: '#0055AA',
      },
    },
  };

  var ACCENT_PRESETS = {
    cobalt: { dark: '#669DF6', light: '#2563EB' },
    iris: { dark: '#A58AF8', light: '#7C3AED' },
    amber: { dark: '#F2B84B', light: '#D97706' },
    emerald: { dark: '#50A37B', light: '#059669' },
    rose: { dark: '#F472B6', light: '#DB2777' },
    mono: { dark: '#D4D7E0', light: '#334155' },
  };

  var GRAIN_SVG =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

  // Verified Antigravity 2.0 / 2.34.0 Hub + VS Code Workbench Selectors
  // Explicit exclusions protect sibling plugins and modal/menu/popover overlays.
  var SIBLING_EXCLUDE =
    ':not(#gemini-neko-pet-root):not(#gemini-neko-observer-modal):not(#gemini-neko-stats-bar):not(#ag-context-meter):not(#ag-usage-monitor-capsule):not(#ag-usage-monitor-portal):not(#deck-metrics-strip):not(#agy-prism-popover):not(#' +
    STAGE_ID +
    '):not(#' +
    WCO_PILL_ID +
    '):not(.settings-modal-backdrop):not(.settings-modal-container):not([data-testid="modal-backdrop"]):not([data-testid="media-modal"]):not(.agy-dialog):not([role="dialog"]):not([role="alertdialog"]):not([role="menu"]):not([role="listbox"]):not([role="tooltip"])';

  var DIALOG_DESCENDANT_EXCLUDE =
    ':not(.settings-modal-backdrop *):not(.settings-modal-container *):not(.agy-dialog *):not([role="dialog"] *):not([role="alertdialog"] *):not([role="menu"] *):not([role="listbox"] *):not([data-radix-popper-content-wrapper] *):not(.agy-popover *):not(.quick-input-widget *)';

  var HOLLOW_SURFACES = [
    '#root',
    '#root > div' + SIBLING_EXCLUDE,
    '#root > div > div' + SIBLING_EXCLUDE,
    '#root > div > div > div' + SIBLING_EXCLUDE,
    '.agy-shell',
    '.agy-inset-shell',
    '.agy-sheet:not([data-browser-occluder])',
    '.browser-hole-ancestor',
    '.browser-hole-opaque' + SIBLING_EXCLUDE + DIALOG_DESCENDANT_EXCLUDE,
    '.agy-sheet[data-sheet-inset] [data-main-content-body]',
    '.agy-sheet [data-side-panel-body]',
    '[data-split-panes] .agy-sheet[data-sheet-inset] [data-tiling-pane]',
    '[data-split-panes] .agy-sheet[data-sheet-inset] [data-tiling-pane] > [data-pane-id]',
    '.agy-inset-shell > [data-split-root] > [data-split-sash]',
    'body[data-has-browser-hole="true"]',
    '.monaco-workbench',
    '.monaco-workbench .monaco-grid-view',
    '.monaco-workbench .monaco-split-view2 > .monaco-scrollable-element > .split-view-container > .split-view-view',
  ];

  // Glass chrome containers that MUST use `::before` as backdrop-filter carrier
  // so `position: fixed` descendants (Radix poppers, dropdowns, modals) are NEVER trapped!
  var GLASS_CARRIER_SIDEBARS = [
    '[data-testid="sidebar-split"] > div:first-child',
    '.agy-sidebar:not([data-testid="sidebar-split"] > div:first-child *)',
    'aside[data-side-panel-body]:not(.agy-sheet *):not([data-testid="aux-pane-split"] *):not(.agy-sidebar *):not([data-testid="sidebar-split"] > div:first-child *)',
    '.monaco-workbench .part.activitybar',
    '.monaco-workbench .part.sidebar',
  ];

  var GLASS_CARRIER_TITLEBARS = [
    '[data-testid="title-menu-bar"]',
    '.monaco-workbench .part.titlebar',
  ];

  var GLASS_CARRIER_MAIN_PAGES = [
    'div.bg-background:not(.agy-shell):not(.sticky):not([style*="sticky"]):not(.agy-dialog):not(.settings-modal-container):has([data-testid="customizations-search"], [data-testid="customizations-marketplace"], [data-testid="customizations-installed"])',
    '[data-testid="plugin-detail"]',
  ];

  var GLASS_CARRIER_COMPOSERS = [
    '[data-testid="agent-input-box"]',
    '#antigravity.agentSidePanelInputBox > .surface-composer-card',
    '.surface-composer-card',
    '.agy-composer',
  ];

  var SOLID_POPOVERS = [
    '.agy-dialog',
    '.settings-modal-container',
    '.agy-overlay',
    '.agy-popover',
    '.agy-menu',
    '.agy-toast',
    '[role="dialog"]:not(#gemini-neko-observer-modal):not([data-testid="media-modal"])',
    '[role="menu"]',
    '[role="listbox"]',
    '[role="tooltip"]',
    '[data-radix-popper-content-wrapper] > *',
    '[data-testid="title-menu-bar"] [data-browser-occluder="true"]',
    '.surface-opaque.bg-sidebar:not(.sticky):not([style*="sticky"])',
    '[data-testid="context-menu-popup"]',
    '[data-testid="context-menu-submenu-popup"]',
    '[data-testid="permissions-menu"]',
    '[data-testid="add-resource-menu"]',
    '[data-testid="toast-notification"]',
    '[class*="bg-popover"]:not([role="tooltip"])',
    '.quick-input-widget',
    '.monaco-hover',
    '.editor-widget.suggest-widget',
    '.parameter-hints-widget',
    '.context-view .monaco-menu-container',
  ];

  // ---------------------------------------------------------------------------
  // Utilities & Color Math
  // ---------------------------------------------------------------------------
  function clamp(v, lo, hi) {
    var n = Number(v);
    if (!Number.isFinite(n)) n = lo;
    return Math.min(hi, Math.max(lo, n));
  }
  function num(v, dflt) {
    var n = Number(v);
    return Number.isFinite(n) ? n : dflt;
  }
  function bool(v, dflt) {
    return typeof v === 'boolean' ? v : dflt;
  }
  function normUnit(v, dflt, lo, hi) {
    var n = Number(v);
    if (!Number.isFinite(n)) return dflt;
    if (n > 1 && hi <= 1) n = n / 100;
    return clamp(n, lo, hi);
  }
  function normFactor(v, dflt, lo, hi) {
    var n = Number(v);
    if (!Number.isFinite(n)) return dflt;
    if (n > 2.5) n = n / 100;
    return clamp(n, lo, hi);
  }
  function parseRgbTriplet(str) {
    var m = String(str || '').match(/([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
    if (!m) return [14, 14, 17];
    return [clamp(Math.round(Number(m[1])), 0, 255), clamp(Math.round(Number(m[2])), 0, 255), clamp(Math.round(Number(m[3])), 0, 255)];
  }
  function hexToRgb(hex) {
    var s = String(hex || '').trim().replace(/^#/, '');
    if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
    if (!/^[0-9a-f]{6}$/i.test(s)) return null;
    return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
  }
  function rgbToHex(rgb) {
    return (
      '#' +
      [0, 1, 2]
        .map(function (i) {
          return ('0' + clamp(Math.round(rgb[i]), 0, 255).toString(16)).slice(-2);
        })
        .join('')
    );
  }
  function parseCssColor(raw) {
    if (!raw) return null;
    var s = String(raw).trim();
    var h = hexToRgb(s);
    if (h) return [h[0], h[1], h[2], 1];
    var m = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)/i.exec(s);
    if (m) {
      var a = m[4] === undefined ? 1 : m[4].slice(-1) === '%' ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
      return [Number(m[1]), Number(m[2]), Number(m[3]), clamp(a, 0, 1)];
    }
    return null;
  }
  function relLum(rgb) {
    var rs = [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255].map(function (c) {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs[0] + 0.7152 * rs[1] + 0.0722 * rs[2];
  }
  function mixRgb(a, b, weightB) {
    var w = clamp(weightB, 0, 1);
    return [
      Math.round(a[0] * (1 - w) + b[0] * w),
      Math.round(a[1] * (1 - w) + b[1] * w),
      Math.round(a[2] * (1 - w) + b[2] * w),
    ];
  }
  function rgbaStr(rgb, alpha) {
    return 'rgba(' + rgb[0] + ', ' + rgb[1] + ', ' + rgb[2] + ', ' + clamp(alpha, 0, 1).toFixed(3) + ')';
  }
  function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var h = 0;
    var s = 0;
    var l = (max + min) / 2;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        default:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }
    return [h * 360, s, l];
  }
  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    s = clamp(s, 0, 1);
    l = clamp(l, 0, 1);
    if (s === 0) {
      var gray = Math.round(l * 255);
      return [gray, gray, gray];
    }
    function hue2rgb(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    return [
      Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
      Math.round(hue2rgb(p, q, h) * 255),
      Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
    ];
  }

  // ---------------------------------------------------------------------------
  // Internal Runtime State
  // ---------------------------------------------------------------------------
  var destroyed = false;
  var lastPayload = null;
  var accentCache = {};
  var rpcSeq = 0;
  var rpcPending = {};

  var state = {
    skinEnabled: true,
    wallpaperReady: false,
    rawCfg: {},
    cfg: {},
    item: null,
    mediaOrigin: '',
    slides: [],
    slideIdx: 0,
    slideTimer: 0,
    hostTheme: 'dark',
    effectiveTheme: 'dark',
    autoPaused: false,
    pauseReason: '',
    batteryDischarging: false,
    hiddenDebounced: false,
    hiddenTimer: 0,
    blurPollTimer: 0,
    videoWatchTimer: 0,
    wakeNudgeTimer: 0,
    lastVidCheckTime: -1,
    lastVidCheckFrames: -1,
    lastVidCheckAt: 0,
    vidStallCount: 0,
    rvfcCount: 0,
    unmuteGestureCleanup: null,
    activeWrap: null,
    pendingWrap: null,
    pendingMediaTimer: 0,
    mediaMountSeq: 0,
    outgoingWraps: [],
    activeVideo: null,
    activeAudio: null,
    activeIframe: null,
    activeVideoStageFrame: null,
    activeVideoStageSid: '',
    activeVideoStageReady: false,
    activeVideoStageUrl: '',
    videoStageMessageCleanup: null,
    activeMediaKey: '',
    failedMediaKey: '',
    failedMediaRetries: 0,
    preferBlobMedia: false,
    transitionTimer: 0,
    lastHostFocus: null,
    lastSidecarSig: '',
    lastStructuralSig: '',
    lastCaretSig: '',
    lastWcoSig: '',
    wcoThemeTimer: 0,
    wcoConfirmTimer: 0,
    wcoConfirmTimer2: 0,
    wcoHeightRepairCount: 0,
    origContextMeterSyncOverlay: null,
    wrappedContextMeterApi: null,
    wrappedContextMeterFn: null,
    replacedContextMeterApi: false,
    origContextMeterApiObj: null,
    wcoOverlayTarget: null,
    wcoGeometryCleanup: null,
    lastHoleClip: '',
    watchdog15Timer: 0,
    watchdog80Timer: 0,
    appliedVars: {},
    accentRgbStr: '102, 157, 246',
    parallaxTargetX: 0,
    parallaxTargetY: 0,
    parallaxCurX: 0,
    parallaxCurY: 0,
    parallaxRaf: 0,
    lastParallaxFrameAt: 0,
    fxParticles: [],
    fxRaf: 0,
    lastFxFrameAt: 0,
    lastTrailAt: 0,
  };

  var domObs = null;
  var themeObs = null;
  var holeAttrObs = null;
  var holeSubObs = null;
  var holeResizeObs = null;
  var holeRaf = 0;
  var holeRafUntil = 0;
  var themeMq = null;
  var themeDebounce = 0;
  var batteryObj = null;
  var cleanups = [];

  function listen(target, type, fn, opts) {
    if (!target || !target.addEventListener) return;
    target.addEventListener(type, fn, opts);
    cleanups.push(function () {
      try {
        target.removeEventListener(type, fn, opts);
      } catch (_) {}
    });
  }

  // ---------------------------------------------------------------------------
  // RPC Bridge (`__agyPrismCall`)
  // ---------------------------------------------------------------------------
  function callHostRpc(method, params) {
    var fn = W[BINDING_KEY];
    if (typeof fn !== 'function') return Promise.resolve(null);
    rpcSeq += 1;
    var id = 'skin-' + rpcSeq + '-' + Date.now().toString(36);
    var reqStr = JSON.stringify({ id: id, method: method, params: params || {} });
    return new Promise(function (resolve) {
      var settled = false;
      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        delete rpcPending[id];
        resolve(null);
      }, 5000);
      rpcPending[id] = function (res) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        delete rpcPending[id];
        resolve(res);
      };
      try {
        var direct = fn(reqStr);
        if (direct && typeof direct.then === 'function') {
          direct.then(
            function (val) {
              if (rpcPending[id]) rpcPending[id](val);
            },
            function () {
              if (rpcPending[id]) rpcPending[id](null);
            }
          );
        } else if (direct !== undefined) {
          if (rpcPending[id]) rpcPending[id](direct);
        }
      } catch (_) {
        if (rpcPending[id]) rpcPending[id](null);
      }
    });
  }

  function receive(msg) {
    if (destroyed) return false;
    try {
      if (typeof msg === 'string') msg = JSON.parse(msg);
    } catch (_) {
      return false;
    }
    if (!msg || typeof msg !== 'object') return false;
    if (msg.event === 'payload' || msg.event === 'skin') {
      applyPayload(msg.data || {});
      return true;
    }
    if (msg.id && rpcPending[msg.id]) {
      rpcPending[msg.id](msg.ok ? msg.result : null);
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Host Theme Detection (`body.dark` / `body.light` / `--foreground` luminance)
  // ---------------------------------------------------------------------------
  function hasAnyClass(el, clsList) {
    if (!el || !el.classList) return false;
    for (var i = 0; i < clsList.length; i += 1) {
      if (el.classList.contains(clsList[i])) return true;
    }
    return false;
  }

  function detectHostTheme() {
    var root = doc.documentElement;
    var body = doc.body;
    var LIGHT = ['light', 'theme-light', 'light-theme', 'vscode-light', 'vscode-high-contrast-light'];
    var DARK = ['dark', 'theme-dark', 'dark-theme', 'vscode-dark', 'vscode-high-contrast'];
    if (hasAnyClass(body, LIGHT) || hasAnyClass(root, LIGHT)) return 'light';
    if (hasAnyClass(body, DARK) || hasAnyClass(root, DARK)) return 'dark';
    var dt = ((root && root.getAttribute('data-ag-cs-theme')) || (root && root.getAttribute('data-theme')) || (body && body.getAttribute('data-theme')) || '').toLowerCase();
    if (dt.indexOf('light') >= 0) return 'light';
    if (dt.indexOf('dark') >= 0) return 'dark';
    try {
      var target = body || root;
      var fgRaw = getComputedStyle(target).getPropertyValue('--foreground').trim() || getComputedStyle(target).color;
      var fg = parseCssColor(fgRaw);
      if (fg && fg[3] > 0.4) return relLum(fg) > 0.45 ? 'dark' : 'light';
    } catch (_) {}
    try {
      if (W.matchMedia && W.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
    } catch (_) {}
    return 'dark';
  }

  function resolveEffectiveTheme(cfg) {
    var mode = String(cfg.themeMode || 'auto').toLowerCase();
    if (mode === 'light' || mode === 'dark') return mode;
    if (cfg.themeFollow && state.item && state.item.schemeColor) {
      var sc = parseCssColor(state.item.schemeColor);
      if (sc) return relLum(sc) > 0.42 ? 'light' : 'dark';
    }
    return state.hostTheme;
  }

  // ---------------------------------------------------------------------------
  // 32x32 Offscreen Chroma-Weighted Dynamic Wallpaper Accent Extractor
  // ---------------------------------------------------------------------------
  function extractAccentFromImageSource(imgEl, wallpaperId) {
    try {
      var canvas = doc.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      var ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return null;
      ctx.drawImage(imgEl, 0, 0, 32, 32);
      var data = ctx.getImageData(0, 0, 32, 32).data;
      var buckets = [];
      for (var b = 0; b < 24; b += 1) buckets.push({ w: 0, hSin: 0, hCos: 0, sSum: 0 });

      for (var i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue;
        var hsl = rgbToHsl(data[i], data[i + 1], data[i + 2]);
        var h = hsl[0];
        var s = hsl[1];
        var l = hsl[2];
        if (l < 0.12 || l > 0.90 || s < 0.16) continue;
        var weight = s * Math.max(0.1, 1 - Math.abs(l - 0.5) * 1.4);
        var idx = Math.floor(h / 15) % 24;
        var rad = (h * Math.PI) / 180;
        buckets[idx].w += weight;
        buckets[idx].hSin += Math.sin(rad) * weight;
        buckets[idx].hCos += Math.cos(rad) * weight;
        buckets[idx].sSum += s * weight;
      }

      var best = null;
      for (var k = 0; k < 24; k += 1) {
        if (!best || buckets[k].w > best.w) best = buckets[k];
      }
      if (!best || best.w < 0.25) {
        return {
          wallpaperId: String(wallpaperId || ''),
          darkHex: '#669DF6',
          lightHex: '#2563EB',
          tintRgb: '102, 157, 246',
        };
      }
      var avgH = (Math.atan2(best.hSin, best.hCos) * 180) / Math.PI;
      if (avgH < 0) avgH += 360;
      var avgS = clamp(best.sSum / best.w, 0.52, 0.84);
      var darkRgb = hslToRgb(avgH, avgS, 0.68);
      var lightRgb = hslToRgb(avgH, clamp(avgS, 0.55, 0.82), 0.44);
      var tintRgb = hslToRgb(avgH, 0.45, 0.50);
      return {
        wallpaperId: String(wallpaperId || ''),
        darkHex: rgbToHex(darkRgb),
        lightHex: rgbToHex(lightRgb),
        tintRgb: tintRgb[0] + ', ' + tintRgb[1] + ', ' + tintRgb[2],
      };
    } catch (_) {
      return null;
    }
  }

  function extractAccent(urlOrElement, wallpaperId) {
    var wid = String(wallpaperId || (state.item && state.item.id) || '');
    if (wid && state.cfg && state.cfg.extractedAccent && state.cfg.extractedAccent.wallpaperId === wid && state.cfg.extractedAccent.darkHex) {
      accentCache[wid] = state.cfg.extractedAccent;
      return Promise.resolve(state.cfg.extractedAccent);
    }
    if (wid && accentCache[wid]) return Promise.resolve(accentCache[wid]);

    if (urlOrElement && typeof urlOrElement === 'object' && urlOrElement.tagName) {
      var resDirect = extractAccentFromImageSource(urlOrElement, wid);
      if (resDirect) {
        if (wid) accentCache[wid] = resDirect;
        callHostRpc('accent.save', resDirect);
      }
      return Promise.resolve(resDirect);
    }

    var srcUrl = String(urlOrElement || (state.item && (state.item.thumbUrl || state.item.mediaUrl)) || '').trim();
    if (!srcUrl) return Promise.resolve(null);

    return new Promise(function (resolve) {
      var ImageCtor = typeof W.Image === 'function' ? W.Image : typeof Image === 'function' ? Image : null;
      var img = ImageCtor ? new ImageCtor() : doc.createElement('img');
      img.crossOrigin = 'anonymous';
      var done = false;
      var blobUrl = '';
      var ac = null;
      var timer = 0;
      var finish = function (val) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        timer = 0;
        if (ac) {
          try {
            ac.abort();
          } catch (_) {}
          ac = null;
        }
        if (blobUrl) {
          try {
            if (typeof W.URL !== 'undefined' && typeof W.URL.revokeObjectURL === 'function') {
              W.URL.revokeObjectURL(blobUrl);
            }
          } catch (_) {}
          blobUrl = '';
        }
        if (val) {
          if (wid) accentCache[wid] = val;
          callHostRpc('accent.save', val);
        }
        resolve(val);
      };
      timer = setTimeout(function () {
        finish(null);
      }, 4000);
      var handleLoad = function () {
        finish(extractAccentFromImageSource(img, wid));
      };
      var handleErr = function () {
        finish(null);
      };
      img.onload = handleLoad;
      img.onerror = handleErr;
      if (typeof img.addEventListener === 'function') {
        img.addEventListener('load', handleLoad);
        img.addEventListener('error', handleErr);
      }
      if (isCrossSchemeLoopbackMediaUrl(srcUrl)) {
        ac = typeof W.AbortController === 'function' ? new W.AbortController() : null;
        W.fetch(srcUrl, ac ? { signal: ac.signal } : undefined)
          .then(function (res) {
            if (!res || !res.ok) throw new Error('HTTP ' + (res ? res.status : 0));
            return res.blob();
          })
          .then(function (blob) {
            if (done) return;
            if (!blob || blob.size <= 0) {
              finish(null);
              return;
            }
            blobUrl = W.URL.createObjectURL(blob);
            if (done) {
              try {
                W.URL.revokeObjectURL(blobUrl);
              } catch (_) {}
              blobUrl = '';
              return;
            }
            img.src = blobUrl;
          })
          .catch(function () {
            finish(null);
          });
        return;
      }
      img.src = srcUrl;
    });
  }

  // ---------------------------------------------------------------------------
  // Config Normalization & CSS Assembly (`#agy-prism-css` + `#agy-prism-caret-css`)
  // ---------------------------------------------------------------------------
  function normalizeConfig(rawCfg, item) {
    var base = rawCfg && typeof rawCfg === 'object' ? rawCfg : {};
    var wid = item && item.id ? String(item.id) : String(base.wallpaperId || '');
    var ovMap = base.perWallpaperOverrides && typeof base.perWallpaperOverrides === 'object' ? base.perWallpaperOverrides : null;
    var ov = wid && ovMap && ovMap[wid] && typeof ovMap[wid] === 'object' ? ovMap[wid] : null;
    var c = {};
    var k;
    for (k in base) if (Object.prototype.hasOwnProperty.call(base, k)) c[k] = base[k];
    if (ov) {
      for (k in ov) if (Object.prototype.hasOwnProperty.call(ov, k) && ov[k] !== undefined) c[k] = ov[k];
    }

    var schemeKey = String(c.colorScheme || 'prism-default').toLowerCase();
    if (!COLOR_SCHEMES[schemeKey]) schemeKey = 'prism-default';

    var corners = String(c.cornerStyle || 'balanced').toLowerCase();
    if (corners !== 'sharp' && corners !== 'soft') corners = 'balanced';

    var borders = String(c.borders != null ? c.borders : 'on').toLowerCase();
    if (typeof c.borders === 'number') {
      borders = c.borders <= 0.02 ? 'off' : c.borders < 0.25 ? 'subtle' : 'on';
    } else if (borders !== 'off' && borders !== 'subtle') {
      borders = 'on';
    }

    var codeMode = String(c.codeReadabilityMode || (c.thinkingNative ? 'solid' : c.thinkingGlass ? 'frosted' : 'translucent')).toLowerCase();
    if (codeMode === 'native') codeMode = 'solid';
    if (codeMode !== 'frosted' && codeMode !== 'solid') codeMode = 'translucent';

    var fit = String(c.fit || c.objectFit || 'cover').toLowerCase();
    if (fit !== 'contain' && fit !== 'fill' && fit !== 'center') fit = 'cover';

    var trans = String(c.switchTransition || 'fade').toLowerCase();
    if (['cut', 'fade', 'push', 'wipe', 'iris', 'zoom', 'bars'].indexOf(trans) < 0) trans = 'fade';

    var transDir = String(c.switchTransitionDir || 'left').toLowerCase();
    if (['left', 'right', 'up', 'down'].indexOf(transDir) < 0) transDir = 'left';

    var transSpeed = String(c.switchTransitionSpeed || 'normal').toLowerCase();
    if (transSpeed !== 'fast' && transSpeed !== 'slow') transSpeed = 'normal';

    var extAcc = null;
    if (c.extractedAccent && typeof c.extractedAccent === 'object' && c.extractedAccent.darkHex) {
      if (!wid || !c.extractedAccent.wallpaperId || String(c.extractedAccent.wallpaperId) === wid) {
        extAcc = c.extractedAccent;
      }
    }
    if (!extAcc && wid && c.accentCache && typeof c.accentCache === 'object' && c.accentCache[wid] && c.accentCache[wid].darkHex) {
      extAcc = c.accentCache[wid];
    }
    if (!extAcc && wid && accentCache[wid]) {
      extAcc = accentCache[wid];
    }
    if (extAcc && wid) {
      accentCache[wid] = extAcc;
    }

    return {
      wallpaperId: wid,
      layoutMode: c.layoutMode === 'flush' ? 'flush' : 'islands',
      islandGap: clamp(num(c.islandGap, 8), 0, 20),
      workspacePad: clamp(num(c.workspacePad, 8), 0, 20),
      cornerStyle: corners,
      leftCornerRadius: String(c.leftSidebarRadius || c.leftSidebarCornerRadius || 'auto'),
      rightCornerRadius: String(c.rightSidebarRadius || c.rightSidebarCornerRadius || 'auto'),
      borders: borders,
      shadows: bool(c.shadows, true),
      transparentWindowControls: bool(c.transparentWindowControls, true),
      themeMode: String(c.themeMode || 'auto').toLowerCase(),
      themeFollow: bool(c.themeFollow, false),
      colorScheme: schemeKey,
      accentMode: String(c.accentMode || 'dynamic').toLowerCase(),
      customAccent: String(c.customAccent || c.accent || '#669DF6'),
      extractedAccent: extAcc,
      wallTintMix: normUnit(c.wallTintMix != null ? c.wallTintMix : 0.06, 0.06, 0, 0.22),
      glassSurfaces: bool(c.glassSurfaces != null ? c.glassSurfaces : c.glassEnabled, true),
      glassOpacity: normUnit(c.glassOpacity != null ? c.glassOpacity : c.widgetFill != null ? c.widgetFill : 0.76, 0.76, 0.25, 0.98),
      glassBlur: clamp(num(c.glassBlur != null ? c.glassBlur : c.blur, 16), 0, 48),
      sidebarOpacity: c.sidebarOpacity === null || c.sidebarOpacity === undefined || c.sidebarOpacity === '' || c.sidebarOpacity === 'auto' ? null : normUnit(c.sidebarOpacity, 0.76, 0.20, 0.98),
      sidebarBlur: c.sidebarBlur === null || c.sidebarBlur === undefined || c.sidebarBlur === '' || c.sidebarBlur === 'auto' ? null : clamp(num(c.sidebarBlur, 16), 0, 48),
      glassFidelity: normUnit(c.glassFidelity != null ? c.glassFidelity : 92, 0.92, 0, 1),
      chatGlassFidelity: normUnit(c.chatGlassFidelity != null ? c.chatGlassFidelity : 90, 0.90, 0, 1),
      scrimOpacity: normUnit(c.scrimOpacity != null ? c.scrimOpacity : c.scrim != null ? c.scrim : 0.26, 0.26, 0, 0.94),
      scrimColor: String(c.scrimColor || 'auto').trim(),
      vignette: bool(c.vignette, true),
      contrastFloor: bool(c.contrastFloor, true),
      codeReadabilityMode: codeMode,
      caretColor: String(c.caretColor || '').trim(),
      filterPreset: String(c.filterPreset || 'none').toLowerCase(),
      fit: fit,
      flip: bool(c.flip, false),
      posX: clamp(num(c.layerPosX != null ? c.layerPosX : c.layerPositionX, 50), 0, 100),
      posY: clamp(num(c.layerPosY != null ? c.layerPosY : c.layerPositionY, 50), 0, 100),
      scale: clamp(num(c.layerScale, 100), 50, 150),
      mediaOpacity:
        c.mediaOpacity != null
          ? normUnit(c.mediaOpacity, 1, 0.05, 1)
          : c.wallpaperOpacity != null
            ? clamp(1 - normUnit(c.wallpaperOpacity, 0, 0, 0.95), 0.05, 1)
            : 1,
      mediaBlur: clamp(num(c.mediaBlur != null ? c.mediaBlur : c.wallpaperBlur != null ? c.wallpaperBlur : c.blurPx, 0), 0, 64),
      mediaBrightness: normFactor(c.mediaBrightness != null ? c.mediaBrightness : c.backgroundBrightness != null ? c.backgroundBrightness : 100, 1, 0.4, 1.6),
      mediaContrast: normFactor(c.mediaContrast != null ? c.mediaContrast : c.backgroundContrast != null ? c.backgroundContrast : 100, 1, 0.4, 2.0),
      mediaSaturate: normFactor(c.mediaSaturate != null ? c.mediaSaturate : c.backgroundSaturate != null ? c.backgroundSaturate : 100, 1, 0, 2.0),
      grainAlpha: normUnit(c.grainAlpha, 0.022, 0, 0.2),
      switchTransition: trans,
      switchTransitionDir: transDir,
      switchTransitionSpeed: transSpeed,
      pictureSlideSeconds: clamp(num(c.pictureSlideSeconds, 30), 0, 3600),
      paused: bool(c.paused, false),
      muted: c.audioEnabled != null ? !c.audioEnabled : c.videoAudioEnabled != null ? !c.videoAudioEnabled : bool(c.muted, true),
      volume: normUnit(c.volume != null ? c.volume : c.videoVolume != null ? c.videoVolume : 0.5, 0.5, 0, 1),
      playbackRate: clamp(num(c.playbackRate, 1), 0.25, 2),
      fpsCap: clamp(num(c.fpsCap, 0), 0, 120),
      rotationEnabled: bool(c.rotationEnabled, false),
      rotationTrigger: String(c.rotationTrigger || 'interval'),
      pauseOnHidden: bool(c.pauseOnHidden, true),
      pauseOnBlur: bool(c.pauseOnBlur != null ? c.pauseOnBlur : c.pauseOnUnfocus, false),
      pauseOnBattery: bool(c.pauseOnBattery, false),
      pauseOnFullscreen: bool(c.pauseOnFullscreen, false),
      agentBusyPaused: bool(c.agentBusyPaused, false),
      interactiveWeb: bool(c.interactiveWeb, false),
      fxEnabled: bool(c.fxEnabled, false),
      fxClickMode: String(c.fxClickMode || 'ripple').toLowerCase(),
      fxTrailMode: String(c.fxTrailMode || 'dust').toLowerCase(),
      parallaxEnabled: bool(c.parallaxEnabled, false),
      parallaxStrength: clamp(num(c.parallaxStrength, 12), 0, 40),
    };
  }

  function resolveAccent(cfg, scheme, isLight) {
    var mode = cfg.accentMode;
    var hex = scheme.accent;
    var wallTint = parseRgbTriplet(scheme.base);
    var ext = cfg.extractedAccent;

    if (ext && ext.darkHex && ext.lightHex) {
      if (ext.tintRgb) wallTint = parseRgbTriplet(ext.tintRgb);
      if (mode === 'dynamic') hex = isLight ? ext.lightHex : ext.darkHex;
    }
    if (ACCENT_PRESETS[mode]) {
      hex = isLight ? ACCENT_PRESETS[mode].light : ACCENT_PRESETS[mode].dark;
    } else if (mode === 'custom' && hexToRgb(cfg.customAccent)) {
      hex = cfg.customAccent;
    } else if (mode === 'palette') {
      hex = scheme.accent;
    }

    var rgb = hexToRgb(hex) || hexToRgb(scheme.accent) || [102, 157, 246];
    if (!ext || !ext.tintRgb) wallTint = rgb;
    var accentFg = relLum(rgb) > 0.46 ? '#14120E' : '#FFFFFF';
    return {
      hex: rgbToHex(rgb),
      rgb: rgb,
      rgbStr: rgb[0] + ', ' + rgb[1] + ', ' + rgb[2],
      fg: accentFg,
      wallTint: wallTint,
      wallTintStr: wallTint[0] + ', ' + wallTint[1] + ', ' + wallTint[2],
    };
  }

  function computeRadii(cfg) {
    if (cfg.layoutMode === 'flush') {
      var fCtl = cfg.cornerStyle === 'sharp' ? 4 : cfg.cornerStyle === 'soft' ? 8 : 6;
      return { island: 0, sheet: 12, card: fCtl + 2, ctl: fCtl, xs: Math.max(2, fCtl - 2) };
    }
    if (cfg.cornerStyle === 'sharp') return { island: 6, sheet: 8, card: 5, ctl: 4, xs: 2 };
    if (cfg.cornerStyle === 'soft') return { island: 16, sheet: 18, card: 13, ctl: 9, xs: 6 };
    return { island: 12, sheet: 14, card: 10, ctl: 7, xs: 4 };
  }

  // WCAG Readability Floor surface blend (DSH `weClampSurfaceColor` + Prism tint mix)
  function computeFlooredRgba(surfaceRgb, wallTintRgb, tintMix, rawAlpha, floorFidelity, minFloorAlpha, solidMode) {
    var tinted = mixRgb(surfaceRgb, wallTintRgb, tintMix);
    if (solidMode) return rgbaStr(tinted, 1);
    var effectiveFloor = minFloorAlpha * clamp(floorFidelity, 0, 1);
    var finalAlpha = clamp(Math.max(rawAlpha, effectiveFloor), 0, 0.99);
    return rgbaStr(tinted, finalAlpha);
  }

  function computeSkinTokens(cfg) {
    var isLight = state.effectiveTheme === 'light';
    var schemePair = COLOR_SCHEMES[cfg.colorScheme] || COLOR_SCHEMES['prism-default'];
    var S = isLight ? schemePair.light : schemePair.dark;
    var acc = resolveAccent(cfg, S, isLight);
    state.accentRgbStr = acc.rgbStr;
    var R = computeRadii(cfg);

    var ptRgb = parseRgbTriplet(S.pt);
    var shadeRgb = parseRgbTriplet(S.shade);
    var baseRgb = parseRgbTriplet(S.base);
    var tint1Rgb = parseRgbTriplet(S.tint1);
    var tint2Rgb = parseRgbTriplet(S.tint2);
    var popRgb = parseRgbTriplet(S.popover);

    var g = cfg.glassOpacity;
    var solidChrome = !cfg.glassSurfaces;

    var sbBaseRgb = !isLight && (shadeRgb[0] + shadeRgb[1] + shadeRgb[2] > baseRgb[0] + baseRgb[1] + baseRgb[2]) ? baseRgb : shadeRgb;
    var hasCustomSbOp = cfg.sidebarOpacity !== null && cfg.sidebarOpacity !== undefined;
    var effSbOp = hasCustomSbOp ? cfg.sidebarOpacity : g;
    var minSidebarFloor = hasCustomSbOp ? 0.20 : (cfg.contrastFloor ? (isLight ? 0.62 : 0.52) : 0.25);
    var deepSbRgb = isLight ? mixRgb(sbBaseRgb, [215, 224, 238], 0.35) : mixRgb(sbBaseRgb, [3, 4, 7], 0.55);
    var deepSbAlpha = solidChrome
      ? 1
      : isLight
        ? clamp(Math.max(effSbOp + 0.14, 0.90), 0.45, 0.97)
        : clamp(Math.max(effSbOp + 0.12, 0.88), 0.35, 0.96);

    var rawChatA = cfg.layoutMode === 'flush' && !isLight ? clamp(g * 0.24, 0, 0.82) : isLight ? clamp(g * 0.62, 0.28, 0.92) : clamp(g * 0.42, 0.08, 0.88);
    var rawEditorA = isLight ? clamp(g * 0.96, 0.55, 0.99) : clamp(g * 0.92, 0.45, 0.98);
    var rawCardA = isLight ? clamp(g * 0.86, 0.50, 0.98) : clamp(g * 0.78, 0.32, 0.96);
    var rawCompA = isLight ? clamp(g * 0.94, 0.65, 0.99) : clamp(g * 0.92, 0.48, 0.98);

    var minChatFloor = isLight ? 0.42 : 0.16;
    var minEditorFloor = cfg.contrastFloor ? (isLight ? 0.84 : 0.72) : (isLight ? 0.52 : 0.38);
    var minCardFloor = isLight ? 0.62 : 0.48;
    var minCompFloor = isLight ? 0.72 : 0.58;

    var surfSidebar = computeFlooredRgba(
      sbBaseRgb,
      acc.wallTint,
      cfg.wallTintMix * 0.75,
      effSbOp,
      hasCustomSbOp ? 1 : cfg.glassFidelity,
      minSidebarFloor,
      solidChrome
    );
    var surfSidebarDeep = rgbaStr(mixRgb(deepSbRgb, acc.wallTint, cfg.wallTintMix * 0.45), deepSbAlpha);
    var surfChat = computeFlooredRgba(baseRgb, acc.wallTint, cfg.wallTintMix * 0.75, rawChatA, cfg.chatGlassFidelity, minChatFloor, solidChrome);
    var surfEditor = computeFlooredRgba(
      baseRgb,
      acc.wallTint,
      cfg.wallTintMix * 0.5,
      rawEditorA,
      cfg.contrastFloor ? 1 : cfg.glassFidelity,
      minEditorFloor,
      solidChrome || cfg.codeReadabilityMode === 'solid'
    );
    var surfCard = computeFlooredRgba(tint1Rgb, acc.wallTint, cfg.wallTintMix, rawCardA, cfg.glassFidelity, minCardFloor, solidChrome);
    var surfComp = computeFlooredRgba(tint1Rgb, acc.wallTint, cfg.wallTintMix, rawCompA, cfg.glassFidelity, minCompFloor, solidChrome);
    var surfPopover = rgbaStr(mixRgb(popRgb, acc.wallTint, cfg.wallTintMix * 0.4), isLight ? 0.97 : 0.96);

    var borderScale = cfg.borders === 'off' ? 0 : cfg.borders === 'subtle' ? 0.5 : 1;
    var borderHairline = rgbaStr(ptRgb, (isLight ? 0.095 : 0.075) * borderScale);
    var borderIsland = rgbaStr(ptRgb, (isLight ? 0.125 : 0.105) * borderScale);
    var borderCard = rgbaStr(ptRgb, (isLight ? 0.115 : 0.09) * borderScale);
    var borderPopover = rgbaStr(ptRgb, isLight ? 0.16 : 0.145);
    var specularTop = borderScale === 0 ? 'transparent' : isLight ? 'rgba(255, 255, 255, 0.88)' : 'rgba(255, 255, 255, 0.075)';
    var sheen = isLight
      ? 'linear-gradient(172deg, rgba(255, 255, 255, 0.68) 0%, rgba(255, 255, 255, 0) 40%)'
      : 'linear-gradient(172deg, rgba(255, 255, 255, 0.042) 0%, rgba(255, 255, 255, 0) 38%)';

    var shadowIsland =
      cfg.layoutMode === 'flush' || !cfg.shadows
        ? 'none'
        : isLight
          ? '0 10px 28px -10px rgba(15, 23, 42, 0.14), 0 2px 6px rgba(15, 23, 42, 0.06)'
          : '0 10px 28px -8px rgba(0, 0, 0, 0.46), 0 2px 6px rgba(0, 0, 0, 0.24)';
    var shadowPopover = isLight
      ? '0 28px 64px -18px rgba(15, 23, 42, 0.28), 0 2px 8px rgba(15, 23, 42, 0.10)'
      : '0 28px 64px -14px rgba(0, 0, 0, 0.64), 0 2px 8px rgba(0, 0, 0, 0.30)';

    var autoScrim = !cfg.scrimColor || /^(auto|rgba?\(0,\s*0,\s*0|#000|#000000|black)$/i.test(cfg.scrimColor);
    var scrimBg = autoScrim ? rgbaStr(shadeRgb, 1) : cfg.scrimColor;
    var scrimAlpha = isLight && autoScrim ? clamp(0.32 + cfg.scrimOpacity * 0.62, 0.18, 0.94) : cfg.scrimOpacity;

    var vignetteGrad = isLight
      ? 'radial-gradient(ellipse 56% 64% at 50% 48%, rgba(255,255,255,0.42) 0%, rgba(244,247,251,0.24) 60%, rgba(232,238,246,0.52) 100%)'
      : 'radial-gradient(ellipse 56% 64% at 50% 48%, rgba(9,9,11,0.06) 0%, rgba(9,9,11,0.28) 58%, rgba(9,9,11,0.62) 100%)';

    var blurMd = cfg.glassSurfaces ? cfg.glassBlur : 0;
    var sbBlurPx = cfg.glassSurfaces ? (cfg.sidebarBlur !== null && cfg.sidebarBlur !== undefined ? cfg.sidebarBlur : cfg.glassBlur) : 0;
    var blurLg = cfg.glassSurfaces ? Math.min(48, cfg.glassBlur + 4) : 0;
    var blurXl = Math.max(20, cfg.glassBlur + 8);

    var fitCss = cfg.fit === 'center' ? 'none' : cfg.fit;
    var isZeroCopyOverlaySafe =
      cfg.mediaBlur === 0 &&
      cfg.filterPreset === 'none' &&
      Math.abs(cfg.mediaBrightness - 1) <= 0.01 &&
      Math.abs(cfg.mediaContrast - 1) <= 0.01 &&
      (Math.abs(cfg.mediaSaturate - 1) <= 0.01 || Math.abs(cfg.mediaSaturate - 1.05) <= 0.006);
    var filterParts = [];
    if (cfg.mediaBlur > 0) filterParts.push('blur(' + cfg.mediaBlur + 'px)');
    if (Math.abs(cfg.mediaBrightness - 1) > 0.01) filterParts.push('brightness(' + Math.round(cfg.mediaBrightness * 100) + '%)');
    if (Math.abs(cfg.mediaContrast - 1) > 0.01) filterParts.push('contrast(' + Math.round(cfg.mediaContrast * 100) + '%)');
    if (!isZeroCopyOverlaySafe && Math.abs(cfg.mediaSaturate - 1) > 0.01) {
      filterParts.push('saturate(' + Math.round(cfg.mediaSaturate * 100) + '%)');
    }
    if (cfg.filterPreset === 'vivid') filterParts.push('saturate(135%) contrast(108%)');
    else if (cfg.filterPreset === 'warm') filterParts.push('sepia(22%) saturate(118%)');
    else if (cfg.filterPreset === 'cool') filterParts.push('hue-rotate(14deg) saturate(110%)');
    else if (cfg.filterPreset === 'grayscale') filterParts.push('grayscale(100%)');
    else if (cfg.filterPreset === 'sepia') filterParts.push('sepia(78%)');
    else if (cfg.filterPreset === 'contrast') filterParts.push('contrast(128%)');
    else if (cfg.filterPreset === 'darken') filterParts.push('brightness(72%)');
    else if (cfg.filterPreset === 'brighten') filterParts.push('brightness(122%)');
    var mediaFilter = filterParts.length ? filterParts.join(' ') : 'none';
    var baseScale = (cfg.scale / 100) * (cfg.mediaBlur > 0 || cfg.parallaxEnabled ? 1.05 : 1);
    var flipX = cfg.flip ? -1 : 1;

    var leftNum = Number(cfg.leftCornerRadius);
    var rightNum = Number(cfg.rightCornerRadius);
    var leftRad = cfg.leftCornerRadius === 'native' ? '0px' : Number.isFinite(leftNum) && cfg.leftCornerRadius !== '' ? leftNum + 'px' : R.island + 'px';
    var rightRad = cfg.rightCornerRadius === 'native' ? '0px' : Number.isFinite(rightNum) && cfg.rightCornerRadius !== '' ? rightNum + 'px' : R.island + 'px';

    var vars = {
      '--prism-pt-rgb': S.pt,
      '--prism-shade-rgb': S.shade,
      '--prism-sidebar-rgb': sbBaseRgb[0] + ', ' + sbBaseRgb[1] + ', ' + sbBaseRgb[2],
      '--prism-sidebar-deep-rgb': deepSbRgb[0] + ', ' + deepSbRgb[1] + ', ' + deepSbRgb[2],
      '--prism-base-rgb': S.base,
      '--prism-tint-1-rgb': S.tint1,
      '--prism-tint-2-rgb': S.tint2,
      '--prism-popover-rgb': S.popover,
      '--prism-wall-tint-rgb': acc.wallTintStr,
      '--prism-fg': S.fg,
      '--prism-fg-2': S.fg2,
      '--prism-fg-muted': S.muted,
      '--prism-fg-faint': S.faint,
      '--prism-accent': acc.hex,
      '--prism-accent-rgb': acc.rgbStr,
      '--prism-accent-fg': acc.fg,
      '--prism-accent-soft': 'rgba(' + acc.rgbStr + ', ' + (isLight ? '0.11' : '0.14') + ')',
      '--prism-accent-border': 'rgba(' + acc.rgbStr + ', ' + (isLight ? '0.42' : '0.48') + ')',
      '--prism-link': S.link,
      '--prism-surface-canvas': 'transparent',
      '--prism-surface-sidebar': surfSidebar,
      '--prism-surface-sidebar-deep': surfSidebarDeep,
      '--prism-surface-chat': surfChat,
      '--prism-surface-editor': surfEditor,
      '--prism-surface-card': surfCard,
      '--prism-surface-composer': surfComp,
      '--prism-surface-popover': surfPopover,
      '--prism-surface-code-block': cfg.codeReadabilityMode === 'solid' ? rgbaStr(tint1Rgb, 1) : surfEditor,
      '--prism-secondary-bg': rgbaStr(tint2Rgb, isLight ? 0.78 : 0.72),
      '--prism-muted-bg': rgbaStr(tint1Rgb, isLight ? 0.65 : 0.55),
      '--prism-sidebar-muted': 'rgba(' + S.pt + ', ' + (isLight ? '0.075' : '0.078') + ')',
      '--prism-sidebar-secondary': 'rgba(' + S.pt + ', ' + (isLight ? '0.115' : '0.125') + ')',
      '--prism-blur-md': blurMd + 'px',
      '--prism-blur-lg': blurLg + 'px',
      '--prism-blur-xl': blurXl + 'px',
      '--prism-sidebar-backdrop': sbBlurPx > 0 ? 'blur(' + sbBlurPx + 'px) saturate(' + (isLight ? '135%' : '125%') + ')' : 'none',
      '--prism-composer-backdrop': blurLg > 0 ? 'blur(' + blurLg + 'px) saturate(140%)' : 'none',
      '--prism-code-backdrop': cfg.codeReadabilityMode === 'frosted' && blurMd > 0 ? 'blur(12px) saturate(130%)' : 'none',
      '--prism-border-hairline': borderHairline,
      '--prism-border-island': borderIsland,
      '--prism-border-card': borderCard,
      '--prism-border-popover': borderPopover,
      '--prism-specular-top': specularTop,
      '--prism-sheen': sheen,
      '--prism-shadow-island': shadowIsland,
      '--prism-shadow-popover': shadowPopover,
      '--prism-workspace-pad': (cfg.layoutMode === 'islands' ? cfg.workspacePad : 0) + 'px',
      '--prism-island-gap': (cfg.layoutMode === 'islands' ? cfg.islandGap : 0) + 'px',
      '--prism-r-island': R.island + 'px',
      '--prism-r-left-island': leftRad,
      '--prism-r-right-island': rightRad,
      '--prism-r-sheet': R.sheet + 'px',
      '--prism-r-card': R.card + 'px',
      '--prism-r-ctl': R.ctl + 'px',
      '--prism-r-xs': R.xs + 'px',
      '--prism-native-floor': isLight ? '#f7f7f8' : '#070708',
      '--prism-stage-bg': 'transparent',
      '--prism-wall-image': (function () {
        var rawWallUrl =
          state.item && resolveEffectiveKind(state.item, cfg) === 'image'
            ? String(state.item.mediaUrl || state.item.thumbUrl || '').trim()
            : '';
        if (!rawWallUrl) return 'none';
        if (isCrossSchemeLoopbackUrl(rawWallUrl)) {
          var pluginWallUrl = String((state.item && state.item.pluginMediaUrl) || '').trim();
          return /^plugin:\/\//i.test(pluginWallUrl) ? 'url(' + JSON.stringify(pluginWallUrl) + ')' : 'none';
        }
        return 'url(' + JSON.stringify(rawWallUrl) + ')';
      })(),
      '--prism-media-fit': fitCss,
      '--prism-media-pos': cfg.posX + '% ' + cfg.posY + '%',
      '--prism-media-opacity': cfg.mediaOpacity.toFixed(3),
      '--prism-media-filter': mediaFilter,
      '--prism-media-transform': 'scale(' + (baseScale * flipX).toFixed(4) + ', ' + baseScale.toFixed(4) + ')',
      '--prism-scrim-bg': scrimBg,
      '--prism-scrim-opacity': scrimAlpha.toFixed(3),
      '--prism-vignette-display': cfg.vignette ? 'block' : 'none',
      '--prism-vignette-bg': vignetteGrad,
      '--prism-grain-display': cfg.grainAlpha > 0.001 ? 'block' : 'none',
      '--prism-grain-alpha': cfg.grainAlpha.toFixed(3),
      '--prism-selection-bg': 'rgba(' + acc.rgbStr + ', 0.40)',
      '--prism-editor-selection-bg': 'rgba(' + acc.rgbStr + ', 0.38)',
      '--prism-scroll-thumb': rgbaStr(ptRgb, 0.22),
    };

    var structuralSig = [
      VERSION,
      state.effectiveTheme,
      cfg.colorScheme === 'host-native' ? 'host' : 'prism',
      cfg.layoutMode,
      cfg.parallaxEnabled ? 'px1' : 'px0',
    ].join('|');

    return {
      isLight: isLight,
      S: S,
      acc: acc,
      vars: vars,
      structuralSig: structuralSig,
    };
  }

  // Fast <0.3ms inline CSS variable patch on <html> (avoids rewriting #agy-prism-css on slider ticks!)
  function applyFastCssVars(vars) {
    var root = doc.documentElement;
    if (!root || !root.style) return;
    for (var k in vars) {
      if (!Object.prototype.hasOwnProperty.call(vars, k)) continue;
      var v = vars[k];
      if (state.appliedVars[k] !== v) {
        root.style.setProperty(k, v);
        state.appliedVars[k] = v;
      }
    }
  }

  function clearFastCssVars() {
    var root = doc.documentElement;
    if (root && root.style) {
      for (var k in state.appliedVars) {
        if (Object.prototype.hasOwnProperty.call(state.appliedVars, k)) {
          root.style.removeProperty(k);
        }
      }
      root.style.removeProperty('--prism-hole-clip');
      root.style.removeProperty('--prism-wco-inset-right');
    }
    state.appliedVars = {};
    state.lastHoleClip = '';
  }

  function buildStructuralPrismCss(cfg, tok) {
    var GG = 'html[' + GLASS_ATTR + '="ready"]';
    var GW = 'html[' + WALLPAPER_ATTR + '="ready"]';
    var NOT_HOLE = ':not([data-has-browser-hole="true"]):not([data-browser-hole])';
    var isLight = tok.isLight;
    var out = [];

    // 1. Root Safety Floor & 2.34.0 3-Layer [data-browser-hole] Alpha=0 Yield
    // Keep solid native theme floor on <html> ONLY when wallpaper is decoded AND no browser hole is open.
    // Whenever [data-has-browser-hole="true"] is active, <html> & <body> yield immediately to alpha = 0!
    out.push(
      GW + ':not([data-has-browser-hole="true"]):not(:has(> body[data-has-browser-hole="true"])) {\n' +
      '  background-color: var(--prism-native-floor, #070708) !important;\n' +
      '  background-image: none !important;\n' +
      '}\n' +
      GW + ' body {\n' +
      '  isolation: isolate;\n' +
      '  background-color: transparent !important;\n' +
      '  background-image: none !important;\n' +
      '}\n' +
      'html[data-has-browser-hole="true"],\n' +
      'html[data-has-browser-hole="true"] body,\n' +
      'body[data-has-browser-hole="true"],\n' +
      GW + ' [data-has-browser-hole="true"]' + SIBLING_EXCLUDE + ',\n' +
      GW + ' ' + ACTIVE_HOLE_SEL + ' {\n' +
      '  background-color: transparent !important;\n' +
      '  background-image: none !important;\n' +
      '}\n' +
      'html[' + WCO_ATTR + '="transparent"] :is(.window-controls-container, .monaco-workbench .part.titlebar > .titlebar-container > .titlebar-right .window-controls-container) {\n' +
      '  background: transparent !important;\n' +
      '  background-color: transparent !important;\n' +
      '}\n' +
      '#' + WCO_PILL_ID + ' {\n' +
      '  position: fixed !important;\n' +
      '  z-index: 55 !important;\n' +
      '  pointer-events: none !important;\n' +
      '  user-select: none !important;\n' +
      '  -webkit-user-select: none !important;\n' +
      '  isolation: isolate;\n' +
      '  box-sizing: border-box !important;\n' +
      '  background-color: transparent !important;\n' +
      '  background-image: none !important;\n' +
      '  backdrop-filter: none !important;\n' +
      '  -webkit-backdrop-filter: none !important;\n' +
      '  display: none;\n' +
      '}\n' +
      GW + '[' + WCO_ATTR + '="transparent"] #' + WCO_PILL_ID + ' {\n' +
      '  display: block;\n' +
      '  border-radius: var(--prism-r-island) !important;\n' +
      '  border: 1px solid var(--prism-border-island) !important;\n' +
      '  box-shadow: var(--prism-shadow-island) !important;\n' +
      '}\n' +
      GW + '[' + WCO_ATTR + '="transparent"][data-prism-layout="flush"] #' + WCO_PILL_ID + ' {\n' +
      '  border-radius: 0px !important;\n' +
      '  border: none !important;\n' +
      '  border-bottom: 1px solid var(--prism-border-hairline) !important;\n' +
      '  box-shadow: none !important;\n' +
      '}\n' +
      GW + '[' + WCO_ATTR + '="transparent"] #' + WCO_PILL_ID + '::before {\n' +
      '  content: "";\n' +
      '  position: absolute;\n' +
      '  inset: 0;\n' +
      '  z-index: -1;\n' +
      '  border-radius: inherit;\n' +
      '  pointer-events: none;\n' +
      '  background-color: var(--prism-surface-sidebar);\n' +
      '  background-image: var(--prism-sheen);\n' +
      '  backdrop-filter: var(--prism-sidebar-backdrop);\n' +
      '  -webkit-backdrop-filter: var(--prism-sidebar-backdrop);\n' +
      '  box-shadow: inset 0 1px 0 var(--prism-specular-top);\n' +
      '}\n' +
      GW + '[data-prism-kind="image"] body:not(:has(> #' + STAGE_ID + ' .agy-prism-media-wrap))::before {\n' +
      '  content: "";\n' +
      '  position: fixed;\n' +
      '  inset: 0;\n' +
      '  z-index: -2;\n' +
      '  pointer-events: none !important;\n' +
      '  background-image: var(--prism-wall-image, none);\n' +
      '  background-size: var(--prism-media-fit, cover);\n' +
      '  background-position: var(--prism-media-pos, 50% 50%);\n' +
      '  background-repeat: no-repeat;\n' +
      '  opacity: var(--prism-media-opacity, 1);\n' +
      '  filter: var(--prism-media-filter, none);\n' +
      '  clip-path: var(--prism-hole-clip, none);\n' +
      '}'
    );

    // 2. Fail-Open Token Overrides (strictly gated on GW so broken/404 media keeps 100% solid native surfaces!)
    out.push(
      GW + ' body,\n' +
      GW + ' :where(#root, #root > div, #root .dark, #root .light, #root .theme-dark, #root .theme-light, .agy-shell, .agy-inset-shell, .agy-sheet:not([data-browser-occluder]), [data-split-panes] [data-testid="pane-titlebar-toolbar"], .monaco-workbench)' +
      ':where(' + SIBLING_EXCLUDE + DIALOG_DESCENDANT_EXCLUDE + ') {\n' +
      '  --background: transparent !important;\n' +
      '  --color-background: transparent !important;\n' +
      '  --body-background: transparent !important;\n' +
      '  --shell: transparent !important;\n' +
      '  --shell-canvas: transparent !important;\n' +
      '  --content: var(--prism-surface-chat) !important;\n' +
      '  --sidebar: var(--prism-surface-sidebar) !important;\n' +
      '  --color-sidebar: var(--prism-surface-sidebar) !important;\n' +
      '  --sidebar-muted: var(--prism-sidebar-muted) !important;\n' +
      '  --sidebar-secondary: var(--prism-sidebar-secondary) !important;\n' +
      '  --card: var(--prism-surface-card) !important;\n' +
      '  --color-card: var(--prism-surface-card) !important;\n' +
      '  --card-border: var(--prism-border-card) !important;\n' +
      '  --border: var(--prism-border-hairline) !important;\n' +
      '  --color-border: var(--prism-border-hairline) !important;\n' +
      '  --popover: var(--prism-surface-popover) !important;\n' +
      '  --secondary: var(--prism-secondary-bg) !important;\n' +
      '  --muted: var(--prism-muted-bg) !important;\n' +
      (cfg.colorScheme !== 'host-native'
        ? '  --foreground: var(--prism-fg) !important;\n' +
          '  --secondary-foreground: var(--prism-fg-2) !important;\n' +
          '  --muted-foreground: var(--prism-fg-muted) !important;\n' +
          '  --placeholder: var(--prism-fg-faint) !important;\n'
        : isLight
          ? '  --muted-foreground: #475569 !important;\n'
          : '') +
      '  --primary: var(--prism-accent) !important;\n' +
      '  --color-primary: var(--prism-accent) !important;\n' +
      '  --primary-foreground: var(--prism-accent-fg) !important;\n' +
      '  --link: var(--prism-link) !important;\n' +
      '  --onyx-frame: var(--prism-surface-sidebar) !important;\n' +
      '  --onyx-well: var(--prism-surface-chat) !important;\n' +
      '  --onyx-raised: var(--prism-surface-card) !important;\n' +
      '  --vscode-editor-background: transparent !important;\n' +
      '  --vscode-editorGutter-background: transparent !important;\n' +
      '  --vscode-sideBar-background: transparent !important;\n' +
      '  --vscode-sideBarSectionHeader-background: transparent !important;\n' +
      '  --vscode-activityBar-background: transparent !important;\n' +
      '  --vscode-panel-background: transparent !important;\n' +
      '  --vscode-terminal-background: transparent !important;\n' +
      '  --editor-diff-inserted-line-background: rgba(46, 160, 67, 0.24) !important;\n' +
      '  --editor-diff-removed-line-background: rgba(248, 81, 73, 0.24) !important;\n' +
      '  --editor-selection-background: var(--prism-editor-selection-bg) !important;\n' +
      '}\n' +
      GW + '[' + WCO_ATTR + '="transparent"] body {\n' +
      '  --background: #00000000 !important;\n' +
      '}'
    );

    // 3. Inert Fail-Open Stage at z-index: -1 (0 mouse/focus interception, transparent background, GPU cutout clip)
    out.push(
      '#' + STAGE_ID + ' {\n' +
      '  position: fixed !important;\n' +
      '  inset: 0 !important;\n' +
      '  z-index: -1 !important;\n' +
      '  overflow: hidden !important;\n' +
      '  pointer-events: none !important;\n' +
      '  user-select: none !important;\n' +
      '  -webkit-user-select: none !important;\n' +
      '  background-color: transparent !important;\n' +
      '  background-image: none !important;\n' +
      '  clip-path: var(--prism-hole-clip, none);\n' +
      '  contain: style;\n' +
      '}\n' +
      '#' + STAGE_ID + ' *, #' + FX_CANVAS_ID + ' {\n' +
      '  pointer-events: none !important;\n' +
      '  user-select: none !important;\n' +
      '}\n' +
      '#' + FX_CANVAS_ID + ' {\n' +
      '  clip-path: var(--prism-hole-clip, none);\n' +
      '}\n' +
      '#' + STAGE_ID + ' .agy-prism-media-wrap {\n' +
      '  position: absolute;\n' +
      '  inset: 0;\n' +
      '  width: 100%;\n' +
      '  height: 100%;\n' +
      '  will-change: ' + (cfg.parallaxEnabled ? 'transform' : 'auto') + ';\n' +
      '  transform: translate3d(var(--prism-px, 0px), var(--prism-py, 0px), 0);\n' +
      '}\n' +
      '#' + STAGE_ID + ' .agy-prism-media-el {\n' +
      '  position: absolute;\n' +
      '  inset: 0;\n' +
      '  width: 100%;\n' +
      '  height: 100%;\n' +
      '  border: 0;\n' +
      '  display: block;\n' +
      '  object-fit: var(--prism-media-fit);\n' +
      '  object-position: var(--prism-media-pos);\n' +
      '  opacity: var(--prism-media-opacity);\n' +
      '  filter: var(--prism-media-filter);\n' +
      '  transform: var(--prism-media-transform);\n' +
      '}\n' +
      '#' + STAGE_ID + ' .agy-prism-scrim {\n' +
      '  position: absolute;\n' +
      '  inset: 0;\n' +
      '  background: var(--prism-scrim-bg);\n' +
      '  opacity: 0;\n' +
      '  transition: background 240ms ease, opacity 180ms ease;\n' +
      '}\n' +
      GW + ' #' + STAGE_ID + ' .agy-prism-scrim {\n' +
      '  opacity: var(--prism-scrim-opacity);\n' +
      '}\n' +
      '#' + STAGE_ID + ' .agy-prism-vignette {\n' +
      '  position: absolute;\n' +
      '  inset: 0;\n' +
      '  display: none;\n' +
      '  background: var(--prism-vignette-bg);\n' +
      '}\n' +
      GW + ' #' + STAGE_ID + ' .agy-prism-vignette {\n' +
      '  display: var(--prism-vignette-display);\n' +
      '}\n' +
      '#' + STAGE_ID + ' .agy-prism-grain {\n' +
      '  position: absolute;\n' +
      '  inset: 0;\n' +
      '  display: none;\n' +
      '  opacity: var(--prism-grain-alpha);\n' +
      '  background-image: ' + GRAIN_SVG + ';\n' +
      '  background-repeat: repeat;\n' +
      '}\n' +
      GW + ' #' + STAGE_ID + ' .agy-prism-grain {\n' +
      '  display: var(--prism-grain-display);\n' +
      '}'
    );

    // 4. Hollow Outer Layout Wrappers ONLY When Wallpaper Frame Is Decoded (`GW`)
    out.push(
      GW + ' #root, ' + GW + ' .monaco-workbench { position: relative; z-index: 1; }\n' +
      HOLLOW_SURFACES.map(function (sel) {
        return GW + ' :where(' + sel + ')';
      }).join(',\n') +
      ' {\n' +
      '  background-color: transparent !important;\n' +
      '  background-image: none !important;\n' +
      '}'
    );

    var LEFT_SB_SCOPE =
      ':is([data-testid="sidebar-split"] > div:first-child, .agy-sidebar, aside[data-side-panel-body]:not(.agy-sheet *):not([data-testid="aux-pane-split"] *))';
    var tbHostList = GLASS_CARRIER_TITLEBARS.map(function (s) {
      return GW + ' ' + s + NOT_HOLE;
    }).join(',\n');
    var tbBeforeList = GLASS_CARRIER_TITLEBARS.map(function (s) {
      return GW + ' ' + s + NOT_HOLE + '::before';
    }).join(',\n');

    out.push(
      tbHostList + ' {\n' +
      '  position: relative !important;\n' +
      '  isolation: isolate;\n' +
      '  overflow: visible !important;\n' +
      '  z-index: 40;\n' +
      '  background-color: transparent !important;\n' +
      '  background-image: none !important;\n' +
      '  backdrop-filter: none !important;\n' +
      '  -webkit-backdrop-filter: none !important;\n' +
      '}\n' +
      tbBeforeList + ' {\n' +
      '  content: "";\n' +
      '  position: absolute;\n' +
      '  inset: 0;\n' +
      '  z-index: -1;\n' +
      '  border-radius: inherit;\n' +
      '  pointer-events: none;\n' +
      '  background-color: var(--prism-surface-sidebar);\n' +
      '  background-image: var(--prism-sheen);\n' +
      '  backdrop-filter: var(--prism-sidebar-backdrop);\n' +
      '  -webkit-backdrop-filter: var(--prism-sidebar-backdrop);\n' +
      '  box-shadow: inset 0 1px 0 var(--prism-specular-top);\n' +
      '}\n' +
      GW + ' :is([data-testid="title-menu-bar"] button, [data-testid="title-menu-bar-item"]) {\n' +
      '  border-radius: var(--prism-r-ctl) !important;\n' +
      '}'
    );

    var sbHostList = GLASS_CARRIER_SIDEBARS.map(function (s) {
      return GW + ' ' + s + NOT_HOLE;
    }).join(',\n');
    var sbBeforeList = GLASS_CARRIER_SIDEBARS.map(function (s) {
      return GW + ' ' + s + NOT_HOLE + '::before';
    }).join(',\n');

    out.push(
      sbHostList + ' {\n' +
      '  position: relative !important;\n' +
      '  isolation: isolate;\n' +
      '  background-color: transparent !important;\n' +
      '  background-image: none !important;\n' +
      '  backdrop-filter: none !important;\n' +
      '  -webkit-backdrop-filter: none !important;\n' +
      '}\n' +
      sbBeforeList + ' {\n' +
      '  content: "";\n' +
      '  position: absolute;\n' +
      '  inset: 0;\n' +
      '  z-index: -1;\n' +
      '  border-radius: inherit;\n' +
      '  pointer-events: none;\n' +
      '  background-color: var(--prism-surface-sidebar);\n' +
      '  background-image: var(--prism-sheen);\n' +
      '  backdrop-filter: var(--prism-sidebar-backdrop);\n' +
      '  -webkit-backdrop-filter: var(--prism-sidebar-backdrop);\n' +
      '  box-shadow: inset 0 1px 0 var(--prism-specular-top);\n' +
      '}\n' +
      GW + ' :is(.agy-sidebar-row, [data-testid="conversation-row-sidebar"]):has(.agy-row-actions) {\n' +
      '  --prism-act-stop: 76px;\n' +
      '  --prism-act-fade: 98px;\n' +
      '}\n' +
      GW + ' :is(.agy-sidebar-row, [data-testid="conversation-row-sidebar"]):has(.agy-row-status:not(:empty)),\n' +
      GW + ' :is(.agy-sidebar-row, [data-testid="conversation-row-sidebar"]):has(.agy-row-actions > button:nth-child(2):last-child) {\n' +
      '  --prism-act-stop: 50px;\n' +
      '  --prism-act-fade: 72px;\n' +
      '}\n' +
      GW + ' :is(.agy-sidebar-row, [data-testid="conversation-row-sidebar"]):has(.agy-row-status:not(:empty)):has(.agy-row-actions > button:nth-child(2):last-child),\n' +
      GW + ' :is(.agy-sidebar-row, [data-testid="conversation-row-sidebar"]):has(.agy-row-actions > button:only-child) {\n' +
      '  --prism-act-stop: 26px;\n' +
      '  --prism-act-fade: 46px;\n' +
      '}\n' +
      GW + ' :is(.agy-sidebar-row, [data-testid="conversation-row-sidebar"]):has(.agy-row-actions):is(:hover, :focus-visible, :has(:focus-visible), [data-prism-force-hover="1"]) > .min-w-0 {\n' +
      '  -webkit-mask-image: linear-gradient(to right, #000 0%, #000 calc(100% - var(--prism-act-fade, 98px)), transparent calc(100% - var(--prism-act-stop, 76px))) !important;\n' +
      '  mask-image: linear-gradient(to right, #000 0%, #000 calc(100% - var(--prism-act-fade, 98px)), transparent calc(100% - var(--prism-act-stop, 76px))) !important;\n' +
      '}\n' +
      GW + ' .agy-row-actions {\n' +
      '  background: none !important;\n' +
      '  background-image: none !important;\n' +
      '  padding-left: 4px !important;\n' +
      '}\n' +
      GW + ' .agy-row-actions > button {\n' +
      '  color: var(--prism-fg-2) !important;\n' +
      '  background-color: rgba(var(--prism-shade-rgb), ' + (isLight ? '0.78' : '0.68') + ') !important;\n' +
      '  border: 1px solid var(--prism-border-hairline) !important;\n' +
      '  backdrop-filter: blur(8px) !important;\n' +
      '  -webkit-backdrop-filter: blur(8px) !important;\n' +
      '  box-shadow: 0 1px 4px rgba(0, 0, 0, ' + (isLight ? '0.08' : '0.26') + ') !important;\n' +
      '}\n' +
      GW + ' .agy-row-actions > button:is(:hover, :focus-visible) {\n' +
      '  color: var(--prism-fg) !important;\n' +
      '  background-color: rgba(var(--prism-tint-2-rgb), 0.94) !important;\n' +
      '  border-color: var(--prism-border-card) !important;\n' +
      '  box-shadow: 0 2px 8px rgba(0, 0, 0, ' + (isLight ? '0.14' : '0.38') + ') !important;\n' +
      '}\n' +
      GW + ' ' + LEFT_SB_SCOPE + ' .bg-sidebar:not([style*="sticky"]):not(.sticky):not([data-sidebar-section-drop-id]):not([data-testid="project-header"]):not([data-project-card]) { background-color: transparent !important; }\n' +
      GW + ' .monaco-workbench :is(.part.sidebar, .part.auxiliarybar, .part.activitybar) > :is(.content, .title, .composite.title, .header-or-footer) { background-color: transparent !important; }\n' +
      GW + ' ' + LEFT_SB_SCOPE + ' [data-sidebar-section-drop-id]:has([data-testid="project-header"], [data-project-card]) {\n' +
      '  background-color: transparent !important;\n' +
      '  background-image: none !important;\n' +
      '  backdrop-filter: none !important;\n' +
      '  -webkit-backdrop-filter: none !important;\n' +
      '  box-shadow: none !important;\n' +
      '}\n' +
      GW + ' ' + LEFT_SB_SCOPE + ' [data-sidebar-section-drop-id]:has([data-testid="project-header"], [data-project-card])::before {\n' +
      '  content: none !important;\n' +
      '}\n' +
      GW + ' ' + LEFT_SB_SCOPE + ' :is([data-sidebar-section-drop-id], [data-index][style*="sticky"], [style*="position: sticky"], [style*="position:sticky"]):is(.bg-sidebar, :has([data-testid="section-header"])):not(:has([data-testid="project-header"])):not(:has([data-project-card])),\n' +
      GW + ' .sticky:is(.bg-sidebar, .bg-background):not(.pointer-events-none):not(:has([data-testid="project-header"])):not(:has([data-project-card])) {\n' +
      '  isolation: isolate;\n' +
      '  background-color: transparent !important;\n' +
      '  backdrop-filter: none !important;\n' +
      '  -webkit-backdrop-filter: none !important;\n' +
      '  border-radius: var(--prism-r-ctl) !important;\n' +
      '}\n' +
      GW + ' ' + LEFT_SB_SCOPE + ' :is([data-sidebar-section-drop-id], [data-index][style*="sticky"], [style*="position: sticky"], [style*="position:sticky"]):is(.bg-sidebar, :has([data-testid="section-header"])):not(:has([data-testid="project-header"])):not(:has([data-project-card]))::before,\n' +
      GW + ' .sticky:is(.bg-sidebar, .bg-background):not(.pointer-events-none):not(:has([data-testid="project-header"])):not(:has([data-project-card]))::before {\n' +
      '  content: "";\n' +
      '  position: absolute;\n' +
      '  inset: 0;\n' +
      '  z-index: -1;\n' +
      '  border-radius: var(--prism-r-ctl) !important;\n' +
      '  pointer-events: none;\n' +
      '  background-color: rgba(var(--prism-sidebar-deep-rgb, var(--prism-sidebar-rgb)), ' + (isLight ? '0.94' : '0.91') + ') !important;\n' +
      '  background-image: var(--prism-sheen);\n' +
      '  backdrop-filter: blur(16px) saturate(145%) !important;\n' +
      '  -webkit-backdrop-filter: blur(16px) saturate(145%) !important;\n' +
      '  border: 1px solid var(--prism-border-hairline);\n' +
      '  box-shadow: inset 0 1px 0 var(--prism-specular-top), 0 3px 10px rgba(0, 0, 0, ' + (isLight ? '0.06' : '0.24') + ');\n' +
      '}\n' +
      GW + ' ' + LEFT_SB_SCOPE + ' :is([data-sidebar-section-drop-id], [data-index][style*="sticky"], [style*="position: sticky"], [style*="position:sticky"]):not(:has([data-testid="project-header"])):not(:has([data-project-card])) .bg-sidebar {\n' +
      '  background-color: transparent !important;\n' +
      '}\n' +
      GW + ' :is(button[data-testid="project-header"], [data-project-card="true"]) {\n' +
      '  position: relative !important;\n' +
      '  isolation: isolate;\n' +
      '  background-color: transparent !important;\n' +
      '  background-image: none !important;\n' +
      '  backdrop-filter: none !important;\n' +
      '  -webkit-backdrop-filter: none !important;\n' +
      '  border-radius: var(--prism-r-ctl) !important;\n' +
      '}\n' +
      GW + ' :is(button[data-testid="project-header"], [data-project-card="true"])::before {\n' +
      '  content: "";\n' +
      '  position: absolute;\n' +
      '  inset: 0;\n' +
      '  z-index: -1;\n' +
      '  border-radius: inherit;\n' +
      '  pointer-events: none;\n' +
      '  background-color: var(--prism-surface-sidebar-deep) !important;\n' +
      '  background-image: var(--prism-sheen);\n' +
      '  backdrop-filter: blur(14px) saturate(140%) !important;\n' +
      '  -webkit-backdrop-filter: blur(14px) saturate(140%) !important;\n' +
      '  border: 1px solid var(--prism-border-card);\n' +
      '  box-shadow: inset 0 1px 0 var(--prism-specular-top), 0 2px 8px rgba(0, 0, 0, ' + (isLight ? '0.05' : '0.22') + ');\n' +
      '}\n' +
      GW + ' :is(button[data-testid="project-header"]:is(:hover, :focus-visible), .group\\/header:hover button[data-testid="project-header"], [data-project-card="true"]:is(:hover, :focus-visible))::before {\n' +
      '  border-color: var(--prism-accent-border) !important;\n' +
      '}\n' +
      GW + ' ' + LEFT_SB_SCOPE + ' .group\\/header > div.absolute > :is(button, a) {\n' +
      '  border-radius: var(--prism-r-xs) !important;\n' +
      '  color: var(--prism-fg-2) !important;\n' +
      '  background-color: rgba(var(--prism-sidebar-deep-rgb, var(--prism-shade-rgb)), ' + (isLight ? '0.82' : '0.74') + ') !important;\n' +
      '  border: 1px solid var(--prism-border-hairline) !important;\n' +
      '  backdrop-filter: blur(8px) !important;\n' +
      '  -webkit-backdrop-filter: blur(8px) !important;\n' +
      '  box-shadow: 0 1px 4px rgba(0, 0, 0, ' + (isLight ? '0.08' : '0.26') + ') !important;\n' +
      '}\n' +
      GW + ' ' + LEFT_SB_SCOPE + ' .group\\/header > div.absolute > :is(button, a):is(:hover, :focus-visible) {\n' +
      '  color: var(--prism-fg) !important;\n' +
      '  background-color: rgba(var(--prism-tint-2-rgb), 0.94) !important;\n' +
      '  border-color: var(--prism-border-card) !important;\n' +
      '}\n' +
      GW + ' .surface-opaque.bg-background {\n' +
      '  background-color: var(--prism-surface-card) !important;\n' +
      '}'
    );

    var mainPageHostList = GLASS_CARRIER_MAIN_PAGES.map(function (s) {
      return GW + ' ' + s + NOT_HOLE;
    }).join(',\n');
    var mainPageBeforeList = GLASS_CARRIER_MAIN_PAGES.map(function (s) {
      return GW + ' ' + s + NOT_HOLE + '::before';
    }).join(',\n');

    out.push(
      mainPageHostList + ' {\n' +
      '  position: relative !important;\n' +
      '  isolation: isolate;\n' +
      '  background-color: transparent !important;\n' +
      '  background-image: none !important;\n' +
      '  backdrop-filter: none !important;\n' +
      '  -webkit-backdrop-filter: none !important;\n' +
      '}\n' +
      mainPageBeforeList + ' {\n' +
      '  content: "";\n' +
      '  position: absolute;\n' +
      '  inset: 0;\n' +
      '  z-index: -1;\n' +
      '  border-radius: inherit;\n' +
      '  pointer-events: none;\n' +
      '  background-color: var(--prism-surface-sidebar);\n' +
      '  background-image: var(--prism-sheen);\n' +
      '  backdrop-filter: var(--prism-sidebar-backdrop);\n' +
      '  -webkit-backdrop-filter: var(--prism-sidebar-backdrop);\n' +
      '  box-shadow: inset 0 1px 0 var(--prism-specular-top);\n' +
      '}\n' +
      GW + ' :is([data-testid="customization-card"], .agy-spotlight-card, [data-testid="marketplace-bundles-banner"]) {\n' +
      '  background-color: var(--prism-surface-card) !important;\n' +
      '  border: 1px solid var(--prism-border-card) !important;\n' +
      '  box-shadow: inset 0 1px 0 var(--prism-specular-top) !important;\n' +
      '}\n' +
      GW + ' [data-testid="customization-card"]:hover {\n' +
      '  background-color: var(--prism-secondary-bg) !important;\n' +
      '  border-color: var(--prism-accent-border) !important;\n' +
      '}\n' +
      GW + ' :is(.agy-field:has([data-testid="customizations-search"]), [data-testid="plugins-tabs"]) {\n' +
      '  background-color: rgba(var(--prism-sidebar-rgb, var(--prism-shade-rgb)), ' + (isLight ? '0.72' : '0.62') + ') !important;\n' +
      '  border-color: var(--prism-border-card) !important;\n' +
      '  backdrop-filter: blur(10px) !important;\n' +
      '  -webkit-backdrop-filter: blur(10px) !important;\n' +
      '}'
    );

    var compHostList = GLASS_CARRIER_COMPOSERS.map(function (s) {
      return GW + ' ' + s;
    }).join(',\n');
    var compBeforeList = GLASS_CARRIER_COMPOSERS.map(function (s) {
      return GW + ' ' + s + '::before';
    }).join(',\n');

    out.push(
      compHostList + ' {\n' +
      '  position: relative !important;\n' +
      '  isolation: isolate;\n' +
      '  background-color: transparent !important;\n' +
      '  backdrop-filter: none !important;\n' +
      '  -webkit-backdrop-filter: none !important;\n' +
      '  border: 1px solid var(--prism-border-card) !important;\n' +
      '  border-radius: var(--prism-r-card) !important;\n' +
      '  box-shadow: var(--prism-shadow-island) !important;\n' +
      '}\n' +
      compBeforeList + ' {\n' +
      '  content: "";\n' +
      '  position: absolute;\n' +
      '  inset: 0;\n' +
      '  z-index: -1;\n' +
      '  border-radius: inherit;\n' +
      '  pointer-events: none;\n' +
      '  background-color: var(--prism-surface-composer);\n' +
      '  background-image: var(--prism-sheen);\n' +
      '  backdrop-filter: var(--prism-composer-backdrop);\n' +
      '  -webkit-backdrop-filter: var(--prism-composer-backdrop);\n' +
      '  box-shadow: inset 0 1px 0 var(--prism-specular-top);\n' +
      '}'
    );

    out.push(
      GW + ' [data-testid="conversation-view"]' + NOT_HOLE + ',\n' +
      GW + ' [data-main-content-header]' + NOT_HOLE + ' {\n' +
      '  background-color: var(--prism-surface-chat) !important;\n' +
      '  backdrop-filter: none !important;\n' +
      '}\n' +
      GW + ' [data-side-panel-strip] {\n' +
      '  border-bottom: 1px solid var(--prism-border-hairline) !important;\n' +
      '}\n' +
      GW + ' [data-testid="new-tab-search-input"] {\n' +
      '  background-color: rgba(var(--prism-tint-1-rgb), ' + (isLight ? '0.68' : '0.46') + ') !important;\n' +
      '  border: 1px solid var(--prism-border-card) !important;\n' +
      '  border-radius: var(--prism-r-ctl) !important;\n' +
      '  backdrop-filter: blur(10px) saturate(130%) !important;\n' +
      '  -webkit-backdrop-filter: blur(10px) saturate(130%) !important;\n' +
      '}\n' +
      GW + ' [data-testid="new-tab-search-input"]:focus {\n' +
      '  border-color: var(--prism-accent-border) !important;\n' +
      '}\n' +
      GW + ' [data-testid^="new-tab-card-"]:is(:hover, :focus-visible) {\n' +
      '  background-color: var(--prism-secondary-bg) !important;\n' +
      '  border-radius: var(--prism-r-ctl) !important;\n' +
      '}\n' +
      GW + ' [data-testid="browser-error-overlay"] {\n' +
      '  background-color: var(--prism-surface-editor) !important;\n' +
      '}\n' +
      GW + ' .monaco-workbench .part.editor > .content,\n' +
      GW + ' .monaco-workbench .editor-group-container,\n' +
      GW + ' .monaco-workbench .part.panel,\n' +
      GW + ' [data-testid="background-task-command"] {\n' +
      '  background-color: var(--prism-surface-editor) !important;\n' +
      '  backdrop-filter: none !important;\n' +
      '}\n' +
      GW + ' .monaco-editor,\n' +
      GW + ' .monaco-editor .margin,\n' +
      GW + ' .monaco-editor-background,\n' +
      GW + ' .monaco-editor .view-lines,\n' +
      GW + ' .xterm,\n' +
      GW + ' .xterm .xterm-viewport,\n' +
      GW + ' .xterm .xterm-screen {\n' +
      '  background-color: transparent !important;\n' +
      '  backdrop-filter: none !important;\n' +
      '}\n' +
      GW + ' pre,\n' +
      GW + ' .code-block,\n' +
      GW + ' .md-code-block {\n' +
      '  background-color: var(--prism-surface-code-block) !important;\n' +
      '  border: 1px solid var(--prism-border-card) !important;\n' +
      '  border-radius: var(--prism-r-ctl) !important;\n' +
      '  backdrop-filter: var(--prism-code-backdrop) !important;\n' +
      '  -webkit-backdrop-filter: var(--prism-code-backdrop) !important;\n' +
      '}\n' +
      GW + ' pre code, ' + GW + ' .md-code-block pre { background: transparent !important; border: none !important; backdrop-filter: none !important; }'
    );

    if (cfg.layoutMode === 'islands') {
      out.push(
        GW + '[data-prism-layout="islands"] .agy-shell {\n' +
        '  padding: var(--prism-workspace-pad) !important;\n' +
        '  gap: var(--prism-island-gap) !important;\n' +
        '  box-sizing: border-box !important;\n' +
        '}\n' +
        GW + '[data-prism-layout="islands"] [data-testid="title-menu-bar"]' + NOT_HOLE + ',\n' +
        GW + '[data-prism-layout="islands"] .monaco-workbench .part.titlebar' + NOT_HOLE + ' {\n' +
        '  border-radius: var(--prism-r-island) !important;\n' +
        '  border: 1px solid var(--prism-border-island) !important;\n' +
        '  box-shadow: var(--prism-shadow-island) !important;\n' +
        '}\n' +
        GW + '[data-prism-layout="islands"] [data-testid="title-menu-bar"]' + NOT_HOLE + ' {\n' +
        '  width: auto !important;\n' +
        '  margin-right: max(0px, calc(var(--prism-wco-inset-right, 0px) - var(--prism-workspace-pad, 0px))) !important;\n' +
        '}\n' +
        GW + '[data-prism-layout="islands"] [data-testid="sidebar-split"] > div:first-child' + NOT_HOLE + ',\n' +
        GW + '[data-prism-layout="islands"] .agy-sidebar' + NOT_HOLE + ',\n' +
        GW + '[data-prism-layout="islands"] aside[data-side-panel-body]:not(.agy-sheet *):not([data-testid="aux-pane-split"] *)' + NOT_HOLE + ' {\n' +
        '  border-radius: var(--prism-r-left-island) !important;\n' +
        '  border: 1px solid var(--prism-border-island) !important;\n' +
        '  box-shadow: var(--prism-shadow-island) !important;\n' +
        '}\n' +
        GW + '[data-prism-layout="islands"] :is([data-testid="sidebar-split"], [data-testid="aux-pane-split"]) > div:nth-child(2) {\n' +
        '  width: var(--prism-island-gap) !important;\n' +
        '  background: transparent !important;\n' +
        '  border: none !important;\n' +
        '  position: relative;\n' +
        '}\n' +
        GW + '[data-prism-layout="islands"] :is([data-testid="sidebar-split"], [data-testid="aux-pane-split"]) > div:nth-child(2):hover::after {\n' +
        '  content: "";\n' +
        '  position: absolute;\n' +
        '  top: 50%; left: 50%;\n' +
        '  transform: translate(-50%, -50%);\n' +
        '  width: 3px; height: 36px;\n' +
        '  border-radius: 999px;\n' +
        '  background: var(--prism-accent);\n' +
        '  opacity: 0.78;\n' +
        '}\n' +
        GW + '[data-prism-layout="islands"] .monaco-workbench :is(.part.activitybar, .part.sidebar, .part.editor .editor-group-container, .part.panel, .part.auxiliarybar) {\n' +
        '  margin: calc(var(--prism-island-gap) * 0.5) !important;\n' +
        '  border-radius: var(--prism-r-island) !important;\n' +
        '  border: 1px solid var(--prism-border-island) !important;\n' +
        '  box-shadow: var(--prism-shadow-island) !important;\n' +
        '}\n' +
        GW + '[data-prism-layout="islands"] [data-testid="aux-pane-split"] > :is(div, main, section):first-child' + NOT_HOLE + ',\n' +
        GW + '[data-prism-layout="islands"] .agy-shell > main' + NOT_HOLE + ' {\n' +
        '  border-radius: var(--prism-r-island) !important;\n' +
        '  border: 1px solid var(--prism-border-island) !important;\n' +
        '  box-shadow: var(--prism-shadow-island) !important;\n' +
        '  background-color: var(--prism-surface-chat) !important;\n' +
        '  backdrop-filter: none !important;\n' +
        '  -webkit-backdrop-filter: none !important;\n' +
        '}\n' +
        GW + '[data-prism-layout="islands"] [data-testid="aux-pane-split"] > :is(div, aside, section):last-child:not(:first-child):not([hidden]):not([aria-hidden="true"])' + NOT_HOLE + ',\n' +
        GW + '[data-prism-layout="islands"] .monaco-workbench .part.auxiliarybar' + NOT_HOLE + ' {\n' +
        '  border-radius: var(--prism-r-right-island) !important;\n' +
        '  border: 1px solid var(--prism-border-island) !important;\n' +
        '  box-shadow: var(--prism-shadow-island) !important;\n' +
        '  background-color: var(--prism-surface-chat) !important;\n' +
        '  backdrop-filter: none !important;\n' +
        '  -webkit-backdrop-filter: none !important;\n' +
        '}\n' +
        GW + '[data-prism-layout="islands"] [data-testid="aux-pane-split"] :is([data-testid="conversation-view"], [data-main-content-header], [data-side-panel-strip], .agy-sheet [data-side-panel-body], [data-side-panel-body]) {\n' +
        '  background-color: transparent !important;\n' +
        '  background-image: none !important;\n' +
        '}\n' +
        GW + '[data-prism-layout="islands"] :is([data-main-content-body], .agy-sheet [data-side-panel-body])::after {\n' +
        '  display: none !important;\n' +
        '}'
      );
    } else {
      out.push(
        GW + '[data-prism-layout="flush"] [data-testid="title-menu-bar"]' + NOT_HOLE + ',\n' +
        GW + '[data-prism-layout="flush"] .monaco-workbench .part.titlebar' + NOT_HOLE + ' {\n' +
        '  border-radius: 0px !important;\n' +
        '  border: none !important;\n' +
        '  border-bottom: 1px solid var(--prism-border-hairline) !important;\n' +
        '  box-shadow: none !important;\n' +
        '}\n' +
        GW + '[data-prism-layout="flush"] [data-testid="title-menu-bar"]' + NOT_HOLE + ' {\n' +
        '  width: auto !important;\n' +
        '  margin-right: var(--prism-wco-inset-right, 0px) !important;\n' +
        '}\n' +
        GW + '[data-prism-layout="flush"] :is([data-testid="sidebar-split"], [data-testid="aux-pane-split"]) > div:nth-child(2) {\n' +
        '  width: 1px !important;\n' +
        '  background-color: var(--prism-border-hairline) !important;\n' +
        '}\n' +
        GW + '[data-prism-layout="flush"] .agy-sidebar' + NOT_HOLE + ',\n' +
        GW + '[data-prism-layout="flush"] aside[data-side-panel-body]:not(.agy-sheet *):not([data-testid="aux-pane-split"] *)' + NOT_HOLE + ' {\n' +
        '  border-right: 1px solid var(--prism-border-hairline) !important;\n' +
        '}\n' +
        GW + '[data-prism-layout="flush"] [data-side-panel-strip]' + NOT_HOLE + ',\n' +
        GW + '[data-prism-layout="flush"] .agy-sheet [data-side-panel-body]' + NOT_HOLE + ',\n' +
        GW + '[data-prism-layout="flush"] .monaco-workbench .part.auxiliarybar' + NOT_HOLE + ' {\n' +
        '  background-color: var(--prism-surface-chat) !important;\n' +
        '  backdrop-filter: none !important;\n' +
        '  -webkit-backdrop-filter: none !important;\n' +
        '}'
      );
    }

    // 5. Solid Popovers, Menus & 2.34.0 Settings Modal Floor (>= 0.96 alpha, zero [class*="bg-background"] hover clobber)
    out.push(
      GG + ' .settings-modal-backdrop {\n' +
      '  background-color: ' + (isLight ? 'rgba(15, 23, 42, 0.28)' : 'rgba(0, 0, 0, 0.45)') + ' !important;\n' +
      '  backdrop-filter: blur(12px) saturate(120%) !important;\n' +
      '  -webkit-backdrop-filter: blur(12px) saturate(120%) !important;\n' +
      '}\n' +
      GG + '[data-has-browser-hole="true"] .settings-modal-backdrop,\n' +
      GG + ' body[data-has-browser-hole="true"] .settings-modal-backdrop {\n' +
      '  background-color: ' + (isLight ? 'rgba(15, 23, 42, 0.42)' : 'rgba(0, 0, 0, 0.58)') + ' !important;\n' +
      '}\n' +
      GG + ' [data-testid="modal-backdrop"] {\n' +
      '  background-color: rgba(0, 0, 0, 0.52) !important;\n' +
      '  backdrop-filter: blur(8px) saturate(120%) !important;\n' +
      '  -webkit-backdrop-filter: blur(8px) saturate(120%) !important;\n' +
      '}\n' +
      GG + ' [data-testid="media-modal"] {\n' +
      '  background: transparent !important;\n' +
      '  background-color: transparent !important;\n' +
      '  background-image: none !important;\n' +
      '  border: none !important;\n' +
      '  box-shadow: none !important;\n' +
      '  backdrop-filter: none !important;\n' +
      '  -webkit-backdrop-filter: none !important;\n' +
      '}\n\n' +
      SOLID_POPOVERS.map(function (s) {
        return GG + ' ' + s;
      }).join(',\n') +
      ' {\n' +
      '  --background: var(--prism-surface-popover) !important;\n' +
      '  --color-background: var(--prism-surface-popover) !important;\n' +
      '  --content: var(--prism-surface-popover) !important;\n' +
      '  background-color: var(--prism-surface-popover) !important;\n' +
      '  background-image: var(--prism-sheen) !important;\n' +
      '  backdrop-filter: blur(var(--prism-blur-xl)) saturate(150%) !important;\n' +
      '  -webkit-backdrop-filter: blur(var(--prism-blur-xl)) saturate(150%) !important;\n' +
      '  border: 1px solid var(--prism-border-popover) !important;\n' +
      '  box-shadow: inset 0 1px 0 var(--prism-specular-top), var(--prism-shadow-popover) !important;\n' +
      '}\n\n' +
      GG + ' :is([data-testid="title-menu-bar"] [data-browser-occluder="true"], .surface-opaque.bg-sidebar:not(.sticky):not([style*="sticky"])) {\n' +
      '  border-radius: var(--prism-r-card) !important;\n' +
      '}\n\n' +
      GG + ' :is(.agy-dialog, .settings-modal-container, [role="dialog"]:not(#gemini-neko-observer-modal):not([data-testid="media-modal"]), [role="alertdialog"]) :where(.dark, .light, .theme-dark, .theme-light) {\n' +
      '  --background: var(--prism-surface-popover) !important;\n' +
      '  --color-background: var(--prism-surface-popover) !important;\n' +
      '  --content: var(--prism-surface-popover) !important;\n' +
      '}'
    );

    out.push(
      GW + ' :is(.text-background, .ag-cs-home-heat-hint) {\n' +
      '  color: rgb(var(--prism-base-rgb)) !important;\n' +
      '}\n' +
      GG + ' ::selection { background-color: var(--prism-selection-bg) !important; color: inherit; }\n' +
      GW + ' ::-webkit-scrollbar-track { background: transparent !important; }\n' +
      GG + ' ::-webkit-scrollbar-thumb { background: var(--prism-scroll-thumb) !important; border-radius: 999px; }'
    );

    return out.join('\n\n');
  }

  function applyCaretStyle(cfg) {
    var existing = doc.getElementById(CARET_STYLE_ID);
    var color = cfg.caretColor || 'var(--prism-accent)';
    if (!state.skinEnabled) {
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
      state.lastCaretSig = '';
      return;
    }
    if (existing && state.lastCaretSig === color) return;
    state.lastCaretSig = color;
    if (!existing) {
      existing = doc.createElement('style');
      existing.id = CARET_STYLE_ID;
      (doc.head || doc.documentElement).appendChild(existing);
    }
    existing.textContent =
      'html[' + GLASS_ATTR + '="ready"] :is(textarea, input:not([type="range"]):not([type="checkbox"]):not([type="color"]), [contenteditable="true"]) { caret-color: ' +
      color +
      ' !important; }\n' +
      'html[' + GLASS_ATTR + '="ready"] .monaco-editor .cursors-layer > .cursor { background-color: ' +
      color +
      ' !important; border-color: ' +
      color +
      ' !important; }';
  }

  // ---------------------------------------------------------------------------
  // Antigravity 2.34.0 3-Layer `[data-browser-hole]` Synchronous Rounded GPU Cutout
  // ---------------------------------------------------------------------------
  function fmtNum(n) {
    var r = Math.round(Number(n) * 100) / 100;
    return Number.isFinite(r) ? String(r) : '0';
  }

  function parseCornerPx(raw) {
    var m = /^([\d.]+)px/.exec(String(raw || '').trim());
    return m ? Math.max(0, Number(m[1])) : 0;
  }

  function measureClippedBrowserHole(holeEl, vw, vh) {
    if (!holeEl || !holeEl.getBoundingClientRect) return null;
    try {
      var hcs = getComputedStyle(holeEl);
      if (hcs.display === 'none' || hcs.visibility === 'hidden') return null;
      var raw = holeEl.getBoundingClientRect();
      if (raw.width <= 0.5 || raw.height <= 0.5) return null;

      var left = Math.max(0, raw.left);
      var top = Math.max(0, raw.top);
      var right = Math.min(vw, raw.right);
      var bottom = Math.min(vh, raw.bottom);
      var tl = parseCornerPx(hcs.borderTopLeftRadius);
      var tr = parseCornerPx(hcs.borderTopRightRadius);
      var br = parseCornerPx(hcs.borderBottomRightRadius);
      var bl = parseCornerPx(hcs.borderBottomLeftRadius);

      var anc = holeEl.parentElement;
      while (anc && anc !== doc.body && anc !== doc.documentElement) {
        var acs = getComputedStyle(anc);
        if (acs.display === 'none' || acs.visibility === 'hidden') return null;
        var ovX = acs.overflowX || acs.overflow || 'visible';
        var ovY = acs.overflowY || acs.overflow || 'visible';
        if (ovX !== 'visible' || ovY !== 'visible') {
          var ar = anc.getBoundingClientRect();
          var bTop = parseFloat(acs.borderTopWidth) || 0;
          var bRight = parseFloat(acs.borderRightWidth) || 0;
          var bBot = parseFloat(acs.borderBottomWidth) || 0;
          var bLeft = parseFloat(acs.borderLeftWidth) || 0;
          var inLeft = ar.left + bLeft;
          var inTop = ar.top + bTop;
          var inRight = ar.right - bRight;
          var inBottom = ar.bottom - bBot;

          if (ovX !== 'visible') {
            left = Math.max(left, inLeft);
            right = Math.min(right, inRight);
          }
          if (ovY !== 'visible') {
            top = Math.max(top, inTop);
            bottom = Math.min(bottom, inBottom);
          }

          var atl = parseCornerPx(acs.borderTopLeftRadius);
          var atr = parseCornerPx(acs.borderTopRightRadius);
          var abr = parseCornerPx(acs.borderBottomRightRadius);
          var abl = parseCornerPx(acs.borderBottomLeftRadius);
          var eps = 2.5;
          var touchL = Math.abs(left - inLeft) <= eps || Math.abs(left - ar.left) <= bLeft + eps;
          var touchR = Math.abs(right - inRight) <= eps || Math.abs(right - ar.right) <= bRight + eps;
          var touchT = Math.abs(top - inTop) <= eps || Math.abs(top - ar.top) <= bTop + eps;
          var touchB = Math.abs(bottom - inBottom) <= eps || Math.abs(bottom - ar.bottom) <= bBot + eps;
          if (touchT && touchL && atl > tl) tl = atl;
          if (touchT && touchR && atr > tr) tr = atr;
          if (touchB && touchR && abr > br) br = abr;
          if (touchB && touchL && abl > bl) bl = abl;
        }
        anc = anc.parentElement;
      }

      var w = right - left;
      var h = bottom - top;
      if (w <= 0.5 || h <= 0.5) return null;

      var scale = Math.min(
        1,
        tl + tr > 0 ? w / (tl + tr) : 1,
        bl + br > 0 ? w / (bl + br) : 1,
        tl + bl > 0 ? h / (tl + bl) : 1,
        tr + br > 0 ? h / (tr + br) : 1
      );
      return {
        x: left,
        y: top,
        w: w,
        h: h,
        tl: tl * scale,
        tr: tr * scale,
        br: br * scale,
        bl: bl * scale,
      };
    } catch (_) {
      return null;
    }
  }

  function buildCcwRoundedHolePath(r) {
    var x = r.x;
    var y = r.y;
    var x2 = r.x + r.w;
    var y2 = r.y + r.h;
    var tl = r.tl > 0.4 ? r.tl : 0;
    var tr = r.tr > 0.4 ? r.tr : 0;
    var br = r.br > 0.4 ? r.br : 0;
    var bl = r.bl > 0.4 ? r.bl : 0;

    return (
      'M' + fmtNum(x + tl) + ',' + fmtNum(y) +
      (tl > 0 ? 'A' + fmtNum(tl) + ',' + fmtNum(tl) + ' 0 0 0 ' + fmtNum(x) + ',' + fmtNum(y + tl) : '') +
      'V' + fmtNum(y2 - bl) +
      (bl > 0 ? 'A' + fmtNum(bl) + ',' + fmtNum(bl) + ' 0 0 0 ' + fmtNum(x + bl) + ',' + fmtNum(y2) : '') +
      'H' + fmtNum(x2 - br) +
      (br > 0 ? 'A' + fmtNum(br) + ',' + fmtNum(br) + ' 0 0 0 ' + fmtNum(x2) + ',' + fmtNum(y2 - br) : '') +
      'V' + fmtNum(y + tr) +
      (tr > 0 ? 'A' + fmtNum(tr) + ',' + fmtNum(tr) + ' 0 0 0 ' + fmtNum(x2 - tr) + ',' + fmtNum(y) : '') +
      'Z'
    );
  }

  function disconnectHoleActiveObservers() {
    if (holeSubObs) {
      try { holeSubObs.disconnect(); } catch (_) {}
      holeSubObs = null;
    }
    if (holeResizeObs) {
      try { holeResizeObs.disconnect(); } catch (_) {}
      holeResizeObs = null;
    }
    if (holeRaf) {
      W.cancelAnimationFrame(holeRaf);
      holeRaf = 0;
    }
    holeRafUntil = 0;
  }

  function armHoleTransitionRaf(durationMs) {
    var until = Date.now() + Math.min(600, Math.max(120, Number(durationMs) || 360));
    if (until > holeRafUntil) holeRafUntil = until;
    if (holeRaf) return;
    var step = function () {
      holeRaf = 0;
      if (destroyed || !state.skinEnabled) return;
      syncBrowserHoleCutout();
      if (Date.now() < holeRafUntil || (doc.body && doc.body.querySelector('[data-split-transition]'))) {
        holeRaf = W.requestAnimationFrame(step);
      }
    };
    holeRaf = W.requestAnimationFrame(step);
  }

  function ensureHoleActiveObservers(holeNodes) {
    if (!holeSubObs && W.MutationObserver && doc.body) {
      holeSubObs = new MutationObserver(function (muts) {
        if (destroyed || !state.skinEnabled) return;
        syncBrowserHoleCutout();
        for (var i = 0; i < muts.length; i += 1) {
          if (muts[i].attributeName === 'data-split-transition') {
            armHoleTransitionRaf(560);
            break;
          }
        }
      });
      try {
        holeSubObs.observe(doc.body, {
          subtree: true,
          childList: true,
          attributes: true,
          attributeFilter: ['style', 'class', 'hidden', 'aria-hidden', 'data-browser-hole', 'data-has-browser-hole', 'data-split-transition'],
        });
      } catch (_) {}
    }

    if (W.ResizeObserver) {
      if (!holeResizeObs) {
        holeResizeObs = new ResizeObserver(function () {
          if (destroyed || !state.skinEnabled) return;
          syncBrowserHoleCutout();
        });
      } else {
        try { holeResizeObs.disconnect(); } catch (_) {}
      }
      try {
        if (doc.body) holeResizeObs.observe(doc.body);
        for (var i = 0; i < holeNodes.length; i += 1) {
          var hEl = holeNodes[i];
          holeResizeObs.observe(hEl);
          var sheet = hEl.closest && hEl.closest('.agy-sheet, .aux-drawer-popup');
          if (sheet) holeResizeObs.observe(sheet);
          var pane = hEl.closest && hEl.closest('[data-pane-id], [data-split-sized], [data-testid="aux-pane-split"]');
          if (pane) holeResizeObs.observe(pane);
        }
      } catch (_) {}
    }
  }

  function syncBrowserHoleCutout() {
    var root = doc.documentElement;
    var body = doc.body;
    if (!root || !state.skinEnabled) return '';

    var hasAttr =
      root.getAttribute('data-has-browser-hole') === 'true' ||
      Boolean(body && body.getAttribute('data-has-browser-hole') === 'true');
    var holeNodes = doc.querySelectorAll ? doc.querySelectorAll(ACTIVE_HOLE_SEL) : [];

    if (!hasAttr && (!holeNodes || holeNodes.length === 0)) {
      disconnectHoleActiveObservers();
      if (state.lastHoleClip !== '') {
        state.lastHoleClip = '';
        root.style.removeProperty('--prism-hole-clip');
        var stClear = doc.getElementById(STAGE_ID);
        if (stClear) stClear.style.clipPath = '';
        var fxClear = doc.getElementById(FX_CANVAS_ID);
        if (fxClear) fxClear.style.clipPath = '';
      }
      return '';
    }

    ensureHoleActiveObservers(holeNodes);

    var vw = Math.max(1, W.innerWidth || root.clientWidth || 1440);
    var vh = Math.max(1, W.innerHeight || root.clientHeight || 900);
    var subpaths = [];
    for (var i = 0; i < holeNodes.length; i += 1) {
      var m = measureClippedBrowserHole(holeNodes[i], vw, vh);
      if (m) subpaths.push(buildCcwRoundedHolePath(m));
    }

    var nextClip = subpaths.length > 0 ? 'path("M0,0H' + fmtNum(vw) + 'V' + fmtNum(vh) + 'H0Z ' + subpaths.join(' ') + '")' : '';
    if (nextClip !== state.lastHoleClip) {
      state.lastHoleClip = nextClip;
      if (nextClip) root.style.setProperty('--prism-hole-clip', nextClip);
      else root.style.removeProperty('--prism-hole-clip');
    }
    var stageEl = doc.getElementById(STAGE_ID);
    if (stageEl && stageEl.style.clipPath !== nextClip) stageEl.style.clipPath = nextClip;
    var fxEl = doc.getElementById(FX_CANVAS_ID);
    if (fxEl && fxEl.style.clipPath !== nextClip) fxEl.style.clipPath = nextClip;
    return nextClip;
  }

  function setWallpaperReady(ready) {
    var next = Boolean(ready && state.skinEnabled && !destroyed);
    state.wallpaperReady = next;
    var root = doc.documentElement;
    if (root) {
      if (next) {
        if (root.getAttribute(WALLPAPER_ATTR) !== 'ready') root.setAttribute(WALLPAPER_ATTR, 'ready');
      } else {
        root.removeAttribute(WALLPAPER_ATTR);
      }
    }
    var fxEl = doc.getElementById(FX_CANVAS_ID);
    if (fxEl && fxEl.style) {
      fxEl.style.display = next ? '' : 'none';
    }
    if (!next) {
      state.fxParticles = [];
    }
    if (next) {
      syncBrowserHoleCutout();
      scheduleWcoConfirmTimers();
    }
  }

  function clearRootWatchdogTimers() {
    clearTimeout(state.watchdog15Timer);
    clearTimeout(state.watchdog80Timer);
    state.watchdog15Timer = 0;
    state.watchdog80Timer = 0;
  }

  function isHostRootHealthy() {
    var r = doc.getElementById('root') || (doc.querySelector && doc.querySelector('.monaco-workbench'));
    if (!r) return true;
    var b = r.getBoundingClientRect();
    return b.width >= 100 && b.height >= 100;
  }

  function armPostMountWatchdog() {
    if (destroyed || !state.skinEnabled) return;
    if (state._watchdogReported || state.watchdog15Timer || state.watchdog80Timer) return;
    state.watchdog15Timer = setTimeout(function () {
      state.watchdog15Timer = 0;
      if (destroyed || !state.skinEnabled) return;
      if (!isHostRootHealthy()) {
        state._watchdogReported = true;
        callHostRpc('canary.rollback', { reason: 'root_collapsed_1500ms' });
        destroy();
      }
    }, 1500);
    state.watchdog80Timer = setTimeout(function () {
      state.watchdog80Timer = 0;
      if (destroyed || !state.skinEnabled) return;
      state._watchdogReported = true;
      if (!isHostRootHealthy()) {
        callHostRpc('canary.rollback', { reason: 'root_collapsed_8000ms' });
        destroy();
      } else {
        callHostRpc('canary.healthy', {});
      }
    }, 8000);
  }

  // ---------------------------------------------------------------------------
  // Cross-Origin Sidecar Iframe Theme Sync Bridge (`theme-change`)
  // ---------------------------------------------------------------------------
  function syncSidecarIframes(cfg) {
    if (!doc.querySelectorAll) return;
    var isLight = state.effectiveTheme === 'light';
    var schemePair = COLOR_SCHEMES[cfg.colorScheme] || COLOR_SCHEMES['prism-default'];
    var S = isLight ? schemePair.light : schemePair.dark;
    var acc = resolveAccent(cfg, S, isLight);
    var sig = [state.effectiveTheme, cfg.colorScheme, acc.hex, cfg.layoutMode].join('|');
    if (sig === state.lastSidecarSig) return;
    state.lastSidecarSig = sig;

    var vars = {
      '--background': rgbToHex(parseRgbTriplet(S.base)),
      '--content': rgbToHex(parseRgbTriplet(S.base)),
      '--sidebar': rgbToHex(parseRgbTriplet(S.shade)),
      '--card': rgbToHex(parseRgbTriplet(S.tint1)),
      '--secondary': rgbToHex(parseRgbTriplet(S.tint2)),
      '--foreground': S.fg,
      '--secondary-foreground': S.fg2,
      '--muted-foreground': S.muted,
      '--placeholder': S.faint,
      '--primary': acc.hex,
      '--primary-foreground': acc.fg,
      '--accent': acc.hex,
      '--link': S.link,
      '--border': rgbaStr(parseRgbTriplet(S.pt), isLight ? 0.11 : 0.08),
      '--card-border': rgbaStr(parseRgbTriplet(S.pt), isLight ? 0.13 : 0.10),
    };

    var frames = [];
    doc.querySelectorAll('iframe[data-testid="sidecar-iframe"], [data-testid="sidecar-iframe-slot"] iframe').forEach(function (f) {
      if (frames.indexOf(f) < 0) frames.push(f);
    });
    for (var i = 0; i < frames.length; i += 1) {
      try {
        var cw = frames[i].contentWindow;
        if (cw && typeof cw.postMessage === 'function') {
          cw.postMessage(
            {
              type: 'theme-change',
              prismSync: true,
              payload: {
                theme: 'prism-' + cfg.colorScheme,
                themeType: state.effectiveTheme,
                colorScheme: cfg.colorScheme,
                accent: acc.hex,
                cssVariables: vars,
              },
            },
            '*'
          );
        }
      } catch (_) {}
    }
  }

  // ---------------------------------------------------------------------------
  // Stage DOM, 7 Pre-Staged GPU Transitions, Slideshow & Playback Control
  // ---------------------------------------------------------------------------
  function ensureStage() {
    if (!doc.body) return null;
    var stage = doc.getElementById(STAGE_ID);
    if (!stage) {
      stage = doc.createElement('div');
      stage.id = STAGE_ID;
      stage.setAttribute('data-agy-prism-layer', '1');
      doc.body.insertBefore(stage, doc.body.firstChild);
    }
    stage.inert = true;
    stage.setAttribute('inert', '');
    stage.setAttribute('aria-hidden', 'true');
    stage.setAttribute('tabindex', '-1');
    if (state.lastHoleClip && stage.style.clipPath !== state.lastHoleClip) {
      stage.style.clipPath = state.lastHoleClip;
    }
    if (!stage.querySelector('.agy-prism-scrim')) {
      var scrim = doc.createElement('div');
      scrim.className = 'agy-prism-scrim';
      var vig = doc.createElement('div');
      vig.className = 'agy-prism-vignette';
      var grain = doc.createElement('div');
      grain.className = 'agy-prism-grain';
      stage.appendChild(scrim);
      stage.appendChild(vig);
      stage.appendChild(grain);
    }
    return stage;
  }

  function resolveEffectiveKind(item, cfg) {
    if (!item) return 'none';
    var k = String(item.kind || '').toLowerCase();
    if (k === 'scene') {
      var sm = String(item.sceneMode || '').toLowerCase();
      if (
        sm === 'video' ||
        sm === 'scene-video' ||
        sm.indexOf('video') >= 0 ||
        Boolean(item.sceneVideoUrl && (!sm || sm === 'video' || sm === 'scene-video')) ||
        (item.mediaUrl && (/\/scene-video\b/i.test(item.mediaUrl) || /\.(mp4|webm|mkv|avi|mov)(\?|$)/i.test(item.mediaUrl)))
      ) {
        return 'video';
      }
      if (
        sm === 'live' ||
        sm === 'scene-live' ||
        sm === 'web' ||
        sm.indexOf('web') >= 0 ||
        (item.mediaUrl && (/\/scene-live\b|\/scene-files\b/i.test(item.mediaUrl) || /\.html?(\?|$)/i.test(item.mediaUrl)))
      ) {
        return 'web';
      }
      if (item.mediaUrl || item.thumbUrl) return 'image';
      return 'aurora';
    }
    if (k === 'slideshow' || (k === 'image' && item.slidesUrl && state.slides && state.slides.length > 1)) return 'slideshow';
    if (k === 'image' || k === 'video' || k === 'web') return k;
    if (cfg && cfg.sourceUrl) return 'image';
    return 'none';
  }

  function pauseWrapMedia(wrap) {
    if (!wrap || !wrap.querySelectorAll) return;
    var vids = wrap.querySelectorAll('video, audio');
    for (var i = 0; i < vids.length; i += 1) {
      try {
        vids[i].pause();
      } catch (_) {}
    }
    var frames = wrap.querySelectorAll('iframe');
    for (var j = 0; j < frames.length; j += 1) {
      try {
        if (frames[j].contentWindow) {
          frames[j].contentWindow.postMessage({ type: 'prism-video-ctl', paused: true }, '*');
        }
      } catch (_) {}
    }
  }

  var MAX_BLOB_MEDIA_BYTES = 256 * 1024 * 1024;
  var BLOB_FETCH_TIMEOUT_MS = 20000;

  function isCrossSchemeLoopbackUrl(url) {
    return Boolean(
      W.location &&
      W.location.protocol === 'https:' &&
      /^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?\//i.test(String(url || '').trim())
    );
  }

  function isCrossSchemeLoopbackMediaUrl(url) {
    return Boolean(
      isCrossSchemeLoopbackUrl(url) &&
      typeof W.fetch === 'function' &&
      typeof W.URL !== 'undefined' &&
      typeof W.URL.createObjectURL === 'function'
    );
  }

  // Antigravity 2.34.0 (Chrome 152) serves the main hub on `https://127.0.0.1:<port>`, where direct
  // `<video>`/`<audio>` `type:"Media"` requests to `http://127.0.0.1:<mediaPort>` stall indefinitely at
  // `readyState === 0`. Zero-delay `fetch()` -> `blob:` bypasses the Media loader hang with a 20s timeout
  // and 256 MiB safety cap.
  function attachLoopbackMediaSrc(el, url, opts) {
    if (!el || !url) return;
    opts = opts || {};
    var wrap = opts.wrap || null;
    var isStale = typeof opts.isStale === 'function' ? opts.isStale : function () { return destroyed; };
    var token = (el.__prismMediaToken = (el.__prismMediaToken || 0) + 1);
    clearTimeout(el.__prismProbeTimer);
    el.__prismProbeTimer = 0;
    clearTimeout(el.__prismFetchTimer);
    el.__prismFetchTimer = 0;

    var isCurrent = function () {
      return !destroyed && el.__prismMediaToken === token && !isStale();
    };

    var startBlobFetch = function () {
      if (!isCurrent() || el.__prismFetchingBlob) return;
      el.__prismFetchingBlob = true;
      el.__prismTimedOut = false;

      var ac = typeof W.AbortController === 'function' ? new W.AbortController() : null;
      if (ac && wrap) {
        if (!wrap.__prismAbortControllers) wrap.__prismAbortControllers = [];
        wrap.__prismAbortControllers.push(ac);
      }
      var fetchTimer = setTimeout(function () {
        el.__prismTimedOut = true;
        try {
          if (ac) ac.abort();
        } catch (_) {}
      }, BLOB_FETCH_TIMEOUT_MS);
      el.__prismFetchTimer = fetchTimer;

      W.fetch(url, ac ? { signal: ac.signal } : undefined)
        .then(function (res) {
          if (!res || !res.ok) throw new Error('HTTP ' + (res ? res.status : 0));
          var lenHeader = res.headers && typeof res.headers.get === 'function' ? Number(res.headers.get('content-length')) : 0;
          if (Number.isFinite(lenHeader) && lenHeader > MAX_BLOB_MEDIA_BYTES) {
            try {
              if (ac) ac.abort();
            } catch (_) {}
            var capErr = new Error('Media exceeds blob cap');
            capErr.code = 'BLOB_CAP_EXCEEDED';
            throw capErr;
          }
          return res.blob();
        })
        .then(function (blob) {
          clearTimeout(fetchTimer);
          el.__prismFetchTimer = 0;
          if (!isCurrent()) {
            el.__prismFetchingBlob = false;
            return;
          }
          if (!blob || blob.size <= 0) {
            throw new Error('Empty media blob');
          }
          if (blob.size > MAX_BLOB_MEDIA_BYTES) {
            var capErr = new Error('Media exceeds blob cap');
            capErr.code = 'BLOB_CAP_EXCEEDED';
            throw capErr;
          }
          var blobUrl = W.URL.createObjectURL(blob);
          if (!isCurrent()) {
            el.__prismFetchingBlob = false;
            try {
              W.URL.revokeObjectURL(blobUrl);
            } catch (_) {}
            return;
          }
          state.preferBlobMedia = true;
          el.__prismFetchingBlob = false;
          if (el.__prismBlobUrl) {
            try {
              W.URL.revokeObjectURL(el.__prismBlobUrl);
            } catch (_) {}
          }
          el.__prismBlobUrl = blobUrl;
          el.src = blobUrl;
          if (typeof opts.onReady === 'function') opts.onReady();
        })
        .catch(function (err) {
          clearTimeout(fetchTimer);
          el.__prismFetchTimer = 0;
          el.__prismFetchingBlob = false;
          if (!isCurrent()) return;
          if (err && err.name === 'AbortError' && !el.__prismTimedOut) return;
          if (typeof opts.onError === 'function') opts.onError(err);
        });
    };

    if (!isCrossSchemeLoopbackMediaUrl(url)) {
      el.src = url;
      return;
    }

    startBlobFetch();
  }

  // Antigravity 2.34.0 (Chrome 152) serves the main hub on `https://127.0.0.1:<port>`, where direct
  // `<img>` requests to `http://127.0.0.1:<mediaPort>` can silently hang without firing `onerror`.
  // Zero-delay `fetch()` -> `blob:` bypasses Chrome 152 passive Mixed Content hangs at 0ms.
  function attachLoopbackImageSrc(img, url, wrap, onFail) {
    if (!img || !url) {
      if (typeof onFail === 'function') onFail();
      return;
    }
    var token = (img.__prismMediaToken = (img.__prismMediaToken || 0) + 1);
    img.__prismTriedBlob = false;
    img.__prismFetchingBlob = false;
    img.__prismTimedOut = false;
    clearTimeout(img.__prismFetchTimer);
    img.__prismFetchTimer = 0;
    if (typeof img.__prismErrCleanup === 'function') {
      try {
        img.__prismErrCleanup();
      } catch (_) {}
      img.__prismErrCleanup = null;
    }
    if (img.__prismBlobUrl) {
      try {
        if (typeof W.URL !== 'undefined' && typeof W.URL.revokeObjectURL === 'function') {
          W.URL.revokeObjectURL(img.__prismBlobUrl);
        }
      } catch (_) {}
      img.__prismBlobUrl = '';
    }

    var isCurrent = function () {
      return !destroyed && img.__prismMediaToken === token && (!wrap || !img.parentNode || img.parentNode === wrap);
    };

    var failOnce = false;
    var triggerFail = function () {
      if (failOnce) return;
      failOnce = true;
      if (typeof onFail === 'function') onFail();
    };

    var startBlobFetch = function () {
      if (!isCurrent() || img.__prismFetchingBlob) return;
      img.__prismTriedBlob = true;
      img.__prismFetchingBlob = true;
      img.__prismTimedOut = false;
      var ac = typeof W.AbortController === 'function' ? new W.AbortController() : null;
      if (ac && wrap) {
        if (!wrap.__prismAbortControllers) wrap.__prismAbortControllers = [];
        wrap.__prismAbortControllers.push(ac);
      }
      var fetchTimer = setTimeout(function () {
        img.__prismTimedOut = true;
        try {
          if (ac) ac.abort();
        } catch (_) {}
      }, BLOB_FETCH_TIMEOUT_MS);
      img.__prismFetchTimer = fetchTimer;

      W.fetch(url, ac ? { signal: ac.signal } : undefined)
        .then(function (res) {
          if (!res || !res.ok) throw new Error('HTTP ' + (res ? res.status : 0));
          var lenHeader = res.headers && typeof res.headers.get === 'function' ? Number(res.headers.get('content-length')) : 0;
          if (Number.isFinite(lenHeader) && lenHeader > MAX_BLOB_MEDIA_BYTES) {
            try {
              if (ac) ac.abort();
            } catch (_) {}
            throw new Error('Image exceeds blob cap');
          }
          return res.blob();
        })
        .then(function (blob) {
          clearTimeout(fetchTimer);
          img.__prismFetchTimer = 0;
          if (!isCurrent()) {
            img.__prismFetchingBlob = false;
            return;
          }
          if (!blob || blob.size <= 0 || blob.size > MAX_BLOB_MEDIA_BYTES) {
            throw new Error('Invalid image blob');
          }
          var blobUrl = W.URL.createObjectURL(blob);
          if (!isCurrent()) {
            img.__prismFetchingBlob = false;
            try {
              W.URL.revokeObjectURL(blobUrl);
            } catch (_) {}
            return;
          }
          img.__prismFetchingBlob = false;
          if (img.__prismBlobUrl) {
            try {
              W.URL.revokeObjectURL(img.__prismBlobUrl);
            } catch (_) {}
          }
          img.__prismBlobUrl = blobUrl;
          img.src = blobUrl;
        })
        .catch(function (err) {
          clearTimeout(fetchTimer);
          img.__prismFetchTimer = 0;
          img.__prismFetchingBlob = false;
          if (!isCurrent()) return;
          if (err && err.name === 'AbortError' && !img.__prismTimedOut) return;
          triggerFail();
        });
    };

    var handleError = function () {
      if (!isCurrent() || img.__prismFetchingBlob) return;
      if (!img.__prismTriedBlob && isCrossSchemeLoopbackMediaUrl(url)) {
        startBlobFetch();
        return;
      }
      triggerFail();
    };

    img.onerror = handleError;
    if (typeof img.addEventListener === 'function') {
      img.addEventListener('error', handleError);
      img.__prismErrCleanup = function () {
        if (typeof img.removeEventListener === 'function') {
          img.removeEventListener('error', handleError);
        }
      };
    }

    if (isCrossSchemeLoopbackMediaUrl(url)) {
      startBlobFetch();
      return;
    }

    img.src = url;
  }

  // Streaming MediaSource (MSE) fMP4 player for >256 MiB videos (e.g. 971 MB / 4 GB) under `https:` hosts.
  // Pumps chunks from `/mse-fmp4/<token>` into SourceBuffer with rolling frame eviction so RAM stays <32 MiB.
  function mountMseStreamVideo(video, mseUrl, wrap, isStaleFn, onVideoDecoded, fallbackToPoster) {
    var isStale = typeof isStaleFn === 'function' ? isStaleFn : function () { return destroyed; };
    var failedOnce = false;
    var mseDone = false;
    var activeReader = null;
    var ac = typeof W.AbortController === 'function' ? new W.AbortController() : null;

    var failMse = function () {
      if (failedOnce) return;
      failedOnce = true;
      mseDone = true;
      if (video) {
        video.__prismMseLoading = false;
      }
      if (ac) {
        try {
          ac.abort();
        } catch (_) {}
      }
      if (activeReader && typeof activeReader.cancel === 'function') {
        try {
          activeReader.cancel().catch(function () {});
        } catch (_) {}
        activeReader = null;
      }
      if (!destroyed && !isStale() && typeof fallbackToPoster === 'function') {
        fallbackToPoster();
      }
    };

    if (
      !video ||
      !mseUrl ||
      typeof W.MediaSource !== 'function' ||
      typeof W.fetch !== 'function' ||
      typeof W.URL === 'undefined' ||
      typeof W.URL.createObjectURL !== 'function'
    ) {
      failMse();
      return;
    }

    if (ac && wrap) {
      if (!wrap.__prismAbortControllers) wrap.__prismAbortControllers = [];
      wrap.__prismAbortControllers.push(ac);
    }
    if (ac && ac.signal && typeof ac.signal.addEventListener === 'function') {
      ac.signal.addEventListener(
        'abort',
        function () {
          mseDone = true;
          if (activeReader && typeof activeReader.cancel === 'function') {
            try {
              activeReader.cancel().catch(function () {});
            } catch (_) {}
            activeReader = null;
          }
        },
        { once: true }
      );
    }

    if (video.__prismBlobUrl) {
      try {
        if (typeof W.URL.revokeObjectURL === 'function') {
          W.URL.revokeObjectURL(video.__prismBlobUrl);
        }
      } catch (_) {}
      video.__prismBlobUrl = '';
    }

    video.__prismMseActive = true;
    video.__prismMseLoading = true;
    video.__prismMseEvicted = false;

    var ms;
    try {
      ms = new W.MediaSource();
    } catch (_) {
      failMse();
      return;
    }

    var opened = false;
    var onSourceOpen = function () {
      if (opened || mseDone || destroyed || isStale()) return;
      opened = true;

      W.fetch(mseUrl, ac ? { signal: ac.signal } : undefined)
        .then(function (res) {
          if (mseDone || destroyed || isStale()) return;
          if (!res || !res.ok) {
            throw new Error('MSE HTTP ' + (res ? res.status : 0));
          }

          var hdrMime =
            res.headers && typeof res.headers.get === 'function' ? String(res.headers.get('x-prism-mse-mime') || '').trim() : '';
          var mimeCandidates = [];
          if (hdrMime) mimeCandidates.push(hdrMime);
          mimeCandidates.push(
            'video/mp4; codecs="avc1.640028"',
            'video/mp4; codecs="avc1.42E01E"',
            'video/mp4; codecs="hvc1.1.6.L120.90"',
            'video/mp4; codecs="hev1.1.6.L120.90"'
          );

          var chosenMime = '';
          for (var mi = 0; mi < mimeCandidates.length; mi += 1) {
            try {
              if (typeof W.MediaSource.isTypeSupported !== 'function' || W.MediaSource.isTypeSupported(mimeCandidates[mi])) {
                chosenMime = mimeCandidates[mi];
                break;
              }
            } catch (_) {}
          }
          if (!chosenMime) {
            throw new Error('Unsupported MSE codecs');
          }

          var sb = ms.addSourceBuffer(chosenMime);
          var waitForUpdateEnd = function () {
            if (!sb || !sb.updating) return Promise.resolve();
            return new Promise(function (resolveEnd, rejectEnd) {
              var settledWait = false;
              var cleanupWait = function () {
                if (typeof sb.removeEventListener === 'function') {
                  sb.removeEventListener('updateend', onEnd);
                  sb.removeEventListener('error', onErr);
                  sb.removeEventListener('abort', onErr);
                }
              };
              var onEnd = function () {
                if (settledWait) return;
                settledWait = true;
                cleanupWait();
                resolveEnd();
              };
              var onErr = function () {
                if (settledWait) return;
                settledWait = true;
                cleanupWait();
                rejectEnd(new Error('SourceBuffer update error'));
              };
              if (typeof sb.addEventListener === 'function') {
                sb.addEventListener('updateend', onEnd);
                sb.addEventListener('error', onErr);
                sb.addEventListener('abort', onErr);
              } else {
                resolveEnd();
              }
            });
          };

          var evictOldFramesIfNeeded = function () {
            try {
              var curT = Number(video.currentTime || 0);
              if (curT > 25 && sb.buffered && sb.buffered.length > 0) {
                var bStart = Number(sb.buffered.start(0));
                var bEnd = Number(sb.buffered.end(sb.buffered.length - 1));
                if (bEnd - bStart > 20 && curT - 15 > bStart) {
                  video.__prismMseEvicted = true;
                  sb.remove(0, curT - 15);
                  return waitForUpdateEnd();
                }
              }
            } catch (_) {}
            return Promise.resolve();
          };

          var waitForBackpressure = function () {
            try {
              if (video.readyState >= 2 && sb.buffered && sb.buffered.length > 0) {
                var curT = Number(video.currentTime || 0);
                var bEnd = Number(sb.buffered.end(sb.buffered.length - 1));
                if (bEnd - curT > 25) {
                  return new Promise(function (resolveDelay) {
                    setTimeout(resolveDelay, 250);
                  });
                }
              }
            } catch (_) {}
            return Promise.resolve();
          };

          var appendChunkWithRetry = function (u8) {
            return waitForUpdateEnd()
              .then(evictOldFramesIfNeeded)
              .then(function () {
                if (mseDone || destroyed || isStale()) return;
                try {
                  sb.appendBuffer(u8);
                  return waitForUpdateEnd();
                } catch (appendErr) {
                  if (appendErr && appendErr.name === 'QuotaExceededError') {
                    var curT = Number(video.currentTime || 0);
                    if (curT > 5 && sb.buffered && sb.buffered.length > 0) {
                      try {
                        video.__prismMseEvicted = true;
                        sb.remove(0, Math.max(0, curT - 5));
                      } catch (_) {}
                      return waitForUpdateEnd().then(function () {
                        if (mseDone || destroyed || isStale()) return;
                        sb.appendBuffer(u8);
                        return waitForUpdateEnd();
                      });
                    }
                  }
                  throw appendErr;
                }
              });
          };

          var finishStream = function () {
            return waitForUpdateEnd().then(function () {
              if (mseDone || destroyed || isStale()) return;
              video.__prismMseLoading = false;
              try {
                if (ms.readyState === 'open' && typeof ms.endOfStream === 'function') {
                  ms.endOfStream();
                }
              } catch (_) {}
              syncMediaPlaybackState();
              if (video.readyState >= 2 && video.videoWidth > 0 && typeof onVideoDecoded === 'function') {
                onVideoDecoded();
              }
            });
          };

          if (res.body && typeof res.body.getReader === 'function') {
            var reader = res.body.getReader();
            activeReader = reader;
            var chunksAppended = 0;

            var pump = function () {
              if (mseDone || destroyed || isStale()) {
                try {
                  reader.cancel().catch(function () {});
                } catch (_) {}
                return Promise.resolve();
              }
              return waitForBackpressure().then(function () {
                if (mseDone || destroyed || isStale()) return;
                return reader.read().then(function (step) {
                  if (mseDone || destroyed || isStale()) return;
                  if (!step || step.done) {
                    activeReader = null;
                    return finishStream();
                  }
                  var chunk = step.value;
                  if (chunk && chunk.byteLength > 0) {
                    var u8 = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
                    return appendChunkWithRetry(u8).then(function () {
                      if (mseDone || destroyed || isStale()) return;
                      chunksAppended += 1;
                      if (chunksAppended === 1) {
                        syncMediaPlaybackState();
                      }
                      if (video.readyState >= 2 && video.videoWidth > 0 && typeof onVideoDecoded === 'function') {
                        onVideoDecoded();
                      }
                      return pump();
                    });
                  }
                  return pump();
                });
              });
            };

            return pump();
          }

          if (typeof res.arrayBuffer === 'function') {
            return res.arrayBuffer().then(function (buf) {
              if (mseDone || destroyed || isStale()) return;
              return appendChunkWithRetry(new Uint8Array(buf)).then(finishStream);
            });
          }

          throw new Error('MSE response body unreadable');
        })
        .catch(function (err) {
          if (mseDone || destroyed || isStale()) return;
          if (err && err.name === 'AbortError') return;
          failMse();
        });
    };

    if (typeof ms.addEventListener === 'function') {
      ms.addEventListener('sourceopen', onSourceOpen);
    }

    var msBlobUrl = W.URL.createObjectURL(ms);
    video.__prismBlobUrl = msBlobUrl;
    video.src = msBlobUrl;

    if (ms.readyState === 'open') {
      onSourceOpen();
    }
  }

  function disposeWrap(wrap) {
    if (!wrap) return;
    var idx = state.outgoingWraps.indexOf(wrap);
    if (idx >= 0) state.outgoingWraps.splice(idx, 1);
    if (wrap.__prismAbortControllers) {
      for (var k = 0; k < wrap.__prismAbortControllers.length; k += 1) {
        try {
          wrap.__prismAbortControllers[k].abort();
        } catch (_) {}
      }
      wrap.__prismAbortControllers = null;
    }
    var mediaEls = wrap.querySelectorAll ? wrap.querySelectorAll('video, audio, img') : [];
    if ((!mediaEls || !mediaEls.length) && wrap.children && wrap.children.length) {
      mediaEls = wrap.children;
    }
    for (var i = 0; i < mediaEls.length; i += 1) {
      var el = mediaEls[i];
      if (!el) continue;
      try {
        el.__prismMediaToken = (el.__prismMediaToken || 0) + 1;
        clearTimeout(el.__prismProbeTimer);
        el.__prismProbeTimer = 0;
        clearTimeout(el.__prismFetchTimer);
        el.__prismFetchTimer = 0;
        el.__prismFetchingBlob = false;
        el.__prismMseLoading = false;
        el.__prismMseActive = false;
        if (typeof el.__prismErrCleanup === 'function') {
          try {
            el.__prismErrCleanup();
          } catch (_) {}
          el.__prismErrCleanup = null;
        }
        if (typeof el.pause === 'function') el.pause();
        if (typeof el.removeAttribute === 'function') el.removeAttribute('src');
        if ('srcObject' in el) el.srcObject = null;
        if (typeof el.load === 'function') el.load();
        if (el.__prismBlobUrl) {
          if (typeof W.URL !== 'undefined' && typeof W.URL.revokeObjectURL === 'function') {
            W.URL.revokeObjectURL(el.__prismBlobUrl);
          }
          el.__prismBlobUrl = '';
        }
      } catch (_) {}
    }
    var ifs = wrap.querySelectorAll ? wrap.querySelectorAll('iframe') : [];
    for (var j = 0; j < ifs.length; j += 1) {
      try {
        ifs[j].src = 'about:blank';
      } catch (_) {}
    }
    if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
  }

  function flushOutgoingWraps() {
    clearTimeout(state.transitionTimer);
    state.transitionTimer = 0;
    if (state.activeWrap && state.activeWrap.isConnected) {
      state.activeWrap.style.transition = '';
      state.activeWrap.style.clipPath = '';
      state.activeWrap.style.opacity = '';
    }
    while (state.outgoingWraps.length > 0) {
      disposeWrap(state.outgoingWraps.pop());
    }
  }

  function transitionDurationMs(speed) {
    if (speed === 'fast') return 260;
    if (speed === 'slow') return 900;
    return 520;
  }

  function applyTransitionAnimation(inWrap, outWrap, type, dir, durMs) {
    if (!outWrap || !outWrap.isConnected || outWrap === inWrap || doc.hidden || type === 'cut' || durMs <= 0) {
      flushOutgoingWraps();
      if (outWrap && outWrap !== inWrap) disposeWrap(outWrap);
      inWrap.style.opacity = '';
      inWrap.style.transition = '';
      inWrap.style.clipPath = '';
      return;
    }
    flushOutgoingWraps();
    pauseWrapMedia(outWrap);
    state.outgoingWraps.push(outWrap);
    var ease = 'cubic-bezier(0.22, 1, 0.36, 1)';
    inWrap.style.transition = 'none';
    outWrap.style.transition = 'none';

    if (type === 'fade') {
      inWrap.style.opacity = '0';
      inWrap.offsetHeight;
      inWrap.style.transition = 'opacity ' + durMs + 'ms ' + ease;
      inWrap.style.opacity = '1';
    } else if (type === 'zoom') {
      inWrap.style.opacity = '0';
      inWrap.style.transform = 'scale(1.08)';
      inWrap.offsetHeight;
      inWrap.style.transition = 'opacity ' + durMs + 'ms ' + ease + ', transform ' + durMs + 'ms ' + ease;
      inWrap.style.opacity = '1';
      inWrap.style.transform = 'translate3d(var(--prism-px, 0px), var(--prism-py, 0px), 0)';
    } else if (type === 'push') {
      inWrap.style.opacity = '1';
      var tx = dir === 'left' ? '100%' : dir === 'right' ? '-100%' : '0%';
      var ty = dir === 'up' ? '100%' : dir === 'down' ? '-100%' : '0%';
      var ox = dir === 'left' ? '-35%' : dir === 'right' ? '35%' : '0%';
      var oy = dir === 'up' ? '-35%' : dir === 'down' ? '35%' : '0%';
      inWrap.style.transform = 'translate3d(' + tx + ', ' + ty + ', 0)';
      inWrap.offsetHeight;
      inWrap.style.transition = 'transform ' + durMs + 'ms ' + ease;
      outWrap.style.transition = 'transform ' + durMs + 'ms ' + ease + ', opacity ' + durMs + 'ms ease';
      inWrap.style.transform = 'translate3d(var(--prism-px, 0px), var(--prism-py, 0px), 0)';
      outWrap.style.transform = 'translate3d(' + ox + ', ' + oy + ', 0)';
      outWrap.style.opacity = '0.4';
    } else if (type === 'wipe') {
      inWrap.style.opacity = '1';
      var startClip =
        dir === 'right'
          ? 'inset(0 100% 0 0)'
          : dir === 'up'
            ? 'inset(100% 0 0 0)'
            : dir === 'down'
              ? 'inset(0 0 100% 0)'
              : 'inset(0 0 0 100%)';
      inWrap.style.clipPath = startClip;
      inWrap.offsetHeight;
      inWrap.style.transition = 'clip-path ' + durMs + 'ms ' + ease;
      inWrap.style.clipPath = 'inset(0 0 0 0)';
    } else if (type === 'iris') {
      inWrap.style.opacity = '1';
      inWrap.style.clipPath = 'circle(0% at 50% 50%)';
      inWrap.offsetHeight;
      inWrap.style.transition = 'clip-path ' + durMs + 'ms ' + ease;
      inWrap.style.clipPath = 'circle(150% at 50% 50%)';
    } else if (type === 'bars') {
      inWrap.style.opacity = '0';
      inWrap.style.clipPath = 'polygon(0 0, 100% 0, 100% 0, 0 0)';
      inWrap.offsetHeight;
      inWrap.style.transition = 'opacity ' + Math.round(durMs * 0.7) + 'ms ease, clip-path ' + durMs + 'ms ' + ease;
      inWrap.style.opacity = '1';
      inWrap.style.clipPath = 'polygon(0 0, 100% 0, 100% 100%, 0 100%)';
    }

    state.transitionTimer = setTimeout(function () {
      inWrap.style.transition = '';
      inWrap.style.clipPath = '';
      inWrap.style.opacity = '';
      disposeWrap(outWrap);
    }, durMs + 60);
  }

  function tryUnmuteAfterPlaying(vid) {
    if (!vid || vid !== state.activeVideo) return;
    var cfg = state.cfg;
    var shouldPause = Boolean(cfg.paused || state.autoPaused || cfg.agentBusyPaused);
    var wantUnmuted = !cfg.muted && cfg.volume > 0.005 && !shouldPause;
    vid.volume = clamp(cfg.volume, 0, 1);
    if (!wantUnmuted) {
      vid.muted = true;
      return;
    }
    if (!vid.muted) return;
    try {
      vid.muted = false;
      var up = vid.play();
      if (up && typeof up.catch === 'function') {
        up.catch(function () {
          if (vid !== state.activeVideo) return;
          vid.muted = true;
          vid.play().catch(function () {});
          armGestureUnmute();
        });
      }
    } catch (_) {
      vid.muted = true;
      armGestureUnmute();
    }
  }

  function clearVideoStageListener() {
    if (state.videoStageMessageCleanup) {
      try {
        state.videoStageMessageCleanup();
      } catch (_) {}
      state.videoStageMessageCleanup = null;
    }
  }

  function sendVideoStageControl(extra) {
    var frame = state.activeVideoStageFrame;
    if (!frame || !frame.contentWindow) return;
    var cfg = state.cfg;
    var shouldPause = Boolean(cfg.paused || state.autoPaused || cfg.agentBusyPaused);
    var wantLoop = !(cfg.rotationEnabled && cfg.rotationTrigger === 'videoEnd');
    var fitCss = cfg.fit === 'center' ? 'none' : String(cfg.fit || 'cover');
    var msg = {
      type: 'prism-video-ctl',
      sid: state.activeVideoStageSid,
      paused: shouldPause,
      muted: Boolean(cfg.muted || cfg.volume <= 0.005),
      volume: clamp(cfg.volume, 0, 1),
      playbackRate: cfg.playbackRate,
      loop: wantLoop,
      fit: fitCss,
      pos: cfg.posX + '% ' + cfg.posY + '%',
    };
    if (extra && typeof extra === 'object') {
      for (var k in extra) {
        if (Object.prototype.hasOwnProperty.call(extra, k)) msg[k] = extra[k];
      }
    }
    try {
      frame.contentWindow.postMessage(msg, '*');
    } catch (_) {}
  }

  function syncMediaPlaybackState() {
    var cfg = state.cfg;
    var shouldPause = Boolean(cfg.paused || state.autoPaused || cfg.agentBusyPaused);
    var vid = state.activeVideo;
    if (vid) {
      try {
        if (Math.abs(vid.playbackRate - cfg.playbackRate) > 0.01) vid.playbackRate = cfg.playbackRate;
        var wantLoop = !(cfg.rotationEnabled && cfg.rotationTrigger === 'videoEnd');
        if (vid.loop !== wantLoop) vid.loop = wantLoop;
        vid.volume = clamp(cfg.volume, 0, 1);

        if (vid.__prismFetchingBlob) {
          if (cfg.muted || cfg.volume <= 0.005 || shouldPause) vid.muted = true;
        } else if (shouldPause) {
          if (vid.__prismPriming && vid.readyState < 2) {
            // Allow newly mounted video to decode frame 1 muted before honoring auto-pause (e.g. pauseOnBlur when clicking in sidecar UI)
            vid.muted = true;
            if (vid.paused) vid.play().catch(function () {});
          } else if (!vid.paused) {
            vid.pause();
          }
        } else {
          if (cfg.muted || cfg.volume <= 0.005) {
            vid.muted = true;
          }
          if (vid.paused) {
            // Always start play() muted first so Chromium autoplay policy never blocks!
            var needUnmuteAfter = !cfg.muted && cfg.volume > 0.005;
            if (needUnmuteAfter) vid.muted = true;
            var p = vid.play();
            if (p && typeof p.then === 'function') {
              p.then(
                function () {
                  if (needUnmuteAfter) tryUnmuteAfterPlaying(vid);
                },
                function () {
                  if (vid !== state.activeVideo) return;
                  vid.muted = true;
                  vid.play().catch(function () {});
                  if (needUnmuteAfter) armGestureUnmute();
                }
              );
            }
          } else if (!cfg.muted && cfg.volume > 0.005 && vid.muted) {
            tryUnmuteAfterPlaying(vid);
          }
        }
      } catch (_) {}
    }
    if (state.activeAudio) {
      try {
        state.activeAudio.volume = cfg.muted ? 0 : clamp(cfg.volume, 0, 1);
        state.activeAudio.muted = cfg.muted;
        if (!state.activeAudio.__prismFetchingBlob) {
          if (shouldPause || cfg.muted) state.activeAudio.pause();
          else state.activeAudio.play().catch(function () {});
        }
      } catch (_) {}
    }
    if (state.activeVideoStageFrame) {
      sendVideoStageControl();
    }
    if (state.activeIframe && state.activeIframe.contentWindow) {
      try {
        state.activeIframe.contentWindow.postMessage(
          {
            type: 'we-lifecycle',
            paused: shouldPause,
            muted: cfg.muted,
            volume: cfg.muted ? 0 : cfg.volume,
          },
          '*'
        );
      } catch (_) {}
    }
  }

  function armGestureUnmute() {
    if (state.unmuteGestureCleanup) return;
    var handler = function () {
      if (state.unmuteGestureCleanup) {
        state.unmuteGestureCleanup();
        state.unmuteGestureCleanup = null;
      }
      if (state.activeVideo && !state.cfg.muted && state.cfg.volume > 0) {
        try {
          state.activeVideo.muted = false;
          state.activeVideo.volume = clamp(state.cfg.volume, 0, 1);
          if (!state.cfg.paused && !state.autoPaused) state.activeVideo.play().catch(function () {});
        } catch (_) {}
      }
      if (state.activeVideoStageFrame && !state.cfg.muted && state.cfg.volume > 0) {
        sendVideoStageControl({ unmute: true, muted: false });
      }
    };
    doc.addEventListener('pointerdown', handler, { once: true, capture: true });
    doc.addEventListener('keydown', handler, { once: true, capture: true });
    state.unmuteGestureCleanup = function () {
      doc.removeEventListener('pointerdown', handler, { capture: true });
      doc.removeEventListener('keydown', handler, { capture: true });
    };
  }

  function shouldExtractAccent(item, cfg) {
    if (!cfg || cfg.accentMode !== 'dynamic' || !item) return false;
    var wid = item.id ? String(item.id) : '';
    if (wid && accentCache[wid]) return false;
    if (wid && cfg.extractedAccent && String(cfg.extractedAccent.wallpaperId || '') === wid && cfg.extractedAccent.darkHex) {
      return false;
    }
    return true;
  }

  function mountStageMedia(forceReplace) {
    var stage = ensureStage();
    if (!stage) return;
    var cfg = state.cfg;
    var item = state.item;
    var effKind = resolveEffectiveKind(item, cfg);
    var rawMediaUrl = '';
    if (effKind === 'video') {
      rawMediaUrl = String((item && (item.sceneVideoUrl || item.mediaUrl)) || cfg.sourceUrl || '').trim();
      if (item && item.mediaUrl && !/\/preview\//i.test(item.mediaUrl)) {
        rawMediaUrl = String(item.mediaUrl).trim();
      }
    } else if (effKind === 'web') {
      rawMediaUrl = String((item && (item.webUrl || item.sceneLiveUrl || item.mediaUrl)) || cfg.sourceUrl || '').trim();
      if (item && item.mediaUrl && !/\/preview\//i.test(item.mediaUrl)) {
        rawMediaUrl = String(item.mediaUrl).trim();
      }
    } else {
      rawMediaUrl = String((item && (item.mediaUrl || item.thumbUrl)) || cfg.sourceUrl || '').trim();
    }
    var mediaUrl = rawMediaUrl;
    var videoStageBase = effKind === 'video' ? String((item && item.videoStageUrl) || '').trim() : '';
    var pluginMediaUrl = effKind === 'video' ? String((item && item.pluginMediaUrl) || '').trim() : '';
    var pluginAudioUrl = effKind === 'video' ? String((item && item.pluginAudioUrl) || '').trim() : '';
    var pluginVideoStageUrl = effKind === 'video' ? String((item && item.pluginVideoStageUrl) || '').trim() : '';
    var mseFmp4Url = effKind === 'video' ? String((item && item.mseFmp4Url) || '').trim() : '';
    var audioUrl = String((item && item.audioUrl) || '').trim();
    var mediaKey =
      effKind +
      '|' +
      mediaUrl +
      '|' +
      videoStageBase +
      '|' +
      audioUrl +
      '|' +
      pluginMediaUrl +
      '|' +
      mseFmp4Url +
      '|' +
      (state.slides ? state.slides.length : 0);

    var hasActive = Boolean(state.activeWrap && state.activeWrap.isConnected && state.wallpaperReady);
    var hasLivePending = Boolean(state.pendingWrap && state.pendingWrap.isConnected && state.pendingMediaTimer);
    if (!forceReplace && mediaKey === state.activeMediaKey && (hasActive || hasLivePending)) {
      if (hasActive && !state.transitionTimer && state.activeWrap.style.opacity === '0') {
        state.activeWrap.style.opacity = '';
        state.activeWrap.style.transition = '';
      }
      syncMediaPlaybackState();
      return;
    }
    if (mediaKey !== state.failedMediaKey) {
      state.failedMediaKey = mediaKey;
      state.failedMediaRetries = 0;
    }
    state.activeMediaKey = mediaKey;
    var mountSeq = ++state.mediaMountSeq;
    clearInterval(state.slideTimer);
    state.slideTimer = 0;
    clearTimeout(state.pendingMediaTimer);
    state.pendingMediaTimer = 0;
    if (state.pendingWrap) {
      disposeWrap(state.pendingWrap);
      state.pendingWrap = null;
    }

    var prevWrap = state.activeWrap;
    var validPrevWrap = Boolean(prevWrap && prevWrap.isConnected && state.wallpaperReady);
    if (!validPrevWrap) {
      setWallpaperReady(false);
    }
    state.activeVideo = null;
    state.activeAudio = null;
    state.activeIframe = null;
    clearVideoStageListener();
    state.activeVideoStageFrame = null;
    state.activeVideoStageSid = '';
    state.activeVideoStageReady = false;
    state.activeVideoStageUrl = '';

    var nextWrap = doc.createElement('div');
    nextWrap.className = 'agy-prism-media-wrap';
    var scrimNode = stage.querySelector('.agy-prism-scrim');

    var commitMount = function () {
      if (destroyed || mountSeq !== state.mediaMountSeq) {
        disposeWrap(nextWrap);
        return;
      }
      if (nextWrap.parentNode !== stage) {
        stage.insertBefore(nextWrap, scrimNode || null);
      }
      state.pendingWrap = null;
      state.activeWrap = nextWrap;
      var validPrev = prevWrap && prevWrap.isConnected && prevWrap !== nextWrap ? prevWrap : null;
      applyTransitionAnimation(
        nextWrap,
        validPrev,
        validPrev ? cfg.switchTransition : 'cut',
        cfg.switchTransitionDir,
        transitionDurationMs(cfg.switchTransitionSpeed)
      );
      setWallpaperReady(true);
      syncMediaPlaybackState();
    };

    var failMount = function () {
      if (destroyed || mountSeq !== state.mediaMountSeq) {
        disposeWrap(nextWrap);
        return;
      }
      clearTimeout(state.pendingMediaTimer);
      state.pendingMediaTimer = 0;
      state.pendingWrap = null;
      if (state.activeVideo && nextWrap.contains(state.activeVideo)) state.activeVideo = null;
      if (state.activeAudio && nextWrap.contains(state.activeAudio)) state.activeAudio = null;
      if (state.activeIframe && nextWrap.contains(state.activeIframe)) state.activeIframe = null;
      if (state.activeVideoStageFrame && nextWrap.contains(state.activeVideoStageFrame)) {
        clearVideoStageListener();
        state.activeVideoStageFrame = null;
        state.activeVideoStageSid = '';
        state.activeVideoStageReady = false;
        state.activeVideoStageUrl = '';
      }
      disposeWrap(nextWrap);
      flushOutgoingWraps();
      if (prevWrap) disposeWrap(prevWrap);
      state.activeWrap = null;
      state.activeMediaKey = '';
      setWallpaperReady(false);
    };

    if (effKind === 'none') {
      failMount();
      return;
    }

    if (effKind === 'aurora') {
      var aurora = doc.createElement('div');
      aurora.className = 'agy-prism-media-el';
      var baseCol = (item && item.schemeColor) || '#1e293b';
      aurora.style.background =
        'radial-gradient(ellipse 80% 70% at 22% 24%, ' +
        baseCol +
        ' 0%, transparent 65%), radial-gradient(ellipse 75% 75% at 80% 78%, rgba(102, 157, 246, 0.32) 0%, #09090b 100%)';
      nextWrap.appendChild(aurora);
      commitMount();
      return;
    }

    if (!mediaUrl && effKind !== 'slideshow') {
      failMount();
      return;
    }

    if (effKind === 'image') {
      var img = doc.createElement('img');
      img.className = 'agy-prism-media-el';
      img.crossOrigin = 'anonymous';
      img.decoding = 'async';
      img.alt = '';
      var settledImg = false;
      var onImgDecoded = function () {
        if (settledImg) return;
        settledImg = true;
        clearTimeout(state.pendingMediaTimer);
        state.pendingMediaTimer = 0;
        if (destroyed || mountSeq !== state.mediaMountSeq) {
          disposeWrap(nextWrap);
          return;
        }
        if (!(img.naturalWidth > 0)) {
          failMount();
          return;
        }
        commitMount();
        if (shouldExtractAccent(item, state.cfg)) {
          extractAccent(img, item && item.id).then(function (acc) {
            if (acc && !destroyed) {
              state.cfg.extractedAccent = acc;
              refreshSkinStyles();
            }
          });
        }
      };
      var onImgFailed = function () {
        if (settledImg) return;
        settledImg = true;
        failMount();
      };
      var imgWaitTicks = 0;
      var armImgGuard = function (delayMs) {
        clearTimeout(state.pendingMediaTimer);
        state.pendingMediaTimer = setTimeout(function () {
          state.pendingMediaTimer = 0;
          if (settledImg) return;
          if (img.complete && img.naturalWidth > 0) {
            onImgDecoded();
          } else if ((doc.hidden && !img.complete) || (img.__prismFetchingBlob && imgWaitTicks < 8)) {
            imgWaitTicks += 1;
            armImgGuard(3000);
          } else {
            onImgFailed();
          }
        }, delayMs);
      };
      state.pendingWrap = nextWrap;
      armImgGuard(6000);
      var handleImgLoaded = function () {
        var dec = typeof img.decode === 'function' ? img.decode() : null;
        if (dec && typeof dec.then === 'function') {
          dec.then(onImgDecoded, onImgDecoded);
        } else {
          onImgDecoded();
        }
      };
      img.onload = handleImgLoaded;
      if (typeof img.addEventListener === 'function') {
        img.addEventListener('load', handleImgLoaded);
      }
      nextWrap.appendChild(img);
      attachLoopbackImageSrc(img, mediaUrl, nextWrap, onImgFailed);
      return;
    }

    if (effKind === 'slideshow') {
      var list = state.slides && state.slides.length ? state.slides : [mediaUrl];
      var firstSlide = String((list && list[0]) || '').trim();
      if (!firstSlide) {
        failMount();
        return;
      }
      state.slideIdx = 0;
      var imgA = doc.createElement('img');
      var imgB = doc.createElement('img');
      imgA.className = 'agy-prism-media-el';
      imgB.className = 'agy-prism-media-el';
      imgA.crossOrigin = 'anonymous';
      imgB.crossOrigin = 'anonymous';
      imgA.style.transition = 'opacity 680ms ease';
      imgB.style.transition = 'opacity 680ms ease';
      imgB.style.opacity = '0';
      nextWrap.appendChild(imgA);
      nextWrap.appendChild(imgB);

      var settledSlide = false;
      var startSlideLoop = function () {
        var frontIsA = true;
        var intervalSec = cfg.pictureSlideSeconds > 0 ? cfg.pictureSlideSeconds : 30;
        if (list.length > 1) {
          state.slideTimer = setInterval(function () {
            if (state.cfg.paused || state.autoPaused) return;
            state.slideIdx = (state.slideIdx + 1) % list.length;
            var incoming = frontIsA ? imgB : imgA;
            var outgoing = frontIsA ? imgA : imgB;
            incoming.onload = function () {
              if (!(incoming.naturalWidth > 0)) return;
              incoming.style.opacity = String(state.cfg.mediaOpacity);
              outgoing.style.opacity = '0';
              frontIsA = !frontIsA;
            };
            attachLoopbackImageSrc(incoming, list[state.slideIdx], nextWrap, function () {});
          }, Math.max(5, intervalSec) * 1000);
        }
      };
      var onSlideDecoded = function () {
        if (settledSlide) return;
        settledSlide = true;
        clearTimeout(state.pendingMediaTimer);
        state.pendingMediaTimer = 0;
        if (destroyed || mountSeq !== state.mediaMountSeq) {
          disposeWrap(nextWrap);
          return;
        }
        if (!(imgA.naturalWidth > 0)) {
          failMount();
          return;
        }
        commitMount();
        startSlideLoop();
        if (shouldExtractAccent(item, state.cfg)) {
          extractAccent(imgA, item && item.id).then(function (acc) {
            if (acc && !destroyed) {
              state.cfg.extractedAccent = acc;
              refreshSkinStyles();
            }
          });
        }
      };
      var onSlideFailed = function () {
        if (settledSlide) return;
        settledSlide = true;
        failMount();
      };
      var slideWaitTicks = 0;
      var armSlideGuard = function (delayMs) {
        clearTimeout(state.pendingMediaTimer);
        state.pendingMediaTimer = setTimeout(function () {
          state.pendingMediaTimer = 0;
          if (settledSlide) return;
          if (imgA.__prismFetchingBlob && slideWaitTicks < 8) {
            slideWaitTicks += 1;
            armSlideGuard(3000);
          } else {
            onSlideFailed();
          }
        }, delayMs);
      };
      state.pendingWrap = nextWrap;
      armSlideGuard(6000);
      var handleSlideLoaded = function () {
        var dec = typeof imgA.decode === 'function' ? imgA.decode() : null;
        if (dec && typeof dec.then === 'function') {
          dec.then(onSlideDecoded, onSlideDecoded);
        } else {
          onSlideDecoded();
        }
      };
      imgA.onload = handleSlideLoaded;
      if (typeof imgA.addEventListener === 'function') {
        imgA.addEventListener('load', handleSlideLoaded);
      }
      attachLoopbackImageSrc(imgA, firstSlide, nextWrap, onSlideFailed);
      return;
    }

    if (effKind === 'video') {
      var pluginFallbackUsed = false;
      var mountDirectVideo = function (directOpts) {
        if (destroyed || mountSeq !== state.mediaMountSeq) {
          disposeWrap(nextWrap);
          return;
        }
        var dOpts = directOpts && typeof directOpts === 'object' ? directOpts : null;
        var effectiveMediaUrl = (dOpts && dOpts.directMediaUrl) || mediaUrl;
        var effectiveAudioUrl = dOpts && dOpts.directAudioUrl !== undefined ? dOpts.directAudioUrl : audioUrl;
        var allowPluginErrorFallback = Boolean(dOpts && dOpts.allowPluginErrorFallback);

        var video = doc.createElement('video');
        video.className = 'agy-prism-media-el';
        // Always start muted & connected in DOM BEFORE setting video.src so Chromium autoplay never blocks (#31/#32).
        video.defaultMuted = true;
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        video.preload = 'auto';
        video.loop = !(cfg.rotationEnabled && cfg.rotationTrigger === 'videoEnd');
        video.playbackRate = cfg.playbackRate;
        video.setAttribute('muted', '');
        video.setAttribute('playsinline', '');
        video.setAttribute('autoplay', '');
        video.setAttribute('disablepictureinpicture', '');
        if (item) {
          if (item.thumbUrl && !isCrossSchemeLoopbackUrl(item.thumbUrl)) {
            video.poster = String(item.thumbUrl);
          } else if (item.pluginThumbUrl && /^plugin:\/\//i.test(String(item.pluginThumbUrl))) {
            video.poster = String(item.pluginThumbUrl);
          }
        }
        video.__prismPriming = true;
        video.__prismEffectiveEnd = 0;
        video.__prismMseActive = false;
        video.__prismMseLoading = false;
        video.__prismMseEvicted = false;
        state.lastVidCheckTime = -1;
        state.lastVidCheckFrames = -1;
        state.lastVidCheckAt = 0;
        state.vidStallCount = 0;

        var wrapLoopOrAdvance = function () {
          if (state.cfg.rotationEnabled && state.cfg.rotationTrigger === 'videoEnd') {
            callHostRpc('playlist.step', { direction: 1, reason: 'videoEnd' });
          } else if (video.__prismMseActive && video.__prismMseEvicted) {
            mountStageMedia(true);
          } else {
            try {
              video.currentTime = 0;
              if (!state.cfg.paused && !state.autoPaused && !state.cfg.agentBusyPaused) {
                video.play().catch(function () {});
              }
            } catch (_) {}
          }
        };

        video.addEventListener('ended', wrapLoopOrAdvance);
        video.addEventListener('timeupdate', function () {
          if (
            video === state.activeVideo &&
            video.__prismEffectiveEnd > 0 &&
            !video.seeking &&
            video.currentTime >= video.__prismEffectiveEnd
          ) {
            wrapLoopOrAdvance();
          }
        });

        // Keep an active requestVideoFrameCallback consumer registered while visible so Chromium's
        // VideoFrameSubmitter never suspends a muted background <video> as "occluded" in fullscreen.
        var armRvfcKeepAlive = function () {
          if (typeof video.requestVideoFrameCallback !== 'function') return;
          if (video.__prismRvfcActive) return;
          video.__prismRvfcActive = true;
          var onFrame = function () {
            if (destroyed || state.activeVideo !== video) {
              video.__prismRvfcActive = false;
              return;
            }
            state.rvfcCount += 1;
            if (!doc.hidden && !state.cfg.paused && !state.autoPaused) {
              try {
                video.requestVideoFrameCallback(onFrame);
                return;
              } catch (_) {}
            }
            video.__prismRvfcActive = false;
          };
          try {
            video.requestVideoFrameCallback(onFrame);
          } catch (_) {
            video.__prismRvfcActive = false;
          }
        };
        video.__prismArmRvfc = armRvfcKeepAlive;

        if (effectiveAudioUrl) {
          var aud = doc.createElement('audio');
          aud.loop = true;
          aud.preload = 'auto';
          nextWrap.appendChild(aud);
          state.activeAudio = aud;
          attachLoopbackMediaSrc(aud, effectiveAudioUrl, {
            wrap: nextWrap,
            isStale: function () {
              return mountSeq !== state.mediaMountSeq || state.activeAudio !== aud;
            },
            onReady: syncMediaPlaybackState,
          });
        }

        nextWrap.appendChild(video);
        state.activeVideo = video;

        // Freeze outgoing 4K60 decoder immediately so incoming video decodes frame 1 without GPU contention.
        if (prevWrap) pauseWrapMedia(prevWrap);

        var needsCrossfade = Boolean(validPrevWrap && cfg.switchTransition !== 'cut' && !doc.hidden);
        nextWrap.style.opacity = needsCrossfade ? '0' : '0.001';
        state.pendingWrap = nextWrap;
        if (nextWrap.parentNode !== stage) {
          stage.insertBefore(nextWrap, scrimNode || null);
        }

        var finishPriming = function () {
          if (!video.__prismPriming) return;
          video.__prismPriming = false;
          if (!destroyed && state.activeVideo === video) {
            syncMediaPlaybackState();
          }
        };
        var ensureVidPlaying = function () {
          if (!destroyed && state.activeVideo === video && video.paused) {
            syncMediaPlaybackState();
          }
        };

        var settledVid = false;
        var posterFallbackStarted = false;
        var onVideoDecoded = function () {
          if (settledVid) return;
          if (destroyed || mountSeq !== state.mediaMountSeq || state.activeVideo !== video) {
            settledVid = true;
            disposeWrap(nextWrap);
            return;
          }
          if (video.readyState < 2 || !(video.videoWidth > 0)) return;
          settledVid = true;
          clearTimeout(state.pendingMediaTimer);
          state.pendingMediaTimer = 0;
          if (!needsCrossfade) nextWrap.style.opacity = '';
          finishPriming();
          commitMount();
          armRvfcKeepAlive();
          if (shouldExtractAccent(item, state.cfg) && item && item.thumbUrl) {
            extractAccent(item.thumbUrl, item.id).then(function (acc) {
              if (acc && !destroyed) {
                state.cfg.extractedAccent = acc;
                refreshSkinStyles();
              }
            });
          }
        };
        var onVideoFailed = function () {
          if (settledVid) return;
          settledVid = true;
          video.__prismPriming = false;
          video.__prismMseLoading = false;
          failMount();
        };

        var fallbackToPoster = function () {
          if (posterFallbackStarted || settledVid || destroyed || mountSeq !== state.mediaMountSeq) return;
          if (!(item && item.thumbUrl)) {
            onVideoFailed();
            return;
          }
          posterFallbackStarted = true;
          settledVid = true;
          video.__prismPriming = false;
          video.__prismMseLoading = false;
          video.__prismMseActive = false;
          clearTimeout(state.pendingMediaTimer);
          state.pendingMediaTimer = 0;
          if (state.activeVideo === video) state.activeVideo = null;
          try {
            video.pause();
            video.removeAttribute('src');
            video.load();
          } catch (_) {}
          if (video.__prismBlobUrl) {
            try {
              if (typeof W.URL !== 'undefined' && typeof W.URL.revokeObjectURL === 'function') {
                W.URL.revokeObjectURL(video.__prismBlobUrl);
              }
            } catch (_) {}
            video.__prismBlobUrl = '';
          }
          if (video.parentNode) video.parentNode.removeChild(video);

          var posterImg = doc.createElement('img');
          posterImg.className = 'agy-prism-media-el';
          posterImg.crossOrigin = 'anonymous';
          posterImg.alt = '';
          posterImg.decoding = 'async';
          nextWrap.appendChild(posterImg);

          var settledPoster = false;
          var onPosterDecoded = function () {
            if (settledPoster) return;
            settledPoster = true;
            clearTimeout(state.pendingMediaTimer);
            state.pendingMediaTimer = 0;
            if (destroyed || mountSeq !== state.mediaMountSeq) {
              disposeWrap(nextWrap);
              return;
            }
            if (typeof posterImg.naturalWidth === 'number' && !(posterImg.naturalWidth > 0)) {
              failMount();
              return;
            }
            if (!needsCrossfade) nextWrap.style.opacity = '';
            commitMount();
            if (shouldExtractAccent(item, state.cfg)) {
              extractAccent(posterImg, item.id).then(function (acc) {
                if (acc && !destroyed) {
                  state.cfg.extractedAccent = acc;
                  refreshSkinStyles();
                }
              });
            }
          };
          var onPosterFailed = function () {
            if (settledPoster) return;
            settledPoster = true;
            failMount();
          };
          var handlePosterLoad = function () {
            var dec = typeof posterImg.decode === 'function' ? posterImg.decode() : null;
            if (dec && typeof dec.then === 'function') {
              dec.then(onPosterDecoded, onPosterDecoded);
            } else {
              onPosterDecoded();
            }
          };
          posterImg.onload = handlePosterLoad;
          if (typeof posterImg.addEventListener === 'function') {
            posterImg.addEventListener('load', handlePosterLoad);
          }
          var posterWaitTicks = 0;
          var armPosterGuard = function (delayMs) {
            clearTimeout(state.pendingMediaTimer);
            state.pendingMediaTimer = setTimeout(function () {
              state.pendingMediaTimer = 0;
              if (settledPoster) return;
              if (posterImg.__prismFetchingBlob && posterWaitTicks < 8) {
                posterWaitTicks += 1;
                armPosterGuard(3000);
              } else {
                onPosterFailed();
              }
            }, delayMs);
          };
          armPosterGuard(6000);
          attachLoopbackImageSrc(posterImg, String(item.thumbUrl), nextWrap, onPosterFailed);
        };

        var onVideoError = function () {
          if (settledVid || destroyed || mountSeq !== state.mediaMountSeq) return;
          if (allowPluginErrorFallback && !pluginFallbackUsed) {
            pluginFallbackUsed = true;
            settledVid = true;
            video.__prismPriming = false;
            clearTimeout(state.pendingMediaTimer);
            state.pendingMediaTimer = 0;
            if (state.activeVideo === video) state.activeVideo = null;
            try {
              video.pause();
              video.removeAttribute('src');
              video.load();
            } catch (_) {}
            if (video.parentNode) video.parentNode.removeChild(video);
            if (state.activeAudio && nextWrap.contains(state.activeAudio)) {
              try {
                state.activeAudio.pause();
                state.activeAudio.removeAttribute('src');
                state.activeAudio.load();
              } catch (_) {}
              if (state.activeAudio.parentNode) state.activeAudio.parentNode.removeChild(state.activeAudio);
              state.activeAudio = null;
            }
            mountDirectVideo();
            return;
          }
          if (video.__prismMseActive && item && item.thumbUrl) {
            fallbackToPoster();
            return;
          }
          onVideoFailed();
        };

        video.addEventListener('loadedmetadata', ensureVidPlaying, { once: true });
        video.addEventListener('loadeddata', onVideoDecoded);
        video.addEventListener('canplay', function () {
          ensureVidPlaying();
          onVideoDecoded();
        });
        video.addEventListener('playing', function () {
          onVideoDecoded();
          armRvfcKeepAlive();
        });
        video.addEventListener('stalled', function () {
          scheduleWakeVideoCheck(350);
        });
        video.addEventListener('waiting', function () {
          scheduleWakeVideoCheck(450);
        });
        video.addEventListener('timeupdate', onVideoDecoded);
        video.addEventListener('error', onVideoError, { once: true });
        if (typeof video.requestVideoFrameCallback === 'function') {
          try {
            video.requestVideoFrameCallback(function () {
              onVideoDecoded();
            });
          } catch (_) {}
        }

        var pendingVidChecks = 0;
        var blobWaitTicks = 0;
        var armPendingVideoGuard = function (delayMs) {
          clearTimeout(state.pendingMediaTimer);
          state.pendingMediaTimer = setTimeout(function () {
            state.pendingMediaTimer = 0;
            if (settledVid || destroyed || mountSeq !== state.mediaMountSeq || state.activeVideo !== video) return;
            if (video.readyState >= 2 && video.videoWidth > 0) {
              onVideoDecoded();
              return;
            }
            if (video.__prismFetchingBlob || video.__prismMseLoading) {
              if (blobWaitTicks < 16) {
                blobWaitTicks += 1;
                armPendingVideoGuard(1500);
                return;
              }
              if (video.__prismMseActive) {
                fallbackToPoster();
              } else {
                onVideoFailed();
              }
              return;
            }
            // Broken URL / 404 / unsupported codec -> fail-open immediately!
            if (video.error || video.networkState === 3) {
              onVideoError();
              return;
            }
            // Window minimized (`doc.hidden`) or DWM-occluded behind another window (`readyState >= 1`,
            // `videoWidth > 0`, `error === null`): Chromium defers decoding Frame 1 until un-occluded.
            // Keep `<video>` alive instead of destroying it, nudge `play()`, and re-check on wake!
            pendingVidChecks += 1;
            if (doc.hidden || (video.readyState >= 1 && video.videoWidth > 0) || pendingVidChecks <= 3) {
              if (!doc.hidden) {
                try {
                  video.muted = true;
                  video.play().catch(function () {});
                } catch (_) {}
              }
              armPendingVideoGuard(2500);
              return;
            }
            onVideoFailed();
          }, delayMs);
        };
        armPendingVideoGuard(6000);

        var isStaleVid = function () {
          return mountSeq !== state.mediaMountSeq || state.activeVideo !== video;
        };

        attachLoopbackMediaSrc(video, effectiveMediaUrl, {
          wrap: nextWrap,
          isStale: isStaleVid,
          onReady: syncMediaPlaybackState,
          onError: function (err) {
            if (err && err.code === 'BLOB_CAP_EXCEEDED') {
              if (mseFmp4Url && typeof W.MediaSource === 'function') {
                mountMseStreamVideo(video, mseFmp4Url, nextWrap, isStaleVid, onVideoDecoded, fallbackToPoster);
                return;
              }
              if (item && item.thumbUrl) {
                fallbackToPoster();
                return;
              }
            }
            onVideoFailed();
          },
        });
        syncMediaPlaybackState();
        if (video.readyState >= 2 && video.videoWidth > 0) {
          onVideoDecoded();
        }
      };

      if (!isCrossSchemeLoopbackUrl(mediaUrl)) {
        mountDirectVideo();
        return;
      }

      var continueAfterPluginProbe = function (pluginProbeFailed) {
        if (destroyed || mountSeq !== state.mediaMountSeq) {
          disposeWrap(nextWrap);
          return;
        }
        var stageCandidate =
          !pluginProbeFailed && pluginVideoStageUrl && /^plugin:\/\//i.test(pluginVideoStageUrl)
            ? pluginVideoStageUrl
            : videoStageBase;
        var stageIsSecurePlugin = Boolean(stageCandidate && /^plugin:\/\//i.test(stageCandidate));
        var stageIsSandboxHttp = Boolean(
          stageCandidate && isCrossSchemeLoopbackUrl(stageCandidate) && typeof W.MediaSource === 'undefined'
        );
        var useVideoStageIframe = Boolean(
          stageCandidate && (stageIsSecurePlugin || stageIsSandboxHttp) && typeof W.addEventListener === 'function'
        );

        if (useVideoStageIframe) {
          var stageSid = 'vs-' + mountSeq + '-' + Date.now();
          var stageUrl = stageCandidate + (stageCandidate.indexOf('?') >= 0 ? '&' : '?') + 'sid=' + encodeURIComponent(stageSid);
          var vframe = doc.createElement('iframe');
          vframe.className = 'agy-prism-media-el';
          vframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
          vframe.setAttribute('allow', 'autoplay');
          vframe.setAttribute('frameborder', '0');
          vframe.setAttribute('scrolling', 'no');
          vframe.setAttribute('tabindex', '-1');
          vframe.setAttribute('data-prism-video-stage', '1');
          vframe.style.pointerEvents = 'none';
          vframe.style.background = 'transparent';

          if (prevWrap) pauseWrapMedia(prevWrap);

          var needsStageCrossfade = Boolean(validPrevWrap && cfg.switchTransition !== 'cut' && !doc.hidden);
          nextWrap.style.opacity = needsStageCrossfade ? '0' : '0.001';
          nextWrap.appendChild(vframe);
          state.activeVideoStageFrame = vframe;
          state.activeVideoStageSid = stageSid;
          state.activeVideoStageReady = false;
          state.activeVideoStageUrl = stageUrl;
          state.pendingWrap = nextWrap;

          var settledStage = false;
          var fellBackToDirectVideo = false;
          var onStageReady = function () {
            if (settledStage || fellBackToDirectVideo) return;
            if (destroyed || mountSeq !== state.mediaMountSeq || state.activeVideoStageFrame !== vframe) {
              settledStage = true;
              disposeWrap(nextWrap);
              return;
            }
            settledStage = true;
            state.activeVideoStageReady = true;
            clearTimeout(state.pendingMediaTimer);
            state.pendingMediaTimer = 0;
            if (!needsStageCrossfade) nextWrap.style.opacity = '';
            commitMount();
            sendVideoStageControl();
            if (!state.cfg.muted && state.cfg.volume > 0.005) armGestureUnmute();
            if (shouldExtractAccent(item, state.cfg) && item && item.thumbUrl) {
              extractAccent(item.thumbUrl, item.id).then(function (acc) {
                if (acc && !destroyed) {
                  state.cfg.extractedAccent = acc;
                  refreshSkinStyles();
                }
              });
            }
          };
          var fallbackToDirectVideo = function () {
            if (fellBackToDirectVideo) return;
            fellBackToDirectVideo = true;
            settledStage = true;
            clearTimeout(state.pendingMediaTimer);
            state.pendingMediaTimer = 0;
            clearVideoStageListener();
            if (state.activeVideoStageFrame === vframe) {
              state.activeVideoStageFrame = null;
              state.activeVideoStageSid = '';
              state.activeVideoStageReady = false;
              state.activeVideoStageUrl = '';
            }
            try {
              vframe.src = 'about:blank';
            } catch (_) {}
            if (vframe.parentNode) {
              try {
                vframe.parentNode.removeChild(vframe);
              } catch (_) {}
            }
            if (destroyed || mountSeq !== state.mediaMountSeq) {
              disposeWrap(nextWrap);
              return;
            }
            if (state.activeWrap === nextWrap) {
              prevWrap = null;
              validPrevWrap = false;
            }
            mountDirectVideo();
          };

          var onStageMessage = function (ev) {
            var m = ev && ev.data;
            if (!m || typeof m !== 'object' || m.type !== 'prism-video-stage') return;
            if (m.sid !== stageSid) return;
            if (ev.source && vframe.contentWindow && ev.source !== vframe.contentWindow) return;
            if (destroyed || mountSeq !== state.mediaMountSeq || state.activeVideoStageFrame !== vframe) return;
            if (m.event === 'ready') {
              onStageReady();
            } else if (m.event === 'ended') {
              if (state.cfg.rotationEnabled && state.cfg.rotationTrigger === 'videoEnd') {
                callHostRpc('playlist.step', { direction: 1, reason: 'videoEnd' });
              }
            } else if (m.event === 'error') {
              fallbackToDirectVideo();
            }
          };
          W.addEventListener('message', onStageMessage);
          state.videoStageMessageCleanup = function () {
            W.removeEventListener('message', onStageMessage);
          };

          vframe.addEventListener('load', function () {
            if (!destroyed && state.activeVideoStageFrame === vframe) {
              sendVideoStageControl();
            }
          });
          vframe.addEventListener('error', fallbackToDirectVideo, { once: true });

          var pendingStageChecks = 0;
          var armPendingStageGuard = function (delayMs) {
            clearTimeout(state.pendingMediaTimer);
            state.pendingMediaTimer = setTimeout(function () {
              state.pendingMediaTimer = 0;
              if (settledStage || fellBackToDirectVideo || destroyed || mountSeq !== state.mediaMountSeq || state.activeVideoStageFrame !== vframe) return;
              pendingStageChecks += 1;
              if (doc.hidden || pendingStageChecks <= 1) {
                sendVideoStageControl();
                armPendingStageGuard(2500);
                return;
              }
              fallbackToDirectVideo();
            }, delayMs);
          };
          armPendingStageGuard(2500);

          if (nextWrap.parentNode !== stage) {
            stage.insertBefore(nextWrap, scrimNode || null);
          }
          vframe.src = stageUrl;
          return;
        }

        mountDirectVideo();
      };

      // Priority 1: Electron `plugin://` secure 206 streaming proxy (zero-copy for 971 MB / 4 GB videos!)
      if (pluginMediaUrl && /^plugin:\/\//i.test(pluginMediaUrl) && typeof W.fetch === 'function') {
        var headAc = typeof W.AbortController === 'function' ? new W.AbortController() : null;
        if (headAc) {
          if (!nextWrap.__prismAbortControllers) nextWrap.__prismAbortControllers = [];
          nextWrap.__prismAbortControllers.push(headAc);
        }
        var probeSettled = false;
        state.pendingWrap = nextWrap;
        var headTimer = setTimeout(function () {
          try {
            if (headAc) headAc.abort();
          } catch (_) {}
          if (!probeSettled) {
            probeSettled = true;
            state.pendingMediaTimer = 0;
            continueAfterPluginProbe(true);
          }
        }, 800);
        state.pendingMediaTimer = headTimer;

        W.fetch(pluginMediaUrl, headAc ? { method: 'HEAD', signal: headAc.signal } : { method: 'HEAD' })
          .then(function (res) {
            if (probeSettled) return;
            probeSettled = true;
            clearTimeout(headTimer);
            if (state.pendingMediaTimer === headTimer) state.pendingMediaTimer = 0;
            if (destroyed || mountSeq !== state.mediaMountSeq) {
              disposeWrap(nextWrap);
              return;
            }
            if (res && res.ok) {
              mountDirectVideo({
                directMediaUrl: pluginMediaUrl,
                directAudioUrl: pluginAudioUrl && /^plugin:\/\//i.test(pluginAudioUrl) ? pluginAudioUrl : audioUrl,
                allowPluginErrorFallback: true,
              });
              return;
            }
            continueAfterPluginProbe(true);
          })
          .catch(function () {
            if (probeSettled) return;
            probeSettled = true;
            clearTimeout(headTimer);
            if (state.pendingMediaTimer === headTimer) state.pendingMediaTimer = 0;
            if (destroyed || mountSeq !== state.mediaMountSeq) {
              disposeWrap(nextWrap);
              return;
            }
            continueAfterPluginProbe(true);
          });
        return;
      }

      continueAfterPluginProbe(false);
      return;
    }

    if (effKind === 'web') {
      var iframe = doc.createElement('iframe');
      iframe.className = 'agy-prism-media-el';
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
      iframe.setAttribute('allow', 'autoplay');
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('scrolling', 'no');
      iframe.setAttribute('tabindex', '-1');
      var needsWebCrossfade = Boolean(validPrevWrap && cfg.switchTransition !== 'cut' && !doc.hidden);
      nextWrap.style.opacity = needsWebCrossfade ? '0' : '0.001';
      nextWrap.appendChild(iframe);
      state.activeIframe = iframe;
      state.pendingWrap = nextWrap;

      var settledWeb = false;
      var onWebLoaded = function () {
        if (settledWeb) return;
        settledWeb = true;
        clearTimeout(state.pendingMediaTimer);
        state.pendingMediaTimer = 0;
        if (destroyed || mountSeq !== state.mediaMountSeq || state.activeIframe !== iframe) {
          disposeWrap(nextWrap);
          return;
        }
        if (!needsWebCrossfade) nextWrap.style.opacity = '';
        commitMount();
        if (shouldExtractAccent(item, state.cfg) && item && item.thumbUrl) {
          extractAccent(item.thumbUrl, item.id).then(function (acc) {
            if (acc && !destroyed) {
              state.cfg.extractedAccent = acc;
              refreshSkinStyles();
            }
          });
        }
      };
      var onWebFailed = function () {
        if (settledWeb) return;
        settledWeb = true;
        failMount();
      };

      iframe.addEventListener('load', onWebLoaded, { once: true });
      iframe.addEventListener('error', onWebFailed, { once: true });
      state.pendingMediaTimer = setTimeout(onWebFailed, 6000);
      stage.insertBefore(nextWrap, scrimNode || null);
      iframe.src = mediaUrl;
    }
  }

  // ---------------------------------------------------------------------------
  // Host Focus Handback Guard (Blocks Web Wallpaper Iframe Focus Theft!)
  // ---------------------------------------------------------------------------
  function setupFocusHandbackGuard() {
    listen(
      doc,
      'focusin',
      function (e) {
        var t = e && e.target;
        if (
          t &&
          t !== doc.body &&
          (!state.activeIframe || t !== state.activeIframe) &&
          (!state.activeVideoStageFrame || t !== state.activeVideoStageFrame)
        ) {
          state.lastHostFocus = t;
        }
      },
      true
    );
    listen(W, 'blur', function () {
      var bgFrame = state.activeIframe || state.activeVideoStageFrame;
      if (!bgFrame) return;
      setTimeout(function () {
        if (doc.activeElement === state.activeIframe || doc.activeElement === state.activeVideoStageFrame) {
          try {
            if (state.lastHostFocus && state.lastHostFocus.isConnected && typeof state.lastHostFocus.focus === 'function') {
              state.lastHostFocus.focus({ preventScroll: true });
            } else {
              W.focus();
            }
          } catch (_) {}
        }
      }, 0);
    });
  }

  // ---------------------------------------------------------------------------
  // Smart Auto-Pause Lifecycle (Hidden 1200ms Debounce / Maximized-Safe Fullscreen / Battery)
  // ---------------------------------------------------------------------------
  function isGenuineFullscreenOcclusion() {
    var fsEl = doc.fullscreenElement;
    if (!fsEl) return false;
    if (fsEl === doc.documentElement || fsEl === doc.body) return false;
    if (fsEl.id === 'root' || fsEl.id === STAGE_ID) return false;
    if (fsEl.classList && (fsEl.classList.contains('agy-shell') || fsEl.classList.contains('monaco-workbench'))) {
      return false;
    }
    return true;
  }

  function isHostWindowFocused() {
    if (doc.hidden) return false;
    if (typeof doc.hasFocus === 'function' && doc.hasFocus()) return true;
    // Focus inside an embedded Sidecar OOPIF <iframe>/<webview> or Built-in Browser WCV hole
    // still means the Antigravity host window itself is focused!
    var ae = doc.activeElement;
    if (ae && ae.tagName && /^(IFRAME|WEBVIEW)$/i.test(ae.tagName)) return true;
    if (doc.documentElement && doc.documentElement.getAttribute('data-has-browser-hole') === 'true') return true;
    return false;
  }

  function scheduleWakeVideoCheck(delayMs) {
    clearTimeout(state.wakeNudgeTimer);
    state.wakeNudgeTimer = setTimeout(function () {
      state.wakeNudgeTimer = 0;
      checkVideoLiveness(true);
    }, Math.max(40, Number(delayMs) || 180));
  }

  // Self-heals Chromium muted-video track-reenable deadlocks (`paused: false, readyState: 2, dt: 0`
  // when video trak ends slightly before container mvhd duration, e.g. 11.596s / 12.033s) and
  // fullscreen D3D11 swapchain decoder freezes.
  function checkVideoLiveness(isWake) {
    if (destroyed || !state.skinEnabled || doc.hidden) {
      state.vidStallCount = 0;
      state.lastVidCheckTime = -1;
      state.lastVidCheckAt = 0;
      return;
    }
    var vid = state.activeVideo;
    if (!vid || !vid.isConnected || vid.__prismPriming) {
      state.vidStallCount = 0;
      if (isWake && !doc.hidden) {
        if (state.activeVideoStageFrame && state.activeVideoStageFrame.isConnected) {
          sendVideoStageControl();
        } else if (vid && vid.isConnected && vid.__prismPriming && !vid.error) {
          if (vid.readyState >= 2 && vid.videoWidth > 0) {
            try { vid.dispatchEvent(new Event('loadeddata')); } catch (_) {}
          } else if (!vid.__prismFetchingBlob) {
            try {
              vid.muted = true;
              vid.play().catch(function () {});
            } catch (_) {}
          }
        } else if (
          !state.activeWrap &&
          !state.pendingWrap &&
          state.item &&
          resolveEffectiveKind(state.item, state.cfg) !== 'none' &&
          state.failedMediaRetries < 3
        ) {
          state.failedMediaRetries += 1;
          mountStageMedia(true);
        }
      }
      return;
    }
    if (vid.__prismFetchingBlob) return;
    var cfg = state.cfg;
    var shouldPause = Boolean(cfg.paused || state.autoPaused || cfg.agentBusyPaused);
    if (shouldPause) {
      state.vidStallCount = 0;
      state.lastVidCheckTime = -1;
      state.lastVidCheckAt = 0;
      return;
    }
    if (typeof vid.__prismArmRvfc === 'function') vid.__prismArmRvfc();
    if (vid.paused && !vid.ended) {
      syncMediaPlaybackState();
      state.lastVidCheckTime = Number(vid.currentTime || 0);
      state.lastVidCheckAt = Date.now();
      return;
    }

    var now = Date.now();
    var curT = Number(vid.currentTime || 0);
    var dur = Number(vid.duration);
    var q = typeof vid.getVideoPlaybackQuality === 'function' ? vid.getVideoPlaybackQuality() : null;
    var curF = q && typeof q.totalVideoFrames === 'number' ? q.totalVideoFrames : state.rvfcCount;
    var moved =
      state.lastVidCheckTime < 0 ||
      Math.abs(curT - state.lastVidCheckTime) > 0.002 ||
      (state.lastVidCheckFrames >= 0 && curF > state.lastVidCheckFrames);

    if (moved) {
      state.vidStallCount = 0;
      state.lastVidCheckTime = curT;
      state.lastVidCheckFrames = curF;
      state.lastVidCheckAt = now;
      return;
    }

    if (state.lastVidCheckAt > 0 && (now - state.lastVidCheckAt) < 900) {
      return;
    }
    state.lastVidCheckAt = now;

    if (vid.readyState >= 1 && !vid.seeking) {
      state.vidStallCount += 1;

      // Case 1: Frozen near EOF where video track ended earlier than container/audio mvhd duration!
      if (state.vidStallCount >= 2 && Number.isFinite(dur) && dur > 1.2 && curT >= dur - 0.75) {
        if (curT > 0.8 && (!vid.__prismEffectiveEnd || curT < vid.__prismEffectiveEnd)) {
          vid.__prismEffectiveEnd = Math.max(0.5, curT - 0.06);
        }
        if (cfg.rotationEnabled && cfg.rotationTrigger === 'videoEnd') {
          callHostRpc('playlist.step', { direction: 1, reason: 'videoEnd' });
        } else {
          try {
            vid.currentTime = 0;
            vid.play().catch(function () {});
          } catch (_) {}
        }
        state.vidStallCount = 0;
        state.lastVidCheckTime = 0;
        state.lastVidCheckFrames = curF;
        return;
      }

      // Case 3: Persistent D3D11 hardware decoder stall -> seamless reload preserving poster/blob floor
      if (state.vidStallCount >= 5) {
        try {
          var resumeT = Number.isFinite(dur) && dur > 2 && curT < dur - 0.75 ? curT : 0;
          if (vid.__prismBlobUrl) {
            vid.src = vid.__prismBlobUrl;
          } else {
            vid.load();
          }
          vid.muted = Boolean(cfg.muted || cfg.volume <= 0.005);
          if (resumeT > 0.05) vid.currentTime = resumeT;
          vid.play().catch(function () {
            vid.muted = true;
            vid.play().catch(function () {});
          });
        } catch (_) {}
        state.vidStallCount = 0;
      } else if (state.vidStallCount >= 3) {
        // Case 2: Mid-stream freeze (>= ~2.7s stalled) -> soft keyframe nudge
        try {
          var kickT = Number.isFinite(dur) && dur > 1.5 && curT < dur - 0.75 ? Math.max(0, curT - 0.035) : 0;
          vid.currentTime = kickT;
          vid.play().catch(function () {});
        } catch (_) {}
      }
    }

    state.lastVidCheckTime = curT;
    state.lastVidCheckFrames = curF;
  }

  function evaluateAutoPause() {
    if (destroyed || !state.skinEnabled) return;
    var cfg = state.cfg;
    var reason = '';
    // Never check window dimensions (outerWidth/availWidth) so maximized windows never auto-pause (#31/#32).
    if (cfg.pauseOnFullscreen && isGenuineFullscreenOcclusion()) {
      reason = 'fullscreen';
    } else if (cfg.pauseOnBattery && state.batteryDischarging) {
      reason = 'battery';
    } else if (cfg.pauseOnHidden && doc.hidden && state.hiddenDebounced) {
      reason = 'hidden';
    } else if (cfg.pauseOnBlur && !isHostWindowFocused()) {
      reason = 'blur';
    }
    var nextPaused = Boolean(reason);
    if (nextPaused !== state.autoPaused || reason !== state.pauseReason) {
      var wokeFromHidden = state.autoPaused && !nextPaused;
      state.autoPaused = nextPaused;
      state.pauseReason = reason;
      syncMediaPlaybackState();
      if (wokeFromHidden && state.activeWrap) {
        // 2-frame repaint nudge after wake from minimize/virtual desktop switch.
        W.requestAnimationFrame(function () {
          W.requestAnimationFrame(function () {
            if (state.activeWrap) state.activeWrap.style.opacity = '0.999';
            setTimeout(function () {
              if (state.activeWrap) state.activeWrap.style.opacity = '';
            }, 16);
          });
        });
      }
    } else if (!nextPaused && !doc.hidden) {
      if (state.activeVideo && state.activeVideo.paused && !state.cfg.paused && !state.cfg.agentBusyPaused) {
        syncMediaPlaybackState();
      }
    }
    if (!nextPaused && !doc.hidden) {
      scheduleWakeVideoCheck(180);
    }
  }

  function setupLifecycleMonitors() {
    listen(doc, 'visibilitychange', function () {
      clearTimeout(state.hiddenTimer);
      if (doc.hidden) {
        // 1200ms debounce prevents black-screen flicker during quick virtual-desktop switches.
        state.hiddenTimer = setTimeout(function () {
          state.hiddenDebounced = Boolean(doc.hidden);
          evaluateAutoPause();
        }, 1200);
      } else {
        state.hiddenDebounced = false;
        evaluateAutoPause();
        scheduleWakeVideoCheck(150);
      }
    });
    listen(W, 'focus', function () {
      evaluateAutoPause();
      scheduleWakeVideoCheck(150);
    });
    listen(W, 'blur', evaluateAutoPause);
    listen(doc, 'fullscreenchange', function () {
      evaluateAutoPause();
      scheduleWakeVideoCheck(220);
    });

    state.blurPollTimer = setInterval(function () {
      if (state.cfg.pauseOnBlur || state.autoPaused) evaluateAutoPause();
    }, 3000);

    state.videoWatchTimer = setInterval(function () {
      checkVideoLiveness(false);
    }, 1100);

    if (W.navigator && typeof W.navigator.getBattery === 'function') {
      W.navigator
        .getBattery()
        .then(function (bm) {
          if (destroyed || !bm) return;
          batteryObj = bm;
          var syncBat = function () {
            state.batteryDischarging = Boolean(
              bm.charging === false &&
                bm.level < 0.98 &&
                Number.isFinite(bm.dischargingTime) &&
                bm.dischargingTime > 0 &&
                bm.dischargingTime < 604800
            );
            evaluateAutoPause();
          };
          syncBat();
          if (bm.addEventListener) {
            bm.addEventListener('chargingchange', syncBat);
            cleanups.push(function () {
              try {
                bm.removeEventListener('chargingchange', syncBat);
              } catch (_) {}
            });
          }
        })
        .catch(function () {});
    }
  }

  // ---------------------------------------------------------------------------
  // Optional Pointer Forwarding, 3D Parallax (0fps idle) & Click/Trail FX Canvas
  // ---------------------------------------------------------------------------
  function stepParallax() {
    state.parallaxRaf = 0;
    if (destroyed || !state.skinEnabled || !state.cfg.parallaxEnabled || !state.activeWrap) return;
    var now = Date.now();
    if (state.cfg.fpsCap > 0) {
      var minInterval = Math.floor(1000 / state.cfg.fpsCap) - 2;
      if (minInterval > 0 && now - state.lastParallaxFrameAt < minInterval) {
        state.parallaxRaf = W.requestAnimationFrame(stepParallax);
        return;
      }
    }
    state.lastParallaxFrameAt = now;
    var dx = state.parallaxTargetX - state.parallaxCurX;
    var dy = state.parallaxTargetY - state.parallaxCurY;
    state.parallaxCurX += dx * 0.12;
    state.parallaxCurY += dy * 0.12;
    state.activeWrap.style.setProperty('--prism-px', state.parallaxCurX.toFixed(2) + 'px');
    state.activeWrap.style.setProperty('--prism-py', state.parallaxCurY.toFixed(2) + 'px');
    if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
      state.parallaxRaf = W.requestAnimationFrame(stepParallax);
    }
  }

  function ensureFxCanvas() {
    var c = doc.getElementById(FX_CANVAS_ID);
    if (!state.skinEnabled || !state.cfg.fxEnabled) {
      if (c && c.parentNode) c.parentNode.removeChild(c);
      return null;
    }
    if (!c && doc.body) {
      c = doc.createElement('canvas');
      c.id = FX_CANVAS_ID;
      c.setAttribute('aria-hidden', 'true');
      c.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:43;';
      doc.body.appendChild(c);
    }
    if (c) {
      if (c.style) c.style.display = state.wallpaperReady ? '' : 'none';
      if (state.lastHoleClip && c.style.clipPath !== state.lastHoleClip) {
        c.style.clipPath = state.lastHoleClip;
      }
      var vw = Math.max(1, Math.round(Number(W.innerWidth) || 1));
      var vh = Math.max(1, Math.round(Number(W.innerHeight) || 1));
      if (c.width !== vw || c.height !== vh) {
        c.width = vw;
        c.height = vh;
      }
    }
    return state.wallpaperReady ? c : null;
  }

  function stepFx() {
    state.fxRaf = 0;
    var canvas = ensureFxCanvas();
    if (!canvas || !state.fxParticles.length) return;
    var now = Date.now();
    if (state.cfg.fpsCap > 0) {
      var minInterval = Math.floor(1000 / state.cfg.fpsCap) - 2;
      if (minInterval > 0 && now - state.lastFxFrameAt < minInterval) {
        state.fxRaf = W.requestAnimationFrame(stepFx);
        return;
      }
    }
    state.lastFxFrameAt = now;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var next = [];
    for (var i = 0; i < state.fxParticles.length; i += 1) {
      var p = state.fxParticles[i];
      p.life -= p.decay;
      if (p.life <= 0) continue;
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.grow;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      if (p.ring) {
        ctx.strokeStyle = 'rgba(' + p.rgb + ', ' + (p.life * 0.55).toFixed(3) + ')';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(' + p.rgb + ', ' + (p.life * 0.65).toFixed(3) + ')';
        ctx.fill();
      }
      next.push(p);
    }
    state.fxParticles = next;
    if (next.length > 0) {
      state.fxRaf = W.requestAnimationFrame(stepFx);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function setupPointerHooks() {
    listen(
      W,
      'pointermove',
      function (e) {
        if (!state.skinEnabled || state.autoPaused) return;
        var vw = Math.max(1, W.innerWidth);
        var vh = Math.max(1, W.innerHeight);

        if (state.activeIframe && state.activeIframe.contentWindow) {
          try {
            state.activeIframe.contentWindow.postMessage(
              { type: 'we-pointer', event: 'move', x: e.clientX / vw, y: e.clientY / vh, clientX: e.clientX, clientY: e.clientY },
              '*'
            );
          } catch (_) {}
        }

        if (state.cfg.parallaxEnabled) {
          var nx = (e.clientX / vw - 0.5) * -2;
          var ny = (e.clientY / vh - 0.5) * -2;
          state.parallaxTargetX = nx * state.cfg.parallaxStrength;
          state.parallaxTargetY = ny * state.cfg.parallaxStrength;
          if (!state.parallaxRaf) state.parallaxRaf = W.requestAnimationFrame(stepParallax);
        }

        if (state.cfg.fxEnabled && state.wallpaperReady) {
          var now = Date.now();
          if (now - state.lastTrailAt > 28) {
            state.lastTrailAt = now;
            var rgb = state.accentRgbStr || '102, 157, 246';
            state.fxParticles.push({
              x: e.clientX,
              y: e.clientY,
              vx: (Math.random() - 0.5) * 0.8,
              vy: (Math.random() - 0.5) * 0.8 - 0.3,
              r: 2.2,
              grow: 0.04,
              life: 0.85,
              decay: 0.045,
              rgb: rgb,
              ring: false,
            });
            if (!state.fxRaf) state.fxRaf = W.requestAnimationFrame(stepFx);
          }
        }
      },
      { passive: true }
    );

    listen(
      W,
      'pointerdown',
      function (e) {
        if (!state.skinEnabled) return;
        if (!state.autoPaused && state.cfg.interactiveWeb && state.activeIframe && state.activeIframe.contentWindow) {
          var vw = Math.max(1, W.innerWidth);
          var vh = Math.max(1, W.innerHeight);
          try {
            state.activeIframe.contentWindow.postMessage(
              { type: 'we-pointer', event: 'down', x: e.clientX / vw, y: e.clientY / vh, clientX: e.clientX, clientY: e.clientY, button: e.button },
              '*'
            );
          } catch (_) {}
        }
        if (!state.cfg.fxEnabled || !state.wallpaperReady) return;
        var rgb = state.accentRgbStr || '102, 157, 246';
        state.fxParticles.push({
          x: e.clientX,
          y: e.clientY,
          vx: 0,
          vy: 0,
          r: 4,
          grow: 1.8,
          life: 1,
          decay: 0.045,
          rgb: rgb,
          ring: true,
        });
        for (var i = 0; i < 6; i += 1) {
          var ang = (Math.PI * 2 * i) / 6 + Math.random() * 0.4;
          state.fxParticles.push({
            x: e.clientX,
            y: e.clientY,
            vx: Math.cos(ang) * 1.9,
            vy: Math.sin(ang) * 1.9,
            r: 2.2,
            grow: -0.02,
            life: 0.95,
            decay: 0.05,
            rgb: rgb,
            ring: false,
          });
        }
        if (!state.fxRaf) state.fxRaf = W.requestAnimationFrame(stepFx);
      },
      { passive: true }
    );

    listen(
      W,
      'pointerup',
      function (e) {
        if (!state.skinEnabled || state.autoPaused || !state.cfg.interactiveWeb) return;
        if (state.activeIframe && state.activeIframe.contentWindow) {
          var vw = Math.max(1, W.innerWidth);
          var vh = Math.max(1, W.innerHeight);
          try {
            state.activeIframe.contentWindow.postMessage(
              { type: 'we-pointer', event: 'up', x: e.clientX / vw, y: e.clientY / vh, clientX: e.clientX, clientY: e.clientY, button: e.button },
              '*'
            );
          } catch (_) {}
        }
      },
      { passive: true }
    );

    listen(
      W,
      'resize',
      function () {
        if (destroyed || !state.skinEnabled) return;
        syncBrowserHoleCutout();
        syncWcoGlassPill();
      },
      { passive: true }
    );

    listen(
      doc,
      'transitionrun',
      function () {
        if (destroyed || !state.skinEnabled) return;
        if (state.lastHoleClip) armHoleTransitionRaf(560);
      },
      true
    );
  }

  // ---------------------------------------------------------------------------
  // Root Attribute Sync, Style Rebuild & Self-Healing
  // ---------------------------------------------------------------------------
  function ensureStyleElement() {
    var el = doc.getElementById(STYLE_ID);
    if (!el) {
      el = doc.createElement('style');
      el.id = STYLE_ID;
      (doc.head || doc.documentElement).appendChild(el);
    }
    return el;
  }

  function refreshSkinStyles() {
    if (destroyed) return;
    var root = doc.documentElement;
    if (!root) return;

    if (!state.skinEnabled) {
      teardownSkinDomOnly();
      return;
    }

    var staticStyleEl = doc.getElementById(STATIC_STYLE_ID);
    if (staticStyleEl && staticStyleEl.parentNode) {
      staticStyleEl.parentNode.removeChild(staticStyleEl);
    }

    state.hostTheme = detectHostTheme();
    state.effectiveTheme = resolveEffectiveTheme(state.cfg);

    var effKind = resolveEffectiveKind(state.item, state.cfg);
    var rootAttrs = [
      [ROOT_ATTR, VERSION],
      [GLASS_ATTR, 'ready'],
      ['data-prism-theme', state.effectiveTheme],
      ['data-prism-scheme', state.cfg.colorScheme],
      ['data-prism-accent-mode', state.cfg.accentMode],
      ['data-prism-layout', state.cfg.layoutMode],
      ['data-prism-corners', state.cfg.cornerStyle],
      ['data-prism-borders', state.cfg.borders],
      ['data-prism-shadows', state.cfg.shadows ? 'on' : 'off'],
      ['data-prism-glass', state.cfg.glassSurfaces ? 'on' : 'off'],
      ['data-prism-code-mode', state.cfg.codeReadabilityMode],
      ['data-prism-kind', effKind],
    ];
    for (var i = 0; i < rootAttrs.length; i += 1) {
      if (root.getAttribute(rootAttrs[i][0]) !== rootAttrs[i][1]) {
        root.setAttribute(rootAttrs[i][0], rootAttrs[i][1]);
      }
    }
    if (state.wallpaperReady) {
      if (root.getAttribute(WALLPAPER_ATTR) !== 'ready') root.setAttribute(WALLPAPER_ATTR, 'ready');
    } else {
      root.removeAttribute(WALLPAPER_ATTR);
    }

    var tok = computeSkinTokens(state.cfg);
    applyFastCssVars(tok.vars);

    var styleEl = doc.getElementById(STYLE_ID);
    if (!styleEl || tok.structuralSig !== state.lastStructuralSig) {
      styleEl = ensureStyleElement();
      styleEl.textContent = buildStructuralPrismCss(state.cfg, tok);
      state.lastStructuralSig = tok.structuralSig;
    }

    applyCaretStyle(state.cfg);
    ensureFxCanvas();
    syncBrowserHoleCutout();
    installContextMeterOverlayGuard();
    syncWindowControlsOverlay(false, false);
    scheduleWcoConfirmTimers();
    syncWcoGlassPill();
    syncSidecarIframes(state.cfg);
    if (state.activeVideoStageFrame) sendVideoStageControl();
  }

  function clearWcoConfirmTimers() {
    clearTimeout(state.wcoConfirmTimer);
    state.wcoConfirmTimer = 0;
    clearTimeout(state.wcoConfirmTimer2);
    state.wcoConfirmTimer2 = 0;
  }

  function scheduleWcoConfirmTimers() {
    clearWcoConfirmTimers();
    state.wcoHeightRepairCount = 0;
    if (!destroyed && state.skinEnabled && state.cfg.transparentWindowControls !== false) {
      state.wcoConfirmTimer = setTimeout(function () {
        state.wcoConfirmTimer = 0;
        if (!destroyed && state.skinEnabled && state.cfg.transparentWindowControls !== false) {
          syncWindowControlsOverlay(false, true);
        }
      }, 45);
      state.wcoConfirmTimer2 = setTimeout(function () {
        state.wcoConfirmTimer2 = 0;
        if (!destroyed && state.skinEnabled && state.cfg.transparentWindowControls !== false) {
          syncWindowControlsOverlay(false, true);
        }
      }, 250);
    }
  }

  function getPrismWcoColors(forceRestore) {
    var isLight = (state.skinEnabled && !forceRestore ? state.effectiveTheme : detectHostTheme()) === 'light';
    var wantTransparent = Boolean(!forceRestore && state.skinEnabled && state.cfg.transparentWindowControls !== false);
    var color = wantTransparent ? '#00000000' : isLight ? '#FFFFFF' : '#131313';
    var symbolColor = wantTransparent ? (isLight ? '#18181B' : '#F2F2F5') : isLight ? '#000000' : '#FAFAFA';
    return {
      isLight: isLight,
      wantTransparent: wantTransparent,
      color: color,
      symbolColor: symbolColor,
      height: TARGET_WCO_HEIGHT,
    };
  }

  function uninstallContextMeterOverlayGuard() {
    if (!state.origContextMeterSyncOverlay) return;
    try {
      if (state.replacedContextMeterApi && state.origContextMeterApiObj) {
        Object.defineProperty(W, 'contextMeterAPI', {
          value: state.origContextMeterApiObj,
          configurable: true,
          writable: true,
          enumerable: true,
        });
      } else if (
        state.wrappedContextMeterApi &&
        state.wrappedContextMeterApi.syncOverlay === state.wrappedContextMeterFn
      ) {
        state.wrappedContextMeterApi.syncOverlay = state.origContextMeterSyncOverlay;
      }
    } catch (_) {}
    state.origContextMeterSyncOverlay = null;
    state.wrappedContextMeterApi = null;
    state.wrappedContextMeterFn = null;
    state.replacedContextMeterApi = false;
    state.origContextMeterApiObj = null;
  }

  function installContextMeterOverlayGuard() {
    var api = W.contextMeterAPI;
    if (!api || typeof api.syncOverlay !== 'function') return;
    if (api.syncOverlay === state.wrappedContextMeterFn) return;
    if (state.wrappedContextMeterApi && state.origContextMeterSyncOverlay && state.wrappedContextMeterApi !== api) {
      uninstallContextMeterOverlayGuard();
    }
    var origFn = api.syncOverlay;
    var wrapped = function agyPrismSyncOverlayGuard(opts) {
      if (!destroyed && state.skinEnabled && state.cfg.transparentWindowControls !== false) {
        var wco = getPrismWcoColors(false);
        var nextOpts = {};
        if (opts && typeof opts === 'object') {
          for (var k in opts) {
            if (Object.prototype.hasOwnProperty.call(opts, k)) nextOpts[k] = opts[k];
          }
        }
        nextOpts.color = wco.color;
        nextOpts.symbolColor = wco.symbolColor;
        nextOpts.height = wco.height;
        if ('heightCssPx' in nextOpts) nextOpts.heightCssPx = wco.height;
        return origFn.call(this, nextOpts);
      }
      return origFn.apply(this, arguments);
    };
    wrapped.__agyPrismWrapped = true;
    var ok = false;
    try {
      api.syncOverlay = wrapped;
      ok = api.syncOverlay === wrapped;
    } catch (_) {}
    if (!ok) {
      try {
        var desc = Object.getOwnPropertyDescriptor(W, 'contextMeterAPI');
        if (!desc || desc.configurable || desc.writable) {
          var clone = {};
          var keys = Object.keys(api);
          for (var i = 0; i < keys.length; i += 1) {
            var key = keys[i];
            clone[key] = key === 'syncOverlay' ? wrapped : api[key];
          }
          Object.defineProperty(W, 'contextMeterAPI', {
            value: clone,
            configurable: true,
            writable: true,
            enumerable: true,
          });
          ok = Boolean(W.contextMeterAPI && W.contextMeterAPI.syncOverlay === wrapped);
          if (ok) {
            state.replacedContextMeterApi = true;
            state.origContextMeterApiObj = api;
            api = clone;
          }
        }
      } catch (_) {}
    }
    if (ok) {
      state.origContextMeterSyncOverlay = origFn;
      state.wrappedContextMeterApi = api;
      state.wrappedContextMeterFn = wrapped;
    }
  }

  function clearWcoGeometryListener() {
    if (state.wcoGeometryCleanup) {
      try {
        state.wcoGeometryCleanup();
      } catch (_) {}
      state.wcoGeometryCleanup = null;
    }
    state.wcoOverlayTarget = null;
  }

  function removeWcoGlassPill() {
    var pill = doc.getElementById(WCO_PILL_ID);
    if (pill && pill.parentNode) pill.parentNode.removeChild(pill);
    var root = doc.documentElement;
    if (root && root.style) {
      if (state.skinEnabled && !destroyed) root.style.setProperty('--prism-wco-inset-right', '0px');
      else root.style.removeProperty('--prism-wco-inset-right');
    }
  }

  function syncWcoGlassPill() {
    var root = doc.documentElement;
    if (!root || !doc.body || destroyed || !state.skinEnabled || state.cfg.transparentWindowControls === false) {
      removeWcoGlassPill();
      return;
    }
    var wco = W.navigator && W.navigator.windowControlsOverlay;
    if (!wco || wco.visible !== true || typeof wco.getTitlebarAreaRect !== 'function') {
      removeWcoGlassPill();
      return;
    }
    if (typeof wco.addEventListener === 'function' && state.wcoOverlayTarget !== wco) {
      clearWcoGeometryListener();
      var onGeo = function () {
        if (!destroyed && state.skinEnabled) {
          syncWcoGlassPill();
          if (state.cfg.transparentWindowControls !== false && state.wcoHeightRepairCount < 2) {
            try {
              var gr = wco.getTitlebarAreaRect();
              var gh = gr ? Math.round(Number(gr.height) || 0) : 0;
              if (gh > TARGET_WCO_HEIGHT + 1) {
                state.wcoHeightRepairCount += 1;
                syncWindowControlsOverlay(false, true);
              }
            } catch (_) {}
          }
        }
      };
      try {
        wco.addEventListener('geometrychange', onGeo);
        state.wcoOverlayTarget = wco;
        state.wcoGeometryCleanup = function () {
          try {
            wco.removeEventListener('geometrychange', onGeo);
          } catch (_) {}
        };
      } catch (_) {}
    }
    var rect = null;
    try {
      rect = wco.getTitlebarAreaRect();
    } catch (_) {}
    if (!rect) {
      removeWcoGlassPill();
      return;
    }
    var rectRight = Number.isFinite(Number(rect.right))
      ? Number(rect.right)
      : Number(rect.x || 0) + Number(rect.width || 0);
    var vw = Math.max(1, Number(W.innerWidth) || root.clientWidth || 0);
    var wcoW = Math.round(vw - rectRight);
    if (!Number.isFinite(wcoW) || wcoW < 40) {
      removeWcoGlassPill();
      return;
    }
    var wcoH = Math.round(Number(rect.height) || TARGET_WCO_HEIGHT);
    if (!Number.isFinite(wcoH) || wcoH < 20) wcoH = TARGET_WCO_HEIGHT;

    var isIslands = state.cfg.layoutMode !== 'flush';
    var insetPx = (isIslands ? wcoW + num(state.cfg.islandGap, 8) : wcoW) + 'px';
    if (root.style) root.style.setProperty('--prism-wco-inset-right', insetPx);

    var pill = doc.getElementById(WCO_PILL_ID);
    if (!pill) {
      pill = doc.createElement('div');
      pill.id = WCO_PILL_ID;
      pill.setAttribute('aria-hidden', 'true');
      pill.setAttribute('data-agy-prism-layer', '1');
      doc.body.appendChild(pill);
    }
    if (isIslands) {
      var padRight = Math.min(4, Math.max(0, Math.round(num(state.cfg.workspacePad, 8))));
      pill.style.top = '2px';
      pill.style.right = padRight + 'px';
      pill.style.width = Math.max(40, wcoW - padRight) + 'px';
      pill.style.height = Math.max(28, wcoH - 2) + 'px';
    } else {
      pill.style.top = '0px';
      pill.style.right = '0px';
      pill.style.width = wcoW + 'px';
      pill.style.height = wcoH + 'px';
    }
  }

  function syncWindowControlsOverlay(forceRestore, forceSend) {
    var wco = getPrismWcoColors(forceRestore);
    var root = doc.documentElement;
    if (root) {
      if (wco.wantTransparent) root.setAttribute(WCO_ATTR, 'transparent');
      else root.removeAttribute(WCO_ATTR);
    }
    var nav = W.electronNative;
    if (!nav || typeof nav.setTitleBarOverlay !== 'function') return false;
    var sig = wco.color + '|' + wco.symbolColor + '|' + wco.height;
    if (!forceSend && state.lastWcoSig === sig) return true;
    state.lastWcoSig = sig;
    try {
      var res = nav.setTitleBarOverlay({ color: wco.color, symbolColor: wco.symbolColor, height: wco.height });
      if (res && typeof res.catch === 'function') res.catch(function () {});
      return true;
    } catch (_) {
      return false;
    }
  }

  function teardownSkinDomOnly() {
    clearRootWatchdogTimers();
    state._watchdogReported = false;
    disconnectHoleActiveObservers();
    clearInterval(state.slideTimer);
    state.slideTimer = 0;
    clearTimeout(state.pendingMediaTimer);
    state.pendingMediaTimer = 0;
    clearTimeout(state.transitionTimer);
    state.transitionTimer = 0;
    clearWcoConfirmTimers();
    state.wcoHeightRepairCount = 0;
    clearTimeout(state.wcoThemeTimer);
    state.wcoThemeTimer = 0;
    uninstallContextMeterOverlayGuard();
    clearWcoGeometryListener();
    if (state.pendingWrap) {
      disposeWrap(state.pendingWrap);
      state.pendingWrap = null;
    }
    flushOutgoingWraps();
    if (state.activeWrap) {
      disposeWrap(state.activeWrap);
      state.activeWrap = null;
    }
    state.activeVideo = null;
    state.activeAudio = null;
    state.activeIframe = null;
    clearVideoStageListener();
    state.activeVideoStageFrame = null;
    state.activeVideoStageSid = '';
    state.activeVideoStageReady = false;
    state.activeVideoStageUrl = '';
    state.activeMediaKey = '';
    state.wallpaperReady = false;
    state.slides = [];
    state.lastStructuralSig = '';
    state.lastCaretSig = '';
    state.lastSidecarSig = '';
    clearFastCssVars();
    removeWcoGlassPill();
    syncWindowControlsOverlay(true, true);

    var stage = doc.getElementById(STAGE_ID);
    if (stage && stage.parentNode) stage.parentNode.removeChild(stage);
    var styleEl = doc.getElementById(STYLE_ID);
    if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
    var staticEl = doc.getElementById(STATIC_STYLE_ID);
    if (staticEl && staticEl.parentNode) staticEl.parentNode.removeChild(staticEl);
    var caretEl = doc.getElementById(CARET_STYLE_ID);
    if (caretEl && caretEl.parentNode) caretEl.parentNode.removeChild(caretEl);
    var fxEl = doc.getElementById(FX_CANVAS_ID);
    if (fxEl && fxEl.parentNode) fxEl.parentNode.removeChild(fxEl);

    var root = doc.documentElement;
    if (root) {
      var attrs = [
        ROOT_ATTR,
        GLASS_ATTR,
        WALLPAPER_ATTR,
        WCO_ATTR,
        'data-prism-theme',
        'data-prism-scheme',
        'data-prism-accent-mode',
        'data-prism-layout',
        'data-prism-corners',
        'data-prism-borders',
        'data-prism-shadows',
        'data-prism-glass',
        'data-prism-code-mode',
        'data-prism-kind',
      ];
      for (var i = 0; i < attrs.length; i += 1) root.removeAttribute(attrs[i]);
    }
  }

  function attachWatchers() {
    if (W.MutationObserver && !domObs && doc.body) {
      domObs = new MutationObserver(function () {
        if (destroyed || !state.skinEnabled) return;
        if (!doc.getElementById(STYLE_ID)) refreshSkinStyles();
        if (!doc.getElementById(STAGE_ID)) mountStageMedia(true);
      });
      try {
        domObs.observe(doc.body, { childList: true });
      } catch (_) {}
    }

    if (W.MutationObserver && !holeAttrObs && doc.documentElement) {
      holeAttrObs = new MutationObserver(function () {
        if (destroyed || !state.skinEnabled) return;
        syncBrowserHoleCutout();
      });
      try {
        holeAttrObs.observe(doc.documentElement, {
          attributes: true,
          attributeFilter: ['data-has-browser-hole', 'data-has-three-layer-browser-hole', 'data-has-drawer-browser-hole'],
        });
        if (doc.body) {
          holeAttrObs.observe(doc.body, {
            attributes: true,
            attributeFilter: ['data-has-browser-hole', 'data-has-three-layer-browser-hole', 'data-has-drawer-browser-hole'],
          });
        }
      } catch (_) {}
    }

    if (W.MutationObserver && !themeObs && doc.documentElement) {
      var onThemeMut = function () {
        if (themeDebounce || destroyed || !state.skinEnabled) return;
        themeDebounce = setTimeout(function () {
          themeDebounce = 0;
          var nextHost = detectHostTheme();
          if (nextHost !== state.hostTheme) {
            state.hostTheme = nextHost;
            refreshSkinStyles();
          }
          clearTimeout(state.wcoThemeTimer);
          state.wcoThemeTimer = setTimeout(function () {
            state.wcoThemeTimer = 0;
            if (!destroyed && state.skinEnabled) syncWindowControlsOverlay(false, true);
          }, 75);
        }, 32);
      };
      themeObs = new MutationObserver(onThemeMut);
      try {
        themeObs.observe(doc.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'data-ag-cs-theme'] });
        if (doc.body) themeObs.observe(doc.body, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] });
      } catch (_) {}

      if (!themeMq && W.matchMedia) {
        try {
          themeMq = W.matchMedia('(prefers-color-scheme: light)');
          if (themeMq.addEventListener) themeMq.addEventListener('change', onThemeMut);
        } catch (_) {}
      }
    }

    syncBrowserHoleCutout();
  }

  function applyPayload(payload) {
    if (destroyed) return status();
    var p = payload && typeof payload === 'object' ? payload : {};
    lastPayload = p;

    if (p.skinEnabled === false || (p.config && p.config.skinEnabled === false)) {
      state.skinEnabled = false;
      teardownSkinDomOnly();
      return status();
    }

    state.skinEnabled = true;
    var rawCfg = p.config || p.prefs || p;
    var prevItemId = state.item && state.item.id ? String(state.item.id) : '';
    if (p.activeItem !== undefined) state.item = p.activeItem;
    else if (p.source && typeof p.source === 'object') {
      state.item = {
        id: p.source.id || rawCfg.wallpaperId || '',
        title: p.source.title || p.source.label || '',
        kind: p.source.kind || rawCfg.kind || 'image',
        mediaUrl: p.source.mediaUrl || p.source.url || '',
        thumbUrl: p.source.thumbUrl || p.source.url || '',
        audioUrl: p.source.audioUrl || '',
        slidesUrl: p.source.slidesUrl || '',
        sceneMode: p.source.sceneMode || '',
        sceneVideoUrl: p.source.sceneVideoUrl || '',
        sceneLiveUrl: p.source.sceneLiveUrl || '',
        videoStageUrl: p.source.videoStageUrl || '',
        mseFmp4Url: p.source.mseFmp4Url || '',
        pluginMediaUrl: p.source.pluginMediaUrl || '',
        pluginThumbUrl: p.source.pluginThumbUrl || '',
        pluginAudioUrl: p.source.pluginAudioUrl || '',
        pluginVideoStageUrl: p.source.pluginVideoStageUrl || '',
        webUrl: p.source.webUrl || '',
        schemeColor: p.source.schemeColor || '',
      };
    }
    var nextItemId = state.item && state.item.id ? String(state.item.id) : '';
    if (typeof p.mediaOrigin === 'string') state.mediaOrigin = p.mediaOrigin;
    if (Array.isArray(p.slides)) {
      state.slides = p.slides.slice();
    } else if (p.activeItem !== undefined || p.source !== undefined || nextItemId !== prevItemId || !(state.item && state.item.slidesUrl)) {
      state.slides = [];
    }

    state.rawCfg = rawCfg && typeof rawCfg === 'object' ? rawCfg : {};
    state.cfg = normalizeConfig(state.rawCfg, state.item);

    var runMount = function () {
      if (destroyed || !state.skinEnabled) return;
      refreshSkinStyles();
      if (state.item && state.item.slidesUrl && (!p.slides || !p.slides.length) && W.fetch) {
        var reqItemId = state.item.id;
        var reqSlidesUrl = state.item.slidesUrl;
        W.fetch(reqSlidesUrl)
          .then(function (r) {
            return r.ok ? r.json() : null;
          })
          .then(function (data) {
            if (
              data &&
              Array.isArray(data.slides) &&
              data.slides.length &&
              !destroyed &&
              state.skinEnabled &&
              state.item &&
              state.item.id === reqItemId &&
              state.item.slidesUrl === reqSlidesUrl
            ) {
              state.slides = data.slides.map(function (s) {
                return s && typeof s === 'object' ? String(s.url || s.mediaUrl || '') : String(s || '');
              }).filter(Boolean);
              refreshSkinStyles();
              mountStageMedia(true);
            }
          })
          .catch(function () {});
      }
      mountStageMedia(false);
      attachWatchers();
      evaluateAutoPause();
      armPostMountWatchdog();
    };

    if (doc.body) {
      runMount();
    } else {
      doc.addEventListener('DOMContentLoaded', runMount, { once: true });
    }
    return status();
  }

  function updateConfig(patch) {
    var cur = (state.rawCfg && typeof state.rawCfg === 'object' && Object.keys(state.rawCfg).length ? state.rawCfg : null) ||
      (lastPayload && (lastPayload.config || lastPayload.prefs)) ||
      state.cfg ||
      {};
    var merged = {};
    var k;
    for (k in cur) if (Object.prototype.hasOwnProperty.call(cur, k)) merged[k] = cur[k];
    if (patch && typeof patch === 'object') {
      var wid = state.item && state.item.id ? String(state.item.id) : String(merged.wallpaperId || '');
      var ovClone = null;
      if (patch.perWallpaperOverrides === undefined && wid && merged.perWallpaperOverrides && typeof merged.perWallpaperOverrides === 'object' && merged.perWallpaperOverrides[wid]) {
        var nextOvMap = {};
        for (var ok in merged.perWallpaperOverrides) {
          if (Object.prototype.hasOwnProperty.call(merged.perWallpaperOverrides, ok)) nextOvMap[ok] = merged.perWallpaperOverrides[ok];
        }
        ovClone = {};
        for (var pk in merged.perWallpaperOverrides[wid]) {
          if (Object.prototype.hasOwnProperty.call(merged.perWallpaperOverrides[wid], pk)) ovClone[pk] = merged.perWallpaperOverrides[wid][pk];
        }
        nextOvMap[wid] = ovClone;
        merged.perWallpaperOverrides = nextOvMap;
      }
      for (k in patch) {
        if (Object.prototype.hasOwnProperty.call(patch, k)) {
          merged[k] = patch[k];
          if (ovClone && Object.prototype.hasOwnProperty.call(ovClone, k)) {
            if (patch[k] === null) delete ovClone[k];
            else ovClone[k] = patch[k];
          }
        }
      }
    }
    state.rawCfg = merged;
    return applyPayload({
      skinEnabled: patch && typeof patch.skinEnabled === 'boolean' ? patch.skinEnabled : state.skinEnabled,
      config: merged,
      activeItem: state.item,
      mediaOrigin: state.mediaOrigin,
      slides: state.slides,
    });
  }

  function stepSlideshow(dir) {
    if (!state.slides || state.slides.length < 2) return status();
    var step = dir < 0 ? -1 : 1;
    state.slideIdx = (state.slideIdx + step + state.slides.length) % state.slides.length;
    mountStageMedia(true);
    return status();
  }

  function setPaused(flag) {
    return updateConfig({ paused: Boolean(flag) });
  }

  function heal() {
    if (destroyed || !state.skinEnabled) return status();
    if (doc.body) {
      if (!doc.getElementById(STYLE_ID)) refreshSkinStyles();
      if (!doc.getElementById(STAGE_ID)) {
        mountStageMedia(true);
      } else if (state.activeWrap && state.activeWrap.isConnected && !state.transitionTimer && state.activeWrap.style.opacity === '0') {
        state.activeWrap.style.opacity = '';
        state.activeWrap.style.transition = '';
      } else if (state.pendingWrap && state.pendingWrap.isConnected && !state.pendingMediaTimer) {
        mountStageMedia(true);
      } else if (
        !state.activeWrap &&
        !state.pendingWrap &&
        state.item &&
        resolveEffectiveKind(state.item, state.cfg) !== 'none' &&
        state.failedMediaRetries < 3
      ) {
        state.failedMediaRetries += 1;
        mountStageMedia(true);
      }
      attachWatchers();
      installContextMeterOverlayGuard();
      syncWindowControlsOverlay(false, true);
      scheduleWcoConfirmTimers();
      syncWcoGlassPill();
    }
    return status();
  }

  function status() {
    var body = doc.body;
    var checks = {};
    if (body) {
      try {
        var cs = getComputedStyle(body);
        checks = {
          bodyBg: cs.backgroundColor,
          tokenBackground: cs.getPropertyValue('--background').trim(),
          tokenCard: cs.getPropertyValue('--card').trim(),
          tokenSidebar: cs.getPropertyValue('--sidebar').trim(),
          tokenPrimary: cs.getPropertyValue('--primary').trim(),
        };
      } catch (_) {}
    }
    return {
      installed: !destroyed,
      version: VERSION,
      skinEnabled: state.skinEnabled,
      theme: state.effectiveTheme,
      hostTheme: state.hostTheme,
      layoutMode: state.cfg.layoutMode || 'islands',
      colorScheme: state.cfg.colorScheme || 'prism-default',
      codeReadabilityMode: state.cfg.codeReadabilityMode || 'translucent',
      kind: resolveEffectiveKind(state.item, state.cfg),
      wallpaperId: (state.item && state.item.id) || '',
      paused: Boolean(state.cfg.paused || state.autoPaused),
      autoPaused: Boolean(state.autoPaused),
      pauseReason: state.pauseReason,
      videoStageMode: state.activeVideoStageFrame ? 'iframe' : state.activeVideo ? 'video' : 'none',
      videoTransport: state.activeVideoStageFrame
        ? 'iframe'
        : state.activeVideo
          ? state.activeVideo.__prismMseActive
            ? 'mse'
            : /^plugin:\/\//i.test(String(state.activeVideo.currentSrc || state.activeVideo.src || ''))
              ? 'plugin'
              : /^blob:/i.test(String(state.activeVideo.currentSrc || state.activeVideo.src || ''))
                ? 'blob'
                : 'direct'
          : 'none',
      videoPaused: state.activeVideo
        ? Boolean(state.activeVideo.paused)
        : state.activeVideoStageFrame
          ? Boolean(state.cfg.paused || state.autoPaused || state.cfg.agentBusyPaused)
          : null,
      videoMuted: state.activeVideo
        ? Boolean(state.activeVideo.muted)
        : state.activeVideoStageFrame
          ? Boolean(state.cfg.muted || state.cfg.volume <= 0.005)
          : null,
      videoReadyState: state.activeVideo
        ? Number(state.activeVideo.readyState || 0)
        : state.activeVideoStageFrame
          ? state.activeVideoStageReady
            ? 4
            : 0
          : 0,
      videoSrc: state.activeVideo
        ? String(state.activeVideo.currentSrc || state.activeVideo.src || '')
        : state.activeVideoStageUrl || '',
      glassReady: Boolean(doc.documentElement && doc.documentElement.getAttribute(GLASS_ATTR) === 'ready'),
      wallpaperReady: Boolean(state.wallpaperReady),
      transparentWindowControls: Boolean(state.cfg.transparentWindowControls !== false),
      wcoSig: state.lastWcoSig,
      holeClip: state.lastHoleClip,
      stagePresent: Boolean(doc.getElementById(STAGE_ID)),
      stylePresent: Boolean(doc.getElementById(STYLE_ID)),
      checks: checks,
    };
  }

  function destroy() {
    if (destroyed) return { installed: false };
    destroyed = true;
    state.skinEnabled = false;
    clearRootWatchdogTimers();
    disconnectHoleActiveObservers();
    clearTimeout(state.hiddenTimer);
    clearTimeout(state.wakeNudgeTimer);
    clearTimeout(state.wcoThemeTimer);
    clearWcoConfirmTimers();
    clearInterval(state.blurPollTimer);
    clearInterval(state.videoWatchTimer);
    clearTimeout(themeDebounce);
    if (state.parallaxRaf) W.cancelAnimationFrame(state.parallaxRaf);
    if (state.fxRaf) W.cancelAnimationFrame(state.fxRaf);
    if (state.unmuteGestureCleanup) state.unmuteGestureCleanup();
    clearWcoGeometryListener();
    uninstallContextMeterOverlayGuard();
    try {
      if (domObs) domObs.disconnect();
      if (holeAttrObs) holeAttrObs.disconnect();
      if (themeObs) themeObs.disconnect();
    } catch (_) {}
    domObs = null;
    holeAttrObs = null;
    themeObs = null;
    for (var i = 0; i < cleanups.length; i += 1) {
      try {
        cleanups[i]();
      } catch (_) {}
    }
    cleanups = [];
    teardownSkinDomOnly();
    if (W[API_KEY] === api) {
      try {
        delete W[API_KEY];
      } catch (_) {
        W[API_KEY] = undefined;
      }
    }
    return { installed: false };
  }

  setupFocusHandbackGuard();
  setupLifecycleMonitors();
  setupPointerHooks();
  installContextMeterOverlayGuard();

  var api = {
    version: VERSION,
    applyPayload: applyPayload,
    apply: applyPayload,
    updateConfig: updateConfig,
    setPrefs: updateConfig,
    extractAccent: extractAccent,
    stepSlideshow: stepSlideshow,
    setPaused: setPaused,
    syncBrowserHoles: syncBrowserHoleCutout,
    heal: heal,
    status: status,
    receive: receive,
    destroy: destroy,
    alive: function () {
      return !destroyed;
    },
    getLastPayload: function () {
      return lastPayload;
    },
  };

  W[API_KEY] = api;

  var bootPayload = W.__AGY_PRISM_BOOT_PAYLOAD__ || carryPayload;
  if (bootPayload) {
    applyPayload(bootPayload);
  }

  return status();
})();
