// Wallpaper Prism Studio UI — Layer 5: Dual-Form Visual Appearance Editor Canvas
// Supports BOTH:
//   (1) Sidebar Full-Height Modal (320-560px responsive stack, pan/zoom 50%-200%, click-to-select 8 regions)
//   (2) Standalone Browser 3-Pane IDE (`/?mode=visual-editor` via POST /api/studio/popout, zero URL token)
// Strict DAG L5: imports ONLY L0 (schema), L1 (state), L2 (optics), L4 (region-inspector).
// Pure named exports only (no `export let`, no destructured exports).

import {
  REGION_IDS,
  resolveSchemeTokens,
} from '../../shared/schema.mjs';

import {
  store,
  curLocale,
  tr,
  esc,
  getEffectiveConfig,
  getResolvedPolarity,
  getMasterToggleLabel,
  getMasterToggleHint,
  isHostAttached,
  withStaticPreviewParam,
} from '../state.mjs';

import {
  resolveSimRegionSurface,
} from '../optics.mjs';

import {
  INSPECTABLE_REGIONS,
  renderRegionInspectorHtml,
  renderRegionTreeHtml,
} from './region-inspector.mjs';

function clampZoom(z) {
  const n = Number(z);
  if (!Number.isFinite(n)) return 1;
  return Math.max(0.5, Math.min(2.0, Math.round(n * 100) / 100));
}

function getCanvasPolarity(eff) {
  if (store.canvasPreviewTheme === 'light' || store.canvasPreviewTheme === 'dark') {
    return store.canvasPreviewTheme;
  }
  return getResolvedPolarity(eff);
}

function renderInlineAutosavePillHtml(withId = false) {
  const safeState = ['idle', 'saving', 'saved', 'error'].includes(store.saveStatus) ? store.saveStatus : 'idle';
  let inner = '';
  if (safeState === 'saving') {
    inner = esc(`◌ ${tr('autosave.saving')}`);
  } else if (safeState === 'saved') {
    inner = esc(tr('autosave.saved'));
  } else if (safeState === 'error') {
    inner = `<button type="button" class="prism-autosave-retry" data-action="retry-config-flush">${esc(tr('autosave.error'))} · ${esc(tr('autosave.retry'))}</button>`;
  }
  const idAttr = withId ? ' id="prism-autosave-indicator"' : '';
  return `<span${idAttr} class="prism-autosave-pill" data-autosave-indicator="true" data-state="${esc(safeState)}" aria-live="polite" title="${esc(store.saveError || '')}">${inner}</span>`;
}

function resolveRegionDataAndStyle(rid, eff, tokens, isLight) {
  const entry = eff.regions?.[rid] || {};
  const surf = resolveSimRegionSurface(rid, eff, tokens, isLight);
  const parts = [];
  if (entry.fontSize !== null && entry.fontSize !== undefined) {
    parts.push(`font-size:${Math.round(Number(entry.fontSize))}px`);
  }
  if (entry.fontFamily) {
    parts.push(`font-family:${entry.fontFamily}`);
  }
  if (surf?.fgCss) {
    parts.push(`color:${surf.fgCss}`);
  }
  const borderStyleAttr = entry.borderStyle ? ` data-border-style="${esc(entry.borderStyle)}"` : '';
  const styleAttr = parts.length > 0 ? ` style="${esc(parts.join(';'))}"` : '';
  return `${borderStyleAttr}${styleAttr}`;
}

function renderStaticStageBackgroundHtml() {
  const item =
    store.activeItem ||
    store.items.find((x) => x.id === (store.config.activeWallpaperId || store.config.wallpaperId));
  const rawThumb =
    item?.kind === 'slideshow'
      ? item?.slides?.[0] || item?.thumbUrl || item?.mediaUrl || ''
      : item?.kind === 'image'
        ? item?.mediaUrl || item?.thumbUrl || ''
        : item?.thumbUrl || item?.mediaUrl || '';
  if (!rawThumb) return '';
  const src = withStaticPreviewParam(rawThumb);
  return `<img class="mini-media-el" src="${esc(src)}" alt="" draggable="false" onerror="this.remove()" />`;
}

