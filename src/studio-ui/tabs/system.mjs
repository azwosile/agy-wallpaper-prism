// Wallpaper Prism Studio UI — Tab 4: Host, System Diagnostics, Performance Eco, Auto-Update & Banners
// DAG Layer 4: imports only L0 (schema), L1 (state), L3 (controls).

import {
  PLUGIN_VERSION,
  DEFAULT_DEBUG_PORT,
  STARTUP_MODES,
  CANARY_STATES,
  LIBRARY_ANIMATED_THUMB_MODES,
  DEFAULT_CONFIG,
} from '../../shared/schema.mjs';

import {
  store,
  curLocale,
  tr,
  tx,
  esc,
  sanitizeExternalReleaseUrl,
  formatUpdateTimestamp,
  getEffectiveConfig,
  isHostAttached,
  computeLibraryModel,
} from '../state.mjs';

import {
  renderSliderRow,
  renderSwitchRow,
  renderSegRow,
  renderConfirmRow,
  renderMediaHealthAlertsHtml,
} from '../controls.mjs';

export function renderUpdateBannerHtml() {
  const u = store.update;
  const curVer = u.currentVersion || store.version || PLUGIN_VERSION;
  const hasFreshUpdate = Boolean(u.hasUpdate && u.latestVersion && u.dismissedVersion !== u.latestVersion);
  const shouldShow = hasFreshUpdate || u.applying || Boolean(u.error) || u.standaloneRestartNeeded;
  if (!shouldShow) return '';

  const hasNotes = Boolean(u.changelog || u.changelogSummary);
  const deltaLabel = u.latestVersion
    ? tr('update.versionDelta', { from: curVer, to: u.latestVersion })
    : `v${curVer}`;

  return `
    <div id="prism-update-banner" class="prism-update-banner" data-tone="${u.error ? 'update-error' : 'update'}" role="status">
      <div class="prism-update-banner-row">
        <div class="prism-update-banner-main">
          <span class="prism-status-dot" style="background:${u.error ? 'var(--prism-danger)' : 'var(--prism-accent)'};flex-shrink:0"></span>
          <strong class="prism-update-title">${esc(tr('update.bannerTitle', { version: u.latestVersion || curVer }))}</strong>
          <span class="prism-update-delta">${esc(deltaLabel)}</span>
          ${
            u.changelogSummary && !u.notesOpen
              ? `<span class="prism-update-summary" title="${esc(u.changelogSummary)}">${esc(u.changelogSummary)}</span>`
              : ''
          }
        </div>
        <div class="prism-update-actions">
          ${
            u.hasUpdate && u.latestVersion
              ? u.canSelfUpdate
                ? `<button id="prism-update-apply-btn" type="button" class="prism-btn prism-btn-sm prism-btn-primary"
                           data-action="apply-update" ${u.applying ? 'disabled' : ''}>
                     ${u.applying ? `<span class="prism-spinner" aria-hidden="true"></span> ${esc(tr('update.applying'))}` : `⬆ ${esc(tr('update.applyBtn'))}`}
                   </button>`
                : `<span class="prism-update-dev-badge">${esc(tr('update.gitDevHint'))}</span>`
              : ''
          }
          ${
            hasNotes
              ? `<button type="button" class="prism-link-btn" data-action="toggle-update-notes">
                   ${esc(tr('update.notesToggle'))} ${u.notesOpen ? '▴' : '▾'}
                 </button>`
              : ''
          }
          <a class="prism-link-btn" href="${esc(sanitizeExternalReleaseUrl(u.releaseUrl))}" target="_blank" rel="noopener noreferrer">
            ${esc(tr('update.viewRelease'))}
          </a>
          ${
            !u.applying
              ? `<button type="button" class="prism-icon-btn" style="width:22px;height:22px"
                         data-action="dismiss-update-banner" title="${esc(tr('update.dismiss'))}">✕</button>`
              : ''
          }
        </div>
      </div>
      ${
        u.error
          ? `<div class="prism-update-error-line">
               <span>${esc(tr('update.failedPrefix'))}: ${esc(u.error)}</span>
               ${u.canSelfUpdate && u.hasUpdate ? `<button type="button" class="prism-btn prism-btn-sm" data-action="apply-update">${esc(tr('update.retryBtn'))}</button>` : ''}
             </div>`
          : ''
      }
      ${
        u.standaloneRestartNeeded
          ? `<div class="prism-update-info-line">${esc(tr('update.standaloneRestartHint'))}</div>`
          : ''
      }
      ${u.notesOpen && hasNotes ? `<pre class="prism-update-notes">${esc(u.changelog || u.changelogSummary)}</pre>` : ''}
    </div>
  `;
}

