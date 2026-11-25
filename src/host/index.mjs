// Host injection script loader & client skin payload builder for agy-wallpaper-prism v2.1.0.
// Consumed by `sidecars/prism_studio/main.mjs`, `cdp-bridge.mjs`, and `test/verify-all.mjs`.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_CONFIG,
  PRISM_DOM,
  resolveEffectiveConfig,
  resolveSchemeTokens,
  sanitizeConfig,
} from '../shared/schema.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKIN_SCRIPT_PATH = join(__dirname, 'wallpaper-inject.js');
const PANEL_SCRIPT_PATH = join(__dirname, 'panel-inject.js');

let cachedSkinScript = null;
let cachedPanelScript = null;

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

  return {
    version: PRISM_DOM.skinVersion,
    skinEnabled,
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

const GLASS_COMPONENT_IDS_LOCAL = Object.freeze([
  'topbar',
  'sidebar',
  'workspace',
  'rightPane',
  'composer',
  'card',
  'popover',
]);

const SURFACE_TINT_BOUNDS_LOCAL = Object.freeze({
  topbar: Object.freeze({ minOpacity: 0, maxOpacity: 0.98 }),
  sidebar: Object.freeze({ minOpacity: 0, maxOpacity: 0.98 }),
  workspace: Object.freeze({ minOpacity: 0, maxOpacity: 0.98 }),
  rightPane: Object.freeze({ minOpacity: 0, maxOpacity: 0.98 }),
  composer: Object.freeze({ minOpacity: 0, maxOpacity: 0.98 }),
  card: Object.freeze({ minOpacity: 0, maxOpacity: 0.98 }),
  popover: Object.freeze({ minOpacity: 0.50, maxOpacity: 0.99 }),
});

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

function clampNum(v, lo, hi) {
  const n = Number(v);
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function parseRgbTriplet(triplet) {
  const parts = String(triplet || '')
    .split(',')
    .map((s) => Number(s.trim()) || 0);
  return [clampNum(Math.round(parts[0] || 0), 0, 255), clampNum(Math.round(parts[1] || 0), 0, 255), clampNum(Math.round(parts[2] || 0), 0, 255)];
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

function nullableUnitOpacityLocal(v, min, max) {
  if (v === null || v === undefined || v === '' || v === 'auto') return null;
  const s = typeof v === 'string' ? v.trim() : null;
  if (s === '' || s === 'auto') return null;
  let n = s !== null ? Number(s) : v;
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  if (n >= 2) n = n / 100;
  return Math.round(clampNum(n, min, max) * 1000) / 1000;
}

function sanitizeSurfaceTintsLocal(cfg) {
  const srcMap = cfg?.surfaceTints && typeof cfg.surfaceTints === 'object' && !Array.isArray(cfg.surfaceTints) ? cfg.surfaceTints : {};
  const out = {};
  for (const id of GLASS_COMPONENT_IDS_LOCAL) {
    const bounds = SURFACE_TINT_BOUNDS_LOCAL[id];
    const sEnt = srcMap[id] && typeof srcMap[id] === 'object' ? srcMap[id] : {};
    out[id] = {
      opacity: nullableUnitOpacityLocal(sEnt.opacity, bounds.minOpacity, bounds.maxOpacity),
      tone: clampNum(Math.round(Number(sEnt.tone) || 0), -100, 100),
      tint: cleanTintHexLocal(sEnt.tint),
    };
  }
  const legacySb = nullableUnitOpacityLocal(cfg?.sidebarOpacity, 0, 0.98);
  if (out.sidebar.opacity === null && legacySb !== null) {
    out.sidebar.opacity = legacySb;
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

function buildBackdropLocal(px, isLight, isNested) {
  const r = Math.round(clampNum(px, 0, 64));
  if (r <= 0) return 'none';
  const sat = isNested
    ? Math.round(100 + Math.min(15, r * 0.25))
    : isLight
      ? Math.round(125 + Math.min(65, r * 1.45))
      : Math.round(115 + Math.min(65, r * 1.35));
  return `blur(${r}px) saturate(${sat}%)`;
}

function buildPolarityTokenVarsCss(cfg, tok, isLight) {
  const glassOp = clampNum(cfg.glassOpacity ?? 0.76, 0.15, 0.98);
  const fidelity = clampNum(Number(cfg.glassFidelity ?? 92) / 100, 0, 1);
  const chatFid = clampNum(Number(cfg.chatGlassFidelity ?? 90) / 100, 0, 1);
  const solidChrome = cfg.glassSurfaces === false;
  const contrastFloor = cfg.contrastFloor !== false;
  const wallTintMix = clampNum(cfg.wallTintMix ?? 0.06, 0, 0.22);

  const shadeRgb = parseRgbTriplet(tok.shadeRgb);
  const baseRgb = parseRgbTriplet(tok.baseRgb);
  const tint1Rgb = parseRgbTriplet(tok.tint1Rgb);
  const tint2Rgb = parseRgbTriplet(tok.tint2Rgb);
  const popRgb = parseRgbTriplet(tok.popoverRgb);
  const fgRgb = hexToRgb(tok.fg) || (isLight ? [15, 23, 42] : [242, 242, 245]);
  const wallTintRgb = cfg.extractedAccent?.tintRgb
    ? parseRgbTriplet(cfg.extractedAccent.tintRgb)
    : parseRgbTriplet(tok.accentRgb);

  const tints = sanitizeSurfaceTintsLocal(cfg);
  const sbBaseRgb = !isLight && rgbSum(tok.shadeRgb) > rgbSum(tok.baseRgb) ? baseRgb : shadeRgb;
  const sbEntry = tints.sidebar;
  const hasCustomSbOp = sbEntry.opacity !== null && sbEntry.opacity !== undefined;
  const globalMinSbFloor = contrastFloor ? (isLight ? 0.48 : 0.36) : 0.15;
  const minSbFloor = hasCustomSbOp ? 0 : globalMinSbFloor;
  const defaultSbAlpha = clampNum(Math.max(glassOp, minSbFloor * fidelity), 0, 0.99);
  const defaultTopbarAlpha = clampNum(Math.max(glassOp, globalMinSbFloor * fidelity), 0, 0.99);

  const rawChatA =
    cfg.layoutMode === 'flush' && !isLight
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

  const topbarRes = resolveComponentSurfaceLocal({
    entry: tints.topbar,
    defaultRgb: sbBaseRgb,
    fgRgb,
    wallTintRgb,
    wallMixWeight: wallTintMix * 0.75,
    defaultAlpha: defaultTopbarAlpha,
    bounds: SURFACE_TINT_BOUNDS_LOCAL.topbar,
    isLight,
    contrastFloor,
    solidChrome,
  });
  const sbRes = resolveComponentSurfaceLocal({
    entry: sbEntry,
    defaultRgb: sbBaseRgb,
    fgRgb,
    wallTintRgb,
    wallMixWeight: wallTintMix * 0.75,
    defaultAlpha: defaultSbAlpha,
    bounds: SURFACE_TINT_BOUNDS_LOCAL.sidebar,
    isLight,
    contrastFloor,
    solidChrome,
  });
  const wsRes = resolveComponentSurfaceLocal({
    entry: tints.workspace,
    defaultRgb: baseRgb,
    fgRgb,
    wallTintRgb,
    wallMixWeight: wallTintMix * 0.75,
    defaultAlpha: defaultChatAlpha,
    bounds: SURFACE_TINT_BOUNDS_LOCAL.workspace,
    isLight,
    contrastFloor,
    solidChrome,
  });
  const rightPaneRes = resolveComponentSurfaceLocal({
    entry: tints.rightPane,
    defaultRgb: baseRgb,
    fgRgb,
    wallTintRgb,
    wallMixWeight: wallTintMix * 0.75,
    defaultAlpha: defaultChatAlpha,
    bounds: SURFACE_TINT_BOUNDS_LOCAL.rightPane,
    isLight,
    contrastFloor,
    solidChrome,
  });
  const compRes = resolveComponentSurfaceLocal({
    entry: tints.composer,
    defaultRgb: tint1Rgb,
    fgRgb,
    wallTintRgb,
    wallMixWeight: wallTintMix,
    defaultAlpha: defaultCompAlpha,
    bounds: SURFACE_TINT_BOUNDS_LOCAL.composer,
    isLight,
    contrastFloor,
    solidChrome,
  });
  const cardRes = resolveComponentSurfaceLocal({
    entry: tints.card,
    defaultRgb: tint1Rgb,
    fgRgb,
    wallTintRgb,
    wallMixWeight: wallTintMix,
    defaultAlpha: defaultCardAlpha,
    bounds: SURFACE_TINT_BOUNDS_LOCAL.card,
    isLight,
    contrastFloor,
    solidChrome,
  });
  const popRes = resolveComponentSurfaceLocal({
    entry: tints.popover,
    defaultRgb: popRgb,
    fgRgb,
    wallTintRgb,
    wallMixWeight: wallTintMix * 0.4,
    defaultAlpha: defaultPopoverAlpha,
    bounds: SURFACE_TINT_BOUNDS_LOCAL.popover,
    isLight,
    contrastFloor,
    solidChrome,
  });
  const quickPanelRes = resolveComponentSurfaceLocal({
    entry: tints.popover,
    defaultRgb: popRgb,
    fgRgb,
    wallTintRgb,
    wallMixWeight: wallTintMix * 0.4,
    defaultAlpha: defaultQuickPanelAlpha,
    bounds: SURFACE_TINT_BOUNDS_LOCAL.popover,
    isLight,
    contrastFloor,
    solidChrome,
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
  const deepSbAlpha = solidChrome
    ? 1
    : sbRes.customized
      ? clampNum(sbRes.alpha + (isLight ? 0.14 : 0.12), isLight ? 0.32 : 0.24, 0.97)
      : isLight
        ? clampNum(Math.max(glassOp + 0.14, 0.90), 0.45, 0.97)
        : clampNum(Math.max(glassOp + 0.12, 0.88), 0.35, 0.96);
  const stickySbAlpha = solidChrome
    ? 1
    : sbRes.customized
      ? clampNum(sbRes.alpha + (isLight ? 0.16 : 0.14), isLight ? 0.38 : 0.30, 0.97)
      : isLight
        ? 0.94
        : 0.91;
  const surfSidebarDeep = rgbaStr(sbEntry.tint ? deepSbRgb : mixRgb(deepSbRgb, wallTintRgb, wallTintMix * 0.45), deepSbAlpha);
  const surfStickySidebar = rgbaStr(deepSbRgb, stickySbAlpha);

  const blurMd = solidChrome ? 0 : Math.min(64, Math.max(0, Math.round(Number(cfg.glassBlur ?? 16))));
  const hasCustomSbBlur =
    cfg.sidebarBlur !== null &&
    cfg.sidebarBlur !== undefined &&
    cfg.sidebarBlur !== '' &&
    cfg.sidebarBlur !== 'auto' &&
    Number.isFinite(Number(cfg.sidebarBlur));
  const sbBlurPx = solidChrome
    ? 0
    : Math.min(64, Math.max(0, Math.round(hasCustomSbBlur ? Number(cfg.sidebarBlur) : Number(cfg.glassBlur ?? 16))));
  const blurLg = !solidChrome && blurMd > 0 ? Math.min(64, blurMd + 4) : 0;
  const blurXl = !solidChrome && blurMd > 0 ? Math.min(64, blurMd + 6) : 0;
  const chipBlurPx = blurMd > 0 ? Math.max(4, Math.round(blurMd * 0.6)) : 0;
  const codeBlurPx = cfg.codeReadabilityMode === 'frosted' && blurMd > 0 ? Math.max(4, Math.round(blurMd * 0.85)) : 0;
  const projBlurPx = sbBlurPx > 0 ? Math.max(4, Math.round(sbBlurPx * 0.9)) : 0;

  const minEd = contrastFloor ? (isLight ? 0.84 : 0.72) : isLight ? 0.52 : 0.38;
  const rawEdA = isLight ? clampNum(glassOp * 0.96, 0.55, 0.99) : clampNum(glassOp * 0.92, 0.45, 0.98);
  const edAlpha =
    solidChrome || cfg.codeReadabilityMode === 'solid'
      ? 1
      : clampNum(Math.max(rawEdA, minEd * (contrastFloor ? 1 : fidelity)), 0, 0.99);
  const surfEditor = rgbaStr(mixRgb(baseRgb, wallTintRgb, wallTintMix * 0.5), edAlpha);
  const surfCodeBlock = cfg.codeReadabilityMode === 'solid' ? rgbaStr(tint1Rgb, 1) : surfEditor;

  const bScale = cfg.borders === 'off' ? 0 : cfg.borders === 'subtle' ? 0.55 : 1;
  const islandBorderA = ((isLight ? 0.14 : 0.12) * bScale).toFixed(3);
  const cardBorderA = ((isLight ? 0.13 : 0.11) * bScale).toFixed(3);
  const hairBorderA = ((isLight ? 0.1 : 0.08) * Math.max(0.35, bScale)).toFixed(3);

  return [
    `  --prism-native-floor: ${isLight ? '#f8fafc' : '#070708'};`,
    `  --prism-shade-rgb: ${tok.shadeRgb};`,
    `  --prism-sidebar-rgb: ${sbPreMixStr};`,
    `  --prism-sidebar-deep-rgb: ${deepSbRgbStr};`,
    `  --prism-base-rgb: ${tok.baseRgb};`,
    `  --prism-tint-1-rgb: ${tok.tint1Rgb};`,
    `  --prism-tint-2-rgb: ${tok.tint2Rgb};`,
    `  --prism-surface-sticky-sidebar: ${surfStickySidebar};`,
    `  --prism-sticky-sidebar-bg: var(--prism-surface-sticky-sidebar);`,
    `  --prism-fg: ${tok.fg};`,
    `  --prism-fg-2: ${tok.fg2};`,
    `  --prism-fg-muted: ${tok.fgMuted};`,
    `  --prism-fg-faint: ${tok.fgFaint};`,
    `  --prism-accent: ${tok.accent};`,
    `  --prism-accent-rgb: ${tok.accentRgb};`,
    `  --prism-accent-fg: ${tok.accentFg};`,
    `  --prism-accent-border: rgba(${tok.accentRgb}, ${isLight ? '0.420' : '0.480'});`,
    `  --prism-link: ${tok.link};`,
    `  --prism-surface-topbar: ${topbarRes.rgba};`,
    `  --prism-bg-topbar: var(--prism-surface-topbar);`,
    `  --prism-surface-sidebar: ${sbRes.rgba};`,
    `  --prism-surface-sidebar-deep: ${surfSidebarDeep};`,
    `  --prism-surface-chat: ${wsRes.rgba};`,
    `  --prism-surface-right-pane: ${rightPaneRes.rgba};`,
    `  --prism-surface-card: ${cardRes.rgba};`,
    `  --prism-surface-composer: ${compRes.rgba};`,
    `  --prism-surface-editor: ${surfEditor};`,
    `  --prism-surface-code-block: ${surfCodeBlock};`,
    `  --prism-surface-popover: ${popRes.rgba};`,
    `  --prism-surface-quick-panel: ${quickPanelRes.rgba};`,
    `  --prism-secondary-bg: rgba(${tint2Rgb.join(', ')}, ${Math.min(0.92, cardRes.alpha * 0.82).toFixed(3)});`,
    `  --prism-muted-bg: rgba(${tok.ptRgb}, ${isLight ? '0.065' : '0.060'});`,
    `  --prism-cust-pill-bg: rgba(${sbPreMixStr}, ${isLight ? '0.720' : '0.620'});`,
    `  --prism-new-tab-input-bg: rgba(${tok.tint1Rgb}, ${isLight ? '0.680' : '0.460'});`,
    `  --prism-proj-act-bg: rgba(${deepSbRgbStr}, ${isLight ? '0.820' : '0.740'});`,
    `  --prism-border-island: ${bScale === 0 ? 'transparent' : `rgba(${tok.ptRgb}, ${islandBorderA})`};`,
    `  --prism-border-card: ${bScale === 0 ? 'transparent' : `rgba(${tok.ptRgb}, ${cardBorderA})`};`,
    `  --prism-border-hairline: rgba(${tok.ptRgb}, ${hairBorderA});`,
    `  --prism-border-popover: rgba(${tok.ptRgb}, ${isLight ? '0.160' : '0.150'});`,
    `  --prism-specular-top: ${bScale === 0 ? 'transparent' : isLight ? 'rgba(255, 255, 255, 0.880)' : 'rgba(255, 255, 255, 0.075)'};`,
    `  --prism-sheen: ${isLight ? 'linear-gradient(172deg, rgba(255, 255, 255, 0.68) 0%, rgba(255, 255, 255, 0) 40%)' : 'linear-gradient(172deg, rgba(255, 255, 255, 0.042) 0%, rgba(255, 255, 255, 0) 38%)'};`,
    `  --prism-blur-md: ${blurMd}px;`,
    `  --prism-blur-lg: ${blurLg}px;`,
    `  --prism-blur-xl: ${blurXl}px;`,
    `  --prism-chat-backdrop: ${buildBackdropLocal(blurMd, isLight, false)};`,
    `  --prism-topbar-backdrop: ${buildBackdropLocal(blurMd, isLight, false)};`,
    `  --prism-sidebar-backdrop: ${buildBackdropLocal(sbBlurPx, isLight, false)};`,
    `  --prism-popover-backdrop: ${buildBackdropLocal(blurXl, isLight, false)};`,
    `  --prism-sticky-backdrop: ${buildBackdropLocal(sbBlurPx, isLight, true)};`,
    `  --prism-project-backdrop: ${buildBackdropLocal(projBlurPx, isLight, true)};`,
    `  --prism-composer-backdrop: ${buildBackdropLocal(blurLg, isLight, true)};`,
    `  --prism-code-backdrop: ${buildBackdropLocal(codeBlurPx, isLight, true)};`,
    `  --prism-chrome-chip-backdrop: ${buildBackdropLocal(chipBlurPx, isLight, true)};`,
    `  --prism-shadow-island: ${cfg.shadows === false ? 'none' : isLight ? '0 10px 28px -8px rgba(15, 23, 42, 0.12)' : '0 14px 34px -8px rgba(0, 0, 0, 0.46)'};`,
    `  --prism-shadow-popover: ${isLight ? '0 18px 44px -8px rgba(15, 23, 42, 0.22)' : '0 22px 52px -8px rgba(0, 0, 0, 0.68)'};`,
    `  --prism-sticky-shadow: inset 0 1px 0 ${bScale === 0 ? 'transparent' : isLight ? 'rgba(255, 255, 255, 0.880)' : 'rgba(255, 255, 255, 0.075)'}, 0 3px 10px rgba(0, 0, 0, ${isLight ? '0.06' : '0.24'});`,
    `  --prism-proj-shadow: inset 0 1px 0 ${bScale === 0 ? 'transparent' : isLight ? 'rgba(255, 255, 255, 0.880)' : 'rgba(255, 255, 255, 0.075)'}, 0 2px 8px rgba(0, 0, 0, ${isLight ? '0.05' : '0.22'});`,
  ].join('\n');
}

/**
 * Build a pure zero-JS stylesheet (`static-css` startup mode) consumed by `GET /host/<capToken>/static.css`.
 * Keeps 100% native clickability (`pointer-events: none` `body::before` at `z-index: -1`) and yields
 * `alpha = 0` whenever Antigravity 2.34.0+ opens a `[data-has-browser-hole="true"]` WCV surface.
 */
export function buildStaticCssSheet(payload = {}) {
  if (payload && payload.skinEnabled === false) {
    return '/* agy-wallpaper-prism v2.1.0 static-css: skin disabled */\n';
  }
  const rawCfg = payload?.config && typeof payload.config === 'object' ? payload.config : payload || DEFAULT_CONFIG;
  const activeItem = payload?.activeItem && typeof payload.activeItem === 'object' ? payload.activeItem : null;
  const wid = String(activeItem?.id || rawCfg.activeWallpaperId || rawCfg.wallpaperId || '');
  const cfg = resolveEffectiveConfig(sanitizeConfig(rawCfg), wid);
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
  const radiusIsland = cfg.layoutMode === 'islands' ? (cfg.cornerStyle === 'sharp' ? 6 : cfg.cornerStyle === 'soft' ? 16 : 12) : 0;
  const radiusCard = cfg.cornerStyle === 'sharp' ? 6 : cfg.cornerStyle === 'soft' ? 14 : 10;
  const radiusCtl =
    cfg.layoutMode === 'flush'
      ? cfg.cornerStyle === 'sharp'
        ? 4
        : cfg.cornerStyle === 'soft'
          ? 8
          : 6
      : cfg.cornerStyle === 'sharp'
        ? 4
        : cfg.cornerStyle === 'soft'
          ? 9
          : 7;
  const radiusXs = Math.max(2, radiusCtl - (cfg.layoutMode === 'flush' ? 2 : 3));
  const radiusTopbarPill = cfg.layoutMode === 'flush' ? radiusCtl : Math.min(16, radiusIsland);

  const wallBgDark = safeImg
    ? `linear-gradient(180deg, rgba(${darkTok.shadeRgb}, ${(scrimOp * 0.85).toFixed(3)}), rgba(${darkTok.shadeRgb}, ${(scrimOp * 1.1).toFixed(3)})), url("${safeImg}")`
    : `radial-gradient(ellipse 80% 70% at 22% 24%, rgba(${darkTok.accentRgb}, 0.26) 0%, transparent 65%), radial-gradient(ellipse 75% 75% at 80% 78%, rgba(${darkTok.accentRgb}, 0.18) 0%, #09090b 100%)`;
  const wallBgLight = safeImg
    ? `linear-gradient(180deg, rgba(${lightTok.baseRgb}, ${(scrimOp * 0.75).toFixed(3)}), rgba(${lightTok.baseRgb}, ${scrimOp.toFixed(3)})), url("${safeImg}")`
    : `radial-gradient(ellipse 80% 70% at 22% 24%, rgba(${lightTok.accentRgb}, 0.18) 0%, transparent 65%), radial-gradient(ellipse 75% 75% at 80% 78%, rgba(${lightTok.accentRgb}, 0.12) 0%, #f4f7fb 100%)`;

  const sibEx =
    ':not(#gemini-neko-pet-root):not(#ag-context-meter):not(#ag-usage-monitor-capsule):not(#ag-usage-monitor-portal):not(#deck-metrics-strip):not(#agy-prism-popover):not(#agy-prism-wco-pill):not(#agy-prism-topbar-pills):not(.settings-modal-backdrop):not(.settings-modal-container):not([data-testid="modal-backdrop"]):not([data-testid="media-modal"]):not(.agy-dialog):not([role="dialog"]):not([role="alertdialog"]):not([role="menu"]):not([role="listbox"]):not([role="tooltip"])';
  const dlgDescEx =
    ':not(.settings-modal-backdrop *):not(.settings-modal-container *):not(.agy-dialog *):not([role="dialog"] *):not([role="alertdialog"] *):not([role="menu"] *):not([role="listbox"] *):not([data-radix-popper-content-wrapper] *):not(.agy-popover *):not(.quick-input-widget *)';
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

  const isIslands = cfg.layoutMode === 'islands';
  const topbarPillRadiusCss = isIslands
    ? `var(--prism-r-topbar-pill, ${radiusTopbarPill}px)`
    : `0px 0px var(--prism-r-topbar-pill, ${radiusTopbarPill}px) var(--prism-r-topbar-pill, ${radiusTopbarPill}px)`;
  const topbarPillBorderCss = isIslands
    ? 'border: 1px solid var(--prism-border-island) !important;\n  box-shadow: var(--prism-shadow-island) !important;'
    : 'border: 1px solid var(--prism-border-hairline) !important;\n  border-top: none !important;\n  box-shadow: none !important;';
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
  background-image: var(--prism-sheen);
  backdrop-filter: var(--prism-topbar-backdrop);
  -webkit-backdrop-filter: var(--prism-topbar-backdrop);
  box-shadow: inset 0 1px 0 var(--prism-specular-top);
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
  background-image: var(--prism-sheen);
  backdrop-filter: var(--prism-topbar-backdrop);
  -webkit-backdrop-filter: var(--prism-topbar-backdrop);
  box-shadow: inset 0 1px 0 var(--prism-specular-top);
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
  background-image: var(--prism-sheen);
  backdrop-filter: var(--prism-topbar-backdrop);
  -webkit-backdrop-filter: var(--prism-topbar-backdrop);
  box-shadow: inset 0 1px 0 var(--prism-specular-top);
}`;

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

  return `/* agy-wallpaper-prism v2.1.0 zero-JS static-css sheet */
:root, body.dark, html.dark body {
${buildPolarityTokenVarsCss(cfg, darkTok, false)}
  --prism-r-island: ${radiusIsland}px;
  --prism-r-topbar-pill: ${radiusTopbarPill}px;
  --prism-r-card: ${radiusCard}px;
  --prism-r-ctl: ${radiusCtl}px;
  --prism-r-xs: ${radiusXs}px;
  --prism-workspace-pad: ${Number(cfg.workspacePad ?? 8)}px;
  --prism-static-wall: ${wallBgDark};
}
body.light, html.light body {
${buildPolarityTokenVarsCss(cfg, lightTok, true)}
  --prism-r-island: ${radiusIsland}px;
  --prism-r-topbar-pill: ${radiusTopbarPill}px;
  --prism-r-card: ${radiusCard}px;
  --prism-r-ctl: ${radiusCtl}px;
  --prism-r-xs: ${radiusXs}px;
  --prism-workspace-pad: ${Number(cfg.workspacePad ?? 8)}px;
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
  --card: var(--prism-surface-card) !important;
  --color-card: var(--prism-surface-card) !important;
  --card-border: var(--prism-border-card) !important;
  --border: var(--prism-border-hairline) !important;
  --color-border: var(--prism-border-hairline) !important;
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
  backdrop-filter: var(--prism-sidebar-backdrop);
  -webkit-backdrop-filter: var(--prism-sidebar-backdrop);
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
  border: 1px solid var(--prism-border-hairline) !important;
  backdrop-filter: var(--prism-chrome-chip-backdrop) !important;
  -webkit-backdrop-filter: var(--prism-chrome-chip-backdrop) !important;
}
.agy-row-actions > button:is(:hover, :focus-visible) {
  color: var(--prism-fg) !important;
  background-color: var(--prism-surface-popover) !important;
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
  background-image: var(--prism-sheen);
  backdrop-filter: var(--prism-sticky-backdrop) !important;
  -webkit-backdrop-filter: var(--prism-sticky-backdrop) !important;
  border: 1px solid var(--prism-border-hairline);
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
  background-image: var(--prism-sheen);
  backdrop-filter: var(--prism-project-backdrop) !important;
  -webkit-backdrop-filter: var(--prism-project-backdrop) !important;
  border: 1px solid var(--prism-border-card);
  box-shadow: var(--prism-proj-shadow);
}
:is(button[data-testid="project-header"]:is(:hover, :focus-visible), .group\\/header:hover button[data-testid="project-header"], [data-project-card="true"]:is(:hover, :focus-visible))::before {
  border-color: var(--prism-accent-border) !important;
}
${leftSbScope} .group\\/header > div.absolute > :is(button, a) {
  border-radius: var(--prism-r-xs) !important;
  color: var(--prism-fg-2) !important;
  background-color: var(--prism-proj-act-bg) !important;
  border: 1px solid var(--prism-border-hairline) !important;
  backdrop-filter: var(--prism-chrome-chip-backdrop) !important;
  -webkit-backdrop-filter: var(--prism-chrome-chip-backdrop) !important;
}
${leftSbScope} .group\\/header > div.absolute > :is(button, a):is(:hover, :focus-visible) {
  color: var(--prism-fg) !important;
  background-color: var(--prism-surface-popover) !important;
  border-color: var(--prism-border-card) !important;
}
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
  background-image: var(--prism-sheen);
  backdrop-filter: var(--prism-chat-backdrop);
  -webkit-backdrop-filter: var(--prism-chat-backdrop);
  box-shadow: inset 0 1px 0 var(--prism-specular-top);
}
${rightPaneBeforeCss} {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  pointer-events: none;
  background-color: var(--prism-surface-right-pane, var(--prism-surface-chat));
  background-image: var(--prism-sheen);
  backdrop-filter: var(--prism-chat-backdrop);
  -webkit-backdrop-filter: var(--prism-chat-backdrop);
  box-shadow: inset 0 1px 0 var(--prism-specular-top);
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
  background-color: var(--prism-surface-sidebar);
  background-image: var(--prism-sheen);
  backdrop-filter: var(--prism-topbar-backdrop);
  -webkit-backdrop-filter: var(--prism-topbar-backdrop);
  box-shadow: inset 0 1px 0 var(--prism-specular-top);
}
:is([data-testid="customization-card"], .agy-spotlight-card, [data-testid="marketplace-bundles-banner"]) {
  background-color: var(--prism-surface-card) !important;
  border: 1px solid var(--prism-border-card) !important;
  box-shadow: inset 0 1px 0 var(--prism-specular-top) !important;
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

:is([data-testid="agent-input-box"], #antigravity\\.agentSidePanelInputBox > .surface-composer-card, .surface-composer-card, .agy-composer) {
  position: relative !important;
  isolation: isolate;
  background-color: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border: 1px solid var(--prism-border-card) !important;
  border-radius: ${radiusCard}px !important;
  box-shadow: var(--prism-shadow-island) !important;
}
:is([data-testid="agent-input-box"], #antigravity\\.agentSidePanelInputBox > .surface-composer-card, .surface-composer-card, .agy-composer)::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  pointer-events: none;
  background-color: var(--prism-surface-composer);
  backdrop-filter: var(--prism-composer-backdrop);
  -webkit-backdrop-filter: var(--prism-composer-backdrop);
}

[data-testid="conversation-view"]:not([data-testid="aux-pane-split"] *):not(.agy-shell > main *)${notHole},
[data-main-content-header]:not([data-testid="aux-pane-split"] *):not(.agy-shell > main *)${notHole} {
  background-color: var(--prism-surface-chat) !important;
  backdrop-filter: none !important;
}
[data-side-panel-strip] {
  border-bottom: 1px solid var(--prism-border-hairline) !important;
}
[data-testid="new-tab-search-input"] {
  background-color: var(--prism-new-tab-input-bg) !important;
  border: 1px solid var(--prism-border-card) !important;
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
  border: 1px solid var(--prism-border-card) !important;
  border-radius: var(--prism-r-ctl) !important;
  backdrop-filter: var(--prism-code-backdrop) !important;
  -webkit-backdrop-filter: var(--prism-code-backdrop) !important;
}
pre code, .md-code-block pre {
  background: transparent !important;
  border: none !important;
  backdrop-filter: none !important;
}
${
  cfg.layoutMode === 'islands'
    ? `.agy-shell { padding: ${Number(cfg.workspacePad ?? 8)}px !important; gap: ${Number(cfg.islandGap ?? 8)}px !important; box-sizing: border-box !important; }
${
  cfg.topbarStyle === 'bar'
    ? `:is([data-testid="title-menu-bar"], .monaco-workbench .part.titlebar)${notHole} {
  border-radius: ${radiusIsland}px !important;
  border: 1px solid var(--prism-border-island) !important;
  box-shadow: var(--prism-shadow-island) !important;
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
  border-radius: ${radiusIsland}px !important;
  border: 1px solid var(--prism-border-island) !important;
  box-shadow: var(--prism-shadow-island) !important;
}
:is([data-testid="aux-pane-split"] > :is(div, main, section):first-child, .agy-shell > main)${notHole} {
  border-radius: ${radiusIsland}px !important;
  border: 1px solid var(--prism-border-island) !important;
  box-shadow: var(--prism-shadow-island) !important;
}
:is([data-testid="aux-pane-split"] > :is(div, aside, section):last-child:not(:first-child):not([hidden]):not([aria-hidden="true"]), .monaco-workbench .part.auxiliarybar)${notHole} {
  border-radius: ${radiusIsland}px !important;
  border: 1px solid var(--prism-border-island) !important;
  box-shadow: var(--prism-shadow-island) !important;
}
:is([data-main-content-body], .agy-sheet [data-side-panel-body])::after {
  display: none !important;
}
:is([data-testid="sidebar-split"], [data-testid="aux-pane-split"]) > div:nth-child(2) { width: ${Number(cfg.islandGap ?? 8)}px !important; background: transparent !important; border: none !important; }`
    : `${
        cfg.topbarStyle === 'bar'
          ? `:is([data-testid="title-menu-bar"], .monaco-workbench .part.titlebar)${notHole} {
  border-radius: 0px !important;
  border: none !important;
  border-bottom: 1px solid var(--prism-border-hairline) !important;
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
:is([data-testid="sidebar-split"], [data-testid="aux-pane-split"]) > div:nth-child(2) { width: 1px !important; background-color: var(--prism-border-hairline) !important; }
:is(.agy-sidebar, aside[data-side-panel-body]:not(.agy-sheet *):not([data-testid="aux-pane-split"] *))${notHole} { border-right: 1px solid var(--prism-border-hairline) !important; }
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
:is([role="menu"], [role="listbox"], [role="dialog"]:not(#gemini-neko-observer-modal):not([data-testid="media-modal"]), [role="alertdialog"], .settings-modal-container, .agy-dialog, .agy-popover, .agy-menu, [data-radix-popper-content-wrapper] > *, [data-testid="title-menu-bar"] [data-browser-occluder="true"], .surface-opaque.bg-sidebar:not(.sticky):not([style*="sticky"])) {
  --background: var(--prism-surface-popover) !important;
  --color-background: var(--prism-surface-popover) !important;
  --content: var(--prism-surface-popover) !important;
  background-color: var(--prism-surface-popover) !important;
  backdrop-filter: var(--prism-popover-backdrop) !important;
  -webkit-backdrop-filter: var(--prism-popover-backdrop) !important;
  border: 1px solid var(--prism-border-popover) !important;
  box-shadow: var(--prism-shadow-popover) !important;
}
:is([data-testid="title-menu-bar"] [data-browser-occluder="true"], .surface-opaque.bg-sidebar:not(.sticky):not([style*="sticky"])) {
  border-radius: ${radiusCard}px !important;
}
:is(.agy-dialog, .settings-modal-container, [role="dialog"]:not(#gemini-neko-observer-modal):not([data-testid="media-modal"]), [role="alertdialog"]) :where(.dark, .light, .theme-dark, .theme-light) {
  --background: var(--prism-surface-popover) !important;
  --color-background: var(--prism-surface-popover) !important;
  --content: var(--prism-surface-popover) !important;
}
:is(.text-background, .ag-cs-home-heat-hint) {
  color: rgb(var(--prism-base-rgb)) !important;
}${welcomeLogoCssBlock}
`;
}

export { PRISM_DOM };
