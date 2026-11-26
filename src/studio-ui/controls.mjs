// Wallpaper Prism Studio UI — Layer 3 Reusable Tactile Controls, WCAG Picker & Region Shell
// Strict DAG L3: imports ONLY ../shared/schema.mjs, ./state.mjs, and ./optics.mjs.
// Zero `export let` live bindings; directly reuses schema.mjs `CJK_SAFE_FONT_PRESETS`.

import {
  REGION_IDS,
  DEFAULT_REGION_ENTRY,
  DEFAULT_SIDEBAR_REGION_ENTRY,
  SCENE_PRESETS,
  SCENE_PRESET_IDS,
  DEFAULT_CONFIG,
  CJK_SAFE_FONT_PRESETS,
  resolveComponentDefaultAlpha,
  sanitizeFontFamily,
} from '../shared/schema.mjs';

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
  isRegionOpen,
} from './state.mjs';

import { evaluateRegionFgContrast } from './optics.mjs';

export const CURATED_TINT_SWATCHES = Object.freeze([
  Object.freeze({ hex: '#0E0E11', key: 'glass.comp.swatchObsidian' }),
  Object.freeze({ hex: '#141B2D', key: 'glass.comp.swatchMidnight' }),
  Object.freeze({ hex: '#1C1917', key: 'glass.comp.swatchCarbon' }),
  Object.freeze({ hex: '#231C35', key: 'glass.comp.swatchIris' }),
  Object.freeze({ hex: '#2B3445', key: 'glass.comp.swatchSlate' }),
]);

// ============================================================================
// Core Tactile Controls (Sliders, Switches, Segmented Rows, Confirmations)
// ============================================================================
export function sliderMeta(val, min, max, decimals = 0, suffix = '') {
  const n = Number(val);
  const safeVal = Number.isFinite(n) ? n : min;
  const pct = max > min ? Math.max(0, Math.min(100, ((safeVal - min) / (max - min)) * 100)) : 0;
  const numTxt = decimals > 0 ? safeVal.toFixed(decimals) : String(Math.round(safeVal));
  return { pct: pct.toFixed(1), display: `${numTxt}${suffix}` };
}

export function renderSliderRow({
  key,
  label,
  value,
  defaultValue,
  min,
  max,
  step = 1,
  scale = 1,
  decimals = 0,
  suffix = '',
  dblResetFraming = false,
  nullable = false,
  nullableFallbackKey = '',
  fallbackValue = null,
  comp = '',
  region = '',
  prop = '',
  resetAction = 'reset-key',
  hint = '',
}) {
  const uiMin = min * scale;
  const uiMax = max * scale;
  const uiStep = step * scale;
  const hintHtml = hint ? `<div class="prism-ctl-hint prism-slider-hint">${esc(hint)}</div>` : '';

  if (nullable || nullableFallbackKey) {
    const isAuto = value === null || value === undefined;
    const resolvedVal = isAuto ? Number(fallbackValue ?? defaultValue ?? min) : Number(value);
    const uiVal = resolvedVal * scale;
    const isDirty = !isAuto;
    const { pct, display: rawDisplay } = sliderMeta(uiVal, uiMin, uiMax, decimals, suffix);
    const display = isAuto ? tr('glass.followMainFmt', { val: rawDisplay }) : rawDisplay;
    const fallbackAttr = nullableFallbackKey ? ` data-fallback-key="${esc(nullableFallbackKey)}"` : '';
    const compAttr = comp ? ` data-comp="${esc(comp)}"` : '';
    const regionAttr = region ? ` data-region="${esc(region)}"` : '';
    const propAttr = prop ? ` data-prop="${esc(prop)}"` : '';
    const resetAttrs =
      resetAction === 'reset-surface-comp' && comp
        ? `data-action="reset-surface-comp" data-comp="${esc(comp)}"`
        : resetAction === 'reset-region-prop' && region && prop
          ? `data-action="reset-region-prop" data-region="${esc(region)}" data-prop="${esc(prop)}"`
          : `data-action="reset-key" data-key="${esc(key)}"`;

    return `
      <div class="prism-slider-row" data-slider-key="${esc(key)}" data-dirty="${isDirty ? 'true' : 'false'}"
           data-nullable="true"${fallbackAttr}${compAttr}${regionAttr}${propAttr}
           data-scale="${scale}" data-min="${uiMin}" data-max="${uiMax}" data-step="${uiStep}"
           data-decimals="${decimals}" data-suffix="${esc(suffix)}" data-default="${Number(defaultValue ?? min)}">
        <span class="prism-slider-label" ${dblResetFraming ? `data-dblreset="true" title="${esc(tx('dblClickFramingHint'))}"` : ''}>${esc(label)}</span>
        <span class="prism-slider-val" data-action="edit-slider-val" title="${esc(tx('clickExactHint'))}">${esc(display)}</span>
        <button type="button" class="prism-reset-btn" ${resetAttrs} title="${esc(tr('common.reset'))}">↺</button>
        <input type="range" class="prism-range" data-config-slider="${esc(key)}"${regionAttr}${propAttr}
               min="${uiMin}" max="${uiMax}" step="${uiStep}" value="${uiVal}"
               style="--prism-pct:${pct}%" />
      </div>
      ${hintHtml}
    `;
  }

  const uiVal = Number(value) * scale;
  const uiDef = Number(defaultValue) * scale;
  const isDirty = Math.abs(uiVal - uiDef) > uiStep * 0.25;
  const { pct, display } = sliderMeta(uiVal, uiMin, uiMax, decimals, suffix);
  const regionAttr = region ? ` data-region="${esc(region)}"` : '';
  const propAttr = prop ? ` data-prop="${esc(prop)}"` : '';
  const resetAttrs =
    resetAction === 'reset-region-prop' && region && prop
      ? `data-action="reset-region-prop" data-region="${esc(region)}" data-prop="${esc(prop)}"`
      : `data-action="reset-key" data-key="${esc(key)}"`;

  return `
    <div class="prism-slider-row" data-slider-key="${esc(key)}" data-dirty="${isDirty ? 'true' : 'false'}"${regionAttr}${propAttr}
         data-scale="${scale}" data-min="${uiMin}" data-max="${uiMax}" data-step="${uiStep}"
         data-decimals="${decimals}" data-suffix="${esc(suffix)}" data-default="${Number(defaultValue)}">
      <span class="prism-slider-label" ${dblResetFraming ? `data-dblreset="true" title="${esc(tx('dblClickFramingHint'))}"` : ''}>${esc(label)}</span>
      <span class="prism-slider-val" data-action="edit-slider-val" title="${esc(tx('clickExactHint'))}">${esc(display)}</span>
      <button type="button" class="prism-reset-btn" ${resetAttrs} title="${esc(tr('common.reset'))}">↺</button>
      <input type="range" class="prism-range" data-config-slider="${esc(key)}"${regionAttr}${propAttr}
             min="${uiMin}" max="${uiMax}" step="${uiStep}" value="${uiVal}"
             style="--prism-pct:${pct}%" />
    </div>
    ${hintHtml}
  `;
}

