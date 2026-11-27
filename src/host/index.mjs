// Host injection script loader & client skin payload builder for agy-wallpaper-prism v2.5.0.
// Consumed by `sidecars/prism_studio/main.mjs`, `cdp-bridge.mjs`, and `test/verify-all.mjs`.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BORDER_STYLES,
  DEFAULT_CONFIG,
  DEFAULT_REGION_ENTRY,
  DEFAULT_SIDEBAR_REGION_ENTRY,
  GLASS_STYLES,
  PRISM_DOM,
  REGION_FONT_SIZE_BOUNDS,
  REGION_IDS,
  REGION_OPTICAL_KEYS,
  SIDEBAR_LIST_STYLES,
  SURFACE_TINT_BOUNDS,
  ZERO_BLUR_BY_DEFAULT_REGIONS,
  enforceFgContrastRgb,
  nullableNum,
  resolveComponentDefaultAlpha,
  resolveEffectiveConfig,
  resolveRegionEffectiveStyle,
  resolveRegionFgColor,
  resolveSchemeTokens,
  sanitizeConfig,
  sanitizeFontFamily,
} from '../shared/schema.mjs';

const VERSION = '2.4.0';
const ZERO_BLUR_REGION_SET = new Set(ZERO_BLUR_BY_DEFAULT_REGIONS);

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

  const normalizePayloadItem = (rawItem, fallbackId = '') => {
    if (!rawItem || typeof rawItem !== 'object') return null;
    const kind = String(rawItem.kind || effective.kind || 'image');
    const sceneMode = String(rawItem.sceneMode || '');
    const thumbUrl = resolveMediaUrl(rawItem.thumbUrl, mediaOrigin);
    const sceneVideoUrl = resolveMediaUrl(rawItem.sceneVideoUrl, mediaOrigin);
    const sceneLiveUrl = resolveMediaUrl(rawItem.sceneLiveUrl, mediaOrigin);
    const videoStageUrl = resolveMediaUrl(rawItem.videoStageUrl, mediaOrigin);
    const webUrl = resolveMediaUrl(rawItem.webUrl, mediaOrigin);
    const audioUrl = resolveMediaUrl(rawItem.audioUrl, mediaOrigin);
    const mseFmp4Url = resolveMediaUrl(rawItem.mseFmp4Url, mediaOrigin);
    let mediaUrl = resolveMediaUrl(rawItem.mediaUrl, mediaOrigin);
    if (kind === 'scene' && (sceneMode === 'video' || sceneMode === 'scene-video') && sceneVideoUrl) {
      mediaUrl = sceneVideoUrl;
    }

    const pluginMediaUrl =
      toPluginProxyUrl(mediaUrl, mediaOrigin, pluginOrigin) || String(rawItem.pluginMediaUrl || '').trim();
    const pluginThumbUrl =
      toPluginProxyUrl(thumbUrl, mediaOrigin, pluginOrigin) || String(rawItem.pluginThumbUrl || '').trim();
    const pluginAudioUrl =
      toPluginProxyUrl(audioUrl, mediaOrigin, pluginOrigin) || String(rawItem.pluginAudioUrl || '').trim();
    const pluginVideoStageUrl =
      toPluginProxyUrl(videoStageUrl, mediaOrigin, pluginOrigin) || String(rawItem.pluginVideoStageUrl || '').trim();
    const pluginWebUrl =
      toPluginProxyUrl(webUrl, mediaOrigin, pluginOrigin) || String(rawItem.pluginWebUrl || '').trim();
    const pluginSceneLiveUrl =
      toPluginProxyUrl(sceneLiveUrl, mediaOrigin, pluginOrigin) || String(rawItem.pluginSceneLiveUrl || '').trim();

    return {
      id: String(rawItem.id || fallbackId),
      title: String(rawItem.title || rawItem.id || ''),
      kind,
      source: String(rawItem.source || 'local'),
      sceneMode,
      schemeColor: String(rawItem.schemeColor || ''),
      fileSize: Number(rawItem.fileSize || 0),
      durationSec: Number(rawItem.durationSec || 0),
      thumbUrl,
      mediaUrl,
      videoStageUrl,
      mseFmp4Url,
      pluginMediaUrl,
      pluginThumbUrl,
      pluginAudioUrl,
      pluginVideoStageUrl,
      pluginWebUrl,
      pluginSceneLiveUrl,
      sceneVideoUrl,
      sceneLiveUrl,
      sceneImageUrl: resolveMediaUrl(rawItem.sceneImageUrl, mediaOrigin),
      webUrl,
      audioUrl,
      slidesUrl: resolveMediaUrl(rawItem.slidesUrl, mediaOrigin),
      properties: rawItem.properties || null,
    };
  };

  const normalizedItem = normalizePayloadItem(activeItem, wid);
  const normalizedIntroItem = normalizePayloadItem(extra?.introItem || null, '');

  const slides = Array.isArray(extra?.slides)
    ? extra.slides.map((s) => resolveMediaUrl(s, mediaOrigin))
    : Array.isArray(activeItem?.slides)
      ? activeItem.slides.map((s) => resolveMediaUrl(s, mediaOrigin))
      : undefined;

  const skinEnabled = extra?.skinEnabled !== undefined ? Boolean(extra.skinEnabled) : baseClean.skinEnabled !== false;
  const rawStateRev = Number(extra?.stateRev);
  const stateRevProp = Number.isFinite(rawStateRev) && rawStateRev > 0 ? { stateRev: Math.floor(rawStateRev) } : {};
  const stateEpochProp = extra?.stateEpoch ? { stateEpoch: String(extra.stateEpoch) } : {};
  const rawIntroNonce = Number(extra?.introPreviewNonce);
  const introPreviewNonceProp = Number.isFinite(rawIntroNonce) && rawIntroNonce > 0 ? { introPreviewNonce: Math.floor(rawIntroNonce) } : {};

  return {
    version: PRISM_DOM.skinVersion,
    skinEnabled,
    ...stateRevProp,
    ...stateEpochProp,
    ...introPreviewNonceProp,
    config: effective,
    activeItem: normalizedItem,
    introItem: normalizedIntroItem,
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

const CODE_TYPO_PROTECT_EX =
  ':not(.monaco-editor, .monaco-editor *, .xterm, .xterm *, svg, svg *)';

const CODE_FG_PROTECT_EX =
  ':not(pre code span[style], pre code [class*="token"], pre code [class*="hljs"], .monaco-editor, .monaco-editor *, .xterm, .xterm *, svg, svg *)';

const SIBLING_EXCLUDE =
  ':not(#gemini-neko-pet-root):not(#gemini-neko-observer-modal):not(#gemini-neko-stats-bar):not(#ag-context-meter):not(#ag-usage-monitor-capsule):not(#ag-usage-monitor-portal):not(#deck-metrics-strip):not(#agy-prism-popover):not(#agy-prism-stage):not(#agy-prism-intro-overlay):not(#agy-prism-wco-pill):not(#agy-prism-topbar-pills):not(#agy-prism-inspector-overlay):not(#agy-prism-inspector-hud):not(.settings-modal-backdrop):not(.settings-modal-container):not([data-testid="modal-backdrop"]):not([data-testid="media-modal"]):not(.agy-dialog):not([role="dialog"]):not([role="alertdialog"]):not([role="menu"]):not([role="listbox"]):not([role="tooltip"])';

const SIBLING_DESCENDANT_EXCLUDE =
  ':not(#agy-prism-pill):not(#agy-prism-pill *):not(#gemini-neko-pet-root):not(#gemini-neko-pet-root *):not(#gemini-neko-observer-modal):not(#gemini-neko-observer-modal *):not(#gemini-neko-stats-bar):not(#gemini-neko-stats-bar *):not(#ag-context-meter):not(#ag-context-meter *):not(#ag-usage-monitor-capsule):not(#ag-usage-monitor-capsule *):not(#ag-usage-monitor-portal):not(#ag-usage-monitor-portal *):not(#deck-metrics-strip):not(#deck-metrics-strip *):not(#agy-prism-popover):not(#agy-prism-popover *):not(#agy-prism-intro-overlay):not(#agy-prism-intro-overlay *):not(#agy-prism-inspector-overlay):not(#agy-prism-inspector-overlay *):not(#agy-prism-inspector-hud):not(#agy-prism-inspector-hud *)';

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
  '.agy-fastpick',
  '.compact-tooltip',
  '[class*="react-tooltip"]',
  '.toast-root',
  '.agy-tip-card',
  '.agy-selection-pill',
  '[data-base-ui-portal] :is([role="listbox"], [role="menu"], [role="dialog"], .agy-popover, .agy-overlay)',
  '.surface-glass:not(.surface-composer):not(.surface-composer-card):not(.agy-user-bubble):not(.agy-user-bubble-frame):not(.agy-takeover-card):not(.agy-scroll-bottom)',
]);