export function renderUpdateReconnectOverlay() {
  const host = document.getElementById('prism-update-reconnect-host');
  if (!host) return;
  const rec = store.update.reconnect;
  if (!rec.active) {
    host.innerHTML = '';
    return;
  }
  const targetVer = rec.targetVersion || store.update.latestVersion || store.version || PLUGIN_VERSION;
  const phase = rec.timedOut ? 'timeout' : 'polling';
  host.innerHTML = `
    <div id="prism-update-reconnect-modal" class="prism-update-reconnect-backdrop agy-prism-reconnect-overlay"
         role="dialog" aria-modal="true" translate="no" data-no-translate="true" data-ag-no-i18n="1">
      <div class="prism-update-reconnect-card agy-prism-dialog" data-phase="${phase}">
        ${
          !rec.timedOut
            ? `
          <div class="prism-update-reconnect-icon">
            <span class="prism-spinner prism-spinner-lg" aria-hidden="true"></span>
          </div>
          <strong class="prism-update-reconnect-title">${esc(tr('update.restartingTitle', { version: targetVer }))}</strong>
          <p id="prism-update-reconnect-desc" class="prism-update-reconnect-desc">${esc(tr('update.restartingDesc', { attempts: Math.max(1, rec.attempts) }))}</p>
          <span id="prism-update-reconnect-progress" class="prism-chip" style="cursor:default">${rec.attempts} / ${rec.maxAttempts}</span>
        `
            : `
          <div class="prism-update-reconnect-icon">✓</div>
          <strong class="prism-update-reconnect-title">${esc(tr('update.reconnectTimeoutTitle', { version: targetVer }))}</strong>
          <p class="prism-update-reconnect-desc">${esc(tr('update.reconnectTimeoutDesc'))}</p>
          <div class="prism-update-reconnect-actions">
            <button type="button" class="prism-btn prism-btn-primary" data-action="reload-studio-pane">
              ↻ ${esc(tr('update.reloadPaneBtn'))}
            </button>
            <button type="button" class="prism-btn" data-action="retry-update-reconnect">
              ${esc(tr('update.retryReconnectBtn'))}
            </button>
            <button type="button" class="prism-btn" data-action="close-update-reconnect">
              ${esc(tr('common.close'))}
            </button>
          </div>
        `
        }
      </div>
    </div>
  `;
}

