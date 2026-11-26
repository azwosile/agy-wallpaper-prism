// Wallpaper Prism Studio UI — Tab 1: Library Renderer, Virtual Scroll & Hover Static-First Thumbs
// DAG Layer 4: imports only L0 (schema), L1 (state), L2 (optics), L3 (controls).
// Pure named exports only (no `export let`, no destructured exports).

import {
  LIBRARY_KINDS,
  CONTENT_RATINGS,
} from '../../shared/schema.mjs';

import {
  VIRTUAL_SCROLL_THRESHOLD,
  store,
  curLocale,
  tr,
  tx,
  esc,
  withStaticPreviewParam,
  isStudioViewportActive,
  getActiveId,
  hasPerWallpaperPin,
  computeLibraryModel,
} from '../state.mjs';

import {
  weColorToHex,
  toStaticThumbUrl,
  freezeAnimatedThumbToDataUrl,
} from '../optics.mjs';

import { renderMediaHealthAlertsHtml } from '../controls.mjs';

const HOVER_DEBOUNCE_MS = 180;
const PLAYLIST_VIRTUAL_THRESHOLD = 24;
const PLAYLIST_ROW_HEIGHT_PX = 96;
const PROBED_STATIC_URLS_LIMIT = 256;

const probedStaticUrls = new Set();
const pendingStaticProbeUrls = new Set();
const pendingStaticProbeQueue = [];
const freezeProbeState = { inFlight: false };

function markStaticUrlProbed(staticUrl) {
  if (!staticUrl) return;
  if (probedStaticUrls.has(staticUrl)) return;
  while (probedStaticUrls.size >= PROBED_STATIC_URLS_LIMIT) {
    const oldest = probedStaticUrls.keys().next().value;
    if (oldest === undefined) break;
    probedStaticUrls.delete(oldest);
  }
  probedStaticUrls.add(staticUrl);
}

function getCachedFrozenThumb(key) {
  const lru = store.runtime?.frozenThumbLru;
  if (!key || !(lru instanceof Map) || !lru.has(key)) return '';
  const val = lru.get(key);
  lru.delete(key);
  lru.set(key, val);
  return val;
}

function drainStaticThumbProbeQueue() {
  if (freezeProbeState.inFlight || store.runtime.serverHasStaticThumbFfmpeg === false) {
    if (store.runtime.serverHasStaticThumbFfmpeg === false) {
      pendingStaticProbeQueue.length = 0;
      pendingStaticProbeUrls.clear();
    }
    return;
  }
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;

  let nextUrl = '';
  while (pendingStaticProbeQueue.length > 0) {
    const cand = pendingStaticProbeQueue.shift();
    pendingStaticProbeUrls.delete(cand);
    if (cand && !probedStaticUrls.has(cand)) {
      nextUrl = cand;
      break;
    }
  }
  if (!nextUrl) return;

  freezeProbeState.inFlight = true;
  markStaticUrlProbed(nextUrl);
  // Pure CORS-safelisted HEAD fetch: never use window.sidecar.fetch (avoids X-Sidecar-Token leakage & OPTIONS preflight failure)
  Promise.resolve(window.fetch(nextUrl, { method: 'HEAD' }))
    .then((res) => {
      if (!res) return;
      const animHdr = res.headers?.get?.('X-Prism-Animated-Preview');
      if (animHdr === '1') {
        store.runtime.serverHasStaticThumbFfmpeg = false;
        pendingStaticProbeQueue.length = 0;
        pendingStaticProbeUrls.clear();
        document.querySelectorAll('img.prism-wall-thumb-img[data-may-be-animated="1"]').forEach((el) => {
          if (el instanceof HTMLImageElement) maybeFreezeAnimatedThumbImg(el);
        });
      }
      // Never set serverHasStaticThumbFfmpeg = true from an arbitrary static .png/.jpg res.ok
    })
    .catch(() => {
      // Ignore probe network errors; fallback canvas freeze can still run if flagged
    })
    .finally(() => {
      freezeProbeState.inFlight = false;
      if (pendingStaticProbeQueue.length > 0 && store.runtime.serverHasStaticThumbFfmpeg !== false) {
        drainStaticThumbProbeQueue();
      }
    });
}

