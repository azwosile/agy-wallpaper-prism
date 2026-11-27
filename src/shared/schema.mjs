// Canonical shared schema, presets, color schemes, and sanitizers for agy-wallpaper-prism.
// Shared across src/engine, src/host, src/studio-ui, sidecars/prism_studio, and test/verify-all.

export const PLUGIN_ID = 'agy-wallpaper-prism';
export const PLUGIN_DISPLAY_NAME = 'Wallpaper Prism';
export const PLUGIN_VERSION = '2.4.0';
export const SIDECAR_ID = 'prism_studio';
export const SIDECAR_URI = 'sidecar://agy-wallpaper-prism/prism_studio/';
export const CUSTOMIZATION_URI = 'customization://agy-wallpaper-prism';
export const DEFAULT_DEBUG_PORT = 9339;

export const PRISM_DOM = Object.freeze({
  skinVersion: '2.4.0',
  skinAttr: 'data-agy-prism-skin',
  glassAttr: 'data-agy-prism-glass',
  wallpaperAttr: 'data-agy-prism-wallpaper',
  wcoAttr: 'data-agy-prism-wco',
  wcoActiveAttr: 'data-agy-prism-wco-active',
  welcomeLogoAttr: 'data-prism-welcome-logo',
  topbarStyleAttr: 'data-prism-topbar-style',
  sidebarStyleAttr: 'data-prism-sidebar-style',
  topbarPillsId: 'agy-prism-topbar-pills',
  staticStyleId: 'agy-prism-static-css',
  themeAttr: 'data-prism-theme',
  schemeAttr: 'data-prism-scheme',
  accentModeAttr: 'data-prism-accent-mode',
  layoutAttr: 'data-prism-layout',
  cornersAttr: 'data-prism-corners',
  bordersAttr: 'data-prism-borders',
  shadowsAttr: 'data-prism-shadows',
  kindAttr: 'data-prism-kind',
  styleId: 'agy-prism-css',
  stageId: 'agy-prism-stage',
  popoverId: 'agy-prism-popover',
  popoverStyleId: 'agy-prism-popover-css',
  pillId: 'agy-prism-pill',
  cornerOrbClass: 'prism-corner-orb',
  bindingName: '__agyPrismCall',
  skinGlobal: '__agyPrism',
  panelGlobal: '__agyPrismPanel',
  inspectorGlobal: '__agyPrismInspector',
});

export const STARTUP_MODES = Object.freeze(['gentle-auto', 'manual', 'static-css']);
export const CANARY_STATES = Object.freeze(['idle', 'arming', 'healthy', 'tripped']);
export const WALLPAPER_KINDS = Object.freeze(['image', 'video', 'slideshow', 'web', 'scene', 'none']);
export const LIBRARY_KINDS = Object.freeze(['image', 'video', 'slideshow', 'web', 'scene']);
export const CONTENT_RATINGS = Object.freeze(['everyone', 'pg13', 'mature', 'unrated']);
export const LAYOUT_MODES = Object.freeze(['islands', 'flush']);
export const TOPBAR_STYLES = Object.freeze(['pills', 'bar']);
export const CORNER_STYLES = Object.freeze(['sharp', 'balanced', 'soft']);
export const BORDER_MODES = Object.freeze(['on', 'subtle', 'off']);
export const THEME_MODES = Object.freeze(['auto', 'dark', 'light']);
export const CODE_READABILITY_MODES = Object.freeze(['translucent', 'frosted', 'solid']);
export const FIT_MODES = Object.freeze(['cover', 'contain', 'center', 'fill']);
export const FILTER_PRESETS = Object.freeze(['none', 'vivid', 'warm', 'cool', 'grayscale', 'sepia', 'contrast', 'darken', 'brighten']);
export const SWITCH_TRANSITIONS = Object.freeze(['cut', 'fade', 'push', 'wipe', 'iris', 'zoom', 'bars']);
export const SWITCH_DIRECTIONS = Object.freeze(['left', 'right', 'up', 'down']);
export const SWITCH_SPEEDS = Object.freeze(['fast', 'normal', 'slow']);
export const ROTATION_ORDERS = Object.freeze(['sequence', 'random']);
export const ROTATION_TRIGGERS = Object.freeze(['interval', 'videoEnd']);
export const TRIGGER_MODES = Object.freeze(['pill', 'corner', 'both', 'shortcut-only']);
export const LANGUAGES = Object.freeze(['auto', 'zh', 'en']);
export const SIDEBAR_RADII = Object.freeze(['auto', 'native', '0', '6', '12', '16', '20']);
export const SIDEBAR_RADIUS_RANGE = Object.freeze({ min: 0, max: 28 });
export const BORDER_STYLES = Object.freeze(['full', 'bottom', 'none']);
export const SIDEBAR_LIST_STYLES = Object.freeze(['capsule', 'underline', 'accordion', 'tree']);
export const SIDEBAR_TYPOGRAPHY_MODES = Object.freeze(['balanced', 'native']);
export const LIBRARY_ANIMATED_THUMB_MODES = Object.freeze(['off', 'hover', 'always']);

export const CJK_SAFE_FONT_PRESETS = Object.freeze([
  Object.freeze({ id: 'system', value: '', labelKey: 'region.font.followSystem' }),
  Object.freeze({ id: 'yahei', value: "'Microsoft YaHei UI', 'Microsoft YaHei', sans-serif", labelKey: 'region.font.yahei' }),
  Object.freeze({ id: 'pingfang', value: "'PingFang SC', 'Hiragino Sans GB', sans-serif", labelKey: 'region.font.pingfang' }),
  Object.freeze({ id: 'noto-sans', value: "'Noto Sans SC', 'Source Han Sans SC', sans-serif", labelKey: 'region.font.notoSans' }),
  Object.freeze({ id: 'segoe', value: "'Segoe UI', system-ui, sans-serif", labelKey: 'region.font.segoe' }),
  Object.freeze({ id: 'inter', value: "Inter, 'Segoe UI', sans-serif", labelKey: 'region.font.inter' }),
  Object.freeze({ id: 'jetbrains', value: "'JetBrains Mono', monospace", labelKey: 'region.font.jetbrains' }),
  Object.freeze({ id: 'cascadia', value: "'Cascadia Code', monospace", labelKey: 'region.font.cascadia' }),
]);

/** 8 Paired Light/Dark Color Schemes (Obsidian Prism + Theme Classics). */
export const COLOR_SCHEMES = Object.freeze({
  'prism-default': Object.freeze({
    id: 'prism-default',
    nameZh: '深空黑曜 / 白昼冷晶',
    nameEn: 'Prism Default',
    swatchDark: '#0E0E11',
    swatchLight: '#F4F7FB',
    swatchAccent: '#669DF6',
    dark: Object.freeze({
      ptRgb: '255, 255, 255',
      shadeRgb: '9, 9, 11',
      baseRgb: '14, 14, 17',
      tint1Rgb: '20, 20, 24',
      tint2Rgb: '28, 28, 34',
      popoverRgb: '22, 22, 28',
      fg: '#F2F2F5',
      fg2: '#C4C4CE',
      fgMuted: '#8A8A98',
      fgFaint: '#626270',
      accent: '#669DF6',
      accentRgb: '102, 157, 246',
      link: '#8AB4F8',
    }),
    light: Object.freeze({
      ptRgb: '15, 23, 42',
      shadeRgb: '232, 238, 246',
      baseRgb: '244, 247, 251',
      tint1Rgb: '255, 255, 255',
      tint2Rgb: '233, 239, 248',
      popoverRgb: '252, 253, 255',
      fg: '#0F172A',
      fg2: '#334155',
      fgMuted: '#5B6B82',
      fgFaint: '#7C8CA5',
      accent: '#2563EB',
      accentRgb: '37, 99, 235',
      link: '#1D4ED8',
    }),
  }),
  'warm-carbon': Object.freeze({
    id: 'warm-carbon',
    nameZh: '暖炭玄岩 / 暖白画册',
    nameEn: 'Warm Carbon',
    swatchDark: '#141413',
    swatchLight: '#F6F4EE',
    swatchAccent: '#D97757',
    dark: Object.freeze({
      ptRgb: '255, 250, 240',
      shadeRgb: '16, 16, 15',
      baseRgb: '20, 20, 19',
      tint1Rgb: '27, 26, 24',
      tint2Rgb: '36, 34, 31',
      popoverRgb: '24, 23, 21',
      fg: '#F2EFE9',
      fg2: '#D0C9BE',
      fgMuted: '#A39E93',
      fgFaint: '#726D63',
      accent: '#D97757',
      accentRgb: '217, 119, 87',
      link: '#E59377',
    }),
    light: Object.freeze({
      ptRgb: '28, 24, 20',
      shadeRgb: '235, 230, 220',
      baseRgb: '246, 244, 238',
      tint1Rgb: '255, 253, 249',
      tint2Rgb: '239, 234, 224',
      popoverRgb: '254, 252, 247',
      fg: '#1C1814',
      fg2: '#3F3931',
      fgMuted: '#6B6257',
      fgFaint: '#8E8478',
      accent: '#C25934',
      accentRgb: '194, 89, 52',
      link: '#B54D28',
    }),
  }),
  catppuccin: Object.freeze({
    id: 'catppuccin',
    nameZh: '猫布奇诺 (Mocha / Latte)',
    nameEn: 'Catppuccin',
    swatchDark: '#1E1E2E',
    swatchLight: '#EFF1F5',
    swatchAccent: '#CBA6F7',
    dark: Object.freeze({
      ptRgb: '205, 214, 244',
      shadeRgb: '24, 24, 37',
      baseRgb: '30, 30, 46',
      tint1Rgb: '49, 50, 68',
      tint2Rgb: '69, 71, 90',
      popoverRgb: '36, 39, 58',
      fg: '#CDD6F4',
      fg2: '#BAC2DE',
      fgMuted: '#9399B2',
      fgFaint: '#6C7086',
      accent: '#CBA6F7',
      accentRgb: '203, 166, 247',
      link: '#89B4FA',
    }),
    light: Object.freeze({
      ptRgb: '76, 79, 105',
      shadeRgb: '230, 233, 239',
      baseRgb: '239, 241, 245',
      tint1Rgb: '252, 253, 255',
      tint2Rgb: '220, 224, 232',
      popoverRgb: '250, 251, 254',
      fg: '#4C4F69',
      fg2: '#5C5F77',
      fgMuted: '#6C6F85',
      fgFaint: '#8C8FA1',
      accent: '#8839EF',
      accentRgb: '136, 57, 239',
      link: '#1E66F5',
    }),
  }),
  nord: Object.freeze({
    id: 'nord',
    nameZh: '极地冰川 (Night / Snow)',
    nameEn: 'Nord',
    swatchDark: '#2E3440',
    swatchLight: '#ECEFF4',
    swatchAccent: '#88C0D0',
    dark: Object.freeze({
      ptRgb: '236, 239, 244',
      shadeRgb: '36, 41, 51',
      baseRgb: '46, 52, 64',
      tint1Rgb: '59, 66, 82',
      tint2Rgb: '67, 76, 94',
      popoverRgb: '52, 58, 72',
      fg: '#ECEFF4',
      fg2: '#D8DEE9',
      fgMuted: '#9AA5B8',
      fgFaint: '#727E94',
      accent: '#88C0D0',
      accentRgb: '136, 192, 208',
      link: '#81A1C1',
    }),
    light: Object.freeze({
      ptRgb: '46, 52, 64',
      shadeRgb: '229, 233, 240',
      baseRgb: '236, 239, 244',
      tint1Rgb: '248, 250, 252',
      tint2Rgb: '216, 222, 233',
      popoverRgb: '250, 252, 255',
      fg: '#2E3440',
      fg2: '#3B4252',
      fgMuted: '#5E6B80',
      fgFaint: '#7B889E',
      accent: '#5E81AC',
      accentRgb: '94, 129, 172',
      link: '#4C6E99',
    }),
  }),
  'rose-pine': Object.freeze({
    id: 'rose-pine',
    nameZh: '松间玫瑰 (Main / Dawn)',
    nameEn: 'Rosé Pine',
    swatchDark: '#1F1D2E',
    swatchLight: '#FAF4ED',
    swatchAccent: '#C4A7E7',
    dark: Object.freeze({
      ptRgb: '224, 222, 244',
      shadeRgb: '25, 23, 36',
      baseRgb: '31, 29, 46',
      tint1Rgb: '38, 35, 58',
      tint2Rgb: '52, 48, 76',
      popoverRgb: '34, 31, 52',
      fg: '#E0DEF4',
      fg2: '#C4C0DF',
      fgMuted: '#908CAA',
      fgFaint: '#6E6A86',
      accent: '#C4A7E7',
      accentRgb: '196, 167, 231',
      link: '#EBBCBA',
    }),
    light: Object.freeze({
      ptRgb: '87, 82, 121',
      shadeRgb: '242, 233, 225',
      baseRgb: '250, 244, 237',
      tint1Rgb: '255, 250, 243',
      tint2Rgb: '240, 229, 219',
      popoverRgb: '255, 251, 246',
      fg: '#575279',
      fg2: '#68638A',
      fgMuted: '#797593',
      fgFaint: '#9893A5',
      accent: '#907AA9',
      accentRgb: '144, 122, 169',
      link: '#D7827E',
    }),
  }),
  'tokyo-night': Object.freeze({
    id: 'tokyo-night',
    nameZh: '东京夜色 (Night / Day)',
    nameEn: 'Tokyo Night',
    swatchDark: '#1A1B26',
    swatchLight: '#E1E2E7',
    swatchAccent: '#7AA2F7',
    dark: Object.freeze({
      ptRgb: '192, 202, 245',
      shadeRgb: '22, 22, 30',
      baseRgb: '26, 27, 38',
      tint1Rgb: '36, 40, 59',
      tint2Rgb: '47, 53, 77',
      popoverRgb: '31, 35, 53',
      fg: '#C0CAF5',
      fg2: '#A9B1D6',
      fgMuted: '#787C99',
      fgFaint: '#565F89',
      accent: '#7AA2F7',
      accentRgb: '122, 162, 247',
      link: '#7DCFFF',
    }),
    light: Object.freeze({
      ptRgb: '55, 96, 191',
      shadeRgb: '213, 214, 219',
      baseRgb: '225, 226, 231',
      tint1Rgb: '242, 243, 247',
      tint2Rgb: '208, 211, 222',
      popoverRgb: '246, 247, 251',
      fg: '#3760BF',
      fg2: '#475E9E',
      fgMuted: '#6172B0',
      fgFaint: '#848CB5',
      accent: '#2E7DE9',
      accentRgb: '46, 125, 233',
      link: '#007197',
    }),
  }),
  gruvbox: Object.freeze({
    id: 'gruvbox',
    nameZh: '复古暖砂 (Dark / Light)',
    nameEn: 'Gruvbox',
    swatchDark: '#282828',
    swatchLight: '#FBF1C7',
    swatchAccent: '#FABD2F',
    dark: Object.freeze({
      ptRgb: '235, 219, 178',
      shadeRgb: '29, 32, 33',
      baseRgb: '40, 40, 40',
      tint1Rgb: '60, 56, 54',
      tint2Rgb: '80, 73, 69',
      popoverRgb: '50, 48, 47',
      fg: '#EBDBB2',
      fg2: '#D5C4A1',
      fgMuted: '#A89984',
      fgFaint: '#7C6F64',
      accent: '#FABD2F',
      accentRgb: '250, 189, 47',
      link: '#83A598',
    }),
    light: Object.freeze({
      ptRgb: '60, 56, 54',
      shadeRgb: '235, 219, 178',
      baseRgb: '251, 241, 199',
      tint1Rgb: '249, 245, 215',
      tint2Rgb: '235, 219, 178',
      popoverRgb: '252, 248, 224',
      fg: '#3C3836',
      fg2: '#504945',
      fgMuted: '#7C6F64',
      fgFaint: '#928374',
      accent: '#B57614',
      accentRgb: '181, 118, 20',
      link: '#076678',
    }),
  }),
  'host-native': Object.freeze({
    id: 'host-native',
    nameZh: '跟随宿主原生',
    nameEn: 'Antigravity Native',
    swatchDark: '#070708',
    swatchLight: '#F7F7F8',
    swatchAccent: '#2F71E3',
    dark: Object.freeze({
      ptRgb: '255, 255, 255',
      shadeRgb: '17, 17, 20',
      baseRgb: '7, 7, 8',
      tint1Rgb: '19, 19, 23',
      tint2Rgb: '28, 28, 34',
      popoverRgb: '19, 19, 25',
      fg: '#FFFFFF',
      fg2: '#D4D4DC',
      fgMuted: '#8E929B',
      fgFaint: '#646872',
      accent: '#2F71E3',
      accentRgb: '47, 113, 227',
      link: '#6A9FCB',
    }),
    light: Object.freeze({
      ptRgb: '15, 23, 42',
      shadeRgb: '238, 238, 241',
      baseRgb: '247, 247, 248',
      tint1Rgb: '255, 255, 255',
      tint2Rgb: '234, 236, 240',
      popoverRgb: '255, 255, 255',
      fg: '#111827',
      fg2: '#374151',
      fgMuted: '#6B7280',
      fgFaint: '#9CA3AF',
      accent: '#0066CC',
      accentRgb: '0, 102, 204',
      link: '#0055AA',
    }),
  }),
});

