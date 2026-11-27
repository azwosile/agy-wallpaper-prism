// Wallpaper Prism Studio UI — Layer 4: Per-Region Optical & Geometry Inspector & Region Tree
// Strict DAG L4: imports ONLY L0 (schema), L1 (state), L2 (optics), L3 (controls).
// Pure named exports only (no `export let`, no destructured exports).

import {
  REGION_IDS,
  REGION_FONT_SIZE_BOUNDS,
  DEFAULT_REGION_ENTRY,
  DEFAULT_SIDEBAR_REGION_ENTRY,
  SIDEBAR_LIST_STYLES,
  SIDEBAR_TYPOGRAPHY_MODES,
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
  renderSliderRow,
  renderSwitchRow,
  renderSegRow,
  renderColorPickerWithWcag,
  renderFontFamilyControl,
  countRegionCustomProps,
  formatRegionStyleBadge,
  renderRegionBorderStyleRow,
  renderRegionOpticalControlsHtml,
} from '../controls.mjs';

export const INSPECTABLE_REGIONS = Object.freeze([
  Object.freeze({ id: 'topbar', labelKey: 'region.topbar', glyph: '▭', cat: 'chrome' }),
  Object.freeze({ id: 'wco', labelKey: 'region.wco', glyph: '◫', cat: 'chrome' }),
  Object.freeze({ id: 'sidebar', labelKey: 'region.sidebar', glyph: '◧', cat: 'chrome' }),
  Object.freeze({ id: 'workspace', labelKey: 'region.workspace', glyph: '▢', cat: 'chrome' }),
  Object.freeze({ id: 'userBubble', labelKey: 'region.userBubble', glyph: '💬', cat: 'chat' }),
  Object.freeze({ id: 'assistantBubble', labelKey: 'region.assistantBubble', glyph: '✦', cat: 'chat' }),
  Object.freeze({ id: 'codeBlock', labelKey: 'region.codeBlock', glyph: '</>', cat: 'chat' }),
  Object.freeze({ id: 'card', labelKey: 'region.card', glyph: '▤', cat: 'chat' }),
  Object.freeze({ id: 'controls', labelKey: 'region.controls', glyph: '⊞', cat: 'controls' }),
  Object.freeze({ id: 'composer', labelKey: 'region.composer', glyph: '⌨', cat: 'controls' }),
  Object.freeze({ id: 'rightPane', labelKey: 'region.rightPane', glyph: '◨', cat: 'controls' }),
  Object.freeze({ id: 'popover', labelKey: 'region.popover', glyph: '❏', cat: 'controls' }),
]);

const TREE_CATEGORIES = Object.freeze([
  Object.freeze({ id: 'chrome', labelKey: 'region.cat.chrome' }),
  Object.freeze({ id: 'chat', labelKey: 'region.cat.chat' }),
  Object.freeze({ id: 'controls', labelKey: 'region.cat.controls' }),
]);

function getRegionMeta(regionId) {
  return INSPECTABLE_REGIONS.find((r) => r.id === regionId) || INSPECTABLE_REGIONS[2];
}

function getRegionEntry(eff, rid) {
  const base = rid === 'sidebar' ? DEFAULT_SIDEBAR_REGION_ENTRY : DEFAULT_REGION_ENTRY;
  const raw = eff?.regions?.[rid];
  return raw && typeof raw === 'object' ? { ...base, ...raw } : { ...base };
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
      ${TREE_CATEGORIES.map((cat) => {
        const items = INSPECTABLE_REGIONS.filter((m) => m.cat === cat.id);
        return `
          <div class="prism-ve-tree-cat" role="presentation">${esc(tr(cat.labelKey))}</div>
          ${items
            .map((meta) => {
              const rid = meta.id;
              const isSel = rid === activeRid;
              const surf = resolveSimRegionSurface(rid, eff, tokens, isLight);
              const styleBadge = formatRegionStyleBadge(rid, eff);
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
                  <span style="display:inline-flex;align-items:center;gap:4px">
                    <span class="prism-ve-tree-style" data-region-tree-style="${esc(rid)}" data-style-kind="${esc(styleBadge.kind)}">${esc(styleBadge.text)}</span>
                    <span class="prism-ve-tree-count ${customN > 0 ? 'is-custom' : ''}" data-region-tree-count="${esc(rid)}">
                      ${customN > 0 ? customN : 'Auto'}
                    </span>
                  </span>
                </button>
              `;
            })
            .join('')}
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
  const fsBounds = REGION_FONT_SIZE_BOUNDS[rid] || { min: 10, max: 24 };
  const surf = resolveSimRegionSurface(rid, eff, tokens, isLight);
  const wcag = evaluateRegionFgContrast(rid, eff, tokens, isLight);
  const customCount = countRegionCustomProps(rid, eff);
  const pinned = hasPerWallpaperPin(getActiveId());
  const isZh = curLocale() === 'zh';

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
      renderSwitchRow({
        key: 'contrastFloor',
        label: tr('glass.contrastFloor'),
        checked: eff.contrastFloor,
      }),
    );
  }
  if (rid === 'codeBlock') {
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

      <!-- Optical 9 Keys: style, glassEnabled, opacity, blur, saturation, tone, tint, borderOpacity, elevation -->
      <div class="prism-ve-inspector-group">
        <div class="prism-ve-inspector-group-title">${esc(isZh ? '毛玻璃样式与光学属性' : 'Glass Style & Optics')}</div>
        ${renderRegionOpticalControlsHtml(rid, entry, eff, tokens, isLight, {
          surf,
          sidebarLabels: false,
          showBorderAutoHint: true,
        })}
      </div>

      <!-- Geometry & Borders: borderStyle, radius -->
      <div class="prism-ve-inspector-group">
        <div class="prism-ve-inspector-group-title">${esc(isZh ? '边框与圆角几何' : 'Border & Geometry')}</div>
        ${renderRegionBorderStyleRow(rid, entry.borderStyle)}
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
