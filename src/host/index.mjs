// Host injection script loader & client skin payload builder for agy-wallpaper-prism v2.3.0.
// Consumed by `sidecars/prism_studio/main.mjs`, `cdp-bridge.mjs`, and `test/verify-all.mjs`.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BORDER_STYLES,
  DEFAULT_CONFIG,
  DEFAULT_REGION_ENTRY,
  DEFAULT_SIDEBAR_REGION_ENTRY,
  PRISM_DOM,
  REGION_FONT_SIZE_BOUNDS,
  REGION_IDS,
  REGION_OPTICAL_KEYS,
  SIDEBAR_LIST_STYLES,
  SURFACE_TINT_BOUNDS,
  enforceFgContrastRgb,
  nullableNum,
  resolveEffectiveConfig,
  resolveRegionFgColor,
  resolveSchemeTokens,
  sanitizeConfig,
  sanitizeFontFamily,
} from '../shared/schema.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKIN_SCRIPT_PATH = join(__dirname, 'wallpaper-inject.js');
const PANEL_SCRIPT_PATH = join(__dirname, 'panel-inject.js');
const INSPECTOR_SCRIPT_PATH = join(__dirname, 'inspector-inject.js');

let cachedSkinScript = null;
let cachedPanelScript = null;
let cachedInspectorScript = null;

/** Return the raw ES2020 IIFE source of `wallpaper-inject.js` (`window.__agyPrism`). */
export function getHostSkinScript({ reload = false } = {}) {
  if (!cachedSkinScript || reload) {
    cachedSkinScript = readFileSync(SKIN_SCRIPT_PATH, 'utf8');
  }
  return cachedSkinScript;
}

/** Return the raw ES2020 IIFE source of `panel-inject.js` (`window.__agyPrismPanel`). */
export function getHostPanelScript({ reload = false } = {}) {
  if (!cachedPanelScript || reload) {
    cachedPanelScript = readFileSync(PANEL_SCRIPT_PATH, 'utf8');
  }
  return cachedPanelScript;
}

/** Return the raw ES2020 IIFE source of `inspector-inject.js` (`window.__agyPrismInspector`). */
export function getHostInspectorScript({ reload = false } = {}) {
  if (!cachedInspectorScript || reload) {
    cachedInspectorScript = readFileSync(INSPECTOR_SCRIPT_PATH, 'utf8');
  }
  return cachedInspectorScript;
}

function resolveMediaUrl(rawUrl, mediaOrigin) {
  const u = String(rawUrl || '').trim();
  if (!u) return '';
  if (/^(https?:|plugin:|data:|blob:)/i.test(u)) return u;
  const origin = String(mediaOrigin || '').replace(/\/+$/, '');
  if (!origin) return u;
  return u.startsWith('/') ? `${origin}${u}` : `${origin}/${u}`;
}

function toPluginProxyUrl(httpMediaUrl, mediaOrigin, pluginOrigin) {
  const urlStr = String(httpMediaUrl || '').trim();
  const mOrigin = String(mediaOrigin || '').trim().replace(/\/+$/, '');
  const pOrigin = String(pluginOrigin || '').trim().replace(/\/+$/, '');
  if (!urlStr || !mOrigin || !pOrigin) return '';
  const prefix = `${mOrigin}/`;
  if (!urlStr.startsWith(prefix)) return '';
  const subpath = urlStr.slice(prefix.length);
  if (!subpath) return '';
  return `${pOrigin}/media-proxy/${subpath}`;
}

/**
 * Assemble the canonical JSON-serializable payload consumed by `window.__agyPrism.applyPayload(payload)`.
 */
export function buildClientSkinPayload(config = DEFAULT_CONFIG, activeItem = null, mediaOrigin = '', extra = {}) {
  const baseClean = sanitizeConfig(config || {});
  const wid = String(activeItem?.id || baseClean.activeWallpaperId || baseClean.wallpaperId || '');
  const effective = resolveEffectiveConfig(baseClean, wid);
  const pluginOrigin = String(extra?.pluginOrigin || '').trim().replace(/\/+$/, '');

  // Hydrate cached wallpaper accent for this wallpaperId if available so host skips re-extraction
  const cachedAccent =
    (wid && baseClean.accentCache && baseClean.accentCache[wid]) ||
    (effective.extractedAccent && effective.extractedAccent.wallpaperId === wid ? effective.extractedAccent : null);
  effective.extractedAccent = cachedAccent || null;

  let normalizedItem = null;
  if (activeItem && typeof activeItem === 'object') {
    const kind = String(activeItem.kind || effective.kind || 'image');
    const sceneMode = String(activeItem.sceneMode || '');
    const thumbUrl = resolveMediaUrl(activeItem.thumbUrl, mediaOrigin);
    const sceneVideoUrl = resolveMediaUrl(activeItem.sceneVideoUrl, mediaOrigin);
    const sceneLiveUrl = resolveMediaUrl(activeItem.sceneLiveUrl, mediaOrigin);
    const videoStageUrl = resolveMediaUrl(activeItem.videoStageUrl, mediaOrigin);
    const webUrl = resolveMediaUrl(activeItem.webUrl, mediaOrigin);
    const audioUrl = resolveMediaUrl(activeItem.audioUrl, mediaOrigin);
    const mseFmp4Url = resolveMediaUrl(activeItem.mseFmp4Url, mediaOrigin);
    let mediaUrl = resolveMediaUrl(activeItem.mediaUrl, mediaOrigin);
    if (kind === 'scene' && (sceneMode === 'video' || sceneMode === 'scene-video') && sceneVideoUrl) {
      mediaUrl = sceneVideoUrl;
    }

    const pluginMediaUrl =
      toPluginProxyUrl(mediaUrl, mediaOrigin, pluginOrigin) || String(activeItem.pluginMediaUrl || '').trim();
    const pluginThumbUrl =
      toPluginProxyUrl(thumbUrl, mediaOrigin, pluginOrigin) || String(activeItem.pluginThumbUrl || '').trim();
    const pluginAudioUrl =
      toPluginProxyUrl(audioUrl, mediaOrigin, pluginOrigin) || String(activeItem.pluginAudioUrl || '').trim();
    const pluginVideoStageUrl =
      toPluginProxyUrl(videoStageUrl, mediaOrigin, pluginOrigin) || String(activeItem.pluginVideoStageUrl || '').trim();

    normalizedItem = {
      id: String(activeItem.id || wid),
      title: String(activeItem.title || activeItem.id || ''),
      kind,
      source: String(activeItem.source || 'local'),
      sceneMode,
      schemeColor: String(activeItem.schemeColor || ''),
      thumbUrl,
      mediaUrl,
      videoStageUrl,
      mseFmp4Url,
      pluginMediaUrl,
      pluginThumbUrl,
      pluginAudioUrl,
      pluginVideoStageUrl,
      sceneVideoUrl,
      sceneLiveUrl,
      webUrl,
      audioUrl,
      slidesUrl: resolveMediaUrl(activeItem.slidesUrl, mediaOrigin),
      properties: activeItem.properties || null,
    };
  }

  const slides = Array.isArray(extra?.slides)
    ? extra.slides.map((s) => resolveMediaUrl(s, mediaOrigin))
    : Array.isArray(activeItem?.slides)
      ? activeItem.slides.map((s) => resolveMediaUrl(s, mediaOrigin))
      : undefined;

  const skinEnabled = extra?.skinEnabled !== undefined ? Boolean(extra.skinEnabled) : baseClean.skinEnabled !== false;
  const rawStateRev = Number(extra?.stateRev);
  const stateRevProp = Number.isFinite(rawStateRev) && rawStateRev > 0 ? { stateRev: Math.floor(rawStateRev) } : {};
  const stateEpochProp = extra?.stateEpoch ? { stateEpoch: String(extra.stateEpoch) } : {};

  return {
    version: PRISM_DOM.skinVersion,
    skinEnabled,
    ...stateRevProp,
    ...stateEpochProp,
    config: effective,
    activeItem: normalizedItem,
    mediaOrigin: String(mediaOrigin || ''),
    ...(pluginOrigin ? { pluginOrigin } : {}),
    ...(slides ? { slides } : {}),
    tokensPreview: {
      dark: resolveSchemeTokens(effective, 'dark'),
      light: resolveSchemeTokens(effective, 'light'),
    },
  };
}