export function renderVisualCanvasStageHtml(options = {}) {
  const variant = options.variant === 'popout' ? 'popout' : 'modal';
  const eff = getEffectiveConfig();
  const canvasPolarity = getCanvasPolarity(eff);
  const isLight = canvasPolarity === 'light';
  const tokens = resolveSchemeTokens(eff, canvasPolarity);
  const selected = REGION_IDS.includes(store.selectedRegion) ? store.selectedRegion : 'sidebar';
  const skinAttr = store.skinEnabled ? 'true' : 'false';
  const showPopover = Boolean(store.canvasShowPopover || selected === 'popover');
  const showWelcome = Boolean(store.canvasShowEmptyLogo);
  const isZh = curLocale() === 'zh';

  const regTail = (rid) => resolveRegionDataAndStyle(rid, eff, tokens, isLight);
  const regAttrs = (rid) =>
    `data-editor-region="${esc(rid)}" data-region="${esc(rid)}" data-action="select-editor-region" data-region-label="${esc(tr(`region.${rid}`))}" data-selected="${selected === rid ? 'true' : 'false'}"`;
  const selCls = (rid) => (selected === rid ? ' is-selected' : '');

  const zoom = clampZoom(store.canvasZoom ?? 1);
  const panX = Number.isFinite(Number(store.canvasPanX)) ? Math.round(Number(store.canvasPanX)) : 0;
  const panY = Number.isFinite(Number(store.canvasPanY)) ? Math.round(Number(store.canvasPanY)) : 0;

  return `
    <div id="prism-ve-viewport" class="prism-ve-canvas-viewport" data-variant="${esc(variant)}">
      <div id="prism-ve-panzoom-inner" class="prism-ve-canvas-transform"
           style="transform:translate(${panX}px, ${panY}px) scale(${zoom})">
        <div id="prism-visual-canvas-stage"
             class="prism-mini-stage prism-preview-stage prism-ve-stage"
             data-skin-enabled="${skinAttr}"
             data-prism-theme="${esc(canvasPolarity)}"
             data-selected-region="${esc(selected)}"
             data-variant="${esc(variant)}">
          <div id="visual-canvas-media-layer" class="mini-media-layer">
            ${renderStaticStageBackgroundHtml()}
          </div>
          <div class="mini-blur-veil"></div>
          <div class="mini-scrim"></div>
          <div class="mini-vignette"></div>
          <div class="mini-grain"></div>

          <div class="mini-disabled-overlay" aria-hidden="${store.skinEnabled ? 'true' : 'false'}">
            <span class="mini-disabled-label">${esc(tr('preview.disabledTitle'))}</span>
            <button type="button" class="prism-btn prism-btn-sm prism-btn-primary" data-action="enable-skin">
              ${esc(tr('preview.disabledReenable'))}
            </button>
          </div>

          <div id="prism-visual-canvas-hub" class="mini-hub-shell"
               data-layout="${esc(eff.layoutMode)}"
               data-topbar-style="${esc(eff.topbarStyle)}"
               data-sidebar-style="${esc(eff.sidebarListStyle || 'capsule')}"
               data-wco-transparent="${eff.transparentWindowControls !== false ? 'true' : 'false'}">
            <!-- Topbar & WCO -->
            <div class="mini-topbar">
              <div class="mini-topbar-pill${selCls('topbar')}" ${regAttrs('topbar')}${regTail('topbar')}>
                <span>${esc(isZh ? '文件  编辑  视图' : 'File  Edit  View')}</span>
              </div>
              <div class="mini-wco-pill${selCls('wco')}" ${regAttrs('wco')}${regTail('wco')}>
                <span></span><span></span><span></span>
              </div>
            </div>

            <!-- Left Sidebar -->
            <div class="mini-island mini-sidebar${selCls('sidebar')}" ${regAttrs('sidebar')}${regTail('sidebar')}>
              <div class="mini-dots"><span></span><span></span><span></span></div>
              <div class="mini-nav-row is-active"><span>${esc(isZh ? '棱镜调优会话' : 'Prism Session')}</span></div>
              <div class="mini-nav-row"><span>${esc(isZh ? '可视化编辑器' : 'Visual Editor')}</span></div>
              <div class="mini-nav-row"><span>${esc(isZh ? '静帧节能检查' : 'Eco Checklist')}</span></div>
            </div>

            <!-- Center Workspace (contains Card + Composer + Optional Welcome Logo) -->
            <div class="mini-island mini-center${selCls('workspace')}" ${regAttrs('workspace')}${regTail('workspace')}>
              ${
                showWelcome
                  ? `
                <div class="prism-ve-welcome-logo" data-hidden="${eff.hideWelcomeLogo ? 'true' : 'false'}">
                  <span style="font-size:18px" aria-hidden="true">✦</span>
                  <span>${esc(eff.hideWelcomeLogo ? (isZh ? '已隐藏欢迎水印' : 'Welcome Logo Hidden') : 'Antigravity')}</span>
                </div>
              `
                  : `
                <div style="display:flex;flex-direction:column;gap:5px">
                  <div class="mini-bubble${selCls('card')}" ${regAttrs('card')}${regTail('card')}>
                    <span>${esc(isZh ? '消息气泡与卡片' : 'Message Bubble & Card')}</span>
                  </div>
                  <div class="mini-code-card${selCls('card')}" ${regAttrs('card')}${regTail('card')}>
                    <span class="mini-code-kw">const</span> prism = <span class="mini-code-fn">glassSkin</span>({ blur: <span class="mini-code-str">'${eff.glassBlur}px'</span> });
                  </div>
                </div>
              `
              }

              <div class="mini-composer${selCls('composer')}" ${regAttrs('composer')}${regTail('composer')}>
                <div class="mini-composer-input">
                  <span class="mini-caret"></span>
                  <span>${esc(isZh ? '向 Antigravity 提问…' : 'Ask Antigravity…')}</span>
                </div>
                <div class="mini-composer-right">
                  <span class="mini-prism-pill">◆ Prism</span>
                  <span class="mini-send-dot"></span>
                </div>
              </div>
            </div>

            <!-- Right Aux Pane -->
            <div class="mini-island mini-aux${selCls('rightPane')}" ${regAttrs('rightPane')}${regTail('rightPane')}>
              <div class="mini-bar" style="width:62%;margin-bottom:2px"></div>
              <div class="mini-nav-row is-active"><span>Wallpaper Prism</span></div>
              <div class="mini-nav-row"><span>${esc(isZh ? '独立毛玻璃' : 'Independent Blur')}</span></div>
            </div>

            <!-- Floating Popover / Quick Prism Menu -->
            ${
              showPopover
                ? `
              <div class="prism-ve-popover-sim mini-popover${selCls('popover')}" ${regAttrs('popover')}${regTail('popover')}
                   data-solid-base="${eff.floaterSolidBase ? 'true' : 'false'}">
                <strong style="font-size:10px">◆ ${esc(tr('region.popover'))}</strong>
                <div class="prism-ve-popover-row">${esc(isZh ? '光学场景预设' : 'Optical Presets')}</div>
                <div class="prism-ve-popover-row">${esc(isZh ? '单区域毛玻璃精调' : 'Per-Region Glass')}</div>
              </div>
            `
                : ''
            }
          </div>
        </div>
      </div>
      <div class="prism-ve-canvas-hint">${esc(tr('editor.selectRegionPrompt'))}</div>
    </div>
  `;
}

