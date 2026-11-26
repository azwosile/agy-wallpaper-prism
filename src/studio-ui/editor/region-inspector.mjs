// Wallpaper Prism Studio UI — Layer 4: 11-Property Region Inspector & Region Tree
// Strict DAG L4: imports ONLY L0 (schema), L1 (state), L2 (optics), L3 (controls).
// Pure named exports only (no `export let`, no destructured exports).

import {
  REGION_IDS,
  SURFACE_TINT_BOUNDS,
  REGION_FONT_SIZE_BOUNDS,
  DEFAULT_REGION_ENTRY,
  DEFAULT_SIDEBAR_REGION_ENTRY,
  SIDEBAR_LIST_STYLES,
  SIDEBAR_TYPOGRAPHY_MODES,
  resolveComponentDefaultAlpha,
  resolveSchemeTokens,
} from '../../shared/schema.mjs';

import {
  store,
  curLocale,
  tr,
  esc,
  getEffectiveConfig,
  getResolvedPolarity,
  hasPerWallpaperPin,
  getActiveId,
} from '../state.mjs';

import {
  resolveSimRegionSurface,
  evaluateRegionFgContrast,
} from '../optics.mjs';

import {
  CURATED_TINT_SWATCHES,
  renderSliderRow,
  renderSwitchRow,
  renderSegRow,
  renderColorPickerWithWcag,
  renderFontFamilyControl,
  countRegionCustomProps,
} from '../controls.mjs';

export const INSPECTABLE_REGIONS = Object.freeze([
  Object.freeze({ id: 'topbar', labelKey: 'region.topbar', glyph: '▭' }),
  Object.freeze({ id: 'wco', labelKey: 'region.wco', glyph: '◫' }),
  Object.freeze({ id: 'sidebar', labelKey: 'region.sidebar', glyph: '◧' }),
  Object.freeze({ id: 'workspace', labelKey: 'region.workspace', glyph: '▢' }),
  Object.freeze({ id: 'card', labelKey: 'region.card', glyph: '▤' }),
  Object.freeze({ id: 'composer', labelKey: 'region.composer', glyph: '⌨' }),
  Object.freeze({ id: 'rightPane', labelKey: 'region.rightPane', glyph: '◨' }),
  Object.freeze({ id: 'popover', labelKey: 'region.popover', glyph: '❏' }),
]);

function getRegionMeta(regionId) {
  return INSPECTABLE_REGIONS.find((r) => r.id === regionId) || INSPECTABLE_REGIONS[2];
}

function getRegionEntry(eff, rid) {
  const base = rid === 'sidebar' ? DEFAULT_SIDEBAR_REGION_ENTRY : DEFAULT_REGION_ENTRY;
  const raw = eff?.regions?.[rid];
  return raw && typeof raw === 'object' ? { ...base, ...raw } : { ...base };
}