export function renderSwitchRow({ key, label, hint = '', checked, action = 'toggle-bool', extraAttrs = '' }) {
  const attrs = extraAttrs ? ` ${extraAttrs.trim()}` : '';
  return `
    <div class="prism-ctl-row">
      <div class="prism-ctl-label">
        <span class="prism-ctl-name">${esc(label)}</span>
        ${hint ? `<span class="prism-ctl-hint">${esc(hint)}</span>` : ''}
      </div>
      <button type="button" role="switch" class="prism-switch" aria-checked="${checked ? 'true' : 'false'}"
              data-action="${esc(action)}" data-key="${esc(key)}"${attrs}></button>
    </div>
  `;
}

export function renderSegRow({ key, label, hint = '', value, options, action = 'set-enum', extraAttrs = '' }) {
  const attrs = extraAttrs ? ` ${extraAttrs.trim()}` : '';
  return `
    <div class="prism-ctl-row">
      <div class="prism-ctl-label">
        <span class="prism-ctl-name">${esc(label)}</span>
        ${hint ? `<span class="prism-ctl-hint">${esc(hint)}</span>` : ''}
      </div>
      <div class="prism-seg">
        ${options
          .map(
            (o) => `
          <button type="button" class="prism-seg-btn ${String(value) === String(o.value) ? 'is-active' : ''}"
                  data-action="${esc(action)}" data-key="${esc(key)}" data-val="${esc(o.value)}"${attrs}>${esc(o.label)}</button>
        `,
          )
          .join('')}
      </div>
    </div>
  `;
}

export function renderConfirmRow({ confirmKey, label, hint = '', btnLabel, danger = false, action, payload = '' }) {
  const armed = store.armedConfirm?.key === confirmKey;
  return `
    <div class="prism-confirm-row" data-armed="${armed ? 'true' : 'false'}">
      <div class="prism-ctl-label">
        <span class="prism-ctl-name">${esc(label)}</span>
        ${hint ? `<span class="prism-ctl-hint">${esc(hint)}</span>` : ''}
      </div>
      <div class="prism-confirm-actions">
        ${
          armed
            ? `
          <button type="button" class="prism-btn prism-btn-sm prism-btn-danger"
                  data-action="${esc(action)}" data-confirm-exec="${esc(confirmKey)}" data-payload="${esc(payload)}">✓ ${esc(tr('host.confirmPrompt'))}</button>
          <button type="button" class="prism-btn prism-btn-sm" data-action="cancel-confirm">${esc(tr('host.cancel'))}</button>
        `
            : `
          <button type="button" class="prism-btn prism-btn-sm ${danger ? 'prism-btn-danger' : ''}"
                  data-action="arm-confirm" data-confirm-key="${esc(confirmKey)}">${esc(btnLabel)}</button>
        `
        }
      </div>
    </div>
  `;
}