function renderZoomAndPreviewTogglesHtml(eff) {
  const activePolarity = getCanvasPolarity(eff);
  const zoomPct = Math.round(clampZoom(store.canvasZoom ?? 1) * 100);
  const isZh = curLocale() === 'zh';

  return `
    <div class="prism-ve-preview-toggles">
      <button type="button" class="prism-chip ${activePolarity === 'dark' ? 'is-active' : ''}"
              data-action="ve-set-preview-theme" data-val="dark">${esc(tr('editor.previewDark'))}</button>
      <button type="button" class="prism-chip ${activePolarity === 'light' ? 'is-active' : ''}"
              data-action="ve-set-preview-theme" data-val="light">${esc(tr('editor.previewLight'))}</button>
      <button type="button" class="prism-chip ${eff.layoutMode === 'islands' ? 'is-active' : ''}"
              data-action="set-enum" data-key="layoutMode" data-val="islands">${esc(isZh ? '浮岛' : 'Islands')}</button>
      <button type="button" class="prism-chip ${eff.layoutMode === 'flush' ? 'is-active' : ''}"
              data-action="set-enum" data-key="layoutMode" data-val="flush">${esc(isZh ? '平铺' : 'Flush')}</button>
      <button type="button" class="prism-chip ${store.canvasShowPopover ? 'is-active' : ''}"
              data-action="ve-toggle-popover">${esc(tr('editor.previewPopover'))}</button>
      <button type="button" class="prism-chip ${store.canvasShowEmptyLogo ? 'is-active' : ''}"
              data-action="ve-toggle-welcome">${esc(tr('editor.previewWelcome'))}</button>
    </div>
    <div class="prism-ve-zoom-group">
      <button type="button" class="prism-ve-zoom-btn" data-action="ve-zoom-out" title="-15%">−</button>
      <button id="prism-ve-zoom-pct" type="button" class="prism-ve-zoom-readout"
              data-action="ve-zoom-reset" title="${esc(tr('editor.zoomReset'))}">${zoomPct}%</button>
      <button type="button" class="prism-ve-zoom-btn" data-action="ve-zoom-in" title="+15%">+</button>
    </div>
  `;
}