function renderGlassEnabledRow(rid, glassEnabled) {
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

function renderBorderStyleRow(rid, borderStyle) {
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

function renderTintPickerRow(rid, entry, surfaceFill) {
  const curTint = typeof entry.tint === 'string' ? entry.tint.trim().toUpperCase() : '';
  const pickerHex = /^#[0-9a-f]{6}$/i.test(curTint) ? curTint : '#141417';

  return `
    <div class="prism-fg-color-ctl">
      <div class="prism-fg-color-top prism-ctl-row">
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
          const isSel = curTint === swHex;
          const swLabel = sw.key ? tr(sw.key) : swHex;
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

function renderSidebarRadiusExtraChips(legacyKey, currentVal, regionRadius = null) {
  const cur = regionRadius !== null && regionRadius !== undefined ? String(regionRadius) : String(currentVal || 'auto');
  const chips = [
    { val: 'auto', label: tr('region.prop.radiusAuto') },
    { val: 'native', label: tr('region.prop.radiusNative') },
    { val: '0', label: tr('region.prop.radiusZero') },
  ];
  return `
    <div class="prism-filter-group">
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

export function renderRegionTreeHtml(selectedRegion = store.selectedRegion) {
  const eff = getEffectiveConfig();
  const polarity = getResolvedPolarity(eff);
  const isLight = polarity === 'light';
  const tokens = resolveSchemeTokens(eff, polarity);
  const activeRid = REGION_IDS.includes(selectedRegion) ? selectedRegion : 'sidebar';

  return `
    <div class="prism-ve-tree-list" role="listbox" aria-label="${esc(tr('editor.treeTitle'))}">
      ${INSPECTABLE_REGIONS.map((meta) => {
        const rid = meta.id;
        const isSel = rid === activeRid;
        const surf = resolveSimRegionSurface(rid, eff, tokens, isLight);
        const customN = countRegionCustomProps(rid, eff);
        const fill = surf?.bgCss || surf?.rgba || 'rgba(20, 20, 24, 0.76)';
        return `
          <button type="button" class="prism-ve-tree-item ${isSel ? 'is-selected' : ''}"
                  role="option" aria-selected="${isSel ? 'true' : 'false'}"
                  data-action="select-editor-region" data-region="${esc(rid)}">
            <span class="prism-ve-tree-item-left">
              <span class="prism-region-swatch" aria-hidden="true">
                <span class="prism-region-swatch-fill" style="background:${esc(fill)}"></span>
              </span>
              <span class="prism-ve-tree-name">${esc(tr(meta.labelKey))}</span>
            </span>
            <span class="prism-ve-tree-count ${customN > 0 ? 'is-custom' : ''}" data-region-tree-count="${esc(rid)}">
              ${customN > 0 ? customN : 'Auto'}
            </span>
          </button>
        `;
      }).join('')}
    </div>
  `;
}

export function renderRegionInspectorHtml(regionId = store.selectedRegion) {
  const rid = REGION_IDS.includes(regionId) ? regionId : 'sidebar';
  const meta = getRegionMeta(rid);
  const eff = getEffectiveConfig();
  const polarity = getResolvedPolarity(eff);
  const isLight = polarity === 'light';
  const tokens = resolveSchemeTokens(eff, polarity);
  const entry = getRegionEntry(eff, rid);
  const bounds = SURFACE_TINT_BOUNDS[rid] || { minOpacity: 0, maxOpacity: 0.98 };
  const fsBounds = REGION_FONT_SIZE_BOUNDS[rid] || { min: 10, max: 24 };
  const surf = resolveSimRegionSurface(rid, eff, tokens, isLight);
  const wcag = evaluateRegionFgContrast(rid, eff, tokens, isLight);
  const customCount = countRegionCustomProps(rid, eff);
  const pinned = hasPerWallpaperPin(getActiveId());
  const isZh = curLocale() === 'zh';

  const defaultAlpha = resolveComponentDefaultAlpha(rid, eff, isLight);
  const opKey = rid === 'sidebar' ? 'sidebarOpacity' : `regions.${rid}.opacity`;
  const opVal = rid === 'sidebar' ? (eff.sidebarOpacity ?? entry.opacity ?? null) : (entry.opacity ?? null);
  const blurKey = rid === 'sidebar' ? 'sidebarBlur' : `regions.${rid}.blur`;
  const blurVal = rid === 'sidebar' ? (eff.sidebarBlur ?? entry.blur ?? null) : (entry.blur ?? null);
  const blurFallback = rid === 'card' ? 0 : eff.glassBlur;
  const radiusFallback =
    eff.layoutMode === 'flush' ? 0 : eff.cornerStyle === 'sharp' ? 6 : eff.cornerStyle === 'soft' ? 16 : 12;
  const fsKey = rid === 'sidebar' ? 'sidebarFontSize' : `regions.${rid}.fontSize`;
  const fsVal = rid === 'sidebar' ? (eff.sidebarFontSize ?? entry.fontSize ?? null) : (entry.fontSize ?? null);
  const fsFallback = eff.globalFontSize ?? (rid === 'sidebar' ? 13 : 14);
  const surfaceFill = surf?.bgCss || surf?.rgba || 'rgba(20, 20, 24, 0.76)';

  const contextRows = [];
  if (rid === 'topbar') {
    contextRows.push(
      renderSegRow({
        key: 'topbarStyle',
        label: tr('layout.topbarStyle'),
        value: eff.topbarStyle,
        options: [
          { value: 'pills', label: tr('layout.topbarStyle.pills') },
          { value: 'bar', label: tr('layout.topbarStyle.bar') },
        ],
      }),
    );
  }
  if (rid === 'wco') {
    contextRows.push(
      renderSwitchRow({
        key: 'transparentWindowControls',
        label: tr('layout.transparentWindowControls'),
        checked: eff.transparentWindowControls,
      }),
    );
    if (!eff.transparentWindowControls) {
      contextRows.push(
        `<div class="prism-region-notice">ℹ ${esc(tr('glass.comp.wcoRequiresTransparent'))}</div>`,
      );
    }
  }
  if (rid === 'workspace') {
    contextRows.push(
      renderSwitchRow({
        key: 'hideWelcomeLogo',
        label: tr('layout.hideWelcomeLogo'),
        checked: eff.hideWelcomeLogo,
      }),
    );
    contextRows.push(
      renderSegRow({
        key: 'codeReadabilityMode',
        label: tr('glass.codeMode'),
        value: eff.codeReadabilityMode,
        options: [
          { value: 'translucent', label: tr('glass.code.translucent') },
          { value: 'frosted', label: tr('glass.code.frosted') },
          { value: 'solid', label: tr('glass.code.solid') },
        ],
      }),
    );
    contextRows.push(
      renderSwitchRow({
        key: 'contrastFloor',
        label: tr('glass.contrastFloor'),
        checked: eff.contrastFloor,
      }),
    );
  }
  if (rid === 'composer') {
    const caretHex = /^#[0-9a-f]{6}$/i.test(eff.caretColor || '') ? eff.caretColor : tokens.accent || '#669DF6';
    contextRows.push(`
      <div class="prism-ctl-row">
        <div class="prism-ctl-label">
          <span class="prism-ctl-name">${esc(tr('glass.caretColor'))}</span>
        </div>
        <div class="prism-color-picker-wrap">
          <input type="color" class="prism-color-input" value="${esc(caretHex)}"
                 data-action="set-color-key" data-key="caretColor" />
          <button type="button" class="prism-btn prism-btn-sm ${!eff.caretColor ? 'prism-btn-primary' : ''}"
                  data-action="reset-key" data-key="caretColor">${esc(tr('region.prop.radiusAuto'))}</button>
        </div>
      </div>
    `);
  }
  if (rid === 'popover') {
    contextRows.push(
      renderSwitchRow({
        key: 'floaterSolidBase',
        label: tr('glass.floaterSolidBase'),
        hint: tr('glass.floaterSolidBaseHint'),
        checked: eff.floaterSolidBase,
      }),
    );
  }

  const sidebarExtraHtml =
    rid === 'sidebar'
      ? `
      <div class="prism-ve-inspector-group">
        <div class="prism-ve-inspector-group-title">${esc(tr('sidebar.listStyle'))}</div>
        ${renderSegRow({
          key: 'sidebarListStyle',
          label: tr('sidebar.listStyle'),
          hint: tr('sidebar.listStyleHint'),
          value: eff.sidebarListStyle || 'capsule',
          options: SIDEBAR_LIST_STYLES.map((st) => ({
            value: st,
            label: tr(`sidebar.listStyle.${st}`),
          })),
        })}
        ${renderSegRow({
          key: 'sidebarTypographyMode',
          label: tr('sidebar.typographyMode'),
          value: eff.sidebarTypographyMode || 'balanced',
          options: SIDEBAR_TYPOGRAPHY_MODES.map((m) => ({
            value: m,
            label: tr(`sidebar.typography.${m}`),
          })),
        })}
        ${
          eff.sidebarTypographyMode !== 'native'
            ? `
          ${renderSliderRow({
            key: 'regions.sidebar.sectionFontSize',
            label: tr('sidebar.sectionFontSize'),
            value: entry.sectionFontSize ?? null,
            defaultValue: 11.5,
            min: 11,
            max: 15,
            step: 0.5,
            decimals: 1,
            suffix: ' px',
            nullable: true,
            fallbackValue: 11.5,
            region: 'sidebar',
            prop: 'sectionFontSize',
            resetAction: 'reset-region-prop',
          })}
          ${renderSliderRow({
            key: 'regions.sidebar.projectFontSize',
            label: tr('sidebar.projectFontSize'),
            value: entry.projectFontSize ?? null,
            defaultValue: 13,
            min: 11,
            max: 15,
            step: 0.5,
            decimals: 1,
            suffix: ' px',
            nullable: true,
            fallbackValue: 13,
            region: 'sidebar',
            prop: 'projectFontSize',
            resetAction: 'reset-region-prop',
          })}
          ${renderSliderRow({
            key: 'regions.sidebar.itemFontSize',
            label: tr('sidebar.itemFontSize'),
            value: entry.itemFontSize ?? null,
            defaultValue: 12.5,
            min: 11,
            max: 15,
            step: 0.5,
            decimals: 1,
            suffix: ' px',
            nullable: true,
            fallbackValue: 12.5,
            region: 'sidebar',
            prop: 'itemFontSize',
            resetAction: 'reset-region-prop',
          })}
        `
            : ''
        }
      </div>
    `
      : '';

  const fontFamilyHtml =
    rid !== 'wco'
      ? renderFontFamilyControl({
          key: `regions.${rid}.fontFamily`,
          region: rid,
          label: tr('region.prop.fontFamily'),
          value: entry.fontFamily || '',
        })
      : '';

  const fgColorHtml = renderColorPickerWithWcag({
    key: `regions.${rid}.fontColor`,
    region: rid,
    label: rid === 'wco' ? tr('region.prop.symbolColor') : tr('region.prop.fontColor'),
    value: entry.fontColor || '',
    allowRaw: Boolean(entry.allowRawFontColor),
    wcag,
    eff,
    tokens,
    isLight,
    showWcag: true,
    showAllowRaw: true,
    showCodeHint: true,
  });

  return `
    <div class="prism-ve-inspector" data-inspect-region="${esc(rid)}">
      <div class="prism-ve-inspector-head">
        <div class="prism-ve-inspector-title-wrap">
          <span class="prism-region-swatch" aria-hidden="true">
            <span class="prism-region-swatch-fill" style="background:${esc(surfaceFill)}"></span>
          </span>
          <div style="min-width:0">
            <div class="prism-ve-inspector-title">${esc(meta.glyph)} ${esc(tr(meta.labelKey))}</div>
            <div class="prism-ctl-hint">
              ${esc(pinned ? tr('region.scopeWallpaper') : tr('region.scopeGlobal'))}
              ·
              <span data-region-badge="${esc(rid)}">${esc(customCount > 0 ? tr('region.customCount', { n: customCount }) : tr('region.followGlobal'))}</span>
            </div>
          </div>
        </div>
        <button type="button" class="prism-btn prism-btn-sm"
                data-action="reset-region" data-region="${esc(rid)}"
                title="${esc(tr('region.resetRegion'))}">
          ↺ ${esc(tr('region.resetRegion'))}
        </button>
      </div>

      ${contextRows.length > 0 ? `<div class="prism-ve-inspector-group">${contextRows.join('')}</div>` : ''}

      <!-- Optical 6 Keys: glassEnabled, opacity, blur, tone, tint, borderOpacity -->
      <div class="prism-ve-inspector-group">
        <div class="prism-ve-inspector-group-title">${esc(isZh ? '毛玻璃与光学属性' : 'Glass & Optics')}</div>
        ${renderGlassEnabledRow(rid, entry.glassEnabled)}
        ${renderSliderRow({
          key: opKey,
          label: tr('region.prop.opacity'),
          value: opVal,
          defaultValue: defaultAlpha,
          min: bounds.minOpacity,
          max: bounds.maxOpacity,
          step: 0.01,
          scale: 100,
          decimals: 0,
          suffix: ' %',
          nullable: true,
          nullableFallbackKey: rid === 'popover' ? '' : 'glassOpacity',
          fallbackValue: defaultAlpha,
          comp: rid,
          region: rid,
          prop: 'opacity',
          resetAction: rid === 'sidebar' ? 'reset-key' : 'reset-region-prop',
        })}
        ${renderSliderRow({
          key: blurKey,
          label: tr('region.prop.blur'),
          value: blurVal,
          defaultValue: blurFallback,
          min: 0,
          max: 64,
          step: 1,
          suffix: ' px',
          nullable: true,
          nullableFallbackKey: rid === 'card' ? '' : 'glassBlur',
          fallbackValue: blurFallback,
          comp: rid,
          region: rid,
          prop: 'blur',
          resetAction: rid === 'sidebar' ? 'reset-key' : 'reset-region-prop',
        })}
        ${renderSliderRow({
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
        })}
        ${renderTintPickerRow(rid, entry, surfaceFill)}
        ${renderSliderRow({
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
          hint: tr('region.prop.borderOpacityAuto'),
        })}
      </div>

      <!-- Geometry & Borders: borderStyle, radius -->
      <div class="prism-ve-inspector-group">
        <div class="prism-ve-inspector-group-title">${esc(isZh ? '边框与圆角几何' : 'Border & Geometry')}</div>
        ${renderBorderStyleRow(rid, entry.borderStyle)}
        ${renderSliderRow({
          key: `regions.${rid}.radius`,
          label: tr('region.prop.radius'),
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
        })}
        ${rid === 'sidebar' ? renderSidebarRadiusExtraChips('leftSidebarRadius', eff.leftSidebarRadius, entry.radius) : ''}
        ${rid === 'rightPane' ? renderSidebarRadiusExtraChips('rightSidebarRadius', eff.rightSidebarRadius, entry.radius) : ''}
      </div>

      ${sidebarExtraHtml}

      <!-- Typography & Foreground Contrast Guardrail: fontSize, fontFamily, fontColor + allowRawFontColor -->
      <div class="prism-ve-inspector-group">
        <div class="prism-ve-inspector-group-title">${esc(isZh ? '字体排版与 WCAG 可读性' : 'Typography & WCAG Contrast')}</div>
        ${renderSliderRow({
          key: fsKey,
          label: rid === 'sidebar' ? tr('sidebar.fontSize') : tr('region.prop.fontSize'),
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
          resetAction: rid === 'sidebar' ? 'reset-key' : 'reset-region-prop',
          hint: rid === 'sidebar' ? tr('sidebar.fontSizeHint') : '',
        })}
        ${fontFamilyHtml}
        ${fgColorHtml}
      </div>
    </div>
  `;
}
