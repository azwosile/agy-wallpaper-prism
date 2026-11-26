// Host Prism Skin & Wallpaper Stage Microkernel for Antigravity (agy-wallpaper-prism v2.2.0).
//
// Gentle Fail-Open ES2020 browser IIFE loaded post-hydration (`stage.js`) or in headless verification harnesses.
// Zero `Page.enable`/`Runtime.enable`, zero `app.asar` modifications, `z-index: -1` inert stage,
// strict Frame-1 Media-Ready Gate, and synchronous `2.34.0` `[data-browser-hole]` rounded GPU cutout.
//
// Exposes `window.__agyPrism = { version, applyPayload, updateConfig, destroy, extractAccent,
// stepSlideshow, setPaused, syncBrowserHoles, heal, status, receive }`.
(function agyPrismSkinKernelMain() {
  'use strict';

  var VERSION = '2.2.0';
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
  var TOPBAR_PILLS_ID = 'agy-prism-topbar-pills';
  var TARGET_WCO_HEIGHT = 35;
  var ROOT_ATTR = 'data-agy-prism-skin';
  var GLASS_ATTR = 'data-agy-prism-glass';
  var WALLPAPER_ATTR = 'data-agy-prism-wallpaper';
  var WCO_ATTR = 'data-agy-prism-wco';
  var WCO_ACTIVE_ATTR = 'data-agy-prism-wco-active';
  var TOPBAR_STYLE_ATTR = 'data-prism-topbar-style';
  var SIDEBAR_STYLE_ATTR = 'data-prism-sidebar-style';
  var SIDEBAR_TYPO_ATTR = 'data-prism-sb-typo';
  var TOPBAR_ANC_ATTR = 'data-agy-prism-topbar-anc';
  var TOPBAR_HOST_ATTR = 'data-agy-prism-topbar-host';
  var TOPBAR_CLUSTER_GAP = 36;
  var WELCOME_LOGO_ATTR = 'data-prism-welcome-logo';
  var WELCOME_LOGO_MARK = 'data-agy-prism-welcome-logo';
  var WELCOME_LOGO_PSEUDO_MARK = 'data-agy-prism-welcome-logo-pseudo';
  var ACTIVE_HOLE_SEL = '[data-browser-hole]:not([data-browser-hole="false"])';
  var PLUGIN_DEAD_HARD_TTL_MS = 5 * 60 * 1000;
  var PLUGIN_DEAD_TIMEOUT_TTL_MS = 60 * 1000;
  var PLUGIN_ALIVE_RETRY_TTL_MS = 15 * 1000;

  // Preserve state or tear down an older kernel cleanly before mounting.
  var prev = W[API_KEY];
  var carryPayload = null;
  if (prev && typeof prev === 'object') {
    if (prev.version === VERSION && typeof prev.alive === 'function' && prev.alive()) {
      try {
        if (W.__agyPrismOn === false) {
          if (typeof prev.applyPayload === 'function') prev.applyPayload({ skinEnabled: false });
        } else {
          if (W.__AGY_PRISM_BOOT_PAYLOAD__ && typeof prev.applyPayload === 'function') {
            prev.applyPayload(W.__AGY_PRISM_BOOT_PAYLOAD__);
          }
          prev.heal();
        }
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

  // Verified Antigravity 2.0 / 2.34.0 / 2.35.1 Hub + VS Code Workbench Selectors
  // Explicit exclusions protect sibling plugins and modal/menu/popover overlays.
  var SIBLING_EXCLUDE =
    ':not(#gemini-neko-pet-root):not(#gemini-neko-observer-modal):not(#gemini-neko-stats-bar):not(#ag-context-meter):not(#ag-usage-monitor-capsule):not(#ag-usage-monitor-portal):not(#deck-metrics-strip):not(#agy-prism-popover):not(#' +
    STAGE_ID +
    '):not(#' +
    WCO_PILL_ID +
    '):not(#' +
    TOPBAR_PILLS_ID +
    '):not(.settings-modal-backdrop):not(.settings-modal-container):not([data-testid="modal-backdrop"]):not([data-testid="media-modal"]):not(.agy-dialog):not([role="dialog"]):not([role="alertdialog"]):not([role="menu"]):not([role="listbox"]):not([role="tooltip"])';

  var SIBLING_DESCENDANT_EXCLUDE =
    ':not(#agy-prism-pill):not(#agy-prism-pill *)' +
    ':not(#gemini-neko-pet-root):not(#gemini-neko-pet-root *)' +
    ':not(#gemini-neko-observer-modal):not(#gemini-neko-observer-modal *)' +
    ':not(#gemini-neko-stats-bar):not(#gemini-neko-stats-bar *)' +
    ':not(#ag-context-meter):not(#ag-context-meter *)' +
    ':not(#ag-usage-monitor-capsule):not(#ag-usage-monitor-capsule *)' +
    ':not(#ag-usage-monitor-portal):not(#ag-usage-monitor-portal *)' +
    ':not(#deck-metrics-strip):not(#deck-metrics-strip *)' +
    ':not(#agy-prism-popover):not(#agy-prism-popover *)';

  var COMPOSER_DESCENDANT_EXCLUDE =
    ':not(#antigravity\\.agentSidePanelInputBox):not(#antigravity\\.agentSidePanelInputBox *)' +
    ':not([data-testid="agent-input-box"]):not([data-testid="agent-input-box"] *)' +
    ':not(.surface-composer-card):not(.surface-composer-card *)' +
    ':not(.agy-composer):not(.agy-composer *)';

  var TYPO_PROTECT_EX = ':not(pre, pre *, code, code *, .monaco-editor, .monaco-editor *, .xterm, .xterm *, svg, svg *)';

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

  var GLASS_CARRIER_CHAT = [
    '[data-testid="aux-pane-split"] > :is(div, main, section):first-child',
    '.agy-shell > main',
  ];

  var GLASS_CARRIER_RIGHT_PANES = [
    '[data-testid="aux-pane-split"] > :is(div, aside, section):last-child:not(:first-child):not([hidden]):not([aria-hidden="true"])',
    '.monaco-workbench .part.auxiliarybar',
  ];

  var GLASS_CARRIER_TITLEBARS = [
    '[data-testid="title-menu-bar"]',
    '.monaco-workbench .part.titlebar',
  ];

  var GLASS_CARRIER_MAIN_PAGES = [
    'div.bg-background:not(.agy-shell):not(.sticky):not([style*="sticky"]):not(.agy-dialog):not(.settings-modal-container):has([data-testid="customizations-search"], [data-testid="customizations-marketplace"], [data-testid="customizations-installed"])',
    '[data-testid="plugin-detail"]',
  ];

  // DAY0_PROBE_CALIBRATION_SLOT: SLOT_L1_OUTER_SHELL — 2.35.1 live hub verified `div[data-testid="agent-input-box"].flex.flex-col.w-full.shrink-0` as direct parent of `#antigravity.agentSidePanelInputBox` (2 instances: main conversation-view & aux subagent-tab-composer).
  // DAY0_PROBE_CALIBRATION_SLOT: SLOT_L2_INPUTBOX_CLASSES — 2.35.1 live hub verified `div#antigravity.agentSidePanelInputBox` (`testid=""`, cls `surface-composer relative flex flex-col p-px rounded-2xl bg-card-border`, radius 21px, bg rgb(13,13,17), 4px/5px box-shadow rings).
  // DAY0_PROBE_CALIBRATION_SLOT: SLOT_L3_CONTEXT_BAR — idle input had only `.surface-composer-card` child (`未找到` dynamic tray in idle state); retain `:has(~ .surface-composer-card)` guard.
  // DAY0_PROBE_CALIBRATION_SLOT: SLOT_L4_INNER_NESTED — 2.35.1 `.surface-composer-card` (`bg-card`, radius 20px, 4-layer box-shadow) contains `div.relative.w-full` & `div.agy-composer-footer` (0 nested `[data-testid="agent-input-box"]`); retain defensive inner strip.
  var GLASS_CARRIER_COMPOSERS = [
    '#antigravity\\.agentSidePanelInputBox',
    '[data-testid="agent-input-box"]:not(#antigravity\\.agentSidePanelInputBox):not(#antigravity\\.agentSidePanelInputBox *):not(:has(#antigravity\\.agentSidePanelInputBox)):not([data-testid="agent-input-box"] *)',
    '.surface-composer-card:not(#antigravity\\.agentSidePanelInputBox *):not([data-testid="agent-input-box"] *):not([data-testid="agent-input-box"]):not(:has([data-testid="agent-input-box"]))',
    '.agy-composer:not(#antigravity\\.agentSidePanelInputBox *):not([data-testid="agent-input-box"] *):not(.surface-composer-card *):not([data-testid="agent-input-box"]):not(.surface-composer-card):not(:has([data-testid="agent-input-box"])):not(:has(.surface-composer-card))',
  ];

  // Req #1: 3-Layer Zero-English Empty-Conversation Watermark Logo Selectors & Guards
  var WELCOME_LOGO_EXPLICIT_SELECTORS = [
    '[data-testid="welcome-logo"]',
    '[data-testid="empty-state-logo"]',
    '[data-testid="greeting-logo"]',
    '[data-testid="new-conversation-logo"]',
    '[data-testid="antigravity-watermark"]',
    '[data-testid="home-logo"]',
    '.agy-welcome-logo',
    '.agy-empty-state-logo',
  ];

  var WELCOME_LOGO_SCOPE_EXCLUDE_ANCESTOR =
    '[data-testid="sidebar-split"] > div:first-child, .agy-sidebar, [role="navigation"], ' +
    '[data-side-panel-body], [data-side-panel-strip], [data-testid="aux-pane-split"] > :last-child:not(:first-child), ' +
    '[role="dialog"], [role="alertdialog"], .agy-dialog, .settings-modal-container';

  var WELCOME_LOGO_NON_CHAT_PAGE_SEL =
    '[data-testid="customizations-search"], [data-testid="customizations-marketplace"], ' +
    '[data-testid="customizations-installed"], [data-testid="plugin-detail"]';

  var WELCOME_LOGO_EXCLUDE_ANCESTOR = [
    'button', 'a', 'input', 'textarea', 'select', 'label',
    '[role="button"]', '[role="link"]', '[role="menuitem"]', '[role="tab"]', '[contenteditable="true"]',
    '[data-testid="agent-input-box"]', '.surface-composer-card', '.agy-composer', '.composer-dock',
    '#antigravity\\.agentSidePanelInputBox', 'form',
    '[data-testid="title-menu-bar"]', '.part.titlebar',
    '[data-testid="sidebar-split"] > div:first-child', '.agy-sidebar', '[role="navigation"]',
    '[data-testid="conversation-list-sidebar"]',
    '[data-side-panel-body]', '[data-side-panel-strip]', '[data-testid="side-panel-new-tab-view"]',
    '[data-testid="aux-pane-split"] > :last-child:not(:first-child)',
    'pre', 'code', '.md-code-block', '.code-block', '.xterm', '[data-testid="background-task-command"]',
    '.monaco-workbench', '.monaco-editor',
    '[role="dialog"]', '[role="alertdialog"]', '[role="menu"]', '[role="listbox"]', '[role="tooltip"]',
    '.agy-dialog', '.settings-modal-container', '[data-testid="media-modal"]', '[data-radix-popper-content-wrapper]',
    '#' + STAGE_ID, '#agy-prism-popover', '#agy-prism-pill', '#' + WCO_PILL_ID, '#' + TOPBAR_PILLS_ID,
    '#gemini-neko-pet-root', '#ag-usage-monitor-capsule', '#ag-context-meter', '#deck-metrics-strip',
  ].join(', ');

  var WELCOME_LOGO_OBS_IGNORE_ANCESTOR = [
    '#' + STAGE_ID, '#agy-prism-popover', '#agy-prism-pill', '#' + WCO_PILL_ID, '#' + TOPBAR_PILLS_ID,
    '#gemini-neko-pet-root', '#ag-usage-monitor-capsule', '#ag-context-meter', '#deck-metrics-strip',
    '[data-testid="sidebar-split"] > div:first-child', '.agy-sidebar',
    '[data-side-panel-body]', '[data-side-panel-strip]',
  ].join(', ');

  var NON_EMPTY_CHAT_SEL = [
    '.msg-user', '.msg-agent',
    '[data-message-id]', '[data-turn-id]',
    '[data-role="user"]', '[data-role="assistant"]',
    '[data-testid="user-message"]', '[data-testid="assistant-message"]',
    '[data-testid*="message-row"]', '[data-testid*="chat-turn"]',
    '[data-testid*="tool-call"]', '[data-testid*="thought-block"]',
    'pre', 'code', '.md-code-block', '.code-block', '.xterm',
    '[data-testid="background-task-command"]',
    'article', 'blockquote', 'table',
  ].join(', ');

  var NON_NARRATIVE_SUBTREE =
    '[data-testid="agent-input-box"], .surface-composer-card, .agy-composer, .composer-dock, button, a, [role="button"], [role="link"]';

  var COMPOSER_SUBTREE_SEL =
    '[data-testid="agent-input-box"], .surface-composer-card, .agy-composer, .composer-dock';

  // Req #4 / v2.2.0: 8-Region Unified Glass & Typography Constants & Per-Wallpaper Override Keys
  var REGION_IDS = ['topbar', 'wco', 'sidebar', 'workspace', 'card', 'composer', 'rightPane', 'popover'];
  var SURFACE_TINT_COMPONENTS = REGION_IDS;
  var GLASS_COMPONENT_IDS = REGION_IDS;
  var BORDER_STYLES = ['full', 'bottom', 'none'];
  var SIDEBAR_LIST_STYLES = ['capsule', 'underline', 'accordion', 'tree'];
  var REGION_OPTICAL_KEYS = ['glassEnabled', 'blur', 'opacity', 'tone', 'tint', 'borderOpacity'];
  var REGION_STRUCTURAL_KEYS = ['borderStyle', 'radius', 'fontSize', 'fontFamily', 'fontColor', 'allowRawFontColor'];
  var SIDEBAR_REGION_EXTRA_KEYS = ['listStyle', 'sectionFontSize', 'projectFontSize', 'itemFontSize'];
  var SURFACE_TINT_BOUNDS = {
    topbar: { minOpacity: 0, maxOpacity: 0.98 },
    wco: { minOpacity: 0, maxOpacity: 0.98 },
    sidebar: { minOpacity: 0, maxOpacity: 0.98 },
    workspace: { minOpacity: 0, maxOpacity: 0.98 },
    card: { minOpacity: 0, maxOpacity: 0.98 },
    composer: { minOpacity: 0, maxOpacity: 0.98 },
    rightPane: { minOpacity: 0, maxOpacity: 0.98 },
    popover: { minOpacity: 0.50, maxOpacity: 0.99 },
  };
  var REGION_FONT_SIZE_BOUNDS = {
    topbar: { min: 10, max: 24 },
    wco: { min: 10, max: 24 },
    sidebar: { min: 11, max: 15 },
    workspace: { min: 10, max: 24 },
    card: { min: 10, max: 24 },
    composer: { min: 10, max: 24 },
    rightPane: { min: 10, max: 24 },
    popover: { min: 10, max: 24 },
  };
  var PER_WALLPAPER_OVERRIDE_KEYS_MAP = {
    layoutMode: 1,
    colorScheme: 1,
    accentMode: 1,
    customAccent: 1,
    glassOpacity: 1,
    glassBlur: 1,
    sidebarOpacity: 1,
    sidebarBlur: 1,
    regions: 1,
    surfaceTints: 1,
    globalFontSize: 1,
    globalFontFamily: 1,
    globalFontColor: 1,
    scrimOpacity: 1,
    mediaOpacity: 1,
    mediaBlur: 1,
    mediaBrightness: 1,
    mediaContrast: 1,
    mediaSaturate: 1,
    grainAlpha: 1,
    vignette: 1,
    fit: 1,
    flip: 1,
    layerPosX: 1,
    layerPosY: 1,
    layerScale: 1,
    playbackRate: 1,
    volume: 1,
    muted: 1,
  };
  var FAST_OPTICAL_KEYS_MAP = {
    glassBlur: 1,
    sidebarBlur: 1,
    glassOpacity: 1,
    sidebarOpacity: 1,
    scrimOpacity: 1,
    scrimColor: 1,
    vignette: 1,
    accentMode: 1,
    customAccent: 1,
    wallTintMix: 1,
    glassFidelity: 1,
    chatGlassFidelity: 1,
    contrastFloor: 1,
    floaterSolidBase: 1,
    regions: 1,
    surfaceTints: 1,
    globalFontSize: 1,
    globalFontFamily: 1,
    globalFontColor: 1,
    sidebarListStyle: 1,
    sidebarTypographyMode: 1,
    sidebarFontSize: 1,
    leftSidebarRadius: 1,
    rightSidebarRadius: 1,
    preset: 1,
    mediaBlur: 1,
    mediaOpacity: 1,
    mediaBrightness: 1,
    mediaContrast: 1,
    mediaSaturate: 1,
    grainAlpha: 1,
    filterPreset: 1,
  };

  var SOLID_POPOVERS = [
    '.agy-dialog',
    '.settings-modal-container',
    '.agy-overlay',
    '.agy-popover',
    '.agy-menu',
    '.agy-toast',
    '[role="dialog"]:not(#gemini-neko-observer-modal):not([data-testid="media-modal"]):not(.prism-sheet)',
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
  function contrastRatio(rgbA, rgbB) {
    var l1 = relLum(rgbA);
    var l2 = relLum(rgbB);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }
  function enforceContrastFloorRgb(rgb, fgRgb, isLight, minRatio) {
    var target = minRatio || 4.5;
    if (contrastRatio(rgb, fgRgb) >= target) return rgb;
    var anchor = isLight ? [255, 255, 255] : [0, 0, 0];
    var lo = 0;
    var hi = 1;
    var best = anchor;
    for (var step = 0; step < 12; step += 1) {
      var mid = (lo + hi) * 0.5;
      var cand = mixRgb(rgb, anchor, mid);
      if (contrastRatio(cand, fgRgb) >= target) {
        best = cand;
        hi = mid;
      } else {
        lo = mid;
      }
    }
    return best;
  }
  function enforceFgContrastRgb(fgRgb, bgRgb, isLight, minRatio) {
    var target = Number.isFinite(minRatio) && minRatio > 1 ? minRatio : 4.5;
    if (contrastRatio(fgRgb, bgRgb) >= target) return [fgRgb[0], fgRgb[1], fgRgb[2]];
    var primaryAnchor = isLight ? [15, 23, 42] : [255, 255, 255];
    var altAnchor = isLight ? [255, 255, 255] : [15, 23, 42];
    var anchor =
      contrastRatio(primaryAnchor, bgRgb) >= target ||
      contrastRatio(primaryAnchor, bgRgb) >= contrastRatio(altAnchor, bgRgb)
        ? primaryAnchor
        : altAnchor;
    var lo = 0;
    var hi = 1;
    var best = anchor;
    for (var step = 0; step < 12; step += 1) {
      var mid = (lo + hi) * 0.5;
      var cand = mixRgb(fgRgb, anchor, mid);
      if (contrastRatio(cand, bgRgb) >= target) {
        best = cand;
        hi = mid;
      } else {
        lo = mid;
      }
    }
    return best;
  }
  var FONT_FAMILY_FORBIDDEN_CHARS_RE = /[;{}()\\/<>\r\n\0`]/;
  var FONT_FAMILY_FORBIDDEN_KW_RE = /\b(?:url|expression|javascript|vbscript|behavior)\b|@import/i;
  var FONT_FAMILY_TOKEN_RE = /^[a-zA-Z0-9\u4e00-\u9fff _-]+$/;
  var GENERIC_FONT_FAMILIES = {
    serif: 1,
    'sans-serif': 1,
    monospace: 1,
    cursive: 1,
    fantasy: 1,
    'system-ui': 1,
    'ui-sans-serif': 1,
    'ui-serif': 1,
    'ui-monospace': 1,
    'ui-rounded': 1,
  };
  function sanitizeFontFamily(raw) {
    if (typeof raw !== 'string') return '';
    var trimmed = raw.trim();
    if (!trimmed) return '';
    if (FONT_FAMILY_FORBIDDEN_CHARS_RE.test(trimmed) || FONT_FAMILY_FORBIDDEN_KW_RE.test(trimmed)) return '';
    var parts = trimmed.split(',');
    var families = [];
    var seen = Object.create(null);
    for (var i = 0; i < parts.length; i += 1) {
      var tok = parts[i].trim();
      if (!tok) continue;
      if ((tok.charAt(0) === "'" && tok.charAt(tok.length - 1) === "'") || (tok.charAt(0) === '"' && tok.charAt(tok.length - 1) === '"')) {
        tok = tok.slice(1, -1).trim();
      }
      tok = tok.replace(/\s+/g, ' ');
      if (!tok || tok.length > 64) continue;
      if (FONT_FAMILY_FORBIDDEN_KW_RE.test(tok) || !FONT_FAMILY_TOKEN_RE.test(tok)) continue;
      var lower = tok.toLowerCase();
      if (seen[lower]) continue;
      seen[lower] = 1;
      if (GENERIC_FONT_FAMILIES[lower]) families.push(lower);
      else if (/\s/.test(tok) || /[\u4e00-\u9fff]/.test(tok)) families.push("'" + tok + "'");
      else families.push(tok);
      if (families.length >= 6) break;
    }
    while (families.length > 0) {
      var joined = families.join(', ');
      if (joined.length <= 120) return joined;
      families.pop();
    }
    return '';
  }
  function adaptCustomTintRgb(hexStr, isLight, contrastFloor) {
    var raw = hexToRgb(hexStr);
    if (!raw) return null;
    if (!contrastFloor) return raw;
    var hsl = rgbToHsl(raw[0], raw[1], raw[2]);
    var h = hsl[0];
    var s = hsl[1];
    var l = hsl[2];
    if (!isLight) {
      if (l > 0.24) {
        return hslToRgb(h, Math.min(s, 0.65), clamp(0.06 + (1 - l) * 0.18, 0.04, 0.24));
      }
      return raw;
    }
    if (l < 0.74) {
      return hslToRgb(h, Math.min(s, 0.45), clamp(0.96 - l * 0.22, 0.74, 0.96));
    }
    return raw;
  }
  function applyToneShiftRgb(rgb, tone, isLight) {
    var t = clamp(Math.round(num(tone, 0)), -100, 100);
    if (t === 0) return rgb;
    if (!isLight) {
      return t < 0
        ? mixRgb(rgb, [0, 0, 0], Math.abs(t) / 100)
        : mixRgb(rgb, [92, 98, 114], (t / 100) * 0.85);
    }
    return t < 0
      ? mixRgb(rgb, [176, 186, 202], (Math.abs(t) / 100) * 0.85)
      : mixRgb(rgb, [255, 255, 255], t / 100);
  }
  function cleanTintHex(v) {
    if (typeof v !== 'string') return '';
    var s = v.trim();
    if (!s || s.toLowerCase() === 'auto') return '';
    var m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
    if (!m) return '';
    var h = m[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return '#' + h.toUpperCase();
  }
  function nullableUnitOpacity(v, min, max) {
    if (v === null || v === undefined || v === '' || v === 'auto') return null;
    var s = typeof v === 'string' ? v.trim() : null;
    if (s === '' || s === 'auto') return null;
    var n = s !== null ? Number(s) : v;
    if (typeof n !== 'number' || !Number.isFinite(n)) return null;
    if (n >= 2) n = n / 100;
    return Math.round(clamp(n, min, max) * 1000) / 1000;
  }
  function hasOwn(obj, key) {
    return Boolean(obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, key));
  }
  function isPlainObj(v) {
    return Boolean(v && typeof v === 'object' && !Array.isArray(v));
  }
  function nullableBool(v) {
    if (v === null || v === undefined || v === '' || v === 'auto') return null;
    if (typeof v === 'boolean') return v;
    if (v === 'on' || v === 'true' || v === 1) return true;
    if (v === 'off' || v === 'false' || v === 0) return false;
    return null;
  }
  function nullableNum(v, min, max, decimals) {
    if (v === null || v === undefined || v === '' || v === 'auto') return null;
    var s = typeof v === 'string' ? v.trim() : null;
    if (s === '' || s === 'auto') return null;
    var n = s !== null ? Number(s) : v;
    if (typeof n !== 'number' || !Number.isFinite(n)) return null;
    var c = clamp(n, min, max);
    var f = Math.pow(10, decimals || 0);
    return Math.round(c * f) / f;
  }
  function oneOf(v, list, fallback) {
    return list.indexOf(v) >= 0 ? v : fallback;
  }
  function sanitizeSidebarRadius(v, fallback) {
    var dflt = fallback || 'auto';
    if (v === null || v === undefined || v === '') return dflt;
    var s = String(v).trim().toLowerCase();
    if (s === 'auto') return 'auto';
    if (s === 'native') return 'native';
    if (/^-?\d+(?:\.\d+)?$/.test(s)) {
      return String(Math.round(clamp(Number(s), 0, 28)));
    }
    return dflt;
  }
  function createDefaultRegionEntry(id) {
    var out = {
      glassEnabled: null,
      blur: null,
      opacity: null,
      tone: 0,
      tint: '',
      borderOpacity: null,
      borderStyle: null,
      radius: null,
      fontSize: null,
      fontFamily: '',
      fontColor: '',
      allowRawFontColor: false,
    };
    if (id === 'sidebar') {
      out.listStyle = 'capsule';
      out.sectionFontSize = null;
      out.projectFontSize = null;
      out.itemFontSize = null;
    }
    return out;
  }
  function createDefaultRegions() {
    var out = {};
    for (var i = 0; i < REGION_IDS.length; i += 1) {
      out[REGION_IDS[i]] = createDefaultRegionEntry(REGION_IDS[i]);
    }
    return out;
  }
  function createDefaultSurfaceTints() {
    var out = {};
    for (var i = 0; i < GLASS_COMPONENT_IDS.length; i += 1) {
      out[GLASS_COMPONENT_IDS[i]] = {
        opacity: null,
        tone: 0,
        tint: '',
        blur: null,
        glassEnabled: null,
        borderOpacity: null,
      };
    }
    return out;
  }
  function mergeSurfaceTintsRaw(baseTints, patchTints) {
    if (patchTints === null) return null;
    var out = {};
    var bMap = isPlainObj(baseTints) ? baseTints : {};
    var pMap = isPlainObj(patchTints) ? patchTints : {};
    for (var i = 0; i < GLASS_COMPONENT_IDS.length; i += 1) {
      var id = GLASS_COMPONENT_IDS[i];
      var hasB = hasOwn(bMap, id);
      var hasP = hasOwn(pMap, id);
      if (hasP && pMap[id] === null) {
        out[id] = null;
        continue;
      }
      if (!hasB && !hasP) continue;
      var bEnt = hasB && isPlainObj(bMap[id]) ? bMap[id] : {};
      var pEnt = hasP && isPlainObj(pMap[id]) ? pMap[id] : {};
      var mergedEnt = {};
      var bk;
      for (bk in bEnt) if (hasOwn(bEnt, bk)) mergedEnt[bk] = bEnt[bk];
      for (bk in pEnt) if (hasOwn(pEnt, bk) && pEnt[bk] !== undefined) mergedEnt[bk] = pEnt[bk];
      out[id] = mergedEnt;
    }
    return out;
  }
  function mergeRegionsRaw(baseMap, patchMap) {
    if (patchMap === null) return null;
    var out = {};
    var bMap = isPlainObj(baseMap) ? baseMap : {};
    var pMap = isPlainObj(patchMap) ? patchMap : {};
    for (var i = 0; i < GLASS_COMPONENT_IDS.length; i += 1) {
      var id = GLASS_COMPONENT_IDS[i];
      var hasB = hasOwn(bMap, id);
      var hasP = hasOwn(pMap, id);
      if (hasP && pMap[id] === null) {
        out[id] = null;
        continue;
      }
      if (!hasB && !hasP) continue;
      var bEnt = hasB && isPlainObj(bMap[id]) ? bMap[id] : {};
      var pEnt = hasP && isPlainObj(pMap[id]) ? pMap[id] : {};
      var mergedEnt = {};
      var k;
      for (k in bEnt) if (hasOwn(bEnt, k)) mergedEnt[k] = bEnt[k];
      for (k in pEnt) if (hasOwn(pEnt, k) && pEnt[k] !== undefined) mergedEnt[k] = pEnt[k];
      out[id] = mergedEnt;
    }
    return out;
  }
  function stripOpticalFromRegionEntry(ent) {
    var next = {};
    if (isPlainObj(ent)) {
      for (var k in ent) if (hasOwn(ent, k)) next[k] = ent[k];
    }
    next.glassEnabled = null;
    next.blur = null;
    next.opacity = null;
    next.tone = 0;
    next.tint = '';
    next.borderOpacity = null;
    return next;
  }
  function stripOpticalFromRegionsRaw(regMap) {
    if (!isPlainObj(regMap)) return regMap;
    var out = {};
    for (var i = 0; i < GLASS_COMPONENT_IDS.length; i += 1) {
      var id = GLASS_COMPONENT_IDS[i];
      if (!hasOwn(regMap, id)) continue;
      out[id] = isPlainObj(regMap[id]) ? stripOpticalFromRegionEntry(regMap[id]) : regMap[id];
    }
    return out;
  }
  function pickOpticalKeysFromEntry(ent) {
    if (!isPlainObj(ent)) return null;
    var out = {};
    var any = false;
    for (var i = 0; i < REGION_OPTICAL_KEYS.length; i += 1) {
      var ok = REGION_OPTICAL_KEYS[i];
      if (hasOwn(ent, ok) && ent[ok] !== undefined) {
        out[ok] = ent[ok];
        any = true;
      }
    }
    return any ? out : null;
  }
  function sanitizeRegionEntry(id, raw) {
    var bounds = SURFACE_TINT_BOUNDS[id] || { minOpacity: 0, maxOpacity: 0.98 };
    var fsBounds = REGION_FONT_SIZE_BOUNDS[id] || { min: 10, max: 24 };
    var r = isPlainObj(raw) ? raw : {};
    var entry = {
      glassEnabled: nullableBool(r.glassEnabled),
      blur: nullableNum(r.blur, 0, 64, 0),
      opacity: nullableUnitOpacity(r.opacity, bounds.minOpacity, bounds.maxOpacity),
      tone: clamp(Math.round(num(r.tone, 0)), -100, 100),
      tint: cleanTintHex(r.tint),
      borderOpacity: nullableUnitOpacity(r.borderOpacity, 0, 1),
      borderStyle:
        r.borderStyle === null || r.borderStyle === undefined || r.borderStyle === '' || r.borderStyle === 'auto'
          ? null
          : oneOf(r.borderStyle, BORDER_STYLES, null),
      radius: nullableNum(r.radius, 0, 28, 0),
      fontSize: nullableNum(r.fontSize, fsBounds.min, fsBounds.max, 0),
      fontFamily: sanitizeFontFamily(r.fontFamily),
      fontColor: cleanTintHex(r.fontColor),
      allowRawFontColor: bool(r.allowRawFontColor, false),
    };
    if (id === 'sidebar') {
      entry.listStyle = oneOf(r.listStyle, SIDEBAR_LIST_STYLES, 'capsule');
      entry.sectionFontSize = nullableNum(r.sectionFontSize, 11, 15, 1);
      entry.projectFontSize = nullableNum(r.projectFontSize, 11, 15, 1);
      entry.itemFontSize = nullableNum(r.itemFontSize, 11, 15, 1);
    }
    return entry;
  }
  function projectSurfaceTintsFromRegions(regions) {
    var out = {};
    for (var i = 0; i < SURFACE_TINT_COMPONENTS.length; i += 1) {
      var id = SURFACE_TINT_COMPONENTS[i];
      var r = (regions && regions[id]) || {};
      out[id] = {
        opacity: r.opacity !== undefined ? r.opacity : null,
        tone: Number.isFinite(Number(r.tone)) ? Number(r.tone) : 0,
        tint: r.tint || '',
        blur: r.blur !== undefined ? r.blur : null,
        glassEnabled: r.glassEnabled !== undefined ? r.glassEnabled : null,
        borderOpacity: r.borderOpacity !== undefined ? r.borderOpacity : null,
      };
    }
    return out;
  }
  function syncSidebarRadiusPairLocal(opts) {
    var src = opts.src;
    var baseRegions = opts.baseRegions;
    var rawLegacyVal = opts.rawLegacyVal;
    var legacyKey = opts.legacyKey;
    var aliasKey = opts.aliasKey;
    var regionId = opts.regionId;
    var regions = opts.regions;
    var srcResetFullRegions = opts.srcResetFullRegions;

    var hasLegacy = hasOwn(src, legacyKey) || (aliasKey && hasOwn(src, aliasKey));
    var hasRegionEntry = isPlainObj(src.regions) && hasOwn(src.regions, regionId);
    var regionEntryRaw = hasRegionEntry ? src.regions[regionId] : undefined;
    var isExplicitRegionReset = srcResetFullRegions || (hasRegionEntry && regionEntryRaw === null);
    var hasRegionRad = isExplicitRegionReset || Boolean(isPlainObj(regionEntryRaw) && hasOwn(regionEntryRaw, 'radius'));
    var baseRegionRadius =
      baseRegions && isPlainObj(baseRegions[regionId]) && baseRegions[regionId].radius !== undefined
        ? baseRegions[regionId].radius
        : null;

    var legacyVal = sanitizeSidebarRadius(rawLegacyVal, 'auto');
    if (hasRegionRad && !hasLegacy) {
      if (regions[regionId].radius === null) {
        if (legacyVal === 'native' && baseRegionRadius === null && !isExplicitRegionReset) {
          legacyVal = 'native';
        } else {
          legacyVal = 'auto';
        }
      } else {
        legacyVal = String(regions[regionId].radius);
      }
    } else if (hasLegacy && !hasRegionRad) {
      if (legacyVal === 'auto' || legacyVal === 'native') {
        regions[regionId].radius = null;
      } else {
        regions[regionId].radius = Number(legacyVal);
      }
    } else if (hasRegionRad && hasLegacy) {
      if (srcResetFullRegions && legacyVal !== 'auto') {
        regions[regionId].radius = legacyVal === 'native' ? null : Number(legacyVal);
      } else if (legacyVal === 'native' && regions[regionId].radius === null) {
        legacyVal = 'native';
      } else {
        legacyVal = regions[regionId].radius === null ? 'auto' : String(regions[regionId].radius);
      }
    } else {
      if (legacyVal === 'native' && regions[regionId].radius === null) {
        legacyVal = 'native';
      } else if (regions[regionId].radius !== null) {
        legacyVal = String(regions[regionId].radius);
      } else if (legacyVal !== 'auto') {
        regions[regionId].radius = Number(legacyVal);
      }
    }
    return legacyVal;
  }
  function sanitizeRegionsWithSync(srcObj, baseRegResult) {
    var src = isPlainObj(srcObj) ? srcObj : {};
    var bRes = isPlainObj(baseRegResult) ? baseRegResult : null;
    var baseRegions = bRes && isPlainObj(bRes.regions) ? bRes.regions : null;

    var hasSrcRegions = hasOwn(src, 'regions');
    var srcResetFullRegions = hasSrcRegions && src.regions === null;
    var hasSrcTints = hasOwn(src, 'surfaceTints');
    var srcResetAllTints = hasSrcTints && src.surfaceTints === null;

    var workingRegions = {};
    var i;
    var id;
    for (i = 0; i < REGION_IDS.length; i += 1) {
      id = REGION_IDS[i];
      workingRegions[id] = baseRegions && isPlainObj(baseRegions[id]) ? sanitizeRegionEntry(id, baseRegions[id]) : createDefaultRegionEntry(id);
    }

    if (srcResetFullRegions) {
      for (i = 0; i < REGION_IDS.length; i += 1) {
        workingRegions[REGION_IDS[i]] = createDefaultRegionEntry(REGION_IDS[i]);
      }
    } else if (srcResetAllTints) {
      for (i = 0; i < REGION_IDS.length; i += 1) {
        workingRegions[REGION_IDS[i]] = stripOpticalFromRegionEntry(workingRegions[REGION_IDS[i]]);
      }
    }

    if (!srcResetFullRegions && hasSrcTints && isPlainObj(src.surfaceTints)) {
      for (i = 0; i < REGION_IDS.length; i += 1) {
        id = REGION_IDS[i];
        if (!hasOwn(src.surfaceTints, id)) continue;
        var sRaw = src.surfaceTints[id];
        if (sRaw === null) {
          workingRegions[id] = stripOpticalFromRegionEntry(workingRegions[id]);
        } else if (isPlainObj(sRaw)) {
          for (var ok = 0; ok < REGION_OPTICAL_KEYS.length; ok += 1) {
            var optKey = REGION_OPTICAL_KEYS[ok];
            if (hasOwn(sRaw, optKey)) workingRegions[id][optKey] = sRaw[optKey];
          }
        }
      }
    }

    if (!srcResetFullRegions && hasSrcRegions && isPlainObj(src.regions)) {
      for (i = 0; i < REGION_IDS.length; i += 1) {
        id = REGION_IDS[i];
        if (!hasOwn(src.regions, id)) continue;
        var rRaw = src.regions[id];
        if (rRaw === null) {
          workingRegions[id] = createDefaultRegionEntry(id);
        } else if (isPlainObj(rRaw)) {
          var allowed = id === 'sidebar'
            ? REGION_OPTICAL_KEYS.concat(REGION_STRUCTURAL_KEYS, SIDEBAR_REGION_EXTRA_KEYS)
            : REGION_OPTICAL_KEYS.concat(REGION_STRUCTURAL_KEYS);
          for (var ak = 0; ak < allowed.length; ak += 1) {
            var pk = allowed[ak];
            if (hasOwn(rRaw, pk)) workingRegions[id][pk] = rRaw[pk];
          }
        }
      }
    }

    var regions = {};
    for (i = 0; i < REGION_IDS.length; i += 1) {
      id = REGION_IDS[i];
      regions[id] = sanitizeRegionEntry(id, workingRegions[id]);
    }

    var srcResetAllOptical = srcResetFullRegions || srcResetAllTints;
    var srcResetRegionSidebar = srcResetFullRegions || (hasSrcRegions && isPlainObj(src.regions) && src.regions.sidebar === null);
    var srcRegionsObj = hasSrcRegions && isPlainObj(src.regions) ? src.regions : null;
    var srcTintsObj = hasSrcTints && isPlainObj(src.surfaceTints) ? src.surfaceTints : null;

    // (i) 4-branch sync: `sidebarOpacity` <-> `regions.sidebar.opacity`
    var srcTouchedLegacySbOp = hasOwn(src, 'sidebarOpacity');
    var srcTouchedSidebarOp =
      srcResetAllOptical ||
      Boolean(srcRegionsObj && (srcRegionsObj.sidebar === null || (isPlainObj(srcRegionsObj.sidebar) && hasOwn(srcRegionsObj.sidebar, 'opacity')))) ||
      Boolean(srcTintsObj && (srcTintsObj.sidebar === null || (isPlainObj(srcTintsObj.sidebar) && hasOwn(srcTintsObj.sidebar, 'opacity'))));
    var rawSbOp = srcTouchedLegacySbOp ? src.sidebarOpacity : (bRes ? bRes.sidebarOpacity : undefined);
    var sidebarOpacity = nullableUnitOpacity(rawSbOp, 0, 0.98);
    if (srcTouchedSidebarOp && !srcTouchedLegacySbOp) {
      sidebarOpacity = regions.sidebar.opacity;
    } else if (srcTouchedLegacySbOp && !srcTouchedSidebarOp) {
      regions.sidebar.opacity = sidebarOpacity;
    } else if (srcTouchedSidebarOp && srcTouchedLegacySbOp) {
      if (srcResetAllOptical && sidebarOpacity !== null) regions.sidebar.opacity = sidebarOpacity;
      else sidebarOpacity = regions.sidebar.opacity;
    } else {
      if (regions.sidebar.opacity === null && sidebarOpacity !== null) regions.sidebar.opacity = sidebarOpacity;
      else sidebarOpacity = regions.sidebar.opacity;
    }

    // (ii) 4-branch sync: `sidebarBlur` <-> `regions.sidebar.blur`
    var srcTouchedLegacySbBlur = hasOwn(src, 'sidebarBlur');
    var srcTouchedSidebarBlur =
      srcResetAllOptical ||
      Boolean(srcRegionsObj && (srcRegionsObj.sidebar === null || (isPlainObj(srcRegionsObj.sidebar) && hasOwn(srcRegionsObj.sidebar, 'blur')))) ||
      Boolean(srcTintsObj && (srcTintsObj.sidebar === null || (isPlainObj(srcTintsObj.sidebar) && hasOwn(srcTintsObj.sidebar, 'blur'))));
    var rawSbBlur = srcTouchedLegacySbBlur ? src.sidebarBlur : (bRes ? bRes.sidebarBlur : undefined);
    var sidebarBlur = nullableNum(rawSbBlur, 0, 64, 0);
    if (srcTouchedSidebarBlur && !srcTouchedLegacySbBlur) {
      sidebarBlur = regions.sidebar.blur;
    } else if (srcTouchedLegacySbBlur && !srcTouchedSidebarBlur) {
      regions.sidebar.blur = sidebarBlur;
    } else if (srcTouchedSidebarBlur && srcTouchedLegacySbBlur) {
      if (srcResetAllOptical && sidebarBlur !== null) regions.sidebar.blur = sidebarBlur;
      else sidebarBlur = regions.sidebar.blur;
    } else {
      if (regions.sidebar.blur === null && sidebarBlur !== null) regions.sidebar.blur = sidebarBlur;
      else sidebarBlur = regions.sidebar.blur;
    }

    // (iii) 4-branch sync: `sidebarFontSize` <-> `regions.sidebar.fontSize`
    var srcTouchedLegacySbFs = hasOwn(src, 'sidebarFontSize');
    var srcTouchedSidebarFs =
      srcResetRegionSidebar ||
      Boolean(srcRegionsObj && isPlainObj(srcRegionsObj.sidebar) && hasOwn(srcRegionsObj.sidebar, 'fontSize'));
    var rawSbFs = srcTouchedLegacySbFs ? src.sidebarFontSize : (bRes ? bRes.sidebarFontSize : undefined);
    var sidebarFontSize = nullableNum(rawSbFs, 11, 15, 0);
    if (srcTouchedSidebarFs && !srcTouchedLegacySbFs) {
      sidebarFontSize = regions.sidebar.fontSize;
    } else if (srcTouchedLegacySbFs && !srcTouchedSidebarFs) {
      regions.sidebar.fontSize = sidebarFontSize;
    } else if (srcTouchedSidebarFs && srcTouchedLegacySbFs) {
      if (srcResetFullRegions && sidebarFontSize !== null) regions.sidebar.fontSize = sidebarFontSize;
      else sidebarFontSize = regions.sidebar.fontSize;
    } else {
      if (regions.sidebar.fontSize === null && sidebarFontSize !== null) regions.sidebar.fontSize = sidebarFontSize;
      else sidebarFontSize = regions.sidebar.fontSize;
    }

    // (iv) 4-branch sync: `sidebarListStyle` <-> `regions.sidebar.listStyle` (default 'capsule'; preserved across `surfaceTints: null`)
    var srcTouchedLegacySbList = hasOwn(src, 'sidebarListStyle');
    var srcTouchedSidebarList =
      srcResetRegionSidebar ||
      Boolean(srcRegionsObj && isPlainObj(srcRegionsObj.sidebar) && hasOwn(srcRegionsObj.sidebar, 'listStyle'));
    var rawSbList = srcTouchedLegacySbList ? src.sidebarListStyle : (bRes ? bRes.sidebarListStyle : 'capsule');
    var sidebarListStyle = oneOf(rawSbList, SIDEBAR_LIST_STYLES, 'capsule');
    if (srcTouchedSidebarList && !srcTouchedLegacySbList) {
      sidebarListStyle = regions.sidebar.listStyle;
    } else if (srcTouchedLegacySbList && !srcTouchedSidebarList) {
      regions.sidebar.listStyle = sidebarListStyle;
    } else if (srcTouchedSidebarList && srcTouchedLegacySbList) {
      if (srcResetFullRegions && sidebarListStyle !== 'capsule') regions.sidebar.listStyle = sidebarListStyle;
      else sidebarListStyle = regions.sidebar.listStyle;
    } else {
      if (!baseRegions && !srcRegionsObj && regions.sidebar.listStyle === 'capsule' && sidebarListStyle !== 'capsule') {
        regions.sidebar.listStyle = sidebarListStyle;
      } else {
        sidebarListStyle = regions.sidebar.listStyle;
      }
    }

    // (v) `leftSidebarRadius` <-> `regions.sidebar.radius` & `rightSidebarRadius` <-> `regions.rightPane.radius`
    var rawLeftRad = hasOwn(src, 'leftSidebarRadius')
      ? src.leftSidebarRadius
      : hasOwn(src, 'leftSidebarCornerRadius')
        ? src.leftSidebarCornerRadius
        : (bRes ? bRes.leftSidebarRadius : 'auto');
    var rawRightRad = hasOwn(src, 'rightSidebarRadius')
      ? src.rightSidebarRadius
      : hasOwn(src, 'rightSidebarCornerRadius')
        ? src.rightSidebarCornerRadius
        : (bRes ? bRes.rightSidebarRadius : 'auto');
    var leftSidebarRadius = syncSidebarRadiusPairLocal({
      src: src,
      baseRegions: baseRegions,
      rawLegacyVal: rawLeftRad,
      legacyKey: 'leftSidebarRadius',
      aliasKey: 'leftSidebarCornerRadius',
      regionId: 'sidebar',
      regions: regions,
      srcResetFullRegions: srcResetFullRegions,
    });
    var rightSidebarRadius = syncSidebarRadiusPairLocal({
      src: src,
      baseRegions: baseRegions,
      rawLegacyVal: rawRightRad,
      legacyKey: 'rightSidebarRadius',
      aliasKey: 'rightSidebarCornerRadius',
      regionId: 'rightPane',
      regions: regions,
      srcResetFullRegions: srcResetFullRegions,
    });

    return {
      regions: regions,
      surfaceTints: projectSurfaceTintsFromRegions(regions),
      sidebarOpacity: sidebarOpacity,
      sidebarBlur: sidebarBlur,
      sidebarFontSize: sidebarFontSize,
      sidebarListStyle: sidebarListStyle,
      leftSidebarRadius: leftSidebarRadius,
      rightSidebarRadius: rightSidebarRadius,
    };
  }
  function resolveComponentSurface(opts) {
    var entry = opts.entry || { opacity: null, tone: 0, tint: '' };
    var bounds = opts.bounds || { minOpacity: 0, maxOpacity: 0.98 };
    var isLight = Boolean(opts.isLight);
    var contrastFloor = Boolean(opts.contrastFloor);
    var fgRgb = opts.fgRgb || (isLight ? [15, 23, 42] : [242, 242, 245]);
    var baseOrTint = (entry.tint ? adaptCustomTintRgb(entry.tint, isLight, contrastFloor) : null) || opts.defaultRgb;
    var shiftedRgb = applyToneShiftRgb(baseOrTint, entry.tone, isLight);
    var hasToneOrTint = Boolean(entry.tint) || Number(entry.tone || 0) !== 0;
    var preMixRgb = hasToneOrTint && contrastFloor ? enforceContrastFloorRgb(shiftedRgb, fgRgb, isLight, 4.5) : shiftedRgb;
    var mixedRgb = entry.tint ? preMixRgb : mixRgb(preMixRgb, opts.wallTintRgb, opts.wallMixWeight);
    var finalRgb = hasToneOrTint && contrastFloor ? enforceContrastFloorRgb(mixedRgb, fgRgb, isLight, 4.5) : mixedRgb;
    var hasCustomOp = entry.opacity !== null && entry.opacity !== undefined;
    var alpha = opts.solidChrome
      ? 1
      : hasCustomOp
        ? clamp(entry.opacity, bounds.minOpacity, bounds.maxOpacity)
        : clamp(opts.defaultAlpha, 0, 0.99);
    return {
      preMixRgb: preMixRgb,
      rgb: finalRgb,
      alpha: alpha,
      rgba: rgbaStr(finalRgb, alpha),
      customized: hasCustomOp || hasToneOrTint,
      hasCustomOp: hasCustomOp,
      hasToneOrTint: hasToneOrTint,
    };
  }
  function resolveRegionBlurPx(entry, defaultPx, globalGlassOn, mediaBlurPx) {
    var glassOn = entry && entry.glassEnabled !== null && entry.glassEnabled !== undefined
      ? Boolean(entry.glassEnabled)
      : Boolean(globalGlassOn);
    if (!glassOn) return 0;
    var raw = entry && entry.blur !== null && entry.blur !== undefined
      ? clamp(Math.round(Number(entry.blur)), 0, 64)
      : clamp(Math.round(Number(defaultPx) || 0), 0, 64);
    if (raw <= 0) return 0;
    return mediaBlurPx > 0 ? Math.max(0, Math.round(raw - mediaBlurPx * 0.7)) : raw;
  }
  function computeBorderFactor(alpha, bScale, overrideBorderOp) {
    if (overrideBorderOp !== null && overrideBorderOp !== undefined) {
      return clamp(Number(overrideBorderOp), 0, 1);
    }
    if (bScale <= 0 || alpha <= 0.005) return 0;
    return bScale * Math.pow(clamp(alpha / 0.80, 0, 1), 0.90);
  }
  function computeShadowFactor(alpha, shadowsOn) {
    if (!shadowsOn || alpha <= 0.01) return 0;
    return Math.pow(clamp(alpha / 0.65, 0, 1), 1.15);
  }
  function resolveBorderWidths(borderStyle) {
    if (borderStyle === 'none') return { top: '0px', right: '0px', bottom: '0px', left: '0px' };
    if (borderStyle === 'bottom') return { top: '0px', right: '0px', bottom: '1px', left: '0px' };
    return { top: '1px', right: '1px', bottom: '1px', left: '1px' };
  }
  function buildRegionEdgeTokens(opts) {
    var bf = opts.borderStyle === 'none' ? 0 : computeBorderFactor(opts.alpha, opts.bScale, opts.overrideBorderOp);
    var shadowsActive = opts.isPopover ? Boolean(opts.shadowsOn) : (opts.layoutMode !== 'flush' && Boolean(opts.shadowsOn));
    var sf = computeShadowFactor(opts.alpha, shadowsActive);
    var border = bf <= 0.001 ? 'transparent' : rgbaStr(opts.ptRgb, opts.baseBorderA * bf);
    var specular = bf <= 0.001 ? 'transparent' : rgbaStr([255, 255, 255], (opts.isLight ? 0.88 : 0.075) * bf);
    var sheen = bf <= 0.001
      ? 'none'
      : opts.isLight
        ? 'linear-gradient(172deg, rgba(255, 255, 255, ' + (0.68 * bf).toFixed(3) + ') 0%, rgba(255, 255, 255, 0) 40%)'
        : 'linear-gradient(172deg, rgba(255, 255, 255, ' + (0.042 * bf).toFixed(3) + ') 0%, rgba(255, 255, 255, 0) 38%)';
    var shadow = 'none';
    if (sf > 0.001) {
      if (opts.isPopover) {
        shadow = opts.isLight
          ? '0 28px 64px -18px rgba(15, 23, 42, ' + (0.28 * sf).toFixed(3) + '), 0 2px 8px rgba(15, 23, 42, ' + (0.10 * sf).toFixed(3) + ')'
          : '0 28px 64px -14px rgba(0, 0, 0, ' + (0.64 * sf).toFixed(3) + '), 0 2px 8px rgba(0, 0, 0, ' + (0.30 * sf).toFixed(3) + ')';
      } else {
        shadow = opts.isLight
          ? '0 10px 28px -10px rgba(15, 23, 42, ' + (0.14 * sf).toFixed(3) + '), 0 2px 6px rgba(15, 23, 42, ' + (0.06 * sf).toFixed(3) + ')'
          : '0 10px 28px -8px rgba(0, 0, 0, ' + (0.46 * sf).toFixed(3) + '), 0 2px 6px rgba(0, 0, 0, ' + (0.24 * sf).toFixed(3) + ')';
      }
    }
    return {
      bf: bf,
      sf: sf,
      border: border,
      specular: specular,
      sheen: sheen,
      shadow: shadow,
      widths: resolveBorderWidths(opts.borderStyle),
    };
  }
  function softKneeBlur(px) {
    var r = Math.round(clamp(px, 0, 64));
    if (r <= 0) return { r: 0, satBoost: 0 };
    if (r <= 28) return { r: r, satBoost: 0 };
    var gpuR = Math.min(32, Math.round(28 + (4 * (r - 28)) / (r - 28 + 12)));
    var satBoost = Math.round(Math.min(18, (r - 28) * 0.5));
    return { r: gpuR, satBoost: satBoost };
  }
  function buildBackdrop(px, light, isNested) {
    var rawR = Math.round(clamp(px, 0, 64));
    if (rawR <= 0) return 'none';
    var sk = softKneeBlur(rawR);
    var sat = isNested
      ? Math.round(100 + Math.min(15, rawR * 0.25) + sk.satBoost * 0.4)
      : light
        ? Math.round(125 + Math.min(65, rawR * 1.45) + sk.satBoost)
        : Math.round(115 + Math.min(65, rawR * 1.35) + sk.satBoost);
    return 'blur(' + sk.r + 'px) saturate(' + sat + '%)';
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
    lastAppliedRev: 0,
    lastRevEpoch: '',
    degradedToPoster: false,
    degradeReason: '',
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
    deadPluginOrigins: Object.create(null),
    alivePluginOrigins: Object.create(null),
    transitionTimer: 0,
    lastHostFocus: null,
    lastSidecarSig: '',
    lastStructuralSig: '',
    lastCaretSig: '',
    lastWcoSig: '',
    lastWcoPillSig: '',
    wcoPillActive: false,
    wcoPillLeft: 0,
    lastTopbarPillSig: '',
    topbarMatchedBy: 'none',
    topbarAncCount: 0,
    topbarPillRects: [],
    topbarSyncRaf: 0,
    observedTopbarEl: null,
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
    lastAppliedStageClip: '',
    lastAppliedStageEl: null,
    lastAppliedFxClip: '',
    lastAppliedFxEl: null,
    holeObservedNodes: [],
    lastHoleTransitionRafAt: 0,
    welcomeLogoTimer: 0,
    welcomeLogoHiddenCount: 0,
    welcomeLogoObsTarget: null,
    welcomeLogoNonEmptyScopes: [],
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
  var welcomeLogoObs = null;
  var topbarResizeObs = null;
  var topbarMutObs = null;
  var topbarFontsHooked = false;
  var holeRaf = 0;
  var holeMutRaf = 0;
  var holeRafUntil = 0;
  var themeMq = null;
  var themeDebounce = 0;
  var batteryObj = null;
  var cleanups = [];
  var pointerMoveBound = false;

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

  function shouldAcceptStateRev(rawRev, rawEpoch) {
    if (rawRev === undefined || rawRev === null || rawRev === '') return true;
    var rev = Number(rawRev);
    if (!Number.isFinite(rev) || rev <= 0) return true;
    var ep = String(rawEpoch || '');
    if (ep && state.lastRevEpoch && ep !== state.lastRevEpoch) {
      state.lastAppliedRev = 0;
    }
    if (ep) state.lastRevEpoch = ep;
    if (rev < state.lastAppliedRev) return false;
    state.lastAppliedRev = Math.floor(rev);
    return true;
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
      var payloadData = msg.data && typeof msg.data === 'object' ? msg.data : {};
      if (
        (msg.stateRev !== undefined && payloadData.stateRev === undefined) ||
        (msg.stateEpoch !== undefined && payloadData.stateEpoch === undefined)
      ) {
        payloadData = Object.assign({}, payloadData);
        if (msg.stateRev !== undefined && payloadData.stateRev === undefined) payloadData.stateRev = msg.stateRev;
        if (msg.stateEpoch !== undefined && payloadData.stateEpoch === undefined) payloadData.stateEpoch = msg.stateEpoch;
      }
      applyPayload(payloadData);
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
      for (k in ov) {
        if (!Object.prototype.hasOwnProperty.call(ov, k) || ov[k] === undefined) continue;
        if (k === 'surfaceTints') {
          c.surfaceTints = ov.surfaceTints === null ? null : mergeSurfaceTintsRaw(base.surfaceTints, ov.surfaceTints);
        } else if (k === 'regions') {
          c.regions = ov.regions === null ? null : mergeRegionsRaw(base.regions, ov.regions);
        } else {
          c[k] = ov[k];
        }
      }
    }

    var baseRegSync = sanitizeRegionsWithSync(base, null);
    var effRegSync = ov ? sanitizeRegionsWithSync(ov, baseRegSync) : baseRegSync;

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
      leftCornerRadius: effRegSync.leftSidebarRadius,
      rightCornerRadius: effRegSync.rightSidebarRadius,
      borders: borders,
      shadows: bool(c.shadows, true),
      transparentWindowControls: bool(c.transparentWindowControls, true),
      hideWelcomeLogo: bool(c.hideWelcomeLogo, false),
      topbarStyle: c.topbarStyle === 'bar' ? 'bar' : 'pills',
      sidebarListStyle: effRegSync.sidebarListStyle,
      sidebarTypographyMode: c.sidebarTypographyMode === 'native' ? 'native' : 'balanced',
      sidebarFontSize: effRegSync.sidebarFontSize,
      globalFontSize: nullableNum(c.globalFontSize, 10, 24, 0),
      globalFontFamily: sanitizeFontFamily(c.globalFontFamily),
      globalFontColor: cleanTintHex(c.globalFontColor),
      themeMode: String(c.themeMode || 'auto').toLowerCase(),
      themeFollow: bool(c.themeFollow, false),
      colorScheme: schemeKey,
      accentMode: String(c.accentMode || 'dynamic').toLowerCase(),
      customAccent: String(c.customAccent || c.accent || '#669DF6'),
      extractedAccent: extAcc,
      wallTintMix: normUnit(c.wallTintMix != null ? c.wallTintMix : 0.06, 0.06, 0, 0.22),
      glassSurfaces: bool(c.glassSurfaces != null ? c.glassSurfaces : c.glassEnabled, true),
      glassOpacity: normUnit(c.glassOpacity != null ? c.glassOpacity : c.widgetFill != null ? c.widgetFill : 0.76, 0.76, 0.15, 0.98),
      glassBlur: clamp(num(c.glassBlur != null ? c.glassBlur : c.blur, 16), 0, 64),
      sidebarOpacity: effRegSync.sidebarOpacity,
      sidebarBlur: effRegSync.sidebarBlur,
      regions: effRegSync.regions,
      surfaceTints: effRegSync.surfaceTints,
      glassFidelity: normUnit(c.glassFidelity != null ? c.glassFidelity : 92, 0.92, 0, 1),
      chatGlassFidelity: normUnit(c.chatGlassFidelity != null ? c.chatGlassFidelity : 90, 0.90, 0, 1),
      scrimOpacity: normUnit(c.scrimOpacity != null ? c.scrimOpacity : c.scrim != null ? c.scrim : 0.26, 0.26, 0, 0.94),
      scrimColor: String(c.scrimColor || 'auto').trim(),
      vignette: bool(c.vignette, true),
      contrastFloor: bool(c.contrastFloor, true),
      floaterSolidBase: bool(c.floaterSolidBase, true),
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
      sceneLiveFps: clamp(num(c.sceneLiveFps, 30), 10, 60),
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
    var fgRgb = hexToRgb(S.fg) || (isLight ? [15, 23, 42] : [242, 242, 245]);

    var g = cfg.glassOpacity;
    var solidChrome = !cfg.glassSurfaces;
    var regions = cfg.regions || createDefaultRegions();

    var sbBaseRgb = !isLight && (shadeRgb[0] + shadeRgb[1] + shadeRgb[2] > baseRgb[0] + baseRgb[1] + baseRgb[2]) ? baseRgb : shadeRgb;
    var sbEntry = regions.sidebar || createDefaultRegionEntry('sidebar');
    var hasCustomSbOp = sbEntry.opacity !== null && sbEntry.opacity !== undefined;
    var globalMinSbFloor = cfg.contrastFloor ? (isLight ? 0.48 : 0.36) : 0.15;
    var minSidebarFloor = hasCustomSbOp ? 0 : globalMinSbFloor;
    var defaultSbAlpha = clamp(Math.max(g, minSidebarFloor * cfg.glassFidelity), 0, 0.99);
    var defaultTopbarAlpha = clamp(Math.max(g, globalMinSbFloor * cfg.glassFidelity), 0, 0.99);

    var rawChatA = cfg.layoutMode === 'flush' && !isLight ? clamp(g * 0.24, 0, 0.82) : isLight ? clamp(g * 0.62, 0.28, 0.92) : clamp(g * 0.42, 0.08, 0.88);
    var rawEditorA = isLight ? clamp(g * 0.96, 0.55, 0.99) : clamp(g * 0.92, 0.45, 0.98);
    var rawCardA = isLight ? clamp(g * 0.86, 0.50, 0.98) : clamp(g * 0.78, 0.32, 0.96);
    var rawCompA = isLight ? clamp(g * 0.94, 0.65, 0.99) : clamp(g * 0.92, 0.48, 0.98);

    var minChatFloor = isLight ? 0.42 : 0.16;
    var minEditorFloor = cfg.contrastFloor ? (isLight ? 0.84 : 0.72) : (isLight ? 0.52 : 0.38);
    var minCardFloor = isLight ? 0.62 : 0.48;
    var minCompFloor = isLight ? 0.72 : 0.58;

    var defaultChatAlpha = clamp(Math.max(rawChatA, minChatFloor * cfg.chatGlassFidelity), 0, 0.99);
    var defaultCardAlpha = clamp(Math.max(rawCardA, minCardFloor * cfg.glassFidelity), 0, 0.99);
    var defaultCompAlpha = clamp(Math.max(rawCompA, minCompFloor * cfg.glassFidelity), 0, 0.99);
    var defaultPopoverAlpha = cfg.floaterSolidBase !== false ? (isLight ? 0.97 : 0.96) : 0.94;
    var defaultQuickPanelAlpha = isLight ? 0.88 : 0.84;

    var topbarRes = resolveComponentSurface({
      entry: regions.topbar,
      defaultRgb: sbBaseRgb,
      fgRgb: fgRgb,
      wallTintRgb: acc.wallTint,
      wallMixWeight: cfg.wallTintMix * 0.75,
      defaultAlpha: defaultTopbarAlpha,
      bounds: SURFACE_TINT_BOUNDS.topbar,
      isLight: isLight,
      contrastFloor: cfg.contrastFloor,
      solidChrome: regions.topbar.glassEnabled === true ? false : solidChrome,
    });
    var wcoEntry = regions.wco;
    var wcoIsAuto =
      wcoEntry.opacity === null &&
      Number(wcoEntry.tone || 0) === 0 &&
      !wcoEntry.tint &&
      wcoEntry.blur === null &&
      wcoEntry.glassEnabled === null &&
      wcoEntry.borderOpacity === null &&
      wcoEntry.borderStyle === null &&
      wcoEntry.radius === null;
    var wcoRes = wcoIsAuto
      ? topbarRes
      : resolveComponentSurface({
          entry: wcoEntry,
          defaultRgb: topbarRes.hasToneOrTint ? topbarRes.preMixRgb : sbBaseRgb,
          fgRgb: fgRgb,
          wallTintRgb: acc.wallTint,
          wallMixWeight: cfg.wallTintMix * 0.75,
          defaultAlpha: topbarRes.alpha,
          bounds: SURFACE_TINT_BOUNDS.wco,
          isLight: isLight,
          contrastFloor: cfg.contrastFloor,
          solidChrome: wcoEntry.glassEnabled === true ? false : solidChrome,
        });
    var sbRes = resolveComponentSurface({
      entry: sbEntry,
      defaultRgb: sbBaseRgb,
      fgRgb: fgRgb,
      wallTintRgb: acc.wallTint,
      wallMixWeight: cfg.wallTintMix * 0.75,
      defaultAlpha: defaultSbAlpha,
      bounds: SURFACE_TINT_BOUNDS.sidebar,
      isLight: isLight,
      contrastFloor: cfg.contrastFloor,
      solidChrome: sbEntry.glassEnabled === true ? false : solidChrome,
    });
    var wsRes = resolveComponentSurface({
      entry: regions.workspace,
      defaultRgb: baseRgb,
      fgRgb: fgRgb,
      wallTintRgb: acc.wallTint,
      wallMixWeight: cfg.wallTintMix * 0.75,
      defaultAlpha: defaultChatAlpha,
      bounds: SURFACE_TINT_BOUNDS.workspace,
      isLight: isLight,
      contrastFloor: cfg.contrastFloor,
      solidChrome: regions.workspace.glassEnabled === true ? false : solidChrome,
    });
    var rightPaneRes = resolveComponentSurface({
      entry: regions.rightPane,
      defaultRgb: baseRgb,
      fgRgb: fgRgb,
      wallTintRgb: acc.wallTint,
      wallMixWeight: cfg.wallTintMix * 0.75,
      defaultAlpha: defaultChatAlpha,
      bounds: SURFACE_TINT_BOUNDS.rightPane,
      isLight: isLight,
      contrastFloor: cfg.contrastFloor,
      solidChrome: regions.rightPane.glassEnabled === true ? false : solidChrome,
    });
    var compRes = resolveComponentSurface({
      entry: regions.composer,
      defaultRgb: tint1Rgb,
      fgRgb: fgRgb,
      wallTintRgb: acc.wallTint,
      wallMixWeight: cfg.wallTintMix,
      defaultAlpha: defaultCompAlpha,
      bounds: SURFACE_TINT_BOUNDS.composer,
      isLight: isLight,
      contrastFloor: cfg.contrastFloor,
      solidChrome: regions.composer.glassEnabled === true ? false : solidChrome,
    });
    var cardRes = resolveComponentSurface({
      entry: regions.card,
      defaultRgb: tint1Rgb,
      fgRgb: fgRgb,
      wallTintRgb: acc.wallTint,
      wallMixWeight: cfg.wallTintMix,
      defaultAlpha: defaultCardAlpha,
      bounds: SURFACE_TINT_BOUNDS.card,
      isLight: isLight,
      contrastFloor: cfg.contrastFloor,
      solidChrome: regions.card.glassEnabled === true ? false : solidChrome,
    });
    var popRes = resolveComponentSurface({
      entry: regions.popover,
      defaultRgb: popRgb,
      fgRgb: fgRgb,
      wallTintRgb: acc.wallTint,
      wallMixWeight: cfg.wallTintMix * 0.4,
      defaultAlpha: defaultPopoverAlpha,
      bounds: SURFACE_TINT_BOUNDS.popover,
      isLight: isLight,
      contrastFloor: cfg.contrastFloor,
      solidChrome: regions.popover.glassEnabled === true ? false : solidChrome,
    });
    var quickPanelRes = resolveComponentSurface({
      entry: regions.popover,
      defaultRgb: popRgb,
      fgRgb: fgRgb,
      wallTintRgb: acc.wallTint,
      wallMixWeight: cfg.wallTintMix * 0.4,
      defaultAlpha: defaultQuickPanelAlpha,
      bounds: SURFACE_TINT_BOUNDS.popover,
      isLight: isLight,
      contrastFloor: cfg.contrastFloor,
      solidChrome: regions.popover.glassEnabled === true ? false : solidChrome,
    });

    var deepSbRgb = sbRes.customized
      ? (isLight ? mixRgb(sbRes.preMixRgb, [205, 214, 230], 0.28) : mixRgb(sbRes.preMixRgb, [3, 4, 7], 0.45))
      : (isLight ? mixRgb(sbBaseRgb, [215, 224, 238], 0.35) : mixRgb(sbBaseRgb, [3, 4, 7], 0.55));
    var sbLiftScale = sbRes.hasCustomOp ? Math.min(1, sbRes.alpha / 0.35) : 1;
    var sbEffectiveSolid = sbEntry.glassEnabled === true ? false : solidChrome;
    var deepSbAlpha = sbEffectiveSolid
      ? 1
      : sbRes.hasCustomOp
        ? (sbRes.alpha <= 0.005 ? 0 : clamp(sbRes.alpha + (isLight ? 0.14 : 0.12) * sbLiftScale, 0, 0.97))
        : sbRes.customized
          ? clamp(sbRes.alpha + (isLight ? 0.14 : 0.12), isLight ? 0.32 : 0.24, 0.97)
          : isLight
            ? clamp(Math.max(g + 0.14, 0.90), 0.45, 0.97)
            : clamp(Math.max(g + 0.12, 0.88), 0.35, 0.96);
    var stickySbAlpha = sbEffectiveSolid
      ? 1
      : sbRes.hasCustomOp
        ? (sbRes.alpha <= 0.005 ? 0 : clamp(sbRes.alpha + (isLight ? 0.16 : 0.14) * sbLiftScale, 0, 0.97))
        : sbRes.customized
          ? clamp(sbRes.alpha + (isLight ? 0.16 : 0.14), isLight ? 0.38 : 0.30, 0.97)
          : isLight
            ? 0.94
            : 0.91;

    var surfTopbar = topbarRes.rgba;
    var surfWco = wcoRes.rgba;
    var surfSidebar = sbRes.rgba;
    var surfSidebarDeep = rgbaStr(sbEntry.tint ? deepSbRgb : mixRgb(deepSbRgb, acc.wallTint, cfg.wallTintMix * 0.45), deepSbAlpha);
    var surfStickySidebar = rgbaStr(deepSbRgb, stickySbAlpha);
    var surfChat = wsRes.rgba;
    var surfRightPane = rightPaneRes.rgba;
    var surfEditor = computeFlooredRgba(
      baseRgb,
      acc.wallTint,
      cfg.wallTintMix * 0.5,
      rawEditorA,
      cfg.contrastFloor ? 1 : cfg.glassFidelity,
      minEditorFloor,
      solidChrome || cfg.codeReadabilityMode === 'solid'
    );
    var surfCard = cardRes.rgba;
    var surfComp = compRes.rgba;
    var surfPopover = popRes.rgba;
    var surfQuickPanel = quickPanelRes.rgba;

    var bScale = cfg.borders === 'off' ? 0 : cfg.borders === 'subtle' ? 0.5 : 1;
    var shadowsOn = Boolean(cfg.shadows);
    var islandBaseA = isLight ? 0.125 : 0.105;
    var cardBaseA = isLight ? 0.115 : 0.09;
    var popBaseA = isLight ? 0.16 : 0.145;

    var topbarEdge = buildRegionEdgeTokens({
      alpha: topbarRes.alpha,
      bScale: bScale,
      shadowsOn: shadowsOn,
      isLight: isLight,
      ptRgb: ptRgb,
      baseBorderA: islandBaseA,
      overrideBorderOp: regions.topbar.borderOpacity,
      borderStyle: regions.topbar.borderStyle,
      isPopover: false,
      layoutMode: cfg.layoutMode,
    });
    var wcoEdge = wcoIsAuto
      ? topbarEdge
      : buildRegionEdgeTokens({
          alpha: wcoRes.alpha,
          bScale: bScale,
          shadowsOn: shadowsOn,
          isLight: isLight,
          ptRgb: ptRgb,
          baseBorderA: islandBaseA,
          overrideBorderOp: regions.wco.borderOpacity,
          borderStyle: regions.wco.borderStyle,
          isPopover: false,
          layoutMode: cfg.layoutMode,
        });
    var sbEdge = buildRegionEdgeTokens({
      alpha: sbRes.alpha,
      bScale: bScale,
      shadowsOn: shadowsOn,
      isLight: isLight,
      ptRgb: ptRgb,
      baseBorderA: islandBaseA,
      overrideBorderOp: sbEntry.borderOpacity,
      borderStyle: sbEntry.borderStyle,
      isPopover: false,
      layoutMode: cfg.layoutMode,
    });
    var wsEdge = buildRegionEdgeTokens({
      alpha: wsRes.alpha,
      bScale: bScale,
      shadowsOn: shadowsOn,
      isLight: isLight,
      ptRgb: ptRgb,
      baseBorderA: islandBaseA,
      overrideBorderOp: regions.workspace.borderOpacity,
      borderStyle: regions.workspace.borderStyle,
      isPopover: false,
      layoutMode: cfg.layoutMode,
    });
    var rightPaneEdge = buildRegionEdgeTokens({
      alpha: rightPaneRes.alpha,
      bScale: bScale,
      shadowsOn: shadowsOn,
      isLight: isLight,
      ptRgb: ptRgb,
      baseBorderA: islandBaseA,
      overrideBorderOp: regions.rightPane.borderOpacity,
      borderStyle: regions.rightPane.borderStyle,
      isPopover: false,
      layoutMode: cfg.layoutMode,
    });
    var cardEdge = buildRegionEdgeTokens({
      alpha: cardRes.alpha,
      bScale: bScale,
      shadowsOn: shadowsOn,
      isLight: isLight,
      ptRgb: ptRgb,
      baseBorderA: cardBaseA,
      overrideBorderOp: regions.card.borderOpacity,
      borderStyle: regions.card.borderStyle,
      isPopover: false,
      layoutMode: cfg.layoutMode,
    });
    var compEdge = buildRegionEdgeTokens({
      alpha: compRes.alpha,
      bScale: bScale,
      shadowsOn: shadowsOn,
      isLight: isLight,
      ptRgb: ptRgb,
      baseBorderA: cardBaseA,
      overrideBorderOp: regions.composer.borderOpacity,
      borderStyle: regions.composer.borderStyle,
      isPopover: false,
      layoutMode: cfg.layoutMode,
    });
    var popEdge = buildRegionEdgeTokens({
      alpha: popRes.alpha,
      bScale: bScale,
      shadowsOn: shadowsOn,
      isLight: isLight,
      ptRgb: ptRgb,
      baseBorderA: popBaseA,
      overrideBorderOp: regions.popover.borderOpacity,
      borderStyle: regions.popover.borderStyle,
      isPopover: true,
      layoutMode: cfg.layoutMode,
    });

    var stickyBf = sbEntry.borderStyle === 'none' ? 0 : computeBorderFactor(stickySbAlpha, bScale, sbEntry.borderOpacity);
    var stickySf = computeShadowFactor(stickySbAlpha, shadowsOn);
    var stickyShadowParts = [];
    if (stickyBf > 0.001) stickyShadowParts.push('inset 0 1px 0 ' + rgbaStr([255, 255, 255], (isLight ? 0.88 : 0.075) * stickyBf));
    if (stickySf > 0.001) stickyShadowParts.push('0 3px 10px rgba(0, 0, 0, ' + ((isLight ? 0.06 : 0.24) * stickySf).toFixed(3) + ')');
    var stickyShadowCss = stickyShadowParts.length ? stickyShadowParts.join(', ') : 'none';

    var deepBf = sbEntry.borderStyle === 'none' ? 0 : computeBorderFactor(deepSbAlpha, bScale, sbEntry.borderOpacity);
    var deepSf = computeShadowFactor(deepSbAlpha, shadowsOn);
    var projShadowParts = [];
    if (deepBf > 0.001) projShadowParts.push('inset 0 1px 0 ' + rgbaStr([255, 255, 255], (isLight ? 0.88 : 0.075) * deepBf));
    if (deepSf > 0.001) projShadowParts.push('0 2px 8px rgba(0, 0, 0, ' + ((isLight ? 0.05 : 0.22) * deepSf).toFixed(3) + ')');
    var projShadowCss = projShadowParts.length ? projShadowParts.join(', ') : 'none';

    var chipShadowCss = sbEdge.sf <= 0.001 ? 'none' : '0 1px 4px rgba(0, 0, 0, ' + ((isLight ? 0.08 : 0.26) * sbEdge.sf).toFixed(3) + ')';
    var chipShadowHoverCss = sbEdge.sf <= 0.001 ? 'none' : '0 2px 8px rgba(0, 0, 0, ' + ((isLight ? 0.14 : 0.38) * sbEdge.sf).toFixed(3) + ')';
    var sbChipHoverBorderCss = sbEdge.bf <= 0.001 ? 'transparent' : rgbaStr(ptRgb, (isLight ? 0.14 : 0.12) * sbEdge.bf);
    var sbTreeGuideCss = sbEdge.bf <= 0.001 ? 'transparent' : rgbaStr(ptRgb, (isLight ? 0.14 : 0.12) * sbEdge.bf);
    var compDividerCss = compEdge.bf <= 0.001 ? 'transparent' : rgbaStr(ptRgb, (isLight ? 0.085 : 0.070) * compEdge.bf);

    var sashBf = Math.max(sbEdge.bf, wsEdge.bf);
    var borderHairline = sashBf <= 0.001 ? 'transparent' : rgbaStr(ptRgb, (isLight ? 0.095 : 0.075) * sashBf);

    var mainPageAlpha = wsRes.hasCustomOp ? wsRes.alpha : sbRes.alpha;
    var surfMainPage = wsRes.hasCustomOp ? wsRes.rgba : sbRes.rgba;
    var mainPageEdge = buildRegionEdgeTokens({
      alpha: mainPageAlpha,
      bScale: bScale,
      shadowsOn: false,
      isLight: isLight,
      ptRgb: ptRgb,
      baseBorderA: islandBaseA,
      overrideBorderOp: wsRes.hasCustomOp ? regions.workspace.borderOpacity : sbEntry.borderOpacity,
      borderStyle: wsRes.hasCustomOp ? regions.workspace.borderStyle : sbEntry.borderStyle,
      isPopover: false,
      layoutMode: cfg.layoutMode,
    });

    var autoScrim = !cfg.scrimColor || /^(auto|rgba?\(0,\s*0,\s*0|#000|#000000|black)$/i.test(cfg.scrimColor);
    var scrimBg = autoScrim ? rgbaStr(shadeRgb, 1) : cfg.scrimColor;
    var scrimAlpha = isLight && autoScrim ? clamp(0.32 + cfg.scrimOpacity * 0.62, 0.18, 0.94) : cfg.scrimOpacity;

    var vignetteGrad = isLight
      ? 'radial-gradient(ellipse 58% 66% at 50% 48%, rgba(255,255,255,0.28) 0%, rgba(244,247,251,0.14) 62%, rgba(232,238,246,0.32) 100%)'
      : 'radial-gradient(ellipse 58% 66% at 50% 48%, rgba(9,9,11,0.04) 0%, rgba(9,9,11,0.16) 62%, rgba(9,9,11,0.34) 100%)';

    var rawBlurMd = cfg.glassBlur;
    var rawSbBlur = cfg.sidebarBlur !== null && cfg.sidebarBlur !== undefined ? cfg.sidebarBlur : cfg.glassBlur;
    var rawBlurLg = rawBlurMd > 0 ? Math.min(64, rawBlurMd + 4) : 0;
    var rawBlurXl = rawBlurMd > 0 ? Math.min(64, rawBlurMd + 6) : 0;

    var blurMd = cfg.glassSurfaces ? rawBlurMd : 0;
    var blurLg = cfg.glassSurfaces ? rawBlurLg : 0;
    var blurXl = cfg.glassSurfaces ? rawBlurXl : 0;

    var topbarBlurPx = resolveRegionBlurPx(regions.topbar, rawBlurMd, cfg.glassSurfaces, cfg.mediaBlur);
    var wcoDefaultBlur = regions.topbar.blur !== null && regions.topbar.blur !== undefined ? regions.topbar.blur : rawBlurMd;
    var wcoBlurPx = wcoIsAuto
      ? topbarBlurPx
      : wcoEntry.blur === null && wcoEntry.glassEnabled === null
        ? topbarBlurPx
        : resolveRegionBlurPx(wcoEntry, wcoDefaultBlur, cfg.glassSurfaces, cfg.mediaBlur);
    var sbBlurPx = resolveRegionBlurPx(sbEntry, rawSbBlur, cfg.glassSurfaces, cfg.mediaBlur);
    var wsBlurPx = resolveRegionBlurPx(regions.workspace, rawBlurMd, cfg.glassSurfaces, cfg.mediaBlur);
    var rightPaneBlurPx = resolveRegionBlurPx(regions.rightPane, rawBlurMd, cfg.glassSurfaces, cfg.mediaBlur);
    var compBlurPx = resolveRegionBlurPx(regions.composer, rawBlurLg, cfg.glassSurfaces, cfg.mediaBlur);
    var cardBlurPx = resolveRegionBlurPx(regions.card, 0, cfg.glassSurfaces, cfg.mediaBlur);
    var popBlurPx = resolveRegionBlurPx(regions.popover, rawBlurXl, cfg.glassSurfaces, cfg.mediaBlur);

    var chipBlurPx = blurMd > 0 ? Math.max(4, Math.round(blurMd * 0.6)) : 0;
    var codeBlurPx = cfg.codeReadabilityMode === 'frosted' && wsBlurPx > 0 ? Math.max(4, Math.round(wsBlurPx * 0.85)) : 0;
    var effSbListStyle = sbEntry.listStyle || cfg.sidebarListStyle || 'capsule';

    var fitCss = cfg.fit === 'center' ? 'none' : cfg.fit;
    var isZeroCopyOverlaySafe =
      cfg.mediaBlur === 0 &&
      cfg.filterPreset === 'none' &&
      Math.abs(cfg.mediaBrightness - 1) <= 0.01 &&
      Math.abs(cfg.mediaContrast - 1) <= 0.01 &&
      (Math.abs(cfg.mediaSaturate - 1) <= 0.01 || Math.abs(cfg.mediaSaturate - 1.05) <= 0.006);
    var filterParts = [];
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
    var blurOverscale = cfg.parallaxEnabled ? 1.05 : 1;
    var baseScale = (cfg.scale / 100) * blurOverscale;
    var flipX = cfg.flip ? -1 : 1;

    var leftNum = Number(cfg.leftCornerRadius);
    var rightNum = Number(cfg.rightCornerRadius);
    var leftRad =
      sbEntry.radius !== null && sbEntry.radius !== undefined
        ? clamp(Math.round(Number(sbEntry.radius)), 0, 28) + 'px'
        : cfg.leftCornerRadius === 'native'
          ? '0px'
          : Number.isFinite(leftNum) && cfg.leftCornerRadius !== '' && cfg.leftCornerRadius !== 'auto'
            ? clamp(Math.round(leftNum), 0, 28) + 'px'
            : R.island + 'px';
    var rightRad =
      regions.rightPane.radius !== null && regions.rightPane.radius !== undefined
        ? clamp(Math.round(Number(regions.rightPane.radius)), 0, 28) + 'px'
        : cfg.rightCornerRadius === 'native'
          ? '0px'
          : Number.isFinite(rightNum) && cfg.rightCornerRadius !== '' && cfg.rightCornerRadius !== 'auto'
            ? clamp(Math.round(rightNum), 0, 28) + 'px'
            : R.island + 'px';
    var defaultTopbarPillRad = cfg.layoutMode === 'flush' ? R.ctl : Math.min(16, R.island);
    var topbarRad =
      regions.topbar.radius !== null && regions.topbar.radius !== undefined
        ? clamp(Math.round(Number(regions.topbar.radius)), 0, 28) + 'px'
        : defaultTopbarPillRad + 'px';
    var wcoRad = wcoIsAuto
      ? topbarRad
      : regions.wco.radius !== null && regions.wco.radius !== undefined
        ? clamp(Math.round(Number(regions.wco.radius)), 0, 28) + 'px'
        : topbarRad;
    var workspaceRad =
      regions.workspace.radius !== null && regions.workspace.radius !== undefined
        ? clamp(Math.round(Number(regions.workspace.radius)), 0, 28) + 'px'
        : R.island + 'px';
    var cardRad =
      regions.card.radius !== null && regions.card.radius !== undefined
        ? clamp(Math.round(Number(regions.card.radius)), 0, 28) + 'px'
        : R.card + 'px';
    var composerRad =
      regions.composer.radius !== null && regions.composer.radius !== undefined
        ? clamp(Math.round(Number(regions.composer.radius)), 0, 28) + 'px'
        : R.card + 'px';
    var popoverRad =
      regions.popover.radius !== null && regions.popover.radius !== undefined
        ? clamp(Math.round(Number(regions.popover.radius)), 0, 28) + 'px'
        : R.card + 'px';

    // #9 Sidebar typography scale (11..15px, virtual slot height safe)
    var sbFsRaw = sbEntry.fontSize !== null && sbEntry.fontSize !== undefined ? sbEntry.fontSize : cfg.sidebarFontSize;
    var sbBaseFs = sbFsRaw !== null && sbFsRaw !== undefined ? clamp(Math.round(Number(sbFsRaw)), 11, 15) : 13;
    var sbSecFs = sbEntry.sectionFontSize !== null && sbEntry.sectionFontSize !== undefined
      ? clamp(Math.round(Number(sbEntry.sectionFontSize)), 11, 15)
      : sbBaseFs;
    var sbProjFs = sbEntry.projectFontSize !== null && sbEntry.projectFontSize !== undefined
      ? clamp(Math.round(Number(sbEntry.projectFontSize)), 11, 15)
      : sbBaseFs;
    var sbItemFs = sbEntry.itemFontSize !== null && sbEntry.itemFontSize !== undefined
      ? clamp(Number(sbEntry.itemFontSize), 11, 14.5)
      : Math.max(11, Math.min(14.5, sbBaseFs - 0.5));

    // #14 Region custom typography & D7 opposite-anchor guardrail
    var regResMap = {
      topbar: topbarRes,
      wco: wcoRes,
      sidebar: sbRes,
      workspace: wsRes,
      card: cardRes,
      composer: compRes,
      rightPane: rightPaneRes,
      popover: popRes,
    };
    var regionTypo = {};
    for (var ti = 0; ti < REGION_IDS.length; ti += 1) {
      var rid = REGION_IDS[ti];
      var rEnt = regions[rid] || createDefaultRegionEntry(rid);
      var rSurface = regResMap[rid];
      var rawFgHex = rEnt.fontColor || cfg.globalFontColor || '';
      var fgOut = '';
      if (rawFgHex) {
        var parsedFg = hexToRgb(rawFgHex);
        if (parsedFg) {
          if (rEnt.allowRawFontColor === true || rSurface.alpha < 0.55) {
            fgOut = rgbToHex(parsedFg);
          } else {
            fgOut = rgbToHex(enforceFgContrastRgb(parsedFg, rSurface.rgb, isLight, 4.5));
          }
        }
      }
      var ffOut = sanitizeFontFamily(rEnt.fontFamily || cfg.globalFontFamily || '');
      var fsOut = '';
      if (rid !== 'sidebar' && rid !== 'wco') {
        var rawFs = rEnt.fontSize !== null && rEnt.fontSize !== undefined ? rEnt.fontSize : cfg.globalFontSize;
        if (rawFs !== null && rawFs !== undefined && rawFs !== '' && Number.isFinite(Number(rawFs))) {
          fsOut = clamp(Math.round(Number(rawFs)), 10, 24) + 'px';
        }
      }
      regionTypo[rid] = { fg: fgOut, ff: ffOut, fs: fsOut };
    }

    var vars = {
      '--prism-pt-rgb': S.pt,
      '--prism-shade-rgb': S.shade,
      '--prism-sidebar-rgb': sbRes.preMixRgb[0] + ', ' + sbRes.preMixRgb[1] + ', ' + sbRes.preMixRgb[2],
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
      '--prism-accent-soft': 'rgba(' + acc.rgbStr + ', ' + (isLight ? '0.110' : '0.140') + ')',
      '--prism-accent-border': 'rgba(' + acc.rgbStr + ', ' + (isLight ? '0.420' : '0.480') + ')',
      '--prism-link': S.link,
      '--prism-surface-canvas': 'transparent',
      '--prism-surface-topbar': surfTopbar,
      '--prism-bg-topbar': 'var(--prism-surface-topbar)',
      '--prism-surface-wco': surfWco,
      '--prism-surface-sidebar': surfSidebar,
      '--prism-surface-sidebar-deep': surfSidebarDeep,
      '--prism-surface-sticky-sidebar': surfStickySidebar,
      '--prism-surface-chat': surfChat,
      '--prism-surface-right-pane': surfRightPane,
      '--prism-surface-main-page': surfMainPage,
      '--prism-surface-editor': surfEditor,
      '--prism-surface-card': surfCard,
      '--prism-surface-composer': surfComp,
      '--prism-surface-popover': surfPopover,
      '--prism-surface-quick-panel': surfQuickPanel,
      '--prism-surface-code-block': cfg.codeReadabilityMode === 'solid' ? rgbaStr(tint1Rgb, 1) : surfEditor,
      '--prism-secondary-bg': rgbaStr(tint2Rgb, isLight ? 0.78 : 0.72),
      '--prism-muted-bg': rgbaStr(tint1Rgb, isLight ? 0.65 : 0.55),
      '--prism-sidebar-muted': 'rgba(' + S.pt + ', ' + (isLight ? '0.075' : '0.078') + ')',
      '--prism-sidebar-secondary': 'rgba(' + S.pt + ', ' + (isLight ? '0.115' : '0.125') + ')',
      '--prism-sidebar-tree-guide': sbTreeGuideCss,
      '--prism-blur-md': blurMd + 'px',
      '--prism-blur-lg': blurLg + 'px',
      '--prism-blur-xl': blurXl + 'px',
      '--prism-chat-backdrop': buildBackdrop(wsBlurPx, isLight, false),
      '--prism-right-pane-backdrop': buildBackdrop(rightPaneBlurPx, isLight, false),
      '--prism-topbar-backdrop': buildBackdrop(topbarBlurPx, isLight, false),
      '--prism-wco-backdrop': buildBackdrop(wcoBlurPx, isLight, false),
      '--prism-sidebar-backdrop': buildBackdrop(sbBlurPx, isLight, false),
      '--prism-popover-backdrop': popRes.alpha >= 0.94 ? 'none' : buildBackdrop(popBlurPx, isLight, false),
      '--prism-quick-panel-backdrop': quickPanelRes.alpha >= 0.94 ? 'none' : buildBackdrop(popBlurPx, isLight, false),
      '--prism-sticky-backdrop': stickySbAlpha >= 0.88 || effSbListStyle !== 'capsule' ? 'none' : buildBackdrop(sbBlurPx, isLight, true),
      '--prism-project-backdrop': 'none',
      '--prism-composer-backdrop': compRes.alpha >= 0.92 ? 'none' : buildBackdrop(compBlurPx, isLight, true),
      '--prism-card-backdrop': cardRes.alpha >= 0.92 ? 'none' : buildBackdrop(cardBlurPx, isLight, true),
      '--prism-code-backdrop': buildBackdrop(codeBlurPx, isLight, true),
      '--prism-chrome-chip-backdrop': buildBackdrop(chipBlurPx, isLight, true),
      '--prism-border-topbar': topbarEdge.border,
      '--prism-specular-topbar': topbarEdge.specular,
      '--prism-sheen-topbar': topbarEdge.sheen,
      '--prism-shadow-topbar': topbarEdge.shadow,
      '--prism-border-wco': wcoEdge.border,
      '--prism-specular-wco': wcoEdge.specular,
      '--prism-sheen-wco': wcoEdge.sheen,
      '--prism-shadow-wco': wcoEdge.shadow,
      '--prism-border-sidebar': sbEdge.border,
      '--prism-border-sidebar-hover': sbChipHoverBorderCss,
      '--prism-specular-sidebar': sbEdge.specular,
      '--prism-sheen-sidebar': sbEdge.sheen,
      '--prism-shadow-sidebar': sbEdge.shadow,
      '--prism-sticky-shadow': stickyShadowCss,
      '--prism-proj-shadow': projShadowCss,
      '--prism-chip-shadow': chipShadowCss,
      '--prism-chip-shadow-hover': chipShadowHoverCss,
      '--prism-border-workspace': wsEdge.border,
      '--prism-specular-workspace': wsEdge.specular,
      '--prism-sheen-workspace': wsEdge.sheen,
      '--prism-shadow-workspace': wsEdge.shadow,
      '--prism-sheen-main-page': mainPageEdge.sheen,
      '--prism-specular-main-page': mainPageEdge.specular,
      '--prism-border-right-pane': rightPaneEdge.border,
      '--prism-specular-right-pane': rightPaneEdge.specular,
      '--prism-sheen-right-pane': rightPaneEdge.sheen,
      '--prism-shadow-right-pane': rightPaneEdge.shadow,
      '--prism-border-card': cardEdge.border,
      '--prism-specular-card': cardEdge.specular,
      '--prism-sheen-card': cardEdge.sheen,
      '--prism-shadow-card': cardEdge.shadow,
      '--prism-border-composer': compEdge.border,
      '--prism-border-composer-divider': compDividerCss,
      '--prism-specular-composer': compEdge.specular,
      '--prism-sheen-composer': compEdge.sheen,
      '--prism-shadow-composer': compEdge.shadow,
      '--prism-border-popover': popEdge.border,
      '--prism-specular-popover': popEdge.specular,
      '--prism-sheen-popover': popEdge.sheen,
      '--prism-shadow-popover': popEdge.shadow,
      '--prism-border-sash': borderHairline,
      '--prism-border-hairline': borderHairline,
      '--prism-border-island': sbEdge.border,
      '--prism-specular-top': topbarEdge.specular,
      '--prism-sheen': topbarEdge.sheen,
      '--prism-shadow-island': sbEdge.shadow,
      '--prism-bw-topbar-top': topbarEdge.widths.top,
      '--prism-bw-topbar-right': topbarEdge.widths.right,
      '--prism-bw-topbar-bottom': topbarEdge.widths.bottom,
      '--prism-bw-topbar-left': topbarEdge.widths.left,
      '--prism-bw-wco-top': wcoEdge.widths.top,
      '--prism-bw-wco-right': wcoEdge.widths.right,
      '--prism-bw-wco-bottom': wcoEdge.widths.bottom,
      '--prism-bw-wco-left': wcoEdge.widths.left,
      '--prism-bw-sidebar-top': sbEdge.widths.top,
      '--prism-bw-sidebar-right': sbEdge.widths.right,
      '--prism-bw-sidebar-bottom': sbEdge.widths.bottom,
      '--prism-bw-sidebar-left': sbEdge.widths.left,
      '--prism-bw-workspace-top': wsEdge.widths.top,
      '--prism-bw-workspace-right': wsEdge.widths.right,
      '--prism-bw-workspace-bottom': wsEdge.widths.bottom,
      '--prism-bw-workspace-left': wsEdge.widths.left,
      '--prism-bw-card-top': cardEdge.widths.top,
      '--prism-bw-card-right': cardEdge.widths.right,
      '--prism-bw-card-bottom': cardEdge.widths.bottom,
      '--prism-bw-card-left': cardEdge.widths.left,
      '--prism-bw-composer-top': compEdge.widths.top,
      '--prism-bw-composer-right': compEdge.widths.right,
      '--prism-bw-composer-bottom': compEdge.widths.bottom,
      '--prism-bw-composer-left': compEdge.widths.left,
      '--prism-bw-right-pane-top': rightPaneEdge.widths.top,
      '--prism-bw-right-pane-right': rightPaneEdge.widths.right,
      '--prism-bw-right-pane-bottom': rightPaneEdge.widths.bottom,
      '--prism-bw-right-pane-left': rightPaneEdge.widths.left,
      '--prism-bw-popover-top': popEdge.widths.top,
      '--prism-bw-popover-right': popEdge.widths.right,
      '--prism-bw-popover-bottom': popEdge.widths.bottom,
      '--prism-bw-popover-left': popEdge.widths.left,
      '--prism-workspace-pad': (cfg.layoutMode === 'islands' ? cfg.workspacePad : 0) + 'px',
      '--prism-island-gap': (cfg.layoutMode === 'islands' ? cfg.islandGap : 0) + 'px',
      '--prism-r-island': R.island + 'px',
      '--prism-r-topbar-pill': topbarRad,
      '--prism-r-wco': wcoRad,
      '--prism-r-left-island': leftRad,
      '--prism-r-right-island': rightRad,
      '--prism-r-workspace': workspaceRad,
      '--prism-r-card': cardRad,
      '--prism-r-composer': composerRad,
      '--prism-r-popover': popoverRad,
      '--prism-r-sheet': R.sheet + 'px',
      '--prism-r-ctl': R.ctl + 'px',
      '--prism-r-xs': R.xs + 'px',
      '--prism-sb-section-fs': sbSecFs + 'px',
      '--prism-sb-project-fs': sbProjFs + 'px',
      '--prism-sb-item-fs': sbItemFs + 'px',
      '--prism-sb-section-lh': sbSecFs >= 15 ? '1.2' : '1.25',
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
      '--prism-wrap-will-change': cfg.parallaxEnabled ? 'transform' : 'auto',
      '--prism-media-fit': fitCss,
      '--prism-media-pos': cfg.posX + '% ' + cfg.posY + '%',
      '--prism-media-opacity': cfg.mediaOpacity.toFixed(3),
      '--prism-media-filter': mediaFilter,
      '--prism-media-blur-display': cfg.mediaBlur > 0 ? 'block' : 'none',
      '--prism-media-blur-filter': cfg.mediaBlur > 0 ? 'blur(' + cfg.mediaBlur + 'px)' : 'none',
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
      cfg.topbarStyle,
    ].join('|');

    state.lastWcoSurface = { rgb: wcoRes.rgb, alpha: wcoRes.alpha };

    return {
      isLight: isLight,
      S: S,
      acc: acc,
      wcoRes: wcoRes,
      regionTypo: regionTypo,
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
      root.style.removeProperty('--prism-wco-pill-top');
      root.style.removeProperty('--prism-wco-pill-h');
      root.style.removeProperty('--prism-bg-topbar');
    }
    state.appliedVars = {};
    state.lastHoleClip = '';
    state.lastAppliedStageClip = '';
    state.lastAppliedStageEl = null;
    state.lastAppliedFxClip = '';
    state.lastAppliedFxEl = null;
  }

  function buildStructuralPrismCss(cfg, tok) {
    var GG = 'html[' + GLASS_ATTR + '="ready"]';
    var GW = 'html[' + WALLPAPER_ATTR + '="ready"]';
    var NOT_HOLE = ':not([data-has-browser-hole="true"]):not([data-browser-hole])';
    var isLight = tok.isLight;
    var out = [];

    // 1. Root Safety Floor & 2.34.0 3-Layer [data-browser-hole] Alpha=0 Yield + z=0 Topbar/WCO Glass Pills
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
      '#' + TOPBAR_PILLS_ID + ',\n' +
      '#' + WCO_PILL_ID + ' {\n' +
      '  position: fixed !important;\n' +
      '  z-index: 0 !important;\n' +
      '  pointer-events: none !important;\n' +
      '  user-select: none !important;\n' +
      '  -webkit-user-select: none !important;\n' +
      '  display: none;\n' +
      '}\n' +
      '#' + TOPBAR_PILLS_ID + ' {\n' +
      '  inset: 0 !important;\n' +
      '  background: transparent !important;\n' +
      '}\n' +
      GW + ' #' + TOPBAR_PILLS_ID + ',\n' +
      GW + '[' + WCO_ATTR + '="transparent"] #' + WCO_PILL_ID + ' {\n' +
      '  display: block;\n' +
      '}\n' +
      GW + ' .agy-prism-topbar-pill {\n' +
      '  position: fixed !important;\n' +
      '  z-index: 0 !important;\n' +
      '  pointer-events: none !important;\n' +
      '  user-select: none !important;\n' +
      '  -webkit-user-select: none !important;\n' +
      '  box-sizing: border-box !important;\n' +
      '  border-radius: var(--prism-r-topbar-pill, var(--prism-r-island)) !important;\n' +
      '  border-style: solid !important;\n' +
      '  border-color: var(--prism-border-topbar, var(--prism-border-island)) !important;\n' +
      '  border-width: var(--prism-bw-topbar-top, 1px) var(--prism-bw-topbar-right, 1px) var(--prism-bw-topbar-bottom, 1px) var(--prism-bw-topbar-left, 1px) !important;\n' +
      '  background-color: var(--prism-bg-topbar, var(--prism-surface-topbar, var(--prism-surface-sidebar))) !important;\n' +
      '  background-image: var(--prism-sheen-topbar, var(--prism-sheen)) !important;\n' +
      '  backdrop-filter: var(--prism-topbar-backdrop, var(--prism-sidebar-backdrop)) !important;\n' +
      '  -webkit-backdrop-filter: var(--prism-topbar-backdrop, var(--prism-sidebar-backdrop)) !important;\n' +
      '  box-shadow: inset 0 1px 0 var(--prism-specular-topbar, var(--prism-specular-top)), var(--prism-shadow-topbar, var(--prism-shadow-island)) !important;\n' +
      '}\n' +
      GW + '[' + WCO_ATTR + '="transparent"] #' + WCO_PILL_ID + ' {\n' +
      '  position: fixed !important;\n' +
      '  z-index: 0 !important;\n' +
      '  pointer-events: none !important;\n' +
      '  user-select: none !important;\n' +
      '  -webkit-user-select: none !important;\n' +
      '  box-sizing: border-box !important;\n' +
      '  border-radius: var(--prism-r-wco, var(--prism-r-topbar-pill, var(--prism-r-island))) !important;\n' +
      '  border-style: solid !important;\n' +
      '  border-color: var(--prism-border-wco, var(--prism-border-topbar, var(--prism-border-island))) !important;\n' +
      '  border-width: var(--prism-bw-wco-top, 1px) var(--prism-bw-wco-right, 1px) var(--prism-bw-wco-bottom, 1px) var(--prism-bw-wco-left, 1px) !important;\n' +
      '  background-color: var(--prism-surface-wco, var(--prism-bg-topbar, var(--prism-surface-topbar, var(--prism-surface-sidebar)))) !important;\n' +
      '  background-image: var(--prism-sheen-wco, var(--prism-sheen-topbar, var(--prism-sheen))) !important;\n' +
      '  backdrop-filter: var(--prism-wco-backdrop, var(--prism-topbar-backdrop, var(--prism-sidebar-backdrop))) !important;\n' +
      '  -webkit-backdrop-filter: var(--prism-wco-backdrop, var(--prism-topbar-backdrop, var(--prism-sidebar-backdrop))) !important;\n' +
      '  box-shadow: inset 0 1px 0 var(--prism-specular-wco, var(--prism-specular-top)), var(--prism-shadow-wco, var(--prism-shadow-island)) !important;\n' +
      '}\n' +
      GW + '[data-prism-layout="flush"] .agy-prism-topbar-pill {\n' +
      '  border-radius: 0px 0px var(--prism-r-topbar-pill, 6px) var(--prism-r-topbar-pill, 6px) !important;\n' +
      '  border-color: var(--prism-border-topbar, var(--prism-border-hairline)) !important;\n' +
      '  border-top-width: 0px !important;\n' +
      '  box-shadow: none !important;\n' +
      '}\n' +
      GW + '[' + WCO_ATTR + '="transparent"][data-prism-layout="flush"] #' + WCO_PILL_ID + ' {\n' +
      '  border-radius: 0px 0px 0px var(--prism-r-wco, var(--prism-r-topbar-pill, 6px)) !important;\n' +
      '  border-color: var(--prism-border-wco, var(--prism-border-hairline)) !important;\n' +
      '  border-top-width: 0px !important;\n' +
      '  border-right-width: 0px !important;\n' +
      '  box-shadow: none !important;\n' +
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
      '  --card-edge: var(--prism-border-workspace) !important;\n' +
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

    // 3. Inert Fail-Open Stage at z-index: -1 (0 mouse/focus interception, explicit z-layers, edge-clamped blur veil)
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
      '  contain: layout style;\n' +
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
      '  z-index: 0;\n' +
      '  width: 100%;\n' +
      '  height: 100%;\n' +
      '  will-change: var(--prism-wrap-will-change, auto);\n' +
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
      '@media (prefers-reduced-motion: no-preference) {\n' +
      '  ' + GW + ' #' + STAGE_ID + ' .agy-prism-slide-el {\n' +
      '    transition: opacity 680ms ease;\n' +
      '  }\n' +
      '}\n' +
      '#' + STAGE_ID + ' .agy-prism-blur-veil {\n' +
      '  position: absolute;\n' +
      '  inset: 0;\n' +
      '  z-index: 1;\n' +
      '  display: none;\n' +
      '  pointer-events: none !important;\n' +
      '  backdrop-filter: var(--prism-media-blur-filter, none);\n' +
      '  -webkit-backdrop-filter: var(--prism-media-blur-filter, none);\n' +
      '}\n' +
      GW + ' #' + STAGE_ID + ' .agy-prism-blur-veil {\n' +
      '  display: var(--prism-media-blur-display, none);\n' +
      '}\n' +
      '#' + STAGE_ID + ' .agy-prism-scrim {\n' +
      '  position: absolute;\n' +
      '  inset: 0;\n' +
      '  z-index: 2;\n' +
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
      '  z-index: 3;\n' +
      '  display: none;\n' +
      '  background: var(--prism-vignette-bg);\n' +
      '}\n' +
      GW + ' #' + STAGE_ID + ' .agy-prism-vignette {\n' +
      '  display: var(--prism-vignette-display);\n' +
      '}\n' +
      '#' + STAGE_ID + ' .agy-prism-grain {\n' +
      '  position: absolute;\n' +
      '  inset: 0;\n' +
      '  z-index: 4;\n' +
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

    // Req #2: 3-Tier Dynamic Topbar Ancestor Hollowing (strictly scoped inside .agy-shell; NEVER .agy-shell/#root/body!)
    // Compact frosted-glass pills render at z-index: 0 in `#agy-prism-topbar-pills`, keeping empty middle 100% transparent & draggable.
    out.push(
      GW + ' :is([' + TOPBAR_ANC_ATTR + '="1"], [' + TOPBAR_HOST_ATTR + '="1"], .agy-shell > :has([data-testid="title-menu-bar"]), .agy-shell :has(> [data-testid="title-menu-bar"]), [data-testid="title-menu-bar"], .monaco-workbench .part.titlebar, .monaco-workbench .part.titlebar > .titlebar-container):not(.agy-shell):not(#root):not(body)' + NOT_HOLE + ' {\n' +
      '  background: transparent !important;\n' +
      '  background-color: transparent !important;\n' +
      '  background-image: none !important;\n' +
      '  backdrop-filter: none !important;\n' +
      '  -webkit-backdrop-filter: none !important;\n' +
      '  border: none !important;\n' +
      '  box-shadow: none !important;\n' +
      '  border-radius: 0px !important;\n' +
      '  overflow: visible !important;\n' +
      '}\n' +
      GW + ' :is([data-testid="title-menu-bar"], [' + TOPBAR_HOST_ATTR + '="1"]) :where(div, nav, section, header):not([data-browser-occluder="true"]):not([data-browser-occluder="true"] *):not([role="menu"]):not([role="menu"] *):not([role="dialog"]):not([role="dialog"] *):not([role="listbox"]):not([role="listbox"] *):not([role="tooltip"]):not([role="tooltip"] *):not(.surface-opaque):not(.surface-opaque *):not(.agy-menu):not(.agy-menu *):not(.agy-popover):not(.agy-popover *) {\n' +
      '  background-color: transparent !important;\n' +
      '  background-image: none !important;\n' +
      '  box-shadow: none !important;\n' +
      '}\n' +
      GW + ' :is([' + TOPBAR_ANC_ATTR + '="1"], .agy-shell > :has([data-testid="title-menu-bar"]), .agy-shell :has(> [data-testid="title-menu-bar"]), [data-testid="title-menu-bar"], [' + TOPBAR_HOST_ATTR + '="1"]):not(.agy-shell):not(#root):not(body) {\n' +
      '  -webkit-app-region: drag;\n' +
      '}\n' +
      GW + ' :is([data-testid="title-menu-bar"], [' + TOPBAR_HOST_ATTR + '="1"]) :is(button, a, input, [role="button"], [role="menuitem"], [role="tab"], [data-testid="title-menu-bar-item"], [data-browser-occluder="true"], [data-browser-occluder="true"] *) {\n' +
      '  -webkit-app-region: no-drag;\n' +
      '}\n' +
      GW + ' :is([data-testid="title-menu-bar"] button, [data-testid="title-menu-bar-item"]) {\n' +
      '  border-radius: var(--prism-r-ctl) !important;\n' +
      '}\n' +
      GW + '[data-prism-layout="islands"][' + WCO_ACTIVE_ATTR + '="1"] .agy-shell > :is([' + TOPBAR_ANC_ATTR + '="1"], [' + TOPBAR_HOST_ATTR + '="1"]) {\n' +
      '  margin-top: calc(var(--prism-wco-pill-top, 2px) - var(--prism-workspace-pad, 8px)) !important;\n' +
      '  height: var(--prism-wco-pill-h, 33px) !important;\n' +
      '}\n' +
      GW + '[data-prism-layout="flush"][' + WCO_ACTIVE_ATTR + '="1"] .agy-shell > :is([' + TOPBAR_ANC_ATTR + '="1"], [' + TOPBAR_HOST_ATTR + '="1"]) {\n' +
      '  height: var(--prism-wco-pill-h, 35px) !important;\n' +
      '}\n' +
      GW + '[' + WCO_ACTIVE_ATTR + '="1"] [' + TOPBAR_ANC_ATTR + '="1"] [' + TOPBAR_HOST_ATTR + '="1"] {\n' +
      '  height: 100% !important;\n' +
      '  min-height: 0 !important;\n' +
      '}'
    );

    var sbHostList = GLASS_CARRIER_SIDEBARS.map(function (s) {
      return GW + ' ' + s + NOT_HOLE;
    }).join(',\n');
    var sbBeforeList = GLASS_CARRIER_SIDEBARS.map(function (s) {
      return GW + ' ' + s + NOT_HOLE + '::before';
    }).join(',\n');
    var SB_STICKY_A =
      LEFT_SB_SCOPE +
      ' :is([data-sidebar-section-drop-id], [data-index][style*="sticky"], [style*="position: sticky"], [style*="position:sticky"]):is(.bg-sidebar, :has([data-testid="section-header"])):not(:has([data-testid="project-header"])):not(:has([data-project-card]))';
    var SB_STICKY_B =
      '.sticky:is(.bg-sidebar, .bg-background):not(.pointer-events-none):not(:has([data-testid="project-header"])):not(:has([data-project-card]))';
    var prefixSticky = function (pfx, sfx) {
      sfx = sfx || '';
      return pfx + ' ' + SB_STICKY_A + sfx + ',\n' + pfx + ' ' + SB_STICKY_B + sfx;
    };
    var SB_STYLE_SEL = function (styleName) {
      return GW + '[' + SIDEBAR_STYLE_ATTR + '="' + styleName + '"]';
    };

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
      '  background-image: var(--prism-sheen-sidebar);\n' +
      '  backdrop-filter: var(--prism-sidebar-backdrop);\n' +
      '  -webkit-backdrop-filter: var(--prism-sidebar-backdrop);\n' +
      '  box-shadow: inset 0 1px 0 var(--prism-specular-sidebar);\n' +
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
      '  border: 1px solid var(--prism-border-sidebar) !important;\n' +
      '  backdrop-filter: none !important;\n' +
      '  -webkit-backdrop-filter: none !important;\n' +
      '  box-shadow: var(--prism-chip-shadow) !important;\n' +
      '}\n' +
      GW + ' .agy-row-actions > button:is(:hover, :focus-visible) {\n' +
      '  color: var(--prism-fg) !important;\n' +
      '  background-color: rgba(var(--prism-tint-2-rgb), 0.94) !important;\n' +
      '  border-color: var(--prism-border-sidebar-hover) !important;\n' +
      '  box-shadow: var(--prism-chip-shadow-hover) !important;\n' +
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
      prefixSticky(GW, '') + ' {\n' +
      '  isolation: isolate;\n' +
      '  background-color: transparent !important;\n' +
      '  backdrop-filter: none !important;\n' +
      '  -webkit-backdrop-filter: none !important;\n' +
      '  border-radius: var(--prism-r-ctl) !important;\n' +
      '}\n' +
      prefixSticky(GW, '::before') + ' {\n' +
      '  content: "";\n' +
      '  position: absolute;\n' +
      '  inset: 0;\n' +
      '  z-index: -1;\n' +
      '  border-radius: var(--prism-r-ctl) !important;\n' +
      '  pointer-events: none;\n' +
      '  background-color: var(--prism-surface-sticky-sidebar) !important;\n' +
      '  background-image: var(--prism-sheen-sidebar);\n' +
      '  backdrop-filter: var(--prism-sticky-backdrop) !important;\n' +
      '  -webkit-backdrop-filter: var(--prism-sticky-backdrop) !important;\n' +
      '  border: 1px solid var(--prism-border-sidebar);\n' +
      '  box-shadow: var(--prism-sticky-shadow);\n' +
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
      '  background-image: var(--prism-sheen-sidebar);\n' +
      '  backdrop-filter: var(--prism-project-backdrop) !important;\n' +
      '  -webkit-backdrop-filter: var(--prism-project-backdrop) !important;\n' +
      '  border: 1px solid var(--prism-border-sidebar);\n' +
      '  box-shadow: var(--prism-proj-shadow);\n' +
      '}\n' +
      GW + ' :is(button[data-testid="project-header"]:is(:hover, :focus-visible), .group\\/header:hover button[data-testid="project-header"], [data-project-card="true"]:is(:hover, :focus-visible))::before {\n' +
      '  border-color: var(--prism-accent-border) !important;\n' +
      '}\n' +
      GW + ' ' + LEFT_SB_SCOPE + ' .group\\/header > div.absolute > :is(button, a) {\n' +
      '  border-radius: var(--prism-r-xs) !important;\n' +
      '  color: var(--prism-fg-2) !important;\n' +
      '  background-color: rgba(var(--prism-sidebar-deep-rgb, var(--prism-shade-rgb)), ' + (isLight ? '0.82' : '0.74') + ') !important;\n' +
      '  border: 1px solid var(--prism-border-sidebar) !important;\n' +
      '  backdrop-filter: none !important;\n' +
      '  -webkit-backdrop-filter: none !important;\n' +
      '  box-shadow: var(--prism-chip-shadow) !important;\n' +
      '}\n' +
      GW + ' ' + LEFT_SB_SCOPE + ' .group\\/header > div.absolute > :is(button, a):is(:hover, :focus-visible) {\n' +
      '  color: var(--prism-fg) !important;\n' +
      '  background-color: rgba(var(--prism-tint-2-rgb), 0.94) !important;\n' +
      '  border-color: var(--prism-border-sidebar-hover) !important;\n' +
      '  box-shadow: var(--prism-chip-shadow-hover) !important;\n' +
      '}\n' +
      GW + ' .surface-opaque.bg-background {\n' +
      '  background-color: var(--prism-surface-card) !important;\n' +
      '}'
    );

    var prefixProj = function (pfx, sfx) {
      sfx = sfx || '';
      return pfx + ' button[data-testid="project-header"]' + sfx + ',\n' + pfx + ' [data-project-card="true"]' + sfx;
    };
    var prefixProjHoverBefore = function (pfx) {
      return (
        pfx + ' button[data-testid="project-header"]:is(:hover, :focus-visible)::before,\n' +
        pfx + ' .group\\/header:hover button[data-testid="project-header"]::before,\n' +
        pfx + ' [data-project-card="true"]:is(:hover, :focus-visible)::before'
      );
    };
    var SB_PROJ_EXP_A = 'button[data-testid="project-header"][aria-expanded="true"]';
    var SB_PROJ_EXP_B = '[data-project-card="true"][aria-expanded="true"]';
    var SB_PROJ_EXP_C = '[data-sidebar-section-drop-id]:not([data-sidebar-section-collapsed="true"]) :is(button[data-testid="project-header"], [data-project-card="true"]):not([aria-expanded="false"])';
    var prefixProjExpanded = function (pfx, sfx) {
      sfx = sfx || '';
      return pfx + ' ' + SB_PROJ_EXP_A + sfx + ',\n' + pfx + ' ' + SB_PROJ_EXP_B + sfx + ',\n' + pfx + ' ' + SB_PROJ_EXP_C + sfx;
    };
    var SB_CHILD_WRAP_INNER =
      '[data-sidebar-section-id]:not([data-sidebar-section-id="main-section-header"]):has(.agy-sidebar-row.pl-\\[30px\\], [data-testid="conversation-row-sidebar"].pl-\\[30px\\], .agy-sidebar-row.pl-5, [data-testid="conversation-row-sidebar"].pl-5)';

    // #6 Pure-CSS Sidebar List Styles (capsule default, underline, accordion, tree) + #9 Balanced Typography
    out.push(
      prefixSticky(SB_STYLE_SEL('underline'), '') + ' {\n' +
      '  border-radius: 0px !important;\n' +
      '}\n' +
      prefixSticky(SB_STYLE_SEL('underline'), '::before') + ' {\n' +
      '  background-color: transparent !important;\n' +
      '  background-image: none !important;\n' +
      '  backdrop-filter: none !important;\n' +
      '  -webkit-backdrop-filter: none !important;\n' +
      '  border: none !important;\n' +
      '  border-bottom: 1px solid var(--prism-border-sidebar) !important;\n' +
      '  border-radius: 0px !important;\n' +
      '  box-shadow: none !important;\n' +
      '}\n' +
      prefixProj(SB_STYLE_SEL('underline'), '') + ' {\n' +
      '  border-radius: 0px !important;\n' +
      '}\n' +
      prefixProj(SB_STYLE_SEL('underline'), '::before') + ' {\n' +
      '  background-color: transparent !important;\n' +
      '  background-image: none !important;\n' +
      '  backdrop-filter: none !important;\n' +
      '  -webkit-backdrop-filter: none !important;\n' +
      '  border: none !important;\n' +
      '  border-bottom: 1px solid var(--prism-border-sidebar) !important;\n' +
      '  border-radius: 0px !important;\n' +
      '  box-shadow: none !important;\n' +
      '}\n' +
      prefixProjHoverBefore(SB_STYLE_SEL('underline')) + ' {\n' +
      '  background-color: var(--prism-sidebar-muted) !important;\n' +
      '  border-bottom-color: var(--prism-accent-border) !important;\n' +
      '}\n' +
      prefixSticky(SB_STYLE_SEL('accordion'), '::before') + ' {\n' +
      '  background-color: transparent !important;\n' +
      '  background-image: none !important;\n' +
      '  backdrop-filter: none !important;\n' +
      '  -webkit-backdrop-filter: none !important;\n' +
      '  border: none !important;\n' +
      '  border-radius: 0px !important;\n' +
      '  box-shadow: none !important;\n' +
      '}\n' +
      prefixProj(SB_STYLE_SEL('accordion'), '::before') + ' {\n' +
      '  background-color: transparent !important;\n' +
      '  background-image: none !important;\n' +
      '  backdrop-filter: none !important;\n' +
      '  -webkit-backdrop-filter: none !important;\n' +
      '  border: none !important;\n' +
      '  box-shadow: none !important;\n' +
      '}\n' +
      prefixProjHoverBefore(SB_STYLE_SEL('accordion')) + ' {\n' +
      '  background-color: var(--prism-sidebar-muted) !important;\n' +
      '}\n' +
      prefixProj(SB_STYLE_SEL('accordion'), '::after') + ' {\n' +
      '  content: "";\n' +
      '  position: absolute;\n' +
      '  right: 10px;\n' +
      '  top: 50%;\n' +
      '  width: 6px;\n' +
      '  height: 6px;\n' +
      '  border-right: 1.5px solid currentColor;\n' +
      '  border-bottom: 1.5px solid currentColor;\n' +
      '  opacity: 0.55;\n' +
      '  pointer-events: none;\n' +
      '  transform: translateY(-60%) rotate(-45deg);\n' +
      '  transition: transform 150ms ease, opacity 120ms ease;\n' +
      '}\n' +
      prefixProjExpanded(SB_STYLE_SEL('accordion'), '') + ' {\n' +
      '  color: var(--prism-accent) !important;\n' +
      '}\n' +
      prefixProjExpanded(SB_STYLE_SEL('accordion'), '::after') + ' {\n' +
      '  transform: translateY(-70%) rotate(45deg);\n' +
      '  opacity: 0.88;\n' +
      '  border-color: var(--prism-accent);\n' +
      '}\n' +
      SB_STYLE_SEL('accordion') + ' .group\\/header:is(:hover, :focus-within) button[data-testid="project-header"]::after,\n' +
      SB_STYLE_SEL('accordion') + ' button[data-testid="project-header"]:is(:hover, :focus-within)::after,\n' +
      SB_STYLE_SEL('accordion') + ' [data-project-card="true"]:is(:hover, :focus-within)::after {\n' +
      '  opacity: 0 !important;\n' +
      '}\n' +
      SB_STYLE_SEL('accordion') + ' ' + LEFT_SB_SCOPE + ' :is(.agy-sidebar-row, [data-testid="conversation-row-sidebar"])[data-selected="true"] {\n' +
      '  background-color: var(--prism-accent-soft) !important;\n' +
      '  color: var(--prism-accent) !important;\n' +
      '  border-radius: var(--prism-r-ctl) !important;\n' +
      '  box-shadow: none !important;\n' +
      '}\n' +
      SB_STYLE_SEL('accordion') + ' ' + LEFT_SB_SCOPE + ' ' + SB_CHILD_WRAP_INNER + ' {\n' +
      '  background-color: rgba(var(--prism-pt-rgb), 0.025) !important;\n' +
      '}\n' +
      prefixSticky(SB_STYLE_SEL('tree'), '') + ' {\n' +
      '  border-radius: 0px !important;\n' +
      '}\n' +
      prefixSticky(SB_STYLE_SEL('tree'), '::before') + ' {\n' +
      '  background-color: transparent !important;\n' +
      '  background-image: none !important;\n' +
      '  backdrop-filter: none !important;\n' +
      '  -webkit-backdrop-filter: none !important;\n' +
      '  border: none !important;\n' +
      '  border-bottom: 1px solid var(--prism-border-sidebar) !important;\n' +
      '  border-radius: 0px !important;\n' +
      '  box-shadow: none !important;\n' +
      '}\n' +
      SB_STYLE_SEL('tree') + ' ' + LEFT_SB_SCOPE + ' [data-testid="section-header"] button:not(h2 button):not(h2 *) {\n' +
      '  border-radius: 4px !important;\n' +
      '}\n' +
      prefixProj(SB_STYLE_SEL('tree'), '') + ' {\n' +
      '  border-radius: 4px !important;\n' +
      '}\n' +
      prefixProj(SB_STYLE_SEL('tree'), '::before') + ' {\n' +
      '  background-color: transparent !important;\n' +
      '  background-image: none !important;\n' +
      '  backdrop-filter: none !important;\n' +
      '  -webkit-backdrop-filter: none !important;\n' +
      '  border: none !important;\n' +
      '  border-radius: 4px !important;\n' +
      '  box-shadow: none !important;\n' +
      '}\n' +
      prefixProjHoverBefore(SB_STYLE_SEL('tree')) + ' {\n' +
      '  background-color: var(--prism-sidebar-muted) !important;\n' +
      '}\n' +
      prefixProj(SB_STYLE_SEL('tree'), '::after') + ' {\n' +
      '  content: "";\n' +
      '  order: -1;\n' +
      '  flex-shrink: 0;\n' +
      '  width: 5px;\n' +
      '  height: 5px;\n' +
      '  margin-left: 2px;\n' +
      '  margin-right: 6px;\n' +
      '  border-right: 1.5px solid currentColor;\n' +
      '  border-bottom: 1.5px solid currentColor;\n' +
      '  opacity: 0.60;\n' +
      '  pointer-events: none;\n' +
      '  transform: rotate(-45deg);\n' +
      '  transition: transform 140ms ease, opacity 120ms ease;\n' +
      '}\n' +
      prefixProjExpanded(SB_STYLE_SEL('tree'), '::after') + ' {\n' +
      '  transform: rotate(45deg);\n' +
      '  opacity: 0.88;\n' +
      '}\n' +
      SB_STYLE_SEL('tree') + ' ' + LEFT_SB_SCOPE + ' ' + SB_CHILD_WRAP_INNER + ' {\n' +
      '  position: relative;\n' +
      '}\n' +
      SB_STYLE_SEL('tree') + ' ' + LEFT_SB_SCOPE + ' ' + SB_CHILD_WRAP_INNER + '::before {\n' +
      '  content: "";\n' +
      '  position: absolute;\n' +
      '  left: 11px;\n' +
      '  top: 0;\n' +
      '  bottom: 0;\n' +
      '  width: 1px;\n' +
      '  pointer-events: none;\n' +
      '  background-color: var(--prism-sidebar-tree-guide);\n' +
      '}\n' +
      SB_STYLE_SEL('tree') + ' ' + LEFT_SB_SCOPE + ' :is(.agy-sidebar-row, [data-testid="conversation-row-sidebar"]) {\n' +
      '  border-radius: 4px !important;\n' +
      '}\n' +
      GW + '[' + SIDEBAR_TYPO_ATTR + '="balanced"] ' + LEFT_SB_SCOPE + ' [data-testid="section-header"] h2 {\n' +
      '  font-size: var(--prism-sb-section-fs, 13px) !important;\n' +
      '  font-weight: 600 !important;\n' +
      '  opacity: 0.82 !important;\n' +
      '  line-height: var(--prism-sb-section-lh, 1.25) !important;\n' +
      '  letter-spacing: 0.01em !important;\n' +
      '  text-transform: none !important;\n' +
      '}\n' +
      GW + '[' + SIDEBAR_TYPO_ATTR + '="balanced"] ' + LEFT_SB_SCOPE + ' .group\\/section-header {\n' +
      '  padding-top: 2px !important;\n' +
      '  padding-bottom: 2px !important;\n' +
      '  min-height: 24px !important;\n' +
      '}\n' +
      GW + '[' + SIDEBAR_TYPO_ATTR + '="balanced"] ' + LEFT_SB_SCOPE + ' :is(.agy-row-actions, .group\\/header > div.absolute) {\n' +
      '  gap: 2px !important;\n' +
      '}\n' +
      GW + '[' + SIDEBAR_TYPO_ATTR + '="balanced"] ' + LEFT_SB_SCOPE + ' [data-testid="section-header"] :is(button, a):not(h2 button):not(h2 *),\n' +
      GW + '[' + SIDEBAR_TYPO_ATTR + '="balanced"] ' + LEFT_SB_SCOPE + ' :is(.agy-row-actions > button, .group\\/header > div.absolute > :is(button, a)):not(h2 button):not(h2 *) {\n' +
      '  width: 18px !important;\n' +
      '  height: 18px !important;\n' +
      '  min-width: 18px !important;\n' +
      '  min-height: 18px !important;\n' +
      '  padding: 0 !important;\n' +
      '  border-radius: var(--prism-r-xs) !important;\n' +
      '  display: inline-flex !important;\n' +
      '  align-items: center !important;\n' +
      '  justify-content: center !important;\n' +
      '}\n' +
      GW + '[' + SIDEBAR_TYPO_ATTR + '="balanced"] ' + LEFT_SB_SCOPE + ' :is(button[data-testid="project-header"], [data-project-card="true"]) {\n' +
      '  font-size: var(--prism-sb-project-fs, 13px) !important;\n' +
      '  font-weight: 500 !important;\n' +
      '  line-height: 1.25 !important;\n' +
      '  letter-spacing: normal !important;\n' +
      '  text-transform: none !important;\n' +
      '}\n' +
      GW + '[' + SIDEBAR_TYPO_ATTR + '="balanced"] ' + LEFT_SB_SCOPE + ' :is(button[data-testid="project-header"].group\\/headerbtn, .group\\/headerbtn) {\n' +
      '  padding-top: 4px !important;\n' +
      '  padding-bottom: 4px !important;\n' +
      '}\n' +
      GW + '[' + SIDEBAR_TYPO_ATTR + '="balanced"] ' + LEFT_SB_SCOPE + ' :is(.agy-sidebar-row, [data-testid="conversation-row-sidebar"]) {\n' +
      '  font-size: var(--prism-sb-item-fs, 12.5px) !important;\n' +
      '  line-height: 1.3 !important;\n' +
      '}'
    );

    // Req #3 & #4: Split Main Chat + Right Aux Pane `::before` Frosted-Glass Carriers (both islands & flush, NOT_HOLE guarded)
    var workspaceHostList = GLASS_CARRIER_CHAT.concat(GLASS_CARRIER_RIGHT_PANES).map(function (s) {
      return GW + ' ' + s + NOT_HOLE;
    }).join(',\n');
    var chatBeforeList = GLASS_CARRIER_CHAT.map(function (s) {
      return GW + ' ' + s + NOT_HOLE + '::before';
    }).join(',\n');
    var rightPaneBeforeList = GLASS_CARRIER_RIGHT_PANES.map(function (s) {
      return GW + ' ' + s + NOT_HOLE + '::before';
    }).join(',\n');

    out.push(
      workspaceHostList + ' {\n' +
      '  position: relative !important;\n' +
      '  isolation: isolate;\n' +
      '  background-color: transparent !important;\n' +
      '  background-image: none !important;\n' +
      '  backdrop-filter: none !important;\n' +
      '  -webkit-backdrop-filter: none !important;\n' +
      '}\n' +
      chatBeforeList + ' {\n' +
      '  content: "";\n' +
      '  position: absolute;\n' +
      '  inset: 0;\n' +
      '  z-index: -1;\n' +
      '  border-radius: inherit;\n' +
      '  pointer-events: none;\n' +
      '  background-color: var(--prism-surface-chat);\n' +
      '  background-image: var(--prism-sheen-workspace);\n' +
      '  backdrop-filter: var(--prism-chat-backdrop);\n' +
      '  -webkit-backdrop-filter: var(--prism-chat-backdrop);\n' +
      '  box-shadow: inset 0 1px 0 var(--prism-specular-workspace);\n' +
      '}\n' +
      rightPaneBeforeList + ' {\n' +
      '  content: "";\n' +
      '  position: absolute;\n' +
      '  inset: 0;\n' +
      '  z-index: -1;\n' +
      '  border-radius: inherit;\n' +
      '  pointer-events: none;\n' +
      '  background-color: var(--prism-surface-right-pane, var(--prism-surface-chat));\n' +
      '  background-image: var(--prism-sheen-right-pane);\n' +
      '  backdrop-filter: var(--prism-right-pane-backdrop);\n' +
      '  -webkit-backdrop-filter: var(--prism-right-pane-backdrop);\n' +
      '  box-shadow: inset 0 1px 0 var(--prism-specular-right-pane);\n' +
      '}\n' +
      GW + ' [data-testid="aux-pane-split"] :is([data-testid="conversation-view"], [data-main-content-header], [data-side-panel-strip], .agy-sheet [data-side-panel-body], [data-side-panel-body]) {\n' +
      '  background-color: transparent !important;\n' +
      '  background-image: none !important;\n' +
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
      '  background-color: var(--prism-surface-main-page, var(--prism-surface-sidebar));\n' +
      '  background-image: var(--prism-sheen-main-page);\n' +
      '  backdrop-filter: var(--prism-chat-backdrop);\n' +
      '  -webkit-backdrop-filter: var(--prism-chat-backdrop);\n' +
      '  box-shadow: inset 0 1px 0 var(--prism-specular-main-page);\n' +
      '}\n' +
      GW + ' :is([data-testid="customization-card"], .agy-spotlight-card, [data-testid="marketplace-bundles-banner"]) {\n' +
      '  background-color: var(--prism-surface-card) !important;\n' +
      '  background-image: var(--prism-sheen-card) !important;\n' +
      '  border-style: solid !important;\n' +
      '  border-color: var(--prism-border-card) !important;\n' +
      '  border-width: var(--prism-bw-card-top, 1px) var(--prism-bw-card-right, 1px) var(--prism-bw-card-bottom, 1px) var(--prism-bw-card-left, 1px) !important;\n' +
      '  border-radius: var(--prism-r-card) !important;\n' +
      '  backdrop-filter: var(--prism-card-backdrop) !important;\n' +
      '  -webkit-backdrop-filter: var(--prism-card-backdrop) !important;\n' +
      '  box-shadow: inset 0 1px 0 var(--prism-specular-card), var(--prism-shadow-card) !important;\n' +
      '}\n' +
      GW + ' [data-testid="customization-card"]:hover {\n' +
      '  background-color: var(--prism-secondary-bg) !important;\n' +
      '  border-color: var(--prism-accent-border) !important;\n' +
      '}\n' +
      GW + ' :is(.agy-field:has([data-testid="customizations-search"]), [data-testid="plugins-tabs"]) {\n' +
      '  background-color: rgba(var(--prism-sidebar-rgb, var(--prism-shade-rgb)), ' + (isLight ? '0.72' : '0.62') + ') !important;\n' +
      '  border-color: var(--prism-border-card) !important;\n' +
      '  backdrop-filter: var(--prism-chrome-chip-backdrop) !important;\n' +
      '  -webkit-backdrop-filter: var(--prism-chrome-chip-backdrop) !important;\n' +
      '}'
    );

    var compHostList = GLASS_CARRIER_COMPOSERS.map(function (s) {
      return GW + ' ' + s;
    }).join(',\n');
    var compBeforeList = GLASS_CARRIER_COMPOSERS.map(function (s) {
      return GW + ' ' + s + '::before';
    }).join(',\n');
    var compAfterList = GLASS_CARRIER_COMPOSERS.map(function (s) {
      return GW + ' ' + s + '::after';
    }).join(',\n');

    // #7 Composer Single-Carrier Flattening (B6: zero --color-card-border wipe, GW Fail-Open on all branches, fixed-probe top=0 safe)
    out.push(
      compHostList + ' {\n' +
      '  position: relative !important;\n' +
      '  isolation: isolate;\n' +
      '  overflow: visible !important;\n' +
      '  background-color: transparent !important;\n' +
      '  background-image: none !important;\n' +
      '  backdrop-filter: none !important;\n' +
      '  -webkit-backdrop-filter: none !important;\n' +
      '  border-style: solid !important;\n' +
      '  border-color: var(--prism-border-composer, var(--prism-border-card)) !important;\n' +
      '  border-width: var(--prism-bw-composer-top, 1px) var(--prism-bw-composer-right, 1px) var(--prism-bw-composer-bottom, 1px) var(--prism-bw-composer-left, 1px) !important;\n' +
      '  border-radius: var(--prism-r-composer, var(--prism-r-card)) !important;\n' +
      '  outline: none !important;\n' +
      '  box-shadow: var(--prism-shadow-composer, var(--prism-shadow-island)) !important;\n' +
      '  --glass: transparent;\n' +
      '  --glass-border: transparent;\n' +
      '  --glass-highlight: transparent;\n' +
      '}\n' +
      compBeforeList + ' {\n' +
      '  content: "";\n' +
      '  position: absolute;\n' +
      '  inset: 0;\n' +
      '  z-index: -1;\n' +
      '  border-radius: inherit;\n' +
      '  pointer-events: none;\n' +
      '  background-color: var(--prism-surface-composer);\n' +
      '  background-image: var(--prism-sheen-composer);\n' +
      '  backdrop-filter: var(--prism-composer-backdrop);\n' +
      '  -webkit-backdrop-filter: var(--prism-composer-backdrop);\n' +
      '  box-shadow: inset 0 1px 0 var(--prism-specular-composer);\n' +
      '}\n' +
      compAfterList + ' {\n' +
      '  content: none !important;\n' +
      '  display: none !important;\n' +
      '}\n' +
      GW + ' :is([data-main-content-body], [data-testid="conversation-view"], [data-testid="aux-pane-split"]) :is(div, section):has(> #antigravity\\.agentSidePanelInputBox):not([data-main-content-body]):not([data-testid="conversation-view"]):not([data-testid="aux-pane-split"]):not([data-testid="aux-pane-split"] > :first-child):not(.agy-shell):not(.agy-inset-shell):not(.composer-dock),\n' +
      GW + ' [data-testid="agent-input-box"]:not([data-main-content-body]):not([data-testid="conversation-view"]):not([data-testid="aux-pane-split"]):not([data-testid="aux-pane-split"] > :first-child):not(.agy-shell):not(.agy-inset-shell):not(.composer-dock):is(:has(> #antigravity\\.agentSidePanelInputBox), :has([data-testid="agent-input-box"])) {\n' +
      '  background: transparent !important;\n' +
      '  background-color: transparent !important;\n' +
      '  background-image: none !important;\n' +
      '  border: none !important;\n' +
      '  outline: none !important;\n' +
      '  box-shadow: none !important;\n' +
      '  backdrop-filter: none !important;\n' +
      '  -webkit-backdrop-filter: none !important;\n' +
      '}\n' +
      GW + ' :is([data-main-content-body], [data-testid="conversation-view"], [data-testid="aux-pane-split"]) :is(div, section):has(> #antigravity\\.agentSidePanelInputBox):not([data-main-content-body]):not([data-testid="conversation-view"]):not([data-testid="aux-pane-split"]):not([data-testid="aux-pane-split"] > :first-child):not(.agy-shell):not(.agy-inset-shell):not(.composer-dock)::before,\n' +
      GW + ' :is([data-main-content-body], [data-testid="conversation-view"], [data-testid="aux-pane-split"]) :is(div, section):has(> #antigravity\\.agentSidePanelInputBox):not([data-main-content-body]):not([data-testid="conversation-view"]):not([data-testid="aux-pane-split"]):not([data-testid="aux-pane-split"] > :first-child):not(.agy-shell):not(.agy-inset-shell):not(.composer-dock)::after {\n' +
      '  content: none !important;\n' +
      '  background: none !important;\n' +
      '  border: none !important;\n' +
      '  box-shadow: none !important;\n' +
      '}\n' +
      GW + ' #antigravity\\.agentSidePanelInputBox > :is(.surface-composer-card, .surface-composer, .agy-composer, [data-testid="agent-input-box"], div:first-child:has(~ .surface-composer-card):not(.surface-composer-card):not([data-testid*="attachment"]):not([data-testid*="chip"]):not([role="menu"]):not([role="listbox"])),\n' +
      GW + ' #antigravity\\.agentSidePanelInputBox :is(.surface-composer-card, .surface-composer, .agy-composer, [data-testid="agent-input-box"]),\n' +
      GW + ' [data-testid="agent-input-box"]:not(#antigravity\\.agentSidePanelInputBox):not(:has(#antigravity\\.agentSidePanelInputBox)) :is(.surface-composer-card, .surface-composer, .agy-composer, [data-testid="agent-input-box"]),\n' +
      GW + ' [data-testid="agent-input-box"]:not(#antigravity\\.agentSidePanelInputBox):not(:has(#antigravity\\.agentSidePanelInputBox)) > :not(.surface-composer-card):has(~ .surface-composer-card):not([data-testid*="attachment"]):not([data-testid*="chip"]):not([role="menu"]):not([role="listbox"]),\n' +
      GW + ' :is(#antigravity\\.agentSidePanelInputBox, [data-testid="agent-input-box"], .surface-composer-card, .agy-composer) > :is(div.relative.w-full, .agy-composer-footer, form, [data-testid="composer-editor-container"]) {\n' +
      '  background: transparent !important;\n' +
      '  background-color: transparent !important;\n' +
      '  background-image: none !important;\n' +
      '  border: none !important;\n' +
      '  outline: none !important;\n' +
      '  box-shadow: none !important;\n' +
      '  border-radius: 0px !important;\n' +
      '  backdrop-filter: none !important;\n' +
      '  -webkit-backdrop-filter: none !important;\n' +
      '}\n' +
      GW + ' #antigravity\\.agentSidePanelInputBox :is(.surface-composer-card, .surface-composer, .agy-composer, [data-testid="agent-input-box"])::before,\n' +
      GW + ' #antigravity\\.agentSidePanelInputBox :is(.surface-composer-card, .surface-composer, .agy-composer, [data-testid="agent-input-box"])::after,\n' +
      GW + ' #antigravity\\.agentSidePanelInputBox > div:first-child:has(~ .surface-composer-card):not(.surface-composer-card):not([data-testid*="attachment"]):not([data-testid*="chip"])::before,\n' +
      GW + ' #antigravity\\.agentSidePanelInputBox > div:first-child:has(~ .surface-composer-card):not(.surface-composer-card):not([data-testid*="attachment"]):not([data-testid*="chip"])::after,\n' +
      GW + ' [data-testid="agent-input-box"]:not(#antigravity\\.agentSidePanelInputBox):not(:has(#antigravity\\.agentSidePanelInputBox)) :is(.surface-composer-card, .surface-composer, .agy-composer, [data-testid="agent-input-box"])::before,\n' +
      GW + ' [data-testid="agent-input-box"]:not(#antigravity\\.agentSidePanelInputBox):not(:has(#antigravity\\.agentSidePanelInputBox)) :is(.surface-composer-card, .surface-composer, .agy-composer, [data-testid="agent-input-box"])::after {\n' +
      '  content: none !important;\n' +
      '  display: none !important;\n' +
      '}\n' +
      GW + ' #antigravity\\.agentSidePanelInputBox > .surface-composer-card:not(:first-child),\n' +
      GW + ' [data-testid="agent-input-box"]:not(#antigravity\\.agentSidePanelInputBox):not(:has(#antigravity\\.agentSidePanelInputBox)) > .surface-composer-card:not(:first-child) {\n' +
      '  border-top: 1px solid var(--prism-border-composer-divider, var(--prism-border-composer)) !important;\n' +
      '}'
    );

    out.push(
      GW + ' [data-testid="conversation-view"]:not([data-testid="aux-pane-split"] *):not(.agy-shell > main *)' + NOT_HOLE + ',\n' +
      GW + ' [data-main-content-header]:not([data-testid="aux-pane-split"] *):not(.agy-shell > main *)' + NOT_HOLE + ' {\n' +
      '  background-color: var(--prism-surface-chat) !important;\n' +
      '  backdrop-filter: none !important;\n' +
      '}\n' +
      GW + ' [data-side-panel-strip] {\n' +
      '  border-bottom: 1px solid var(--prism-border-right-pane) !important;\n' +
      '}\n' +
      GW + ' [data-testid="new-tab-search-input"] {\n' +
      '  background-color: rgba(var(--prism-tint-1-rgb), ' + (isLight ? '0.68' : '0.46') + ') !important;\n' +
      '  border: 1px solid var(--prism-border-right-pane) !important;\n' +
      '  border-radius: var(--prism-r-ctl) !important;\n' +
      '  backdrop-filter: var(--prism-chrome-chip-backdrop) !important;\n' +
      '  -webkit-backdrop-filter: var(--prism-chrome-chip-backdrop) !important;\n' +
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
      '  border-style: solid !important;\n' +
      '  border-top-width: var(--prism-bw-card-top, 1px) !important;\n' +
      '  border-right-width: var(--prism-bw-card-right, 1px) !important;\n' +
      '  border-bottom-width: var(--prism-bw-card-bottom, 1px) !important;\n' +
      '  border-left-width: var(--prism-bw-card-left, 1px) !important;\n' +
      '  border-color: var(--prism-border-card) !important;\n' +
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
        GW + '[data-prism-layout="islands"] [data-testid="title-menu-bar"]' + NOT_HOLE + ' {\n' +
        '  width: auto !important;\n' +
        '  margin-right: max(0px, calc(var(--prism-wco-inset-right, 0px) - var(--prism-workspace-pad, 0px))) !important;\n' +
        '}\n' +
        GW + '[data-prism-layout="islands"] [data-testid="sidebar-split"] > div:first-child' + NOT_HOLE + ',\n' +
        GW + '[data-prism-layout="islands"] .agy-sidebar' + NOT_HOLE + ',\n' +
        GW + '[data-prism-layout="islands"] aside[data-side-panel-body]:not(.agy-sheet *):not([data-testid="aux-pane-split"] *)' + NOT_HOLE + ' {\n' +
        '  border-radius: var(--prism-r-left-island) !important;\n' +
        '  border-style: solid !important;\n' +
        '  border-color: var(--prism-border-sidebar, var(--prism-border-island)) !important;\n' +
        '  border-width: var(--prism-bw-sidebar-top, 1px) var(--prism-bw-sidebar-right, 1px) var(--prism-bw-sidebar-bottom, 1px) var(--prism-bw-sidebar-left, 1px) !important;\n' +
        '  box-shadow: var(--prism-shadow-sidebar, var(--prism-shadow-island)) !important;\n' +
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
        GW + '[data-prism-layout="islands"] .monaco-workbench :is(.part.activitybar, .part.sidebar) {\n' +
        '  margin: calc(var(--prism-island-gap) * 0.5) !important;\n' +
        '  border-radius: var(--prism-r-left-island, var(--prism-r-island)) !important;\n' +
        '  border-style: solid !important;\n' +
        '  border-color: var(--prism-border-sidebar, var(--prism-border-island)) !important;\n' +
        '  border-width: var(--prism-bw-sidebar-top, 1px) var(--prism-bw-sidebar-right, 1px) var(--prism-bw-sidebar-bottom, 1px) var(--prism-bw-sidebar-left, 1px) !important;\n' +
        '  box-shadow: var(--prism-shadow-sidebar, var(--prism-shadow-island)) !important;\n' +
        '}\n' +
        GW + '[data-prism-layout="islands"] .monaco-workbench :is(.part.editor .editor-group-container, .part.panel) {\n' +
        '  margin: calc(var(--prism-island-gap) * 0.5) !important;\n' +
        '  border-radius: var(--prism-r-workspace, var(--prism-r-island)) !important;\n' +
        '  border-style: solid !important;\n' +
        '  border-color: var(--prism-border-workspace, var(--prism-border-island)) !important;\n' +
        '  border-width: var(--prism-bw-workspace-top, 1px) var(--prism-bw-workspace-right, 1px) var(--prism-bw-workspace-bottom, 1px) var(--prism-bw-workspace-left, 1px) !important;\n' +
        '  box-shadow: var(--prism-shadow-workspace, var(--prism-shadow-island)) !important;\n' +
        '}\n' +
        GW + '[data-prism-layout="islands"] .monaco-workbench .part.auxiliarybar {\n' +
        '  margin: calc(var(--prism-island-gap) * 0.5) !important;\n' +
        '}\n' +
        GW + '[data-prism-layout="islands"] [data-testid="aux-pane-split"] > :is(div, main, section):first-child' + NOT_HOLE + ',\n' +
        GW + '[data-prism-layout="islands"] .agy-shell > main' + NOT_HOLE + ' {\n' +
        '  border-radius: var(--prism-r-workspace, var(--prism-r-island)) !important;\n' +
        '  border-style: solid !important;\n' +
        '  border-color: var(--prism-border-workspace, var(--prism-border-island)) !important;\n' +
        '  border-width: var(--prism-bw-workspace-top, 1px) var(--prism-bw-workspace-right, 1px) var(--prism-bw-workspace-bottom, 1px) var(--prism-bw-workspace-left, 1px) !important;\n' +
        '  box-shadow: var(--prism-shadow-workspace, var(--prism-shadow-island)) !important;\n' +
        '}\n' +
        GW + '[data-prism-layout="islands"] [data-testid="aux-pane-split"] > :is(div, aside, section):last-child:not(:first-child):not([hidden]):not([aria-hidden="true"])' + NOT_HOLE + ',\n' +
        GW + '[data-prism-layout="islands"] .monaco-workbench .part.auxiliarybar' + NOT_HOLE + ' {\n' +
        '  border-radius: var(--prism-r-right-island) !important;\n' +
        '  border-style: solid !important;\n' +
        '  border-color: var(--prism-border-right-pane, var(--prism-border-island)) !important;\n' +
        '  border-width: var(--prism-bw-right-pane-top, 1px) var(--prism-bw-right-pane-right, 1px) var(--prism-bw-right-pane-bottom, 1px) var(--prism-bw-right-pane-left, 1px) !important;\n' +
        '  box-shadow: var(--prism-shadow-right-pane, var(--prism-shadow-island)) !important;\n' +
        '}'
      );
    } else {
      out.push(
        GW + '[data-prism-layout="flush"] [data-testid="title-menu-bar"]' + NOT_HOLE + ' {\n' +
        '  width: auto !important;\n' +
        '  margin-right: var(--prism-wco-inset-right, 0px) !important;\n' +
        '}\n' +
        GW + '[data-prism-layout="flush"] :is([data-testid="sidebar-split"], [data-testid="aux-pane-split"]) > div:nth-child(2) {\n' +
        '  width: 1px !important;\n' +
        '  background-color: var(--prism-border-sash, var(--prism-border-hairline)) !important;\n' +
        '}\n' +
        GW + '[data-prism-layout="flush"] [data-testid="sidebar-split"] > div:first-child' + NOT_HOLE + ',\n' +
        GW + '[data-prism-layout="flush"] .agy-sidebar' + NOT_HOLE + ',\n' +
        GW + '[data-prism-layout="flush"] aside[data-side-panel-body]:not(.agy-sheet *):not([data-testid="aux-pane-split"] *)' + NOT_HOLE + ' {\n' +
        '  border-right: var(--prism-bw-sidebar-right, 1px) solid var(--prism-border-sidebar) !important;\n' +
        '}\n' +
        GW + '[data-prism-layout="flush"] [data-side-panel-strip]:not([data-testid="aux-pane-split"] *)' + NOT_HOLE + ',\n' +
        GW + '[data-prism-layout="flush"] .agy-sheet [data-side-panel-body]:not([data-testid="aux-pane-split"] *)' + NOT_HOLE + ' {\n' +
        '  background-color: var(--prism-surface-right-pane, var(--prism-surface-chat)) !important;\n' +
        '  backdrop-filter: none !important;\n' +
        '  -webkit-backdrop-filter: none !important;\n' +
        '}'
      );
    }

    // Both islands & flush suppress trailing ::after edge dividers on main/side panel bodies
    out.push(
      GW + ' :is([data-main-content-body], .agy-sheet [data-side-panel-body], [data-side-panel-body])::after {\n' +
      '  display: none !important;\n' +
      '}'
    );

    // 5. Solid Popovers, Menus & 2.34.0 Settings Modal Floor (>= 0.94 alpha, zero [class*="bg-background"] hover clobber)
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
      '  border-radius: var(--prism-r-popover, var(--prism-r-card)) !important;\n' +
      '  background-color: var(--prism-surface-popover) !important;\n' +
      '  background-image: var(--prism-sheen-popover, var(--prism-sheen)) !important;\n' +
      '  backdrop-filter: var(--prism-popover-backdrop) !important;\n' +
      '  -webkit-backdrop-filter: var(--prism-popover-backdrop) !important;\n' +
      '  border-style: solid !important;\n' +
      '  border-color: var(--prism-border-popover) !important;\n' +
      '  border-width: var(--prism-bw-popover-top, 1px) var(--prism-bw-popover-right, 1px) var(--prism-bw-popover-bottom, 1px) var(--prism-bw-popover-left, 1px) !important;\n' +
      '  box-shadow: inset 0 1px 0 var(--prism-specular-popover, var(--prism-specular-top)), var(--prism-shadow-popover) !important;\n' +
      '}\n\n' +
      GG + ' :is([data-testid="title-menu-bar"] [data-browser-occluder="true"], .surface-opaque.bg-sidebar:not(.sticky):not([style*="sticky"])) {\n' +
      '  border-radius: var(--prism-r-popover, var(--prism-r-card)) !important;\n' +
      '}\n\n' +
      GG + ' :is(.agy-dialog, .settings-modal-container, [role="dialog"]:not(#gemini-neko-observer-modal):not([data-testid="media-modal"]):not(.prism-sheet), [role="alertdialog"]) :where(.dark, .light, .theme-dark, .theme-light) {\n' +
      '  --background: var(--prism-surface-popover) !important;\n' +
      '  --color-background: var(--prism-surface-popover) !important;\n' +
      '  --content: var(--prism-surface-popover) !important;\n' +
      '}'
    );

    // 6. Req #1: Pure-CSS Welcome Watermark Logo Suppression (Zero DOM Removal, Zero Flicker, Instant Restore)
    var welcomeExplicitList = WELCOME_LOGO_EXPLICIT_SELECTORS.join(', ');
    var welcomeNotGuards =
      ':not(button):not(button *):not(a):not(a *):not([role="button"]):not([role="button"] *)' +
      ':not([data-testid="agent-input-box"] *):not(.surface-composer-card *)' +
      ':not(pre *):not(code *):not(.md-code-block *)' +
      ':not([role="dialog"] *):not([role="menu"] *):not([data-testid="plugin-detail"] *)';
    var welcomeRoot = GG + '[' + WELCOME_LOGO_ATTR + '="hidden"]';
    out.push(
      welcomeRoot + ' [' + WELCOME_LOGO_MARK + '="1"],\n' +
      welcomeRoot + ' :is([data-main-content-body], [data-testid="conversation-view"]) :is(' + welcomeExplicitList + ')' + welcomeNotGuards + ',\n' +
      welcomeRoot + ' [' + WELCOME_LOGO_PSEUDO_MARK + '="before"]::before,\n' +
      welcomeRoot + ' [' + WELCOME_LOGO_PSEUDO_MARK + '="after"]::after {\n' +
      '  opacity: 0 !important;\n' +
      '  visibility: hidden !important;\n' +
      '  pointer-events: none !important;\n' +
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

    // 7. #14 Per-Region Typography (workspace -> card -> composer cascade order; code/svg/pill/sibling/input safe)
    var TYPO_SPECS = [
      {
        id: 'topbar',
        scope: ':is([data-testid="title-menu-bar"], .monaco-workbench .part.titlebar)',
        extraEx: DIALOG_DESCENDANT_EXCLUDE,
        hasFs: true,
      },
      {
        id: 'sidebar',
        scope: ':is([data-testid="sidebar-split"] > div:first-child, .agy-sidebar, aside[data-side-panel-body]:not(.agy-sheet *):not([data-testid="aux-pane-split"] *), .monaco-workbench .part.activitybar, .monaco-workbench .part.sidebar)',
        extraEx: DIALOG_DESCENDANT_EXCLUDE,
        hasFs: false,
      },
      {
        id: 'workspace',
        scope: ':is([data-testid="aux-pane-split"] > :is(div, main, section):first-child, .agy-shell > main, .monaco-workbench .part.editor > .content, .monaco-workbench .part.panel)',
        extraEx: COMPOSER_DESCENDANT_EXCLUDE + DIALOG_DESCENDANT_EXCLUDE,
        hasFs: true,
      },
      {
        id: 'card',
        scope: ':is(.msg-user, .msg-agent, [data-testid="customization-card"], .agy-spotlight-card, [data-testid="marketplace-bundles-banner"], .surface-opaque.bg-background)',
        extraEx: COMPOSER_DESCENDANT_EXCLUDE + DIALOG_DESCENDANT_EXCLUDE,
        hasFs: true,
      },
      {
        id: 'composer',
        scope: ':is(#antigravity\\.agentSidePanelInputBox, [data-testid="agent-input-box"], .surface-composer-card, .agy-composer)',
        extraEx: DIALOG_DESCENDANT_EXCLUDE,
        hasFs: true,
      },
      {
        id: 'rightPane',
        scope: ':is([data-testid="aux-pane-split"] > :is(div, aside, section):last-child:not(:first-child):not([hidden]):not([aria-hidden="true"]), .monaco-workbench .part.auxiliarybar, [data-side-panel-strip]:not([data-testid="aux-pane-split"] *), .agy-sheet [data-side-panel-body]:not([data-testid="aux-pane-split"] *))',
        extraEx: COMPOSER_DESCENDANT_EXCLUDE + DIALOG_DESCENDANT_EXCLUDE,
        hasFs: true,
      },
      {
        id: 'popover',
        scope: ':is(' + SOLID_POPOVERS.join(', ') + ')',
        extraEx: '',
        hasFs: true,
      },
    ];
    for (var ts = 0; ts < TYPO_SPECS.length; ts += 1) {
      var sp = TYPO_SPECS[ts];
      var sfx = TYPO_PROTECT_EX + SIBLING_EXCLUDE + SIBLING_DESCENDANT_EXCLUDE + sp.extraEx;
      var rootSfx = sp.id === 'popover' ? TYPO_PROTECT_EX + SIBLING_DESCENDANT_EXCLUDE : sfx;
      var mkSel = function (attr, fsTarget) {
        var rPfx = GW + '[' + attr + '="1"] ' + sp.scope;
        var innerSet = fsTarget
          ? ':where(p, span, div, li, button, a, label, textarea, input, [contenteditable="true"])'
          : ':where(*)';
        return rPfx + rootSfx + ',\n' + rPfx + ' ' + innerSet + sfx;
      };
      out.push(
        mkSel('data-prism-fg-' + sp.id, false) + ' {\n' +
        '  color: var(--prism-region-' + sp.id + '-fg) !important;\n' +
        '}\n' +
        mkSel('data-prism-ff-' + sp.id, false) + ' {\n' +
        '  font-family: var(--prism-region-' + sp.id + '-ff) !important;\n' +
        '}' +
        (sp.hasFs
          ? '\n' +
            mkSel('data-prism-fs-' + sp.id, true) + ' {\n' +
            '  font-size: var(--prism-region-' + sp.id + '-fs) !important;\n' +
            '}'
          : '')
      );
    }

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
    state.holeObservedNodes = [];
    if (holeMutRaf) {
      W.cancelAnimationFrame(holeMutRaf);
      holeMutRaf = 0;
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
        var hasSplitTransition = false;
        for (var i = 0; i < muts.length; i += 1) {
          if (muts[i].attributeName === 'data-split-transition') {
            hasSplitTransition = true;
            break;
          }
        }
        if (hasSplitTransition) {
          if (holeMutRaf && typeof W.cancelAnimationFrame === 'function') {
            W.cancelAnimationFrame(holeMutRaf);
            holeMutRaf = 0;
          }
          syncBrowserHoleCutout();
          armHoleTransitionRaf(560);
        } else if (!holeMutRaf) {
          if (typeof W.requestAnimationFrame === 'function') {
            holeMutRaf = W.requestAnimationFrame(function () {
              holeMutRaf = 0;
              if (destroyed || !state.skinEnabled) return;
              syncBrowserHoleCutout();
            });
          } else {
            syncBrowserHoleCutout();
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
      var nextTargets = [];
      var pushTarget = function (el) {
        if (el && nextTargets.indexOf(el) < 0) nextTargets.push(el);
      };
      if (doc.body) pushTarget(doc.body);
      for (var i = 0; i < holeNodes.length; i += 1) {
        var hEl = holeNodes[i];
        pushTarget(hEl);
        var sheet = hEl.closest && hEl.closest('.agy-sheet, .aux-drawer-popup');
        if (sheet) pushTarget(sheet);
        var pane = hEl.closest && hEl.closest('[data-pane-id], [data-split-sized], [data-testid="aux-pane-split"]');
        if (pane) pushTarget(pane);
      }
      var prevTargets = state.holeObservedNodes || [];
      var targetsChanged = !holeResizeObs || prevTargets.length !== nextTargets.length;
      if (!targetsChanged) {
        for (var j = 0; j < nextTargets.length; j += 1) {
          if (prevTargets[j] !== nextTargets[j]) {
            targetsChanged = true;
            break;
          }
        }
      }
      if (targetsChanged) {
        if (!holeResizeObs) {
          holeResizeObs = new ResizeObserver(function () {
            if (destroyed || !state.skinEnabled) return;
            syncBrowserHoleCutout();
          });
        } else {
          try { holeResizeObs.disconnect(); } catch (_) {}
        }
        try {
          for (var t = 0; t < nextTargets.length; t += 1) {
            holeResizeObs.observe(nextTargets[t]);
          }
        } catch (_) {}
        state.holeObservedNodes = nextTargets;
      }
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
      if (state.lastHoleClip !== '' || state.lastAppliedStageClip !== '' || state.lastAppliedFxClip !== '') {
        state.lastHoleClip = '';
        state.lastAppliedStageClip = '';
        state.lastAppliedFxClip = '';
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
    if (stageEl && (state.lastAppliedStageClip !== nextClip || state.lastAppliedStageEl !== stageEl)) {
      stageEl.style.clipPath = nextClip;
      state.lastAppliedStageClip = nextClip;
      state.lastAppliedStageEl = stageEl;
    }
    var fxEl = doc.getElementById(FX_CANVAS_ID);
    if (fxEl && (state.lastAppliedFxClip !== nextClip || state.lastAppliedFxEl !== fxEl)) {
      fxEl.style.clipPath = nextClip;
      state.lastAppliedFxClip = nextClip;
      state.lastAppliedFxEl = fxEl;
    }
    return nextClip;
  }

  function setWallpaperReady(ready) {
    var next = Boolean(ready && state.skinEnabled && !destroyed);
    var prevReady = state.wallpaperReady;
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
      if (!prevReady) {
        scheduleWcoConfirmTimers();
      }
      syncTopbarGlassPills();
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
      stage.className = 'agy-prism-stage';
      stage.setAttribute('data-agy-prism-layer', '1');
      stage.setAttribute('translate', 'no');
      stage.setAttribute('data-no-translate', 'true');
      stage.setAttribute('data-ag-no-i18n', '1');
      doc.body.insertBefore(stage, doc.body.firstChild);
    } else if (!stage.className || stage.className.indexOf('agy-prism-stage') < 0) {
      stage.className = 'agy-prism-stage';
      stage.setAttribute('translate', 'no');
      stage.setAttribute('data-no-translate', 'true');
      stage.setAttribute('data-ag-no-i18n', '1');
    }
    stage.inert = true;
    stage.setAttribute('inert', '');
    stage.setAttribute('aria-hidden', 'true');
    stage.setAttribute('tabindex', '-1');
    if (state.lastHoleClip && (state.lastAppliedStageClip !== state.lastHoleClip || state.lastAppliedStageEl !== stage)) {
      stage.style.clipPath = state.lastHoleClip;
      state.lastAppliedStageClip = state.lastHoleClip;
      state.lastAppliedStageEl = stage;
    }
    var scrimNode = stage.querySelector('.agy-prism-scrim');
    if (!stage.querySelector('.agy-prism-blur-veil')) {
      var blurVeil = doc.createElement('div');
      blurVeil.className = 'agy-prism-blur-veil';
      if (scrimNode) stage.insertBefore(blurVeil, scrimNode);
      else stage.appendChild(blurVeil);
    }
    if (!scrimNode) {
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

  var MAX_BLOB_MEDIA_BYTES = Infinity;
  var BLOB_FETCH_TIMEOUT_MS = 60000;

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
  // `readyState === 0`. Zero-delay `fetch()` -> `blob:` bypasses the Media loader hang with a 60s timeout
  // and uncapped in-memory Blob playback (falling back to MSE/poster only on non-404 errors or timeouts).
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
          if (!res || !res.ok) {
            var httpErr = new Error('HTTP ' + (res ? res.status : 0));
            httpErr.status = res ? Number(res.status || 0) : 0;
            throw httpErr;
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
          if (err && err.name === 'AbortError' && !el.__prismTimedOut && ac && ac.signal && ac.signal.aborted) return;
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
          if (!res || !res.ok) {
            var httpErr = new Error('HTTP ' + (res ? res.status : 0));
            httpErr.status = res ? Number(res.status || 0) : 0;
            throw httpErr;
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
          if (!blob || blob.size <= 0) {
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
          if (err && err.name === 'AbortError' && !img.__prismTimedOut && ac && ac.signal && ac.signal.aborted) return;
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

  // Streaming MediaSource (MSE) fMP4 fallback player under `https:` hosts when loopback Blob fetch fails or times out.
  // Pumps chunks from `/mse-fmp4/<token>` into SourceBuffer with rolling frame eviction so RAM stays <32 MiB.
  function mountMseStreamVideo(video, mseUrl, wrap, isStaleFn, onVideoDecoded, fallbackToPoster) {
    var isStale = typeof isStaleFn === 'function' ? isStaleFn : function () { return destroyed; };
    var failedOnce = false;
    var mseDone = false;
    var activeReader = null;
    var ac = typeof W.AbortController === 'function' ? new W.AbortController() : null;

    var failMse = function (reason) {
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
        fallbackToPoster(reason || 'mse-stream-error');
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
      failMse('mse-unsupported');
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
      failMse('mse-ctor-error');
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
          failMse(err && err.message ? 'mse:' + String(err.message) : 'mse-stream-error');
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
        var targetFps = cfg.fpsCap > 0 ? cfg.fpsCap : (cfg.sceneLiveFps || 30);
        var effVol = cfg.muted ? 0 : cfg.volume;
        state.activeIframe.contentWindow.postMessage(
          { source: 'agy-prism-stage', type: 'pause', paused: shouldPause },
          '*'
        );
        state.activeIframe.contentWindow.postMessage(
          { source: 'agy-prism-stage', type: 'fps', fps: targetFps },
          '*'
        );
        state.activeIframe.contentWindow.postMessage(
          { source: 'agy-prism-stage', type: 'audioConfig', muted: Boolean(cfg.muted), volume: effVol },
          '*'
        );
        state.activeIframe.contentWindow.postMessage(
          {
            source: 'agy-prism-stage',
            type: 'we-lifecycle',
            paused: shouldPause,
            muted: Boolean(cfg.muted),
            volume: effVol,
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
    state.degradedToPoster = false;
    state.degradeReason = '';
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
    var stageAnchor = stage.querySelector('.agy-prism-blur-veil') || stage.querySelector('.agy-prism-scrim');

    var commitMount = function () {
      if (destroyed || !state.skinEnabled || mountSeq !== state.mediaMountSeq) {
        disposeWrap(nextWrap);
        return;
      }
      if (nextWrap.parentNode !== stage) {
        stage.insertBefore(nextWrap, stageAnchor || null);
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
      syncLifecycleTimers();
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
      syncLifecycleTimers();
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
      imgA.className = 'agy-prism-media-el agy-prism-slide-el';
      imgB.className = 'agy-prism-media-el agy-prism-slide-el';
      imgA.crossOrigin = 'anonymous';
      imgB.crossOrigin = 'anonymous';
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
        if (destroyed || !state.skinEnabled || mountSeq !== state.mediaMountSeq) {
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
          stage.insertBefore(nextWrap, stageAnchor || null);
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
          state.degradedToPoster = false;
          state.degradeReason = '';
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

        var fallbackToPoster = function (reason) {
          if (posterFallbackStarted || settledVid || destroyed || mountSeq !== state.mediaMountSeq) return;
          state.degradeReason = String(reason || 'video-degraded');
          if (!(item && item.thumbUrl)) {
            onVideoFailed();
            return;
          }
          posterFallbackStarted = true;
          settledVid = true;
          state.degradedToPoster = true;
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
              if (posterImg.__prismFetchingBlob && posterWaitTicks < 20) {
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
            fallbackToPoster('mse-video-error');
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
              if (blobWaitTicks < 40) {
                blobWaitTicks += 1;
                armPendingVideoGuard(1500);
                return;
              }
              if (video.__prismMseActive) {
                fallbackToPoster('mse-load-timeout');
              } else if (mseFmp4Url && typeof W.MediaSource === 'function') {
                mountMseStreamVideo(video, mseFmp4Url, nextWrap, isStaleVid, onVideoDecoded, fallbackToPoster);
              } else if (item && item.thumbUrl) {
                fallbackToPoster('blob-fetch-timeout');
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
            var httpStatus = err && Number(err.status);
            var isMissingAsset = httpStatus === 404 || httpStatus === 403 || httpStatus === 410;
            if (!isMissingAsset) {
              if (mseFmp4Url && typeof W.MediaSource === 'function') {
                mountMseStreamVideo(video, mseFmp4Url, nextWrap, isStaleVid, onVideoDecoded, fallbackToPoster);
                return;
              }
              if (item && item.thumbUrl) {
                var isTimeout = Boolean(video.__prismTimedOut || (err && err.name === 'AbortError'));
                fallbackToPoster(isTimeout ? 'blob-fetch-timeout' : 'blob-fetch-fallback');
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
        if (destroyed || !state.skinEnabled || mountSeq !== state.mediaMountSeq) {
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
            state.degradedToPoster = false;
            state.degradeReason = '';
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
            stage.insertBefore(nextWrap, stageAnchor || null);
          }
          vframe.src = stageUrl;
          return;
        }

        mountDirectVideo();
      };

      var isPluginOriginDead = function (originKey) {
        if (!originKey) return false;
        var entry = state.deadPluginOrigins[originKey];
        if (!entry) return false;
        if (typeof entry === 'object' && Number.isFinite(entry.until)) {
          if (Date.now() < entry.until) return true;
          delete state.deadPluginOrigins[originKey];
          return false;
        }
        return Boolean(entry);
      };
      var markPluginOriginDead = function (originKey, isTimeout) {
        if (!originKey) return;
        var isAlive = Boolean(state.alivePluginOrigins[originKey]);
        if (isTimeout) {
          // Never blacklist an already-proven-alive plugin:// origin on a single transient >350ms HEAD timeout.
          if (isAlive) return;
          state.deadPluginOrigins[originKey] = {
            until: Date.now() + PLUGIN_DEAD_TIMEOUT_TTL_MS,
            reason: 'timeout',
          };
          return;
        }
        state.deadPluginOrigins[originKey] = {
          until: Date.now() + (isAlive ? PLUGIN_ALIVE_RETRY_TTL_MS : PLUGIN_DEAD_HARD_TTL_MS),
          reason: 'error',
        };
      };

      // Priority 1: Electron `plugin://` secure 206 streaming proxy (zero-copy for 971 MB / 4 GB videos!)
      var pluginOriginMatch = /^plugin:\/\/[^/?#]+/i.exec(pluginMediaUrl);
      var pluginOriginKey = pluginOriginMatch ? pluginOriginMatch[0].toLowerCase() : '';
      if (pluginOriginKey && isPluginOriginDead(pluginOriginKey)) {
        continueAfterPluginProbe(true);
        return;
      }
      if (pluginMediaUrl && /^plugin:\/\//i.test(pluginMediaUrl) && typeof W.fetch === 'function') {
        var headAc = typeof W.AbortController === 'function' ? new W.AbortController() : null;
        if (headAc) {
          if (!nextWrap.__prismAbortControllers) nextWrap.__prismAbortControllers = [];
          nextWrap.__prismAbortControllers.push(headAc);
        }
        var probeSettled = false;
        var headTimedOut = false;
        state.pendingWrap = nextWrap;
        var headTimer = setTimeout(function () {
          headTimedOut = true;
          try {
            if (headAc) headAc.abort();
          } catch (_) {}
          if (!probeSettled) {
            probeSettled = true;
            if (state.pendingMediaTimer === headTimer) state.pendingMediaTimer = 0;
            if (destroyed || !state.skinEnabled || mountSeq !== state.mediaMountSeq) {
              disposeWrap(nextWrap);
              return;
            }
            markPluginOriginDead(pluginOriginKey, true);
            continueAfterPluginProbe(true);
          }
        }, 350);
        state.pendingMediaTimer = headTimer;

        W.fetch(pluginMediaUrl, headAc ? { method: 'HEAD', signal: headAc.signal } : { method: 'HEAD' })
          .then(function (res) {
            if (probeSettled) return;
            probeSettled = true;
            clearTimeout(headTimer);
            if (state.pendingMediaTimer === headTimer) state.pendingMediaTimer = 0;
            if (destroyed || !state.skinEnabled || mountSeq !== state.mediaMountSeq) {
              disposeWrap(nextWrap);
              return;
            }
            if (res && (res.ok || typeof res.status === 'number') && pluginOriginKey) {
              state.alivePluginOrigins[pluginOriginKey] = true;
              delete state.deadPluginOrigins[pluginOriginKey];
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
            if (destroyed || !state.skinEnabled || mountSeq !== state.mediaMountSeq || (!headTimedOut && headAc && headAc.signal && headAc.signal.aborted)) {
              disposeWrap(nextWrap);
              return;
            }
            markPluginOriginDead(pluginOriginKey, headTimedOut);
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
      stage.insertBefore(nextWrap, stageAnchor || null);
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
        } else if (state.activeIframe && state.activeIframe.isConnected) {
          syncMediaPlaybackState();
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
        } else if (vid.__prismMseActive && vid.__prismMseEvicted) {
          // Evicted MSE SourceBuffer has time 0 purged; remount fresh MediaSource stream instead of seeking 0!
          state.vidStallCount = 0;
          mountStageMedia(true);
          return;
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
        if (vid.__prismMseActive) {
          // MSE blob URLs are single-use per MediaSource instance; rebuild stream cleanly.
          state.vidStallCount = 0;
          mountStageMedia(true);
          return;
        }
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
        if (vid.__prismMseActive) {
          var hasBuf = vid.buffered && vid.buffered.length > 0;
          if (!hasBuf) {
            state.vidStallCount = 0;
            mountStageMedia(true);
            return;
          }
          try {
            var bufStart = Number(vid.buffered.start(0));
            var bufEnd = Number(vid.buffered.end(vid.buffered.length - 1));
            var rawKick = Number.isFinite(dur) && dur > 1.5 && curT < dur - 0.75 ? Math.max(0, curT - 0.035) : bufStart;
            vid.currentTime = Math.max(bufStart, Math.min(bufEnd, rawKick));
            vid.play().catch(function () {});
          } catch (_) {}
        } else {
          try {
            var kickT = Number.isFinite(dur) && dur > 1.5 && curT < dur - 0.75 ? Math.max(0, curT - 0.035) : 0;
            vid.currentTime = kickT;
            vid.play().catch(function () {});
          } catch (_) {}
        }
      }
    }

    state.lastVidCheckTime = curT;
    state.lastVidCheckFrames = curF;
  }

  function clearLifecycleTimers() {
    if (state.blurPollTimer) {
      clearInterval(state.blurPollTimer);
      state.blurPollTimer = 0;
    }
    if (state.videoWatchTimer) {
      clearInterval(state.videoWatchTimer);
      state.videoWatchTimer = 0;
    }
  }

  function syncLifecycleTimers() {
    if (destroyed || !state.skinEnabled) {
      clearLifecycleTimers();
      return;
    }
    var needBlurPoll = Boolean((state.cfg && state.cfg.pauseOnBlur) || state.autoPaused);
    if (needBlurPoll) {
      if (!state.blurPollTimer) {
        state.blurPollTimer = setInterval(function () {
          if (destroyed || !state.skinEnabled) {
            clearLifecycleTimers();
            return;
          }
          if (state.cfg.pauseOnBlur || state.autoPaused) evaluateAutoPause();
        }, 3000);
      }
    } else if (state.blurPollTimer) {
      clearInterval(state.blurPollTimer);
      state.blurPollTimer = 0;
    }

    var hasVidWatchTarget = Boolean(
      (state.activeVideo && state.activeVideo.isConnected) ||
      (state.activeVideoStageFrame && state.activeVideoStageFrame.isConnected)
    );
    var shouldPauseWatch = Boolean(state.cfg && (state.cfg.paused || state.autoPaused || state.cfg.agentBusyPaused));
    if (hasVidWatchTarget && !shouldPauseWatch && !doc.hidden) {
      if (!state.videoWatchTimer) {
        state.videoWatchTimer = setInterval(function () {
          if (destroyed || !state.skinEnabled) {
            clearLifecycleTimers();
            return;
          }
          checkVideoLiveness(false);
        }, 1100);
      }
    } else if (state.videoWatchTimer) {
      clearInterval(state.videoWatchTimer);
      state.videoWatchTimer = 0;
    }
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
      syncLifecycleTimers();
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
      if (
        !state.cfg.paused &&
        !state.cfg.agentBusyPaused &&
        ((state.activeVideo && state.activeVideo.paused) ||
          (state.activeIframe && state.activeIframe.isConnected) ||
          (state.activeVideoStageFrame && state.activeVideoStageFrame.isConnected))
      ) {
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
        syncLifecycleTimers();
      } else {
        state.hiddenDebounced = false;
        evaluateAutoPause();
        syncLifecycleTimers();
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

    syncLifecycleTimers();

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
      state.lastAppliedFxClip = '';
      state.lastAppliedFxEl = null;
      return null;
    }
    if (!c && doc.body) {
      c = doc.createElement('canvas');
      c.id = FX_CANVAS_ID;
      c.className = 'agy-prism-fx-canvas';
      c.setAttribute('aria-hidden', 'true');
      c.setAttribute('translate', 'no');
      c.setAttribute('data-no-translate', 'true');
      c.setAttribute('data-ag-no-i18n', '1');
      c.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:43;';
      doc.body.appendChild(c);
    }
    if (c) {
      if (c.style) c.style.display = state.wallpaperReady ? '' : 'none';
      if (state.lastHoleClip && (state.lastAppliedFxClip !== state.lastHoleClip || state.lastAppliedFxEl !== c)) {
        c.style.clipPath = state.lastHoleClip;
        state.lastAppliedFxClip = state.lastHoleClip;
        state.lastAppliedFxEl = c;
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

  function onPointerMove(e) {
    if (destroyed || !state.skinEnabled || state.autoPaused) return;
    var vw = Math.max(1, W.innerWidth);
    var vh = Math.max(1, W.innerHeight);

    if (state.cfg.interactiveWeb && state.activeIframe && state.activeIframe.contentWindow) {
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
  }

  function syncPointerHooks() {
    var needMove = Boolean(
      !destroyed &&
      state.skinEnabled &&
      ((state.cfg && state.cfg.parallaxEnabled) ||
        (state.cfg && state.cfg.fxEnabled) ||
        (state.cfg && state.cfg.interactiveWeb && resolveEffectiveKind(state.item, state.cfg) === 'web'))
    );
    if (needMove && !pointerMoveBound) {
      W.addEventListener('pointermove', onPointerMove, { passive: true });
      pointerMoveBound = true;
    } else if (!needMove && pointerMoveBound) {
      W.removeEventListener('pointermove', onPointerMove, { passive: true });
      pointerMoveBound = false;
    }
  }

  function setupPointerHooks() {
    syncPointerHooks();

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
        scheduleTopbarPillSync();
      },
      { passive: true }
    );

    listen(
      doc,
      'transitionrun',
      function (e) {
        if (destroyed || !state.skinEnabled || !state.lastHoleClip) return;
        var tgt = e && e.target;
        if (
          tgt &&
          tgt.closest &&
          (tgt.closest('#' + STAGE_ID) ||
            tgt.closest('#agy-prism-popover') ||
            tgt.closest('#' + TOPBAR_PILLS_ID) ||
            tgt.closest('#' + WCO_PILL_ID))
        ) {
          return;
        }
        var now = Date.now();
        if (now - state.lastHoleTransitionRafAt < 120) return;
        state.lastHoleTransitionRafAt = now;
        armHoleTransitionRaf(560);
      },
      true
    );
  }

  // ---------------------------------------------------------------------------
  // Req #1: 3-Layer Zero-English Empty-Conversation Watermark Logo Controller
  // ---------------------------------------------------------------------------
  function resolveWelcomeLogoScopes() {
    if (!doc.querySelectorAll) return [];
    var vw = Math.max(1, W.innerWidth || (doc.documentElement && doc.documentElement.clientWidth) || 0);
    var vh = Math.max(1, W.innerHeight || (doc.documentElement && doc.documentElement.clientHeight) || 0);
    var raw = doc.querySelectorAll('[data-testid="conversation-view"], [data-main-content-body]');
    var visible = [];
    for (var i = 0; i < raw.length; i += 1) {
      var el = raw[i];
      if (!el || !el.isConnected) continue;
      if (el.closest && el.closest(WELCOME_LOGO_SCOPE_EXCLUDE_ANCESTOR)) continue;
      if (el.querySelector && el.querySelector(WELCOME_LOGO_NON_CHAT_PAGE_SEL)) continue;
      try {
        var cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        var r = el.getBoundingClientRect();
        if (r.width < 240 || r.height < 200) continue;
        if (r.right <= 0 || r.left >= vw || r.bottom <= 0 || r.top >= vh) continue;
        visible.push(el);
      } catch (_) {}
    }
    return visible.filter(function (a) {
      for (var j = 0; j < visible.length; j += 1) {
        if (visible[j] !== a && a.contains(visible[j])) return false;
      }
      return true;
    });
  }

  function resolvePaneComposer(scope, scopeRect) {
    var paneHost =
      (scope.closest && scope.closest('[data-main-content-body], [data-tiling-pane], #hub-main-pane, [data-testid="aux-pane-split"] > :first-child')) ||
      scope.parentElement ||
      scope;
    var comp = paneHost && paneHost.querySelector ? paneHost.querySelector('[data-testid="agent-input-box"], .surface-composer-card, .agy-composer') : null;
    if (!comp || !comp.getBoundingClientRect) return null;
    var r = comp.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return null;
    if (r.right <= scopeRect.left || r.left >= scopeRect.right) return null;
    return { el: comp, rect: r };
  }

  function evaluateEmptyConversationScope(scope) {
    if (!scope || !scope.querySelectorAll) return { empty: false, textLen: 9999 };
    var hits = scope.querySelectorAll(NON_EMPTY_CHAT_SEL);
    for (var i = 0; i < hits.length; i += 1) {
      var h = hits[i];
      if (!h.closest || !h.closest(COMPOSER_SUBTREE_SEL)) {
        return { empty: false, textLen: 9999 };
      }
    }
    if (scope.scrollHeight > scope.clientHeight + 80) {
      return { empty: false, textLen: 9999 };
    }
    var textLen = 0;
    var pCount = 0;
    var walk = function (node) {
      if (!node || textLen > 500 || pCount > 2) return;
      var nt = node.nodeType;
      if (nt === 3) {
        var t = (node.nodeValue || '').trim();
        if (t) textLen += t.length;
        return;
      }
      if (nt !== 1) return;
      var tag = node.tagName ? node.tagName.toUpperCase() : '';
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'SVG' || tag === 'NOSCRIPT') return;
      if (node !== scope && node.matches && node.matches(NON_NARRATIVE_SUBTREE)) return;
      if (tag === 'P' && (node.textContent || '').trim().length > 0) {
        pCount += 1;
        if (pCount > 2) return;
      }
      var ch = node.childNodes;
      for (var c = 0; c < ch.length; c += 1) {
        walk(ch[c]);
        if (textLen > 500 || pCount > 2) return;
      }
    };
    walk(scope);
    return { empty: textLen <= 500 && pCount <= 2, textLen: textLen };
  }

  function findGreetingHeading(scope, scopeRect, comp) {
    if (!scope || !scope.querySelectorAll) return null;
    var scopeCenterX = scopeRect.left + scopeRect.width / 2;
    var idealY = scopeRect.top + scopeRect.height * 0.42;
    var nodes = scope.querySelectorAll('h1, h2, h3, [role="heading"], p, div, span');
    var best = null;
    for (var i = 0; i < nodes.length; i += 1) {
      var el = nodes[i];
      if (!el || (el.closest && el.closest(WELCOME_LOGO_EXCLUDE_ANCESTOR))) continue;
      var hasDirectText = false;
      for (var c = 0; c < el.childNodes.length; c += 1) {
        if (el.childNodes[c].nodeType === 3 && (el.childNodes[c].nodeValue || '').trim().length > 0) {
          hasDirectText = true;
          break;
        }
      }
      if (!hasDirectText) continue;
      var txt = (el.textContent || '').trim();
      if (txt.length < 3 || txt.length > 140) continue;
      if (el.querySelector && el.querySelector('h1, h2, h3, [role="heading"], [data-testid="agent-input-box"], .surface-composer-card, .agy-composer')) {
        continue;
      }
      try {
        var cs = getComputedStyle(el);
        var fs = parseFloat(cs.fontSize) || 0;
        if (fs < 17) continue;
        if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) <= 0.1) continue;
        var r = el.getBoundingClientRect();
        if (r.width < 24 || r.height < 16) continue;
        var cx = r.left + r.width / 2;
        if (Math.abs(cx - scopeCenterX) > Math.max(80, scopeRect.width * 0.18)) continue;
        if (comp && r.bottom > comp.rect.top + 8) continue;
        var yDist = Math.abs((r.top + r.bottom) / 2 - idealY);
        var score = fs * 10 - yDist * 0.12 - Math.abs(cx - scopeCenterX) * 0.08;
        if (!best || score > best.score) {
          best = { el: el, rect: r, score: score };
        }
      } catch (_) {}
    }
    return best;
  }

  function parseCssSizePairPx(raw) {
    var s = String(raw || '').trim();
    if (!s || s === 'auto' || s === 'cover' || s === 'contain' || s === 'none') return null;
    var firstLayer = s.split(',')[0].trim();
    var parts = firstLayer.split(/\s+/);
    var p0 = /^([\d.]+)px$/i.exec(parts[0] || '');
    if (!p0) return null;
    var w = parseFloat(p0[1]);
    var h = w;
    if (parts[1]) {
      var p1 = /^([\d.]+)px$/i.exec(parts[1]);
      if (!p1) return null;
      h = parseFloat(p1[1]);
    }
    if (!Number.isFinite(w) || !Number.isFinite(h)) return null;
    return [w, h];
  }

  function detectWelcomeLogoInScope(scope) {
    var result = { elMarks: [], pseudoMarks: [] };
    if (!scope || !scope.getBoundingClientRect) return result;
    var scopeRect = scope.getBoundingClientRect();
    if (scopeRect.width < 240 || scopeRect.height < 200) return result;

    // Layer 1: Explicit allowlist fast-path
    var explicitSel = WELCOME_LOGO_EXPLICIT_SELECTORS.join(', ');
    var explicitHits = scope.querySelectorAll ? scope.querySelectorAll(explicitSel) : [];
    for (var ei = 0; ei < explicitHits.length; ei += 1) {
      var eh = explicitHits[ei];
      if (!eh || (eh.closest && eh.closest(WELCOME_LOGO_EXCLUDE_ANCESTOR))) continue;
      result.elMarks.push(eh);
    }
    if (result.elMarks.length > 0) return result;

    // Empty-Conversation Structural Gate (100% Language-Agnostic)
    var gate = evaluateEmptyConversationScope(scope);
    if (!gate.empty) return result;

    var comp = resolvePaneComposer(scope, scopeRect);
    var heading = findGreetingHeading(scope, scopeRect, comp);
    var scopeCenterX = scopeRect.left + scopeRect.width / 2;
    var maxW = Math.min(360, scopeRect.width * 0.55);
    var maxH = Math.min(360, scopeRect.height * 0.55);

    // Layer 2: Structural + Geometric Watermark Classifier
    var rawNodes = scope.querySelectorAll ? scope.querySelectorAll('svg, img, canvas, div, span') : [];
    var candidates = [];
    for (var i = 0; i < rawNodes.length; i += 1) {
      var el = rawNodes[i];
      if (!el || (el.closest && el.closest(WELCOME_LOGO_EXCLUDE_ANCESTOR))) continue;
      var tag = el.tagName ? el.tagName.toUpperCase() : '';
      if (tag === 'SVG') {
        if (el.parentElement && el.parentElement.closest && el.parentElement.closest('svg')) continue;
        var svgTexts = el.querySelectorAll ? el.querySelectorAll('text, tspan') : [];
        var hasSvgText = false;
        for (var st = 0; st < svgTexts.length; st += 1) {
          if ((svgTexts[st].textContent || '').trim().length > 0) {
            hasSvgText = true;
            break;
          }
        }
        if (hasSvgText) continue;
      }
      try {
        var cs = getComputedStyle(el);
        var alreadyMarked = el.getAttribute(WELCOME_LOGO_MARK) === '1';
        if (cs.display === 'none') continue;
        if (!alreadyMarked && cs.visibility === 'hidden') continue;
        var isMaskedOrBgLeaf = false;
        if (tag === 'DIV' || tag === 'SPAN') {
          if (el.childElementCount !== 0 || (el.textContent || '').trim() !== '') continue;
          var hasMaskImg = Boolean((cs.maskImage && cs.maskImage !== 'none') || (cs.webkitMaskImage && cs.webkitMaskImage !== 'none'));
          var hasBgUrl = Boolean(cs.backgroundImage && /url\(/i.test(cs.backgroundImage));
          if (!hasMaskImg && !hasBgUrl) continue;
          isMaskedOrBgLeaf = true;
        }
        var r = el.getBoundingClientRect();
        if (r.width < 40 || r.height < 40) continue;
        if (r.width > maxW || r.height > maxH) continue;
        var aspect = r.width / r.height;
        if (aspect < 0.55 || aspect > 1.85) continue;
        var cx = r.left + r.width / 2;
        var centerOffset = Math.abs(cx - scopeCenterX);
        if (centerOffset > Math.max(48, scopeRect.width * 0.10)) continue;
        if (r.bottom <= scopeRect.top || r.top >= scopeRect.bottom) continue;
        if (comp && r.top >= comp.rect.top) continue;
        var opacityNum = parseFloat(cs.opacity);
        var isDecorative =
          cs.pointerEvents === 'none' ||
          el.getAttribute('aria-hidden') === 'true' ||
          (!alreadyMarked && Number.isFinite(opacityNum) && opacityNum <= 0.65) ||
          alreadyMarked;
        candidates.push({
          el: el,
          tag: tag,
          rect: r,
          centerOffset: centerOffset,
          isDecorative: isDecorative,
          isSoftOpacity: !alreadyMarked && Number.isFinite(opacityNum) && opacityNum < 0.75,
          isSvgOrMask: tag === 'SVG' || isMaskedOrBgLeaf,
        });
      } catch (_) {}
    }

    var filtered = [];
    if (heading) {
      var hr = heading.rect;
      for (var ci = 0; ci < candidates.length; ci += 1) {
        var cr = candidates[ci].rect;
        if (cr.top < hr.top + hr.height * 0.6 && cr.bottom >= hr.top - 160 && (cr.top + cr.bottom) / 2 <= hr.bottom + 12) {
          filtered.push(candidates[ci]);
        }
      }
    } else if (gate.textLen < 120 && candidates.length === 1 && candidates[0].isDecorative) {
      filtered.push(candidates[0]);
    }

    // Grid/multi-card false-positive guard: >2 graphics aligned at roughly the same Y -> reject ALL
    if (filtered.length > 2) {
      var sameRowCount = 0;
      var refMidY = (filtered[0].rect.top + filtered[0].rect.bottom) / 2;
      for (var fi = 0; fi < filtered.length; fi += 1) {
        var midY = (filtered[fi].rect.top + filtered[fi].rect.bottom) / 2;
        if (Math.abs(midY - refMidY) <= 48) sameRowCount += 1;
      }
      if (sameRowCount > 2) filtered = [];
    }

    if (filtered.length > 0) {
      var winner = null;
      for (var wi = 0; wi < filtered.length; wi += 1) {
        var cand = filtered[wi];
        var vDist = heading ? Math.abs(heading.rect.top - cand.rect.bottom) : 0;
        var bonus = (cand.isSvgOrMask ? 25 : 0) + (cand.isDecorative || cand.isSoftOpacity ? 30 : 0);
        var candScore = bonus - cand.centerOffset * 0.8 - vDist * 0.3;
        if (!winner || candScore > winner.score) {
          winner = { el: cand.el, score: candScore };
        }
      }
      if (winner) {
        result.elMarks.push(winner.el);
        return result;
      }
    }

    // Layer 3: Pseudo-Element Watermark Guard (::before / ::after)
    if (heading && heading.el) {
      var cur = heading.el;
      var depth = 0;
      while (cur && depth <= 3 && scope.contains(cur)) {
        if (!(cur === scope && scope.getAttribute && scope.getAttribute('data-testid') === 'conversation-view')) {
          var pseudos = ['before', 'after'];
          for (var pi = 0; pi < pseudos.length; pi += 1) {
            var ps = pseudos[pi];
            try {
              var pcs = getComputedStyle(cur, '::' + ps);
              if (!pcs || pcs.content === 'none' || pcs.content === 'normal') continue;
              var pBgUrl = Boolean(pcs.backgroundImage && /url\(/i.test(pcs.backgroundImage));
              var pMask = Boolean((pcs.maskImage && pcs.maskImage !== 'none') || (pcs.webkitMaskImage && pcs.webkitMaskImage !== 'none'));
              var pContentUrl = /url\(/i.test(pcs.content);
              if (!pBgUrl && !pMask && !pContentUrl) continue;
              var pw = parseFloat(pcs.width);
              var ph = parseFloat(pcs.height);
              var boxSized = Number.isFinite(pw) && Number.isFinite(ph) && pw >= 40 && pw <= 360 && ph >= 40 && ph <= 360;
              var bgPair = pBgUrl && pcs.backgroundRepeat === 'no-repeat' ? parseCssSizePairPx(pcs.backgroundSize) : null;
              var bgSized = Boolean(bgPair && bgPair[0] >= 40 && bgPair[0] <= 360 && bgPair[1] >= 40 && bgPair[1] <= 360);
              var maskRep = pcs.maskRepeat || pcs.webkitMaskRepeat || '';
              var maskPair = pMask && maskRep === 'no-repeat' ? parseCssSizePairPx(pcs.maskSize || pcs.webkitMaskSize) : null;
              var maskSized = Boolean(maskPair && maskPair[0] >= 40 && maskPair[0] <= 360 && maskPair[1] >= 40 && maskPair[1] <= 360);
              var contentUrlSized =
                pContentUrl &&
                ((!Number.isFinite(pw) && !Number.isFinite(ph)) ||
                  (Number.isFinite(pw) && Number.isFinite(ph) && pw >= 40 && pw <= 360 && ph >= 40 && ph <= 360));
              if (boxSized || bgSized || maskSized || contentUrlSized) {
                result.pseudoMarks.push({ el: cur, pseudo: ps });
                return result;
              }
            } catch (_) {}
          }
        }
        if (cur === scope) break;
        cur = cur.parentElement;
        depth += 1;
      }
    }

    return result;
  }

  function clearWelcomeLogoMarks() {
    if (doc.querySelectorAll) {
      var prev = doc.querySelectorAll('[' + WELCOME_LOGO_MARK + '], [' + WELCOME_LOGO_PSEUDO_MARK + ']');
      for (var i = 0; i < prev.length; i += 1) {
        prev[i].removeAttribute(WELCOME_LOGO_MARK);
        prev[i].removeAttribute(WELCOME_LOGO_PSEUDO_MARK);
      }
    }
    state.welcomeLogoHiddenCount = 0;
  }

  function disconnectWelcomeLogoObserver() {
    clearTimeout(state.welcomeLogoTimer);
    state.welcomeLogoTimer = 0;
    if (welcomeLogoObs) {
      try { welcomeLogoObs.disconnect(); } catch (_) {}
      welcomeLogoObs = null;
    }
    state.welcomeLogoObsTarget = null;
    state.welcomeLogoNonEmptyScopes = [];
  }

  function teardownWelcomeLogoGuard() {
    disconnectWelcomeLogoObserver();
    state.welcomeLogoNonEmptyScopes = [];
    clearWelcomeLogoMarks();
  }

  function scheduleWelcomeLogoSync() {
    if (destroyed || !state.skinEnabled || !state.cfg.hideWelcomeLogo) return;
    clearTimeout(state.welcomeLogoTimer);
    state.welcomeLogoTimer = setTimeout(function () {
      state.welcomeLogoTimer = 0;
      if (destroyed || !state.skinEnabled || !state.cfg.hideWelcomeLogo) return;
      if (typeof W.requestAnimationFrame === 'function') {
        W.requestAnimationFrame(function () {
          if (!destroyed && state.skinEnabled && state.cfg.hideWelcomeLogo) syncWelcomeLogo();
        });
      } else {
        syncWelcomeLogo();
      }
    }, 120);
  }

  function isInsideKnownNonEmptyWelcomeScope(el) {
    if (!el || !state.welcomeLogoNonEmptyScopes || !state.welcomeLogoNonEmptyScopes.length) return false;
    for (var i = 0; i < state.welcomeLogoNonEmptyScopes.length; i += 1) {
      var sc = state.welcomeLogoNonEmptyScopes[i];
      if (sc && sc.isConnected && typeof sc.contains === 'function' && sc.contains(el)) {
        return true;
      }
    }
    return false;
  }

  function invalidateNonEmptyWelcomeScopes(el) {
    if (!state.welcomeLogoNonEmptyScopes || !state.welcomeLogoNonEmptyScopes.length) return;
    var next = [];
    for (var i = 0; i < state.welcomeLogoNonEmptyScopes.length; i += 1) {
      var sc = state.welcomeLogoNonEmptyScopes[i];
      if (!sc || !sc.isConnected) continue;
      if (el && ((typeof sc.contains === 'function' && sc.contains(el)) || (typeof el.contains === 'function' && el.contains(sc)))) {
        continue;
      }
      if (sc.querySelector && !sc.querySelector(NON_EMPTY_CHAT_SEL)) continue;
      next.push(sc);
    }
    state.welcomeLogoNonEmptyScopes = next;
  }

  function syncWelcomeLogo() {
    if (destroyed || !state.skinEnabled || !state.cfg.hideWelcomeLogo || !doc.body) {
      teardownWelcomeLogoGuard();
      return 0;
    }
    var obsTarget = doc.getElementById('root') || doc.body;
    if (
      W.MutationObserver &&
      obsTarget &&
      (!welcomeLogoObs || state.welcomeLogoObsTarget !== obsTarget || !state.welcomeLogoObsTarget.isConnected)
    ) {
      disconnectWelcomeLogoObserver();
      welcomeLogoObs = new MutationObserver(function (muts) {
        if (destroyed || !state.skinEnabled || !state.cfg.hideWelcomeLogo) return;
        var relevant = false;
        for (var i = 0; i < muts.length; i += 1) {
          var m = muts[i];
          var mt = m && m.target;
          var mtEl = mt && mt.nodeType === 1 ? mt : mt && mt.parentElement;
          if (mtEl && mtEl.closest && mtEl.closest(WELCOME_LOGO_OBS_IGNORE_ANCESTOR)) continue;
          if (m && m.removedNodes && m.removedNodes.length > 0) {
            invalidateNonEmptyWelcomeScopes(mtEl);
            relevant = true;
            break;
          }
          if (mtEl && isInsideKnownNonEmptyWelcomeScope(mtEl)) continue;
          relevant = true;
          break;
        }
        if (relevant) scheduleWelcomeLogoSync();
      });
      try {
        welcomeLogoObs.observe(obsTarget, { childList: true, subtree: true });
        state.welcomeLogoObsTarget = obsTarget;
      } catch (_) {}
    }

    invalidateNonEmptyWelcomeScopes(null);
    var scopes = resolveWelcomeLogoScopes();
    var nextEls = [];
    var nextPseudos = [];
    for (var s = 0; s < scopes.length; s += 1) {
      var sc = scopes[s];
      if (state.welcomeLogoNonEmptyScopes.indexOf(sc) >= 0) continue;
      var res = detectWelcomeLogoInScope(sc);
      if (!res.elMarks.length && !res.pseudoMarks.length && sc && sc.querySelector && sc.querySelector(NON_EMPTY_CHAT_SEL)) {
        state.welcomeLogoNonEmptyScopes.push(sc);
      }
      for (var e = 0; e < res.elMarks.length; e += 1) {
        if (nextEls.indexOf(res.elMarks[e]) < 0) nextEls.push(res.elMarks[e]);
      }
      for (var p = 0; p < res.pseudoMarks.length; p += 1) {
        nextPseudos.push(res.pseudoMarks[p]);
      }
    }

    if (doc.querySelectorAll) {
      var oldEls = doc.querySelectorAll('[' + WELCOME_LOGO_MARK + ']');
      for (var oi = 0; oi < oldEls.length; oi += 1) {
        if (nextEls.indexOf(oldEls[oi]) < 0) oldEls[oi].removeAttribute(WELCOME_LOGO_MARK);
      }
      var oldPseudos = doc.querySelectorAll('[' + WELCOME_LOGO_PSEUDO_MARK + ']');
      for (var op = 0; op < oldPseudos.length; op += 1) {
        var keepP = false;
        for (var np = 0; np < nextPseudos.length; np += 1) {
          if (nextPseudos[np].el === oldPseudos[op] && nextPseudos[np].pseudo === oldPseudos[op].getAttribute(WELCOME_LOGO_PSEUDO_MARK)) {
            keepP = true;
            break;
          }
        }
        if (!keepP) oldPseudos[op].removeAttribute(WELCOME_LOGO_PSEUDO_MARK);
      }
    }
    for (var ni = 0; ni < nextEls.length; ni += 1) {
      if (nextEls[ni].getAttribute(WELCOME_LOGO_MARK) !== '1') {
        nextEls[ni].setAttribute(WELCOME_LOGO_MARK, '1');
      }
    }
    for (var nj = 0; nj < nextPseudos.length; nj += 1) {
      if (nextPseudos[nj].el.getAttribute(WELCOME_LOGO_PSEUDO_MARK) !== nextPseudos[nj].pseudo) {
        nextPseudos[nj].el.setAttribute(WELCOME_LOGO_PSEUDO_MARK, nextPseudos[nj].pseudo);
      }
    }
    state.welcomeLogoHiddenCount = nextEls.length + nextPseudos.length;
    return state.welcomeLogoHiddenCount;
  }

  // ---------------------------------------------------------------------------
  // Req #2: 3-Tier Antigravity 2.35.1+ Topbar Discovery & Compact z=0 Glass Pills
  // ---------------------------------------------------------------------------
  var TOPBAR_CONTENT_SKIP_SEL = [
    '[data-browser-occluder="true"]',
    '[role="menu"]',
    '[role="dialog"]',
    '[role="listbox"]',
    '[role="tooltip"]',
    '.surface-opaque',
    '.agy-menu',
    '.agy-popover',
    '.window-controls-container',
    '[id^="agy-prism-"]',
    '#ag-usage-monitor-capsule',
    '#ag-context-meter',
    '#gemini-neko-pet-root',
  ].join(', ');

  function findTopbarHost() {
    if (!doc.querySelector) return null;
    var el = doc.querySelector('[data-testid="title-menu-bar"]');
    if (el) return { el: el, matchedBy: 'testid' };
    var mb = doc.querySelector(
      '.agy-shell > :is(header, [role="menubar"]), .agy-shell > div.shrink-0 > [style*="app-region"], .agy-shell > div:first-child :is([role="menubar"], [data-testid="title-menu-bar-item"])'
    );
    if (mb) {
      var barRow = mb.matches && mb.matches('.agy-shell > *') ? mb : (mb.closest && mb.closest('.agy-shell > * > *, .agy-shell > *')) || mb;
      return { el: barRow, matchedBy: 'menubar-fallback' };
    }
    var shell = doc.querySelector('.agy-shell');
    if (shell && shell.firstElementChild && shell.firstElementChild.getBoundingClientRect) {
      var fc = shell.firstElementChild;
      var vw = Math.max(1, W.innerWidth || (doc.documentElement && doc.documentElement.clientWidth) || 0);
      var r = fc.getBoundingClientRect();
      if (
        r.top <= 24 &&
        r.height >= 24 &&
        r.height <= 52 &&
        r.width >= vw * 0.6 &&
        fc.querySelector &&
        fc.querySelector('button, a, [role="menuitem"]')
      ) {
        return { el: fc, matchedBy: 'geometry-fallback' };
      }
    }
    var monaco =
      doc.querySelector('.monaco-workbench .part.titlebar > .titlebar-container') ||
      doc.querySelector('.monaco-workbench .part.titlebar');
    if (monaco) return { el: monaco, matchedBy: 'monaco' };
    return null;
  }

  function collectTopbarContentRects(topbarEl, barRect) {
    var rects = [];
    if (!topbarEl || !barRect) return rects;
    var walk = function (node) {
      if (!node || node.nodeType !== 1) return;
      if (node !== topbarEl) {
        if (node.matches && node.matches(TOPBAR_CONTENT_SKIP_SEL)) return;
        var cs;
        try {
          cs = getComputedStyle(node);
        } catch (_) {
          return;
        }
        if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) <= 0.01) return;
        var r = node.getBoundingClientRect();
        if (cs.position === 'fixed') return;
        if (cs.position === 'absolute' && (r.bottom > barRect.bottom + 6 || r.top >= barRect.bottom - 2)) return;
        if (r.right <= barRect.left || r.left >= barRect.right) return;
        var tag = node.tagName ? node.tagName.toUpperCase() : '';
        var isLeafControl =
          tag === 'BUTTON' ||
          tag === 'A' ||
          tag === 'INPUT' ||
          tag === 'SVG' ||
          tag === 'IMG' ||
          (node.matches && node.matches('[role="button"], [role="menuitem"], [role="tab"], [data-testid="title-menu-bar-item"]'));
        if (isLeafControl) {
          if (r.width >= 2 && r.height >= 2) {
            rects.push({ left: r.left, right: r.right, top: r.top, bottom: r.bottom });
          }
          return;
        }
      }
      var cn = node.childNodes;
      for (var i = 0; i < cn.length; i += 1) {
        var child = cn[i];
        if (child.nodeType === 3) {
          if ((child.nodeValue || '').trim().length > 0 && typeof doc.createRange === 'function') {
            try {
              var rng = doc.createRange();
              rng.selectNodeContents(child);
              var tr = rng.getBoundingClientRect();
              if (tr && tr.width >= 1 && tr.height >= 1 && tr.right > barRect.left && tr.left < barRect.right) {
                rects.push({ left: tr.left, right: tr.right, top: tr.top, bottom: tr.bottom });
              }
            } catch (_) {}
          }
        } else if (child.nodeType === 1) {
          walk(child);
        }
      }
    };
    walk(topbarEl);
    return rects;
  }

  function disconnectTopbarObservers() {
    if (state.topbarSyncRaf) {
      W.cancelAnimationFrame(state.topbarSyncRaf);
      state.topbarSyncRaf = 0;
    }
    if (topbarResizeObs) {
      try { topbarResizeObs.disconnect(); } catch (_) {}
      topbarResizeObs = null;
    }
    if (topbarMutObs) {
      try { topbarMutObs.disconnect(); } catch (_) {}
      topbarMutObs = null;
    }
    state.observedTopbarEl = null;
  }

  function clearTopbarHostMarks() {
    if (!doc.querySelectorAll) return;
    var marked = doc.querySelectorAll('[' + TOPBAR_ANC_ATTR + '], [' + TOPBAR_HOST_ATTR + ']');
    for (var i = 0; i < marked.length; i += 1) {
      marked[i].removeAttribute(TOPBAR_ANC_ATTR);
      marked[i].removeAttribute(TOPBAR_HOST_ATTR);
    }
    state.topbarAncCount = 0;
  }

  function removeTopbarGlassPills() {
    disconnectTopbarObservers();
    clearTopbarHostMarks();
    var container = doc.getElementById(TOPBAR_PILLS_ID);
    if (container && container.parentNode) container.parentNode.removeChild(container);
    state.lastTopbarPillSig = '';
    state.topbarPillRects = [];
    state.topbarMatchedBy = 'none';
  }

  function scheduleTopbarPillSync() {
    if (destroyed || !state.skinEnabled || state.topbarSyncRaf) return;
    if (typeof W.requestAnimationFrame === 'function') {
      state.topbarSyncRaf = W.requestAnimationFrame(function () {
        state.topbarSyncRaf = 0;
        if (!destroyed && state.skinEnabled) syncTopbarGlassPills();
      });
    } else {
      syncTopbarGlassPills();
    }
  }

  function syncTopbarGlassPills() {
    if (destroyed || !state.skinEnabled || !doc.body) {
      removeTopbarGlassPills();
      return;
    }
    var found = findTopbarHost();
    if (!found || !found.el || !found.el.getBoundingClientRect) {
      disconnectTopbarObservers();
      clearTopbarHostMarks();
      state.topbarMatchedBy = 'none';
      state.topbarPillRects = [];
      state.lastTopbarPillSig = '';
      var emptyWrap = doc.getElementById(TOPBAR_PILLS_ID);
      if (emptyWrap) emptyWrap.textContent = '';
      return;
    }

    var topbarEl = found.el;
    state.topbarMatchedBy = found.matchedBy;

    // Stamp host + intermediate ancestors strictly inside .agy-shell (NEVER .agy-shell / #root / body!)
    var nextAncs = [];
    var cur = topbarEl.parentElement;
    var hops = 0;
    while (cur && hops < 5 && cur !== doc.body && cur !== doc.documentElement && cur.id !== 'root') {
      if (cur.classList && cur.classList.contains('agy-shell')) break;
      nextAncs.push(cur);
      cur = cur.parentElement;
      hops += 1;
    }
    if (doc.querySelectorAll) {
      var prevHosts = doc.querySelectorAll('[' + TOPBAR_HOST_ATTR + ']');
      for (var ph = 0; ph < prevHosts.length; ph += 1) {
        if (prevHosts[ph] !== topbarEl) prevHosts[ph].removeAttribute(TOPBAR_HOST_ATTR);
      }
      var prevAncs = doc.querySelectorAll('[' + TOPBAR_ANC_ATTR + ']');
      for (var pa = 0; pa < prevAncs.length; pa += 1) {
        if (nextAncs.indexOf(prevAncs[pa]) < 0) prevAncs[pa].removeAttribute(TOPBAR_ANC_ATTR);
      }
    }
    if (topbarEl.getAttribute(TOPBAR_HOST_ATTR) !== '1') topbarEl.setAttribute(TOPBAR_HOST_ATTR, '1');
    for (var ai = 0; ai < nextAncs.length; ai += 1) {
      if (nextAncs[ai].getAttribute(TOPBAR_ANC_ATTR) !== '1') nextAncs[ai].setAttribute(TOPBAR_ANC_ATTR, '1');
    }
    state.topbarAncCount = nextAncs.length;

    // Observe topbarEl (re-attach ONLY when DOM identity changes — zero D2 loop!)
    if (state.observedTopbarEl !== topbarEl) {
      if (topbarResizeObs) {
        try { topbarResizeObs.disconnect(); } catch (_) {}
        topbarResizeObs = null;
      }
      if (topbarMutObs) {
        try { topbarMutObs.disconnect(); } catch (_) {}
        topbarMutObs = null;
      }
      state.observedTopbarEl = topbarEl;
      if (W.ResizeObserver) {
        topbarResizeObs = new ResizeObserver(function () {
          if (!destroyed && state.skinEnabled) scheduleTopbarPillSync();
        });
        try { topbarResizeObs.observe(topbarEl); } catch (_) {}
      }
      if (W.MutationObserver) {
        topbarMutObs = new MutationObserver(function (muts) {
          if (destroyed || !state.skinEnabled) return;
          for (var mi = 0; mi < muts.length; mi += 1) {
            var mt = muts[mi] && muts[mi].target;
            var mtEl = mt && mt.nodeType === 1 ? mt : mt && mt.parentElement;
            if (mtEl && mtEl.closest && mtEl.closest('[data-browser-occluder="true"], [role="menu"]')) continue;
            scheduleTopbarPillSync();
            break;
          }
        });
        try {
          topbarMutObs.observe(topbarEl, { childList: true, subtree: true, characterData: true });
        } catch (_) {}
      }
      if (!topbarFontsHooked && doc.fonts && doc.fonts.ready && typeof doc.fonts.ready.then === 'function') {
        topbarFontsHooked = true;
        doc.fonts.ready.then(function () {
          if (!destroyed && state.skinEnabled) scheduleTopbarPillSync();
        });
      }
    }

    var barRect = topbarEl.getBoundingClientRect();
    var vw = Math.max(1, Number(W.innerWidth) || (doc.documentElement && doc.documentElement.clientWidth) || 0);
    var wco = W.navigator && W.navigator.windowControlsOverlay;
    var wcoRect = null;
    if (wco && wco.visible === true && typeof wco.getTitlebarAreaRect === 'function') {
      try { wcoRect = wco.getTitlebarAreaRect(); } catch (_) {}
    }
    var macTrafficLightRight = wcoRect && Number(wcoRect.x) > 20 ? Number(wcoRect.x) : 0;
    var wcoVisibleRight = wcoRect
      ? (Number.isFinite(Number(wcoRect.right)) ? Number(wcoRect.right) : Number(wcoRect.x || 0) + Number(wcoRect.width || 0))
      : 0;
    var isIslands = state.cfg.layoutMode !== 'flush';
    var islandGap = isIslands ? num(state.cfg.islandGap, 8) : 0;
    var minLeft = Math.max(barRect.left, macTrafficLightRight);
    var maxRight =
      state.wcoPillActive && state.wcoPillLeft > 0
        ? Math.min(barRect.right, state.wcoPillLeft - islandGap)
        : wcoVisibleRight > 0 && wcoVisibleRight < vw - 20
          ? Math.min(barRect.right, wcoVisibleRight - islandGap)
          : barRect.right;

    var pills = [];
    if (barRect.width >= 10 && barRect.height >= 10 && maxRight > minLeft + 8) {
      var pillTop = Math.round(barRect.top);
      var pillH = Math.max(26, Math.round(barRect.height));
      if (state.cfg.topbarStyle === 'bar') {
        var fullW = Math.round(maxRight - minLeft);
        if (fullW >= 16) {
          pills.push({ x: Math.round(minLeft), y: pillTop, w: fullW, h: pillH });
        }
      } else {
        var rawRects = collectTopbarContentRects(topbarEl, barRect);
        rawRects.sort(function (a, b) {
          return a.left - b.left;
        });
        var clusters = [];
        for (var ri = 0; ri < rawRects.length; ri += 1) {
          var rr = rawRects[ri];
          var lastC = clusters.length ? clusters[clusters.length - 1] : null;
          if (lastC && rr.left - lastC.right <= TOPBAR_CLUSTER_GAP) {
            lastC.right = Math.max(lastC.right, rr.right);
            lastC.top = Math.min(lastC.top, rr.top);
            lastC.bottom = Math.max(lastC.bottom, rr.bottom);
          } else {
            clusters.push({ left: rr.left, right: rr.right, top: rr.top, bottom: rr.bottom });
          }
        }
        var padX = 8;
        for (var ci = 0; ci < clusters.length; ci += 1) {
          var cl = clusters[ci];
          var px1 = Math.max(minLeft, cl.left - padX);
          var px2 = Math.min(maxRight, cl.right + padX);
          var pw = Math.round(px2 - px1);
          if (pw >= 12) {
            pills.push({ x: Math.round(px1), y: pillTop, w: pw, h: pillH });
          }
        }
      }
    }

    var container = doc.getElementById(TOPBAR_PILLS_ID);
    if (!container) {
      container = doc.createElement('div');
      container.id = TOPBAR_PILLS_ID;
      container.className = 'agy-prism-topbar-pills';
      container.setAttribute('aria-hidden', 'true');
      container.setAttribute('data-agy-prism-layer', '1');
      container.setAttribute('translate', 'no');
      container.setAttribute('data-no-translate', 'true');
      container.setAttribute('data-ag-no-i18n', '1');
      doc.body.appendChild(container);
    }

    var sigParts = [];
    for (var si = 0; si < pills.length; si += 1) {
      sigParts.push(pills[si].x + ',' + pills[si].y + ',' + pills[si].w + ',' + pills[si].h);
    }
    var nextSig = sigParts.join('|');
    if (nextSig === state.lastTopbarPillSig && container.children.length === pills.length) {
      return;
    }
    state.lastTopbarPillSig = nextSig;
    state.topbarPillRects = pills;

    while (container.children.length > pills.length) {
      container.removeChild(container.lastChild);
    }
    for (var k = 0; k < pills.length; k += 1) {
      var pillNode = container.children[k];
      if (!pillNode) {
        pillNode = doc.createElement('div');
        pillNode.className = 'agy-prism-topbar-pill';
        pillNode.setAttribute('aria-hidden', 'true');
        container.appendChild(pillNode);
      }
      pillNode.style.left = pills[k].x + 'px';
      pillNode.style.top = pills[k].y + 'px';
      pillNode.style.width = pills[k].w + 'px';
      pillNode.style.height = pills[k].h + 'px';
    }
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
    var effSbListStyle =
      (state.cfg.regions && state.cfg.regions.sidebar && state.cfg.regions.sidebar.listStyle) ||
      state.cfg.sidebarListStyle ||
      'capsule';
    var rootAttrs = [
      [ROOT_ATTR, VERSION],
      [GLASS_ATTR, 'ready'],
      ['data-prism-theme', state.effectiveTheme],
      ['data-prism-scheme', state.cfg.colorScheme],
      ['data-prism-accent-mode', state.cfg.accentMode],
      ['data-prism-layout', state.cfg.layoutMode],
      [TOPBAR_STYLE_ATTR, state.cfg.topbarStyle || 'pills'],
      [SIDEBAR_STYLE_ATTR, effSbListStyle],
      [SIDEBAR_TYPO_ATTR, state.cfg.sidebarTypographyMode || 'balanced'],
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
    if (state.cfg.hideWelcomeLogo) {
      if (root.getAttribute(WELCOME_LOGO_ATTR) !== 'hidden') root.setAttribute(WELCOME_LOGO_ATTR, 'hidden');
    } else {
      root.removeAttribute(WELCOME_LOGO_ATTR);
    }
    if (state.wallpaperReady) {
      if (root.getAttribute(WALLPAPER_ATTR) !== 'ready') root.setAttribute(WALLPAPER_ATTR, 'ready');
    } else {
      root.removeAttribute(WALLPAPER_ATTR);
    }

    if (!state.cfg.parallaxEnabled) {
      if (state.parallaxRaf) {
        W.cancelAnimationFrame(state.parallaxRaf);
        state.parallaxRaf = 0;
      }
      state.parallaxCurX = 0;
      state.parallaxCurY = 0;
      state.parallaxTargetX = 0;
      state.parallaxTargetY = 0;
      if (state.activeWrap && state.activeWrap.style) {
        state.activeWrap.style.removeProperty('--prism-px');
        state.activeWrap.style.removeProperty('--prism-py');
      }
    }

    var tok = computeSkinTokens(state.cfg);
    var typo = tok.regionTypo || {};
    var typoFields = ['fg', 'ff', 'fs'];
    for (var ri = 0; ri < REGION_IDS.length; ri += 1) {
      var rid = REGION_IDS[ri];
      var rt = typo[rid] || { fg: '', ff: '', fs: '' };
      for (var fi = 0; fi < typoFields.length; fi += 1) {
        var f = typoFields[fi];
        var attrName = 'data-prism-' + f + '-' + rid;
        var varName = '--prism-region-' + rid + '-' + f;
        var val = rt[f] ? String(rt[f]) : '';
        if (val) {
          if (root.getAttribute(attrName) !== '1') root.setAttribute(attrName, '1');
          tok.vars[varName] = val;
        } else {
          root.removeAttribute(attrName);
          if (root.style) root.style.removeProperty(varName);
          delete state.appliedVars[varName];
        }
      }
    }
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
    var prevWcoSig = state.lastWcoSig;
    syncWindowControlsOverlay(false, false);
    if (state.lastWcoSig !== prevWcoSig) {
      scheduleWcoConfirmTimers();
    }
    syncWcoGlassPill();
    syncTopbarGlassPills();
    syncWelcomeLogo();
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
    if (wantTransparent && state.cfg) {
      var wcoEnt = state.cfg.regions && state.cfg.regions.wco;
      var rawWcoFg = (wcoEnt && wcoEnt.fontColor) || state.cfg.globalFontColor || '';
      if (rawWcoFg) {
        var parsedWcoFg = hexToRgb(rawWcoFg);
        if (parsedWcoFg) {
          var wcoSurf = state.lastWcoSurface;
          var wcoBgRgb = wcoSurf && wcoSurf.rgb ? wcoSurf.rgb : (isLight ? [245, 245, 247] : [19, 19, 25]);
          var wcoAlpha = wcoSurf && Number.isFinite(Number(wcoSurf.alpha)) ? Number(wcoSurf.alpha) : 0.72;
          var allowRaw = Boolean(wcoEnt && wcoEnt.allowRawFontColor === true);
          if (allowRaw || wcoAlpha < 0.55) {
            symbolColor = rgbToHex(parsedWcoFg);
          } else {
            symbolColor = rgbToHex(enforceFgContrastRgb(parsedWcoFg, wcoBgRgb, isLight, 4.5));
          }
        }
      }
    }
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
    var wasActive = state.wcoPillActive || state.lastWcoPillSig !== '';
    state.wcoPillActive = false;
    state.wcoPillLeft = 0;
    state.lastWcoPillSig = '';
    var root = doc.documentElement;
    if (root) {
      if (root.hasAttribute(WCO_ACTIVE_ATTR)) root.removeAttribute(WCO_ACTIVE_ATTR);
      if (root.style) {
        if (state.skinEnabled && !destroyed) {
          if (root.style.getPropertyValue('--prism-wco-inset-right') !== '0px') {
            root.style.setProperty('--prism-wco-inset-right', '0px');
          }
        } else {
          root.style.removeProperty('--prism-wco-inset-right');
        }
        root.style.removeProperty('--prism-wco-pill-top');
        root.style.removeProperty('--prism-wco-pill-h');
      }
    }
    if (wasActive && state.skinEnabled && !destroyed) {
      scheduleTopbarPillSync();
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
          scheduleTopbarPillSync();
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
    var padTop = isIslands ? Math.min(2, Math.max(0, Math.round(num(state.cfg.workspacePad, 8)))) : 0;
    var padRight = isIslands ? Math.min(4, Math.max(0, Math.round(num(state.cfg.workspacePad, 8)))) : 0;
    var pillW = isIslands ? Math.max(40, wcoW - padRight) : wcoW;
    var pillH = Math.max(28, wcoH - padTop);
    var insetPx = (isIslands ? wcoW + num(state.cfg.islandGap, 8) : wcoW) + 'px';
    var pillTopPx = padTop + 'px';
    var pillRightPx = padRight + 'px';
    var pillWPx = pillW + 'px';
    var pillHPx = pillH + 'px';
    var wcoPillLeft = vw - wcoW;
    var nextSig = [isIslands ? 1 : 0, insetPx, pillTopPx, pillRightPx, pillWPx, pillHPx, wcoPillLeft].join('|');

    state.wcoPillActive = true;
    state.wcoPillLeft = wcoPillLeft;
    if (root.getAttribute(WCO_ACTIVE_ATTR) !== '1') root.setAttribute(WCO_ACTIVE_ATTR, '1');

    var pill = doc.getElementById(WCO_PILL_ID);
    if (pill && state.lastWcoPillSig === nextSig) {
      return;
    }
    state.lastWcoPillSig = nextSig;

    if (root.style) {
      root.style.setProperty('--prism-wco-inset-right', insetPx);
      root.style.setProperty('--prism-wco-pill-top', pillTopPx);
      root.style.setProperty('--prism-wco-pill-h', pillHPx);
    }

    if (!pill) {
      pill = doc.createElement('div');
      pill.id = WCO_PILL_ID;
      pill.className = 'agy-prism-wco-pill';
      pill.setAttribute('aria-hidden', 'true');
      pill.setAttribute('data-agy-prism-layer', '1');
      pill.setAttribute('translate', 'no');
      pill.setAttribute('data-no-translate', 'true');
      pill.setAttribute('data-ag-no-i18n', '1');
      doc.body.appendChild(pill);
    }
    pill.style.top = pillTopPx;
    pill.style.right = pillRightPx;
    pill.style.width = pillWPx;
    pill.style.height = pillHPx;
    scheduleTopbarPillSync();
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
    state.mediaMountSeq += 1;
    clearLifecycleTimers();
    clearRootWatchdogTimers();
    state._watchdogReported = false;
    clearTimeout(state.hiddenTimer);
    state.hiddenTimer = 0;
    clearTimeout(state.wakeNudgeTimer);
    state.wakeNudgeTimer = 0;
    if (state.parallaxRaf) {
      try { W.cancelAnimationFrame(state.parallaxRaf); } catch (_) {}
      state.parallaxRaf = 0;
    }
    if (state.fxRaf) {
      try { W.cancelAnimationFrame(state.fxRaf); } catch (_) {}
      state.fxRaf = 0;
    }
    if (state.unmuteGestureCleanup) {
      try { state.unmuteGestureCleanup(); } catch (_) {}
      state.unmuteGestureCleanup = null;
    }
    disconnectHoleActiveObservers();
    teardownWelcomeLogoGuard();
    removeTopbarGlassPills();
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
    state.degradedToPoster = false;
    state.degradeReason = '';
    state.wallpaperReady = false;
    state.slides = [];
    state.lastStructuralSig = '';
    state.lastCaretSig = '';
    state.lastSidecarSig = '';
    syncPointerHooks();
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
        WCO_ACTIVE_ATTR,
        TOPBAR_STYLE_ATTR,
        SIDEBAR_STYLE_ATTR,
        SIDEBAR_TYPO_ATTR,
        WELCOME_LOGO_ATTR,
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
      for (var ri = 0; ri < REGION_IDS.length; ri += 1) {
        var rId = REGION_IDS[ri];
        root.removeAttribute('data-prism-fg-' + rId);
        root.removeAttribute('data-prism-ff-' + rId);
        root.removeAttribute('data-prism-fs-' + rId);
      }
      if (root.attributes && typeof root.attributes.length === 'number') {
        for (var ai = root.attributes.length - 1; ai >= 0; ai -= 1) {
          var attrItem = root.attributes[ai];
          if (attrItem && /^data-prism-(?:fg|ff|fs)-/.test(attrItem.name)) {
            root.removeAttribute(attrItem.name);
          }
        }
      }
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
      var onThemeMut = function (muts) {
        if (destroyed || !state.skinEnabled) return;
        var sawThemeAttr = !Array.isArray(muts);
        if (Array.isArray(muts)) {
          for (var i = 0; i < muts.length; i += 1) {
            var an = muts[i] && muts[i].attributeName;
            if (an === 'class' || an === 'data-theme' || an === 'data-ag-cs-theme') {
              sawThemeAttr = true;
              break;
            }
          }
        }
        if (!sawThemeAttr && detectHostTheme() === state.hostTheme) return;
        if (themeDebounce) return;
        themeDebounce = setTimeout(function () {
          themeDebounce = 0;
          if (destroyed || !state.skinEnabled) return;
          var nextHost = detectHostTheme();
          var themeChanged = nextHost !== state.hostTheme;
          if (themeChanged) {
            state.hostTheme = nextHost;
            refreshSkinStyles();
          }
          if (themeChanged || sawThemeAttr) {
            clearTimeout(state.wcoThemeTimer);
            state.wcoThemeTimer = setTimeout(function () {
              state.wcoThemeTimer = 0;
              if (!destroyed && state.skinEnabled) syncWindowControlsOverlay(false, true);
            }, 75);
          }
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
    if (!shouldAcceptStateRev(p.stateRev, p.stateEpoch || p.mediaOrigin || W.__agyPrismCapToken || '')) {
      return status();
    }

    var isSoftDisable =
      p.skinEnabled === false ||
      p.skinEnabled === 0 ||
      Boolean(p.config && (p.config.skinEnabled === false || p.config.skinEnabled === 0));
    var hasFullCfg = Boolean(p.config && isPlainObj(p.config) && Object.keys(p.config).length > 2);

    if (isSoftDisable) {
      if (hasFullCfg) {
        lastPayload = p;
      } else {
        var nextLp = isPlainObj(lastPayload) ? Object.assign({}, lastPayload) : {};
        nextLp.skinEnabled = false;
        if (p.stateRev !== undefined) nextLp.stateRev = p.stateRev;
        if (p.stateEpoch !== undefined) nextLp.stateEpoch = p.stateEpoch;
        lastPayload = nextLp;
      }
      W.__agyPrismOn = false;
      state.skinEnabled = false;
      teardownSkinDomOnly();
      return status();
    }

    W.__agyPrismOn = true;
    state.skinEnabled = true;
    var rawCfg =
      (hasFullCfg ? p.config : null) ||
      p.prefs ||
      (p.config && isPlainObj(p.config)
        ? Object.assign({}, (isPlainObj(lastPayload) && lastPayload.config) || state.rawCfg || {}, p.config)
        : isPlainObj(lastPayload) && (lastPayload.config || lastPayload.prefs) && Object.keys(p).length <= 3
          ? lastPayload.config || lastPayload.prefs
          : p);
    if (hasFullCfg || p.prefs || (!p.config && Object.keys(p).length > 3)) {
      lastPayload = p;
    } else if (isPlainObj(lastPayload)) {
      lastPayload = Object.assign({}, lastPayload, p, {
        skinEnabled: true,
        config: rawCfg,
      });
    } else {
      lastPayload = p;
    }

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
    } else if (!state.item && isPlainObj(lastPayload) && lastPayload.activeItem) {
      state.item = lastPayload.activeItem;
    }
    var nextItemId = state.item && state.item.id ? String(state.item.id) : '';
    if (typeof p.mediaOrigin === 'string') state.mediaOrigin = p.mediaOrigin;
    if (Array.isArray(p.slides)) {
      state.slides = p.slides.slice();
    } else if (nextItemId !== prevItemId || !(state.item && state.item.slidesUrl)) {
      state.slides = [];
    }

    state.rawCfg = rawCfg && typeof rawCfg === 'object' ? rawCfg : {};
    state.cfg = normalizeConfig(state.rawCfg, state.item);

    var runMount = function () {
      if (destroyed || !state.skinEnabled) return;
      refreshSkinStyles();
      if (state.item && state.item.slidesUrl && (!p.slides || !p.slides.length) && (!state.slides || !state.slides.length) && W.fetch) {
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
      syncLifecycleTimers();
      syncPointerHooks();
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
    var patchKeys = [];
    var allFastOptical = true;
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
      var patchHasRegions = hasOwn(patch, 'regions');
      var patchResetFullRegions = patchHasRegions && patch.regions === null;
      var patchHasTints = hasOwn(patch, 'surfaceTints');
      var patchResetAllTints = patchHasTints && patch.surfaceTints === null;
      var patchRegSbObj = isPlainObj(patch.regions) && isPlainObj(patch.regions.sidebar) ? patch.regions.sidebar : null;
      var patchRegSbReset = patchResetFullRegions || (isPlainObj(patch.regions) && patch.regions.sidebar === null);
      var patchRegRpReset = patchResetFullRegions || (isPlainObj(patch.regions) && patch.regions.rightPane === null);
      var patchTintSbObj = isPlainObj(patch.surfaceTints) && isPlainObj(patch.surfaceTints.sidebar) ? patch.surfaceTints.sidebar : null;
      var patchTintSbReset = patchResetAllTints || (isPlainObj(patch.surfaceTints) && patch.surfaceTints.sidebar === null);

      var patchHasLegacySbOp = hasOwn(patch, 'sidebarOpacity');
      var patchTouchedSbOp = Boolean(patchResetFullRegions || patchRegSbReset || patchTintSbReset || (patchRegSbObj && hasOwn(patchRegSbObj, 'opacity')) || (patchTintSbObj && hasOwn(patchTintSbObj, 'opacity')));
      var patchHasLegacySbBlur = hasOwn(patch, 'sidebarBlur');
      var patchTouchedSbBlur = Boolean(patchResetFullRegions || patchRegSbReset || patchTintSbReset || (patchRegSbObj && hasOwn(patchRegSbObj, 'blur')) || (patchTintSbObj && hasOwn(patchTintSbObj, 'blur')));
      var patchHasLegacySbFs = hasOwn(patch, 'sidebarFontSize');
      var patchTouchedSbFs = Boolean(patchResetFullRegions || patchRegSbReset || (patchRegSbObj && hasOwn(patchRegSbObj, 'fontSize')));
      var patchHasLegacySbList = hasOwn(patch, 'sidebarListStyle');
      var patchTouchedSbList = Boolean(patchResetFullRegions || patchRegSbReset || (patchRegSbObj && hasOwn(patchRegSbObj, 'listStyle')));
      var patchHasLegacyLeftRad = hasOwn(patch, 'leftSidebarRadius') || hasOwn(patch, 'leftSidebarCornerRadius');
      var patchTouchedLeftRad = Boolean(patchResetFullRegions || patchRegSbReset || (patchRegSbObj && hasOwn(patchRegSbObj, 'radius')));
      var patchHasLegacyRightRad = hasOwn(patch, 'rightSidebarRadius') || hasOwn(patch, 'rightSidebarCornerRadius');
      var patchTouchedRightRad = Boolean(patchResetFullRegions || patchRegRpReset || (isPlainObj(patch.regions) && isPlainObj(patch.regions.rightPane) && hasOwn(patch.regions.rightPane, 'radius')));

      for (k in patch) {
        if (!Object.prototype.hasOwnProperty.call(patch, k)) continue;
        patchKeys.push(k);
        if (!FAST_OPTICAL_KEYS_MAP[k]) allFastOptical = false;
        if (k === 'surfaceTints') {
          merged.surfaceTints = patch.surfaceTints === null ? null : mergeSurfaceTintsRaw(merged.surfaceTints, patch.surfaceTints);
          if (ovClone) {
            ovClone.surfaceTints = patch.surfaceTints === null ? null : mergeSurfaceTintsRaw(ovClone.surfaceTints, patch.surfaceTints);
          }
        } else if (k === 'regions') {
          merged.regions = patch.regions === null ? null : mergeRegionsRaw(merged.regions, patch.regions);
          if (ovClone) {
            ovClone.regions = patch.regions === null ? null : mergeRegionsRaw(ovClone.regions, patch.regions);
          }
        } else {
          merged[k] = patch[k];
          if (ovClone && (Object.prototype.hasOwnProperty.call(ovClone, k) || PER_WALLPAPER_OVERRIDE_KEYS_MAP[k])) {
            ovClone[k] = patch[k];
          }
        }
      }

      var syncUpdatedTarget = function (tgt) {
        if (!isPlainObj(tgt)) return;
        if (patchResetFullRegions) {
          tgt.regions = null;
          if (!patchHasTints) tgt.surfaceTints = null;
        } else {
          if (patchResetAllTints) {
            if (isPlainObj(tgt.regions)) {
              tgt.regions = stripOpticalFromRegionsRaw(tgt.regions);
            }
            if (isPlainObj(patch.regions)) {
              tgt.regions = mergeRegionsRaw(tgt.regions, patch.regions);
            }
          } else if (patchHasTints && isPlainObj(patch.surfaceTints)) {
            var regCopy = isPlainObj(tgt.regions) ? Object.assign({}, tgt.regions) : {};
            for (var si = 0; si < SURFACE_TINT_COMPONENTS.length; si += 1) {
              var sid = SURFACE_TINT_COMPONENTS[si];
              if (!hasOwn(patch.surfaceTints, sid)) continue;
              var stEnt = patch.surfaceTints[sid];
              if (stEnt === null) {
                regCopy[sid] = stripOpticalFromRegionEntry(regCopy[sid]);
              } else if (isPlainObj(stEnt)) {
                var entCopy = isPlainObj(regCopy[sid]) ? Object.assign({}, regCopy[sid]) : {};
                for (var oi = 0; oi < REGION_OPTICAL_KEYS.length; oi += 1) {
                  var optKey = REGION_OPTICAL_KEYS[oi];
                  if (hasOwn(stEnt, optKey)) entCopy[optKey] = stEnt[optKey];
                }
                regCopy[sid] = entCopy;
              }
            }
            tgt.regions = isPlainObj(patch.regions) ? mergeRegionsRaw(regCopy, patch.regions) : regCopy;
          }
          if (patchHasRegions && isPlainObj(patch.regions) && !patchHasTints) {
            var regProjected = sanitizeRegionsWithSync(tgt, null);
            tgt.surfaceTints = regProjected.surfaceTints;
          }
        }

        var ensureSbReg = function () {
          if (!isPlainObj(tgt.regions)) tgt.regions = {};
          if (!isPlainObj(tgt.regions.sidebar)) tgt.regions.sidebar = {};
          return tgt.regions.sidebar;
        };
        var ensureSbTint = function () {
          if (!isPlainObj(tgt.surfaceTints)) tgt.surfaceTints = {};
          if (!isPlainObj(tgt.surfaceTints.sidebar)) tgt.surfaceTints.sidebar = {};
          return tgt.surfaceTints.sidebar;
        };

        if (patchHasLegacySbOp && !patchTouchedSbOp) {
          ensureSbReg().opacity = patch.sidebarOpacity;
          ensureSbTint().opacity = patch.sidebarOpacity;
        } else if (patchTouchedSbOp && !patchHasLegacySbOp) {
          var effOp = patchResetFullRegions || patchResetAllTints || patchRegSbReset || patchTintSbReset
            ? null
            : tgt.regions && isPlainObj(tgt.regions.sidebar)
              ? tgt.regions.sidebar.opacity
              : undefined;
          if (effOp !== undefined) tgt.sidebarOpacity = effOp;
        }

        if (patchHasLegacySbBlur && !patchTouchedSbBlur) {
          ensureSbReg().blur = patch.sidebarBlur;
          ensureSbTint().blur = patch.sidebarBlur;
        } else if (patchTouchedSbBlur && !patchHasLegacySbBlur) {
          var effBlur = patchResetFullRegions || patchResetAllTints || patchRegSbReset || patchTintSbReset
            ? null
            : tgt.regions && isPlainObj(tgt.regions.sidebar)
              ? tgt.regions.sidebar.blur
              : undefined;
          if (effBlur !== undefined) tgt.sidebarBlur = effBlur;
        }

        if (patchHasLegacySbFs && !patchTouchedSbFs) {
          ensureSbReg().fontSize = patch.sidebarFontSize;
        } else if (patchTouchedSbFs && !patchHasLegacySbFs) {
          var effFs = patchResetFullRegions || patchRegSbReset
            ? null
            : tgt.regions && isPlainObj(tgt.regions.sidebar)
              ? tgt.regions.sidebar.fontSize
              : undefined;
          if (effFs !== undefined) tgt.sidebarFontSize = effFs;
        }

        if (patchHasLegacySbList && !patchTouchedSbList) {
          ensureSbReg().listStyle = patch.sidebarListStyle;
        } else if (patchTouchedSbList && !patchHasLegacySbList) {
          var effList = patchResetFullRegions || patchRegSbReset
            ? 'capsule'
            : tgt.regions && isPlainObj(tgt.regions.sidebar)
              ? tgt.regions.sidebar.listStyle
              : undefined;
          if (effList !== undefined) tgt.sidebarListStyle = effList;
        }

        if (patchHasLegacyLeftRad && !patchTouchedLeftRad) {
          var rawLR = hasOwn(patch, 'leftSidebarRadius') ? patch.leftSidebarRadius : patch.leftSidebarCornerRadius;
          var normLR = sanitizeSidebarRadius(rawLR, 'auto');
          ensureSbReg().radius = normLR === 'auto' || normLR === 'native' ? null : Number(normLR);
          tgt.leftSidebarRadius = normLR;
        } else if (patchTouchedLeftRad && !patchHasLegacyLeftRad) {
          var nextLR = patchResetFullRegions || patchRegSbReset
            ? null
            : tgt.regions && isPlainObj(tgt.regions.sidebar)
              ? tgt.regions.sidebar.radius
              : undefined;
          if (nextLR !== undefined) {
            tgt.leftSidebarRadius = nextLR === null ? (tgt.leftSidebarRadius === 'native' && !patchResetFullRegions && !patchRegSbReset ? 'native' : 'auto') : String(nextLR);
          }
        }

        if (patchHasLegacyRightRad && !patchTouchedRightRad) {
          var rawRR = hasOwn(patch, 'rightSidebarRadius') ? patch.rightSidebarRadius : patch.rightSidebarCornerRadius;
          var normRR = sanitizeSidebarRadius(rawRR, 'auto');
          if (!isPlainObj(tgt.regions)) tgt.regions = {};
          if (!isPlainObj(tgt.regions.rightPane)) tgt.regions.rightPane = {};
          tgt.regions.rightPane.radius = normRR === 'auto' || normRR === 'native' ? null : Number(normRR);
          tgt.rightSidebarRadius = normRR;
        } else if (patchTouchedRightRad && !patchHasLegacyRightRad) {
          var nextRR = patchResetFullRegions || patchRegRpReset
            ? null
            : tgt.regions && isPlainObj(tgt.regions.rightPane)
              ? tgt.regions.rightPane.radius
              : undefined;
          if (nextRR !== undefined) {
            tgt.rightSidebarRadius = nextRR === null ? (tgt.rightSidebarRadius === 'native' && !patchResetFullRegions && !patchRegRpReset ? 'native' : 'auto') : String(nextRR);
          }
        }
      };

      syncUpdatedTarget(merged);
      if (ovClone) syncUpdatedTarget(ovClone);
    } else {
      allFastOptical = false;
    }

    if (allFastOptical && patchKeys.length > 0 && state.skinEnabled && doc.body && !destroyed) {
      state.rawCfg = merged;
      state.cfg = normalizeConfig(state.rawCfg, state.item);
      lastPayload = Object.assign({}, lastPayload || {}, {
        skinEnabled: state.skinEnabled,
        config: merged,
        activeItem: state.item,
        mediaOrigin: state.mediaOrigin,
        slides: state.slides,
      });
      refreshSkinStyles();
      syncLifecycleTimers();
      syncPointerHooks();
      return status();
    }

    state.rawCfg = merged;
    var nextSkinEnabled =
      patch && (patch.skinEnabled === false || patch.skinEnabled === 0)
        ? false
        : patch && (patch.skinEnabled === true || patch.skinEnabled === 1)
          ? true
          : state.skinEnabled;
    return applyPayload({
      skinEnabled: nextSkinEnabled,
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
      var prevHealWcoSig = state.lastWcoSig;
      syncWindowControlsOverlay(false, true);
      if (state.lastWcoSig !== prevHealWcoSig) {
        scheduleWcoConfirmTimers();
      }
      syncWcoGlassPill();
      syncTopbarGlassPills();
      syncWelcomeLogo();
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
      stateRev: Number(state.lastAppliedRev || 0),
      degradedToPoster: Boolean(state.degradedToPoster),
      degradeReason: String(state.degradeReason || ''),
      theme: state.effectiveTheme,
      hostTheme: state.hostTheme,
      layoutMode: state.cfg.layoutMode || 'islands',
      topbarStyle: state.cfg.topbarStyle || 'pills',
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
      hideWelcomeLogo: Boolean(state.cfg.hideWelcomeLogo),
      welcomeLogoHiddenCount: Number(state.welcomeLogoHiddenCount || 0),
      topbar: {
        found: state.topbarMatchedBy !== 'none',
        matchedBy: state.topbarMatchedBy,
        style: state.cfg.topbarStyle || 'pills',
        ancestorsHollowed: state.topbarAncCount,
        pillCount: state.topbarPillRects.length,
        pills: state.topbarPillRects.slice(),
        wcoPillActive: Boolean(state.wcoPillActive),
      },
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
    clearLifecycleTimers();
    syncPointerHooks();
    clearRootWatchdogTimers();
    disconnectHoleActiveObservers();
    teardownWelcomeLogoGuard();
    removeTopbarGlassPills();
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
  if (W.__agyPrismOn === false) {
    state.skinEnabled = false;
    teardownSkinDomOnly();
  } else if (bootPayload) {
    applyPayload(bootPayload);
  }

  return status();
})();