const DOM_TYPO_REGION_ORDER = Object.freeze([
  'topbar',
  'sidebar',
  'workspace',
  'assistantBubble',
  'userBubble',
  'codeBlock',
  'card',
  'controls',
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

function cleanGlassStyleLocal(v) {
  if (v === null || v === undefined || v === '' || v === 'auto') return null;
  if (typeof v !== 'string') return null;
  const s = v.trim().toLowerCase();
  if (!s || s === 'auto') return null;
  return GLASS_STYLES.includes(s) ? s : null;
}

/**
 * Sanitize all 12 unified regions (`REGION_IDS`), consuming canonical `regions` 15+4 fields
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

    const rawStyle = resetAllOptical && !hasOwn(rEnt, 'style') ? null : pick('style', def.style ?? null);
    const rawGlass = resetAllOptical && !hasOwn(rEnt, 'glassEnabled') ? null : pick('glassEnabled', def.glassEnabled);
    const rawBlur = resetAllOptical && !hasOwn(rEnt, 'blur') ? null : pick('blur', def.blur);
    const rawSat = resetAllOptical && !hasOwn(rEnt, 'saturation') ? null : pick('saturation', def.saturation ?? null);
    const rawOpacity = resetAllOptical && !hasOwn(rEnt, 'opacity') ? null : pick('opacity', def.opacity);
    const rawTone = resetAllOptical && !hasOwn(rEnt, 'tone') ? 0 : pick('tone', def.tone);
    const rawTint = resetAllOptical && !hasOwn(rEnt, 'tint') ? '' : pick('tint', def.tint);
    const rawBorderOp = resetAllOptical && !hasOwn(rEnt, 'borderOpacity') ? null : pick('borderOpacity', def.borderOpacity);
    const rawElevation = resetAllOptical && !hasOwn(rEnt, 'elevation') ? null : pick('elevation', def.elevation ?? null);
    const rawBorderStyle = pick('borderStyle', def.borderStyle);

    const entry = {
      style: cleanGlassStyleLocal(rawStyle),
      glassEnabled: nullableBoolLocal(rawGlass),
      blur: nullableNum(rawBlur, 0, 64, 0),
      saturation: nullableNum(rawSat, 50, 220, 0),
      opacity: nullableUnitOpacityLocal(rawOpacity, bounds.minOpacity, bounds.maxOpacity),
      tone: clampNum(Math.round(Number(rawTone) || 0), -100, 100),
      tint: cleanTintHexLocal(rawTint),
      borderOpacity: nullableUnitOpacityLocal(rawBorderOp, 0, 1),
      elevation: nullableNum(rawElevation, 0, 2, 2),
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
  const entry = opts.entry || { opacity: null, tone: 0, tint: '', style: null };
  const bounds = opts.bounds || { minOpacity: 0, maxOpacity: 0.98 };
  const isLight = Boolean(opts.isLight);
  const contrastFloor = Boolean(opts.contrastFloor);
  const effStyle = opts.effStyle || null;
  const fgRgb = opts.fgRgb || (isLight ? [15, 23, 42] : [242, 242, 245]);
  const baseOrTint = (entry.tint ? adaptCustomTintRgb(entry.tint, isLight, contrastFloor) : null) || opts.defaultRgb;
  const shiftedRgb = applyToneShiftRgb(baseOrTint, entry.tone, isLight);
  const hasToneOrTint = Boolean(entry.tint) || Number(entry.tone || 0) !== 0;
  const isTintedWash = effStyle === 'tinted' && !entry.tint;
  const mixTargetRgb = isTintedWash && opts.rawWallTintMix === 0 && opts.accentRgb ? opts.accentRgb : opts.wallTintRgb;
  const effectiveWallMix = isTintedWash ? (opts.rawWallTintMix > 0 ? Math.max(opts.wallMixWeight, 0.18) : 0.16) : opts.wallMixWeight;
  const preMixRgb = hasToneOrTint && contrastFloor ? enforceContrastFloorRgb(shiftedRgb, fgRgb, isLight, 4.5) : shiftedRgb;
  const mixedRgb = entry.tint ? preMixRgb : mixRgb(preMixRgb, mixTargetRgb, effectiveWallMix);
  const finalRgb = (hasToneOrTint || isTintedWash) && contrastFloor ? enforceContrastFloorRgb(mixedRgb, fgRgb, isLight, 4.5) : mixedRgb;
  const hasCustomOp = entry.opacity !== null && entry.opacity !== undefined;
  const alpha = opts.solidChrome && !(opts.keepTransparentWhenNone && effStyle === 'none' && !hasCustomOp)
    ? 1
    : hasCustomOp
      ? clampNum(entry.opacity, bounds.minOpacity, bounds.maxOpacity)
      : clampNum(opts.defaultAlpha, 0, 1);
  return {
    preMixRgb,
    rgb: finalRgb,
    alpha,
    rgba: rgbaStr(finalRgb, alpha),
    customized: hasCustomOp || hasToneOrTint || effStyle !== null,
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
 * Coupling curve for #4 shadow opacity fade-out (reaches 0 cleanly at <=0.01 alpha or elevation <=0.001 or shadows=false).
 * Guardrail F-02: NEVER emit phantom shadows on zero-opacity (a <= 0.01) elements even when elevation > 0.
 */
export function computeShadowFactor(alpha, shadowsOn, elevation = null) {
  const a = Number(alpha);
  if (!Number.isFinite(a) || a <= 0.01) return 0;
  if (elevation !== null && elevation !== undefined && elevation !== '') {
    const el = Number(elevation);
    if (Number.isFinite(el)) {
      if (el <= 0.001) return 0;
      return Math.pow(clampNum(Math.max(a, 0.35) / 0.65, 0, 1), 1.15) * clampNum(el, 0, 2);
    }
  }
  if (!shadowsOn) return 0;
  return Math.pow(clampNum(a / 0.65, 0, 1), 1.15);
}

function buildBackdropLocal(px, isLight, isNested, customSat = null, effStyle = null) {
  if (effStyle === 'none' || effStyle === 'tinted' || effStyle === 'solid') return 'none';
  const r = Math.round(clampNum(px, 0, 64));
  if (r <= 0) return 'none';
  const gpuR = softKneeBlur(r);
  const satBoost = r > 28 ? Math.round(Math.min(18, (r - 28) * 0.5)) : 0;
  const hasCustomSat = customSat !== null && customSat !== undefined && customSat !== '' && Number.isFinite(Number(customSat));
  const sat = hasCustomSat
    ? Math.round(clampNum(Number(customSat), 50, 220))
    : effStyle === 'crystal'
      ? (isLight ? 165 : 150)
      : isNested
        ? Math.round(100 + Math.min(15, r * 0.25) + satBoost * 0.4)
        : isLight
          ? Math.round(125 + Math.min(65, r * 1.45) + satBoost)
          : Math.round(115 + Math.min(65, r * 1.35) + satBoost);
  return `blur(${gpuR}px) saturate(${sat}%)`;
}

function resolveRegionBlurPx(entry, defaultPx, globalGlassOn, mediaBlurPx, effStyle = null) {
  const glassOn =
    entry && entry.glassEnabled !== null && entry.glassEnabled !== undefined
      ? Boolean(entry.glassEnabled)
      : Boolean(globalGlassOn);
  if (!glassOn) return 0;
  if (effStyle === 'none' || effStyle === 'tinted' || effStyle === 'solid') return 0;
  let fallbackPx = Number(defaultPx) || 0;
  if (entry?.style === 'frosted' || (effStyle === 'frosted' && fallbackPx <= 0 && entry?.style !== null)) {
    fallbackPx = fallbackPx > 0 ? fallbackPx : 16;
  } else if (effStyle === 'crystal') {
    fallbackPx = fallbackPx > 0 ? Math.max(10, Math.round(fallbackPx * 0.75)) : 12;
  }
  const raw =
    entry && entry.blur !== null && entry.blur !== undefined
      ? clampNum(Math.round(Number(entry.blur)), 0, 64)
      : clampNum(Math.round(fallbackPx), 0, 64);
  if (raw <= 0) return 0;
  const mBlur = Math.max(0, Number(mediaBlurPx) || 0);
  return mBlur > 0 ? Math.max(0, Math.round(raw - mBlur * 0.7)) : raw;
}

function resolveRegionBackdropCss({ id, entry, effStyle, blurPx, alpha, isLight, isNested }) {
  if (blurPx <= 0 || effStyle === 'none' || effStyle === 'tinted' || effStyle === 'solid') {
    return 'none';
  }
  const isDefaultPopover =
    id === 'popover' &&
    (entry?.style === null || entry?.style === undefined) &&
    (entry?.blur === null || entry?.blur === undefined);
  const cutoff = isDefaultPopover ? 0.94 : 0.98;
  if (alpha >= cutoff) return 'none';
  return buildBackdropLocal(blurPx, isLight, isNested, entry?.saturation ?? null, effStyle);
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
  effStyle = null,
  elevation = null,
}) {
  let bf = borderStyle === 'none' ? 0 : computeBorderFactor(alpha, bScale, overrideBorderOp);
  let specularScale = 1;
  let sheenScale = 1;
  if (effStyle === 'crystal') {
    bf = bf > 0 ? Math.min(1, bf * 1.35 + 0.08) : 0;
    specularScale = 1.45;
    sheenScale = 1.35;
  } else if (effStyle === 'tinted') {
    bf = bf * 0.85;
    specularScale = 0.4;
    sheenScale = 0.4;
  } else if (effStyle === 'solid') {
    bf = bf * 0.9;
    specularScale = 0;
    sheenScale = 0;
  }
  const sf = computeShadowFactor(
    alpha,
    isPopover ? Boolean(shadowsOn) : (layoutMode !== 'flush' && Boolean(shadowsOn)),
    elevation
  );
  const border = bf <= 0.001 ? 'transparent' : rgbaStr(ptRgb, baseBorderA * bf);
  const specular =
    bf <= 0.001 || specularScale <= 0
      ? 'transparent'
      : rgbaStr([255, 255, 255], Math.min(1, (isLight ? 0.88 : 0.075) * specularScale * bf));
  const sheen =
    bf <= 0.001 || sheenScale <= 0
      ? 'none'
      : isLight
        ? `linear-gradient(172deg, rgba(255, 255, 255, ${(Math.min(0.95, 0.68 * sheenScale) * bf).toFixed(3)}) 0%, rgba(255, 255, 255, 0) 40%)`
        : `linear-gradient(172deg, rgba(255, 255, 255, ${(Math.min(0.18, 0.042 * sheenScale) * bf).toFixed(3)}) 0%, rgba(255, 255, 255, 0) 38%)`;

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
    entry.style === null &&
    entry.opacity === null &&
    Number(entry.tone || 0) === 0 &&
    !entry.tint &&
    entry.blur === null &&
    entry.saturation === null &&
    entry.glassEnabled === null &&
    entry.borderOpacity === null &&
    entry.elevation === null &&
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
  const accentRgb = parseRgbTriplet(tok.accentRgb);
  const fgRgb = hexToRgb(tok.fg) || (isLight ? [15, 23, 42] : [242, 242, 245]);
  const wallTintRgb = cfg.extractedAccent?.tintRgb
    ? parseRgbTriplet(cfg.extractedAccent.tintRgb)
    : accentRgb;

  const regions = sanitizeRegionsLocal(cfg);
  const cfgEff = { ...cfg, regions };
  const sbBaseRgb = !isLight && rgbSum(tok.shadeRgb) > rgbSum(tok.baseRgb) ? baseRgb : shadeRgb;
  const sbEntry = regions.sidebar;

  const effStyles = {};
  const defAlphas = {};
  for (const id of REGION_IDS) {
    effStyles[id] = resolveRegionEffectiveStyle(id, regions[id], cfgEff);
    defAlphas[id] = resolveComponentDefaultAlpha(id, cfgEff, isLight);
  }

  const defaultQuickPanelBase = isLight ? 0.88 : 0.84;
  const defaultQuickPanelAlpha =
    effStyles.popover === 'solid'
      ? (isLight ? 0.97 : 0.96)
      : effStyles.popover === 'crystal'
        ? clampNum(defaultQuickPanelBase * 0.78, 0.5, 0.99)
        : effStyles.popover === 'tinted'
          ? clampNum(defaultQuickPanelBase * 0.88, 0.5, 0.99)
          : defaultQuickPanelBase;

  const regionSolidChrome = (entry) => (entry.glassEnabled === true ? false : solidChrome);

  const topbarRes = resolveComponentSurfaceLocal({
    entry: regions.topbar,
    effStyle: effStyles.topbar,
    defaultRgb: sbBaseRgb,
    fgRgb,
    wallTintRgb,
    accentRgb,
    rawWallTintMix: wallTintMix,
    wallMixWeight: wallTintMix * 0.75,
    defaultAlpha: defAlphas.topbar,
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
        effStyle: effStyles.wco,
        defaultRgb: topbarRes.hasToneOrTint ? topbarRes.preMixRgb : sbBaseRgb,
        fgRgb,
        wallTintRgb,
        accentRgb,
        rawWallTintMix: wallTintMix,
        wallMixWeight: wallTintMix * 0.75,
        defaultAlpha: wcoEntry.opacity !== null ? wcoEntry.opacity : defAlphas.wco,
        bounds: SURFACE_TINT_BOUNDS.wco,
        isLight,
        contrastFloor,
        solidChrome: regionSolidChrome(wcoEntry),
      });

  const sbSolidChrome = regionSolidChrome(sbEntry);
  const sbRes = resolveComponentSurfaceLocal({
    entry: sbEntry,
    effStyle: effStyles.sidebar,
    defaultRgb: sbBaseRgb,
    fgRgb,
    wallTintRgb,
    accentRgb,
    rawWallTintMix: wallTintMix,
    wallMixWeight: wallTintMix * 0.75,
    defaultAlpha: defAlphas.sidebar,
    bounds: SURFACE_TINT_BOUNDS.sidebar,
    isLight,
    contrastFloor,
    solidChrome: sbSolidChrome,
  });

  const wsRes = resolveComponentSurfaceLocal({
    entry: regions.workspace,
    effStyle: effStyles.workspace,
    defaultRgb: baseRgb,
    fgRgb,
    wallTintRgb,
    accentRgb,
    rawWallTintMix: wallTintMix,
    wallMixWeight: wallTintMix * 0.75,
    defaultAlpha: defAlphas.workspace,
    bounds: SURFACE_TINT_BOUNDS.workspace,
    isLight,
    contrastFloor,
    solidChrome: regionSolidChrome(regions.workspace),
  });

  const rightPaneRes = resolveComponentSurfaceLocal({
    entry: regions.rightPane,
    effStyle: effStyles.rightPane,
    defaultRgb: baseRgb,
    fgRgb,
    wallTintRgb,
    accentRgb,
    rawWallTintMix: wallTintMix,
    wallMixWeight: wallTintMix * 0.75,
    defaultAlpha: defAlphas.rightPane,
    bounds: SURFACE_TINT_BOUNDS.rightPane,
    isLight,
    contrastFloor,
    solidChrome: regionSolidChrome(regions.rightPane),
  });

  const compRes = resolveComponentSurfaceLocal({
    entry: regions.composer,
    effStyle: effStyles.composer,
    defaultRgb: tint1Rgb,
    fgRgb,
    wallTintRgb,
    accentRgb,
    rawWallTintMix: wallTintMix,
    wallMixWeight: wallTintMix,
    defaultAlpha: defAlphas.composer,
    bounds: SURFACE_TINT_BOUNDS.composer,
    isLight,
    contrastFloor,
    solidChrome: regionSolidChrome(regions.composer),
  });

  const cardRes = resolveComponentSurfaceLocal({
    entry: regions.card,
    effStyle: effStyles.card,
    defaultRgb: tint1Rgb,
    fgRgb,
    wallTintRgb,
    accentRgb,
    rawWallTintMix: wallTintMix,
    wallMixWeight: wallTintMix,
    defaultAlpha: defAlphas.card,
    bounds: SURFACE_TINT_BOUNDS.card,
    isLight,
    contrastFloor,
    solidChrome: regionSolidChrome(regions.card),
  });

  const userBubbleRes = resolveComponentSurfaceLocal({
    entry: regions.userBubble,
    effStyle: effStyles.userBubble,
    defaultRgb: tint1Rgb,
    fgRgb,
    wallTintRgb,
    accentRgb,
    rawWallTintMix: wallTintMix,
    wallMixWeight: wallTintMix,
    defaultAlpha: defAlphas.userBubble,
    bounds: SURFACE_TINT_BOUNDS.userBubble,
    isLight,
    contrastFloor,
    solidChrome: regionSolidChrome(regions.userBubble),
  });

  const assistantBubbleRes = resolveComponentSurfaceLocal({
    entry: regions.assistantBubble,
    effStyle: effStyles.assistantBubble,
    defaultRgb: baseRgb,
    fgRgb,
    wallTintRgb,
    accentRgb,
    rawWallTintMix: wallTintMix,
    wallMixWeight: wallTintMix * 0.75,
    defaultAlpha: defAlphas.assistantBubble,
    bounds: SURFACE_TINT_BOUNDS.assistantBubble,
    isLight,
    contrastFloor,
    solidChrome: regionSolidChrome(regions.assistantBubble),
    keepTransparentWhenNone: true,
  });

  const codeBlockRes = resolveComponentSurfaceLocal({
    entry: regions.codeBlock,
    effStyle: effStyles.codeBlock,
    defaultRgb: effStyles.codeBlock === 'solid' ? tint1Rgb : baseRgb,
    fgRgb,
    wallTintRgb,
    accentRgb,
    rawWallTintMix: wallTintMix,
    wallMixWeight: wallTintMix * 0.5,
    defaultAlpha: defAlphas.codeBlock,
    bounds: SURFACE_TINT_BOUNDS.codeBlock,
    isLight,
    contrastFloor,
    solidChrome: regionSolidChrome(regions.codeBlock),
  });

  const controlsRes = resolveComponentSurfaceLocal({
    entry: regions.controls,
    effStyle: effStyles.controls,
    defaultRgb: tint2Rgb,
    fgRgb,
    wallTintRgb,
    accentRgb,
    rawWallTintMix: wallTintMix,
    wallMixWeight: wallTintMix * 0.75,
    defaultAlpha: defAlphas.controls,
    bounds: SURFACE_TINT_BOUNDS.controls,
    isLight,
    contrastFloor,
    solidChrome: regionSolidChrome(regions.controls),
  });

  const popRes = resolveComponentSurfaceLocal({
    entry: regions.popover,
    effStyle: effStyles.popover,
    defaultRgb: popRgb,
    fgRgb,
    wallTintRgb,
    accentRgb,
    rawWallTintMix: wallTintMix,
    wallMixWeight: wallTintMix * 0.4,
    defaultAlpha: defAlphas.popover,
    bounds: SURFACE_TINT_BOUNDS.popover,
    isLight,
    contrastFloor,
    solidChrome: false,
  });

  const quickPanelRes = resolveComponentSurfaceLocal({
    entry: regions.popover,
    effStyle: effStyles.popover,
    defaultRgb: popRgb,
    fgRgb,
    wallTintRgb,
    accentRgb,
    rawWallTintMix: wallTintMix,
    wallMixWeight: wallTintMix * 0.4,
    defaultAlpha: defaultQuickPanelAlpha,
    bounds: SURFACE_TINT_BOUNDS.popover,
    isLight,
    contrastFloor,
    solidChrome: false,
  });

  const turnCardAlpha =
    regionSolidChrome(regions.assistantBubble)
      ? 1
      : assistantBubbleRes.hasCustomOp || effStyles.assistantBubble === 'solid'
        ? assistantBubbleRes.alpha
        : effStyles.assistantBubble === 'frosted' || effStyles.assistantBubble === 'crystal'
          ? Math.max(assistantBubbleRes.alpha, isLight ? 0.56 : 0.44)
          : clampNum(glassOp * (isLight ? 0.8 : 0.64), isLight ? 0.52 : 0.42, 0.88);
  const turnCardRgb = assistantBubbleRes.hasToneOrTint
    ? assistantBubbleRes.rgb
    : mixRgb(tint1Rgb, wallTintRgb, wallTintMix);
  const surfTurnCard = rgbaStr(turnCardRgb, turnCardAlpha);

  const controlActiveAlpha =
    regionSolidChrome(regions.controls)
      ? 1
      : regions.controls.opacity !== null
        ? clampNum(Math.max(controlsRes.alpha, 0.56), 0.35, 0.96)
        : effStyles.controls === 'solid'
          ? (isLight ? 0.97 : 0.96)
          : isLight
            ? 0.82
            : 0.74;
  const surfControlActive = rgbaStr(
    mixRgb(controlsRes.hasToneOrTint ? controlsRes.rgb : tint2Rgb, accentRgb, isLight ? 0.18 : 0.22),
    controlActiveAlpha
  );
  const surfControlHover = `rgba(${tok.ptRgb}, ${isLight ? '0.075' : '0.085'})`;
  const surfSelected = rgbaStr(mixRgb(tint2Rgb, accentRgb, isLight ? 0.22 : 0.28), isLight ? 0.22 : 0.24);

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

  const topbarBlurPx = resolveRegionBlurPx(regions.topbar, blurBase, globalGlassOn, mediaBlurPx, effStyles.topbar);
  const wcoDefaultBlur = regions.topbar.blur !== null && regions.topbar.blur !== undefined ? regions.topbar.blur : blurBase;
  const wcoBlurPx = wcoIsAuto
    ? topbarBlurPx
    : wcoEntry.blur === null && wcoEntry.glassEnabled === null && wcoEntry.style === null
      ? topbarBlurPx
      : resolveRegionBlurPx(wcoEntry, wcoDefaultBlur, globalGlassOn, mediaBlurPx, effStyles.wco);
  const sbBlurPx = resolveRegionBlurPx(sbEntry, sbDefaultBlur, globalGlassOn, mediaBlurPx, effStyles.sidebar);
  const wsBlurPx = resolveRegionBlurPx(regions.workspace, blurBase, globalGlassOn, mediaBlurPx, effStyles.workspace);
  const rightPaneBlurPx = resolveRegionBlurPx(regions.rightPane, blurBase, globalGlassOn, mediaBlurPx, effStyles.rightPane);
  const compBlurPx = resolveRegionBlurPx(regions.composer, compDefaultBlur, globalGlassOn, mediaBlurPx, effStyles.composer);
  const cardBlurPx = resolveRegionBlurPx(regions.card, 0, globalGlassOn, mediaBlurPx, effStyles.card);
  const userBubbleBlurPx = resolveRegionBlurPx(regions.userBubble, 0, globalGlassOn, mediaBlurPx, effStyles.userBubble);
  const assistantBlurPx = resolveRegionBlurPx(regions.assistantBubble, 0, globalGlassOn, mediaBlurPx, effStyles.assistantBubble);
  const codeDefaultBlur =
    regions.codeBlock.style === 'frosted'
      ? (blurBase > 0 ? blurBase : 16)
      : cfg.codeReadabilityMode === 'frosted' && wsBlurPx > 0
        ? Math.max(4, Math.round(wsBlurPx * 0.85))
        : 0;
  const codeBlurPx = resolveRegionBlurPx(regions.codeBlock, codeDefaultBlur, globalGlassOn, mediaBlurPx, effStyles.codeBlock);
  const controlsBlurPx = resolveRegionBlurPx(regions.controls, 0, globalGlassOn, mediaBlurPx, effStyles.controls);
  const popBlurPx = resolveRegionBlurPx(regions.popover, popDefaultBlur, globalGlassOn, mediaBlurPx, effStyles.popover);

  const blurLg = !solidChrome && blurMd > 0 ? Math.min(64, blurMd + 4) : 0;
  const blurXl = !solidChrome && blurMd > 0 ? Math.min(64, blurMd + 6) : 0;

  const sbListStyle = sbEntry.listStyle || 'capsule';
  const topbarBackdropCss = resolveRegionBackdropCss({ id: 'topbar', entry: regions.topbar, effStyle: effStyles.topbar, blurPx: topbarBlurPx, alpha: topbarRes.alpha, isLight, isNested: false });
  const wcoBackdropCss = wcoIsAuto ? topbarBackdropCss : resolveRegionBackdropCss({ id: 'wco', entry: wcoEntry, effStyle: effStyles.wco, blurPx: wcoBlurPx, alpha: wcoRes.alpha, isLight, isNested: false });
  const sbBackdropCss = resolveRegionBackdropCss({ id: 'sidebar', entry: sbEntry, effStyle: effStyles.sidebar, blurPx: sbBlurPx, alpha: sbRes.alpha, isLight, isNested: false });
  const chatBackdropCss = resolveRegionBackdropCss({ id: 'workspace', entry: regions.workspace, effStyle: effStyles.workspace, blurPx: wsBlurPx, alpha: wsRes.alpha, isLight, isNested: false });
  const rightPaneBackdropCss = resolveRegionBackdropCss({ id: 'rightPane', entry: regions.rightPane, effStyle: effStyles.rightPane, blurPx: rightPaneBlurPx, alpha: rightPaneRes.alpha, isLight, isNested: false });
  const compBackdropCss = resolveRegionBackdropCss({ id: 'composer', entry: regions.composer, effStyle: effStyles.composer, blurPx: compBlurPx, alpha: compRes.alpha, isLight, isNested: true });
  const cardBackdropCss = resolveRegionBackdropCss({ id: 'card', entry: regions.card, effStyle: effStyles.card, blurPx: cardBlurPx, alpha: cardRes.alpha, isLight, isNested: true });
  const userBubbleBackdropCss = resolveRegionBackdropCss({ id: 'userBubble', entry: regions.userBubble, effStyle: effStyles.userBubble, blurPx: userBubbleBlurPx, alpha: userBubbleRes.alpha, isLight, isNested: true });
  const assistantBackdropCss = resolveRegionBackdropCss({ id: 'assistantBubble', entry: regions.assistantBubble, effStyle: effStyles.assistantBubble, blurPx: assistantBlurPx, alpha: assistantBubbleRes.alpha, isLight, isNested: true });
  const codeBackdropCss = resolveRegionBackdropCss({ id: 'codeBlock', entry: regions.codeBlock, effStyle: effStyles.codeBlock, blurPx: codeBlurPx, alpha: codeBlockRes.alpha, isLight, isNested: true });
  const controlsBackdropCss = resolveRegionBackdropCss({ id: 'controls', entry: regions.controls, effStyle: effStyles.controls, blurPx: controlsBlurPx, alpha: controlsRes.alpha, isLight, isNested: true });
  const popBackdropCss = resolveRegionBackdropCss({ id: 'popover', entry: regions.popover, effStyle: effStyles.popover, blurPx: popBlurPx, alpha: popRes.alpha, isLight, isNested: false });
  const quickPanelBackdropCss = resolveRegionBackdropCss({ id: 'popover', entry: regions.popover, effStyle: effStyles.popover, blurPx: popBlurPx, alpha: quickPanelRes.alpha, isLight, isNested: false });
  const stickyBackdropCss = stickySbAlpha >= 0.88 || sbListStyle !== 'capsule' ? 'none' : sbBackdropCss;
  const projectBackdropCss = 'none';

  const minEd = contrastFloor ? (isLight ? 0.84 : 0.72) : isLight ? 0.52 : 0.38;
  const rawEdA = isLight ? clampNum(glassOp * 0.96, 0.55, 0.99) : clampNum(glassOp * 0.92, 0.45, 0.98);
  const edAlpha =
    solidChrome || cfg.codeReadabilityMode === 'solid'
      ? 1
      : clampNum(Math.max(rawEdA, minEd * (contrastFloor ? 1 : fidelity)), 0, 0.99);
  const surfEditor = rgbaStr(mixRgb(baseRgb, wallTintRgb, wallTintMix * 0.5), edAlpha);
  const surfCodeBlock = codeBlockRes.rgba;

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
    effStyle: effStyles.topbar,
    elevation: regions.topbar.elevation,
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
        effStyle: effStyles.wco,
        elevation: wcoEntry.elevation,
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
    effStyle: effStyles.sidebar,
    elevation: sbEntry.elevation,
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
    effStyle: effStyles.workspace,
    elevation: regions.workspace.elevation,
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
    effStyle: effStyles.rightPane,
    elevation: regions.rightPane.elevation,
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
    effStyle: effStyles.card,
    elevation: regions.card.elevation,
  });
  const userBubbleEdge = buildRegionEdgeTokens({
    alpha: userBubbleRes.alpha,
    bScale,
    shadowsOn,
    isLight,
    ptRgb,
    baseBorderA: baseCardA,
    overrideBorderOp: regions.userBubble.borderOpacity,
    borderStyle: regions.userBubble.borderStyle,
    isPopover: false,
    layoutMode,
    effStyle: effStyles.userBubble,
    elevation: regions.userBubble.elevation,
  });
  const assistantEdgeBorderStyle =
    assistantBubbleRes.alpha <= 0.01 && regions.assistantBubble.borderStyle === null
      ? 'none'
      : regions.assistantBubble.borderStyle;
  const assistantEdge = buildRegionEdgeTokens({
    alpha: assistantBubbleRes.alpha,
    bScale,
    shadowsOn,
    isLight,
    ptRgb,
    baseBorderA: baseCardA,
    overrideBorderOp: regions.assistantBubble.borderOpacity,
    borderStyle: assistantEdgeBorderStyle,
    isPopover: false,
    layoutMode,
    effStyle: effStyles.assistantBubble,
    elevation: regions.assistantBubble.elevation,
  });
  const turnCardEdge = buildRegionEdgeTokens({
    alpha: turnCardAlpha,
    bScale,
    shadowsOn,
    isLight,
    ptRgb,
    baseBorderA: baseCardA,
    overrideBorderOp: regions.assistantBubble.borderOpacity,
    borderStyle: regions.assistantBubble.borderStyle,
    isPopover: false,
    layoutMode,
    effStyle: effStyles.assistantBubble,
    elevation: regions.assistantBubble.elevation,
  });
  const codeBlockEdge = buildRegionEdgeTokens({
    alpha: codeBlockRes.alpha,
    bScale,
    shadowsOn,
    isLight,
    ptRgb,
    baseBorderA: baseCardA,
    overrideBorderOp: regions.codeBlock.borderOpacity,
    borderStyle: regions.codeBlock.borderStyle,
    isPopover: false,
    layoutMode,
    effStyle: effStyles.codeBlock,
    elevation: regions.codeBlock.elevation,
  });
  const controlsEdge = buildRegionEdgeTokens({
    alpha: controlsRes.alpha,
    bScale,
    shadowsOn,
    isLight,
    ptRgb,
    baseBorderA: baseCardA,
    overrideBorderOp: regions.controls.borderOpacity,
    borderStyle: regions.controls.borderStyle,
    isPopover: false,
    layoutMode,
    effStyle: effStyles.controls,
    elevation: regions.controls.elevation,
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
    effStyle: effStyles.composer,
    elevation: regions.composer.elevation,
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
    effStyle: effStyles.popover,
    elevation: regions.popover.elevation,
  });

  const stickyBf = sbEntry.borderStyle === 'none' ? 0 : computeBorderFactor(stickySbAlpha, bScale, sbEntry.borderOpacity);
  const stickySf = computeShadowFactor(stickySbAlpha, shadowsOn, sbEntry.elevation);
  const stickyShadowParts = [];
  if (stickyBf > 0.001) stickyShadowParts.push(`inset 0 1px 0 ${rgbaStr([255, 255, 255], (isLight ? 0.88 : 0.075) * stickyBf)}`);
  if (stickySf > 0.001) stickyShadowParts.push(`0 3px 10px rgba(0, 0, 0, ${((isLight ? 0.06 : 0.24) * stickySf).toFixed(3)})`);
  const stickyShadowCss = stickyShadowParts.length ? stickyShadowParts.join(', ') : 'none';

  const deepBf = sbEntry.borderStyle === 'none' ? 0 : computeBorderFactor(deepSbAlpha, bScale, sbEntry.borderOpacity);
  const deepSf = computeShadowFactor(deepSbAlpha, shadowsOn, sbEntry.elevation);
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
    effStyle: wsRes.hasCustomOp ? effStyles.workspace : effStyles.sidebar,
    elevation: null,
  });

  const R = computeRadiiLocal(cfg);
  const defaultTopbarPillRad = layoutMode === 'flush' ? R.ctl : Math.min(16, R.island);
  const rTopbarPill = resolveRegionRadiusToken(regions.topbar.radius, `${defaultTopbarPillRad}px`);
  const rWco = wcoIsAuto ? rTopbarPill : resolveRegionRadiusToken(wcoEntry.radius, rTopbarPill);
  const rLeftIsland = resolveIslandCornerRadius(sbEntry.radius, cfg.leftSidebarRadius ?? cfg.leftCornerRadius, R.island);
  const rRightIsland = resolveIslandCornerRadius(regions.rightPane.radius, cfg.rightSidebarRadius ?? cfg.rightCornerRadius, R.island);
  const rWorkspace = resolveRegionRadiusToken(regions.workspace.radius, `${R.island}px`);
  const rCard = resolveRegionRadiusToken(regions.card.radius, `${R.card}px`);
  const defaultUserBubblePx = cfg.cornerStyle === 'sharp' ? 10 : cfg.cornerStyle === 'soft' ? 22 : 20;
  const rBubbleUser = resolveRegionRadiusToken(regions.userBubble.radius, `${defaultUserBubblePx}px`);
  const rBubbleUserFrame = `calc(${rBubbleUser} + 1px)`;
  const rBubbleAssistant = resolveRegionRadiusToken(regions.assistantBubble.radius, `${R.card}px`);
  const defaultCodePx = cfg.cornerStyle === 'sharp' ? 6 : cfg.cornerStyle === 'soft' ? 14 : 12;
  const rCodeBlock = resolveRegionRadiusToken(regions.codeBlock.radius, `${defaultCodePx}px`);
  const rControl = resolveRegionRadiusToken(regions.controls.radius, `${R.ctl}px`);
  const rControlPill =
    regions.controls.radius !== null && regions.controls.radius !== undefined
      ? `${regions.controls.radius}px`
      : cfg.cornerStyle === 'sharp'
        ? `${R.ctl}px`
        : '9999px';
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

  // #14 Per-Region Typography + D7 Opposite-Anchor Foreground Readability Guardrail (camelCase per F-06 across all 12 REGION_IDS)
  const regionSurfaceMap = {
    topbar: topbarRes,
    wco: wcoRes,
    sidebar: sbRes,
    workspace: wsRes,
    card: cardRes,
    userBubble: userBubbleRes,
    assistantBubble: assistantBubbleRes,
    codeBlock: codeBlockRes,
    controls: controlsRes,
    composer: compRes,
    rightPane: rightPaneRes,
    popover: popRes,
  };
  const globalFgHex = cleanTintHexLocal(cfg.globalFontColor);
  const globalFf = sanitizeFontFamily(cfg.globalFontFamily);
  const globalFs = nullableNum(cfg.globalFontSize, 10, 24, 0);
  const regionTypoVars = [];

  for (const id of REGION_IDS) {
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
    if (id !== 'sidebar' && id !== 'wco') {
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
    `  --prism-surface-bubble-user: ${userBubbleRes.rgba};`,
    `  --prism-surface-bubble-assistant: ${assistantBubbleRes.rgba};`,
    `  --prism-surface-turn-card: ${surfTurnCard};`,
    `  --prism-surface-composer: ${compRes.rgba};`,
    `  --prism-surface-editor: ${surfEditor};`,
    `  --prism-surface-code-block: ${surfCodeBlock};`,
    `  --prism-surface-control: ${controlsRes.rgba};`,
    `  --prism-surface-control-active: ${surfControlActive};`,
    `  --prism-surface-control-hover: ${surfControlHover};`,
    `  --prism-surface-selected: ${surfSelected};`,
    `  --prism-surface-popover: ${popRes.rgba};`,
    `  --prism-surface-quick-panel: ${quickPanelRes.rgba};`,
    `  --prism-secondary-bg: ${rgbaStr(tint2Rgb, isLight ? 0.78 : 0.72)};`,
    `  --prism-muted-bg: ${rgbaStr(tint1Rgb, isLight ? 0.65 : 0.55)};`,
    `  --prism-sidebar-muted: rgba(${tok.ptRgb}, ${isLight ? '0.075' : '0.078'});`,
    `  --prism-sidebar-secondary: rgba(${tok.ptRgb}, ${isLight ? '0.115' : '0.125'});`,
    `  --prism-sidebar-tree-guide: ${sbTreeGuideCss};`,
    `  --prism-cust-pill-bg: rgba(${sbPreMixStr}, ${isLight ? '0.720' : '0.620'});`,
    `  --prism-new-tab-input-bg: rgba(${tok.tint1Rgb}, ${isLight ? '0.680' : '0.460'});`,
    `  --prism-proj-act-bg: rgba(${deepSbRgbStr}, ${isLight ? '0.820' : '0.740'});`,
    `  --prism-selection-bg: rgba(${tok.accentRgb}, 0.400);`,
    `  --prism-editor-selection-bg: rgba(${tok.accentRgb}, 0.380);`,
    `  --prism-scroll-thumb: rgba(${tok.ptRgb}, ${isLight ? '0.240' : '0.220'});`,
    `  --prism-scroll-thumb-hover: rgba(${tok.ptRgb}, ${isLight ? '0.420' : '0.380'});`,
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
    `  --prism-border-bubble-user: ${userBubbleEdge.border};`,
    `  --prism-specular-bubble-user: ${userBubbleEdge.specular};`,
    `  --prism-sheen-bubble-user: ${userBubbleEdge.sheen};`,
    `  --prism-shadow-bubble-user: ${userBubbleEdge.shadow};`,
    `  --prism-bw-bubble-user-top: ${userBubbleEdge.bw.top};`,
    `  --prism-bw-bubble-user-right: ${userBubbleEdge.bw.right};`,
    `  --prism-bw-bubble-user-bottom: ${userBubbleEdge.bw.bottom};`,
    `  --prism-bw-bubble-user-left: ${userBubbleEdge.bw.left};`,
    `  --prism-border-bubble-assistant: ${assistantEdge.border};`,
    `  --prism-specular-bubble-assistant: ${assistantEdge.specular};`,
    `  --prism-sheen-bubble-assistant: ${assistantEdge.sheen};`,
    `  --prism-shadow-bubble-assistant: ${assistantEdge.shadow};`,
    `  --prism-bw-bubble-assistant-top: ${assistantEdge.bw.top};`,
    `  --prism-bw-bubble-assistant-right: ${assistantEdge.bw.right};`,
    `  --prism-bw-bubble-assistant-bottom: ${assistantEdge.bw.bottom};`,
    `  --prism-bw-bubble-assistant-left: ${assistantEdge.bw.left};`,
    `  --prism-border-turn-card: ${turnCardEdge.border};`,
    `  --prism-specular-turn-card: ${turnCardEdge.specular};`,
    `  --prism-sheen-turn-card: ${turnCardEdge.sheen};`,
    `  --prism-shadow-turn-card: ${turnCardEdge.shadow};`,
    `  --prism-bw-turn-card-top: ${turnCardEdge.bw.top};`,
    `  --prism-bw-turn-card-right: ${turnCardEdge.bw.right};`,
    `  --prism-bw-turn-card-bottom: ${turnCardEdge.bw.bottom};`,
    `  --prism-bw-turn-card-left: ${turnCardEdge.bw.left};`,
    `  --prism-border-code-block: ${codeBlockEdge.border};`,
    `  --prism-specular-code-block: ${codeBlockEdge.specular};`,
    `  --prism-sheen-code-block: ${codeBlockEdge.sheen};`,
    `  --prism-shadow-code-block: ${codeBlockEdge.shadow};`,
    `  --prism-bw-code-block-top: ${codeBlockEdge.bw.top};`,
    `  --prism-bw-code-block-right: ${codeBlockEdge.bw.right};`,
    `  --prism-bw-code-block-bottom: ${codeBlockEdge.bw.bottom};`,
    `  --prism-bw-code-block-left: ${codeBlockEdge.bw.left};`,
    `  --prism-border-control: ${controlsEdge.border};`,
    `  --prism-specular-control: ${controlsEdge.specular};`,
    `  --prism-sheen-control: ${controlsEdge.sheen};`,
    `  --prism-shadow-control: ${controlsEdge.shadow};`,
    `  --prism-bw-control-top: ${controlsEdge.bw.top};`,
    `  --prism-bw-control-right: ${controlsEdge.bw.right};`,
    `  --prism-bw-control-bottom: ${controlsEdge.bw.bottom};`,
    `  --prism-bw-control-left: ${controlsEdge.bw.left};`,
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
    `  --prism-bubble-user-backdrop: ${userBubbleBackdropCss};`,
    `  --prism-bubble-assistant-backdrop: ${assistantBackdropCss};`,
    `  --prism-code-backdrop: ${codeBackdropCss};`,
    `  --prism-control-backdrop: ${controlsBackdropCss};`,
    `  --prism-chrome-chip-backdrop: ${controlsBackdropCss};`,
    `  --prism-r-island: ${R.island}px;`,
    `  --prism-r-topbar-pill: ${rTopbarPill};`,
    `  --prism-r-wco: ${rWco};`,
    `  --prism-r-left-island: ${rLeftIsland};`,
    `  --prism-r-right-island: ${rRightIsland};`,
    `  --prism-r-workspace: ${rWorkspace};`,
    `  --prism-r-card: ${rCard};`,
    `  --prism-r-bubble-user: ${rBubbleUser};`,
    `  --prism-r-bubble-user-frame: ${rBubbleUserFrame};`,
    `  --prism-r-bubble-assistant: ${rBubbleAssistant};`,
    `  --prism-r-code-block: ${rCodeBlock};`,
    `  --prism-r-control: ${rControl};`,
    `  --prism-r-control-pill: ${rControlPill};`,
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
${leftSbScope} :is(.agy-sidebar-row, [data-testid="conversation-row-sidebar"])[data-selected="true"],
body[data-agy-theme]:not([data-prism-ignore]) ${leftSbScope} :is(.agy-sidebar-row, [data-testid="conversation-row-sidebar"])[data-selected="true"]:not([data-prism-ignore]) {
  --row-bg: var(--prism-accent-soft) !important;
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
    assistantBubble: ':is([data-testid="agent-response"], [data-testid="planner-response-text"], [data-testid="artifact-card"], .artifact-card, [data-testid="changed-files-card"])',
    userBubble: ':is([data-testid="user-message-bubble"], .agy-user-bubble)',
    codeBlock: ':is(pre:not(:has(> div.rounded-xl.border)):not(:has(> div :is([data-testid="code-block-preview-toggle"], [data-testid="markdown-code-block-preview"]))), pre > div:has([data-testid="code-block-preview-toggle"], [data-testid="markdown-code-block-preview"]), pre > div.rounded-xl.border, .code-block, .md-code-block)',
    card: ':is([data-testid="customization-card"], .agy-spotlight-card, [data-testid="marketplace-bundles-banner"], .surface-opaque.bg-background, .agy-callout, .agy-takeover-card, [data-testid="ask-question-option"])',
    controls: ':is(.agy-button, .agy-button-xs, .agy-button-sm, .agy-button-md, .agy-button-lg, .agy-button-custom, .agy-scroll-bottom, .agy-select-trigger, input.agy-field, textarea.agy-textarea, [data-side-panel-strip="true"] .agy-aux-tab, [data-slot="toggle-group"] > button, [data-testid="voice-live-pill"])',
    composer: `:is(${composerCarriers.join(', ')})`,
    rightPane: `:is(${rightPaneCarriers.join(', ')}, [data-side-panel-strip]:not([data-testid="aux-pane-split"] *), .agy-sheet [data-side-panel-body]:not([data-testid="aux-pane-split"] *))`,
    popover: `:is(${SOLID_POPOVERS.join(', ')})`,
  };

  const blocks = [];
  for (const id of DOM_TYPO_REGION_ORDER) {
    const reg = regions[id];
    const hostSel = carrierSelectors[id];
    const isCode = id === 'codeBlock';
    const baseEx = isCode ? CODE_TYPO_PROTECT_EX : TYPO_PROTECT_EX;
    const fgBaseEx = isCode ? CODE_FG_PROTECT_EX : TYPO_PROTECT_EX;
    const extraEx =
      (id === 'workspace' || id === 'rightPane' || id === 'card' || id === 'userBubble' || id === 'assistantBubble' || id === 'codeBlock' || id === 'controls'
        ? COMPOSER_DESCENDANT_EXCLUDE
        : '') +
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
        `${hostSel}${fgBaseEx}${extraEx},\n${hostSel} :where(*)${fgBaseEx}${extraEx} {\n  color: var(--prism-region-${id}-fg) !important;\n}`
      );
    }
    if (hasFf) {
      blocks.push(
        `${hostSel}${baseEx}${extraEx},\n${hostSel} :where(*)${baseEx}${extraEx} {\n  font-family: var(--prism-region-${id}-ff) !important;\n}`
      );
    }
    if (hasFs) {
      blocks.push(
        `${hostSel} :where(p, span, div, li, button, a, label, textarea, input, code, pre, [contenteditable="true"])${baseEx}${extraEx} {\n  font-size: var(--prism-region-${id}-fs) !important;\n}`
      );
    }
  }
  return blocks.length ? `\n${blocks.join('\n')}` : '';
}

