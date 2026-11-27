// In-Host Quick Prism Popover & Statusbar/Corner Trigger for Antigravity (agy-wallpaper-prism v2.4.0).
//
// Self-contained ES2020 browser IIFE injected over CDP alongside `wallpaper-inject.js`.
// Strictly isolated inside `#agy-prism-popover` (`all: initial; position: fixed; z-index: 45`)
// + `#agy-prism-popover-css` + inline `#agy-prism-pill` trigger.
//
// Exposes `window.__agyPrismPanel = { version, syncState, receive, toggle, open, close,
// openDrilldown, closeDrilldown, destroy, heal, snapshot, status }`.
(function agyPrismPanelMain() {
  'use strict';

  var VERSION = '2.4.0';
  var W = typeof window !== 'undefined' ? window : null;
  if (!W || !W.document) return { installed: false, reason: 'no-window' };
  try {
    if (W.top && W !== W.top) return { installed: false, reason: 'subframe' };
  } catch (_) {}
  var doc = W.document;

  var API_KEY = '__agyPrismPanel';
  var SKIN_KEY = '__agyPrism';
  var BINDING_KEY = '__agyPrismCall';
  var ROOT_ID = 'agy-prism-popover';
  var STYLE_ID = 'agy-prism-popover-css';
  var PILL_ID = 'agy-prism-pill';
  var PILL_STYLE_ID = 'agy-prism-pill-css';
  var HTML_ATTR = 'data-agy-prism-panel';
  var Z_INDEX = 45;

  var prev = W[API_KEY];
  var carry = null;
  if (prev && typeof prev === 'object') {
    if (prev.version === VERSION && typeof prev.alive === 'function' && prev.alive()) {
      try {
        prev.heal();
      } catch (_) {}
      return prev.status();
    }
    try {
      if (typeof prev.snapshot === 'function') carry = prev.snapshot();
    } catch (_) {}
    try {
      if (typeof prev.destroy === 'function') prev.destroy();
    } catch (_) {}
  }

  // ---------------------------------------------------------------------------
  // Canonical Defaults, Scene Presets, Color Swatches & Bilingual Copy (zh / en)
  // ---------------------------------------------------------------------------
  var DEFAULTS = {
    skinEnabled: true,
    preset: 'islands',
    layoutMode: 'islands',
    islandGap: 8,
    workspacePad: 8,
    cornerStyle: 'balanced',
    borders: 'on',
    shadows: true,
    transparentWindowControls: true,
    topbarStyle: 'pills',
    hideWelcomeLogo: false,
    themeMode: 'auto',
    colorScheme: 'prism-default',
    accentMode: 'dynamic',
    customAccent: '#669DF6',
    glassSurfaces: true,
    glassOpacity: 0.76,
    glassBlur: 16,
    sidebarOpacity: null,
    sidebarBlur: null,
    regions: null,
    surfaceTints: null,
    sidebarListStyle: 'capsule',
    globalFontSize: null,
    globalFontFamily: '',
    globalFontColor: '',
    glassFidelity: 92,
    chatGlassFidelity: 90,
    contrastFloor: true,
    floaterSolidBase: true,
    scrimOpacity: 0.26,
    vignette: true,
    grainAlpha: 0.022,
    codeReadabilityMode: 'translucent',
    mediaBlur: 0,
    paused: false,
    muted: true,
    audioEnabled: false,
    volume: 0.5,
    fpsCap: 0,
    fxEnabled: false,
    parallaxEnabled: false,
    rotationEnabled: false,
    pauseOnHidden: true,
    pauseOnBlur: false,
    libraryAnimatedThumbs: 'hover',
    triggerMode: 'both',
    language: 'zh',
  };

  var SURFACE_TINT_COMPONENTS = [
    'topbar',
    'wco',
    'sidebar',
    'workspace',
    'userBubble',
    'assistantBubble',
    'codeBlock',
    'card',
    'controls',
    'composer',
    'rightPane',
    'popover',
  ];
  var SURFACE_TINT_BOUNDS = {
    topbar: { min: 0, max: 0.98 },
    wco: { min: 0, max: 0.98 },
    sidebar: { min: 0, max: 0.98 },
    workspace: { min: 0, max: 0.98 },
    userBubble: { min: 0, max: 0.98 },
    assistantBubble: { min: 0, max: 0.98 },
    codeBlock: { min: 0, max: 0.98 },
    card: { min: 0, max: 0.98 },
    controls: { min: 0, max: 0.98 },
    composer: { min: 0, max: 0.98 },
    rightPane: { min: 0, max: 0.98 },
    popover: { min: 0.5, max: 0.99 },
  };
  var GLASS_STYLES = ['none', 'frosted', 'crystal', 'tinted', 'solid'];
  var STYLE_CYCLE_ORDER = [null, 'none', 'frosted', 'crystal', 'tinted', 'solid'];
  var ZERO_BLUR_BY_DEFAULT_REGIONS = {
    card: 1,
    userBubble: 1,
    assistantBubble: 1,
    codeBlock: 1,
    controls: 1,
  };
  var REGION_OPTICAL_KEYS = [
    'style',
    'glassEnabled',
    'blur',
    'saturation',
    'opacity',
    'tone',
    'tint',
    'borderOpacity',
    'elevation',
  ];
  var PER_WALLPAPER_OVERRIDE_KEY_MAP = {
    layoutMode: 1,
    colorScheme: 1,
    accentMode: 1,
    customAccent: 1,
    glassOpacity: 1,
    glassBlur: 1,
    sidebarOpacity: 1,
    sidebarBlur: 1,
    regions: 1,
    surfaceTints: 1,
    globalFontSize: 1,
    globalFontFamily: 1,
    globalFontColor: 1,
    scrimOpacity: 1,
    mediaOpacity: 1,
    mediaBlur: 1,
    mediaBrightness: 1,
    mediaContrast: 1,
    mediaSaturate: 1,
    grainAlpha: 1,
    vignette: 1,
    fit: 1,
    flip: 1,
    layerPosX: 1,
    layerPosY: 1,
    layerScale: 1,
    playbackRate: 1,
    volume: 1,
    muted: 1,
  };

  var SCENE_PRESETS = {
    crisp: {
      preset: 'crisp',
      borders: 'on',
      shadows: true,
      glassSurfaces: true,
      glassOpacity: 0.76,
      glassBlur: 0,
      sidebarOpacity: null,
      sidebarBlur: null,
      surfaceTints: null,
      glassFidelity: 92,
      chatGlassFidelity: 90,
      scrimOpacity: 0.24,
      mediaBlur: 0,
      vignette: true,
      grainAlpha: 0.015,
      paused: false,
      fpsCap: 60,
    },
    crystal: {
      preset: 'crystal',
      borders: 'on',
      shadows: true,
      glassSurfaces: true,
      glassOpacity: 0.64,
      glassBlur: 18,
      sidebarOpacity: null,
      sidebarBlur: null,
      surfaceTints: null,
      glassFidelity: 82,
      chatGlassFidelity: 78,
      scrimOpacity: 0.18,
      mediaBlur: 0,
      vignette: true,
      grainAlpha: 0.018,
      paused: false,
      fpsCap: 60,
    },
    islands: {
      preset: 'islands',
      borders: 'on',
      shadows: true,
      glassSurfaces: true,
      glassOpacity: 0.76,
      glassBlur: 16,
      sidebarOpacity: null,
      sidebarBlur: null,
      surfaceTints: null,
      glassFidelity: 92,
      chatGlassFidelity: 90,
      scrimOpacity: 0.26,
      mediaBlur: 0,
      vignette: true,
      grainAlpha: 0.022,
      paused: false,
      fpsCap: 60,
    },
    focus: {
      preset: 'focus',
      borders: 'subtle',
      shadows: false,
      glassSurfaces: true,
      glassOpacity: 0.88,
      glassBlur: 20,
      sidebarOpacity: null,
      sidebarBlur: null,
      surfaceTints: null,
      glassFidelity: 100,
      chatGlassFidelity: 100,
      scrimOpacity: 0.42,
      mediaBlur: 8,
      vignette: true,
      grainAlpha: 0.012,
      paused: false,
      fpsCap: 60,
    },
    eco: {
      preset: 'eco',
      borders: 'subtle',
      shadows: false,
      glassSurfaces: false,
      glassOpacity: 0.94,
      glassBlur: 0,
      sidebarOpacity: null,
      sidebarBlur: null,
      surfaceTints: null,
      glassFidelity: 100,
      chatGlassFidelity: 100,
      scrimOpacity: 0.34,
      mediaBlur: 0,
      vignette: false,
      grainAlpha: 0,
      paused: true,
      fxEnabled: false,
      parallaxEnabled: false,
      fpsCap: 30,
    },
  };

  var SCHEMES = [
    { id: 'prism-default', zh: '黑曜', en: 'Obsidian', c1: '#09090B', c2: '#141418', acc: '#669DF6' },
    { id: 'warm-carbon', zh: '暖炭', en: 'Warm', c1: '#10100F', c2: '#1B1A18', acc: '#D97757' },
    { id: 'catppuccin', zh: '猫布', en: 'Mocha', c1: '#181825', c2: '#313244', acc: '#CBA6F7' },
    { id: 'nord', zh: '极地', en: 'Nord', c1: '#242933', c2: '#3B4252', acc: '#88C0D0' },
    { id: 'rose-pine', zh: '松玫', en: 'Rosé', c1: '#191724', c2: '#26233A', acc: '#C4A7E7' },
    { id: 'tokyo-night', zh: '东京', en: 'Tokyo', c1: '#16161E', c2: '#24283B', acc: '#7AA2F7' },
    { id: 'gruvbox', zh: '暖砂', en: 'Gruvbox', c1: '#1D2021', c2: '#3C3836', acc: '#FABD2F' },
    { id: 'host-native', zh: '原生', en: 'Host', c1: '#111114', c2: '#131317', acc: '#2F71E3' },
  ];

  var ACCENTS = [
    { id: 'dynamic', zh: '壁纸取色', en: 'Dynamic' },
    { id: 'palette', zh: '方案默认', en: 'Scheme' },
    { id: 'cobalt', zh: '钴蓝', en: 'Cobalt', hex: '#669DF6' },
    { id: 'iris', zh: '鸢尾', en: 'Iris', hex: '#A58AF8' },
    { id: 'amber', zh: '琥珀', en: 'Amber', hex: '#F2B84B' },
    { id: 'emerald', zh: '翡翠', en: 'Emerald', hex: '#50A37B' },
    { id: 'rose', zh: '玫瑰', en: 'Rose', hex: '#F472B6' },
    { id: 'mono', zh: '极简', en: 'Mono', hex: '#D4D7E0' },
    { id: 'custom', zh: '自选', en: 'Custom' },
  ];

  var COPY = {
    zh: {
      brand: 'Prism',
      connOn: '已连接',
      connOff: '待机中',
      powerOn: '已启用',
      powerOff: '已禁用',
      powerTipOn: '点击一键禁用棱镜皮肤',
      powerTipOff: '点击一键启用棱镜皮肤',
      pillOff: 'Prism · 已关',
      pillTip: 'Wallpaper Prism (左键: 面板 · Shift+点击/中键: 一键启用/禁用 · Ctrl+Alt+W)',
      openStudio: '打开完整 Prism 工作台',
      close: '关闭 (Esc)',
      prev: '上一张',
      play: '播放',
      pause: '暂停',
      next: '下一张',
      mute: '静音/开启声音',
      sceneLabel: 'SCENE',
      layoutLabel: 'LAYOUT',
      flush: '紧凑一体 Flush',
      islands: '浮岛画境 Islands',
      preset_crisp: '清雾',
      preset_crispTitle: '清透无雾 · 全局零毛玻璃模糊',
      preset_crystal: '通透',
      preset_islands: '浮岛',
      preset_focus: '柔焦',
      preset_eco: '省电',
      tab_library: '速选壁纸',
      tab_optics: '光学精调',
      tab_status: '状态',
      searchPh: '搜索壁纸标题或标签…',
      drillBtn: '轮播与筛选',
      drillTitle: '轮播与高级筛选 (按 Esc 返回)',
      drillDone: '完成返回',
      kind_all: '全部',
      kind_image: '图片',
      kind_video: '视频',
      kind_web: '网页',
      kind_scene: '场景',
      source_local: '本地',
      loadMore: '展开更多',
      emptyLib: '暂无匹配壁纸，可在完整工作台中扫描或导入',
      rotateLabel: '自动轮播列表',
      nextBtn: '切换下一张',
      schemeLabel: '棱镜配色方案',
      accentLabel: '强调色来源',
      s_glassOpacity: '界面不透明度',
      s_glassBlur: '毛玻璃模糊',
      s_sidebarOpacity: '侧栏玻璃不透明度',
      s_sidebarBlur: '侧栏毛玻璃模糊',
      autoFollowPrefix: '跟随 · ',
      s_islandGap: '浮岛间距',
      s_scrimOpacity: '背景压暗遮罩',
      s_mediaBlur: '壁纸柔焦模糊',
      s_volume: '壁纸音量',
      resetTip: '重置为默认值',
      sw_glass: '毛玻璃磨砂界面',
      sw_wco: '右上角窗口按钮透明',
      sw_hideWelcomeLogo: '隐藏新对话中央图标',
      sw_vignette: '中央阅读暗角保护',
      sw_pauseBlur: '窗口失焦时自动暂停',
      topbarLabel: '顶栏毛玻璃形态',
      topbar_pills: '文字胶囊 Pills',
      topbar_bar: '整条通栏 Bar',
      compTitle: '各组件玻璃深浅精调',
      compResetAll: '重置全部组件',
      compCat_shell: '框架与工作区',
      compCat_chat: '对话气泡与代码',
      compCat_controls: '卡片、控件与浮窗',
      comp_topbar: '顶部菜单胶囊',
      comp_wco: '右上角窗口控制胶囊',
      wcoNeedsTransparent: '请先开启右上角控制按钮透明',
      wcoDisabledHint: '请先开启上方「右上角窗口按钮透明」以生效',
      comp_sidebar: '左侧边栏与项目导航',
      comp_workspace: '主对话与工作区',
      comp_userBubble: '用户消息气泡',
      comp_assistantBubble: 'AI 回复与任务卡',
      comp_codeBlock: '代码块与表格',
      comp_rightPane: '右侧辅助面板',
      comp_composer: '底部对话输入框',
      comp_card: '扩展与接管卡片',
      comp_controls: '按钮与交互控件',
      comp_popover: '浮窗菜单与快捷面板',
      style_auto: '跟随',
      style_autoNoBlur: '默认无雾',
      style_autoFrosted: '跟随·磨砂',
      style_autoSolid: '跟随·纯色',
      style_none: '无毛玻璃',
      style_frosted: '毛玻璃',
      style_crystal: '水晶',
      style_tinted: '着色',
      style_solid: '纯色',
      styleCycleTip: '点击切换玻璃风格（当前：{style}）',
      sidebarStyleLabel: '侧栏风格',
      sidebarStyle_capsule: '胶囊',
      sidebarStyle_underline: '底边',
      sidebarStyle_accordion: '手风琴',
      sidebarStyle_tree: '目录树',
      pausedResumeHint: '已暂停 · 点击恢复',
      toggleTimeoutErr: '切换超时，已同步宿主最新状态',
      toggleFailToast: '切换皮肤超时或未连接，已恢复原状态',
      codeLabel: '代码/终端底板',
      code_translucent: '通透',
      code_frosted: '磨砂',
      code_solid: '实心',
      st_skin: '棱镜皮肤状态',
      st_skinOn: '生效中',
      st_skinOff: '已还原原生',
      st_active: '当前壁纸',
      st_none: '未选择',
      st_theme: '当前明暗 / 配色',
      st_rpc: '宿主桥接通道',
      st_version: '版本',
      st_updateAvail: '有更新',
      updateTip: '发现新版本 v{v}，点击打开完整工作台一键更新',
      updateToast: '发现新版本 v{v}，请打开完整 Prism 工作台一键更新',
      btnRefresh: '刷新状态',
      btnResetSkin: '重置外观参数',
      btnReapply: '重新启用棱镜皮肤',
      btnRestore: '还原宿主默认外观',
      btnRestoreConfirm: '确认还原？(再点一次确认，Esc 取消)',
      cancel: '取消',
      studioToast: '请在右侧边栏「+ -> Plugins -> Wallpaper Prism」或对话药丸打开完整工作台',
    },
    en: {
      brand: 'Prism',
      connOn: 'Connected',
      connOff: 'Standby',
      powerOn: 'ON',
      powerOff: 'OFF',
      powerTipOn: 'Click to disable Prism skin',
      powerTipOff: 'Click to enable Prism skin',
      pillOff: 'Prism · OFF',
      pillTip: 'Wallpaper Prism (Click: Panel · Shift+Click/Middle-Click: Enable/Disable · Ctrl+Alt+W)',
      openStudio: 'Open Full Prism Studio',
      close: 'Close (Esc)',
      prev: 'Previous',
      play: 'Play',
      pause: 'Pause',
      next: 'Next',
      mute: 'Mute / Unmute',
      sceneLabel: 'SCENE',
      layoutLabel: 'LAYOUT',
      flush: 'Flush',
      islands: 'Islands',
      preset_crisp: 'Crisp',
      preset_crispTitle: 'Crisp Glass · Zero backdrop blur everywhere',
      preset_crystal: 'Crystal',
      preset_islands: 'Islands',
      preset_focus: 'Focus',
      preset_eco: 'Eco',
      tab_library: 'Library',
      tab_optics: 'Optics',
      tab_status: 'Status',
      searchPh: 'Search wallpapers or tags…',
      drillBtn: 'Playlist & Filter',
      drillTitle: 'Rotation & Rating Filter (Esc to close)',
      drillDone: 'Done',
      kind_all: 'All',
      kind_image: 'Image',
      kind_video: 'Video',
      kind_web: 'Web',
      kind_scene: 'Scene',
      source_local: 'Local',
      loadMore: 'Load More',
      emptyLib: 'No matching wallpapers found. Open Full Studio to scan or upload.',
      rotateLabel: 'Auto-Rotate Playlist',
      nextBtn: 'Step Next',
      schemeLabel: 'Color Scheme',
      accentLabel: 'Accent Mode',
      s_glassOpacity: 'Glass Opacity',
      s_glassBlur: 'Backdrop Blur',
      s_sidebarOpacity: 'Sidebar Opacity',
      s_sidebarBlur: 'Sidebar Blur',
      autoFollowPrefix: 'Auto · ',
      s_islandGap: 'Island Gap',
      s_scrimOpacity: 'Scrim Veil',
      s_mediaBlur: 'Wallpaper Blur',
      s_volume: 'Audio Volume',
      resetTip: 'Reset to default',
      sw_glass: 'Frosted Glass Surfaces',
      sw_wco: 'Transparent Window Buttons',
      sw_hideWelcomeLogo: 'Hide New-Chat Watermark Logo',
      sw_vignette: 'Central Reading Vignette',
      sw_pauseBlur: 'Auto-Pause When Unfocused',
      topbarLabel: 'Topbar Glass Style',
      topbar_pills: 'Text Pills',
      topbar_bar: 'Full Bar',
      compTitle: 'Component Glass Depth',
      compResetAll: 'Reset All Components',
      compCat_shell: 'Shell & Panes',
      compCat_chat: 'Chat Bubbles & Code',
      compCat_controls: 'Cards, Controls & Popovers',
      comp_topbar: 'Topbar Menu Pills',
      comp_wco: 'Window Control Pill (WCO)',
      wcoNeedsTransparent: 'Enable transparent window controls first',
      wcoDisabledHint: 'Enable "Transparent Window Buttons" first',
      comp_sidebar: 'Left Sidebar & Projects',
      comp_workspace: 'Chat & Main Workspace',
      comp_userBubble: 'User Chat Bubble',
      comp_assistantBubble: 'Assistant Reply & Cards',
      comp_codeBlock: 'Code Blocks & Tables',
      comp_rightPane: 'Right Side / Aux Pane',
      comp_composer: 'Input Composer Box',
      comp_card: 'Extension & Takeover Cards',
      comp_controls: 'Host Controls & Pills',
      comp_popover: 'Popovers & Quick Prism',
      style_auto: 'Auto',
      style_autoNoBlur: 'No Blur',
      style_autoFrosted: 'Auto·Frost',
      style_autoSolid: 'Auto·Solid',
      style_none: 'No Blur',
      style_frosted: 'Frosted',
      style_crystal: 'Crystal',
      style_tinted: 'Tinted',
      style_solid: 'Solid',
      styleCycleTip: 'Click to cycle glass style (current: {style})',
      sidebarStyleLabel: 'Sidebar Style',
      sidebarStyle_capsule: 'Capsule',
      sidebarStyle_underline: 'Underline',
      sidebarStyle_accordion: 'Accordion',
      sidebarStyle_tree: 'Tree',
      pausedResumeHint: 'Paused · Click to resume',
      toggleTimeoutErr: 'Toggle timed out — synced latest host state',
      toggleFailToast: 'Skin toggle timed out or disconnected — reverted',
      codeLabel: 'Code & Terminal Backing',
      code_translucent: 'Tint',
      code_frosted: 'Frost',
      code_solid: 'Solid',
      st_skin: 'Prism Skin Status',
      st_skinOn: 'Active',
      st_skinOff: 'Restored to Host',
      st_active: 'Active Wallpaper',
      st_none: 'None',
      st_theme: 'Polarity / Scheme',
      st_rpc: 'CDP Host Bridge',
      st_version: 'Version',
      st_updateAvail: 'Update',
      updateTip: 'Update v{v} available — open Full Studio to update',
      updateToast: 'Update v{v} available — open Full Prism Studio to update in one click',
      btnRefresh: 'Refresh',
      btnResetSkin: 'Reset Optics',
      btnReapply: 'Re-enable Prism Skin',
      btnRestore: 'Restore Host Default',
      btnRestoreConfirm: 'Confirm Restore? (Click again, Esc cancels)',
      cancel: 'Cancel',
      studioToast: 'Open via Aux Pane "+ -> Plugins -> Wallpaper Prism" or sidecar:// pill',
    },
  };

  var ICONS = {
    prism:
      '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M12 2.5 21 12l-9 9.5L3 12 12 2.5Z"/><path d="M12 2.5v19M3 12h18" opacity=".45"/></svg>',
    prev:
      '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M6 6h2v12H6V6zm3.5 6 8.5 6V6l-8.5 6z"/></svg>',
    play:
      '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M8 5.5v13l10.5-6.5L8 5.5z"/></svg>',
    pause:
      '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M7 5h3.5v14H7V5zm6.5 0H17v14h-3.5V5z"/></svg>',
    next:
      '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M16 6h2v12h-2V6zM6 18l8.5-6L6 6v12z"/></svg>',
    volOn:
      '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>',
    volOff:
      '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg>',
    ext:
      '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6"/><path d="M10 14 20 4"/><path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5"/></svg>',
    close:
      '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    reset:
      '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
    check:
      '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  };

  // ---------------------------------------------------------------------------
  // State & Helpers
  // ---------------------------------------------------------------------------
  var PAGE_SIZE = 90;
  var ui = {
    open: false,
    tab: 'optics',
    drilldown: false,
    query: '',
    kindFilter: '',
    localOnly: false,
    favOnly: false,
    pageLimit: PAGE_SIZE,
    ratings: { everyone: true, pg13: true, mature: false, unrated: true },
    pos: null,
  };

  var store = {
    skinEnabled: true,
    config: {},
    activeItem: null,
    items: [],
    connected: false,
    theme: 'dark',
    updateStatus: null,
    lastAppliedRev: 0,
    lastRevEpoch: '',
  };

  if (carry && typeof carry === 'object') {
    if (carry.ui) {
      for (var uk in ui) if (Object.prototype.hasOwnProperty.call(carry.ui, uk)) ui[uk] = carry.ui[uk];
    }
    if (carry.store) {
      if (carry.store.config) store.config = carry.store.config;
      if (carry.store.activeItem) store.activeItem = carry.store.activeItem;
      if (Array.isArray(carry.store.items)) store.items = carry.store.items;
      if (typeof carry.store.skinEnabled === 'boolean') store.skinEnabled = carry.store.skinEnabled;
      if (carry.store.updateStatus && typeof carry.store.updateStatus === 'object') store.updateStatus = carry.store.updateStatus;
    }
  }

  var destroyed = false;
  var mounted = false;
  var restoreArmed = false;
  var restoreTimer = 0;
  var toggleSeq = 0;
  var toggleBusy = false;
  var pendingToggleTarget = null;
  var toggleStartRev = 0;
  var patchQueue = {};
  var patchTimer = 0;
  var lastPatchFlushAt = 0;
  var patchFlushSeq = 0;
  var searchTimer = 0;
  var toastTimer = 0;
  var lastFocus = null;
  var rpcSeq = 0;
  var rpcPending = {};
  var els = {};
  var sliderRefs = {};
  var compSliderRefs = {};
  var cleanups = [];
  var domObserver = null;
  var themeObserver = null;
  var housekeepTimer = 0;

  function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
  }
  function clearLazyKeepAlive() {
    try {
      if (W.__agyPrismKt) {
        clearTimeout(W.__agyPrismKt);
        clearInterval(W.__agyPrismKt);
        W.__agyPrismKt = 0;
      }
    } catch (_) {}
  }
  function normalizeUpdateInfo(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var hasUpd = Boolean(raw.updateAvailable || raw.hasUpdate);
    var latest = String(raw.latestVersion || raw.latest || '').replace(/^v/i, '').trim();
    var releaseUrl = typeof raw.releaseUrl === 'string' && /^https:\/\//i.test(raw.releaseUrl) ? raw.releaseUrl : '';
    return {
      updateAvailable: hasUpd,
      hasUpdate: hasUpd,
      latestVersion: latest,
      releaseUrl: releaseUrl,
    };
  }
  function hasBinding() {
    return typeof W[BINDING_KEY] === 'function';
  }
  function getLang() {
    var l = String((store.config && store.config.language) || DEFAULTS.language).toLowerCase();
    if (l === 'en') return 'en';
    if (l === 'zh' || l === 'zh-cn') return 'zh';
    var nav = String((W.navigator && W.navigator.language) || 'zh').toLowerCase();
    return nav.indexOf('zh') === 0 ? 'zh' : 'en';
  }
  function tr(key) {
    var lang = getLang();
    return (COPY[lang] && COPY[lang][key]) || COPY.zh[key] || key;
  }
  function getActiveWallpaperId() {
    var fromItem = store.activeItem && store.activeItem.id ? String(store.activeItem.id) : '';
    if (fromItem) return fromItem;
    if (store.config && typeof store.config === 'object') {
      var fromCfg = String(store.config.activeWallpaperId || store.config.wallpaperId || '');
      if (fromCfg) return fromCfg;
    }
    return '';
  }
  function getActiveOverride() {
    var wid = getActiveWallpaperId();
    var map = store.config && store.config.perWallpaperOverrides;
    if (!wid || !map || typeof map !== 'object' || Array.isArray(map)) return null;
    var ov = map[wid];
    return ov && typeof ov === 'object' && !Array.isArray(ov) ? ov : null;
  }
  function parseNullableOp(v) {
    if (v === null || v === undefined || v === '' || v === 'auto') return null;
    var n = Number(v);
    if (!Number.isFinite(n)) return null;
    if (n >= 2) n = n / 100;
    return n;
  }
  function parseNullableBlur(v) {
    if (v === null || v === undefined || v === '' || v === 'auto') return null;
    var n = Number(v);
    if (!Number.isFinite(n)) return null;
    return clamp(Math.round(n), 0, 64);
  }
  function resolveCompOpFromLayer(layer, compId) {
    if (!layer || typeof layer !== 'object') return { found: false, value: null };
    var hasReg = Object.prototype.hasOwnProperty.call(layer, 'regions');
    var reg = hasReg ? layer.regions : undefined;
    var regResetAll = hasReg && reg === null;
    var regHasComp =
      hasReg &&
      reg &&
      typeof reg === 'object' &&
      !Array.isArray(reg) &&
      Object.prototype.hasOwnProperty.call(reg, compId);
    var regCompVal = regHasComp ? reg[compId] : undefined;
    var regTouchedComp =
      regResetAll ||
      (regHasComp && regCompVal === null) ||
      (regHasComp && regCompVal && typeof regCompVal === 'object' && Object.prototype.hasOwnProperty.call(regCompVal, 'opacity'));
    var regOp =
      regResetAll || (regHasComp && regCompVal === null)
        ? null
        : regHasComp && regCompVal && typeof regCompVal === 'object'
          ? parseNullableOp(regCompVal.opacity)
          : null;

    var hasSt = Object.prototype.hasOwnProperty.call(layer, 'surfaceTints');
    var st = hasSt ? layer.surfaceTints : undefined;
    var stResetAll = hasSt && st === null;
    var stHasComp =
      hasSt &&
      st &&
      typeof st === 'object' &&
      !Array.isArray(st) &&
      Object.prototype.hasOwnProperty.call(st, compId);
    var stCompVal = stHasComp ? st[compId] : undefined;
    var stTouchedComp =
      stResetAll ||
      (stHasComp && stCompVal === null) ||
      (stHasComp && stCompVal && typeof stCompVal === 'object' && Object.prototype.hasOwnProperty.call(stCompVal, 'opacity'));
    var stOp =
      stResetAll || (stHasComp && stCompVal === null)
        ? null
        : stHasComp && stCompVal && typeof stCompVal === 'object'
          ? parseNullableOp(stCompVal.opacity)
          : null;

    var hasSb = compId === 'sidebar' && Object.prototype.hasOwnProperty.call(layer, 'sidebarOpacity');
    var sbVal = hasSb ? parseNullableOp(layer.sidebarOpacity) : null;

    var canonTouched = regTouchedComp || stTouchedComp;
    var canonResetAll = regResetAll || (stResetAll && !regTouchedComp);
    var canonOp = regTouchedComp ? regOp : stOp;

    if (compId !== 'sidebar') {
      return canonTouched ? { found: true, value: canonOp } : { found: false, value: null };
    }
    if (canonTouched && !hasSb) return { found: true, value: canonOp };
    if (hasSb && !canonTouched) return { found: true, value: sbVal };
    if (canonTouched && hasSb) {
      if (canonResetAll && sbVal !== null) return { found: true, value: sbVal };
      return { found: true, value: canonOp };
    }
    return { found: false, value: null };
  }
  function resolveSidebarBlurFromLayer(layer) {
    if (!layer || typeof layer !== 'object') return { found: false, value: null };
    var hasReg = Object.prototype.hasOwnProperty.call(layer, 'regions');
    var reg = hasReg ? layer.regions : undefined;
    var regResetAll = hasReg && reg === null;
    var regHasSb =
      hasReg &&
      reg &&
      typeof reg === 'object' &&
      !Array.isArray(reg) &&
      Object.prototype.hasOwnProperty.call(reg, 'sidebar');
    var regSbVal = regHasSb ? reg.sidebar : undefined;
    var regTouched =
      regResetAll ||
      (regHasSb && regSbVal === null) ||
      (regHasSb && regSbVal && typeof regSbVal === 'object' && Object.prototype.hasOwnProperty.call(regSbVal, 'blur'));
    var regBlur =
      regResetAll || (regHasSb && regSbVal === null)
        ? null
        : regHasSb && regSbVal && typeof regSbVal === 'object'
          ? parseNullableBlur(regSbVal.blur)
          : null;

    var hasSt = Object.prototype.hasOwnProperty.call(layer, 'surfaceTints');
    var st = hasSt ? layer.surfaceTints : undefined;
    var stResetAll = hasSt && st === null;
    var stHasSb =
      hasSt &&
      st &&
      typeof st === 'object' &&
      !Array.isArray(st) &&
      Object.prototype.hasOwnProperty.call(st, 'sidebar');
    var stSbVal = stHasSb ? st.sidebar : undefined;
    var stTouched =
      stResetAll ||
      (stHasSb && stSbVal === null) ||
      (stHasSb && stSbVal && typeof stSbVal === 'object' && Object.prototype.hasOwnProperty.call(stSbVal, 'blur'));
    var stBlur =
      stResetAll || (stHasSb && stSbVal === null)
        ? null
        : stHasSb && stSbVal && typeof stSbVal === 'object'
          ? parseNullableBlur(stSbVal.blur)
          : null;

    var hasLegacy = Object.prototype.hasOwnProperty.call(layer, 'sidebarBlur');
    var legacyBlur = hasLegacy ? parseNullableBlur(layer.sidebarBlur) : null;

    var canonTouched = regTouched || stTouched;
    var canonResetAll = regResetAll || (stResetAll && !regTouched);
    var canonBlur = regTouched ? regBlur : stBlur;

    if (canonTouched && !hasLegacy) return { found: true, value: canonBlur };
    if (hasLegacy && !canonTouched) return { found: true, value: legacyBlur };
    if (canonTouched && hasLegacy) {
      if (canonResetAll && legacyBlur !== null) return { found: true, value: legacyBlur };
      return { found: true, value: canonBlur };
    }
    return { found: false, value: null };
  }
  function readSidebarBlur() {
    var r1 = resolveSidebarBlurFromLayer(patchQueue);
    if (r1.found) return r1.value;
    var r2 = resolveSidebarBlurFromLayer(getActiveOverride());
    if (r2.found) return r2.value;
    var r3 = resolveSidebarBlurFromLayer(store.config);
    if (r3.found) return r3.value;
    return null;
  }
  function cfgVal(key) {
    if (key === 'sidebarOpacity') return readComponentOpacity('sidebar');
    if (key === 'sidebarBlur') return readSidebarBlur();
    if (Object.prototype.hasOwnProperty.call(patchQueue, key)) return patchQueue[key];
    if (PER_WALLPAPER_OVERRIDE_KEY_MAP[key]) {
      var ov = getActiveOverride();
      if (ov && Object.prototype.hasOwnProperty.call(ov, key) && ov[key] !== undefined) {
        return ov[key];
      }
    }
    if (store.config && store.config[key] !== undefined) return store.config[key];
    return DEFAULTS[key];
  }
  function mergeRegionsObj(baseObj, incoming) {
    if (incoming === null) return null;
    var out = {};
    if (baseObj && typeof baseObj === 'object' && !Array.isArray(baseObj)) {
      for (var bk in baseObj) {
        if (!Object.prototype.hasOwnProperty.call(baseObj, bk)) continue;
        var bv = baseObj[bk];
        out[bk] = bv && typeof bv === 'object' && !Array.isArray(bv) ? Object.assign({}, bv) : bv;
      }
    }
    if (incoming && typeof incoming === 'object' && !Array.isArray(incoming)) {
      for (var ik in incoming) {
        if (!Object.prototype.hasOwnProperty.call(incoming, ik)) continue;
        var iv = incoming[ik];
        if (iv === null) {
          out[ik] = null;
        } else if (iv && typeof iv === 'object' && !Array.isArray(iv)) {
          var prevEnt = out[ik] && typeof out[ik] === 'object' && !Array.isArray(out[ik]) ? out[ik] : {};
          var nextEnt = Object.assign({}, prevEnt);
          for (var pk in iv) {
            if (Object.prototype.hasOwnProperty.call(iv, pk) && iv[pk] !== undefined) {
              nextEnt[pk] = iv[pk];
            }
          }
          out[ik] = nextEnt;
        }
      }
    }
    return out;
  }
  function createOpticalResetObj() {
    return {
      style: null,
      glassEnabled: null,
      blur: null,
      saturation: null,
      opacity: null,
      tone: 0,
      tint: '',
      borderOpacity: null,
      elevation: null,
    };
  }
  function stripOpticalFromRegionEntry(ent) {
    var next = {};
    if (ent && typeof ent === 'object' && !Array.isArray(ent)) {
      for (var k in ent) {
        if (Object.prototype.hasOwnProperty.call(ent, k)) next[k] = ent[k];
      }
    }
    var rst = createOpticalResetObj();
    for (var rk in rst) {
      if (Object.prototype.hasOwnProperty.call(rst, rk)) next[rk] = rst[rk];
    }
    return next;
  }
  function stripOpticalFromRegionsObj(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
    var out = {};
    for (var k in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
      var v = obj[k];
      out[k] = v && typeof v === 'object' && !Array.isArray(v) ? stripOpticalFromRegionEntry(v) : v;
    }
    return out;
  }
  function pickOpticalKeys(ent) {
    if (!ent || typeof ent !== 'object' || Array.isArray(ent)) return null;
    var out = {};
    var any = false;
    for (var i = 0; i < REGION_OPTICAL_KEYS.length; i += 1) {
      var ok = REGION_OPTICAL_KEYS[i];
      if (Object.prototype.hasOwnProperty.call(ent, ok) && ent[ok] !== undefined) {
        out[ok] = ent[ok];
        any = true;
      }
    }
    return any ? out : null;
  }
  function mergeSurfaceTintsObj(baseObj, incoming) {
    if (incoming === null) return null;
    var out = {};
    if (baseObj && typeof baseObj === 'object' && !Array.isArray(baseObj)) {
      for (var bk in baseObj) {
        if (!Object.prototype.hasOwnProperty.call(baseObj, bk)) continue;
        var bv = baseObj[bk];
        out[bk] = bv && typeof bv === 'object' ? Object.assign({}, bv) : bv;
      }
    }
    if (incoming && typeof incoming === 'object' && !Array.isArray(incoming)) {
      for (var ik in incoming) {
        if (!Object.prototype.hasOwnProperty.call(incoming, ik)) continue;
        var iv = incoming[ik];
        if (iv === null) {
          out[ik] = createOpticalResetObj();
        } else if (iv && typeof iv === 'object') {
          out[ik] = Object.assign({}, out[ik] && typeof out[ik] === 'object' ? out[ik] : {}, iv);
        }
      }
    }
    return out;
  }
  function normalizeStyleValue(v) {
    if (v === null || v === undefined || v === '' || v === 'auto') return null;
    var s = String(v).trim();
    return GLASS_STYLES.indexOf(s) >= 0 ? s : null;
  }
  function resolveRegionPropFromLayer(layer, compId, prop) {
    if (!layer || typeof layer !== 'object') return { found: false, value: undefined, reset: false };
    var hasReg = Object.prototype.hasOwnProperty.call(layer, 'regions');
    var reg = hasReg ? layer.regions : undefined;
    var regResetAll = hasReg && reg === null;
    var regHasComp =
      hasReg &&
      reg &&
      typeof reg === 'object' &&
      !Array.isArray(reg) &&
      Object.prototype.hasOwnProperty.call(reg, compId);
    var regCompVal = regHasComp ? reg[compId] : undefined;
    var regTouched =
      regResetAll ||
      (regHasComp && regCompVal === null) ||
      (regHasComp && regCompVal && typeof regCompVal === 'object' && Object.prototype.hasOwnProperty.call(regCompVal, prop));

    var hasSt = Object.prototype.hasOwnProperty.call(layer, 'surfaceTints');
    var st = hasSt ? layer.surfaceTints : undefined;
    var stResetAll = hasSt && st === null;
    var stHasComp =
      hasSt &&
      st &&
      typeof st === 'object' &&
      !Array.isArray(st) &&
      Object.prototype.hasOwnProperty.call(st, compId);
    var stCompVal = stHasComp ? st[compId] : undefined;
    var stTouched =
      stResetAll ||
      (stHasComp && stCompVal === null) ||
      (stHasComp && stCompVal && typeof stCompVal === 'object' && Object.prototype.hasOwnProperty.call(stCompVal, prop));

    if (regTouched) {
      return {
        found: true,
        value: regResetAll || (regHasComp && regCompVal === null) ? undefined : regCompVal[prop],
        reset: regResetAll || (regHasComp && regCompVal === null),
      };
    }
    if (stTouched) {
      return {
        found: true,
        value: stResetAll || (stHasComp && stCompVal === null) ? undefined : stCompVal[prop],
        reset: stResetAll || (stHasComp && stCompVal === null),
      };
    }
    return { found: false, value: undefined, reset: false };
  }
  function readComponentOpticalProp(compId, prop, defVal) {
    var layers = [patchQueue, getActiveOverride(), store.config];
    for (var i = 0; i < layers.length; i += 1) {
      var res = resolveRegionPropFromLayer(layers[i], compId, prop);
      if (res.found) return res.reset ? defVal : res.value;
    }
    return defVal;
  }
  function readComponentStyle(compId) {
    return normalizeStyleValue(readComponentOpticalProp(compId, 'style', null));
  }
  function readComponentBlur(compId) {
    return parseNullableBlur(readComponentOpticalProp(compId, 'blur', null));
  }
  function isComponentOpticallyDirty(compId) {
    if (readComponentOpacity(compId) !== null) return true;
    var curBlur = compId === 'sidebar' ? readSidebarBlur() : readComponentBlur(compId);
    if (curBlur !== null) return true;
    if (readComponentStyle(compId) !== null) return true;
    var ge = readComponentOpticalProp(compId, 'glassEnabled', null);
    if (typeof ge === 'boolean') return true;
    var sat = readComponentOpticalProp(compId, 'saturation', null);
    if (sat !== null && sat !== undefined && sat !== '' && Number.isFinite(Number(sat))) return true;
    var tone = readComponentOpticalProp(compId, 'tone', 0);
    if (Number.isFinite(Number(tone)) && Number(tone) !== 0) return true;
    var tint = readComponentOpticalProp(compId, 'tint', '');
    if (typeof tint === 'string' && tint.trim()) return true;
    var bop = readComponentOpticalProp(compId, 'borderOpacity', null);
    if (bop !== null && bop !== undefined && bop !== '' && Number.isFinite(Number(bop))) return true;
    var elev = readComponentOpticalProp(compId, 'elevation', null);
    if (elev !== null && elev !== undefined && elev !== '' && Number.isFinite(Number(elev))) return true;
    return false;
  }
  function resolveEffectiveComponentStyle(compId, explicitStyle, cfg) {
    var norm = normalizeStyleValue(explicitStyle);
    if (norm) return norm;
    if (compId === 'codeBlock') {
      var cm = String((cfg && cfg.codeReadabilityMode) || DEFAULTS.codeReadabilityMode || 'translucent');
      if (cm === 'solid') return 'solid';
      if (cm === 'frosted') return 'frosted';
      return 'none';
    }
    if (ZERO_BLUR_BY_DEFAULT_REGIONS[compId]) return 'none';
    return null;
  }
  function styleChipLabel(compId, explicitStyle, cfg) {
    var norm = normalizeStyleValue(explicitStyle);
    if (norm) return tr('style_' + norm);
    if (compId === 'codeBlock') {
      var cm = String((cfg && cfg.codeReadabilityMode) || DEFAULTS.codeReadabilityMode || 'translucent');
      if (cm === 'solid') return tr('style_autoSolid');
      if (cm === 'frosted') return tr('style_autoFrosted');
      return tr('style_autoNoBlur');
    }
    if (ZERO_BLUR_BY_DEFAULT_REGIONS[compId]) return tr('style_autoNoBlur');
    return tr('style_auto');
  }
  function nextCycleStyle(compId, explicitStyle, cfg) {
    var norm = normalizeStyleValue(explicitStyle);
    if (norm === null) {
      if (compId === 'codeBlock') {
        var cm = String((cfg && cfg.codeReadabilityMode) || DEFAULTS.codeReadabilityMode || 'translucent');
        if (cm === 'frosted') return 'crystal';
        if (cm === 'solid') return 'none';
        return 'frosted';
      }
      if (ZERO_BLUR_BY_DEFAULT_REGIONS[compId]) return 'frosted';
      return 'none';
    }
    if (ZERO_BLUR_BY_DEFAULT_REGIONS[compId] && compId !== 'codeBlock' && norm === 'solid') {
      return null;
    }
    var idx = STYLE_CYCLE_ORDER.indexOf(norm);
    if (idx < 0) return 'none';
    return STYLE_CYCLE_ORDER[(idx + 1) % STYLE_CYCLE_ORDER.length];
  }
  function readComponentOpacity(compId) {
    var r1 = resolveCompOpFromLayer(patchQueue, compId);
    if (r1.found) return r1.value;
    var r2 = resolveCompOpFromLayer(getActiveOverride(), compId);
    if (r2.found) return r2.value;
    var r3 = resolveCompOpFromLayer(store.config, compId);
    if (r3.found) return r3.value;
    return null;
  }
  function applyStyleAlphaModifier(baseAlpha, effStyle, light, contrastMin, bounds, isCodeBlock, contrastFloor) {
    if (effStyle === 'solid') {
      return isCodeBlock && contrastFloor ? 1 : (light ? 0.97 : 0.96);
    }
    if (effStyle === 'crystal') {
      var floor = contrastFloor ? Math.max(bounds.min, contrastMin) : bounds.min;
      return clamp(baseAlpha * 0.78, floor, bounds.max);
    }
    if (effStyle === 'tinted') {
      return clamp(baseAlpha * 0.88, bounds.min, bounds.max);
    }
    return baseAlpha;
  }
  function resolveComponentDefaultAlpha(comp, cfg, isLight) {
    var c = cfg && typeof cfg === 'object' ? cfg : {};
    var light = typeof isLight === 'string' ? isLight === 'light' : Boolean(isLight);
    var bounds = SURFACE_TINT_BOUNDS[comp] || { min: 0, max: 0.98 };
    var entry = c.regions && c.regions[comp] && typeof c.regions[comp] === 'object' ? c.regions[comp] : null;
    var explicitStyle = entry ? normalizeStyleValue(entry.style) : null;
    var effStyle = resolveEffectiveComponentStyle(comp, explicitStyle, c);
    var glassEnabled = entry && typeof entry.glassEnabled === 'boolean' ? entry.glassEnabled : null;
    var contrastFloor = c.contrastFloor !== false;

    if (comp === 'popover') {
      var popBase = c.floaterSolidBase !== false ? (light ? 0.97 : 0.96) : 0.94;
      var popAlpha = applyStyleAlphaModifier(popBase, effStyle, light, 0.5, bounds, false, contrastFloor);
      return Math.round(clamp(popAlpha, bounds.min, bounds.max) * 1000) / 1000;
    }

    var gRaw = Number(c.glassOpacity !== undefined ? c.glassOpacity : DEFAULTS.glassOpacity);
    var g = clamp(Number.isFinite(gRaw) ? gRaw : DEFAULTS.glassOpacity, 0.15, 0.98);
    var gfRaw = Number(c.glassFidelity !== undefined ? c.glassFidelity : DEFAULTS.glassFidelity);
    var gf = clamp(Number.isFinite(gfRaw) ? (gfRaw > 0 && gfRaw < 1 ? gfRaw : gfRaw / 100) : 0.92, 0, 1);
    var cgfRaw = Number(c.chatGlassFidelity !== undefined ? c.chatGlassFidelity : DEFAULTS.chatGlassFidelity);
    var cgf = clamp(Number.isFinite(cgfRaw) ? (cgfRaw > 0 && cgfRaw < 1 ? cgfRaw : cgfRaw / 100) : 0.90, 0, 1);
    var layoutMode = c.layoutMode === 'flush' ? 'flush' : 'islands';

    if (comp === 'assistantBubble') {
      if (effStyle === 'none') return 0;
      var rawAsstA = light ? clamp(g * 0.46, 0.22, 0.88) : clamp(g * 0.34, 0.18, 0.84);
      var baseAsstA = Math.max(rawAsstA, (light ? 0.28 : 0.18) * cgf, 0.18);
      if (effStyle === 'solid') return light ? 0.97 : 0.96;
      if (effStyle === 'crystal') {
        return Math.round(clamp(Math.max(baseAsstA, 0.24) * 0.78, 0.18, bounds.max) * 1000) / 1000;
      }
      if (effStyle === 'tinted') {
        return Math.round(clamp(Math.max(baseAsstA, 0.22) * 0.88, 0.16, bounds.max) * 1000) / 1000;
      }
      if (c.glassSurfaces === false && glassEnabled !== true) return 1;
      return Math.round(clamp(baseAsstA, 0.18, bounds.max) * 1000) / 1000;
    }

    if (c.glassSurfaces === false && glassEnabled !== true) return 1;

    var alpha;
    var contrastMin = 0.2;
    if (comp === 'wco') {
      var tbOp = readComponentOpacity('topbar');
      if (effStyle === null && tbOp !== null && tbOp !== undefined && Number.isFinite(Number(tbOp))) {
        return Math.round(clamp(Number(tbOp), 0, 0.98) * 1000) / 1000;
      }
      if (effStyle === null) {
        return resolveComponentDefaultAlpha('topbar', c, light);
      }
      var tbBase =
        tbOp !== null && tbOp !== undefined && Number.isFinite(Number(tbOp))
          ? clamp(Number(tbOp), 0, 0.98)
          : Math.max(g, (contrastFloor ? (light ? 0.48 : 0.36) : 0.15) * gf);
      alpha = tbBase;
      contrastMin = 0.24;
    } else if (comp === 'topbar' || comp === 'sidebar') {
      var minSbFloor = contrastFloor ? (light ? 0.48 : 0.36) : 0.15;
      alpha = Math.max(g, minSbFloor * gf);
      contrastMin = 0.24;
    } else if (comp === 'workspace' || comp === 'rightPane') {
      var rawChatA =
        layoutMode === 'flush' && !light
          ? clamp(g * 0.24, 0, 0.82)
          : light
            ? clamp(g * 0.62, 0.28, 0.92)
            : clamp(g * 0.42, 0.08, 0.88);
      var minChatFloor = light ? 0.42 : 0.16;
      alpha = Math.max(rawChatA, minChatFloor * cgf);
      contrastMin = light ? 0.28 : 0.12;
    } else if (comp === 'userBubble') {
      var rawUbA = light ? clamp(g * 0.95, 0.48, 0.98) : clamp(g * 0.82, 0.34, 0.96);
      var minUbFloor = contrastFloor ? (light ? 0.60 : 0.48) : 0.25;
      alpha = Math.max(rawUbA, minUbFloor * gf);
      contrastMin = light ? 0.42 : 0.34;
    } else if (comp === 'codeBlock') {
      var minEd = contrastFloor ? (light ? 0.84 : 0.72) : (light ? 0.52 : 0.38);
      var rawEdA = light ? clamp(g * 0.96, 0.55, 0.99) : clamp(g * 0.92, 0.45, 0.98);
      alpha = Math.max(rawEdA, minEd * (contrastFloor ? 1 : gf));
      contrastMin = light ? 0.52 : 0.44;
    } else if (comp === 'controls') {
      var rawCtlA = light ? clamp(g * 0.64, 0.34, 0.84) : clamp(g * 0.48, 0.26, 0.78);
      var minCtlFloor = contrastFloor ? (light ? 0.44 : 0.32) : 0.18;
      alpha = Math.max(rawCtlA, minCtlFloor * gf);
      contrastMin = light ? 0.26 : 0.18;
    } else if (comp === 'composer') {
      var rawCompA = light ? clamp(g * 0.94, 0.65, 0.99) : clamp(g * 0.92, 0.48, 0.98);
      var minCompFloor = light ? 0.72 : 0.58;
      alpha = Math.max(rawCompA, minCompFloor * gf);
      contrastMin = light ? 0.42 : 0.32;
    } else if (comp === 'card') {
      var rawCardA = light ? clamp(g * 0.86, 0.5, 0.98) : clamp(g * 0.78, 0.32, 0.96);
      var minCardFloor = light ? 0.62 : 0.48;
      alpha = Math.max(rawCardA, minCardFloor * gf);
      contrastMin = light ? 0.42 : 0.32;
    } else {
      alpha = g;
    }

    alpha = applyStyleAlphaModifier(alpha, effStyle, light, contrastMin, bounds, comp === 'codeBlock', contrastFloor);
    return Math.round(clamp(alpha, 0, 1) * 1000) / 1000;
  }
  function effectiveOpticsCfg() {
    var regs = {};
    for (var i = 0; i < SURFACE_TINT_COMPONENTS.length; i += 1) {
      var cid = SURFACE_TINT_COMPONENTS[i];
      var ge = readComponentOpticalProp(cid, 'glassEnabled', null);
      regs[cid] = {
        style: readComponentStyle(cid),
        glassEnabled: typeof ge === 'boolean' ? ge : null,
      };
    }
    return {
      glassOpacity: cfgVal('glassOpacity'),
      glassSurfaces: cfgVal('glassSurfaces'),
      layoutMode: cfgVal('layoutMode'),
      glassFidelity: cfgVal('glassFidelity'),
      chatGlassFidelity: cfgVal('chatGlassFidelity'),
      contrastFloor: cfgVal('contrastFloor'),
      floaterSolidBase: cfgVal('floaterSolidBase'),
      codeReadabilityMode: cfgVal('codeReadabilityMode'),
      regions: regs,
    };
  }

  function h(tag, props, children) {
    var el = doc.createElement(tag);
    if (props) {
      for (var k in props) {
        if (!Object.prototype.hasOwnProperty.call(props, k)) continue;
        var v = props[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : String(v));
      }
    }
    if (children) {
      for (var i = 0; i < children.length; i += 1) {
        var c = children[i];
        if (c == null || c === false) continue;
        el.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c);
      }
    }
    return el;
  }

  function listen(target, type, fn, opts) {
    if (!target || !target.addEventListener) return;
    target.addEventListener(type, fn, opts);
    cleanups.push(function () {
      try {
        target.removeEventListener(type, fn, opts);
      } catch (_) {}
    });
  }

  // ---------------------------------------------------------------------------
  // Scoped Stylesheet (`#agy-prism-popover-css` + `#agy-prism-pill-css`)
  // ---------------------------------------------------------------------------
  var PANEL_CSS = [
    '#R{all:initial;position:fixed;left:0;top:0;width:0;height:0;overflow:visible;z-index:' + Z_INDEX + ';pointer-events:none;',
    "--pp-font:'Google Sans Flex','Google Sans','Inter',-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans SC','PingFang SC','Microsoft YaHei UI',sans-serif;",
    "--pp-mono:'Google Sans Code','JetBrains Mono','Cascadia Code',Consolas,ui-monospace,monospace;",
    '--pp-accent:#669DF6;--pp-accent-fg:#FFFFFF;--pp-r-sheet:14px;--pp-r-card:10px;--pp-r-ctl:7px;--pp-ease:cubic-bezier(.22,1,.36,1);',
    '--pp-bg:var(--prism-surface-quick-panel, rgba(20,20,26,.72));--pp-bg-solid:var(--prism-surface-popover, rgba(20,20,26,.97));--pp-fg:#F2F2F5;--pp-fg2:#C4C4CE;--pp-muted:#8A8A98;--pp-faint:#626270;',
    '--pp-border:var(--prism-border-popover, rgba(255,255,255,.09));--pp-border2:var(--prism-border-popover, rgba(255,255,255,.15));--pp-fill:rgba(255,255,255,.045);--pp-fill2:rgba(255,255,255,.085);',
    '--pp-hover:rgba(255,255,255,.07);--pp-track:rgba(255,255,255,.14);--pp-spec:var(--prism-specular-popover, rgba(255,255,255,.08));',
    '--pp-sheen:var(--prism-sheen-popover, linear-gradient(172deg,rgba(255,255,255,.045) 0%,rgba(255,255,255,0) 38%));',
    '--pp-shadow:var(--prism-shadow-popover, 0 28px 64px -14px rgba(0,0,0,.64),0 2px 8px rgba(0,0,0,.30));--pp-ok:#50A37B;--pp-warn:#F2B84B;--pp-danger:#E5534B;}',
    '#R[data-theme="light"]{--pp-accent:#2563EB;--pp-bg:var(--prism-surface-quick-panel, rgba(250,251,254,.78));--pp-bg-solid:var(--prism-surface-popover, rgba(252,253,255,.98));--pp-fg:#0F172A;--pp-fg2:#334155;--pp-muted:#5B6B82;--pp-faint:#94A3B8;',
    '--pp-border:var(--prism-border-popover, rgba(15,23,42,.10));--pp-border2:var(--prism-border-popover, rgba(15,23,42,.16));--pp-fill:rgba(15,23,42,.038);--pp-fill2:rgba(15,23,42,.072);',
    '--pp-hover:rgba(15,23,42,.06);--pp-track:rgba(15,23,42,.14);--pp-spec:var(--prism-specular-popover, rgba(255,255,255,.92));',
    '--pp-sheen:var(--prism-sheen-popover, linear-gradient(172deg,rgba(255,255,255,.72) 0%,rgba(255,255,255,0) 40%));',
    '--pp-shadow:var(--prism-shadow-popover, 0 28px 64px -18px rgba(15,23,42,.28),0 2px 8px rgba(15,23,42,.10));--pp-ok:#059669;--pp-warn:#D97706;--pp-danger:#DC2626;}',
    '#R,#R *,#R *::before,#R *::after{box-sizing:border-box;font-family:var(--pp-font);}',
    '#R [hidden]{display:none !important;}',
    '#R button,#R input{margin:0;font:inherit;color:inherit;}',
    '#R svg{display:block;flex-shrink:0;}',
    // Corner Glass Orb
    '#R .prism-corner-orb{position:fixed;left:12px;bottom:12px;width:28px;height:28px;padding:0;display:flex;align-items:center;justify-content:center;pointer-events:auto;cursor:pointer;',
    'border-radius:999px;border:1px solid var(--pp-border2);color:var(--pp-fg2);background-color:var(--pp-bg);background-image:var(--pp-sheen);',
    'backdrop-filter:var(--prism-chrome-chip-backdrop, blur(10px) saturate(110%));-webkit-backdrop-filter:var(--prism-chrome-chip-backdrop, blur(10px) saturate(110%));box-shadow:inset 0 1px 0 var(--pp-spec),0 6px 18px -6px rgba(0,0,0,.45);',
    'opacity:.48;transition:opacity .16s ease,transform .16s var(--pp-ease),color .16s ease;}',
    '#R .prism-corner-orb:hover,#R[data-open="true"] .prism-corner-orb{opacity:1;color:var(--pp-accent);transform:translateY(-1px);}',
    '#R .prism-corner-orb i{position:absolute;right:0;top:0;width:7px;height:7px;border-radius:50%;background:var(--pp-faint);box-shadow:0 0 0 2px var(--pp-bg-solid);transition:background .15s ease,border-color .15s ease;}',
    '#R[data-conn="on"] .prism-corner-orb i{background:var(--pp-ok);}',
    '#R[data-skin-enabled="false"] .prism-corner-orb i{background:transparent;border:1.5px solid var(--pp-faint);}',
    // Main Floating Sheet (384 x max 560px)
    '#R .prism-sheet{position:fixed;left:12px;bottom:48px;width:384px;max-width:calc(100vw - 16px);max-height:560px;display:flex;flex-direction:column;pointer-events:auto;',
    'color:var(--pp-fg);font-size:12.5px;line-height:1.45;-webkit-font-smoothing:antialiased;border-radius:var(--pp-r-sheet);border:1px solid var(--pp-border2);',
    'background-color:var(--pp-bg) !important;background-image:var(--pp-sheen);backdrop-filter:var(--prism-quick-panel-backdrop, var(--prism-popover-backdrop, blur(22px) saturate(145%))) !important;-webkit-backdrop-filter:var(--prism-quick-panel-backdrop, var(--prism-popover-backdrop, blur(22px) saturate(145%))) !important;',
    'box-shadow:inset 0 1px 0 var(--pp-spec),var(--pp-shadow);overflow:hidden;opacity:0;visibility:hidden;transform:translateY(8px) scale(.985);',
    'transition:opacity .16s ease,transform .18s var(--pp-ease),visibility 0s linear .18s;}',
    '#R[data-open="true"] .prism-sheet{opacity:1;visibility:visible;transform:none;transition:opacity .16s ease,transform .18s var(--pp-ease),visibility 0s;}',
    '#R[data-open="false"] .prism-sheet{pointer-events:none;}',
    // Header
    '#R .pp-head{display:flex;align-items:center;gap:3px;height:40px;padding:0 7px 0 10px;border-bottom:1px solid var(--pp-border);cursor:grab;user-select:none;flex-shrink:0;}',
    '#R .pp-head:active{cursor:grabbing;}',
    '#R .pp-logo{color:var(--pp-accent);display:flex;align-items:center;gap:4px;font-weight:600;font-size:12.5px;margin-right:1px;flex-shrink:0;}',
    '#R .pp-conn{display:inline-flex;align-items:center;gap:4px;height:19px;padding:0 6px;border-radius:999px;font-size:10px;color:var(--pp-muted);background:var(--pp-fill);border:1px solid var(--pp-border);flex-shrink:0;white-space:nowrap;}',
    '#R .pp-conn i{width:5.5px;height:5.5px;border-radius:50%;background:var(--pp-faint);}',
    '#R[data-conn="on"] .pp-conn i{background:var(--pp-ok);}',
    '#R .pp-power-btn{display:inline-flex;align-items:center;gap:4px;height:21px;padding:0 7px;border-radius:999px;font-size:10.5px;font-weight:600;line-height:1;cursor:pointer;flex-shrink:0;white-space:nowrap;',
    'border:1px solid var(--pp-border2);background:var(--pp-fill);color:var(--pp-muted);transition:background .15s ease,border-color .15s ease,color .15s ease,box-shadow .15s ease,opacity .15s ease;}',
    '#R .pp-power-btn[data-busy="true"]{opacity:.72;}',
    '#R .pp-power-btn:hover{border-color:var(--pp-accent);color:var(--pp-fg);}',
    '#R .pp-power-btn i{width:6px;height:6px;border-radius:50%;flex-shrink:0;background:transparent;border:1.5px solid var(--pp-faint);transition:background .15s ease,border-color .15s ease,box-shadow .15s ease;}',
    '#R .pp-power-btn[aria-checked="true"]{border-color:color-mix(in srgb,var(--pp-ok) 55%,transparent);background:color-mix(in srgb,var(--pp-ok) 16%,transparent);color:var(--pp-fg);box-shadow:0 0 10px -2px color-mix(in srgb,var(--pp-ok) 45%,transparent);}',
    '#R .pp-power-btn[aria-checked="true"]:hover{background:color-mix(in srgb,var(--pp-ok) 24%,transparent);border-color:var(--pp-ok);}',
    '#R .pp-power-btn[aria-checked="true"] i{background:var(--pp-ok);border-color:var(--pp-ok);box-shadow:0 0 6px var(--pp-ok);}',
    '#R .pp-grow{flex:1;min-width:2px;}',
    '#R .pp-ibtn{position:relative;width:23px;height:23px;padding:0;border:none;border-radius:6px;background:transparent;color:var(--pp-fg2);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:background .12s,color .12s;}',
    '#R .pp-ibtn:hover{background:var(--pp-hover);color:var(--pp-fg);}',
    '#R .pp-upd-dot{position:absolute;right:2px;top:2px;width:6px;height:6px;border-radius:50%;background:var(--pp-warn);box-shadow:0 0 0 1.5px var(--pp-bg-solid),0 0 8px var(--pp-warn);pointer-events:none;}',
    '#R .pp-ver-link{color:var(--pp-accent);text-decoration:none;font-weight:600;}',
    '#R .pp-ver-link:hover{text-decoration:underline;}',
    '#R .pp-lang{height:21px;padding:0 6px;border-radius:5px;border:1px solid var(--pp-border);background:var(--pp-fill);color:var(--pp-fg2);font-family:var(--pp-mono);font-size:10px;font-weight:600;cursor:pointer;}',
    '#R .pp-lang:hover{color:var(--pp-fg);border-color:var(--pp-border2);}',
    // Topdeck (Scene Presets + Flush/Islands Toggle)
    '#R .pp-topdeck{display:flex;flex-direction:column;gap:6px;margin:8px 10px 0;padding:8px 9px;border-radius:var(--pp-r-card);border:1px solid var(--pp-border);background:var(--pp-fill);flex-shrink:0;}',
    '#R .pp-deck-row{display:flex;align-items:center;gap:6px;}',
    '#R .pp-micro{font-family:var(--pp-mono);font-size:9.5px;font-weight:600;letter-spacing:.06em;color:var(--pp-muted);width:44px;flex-shrink:0;}',
    '#R .pp-presets{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px;flex:1;}',
    '#R .pp-preset{height:25px;padding:0 3px;border-radius:6px;border:1px solid var(--pp-border);background:transparent;color:var(--pp-fg2);font-size:11px;font-weight:500;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:all .14s ease;}',
    '#R .pp-preset:hover{background:var(--pp-hover);color:var(--pp-fg);}',
    '#R .pp-preset[aria-pressed="true"]{border-color:color-mix(in srgb,var(--pp-accent) 65%,transparent);background:color-mix(in srgb,var(--pp-accent) 15%,transparent);color:var(--pp-accent);font-weight:600;}',
    '#R .pp-seg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:2px;padding:2px;border-radius:8px;border:1px solid var(--pp-border);background:var(--pp-fill);flex:1;}',
    '#R .pp-seg3{grid-template-columns:repeat(3,minmax(0,1fr));}',
    '#R .pp-seg button{height:23px;padding:0 8px;border:none;border-radius:6px;background:transparent;color:var(--pp-fg2);font-size:11.5px;cursor:pointer;white-space:nowrap;transition:background .12s,color .12s;}',
    '#R .pp-seg button[aria-checked="true"]{background:var(--pp-fill2);color:var(--pp-fg);font-weight:600;box-shadow:inset 0 1px 0 var(--pp-spec),0 1px 2px rgba(0,0,0,.14);}',
    // Subtabs
    '#R .pp-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:3px;margin:8px 10px 0;padding:2px;border-radius:9px;border:1px solid var(--pp-border);background:var(--pp-fill);flex-shrink:0;}',
    '#R .pp-tab{height:26px;border:none;border-radius:7px;background:transparent;color:var(--pp-fg2);font-size:12px;cursor:pointer;transition:background .12s,color .12s;}',
    '#R .pp-tab[aria-selected="true"]{background:var(--pp-fill2);color:var(--pp-fg);font-weight:600;box-shadow:inset 0 1px 0 var(--pp-spec);}',
    // Toast banner
    '#R .pp-toast{margin:6px 10px 0;padding:6px 9px;border-radius:7px;font-size:11px;background:color-mix(in srgb,var(--pp-accent) 14%,transparent);border:1px solid color-mix(in srgb,var(--pp-accent) 40%,transparent);color:var(--pp-fg);}',
    // Scrollable Body + Drilldown
    '#R .pp-body{position:relative;flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;padding:8px 10px 10px;scrollbar-width:thin;scrollbar-color:var(--pp-track) transparent;}',
    '#R .pp-drill{padding:9px;margin-bottom:8px;border-radius:var(--pp-r-card);border:1px solid color-mix(in srgb,var(--pp-accent) 45%,transparent);background:var(--pp-bg-solid);display:flex;flex-direction:column;gap:8px;}',
    '#R .pp-drill-head{display:flex;align-items:center;justify-content:space-between;font-size:11.5px;font-weight:600;color:var(--pp-accent);}',
    // Library
    '#R .pp-lib-bar{display:flex;gap:5px;margin-bottom:6px;}',
    '#R .pp-inp{flex:1;min-width:0;height:28px;padding:0 9px;border-radius:var(--pp-r-ctl);border:1px solid var(--pp-border);background:var(--pp-fill);color:var(--pp-fg);font-size:12px;outline:none;}',
    '#R .pp-inp:focus{border-color:var(--pp-accent);background:var(--pp-fill2);}',
    '#R .pp-chips{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:7px;}',
    '#R .pp-chip{height:22px;padding:0 8px;border-radius:999px;border:1px solid var(--pp-border);background:transparent;color:var(--pp-fg2);font-size:11px;cursor:pointer;display:inline-flex;align-items:center;gap:3px;}',
    '#R .pp-chip[aria-pressed="true"]{background:var(--pp-fill2);border-color:var(--pp-border2);color:var(--pp-fg);font-weight:600;}',
    '#R .pp-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;}',
    '#R .pp-card{position:relative;display:flex;flex-direction:column;padding:0;border-radius:8px;border:1px solid var(--pp-border);background:var(--pp-fill);overflow:hidden;cursor:pointer;text-align:left;transition:transform .14s var(--pp-ease),border-color .14s;}',
    '#R .pp-card:hover{transform:translateY(-1px);border-color:var(--pp-border2);}',
    '#R .pp-card[aria-current="true"]{border-color:var(--pp-accent);box-shadow:0 0 0 1px var(--pp-accent);}',
    '#R .pp-thumb{position:relative;width:100%;aspect-ratio:16/10;background:rgba(128,128,140,.12);overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--pp-muted);}',
    '#R .pp-thumb img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}',
    '#R .pp-cur{position:absolute;left:4px;top:4px;width:16px;height:16px;border-radius:50%;background:var(--pp-accent);color:var(--pp-accent-fg);display:flex;align-items:center;justify-content:center;}',
    '#R .pp-fav{position:absolute;right:4px;top:4px;width:18px;height:18px;border-radius:50%;border:none;background:rgba(0,0,0,.48);color:#fff;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;}',
    '#R .pp-fav[data-on="true"]{color:#FBBF24;}',
    '#R .pp-ctitle{padding:4px 6px;font-size:11px;color:var(--pp-fg2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    // Optics Swatches & Sliders
    '#R .pp-sec{padding:7px 9px;margin-bottom:7px;border-radius:var(--pp-r-card);border:1px solid var(--pp-border);background:var(--pp-fill);display:flex;flex-direction:column;gap:6px;}',
    '#R .pp-sec-title{font-size:10.5px;font-weight:600;color:var(--pp-muted);letter-spacing:.03em;}',
    '#R .pp-swatches{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;}',
    '#R .pp-swatch{display:flex;align-items:center;gap:4px;height:25px;padding:0 6px;border-radius:6px;border:1px solid var(--pp-border);background:transparent;color:var(--pp-fg2);font-size:11px;cursor:pointer;overflow:hidden;white-space:nowrap;}',
    '#R .pp-swatch[aria-checked="true"]{border-color:var(--pp-accent);background:color-mix(in srgb,var(--pp-accent) 13%,transparent);color:var(--pp-fg);font-weight:600;}',
    '#R .pp-dots{display:inline-flex;gap:2px;flex-shrink:0;}',
    '#R .pp-dots i{width:6px;height:6px;border-radius:50%;border:1px solid rgba(255,255,255,.22);}',
    '#R .pp-acc-row{display:flex;gap:4px;flex-wrap:wrap;align-items:center;}',
    '#R .pp-color{width:24px;height:22px;padding:0;border:1px solid var(--pp-border2);border-radius:5px;background:transparent;cursor:pointer;}',
    // Slider Row with Tabular Readout + 1-Click Reset (`↺`)
    '#R .pp-srow{display:grid;grid-template-columns:1fr auto auto;grid-template-rows:auto auto;align-items:center;column-gap:6px;row-gap:3px;padding:4px 0;border-top:1px solid var(--pp-border);}',
    '#R .pp-srow.pp-comp-srow{grid-template-columns:minmax(0,1fr) auto auto auto;column-gap:4px;}',
    '#R .pp-slabel{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '#R .pp-srow:first-of-type,#R .pp-comp-cat + .pp-srow{border-top:none;}',
    '#R .pp-sval{font-family:var(--pp-mono);font-size:11px;font-variant-numeric:tabular-nums;color:var(--pp-fg2);}',
    '#R .pp-style-chip{height:18px;padding:0 6px;border-radius:999px;border:1px solid var(--pp-border2);background:var(--pp-fill);color:var(--pp-fg2);font-size:10px;font-weight:500;line-height:1;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:background .12s,border-color .12s,color .12s;}',
    '#R .pp-style-chip:hover{border-color:var(--pp-accent);color:var(--pp-fg);background:var(--pp-hover);}',
    '#R .pp-style-chip[data-custom="true"]{border-color:color-mix(in srgb,var(--pp-accent) 60%,transparent);background:color-mix(in srgb,var(--pp-accent) 14%,transparent);color:var(--pp-accent);font-weight:600;}',
    '#R .pp-comp-cat{font-size:10px;font-weight:600;color:var(--pp-muted);letter-spacing:.03em;padding:6px 0 2px;margin-top:2px;}',
    '#R .pp-comp-cat:first-child{padding-top:4px;margin-top:0;}',
    '#R .pp-rst{width:18px;height:18px;padding:0;border:none;border-radius:4px;background:transparent;color:var(--pp-faint);opacity:.22;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:opacity .12s,color .12s,background .12s;}',
    '#R .pp-srow[data-dirty="true"] .pp-rst{opacity:.9;color:var(--pp-accent);}',
    '#R .pp-srow[data-dirty="true"] .pp-rst:hover{opacity:1;background:color-mix(in srgb,var(--pp-accent) 16%,transparent);}',
    '#R .pp-range{grid-column:1 / -1;-webkit-appearance:none;appearance:none;width:100%;height:15px;background:transparent;cursor:pointer;outline:none;}',
    '#R .pp-range::-webkit-slider-runnable-track{height:4px;border-radius:99px;background:linear-gradient(to right,var(--pp-accent) 0,var(--pp-accent) var(--pct,50%),var(--pp-track) var(--pct,50%),var(--pp-track) 100%);}',
    '#R .pp-range::-webkit-slider-thumb{-webkit-appearance:none;width:13px;height:13px;margin-top:-4.5px;border-radius:50%;background:#fff;border:1px solid rgba(0,0,0,.2);box-shadow:0 1px 3px rgba(0,0,0,.35);}',
    // Component Glass Depth Accordion
    '#R .pp-comp-sec{padding:0;gap:0;overflow:hidden;}',
    '#R .pp-comp-sum{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:7px 9px;cursor:pointer;list-style:none;user-select:none;font-size:11px;font-weight:600;color:var(--pp-fg2);}',
    '#R .pp-comp-sum::-webkit-details-marker{display:none;}',
    '#R .pp-comp-sum::after{content:"";width:6px;height:6px;border-right:1.5px solid var(--pp-muted);border-bottom:1.5px solid var(--pp-muted);transform:rotate(-45deg);transition:transform .15s ease;flex-shrink:0;margin-left:auto;}',
    '#R .pp-comp-sec[open] .pp-comp-sum::after{transform:rotate(45deg);}',
    '#R .pp-comp-sum-left{display:inline-flex;align-items:center;gap:6px;min-width:0;}',
    '#R .pp-comp-badge{display:inline-flex;align-items:center;justify-content:center;min-width:16px;height:16px;padding:0 5px;border-radius:999px;font-family:var(--pp-mono);font-size:9.5px;font-weight:600;background:color-mix(in srgb,var(--pp-accent) 18%,transparent);color:var(--pp-accent);}',
    '#R .pp-comp-body{padding:0 9px 8px;border-top:1px solid var(--pp-border);display:flex;flex-direction:column;gap:2px;}',
    '#R .pp-comp-reset{width:100%;height:24px;margin-top:6px;font-size:11px;}',
    '#R .pp-wco-hint{grid-column:1 / -1;font-size:10.5px;color:var(--pp-warn);line-height:1.35;padding-top:2px;}',
    '#R .pp-srow[data-disabled-hint="true"] .pp-range{opacity:.48;}',
    // Switch Row
    '#R .pp-trow{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 0;border-top:1px solid var(--pp-border);font-size:12px;}',
    '#R .pp-sw{position:relative;width:34px;height:19px;padding:0;border-radius:99px;border:1px solid var(--pp-border2);background:var(--pp-fill2);cursor:pointer;flex-shrink:0;transition:background .15s,border-color .15s;}',
    '#R .pp-sw::after{content:"";position:absolute;top:1.5px;left:1.5px;width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.35);transition:transform .16s var(--pp-ease);}',
    '#R .pp-sw[aria-checked="true"]{background:var(--pp-accent);border-color:var(--pp-accent);}',
    '#R .pp-sw[aria-checked="true"]::after{transform:translateX(15px);}',
    // Status KV & Buttons
    '#R .pp-kv{display:grid;grid-template-columns:auto 1fr;border-radius:var(--pp-r-card);border:1px solid var(--pp-border);background:var(--pp-fill);overflow:hidden;margin-bottom:8px;}',
    '#R .pp-kv dt,#R .pp-kv dd{margin:0;padding:6px 9px;font-size:11.5px;border-top:1px solid var(--pp-border);}',
    '#R .pp-kv dt:first-of-type,#R .pp-kv dt:first-of-type + dd{border-top:none;}',
    '#R .pp-kv dt{color:var(--pp-muted);}',
    '#R .pp-kv dd{text-align:right;color:var(--pp-fg);font-family:var(--pp-mono);font-size:11px;word-break:break-all;}',
    '#R .pp-btn{height:28px;padding:0 10px;border-radius:var(--pp-r-ctl);border:1px solid var(--pp-border2);background:var(--pp-fill);color:var(--pp-fg);font-size:11.5px;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:5px;transition:background .12s,border-color .12s;}',
    '#R .pp-btn:hover{background:var(--pp-hover);}',
    '#R .pp-btn-danger{width:100%;color:var(--pp-danger);border-color:color-mix(in srgb,var(--pp-danger) 42%,transparent);background:color-mix(in srgb,var(--pp-danger) 9%,transparent);}',
    '#R .pp-btn-danger[data-armed="true"]{color:#fff;background:var(--pp-danger);border-color:var(--pp-danger);font-weight:600;}',
    '#R .pp-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 10px;border-top:1px solid var(--pp-border);background:var(--pp-fill);flex-shrink:0;font-size:11px;color:var(--pp-muted);}',
    '#R .pp-foot-title{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--pp-fg2);}',
  ]
    .join('\n')
    .replace(/#R/g, '#' + ROOT_ID);

  var PILL_CSS =
    '#' + PILL_ID + '{display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 8px;margin-left:6px;border-radius:999px;' +
    'border:1px solid var(--prism-border-popover, rgba(148,163,184,.24));background:rgba(128,138,158,.10);color:var(--foreground,inherit);' +
    'font-family:inherit;font-size:11px;font-weight:500;line-height:1;cursor:pointer;user-select:none;white-space:nowrap;' +
    'transition:background .14s ease,border-color .14s ease,opacity .14s ease;-webkit-app-region:no-drag;}\n' +
    '#' + PILL_ID + ':hover{background:rgba(102,157,246,.16);border-color:rgba(102,157,246,.48);}\n' +
    '#' + PILL_ID + ' i{width:6px;height:6px;border-radius:50%;background:var(--prism-accent,#669DF6);flex-shrink:0;box-sizing:border-box;transition:background .14s ease,border-color .14s ease;}\n' +
    '#' + PILL_ID + '[data-skin-enabled="false"]{border-color:rgba(148,163,184,.15);background:rgba(128,138,158,.06);opacity:.78;}\n' +
    '#' + PILL_ID + '[data-skin-enabled="false"] i{background:transparent;border:1.5px solid rgba(148,163,184,.65);}';

  // ---------------------------------------------------------------------------
  // Safe Cross-Scheme Loopback Thumbnail Cache + IntersectionObserver Lazy Load
  // ---------------------------------------------------------------------------
  var THUMB_BLOB_CACHE_MAX = 48;
  var thumbBlobCache = {};
  var thumbBlobOrder = [];
  var thumbBlobInflight = {};
  var thumbAbortControllers = [];
  var thumbIo = null;
  var thumbHoverTimers = [];

  function toStaticThumbUrl(rawUrl) {
    var url = String(rawUrl || '').trim();
    if (!url) return '';
    var hashIdx = url.indexOf('#');
    var base = hashIdx >= 0 ? url.slice(0, hashIdx) : url;
    var hash = hashIdx >= 0 ? url.slice(hashIdx) : '';
    if (!/\/preview\//i.test(base)) return url;
    var qIdx = base.indexOf('?');
    if (qIdx >= 0 && /(?:^|&)static=/i.test(base.slice(qIdx + 1))) return url;
    if (/\.(?:png|jpe?g|svg|bmp|avif)(?:\?|$)/i.test(base)) return url;
    var sep = qIdx >= 0 ? '&' : '?';
    return base + sep + 'static=1' + hash;
  }

  function isCrossSchemeLoopbackThumb(url) {
    return Boolean(
      W.location &&
      W.location.protocol === 'https:' &&
      /^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?\//i.test(String(url || '').trim()) &&
      typeof W.fetch === 'function' &&
      typeof W.URL !== 'undefined' &&
      typeof W.URL.createObjectURL === 'function'
    );
  }

  function putThumbBlobCache(url, blobUrl) {
    if (Object.prototype.hasOwnProperty.call(thumbBlobCache, url)) {
      var prevUrl = thumbBlobCache[url];
      if (prevUrl && prevUrl !== blobUrl) {
        try {
          W.URL.revokeObjectURL(prevUrl);
        } catch (_) {}
      }
      var existingIdx = thumbBlobOrder.indexOf(url);
      if (existingIdx >= 0) thumbBlobOrder.splice(existingIdx, 1);
    }
    thumbBlobCache[url] = blobUrl;
    thumbBlobOrder.push(url);
    while (thumbBlobOrder.length > THUMB_BLOB_CACHE_MAX) {
      var evictKey = thumbBlobOrder.shift();
      var evictBlob = thumbBlobCache[evictKey];
      delete thumbBlobCache[evictKey];
      if (evictBlob) {
        try {
          if (typeof W.URL !== 'undefined' && typeof W.URL.revokeObjectURL === 'function') {
            W.URL.revokeObjectURL(evictBlob);
          }
        } catch (_) {}
      }
    }
  }

  function clearThumbObserverTargets() {
    if (thumbIo && typeof thumbIo.disconnect === 'function') {
      try {
        thumbIo.disconnect();
      } catch (_) {}
    }
    for (var i = 0; i < thumbHoverTimers.length; i += 1) {
      clearTimeout(thumbHoverTimers[i]);
    }
    thumbHoverTimers = [];
  }

  function clearThumbBlobCache() {
    clearThumbObserverTargets();
    for (var i = 0; i < thumbAbortControllers.length; i += 1) {
      try {
        thumbAbortControllers[i].abort();
      } catch (_) {}
    }
    thumbAbortControllers = [];
    thumbBlobInflight = {};
    for (var j = 0; j < thumbBlobOrder.length; j += 1) {
      var k = thumbBlobOrder[j];
      var bu = thumbBlobCache[k];
      if (bu) {
        try {
          if (typeof W.URL !== 'undefined' && typeof W.URL.revokeObjectURL === 'function') {
            W.URL.revokeObjectURL(bu);
          }
        } catch (_) {}
      }
    }
    thumbBlobCache = {};
    thumbBlobOrder = [];
  }

  function loadSafeThumbNow(thumbImg, rawUrl) {
    if (!thumbImg || !rawUrl) return;
    var url = String(rawUrl).trim();
    if (!url) return;
    thumbImg.__prismWantUrl = url;
    if (!isCrossSchemeLoopbackThumb(url)) {
      thumbImg.src = url;
      return;
    }
    if (Object.prototype.hasOwnProperty.call(thumbBlobCache, url)) {
      thumbImg.src = thumbBlobCache[url];
      return;
    }
    if (!thumbBlobInflight[url]) {
      var ac = typeof W.AbortController === 'function' ? new W.AbortController() : null;
      if (ac) thumbAbortControllers.push(ac);
      thumbBlobInflight[url] = W.fetch(url, ac ? { signal: ac.signal } : undefined)
        .then(function (res) {
          if (!res || !res.ok) throw new Error('HTTP ' + (res ? res.status : 0));
          return res.blob();
        })
        .then(function (blob) {
          delete thumbBlobInflight[url];
          if (ac) {
            var ai = thumbAbortControllers.indexOf(ac);
            if (ai >= 0) thumbAbortControllers.splice(ai, 1);
          }
          if (destroyed || !blob || blob.size <= 0) return '';
          var blobUrl = W.URL.createObjectURL(blob);
          if (destroyed) {
            try {
              W.URL.revokeObjectURL(blobUrl);
            } catch (_) {}
            return '';
          }
          putThumbBlobCache(url, blobUrl);
          return blobUrl;
        })
        .catch(function () {
          delete thumbBlobInflight[url];
          if (ac) {
            var ai = thumbAbortControllers.indexOf(ac);
            if (ai >= 0) thumbAbortControllers.splice(ai, 1);
          }
          return '';
        });
    }
    thumbBlobInflight[url].then(function (blobUrl) {
      if (destroyed || !thumbImg.parentNode || thumbImg.__prismWantUrl !== url) return;
      if (blobUrl) {
        thumbImg.src = blobUrl;
      } else if (thumbImg.parentNode) {
        thumbImg.parentNode.removeChild(thumbImg);
      }
    });
  }

  function onThumbIntersect(entries) {
    if (destroyed || !entries) return;
    for (var i = 0; i < entries.length; i += 1) {
      var ent = entries[i];
      if (!ent || !ent.isIntersecting) continue;
      var img = ent.target;
      if (!img) continue;
      try {
        if (thumbIo && typeof thumbIo.unobserve === 'function') thumbIo.unobserve(img);
      } catch (_) {}
      var targetUrl = (img.dataset && img.dataset.prismThumbUrl) || (img.getAttribute && img.getAttribute('data-prism-thumb-url')) || '';
      if (targetUrl && img.parentNode) {
        loadSafeThumbNow(img, targetUrl);
      }
    }
  }

  function ensureThumbObserver() {
    if (thumbIo) return thumbIo;
    if (typeof W.IntersectionObserver !== 'function') return null;
    try {
      thumbIo = new W.IntersectionObserver(onThumbIntersect, {
        root: els.body || null,
        rootMargin: '120px 0px',
        threshold: 0.01,
      });
    } catch (_) {
      thumbIo = null;
    }
    return thumbIo;
  }

  function bindSafeThumb(thumbImg, rawUrl) {
    if (!thumbImg || !rawUrl) return;
    var origUrl = String(rawUrl).trim();
    if (!origUrl) return;
    var animMode = String(cfgVal('libraryAnimatedThumbs') || 'hover');
    var initialUrl = animMode === 'always' ? origUrl : toStaticThumbUrl(origUrl);
    if (thumbImg.dataset) {
      thumbImg.dataset.prismThumbUrl = initialUrl;
      thumbImg.dataset.prismOrigUrl = origUrl;
    } else if (thumbImg.setAttribute) {
      thumbImg.setAttribute('data-prism-thumb-url', initialUrl);
      thumbImg.setAttribute('data-prism-orig-url', origUrl);
    }
    var io = ensureThumbObserver();
    if (io && typeof io.observe === 'function') {
      io.observe(thumbImg);
    } else {
      loadSafeThumbNow(thumbImg, initialUrl);
    }
  }

  // ---------------------------------------------------------------------------
  // RPC & Optimistic Sync
  // ---------------------------------------------------------------------------
  function callRpc(method, params) {
    var fn = W[BINDING_KEY];
    if (typeof fn !== 'function') {
      store.connected = false;
      renderConnectionState();
      return Promise.resolve(null);
    }
    store.connected = true;
    rpcSeq += 1;
    var id = 'pp-' + rpcSeq + '-' + Date.now().toString(36);
    var payload = JSON.stringify({ id: id, method: method, params: params || {} });
    return new Promise(function (resolve) {
      var done = false;
      var timer = setTimeout(function () {
        if (done) return;
        done = true;
        delete rpcPending[id];
        resolve(null);
      }, 6000);
      rpcPending[id] = function (val) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        delete rpcPending[id];
        resolve(val);
      };
      try {
        var ret = fn(payload);
        if (ret && typeof ret.then === 'function') {
          ret.then(
            function (v) {
              if (rpcPending[id]) rpcPending[id](v);
            },
            function () {
              if (rpcPending[id]) rpcPending[id](null);
            }
          );
        } else if (ret !== undefined) {
          if (rpcPending[id]) rpcPending[id](ret);
        }
      } catch (_) {
        if (rpcPending[id]) rpcPending[id](null);
      }
    });
  }

  function pushConfigPatch(patch, immediate) {
    if (!patch || typeof patch !== 'object') return;
    if (!store.config || typeof store.config !== 'object') store.config = {};
    var activeOv = getActiveOverride();
    var hasReg = Object.prototype.hasOwnProperty.call(patch, 'regions');
    var hasSt = Object.prototype.hasOwnProperty.call(patch, 'surfaceTints');
    var hasSbOp = Object.prototype.hasOwnProperty.call(patch, 'sidebarOpacity');
    var hasSbBlur = Object.prototype.hasOwnProperty.call(patch, 'sidebarBlur');

    // 1. Apply scalar/non-region keys first
    for (var k in patch) {
      if (!Object.prototype.hasOwnProperty.call(patch, k)) continue;
      if (k === 'surfaceTints' || k === 'regions' || k === 'sidebarOpacity' || k === 'sidebarBlur') continue;
      var target = activeOv && PER_WALLPAPER_OVERRIDE_KEY_MAP[k] ? activeOv : store.config;
      patchQueue[k] = patch[k];
      target[k] = patch[k];
    }

    // 2. Apply surfaceTints (and sync optical keys into regions so regions never shadows surfaceTints)
    if (hasSt) {
      var stTarget = activeOv && PER_WALLPAPER_OVERRIDE_KEY_MAP.surfaceTints ? activeOv : store.config;
      if (patch.surfaceTints === null) {
        patchQueue.surfaceTints = null;
        stTarget.surfaceTints = null;
        if (stTarget.regions && typeof stTarget.regions === 'object') {
          stTarget.regions = stripOpticalFromRegionsObj(stTarget.regions);
        }
        if (patchQueue.regions && typeof patchQueue.regions === 'object') {
          patchQueue.regions = stripOpticalFromRegionsObj(patchQueue.regions);
        }
        if (!hasSbOp) {
          if (stTarget === store.config || Object.prototype.hasOwnProperty.call(stTarget, 'sidebarOpacity')) {
            stTarget.sidebarOpacity = null;
          }
          if (Object.prototype.hasOwnProperty.call(patchQueue, 'sidebarOpacity')) {
            patchQueue.sidebarOpacity = null;
          }
        }
        if (!hasSbBlur) {
          if (stTarget === store.config || Object.prototype.hasOwnProperty.call(stTarget, 'sidebarBlur')) {
            stTarget.sidebarBlur = null;
          }
          if (Object.prototype.hasOwnProperty.call(patchQueue, 'sidebarBlur')) {
            patchQueue.sidebarBlur = null;
          }
        }
      } else if (patch.surfaceTints && typeof patch.surfaceTints === 'object') {
        patchQueue.surfaceTints = mergeSurfaceTintsObj(
          patchQueue.surfaceTints === null ? null : patchQueue.surfaceTints,
          patch.surfaceTints
        );
        stTarget.surfaceTints = mergeSurfaceTintsObj(
          stTarget.surfaceTints === null ? null : stTarget.surfaceTints,
          patch.surfaceTints
        );
        for (var sk in patch.surfaceTints) {
          if (!Object.prototype.hasOwnProperty.call(patch.surfaceTints, sk)) continue;
          var sv = patch.surfaceTints[sk];
          if (sv === null) {
            if (stTarget.regions && stTarget.regions[sk] && typeof stTarget.regions[sk] === 'object') {
              stTarget.regions[sk] = stripOpticalFromRegionEntry(stTarget.regions[sk]);
            }
            if (patchQueue.regions && patchQueue.regions[sk] && typeof patchQueue.regions[sk] === 'object') {
              patchQueue.regions[sk] = stripOpticalFromRegionEntry(patchQueue.regions[sk]);
            }
            if (sk === 'sidebar') {
              if (!hasSbOp) {
                if (stTarget === store.config || Object.prototype.hasOwnProperty.call(stTarget, 'sidebarOpacity')) stTarget.sidebarOpacity = null;
                if (Object.prototype.hasOwnProperty.call(patchQueue, 'sidebarOpacity')) patchQueue.sidebarOpacity = null;
              }
              if (!hasSbBlur) {
                if (stTarget === store.config || Object.prototype.hasOwnProperty.call(stTarget, 'sidebarBlur')) stTarget.sidebarBlur = null;
                if (Object.prototype.hasOwnProperty.call(patchQueue, 'sidebarBlur')) patchQueue.sidebarBlur = null;
              }
            }
          } else if (sv && typeof sv === 'object') {
            var optPart = pickOpticalKeys(sv);
            if (optPart) {
              var regDelta = {};
              regDelta[sk] = optPart;
              stTarget.regions = mergeRegionsObj(stTarget.regions === null ? null : stTarget.regions, regDelta);
              if (patchQueue.regions && typeof patchQueue.regions === 'object') {
                patchQueue.regions = mergeRegionsObj(patchQueue.regions, regDelta);
              }
            }
            if (sk === 'sidebar') {
              if (!hasSbOp && Object.prototype.hasOwnProperty.call(sv, 'opacity')) {
                if (stTarget === store.config || Object.prototype.hasOwnProperty.call(stTarget, 'sidebarOpacity')) stTarget.sidebarOpacity = sv.opacity;
                if (Object.prototype.hasOwnProperty.call(patchQueue, 'sidebarOpacity')) patchQueue.sidebarOpacity = sv.opacity;
              }
              if (!hasSbBlur && Object.prototype.hasOwnProperty.call(sv, 'blur')) {
                if (stTarget === store.config || Object.prototype.hasOwnProperty.call(stTarget, 'sidebarBlur')) stTarget.sidebarBlur = sv.blur;
                if (Object.prototype.hasOwnProperty.call(patchQueue, 'sidebarBlur')) patchQueue.sidebarBlur = sv.blur;
              }
            }
          }
        }
      }
    }

    // 3. Apply canonical regions deep merge & project optical keys into surfaceTints
    if (hasReg) {
      var regTarget = activeOv && PER_WALLPAPER_OVERRIDE_KEY_MAP.regions ? activeOv : store.config;
      if (patch.regions === null) {
        patchQueue.regions = null;
        regTarget.regions = null;
        if (!hasSt) {
          patchQueue.surfaceTints = null;
          regTarget.surfaceTints = null;
        }
        if (!hasSbOp) {
          if (regTarget === store.config || Object.prototype.hasOwnProperty.call(regTarget, 'sidebarOpacity')) regTarget.sidebarOpacity = null;
          if (Object.prototype.hasOwnProperty.call(patchQueue, 'sidebarOpacity')) patchQueue.sidebarOpacity = null;
        }
        if (!hasSbBlur) {
          if (regTarget === store.config || Object.prototype.hasOwnProperty.call(regTarget, 'sidebarBlur')) regTarget.sidebarBlur = null;
          if (Object.prototype.hasOwnProperty.call(patchQueue, 'sidebarBlur')) patchQueue.sidebarBlur = null;
        }
      } else if (patch.regions && typeof patch.regions === 'object') {
        patchQueue.regions = mergeRegionsObj(
          patchQueue.regions === null ? null : patchQueue.regions,
          patch.regions
        );
        regTarget.regions = mergeRegionsObj(
          regTarget.regions === null ? null : regTarget.regions,
          patch.regions
        );
        var projectedSt = null;
        for (var rk in patch.regions) {
          if (!Object.prototype.hasOwnProperty.call(patch.regions, rk)) continue;
          var rv = patch.regions[rk];
          if (rv === null) {
            if (!projectedSt) projectedSt = {};
            projectedSt[rk] = null;
            if (rk === 'sidebar') {
              if (!hasSbOp) {
                if (regTarget === store.config || Object.prototype.hasOwnProperty.call(regTarget, 'sidebarOpacity')) regTarget.sidebarOpacity = null;
                if (Object.prototype.hasOwnProperty.call(patchQueue, 'sidebarOpacity')) patchQueue.sidebarOpacity = null;
              }
              if (!hasSbBlur) {
                if (regTarget === store.config || Object.prototype.hasOwnProperty.call(regTarget, 'sidebarBlur')) regTarget.sidebarBlur = null;
                if (Object.prototype.hasOwnProperty.call(patchQueue, 'sidebarBlur')) patchQueue.sidebarBlur = null;
              }
            }
          } else if (rv && typeof rv === 'object') {
            var optKeys = pickOpticalKeys(rv);
            if (optKeys) {
              if (!projectedSt) projectedSt = {};
              projectedSt[rk] = optKeys;
            }
            if (rk === 'sidebar') {
              if (!hasSbOp && Object.prototype.hasOwnProperty.call(rv, 'opacity')) {
                if (regTarget === store.config || Object.prototype.hasOwnProperty.call(regTarget, 'sidebarOpacity')) regTarget.sidebarOpacity = rv.opacity;
                if (Object.prototype.hasOwnProperty.call(patchQueue, 'sidebarOpacity')) patchQueue.sidebarOpacity = rv.opacity;
              }
              if (!hasSbBlur && Object.prototype.hasOwnProperty.call(rv, 'blur')) {
                if (regTarget === store.config || Object.prototype.hasOwnProperty.call(regTarget, 'sidebarBlur')) regTarget.sidebarBlur = rv.blur;
                if (Object.prototype.hasOwnProperty.call(patchQueue, 'sidebarBlur')) patchQueue.sidebarBlur = rv.blur;
              }
            }
          }
        }
        if (projectedSt) {
          regTarget.surfaceTints = mergeSurfaceTintsObj(
            regTarget.surfaceTints === null ? null : regTarget.surfaceTints,
            projectedSt
          );
          if (patchQueue.surfaceTints && typeof patchQueue.surfaceTints === 'object') {
            patchQueue.surfaceTints = mergeSurfaceTintsObj(patchQueue.surfaceTints, projectedSt);
          }
        }
      }
    }

    // 4. Dual-write sidebarOpacity into regions.sidebar & surfaceTints.sidebar
    if (hasSbOp) {
      var sbOpTarget = activeOv && PER_WALLPAPER_OVERRIDE_KEY_MAP.sidebarOpacity ? activeOv : store.config;
      patchQueue.sidebarOpacity = patch.sidebarOpacity;
      sbOpTarget.sidebarOpacity = patch.sidebarOpacity;
      var bulkOptResetNullOp = hasSt && patch.surfaceTints === null && patch.sidebarOpacity === null;
      var regExplicitSbOp =
        hasReg &&
        (patch.regions === null ||
          (patch.regions &&
            typeof patch.regions === 'object' &&
            (patch.regions.sidebar === null ||
              (patch.regions.sidebar &&
                typeof patch.regions.sidebar === 'object' &&
                Object.prototype.hasOwnProperty.call(patch.regions.sidebar, 'opacity')))));
      var stExplicitSbOp =
        hasSt &&
        patch.surfaceTints &&
        typeof patch.surfaceTints === 'object' &&
        (patch.surfaceTints.sidebar === null ||
          (patch.surfaceTints.sidebar &&
            typeof patch.surfaceTints.sidebar === 'object' &&
            Object.prototype.hasOwnProperty.call(patch.surfaceTints.sidebar, 'opacity')));
      if (!bulkOptResetNullOp) {
        if (!regExplicitSbOp) {
          sbOpTarget.regions = mergeRegionsObj(sbOpTarget.regions === null ? null : sbOpTarget.regions, {
            sidebar: { opacity: patch.sidebarOpacity },
          });
          if (!(hasSt && patch.surfaceTints === null)) {
            patchQueue.regions = mergeRegionsObj(patchQueue.regions === null ? null : patchQueue.regions, {
              sidebar: { opacity: patch.sidebarOpacity },
            });
          }
        }
        if (!stExplicitSbOp && !(hasSt && patch.surfaceTints === null)) {
          sbOpTarget.surfaceTints = mergeSurfaceTintsObj(sbOpTarget.surfaceTints === null ? null : sbOpTarget.surfaceTints, {
            sidebar: { opacity: patch.sidebarOpacity },
          });
          patchQueue.surfaceTints = mergeSurfaceTintsObj(patchQueue.surfaceTints === null ? null : patchQueue.surfaceTints, {
            sidebar: { opacity: patch.sidebarOpacity },
          });
        }
      }
    }

    // 5. Dual-write sidebarBlur into regions.sidebar & surfaceTints.sidebar
    if (hasSbBlur) {
      var sbBlurTarget = activeOv && PER_WALLPAPER_OVERRIDE_KEY_MAP.sidebarBlur ? activeOv : store.config;
      patchQueue.sidebarBlur = patch.sidebarBlur;
      sbBlurTarget.sidebarBlur = patch.sidebarBlur;
      var bulkOptResetNullBlur = hasSt && patch.surfaceTints === null && patch.sidebarBlur === null;
      var regExplicitSbBlur =
        hasReg &&
        (patch.regions === null ||
          (patch.regions &&
            typeof patch.regions === 'object' &&
            (patch.regions.sidebar === null ||
              (patch.regions.sidebar &&
                typeof patch.regions.sidebar === 'object' &&
                Object.prototype.hasOwnProperty.call(patch.regions.sidebar, 'blur')))));
      var stExplicitSbBlur =
        hasSt &&
        patch.surfaceTints &&
        typeof patch.surfaceTints === 'object' &&
        (patch.surfaceTints.sidebar === null ||
          (patch.surfaceTints.sidebar &&
            typeof patch.surfaceTints.sidebar === 'object' &&
            Object.prototype.hasOwnProperty.call(patch.surfaceTints.sidebar, 'blur')));
      if (!bulkOptResetNullBlur) {
        if (!regExplicitSbBlur) {
          sbBlurTarget.regions = mergeRegionsObj(sbBlurTarget.regions === null ? null : sbBlurTarget.regions, {
            sidebar: { blur: patch.sidebarBlur },
          });
          if (!(hasSt && patch.surfaceTints === null)) {
            patchQueue.regions = mergeRegionsObj(patchQueue.regions === null ? null : patchQueue.regions, {
              sidebar: { blur: patch.sidebarBlur },
            });
          }
        }
        if (!stExplicitSbBlur && !(hasSt && patch.surfaceTints === null)) {
          sbBlurTarget.surfaceTints = mergeSurfaceTintsObj(sbBlurTarget.surfaceTints === null ? null : sbBlurTarget.surfaceTints, {
            sidebar: { blur: patch.sidebarBlur },
          });
          patchQueue.surfaceTints = mergeSurfaceTintsObj(patchQueue.surfaceTints === null ? null : patchQueue.surfaceTints, {
            sidebar: { blur: patch.sidebarBlur },
          });
        }
      }
    }

    // Instant <16ms optimistic skin update on host!
    if (W[SKIN_KEY] && typeof W[SKIN_KEY].updateConfig === 'function') {
      try {
        W[SKIN_KEY].updateConfig(patch);
      } catch (_) {}
    }
    renderAll();

    var flush = function () {
      var send = {};
      var hasKeys = false;
      for (var pk in patchQueue) {
        if (Object.prototype.hasOwnProperty.call(patchQueue, pk)) {
          send[pk] = patchQueue[pk];
          hasKeys = true;
        }
      }
      patchQueue = {};
      if (!hasKeys) return;
      patchFlushSeq += 1;
      var mySeq = patchFlushSeq;
      callRpc('config.set', { patch: send }).then(function (res) {
        if (mySeq !== patchFlushSeq) return;
        if (res && typeof res === 'object') ingestState(extractStatePayload(res));
      });
    };
    if (immediate) {
      clearTimeout(patchTimer);
      patchTimer = 0;
      lastPatchFlushAt = Date.now();
      flush();
    } else {
      var elapsed = Date.now() - lastPatchFlushAt;
      if (elapsed >= 80) {
        clearTimeout(patchTimer);
        patchTimer = 0;
        lastPatchFlushAt = Date.now();
        flush();
      } else if (!patchTimer) {
        patchTimer = setTimeout(function () {
          patchTimer = 0;
          lastPatchFlushAt = Date.now();
          flush();
        }, Math.max(16, 80 - elapsed));
      }
    }
  }

  function withTopLevelRev(dataObj, msg) {
    var base = dataObj && typeof dataObj === 'object' ? dataObj : {};
    if (!msg || typeof msg !== 'object') return base;
    var needRev = msg.stateRev !== undefined && base.stateRev === undefined;
    var needEpoch = msg.stateEpoch !== undefined && base.stateEpoch === undefined;
    if (!needRev && !needEpoch) return base;
    var out = Object.assign({}, base);
    if (needRev) out.stateRev = msg.stateRev;
    if (needEpoch) out.stateEpoch = msg.stateEpoch;
    return out;
  }

  function extractStatePayload(res) {
    if (!res || typeof res !== 'object') return null;
    var inner = res.state && typeof res.state === 'object' ? res.state : res;
    return withTopLevelRev(inner, res);
  }

  function ingestState(data) {
    if (!data || typeof data !== 'object') return;
    var rawRev = data.stateRev;
    var rev = rawRev !== undefined && rawRev !== null && rawRev !== '' ? Number(rawRev) : NaN;
    var hasValidRev = Number.isFinite(rev) && rev > 0;
    var ep = String(data.stateEpoch || data.mediaOrigin || W.__agyPrismCapToken || '');
    if (hasValidRev) {
      if (ep && store.lastRevEpoch && ep !== store.lastRevEpoch) {
        store.lastAppliedRev = 0;
        toggleStartRev = 0;
      }
      if (ep) store.lastRevEpoch = ep;
      if (rev < store.lastAppliedRev) {
        return;
      }
      store.lastAppliedRev = Math.floor(rev);
    }

    var skipSkinEnabledWhileToggling =
      toggleBusy && (!hasValidRev || Math.floor(rev) <= toggleStartRev);
    if (!skipSkinEnabledWhileToggling) {
      if (typeof data.skinEnabled === 'boolean') store.skinEnabled = data.skinEnabled;
      else if (data.config && typeof data.config.skinEnabled === 'boolean') store.skinEnabled = data.config.skinEnabled;
    }

    if (data.config && typeof data.config === 'object') store.config = data.config;
    else if (data.prefs && typeof data.prefs === 'object') store.config = data.prefs;
    if (skipSkinEnabledWhileToggling && store.config && typeof store.config === 'object') {
      store.config = Object.assign({}, store.config, { skinEnabled: store.skinEnabled });
    }

    if (data.activeItem !== undefined) store.activeItem = data.activeItem;
    else if (data.source && typeof data.source === 'object') store.activeItem = data.source;

    if (Array.isArray(data.items)) store.items = data.items;
    if (data.updateStatus && typeof data.updateStatus === 'object') {
      store.updateStatus = normalizeUpdateInfo(data.updateStatus);
    } else if (data.updateSummary && typeof data.updateSummary === 'object') {
      store.updateStatus = normalizeUpdateInfo(data.updateSummary);
    } else if (data.update && typeof data.update === 'object') {
      store.updateStatus = normalizeUpdateInfo(data.update);
    } else if (data.updateStatus === null || data.updateSummary === null) {
      store.updateStatus = null;
    }
    store.connected = hasBinding() || Boolean(data.connected);
    syncHostTheme();
    mountInlinePill();
    renderAll();
  }

  function syncState(data) {
    ingestState(data);
    return status();
  }

  function receive(msg) {
    if (destroyed) return false;
    try {
      if (typeof msg === 'string') msg = JSON.parse(msg);
    } catch (_) {
      return false;
    }
    if (!msg || typeof msg !== 'object') return false;
    if (msg.event === 'state') {
      ingestState(withTopLevelRev(msg.data, msg));
      return true;
    }
    if (msg.event === 'payload' || msg.event === 'skin') {
      var payloadData = withTopLevelRev(msg.data, msg);
      if (W[SKIN_KEY] && typeof W[SKIN_KEY].applyPayload === 'function') {
        W[SKIN_KEY].applyPayload(payloadData);
      }
      ingestState(payloadData);
      return true;
    }
    if (msg.id && rpcPending[msg.id]) {
      var val = msg.ok !== false ? (msg.result !== undefined ? msg.result : msg) : null;
      rpcPending[msg.id](val);
      return true;
    }
    if (msg.config || msg.prefs || msg.items) {
      ingestState(msg);
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Theme Sync & Trigger Positioning (Inline Pill + Auto-Dodging Corner Orb)
  // ---------------------------------------------------------------------------
  function detectTheme() {
    var root = doc.documentElement;
    var body = doc.body;
    var pt = root && root.getAttribute('data-prism-theme');
    if (pt === 'light' || pt === 'dark') return pt;
    if ((body && body.classList && body.classList.contains('light')) || (root && root.classList && root.classList.contains('light'))) {
      return 'light';
    }
    return 'dark';
  }

  function syncHostTheme() {
    store.theme = detectTheme();
    if (!els.root) return;
    els.root.setAttribute('data-theme', store.theme);
    var acc = '';
    try {
      acc = getComputedStyle(doc.documentElement).getPropertyValue('--prism-accent').trim();
      if (!acc && doc.body) acc = getComputedStyle(doc.body).getPropertyValue('--primary').trim();
    } catch (_) {}
    if (acc && /^#|rgb/i.test(acc)) els.root.style.setProperty('--pp-accent', acc);
  }

  function applyOptimisticSkinEnabled(enabled) {
    if (!W[SKIN_KEY]) return;
    try {
      if (!enabled && typeof W[SKIN_KEY].applyPayload === 'function') {
        W[SKIN_KEY].applyPayload({ skinEnabled: false });
      } else if (enabled && typeof W[SKIN_KEY].updateConfig === 'function') {
        W[SKIN_KEY].updateConfig({ skinEnabled: true });
      } else if (enabled && typeof W[SKIN_KEY].applyPayload === 'function') {
        W[SKIN_KEY].applyPayload({ skinEnabled: true, config: store.config, activeItem: store.activeItem });
      }
    } catch (_) {}
  }

  function runMasterSkinRpc(next, rpcMethod, rpcParams) {
    if (toggleBusy) {
      pendingToggleTarget = next;
      store.skinEnabled = next;
      if (!store.config || typeof store.config !== 'object') store.config = {};
      store.config.skinEnabled = next;
      renderAll();
      return Promise.resolve(null);
    }

    var prevEnabled = Boolean(store.skinEnabled);
    toggleSeq += 1;
    var mySeq = toggleSeq;
    toggleBusy = true;
    toggleStartRev = store.lastAppliedRev;
    pendingToggleTarget = null;

    store.skinEnabled = next;
    if (!store.config || typeof store.config !== 'object') store.config = {};
    store.config.skinEnabled = next;
    if (els.powerBtn) els.powerBtn.setAttribute('data-busy', 'true');
    if (els.restoreBtn) els.restoreBtn.setAttribute('data-busy', 'true');
    applyOptimisticSkinEnabled(next);
    renderAll();

    return callRpc(rpcMethod, rpcParams).then(function (r) {
      if (destroyed || mySeq !== toggleSeq) return r;
      toggleBusy = false;
      if (els.powerBtn) els.powerBtn.setAttribute('data-busy', 'false');
      if (els.restoreBtn) els.restoreBtn.setAttribute('data-busy', 'false');
      if (!r || r.ok === false) {
        pendingToggleTarget = null;
        store.skinEnabled = prevEnabled;
        if (!store.config || typeof store.config !== 'object') store.config = {};
        store.config.skinEnabled = prevEnabled;
        applyOptimisticSkinEnabled(prevEnabled);
        renderAll();
        showToast(tr('toggleFailToast'));
        return null;
      }
      ingestState(extractStatePayload(r));
      var queued = pendingToggleTarget;
      pendingToggleTarget = null;
      if (queued !== null && queued !== Boolean(store.skinEnabled)) {
        return toggleSkinMaster(queued);
      }
      return r;
    });
  }

  function toggleSkinMaster(explicitEnabled) {
    disarmRestore();
    var next = typeof explicitEnabled === 'boolean' ? explicitEnabled : !store.skinEnabled;
    return runMasterSkinRpc(next, 'skin.toggle', { enabled: next });
  }

  function syncInlinePillState(pillEl) {
    var pill = pillEl || doc.getElementById(PILL_ID);
    if (!pill) return;
    var on = Boolean(store.skinEnabled);
    var nextOn = on ? 'true' : 'false';
    if (pill.getAttribute('data-skin-enabled') !== nextOn) pill.setAttribute('data-skin-enabled', nextOn);
    if (pill.className !== undefined && String(pill.className).indexOf('agy-prism-pill') < 0) {
      pill.className = pill.className ? pill.className + ' agy-prism-pill' : 'agy-prism-pill';
    }
    var nextTip = tr('pillTip');
    if (pill.title !== nextTip) pill.title = nextTip;
    var labelSpan = pill.querySelector ? pill.querySelector('span') : null;
    var nextLabel = on ? 'Prism' : tr('pillOff');
    if (labelSpan && labelSpan.textContent !== nextLabel) {
      labelSpan.textContent = nextLabel;
    }
  }

  function mountInlinePill() {
    var mode = String(cfgVal('triggerMode') || 'both');
    var wantPill = mode === 'pill' || mode === 'both';
    var existing = doc.getElementById(PILL_ID);

    if (!wantPill || destroyed) {
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
      return false;
    }

    var pStyle = doc.getElementById(PILL_STYLE_ID);
    if (!pStyle) {
      pStyle = doc.createElement('style');
      pStyle.id = PILL_STYLE_ID;
      pStyle.textContent = PILL_CSS;
      (doc.head || doc.documentElement).appendChild(pStyle);
    } else if (pStyle.textContent !== PILL_CSS) {
      pStyle.textContent = PILL_CSS;
    }

    var hostSlot =
      doc.querySelector('.agy-composer-footer') ||
      doc.querySelector('[data-testid="agent-input-box"] footer') ||
      doc.querySelector('.composer-bar') ||
      doc.querySelector('.monaco-workbench .part.statusbar .right-items') ||
      doc.querySelector('.monaco-workbench .part.statusbar');

    if (!hostSlot) {
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
      return false;
    }

    if (existing && existing.dataset && existing.dataset.prismLazyStub === '1') {
      if (existing.parentNode) existing.parentNode.removeChild(existing);
      existing = null;
    }

    if (!existing) {
      existing = h(
        'button',
        {
          id: PILL_ID,
          class: 'agy-prism-pill',
          type: 'button',
          title: tr('pillTip'),
          translate: 'no',
          'data-no-translate': 'true',
          'data-ag-no-i18n': '1',
          'data-skin-enabled': store.skinEnabled ? 'true' : 'false',
          onclick: function (e) {
            e.stopPropagation();
            if (e && e.shiftKey) {
              e.preventDefault();
              toggleSkinMaster();
              return;
            }
            toggle();
          },
          onauxclick: function (e) {
            if (e && e.button === 1) {
              e.preventDefault();
              e.stopPropagation();
              toggleSkinMaster();
            }
          },
        },
        [h('i'), h('span', { text: store.skinEnabled ? 'Prism' : tr('pillOff') })]
      );
    }
    syncInlinePillState(existing);
    if (existing.parentNode !== hostSlot) {
      hostSlot.appendChild(existing);
    }
    return true;
  }

  function positionTriggersAndSheet() {
    if (!els.orb || !els.sheet) return;
    var pillMounted = mountInlinePill();
    var mode = String(cfgVal('triggerMode') || 'both');
    var showOrb = mode === 'corner' || mode === 'both' || (mode === 'pill' && !pillMounted);
    els.orb.hidden = !showOrb;

    var vw = Math.max(320, W.innerWidth || 1280);
    var vh = Math.max(280, W.innerHeight || 800);
    var left = 12;
    var bottom = 12;

    try {
      var sbs = doc.querySelectorAll('[data-testid="sidebar-split"] > div:first-child, .agy-sidebar, .monaco-workbench .part.sidebar');
      for (var i = 0; i < sbs.length; i += 1) {
        var r = sbs[i].getBoundingClientRect();
        if (r.left <= 16 && r.width >= 40 && r.width < vw * 0.55 && r.height > vh * 0.5) {
          left = Math.max(left, Math.round(r.right + 10));
        }
      }
      var comps = doc.querySelectorAll('[data-testid="agent-input-box"], .surface-composer-card, .agy-composer');
      for (var j = 0; j < comps.length; j += 1) {
        var c = comps[j].getBoundingClientRect();
        if (c.width > 10 && left + 28 > c.left - 6 && left < c.right + 6 && vh - bottom < c.bottom + 6 && vh - bottom - 28 > c.top - 6) {
          bottom = Math.round(vh - c.top + 8);
        }
      }
    } catch (_) {}

    left = clamp(left, 8, vw - 36);
    bottom = clamp(bottom, 8, vh - 36);
    els.orb.style.left = left + 'px';
    els.orb.style.bottom = bottom + 'px';

    var sheetW = Math.min(384, vw - 16);
    if (ui.pos) {
      var sx = clamp(ui.pos.x, 8, Math.max(8, vw - sheetW - 8));
      var sy = clamp(ui.pos.y, 8, Math.max(8, vh - 140));
      els.sheet.style.left = sx + 'px';
      els.sheet.style.top = sy + 'px';
      els.sheet.style.bottom = 'auto';
      els.sheet.style.maxHeight = Math.max(240, Math.min(560, vh - sy - 8)) + 'px';
    } else {
      var sLeft = clamp(left, 8, Math.max(8, vw - sheetW - 8));
      var sBot = showOrb ? bottom + 36 : 48;
      if (vh - sBot < 280) sBot = 12;
      els.sheet.style.left = sLeft + 'px';
      els.sheet.style.top = 'auto';
      els.sheet.style.bottom = sBot + 'px';
      els.sheet.style.maxHeight = Math.max(240, Math.min(560, vh - sBot - 10)) + 'px';
    }
  }

  // ---------------------------------------------------------------------------
  // DOM Construction & Rendering
  // ---------------------------------------------------------------------------
  function showToast(text) {
    if (!els.toast) return;
    els.toast.textContent = text;
    els.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      if (els.toast) els.toast.hidden = true;
    }, 3600);
  }

  function disarmRestore() {
    restoreArmed = false;
    clearTimeout(restoreTimer);
    if (els.restoreBtn) {
      els.restoreBtn.setAttribute('data-armed', 'false');
      els.restoreBtn.textContent = tr('btnRestore');
    }
  }

  function buildSliderRow(key, min, max, step, fmt, fallbackKey) {
    var valSpan = h('span', { class: 'pp-sval' });
    var labelSpan = h('span', { class: 'pp-slabel' });
    function makeSliderPatch(v) {
      var p = { preset: 'custom' };
      p[key] = v;
      if (key === 'sidebarBlur') {
        p.regions = { sidebar: { blur: v } };
        p.surfaceTints = { sidebar: { blur: v } };
      }
      return p;
    }
    var rstBtn = h('button', {
      type: 'button',
      class: 'pp-rst',
      'data-reset-key': key,
      html: ICONS.reset,
      onclick: function () {
        pushConfigPatch(makeSliderPatch(fallbackKey ? null : DEFAULTS[key]), true);
      },
    });
    var range = h('input', {
      type: 'range',
      class: 'pp-range',
      'data-slider-key': key,
      'data-dirty': 'false',
      min: min,
      max: max,
      step: step,
      oninput: function () {
        pushConfigPatch(makeSliderPatch(Number(range.value)), false);
      },
      onchange: function () {
        pushConfigPatch(makeSliderPatch(Number(range.value)), true);
      },
    });
    var row = h('div', { class: 'pp-srow', 'data-dirty': 'false' }, [labelSpan, valSpan, rstBtn, range]);
    sliderRefs[key] = {
      row: row,
      label: labelSpan,
      val: valSpan,
      rst: rstBtn,
      range: range,
      min: min,
      max: max,
      fmt: fmt,
      fallbackKey: fallbackKey || null,
    };
    return row;
  }

  function buildComponentOpacityRow(compId) {
    var bounds = SURFACE_TINT_BOUNDS[compId] || { min: 0, max: 0.98 };
    var sliderKey = 'surfaceTints.' + compId + '.opacity';
    var valSpan = h('span', { class: 'pp-sval' });
    var labelSpan = h('span', { class: 'pp-slabel' });
    function makeCompPatch(v) {
      var regPatch = {};
      regPatch[compId] = { opacity: v };
      var stPatch = {};
      stPatch[compId] = { opacity: v };
      var p = { preset: 'custom', regions: regPatch, surfaceTints: stPatch };
      if (compId === 'sidebar') p.sidebarOpacity = v;
      return p;
    }
    function makeCompResetPatch() {
      var regPatch = {};
      regPatch[compId] = createOpticalResetObj();
      var stPatch = {};
      stPatch[compId] = null;
      var p = { preset: 'custom', regions: regPatch, surfaceTints: stPatch };
      if (compId === 'sidebar') {
        p.sidebarOpacity = null;
        p.sidebarBlur = null;
      }
      return p;
    }
    var styleBtn = h('button', {
      type: 'button',
      class: 'pp-style-chip',
      'data-comp-style-btn': compId,
      'data-testid': 'prism-pop-style-' + compId,
      'data-style': 'auto',
      'data-eff-style': ZERO_BLUR_BY_DEFAULT_REGIONS[compId] ? 'none' : 'auto',
      'data-custom': 'false',
      onclick: function () {
        var curStyle = readComponentStyle(compId);
        var nextStyle = nextCycleStyle(compId, curStyle, store.config);
        var regEntry = { style: nextStyle };
        var stEntry = { style: nextStyle };
        var curBlur = compId === 'sidebar' ? readSidebarBlur() : readComponentBlur(compId);
        if ((nextStyle === 'frosted' || nextStyle === 'crystal') && curBlur === 0) {
          regEntry.blur = null;
          stEntry.blur = null;
        }
        var regPatch = {};
        regPatch[compId] = regEntry;
        var stPatch = {};
        stPatch[compId] = stEntry;
        var patch = { preset: 'custom', regions: regPatch, surfaceTints: stPatch };
        if (compId === 'sidebar' && Object.prototype.hasOwnProperty.call(regEntry, 'blur')) {
          patch.sidebarBlur = null;
        }
        pushConfigPatch(patch, true);
      },
    });
    var rstBtn = h('button', {
      type: 'button',
      class: 'pp-rst',
      'data-reset-key': sliderKey,
      'data-comp': compId,
      html: ICONS.reset,
      onclick: function () {
        pushConfigPatch(makeCompResetPatch(), true);
      },
    });
    var range = h('input', {
      type: 'range',
      class: 'pp-range',
      'data-slider-key': sliderKey,
      'data-comp': compId,
      'data-dirty': 'false',
      min: bounds.min,
      max: bounds.max,
      step: 0.01,
      oninput: function () {
        pushConfigPatch(makeCompPatch(Number(range.value)), false);
      },
      onchange: function () {
        pushConfigPatch(makeCompPatch(Number(range.value)), true);
      },
    });
    var wcoHint =
      compId === 'wco'
        ? h('div', {
            class: 'pp-wco-hint',
            'data-testid': 'prism-wco-disabled-hint',
            hidden: true,
          })
        : null;
    var rowKids = [labelSpan, styleBtn, valSpan, rstBtn, range];
    if (wcoHint) rowKids.push(wcoHint);
    var row = h('div', { class: 'pp-srow pp-comp-srow', 'data-dirty': 'false', 'data-comp': compId }, rowKids);
    compSliderRefs[compId] = {
      compId: compId,
      row: row,
      label: labelSpan,
      styleBtn: styleBtn,
      val: valSpan,
      rst: rstBtn,
      range: range,
      wcoHint: wcoHint,
      min: bounds.min,
      max: bounds.max,
      fmt: function (v) {
        return Math.round(v * 100) + '%';
      },
    };
    return row;
  }

  function buildDom() {
    els.orb = h(
      'button',
      {
        type: 'button',
        class: 'prism-corner-orb',
        title: 'Wallpaper Prism (Ctrl+Alt+W)',
        'aria-expanded': 'false',
        html: ICONS.prism + '<i></i>',
        onclick: function () {
          toggle();
        },
      },
      []
    );

    els.connDot = h('i');
    els.connText = h('span');
    els.powerDot = h('i');
    els.powerText = h('span');
    els.powerBtn = h(
      'button',
      {
        type: 'button',
        class: 'pp-power-btn',
        'data-testid': 'prism-power-toggle',
        role: 'switch',
        'aria-checked': store.skinEnabled ? 'true' : 'false',
        onclick: function () {
          toggleSkinMaster();
        },
      },
      [els.powerDot, els.powerText]
    );
    els.prevBtn = h('button', {
      type: 'button',
      class: 'pp-ibtn',
      html: ICONS.prev,
      onclick: function () {
        callRpc('playlist.step', { direction: -1, reason: 'manual' }).then(function (r) {
          if (r) ingestState(extractStatePayload(r));
        });
      },
    });
    els.playBtn = h('button', {
      type: 'button',
      class: 'pp-ibtn',
      html: ICONS.pause,
      onclick: function () {
        pushConfigPatch({ paused: !cfgVal('paused') }, true);
      },
    });
    els.nextBtn = h('button', {
      type: 'button',
      class: 'pp-ibtn',
      html: ICONS.next,
      onclick: function () {
        callRpc('playlist.step', { direction: 1, reason: 'manual' }).then(function (r) {
          if (r) ingestState(extractStatePayload(r));
        });
      },
    });
    els.muteBtn = h('button', {
      type: 'button',
      class: 'pp-ibtn',
      html: ICONS.volOff,
      onclick: function () {
        var nextMuted = !cfgVal('muted');
        var patch = { muted: nextMuted, audioEnabled: !nextMuted };
        if (!nextMuted && Number(cfgVal('volume')) <= 0.01) patch.volume = 0.5;
        pushConfigPatch(patch, true);
      },
    });
    els.langBtn = h('button', {
      type: 'button',
      class: 'pp-lang',
      'data-testid': 'prism-lang-toggle',
      onclick: function () {
        var next = getLang() === 'zh' ? 'en' : 'zh';
        pushConfigPatch({ language: next }, true);
      },
    });
    els.updateDot = h('i', { class: 'pp-upd-dot', 'data-testid': 'prism-update-dot', hidden: true });
    els.studioBtn = h(
      'button',
      {
        type: 'button',
        class: 'pp-ibtn',
        'data-testid': 'prism-open-studio',
        'data-has-update': 'false',
        html: ICONS.ext,
        onclick: function () {
          callRpc('studio.open', {}).then(function (res) {
            if (!res || !res.opened) {
              var upd = store.updateStatus;
              if (upd && upd.updateAvailable && upd.latestVersion) {
                showToast(tr('updateToast').replace('{v}', upd.latestVersion));
              } else {
                showToast(tr('studioToast'));
              }
            }
          });
        },
      },
      [els.updateDot]
    );
    els.closeBtn = h('button', {
      type: 'button',
      class: 'pp-ibtn',
      'data-testid': 'prism-close-btn',
      html: ICONS.close,
      onclick: function () {
        close();
      },
    });

    els.head = h('div', { class: 'pp-head' }, [
      h('span', { class: 'pp-logo', html: ICONS.prism + '<span>Prism</span>' }),
      h('span', { class: 'pp-conn' }, [els.connDot, els.connText]),
      els.powerBtn,
      h('span', { class: 'pp-grow' }),
      els.prevBtn,
      els.playBtn,
      els.nextBtn,
      els.muteBtn,
      els.langBtn,
      els.studioBtn,
      els.closeBtn,
    ]);

    // Topdeck: 5 Scene Presets + Flush/Islands toggle
    els.presetBtns = {};
    var presetKids = ['crisp', 'crystal', 'islands', 'focus', 'eco'].map(function (pid) {
      var b = h('button', {
        type: 'button',
        class: 'pp-preset',
        'data-preset': pid,
        'aria-pressed': 'false',
        onclick: function () {
          var patch = { preset: pid };
          var sp = SCENE_PRESETS[pid];
          for (var k in sp) {
            if (Object.prototype.hasOwnProperty.call(sp, k)) patch[k] = sp[k];
          }
          if (!store.config || typeof store.config !== 'object') store.config = {};
          var activeOv = getActiveOverride();
          for (var qk in patch) {
            if (Object.prototype.hasOwnProperty.call(patch, qk)) {
              store.config[qk] = patch[qk];
              if (Object.prototype.hasOwnProperty.call(patchQueue, qk)) delete patchQueue[qk];
              if (activeOv && PER_WALLPAPER_OVERRIDE_KEY_MAP[qk] && Object.prototype.hasOwnProperty.call(activeOv, qk)) {
                delete activeOv[qk];
              }
            }
          }
          if (patch.surfaceTints === null) {
            if (store.config.regions && typeof store.config.regions === 'object') {
              store.config.regions = stripOpticalFromRegionsObj(store.config.regions);
            }
            if (patchQueue.regions && typeof patchQueue.regions === 'object') {
              patchQueue.regions = stripOpticalFromRegionsObj(patchQueue.regions);
            }
            if (activeOv && activeOv.regions && typeof activeOv.regions === 'object') {
              activeOv.regions = stripOpticalFromRegionsObj(activeOv.regions);
            }
          }
          if (W[SKIN_KEY] && typeof W[SKIN_KEY].updateConfig === 'function') {
            try {
              W[SKIN_KEY].updateConfig(patch);
            } catch (_) {}
          }
          renderAll();
          callRpc('preset.apply', { presetId: pid }).then(function (r) {
            if (r) ingestState(extractStatePayload(r));
          });
        },
      });
      els.presetBtns[pid] = b;
      return b;
    });

    els.flushBtn = h('button', {
      type: 'button',
      'data-layout': 'flush',
      onclick: function () {
        pushConfigPatch({ layoutMode: 'flush', preset: 'custom' }, true);
      },
    });
    els.islandsBtn = h('button', {
      type: 'button',
      'data-layout': 'islands',
      onclick: function () {
        pushConfigPatch({ layoutMode: 'islands', islandGap: cfgVal('islandGap') || 8, preset: 'custom' }, true);
      },
    });

    var topdeck = h('div', { class: 'pp-topdeck' }, [
      h('div', { class: 'pp-deck-row' }, [h('span', { class: 'pp-micro', text: 'SCENE' }), h('div', { class: 'pp-presets' }, presetKids)]),
      h('div', { class: 'pp-deck-row' }, [
        h('span', { class: 'pp-micro', text: 'LAYOUT' }),
        h('div', { class: 'pp-seg', role: 'radiogroup' }, [els.flushBtn, els.islandsBtn]),
      ]),
    ]);

    // Subtabs
    els.tabBtns = {};
    var tabBar = h(
      'div',
      { class: 'pp-tabs', role: 'tablist' },
      ['library', 'optics', 'status'].map(function (tid) {
        var b = h('button', {
          type: 'button',
          class: 'pp-tab',
          role: 'tab',
          'data-tab': tid,
          onclick: function () {
            ui.tab = tid;
            if (tid === 'library' && (!store.items || !store.items.length)) refreshLibrary();
            renderAll();
          },
        });
        els.tabBtns[tid] = b;
        return b;
      })
    );

    els.toast = h('div', { class: 'pp-toast', hidden: true });

    // Drill-down sub-drawer (Stage 1 of Two-Stage Escape Unwind!)
    els.drillTitle = h('span');
    els.drillDoneBtn = h('button', {
      type: 'button',
      class: 'pp-btn',
      style: 'height:22px;padding:0 8px;font-size:11px;',
      onclick: function () {
        closeDrilldown();
      },
    });
    els.rotSwitch = h('button', {
      type: 'button',
      class: 'pp-sw',
      role: 'switch',
      onclick: function () {
        pushConfigPatch({ rotationEnabled: !cfgVal('rotationEnabled') }, true);
      },
    });
    els.rotLabel = h('span');
    els.drillPanel = h('div', { class: 'pp-drill', hidden: true, 'data-testid': 'prism-drilldown' }, [
      h('div', { class: 'pp-drill-head' }, [els.drillTitle, els.drillDoneBtn]),
      h('div', { class: 'pp-trow', style: 'border-top:none;' }, [els.rotLabel, els.rotSwitch]),
    ]);

    // Pane 1: Library
    els.searchInp = h('input', {
      type: 'text',
      class: 'pp-inp',
      oninput: function () {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function () {
          ui.query = els.searchInp.value || '';
          ui.pageLimit = PAGE_SIZE;
          if (els.body) els.body.scrollTop = 0;
          renderLibraryGrid();
        }, 180);
      },
    });
    els.drillOpenBtn = h('button', {
      type: 'button',
      class: 'pp-btn',
      'data-testid': 'prism-open-drilldown',
      onclick: function () {
        if (ui.drilldown) closeDrilldown();
        else openDrilldown();
      },
    });
    els.kindChips = {};
    var chipRow = h(
      'div',
      { class: 'pp-chips' },
      ['', 'image', 'video', 'web', 'scene'].map(function (k) {
        var c = h('button', {
          type: 'button',
          class: 'pp-chip',
          onclick: function () {
            ui.kindFilter = k;
            ui.pageLimit = PAGE_SIZE;
            if (els.body) els.body.scrollTop = 0;
            renderAll();
          },
        });
        els.kindChips[k || 'all'] = c;
        return c;
      })
    );
    els.localChip = h('button', {
      type: 'button',
      class: 'pp-chip',
      'data-testid': 'prism-local-chip',
      onclick: function () {
        ui.localOnly = !ui.localOnly;
        ui.pageLimit = PAGE_SIZE;
        if (els.body) els.body.scrollTop = 0;
        renderAll();
      },
    });
    chipRow.appendChild(els.localChip);
    els.favChip = h('button', {
      type: 'button',
      class: 'pp-chip',
      text: '★',
      onclick: function () {
        ui.favOnly = !ui.favOnly;
        ui.pageLimit = PAGE_SIZE;
        if (els.body) els.body.scrollTop = 0;
        renderAll();
      },
    });
    chipRow.appendChild(els.favChip);
    els.grid = h('div', { class: 'pp-grid' });
    els.paneLibrary = h('div', { class: 'pp-pane' }, [
      h('div', { class: 'pp-lib-bar' }, [els.searchInp, els.drillOpenBtn]),
      chipRow,
      els.grid,
    ]);

    // Pane 2: Optics
    els.schemeTitle = h('div', { class: 'pp-sec-title' });
    els.swatchBtns = {};
    var swatchGrid = h(
      'div',
      { class: 'pp-swatches' },
      SCHEMES.map(function (sc) {
        var labelEl = h('span');
        var btn = h(
          'button',
          {
            type: 'button',
            class: 'pp-swatch',
            'data-scheme': sc.id,
            onclick: function () {
              pushConfigPatch({ colorScheme: sc.id }, true);
            },
          },
          [
            h('span', { class: 'pp-dots' }, [
              h('i', { style: 'background:' + sc.c1 }),
              h('i', { style: 'background:' + sc.acc }),
            ]),
            labelEl,
          ]
        );
        els.swatchBtns[sc.id] = { btn: btn, label: labelEl, meta: sc };
        return btn;
      })
    );

    els.accentTitle = h('div', { class: 'pp-sec-title' });
    els.accentBtns = {};
    var accRow = h('div', { class: 'pp-acc-row' });
    ACCENTS.forEach(function (ac) {
      var b = h('button', {
        type: 'button',
        class: 'pp-chip',
        'data-accent': ac.id,
        onclick: function () {
          pushConfigPatch({ accentMode: ac.id }, true);
        },
      });
      els.accentBtns[ac.id] = { btn: b, meta: ac };
      accRow.appendChild(b);
    });
    els.customColorInp = h('input', {
      type: 'color',
      class: 'pp-color',
      value: '#669DF6',
      oninput: function () {
        pushConfigPatch({ accentMode: 'custom', customAccent: els.customColorInp.value }, false);
      },
      onchange: function () {
        pushConfigPatch({ accentMode: 'custom', customAccent: els.customColorInp.value }, true);
      },
    });
    accRow.appendChild(els.customColorInp);

    var slidersSec = h('div', { class: 'pp-sec' }, [
      buildSliderRow('glassOpacity', 0.15, 0.98, 0.01, function (v) { return Math.round(v * 100) + '%'; }),
      buildSliderRow('glassBlur', 0, 64, 1, function (v) { return Math.round(v) + ' px'; }),
      buildSliderRow('sidebarBlur', 0, 64, 1, function (v) { return Math.round(v) + ' px'; }, 'glassBlur'),
      buildSliderRow('islandGap', 0, 20, 1, function (v) { return Math.round(v) + ' px'; }),
      buildSliderRow('scrimOpacity', 0, 0.92, 0.01, function (v) { return Math.round(v * 100) + '%'; }),
      buildSliderRow('mediaBlur', 0, 64, 1, function (v) { return Math.round(v) + ' px'; }),
      buildSliderRow('volume', 0, 1, 0.05, function (v) { return Math.round(v * 100) + '%'; }),
    ]);

    els.compSummaryTitle = h('span');
    els.compBadge = h('span', { class: 'pp-comp-badge', hidden: true });
    els.compResetAllBtn = h('button', {
      type: 'button',
      class: 'pp-btn pp-comp-reset',
      'data-testid': 'prism-pop-reset-tints',
      onclick: function () {
        pushConfigPatch({ preset: 'custom', surfaceTints: null, sidebarOpacity: null, sidebarBlur: null }, true);
      },
    });
    els.compCatShell = h('div', { class: 'pp-comp-cat' });
    els.compCatChat = h('div', { class: 'pp-comp-cat' });
    els.compCatControls = h('div', { class: 'pp-comp-cat' });
    var compRows = [];
    SURFACE_TINT_COMPONENTS.forEach(function (cid) {
      if (cid === 'topbar') compRows.push(els.compCatShell);
      else if (cid === 'userBubble') compRows.push(els.compCatChat);
      else if (cid === 'card') compRows.push(els.compCatControls);
      compRows.push(buildComponentOpacityRow(cid));
    });
    compRows.push(els.compResetAllBtn);
    els.compAccordion = h('details', { class: 'pp-sec pp-comp-sec', 'data-testid': 'prism-comp-accordion' }, [
      h('summary', { class: 'pp-comp-sum', 'data-testid': 'prism-comp-accordion-summary' }, [
        h('span', { class: 'pp-comp-sum-left' }, [els.compSummaryTitle, els.compBadge]),
      ]),
      h('div', { class: 'pp-comp-body' }, compRows),
    ]);

    els.swGlassLbl = h('span');
    els.swGlass = h('button', {
      type: 'button',
      class: 'pp-sw',
      role: 'switch',
      onclick: function () { pushConfigPatch({ glassSurfaces: !cfgVal('glassSurfaces'), preset: 'custom' }, true); },
    });
    els.swWcoLbl = h('span');
    els.swWco = h('button', {
      type: 'button',
      class: 'pp-sw',
      role: 'switch',
      onclick: function () { pushConfigPatch({ transparentWindowControls: !cfgVal('transparentWindowControls') }, true); },
    });
    els.swHideLogoLbl = h('span');
    els.swHideLogo = h('button', {
      type: 'button',
      class: 'pp-sw',
      role: 'switch',
      'data-testid': 'prism-hide-welcome-logo-toggle',
      onclick: function () { pushConfigPatch({ hideWelcomeLogo: !cfgVal('hideWelcomeLogo') }, true); },
    });
    els.swVigLbl = h('span');
    els.swVig = h('button', {
      type: 'button',
      class: 'pp-sw',
      role: 'switch',
      onclick: function () { pushConfigPatch({ vignette: !cfgVal('vignette'), preset: 'custom' }, true); },
    });
    els.swBlurLbl = h('span');
    els.swBlur = h('button', {
      type: 'button',
      class: 'pp-sw',
      role: 'switch',
      onclick: function () { pushConfigPatch({ pauseOnBlur: !cfgVal('pauseOnBlur') }, true); },
    });
    els.topbarLbl = h('span', { class: 'pp-sec-title' });
    els.topbarBtns = {};
    var topbarSeg = h(
      'div',
      { class: 'pp-seg', role: 'radiogroup', 'data-testid': 'prism-topbar-style-seg' },
      ['pills', 'bar'].map(function (ts) {
        var b = h('button', {
          type: 'button',
          'data-topbar-style': ts,
          onclick: function () { pushConfigPatch({ topbarStyle: ts }, true); },
        });
        els.topbarBtns[ts] = b;
        return b;
      })
    );
    els.codeLbl = h('span', { class: 'pp-sec-title' });
    els.codeBtns = {};
    var codeSeg = h(
      'div',
      { class: 'pp-seg pp-seg3', role: 'radiogroup' },
      ['translucent', 'frosted', 'solid'].map(function (cm) {
        var b = h('button', {
          type: 'button',
          onclick: function () {
            pushConfigPatch({
              codeReadabilityMode: cm,
              regions: { codeBlock: { style: null } },
              surfaceTints: { codeBlock: { style: null } },
            }, true);
          },
        });
        els.codeBtns[cm] = b;
        return b;
      })
    );

    var togglesSec = h('div', { class: 'pp-sec' }, [
      h('div', { class: 'pp-trow', style: 'border-top:none;' }, [els.swGlassLbl, els.swGlass]),
      h('div', { class: 'pp-trow' }, [els.swWcoLbl, els.swWco]),
      h('div', { class: 'pp-trow' }, [els.swHideLogoLbl, els.swHideLogo]),
      h('div', { class: 'pp-trow' }, [els.swVigLbl, els.swVig]),
      h('div', { class: 'pp-trow' }, [els.swBlurLbl, els.swBlur]),
      els.topbarLbl,
      topbarSeg,
      els.codeLbl,
      codeSeg,
    ]);

    els.paneOptics = h('div', { class: 'pp-pane' }, [
      h('div', { class: 'pp-sec' }, [els.schemeTitle, swatchGrid, els.accentTitle, accRow]),
      slidersSec,
      els.compAccordion,
      togglesSec,
    ]);

    // Pane 3: Status & 2-Step Inline Restore
    els.kvList = h('dl', { class: 'pp-kv' });
    els.refreshBtn = h('button', {
      type: 'button',
      class: 'pp-btn',
      style: 'flex:1;',
      onclick: function () {
        refreshAllFromHost();
      },
    });
    els.resetSkinBtn = h('button', {
      type: 'button',
      class: 'pp-btn',
      style: 'flex:1;',
      onclick: function () {
        callRpc('config.reset', { scope: 'skin' }).then(function (r) {
          if (r) ingestState(extractStatePayload(r));
        });
      },
    });
    els.restoreBtn = h('button', {
      type: 'button',
      class: 'pp-btn pp-btn-danger',
      'data-testid': 'prism-restore-btn',
      'data-armed': 'false',
      onclick: function () {
        if (!store.skinEnabled) {
          toggleSkinMaster(true);
          return;
        }
        if (!restoreArmed) {
          restoreArmed = true;
          els.restoreBtn.setAttribute('data-armed', 'true');
          els.restoreBtn.textContent = tr('btnRestoreConfirm');
          clearTimeout(restoreTimer);
          restoreTimer = setTimeout(disarmRestore, 4500);
          return;
        }
        disarmRestore();
        runMasterSkinRpc(false, 'skin.restore', {});
      },
    });
    els.paneStatus = h('div', { class: 'pp-pane' }, [
      els.kvList,
      h('div', { style: 'display:flex;gap:6px;margin-bottom:8px;' }, [els.refreshBtn, els.resetSkinBtn]),
      els.restoreBtn,
    ]);

    els.body = h('div', { class: 'pp-body' }, [els.drillPanel, els.paneLibrary, els.paneOptics, els.paneStatus]);

    els.footTitle = h('span', { class: 'pp-foot-title' });
    els.footShortcut = h('span', { style: 'font-family:var(--pp-mono);font-size:10px;', text: 'Ctrl+Alt+W' });
    var foot = h('div', { class: 'pp-foot' }, [els.footTitle, els.footShortcut]);

    els.sheet = h('div', { class: 'prism-sheet', role: 'dialog', 'aria-label': 'Wallpaper Prism', tabindex: '-1' }, [
      els.head,
      topdeck,
      tabBar,
      els.toast,
      els.body,
      foot,
    ]);

    els.root = h(
      'div',
      {
        id: ROOT_ID,
        class: 'agy-prism-popover',
        'data-open': 'false',
        'data-conn': 'off',
        'data-skin-enabled': store.skinEnabled ? 'true' : 'false',
        'data-has-update': 'false',
        'data-theme': 'dark',
        translate: 'no',
        'data-no-translate': 'true',
        'data-ag-no-i18n': '1',
      },
      [els.orb, els.sheet]
    );
    attachHeaderDrag();
    return els.root;
  }

  function attachHeaderDrag() {
    var drag = null;
    els.head.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || (e.target && e.target.closest && e.target.closest('button'))) return;
      var r = els.sheet.getBoundingClientRect();
      drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, pid: e.pointerId };
      try {
        els.head.setPointerCapture(e.pointerId);
      } catch (_) {}
      e.preventDefault();
    });
    els.head.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.pid) return;
      ui.pos = { x: Math.round(e.clientX - drag.dx), y: Math.round(e.clientY - drag.dy) };
      positionTriggersAndSheet();
    });
    var stopDrag = function (e) {
      if (!drag || (e && e.pointerId !== drag.pid)) return;
      drag = null;
      try {
        els.head.releasePointerCapture(e.pointerId);
      } catch (_) {}
    };
    els.head.addEventListener('pointerup', stopDrag);
    els.head.addEventListener('pointercancel', stopDrag);
    els.head.addEventListener('dblclick', function (e) {
      if (e.target && e.target.closest && e.target.closest('button')) return;
      ui.pos = null;
      positionTriggersAndSheet();
    });
  }

  function renderConnectionState() {
    if (!els.root) return;
    var conn = hasBinding() || store.connected;
    els.root.setAttribute('data-conn', conn ? 'on' : 'off');
    if (els.connText) els.connText.textContent = conn ? tr('connOn') : tr('connOff');
  }

  var lastGridSig = '';

  function renderLibraryGrid() {
    if (!els.grid) return;
    if (!ui.open) {
      lastGridSig = '';
      return;
    }

    var q = String(ui.query || '').trim().toLowerCase();
    var favs = Array.isArray(store.config.favorites) ? store.config.favorites : [];
    var hidden = Array.isArray(store.config.hiddenIds) ? store.config.hiddenIds : [];
    var activeId = (store.activeItem && store.activeItem.id) || cfgVal('activeWallpaperId') || cfgVal('wallpaperId') || '';
    var itemsArr = store.items || [];
    var firstId = itemsArr.length && itemsArr[0] ? itemsArr[0].id : '';
    var lastId = itemsArr.length && itemsArr[itemsArr.length - 1] ? itemsArr[itemsArr.length - 1].id : '';
    var pageLimit = Math.max(PAGE_SIZE, Number(ui.pageLimit) || PAGE_SIZE);
    var animMode = String(cfgVal('libraryAnimatedThumbs') || 'hover');
    var gridSig = [
      getLang(),
      store.skinEnabled ? '1' : '0',
      activeId,
      ui.kindFilter,
      ui.localOnly ? '1' : '0',
      ui.favOnly ? '1' : '0',
      String(pageLimit),
      animMode,
      q,
      itemsArr.length,
      firstId,
      lastId,
      favs.join(','),
      hidden.join(','),
    ].join('|');
    if (gridSig === lastGridSig) return;
    lastGridSig = gridSig;

    var prevScrollTop = els.body ? els.body.scrollTop : 0;
    clearThumbObserverTargets();
    while (els.grid.firstChild) els.grid.removeChild(els.grid.firstChild);

    var filtered = (store.items || []).filter(function (it) {
      if (!it || hidden.indexOf(it.id) >= 0) return false;
      if (ui.kindFilter && it.kind !== ui.kindFilter) return false;
      if (ui.localOnly) {
        var src = String(it.source || '').toLowerCase();
        var idStr = String(it.id || '');
        if (src !== 'local' && src !== 'upload' && idStr.indexOf('loc-') !== 0 && idStr.indexOf('up-') !== 0) {
          return false;
        }
      }
      if (ui.favOnly && favs.indexOf(it.id) < 0) return false;
      if (q) {
        var hay = (String(it.title || '') + ' ' + (Array.isArray(it.tags) ? it.tags.join(' ') : '')).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });

    if (!filtered.length) {
      els.grid.appendChild(h('div', { style: 'grid-column:1/-1;padding:22px 8px;text-align:center;color:var(--pp-muted);font-size:11.5px;', text: tr('emptyLib') }));
      return;
    }

    var shownCount = Math.min(filtered.length, pageLimit);
    filtered.slice(0, shownCount).forEach(function (it) {
      var isCur = store.skinEnabled && activeId && it.id === activeId;
      var isFav = favs.indexOf(it.id) >= 0;
      var thumb = h('div', { class: 'pp-thumb' }, [h('span', { text: String(it.kind || 'IMG').toUpperCase() })]);
      var thumbImg = null;
      var origThumbUrl = it.thumbUrl ? String(it.thumbUrl).trim() : '';
      var staticThumbUrl = origThumbUrl ? toStaticThumbUrl(origThumbUrl) : '';
      if (origThumbUrl) {
        thumbImg = h('img', {
          loading: 'lazy',
          alt: '',
          onerror: function () {
            if (thumbImg.parentNode) thumbImg.parentNode.removeChild(thumbImg);
          },
        });
        thumb.appendChild(thumbImg);
        bindSafeThumb(thumbImg, origThumbUrl);
      }
      if (isCur) thumb.appendChild(h('span', { class: 'pp-cur', html: ICONS.check }));
      var favBtn = h('button', {
        type: 'button',
        class: 'pp-fav',
        'data-on': isFav ? 'true' : 'false',
        text: '★',
        onclick: function (e) {
          e.stopPropagation();
          var curFavs = Array.isArray(store.config.favorites) ? store.config.favorites.slice() : [];
          var idx = curFavs.indexOf(it.id);
          if (idx >= 0) curFavs.splice(idx, 1);
          else curFavs.push(it.id);
          pushConfigPatch({ favorites: curFavs }, true);
        },
      });
      thumb.appendChild(favBtn);

      var hoverTimer = 0;
      var cardProps = {
        class: 'pp-card',
        role: 'button',
        tabindex: '0',
        'aria-current': isCur ? 'true' : 'false',
        onclick: function () {
          store.skinEnabled = true;
          store.activeItem = it;
          if (W[SKIN_KEY] && typeof W[SKIN_KEY].applyPayload === 'function') {
            W[SKIN_KEY].applyPayload({ skinEnabled: true, config: store.config, activeItem: it });
          }
          renderAll();
          callRpc('wallpaper.apply', { wallpaperId: it.id }).then(function (r) {
            if (r) ingestState(extractStatePayload(r));
          });
        },
        onkeydown: function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            card.click();
          }
        },
      };
      if (thumbImg && animMode === 'hover' && staticThumbUrl && staticThumbUrl !== origThumbUrl) {
        cardProps.onpointerenter = function () {
          if (destroyed || !ui.open || !thumbImg.parentNode) return;
          clearTimeout(hoverTimer);
          hoverTimer = setTimeout(function () {
            hoverTimer = 0;
            if (destroyed || !ui.open || !thumbImg.parentNode) return;
            try {
              if (thumbIo && typeof thumbIo.unobserve === 'function') thumbIo.unobserve(thumbImg);
            } catch (_) {}
            loadSafeThumbNow(thumbImg, origThumbUrl);
          }, 180);
          thumbHoverTimers.push(hoverTimer);
        };
        cardProps.onpointerleave = function () {
          if (hoverTimer) {
            clearTimeout(hoverTimer);
            hoverTimer = 0;
          }
          if (!destroyed && thumbImg.parentNode) {
            loadSafeThumbNow(thumbImg, staticThumbUrl);
          }
        };
      }
      var card = h('div', cardProps, [thumb, h('div', { class: 'pp-ctitle', text: it.title || it.id })]);
      els.grid.appendChild(card);
    });

    if (filtered.length > shownCount) {
      var remaining = filtered.length - shownCount;
      var step = Math.min(PAGE_SIZE, remaining);
      var moreText =
        getLang() === 'zh'
          ? tr('loadMore') + '（已显示 ' + shownCount + ' / ' + filtered.length + '，+' + step + '）'
          : tr('loadMore') + ' (' + shownCount + ' / ' + filtered.length + ', +' + step + ')';
      var moreBtn = h('button', {
        type: 'button',
        class: 'pp-btn',
        'data-testid': 'prism-load-more',
        style: 'grid-column:1/-1;width:100%;margin-top:4px;',
        text: moreText,
        onclick: function () {
          ui.pageLimit = shownCount + PAGE_SIZE;
          renderLibraryGrid();
        },
      });
      els.grid.appendChild(moreBtn);
    }

    if (els.body && prevScrollTop > 0 && shownCount > PAGE_SIZE) {
      els.body.scrollTop = prevScrollTop;
    }
  }

  function renderAll() {
    if (!els.root) return;
    var lang = getLang();
    var skinOn = Boolean(store.skinEnabled);
    renderConnectionState();
    els.root.setAttribute('data-skin-enabled', skinOn ? 'true' : 'false');
    if (els.orb) els.orb.setAttribute('data-skin-enabled', skinOn ? 'true' : 'false');
    if (els.powerBtn) {
      els.powerBtn.setAttribute('aria-checked', skinOn ? 'true' : 'false');
      els.powerBtn.setAttribute('data-busy', toggleBusy ? 'true' : 'false');
      els.powerBtn.title = skinOn ? tr('powerTipOn') : tr('powerTipOff');
      if (els.powerText) els.powerText.textContent = skinOn ? tr('powerOn') : tr('powerOff');
    }
    if (els.restoreBtn) {
      els.restoreBtn.setAttribute('data-busy', toggleBusy ? 'true' : 'false');
    }
    syncInlinePillState();
    syncHousekeepTimer();

    // Header tooltips & state
    els.prevBtn.title = tr('prev');
    els.playBtn.title = cfgVal('paused') ? tr('play') : tr('pause');
    els.playBtn.innerHTML = cfgVal('paused') ? ICONS.play : ICONS.pause;
    els.nextBtn.title = tr('next');
    els.muteBtn.title = tr('mute');
    els.muteBtn.innerHTML = cfgVal('muted') ? ICONS.volOff : ICONS.volOn;
    els.langBtn.textContent = lang === 'zh' ? 'EN' : '中';
    var upd = store.updateStatus;
    var hasUpd = Boolean(upd && upd.updateAvailable);
    els.root.setAttribute('data-has-update', hasUpd ? 'true' : 'false');
    if (els.studioBtn) {
      els.studioBtn.setAttribute('data-has-update', hasUpd ? 'true' : 'false');
      els.studioBtn.title = hasUpd && upd.latestVersion ? tr('updateTip').replace('{v}', upd.latestVersion) : tr('openStudio');
    }
    if (els.updateDot) els.updateDot.hidden = !hasUpd;
    els.closeBtn.title = tr('close');

    // Topdeck
    var curPreset = String(cfgVal('preset') || 'custom');
    for (var pid in els.presetBtns) {
      els.presetBtns[pid].textContent = tr('preset_' + pid);
      els.presetBtns[pid].title = pid === 'crisp' ? tr('preset_crispTitle') : tr('preset_' + pid);
      els.presetBtns[pid].setAttribute('aria-pressed', curPreset === pid ? 'true' : 'false');
    }
    var lMode = cfgVal('layoutMode') === 'flush' ? 'flush' : 'islands';
    els.flushBtn.textContent = tr('flush');
    els.flushBtn.setAttribute('aria-checked', lMode === 'flush' ? 'true' : 'false');
    els.islandsBtn.textContent = tr('islands');
    els.islandsBtn.setAttribute('aria-checked', lMode === 'islands' ? 'true' : 'false');

    // Tabs
    ['library', 'optics', 'status'].forEach(function (tid) {
      els.tabBtns[tid].textContent = tr('tab_' + tid);
      els.tabBtns[tid].setAttribute('aria-selected', ui.tab === tid ? 'true' : 'false');
    });
    els.paneLibrary.hidden = ui.tab !== 'library';
    els.paneOptics.hidden = ui.tab !== 'optics';
    els.paneStatus.hidden = ui.tab !== 'status';

    // Drilldown
    els.drillPanel.hidden = !ui.drilldown;
    els.drillTitle.textContent = tr('drillTitle');
    els.drillDoneBtn.textContent = tr('drillDone');
    els.rotLabel.textContent = tr('rotateLabel');
    els.rotSwitch.setAttribute('aria-checked', cfgVal('rotationEnabled') ? 'true' : 'false');

    // Library controls
    els.searchInp.placeholder = tr('searchPh');
    els.drillOpenBtn.textContent = tr('drillBtn');
    ['all', 'image', 'video', 'web', 'scene'].forEach(function (k) {
      var raw = k === 'all' ? '' : k;
      els.kindChips[k].textContent = tr('kind_' + k);
      els.kindChips[k].setAttribute('aria-pressed', ui.kindFilter === raw ? 'true' : 'false');
    });
    if (els.localChip) {
      els.localChip.textContent = tr('source_local');
      els.localChip.setAttribute('aria-pressed', ui.localOnly ? 'true' : 'false');
    }
    els.favChip.setAttribute('aria-pressed', ui.favOnly ? 'true' : 'false');
    if (ui.tab === 'library') renderLibraryGrid();

    // Optics controls
    els.schemeTitle.textContent = tr('schemeLabel');
    var curScheme = String(cfgVal('colorScheme') || 'prism-default');
    for (var sid in els.swatchBtns) {
      var sw = els.swatchBtns[sid];
      sw.label.textContent = lang === 'zh' ? sw.meta.zh : sw.meta.en;
      sw.btn.setAttribute('aria-checked', curScheme === sid ? 'true' : 'false');
    }

    els.accentTitle.textContent = tr('accentLabel');
    var curAcc = String(cfgVal('accentMode') || 'dynamic');
    for (var aid in els.accentBtns) {
      var ab = els.accentBtns[aid];
      ab.btn.textContent = lang === 'zh' ? ab.meta.zh : ab.meta.en;
      ab.btn.setAttribute('aria-pressed', curAcc === aid ? 'true' : 'false');
    }
    if (cfgVal('customAccent') && /^#[0-9a-f]{6}$/i.test(cfgVal('customAccent'))) {
      els.customColorInp.value = cfgVal('customAccent');
    }

    for (var sk in sliderRefs) {
      var sr = sliderRefs[sk];
      var rawVal = cfgVal(sk);
      var hasExplicitNum = rawVal !== null && rawVal !== undefined && rawVal !== '' && Number.isFinite(Number(rawVal));
      var isDragging = doc.activeElement === sr.range;
      sr.label.textContent = tr('s_' + sk);
      sr.rst.title = tr('resetTip');
      if (sr.fallbackKey) {
        if (!hasExplicitNum) {
          var fbRaw = cfgVal(sr.fallbackKey);
          var effVal = fbRaw !== null && fbRaw !== undefined && fbRaw !== '' && Number.isFinite(Number(fbRaw)) ? Number(fbRaw) : DEFAULTS[sr.fallbackKey];
          var fbPct = ((clamp(effVal, sr.min, sr.max) - sr.min) / (sr.max - sr.min)) * 100;
          sr.val.textContent = tr('autoFollowPrefix') + sr.fmt(effVal);
          if (!isDragging) sr.range.value = String(clamp(effVal, sr.min, sr.max));
          sr.range.style.setProperty('--pct', fbPct.toFixed(1) + '%');
          sr.row.setAttribute('data-dirty', 'false');
          sr.range.setAttribute('data-dirty', 'false');
        } else {
          var cVal = Number(rawVal);
          var cPct = ((clamp(cVal, sr.min, sr.max) - sr.min) / (sr.max - sr.min)) * 100;
          sr.val.textContent = sr.fmt(cVal);
          if (!isDragging) sr.range.value = String(cVal);
          sr.range.style.setProperty('--pct', cPct.toFixed(1) + '%');
          sr.row.setAttribute('data-dirty', 'true');
          sr.range.setAttribute('data-dirty', 'true');
        }
      } else {
        var val = hasExplicitNum ? Number(rawVal) : DEFAULTS[sk];
        var pct = ((clamp(val, sr.min, sr.max) - sr.min) / (sr.max - sr.min)) * 100;
        sr.val.textContent = sr.fmt(val);
        if (!isDragging) sr.range.value = String(val);
        sr.range.style.setProperty('--pct', pct.toFixed(1) + '%');
        var dirty = Math.abs(val - DEFAULTS[sk]) > (sr.max <= 1 ? 0.004 : 0.4);
        var dirtyStr = dirty ? 'true' : 'false';
        sr.row.setAttribute('data-dirty', dirtyStr);
        sr.range.setAttribute('data-dirty', dirtyStr);
      }
    }

    // Per-Component Glass Depth Accordion (12 components with resolveComponentDefaultAlpha Auto-follow & style cycler)
    var effOptics = effectiveOpticsCfg();
    var isLightTheme = store.theme === 'light';
    var wcoDisabled = cfgVal('transparentWindowControls') === false;
    var customCompCount = 0;
    if (els.compSummaryTitle) els.compSummaryTitle.textContent = tr('compTitle');
    if (els.compResetAllBtn) els.compResetAllBtn.textContent = tr('compResetAll');
    if (els.compCatShell) els.compCatShell.textContent = tr('compCat_shell');
    if (els.compCatChat) els.compCatChat.textContent = tr('compCat_chat');
    if (els.compCatControls) els.compCatControls.textContent = tr('compCat_controls');
    for (var ci = 0; ci < SURFACE_TINT_COMPONENTS.length; ci += 1) {
      var cid = SURFACE_TINT_COMPONENTS[ci];
      var cr = compSliderRefs[cid];
      if (!cr) continue;
      cr.label.textContent = tr('comp_' + cid);
      cr.rst.title = tr('resetTip');
      if (cr.styleBtn) {
        var explicitStyle = readComponentStyle(cid);
        var effStyle = resolveEffectiveComponentStyle(cid, explicitStyle, effOptics);
        var styleTxt = styleChipLabel(cid, explicitStyle, effOptics);
        cr.styleBtn.textContent = styleTxt;
        cr.styleBtn.title = tr('styleCycleTip').replace('{style}', styleTxt);
        cr.styleBtn.setAttribute('data-style', explicitStyle || 'auto');
        cr.styleBtn.setAttribute('data-eff-style', effStyle || 'auto');
        cr.styleBtn.setAttribute('data-custom', explicitStyle ? 'true' : 'false');
      }
      if (cid === 'wco' && cr.wcoHint) {
        cr.wcoHint.hidden = !wcoDisabled;
        cr.wcoHint.textContent = tr('wcoDisabledHint');
        cr.row.setAttribute('data-disabled-hint', wcoDisabled ? 'true' : 'false');
      }
      var compRaw = readComponentOpacity(cid);
      var compDragging = doc.activeElement === cr.range;
      if (compRaw === null) {
        var defAlpha = resolveComponentDefaultAlpha(cid, effOptics, isLightTheme);
        var clampedDef = clamp(defAlpha, cr.min, cr.max);
        var defPct = ((clampedDef - cr.min) / (cr.max - cr.min)) * 100;
        cr.val.textContent = tr('autoFollowPrefix') + cr.fmt(defAlpha);
        if (!compDragging) cr.range.value = String(clampedDef);
        cr.range.style.setProperty('--pct', defPct.toFixed(1) + '%');
      } else {
        var clampedVal = clamp(compRaw, cr.min, cr.max);
        var compPct = ((clampedVal - cr.min) / (cr.max - cr.min)) * 100;
        cr.val.textContent = cr.fmt(clampedVal);
        if (!compDragging) cr.range.value = String(clampedVal);
        cr.range.style.setProperty('--pct', compPct.toFixed(1) + '%');
      }
      var optDirty = isComponentOpticallyDirty(cid);
      if (optDirty) customCompCount += 1;
      cr.row.setAttribute('data-dirty', optDirty ? 'true' : 'false');
      cr.range.setAttribute('data-dirty', compRaw !== null ? 'true' : 'false');
    }
    if (els.compBadge) {
      els.compBadge.hidden = customCompCount === 0;
      els.compBadge.textContent = String(customCompCount);
    }

    els.swGlassLbl.textContent = tr('sw_glass');
    els.swGlass.setAttribute('aria-checked', cfgVal('glassSurfaces') ? 'true' : 'false');
    els.swWcoLbl.textContent = tr('sw_wco');
    els.swWco.setAttribute('aria-checked', cfgVal('transparentWindowControls') !== false ? 'true' : 'false');
    els.swHideLogoLbl.textContent = tr('sw_hideWelcomeLogo');
    els.swHideLogo.setAttribute('aria-checked', cfgVal('hideWelcomeLogo') ? 'true' : 'false');
    els.swVigLbl.textContent = tr('sw_vignette');
    els.swVig.setAttribute('aria-checked', cfgVal('vignette') ? 'true' : 'false');
    els.swBlurLbl.textContent = tr('sw_pauseBlur');
    els.swBlur.setAttribute('aria-checked', cfgVal('pauseOnBlur') ? 'true' : 'false');
    els.topbarLbl.textContent = tr('topbarLabel');
    var curTopbar = cfgVal('topbarStyle') === 'bar' ? 'bar' : 'pills';
    ['pills', 'bar'].forEach(function (ts) {
      els.topbarBtns[ts].textContent = tr('topbar_' + ts);
      els.topbarBtns[ts].setAttribute('aria-checked', curTopbar === ts ? 'true' : 'false');
    });
    els.codeLbl.textContent = tr('codeLabel');
    var curCode = String(cfgVal('codeReadabilityMode') || 'translucent');
    if (curCode === 'native') curCode = 'solid';
    ['translucent', 'frosted', 'solid'].forEach(function (cm) {
      els.codeBtns[cm].textContent = tr('code_' + cm);
      els.codeBtns[cm].setAttribute('aria-checked', curCode === cm ? 'true' : 'false');
    });

    // Status KV
    while (els.kvList.firstChild) els.kvList.removeChild(els.kvList.firstChild);
    var activeName = (store.activeItem && (store.activeItem.title || store.activeItem.id)) || tr('st_none');
    var rows = [
      [tr('st_skin'), store.skinEnabled ? tr('st_skinOn') : tr('st_skinOff')],
      [tr('st_active'), activeName],
      [tr('st_theme'), store.theme + ' · ' + curScheme],
      [tr('st_rpc'), hasBinding() ? '__agyPrismCall (OK)' : 'Standby'],
    ];
    rows.forEach(function (pair) {
      els.kvList.appendChild(h('dt', { text: pair[0] }));
      els.kvList.appendChild(h('dd', { text: pair[1] }));
    });
    els.kvList.appendChild(h('dt', { text: tr('st_version') }));
    if (hasUpd && upd.latestVersion) {
      var verLabel = 'v' + VERSION + ' → v' + upd.latestVersion + ' (' + tr('st_updateAvail') + ')';
      var verDd = h('dd', {}, [
        upd.releaseUrl
          ? h('a', {
              class: 'pp-ver-link',
              href: upd.releaseUrl,
              target: '_blank',
              rel: 'noopener noreferrer',
              text: verLabel,
            })
          : verLabel,
      ]);
      els.kvList.appendChild(verDd);
    } else {
      els.kvList.appendChild(h('dd', { text: 'v' + VERSION }));
    }
    els.refreshBtn.textContent = tr('btnRefresh');
    els.resetSkinBtn.textContent = tr('btnResetSkin');
    if (!store.skinEnabled) {
      els.restoreBtn.setAttribute('data-armed', 'false');
      els.restoreBtn.textContent = tr('btnReapply');
    } else if (!restoreArmed) {
      els.restoreBtn.setAttribute('data-armed', 'false');
      els.restoreBtn.textContent = tr('btnRestore');
    }

    els.footTitle.textContent = store.skinEnabled ? activeName : tr('st_skinOff');
  }

  function refreshLibrary() {
    return callRpc('library.list', {}).then(function (res) {
      if (res && Array.isArray(res.items)) {
        store.items = res.items;
        renderAll();
      }
    });
  }

  function refreshAllFromHost() {
    var reqToggleSeq = toggleSeq;
    callRpc('state.get', {}).then(function (res) {
      if (!res || reqToggleSeq !== toggleSeq) return;
      ingestState(extractStatePayload(res));
    });
    refreshLibrary();
  }

  // ---------------------------------------------------------------------------
  // Open / Close / Drilldown & Two-Stage Escape Unwind
  // ---------------------------------------------------------------------------
  function openDrilldown() {
    ui.drilldown = true;
    renderAll();
    return status();
  }

  function closeDrilldown() {
    ui.drilldown = false;
    renderAll();
    return status();
  }

  function open() {
    if (destroyed) return status();
    if (!mounted) {
      ui.open = true;
      return status();
    }
    if (!ui.open) {
      var ae = doc.activeElement;
      lastFocus = ae && els.root && !els.root.contains(ae) ? ae : null;
    }
    ui.open = true;
    els.root.setAttribute('data-open', 'true');
    els.root.setAttribute('data-browser-occluder', 'true');
    if (els.sheet) els.sheet.setAttribute('data-browser-occluder', 'true');
    els.orb.setAttribute('aria-expanded', 'true');
    syncHostTheme();
    positionTriggersAndSheet();
    syncHousekeepTimer();
    refreshAllFromHost();
    renderAll();
    try {
      els.sheet.focus({ preventScroll: true });
    } catch (_) {}
    return status();
  }

  function close() {
    if (!mounted) {
      ui.open = false;
      return status();
    }
    disarmRestore();
    clearThumbObserverTargets();
    lastGridSig = '';
    stopHousekeepTimer();
    ui.drilldown = false;
    ui.open = false;
    els.root.setAttribute('data-open', 'false');
    els.root.removeAttribute('data-browser-occluder');
    if (els.sheet) els.sheet.removeAttribute('data-browser-occluder');
    els.orb.setAttribute('aria-expanded', 'false');
    if (lastFocus && lastFocus.isConnected && typeof lastFocus.focus === 'function') {
      try {
        lastFocus.focus({ preventScroll: true });
      } catch (_) {}
    }
    lastFocus = null;
    renderAll();
    return status();
  }

  function toggle() {
    return ui.open ? close() : open();
  }

  function handleWindowKeyDown(e) {
    if (destroyed || !e) return;
    var key = String(e.key || '');
    // Global Ctrl+Alt+W / Cmd+Alt+W shortcut across page, inputs, and terminal
    if ((e.ctrlKey || e.metaKey) && e.altKey && !e.shiftKey && key.toLowerCase() === 'w') {
      e.preventDefault();
      e.stopPropagation();
      toggle();
      return;
    }

    if (key === 'Escape' && ui.open) {
      // Yield if a host modal dialog or context menu is open above our popover
      var inside = els.root && els.root.contains(e.target);
      if (!inside && doc.querySelector('[role="dialog"][aria-modal="true"]:not(.prism-sheet), [role="menu"], .quick-input-widget:not([style*="display: none"])')) {
        return;
      }
      // Stage 1 of Two-Stage Escape Unwind: close inner drilldown or disarm inline confirmation first!
      if (ui.drilldown) {
        e.preventDefault();
        e.stopPropagation();
        closeDrilldown();
        return;
      }
      if (restoreArmed) {
        e.preventDefault();
        e.stopPropagation();
        disarmRestore();
        return;
      }
      if (ui.query && doc.activeElement === els.searchInp) {
        e.preventDefault();
        e.stopPropagation();
        ui.query = '';
        ui.pageLimit = PAGE_SIZE;
        els.searchInp.value = '';
        if (els.body) els.body.scrollTop = 0;
        renderLibraryGrid();
        return;
      }
      // Stage 2: close parent Quick Prism Popover
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  }

  // ---------------------------------------------------------------------------
  // Mount, Self-Heal & Teardown
  // ---------------------------------------------------------------------------
  function stopHousekeepTimer() {
    if (housekeepTimer) {
      clearInterval(housekeepTimer);
      housekeepTimer = 0;
    }
  }

  function syncHousekeepTimer() {
    if (destroyed || !mounted || !ui.open) {
      stopHousekeepTimer();
      return;
    }
    var mode = String(cfgVal('triggerMode') || 'both');
    var wantPill = mode === 'pill' || mode === 'both';
    if (!wantPill) {
      stopHousekeepTimer();
      return;
    }
    if (!housekeepTimer) {
      housekeepTimer = setInterval(function () {
        if (destroyed || !ui.open) {
          stopHousekeepTimer();
          return;
        }
        var curMode = String(cfgVal('triggerMode') || 'both');
        var curWantPill = curMode === 'pill' || curMode === 'both';
        if (!curWantPill) {
          stopHousekeepTimer();
          return;
        }
        if (!els.root.isConnected || !doc.getElementById(STYLE_ID) || !doc.getElementById(PILL_ID)) {
          heal();
        }
      }, 8000);
    }
  }

  function ensureStyles() {
    var s = doc.getElementById(STYLE_ID);
    if (!s) {
      s = doc.createElement('style');
      s.id = STYLE_ID;
      s.textContent = PANEL_CSS;
      (doc.head || doc.documentElement).appendChild(s);
    }
  }

  function heal() {
    if (destroyed || !doc.body) return status();
    ensureStyles();
    if (els.root && !els.root.isConnected) doc.body.appendChild(els.root);
    syncHostTheme();
    positionTriggersAndSheet();
    return status();
  }

  function mount() {
    if (mounted || destroyed || !doc.body) return;
    clearLazyKeepAlive();
    ensureStyles();
    buildDom();
    doc.body.appendChild(els.root);
    doc.documentElement.setAttribute(HTML_ATTR, VERSION);
    mounted = true;

    syncHostTheme();
    positionTriggersAndSheet();
    renderAll();

    listen(W, 'keydown', handleWindowKeyDown, true);
    listen(W, 'resize', positionTriggersAndSheet);

    if (W.MutationObserver) {
      domObserver = new MutationObserver(function () {
        if (destroyed) return;
        if (!els.root.isConnected || !doc.getElementById(STYLE_ID)) heal();
      });
      try {
        domObserver.observe(doc.body, { childList: true });
      } catch (_) {}

      themeObserver = new MutationObserver(function () {
        if (destroyed) return;
        var prevTheme = store.theme;
        syncHostTheme();
        if (ui.open && store.theme !== prevTheme) renderAll();
      });
      try {
        themeObserver.observe(doc.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'data-prism-theme'] });
        themeObserver.observe(doc.body, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] });
      } catch (_) {}
    }

    syncHousekeepTimer();

    if (W.__AGY_PRISM_PANEL_BOOT__) {
      ingestState(W.__AGY_PRISM_PANEL_BOOT__);
    } else if (hasBinding()) {
      refreshAllFromHost();
    }

    if (ui.open) {
      ui.open = false;
      open();
    }
  }

  function snapshot() {
    return { ui: ui, store: store };
  }

  function status() {
    var upd = store.updateStatus;
    var hasUpd = Boolean(upd && upd.updateAvailable);
    return {
      installed: !destroyed,
      version: VERSION,
      mounted: mounted,
      open: ui.open,
      drilldown: ui.drilldown,
      restoreArmed: restoreArmed,
      skinEnabled: Boolean(store.skinEnabled),
      stateRev: store.lastAppliedRev,
      tab: ui.tab,
      theme: store.theme,
      connected: hasBinding() || store.connected,
      pillPresent: Boolean(doc.getElementById(PILL_ID)),
      hasUpdate: hasUpd,
      updateAvailable: hasUpd,
    };
  }

  function destroy() {
    if (destroyed) return { installed: false };
    destroyed = true;
    clearLazyKeepAlive();
    clearThumbBlobCache();
    thumbIo = null;
    clearTimeout(restoreTimer);
    clearTimeout(patchTimer);
    clearTimeout(searchTimer);
    clearTimeout(toastTimer);
    stopHousekeepTimer();
    try {
      if (domObserver) domObserver.disconnect();
      if (themeObserver) themeObserver.disconnect();
    } catch (_) {}
    cleanups.forEach(function (fn) {
      try {
        fn();
      } catch (_) {}
    });
    cleanups = [];

    var r = doc.getElementById(ROOT_ID);
    if (r && r.parentNode) r.parentNode.removeChild(r);
    var s = doc.getElementById(STYLE_ID);
    if (s && s.parentNode) s.parentNode.removeChild(s);
    var pill = doc.getElementById(PILL_ID);
    if (pill && pill.parentNode) pill.parentNode.removeChild(pill);
    var ps = doc.getElementById(PILL_STYLE_ID);
    if (ps && ps.parentNode) ps.parentNode.removeChild(ps);
    if (doc.documentElement) doc.documentElement.removeAttribute(HTML_ATTR);

    if (W[API_KEY] === api) {
      try {
        delete W[API_KEY];
      } catch (_) {
        W[API_KEY] = undefined;
      }
    }
    mounted = false;
    return { installed: false };
  }

  var api = {
    version: VERSION,
    syncState: syncState,
    receive: receive,
    toggle: toggle,
    open: open,
    close: close,
    openDrilldown: openDrilldown,
    closeDrilldown: closeDrilldown,
    heal: heal,
    snapshot: snapshot,
    status: status,
    destroy: destroy,
    alive: function () {
      return !destroyed;
    },
  };

  W[API_KEY] = api;

  if (doc.body) {
    mount();
  } else {
    doc.addEventListener('DOMContentLoaded', mount, { once: true });
  }

  return status();
})();