export const COLOR_SCHEME_IDS = Object.freeze(Object.keys(COLOR_SCHEMES));

export const ACCENT_MODES = Object.freeze([
  'dynamic',
  'palette',
  'cobalt',
  'iris',
  'amber',
  'emerald',
  'rose',
  'mono',
  'custom',
]);

export const ACCENT_PRESETS = Object.freeze({
  cobalt: Object.freeze({ dark: '#669DF6', darkFg: '#FFFFFF', light: '#2563EB', lightFg: '#FFFFFF' }),
  iris: Object.freeze({ dark: '#A58AF8', darkFg: '#FFFFFF', light: '#7C3AED', lightFg: '#FFFFFF' }),
  amber: Object.freeze({ dark: '#F2B84B', darkFg: '#14120E', light: '#D97706', lightFg: '#FFFFFF' }),
  emerald: Object.freeze({ dark: '#50A37B', darkFg: '#FFFFFF', light: '#059669', lightFg: '#FFFFFF' }),
  rose: Object.freeze({ dark: '#F472B6', darkFg: '#14120E', light: '#DB2777', lightFg: '#FFFFFF' }),
  mono: Object.freeze({ dark: '#D4D7E0', darkFg: '#0E0F14', light: '#334155', lightFg: '#FFFFFF' }),
});

/** 12 Independent Glass & Appearance Region IDs (v2.4.0 expanded unified regions schema). */
export const REGION_IDS = Object.freeze([
  'topbar',
  'wco',
  'sidebar',
  'workspace',
  'card',
  'userBubble',
  'assistantBubble',
  'codeBlock',
  'controls',
  'composer',
  'rightPane',
  'popover',
]);

export const SURFACE_TINT_COMPONENTS = REGION_IDS;
export const GLASS_COMPONENT_IDS = REGION_IDS;
export const SKIN_REGION_KEYS = REGION_IDS;

export const GLASS_STYLES = Object.freeze([
  'none',
  'frosted',
  'crystal',
  'tinted',
  'solid',
]);

export const ZERO_BLUR_BY_DEFAULT_REGIONS = Object.freeze([
  'card',
  'userBubble',
  'assistantBubble',
  'codeBlock',
  'controls',
]);

const ZERO_BLUR_DEFAULT_SET = new Set(ZERO_BLUR_BY_DEFAULT_REGIONS);

export function getValidRegionIdSet() {
  return new Set(REGION_IDS);
}

export const SURFACE_TINT_BOUNDS = Object.freeze({
  topbar: Object.freeze({ minOpacity: 0, maxOpacity: 0.98 }),
  wco: Object.freeze({ minOpacity: 0, maxOpacity: 0.98 }),
  sidebar: Object.freeze({ minOpacity: 0, maxOpacity: 0.98 }),
  workspace: Object.freeze({ minOpacity: 0, maxOpacity: 0.98 }),
  card: Object.freeze({ minOpacity: 0, maxOpacity: 0.98 }),
  userBubble: Object.freeze({ minOpacity: 0, maxOpacity: 0.98 }),
  assistantBubble: Object.freeze({ minOpacity: 0, maxOpacity: 0.98 }),
  codeBlock: Object.freeze({ minOpacity: 0, maxOpacity: 0.98 }),
  controls: Object.freeze({ minOpacity: 0, maxOpacity: 0.98 }),
  composer: Object.freeze({ minOpacity: 0, maxOpacity: 0.98 }),
  rightPane: Object.freeze({ minOpacity: 0, maxOpacity: 0.98 }),
  popover: Object.freeze({ minOpacity: 0.5, maxOpacity: 0.99 }),
});

export const REGION_FONT_SIZE_BOUNDS = Object.freeze({
  topbar: Object.freeze({ min: 10, max: 24 }),
  wco: Object.freeze({ min: 10, max: 24 }),
  sidebar: Object.freeze({ min: 11, max: 15 }),
  workspace: Object.freeze({ min: 10, max: 24 }),
  card: Object.freeze({ min: 10, max: 24 }),
  userBubble: Object.freeze({ min: 10, max: 24 }),
  assistantBubble: Object.freeze({ min: 10, max: 24 }),
  codeBlock: Object.freeze({ min: 10, max: 24 }),
  controls: Object.freeze({ min: 10, max: 24 }),
  composer: Object.freeze({ min: 10, max: 24 }),
  rightPane: Object.freeze({ min: 10, max: 24 }),
  popover: Object.freeze({ min: 10, max: 24 }),
});

export const REGION_FIELD_BOUNDS = Object.freeze({
  blur: Object.freeze({ min: 0, max: 64, decimals: 0 }),
  saturation: Object.freeze({ min: 50, max: 220, decimals: 0 }),
  tone: Object.freeze({ min: -100, max: 100, decimals: 0 }),
  borderOpacity: Object.freeze({ min: 0, max: 1, decimals: 3 }),
  elevation: Object.freeze({ min: 0, max: 2, decimals: 2 }),
  radius: Object.freeze({ min: 0, max: 28, decimals: 0 }),
  opacityByRegion: SURFACE_TINT_BOUNDS,
  fontSizeByRegion: REGION_FONT_SIZE_BOUNDS,
});

/** Optical keys reset by SCENE_PRESETS (`surfaceTints: null`); structural keys are preserved. */
export const REGION_OPTICAL_KEYS = Object.freeze([
  'style',
  'glassEnabled',
  'blur',
  'saturation',
  'opacity',
  'tone',
  'tint',
  'borderOpacity',
  'elevation',
]);

export const REGION_STRUCTURAL_KEYS = Object.freeze([
  'borderStyle',
  'radius',
  'fontSize',
  'fontFamily',
  'fontColor',
  'allowRawFontColor',
]);

export const SIDEBAR_REGION_EXTRA_KEYS = Object.freeze([
  'listStyle',
  'sectionFontSize',
  'projectFontSize',
  'itemFontSize',
]);

export const DEFAULT_REGION_ENTRY = Object.freeze({
  style: null,              // null (auto) | 'none' | 'frosted' | 'crystal' | 'tinted' | 'solid'
  glassEnabled: null,       // boolean | null (null = follow global glassSurfaces)
  blur: null,               // int 0..64 (px) | null
  saturation: null,         // int 50..220 (%) | null
  opacity: null,            // float 0..0.98 (popover: 0.50..0.99) | null
  tone: 0,                  // int -100..+100
  tint: '',                 // '#RRGGBB' | ''
  borderOpacity: null,      // float 0..1 | null (null = auto-fade via computeBorderFactor #4)
  elevation: null,          // float 0..2 | null
  borderStyle: null,        // 'full' | 'bottom' | 'none' | null
  radius: null,             // int 0..28 (px) | null
  fontSize: null,           // int 10..24 (sidebar clamped 11..15) | null
  fontFamily: '',           // sanitized CSS font-family stack (<= 120 chars, <= 6 families) | ''
  fontColor: '',            // '#RRGGBB' | '' (passes through D7 enforceFgContrastRgb)
  allowRawFontColor: false, // boolean (D7: false = WCAG AA opposite-anchor guardrail; true = raw)
});

export const DEFAULT_SIDEBAR_REGION_ENTRY = Object.freeze({
  ...DEFAULT_REGION_ENTRY,
  listStyle: 'capsule',     // D5: 'capsule' | 'underline' | 'accordion' | 'tree'
  sectionFontSize: null,    // float 11..15 (1 decimal) | null
  projectFontSize: null,    // float 11..15 (1 decimal) | null
  itemFontSize: null,       // float 11..15 (1 decimal) | null
});

export const DEFAULT_REGIONS = Object.freeze({
  topbar: DEFAULT_REGION_ENTRY,
  wco: DEFAULT_REGION_ENTRY,
  sidebar: DEFAULT_SIDEBAR_REGION_ENTRY,
  workspace: DEFAULT_REGION_ENTRY,
  card: DEFAULT_REGION_ENTRY,
  userBubble: DEFAULT_REGION_ENTRY,
  assistantBubble: DEFAULT_REGION_ENTRY,
  codeBlock: DEFAULT_REGION_ENTRY,
  controls: DEFAULT_REGION_ENTRY,
  composer: DEFAULT_REGION_ENTRY,
  rightPane: DEFAULT_REGION_ENTRY,
  popover: DEFAULT_REGION_ENTRY,
});

export const DEFAULT_SURFACE_TINT_ENTRY = Object.freeze({
  style: null,
  opacity: null,
  tone: 0,
  tint: '',
  blur: null,
  saturation: null,
  glassEnabled: null,
  borderOpacity: null,
  elevation: null,
});

