// Wallpaper Prism Studio UI — Layer 6 Thin-Shell Entrypoint, Event Delegation & Dormancy Engine
// Imports L0-L5 strictly acyclic DAG modules. No exports (bundled via scripts/build.mjs).
// Preserves exact symbol names `installStudioVisibilityGuards` & `disconnectStudioEvents` (verify-all.mjs:L1594-L1598).

import {
  PLUGIN_VERSION,
  DEFAULT_DEBUG_PORT,
  LIBRARY_KINDS,
  CONTENT_RATINGS,
  REGION_IDS,
  CJK_SAFE_FONT_PRESETS,
  SCENE_PRESETS,
  FACTORY_PRESETS,
  DEFAULT_CONFIG,
  PER_WALLPAPER_OVERRIDE_KEYS,
  resolveRegionEffectiveStyle,
  resolveSchemeTokens,
  sanitizeConfig,
  sanitizeFontFamily,
} from '../shared/schema.mjs';

import {
  MAX_UPLOAD_BYTES,
  VIRTUAL_SCROLL_THRESHOLD,
  REGION_UI_ORDER,
  REGION_RESET_EXTRA_KEYS,
  store,
  registerHooks,
  apiFetch,
  apiJson,
  curLocale,
  tr,
  tx,
  esc,
  formatBytes,
  withStaticPreviewParam,
  isStudioViewportActive,
  getActiveId,
  getEffectiveConfig,
  getResolvedPolarity,
  hasPerWallpaperPin,
  isHostAttached,
  getMasterToggleLabel,
  getMasterToggleHint,
  setRegionOpen,
  setAllRegionsOpen,
  hasAnyRegionOpen,
  applyLocalPatch,
  queueConfigPatch,
  flushConfigPatch,
  flushConfigPatchKeepalive,
  ingestServerState,
  ingestUpdateStatus,
  showToast,
  setArmedConfirm,
  startInspectorPick,
  cancelInspectorPick,
  normalizeWeProperties,
  evaluateWeCondition,
  computeLibraryModel,
  computeQuickQueueItems,
  externalStateSignature,
  updateStatusSignature,
} from './state.mjs';

import {
  weColorToHex,
  hexToWeColor,
  shouldPlayStudioPreviewVideo,
  evaluateRegionFgContrast,
  syncOpticalCssVars,
  releaseExistingPreviewVideo,
  syncMiniPreviewMedia,
} from './optics.mjs';

import {
  sliderMeta,
  renderSwitchRow,
  renderSegRow,
  renderConfirmRow,
  renderColorPickerWithWcag,
  renderScenePresetsHtml,
  renderSaveStatusPillHtml,
  renderMediaHealthAlertsHtml,
  syncPairedSlidersInDom,
  syncNullableFollowersInDom,
  syncRegionBadgesInDom,
  syncRegionStyleControlsInDom,
} from './controls.mjs';

import {
  computeVirtualSlice,
  renderLibraryGridHtml,
  renderLibraryTab,
  patchActiveCardsInPlace,
  attachLibraryThumbHoverController,
  resetLibraryHoverThumb,
} from './tabs/library.mjs';

import {
  renderSkinTopActionBarHtml,
  renderPresetsGridHtml,
  renderPresetsManagerDrawerHtml,
  renderPrismSkinTab,
  isCurrentStateDirtyFromPreset,
  mapPickerRegionToAccordionId,
  focusSkinRegionAccordionInDom,
} from './tabs/skin-regions.mjs';

import {
  renderPlaylistPickerGridHtml,
  renderPlaybackTab,
} from './tabs/playback.mjs';

import {
  renderUpdateReconnectOverlay,
  renderAutostartBannerHtml,
  renderSystemTab,
} from './tabs/system.mjs';

import {
  renderVisualEditorModalHtml,
  renderVisualEditorPopoutShellHtml,
  attachCanvasPanZoom,
  syncVisualCanvasZoomTransform,
  focusVisualEditorRegionInDom,
} from './editor/visual-canvas.mjs';

