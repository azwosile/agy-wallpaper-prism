// Wallpaper Prism Studio UI — Layer 2 Optics, Edge Coupling, Contrast & Preview Media
// Strict DAG L2: imports ONLY ../shared/schema.mjs and ./state.mjs.
// Zero `export let` live bindings; single source of truth for D7 fg contrast & CJK fonts.

import {
  REGION_IDS,
  GLASS_STYLES,
  ZERO_BLUR_BY_DEFAULT_REGIONS,
  SURFACE_TINT_BOUNDS,
  DEFAULT_REGION_ENTRY,
  DEFAULT_CONFIG,
  CJK_SAFE_FONT_PRESETS,
  sanitizeConfig,
  resolveSchemeTokens,
  resolveRegionEffectiveStyle,
  resolveComponentDefaultAlpha,
  sanitizeFontFamily,
  hexToRgbTriplet,
  relLumRgb,
  contrastRatioRgb,
  enforceFgContrastRgb,
  resolveRegionFgColor,
} from '../shared/schema.mjs';

import {
  store,
  apiJson,
  curLocale,
  tr,
  esc,
  withStaticPreviewParam,
  isStudioViewportActive,
  getActiveId,
  getEffectiveConfig,
  getResolvedPolarity,
  resolvePreviewVideoUrl,
  queueConfigPatch,
} from './state.mjs';

// Re-export single-source-of-truth helpers from schema.mjs (zero duplicate implementations).
export {
  relLumRgb,
  contrastRatioRgb,
  enforceFgContrastRgb,
  resolveRegionFgColor,
  sanitizeFontFamily,
  CJK_SAFE_FONT_PRESETS,
};

const grainTileCache = { dataUrl: '' };
const FROZEN_THUMB_LRU_LIMIT = 120;