export const DEFAULT_SURFACE_TINTS = Object.freeze({
  topbar: DEFAULT_SURFACE_TINT_ENTRY,
  wco: DEFAULT_SURFACE_TINT_ENTRY,
  sidebar: DEFAULT_SURFACE_TINT_ENTRY,
  workspace: DEFAULT_SURFACE_TINT_ENTRY,
  card: DEFAULT_SURFACE_TINT_ENTRY,
  userBubble: DEFAULT_SURFACE_TINT_ENTRY,
  assistantBubble: DEFAULT_SURFACE_TINT_ENTRY,
  codeBlock: DEFAULT_SURFACE_TINT_ENTRY,
  controls: DEFAULT_SURFACE_TINT_ENTRY,
  composer: DEFAULT_SURFACE_TINT_ENTRY,
  rightPane: DEFAULT_SURFACE_TINT_ENTRY,
  popover: DEFAULT_SURFACE_TINT_ENTRY,
});

export function createDefaultRegionEntry(id = '') {
  if (id === 'sidebar') {
    return { ...DEFAULT_SIDEBAR_REGION_ENTRY };
  }
  return { ...DEFAULT_REGION_ENTRY };
}

export function createDefaultRegions() {
  const out = {};
  for (const id of REGION_IDS) {
    out[id] = createDefaultRegionEntry(id);
  }
  return out;
}

export function createDefaultSurfaceTints() {
  const out = {};
  for (const id of SURFACE_TINT_COMPONENTS) {
    out[id] = { ...DEFAULT_SURFACE_TINT_ENTRY };
  }
  return out;
}

/** 5 Quick Optical Scene Presets (Crisp | Crystal | Islands | Focus | Eco — strictly optical-only, zero layout keys). */
export const SCENE_PRESETS = Object.freeze({
  crisp: Object.freeze({
    id: 'crisp',
    nameZh: '清透无雾',
    nameEn: 'Crisp Glass',
    patch: Object.freeze({
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
    }),
  }),
  crystal: Object.freeze({
    id: 'crystal',
    nameZh: '通透流光',
    nameEn: 'Crystal',
    patch: Object.freeze({
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
    }),
  }),
  islands: Object.freeze({
    id: 'islands',
    nameZh: '浮岛画境',
    nameEn: 'Islands',
    patch: Object.freeze({
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
    }),
  }),
  focus: Object.freeze({
    id: 'focus',
    nameZh: '沉静柔焦',
    nameEn: 'Focus',
    patch: Object.freeze({
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
    }),
  }),
  eco: Object.freeze({
    id: 'eco',
    nameZh: '极简省电',
    nameEn: 'Eco',
    patch: Object.freeze({
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
    }),
  }),
});

export const SCENE_PRESET_IDS = Object.freeze(Object.keys(SCENE_PRESETS));

/** 7 Factory Whole-Profile Presets (DSH + Obsidian Prism Parity). */
export const FACTORY_PRESETS = Object.freeze([
  Object.freeze({
    id: 'factory-prism-islands',
    name: '棱镜浮岛',
    nameEn: 'Prism Islands',
    description: 'Obsidian Prism 标志性圆角浮岛与动态壁纸取色',
    descriptionEn: 'Signature Obsidian Prism floating islands with dynamic wallpaper accent',
    builtin: true,
    patch: Object.freeze({
      preset: 'islands',
      layoutMode: 'islands',
      islandGap: 8,
      workspacePad: 8,
      cornerStyle: 'balanced',
      colorScheme: 'prism-default',
      accentMode: 'dynamic',
      glassSurfaces: true,
      glassOpacity: 0.76,
      glassBlur: 16,
      sidebarOpacity: null,
      sidebarBlur: null,
      surfaceTints: null,
      glassFidelity: 92,
      chatGlassFidelity: 90,
      codeReadabilityMode: 'translucent',
      scrimOpacity: 0.26,
      mediaBlur: 0,
      vignette: true,
      grainAlpha: 0.022,
      paused: false,
    }),
  }),
  Object.freeze({
    id: 'factory-author',
    name: '作者自用',
    nameEn: "Author's Pick",
    description: 'Catppuccin Mocha 柔和雾面浮岛与自适应光感平衡',
    descriptionEn: 'Catppuccin Mocha frosted islands balanced for long coding sessions',
    builtin: true,
    patch: Object.freeze({
      preset: 'islands',
      layoutMode: 'islands',
      islandGap: 10,
      workspacePad: 8,
      cornerStyle: 'soft',
      colorScheme: 'catppuccin',
      accentMode: 'dynamic',
      glassSurfaces: true,
      glassOpacity: 0.74,
      glassBlur: 18,
      sidebarOpacity: null,
      sidebarBlur: null,
      surfaceTints: null,
      glassFidelity: 94,
      chatGlassFidelity: 92,
      codeReadabilityMode: 'translucent',
      scrimOpacity: 0.24,
      mediaBlur: 0,
      vignette: true,
      grainAlpha: 0.02,
      paused: false,
    }),
  }),
  Object.freeze({
    id: 'factory-default',
    name: '黑客绿 (Fish)',
    nameEn: 'Cyber Emerald',
    description: 'DSH 经典翡翠强调色与高锐度暗色毛玻璃',
    descriptionEn: 'Classic DSH cyber emerald accent over crisp dark obsidian glass',
    builtin: true,
    patch: Object.freeze({
      preset: 'crystal',
      layoutMode: 'islands',
      islandGap: 6,
      workspacePad: 6,
      cornerStyle: 'sharp',
      colorScheme: 'prism-default',
      accentMode: 'emerald',
      glassSurfaces: true,
      glassOpacity: 0.70,
      glassBlur: 14,
      sidebarOpacity: null,
      sidebarBlur: null,
      surfaceTints: null,
      glassFidelity: 88,
      chatGlassFidelity: 85,
      codeReadabilityMode: 'translucent',
      scrimOpacity: 0.22,
      mediaBlur: 0,
      vignette: true,
      grainAlpha: 0.015,
      paused: false,
    }),
  }),
  Object.freeze({
    id: 'factory-frosted',
    name: '重磨砂',
    nameEn: 'Heavy Frosted',
    description: 'Nord 极地冰川 28px 高斯磨砂亚克力质感',
    descriptionEn: 'Deep 28px Nord frosted acrylic veil taming busy motion wallpapers',
    builtin: true,
    patch: Object.freeze({
      preset: 'custom',
      layoutMode: 'islands',
      islandGap: 8,
      workspacePad: 8,
      cornerStyle: 'balanced',
      colorScheme: 'nord',
      accentMode: 'palette',
      glassSurfaces: true,
      glassOpacity: 0.82,
      glassBlur: 28,
      sidebarOpacity: null,
      sidebarBlur: null,
      surfaceTints: null,
      glassFidelity: 96,
      chatGlassFidelity: 95,
      codeReadabilityMode: 'frosted',
      scrimOpacity: 0.30,
      mediaBlur: 4,
      vignette: true,
      grainAlpha: 0.028,
      paused: false,
    }),
  }),
  Object.freeze({
    id: 'factory-night',
    name: '暗夜釉色',
    nameEn: 'Midnight Glaze',
    description: 'Tokyo Night 深海蓝黑釉面与低眩光遮罩',
    descriptionEn: 'Tokyo Night midnight glaze with low-glare reading scrim',
    builtin: true,
    patch: Object.freeze({
      preset: 'custom',
      layoutMode: 'islands',
      islandGap: 8,
      workspacePad: 8,
      cornerStyle: 'balanced',
      colorScheme: 'tokyo-night',
      accentMode: 'cobalt',
      glassSurfaces: true,
      glassOpacity: 0.80,
      glassBlur: 20,
      sidebarOpacity: null,
      sidebarBlur: null,
      surfaceTints: null,
      glassFidelity: 95,
      chatGlassFidelity: 94,
      codeReadabilityMode: 'translucent',
      scrimOpacity: 0.34,
      mediaBlur: 0,
      vignette: true,
      grainAlpha: 0.018,
      paused: false,
    }),
  }),
  Object.freeze({
    id: 'factory-readable',
    name: '可读优先',
    nameEn: 'Readability First',
    description: '100% 原生实心代码块与高对比度护眼底色',
    descriptionEn: '100% solid code/terminal surfaces with maximum WCAG readability floor',
    builtin: true,
    patch: Object.freeze({
      preset: 'focus',
      layoutMode: 'flush',
      islandGap: 0,
      workspacePad: 0,
      cornerStyle: 'balanced',
      colorScheme: 'host-native',
      accentMode: 'palette',
      glassSurfaces: true,
      glassOpacity: 0.90,
      glassBlur: 22,
      sidebarOpacity: null,
      sidebarBlur: null,
      surfaceTints: null,
      glassFidelity: 100,
      chatGlassFidelity: 100,
      codeReadabilityMode: 'solid',
      contrastFloor: true,
      scrimOpacity: 0.44,
      mediaBlur: 6,
      vignette: true,
      grainAlpha: 0.01,
      paused: false,
    }),
  }),
  Object.freeze({
    id: 'purple-mood',
    name: '紫色心情',
    nameEn: 'Purple Mood',
    description: 'Rosé Pine 松间暮紫与柔和圆角呼吸感画框',
    descriptionEn: 'Rosé Pine twilight iris aura with soft 16px rounded islands',
    builtin: true,
    patch: Object.freeze({
      preset: 'crystal',
      layoutMode: 'islands',
      islandGap: 10,
      workspacePad: 10,
      cornerStyle: 'soft',
      colorScheme: 'rose-pine',
      accentMode: 'iris',
      glassSurfaces: true,
      glassOpacity: 0.68,
      glassBlur: 18,
      sidebarOpacity: null,
      sidebarBlur: null,
      surfaceTints: null,
      glassFidelity: 88,
      chatGlassFidelity: 84,
      codeReadabilityMode: 'translucent',
      scrimOpacity: 0.22,
      mediaBlur: 0,
      vignette: true,
      grainAlpha: 0.024,
      paused: false,
    }),
  }),
]);

/** Canonical default configuration for agy-wallpaper-prism. */
export const DEFAULT_CONFIG = Object.freeze({
  // Master state & active wallpaper
  skinEnabled: true,
  startupMode: 'gentle-auto',
  activeWallpaperId: '',
  wallpaperId: '',
  kind: 'image',
  preset: 'islands',
  activeProfilePresetId: 'factory-prism-islands',

  // Layout & Concentric Geometry
  layoutMode: 'islands',
  islandGap: 8,
  workspacePad: 8,
  cornerStyle: 'balanced',
  leftSidebarRadius: 'auto',
  rightSidebarRadius: 'auto',
  borders: 'on',
  shadows: true,
  transparentWindowControls: true,
  hideWelcomeLogo: false,
  topbarStyle: 'pills',
  sidebarListStyle: 'capsule',
  sidebarTypographyMode: 'balanced',
  sidebarFontSize: null,
  globalFontSize: null,
  globalFontFamily: '',
  globalFontColor: '',

  // Adaptive Theme, Color Scheme & Dynamic Accent
  themeMode: 'auto',
  themeFollow: false,
  colorScheme: 'prism-default',
  accentMode: 'dynamic',
  customAccent: '#669DF6',
  extractedAccent: null,
  accentCache: {},
  wallTintMix: 0.06,

  // Glass & Readability Guardrails
  glassSurfaces: true,
  glassOpacity: 0.76,
  glassBlur: 16,
  sidebarOpacity: null,
  sidebarBlur: null,
  regions: DEFAULT_REGIONS,
  surfaceTints: DEFAULT_SURFACE_TINTS,
  glassFidelity: 92,
  chatGlassFidelity: 90,
  codeReadabilityMode: 'translucent',
  contrastFloor: true,
  floaterSolidBase: true,
  caretColor: '',

  // Wallpaper Media Optics & Free Framing
  scrimOpacity: 0.26,
  scrimColor: 'auto',
  vignette: true,
  mediaOpacity: 1.0,
  mediaBlur: 0,
  mediaBrightness: 100,
  mediaContrast: 100,
  mediaSaturate: 100,
  grainAlpha: 0.022,
  filterPreset: 'none',
  fit: 'cover',
  flip: false,
  layerPosX: 50,
  layerPosY: 50,
  layerScale: 100,

  // Playback, Transitions, Audio & Power Lifecycle
  paused: false,
  muted: true,
  audioEnabled: false,
  volume: 0.5,
  playbackRate: 1.0,
  fpsCap: 0,
  pictureSlideSeconds: 0,
  sceneLive: true,
  sceneLiveFps: 30,
  sceneAutoQuality: true,
  liveBootDelay: 1.5,
  interactiveWeb: false,
  previewLiveMedia: false,
  libraryAnimatedThumbs: 'hover',
  switchTransition: 'fade',
  switchTransitionDir: 'left',
  switchTransitionSpeed: 'normal',
  pauseOnHidden: true,
  pauseOnBlur: false,
  pauseOnBattery: false,
  pauseOnFullscreen: false,
  desktopSync: false,

  // Playlists, Library Curation & Per-Wallpaper Memory
  rotationEnabled: false,
  rotationSeeded: false,
  rotationGroupId: '',
  rotationOrder: 'random',
  rotationTrigger: 'interval',
  rotationInterval: 15,
  rotationGroups: [],
  favorites: [],
  hiddenIds: [],
  typeFilter: ['image', 'video', 'slideshow', 'web', 'scene'],
  contentRatingFilter: ['everyone', 'pg13', 'unrated'],
  pickerLayout: 'fixed',
  userProps: {},
  perWallpaperOverrides: {},
  frameVariants: {},
  sceneLiveFailures: [],
  deletedFactoryPresets: [],

  // Storage, Optional Extensions & Host Ergonomics
  uploadDir: '',
  cacheDir: '',
  customFolders: [],
  fxEnabled: false,
  fxClickMode: 'ripple',
  fxTrailMode: 'dust',
  parallaxEnabled: false,
  parallaxStrength: 12,
  triggerMode: 'both',
  debugPort: DEFAULT_DEBUG_PORT,
  language: 'zh',
});