export function renderScenePresetsHtml(eff) {
  const icons = { crystal: '✦', islands: '❖', focus: '◐', eco: '🍃' };
  const subsZh = { crystal: '64% 高透光感', islands: '76% 均衡磨砂', focus: '柔焦护眼阅读', eco: '静帧零模糊' };
  const subsEn = { crystal: '64% airy acrylic', islands: '76% balanced glass', focus: 'Soft reading veil', eco: 'Paused 0-blur' };
  const isZh = curLocale() === 'zh';

  return `
    <div class="prism-scene-grid">
      ${SCENE_PRESET_IDS.map((id) => {
        const p = SCENE_PRESETS[id];
        const active = eff.preset === id;
        return `
          <button type="button" class="prism-scene-card ${active ? 'is-active' : ''}"
                  data-action="apply-scene-preset" data-preset="${esc(id)}">
            <div class="prism-scene-head">
              <span>${icons[id] || '◆'} ${esc(isZh ? p.nameZh : p.nameEn)}</span>
              ${active ? '<span style="color:var(--prism-accent)">●</span>' : ''}
            </div>
            <div class="prism-scene-sub">${esc(isZh ? subsZh[id] : subsEn[id])}</div>
          </button>
        `;
      }).join('')}
    </div>
  `;
}

// ============================================================================
// D7 WCAG AA Color Picker (with Opposite-Anchor Badge, Raw Unlock & <55% Notice)
// ============================================================================
export function renderColorPickerWithWcag({
  key = '',
  region = '',
  regionId = '',
  label,
  value = '',
  allowRaw = false,
  wcag = null,
  eff = getEffectiveConfig(),
  tokens = null,
  isLight = null,
  showWcag = true,
  showAllowRaw = undefined,
  showCodeHint = false,
  showCuratedSwatches = false,
  autoLabel = '',
  colorAction = '',
  clearAction = '',
  swatchAction = '',
  rawToggleAction = 'toggle-region-raw-fg',
  hint = '',
}) {
  const rid = region || regionId || '';
  const isRegion = Boolean(rid && REGION_IDS.includes(rid));
  const shouldShowAllowRaw = showAllowRaw !== undefined ? Boolean(showAllowRaw) : isRegion;
  const cleanHex = typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value.trim()) ? value.trim().toUpperCase() : '';
  const hasVal = Boolean(cleanHex);
  const resolvedColorAction = colorAction || (isRegion ? 'set-region-color' : 'set-color-key');
  const resolvedClearAction = clearAction || (isRegion ? 'clear-region-prop' : 'set-enum');
  const clearAttrs =
    resolvedClearAction === 'set-enum'
      ? `data-action="set-enum" data-key="${esc(key)}" data-val="${key === 'scrimColor' ? 'auto' : ''}"`
      : `data-action="${esc(resolvedClearAction)}" data-region="${esc(rid)}" data-prop="fontColor" data-key="${esc(key)}"`;
  const inputAttrs = isRegion
    ? `data-action="${esc(resolvedColorAction)}" data-region="${esc(rid)}" data-prop="fontColor" data-key="${esc(key)}"`
    : `data-action="${esc(resolvedColorAction)}" data-key="${esc(key)}"`;
  const resolvedAutoLabel = autoLabel || tr('region.prop.radiusAuto');
  const fallbackPickerHex = cleanHex || ((isLight !== null ? isLight : getResolvedPolarity(eff) === 'light') ? '#0F172A' : '#F2F2F5');

  let wcagHtml = '';
  let lowOpHintHtml = '';
  if (showWcag) {
    const evalRes =
      wcag && typeof wcag === 'object'
        ? wcag
        : evaluateRegionFgContrast(
            isRegion ? rid : 'workspace',
            eff,
            tokens,
            isLight,
            { fgHex: cleanHex, allowRawFontColor: Boolean(allowRaw) },
          );

    const hasCustom = Boolean(cleanHex || evalRes.hasCustomColor || evalRes.rawHex);
    if (hasCustom) {
      let badgeText = '';
      let wcagAttr = 'pass';
      const ratioStr = Number.isFinite(evalRes.ratio) ? evalRes.ratio.toFixed(1) : '—';
      const rawRatioStr = Number.isFinite(evalRes.rawRatio) ? evalRes.rawRatio.toFixed(1) : '—';

      if (evalRes.lowOpacityWarning || evalRes.status === 'low-opacity') {
        wcagAttr = 'low-opacity';
        badgeText = `⚠ ${tr('wcag.lowOpacityWarn')}`;
      } else if (allowRaw) {
        const isWarn = Number.isFinite(evalRes.rawRatio) && evalRes.rawRatio < 4.5;
        wcagAttr = isWarn ? 'warn' : 'pass';
        badgeText = isWarn
          ? `🔓 ${tr('wcag.badgeWarn', { ratio: rawRatioStr })}`
          : `🔓 ${tr('wcag.badgePass', { ratio: rawRatioStr })}`;
      } else if (evalRes.clamped || evalRes.status === 'adjusted') {
        wcagAttr = 'adjusted';
        badgeText = `${tr('wcag.badgeAdjusted', { ratio: ratioStr })}${evalRes.color ? ` (${evalRes.color})` : ''}`;
      } else {
        wcagAttr = 'pass';
        badgeText = tr('wcag.badgePass', { ratio: ratioStr });
      }

      const statusVal = evalRes.status || wcagAttr;
      wcagHtml = `
        <div class="prism-wcag-row" data-wcag-region="${esc(rid || 'global')}">
          <span class="prism-wcag-badge is-${esc(wcagAttr)}" data-wcag="${esc(wcagAttr)}" data-wcag-status="${esc(statusVal)}" data-tone="${esc(wcagAttr === 'low-opacity' ? 'warn' : wcagAttr)}">
            ${wcagAttr === 'adjusted' && evalRes.color ? `<span class="prism-accent-dot" style="background:${esc(evalRes.color)}"></span>` : ''}
            <span>${esc(badgeText)}</span>
          </span>
        </div>
      `;
    } else if (evalRes.lowOpacityWarning || (Number.isFinite(evalRes.bgAlpha) && evalRes.bgAlpha < 0.55)) {
      lowOpHintHtml = `<div class="prism-low-opacity-hint" data-wcag-status="low-opacity">ℹ ${esc(tr('wcag.lowOpacityWarn'))}</div>`;
    }
  }

  const rawToggleHtml =
    showWcag && shouldShowAllowRaw && isRegion
      ? `
      <div class="prism-ctl-row prism-wcag-raw-row">
        <div class="prism-ctl-label">
          <span class="prism-ctl-name prism-raw-color-toggle">${esc(tr('wcag.allowRawToggle'))}</span>
          <span class="prism-ctl-hint">${esc(tr('wcag.allowRawHint'))}</span>
        </div>
        <button type="button" role="switch" class="prism-switch"
                aria-checked="${allowRaw ? 'true' : 'false'}"
                data-action="${esc(rawToggleAction)}"
                data-region="${esc(rid)}"></button>
      </div>
    `
      : '';

  const swatchesHtml = showCuratedSwatches
    ? CURATED_TINT_SWATCHES.map(
        (sw) => `
        <button type="button" class="prism-tint-quick-swatch ${cleanHex === sw.hex ? 'is-active' : ''}"
                style="background:${sw.hex}"
                data-action="${esc(swatchAction || 'pick-surface-tint')}"
                data-comp="${esc(rid)}" data-region="${esc(rid)}" data-hex="${sw.hex}"
                title="${esc(tr(sw.key))} (${sw.hex})"></button>
      `,
      ).join('')
    : '';

  return `
    <div class="prism-fg-color-ctl prism-color-wcag-block" data-color-key="${esc(key)}"${rid ? ` data-region="${esc(rid)}"` : ''}>
      <div class="prism-fg-color-top prism-ctl-row">
        <div class="prism-ctl-label">
          <span class="prism-ctl-name">${esc(label)}</span>
          ${hint ? `<span class="prism-ctl-hint">${esc(hint)}</span>` : ''}
        </div>
        <div class="prism-color-picker-wrap prism-tint-color-ctls">
          <input type="color" class="prism-color-input" ${inputAttrs} value="${esc(fallbackPickerHex)}" />
          ${hasVal ? `<span class="prism-color-hex-code">${esc(cleanHex)}</span>` : ''}
          ${swatchesHtml}
          <button type="button" class="prism-btn prism-btn-sm ${!hasVal ? 'prism-btn-primary' : ''}" ${clearAttrs}>
            ${esc(resolvedAutoLabel)}
          </button>
        </div>
      </div>
      ${wcagHtml}
      ${lowOpHintHtml}
      ${rawToggleHtml}
      ${showCodeHint ? `<div class="prism-ctl-hint">${esc(tr('wcag.codeProtectedHint'))}</div>` : ''}
    </div>
  `;
}