export function renderAutostartBannerHtml() {
  const out = [];
  const updateBanner = renderUpdateBannerHtml();
  if (updateBanner) out.push(updateBanner);
  const canaryTripped = store.canary?.state === 'tripped';
  const isManualSleeping = !canaryTripped && store.config.startupMode === 'manual' && !store.sessionAwake;

  if (canaryTripped) {
    out.push(`
      <div id="prism-canary-tripped-banner" class="prism-autostart-banner prism-safety-banner" data-tone="tripped" role="alert">
        <div style="display:flex;align-items:flex-start;gap:8px;min-width:0;flex:1 1 260px">
          <span class="prism-status-dot" style="background:var(--prism-danger);margin-top:4px;flex-shrink:0"></span>
          <div style="display:flex;flex-direction:column;gap:2px;min-width:0">
            <strong style="font-size:12px;color:var(--prism-danger)">${esc(tr('canary.trippedBannerTitle'))}</strong>
            <span style="color:var(--prism-fg-2);line-height:1.4">${esc(tr('canary.trippedBannerDesc'))}${store.canary.trippedReason ? ` (${esc(store.canary.trippedReason)})` : ''}</span>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
          <button id="prism-canary-reset-btn" type="button" class="prism-btn prism-btn-sm prism-btn-danger-solid"
                  data-action="reset-canary" ${store.canaryBusy ? 'disabled' : ''}>
            ${esc(tr('canary.resetAndWake'))}
          </button>
        </div>
      </div>
    `);
  } else if (isManualSleeping) {
    out.push(`
      <div id="prism-manual-wake-banner" class="prism-autostart-banner prism-safety-banner" data-tone="manual-wake">
        <div style="display:flex;align-items:center;gap:8px;min-width:0;flex:1 1 240px">
          <span class="prism-status-dot" style="background:var(--prism-accent);flex-shrink:0"></span>
          <div style="display:flex;flex-wrap:wrap;align-items:baseline;gap:6px;min-width:0">
            <strong style="font-size:12px;color:var(--prism-fg)">${esc(tr('host.wakeBannerTitle'))}</strong>
            <span style="color:var(--prism-fg-2)">${esc(tr('host.wakeBannerDesc'))}</span>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
          <button id="prism-manual-wake-btn" type="button" class="prism-btn prism-btn-sm prism-btn-primary"
                  data-action="wake-skin" ${store.wakeBusy ? 'disabled' : ''}>
            ${esc(tr('host.wakeNow'))}
          </button>
        </div>
      </div>
    `);
  }

  const attached = isHostAttached();
  if (!canaryTripped && !isManualSleeping && !attached && !store.autostart.bannerDismissed) {
    const ready = Boolean(store.autostart.normalShortcutEnabled);
    out.push(`
      <div class="prism-autostart-banner" data-tone="${ready ? 'ready' : 'pending'}">
        <div style="display:flex;align-items:center;gap:7px;min-width:0;flex:1 1 220px">
          <span class="prism-status-dot" style="background:${ready ? 'var(--prism-ok)' : 'var(--prism-warn)'}"></span>
          <span style="overflow:hidden;text-overflow:ellipsis">${esc(ready ? tr('host.autostartReady') : tr('host.autostartPending'))}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
          ${
            !ready
              ? `<button type="button" class="prism-btn prism-btn-sm prism-btn-primary"
                         data-action="set-autostart" data-enabled="true" ${store.autostart.busy ? 'disabled' : ''}>
                   ⚡ ${esc(tr('host.enableAutostart'))}
                 </button>`
              : `<button type="button" class="prism-btn prism-btn-sm" data-action="switch-tab" data-tab="system">
                   ✓ ${esc(curLocale() === 'zh' ? '查看自启详情' : 'Details')}
                 </button>`
          }
          <button type="button" class="prism-icon-btn" style="width:22px;height:22px"
                  data-action="dismiss-autostart-banner" title="${esc(tr('common.close'))}">✕</button>
        </div>
      </div>
    `);
  }

  return out.join('');
}

