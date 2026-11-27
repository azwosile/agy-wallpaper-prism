// Ephemeral CDP Live Host Region Picker for Antigravity (agy-wallpaper-prism v2.4.1).
//
// Self-contained ES2020 browser IIFE loaded on demand via `/host/<capToken>/inspector.js`.
// Strictly read-only geometric hit-testing across all 12 Prism regions in BOTH `live`
// and `static-css` / `manual` / `skinEnabled: false` modes (zero text selectors,
// `<html>`-only state attribute, zero `<body>` mutations, Guardrail V2 DOM-connected check).
//
// Exposes `window.__agyPrismInspector = { version, active, alive, cancel, destroy, pick, hitTestAt, status }`.
(function agyPrismInspectorMain() {
  'use strict';

  var VERSION = '2.4.1';
  var W = typeof window !== 'undefined' ? window : null;
  if (!W || !W.document) return { installed: false, reason: 'no-window' };
  try {
    if (W.top && W !== W.top) return { installed: false, reason: 'subframe' };
  } catch (_) {}
  var doc = W.document;

  var API_KEY = '__agyPrismInspector';
  var SKIN_KEY = '__agyPrism';
  var BINDING_KEY = '__agyPrismCall';
  var OVERLAY_ID = 'agy-prism-inspector-overlay';
  var HUD_ID = 'agy-prism-inspector-hud';
  var STYLE_ID = 'agy-prism-inspector-css';
  var HTML_ATTR = 'data-agy-prism-inspector';

  var REGION_SET = {
    topbar: 1,
    wco: 1,
    sidebar: 1,
    workspace: 1,
    userBubble: 1,
    assistantBubble: 1,
    codeBlock: 1,
    card: 1,
    controls: 1,
    composer: 1,
    rightPane: 1,
    popover: 1,
  };

  var REGION_LABELS = {
    topbar: { zh: '顶部菜单栏', en: 'Topbar' },
    wco: { zh: '窗口控制胶囊', en: 'Window Controls' },
    sidebar: { zh: '左侧边栏', en: 'Left Sidebar' },
    workspace: { zh: '主工作区', en: 'Workspace' },
    userBubble: { zh: '用户消息气泡', en: 'User Bubble' },
    assistantBubble: { zh: 'AI 回复与任务卡', en: 'Assistant Reply & Cards' },
    codeBlock: { zh: '代码块 / 表格', en: 'Code Block & Table' },
    card: { zh: '扩展 / 接管卡片', en: 'Extension / Card' },
    controls: { zh: '按钮 / 控件 / 滚动条', en: 'Host Controls' },
    composer: { zh: '对话输入框', en: 'Composer' },
    rightPane: { zh: '右侧辅助面板', en: 'Right Pane' },
    popover: { zh: '浮窗 / 菜单 / 提示', en: 'Popover / Menu' },
  };

  var POPOVER_SELECTORS = [
    '#agy-prism-popover[data-open="true"] .prism-sheet',
    '#agy-prism-popover .prism-corner-orb',
    '#agy-prism-popover',
    '.agy-dialog',
    '.settings-modal-container',
    '.agy-overlay',
    '.agy-popover',
    '.agy-menu',
    '.agy-toast',
    '.agy-fastpick',
    '.compact-tooltip',
    '[class*="react-tooltip"]',
    '.toast-root',
    '.agy-tip-card',
    '.agy-selection-pill',
    '[data-base-ui-portal] :is([role="listbox"], [role="menu"], [role="dialog"], .agy-popover, .agy-overlay)',
    '.surface-glass:not(.surface-composer):not(.surface-composer-card):not(.agy-user-bubble):not(.agy-user-bubble-frame):not(.agy-takeover-card):not(.agy-scroll-bottom)',
    '[role="dialog"]:not(#gemini-neko-observer-modal):not([data-testid="media-modal"]):not(.prism-sheet)',
    '[role="alertdialog"]',
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
  var POPOVER_SELECTOR_STR = POPOVER_SELECTORS.join(', ');

  // Keep CONTROL_SELECTORS free of bare `button` so #hub-interactive-btn inside composer stays `composer`.
  var CONTROL_SELECTORS = [
    '.agy-scroll-bottom',
    '[data-testid="voice-live-pill"]',
    '[data-testid="voice-start-button"]',
    '[data-testid="overlay-scrollbar"]',
    '[data-testid="overlay-scrollbar-thumb"]',
    '[data-side-panel-strip="true"] .agy-aux-tab',
    '[data-testid="subagent-node"]',
    '[data-testid="code-block-preview-toggle"]',
    '[data-slot="toggle-group"]',
    '[data-slot="toggle-group"] > button',
    ':is(.agy-sidebar-row, [data-testid="conversation-row-sidebar"])[data-selected="true"]',
    '.agy-row-actions > button',
    '[data-testid="send-button"]',
    '[data-testid="model-selector-trigger"]',
    '[data-testid="permissions-selector-trigger"]',
    '[data-testid="sidebar-toggle"]',
    'button[data-testid="changed-files-card-review"]',
    '.artifact-card .proceed-button',
    '[role="switch"]',
    '[role="checkbox"]',
    '.agy-select-trigger',
    'input.agy-field',
    'textarea.agy-textarea',
    '[data-testid="customizations-search"]',
    '.agy-field:has([data-testid="customizations-search"])',
    '[data-testid="plugins-tabs"]',
    '[data-testid="new-tab-search-input"]',
    ':is(.agy-button, .agy-button-xs, .agy-button-sm, .agy-button-md, .agy-button-lg, .agy-button-custom, .agy-button-icon-sm, .agy-button-icon, .agy-button-icon-lg):not([data-testid="title-menu-bar-item"]):not([data-project-card="true"]):not([data-testid="worked-for-collapsible"]):not([data-testid="step-plan-chip"])',
  ];
  var CONTROL_SELECTOR_STR = CONTROL_SELECTORS.join(', ');

  var COMPOSER_SELECTORS = [
    '#antigravity\\.agentSidePanelInputBox',
    'div[data-testid="agent-input-box"]',
    '[data-testid="agent-input-box"]',
    '.surface-composer-card',
    '.agy-composer',
    '.composer-dock',
  ];
  var COMPOSER_SELECTOR_STR = COMPOSER_SELECTORS.join(', ');
  var COMPOSER_ANCESTOR_STR =
    '#antigravity\\.agentSidePanelInputBox, [data-testid="agent-input-box"], .surface-composer-card, .agy-composer';

  var CODE_BLOCK_SELECTORS = [
    'pre > div:has([data-testid="code-block-preview-toggle"], [data-testid="markdown-code-block-preview"])',
    'pre > div.rounded-xl.border',
    'pre.md-code-block',
    'pre',
    '.code-block',
    '.md-code-block',
    '.agy-md-table',
    '.md-table-frame',
  ];
  var CODE_BLOCK_SELECTOR_STR = CODE_BLOCK_SELECTORS.join(', ');

  var USER_BUBBLE_SELECTORS = [
    '[data-testid="user-message-bubble"]',
    '.agy-user-bubble',
    '.agy-user-bubble-frame',
    '[data-testid="user-message"]',
    '.msg-user',
    '[data-role="user"]',
  ];
  var USER_BUBBLE_SELECTOR_STR = USER_BUBBLE_SELECTORS.join(', ');

  var ASSISTANT_BUBBLE_SELECTORS = [
    '[data-testid="artifact-card"]',
    '.artifact-card',
    '[data-testid="changed-files-card-header"]',
    '.files-changed-header',
    '[data-testid="changed-files-card"]',
    'button[data-testid="worked-for-collapsible"]',
    'button[data-testid="step-plan-chip"]',
    '[data-step-rows="true"] [role="button"][aria-expanded]',
    '[data-testid="planner-response-text"]',
    '[data-testid="agent-response"]',
    '[data-testid="background-task-command"]',
    '.msg-agent',
    '[data-testid="assistant-message"]',
    '[data-role="assistant"]',
  ];
  var ASSISTANT_BUBBLE_SELECTOR_STR = ASSISTANT_BUBBLE_SELECTORS.join(', ');

  var CARD_SELECTORS = [
    '[data-testid="customization-card"]',
    '.agy-spotlight-card',
    '[data-testid="marketplace-bundles-banner"]',
    '[data-testid="plugin-detail"]',
    '.agy-takeover-card',
    '.agy-callout',
    '.mock-starter-card',
    '.aux-card',
    '.surface-opaque.bg-background',
    '.bg-card:not(.agy-user-bubble):not([data-testid="user-message-bubble"])',
  ];
  var CARD_SELECTOR_STR = CARD_SELECTORS.join(', ');

  var SIDEBAR_SELECTORS = [
    '[data-testid="sidebar-split"] > div:first-child',
    '[data-testid="sidebar-split"] > aside:first-child',
    '.agy-sidebar',
    'aside[data-side-panel-body]:not(.agy-sheet *):not([data-testid="aux-pane-split"] *)',
    '.monaco-workbench .part.activitybar',
    '.monaco-workbench .part.sidebar',
    '[data-testid="conversation-list-sidebar"]',
  ];
  var SIDEBAR_SELECTOR_STR = SIDEBAR_SELECTORS.join(', ');

  var RIGHT_PANE_SELECTORS = [
    '[data-testid="aux-pane-split"] > :is(div, aside, section):last-child:not(:first-child):not([hidden]):not([aria-hidden="true"]):not(.split-gutter):not([data-split-sash])',
    '[data-side-panel-strip]:not([data-testid="aux-pane-split"] *)',
    '.agy-sheet [data-side-panel-body]:not([data-testid="aux-pane-split"] *)',
    '.monaco-workbench .part.auxiliarybar',
    '[data-testid="sidecar-iframe-slot"]',
  ];
  var RIGHT_PANE_SELECTOR_STR = RIGHT_PANE_SELECTORS.join(', ');

  var WORKSPACE_SELECTORS = [
    '[data-testid="aux-pane-split"] > :is(div, main, section):first-child',
    '.agy-shell > main',
    '[data-testid="conversation-view"]',
    '.agy-sheet[data-sheet-inset] [data-main-content-body]',
    '[data-main-content-body]',
    'div.bg-background:not(.agy-shell):not(.sticky):not([style*="sticky"]):not(.agy-dialog):not(.settings-modal-container):has([data-testid="customizations-search"], [data-testid="customizations-marketplace"], [data-testid="customizations-installed"])',
    '.monaco-workbench .part.editor > .content',
    '.monaco-workbench .part.panel',
  ];

  // Re-entrancy: silently tear down any active or leftover picker session first.
  var prev = W[API_KEY];
  if (prev && typeof prev === 'object') {
    try {
      if (typeof prev.cancel === 'function') prev.cancel({ silent: true, reason: 'restarted' });
      else if (typeof prev.destroy === 'function') prev.destroy({ silent: true, reason: 'restarted' });
    } catch (_) {}
  }

  function removeOrphanDom() {
    [OVERLAY_ID, HUD_ID, STYLE_ID].forEach(function (id) {
      try {
        var el = doc.getElementById(id);
        if (el && el.parentNode) el.parentNode.removeChild(el);
      } catch (_) {}
    });
    try {
      if (doc.documentElement) doc.documentElement.removeAttribute(HTML_ATTR);
    } catch (_) {}
  }
  removeOrphanDom();

  // Resolve boot configuration and RPC transport (Guardrail V2: prefer boot.rpcUrl first).
  var boot =
    W.__AGY_PRISM_INSPECTOR_BOOT__ && typeof W.__AGY_PRISM_INSPECTOR_BOOT__ === 'object'
      ? W.__AGY_PRISM_INSPECTOR_BOOT__
      : {};
  var skinApi = W[SKIN_KEY] && typeof W[SKIN_KEY] === 'object' ? W[SKIN_KEY] : null;
  var capToken = String(boot.capToken || W.__agyPrismCapToken || (skinApi && skinApi.capToken) || '').trim();
  var hostOrigin = String(
    boot.hostOrigin || (skinApi && (skinApi.hostOrigin || skinApi.origin)) || ''
  )
    .trim()
    .replace(/\/+$/, '');
  var hostBase = String(W.__agyPrismHostBase || '')
    .trim()
    .replace(/\/+$/, '');

  var resolvedRpcUrl = '';
  if (typeof boot.rpcUrl === 'string' && boot.rpcUrl.trim()) {
    resolvedRpcUrl = boot.rpcUrl.trim();
  } else if (hostOrigin && capToken) {
    resolvedRpcUrl = hostOrigin + '/host/' + capToken + '/rpc';
  } else if (skinApi && typeof skinApi.rpcUrl === 'string' && skinApi.rpcUrl.trim()) {
    resolvedRpcUrl = skinApi.rpcUrl.trim();
  } else if (typeof W.__agyPrismRpcUrl === 'string' && W.__agyPrismRpcUrl.trim()) {
    resolvedRpcUrl = W.__agyPrismRpcUrl.trim();
  } else if (hostBase) {
    resolvedRpcUrl = hostBase + '/rpc';
  }

  var sessionId = String(boot.sessionId || '').trim();
  var timeoutMs = Math.max(5000, Math.min(120000, Number(boot.timeoutMs) || 45000));

  var rawLocale = String(boot.lang || boot.locale || '').trim().toLowerCase();
  if (!rawLocale || rawLocale === 'auto') {
    rawLocale = String(
      (doc.documentElement && doc.documentElement.lang) || (W.navigator && W.navigator.language) || 'en'
    ).toLowerCase();
  }
  var isZh = rawLocale.indexOf('zh') === 0;

  var active = false;
  var destroyed = false;
  var mounted = false;
  var rpcSeq = 0;
  var rafId = 0;
  var timeoutTimer = 0;
  var pendingCoords = null;
  var hoveredRegion = null;
  var endedByRightClickUntil = 0;
  var overlayEl = null;
  var hudEl = null;
  var styleEl = null;
  var cleanups = [];

  function sendRpc(method, params) {
    var payloadParams = params && typeof params === 'object' ? params : {};
    if (sessionId && !payloadParams.sessionId) {
      payloadParams.sessionId = sessionId;
    }
    if (resolvedRpcUrl && typeof W.fetch === 'function') {
      rpcSeq += 1;
      var headers = { 'Content-Type': 'application/json' };
      if (capToken) headers['X-Prism-Token'] = capToken;
      var body = JSON.stringify({
        id: 'ins-' + rpcSeq + '-' + Date.now().toString(36),
        method: method,
        params: payloadParams,
      });
      try {
        return W.fetch(resolvedRpcUrl, {
          method: 'POST',
          headers: headers,
          body: body,
        })
          .then(function (res) {
            return res && typeof res.json === 'function' ? res.json() : null;
          })
          .catch(function () {
            return null;
          });
      } catch (_) {
        return Promise.resolve(null);
      }
    }
    if (typeof W[BINDING_KEY] === 'function') {
      try {
        return Promise.resolve(W[BINDING_KEY](method, payloadParams)).catch(function () {
          return null;
        });
      } catch (_) {
        return Promise.resolve(null);
      }
    }
    return Promise.resolve(null);
  }

  // ---------------------------------------------------------------------------
  // Geometry & Visibility Helpers (Zero text selectors)
  // ---------------------------------------------------------------------------
  function getViewport() {
    var rawW = Number(W.innerWidth) || (doc.documentElement && Number(doc.documentElement.clientWidth)) || 0;
    var rawH = Number(W.innerHeight) || (doc.documentElement && Number(doc.documentElement.clientHeight)) || 0;
    return {
      hasDims: rawW > 0 && rawH > 0,
      vw: Math.max(1, rawW),
      vh: Math.max(1, rawH),
    };
  }

  function isInspectorNode(el) {
    if (!el || el.nodeType !== 1) return false;
    var id = el.id || '';
    if (id === OVERLAY_ID || id === HUD_ID || id === STYLE_ID || id === 'agy-prism-inspector-loader') {
      return true;
    }
    if (typeof el.closest === 'function') {
      try {
        if (el.closest('#' + OVERLAY_ID + ', #' + HUD_ID)) return true;
      } catch (_) {}
    }
    return false;
  }

  function safeClosest(el, sel) {
    if (!el || typeof el.closest !== 'function') return null;
    try {
      return el.closest(sel);
    } catch (_) {
      return null;
    }
  }

  function safeMatches(el, sel) {
    if (!el || typeof el.matches !== 'function') return false;
    try {
      return el.matches(sel);
    } catch (_) {
      return false;
    }
  }

  function safeQueryAll(sel) {
    if (!doc || typeof doc.querySelectorAll !== 'function') return [];
    try {
      return doc.querySelectorAll(sel);
    } catch (_) {
      return [];
    }
  }

  function makeRect(left, top, width, height) {
    var l = Number(left) || 0;
    var t = Number(top) || 0;
    var w = Math.max(0, Number(width) || 0);
    var h = Math.max(0, Number(height) || 0);
    return {
      left: l,
      top: t,
      width: w,
      height: h,
      right: l + w,
      bottom: t + h,
    };
  }

  function getVisibleRect(el, vp) {
    if (!el || el.nodeType !== 1 || isInspectorNode(el)) return null;
    if (typeof el.getBoundingClientRect !== 'function') return null;
    if (typeof W.getComputedStyle === 'function') {
      try {
        var cs = W.getComputedStyle(el);
        if (cs) {
          if (cs.display === 'none' || cs.visibility === 'hidden') return null;
          var op = parseFloat(cs.opacity);
          if (Number.isFinite(op) && op <= 0.01) return null;
        }
      } catch (_) {}
    }
    var r;
    try {
      r = el.getBoundingClientRect();
    } catch (_) {
      return null;
    }
    if (!r) return null;
    var w = Number(r.width);
    var h = Number(r.height);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w < 2 || h < 2) return null;
    var left = Number(r.left) || 0;
    var top = Number(r.top) || 0;
    var right = Number.isFinite(Number(r.right)) ? Number(r.right) : left + w;
    var bottom = Number.isFinite(Number(r.bottom)) ? Number(r.bottom) : top + h;
    if (right <= 0 || bottom <= 0) return null;
    if (vp && vp.hasDims && (left >= vp.vw || top >= vp.vh)) return null;
    return { left: left, top: top, width: w, height: h, right: right, bottom: bottom };
  }

  function pointInRect(x, y, r) {
    return Boolean(r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom);
  }

  function describeEl(el) {
    if (!el || el.nodeType !== 1) return '';
    if (el.id) return '#' + String(el.id).slice(0, 80);
    var tid = el.getAttribute && el.getAttribute('data-testid');
    if (tid) return '[data-testid="' + String(tid).slice(0, 64) + '"]';
    var tag = el.tagName ? String(el.tagName).toLowerCase() : 'div';
    var cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2) : [];
    return cls.length ? tag + '.' + cls.join('.').slice(0, 80) : tag;
  }

  function findFirstVisibleMatchAt(selectors, x, y, vp, filterFn) {
    for (var i = 0; i < selectors.length; i += 1) {
      var list = safeQueryAll(selectors[i]);
      for (var j = 0; j < list.length; j += 1) {
        var el = list[j];
        if (filterFn && !filterFn(el)) continue;
        var rect = getVisibleRect(el, vp);
        if (rect && pointInRect(x, y, rect)) {
          return { el: el, rect: rect, selectorIndex: i };
        }
      }
    }
    return null;
  }

  function findSmallestVisibleMatchAt(selectors, x, y, vp, filterFn) {
    var best = null;
    var bestArea = Infinity;
    for (var i = 0; i < selectors.length; i += 1) {
      var list = safeQueryAll(selectors[i]);
      for (var j = 0; j < list.length; j += 1) {
        var el = list[j];
        if (filterFn && !filterFn(el)) continue;
        var rect = getVisibleRect(el, vp);
        if (!rect || !pointInRect(x, y, rect)) continue;
        var area = rect.width * rect.height;
        if (area < bestArea) {
          bestArea = area;
          best = { el: el, rect: rect, selectorIndex: i };
        }
      }
    }
    return best;
  }

  function getTopbarAnchorRect(vp) {
    var barSelectors = [
      '[data-testid="title-menu-bar"]',
      '.monaco-workbench .part.titlebar > .titlebar-container',
      '.monaco-workbench .part.titlebar',
      '.agy-shell > header',
      '.agy-shell > [role="menubar"]',
    ];
    for (var i = 0; i < barSelectors.length; i += 1) {
      var list = safeQueryAll(barSelectors[i]);
      for (var j = 0; j < list.length; j += 1) {
        var r = getVisibleRect(list[j], vp);
        if (r) return { el: list[j], rect: r, matchedBy: 'topbar:dom' };
      }
    }
    var shellChildren = safeQueryAll('.agy-shell > div:first-child, #root > div:first-child');
    for (var k = 0; k < shellChildren.length; k += 1) {
      var fc = shellChildren[k];
      var fr = getVisibleRect(fc, vp);
      if (fr && fr.top <= 12 && fr.height >= 24 && fr.height <= 56 && (!vp.hasDims || fr.width >= vp.vw * 0.6)) {
        return { el: fc, rect: fr, matchedBy: 'topbar:geometry' };
      }
    }
    return null;
  }

  function getWcoRect(vp) {
    var pill = doc.getElementById('agy-prism-wco-pill');
    var pillRect = getVisibleRect(pill, vp);
    if (pillRect) {
      return { rect: pillRect, matchedBy: 'wco:pill', selector: '#agy-prism-wco-pill' };
    }
    var wco = W.navigator && W.navigator.windowControlsOverlay;
    if (wco && wco.visible === true && typeof wco.getTitlebarAreaRect === 'function') {
      try {
        var r = wco.getTitlebarAreaRect();
        if (r && vp.hasDims) {
          var rectRight = Number.isFinite(Number(r.right))
            ? Number(r.right)
            : (Number(r.x) || 0) + (Number(r.width) || 0);
          var wcoW = Math.round(vp.vw - rectRight);
          if (Number.isFinite(wcoW) && wcoW >= 40) {
            var wcoH = Math.max(28, Math.round(Number(r.height) || 35));
            return {
              rect: makeRect(Math.round(rectRight), 0, wcoW, wcoH),
              matchedBy: 'wco:navigator-overlay',
              selector: 'navigator.windowControlsOverlay',
            };
          }
        }
      } catch (_) {}
    }
    var ctrls = safeQueryAll('.window-controls-container');
    for (var i = 0; i < ctrls.length; i += 1) {
      var cr = getVisibleRect(ctrls[i], vp);
      if (cr) {
        return { rect: cr, matchedBy: 'wco:controls-container', selector: '.window-controls-container' };
      }
    }
    if (doc.documentElement && typeof W.getComputedStyle === 'function' && vp.hasDims) {
      try {
        var insetRaw = W.getComputedStyle(doc.documentElement).getPropertyValue('--prism-wco-inset-right');
        var insetPx = parseFloat(insetRaw);
        if (Number.isFinite(insetPx) && insetPx >= 40) {
          var tb = getTopbarAnchorRect(vp);
          var tbBottom = tb ? Math.max(28, Math.round(tb.rect.bottom)) : 38;
          return {
            rect: makeRect(Math.round(vp.vw - insetPx), 0, Math.round(insetPx), tbBottom),
            matchedBy: 'wco:css-inset',
            selector: '--prism-wco-inset-right',
          };
        }
      } catch (_) {}
    }
    return null;
  }

  function isControlMatchAllowed(el) {
    if (safeMatches(el, '.agy-shell, #root, body, html')) return false;
    if (safeClosest(el, POPOVER_SELECTOR_STR)) return false;
    if (safeClosest(el, '[data-testid="title-menu-bar"], .monaco-workbench .part.titlebar')) return false;
    return true;
  }

  function isContentMatchAllowed(el) {
    if (safeMatches(el, '.agy-shell, #root, body, html')) return false;
    if (safeClosest(el, COMPOSER_ANCESTOR_STR)) return false;
    if (safeClosest(el, POPOVER_SELECTOR_STR)) return false;
    return true;
  }

  // Pure read-only geometric hit-testing across all 12 regions:
  // popover > wco > topbar > controls > composer > codeBlock > userBubble > assistantBubble > card > sidebar > rightPane > workspace
  function hitTestAt(x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    var vp = getViewport();

    // 1. popover
    if (typeof doc.elementsFromPoint === 'function') {
      try {
        var stack = doc.elementsFromPoint(x, y) || [];
        for (var si = 0; si < stack.length; si += 1) {
          var node = stack[si];
          if (isInspectorNode(node)) continue;
          var popEl = safeMatches(node, POPOVER_SELECTOR_STR) ? node : safeClosest(node, POPOVER_SELECTOR_STR);
          if (popEl && !isInspectorNode(popEl)) {
            var popRect = getVisibleRect(popEl, vp);
            if (popRect && pointInRect(x, y, popRect)) {
              return { regionId: 'popover', rect: popRect, matchedBy: 'popover:point', selector: describeEl(popEl) };
            }
          }
        }
      } catch (_) {}
    }
    var popAll = safeQueryAll(POPOVER_SELECTOR_STR);
    for (var pi = popAll.length - 1; pi >= 0; pi -= 1) {
      var pEl = popAll[pi];
      var pRect = getVisibleRect(pEl, vp);
      if (pRect && pointInRect(x, y, pRect)) {
        return { regionId: 'popover', rect: pRect, matchedBy: 'popover:dom', selector: describeEl(pEl) };
      }
    }

    // 2. wco
    var wcoHit = getWcoRect(vp);
    if (wcoHit && pointInRect(x, y, wcoHit.rect)) {
      return {
        regionId: 'wco',
        rect: wcoHit.rect,
        matchedBy: wcoHit.matchedBy,
        selector: wcoHit.selector,
      };
    }

    // 3. topbar
    var pillNodes = safeQueryAll('#agy-prism-topbar-pills .agy-prism-topbar-pill');
    for (var ti = 0; ti < pillNodes.length; ti += 1) {
      var pillRect = getVisibleRect(pillNodes[ti], vp);
      if (pillRect && pointInRect(x, y, pillRect)) {
        return {
          regionId: 'topbar',
          rect: pillRect,
          matchedBy: 'topbar:pill',
          selector: '.agy-prism-topbar-pill',
        };
      }
    }
    var tbAnchor = getTopbarAnchorRect(vp);
    if (tbAnchor) {
      var tbRect = tbAnchor.rect;
      if (wcoHit && wcoHit.rect && wcoHit.rect.left > tbRect.left && wcoHit.rect.left < tbRect.right) {
        tbRect = makeRect(tbRect.left, tbRect.top, Math.max(0, wcoHit.rect.left - tbRect.left), tbRect.height);
      }
      if (pointInRect(x, y, tbRect)) {
        return {
          regionId: 'topbar',
          rect: tbRect,
          matchedBy: tbAnchor.matchedBy,
          selector: describeEl(tbAnchor.el),
        };
      }
    }

    // 4. controls (outside popover & topbar)
    var ctrlMatch = findSmallestVisibleMatchAt(CONTROL_SELECTORS, x, y, vp, isControlMatchAllowed);
    if (ctrlMatch) {
      return {
        regionId: 'controls',
        rect: ctrlMatch.rect,
        matchedBy: 'controls:dom',
        selector: describeEl(ctrlMatch.el),
      };
    }

    // 5. composer
    var compMatch = findFirstVisibleMatchAt(COMPOSER_SELECTORS, x, y, vp);
    if (compMatch) {
      var compEl = compMatch.el;
      var compRect = compMatch.rect;
      // Canonical highlight prefers #antigravity.agentSidePanelInputBox if visible inside outer wrapper.
      if (compEl.id !== 'antigravity.agentSidePanelInputBox' && typeof compEl.querySelector === 'function') {
        try {
          var innerBox = compEl.querySelector('#antigravity\\.agentSidePanelInputBox');
          var innerRect = getVisibleRect(innerBox, vp);
          if (innerRect && pointInRect(x, y, innerRect)) {
            compEl = innerBox;
            compRect = innerRect;
          }
        } catch (_) {}
      }
      return {
        regionId: 'composer',
        rect: compRect,
        matchedBy: 'composer:dom',
        selector: describeEl(compEl),
      };
    }

    // 6. codeBlock (outside composer & popover)
    var codeMatch = findSmallestVisibleMatchAt(CODE_BLOCK_SELECTORS, x, y, vp, isContentMatchAllowed);
    if (codeMatch) {
      return {
        regionId: 'codeBlock',
        rect: codeMatch.rect,
        matchedBy: 'codeBlock:dom',
        selector: describeEl(codeMatch.el),
      };
    }

    // 7. userBubble (outside composer & popover)
    var userMatch = findSmallestVisibleMatchAt(USER_BUBBLE_SELECTORS, x, y, vp, isContentMatchAllowed);
    if (userMatch) {
      return {
        regionId: 'userBubble',
        rect: userMatch.rect,
        matchedBy: 'userBubble:dom',
        selector: describeEl(userMatch.el),
      };
    }

    // 8. assistantBubble (outside composer & popover)
    var asstMatch = findSmallestVisibleMatchAt(ASSISTANT_BUBBLE_SELECTORS, x, y, vp, isContentMatchAllowed);
    if (asstMatch) {
      return {
        regionId: 'assistantBubble',
        rect: asstMatch.rect,
        matchedBy: 'assistantBubble:dom',
        selector: describeEl(asstMatch.el),
      };
    }

    // 9. card (outside composer, popover, and userBubble)
    var cardMatch = findSmallestVisibleMatchAt(CARD_SELECTORS, x, y, vp, function (el) {
      return isContentMatchAllowed(el) && !safeClosest(el, USER_BUBBLE_SELECTOR_STR);
    });
    if (cardMatch) {
      return {
        regionId: 'card',
        rect: cardMatch.rect,
        matchedBy: 'card:dom',
        selector: describeEl(cardMatch.el),
      };
    }

    // 10. sidebar
    var sbMatch = findFirstVisibleMatchAt(SIDEBAR_SELECTORS, x, y, vp);
    if (sbMatch) {
      var sbEl = sbMatch.el;
      var sbRect = sbMatch.rect;
      if (sbEl.getAttribute && sbEl.getAttribute('data-testid') === 'conversation-list-sidebar') {
        var splitFirst = safeClosest(sbEl, '[data-testid="sidebar-split"] > :first-child');
        var splitRect = getVisibleRect(splitFirst, vp);
        if (splitRect && pointInRect(x, y, splitRect)) {
          sbEl = splitFirst;
          sbRect = splitRect;
        }
      }
      return {
        regionId: 'sidebar',
        rect: sbRect,
        matchedBy: 'sidebar:dom',
        selector: describeEl(sbEl),
      };
    }

    // 11. rightPane
    var rpMatch = findFirstVisibleMatchAt(RIGHT_PANE_SELECTORS, x, y, vp);
    if (rpMatch) {
      return {
        regionId: 'rightPane',
        rect: rpMatch.rect,
        matchedBy: 'rightPane:dom',
        selector: describeEl(rpMatch.el),
      };
    }

    // 12. workspace
    var wsMatch = findFirstVisibleMatchAt(WORKSPACE_SELECTORS, x, y, vp);
    if (wsMatch) {
      return {
        regionId: 'workspace',
        rect: wsMatch.rect,
        matchedBy: 'workspace:dom',
        selector: describeEl(wsMatch.el),
      };
    }

    // Last-resort geometry fallback for workspace inside split/shell outside topbar/sidebar/rightPane
    var splitLast = safeQueryAll('[data-testid="sidebar-split"] > :last-child');
    for (var li = 0; li < splitLast.length; li += 1) {
      var sl = splitLast[li];
      if (safeMatches(sl, '.agy-sidebar')) continue;
      var slr = getVisibleRect(sl, vp);
      if (slr && pointInRect(x, y, slr)) {
        return {
          regionId: 'workspace',
          rect: slr,
          matchedBy: 'workspace:split-fallback',
          selector: describeEl(sl),
        };
      }
    }
    var shells = safeQueryAll('.agy-shell');
    for (var shi = 0; shi < shells.length; shi += 1) {
      var shr = getVisibleRect(shells[shi], vp);
      if (shr && pointInRect(x, y, shr)) {
        var topY = tbAnchor ? Math.max(shr.top, tbAnchor.rect.bottom) : shr.top;
        return {
          regionId: 'workspace',
          rect: makeRect(shr.left, topY, shr.width, Math.max(2, shr.bottom - topY)),
          matchedBy: 'workspace:shell-fallback',
          selector: '.agy-shell',
        };
      }
    }
    return null;
  }

  function classifyElementFallback(el) {
    if (!el || el.nodeType !== 1 || isInspectorNode(el)) return null;
    var vp = getViewport();
    var m;
    if ((m = safeClosest(el, POPOVER_SELECTOR_STR))) {
      return { regionId: 'popover', rect: getVisibleRect(m, vp), matchedBy: 'popover:el', selector: describeEl(m) };
    }
    if ((m = safeClosest(el, '#agy-prism-wco-pill, .window-controls-container'))) {
      return { regionId: 'wco', rect: getVisibleRect(m, vp), matchedBy: 'wco:el', selector: describeEl(m) };
    }
    if ((m = safeClosest(el, '.agy-prism-topbar-pill, [data-testid="title-menu-bar"], .monaco-workbench .part.titlebar'))) {
      return { regionId: 'topbar', rect: getVisibleRect(m, vp), matchedBy: 'topbar:el', selector: describeEl(m) };
    }
    if ((m = safeClosest(el, CONTROL_SELECTOR_STR)) && isControlMatchAllowed(m)) {
      return { regionId: 'controls', rect: getVisibleRect(m, vp), matchedBy: 'controls:el', selector: describeEl(m) };
    }
    if ((m = safeClosest(el, COMPOSER_SELECTOR_STR))) {
      return { regionId: 'composer', rect: getVisibleRect(m, vp), matchedBy: 'composer:el', selector: describeEl(m) };
    }
    if ((m = safeClosest(el, CODE_BLOCK_SELECTOR_STR)) && isContentMatchAllowed(m)) {
      return { regionId: 'codeBlock', rect: getVisibleRect(m, vp), matchedBy: 'codeBlock:el', selector: describeEl(m) };
    }
    if ((m = safeClosest(el, USER_BUBBLE_SELECTOR_STR)) && isContentMatchAllowed(m)) {
      return { regionId: 'userBubble', rect: getVisibleRect(m, vp), matchedBy: 'userBubble:el', selector: describeEl(m) };
    }
    if ((m = safeClosest(el, ASSISTANT_BUBBLE_SELECTOR_STR)) && isContentMatchAllowed(m)) {
      return { regionId: 'assistantBubble', rect: getVisibleRect(m, vp), matchedBy: 'assistantBubble:el', selector: describeEl(m) };
    }
    if ((m = safeClosest(el, CARD_SELECTOR_STR)) && isContentMatchAllowed(m) && !safeClosest(m, USER_BUBBLE_SELECTOR_STR)) {
      return { regionId: 'card', rect: getVisibleRect(m, vp), matchedBy: 'card:el', selector: describeEl(m) };
    }
    if ((m = safeClosest(el, SIDEBAR_SELECTOR_STR))) {
      return { regionId: 'sidebar', rect: getVisibleRect(m, vp), matchedBy: 'sidebar:el', selector: describeEl(m) };
    }
    if ((m = safeClosest(el, RIGHT_PANE_SELECTOR_STR))) {
      return { regionId: 'rightPane', rect: getVisibleRect(m, vp), matchedBy: 'rightPane:el', selector: describeEl(m) };
    }
    if ((m = safeClosest(el, WORKSPACE_SELECTORS.slice(0, 5).join(', ')))) {
      return { regionId: 'workspace', rect: getVisibleRect(m, vp), matchedBy: 'workspace:el', selector: describeEl(m) };
    }
    return null;
  }

  function hitTestEvent(ev) {
    if (!ev) return null;
    var cx = Number(ev.clientX);
    var cy = Number(ev.clientY);
    if (Number.isFinite(cx) && Number.isFinite(cy) && (cx !== 0 || cy !== 0)) {
      var hit = hitTestAt(cx, cy);
      if (hit) return hit;
    }
    var target = ev.target;
    if (target && target.nodeType === 1 && !isInspectorNode(target)) {
      if (typeof target.getBoundingClientRect === 'function') {
        try {
          var tr = target.getBoundingClientRect();
          if (tr && tr.width >= 2 && tr.height >= 2) {
            var mx = (Number(tr.left) || 0) + Number(tr.width) * 0.5;
            var my = (Number(tr.top) || 0) + Number(tr.height) * 0.5;
            var centerHit = hitTestAt(mx, my);
            if (centerHit) return centerHit;
          }
        } catch (_) {}
      }
      var elHit = classifyElementFallback(target);
      if (elHit) return elHit;
    }
    if (Number.isFinite(cx) && Number.isFinite(cy)) {
      return hitTestAt(cx, cy);
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Overlay, Bilingual HUD & DOM-Connected Safety Guardrail V2
  // ---------------------------------------------------------------------------
  function isOverlayConnected() {
    if (!overlayEl || !doc) return false;
    var inDoc = typeof doc.contains === 'function' ? doc.contains(overlayEl) : Boolean(overlayEl.parentNode);
    if (!inDoc) return false;
    if (typeof doc.getElementById === 'function' && doc.getElementById(OVERLAY_ID) !== overlayEl) {
      return false;
    }
    return true;
  }

  function formatHudText(regionId) {
    if (!regionId || !REGION_LABELS[regionId]) {
      return isZh
        ? 'Prism 区域拾取 · 悬停并左键点击选中 · Esc / 右键取消'
        : 'Prism Region Picker · Hover & click to pick · Esc / Right-click';
    }
    var lbl = REGION_LABELS[regionId];
    return isZh
      ? lbl.zh + ' (' + regionId + ') · 左键选中 · Esc / 右键取消'
      : lbl.en + ' (' + regionId + ') · Click to pick · Esc / Right-click';
  }

  function renderHighlight(hit) {
    if (!overlayEl || !hudEl || !isOverlayConnected()) return;
    if (!hit || !hit.rect) {
      hoveredRegion = null;
      overlayEl.style.opacity = '0';
      overlayEl.style.width = '0px';
      overlayEl.style.height = '0px';
      overlayEl.removeAttribute('data-region');
      hudEl.textContent = formatHudText(null);
      hudEl.style.top = '44px';
      hudEl.style.bottom = 'auto';
      return;
    }
    hoveredRegion = hit.regionId;
    var r = hit.rect;
    overlayEl.style.left = Math.round(r.left) + 'px';
    overlayEl.style.top = Math.round(r.top) + 'px';
    overlayEl.style.width = Math.max(2, Math.round(r.width)) + 'px';
    overlayEl.style.height = Math.max(2, Math.round(r.height)) + 'px';
    overlayEl.style.opacity = '1';
    overlayEl.setAttribute('data-region', hit.regionId);
    hudEl.textContent = formatHudText(hit.regionId);
    if (r.top < 84 && r.bottom > 40) {
      hudEl.style.top = 'auto';
      hudEl.style.bottom = '18px';
    } else {
      hudEl.style.top = '44px';
      hudEl.style.bottom = 'auto';
    }
  }

  function teardownLocal() {
    if (destroyed && !mounted && !cleanups.length) return;
    active = false;
    destroyed = true;
    mounted = false;
    hoveredRegion = null;
    pendingCoords = null;
    if (rafId) {
      try {
        if (typeof W.cancelAnimationFrame === 'function') W.cancelAnimationFrame(rafId);
        else clearTimeout(rafId);
      } catch (_) {}
      rafId = 0;
    }
    if (timeoutTimer) {
      clearTimeout(timeoutTimer);
      timeoutTimer = 0;
    }
    for (var i = 0; i < cleanups.length; i += 1) {
      try {
        cleanups[i]();
      } catch (_) {}
    }
    cleanups = [];
    if (overlayEl && overlayEl.parentNode) {
      try { overlayEl.parentNode.removeChild(overlayEl); } catch (_) {}
    }
    if (hudEl && hudEl.parentNode) {
      try { hudEl.parentNode.removeChild(hudEl); } catch (_) {}
    }
    if (styleEl && styleEl.parentNode) {
      try { styleEl.parentNode.removeChild(styleEl); } catch (_) {}
    }
    overlayEl = null;
    hudEl = null;
    styleEl = null;
    removeOrphanDom();
    if (W[API_KEY] === api) {
      try {
        delete W[API_KEY];
      } catch (_) {
        W[API_KEY] = undefined;
      }
    }
  }

  // Guardrail V2: if overlay was externally stripped (e.g. panic strip), self-teardown immediately
  // without swallowing user events!
  function ensureConnectedOrTeardown() {
    if (destroyed || !active) {
      teardownLocal();
      return false;
    }
    if (!isOverlayConnected()) {
      teardownLocal();
      return false;
    }
    return true;
  }

  function stopEvent(e) {
    if (!e) return;
    try { if (typeof e.preventDefault === 'function') e.preventDefault(); } catch (_) {}
    try { if (typeof e.stopPropagation === 'function') e.stopPropagation(); } catch (_) {}
    try { if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation(); } catch (_) {}
  }

  function flushHoverFrame() {
    rafId = 0;
    if (!ensureConnectedOrTeardown() || !pendingCoords) return;
    var coords = pendingCoords;
    pendingCoords = null;
    var hit = hitTestAt(coords.x, coords.y);
    renderHighlight(hit);
  }

  function scheduleHoverAt(x, y) {
    pendingCoords = { x: x, y: y };
    if (rafId) return;
    if (typeof W.requestAnimationFrame === 'function') {
      rafId = W.requestAnimationFrame(flushHoverFrame);
    } else {
      rafId = setTimeout(flushHoverFrame, 16);
    }
  }

  function listenCapture(type, handler, passive) {
    var opts = { capture: true, passive: Boolean(passive) };
    W.addEventListener(type, handler, opts);
    cleanups.push(function () {
      W.removeEventListener(type, handler, opts);
    });
  }

  function onPointerMove(e) {
    if (!ensureConnectedOrTeardown()) return;
    var cx = Number(e && e.clientX);
    var cy = Number(e && e.clientY);
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return;
    scheduleHoverAt(cx, cy);
  }

  function onPointerDown(e) {
    if (!ensureConnectedOrTeardown()) return;
    stopEvent(e);
    if (e && e.button === 2) {
      endedByRightClickUntil = Date.now() + 350;
      cancel({ reason: 'contextmenu' });
    }
  }

  function onPointerUp(e) {
    if (!ensureConnectedOrTeardown()) return;
    stopEvent(e);
  }

  function onClick(e) {
    if (!ensureConnectedOrTeardown()) return;
    stopEvent(e);
    if (e && e.button === 2) {
      endedByRightClickUntil = Date.now() + 350;
      cancel({ reason: 'contextmenu' });
      return;
    }
    if (e && typeof e.button === 'number' && e.button !== 0) return;
    var hit = hitTestEvent(e);
    teardownLocal();
    if (hit && hit.regionId && REGION_SET[hit.regionId]) {
      sendRpc('inspector.picked', {
        regionId: hit.regionId,
        matchedBy: hit.matchedBy || '',
        selector: hit.selector || '',
      });
    } else {
      sendRpc('inspector.cancelled', { reason: 'unknown' });
    }
  }

  function onContextMenu(e) {
    if (!ensureConnectedOrTeardown()) return;
    stopEvent(e);
    cancel({ reason: 'contextmenu' });
  }

  function onKeyDown(e) {
    if (!ensureConnectedOrTeardown()) return;
    if (e && e.key === 'Escape') {
      stopEvent(e);
      cancel({ reason: 'escape' });
    }
  }

  // One-shot capture contextmenu guard attached to window so right-click mouseup/contextmenu
  // triggered in the same gesture as right-button pointerdown/mousedown never leaks a menu.
  function installContextMenuSwallowGuard() {
    var onLateCtx = function (e) {
      if (endedByRightClickUntil > Date.now()) {
        endedByRightClickUntil = 0;
        stopEvent(e);
      }
      W.removeEventListener('contextmenu', onLateCtx, true);
    };
    W.addEventListener('contextmenu', onLateCtx, true);
    setTimeout(function () {
      try { W.removeEventListener('contextmenu', onLateCtx, true); } catch (_) {}
    }, 450);
  }

  function mount() {
    if (destroyed || mounted || !doc.body) return;

    styleEl = doc.createElement('style');
    styleEl.id = STYLE_ID;
    styleEl.textContent = [
      'html[' + HTML_ATTR + '="picking"], html[' + HTML_ATTR + '="picking"] * { cursor: crosshair !important; }',
      '#' + OVERLAY_ID + '.' + OVERLAY_ID + ' {',
      '  all: initial;',
      '  position: fixed !important;',
      '  left: 0px;',
      '  top: 0px;',
      '  width: 0px;',
      '  height: 0px;',
      '  opacity: 0;',
      '  pointer-events: none !important;',
      '  z-index: 2147483640 !important;',
      '  box-sizing: border-box !important;',
      '  border: 2px solid #669DF6 !important;',
      '  background: rgba(102, 157, 246, 0.14) !important;',
      '  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.28), inset 0 0 0 1px rgba(102, 157, 246, 0.36) !important;',
      '  border-radius: 6px !important;',
      '  transition: left 60ms ease, top 60ms ease, width 60ms ease, height 60ms ease, opacity 80ms ease !important;',
      '}',
      '#' + HUD_ID + '.' + HUD_ID + ' {',
      '  all: initial;',
      '  position: fixed !important;',
      '  left: 50% !important;',
      '  top: 44px !important;',
      '  transform: translateX(-50%) !important;',
      '  pointer-events: none !important;',
      '  z-index: 2147483641 !important;',
      '  box-sizing: border-box !important;',
      '  max-width: calc(100vw - 24px) !important;',
      '  padding: 6px 13px !important;',
      '  border-radius: 999px !important;',
      '  border: 1px solid rgba(102, 157, 246, 0.55) !important;',
      '  background: rgba(16, 18, 24, 0.92) !important;',
      '  color: #F2F2F5 !important;',
      '  font: 600 12px/1.35 "Segoe UI", system-ui, -apple-system, sans-serif !important;',
      '  white-space: nowrap !important;',
      '  overflow: hidden !important;',
      '  text-overflow: ellipsis !important;',
      '  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45) !important;',
      '}',
      '#' + HUD_ID + '.' + HUD_ID + ' * { pointer-events: none !important; }',
    ].join('\n');
    (doc.head || doc.documentElement).appendChild(styleEl);

    overlayEl = doc.createElement('div');
    overlayEl.id = OVERLAY_ID;
    overlayEl.className = OVERLAY_ID;
    overlayEl.setAttribute('aria-hidden', 'true');
    overlayEl.setAttribute('translate', 'no');
    overlayEl.setAttribute('data-no-translate', 'true');
    overlayEl.setAttribute('data-ag-no-i18n', '1');
    overlayEl.setAttribute('data-agy-prism-layer', '1');
    overlayEl.style.pointerEvents = 'none';
    overlayEl.style.opacity = '0';

    hudEl = doc.createElement('div');
    hudEl.id = HUD_ID;
    hudEl.className = HUD_ID;
    hudEl.setAttribute('aria-hidden', 'true');
    hudEl.setAttribute('translate', 'no');
    hudEl.setAttribute('data-no-translate', 'true');
    hudEl.setAttribute('data-ag-no-i18n', '1');
    hudEl.setAttribute('data-agy-prism-layer', '1');
    hudEl.style.pointerEvents = 'none';
    hudEl.textContent = formatHudText(null);

    doc.body.appendChild(overlayEl);
    doc.body.appendChild(hudEl);
    if (doc.documentElement) {
      doc.documentElement.setAttribute(HTML_ATTR, 'picking');
    }

    mounted = true;
    active = true;

    listenCapture('pointermove', onPointerMove, true);
    listenCapture('mousemove', onPointerMove, true);
    listenCapture('pointerdown', onPointerDown, false);
    listenCapture('mousedown', onPointerDown, false);
    listenCapture('pointerup', onPointerUp, false);
    listenCapture('mouseup', onPointerUp, false);
    listenCapture('click', onClick, false);
    listenCapture('contextmenu', onContextMenu, false);
    listenCapture('keydown', onKeyDown, false);

    timeoutTimer = setTimeout(function () {
      if (!destroyed && active) {
        cancel({ reason: 'timeout' });
      }
    }, timeoutMs);
  }

  function isActive() {
    if (destroyed || !active || !mounted) return false;
    if (!isOverlayConnected()) {
      teardownLocal();
      return false;
    }
    return true;
  }

  function cancel(optsOrReason) {
    var opts =
      typeof optsOrReason === 'string'
        ? { reason: optsOrReason }
        : optsOrReason && typeof optsOrReason === 'object'
          ? optsOrReason
          : {};
    var reason = String(opts.reason || 'unknown').trim() || 'unknown';
    var silent =
      Boolean(opts.silent) ||
      (typeof optsOrReason === 'string' &&
        (reason === 'removed' || reason === 'teardown' || reason === 'restarted' || reason === 'panic-strip'));
    var wasActive = !destroyed && active;
    if (reason === 'contextmenu' && endedByRightClickUntil > Date.now()) {
      installContextMenuSwallowGuard();
    }
    teardownLocal();
    if (wasActive && !silent) {
      sendRpc('inspector.cancelled', { reason: reason });
    }
    return status();
  }

  function destroy(opts) {
    return cancel(opts === undefined ? { silent: true, reason: 'teardown' } : opts);
  }

  function pick(regionIdOrOpts) {
    var rid = '';
    var matchedBy = 'api';
    var selector = '';
    if (typeof regionIdOrOpts === 'string') {
      rid = regionIdOrOpts.trim();
    } else if (regionIdOrOpts && typeof regionIdOrOpts === 'object') {
      rid = String(regionIdOrOpts.regionId || '').trim();
      if (regionIdOrOpts.matchedBy) matchedBy = String(regionIdOrOpts.matchedBy);
      if (regionIdOrOpts.selector) selector = String(regionIdOrOpts.selector);
    }
    if (!rid || !REGION_SET[rid]) {
      return { ok: false, error: 'Invalid regionId: ' + String(rid || '') };
    }
    if (destroyed || !isActive()) {
      return { ok: false, error: 'Inspector is not active' };
    }
    teardownLocal();
    sendRpc('inspector.picked', {
      regionId: rid,
      matchedBy: matchedBy,
      selector: selector,
    });
    return { ok: true, regionId: rid };
  }

  function status() {
    return {
      installed: !destroyed,
      active: isActive(),
      version: VERSION,
      hoveredRegion: hoveredRegion,
      sessionId: sessionId,
    };
  }

  var api = {
    version: VERSION,
    active: isActive,
    alive: isActive,
    cancel: cancel,
    destroy: destroy,
    pick: pick,
    hitTestAt: hitTestAt,
    status: status,
  };

  W[API_KEY] = api;

  if (doc.body) {
    mount();
  } else if (typeof doc.addEventListener === 'function') {
    doc.addEventListener('DOMContentLoaded', mount, { once: true });
  }

  return status();
})();