// ============================================================================
// CJK-Safe Font Stack Selector (Directly Consumes schema.mjs CJK_SAFE_FONT_PRESETS)
// ============================================================================
export function renderFontFamilyControl({
  key = '',
  region = '',
  regionId = '',
  label,
  value = '',
  selectAction = '',
  inputAction = '',
  resetAction = '',
}) {
  const rid = region || regionId || '';
  const rawVal = typeof value === 'string' ? value.trim() : '';
  const sanitized = sanitizeFontFamily(rawVal);
  const isInvalid = Boolean(rawVal && !sanitized);
  const matchedPreset = CJK_SAFE_FONT_PRESETS.find((p) => p.value === sanitized || p.value === rawVal);
  const selectedId = matchedPreset ? matchedPreset.id : rawVal ? '__custom__' : 'system';

  const isRegion = Boolean(rid && REGION_IDS.includes(rid));
  const resolvedSelectAct = selectAction || (isRegion ? 'select-region-font-preset' : 'select-global-font-preset');
  const resolvedInputAct = inputAction || (isRegion ? 'set-region-font-family' : 'set-global-font-family');
  const resolvedResetAct = resetAction || (isRegion ? 'clear-region-prop' : 'set-enum');
  const regionAttr = isRegion ? ` data-region="${esc(rid)}"` : '';
  const resetAttrs = isRegion
    ? `data-action="${esc(resolvedResetAct)}" data-region="${esc(rid)}" data-prop="fontFamily"`
    : `data-action="${esc(resolvedResetAct)}" data-key="${esc(key || 'globalFontFamily')}" data-val=""`;

  return `
    <div class="prism-font-ctl prism-font-control" data-font-key="${esc(key)}"${regionAttr}>
      <div class="prism-font-ctl-head prism-ctl-row">
        <div class="prism-ctl-label">
          <span class="prism-ctl-name">${esc(label)}</span>
        </div>
        <div class="prism-font-ctl-inputs">
          <select class="prism-select prism-font-select"
                  data-action="${esc(resolvedSelectAct)}" data-key="${esc(key)}"${regionAttr}>
            ${CJK_SAFE_FONT_PRESETS.map(
              (preset) => `
              <option value="${esc(preset.id)}" data-font-value="${esc(preset.value)}" ${selectedId === preset.id ? 'selected' : ''}>
                ${esc(tr(preset.labelKey))}
              </option>
            `,
            ).join('')}
            ${selectedId === '__custom__' ? `<option value="__custom__" selected>${esc(curLocale() === 'zh' ? '自定义字体栈' : 'Custom Stack')}</option>` : ''}
          </select>
          <button type="button" class="prism-reset-btn" ${resetAttrs}
                  title="${esc(tr('common.reset'))}">↺</button>
        </div>
      </div>
      <div class="prism-font-ctl-inputs">
        <input type="text" class="prism-input prism-font-custom-input"
               data-action="${esc(resolvedInputAct)}" data-key="${esc(key)}"${regionAttr}
               placeholder="${esc(tx('fontCustomPlaceholder'))}"
               value="${esc(rawVal)}" />
      </div>
      ${isInvalid ? `<span class="prism-font-sanitize-note">${esc(tx('fontInvalidHint'))}</span>` : ''}
    </div>
  `;
}