/** Keys reset by each non-destructive 3-tier reset scope (preserves library/uploads/userProps/favorites/hiddenIds). */
export const RESET_SCOPES = Object.freeze({
  skin: Object.freeze([
    'preset',
    'layoutMode',
    'islandGap',
    'workspacePad',
    'cornerStyle',
    'leftSidebarRadius',
    'rightSidebarRadius',
    'borders',
    'shadows',
    'transparentWindowControls',
    'hideWelcomeLogo',
    'topbarStyle',
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
    'regions',
    'surfaceTints',
    'glassFidelity',
    'chatGlassFidelity',
    'codeReadabilityMode',
    'contrastFloor',
    'floaterSolidBase',
    'caretColor',
  ]),
  optics: Object.freeze([
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
    'fit',
    'flip',
    'layerPosX',
    'layerPosY',
    'layerScale',
    'fxEnabled',
    'fxClickMode',
    'fxTrailMode',
    'parallaxEnabled',
    'parallaxStrength',
  ]),
  playback: Object.freeze([
    'paused',
    'muted',
    'audioEnabled',
    'volume',
    'playbackRate',
    'fpsCap',
    'pictureSlideSeconds',
    'sceneLive',
    'sceneLiveFps',
    'sceneAutoQuality',
    'startupMode',
    'liveBootDelay',
    'interactiveWeb',
    'previewLiveMedia',
    'libraryAnimatedThumbs',
    'switchTransition',
    'switchTransitionDir',
    'switchTransitionSpeed',
    'pauseOnHidden',
    'pauseOnBlur',
    'pauseOnBattery',
    'pauseOnFullscreen',
    'desktopSync',
    'rotationEnabled',
    'rotationOrder',
    'rotationTrigger',
    'rotationInterval',
  ]),
});

export const PER_WALLPAPER_OVERRIDE_KEYS = Object.freeze([
  'layoutMode',
  'colorScheme',
  'accentMode',
  'customAccent',
  'glassOpacity',
  'glassBlur',
  'sidebarOpacity',
  'sidebarBlur',
  'regions',
  'surfaceTints',
  'globalFontSize',
  'globalFontFamily',
  'globalFontColor',
  'scrimOpacity',
  'mediaOpacity',
  'mediaBlur',
  'mediaBrightness',
  'mediaContrast',
  'mediaSaturate',
  'grainAlpha',
  'vignette',
  'fit',
  'flip',
  'layerPosX',
  'layerPosY',
  'layerScale',
  'playbackRate',
  'volume',
  'muted',
]);

/** Canonical fast-path optical/region/typography keys (<0.3ms CSS var update without rebuilding #agy-prism-css). */
export const FAST_OPTICAL_KEYS = Object.freeze([
  'glassBlur',
  'sidebarBlur',
  'glassOpacity',
  'sidebarOpacity',
  'scrimOpacity',
  'scrimColor',
  'vignette',
  'accentMode',
  'customAccent',
  'wallTintMix',
  'glassFidelity',
  'chatGlassFidelity',
  'contrastFloor',
  'floaterSolidBase',
  'surfaceTints',
  'regions',
  'globalFontSize',
  'globalFontFamily',
  'globalFontColor',
  'sidebarListStyle',
  'sidebarTypographyMode',
  'sidebarFontSize',
  'preset',
  'mediaBlur',
  'mediaOpacity',
  'mediaBrightness',
  'mediaContrast',
  'mediaSaturate',
  'grainAlpha',
  'filterPreset',
]);

export const FAST_OPTICAL_KEYS_MAP = Object.freeze(
  Object.fromEntries(FAST_OPTICAL_KEYS.map((k) => [k, 1])),
);

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function num(v, fallback, min, max, decimals = 4) {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback;
  const c = clamp(n, min, max);
  const f = 10 ** decimals;
  return Math.round(c * f) / f;
}

export function nullableNum(v, min, max, decimals = 4) {
  if (v === null || v === undefined || v === '' || v === 'auto') return null;
  const s = typeof v === 'string' ? v.trim() : null;
  if (s === '' || s === 'auto') return null;
  const n = s !== null ? Number(s) : v;
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  const c = clamp(n, min, max);
  const f = 10 ** decimals;
  return Math.round(c * f) / f;
}

function percentNum(v, fallback, min, max) {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback;
  // Accept both 0.4..2.0 factor notation and 40..200 percentage notation seamlessly
  const scaled = n > 0 && n <= 2.5 && max >= 100 ? n * 100 : n;
  return Math.round(clamp(scaled, min, max));
}

function bool(v, fallback) {
  if (typeof v === 'boolean') return v;
  if (v === 'on' || v === 'true' || v === 1) return true;
  if (v === 'off' || v === 'false' || v === 0) return false;
  return fallback;
}

function oneOf(v, list, fallback) {
  return list.includes(v) ? v : fallback;
}

