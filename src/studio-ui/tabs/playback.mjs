// Wallpaper Prism Studio UI — Tab 3: Playback, Transitions, Framing & Virtualized Playlist Selector
// DAG Layer 4: imports only L0 (schema), L1 (state), L3 (controls).
// Pure named exports only (no `export let`, no destructured exports).

import {
  DEFAULT_CONFIG,
  FIT_MODES,
  SWITCH_TRANSITIONS,
  SWITCH_DIRECTIONS,
  SWITCH_SPEEDS,
} from '../../shared/schema.mjs';

import {
  store,
  curLocale,
  tr,
  tx,
  esc,
  withStaticPreviewParam,
  getEffectiveConfig,
  computeLibraryModel,
} from '../state.mjs';

import {
  renderSliderRow,
  renderSwitchRow,
  renderSegRow,
  renderMediaHealthAlertsHtml,
} from '../controls.mjs';

const PICKER_VIRTUAL_THRESHOLD = 24;
const PICKER_ROW_HEIGHT_PX = 96;

function computeInlinePickerSlice(totalCount, pickerEl = null) {
  if (totalCount <= PICKER_VIRTUAL_THRESHOLD) {
    return { start: 0, end: totalCount, padTop: 0, padBottom: 0, cols: 3 };
  }
  const viewW = pickerEl && pickerEl.clientWidth > 0 ? Math.max(120, pickerEl.clientWidth - 8) : 380;
  const cols = Math.max(2, Math.floor((viewW + 6) / 114));
  const rowH = PICKER_ROW_HEIGHT_PX;
  const totalRows = Math.ceil(totalCount / cols);
  const scrollTop = pickerEl ? Math.max(0, pickerEl.scrollTop) : 0;
  const viewH = pickerEl && pickerEl.clientHeight > 0 ? pickerEl.clientHeight : 260;

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

export function renderPlaylistPickerGridHtml(visibleItems = null, pickedIds = null, pickerEl = null) {
  const items = Array.isArray(visibleItems) ? visibleItems : computeLibraryModel().visibleItems;
  const pickedSet = pickedIds instanceof Set ? pickedIds : store.playlistDraft.pickedIds;
  const sliceWin = computeInlinePickerSlice(items.length, pickerEl);
  const windowItems = items.slice(sliceWin.start, sliceWin.end);

  if (items.length === 0) {
    return `<div class="prism-ctl-hint" style="padding:10px">${esc(tr('lib.empty'))}</div>`;
  }

  return `
    <div class="prism-mini-picker-viewport" style="padding-top:${sliceWin.padTop}px;padding-bottom:${sliceWin.padBottom}px">
      <div class="prism-mini-picker-grid-inner">
        ${windowItems
          .map((it) => {
            const picked = pickedSet.has(it.id);
            const rawThumb = it.thumbUrl || (it.kind === 'image' ? it.mediaUrl : '');
            const thumb = rawThumb ? withStaticPreviewParam(rawThumb) : '';
            return `
              <div class="prism-mini-pick-item ${picked ? 'is-picked' : ''}"
                   data-action="toggle-pl-pick" data-id="${esc(it.id)}">
                ${
                  thumb
                    ? `<img loading="lazy" decoding="async" src="${esc(thumb)}" alt="" onerror="this.remove()" />`
                    : `<div style="aspect-ratio:16/10;background:rgba(var(--prism-accent-rgb),0.18)"></div>`
                }
                <div class="prism-mini-pick-name">${picked ? '✓ ' : ''}${esc(it.title || it.id)}</div>
              </div>
            `;
          })
          .join('')}
      </div>
    </div>
  `;
}

export function renderPlaybackTab() {
  const eff = getEffectiveConfig();
  const isZh = curLocale() === 'zh';
  const groups = store.config.rotationGroups || [];
  const model = computeLibraryModel();
  const activeGroup = groups.find((g) => g.id === store.config.rotationGroupId) || null;
  const healthAlerts = renderMediaHealthAlertsHtml();

  const speedLabels = {
    fast: isZh ? '快速' : 'Fast',
    normal: isZh ? '标准' : 'Normal',
    slow: isZh ? '舒缓' : 'Slow',
  };
  const dirLabels = {
    left: isZh ? '左' : 'Left',
    right: isZh ? '右' : 'Right',
    up: isZh ? '上' : 'Up',
    down: isZh ? '下' : 'Down',
  };
  const transitionLabels = {
    cut: isZh ? '直切' : 'Cut',
    fade: isZh ? '淡入' : 'Fade',
    push: isZh ? '推移' : 'Push',
    wipe: isZh ? '擦除' : 'Wipe',
    iris: isZh ? '光圈' : 'Iris',
    zoom: isZh ? '缩放' : 'Zoom',
    bars: isZh ? '百叶' : 'Bars',
  };

  return `
    ${healthAlerts ? `<div class="prism-health-alerts">${healthAlerts}</div>` : ''}

    <div class="prism-settings-columns">
      <!-- Switch Transitions & Slideshow -->
      <details class="prism-section" open>
        <summary>
          <div class="prism-section-title-wrap">
            <span class="prism-section-chevron">▶</span>
            <span>${esc(tr('play.transitions'))}</span>
          </div>
          <button type="button" class="prism-btn prism-btn-sm"
                  data-action="reset-module" data-keys="switchTransition,switchTransitionDir,switchTransitionSpeed,pictureSlideSeconds">↺</button>
        </summary>
        <div class="prism-section-body">
          ${renderSegRow({
            key: 'switchTransition',
            label: tr('play.transitionType'),
            value: eff.switchTransition,
            options: SWITCH_TRANSITIONS.map((st) => ({ value: st, label: transitionLabels[st] || st })),
          })}
          ${renderSegRow({
            key: 'switchTransitionDir',
            label: tr('play.transitionDir'),
            value: eff.switchTransitionDir,
            options: SWITCH_DIRECTIONS.map((d) => ({ value: d, label: dirLabels[d] || d })),
          })}
          ${renderSegRow({
            key: 'switchTransitionSpeed',
            label: tr('play.transitionSpeed'),
            value: eff.switchTransitionSpeed,
            options: SWITCH_SPEEDS.map((sp) => ({ value: sp, label: speedLabels[sp] || sp })),
          })}
          ${renderSliderRow({
            key: 'pictureSlideSeconds',
            label: tx('slideInterval'),
            value: eff.pictureSlideSeconds,
            defaultValue: DEFAULT_CONFIG.pictureSlideSeconds,
            min: 0,
            max: 600,
            step: 5,
            suffix: ' s',
          })}
        </div>
      </details>

      <!-- Video Speed, FPS Cap & Scene WebGL Engine -->
      <details class="prism-section" open>
        <summary>
          <div class="prism-section-title-wrap">
            <span class="prism-section-chevron">▶</span>
            <span>${esc(tx('playEngineTitle'))}</span>
          </div>
          <button type="button" class="prism-btn prism-btn-sm"
                  data-action="reset-module" data-keys="playbackRate,fpsCap,sceneLive,sceneLiveFps,sceneAutoQuality,interactiveWeb">↺</button>
        </summary>
        <div class="prism-section-body">
          ${renderSliderRow({
            key: 'playbackRate',
            label: tr('play.speed'),
            value: eff.playbackRate,
            defaultValue: DEFAULT_CONFIG.playbackRate,
            min: 0.5,
            max: 2.0,
            step: 0.05,
            decimals: 2,
            suffix: '×',
          })}
          <div class="prism-ctl-row">
            <span class="prism-ctl-hint">${esc(tx('quickSpeed'))}</span>
            <div class="prism-seg">
              ${[0.5, 0.75, 1, 1.25, 1.5, 2]
                .map(
                  (r) => `
                <button type="button" class="prism-seg-btn ${Math.abs(eff.playbackRate - r) < 0.02 ? 'is-active' : ''}"
                        data-action="set-num" data-key="playbackRate" data-val="${r}">${r}×</button>
              `,
                )
                .join('')}
            </div>
          </div>
          ${renderSegRow({
            key: 'fpsCap',
            label: tr('play.fpsCap'),
            value: eff.fpsCap,
            options: [
              { value: 0, label: tr('play.fpsUnlimited') },
              { value: 60, label: '60 FPS' },
              { value: 30, label: '30 FPS' },
            ],
          })}
          ${renderSwitchRow({
            key: 'sceneLive',
            label: tr('play.sceneLive'),
            checked: eff.sceneLive,
          })}
          ${renderSegRow({
            key: 'sceneLiveFps',
            label: tr('play.sceneFps'),
            value: eff.sceneLiveFps,
            options: [
              { value: 15, label: '15 FPS' },
              { value: 30, label: '30 FPS' },
              { value: 60, label: '60 FPS' },
            ],
          })}
          ${renderSwitchRow({
            key: 'sceneAutoQuality',
            label: tr('play.sceneAutoQuality'),
            checked: eff.sceneAutoQuality,
          })}
          ${renderSwitchRow({
            key: 'interactiveWeb',
            label: tx('interactiveWeb'),
            checked: eff.interactiveWeb,
          })}
        </div>
      </details>

      <!-- Free Framing & Alignment (dblclick resets X/Y/Scale) -->
      <details class="prism-section" open>
        <summary>
          <div class="prism-section-title-wrap">
            <span class="prism-section-chevron">▶</span>
            <span>${esc(tx('playFramingTitle'))}</span>
          </div>
          <button type="button" class="prism-btn prism-btn-sm"
                  data-action="reset-module" data-keys="fit,flip,layerPosX,layerPosY,layerScale">↺</button>
        </summary>
        <div class="prism-section-body">
          ${renderSegRow({
            key: 'fit',
            label: tr('optics.fit'),
            value: eff.fit,
            options: FIT_MODES.map((f) => ({ value: f, label: tr(`optics.fit.${f}`) })),
          })}
          ${renderSwitchRow({
            key: 'flip',
            label: tr('optics.flip'),
            checked: eff.flip,
          })}
          ${renderSliderRow({
            key: 'layerPosX',
            label: tr('optics.posX'),
            value: eff.layerPosX,
            defaultValue: DEFAULT_CONFIG.layerPosX,
            min: 0,
            max: 100,
            step: 1,
            suffix: ' %',
            dblResetFraming: true,
          })}
          ${renderSliderRow({
            key: 'layerPosY',
            label: tr('optics.posY'),
            value: eff.layerPosY,
            defaultValue: DEFAULT_CONFIG.layerPosY,
            min: 0,
            max: 100,
            step: 1,
            suffix: ' %',
            dblResetFraming: true,
          })}
          ${renderSliderRow({
            key: 'layerScale',
            label: tr('optics.scale'),
            value: eff.layerScale,
            defaultValue: DEFAULT_CONFIG.layerScale,
            min: 50,
            max: 150,
            step: 1,
            suffix: ' %',
            dblResetFraming: true,
          })}
          <div class="prism-ctl-hint">${esc(tx('dblClickFramingHint'))}</div>
        </div>
      </details>

      <!-- Audio, Auto-Pause Lifecycle & Windows Desktop Sync -->
      <details class="prism-section" open>
        <summary>
          <div class="prism-section-title-wrap">
            <span class="prism-section-chevron">▶</span>
            <span>${esc(tr('play.autoPause'))}</span>
          </div>
          <button type="button" class="prism-btn prism-btn-sm"
                  data-action="reset-module" data-keys="muted,volume,pauseOnHidden,pauseOnBlur,pauseOnBattery,pauseOnFullscreen,desktopSync">↺</button>
        </summary>
        <div class="prism-section-body">
          <div class="prism-ctl-row">
            <span class="prism-ctl-name">${esc(eff.muted ? tr('transport.mute') : tr('transport.unmute'))}</span>
            <button type="button" class="prism-btn prism-btn-sm ${!eff.muted ? 'prism-btn-primary' : ''}" data-action="toggle-mute">
              ${eff.muted ? '🔇' : '🔊'} ${esc(eff.muted ? tr('transport.unmute') : tr('transport.mute'))}
            </button>
          </div>
          ${renderSliderRow({
            key: 'volume',
            label: tr('play.volume'),
            value: eff.volume,
            defaultValue: DEFAULT_CONFIG.volume,
            min: 0,
            max: 1,
            step: 0.05,
            scale: 100,
            decimals: 0,
            suffix: ' %',
          })}
          ${renderSwitchRow({
            key: 'pauseOnHidden',
            label: tr('play.pauseOnHidden'),
            checked: eff.pauseOnHidden,
          })}
          ${renderSwitchRow({
            key: 'pauseOnBlur',
            label: tr('play.pauseOnBlur'),
            checked: eff.pauseOnBlur,
          })}
          ${renderSwitchRow({
            key: 'pauseOnBattery',
            label: tr('play.pauseOnBattery'),
            checked: eff.pauseOnBattery,
          })}
          ${renderSwitchRow({
            key: 'pauseOnFullscreen',
            label: tr('play.pauseOnFullscreen'),
            checked: eff.pauseOnFullscreen,
          })}
          ${renderSwitchRow({
            key: 'desktopSync',
            label: tr('play.desktopSync'),
            checked: eff.desktopSync,
          })}
        </div>
      </details>

      <!-- Rotation Playlists & Virtualized Wallpaper Selector -->
      <details class="prism-section span-full">
        <summary>
          <div class="prism-section-title-wrap">
            <span class="prism-section-chevron">▶</span>
            <span>${esc(tx('playlistsLabel'))}${activeGroup ? ` · ${esc(activeGroup.name)}` : ''} (${groups.length})</span>
          </div>
          <button type="button" class="prism-btn prism-btn-sm"
                  data-action="reset-module" data-keys="rotationEnabled,rotationOrder,rotationTrigger,rotationInterval">↺</button>
        </summary>
        <div class="prism-section-body">
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
          <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;justify-content:space-between;padding-top:4px;border-top:1px solid var(--prism-border-hairline)">
            <div style="display:flex;flex-wrap:wrap;gap:5px;align-items:center">
              ${groups
                .map((g) => {
                  const isAct = store.config.rotationGroupId === g.id;
                  return `
                    <button type="button" class="prism-chip ${isAct ? 'is-active' : ''}"
                            data-action="activate-playlist" data-id="${esc(g.id)}">
                      ${esc(g.name)} <span class="prism-chip-count">${g.wallpaperIds.length}</span>
                    </button>
                  `;
                })
                .join('')}
            </div>
            <div style="display:flex;gap:5px;flex-wrap:wrap">
              <button type="button" class="prism-btn prism-btn-sm" data-action="step-playlist" data-dir="-1">⏮ ${esc(tr('transport.prev'))}</button>
              <button type="button" class="prism-btn prism-btn-sm" data-action="step-playlist" data-dir="1">⏭ ${esc(tr('transport.next'))}</button>
              <button type="button" class="prism-btn prism-btn-sm prism-btn-primary" data-action="open-drawer" data-drawer="playlist">
                ↻ ${esc(isZh ? '管理歌单…' : 'Manage Playlists…')}
              </button>
            </div>
          </div>
          ${
            model.visibleItems.length > 0
              ? `
            <div class="prism-mini-picker-grid" data-virtual-picker="playback">
              ${renderPlaylistPickerGridHtml(model.visibleItems, store.playlistDraft.pickedIds)}
            </div>
          `
              : ''
          }
        </div>
      </details>
    </div>
  `;
}