// ============================================================================
// Region Accordion Shell (<details class="prism-section prism-region-group">)
// ============================================================================
export function renderRegionAccordionShell({
  regionId,
  title,
  icon = '',
  swatchVar = '',
  swatchBg = '',
  customCount = 0,
  open = undefined,
  isOpen = undefined,
  resetAction = regionId === 'global' ? 'reset-module' : 'reset-region',
  resetKeys = '',
  badgeText = '',
  bodyHtml = '',
}) {
  const isGlobal = regionId === 'global';
  const resolvedOpen =
    open !== undefined ? Boolean(open) : isOpen !== undefined ? Boolean(isOpen) : isRegionOpen(regionId);
  const swatchFill = swatchBg || (swatchVar ? `var(${swatchVar})` : !isGlobal ? `var(--sim-${regionId}-bg)` : '');
  const swatchHtml = swatchFill
    ? `<span class="prism-region-swatch" aria-hidden="true"><span class="prism-region-swatch-fill" style="background:${esc(swatchFill)}"></span></span>`
    : icon
      ? `<span class="prism-region-icon" aria-hidden="true">${esc(icon)}</span>`
      : '';
  const resolvedBadge =
    badgeText || (customCount > 0 ? tr('region.customCount', { n: customCount }) : tr('region.followGlobal'));

  // DEF-SE-2: Groups 1-7 strictly use `reset-region`; Group 8 (`global`) exclusively owns `reset-module`!
  const resetAttrs =
    isGlobal || resetAction === 'reset-module'
      ? `data-action="reset-module" data-keys="${esc(resetKeys)}"`
      : `data-action="reset-region" data-region="${esc(regionId)}"`;

  return `
    <details class="prism-section prism-region-group" data-region="${esc(regionId)}"${resolvedOpen ? ' open' : ''}>
      <summary>
        <div class="prism-section-title-wrap">
          <span class="prism-section-chevron">▶</span>
          ${swatchHtml}
          <span class="prism-region-title">${esc(title)}</span>
        </div>
        <div class="prism-region-summary-actions">
          <span class="prism-region-badge prism-region-custom-badge ${customCount > 0 ? 'is-custom' : ''}" data-region-badge="${esc(regionId)}">${esc(resolvedBadge)}</span>
          <button type="button" class="prism-btn prism-btn-sm prism-region-reset-btn" ${resetAttrs}
                  title="${esc(tr('region.resetRegion'))}">↺</button>
        </div>
      </summary>
      <div class="prism-section-body">
        ${bodyHtml}
      </div>
    </details>
  `;
}