const SAFE_COLOR_RE = /^(?:auto|#[0-9a-f]{3,8}|[a-z]{3,24}|(?:rgb|rgba|hsl|hsla)\(\s*[-\d.%\s,/]+\))$/i;

function cleanColor(v, fallback = '') {
  if (typeof v !== 'string') return fallback;
  const s = v.trim();
  if (!s) return fallback;
  return s.length <= 64 && SAFE_COLOR_RE.test(s) ? s : fallback;
}

export const FONT_FAMILY_FORBIDDEN_CHARS_RE = /[;{}()\\/<>\r\n\0`]/;
export const FONT_FAMILY_FORBIDDEN_KW_RE = /\b(?:url|expression|javascript|vbscript|behavior)\b|@import/i;
export const FONT_FAMILY_TOKEN_RE = /^[a-zA-Z0-9\u4e00-\u9fff _-]+$/;
const GENERIC_FONT_FAMILIES = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-sans-serif',
  'ui-serif',
  'ui-monospace',
  'ui-rounded',
]);

export function sanitizeFontFamily(raw) {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (FONT_FAMILY_FORBIDDEN_CHARS_RE.test(trimmed) || FONT_FAMILY_FORBIDDEN_KW_RE.test(trimmed)) {
    return '';
  }
  const parts = trimmed.split(',');
  const families = [];
  const seen = new Set();
  for (const part of parts) {
    let tok = part.trim();
    if (!tok) continue;
    if ((tok.startsWith("'") && tok.endsWith("'")) || (tok.startsWith('"') && tok.endsWith('"'))) {
      tok = tok.slice(1, -1).trim();
    }
    tok = tok.replace(/\s+/g, ' ');
    if (!tok || tok.length > 64) continue;
    if (FONT_FAMILY_FORBIDDEN_KW_RE.test(tok) || !FONT_FAMILY_TOKEN_RE.test(tok)) continue;
    const lower = tok.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    if (GENERIC_FONT_FAMILIES.has(lower)) {
      families.push(lower);
    } else if (/\s/.test(tok) || /[\u4e00-\u9fff]/.test(tok)) {
      families.push(`'${tok}'`);
    } else {
      families.push(tok);
    }
    if (families.length >= 6) break;
  }
  while (families.length > 0) {
    const joined = families.join(', ');
    if (joined.length <= 120) return joined;
    families.pop();
  }
  return '';
}

export function sanitizeSidebarRadius(v, fallback = 'auto') {
  if (v === null || v === undefined || v === '') return fallback;
  const s = String(v).trim().toLowerCase();
  if (s === 'auto') return 'auto';
  if (s === 'native') return 'native';
  if (/^-?\d+(?:\.\d+)?$/.test(s)) {
    return String(Math.round(clamp(Number(s), SIDEBAR_RADIUS_RANGE.min, SIDEBAR_RADIUS_RANGE.max)));
  }
  return fallback;
}

function cleanStringArray(v, fallback = [], nonEmptyChoices = null) {
  if (!Array.isArray(v)) return [...fallback];
  const out = [];
  const seen = new Set();
  for (const item of v) {
    const s = String(item ?? '').trim();
    if (!s || seen.has(s)) continue;
    if (nonEmptyChoices && !nonEmptyChoices.includes(s)) continue;
    seen.add(s);
    out.push(s);
  }
  if (nonEmptyChoices && out.length === 0) return [...fallback];
  return out;
}

export function hexToRgbTriplet(hex, fallback = '102, 157, 246') {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return fallback;
  let h = m[1];
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

export function contrastFgForHex(hex) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return '#FFFFFF';
  let h = m[1];
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.62 ? '#14120E' : '#FFFFFF';
}

export function hexToRgbArray(hex) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function rgbArrayToHex(rgb) {
  return `#${[0, 1, 2]
    .map((i) => clamp(Math.round(Number(rgb?.[i]) || 0), 0, 255).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

export function relLumRgb(rgb) {
  const lin = (c) => {
    const n = clamp(Number(c) || 0, 0, 255) / 255;
    return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
}

export function contrastRatioRgb(rgbA, rgbB) {
  const l1 = relLumRgb(rgbA);
  const l2 = relLumRgb(rgbB);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/**
 * D7 Opposite-Anchor Foreground Readability Guardrail (WCAG AA >= 4.5:1).
 * Dark theme (`!isLight`) pushes fg toward `[255, 255, 255]`;
 * Light theme (`isLight`) pushes fg toward `[15, 23, 42]`.
 */
export function enforceFgContrastRgb(fgRgb, bgRgb, isLight, minRatio = 4.5) {
  const target = Number.isFinite(minRatio) && minRatio > 1 ? minRatio : 4.5;
  if (contrastRatioRgb(fgRgb, bgRgb) >= target) return [fgRgb[0], fgRgb[1], fgRgb[2]];
  const primaryAnchor = isLight ? [15, 23, 42] : [255, 255, 255];
  const altAnchor = isLight ? [255, 255, 255] : [15, 23, 42];
  const anchor =
    contrastRatioRgb(primaryAnchor, bgRgb) >= target ||
    contrastRatioRgb(primaryAnchor, bgRgb) >= contrastRatioRgb(altAnchor, bgRgb)
      ? primaryAnchor
      : altAnchor;
  let lo = 0;
  let hi = 1;
  let best = anchor;
  for (let step = 0; step < 12; step += 1) {
    const mid = (lo + hi) * 0.5;
    const cand = [
      Math.round(fgRgb[0] + (anchor[0] - fgRgb[0]) * mid),
      Math.round(fgRgb[1] + (anchor[1] - fgRgb[1]) * mid),
      Math.round(fgRgb[2] + (anchor[2] - fgRgb[2]) * mid),
    ];
    if (contrastRatioRgb(cand, bgRgb) >= target) {
      best = cand;
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return best;
}

/**
 * D7 Region Foreground Resolution Policy:
 * - `allowRawFontColor === true` -> skip clamping, return exact user color
 * - `bgAlpha < 0.55` -> gentle low-opacity warning only, DO NOT hard-lock user color
 * - otherwise -> clamp via opposite-anchor `enforceFgContrastRgb` (>= 4.5:1)
 */
export function resolveRegionFgColor({
  fgHex = '',
  bgRgb = [14, 14, 17],
  bgAlpha = 0.76,
  isLight = false,
  allowRawFontColor = false,
  minRatio = 4.5,
} = {}) {
  const cleanHex = cleanTintHex(fgHex);
  if (!cleanHex) {
    return { color: '', rawHex: '', ratio: null, rawRatio: null, clamped: false, lowOpacityWarning: false };
  }
  const fgRgb = hexToRgbArray(cleanHex);
  if (!fgRgb) {
    return { color: '', rawHex: '', ratio: null, rawRatio: null, clamped: false, lowOpacityWarning: false };
  }
  const rawRatio = Math.round(contrastRatioRgb(fgRgb, bgRgb) * 100) / 100;
  const lowOpacityWarning =
    bgAlpha !== null &&
    bgAlpha !== undefined &&
    bgAlpha !== '' &&
    Number.isFinite(Number(bgAlpha)) &&
    Number(bgAlpha) < 0.55;
  if (allowRawFontColor || lowOpacityWarning) {
    return {
      color: cleanHex,
      rawHex: cleanHex,
      ratio: rawRatio,
      rawRatio,
      clamped: false,
      lowOpacityWarning,
    };
  }
  const safeRgb = enforceFgContrastRgb(fgRgb, bgRgb, isLight, minRatio);
  const safeHex = rgbArrayToHex(safeRgb);
  const ratio = Math.round(contrastRatioRgb(safeRgb, bgRgb) * 100) / 100;
  return {
    color: safeHex,
    rawHex: cleanHex,
    ratio,
    rawRatio,
    clamped: safeHex !== cleanHex,
    lowOpacityWarning: false,
  };
}

/** Resolve active scheme + accent tokens for either 'dark' or 'light' polarity. */
export function resolveSchemeTokens(config = DEFAULT_CONFIG, polarity = 'dark') {
  const tone = polarity === 'light' ? 'light' : 'dark';
  const scheme = COLOR_SCHEMES[config.colorScheme] || COLOR_SCHEMES['prism-default'];
  const base = scheme[tone];
  const mode = config.accentMode || 'dynamic';

  let accent = base.accent;
  let accentFg = contrastFgForHex(accent);
  let wallTintRgb = base.accentRgb;

  if (mode === 'dynamic' && config.extractedAccent) {
    const ext = config.extractedAccent;
    const candidate = tone === 'light' ? ext.lightHex : ext.darkHex;
    if (candidate && /^#[0-9a-f]{6}$/i.test(candidate)) {
      accent = candidate;
      accentFg = contrastFgForHex(accent);
    }
    if (ext.tintRgb && /^\d+\s*,\s*\d+\s*,\s*\d+$/.test(ext.tintRgb)) {
      wallTintRgb = ext.tintRgb;
    } else {
      wallTintRgb = hexToRgbTriplet(accent, base.accentRgb);
    }
  } else if (mode === 'custom' && config.customAccent) {
    accent = /^#[0-9a-f]{3,6}$/i.test(config.customAccent) ? config.customAccent : base.accent;
    accentFg = contrastFgForHex(accent);
    wallTintRgb = hexToRgbTriplet(accent, base.accentRgb);
  } else if (ACCENT_PRESETS[mode]) {
    const p = ACCENT_PRESETS[mode];
    accent = tone === 'light' ? p.light : p.dark;
    accentFg = tone === 'light' ? p.lightFg : p.darkFg;
    wallTintRgb = hexToRgbTriplet(accent, base.accentRgb);
  } else {
    wallTintRgb = hexToRgbTriplet(accent, base.accentRgb);
  }

  return {
    schemeId: scheme.id,
    tone,
    ...base,
    accent,
    accentRgb: hexToRgbTriplet(accent, base.accentRgb),
    accentFg,
    wallTintRgb,
  };
}

function sanitizeExtractedAccent(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const darkHex = cleanColor(raw.darkHex, '');
  const lightHex = cleanColor(raw.lightHex, '');
  const tintRgb = typeof raw.tintRgb === 'string' && /^\d+\s*,\s*\d+\s*,\s*\d+$/.test(raw.tintRgb.trim())
    ? raw.tintRgb.trim()
    : '';
  if (!darkHex && !lightHex) return null;
  return {
    wallpaperId: String(raw.wallpaperId || '').slice(0, 180),
    darkHex: darkHex || '#669DF6',
    lightHex: lightHex || '#2563EB',
    tintRgb: tintRgb || hexToRgbTriplet(darkHex || '#669DF6'),
  };
}

function sanitizeRotationGroups(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const g of raw.slice(0, 64)) {
    if (!g || typeof g !== 'object') continue;
    const id = String(g.id || '').trim().slice(0, 80);
    if (!id) continue;
    const name = String(g.name || 'Playlist').trim().slice(0, 80) || 'Playlist';
    const wallpaperIds = cleanStringArray(g.wallpaperIds, []);
    const order = oneOf(g.order, ROTATION_ORDERS, 'random');
    const trigger = oneOf(g.trigger, ROTATION_TRIGGERS, 'interval');
    const interval = num(g.interval, 15, 1, 1440, 0);
    out.push({ id, name, wallpaperIds, order, trigger, interval });
  }
  return out;
}

function hasOwn(obj, key) {
  return Boolean(obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, key));
}

function isPlainObj(v) {
  return Boolean(v && typeof v === 'object' && !Array.isArray(v));
}

function nullableBool(v) {
  if (v === null || v === undefined || v === '' || v === 'auto') return null;
  if (typeof v === 'boolean') return v;
  if (v === 'on' || v === 'true' || v === 1) return true;
  if (v === 'off' || v === 'false' || v === 0) return false;
  return null;
}

function cleanTintHex(v) {
  if (typeof v !== 'string') return '';
  const s = v.trim();
  if (!s || s.toLowerCase() === 'auto') return '';
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
  if (!m) return '';
  let h = m[1];
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return `#${h.toUpperCase()}`;
}

function nullableUnitOpacity(v, min, max) {
  if (v === null || v === undefined || v === '' || v === 'auto') return null;
  const s = typeof v === 'string' ? v.trim() : null;
  if (s === '' || s === 'auto') return null;
  let n = s !== null ? Number(s) : v;
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  // Accept both unit 0..1.99 (clamped to max) and percentage 2..100 notations seamlessly
  if (n >= 2) n = n / 100;
  return Math.round(clamp(n, min, max) * 1000) / 1000;
}

function sanitizeGlassStyle(v) {
  if (v === null || v === undefined || v === '' || v === 'auto') return null;
  if (typeof v !== 'string') return null;
  const s = v.trim().toLowerCase();
  if (!s || s === 'auto') return null;
  return oneOf(s, GLASS_STYLES, null);
}

/** Reset ONLY the 9 optical keys on a region entry while preserving structural/typography/sidebar keys. */
export function stripOpticalFromRegionEntry(ent) {
  const next = isPlainObj(ent) ? { ...ent } : {};
  for (const ok of REGION_OPTICAL_KEYS) {
    next[ok] = DEFAULT_REGION_ENTRY[ok];
  }
  return next;
}

export function sanitizeRegionEntry(id, raw) {
  const bounds = SURFACE_TINT_BOUNDS[id] || { minOpacity: 0, maxOpacity: 0.98 };
  const fsBounds = REGION_FONT_SIZE_BOUNDS[id] || { min: 10, max: 24 };
  const r = isPlainObj(raw) ? raw : {};
  const entry = {
    style: sanitizeGlassStyle(r.style),
    glassEnabled: nullableBool(r.glassEnabled),
    blur: nullableNum(r.blur, REGION_FIELD_BOUNDS.blur.min, REGION_FIELD_BOUNDS.blur.max, REGION_FIELD_BOUNDS.blur.decimals),
    saturation: nullableNum(r.saturation, REGION_FIELD_BOUNDS.saturation.min, REGION_FIELD_BOUNDS.saturation.max, REGION_FIELD_BOUNDS.saturation.decimals),
    opacity: nullableUnitOpacity(r.opacity, bounds.minOpacity, bounds.maxOpacity),
    tone: num(r.tone, 0, REGION_FIELD_BOUNDS.tone.min, REGION_FIELD_BOUNDS.tone.max, REGION_FIELD_BOUNDS.tone.decimals),
    tint: cleanTintHex(r.tint),
    borderOpacity: nullableUnitOpacity(r.borderOpacity, REGION_FIELD_BOUNDS.borderOpacity.min, REGION_FIELD_BOUNDS.borderOpacity.max),
    elevation: nullableNum(r.elevation, REGION_FIELD_BOUNDS.elevation.min, REGION_FIELD_BOUNDS.elevation.max, REGION_FIELD_BOUNDS.elevation.decimals),
    borderStyle: r.borderStyle === null || r.borderStyle === undefined || r.borderStyle === '' || r.borderStyle === 'auto'
      ? null
      : oneOf(r.borderStyle, BORDER_STYLES, null),
    radius: nullableNum(r.radius, REGION_FIELD_BOUNDS.radius.min, REGION_FIELD_BOUNDS.radius.max, REGION_FIELD_BOUNDS.radius.decimals),
    fontSize: nullableNum(r.fontSize, fsBounds.min, fsBounds.max, 0),
    fontFamily: sanitizeFontFamily(r.fontFamily),
    fontColor: cleanTintHex(r.fontColor),
    allowRawFontColor: bool(r.allowRawFontColor, false),
  };
  if (id === 'sidebar') {
    entry.listStyle = oneOf(r.listStyle, SIDEBAR_LIST_STYLES, 'capsule');
    entry.sectionFontSize = nullableNum(r.sectionFontSize, 11, 15, 1);
    entry.projectFontSize = nullableNum(r.projectFontSize, 11, 15, 1);
    entry.itemFontSize = nullableNum(r.itemFontSize, 11, 15, 1);
  }
  return entry;
}

/**
 * Canonical (regionId, propKey)-granular patch merger shared by all 4 layers:
 * schema.mjs, studio-ui/state.mjs, main.mjs::routeRpcConfigPatch, and wallpaper-inject.js mirror.
 */
export function mergeRegionsPatch(baseRegions, patchRegions) {
  if (patchRegions === null) return null;
  if (!isPlainObj(patchRegions)) return isPlainObj(baseRegions) ? { ...baseRegions } : {};
  const out = isPlainObj(baseRegions) ? { ...baseRegions } : {};
  for (const id of REGION_IDS) {
    if (!hasOwn(patchRegions, id)) continue;
    const val = patchRegions[id];
    if (val === null) {
      out[id] = null;
    } else if (isPlainObj(val)) {
      const prev = isPlainObj(out[id]) ? out[id] : {};
      out[id] = { ...prev, ...val };
    }
  }
  return out;
}

export function sanitizeRegions(raw, baseRegions = null) {
  if (raw === null) return createDefaultRegions();
  const baseMap = isPlainObj(baseRegions) ? baseRegions : {};
  const srcMap = isPlainObj(raw) ? raw : {};
  const out = {};
  for (const id of REGION_IDS) {
    const def = createDefaultRegionEntry(id);
    const bEnt = isPlainObj(baseMap[id]) ? { ...def, ...baseMap[id] } : def;
    const hasSrc = hasOwn(srcMap, id);
    const sRaw = hasSrc ? srcMap[id] : undefined;
    if (hasSrc && sRaw === null) {
      out[id] = createDefaultRegionEntry(id);
      continue;
    }
    if (hasSrc && isPlainObj(sRaw)) {
      out[id] = sanitizeRegionEntry(id, { ...bEnt, ...sRaw });
    } else {
      out[id] = sanitizeRegionEntry(id, bEnt);
    }
  }
  return out;
}

export function projectSurfaceTintsFromRegions(regions) {
  const out = {};
  for (const id of SURFACE_TINT_COMPONENTS) {
    const r = regions?.[id] || DEFAULT_REGION_ENTRY;
    out[id] = {
      style: sanitizeGlassStyle(r.style),
      opacity: r.opacity ?? null,
      tone: Number.isFinite(r.tone) ? r.tone : 0,
      tint: r.tint || '',
      blur: r.blur ?? null,
      saturation: r.saturation ?? null,
      glassEnabled: r.glassEnabled ?? null,
      borderOpacity: r.borderOpacity ?? null,
      elevation: r.elevation ?? null,
    };
  }
  return out;
}

export function sanitizeSurfaceTints(raw, baseTints = null) {
  // Explicit `null` resets ALL 12 components back to Auto defaults (used by presets & "Reset All Components")
  if (raw === null) return createDefaultSurfaceTints();
  const baseMap = isPlainObj(baseTints) ? baseTints : {};
  const srcMap = isPlainObj(raw) ? raw : {};
  const out = {};
  for (const id of SURFACE_TINT_COMPONENTS) {
    const bounds = SURFACE_TINT_BOUNDS[id] || { minOpacity: 0, maxOpacity: 0.98 };
    const bEnt = isPlainObj(baseMap[id]) ? baseMap[id] : DEFAULT_SURFACE_TINT_ENTRY;
    const hasSrc = hasOwn(srcMap, id);
    const sRaw = hasSrc ? srcMap[id] : undefined;
    // Explicit `surfaceTints[id] = null` resets that single component cleanly
    if (hasSrc && sRaw === null) {
      out[id] = { ...DEFAULT_SURFACE_TINT_ENTRY };
      continue;
    }
    const sEnt = isPlainObj(sRaw) ? sRaw : {};
    const rawStyle = hasOwn(sEnt, 'style') ? sEnt.style : bEnt.style;
    const rawOp = hasOwn(sEnt, 'opacity') ? sEnt.opacity : bEnt.opacity;
    const rawTone = hasOwn(sEnt, 'tone') ? sEnt.tone : bEnt.tone;
    const rawTint = hasOwn(sEnt, 'tint') ? sEnt.tint : bEnt.tint;
    const rawBlur = hasOwn(sEnt, 'blur') ? sEnt.blur : bEnt.blur;
    const rawSat = hasOwn(sEnt, 'saturation') ? sEnt.saturation : bEnt.saturation;
    const rawGlass = hasOwn(sEnt, 'glassEnabled') ? sEnt.glassEnabled : bEnt.glassEnabled;
    const rawBorderOp = hasOwn(sEnt, 'borderOpacity') ? sEnt.borderOpacity : bEnt.borderOpacity;
    const rawElev = hasOwn(sEnt, 'elevation') ? sEnt.elevation : bEnt.elevation;
    out[id] = {
      style: sanitizeGlassStyle(rawStyle),
      opacity: nullableUnitOpacity(rawOp, bounds.minOpacity, bounds.maxOpacity),
      tone: num(rawTone, 0, REGION_FIELD_BOUNDS.tone.min, REGION_FIELD_BOUNDS.tone.max, REGION_FIELD_BOUNDS.tone.decimals),
      tint: cleanTintHex(rawTint),
      blur: nullableNum(rawBlur, REGION_FIELD_BOUNDS.blur.min, REGION_FIELD_BOUNDS.blur.max, REGION_FIELD_BOUNDS.blur.decimals),
      saturation: nullableNum(rawSat, REGION_FIELD_BOUNDS.saturation.min, REGION_FIELD_BOUNDS.saturation.max, REGION_FIELD_BOUNDS.saturation.decimals),
      glassEnabled: nullableBool(rawGlass),
      borderOpacity: nullableUnitOpacity(rawBorderOp, REGION_FIELD_BOUNDS.borderOpacity.min, REGION_FIELD_BOUNDS.borderOpacity.max),
      elevation: nullableNum(rawElev, REGION_FIELD_BOUNDS.elevation.min, REGION_FIELD_BOUNDS.elevation.max, REGION_FIELD_BOUNDS.elevation.decimals),
    };
  }
  return out;
}

function syncSidebarRadiusPair({ src, baseRegions, merged, legacyKey, regionId, regions, srcResetFullRegions }) {
  const hasLegacy = hasOwn(src, legacyKey);
  const hasRegionEntry = isPlainObj(src.regions) && hasOwn(src.regions, regionId);
  const regionEntryRaw = hasRegionEntry ? src.regions[regionId] : undefined;
  const isExplicitRegionReset = srcResetFullRegions || (hasRegionEntry && regionEntryRaw === null);
  const hasRegionRad =
    isExplicitRegionReset ||
    Boolean(isPlainObj(regionEntryRaw) && hasOwn(regionEntryRaw, 'radius'));
  const baseRegionRadius =
    baseRegions && isPlainObj(baseRegions[regionId])
      ? (baseRegions[regionId].radius ?? null)
      : null;

  let legacyVal = sanitizeSidebarRadius(merged[legacyKey], 'auto');
  if (hasRegionRad && !hasLegacy) {
    if (regions[regionId].radius === null) {
      // Preserve explicit 'native' when base also had radius: null and this is NOT an explicit full-region reset
      // (e.g. a full serialized `regions` object containing own-property `radius: null` without `leftSidebarRadius`).
      // Switching back from 'native' -> 'auto' requires explicit `leftSidebarRadius: 'auto'` or `regions[id]: null` / `regions: null`.
      if (legacyVal === 'native' && baseRegionRadius === null && !isExplicitRegionReset) {
        legacyVal = 'native';
      } else {
        legacyVal = 'auto';
      }
    } else {
      legacyVal = String(regions[regionId].radius);
    }
  } else if (hasLegacy && !hasRegionRad) {
    if (legacyVal === 'auto' || legacyVal === 'native') {
      regions[regionId].radius = null;
    } else {
      regions[regionId].radius = Number(legacyVal);
    }
  } else if (hasRegionRad && hasLegacy) {
    if (srcResetFullRegions && legacyVal !== 'auto') {
      regions[regionId].radius = legacyVal === 'native' ? null : Number(legacyVal);
    } else if (legacyVal === 'native' && regions[regionId].radius === null) {
      // Preserve explicit 'native' semantics distinct from '0'
      legacyVal = 'native';
    } else {
      legacyVal = regions[regionId].radius === null ? 'auto' : String(regions[regionId].radius);
    }
  } else {
    // Neutral merge / disk hydration: NEVER collapse 'native' into '0' or 'auto'
    if (legacyVal === 'native' && regions[regionId].radius === null) {
      legacyVal = 'native';
    } else if (regions[regionId].radius !== null) {
      legacyVal = String(regions[regionId].radius);
    } else if (legacyVal !== 'auto') {
      regions[regionId].radius = Number(legacyVal);
    }
  }
  return legacyVal;
}

function normFidelity(raw, fallback) {
  const n = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw;
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback / 100;
  return clamp(n > 0 && n < 1 ? n : n / 100, 0, 1);
}

/**
 * Resolve the effective glass material style for a region:
 * explicit `entry.style` -> `codeBlock` bridge from `codeReadabilityMode` -> `'none'` for zero-blur regions -> `null` (global chrome).
 */
export function resolveRegionEffectiveStyle(comp, entry = null, cfg = DEFAULT_CONFIG) {
  const c = cfg && typeof cfg === 'object' ? cfg : DEFAULT_CONFIG;
  const ent = entry && typeof entry === 'object' ? entry : (c.regions?.[comp] || c.surfaceTints?.[comp] || null);
  const explicit = sanitizeGlassStyle(ent?.style);
  if (explicit !== null) return explicit;
  if (comp === 'codeBlock') {
    if (c.codeReadabilityMode === 'solid') return 'solid';
    if (c.codeReadabilityMode === 'frosted') return 'frosted';
    return 'none';
  }
  if (ZERO_BLUR_DEFAULT_SET.has(comp)) return 'none';
  return null;
}

function applyStyleAlphaModifier(baseAlpha, effStyle, light, contrastMin, bounds, isCodeBlock = false, contrastFloor = true) {
  if (effStyle === 'solid') {
    return isCodeBlock && contrastFloor ? 1 : (light ? 0.97 : 0.96);
  }
  if (effStyle === 'crystal') {
    const floor = contrastFloor ? Math.max(bounds.minOpacity, contrastMin) : bounds.minOpacity;
    return clamp(baseAlpha * 0.78, floor, bounds.maxOpacity);
  }
  if (effStyle === 'tinted') {
    return clamp(baseAlpha * 0.88, bounds.minOpacity, bounds.maxOpacity);
  }
  return baseAlpha;
}

/**
 * Compute the true rendered default alpha for a glass component when its override `opacity` is `null`.
 * Mirrors `wallpaper-inject.js` (`computeSkinTokens`) so Auto-follow UI readouts match actual rendered glass.
 */
export function resolveComponentDefaultAlpha(comp, cfg = DEFAULT_CONFIG, isLight = false) {
  const c = cfg && typeof cfg === 'object' ? cfg : DEFAULT_CONFIG;
  const light = typeof isLight === 'string' ? isLight === 'light' : Boolean(isLight);
  const entry = c.regions?.[comp] || c.surfaceTints?.[comp] || null;
  const effStyle = resolveRegionEffectiveStyle(comp, entry, c);
  const bounds = SURFACE_TINT_BOUNDS[comp] || { minOpacity: 0, maxOpacity: 0.98 };
  const contrastFloor = c.contrastFloor !== false;

  if (comp === 'popover') {
    const basePop = c.floaterSolidBase !== false ? (light ? 0.97 : 0.96) : 0.94;
    const popAlpha = applyStyleAlphaModifier(basePop, effStyle, light, 0.5, bounds, false, contrastFloor);
    return Math.round(clamp(popAlpha, bounds.minOpacity, bounds.maxOpacity) * 1000) / 1000;
  }

  const g = num(c.glassOpacity, DEFAULT_CONFIG.glassOpacity, 0.15, 0.98, 3);
  const glassFid = normFidelity(c.glassFidelity, DEFAULT_CONFIG.glassFidelity);
  const chatFid = normFidelity(c.chatGlassFidelity, DEFAULT_CONFIG.chatGlassFidelity);
  const layoutMode = c.layoutMode === 'flush' ? 'flush' : 'islands';

  if (comp === 'assistantBubble') {
    if (effStyle === 'none') return 0;
    const rawAsstA = light ? clamp(g * 0.46, 0.22, 0.88) : clamp(g * 0.34, 0.18, 0.84);
    const baseAsstA = Math.max(rawAsstA, (light ? 0.28 : 0.18) * chatFid, 0.18);
    if (effStyle === 'solid') return light ? 0.97 : 0.96;
    if (effStyle === 'crystal') {
      return Math.round(clamp(Math.max(baseAsstA, 0.24) * 0.78, 0.18, bounds.maxOpacity) * 1000) / 1000;
    }
    if (effStyle === 'tinted') {
      return Math.round(clamp(Math.max(baseAsstA, 0.22) * 0.88, 0.16, bounds.maxOpacity) * 1000) / 1000;
    }
    if (c.glassSurfaces === false && entry?.glassEnabled !== true) return 1;
    return Math.round(clamp(baseAsstA, 0.18, bounds.maxOpacity) * 1000) / 1000;
  }

  if (c.glassSurfaces === false && entry?.glassEnabled !== true) return 1;

  let alpha;
  let contrastMin = 0.2;
  if (comp === 'wco') {
    const tbOp = c.regions?.topbar?.opacity ?? c.surfaceTints?.topbar?.opacity;
    if (effStyle === null && tbOp !== null && tbOp !== undefined && tbOp !== '' && Number.isFinite(Number(tbOp))) {
      return Math.round(clamp(Number(tbOp), 0, 0.98) * 1000) / 1000;
    }
    if (effStyle === null) {
      return resolveComponentDefaultAlpha('topbar', c, light);
    }
    const tbBase = tbOp !== null && tbOp !== undefined && tbOp !== '' && Number.isFinite(Number(tbOp))
      ? clamp(Number(tbOp), 0, 0.98)
      : Math.max(g, (contrastFloor ? (light ? 0.48 : 0.36) : 0.15) * glassFid);
    alpha = tbBase;
    contrastMin = 0.24;
  } else if (comp === 'topbar' || comp === 'sidebar') {
    const minSbFloor = contrastFloor ? (light ? 0.48 : 0.36) : 0.15;
    alpha = Math.max(g, minSbFloor * glassFid);
    contrastMin = 0.24;
  } else if (comp === 'workspace' || comp === 'rightPane') {
    const rawChatA =
      layoutMode === 'flush' && !light
        ? clamp(g * 0.24, 0, 0.82)
        : light
          ? clamp(g * 0.62, 0.28, 0.92)
          : clamp(g * 0.42, 0.08, 0.88);
    const minChatFloor = light ? 0.42 : 0.16;
    alpha = Math.max(rawChatA, minChatFloor * chatFid);
    contrastMin = light ? 0.28 : 0.12;
  } else if (comp === 'composer') {
    const rawCompA = light ? clamp(g * 0.94, 0.65, 0.99) : clamp(g * 0.92, 0.48, 0.98);
    const minCompFloor = light ? 0.72 : 0.58;
    alpha = Math.max(rawCompA, minCompFloor * glassFid);
    contrastMin = light ? 0.42 : 0.32;
  } else if (comp === 'card') {
    const rawCardA = light ? clamp(g * 0.86, 0.5, 0.98) : clamp(g * 0.78, 0.32, 0.96);
    const minCardFloor = light ? 0.62 : 0.48;
    alpha = Math.max(rawCardA, minCardFloor * glassFid);
    contrastMin = light ? 0.42 : 0.32;
  } else if (comp === 'userBubble') {
    const rawUbA = light ? clamp(g * 0.95, 0.48, 0.98) : clamp(g * 0.82, 0.34, 0.96);
    const minUbFloor = contrastFloor ? (light ? 0.60 : 0.48) : 0.25;
    alpha = Math.max(rawUbA, minUbFloor * glassFid);
    contrastMin = light ? 0.42 : 0.34;
  } else if (comp === 'codeBlock') {
    const minEd = contrastFloor ? (light ? 0.84 : 0.72) : (light ? 0.52 : 0.38);
    const rawEdA = light ? clamp(g * 0.96, 0.55, 0.99) : clamp(g * 0.92, 0.45, 0.98);
    alpha = Math.max(rawEdA, minEd * (contrastFloor ? 1 : glassFid));
    contrastMin = light ? 0.52 : 0.44;
  } else if (comp === 'controls') {
    const rawCtlA = light ? clamp(g * 0.64, 0.34, 0.84) : clamp(g * 0.48, 0.26, 0.78);
    const minCtlFloor = contrastFloor ? (light ? 0.44 : 0.32) : 0.18;
    alpha = Math.max(rawCtlA, minCtlFloor * glassFid);
    contrastMin = light ? 0.26 : 0.18;
  } else {
    alpha = g;
  }

  alpha = applyStyleAlphaModifier(alpha, effStyle, light, contrastMin, bounds, comp === 'codeBlock', contrastFloor);
  return Math.round(clamp(alpha, 0, 1) * 1000) / 1000;
}

/** Sanitize and merge a full or partial config object against `base`. */
export function sanitizeConfig(input = {}, base = DEFAULT_CONFIG) {
  const src = input && typeof input === 'object' ? input : {};
  const b = base && typeof base === 'object' ? base : DEFAULT_CONFIG;
  const merged = { ...DEFAULT_CONFIG, ...b, ...src };

  // Synchronize alias pairs cleanly
  let activeId = typeof src.activeWallpaperId === 'string'
    ? src.activeWallpaperId.trim()
    : typeof src.wallpaperId === 'string'
      ? src.wallpaperId.trim()
      : String(b.activeWallpaperId || b.wallpaperId || '').trim();
  activeId = activeId.slice(0, 240);

  // Sync muted <-> audioEnabled when only one is supplied in `src`
  let muted = bool(merged.muted, DEFAULT_CONFIG.muted);
  let audioEnabled = bool(merged.audioEnabled, !muted);
  if ('muted' in src && !('audioEnabled' in src)) {
    audioEnabled = !muted;
  } else if ('audioEnabled' in src && !('muted' in src)) {
    muted = !audioEnabled;
  }

  // Step 1: Hydrate 12-region baseline from `b.regions` (lossless fallback to `b.surfaceTints` for v2.1.0 configs)
  const hasBaseRegions = isPlainObj(b.regions);
  const baseRegions = {};
  for (const id of REGION_IDS) {
    const def = createDefaultRegionEntry(id);
    if (hasBaseRegions && isPlainObj(b.regions[id])) {
      baseRegions[id] = sanitizeRegionEntry(id, { ...def, ...b.regions[id] });
    } else if (isPlainObj(b.surfaceTints) && isPlainObj(b.surfaceTints[id])) {
      const legacyOpt = {};
      for (const ok of REGION_OPTICAL_KEYS) {
        if (hasOwn(b.surfaceTints[id], ok)) legacyOpt[ok] = b.surfaceTints[id][ok];
      }
      baseRegions[id] = sanitizeRegionEntry(id, { ...def, ...legacyOpt });
    } else {
      baseRegions[id] = def;
    }
  }

  // Step 2: (regionId, propKey)-granular merge of `src.surfaceTints` and `src.regions`
  const hasSrcRegions = hasOwn(src, 'regions');
  const srcResetFullRegions = hasSrcRegions && src.regions === null;
  const hasSrcTints = hasOwn(src, 'surfaceTints');
  const srcResetAllTints = hasSrcTints && src.surfaceTints === null;

  const workingRegions = {};
  for (const id of REGION_IDS) {
    workingRegions[id] = { ...baseRegions[id] };
  }

  if (srcResetFullRegions) {
    for (const id of REGION_IDS) {
      workingRegions[id] = createDefaultRegionEntry(id);
    }
  } else if (srcResetAllTints) {
    // SCENE_PRESETS (`surfaceTints: null`) reset ONLY the 9 optical keys; structural/font/radius/listStyle stay intact!
    for (const id of REGION_IDS) {
      workingRegions[id] = stripOpticalFromRegionEntry(workingRegions[id]);
    }
  }

  if (!srcResetFullRegions && hasSrcTints && isPlainObj(src.surfaceTints)) {
    for (const id of REGION_IDS) {
      if (!hasOwn(src.surfaceTints, id)) continue;
      const sRaw = src.surfaceTints[id];
      if (sRaw === null) {
        workingRegions[id] = stripOpticalFromRegionEntry(workingRegions[id]);
      } else if (isPlainObj(sRaw)) {
        for (const ok of REGION_OPTICAL_KEYS) {
          if (hasOwn(sRaw, ok)) {
            workingRegions[id][ok] = sRaw[ok];
          }
        }
      }
    }
  }

  if (!srcResetFullRegions && hasSrcRegions && isPlainObj(src.regions)) {
    for (const id of REGION_IDS) {
      if (!hasOwn(src.regions, id)) continue;
      const rRaw = src.regions[id];
      if (rRaw === null) {
        workingRegions[id] = createDefaultRegionEntry(id);
      } else if (isPlainObj(rRaw)) {
        const allowedKeys = id === 'sidebar'
          ? [...REGION_OPTICAL_KEYS, ...REGION_STRUCTURAL_KEYS, ...SIDEBAR_REGION_EXTRA_KEYS]
          : [...REGION_OPTICAL_KEYS, ...REGION_STRUCTURAL_KEYS];
        for (const pk of allowedKeys) {
          if (hasOwn(rRaw, pk)) {
            workingRegions[id][pk] = rRaw[pk];
          }
        }
      }
    }
  }

  const regions = {};
  for (const id of REGION_IDS) {
    regions[id] = sanitizeRegionEntry(id, workingRegions[id]);
  }

  // Step 3: Bidirectional 4-branch syncs for sidebar legacy aliases & radius pairs
  const srcResetAllOptical = srcResetFullRegions || srcResetAllTints;
  const srcResetRegionSidebar =
    srcResetFullRegions || (hasSrcRegions && isPlainObj(src.regions) && src.regions.sidebar === null);

  // (i) `sidebarOpacity` <-> `regions.sidebar.opacity`
  const srcTouchedRegionSbOp =
    srcResetAllOptical ||
    (hasSrcRegions &&
      isPlainObj(src.regions) &&
      (src.regions.sidebar === null ||
        (isPlainObj(src.regions.sidebar) && hasOwn(src.regions.sidebar, 'opacity')))) ||
    (hasSrcTints &&
      isPlainObj(src.surfaceTints) &&
      (src.surfaceTints.sidebar === null ||
        (isPlainObj(src.surfaceTints.sidebar) && hasOwn(src.surfaceTints.sidebar, 'opacity'))));
  const srcTouchedLegacySbOp = hasOwn(src, 'sidebarOpacity');
  let sidebarOpacity = nullableNum(merged.sidebarOpacity, 0, 0.98, 3);

  if (srcTouchedRegionSbOp && !srcTouchedLegacySbOp) {
    sidebarOpacity = regions.sidebar.opacity;
  } else if (srcTouchedLegacySbOp && !srcTouchedRegionSbOp) {
    regions.sidebar.opacity = sidebarOpacity;
  } else if (srcTouchedRegionSbOp && srcTouchedLegacySbOp) {
    if (srcResetAllOptical && sidebarOpacity !== null) {
      regions.sidebar.opacity = sidebarOpacity;
    } else {
      sidebarOpacity = regions.sidebar.opacity;
    }
  } else {
    if (regions.sidebar.opacity === null && sidebarOpacity !== null) {
      regions.sidebar.opacity = sidebarOpacity;
    } else {
      sidebarOpacity = regions.sidebar.opacity;
    }
  }

  // (ii) `sidebarBlur` <-> `regions.sidebar.blur`
  const srcTouchedRegionSbBlur =
    srcResetAllOptical ||
    (hasSrcRegions &&
      isPlainObj(src.regions) &&
      (src.regions.sidebar === null ||
        (isPlainObj(src.regions.sidebar) && hasOwn(src.regions.sidebar, 'blur')))) ||
    (hasSrcTints &&
      isPlainObj(src.surfaceTints) &&
      (src.surfaceTints.sidebar === null ||
        (isPlainObj(src.surfaceTints.sidebar) && hasOwn(src.surfaceTints.sidebar, 'blur'))));
  const srcTouchedLegacySbBlur = hasOwn(src, 'sidebarBlur');
  let sidebarBlur = nullableNum(merged.sidebarBlur, 0, 64, 0);

  if (srcTouchedRegionSbBlur && !srcTouchedLegacySbBlur) {
    sidebarBlur = regions.sidebar.blur;
  } else if (srcTouchedLegacySbBlur && !srcTouchedRegionSbBlur) {
    regions.sidebar.blur = sidebarBlur;
  } else if (srcTouchedRegionSbBlur && srcTouchedLegacySbBlur) {
    if (srcResetAllOptical && sidebarBlur !== null) {
      regions.sidebar.blur = sidebarBlur;
    } else {
      sidebarBlur = regions.sidebar.blur;
    }
  } else {
    if (regions.sidebar.blur === null && sidebarBlur !== null) {
      regions.sidebar.blur = sidebarBlur;
    } else {
      sidebarBlur = regions.sidebar.blur;
    }
  }

  // (iii) `sidebarFontSize` <-> `regions.sidebar.fontSize` (clamped 11..15; NEVER reset by `surfaceTints: null`)
  const srcTouchedRegionSbFs =
    srcResetRegionSidebar ||
    (hasSrcRegions &&
      isPlainObj(src.regions) &&
      isPlainObj(src.regions.sidebar) &&
      hasOwn(src.regions.sidebar, 'fontSize'));
  const srcTouchedLegacySbFs = hasOwn(src, 'sidebarFontSize');
  let sidebarFontSize = nullableNum(merged.sidebarFontSize, 11, 15, 0);

  if (srcTouchedRegionSbFs && !srcTouchedLegacySbFs) {
    sidebarFontSize = regions.sidebar.fontSize;
  } else if (srcTouchedLegacySbFs && !srcTouchedRegionSbFs) {
    regions.sidebar.fontSize = sidebarFontSize;
  } else if (srcTouchedRegionSbFs && srcTouchedLegacySbFs) {
    if (srcResetFullRegions && sidebarFontSize !== null) {
      regions.sidebar.fontSize = sidebarFontSize;
    } else {
      sidebarFontSize = regions.sidebar.fontSize;
    }
  } else {
    if (regions.sidebar.fontSize === null && sidebarFontSize !== null) {
      regions.sidebar.fontSize = sidebarFontSize;
    } else {
      sidebarFontSize = regions.sidebar.fontSize;
    }
  }

  // (iv) `sidebarListStyle` <-> `regions.sidebar.listStyle` (default 'capsule'; NEVER reset by `surfaceTints: null`)
  const srcTouchedRegionSbList =
    srcResetRegionSidebar ||
    (hasSrcRegions &&
      isPlainObj(src.regions) &&
      isPlainObj(src.regions.sidebar) &&
      hasOwn(src.regions.sidebar, 'listStyle'));
  const srcTouchedLegacySbList = hasOwn(src, 'sidebarListStyle');
  let sidebarListStyle = oneOf(merged.sidebarListStyle, SIDEBAR_LIST_STYLES, DEFAULT_CONFIG.sidebarListStyle);

  if (srcTouchedRegionSbList && !srcTouchedLegacySbList) {
    sidebarListStyle = regions.sidebar.listStyle;
  } else if (srcTouchedLegacySbList && !srcTouchedRegionSbList) {
    regions.sidebar.listStyle = sidebarListStyle;
  } else if (srcTouchedRegionSbList && srcTouchedLegacySbList) {
    if (srcResetFullRegions && sidebarListStyle !== DEFAULT_CONFIG.sidebarListStyle) {
      regions.sidebar.listStyle = sidebarListStyle;
    } else {
      sidebarListStyle = regions.sidebar.listStyle;
    }
  } else {
    if (!hasBaseRegions && regions.sidebar.listStyle === DEFAULT_CONFIG.sidebarListStyle && sidebarListStyle !== DEFAULT_CONFIG.sidebarListStyle) {
      regions.sidebar.listStyle = sidebarListStyle;
    } else {
      sidebarListStyle = regions.sidebar.listStyle;
    }
  }

  // (v) `leftSidebarRadius` <-> `regions.sidebar.radius` and `rightSidebarRadius` <-> `regions.rightPane.radius`
  const leftSidebarRadius = syncSidebarRadiusPair({
    src,
    baseRegions,
    merged,
    legacyKey: 'leftSidebarRadius',
    regionId: 'sidebar',
    regions,
    srcResetFullRegions,
  });
  const rightSidebarRadius = syncSidebarRadiusPair({
    src,
    baseRegions,
    merged,
    legacyKey: 'rightSidebarRadius',
    regionId: 'rightPane',
    regions,
    srcResetFullRegions,
  });

  // Step 4: Project `surfaceTints` view from canonical `regions`
  const surfaceTints = projectSurfaceTintsFromRegions(regions);

  // Legacy/DSH field aliases
  const pauseOnBlur = 'pauseOnUnfocus' in src ? bool(src.pauseOnUnfocus, false) : bool(merged.pauseOnBlur, DEFAULT_CONFIG.pauseOnBlur);
  const pauseOnHidden = 'pauseOnMinimized' in src ? bool(src.pauseOnMinimized, true) : bool(merged.pauseOnHidden, DEFAULT_CONFIG.pauseOnHidden);
  const rotationOrder = src.rotationMode === 'shuffle'
    ? 'random'
    : src.rotationMode === 'sequential'
      ? 'sequence'
      : oneOf(merged.rotationOrder, ROTATION_ORDERS, DEFAULT_CONFIG.rotationOrder);
  const rotationInterval = 'rotationIntervalSec' in src && !('rotationInterval' in src)
    ? num(Number(src.rotationIntervalSec) / 60, DEFAULT_CONFIG.rotationInterval, 1, 1440, 0)
    : num(merged.rotationInterval, DEFAULT_CONFIG.rotationInterval, 1, 1440, 0);
  const language = merged.language === 'zh-CN' ? 'zh' : oneOf(merged.language, LANGUAGES, DEFAULT_CONFIG.language);

  const fpsRaw = num(merged.fpsCap, 0, 0, 120, 0);
  const fpsCap = [0, 30, 60].includes(fpsRaw) ? fpsRaw : 0;
  const sceneFpsRaw = num(merged.sceneLiveFps, 30, 15, 60, 0);
  const sceneLiveFps = [15, 30, 60].includes(sceneFpsRaw) ? sceneFpsRaw : 30;
  const rawBootDelay = merged.liveBootDelay === 0 || merged.liveBootDelay === '0'
    ? DEFAULT_CONFIG.liveBootDelay
    : merged.liveBootDelay;

  return {
    skinEnabled: bool(merged.skinEnabled, DEFAULT_CONFIG.skinEnabled),
    startupMode: oneOf(merged.startupMode, STARTUP_MODES, DEFAULT_CONFIG.startupMode),
    activeWallpaperId: activeId,
    wallpaperId: activeId,
    kind: oneOf(merged.kind, WALLPAPER_KINDS, DEFAULT_CONFIG.kind),
    preset: oneOf(merged.preset, [...SCENE_PRESET_IDS, 'custom'], DEFAULT_CONFIG.preset),
    activeProfilePresetId: String(merged.activeProfilePresetId || '').slice(0, 100),

    layoutMode: oneOf(merged.layoutMode, LAYOUT_MODES, DEFAULT_CONFIG.layoutMode),
    islandGap: num(merged.islandGap, DEFAULT_CONFIG.islandGap, 0, 20, 0),
    workspacePad: num(merged.workspacePad, DEFAULT_CONFIG.workspacePad, 0, 20, 0),
    cornerStyle: oneOf(merged.cornerStyle, CORNER_STYLES, DEFAULT_CONFIG.cornerStyle),
    leftSidebarRadius,
    rightSidebarRadius,
    borders: oneOf(merged.borders, BORDER_MODES, DEFAULT_CONFIG.borders),
    shadows: bool(merged.shadows, DEFAULT_CONFIG.shadows),
    transparentWindowControls: bool(merged.transparentWindowControls, DEFAULT_CONFIG.transparentWindowControls),
    hideWelcomeLogo: bool(merged.hideWelcomeLogo, DEFAULT_CONFIG.hideWelcomeLogo),
    topbarStyle: oneOf(merged.topbarStyle, TOPBAR_STYLES, DEFAULT_CONFIG.topbarStyle),
    sidebarListStyle,
    sidebarTypographyMode: oneOf(merged.sidebarTypographyMode, SIDEBAR_TYPOGRAPHY_MODES, DEFAULT_CONFIG.sidebarTypographyMode),
    sidebarFontSize,
    globalFontSize: nullableNum(merged.globalFontSize, 10, 24, 0),
    globalFontFamily: sanitizeFontFamily(merged.globalFontFamily),
    globalFontColor: cleanTintHex(merged.globalFontColor),

    themeMode: oneOf(merged.themeMode, THEME_MODES, DEFAULT_CONFIG.themeMode),
    themeFollow: bool(merged.themeFollow, DEFAULT_CONFIG.themeFollow),
    colorScheme: oneOf(merged.colorScheme, COLOR_SCHEME_IDS, DEFAULT_CONFIG.colorScheme),
    accentMode: oneOf(merged.accentMode, ACCENT_MODES, DEFAULT_CONFIG.accentMode),
    customAccent: cleanColor(merged.customAccent, DEFAULT_CONFIG.customAccent),
    extractedAccent: sanitizeExtractedAccent(merged.extractedAccent),
    accentCache: merged.accentCache && typeof merged.accentCache === 'object' && !Array.isArray(merged.accentCache)
      ? { ...merged.accentCache }
      : {},
    wallTintMix: num(merged.wallTintMix, DEFAULT_CONFIG.wallTintMix, 0, 0.18, 3),

    glassSurfaces: bool(merged.glassSurfaces, DEFAULT_CONFIG.glassSurfaces),
    glassOpacity: num(merged.glassOpacity, DEFAULT_CONFIG.glassOpacity, 0.15, 0.98, 3),
    glassBlur: num(merged.glassBlur, DEFAULT_CONFIG.glassBlur, 0, 64, 0),
    sidebarOpacity,
    sidebarBlur,
    regions,
    surfaceTints,
    glassFidelity: num(merged.glassFidelity, DEFAULT_CONFIG.glassFidelity, 0, 100, 0),
    chatGlassFidelity: num(merged.chatGlassFidelity, DEFAULT_CONFIG.chatGlassFidelity, 0, 100, 0),
    codeReadabilityMode: oneOf(merged.codeReadabilityMode, CODE_READABILITY_MODES, DEFAULT_CONFIG.codeReadabilityMode),
    contrastFloor: bool(merged.contrastFloor, DEFAULT_CONFIG.contrastFloor),
    floaterSolidBase: bool(merged.floaterSolidBase, DEFAULT_CONFIG.floaterSolidBase),
    caretColor: cleanColor(merged.caretColor, ''),

    scrimOpacity: num(merged.scrimOpacity, DEFAULT_CONFIG.scrimOpacity, 0, 0.92, 3),
    scrimColor: cleanColor(merged.scrimColor, 'auto'),
    vignette: bool(merged.vignette, DEFAULT_CONFIG.vignette),
    mediaOpacity: num(merged.mediaOpacity, DEFAULT_CONFIG.mediaOpacity, 0.05, 1, 3),
    mediaBlur: num(merged.mediaBlur, DEFAULT_CONFIG.mediaBlur, 0, 64, 0),
    mediaBrightness: percentNum(merged.mediaBrightness, DEFAULT_CONFIG.mediaBrightness, 40, 160),
    mediaContrast: percentNum(merged.mediaContrast, DEFAULT_CONFIG.mediaContrast, 40, 200),
    mediaSaturate: percentNum(merged.mediaSaturate, DEFAULT_CONFIG.mediaSaturate, 0, 200),
    grainAlpha: num(merged.grainAlpha, DEFAULT_CONFIG.grainAlpha, 0, 0.15, 4),
    filterPreset: oneOf(merged.filterPreset, FILTER_PRESETS, DEFAULT_CONFIG.filterPreset),
    fit: oneOf(merged.fit, FIT_MODES, DEFAULT_CONFIG.fit),
    flip: bool(merged.flip, DEFAULT_CONFIG.flip),
    layerPosX: num(merged.layerPosX, DEFAULT_CONFIG.layerPosX, 0, 100, 1),
    layerPosY: num(merged.layerPosY, DEFAULT_CONFIG.layerPosY, 0, 100, 1),
    layerScale: num(merged.layerScale, DEFAULT_CONFIG.layerScale, 50, 150, 1),

    paused: bool(merged.paused, DEFAULT_CONFIG.paused),
    muted,
    audioEnabled,
    volume: num(merged.volume, DEFAULT_CONFIG.volume, 0, 1, 2),
    playbackRate: num(merged.playbackRate, DEFAULT_CONFIG.playbackRate, 0.25, 2, 2),
    fpsCap,
    pictureSlideSeconds: num(merged.pictureSlideSeconds, DEFAULT_CONFIG.pictureSlideSeconds, 0, 3600, 0),
    sceneLive: bool(merged.sceneLive, DEFAULT_CONFIG.sceneLive),
    sceneLiveFps,
    sceneAutoQuality: bool(merged.sceneAutoQuality, DEFAULT_CONFIG.sceneAutoQuality),
    liveBootDelay: num(rawBootDelay, DEFAULT_CONFIG.liveBootDelay, 0.5, 10, 1),
    interactiveWeb: bool(merged.interactiveWeb, DEFAULT_CONFIG.interactiveWeb),
    previewLiveMedia: bool(merged.previewLiveMedia, DEFAULT_CONFIG.previewLiveMedia),
    libraryAnimatedThumbs: oneOf(merged.libraryAnimatedThumbs, LIBRARY_ANIMATED_THUMB_MODES, DEFAULT_CONFIG.libraryAnimatedThumbs),
    switchTransition: oneOf(merged.switchTransition, SWITCH_TRANSITIONS, DEFAULT_CONFIG.switchTransition),
    switchTransitionDir: oneOf(merged.switchTransitionDir, SWITCH_DIRECTIONS, DEFAULT_CONFIG.switchTransitionDir),
    switchTransitionSpeed: oneOf(merged.switchTransitionSpeed, SWITCH_SPEEDS, DEFAULT_CONFIG.switchTransitionSpeed),
    pauseOnHidden,
    pauseOnBlur,
    pauseOnBattery: bool(merged.pauseOnBattery, DEFAULT_CONFIG.pauseOnBattery),
    pauseOnFullscreen: bool(merged.pauseOnFullscreen, DEFAULT_CONFIG.pauseOnFullscreen),
    desktopSync: bool(merged.desktopSync, DEFAULT_CONFIG.desktopSync),

    rotationEnabled: bool(merged.rotationEnabled, DEFAULT_CONFIG.rotationEnabled),
    rotationSeeded: bool(merged.rotationSeeded, DEFAULT_CONFIG.rotationSeeded),
    rotationGroupId: String(merged.rotationGroupId || '').trim().slice(0, 80),
    rotationOrder,
    rotationTrigger: oneOf(merged.rotationTrigger, ROTATION_TRIGGERS, DEFAULT_CONFIG.rotationTrigger),
    rotationInterval,
    rotationGroups: sanitizeRotationGroups(merged.rotationGroups),
    favorites: cleanStringArray(merged.favorites, []),
    hiddenIds: cleanStringArray(merged.hiddenIds, []),
    typeFilter: cleanStringArray(merged.typeFilter, DEFAULT_CONFIG.typeFilter, LIBRARY_KINDS),
    contentRatingFilter: cleanStringArray(merged.contentRatingFilter, DEFAULT_CONFIG.contentRatingFilter, CONTENT_RATINGS),
    pickerLayout: oneOf(merged.pickerLayout, ['fixed', 'classic'], 'fixed'),
    userProps: merged.userProps && typeof merged.userProps === 'object' && !Array.isArray(merged.userProps)
      ? { ...merged.userProps }
      : {},
    perWallpaperOverrides:
      merged.perWallpaperOverrides && typeof merged.perWallpaperOverrides === 'object' && !Array.isArray(merged.perWallpaperOverrides)
        ? { ...merged.perWallpaperOverrides }
        : {},
    frameVariants:
      merged.frameVariants && typeof merged.frameVariants === 'object' && !Array.isArray(merged.frameVariants)
        ? { ...merged.frameVariants }
        : {},
    sceneLiveFailures: cleanStringArray(merged.sceneLiveFailures, []),
    deletedFactoryPresets: cleanStringArray(merged.deletedFactoryPresets, []),

    uploadDir: String(merged.uploadDir || '').trim(),
    cacheDir: String(merged.cacheDir || '').trim(),
    customFolders: cleanStringArray(merged.customFolders, []),
    fxEnabled: bool(merged.fxEnabled, DEFAULT_CONFIG.fxEnabled),
    fxClickMode: oneOf(merged.fxClickMode, ['ripple', 'spark', 'both', 'off'], DEFAULT_CONFIG.fxClickMode),
    fxTrailMode: oneOf(merged.fxTrailMode, ['comet', 'dust', 'off'], DEFAULT_CONFIG.fxTrailMode),
    parallaxEnabled: bool(merged.parallaxEnabled, DEFAULT_CONFIG.parallaxEnabled),
    parallaxStrength: num(merged.parallaxStrength, DEFAULT_CONFIG.parallaxStrength, 0, 40, 0),
    triggerMode: oneOf(merged.triggerMode, TRIGGER_MODES, DEFAULT_CONFIG.triggerMode),
    debugPort: num(merged.debugPort, DEFAULT_DEBUG_PORT, 1024, 65535, 0),
    language,
  };
}

/** Non-destructive 3-tier reset ('skin' | 'optics' | 'playback' | 'all'). */
export function applyResetScope(currentConfig, scope = 'all') {
  const keys =
    scope === 'skin'
      ? RESET_SCOPES.skin
      : scope === 'optics'
        ? RESET_SCOPES.optics
        : scope === 'playback'
          ? RESET_SCOPES.playback
          : [...RESET_SCOPES.skin, ...RESET_SCOPES.optics, ...RESET_SCOPES.playback];

  const patch = {};
  for (const k of keys) {
    patch[k] = DEFAULT_CONFIG[k];
  }
  if (keys.includes('regions')) {
    patch.regions = null;
    patch.surfaceTints = null;
  }
  return sanitizeConfig(patch, currentConfig);
}

/** Effective config with per-wallpaper optical overrides merged on top when active. */
export function resolveEffectiveConfig(config = DEFAULT_CONFIG, wallpaperId = config.activeWallpaperId) {
  const clean = sanitizeConfig(config);
  const ov = wallpaperId && clean.perWallpaperOverrides ? clean.perWallpaperOverrides[wallpaperId] : null;
  if (!ov || typeof ov !== 'object') return clean;
  const filtered = {};
  for (const k of PER_WALLPAPER_OVERRIDE_KEYS) {
    if (k in ov) filtered[k] = ov[k];
  }
  return sanitizeConfig(filtered, clean);
}