function bootPrismStudioApp() {
  const PRESERVE_FOCUS_IDS = Object.freeze([
    'prism-lib-search',
    'prism-preset-name-in',
    'prism-preset-desc-in',
    'prism-preset-rename-in',
    'prism-pl-name-in',
    'prism-fs-path-in',
  ]);

  let delegationBound = false;

  // ==========================================================================
  // Helpers: Visible Presets, Snapshot Payload & Surgical UI Refresh
  // ==========================================================================
  function getVisiblePresets() {
    const deleted = store.config.deletedFactoryPresets || [];
    const list = store.presets?.length ? store.presets : FACTORY_PRESETS;
    return list.filter((p) => p && !deleted.includes(p.id));
  }

  function buildSnapshotConfigPatch(includeWallpaper = false) {
    const eff = getEffectiveConfig();
    const out = {};
    for (const k of Object.keys(DEFAULT_CONFIG)) {
      if (
        k === 'accentCache' ||
        k === 'extractedAccent' ||
        k === 'rotationGroups' ||
        k === 'favorites' ||
        k === 'hiddenIds' ||
        k === 'userProps' ||
        k === 'perWallpaperOverrides' ||
        k === 'frameVariants' ||
        k === 'sceneLiveFailures' ||
        k === 'deletedFactoryPresets' ||
        k === 'uploadDir' ||
        k === 'cacheDir' ||
        k === 'customFolders' ||
        k === 'activeProfilePresetId'
      ) {
        continue;
      }
      if ((k === 'activeWallpaperId' || k === 'wallpaperId' || k === 'kind') && !includeWallpaper) {
        continue;
      }
      if (k in eff) out[k] = eff[k];
    }
    if (includeWallpaper) {
      const aid = getActiveId();
      if (aid) {
        out.activeWallpaperId = aid;
        out.wallpaperId = aid;
      }
    }
    return out;
  }

  function refreshPresetsSurfacesSurgically() {
    const grid = document.getElementById('prism-presets-grid');
    if (grid) {
      grid.innerHTML = renderPresetsGridHtml();
    }
    const skinBar = document.getElementById('prism-skin-pin-bar');
    if (skinBar && store.activeTab === 'skin') {
      const tmp = document.createElement('div');
      tmp.innerHTML = renderSkinTopActionBarHtml();
      const fresh = tmp.firstElementChild;
      if (fresh) skinBar.replaceWith(fresh);
    }
    updateLeftRailPanels();
  }

  function renderToastStack() {
    const host = document.getElementById('prism-toast-host');
    if (!host) return;
    host.innerHTML = store.toasts
      .map(
        (item) => `
      <div class="prism-toast" data-tone="${esc(item.tone)}">
        <span>${item.tone === 'ok' ? '✓' : item.tone === 'warn' ? '⚠' : item.tone === 'danger' ? '✕' : '◆'}</span>
        <span>${esc(item.message)}</span>
      </div>
    `,
      )
      .join('');
  }

  function syncMediaHealthHost() {
    const host = document.getElementById('prism-media-health-host');
    if (host) {
      host.innerHTML = renderMediaHealthAlertsHtml();
    }
  }

  function updateTopStatusIndicators() {
    const masterBtn = document.getElementById('prism-master-toggle-btn');
    const masterTxt = document.getElementById('prism-master-toggle-text');
    if (masterBtn) {
      const enabledStr = store.skinEnabled ? 'true' : 'false';
      const busyStr = store.masterToggleBusy ? 'true' : 'false';
      masterBtn.setAttribute('aria-checked', enabledStr);
      masterBtn.dataset.enabled = enabledStr;
      masterBtn.setAttribute('aria-busy', busyStr);
      masterBtn.dataset.busy = busyStr;
      masterBtn.title = getMasterToggleHint(store.skinEnabled);
    }
    if (masterTxt) {
      masterTxt.textContent = getMasterToggleLabel(store.skinEnabled);
    }

    const pill = document.getElementById('prism-top-status-pill');
    const txt = document.getElementById('prism-top-status-text');
    const attached = isHostAttached();
    const canaryTripped = store.canary?.state === 'tripped';
    const isManualSleeping = !canaryTripped && store.config.startupMode === 'manual' && !store.sessionAwake;
    if (pill && txt) {
      const ready = Boolean(store.autostart.normalShortcutEnabled);
      if (canaryTripped) {
        pill.dataset.status = 'tripped';
        txt.textContent = tr('canary.state.tripped');
      } else if (isManualSleeping) {
        pill.dataset.status = 'manual';
        txt.textContent = tr('host.startup.manual');
      } else {
        pill.dataset.status = !store.skinEnabled ? 'off' : attached ? 'attached' : 'standby';
        if (store.isPopoutMode) {
          txt.textContent = !store.skinEnabled
            ? tr('status.skinOff')
            : attached
              ? tr('editor.liveLinkedBadge')
              : tr('status.standby');
        } else {
          txt.textContent = !store.skinEnabled
            ? tr('status.skinOff')
            : attached
              ? tr('status.connected')
              : ready
                ? `${tr('status.standby')} · ✓`
                : tr('status.standby');
        }
      }
    }

    const bannerHost = document.getElementById('prism-autostart-banner-host');
    if (bannerHost) {
      bannerHost.innerHTML = renderAutostartBannerHtml();
    }
    const railCdp = document.getElementById('rail-cdp-chip');
    if (railCdp) {
      railCdp.className = `prism-chip ${attached ? 'is-active' : ''}`;
      railCdp.textContent = attached
        ? curLocale() === 'zh'
          ? '● CDP 已连接'
          : '● CDP Attached'
        : curLocale() === 'zh'
          ? '◌ CDP 待机'
          : '◌ CDP Standby';
    }
    syncMediaHealthHost();
  }

  // ==========================================================================
  // D8 Minimal Left Rail (0 duplicate optical sliders, 0 extracted accent chips)
  // ==========================================================================
  function renderTransportBarHtml() {
    const eff = getEffectiveConfig();
    const item = store.activeItem || store.items.find((x) => x.id === getActiveId());
    const activeGroup = (store.config.rotationGroups || []).find((g) => g.id === store.config.rotationGroupId);
    const playlistLabel = store.config.rotationEnabled
      ? activeGroup
        ? `↻ ${activeGroup.name}`
        : `↻ ${store.config.rotationInterval}m`
      : tr('transport.playlistNone');
    const volPct = Math.round((eff.volume ?? 0.5) * 100);
    const isFav = item && (store.config.favorites || []).includes(item.id);

    return `
      <div class="prism-now-meta">
        <span class="prism-kind-badge">${esc(item ? tr(`kind.${item.kind}`) || item.kind : 'PRISM')}</span>
        <span class="prism-now-title" title="${esc(item?.title || 'Obsidian Prism Aurora')}">${esc(item?.title || 'Obsidian Prism Aurora')}</span>
        ${!store.skinEnabled ? `<span class="prism-chip" style="cursor:default">${esc(tr('transport.disabledTag'))}</span>` : ''}
      </div>
      <div class="prism-transport-ctls">
        <button type="button" class="prism-icon-btn" data-action="step-playlist" data-dir="-1" title="${esc(tr('transport.prev'))}">⏮</button>
        <button type="button" class="prism-icon-btn ${!eff.paused ? 'is-active' : ''}" data-action="toggle-pause"
                title="${esc(eff.paused ? tr('transport.play') : tr('transport.pause'))}">${eff.paused ? '▶' : '⏸'}</button>
        <button type="button" class="prism-icon-btn" data-action="step-playlist" data-dir="1" title="${esc(tr('transport.next'))}">⏭</button>
        <button type="button" class="prism-icon-btn ${!eff.muted ? 'is-active' : ''}" data-action="toggle-mute"
                title="${esc(eff.muted ? tr('transport.unmute') : tr('transport.mute'))}">${eff.muted ? '🔇' : '🔊'}</button>
        <div class="prism-vol-inline">
          <input type="range" class="prism-range" min="0" max="100" step="5" value="${volPct}"
                 style="--prism-pct:${volPct}%" data-config-slider="volume" data-inline-vol="true" />
        </div>
        ${
          item
            ? `<button type="button" class="prism-icon-btn ${isFav ? 'is-active' : ''}"
                       data-action="toggle-fav" data-id="${esc(item.id)}" title="${esc(tr('lib.favorites'))}">★</button>`
            : ''
        }
        <button type="button" class="prism-playlist-pill" data-enabled="${store.config.rotationEnabled ? 'true' : 'false'}"
                data-action="open-drawer" data-drawer="playlist" title="${esc(tr('lib.playlists'))}">
          ${esc(playlistLabel)}
        </button>
      </div>
    `;
  }

  function renderRailExtrasHtml() {
    const eff = getEffectiveConfig();
    const isZh = curLocale() === 'zh';
    const activeId = getActiveId();
    const item = store.activeItem || store.items.find((x) => x.id === activeId);
    const attached = isHostAttached();
    const queueSlots = computeQuickQueueItems(4);
    const visiblePresets = getVisiblePresets();
    const activePresetId = store.config.activeProfilePresetId || '';
    const isDirty = isCurrentStateDirtyFromPreset(eff);
    const busy = Boolean(store.profileOpBusy);
    const rotEnabled = Boolean(store.config.rotationEnabled);
    const rotMode = !rotEnabled
      ? 'off'
      : store.config.rotationTrigger === 'videoEnd'
        ? 'videoEnd'
        : store.config.rotationOrder === 'sequence'
          ? 'sequence'
          : 'random';

    return `
      <!-- 1. Optical Scene Presets Card (4 Presets) -->
      <div id="prism-rail-scene-card" class="prism-card" style="display:flex;flex-direction:column;gap:7px;padding:10px 12px">
        <span class="prism-section-tag">✦ ${esc(tr('preset.sceneTitle'))}</span>
        ${renderScenePresetsHtml(eff)}
      </div>

      <!-- 2. D8 Minimal Profile Switcher & Active Wallpaper Metadata (ZERO duplicate optical sliders) -->
      <div id="prism-rail-profile-card" class="prism-card prism-rail-profile-card prism-rail-desktop-only">
        <div class="prism-rail-profile-head">
          <span class="prism-section-tag">❖ ${esc(tr('preset.switcherLabel'))}</span>
          ${isDirty ? `<span class="prism-dirty-badge">${esc(tx('dirtyBadge'))}</span>` : ''}
        </div>

        <div class="prism-rail-preset-row">
          <select class="prism-select" data-action="quick-switch-profile-preset"
                  aria-label="${esc(tr('preset.switcherLabel'))}" ${busy ? 'disabled' : ''}>
            ${
              !visiblePresets.some((p) => p.id === activePresetId)
                ? `<option value="" selected disabled>${esc(isZh ? '自定义 / 未命名' : 'Custom / Unsaved')}</option>`
                : ''
            }
            ${visiblePresets
              .map((p) => {
                const isAct = p.id === activePresetId;
                const pName = isZh ? p.name : p.nameEn || p.name;
                return `<option value="${esc(p.id)}" ${isAct ? 'selected' : ''}>${esc(pName)}${isAct && isDirty ? ` · ${tx('dirtyBadge')}` : ''}</option>`;
              })
              .join('')}
          </select>
          <button type="button" class="prism-btn prism-btn-sm" data-action="open-drawer" data-drawer="presets" ${busy ? 'disabled' : ''}>
            ${esc(tr('preset.manageBtn'))}
          </button>
        </div>

        <div class="prism-rail-meta-chips">
          <span class="prism-chip" style="cursor:default">${esc(item ? tr(`kind.${item.kind}`) || item.kind : 'PRISM')}</span>
          ${item?.resolution ? `<span class="prism-chip" style="cursor:default">${esc(item.resolution)}</span>` : ''}
          ${item?.fileSize ? `<span class="prism-chip" style="cursor:default">${esc(formatBytes(item.fileSize))}</span>` : ''}
          ${item?.workshopId ? `<span class="prism-chip" style="cursor:default">WS #${esc(item.workshopId)}</span>` : ''}
        </div>

        <div class="prism-rail-quick-actions">
          <button type="button" class="prism-btn prism-btn-sm prism-btn-primary" data-action="open-visual-editor">
            ${esc(tr('editor.openBtn'))}
          </button>
          ${
            activeId
              ? `<button type="button" class="prism-btn prism-btn-sm" data-action="open-inspector" data-id="${esc(activeId)}">
                   ⚙ ${esc(tx('inspectorBtn'))}
                 </button>`
              : ''
          }
        </div>
      </div>

      <!-- 3. Playlist Queue & Smart Power Dock (flex: 1 1 auto keeps railContentFillRatio >= 0.80) -->
      <div id="prism-rail-dock-card" class="prism-card prism-rail-dock-card prism-rail-desktop-only">
        <div style="display:flex;flex-direction:column;gap:8px">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:6px">
            <span class="prism-section-tag">${esc(isZh ? '轮播队列与节能状态' : 'Playlist Queue & Smart Power')}</span>
            <button type="button" class="prism-btn prism-btn-sm" data-action="open-drawer" data-drawer="playlist">
              ↻ ${esc(tr('lib.playlists'))}
            </button>
          </div>

          ${
            queueSlots.length > 0
              ? `
            <div class="prism-rail-queue-strip">
              ${queueSlots
                .map((qIt) => {
                  const rawThumb = qIt.thumbUrl || (qIt.kind === 'image' ? qIt.mediaUrl : '');
                  const qThumb = rawThumb ? withStaticPreviewParam(rawThumb) : '';
                  const qAct = qIt.id === activeId;
                  return `
                    <button type="button" class="prism-rail-qslot ${qAct ? 'is-active' : ''}"
                            data-action="card-click" data-id="${esc(qIt.id)}" title="${esc(qIt.title || qIt.id)}">
                      <div class="prism-rail-qslot-thumb">
                        ${qThumb ? `<img loading="lazy" decoding="async" src="${esc(qThumb)}" alt="" onerror="this.remove()" />` : ''}
                      </div>
                      <span class="prism-rail-qslot-title">${esc(qIt.title || qIt.id)}</span>
                    </button>
                  `;
                })
                .join('')}
            </div>
          `
              : ''
          }

          <div class="prism-seg" style="width:100%;justify-content:space-between">
            ${[
              { m: 'off', zh: '单张', en: 'Single' },
              { m: 'sequence', zh: '顺序', en: 'Seq' },
              { m: 'random', zh: '随机', en: 'Shuffle' },
              { m: 'videoEnd', zh: '播完换张', en: 'VideoEnd' },
            ]
              .map(
                (opt) => `
              <button type="button" class="prism-seg-btn ${rotMode === opt.m ? 'is-active' : ''}" style="flex:1"
                      data-action="quick-rot-mode" data-mode="${opt.m}">${esc(isZh ? opt.zh : opt.en)}</button>
            `,
              )
              .join('')}
          </div>
        </div>

        <div class="prism-rail-power-footer">
          <button type="button" class="prism-chip ${eff.pauseOnHidden ? 'is-active' : ''}"
                  data-action="toggle-bool" data-key="pauseOnHidden">
            🌙 ${esc(isZh ? '最小化暂停' : 'Min-Pause')}
          </button>
          <button type="button" class="prism-chip ${eff.pauseOnBlur ? 'is-active' : ''}"
                  data-action="toggle-bool" data-key="pauseOnBlur">
            👁 ${esc(isZh ? '失焦暂停' : 'Blur-Pause')}
          </button>
          <button id="rail-cdp-chip" type="button" class="prism-chip ${attached ? 'is-active' : ''}"
                  data-action="switch-tab" data-tab="system">
            ${esc(attached ? (isZh ? '● CDP 已连接' : '● CDP Attached') : isZh ? '◌ CDP 待机' : '◌ CDP Standby')}
          </button>
          <span class="prism-chip" style="cursor:default">⌨ Ctrl+Alt+W</span>
        </div>
      </div>
    `;
  }

  function updateLeftRailPanels() {
    const transportHost = document.getElementById('prism-transport-host');
    if (transportHost) transportHost.innerHTML = renderTransportBarHtml();
    const railExtras = document.getElementById('prism-rail-extras');
    if (railExtras) railExtras.innerHTML = renderRailExtrasHtml();
    syncMediaHealthHost();
  }

  // ==========================================================================
  // Slide-Over Drawers: All 5 Drawers Preserved (hidden, playlist, inspector, fs, presets)
  // Guards verify-all.mjs:L4336-L4360 drawer interior click & child <span> close!
  // ==========================================================================
  function renderDrawerHtml() {
    if (!store.drawer) return '';

    if (store.drawer === 'presets') {
      return renderPresetsManagerDrawerHtml();
    }

    if (store.drawer === 'hidden') {
      const model = computeLibraryModel();
      return `
        <div class="prism-drawer-backdrop" data-action="backdrop-close">
          <aside class="prism-drawer agy-prism-drawer">
            <div class="prism-drawer-head">
              <span class="prism-drawer-title">🙈 ${esc(tr('lib.hidden'))} (${model.hiddenItems.length})</span>
              <button type="button" class="prism-icon-btn" data-action="close-drawer">✕</button>
            </div>
            <div class="prism-drawer-body">
              ${
                model.hiddenItems.length === 0
                  ? `<div class="prism-empty-state">${esc(curLocale() === 'zh' ? '当前没有已隐藏的壁纸' : 'No hidden wallpapers')}</div>`
                  : model.hiddenItems
                      .map((it) => {
                        const thumb = it.thumbUrl ? withStaticPreviewParam(it.thumbUrl) : '';
                        return `
                    <div class="prism-confirm-row">
                      <div style="display:flex;align-items:center;gap:8px;min-width:0">
                        ${thumb ? `<img loading="lazy" src="${esc(thumb)}" alt="" onerror="this.remove()" style="width:42px;height:28px;object-fit:cover;border-radius:4px" />` : ''}
                        <span style="font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(it.title || it.id)}</span>
                      </div>
                      <button type="button" class="prism-btn prism-btn-sm" data-action="unhide-item" data-id="${esc(it.id)}">${esc(tr('lib.restoreOne'))}</button>
                    </div>
                  `;
                      })
                      .join('')
              }
            </div>
            <div class="prism-drawer-foot">
              ${
                model.hiddenItems.length > 0
                  ? `<button type="button" class="prism-btn prism-btn-primary" data-action="unhide-all">${esc(tr('lib.restoreAllHidden'))}</button>`
                  : ''
              }
              <button type="button" class="prism-btn" data-action="close-drawer">${esc(tr('common.close'))}</button>
            </div>
          </aside>
        </div>
      `;
    }

    if (store.drawer === 'playlist') {
      const groups = store.config.rotationGroups || [];
      const model = computeLibraryModel();
      const d = store.playlistDraft;
      const intervals = [1, 5, 15, 30, 60, 120, 360, 1440];
      const isZh = curLocale() === 'zh';

      return `
        <div class="prism-drawer-backdrop" data-action="backdrop-close">
          <aside class="prism-drawer agy-prism-drawer">
            <div class="prism-drawer-head">
              <span class="prism-drawer-title">↻ ${esc(tr('lib.playlists'))}</span>
              <button type="button" class="prism-icon-btn" data-action="close-drawer">✕</button>
            </div>
            <div class="prism-drawer-body">
              ${renderSwitchRow({
                key: 'rotationEnabled',
                label: tr('playlist.enable'),
                checked: store.config.rotationEnabled,
              })}
              ${renderSegRow({
                key: 'rotationOrder',
                label: tx('orderLabel'),
                value: store.config.rotationOrder,
                options: [
                  { value: 'sequence', label: tr('playlist.order.sequence') },
                  { value: 'random', label: tr('playlist.order.random') },
                ],
              })}
              ${renderSegRow({
                key: 'rotationTrigger',
                label: tx('triggerLabel'),
                value: store.config.rotationTrigger,
                options: [
                  { value: 'interval', label: tr('playlist.trigger.interval') },
                  { value: 'videoEnd', label: tr('playlist.trigger.videoEnd') },
                ],
              })}
              ${
                store.config.rotationTrigger === 'interval'
                  ? `
                <div style="display:flex;flex-direction:column;gap:5px">
                  <div style="display:flex;justify-content:space-between;align-items:center">
                    <span class="prism-ctl-name">${esc(tr('playlist.intervalMin'))}</span>
                    <input id="prism-rot-interval-in" type="number" min="1" max="1440" class="prism-input" style="width:78px"
                           value="${store.config.rotationInterval}" data-action="change-rot-interval" />
                  </div>
                  <div class="prism-filter-group">
                    ${intervals
                      .map(
                        (m) => `
                      <button type="button" class="prism-chip ${store.config.rotationInterval === m ? 'is-active' : ''}"
                              data-action="set-num" data-key="rotationInterval" data-val="${m}">${m}m</button>
                    `,
                      )
                      .join('')}
                  </div>
                </div>
              `
                  : ''
              }

              <div style="padding-top:8px;border-top:1px solid var(--prism-border-hairline);display:flex;flex-direction:column;gap:6px">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap">
                  <strong style="font-size:12px">${esc(tx('playlistsLabel'))} (${groups.length})</strong>
                  <div style="display:flex;gap:4px">
                    <button type="button" class="prism-btn prism-btn-sm" data-action="import-we-playlist">📥 ${esc(tr('playlist.importWe'))}</button>
                    <button type="button" class="prism-btn prism-btn-sm" data-action="new-playlist-draft">＋ ${esc(tr('playlist.new'))}</button>
                  </div>
                </div>
                ${groups
                  .map((g) => {
                    const isAct = store.config.rotationGroupId === g.id;
                    const delKey = `del-pl:${g.id}`;
                    const armed = store.armedConfirm?.key === delKey;
                    return `
                      <div class="prism-confirm-row" style="border-color:${isAct ? 'var(--prism-accent)' : 'var(--prism-border-hairline)'}">
                        <div style="min-width:0">
                          <div style="font-weight:600;font-size:12px">${esc(g.name)} (${g.wallpaperIds.length})</div>
                          <div style="font-size:10.5px;color:var(--prism-fg-muted)">${esc(g.order)} · ${esc(g.trigger === 'videoEnd' ? 'videoEnd' : `${g.interval}m`)}</div>
                        </div>
                        <div style="display:flex;gap:4px">
                          <button type="button" class="prism-btn prism-btn-sm ${isAct ? 'prism-btn-primary' : ''}"
                                  data-action="activate-playlist" data-id="${esc(g.id)}">${esc(tr('common.apply'))}</button>
                          <button type="button" class="prism-btn prism-btn-sm"
                                  data-action="edit-playlist" data-id="${esc(g.id)}">✎</button>
                          ${
                            armed
                              ? `<button type="button" class="prism-btn prism-btn-sm prism-btn-danger" data-action="delete-playlist" data-payload="${esc(g.id)}">✓</button>`
                              : `<button type="button" class="prism-btn prism-btn-sm" data-action="arm-confirm" data-confirm-key="${esc(delKey)}">🗑</button>`
                          }
                        </div>
                      </div>
                    `;
                  })
                  .join('')}
              </div>

              <div style="padding-top:8px;border-top:1px solid var(--prism-border-hairline);display:flex;flex-direction:column;gap:7px">
                <div style="display:flex;gap:6px;align-items:center">
                  <input id="prism-pl-name-in" type="text" class="prism-input" style="flex:1"
                         placeholder="${esc(tx('playlistNamePlaceholder'))}" value="${esc(d.name)}" />
                  <span class="prism-chip">${d.pickedIds.size} ${esc(isZh ? '已选' : 'picked')}</span>
                </div>
                <div style="display:flex;gap:5px">
                  <button type="button" class="prism-btn prism-btn-sm" data-action="pl-pick-all">${esc(tx('selectVisible'))}</button>
                  <button type="button" class="prism-btn prism-btn-sm" data-action="pl-pick-clear">${esc(tx('clearBtn'))}</button>
                </div>
                <div id="prism-drawer-picker-grid" class="prism-mini-picker-grid" data-virtual-picker="drawer">
                  ${renderPlaylistPickerGridHtml(model.visibleItems, d.pickedIds)}
                </div>
              </div>
            </div>
            <div class="prism-drawer-foot">
              <button type="button" class="prism-btn prism-btn-primary" data-action="save-playlist-draft">${esc(tx('savePlaylist'))}</button>
              <button type="button" class="prism-btn" data-action="close-drawer">${esc(tr('common.close'))}</button>
            </div>
          </aside>
        </div>
      `;
    }

    if (store.drawer === 'inspector') {
      const targetId = store.inspectWallpaperId || getActiveId();
      const item = store.items.find((x) => x.id === targetId) || store.activeItem;
      if (!item) return '';
      const propsList = normalizeWeProperties(item.properties);
      const savedUserProps = store.config.userProps?.[item.id] || {};
      const valuesMap = {};
      for (const p of propsList) {
        valuesMap[p.key] = p.key in savedUserProps ? savedUserProps[p.key] : p.defaultValue;
      }
      const pinned = hasPerWallpaperPin(item.id);
      const isFav = (store.config.favorites || []).includes(item.id);
      const rmUploadKey = `rm-upload:${item.id}`;

      return `
        <div class="prism-drawer-backdrop" data-action="backdrop-close">
          <aside class="prism-drawer agy-prism-drawer">
            <div class="prism-drawer-head">
              <span class="prism-drawer-title">⚙ ${esc(tr('lib.inspector'))}</span>
              <button type="button" class="prism-icon-btn" data-action="close-drawer">✕</button>
            </div>
            <div class="prism-drawer-body">
              <div class="prism-card" style="display:flex;flex-direction:column;gap:7px">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
                  <strong style="font-size:13px">${esc(item.title || item.id)}</strong>
                  <button type="button" class="prism-btn prism-btn-sm ${isFav ? 'prism-btn-primary' : ''}"
                          data-action="toggle-fav" data-id="${esc(item.id)}">★ ${esc(tr('lib.favorites'))}</button>
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:5px">
                  <span class="prism-chip">${esc(tr(`kind.${item.kind}`) || item.kind)}</span>
                  <span class="prism-chip">${esc(item.source)}</span>
                  ${item.resolution ? `<span class="prism-chip">${esc(item.resolution)}</span>` : ''}
                  ${item.fileSize ? `<span class="prism-chip">${esc(formatBytes(item.fileSize))}</span>` : ''}
                  ${item.workshopId ? `<span class="prism-chip">ID ${esc(item.workshopId)}</span>` : ''}
                </div>
                ${
                  Array.isArray(item.tags) && item.tags.length > 0
                    ? `<div style="display:flex;flex-wrap:wrap;gap:4px">${item.tags.map((tg) => `<span class="prism-fmt-tag">#${esc(tg)}</span>`).join('')}</div>`
                    : ''
                }
                <div class="prism-ctl-row">
                  <span class="prism-ctl-name">📌 ${esc(tr('lib.pinOverride'))}</span>
                  <button type="button" role="switch" class="prism-switch" aria-checked="${pinned ? 'true' : 'false'}"
                          data-action="toggle-pin-for" data-id="${esc(item.id)}"></button>
                </div>
                ${
                  item.source === 'upload'
                    ? renderConfirmRow({
                        confirmKey: rmUploadKey,
                        label: curLocale() === 'zh' ? '删除此本地上传文件' : 'Delete uploaded media file',
                        btnLabel: tr('preset.delete'),
                        danger: true,
                        action: 'remove-upload',
                        payload: item.id,
                      })
                    : ''
                }
              </div>

              <div class="prism-card" style="display:flex;flex-direction:column;gap:6px">
                <strong style="font-size:12.5px">${esc(tx('wePropsTitle'))}</strong>
                ${
                  propsList.length === 0
                    ? `<span class="prism-ctl-hint">${esc(tx('wePropsEmpty'))}</span>`
                    : propsList
                        .filter((p) => evaluateWeCondition(p.condition, valuesMap))
                        .map((p) => {
                          const curVal = valuesMap[p.key];
                          if (p.type === 'text' || p.type === 'group') {
                            return `<div class="prism-section-tag" style="padding-top:6px">${esc(p.label)}</div>`;
                          }
                          if (p.type === 'bool') {
                            return `
                              <div class="prism-ctl-row">
                                <span class="prism-ctl-name">${esc(p.label)}</span>
                                <button type="button" role="switch" class="prism-switch" aria-checked="${curVal ? 'true' : 'false'}"
                                        data-action="we-prop-bool" data-wid="${esc(item.id)}" data-prop="${esc(p.key)}"></button>
                              </div>
                            `;
                          }
                          if (p.type === 'color') {
                            const hex = weColorToHex(String(curVal || '')) || '#669DF6';
                            return `
                              <div class="prism-ctl-row">
                                <span class="prism-ctl-name">${esc(p.label)}</span>
                                <input type="color" class="prism-color-input" value="${esc(hex)}"
                                       data-action="we-prop-color" data-wid="${esc(item.id)}" data-prop="${esc(p.key)}"
                                       data-orig-fmt="${String(curVal || '').startsWith('#') ? 'hex' : 'we'}" />
                              </div>
                            `;
                          }
                          if (p.type === 'combo' && p.options.length > 0) {
                            return `
                              <div class="prism-ctl-row">
                                <span class="prism-ctl-name">${esc(p.label)}</span>
                                <select class="prism-select" data-action="we-prop-combo" data-wid="${esc(item.id)}" data-prop="${esc(p.key)}">
                                  ${p.options
                                    .map(
                                      (o, oi) => `
                                    <option value="${oi}" ${String(o.value) === String(curVal) ? 'selected' : ''}>${esc(o.label)}</option>
                                  `,
                                    )
                                    .join('')}
                                </select>
                              </div>
                            `;
                          }
                          if (p.type === 'slider') {
                            const numV = Number.isFinite(Number(curVal)) ? Number(curVal) : p.min;
                            const { pct, display } = sliderMeta(numV, p.min, p.max, p.step < 1 ? 2 : 0, '');
                            return `
                              <div class="prism-slider-row" data-dirty="${numV !== Number(p.defaultValue) ? 'true' : 'false'}">
                                <span class="prism-slider-label">${esc(p.label)}</span>
                                <span class="prism-slider-val">${esc(display)}</span>
                                <button type="button" class="prism-reset-btn" data-action="we-prop-reset"
                                        data-wid="${esc(item.id)}" data-prop="${esc(p.key)}">↺</button>
                                <input type="range" class="prism-range" min="${p.min}" max="${p.max}" step="${p.step}" value="${numV}"
                                       style="--prism-pct:${pct}%" data-we-slider="${esc(p.key)}" data-wid="${esc(item.id)}" />
                              </div>
                            `;
                          }
                          return `
                            <div class="prism-ctl-row">
                              <span class="prism-ctl-name">${esc(p.label)}</span>
                              <input type="text" class="prism-input" value="${esc(curVal ?? '')}"
                                     data-action="we-prop-text" data-wid="${esc(item.id)}" data-prop="${esc(p.key)}" />
                            </div>
                          `;
                        })
                        .join('')
                }
              </div>
            </div>
            <div class="prism-drawer-foot">
              <button type="button" class="prism-btn prism-btn-primary" data-action="apply-wallpaper" data-id="${esc(item.id)}">
                ✦ ${esc(tr('common.apply'))}
              </button>
              <button type="button" class="prism-btn" data-action="close-drawer">${esc(tr('common.close'))}</button>
            </div>
          </aside>
        </div>
      `;
    }

    if (store.drawer === 'fs') {
      const fb = store.fsBrowser;
      return `
        <div class="prism-drawer-backdrop" data-action="backdrop-close">
          <aside class="prism-drawer agy-prism-drawer">
            <div class="prism-drawer-head">
              <span class="prism-drawer-title">📂 ${esc(tr('host.browse'))}</span>
              <button type="button" class="prism-icon-btn" data-action="close-drawer">✕</button>
            </div>
            <div class="prism-drawer-body">
              <div class="prism-filter-group">
                ${(fb.quickRoots || [])
                  .map(
                    (qr) => `
                  <button type="button" class="prism-chip" data-action="fs-nav" data-path="${esc(qr.path || qr)}">
                    ${esc(qr.label || qr.name || qr.path || qr)}
                  </button>
                `,
                  )
                  .join('')}
                ${
                  fb.parent
                    ? `<button type="button" class="prism-chip" data-action="fs-nav" data-path="${esc(fb.parent)}">⬆ ${esc(tx('fsUp'))}</button>`
                    : ''
                }
              </div>

              <div style="display:flex;gap:6px">
                <input id="prism-fs-path-in" type="text" class="prism-input" style="flex:1;font-family:var(--prism-font-mono)"
                       value="${esc(fb.current)}" />
                <button type="button" class="prism-btn" data-action="fs-jump-input">Go</button>
              </div>

              <div class="prism-fs-list">
                ${
                  fb.loading
                    ? `<div style="padding:14px;color:var(--prism-fg-muted)">Loading…</div>`
                    : (fb.entries || []).length === 0
                      ? `<div style="padding:14px;color:var(--prism-fg-muted)">${esc(tx('fsEmpty'))}</div>`
                      : (fb.entries || [])
                          .map((ent) => {
                            const ePath = typeof ent === 'string' ? ent : ent.path;
                            const eName = typeof ent === 'string' ? ent : ent.name || ent.path;
                            return `
                              <button type="button" class="prism-fs-item" data-action="fs-nav" data-path="${esc(ePath)}">
                                <span>📁</span>
                                <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(eName)}</span>
                              </button>
                            `;
                          })
                          .join('')
                }
              </div>
            </div>
            <div class="prism-drawer-foot">
              <button type="button" class="prism-btn prism-btn-primary" data-action="fs-confirm-select">
                ✓ ${esc(tx('fsSelectCurrent'))}
              </button>
              <button type="button" class="prism-btn" data-action="close-drawer">${esc(tr('common.close'))}</button>
            </div>
          </aside>
        </div>
      `;
    }

    return '';
  }

  // ==========================================================================
  // Shell Mounting (Full Aux Pane Shell + Standalone Popout 3-Pane IDE Shell)
  // ==========================================================================
  function renderActiveTabContentHtml() {
    if (store.activeTab === 'skin') return renderPrismSkinTab();
    if (store.activeTab === 'playback') return renderPlaybackTab();
    if (store.activeTab === 'system') return renderSystemTab();
    return renderLibraryTab();
  }

  let disposeCanvasPanZoom = null;

  function clearCanvasPanZoomBinding() {
    if (typeof disposeCanvasPanZoom === 'function') {
      const fn = disposeCanvasPanZoom;
      disposeCanvasPanZoom = null;
      try {
        fn();
      } catch {
        // ignore pan/zoom cleanup errors
      }
    }
  }

  function rebindCanvasPanZoom() {
    clearCanvasPanZoomBinding();
    disposeCanvasPanZoom = attachCanvasPanZoom();
  }

  function renderVisualEditorHost() {
    const host = document.getElementById('prism-visual-editor-host');
    if (!host) return;
    if (!store.editorModalOpen) {
      clearCanvasPanZoomBinding();
      if (host.innerHTML) host.innerHTML = '';
      return;
    }
    const prevInspScroll = document.getElementById('prism-ve-inspector-pane')?.scrollTop || 0;
    host.innerHTML = renderVisualEditorModalHtml();
    const insp = document.getElementById('prism-ve-inspector-pane');
    if (insp) insp.scrollTop = prevInspScroll;
    rebindCanvasPanZoom();
    syncVisualCanvasZoomTransform();
  }

  function capturePreservedFocus() {
    const el = document.activeElement;
    if (!el || !el.id || !PRESERVE_FOCUS_IDS.includes(el.id)) return null;
    return {
      id: el.id,
      selStart: el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? el.selectionStart : null,
      selEnd: el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? el.selectionEnd : null,
    };
  }

  function restorePreservedFocus(snap) {
    if (!snap) return;
    const el = document.getElementById(snap.id);
    if (!el) return;
    el.focus();
    if (
      (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) &&
      snap.selStart !== null &&
      snap.selEnd !== null
    ) {
      try {
        el.setSelectionRange(snap.selStart, snap.selEnd);
      } catch {
        // ignore non-text input selection errors
      }
    }
  }

  function bindVirtualPickerScrollListeners() {
    document.querySelectorAll('.prism-mini-picker-grid[data-virtual-picker]').forEach((el) => {
      if (!(el instanceof HTMLElement) || el.dataset.vscrollBound === '1') return;
      el.dataset.vscrollBound = '1';
      let ticking = false;
      el.addEventListener(
        'scroll',
        () => {
          if (ticking) return;
          ticking = true;
          requestAnimationFrame(() => {
            ticking = false;
            const model = computeLibraryModel();
            if (model.visibleItems.length > 24) {
              el.innerHTML = renderPlaylistPickerGridHtml(model.visibleItems, store.playlistDraft.pickedIds, el);
            }
          });
        },
        { passive: true },
      );
    });
  }

  function mountPopoutShell() {
    const app = document.getElementById('app');
    if (!app) return;
    app.classList.add('agy-prism-visual-editor');
    app.dataset.prismMode = 'visual-editor';
    app.innerHTML = renderVisualEditorPopoutShellHtml();
    app.dataset.prismReady = 'true';
    rebindCanvasPanZoom();
    syncVisualCanvasZoomTransform();
    syncMiniPreviewMedia();
    syncOpticalCssVars();
    renderToastStack();
  }

  function renderActiveSurface() {
    const app = document.getElementById('app');
    if (!app) return;

    if (store.isPopoutMode) {
      const prevInspScroll = document.getElementById('prism-ve-inspector-pane')?.scrollTop || 0;
      const prevTreeScroll = document.querySelector('.prism-ve-tree-pane')?.scrollTop || 0;
      const focusSnap = capturePreservedFocus();
      app.classList.add('agy-prism-visual-editor');
      app.innerHTML = renderVisualEditorPopoutShellHtml();
      app.dataset.prismReady = 'true';
      const insp = document.getElementById('prism-ve-inspector-pane');
      if (insp) insp.scrollTop = prevInspScroll;
      const tree = document.querySelector('.prism-ve-tree-pane');
      if (tree) tree.scrollTop = prevTreeScroll;
      restorePreservedFocus(focusSnap);
      rebindCanvasPanZoom();
      syncVisualCanvasZoomTransform();
      syncMiniPreviewMedia();
      syncOpticalCssVars();
      renderToastStack();
      return;
    }

    if (!document.getElementById('prism-mini-stage')) {
      mountFullShell();
      return;
    }

    const focusSnap = capturePreservedFocus();

    const brandSub = document.getElementById('prism-brand-sub');
    if (brandSub) brandSub.textContent = tr('app.subtitle');

    const langBtn = document.getElementById('prism-lang-btn');
    if (langBtn) langBtn.textContent = `🌐 ${tr('app.langToggle')}`;

    updateTopStatusIndicators();
    updateLeftRailPanels();

    const tabsHost = document.getElementById('prism-tabs-bar');
    if (tabsHost) {
      const tabs = [
        { id: 'library', glyph: '❖', label: tr('tab.library') },
        { id: 'skin', glyph: '✦', label: tr('tab.skin') },
        { id: 'playback', glyph: '▶', label: tr('tab.playback') },
        { id: 'system', glyph: '⚙', label: tr('tab.system') },
      ];
      tabsHost.innerHTML = tabs
        .map(
          (tb) => `
        <button type="button" class="prism-tab-btn ${store.activeTab === tb.id ? 'is-active' : ''}"
                data-action="switch-tab" data-tab="${tb.id}">
          <span class="tab-glyph">${tb.glyph}</span>
          <span>${esc(tb.label)}</span>
        </button>
      `,
        )
        .join('');
    }

    const ws = document.querySelector('.prism-workspace');
    const prevWsScroll = ws ? ws.scrollTop : 0;
    const scroller = document.getElementById('prism-tab-scroll');
    const prevScroll = scroller ? scroller.scrollTop : 0;

    if (scroller) {
      scroller.innerHTML = renderActiveTabContentHtml();
      scroller.scrollTop = prevScroll;
      if (ws && prevWsScroll > 0) ws.scrollTop = prevWsScroll;
      attachLibraryThumbHoverController(scroller);
    }

    const drawerHost = document.getElementById('prism-drawer-host');
    if (drawerHost) {
      const prevDrawerScroll = drawerHost.querySelector('.prism-drawer-body')?.scrollTop || 0;
      drawerHost.innerHTML = renderDrawerHtml();
      const nextBody = drawerHost.querySelector('.prism-drawer-body');
      if (nextBody && prevDrawerScroll > 0) nextBody.scrollTop = prevDrawerScroll;
    }

    renderVisualEditorHost();
    renderUpdateReconnectOverlay();
    bindVirtualPickerScrollListeners();
    restorePreservedFocus(focusSnap);
    syncMiniPreviewMedia();
    syncOpticalCssVars();
    syncRegionBadgesInDom();
  }

  function mountFullShell() {
    const app = document.getElementById('app');
    if (!app) return;
    const eff = getEffectiveConfig();
    const skinAttr = store.skinEnabled ? 'true' : 'false';

    app.innerHTML = `
      <header class="prism-topbar">
        <div class="prism-brand">
          <span class="prism-brand-diamond" aria-hidden="true">◆</span>
          <div class="prism-brand-text">
            <span class="prism-brand-title">${esc(tr('app.title'))}</span>
            <span id="prism-brand-sub" class="prism-brand-sub">${esc(tr('app.subtitle'))}</span>
          </div>
        </div>
        <div class="prism-topbar-actions">
          ${renderSaveStatusPillHtml()}
          <button id="prism-master-toggle-btn" type="button" class="prism-master-toggle"
                  role="switch" aria-checked="${skinAttr}"
                  data-enabled="${skinAttr}"
                  data-action="toggle-skin-master"
                  title="${esc(getMasterToggleHint(store.skinEnabled))}">
            <span class="prism-master-toggle-dot"></span>
            <span id="prism-master-toggle-text">${esc(getMasterToggleLabel(store.skinEnabled))}</span>
          </button>
          <button id="prism-top-status-pill" type="button" class="prism-status-pill" data-status="standby"
                  data-action="switch-tab" data-tab="system">
            <span class="prism-status-dot"></span>
            <span id="prism-top-status-text">${esc(tr('status.standby'))}</span>
          </button>
          <button id="prism-lang-btn" type="button" class="prism-lang-btn" data-action="toggle-lang">
            🌐 ${esc(tr('app.langToggle'))}
          </button>
        </div>
      </header>
      <div id="prism-autostart-banner-host"></div>

      <div class="prism-workspace">
        <!-- Sticky 21:9 Live Workbench Island Mini-Preview & D8 Minimal Left Rail on >=840px -->
        <section class="prism-stage-dock prism-left-rail" aria-label="${esc(tr('preview.label'))}">
          <div class="prism-preview-card" data-skin-enabled="${skinAttr}">
            <div id="prism-mini-stage" class="prism-mini-stage prism-preview-stage" data-skin-enabled="${skinAttr}">
              <div id="mini-media-layer" class="mini-media-layer"></div>
              <div class="mini-blur-veil"></div>
              <div class="mini-scrim"></div>
              <div class="mini-vignette"></div>
              <div class="mini-grain"></div>

              <!-- Layer 5: Clickable Simulated Antigravity 2.0 Hub Islands -->
              <div id="prism-mini-hub" class="mini-hub-shell" data-layout="${esc(eff.layoutMode)}" data-topbar-style="${esc(eff.topbarStyle)}">
                <div class="mini-topbar">
                  <div class="mini-topbar-pill" data-jump-region="topbar" data-action="jump-to-region" data-region="topbar" title="${esc(tr('region.topbar'))}">
                    <span class="mini-bar" style="width:45%"></span>
                    <span class="mini-bar" style="width:28%"></span>
                  </div>
                  <div class="mini-wco-pill" data-jump-region="wco" data-action="jump-to-region" data-region="wco" title="${esc(tr('region.wco'))}">
                    <span></span><span></span><span></span>
                  </div>
                </div>

                <div class="mini-island mini-sidebar" data-jump-region="sidebar" data-action="jump-to-region" data-region="sidebar" title="${esc(tr('region.sidebar'))}">
                  <div class="mini-dots"><span></span><span></span><span></span></div>
                  <div class="mini-nav-row is-active"><span class="mini-bar" style="width:70%"></span></div>
                  <div class="mini-nav-row"><span class="mini-bar" style="width:52%"></span></div>
                  <div class="mini-nav-row"><span class="mini-bar" style="width:60%"></span></div>
                </div>

                <div class="mini-island mini-center" data-jump-region="workspace" data-action="jump-to-region" data-region="workspace" title="${esc(tr('region.workspace'))}">
                  <div class="mini-chat-flow">
                    <div class="mini-user-bubble" data-jump-region="userBubble" data-action="jump-to-region" data-region="userBubble" title="${esc(tr('region.userBubble'))}">
                      <span class="mini-bubble-line"></span>
                    </div>
                    <div class="mini-assistant-bubble" data-jump-region="assistantBubble" data-action="jump-to-region" data-region="assistantBubble" title="${esc(tr('region.assistantBubble'))}">
                      <div class="mini-turn-card">
                        <span class="mini-bubble-line"></span>
                      </div>
                    </div>
                    <div class="mini-code-card" data-jump-region="codeBlock" data-action="jump-to-region" data-region="codeBlock" title="${esc(tr('region.codeBlock'))}">
                      <div class="mini-code-head">
                        <span class="mini-code-lang">ts</span>
                        <div class="mini-ctl-seg" data-jump-region="controls" data-action="jump-to-region" data-region="controls" title="${esc(tr('region.controls'))}">
                          <span>Raw</span><span class="is-on">UI</span>
                        </div>
                      </div>
                      <div><span class="mini-code-kw">const</span> prism = <span class="mini-code-fn">glassSkin</span>({ mode: <span class="mini-code-str">'islands'</span> });</div>
                    </div>
                  </div>
                  <div class="mini-controls-strip" data-jump-region="controls" data-action="jump-to-region" data-region="controls" title="${esc(tr('region.controls'))}">
                    <span class="mini-ctl-btn">Apply</span>
                    <span class="mini-ctl-select">Model</span>
                    <span class="mini-scroll-pill">↓</span>
                  </div>
                  <div class="mini-composer" data-jump-region="composer" data-action="jump-to-region" data-region="composer" title="${esc(tr('region.composer'))}">
                    <div class="mini-composer-input">
                      <span class="mini-caret"></span>
                      <span>Ask Antigravity…</span>
                    </div>
                    <div class="mini-composer-right">
                      <span class="mini-prism-pill">◆ Prism</span>
                      <span class="mini-send-dot"></span>
                    </div>
                  </div>
                </div>

                <div class="mini-island mini-aux" data-jump-region="rightPane" data-action="jump-to-region" data-region="rightPane" title="${esc(tr('region.rightPane'))}">
                  <div class="mini-aux-tabs" data-jump-region="controls" data-action="jump-to-region" data-region="controls" title="${esc(tr('region.controls'))}">
                    <span class="mini-aux-tab is-active">Prism</span>
                    <span class="mini-aux-tab">UI</span>
                  </div>
                  <div class="mini-nav-row is-active"><span class="mini-bar" style="width:76%"></span></div>
                  <div class="mini-nav-row"><span class="mini-bar" style="width:64%"></span></div>
                  <div class="mini-standalone-card" data-jump-region="card" data-action="jump-to-region" data-region="card" title="${esc(tr('region.card'))}">
                    <span class="mini-bar" style="width:68%"></span>
                  </div>
                </div>
              </div>

              <!-- Layer 6: Skin Disabled Native Overlay (z-index: 6 < .mini-hud-badges z-index: 8) -->
              <div class="mini-disabled-overlay" aria-hidden="${store.skinEnabled ? 'true' : 'false'}">
                <span class="mini-disabled-label">${esc(tr('preview.disabledTitle'))}</span>
                <button type="button" class="prism-btn prism-btn-sm prism-btn-primary" data-action="enable-skin">
                  ${esc(tr('preview.disabledReenable'))}
                </button>
              </div>

              <!-- Layer 8: HUD Badges, Eco Live Media Toggle & Visual Editor Entry -->
              <div class="mini-hud-badges">
                <span id="mini-hud-layout" class="mini-hud-tag">ISLANDS · 8px</span>
                <span id="mini-hud-accent" class="mini-hud-tag">PRISM</span>
                <button id="mini-hud-live-btn" type="button" class="mini-hud-tag mini-hud-toggle-btn"
                        data-action="toggle-preview-live"
                        data-live="${eff.previewLiveMedia ? 'true' : 'false'}"
                        title="${esc(tr('preview.liveToggleHint'))}">
                  ${esc(eff.previewLiveMedia ? tr('preview.liveOn') : tr('preview.liveOff'))}
                </button>
                <button id="mini-hud-editor-btn" type="button" class="mini-hud-tag mini-hud-toggle-btn"
                        data-action="open-visual-editor"
                        title="${esc(tx('editorOpenModalHint'))}">
                  🎨 ${esc(tx('editorZoomEdit'))}
                </button>
              </div>
            </div>

            <div id="prism-transport-host" class="prism-transport-bar"></div>
          </div>

          <div id="prism-media-health-host"></div>
          <div id="prism-rail-extras" class="prism-rail-extras"></div>
        </section>

        <!-- Main 4-Tab Studio Deck -->
        <main class="prism-main-deck">
          <nav id="prism-tabs-bar" class="prism-tabs-bar" role="tablist"></nav>
          <div id="prism-tab-scroll" class="prism-tab-body"></div>
        </main>
      </div>

      <!-- All Overlays Strictly Inside #app.agy-prism-root with Non-<body> agy-prism-* Isolation Classes (#15) -->
      <div id="prism-visual-editor-host" class="agy-prism-visual-editor"></div>
      <div id="prism-drawer-host" class="agy-prism-drawer-host"></div>
      <div id="prism-update-reconnect-host" class="agy-prism-reconnect-host"></div>
      <div id="prism-drop-host" class="agy-prism-drop-host"></div>
      <div id="prism-toast-host" class="prism-toast-stack agy-prism-toast-stack"></div>

      <input id="prism-upload-input" type="file" hidden multiple
             accept=".jpg,.jpeg,.png,.webp,.gif,.bmp,.avif,.mp4,.webm,.mkv,.avi,.mov" />
      <input id="prism-preset-import-input" type="file" hidden accept=".json,application/json" />
      <input id="prism-intro-video-input" type="file" hidden accept="video/*,.mp4,.webm,.mov,.mkv,.m4v,.ogv" />
    `;

    app.dataset.prismReady = 'true';
    if (store.runtime.rootResizeObserver) {
      try {
        store.runtime.rootResizeObserver.observe(app);
      } catch {
        // ignore observer errors
      }
    }
    renderActiveSurface();

    // Virtual scroll + capture-phase <details data-region> toggle persistence on #prism-tab-scroll & .prism-workspace
    const scroller = document.getElementById('prism-tab-scroll');
    const ws = document.querySelector('.prism-workspace');
    let vScrollTicking = false;
    const scheduleLibraryVirtualRefresh = () => {
      if (store.activeTab !== 'library' || vScrollTicking) return;
      vScrollTicking = true;
      requestAnimationFrame(() => {
        vScrollTicking = false;
        const model = computeLibraryModel();
        if (model.visibleItems.length > VIRTUAL_SCROLL_THRESHOLD) {
          const nextWin = computeVirtualSlice(model.visibleItems.length);
          if (nextWin.start !== store.virtualWindow.start || nextWin.end !== store.virtualWindow.end) {
            const gridHost = document.getElementById('prism-lib-grid-host');
            if (gridHost) gridHost.innerHTML = renderLibraryGridHtml(model);
          }
        }
      });
    };
    if (ws) {
      ws.addEventListener('scroll', scheduleLibraryVirtualRefresh, { passive: true });
    }
    if (scroller) {
      scroller.addEventListener('scroll', scheduleLibraryVirtualRefresh, { passive: true });

      // Capture-phase toggle listener because `<details>` toggle event does NOT bubble
      scroller.addEventListener(
        'toggle',
        (ev) => {
          const det = ev.target;
          if (!(det instanceof HTMLDetailsElement)) return;
          const rid = det.dataset.region;
          if (!rid || (!REGION_UI_ORDER.includes(rid) && !REGION_IDS.includes(rid))) return;
          setRegionOpen(rid, det.open);
          const toggleAllBtn = document.querySelector('[data-action="toggle-all-regions"]');
          if (toggleAllBtn) {
            toggleAllBtn.textContent = hasAnyRegionOpen() ? tr('region.collapseAll') : tr('region.expandAll');
          }
        },
        true,
      );

      attachLibraryThumbHoverController(scroller);
    }

    // IntersectionObserver on #prism-mini-stage to pause preview media when scrolled off-screen
    const miniStage = document.getElementById('prism-mini-stage');
    if (miniStage && typeof window.IntersectionObserver === 'function') {
      try {
        if (store.runtime.miniStageObserver) {
          store.runtime.miniStageObserver.disconnect();
        }
        const io = new window.IntersectionObserver(
          (entries) => {
            const ent = entries[entries.length - 1];
            const inView = Boolean(ent && ent.isIntersecting);
            if (inView !== store.runtime.isMiniStageInViewport) {
              store.runtime.isMiniStageInViewport = inView;
              syncMiniPreviewMedia();
            }
          },
          { threshold: 0.05 },
        );
        io.observe(miniStage);
        store.runtime.miniStageObserver = io;
      } catch {
        store.runtime.isMiniStageInViewport = true;
      }
    }
  }

  // ==========================================================================
  // Domain Actions: Upload, Library, Wallpaper, Master Toggle, Snapshots, Update
  // ==========================================================================
  async function uploadFiles(fileList) {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    store.uploading = true;
    renderActiveSurface();

    for (const file of files) {
      if (file.size > MAX_UPLOAD_BYTES) {
        showToast(`${file.name}: ${tx('uploadTooLarge')}`, 'danger');
        continue;
      }
      try {
        const title = file.name.replace(/\.[^.]+$/, '');
        const qs = new URLSearchParams({ filename: file.name, title }).toString();
        const res = await apiFetch(`/api/upload?${qs}`, {
          method: 'POST',
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
          body: file,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || `Upload HTTP ${res.status}`);
        }
        if (data.duplicate) {
          showToast(tr('lib.duplicateToast'), 'warn', 4600);
        } else {
          showToast(tx('uploadDone'), 'ok');
        }
        if (data.item) {
          const idx = store.items.findIndex((x) => x.id === data.item.id);
          if (idx >= 0) store.items[idx] = data.item;
          else store.items.unshift(data.item);
          await applyWallpaperById(data.item.id);
        } else {
          await reloadLibrary(true);
        }
      } catch (err) {
        showToast(err.message || 'Upload failed', 'danger');
      }
    }

    store.uploading = false;
    renderActiveSurface();
  }

  async function uploadIntroVideoFile(file) {
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      showToast(`${file.name}: ${tx('uploadTooLarge')}`, 'danger');
      return;
    }
    store.introUploading = true;
    renderActiveSurface();
    try {
      const title = file.name.replace(/\.[^.]+$/, '');
      const qs = new URLSearchParams({ filename: file.name, title }).toString();
      const res = await apiFetch(`/api/intro/upload?${qs}`, {
        method: 'POST',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Intro upload HTTP ${res.status}`);
      }
      if (data.state) ingestServerState(data.state);
      if (data.introItem) store.introItem = data.introItem;
      showToast(tr('intro.uploadDone'), 'ok');
    } catch (err) {
      showToast(err.message || 'Intro upload failed', 'danger');
    } finally {
      store.introUploading = false;
      renderActiveSurface();
    }
  }

  async function reloadLibrary(refresh = true) {
    try {
      const data = await apiJson(`/api/library?refresh=${refresh ? 1 : 0}`);
      if (Array.isArray(data.items)) store.items = data.items;
      if (data.stats) store.stats = { ...store.stats, ...data.stats };
      renderActiveSurface();
    } catch (err) {
      showToast(err.message || 'Failed to load library', 'danger');
    }
  }

  let applyWallpaperSeq = 0;
  async function applyWallpaperById(wallpaperId, patch = undefined) {
    if (!wallpaperId) return;
    const seq = ++applyWallpaperSeq;
    const item = store.items.find((x) => x.id === wallpaperId);
    if (item) {
      store.activeItem = item;
      store.config = sanitizeConfig({ activeWallpaperId: wallpaperId, wallpaperId, kind: item.kind }, store.config);
      patchActiveCardsInPlace(wallpaperId);
      syncMiniPreviewMedia();
      updateLeftRailPanels();
      updateTopStatusIndicators();
    }
    try {
      const body = patch ? { wallpaperId, patch } : { wallpaperId };
      const res = await apiJson('/api/wallpaper/apply', { method: 'POST', body });
      if (seq !== applyWallpaperSeq) return;
      ingestServerState(res);
      const resolvedId = getActiveId();
      patchActiveCardsInPlace(resolvedId);
      syncMiniPreviewMedia();
      updateLeftRailPanels();
      updateTopStatusIndicators();
    } catch (err) {
      if (seq !== applyWallpaperSeq) return;
      showToast(err.message || 'Failed to apply wallpaper', 'danger');
    }
  }

  // #2 Coalescing Master Skin Toggle Queue (never drops rapid clicks; unified with exec-restore-host)
  async function executeSkinToggle(nextEnabled) {
    const targetEnabled = Boolean(nextEnabled);
    if (store.masterToggleBusy) {
      store.runtime.pendingToggleTarget = targetEnabled;
      return;
    }
    const prevEnabled = store.skinEnabled;
    store.masterToggleBusy = true;
    store.skinEnabled = targetEnabled;
    store.config = sanitizeConfig({ skinEnabled: targetEnabled }, store.config);
    updateTopStatusIndicators();
    syncOpticalCssVars();
    syncMiniPreviewMedia();
    updateLeftRailPanels();

    let succeeded = false;
    try {
      const res = await apiJson('/api/skin/toggle', {
        method: 'POST',
        body: { enabled: targetEnabled },
        timeoutMs: 8000,
      });
      succeeded = true;
      if (store.runtime.pendingToggleTarget === null || store.runtime.pendingToggleTarget === targetEnabled) {
        ingestServerState(res);
        if (typeof res?.skinEnabled === 'boolean' && typeof res?.state?.skinEnabled !== 'boolean') {
          store.skinEnabled = res.skinEnabled;
          store.config = sanitizeConfig({ skinEnabled: res.skinEnabled }, store.config);
        }
        if (targetEnabled && res?.state?.sessionAwake === undefined && res?.sessionAwake === undefined) {
          store.sessionAwake = true;
        }
      }
      showToast(
        store.skinEnabled ? tx('skinToggleToastOn') : tx('skinToggleToastOff'),
        store.skinEnabled ? 'ok' : 'info',
        3000,
      );
    } catch (err) {
      if (store.runtime.pendingToggleTarget === null || store.runtime.pendingToggleTarget === targetEnabled) {
        store.skinEnabled = prevEnabled;
        store.config = sanitizeConfig({ skinEnabled: prevEnabled }, store.config);
      }
      showToast(err.message || (targetEnabled ? 'Enable failed' : 'Disable failed'), 'danger');
    } finally {
      store.masterToggleBusy = false;
      const queued = store.runtime.pendingToggleTarget;
      store.runtime.pendingToggleTarget = null;
      syncOpticalCssVars();
      syncMiniPreviewMedia();
      updateLeftRailPanels();
      updateTopStatusIndicators();
      if (store.activeTab === 'system' || store.editorModalOpen || store.isPopoutMode) {
        renderActiveSurface();
      }
      if (store.skinEnabled) ensureStandbyStatusPoll();
      if (queued !== null && (!succeeded || queued !== store.skinEnabled)) {
        void executeSkinToggle(queued);
      }
    }
  }

  // D4 Named Snapshot Operations (protected by store.profileOpBusy mutex + surgical #prism-presets-grid updates)
  async function applyProfilePreset(presetId) {
    if (!presetId || store.profileOpBusy) return;
    store.profileOpBusy = true;
    refreshPresetsSurfacesSurgically();
    try {
      await flushConfigPatch({ flush: true });
      const res = await apiJson('/api/preset/apply', {
        method: 'POST',
        body: { presetId },
        timeoutMs: 8000,
      });
      ingestServerState(res, { forceConfig: true });
      if (Array.isArray(res.presets)) store.presets = res.presets;
      if (res.wallpaperFallback) {
        showToast(tr('preset.wallpaperMissingToast'), 'warn', 4400);
      }
      syncMiniPreviewMedia();
      syncOpticalCssVars();
      renderActiveSurface();
    } catch (err) {
      showToast(err.message || 'Failed to apply preset', 'danger');
    } finally {
      store.profileOpBusy = false;
      refreshPresetsSurfacesSurgically();
    }
  }

  async function saveNewProfilePreset() {
    if (store.profileOpBusy) return;
    const nameIn = document.getElementById('prism-preset-name-in');
    const descIn = document.getElementById('prism-preset-desc-in');
    const wallCb = document.getElementById('prism-preset-include-wall');
    if (nameIn instanceof HTMLInputElement) store.presetDraft.name = nameIn.value;
    if (descIn instanceof HTMLInputElement) store.presetDraft.description = descIn.value;
    if (wallCb instanceof HTMLInputElement) store.presetDraft.includeWallpaper = wallCb.checked;

    const userCount = getVisiblePresets().filter((p) => !p.builtin).length;
    const name = store.presetDraft.name.trim() || tr('preset.defaultNameFmt', { n: userCount + 1 });
    const description = store.presetDraft.description.trim();
    const includeWallpaper = Boolean(store.presetDraft.includeWallpaper);

    store.profileOpBusy = true;
    refreshPresetsSurfacesSurgically();
    try {
      await flushConfigPatch({ flush: true });
      const patch = buildSnapshotConfigPatch(includeWallpaper);
      const res = await apiJson('/api/presets/save', {
        method: 'POST',
        body: { name, description, patch, includeWallpaper, mode: 'create' },
        timeoutMs: 8000,
      });
      ingestServerState(res);
      if (Array.isArray(res.presets)) store.presets = res.presets;
      store.presetDraft = { name: '', description: '', includeWallpaper: false };
      if (nameIn instanceof HTMLInputElement) nameIn.value = '';
      if (descIn instanceof HTMLInputElement) descIn.value = '';
      if (wallCb instanceof HTMLInputElement) wallCb.checked = false;
      showToast(tx('presetSaved'), 'ok');
    } catch (err) {
      showToast(err.message || 'Failed to save preset', 'danger');
    } finally {
      store.profileOpBusy = false;
      refreshPresetsSurfacesSurgically();
    }
  }

  async function overwriteProfilePreset(presetId) {
    if (!presetId || store.profileOpBusy) return;
    const target = getVisiblePresets().find((p) => p.id === presetId);
    if (!target) return;
    if (target.builtin) {
      showToast(tr('preset.factoryReadOnly'), 'warn');
      return;
    }
    setArmedConfirm(null);
    store.profileOpBusy = true;
    refreshPresetsSurfacesSurgically();
    try {
      await flushConfigPatch({ flush: true });
      const includeWallpaper = Boolean(
        target.includesWallpaper ||
          target.includeWallpaper ||
          target.wallpaperId ||
          target.patch?.activeWallpaperId ||
          target.patch?.wallpaperId,
      );
      const patch = buildSnapshotConfigPatch(includeWallpaper);
      const res = await apiJson('/api/presets/save', {
        method: 'POST',
        body: {
          id: target.id,
          name: target.name,
          description: target.description || '',
          patch,
          includeWallpaper,
          mode: 'overwrite',
        },
        timeoutMs: 8000,
      });
      ingestServerState(res);
      if (Array.isArray(res.presets)) store.presets = res.presets;
      showToast(tr('preset.overwrittenToast'), 'ok');
    } catch (err) {
      showToast(err.message || 'Failed to overwrite preset', 'danger');
    } finally {
      store.profileOpBusy = false;
      refreshPresetsSurfacesSurgically();
    }
  }

  async function commitRenamePreset(presetId) {
    if (!presetId || store.profileOpBusy) return;
    const inEl = document.getElementById('prism-preset-rename-in');
    const nextName = (inEl instanceof HTMLInputElement ? inEl.value : store.presetRenameDraft || '').trim();
    if (!nextName) return;
    store.profileOpBusy = true;
    refreshPresetsSurfacesSurgically();
    try {
      const res = await apiJson('/api/presets/rename', {
        method: 'POST',
        body: { id: presetId, name: nextName },
        timeoutMs: 8000,
      });
      ingestServerState(res);
      if (Array.isArray(res.presets)) store.presets = res.presets;
      store.presetRenameTargetId = '';
      store.presetRenameDraft = '';
      showToast(tr('preset.renamedToast'), 'ok');
    } catch (err) {
      showToast(err.message || 'Rename preset failed', 'danger');
    } finally {
      store.profileOpBusy = false;
      refreshPresetsSurfacesSurgically();
    }
  }

  async function duplicateProfilePreset(presetId) {
    if (!presetId || store.profileOpBusy) return;
    store.profileOpBusy = true;
    refreshPresetsSurfacesSurgically();
    try {
      const res = await apiJson('/api/presets/duplicate', {
        method: 'POST',
        body: { id: presetId },
        timeoutMs: 8000,
      });
      ingestServerState(res);
      if (Array.isArray(res.presets)) store.presets = res.presets;
      showToast(tr('preset.duplicatedToast'), 'ok');
    } catch (err) {
      showToast(err.message || 'Duplicate preset failed', 'danger');
    } finally {
      store.profileOpBusy = false;
      refreshPresetsSurfacesSurgically();
    }
  }

  async function deleteProfilePreset(presetId) {
    if (!presetId || store.profileOpBusy) return;
    setArmedConfirm(null);
    store.profileOpBusy = true;
    refreshPresetsSurfacesSurgically();
    try {
      const res = await apiJson('/api/presets/delete', {
        method: 'POST',
        body: { id: presetId },
        timeoutMs: 8000,
      });
      ingestServerState(res);
      if (Array.isArray(res.presets)) store.presets = res.presets;
    } catch (err) {
      showToast(err.message || 'Delete preset failed', 'danger');
    } finally {
      store.profileOpBusy = false;
      refreshPresetsSurfacesSurgically();
    }
  }

  // Dual-Mode Visual Appearance Editor Actions
  async function closeVisualEditorModal() {
    if (!store.editorModalOpen) return;
    store.editorModalOpen = false;
    store.editorMode = store.isPopoutMode ? 'popout' : 'none';
    clearCanvasPanZoomBinding();
    const host = document.getElementById('prism-visual-editor-host');
    if (host) {
      releaseExistingPreviewVideo(host);
      host.innerHTML = '';
    }
    await flushConfigPatch({ flush: true, keepalive: true });
    renderActiveSurface();
  }

  async function openPopoutVisualEditor() {
    try {
      await flushConfigPatch({ flush: true, keepalive: true });
      const region = REGION_IDS.includes(store.selectedRegion) ? store.selectedRegion : 'sidebar';
      await apiJson('/api/studio/popout', {
        method: 'POST',
        body: { mode: 'visual-editor', region },
        timeoutMs: 8000,
      });
      showToast(tr('editor.popoutOpening'), 'ok', 3200);
    } catch (err) {
      showToast(err?.message || tr('editor.popoutFailed'), 'warn', 4800);
    }
  }

  function handleInspectorPicked(data) {
    const regionId = typeof data?.regionId === 'string' ? data.regionId.trim() : '';
    if (!regionId || !REGION_IDS.includes(regionId)) return;

    store.inspectorPicking = false;
    store.inspectorBusy = false;
    store.inspectorSessionId = '';
    store.inspectorTargetCount = 0;
    store.inspectorError = '';
    store.inspectorLastPicked = regionId;
    store.inspectorLastPickedAt = Date.now();
    store.selectedRegion = regionId;

    const accRid = mapPickerRegionToAccordionId(regionId);
    if (!store.isPopoutMode) {
      setRegionOpen(accRid, true);
      if (!store.editorModalOpen) {
        store.activeTab = 'skin';
      }
    }

    renderActiveSurface();

    if (store.isPopoutMode || store.editorModalOpen) {
      focusVisualEditorRegionInDom(regionId);
    } else if (store.activeTab === 'skin') {
      focusSkinRegionAccordionInDom(regionId);
    }

    showToast(tr('editor.pickHostPickedToast', { region: tr(`region.${regionId}`) }), 'ok', 2800);
  }

  function handleInspectorCancelled(data) {
    const reason = typeof data?.reason === 'string' ? data.reason.trim() : 'unknown';
    const wasPickingOrBusy = Boolean(store.inspectorPicking || store.inspectorBusy);
    store.inspectorPicking = false;
    store.inspectorBusy = false;
    store.inspectorSessionId = '';
    store.inspectorTargetCount = 0;
    if (wasPickingOrBusy) {
      renderActiveSurface();
    }
    if (reason !== 'restarted' && reason !== 'picked') {
      showToast(tr('editor.pickHostCancelledToast'), 'info', 2400);
    }
  }

  function handleInspectorStatus(data) {
    if (!data || typeof data !== 'object') return;
    const nextActive = Boolean(data.active);
    const nextTargetCount = Number(data.targetCount) || 0;
    const nextSessionId = String(data.sessionId || '');
    const changed =
      store.inspectorPicking !== nextActive ||
      store.inspectorTargetCount !== nextTargetCount ||
      store.inspectorSessionId !== nextSessionId ||
      store.inspectorBusy;
    store.inspectorPicking = nextActive;
    store.inspectorBusy = false;
    store.inspectorSessionId = nextSessionId;
    store.inspectorTargetCount = nextTargetCount;
    if (changed) {
      renderActiveSurface();
    }
  }

  // FS Browser, WE Properties & Auto-Update Actions
  async function openFsBrowser(kind) {
    const startPath =
      kind === 'uploadDir'
        ? store.config.uploadDir || ''
        : kind === 'cacheDir'
          ? store.config.cacheDir || ''
          : '';
    store.drawer = 'fs';
    store.fsBrowser = { ...store.fsBrowser, targetKind: kind, loading: true };
    renderActiveSurface();
    await browseFsPath(startPath);
  }

  async function browseFsPath(targetPath = '') {
    store.fsBrowser.loading = true;
    renderActiveSurface();
    try {
      const qs = targetPath ? `?path=${encodeURIComponent(targetPath)}` : '';
      const data = await apiJson(`/api/fs/browse${qs}`);
      store.fsBrowser = {
        ...store.fsBrowser,
        current: data.current || targetPath || '',
        parent: data.parent || '',
        quickRoots: Array.isArray(data.quickRoots) ? data.quickRoots : [],
        entries: Array.isArray(data.entries) ? data.entries : [],
        loading: false,
      };
    } catch (err) {
      store.fsBrowser.loading = false;
      showToast(err.message || 'Failed to browse directory', 'danger');
    }
    renderActiveSurface();
  }

  async function saveWePropUpdate(wallpaperId, propKey, newVal) {
    const prevForId = store.config.userProps?.[wallpaperId] || {};
    const nextProps = { ...prevForId, [propKey]: newVal };
    store.config = sanitizeConfig(
      { userProps: { ...(store.config.userProps || {}), [wallpaperId]: nextProps } },
      store.config,
    );
    renderActiveSurface();
    try {
      const res = await apiJson('/api/wallpaper/props', {
        method: 'POST',
        body: { wallpaperId, props: nextProps },
      });
      ingestServerState(res);
    } catch (err) {
      showToast(err.message || 'Failed to save wallpaper property', 'danger');
    }
  }

  async function fetchUpdateStatus(force = false) {
    if (store.update.checking) return;
    store.update.checking = true;
    if (force) store.update.error = '';
    updateTopStatusIndicators();
    if (store.activeTab === 'system') renderActiveSurface();

    try {
      const url = force ? '/api/update/status?force=1' : '/api/update/status';
      const data = await apiJson(url);
      ingestUpdateStatus(data, { fromBootstrap: false });
      if (
        force &&
        store.update.hasUpdate &&
        store.update.latestVersion &&
        store.update.dismissedVersion === store.update.latestVersion
      ) {
        store.update.dismissedVersion = '';
        try {
          window.localStorage?.removeItem('prism.dismissedUpdateVersion');
        } catch {
          // ignore storage restrictions
        }
      }
      if (force && !store.update.hasUpdate && !store.update.offline) {
        showToast(
          tr('update.upToDate', { version: store.update.currentVersion || store.version || PLUGIN_VERSION }),
          'ok',
          3200,
        );
      }
    } catch (err) {
      store.update.offline = true;
      store.update.checked = true;
      if (force) {
        showToast(err?.message || tr('update.offline'), 'warn', 3800);
      }
    } finally {
      store.update.checking = false;
      updateTopStatusIndicators();
      if (store.activeTab === 'system') renderActiveSurface();
    }
  }

  function startUpdateReconnectPolling(targetVersion = '') {
    const rt = store.runtime;
    if (rt.updateReconnectTimer) {
      clearTimeout(rt.updateReconnectTimer);
      rt.updateReconnectTimer = null;
    }
    disconnectStudioEvents();
    const rec = store.update.reconnect;
    rec.active = true;
    rec.targetVersion = targetVersion || store.update.latestVersion || '';
    rec.attempts = 0;
    rec.maxAttempts = 24;
    rec.sawDown = false;
    rec.timedOut = false;
    const prevPid = store.pid || 0;
    renderUpdateReconnectOverlay();

    const probeOnce = async () => {
      if (!store.update.reconnect.active) return;
      rec.attempts += 1;
      const progEl = document.getElementById('prism-update-reconnect-progress');
      if (progEl) progEl.textContent = `${rec.attempts} / ${rec.maxAttempts}`;
      const descEl = document.getElementById('prism-update-reconnect-desc');
      if (descEl) descEl.textContent = tr('update.restartingDesc', { attempts: Math.max(1, rec.attempts) });

      try {
        const res = await apiFetch('/api/healthz', { cache: 'no-store' });
        if (!res.ok) {
          rec.sawDown = true;
        } else {
          const data = await res.json().catch(() => null);
          const versionMatched = Boolean(rec.targetVersion && data?.version === rec.targetVersion);
          const pidChanged = Boolean(prevPid && data?.pid && data.pid !== prevPid);
          const recoveredAfterDrop = Boolean(data?.ok && rec.sawDown && rec.attempts >= 2);
          if (data?.ok && (versionMatched || pidChanged || recoveredAfterDrop)) {
            rt.updateReconnectTimer = null;
            window.location.reload();
            return;
          }
        }
      } catch {
        rec.sawDown = true;
      }

      if (rec.attempts >= rec.maxAttempts) {
        rt.updateReconnectTimer = null;
        rec.timedOut = true;
        renderUpdateReconnectOverlay();
        return;
      }
      rt.updateReconnectTimer = setTimeout(() => {
        void probeOnce();
      }, 900);
    };

    rt.updateReconnectTimer = setTimeout(() => {
      void probeOnce();
    }, 900);
  }

  async function executeApplyUpdate() {
    const u = store.update;
    if (u.applying || !u.canSelfUpdate) return;
    u.applying = true;
    u.error = '';
    u.standaloneRestartNeeded = false;
    updateTopStatusIndicators();
    if (store.activeTab === 'system') renderActiveSurface();

    try {
      const payload = {};
      if (u.latestTag) payload.targetTag = u.latestTag;
      if (u.latestVersion) payload.expectedVersion = u.latestVersion;
      const res = await apiJson('/api/update/apply', { method: 'POST', body: payload, timeoutMs: 30000 });
      u.applying = false;
      const toVer = res.updatedTo || res.toVersion || u.latestVersion || '';
      if (res.alreadyUpToDate) {
        u.hasUpdate = false;
        showToast(tr('update.upToDate', { version: u.currentVersion || store.version || PLUGIN_VERSION }), 'ok', 3400);
        updateTopStatusIndicators();
        if (store.activeTab === 'system') renderActiveSurface();
        return;
      }
      if (res.willRestart) {
        startUpdateReconnectPolling(toVer);
        return;
      }
      u.hasUpdate = false;
      u.standaloneRestartNeeded = true;
      showToast(tr('update.standaloneRestartHint'), 'ok', 5600);
      updateTopStatusIndicators();
      if (store.activeTab === 'system') renderActiveSurface();
    } catch (err) {
      u.applying = false;
      if (err?.code === 'ERR_GIT_DEV_CHECKOUT' || err?.code === 'ERR_SYMLINK_PLUGIN_ROOT') {
        u.canSelfUpdate = false;
        if (err.code === 'ERR_GIT_DEV_CHECKOUT') u.isGitCheckout = true;
        if (err.code === 'ERR_SYMLINK_PLUGIN_ROOT') u.isSymlink = true;
        u.error = err.code === 'ERR_GIT_DEV_CHECKOUT' ? tr('update.gitDevHint') : err?.message || tr('update.gitDevHint');
      } else {
        u.error = err?.message || String(err);
      }
      updateTopStatusIndicators();
      if (store.activeTab === 'system') renderActiveSurface();
    }
  }

  // ==========================================================================
  // Unified Region/Slider Patch Builder & Surgical In-Place WCAG Refresh
  // ==========================================================================
  function syncWcagBlocksInDom() {
    const blocks = document.querySelectorAll('.prism-color-wcag-block[data-region]');
    if (!blocks.length) return;
    const eff = getEffectiveConfig();
    const isLight = getResolvedPolarity(eff) === 'light';
    const tokens = resolveSchemeTokens(eff, isLight ? 'light' : 'dark');
    for (const block of blocks) {
      if (!(block instanceof HTMLElement)) continue;
      const rid = block.dataset.region;
      if (!rid || !REGION_IDS.includes(rid)) continue;
      const entry = eff.regions?.[rid] || {};
      const wcag = evaluateRegionFgContrast(rid, eff, tokens, isLight);
      const tpl = document.createElement('template');
      tpl.innerHTML = renderColorPickerWithWcag({
        key: `regions.${rid}.fontColor`,
        region: rid,
        label: '',
        value: entry.fontColor || '',
        allowRaw: Boolean(entry.allowRawFontColor),
        wcag,
        eff,
        tokens,
        isLight,
        showWcag: true,
        showAllowRaw: false,
        showCodeHint: false,
      });
      for (const old of block.querySelectorAll('.prism-wcag-row, .prism-low-opacity-hint')) {
        old.remove();
      }
      const anchor = block.querySelector('.prism-fg-color-top');
      const nextRow = tpl.content.querySelector('.prism-wcag-row');
      const nextHint = tpl.content.querySelector('.prism-low-opacity-hint');
      if (anchor) {
        if (nextHint) anchor.insertAdjacentElement('afterend', nextHint);
        if (nextRow) anchor.insertAdjacentElement('afterend', nextRow);
      } else {
        if (nextHint) block.prepend(nextHint);
        if (nextRow) block.prepend(nextRow);
      }
    }
  }

  function buildPatchForSliderKey(sliderKey, rawVal) {
    if (sliderKey === 'volume' && rawVal > 0 && getEffectiveConfig().muted) {
      return { volume: rawVal, muted: false, audioEnabled: true };
    }
    if (sliderKey === 'sidebarOpacity') {
      return { sidebarOpacity: rawVal, regions: { sidebar: { opacity: rawVal } } };
    }
    if (sliderKey === 'sidebarBlur') {
      const eff = getEffectiveConfig();
      const curStyle = resolveRegionEffectiveStyle('sidebar', eff.regions?.sidebar, eff);
      const regPatch = { blur: rawVal };
      if (rawVal > 0 && (curStyle === 'none' || curStyle === 'tinted' || curStyle === 'solid')) {
        regPatch.style = 'frosted';
      }
      return { sidebarBlur: rawVal, regions: { sidebar: regPatch } };
    }
    if (sliderKey === 'sidebarFontSize') {
      return { sidebarFontSize: rawVal, regions: { sidebar: { fontSize: rawVal } } };
    }
    if (sliderKey.startsWith('regions.')) {
      const [, rid, prop] = sliderKey.split('.');
      if (rid && prop && REGION_IDS.includes(rid)) {
        // F-05: Keep elevation float precision (0..2); round integer properties only.
        const val =
          prop === 'tone' || prop === 'blur' || prop === 'radius' || prop === 'fontSize' || prop === 'saturation'
            ? rawVal === null
              ? null
              : Math.round(rawVal)
            : rawVal;
        const regPatch = { [prop]: val };
        if (prop === 'blur' && typeof val === 'number' && val > 0) {
          const eff = getEffectiveConfig();
          const curStyle = resolveRegionEffectiveStyle(rid, eff.regions?.[rid], eff);
          if (curStyle === 'none' || curStyle === 'tinted' || curStyle === 'solid') {
            regPatch.style = 'frosted';
          }
        }
        const patch = { preset: 'custom', regions: { [rid]: regPatch } };
        const isPinned = hasPerWallpaperPin(getActiveId());
        if (rid === 'sidebar' && prop === 'radius') {
          if (!isPinned) patch.leftSidebarRadius = val === null ? 'auto' : String(val);
        } else if (rid === 'rightPane' && prop === 'radius') {
          if (!isPinned) patch.rightSidebarRadius = val === null ? 'auto' : String(val);
        } else if (rid === 'sidebar' && prop === 'opacity') {
          patch.sidebarOpacity = val;
        } else if (rid === 'sidebar' && prop === 'blur') {
          patch.sidebarBlur = val;
        } else if (rid === 'sidebar' && prop === 'fontSize') {
          patch.sidebarFontSize = val;
        }
        return patch;
      }
    }
    if (sliderKey.startsWith('surfaceTints.')) {
      const [, comp, prop = 'opacity'] = sliderKey.split('.');
      if (comp && REGION_IDS.includes(comp)) {
        return { preset: 'custom', regions: { [comp]: { [prop]: rawVal } } };
      }
    }
    return { [sliderKey]: rawVal };
  }

  // ==========================================================================
  // Delegated Event Listeners (Anti-Swallow Guard, IME Guard, Zero Leaks)
  // ==========================================================================
  function attachEventDelegation() {
    if (delegationBound) return;
    const app = document.getElementById('app');
    if (!app) return;
    delegationBound = true;

    const releasePointerHold = () => {
      const rt = store.runtime;
      if (rt.pointerHoldSafetyTimer) {
        clearTimeout(rt.pointerHoldSafetyTimer);
        rt.pointerHoldSafetyTimer = null;
      }
      if (!rt.pointerDownInsideScroller) return;
      rt.pointerDownInsideScroller = false;
      if (rt.deferredExternalSnapshot) {
        const snap = rt.deferredExternalSnapshot;
        rt.deferredExternalSnapshot = null;
        // Delay to next macrotask so current click event dispatches cleanly before any DOM update!
        setTimeout(() => {
          applyExternalStateSnapshot(snap);
        }, 0);
      }
    };

    app.addEventListener('pointerdown', (e) => {
      if (
        e.target instanceof Element &&
        e.target.closest('#prism-tab-scroll, .prism-drawer, #prism-visual-editor-host')
      ) {
        const rt = store.runtime;
        rt.pointerDownInsideScroller = true;
        if (rt.pointerHoldSafetyTimer) clearTimeout(rt.pointerHoldSafetyTimer);
        rt.pointerHoldSafetyTimer = setTimeout(releasePointerHold, 5000);
      }
    });
    window.addEventListener('pointerup', releasePointerHold);
    window.addEventListener('pointercancel', releasePointerHold);
    window.addEventListener('blur', releasePointerHold);

    app.addEventListener('compositionstart', () => {
      store.runtime.imeComposing = true;
    });
    app.addEventListener('compositionend', () => {
      store.runtime.imeComposing = false;
      if (store.runtime.deferredExternalSnapshot) {
        const snap = store.runtime.deferredExternalSnapshot;
        store.runtime.deferredExternalSnapshot = null;
        setTimeout(() => applyExternalStateSnapshot(snap), 0);
      }
    });

    // 1. Live <16ms Input / Slider Dragging
    app.addEventListener('input', (e) => {
      const tEl = e.target;
      if (!(tEl instanceof HTMLElement)) return;

      if (tEl.id === 'prism-lib-search' && tEl instanceof HTMLInputElement) {
        store.searchQuery = tEl.value;
        const gridHost = document.getElementById('prism-lib-grid-host');
        if (gridHost) gridHost.innerHTML = renderLibraryGridHtml();
        return;
      }
      if (tEl.id === 'prism-preset-name-in' && tEl instanceof HTMLInputElement) {
        store.presetDraft.name = tEl.value;
        return;
      }
      if (tEl.id === 'prism-preset-desc-in' && tEl instanceof HTMLInputElement) {
        store.presetDraft.description = tEl.value;
        return;
      }
      if (tEl.id === 'prism-preset-rename-in' && tEl instanceof HTMLInputElement) {
        store.presetRenameDraft = tEl.value;
        return;
      }
      if (tEl.id === 'prism-pl-name-in' && tEl instanceof HTMLInputElement) {
        store.playlistDraft.name = tEl.value;
        return;
      }
      if (tEl.id === 'prism-fs-path-in' && tEl instanceof HTMLInputElement) {
        store.fsBrowser.manualPath = tEl.value;
        store.fsBrowser.current = tEl.value;
        return;
      }

      const sliderKey = tEl.dataset.configSlider;
      if (sliderKey && tEl instanceof HTMLInputElement) {
        const min = Number(tEl.min);
        const max = Number(tEl.max);
        const uiVal = Number(tEl.value);
        const pct = max > min ? ((uiVal - min) / (max - min)) * 100 : 0;
        tEl.style.setProperty('--prism-pct', `${pct.toFixed(1)}%`);

        if (tEl.dataset.inlineVol === 'true') {
          const vNorm = Math.round(uiVal) / 100;
          const patch =
            vNorm > 0 && getEffectiveConfig().muted
              ? { volume: vNorm, muted: false, audioEnabled: true }
              : { volume: vNorm };
          syncPairedSlidersInDom('volume', vNorm, tEl);
          queueConfigPatch(patch, false);
          return;
        }

        const row = tEl.closest('.prism-slider-row');
        const scale = Number(row?.dataset.scale || 1);
        const decimals = Number(row?.dataset.decimals || 0);
        const suffix = row?.dataset.suffix || '';
        const defRaw = Number(row?.dataset.default ?? 0);
        const rawVal = uiVal / scale;

        if (row) {
          const valSpan = row.querySelector('.prism-slider-val');
          if (valSpan) {
            valSpan.textContent = `${decimals > 0 ? uiVal.toFixed(decimals) : Math.round(uiVal)}${suffix}`;
          }
          row.dataset.dirty =
            row.dataset.nullable === 'true' ? 'true' : Math.abs(rawVal - defRaw) > 0.001 ? 'true' : 'false';
        }
        if (sliderKey === 'liveBootDelay') {
          const delayHint = document.getElementById('prism-boot-delay-hint');
          if (delayHint) {
            delayHint.textContent = tr('host.liveBootDelayHint', { sec: rawVal.toFixed(1) });
          }
        }

        syncPairedSlidersInDom(sliderKey, rawVal, tEl);
        const patch = buildPatchForSliderKey(sliderKey, rawVal);
        queueConfigPatch(patch, false, sliderKey !== 'liveBootDelay');
        if (patch?.regions) {
          for (const [changedRid, changedEntry] of Object.entries(patch.regions)) {
            if (changedEntry && typeof changedEntry === 'object' && 'style' in changedEntry) {
              syncRegionStyleControlsInDom(changedRid);
            }
          }
        }
        syncRegionBadgesInDom();
        if (
          sliderKey === 'sidebarOpacity' ||
          sliderKey === 'glassOpacity' ||
          sliderKey === 'glassFidelity' ||
          sliderKey === 'chatGlassFidelity' ||
          sliderKey.endsWith('.opacity') ||
          sliderKey.endsWith('.tone')
        ) {
          syncWcagBlocksInDom();
        }

        if (sliderKey === 'glassOpacity' || sliderKey === 'glassBlur') {
          syncNullableFollowersInDom(sliderKey, rawVal);
          if (sliderKey === 'glassBlur') {
            const roundedPx = Math.round(rawVal);
            document.querySelectorAll('.prism-blur-stop-chip').forEach((chip) => {
              if (chip instanceof HTMLElement && chip.dataset.action === 'set-num') {
                chip.classList.toggle('is-active', Number(chip.dataset.val) === roundedPx);
              }
            });
          }
        }
        return;
      }

      const weSliderKey = tEl.dataset.weSlider;
      if (weSliderKey && tEl instanceof HTMLInputElement) {
        const min = Number(tEl.min);
        const max = Number(tEl.max);
        const v = Number(tEl.value);
        const pct = max > min ? ((v - min) / (max - min)) * 100 : 0;
        tEl.style.setProperty('--prism-pct', `${pct.toFixed(1)}%`);
        const row = tEl.closest('.prism-slider-row');
        const valSpan = row?.querySelector('.prism-slider-val');
        if (valSpan) valSpan.textContent = Number(tEl.step) < 1 ? v.toFixed(2) : String(Math.round(v));
      }
    });

    // 2. Commit on `change` (sliders, color pickers, selects, checkboxes, file inputs)
    app.addEventListener('change', async (e) => {
      const tEl = e.target;
      if (!(tEl instanceof HTMLElement)) return;

      if (tEl.id === 'prism-preset-include-wall' && tEl instanceof HTMLInputElement) {
        store.presetDraft.includeWallpaper = tEl.checked;
        return;
      }

      if (tEl.dataset.configSlider) {
        const sk = tEl.dataset.configSlider;
        const affectsWcag =
          sk === 'sidebarOpacity' ||
          sk === 'glassOpacity' ||
          sk === 'glassFidelity' ||
          sk === 'chatGlassFidelity' ||
          sk.endsWith('.opacity') ||
          sk.endsWith('.tone');
        if (affectsWcag) syncWcagBlocksInDom();
        void flushConfigPatch().finally(() => {
          if (affectsWcag) syncWcagBlocksInDom();
        });
        return;
      }

      if (tEl.id === 'prism-upload-input' && tEl instanceof HTMLInputElement) {
        await uploadFiles(tEl.files);
        tEl.value = '';
        return;
      }

      if (tEl.id === 'prism-intro-video-input' && tEl instanceof HTMLInputElement) {
        const file = tEl.files?.[0];
        tEl.value = '';
        if (file) await uploadIntroVideoFile(file);
        return;
      }

      if (tEl.id === 'prism-preset-import-input' && tEl instanceof HTMLInputElement) {
        const file = tEl.files?.[0];
        tEl.value = '';
        if (!file || store.profileOpBusy) return;
        store.profileOpBusy = true;
        refreshPresetsSurfacesSurgically();
        try {
          const text = await file.text();
          const preset = JSON.parse(text);
          const res = await apiJson('/api/presets/import', { method: 'POST', body: { preset } });
          ingestServerState(res);
          if (Array.isArray(res.presets)) store.presets = res.presets;
          showToast(tx('presetImported'), 'ok');
        } catch (err) {
          showToast(err.message || 'Invalid preset JSON', 'danger');
        } finally {
          store.profileOpBusy = false;
          refreshPresetsSurfacesSurgically();
        }
        return;
      }

      if (tEl.dataset.action === 'quick-switch-profile-preset' && tEl instanceof HTMLSelectElement) {
        if (tEl.value) await applyProfilePreset(tEl.value);
        return;
      }

      if (tEl.dataset.action === 'set-color-key' && tEl instanceof HTMLInputElement) {
        const key = tEl.dataset.key;
        if (key) {
          queueConfigPatch({ [key]: tEl.value }, true);
          renderActiveSurface();
        }
        return;
      }

      if (tEl.dataset.action === 'set-region-color' && tEl instanceof HTMLInputElement) {
        const rid = tEl.dataset.region;
        const prop = tEl.dataset.prop || 'tint';
        if (rid && REGION_IDS.includes(rid) && /^#[0-9a-f]{6}$/i.test(tEl.value)) {
          queueConfigPatch({ preset: 'custom', regions: { [rid]: { [prop]: tEl.value.toUpperCase() } } }, true, true);
          renderActiveSurface();
        }
        return;
      }

      if (tEl.dataset.action === 'select-region-font-preset' && tEl instanceof HTMLSelectElement) {
        const rid = tEl.dataset.region;
        const preset = CJK_SAFE_FONT_PRESETS.find((p) => p.id === tEl.value);
        if (rid && REGION_IDS.includes(rid) && preset) {
          queueConfigPatch({ regions: { [rid]: { fontFamily: preset.value } } }, true, true);
          renderActiveSurface();
        }
        return;
      }

      if (tEl.dataset.action === 'select-global-font-preset' && tEl instanceof HTMLSelectElement) {
        const preset = CJK_SAFE_FONT_PRESETS.find((p) => p.id === tEl.value);
        if (preset) {
          queueConfigPatch({ globalFontFamily: preset.value }, true, true);
          renderActiveSurface();
        }
        return;
      }

      if (tEl.dataset.action === 'set-region-font-family' && tEl instanceof HTMLInputElement) {
        const rid = tEl.dataset.region;
        if (rid && REGION_IDS.includes(rid)) {
          const raw = tEl.value.trim();
          const clean = sanitizeFontFamily(raw);
          if (raw && !clean) showToast(tx('fontInvalidHint'), 'warn', 3200);
          queueConfigPatch({ regions: { [rid]: { fontFamily: clean } } }, true, true);
          renderActiveSurface();
        }
        return;
      }

      if (tEl.dataset.action === 'set-global-font-family' && tEl instanceof HTMLInputElement) {
        const raw = tEl.value.trim();
        const clean = sanitizeFontFamily(raw);
        if (raw && !clean) showToast(tx('fontInvalidHint'), 'warn', 3200);
        queueConfigPatch({ globalFontFamily: clean }, true, true);
        renderActiveSurface();
        return;
      }

      if (tEl.dataset.action === 'select-enum' && tEl instanceof HTMLSelectElement) {
        const key = tEl.dataset.key;
        if (key) {
          queueConfigPatch({ [key]: tEl.value }, true);
          renderActiveSurface();
        }
        return;
      }

      if (tEl.dataset.action === 'change-rot-interval' && tEl instanceof HTMLInputElement) {
        const v = Math.max(1, Math.min(1440, Math.round(Number(tEl.value) || 15)));
        queueConfigPatch({ rotationInterval: v }, true);
        renderActiveSurface();
        return;
      }

      if (tEl.dataset.weSlider && tEl instanceof HTMLInputElement) {
        const wid = tEl.dataset.wid;
        const prop = tEl.dataset.weSlider;
        if (wid && prop) await saveWePropUpdate(wid, prop, Number(tEl.value));
        return;
      }

      if (tEl.dataset.action === 'we-prop-color' && tEl instanceof HTMLInputElement) {
        const wid = tEl.dataset.wid;
        const prop = tEl.dataset.prop;
        const val = tEl.dataset.origFmt === 'hex' ? tEl.value : hexToWeColor(tEl.value);
        if (wid && prop) await saveWePropUpdate(wid, prop, val);
        return;
      }

      if (tEl.dataset.action === 'we-prop-combo' && tEl instanceof HTMLSelectElement) {
        const wid = tEl.dataset.wid;
        const prop = tEl.dataset.prop;
        const item = store.items.find((x) => x.id === wid);
        const pDef = normalizeWeProperties(item?.properties).find((x) => x.key === prop);
        const opt = pDef?.options?.[Number(tEl.value)];
        if (wid && prop && opt !== undefined) {
          await saveWePropUpdate(wid, prop, opt.value);
        }
        return;
      }

      if (tEl.dataset.action === 'we-prop-text' && tEl instanceof HTMLInputElement) {
        const wid = tEl.dataset.wid;
        const prop = tEl.dataset.prop;
        if (wid && prop) await saveWePropUpdate(wid, prop, tEl.value);
      }
    });

    // 3. Double-Click Framing Reset (`layerPosX/Y/Scale` -> 50/50/100)
    app.addEventListener('dblclick', (e) => {
      const tEl = e.target;
      if (!(tEl instanceof HTMLElement)) return;
      const dblTarget = tEl.closest('[data-dblreset="true"]');
      if (dblTarget) {
        e.preventDefault();
        queueConfigPatch({ layerPosX: 50, layerPosY: 50, layerScale: 100 }, true);
        renderActiveSurface();
      }
    });

    // 4. Primary Click Dispatcher
    app.addEventListener('click', async (e) => {
      const tEl = e.target;
      if (!(tEl instanceof HTMLElement)) return;
      const actEl = tEl.closest('[data-action]');
      if (!actEl) return;
      const action = actEl.dataset.action;

      if (actEl.closest('.prism-card-top-right') && action !== 'card-click') {
        e.stopPropagation();
      }

      switch (action) {
        case 'toggle-lang': {
          const nextLang = curLocale() === 'zh' ? 'en' : 'zh';
          queueConfigPatch({ language: nextLang }, true, false);
          renderActiveSurface();
          break;
        }
        case 'toggle-skin-master': {
          const baseEnabled =
            store.runtime.pendingToggleTarget !== null ? store.runtime.pendingToggleTarget : store.skinEnabled;
          await executeSkinToggle(!baseEnabled);
          break;
        }
        case 'retry-config-flush': {
          void flushConfigPatch({ flush: true });
          break;
        }
        case 'toggle-preview-live': {
          // Strictly toggles Studio 21:9 preview live media; NEVER touches host `paused`!
          const nextLive = !getEffectiveConfig().previewLiveMedia;
          queueConfigPatch({ previewLiveMedia: nextLive }, true, false);
          syncMiniPreviewMedia();
          syncOpticalCssVars();
          if (store.activeTab === 'system') renderActiveSurface();
          break;
        }
        case 'jump-to-region': {
          e.stopPropagation();
          const rawRid = actEl.dataset.region || 'sidebar';
          const accRid = mapPickerRegionToAccordionId(rawRid);
          store.activeTab = 'skin';
          setRegionOpen(accRid, true);
          renderActiveSurface();
          focusSkinRegionAccordionInDom(rawRid);
          break;
        }
        case 'pick-host-region': {
          await startInspectorPick();
          break;
        }
        case 'cancel-host-pick': {
          await cancelInspectorPick('studio-cancel');
          break;
        }
        case 'open-visual-editor': {
          const rid = actEl.dataset.region;
          if (rid && REGION_IDS.includes(rid)) {
            store.selectedRegion = rid;
          }
          store.editorModalOpen = true;
          store.editorMode = 'modal';
          renderVisualEditorHost();
          syncMiniPreviewMedia();
          syncOpticalCssVars();
          break;
        }
        case 'close-visual-editor': {
          await closeVisualEditorModal();
          break;
        }
        case 'popout-visual-editor': {
          await openPopoutVisualEditor();
          break;
        }
        case 'select-editor-region': {
          e.stopPropagation();
          const rid = actEl.dataset.region;
          if (rid && REGION_IDS.includes(rid)) {
            store.selectedRegion = rid;
            if (store.isPopoutMode) {
              renderActiveSurface();
            } else {
              renderVisualEditorHost();
              syncMiniPreviewMedia();
              syncOpticalCssVars();
            }
          }
          break;
        }
        case 've-set-preview-theme': {
          const val = actEl.dataset.val;
          if (val === 'dark' || val === 'light') {
            store.canvasPreviewTheme = store.canvasPreviewTheme === val ? null : val;
            if (store.isPopoutMode) {
              renderActiveSurface();
            } else {
              renderVisualEditorHost();
              syncOpticalCssVars();
            }
          }
          break;
        }
        case 've-toggle-popover': {
          store.canvasShowPopover = !store.canvasShowPopover;
          if (store.isPopoutMode) renderActiveSurface();
          else {
            renderVisualEditorHost();
            syncOpticalCssVars();
          }
          break;
        }
        case 've-toggle-welcome': {
          store.canvasShowEmptyLogo = !store.canvasShowEmptyLogo;
          if (store.isPopoutMode) renderActiveSurface();
          else {
            renderVisualEditorHost();
            syncOpticalCssVars();
          }
          break;
        }
        case 've-zoom-in': {
          store.canvasZoom = Math.min(2.0, Math.round(((store.canvasZoom || 1) + 0.15) * 100) / 100);
          syncVisualCanvasZoomTransform();
          break;
        }
        case 've-zoom-out': {
          store.canvasZoom = Math.max(0.5, Math.round(((store.canvasZoom || 1) - 0.15) * 100) / 100);
          syncVisualCanvasZoomTransform();
          break;
        }
        case 've-zoom-reset': {
          store.canvasZoom = 1;
          store.canvasPanX = 0;
          store.canvasPanY = 0;
          syncVisualCanvasZoomTransform();
          break;
        }
        case 'switch-tab': {
          const tab = actEl.dataset.tab;
          if (tab && tab !== store.activeTab) {
            resetLibraryHoverThumb();
            store.activeTab = tab;
            renderActiveSurface();
            const sc = document.getElementById('prism-tab-scroll');
            if (sc) sc.scrollTop = 0;
          }
          break;
        }
        case 'toggle-all-regions': {
          setAllRegionsOpen(!hasAnyRegionOpen());
          renderActiveSurface();
          break;
        }
        case 'edit-slider-val': {
          const row = actEl.closest('.prism-slider-row');
          const rangeEl = row?.querySelector('input.prism-range');
          if (!row || !(rangeEl instanceof HTMLInputElement)) return;
          const scale = Number(row.dataset.scale || 1);
          const min = Number(row.dataset.min);
          const max = Number(row.dataset.max);
          const curNum = Number(rangeEl.value);

          const numIn = document.createElement('input');
          numIn.type = 'text';
          numIn.className = 'prism-slider-num-input';
          numIn.value = String(Math.round(curNum * 100) / 100);
          actEl.replaceWith(numIn);
          numIn.focus();
          numIn.select();

          let committed = false;
          const commit = (applyChange) => {
            if (committed) return;
            committed = true;
            if (applyChange) {
              const key = row.dataset.sliderKey || '';
              const rawTxt = numIn.value.trim();
              if (row.dataset.nullable === 'true' && (rawTxt === '' || rawTxt.toLowerCase() === 'auto')) {
                if (key) {
                  queueConfigPatch(buildPatchForSliderKey(key, null), true, true);
                }
              } else {
                const numStr = rawTxt.replace(/[^0-9.-]/g, '');
                const parsed = numStr === '' ? NaN : Number(numStr);
                if (Number.isFinite(parsed) && key) {
                  const clampedUi = Math.max(min, Math.min(max, parsed));
                  const rawVal = clampedUi / scale;
                  queueConfigPatch(buildPatchForSliderKey(key, rawVal), true, true);
                }
              }
            }
            renderActiveSurface();
          };

          numIn.addEventListener('keydown', (ke) => {
            if (ke.key === 'Enter') {
              ke.preventDefault();
              commit(true);
            } else if (ke.key === 'Escape') {
              ke.preventDefault();
              commit(false);
            }
          });
          numIn.addEventListener('blur', () => commit(true));
          break;
        }
        case 'reset-key': {
          const key = actEl.dataset.key;
          if (key === 'sidebarOpacity') {
            queueConfigPatch({ sidebarOpacity: null, regions: { sidebar: { opacity: null } } }, true, true);
            renderActiveSurface();
          } else if (key === 'sidebarBlur') {
            queueConfigPatch({ sidebarBlur: null, regions: { sidebar: { blur: null } } }, true, true);
            renderActiveSurface();
          } else if (key === 'sidebarFontSize') {
            queueConfigPatch({ sidebarFontSize: null, regions: { sidebar: { fontSize: null } } }, true, true);
            renderActiveSurface();
          } else if (key === 'globalFontSize') {
            queueConfigPatch({ globalFontSize: null }, true, true);
            renderActiveSurface();
          } else if (key && key in DEFAULT_CONFIG) {
            queueConfigPatch({ [key]: DEFAULT_CONFIG[key] }, true);
            renderActiveSurface();
          }
          break;
        }
        case 'reset-region': {
          // DEF-SE-2: Groups 1-7 <summary> reset button; preventDefault + stopPropagation keeps <details> state intact!
          e.preventDefault();
          e.stopPropagation();
          const rid = actEl.dataset.region;
          if (!rid || !REGION_IDS.includes(rid)) break;
          const regionsPatch = rid === 'workspace' ? { workspace: null, card: null } : { [rid]: null };
          const rawExtra = REGION_RESET_EXTRA_KEYS[rid] || {};
          const isPinned = hasPerWallpaperPin(getActiveId());
          const extra = isPinned
            ? Object.fromEntries(Object.entries(rawExtra).filter(([k]) => PER_WALLPAPER_OVERRIDE_KEYS.includes(k)))
            : rawExtra;
          queueConfigPatch({ regions: regionsPatch, ...extra }, true, true);
          renderActiveSurface();
          break;
        }
        case 'reset-all-regions': {
          queueConfigPatch(
            { regions: null, surfaceTints: null, sidebarOpacity: null, sidebarBlur: null, sidebarFontSize: null },
            true,
            true,
          );
          renderActiveSurface();
          break;
        }
        case 'reset-region-prop': {
          const rid = actEl.dataset.region;
          const prop = actEl.dataset.prop;
          if (!rid || !prop || !REGION_IDS.includes(rid)) break;
          const resetVal = prop === 'tone' ? 0 : prop === 'tint' || prop === 'fontFamily' || prop === 'fontColor' ? '' : prop === 'allowRawFontColor' ? false : null;
          const patch = { regions: { [rid]: { [prop]: resetVal } } };
          const isPinned = hasPerWallpaperPin(getActiveId());
          if (rid === 'sidebar' && prop === 'radius' && !isPinned) patch.leftSidebarRadius = 'auto';
          if (rid === 'rightPane' && prop === 'radius' && !isPinned) patch.rightSidebarRadius = 'auto';
          if (rid === 'sidebar' && prop === 'opacity') patch.sidebarOpacity = null;
          if (rid === 'sidebar' && prop === 'blur') patch.sidebarBlur = null;
          if (rid === 'sidebar' && prop === 'fontSize') patch.sidebarFontSize = null;
          queueConfigPatch(patch, true, true);
          renderActiveSurface();
          break;
        }
        case 'clear-region-prop': {
          const rid = actEl.dataset.region;
          const prop = actEl.dataset.prop;
          if (rid && prop && REGION_IDS.includes(rid)) {
            queueConfigPatch({ regions: { [rid]: { [prop]: '' } } }, true, true);
            renderActiveSurface();
          }
          break;
        }
        case 'set-region-prop': {
          const rid = actEl.dataset.region;
          const prop = actEl.dataset.prop;
          const val = actEl.dataset.val;
          if (!rid || !prop || !REGION_IDS.includes(rid)) break;
          let parsedVal = val;
          if (prop === 'glassEnabled') {
            parsedVal = val === 'true' ? true : val === 'false' ? false : null;
          } else if (prop === 'borderStyle' || prop === 'style') {
            parsedVal = val === 'auto' || !val ? null : val;
          }
          const regPatch = { [prop]: parsedVal };
          const patch = { preset: 'custom', regions: { [rid]: regPatch } };
          if (prop === 'style' && (parsedVal === 'frosted' || parsedVal === 'crystal')) {
            const curEntry = getEffectiveConfig().regions?.[rid];
            if (curEntry && curEntry.blur === 0) {
              regPatch.blur = null;
              if (rid === 'sidebar') patch.sidebarBlur = null;
            }
          }
          queueConfigPatch(patch, true, true);
          renderActiveSurface();
          break;
        }
        case 'pick-region-tint':
        case 'pick-surface-tint': {
          const rid = actEl.dataset.region || actEl.dataset.comp;
          const hex = actEl.dataset.hex;
          if (rid && REGION_IDS.includes(rid) && hex && /^#[0-9a-f]{6}$/i.test(hex)) {
            queueConfigPatch({ preset: 'custom', regions: { [rid]: { tint: hex.toUpperCase() } } }, true, true);
            renderActiveSurface();
          }
          break;
        }
        case 'toggle-region-raw-fg': {
          const rid = actEl.dataset.region;
          if (rid && REGION_IDS.includes(rid)) {
            const cur = Boolean(getEffectiveConfig().regions?.[rid]?.allowRawFontColor);
            queueConfigPatch({ regions: { [rid]: { allowRawFontColor: !cur } } }, true, true);
            renderActiveSurface();
          }
          break;
        }
        case 'reset-surface-comp': {
          const comp = actEl.dataset.comp;
          if (comp && REGION_IDS.includes(comp)) {
            const patch =
              comp === 'sidebar'
                ? { preset: 'custom', sidebarOpacity: null, regions: { sidebar: { opacity: null } } }
                : { preset: 'custom', regions: { [comp]: { opacity: null } } };
            queueConfigPatch(patch, true, true);
            renderActiveSurface();
          }
          break;
        }
        case 'reset-module': {
          // DEF-SE-2: Group 8 (`global`) & Tab 3 sections; preventDefault + stopPropagation preserves <details.open>!
          e.preventDefault();
          e.stopPropagation();
          const keys = (actEl.dataset.keys || '').split(',').filter(Boolean);
          const patch = {};
          for (const k of keys) {
            if (k === 'sidebarOpacity' || k === 'sidebarBlur' || k === 'sidebarFontSize' || k === 'globalFontSize') {
              patch[k] = null;
            } else if (k === 'surfaceTints') {
              patch.surfaceTints = null;
              store.expandedTintComp = '';
            } else if (k === 'regions') {
              patch.regions = null;
            } else if (k in DEFAULT_CONFIG) {
              patch[k] = DEFAULT_CONFIG[k];
            }
          }
          if (Object.keys(patch).length > 0) {
            queueConfigPatch(patch, true);
            renderActiveSurface();
          }
          break;
        }
        case 'apply-low-gpu-acrylic': {
          queueConfigPatch({ glassSurfaces: true, glassBlur: 0, sidebarBlur: null, preset: 'custom' }, true, true);
          renderActiveSurface();
          break;
        }
        case 'resume-paused-wallpaper': {
          queueConfigPatch({ paused: false }, true, false);
          syncMiniPreviewMedia();
          renderActiveSurface();
          break;
        }
        case 'retry-wallpaper-media': {
          const aid = getActiveId();
          if (aid) await applyWallpaperById(aid);
          break;
        }
        case 'toggle-bool': {
          const key = actEl.dataset.key;
          if (!key) return;
          const eff = getEffectiveConfig();
          queueConfigPatch(
            { [key]: !eff[key] },
            true,
            key !== 'rotationEnabled' &&
              key !== 'themeFollow' &&
              key !== 'transparentWindowControls' &&
              key !== 'hideWelcomeLogo',
          );
          renderActiveSurface();
          break;
        }
        case 'set-enum': {
          const key = actEl.dataset.key;
          const val = actEl.dataset.val ?? '';
          if (!key) return;
          const numCandidate = key === 'fpsCap' || key === 'sceneLiveFps' ? Number(val) : val;
          const isPinned = hasPerWallpaperPin(getActiveId());
          let patch;
          if (key === 'leftSidebarRadius' || key === 'rightSidebarRadius') {
            const rid = key === 'leftSidebarRadius' ? 'sidebar' : 'rightPane';
            const parsedNum = val === 'auto' || val === 'native' || val === '' ? null : Number(val);
            patch = {
              preset: 'custom',
              regions: { [rid]: { radius: Number.isFinite(parsedNum) ? parsedNum : null } },
            };
            if (!isPinned) {
              patch[key] = val;
            }
          } else if (key === 'codeReadabilityMode') {
            patch = { [key]: numCandidate, regions: { codeBlock: { style: null } } };
          } else {
            patch =
              key === 'layoutMode' || key === 'colorScheme'
                ? { [key]: numCandidate, preset: 'custom' }
                : { [key]: numCandidate };
          }
          queueConfigPatch(
            patch,
            true,
            key !== 'triggerMode' &&
              key !== 'rotationOrder' &&
              key !== 'rotationTrigger' &&
              key !== 'startupMode' &&
              key !== 'topbarStyle' &&
              key !== 'libraryAnimatedThumbs',
          );
          renderActiveSurface();
          break;
        }
        case 'set-num': {
          const key = actEl.dataset.key;
          const val = Number(actEl.dataset.val);
          if (key && Number.isFinite(val)) {
            queueConfigPatch({ [key]: val }, true, key !== 'rotationInterval');
            renderActiveSurface();
          }
          break;
        }
        case 'apply-scene-preset': {
          const pid = actEl.dataset.preset;
          const sp = SCENE_PRESETS[pid];
          if (sp) {
            const activeId = getActiveId();
            if (!hasPerWallpaperPin(activeId)) {
              applyLocalPatch({ ...sp.patch, skinEnabled: true }, false);
              renderActiveSurface();
              try {
                await flushConfigPatch({ flush: true });
                const res = await apiJson('/api/preset/apply', { method: 'POST', body: { presetId: pid } });
                ingestServerState(res, { forceConfig: true });
                syncMiniPreviewMedia();
                renderActiveSurface();
              } catch {
                queueConfigPatch({ ...sp.patch, skinEnabled: true }, true);
                renderActiveSurface();
              }
            } else {
              queueConfigPatch({ ...sp.patch, skinEnabled: true }, true);
              renderActiveSurface();
            }
          }
          break;
        }
        case 'toggle-pin-override':
        case 'toggle-pin-for': {
          const wid = actEl.dataset.id || getActiveId();
          if (!wid) return;
          const nextMap = { ...(store.config.perWallpaperOverrides || {}) };
          if (nextMap[wid] && Object.keys(nextMap[wid]).length > 0) {
            delete nextMap[wid];
          } else {
            const eff = getEffectiveConfig();
            const snap = {};
            for (const k of PER_WALLPAPER_OVERRIDE_KEYS) {
              snap[k] = eff[k];
            }
            nextMap[wid] = snap;
          }
          queueConfigPatch({ perWallpaperOverrides: nextMap }, true, false);
          renderActiveSurface();
          break;
        }
        case 'toggle-pause': {
          const eff = getEffectiveConfig();
          queueConfigPatch({ paused: !eff.paused }, true, false);
          syncMiniPreviewMedia();
          renderActiveSurface();
          break;
        }
        case 'toggle-mute': {
          const eff = getEffectiveConfig();
          const nextMuted = !eff.muted;
          const nextVol = !nextMuted && (!eff.volume || eff.volume <= 0) ? 0.5 : eff.volume;
          queueConfigPatch({ muted: nextMuted, audioEnabled: !nextMuted, volume: nextVol }, true);
          renderActiveSurface();
          break;
        }
        case 'quick-rot-mode': {
          const mode = actEl.dataset.mode || 'off';
          if (mode === 'off') {
            queueConfigPatch({ rotationEnabled: false }, true, false);
          } else if (mode === 'videoEnd') {
            queueConfigPatch({ rotationEnabled: true, rotationTrigger: 'videoEnd' }, true, false);
          } else if (mode === 'sequence') {
            queueConfigPatch({ rotationEnabled: true, rotationOrder: 'sequence', rotationTrigger: 'interval' }, true, false);
          } else {
            queueConfigPatch({ rotationEnabled: true, rotationOrder: 'random', rotationTrigger: 'interval' }, true, false);
          }
          updateLeftRailPanels();
          if (store.activeTab === 'playback') renderActiveSurface();
          break;
        }
        case 'step-playlist': {
          const dir = Number(actEl.dataset.dir) === -1 ? -1 : 1;
          try {
            const res = await apiJson('/api/playlist/step', { method: 'POST', body: { direction: dir, reason: 'manual' } });
            ingestServerState(res);
            patchActiveCardsInPlace(getActiveId());
            syncMiniPreviewMedia();
            updateLeftRailPanels();
          } catch (err) {
            showToast(err.message || 'Step playlist failed', 'danger');
          }
          break;
        }

        // Library Actions
        case 'clear-search': {
          store.searchQuery = '';
          renderActiveSurface();
          break;
        }
        case 'set-lib-scope': {
          store.libScope = actEl.dataset.scope || 'all';
          renderActiveSurface();
          break;
        }
        case 'toggle-density': {
          const nextLayout = store.config.pickerLayout === 'fixed' ? 'classic' : 'fixed';
          queueConfigPatch({ pickerLayout: nextLayout }, true, false);
          renderActiveSurface();
          break;
        }
        case 'toggle-batch': {
          store.batchMode = !store.batchMode;
          store.batchSelected.clear();
          renderActiveSurface();
          break;
        }
        case 'batch-hide': {
          if (store.batchSelected.size === 0) return;
          const merged = Array.from(new Set([...(store.config.hiddenIds || []), ...store.batchSelected]));
          store.batchSelected.clear();
          store.batchMode = false;
          queueConfigPatch({ hiddenIds: merged }, true, false);
          renderActiveSurface();
          break;
        }
        case 'batch-to-playlist': {
          const picked = new Set(store.batchSelected);
          if (picked.size < 2) {
            showToast(tx('playlistNeedTwo'), 'warn');
            return;
          }
          store.playlistDraft = {
            editingId: '',
            name: `Playlist ${(store.config.rotationGroups || []).length + 1}`,
            order: store.config.rotationOrder || 'random',
            trigger: store.config.rotationTrigger || 'interval',
            interval: store.config.rotationInterval || 15,
            pickedIds: picked,
          };
          store.batchMode = false;
          store.batchSelected.clear();
          store.drawer = 'playlist';
          renderActiveSurface();
          break;
        }
        case 'toggle-kind-chip': {
          const k = actEl.dataset.kind;
          if (!k) return;
          const cur = new Set(store.config.typeFilter?.length ? store.config.typeFilter : LIBRARY_KINDS);
          if (cur.has(k)) {
            if (cur.size <= 1) {
              showToast(tx('nonEmptyGuard'), 'warn');
              return;
            }
            cur.delete(k);
          } else {
            cur.add(k);
          }
          queueConfigPatch({ typeFilter: Array.from(cur) }, true, false);
          renderActiveSurface();
          break;
        }
        case 'toggle-rating-chip': {
          const r = actEl.dataset.rating;
          if (!r) return;
          const cur = new Set(store.config.contentRatingFilter?.length ? store.config.contentRatingFilter : CONTENT_RATINGS);
          if (cur.has(r)) {
            if (cur.size <= 1) {
              showToast(tx('nonEmptyGuard'), 'warn');
              return;
            }
            cur.delete(r);
          } else {
            cur.add(r);
          }
          queueConfigPatch({ contentRatingFilter: Array.from(cur) }, true, false);
          renderActiveSurface();
          break;
        }
        case 'card-click': {
          const id = actEl.dataset.id;
          if (!id) return;
          if (store.batchMode) {
            if (store.batchSelected.has(id)) store.batchSelected.delete(id);
            else store.batchSelected.add(id);
            renderActiveSurface();
          } else {
            await applyWallpaperById(id);
          }
          break;
        }
        case 'apply-wallpaper': {
          const id = actEl.dataset.id;
          if (id) {
            store.drawer = null;
            await applyWallpaperById(id);
          }
          break;
        }
        case 'toggle-fav': {
          const id = actEl.dataset.id;
          if (!id) return;
          const favs = new Set(store.config.favorites || []);
          if (favs.has(id)) favs.delete(id);
          else favs.add(id);
          queueConfigPatch({ favorites: Array.from(favs) }, true, false);
          renderActiveSurface();
          break;
        }
        case 'hide-item': {
          const id = actEl.dataset.id;
          if (!id) return;
          const hidden = Array.from(new Set([...(store.config.hiddenIds || []), id]));
          queueConfigPatch({ hiddenIds: hidden }, true, false);
          renderActiveSurface();
          break;
        }
        case 'unhide-item': {
          const id = actEl.dataset.id;
          if (!id) return;
          const hidden = (store.config.hiddenIds || []).filter((x) => x !== id);
          queueConfigPatch({ hiddenIds: hidden }, true, false);
          renderActiveSurface();
          break;
        }
        case 'unhide-all': {
          queueConfigPatch({ hiddenIds: [] }, true, false);
          renderActiveSurface();
          break;
        }
        case 'trigger-upload': {
          document.getElementById('prism-upload-input')?.click();
          break;
        }
        case 'trigger-intro-upload': {
          document.getElementById('prism-intro-video-input')?.click();
          break;
        }
        case 'clear-intro-video': {
          try {
            const res = await apiJson('/api/intro/clear', { method: 'POST', body: {} });
            if (res?.state) ingestServerState(res.state);
            store.introItem = null;
            showToast(tr('intro.cleared'), 'ok');
          } catch (err) {
            showToast(err.message || 'Clear failed', 'danger');
          }
          renderActiveSurface();
          break;
        }
        case 'pick-intro-wallpaper': {
          const wid = actEl.dataset.id || '';
          if (!wid) break;
          queueConfigPatch({ introSourceMode: 'wallpaper', introWallpaperId: wid }, true, false);
          renderActiveSurface();
          break;
        }
        case 'use-active-intro-wallpaper': {
          const activeId = getActiveId();
          if (!activeId) {
            showToast(tr('intro.previewNeedMedia'), 'warn');
            break;
          }
          queueConfigPatch({ introSourceMode: 'wallpaper', introWallpaperId: activeId }, true, false);
          renderActiveSurface();
          break;
        }
        case 'toggle-intro-all-kinds': {
          store.introShowAllKinds = !store.introShowAllKinds;
          renderActiveSurface();
          break;
        }
        case 'preview-intro': {
          try {
            const res = await apiJson('/api/intro/preview', { method: 'POST', body: {} });
            if (res?.state) ingestServerState(res.state);
            showToast(tr('intro.previewSent'), 'ok');
          } catch (err) {
            showToast(err.message || tr('intro.previewNeedMedia'), 'warn');
          }
          break;
        }
        case 'refresh-library': {
          await reloadLibrary(true);
          break;
        }

        // Drawers & Playlist CRUD
        case 'open-presets-create': {
          store.drawer = 'presets';
          renderActiveSurface();
          const nameIn = document.getElementById('prism-preset-name-in');
          if (nameIn instanceof HTMLInputElement) nameIn.focus();
          break;
        }
        case 'open-drawer': {
          const dr = actEl.dataset.drawer;
          if (dr === 'playlist' && !store.playlistDraft.name) {
            const firstGrp = (store.config.rotationGroups || [])[0];
            store.playlistDraft = firstGrp
              ? {
                  editingId: firstGrp.id,
                  name: firstGrp.name,
                  order: firstGrp.order,
                  trigger: firstGrp.trigger,
                  interval: firstGrp.interval,
                  pickedIds: new Set(firstGrp.wallpaperIds),
                }
              : {
                  editingId: '',
                  name: 'My Prism Playlist',
                  order: store.config.rotationOrder || 'random',
                  trigger: store.config.rotationTrigger || 'interval',
                  interval: store.config.rotationInterval || 15,
                  pickedIds: new Set(store.items.slice(0, 4).map((x) => x.id)),
                };
          }
          store.drawer = dr || null;
          renderActiveSurface();
          break;
        }
        case 'open-inspector': {
          const id = actEl.dataset.id || getActiveId() || store.items[0]?.id || '';
          if (!id) return;
          store.inspectWallpaperId = id;
          store.drawer = 'inspector';
          renderActiveSurface();
          break;
        }
        case 'backdrop-close':
          if (e.target !== actEl) return;
          // fall through
        case 'close-drawer': {
          store.drawer = null;
          store.presetRenameTargetId = '';
          store.presetRenameDraft = '';
          renderActiveSurface();
          break;
        }
        case 'new-playlist-draft': {
          store.playlistDraft = {
            editingId: '',
            name: `Playlist ${(store.config.rotationGroups || []).length + 1}`,
            order: store.config.rotationOrder || 'random',
            trigger: store.config.rotationTrigger || 'interval',
            interval: store.config.rotationInterval || 15,
            pickedIds: new Set(),
          };
          renderActiveSurface();
          break;
        }
        case 'edit-playlist': {
          const gid = actEl.dataset.id;
          const g = (store.config.rotationGroups || []).find((x) => x.id === gid);
          if (g) {
            store.playlistDraft = {
              editingId: g.id,
              name: g.name,
              order: g.order,
              trigger: g.trigger,
              interval: g.interval,
              pickedIds: new Set(g.wallpaperIds),
            };
            renderActiveSurface();
          }
          break;
        }
        case 'toggle-pl-pick': {
          const id = actEl.dataset.id;
          if (!id) return;
          if (store.playlistDraft.pickedIds.has(id)) store.playlistDraft.pickedIds.delete(id);
          else store.playlistDraft.pickedIds.add(id);
          renderActiveSurface();
          break;
        }
        case 'pl-pick-all': {
          for (const it of computeLibraryModel().visibleItems) {
            store.playlistDraft.pickedIds.add(it.id);
          }
          renderActiveSurface();
          break;
        }
        case 'pl-pick-clear': {
          store.playlistDraft.pickedIds.clear();
          renderActiveSurface();
          break;
        }
        case 'save-playlist-draft': {
          const ids = Array.from(store.playlistDraft.pickedIds);
          if (ids.length < 2) {
            showToast(tx('playlistNeedTwo'), 'warn');
            return;
          }
          const gid = store.playlistDraft.editingId || `pl-${Date.now().toString(36)}`;
          const entry = {
            id: gid,
            name: store.playlistDraft.name.trim() || 'Playlist',
            wallpaperIds: ids,
            order: store.config.rotationOrder || 'random',
            trigger: store.config.rotationTrigger || 'interval',
            interval: store.config.rotationInterval || 15,
          };
          const groups = [...(store.config.rotationGroups || [])];
          const idx = groups.findIndex((x) => x.id === gid);
          if (idx >= 0) groups[idx] = entry;
          else groups.push(entry);

          queueConfigPatch({ rotationGroups: groups, rotationGroupId: gid, rotationEnabled: true }, true, false);
          showToast(tx('playlistSaved'), 'ok');
          renderActiveSurface();
          break;
        }
        case 'activate-playlist': {
          const gid = actEl.dataset.id;
          if (gid) {
            queueConfigPatch({ rotationGroupId: gid, rotationEnabled: true }, true, false);
            renderActiveSurface();
          }
          break;
        }
        case 'delete-playlist': {
          const gid = actEl.dataset.payload;
          setArmedConfirm(null);
          const groups = (store.config.rotationGroups || []).filter((x) => x.id !== gid);
          const nextActive = store.config.rotationGroupId === gid ? groups[0]?.id || '' : store.config.rotationGroupId;
          queueConfigPatch({ rotationGroups: groups, rotationGroupId: nextActive }, true, false);
          renderActiveSurface();
          break;
        }
        case 'import-we-playlist': {
          const wsItems = computeLibraryModel().visibleItems.filter((x) => x.source === 'workshop');
          const seedItems = wsItems.length >= 2 ? wsItems : computeLibraryModel().visibleItems;
          if (seedItems.length < 2) {
            showToast(tx('playlistNeedTwo'), 'warn');
            return;
          }
          const gid = `we-import-${Date.now().toString(36)}`;
          const groups = [
            ...(store.config.rotationGroups || []),
            {
              id: gid,
              name: 'WE Workshop Rotation',
              wallpaperIds: seedItems.slice(0, 60).map((x) => x.id),
              order: 'random',
              trigger: 'interval',
              interval: 15,
            },
          ];
          queueConfigPatch({ rotationGroups: groups, rotationGroupId: gid, rotationEnabled: true }, true, false);
          showToast(tx('playlistSaved'), 'ok');
          renderActiveSurface();
          break;
        }

        // WE Properties Click Actions
        case 'we-prop-bool': {
          const wid = actEl.dataset.wid;
          const prop = actEl.dataset.prop;
          if (!wid || !prop) return;
          const item = store.items.find((x) => x.id === wid);
          const pDef = normalizeWeProperties(item?.properties).find((x) => x.key === prop);
          const cur = store.config.userProps?.[wid]?.[prop] ?? pDef?.defaultValue ?? false;
          await saveWePropUpdate(wid, prop, !cur);
          break;
        }
        case 'we-prop-reset': {
          const wid = actEl.dataset.wid;
          const prop = actEl.dataset.prop;
          const item = store.items.find((x) => x.id === wid);
          const pDef = normalizeWeProperties(item?.properties).find((x) => x.key === prop);
          if (wid && prop && pDef) {
            await saveWePropUpdate(wid, prop, pDef.defaultValue);
          }
          break;
        }

        // Named Snapshots CRUD (D4)
        case 'apply-profile-preset': {
          await applyProfilePreset(actEl.dataset.id);
          break;
        }
        case 'save-profile-preset': {
          await saveNewProfilePreset();
          break;
        }
        case 'overwrite-profile-preset': {
          await overwriteProfilePreset(actEl.dataset.id || actEl.dataset.payload);
          break;
        }
        case 'start-rename-preset': {
          const id = actEl.dataset.id;
          const target = getVisiblePresets().find((p) => p.id === id);
          if (target && !target.builtin) {
            store.presetRenameTargetId = target.id;
            store.presetRenameDraft = curLocale() === 'zh' ? target.name : target.nameEn || target.name;
            refreshPresetsSurfacesSurgically();
            const renameEl = document.getElementById('prism-preset-rename-in');
            if (renameEl instanceof HTMLInputElement) {
              renameEl.focus();
              renameEl.select();
            }
          }
          break;
        }
        case 'cancel-rename-preset': {
          store.presetRenameTargetId = '';
          store.presetRenameDraft = '';
          refreshPresetsSurfacesSurgically();
          break;
        }
        case 'commit-rename-preset': {
          await commitRenamePreset(actEl.dataset.id);
          break;
        }
        case 'duplicate-profile-preset': {
          await duplicateProfilePreset(actEl.dataset.id);
          break;
        }
        case 'export-profile-preset': {
          const id = actEl.dataset.id;
          if (!id) return;
          try {
            const data = await apiJson(`/api/presets/export?id=${encodeURIComponent(id)}`);
            const blob = new Blob([JSON.stringify(data.preset || data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            store.runtime.tempObjectUrls.add(url);
            const a = document.createElement('a');
            a.href = url;
            a.download = `prism-preset-${id}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => {
              try {
                URL.revokeObjectURL(url);
              } catch {
                // ignore revoke error
              }
              store.runtime.tempObjectUrls.delete(url);
            }, 1500);
          } catch (err) {
            showToast(err.message || 'Export failed', 'danger');
          }
          break;
        }
        case 'trigger-preset-import': {
          e.preventDefault();
          document.getElementById('prism-preset-import-input')?.click();
          break;
        }
        case 'delete-profile-preset': {
          await deleteProfilePreset(actEl.dataset.payload || actEl.dataset.id);
          break;
        }

        // Host, Shortcut, Storage & 2-Step Confirmations
        case 'arm-confirm': {
          setArmedConfirm(actEl.dataset.confirmKey || null);
          break;
        }
        case 'cancel-confirm': {
          setArmedConfirm(null);
          break;
        }
        case 'remove-upload': {
          const wid = actEl.dataset.payload;
          setArmedConfirm(null);
          if (!wid) return;
          try {
            const res = await apiJson('/api/upload/remove', { method: 'POST', body: { wallpaperId: wid } });
            if (Array.isArray(res.items)) store.items = res.items;
            else store.items = store.items.filter((x) => x.id !== wid);
            store.drawer = null;
            renderActiveSurface();
          } catch (err) {
            showToast(err.message || 'Remove upload failed', 'danger');
          }
          break;
        }
        case 'open-fs-browser': {
          await openFsBrowser(actEl.dataset.kind || 'uploadDir');
          break;
        }
        case 'fs-nav': {
          await browseFsPath(actEl.dataset.path || '');
          break;
        }
        case 'fs-jump-input': {
          const pathIn = document.getElementById('prism-fs-path-in');
          if (pathIn instanceof HTMLInputElement) {
            await browseFsPath(pathIn.value.trim());
          }
          break;
        }
        case 'fs-confirm-select': {
          const pathIn = document.getElementById('prism-fs-path-in');
          const chosen = (pathIn instanceof HTMLInputElement ? pathIn.value.trim() : '') || store.fsBrowser.current;
          if (!chosen) return;
          try {
            const res = await apiJson('/api/storage/dir', {
              method: 'POST',
              body: { kind: store.fsBrowser.targetKind, path: chosen },
            });
            ingestServerState(res);
            store.drawer = null;
            await reloadLibrary(true);
          } catch (err) {
            showToast(err.message || 'Failed to update folder', 'danger');
          }
          break;
        }
        case 'remove-custom-folder': {
          const path = actEl.dataset.payload;
          setArmedConfirm(null);
          if (!path) return;
          try {
            const res = await apiJson('/api/storage/dir', {
              method: 'POST',
              body: { kind: 'removeCustomFolder', path },
            });
            ingestServerState(res);
            await reloadLibrary(true);
          } catch (err) {
            showToast(err.message || 'Failed to remove folder', 'danger');
          }
          break;
        }
        case 'set-autostart':
        case 'exec-disable-autostart': {
          const enabled = action === 'exec-disable-autostart' ? false : actEl.dataset.enabled === 'true';
          setArmedConfirm(null);
          store.autostart.busy = true;
          renderActiveSurface();
          try {
            const port = store.config.debugPort || DEFAULT_DEBUG_PORT;
            const res = await apiJson('/api/host/autostart', { method: 'POST', body: { enabled, port } });
            ingestServerState(res);
            store.autostart.busy = false;
            showToast(tr(enabled ? 'host.autostartEnabledToast' : 'host.autostartDisabledToast'), enabled ? 'ok' : 'info', 5200);
            renderActiveSurface();
          } catch (err) {
            store.autostart.busy = false;
            showToast(err.message || 'Autostart update failed', 'danger');
            renderActiveSurface();
          }
          break;
        }
        case 'refresh-autostart': {
          try {
            const res = await apiJson('/api/host/autostart?refresh=1');
            ingestServerState(res);
            renderActiveSurface();
          } catch (err) {
            showToast(err.message || 'Autostart check failed', 'danger');
          }
          break;
        }
        case 'dismiss-autostart-banner': {
          store.autostart.bannerDismissed = true;
          updateTopStatusIndicators();
          break;
        }
        case 'create-shortcut': {
          try {
            const port = store.config.debugPort || DEFAULT_DEBUG_PORT;
            const res = await apiJson('/api/host/shortcut', { method: 'POST', body: { port } });
            showToast(`${tr('host.shortcutCreated')}${res.shortcutPath ? ` (${res.shortcutPath})` : ''}`, 'ok', 5500);
          } catch (err) {
            showToast(err.message || 'Shortcut creation failed', 'danger');
          }
          break;
        }
        case 'enable-skin': {
          await executeSkinToggle(true);
          break;
        }
        case 'wake-skin': {
          store.wakeBusy = true;
          renderActiveSurface();
          try {
            const res = await apiJson('/api/skin/wake', { method: 'POST', body: {} });
            ingestServerState(res);
            store.sessionAwake = true;
            store.skinEnabled = true;
            store.wakeBusy = false;
            showToast(tr('host.wakeSuccessToast'), 'ok', 4200);
            renderActiveSurface();
            ensureStandbyStatusPoll();
          } catch (err) {
            store.wakeBusy = false;
            showToast(err.message || 'Wake failed', 'danger');
            renderActiveSurface();
          }
          break;
        }
        case 'reset-canary': {
          store.canaryBusy = true;
          renderActiveSurface();
          try {
            const res = await apiJson('/api/canary/reset', { method: 'POST', body: {} });
            ingestServerState(res);
            if (!res?.canary && !res?.state?.canary) {
              store.canary = { ...store.canary, state: 'idle', trippedReason: '' };
            }
            store.sessionAwake = true;
            store.skinEnabled = true;
            store.canaryBusy = false;
            showToast(tr('canary.resetToast'), 'ok', 4500);
            renderActiveSurface();
            ensureStandbyStatusPoll();
          } catch (err) {
            store.canaryBusy = false;
            showToast(err.message || 'Canary reset failed', 'danger');
            renderActiveSurface();
          }
          break;
        }
        case 'refresh-status': {
          try {
            const st = await apiJson('/api/status');
            ingestServerState(st);
            renderActiveSurface();
          } catch (err) {
            showToast(err.message || 'Status poll failed', 'danger');
          }
          break;
        }
        case 'exec-reset-scope': {
          const scope = actEl.dataset.payload || 'all';
          setArmedConfirm(null);
          try {
            const res = await apiJson('/api/config/reset', { method: 'POST', body: { scope } });
            ingestServerState(res, { forceConfig: true });
            syncMiniPreviewMedia();
            renderActiveSurface();
          } catch (err) {
            showToast(err.message || 'Reset failed', 'danger');
          }
          break;
        }
        case 'exec-restore-host': {
          // #2 Unified through executeSkinToggle(false) — never bypasses masterToggleBusy or preview sync!
          setArmedConfirm(null);
          await executeSkinToggle(false);
          break;
        }
        case 'check-update': {
          await fetchUpdateStatus(true);
          break;
        }
        case 'apply-update': {
          await executeApplyUpdate();
          break;
        }
        case 'toggle-update-notes': {
          store.update.notesOpen = !store.update.notesOpen;
          updateTopStatusIndicators();
          if (store.activeTab === 'system') renderActiveSurface();
          break;
        }
        case 'dismiss-update-banner': {
          store.update.dismissedVersion = store.update.latestVersion || 'dismissed';
          store.update.error = '';
          store.update.standaloneRestartNeeded = false;
          try {
            if (store.update.latestVersion) {
              window.localStorage?.setItem('prism.dismissedUpdateVersion', store.update.latestVersion);
            }
          } catch {
            // ignore storage restrictions
          }
          updateTopStatusIndicators();
          break;
        }
        case 'reload-studio-pane': {
          window.location.reload();
          break;
        }
        case 'retry-update-reconnect': {
          startUpdateReconnectPolling(store.update.reconnect.targetVersion || store.update.latestVersion || '');
          break;
        }
        case 'close-update-reconnect': {
          if (store.runtime.updateReconnectTimer) {
            clearTimeout(store.runtime.updateReconnectTimer);
            store.runtime.updateReconnectTimer = null;
          }
          store.update.reconnect.active = false;
          renderUpdateReconnectOverlay();
          connectStudioEvents();
          break;
        }
        default:
          break;
      }
    });

    // 5. Keyboard Shortcuts: Rename Enter/Esc, Visual Editor Esc, Drawer Esc, `/` search
    window.addEventListener('keydown', (e) => {
      const activeEl = document.activeElement;
      if (activeEl instanceof HTMLInputElement && activeEl.id === 'prism-preset-rename-in') {
        if (e.key === 'Enter') {
          e.preventDefault();
          const pid = activeEl.dataset.presetId || store.presetRenameTargetId;
          if (pid) void commitRenamePreset(pid);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          store.presetRenameTargetId = '';
          store.presetRenameDraft = '';
          refreshPresetsSurfacesSurgically();
          return;
        }
      }

      if (e.key === 'Escape') {
        if (store.inspectorPicking) {
          e.preventDefault();
          void cancelInspectorPick('escape');
          return;
        }
        if (store.armedConfirm) {
          e.preventDefault();
          setArmedConfirm(null);
          return;
        }
        if (store.editorModalOpen) {
          e.preventDefault();
          void closeVisualEditorModal();
          return;
        }
        if (store.drawer) {
          e.preventDefault();
          store.drawer = null;
          store.presetRenameTargetId = '';
          store.presetRenameDraft = '';
          renderActiveSurface();
          return;
        }
        if (store.batchMode) {
          e.preventDefault();
          store.batchMode = false;
          store.batchSelected.clear();
          renderActiveSurface();
          return;
        }
      }

      const activeTag = activeEl?.tagName || '';
      const inEditable = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT';

      if (e.key === '/' && !inEditable && !store.isPopoutMode && store.activeTab === 'library') {
        e.preventDefault();
        document.getElementById('prism-lib-search')?.focus();
        return;
      }

      if ((e.key === 'Enter' || e.key === ' ') && activeEl?.classList?.contains('prism-wall-card')) {
        e.preventDefault();
        activeEl.click();
      }
    });

    // 6. Drag-and-Drop Media Upload Overlay (Non-Popout Studio)
    if (!store.isPopoutMode) {
      const renderDropOverlay = (visible) => {
        const dropHost = document.getElementById('prism-drop-host');
        if (!dropHost) return;
        dropHost.innerHTML = visible
          ? `
          <div class="prism-drop-overlay">
            <div style="font-size:28px;color:var(--prism-accent)">✦</div>
            <div style="font-size:14px;font-weight:650">${esc(tr('lib.upload'))}</div>
            <div style="font-size:12px;color:var(--prism-fg-muted)">${esc(tr('lib.dropHint'))}</div>
          </div>
        `
          : '';
      };

      window.addEventListener('dragenter', (e) => {
        if (!e.dataTransfer?.types?.includes('Files')) return;
        e.preventDefault();
        store.dragDepth++;
        renderDropOverlay(true);
      });
      window.addEventListener('dragover', (e) => {
        if (!e.dataTransfer?.types?.includes('Files')) return;
        e.preventDefault();
      });
      window.addEventListener('dragleave', (e) => {
        if (!e.dataTransfer?.types?.includes('Files')) return;
        store.dragDepth = Math.max(0, store.dragDepth - 1);
        if (store.dragDepth === 0) renderDropOverlay(false);
      });
      window.addEventListener('drop', async (e) => {
        if (!e.dataTransfer?.files?.length) return;
        e.preventDefault();
        store.dragDepth = 0;
        renderDropOverlay(false);
        await uploadFiles(e.dataTransfer.files);
      });
    }

    // 7. Host Theme PostMessage, Preload CustomEvents & OS Media Query Sync
    const inferPolarityFromCssVars = (vars) => {
      const bg = String(vars?.['--background'] || vars?.['--body-background'] || '').trim();
      const hexM = /^#([0-9a-f]{6})$/i.exec(bg);
      if (hexM) {
        const h = hexM[1];
        const lum =
          (0.2126 * parseInt(h.slice(0, 2), 16) +
            0.7152 * parseInt(h.slice(2, 4), 16) +
            0.0722 * parseInt(h.slice(4, 6), 16)) /
          255;
        return lum > 0.55 ? 'light' : 'dark';
      }
      return null;
    };

    window.addEventListener('message', (e) => {
      const msg = e.data;
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'theme-change') {
        const inferred =
          msg.theme === 'light' || msg.polarity === 'light' || msg.isDark === false
            ? 'light'
            : msg.theme === 'dark' || msg.polarity === 'dark' || msg.isDark === true
              ? 'dark'
              : inferPolarityFromCssVars(msg.payload?.cssVariables);
        if (inferred && inferred !== store.hostPolarity) {
          store.hostPolarity = inferred;
          syncOpticalCssVars();
        }
      } else if (msg.type === 'prism-theme-sync' && msg.payload) {
        if (msg.payload.theme === 'light' || msg.payload.theme === 'dark') {
          store.hostPolarity = msg.payload.theme;
        }
        syncOpticalCssVars();
      }
    });

    window.addEventListener('prism-host-theme', (e) => {
      const inferred = inferPolarityFromCssVars(e.detail);
      if (inferred && inferred !== store.hostPolarity) {
        store.hostPolarity = inferred;
        syncOpticalCssVars();
      }
    });

    window.addEventListener('prism-theme-sync', (e) => {
      const p = e.detail;
      if (p && (p.theme === 'light' || p.theme === 'dark')) {
        store.hostPolarity = p.theme;
      }
      syncOpticalCssVars();
    });

    if (typeof window.matchMedia === 'function') {
      const mq = window.matchMedia('(prefers-color-scheme: light)');
      const onMq = (ev) => {
        store.hostPolarity = ev.matches ? 'light' : 'dark';
        syncOpticalCssVars();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onMq);
    }

    window.addEventListener(
      'resize',
      () => {
        if (!store.isPopoutMode && store.activeTab === 'library' && store.items.length > VIRTUAL_SCROLL_THRESHOLD) {
          const gridHost = document.getElementById('prism-lib-grid-host');
          if (gridHost) gridHost.innerHTML = renderLibraryGridHtml();
        }
      },
      { passive: true },
    );
  }

  // ==========================================================================
  // External State Sync, SSE Partitioning & Tracked Timers
  // ==========================================================================
  function applyExternalStateSnapshot(payload) {
    if (!payload || typeof payload !== 'object') return;
    const rt = store.runtime;
    if (
      store.masterToggleBusy ||
      store.profileOpBusy ||
      rt.configDebounceTimer ||
      rt.configFlushInFlight ||
      Object.keys(rt.pendingConfigPatch).length > 0
    ) {
      return;
    }
    if (rt.pointerDownInsideScroller || rt.imeComposing) {
      rt.deferredExternalSnapshot = payload;
      return;
    }

    const wasAttached = isHostAttached();
    const prevInspectorPicking = store.inspectorPicking;
    const prevCanaryState = store.canary?.state || 'idle';
    const prevSkinEnabled = store.skinEnabled;
    const prevActiveId = getActiveId();
    const prevSig = externalStateSignature();
    const prevUpdSig = updateStatusSignature();

    const accepted = ingestServerState(payload);
    if (!accepted) return;

    const nextActiveId = getActiveId();
    const nextSig = externalStateSignature();
    const nextUpdSig = updateStatusSignature();
    const inspectorPickingChanged = store.inspectorPicking !== prevInspectorPicking;
    const canaryChanged = (store.canary?.state || 'idle') !== prevCanaryState;
    const skinChanged = store.skinEnabled !== prevSkinEnabled;
    const activeChanged = nextActiveId !== prevActiveId;
    const stateChanged = nextSig !== prevSig;
    const updateChanged = nextUpdSig !== prevUpdSig;

    const activeEl = document.activeElement;
    const isDraggingRange = activeEl instanceof HTMLInputElement && activeEl.type === 'range';
    const isEditingField =
      activeEl instanceof HTMLTextAreaElement ||
      activeEl instanceof HTMLSelectElement ||
      (activeEl instanceof HTMLInputElement && activeEl.type !== 'button' && activeEl.type !== 'checkbox');

    updateTopStatusIndicators();

    if (activeChanged || stateChanged) {
      patchActiveCardsInPlace(nextActiveId);
      syncMiniPreviewMedia();
      syncOpticalCssVars();
      syncRegionBadgesInDom();
      syncWcagBlocksInDom();

      if (!isDraggingRange) {
        if (store.isPopoutMode) {
          if (!isEditingField) renderActiveSurface();
        } else {
          updateLeftRailPanels();
          if (store.editorModalOpen && !isEditingField) {
            renderVisualEditorHost();
          }
          if (!isEditingField && (store.activeTab === 'skin' || store.activeTab === 'playback')) {
            const ws = document.querySelector('.prism-workspace');
            const prevWsScroll = ws ? ws.scrollTop : 0;
            const scroller = document.getElementById('prism-tab-scroll');
            if (scroller) {
              const prevScroll = scroller.scrollTop;
              scroller.innerHTML = renderActiveTabContentHtml();
              scroller.scrollTop = prevScroll;
              if (ws && prevWsScroll > 0) ws.scrollTop = prevWsScroll;
              bindVirtualPickerScrollListeners();
            }
          }
        }
      }
    }

    if ((!wasAttached && isHostAttached()) || canaryChanged || skinChanged || updateChanged || inspectorPickingChanged) {
      if (store.isPopoutMode || store.activeTab === 'system' || store.canary?.state === 'tripped' || inspectorPickingChanged) {
        if (!isDraggingRange && !isEditingField) {
          renderActiveSurface();
        }
      }
    }
  }

  async function syncExternalStateNow() {
    const rt = store.runtime;
    if (rt.externalSyncInFlight || !store.ready || rt.isDormant || !isStudioViewportActive()) return;
    rt.externalSyncInFlight = true;
    try {
      const st = await apiJson('/api/status');
      applyExternalStateSnapshot(st);
    } catch {
      // silent background sync
    } finally {
      rt.externalSyncInFlight = false;
    }
  }

  // Exact symbol name preserved for verify-all.mjs:L1594-L1598!
  function disconnectStudioEvents() {
    const rt = store.runtime;
    if (rt.studioEventSource) {
      try {
        rt.studioEventSource.close();
      } catch {
        // ignore SSE close errors
      }
      rt.studioEventSource = null;
    }
  }

  function connectStudioEvents() {
    const rt = store.runtime;
    if (!isStudioViewportActive() || rt.isDormant) {
      disconnectStudioEvents();
      return;
    }
    if (typeof window.EventSource !== 'function' || rt.studioEventSource) return;
    try {
      // Partition Popout SSE (`?channel=popout`) from Aux Pane SSE (bare `/api/events`); NEVER put token in URL
      const url = store.isPopoutMode ? '/api/events?channel=popout' : '/api/events';
      const es = new window.EventSource(url);
      rt.studioEventSource = es;
      const parseSseJson = (ev) => {
        rt.studioLastSseAt = Date.now();
        try {
          return JSON.parse(ev.data);
        } catch {
          return null;
        }
      };
      const handleEvent = (ev) => {
        const parsed = parseSseJson(ev);
        if (parsed) applyExternalStateSnapshot(parsed);
      };
      es.addEventListener('state', handleEvent);
      es.addEventListener('inspector-picked', (ev) => {
        const parsed = parseSseJson(ev);
        if (parsed) handleInspectorPicked(parsed);
      });
      es.addEventListener('inspector-cancelled', (ev) => {
        const parsed = parseSseJson(ev);
        if (parsed) handleInspectorCancelled(parsed);
      });
      es.addEventListener('inspector-status', (ev) => {
        const parsed = parseSseJson(ev);
        if (parsed) handleInspectorStatus(parsed);
      });
      es.onmessage = handleEvent;
      es.onerror = () => {
        if (!isStudioViewportActive() || rt.isDormant) {
          disconnectStudioEvents();
        }
      };
    } catch {
      rt.studioEventSource = null;
    }
  }

  function ensurePreviewWatchdog() {
    const rt = store.runtime;
    if (rt.previewWatchdogTimer || store.isPopoutMode) return;
    let lastPreviewVidT = -1;
    let previewStallTicks = 0;
    rt.previewWatchdogTimer = setInterval(() => {
      if (!shouldPlayStudioPreviewVideo()) {
        lastPreviewVidT = -1;
        previewStallTicks = 0;
        return;
      }
      const vid = document.getElementById('prism-preview-video');
      if (!(vid instanceof HTMLVideoElement) || vid.seeking || vid.readyState < 1) return;
      if (vid.paused) {
        vid.play().catch(() => {});
        lastPreviewVidT = vid.currentTime;
        return;
      }
      const curT = Number(vid.currentTime || 0);
      const dur = Number(vid.duration);
      if (lastPreviewVidT >= 0 && Math.abs(curT - lastPreviewVidT) < 0.002) {
        previewStallTicks += 1;
        if (Number.isFinite(dur) && dur > 1.2 && curT >= dur - 1.5) {
          if (curT > 0.8) vid.__effectiveEnd = Math.max(0.5, curT - 0.06);
          vid.currentTime = 0;
          vid.play().catch(() => {});
          previewStallTicks = 0;
          lastPreviewVidT = 0;
          return;
        }
        if (previewStallTicks >= 2) {
          vid.currentTime =
            Number.isFinite(dur) && dur > 1.5 && curT < dur - 1.2 ? Math.max(0, curT - 0.035) : 0;
          vid.play().catch(() => {});
          previewStallTicks = 0;
        }
      } else {
        previewStallTicks = 0;
      }
      lastPreviewVidT = curT;
    }, 1250);
  }

  function ensureLiveSyncPoll() {
    const rt = store.runtime;
    if (rt.studioSyncPollTimer) return;
    rt.studioSyncPollTimer = setInterval(() => {
      if (!isStudioViewportActive() || rt.isDormant || !store.ready) return;
      const sseFresh =
        rt.studioEventSource &&
        rt.studioEventSource.readyState === 1 &&
        rt.studioLastSseAt > 0 &&
        Date.now() - rt.studioLastSseAt < 20_000;
      if (sseFresh) return;
      void syncExternalStateNow();
    }, 2500);
  }

  function ensureStandbyStatusPoll() {
    const rt = store.runtime;
    const needsCanaryWatch = () => store.canary?.state === 'arming';
    if (rt.statusPollTimer || (isHostAttached() && !needsCanaryWatch())) return;
    rt.statusPollTimer = setInterval(async () => {
      // Self-cleanup checked BEFORE visibility return so timer never leaks!
      if (isHostAttached() && !needsCanaryWatch()) {
        clearInterval(rt.statusPollTimer);
        rt.statusPollTimer = null;
        return;
      }
      if (!isStudioViewportActive() || rt.isDormant) return;
      try {
        const st = await apiJson('/api/status');
        applyExternalStateSnapshot(st);
        if (isHostAttached() && !needsCanaryWatch()) {
          clearInterval(rt.statusPollTimer);
          rt.statusPollTimer = null;
        }
      } catch {
        // silent background poll
      }
    }, 2500);
  }

  function clearAllFourBackgroundTimers() {
    const rt = store.runtime;
    if (rt.previewWatchdogTimer) {
      clearInterval(rt.previewWatchdogTimer);
      rt.previewWatchdogTimer = null;
    }
    if (rt.studioSyncPollTimer) {
      clearInterval(rt.studioSyncPollTimer);
      rt.studioSyncPollTimer = null;
    }
    if (rt.statusPollTimer) {
      clearInterval(rt.statusPollTimer);
      rt.statusPollTimer = null;
    }
    if (rt.slideshowTimer) {
      clearInterval(rt.slideshowTimer);
      rt.slideshowTimer = null;
    }
  }

  // ==========================================================================
  // D6 Layer B: Cold-Start Gate & T+0ms SOFT_SLEEP -> T+5000ms DEEP_SLEEP State Machine
  // ==========================================================================
  function enterSoftSleep() {
    const rt = store.runtime;
    if (rt.isDormant) return;
    rt.isDormant = true;

    // 1. Flush unsent edits via <2KB fetch keepalive with X-Sidecar-Token
    flushConfigPatchKeepalive();

    // 2. Disconnect SSE immediately to free Chromium 6-socket origin pool
    disconnectStudioEvents();

    // 3. Pause all videos & cancel short timers
    try {
      for (const vid of document.querySelectorAll('video')) {
        if (!vid.paused) vid.pause();
      }
    } catch {
      // ignore video pause errors
    }
    if (rt.slideshowTimer) {
      clearInterval(rt.slideshowTimer);
      rt.slideshowTimer = null;
    }
    if (rt.updateBootCheckTimer) {
      clearTimeout(rt.updateBootCheckTimer);
      rt.updateBootCheckTimer = null;
    }
    resetLibraryHoverThumb();

    // 4. Freeze all CSS animations via html[data-prism-dormant="1"]
    document.documentElement.dataset.prismDormant = '1';

    // 5. Schedule T+5000ms DEEP_SLEEP
    if (rt.deepSleepTimer) clearTimeout(rt.deepSleepTimer);
    rt.deepSleepTimer = setTimeout(() => {
      rt.deepSleepTimer = null;
      void enterDeepSleep();
    }, 5000);
  }

  async function enterDeepSleep() {
    const rt = store.runtime;
    if (isStudioViewportActive() || !rt.isDormant) return;

    await flushConfigPatch({ flush: true, keepalive: true });
    if (isStudioViewportActive() || !rt.isDormant) return;

    // Snapshot ALL active DOM form inputs directly back into `store.*` (DEF-SE-4(c))
    const nameIn = document.getElementById('prism-preset-name-in');
    if (nameIn instanceof HTMLInputElement) store.presetDraft.name = nameIn.value;
    const descIn = document.getElementById('prism-preset-desc-in');
    if (descIn instanceof HTMLInputElement) store.presetDraft.description = descIn.value;
    const wallCb = document.getElementById('prism-preset-include-wall');
    if (wallCb instanceof HTMLInputElement) store.presetDraft.includeWallpaper = wallCb.checked;
    const searchIn = document.getElementById('prism-lib-search');
    if (searchIn instanceof HTMLInputElement) store.searchQuery = searchIn.value;
    const plNameIn = document.getElementById('prism-pl-name-in');
    if (plNameIn instanceof HTMLInputElement) store.playlistDraft.name = plNameIn.value;
    const fsPathIn = document.getElementById('prism-fs-path-in');
    if (fsPathIn instanceof HTMLInputElement) {
      store.fsBrowser.manualPath = fsPathIn.value;
      store.fsBrowser.current = fsPathIn.value;
    }
    const renameIn = document.getElementById('prism-preset-rename-in');
    if (renameIn instanceof HTMLInputElement) store.presetRenameDraft = renameIn.value;

    rt.dormantDraftSnapshot = {
      scrollerScrollTop: document.getElementById('prism-tab-scroll')?.scrollTop || 0,
      workspaceScrollTop: document.querySelector('.prism-workspace')?.scrollTop || 0,
      railScrollTop: document.querySelector('.prism-left-rail')?.scrollTop || 0,
      activeTab: store.activeTab,
      drawer: store.drawer,
      editorModalOpen: store.editorModalOpen,
      selectedRegion: store.selectedRegion,
    };

    // Release all preview & modal <video> decoders + pan/zoom bindings + reset media signature
    clearCanvasPanZoomBinding();
    releaseExistingPreviewVideo();
    const veHost = document.getElementById('prism-visual-editor-host');
    if (veHost) {
      releaseExistingPreviewVideo(veHost);
      veHost.innerHTML = '';
    }
    rt.currentStageMediaSig = '';

    // Clear ALL 4 background timers
    clearAllFourBackgroundTimers();

    // Unload #prism-tab-scroll DOM (frees all card thumbnail image decoders)
    const sc = document.getElementById('prism-tab-scroll');
    if (sc) sc.innerHTML = '';

    // Revoke all temporary ObjectURLs
    for (const u of rt.tempObjectUrls) {
      try {
        URL.revokeObjectURL(u);
      } catch {
        // ignore revoke issues
      }
    }
    rt.tempObjectUrls.clear();

    rt.isDeepDormant = true;
  }

  function wakeFromSleep() {
    const rt = store.runtime;
    if (rt.deepSleepTimer) {
      clearTimeout(rt.deepSleepTimer);
      rt.deepSleepTimer = null;
    }
    delete document.documentElement.dataset.prismDormant;
    rt.isDormant = false;

    if (!rt.booted) {
      void bootHydrateStudioOnce();
      return;
    }

    if (rt.isDeepDormant || rt.needsRenderOnWake) {
      const wasDeep = rt.isDeepDormant;
      rt.isDeepDormant = false;
      rt.needsRenderOnWake = false;
      const snap = rt.dormantDraftSnapshot;
      renderActiveSurface();
      if (wasDeep && snap) {
        const sc = document.getElementById('prism-tab-scroll');
        if (sc) sc.scrollTop = snap.scrollerScrollTop || 0;
        const ws = document.querySelector('.prism-workspace');
        if (ws) ws.scrollTop = snap.workspaceScrollTop || 0;
        const rail = document.querySelector('.prism-left-rail');
        if (rail) rail.scrollTop = snap.railScrollTop || 0;
      }
      ensurePreviewWatchdog();
    } else {
      syncMiniPreviewMedia();
      syncOpticalCssVars();
    }

    connectStudioEvents();
    ensureLiveSyncPoll();
    ensureStandbyStatusPoll();
    if (store.ready) void syncExternalStateNow();
  }

  // Exact symbol name preserved for verify-all.mjs:L1594-L1598!
  function installStudioVisibilityGuards() {
    let wasActive = isStudioViewportActive();
    if (!wasActive) {
      store.runtime.isDormant = true;
      document.documentElement.dataset.prismDormant = '1';
    }

    const reconcile = () => {
      const active = isStudioViewportActive();
      if (active === wasActive) {
        if (active && !store.runtime.booted) {
          void bootHydrateStudioOnce();
        }
        return;
      }
      wasActive = active;
      if (!active) {
        if (store.runtime.booted) {
          enterSoftSleep();
        } else {
          store.runtime.isDormant = true;
          document.documentElement.dataset.prismDormant = '1';
        }
      } else {
        wakeFromSleep();
      }
    };

    document.addEventListener('visibilitychange', reconcile);
    window.addEventListener('focus', reconcile);
    window.addEventListener('resize', reconcile, { passive: true });
    window.addEventListener('pagehide', () => {
      flushConfigPatchKeepalive();
      disconnectStudioEvents();
    });

    if (typeof window.ResizeObserver === 'function' && document.documentElement) {
      try {
        const ro = new window.ResizeObserver(reconcile);
        ro.observe(document.documentElement);
        const appEl = document.getElementById('app');
        if (appEl) ro.observe(appEl);
        store.runtime.rootResizeObserver = ro;
      } catch {
        // ignore observer errors
      }
    }
  }

  // ==========================================================================
  // Idempotent Cold-Start Hydration (0 requests/SSE/timers/videos while hidden!)
  // ==========================================================================
  async function bootHydrateStudioOnce() {
    const rt = store.runtime;
    if (rt.booted) return;
    rt.booted = true;
    rt.isDormant = false;
    delete document.documentElement.dataset.prismDormant;

    if (store.isPopoutMode) {
      mountPopoutShell();
    } else {
      mountFullShell();
    }
    attachEventDelegation();

    try {
      const [bootRes, libRes] = await Promise.all([
        apiJson('/api/bootstrap').catch(() => null),
        apiJson('/api/library?refresh=0').catch(() => null),
      ]);

      if (libRes) {
        if (Array.isArray(libRes.items)) store.items = libRes.items;
        if (libRes.stats) store.stats = { ...store.stats, ...libRes.stats };
      }
      if (bootRes) {
        ingestServerState(bootRes);
      }
      store.ready = true;
    } catch {
      store.ready = true;
    }

    if (!isStudioViewportActive() || rt.isDormant) {
      rt.needsRenderOnWake = true;
      if (!rt.isDormant) enterSoftSleep();
      return;
    }

    rt.needsRenderOnWake = false;
    renderActiveSurface();

    connectStudioEvents();
    ensureLiveSyncPoll();
    ensureStandbyStatusPoll();
    ensurePreviewWatchdog();

    if (!store.isPopoutMode) {
      if (rt.updateBootCheckTimer) clearTimeout(rt.updateBootCheckTimer);
      rt.updateBootCheckTimer = setTimeout(() => {
        rt.updateBootCheckTimer = null;
        if (isStudioViewportActive() && !rt.isDormant && !store.update.checked && !store.update.checking) {
          void fetchUpdateStatus(false);
        }
      }, 800);
    }
  }

  function init() {
    registerHooks({
      renderActiveSurface,
      renderToastStack,
      syncOpticalCssVars,
      syncMiniPreviewMedia,
      updateTopStatusIndicators,
      updateLeftRailPanels,
      syncRegionBadgesInDom,
    });

    try {
      const qs = new URLSearchParams(window.location.search || '');
      const mode = (qs.get('mode') || '').trim().toLowerCase();
      const region = (qs.get('region') || '').trim();
      store.isPopoutMode = mode === 'visual-editor';
      store.editorMode = store.isPopoutMode ? 'popout' : 'none';
      if (region && REGION_IDS.includes(region)) {
        store.selectedRegion = region;
      }
    } catch {
      store.isPopoutMode = false;
    }

    // Layer B Cold-Start Gate: install visibility guards FIRST; remain COLD_DORMANT when hidden or 0x0!
    installStudioVisibilityGuards();
    if (isStudioViewportActive()) {
      void bootHydrateStudioOnce();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}

bootPrismStudioApp();
