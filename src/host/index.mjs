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

export { PRISM_DOM };
