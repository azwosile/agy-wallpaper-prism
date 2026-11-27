// Wallpaper Prism Studio UI — Tab 2: Prism Skin (Compact Top Action Bar, Presets Manager & 8-Region Accordions)
// DAG Layer 4: imports only L0 (schema), L1 (state), L2 (optics), L3 (controls).
// Pure named exports only (no `export let`, no destructured exports).

import {
  REGION_IDS,
  REGION_FONT_SIZE_BOUNDS,
  CORNER_STYLES,
  BORDER_MODES,
  TOPBAR_STYLES,
  THEME_MODES,
  CODE_READABILITY_MODES,
  FILTER_PRESETS,
  SIDEBAR_LIST_STYLES,
  SIDEBAR_TYPOGRAPHY_MODES,
  COLOR_SCHEMES,
  COLOR_SCHEME_IDS,
  ACCENT_MODES,
  ACCENT_PRESETS,
  SURFACE_TINT_BOUNDS,
  DEFAULT_REGION_ENTRY,
  DEFAULT_SIDEBAR_REGION_ENTRY,
  FACTORY_PRESETS,
  DEFAULT_CONFIG,
  resolveComponentDefaultAlpha,
  resolveSchemeTokens,
} from '../../shared/schema.mjs';

import {
  store,
  REGION_UI_ORDER,
  curLocale,
  tr,
  tx,
  esc,
  getActiveId,
  getEffectiveConfig,
  getResolvedPolarity,
  hasPerWallpaperPin,
  isRegionOpen,
  hasAnyRegionOpen,
} from '../state.mjs';

import {
  resolveSimRegionSurface,
  renderExtractedSwatchesHtml,
} from '../optics.mjs';

import {
  CURATED_TINT_SWATCHES,
  renderSliderRow,
  renderSwitchRow,
  renderSegRow,
  renderColorPickerWithWcag,
  renderFontFamilyControl,
  renderRegionAccordionShell,
  countRegionCustomProps,
  countTotalCustomizedRegions,
} from '../controls.mjs';

const GLOBAL_RESET_KEYS =
  'layoutMode,islandGap,workspacePad,cornerStyle,borders,shadows,glassSurfaces,glassOpacity,glassBlur,glassFidelity,themeMode,themeFollow,colorScheme,accentMode,customAccent,wallTintMix,scrimOpacity,scrimColor,vignette,mediaOpacity,mediaBlur,mediaBrightness,mediaContrast,mediaSaturate,grainAlpha,filterPreset,globalFontSize,globalFontFamily,globalFontColor,fxEnabled,fxClickMode,fxTrailMode,parallaxEnabled,parallaxStrength';

const DIRTY_COMPARE_SCALAR_KEYS = Object.freeze([
  'layoutMode',
  'islandGap',
  'workspacePad',
  'cornerStyle',
  'leftSidebarRadius',
  'rightSidebarRadius',
  'borders',
  'shadows',
  'topbarStyle',
  'transparentWindowControls',
  'hideWelcomeLogo',
  'sidebarListStyle',
  'sidebarTypographyMode',
  'sidebarFontSize',
  'globalFontSize',
  'globalFontFamily',
  'globalFontColor',
  'themeMode',
  'themeFollow',
  'colorScheme',
  'accentMode',
  'customAccent',
  'wallTintMix',
  'glassSurfaces',
  'glassOpacity',
  'glassBlur',
  'sidebarOpacity',
  'sidebarBlur',
  'glassFidelity',
  'chatGlassFidelity',
  'codeReadabilityMode',
  'contrastFloor',
  'floaterSolidBase',
  'caretColor',
  'scrimOpacity',
  'scrimColor',
  'vignette',
  'mediaOpacity',
  'mediaBlur',
  'mediaBrightness',
  'mediaContrast',
  'mediaSaturate',
  'grainAlpha',
  'filterPreset',
  'fxEnabled',
  'fxClickMode',
  'fxTrailMode',
  'parallaxEnabled',
  'parallaxStrength',
]);

function getVisiblePresets() {
  const deleted = store.config.deletedFactoryPresets || [];
  const list = store.presets?.length ? store.presets : FACTORY_PRESETS;
  return list.filter((p) => p && !deleted.includes(p.id));
}

function getRegionEntry(eff, rid) {
  const base = rid === 'sidebar' ? DEFAULT_SIDEBAR_REGION_ENTRY : DEFAULT_REGION_ENTRY;
  const raw = eff?.regions?.[rid];
  return raw && typeof raw === 'object' ? { ...base, ...raw } : { ...base };
}

function isRegionOpticalCustomized(eff, rid) {
  const ent = getRegionEntry(eff, rid);
  const op = rid === 'sidebar' ? (eff.sidebarOpacity ?? ent.opacity ?? null) : (ent.opacity ?? null);
  const bl = rid === 'sidebar' ? (eff.sidebarBlur ?? ent.blur ?? null) : (ent.blur ?? null);
  return (
    ent.glassEnabled !== null ||
    bl !== null ||
    op !== null ||
    Number(ent.tone || 0) !== 0 ||
    Boolean(ent.tint && String(ent.tint).trim()) ||
    ent.borderOpacity !== null
  );
}

