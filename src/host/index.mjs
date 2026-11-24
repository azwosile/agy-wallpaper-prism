// Host injection script loader & client skin payload builder for agy-wallpaper-prism.
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
  if (/^(https?:|data:|blob:)/i.test(u)) return u;
  const origin = String(mediaOrigin || '').replace(/\/+$/, '');
  if (!origin) return u;
  return u.startsWith('/') ? `${origin}${u}` : `${origin}/${u}`;
}

/**
 * Assemble the canonical JSON-serializable payload consumed by `window.__agyPrism.applyPayload(payload)`.
 */
export function buildClientSkinPayload(config = DEFAULT_CONFIG, activeItem = null, mediaOrigin = '', extra = {}) {
  const baseClean = sanitizeConfig(config || {});
  const wid = String(activeItem?.id || baseClean.activeWallpaperId || baseClean.wallpaperId || '');
  const effective = resolveEffectiveConfig(baseClean, wid);

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
    let mediaUrl = resolveMediaUrl(activeItem.mediaUrl, mediaOrigin);
    if (kind === 'scene' && (sceneMode === 'video' || sceneMode === 'scene-video') && sceneVideoUrl) {
      mediaUrl = sceneVideoUrl;
    }

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
      sceneVideoUrl,
      sceneLiveUrl,
      webUrl,
      audioUrl: resolveMediaUrl(activeItem.audioUrl, mediaOrigin),
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

function parseRgbTriplet(triplet) {
  const parts = String(triplet || '')
    .split(',')
    .map((s) => Number(s.trim()) || 0);
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

function rgbSum(triplet) {
  const parts = parseRgbTriplet(triplet);
  return parts[0] + parts[1] + parts[2];
}

function mixTriplet(tripletA, rgbB, weightB) {
  const a = parseRgbTriplet(tripletA);
  const w = Math.min(1, Math.max(0, Number(weightB) || 0));
  return `${Math.round(a[0] * (1 - w) + rgbB[0] * w)}, ${Math.round(a[1] * (1 - w) + rgbB[1] * w)}, ${Math.round(a[2] * (1 - w) + rgbB[2] * w)}`;
}

function buildPolarityTokenVarsCss(cfg, tok, isLight) {
  const glassOp = Math.min(0.98, Math.max(0.25, Number(cfg.glassOpacity ?? 0.76)));
  const fidelity = Math.min(1, Math.max(0, Number(cfg.glassFidelity ?? 92) / 100));
  const chatFid = Math.min(1, Math.max(0, Number(cfg.chatGlassFidelity ?? 90) / 100));
  const sbBaseRgb = !isLight && rgbSum(tok.shadeRgb) > rgbSum(tok.baseRgb) ? tok.baseRgb : tok.shadeRgb;
  const hasCustomSbOp =
    cfg.sidebarOpacity !== null &&
    cfg.sidebarOpacity !== undefined &&
    cfg.sidebarOpacity !== '' &&
    cfg.sidebarOpacity !== 'auto' &&
    Number.isFinite(Number(cfg.sidebarOpacity));
  const effSbOp = hasCustomSbOp ? Math.min(0.98, Math.max(0.2, Number(cfg.sidebarOpacity))) : glassOp;
  const minSbFloor = hasCustomSbOp ? 0.2 : cfg.contrastFloor !== false ? (isLight ? 0.62 : 0.52) : 0.25;
  const sbAlpha =
    cfg.glassSurfaces === false
      ? 1
      : Math.min(0.99, Math.max(effSbOp, minSbFloor * (hasCustomSbOp ? 1 : fidelity)));
  const deepSbRgb = isLight ? mixTriplet(sbBaseRgb, [215, 224, 238], 0.35) : mixTriplet(sbBaseRgb, [3, 4, 7], 0.55);
  const deepSbAlpha =
    cfg.glassSurfaces === false
      ? 1
      : isLight
        ? Math.min(0.97, Math.max(0.45, Math.max(effSbOp + 0.14, 0.90)))
        : Math.min(0.96, Math.max(0.35, Math.max(effSbOp + 0.12, 0.88)));
  const blurPx = cfg.glassSurfaces === false ? 0 : Math.round(Number(cfg.glassBlur ?? 16) * (0.45 + 0.55 * fidelity));
  const hasCustomSbBlur =
    cfg.sidebarBlur !== null &&
    cfg.sidebarBlur !== undefined &&
    cfg.sidebarBlur !== '' &&
    cfg.sidebarBlur !== 'auto' &&
    Number.isFinite(Number(cfg.sidebarBlur));
  const sbBlurPx =
    cfg.glassSurfaces === false
      ? 0
      : Math.min(48, Math.max(0, Math.round(hasCustomSbBlur ? Number(cfg.sidebarBlur) : Number(cfg.glassBlur ?? 16))));
  const chatAlpha = cfg.glassSurfaces === false ? 0.96 : Math.min(0.96, Math.max(0.28, glassOp * (0.55 + 0.45 * chatFid)));
  const cardAlpha = cfg.glassSurfaces === false ? 0.96 : Math.min(0.97, Math.max(0.42, glassOp + 0.08));
  const compAlpha = cfg.glassSurfaces === false ? 0.97 : Math.min(0.97, Math.max(0.56, glassOp + 0.14));
  const minEd = cfg.contrastFloor !== false ? (isLight ? 0.78 : 0.72) : 0.34;
  const edAlpha =
    cfg.codeReadabilityMode === 'solid'
      ? isLight
        ? 0.97
        : 0.95
      : cfg.codeReadabilityMode === 'frosted'
        ? Math.max(minEd, Math.min(0.95, glassOp + 0.14))
        : Math.max(minEd, Math.min(0.94, glassOp + 0.06));
  const popAlpha = cfg.floaterSolidBase !== false ? (isLight ? 0.97 : 0.96) : 0.94;
  const bScale = cfg.borders === 'off' ? 0 : cfg.borders === 'subtle' ? 0.55 : 1;
  const islandBorderA = ((isLight ? 0.14 : 0.12) * bScale).toFixed(3);
  const cardBorderA = ((isLight ? 0.13 : 0.11) * bScale).toFixed(3);
  const hairBorderA = ((isLight ? 0.1 : 0.08) * Math.max(0.35, bScale)).toFixed(3);

  return [
    `  --prism-native-floor: ${isLight ? '#f8fafc' : '#070708'};`,
    `  --prism-shade-rgb: ${tok.shadeRgb};`,
    `  --prism-sidebar-rgb: ${sbBaseRgb};`,
    `  --prism-sidebar-deep-rgb: ${deepSbRgb};`,
    `  --prism-base-rgb: ${tok.baseRgb};`,
    `  --prism-tint-1-rgb: ${tok.tint1Rgb};`,
    `  --prism-tint-2-rgb: ${tok.tint2Rgb};`,
    `  --prism-sticky-sidebar-bg: rgba(${deepSbRgb}, ${isLight ? '0.940' : '0.910'});`,
    `  --prism-fg: ${tok.fg};`,
    `  --prism-fg-2: ${tok.fg2};`,
    `  --prism-fg-muted: ${tok.fgMuted};`,
    `  --prism-fg-faint: ${tok.fgFaint};`,
    `  --prism-accent: ${tok.accent};`,
    `  --prism-accent-rgb: ${tok.accentRgb};`,
    `  --prism-accent-fg: ${tok.accentFg};`,
    `  --prism-accent-border: rgba(${tok.accentRgb}, ${isLight ? '0.420' : '0.480'});`,
    `  --prism-link: ${tok.link};`,
    `  --prism-surface-sidebar: rgba(${sbBaseRgb}, ${sbAlpha.toFixed(3)});`,
    `  --prism-surface-sidebar-deep: rgba(${deepSbRgb}, ${deepSbAlpha.toFixed(3)});`,
    `  --prism-surface-chat: rgba(${tok.baseRgb}, ${chatAlpha.toFixed(3)});`,
    `  --prism-surface-card: rgba(${tok.tint1Rgb}, ${cardAlpha.toFixed(3)});`,
    `  --prism-surface-composer: rgba(${tok.tint1Rgb}, ${compAlpha.toFixed(3)});`,
    `  --prism-surface-editor: rgba(${tok.shadeRgb}, ${edAlpha.toFixed(3)});`,
    `  --prism-surface-code-block: rgba(${tok.shadeRgb}, ${Math.max(minEd, Math.min(0.95, edAlpha + 0.04)).toFixed(3)});`,
    `  --prism-surface-popover: rgba(${tok.popoverRgb}, ${popAlpha.toFixed(3)});`,
    `  --prism-secondary-bg: rgba(${tok.tint2Rgb}, ${Math.min(0.92, cardAlpha * 0.82).toFixed(3)});`,
    `  --prism-muted-bg: rgba(${tok.ptRgb}, ${isLight ? '0.065' : '0.060'});`,
    `  --prism-cust-pill-bg: rgba(${sbBaseRgb}, ${isLight ? '0.720' : '0.620'});`,
    `  --prism-new-tab-input-bg: rgba(${tok.tint1Rgb}, ${isLight ? '0.680' : '0.460'});`,
    `  --prism-proj-act-bg: rgba(${deepSbRgb}, ${isLight ? '0.820' : '0.740'});`,
    `  --prism-border-island: ${bScale === 0 ? 'transparent' : `rgba(${tok.ptRgb}, ${islandBorderA})`};`,
    `  --prism-border-card: ${bScale === 0 ? 'transparent' : `rgba(${tok.ptRgb}, ${cardBorderA})`};`,
    `  --prism-border-hairline: rgba(${tok.ptRgb}, ${hairBorderA});`,
    `  --prism-border-popover: rgba(${tok.ptRgb}, ${isLight ? '0.160' : '0.150'});`,
    `  --prism-specular-top: ${bScale === 0 ? 'transparent' : isLight ? 'rgba(255, 255, 255, 0.880)' : 'rgba(255, 255, 255, 0.075)'};`,
    `  --prism-sheen: ${isLight ? 'linear-gradient(172deg, rgba(255, 255, 255, 0.68) 0%, rgba(255, 255, 255, 0) 40%)' : 'linear-gradient(172deg, rgba(255, 255, 255, 0.042) 0%, rgba(255, 255, 255, 0) 38%)'};`,
    `  --prism-sidebar-backdrop: ${sbBlurPx > 0 ? `blur(${sbBlurPx}px) saturate(${isLight ? 135 : 125}%)` : 'none'};`,
    `  --prism-composer-backdrop: ${blurPx > 0 ? `blur(${Math.round(blurPx * 1.1)}px) saturate(150%)` : 'none'};`,
    `  --prism-shadow-island: ${cfg.shadows === false ? 'none' : isLight ? '0 10px 28px -8px rgba(15, 23, 42, 0.12)' : '0 14px 34px -8px rgba(0, 0, 0, 0.46)'};`,
    `  --prism-shadow-popover: ${isLight ? '0 18px 44px -8px rgba(15, 23, 42, 0.22)' : '0 22px 52px -8px rgba(0, 0, 0, 0.68)'};`,
    `  --prism-sticky-shadow: inset 0 1px 0 ${bScale === 0 ? 'transparent' : isLight ? 'rgba(255, 255, 255, 0.880)' : 'rgba(255, 255, 255, 0.075)'}, 0 3px 10px rgba(0, 0, 0, ${isLight ? '0.06' : '0.24'});`,
    `  --prism-proj-shadow: inset 0 1px 0 ${bScale === 0 ? 'transparent' : isLight ? 'rgba(255, 255, 255, 0.880)' : 'rgba(255, 255, 255, 0.075)'}, 0 2px 8px rgba(0, 0, 0, ${isLight ? '0.05' : '0.22'});`,
  ].join('\n');
}

/**
 * Build a pure zero-JS stylesheet (`static-css` startup mode) consumed by `GET /host/<capToken>/static.css`.
 * Keeps 100% native clickability (`pointer-events: none` `body::before` at `z-index: -1`) and yields
 * `alpha = 0` whenever Antigravity 2.34.0 opens a `[data-has-browser-hole="true"]` WCV surface.
 */
export function buildStaticCssSheet(payload = {}) {
  if (payload && payload.skinEnabled === false) {
    return '/* agy-wallpaper-prism v2.0.6 static-css: skin disabled */\n';
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

  const wallBgDark = safeImg
    ? `linear-gradient(180deg, rgba(${darkTok.shadeRgb}, ${(scrimOp * 0.85).toFixed(3)}), rgba(${darkTok.shadeRgb}, ${(scrimOp * 1.1).toFixed(3)})), url("${safeImg}")`
    : `radial-gradient(ellipse 80% 70% at 22% 24%, rgba(${darkTok.accentRgb}, 0.26) 0%, transparent 65%), radial-gradient(ellipse 75% 75% at 80% 78%, rgba(${darkTok.accentRgb}, 0.18) 0%, #09090b 100%)`;
  const wallBgLight = safeImg
    ? `linear-gradient(180deg, rgba(${lightTok.baseRgb}, ${(scrimOp * 0.75).toFixed(3)}), rgba(${lightTok.baseRgb}, ${scrimOp.toFixed(3)})), url("${safeImg}")`
    : `radial-gradient(ellipse 80% 70% at 22% 24%, rgba(${lightTok.accentRgb}, 0.18) 0%, transparent 65%), radial-gradient(ellipse 75% 75% at 80% 78%, rgba(${lightTok.accentRgb}, 0.12) 0%, #f4f7fb 100%)`;

  const sibEx =
    ':not(#gemini-neko-pet-root):not(#ag-context-meter):not(#ag-usage-monitor-capsule):not(#ag-usage-monitor-portal):not(#deck-metrics-strip):not(#agy-prism-popover):not(#agy-prism-wco-pill):not(.settings-modal-backdrop):not(.settings-modal-container):not([data-testid="modal-backdrop"]):not([data-testid="media-modal"]):not(.agy-dialog):not([role="dialog"]):not([role="alertdialog"]):not([role="menu"]):not([role="listbox"]):not([role="tooltip"])';
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
  const mainPageCarriers = [
    'div.bg-background:not(.agy-shell):not(.sticky):not([style*="sticky"]):not(.agy-dialog):not(.settings-modal-container):has([data-testid="customizations-search"], [data-testid="customizations-marketplace"], [data-testid="customizations-installed"])',
    '[data-testid="plugin-detail"]',
  ];
  const mainPageHostCss = mainPageCarriers.map((s) => `${s}${notHole}`).join(',\n');
  const mainPageBeforeCss = mainPageCarriers.map((s) => `${s}${notHole}::before`).join(',\n');

  return `/* agy-wallpaper-prism v2.0.6 zero-JS static-css sheet */
:root, body.dark, html.dark body {
${buildPolarityTokenVarsCss(cfg, darkTok, false)}
  --prism-r-island: ${radiusIsland}px;
  --prism-r-card: ${radiusCard}px;
  --prism-r-ctl: ${radiusCtl}px;
  --prism-r-xs: ${radiusXs}px;
  --prism-workspace-pad: ${Number(cfg.workspacePad ?? 8)}px;
  --prism-static-wall: ${wallBgDark};
}
body.light, html.light body {
${buildPolarityTokenVarsCss(cfg, lightTok, true)}
  --prism-r-island: ${radiusIsland}px;
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

${tbHostCss} {
  position: relative !important;
  isolation: isolate;
  overflow: visible !important;
  z-index: 40;
  background-color: transparent !important;
  background-image: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
${tbBeforeCss} {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  pointer-events: none;
  background-color: var(--prism-surface-sidebar);
  background-image: var(--prism-sheen);
  backdrop-filter: var(--prism-sidebar-backdrop);
  -webkit-backdrop-filter: var(--prism-sidebar-backdrop);
  box-shadow: inset 0 1px 0 var(--prism-specular-top);
}
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
  background-color: var(--prism-sticky-sidebar-bg) !important;
  background-image: var(--prism-sheen);
  backdrop-filter: blur(16px) saturate(145%) !important;
  -webkit-backdrop-filter: blur(16px) saturate(145%) !important;
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
  backdrop-filter: blur(14px) saturate(140%) !important;
  -webkit-backdrop-filter: blur(14px) saturate(140%) !important;
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
  backdrop-filter: blur(8px) !important;
  -webkit-backdrop-filter: blur(8px) !important;
}
${leftSbScope} .group\\/header > div.absolute > :is(button, a):is(:hover, :focus-visible) {
  color: var(--prism-fg) !important;
  background-color: var(--prism-surface-popover) !important;
  border-color: var(--prism-border-card) !important;
}
.surface-opaque.bg-background {
  background-color: var(--prism-surface-card) !important;
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
  backdrop-filter: var(--prism-sidebar-backdrop);
  -webkit-backdrop-filter: var(--prism-sidebar-backdrop);
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
  backdrop-filter: blur(10px) !important;
  -webkit-backdrop-filter: blur(10px) !important;
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

[data-testid="conversation-view"]${notHole},
[data-main-content-header]${notHole} {
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
  backdrop-filter: blur(10px) saturate(130%) !important;
  -webkit-backdrop-filter: blur(10px) saturate(130%) !important;
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
${
  cfg.layoutMode === 'islands'
    ? `.agy-shell { padding: ${Number(cfg.workspacePad ?? 8)}px !important; gap: ${Number(cfg.islandGap ?? 8)}px !important; box-sizing: border-box !important; }
:is([data-testid="title-menu-bar"], .monaco-workbench .part.titlebar)${notHole} {
  border-radius: ${radiusIsland}px !important;
  border: 1px solid var(--prism-border-island) !important;
  box-shadow: var(--prism-shadow-island) !important;
}
[data-testid="title-menu-bar"]${notHole} {
  width: auto !important;
  margin-right: max(0px, calc(var(--prism-wco-inset-right, 0px) - var(--prism-workspace-pad, 0px))) !important;
}
:is([data-testid="sidebar-split"] > div:first-child, .agy-sidebar, aside[data-side-panel-body]:not(.agy-sheet *):not([data-testid="aux-pane-split"] *))${notHole} {
  border-radius: ${radiusIsland}px !important;
  border: 1px solid var(--prism-border-island) !important;
  box-shadow: var(--prism-shadow-island) !important;
}
:is([data-testid="aux-pane-split"] > :is(div, main, section):first-child, .agy-shell > main, [data-testid="aux-pane-split"] > :is(div, aside, section):last-child:not(:first-child):not([hidden]):not([aria-hidden="true"]), .monaco-workbench .part.auxiliarybar)${notHole} {
  border-radius: ${radiusIsland}px !important;
  border: 1px solid var(--prism-border-island) !important;
  box-shadow: var(--prism-shadow-island) !important;
  background-color: var(--prism-surface-chat) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
[data-testid="aux-pane-split"] :is([data-testid="conversation-view"], [data-main-content-header], [data-side-panel-strip], .agy-sheet [data-side-panel-body], [data-side-panel-body]) {
  background-color: transparent !important;
  background-image: none !important;
}
:is([data-main-content-body], .agy-sheet [data-side-panel-body])::after {
  display: none !important;
}
:is([data-testid="sidebar-split"], [data-testid="aux-pane-split"]) > div:nth-child(2) { width: ${Number(cfg.islandGap ?? 8)}px !important; background: transparent !important; border: none !important; }`
    : `:is([data-testid="title-menu-bar"], .monaco-workbench .part.titlebar)${notHole} {
  border-radius: 0px !important;
  border: none !important;
  border-bottom: 1px solid var(--prism-border-hairline) !important;
  box-shadow: none !important;
}
[data-testid="title-menu-bar"]${notHole} {
  width: auto !important;
  margin-right: var(--prism-wco-inset-right, 0px) !important;
}
:is([data-testid="sidebar-split"], [data-testid="aux-pane-split"]) > div:nth-child(2) { width: 1px !important; background-color: var(--prism-border-hairline) !important; }
:is(.agy-sidebar, aside[data-side-panel-body]:not(.agy-sheet *):not([data-testid="aux-pane-split"] *))${notHole} { border-right: 1px solid var(--prism-border-hairline) !important; }
:is([data-side-panel-strip], .agy-sheet [data-side-panel-body], .monaco-workbench .part.auxiliarybar)${notHole} {
  background-color: var(--prism-surface-chat) !important;
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
}
`;
}

export { PRISM_DOM };