export function renderSystemTab() {
  const eff = getEffectiveConfig();
  const isZh = curLocale() === 'zh';
  const hs = store.hostStatus || {};
  const attached = isHostAttached(hs);
  const port = hs.cdpPort || hs.port || store.config.debugPort || DEFAULT_DEBUG_PORT;
  const auto = store.autostart;
  const normalReady = Boolean(auto.normalShortcutEnabled);
  const startupMode = STARTUP_MODES.includes(store.config.startupMode) ? store.config.startupMode : 'gentle-auto';
  const bootDelaySec = Math.min(5.0, Math.max(0.5, Number(store.config.liveBootDelay ?? DEFAULT_CONFIG.liveBootDelay ?? 1.5)));
  const canaryState = CANARY_STATES.includes(store.canary?.state) ? store.canary.state : 'idle';
  const canaryStateLabel = tr(`canary.state.${canaryState}`);
  const canaryDotColor =
    canaryState === 'healthy'
      ? 'var(--prism-ok)'
      : canaryState === 'tripped'
        ? 'var(--prism-danger)'
        : canaryState === 'arming'
          ? 'var(--prism-warn)'
          : 'var(--prism-fg-faint)';

  const startupCards = [
    {
      id: 'gentle-auto',
      title: tr('host.startup.gentleAuto'),
      badge:
        Math.abs(bootDelaySec - 1.5) < 0.04
          ? tr('host.startup.gentleAutoBadge')
          : `${isZh ? '延迟' : 'Delay'} · ${bootDelaySec.toFixed(1)}s`,
      desc: tr('host.startup.gentleAutoDesc'),
    },
    {
      id: 'manual',
      title: tr('host.startup.manual'),
      badge: '',
      desc: tr('host.startup.manualDesc'),
    },
    {
      id: 'static-css',
      title: tr('host.startup.staticCss'),
      badge: '',
      desc: tr('host.startup.staticCssDesc'),
    },
  ];

  const defaultBaseDataDir = store.stats.dataDir || '~/.gemini/antigravity/sidecar_data/agy-wallpaper-prism/prism_studio/data';
  const shortcutsList =
    Array.isArray(auto.shortcuts) && auto.shortcuts.length > 0
      ? auto.shortcuts
      : (auto.patchedShortcuts || []).map((p) => ({
          path: p,
          name: String(p).split(/[\\/]/).pop() || p,
          location: 'desktop',
          hasDebugPort: true,
          debugPort: port,
          backedUp: true,
        }));
  const model = computeLibraryModel();
  const healthAlerts = renderMediaHealthAlertsHtml();

  const u = store.update;
  const curVer = u.currentVersion || store.version || PLUGIN_VERSION;
  const updDotColor = u.error
    ? 'var(--prism-danger)'
    : u.hasUpdate
      ? 'var(--prism-accent)'
      : u.offline
        ? 'var(--prism-warn)'
        : u.checked
          ? 'var(--prism-ok)'
          : 'var(--prism-fg-faint)';
  const hasNotes = Boolean(u.changelog || u.changelogSummary);

  return `
    ${healthAlerts ? `<div id="prism-system-health-alerts" class="prism-health-alerts">${healthAlerts}</div>` : ''}

    <!-- Startup Strategy, Boot Delay, Canary Circuit-Breaker & Panic Shortcut Card -->
    <div id="prism-startup-safety-card" class="prism-card" style="display:flex;flex-direction:column;gap:11px;${canaryState === 'tripped' ? 'border-color:rgba(var(--prism-danger-rgb),0.55)' : ''}">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:8px">
          <span class="prism-status-dot" style="background:${canaryDotColor}"></span>
          <strong style="font-size:13px">${esc(tr('host.startupTitle'))}</strong>
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <span id="prism-canary-badge" class="prism-canary-badge" data-canary-state="${esc(canaryState)}" title="${esc(store.canary?.trippedReason || '')}">
            <span>${esc(tr('canary.badgeLabel'))}:</span>
            <strong>${esc(canaryStateLabel)}</strong>
          </span>
          ${
            canaryState === 'tripped'
              ? `<button type="button" class="prism-btn prism-btn-sm prism-btn-danger-solid" data-action="reset-canary" ${store.canaryBusy ? 'disabled' : ''}>
                   ${esc(tr('canary.resetAndWake'))}
                 </button>`
              : startupMode === 'manual' && !store.sessionAwake
                ? `<button type="button" class="prism-btn prism-btn-sm prism-btn-primary" data-action="wake-skin" ${store.wakeBusy ? 'disabled' : ''}>
                     ${esc(tr('host.wakeNow'))}
                   </button>`
                : ''
          }
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:6px">
        <span class="prism-ctl-name">${esc(tr('host.startupMode'))}</span>
        <div class="prism-startup-grid" role="radiogroup" aria-label="${esc(tr('host.startupMode'))}">
          ${startupCards
            .map(
              (sc) => `
            <button type="button" role="radio" aria-checked="${startupMode === sc.id ? 'true' : 'false'}"
                    class="prism-startup-card ${startupMode === sc.id ? 'is-active' : ''}"
                    data-startup-card="${esc(sc.id)}"
                    data-action="set-enum" data-key="startupMode" data-val="${esc(sc.id)}">
              <div class="prism-startup-card-top">
                <span class="prism-startup-card-title">
                  <span class="prism-startup-radio" aria-hidden="true"></span>
                  <span>${esc(sc.title)}</span>
                </span>
                ${sc.badge ? `<span class="prism-startup-badge">[${esc(sc.badge)}]</span>` : ''}
              </div>
              <span class="prism-startup-card-desc">${esc(sc.desc)}</span>
            </button>
          `,
            )
            .join('')}
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:3px;padding-top:4px;border-top:1px solid var(--prism-border-hairline);${startupMode === 'manual' ? 'opacity:0.68' : ''}">
        ${renderSliderRow({
          key: 'liveBootDelay',
          label: tr('host.liveBootDelay'),
          value: bootDelaySec,
          defaultValue: DEFAULT_CONFIG.liveBootDelay,
          min: 0.5,
          max: 5.0,
          step: 0.1,
          scale: 1,
          decimals: 1,
          suffix: 's',
        })}
        <span id="prism-boot-delay-hint" class="prism-ctl-hint">
          ${esc(tr('host.liveBootDelayHint', { sec: bootDelaySec.toFixed(1) }))}
        </span>
      </div>

      <div id="prism-panic-shortcut-callout" class="prism-panic-callout">
        <div style="display:flex;flex-direction:column;gap:2px;min-width:0;flex:1 1 220px">
          <strong style="font-size:12px;color:var(--prism-fg)">🛡 ${esc(tr('host.panicShortcutTitle'))}</strong>
          <span style="color:var(--prism-fg-2);line-height:1.4">${esc(tr('host.panicShortcutHint'))}</span>
        </div>
        <div class="prism-kbd-group">
          <kbd class="prism-kbd">Ctrl+Alt+Shift+R</kbd>
          <span style="color:var(--prism-fg-muted);font-size:11px">/</span>
          <kbd class="prism-kbd">4× Esc</kbd>
        </div>
      </div>
    </div>

    <!-- v2.2.0 Studio Eco & Power Quick Settings Card -->
    <div id="prism-eco-settings-card" class="prism-card" style="display:flex;flex-direction:column;gap:8px">
      <strong style="font-size:13px">⚡ ${esc(isZh ? '省电与渲染快捷设置' : 'Studio Eco & Power Quick Settings')}</strong>
      ${renderSegRow({
        key: 'libraryAnimatedThumbs',
        label: tr('lib.animatedThumbs'),
        value: store.config.libraryAnimatedThumbs || DEFAULT_CONFIG.libraryAnimatedThumbs,
        options: LIBRARY_ANIMATED_THUMB_MODES.map((m) => ({
          value: m,
          label: tr(`lib.animatedThumbs.${m}`),
        })),
      })}
      <div class="prism-ctl-row">
        <div class="prism-ctl-label">
          <span class="prism-ctl-name">${esc(isZh ? '21:9 预览画布实时动态媒体' : 'Live Media in 21:9 Studio Preview')}</span>
          <span class="prism-ctl-hint">${esc(tr('preview.liveToggleHint'))}</span>
        </div>
        <button type="button" role="switch" class="prism-switch"
                aria-checked="${eff.previewLiveMedia ? 'true' : 'false'}"
                data-action="toggle-preview-live" data-key="previewLiveMedia"></button>
      </div>
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
    </div>

    <!-- Software Update & One-Click Self-Update Card -->
    <div id="prism-update-card" class="prism-card" style="display:flex;flex-direction:column;gap:10px;${u.hasUpdate ? 'border-color:rgba(var(--prism-accent-rgb),0.45)' : ''}">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:8px">
          <span class="prism-status-dot" style="background:${updDotColor}"></span>
          <strong style="font-size:13px">${esc(tr('update.cardTitle'))}</strong>
        </div>
        <span class="prism-kind-badge">v${esc(curVer)}</span>
      </div>

      <div class="prism-kv-grid">
        <div class="prism-kv-box">
          <span class="prism-kv-k">${esc(tr('update.currentVersion'))}</span>
          <span class="prism-kv-v">v${esc(curVer)}</span>
        </div>
        <div class="prism-kv-box">
          <span class="prism-kv-k">${esc(tr('update.latestVersion'))}</span>
          <span class="prism-kv-v">${esc(u.latestVersion ? `v${u.latestVersion}` : u.offline ? tr('update.offline') : '—')}</span>
        </div>
        <div class="prism-kv-box">
          <span class="prism-kv-k">${esc(tr('update.lastChecked'))}</span>
          <span class="prism-kv-v">${esc(formatUpdateTimestamp(u.checkedAt))}</span>
        </div>
        <div class="prism-kv-box">
          <span class="prism-kv-k">${esc(isZh ? '安装模式' : 'Install Mode')}</span>
          <span class="prism-kv-v">${esc(u.canSelfUpdate ? tr('update.installModePlugin') : tr('update.installModeGit'))}</span>
        </div>
      </div>

      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
        <button id="prism-update-check-btn" type="button" class="prism-btn prism-btn-sm"
                data-action="check-update" ${u.checking || u.applying ? 'disabled' : ''}>
          ${u.checking ? `<span class="prism-spinner" aria-hidden="true"></span> ${esc(tr('update.checking'))}` : `↻ ${esc(tr('update.checkBtn'))}`}
        </button>
        ${
          u.hasUpdate && u.latestVersion
            ? u.canSelfUpdate
              ? `<button type="button" class="prism-btn prism-btn-sm prism-btn-primary"
                         data-action="apply-update" ${u.applying ? 'disabled' : ''}>
                   ${u.applying ? `<span class="prism-spinner" aria-hidden="true"></span> ${esc(tr('update.applying'))}` : `⬆ ${esc(tr('update.applyBtn'))}`}
                 </button>`
              : `<span class="prism-update-dev-badge">${esc(tr('update.gitDevHint'))}</span>`
            : ''
        }
        ${
          hasNotes
            ? `<button type="button" class="prism-link-btn" data-action="toggle-update-notes">
                 ${esc(tr('update.notesToggle'))} ${u.notesOpen ? '▴' : '▾'}
               </button>`
            : ''
        }
        <a class="prism-link-btn" href="${esc(sanitizeExternalReleaseUrl(u.releaseUrl))}" target="_blank" rel="noopener noreferrer">
          ${esc(tr('update.viewRelease'))}
        </a>
      </div>

      ${
        u.error
          ? `<div class="prism-update-error-line"><span>${esc(tr('update.failedPrefix'))}: ${esc(u.error)}</span>${u.canSelfUpdate && u.hasUpdate ? `<button type="button" class="prism-btn prism-btn-sm" data-action="apply-update">${esc(tr('update.retryBtn'))}</button>` : ''}</div>`
          : u.standaloneRestartNeeded
            ? `<div class="prism-update-info-line">${esc(tr('update.standaloneRestartHint'))}</div>`
            : u.checked && !u.hasUpdate && !u.offline && !u.checking
              ? `<div class="prism-autorestore-strip"><span style="color:var(--prism-ok);font-weight:700">✓</span><span>${esc(tr('update.upToDate', { version: curVer }))}</span></div>`
              : u.offline && !u.checking
                ? `<div class="prism-ctl-hint">◌ ${esc(tr('update.offline'))}</div>`
                : ''
      }
      ${u.notesOpen && hasNotes ? `<pre class="prism-update-notes">${esc(u.changelog || u.changelogSummary)}</pre>` : ''}
    </div>

    <!-- Normal Shortcut Auto-Load & Cold-Boot Auto-Restore Card -->
    <div id="prism-autostart-card" class="prism-card" style="display:flex;flex-direction:column;gap:10px;border-color:${normalReady ? 'rgba(var(--prism-ok-rgb),0.45)' : 'rgba(var(--prism-warn-rgb),0.45)'}">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:8px">
          <span class="prism-status-dot" style="background:${normalReady ? 'var(--prism-ok)' : 'var(--prism-warn)'}"></span>
          <strong style="font-size:13px">${esc(tr('host.autostartTitle'))}</strong>
        </div>
        <span class="prism-kind-badge" style="color:${normalReady ? 'var(--prism-ok)' : 'var(--prism-warn)'};border-color:${normalReady ? 'rgba(var(--prism-ok-rgb),0.45)' : 'rgba(var(--prism-warn-rgb),0.45)'};background:${normalReady ? 'rgba(var(--prism-ok-rgb),0.14)' : 'rgba(var(--prism-warn-rgb),0.14)'}">
          ${normalReady ? '✓ AUTOSTART READY' : '◌ PENDING'}
        </span>
      </div>

      <div style="font-size:12px;color:var(--prism-fg-2);line-height:1.45">
        ${esc(normalReady ? tr('host.autostartReady') : tr('host.autostartPending'))}
      </div>

      <div id="prism-autorestore-badge" class="prism-autorestore-strip">
        <span style="color:${startupMode === 'manual' ? 'var(--prism-accent)' : 'var(--prism-ok)'};font-weight:700">${startupMode === 'manual' ? '❖' : '✓'}</span>
        <span>${esc(startupMode === 'manual' ? tr('host.startup.manualDesc') : tr('host.autoRestoreReady'))}</span>
      </div>

      ${
        shortcutsList.length > 0
          ? `
        <div class="prism-shortcut-list">
          ${shortcutsList
            .map(
              (sc) => `
            <div class="prism-shortcut-item">
              <div style="display:flex;align-items:center;gap:7px;min-width:0;flex:1">
                <span class="prism-fmt-tag">${esc(sc.location || 'shortcut')}</span>
                <span class="prism-shortcut-path" title="${esc(sc.path)}">${esc(sc.path || sc.name)}</span>
              </div>
              <div style="display:flex;align-items:center;gap:5px;flex-shrink:0">
                ${
                  sc.hasDebugPort
                    ? `<span class="prism-chip" style="border-color:rgba(var(--prism-ok-rgb),0.45);color:var(--prism-ok);cursor:default">✓ :${esc(sc.debugPort || port)}</span>`
                    : `<span class="prism-chip" style="cursor:default">Stock</span>`
                }
                ${sc.backedUp ? `<span class="prism-chip" style="cursor:default">Backup ✓</span>` : ''}
              </div>
            </div>
          `,
            )
            .join('')}
        </div>
      `
          : ''
      }

      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
        ${
          !normalReady
            ? `
          <button type="button" class="prism-btn prism-btn-primary" data-action="set-autostart" data-enabled="true" ${auto.busy ? 'disabled' : ''}>
            ⚡ ${esc(tr('host.enableAutostart'))}
          </button>
        `
            : `
          <button type="button" class="prism-btn" data-action="set-autostart" data-enabled="true" ${auto.busy ? 'disabled' : ''}>
            ✓ ${esc(isZh ? '重新校验并同步快捷方式' : 'Re-verify Normal Shortcuts')}
          </button>
        `
        }
        <button type="button" class="prism-btn" data-action="refresh-autostart">↻ ${esc(isZh ? '刷新自启检测' : 'Check Shortcuts')}</button>
      </div>

      ${
        normalReady || (auto.patchedShortcuts && auto.patchedShortcuts.length > 0)
          ? renderConfirmRow({
              confirmKey: 'autostart:disable',
              label: tr('host.disableAutostart'),
              btnLabel: tr('host.disableAutostart'),
              action: 'exec-disable-autostart',
            })
          : ''
      }
    </div>

    <!-- Live CDP Host Connection Card -->
    <div class="prism-card" style="display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:8px">
          <span class="prism-status-dot" style="background:${attached ? 'var(--prism-ok)' : 'var(--prism-warn)'}"></span>
          <strong style="font-size:13px">${esc(tr('host.title'))}</strong>
        </div>
        <span class="prism-kind-badge">${esc(attached ? tr('status.connected') : tr('status.standby'))}</span>
      </div>

      <div class="prism-kv-grid">
        <div class="prism-kv-box">
          <span class="prism-kv-k">CDP State</span>
          <span class="prism-kv-v">${attached ? 'Attached' : 'Standby'} (:${esc(port)})</span>
        </div>
        <div class="prism-kv-box">
          <span class="prism-kv-k">Skin Gate</span>
          <span class="prism-kv-v">${store.skinEnabled ? tr('status.skinOn') : tr('status.skinOff')}</span>
        </div>
        <div class="prism-kv-box">
          <span class="prism-kv-k">Media Server</span>
          <span class="prism-kv-v">${esc(store.mediaOrigin || hs.mediaOrigin || '127.0.0.1')}</span>
        </div>
        <div class="prism-kv-box">
          <span class="prism-kv-k">Sidecar Engine</span>
          <span class="prism-kv-v">v${esc(store.version || PLUGIN_VERSION)}${store.pid ? ` · PID ${store.pid}` : ''}</span>
        </div>
      </div>

      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
        <button type="button" class="prism-btn" data-action="create-shortcut">
          🔗 ${esc(tr('host.createShortcut'))}
        </button>
        ${
          !store.skinEnabled
            ? `<button type="button" class="prism-btn prism-btn-primary" data-action="enable-skin">✦ ${esc(tx('skinReapply'))}</button>`
            : ''
        }
        <button type="button" class="prism-btn" data-action="refresh-status">↻ ${esc(isZh ? '刷新状态' : 'Poll Status')}</button>
      </div>

      ${renderSegRow({
        key: 'triggerMode',
        label: tr('host.triggerMode'),
        value: store.config.triggerMode,
        options: [
          { value: 'both', label: tr('host.trigger.both') },
          { value: 'pill', label: tr('host.trigger.pill') },
          { value: 'corner', label: tr('host.trigger.corner') },
          { value: 'shortcut-only', label: tr('host.trigger.shortcut') },
        ],
      })}

      ${renderSwitchRow({
        key: 'transparentWindowControls',
        label: tr('layout.transparentWindowControls'),
        hint: tr('layout.transparentWindowControlsHint'),
        checked: store.config.transparentWindowControls !== false,
      })}
    </div>

    <div class="prism-settings-columns">
      <!-- Storage Paths & Server-Side Folder Browser -->
      <div class="prism-card" style="display:flex;flex-direction:column;gap:8px">
        <strong style="font-size:12.5px">${esc(tr('host.storageTitle'))}</strong>

        <div class="prism-ctl-row">
          <div class="prism-ctl-label">
            <span class="prism-ctl-name">${esc(tr('host.uploadDir'))}</span>
            <span class="prism-ctl-hint" style="word-break:break-all">${esc(store.config.uploadDir || store.stats.uploadDir || `${defaultBaseDataDir}/uploads`)}</span>
          </div>
          <button type="button" class="prism-btn prism-btn-sm" data-action="open-fs-browser" data-kind="uploadDir">📂 ${esc(tr('host.browse'))}</button>
        </div>

        <div class="prism-ctl-row">
          <div class="prism-ctl-label">
            <span class="prism-ctl-name">${esc(tr('host.cacheDir'))}</span>
            <span class="prism-ctl-hint" style="word-break:break-all">${esc(store.config.cacheDir || store.stats.cacheDir || `${defaultBaseDataDir}/cache`)}</span>
          </div>
          <button type="button" class="prism-btn prism-btn-sm" data-action="open-fs-browser" data-kind="cacheDir">📂 ${esc(tr('host.browse'))}</button>
        </div>

        <div style="padding-top:6px;border-top:1px solid var(--prism-border-hairline);display:flex;flex-direction:column;gap:6px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span class="prism-ctl-name">${esc(tr('host.customFolders'))}</span>
            <button type="button" class="prism-btn prism-btn-sm prism-btn-primary" data-action="open-fs-browser" data-kind="addCustomFolder">
              ＋ ${esc(tx('addFolder'))}
            </button>
          </div>
          ${
            (store.config.customFolders || []).length === 0
              ? `<span class="prism-ctl-hint">${esc(tx('noCustomFolders'))}</span>`
              : (store.config.customFolders || [])
                  .map((folder, idx) =>
                    renderConfirmRow({
                      confirmKey: `rm-folder:${idx}`,
                      label: folder,
                      btnLabel: tx('removeFolder'),
                      danger: true,
                      action: 'remove-custom-folder',
                      payload: folder,
                    }),
                  )
                  .join('')
          }
        </div>
      </div>

      <!-- Library Telemetry & Stats -->
      <div class="prism-card" style="display:flex;flex-direction:column;gap:8px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <strong style="font-size:12.5px">${esc(tx('libraryTelemetry'))}</strong>
          <button type="button" class="prism-btn prism-btn-sm" data-action="refresh-library">↻ ${esc(tr('lib.refresh'))}</button>
        </div>
        <div class="prism-kv-grid">
          <div class="prism-kv-box">
            <span class="prism-kv-k">${esc(tx('statsTotal'))}</span>
            <span class="prism-kv-v">${model.totalPlayable}</span>
          </div>
          <div class="prism-kv-box">
            <span class="prism-kv-k">${esc(tx('statsWorkshop'))}</span>
            <span class="prism-kv-v">${model.workshopCount}</span>
          </div>
          <div class="prism-kv-box">
            <span class="prism-kv-k">${esc(tx('statsUploads'))}</span>
            <span class="prism-kv-v">${model.localCount}</span>
          </div>
          <div class="prism-kv-box">
            <span class="prism-kv-k">${esc(tx('statsSteam'))}</span>
            <span class="prism-kv-v">${esc(store.stats.steamRoot || (store.stats.steamFound ? (isZh ? '已检测到' : 'Detected') : (isZh ? '本地模式' : 'Local Mode')))}</span>
          </div>
        </div>
      </div>

      <!-- 3-Tier Non-Destructive Reset + Restore Host Default (Zero window.confirm!) -->
      <div class="prism-card span-full" style="display:flex;flex-direction:column;gap:7px">
        <strong style="font-size:12.5px">${esc(tr('host.dangerTitle'))}</strong>
        ${renderConfirmRow({
          confirmKey: 'reset:skin',
          label: tr('host.resetSkin'),
          btnLabel: isZh ? '↺ 外观' : '↺ Skin',
          action: 'exec-reset-scope',
          payload: 'skin',
        })}
        ${renderConfirmRow({
          confirmKey: 'reset:optics',
          label: tr('host.resetOptics'),
          btnLabel: isZh ? '↺ 光学' : '↺ Optics',
          action: 'exec-reset-scope',
          payload: 'optics',
        })}
        ${renderConfirmRow({
          confirmKey: 'reset:playback',
          label: tr('host.resetPlayback'),
          btnLabel: isZh ? '↺ 播放' : '↺ Playback',
          action: 'exec-reset-scope',
          payload: 'playback',
        })}
        ${renderConfirmRow({
          confirmKey: 'reset:all',
          label: tr('host.resetAll'),
          btnLabel: isZh ? '↺ 重置全部' : '↺ Reset All',
          danger: true,
          action: 'exec-reset-scope',
          payload: 'all',
        })}
        ${renderConfirmRow({
          confirmKey: 'restore:host',
          label: tr('host.restoreSkin'),
          btnLabel: tr('host.restoreSkin'),
          danger: true,
          action: 'exec-restore-host',
        })}
      </div>
    </div>
  `;
}