// ============================================================================
// Silent Auto-Save Topbar Pill & P1/P2a/P3 Media Health Alerts
// ============================================================================
export function renderSaveStatusPillHtml(status = store.saveStatus, errorMsg = store.saveError) {
  const safeState = ['idle', 'saving', 'saved', 'error'].includes(status) ? status : 'idle';
  let inner = '';
  if (safeState === 'saving') {
    inner = esc(`◌ ${tr('autosave.saving')}`);
  } else if (safeState === 'saved') {
    inner = esc(tr('autosave.saved'));
  } else if (safeState === 'error') {
    inner = `<button type="button" class="prism-autosave-retry" data-action="retry-config-flush">${esc(tr('autosave.error'))} · ${esc(tr('autosave.retry'))}</button>`;
  }
  return `<span id="prism-autosave-indicator" class="prism-autosave-pill" data-autosave-indicator="true" data-state="${esc(safeState)}" aria-live="polite" title="${esc(errorMsg || '')}">${inner}</span>`;
}

export function renderMediaHealthAlertsHtml(
  eff = getEffectiveConfig(),
  activeItem = null,
  hostStatus = store.hostStatus,
) {
  if (!store.skinEnabled) return '';
  const item = activeItem || store.activeItem || store.items.find((x) => x.id === getActiveId()) || null;
  const hs = hostStatus || {};
  const alerts = [];

  // P1: Animated wallpaper paused alert with 1-click Resume
  if (eff.paused && item && ['video', 'scene', 'web', 'slideshow'].includes(item.kind)) {
    alerts.push(`
      <div class="prism-health-banner prism-alert-banner" data-alert="paused" data-tone="warn" role="status">
        <span class="prism-health-banner-text">⏸ ${esc(tr('alert.pausedBanner'))}</span>
        <button type="button" class="prism-btn prism-btn-sm prism-btn-primary" data-action="resume-paused-wallpaper">
          ${esc(tr('alert.resumeNow'))}
        </button>
      </div>
    `);
  }

  // P2a: Dynamic wallpaper degraded to static poster alert with 1-click Retry
  const degraded = Boolean(hs.degradedToPoster || hs.stageStatus?.degradedToPoster);
  if (degraded) {
    const degradeReason = String(hs.degradeReason || hs.stageStatus?.degradeReason || 'media-fallback');
    alerts.push(`
      <div class="prism-health-banner prism-alert-banner" data-alert="degraded" data-tone="danger" role="alert">
        <span class="prism-health-banner-text">⚠ ${esc(tr('alert.degradedToPoster', { reason: degradeReason }))}</span>
        <button type="button" class="prism-btn prism-btn-sm" data-action="retry-wallpaper-media">
          ${esc(tx('retryMedia'))}
        </button>
      </div>
    `);
  }

  // P3: Minimal Static CSS mode notice with 1-click switch back to gentle-auto
  if (store.config.startupMode === 'static-css') {
    alerts.push(`
      <div class="prism-health-banner prism-alert-banner" data-alert="static-css" data-tone="info" role="status">
        <span class="prism-health-banner-text">ℹ ${esc(tr('alert.staticCssMode'))}</span>
        <button type="button" class="prism-btn prism-btn-sm" data-action="set-enum" data-key="startupMode" data-val="gentle-auto">
          ${esc(tx('switchGentleAuto'))}
        </button>
      </div>
    `);
  }

  if (alerts.length === 0) return '';
  return `<div class="prism-health-alerts">${alerts.join('')}</div>`;
}

// ============================================================================
// Per-Region Customization Counters
// ============================================================================
function countSingleRegionEntryDiffs(regionId, eff) {
  const ent = eff?.regions?.[regionId];
  if (!ent || typeof ent !== 'object') return 0;
  const def = regionId === 'sidebar' ? DEFAULT_SIDEBAR_REGION_ENTRY : DEFAULT_REGION_ENTRY;
  let count = 0;

  if (ent.glassEnabled !== null && ent.glassEnabled !== undefined) count += 1;
  if (ent.blur !== null && ent.blur !== undefined) count += 1;
  if (ent.opacity !== null && ent.opacity !== undefined) count += 1;
  if (Number(ent.tone || 0) !== 0) count += 1;
  if (typeof ent.tint === 'string' && ent.tint.trim() !== '') count += 1;
  if (ent.borderOpacity !== null && ent.borderOpacity !== undefined) count += 1;
  if (ent.borderStyle !== null && ent.borderStyle !== undefined) count += 1;
  if (ent.radius !== null && ent.radius !== undefined) count += 1;
  if (ent.fontSize !== null && ent.fontSize !== undefined) count += 1;
  if (typeof ent.fontFamily === 'string' && ent.fontFamily.trim() !== '') count += 1;
  if (typeof ent.fontColor === 'string' && ent.fontColor.trim() !== '') count += 1;
  if (Boolean(ent.allowRawFontColor) !== Boolean(def.allowRawFontColor)) count += 1;

  if (regionId === 'sidebar') {
    if (ent.listStyle && ent.listStyle !== def.listStyle) count += 1;
    if (ent.sectionFontSize !== null && ent.sectionFontSize !== undefined) count += 1;
    if (ent.projectFontSize !== null && ent.projectFontSize !== undefined) count += 1;
    if (ent.itemFontSize !== null && ent.itemFontSize !== undefined) count += 1;
  }
  return count;
}