export function renderVisualEditorModalHtml() {
  if (!store.editorModalOpen) return '';
  const eff = getEffectiveConfig();
  const selected = REGION_IDS.includes(store.selectedRegion) ? store.selectedRegion : 'sidebar';

  return `
    <div id="prism-visual-editor-modal"
         class="prism-ve-modal agy-prism-visual-editor"
         role="dialog" aria-modal="true" aria-label="${esc(tr('editor.title'))}"
         translate="no" data-no-translate="true" data-ag-no-i18n="1">
      <header class="prism-ve-toolbar">
        <div class="prism-ve-toolbar-left">
          <span class="prism-ve-title">🎨 ${esc(tr('editor.title'))}</span>
          ${renderInlineAutosavePillHtml(false)}
        </div>
        <div class="prism-ve-toolbar-right">
          ${renderZoomAndPreviewTogglesHtml(eff)}
          <button type="button" class="prism-btn prism-btn-sm" data-action="popout-visual-editor">
            ${esc(tr('editor.popoutBtn'))}
          </button>
          <button type="button" class="prism-btn prism-btn-sm prism-btn-primary" data-action="close-visual-editor">
            ${esc(tr('editor.exitSaveBtn'))}
          </button>
        </div>
      </header>

      <div class="prism-ve-modal-body">
        <div class="prism-ve-region-strip" role="tablist" aria-label="${esc(tr('editor.treeTitle'))}">
          ${INSPECTABLE_REGIONS.map(
            (r) => `
            <button type="button" class="prism-ve-region-chip ${selected === r.id ? 'is-selected' : ''}"
                    role="tab" aria-selected="${selected === r.id ? 'true' : 'false'}"
                    data-action="select-editor-region" data-region="${esc(r.id)}">
              <span>${esc(r.glyph)}</span>
              <span>${esc(tr(r.labelKey))}</span>
            </button>
          `,
          ).join('')}
        </div>

        <section class="prism-ve-canvas-pane">
          ${renderVisualCanvasStageHtml({ variant: 'modal' })}
        </section>

        <aside id="prism-ve-inspector-pane" class="prism-ve-inspector-pane">
          ${renderRegionInspectorHtml(selected)}
        </aside>
      </div>
    </div>
  `;
}