function enqueueStaticThumbProbe(staticUrl) {
  if (
    !staticUrl ||
    store.runtime.serverHasStaticThumbFfmpeg === false ||
    !staticUrl.includes('static=1') ||
    probedStaticUrls.has(staticUrl) ||
    pendingStaticProbeUrls.has(staticUrl)
  ) {
    return;
  }
  if (pendingStaticProbeQueue.length >= PROBED_STATIC_URLS_LIMIT) return;
  pendingStaticProbeUrls.add(staticUrl);
  pendingStaticProbeQueue.push(staticUrl);
  drainStaticThumbProbeQueue();
}

export function maybeFreezeAnimatedThumbImg(img) {
  if (!(img instanceof HTMLImageElement)) return false;
  if (store.config.libraryAnimatedThumbs === 'always') return false;
  if (img.dataset.hoverLive === '1' || img.dataset.frozenApplied === '1') return false;
  if (img.src && img.src.startsWith('data:')) return false;

  const staticSrc = img.dataset.staticSrc || '';
  if (!staticSrc) return false;

  const cached = getCachedFrozenThumb(staticSrc);
  if (cached) {
    img.dataset.frozenSrc = cached;
    img.dataset.frozenApplied = '1';
    if (img.src !== cached) img.src = cached;
    return true;
  }

  const mayBeAnimated = img.dataset.mayBeAnimated === '1';
  if (!mayBeAnimated) return false;

  if (store.runtime.serverHasStaticThumbFfmpeg !== false) {
    enqueueStaticThumbProbe(staticSrc);
    return false;
  }

  const dataUrl = freezeAnimatedThumbToDataUrl(img, staticSrc);
  if (!dataUrl) return false;
  img.dataset.frozenSrc = dataUrl;
  img.dataset.frozenApplied = '1';
  img.src = dataUrl;
  return true;
}

export function resetLibraryHoverThumb() {
  const rt = store.runtime;
  if (rt.activeHoverThumbTimer) {
    clearTimeout(rt.activeHoverThumbTimer);
    rt.activeHoverThumbTimer = null;
  }
  const activeImg = rt.activeHoverThumbImg;
  rt.activeHoverThumbImg = null;
  if (activeImg instanceof HTMLImageElement) {
    delete activeImg.dataset.hoverLive;
    const restoreSrc = activeImg.dataset.frozenSrc || activeImg.dataset.staticSrc || '';
    if (restoreSrc && activeImg.src !== restoreSrc) {
      activeImg.src = restoreSrc;
    }
  }
}