function escapeCssUrl(rawUrl) {
  const s = String(rawUrl || '').trim();
  if (!s || /[\r\n<>]/.test(s)) return '';
  return s.replace(/["\\]/g, '\\$&');
}

const WELCOME_LOGO_EXPLICIT_SELECTORS = Object.freeze([
  '[data-testid="welcome-logo"]',
  '[data-testid="empty-state-logo"]',
  '[data-testid="greeting-logo"]',
  '[data-testid="new-conversation-logo"]',
  '[data-testid="antigravity-watermark"]',
  '[data-testid="home-logo"]',
  '.agy-welcome-logo',
  '.agy-empty-state-logo',
]);

const TYPO_PROTECT_EX =
  ':not(pre, pre *, code, code *, .monaco-editor, .monaco-editor *, .xterm, .xterm *, svg, svg *)';

const SIBLING_EXCLUDE =
  ':not(#gemini-neko-pet-root):not(#gemini-neko-observer-modal):not(#gemini-neko-stats-bar):not(#ag-context-meter):not(#ag-usage-monitor-capsule):not(#ag-usage-monitor-portal):not(#deck-metrics-strip):not(#agy-prism-popover):not(#agy-prism-stage):not(#agy-prism-wco-pill):not(#agy-prism-topbar-pills):not(#agy-prism-inspector-overlay):not(#agy-prism-inspector-hud):not(.settings-modal-backdrop):not(.settings-modal-container):not([data-testid="modal-backdrop"]):not([data-testid="media-modal"]):not(.agy-dialog):not([role="dialog"]):not([role="alertdialog"]):not([role="menu"]):not([role="listbox"]):not([role="tooltip"])';

const SIBLING_DESCENDANT_EXCLUDE =
  ':not(#agy-prism-pill):not(#agy-prism-pill *):not(#gemini-neko-pet-root):not(#gemini-neko-pet-root *):not(#gemini-neko-observer-modal):not(#gemini-neko-observer-modal *):not(#gemini-neko-stats-bar):not(#gemini-neko-stats-bar *):not(#ag-context-meter):not(#ag-context-meter *):not(#ag-usage-monitor-capsule):not(#ag-usage-monitor-capsule *):not(#ag-usage-monitor-portal):not(#ag-usage-monitor-portal *):not(#deck-metrics-strip):not(#deck-metrics-strip *):not(#agy-prism-popover):not(#agy-prism-popover *):not(#agy-prism-inspector-overlay):not(#agy-prism-inspector-overlay *):not(#agy-prism-inspector-hud):not(#agy-prism-inspector-hud *)';

const COMPOSER_DESCENDANT_EXCLUDE =
  ':not(#antigravity\\.agentSidePanelInputBox):not(#antigravity\\.agentSidePanelInputBox *):not([data-testid="agent-input-box"]):not([data-testid="agent-input-box"] *):not(.surface-composer-card):not(.surface-composer-card *):not(.agy-composer):not(.agy-composer *)';

const DIALOG_DESCENDANT_EXCLUDE =
  ':not(.settings-modal-backdrop *):not(.settings-modal-container *):not(.agy-dialog *):not([role="dialog"] *):not([role="alertdialog"] *):not([role="menu"] *):not([role="listbox"] *):not([data-radix-popper-content-wrapper] *):not(.agy-popover *):not(.quick-input-widget *)';

const SOLID_POPOVERS = Object.freeze([
  '.agy-dialog',
  '.settings-modal-container',
  '.agy-overlay',
  '.agy-popover',
  '.agy-menu',
  '.agy-toast',
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
]);

const DOM_TYPO_REGION_ORDER = Object.freeze([
  'topbar',
  'sidebar',
  'workspace',
  'card',
  'composer',
  'rightPane',
  'popover',
]);

function clampNum(v, lo, hi) {
  const n = Number(v);
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function hasOwn(obj, key) {
  return Boolean(obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, key));
}

function isPlainObj(v) {
  return Boolean(v && typeof v === 'object' && !Array.isArray(v));
}

function parseRgbTriplet(triplet) {
  const parts = String(triplet || '')
    .split(',')
    .map((s) => Number(s.trim()) || 0);
  return [
    clampNum(Math.round(parts[0] || 0), 0, 255),
    clampNum(Math.round(parts[1] || 0), 0, 255),
    clampNum(Math.round(parts[2] || 0), 0, 255),
  ];
}

function rgbSum(triplet) {
  const parts = parseRgbTriplet(triplet);
  return parts[0] + parts[1] + parts[2];
}

function hexToRgb(hex) {
  let s = String(hex || '').trim().replace(/^#/, '');
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  if (!/^[0-9a-f]{6}$/i.test(s)) return null;
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

function relLum(rgb) {
  const rs = [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rs[0] + 0.7152 * rs[1] + 0.0722 * rs[2];
}

function contrastRatio(rgbA, rgbB) {
  const l1 = relLum(rgbA);
  const l2 = relLum(rgbB);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function mixRgb(a, b, weightB) {
  const w = clampNum(weightB, 0, 1);
  return [
    Math.round(a[0] * (1 - w) + b[0] * w),
    Math.round(a[1] * (1 - w) + b[1] * w),
    Math.round(a[2] * (1 - w) + b[2] * w),
  ];
}

function rgbaStr(rgb, alpha) {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${clampNum(alpha, 0, 1).toFixed(3)})`;
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
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
  h = (((h % 360) + 360) % 360) / 360;
  s = clampNum(s, 0, 1);
  l = clampNum(l, 0, 1);
  if (s === 0) {
    const gray = Math.round(l * 255);
    return [gray, gray, gray];
  }
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

/** Background-only surface contrast floor (NEVER use for foreground text; use `enforceFgContrastRgb`). */
function enforceContrastFloorRgb(rgb, fgRgb, isLight, minRatio = 4.5) {
  if (contrastRatio(rgb, fgRgb) >= minRatio) return rgb;
  const anchor = isLight ? [255, 255, 255] : [0, 0, 0];
  let lo = 0;
  let hi = 1;
  let best = anchor;
  for (let step = 0; step < 12; step += 1) {
    const mid = (lo + hi) * 0.5;
    const cand = mixRgb(rgb, anchor, mid);
    if (contrastRatio(cand, fgRgb) >= minRatio) {
      best = cand;
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return best;
}

function adaptCustomTintRgb(hexStr, isLight, contrastFloor) {
  const raw = hexToRgb(hexStr);
  if (!raw) return null;
  if (!contrastFloor) return raw;
  const [h, s, l] = rgbToHsl(raw[0], raw[1], raw[2]);
  if (!isLight) {
    if (l > 0.24) {
      return hslToRgb(h, Math.min(s, 0.65), clampNum(0.06 + (1 - l) * 0.18, 0.04, 0.24));
    }
    return raw;
  }
  if (l < 0.74) {
    return hslToRgb(h, Math.min(s, 0.45), clampNum(0.96 - l * 0.22, 0.74, 0.96));
  }
  return raw;
}

function applyToneShiftRgb(rgb, tone, isLight) {
  const t = clampNum(Math.round(Number(tone) || 0), -100, 100);
  if (t === 0) return rgb;
  if (!isLight) {
    return t < 0 ? mixRgb(rgb, [0, 0, 0], Math.abs(t) / 100) : mixRgb(rgb, [92, 98, 114], (t / 100) * 0.85);
  }
  return t < 0 ? mixRgb(rgb, [176, 186, 202], (Math.abs(t) / 100) * 0.85) : mixRgb(rgb, [255, 255, 255], t / 100);
}

function cleanTintHexLocal(v) {
  if (typeof v !== 'string') return '';
  const s = v.trim();
  if (!s || s.toLowerCase() === 'auto') return '';
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
  if (!m) return '';
  let h = m[1];
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return `#${h.toUpperCase()}`;
}

function nullableBoolLocal(v) {
  if (v === null || v === undefined || v === '' || v === 'auto') return null;
  if (typeof v === 'boolean') return v;
  if (v === 'on' || v === 'true' || v === 1) return true;
  if (v === 'off' || v === 'false' || v === 0) return false;
  return null;
}

function nullableUnitOpacityLocal(v, min, max) {
  if (v === null || v === undefined || v === '' || v === 'auto') return null;
  const s = typeof v === 'string' ? v.trim() : null;
  if (s === '' || s === 'auto') return null;
  let n = s !== null ? Number(s) : v;
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  if (n >= 2) n = n / 100;
  return Math.round(clampNum(n, min, max) * 1000) / 1000;
}

function boolLocal(v, fallback = false) {
  if (typeof v === 'boolean') return v;
  if (v === 'on' || v === 'true' || v === 1) return true;
  if (v === 'off' || v === 'false' || v === 0) return false;
  return fallback;
}

/**
 * Sanitize all 8 unified regions (`REGION_IDS`), consuming canonical `regions` 12+4 fields
 * while maintaining full backwards compatibility with legacy `surfaceTints` and `sidebar*` aliases.
 */
function sanitizeRegionsLocal(cfg) {
  const rawRegions = cfg?.regions === null ? null : isPlainObj(cfg?.regions) ? cfg.regions : {};
  const rawTints = cfg?.surfaceTints === null ? null : isPlainObj(cfg?.surfaceTints) ? cfg.surfaceTints : {};
  const resetAllOptical = rawRegions === null || rawTints === null;
  const out = {};

  for (const id of REGION_IDS) {
    const bounds = SURFACE_TINT_BOUNDS[id] || { minOpacity: 0, maxOpacity: 0.98 };
    const fsBounds = REGION_FONT_SIZE_BOUNDS[id] || { min: 10, max: 24 };
    const def = id === 'sidebar' ? { ...DEFAULT_SIDEBAR_REGION_ENTRY } : { ...DEFAULT_REGION_ENTRY };

    if (rawRegions === null) {
      out[id] = def;
      continue;
    }

    const rExplicitNull = hasOwn(rawRegions, id) && rawRegions[id] === null;
    if (rExplicitNull) {
      out[id] = def;
      continue;
    }

    const rEnt = isPlainObj(rawRegions[id]) ? rawRegions[id] : {};
    const tExplicitNull = hasOwn(rawTints, id) && rawTints[id] === null;
    const tEnt = !resetAllOptical && !tExplicitNull && isPlainObj(rawTints?.[id]) ? rawTints[id] : {};

    const pick = (key, fallbackVal) => {
      if (hasOwn(rEnt, key) && rEnt[key] !== undefined) return rEnt[key];
      if (!resetAllOptical && !tExplicitNull && REGION_OPTICAL_KEYS.includes(key) && hasOwn(tEnt, key) && tEnt[key] !== undefined) {
        return tEnt[key];
      }
      return fallbackVal;
    };

    const rawGlass = resetAllOptical && !hasOwn(rEnt, 'glassEnabled') ? null : pick('glassEnabled', def.glassEnabled);
    const rawBlur = resetAllOptical && !hasOwn(rEnt, 'blur') ? null : pick('blur', def.blur);
    const rawOpacity = resetAllOptical && !hasOwn(rEnt, 'opacity') ? null : pick('opacity', def.opacity);
    const rawTone = resetAllOptical && !hasOwn(rEnt, 'tone') ? 0 : pick('tone', def.tone);
    const rawTint = resetAllOptical && !hasOwn(rEnt, 'tint') ? '' : pick('tint', def.tint);
    const rawBorderOp = resetAllOptical && !hasOwn(rEnt, 'borderOpacity') ? null : pick('borderOpacity', def.borderOpacity);
    const rawBorderStyle = pick('borderStyle', def.borderStyle);

    const entry = {
      glassEnabled: nullableBoolLocal(rawGlass),
      blur: nullableNum(rawBlur, 0, 64, 0),
      opacity: nullableUnitOpacityLocal(rawOpacity, bounds.minOpacity, bounds.maxOpacity),
      tone: clampNum(Math.round(Number(rawTone) || 0), -100, 100),
      tint: cleanTintHexLocal(rawTint),
      borderOpacity: nullableUnitOpacityLocal(rawBorderOp, 0, 1),
      borderStyle: BORDER_STYLES.includes(rawBorderStyle) ? rawBorderStyle : null,
      radius: nullableNum(pick('radius', def.radius), 0, 28, 0),
      fontSize: nullableNum(pick('fontSize', def.fontSize), fsBounds.min, fsBounds.max, 0),
      fontFamily: sanitizeFontFamily(pick('fontFamily', def.fontFamily)),
      fontColor: cleanTintHexLocal(pick('fontColor', def.fontColor)),
      allowRawFontColor: boolLocal(pick('allowRawFontColor', def.allowRawFontColor), false),
    };

    if (id === 'sidebar') {
      const rList = hasOwn(rEnt, 'listStyle') ? rEnt.listStyle : cfg?.sidebarListStyle;
      entry.listStyle = SIDEBAR_LIST_STYLES.includes(rList) ? rList : 'capsule';
      entry.sectionFontSize = nullableNum(pick('sectionFontSize', def.sectionFontSize), 11, 15, 1);
      entry.projectFontSize = nullableNum(pick('projectFontSize', def.projectFontSize), 11, 15, 1);
      entry.itemFontSize = nullableNum(pick('itemFontSize', def.itemFontSize), 11, 15, 1);
    }

    out[id] = entry;
  }

  // Legacy sidebar alias fallbacks for direct callers that pass flat sidebar* properties
  const sbRegExplicitNull = rawRegions === null || (isPlainObj(rawRegions) && hasOwn(rawRegions, 'sidebar') && rawRegions.sidebar === null);
  const sbTintExplicitNull = rawTints === null || (isPlainObj(rawTints) && hasOwn(rawTints, 'sidebar') && rawTints.sidebar === null);
  if (out.sidebar.opacity === null && !sbRegExplicitNull && !sbTintExplicitNull) {
    const legacySbOp = nullableUnitOpacityLocal(cfg?.sidebarOpacity, 0, 0.98);
    if (legacySbOp !== null) out.sidebar.opacity = legacySbOp;
  }
  if (out.sidebar.blur === null && !sbRegExplicitNull && !sbTintExplicitNull) {
    const legacySbBlur = nullableNum(cfg?.sidebarBlur, 0, 64, 0);
    if (legacySbBlur !== null) out.sidebar.blur = legacySbBlur;
  }
  if (out.sidebar.fontSize === null && !sbRegExplicitNull) {
    const legacySbFs = nullableNum(cfg?.sidebarFontSize, 11, 15, 0);
    if (legacySbFs !== null) out.sidebar.fontSize = legacySbFs;
  }

  return out;
}

function resolveComponentSurfaceLocal(opts) {
  const entry = opts.entry || { opacity: null, tone: 0, tint: '' };
  const bounds = opts.bounds || { minOpacity: 0, maxOpacity: 0.98 };
  const isLight = Boolean(opts.isLight);
  const contrastFloor = Boolean(opts.contrastFloor);
  const fgRgb = opts.fgRgb || (isLight ? [15, 23, 42] : [242, 242, 245]);
  const baseOrTint = (entry.tint ? adaptCustomTintRgb(entry.tint, isLight, contrastFloor) : null) || opts.defaultRgb;
  const shiftedRgb = applyToneShiftRgb(baseOrTint, entry.tone, isLight);
  const hasToneOrTint = Boolean(entry.tint) || Number(entry.tone || 0) !== 0;
  const preMixRgb = hasToneOrTint && contrastFloor ? enforceContrastFloorRgb(shiftedRgb, fgRgb, isLight, 4.5) : shiftedRgb;
  const mixedRgb = entry.tint ? preMixRgb : mixRgb(preMixRgb, opts.wallTintRgb, opts.wallMixWeight);
  const finalRgb = hasToneOrTint && contrastFloor ? enforceContrastFloorRgb(mixedRgb, fgRgb, isLight, 4.5) : mixedRgb;
  const hasCustomOp = entry.opacity !== null && entry.opacity !== undefined;
  const alpha = opts.solidChrome
    ? 1
    : hasCustomOp
      ? clampNum(entry.opacity, bounds.minOpacity, bounds.maxOpacity)
      : clampNum(opts.defaultAlpha, 0, 0.99);
  return {
    preMixRgb,
    rgb: finalRgb,
    alpha,
    rgba: rgbaStr(finalRgb, alpha),
    customized: hasCustomOp || hasToneOrTint,
    hasCustomOp,
    hasToneOrTint,
  };
}

/**
 * Tier 2 >28px soft-knee blur curve: lossless for 0..28px, asymptotically capped <= 32px above 28px.
 */
export function softKneeBlur(px) {
  const r = Math.round(clampNum(px, 0, 64));
  if (r <= 0) return 0;
  if (r <= 28) return r;
  return Math.min(32, Math.round(28 + (4 * (r - 28)) / (r - 28 + 12)));
}

/**
 * Coupling curve for #4 border opacity fade-out (reaches 0 cleanly at <=0.005 alpha or borders='off').
 */
export function computeBorderFactor(alpha, bScale, overrideBorderOp = null) {
  if (overrideBorderOp !== null && overrideBorderOp !== undefined && overrideBorderOp !== '') {
    const ov = Number(overrideBorderOp);
    if (Number.isFinite(ov)) return clampNum(ov, 0, 1);
  }
  const bs = Number(bScale);
  const a = Number(alpha);
  if (!Number.isFinite(bs) || bs <= 0 || !Number.isFinite(a) || a <= 0.005) return 0;
  return bs * Math.pow(clampNum(a / 0.80, 0, 1), 0.90);
}

/**
 * Coupling curve for #4 shadow opacity fade-out (reaches 0 cleanly at <=0.01 alpha or shadows=false).
 */
export function computeShadowFactor(alpha, shadowsOn) {
  const a = Number(alpha);
  if (!shadowsOn || !Number.isFinite(a) || a <= 0.01) return 0;
  return Math.pow(clampNum(a / 0.65, 0, 1), 1.15);
}

function buildBackdropLocal(px, isLight, isNested) {
  const r = Math.round(clampNum(px, 0, 64));
  if (r <= 0) return 'none';
  const gpuR = softKneeBlur(r);
  const satBoost = r > 28 ? Math.round(Math.min(18, (r - 28) * 0.5)) : 0;
  const sat = isNested
    ? Math.round(100 + Math.min(15, r * 0.25) + satBoost * 0.4)
    : isLight
      ? Math.round(125 + Math.min(65, r * 1.45) + satBoost)
      : Math.round(115 + Math.min(65, r * 1.35) + satBoost);
  return `blur(${gpuR}px) saturate(${sat}%)`;
}

function resolveRegionBlurPx(entry, defaultPx, globalGlassOn, mediaBlurPx) {
  const glassOn =
    entry && entry.glassEnabled !== null && entry.glassEnabled !== undefined
      ? Boolean(entry.glassEnabled)
      : Boolean(globalGlassOn);
  if (!glassOn) return 0;
  const raw =
    entry && entry.blur !== null && entry.blur !== undefined
      ? clampNum(Math.round(Number(entry.blur)), 0, 64)
      : clampNum(Math.round(Number(defaultPx) || 0), 0, 64);
  if (raw <= 0) return 0;
  const mBlur = Math.max(0, Number(mediaBlurPx) || 0);
  return mBlur > 0 ? Math.max(0, Math.round(raw - mBlur * 0.7)) : raw;
}

function buildRegionEdgeTokens({
  alpha,
  bScale,
  shadowsOn,
  isLight,
  ptRgb,
  baseBorderA,
  overrideBorderOp,
  borderStyle,
  isPopover = false,
  layoutMode = 'islands',
}) {
  const bf = borderStyle === 'none' ? 0 : computeBorderFactor(alpha, bScale, overrideBorderOp);
  const sf = computeShadowFactor(alpha, isPopover ? Boolean(shadowsOn) : (layoutMode !== 'flush' && Boolean(shadowsOn)));
  const border = bf <= 0.001 ? 'transparent' : rgbaStr(ptRgb, baseBorderA * bf);
  const specular = bf <= 0.001 ? 'transparent' : rgbaStr([255, 255, 255], (isLight ? 0.88 : 0.075) * bf);
  const sheen =
    bf <= 0.001
      ? 'none'
      : isLight
        ? `linear-gradient(172deg, rgba(255, 255, 255, ${(0.68 * bf).toFixed(3)}) 0%, rgba(255, 255, 255, 0) 40%)`
        : `linear-gradient(172deg, rgba(255, 255, 255, ${(0.042 * bf).toFixed(3)}) 0%, rgba(255, 255, 255, 0) 38%)`;

  let shadow = 'none';
  if (sf > 0.001) {
    if (isPopover) {
      shadow = isLight
        ? `0 28px 64px -18px rgba(15, 23, 42, ${(0.28 * sf).toFixed(3)}), 0 2px 8px rgba(15, 23, 42, ${(0.10 * sf).toFixed(3)})`
        : `0 28px 64px -14px rgba(0, 0, 0, ${(0.64 * sf).toFixed(3)}), 0 2px 8px rgba(0, 0, 0, ${(0.30 * sf).toFixed(3)})`;
    } else {
      shadow = isLight
        ? `0 10px 28px -10px rgba(15, 23, 42, ${(0.14 * sf).toFixed(3)}), 0 2px 6px rgba(15, 23, 42, ${(0.06 * sf).toFixed(3)})`
        : `0 10px 28px -8px rgba(0, 0, 0, ${(0.46 * sf).toFixed(3)}), 0 2px 6px rgba(0, 0, 0, ${(0.24 * sf).toFixed(3)})`;
    }
  }

  const bw =
    borderStyle === 'none'
      ? { top: '0px', right: '0px', bottom: '0px', left: '0px' }
      : borderStyle === 'bottom'
        ? { top: '0px', right: '0px', bottom: '1px', left: '0px' }
        : { top: '1px', right: '1px', bottom: '1px', left: '1px' };

  return { bf, sf, border, specular, sheen, shadow, bw };
}

function computeRadiiLocal(cfg) {
  if (cfg.layoutMode === 'flush') {
    const fCtl = cfg.cornerStyle === 'sharp' ? 4 : cfg.cornerStyle === 'soft' ? 8 : 6;
    return { island: 0, sheet: 12, card: fCtl + 2, ctl: fCtl, xs: Math.max(2, fCtl - 2) };
  }
  if (cfg.cornerStyle === 'sharp') return { island: 6, sheet: 8, card: 5, ctl: 4, xs: 2 };
  if (cfg.cornerStyle === 'soft') return { island: 16, sheet: 18, card: 13, ctl: 9, xs: 6 };
  return { island: 12, sheet: 14, card: 10, ctl: 7, xs: 4 };
}

function isWcoAutoEntry(entry) {
  return (
    entry.opacity === null &&
    Number(entry.tone || 0) === 0 &&
    !entry.tint &&
    entry.blur === null &&
    entry.glassEnabled === null &&
    entry.borderOpacity === null &&
    entry.borderStyle === null &&
    entry.radius === null
  );
}

function resolveRegionRadiusToken(entryRad, fallbackStr) {
  return entryRad !== null && entryRad !== undefined ? `${entryRad}px` : fallbackStr;
}

function resolveIslandCornerRadius(entryRad, legacyRaw, defaultIslandPx) {
  if (entryRad !== null && entryRad !== undefined) return `${entryRad}px`;
  const leg = String(legacyRaw || 'auto').trim().toLowerCase();
  if (leg === 'native') return '0px';
  if (/^\d+(?:\.\d+)?$/.test(leg)) {
    return `${Math.round(clampNum(Number(leg), 0, 28))}px`;
  }
  return `${defaultIslandPx}px`;
}

function buildPolarityTokenVarsCss(cfg, tok, isLight) {
  const glassOp = clampNum(cfg.glassOpacity ?? 0.76, 0.15, 0.98);
  const fidelity = clampNum(Number(cfg.glassFidelity ?? 92) / 100, 0, 1);
  const chatFid = clampNum(Number(cfg.chatGlassFidelity ?? 90) / 100, 0, 1);
  const globalGlassOn = cfg.glassSurfaces !== false;
  const solidChrome = !globalGlassOn;
  const contrastFloor = cfg.contrastFloor !== false;
  const wallTintMix = clampNum(cfg.wallTintMix ?? 0.06, 0, 0.22);
  const shadowsOn = cfg.shadows !== false;
  const layoutMode = cfg.layoutMode === 'flush' ? 'flush' : 'islands';

  const ptRgb = parseRgbTriplet(tok.ptRgb);
  const shadeRgb = parseRgbTriplet(tok.shadeRgb);
  const baseRgb = parseRgbTriplet(tok.baseRgb);
  const tint1Rgb = parseRgbTriplet(tok.tint1Rgb);
  const tint2Rgb = parseRgbTriplet(tok.tint2Rgb);
  const popRgb = parseRgbTriplet(tok.popoverRgb);
  const fgRgb = hexToRgb(tok.fg) || (isLight ? [15, 23, 42] : [242, 242, 245]);
  const wallTintRgb = cfg.extractedAccent?.tintRgb
    ? parseRgbTriplet(cfg.extractedAccent.tintRgb)
    : parseRgbTriplet(tok.accentRgb);

  const regions = sanitizeRegionsLocal(cfg);
  const sbBaseRgb = !isLight && rgbSum(tok.shadeRgb) > rgbSum(tok.baseRgb) ? baseRgb : shadeRgb;
  const sbEntry = regions.sidebar;
  const hasCustomSbOp = sbEntry.opacity !== null && sbEntry.opacity !== undefined;
  const globalMinSbFloor = contrastFloor ? (isLight ? 0.48 : 0.36) : 0.15;
  const minSbFloor = hasCustomSbOp ? 0 : globalMinSbFloor;
  const defaultSbAlpha = clampNum(Math.max(glassOp, minSbFloor * fidelity), 0, 0.99);
  const defaultTopbarAlpha = clampNum(Math.max(glassOp, globalMinSbFloor * fidelity), 0, 0.99);

  const rawChatA =
    layoutMode === 'flush' && !isLight
      ? clampNum(glassOp * 0.24, 0, 0.82)
      : isLight
        ? clampNum(glassOp * 0.62, 0.28, 0.92)
        : clampNum(glassOp * 0.42, 0.08, 0.88);
  const rawCardA = isLight ? clampNum(glassOp * 0.86, 0.50, 0.98) : clampNum(glassOp * 0.78, 0.32, 0.96);
  const rawCompA = isLight ? clampNum(glassOp * 0.94, 0.65, 0.99) : clampNum(glassOp * 0.92, 0.48, 0.98);
  const defaultChatAlpha = clampNum(Math.max(rawChatA, (isLight ? 0.42 : 0.16) * chatFid), 0, 0.99);
  const defaultCardAlpha = clampNum(Math.max(rawCardA, (isLight ? 0.62 : 0.48) * fidelity), 0, 0.99);
  const defaultCompAlpha = clampNum(Math.max(rawCompA, (isLight ? 0.72 : 0.58) * fidelity), 0, 0.99);
  const defaultPopoverAlpha = cfg.floaterSolidBase !== false ? (isLight ? 0.97 : 0.96) : 0.94;
  const defaultQuickPanelAlpha = isLight ? 0.88 : 0.84;

  const regionSolidChrome = (entry) => (entry.glassEnabled === true ? false : solidChrome);

  const topbarRes = resolveComponentSurfaceLocal({
    entry: regions.topbar,
    defaultRgb: sbBaseRgb,
    fgRgb,
    wallTintRgb,
    wallMixWeight: wallTintMix * 0.75,
    defaultAlpha: defaultTopbarAlpha,
    bounds: SURFACE_TINT_BOUNDS.topbar,
    isLight,
    contrastFloor,
    solidChrome: regionSolidChrome(regions.topbar),
  });

  const wcoEntry = regions.wco;
  const wcoIsAuto = isWcoAutoEntry(wcoEntry);
  const wcoRes = wcoIsAuto
    ? topbarRes
    : resolveComponentSurfaceLocal({
        entry: wcoEntry,
        defaultRgb: topbarRes.hasToneOrTint ? topbarRes.preMixRgb : sbBaseRgb,
        fgRgb,
        wallTintRgb,
        wallMixWeight: wallTintMix * 0.75,
        defaultAlpha: topbarRes.alpha,
        bounds: SURFACE_TINT_BOUNDS.wco,
        isLight,
        contrastFloor,
        solidChrome: regionSolidChrome(wcoEntry),
      });

  const sbSolidChrome = regionSolidChrome(sbEntry);
  const sbRes = resolveComponentSurfaceLocal({
    entry: sbEntry,
    defaultRgb: sbBaseRgb,
    fgRgb,
    wallTintRgb,
    wallMixWeight: wallTintMix * 0.75,
    defaultAlpha: defaultSbAlpha,
    bounds: SURFACE_TINT_BOUNDS.sidebar,
    isLight,
    contrastFloor,
    solidChrome: sbSolidChrome,
  });

  const wsRes = resolveComponentSurfaceLocal({
    entry: regions.workspace,
    defaultRgb: baseRgb,
    fgRgb,
    wallTintRgb,
    wallMixWeight: wallTintMix * 0.75,
    defaultAlpha: defaultChatAlpha,
    bounds: SURFACE_TINT_BOUNDS.workspace,
    isLight,
    contrastFloor,
    solidChrome: regionSolidChrome(regions.workspace),
  });

  const rightPaneRes = resolveComponentSurfaceLocal({
    entry: regions.rightPane,
    defaultRgb: baseRgb,
    fgRgb,
    wallTintRgb,
    wallMixWeight: wallTintMix * 0.75,
    defaultAlpha: defaultChatAlpha,
    bounds: SURFACE_TINT_BOUNDS.rightPane,
    isLight,
    contrastFloor,
    solidChrome: regionSolidChrome(regions.rightPane),
  });

  const compRes = resolveComponentSurfaceLocal({
    entry: regions.composer,
    defaultRgb: tint1Rgb,
    fgRgb,
    wallTintRgb,
    wallMixWeight: wallTintMix,
    defaultAlpha: defaultCompAlpha,
    bounds: SURFACE_TINT_BOUNDS.composer,
    isLight,
    contrastFloor,
    solidChrome: regionSolidChrome(regions.composer),
  });

  const cardRes = resolveComponentSurfaceLocal({
    entry: regions.card,
    defaultRgb: tint1Rgb,
    fgRgb,
    wallTintRgb,
    wallMixWeight: wallTintMix,
    defaultAlpha: defaultCardAlpha,
    bounds: SURFACE_TINT_BOUNDS.card,
    isLight,
    contrastFloor,
    solidChrome: regionSolidChrome(regions.card),
  });

  const popRes = resolveComponentSurfaceLocal({
    entry: regions.popover,
    defaultRgb: popRgb,
    fgRgb,
    wallTintRgb,
    wallMixWeight: wallTintMix * 0.4,
    defaultAlpha: defaultPopoverAlpha,
    bounds: SURFACE_TINT_BOUNDS.popover,
    isLight,
    contrastFloor,
    solidChrome: regionSolidChrome(regions.popover),
  });

  const quickPanelRes = resolveComponentSurfaceLocal({
    entry: regions.popover,
    defaultRgb: popRgb,
    fgRgb,
    wallTintRgb,
    wallMixWeight: wallTintMix * 0.4,
    defaultAlpha: defaultQuickPanelAlpha,
    bounds: SURFACE_TINT_BOUNDS.popover,
    isLight,
    contrastFloor,
    solidChrome: regionSolidChrome(regions.popover),
  });

  const sbPreMixStr = sbRes.preMixRgb.join(', ');
  const deepSbRgb = sbRes.customized
    ? isLight
      ? mixRgb(sbRes.preMixRgb, [205, 214, 230], 0.28)
      : mixRgb(sbRes.preMixRgb, [3, 4, 7], 0.45)
    : isLight
      ? mixRgb(sbBaseRgb, [215, 224, 238], 0.35)
      : mixRgb(sbBaseRgb, [3, 4, 7], 0.55);
  const deepSbRgbStr = deepSbRgb.join(', ');

  const sbLiftScale = sbRes.hasCustomOp ? Math.min(1, sbRes.alpha / 0.35) : 1;
  const deepSbAlpha = sbSolidChrome
    ? 1
    : sbRes.hasCustomOp
      ? (sbRes.alpha <= 0.005 ? 0 : clampNum(sbRes.alpha + (isLight ? 0.14 : 0.12) * sbLiftScale, 0, 0.97))
      : sbRes.customized
        ? clampNum(sbRes.alpha + (isLight ? 0.14 : 0.12), isLight ? 0.32 : 0.24, 0.97)
        : isLight
          ? clampNum(Math.max(glassOp + 0.14, 0.90), 0.45, 0.97)
          : clampNum(Math.max(glassOp + 0.12, 0.88), 0.35, 0.96);
  const stickySbAlpha = sbSolidChrome
    ? 1
    : sbRes.hasCustomOp
      ? (sbRes.alpha <= 0.005 ? 0 : clampNum(sbRes.alpha + (isLight ? 0.16 : 0.14) * sbLiftScale, 0, 0.97))
      : sbRes.customized
        ? clampNum(sbRes.alpha + (isLight ? 0.16 : 0.14), isLight ? 0.38 : 0.30, 0.97)
        : isLight
          ? 0.94
          : 0.91;

  const surfSidebarDeep = rgbaStr(sbEntry.tint ? deepSbRgb : mixRgb(deepSbRgb, wallTintRgb, wallTintMix * 0.45), deepSbAlpha);
  const surfStickySidebar = rgbaStr(deepSbRgb, stickySbAlpha);

  const blurBase = clampNum(Math.round(Number(cfg.glassBlur ?? 16)), 0, 64);
  const blurMd = solidChrome ? 0 : blurBase;
  const mediaBlurPx = Math.max(0, Number(cfg.mediaBlur ?? 0));
  const sbDefaultBlur =
    cfg.sidebarBlur !== null && cfg.sidebarBlur !== undefined && cfg.sidebarBlur !== '' && cfg.sidebarBlur !== 'auto' && Number.isFinite(Number(cfg.sidebarBlur))
      ? clampNum(Math.round(Number(cfg.sidebarBlur)), 0, 64)
      : blurBase;
  const compDefaultBlur = blurBase > 0 ? Math.min(64, blurBase + 4) : 0;
  const popDefaultBlur = blurBase > 0 ? Math.min(64, blurBase + 6) : 0;

  const topbarBlurPx = resolveRegionBlurPx(regions.topbar, blurBase, globalGlassOn, mediaBlurPx);
  const wcoDefaultBlur = regions.topbar.blur !== null && regions.topbar.blur !== undefined ? regions.topbar.blur : blurBase;
  const wcoBlurPx = wcoIsAuto
    ? topbarBlurPx
    : wcoEntry.blur === null && wcoEntry.glassEnabled === null
      ? topbarBlurPx
      : resolveRegionBlurPx(wcoEntry, wcoDefaultBlur, globalGlassOn, mediaBlurPx);
  const sbBlurPx = resolveRegionBlurPx(sbEntry, sbDefaultBlur, globalGlassOn, mediaBlurPx);
  const wsBlurPx = resolveRegionBlurPx(regions.workspace, blurBase, globalGlassOn, mediaBlurPx);
  const rightPaneBlurPx = resolveRegionBlurPx(regions.rightPane, blurBase, globalGlassOn, mediaBlurPx);
  const compBlurPx = resolveRegionBlurPx(regions.composer, compDefaultBlur, globalGlassOn, mediaBlurPx);
  const cardBlurPx = resolveRegionBlurPx(regions.card, 0, globalGlassOn, mediaBlurPx);
  const popBlurPx = resolveRegionBlurPx(regions.popover, popDefaultBlur, globalGlassOn, mediaBlurPx);

  const blurLg = !solidChrome && blurMd > 0 ? Math.min(64, blurMd + 4) : 0;
  const blurXl = !solidChrome && blurMd > 0 ? Math.min(64, blurMd + 6) : 0;
  const chipBlurPx = blurMd > 0 ? Math.max(4, Math.round(blurMd * 0.6)) : 0;
  const codeBlurPx = cfg.codeReadabilityMode === 'frosted' && wsBlurPx > 0 ? Math.max(4, Math.round(wsBlurPx * 0.85)) : 0;

  const sbListStyle = sbEntry.listStyle || 'capsule';
  const topbarBackdropCss = buildBackdropLocal(topbarBlurPx, isLight, false);
  const wcoBackdropCss = wcoIsAuto ? topbarBackdropCss : buildBackdropLocal(wcoBlurPx, isLight, false);
  const sbBackdropCss = buildBackdropLocal(sbBlurPx, isLight, false);
  const chatBackdropCss = buildBackdropLocal(wsBlurPx, isLight, false);
  const rightPaneBackdropCss = buildBackdropLocal(rightPaneBlurPx, isLight, false);
  const compBackdropCss = compRes.alpha >= 0.92 ? 'none' : buildBackdropLocal(compBlurPx, isLight, true);
  const cardBackdropCss = cardRes.alpha >= 0.92 ? 'none' : buildBackdropLocal(cardBlurPx, isLight, true);
  const popBackdropCss = popRes.alpha >= 0.94 ? 'none' : buildBackdropLocal(popBlurPx, isLight, false);
  const quickPanelBackdropCss = quickPanelRes.alpha >= 0.94 ? 'none' : buildBackdropLocal(popBlurPx, isLight, false);
  const stickyBackdropCss = stickySbAlpha >= 0.88 || sbListStyle !== 'capsule' ? 'none' : buildBackdropLocal(sbBlurPx, isLight, true);
  const projectBackdropCss = 'none';
  const codeBackdropCss = buildBackdropLocal(codeBlurPx, isLight, true);
  const chipBackdropCss = buildBackdropLocal(chipBlurPx, isLight, true);

  const minEd = contrastFloor ? (isLight ? 0.84 : 0.72) : isLight ? 0.52 : 0.38;
  const rawEdA = isLight ? clampNum(glassOp * 0.96, 0.55, 0.99) : clampNum(glassOp * 0.92, 0.45, 0.98);
  const edAlpha =
    solidChrome || cfg.codeReadabilityMode === 'solid'
      ? 1
      : clampNum(Math.max(rawEdA, minEd * (contrastFloor ? 1 : fidelity)), 0, 0.99);
  const surfEditor = rgbaStr(mixRgb(baseRgb, wallTintRgb, wallTintMix * 0.5), edAlpha);
  const surfCodeBlock = cfg.codeReadabilityMode === 'solid' ? rgbaStr(tint1Rgb, 1) : surfEditor;

  const bScale = cfg.borders === 'off' ? 0 : cfg.borders === 'subtle' ? 0.5 : 1;
  const baseIslandA = isLight ? 0.125 : 0.105;
  const baseCardA = isLight ? 0.115 : 0.090;
  const basePopA = isLight ? 0.160 : 0.145;

  const topbarEdge = buildRegionEdgeTokens({
    alpha: topbarRes.alpha,
    bScale,
    shadowsOn,
    isLight,
    ptRgb,
    baseBorderA: baseIslandA,
    overrideBorderOp: regions.topbar.borderOpacity,
    borderStyle: regions.topbar.borderStyle,
    isPopover: false,
    layoutMode,
  });
  const wcoEdge = wcoIsAuto
    ? topbarEdge
    : buildRegionEdgeTokens({
        alpha: wcoRes.alpha,
        bScale,
        shadowsOn,
        isLight,
        ptRgb,
        baseBorderA: baseIslandA,
        overrideBorderOp: wcoEntry.borderOpacity,
        borderStyle: wcoEntry.borderStyle,
        isPopover: false,
        layoutMode,
      });
  const sbEdge = buildRegionEdgeTokens({
    alpha: sbRes.alpha,
    bScale,
    shadowsOn,
    isLight,
    ptRgb,
    baseBorderA: baseIslandA,
    overrideBorderOp: sbEntry.borderOpacity,
    borderStyle: sbEntry.borderStyle,
    isPopover: false,
    layoutMode,
  });
  const wsEdge = buildRegionEdgeTokens({
    alpha: wsRes.alpha,
    bScale,
    shadowsOn,
    isLight,
    ptRgb,
    baseBorderA: baseIslandA,
    overrideBorderOp: regions.workspace.borderOpacity,
    borderStyle: regions.workspace.borderStyle,
    isPopover: false,
    layoutMode,
  });
  const rightPaneEdge = buildRegionEdgeTokens({
    alpha: rightPaneRes.alpha,
    bScale,
    shadowsOn,
    isLight,
    ptRgb,
    baseBorderA: baseIslandA,
    overrideBorderOp: regions.rightPane.borderOpacity,
    borderStyle: regions.rightPane.borderStyle,
    isPopover: false,
    layoutMode,
  });
  const cardEdge = buildRegionEdgeTokens({
    alpha: cardRes.alpha,
    bScale,
    shadowsOn,
    isLight,
    ptRgb,
    baseBorderA: baseCardA,
    overrideBorderOp: regions.card.borderOpacity,
    borderStyle: regions.card.borderStyle,
    isPopover: false,
    layoutMode,
  });
  const compEdge = buildRegionEdgeTokens({
    alpha: compRes.alpha,
    bScale,
    shadowsOn,
    isLight,
    ptRgb,
    baseBorderA: baseCardA,
    overrideBorderOp: regions.composer.borderOpacity,
    borderStyle: regions.composer.borderStyle,
    isPopover: false,
    layoutMode,
  });
  const popEdge = buildRegionEdgeTokens({
    alpha: popRes.alpha,
    bScale,
    shadowsOn,
    isLight,
    ptRgb,
    baseBorderA: basePopA,
    overrideBorderOp: regions.popover.borderOpacity,
    borderStyle: regions.popover.borderStyle,
    isPopover: true,
    layoutMode,
  });

  const stickyBf = sbEntry.borderStyle === 'none' ? 0 : computeBorderFactor(stickySbAlpha, bScale, sbEntry.borderOpacity);
  const stickySf = computeShadowFactor(stickySbAlpha, shadowsOn);
  const stickyShadowParts = [];
  if (stickyBf > 0.001) stickyShadowParts.push(`inset 0 1px 0 ${rgbaStr([255, 255, 255], (isLight ? 0.88 : 0.075) * stickyBf)}`);
  if (stickySf > 0.001) stickyShadowParts.push(`0 3px 10px rgba(0, 0, 0, ${((isLight ? 0.06 : 0.24) * stickySf).toFixed(3)})`);
  const stickyShadowCss = stickyShadowParts.length ? stickyShadowParts.join(', ') : 'none';

  const deepBf = sbEntry.borderStyle === 'none' ? 0 : computeBorderFactor(deepSbAlpha, bScale, sbEntry.borderOpacity);
  const deepSf = computeShadowFactor(deepSbAlpha, shadowsOn);
  const projShadowParts = [];
  if (deepBf > 0.001) projShadowParts.push(`inset 0 1px 0 ${rgbaStr([255, 255, 255], (isLight ? 0.88 : 0.075) * deepBf)}`);
  if (deepSf > 0.001) projShadowParts.push(`0 2px 8px rgba(0, 0, 0, ${((isLight ? 0.05 : 0.22) * deepSf).toFixed(3)})`);
  const projShadowCss = projShadowParts.length ? projShadowParts.join(', ') : 'none';

  const chipShadowCss = sbEdge.sf <= 0.001 ? 'none' : `0 1px 4px rgba(0, 0, 0, ${((isLight ? 0.08 : 0.26) * sbEdge.sf).toFixed(3)})`;
  const chipShadowHoverCss = sbEdge.sf <= 0.001 ? 'none' : `0 2px 8px rgba(0, 0, 0, ${((isLight ? 0.14 : 0.38) * sbEdge.sf).toFixed(3)})`;
  const sbChipHoverBorderCss = sbEdge.bf <= 0.001 ? 'transparent' : rgbaStr(ptRgb, (isLight ? 0.14 : 0.12) * sbEdge.bf);
  const sbTreeGuideCss = sbEdge.bf <= 0.001 ? 'transparent' : rgbaStr(ptRgb, (isLight ? 0.14 : 0.12) * sbEdge.bf);

  const sashBf = Math.max(sbEdge.bf, wsEdge.bf);
  const borderSashCss = sashBf <= 0.001 ? 'transparent' : rgbaStr(ptRgb, (isLight ? 0.095 : 0.075) * sashBf);
  const compDividerBorderCss = compEdge.bf <= 0.001 ? 'transparent' : rgbaStr(ptRgb, (isLight ? 0.085 : 0.070) * compEdge.bf);

  const mainPageAlpha = wsRes.hasCustomOp ? wsRes.alpha : sbRes.alpha;
  const surfMainPage = wsRes.hasCustomOp ? wsRes.rgba : sbRes.rgba;
  const mainPageEdge = buildRegionEdgeTokens({
    alpha: mainPageAlpha,
    bScale,
    shadowsOn: false,
    isLight,
    ptRgb,
    baseBorderA: baseIslandA,
    overrideBorderOp: wsRes.hasCustomOp ? regions.workspace.borderOpacity : sbEntry.borderOpacity,
    borderStyle: wsRes.hasCustomOp ? regions.workspace.borderStyle : sbEntry.borderStyle,
    isPopover: false,
    layoutMode,
  });

  const R = computeRadiiLocal(cfg);
  const defaultTopbarPillRad = layoutMode === 'flush' ? R.ctl : Math.min(16, R.island);
  const rTopbarPill = resolveRegionRadiusToken(regions.topbar.radius, `${defaultTopbarPillRad}px`);
  const rWco = wcoIsAuto ? rTopbarPill : resolveRegionRadiusToken(wcoEntry.radius, rTopbarPill);
  const rLeftIsland = resolveIslandCornerRadius(sbEntry.radius, cfg.leftSidebarRadius ?? cfg.leftCornerRadius, R.island);
  const rRightIsland = resolveIslandCornerRadius(regions.rightPane.radius, cfg.rightSidebarRadius ?? cfg.rightCornerRadius, R.island);
  const rWorkspace = resolveRegionRadiusToken(regions.workspace.radius, `${R.island}px`);
  const rCard = resolveRegionRadiusToken(regions.card.radius, `${R.card}px`);
  const rComposer = resolveRegionRadiusToken(regions.composer.radius, `${R.card}px`);
  const rPopover = resolveRegionRadiusToken(regions.popover.radius, `${R.card}px`);

  // #9 Balanced Sidebar Typography CSS Variables (11..15px)
  const sbFsRaw = sbEntry.fontSize !== null && sbEntry.fontSize !== undefined ? sbEntry.fontSize : nullableNum(cfg.sidebarFontSize, 11, 15, 0);
  const sbBaseFs = sbFsRaw !== null ? clampNum(Math.round(sbFsRaw), 11, 15) : 13;
  const sbSecFs = sbEntry.sectionFontSize !== null && sbEntry.sectionFontSize !== undefined ? clampNum(Number(sbEntry.sectionFontSize), 11, 15) : sbBaseFs;
  const sbProjFs = sbEntry.projectFontSize !== null && sbEntry.projectFontSize !== undefined ? clampNum(Number(sbEntry.projectFontSize), 11, 15) : sbBaseFs;
  const sbItemFs =
    sbEntry.itemFontSize !== null && sbEntry.itemFontSize !== undefined
      ? clampNum(Number(sbEntry.itemFontSize), 11, 14.5)
      : Math.max(11, Math.min(14.5, sbBaseFs - 0.5));
  const sbSectionLh = sbSecFs >= 15 ? '1.2' : '1.25';

  // #14 Per-Region Typography + D7 Opposite-Anchor Foreground Readability Guardrail (schema.mjs single source)
  const regionSurfaceMap = {
    topbar: topbarRes,
    wco: wcoRes,
    sidebar: sbRes,
    workspace: wsRes,
    card: cardRes,
    composer: compRes,
    rightPane: rightPaneRes,
    popover: popRes,
  };
  const globalFgHex = cleanTintHexLocal(cfg.globalFontColor);
  const globalFf = sanitizeFontFamily(cfg.globalFontFamily);
  const globalFs = nullableNum(cfg.globalFontSize, 10, 24, 0);
  const regionTypoVars = [];

  for (const id of DOM_TYPO_REGION_ORDER) {
    const reg = regions[id];
    const sRes = regionSurfaceMap[id];
    const rawFgHex = reg.fontColor || globalFgHex;
    if (rawFgHex) {
      const fgEval = resolveRegionFgColor({
        fgHex: rawFgHex,
        bgRgb: sRes.rgb,
        bgAlpha: sRes.alpha,
        isLight,
        allowRawFontColor: Boolean(reg.allowRawFontColor),
        minRatio: 4.5,
      });
      if (fgEval.color) {
        regionTypoVars.push(`  --prism-region-${id}-fg: ${fgEval.color};`);
      }
    }
    const ff = sanitizeFontFamily(reg.fontFamily || globalFf);
    if (ff) {
      regionTypoVars.push(`  --prism-region-${id}-ff: ${ff};`);
    }
    if (id !== 'sidebar') {
      const fsBounds = REGION_FONT_SIZE_BOUNDS[id] || { min: 10, max: 24 };
      const fs = reg.fontSize !== null && reg.fontSize !== undefined ? reg.fontSize : nullableNum(globalFs, fsBounds.min, fsBounds.max, 0);
      if (fs !== null) {
        regionTypoVars.push(`  --prism-region-${id}-fs: ${fs}px;`);
      }
    }
  }

  return [
    `  --prism-native-floor: ${isLight ? '#f8fafc' : '#070708'};`,
    `  --prism-pt-rgb: ${tok.ptRgb};`,
    `  --prism-shade-rgb: ${tok.shadeRgb};`,
    `  --prism-sidebar-rgb: ${sbPreMixStr};`,
    `  --prism-sidebar-deep-rgb: ${deepSbRgbStr};`,
    `  --prism-base-rgb: ${tok.baseRgb};`,
    `  --prism-tint-1-rgb: ${tok.tint1Rgb};`,
    `  --prism-tint-2-rgb: ${tok.tint2Rgb};`,
    `  --prism-popover-rgb: ${tok.popoverRgb};`,
    `  --prism-surface-sticky-sidebar: ${surfStickySidebar};`,
    `  --prism-sticky-sidebar-bg: var(--prism-surface-sticky-sidebar);`,
    `  --prism-fg: ${tok.fg};`,
    `  --prism-fg-2: ${tok.fg2};`,
    `  --prism-fg-muted: ${tok.fgMuted};`,
    `  --prism-fg-faint: ${tok.fgFaint};`,
    `  --prism-accent: ${tok.accent};`,
    `  --prism-accent-rgb: ${tok.accentRgb};`,
    `  --prism-accent-fg: ${tok.accentFg};`,
    `  --prism-accent-soft: rgba(${tok.accentRgb}, ${isLight ? '0.110' : '0.140'});`,
    `  --prism-accent-border: rgba(${tok.accentRgb}, ${isLight ? '0.420' : '0.480'});`,
    `  --prism-link: ${tok.link};`,
    `  --prism-surface-topbar: ${topbarRes.rgba};`,
    `  --prism-bg-topbar: var(--prism-surface-topbar);`,
    `  --prism-surface-wco: ${wcoRes.rgba};`,
    `  --prism-surface-sidebar: ${sbRes.rgba};`,
    `  --prism-surface-sidebar-deep: ${surfSidebarDeep};`,
    `  --prism-surface-chat: ${wsRes.rgba};`,
    `  --prism-surface-right-pane: ${rightPaneRes.rgba};`,
    `  --prism-surface-main-page: ${surfMainPage};`,
    `  --prism-surface-card: ${cardRes.rgba};`,
    `  --prism-surface-composer: ${compRes.rgba};`,
    `  --prism-surface-editor: ${surfEditor};`,
    `  --prism-surface-code-block: ${surfCodeBlock};`,
    `  --prism-surface-popover: ${popRes.rgba};`,
    `  --prism-surface-quick-panel: ${quickPanelRes.rgba};`,
    `  --prism-secondary-bg: rgba(${tint2Rgb.join(', ')}, ${Math.min(0.92, cardRes.alpha * 0.82).toFixed(3)});`,
    `  --prism-muted-bg: rgba(${tok.ptRgb}, ${isLight ? '0.065' : '0.060'});`,
    `  --prism-sidebar-muted: rgba(${tok.ptRgb}, ${isLight ? '0.075' : '0.078'});`,
    `  --prism-sidebar-secondary: rgba(${tok.ptRgb}, ${isLight ? '0.115' : '0.125'});`,
    `  --prism-sidebar-tree-guide: ${sbTreeGuideCss};`,
    `  --prism-cust-pill-bg: rgba(${sbPreMixStr}, ${isLight ? '0.720' : '0.620'});`,
    `  --prism-new-tab-input-bg: rgba(${tok.tint1Rgb}, ${isLight ? '0.680' : '0.460'});`,
    `  --prism-proj-act-bg: rgba(${deepSbRgbStr}, ${isLight ? '0.820' : '0.740'});`,
    `  --prism-border-topbar: ${topbarEdge.border};`,
    `  --prism-specular-topbar: ${topbarEdge.specular};`,
    `  --prism-sheen-topbar: ${topbarEdge.sheen};`,
    `  --prism-shadow-topbar: ${topbarEdge.shadow};`,
    `  --prism-bw-topbar-top: ${topbarEdge.bw.top};`,
    `  --prism-bw-topbar-right: ${topbarEdge.bw.right};`,
    `  --prism-bw-topbar-bottom: ${topbarEdge.bw.bottom};`,
    `  --prism-bw-topbar-left: ${topbarEdge.bw.left};`,
    `  --prism-border-wco: ${wcoEdge.border};`,
    `  --prism-specular-wco: ${wcoEdge.specular};`,
    `  --prism-sheen-wco: ${wcoEdge.sheen};`,
    `  --prism-shadow-wco: ${wcoEdge.shadow};`,
    `  --prism-bw-wco-top: ${wcoEdge.bw.top};`,
    `  --prism-bw-wco-right: ${wcoEdge.bw.right};`,
    `  --prism-bw-wco-bottom: ${wcoEdge.bw.bottom};`,
    `  --prism-bw-wco-left: ${wcoEdge.bw.left};`,
    `  --prism-border-sidebar: ${sbEdge.border};`,
    `  --prism-border-sidebar-hover: ${sbChipHoverBorderCss};`,
    `  --prism-specular-sidebar: ${sbEdge.specular};`,
    `  --prism-sheen-sidebar: ${sbEdge.sheen};`,
    `  --prism-shadow-sidebar: ${sbEdge.shadow};`,
    `  --prism-bw-sidebar-top: ${sbEdge.bw.top};`,
    `  --prism-bw-sidebar-right: ${sbEdge.bw.right};`,
    `  --prism-bw-sidebar-bottom: ${sbEdge.bw.bottom};`,
    `  --prism-bw-sidebar-left: ${sbEdge.bw.left};`,
    `  --prism-border-workspace: ${wsEdge.border};`,
    `  --prism-specular-workspace: ${wsEdge.specular};`,
    `  --prism-sheen-workspace: ${wsEdge.sheen};`,
    `  --prism-shadow-workspace: ${wsEdge.shadow};`,
    `  --prism-bw-workspace-top: ${wsEdge.bw.top};`,
    `  --prism-bw-workspace-right: ${wsEdge.bw.right};`,
    `  --prism-bw-workspace-bottom: ${wsEdge.bw.bottom};`,
    `  --prism-bw-workspace-left: ${wsEdge.bw.left};`,
    `  --prism-border-right-pane: ${rightPaneEdge.border};`,
    `  --prism-specular-right-pane: ${rightPaneEdge.specular};`,
    `  --prism-sheen-right-pane: ${rightPaneEdge.sheen};`,
    `  --prism-shadow-right-pane: ${rightPaneEdge.shadow};`,
    `  --prism-bw-right-pane-top: ${rightPaneEdge.bw.top};`,
    `  --prism-bw-right-pane-right: ${rightPaneEdge.bw.right};`,
    `  --prism-bw-right-pane-bottom: ${rightPaneEdge.bw.bottom};`,
    `  --prism-bw-right-pane-left: ${rightPaneEdge.bw.left};`,
    `  --prism-border-main-page: ${mainPageEdge.border};`,
    `  --prism-specular-main-page: ${mainPageEdge.specular};`,
    `  --prism-sheen-main-page: ${mainPageEdge.sheen};`,
    `  --prism-border-card: ${cardEdge.border};`,
    `  --prism-specular-card: ${cardEdge.specular};`,
    `  --prism-sheen-card: ${cardEdge.sheen};`,
    `  --prism-shadow-card: ${cardEdge.shadow};`,
    `  --prism-bw-card-top: ${cardEdge.bw.top};`,
    `  --prism-bw-card-right: ${cardEdge.bw.right};`,
    `  --prism-bw-card-bottom: ${cardEdge.bw.bottom};`,
    `  --prism-bw-card-left: ${cardEdge.bw.left};`,
    `  --prism-border-composer: ${compEdge.border};`,
    `  --prism-border-composer-divider: ${compDividerBorderCss};`,
    `  --prism-specular-composer: ${compEdge.specular};`,
    `  --prism-sheen-composer: ${compEdge.sheen};`,
    `  --prism-shadow-composer: ${compEdge.shadow};`,
    `  --prism-bw-composer-top: ${compEdge.bw.top};`,
    `  --prism-bw-composer-right: ${compEdge.bw.right};`,
    `  --prism-bw-composer-bottom: ${compEdge.bw.bottom};`,
    `  --prism-bw-composer-left: ${compEdge.bw.left};`,
    `  --prism-border-popover: ${popEdge.border};`,
    `  --prism-specular-popover: ${popEdge.specular};`,
    `  --prism-sheen-popover: ${popEdge.sheen};`,
    `  --prism-shadow-popover: ${popEdge.shadow};`,
    `  --prism-bw-popover-top: ${popEdge.bw.top};`,
    `  --prism-bw-popover-right: ${popEdge.bw.right};`,
    `  --prism-bw-popover-bottom: ${popEdge.bw.bottom};`,
    `  --prism-bw-popover-left: ${popEdge.bw.left};`,
    `  --prism-border-sash: ${borderSashCss};`,
    `  --prism-border-island: var(--prism-border-sidebar);`,
    `  --prism-border-hairline: var(--prism-border-sash);`,
    `  --prism-specular-top: var(--prism-specular-topbar);`,
    `  --prism-sheen: var(--prism-sheen-topbar);`,
    `  --prism-shadow-island: var(--prism-shadow-sidebar);`,
    `  --prism-sticky-shadow: ${stickyShadowCss};`,
    `  --prism-proj-shadow: ${projShadowCss};`,
    `  --prism-chip-shadow: ${chipShadowCss};`,
    `  --prism-chip-shadow-hover: ${chipShadowHoverCss};`,
    `  --prism-blur-md: ${blurMd}px;`,
    `  --prism-blur-lg: ${blurLg}px;`,
    `  --prism-blur-xl: ${blurXl}px;`,
    `  --prism-chat-backdrop: ${chatBackdropCss};`,
    `  --prism-right-pane-backdrop: ${rightPaneBackdropCss};`,
    `  --prism-topbar-backdrop: ${topbarBackdropCss};`,
    `  --prism-wco-backdrop: ${wcoBackdropCss};`,
    `  --prism-sidebar-backdrop: ${sbBackdropCss};`,
    `  --prism-popover-backdrop: ${popBackdropCss};`,
    `  --prism-quick-panel-backdrop: ${quickPanelBackdropCss};`,
    `  --prism-sticky-backdrop: ${stickyBackdropCss};`,
    `  --prism-project-backdrop: ${projectBackdropCss};`,
    `  --prism-composer-backdrop: ${compBackdropCss};`,
    `  --prism-card-backdrop: ${cardBackdropCss};`,
    `  --prism-code-backdrop: ${codeBackdropCss};`,
    `  --prism-chrome-chip-backdrop: ${chipBackdropCss};`,
    `  --prism-r-island: ${R.island}px;`,
    `  --prism-r-topbar-pill: ${rTopbarPill};`,
    `  --prism-r-wco: ${rWco};`,
    `  --prism-r-left-island: ${rLeftIsland};`,
    `  --prism-r-right-island: ${rRightIsland};`,
    `  --prism-r-workspace: ${rWorkspace};`,
    `  --prism-r-card: ${rCard};`,
    `  --prism-r-composer: ${rComposer};`,
    `  --prism-r-popover: ${rPopover};`,
    `  --prism-r-sheet: ${R.sheet}px;`,
    `  --prism-r-ctl: ${R.ctl}px;`,
    `  --prism-r-xs: ${R.xs}px;`,
    `  --prism-workspace-pad: ${layoutMode === 'islands' ? Number(cfg.workspacePad ?? 8) : 0}px;`,
    `  --prism-island-gap: ${layoutMode === 'islands' ? Number(cfg.islandGap ?? 8) : 0}px;`,
    `  --prism-sb-section-fs: ${sbSecFs}px;`,
    `  --prism-sb-project-fs: ${sbProjFs}px;`,
    `  --prism-sb-item-fs: ${sbItemFs}px;`,
    `  --prism-sb-section-lh: ${sbSectionLh};`,
    ...regionTypoVars,
  ].join('\n');
}

function buildSidebarStyleOverrideCss(sbListStyle, leftSbScope) {
  const sbStickySel =
    `${leftSbScope} :is([data-sidebar-section-drop-id], [data-index][style*="sticky"], [style*="position: sticky"], [style*="position:sticky"]):is(.bg-sidebar, :has([data-testid="section-header"])):not(:has([data-testid="project-header"])):not(:has([data-project-card])),\n` +
    `.sticky:is(.bg-sidebar, .bg-background):not(.pointer-events-none):not(:has([data-testid="project-header"])):not(:has([data-project-card]))`;
  const sbStickyBeforeSel =
    `${leftSbScope} :is([data-sidebar-section-drop-id], [data-index][style*="sticky"], [style*="position: sticky"], [style*="position:sticky"]):is(.bg-sidebar, :has([data-testid="section-header"])):not(:has([data-testid="project-header"])):not(:has([data-project-card]))::before,\n` +
    `.sticky:is(.bg-sidebar, .bg-background):not(.pointer-events-none):not(:has([data-testid="project-header"])):not(:has([data-project-card]))::before`;
  const sbProjSel = ':is(button[data-testid="project-header"], [data-project-card="true"])';
  const sbProjHoverBeforeSel =
    ':is(button[data-testid="project-header"]:is(:hover, :focus-visible), .group\\/header:hover button[data-testid="project-header"], [data-project-card="true"]:is(:hover, :focus-visible))::before';
  const sbProjExpandedSel =
    ':is(button[data-testid="project-header"][aria-expanded="true"], [data-project-card="true"][aria-expanded="true"], [data-sidebar-section-drop-id]:not([data-sidebar-section-collapsed="true"]) :is(button[data-testid="project-header"], [data-project-card="true"]):not([aria-expanded="false"]))';
  const sbChildRowsWrapSel =
    `${leftSbScope} [data-sidebar-section-id]:not([data-sidebar-section-id="main-section-header"]):has(.agy-sidebar-row.pl-\\[30px\\], [data-testid="conversation-row-sidebar"].pl-\\[30px\\], .agy-sidebar-row.pl-5, [data-testid="conversation-row-sidebar"].pl-5)`;

  if (sbListStyle === 'underline') {
    return `
${sbStickySel} {
  border-radius: 0px !important;
}
${sbStickyBeforeSel} {
  background-color: transparent !important;
  background-image: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border: none !important;
  border-bottom: 1px solid var(--prism-border-sidebar) !important;
  border-radius: 0px !important;
  box-shadow: none !important;
}
${sbProjSel} {
  border-radius: 0px !important;
}
${sbProjSel}::before {
  background-color: transparent !important;
  background-image: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border: none !important;
  border-bottom: 1px solid var(--prism-border-sidebar) !important;
  border-radius: 0px !important;
  box-shadow: none !important;
}
${sbProjHoverBeforeSel} {
  background-color: var(--prism-sidebar-muted) !important;
  border-bottom-color: var(--prism-accent-border) !important;
}`;
  }

  if (sbListStyle === 'accordion') {
    return `
${sbStickyBeforeSel} {
  background-color: transparent !important;
  background-image: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border: none !important;
  border-radius: 0px !important;
  box-shadow: none !important;
}
${sbProjSel}::before {
  background-color: transparent !important;
  background-image: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border: none !important;
  box-shadow: none !important;
}
${sbProjHoverBeforeSel} {
  background-color: var(--prism-sidebar-muted) !important;
}
${sbProjSel}::after {
  content: "";
  position: absolute;
  right: 10px;
  top: 50%;
  width: 6px;
  height: 6px;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  opacity: 0.55;
  pointer-events: none;
  transform: translateY(-60%) rotate(-45deg);
  transition: transform 150ms ease, opacity 120ms ease;
}
${sbProjExpandedSel} {
  color: var(--prism-accent) !important;
}
${sbProjExpandedSel}::after {
  transform: translateY(-70%) rotate(45deg);
  opacity: 0.88;
  border-color: var(--prism-accent);
}
:is(.group\\/header:is(:hover, :focus-within) button[data-testid="project-header"], button[data-testid="project-header"]:is(:hover, :focus-within), [data-project-card="true"]:is(:hover, :focus-within))::after {
  opacity: 0 !important;
}
${leftSbScope} :is(.agy-sidebar-row, [data-testid="conversation-row-sidebar"])[data-selected="true"] {
  background-color: var(--prism-accent-soft) !important;
  color: var(--prism-accent) !important;
  border-radius: var(--prism-r-ctl) !important;
  box-shadow: none !important;
}
${sbChildRowsWrapSel} {
  background-color: rgba(var(--prism-pt-rgb), 0.025) !important;
}`;
  }

  if (sbListStyle === 'tree') {
    return `
${sbStickySel} {
  border-radius: 0px !important;
}
${sbStickyBeforeSel} {
  background-color: transparent !important;
  background-image: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border: none !important;
  border-bottom: 1px solid var(--prism-border-sidebar) !important;
  border-radius: 0px !important;
  box-shadow: none !important;
}
${leftSbScope} [data-testid="section-header"] button:not(h2 button):not(h2 *) {
  border-radius: 4px !important;
}
${sbProjSel} {
  border-radius: 4px !important;
}
${sbProjSel}::before {
  background-color: transparent !important;
  background-image: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border: none !important;
  border-radius: 4px !important;
  box-shadow: none !important;
}
${sbProjHoverBeforeSel} {
  background-color: var(--prism-sidebar-muted) !important;
}
${sbProjSel}::after {
  content: "";
  order: -1;
  flex-shrink: 0;
  width: 5px;
  height: 5px;
  margin-left: 2px;
  margin-right: 6px;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  opacity: 0.60;
  pointer-events: none;
  transform: rotate(-45deg);
  transition: transform 140ms ease, opacity 120ms ease;
}
${sbProjExpandedSel}::after {
  transform: rotate(45deg);
  opacity: 0.88;
}
${sbChildRowsWrapSel} {
  position: relative;
}
${sbChildRowsWrapSel}::before {
  content: "";
  position: absolute;
  left: 11px;
  top: 0;
  bottom: 0;
  width: 1px;
  pointer-events: none;
  background-color: var(--prism-sidebar-tree-guide);
}
${leftSbScope} :is(.agy-sidebar-row, [data-testid="conversation-row-sidebar"]) {
  border-radius: 4px !important;
}`;
  }

  return '';
}

function buildSidebarTypographyCss(cfg, leftSbScope) {
  if (cfg.sidebarTypographyMode === 'native') return '';
  return `
${leftSbScope} [data-testid="section-header"] h2 {
  font-size: var(--prism-sb-section-fs, 13px) !important;
  font-weight: 600 !important;
  opacity: 0.82 !important;
  line-height: var(--prism-sb-section-lh, 1.25) !important;
  letter-spacing: 0.01em !important;
  text-transform: none !important;
}
${leftSbScope} .group\\/section-header {
  padding-top: 2px !important;
  padding-bottom: 2px !important;
  min-height: 24px !important;
}
${leftSbScope} [data-testid="section-header"] :is(button, a):not(h2 button):not(h2 *) {
  width: 18px !important;
  height: 18px !important;
  min-width: 18px !important;
  min-height: 18px !important;
  padding: 0 !important;
  border-radius: var(--prism-r-xs) !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
}
${leftSbScope} :is(button[data-testid="project-header"], [data-project-card="true"]) {
  font-size: var(--prism-sb-project-fs, 13px) !important;
  font-weight: 500 !important;
  line-height: 1.25 !important;
  letter-spacing: normal !important;
  text-transform: none !important;
}
${leftSbScope} :is(button[data-testid="project-header"].group\\/headerbtn, .group\\/headerbtn) {
  padding-top: 4px !important;
  padding-bottom: 4px !important;
}
${leftSbScope} :is(.agy-sidebar-row, [data-testid="conversation-row-sidebar"]) {
  font-size: var(--prism-sb-item-fs, 12.5px) !important;
  line-height: 1.3 !important;
}`;
}

function buildRegionTypographyCss(cfg, regions, { tbCarriers, rightPaneCarriers, composerCarriers }) {
  const globalFgHex = cleanTintHexLocal(cfg.globalFontColor);
  const globalFf = sanitizeFontFamily(cfg.globalFontFamily);
  const globalFs = nullableNum(cfg.globalFontSize, 10, 24, 0);

  const carrierSelectors = {
    topbar: `:is(${tbCarriers.join(', ')})`,
    sidebar: `:is([data-testid="sidebar-split"] > div:first-child, .agy-sidebar, aside[data-side-panel-body]:not(.agy-sheet *):not([data-testid="aux-pane-split"] *), .monaco-workbench .part.activitybar, .monaco-workbench .part.sidebar)`,
    workspace: ':is([data-testid="aux-pane-split"] > :is(div, main, section):first-child, .agy-shell > main, .monaco-workbench .part.editor > .content, .monaco-workbench .part.panel)',
    card: ':is(.msg-user, .msg-agent, [data-testid="customization-card"], .agy-spotlight-card, [data-testid="marketplace-bundles-banner"], .surface-opaque.bg-background)',
    composer: `:is(${composerCarriers.join(', ')})`,
    rightPane: `:is(${rightPaneCarriers.join(', ')}, [data-side-panel-strip]:not([data-testid="aux-pane-split"] *), .agy-sheet [data-side-panel-body]:not([data-testid="aux-pane-split"] *))`,
    popover: `:is(${SOLID_POPOVERS.join(', ')})`,
  };

  const blocks = [];
  for (const id of DOM_TYPO_REGION_ORDER) {
    const reg = regions[id];
    const hostSel = carrierSelectors[id];
    const extraEx =
      (id === 'workspace' || id === 'rightPane' || id === 'card' ? COMPOSER_DESCENDANT_EXCLUDE : '') +
      SIBLING_EXCLUDE +
      SIBLING_DESCENDANT_EXCLUDE +
      (id === 'popover' ? '' : DIALOG_DESCENDANT_EXCLUDE);
    const hasFg = Boolean(reg.fontColor || globalFgHex);
    const hasFf = Boolean(sanitizeFontFamily(reg.fontFamily || globalFf));
    const fsBounds = REGION_FONT_SIZE_BOUNDS[id] || { min: 10, max: 24 };
    const hasFs =
      id !== 'sidebar' &&
      (reg.fontSize !== null && reg.fontSize !== undefined ? true : nullableNum(globalFs, fsBounds.min, fsBounds.max, 0) !== null);

    if (hasFg) {
      blocks.push(
        `${hostSel}${TYPO_PROTECT_EX}${extraEx},\n${hostSel} :where(*)${TYPO_PROTECT_EX}${extraEx} {\n  color: var(--prism-region-${id}-fg) !important;\n}`
      );
    }
    if (hasFf) {
      blocks.push(
        `${hostSel}${TYPO_PROTECT_EX}${extraEx},\n${hostSel} :where(*)${TYPO_PROTECT_EX}${extraEx} {\n  font-family: var(--prism-region-${id}-ff) !important;\n}`
      );
    }
    if (hasFs) {
      blocks.push(
        `${hostSel} :where(p, span, div, li, button, a, label, textarea, input, [contenteditable="true"])${TYPO_PROTECT_EX}${extraEx} {\n  font-size: var(--prism-region-${id}-fs) !important;\n}`
      );
    }
  }
  return blocks.length ? `\n${blocks.join('\n')}` : '';
}

/**
 * Build a pure zero-JS stylesheet (`static-css` startup mode) consumed by `GET /host/<capToken>/static.css`.
 * Keeps 100% native clickability (`pointer-events: none` `body::before` at `z-index: -1`) and yields
 * `alpha = 0` whenever Antigravity 2.34.0+ opens a `[data-has-browser-hole="true"]` WCV surface.
 */
export function buildStaticCssSheet(payload = {}) {
  if (
    payload &&
    (payload.skinEnabled === false ||
      payload.skinEnabled === 0 ||
      (payload.config && (payload.config.skinEnabled === false || payload.config.skinEnabled === 0)))
  ) {
    return '/* agy-wallpaper-prism v2.3.0 static-css: skin disabled */\n';
  }
  const rawCfg = payload?.config && typeof payload.config === 'object' ? payload.config : payload || DEFAULT_CONFIG;
  const activeItem = payload?.activeItem && typeof payload.activeItem === 'object' ? payload.activeItem : null;
  const wid = String(activeItem?.id || rawCfg.activeWallpaperId || rawCfg.wallpaperId || '');
  const cfg = resolveEffectiveConfig(sanitizeConfig(rawCfg), wid);
  const regions = sanitizeRegionsLocal(cfg);
  const darkTok = payload?.tokensPreview?.dark || resolveSchemeTokens(cfg, 'dark');
  const lightTok = payload?.tokensPreview?.light || resolveSchemeTokens(cfg, 'light');

  const rawImg =
    (activeItem &&
      (activeItem.kind === 'image' || activeItem.kind === 'slideshow'
        ? activeItem.mediaUrl || activeItem.thumbUrl
        : activeItem.thumbUrl || (activeItem.kind !== 'video' && activeItem.kind !== 'web' ? activeItem.mediaUrl : ''))) ||
    (Array.isArray(payload?.slides) && payload.slides[0]) ||
    '';
  const safeImg = escapeCssUrl(rawImg);
  const scrimOp = Math.min(0.92, Math.max(0, Number(cfg.scrimOpacity ?? 0.22)));
  const fitCss =
    cfg.fit === 'contain' ? 'contain' : cfg.fit === 'center' ? 'auto' : cfg.fit === 'fill' ? '100% 100%' : 'cover';

  const wallBgDark = safeImg
    ? `linear-gradient(180deg, rgba(${darkTok.shadeRgb}, ${(scrimOp * 0.85).toFixed(3)}), rgba(${darkTok.shadeRgb}, ${(scrimOp * 1.1).toFixed(3)})), url("${safeImg}")`
    : `radial-gradient(ellipse 80% 70% at 22% 24%, rgba(${darkTok.accentRgb}, 0.26) 0%, transparent 65%), radial-gradient(ellipse 75% 75% at 80% 78%, rgba(${darkTok.accentRgb}, 0.18) 0%, #09090b 100%)`;
  const wallBgLight = safeImg
    ? `linear-gradient(180deg, rgba(${lightTok.baseRgb}, ${(scrimOp * 0.75).toFixed(3)}), rgba(${lightTok.baseRgb}, ${scrimOp.toFixed(3)})), url("${safeImg}")`
    : `radial-gradient(ellipse 80% 70% at 22% 24%, rgba(${lightTok.accentRgb}, 0.18) 0%, transparent 65%), radial-gradient(ellipse 75% 75% at 80% 78%, rgba(${lightTok.accentRgb}, 0.12) 0%, #f4f7fb 100%)`;

  const sibEx = SIBLING_EXCLUDE;
  const dlgDescEx = DIALOG_DESCENDANT_EXCLUDE;
  const notHole = ':not([data-has-browser-hole="true"]):not([data-browser-hole])';
  const leftSbScope =
    ':is([data-testid="sidebar-split"] > div:first-child, .agy-sidebar, aside[data-side-panel-body]:not(.agy-sheet *):not([data-testid="aux-pane-split"] *))';

  const tbCarriers = ['[data-testid="title-menu-bar"]', '.monaco-workbench .part.titlebar'];
  const tbHostCss = tbCarriers.map((s) => `${s}${notHole}`).join(',\n');
  const tbBeforeCss = tbCarriers.map((s) => `${s}${notHole}::before`).join(',\n');

  const sbCarriers = [
    '[data-testid="sidebar-split"] > div:first-child',
    '.agy-sidebar:not([data-testid="sidebar-split"] > div:first-child *)',
    'aside[data-side-panel-body]:not(.agy-sheet *):not([data-testid="aux-pane-split"] *):not(.agy-sidebar *):not([data-testid="sidebar-split"] > div:first-child *)',
    '.monaco-workbench .part.activitybar',
    '.monaco-workbench .part.sidebar',
  ];
  const sbHostCss = sbCarriers.map((s) => `${s}${notHole}`).join(',\n');
  const sbBeforeCss = sbCarriers.map((s) => `${s}${notHole}::before`).join(',\n');

  const chatCarriers = [
    '[data-testid="aux-pane-split"] > :is(div, main, section):first-child',
    '.agy-shell > main',
  ];
  const rightPaneCarriers = [
    '[data-testid="aux-pane-split"] > :is(div, aside, section):last-child:not(:first-child):not([hidden]):not([aria-hidden="true"])',
    '.monaco-workbench .part.auxiliarybar',
  ];
  const workspaceHostCss = [...chatCarriers, ...rightPaneCarriers].map((s) => `${s}${notHole}`).join(',\n');
  const chatBeforeCss = chatCarriers.map((s) => `${s}${notHole}::before`).join(',\n');
  const rightPaneBeforeCss = rightPaneCarriers.map((s) => `${s}${notHole}::before`).join(',\n');

  const mainPageCarriers = [
    'div.bg-background:not(.agy-shell):not(.sticky):not([style*="sticky"]):not(.agy-dialog):not(.settings-modal-container):has([data-testid="customizations-search"], [data-testid="customizations-marketplace"], [data-testid="customizations-installed"])',
    '[data-testid="plugin-detail"]',
  ];
  const mainPageHostCss = mainPageCarriers.map((s) => `${s}${notHole}`).join(',\n');
  const mainPageBeforeCss = mainPageCarriers.map((s) => `${s}${notHole}::before`).join(',\n');

  // #7 Composer 4-Layer Single-Carrier Selectors (calibrated with 2.35.1 Day-0 probe SLOT_L1-SLOT_L4)
  // DAY0_PROBE_CALIBRATION_SLOT: SLOT_L1_OUTER_SHELL = div[data-testid="agent-input-box"].flex.flex-col.w-full.shrink-0
  // DAY0_PROBE_CALIBRATION_SLOT: SLOT_L2_INPUTBOX_CLASSES = div#antigravity.agentSidePanelInputBox.surface-composer.relative.flex.flex-col.p-px.rounded-2xl.bg-card-border
  // DAY0_PROBE_CALIBRATION_SLOT: SLOT_L3_CONTEXT_BAR = defensive div:first-child:has(~ .surface-composer-card) guard retained
  // DAY0_PROBE_CALIBRATION_SLOT: SLOT_L4_INNER_NESTED = .surface-composer-card + defensive inner stripping
  const composerCarriers = [
    '#antigravity\\.agentSidePanelInputBox',
    '[data-testid="agent-input-box"]:not(#antigravity\\.agentSidePanelInputBox):not(#antigravity\\.agentSidePanelInputBox *):not(:has(#antigravity\\.agentSidePanelInputBox)):not([data-testid="agent-input-box"] *)',
    '.surface-composer-card:not(#antigravity\\.agentSidePanelInputBox *):not([data-testid="agent-input-box"] *):not([data-testid="agent-input-box"]):not(:has([data-testid="agent-input-box"]))',
    '.agy-composer:not(#antigravity\\.agentSidePanelInputBox *):not([data-testid="agent-input-box"] *):not(.surface-composer-card *):not([data-testid="agent-input-box"]):not(.surface-composer-card):not(:has([data-testid="agent-input-box"])):not(:has(.surface-composer-card))',
  ];
  const compHostCss = composerCarriers.join(',\n');
  const compBeforeCss = composerCarriers.map((s) => `${s}::before`).join(',\n');

  const isIslands = cfg.layoutMode === 'islands';
  const topbarPillRadiusCss = isIslands
    ? 'var(--prism-r-topbar-pill)'
    : '0px 0px var(--prism-r-topbar-pill) var(--prism-r-topbar-pill)';
  const topbarPillBorderCss = isIslands
    ? 'border-style: solid !important;\n  border-top-width: var(--prism-bw-topbar-top, 1px) !important;\n  border-right-width: var(--prism-bw-topbar-right, 1px) !important;\n  border-bottom-width: var(--prism-bw-topbar-bottom, 1px) !important;\n  border-left-width: var(--prism-bw-topbar-left, 1px) !important;\n  border-color: var(--prism-border-topbar) !important;\n  box-shadow: var(--prism-shadow-topbar) !important;'
    : 'border-style: solid !important;\n  border-top-width: 0px !important;\n  border-right-width: var(--prism-bw-topbar-right, 1px) !important;\n  border-bottom-width: var(--prism-bw-topbar-bottom, 1px) !important;\n  border-left-width: var(--prism-bw-topbar-left, 1px) !important;\n  border-color: var(--prism-border-topbar) !important;\n  box-shadow: none !important;';
  const multiClusterChildSel =
    ':is(header[data-testid="title-menu-bar"], [data-testid="title-menu-bar"][class*="justify-between"], .monaco-workbench .part.titlebar)' +
    notHole +
    ' > :is(.hub-title-left, .hub-title-center, .hub-title-right, .titlebar-left, .titlebar-center, .titlebar-right, div):not(:empty):not([data-browser-occluder="true"]):not([style*="position:fixed"]):not([style*="position: fixed"]):not(.window-controls-container)';

  const topbarCssBlock =
    cfg.topbarStyle === 'bar'
      ? `${tbHostCss} {
  position: relative !important;
  overflow: visible !important;
  background-color: transparent !important;
  background-image: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  -webkit-app-region: drag;
}
${tbBeforeCss} {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  pointer-events: none;
  background-color: var(--prism-bg-topbar, var(--prism-surface-topbar));
  background-image: var(--prism-sheen-topbar);
  backdrop-filter: var(--prism-topbar-backdrop);
  -webkit-backdrop-filter: var(--prism-topbar-backdrop);
  box-shadow: inset 0 1px 0 var(--prism-specular-topbar);
}`
      : `div[data-testid="title-menu-bar"]:not(header):not([class*="justify-between"])${notHole} {
  width: fit-content !important;
  max-width: calc(100% - var(--prism-wco-inset-right, 0px)) !important;
  position: relative !important;
  overflow: visible !important;
  background-color: transparent !important;
  background-image: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border-radius: ${topbarPillRadiusCss} !important;
  ${topbarPillBorderCss}
  -webkit-app-region: drag;
}
div[data-testid="title-menu-bar"]:not(header):not([class*="justify-between"])${notHole}::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  pointer-events: none;
  background-color: var(--prism-bg-topbar, var(--prism-surface-topbar));
  background-image: var(--prism-sheen-topbar);
  backdrop-filter: var(--prism-topbar-backdrop);
  -webkit-backdrop-filter: var(--prism-topbar-backdrop);
  box-shadow: inset 0 1px 0 var(--prism-specular-topbar);
}
:is(header[data-testid="title-menu-bar"], [data-testid="title-menu-bar"][class*="justify-between"], .monaco-workbench .part.titlebar)${notHole} {
  position: relative !important;
  overflow: visible !important;
  background-color: transparent !important;
  background-image: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border: none !important;
  box-shadow: none !important;
  border-radius: 0px !important;
  -webkit-app-region: drag;
}
${multiClusterChildSel} {
  position: relative !important;
  background-color: transparent !important;
  background-image: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border-radius: ${topbarPillRadiusCss} !important;
  ${topbarPillBorderCss}
}
${multiClusterChildSel}::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  pointer-events: none;
  background-color: var(--prism-bg-topbar, var(--prism-surface-topbar));
  background-image: var(--prism-sheen-topbar);
  backdrop-filter: var(--prism-topbar-backdrop);
  -webkit-backdrop-filter: var(--prism-topbar-backdrop);
  box-shadow: inset 0 1px 0 var(--prism-specular-topbar);
}`;

  const sbStyleCssBlock = buildSidebarStyleOverrideCss(regions.sidebar.listStyle, leftSbScope);
  const sbTypoCssBlock = buildSidebarTypographyCss(cfg, leftSbScope);
  const regionTypoCssBlock = buildRegionTypographyCss(cfg, regions, {
    tbCarriers,
    rightPaneCarriers,
    composerCarriers,
  });

  const welcomeLogoNotGuards =
    ':not(button):not(button *):not(a):not(a *):not([role="button"]):not([role="button"] *)' +
    ':not([data-testid="agent-input-box"] *):not(.surface-composer-card *)' +
    ':not(pre *):not(code *):not(.md-code-block *)' +
    ':not([role="dialog"] *):not([role="menu"] *):not([data-testid="plugin-detail"] *)';
  const welcomeLogoCssBlock = cfg.hideWelcomeLogo
    ? `
:is([data-main-content-body], [data-testid="conversation-view"]) :is(${WELCOME_LOGO_EXPLICIT_SELECTORS.join(', ')})${welcomeLogoNotGuards} {
  opacity: 0 !important;
  visibility: hidden !important;
  pointer-events: none !important;
}`
    : '';

  const solidPopoversList = SOLID_POPOVERS.join(', ');

  return `/* agy-wallpaper-prism v2.3.0 zero-JS static-css sheet */
:root, body.dark, html.dark body {
${buildPolarityTokenVarsCss(cfg, darkTok, false)}
  --prism-static-wall: ${wallBgDark};
}
body.light, html.light body {
${buildPolarityTokenVarsCss(cfg, lightTok, true)}
  --prism-static-wall: ${wallBgLight};
}

html:not([data-has-browser-hole="true"]):not(:has(> body[data-has-browser-hole="true"])) {
  background-color: var(--prism-native-floor, #070708) !important;
}
body {
  isolation: isolate;
  background-color: transparent !important;
}
body:not([data-has-browser-hole="true"])::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none !important;
  background-image: var(--prism-static-wall);
  background-size: ${fitCss};
  background-position: ${Number(cfg.layerPosX ?? 50)}% ${Number(cfg.layerPosY ?? 50)}%;
  background-repeat: no-repeat;
  opacity: ${Number(cfg.mediaOpacity ?? 1)};
}
html[data-has-browser-hole="true"],
html[data-has-browser-hole="true"] body,
body[data-has-browser-hole="true"] {
  background: transparent !important;
}
html[data-has-browser-hole="true"] body::before,
body[data-has-browser-hole="true"]::before {
  display: none !important;
}

body,
:where(#root, #root > div, #root .dark, #root .light, #root .theme-dark, #root .theme-light, .agy-shell, .agy-inset-shell, .agy-sheet:not([data-browser-occluder]), .monaco-workbench)${sibEx}${dlgDescEx} {
  --background: transparent !important;
  --color-background: transparent !important;
  --body-background: transparent !important;
  --shell: transparent !important;
  --shell-canvas: transparent !important;
  --content: var(--prism-surface-chat) !important;
  --sidebar: var(--prism-surface-sidebar) !important;
  --color-sidebar: var(--prism-surface-sidebar) !important;
  --sidebar-muted: var(--prism-sidebar-muted) !important;
  --sidebar-secondary: var(--prism-sidebar-secondary) !important;
  --card: var(--prism-surface-card) !important;
  --color-card: var(--prism-surface-card) !important;
  --card-border: var(--prism-border-card) !important;
  --card-edge: var(--prism-border-workspace) !important;
  --border: var(--prism-border-sash) !important;
  --color-border: var(--prism-border-sash) !important;
  --popover: var(--prism-surface-popover) !important;
  --secondary: var(--prism-secondary-bg) !important;
  --muted: var(--prism-muted-bg) !important;
  --primary: var(--prism-accent) !important;
  --color-primary: var(--prism-accent) !important;
  --primary-foreground: var(--prism-accent-fg) !important;
  --link: var(--prism-link) !important;
  --vscode-sideBar-background: transparent !important;
  --vscode-sideBarSectionHeader-background: transparent !important;
  --vscode-activityBar-background: transparent !important;
}${
  cfg.transparentWindowControls !== false
    ? `
html:not([data-has-browser-hole="true"]) body {
  --background: #00000000 !important;
}`
    : ''
}

#root, .monaco-workbench { position: relative; z-index: 1; }
:where(#root, #root > div${sibEx}, #root > div > div${sibEx}, #root > div > div > div${sibEx}, .agy-shell, .agy-inset-shell, .agy-sheet:not([data-browser-occluder]), .browser-hole-ancestor, .browser-hole-opaque${sibEx}${dlgDescEx}, .agy-sheet[data-sheet-inset] [data-main-content-body], .agy-sheet [data-side-panel-body], [data-has-browser-hole="true"]${sibEx}, [data-browser-hole]:not([data-browser-hole="false"]), .monaco-workbench) {
  background-color: transparent !important;
  background-image: none !important;
}

:is(.agy-shell > :has([data-testid="title-menu-bar"]), .agy-shell :has(> [data-testid="title-menu-bar"])):not(.agy-shell):not(#root):not(body)${notHole} {
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border: none !important;
  box-shadow: none !important;
  border-radius: 0px !important;
  overflow: visible !important;
  -webkit-app-region: drag !important;
}
[data-testid="title-menu-bar"] :is(button, a, input, [role="button"], [role="menuitem"], [role="tab"], [data-testid="title-menu-bar-item"], [data-browser-occluder="true"], [data-browser-occluder="true"] *) {
  -webkit-app-region: no-drag;
}

${topbarCssBlock}
:is([data-testid="title-menu-bar"] button, [data-testid="title-menu-bar-item"]) {
  border-radius: var(--prism-r-ctl) !important;
}

${sbHostCss} {
  position: relative !important;
  isolation: isolate;
  background-color: transparent !important;
  background-image: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
${sbBeforeCss} {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  pointer-events: none;
  background-color: var(--prism-surface-sidebar);
  background-image: var(--prism-sheen-sidebar);
  backdrop-filter: var(--prism-sidebar-backdrop);
  -webkit-backdrop-filter: var(--prism-sidebar-backdrop);
  box-shadow: inset 0 1px 0 var(--prism-specular-sidebar);
}
${leftSbScope} .bg-sidebar:not([style*="sticky"]):not(.sticky):not([data-sidebar-section-drop-id]):not([data-testid="project-header"]):not([data-project-card]) {
  background-color: transparent !important;
}
.monaco-workbench :is(.part.sidebar, .part.auxiliarybar, .part.activitybar) > :is(.content, .title, .composite.title, .header-or-footer) {
  background-color: transparent !important;
}
:is(.agy-sidebar-row, [data-testid="conversation-row-sidebar"]):has(.agy-row-actions):is(:hover, :focus-visible, :has(:focus-visible)) > .min-w-0 {
  -webkit-mask-image: linear-gradient(to right, #000 0%, #000 calc(100% - 98px), transparent calc(100% - 76px)) !important;
  mask-image: linear-gradient(to right, #000 0%, #000 calc(100% - 98px), transparent calc(100% - 76px)) !important;
}
.agy-row-actions { background: none !important; background-image: none !important; padding-left: 4px !important; }
.agy-row-actions > button {
  color: var(--prism-fg-2) !important;
  background-color: var(--prism-surface-card) !important;
  border: 1px solid var(--prism-border-sidebar) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  box-shadow: var(--prism-chip-shadow) !important;
}
.agy-row-actions > button:is(:hover, :focus-visible) {
  color: var(--prism-fg) !important;
  background-color: var(--prism-surface-popover) !important;
  border-color: var(--prism-border-sidebar-hover) !important;
  box-shadow: var(--prism-chip-shadow-hover) !important;
}
${leftSbScope} [data-sidebar-section-drop-id]:has([data-testid="project-header"], [data-project-card]) {
  background-color: transparent !important;
  background-image: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  box-shadow: none !important;
}
${leftSbScope} [data-sidebar-section-drop-id]:has([data-testid="project-header"], [data-project-card])::before {
  content: none !important;
}
${leftSbScope} :is([data-sidebar-section-drop-id], [data-index][style*="sticky"], [style*="position: sticky"], [style*="position:sticky"]):is(.bg-sidebar, :has([data-testid="section-header"])):not(:has([data-testid="project-header"])):not(:has([data-project-card])),
.sticky:is(.bg-sidebar, .bg-background):not(.pointer-events-none):not(:has([data-testid="project-header"])):not(:has([data-project-card])) {
  isolation: isolate;
  background-color: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border-radius: var(--prism-r-ctl) !important;
}
${leftSbScope} :is([data-sidebar-section-drop-id], [data-index][style*="sticky"], [style*="position: sticky"], [style*="position:sticky"]):is(.bg-sidebar, :has([data-testid="section-header"])):not(:has([data-testid="project-header"])):not(:has([data-project-card]))::before,
.sticky:is(.bg-sidebar, .bg-background):not(.pointer-events-none):not(:has([data-testid="project-header"])):not(:has([data-project-card]))::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: var(--prism-r-ctl) !important;
  pointer-events: none;
  background-color: var(--prism-surface-sticky-sidebar) !important;
  background-image: var(--prism-sheen-sidebar);
  backdrop-filter: var(--prism-sticky-backdrop) !important;
  -webkit-backdrop-filter: var(--prism-sticky-backdrop) !important;
  border: 1px solid var(--prism-border-sidebar);
  box-shadow: var(--prism-sticky-shadow);
}
${leftSbScope} :is([data-sidebar-section-drop-id], [data-index][style*="sticky"], [style*="position: sticky"], [style*="position:sticky"]):not(:has([data-testid="project-header"])):not(:has([data-project-card])) .bg-sidebar {
  background-color: transparent !important;
}
:is(button[data-testid="project-header"], [data-project-card="true"]) {
  position: relative !important;
  isolation: isolate;
  background-color: transparent !important;
  background-image: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border-radius: var(--prism-r-ctl) !important;
}
:is(button[data-testid="project-header"], [data-project-card="true"])::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  pointer-events: none;
  background-color: var(--prism-surface-sidebar-deep) !important;
  background-image: var(--prism-sheen-sidebar);
  backdrop-filter: var(--prism-project-backdrop) !important;
  -webkit-backdrop-filter: var(--prism-project-backdrop) !important;
  border: 1px solid var(--prism-border-sidebar);
  box-shadow: var(--prism-proj-shadow);
}
:is(button[data-testid="project-header"]:is(:hover, :focus-visible), .group\\/header:hover button[data-testid="project-header"], [data-project-card="true"]:is(:hover, :focus-visible))::before {
  border-color: var(--prism-accent-border) !important;
}
${leftSbScope} .group\\/header > div.absolute > :is(button, a) {
  border-radius: var(--prism-r-xs) !important;
  color: var(--prism-fg-2) !important;
  background-color: var(--prism-proj-act-bg) !important;
  border: 1px solid var(--prism-border-sidebar) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  box-shadow: var(--prism-chip-shadow) !important;
}
${leftSbScope} .group\\/header > div.absolute > :is(button, a):is(:hover, :focus-visible) {
  color: var(--prism-fg) !important;
  background-color: var(--prism-surface-popover) !important;
  border-color: var(--prism-border-sidebar-hover) !important;
  box-shadow: var(--prism-chip-shadow-hover) !important;
}${sbStyleCssBlock}${sbTypoCssBlock}
.surface-opaque.bg-background {
  background-color: var(--prism-surface-card) !important;
}

${workspaceHostCss} {
  position: relative !important;
  isolation: isolate;
  background-color: transparent !important;
  background-image: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
${chatBeforeCss} {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  pointer-events: none;
  background-color: var(--prism-surface-chat);
  background-image: var(--prism-sheen-workspace);
  backdrop-filter: var(--prism-chat-backdrop);
  -webkit-backdrop-filter: var(--prism-chat-backdrop);
  box-shadow: inset 0 1px 0 var(--prism-specular-workspace);
}
${rightPaneBeforeCss} {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  pointer-events: none;
  background-color: var(--prism-surface-right-pane, var(--prism-surface-chat));
  background-image: var(--prism-sheen-right-pane);
  backdrop-filter: var(--prism-right-pane-backdrop);
  -webkit-backdrop-filter: var(--prism-right-pane-backdrop);
  box-shadow: inset 0 1px 0 var(--prism-specular-right-pane);
}
[data-testid="aux-pane-split"] :is([data-testid="conversation-view"], [data-main-content-header], [data-side-panel-strip], .agy-sheet [data-side-panel-body], [data-side-panel-body]) {
  background-color: transparent !important;
  background-image: none !important;
}

${mainPageHostCss} {
  position: relative !important;
  isolation: isolate;
  background-color: transparent !important;
  background-image: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
${mainPageBeforeCss} {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  pointer-events: none;
  background-color: var(--prism-surface-main-page);
  background-image: var(--prism-sheen-main-page);
  backdrop-filter: var(--prism-chat-backdrop);
  -webkit-backdrop-filter: var(--prism-chat-backdrop);
  box-shadow: inset 0 1px 0 var(--prism-specular-main-page);
}
:is([data-testid="customization-card"], .agy-spotlight-card, [data-testid="marketplace-bundles-banner"]) {
  background-color: var(--prism-surface-card) !important;
  background-image: var(--prism-sheen-card) !important;
  backdrop-filter: var(--prism-card-backdrop) !important;
  -webkit-backdrop-filter: var(--prism-card-backdrop) !important;
  border-style: solid !important;
  border-top-width: var(--prism-bw-card-top, 1px) !important;
  border-right-width: var(--prism-bw-card-right, 1px) !important;
  border-bottom-width: var(--prism-bw-card-bottom, 1px) !important;
  border-left-width: var(--prism-bw-card-left, 1px) !important;
  border-color: var(--prism-border-card) !important;
  border-radius: var(--prism-r-card) !important;
  box-shadow: inset 0 1px 0 var(--prism-specular-card), var(--prism-shadow-card) !important;
}
[data-testid="customization-card"]:hover {
  background-color: var(--prism-secondary-bg) !important;
  border-color: var(--prism-accent-border) !important;
}
:is(.agy-field:has([data-testid="customizations-search"]), [data-testid="plugins-tabs"]) {
  background-color: var(--prism-cust-pill-bg) !important;
  border-color: var(--prism-border-card) !important;
  backdrop-filter: var(--prism-chrome-chip-backdrop) !important;
  -webkit-backdrop-filter: var(--prism-chrome-chip-backdrop) !important;
}

${compHostCss} {
  position: relative !important;
  isolation: isolate;
  overflow: visible !important;
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  outline: none !important;
  border-style: solid !important;
  border-top-width: var(--prism-bw-composer-top, 1px) !important;
  border-right-width: var(--prism-bw-composer-right, 1px) !important;
  border-bottom-width: var(--prism-bw-composer-bottom, 1px) !important;
  border-left-width: var(--prism-bw-composer-left, 1px) !important;
  border-color: var(--prism-border-composer) !important;
  border-radius: var(--prism-r-composer, var(--prism-r-card)) !important;
  box-shadow: var(--prism-shadow-composer) !important;
  --glass: transparent;
  --glass-border: transparent;
  --glass-highlight: transparent;
}
${compBeforeCss} {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  pointer-events: none;
  background-color: var(--prism-surface-composer);
  background-image: var(--prism-sheen-composer);
  backdrop-filter: var(--prism-composer-backdrop);
  -webkit-backdrop-filter: var(--prism-composer-backdrop);
  box-shadow: inset 0 1px 0 var(--prism-specular-composer);
}
:is([data-main-content-body], [data-testid="conversation-view"], [data-testid="aux-pane-split"]) :is(div, section):has(> #antigravity\\.agentSidePanelInputBox):not([data-main-content-body]):not([data-testid="conversation-view"]):not([data-testid="aux-pane-split"]):not([data-testid="aux-pane-split"] > :first-child):not(.agy-shell):not(.agy-inset-shell):not(.composer-dock) {
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
#antigravity\\.agentSidePanelInputBox > :is(.surface-composer-card, .surface-composer, .agy-composer, [data-testid="agent-input-box"], div:first-child:has(~ .surface-composer-card):not(.surface-composer-card):not([data-testid*="attachment"]):not([data-testid*="chip"]):not([role="menu"]):not([role="listbox"])),
#antigravity\\.agentSidePanelInputBox :is(.surface-composer-card, .surface-composer, .agy-composer, [data-testid="agent-input-box"]),
[data-testid="agent-input-box"]:not(#antigravity\\.agentSidePanelInputBox) :is(.surface-composer-card, .surface-composer, .agy-composer, [data-testid="agent-input-box"]) {
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
  border-radius: 0px !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
#antigravity\\.agentSidePanelInputBox :is(.surface-composer-card, .surface-composer, .agy-composer, [data-testid="agent-input-box"])::before,
#antigravity\\.agentSidePanelInputBox :is(.surface-composer-card, .surface-composer, .agy-composer, [data-testid="agent-input-box"])::after,
#antigravity\\.agentSidePanelInputBox > div:first-child:has(~ .surface-composer-card):not(.surface-composer-card):not([data-testid*="attachment"]):not([data-testid*="chip"])::before,
#antigravity\\.agentSidePanelInputBox > div:first-child:has(~ .surface-composer-card):not(.surface-composer-card):not([data-testid*="attachment"]):not([data-testid*="chip"])::after,
[data-testid="agent-input-box"]:not(#antigravity\\.agentSidePanelInputBox) :is(.surface-composer-card, .surface-composer, .agy-composer, [data-testid="agent-input-box"])::before,
[data-testid="agent-input-box"]:not(#antigravity\\.agentSidePanelInputBox) :is(.surface-composer-card, .surface-composer, .agy-composer, [data-testid="agent-input-box"])::after {
  content: none !important;
  display: none !important;
}
#antigravity\\.agentSidePanelInputBox > .surface-composer-card:not(:first-child) {
  border-top: 1px solid var(--prism-border-composer-divider, var(--prism-border-composer)) !important;
}

[data-testid="conversation-view"]:not([data-testid="aux-pane-split"] *):not(.agy-shell > main *)${notHole},
[data-main-content-header]:not([data-testid="aux-pane-split"] *):not(.agy-shell > main *)${notHole} {
  background-color: var(--prism-surface-chat) !important;
  backdrop-filter: none !important;
}
[data-side-panel-strip] {
  border-bottom: 1px solid var(--prism-border-right-pane) !important;
}
[data-testid="new-tab-search-input"] {
  background-color: var(--prism-new-tab-input-bg) !important;
  border: 1px solid var(--prism-border-right-pane) !important;
  border-radius: var(--prism-r-ctl) !important;
  backdrop-filter: var(--prism-chrome-chip-backdrop) !important;
  -webkit-backdrop-filter: var(--prism-chrome-chip-backdrop) !important;
}
[data-testid="new-tab-search-input"]:focus {
  border-color: var(--prism-accent-border) !important;
}
[data-testid^="new-tab-card-"]:is(:hover, :focus-visible) {
  background-color: var(--prism-secondary-bg) !important;
  border-radius: var(--prism-r-ctl) !important;
}
[data-testid="browser-error-overlay"], .monaco-workbench .part.editor > .content, .monaco-workbench .editor-group-container, .monaco-workbench .part.panel, [data-testid="background-task-command"] {
  background-color: var(--prism-surface-editor) !important;
  backdrop-filter: none !important;
}
pre, .code-block, .md-code-block {
  background-color: var(--prism-surface-code-block) !important;
  border-style: solid !important;
  border-top-width: var(--prism-bw-card-top, 1px) !important;
  border-right-width: var(--prism-bw-card-right, 1px) !important;
  border-bottom-width: var(--prism-bw-card-bottom, 1px) !important;
  border-left-width: var(--prism-bw-card-left, 1px) !important;
  border-color: var(--prism-border-card) !important;
  border-radius: var(--prism-r-ctl) !important;
  backdrop-filter: var(--prism-code-backdrop) !important;
  -webkit-backdrop-filter: var(--prism-code-backdrop) !important;
}
pre code, .md-code-block pre {
  background: transparent !important;
  border: none !important;
  backdrop-filter: none !important;
}
:is([data-main-content-body], .agy-sheet [data-side-panel-body], [data-side-panel-body])::after {
  display: none !important;
}
${
  isIslands
    ? `.agy-shell { padding: var(--prism-workspace-pad) !important; gap: var(--prism-island-gap) !important; box-sizing: border-box !important; }
${
  cfg.topbarStyle === 'bar'
    ? `:is([data-testid="title-menu-bar"], .monaco-workbench .part.titlebar)${notHole} {
  border-radius: var(--prism-r-topbar-pill) !important;
  border-style: solid !important;
  border-top-width: var(--prism-bw-topbar-top, 1px) !important;
  border-right-width: var(--prism-bw-topbar-right, 1px) !important;
  border-bottom-width: var(--prism-bw-topbar-bottom, 1px) !important;
  border-left-width: var(--prism-bw-topbar-left, 1px) !important;
  border-color: var(--prism-border-topbar) !important;
  box-shadow: var(--prism-shadow-topbar) !important;
}
[data-testid="title-menu-bar"]${notHole} {
  width: auto !important;
  margin-right: max(0px, calc(var(--prism-wco-inset-right, 0px) - var(--prism-workspace-pad, 0px))) !important;
}`
    : `:is(header[data-testid="title-menu-bar"], [data-testid="title-menu-bar"][class*="justify-between"])${notHole} {
  width: auto !important;
  margin-right: max(0px, calc(var(--prism-wco-inset-right, 0px) - var(--prism-workspace-pad, 0px))) !important;
}`
}
:is([data-testid="sidebar-split"] > div:first-child, .agy-sidebar, aside[data-side-panel-body]:not(.agy-sheet *):not([data-testid="aux-pane-split"] *))${notHole} {
  border-radius: var(--prism-r-left-island) !important;
  border-style: solid !important;
  border-top-width: var(--prism-bw-sidebar-top, 1px) !important;
  border-right-width: var(--prism-bw-sidebar-right, 1px) !important;
  border-bottom-width: var(--prism-bw-sidebar-bottom, 1px) !important;
  border-left-width: var(--prism-bw-sidebar-left, 1px) !important;
  border-color: var(--prism-border-sidebar) !important;
  box-shadow: var(--prism-shadow-sidebar) !important;
}
.monaco-workbench :is(.part.activitybar, .part.sidebar) {
  margin: calc(var(--prism-island-gap, 8px) * 0.5) !important;
  border-radius: var(--prism-r-left-island) !important;
  border-style: solid !important;
  border-top-width: var(--prism-bw-sidebar-top, 1px) !important;
  border-right-width: var(--prism-bw-sidebar-right, 1px) !important;
  border-bottom-width: var(--prism-bw-sidebar-bottom, 1px) !important;
  border-left-width: var(--prism-bw-sidebar-left, 1px) !important;
  border-color: var(--prism-border-sidebar) !important;
  box-shadow: var(--prism-shadow-sidebar) !important;
}
.monaco-workbench :is(.part.editor .editor-group-container, .part.panel) {
  margin: calc(var(--prism-island-gap, 8px) * 0.5) !important;
  border-radius: var(--prism-r-workspace) !important;
  border-style: solid !important;
  border-top-width: var(--prism-bw-workspace-top, 1px) !important;
  border-right-width: var(--prism-bw-workspace-right, 1px) !important;
  border-bottom-width: var(--prism-bw-workspace-bottom, 1px) !important;
  border-left-width: var(--prism-bw-workspace-left, 1px) !important;
  border-color: var(--prism-border-workspace) !important;
  box-shadow: var(--prism-shadow-workspace) !important;
}
.monaco-workbench .part.auxiliarybar {
  margin: calc(var(--prism-island-gap, 8px) * 0.5) !important;
}
:is([data-testid="aux-pane-split"] > :is(div, main, section):first-child, .agy-shell > main)${notHole} {
  border-radius: var(--prism-r-workspace) !important;
  border-style: solid !important;
  border-top-width: var(--prism-bw-workspace-top, 1px) !important;
  border-right-width: var(--prism-bw-workspace-right, 1px) !important;
  border-bottom-width: var(--prism-bw-workspace-bottom, 1px) !important;
  border-left-width: var(--prism-bw-workspace-left, 1px) !important;
  border-color: var(--prism-border-workspace) !important;
  box-shadow: var(--prism-shadow-workspace) !important;
}
:is([data-testid="aux-pane-split"] > :is(div, aside, section):last-child:not(:first-child):not([hidden]):not([aria-hidden="true"]), .monaco-workbench .part.auxiliarybar)${notHole} {
  border-radius: var(--prism-r-right-island) !important;
  border-style: solid !important;
  border-top-width: var(--prism-bw-right-pane-top, 1px) !important;
  border-right-width: var(--prism-bw-right-pane-right, 1px) !important;
  border-bottom-width: var(--prism-bw-right-pane-bottom, 1px) !important;
  border-left-width: var(--prism-bw-right-pane-left, 1px) !important;
  border-color: var(--prism-border-right-pane) !important;
  box-shadow: var(--prism-shadow-right-pane) !important;
}
:is([data-testid="sidebar-split"], [data-testid="aux-pane-split"]) > div:nth-child(2) { width: var(--prism-island-gap) !important; background: transparent !important; border: none !important; }`
    : `${
        cfg.topbarStyle === 'bar'
          ? `:is([data-testid="title-menu-bar"], .monaco-workbench .part.titlebar)${notHole} {
  border-radius: 0px !important;
  border: none !important;
  border-bottom: var(--prism-bw-topbar-bottom, 1px) solid var(--prism-border-topbar) !important;
  box-shadow: none !important;
}
[data-testid="title-menu-bar"]${notHole} {
  width: auto !important;
  margin-right: var(--prism-wco-inset-right, 0px) !important;
}`
          : `:is(header[data-testid="title-menu-bar"], [data-testid="title-menu-bar"][class*="justify-between"])${notHole} {
  width: auto !important;
  margin-right: var(--prism-wco-inset-right, 0px) !important;
}`
      }
:is([data-testid="sidebar-split"], [data-testid="aux-pane-split"]) > div:nth-child(2) { width: 1px !important; background-color: var(--prism-border-sash) !important; }
:is([data-testid="sidebar-split"] > div:first-child, .agy-sidebar, aside[data-side-panel-body]:not(.agy-sheet *):not([data-testid="aux-pane-split"] *))${notHole} { border-right: var(--prism-bw-sidebar-right, 1px) solid var(--prism-border-sidebar) !important; }
:is([data-side-panel-strip]:not([data-testid="aux-pane-split"] *), .agy-sheet [data-side-panel-body]:not([data-testid="aux-pane-split"] *))${notHole} {
  background-color: var(--prism-surface-right-pane, var(--prism-surface-chat)) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}`
}

.settings-modal-backdrop {
  background-color: rgba(0, 0, 0, 0.45) !important;
  backdrop-filter: blur(12px) saturate(120%) !important;
  -webkit-backdrop-filter: blur(12px) saturate(120%) !important;
}
[data-testid="modal-backdrop"] {
  background-color: rgba(0, 0, 0, 0.52) !important;
  backdrop-filter: blur(8px) saturate(120%) !important;
  -webkit-backdrop-filter: blur(8px) saturate(120%) !important;
}
[data-testid="media-modal"] {
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  border: none !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
:is(${solidPopoversList}) {
  --background: var(--prism-surface-popover) !important;
  --color-background: var(--prism-surface-popover) !important;
  --content: var(--prism-surface-popover) !important;
  background-color: var(--prism-surface-popover) !important;
  background-image: var(--prism-sheen-popover) !important;
  backdrop-filter: var(--prism-popover-backdrop) !important;
  -webkit-backdrop-filter: var(--prism-popover-backdrop) !important;
  border-style: solid !important;
  border-top-width: var(--prism-bw-popover-top, 1px) !important;
  border-right-width: var(--prism-bw-popover-right, 1px) !important;
  border-bottom-width: var(--prism-bw-popover-bottom, 1px) !important;
  border-left-width: var(--prism-bw-popover-left, 1px) !important;
  border-color: var(--prism-border-popover) !important;
  box-shadow: inset 0 1px 0 var(--prism-specular-popover), var(--prism-shadow-popover) !important;
}
:is([data-testid="title-menu-bar"] [data-browser-occluder="true"], .surface-opaque.bg-sidebar:not(.sticky):not([style*="sticky"])) {
  border-radius: var(--prism-r-popover, var(--prism-r-card)) !important;
}
:is(.agy-dialog, .settings-modal-container, [role="dialog"]:not(#gemini-neko-observer-modal):not([data-testid="media-modal"]):not(.prism-sheet), [role="alertdialog"]) :where(.dark, .light, .theme-dark, .theme-light) {
  --background: var(--prism-surface-popover) !important;
  --color-background: var(--prism-surface-popover) !important;
  --content: var(--prism-surface-popover) !important;
}
:is(.text-background, .ag-cs-home-heat-hint) {
  color: rgb(var(--prism-base-rgb)) !important;
}${regionTypoCssBlock}${welcomeLogoCssBlock}
`;
}

export const buildStaticPrismCss = buildStaticCssSheet;

export { PRISM_DOM, enforceFgContrastRgb, resolveRegionFgColor, sanitizeFontFamily };