export function renderVisualEditorPopoutShellHtml() {
  const eff = getEffectiveConfig();
  const selected = REGION_IDS.includes(store.selectedRegion) ? store.selectedRegion : 'sidebar';
  const attached = isHostAttached();

  return `
    <div class="prism-ve-popout-shell agy-prism-visual-editor"
         translate="no" data-no-translate="true" data-ag-no-i18n="1">
      <header class="prism-ve-topbar">
        <div class="prism-ve-toolbar-left">
          <span class="prism-brand-diamond" aria-hidden="true">◆</span>
          <span class="prism-ve-title">${esc(tr('app.title'))} · ${esc(tr('editor.title'))}</span>
          ${renderInlineAutosavePillHtml(true)}
        </div>
        <div class="prism-ve-toolbar-right">
          ${renderZoomAndPreviewTogglesHtml(eff)}
          <span id="prism-top-status-pill" class="prism-status-pill" data-status="${!store.skinEnabled ? 'off' : attached ? 'attached' : 'standby'}">
            <span class="prism-status-dot"></span>
            <span id="prism-top-status-text">${esc(attached ? tr('editor.liveLinkedBadge') : tr('status.standby'))}</span>
          </span>
          <button id="prism-master-toggle-btn" type="button" class="prism-master-toggle"
                  role="switch" aria-checked="${store.skinEnabled ? 'true' : 'false'}"
                  data-enabled="${store.skinEnabled ? 'true' : 'false'}"
                  data-action="toggle-skin-master"
                  title="${esc(getMasterToggleHint(store.skinEnabled))}">
            <span class="prism-master-toggle-dot"></span>
            <span id="prism-master-toggle-text">${esc(getMasterToggleLabel(store.skinEnabled))}</span>
          </button>
          <button id="prism-lang-btn" type="button" class="prism-lang-btn" data-action="toggle-lang">
            🌐 ${esc(tr('app.langToggle'))}
          </button>
        </div>
      </header>

      <div class="prism-ve-ide-grid">
        <aside class="prism-ve-tree-pane">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:6px">
            <span class="prism-ve-tree-head">${esc(tr('editor.treeTitle'))}</span>
            <button type="button" class="prism-btn prism-btn-sm" data-action="reset-all-regions"
                    title="${esc(tr('region.resetAllRegions'))}">↺</button>
          </div>
          ${renderRegionTreeHtml(selected)}
        </aside>

        <section class="prism-ve-canvas-pane">
          ${renderVisualCanvasStageHtml({ variant: 'popout' })}
        </section>

        <aside id="prism-ve-inspector-pane" class="prism-ve-inspector-pane">
          ${renderRegionInspectorHtml(selected)}
        </aside>
      </div>

      <div id="prism-toast-host" class="prism-toast-stack agy-prism-toast-stack"></div>
    </div>
  `;
}

export function syncVisualCanvasZoomTransform(canvasEl = null) {
  const target = canvasEl || document.getElementById('prism-ve-panzoom-inner');
  const zoom = clampZoom(store.canvasZoom ?? 1);
  store.canvasZoom = zoom;
  const panX = Number.isFinite(Number(store.canvasPanX)) ? Math.round(Number(store.canvasPanX)) : 0;
  const panY = Number.isFinite(Number(store.canvasPanY)) ? Math.round(Number(store.canvasPanY)) : 0;
  store.canvasPanX = panX;
  store.canvasPanY = panY;
  if (target instanceof HTMLElement) {
    target.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  }
  const pctEl = document.getElementById('prism-ve-zoom-pct');
  if (pctEl) {
    pctEl.textContent = `${Math.round(zoom * 100)}%`;
  }
}