export function attachLibraryThumbHoverController(rootEl = null) {
  const host = rootEl || document.getElementById('prism-lib-grid-host') || document.getElementById('prism-tab-scroll');
  if (!host || host.dataset.prismHoverBound === '1') return;
  host.dataset.prismHoverBound = '1';

  // Capture-phase load listener (img load does not bubble) for no-ffmpeg offscreen canvas freeze
  host.addEventListener(
    'load',
    (e) => {
      const target = e.target;
      if (target instanceof HTMLImageElement && target.classList.contains('prism-wall-thumb-img')) {
        maybeFreezeAnimatedThumbImg(target);
      }
    },
    true,
  );

  host.addEventListener('pointerover', (e) => {
    if (store.config.libraryAnimatedThumbs !== 'hover') return;
    if (store.runtime.isDormant || !isStudioViewportActive()) return;
    const card = e.target instanceof Element ? e.target.closest('.prism-wall-card') : null;
    if (!card) return;
    if (e.relatedTarget instanceof Node && card.contains(e.relatedTarget)) return;

    const img = card.querySelector('img[data-live-src]');
    if (!(img instanceof HTMLImageElement)) return;
    const liveSrc = img.dataset.liveSrc || '';
    const staticSrc = img.dataset.staticSrc || '';
    if (!liveSrc || liveSrc === staticSrc) return;
    if (store.runtime.activeHoverThumbImg === img) return;

    if (store.runtime.activeHoverThumbTimer) {
      clearTimeout(store.runtime.activeHoverThumbTimer);
      store.runtime.activeHoverThumbTimer = null;
    }

    store.runtime.activeHoverThumbTimer = setTimeout(() => {
      store.runtime.activeHoverThumbTimer = null;
      if (store.config.libraryAnimatedThumbs !== 'hover') return;
      if (store.runtime.isDormant || !isStudioViewportActive()) return;
      if (!img.isConnected) return;

      // Hard guarantee: at most 1 animated thumbnail active globally at any moment
      resetLibraryHoverThumb();
      store.runtime.activeHoverThumbImg = img;
      img.dataset.hoverLive = '1';
      if (img.src !== liveSrc) {
        img.src = liveSrc;
      }
    }, HOVER_DEBOUNCE_MS);
  });

  host.addEventListener('pointerout', (e) => {
    const card = e.target instanceof Element ? e.target.closest('.prism-wall-card') : null;
    if (!card) return;
    if (e.relatedTarget instanceof Node && card.contains(e.relatedTarget)) return;

    if (store.runtime.activeHoverThumbTimer) {
      clearTimeout(store.runtime.activeHoverThumbTimer);
      store.runtime.activeHoverThumbTimer = null;
    }
    const img = card.querySelector('img[data-live-src]');
    if (img && store.runtime.activeHoverThumbImg === img) {
      resetLibraryHoverThumb();
    }
  });
}

export function computeVirtualSlice(totalCount) {
  const threshold = Number.isFinite(VIRTUAL_SCROLL_THRESHOLD) ? VIRTUAL_SCROLL_THRESHOLD : 30;
  if (totalCount <= threshold) {
    return { start: 0, end: totalCount, padTop: 0, padBottom: 0, cols: 3 };
  }
  const scroller = document.getElementById('prism-tab-scroll');
  const viewW = scroller ? Math.max(240, scroller.clientWidth - 28) : Math.max(240, window.innerWidth - 32);
  const isWide = window.innerWidth >= 840;
  const cols = isWide ? Math.max(2, Math.floor((viewW + 11) / 206)) : window.innerWidth >= 480 ? 3 : 2;
  const isCompact = store.config.pickerLayout === 'fixed';
  const rowH = isCompact ? 136 : Math.round((viewW / cols) * 0.625) + 46;
  const totalRows = Math.ceil(totalCount / cols);
  const scrollTop = scroller ? Math.max(0, scroller.scrollTop - 160) : 0;
  const viewH = scroller && scroller.clientHeight > 0 ? scroller.clientHeight : 720;

  const firstRow = Math.max(0, Math.floor(scrollTop / rowH) - 3);
  const visibleRows = Math.ceil(viewH / rowH) + 6;
  const lastRow = Math.min(totalRows, firstRow + visibleRows);

  return {
    start: firstRow * cols,
    end: Math.min(totalCount, lastRow * cols),
    padTop: firstRow * rowH,
    padBottom: Math.max(0, (totalRows - lastRow) * rowH),
    cols,
  };
}