const GLOBAL_COUNTED_KEYS = Object.freeze([
  'layoutMode',
  'islandGap',
  'workspacePad',
  'cornerStyle',
  'borders',
  'shadows',
  'glassSurfaces',
  'glassOpacity',
  'glassBlur',
  'glassFidelity',
  'themeMode',
  'themeFollow',
  'colorScheme',
  'accentMode',
  'wallTintMix',
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
  'globalFontSize',
  'globalFontFamily',
  'globalFontColor',
  'fxEnabled',
  'fxClickMode',
  'fxTrailMode',
  'parallaxEnabled',
]);

export function countRegionCustomProps(regionId, eff = getEffectiveConfig()) {
  if (!eff || typeof eff !== 'object') return 0;

  if (regionId === 'global') {
    let count = 0;
    for (const k of GLOBAL_COUNTED_KEYS) {
      const cur = eff[k];
      const def = DEFAULT_CONFIG[k];
      if (typeof cur === 'number' && typeof def === 'number') {
        if (Math.abs(cur - def) > 0.001) count += 1;
      } else if (cur !== def) {
        count += 1;
      }
    }
    return count;
  }

  let count = countSingleRegionEntryDiffs(regionId, eff);

  if (regionId === 'topbar') {
    if (eff.topbarStyle !== DEFAULT_CONFIG.topbarStyle) count += 1;
  } else if (regionId === 'wco') {
    if (eff.transparentWindowControls !== DEFAULT_CONFIG.transparentWindowControls) count += 1;
  } else if (regionId === 'sidebar') {
    // Only count 'native' radius if regions.sidebar.radius is null (avoid double-counting numeric radius)
    if (eff.leftSidebarRadius === 'native' && eff.regions?.sidebar?.radius === null) count += 1;
    if (eff.sidebarTypographyMode !== DEFAULT_CONFIG.sidebarTypographyMode) count += 1;
  } else if (regionId === 'workspace') {
    if (eff.hideWelcomeLogo !== DEFAULT_CONFIG.hideWelcomeLogo) count += 1;
    if (eff.codeReadabilityMode !== DEFAULT_CONFIG.codeReadabilityMode) count += 1;
    if (eff.contrastFloor !== DEFAULT_CONFIG.contrastFloor) count += 1;
    if (Math.abs(Number(eff.chatGlassFidelity) - Number(DEFAULT_CONFIG.chatGlassFidelity)) > 0.5) count += 1;
  } else if (regionId === 'composer') {
    if (eff.caretColor && eff.caretColor !== DEFAULT_CONFIG.caretColor) count += 1;
  } else if (regionId === 'rightPane') {
    if (eff.rightSidebarRadius === 'native' && eff.regions?.rightPane?.radius === null) count += 1;
  } else if (regionId === 'popover') {
    if (eff.floaterSolidBase !== DEFAULT_CONFIG.floaterSolidBase) count += 1;
  }

  return count;
}

export function countTotalCustomizedRegions(eff = getEffectiveConfig(), regionIds = REGION_UI_ORDER) {
  let total = 0;
  for (const id of regionIds) {
    if (countRegionCustomProps(id, eff) > 0) {
      total += 1;
    }
  }
  return total;
}

// ============================================================================
// In-Place Zero-Reflow DOM Synchronizers (Preserve Active Drag & Focus)
// ============================================================================
const PAIRED_SLIDER_ALIASES = Object.freeze({
  sidebarOpacity: Object.freeze(['sidebarOpacity', 'regions.sidebar.opacity', 'surfaceTints.sidebar.opacity']),
  'regions.sidebar.opacity': Object.freeze(['sidebarOpacity', 'regions.sidebar.opacity', 'surfaceTints.sidebar.opacity']),
  'surfaceTints.sidebar.opacity': Object.freeze(['sidebarOpacity', 'regions.sidebar.opacity', 'surfaceTints.sidebar.opacity']),
  sidebarBlur: Object.freeze(['sidebarBlur', 'regions.sidebar.blur', 'surfaceTints.sidebar.blur']),
  'regions.sidebar.blur': Object.freeze(['sidebarBlur', 'regions.sidebar.blur', 'surfaceTints.sidebar.blur']),
  'surfaceTints.sidebar.blur': Object.freeze(['sidebarBlur', 'regions.sidebar.blur', 'surfaceTints.sidebar.blur']),
  sidebarFontSize: Object.freeze(['sidebarFontSize', 'regions.sidebar.fontSize']),
  'regions.sidebar.fontSize': Object.freeze(['sidebarFontSize', 'regions.sidebar.fontSize']),
});