let activePanZoomCleanup = null;

export function attachCanvasPanZoom(viewportEl = null, canvasEl = null) {
  if (typeof activePanZoomCleanup === 'function') {
    const prevCleanup = activePanZoomCleanup;
    activePanZoomCleanup = null;
    try {
      prevCleanup();
    } catch {
      // ignore stale listener cleanup errors
    }
  }
  const vp = viewportEl || document.getElementById('prism-ve-viewport');
  const inner = canvasEl || document.getElementById('prism-ve-panzoom-inner');
  if (!(vp instanceof HTMLElement) || !(inner instanceof HTMLElement)) {
    return () => {};
  }
  if (vp.dataset.panZoomBound === '1') {
    syncVisualCanvasZoomTransform(inner);
    return () => {};
  }
  vp.dataset.panZoomBound = '1';

  let dragging = false;
  let moved = false;
  let startX = 0;
  let startY = 0;
  let origPanX = 0;
  let origPanY = 0;
  let pointerId = null;

  const onWheel = (e) => {
    e.preventDefault();
    const step = e.deltaY < 0 ? 0.12 : -0.12;
    store.canvasZoom = clampZoom((store.canvasZoom ?? 1) + step);
    syncVisualCanvasZoomTransform(inner);
  };

  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    if (e.target instanceof HTMLElement && e.target.closest('button, input, select')) return;
    dragging = true;
    moved = false;
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    origPanX = Number(store.canvasPanX) || 0;
    origPanY = Number(store.canvasPanY) || 0;
  };

  const onPointerMove = (e) => {
    if (!dragging || (pointerId !== null && e.pointerId !== pointerId)) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (!moved && Math.hypot(dx, dy) > 5) {
      moved = true;
      vp.classList.add('is-panning');
      try {
        vp.setPointerCapture(e.pointerId);
      } catch {
        // ignore capture issues
      }
    }
    if (moved) {
      store.canvasPanX = Math.max(-420, Math.min(420, Math.round(origPanX + dx)));
      store.canvasPanY = Math.max(-280, Math.min(280, Math.round(origPanY + dy)));
      syncVisualCanvasZoomTransform(inner);
    }
  };

  const endDrag = (e) => {
    if (!dragging) return;
    const wasMoved = moved;
    dragging = false;
    moved = false;
    vp.classList.remove('is-panning');
    if (pointerId !== null) {
      try {
        if (vp.hasPointerCapture?.(pointerId)) vp.releasePointerCapture(pointerId);
      } catch {
        // ignore release errors
      }
      pointerId = null;
    }
    if (wasMoved && e) {
      const suppressClick = (ce) => {
        ce.stopPropagation();
        ce.preventDefault();
      };
      vp.addEventListener('click', suppressClick, { capture: true, once: true });
      setTimeout(() => vp.removeEventListener('click', suppressClick, { capture: true }), 80);
    }
  };

  const onDblClick = (e) => {
    if (e.target instanceof HTMLElement && e.target.closest('button, input, select')) return;
    store.canvasZoom = 1;
    store.canvasPanX = 0;
    store.canvasPanY = 0;
    syncVisualCanvasZoomTransform(inner);
  };

  vp.addEventListener('wheel', onWheel, { passive: false });
  vp.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  vp.addEventListener('dblclick', onDblClick);

  syncVisualCanvasZoomTransform(inner);

  const cleanup = () => {
    vp.removeEventListener('wheel', onWheel);
    vp.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', endDrag);
    window.removeEventListener('pointercancel', endDrag);
    vp.removeEventListener('dblclick', onDblClick);
    delete vp.dataset.panZoomBound;
    if (activePanZoomCleanup === cleanup) {
      activePanZoomCleanup = null;
    }
  };
  activePanZoomCleanup = cleanup;
  return cleanup;
}