export function computePlaylistPickerSlice(totalCount, pickerEl = null) {
  if (totalCount <= PLAYLIST_VIRTUAL_THRESHOLD) {
    return { start: 0, end: totalCount, padTop: 0, padBottom: 0, cols: 3 };
  }
  const viewW = pickerEl && pickerEl.clientWidth > 0 ? Math.max(120, pickerEl.clientWidth - 8) : 380;
  const cols = Math.max(2, Math.floor((viewW + 6) / 114));
  const rowH = PLAYLIST_ROW_HEIGHT_PX;
  const totalRows = Math.ceil(totalCount / cols);
  const scrollTop = pickerEl ? Math.max(0, pickerEl.scrollTop) : 0;
  const viewH = pickerEl && pickerEl.clientHeight > 0 ? pickerEl.clientHeight : 280;

  const firstRow = Math.max(0, Math.floor(scrollTop / rowH) - 2);
  const visibleRows = Math.ceil(viewH / rowH) + 4;
  const lastRow = Math.min(totalRows, firstRow + visibleRows);

  return {
    start: firstRow * cols,
    end: Math.min(totalCount, lastRow * cols),
    padTop: firstRow * rowH,
    padBottom: Math.max(0, (totalRows - lastRow) * rowH),
    cols,
  };
}

export function renderWallpaperCardHtml(item, activeId, favSet) {
  const isActive = item.id === activeId;
  const isFav = favSet.has(item.id);
  const isPicked = store.batchMode && store.batchSelected.has(item.id);
  const hasPin = hasPerWallpaperPin(item.id);
  const rawThumb = item.thumbUrl || (item.kind === 'image' ? item.mediaUrl : '');
  const animMode = store.config.libraryAnimatedThumbs || 'hover';
  const liveUrl = rawThumb;
  const staticUrl = rawThumb ? (typeof toStaticThumbUrl === 'function' ? toStaticThumbUrl(rawThumb) : withStaticPreviewParam(rawThumb)) : '';
  const cachedFrozen = staticUrl ? getCachedFrozenThumb(staticUrl) : '';
  const displaySrc = animMode === 'always' ? liveUrl : cachedFrozen || staticUrl;
  const mayBeAnimated = Boolean(rawThumb && staticUrl !== liveUrl);
  const bgFallback = weColorToHex(item.schemeColor) || '#1a2236';

  return `
    <article class="prism-wall-card ${isActive ? 'is-active' : ''} ${isPicked ? 'is-batch-selected' : ''}"
             tabindex="0" data-action="card-click" data-id="${esc(item.id)}">
      <div class="prism-wall-thumb" style="background:linear-gradient(135deg, ${esc(bgFallback)}66, rgba(12,14,22,0.95))">
        ${
          displaySrc
            ? `<img class="prism-wall-thumb-img" loading="lazy" decoding="async" crossorigin="anonymous"
                    src="${esc(displaySrc)}"
                    data-static-src="${esc(staticUrl)}"
                    data-live-src="${esc(liveUrl)}"
                    ${cachedFrozen ? 'data-frozen-applied="1"' : ''}
                    ${mayBeAnimated ? 'data-may-be-animated="1"' : ''}
                    alt="${esc(item.title || 'Wallpaper')}"
                    onerror="this.remove()" />`
            : ''
        }
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

export function renderLibraryGridHtml(model = computeLibraryModel()) {
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

export function renderLibraryTab() {
  const model = computeLibraryModel();
  const activeGroup = (store.config.rotationGroups || []).find((g) => g.id === store.config.rotationGroupId);
  const isZh = curLocale() === 'zh';
  const healthAlerts = renderMediaHealthAlertsHtml();

  return `
    ${healthAlerts ? `<div id="prism-lib-health-alerts" class="prism-health-alerts">${healthAlerts}</div>` : ''}

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
          <span class="prism-filter-label">${esc(isZh ? '类型' : 'TYPE')}</span>
          ${LIBRARY_KINDS.map((k) => `
            <button type="button" class="prism-chip ${model.kindSet.has(k) ? 'is-active' : ''}"
                    data-action="toggle-kind-chip" data-kind="${esc(k)}">
              ${esc(tr(`kind.${k}`))} <span class="prism-chip-count">${model.kindCounts[k] || 0}</span>
            </button>
          `).join('')}
        </div>
        <div class="prism-filter-group">
          <span class="prism-filter-label">${esc(isZh ? '分级' : 'RATING')}</span>
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

export function patchActiveCardsInPlace(nextActiveId) {
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