// ============================================================================
// Color Math & Background Surface Contrast Floor
// ============================================================================
export function clampNum(v, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function parseRgbTriplet(trip, fallback = [14, 14, 17]) {
  const parts = String(trip || '')
    .split(',')
    .map((s) => Number(s.trim()));
  if (parts.length >= 3 && parts.slice(0, 3).every((n) => Number.isFinite(n))) {
    return [
      clampNum(Math.round(parts[0]), 0, 255),
      clampNum(Math.round(parts[1]), 0, 255),
      clampNum(Math.round(parts[2]), 0, 255),
    ];
  }
  return fallback;
}

export function mixRgbArr(a, b, w) {
  const tW = clampNum(Number(w) || 0, 0, 1);
  return [
    Math.round(a[0] + (b[0] - a[0]) * tW),
    Math.round(a[1] + (b[1] - a[1]) * tW),
    Math.round(a[2] + (b[2] - a[2]) * tW),
  ];
}

export function rgbToHsl(r, g, b) {
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

export function hslToRgb(h, s, l) {
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

export function rgbToHex(r, g, b) {
  const hex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

export function weColorToHex(raw) {
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

export function hexToWeColor(hex) {
  const trip = hexToRgbTriplet(hex, '102, 157, 246')
    .split(',')
    .map((s) => Number(s.trim()));
  return trip.map((v) => (v / 255).toFixed(4)).join(' ');
}

/**
 * Background surface contrast guardrail (pushes background toward dark/light surface anchor).
 * For foreground text color contrast, ALWAYS use `enforceFgContrastRgb` / `resolveRegionFgColor`!
 */
export function enforceContrastFloorRgb(rgb, fgRgb, isLight, minRatio = 4.5) {
  if (contrastRatioRgb(rgb, fgRgb) >= minRatio) return rgb;
  const anchor = isLight ? [255, 255, 255] : [0, 0, 0];
  let lo = 0;
  let hi = 1;
  let best = anchor;
  for (let step = 0; step < 12; step += 1) {
    const mid = (lo + hi) * 0.5;
    const cand = mixRgbArr(rgb, anchor, mid);
    if (contrastRatioRgb(cand, fgRgb) >= minRatio) {
      best = cand;
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return best;
}

function adaptCustomTintRgb(hexStr, isLight, contrastFloor) {
  const rgb = parseRgbTriplet(hexToRgbTriplet(hexStr, '14, 14, 17'));
  if (!contrastFloor) return rgb;
  const [h, s, l] = rgbToHsl(rgb[0], rgb[1], rgb[2]);
  if (!isLight && l > 0.24) {
    return hslToRgb(h, Math.min(s, 0.65), clampNum(0.06 + (1 - l) * 0.18, 0.04, 0.24));
  }
  if (isLight && l < 0.74) {
    return hslToRgb(h, Math.min(s, 0.45), clampNum(0.96 - l * 0.22, 0.74, 0.96));
  }
  return rgb;
}

function applyToneShiftRgb(rgb, tone, isLight) {
  const n = clampNum(Number(tone) || 0, -100, 100);
  if (n === 0) return rgb;
  if (!isLight) {
    return n < 0
      ? mixRgbArr(rgb, [0, 0, 0], Math.abs(n) / 100)
      : mixRgbArr(rgb, [92, 98, 114], (n / 100) * 0.85);
  }
  return n < 0
    ? mixRgbArr(rgb, [176, 186, 202], (Math.abs(n) / 100) * 0.85)
    : mixRgbArr(rgb, [255, 255, 255], n / 100);
}

// ============================================================================
// Shared Edge Coupling Formulas (1:1 parity with wallpaper-inject.js & host/index.mjs)
// ============================================================================
export function computeBorderFactor(alpha, bScale, overrideBorderOp = null) {
  if (overrideBorderOp !== null && overrideBorderOp !== undefined && overrideBorderOp !== '') {
    const ov = Number(overrideBorderOp);
    if (Number.isFinite(ov)) return clampNum(ov, 0, 1);
  }
  const bs = Number(bScale);
  const a = Number(alpha);
  if (!Number.isFinite(bs) || bs <= 0 || !Number.isFinite(a) || a <= 0.005) return 0;
  return bs * Math.pow(clampNum(a / 0.8, 0, 1), 0.9);
}

export function computeShadowFactor(alpha, shadowsOn, elevation = null) {
  const a = Number(alpha);
  // Mandatory Guardrail F-02: never emit phantom shadows on zero-opacity elements even when elevation > 0
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

export function buildSimBackdrop(px, isLight, isNested = false, customSat = null, effStyle = null) {
  if (effStyle === 'none' || effStyle === 'tinted' || effStyle === 'solid') return 'none';
  const r = Math.round(clampNum(Number(px) || 0, 0, 64));
  if (r <= 0) return 'none';
  const gpuR = r <= 28 ? r : Math.min(32, Math.round(28 + (4 * (r - 28)) / (r - 28 + 12)));
  const satBoost = r > 28 ? Math.round(Math.min(18, (r - 28) * 0.5)) : 0;
  const hasCustomSat =
    customSat !== null && customSat !== undefined && customSat !== '' && Number.isFinite(Number(customSat));
  const sat = hasCustomSat
    ? Math.round(clampNum(Number(customSat), 50, 220))
    : effStyle === 'crystal'
      ? isLight
        ? 165
        : 150
      : isNested
        ? Math.round(100 + Math.min(15, r * 0.25) + satBoost * 0.4)
        : isLight
          ? Math.round(125 + Math.min(65, r * 1.45) + satBoost)
          : Math.round(115 + Math.min(65, r * 1.35) + satBoost);
  return `blur(${gpuR}px) saturate(${sat}%)`;
}

function sanitizeSimGlassStyle(v) {
  if (v === null || v === undefined || v === '' || v === 'auto') return null;
  if (typeof v !== 'string') return null;
  const s = v.trim().toLowerCase();
  return GLASS_STYLES.includes(s) ? s : null;
}

function getRegionEntryMerged(comp, eff) {
  const reg = eff?.regions?.[comp];
  const tint = eff?.surfaceTints?.[comp];
  const base = { ...DEFAULT_REGION_ENTRY };
  if (tint && typeof tint === 'object') {
    if (tint.style !== undefined) base.style = tint.style;
    if (tint.glassEnabled !== undefined) base.glassEnabled = tint.glassEnabled;
    if (tint.blur !== undefined) base.blur = tint.blur;
    if (tint.saturation !== undefined) base.saturation = tint.saturation;
    if (tint.opacity !== undefined) base.opacity = tint.opacity;
    if (tint.tone !== undefined) base.tone = tint.tone;
    if (tint.tint !== undefined) base.tint = tint.tint;
    if (tint.borderOpacity !== undefined) base.borderOpacity = tint.borderOpacity;
    if (tint.elevation !== undefined) base.elevation = tint.elevation;
  }
  if (reg && typeof reg === 'object') {
    Object.assign(base, reg);
  }
  if (comp === 'sidebar') {
    if (eff.sidebarOpacity !== null && eff.sidebarOpacity !== undefined && base.opacity === null) {
      base.opacity = eff.sidebarOpacity;
    }
    if (eff.sidebarBlur !== null && eff.sidebarBlur !== undefined && base.blur === null) {
      base.blur = eff.sidebarBlur;
    }
  }
  return base;
}

function isWcoEntryAuto(entry) {
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

function resolveRegionBlurPxSim(comp, entry, eff, topbarBlurPx = null, effStyle = null) {
  const glassOn =
    entry.glassEnabled !== null && entry.glassEnabled !== undefined
      ? Boolean(entry.glassEnabled)
      : Boolean(eff.glassSurfaces !== false);
  if (!glassOn) return 0;

  const explicitStyle = sanitizeSimGlassStyle(entry.style);
  if (explicitStyle === 'none' || explicitStyle === 'tinted' || explicitStyle === 'solid') return 0;
  if (explicitStyle === null && (effStyle === 'none' || effStyle === 'tinted' || effStyle === 'solid')) {
    const hasExplicitPosBlur = entry.blur !== null && entry.blur !== undefined && Number(entry.blur) > 0;
    if (!hasExplicitPosBlur) return 0;
  }

  if (comp === 'wco' && entry.blur === null && entry.glassEnabled === null && explicitStyle === null && topbarBlurPx !== null) {
    return topbarBlurPx;
  }

  const gb = Number(eff.glassBlur) || 0;
  let defaultPx;
  if (comp === 'wco') {
    const tbBlur = eff.regions?.topbar?.blur;
    defaultPx = tbBlur !== null && tbBlur !== undefined ? Number(tbBlur) : gb;
  } else if (comp === 'sidebar') {
    const sbRaw = eff.sidebarBlur !== null && eff.sidebarBlur !== undefined ? eff.sidebarBlur : gb;
    defaultPx = Number(sbRaw) || 0;
  } else if (comp === 'composer') {
    defaultPx = gb > 0 ? Math.min(64, Math.round(gb + 4)) : 0;
  } else if (comp === 'popover') {
    defaultPx = gb > 0 ? Math.min(64, Math.round(gb + 6)) : 0;
  } else if (comp === 'codeBlock') {
    defaultPx =
      explicitStyle === 'frosted'
        ? gb > 0
          ? gb
          : 16
        : eff.codeReadabilityMode === 'frosted' && gb > 0
          ? Math.max(4, Math.round(gb * 0.85))
          : 0;
  } else if (ZERO_BLUR_BY_DEFAULT_REGIONS.includes(comp)) {
    defaultPx = 0;
  } else {
    defaultPx = gb;
  }

  let fallbackPx = defaultPx;
  if (effStyle === 'frosted') {
    fallbackPx = defaultPx > 0 ? defaultPx : 16;
  } else if (effStyle === 'crystal') {
    fallbackPx = defaultPx > 0 ? Math.max(10, Math.round(defaultPx * 0.75)) : 12;
  }

  const raw =
    entry.blur !== null && entry.blur !== undefined
      ? clampNum(Math.round(Number(entry.blur)), 0, 64)
      : clampNum(Math.round(Number(fallbackPx) || 0), 0, 64);
  if (raw <= 0) return 0;
  return Math.max(1, Math.round(raw * 0.85));
}

function resolveBorderWidths(borderStyle) {
  if (borderStyle === 'none') {
    return { top: '0px', right: '0px', bottom: '0px', left: '0px' };
  }
  if (borderStyle === 'bottom') {
    return { top: '0px', right: '0px', bottom: '1px', left: '0px' };
  }
  return { top: '1px', right: '1px', bottom: '1px', left: '1px' };
}

export function resolveSimRegionSurface(comp, eff = getEffectiveConfig(), tokens = null, isLight = null) {
  const polarity = isLight === null ? getResolvedPolarity(eff) : isLight ? 'light' : 'dark';
  const light = polarity === 'light';
  const tok = tokens || resolveSchemeTokens(eff, polarity);

  const entry = getRegionEntryMerged(comp, eff);
  const wcoAuto = comp === 'wco' && isWcoEntryAuto(entry);
  let topbarSurface = null;
  if (comp === 'wco') {
    topbarSurface = resolveSimRegionSurface('topbar', eff, tok, light);
  }

  const effStyleRaw = wcoAuto && topbarSurface
    ? topbarSurface.effStyle
    : resolveRegionEffectiveStyle(comp, entry, eff);
  const effEdgeStyle =
    comp === 'wco' && effStyleRaw === null && topbarSurface ? topbarSurface.effStyle : effStyleRaw;

  const baseRgb = parseRgbTriplet(tok.baseRgb, [14, 14, 17]);
  const shadeRgb = parseRgbTriplet(tok.shadeRgb, [9, 9, 11]);
  const tint1Rgb = parseRgbTriplet(tok.tint1Rgb, [20, 20, 24]);
  const tint2Rgb = parseRgbTriplet(tok.tint2Rgb, [28, 28, 34]);
  const popRgb = parseRgbTriplet(tok.popoverRgb, [22, 22, 28]);
  const accentRgb = parseRgbTriplet(tok.accentRgb || hexToRgbTriplet(tok.accent), [102, 157, 246]);
  const wallTintRgb = parseRgbTriplet(tok.wallTintRgb, [102, 157, 246]);
  const fgRgb = parseRgbTriplet(hexToRgbTriplet(tok.fg, light ? '15, 23, 42' : '242, 242, 245'));
  const ptRgb = parseRgbTriplet(tok.ptRgb, light ? [15, 23, 42] : [255, 255, 255]);
  const sbBaseRgb =
    !light && shadeRgb[0] + shadeRgb[1] + shadeRgb[2] > baseRgb[0] + baseRgb[1] + baseRgb[2]
      ? baseRgb
      : shadeRgb;

  const bounds = SURFACE_TINT_BOUNDS[comp] || { minOpacity: 0, maxOpacity: 0.98 };
  const wallMix = Number(eff.wallTintMix || 0);

  let finalRgb;
  let preMixRgb;
  let alpha;

  if (wcoAuto && topbarSurface) {
    finalRgb = topbarSurface.rgb;
    preMixRgb = topbarSurface.preMixRgb;
    alpha = topbarSurface.alpha;
  } else {
    const defaultRgb =
      comp === 'wco' && topbarSurface
        ? topbarSurface.hasToneOrTint
          ? topbarSurface.preMixRgb
          : sbBaseRgb
        : comp === 'topbar' || comp === 'sidebar'
          ? sbBaseRgb
          : comp === 'workspace' || comp === 'rightPane' || comp === 'assistantBubble'
            ? baseRgb
            : comp === 'codeBlock'
              ? effEdgeStyle === 'solid'
                ? tint1Rgb
                : baseRgb
              : comp === 'controls'
                ? tint2Rgb
                : comp === 'popover'
                  ? popRgb
                  : tint1Rgb;
    const baseWallWeight =
      comp === 'popover'
        ? wallMix * 0.4
        : comp === 'codeBlock'
          ? wallMix * 0.5
          : comp === 'composer' || comp === 'card' || comp === 'userBubble'
            ? wallMix
            : wallMix * 0.75;
    const styleWallRgb = effEdgeStyle === 'tinted' && wallMix <= 0 ? accentRgb : wallTintRgb;
    const wallWeight =
      effEdgeStyle === 'tinted'
        ? wallMix > 0
          ? Math.max(wallMix, 0.22)
          : 0.18
        : effEdgeStyle === 'solid'
          ? baseWallWeight * 0.5
          : baseWallWeight;

    const contrastOn = eff.contrastFloor !== false;
    const hasTint = Boolean(entry.tint);
    const toneVal = Number(entry.tone) || 0;
    const hasToneOrTint = hasTint || toneVal !== 0;

    let rgb = hasTint ? adaptCustomTintRgb(entry.tint, light, contrastOn) : defaultRgb;
    rgb = applyToneShiftRgb(rgb, toneVal, light);
    preMixRgb = hasToneOrTint && contrastOn ? enforceContrastFloorRgb(rgb, fgRgb, light, 4.5) : rgb;
    finalRgb = hasTint ? preMixRgb : mixRgbArr(preMixRgb, styleWallRgb, wallWeight);
    if ((hasToneOrTint || effEdgeStyle === 'tinted') && contrastOn) {
      finalRgb = enforceContrastFloorRgb(finalRgb, fgRgb, light, 4.5);
    }

    const solidChrome =
      comp === 'popover'
        ? false
        : entry.glassEnabled === true
          ? false
          : comp === 'assistantBubble' && effEdgeStyle === 'none'
            ? false
            : eff.glassSurfaces === false;
    if (solidChrome) {
      alpha = 1;
    } else if (entry.opacity !== null && entry.opacity !== undefined) {
      alpha = clampNum(Number(entry.opacity), bounds.minOpacity, bounds.maxOpacity);
    } else if (comp === 'wco' && topbarSurface && effStyleRaw === null) {
      alpha = topbarSurface.alpha;
    } else {
      alpha = resolveComponentDefaultAlpha(comp, eff, light);
    }
  }

  const isIslands = eff.layoutMode !== 'flush';
  const bScale = eff.borders === 'off' ? 0 : eff.borders === 'subtle' ? 0.5 : 1;
  const baseBorderA = 0.14;
  const effectiveBorderStyle =
    wcoAuto && topbarSurface
      ? topbarSurface.entry.borderStyle
      : comp === 'assistantBubble' && alpha <= 0.01 && entry.borderStyle === null
        ? 'none'
        : entry.borderStyle;
  const effectiveBorderOp = wcoAuto && topbarSurface ? topbarSurface.entry.borderOpacity : entry.borderOpacity;
  const effectiveElevation =
    wcoAuto && topbarSurface
      ? topbarSurface.entry.elevation
      : comp === 'wco' && (entry.elevation === null || entry.elevation === undefined) && topbarSurface
        ? topbarSurface.entry.elevation
        : entry.elevation;

  const styleBfScale = effEdgeStyle === 'tinted' ? 0.85 : effEdgeStyle === 'solid' ? 0.9 : 1;
  let borderFactor =
    effectiveBorderStyle === 'none' ? 0 : computeBorderFactor(alpha, bScale * styleBfScale, effectiveBorderOp);
  if (
    effEdgeStyle === 'crystal' &&
    effectiveBorderStyle !== 'none' &&
    bScale > 0 &&
    (effectiveBorderOp === null || effectiveBorderOp === undefined) &&
    borderFactor > 0
  ) {
    borderFactor = Math.min(1, borderFactor * 1.35 + 0.08);
  }

  const shadowEnabled = comp === 'popover' ? Boolean(eff.shadows) : Boolean(isIslands && eff.shadows);
  const shadowFactor = computeShadowFactor(alpha, shadowEnabled, effectiveElevation);

  const specMult = effEdgeStyle === 'crystal' ? 1.45 : effEdgeStyle === 'tinted' ? 0.4 : effEdgeStyle === 'solid' ? 0 : 1;
  const sheenMult = effEdgeStyle === 'crystal' ? 1.45 : effEdgeStyle === 'tinted' ? 0.4 : effEdgeStyle === 'solid' ? 0 : 1;

  const borderColor =
    borderFactor <= 0.001
      ? 'transparent'
      : `rgba(${ptRgb[0]}, ${ptRgb[1]}, ${ptRgb[2]}, ${(baseBorderA * borderFactor).toFixed(3)})`;
  const borderShorthand = `1px solid ${borderColor}`;
  const borderWidths = resolveBorderWidths(effectiveBorderStyle);

  const specular =
    borderFactor <= 0.001 || specMult <= 0
      ? 'transparent'
      : `rgba(255, 255, 255, ${clampNum((light ? 0.86 : 0.09) * borderFactor * specMult, 0, 1).toFixed(3)})`;
  const sheen =
    borderFactor <= 0.001 || sheenMult <= 0
      ? 'none'
      : light
        ? `linear-gradient(172deg, rgba(255, 255, 255, ${clampNum(0.68 * borderFactor * sheenMult, 0, 0.96).toFixed(3)}) 0%, rgba(255, 255, 255, 0) 40%)`
        : `linear-gradient(172deg, rgba(255, 255, 255, ${clampNum(0.045 * borderFactor * sheenMult, 0, 0.24).toFixed(3)}) 0%, rgba(255, 255, 255, 0) 38%)`;

  const shadowParts = [];
  if (borderFactor > 0.001 && specMult > 0) {
    shadowParts.push(`inset 0 1px 0 ${specular}`);
  }
  if (shadowFactor > 0.001) {
    const dropAlpha = clampNum((comp === 'popover' ? (light ? 0.24 : 0.54) : light ? 0.12 : 0.38) * shadowFactor, 0, 0.88);
    shadowParts.push(`0 6px 16px rgba(0, 0, 0, ${dropAlpha.toFixed(3)})`);
  }
  const shadowCss = shadowParts.length > 0 ? shadowParts.join(', ') : 'none';

  const blurPx = wcoAuto && topbarSurface
    ? topbarSurface.blurPx
    : resolveRegionBlurPxSim(comp, entry, eff, topbarSurface ? topbarSurface.blurPx : null, effEdgeStyle);
  const isNested =
    comp === 'composer' ||
    comp === 'card' ||
    comp === 'userBubble' ||
    comp === 'assistantBubble' ||
    comp === 'codeBlock' ||
    comp === 'controls';
  const satOverride =
    wcoAuto && topbarSurface
      ? topbarSurface.entry.saturation
      : comp === 'wco' && (entry.saturation === null || entry.saturation === undefined) && topbarSurface
        ? topbarSurface.entry.saturation
        : entry.saturation;
  const isDefaultPopover =
    comp === 'popover' &&
    (entry.style === null || entry.style === undefined) &&
    (entry.blur === null || entry.blur === undefined);
  const cutoff = isDefaultPopover ? 0.94 : 0.98;
  const backdrop = alpha >= cutoff ? 'none' : buildSimBackdrop(blurPx, light, isNested, satOverride, effEdgeStyle);

  const rawFgHex = entry.fontColor || eff.globalFontColor || '';
  const fgEval = resolveRegionFgColor({
    fgHex: rawFgHex,
    bgRgb: finalRgb,
    bgAlpha: alpha,
    isLight: light,
    allowRawFontColor: Boolean(entry.allowRawFontColor),
    minRatio: 4.5,
  });

  const fontFamily = sanitizeFontFamily(entry.fontFamily || eff.globalFontFamily || '');
  const fontSize = entry.fontSize ?? (comp === 'sidebar' ? eff.sidebarFontSize : null) ?? eff.globalFontSize ?? null;

  const baseR = eff.cornerStyle === 'sharp' ? 4 : eff.cornerStyle === 'soft' ? 12 : 8;
  let radiusCss;
  if (wcoAuto && topbarSurface) {
    radiusCss = topbarSurface.radiusCss;
  } else if (entry.radius !== null && entry.radius !== undefined) {
    radiusCss = `${Math.round(clampNum(Number(entry.radius), 0, 28) * 0.65)}px`;
  } else if (comp === 'topbar' || comp === 'wco') {
    radiusCss = isIslands ? `${Math.max(4, baseR - 2)}px` : '0px';
  } else if (comp === 'userBubble') {
    const ubPx = eff.cornerStyle === 'sharp' ? 10 : eff.cornerStyle === 'soft' ? 22 : 20;
    radiusCss = `${Math.max(6, Math.round(ubPx * 0.65))}px`;
  } else if (comp === 'codeBlock') {
    const cbPx = eff.cornerStyle === 'sharp' ? 6 : eff.cornerStyle === 'soft' ? 14 : 12;
    radiusCss = `${Math.max(3, Math.round(cbPx * 0.65))}px`;
  } else if (comp === 'controls') {
    radiusCss = `${Math.max(3, baseR - 4)}px`;
  } else if (comp === 'card' || comp === 'composer' || comp === 'popover' || comp === 'assistantBubble') {
    radiusCss = `${Math.max(3, baseR - 3)}px`;
  } else if (comp === 'sidebar') {
    const raw = eff.leftSidebarRadius;
    if (!isIslands) radiusCss = '0px';
    else if (raw === 'auto' || raw === 'native') radiusCss = `${baseR}px`;
    else radiusCss = `${Math.round(clampNum(Number(raw) || 0, 0, 28) * 0.65)}px`;
  } else if (comp === 'rightPane') {
    const raw = eff.rightSidebarRadius;
    if (!isIslands) radiusCss = '0px';
    else if (raw === 'auto' || raw === 'native') radiusCss = `${baseR}px`;
    else radiusCss = `${Math.round(clampNum(Number(raw) || 0, 0, 28) * 0.65)}px`;
  } else {
    radiusCss = isIslands ? `${baseR}px` : '0px';
  }

  const rgba = `rgba(${finalRgb[0]}, ${finalRgb[1]}, ${finalRgb[2]}, ${alpha.toFixed(3)})`;

  return {
    rgb: finalRgb,
    preMixRgb,
    alpha,
    rgba,
    bg: rgba,
    bgCss: rgba,
    blurPx,
    backdrop,
    effStyle: effEdgeStyle || (blurPx > 0 ? 'frosted' : 'none'),
    borderFactor,
    shadowFactor,
    border: borderColor,
    borderColor,
    borderCss: borderColor,
    borderShorthand,
    borderStyle: effectiveBorderStyle || null,
    borderWidths,
    specular,
    sheen,
    shadowCss,
    fg: fgEval.color || tok.fg,
    fgCss: fgEval.color || '',
    fgEval,
    fontFamily,
    fontSize,
    radiusCss,
    hasToneOrTint: Boolean(entry.tint) || Number(entry.tone || 0) !== 0,
    isAuto: wcoAuto,
    entry,
  };
}

/**
 * D7 Three-State Foreground Contrast Evaluator for a region (or explicit custom color override).
 */
export function evaluateRegionFgContrast(
  regionId,
  eff = getEffectiveConfig(),
  tokens = null,
  isLight = null,
  override = null,
) {
  const polarity = isLight === null ? getResolvedPolarity(eff) : isLight ? 'light' : 'dark';
  const light = polarity === 'light';
  const tok = tokens || resolveSchemeTokens(eff, polarity);
  const compId = REGION_IDS.includes(regionId) ? regionId : 'workspace';
  const surface = resolveSimRegionSurface(compId, eff, tok, light);
  const entry = surface.entry || DEFAULT_REGION_ENTRY;

  const fgHex =
    override && typeof override.fgHex === 'string'
      ? override.fgHex
      : entry.fontColor || (regionId === 'global' ? eff.globalFontColor : '') || '';
  const allowRawFontColor =
    override && typeof override.allowRawFontColor === 'boolean'
      ? override.allowRawFontColor
      : Boolean(entry.allowRawFontColor);
  const bgAlpha = override && override.bgAlpha !== undefined ? override.bgAlpha : surface.alpha;
  const bgRgb = override && Array.isArray(override.bgRgb) ? override.bgRgb : surface.rgb;

  const resolved = resolveRegionFgColor({
    fgHex,
    bgRgb,
    bgAlpha,
    isLight: light,
    allowRawFontColor,
    minRatio: 4.5,
  });

  let status = 'auto';
  if (resolved.rawHex) {
    if (resolved.lowOpacityWarning) {
      status = 'low-opacity';
    } else if (allowRawFontColor) {
      status = resolved.rawRatio !== null && resolved.rawRatio < 4.5 ? 'raw-warn' : 'raw-pass';
    } else if (resolved.clamped) {
      status = 'adjusted';
    } else {
      status = 'pass';
    }
  }

  return {
    ...resolved,
    bgRgb,
    bgAlpha,
    allowRawFontColor,
    hasCustomColor: Boolean(resolved.rawHex),
    status,
  };
}

// ============================================================================
// Static 160x160 Noise Tile (Replaces Expensive SVG <feTurbulence>) & Zero-Copy Gate
// ============================================================================
export function ensureStaticGrainTile() {
  if (grainTileCache.dataUrl) {
    if (typeof document !== 'undefined' && document.documentElement) {
      if (!document.documentElement.style.getPropertyValue('--prism-grain-tile')) {
        document.documentElement.style.setProperty('--prism-grain-tile', `url("${grainTileCache.dataUrl}")`);
      }
    }
    return grainTileCache.dataUrl;
  }
  if (typeof document === 'undefined') return '';
  try {
    const cvs = document.createElement('canvas');
    cvs.width = 160;
    cvs.height = 160;
    const ctx = cvs.getContext('2d');
    if (!ctx) return '';
    const imgData = ctx.createImageData(160, 160);
    const data = imgData.data;
    // Deterministic seeded LCG PRNG for 100% reproducible static grain tile
    let seed = 0x51a7c391;
    for (let i = 0; i < data.length; i += 4) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const v = (seed >>> 24) & 0xff;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
    const url = cvs.toDataURL('image/png');
    grainTileCache.dataUrl = url;
    if (document.documentElement) {
      document.documentElement.style.setProperty('--prism-grain-tile', `url("${url}")`);
    }
    return url;
  } catch {
    return '';
  }
}

export function isZeroCopyOverlaySafe(eff = getEffectiveConfig()) {
  const b = Number(eff?.mediaBrightness ?? DEFAULT_CONFIG.mediaBrightness);
  const c = Number(eff?.mediaContrast ?? DEFAULT_CONFIG.mediaContrast);
  const s = Number(eff?.mediaSaturate ?? DEFAULT_CONFIG.mediaSaturate);
  const fp = eff?.filterPreset || 'none';
  return b === 100 && c === 100 && s === 100 && fp === 'none';
}

// ============================================================================
// Static Thumbnail URL & Offscreen Canvas First-Frame LRU Freeze Fallback
// ============================================================================
export function toStaticThumbUrl(url) {
  return withStaticPreviewParam(url);
}

/**
 * Fallback freeze helper when Sidecar lacks ffmpeg and sends `X-Prism-Animated-Preview: 1`.
 * Captures frame-1 of an animated <img> onto an offscreen canvas (capped <= 480px wide) into LRU cache.
 */
export function freezeAnimatedThumbToDataUrl(imgEl, cacheKey = '') {
  if (typeof document === 'undefined' || !imgEl) return '';
  const key = String(cacheKey || imgEl.dataset?.liveSrc || imgEl.currentSrc || imgEl.src || '').trim();
  const lru = store.runtime.frozenThumbLru;
  if (key && lru.has(key)) {
    const hit = lru.get(key);
    lru.delete(key);
    lru.set(key, hit);
    return hit;
  }
  try {
    const natW = Number(imgEl.naturalWidth || 0);
    const natH = Number(imgEl.naturalHeight || 0);
    if (natW <= 0 || natH <= 0) return '';
    const maxW = 480;
    const scale = natW > maxW ? maxW / natW : 1;
    const w = Math.max(1, Math.round(natW * scale));
    const h = Math.max(1, Math.round(natH * scale));
    const cvs = document.createElement('canvas');
    cvs.width = w;
    cvs.height = h;
    const ctx = cvs.getContext('2d');
    if (!ctx) return '';
    ctx.drawImage(imgEl, 0, 0, w, h);
    const dataUrl = cvs.toDataURL('image/jpeg', 0.82);
    if (key && dataUrl) {
      if (lru.size >= FROZEN_THUMB_LRU_LIMIT) {
        const oldest = lru.keys().next().value;
        if (oldest !== undefined) lru.delete(oldest);
      }
      lru.set(key, dataUrl);
    }
    return dataUrl;
  } catch {
    return '';
  }
}

// ============================================================================
// Unified Studio Preview Video Gate & Zero-Reflow CSS Custom Property Sync
// ============================================================================
export function shouldPlayStudioPreviewVideo(eff = getEffectiveConfig()) {
  return Boolean(
    store.skinEnabled &&
      eff.previewLiveMedia === true &&
      !eff.paused &&
      isStudioViewportActive() &&
      store.runtime.isMiniStageInViewport &&
      !store.runtime.isDormant,
  );
}

const SIM_KEBAB_ALIASES = Object.freeze({
  rightPane: 'right-pane',
  userBubble: 'user-bubble',
  assistantBubble: 'assistant-bubble',
  codeBlock: 'code-block',
});

function applyRegionVarsToTarget(targetEl, comp, surf) {
  if (!targetEl || !targetEl.style) return;
  const kebab = SIM_KEBAB_ALIASES[comp];
  const keys = kebab ? [comp, kebab] : [comp];
  for (const k of keys) {
    targetEl.style.setProperty(`--sim-${k}-bg`, surf.rgba);
    targetEl.style.setProperty(`--sim-${k}-backdrop`, surf.backdrop);
    targetEl.style.setProperty(`--sim-${k}-border`, surf.borderShorthand);
    targetEl.style.setProperty(`--sim-${k}-border-color`, surf.borderColor);
    targetEl.style.setProperty(`--sim-${k}-bw-top`, surf.borderWidths.top);
    targetEl.style.setProperty(`--sim-${k}-bw-right`, surf.borderWidths.right);
    targetEl.style.setProperty(`--sim-${k}-bw-bottom`, surf.borderWidths.bottom);
    targetEl.style.setProperty(`--sim-${k}-bw-left`, surf.borderWidths.left);
    targetEl.style.setProperty(`--sim-${k}-shadow`, surf.shadowCss);
    targetEl.style.setProperty(`--sim-${k}-specular`, surf.specular);
    targetEl.style.setProperty(`--sim-${k}-sheen`, surf.sheen);
    targetEl.style.setProperty(`--sim-${k}-radius`, surf.radiusCss);
    targetEl.style.setProperty(`--sim-${k}-fg`, surf.fg);
    targetEl.style.setProperty(`--sim-${k}-font-family`, surf.fontFamily || 'inherit');
    targetEl.style.setProperty(`--sim-${k}-font-size`, surf.fontSize ? `${surf.fontSize}px` : '');
  }
}

function computeAuxSimVars(eff, tokens, isLight, compSurfaces) {
  const tint1Rgb = parseRgbTriplet(tokens.tint1Rgb, [20, 20, 24]);
  const tint2Rgb = parseRgbTriplet(tokens.tint2Rgb, [28, 28, 34]);
  const ptRgb = parseRgbTriplet(tokens.ptRgb, isLight ? [15, 23, 42] : [255, 255, 255]);
  const accentRgb = parseRgbTriplet(tokens.accentRgb || hexToRgbTriplet(tokens.accent), [102, 157, 246]);
  const wallTintRgb = parseRgbTriplet(tokens.wallTintRgb, accentRgb);
  const fgRgb = parseRgbTriplet(hexToRgbTriplet(tokens.fg, isLight ? '15, 23, 42' : '242, 242, 245'));
  const contrastOn = eff.contrastFloor !== false;

  const asstSurf = compSurfaces.assistantBubble;
  const asstEntry = asstSurf.entry || DEFAULT_REGION_ENTRY;
  const asstStyle = asstSurf.effStyle;
  const turnCardSolid = !(asstEntry.glassEnabled === true) && eff.glassSurfaces === false;
  const turnCardAlpha = turnCardSolid
    ? 1
    : asstEntry.opacity !== null && asstEntry.opacity !== undefined || asstStyle === 'solid'
      ? asstSurf.alpha
      : asstStyle === 'frosted' || asstStyle === 'crystal'
        ? Math.max(asstSurf.alpha, isLight ? 0.56 : 0.44)
        : clampNum((eff.glassOpacity || 0.76) * (isLight ? 0.8 : 0.64), isLight ? 0.52 : 0.42, 0.88);
  const turnCardRgb = asstSurf.hasToneOrTint
    ? asstSurf.rgb
    : mixRgbArr(tint1Rgb, wallTintRgb, Number(eff.wallTintMix || 0));
  const turnCardBg = `rgba(${turnCardRgb[0]}, ${turnCardRgb[1]}, ${turnCardRgb[2]}, ${turnCardAlpha.toFixed(3)})`;

  const ctrlSurf = compSurfaces.controls;
  const ctrlEntry = ctrlSurf.entry || DEFAULT_REGION_ENTRY;
  const ctrlSolid = !(ctrlEntry.glassEnabled === true) && eff.glassSurfaces === false;
  const ctrlActiveAlpha = ctrlSolid
    ? 1
    : ctrlEntry.opacity !== null && ctrlEntry.opacity !== undefined
      ? clampNum(Math.max(ctrlSurf.alpha, 0.56), 0.35, 0.96)
      : ctrlSurf.effStyle === 'solid'
        ? isLight
          ? 0.97
          : 0.96
        : isLight
          ? 0.82
          : 0.74;
  const rawCtrlActiveRgb = mixRgbArr(ctrlSurf.hasToneOrTint ? ctrlSurf.rgb : tint2Rgb, accentRgb, isLight ? 0.18 : 0.22);
  const ctrlActiveRgb = contrastOn ? enforceContrastFloorRgb(rawCtrlActiveRgb, fgRgb, isLight, 4.5) : rawCtrlActiveRgb;
  const controlActiveBg = `rgba(${ctrlActiveRgb[0]}, ${ctrlActiveRgb[1]}, ${ctrlActiveRgb[2]}, ${ctrlActiveAlpha.toFixed(3)})`;
  const controlHoverBg = `rgba(${ptRgb[0]}, ${ptRgb[1]}, ${ptRgb[2]}, ${isLight ? '0.075' : '0.085'})`;

  const rawSelectedRgb = mixRgbArr(tint2Rgb, accentRgb, isLight ? 0.22 : 0.28);
  const selectedRgb = contrastOn ? enforceContrastFloorRgb(rawSelectedRgb, fgRgb, isLight, 4.5) : rawSelectedRgb;
  const selectedBg = `rgba(${selectedRgb[0]}, ${selectedRgb[1]}, ${selectedRgb[2]}, ${isLight ? '0.220' : '0.240'})`;
  const scrollThumb = `rgba(${ptRgb[0]}, ${ptRgb[1]}, ${ptRgb[2]}, ${isLight ? '0.240' : '0.220'})`;

  return {
    turnCardBg,
    controlActiveBg,
    controlHoverBg,
    selectedBg,
    scrollThumb,
  };
}

function applyStageAndHubOpticalVars(stage, hub, eff, tokens, isLight, compSurfaces) {
  if (!stage || !hub) return;

  const skinEnabledStr = store.skinEnabled ? 'true' : 'false';
  stage.dataset.skinEnabled = skinEnabledStr;
  const disabledOverlay = stage.querySelector('.mini-disabled-overlay');
  if (disabledOverlay) {
    disabledOverlay.setAttribute('aria-hidden', store.skinEnabled ? 'true' : 'false');
  }

  const fitCss = eff.fit === 'center' ? 'none' : eff.fit;
  const totalScale = (eff.layerScale || 100) / 100;
  const mediaBlurSimPx = Math.round((eff.mediaBlur || 0) * 0.45 * 10) / 10;
  const scrimCol = eff.scrimColor && eff.scrimColor !== 'auto' ? eff.scrimColor : `rgb(${tokens.shadeRgb})`;
  const scrimAlpha =
    isLight && (!eff.scrimColor || eff.scrimColor === 'auto') && eff.scrimOpacity > 0
      ? Math.min(0.94, 0.16 + eff.scrimOpacity * 0.78)
      : eff.scrimOpacity;

  const vigBg = isLight
    ? 'radial-gradient(ellipse 58% 66% at 50% 48%, rgba(255,255,255,0.28) 0%, rgba(244,247,251,0.14) 62%, rgba(232,238,246,0.32) 100%)'
    : 'radial-gradient(ellipse 58% 66% at 50% 48%, rgba(9,9,11,0.04) 0%, rgba(9,9,11,0.16) 62%, rgba(9,9,11,0.34) 100%)';

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
  stage.style.setProperty('--sim-media-blur', `${mediaBlurSimPx}px`);
  stage.style.setProperty('--sim-media-blur-filter', mediaBlurSimPx > 0 ? `blur(${mediaBlurSimPx}px)` : 'none');
  stage.style.setProperty('--sim-media-blur-display', mediaBlurSimPx > 0 ? 'block' : 'none');
  stage.style.setProperty('--sim-media-brightness', `${eff.mediaBrightness}%`);
  stage.style.setProperty('--sim-media-contrast', `${eff.mediaContrast}%`);
  stage.style.setProperty('--sim-media-saturate', `${eff.mediaSaturate}%`);
  stage.style.setProperty('--sim-scale-total', totalScale.toFixed(3));
  stage.style.setProperty('--sim-flip', eff.flip ? '-1' : '1');
  stage.style.setProperty('--sim-scrim-color', scrimCol);
  stage.style.setProperty('--sim-scrim-opacity', scrimAlpha.toFixed(3));
  stage.style.setProperty('--sim-vignette-bg', vigBg);
  stage.style.setProperty('--sim-vignette-opacity', eff.vignette ? (isLight ? '0.36' : '0.44') : '0');
  stage.style.setProperty('--sim-grain-alpha', String(eff.grainAlpha));

  const mediaEl = stage.querySelector('.mini-media-el');
  if (mediaEl) {
    if (isZeroCopyOverlaySafe(eff)) {
      mediaEl.style.filter = 'none';
    } else {
      mediaEl.style.filter = `brightness(var(--sim-media-brightness, 100%)) contrast(var(--sim-media-contrast, 100%)) saturate(var(--sim-media-saturate, 100%))${extraFilter}`;
    }
    if (mediaEl.tagName === 'VIDEO') {
      if (Math.abs(mediaEl.playbackRate - (eff.playbackRate || 1)) > 0.02) {
        mediaEl.playbackRate = eff.playbackRate || 1;
      }
      const allowPlay = shouldPlayStudioPreviewVideo(eff);
      if (!allowPlay && !mediaEl.paused) {
        mediaEl.pause();
      } else if (allowPlay && mediaEl.paused) {
        mediaEl.play().catch(() => {});
      }
    }
  }

  const isIslands = eff.layoutMode === 'islands';
  hub.dataset.layout = eff.layoutMode;
  hub.dataset.topbarStyle = eff.topbarStyle || 'pills';
  hub.dataset.sidebarStyle = eff.sidebarListStyle || 'capsule';
  hub.dataset.wcoTransparent = eff.transparentWindowControls !== false ? 'true' : 'false';
  hub.dataset.assistantBlur = compSurfaces.assistantBubble.backdrop !== 'none' ? 'true' : 'false';

  const baseR = eff.cornerStyle === 'sharp' ? 4 : eff.cornerStyle === 'soft' ? 12 : 8;
  const blurPx = compSurfaces.workspace.blurPx;
  const sbBlurPx = compSurfaces.sidebar.blurPx;
  const compBlurPx = compSurfaces.composer.blurPx;
  const editorBg = compSurfaces.codeBlock.rgba;
  const codeBackdrop = compSurfaces.codeBlock.backdrop;
  const auxVars = computeAuxSimVars(eff, tokens, isLight, compSurfaces);

  for (const comp of REGION_IDS) {
    applyRegionVarsToTarget(hub, comp, compSurfaces[comp]);
  }

  if (typeof hub.querySelectorAll === 'function') {
    hub.querySelectorAll('[data-jump-region], [data-editor-region], [data-preview-region]').forEach((el) => {
      const rid = el.dataset?.jumpRegion || el.dataset?.editorRegion || el.dataset?.previewRegion || '';
      if (!rid || !compSurfaces[rid]) return;
      const bStyle = compSurfaces[rid].borderStyle;
      if (bStyle === 'bottom' || bStyle === 'none') {
        el.setAttribute('data-border-style', bStyle);
      } else {
        el.removeAttribute('data-border-style');
      }
      el.setAttribute('data-glass-style', compSurfaces[rid].effStyle || 'none');
    });
  }

  hub.style.setProperty('--sim-pad', isIslands ? `${Math.max(2, Math.round(eff.workspacePad * 0.75))}px` : '0px');
  hub.style.setProperty('--sim-gap', isIslands ? `${Math.max(0, Math.round(eff.islandGap * 0.75))}px` : '0px');
  hub.style.setProperty('--sim-r-island', compSurfaces.workspace.radiusCss);
  hub.style.setProperty('--sim-r-topbar', compSurfaces.topbar.radiusCss);
  hub.style.setProperty('--sim-r-wco', compSurfaces.wco.radiusCss);
  hub.style.setProperty('--sim-r-left', compSurfaces.sidebar.radiusCss);
  hub.style.setProperty('--sim-r-right', compSurfaces.rightPane.radiusCss);
  hub.style.setProperty('--sim-r-card', compSurfaces.card.radiusCss);
  hub.style.setProperty('--sim-r-user-bubble', compSurfaces.userBubble.radiusCss);
  hub.style.setProperty('--sim-r-assistant-bubble', compSurfaces.assistantBubble.radiusCss);
  hub.style.setProperty('--sim-r-code-block', compSurfaces.codeBlock.radiusCss);
  hub.style.setProperty('--sim-r-controls', compSurfaces.controls.radiusCss);
  hub.style.setProperty('--sim-r-composer', compSurfaces.composer.radiusCss);
  hub.style.setProperty('--sim-r-popover', compSurfaces.popover.radiusCss);

  // Explicit surface & backdrop variables (all 12 regions + auxiliary simulation vars)
  hub.style.setProperty('--sim-topbar-bg', compSurfaces.topbar.rgba);
  hub.style.setProperty('--sim-wco-bg', compSurfaces.wco.rgba);
  hub.style.setProperty('--sim-sidebar-bg', compSurfaces.sidebar.rgba);
  hub.style.setProperty('--sim-chat-bg', compSurfaces.workspace.rgba);
  hub.style.setProperty('--sim-right-pane-bg', compSurfaces.rightPane.rgba);
  hub.style.setProperty('--sim-composer-bg', compSurfaces.composer.rgba);
  hub.style.setProperty('--sim-card-bg', compSurfaces.card.rgba);
  hub.style.setProperty('--sim-popover-bg', compSurfaces.popover.rgba);
  hub.style.setProperty('--sim-turn-card-bg', auxVars.turnCardBg);
  hub.style.setProperty('--sim-control-active-bg', auxVars.controlActiveBg);
  hub.style.setProperty('--sim-control-hover-bg', auxVars.controlHoverBg);
  hub.style.setProperty('--sim-selected-bg', auxVars.selectedBg);
  hub.style.setProperty('--sim-scroll-thumb', auxVars.scrollThumb);

  hub.style.setProperty('--sim-topbar-backdrop', compSurfaces.topbar.backdrop);
  hub.style.setProperty('--sim-wco-backdrop', compSurfaces.wco.backdrop);
  hub.style.setProperty('--sim-sidebar-backdrop', compSurfaces.sidebar.backdrop);
  hub.style.setProperty('--sim-chat-backdrop', compSurfaces.workspace.backdrop);
  hub.style.setProperty('--sim-right-pane-backdrop', compSurfaces.rightPane.backdrop);
  hub.style.setProperty('--sim-composer-backdrop', compSurfaces.composer.backdrop);
  hub.style.setProperty('--sim-card-backdrop', compSurfaces.card.backdrop);
  hub.style.setProperty('--sim-popover-backdrop', compSurfaces.popover.backdrop);
  hub.style.setProperty('--sim-code-backdrop', codeBackdrop);

  hub.style.setProperty('--sim-wco-symbol', compSurfaces.wco.fg);
  hub.style.setProperty('--sim-sidebar-blur', `${sbBlurPx}px`);
  hub.style.setProperty('--sim-editor-bg', editorBg);
  hub.style.setProperty('--sim-code-blur', codeBackdrop);
  hub.style.setProperty('--sim-blur', `${blurPx}px`);
  hub.style.setProperty('--sim-blur-lg', `${compBlurPx}px`);
  hub.style.setProperty('--sim-border', compSurfaces.workspace.borderShorthand);
  hub.style.setProperty('--sim-shadow', compSurfaces.workspace.shadowCss);
  hub.style.setProperty('--sim-caret', eff.caretColor || tokens.accent);
  hub.style.setProperty('--sim-r-base', `${baseR}px`);
}

export function syncOpticalCssVars() {
  if (typeof document === 'undefined' || !document.documentElement) return;
  const eff = getEffectiveConfig();
  const polarity = getResolvedPolarity(eff);
  const isLight = polarity === 'light';
  const tokens = resolveSchemeTokens(eff, polarity);
  const root = document.documentElement;

  if (!store.runtime.isDormant) {
    ensureStaticGrainTile();
  }

  root.dataset.prismTheme = polarity;
  root.dataset.prismScheme = eff.colorScheme;
  root.dataset.prismCorners = eff.cornerStyle;
  root.dataset.skinEnabled = store.skinEnabled ? 'true' : 'false';
  root.lang = curLocale() === 'en' ? 'en' : 'zh-CN';

  root.style.setProperty('--prism-accent', tokens.accent);
  root.style.setProperty('--prism-accent-rgb', tokens.accentRgb);
  root.style.setProperty('--prism-accent-fg', tokens.accentFg);
  root.style.setProperty('--prism-wall-tint-rgb', tokens.wallTintRgb);
  root.style.setProperty('--prism-wall-tint-mix', `${Math.round((eff.wallTintMix || 0) * 1000) / 10}%`);

  // Resolve all 12 region surfaces once so swatches, 21:9 preview & visual editor stay 1:1 live
  const compSurfaces = {};
  for (const comp of REGION_IDS) {
    compSurfaces[comp] = resolveSimRegionSurface(comp, eff, tokens, isLight);
    applyRegionVarsToTarget(root, comp, compSurfaces[comp]);
  }
  const auxVars = computeAuxSimVars(eff, tokens, isLight, compSurfaces);
  root.style.setProperty('--sim-chat-bg', compSurfaces.workspace.rgba);
  root.style.setProperty('--sim-chat-backdrop', compSurfaces.workspace.backdrop);
  root.style.setProperty('--sim-right-pane-backdrop', compSurfaces.rightPane.backdrop);
  root.style.setProperty('--sim-wco-symbol', compSurfaces.wco.fg);
  root.style.setProperty('--sim-editor-bg', compSurfaces.codeBlock.rgba);
  root.style.setProperty('--sim-code-backdrop', compSurfaces.codeBlock.backdrop);
  root.style.setProperty('--sim-turn-card-bg', auxVars.turnCardBg);
  root.style.setProperty('--sim-control-active-bg', auxVars.controlActiveBg);
  root.style.setProperty('--sim-control-hover-bg', auxVars.controlHoverBg);
  root.style.setProperty('--sim-selected-bg', auxVars.selectedBg);
  root.style.setProperty('--sim-scroll-thumb', auxVars.scrollThumb);

  const skinEnabledStr = store.skinEnabled ? 'true' : 'false';
  document.querySelectorAll('.prism-preview-card').forEach((card) => {
    card.dataset.skinEnabled = skinEnabledStr;
  });

  // Sync primary 21:9 mini preview
  const stage = document.getElementById('prism-mini-stage');
  const hub = document.getElementById('prism-mini-hub');
  if (stage && hub) {
    applyStageAndHubOpticalVars(stage, hub, eff, tokens, isLight, compSurfaces);
  }

  // Sync secondary interactive visual-editor canvas if mounted (supports dark/light preview override)
  const canvasStage = document.getElementById('prism-visual-canvas-stage');
  const canvasHub = document.getElementById('prism-visual-canvas-hub');
  if (canvasStage && canvasHub) {
    const canvasPolarity =
      store.canvasPreviewTheme === 'light' || store.canvasPreviewTheme === 'dark'
        ? store.canvasPreviewTheme
        : polarity;
    if (canvasPolarity === polarity) {
      applyStageAndHubOpticalVars(canvasStage, canvasHub, eff, tokens, isLight, compSurfaces);
    } else {
      const cIsLight = canvasPolarity === 'light';
      const cTokens = resolveSchemeTokens(eff, canvasPolarity);
      const cSurfaces = {};
      for (const comp of REGION_IDS) {
        cSurfaces[comp] = resolveSimRegionSurface(comp, eff, cTokens, cIsLight);
      }
      canvasStage.dataset.prismTheme = canvasPolarity;
      applyStageAndHubOpticalVars(canvasStage, canvasHub, eff, cTokens, cIsLight, cSurfaces);
    }
  }

  const isIslands = eff.layoutMode === 'islands';
  const hudLayout = document.getElementById('mini-hud-layout');
  const hudAccent = document.getElementById('mini-hud-accent');
  const hudLiveBtn = document.getElementById('mini-hud-live-btn');
  if (hudLayout) {
    hudLayout.textContent = !store.skinEnabled
      ? tr('preview.disabledBadge')
      : isIslands
        ? `ISLANDS · ${eff.islandGap}px`
        : 'FLUSH';
  }
  if (hudAccent) {
    hudAccent.textContent = `${eff.colorScheme.toUpperCase()} · ${tokens.accent.toUpperCase()}`;
  }
  if (hudLiveBtn) {
    hudLiveBtn.dataset.live = eff.previewLiveMedia ? 'true' : 'false';
    hudLiveBtn.textContent = eff.previewLiveMedia ? tr('preview.liveOn') : tr('preview.liveOff');
  }
}

// ============================================================================
// Preview Media Mount & Decoder Teardown (Mode-Prefixed Signature Guard)
// ============================================================================
export function releaseExistingPreviewVideo(wrap = null) {
  const targets = [];
  if (wrap) {
    targets.push(wrap);
  } else if (typeof document !== 'undefined') {
    const mini = document.getElementById('mini-media-layer');
    if (mini) targets.push(mini);
    const canvas = document.getElementById('visual-canvas-media-layer');
    if (canvas) targets.push(canvas);
  }
  for (const el of targets) {
    const vids = el.querySelectorAll ? el.querySelectorAll('video') : [];
    for (const oldVid of vids) {
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
}

function clearSlideshowTimer() {
  if (store.runtime.slideshowTimer) {
    clearInterval(store.runtime.slideshowTimer);
    store.runtime.slideshowTimer = null;
  }
}

function mountStaticPreviewImg(wrap, item) {
  const rawSrc =
    item.kind === 'slideshow'
      ? item.slides?.[0] || item.thumbUrl || item.mediaUrl || ''
      : item.kind === 'image'
        ? item.mediaUrl || item.thumbUrl || ''
        : item.thumbUrl || item.mediaUrl || '';
  const staticSrc = toStaticThumbUrl(rawSrc);
  if (!staticSrc) return;
  const img = document.createElement('img');
  img.className = 'mini-media-el';
  img.alt = item.title || 'Wallpaper';
  img.onerror = () => img.remove();
  img.src = staticSrc;
  wrap.appendChild(img);
}

function syncSecondaryCanvasMedia(item, eff, modePrefix) {
  if (typeof document === 'undefined') return;
  const canvasWrap = document.getElementById('visual-canvas-media-layer');
  if (!canvasWrap) return;
  const rawSrc = item
    ? item.kind === 'slideshow'
      ? item.slides?.[0] || item.thumbUrl || item.mediaUrl || ''
      : item.kind === 'image'
        ? item.mediaUrl || item.thumbUrl || ''
        : item.thumbUrl || item.mediaUrl || ''
    : '';
  const staticSrc = toStaticThumbUrl(rawSrc);
  const sig = `${modePrefix}|${item?.id || 'none'}|${staticSrc}`;
  if (canvasWrap.dataset.mediaSig === sig && canvasWrap.children.length > 0) return;
  canvasWrap.dataset.mediaSig = sig;
  releaseExistingPreviewVideo(canvasWrap);
  canvasWrap.innerHTML = '';
  if (item?.schemeColor) {
    const col = weColorToHex(item.schemeColor);
    if (col) {
      canvasWrap.style.background = `radial-gradient(circle at 30% 35%, ${col}88, transparent 60%), linear-gradient(135deg, ${col}44, #0a0c14)`;
    }
  }
  if (item && staticSrc) {
    mountStaticPreviewImg(canvasWrap, item);
  }
}

export function syncMiniPreviewMedia() {
  if (typeof document === 'undefined') return;
  const wrap = document.getElementById('mini-media-layer');
  const item = store.activeItem || store.items.find((x) => x.id === getActiveId()) || null;
  const videoUrl = resolvePreviewVideoUrl(item);
  const eff = getEffectiveConfig();
  const allowLiveVideo = shouldPlayStudioPreviewVideo(eff);

  const modePrefix = !store.skinEnabled
    ? 'static-disabled'
    : eff.paused
      ? 'static-paused'
      : allowLiveVideo
        ? 'live-video'
        : 'static-eco';

  syncSecondaryCanvasMedia(item, eff, modePrefix);

  if (!wrap) {
    syncOpticalCssVars();
    return;
  }

  if (item?.schemeColor) {
    const col = weColorToHex(item.schemeColor);
    if (col) {
      wrap.style.background = `radial-gradient(circle at 30% 35%, ${col}88, transparent 60%), linear-gradient(135deg, ${col}44, #0a0c14)`;
    }
  }

  const sig = `${modePrefix}|${item?.id || 'none'}|${item?.kind || ''}|${videoUrl || item?.mediaUrl || ''}|${item?.thumbUrl || ''}|${item?.slidesUrl || ''}`;

  // Persistent <video> fast path: ONLY when live video is allowed AND mode+media signature matches!
  if (videoUrl && allowLiveVideo) {
    const existingVid = wrap.querySelector('video#prism-preview-video');
    if (existingVid && existingVid.dataset.mediaSrc === videoUrl && store.runtime.currentStageMediaSig === sig) {
      syncOpticalCssVars();
      maybeExtractWallpaperAccent(item);
      return;
    }

    clearSlideshowTimer();
    releaseExistingPreviewVideo(wrap);
    wrap.innerHTML = '';
    store.runtime.currentStageMediaSig = sig;

    let posterImg = null;
    if (item?.thumbUrl) {
      posterImg = document.createElement('img');
      posterImg.className = 'mini-poster-overlay';
      posterImg.alt = '';
      posterImg.onerror = () => posterImg.remove();
      posterImg.src = toStaticThumbUrl(item.thumbUrl);
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
      if (shouldPlayStudioPreviewVideo() && vid.paused) {
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

  // Static eco / disabled / paused / image / slideshow path
  if (sig === store.runtime.currentStageMediaSig && wrap.children.length > 0 && !wrap.querySelector('video')) {
    syncOpticalCssVars();
    return;
  }

  store.runtime.currentStageMediaSig = sig;
  clearSlideshowTimer();
  releaseExistingPreviewVideo(wrap);
  wrap.innerHTML = '';

  if (!item) {
    syncOpticalCssVars();
    return;
  }

  if (
    item.kind === 'slideshow' &&
    allowLiveVideo &&
    (item.slidesUrl || Array.isArray(item.slides))
  ) {
    const img = document.createElement('img');
    img.className = 'mini-media-el';
    img.alt = item.title || 'Slideshow';
    img.src = toStaticThumbUrl(item.slides?.[0] || item.thumbUrl || item.mediaUrl || '');
    wrap.appendChild(img);

    const startCycle = (urls, intervalSec) => {
      if (urls.length > 0) {
        let idx = 0;
        img.src = urls[0];
        if (urls.length > 1) {
          const sec = Math.max(4, eff.pictureSlideSeconds || intervalSec || 12);
          store.runtime.slideshowTimer = setInterval(() => {
            if (!shouldPlayStudioPreviewVideo()) return;
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
          if (getActiveId() !== reqId || !shouldPlayStudioPreviewVideo()) return;
          const urls = Array.isArray(manifest?.slides)
            ? manifest.slides.map((s) => (typeof s === 'string' ? s : s?.url)).filter(Boolean)
            : [];
          startCycle(urls, manifest?.intervalSec || 12);
        })
        .catch(() => {});
    }
  } else {
    mountStaticPreviewImg(wrap, item);
  }

  syncOpticalCssVars();
  if (!store.runtime.isDormant) {
    maybeExtractWallpaperAccent(item);
  }
}

// ============================================================================
// 32x32 Offscreen Canvas Chroma-Weighted Histogram Accent Extractor
// ============================================================================
export function computeHistogramAccentFromImageData(data, wallpaperId) {
  const buckets = Array.from({ length: 24 }, () => ({ w: 0, hSin: 0, hCos: 0, sSum: 0 }));
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 128) continue;
    const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    if (l < 0.12 || l > 0.9 || s < 0.16) continue;
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
  const [trR, trG, trB] = hslToRgb(winH, 0.45, 0.5);

  return {
    wallpaperId,
    darkHex: rgbToHex(dr, dg, db),
    lightHex: rgbToHex(lr, lg, lb),
    tintRgb: `${trR}, ${trG}, ${trB}`,
  };
}

export function renderExtractedSwatchesHtml() {
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

// D8: Single-instance readout in Tab 2 Global region (left rail #rail-extracted-chips removed).
export function syncExtractedSwatchesInDom() {
  if (typeof document === 'undefined') return;
  const readout = document.getElementById('prism-extracted-readout');
  if (readout) {
    readout.innerHTML = renderExtractedSwatchesHtml();
  }
}

export function applyExtractedAccentResult(extracted, persistToServer = true) {
  if (!extracted || !extracted.wallpaperId) return;
  store.runtime.accentMemCache.set(extracted.wallpaperId, extracted);
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

export function maybeExtractWallpaperAccent(item) {
  if (!item || !item.id) return;
  const curExt = store.config.extractedAccent;
  if (curExt && curExt.wallpaperId === item.id && curExt.darkHex) {
    store.runtime.accentMemCache.set(item.id, curExt);
    syncExtractedSwatchesInDom();
    return;
  }
  const cached = store.runtime.accentMemCache.get(item.id) || store.config.accentCache?.[item.id];
  if (cached && cached.darkHex) {
    applyExtractedAccentResult({ ...cached, wallpaperId: item.id }, !store.config.accentCache?.[item.id]);
    return;
  }
  const rawUrl = item.thumbUrl || (item.kind === 'image' ? item.mediaUrl : '');
  const srcUrl = toStaticThumbUrl(rawUrl);
  if (!srcUrl) {
    const fallbackHex = weColorToHex(item.schemeColor);
    if (fallbackHex) {
      const trip = hexToRgbTriplet(fallbackHex)
        .split(',')
        .map((s) => Number(s.trim()));
      const [h, s] = rgbToHsl(trip[0], trip[1], trip[2]);
      const sat = Math.min(0.84, Math.max(0.52, s || 0.6));
      const [dr, dg, db] = hslToRgb(h, sat, 0.68);
      const [lr, lg, lb] = hslToRgb(h, sat, 0.44);
      const [trR, trG, trB] = hslToRgb(h, 0.45, 0.5);
      applyExtractedAccentResult({
        wallpaperId: item.id,
        darkHex: rgbToHex(dr, dg, db),
        lightHex: rgbToHex(lr, lg, lb),
        tintRgb: `${trR}, ${trG}, ${trB}`,
      });
    }
    return;
  }

  if (typeof Image === 'undefined' || typeof document === 'undefined') return;
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