function isAssistantBlurredForConfig(cfg, regions, isLight) {
  const effStyle = resolveRegionEffectiveStyle('assistantBubble', regions.assistantBubble, { ...cfg, regions });
  if (effStyle === 'none' || effStyle === 'tinted' || effStyle === 'solid') return false;
  const globalGlassOn = cfg.glassSurfaces !== false;
  const mediaBlurPx = Math.max(0, Number(cfg.mediaBlur ?? 0));
  const blurPx = resolveRegionBlurPx(regions.assistantBubble, 0, globalGlassOn, mediaBlurPx, effStyle);
  if (blurPx <= 0) return false;
  const op = regions.assistantBubble.opacity !== null && regions.assistantBubble.opacity !== undefined
    ? regions.assistantBubble.opacity
    : resolveComponentDefaultAlpha('assistantBubble', { ...cfg, regions }, isLight);
  return op < 0.98;
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
    return `/* agy-wallpaper-prism v${VERSION} static-css: skin disabled */\n`;
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

  const assistantBlurDark = isAssistantBlurredForConfig(cfg, regions, false);
  const assistantBlurLight = isAssistantBlurredForConfig(cfg, regions, true);
  let nestedCodeBlurGuardCss = '';
  if (assistantBlurDark || assistantBlurLight) {
    const scopePfx =
      assistantBlurDark && assistantBlurLight
        ? ''
        : assistantBlurDark
          ? ':is(body.dark, html.dark body, body:not(.light):not(.theme-light)) '
          : ':is(body.light, html.light body) ';
    nestedCodeBlurGuardCss = `
${scopePfx}[data-testid="planner-response-text"] {
  --prism-code-backdrop: none !important;
}
${scopePfx}[data-testid="planner-response-text"] :is(pre, pre > div.rounded-xl.border, pre > div:has([data-testid="code-block-preview-toggle"], [data-testid="markdown-code-block-preview"]), .code-block, .md-code-block) {
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}`;
  }

  const fgOverrideCss =
    cfg.colorScheme !== 'host-native'
      ? `  --foreground: var(--prism-fg) !important;
  --secondary-foreground: var(--prism-fg-2) !important;
  --muted-foreground: var(--prism-fg-muted) !important;
  --placeholder: var(--prism-fg-faint) !important;\n`
      : '';

  const caretColorCss = cfg.caretColor || 'var(--prism-accent)';
  const solidPopoversList = SOLID_POPOVERS.join(', ');

  return `/* agy-wallpaper-prism v${VERSION} zero-JS static-css sheet */
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
:where(#root, #root > div, #root .dark, #root .light, #root .theme-dark, #root .theme-light, .agy-shell, .agy-inset-shell, .agy-sheet:not([data-browser-occluder]), [data-split-panes] [data-testid="pane-titlebar-toolbar"], .monaco-workbench)${sibEx}${dlgDescEx} {
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
${fgOverrideCss}  --primary: var(--prism-accent) !important;
  --color-primary: var(--prism-accent) !important;
  --primary-foreground: var(--prism-accent-fg) !important;
  --link: var(--prism-link) !important;
  --onyx-frame: var(--prism-surface-sidebar) !important;
  --onyx-well: var(--prism-surface-chat) !important;
  --onyx-raised: var(--prism-surface-card) !important;
  --onyx-selected: var(--prism-surface-selected, var(--prism-accent-soft)) !important;
  --onyx-key: var(--prism-surface-control-active, var(--prism-secondary-bg)) !important;
  --vscode-editor-background: transparent !important;
  --vscode-editorGutter-background: transparent !important;
  --vscode-sideBar-background: transparent !important;
  --vscode-sideBarSectionHeader-background: transparent !important;
  --vscode-activityBar-background: transparent !important;
  --vscode-panel-background: transparent !important;
  --vscode-terminal-background: transparent !important;
  --editor-diff-inserted-line-background: rgba(46, 160, 67, 0.24) !important;
  --editor-diff-removed-line-background: rgba(248, 81, 73, 0.24) !important;
  --editor-selection-background: var(--prism-editor-selection-bg) !important;
}${
  cfg.colorScheme === 'host-native'
    ? `
body.light, html.light body {
  --muted-foreground: #475569 !important;
}`
    : ''
}${
  cfg.transparentWindowControls !== false
    ? `
html:not([data-has-browser-hole="true"]) body {
  --background: #00000000 !important;
}`
    : ''
}

#root, .monaco-workbench { position: relative; z-index: 1; }
:where(#root, #root > div${sibEx}, #root > div > div${sibEx}, #root > div > div > div${sibEx}, .agy-shell, .agy-inset-shell, .agy-sheet:not([data-browser-occluder]), .browser-hole-ancestor, .browser-hole-opaque${sibEx}${dlgDescEx}, .agy-sheet[data-sheet-inset] [data-main-content-body], .agy-sheet [data-side-panel-body], [data-split-panes] .agy-sheet[data-sheet-inset] [data-tiling-pane], [data-split-panes] .agy-sheet[data-sheet-inset] [data-tiling-pane] > [data-pane-id], .agy-inset-shell > [data-split-root] > [data-split-sash], [data-has-browser-hole="true"]${sibEx}, [data-browser-hole]:not([data-browser-hole="false"]), .monaco-workbench, .monaco-workbench .monaco-grid-view, .monaco-workbench .monaco-split-view2 > .monaco-scrollable-element > .split-view-container > .split-view-view) {
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
${leftSbScope} :is(.agy-sidebar-row, [data-testid="conversation-row-sidebar"])[data-selected="true"],
body[data-agy-theme]:not([data-prism-ignore]) ${leftSbScope} :is(.agy-sidebar-row, [data-testid="conversation-row-sidebar"])[data-selected="true"]:not([data-prism-ignore]) {
  --row-bg: var(--prism-surface-selected) !important;
  background-color: var(--prism-surface-selected) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
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

.agy-takeover-frame,
body[data-agy-theme] .agy-takeover-frame {
  --glass: var(--prism-surface-card) !important;
  --glass-border: var(--prism-border-card);
  --glass-highlight: var(--prism-specular-card, transparent);
  --glass-shadow: var(--prism-shadow-card, none);
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
:is([data-testid="customization-card"], .agy-spotlight-card, [data-testid="marketplace-bundles-banner"], .agy-takeover-card, .agy-callout, [data-testid="ask-question-option"], div:has(> [data-testid="permission-target-editor"])),
body[data-agy-theme]:not([data-prism-ignore]) :is(.agy-takeover-card, .agy-callout, [data-testid="ask-question-option"]):not([data-prism-ignore]) {
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
.agy-field:has([data-testid="customizations-search"]) {
  background-color: var(--prism-surface-control) !important;
  border-color: var(--prism-border-control, var(--prism-border-card)) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
[data-testid="plugins-tabs"] {
  background-color: var(--prism-surface-control, var(--prism-cust-pill-bg)) !important;
  border-color: var(--prism-border-control, var(--prism-border-card)) !important;
  backdrop-filter: var(--prism-control-backdrop, none) !important;
  -webkit-backdrop-filter: var(--prism-control-backdrop, none) !important;
}

.agy-user-bubble-frame,
body[data-agy-theme] .agy-user-bubble-frame {
  --glass: var(--prism-surface-bubble-user) !important;
  --glass-border: var(--prism-border-bubble-user, var(--prism-border-card));
  --glass-highlight: var(--prism-specular-bubble-user, transparent);
  --glass-shadow: var(--prism-shadow-bubble-user, none);
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border-radius: var(--prism-r-bubble-user-frame, calc(var(--prism-r-bubble-user, 20px) + 1px)) !important;
}
:is([data-testid="user-message-bubble"], .agy-user-bubble),
body[data-agy-theme]:not([data-prism-ignore]) :is([data-testid="user-message-bubble"], .agy-user-bubble):not([data-prism-ignore]) {
  background-color: var(--prism-surface-bubble-user) !important;
  background-image: var(--prism-sheen-bubble-user) !important;
  backdrop-filter: var(--prism-bubble-user-backdrop, none) !important;
  -webkit-backdrop-filter: var(--prism-bubble-user-backdrop, none) !important;
  border-style: solid !important;
  border-top-width: var(--prism-bw-bubble-user-top, 1px) !important;
  border-right-width: var(--prism-bw-bubble-user-right, 1px) !important;
  border-bottom-width: var(--prism-bw-bubble-user-bottom, 1px) !important;
  border-left-width: var(--prism-bw-bubble-user-left, 1px) !important;
  border-color: var(--prism-border-bubble-user) !important;
  border-radius: var(--prism-r-bubble-user) !important;
  box-shadow: inset 0 1px 0 var(--prism-specular-bubble-user), var(--prism-shadow-bubble-user) !important;
}
.agy-user-bubble.p-1\\.5 > .agy-user-bubble-header,
body[data-agy-theme] .agy-user-bubble.p-1\\.5 > .agy-user-bubble-header {
  border-bottom: 1px solid var(--prism-border-bubble-user) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
:is([data-testid="user-message-actions"], [data-testid="revert-button"]) {
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

[data-testid="agent-response"] {
  background-color: transparent !important;
  background-image: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
[data-testid="planner-response-text"] {
  background-color: var(--prism-surface-bubble-assistant) !important;
  background-image: var(--prism-sheen-bubble-assistant) !important;
  backdrop-filter: var(--prism-bubble-assistant-backdrop, none) !important;
  -webkit-backdrop-filter: var(--prism-bubble-assistant-backdrop, none) !important;
  border-style: solid !important;
  border-top-width: var(--prism-bw-bubble-assistant-top, 1px) !important;
  border-right-width: var(--prism-bw-bubble-assistant-right, 1px) !important;
  border-bottom-width: var(--prism-bw-bubble-assistant-bottom, 1px) !important;
  border-left-width: var(--prism-bw-bubble-assistant-left, 1px) !important;
  border-color: var(--prism-border-bubble-assistant) !important;
  border-radius: var(--prism-r-bubble-assistant) !important;
  box-shadow: inset 0 1px 0 var(--prism-specular-bubble-assistant), var(--prism-shadow-bubble-assistant) !important;
}${nestedCodeBlurGuardCss}
:is(button[data-testid="worked-for-collapsible"], button[data-testid="step-plan-chip"], [data-step-rows="true"] [role="button"][aria-expanded], [data-testid="cascade-system-message-toolbar"], [data-testid="cascade-system-message-toolbar"] .agy-button-icon, [data-testid="idle-status-text"]) {
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
:is(button[data-testid="worked-for-collapsible"], button[data-testid="step-plan-chip"], [data-step-rows="true"] [role="button"][aria-expanded]) {
  border-radius: var(--prism-r-ctl) !important;
}
:is(button[data-testid="worked-for-collapsible"], button[data-testid="step-plan-chip"], [data-step-rows="true"] [role="button"][aria-expanded]):is(:hover, :focus-visible) {
  background-color: var(--prism-surface-control-hover) !important;
}
:is([data-testid="artifact-card"], .artifact-card, [data-testid="changed-files-card-header"], .files-changed-header),
body[data-agy-theme]:not([data-prism-ignore]) :is([data-testid="artifact-card"], .artifact-card, [data-testid="changed-files-card-header"], .files-changed-header):not([data-prism-ignore]) {
  background-color: var(--prism-surface-turn-card) !important;
  background-image: var(--prism-sheen-turn-card) !important;
  backdrop-filter: var(--prism-bubble-assistant-backdrop, none) !important;
  -webkit-backdrop-filter: var(--prism-bubble-assistant-backdrop, none) !important;
  border-style: solid !important;
  border-top-width: var(--prism-bw-turn-card-top, 1px) !important;
  border-right-width: var(--prism-bw-turn-card-right, 1px) !important;
  border-bottom-width: var(--prism-bw-turn-card-bottom, 1px) !important;
  border-left-width: var(--prism-bw-turn-card-left, 1px) !important;
  border-color: var(--prism-border-turn-card) !important;
  border-radius: var(--prism-r-bubble-assistant) !important;
  box-shadow: inset 0 1px 0 var(--prism-specular-turn-card), var(--prism-shadow-turn-card) !important;
}
body[data-agy-theme]:not([data-prism-ignore]) .artifact-card:hover:not(:has(.proceed-button:hover)),
[data-testid="artifact-card"]:hover:not(:has(.proceed-button:hover)) {
  background-color: var(--prism-surface-control-hover) !important;
  border-color: var(--prism-accent-border) !important;
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
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
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
.monaco-editor, .monaco-editor .margin, .monaco-editor-background, .monaco-editor .view-lines, .xterm, .xterm .xterm-viewport, .xterm .xterm-screen {
  background-color: transparent !important;
  backdrop-filter: none !important;
}

pre:has(> div.rounded-xl.border),
pre:has(> div :is([data-testid="code-block-preview-toggle"], [data-testid="markdown-code-block-preview"])) {
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  border: none !important;
  border-radius: 0px !important;
  padding: 0px !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
pre:not(:has(> div.rounded-xl.border)):not(:has(> div :is([data-testid="code-block-preview-toggle"], [data-testid="markdown-code-block-preview"]))),
pre > div:has([data-testid="code-block-preview-toggle"], [data-testid="markdown-code-block-preview"]),
pre > div.rounded-xl.border,
:is(.code-block, .md-code-block):not(:has(> div.rounded-xl.border)):not(:has(> div :is([data-testid="code-block-preview-toggle"], [data-testid="markdown-code-block-preview"]))):not(pre > div *) {
  background-color: var(--prism-surface-code-block) !important;
  background-image: var(--prism-sheen-code-block) !important;
  border-style: solid !important;
  border-top-width: var(--prism-bw-code-block-top, 1px) !important;
  border-right-width: var(--prism-bw-code-block-right, 1px) !important;
  border-bottom-width: var(--prism-bw-code-block-bottom, 1px) !important;
  border-left-width: var(--prism-bw-code-block-left, 1px) !important;
  border-color: var(--prism-border-code-block) !important;
  border-radius: var(--prism-r-code-block) !important;
  backdrop-filter: var(--prism-code-backdrop) !important;
  -webkit-backdrop-filter: var(--prism-code-backdrop) !important;
  box-shadow: inset 0 1px 0 var(--prism-specular-code-block), var(--prism-shadow-code-block) !important;
}
pre code, .md-code-block pre {
  background: transparent !important;
  border: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
[data-markdown-root] code:not(pre code),
code:not(pre code),
a.inline-pill,
.context-scope-mention > button.inline-pill,
[data-markdown-root] blockquote {
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
body[data-agy-theme] .agy-md-table,
.agy-md-table,
.md-table-frame {
  border-color: var(--prism-border-code-block) !important;
  border-radius: var(--prism-r-code-block) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

body[data-agy-theme]:not([data-prism-ignore]) :is(.agy-button, .agy-button-xs, .agy-button-sm, .agy-button-md, .agy-button-lg, .agy-button-custom):not([class*="rounded-none"]):not([data-testid="title-menu-bar-item"]):not(.agy-button-secondary):not(.agy-button-outline):not(.agy-button-ghost):not(.agy-button-primary):not([class*="agy-button-secondary"]):not([class*="agy-button-outline"]):not([class*="agy-button-ghost"]):not([class*="agy-button-primary"]),
:is(.agy-button, .agy-button-xs, .agy-button-sm, .agy-button-md, .agy-button-lg, .agy-button-custom):not([class*="rounded-none"]):not([data-testid="title-menu-bar-item"]):not(.agy-button-secondary):not(.agy-button-outline):not(.agy-button-ghost):not(.agy-button-primary):not([class*="agy-button-secondary"]):not([class*="agy-button-outline"]):not([class*="agy-button-ghost"]):not([class*="agy-button-primary"]) {
  border-radius: var(--prism-r-control-pill, 9999px) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
body[data-agy-theme]:not([data-prism-ignore]) :is(.agy-button-secondary, .agy-button-outline, [class*="agy-button-secondary"], [class*="agy-button-outline"]):not([data-prism-ignore]),
:is(.agy-button-secondary, .agy-button-outline, [class*="agy-button-secondary"], [class*="agy-button-outline"]) {
  background-color: var(--prism-surface-control) !important;
  color: var(--prism-fg) !important;
  border-style: solid !important;
  border-color: var(--prism-border-control, var(--prism-border-card)) !important;
  border-top-width: var(--prism-bw-control-top, 1px) !important;
  border-right-width: var(--prism-bw-control-right, 1px) !important;
  border-bottom-width: var(--prism-bw-control-bottom, 1px) !important;
  border-left-width: var(--prism-bw-control-left, 1px) !important;
  border-radius: var(--prism-r-control, var(--prism-r-ctl)) !important;
  box-shadow: inset 0 1px 0 var(--prism-specular-control), var(--prism-shadow-control) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
body[data-agy-theme]:not([data-prism-ignore]) :is(.agy-button-ghost, [class*="agy-button-ghost"]):not([data-prism-ignore]),
:is(.agy-button-ghost, [class*="agy-button-ghost"]) {
  background-color: transparent !important;
  color: var(--prism-fg) !important;
  border-radius: var(--prism-r-control, var(--prism-r-ctl)) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
body[data-agy-theme]:not([data-prism-ignore]) :is(.agy-button-icon-sm, .agy-button-icon, .agy-button-icon-lg, [data-testid="send-button"], [data-testid="sidebar-toggle"], [data-testid="model-selector-trigger"], [data-testid="permissions-selector-trigger"], [data-testid="voice-start-button"], button[data-testid="changed-files-card-review"], .artifact-card .proceed-button):not([data-prism-ignore]),
:is(.agy-button-icon-sm, .agy-button-icon, .agy-button-icon-lg, [data-testid="send-button"], [data-testid="sidebar-toggle"], [data-testid="model-selector-trigger"], [data-testid="permissions-selector-trigger"], [data-testid="voice-start-button"], button[data-testid="changed-files-card-review"], .artifact-card .proceed-button) {
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
body[data-agy-theme]:not([data-prism-ignore]) :is([data-testid="send-button"].agy-send-button, button[data-testid="changed-files-card-review"], .artifact-card .proceed-button):not([data-prism-ignore]),
:is([data-testid="send-button"].agy-send-button, button[data-testid="changed-files-card-review"], .artifact-card .proceed-button) {
  background-color: var(--prism-surface-control) !important;
  border-color: var(--prism-border-control, var(--prism-border-card)) !important;
}
body[data-agy-theme]:not([data-prism-ignore]) :is(.agy-button-secondary, .agy-button-outline, .agy-button-ghost, .agy-button, .agy-button-xs, .agy-button-sm, .agy-button-md, .agy-button-lg, .agy-button-custom, .agy-button-icon-sm, .agy-button-icon, .agy-button-icon-lg, [class*="agy-button-"], [data-testid="model-selector-trigger"], [data-testid="permissions-selector-trigger"], [data-testid="changed-files-card-review"]):not(.agy-button-primary):not([class*="agy-button-primary"]):not([data-prism-ignore]):is(:hover, :focus-visible),
:is(.agy-button-secondary, .agy-button-outline, .agy-button-ghost, .agy-button, .agy-button-xs, .agy-button-sm, .agy-button-md, .agy-button-lg, .agy-button-custom, .agy-button-icon-sm, .agy-button-icon, .agy-button-icon-lg, [class*="agy-button-"], [data-testid="model-selector-trigger"], [data-testid="permissions-selector-trigger"], [data-testid="changed-files-card-review"]):not(.agy-button-primary):not([class*="agy-button-primary"]):is(:hover, :focus-visible) {
  background-color: var(--prism-surface-control-hover) !important;
  border-color: var(--prism-accent-border) !important;
}
body[data-agy-theme]:not([data-prism-ignore]) :is(.agy-button-primary, [class*="agy-button-primary"]):not([data-prism-ignore]),
:is(.agy-button-primary, [class*="agy-button-primary"]) {
  background-color: var(--prism-accent) !important;
  color: var(--prism-accent-fg) !important;
  border-color: var(--prism-accent-border) !important;
  border-radius: var(--prism-r-control, var(--prism-r-ctl)) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
.agy-scroll-bottom,
html body[data-agy-theme]:not([data-prism-ignore]) .agy-scroll-bottom:not([data-prism-ignore]) {
  --glass: var(--prism-surface-control) !important;
  --glass-border: var(--prism-border-control, var(--prism-border-card));
  --glass-highlight: var(--prism-specular-control, transparent);
  --glass-shadow: var(--prism-shadow-control, none);
  background-color: var(--prism-surface-control) !important;
  color: var(--prism-fg) !important;
  background-image: var(--prism-sheen-control) !important;
  backdrop-filter: var(--prism-control-backdrop, none) !important;
  -webkit-backdrop-filter: var(--prism-control-backdrop, none) !important;
  border-style: solid !important;
  border-top-width: var(--prism-bw-control-top, 1px) !important;
  border-right-width: var(--prism-bw-control-right, 1px) !important;
  border-bottom-width: var(--prism-bw-control-bottom, 1px) !important;
  border-left-width: var(--prism-bw-control-left, 1px) !important;
  border-color: var(--prism-border-control, var(--prism-border-card)) !important;
  border-radius: var(--prism-r-control-pill, 9999px) !important;
  box-shadow: inset 0 1px 0 var(--prism-specular-control), var(--prism-shadow-control) !important;
}
[data-testid="voice-live-pill"],
body[data-agy-theme]:not([data-prism-ignore]) [data-testid="voice-live-pill"]:not([data-prism-ignore]) {
  background-color: var(--prism-accent) !important;
  color: var(--prism-accent-fg) !important;
  border: 1px solid var(--prism-accent-border) !important;
  border-radius: var(--prism-r-control-pill, 9999px) !important;
  backdrop-filter: var(--prism-control-backdrop, none) !important;
  -webkit-backdrop-filter: var(--prism-control-backdrop, none) !important;
}
body[data-agy-theme]:not([data-prism-ignore]) :is(input.agy-field, .agy-field, textarea.agy-textarea):not([data-prism-ignore]):not(#antigravity\\.agentSidePanelInputBox *):not(.surface-composer-card *),
:is(input.agy-field, .agy-field, textarea.agy-textarea):not(#antigravity\\.agentSidePanelInputBox *):not(.surface-composer-card *) {
  background-color: var(--prism-surface-control) !important;
  color: var(--prism-fg) !important;
  border-style: solid !important;
  border-top-width: var(--prism-bw-control-top, 1px) !important;
  border-right-width: var(--prism-bw-control-right, 1px) !important;
  border-bottom-width: var(--prism-bw-control-bottom, 1px) !important;
  border-left-width: var(--prism-bw-control-left, 1px) !important;
  border-color: var(--prism-border-control, var(--prism-border-card)) !important;
  border-radius: var(--prism-r-control, var(--prism-r-ctl)) !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
body[data-agy-theme]:not([data-prism-ignore]) :is(input.agy-field, .agy-field, textarea.agy-textarea):not([data-prism-ignore]):not(#antigravity\\.agentSidePanelInputBox *):not(.surface-composer-card *):is(:focus, :focus-visible),
:is(input.agy-field, .agy-field, textarea.agy-textarea):not(#antigravity\\.agentSidePanelInputBox *):not(.surface-composer-card *):is(:focus, :focus-visible) {
  border-color: var(--prism-accent-border) !important;
}
body[data-agy-theme]:not([data-prism-ignore]) .agy-select-trigger:not([data-prism-ignore]):not(#antigravity\\.agentSidePanelInputBox *):not(.surface-composer-card *),
.agy-select-trigger:not(#antigravity\\.agentSidePanelInputBox *):not(.surface-composer-card *) {
  background-color: var(--prism-surface-control) !important;
  color: var(--prism-fg) !important;
  border-style: solid !important;
  border-top-width: var(--prism-bw-control-top, 1px) !important;
  border-right-width: var(--prism-bw-control-right, 1px) !important;
  border-bottom-width: var(--prism-bw-control-bottom, 1px) !important;
  border-left-width: var(--prism-bw-control-left, 1px) !important;
  border-color: var(--prism-border-control, var(--prism-border-card)) !important;
  border-radius: var(--prism-r-control, var(--prism-r-ctl)) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
body[data-agy-theme]:not([data-prism-ignore]) .agy-select-trigger:not([data-prism-ignore]):not(#antigravity\\.agentSidePanelInputBox *):not(.surface-composer-card *):is(:hover, :focus-visible, [data-popup-open], [aria-expanded="true"]),
.agy-select-trigger:not(#antigravity\\.agentSidePanelInputBox *):not(.surface-composer-card *):is(:hover, :focus-visible, [data-popup-open], [aria-expanded="true"]) {
  background-color: var(--prism-surface-control-hover) !important;
  border-color: var(--prism-accent-border) !important;
}
body[data-agy-theme]:not([data-prism-ignore]) :is([data-side-panel-strip="true"] .agy-aux-tab, .agy-aux-tab):not([data-prism-ignore]),
[data-side-panel-strip="true"] .agy-aux-tab,
.agy-aux-tab {
  background-color: transparent !important;
  color: var(--prism-fg-muted) !important;
  border-radius: var(--prism-r-control, var(--prism-r-ctl)) !important;
  border: 1px solid transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
body[data-agy-theme]:not([data-prism-ignore]) :is([data-side-panel-strip="true"] .agy-aux-tab, .agy-aux-tab):not([data-prism-ignore]):is(:hover, :focus-visible),
[data-side-panel-strip="true"] .agy-aux-tab:is(:hover, :focus-visible),
.agy-aux-tab:is(:hover, :focus-visible) {
  background-color: var(--prism-surface-control-hover) !important;
  color: var(--prism-fg) !important;
}
body[data-agy-theme]:not([data-prism-ignore]) :is([data-side-panel-strip="true"] .agy-aux-tab, .agy-aux-tab):is([aria-selected="true"], [data-selected="true"], [data-active="true"], .active, .bg-secondary):not([data-prism-ignore]),
[data-side-panel-strip="true"] .agy-aux-tab:is([aria-selected="true"], [data-selected="true"], [data-active="true"], .active, .bg-secondary),
.agy-aux-tab:is([aria-selected="true"], [data-selected="true"], [data-active="true"], .active, .bg-secondary) {
  background-color: var(--prism-surface-control-active) !important;
  color: var(--prism-fg) !important;
  border-color: var(--prism-accent-border) !important;
}
[data-slot="toggle-group"],
body[data-agy-theme]:not([data-prism-ignore]) [data-slot="toggle-group"]:not([data-prism-ignore]) {
  background-color: var(--prism-surface-control) !important;
  border: 1px solid var(--prism-border-control, var(--prism-border-card)) !important;
  border-radius: var(--prism-r-control, var(--prism-r-ctl)) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
[data-slot="toggle-group"] > button,
body[data-agy-theme]:not([data-prism-ignore]) [data-slot="toggle-group"]:not([data-prism-ignore]) > button:not([data-prism-ignore]) {
  color: var(--prism-fg-muted) !important;
  border-radius: var(--prism-r-xs) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
[data-slot="toggle-group"] > button[data-pressed]:not([data-pressed="false"]),
body[data-agy-theme]:not([data-prism-ignore]) [data-slot="toggle-group"]:not([data-prism-ignore]) > button[data-pressed]:not([data-pressed="false"]):not([data-prism-ignore]) {
  background-color: var(--prism-surface-control-active) !important;
  color: var(--prism-fg) !important;
  border-radius: var(--prism-r-xs) !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
[role="switch"][aria-checked="true"],
body[data-agy-theme]:not([data-prism-ignore]) [role="switch"][aria-checked="true"]:not([data-prism-ignore]) {
  background-color: var(--prism-accent) !important;
}
[role="switch"][aria-checked="false"],
body[data-agy-theme]:not([data-prism-ignore]) [role="switch"][aria-checked="false"]:not([data-prism-ignore]) {
  background-color: var(--prism-surface-control) !important;
  border: 1px solid var(--prism-border-control) !important;
}
:is([role="switch"], [role="checkbox"], input[type="checkbox"], input[type="range"]) {
  accent-color: var(--prism-accent);
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
[data-testid="subagent-node"][aria-current="true"] {
  background-color: var(--prism-surface-control-active) !important;
  border-radius: var(--prism-r-control) !important;
}
.agy-inset-shell ~ [data-testid="layout-status-bar"] > *,
.monaco-workbench .part.statusbar {
  background-color: var(--prism-surface-topbar) !important;
  border-top: 1px solid var(--prism-border-sash) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
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
}
::selection {
  background-color: var(--prism-selection-bg) !important;
  color: inherit;
}
::-webkit-scrollbar-track {
  background: transparent !important;
}
::-webkit-scrollbar-thumb {
  background: var(--prism-scroll-thumb) !important;
  border-radius: 999px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--prism-scroll-thumb-hover) !important;
}
[data-testid="overlay-scrollbar-thumb"] {
  background-color: var(--prism-scroll-thumb) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
[data-testid="overlay-scrollbar"]:is(:hover, [data-expanded="true"]) [data-testid="overlay-scrollbar-thumb"],
[data-testid="overlay-scrollbar-thumb"]:hover {
  background-color: var(--prism-scroll-thumb-hover) !important;
}
:is(textarea, input:not([type="range"]):not([type="checkbox"]):not([type="color"]), [contenteditable="true"]) {
  caret-color: ${caretColorCss} !important;
}
.monaco-editor .cursors-layer > .cursor {
  background-color: ${caretColorCss} !important;
  border-color: ${caretColorCss} !important;
}${regionTypoCssBlock}${welcomeLogoCssBlock}
`;
}

export const buildStaticPrismCss = buildStaticCssSheet;

export { PRISM_DOM, enforceFgContrastRgb, resolveRegionFgColor, sanitizeFontFamily };