export function isCurrentStateDirtyFromPreset(eff = getEffectiveConfig()) {
  const activePresetId = store.config.activeProfilePresetId || '';
  if (!activePresetId) return false;
  const preset = getVisiblePresets().find((p) => p.id === activePresetId);
  if (!preset || !preset.patch || typeof preset.patch !== 'object') return false;
  const patch = preset.patch;

  for (const k of DIRTY_COMPARE_SCALAR_KEYS) {
    if (!(k in patch)) continue;
    const expected = patch[k];
    const actual = eff[k];
    if (typeof expected === 'number' && typeof actual === 'number') {
      if (Math.abs(expected - actual) > 0.002) return true;
    } else if (expected !== actual) {
      return true;
    }
  }

  if (patch.surfaceTints === null && !patch.regions) {
    for (const rid of REGION_IDS) {
      if (isRegionOpticalCustomized(eff, rid)) return true;
    }
  } else if (patch.regions && typeof patch.regions === 'object') {
    for (const rid of REGION_IDS) {
      if (!(rid in patch.regions)) continue;
      const expReg = patch.regions[rid];
      const actReg = getRegionEntry(eff, rid);
      if (expReg === null) {
        if (countRegionCustomProps(rid, eff) > 0) return true;
      } else if (expReg && typeof expReg === 'object') {
        for (const [pk, pv] of Object.entries(expReg)) {
          if (typeof pv === 'number' && typeof actReg[pk] === 'number') {
            if (Math.abs(pv - actReg[pk]) > 0.002) return true;
          } else if (pv !== actReg[pk]) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

export function renderSkinTopActionBarHtml(eff = getEffectiveConfig()) {
  const isZh = curLocale() === 'zh';
  const activeId = getActiveId();
  const activeItem = store.activeItem || store.items.find((x) => x.id === activeId);
  const pinned = hasPerWallpaperPin(activeId);
  const visiblePresets = getVisiblePresets();
  const activePresetId = store.config.activeProfilePresetId || '';
  const activePreset = visiblePresets.find((p) => p.id === activePresetId) || null;
  const isDirty = isCurrentStateDirtyFromPreset(eff);
  const anyOpen = hasAnyRegionOpen();
  const totalCustom = countTotalCustomizedRegions(eff, REGION_UI_ORDER);
  const busy = Boolean(store.profileOpBusy);
  const pickerPicking = Boolean(store.inspectorPicking);
  const pickerBusy = Boolean(store.inspectorBusy);
  const overwriteConfirmKey = activePreset && !activePreset.builtin ? `overwrite-preset:${activePreset.id}` : '';
  const overwriteArmed = Boolean(overwriteConfirmKey && store.armedConfirm?.key === overwriteConfirmKey);

  return `
    <div id="prism-skin-pin-bar" class="prism-card prism-skin-top-bar">
      <!-- Row 1: Scope Switch + Primary Visual Editor CTA -->
      <div class="prism-skin-top-row">
        <div class="prism-skin-scope-group">
          <span class="prism-kind-badge">${esc(activeItem ? tr(`kind.${activeItem.kind}`) || activeItem.kind : 'SKIN')}</span>
          <strong style="font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:220px" title="${esc(activeItem?.title || '')}">
            ${esc(activeItem?.title || (isZh ? '全局棱镜玻璃外观' : 'Global Prism Skin'))}
          </strong>
          ${
            activeId
              ? `
            <label class="prism-skin-pin-label" title="${esc(tr('lib.pinOverride'))}">
              <span>${esc(pinned ? tr('region.scopeWallpaper') : tr('region.scopeGlobal'))}</span>
              <button type="button" role="switch" class="prism-switch"
                      aria-checked="${pinned ? 'true' : 'false'}"
                      data-action="toggle-pin-override"></button>
            </label>
          `
              : `<span class="prism-chip" style="cursor:default">${esc(tr('region.scopeGlobal'))}</span>`
          }
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;flex-wrap:wrap">
          ${
            activeId
              ? `<button type="button" class="prism-btn prism-btn-sm" data-action="open-inspector" data-id="${esc(activeId)}">
                   ⚙ ${esc(tx('inspectorBtn'))}
                 </button>`
              : ''
          }
          <button type="button"
                  class="prism-btn prism-btn-sm prism-picker-btn${pickerPicking ? ' is-picking' : ''}${pickerBusy ? ' is-busy' : ''}"
                  data-action="${pickerPicking ? 'cancel-host-pick' : 'pick-host-region'}"
                  aria-pressed="${pickerPicking ? 'true' : 'false'}"
                  title="${esc(tr('editor.pickHostHint'))}"
                  ${pickerBusy ? 'disabled' : ''}>
            ${esc(pickerPicking ? tr('editor.pickHostCancel') : tr('editor.pickHostBtn'))}
          </button>
          <button type="button" class="prism-btn prism-btn-sm prism-btn-primary" data-action="open-visual-editor">
            ${esc(tr('editor.openBtn'))}
          </button>
        </div>
      </div>

      <!-- Row 2: Compact Named Snapshot Switcher + Expand/Collapse All + Custom Badge -->
      <div class="prism-skin-preset-row">
        <div class="prism-preset-bar-left">
          <select id="prism-skin-preset-select" class="prism-select prism-preset-select"
                  data-action="quick-switch-profile-preset"
                  aria-label="${esc(tr('preset.switcherLabel'))}"
                  ${busy ? 'disabled' : ''}>
            ${
              !activePreset
                ? `<option value="" selected disabled>${esc(isZh ? '— 自定义 / 未选择快照 —' : '— Custom / None —')}</option>`
                : ''
            }
            ${visiblePresets
              .map((p) => {
                const isAct = p.id === activePresetId;
                const pName = isZh ? p.name : p.nameEn || p.name;
                const suffix = isAct && isDirty ? ` · ${tx('dirtyBadge')}` : '';
                return `<option value="${esc(p.id)}" ${isAct ? 'selected' : ''}>${esc(pName)}${esc(suffix)}</option>`;
              })
              .join('')}
          </select>
          ${isDirty ? `<span class="prism-dirty-badge">${esc(tx('dirtyBadge'))}</span>` : ''}
          <button type="button" class="prism-btn prism-btn-sm" data-action="open-presets-create" ${busy ? 'disabled' : ''}>
            ${esc(tr('preset.newBtn'))}
          </button>
          ${
            activePreset && !activePreset.builtin
              ? overwriteArmed
                ? `
                  <button type="button" class="prism-btn prism-btn-sm prism-btn-danger"
                          data-action="overwrite-profile-preset" data-id="${esc(activePreset.id)}" data-payload="${esc(activePreset.id)}" ${busy ? 'disabled' : ''}>
                    ✓ ${esc(tr('preset.overwriteBtn'))}
                  </button>
                  <button type="button" class="prism-btn prism-btn-sm" data-action="cancel-confirm">✕</button>
                `
                : `
                  <button type="button" class="prism-btn prism-btn-sm ${isDirty ? 'prism-btn-primary' : ''}"
                          data-action="arm-confirm" data-confirm-key="${esc(overwriteConfirmKey)}" ${busy ? 'disabled' : ''}>
                    ${esc(tr('preset.overwriteBtn'))}
                  </button>
                `
              : ''
          }
          <button type="button" class="prism-btn prism-btn-sm" data-action="open-drawer" data-drawer="presets" ${busy ? 'disabled' : ''}>
            ${esc(tr('preset.manageBtn'))}
          </button>
        </div>

        <div class="prism-preset-bar-right">
          <button type="button" class="prism-btn prism-btn-sm" data-action="toggle-all-regions">
            ${esc(anyOpen ? tr('region.collapseAll') : tr('region.expandAll'))}
          </button>
          <span id="prism-total-custom-badge" class="prism-region-custom-badge ${totalCustom > 0 ? 'is-custom' : ''}" data-total-custom-badge="true">
            ${esc(totalCustom > 0 ? tr('region.customCount', { n: totalCustom }) : tr('glass.comp.allAuto'))}
          </span>
        </div>
      </div>
      ${
        pickerPicking
          ? `
        <div id="prism-skin-picker-banner" class="prism-picker-banner" role="status" aria-live="polite">
          <div class="prism-picker-banner-info">
            <span class="prism-picker-pulse-dot" aria-hidden="true"></span>
            <span class="prism-picker-banner-text">${esc(tr('editor.pickHostActiveBanner'))}</span>
          </div>
          <button type="button" class="prism-btn prism-btn-sm prism-btn-danger" data-action="cancel-host-pick">
            ${esc(tr('editor.pickHostCancel'))}
          </button>
        </div>
      `
          : ''
      }
    </div>
  `;
}

export function renderPresetsGridHtml() {
  const isZh = curLocale() === 'zh';
  const visiblePresets = getVisiblePresets();
  const busy = Boolean(store.profileOpBusy);

  return visiblePresets
    .map((p) => {
      const isAct = store.config.activeProfilePresetId === p.id;
      const pName = isZh ? p.name : p.nameEn || p.name;
      const pDesc = isZh ? p.description || '' : p.descriptionEn || p.description || '';
      const hasBoundWall = Boolean(
        p.includesWallpaper || p.includeWallpaper || p.wallpaperId || p.patch?.activeWallpaperId || p.patch?.wallpaperId,
      );
      const isRenaming = store.presetRenameTargetId === p.id;
      const delKey = `del-preset:${p.id}`;
      const delArmed = store.armedConfirm?.key === delKey;
      const ovKey = `overwrite-preset:${p.id}`;
      const ovArmed = store.armedConfirm?.key === ovKey;

      return `
        <div class="prism-preset-card ${isAct ? 'is-active' : ''}" data-preset-id="${esc(p.id)}">
          ${
            isRenaming
              ? `
            <div class="prism-preset-rename-row">
              <input id="prism-preset-rename-in" type="text" class="prism-input"
                     data-preset-id="${esc(p.id)}"
                     value="${esc(store.presetRenameDraft || pName)}" />
              <button type="button" class="prism-btn prism-btn-sm prism-btn-primary"
                      data-action="commit-rename-preset" data-id="${esc(p.id)}" ${busy ? 'disabled' : ''}>✓</button>
              <button type="button" class="prism-btn prism-btn-sm"
                      data-action="cancel-rename-preset">✕</button>
            </div>
          `
              : `
            <div class="prism-preset-card-head">
              <strong class="prism-preset-card-title" title="${esc(pName)}">${esc(pName)}</strong>
              <div class="prism-preset-card-meta">
                ${hasBoundWall ? `<span class="prism-preset-tag is-wall">${esc(tr('preset.includesWallpaperBadge'))}</span>` : ''}
                ${p.builtin ? `<span class="prism-preset-tag">${esc(isZh ? '内置' : 'Builtin')}</span>` : ''}
                ${isAct ? '<span style="color:var(--prism-accent);font-size:11px">●</span>' : ''}
              </div>
            </div>
          `
          }
          ${pDesc ? `<div class="prism-preset-card-desc">${esc(pDesc)}</div>` : ''}
          <div class="prism-preset-card-actions">
            <button type="button" class="prism-btn prism-btn-sm ${isAct ? 'prism-btn-primary' : ''}"
                    data-action="apply-profile-preset" data-id="${esc(p.id)}" ${busy ? 'disabled' : ''}>
              ${esc(tr('common.apply'))}
            </button>
            ${
              !p.builtin
                ? ovArmed
                  ? `
                    <button type="button" class="prism-btn prism-btn-sm prism-btn-danger"
                            data-action="overwrite-profile-preset" data-id="${esc(p.id)}" data-payload="${esc(p.id)}" ${busy ? 'disabled' : ''}>
                      ✓ ${esc(tr('preset.overwriteBtn'))}
                    </button>
                    <button type="button" class="prism-btn prism-btn-sm" data-action="cancel-confirm">✕</button>
                  `
                  : `
                    <button type="button" class="prism-btn prism-btn-sm"
                            data-action="arm-confirm" data-confirm-key="${esc(ovKey)}" ${busy ? 'disabled' : ''}>
                      ${esc(tr('preset.overwriteBtn'))}
                    </button>
                  `
                : ''
            }
            ${
              !p.builtin
                ? `<button type="button" class="prism-btn prism-btn-sm"
                           data-action="start-rename-preset" data-id="${esc(p.id)}" ${busy ? 'disabled' : ''}>
                     ${esc(tr('preset.renameBtn'))}
                   </button>`
                : ''
            }
            <button type="button" class="prism-btn prism-btn-sm"
                    data-action="duplicate-profile-preset" data-id="${esc(p.id)}" ${busy ? 'disabled' : ''}>
              ${esc(tr('preset.duplicateBtn'))}
            </button>
            <button type="button" class="prism-btn prism-btn-sm"
                    data-action="export-profile-preset" data-id="${esc(p.id)}" ${busy ? 'disabled' : ''}>
              ${esc(tr('preset.export'))}
            </button>
            ${
              delArmed
                ? `
                  <button type="button" class="prism-btn prism-btn-sm prism-btn-danger"
                          data-action="delete-profile-preset" data-payload="${esc(p.id)}" data-id="${esc(p.id)}" ${busy ? 'disabled' : ''}>✓</button>
                  <button type="button" class="prism-btn prism-btn-sm" data-action="cancel-confirm">✕</button>
                `
                : `
                  <button type="button" class="prism-btn prism-btn-sm"
                          data-action="arm-confirm" data-confirm-key="${esc(delKey)}" ${busy ? 'disabled' : ''}
                          title="${esc(tr('preset.delete'))}">🗑</button>
                `
            }
          </div>
        </div>
      `;
    })
    .join('');
}

export function renderPresetsManagerDrawerHtml() {
  const busy = Boolean(store.profileOpBusy);
  const draft = store.presetDraft || { name: '', description: '', includeWallpaper: false };

  return `
    <div class="prism-drawer-backdrop" data-action="backdrop-close">
      <aside class="prism-drawer agy-prism-drawer" data-drawer-kind="presets">
        <div class="prism-drawer-head">
          <span class="prism-drawer-title">❖ ${esc(tr('preset.profileTitle'))}</span>
          <div class="prism-presets-drawer-head-actions">
            <button type="button" class="prism-btn prism-btn-sm" data-action="trigger-preset-import" ${busy ? 'disabled' : ''}>
              📥 ${esc(tr('preset.import'))}
            </button>
            <button type="button" class="prism-icon-btn" data-action="close-drawer">✕</button>
          </div>
        </div>
        <div class="prism-drawer-body">
          <!-- Create New Snapshot Form sits OUTSIDE #prism-presets-grid so partial grid updates never destroy inputs -->
          <div class="prism-preset-create-form">
            <div class="prism-preset-create-inputs">
              <input id="prism-preset-name-in" type="text" class="prism-input"
                     placeholder="${esc(tx('savePresetPlaceholder'))}"
                     value="${esc(draft.name || '')}" />
              <input id="prism-preset-desc-in" type="text" class="prism-input"
                     placeholder="${esc(tx('savePresetDescPlaceholder'))}"
                     value="${esc(draft.description || '')}" />
            </div>
            <div class="prism-preset-create-foot">
              <label class="prism-checkbox-row">
                <input id="prism-preset-include-wall" type="checkbox" ${draft.includeWallpaper ? 'checked' : ''} />
                <span>${esc(tr('preset.includeWallpaper'))}</span>
              </label>
              <button type="button" class="prism-btn prism-btn-sm prism-btn-primary"
                      data-action="save-profile-preset" ${busy ? 'disabled' : ''}>
                💾 ${esc(tr('preset.save'))}
              </button>
            </div>
          </div>

          <!-- Surgically refreshable snapshot list host -->
          <div id="prism-presets-grid" class="prism-presets-grid">
            ${renderPresetsGridHtml()}
          </div>
        </div>
        <div class="prism-drawer-foot">
          <button type="button" class="prism-btn" data-action="close-drawer">${esc(tr('common.close'))}</button>
        </div>
      </aside>
    </div>
  `;
}

function renderRegionGlassEnabledRow(rid, glassEnabled) {
  const curVal = glassEnabled === true ? 'true' : glassEnabled === false ? 'false' : 'auto';
  const opts = [
    { val: 'auto', label: tr('region.followGlobal') },
    { val: 'true', label: tr('layout.borders.on') },
    { val: 'false', label: tr('layout.borders.off') },
  ];
  return `
    <div class="prism-ctl-row">
      <div class="prism-ctl-label">
        <span class="prism-ctl-name">${esc(tr('region.prop.glassEnabled'))}</span>
      </div>
      <div class="prism-seg">
        ${opts
          .map(
            (o) => `
          <button type="button" class="prism-seg-btn ${curVal === o.val ? 'is-active' : ''}"
                  data-action="set-region-prop" data-region="${esc(rid)}" data-prop="glassEnabled" data-val="${esc(o.val)}">
            ${esc(o.label)}
          </button>
        `,
          )
          .join('')}
      </div>
    </div>
  `;
}

function renderRegionBorderStyleRow(rid, borderStyle) {
  const curVal = borderStyle || 'auto';
  const opts = [
    { val: 'auto', label: tr('region.prop.borderStyle.auto') },
    { val: 'full', label: tr('region.prop.borderStyle.full') },
    { val: 'bottom', label: tr('region.prop.borderStyle.bottom') },
    { val: 'none', label: tr('region.prop.borderStyle.none') },
  ];
  return `
    <div class="prism-ctl-row">
      <div class="prism-ctl-label">
        <span class="prism-ctl-name">${esc(tr('region.prop.borderStyle'))}</span>
      </div>
      <div class="prism-seg">
        ${opts
          .map(
            (o) => `
          <button type="button" class="prism-seg-btn ${curVal === o.val ? 'is-active' : ''}"
                  data-action="set-region-prop" data-region="${esc(rid)}" data-prop="borderStyle" data-val="${esc(o.val)}">
            ${esc(o.label)}
          </button>
        `,
          )
          .join('')}
      </div>
    </div>
  `;
}

function renderRegionTintRow(rid, entry, surfaceFill) {
  const curTint = typeof entry.tint === 'string' ? entry.tint.trim() : '';
  const pickerHex = /^#[0-9a-f]{6}$/i.test(curTint) ? curTint : '#141417';

  return `
    <div class="prism-fg-color-ctl">
      <div class="prism-fg-color-top">
        <div class="prism-ctl-label">
          <span class="prism-ctl-name">${esc(tr('region.prop.tint'))}</span>
          <span class="prism-ctl-hint">${esc(tr('glass.comp.tintGuardHint'))}</span>
        </div>
        <div class="prism-color-picker-wrap">
          <span class="prism-region-swatch" aria-hidden="true">
            <span class="prism-region-swatch-fill" style="background:${esc(surfaceFill)}"></span>
          </span>
          <input type="color" class="prism-color-input" value="${esc(pickerHex)}"
                 data-action="set-region-color" data-region="${esc(rid)}" data-prop="tint" />
          <button type="button" class="prism-btn prism-btn-sm ${!curTint ? 'prism-btn-primary' : ''}"
                  data-action="clear-region-prop" data-region="${esc(rid)}" data-prop="tint">
            ${esc(tr('glass.comp.tintAuto'))}
          </button>
        </div>
      </div>
      <div class="prism-filter-group">
        ${CURATED_TINT_SWATCHES.map((sw) => {
          const swHex = String(sw.hex || '#141417').toUpperCase();
          const isSel = curTint.toUpperCase() === swHex;
          const swLabel = tr(sw.key || sw.labelKey || swHex);
          return `
            <button type="button" class="prism-chip ${isSel ? 'is-active' : ''}"
                    data-action="pick-region-tint" data-region="${esc(rid)}" data-hex="${esc(swHex)}" title="${esc(swHex)}">
              <span class="prism-accent-dot" style="background:${esc(swHex)}"></span>
              <span>${esc(swLabel)}</span>
            </button>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderSidebarRadiusChips(legacyKey, currentVal) {
  const cur = String(currentVal || 'auto');
  const chips = [
    { val: 'auto', label: tr('region.prop.radiusAuto') },
    { val: 'native', label: tr('region.prop.radiusNative') },
    { val: '0', label: tr('region.prop.radiusZero') },
  ];
  return `
    <div class="prism-filter-group" style="margin-top:-2px;margin-bottom:4px">
      ${chips
        .map(
          (c) => `
        <button type="button" class="prism-chip ${cur === c.val ? 'is-active' : ''}"
                data-action="set-enum" data-key="${esc(legacyKey)}" data-val="${esc(c.val)}">
          ${esc(c.label)}
        </button>
      `,
        )
        .join('')}
    </div>
  `;
}

function renderCardSubgroupHtml(eff, tokens, isLight) {
  const rid = 'card';
  const entry = getRegionEntry(eff, rid);
  const bounds = SURFACE_TINT_BOUNDS.card || { minOpacity: 0, maxOpacity: 0.98 };
  const surf = resolveSimRegionSurface(rid, eff, tokens, isLight);
  const surfaceFill = surf?.rgba || 'rgba(20, 20, 24, 0.78)';
  const defAlpha = resolveComponentDefaultAlpha(rid, eff, isLight);
  const radiusFallback = eff.layoutMode === 'flush' ? 0 : eff.cornerStyle === 'sharp' ? 6 : eff.cornerStyle === 'soft' ? 16 : 12;
  const customN = countRegionCustomProps(rid, eff);

  return `
    <div class="prism-region-subgroup" data-region-subgroup="card">
      <div class="prism-region-subgroup-head">
        <div style="display:flex;align-items:center;gap:6px">
          <span class="prism-region-swatch" aria-hidden="true">
            <span class="prism-region-swatch-fill" style="background:${esc(surfaceFill)}"></span>
          </span>
          <span class="prism-region-subgroup-title">${esc(tr('region.card'))}</span>
          ${customN > 0 ? `<span class="prism-region-badge is-custom" data-region-badge="card">${esc(tr('region.customCount', { n: customN }))}</span>` : ''}
        </div>
        <button type="button" class="prism-btn prism-btn-sm" data-action="reset-region" data-region="card" title="${esc(tr('region.resetRegion'))}">↺</button>
      </div>
      ${renderSliderRow({
        key: 'regions.card.opacity',
        label: tr('region.prop.opacity'),
        value: entry.opacity ?? null,
        defaultValue: defAlpha,
        min: bounds.minOpacity,
        max: bounds.maxOpacity,
        step: 0.01,
        scale: 100,
        decimals: 0,
        suffix: ' %',
        nullable: true,
        nullableFallbackKey: 'glassOpacity',
        fallbackValue: defAlpha,
        comp: 'card',
        region: 'card',
        prop: 'opacity',
        resetAction: 'reset-region-prop',
      })}
      ${renderSliderRow({
        key: 'regions.card.blur',
        label: tr('region.prop.blur'),
        value: entry.blur ?? null,
        defaultValue: 0,
        min: 0,
        max: 64,
        step: 1,
        suffix: ' px',
        nullable: true,
        fallbackValue: 0,
        comp: 'card',
        region: 'card',
        prop: 'blur',
        resetAction: 'reset-region-prop',
      })}
      ${renderSliderRow({
        key: 'regions.card.tone',
        label: tr('region.prop.tone'),
        value: Number(entry.tone || 0),
        defaultValue: 0,
        min: -100,
        max: 100,
        step: 1,
        suffix: '',
        comp: 'card',
        region: 'card',
        prop: 'tone',
        resetAction: 'reset-region-prop',
      })}
      ${renderRegionTintRow('card', entry, surfaceFill)}
      ${renderSliderRow({
        key: 'regions.card.borderOpacity',
        label: tr('region.prop.borderOpacity'),
        value: entry.borderOpacity ?? null,
        defaultValue: 1,
        min: 0,
        max: 1,
        step: 0.01,
        scale: 100,
        decimals: 0,
        suffix: ' %',
        nullable: true,
        fallbackValue: surf?.borderFactor ?? 0.5,
        comp: 'card',
        region: 'card',
        prop: 'borderOpacity',
        resetAction: 'reset-region-prop',
      })}
      ${renderRegionBorderStyleRow('card', entry.borderStyle)}
      ${renderSliderRow({
        key: 'regions.card.radius',
        label: tr('region.prop.radius'),
        value: entry.radius ?? null,
        defaultValue: radiusFallback,
        min: 0,
        max: 28,
        step: 1,
        suffix: ' px',
        nullable: true,
        fallbackValue: radiusFallback,
        comp: 'card',
        region: 'card',
        prop: 'radius',
        resetAction: 'reset-region-prop',
      })}
    </div>
  `;
}

function renderStandardRegionBody(rid, eff, tokens, isLight) {
  const entry = getRegionEntry(eff, rid);
  const bounds = SURFACE_TINT_BOUNDS[rid] || { minOpacity: 0, maxOpacity: 0.98 };
  const fsBounds = REGION_FONT_SIZE_BOUNDS[rid] || { min: 10, max: 24 };
  const surf = resolveSimRegionSurface(rid, eff, tokens, isLight);
  const surfaceFill = surf?.rgba || 'rgba(20, 20, 24, 0.76)';
  const defAlpha = resolveComponentDefaultAlpha(rid, eff, isLight);
  const isSidebar = rid === 'sidebar';
  const isRightPane = rid === 'rightPane';
  const radiusFallback = eff.layoutMode === 'flush' ? 0 : eff.cornerStyle === 'sharp' ? 6 : eff.cornerStyle === 'soft' ? 16 : 12;

  const opKey = isSidebar ? 'sidebarOpacity' : `regions.${rid}.opacity`;
  const opVal = isSidebar ? (eff.sidebarOpacity ?? entry.opacity ?? null) : (entry.opacity ?? null);
  const blurKey = isSidebar ? 'sidebarBlur' : `regions.${rid}.blur`;
  const blurVal = isSidebar ? (eff.sidebarBlur ?? entry.blur ?? null) : (entry.blur ?? null);
  const fsKey = isSidebar ? 'sidebarFontSize' : `regions.${rid}.fontSize`;
  const fsVal = isSidebar ? (eff.sidebarFontSize ?? entry.fontSize ?? null) : (entry.fontSize ?? null);
  const fsFallback = eff.globalFontSize ?? (isSidebar ? 13 : 14);

  const parts = [];

  if (rid === 'topbar') {
    parts.push(
      renderSegRow({
        key: 'topbarStyle',
        label: tr('layout.topbarStyle'),
        value: eff.topbarStyle || DEFAULT_CONFIG.topbarStyle || 'pills',
        options: TOPBAR_STYLES.map((s) => ({ value: s, label: tr(`layout.topbarStyle.${s}`) })),
      }),
    );
  }

  if (rid === 'wco') {
    parts.push(
      renderSwitchRow({
        key: 'transparentWindowControls',
        label: tr('layout.transparentWindowControls'),
        hint: tr('layout.transparentWindowControlsHint'),
        checked: eff.transparentWindowControls !== false,
      }),
    );
    if (eff.transparentWindowControls === false) {
      parts.push(`<div class="prism-region-notice">ℹ ${esc(tr('glass.comp.wcoRequiresTransparent'))}</div>`);
    }
  }

  // Optical 6 keys (keeping sidebarOpacity & sidebarBlur inside details[data-region="sidebar"]!)
  parts.push(renderRegionGlassEnabledRow(rid, entry.glassEnabled));
  parts.push(
    renderSliderRow({
      key: opKey,
      label: isSidebar ? tr('glass.sidebarOpacity') : tr('region.prop.opacity'),
      value: opVal,
      defaultValue: defAlpha,
      min: bounds.minOpacity,
      max: bounds.maxOpacity,
      step: 0.01,
      scale: 100,
      decimals: 0,
      suffix: ' %',
      nullable: true,
      nullableFallbackKey: rid === 'popover' ? '' : 'glassOpacity',
      fallbackValue: defAlpha,
      comp: rid,
      region: rid,
      prop: 'opacity',
      resetAction: isSidebar ? 'reset-key' : 'reset-region-prop',
    }),
  );
  parts.push(
    renderSliderRow({
      key: blurKey,
      label: isSidebar ? tr('glass.sidebarBlur') : tr('region.prop.blur'),
      value: blurVal,
      defaultValue: eff.glassBlur,
      min: 0,
      max: 64,
      step: 1,
      suffix: ' px',
      nullable: true,
      nullableFallbackKey: 'glassBlur',
      fallbackValue: eff.glassBlur,
      comp: rid,
      region: rid,
      prop: 'blur',
      resetAction: isSidebar ? 'reset-key' : 'reset-region-prop',
    }),
  );
  parts.push(
    renderSliderRow({
      key: `regions.${rid}.tone`,
      label: tr('region.prop.tone'),
      value: Number(entry.tone || 0),
      defaultValue: 0,
      min: -100,
      max: 100,
      step: 1,
      suffix: '',
      comp: rid,
      region: rid,
      prop: 'tone',
      resetAction: 'reset-region-prop',
    }),
  );
  parts.push(renderRegionTintRow(rid, entry, surfaceFill));
  parts.push(
    renderSliderRow({
      key: `regions.${rid}.borderOpacity`,
      label: tr('region.prop.borderOpacity'),
      value: entry.borderOpacity ?? null,
      defaultValue: 1,
      min: 0,
      max: 1,
      step: 0.01,
      scale: 100,
      decimals: 0,
      suffix: ' %',
      nullable: true,
      fallbackValue: surf?.borderFactor ?? 0.5,
      comp: rid,
      region: rid,
      prop: 'borderOpacity',
      resetAction: 'reset-region-prop',
    }),
  );

  // Border style & radius
  parts.push(renderRegionBorderStyleRow(rid, entry.borderStyle));
  parts.push(
    renderSliderRow({
      key: `regions.${rid}.radius`,
      label: isSidebar
        ? tr('layout.leftSidebarRadius')
        : isRightPane
          ? tr('layout.rightSidebarRadius')
          : tr('region.prop.radius'),
      value: entry.radius ?? null,
      defaultValue: radiusFallback,
      min: 0,
      max: 28,
      step: 1,
      suffix: ' px',
      nullable: true,
      fallbackValue: radiusFallback,
      comp: rid,
      region: rid,
      prop: 'radius',
      resetAction: 'reset-region-prop',
    }),
  );
  if (isSidebar) {
    parts.push(renderSidebarRadiusChips('leftSidebarRadius', eff.leftSidebarRadius));
    parts.push(
      renderSegRow({
        key: 'sidebarListStyle',
        label: tr('sidebar.listStyle'),
        hint: tr('sidebar.listStyleHint'),
        value: eff.sidebarListStyle || DEFAULT_CONFIG.sidebarListStyle,
        options: SIDEBAR_LIST_STYLES.map((st) => ({ value: st, label: tr(`sidebar.listStyle.${st}`) })),
      }),
    );
    parts.push(
      renderSegRow({
        key: 'sidebarTypographyMode',
        label: tr('sidebar.typographyMode'),
        value: eff.sidebarTypographyMode || DEFAULT_CONFIG.sidebarTypographyMode,
        options: SIDEBAR_TYPOGRAPHY_MODES.map((m) => ({ value: m, label: tr(`sidebar.typography.${m}`) })),
      }),
    );
  }
  if (isRightPane) {
    parts.push(renderSidebarRadiusChips('rightSidebarRadius', eff.rightSidebarRadius));
  }

  // Typography & foreground contrast guardrail (D7)
  if (rid !== 'wco') {
    parts.push(
      renderSliderRow({
        key: fsKey,
        label: isSidebar ? tr('sidebar.fontSize') : tr('region.prop.fontSize'),
        hint: isSidebar ? tr('sidebar.fontSizeHint') : '',
        value: fsVal,
        defaultValue: fsFallback,
        min: fsBounds.min,
        max: fsBounds.max,
        step: 1,
        suffix: ' px',
        nullable: true,
        fallbackValue: fsFallback,
        comp: rid,
        region: rid,
        prop: 'fontSize',
        resetAction: isSidebar ? 'reset-key' : 'reset-region-prop',
      }),
    );
    parts.push(
      renderFontFamilyControl({
        key: `regions.${rid}.fontFamily`,
        region: rid,
        label: tr('region.prop.fontFamily'),
        value: entry.fontFamily || '',
      }),
    );
  }
  parts.push(
    renderColorPickerWithWcag({
      key: `regions.${rid}.fontColor`,
      region: rid,
      label: rid === 'wco' ? tr('region.prop.symbolColor') : tr('region.prop.fontColor'),
      value: entry.fontColor || '',
      allowRaw: Boolean(entry.allowRawFontColor),
      eff,
      tokens,
      isLight,
      showWcag: true,
      showAllowRaw: true,
      showCodeHint: rid === 'workspace',
      autoLabel: tr('region.prop.radiusAuto'),
    }),
  );

  // Region-specific extras
  if (rid === 'workspace') {
    parts.push(
      renderSwitchRow({
        key: 'hideWelcomeLogo',
        label: tr('layout.hideWelcomeLogo'),
        hint: tr('layout.hideWelcomeLogoHint'),
        checked: Boolean(eff.hideWelcomeLogo),
      }),
    );
    parts.push(renderCardSubgroupHtml(eff, tokens, isLight));
    parts.push(`
      <div class="prism-region-subgroup">
        <div class="prism-region-subgroup-head">
          <span class="prism-region-subgroup-title">${esc(tr('glass.codeMode'))}</span>
        </div>
        ${renderSegRow({
          key: 'codeReadabilityMode',
          label: tr('glass.codeMode'),
          value: eff.codeReadabilityMode,
          options: CODE_READABILITY_MODES.map((m) => ({ value: m, label: tr(`glass.code.${m}`) })),
        })}
        ${renderSwitchRow({
          key: 'contrastFloor',
          label: tr('glass.contrastFloor'),
          checked: eff.contrastFloor,
        })}
        ${renderSliderRow({
          key: 'chatGlassFidelity',
          label: tr('glass.chatFidelity'),
          value: eff.chatGlassFidelity,
          defaultValue: DEFAULT_CONFIG.chatGlassFidelity,
          min: 0,
          max: 100,
          step: 1,
          suffix: ' %',
        })}
      </div>
    `);
  }

  if (rid === 'composer') {
    const caretHex = /^#[0-9a-f]{6}$/i.test(eff.caretColor || '') ? eff.caretColor : tokens.accent || '#669DF6';
    parts.push(`
      <div class="prism-ctl-row">
        <div class="prism-ctl-label">
          <span class="prism-ctl-name">${esc(tr('glass.caretColor'))}</span>
        </div>
        <div class="prism-color-picker-wrap">
          <input type="color" class="prism-color-input" data-action="set-color-key" data-key="caretColor" value="${esc(caretHex)}" />
          <button type="button" class="prism-btn prism-btn-sm ${!eff.caretColor ? 'prism-btn-primary' : ''}"
                  data-action="set-enum" data-key="caretColor" data-val="">${esc(tr('region.prop.radiusAuto'))}</button>
        </div>
      </div>
    `);
  }

  if (rid === 'popover') {
    parts.push(
      renderSwitchRow({
        key: 'floaterSolidBase',
        label: tr('glass.floaterSolidBase'),
        hint: tr('glass.floaterSolidBaseHint'),
        checked: eff.floaterSolidBase !== false,
      }),
    );
  }

  return parts.join('');
}

function renderGlobalRegionBody(eff, polarity) {
  const isZh = curLocale() === 'zh';
  const isLight = polarity === 'light';
  const tokens = resolveSchemeTokens(eff, polarity);
  const isAcrylicZeroBlur =
    eff.glassSurfaces !== false && Math.round(Number(eff.glassBlur ?? DEFAULT_CONFIG.glassBlur)) === 0;

  return `
    <!-- (a) Layout & Master Glass -->
    <div class="prism-region-subgroup">
      <div class="prism-region-subgroup-head"><span class="prism-region-subgroup-title">${esc(tr('layout.title'))}</span></div>
      ${renderSegRow({
        key: 'layoutMode',
        label: tr('layout.mode'),
        value: eff.layoutMode,
        options: [
          { value: 'islands', label: tr('layout.islands') },
          { value: 'flush', label: tr('layout.flush') },
        ],
      })}
      ${renderSliderRow({
        key: 'islandGap',
        label: tr('layout.islandGap'),
        value: eff.islandGap,
        defaultValue: DEFAULT_CONFIG.islandGap,
        min: 0,
        max: 20,
        step: 1,
        suffix: ' px',
      })}
      ${renderSliderRow({
        key: 'workspacePad',
        label: tr('layout.workspacePad'),
        value: eff.workspacePad,
        defaultValue: DEFAULT_CONFIG.workspacePad,
        min: 0,
        max: 20,
        step: 1,
        suffix: ' px',
      })}
      ${renderSegRow({
        key: 'cornerStyle',
        label: tr('layout.cornerStyle'),
        value: eff.cornerStyle,
        options: CORNER_STYLES.map((c) => ({ value: c, label: tr(`layout.${c}`) })),
      })}
      ${renderSegRow({
        key: 'borders',
        label: tr('layout.borders'),
        value: eff.borders,
        options: BORDER_MODES.map((b) => ({ value: b, label: tr(`layout.borders.${b}`) })),
      })}
      ${renderSwitchRow({
        key: 'shadows',
        label: tr('layout.shadows'),
        checked: eff.shadows,
      })}
      ${renderSwitchRow({
        key: 'glassSurfaces',
        label: tr('glass.surfaces'),
        checked: eff.glassSurfaces,
      })}
      ${renderSliderRow({
        key: 'glassOpacity',
        label: tr('glass.opacity'),
        value: eff.glassOpacity,
        defaultValue: DEFAULT_CONFIG.glassOpacity,
        min: 0.15,
        max: 0.98,
        step: 0.01,
        scale: 100,
        decimals: 0,
        suffix: ' %',
      })}
      ${renderSliderRow({
        key: 'glassBlur',
        label: tr('glass.blur'),
        value: eff.glassBlur,
        defaultValue: DEFAULT_CONFIG.glassBlur,
        min: 0,
        max: 64,
        step: 1,
        suffix: ' px',
      })}
      <div class="prism-ctl-hint" style="margin-top:-2px">${esc(tr('glass.blurHint'))}</div>
      <div class="prism-blur-stops" role="group" aria-label="${esc(tr('glass.blur'))}">
        ${[0, 8, 18, 36, 56]
          .map((px) => {
            const isAct = Math.round(Number(eff.glassBlur ?? DEFAULT_CONFIG.glassBlur)) === px;
            return `<button type="button" class="prism-blur-stop-chip ${isAct ? 'is-active' : ''}" data-action="set-num" data-key="glassBlur" data-val="${px}">${esc(tr(`glass.blurStop.${px}`))}</button>`;
          })
          .join('')}
        <button type="button" class="prism-blur-stop-chip ${isAcrylicZeroBlur ? 'is-active' : ''}"
                data-action="apply-low-gpu-acrylic"
                title="${esc(tr('perf.lowGpuAcrylic'))}">
          ⚡ ${esc(tr('perf.lowGpuAcrylic'))}
        </button>
      </div>
      ${renderSliderRow({
        key: 'glassFidelity',
        label: tr('glass.fidelity'),
        value: eff.glassFidelity,
        defaultValue: DEFAULT_CONFIG.glassFidelity,
        min: 0,
        max: 100,
        step: 1,
        suffix: ' %',
      })}
    </div>

    <!-- (b) Color Schemes & Dynamic Wallpaper Accent -->
    <div class="prism-region-subgroup">
      <div class="prism-region-subgroup-head"><span class="prism-region-subgroup-title">${esc(tr('scheme.title'))}</span></div>
      ${renderSegRow({
        key: 'themeMode',
        label: tr('scheme.themeMode'),
        value: eff.themeMode,
        options: THEME_MODES.map((m) => ({ value: m, label: tr(`scheme.theme.${m}`) })),
      })}
      ${renderSwitchRow({
        key: 'themeFollow',
        label: tr('scheme.themeFollow'),
        checked: eff.themeFollow,
      })}
      <div style="padding:6px 0;border-top:1px solid var(--prism-border-hairline)">
        <div class="prism-ctl-name" style="margin-bottom:6px">${esc(tr('scheme.colorScheme'))}</div>
        <div class="prism-swatch-grid">
          ${COLOR_SCHEME_IDS.map((sid) => {
            const sc = COLOR_SCHEMES[sid];
            const active = eff.colorScheme === sid;
            return `
              <button type="button" class="prism-swatch-card ${active ? 'is-active' : ''}"
                      data-action="set-enum" data-key="colorScheme" data-val="${esc(sid)}">
                <span class="prism-swatch-dots">
                  <span style="background:${esc(sc.swatchDark)}"></span>
                  <span style="background:${esc(sc.swatchLight)}"></span>
                  <span style="background:${esc(sc.swatchAccent)}"></span>
                </span>
                <span class="prism-swatch-name">${esc(isZh ? sc.nameZh.split(' ')[0] : sc.nameEn)}</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>
      <div style="padding:6px 0;border-top:1px solid var(--prism-border-hairline);display:flex;flex-direction:column;gap:6px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span class="prism-ctl-name">${esc(tr('scheme.accentMode'))}</span>
          ${
            eff.accentMode === 'custom'
              ? `<label style="display:inline-flex;align-items:center;gap:5px">
                  <input type="color" class="prism-color-input" data-action="set-color-key" data-key="customAccent" value="${esc(eff.customAccent || '#669DF6')}" />
                  <span style="font-family:var(--prism-font-mono);font-size:11px">${esc(eff.customAccent)}</span>
                </label>`
              : ''
          }
        </div>
        <div class="prism-accent-strip">
          ${ACCENT_MODES.map((am) => {
            let dotColor = COLOR_SCHEMES[eff.colorScheme]?.[polarity]?.accent || '#669DF6';
            if (am === 'dynamic' && eff.extractedAccent) {
              dotColor = polarity === 'light' ? eff.extractedAccent.lightHex : eff.extractedAccent.darkHex;
            } else if (ACCENT_PRESETS[am]) {
              dotColor = polarity === 'light' ? ACCENT_PRESETS[am].light : ACCENT_PRESETS[am].dark;
            } else if (am === 'custom') {
              dotColor = eff.customAccent || '#669DF6';
            }
            return `
              <button type="button" class="prism-accent-chip ${eff.accentMode === am ? 'is-active' : ''}"
                      data-action="set-enum" data-key="accentMode" data-val="${esc(am)}">
                <span class="prism-accent-dot" style="background:${esc(dotColor)}"></span>
                <span>${esc(tr(`scheme.accent.${am}`))}</span>
              </button>
            `;
          }).join('')}
        </div>
        <div style="font-size:10.5px;color:var(--prism-fg-muted);padding-top:2px">${esc(tx('extractedTitle'))}</div>
        <div id="prism-extracted-readout">${renderExtractedSwatchesHtml()}</div>
      </div>
      ${renderSliderRow({
        key: 'wallTintMix',
        label: tr('scheme.wallTintMix'),
        value: eff.wallTintMix,
        defaultValue: DEFAULT_CONFIG.wallTintMix,
        min: 0,
        max: 0.18,
        step: 0.005,
        scale: 100,
        decimals: 1,
        suffix: ' %',
      })}
    </div>

    <!-- (c) Wallpaper Optics & Filters (corrected title — Free Framing lives in Tab 3) -->
    <div class="prism-region-subgroup">
      <div class="prism-region-subgroup-head"><span class="prism-region-subgroup-title">${esc(tx('opticsFiltersTitle'))}</span></div>
      ${renderSliderRow({
        key: 'scrimOpacity',
        label: tr('optics.scrimOpacity'),
        value: eff.scrimOpacity,
        defaultValue: DEFAULT_CONFIG.scrimOpacity,
        min: 0,
        max: 0.92,
        step: 0.01,
        scale: 100,
        decimals: 0,
        suffix: ' %',
      })}
      ${renderColorPickerWithWcag({
        key: 'scrimColor',
        region: '',
        label: tr('optics.scrimColor'),
        value: eff.scrimColor && eff.scrimColor !== 'auto' ? eff.scrimColor : '',
        eff,
        tokens,
        isLight,
        showWcag: false,
        showAllowRaw: false,
        autoLabel: tr('optics.scrimColorAuto'),
      })}
      ${renderSwitchRow({
        key: 'vignette',
        label: tr('optics.vignette'),
        checked: eff.vignette,
      })}
      ${renderSliderRow({
        key: 'mediaOpacity',
        label: tr('optics.mediaOpacity'),
        value: eff.mediaOpacity,
        defaultValue: DEFAULT_CONFIG.mediaOpacity,
        min: 0.05,
        max: 1.0,
        step: 0.01,
        scale: 100,
        decimals: 0,
        suffix: ' %',
      })}
      ${renderSliderRow({
        key: 'mediaBlur',
        label: tr('optics.mediaBlur'),
        value: eff.mediaBlur,
        defaultValue: DEFAULT_CONFIG.mediaBlur,
        min: 0,
        max: 64,
        step: 1,
        suffix: ' px',
      })}
      ${renderSliderRow({
        key: 'mediaBrightness',
        label: tr('optics.mediaBrightness'),
        value: eff.mediaBrightness,
        defaultValue: DEFAULT_CONFIG.mediaBrightness,
        min: 40,
        max: 160,
        step: 1,
        suffix: ' %',
      })}
      ${renderSliderRow({
        key: 'mediaContrast',
        label: tr('optics.mediaContrast'),
        value: eff.mediaContrast,
        defaultValue: DEFAULT_CONFIG.mediaContrast,
        min: 40,
        max: 200,
        step: 1,
        suffix: ' %',
      })}
      ${renderSliderRow({
        key: 'mediaSaturate',
        label: tr('optics.mediaSaturate'),
        value: eff.mediaSaturate,
        defaultValue: DEFAULT_CONFIG.mediaSaturate,
        min: 0,
        max: 200,
        step: 1,
        suffix: ' %',
      })}
      ${renderSliderRow({
        key: 'grainAlpha',
        label: tr('optics.grainAlpha'),
        value: eff.grainAlpha,
        defaultValue: DEFAULT_CONFIG.grainAlpha,
        min: 0,
        max: 0.15,
        step: 0.002,
        scale: 100,
        decimals: 1,
        suffix: ' %',
      })}
      <div class="prism-ctl-row">
        <span class="prism-ctl-name">${esc(tx('filterPreset'))}</span>
        <select class="prism-select" data-action="select-enum" data-key="filterPreset">
          ${FILTER_PRESETS.map((fp) => `<option value="${esc(fp)}" ${eff.filterPreset === fp ? 'selected' : ''}>${esc(fp)}</option>`).join('')}
        </select>
      </div>
    </div>

    <!-- (d) Global Default Typography -->
    <div class="prism-region-subgroup">
      <div class="prism-region-subgroup-head"><span class="prism-region-subgroup-title">${esc(tr('global.typographyTitle'))}</span></div>
      ${renderSliderRow({
        key: 'globalFontSize',
        label: tr('global.fontSize'),
        value: eff.globalFontSize ?? null,
        defaultValue: 14,
        min: 10,
        max: 24,
        step: 1,
        suffix: ' px',
        nullable: true,
        fallbackValue: 14,
      })}
      ${renderFontFamilyControl({
        key: 'globalFontFamily',
        region: '',
        label: tr('global.fontFamily'),
        value: eff.globalFontFamily || '',
      })}
      ${renderColorPickerWithWcag({
        key: 'globalFontColor',
        region: '',
        label: tr('global.fontColor'),
        value: eff.globalFontColor || '',
        eff,
        tokens,
        isLight,
        showWcag: true,
        showAllowRaw: false,
        autoLabel: tr('region.prop.radiusAuto'),
      })}
    </div>

    <!-- (e) Interactive Visual Extensions (with exposed fxClickMode & fxTrailMode) -->
    <div class="prism-region-subgroup">
      <div class="prism-region-subgroup-head"><span class="prism-region-subgroup-title">${esc(tr('ext.title'))}</span></div>
      ${renderSwitchRow({
        key: 'fxEnabled',
        label: tr('ext.fxEnabled'),
        checked: eff.fxEnabled,
      })}
      ${renderSegRow({
        key: 'fxClickMode',
        label: tr('ext.fxClickMode'),
        value: eff.fxClickMode || DEFAULT_CONFIG.fxClickMode,
        options: ['ripple', 'spark', 'both', 'off'].map((m) => ({
          value: m,
          label: tr(`ext.fxClickMode.${m}`),
        })),
      })}
      ${renderSegRow({
        key: 'fxTrailMode',
        label: tr('ext.fxTrailMode'),
        value: eff.fxTrailMode || DEFAULT_CONFIG.fxTrailMode,
        options: ['comet', 'dust', 'off'].map((m) => ({
          value: m,
          label: tr(`ext.fxTrailMode.${m}`),
        })),
      })}
      ${renderSwitchRow({
        key: 'parallaxEnabled',
        label: tr('ext.parallaxEnabled'),
        checked: eff.parallaxEnabled,
      })}
      ${
        eff.parallaxEnabled
          ? renderSliderRow({
              key: 'parallaxStrength',
              label: tr('ext.parallaxStrength'),
              value: eff.parallaxStrength,
              defaultValue: DEFAULT_CONFIG.parallaxStrength,
              min: 0,
              max: 40,
              step: 1,
              suffix: ' px',
            })
          : ''
      }
    </div>
  `;
}

export function mapPickerRegionToAccordionId(regionId) {
  return regionId === 'card' ? 'workspace' : regionId;
}

export function focusSkinRegionAccordionInDom(regionId) {
  if (typeof document === 'undefined' || !regionId) return false;
  const accRid = mapPickerRegionToAccordionId(regionId);
  const det = document.querySelector(`details.prism-region-group[data-region="${accRid}"]`);
  if (!(det instanceof HTMLElement)) return false;
  if ('open' in det && !det.open) {
    det.open = true;
  }
  const targetEl =
    regionId === 'card'
      ? det.querySelector('.prism-region-subgroup[data-region-subgroup="card"]') || det
      : det;
  try {
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch {
    targetEl.scrollIntoView();
  }
  const flashTarget =
    regionId === 'card'
      ? det.querySelector('.prism-region-subgroup[data-region-subgroup="card"]') || det
      : det.querySelector('summary') || det;
  if (flashTarget instanceof HTMLElement) {
    flashTarget.classList.remove('prism-ve-pick-highlight');
    void flashTarget.offsetWidth;
    flashTarget.classList.add('prism-ve-pick-highlight');
    setTimeout(() => flashTarget.classList.remove('prism-ve-pick-highlight'), 1400);
  }
  return true;
}

export function renderRegionGroupHtml(regionId, eff = getEffectiveConfig(), polarity = getResolvedPolarity(eff)) {
  const isLight = polarity === 'light';
  const tokens = resolveSchemeTokens(eff, polarity);
  const open = isRegionOpen(regionId);
  const title = tr(`region.${regionId}`);
  const isGlobal = regionId === 'global';

  const bodyHtml = isGlobal
    ? renderGlobalRegionBody(eff, polarity)
    : renderStandardRegionBody(regionId, eff, tokens, isLight);

  const customCount = countRegionCustomProps(regionId, eff);

  // DEF-SE-2 CRITICAL CONTRACT:
  // Groups 1–7 strictly use `data-action="reset-region" data-region="<id>"`.
  // Group 8 (`global`) EXCLUSIVELY uses `data-action="reset-module" data-keys="...islandGap..."`
  // to protect `verify-all.mjs:L4322` (`summary [data-action="reset-module"]`).
  return renderRegionAccordionShell({
    regionId,
    title,
    icon: isGlobal ? '✦' : '',
    swatchVar: isGlobal ? '' : `--sim-${regionId}-bg`,
    customCount,
    isOpen: open,
    resetAction: isGlobal ? 'reset-module' : 'reset-region',
    resetKeys: isGlobal ? GLOBAL_RESET_KEYS : '',
    bodyHtml,
  });
}

export function renderPrismSkinTab() {
  const eff = getEffectiveConfig();
  const polarity = getResolvedPolarity(eff);

  return `
    ${renderSkinTopActionBarHtml(eff)}
    <div id="prism-region-accordions" class="prism-regions-stack">
      ${REGION_UI_ORDER.map((rid) => renderRegionGroupHtml(rid, eff, polarity)).join('')}
    </div>
  `;
}