export function syncPairedSlidersInDom(sliderKey, rawVal, sourceInput = null) {
  if (typeof document === 'undefined' || !sliderKey) return;
  const keysToSync = PAIRED_SLIDER_ALIASES[sliderKey] || [sliderKey];
  for (const k of keysToSync) {
    document.querySelectorAll(`input[data-config-slider="${k}"]`).forEach((el) => {
      if (!(el instanceof HTMLInputElement) || el === sourceInput) return;
      if (el.dataset.inlineVol === 'true') {
        const volUi = Math.round(rawVal * 100);
        el.value = String(volUi);
        el.style.setProperty('--prism-pct', `${volUi}%`);
        return;
      }
      const row = el.closest('.prism-slider-row');
      const scale = Number(row?.dataset.scale || 1);
      const decimals = Number(row?.dataset.decimals || 0);
      const suffix = row?.dataset.suffix || '';
      const defRaw = Number(row?.dataset.default ?? 0);
      const min = Number(el.min);
      const max = Number(el.max);
      const uiVal = rawVal * scale;
      const pct = max > min ? Math.max(0, Math.min(100, ((uiVal - min) / (max - min)) * 100)) : 0;
      el.value = String(uiVal);
      el.style.setProperty('--prism-pct', `${pct.toFixed(1)}%`);
      if (row instanceof HTMLElement) {
        const valSpan = row.querySelector('.prism-slider-val');
        if (valSpan) {
          valSpan.textContent = `${decimals > 0 ? uiVal.toFixed(decimals) : Math.round(uiVal)}${suffix}`;
        }
        row.dataset.dirty =
          row.dataset.nullable === 'true' ? 'true' : Math.abs(rawVal - defRaw) > 0.001 ? 'true' : 'false';
      }
    });
  }
}

export function syncNullableFollowersInDom(fallbackKey, fallbackRawVal) {
  if (typeof document === 'undefined' || !fallbackKey) return;
  document
    .querySelectorAll(`.prism-slider-row[data-nullable="true"][data-fallback-key="${fallbackKey}"]`)
    .forEach((fRow) => {
      if (!(fRow instanceof HTMLElement) || fRow.dataset.dirty === 'true') return;
      const comp = fRow.dataset.comp || fRow.dataset.region || '';
      if (comp === 'popover' && fallbackKey === 'glassOpacity') return;
      const fInput = fRow.querySelector('input.prism-range');
      if (!(fInput instanceof HTMLInputElement)) return;
      let targetRaw = fallbackRawVal;
      if (fallbackKey === 'glassOpacity' && comp && REGION_IDS.includes(comp)) {
        const effNext = { ...getEffectiveConfig(), glassOpacity: fallbackRawVal };
        targetRaw = resolveComponentDefaultAlpha(comp, effNext, getResolvedPolarity(effNext) === 'light');
      }
      const fScale = Number(fRow.dataset.scale || 1);
      const fDecimals = Number(fRow.dataset.decimals || 0);
      const fSuffix = fRow.dataset.suffix || '';
      const fMin = Number(fInput.min);
      const fMax = Number(fInput.max);
      const fUiVal = Math.max(fMin, Math.min(fMax, targetRaw * fScale));
      const { pct: fPct, display: rawDisp } = sliderMeta(fUiVal, fMin, fMax, fDecimals, fSuffix);
      fInput.value = String(fUiVal);
      fInput.style.setProperty('--prism-pct', `${fPct}%`);
      const fValSpan = fRow.querySelector('.prism-slider-val');
      if (fValSpan) {
        fValSpan.textContent = tr('glass.followMainFmt', { val: rawDisp });
      }
    });
}

export function syncRegionBadgesInDom(eff = getEffectiveConfig()) {
  if (typeof document === 'undefined') return;
  const allRegionKeys = [...new Set([...REGION_UI_ORDER, ...REGION_IDS])];
  for (const id of allRegionKeys) {
    const cnt = countRegionCustomProps(id, eff);
    document.querySelectorAll(`[data-region-badge="${id}"]`).forEach((badge) => {
      badge.textContent = cnt > 0 ? tr('region.customCount', { n: cnt }) : tr('region.followGlobal');
      badge.classList.toggle('is-custom', cnt > 0);
    });
    document.querySelectorAll(`[data-region-tree-count="${id}"]`).forEach((node) => {
      node.textContent = cnt > 0 ? String(cnt) : 'Auto';
      node.classList.toggle('is-custom', cnt > 0);
    });
  }
  const totalCustom = countTotalCustomizedRegions(eff, REGION_UI_ORDER);
  document.querySelectorAll('[data-total-custom-badge="true"]').forEach((node) => {
    node.textContent = totalCustom > 0 ? tr('region.customCount', { n: totalCustom }) : tr('glass.comp.allAuto');
    node.classList.toggle('is-custom', totalCustom > 0);
  });
}
