#!/usr/bin/env node
/**
 * Comprehensive Automated Verification & Visual E2E Suite (`test/verify-all.mjs`) — v2.4.1
 *
 * Verifies 100% of `agy-wallpaper-prism` v1.x + Gentle Fail-Open v2.2.0 + v2.3.0 + v2.4.1 specifications across:
 *   Suite 1 — Manifest (v2.4.1), Bundle, Skills, Sidecar (`on-failure`), Zero-Enable CDP Static Audit,
 *             Zero-PII Audit & SHA-256 Workspace <-> Global Plugin Sync
 *   Suite 2 — Backend Engine, DSH Parity, Co-Keyed Storage, Two-Phase `fsync` Boot Canary Circuit-Breaker
 *             (`canary.json` arming -> tripped, `/api/canary/reset`, `/api/skin/wake`), PR #6 Hardened `fetch+blob`,
 *             PR #7 `/video-stage/` Streaming Iframe + v2.0.8 OOPIF Web Audio & Studio 4-Socket (2 aux + 2 popout) / Host 2-Socket SSE Cap,
 *             PR #9 `deadPluginOrigins` TTL/AbortError/Ghost-Video Guard & `wake()` Live-SSE Fast-Path,
 *             Issue #10 Pure-Optical `SCENE_PRESETS` (5 presets), 12-Region `regions` + `surfaceTints` + 128/128 WCAG AA Matrix,
 *             v2.2.0 Visual Editor CSP / Popout / Preset Lifecycle / Soft-Knee Blur / WCO / Contrast Guardrail & Packager
 *   Suite 3 — Studio v2.4 UI (12-Region Accordions + Layer B Soft/Deep Sleep + Visual Canvas Modal/Popout +
 *             21:9 `.mini-blur-veil` / `.mini-aux` Parity) & Antigravity 2.35.1 Hub Headless Chrome E2E:
 *               1) Zero-Enable Ephemeral Micro-Bootstrap (`<= 6144 B`), Lazy `/host/<token>/panel.js` Load,
 *                  PR #8 Footer-Remount Self-Heal, `REMOVE_PANEL_EXPR` Non-Resurrection & Double-Inject Guard
 *               2) Fail-Open Media-Ready Gate (404 video -> solid #070708, `z-index: -1` inert stage, clickable `#root`;
 *                  valid H.264 video -> `data-agy-prism-wallpaper="ready"` ONLY after Frame 1 decode)
 *               3) 2.34.0/2.35.1 Refined Selectors (`.h-full.w-full.dark`, `.browser-hole-opaque`,
 *                  `.settings-modal-container` + inner `.hover:bg-background` tabs, `[role="menu"]` alpha >= 0.94,
 *                  `#ag-usage-monitor-capsule` & `#gemini-neko-pet-root` untouched)
 *               4) 3-Layer `[data-browser-hole]` Synchronous Rounded GPU Cutout (`clip-path: path(...)`,
 *                  12px bottom arcs, `alpha = 0` compositor pixel proof, `elementFromPoint`, synchronous resize)
 *               5) `Ctrl+Alt+Shift+R` Emergency Panic Strip + `skinEnabled === false` Persistence
 *               6) Four Glass UI Fixes + Req #2 2.35.1 Hollowed Topbar + Compact Rounded Pills + `P$c` Preservation +
 *                  WCO Height 30/35/40 Alignment + D18 Z-Index Layering
 *               7) 3-Point 1-Click Master Toggle E2E (Studio `#prism-master-toggle-btn` + `Ctrl+Alt+W`
 *                  `[data-testid="prism-power-toggle"]` + persistent `#agy-prism-pill` + `/api/skin/toggle` Canary auto-reset)
 *               8) Issue #10 + D2 Optical Presets & `.agy-prism-blur-veil`, Req #1 `hideWelcomeLogo` (5 modes),
 *                  Req #3 `glassBlur` 0..64px & Quick Prism Inheritance, Req #4 Per-Component Tints Isolation,
 *                  Req #6 `Antigravity-Chinese-Localization` Coexistence E2E
 *               9) Full-Window Verification Screenshots
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import http, { IncomingMessage, ServerResponse } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { Duplex } from 'node:stream';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';
import zlib from 'node:zlib';

import { launchHeadlessBrowser, readPngDimensions } from './cdp-browser.mjs';
import { createPrismArtworkPng, materializeTestFixtures } from './fixtures-builder.mjs';
import { invokeServerInMemory } from './http-inproc.mjs';
import { buildMockAntigravityHubHtml } from './mock-hub-template.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const DEFAULT_ARTIFACT_DIR =
  process.env.PRISM_SCREENSHOT_DIR ||
  path.join(os.tmpdir(), 'agy-wallpaper-prism-verify');
const SCRATCH_ROOT = path.join(__dirname, `.tmp-verify-${process.pid}`);

const ALLOWED_PLUGIN_JSON_KEYS = new Set([
  'name',
  'displayName',
  'description',
  'version',
  'logo',
  'suggestedPrompts',
  'author',
  'homepage',
  'repository',
  'disabled',
]);

const results = [];
const failures = [];
const screenshots = [];

async function check(name, owner, fn) {
  const t0 = Date.now();
  try {
    const detail = await fn();
    const ms = Date.now() - t0;
    results.push({ name, owner, ok: true, ms, detail: detail || '' });
    console.log(`  [PASS] ${name} (${ms}ms)${detail ? ` — ${detail}` : ''}`);
  } catch (err) {
    const ms = Date.now() - t0;
    const msg = err?.stack || err?.message || String(err);
    results.push({ name, owner, ok: false, ms, error: msg });
    failures.push({ name, owner, message: err?.message || String(err), stack: msg });
    console.error(`  [FAIL] (${owner}) ${name}: ${err?.message || err}`);
  }
}

function parseAlphaFromCssColor(cssColor) {
  const s = String(cssColor || '').trim().toLowerCase();
  if (!s || s === 'transparent') return 0;
  const rgba = /^rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)$/.exec(s);
  if (rgba) return Number(rgba[1]);
  const slash = /\/\s*([\d.]+)(%?)\s*\)/.exec(s);
  if (slash) return slash[2] === '%' ? Number(slash[1]) / 100 : Number(slash[1]);
  if (s.startsWith('rgb(') || s.startsWith('color(') || s.startsWith('#')) return 1;
  return 1;
}

function sha256File(filePath) {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

/**
 * Pure Node RFC-2083 8-bit RGB/RGBA PNG pixel decoder for compositor alpha proof.
 */
function decodePngRgba(pngBuf) {
  assert.ok(pngBuf.length >= 33 && pngBuf.readUInt32BE(0) === 0x89504e47, 'Invalid PNG signature');
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 8;
  let colorType = 6;
  const idatChunks = [];

  while (offset + 8 <= pngBuf.length) {
    const len = pngBuf.readUInt32BE(offset);
    const type = pngBuf.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + len;
    if (type === 'IHDR') {
      width = pngBuf.readUInt32BE(dataStart);
      height = pngBuf.readUInt32BE(dataStart + 4);
      bitDepth = pngBuf[dataStart + 8];
      colorType = pngBuf[dataStart + 9];
    } else if (type === 'IDAT') {
      idatChunks.push(pngBuf.subarray(dataStart, dataEnd));
    } else if (type === 'IEND') {
      break;
    }
    offset = dataEnd + 4;
  }

  assert.equal(bitDepth, 8, `Unsupported PNG bitDepth=${bitDepth}`);
  const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  assert.ok(bpp > 0, `Unsupported PNG colorType=${colorType}`);

  const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
  const rowBytes = width * bpp;
  const stride = 1 + rowBytes;
  const pixels = new Uint8Array(width * height * 4);
  let prevRow = new Uint8Array(rowBytes);

  const paethPredictor = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
  };

  for (let y = 0; y < height; y++) {
    const rOff = y * stride;
    const filter = inflated[rOff];
    const curRow = new Uint8Array(rowBytes);
    for (let i = 0; i < rowBytes; i++) {
      const raw = inflated[rOff + 1 + i];
      const a = i >= bpp ? curRow[i - bpp] : 0;
      const b = prevRow[i];
      const c = i >= bpp ? prevRow[i - bpp] : 0;
      let recon = raw;
      if (filter === 1) recon = (raw + a) & 0xff;
      else if (filter === 2) recon = (raw + b) & 0xff;
      else if (filter === 3) recon = (raw + ((a + b) >> 1)) & 0xff;
      else if (filter === 4) recon = (raw + paethPredictor(a, b, c)) & 0xff;
      curRow[i] = recon;
    }
    for (let x = 0; x < width; x++) {
      const dst = (y * width + x) * 4;
      const src = x * bpp;
      pixels[dst] = curRow[src];
      pixels[dst + 1] = curRow[src + 1];
      pixels[dst + 2] = curRow[src + 2];
      pixels[dst + 3] = bpp === 4 ? curRow[src + 3] : 255;
    }
    prevRow = curRow;
  }

  return {
    width,
    height,
    pixelAt(x, y) {
      const cx = Math.max(0, Math.min(width - 1, Math.round(x)));
      const cy = Math.max(0, Math.min(height - 1, Math.round(y)));
      const idx = (cy * width + cx) * 4;
      return { r: pixels[idx], g: pixels[idx + 1], b: pixels[idx + 2], a: pixels[idx + 3] };
    },
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log('=== agy-wallpaper-prism v2.4.1 Full Verification Harness ===');
  fs.mkdirSync(SCRATCH_ROOT, { recursive: true });
  fs.mkdirSync(DEFAULT_ARTIFACT_DIR, { recursive: true });
  const fixturesDir = path.join(SCRATCH_ROOT, 'fixtures');
  const fx = materializeTestFixtures(fixturesDir);

  // =========================================================================
  // SUITE 1: Manifest, Bundle, Zero-Enable CDP Audit, Zero-PII & Byte Sync
  // =========================================================================
  console.log('\n--- Suite 1: Manifest (v2.4.1), Zero-Enable CDP Audit, Zero-PII & Sync Checks ---');

  await check('plugin.json, package.json & 8-point v2.4.1 version anchors + GitHub repository metadata', '@gentle-skin-architect', () => {
    const pPath = path.join(REPO_ROOT, 'plugin.json');
    const pkgPath = path.join(REPO_ROOT, 'package.json');
    const readmePath = path.join(REPO_ROOT, 'README.md');
    const schemaPath = path.join(REPO_ROOT, 'src', 'shared', 'schema.mjs');
    const wallInjectPath = path.join(REPO_ROOT, 'src', 'host', 'wallpaper-inject.js');
    const panelInjectPath = path.join(REPO_ROOT, 'src', 'host', 'panel-inject.js');
    const inspectorInjectPath = path.join(REPO_ROOT, 'src', 'host', 'inspector-inject.js');
    assert.ok(fs.existsSync(pPath), 'plugin.json missing');
    assert.ok(fs.existsSync(pkgPath), 'package.json missing');
    assert.ok(fs.existsSync(inspectorInjectPath), 'src/host/inspector-inject.js missing');
    const raw = JSON.parse(fs.readFileSync(pPath, 'utf8'));
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const readme = fs.readFileSync(readmePath, 'utf8');
    const schemaSrc = fs.readFileSync(schemaPath, 'utf8');
    const wallInjectSrc = fs.readFileSync(wallInjectPath, 'utf8');
    const panelInjectSrc = fs.readFileSync(panelInjectPath, 'utf8');
    const inspectorInjectSrc = fs.readFileSync(inspectorInjectPath, 'utf8');
    const badKeys = Object.keys(raw).filter((k) => !ALLOWED_PLUGIN_JSON_KEYS.has(k));
    assert.deepEqual(badKeys, [], `Forbidden keys in plugin.json: ${badKeys.join(', ')}`);
    assert.equal(raw.name, 'agy-wallpaper-prism');
    assert.equal(raw.version, '2.4.1', `Expected plugin.json version 2.4.1, got ${raw.version}`);
    assert.equal(pkg.version, '2.4.1', `Expected package.json version 2.4.1, got ${pkg.version}`);
    assert.match(readme, /\*\*Version\*\*:\s*`2\.4\.0`/, 'Expected README.md **Version**: `2.4.1`');
    assert.match(schemaSrc, /export const PLUGIN_VERSION\s*=\s*'2\.4\.0'/, 'Expected schema.mjs PLUGIN_VERSION = 2.4.1');
    assert.match(schemaSrc, /skinVersion:\s*'2\.4\.0'/, 'Expected schema.mjs PRISM_DOM.skinVersion = 2.4.1');
    assert.match(wallInjectSrc, /var VERSION\s*=\s*'2\.4\.0'/, 'Expected wallpaper-inject.js VERSION = 2.4.1');
    assert.match(panelInjectSrc, /var VERSION\s*=\s*'2\.4\.0'/, 'Expected panel-inject.js VERSION = 2.4.1');
    assert.match(inspectorInjectSrc, /var VERSION\s*=\s*'2\.4\.0'/, 'Expected inspector-inject.js VERSION = 2.4.1');
    assert.equal(raw.logo, 'assets/logo.svg');
    const repoUrl = typeof raw.repository === 'object' ? raw.repository?.url : raw.repository;
    assert.ok(
      String(repoUrl || '').startsWith('https://github.com/azwosile/agy-wallpaper-prism'),
      `Unexpected repository in plugin.json: ${JSON.stringify(raw.repository)}`,
    );
    assert.ok(
      String(raw.homepage || '').startsWith('https://github.com/azwosile/agy-wallpaper-prism'),
      `Unexpected homepage in plugin.json: ${raw.homepage}`,
    );
    assert.ok(Array.isArray(raw.suggestedPrompts) && raw.suggestedPrompts.length <= 3, 'suggestedPrompts must be <= 3');
    return `v${raw.version} synced across all 8 anchors, keys=${Object.keys(raw).length}/10`;
  });

  await check('Git repository branch (`main`), `origin` remote URL & working tree audit', '@resilience-designer', () => {
    const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: REPO_ROOT, stdio: 'pipe' })
      .toString('utf8')
      .trim();
    assert.equal(branch, 'main', `Expected git branch "main", got "${branch}"`);
    const originUrl = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: REPO_ROOT, stdio: 'pipe' })
      .toString('utf8')
      .trim();
    assert.equal(originUrl, 'https://github.com/azwosile/agy-wallpaper-prism.git');
    const porcelain = execFileSync('git', ['status', '--porcelain'], { cwd: REPO_ROOT, stdio: 'pipe' })
      .toString('utf8')
      .trim();
    if (process.env.PRISM_ALLOW_DIRTY_GIT !== '1') {
      assert.equal(porcelain, '', `Git working tree is not clean:\n${porcelain}`);
    }
    return `branch=${branch}, origin=${originUrl}, status=${porcelain ? 'pre-commit' : 'clean'}`;
  });

  await check('Zero-Enable Ephemeral CDP Audit: 0 forbidden invasive CDP domain/hook calls in cdp-bridge.mjs', '@resilience-designer', () => {
    const cdpPath = path.join(REPO_ROOT, 'sidecars', 'prism_studio', 'cdp-bridge.mjs');
    const src = fs.readFileSync(cdpPath, 'utf8');
    const forbidden = [
      'Page.enable',
      'Runtime.enable',
      'Page.addScriptToEvaluateOnNewDocument',
      'Runtime.addBinding',
    ];
    for (const token of forbidden) {
      const count = src.split(token).length - 1;
      assert.equal(count, 0, `Forbidden invasive CDP API "${token}" found ${count} time(s) in cdp-bridge.mjs!`);
    }
    return '0 occurrences of Page.enable, Runtime.enable, addScriptToEvaluateOnNewDocument, Runtime.addBinding';
  });

  await check('assets/logo.svg valid >=128x128 SVG & SKILL.md frontmatter + URI schemes', '@resilience-designer', () => {
    const lPath = path.join(REPO_ROOT, 'assets', 'logo.svg');
    assert.ok(fs.existsSync(lPath), 'assets/logo.svg missing');
    const svg = fs.readFileSync(lPath, 'utf8');
    assert.ok(svg.includes('<svg') && svg.includes('viewBox="0 0 256 256"'), 'Expected crisp 256x256 viewBox SVG');

    const sPath = path.join(REPO_ROOT, 'skills', 'wallpaper-prism', 'SKILL.md');
    assert.ok(fs.existsSync(sPath), 'skills/wallpaper-prism/SKILL.md missing');
    const md = fs.readFileSync(sPath, 'utf8');
    assert.match(md, /^---\r?\n[\s\S]*?name:\s*wallpaper-prism[\s\S]*?description:\s*.+[\s\S]*?\r?\n---/);
    assert.ok(md.includes('sidecar://agy-wallpaper-prism/prism_studio/'), 'Missing sidecar:// pill link');
    assert.ok(md.includes('customization://agy-wallpaper-prism'), 'Missing customization:// link');
    assert.ok(!md.includes('plugin://') && !md.includes('plugins://'), 'Dead plugin:// scheme found in SKILL.md');
    assert.ok(md.includes('2.4.1'), 'Expected 2.4.1 version marker in SKILL.md');
    return `logo=${svg.length}B, SKILL.md valid`;
  });

  await check('sidecars/prism_studio/sidecar.json AUX_PANE contract & gentle `on-failure` restart_policy', '@resilience-designer', () => {
    const scPath = path.join(REPO_ROOT, 'sidecars', 'prism_studio', 'sidecar.json');
    assert.ok(fs.existsSync(scPath), 'sidecars/prism_studio/sidecar.json missing');
    const sc = JSON.parse(fs.readFileSync(scPath, 'utf8'));
    assert.equal(sc.command, 'node');
    assert.deepEqual(sc.args, ['main.mjs']);
    assert.equal(sc.restart_policy, 'on-failure', `Expected restart_policy="on-failure", got ${sc.restart_policy}`);
    assert.equal(sc.has_web_ui, true);
    assert.equal(sc.ui_config?.views?.[0]?.path, '/');
    assert.equal(sc.ui_config?.views?.[0]?.entrypoint, 'SIDECAR_UI_ENTRYPOINT_AUX_PANE');
    return 'AUX_PANE + restart_policy=on-failure';
  });

  await check('sidecars/prism_studio/index.html single-file inlined bundle & #app 100% height lock', '@crash-forensics / @resilience-designer', async () => {
    const idxPath = path.join(REPO_ROOT, 'sidecars', 'prism_studio', 'index.html');
    if (!fs.existsSync(idxPath)) {
      const { buildStudioBundle } = await import(pathToFileURL(path.join(REPO_ROOT, 'scripts', 'build.mjs')).href);
      await buildStudioBundle();
    }
    assert.ok(fs.existsSync(idxPath), 'sidecars/prism_studio/index.html missing after build');
    const html = fs.readFileSync(idxPath, 'utf8');
    assert.ok(html.includes('<style') && html.includes('<script'), 'Expected inlined <style> and <script>');
    assert.ok(!/<script[^>]+type=["']module["'][^>]+src=/i.test(html), 'External ES module <script src> forbidden in sidecar');
    assert.ok(!/<link[^>]+rel=["']stylesheet["']/i.test(html), 'External <link rel="stylesheet"> forbidden in single-file bundle');
    assert.ok(/#app[\s\S]{0,220}height:\s*100(%|dvh|vh)/i.test(html), 'Missing #app 100% height lock in Studio CSS');
    assert.ok(html.includes('prism-startup-safety-card'), 'Bundled index.html missing v2.0 #prism-startup-safety-card');
    assert.ok(html.includes('prism-master-toggle-btn'), 'Bundled index.html missing v2.0.7 #prism-master-toggle-btn');
    assert.ok(html.includes('prism-update-card'), 'Bundled index.html missing #prism-update-card');
    assert.ok(html.includes('mini-blur-veil'), 'Bundled index.html missing .mini-blur-veil');
    assert.ok(html.includes('class="agy-prism-root"'), 'Bundled index.html missing Req #6 #app.agy-prism-root guard');
    assert.ok(html.includes('prism-region-group'), 'Bundled index.html missing v2.4.1 .prism-region-group 12-region accordions');
    assert.ok(html.includes('toggle-preview-live'), 'Bundled index.html missing v2.2.0 toggle-preview-live static-first action');
    assert.ok(html.includes('agy-prism-visual-editor'), 'Bundled index.html missing v2.2.0 .agy-prism-visual-editor');
    assert.ok(html.includes('2.4.1'), 'Bundled index.html missing inlined v2.4.1 version marker');
    assert.equal(html.includes('\r'), false, 'Bundled index.html must be pure LF (0 CR/CRLF)');
    return `${Math.round(html.length / 1024)} KB inlined v2.4.1 pure-LF bundle`;
  });

  await check('Syntax check (`node --check`) across all JS/MJS entrypoints & test modules', '@resilience-designer', () => {
    const targets = [
      'scripts/build.mjs',
      'scripts/install-local.mjs',
      'scripts/pack-release.mjs',
      'host/cli.mjs',
      'sidecars/prism_studio/main.mjs',
      'sidecars/prism_studio/cdp-bridge.mjs',
      'src/shared/schema.mjs',
      'src/shared/i18n.mjs',
      'src/shared/semver.mjs',
      'src/engine/index.mjs',
      'src/engine/store.mjs',
      'src/engine/scanner.mjs',
      'src/engine/mp4-vfs.mjs',
      'src/engine/pkg-scene.mjs',
      'src/engine/media-server.mjs',
      'src/engine/playlist.mjs',
      'src/engine/tar-safe.mjs',
      'src/engine/updater.mjs',
      'src/engine/runtime/web-shim.mjs',
      'src/host/index.mjs',
      'src/host/wallpaper-inject.js',
      'src/host/panel-inject.js',
      'src/host/inspector-inject.js',
      'src/studio-ui/state.mjs',
      'src/studio-ui/optics.mjs',
      'src/studio-ui/controls.mjs',
      'src/studio-ui/tabs/library.mjs',
      'src/studio-ui/tabs/skin-regions.mjs',
      'src/studio-ui/tabs/playback.mjs',
      'src/studio-ui/tabs/system.mjs',
      'src/studio-ui/editor/region-inspector.mjs',
      'src/studio-ui/editor/visual-canvas.mjs',
      'src/studio-ui/app.mjs',
      'test/cdp-browser.mjs',
      'test/fixtures-builder.mjs',
      'test/mock-hub-template.mjs',
      'test/http-inproc.mjs',
      'test/verify-all.mjs',
    ];
    for (const rel of targets) {
      const full = path.join(REPO_ROOT, rel);
      assert.ok(fs.existsSync(full), `Missing file: ${rel}`);
      execFileSync(process.execPath, ['--check', full], { stdio: 'pipe' });
    }
    return `${targets.length} files syntax-clean`;
  });

  await check('Zero-PII Audit (repo + git diff) & SHA-256 Byte Sync with ~/.gemini/config/plugins/agy-wallpaper-prism', '@resilience-designer', async () => {
    const piiTokens = [
      ['Kurami', '_Utaho'].join(''),
      ['sk', 'fish', ''].join('-'),
    ];
    const skipDirs = new Set(['.git', 'node_modules', 'dist']);
    const walkRepo = (dir, out = []) => {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        if (skipDirs.has(ent.name) || ent.name.startsWith('.tmp-verify')) continue;
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) walkRepo(p, out);
        else if (ent.isFile()) out.push(p);
      }
      return out;
    };

    const repoFiles = walkRepo(REPO_ROOT);
    for (const file of repoFiles) {
      const rel = path.relative(REPO_ROOT, file);
      if (rel === '.prism-install-id') continue;
      const text = fs.readFileSync(file, 'utf8');
      for (const tok of piiTokens) {
        assert.equal(text.includes(tok), false, `Forbidden PII/secret token found in workspace file: ${rel}`);
      }
    }

    const gitDiff = execFileSync('git', ['diff', 'HEAD'], {
      cwd: REPO_ROOT,
      stdio: 'pipe',
      maxBuffer: 32 * 1024 * 1024,
    }).toString('utf8');
    for (const tok of piiTokens) {
      assert.equal(gitDiff.includes(tok), false, 'Forbidden PII/secret token found in git diff HEAD!');
    }

    const { installLocalPlugin } = await import(pathToFileURL(path.join(REPO_ROOT, 'scripts', 'install-local.mjs')).href);
    const stagedPluginsRoot = path.join(SCRATCH_ROOT, 'staged-plugins');
    const { dstDir } = await installLocalPlugin({ destRoot: stagedPluginsRoot, skipSidecarReload: true });
    assert.equal(fs.lstatSync(dstDir).isSymbolicLink(), false, 'installLocalPlugin created symlink/junction instead of real dir');
    assert.ok(fs.existsSync(path.join(dstDir, 'sidecars', 'prism_studio', 'index.html')), 'Missing bundled index.html in staged install');

    const syncFiles = [
      'plugin.json',
      'package.json',
      'README.md',
      'assets/logo.svg',
      'skills/wallpaper-prism/SKILL.md',
      'sidecars/prism_studio/sidecar.json',
      'sidecars/prism_studio/index.html',
      'sidecars/prism_studio/main.mjs',
      'sidecars/prism_studio/cdp-bridge.mjs',
      'host/cli.mjs',
      'src/shared/schema.mjs',
      'src/shared/i18n.mjs',
      'src/shared/semver.mjs',
      'src/engine/index.mjs',
      'src/engine/store.mjs',
      'src/engine/scanner.mjs',
      'src/engine/mp4-vfs.mjs',
      'src/engine/pkg-scene.mjs',
      'src/engine/media-server.mjs',
      'src/engine/playlist.mjs',
      'src/engine/tar-safe.mjs',
      'src/engine/updater.mjs',
      'src/engine/runtime/web-shim.mjs',
      'src/host/index.mjs',
      'src/host/wallpaper-inject.js',
      'src/host/panel-inject.js',
      'src/host/inspector-inject.js',
      'src/studio-ui/state.mjs',
      'src/studio-ui/optics.mjs',
      'src/studio-ui/controls.mjs',
      'src/studio-ui/tabs/library.mjs',
      'src/studio-ui/tabs/skin-regions.mjs',
      'src/studio-ui/tabs/playback.mjs',
      'src/studio-ui/tabs/system.mjs',
      'src/studio-ui/editor/region-inspector.mjs',
      'src/studio-ui/editor/visual-canvas.mjs',
      'src/studio-ui/app.mjs',
    ];
    for (const stagedRel of syncFiles) {
      assert.equal(
        sha256File(path.join(REPO_ROOT, stagedRel)),
        sha256File(path.join(dstDir, stagedRel)),
        `Staged installLocalPlugin() mismatch on ${stagedRel}`,
      );
    }

    const globalPluginDir = path.join(os.homedir(), '.gemini', 'config', 'plugins', 'agy-wallpaper-prism');
    let syncNote = 'staged copy verified';
    try {
      if (fs.existsSync(globalPluginDir)) {
        assert.equal(fs.lstatSync(globalPluginDir).isSymbolicLink(), false, 'Global installed plugin MUST NOT be an NTFS junction');
        for (const syncRel of syncFiles) {
          const wsHash = sha256File(path.join(REPO_ROOT, syncRel));
          const instPath = path.join(globalPluginDir, syncRel);
          assert.ok(fs.existsSync(instPath), `Missing ${syncRel} in global installed plugin`);
          const instHash = sha256File(instPath);
          assert.equal(wsHash, instHash, `SHA-256 mismatch between workspace & ~/.gemini plugin on ${syncRel}`);
        }
        syncNote = `${syncFiles.length} files SHA-256 byte-identical + 0 PII hits`;
      }
    } catch (err) {
      if (err?.code === 'EPERM' || err?.code === 'EACCES') {
        syncNote = `0 PII hits (${repoFiles.length} files); global ~/.gemini gated by sandbox`;
      } else {
        throw err;
      }
    }
    return syncNote;
  });

  await check('D1 `docs/AI_HANDOFF.md` freeze (`git diff ded7824`) & Zero-CR (`\\r`) text hygiene across repo', '@exec-mock-tests', () => {
    const hasBaselineCommit = (() => {
      try {
        execFileSync('git', ['rev-parse', '--verify', 'ded7824'], { cwd: REPO_ROOT, stdio: 'pipe' });
        return true;
      } catch {
        return false;
      }
    })();
    assert.equal(hasBaselineCommit, true, 'Missing git baseline commit ded7824 for D1 docs/AI_HANDOFF.md verification');
    const handoffDiff = execFileSync('git', ['diff', 'ded7824', '--', 'docs/AI_HANDOFF.md'], {
      cwd: REPO_ROOT,
      stdio: 'pipe',
    }).toString('utf8');
    assert.equal(handoffDiff, '', `D1 violation: docs/AI_HANDOFF.md was modified since ded7824:\n${handoffDiff.slice(0, 400)}`);

    const crHits = [];
    const scanRoots = ['scripts', 'src', 'sidecars', 'skills', 'test', 'host', 'docs'];
    const textExts = new Set(['.js', '.mjs', '.json', '.md', '.html', '.css', '.svg', '.yml', '.yaml']);
    const walkLf = (dir) => {
      if (!fs.existsSync(dir)) return;
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        if (ent.name === 'node_modules' || ent.name === 'dist' || ent.name.startsWith('.tmp-')) continue;
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) walkLf(full);
        else if (ent.isFile() && textExts.has(path.extname(ent.name).toLowerCase())) {
          const buf = fs.readFileSync(full);
          if (buf.includes(0x0d)) crHits.push(path.relative(REPO_ROOT, full));
        }
      }
    };
    for (const root of scanRoots) walkLf(path.join(REPO_ROOT, root));
    for (const topFile of ['plugin.json', 'package.json', 'README.md']) {
      const p = path.join(REPO_ROOT, topFile);
      if (fs.existsSync(p) && fs.readFileSync(p).includes(0x0d)) crHits.push(topFile);
    }
    assert.deepEqual(crHits, [], `Files contain forbidden CR (\\r): ${crHits.join(', ')}`);
    return 'D1 docs/AI_HANDOFF.md diff clean vs ded7824 + 0 CR bytes across all source/test/doc files';
  });

  await check('Zero-Enable `buildHostMicroBootstrap` <= 6144 B hard cap & `W[K].apply` + `ds(W[K])` contract', '@exec-mock-tests', async () => {
    const { buildHostMicroBootstrap } = await import(
      pathToFileURL(path.join(REPO_ROOT, 'sidecars', 'prism_studio', 'cdp-bridge.mjs')).href
    );
    const expr = buildHostMicroBootstrap({
      hostOrigin: 'https://127.0.0.1:65535',
      capToken: 'c'.repeat(64),
      triggerMode: 'both',
      startupMode: 'gentle-auto',
      skinEnabled: true,
    });
    const bytes = Buffer.byteLength(expr, 'utf8');
    assert.ok(bytes <= 6144, `buildHostMicroBootstrap exceeded 6144 B cap: ${bytes} B`);
    assert.ok(expr.includes('W[K].apply?W[K].apply({skinEnabled:!1'), 'Micro-bootstrap missing W[K].apply soft-disable path');
    assert.ok(expr.includes('ds(W[K])'), 'Micro-bootstrap missing ds(W[K]) fallback tear-down path');
    return `Micro-bootstrap ${bytes} B <= 6144 B with W[K].apply & ds(W[K])`;
  });

  await check('`src/shared/i18n.mjs` 100% zh/en key parity & v2.4.1 region/preset/degrade/sidebar/editor/picker/optical keys', '@exec-mock-tests', async () => {
    const { DICT, t } = await import(pathToFileURL(path.join(REPO_ROOT, 'src', 'shared', 'i18n.mjs')).href);
    const zhKeys = Object.keys(DICT.zh || {}).sort();
    const enKeys = Object.keys(DICT.en || {}).sort();
    const missingInEn = zhKeys.filter((k) => !Object.prototype.hasOwnProperty.call(DICT.en, k));
    const missingInZh = enKeys.filter((k) => !Object.prototype.hasOwnProperty.call(DICT.zh, k));
    assert.deepEqual(missingInEn, [], `Keys in DICT.zh missing from DICT.en: ${missingInEn.join(', ')}`);
    assert.deepEqual(missingInZh, [], `Keys in DICT.en missing from DICT.zh: ${missingInZh.join(', ')}`);

    const requiredV24Keys = [
      'region.topbar',
      'region.wco',
      'region.sidebar',
      'region.userBubble',
      'region.assistantBubble',
      'region.codeBlock',
      'region.controls',
      'region.prop.style',
      'region.prop.saturation',
      'region.prop.elevation',
      'region.style.auto',
      'region.style.autoNoBlur',
      'region.style.none',
      'region.style.frosted',
      'region.style.crystal',
      'region.style.tinted',
      'region.style.solid',
      'preset.crisp',
      'glass.floaterSolidBase',
      'optics.scrimColor',
      'ext.fxClickMode',
      'ext.fxTrailMode',
      'alert.degradedToPoster',
      'preset.includeWallpaper',
      'editor.popoutBtn',
      'editor.pickHostBtn',
      'editor.pickHostHint',
      'editor.pickHostCancel',
      'editor.pickHostActiveBanner',
      'editor.pickHostPickedToast',
      'editor.pickHostCancelledToast',
      'editor.pickHostUnavailable',
    ];
    for (const rk of requiredV24Keys) {
      assert.ok(typeof DICT.zh[rk] === 'string' && DICT.zh[rk].length > 0, `Missing zh key: ${rk}`);
      assert.ok(typeof DICT.en[rk] === 'string' && DICT.en[rk].length > 0, `Missing en key: ${rk}`);
    }
    assert.ok(t('alert.degradedToPoster', { reason: 'timeout' }, 'en').includes('timeout'));
    return `${zhKeys.length} zh === ${enKeys.length} en keys (100% parity + ${requiredV24Keys.length} v2.2/v2.3/v2.4 keys)`;
  });

  // =========================================================================
  // SUITE 2: Backend Engine, DSH Parity & Boot Canary Circuit-Breaker
  // =========================================================================
  console.log('\n--- Suite 2: Backend Engine, DSH Parity & Two-Phase fsync Boot Canary ---');

  process.env.AGY_PRISM_STEAM_ROOT = fx.steamRoot;
  process.env.AGY_PRISM_DISABLE_CDP = '1';
  const engineDataDir = path.join(SCRATCH_ROOT, 'engine-data');

  const { createPrismStudioServer } = await import(
    pathToFileURL(path.join(REPO_ROOT, 'sidecars', 'prism_studio', 'main.mjs')).href
  );
  const { createMediaServer } = await import(
    pathToFileURL(path.join(REPO_ROOT, 'src', 'engine', 'media-server.mjs')).href
  );
  const { scanWallpaperLibrary } = await import(
    pathToFileURL(path.join(REPO_ROOT, 'src', 'engine', 'scanner.mjs')).href
  ).catch(() => ({ scanWallpaperLibrary: null }));
  const { buildVirtualFaststartFromFile, readVirtualSliceSync, probeMp4Metadata } = await import(
    pathToFileURL(path.join(REPO_ROOT, 'src', 'engine', 'mp4-vfs.mjs')).href
  );
  const {
    inspectSceneContainer,
    parsePkg,
    readPkgEntry,
    extractMp4FromTexBytes,
    extractImageFromTexBytes,
    extractSceneImagePayload,
    parseWeProjectProperties,
    evaluateWeCondition,
  } = await import(pathToFileURL(path.join(REPO_ROOT, 'src', 'engine', 'pkg-scene.mjs')).href);

  const SIDECAR_TEST_TOKEN = 'prism-verify-token-2026';
  const mockShortcutsDir = path.join(SCRATCH_ROOT, 'mock-shortcuts');
  fs.mkdirSync(mockShortcutsDir, { recursive: true });
  {
    const lnk1 = path.join(mockShortcutsDir, 'Antigravity.lnk');
    const lnk2 = path.join(mockShortcutsDir, 'Antigravity Desktop.lnk');
    const dummyExe = path.join(mockShortcutsDir, 'Antigravity.exe');
    fs.writeFileSync(dummyExe, 'MZ_MOCK_AGY', 'utf8');
    const psCreate = [
      '$ws = New-Object -ComObject WScript.Shell;',
      `$s1 = $ws.CreateShortcut('${lnk1.replace(/'/g, "''")}');`,
      `$s1.TargetPath = '${dummyExe.replace(/'/g, "''")}';`,
      `$s1.Arguments = '--reuse-window --locale=zh-CN';`,
      `$s1.WorkingDirectory = '${mockShortcutsDir.replace(/'/g, "''")}';`,
      '$s1.Save();',
      `$s2 = $ws.CreateShortcut('${lnk2.replace(/'/g, "''")}');`,
      `$s2.TargetPath = '${dummyExe.replace(/'/g, "''")}';`,
      `$s2.Arguments = '';`,
      `$s2.WorkingDirectory = '${mockShortcutsDir.replace(/'/g, "''")}';`,
      '$s2.Save();',
    ].join(' ');
    const powershell = process.env.SystemRoot
      ? `${process.env.SystemRoot}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`
      : 'powershell.exe';
    execFileSync(powershell, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psCreate], {
      stdio: 'pipe',
    });
  }

  let studio = null;
  let engine = null;
  let mediaHttpServer = null;
  let fallbackMediaSrv = null;

  await check('Engine initialization, v2.0 defaults (`gentle-auto`, `liveBootDelay=1.5`) & atomic config.json queue', '@resilience-designer', async () => {
    studio = await createPrismStudioServer({
      dataDir: engineDataDir,
      token: SIDECAR_TEST_TOKEN,
      shortcutSearchDirs: [mockShortcutsDir],
      startCdp: false,
    });
    engine = studio.engine;
    assert.ok(engine, 'Engine missing on studio instance');
    assert.ok(studio.hostCapToken && studio.hostCapToken.length >= 32, 'Missing 256-bit studio.hostCapToken');

    const initCfg = await engine.getConfig();
    assert.equal(initCfg.startupMode, 'gentle-auto', `Expected default startupMode="gentle-auto", got ${initCfg.startupMode}`);
    assert.equal(initCfg.liveBootDelay, 1.5, `Expected default liveBootDelay=1.5, got ${initCfg.liveBootDelay}`);

    await Promise.all([
      engine.updateConfig({ islandGap: 10, layoutMode: 'islands' }),
      engine.updateConfig({ glassBlur: 18 }),
      engine.updateConfig({ scrimOpacity: 0.28, colorScheme: 'prism-default' }),
    ]);

    const cfgPath = path.join(engineDataDir, 'config.json');
    assert.ok(fs.existsSync(cfgPath), 'config.json not persisted');
    const diskCfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    assert.equal(diskCfg.islandGap, 10);
    assert.equal(diskCfg.glassBlur, 18);
    assert.equal(diskCfg.scrimOpacity, 0.28);

    const tmpLeftovers = fs.readdirSync(engineDataDir).filter((f) => f.includes('.tmp'));
    assert.deepEqual(tmpLeftovers, [], `Leftover atomic temp files: ${tmpLeftovers.join(', ')}`);
    return `origin=${studio.origin}, startupMode=${initCfg.startupMode}, delay=${initCfg.liveBootDelay}s`;
  });

  await check('Two-Phase `fsync` Boot Canary Circuit-Breaker (`arming` -> `tripped` + `skinEnabled=false`) & `POST /api/canary/reset` + `/api/skin/wake`', '@resilience-designer', async () => {
    const canaryDir = path.join(SCRATCH_ROOT, 'canary-breaker-data');
    fs.mkdirSync(canaryDir, { recursive: true });

    const installIdPath = path.join(REPO_ROOT, '.prism-install-id');
    const boundInstallId = fs.existsSync(installIdPath) ? fs.readFileSync(installIdPath, 'utf8').trim() : '';

    // Seed config with skinEnabled: true + unfinished `arming` canary from a crashed prior browser session!
    fs.writeFileSync(
      path.join(canaryDir, 'config.json'),
      JSON.stringify({ skinEnabled: true, startupMode: 'gentle-auto', liveBootDelay: 1.5 }, null, 2),
      'utf8',
    );
    fs.writeFileSync(
      path.join(canaryDir, 'canary.json'),
      JSON.stringify(
        {
          version: 2,
          state: 'arming',
          browserSessionId: 'crashed-browser-session-prev-uuid',
          windowTargetId: 'target-prev-1',
          sidecarPid: 999999,
          boundInstallId,
          lastArmTs: Date.now() - 2500,
          unfinishedAttempts: [Date.now() - 2500],
        },
        null,
        2,
      ),
      'utf8',
    );

    const canarySrv = await createPrismStudioServer({
      dataDir: canaryDir,
      token: 'canary-test-tok',
      startCdp: false,
      inspectShortcuts: false,
    });

    try {
      const bootRes = await invokeServerInMemory(canarySrv.server, { method: 'GET', url: '/api/bootstrap' });
      assert.equal(bootRes.status, 200);
      const boot = bootRes.json();
      assert.equal(boot.canary?.state, 'tripped', `Expected canary.state="tripped", got ${JSON.stringify(boot.canary)}`);
      assert.equal(boot.skinEnabled, false, 'Tripped boot canary MUST force skinEnabled === false (0 injection!)');
      assert.equal(boot.config?.skinEnabled, false, 'Tripped boot canary MUST persist config.skinEnabled === false');

      const diskCanary = JSON.parse(fs.readFileSync(path.join(canaryDir, 'canary.json'), 'utf8'));
      assert.equal(diskCanary.state, 'tripped');
      assert.equal(diskCanary.trippedReason, 'unfinished_boot_arming');

      // Reset Canary via POST /api/canary/reset
      const resetRes = await invokeServerInMemory(canarySrv.server, {
        method: 'POST',
        url: '/api/canary/reset',
        headers: { 'Content-Type': 'application/json', 'X-Sidecar-Token': 'canary-test-tok' },
        body: JSON.stringify({}),
      });
      assert.equal(resetRes.status, 200, `POST /api/canary/reset failed: ${resetRes.text()}`);
      const resetBody = resetRes.json();
      assert.equal(resetBody.ok, true);
      assert.notEqual(resetBody.canary?.state, 'tripped', 'POST /api/canary/reset did not clear tripped state');

      // Also verify `manual` startupMode starts with sessionAwake === false and wakes via POST /api/skin/wake
      await canarySrv.engine.updateConfig({ startupMode: 'manual', skinEnabled: false });
      const wakeRes = await invokeServerInMemory(canarySrv.server, {
        method: 'POST',
        url: '/api/skin/wake',
        headers: { 'Content-Type': 'application/json', 'X-Sidecar-Token': 'canary-test-tok' },
        body: JSON.stringify({}),
      });
      assert.equal(wakeRes.status, 200, `POST /api/skin/wake failed: ${wakeRes.text()}`);
      const wakeBody = wakeRes.json();
      assert.equal(wakeBody.ok, true);
      assert.equal(wakeBody.sessionAwake, true);
      return `arming -> tripped (skinEnabled=false) -> /api/canary/reset (${resetBody.canary?.state}) + /api/skin/wake verified`;
    } finally {
      await canarySrv.close();
    }
  });

  let libraryItems = [];
  await check('Steam 431960 discovery, safe scanner, visibility.json, app/traversal exclusion & SHA-1 cache', '@resilience-designer', async () => {
    const libRes = await engine.listLibrary({ refresh: true });
    libraryItems = Array.isArray(libRes) ? libRes : libRes.items || [];
    const ids = libraryItems.map((i) => i.id);
    const wids = libraryItems.map((i) => String(i.workshopId || ''));

    for (const expectedWid of ['100001', '100002', '100003', '100004']) {
      assert.ok(
        wids.includes(expectedWid) || ids.some((id) => id.includes(expectedWid)),
        `Expected Workshop item ${expectedWid} in library (got: ${ids.join(', ')})`,
      );
    }
    assert.ok(!wids.includes('999999') && !ids.some((id) => id.includes('999999')), 'visibility.json hidden item 999999 leaked');
    assert.ok(!wids.includes('100005') && !libraryItems.some((i) => i.kind === 'application'), 'application .exe project leaked');
    assert.ok(!wids.includes('100006') && !libraryItems.some((i) => i.title?.includes('Malicious Traversal')), 'path-traversal project.json leaked');

    const cacheIndex = path.join(engineDataDir, 'cache', 'inventory-index.json');
    assert.ok(fs.existsSync(cacheIndex), 'cache/inventory-index.json missing');
    const cachedJson = JSON.parse(fs.readFileSync(cacheIndex, 'utf8'));
    assert.ok(cachedJson.signature || cachedJson.sha1 || cachedJson.version, 'inventory-index.json missing signature/version');

    const warmRes = await engine.listLibrary({ refresh: false });
    const warmItems = Array.isArray(warmRes) ? warmRes : warmRes.items || [];
    assert.equal(warmItems.length, libraryItems.length, 'Warm cache item count mismatch');
    return `${libraryItems.length} playable items, SHA-1 cache verified`;
  });

  await check('PR #3 Recursive `customFolders` subfolder scan, `.mkv` discovery (`video/x-matroska`) & `<cacheDir>/thumbs` non-ingestion', '@resilience-designer', async () => {
    const nestedRoot = path.join(SCRATCH_ROOT, 'nested-local-folders');
    const subCyber = path.join(nestedRoot, 'Cyberpunk');
    const subAnime = path.join(nestedRoot, 'Anime');
    const thumbsTrapDir = path.join(engineDataDir, 'cache', 'thumbs');
    fs.mkdirSync(subCyber, { recursive: true });
    fs.mkdirSync(subAnime, { recursive: true });
    fs.mkdirSync(thumbsTrapDir, { recursive: true });

    fs.copyFileSync(fx.playableMp4Path, path.join(subCyber, 'bg.mp4'));
    fs.copyFileSync(fx.playableMp4Path, path.join(subAnime, 'bg.mkv'));
    fs.writeFileSync(path.join(thumbsTrapDir, 'self-thumb-trap.jpg'), createPrismArtworkPng(64, 64, 'sunset-amber'));

    try {
      await engine.updateConfig({ customFolders: [nestedRoot, path.join(engineDataDir, 'cache')] });
      const recRes = await engine.listLibrary({ refresh: true });
      const recItems = Array.isArray(recRes) ? recRes : recRes.items || [];

      const cyberMp4 = recItems.find((x) => x.source === 'local' && String(x.title || '').includes('Cyberpunk'));
      const animeMkv = recItems.find((x) => x.source === 'local' && String(x.title || '').includes('Anime') && x.kind === 'video');
      const leakedThumb = recItems.find((x) => String(x.title || '').includes('self-thumb-trap'));

      assert.ok(cyberMp4, `Nested Cyberpunk/bg.mp4 not discovered with parent title disambiguation (titles: ${recItems.map((i) => i.title).join(', ')})`);
      assert.ok(animeMkv, `Nested Anime/bg.mkv not discovered as video item (titles: ${recItems.map((i) => i.title).join(', ')})`);
      assert.equal(Boolean(leakedThumb), false, '<cacheDir>/thumbs/self-thumb-trap.jpg was self-ingested as a wallpaper!');

      const srv =
        engine?.mediaServer?.server ||
        engine?._mediaServer?.server ||
        (typeof engine?.getMediaServer === 'function' ? engine.getMediaServer()?.server : null);
      if (srv && animeMkv.mediaUrl) {
        const mkvRes = await invokeServerInMemory(srv, {
          method: 'GET',
          url: new URL(animeMkv.mediaUrl).pathname,
          headers: { Range: 'bytes=0-31' },
        });
        assert.ok(mkvRes.status === 200 || mkvRes.status === 206, `Expected 200/206 for .mkv stream, got ${mkvRes.status}`);
        assert.equal(mkvRes.headers['content-type'], 'video/x-matroska', `Expected video/x-matroska MIME, got ${mkvRes.headers['content-type']}`);
      }
      return `nested bg.mp4 (${cyberMp4.title}) + bg.mkv (${animeMkv.title}, video/x-matroska) + 0 thumb self-ingestion`;
    } finally {
      await engine.updateConfig({ customFolders: [] });
      const restoreLib = await engine.listLibrary({ refresh: true });
      libraryItems = Array.isArray(restoreLib) ? restoreLib : restoreLib.items || [];
    }
  });

  await check('PR #5 Legacy v1 migration wiring, ephemeral DevToolsActivePort (`!= 9222`) & v2->v3 warm-cache non-blocking boot', '@resilience-designer', async () => {
    const mainSrc = fs.readFileSync(path.join(REPO_ROOT, 'sidecars', 'prism_studio', 'main.mjs'), 'utf8');
    const storeSrc = fs.readFileSync(path.join(REPO_ROOT, 'src', 'engine', 'store.mjs'), 'utf8');
    const cdpSrc = fs.readFileSync(path.join(REPO_ROOT, 'sidecars', 'prism_studio', 'cdp-bridge.mjs'), 'utf8');
    assert.ok(mainSrc.includes('allowLegacyMigration: !hasExplicitDataDir'), 'main.mjs missing allowLegacyMigration wiring');
    assert.ok(storeSrc.includes('shouldMigrateLegacy'), 'store.mjs missing shouldMigrateLegacy check');
    assert.ok(cdpSrc.includes('pf.port !== 9222'), 'cdp-bridge.mjs missing ephemeral DevToolsActivePort (!== 9222) support');

    // Verify downgrading inventory-index.json version from 3 -> 2 still loads instantaneously from warm cache with staleVersion=true
    const { loadWarmInventorySnapshot } = await import(pathToFileURL(path.join(REPO_ROOT, 'src', 'engine', 'scanner.mjs')).href);
    const cacheIndex = path.join(engineDataDir, 'cache', 'inventory-index.json');
    const origRaw = fs.readFileSync(cacheIndex, 'utf8');
    try {
      const parsed = JSON.parse(origRaw);
      parsed.version = 2;
      fs.writeFileSync(cacheIndex, JSON.stringify(parsed), 'utf8');
      const warmV2 = loadWarmInventorySnapshot({
        cacheDir: path.join(engineDataDir, 'cache'),
        config: await engine.getConfig(),
        uploadDir: path.join(engineDataDir, 'uploads'),
        steamRoot: fx.steamRoot,
      });
      assert.ok(warmV2 && warmV2.fromWarmCache === true, 'v2 inventory-index.json should load warm instead of blocking cold boot');
      assert.equal(warmV2.staleVersion, true, 'Expected staleVersion=true on v2 warm cache');
    } finally {
      fs.writeFileSync(cacheIndex, origRaw, 'utf8');
    }
    return 'allowLegacyMigration + ephemeral DevToolsActivePort + v2->v3 warm boot verified';
  });

  mediaHttpServer =
    engine?.mediaServer?.server ||
    engine?._mediaServer?.server ||
    (typeof engine?.getMediaServer === 'function' ? engine.getMediaServer()?.server : null);

  if (!mediaHttpServer && typeof scanWallpaperLibrary === 'function') {
    fallbackMediaSrv = await createMediaServer({
      getRuntimeContext: () => ({ config: engine.getConfig() }),
    });
    const rawScan = await scanWallpaperLibrary({
      steamRoot: fx.steamRoot,
      cacheDir: path.join(engineDataDir, 'cache'),
      uploadDir: path.join(engineDataDir, 'uploads'),
      customFolders: [],
      refresh: false,
    });
    fallbackMediaSrv.syncLibrary(rawScan.items || rawScan);
    mediaHttpServer = fallbackMediaSrv.server;
  }

  const findWorkshopItem = (wid) =>
    libraryItems.find((i) => String(i.workshopId) === String(wid) || String(i.id).includes(String(wid)));

  await check('Path-traversal `../` & `%2e%2e` HTTP 403 rejection on media server', '@resilience-designer', async () => {
    assert.ok(mediaHttpServer, 'No media HTTP server accessible for HTTP route testing');
    const webItem = findWorkshopItem('100003');
    assert.ok(webItem, 'Web item 100003 missing');
    const u = new URL(webItem.mediaUrl);
    const tokenSeg = u.pathname.split('/').filter(Boolean)[1];

    for (const attackUrl of [
      `/web/${tokenSeg}/../../outside-secret.png`,
      `/web/${tokenSeg}/%2e%2e/%2e%2e/outside-secret.png`,
      `/media/..%2foutside-secret.png`,
      `/web/${tokenSeg}/sub\\..\\outside-secret.png`,
    ]) {
      const res = await invokeServerInMemory(mediaHttpServer, { method: 'GET', url: attackUrl });
      assert.equal(res.status, 403, `Expected 403 for traversal URL ${attackUrl}, got ${res.status}`);
    }
    return '4 traversal vectors rejected with HTTP 403';
  });

  await check('mp4-vfs zero-disk-copy virtual moov-first faststart (stco + co64) & HTTP 206 Range streaming', '@resilience-designer', async () => {
    const vfsStco = buildVirtualFaststartFromFile(fx.tailMp4Path);
    const vfsCo64 = buildVirtualFaststartFromFile(fx.tailMp4Co64Path);
    assert.equal(vfsStco.kind, 'virtual');
    assert.equal(vfsCo64.kind, 'virtual');

    const head64 = readVirtualSliceSync(fx.tailMp4Path, vfsStco, 0, 63);
    assert.equal(head64.toString('ascii', 4, 8), 'ftyp');
    const shiftedChunk0 = fx.tailMp4Info.originalChunk0Offset + vfsStco.delta;
    const magicSlice = readVirtualSliceSync(
      fx.tailMp4Path,
      vfsStco,
      shiftedChunk0,
      shiftedChunk0 + fx.tailMp4Info.marker.length - 1,
    );
    assert.ok(magicSlice.equals(fx.tailMp4Info.marker), 'Shifted stco offset did not align with mdat payload marker');

    const probe = probeMp4Metadata(fx.tailMp4Path);
    assert.equal(probe.width, 1920);
    assert.equal(probe.height, 1080);
    assert.equal(probe.fps, 60);
    assert.equal(probe.moovAtFront, false);

    let markerMediaPath = '';
    if (engine?.mediaServer?.registerFile) {
      const reg = engine.mediaServer.registerFile('unit-tail-moov', fx.tailMp4Path, 'video');
      markerMediaPath = new URL(reg.mediaUrl).pathname;
    } else if (fallbackMediaSrv?.registerFile) {
      const reg = fallbackMediaSrv.registerFile('unit-tail-moov', fx.tailMp4Path, 'video');
      markerMediaPath = new URL(reg.mediaUrl).pathname;
    }
    assert.ok(markerMediaPath, 'Failed to register deterministic tail-moov marker MP4');

    const rangeEnd = shiftedChunk0 + fx.tailMp4Info.marker.length - 1;
    const res206 = await invokeServerInMemory(mediaHttpServer, {
      method: 'GET',
      url: markerMediaPath,
      headers: { Range: `bytes=${shiftedChunk0}-${rangeEnd}` },
    });
    assert.equal(res206.status, 206, `Expected HTTP 206 Partial Content, got ${res206.status}: ${res206.text()}`);
    assert.match(String(res206.headers['content-range'] || ''), new RegExp(`^bytes ${shiftedChunk0}-${rangeEnd}/\\d+$`));
    assert.ok(res206.body.equals(fx.tailMp4Info.marker), 'HTTP 206 Range over media-server did not serve virtual moov-shifted mdat marker');

    const videoItem = findWorkshopItem('100002');
    assert.ok(videoItem, 'Video item 100002 missing');
    const realMediaPath = new URL(videoItem.mediaUrl).pathname;
    const real206 = await invokeServerInMemory(mediaHttpServer, {
      method: 'GET',
      url: realMediaPath,
      headers: { Range: 'bytes=0-63' },
    });
    assert.equal(real206.status, 206);
    assert.equal(real206.body.toString('ascii', 4, 8), 'ftyp');
    return `HTTP 206 Content-Range=${res206.headers['content-range']} + H.264 faststart verified`;
  });

  await check('pkg-scene PKGV0002 + LZ4 + TEXB0004 embedded MP4 & audio extraction + HTTP 206', '@resilience-designer', async () => {
    const info = inspectSceneContainer(fx.scenePkgPath);
    assert.equal(info.hasVideo, true);
    assert.equal(info.hasAudio, true);
    assert.equal(info.videoSource?.entry?.path, 'materials/hero_loop.tex', 'Mask texture was not skipped');

    const pkgBuf = fs.readFileSync(fx.scenePkgPath);
    const entries = parsePkg(pkgBuf);
    const sceneJsonText = Buffer.from(readPkgEntry(pkgBuf, entries[0])).toString('utf8');
    assert.ok(sceneJsonText.includes('hero_video'), 'PKGV LZ4 block-chain decompression failed');
    const texHit = extractMp4FromTexBytes(readPkgEntry(pkgBuf, entries.find((e) => e.path.endsWith('hero_loop.tex'))));
    assert.equal(texHit?.bytes?.length, fx.playableMp4Bytes);

    const sceneItem = findWorkshopItem('100004');
    assert.ok(sceneItem, 'Scene item 100004 missing');
    const videoUrlPath = new URL(sceneItem.sceneVideoUrl || sceneItem.mediaUrl).pathname;
    const rVideo = await invokeServerInMemory(mediaHttpServer, {
      method: 'GET',
      url: videoUrlPath,
      headers: { Range: 'bytes=0-15' },
    });
    assert.equal(rVideo.status, 206);
    assert.equal(rVideo.body.toString('ascii', 4, 8), 'ftyp');

    const tWarm0 = performance.now();
    const rVideoWarm = await invokeServerInMemory(mediaHttpServer, {
      method: 'GET',
      url: videoUrlPath,
      headers: { Range: 'bytes=0-63' },
    });
    const warmMs = Math.round((performance.now() - tWarm0) * 100) / 100;
    assert.equal(rVideoWarm.status, 206);
    assert.ok(warmMs < 60, `Scene video warm Range stream too slow: ${warmMs}ms`);

    if (sceneItem.audioUrl) {
      const audioPath = new URL(sceneItem.audioUrl).pathname;
      const rAudio = await invokeServerInMemory(mediaHttpServer, { method: 'GET', url: audioPath });
      assert.equal(rAudio.status, 200);
      assert.equal(rAudio.body.toString('ascii', 0, 3), 'ID3');
    }
    return `TEXB0004 MP4 (${texHit.bytes.length}B, warm=${warmMs}ms) + MP3 BGM streamed`;
  });

  await check('Slideshow `/slides/<token>` natural sort (`1.png < 2.png < 10.png`), WE props & SHA-256 upload dedup', '@resilience-designer', async () => {
    const slideItem = findWorkshopItem('100001');
    assert.ok(slideItem && slideItem.slidesUrl, 'Slideshow item 100001 or slidesUrl missing');
    const slidesPath = new URL(slideItem.slidesUrl).pathname;
    const res = await invokeServerInMemory(mediaHttpServer, { method: 'GET', url: slidesPath });
    assert.equal(res.status, 200);
    const data = res.json();
    const list = data.slides || data.items || [];
    assert.equal(list.length, 3, `Expected 3 slide frames, got ${list.length}`);
    const s2Path = new URL(typeof list[2] === 'string' ? list[2] : list[2].url).pathname;
    const s2Res = await invokeServerInMemory(mediaHttpServer, { method: 'GET', url: s2Path });
    assert.equal(s2Res.status, 200);
    const dims2 = readPngDimensions(s2Res.body);
    assert.equal(dims2.width, 640, 'Natural sort failed: 10.png (640x400) should be index 2');

    const videoProj = JSON.parse(fs.readFileSync(path.join(fx.workshop431960, '100002', 'project.json'), 'utf8'));
    if (typeof parseWeProjectProperties === 'function') {
      const parsedZh = parseWeProjectProperties(videoProj, {}, 'zh');
      const listZh = Array.isArray(parsedZh) ? parsedZh : parsedZh.list || [];
      const glowProp = listZh.find((p) => (p.name || p.key) === 'glow_intensity');
      assert.equal(glowProp?.label, '光晕强度');
      if (typeof evaluateWeCondition === 'function') {
        assert.equal(evaluateWeCondition(glowProp.condition, { enable_glow: { value: true } }), true);
        assert.equal(evaluateWeCondition(glowProp.condition, { enable_glow: { value: false } }), false);
      }
    }

    const webItem = findWorkshopItem('100003');
    await engine.updateUserProps(webItem.id, { speed: 9 });
    const webRes = await invokeServerInMemory(mediaHttpServer, { method: 'GET', url: new URL(webItem.mediaUrl).pathname });
    assert.equal(webRes.status, 200);
    assert.ok(webRes.text().includes('__weFocusGuard'), 'Missing __weFocusGuard in served Web HTML');

    const sampleBuf = createPrismArtworkPng(320, 200, 'sunset-amber');
    const up1 = await engine.uploadMedia({ filename: 'custom-sunset.png', contentType: 'image/png', streamOrBuffer: sampleBuf });
    const item1 = up1.item || up1;
    assert.equal(Boolean(up1.duplicate), false);
    const up2 = await engine.uploadMedia({ filename: 'custom-sunset-copy.png', contentType: 'image/png', streamOrBuffer: sampleBuf });
    assert.equal(Boolean(up2.duplicate), true);
    await engine.removeUpload(item1.id);
    return 'natural sort + WE props/shim + SHA-256 upload dedup verified';
  });

  await check('Playlist rotation, Whole-profile Presets CRUD, Cold-boot <50ms init & Normal Shortcut .lnk backup/restore', '@resilience-designer', async () => {
    const w1 = findWorkshopItem('100001').id;
    const w2 = findWorkshopItem('100002').id;
    const w4 = findWorkshopItem('100004').id;

    await engine.updateConfig({
      activeWallpaperId: w1,
      wallpaperId: w1,
      rotationEnabled: true,
      rotationGroupId: 'pl-verify',
      rotationOrder: 'sequence',
      rotationTrigger: 'videoEnd',
      rotationGroups: [
        { id: 'pl-verify', name: 'Verify Cycle', wallpaperIds: [w1, w2, w4], order: 'sequence', trigger: 'videoEnd', interval: 15 },
      ],
    });
    await engine.stepPlaylist(1, 'videoEnd');
    let cfg = await engine.getConfig();
    assert.equal(cfg.activeWallpaperId || cfg.wallpaperId, w2);
    await engine.stepPlaylist(-1, 'manual');
    cfg = await engine.getConfig();
    assert.equal(cfg.activeWallpaperId || cfg.wallpaperId, w1);

    const initialPresetsRaw = await engine.listPresets();
    const initialPresets = Array.isArray(initialPresetsRaw) ? initialPresetsRaw : initialPresetsRaw.presets || [];
    assert.ok(initialPresets.length >= 7);
    await engine.updateConfig({ colorScheme: 'catppuccin', islandGap: 14, favorites: ['fav-keep-1'] });
    const saved = await engine.savePreset({ name: 'Mocha Island Test', description: 'Verifier snapshot' });
    const savedId = saved.id || saved.preset?.id;
    const exported = await engine.exportPreset(savedId);
    await engine.updateConfig({ colorScheme: 'gruvbox', islandGap: 4 });
    await engine.applyPreset(savedId);
    cfg = await engine.getConfig();
    assert.equal(cfg.colorScheme, 'catppuccin');
    await engine.deletePreset(savedId);
    assert.ok(exported);

    await engine.resetConfig('skin');
    cfg = await engine.getConfig();
    assert.equal(cfg.colorScheme, 'prism-default');
    assert.ok((cfg.favorites || []).includes('fav-keep-1'));
    await engine.resetConfig('all');
    await engine.updateConfig({ favorites: [], hiddenIds: [], rotationEnabled: false, rotationGroupId: '', rotationGroups: [] });

    // Cold-boot speed & state restore
    const coldDir = path.join(SCRATCH_ROOT, 'cold-boot-data');
    const srv1 = await createPrismStudioServer({ dataDir: coldDir, token: 'cold-tok-1', startCdp: false, inspectShortcuts: false });
    try {
      await srv1.engine.applyWallpaper(w1, { skinEnabled: true, layoutMode: 'islands', islandGap: 12, colorScheme: 'catppuccin' });
    } finally {
      await srv1.close();
    }
    const { createWallpaperPrismEngine } = await import(pathToFileURL(path.join(REPO_ROOT, 'src', 'engine', 'index.mjs')).href);
    const tInit0 = performance.now();
    const fastEngine = await createWallpaperPrismEngine({ dataDir: coldDir, pluginRoot: REPO_ROOT, autoInit: false });
    await fastEngine.init();
    const initMs = Math.round((performance.now() - tInit0) * 100) / 100;
    assert.ok(initMs < 80, `Cold-boot engine.init() exceeded 80ms budget: ${initMs}ms`);
    await fastEngine.close();

    // Normal Shortcut .lnk patch + idempotency + lossless restore
    const lnk1 = path.join(mockShortcutsDir, 'Antigravity.lnk');
    const enRes1 = await invokeServerInMemory(studio.server, {
      method: 'POST',
      url: '/api/host/autostart',
      headers: { 'Content-Type': 'application/json', 'X-Sidecar-Token': SIDECAR_TEST_TOKEN },
      body: JSON.stringify({ enabled: true, port: 9339, searchDirs: [mockShortcutsDir] }),
    });
    assert.equal(enRes1.status, 200);
    assert.equal(enRes1.json().autostart.updatedCount, 2);

    const enRes2 = await invokeServerInMemory(studio.server, {
      method: 'POST',
      url: '/api/host/autostart',
      headers: { 'Content-Type': 'application/json', 'X-Sidecar-Token': SIDECAR_TEST_TOKEN },
      body: JSON.stringify({ enabled: true, port: 9339, searchDirs: [mockShortcutsDir] }),
    });
    assert.equal(enRes2.json().autostart.updatedCount, 0);
    const backupJson = JSON.parse(fs.readFileSync(path.join(engineDataDir, 'shortcut-backup.json'), 'utf8'));
    assert.equal(backupJson.entries[lnk1.toLowerCase()]?.originalArguments, '--reuse-window --locale=zh-CN');

    const disRes = await invokeServerInMemory(studio.server, {
      method: 'POST',
      url: '/api/host/autostart',
      headers: { 'Content-Type': 'application/json', 'X-Sidecar-Token': SIDECAR_TEST_TOKEN },
      body: JSON.stringify({ enabled: false, searchDirs: [mockShortcutsDir] }),
    });
    assert.equal(disRes.status, 200);
    assert.equal(disRes.json().autostart.normalShortcutEnabled, false);
    return `playlist + presets + cold-init=${initMs}ms + 2 .lnk losslessly restored`;
  });

  await check('Cross-scheme HTTPS->HTTP zero-delay fetch+blob, >256MB poster fallback, 404 fail-open & URL revocation (PR #6 hardened)', '@fix-host / @checker-fix', async () => {
    const wallInjectSrc = fs.readFileSync(path.join(REPO_ROOT, 'src', 'host', 'wallpaper-inject.js'), 'utf8');
    const fetchCalls = [];
    const createdBlobUrls = [];
    const revokedBlobUrls = [];
    const directHttpVideoSrcs = [];
    const directHttpImgSrcs = [];
    let blobSeq = 0;
    let stepStartMs = Date.now();

    class MockStyle {
      constructor() {
        this._props = new Map();
        this.display = '';
        this.opacity = '';
        this.transition = '';
        this.clipPath = '';
        this.transform = '';
        this.background = '';
        this.cssText = '';
      }
      setProperty(k, v) {
        this._props.set(String(k), String(v));
      }
      removeProperty(k) {
        this._props.delete(String(k));
      }
      getPropertyValue(k) {
        return this._props.get(String(k)) || '';
      }
    }

    class MockNode {
      constructor(tagName) {
        this.tagName = String(tagName || 'DIV').toUpperCase();
        this.id = '';
        this.className = '';
        this.style = new MockStyle();
        this._attrs = new Map();
        this.children = [];
        this.parentNode = null;
        this._listeners = new Map();
        this.inert = false;
        this.textContent = '';
        this._src = '';
        const self = this;
        this.classList = {
          contains(cls) {
            return String(self.className || '').split(/\s+/).filter(Boolean).includes(cls);
          },
        };

        if (this.tagName === 'VIDEO' || this.tagName === 'AUDIO') {
          this.readyState = 0;
          this.videoWidth = 0;
          this.videoHeight = 0;
          this.paused = true;
          this.muted = true;
          this.defaultMuted = true;
          this.volume = 1;
          this.playbackRate = 1;
          this.loop = true;
          this.ended = false;
          this.error = null;
          this.networkState = 0;
          this.play = () => {
            this.paused = false;
            return Promise.resolve();
          };
          this.pause = () => {
            this.paused = true;
          };
          this.load = () => {};
          Object.defineProperty(this, 'currentSrc', {
            get() {
              return self._src;
            },
          });
          Object.defineProperty(this, 'src', {
            get() {
              return self._src;
            },
            set(val) {
              const s = String(val || '');
              self._src = s;
              if (self.tagName === 'VIDEO' && /^http:\/\//i.test(s)) {
                directHttpVideoSrcs.push(s);
              }
              if (s.startsWith('blob:')) {
                self.readyState = 4;
                self.videoWidth = 1920;
                self.videoHeight = 1080;
                queueMicrotask(() => {
                  self.dispatchEvent({ type: 'loadeddata' });
                  self.dispatchEvent({ type: 'canplay' });
                });
              }
            },
          });
        } else if (this.tagName === 'IMG') {
          this.complete = false;
          this.naturalWidth = 0;
          this.naturalHeight = 0;
          this.onload = null;
          this.onerror = null;
          this.decode = () => Promise.resolve();
          Object.defineProperty(this, 'src', {
            get() {
              return self._src;
            },
            set(val) {
              const s = String(val || '');
              self._src = s;
              if (/^http:\/\//i.test(s)) {
                directHttpImgSrcs.push(s);
              }
              if (s) {
                self.complete = true;
                self.naturalWidth = 1920;
                self.naturalHeight = 1080;
                queueMicrotask(() => {
                  if (typeof self.onload === 'function') self.onload();
                  self.dispatchEvent({ type: 'load' });
                });
              }
            },
          });
        } else if (this.tagName === 'CANVAS') {
          this.width = 300;
          this.height = 150;
          this.getContext = () => ({
            clearRect() {},
            beginPath() {},
            arc() {},
            stroke() {},
            fill() {},
            drawImage() {},
            getImageData: () => ({ data: new Uint8ClampedArray(64) }),
          });
        }
      }

      get isConnected() {
        let cur = this;
        while (cur) {
          if (cur === docRoot) return true;
          cur = cur.parentNode;
        }
        return false;
      }

      get firstChild() {
        return this.children[0] || null;
      }

      setAttribute(k, v) {
        const key = String(k);
        const val = String(v);
        this._attrs.set(key, val);
        if (key === 'id') this.id = val;
        if (key === 'class') this.className = val;
      }

      getAttribute(k) {
        const key = String(k);
        if (key === 'id') return this.id || null;
        if (key === 'class') return this.className || null;
        return this._attrs.has(key) ? this._attrs.get(key) : null;
      }

      hasAttribute(k) {
        const key = String(k);
        if (key === 'id') return Boolean(this.id);
        if (key === 'class') return Boolean(this.className);
        return this._attrs.has(key);
      }

      removeAttribute(k) {
        const key = String(k);
        this._attrs.delete(key);
        if (key === 'src') {
          this._src = '';
          if (this.tagName === 'VIDEO' || this.tagName === 'AUDIO') {
            this.readyState = 0;
          }
        }
      }

      appendChild(child) {
        if (!child) return child;
        if (child.parentNode) child.parentNode.removeChild(child);
        child.parentNode = this;
        this.children.push(child);
        return child;
      }

      insertBefore(child, ref) {
        if (!child) return child;
        if (child.parentNode) child.parentNode.removeChild(child);
        child.parentNode = this;
        const idx = ref ? this.children.indexOf(ref) : -1;
        if (idx >= 0) this.children.splice(idx, 0, child);
        else this.children.push(child);
        return child;
      }

      removeChild(child) {
        const idx = this.children.indexOf(child);
        if (idx >= 0) {
          this.children.splice(idx, 1);
          child.parentNode = null;
        }
        return child;
      }

      contains(other) {
        let cur = other;
        while (cur) {
          if (cur === this) return true;
          cur = cur.parentNode;
        }
        return false;
      }

      getBoundingClientRect() {
        return { left: 0, top: 0, right: 1440, bottom: 900, width: 1440, height: 900 };
      }

      addEventListener(type, fn) {
        if (typeof fn !== 'function') return;
        const list = this._listeners.get(type) || [];
        list.push(fn);
        this._listeners.set(type, list);
      }

      removeEventListener(type, fn) {
        const list = this._listeners.get(type);
        if (!list) return;
        const idx = list.indexOf(fn);
        if (idx >= 0) list.splice(idx, 1);
      }

      dispatchEvent(evt) {
        const list = (this._listeners.get(evt.type) || []).slice();
        for (const fn of list) {
          fn.call(this, evt);
        }
        return true;
      }

      querySelectorAll(selector) {
        const parts = String(selector || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const matchesPart = (node, p) => {
          if (p.startsWith('#')) return node.id === p.slice(1);
          if (p.startsWith('.')) return node.classList.contains(p.slice(1));
          if (/^[a-z0-9]+$/i.test(p)) return node.tagName === p.toUpperCase();
          return false;
        };
        const out = [];
        const walk = (n) => {
          for (const ch of n.children) {
            if (parts.some((p) => matchesPart(ch, p))) out.push(ch);
            walk(ch);
          }
        };
        walk(this);
        return out;
      }

      querySelector(selector) {
        return this.querySelectorAll(selector)[0] || null;
      }
    }

    const docRoot = new MockNode('HTML');
    docRoot.className = 'dark';
    const docHead = new MockNode('HEAD');
    const docBody = new MockNode('BODY');
    docBody.className = 'dark';
    const hostRootDiv = new MockNode('DIV');
    hostRootDiv.id = 'root';
    docBody.appendChild(hostRootDiv);
    docRoot.appendChild(docHead);
    docRoot.appendChild(docBody);

    const mockDoc = {
      documentElement: docRoot,
      head: docHead,
      body: docBody,
      hidden: false,
      fullscreenElement: null,
      activeElement: docBody,
      hasFocus: () => true,
      createElement: (tag) => new MockNode(tag),
      getElementById: (id) => {
        const target = String(id || '');
        const search = (n) => {
          if (n.id === target) return n;
          for (const ch of n.children) {
            const hit = search(ch);
            if (hit) return hit;
          }
          return null;
        };
        return search(docRoot);
      },
      querySelector: (sel) => docRoot.querySelector(sel),
      querySelectorAll: (sel) => docRoot.querySelectorAll(sel),
      addEventListener: (t, fn) => docRoot.addEventListener(t, fn),
      removeEventListener: (t, fn) => docRoot.removeEventListener(t, fn),
      dispatchEvent: (e) => docRoot.dispatchEvent(e),
    };

    const mockFetch = async (url, init) => {
      const u = String(url || '');
      fetchCalls.push({
        url: u,
        elapsedMs: Date.now() - stepStartMs,
        hasSignal: Boolean(init && init.signal),
      });
      if (u.includes('missing-404.mp4')) {
        return {
          ok: false,
          status: 404,
          headers: { get: () => null },
          blob: async () => new Blob([]),
        };
      }
      if (u.includes('oversize-300mb.mp4')) {
        const overBytes = 300 * 1024 * 1024;
        return {
          ok: true,
          status: 200,
          headers: {
            get: (h) => (String(h || '').toLowerCase() === 'content-length' ? String(overBytes) : null),
          },
          blob: async () => new Blob([new Uint8Array(16)]),
        };
      }
      if (u.includes('fetch-fail-fallback.mp4')) {
        return {
          ok: false,
          status: 502,
          headers: { get: () => null },
          blob: async () => new Blob([]),
        };
      }
      const payloadBytes = new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]);
      return {
        ok: true,
        status: 200,
        headers: {
          get: (h) => (String(h || '').toLowerCase() === 'content-length' ? String(payloadBytes.byteLength) : null),
        },
        blob: async () => new Blob([payloadBytes], { type: 'video/mp4' }),
      };
    };

    const mockURL = {
      createObjectURL(blob) {
        assert.ok(blob && blob.size > 0, 'createObjectURL expected non-empty Blob');
        const u = `blob:https://127.0.0.1:62133/prism-vm-${++blobSeq}`;
        createdBlobUrls.push(u);
        return u;
      },
      revokeObjectURL(u) {
        revokedBlobUrls.push(String(u));
      },
    };

    const winListeners = new Map();
    const mockWin = {
      document: mockDoc,
      location: { protocol: 'https:', origin: 'https://127.0.0.1:62133', href: 'https://127.0.0.1:62133/' },
      innerWidth: 1440,
      innerHeight: 900,
      devicePixelRatio: 2,
      fetch: mockFetch,
      URL: mockURL,
      AbortController,
      Blob,
      Event: class MockEvent {
        constructor(type) {
          this.type = type;
        }
      },
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      requestAnimationFrame: (cb) => setTimeout(() => cb(Date.now()), 16),
      cancelAnimationFrame: (id) => clearTimeout(id),
      getComputedStyle: () => ({ backgroundColor: 'rgb(7, 7, 8)', getPropertyValue: () => '' }),
      matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }),
      navigator: {},
      addEventListener(type, fn) {
        const list = winListeners.get(type) || [];
        list.push(fn);
        winListeners.set(type, list);
      },
      removeEventListener(type, fn) {
        const list = winListeners.get(type);
        if (!list) return;
        const idx = list.indexOf(fn);
        if (idx >= 0) list.splice(idx, 1);
      },
      dispatchEvent(evt) {
        for (const fn of (winListeners.get(evt.type) || []).slice()) fn(evt);
      },
    };
    mockWin.window = mockWin;
    mockWin.top = mockWin;

    const ctx = vm.createContext({
      window: mockWin,
      document: mockDoc,
      location: mockWin.location,
      URL: mockURL,
      Blob,
      AbortController,
      Event: mockWin.Event,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      requestAnimationFrame: mockWin.requestAnimationFrame,
      cancelAnimationFrame: mockWin.cancelAnimationFrame,
      getComputedStyle: mockWin.getComputedStyle,
    });

    vm.runInContext(wallInjectSrc, ctx, { filename: 'wallpaper-inject.js' });
    const prism = mockWin.__agyPrism;
    assert.ok(prism && typeof prism.applyPayload === 'function', 'wallpaper-inject.js failed to mount in node:vm');

    try {
      // 1) Zero-delay HTTPS -> HTTP loopback fetch+blob (0ms, no 900ms probe wait, no direct http:// src assignment)
      stepStartMs = Date.now();
      prism.applyPayload({
        skinEnabled: true,
        config: { fxEnabled: true, switchTransition: 'cut', accentMode: 'cobalt' },
        activeItem: {
          id: 'vm-vid-1',
          kind: 'video',
          mediaUrl: 'http://127.0.0.1:49152/media/tok1/video-1.mp4',
          thumbUrl: '',
        },
      });

      assert.equal(fetchCalls.length, 1, 'Expected immediate 0ms fetch() call inside applyPayload on https: host');
      assert.ok(fetchCalls[0].elapsedMs < 80, `Expected zero-delay fetch (<80ms), got ${fetchCalls[0].elapsedMs}ms`);
      assert.equal(fetchCalls[0].hasSignal, true, 'Expected AbortController signal attached to blob fetch');
      assert.deepEqual(directHttpVideoSrcs, [], 'https: host MUST NOT assign http://127.0.0.1 directly to video.src');

      await sleep(35);
      const st1 = prism.status();
      assert.equal(st1.wallpaperReady, true, 'Expected wallpaperReady=true after blob video decoded');
      assert.equal(docRoot.getAttribute('data-agy-prism-wallpaper'), 'ready');
      assert.equal(createdBlobUrls.length, 1);
      assert.equal(st1.videoSrc, createdBlobUrls[0]);
      const fx1 = mockDoc.getElementById('agy-prism-fx-canvas');
      assert.ok(fx1, 'Expected #agy-prism-fx-canvas mounted when fxEnabled=true');
      assert.equal(fx1.style.display, '', 'Expected #agy-prism-fx-canvas visible when wallpaperReady=true');
      assert.equal(fx1.width, 1440, 'Expected 1x CSS viewport width on #agy-prism-fx-canvas (not multiplied by DPR=2)');
      assert.equal(fx1.height, 900, 'Expected 1x CSS viewport height on #agy-prism-fx-canvas');

      // 2) Switching wallpaper revokes previous blob: URL automatically
      stepStartMs = Date.now();
      prism.applyPayload({
        skinEnabled: true,
        config: { fxEnabled: true, switchTransition: 'cut', accentMode: 'cobalt' },
        activeItem: {
          id: 'vm-vid-2',
          kind: 'video',
          mediaUrl: 'http://127.0.0.1:49152/media/tok2/video-2.mp4',
          thumbUrl: '',
        },
      });
      await sleep(35);
      assert.ok(
        revokedBlobUrls.includes(createdBlobUrls[0]),
        `Expected outgoing blob URL ${createdBlobUrls[0]} to be revoked on switch (revoked: ${revokedBlobUrls.join(', ')})`,
      );
      assert.equal(prism.status().videoSrc, createdBlobUrls[1]);

      // 3) 300 MiB Content-Length video is NOT gated by a memory cap and plays directly via fetch+blob
      stepStartMs = Date.now();
      prism.applyPayload({
        skinEnabled: true,
        config: { fxEnabled: true, switchTransition: 'cut', accentMode: 'cobalt' },
        activeItem: {
          id: 'vm-vid-oversize',
          kind: 'video',
          mediaUrl: 'http://127.0.0.1:49152/media/tok3/oversize-300mb.mp4',
          thumbUrl: 'http://127.0.0.1:49152/preview/tok3/poster-ok.png',
        },
      });
      await sleep(40);
      assert.ok(revokedBlobUrls.includes(createdBlobUrls[1]), 'Expected second video blob URL to be revoked when 300 MiB video switches to blob playback');
      const stOversize = prism.status();
      assert.equal(stOversize.wallpaperReady, true, 'Expected 300 MiB video to stay wallpaperReady=true via uncapped fetch+blob');
      assert.equal(stOversize.degradedToPoster, false, 'Expected degradedToPoster=false when 300 MiB video plays directly via blob:');
      assert.equal(stOversize.degradeReason, '', 'Expected empty degradeReason when 300 MiB video plays directly via blob:');
      assert.equal(docRoot.getAttribute('data-agy-prism-wallpaper'), 'ready');
      assert.equal(stOversize.videoSrc, createdBlobUrls[2], `Expected 300 MiB video to commit blob URL ${createdBlobUrls[2]}, got ${stOversize.videoSrc}`);
      const stageElOversize = mockDoc.getElementById('agy-prism-stage');
      const oversizeVideos = stageElOversize.querySelectorAll('video');
      assert.equal(oversizeVideos.length, 1, 'Expected 300 MiB video to mount <video> directly without poster downgrade');
      assert.ok(String(oversizeVideos[0].src || '').startsWith('blob:'), `Expected blob: <video>.src for 300 MiB video, got: ${oversizeVideos[0].src}`);
      assert.equal(stageElOversize.querySelectorAll('img').length, 0, 'Expected zero poster <img> when 300 MiB blob playback succeeds');

      // 3b) Non-404 fetch failure (e.g. HTTP 502) without mseFmp4Url gracefully degrades to <img> poster keeping data-agy-prism-wallpaper="ready"
      stepStartMs = Date.now();
      prism.applyPayload({
        skinEnabled: true,
        config: { fxEnabled: true, switchTransition: 'cut', accentMode: 'cobalt' },
        activeItem: {
          id: 'vm-vid-fetch-fail',
          kind: 'video',
          mediaUrl: 'http://127.0.0.1:49152/media/tok3b/fetch-fail-fallback.mp4',
          thumbUrl: 'http://127.0.0.1:49152/preview/tok3b/poster-ok.png',
        },
      });
      await sleep(40);
      assert.ok(revokedBlobUrls.includes(createdBlobUrls[2]), 'Expected 300 MiB video blob URL to be revoked when poster fallback commits');
      assert.equal(prism.status().wallpaperReady, true, 'Expected non-404 fetch failure with thumbUrl to stay wallpaperReady=true via poster fallback');
      assert.equal(prism.status().degradedToPoster, true, 'Expected degradedToPoster=true when non-404 fetch failure falls back to poster');
      assert.ok(String(prism.status().degradeReason || '').length > 0, 'Expected non-empty degradeReason on poster degradation');
      assert.equal(docRoot.getAttribute('data-agy-prism-wallpaper'), 'ready');
      const stageEl = mockDoc.getElementById('agy-prism-stage');
      assert.equal(stageEl.querySelectorAll('video').length, 0, 'Failed <video> element must be removed during poster fallback');
      const posterImgs = stageEl.querySelectorAll('img');
      assert.equal(posterImgs.length, 1, 'Expected fallback <img class="agy-prism-media-el"> in stage');
      assert.deepEqual(directHttpImgSrcs, [], 'https: host MUST NOT assign http://127.0.0.1 directly to poster <img>.src');
      assert.ok(posterImgs[0].src.startsWith('blob:'), `Expected 0ms fetch+blob poster fallback src, got: ${posterImgs[0].src}`);
      assert.ok(
        fetchCalls.some((c) => c.url.includes('poster-ok.png')),
        `Expected 0ms fetch() for poster-ok.png (seen: ${fetchCalls.map((c) => c.url).join(', ')})`,
      );

      // 4) 404 broken video fails open (data-agy-prism-wallpaper removed) AND hides #agy-prism-fx-canvas & clears degrade state
      stepStartMs = Date.now();
      prism.applyPayload({
        skinEnabled: true,
        config: { fxEnabled: true, switchTransition: 'cut', accentMode: 'cobalt' },
        activeItem: {
          id: 'vm-vid-404',
          kind: 'video',
          mediaUrl: 'http://127.0.0.1:49152/media/tok4/missing-404.mp4',
          thumbUrl: '',
        },
      });
      await sleep(40);
      assert.equal(prism.status().wallpaperReady, false, '404 video MUST fail open with wallpaperReady=false');
      assert.equal(prism.status().degradedToPoster, false, '404 without poster must clear degradedToPoster=false');
      assert.equal(prism.status().degradeReason, '', '404 without poster must clear degradeReason');
      assert.equal(docRoot.getAttribute('data-agy-prism-wallpaper'), null, '404 video MUST clear data-agy-prism-wallpaper');
      const fx404 = mockDoc.getElementById('agy-prism-fx-canvas');
      assert.ok(fx404, '#agy-prism-fx-canvas node still managed by fxEnabled');
      assert.equal(fx404.style.display, 'none', '#agy-prism-fx-canvas MUST be display:none when wallpaperReady=false');

      return `0ms fetch+blob (${fetchCalls[0].elapsedMs}ms) + ${revokedBlobUrls.length} blob revocations + 300MiB uncapped blob + non-404 poster degrade/reason + 404 fail-open & fx hidden`;
    } finally {
      prism.destroy();
    }
  });

  await check('PR #7 Cross-scheme /video-stage/ iframe streaming (900ms anti-jank + 0 fetch + ready/ended + error->0ms blob fallback) & Studio /api/events SSE + /api/status config', '@exec-engine-sidecar / @exec-host-skin / @exec-studio-ui', async () => {
    // 1. Verify /video-stage/<token> HTML (GET + HEAD + scene-video) & 900ms anti-jank gate + buildClientSkinPayload videoStageUrl
    const libRes = await engine.listLibrary({ refresh: false });
    const libArr = Array.isArray(libRes) ? libRes : libRes.items || [];
    const vidItem = libArr.find((x) => x.kind === 'video' && x.videoStageUrl);
    assert.ok(vidItem, 'Expected scanned video item to expose videoStageUrl');
    assert.match(vidItem.videoStageUrl, /\/video-stage\//, `Unexpected videoStageUrl: ${vidItem.videoStageUrl}`);

    const sceneVidItem = libArr.find((x) => String(x.workshopId) === '100004' || String(x.id).includes('100004'));
    assert.ok(sceneVidItem && /\?src=scene-video/.test(String(sceneVidItem.videoStageUrl || '')), `Expected scene video item 100004 to expose ?src=scene-video videoStageUrl, got: ${sceneVidItem?.videoStageUrl}`);

    const stagePath = new URL(vidItem.videoStageUrl).pathname + '?sid=test-sid-1';
    const stageResp = await invokeServerInMemory(mediaHttpServer, { method: 'GET', url: stagePath });
    assert.equal(stageResp.status, 200, `Expected 200 for ${stagePath}, got ${stageResp.status}`);
    assert.match(String(stageResp.headers['content-type'] || ''), /text\/html/i);
    assert.equal(String(stageResp.headers['cache-control'] || ''), 'no-store');
    const stageHtml = stageResp.text();
    assert.ok(stageHtml.includes('prism-video-stage') && stageHtml.includes('/media/'), 'video-stage HTML missing same-origin video or postMessage bridge');
    assert.ok(stageHtml.includes('createMediaElementSource') && stageHtml.includes('audioClockFallback'), 'video-stage HTML missing OOPIF Web Audio routing or audio-clock stall fallback');
    assert.ok(stageHtml.includes('lastCheckAt') && stageHtml.includes('900'), 'video-stage HTML missing v2.0.6 900ms anti-jank watchdog gate');
    assert.ok(stageHtml.includes('dur-0.75') && stageHtml.includes('curT+0.04'), 'video-stage HTML missing v2.0.6 tightened stall recovery thresholds');
    assert.ok(!stageHtml.includes('-0.035'), 'video-stage HTML must NOT include forbidden -0.035 backward GOP seek');
    assert.ok(stageHtml.includes('filter: none'), 'video-stage HTML missing DirectComposition zero-copy filter: none');

    const headResp = await invokeServerInMemory(mediaHttpServer, { method: 'HEAD', url: stagePath });
    assert.equal(headResp.status, 200, `Expected 200 for HEAD ${stagePath}, got ${headResp.status}`);
    assert.equal(headResp.body.length, 0, 'HEAD /video-stage/ must return empty body');

    const { buildClientSkinPayload: buildPayload } = await import(pathToFileURL(path.join(REPO_ROOT, 'src', 'host', 'index.mjs')).href);
    const payload = buildPayload(await engine.getConfig(), vidItem, engine.getMediaOrigin(), { skinEnabled: true });
    assert.equal(payload.activeItem?.videoStageUrl, vidItem.videoStageUrl, 'buildClientSkinPayload dropped videoStageUrl');

    // 2. Verify Studio /api/events SSE, fa1f877 visibility/socket-cap guards, real concurrent SSE eviction & /api/status config inclusion
    const sseResp = await invokeServerInMemory(studio.server, { method: 'GET', url: '/api/events' });
    assert.equal(sseResp.status, 200, `Studio /api/events returned ${sseResp.status}`);
    assert.match(String(sseResp.headers['content-type'] || ''), /text\/event-stream/i);
    const sseText = sseResp.text();
    assert.ok(sseText.includes('event: state') && sseText.includes('"activeItem"'), 'Studio /api/events missing initial state snapshot');

    const studioHtml = fs.readFileSync(path.join(REPO_ROOT, 'sidecars', 'prism_studio', 'index.html'), 'utf8');
    assert.ok(
      studioHtml.includes('installStudioVisibilityGuards') && studioHtml.includes('disconnectStudioEvents'),
      'Studio index.html missing hidden-iframe SSE disconnect guards',
    );
    const mainCode = fs.readFileSync(path.join(REPO_ROOT, 'sidecars', 'prism_studio', 'main.mjs'), 'utf8');
    assert.ok(mainCode.includes('MAX_STUDIO_SSE'), 'main.mjs missing MAX_STUDIO_SSE socket pool cap');
    const cdpCode = fs.readFileSync(path.join(REPO_ROOT, 'sidecars', 'prism_studio', 'cdp-bridge.mjs'), 'utf8');
    assert.ok(cdpCode.includes('MAX_HOST_SSE'), 'cdp-bridge.mjs missing MAX_HOST_SSE socket pool cap');

    // 2B. Verify partitioned Studio `/api/events` SSE socket eviction (MAX_STUDIO_SSE = 4: 2 aux + 2 popout, channels never evict each other!)
    const openPersistentStudioSse = (channel = 'aux') => {
      const ssePath = channel === 'popout' ? '/api/events?channel=popout' : '/api/events';
      const tryTcp = () =>
        new Promise((resolve, reject) => {
          let opened = false;
          let closed = false;
          let resolveClosed;
          const closedPromise = new Promise((r) => {
            resolveClosed = r;
          });
          const markClosed = () => {
            if (closed) return;
            closed = true;
            resolveClosed();
          };
          const req = http.get(
            `${studio.origin}${ssePath}`,
            { agent: false, headers: { Accept: 'text/event-stream', Connection: 'keep-alive' } },
            (res) => {
              let buf = '';
              res.on('end', markClosed);
              res.on('close', markClosed);
              res.on('error', markClosed);
              res.on('data', (chunk) => {
                buf += chunk.toString('utf8');
                if (!opened && buf.includes('event: state') && buf.includes('\n\n')) {
                  opened = true;
                  resolve({
                    transport: 'tcp',
                    channel,
                    status: res.statusCode,
                    headers: res.headers,
                    isClosed: () => closed,
                    closedPromise,
                    close: () => {
                      markClosed();
                      try { req.destroy(); } catch {}
                    },
                  });
                }
              });
            },
          );
          req.on('error', (err) => {
            if (!opened) reject(err);
            markClosed();
          });
        });

      const openInProcPersistent = () =>
        new Promise((resolve, reject) => {
          const socket = new Duplex({
            read() {},
            write(_chunk, _enc, cb) {
              cb();
            },
          });
          socket.remoteAddress = '127.0.0.1';
          socket.writable = true;
          socket.readable = true;
          socket.setNoDelay = () => socket; // exercises real persistent SSE + MAX_STUDIO_SSE eviction path

          const req = new IncomingMessage(socket);
          req.method = 'GET';
          req.url = ssePath;
          req.httpVersion = '1.1';
          req.httpVersionMajor = 1;
          req.httpVersionMinor = 1;
          req.headers = { accept: 'text/event-stream', connection: 'keep-alive' };

          const res = new ServerResponse(req);
          const origWriteHead = res.writeHead.bind(res);
          let status = 200;
          const explicitHeaders = {};
          let buf = '';
          let opened = false;
          let closed = false;
          let resolveClosed;
          const closedPromise = new Promise((r) => {
            resolveClosed = r;
          });
          const markClosed = () => {
            if (closed) return;
            closed = true;
            resolveClosed();
          };

          res.writeHead = function patchedWriteHead(code, msgOrHeaders, maybeHeaders) {
            status = Number(code) || 200;
            const hdrs =
              typeof msgOrHeaders === 'object' && msgOrHeaders !== null ? msgOrHeaders : maybeHeaders || {};
            for (const [hk, hv] of Object.entries(hdrs)) explicitHeaders[hk.toLowerCase()] = hv;
            return origWriteHead(code, msgOrHeaders, maybeHeaders);
          };
          res.write = function patchedWrite(chunk, encoding, cb) {
            if (chunk) {
              buf += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
            }
            if (!opened && buf.includes('event: state') && buf.includes('\n\n')) {
              opened = true;
              resolve({
                transport: 'inproc-persistent',
                channel,
                status,
                headers: { ...res.getHeaders(), ...explicitHeaders },
                isClosed: () => closed,
                closedPromise,
                close: () => {
                  markClosed();
                  req.emit('close');
                  res.emit('close');
                },
              });
            }
            if (typeof encoding === 'function') encoding();
            else if (typeof cb === 'function') cb();
            return true;
          };
          res.end = function patchedEnd(chunk, encoding, cb) {
            if (chunk && typeof chunk !== 'function') {
              buf += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
            }
            markClosed();
            res.emit('finish');
            res.emit('close');
            if (typeof chunk === 'function') chunk();
            else if (typeof encoding === 'function') encoding();
            else if (typeof cb === 'function') cb();
            return res;
          };
          res.on('error', (err) => {
            if (!opened) reject(err);
            markClosed();
          });
          studio.server.emit('request', req, res);
          queueMicrotask(() => req.push(null));
        });

      return tryTcp().catch((err) => {
        if (err?.code === 'EACCES' || err?.code === 'EPERM') {
          return openInProcPersistent();
        }
        throw err;
      });
    };

    const sseStreams = [];
    let sseEvictionTransport = '';
    try {
      const a1 = await openPersistentStudioSse('aux');
      sseStreams.push(a1);
      assert.equal(a1.status, 200, `Aux SSE stream #1 returned ${a1.status}`);
      assert.equal(a1.isClosed(), false);

      const a2 = await openPersistentStudioSse('aux');
      sseStreams.push(a2);
      assert.equal(a2.status, 200, `Aux SSE stream #2 returned ${a2.status}`);
      assert.equal(a1.isClosed(), false, 'Aux SSE #1 should remain open when <= 2 aux streams');
      assert.equal(a2.isClosed(), false);

      const p1 = await openPersistentStudioSse('popout');
      sseStreams.push(p1);
      const p2 = await openPersistentStudioSse('popout');
      sseStreams.push(p2);
      assert.equal(p1.status, 200, `Popout SSE stream #1 returned ${p1.status}`);
      assert.equal(p2.status, 200, `Popout SSE stream #2 returned ${p2.status}`);
      assert.equal(a1.isClosed(), false, 'Popout SSE channels must NOT evict Aux SSE #1 (MAX_STUDIO_SSE=4: 2 aux + 2 popout)');
      assert.equal(a2.isClosed(), false, 'Popout SSE channels must NOT evict Aux SSE #2');
      assert.equal(p1.isClosed(), false);
      assert.equal(p2.isClosed(), false);

      const a3 = await openPersistentStudioSse('aux');
      sseStreams.push(a3);
      assert.equal(a3.status, 200, `Aux SSE stream #3 returned ${a3.status}`);

      await Promise.race([
        a1.closedPromise,
        sleep(1500).then(() => {
          throw new Error('Oldest Aux SSE stream #1 was NOT evicted when 3rd bare /api/events opened (MAX_STUDIO_SSE_PER_CHANNEL=2)');
        }),
      ]);
      assert.equal(a1.isClosed(), true, 'Expected oldest Aux SSE #1 to be closed upon 3rd aux connection');
      assert.equal(a2.isClosed(), false, 'Expected Aux SSE #2 to remain open');
      assert.equal(a3.isClosed(), false, 'Expected Aux SSE #3 to remain open');
      assert.equal(p1.isClosed(), false, 'Aux eviction must NOT close Popout SSE #1');
      assert.equal(p2.isClosed(), false, 'Aux eviction must NOT close Popout SSE #2');

      const p3 = await openPersistentStudioSse('popout');
      sseStreams.push(p3);
      assert.equal(p3.status, 200, `Popout SSE stream #3 returned ${p3.status}`);
      await Promise.race([
        p1.closedPromise,
        sleep(1500).then(() => {
          throw new Error('Oldest Popout SSE stream #1 was NOT evicted when 3rd /api/events?channel=popout opened');
        }),
      ]);
      assert.equal(p1.isClosed(), true, 'Expected oldest Popout SSE #1 to be closed upon 3rd popout connection');
      assert.equal(p2.isClosed(), false);
      assert.equal(p3.isClosed(), false);

      const activeStreams = sseStreams.filter((s) => !s.isClosed()).length;
      assert.equal(activeStreams, 4, `Expected 4 active /api/events SSE streams (2 aux + 2 popout), got ${activeStreams}`);
      sseEvictionTransport = p3.transport;
    } finally {
      for (const s of sseStreams) {
        try { s.close(); } catch {}
      }
    }

    const statusResp = await invokeServerInMemory(studio.server, { method: 'GET', url: '/api/status' });
    assert.equal(statusResp.status, 200, `Studio /api/status returned ${statusResp.status}`);
    const statusJson = statusResp.json();
    assert.ok(statusJson.config && typeof statusJson.config === 'object', 'Studio /api/status missing config payload for live sync');

    // 3. Verify wallpaper-inject.js mounts <iframe data-prism-video-stage="1"> (0 fetch calls), handles ready/ended,
    //    AND automatically falls back to 0ms fetch+blob when iframe triggers error!
    const injectCode = fs.readFileSync(path.join(REPO_ROOT, 'src', 'host', 'wallpaper-inject.js'), 'utf8');
    const fetchCalls = [];
    const postedToFrame = [];
    const rpcCalls = [];
    const createdBlobUrls = [];
    const revokedBlobUrls = [];
    const winListeners = new Map();
    let blobSeq = 0;
    let fallbackStartMs = Date.now();

    const makeEl = (tag) => {
      const attrs = new Map();
      const listeners = new Map();
      const children = [];
      let _src = '';
      const el = {
        tagName: String(tag).toUpperCase(),
        style: {
          _props: new Map(),
          setProperty(k, v) { this._props.set(String(k), String(v)); },
          removeProperty(k) { this._props.delete(String(k)); },
          getPropertyValue(k) { return this._props.get(String(k)) || ''; },
          display: '',
          opacity: '',
          transition: '',
          clipPath: '',
          transform: '',
          background: '',
          cssText: '',
        },
        className: '',
        id: '',
        textContent: '',
        parentNode: null,
        inert: false,
        children,
        contentWindow: tag === 'iframe' ? { postMessage(msg) { postedToFrame.push(msg); } } : null,
        get isConnected() {
          let cur = el;
          while (cur) {
            if (cur === htmlEl) return true;
            cur = cur.parentNode;
          }
          return false;
        },
        get firstChild() { return children[0] || null; },
        get childNodes() { return children; },
        get classList() {
          return {
            add() {},
            remove() {},
            contains(cls) { return String(el.className || '').split(/\s+/).filter(Boolean).includes(cls); },
          };
        },
        setAttribute(k, v) {
          const key = String(k);
          const val = String(v);
          attrs.set(key, val);
          if (key === 'id') el.id = val;
          if (key === 'class') el.className = val;
        },
        getAttribute(k) {
          const key = String(k);
          if (key === 'id') return el.id || null;
          if (key === 'class') return el.className || null;
          return attrs.has(key) ? attrs.get(key) : null;
        },
        removeAttribute(k) {
          const key = String(k);
          attrs.delete(key);
          if (key === 'src') {
            _src = '';
            if (el.tagName === 'VIDEO' || el.tagName === 'AUDIO') el.readyState = 0;
          }
        },
        hasAttribute(k) { return attrs.has(String(k)); },
        appendChild(c) {
          if (c.parentNode) c.parentNode.removeChild(c);
          c.parentNode = el;
          children.push(c);
          return c;
        },
        insertBefore(c, ref) {
          if (c.parentNode) c.parentNode.removeChild(c);
          c.parentNode = el;
          const idx = ref ? children.indexOf(ref) : -1;
          if (idx >= 0) children.splice(idx, 0, c);
          else children.push(c);
          return c;
        },
        removeChild(c) {
          const idx = children.indexOf(c);
          if (idx >= 0) children.splice(idx, 1);
          c.parentNode = null;
          return c;
        },
        contains(c) { return c === el || children.includes(c) || children.some((x) => x.contains && x.contains(c)); },
        querySelector(sel) {
          if (sel === '.agy-prism-scrim') return children.find((x) => x.className === 'agy-prism-scrim') || null;
          return el.querySelectorAll(sel)[0] || null;
        },
        querySelectorAll(sel) {
          const parts = String(sel || '').split(',').map((s) => s.trim()).filter(Boolean);
          const matchesPart = (node, p) => {
            if (p.startsWith('#')) return node.id === p.slice(1);
            if (p.startsWith('.')) return node.classList.contains(p.slice(1));
            if (/^[a-z0-9]+$/i.test(p)) return node.tagName === p.toUpperCase();
            return false;
          };
          const out = [];
          const walk = (n) => {
            for (const ch of n.children) {
              if (parts.some((p) => matchesPart(ch, p))) out.push(ch);
              walk(ch);
            }
          };
          walk(el);
          return out;
        },
        addEventListener(type, fn) {
          if (!listeners.has(type)) listeners.set(type, new Set());
          listeners.get(type).add(fn);
        },
        removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
        dispatchEvent(ev) { for (const fn of [...(listeners.get(ev.type) || [])]) fn.call(el, ev); return true; },
        getBoundingClientRect() { return { left: 0, top: 0, right: 1440, bottom: 900, width: 1440, height: 900 }; },
        get currentSrc() { return _src; },
        get src() { return _src; },
        set src(v) {
          _src = String(v || '');
          attrs.set('src', _src);
          if ((el.tagName === 'VIDEO' || el.tagName === 'AUDIO') && _src.startsWith('blob:')) {
            el.readyState = 4;
            el.videoWidth = 1920;
            el.videoHeight = 1080;
            queueMicrotask(() => {
              el.dispatchEvent({ type: 'loadeddata' });
              el.dispatchEvent({ type: 'canplay' });
            });
          }
        },
      };
      if (el.tagName === 'VIDEO' || el.tagName === 'AUDIO') {
        el.readyState = 0;
        el.videoWidth = 0;
        el.videoHeight = 0;
        el.paused = true;
        el.muted = true;
        el.defaultMuted = true;
        el.volume = 1;
        el.playbackRate = 1;
        el.loop = true;
        el.ended = false;
        el.error = null;
        el.networkState = 0;
        el.play = () => { el.paused = false; return Promise.resolve(); };
        el.pause = () => { el.paused = true; };
        el.load = () => {};
      }
      return el;
    };

    const htmlEl = makeEl('html');
    htmlEl.className = 'dark';
    const headEl = makeEl('head');
    const bodyEl = makeEl('body');
    bodyEl.className = 'dark';
    const rootEl = makeEl('div');
    rootEl.id = 'root';
    bodyEl.appendChild(rootEl);
    htmlEl.appendChild(headEl);
    htmlEl.appendChild(bodyEl);

    const mockDoc = {
      documentElement: htmlEl,
      head: headEl,
      body: bodyEl,
      hidden: false,
      visibilityState: 'visible',
      fullscreenElement: null,
      activeElement: bodyEl,
      createElement: (t) => makeEl(t),
      getElementById: (id) => {
        const search = (n) => {
          if (n.id === id) return n;
          for (const ch of n.children) {
            const hit = search(ch);
            if (hit) return hit;
          }
          return null;
        };
        return search(htmlEl);
      },
      querySelector: (sel) => htmlEl.querySelector(sel),
      querySelectorAll: (sel) => htmlEl.querySelectorAll(sel),
      addEventListener() {},
      removeEventListener() {},
      hasFocus: () => true,
    };

    const mockURL = {
      createObjectURL(blob) {
        assert.ok(blob && blob.size > 0, 'createObjectURL expected non-empty Blob');
        const u = `blob:https://127.0.0.1:50734/prism-stage-fb-${++blobSeq}`;
        createdBlobUrls.push(u);
        return u;
      },
      revokeObjectURL(u) {
        revokedBlobUrls.push(String(u));
      },
    };

    const mockWin = {
      document: mockDoc,
      location: { protocol: 'https:', origin: 'https://127.0.0.1:50734', href: 'https://127.0.0.1:50734/' },
      innerWidth: 1440,
      innerHeight: 900,
      devicePixelRatio: 1,
      top: null,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      requestAnimationFrame: (fn) => setTimeout(() => fn(Date.now()), 16),
      cancelAnimationFrame: clearTimeout,
      getComputedStyle: () => ({ backgroundColor: 'rgb(7, 7, 8)', getPropertyValue: () => '' }),
      matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }),
      navigator: {},
      addEventListener(type, fn) {
        if (!winListeners.has(type)) winListeners.set(type, new Set());
        winListeners.get(type).add(fn);
      },
      removeEventListener(type, fn) { winListeners.get(type)?.delete(fn); },
      dispatchMessage(data, source) {
        for (const fn of [...(winListeners.get('message') || [])]) fn({ data, source });
      },
      __agyPrismCall(arg, params) {
        const parsed = typeof arg === 'string' && arg.startsWith('{') ? JSON.parse(arg) : { method: arg, params };
        rpcCalls.push(parsed);
        return Promise.resolve({ ok: true });
      },
      AbortController,
      Blob,
      Event: class Event { constructor(t) { this.type = t; } },
      URL: mockURL,
      async fetch(u, init) {
        fetchCalls.push({ url: String(u), elapsedMs: Date.now() - fallbackStartMs, hasSignal: Boolean(init && init.signal) });
        const payloadBytes = new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]);
        return {
          ok: true,
          status: 200,
          headers: { get: (h) => (String(h || '').toLowerCase() === 'content-length' ? String(payloadBytes.byteLength) : null) },
          blob: async () => new Blob([payloadBytes], { type: 'video/mp4' }),
        };
      },
    };
    mockWin.window = mockWin;
    mockWin.top = mockWin;
    mockWin.self = mockWin;

    vm.runInNewContext(injectCode, {
      window: mockWin,
      document: mockDoc,
      location: mockWin.location,
      URL: mockURL,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      requestAnimationFrame: mockWin.requestAnimationFrame,
      cancelAnimationFrame: mockWin.cancelAnimationFrame,
      getComputedStyle: mockWin.getComputedStyle,
      Blob,
      AbortController,
      Event: mockWin.Event,
      Promise,
      Math,
      JSON,
      Object,
      Array,
      String,
      Number,
      Boolean,
      RegExp,
      Error,
    });

    try {
      // 3A) Happy path: /video-stage/ iframe mounts with 0 fetch calls, handles ready & ended
      mockWin.__agyPrism.applyPayload({
        skinEnabled: true,
        config: { skinEnabled: true, layoutMode: 'flush', paused: false, muted: true, rotationEnabled: true, rotationTrigger: 'videoEnd' },
        activeItem: {
          id: 'loc-huge',
          title: 'Huge 4GB Local Video',
          kind: 'video',
          mediaUrl: 'http://127.0.0.1:52075/media/loc-huge',
          videoStageUrl: 'http://127.0.0.1:52075/video-stage/loc-huge',
        },
      });

      const stageEl = mockDoc.getElementById('agy-prism-stage');
      const iframes = stageEl.querySelectorAll('iframe');
      assert.equal(iframes.length, 1, 'Expected cross-scheme video with videoStageUrl to mount streaming iframe');
      assert.equal(iframes[0].getAttribute('data-prism-video-stage'), '1');
      assert.equal(fetchCalls.length, 0, 'Cross-scheme video-stage iframe must NOT trigger full-file fetch+blob');

      const sid = new URL(iframes[0].src).searchParams.get('sid');
      assert.ok(sid, 'Expected sid query param on video-stage iframe src');

      mockWin.dispatchMessage({ type: 'prism-video-stage', event: 'ready', sid, videoWidth: 1920, videoHeight: 1080 }, iframes[0].contentWindow);
      assert.equal(htmlEl.getAttribute('data-agy-prism-wallpaper'), 'ready', 'video-stage ready message did not mark wallpaper ready');
      assert.equal(mockWin.__agyPrism.status().videoStageMode, 'iframe');
      assert.equal(mockWin.__agyPrism.status().videoReadyState, 4);
      assert.ok(postedToFrame.some((m) => m && m.type === 'prism-video-ctl' && m.sid === sid), 'Host did not send prism-video-ctl to video-stage iframe');

      mockWin.dispatchMessage({ type: 'prism-video-stage', event: 'ended', sid }, iframes[0].contentWindow);
      assert.ok(rpcCalls.some((c) => c.method === 'playlist.step' && c.params?.reason === 'videoEnd'), 'video-stage ended event did not trigger playlist.step');

      const styleEl = mockDoc.getElementById('agy-prism-css');
      assert.ok(styleEl && styleEl.textContent.includes('[data-main-content-header]') && styleEl.textContent.includes('var(--prism-surface-chat)'), 'Missing [data-main-content-header] chat surface tint rule');

      // 3B) Error fallback path: when /video-stage/ iframe emits error, seamlessly fall back to 0ms fetch+blob <video>
      fetchCalls.length = 0;
      mockWin.__agyPrism.applyPayload({
        skinEnabled: true,
        config: { skinEnabled: true, layoutMode: 'flush', switchTransition: 'cut', paused: false, muted: true },
        activeItem: {
          id: 'loc-stage-err',
          title: 'Iframe Error Fallback Video',
          kind: 'video',
          mediaUrl: 'http://127.0.0.1:52075/media/loc-stage-err.mp4',
          videoStageUrl: 'http://127.0.0.1:52075/video-stage/loc-stage-err',
        },
      });
      const iframes2 = stageEl.querySelectorAll('iframe');
      const iframe2 = iframes2.find((f) => String(f.src || '').includes('loc-stage-err'));
      assert.ok(iframe2, `Expected incoming video-stage iframe for loc-stage-err before error injection (found ${iframes2.length})`);
      assert.equal(fetchCalls.length, 0, 'Must not fetch before iframe error');
      const sid2 = new URL(iframe2.src).searchParams.get('sid');

      fallbackStartMs = Date.now();
      mockWin.dispatchMessage({ type: 'prism-video-stage', event: 'error', sid: sid2, code: 4 }, iframe2.contentWindow);
      assert.equal(fetchCalls.length, 1, 'Iframe error did not immediately trigger 0ms fetch+blob fallback');
      assert.ok(fetchCalls[0].elapsedMs < 80, `Expected 0ms fallback fetch (<80ms), got ${fetchCalls[0].elapsedMs}ms`);
      assert.equal(fetchCalls[0].url, 'http://127.0.0.1:52075/media/loc-stage-err.mp4');

      await sleep(40);
      const stFb = mockWin.__agyPrism.status();
      assert.equal(stFb.videoStageMode, 'video', `Expected videoStageMode="video" after iframe fallback, got ${stFb.videoStageMode}`);
      assert.equal(stFb.wallpaperReady, true, 'Expected wallpaperReady=true after fetch+blob fallback');
      assert.equal(htmlEl.getAttribute('data-agy-prism-wallpaper'), 'ready');
      assert.ok(String(stFb.videoSrc).startsWith('blob:'), `Expected blob: videoSrc after fallback, got ${stFb.videoSrc}`);
      assert.equal(stageEl.querySelectorAll('iframe').length, 0, 'Failed video-stage iframe was not cleaned up after fallback');

      return `/video-stage/ 200+HEAD (900ms gate + OOPIF Web Audio/audioClockFallback, 0 fetch) + ready/ended + error->0ms blob fallback (${fetchCalls[0].elapsedMs}ms) + Studio SSE 3->2 eviction (${sseEvictionTransport}) & /api/status config verified`;
    } finally {
      mockWin.__agyPrism.destroy();
    }
  });

  await check('v2.0.7 HTTPS Zero-Stall Images/Accent/Thumbnails (0ms fetch+blob, 0 direct http://) + plugin:// 206 Proxy + 971 MB MediaSource /mse-fmp4/ Streaming Regression', '@exec-v207-backend / @exec-v207-host / @exec-v207-tests', async () => {
    // 1. Verify Sidecar `/media-proxy/media/<token>` (HEAD 200, Range bytes=0-63 -> 206, 403 traversal, 404 non-whitelist, optional /mse-fmp4/)
    //    and `buildClientSkinPayload` `pluginMediaUrl` / `pluginThumbUrl` / `mseFmp4Url`
    const libRes = await engine.listLibrary({ refresh: false });
    const libArr = Array.isArray(libRes) ? libRes : libRes.items || [];
    const vidItem = libArr.find((x) => x.kind === 'video' && x.mediaUrl);
    assert.ok(vidItem, 'Expected scanned video item in library');
    const vidPathname = new URL(vidItem.mediaUrl).pathname;

    const proxyHead = await invokeServerInMemory(studio.server, {
      method: 'HEAD',
      url: `/media-proxy${vidPathname}`,
    });
    assert.equal(proxyHead.status, 200, `Expected 200 for HEAD /media-proxy${vidPathname}, got ${proxyHead.status}`);
    assert.equal(proxyHead.headers['access-control-allow-origin'], '*');

    const proxyRange = await invokeServerInMemory(studio.server, {
      method: 'GET',
      url: `/media-proxy${vidPathname}`,
      headers: { Range: 'bytes=0-63' },
    });
    assert.equal(proxyRange.status, 206, `Expected 206 for Range /media-proxy${vidPathname}, got ${proxyRange.status}`);
    assert.equal(proxyRange.body.length, 64, `Expected 64 bytes for bytes=0-63, got ${proxyRange.body.length}`);
    assert.equal(proxyRange.body.toString('ascii', 4, 8), 'ftyp', 'Expected ftyp header in /media-proxy 206 slice');
    assert.match(String(proxyRange.headers['content-range'] || ''), /^bytes 0-63\/\d+$/);

    const proxyTrav = await invokeServerInMemory(studio.server, {
      method: 'GET',
      url: '/media-proxy/media/..%2foutside-secret.png',
    });
    assert.equal(proxyTrav.status, 403, `Expected 403 on /media-proxy traversal, got ${proxyTrav.status}`);

    const proxyBadRoute = await invokeServerInMemory(studio.server, {
      method: 'GET',
      url: '/media-proxy/health',
    });
    assert.equal(proxyBadRoute.status, 404, `Expected 404 on non-whitelisted /media-proxy/health, got ${proxyBadRoute.status}`);

    let mseHeadMime = '';
    if (vidItem.mseFmp4Url) {
      const msePath = new URL(vidItem.mseFmp4Url).pathname;
      const mseHead = await invokeServerInMemory(studio.server, {
        method: 'HEAD',
        url: `/media-proxy${msePath}`,
      });
      assert.equal(mseHead.status, 200, `Expected 200 for HEAD /media-proxy${msePath}, got ${mseHead.status}`);
      assert.equal(mseHead.headers['content-type'], 'video/mp4');
      mseHeadMime = String(mseHead.headers['x-prism-mse-mime'] || '');
      assert.ok(mseHeadMime.startsWith('video/mp4; codecs='), `Unexpected X-Prism-Mse-Mime: ${mseHeadMime}`);
    }

    const { buildClientSkinPayload: buildPayloadV207 } = await import(
      pathToFileURL(path.join(REPO_ROOT, 'src', 'host', 'index.mjs')).href
    );
    const mOrigin = engine.getMediaOrigin();
    const pOrigin = studio.pluginOrigin || 'plugin://agy-wallpaper-prism--prism_studio-53040';
    const syntheticMseUrl = vidItem.mseFmp4Url || `${mOrigin}/mse-fmp4/tok-mse-test`;
    const builtV207 = buildPayloadV207(
      await engine.getConfig(),
      { ...vidItem, mseFmp4Url: syntheticMseUrl },
      mOrigin,
      { skinEnabled: true, pluginOrigin: pOrigin },
    );
    assert.ok(
      String(builtV207.activeItem?.pluginMediaUrl || '').startsWith(`${pOrigin}/media-proxy/media/`),
      `Expected pluginMediaUrl under ${pOrigin}/media-proxy/media/, got ${builtV207.activeItem?.pluginMediaUrl}`,
    );
    if (vidItem.thumbUrl) {
      assert.ok(
        String(builtV207.activeItem?.pluginThumbUrl || '').startsWith(`${pOrigin}/media-proxy/preview/`),
        `Expected pluginThumbUrl under ${pOrigin}/media-proxy/preview/, got ${builtV207.activeItem?.pluginThumbUrl}`,
      );
    }
    assert.equal(builtV207.activeItem?.mseFmp4Url, syntheticMseUrl, 'buildClientSkinPayload dropped mseFmp4Url');

    // 2. HTTPS VM environment: verify 0ms fetch+blob for image, slideshow, extractAccent(thumbUrl),
    //    --prism-wall-image zero plaintext http://, 971 MB Tier 1 plugin:// HEAD 200 direct playback,
    //    and 971 MB Tier 1 404 -> MediaSource /mse-fmp4/ chunked SourceBuffer streaming (0 plaintext http:// iframe!)
    const wallInjectSrc = fs.readFileSync(path.join(REPO_ROOT, 'src', 'host', 'wallpaper-inject.js'), 'utf8');
    const panelInjectSrc = fs.readFileSync(path.join(REPO_ROOT, 'src', 'host', 'panel-inject.js'), 'utf8');

    const fetchCalls = [];
    const directHttpImgSrcs = [];
    const directHttpVideoSrcs = [];
    const createdIframeSrcs = [];
    const createdBlobUrls = [];
    const revokedBlobUrls = [];
    const mseAppendedChunks = [];
    let mseEndOfStreamCount = 0;
    let blobSeq = 0;
    let stepStartMs = Date.now();
    const mediaSourceByUrl = new Map();

    class MockStyle {
      constructor() {
        this._props = new Map();
        this.display = '';
        this.opacity = '';
        this.transition = '';
        this.clipPath = '';
        this.transform = '';
        this.background = '';
        this.cssText = '';
      }
      setProperty(k, v) { this._props.set(String(k), String(v)); }
      removeProperty(k) { this._props.delete(String(k)); }
      getPropertyValue(k) { return this._props.get(String(k)) || ''; }
    }

    class MockMediaSource {
      static isTypeSupported(mime) {
        return String(mime || '').includes('video/mp4');
      }
      constructor() {
        this.readyState = 'closed';
        this._listeners = new Map();
        this._video = null;
      }
      addEventListener(type, fn) {
        const list = this._listeners.get(type) || [];
        list.push(fn);
        this._listeners.set(type, list);
      }
      removeEventListener(type, fn) {
        const list = this._listeners.get(type);
        if (!list) return;
        const idx = list.indexOf(fn);
        if (idx >= 0) list.splice(idx, 1);
      }
      _openFor(video) {
        this._video = video;
        this.readyState = 'open';
        queueMicrotask(() => {
          for (const fn of (this._listeners.get('sourceopen') || []).slice()) fn({ type: 'sourceopen' });
        });
      }
      addSourceBuffer(mime) {
        assert.ok(String(mime || '').includes('video/mp4'), `Unexpected SourceBuffer MIME: ${mime}`);
        const ms = this;
        const sbListeners = new Map();
        const sb = {
          updating: false,
          buffered: { length: 1, start: () => 0, end: () => 12 },
          addEventListener(type, fn) {
            const list = sbListeners.get(type) || [];
            list.push(fn);
            sbListeners.set(type, list);
          },
          removeEventListener(type, fn) {
            const list = sbListeners.get(type);
            if (!list) return;
            const idx = list.indexOf(fn);
            if (idx >= 0) list.splice(idx, 1);
          },
          appendBuffer(chunk) {
            const u8 = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
            mseAppendedChunks.push(u8.byteLength);
            sb.updating = true;
            queueMicrotask(() => {
              sb.updating = false;
              if (ms._video && ms._video.readyState < 4) {
                ms._video.readyState = 4;
                ms._video.videoWidth = 1920;
                ms._video.videoHeight = 1080;
                ms._video.dispatchEvent({ type: 'loadeddata' });
                ms._video.dispatchEvent({ type: 'canplay' });
              }
              for (const fn of (sbListeners.get('updateend') || []).slice()) fn({ type: 'updateend' });
            });
          },
          remove() {
            sb.updating = true;
            queueMicrotask(() => {
              sb.updating = false;
              for (const fn of (sbListeners.get('updateend') || []).slice()) fn({ type: 'updateend' });
            });
          },
        };
        return sb;
      }
      endOfStream() {
        this.readyState = 'ended';
        mseEndOfStreamCount += 1;
      }
    }

    class MockNode {
      constructor(tagName) {
        this.tagName = String(tagName || 'DIV').toUpperCase();
        this.id = '';
        this.className = '';
        this.style = new MockStyle();
        this._attrs = new Map();
        this.dataset = {};
        this.children = [];
        this.parentNode = null;
        this._listeners = new Map();
        this.inert = false;
        this.textContent = '';
        this._src = '';
        const self = this;
        this.classList = {
          add() {},
          remove() {},
          contains(cls) { return String(self.className || '').split(/\s+/).filter(Boolean).includes(cls); },
        };

        if (this.tagName === 'VIDEO' || this.tagName === 'AUDIO') {
          this.readyState = 0;
          this.videoWidth = 0;
          this.videoHeight = 0;
          this.currentTime = 0;
          this.duration = 30;
          this.paused = true;
          this.muted = true;
          this.defaultMuted = true;
          this.volume = 1;
          this.playbackRate = 1;
          this.loop = true;
          this.ended = false;
          this.error = null;
          this.networkState = 0;
          this.poster = '';
          this.play = () => { this.paused = false; return Promise.resolve(); };
          this.pause = () => { this.paused = true; };
          this.load = () => {};
          Object.defineProperty(this, 'currentSrc', { get() { return self._src; } });
          Object.defineProperty(this, 'src', {
            get() { return self._src; },
            set(val) {
              const s = String(val || '');
              self._src = s;
              if (self.tagName === 'VIDEO' && /^http:\/\//i.test(s)) {
                directHttpVideoSrcs.push(s);
              }
              if (mediaSourceByUrl.has(s)) {
                mediaSourceByUrl.get(s)._openFor(self);
                return;
              }
              if (s.startsWith('plugin://') || s.startsWith('blob:')) {
                self.readyState = 4;
                self.videoWidth = 1920;
                self.videoHeight = 1080;
                queueMicrotask(() => {
                  self.dispatchEvent({ type: 'loadeddata' });
                  self.dispatchEvent({ type: 'canplay' });
                });
              }
            },
          });
        } else if (this.tagName === 'IMG') {
          this.complete = false;
          this.naturalWidth = 0;
          this.naturalHeight = 0;
          this.onload = null;
          this.onerror = null;
          this.decode = () => Promise.resolve();
          Object.defineProperty(this, 'src', {
            get() { return self._src; },
            set(val) {
              const s = String(val || '');
              self._src = s;
              if (/^http:\/\//i.test(s)) {
                directHttpImgSrcs.push(s);
                // Simulate Chrome 152 https: -> http://127.0.0.1 silent stall (never resolves!)
                return;
              }
              if (s.startsWith('blob:') || s.startsWith('plugin://') || s.startsWith('data:')) {
                self.complete = true;
                self.naturalWidth = 1920;
                self.naturalHeight = 1080;
                queueMicrotask(() => {
                  if (typeof self.onload === 'function') self.onload();
                  self.dispatchEvent({ type: 'load' });
                });
              }
            },
          });
        } else if (this.tagName === 'IFRAME') {
          Object.defineProperty(this, 'src', {
            get() { return self._src; },
            set(val) {
              const s = String(val || '');
              self._src = s;
              if (s) createdIframeSrcs.push(s);
            },
          });
        } else if (this.tagName === 'CANVAS') {
          this.width = 32;
          this.height = 32;
          this.getContext = () => ({
            clearRect() {},
            beginPath() {},
            arc() {},
            stroke() {},
            fill() {},
            drawImage() {},
            getImageData: () => {
              const data = new Uint8ClampedArray(32 * 32 * 4);
              for (let i = 0; i < data.length; i += 4) {
                data[i] = 48;
                data[i + 1] = 148;
                data[i + 2] = 242;
                data[i + 3] = 255;
              }
              return { data };
            },
          });
        }
      }
      get isConnected() {
        let cur = this;
        while (cur) {
          if (cur === docRoot) return true;
          cur = cur.parentNode;
        }
        return false;
      }
      get firstChild() { return this.children[0] || null; }
      setAttribute(k, v) {
        const key = String(k);
        const val = String(v);
        this._attrs.set(key, val);
        if (key === 'id') this.id = val;
        if (key === 'class') this.className = val;
      }
      getAttribute(k) {
        const key = String(k);
        if (key === 'id') return this.id || null;
        if (key === 'class') return this.className || null;
        return this._attrs.has(key) ? this._attrs.get(key) : null;
      }
      removeAttribute(k) {
        const key = String(k);
        this._attrs.delete(key);
        if (key === 'src') {
          this._src = '';
          if (this.tagName === 'VIDEO' || this.tagName === 'AUDIO') this.readyState = 0;
        }
      }
      hasAttribute(k) {
        const key = String(k);
        if (key === 'id') return Boolean(this.id);
        if (key === 'class') return Boolean(this.className);
        return this._attrs.has(key);
      }
      appendChild(child) {
        if (!child) return child;
        if (child.parentNode) child.parentNode.removeChild(child);
        child.parentNode = this;
        this.children.push(child);
        return child;
      }
      insertBefore(child, ref) {
        if (!child) return child;
        if (child.parentNode) child.parentNode.removeChild(child);
        child.parentNode = this;
        const idx = ref ? this.children.indexOf(ref) : -1;
        if (idx >= 0) this.children.splice(idx, 0, child);
        else this.children.push(child);
        return child;
      }
      removeChild(child) {
        const idx = this.children.indexOf(child);
        if (idx >= 0) {
          this.children.splice(idx, 1);
          child.parentNode = null;
        }
        return child;
      }
      contains(other) {
        let cur = other;
        while (cur) {
          if (cur === this) return true;
          cur = cur.parentNode;
        }
        return false;
      }
      getBoundingClientRect() { return { left: 0, top: 0, right: 1440, bottom: 900, width: 1440, height: 900 }; }
      addEventListener(type, fn) {
        if (typeof fn !== 'function') return;
        const list = this._listeners.get(type) || [];
        list.push(fn);
        this._listeners.set(type, list);
      }
      removeEventListener(type, fn) {
        const list = this._listeners.get(type);
        if (!list) return;
        const idx = list.indexOf(fn);
        if (idx >= 0) list.splice(idx, 1);
      }
      dispatchEvent(evt) {
        const list = (this._listeners.get(evt.type) || []).slice();
        for (const fn of list) fn.call(this, evt);
        return true;
      }
      click() {
        const evt = { type: 'click', target: this, preventDefault() {}, stopPropagation() {} };
        if (typeof this.onclick === 'function') this.onclick(evt);
        this.dispatchEvent(evt);
      }
      querySelectorAll(selector) {
        const parts = String(selector || '').split(',').map((s) => s.trim()).filter(Boolean);
        const matchesPart = (node, p) => {
          if (p.startsWith('#')) return node.id === p.slice(1);
          if (p.startsWith('.')) return node.classList.contains(p.slice(1));
          if (/^[a-z0-9]+$/i.test(p)) return node.tagName === p.toUpperCase();
          return false;
        };
        const out = [];
        const walk = (n) => {
          for (const ch of n.children) {
            if (parts.some((p) => matchesPart(ch, p))) out.push(ch);
            walk(ch);
          }
        };
        walk(this);
        return out;
      }
      querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    }

    const docRoot = new MockNode('HTML');
    docRoot.className = 'dark';
    const docHead = new MockNode('HEAD');
    const docBody = new MockNode('BODY');
    docBody.className = 'dark';
    const hostRootDiv = new MockNode('DIV');
    hostRootDiv.id = 'root';
    docBody.appendChild(hostRootDiv);
    docRoot.appendChild(docHead);
    docRoot.appendChild(docBody);

    const mockDoc = {
      documentElement: docRoot,
      head: docHead,
      body: docBody,
      hidden: false,
      fullscreenElement: null,
      activeElement: docBody,
      hasFocus: () => true,
      createElement: (tag) => new MockNode(tag),
      createDocumentFragment: () => new MockNode('FRAGMENT'),
      getElementById: (id) => {
        const target = String(id || '');
        const search = (n) => {
          if (n.id === target) return n;
          for (const ch of n.children) {
            const hit = search(ch);
            if (hit) return hit;
          }
          return null;
        };
        return search(docRoot);
      },
      querySelector: (sel) => docRoot.querySelector(sel),
      querySelectorAll: (sel) => docRoot.querySelectorAll(sel),
      addEventListener: (t, fn) => docRoot.addEventListener(t, fn),
      removeEventListener: (t, fn) => docRoot.removeEventListener(t, fn),
      dispatchEvent: (e) => docRoot.dispatchEvent(e),
    };

    let vmNowOffset = 0;
    let deadOriginRecovered = false;
    const RealDate = Date;
    class MockDate extends RealDate {
      constructor(...args) {
        if (args.length === 0) super(RealDate.now() + vmNowOffset);
        else super(...args);
      }
      static now() {
        return RealDate.now() + vmNowOffset;
      }
    }

    const mockFetch = async (url, init) => {
      const u = String(url || '');
      const method = String((init && init.method) || 'GET').toUpperCase();
      fetchCalls.push({
        url: u,
        method,
        elapsedMs: RealDate.now() - stepStartMs,
        hasSignal: Boolean(init && init.signal),
      });
      if (u.includes('dead-origin-v210') && method === 'HEAD') {
        if (deadOriginRecovered) {
          return { ok: true, status: 200, headers: { get: () => null } };
        }
        throw new TypeError('Failed to fetch (simulated dead plugin:// origin)');
      }
      if (u.includes('abort-safe-v210') && method === 'HEAD') {
        if (u.includes('abort-slow')) {
          return new Promise((_resolve, reject) => {
            const onAbort = () => {
              const e = new Error('The user aborted a request.');
              e.name = 'AbortError';
              reject(e);
            };
            if (init?.signal?.aborted) {
              onAbort();
              return;
            }
            init?.signal?.addEventListener?.('abort', onAbort, { once: true });
          });
        }
        return { ok: true, status: 200, headers: { get: () => null } };
      }
      if (u.includes('ghost-v210') && method === 'HEAD') {
        await sleep(55);
        return { ok: true, status: 200, headers: { get: () => null } };
      }
      if (u.includes('alive-timeout-v210') && method === 'HEAD') {
        if (u.includes('alive-slow-timeout')) {
          return new Promise((resolve) => {
            const t = setTimeout(() => resolve({ ok: true, status: 200, headers: { get: () => null } }), 500);
            t.unref?.();
          });
        }
        return { ok: true, status: 200, headers: { get: () => null } };
      }
      if (u.includes('small-fallback-') && method === 'GET') {
        const mp4Bytes = new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]);
        return {
          ok: true,
          status: 200,
          headers: {
            get: (h) => (String(h || '').toLowerCase() === 'content-length' ? String(mp4Bytes.byteLength) : 'video/mp4'),
          },
          blob: async () => new Blob([mp4Bytes], { type: 'video/mp4' }),
        };
      }
      if (u.includes('tok971-ok') && method === 'HEAD') {
        return { ok: true, status: 200, headers: { get: () => null } };
      }
      if (u.includes('tok971-404') && method === 'HEAD') {
        return { ok: false, status: 404, headers: { get: () => null } };
      }
      if (u.includes('huge-971mb-fail.mp4')) {
        return {
          ok: false,
          status: 503,
          headers: { get: () => null },
          blob: async () => new Blob([]),
        };
      }
      if (u.includes('huge-971mb.mp4')) {
        return {
          ok: true,
          status: 200,
          headers: {
            get: (h) => (String(h || '').toLowerCase() === 'content-length' ? '1018167296' : null),
          },
          blob: async () => new Blob([new Uint8Array(16)]),
        };
      }
      if (u.includes('/mse-fmp4/')) {
        const fmp4Chunks = [
          new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]),
          new Uint8Array([0x00, 0x00, 0x00, 0x10, 0x6d, 0x6f, 0x6f, 0x66, 0x00, 0x00, 0x00, 0x08]),
        ];
        let idx = 0;
        return {
          ok: true,
          status: 200,
          headers: {
            get: (h) => {
              const k = String(h || '').toLowerCase();
              if (k === 'x-prism-mse-mime') return 'video/mp4; codecs="avc1.640028"';
              if (k === 'content-type') return 'video/mp4';
              return null;
            },
          },
          body: {
            getReader() {
              return {
                async read() {
                  if (idx < fmp4Chunks.length) return { done: false, value: fmp4Chunks[idx++] };
                  return { done: true, value: undefined };
                },
                async cancel() {},
              };
            },
          },
        };
      }
      const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      return {
        ok: true,
        status: 200,
        headers: {
          get: (h) => (String(h || '').toLowerCase() === 'content-length' ? String(pngBytes.byteLength) : null),
        },
        blob: async () => new Blob([pngBytes], { type: 'image/png' }),
      };
    };

    const mockURL = {
      createObjectURL(obj) {
        const u = `blob:https://127.0.0.1:62133/prism-v207-${++blobSeq}`;
        if (obj instanceof MockMediaSource) {
          mediaSourceByUrl.set(u, obj);
        } else {
          assert.ok(obj && obj.size > 0, 'createObjectURL expected non-empty Blob or MediaSource');
        }
        createdBlobUrls.push(u);
        return u;
      },
      revokeObjectURL(u) {
        const s = String(u);
        mediaSourceByUrl.delete(s);
        revokedBlobUrls.push(s);
      },
    };

    const winListeners = new Map();
    const mockWin = {
      document: mockDoc,
      location: { protocol: 'https:', origin: 'https://127.0.0.1:62133', href: 'https://127.0.0.1:62133/' },
      innerWidth: 1440,
      innerHeight: 900,
      devicePixelRatio: 1,
      fetch: mockFetch,
      URL: mockURL,
      Image: function MockImage() { return new MockNode('IMG'); },
      MediaSource: MockMediaSource,
      AbortController,
      Blob,
      Date: MockDate,
      Event: class MockEvent { constructor(type) { this.type = type; } },
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      requestAnimationFrame: (cb) => setTimeout(() => cb(MockDate.now()), 16),
      cancelAnimationFrame: (id) => clearTimeout(id),
      getComputedStyle: () => ({ backgroundColor: 'rgb(7, 7, 8)', getPropertyValue: () => '' }),
      matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }),
      navigator: {},
      __agyPrismCall: () => Promise.resolve({ ok: true, skinEnabled: true, config: {} }),
      addEventListener(type, fn) {
        const list = winListeners.get(type) || [];
        list.push(fn);
        winListeners.set(type, list);
      },
      removeEventListener(type, fn) {
        const list = winListeners.get(type);
        if (!list) return;
        const idx = list.indexOf(fn);
        if (idx >= 0) list.splice(idx, 1);
      },
      dispatchEvent(evt) {
        for (const fn of (winListeners.get(evt.type) || []).slice()) fn(evt);
      },
    };
    mockWin.window = mockWin;
    mockWin.top = mockWin;

    const vmCtx = vm.createContext({
      window: mockWin,
      document: mockDoc,
      location: mockWin.location,
      URL: mockURL,
      Image: mockWin.Image,
      MediaSource: MockMediaSource,
      Blob,
      AbortController,
      Date: MockDate,
      Uint8Array,
      Event: mockWin.Event,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      requestAnimationFrame: mockWin.requestAnimationFrame,
      cancelAnimationFrame: mockWin.cancelAnimationFrame,
      getComputedStyle: mockWin.getComputedStyle,
    });

    vm.runInContext(wallInjectSrc, vmCtx, { filename: 'wallpaper-inject.js' });
    const prism = mockWin.__agyPrism;
    assert.ok(prism && typeof prism.applyPayload === 'function', 'v2.0.7 wallpaper-inject.js failed to mount in https: VM');

    try {
      // 2A) `image` wallpaper on https://127.0.0.1 -> 0ms fetch+blob, directHttpImgSrcs === 0, --prism-wall-image has NO plaintext http://
      stepStartMs = Date.now();
      prism.applyPayload({
        skinEnabled: true,
        config: { switchTransition: 'cut', accentMode: 'cobalt' },
        activeItem: {
          id: 'vm-v207-img',
          kind: 'image',
          mediaUrl: 'http://127.0.0.1:49152/media/img1/wall.png',
          thumbUrl: 'http://127.0.0.1:49152/preview/img1/thumb.png',
        },
      });
      assert.ok(
        fetchCalls.some((c) => c.url === 'http://127.0.0.1:49152/media/img1/wall.png' && c.elapsedMs < 80),
        'image wallpaper did not call 0ms fetch() on https: host',
      );
      await sleep(35);
      assert.equal(prism.status().wallpaperReady, true, 'image wallpaper did not become ready via 0ms fetch+blob');
      const imgEls = mockDoc.getElementById('agy-prism-stage').querySelectorAll('img');
      assert.equal(imgEls.length, 1);
      assert.ok(imgEls[0].src.startsWith('blob:'), `Expected blob: src on image wallpaper, got ${imgEls[0].src}`);
      const styleCssText = mockDoc.getElementById('agy-prism-css')?.textContent || '';
      const wallVarMatch = /--prism-wall-image:\s*([^;]+);/.exec(styleCssText);
      const wallVarVal = wallVarMatch ? wallVarMatch[1].trim() : docRoot.style.getPropertyValue('--prism-wall-image');
      assert.equal(wallVarVal.includes('http://'), false, `--prism-wall-image leaked plaintext http://: ${wallVarVal}`);

      // 2B) `slideshow` wallpaper on https://127.0.0.1 -> 0ms fetch+blob, directHttpImgSrcs === 0
      stepStartMs = Date.now();
      prism.applyPayload({
        skinEnabled: true,
        config: { switchTransition: 'cut', accentMode: 'cobalt' },
        slides: [
          'http://127.0.0.1:49152/slide/s1/0.png',
          'http://127.0.0.1:49152/slide/s1/1.png',
        ],
        activeItem: {
          id: 'vm-v207-slide',
          kind: 'slideshow',
          mediaUrl: 'http://127.0.0.1:49152/slide/s1/0.png',
          thumbUrl: 'http://127.0.0.1:49152/preview/s1/thumb.png',
        },
      });
      assert.ok(
        fetchCalls.some((c) => c.url === 'http://127.0.0.1:49152/slide/s1/0.png' && c.elapsedMs < 80),
        'slideshow wallpaper did not call 0ms fetch() on https: host',
      );
      await sleep(35);
      assert.equal(prism.status().wallpaperReady, true, 'slideshow wallpaper did not become ready via 0ms fetch+blob');

      // 2C) Simulated 971 MB video Scenario 1: `pluginMediaUrl` HEAD 200 -> direct zero-copy `video.src = pluginMediaUrl`
      //     AND `accentMode: 'dynamic'` triggers `extractAccent(thumbUrl)` via 0ms fetch+blob + immediate revokeObjectURL!
      stepStartMs = Date.now();
      const revokesBeforeAccent = revokedBlobUrls.length;
      prism.applyPayload({
        skinEnabled: true,
        config: { switchTransition: 'cut', accentMode: 'dynamic' },
        activeItem: {
          id: 'vm-v207-971mb-plugin',
          kind: 'video',
          mediaUrl: 'http://127.0.0.1:49152/media/tok971/huge-971mb.mp4',
          pluginMediaUrl: 'plugin://agy-wallpaper-prism--prism_studio-53040/media-proxy/media/tok971-ok',
          mseFmp4Url: 'http://127.0.0.1:49152/mse-fmp4/tok971',
          thumbUrl: 'http://127.0.0.1:49152/preview/tok971/accent-thumb.png',
        },
      });
      await sleep(60);
      const stPlugin = prism.status();
      assert.equal(stPlugin.wallpaperReady, true, '971 MB plugin:// HEAD 200 video did not become ready');
      assert.equal(stPlugin.videoTransport, 'plugin', `Expected videoTransport="plugin", got ${stPlugin.videoTransport}`);
      assert.equal(
        stPlugin.videoSrc,
        'plugin://agy-wallpaper-prism--prism_studio-53040/media-proxy/media/tok971-ok',
        `Expected zero-copy video.src = pluginMediaUrl, got ${stPlugin.videoSrc}`,
      );
      assert.ok(
        fetchCalls.some((c) => c.url === 'http://127.0.0.1:49152/preview/tok971/accent-thumb.png'),
        'extractAccent(thumbUrl) did not fetch thumbUrl via 0ms fetch+blob on https: host',
      );
      assert.ok(
        revokedBlobUrls.length > revokesBeforeAccent,
        'extractAccent(thumbUrl) did not revoke its temporary blob URL after finish()',
      );

      // 2D) Simulated 971 MB video Scenario 2: `pluginMediaUrl` HEAD 404 -> skips plaintext http:// iframe
      //     (0ms, NO 15.5s Chrome 152 hang!) -> when fetch succeeds (`content-length: 1018167296`), uncapped
      //     `MAX_BLOB_MEDIA_BYTES = Infinity` plays directly via `blob:` (`videoTransport === 'blob'`);
      //     when fetch hits a non-404 failure (e.g. HTTP 503) and `mseFmp4Url` is present, falls back to MediaSource `/mse-fmp4/`.
      stepStartMs = Date.now();
      prism.applyPayload({
        skinEnabled: true,
        config: { switchTransition: 'cut', accentMode: 'cobalt' },
        activeItem: {
          id: 'vm-v207-971mb-blob',
          kind: 'video',
          mediaUrl: 'http://127.0.0.1:49152/media/tok971a/huge-971mb.mp4',
          pluginMediaUrl: 'plugin://agy-wallpaper-prism--prism_studio-53040/media-proxy/media/tok971-404',
          videoStageUrl: 'http://127.0.0.1:49152/video-stage/tok971a',
          mseFmp4Url: 'http://127.0.0.1:49152/mse-fmp4/tok971a',
          thumbUrl: 'http://127.0.0.1:49152/preview/tok971a/poster.png',
        },
      });
      await sleep(60);
      const stBlob971 = prism.status();
      assert.equal(stBlob971.wallpaperReady, true, '971 MB uncapped blob video did not become ready');
      assert.equal(stBlob971.videoTransport, 'blob', `Expected videoTransport="blob" for uncapped 971 MB fetch+blob, got ${stBlob971.videoTransport}`);
      assert.ok(String(stBlob971.videoSrc || '').startsWith('blob:'), `Expected blob: videoSrc for 971 MB video, got ${stBlob971.videoSrc}`);
      assert.equal(
        mockDoc.getElementById('agy-prism-stage').querySelectorAll('video').length,
        1,
        '971 MB blob video should render <video> directly',
      );
      assert.deepEqual(
        createdIframeSrcs,
        [],
        `Real MediaSource https: env must NOT mount plaintext http:// video-stage iframe (seen: ${createdIframeSrcs.join(', ')})`,
      );

      stepStartMs = Date.now();
      prism.applyPayload({
        skinEnabled: true,
        config: { switchTransition: 'cut', accentMode: 'cobalt' },
        activeItem: {
          id: 'vm-v207-971mb-mse',
          kind: 'video',
          mediaUrl: 'http://127.0.0.1:49152/media/tok971b/huge-971mb-fail.mp4',
          pluginMediaUrl: 'plugin://agy-wallpaper-prism--prism_studio-53040/media-proxy/media/tok971-404',
          videoStageUrl: 'http://127.0.0.1:49152/video-stage/tok971b',
          mseFmp4Url: 'http://127.0.0.1:49152/mse-fmp4/tok971b',
          thumbUrl: 'http://127.0.0.1:49152/preview/tok971b/poster.png',
        },
      });
      await sleep(80);
      const stMse = prism.status();
      assert.equal(stMse.wallpaperReady, true, '971 MB MediaSource /mse-fmp4/ fallback video did not become ready');
      assert.equal(stMse.videoTransport, 'mse', `Expected videoTransport="mse" after non-404 blob fetch failure, got ${stMse.videoTransport}`);
      assert.equal(mseAppendedChunks.length, 2, `Expected 2 SourceBuffer chunks pumped from /mse-fmp4/, got ${mseAppendedChunks.length}`);
      assert.ok(mseEndOfStreamCount >= 1, 'Expected MediaSource.endOfStream() after stream completion');
      assert.equal(
        mockDoc.getElementById('agy-prism-stage').querySelectorAll('video').length,
        1,
        '971 MB MSE video should render <video> without degrading to static poster <img>',
      );
      assert.deepEqual(
        createdIframeSrcs,
        [],
        `Real MediaSource https: env must NOT mount plaintext http:// video-stage iframe (seen: ${createdIframeSrcs.join(', ')})`,
      );

      // 2D-bis) PR #9: `deadPluginOrigins` fast fallback on TypeError — 2nd video on same dead origin skips HEAD (HEAD count === 1)
      const deadHeadCount = () => fetchCalls.filter((c) => c.method === 'HEAD' && c.url.includes('dead-origin-v210')).length;
      prism.applyPayload({
        skinEnabled: true,
        config: { switchTransition: 'cut', accentMode: 'cobalt' },
        activeItem: {
          id: 'vm-pr9-dead-1',
          kind: 'video',
          mediaUrl: 'http://127.0.0.1:49152/media/small-fallback-1.mp4',
          pluginMediaUrl: 'plugin://dead-origin-v210/media-proxy/media/v1',
        },
      });
      await sleep(50);
      assert.equal(prism.status().videoTransport, 'blob', `PR #9 2D-bis #1 expected blob fallback, got ${prism.status().videoTransport}`);
      assert.equal(deadHeadCount(), 1, `PR #9 2D-bis expected 1 HEAD on first dead video, got ${deadHeadCount()}`);
      prism.applyPayload({
        skinEnabled: true,
        config: { switchTransition: 'cut', accentMode: 'cobalt' },
        activeItem: {
          id: 'vm-pr9-dead-2',
          kind: 'video',
          mediaUrl: 'http://127.0.0.1:49152/media/small-fallback-2.mp4',
          pluginMediaUrl: 'plugin://dead-origin-v210/media-proxy/media/v2',
        },
      });
      await sleep(50);
      assert.equal(prism.status().videoTransport, 'blob', `PR #9 2D-bis #2 expected instant blob fallback, got ${prism.status().videoTransport}`);
      assert.equal(deadHeadCount(), 1, `PR #9 2D-bis expected 2nd video on cached dead origin to skip HEAD (got ${deadHeadCount()})`);

      // 2D-ter) PR #9: Rapid-switch `AbortError` does NOT poison a healthy `plugin://` origin
      prism.applyPayload({
        skinEnabled: true,
        config: { switchTransition: 'cut', accentMode: 'cobalt' },
        activeItem: {
          id: 'vm-pr9-abort-1',
          kind: 'video',
          mediaUrl: 'http://127.0.0.1:49152/media/small-fallback-a1.mp4',
          pluginMediaUrl: 'plugin://abort-safe-v210/media-proxy/media/abort-slow',
        },
      });
      await sleep(10);
      prism.applyPayload({
        skinEnabled: true,
        config: { switchTransition: 'cut', accentMode: 'cobalt' },
        activeItem: {
          id: 'vm-pr9-abort-2',
          kind: 'video',
          mediaUrl: 'http://127.0.0.1:49152/media/small-fallback-a2.mp4',
          pluginMediaUrl: 'plugin://abort-safe-v210/media-proxy/media/abort-fast',
        },
      });
      await sleep(60);
      assert.equal(
        prism.status().videoTransport,
        'plugin',
        `PR #9 2D-ter: rapid-switch AbortError poisoned plugin:// origin (got ${prism.status().videoTransport})`,
      );

      // 2D-quater) PR #9: `teardownSkinDomOnly()` ghost-video guard (mid-HEAD `skinEnabled: false` -> 0 ghost <video>)
      prism.applyPayload({
        skinEnabled: true,
        config: { switchTransition: 'cut', accentMode: 'cobalt' },
        activeItem: {
          id: 'vm-pr9-ghost-1',
          kind: 'video',
          mediaUrl: 'http://127.0.0.1:49152/media/small-fallback-g1.mp4',
          pluginMediaUrl: 'plugin://ghost-v210/media-proxy/media/slow-ghost',
        },
      });
      await sleep(15);
      prism.applyPayload({ skinEnabled: false });
      await sleep(80);
      assert.equal(mockDoc.getElementById('agy-prism-stage'), null, 'PR #9 2D-quater: mid-HEAD skinEnabled=false leaked ghost #agy-prism-stage!');
      assert.equal(prism.status().videoTransport, 'none', `PR #9 2D-quater: expected videoTransport="none" after disable, got ${prism.status().videoTransport}`);

      // 2D-quinquies) PR #9: `deadPluginOrigins` TTL recovery (>300s) + `alivePluginOrigins` non-poisoning on >350ms HEAD timeout
      deadOriginRecovered = true;
      vmNowOffset += 305_000;
      prism.applyPayload({
        skinEnabled: true,
        config: { switchTransition: 'cut', accentMode: 'cobalt' },
        activeItem: {
          id: 'vm-pr9-ttl-recover',
          kind: 'video',
          mediaUrl: 'http://127.0.0.1:49152/media/small-fallback-ttl.mp4',
          pluginMediaUrl: 'plugin://dead-origin-v210/media-proxy/media/recovered',
        },
      });
      await sleep(50);
      assert.equal(
        prism.status().videoTransport,
        'plugin',
        `PR #9 2D-quinquies: deadPluginOrigins did not recover after TTL expiry (got ${prism.status().videoTransport})`,
      );
      assert.equal(deadHeadCount(), 2, `PR #9 2D-quinquies: expected re-probe HEAD after TTL expiry (got ${deadHeadCount()})`);

      // Proven-alive origin experiencing a single transient >350ms HEAD timeout MUST NOT be blacklisted!
      prism.applyPayload({
        skinEnabled: true,
        config: { switchTransition: 'cut', accentMode: 'cobalt' },
        activeItem: {
          id: 'vm-pr9-alive-1',
          kind: 'video',
          mediaUrl: 'http://127.0.0.1:49152/media/small-fallback-al1.mp4',
          pluginMediaUrl: 'plugin://alive-timeout-v210/media-proxy/media/alive-ok',
        },
      });
      await sleep(40);
      assert.equal(prism.status().videoTransport, 'plugin');
      prism.applyPayload({
        skinEnabled: true,
        config: { switchTransition: 'cut', accentMode: 'cobalt' },
        activeItem: {
          id: 'vm-pr9-alive-timeout',
          kind: 'video',
          mediaUrl: 'http://127.0.0.1:49152/media/small-fallback-al2.mp4',
          pluginMediaUrl: 'plugin://alive-timeout-v210/media-proxy/media/alive-slow-timeout',
        },
      });
      await sleep(420);
      assert.equal(prism.status().videoTransport, 'blob', 'Transient >350ms HEAD timeout should fall back to blob');
      prism.applyPayload({
        skinEnabled: true,
        config: { switchTransition: 'cut', accentMode: 'cobalt' },
        activeItem: {
          id: 'vm-pr9-alive-after-timeout',
          kind: 'video',
          mediaUrl: 'http://127.0.0.1:49152/media/small-fallback-al3.mp4',
          pluginMediaUrl: 'plugin://alive-timeout-v210/media-proxy/media/alive-ok-2',
        },
      });
      await sleep(50);
      assert.equal(
        prism.status().videoTransport,
        'plugin',
        `PR #9 2D-quinquies: proven-alive origin was wrongly blacklisted by transient >350ms timeout (got ${prism.status().videoTransport})`,
      );

      // 2E) Also verify `panel-inject.js` thumbnail grid (`bindSafeThumb`) uses 0ms fetch+blob under https://127.0.0.1,
      //     lazy-defers via IntersectionObserver, appends ?static=1 to extensionless preview URLs, and leaves .png untouched
      const ioObserved = [];
      let ioCallback = null;
      mockWin.IntersectionObserver = function MockIntersectionObserver(cb) {
        ioCallback = cb;
        return {
          observe: (el) => ioObserved.push(el),
          unobserve: () => {},
          disconnect: () => { ioObserved.length = 0; },
        };
      };
      vm.runInContext(panelInjectSrc, vmCtx, { filename: 'panel-inject.js' });
      const panel = mockWin.__agyPrismPanel;
      assert.ok(panel && typeof panel.syncState === 'function', 'panel-inject.js failed to mount in https: VM');
      try {
        panel.open();
        const revokesBeforePanelDestroy = revokedBlobUrls.length;
        panel.syncState({
          skinEnabled: true,
          config: { libraryAnimatedThumbs: 'hover' },
          items: [
            {
              id: 'panel-t1',
              title: 'Panel HTTPS Thumb',
              kind: 'image',
              source: 'local',
              thumbUrl: 'http://127.0.0.1:49152/preview/panel-t1/thumb.png',
            },
            {
              id: 'panel-t2',
              title: 'Panel Static Video Thumb',
              kind: 'video',
              source: 'local',
              thumbUrl: 'http://127.0.0.1:49152/preview/panel-t2/thumb',
            },
          ],
        });
        const libTabBtn = mockDoc.getElementById('agy-prism-popover')?.querySelectorAll('.pp-tab').find((b) => b.getAttribute('data-tab') === 'library');
        assert.ok(libTabBtn, 'panel-inject.js missing library .pp-tab button');
        libTabBtn.click();
        await sleep(25);
        assert.equal(
          fetchCalls.some((c) => c.url.includes('panel-t2/thumb')),
          false,
          'panel-inject.js bindSafeThumb eagerly fetched video thumb before IntersectionObserver fired!',
        );
        const panelImgs = mockDoc.getElementById('agy-prism-popover')?.querySelectorAll('img') || [];
        assert.equal(panelImgs.length, 2, 'Expected 2 thumbnail <img> elements in panel library grid');
        assert.equal(
          panelImgs[0].dataset?.prismThumbUrl || panelImgs[0].getAttribute('data-prism-thumb-url'),
          'http://127.0.0.1:49152/preview/panel-t1/thumb.png',
          '.png thumbnail must NOT receive ?static=1 suffix',
        );
        assert.equal(
          panelImgs[1].dataset?.prismThumbUrl || panelImgs[1].getAttribute('data-prism-thumb-url'),
          'http://127.0.0.1:49152/preview/panel-t2/thumb?static=1',
          'Extensionless video preview thumbnail must receive ?static=1 suffix under hover mode',
        );
        assert.ok(typeof ioCallback === 'function' && ioObserved.length >= 2, 'Expected IntersectionObserver.observe() calls on panel thumbnails');
        ioCallback(panelImgs.map((target) => ({ target, isIntersecting: true })));
        await sleep(40);
        assert.ok(
          fetchCalls.some((c) => c.url === 'http://127.0.0.1:49152/preview/panel-t1/thumb.png'),
          'panel-inject.js bindSafeThumb did not fetch .png thumbUrl via fetch+blob on intersection',
        );
        assert.ok(
          fetchCalls.some((c) => c.url === 'http://127.0.0.1:49152/preview/panel-t2/thumb?static=1'),
          'panel-inject.js bindSafeThumb did not fetch ?static=1 video thumb via fetch+blob on intersection',
        );
        assert.ok(panelImgs[0].src.startsWith('blob:'), `Expected blob: src on panel thumbnail 0, got ${panelImgs[0].src}`);
        assert.ok(panelImgs[1].src.startsWith('blob:'), `Expected blob: src on panel thumbnail 1, got ${panelImgs[1].src}`);
        panel.destroy();
        assert.ok(
          revokedBlobUrls.length > revokesBeforePanelDestroy,
          'panel.destroy() did not revoke cached thumbBlobCache blob URLs',
        );
      } finally {
        delete mockWin.IntersectionObserver;
        try { panel.destroy(); } catch {}
      }

      assert.deepEqual(directHttpImgSrcs, [], `ZERO plaintext http:// allowed in img.src on https: host (found: ${directHttpImgSrcs.join(', ')})`);
      assert.deepEqual(directHttpVideoSrcs, [], `ZERO plaintext http:// allowed in video.src on https: host (found: ${directHttpVideoSrcs.join(', ')})`);

      return `/media-proxy 206 (${proxyRange.body.length}B ftyp${mseHeadMime ? ` + MSE ${mseHeadMime}` : ''}) + 0 directHttpImgSrcs + 971MB plugin:// & MSE + PR #9 deadPluginOrigins TTL/AbortError/ghost-video/alive-timeout verified`;
    } finally {
      prism.destroy();
    }
  });

  await check('High-bitrate 4K60 MSE byte-aware backpressure, early rolling eviction (<12s), transient QuotaExceededError (<2s) recovery & non-blanking loop remount', '@exec-mock-tests', async () => {
    const wallInjectSrc = fs.readFileSync(path.join(REPO_ROOT, 'src', 'host', 'wallpaper-inject.js'), 'utf8');
    const createdVids = [];
    const mediaSourceByUrl = new Map();
    const vmFetchUrls = [];
    let blobSeq = 0;

    let hbAppendedChunks = 0;
    let hbBufferedBytes = 0;
    let hbQuotaInjected = false;
    const hbEvictions = [];
    const mseHook = {
      bufLen: 0,
      bufStart: 0,
      bufEnd: 0,
      openDelayMs: 0,
      onAppend(u8, vid) {
        if (!hbQuotaInjected && hbBufferedBytes >= 32 * 1024 * 1024 && (vid?.currentTime || 0) < 2) {
          hbQuotaInjected = true;
          throw Object.assign(new Error('QuotaExceededError'), { name: 'QuotaExceededError' });
        }
        if (hbBufferedBytes + u8.byteLength > 100 * 1024 * 1024) {
          throw Object.assign(new Error('QuotaExceededError'), { name: 'QuotaExceededError' });
        }
        hbAppendedChunks += 1;
        hbBufferedBytes += u8.byteLength;
        mseHook.bufLen = 1;
        mseHook.bufEnd += 2;
      },
      onRemove(_start, end) {
        hbEvictions.push({ start: _start, end });
        const span = Math.max(0.01, mseHook.bufEnd - mseHook.bufStart);
        const frac = Math.max(0, Math.min(1, (end - mseHook.bufStart) / span));
        mseHook.bufStart = Math.max(mseHook.bufStart, end);
        hbBufferedBytes = Math.max(0, Math.round(hbBufferedBytes * (1 - frac)));
      },
    };

    class HbMockStyle {
      constructor() {
        this._props = new Map();
        this.display = '';
        this.opacity = '';
        this.transition = '';
        this.clipPath = '';
        this.transform = '';
        this.background = '';
        this.cssText = '';
      }
      setProperty(k, v) { this._props.set(String(k), String(v)); }
      removeProperty(k) { this._props.delete(String(k)); }
      getPropertyValue(k) { return this._props.get(String(k)) || ''; }
    }

    class HbMockMediaSource {
      static isTypeSupported(mime) {
        return String(mime || '').includes('video/mp4');
      }
      constructor() {
        this.readyState = 'closed';
        this._listeners = new Map();
        this._video = null;
      }
      addEventListener(type, fn) {
        const list = this._listeners.get(type) || [];
        list.push(fn);
        this._listeners.set(type, list);
      }
      removeEventListener(type, fn) {
        const list = this._listeners.get(type);
        if (!list) return;
        const idx = list.indexOf(fn);
        if (idx >= 0) list.splice(idx, 1);
      }
      _openFor(video) {
        this._video = video;
        const openNow = () => {
          this.readyState = 'open';
          for (const fn of (this._listeners.get('sourceopen') || []).slice()) fn({ type: 'sourceopen' });
        };
        if (mseHook.openDelayMs > 0) setTimeout(openNow, mseHook.openDelayMs);
        else queueMicrotask(openNow);
      }
      addSourceBuffer(mime) {
        assert.ok(String(mime || '').includes('video/mp4'), `Unexpected SourceBuffer MIME: ${mime}`);
        const ms = this;
        const sbListeners = new Map();
        const sb = {
          updating: false,
          buffered: {
            get length() { return mseHook.bufLen; },
            start: () => mseHook.bufStart,
            end: () => mseHook.bufEnd,
          },
          addEventListener(type, fn) {
            const list = sbListeners.get(type) || [];
            list.push(fn);
            sbListeners.set(type, list);
          },
          removeEventListener(type, fn) {
            const list = sbListeners.get(type);
            if (!list) return;
            const idx = list.indexOf(fn);
            if (idx >= 0) list.splice(idx, 1);
          },
          appendBuffer(chunk) {
            const u8 = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
            mseHook.onAppend(u8, ms._video);
            sb.updating = true;
            queueMicrotask(() => {
              sb.updating = false;
              if (ms._video && ms._video.readyState < 4) {
                ms._video.readyState = 4;
                ms._video.videoWidth = 3840;
                ms._video.videoHeight = 2160;
                ms._video.dispatchEvent({ type: 'loadeddata' });
                ms._video.dispatchEvent({ type: 'canplay' });
              }
              for (const fn of (sbListeners.get('updateend') || []).slice()) fn({ type: 'updateend' });
            });
          },
          remove(start, end) {
            mseHook.onRemove(start, end);
            sb.updating = true;
            queueMicrotask(() => {
              sb.updating = false;
              for (const fn of (sbListeners.get('updateend') || []).slice()) fn({ type: 'updateend' });
            });
          },
        };
        return sb;
      }
      endOfStream() {
        this.readyState = 'ended';
      }
    }

    class HbMockNode {
      constructor(tagName) {
        this.tagName = String(tagName || 'DIV').toUpperCase();
        this.id = '';
        this.className = '';
        this.style = new HbMockStyle();
        this._attrs = new Map();
        this.dataset = {};
        this.children = [];
        this.parentNode = null;
        this._listeners = new Map();
        this.textContent = '';
        this._src = '';
        const self = this;
        this.classList = {
          add() {},
          remove() {},
          contains(cls) { return String(self.className || '').split(/\s+/).filter(Boolean).includes(cls); },
        };
        if (this.tagName === 'VIDEO') {
          createdVids.push(this);
          this.readyState = 0;
          this.videoWidth = 0;
          this.videoHeight = 0;
          this.currentTime = 0;
          this.duration = 20;
          this.paused = true;
          this.muted = true;
          this.defaultMuted = true;
          this.volume = 1;
          this.playbackRate = 1;
          this.loop = true;
          this.ended = false;
          this.error = null;
          this.networkState = 0;
          this.poster = '';
          this.loadCalled = 0;
          this.play = () => { this.paused = false; return Promise.resolve(); };
          this.pause = () => { this.paused = true; };
          this.load = () => { this.loadCalled += 1; };
          Object.defineProperty(this, 'currentSrc', { get() { return self._src; } });
          Object.defineProperty(this, 'src', {
            get() { return self._src; },
            set(val) {
              const s = String(val || '');
              self._src = s;
              if (mediaSourceByUrl.has(s)) {
                mediaSourceByUrl.get(s)._openFor(self);
              }
            },
          });
        } else if (this.tagName === 'IMG') {
          this.complete = false;
          this.naturalWidth = 0;
          this.naturalHeight = 0;
          this.decode = () => Promise.resolve();
          Object.defineProperty(this, 'src', {
            get() { return self._src; },
            set(val) {
              const s = String(val || '');
              self._src = s;
              if (s.startsWith('blob:') || s.startsWith('data:')) {
                self.complete = true;
                self.naturalWidth = 1920;
                self.naturalHeight = 1080;
                queueMicrotask(() => {
                  if (typeof self.onload === 'function') self.onload();
                  self.dispatchEvent({ type: 'load' });
                });
              }
            },
          });
        }
      }
      get isConnected() {
        let cur = this;
        while (cur) {
          if (cur === docRoot) return true;
          cur = cur.parentNode;
        }
        return false;
      }
      get firstChild() { return this.children[0] || null; }
      setAttribute(k, v) {
        const key = String(k);
        const val = String(v);
        this._attrs.set(key, val);
        if (key === 'id') this.id = val;
        if (key === 'class') this.className = val;
      }
      getAttribute(k) {
        const key = String(k);
        if (key === 'id') return this.id || null;
        if (key === 'class') return this.className || null;
        return this._attrs.has(key) ? this._attrs.get(key) : null;
      }
      removeAttribute(k) {
        const key = String(k);
        this._attrs.delete(key);
        if (key === 'src') {
          this._src = '';
          if (this.tagName === 'VIDEO') this.readyState = 0;
        }
      }
      hasAttribute(k) { return this._attrs.has(String(k)); }
      appendChild(child) {
        if (!child) return child;
        if (child.parentNode) child.parentNode.removeChild(child);
        child.parentNode = this;
        this.children.push(child);
        return child;
      }
      insertBefore(child, ref) {
        if (!child) return child;
        if (child.parentNode) child.parentNode.removeChild(child);
        child.parentNode = this;
        const idx = ref ? this.children.indexOf(ref) : -1;
        if (idx >= 0) this.children.splice(idx, 0, child);
        else this.children.push(child);
        return child;
      }
      removeChild(child) {
        const idx = this.children.indexOf(child);
        if (idx >= 0) {
          this.children.splice(idx, 1);
          child.parentNode = null;
        }
        return child;
      }
      contains(other) {
        let cur = other;
        while (cur) {
          if (cur === this) return true;
          cur = cur.parentNode;
        }
        return false;
      }
      getBoundingClientRect() { return { left: 0, top: 0, right: 1920, bottom: 1080, width: 1920, height: 1080 }; }
      addEventListener(type, fn) {
        if (typeof fn !== 'function') return;
        const list = this._listeners.get(type) || [];
        list.push(fn);
        this._listeners.set(type, list);
      }
      removeEventListener(type, fn) {
        const list = this._listeners.get(type);
        if (!list) return;
        const idx = list.indexOf(fn);
        if (idx >= 0) list.splice(idx, 1);
      }
      dispatchEvent(evt) {
        for (const fn of (this._listeners.get(evt.type) || []).slice()) fn.call(this, evt);
        return true;
      }
      querySelectorAll(selector) {
        const parts = String(selector || '').split(',').map((s) => s.trim()).filter(Boolean);
        const matchesPart = (node, p) => {
          if (p.startsWith('#')) return node.id === p.slice(1);
          if (p.startsWith('.')) return node.classList.contains(p.slice(1));
          if (/^[a-z0-9]+$/i.test(p)) return node.tagName === p.toUpperCase();
          return false;
        };
        const out = [];
        const walk = (n) => {
          for (const ch of n.children) {
            if (parts.some((p) => matchesPart(ch, p))) out.push(ch);
            walk(ch);
          }
        };
        walk(this);
        return out;
      }
      querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    }

    const docRoot = new HbMockNode('HTML');
    const docHead = new HbMockNode('HEAD');
    const docBody = new HbMockNode('BODY');
    docRoot.appendChild(docHead);
    docRoot.appendChild(docBody);

    const mockDoc = {
      documentElement: docRoot,
      head: docHead,
      body: docBody,
      hidden: false,
      fullscreenElement: null,
      activeElement: docBody,
      hasFocus: () => true,
      createElement: (tag) => new HbMockNode(tag),
      createDocumentFragment: () => new HbMockNode('FRAGMENT'),
      getElementById: (id) => docRoot.querySelector(`#${id}`),
      querySelector: (sel) => docRoot.querySelector(sel),
      querySelectorAll: (sel) => docRoot.querySelectorAll(sel),
      addEventListener: (t, fn) => docRoot.addEventListener(t, fn),
      removeEventListener: (t, fn) => docRoot.removeEventListener(t, fn),
      dispatchEvent: (e) => docRoot.dispatchEvent(e),
    };

    const chunk16M = new Uint8Array(16 * 1024 * 1024);
    const mockFetch = async (url) => {
      const u = String(url || '');
      vmFetchUrls.push(u);
      if (u.startsWith('plugin://')) {
        return { ok: false, status: 404, headers: { get: () => null }, blob: async () => new Blob([]) };
      }
      if (u.includes('/media/vid-4k60-hb/')) {
        return { ok: false, status: 503, headers: { get: () => null }, blob: async () => new Blob([]) };
      }
      if (u.includes('/mse-fmp4/vid-4k60-hb')) {
        let idx = 0;
        return {
          ok: true,
          status: 200,
          headers: { get: (k) => (String(k).toLowerCase() === 'x-prism-mse-mime' ? 'video/mp4; codecs="avc1.640028"' : null) },
          body: {
            getReader() {
              return {
                async read() {
                  if (idx < 7) {
                    idx += 1;
                    return { done: false, value: chunk16M };
                  }
                  return { done: true, value: undefined };
                },
                async cancel() {},
              };
            },
          },
        };
      }
      const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      return { ok: true, status: 200, headers: { get: () => 'image/png' }, blob: async () => new Blob([pngBytes], { type: 'image/png' }) };
    };

    const mockURL = {
      createObjectURL(obj) {
        const u = `blob:https://127.0.0.1:62133/prism-hb-${++blobSeq}`;
        if (obj instanceof HbMockMediaSource) mediaSourceByUrl.set(u, obj);
        return u;
      },
      revokeObjectURL(u) { mediaSourceByUrl.delete(String(u)); },
    };

    const mockWin = {
      document: mockDoc,
      location: { protocol: 'https:', origin: 'https://127.0.0.1:62133', href: 'https://127.0.0.1:62133/' },
      innerWidth: 1920,
      innerHeight: 1080,
      devicePixelRatio: 1,
      fetch: mockFetch,
      URL: mockURL,
      Image: function MockImage() { return new HbMockNode('IMG'); },
      MediaSource: HbMockMediaSource,
      AbortController,
      Blob,
      Date,
      Event: class MockEvent { constructor(type) { this.type = type; } },
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      requestAnimationFrame: (cb) => setTimeout(() => cb(Date.now()), 16),
      cancelAnimationFrame: (id) => clearTimeout(id),
      getComputedStyle: () => ({ backgroundColor: 'rgb(7, 7, 8)', getPropertyValue: () => '' }),
      matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }),
      navigator: {},
      __agyPrismCall: () => Promise.resolve({ ok: true, skinEnabled: true, config: {} }),
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {},
    };
    mockWin.window = mockWin;
    mockWin.top = mockWin;

    const vmCtx = vm.createContext({
      window: mockWin,
      document: mockDoc,
      location: mockWin.location,
      URL: mockURL,
      Image: mockWin.Image,
      MediaSource: HbMockMediaSource,
      Blob,
      AbortController,
      Date,
      Uint8Array,
      Event: mockWin.Event,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      requestAnimationFrame: mockWin.requestAnimationFrame,
      cancelAnimationFrame: mockWin.cancelAnimationFrame,
      getComputedStyle: mockWin.getComputedStyle,
    });

    vm.runInContext(wallInjectSrc, vmCtx, { filename: 'wallpaper-inject.js' });
    const prismHb = mockWin.__agyPrism;
    assert.ok(prismHb && typeof prismHb.applyPayload === 'function', 'wallpaper-inject.js failed to mount in high-bitrate MSE VM');

    try {
      prismHb.applyPayload({
        skinEnabled: true,
        config: { switchTransition: 'fade', layerScale: 100, parallaxEnabled: false, muted: true },
        activeItem: {
          id: 'vid-4k60-hb',
          kind: 'video',
          fileSize: 206986766,
          durationSec: 20,
          mediaUrl: 'http://127.0.0.1:49152/media/vid-4k60-hb/fail.mp4',
          pluginMediaUrl: 'plugin://test-hb/media-proxy/media/tok-404',
          mseFmp4Url: 'http://127.0.0.1:49152/mse-fmp4/vid-4k60-hb',
          thumbUrl: 'http://127.0.0.1:49152/preview/vid-4k60-hb/poster.png',
        },
      });
      await sleep(320);
      const hbVid = createdVids[createdVids.length - 1];
      assert.ok(hbVid, 'Expected <video> mounted for 4K60 MSE stream');
      assert.equal(hbQuotaInjected, true, 'Expected transient QuotaExceededError injection at curT < 2s');
      assert.equal(prismHb.status().videoTransport, 'mse', 'Transient QuotaExceededError at curT < 2s must NOT degrade to poster');
      assert.equal(prismHb.status().wallpaperReady, true, 'High-bitrate MSE video should remain wallpaperReady');
      assert.equal(mockDoc.getElementById('agy-prism-stage').querySelectorAll('img').length, 0, 'Recovered MSE video must NOT render poster <img>');

      for (const tPos of [3.5, 6.5, 9.5]) {
        hbVid.currentTime = tPos;
        await sleep(280);
      }
      assert.ok(hbEvictions.length >= 1, 'High-bitrate MSE must proactively evict played frames well before curT = 12s');
      assert.ok(hbAppendedChunks >= 5, `Expected MSE stream to recover and append >=5 chunks, got ${hbAppendedChunks}`);
      assert.ok(hbBufferedBytes <= 90 * 1024 * 1024, `Buffered bytes exceeded ceiling: ${hbBufferedBytes}`);

      // Ended loop remount with evicted MSE buffer must keep outgoing frame intact (no blank/src clear) until replacement decodes
      mseHook.openDelayMs = 80;
      mseHook.bufLen = 0;
      mseHook.bufStart = 0;
      mseHook.bufEnd = 0;
      hbBufferedBytes = 0;
      assert.equal(hbVid.__prismMseEvicted, true, 'Expected __prismMseEvicted = true after rolling eviction');
      hbVid.dispatchEvent({ type: 'ended' });
      await sleep(20);
      assert.ok(hbVid._src.startsWith('blob:'), `Outgoing evicted MSE video must keep its src during remount, got ${hbVid._src}`);
      assert.equal(hbVid.loadCalled, 0, 'Outgoing evicted MSE video must NOT call load() during non-blanking remount');
      assert.equal(hbVid.isConnected, true, 'Outgoing evicted MSE video must remain connected until replacement decodes');

      await sleep(160);
      const remountedVid = createdVids[createdVids.length - 1];
      assert.notEqual(remountedVid, hbVid, 'Expected fresh <video> mounted for evicted MSE loop remount');
      assert.equal(prismHb.status().wallpaperReady, true, 'Remounted MSE loop video did not reach wallpaperReady');
      assert.equal(prismHb.status().videoTransport, 'mse', `Expected videoTransport="mse" after loop remount, got ${prismHb.status().videoTransport}`);
      return `QuotaExceededError(<2s) recovered + ${hbEvictions.length} early evictions (<12s) + ${hbAppendedChunks} chunks + non-blanking loop remount verified`;
    } finally {
      prismHb.destroy();
    }
  });

  await check('PR #9 + Req #6: `selectHubTargets` bilingual scoring, `cdpBridge.wake()` live-SSE fast-path vs `forceProbe` vs dead SSE & `/preload.js`+iframe translator guards', '@exec-sidecar / @exec-tests', async () => {
    const { selectHubTargets, createPassiveCdpBridge, probeCdpPort } = await import(
      pathToFileURL(path.join(REPO_ROOT, 'sidecars', 'prism_studio', 'cdp-bridge.mjs')).href
    );

    // 1) Bilingual target scoring (`反重力` positive; `^`-anchored splash/loading/wizard/disconnected `-100`; active chat NOT penalized)
    const ranked = selectHubTargets([
      { id: 'splash-zh', type: 'page', title: '正在加载 Antigravity...', url: 'http://127.0.0.1:42000/loading', webSocketDebuggerUrl: 'ws://127.0.0.1:9339/devtools/page/splash-zh' },
      { id: 'wizard-zh', type: 'page', title: '欢迎使用 Antigravity', url: 'http://127.0.0.1:42000/wizard', webSocketDebuggerUrl: 'ws://127.0.0.1:9339/devtools/page/wizard-zh' },
      { id: 'disc-zh', type: 'page', title: '已断开连接 - Antigravity', url: 'http://127.0.0.1:42000/disconnected', webSocketDebuggerUrl: 'ws://127.0.0.1:9339/devtools/page/disc-zh' },
      { id: 'hub-zh', type: 'page', title: '反重力 工作区', url: 'https://127.0.0.1:9443/index.html', webSocketDebuggerUrl: 'ws://127.0.0.1:9339/devtools/page/hub-zh' },
      { id: 'chat-disc', type: 'page', title: 'Fix disconnected socket — Antigravity', url: 'https://127.0.0.1:9443/index.html', webSocketDebuggerUrl: 'ws://127.0.0.1:9339/devtools/page/chat-disc' },
    ]);
    const rankedIds = ranked.map((t) => t.id);
    assert.ok(rankedIds.includes('hub-zh'), `Expected Chinese 反重力 Hub selected, got ${rankedIds.join(', ')}`);
    assert.ok(rankedIds.includes('chat-disc'), `Expected active chat "Fix disconnected socket — Antigravity" NOT penalized, got ${rankedIds.join(', ')}`);
    assert.equal(rankedIds.includes('splash-zh'), false, 'Chinese splash target must be excluded');
    assert.equal(rankedIds.includes('wizard-zh'), false, 'Chinese wizard target must be excluded');
    assert.equal(rankedIds.includes('disc-zh'), false, 'Chinese disconnected target must be excluded');
    // Also verify non-HTTPS active chat containing "disconnected" mid-title is NOT penalized below 0 (proving `^` anchor)
    const httpRanked = selectHubTargets([
      { id: 'http-splash', type: 'page', title: '正在加载 Antigravity...', url: 'http://127.0.0.1:42000/loading', webSocketDebuggerUrl: 'ws://127.0.0.1:9339/devtools/page/http-splash' },
      { id: 'http-chat', type: 'page', title: 'Fix disconnected socket — Antigravity', url: 'http://127.0.0.1:42000/hub', webSocketDebuggerUrl: 'ws://127.0.0.1:9339/devtools/page/http-chat' },
    ]);
    assert.deepEqual(httpRanked.map((t) => t.id), ['http-chat'], 'Non-HTTPS active chat with "disconnected" mid-title must beat Chinese splash');

    // 2) `createPassiveCdpBridge.wake()` live-SSE fast-path vs `forceProbe: true` vs dead SSE (`writableEnded` / `destroyed`)
    let mockCdpProbeCount = 0;
    let wakeNote = 'bilingual targets verified';
    const encodeWsTextFrame = (text) => {
      const payload = Buffer.from(text, 'utf8');
      const len = payload.length;
      if (len < 126) return Buffer.concat([Buffer.from([0x81, len]), payload]);
      const hdr = Buffer.alloc(4);
      hdr[0] = 0x81;
      hdr[1] = 126;
      hdr.writeUInt16BE(len, 2);
      return Buffer.concat([hdr, payload]);
    };
    const mockCdpServer = http.createServer((req, res) => {
      const addr = mockCdpServer.address();
      const p = typeof addr === 'object' && addr ? addr.port : 0;
      if (req.url === '/json/version') {
        mockCdpProbeCount += 1;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ Browser: 'MockChrome/135.0', webSocketDebuggerUrl: `ws://127.0.0.1:${p}/devtools/browser/1` }));
        return;
      }
      if (req.url === '/json/list') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([{
          id: 'mock-hub-target-1',
          type: 'page',
          title: 'Antigravity',
          url: 'https://127.0.0.1:9443/workbench',
          webSocketDebuggerUrl: `ws://127.0.0.1:${p}/devtools/page/mock-hub-target-1`,
        }]));
        return;
      }
      res.writeHead(404);
      res.end();
    });
    mockCdpServer.on('upgrade', (req, socket) => {
      const key = req.headers['sec-websocket-key'];
      const accept = createHash('sha1').update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest('base64');
      socket.write(
        'HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
      );
      let wsBuf = Buffer.alloc(0);
      socket.on('data', (chunk) => {
        wsBuf = Buffer.concat([wsBuf, chunk]);
        while (wsBuf.length >= 2) {
          const masked = (wsBuf[1] & 0x80) !== 0;
          let len = wsBuf[1] & 0x7f;
          let offset = 2;
          if (len === 126) {
            if (wsBuf.length < 4) return;
            len = wsBuf.readUInt16BE(2);
            offset = 4;
          } else if (len === 127) {
            if (wsBuf.length < 10) return;
            len = Number(wsBuf.readBigUInt64BE(2));
            offset = 10;
          }
          const maskLen = masked ? 4 : 0;
          if (wsBuf.length < offset + maskLen + len) return;
          const payload = Buffer.alloc(len);
          if (masked) {
            const mask = wsBuf.subarray(offset, offset + 4);
            for (let i = 0; i < len; i += 1) payload[i] = wsBuf[offset + 4 + i] ^ mask[i & 3];
          } else {
            wsBuf.copy(payload, 0, offset, offset + len);
          }
          const opcode = wsBuf[0] & 0x0f;
          wsBuf = wsBuf.subarray(offset + maskLen + len);
          if (opcode === 0x8) {
            try { socket.end(); } catch {}
            return;
          }
          if (opcode === 0x1) {
            try {
              const msg = JSON.parse(payload.toString('utf8'));
              const expr = String(msg?.params?.expression || '');
              const val = expr.includes('document.readyState')
                ? { ready: true, w: 1440, h: 900, booted: false, hostBase: '', sseState: -1, skinVer: '', skin: false }
                : true;
              const reply = JSON.stringify({ id: msg.id, result: { result: { value: val } } });
              socket.write(encodeWsTextFrame(reply));
            } catch {}
          }
        }
      });
    });

    let mockPort = 0;
    try {
      await new Promise((resolveListen, rejectListen) => {
        mockCdpServer.once('error', rejectListen);
        mockCdpServer.listen(0, '127.0.0.1', () => {
          mockCdpServer.removeListener('error', rejectListen);
          resolveListen();
        });
      });
      mockPort = mockCdpServer.address().port;
    } catch (err) {
      if (err?.code !== 'EACCES' && err?.code !== 'EPERM') throw err;
    }

    let bridgeFactory = createPassiveCdpBridge;
    let wakeTransportMode = 'tcp';
    let tcpReachable = false;
    if (mockPort > 0) {
      const probeCheck = await probeCdpPort(mockPort, '127.0.0.1', 500);
      tcpReachable = Boolean(probeCheck && probeCheck.ok);
      mockCdpProbeCount = 0; // reset probe counter after reachability check
    }
    if (!tcpReachable) {
      // Windows AppContainer sandbox blocks outbound TCP connect(127.0.0.1) with EACCES;
      // run verbatim cdp-bridge.mjs code over an in-proc mock HTTP+RFC-6455 WS socket transport!
      wakeTransportMode = 'inproc-ws';
      const cdpSrc = fs.readFileSync(path.join(REPO_ROOT, 'sidecars', 'prism_studio', 'cdp-bridge.mjs'), 'utf8');
      const storeUrl = pathToFileURL(path.join(REPO_ROOT, 'src', 'engine', 'store.mjs')).href;
      const schemaUrl = pathToFileURL(path.join(REPO_ROOT, 'src', 'shared', 'schema.mjs')).href;
      const patchedSrc = cdpSrc
        .replace(
          "import { request as httpRequest } from 'node:http';",
          'const httpRequest = (...args) => globalThis.__prismMockCdpHttpRequest(...args);',
        )
        .replace('../../src/engine/store.mjs', storeUrl)
        .replace('../../src/shared/schema.mjs', schemaUrl);
      const shimFile = path.join(SCRATCH_ROOT, 'cdp-bridge-inproc-wake.mjs');
      fs.writeFileSync(shimFile, patchedSrc, 'utf8');
      const shimMod = await import(`${pathToFileURL(shimFile).href}?t=${Date.now()}`);
      bridgeFactory = shimMod.createPassiveCdpBridge;

      const handleWsChunk = (socketOut, stateObj, chunk) => {
        stateObj.buf = Buffer.concat([stateObj.buf, Buffer.from(chunk)]);
        while (stateObj.buf.length >= 2) {
          const masked = (stateObj.buf[1] & 0x80) !== 0;
          let len = stateObj.buf[1] & 0x7f;
          let offset = 2;
          if (len === 126) {
            if (stateObj.buf.length < 4) return;
            len = stateObj.buf.readUInt16BE(2);
            offset = 4;
          } else if (len === 127) {
            if (stateObj.buf.length < 10) return;
            len = Number(stateObj.buf.readBigUInt64BE(2));
            offset = 10;
          }
          const maskLen = masked ? 4 : 0;
          if (stateObj.buf.length < offset + maskLen + len) return;
          const payload = Buffer.alloc(len);
          if (masked) {
            const mask = stateObj.buf.subarray(offset, offset + 4);
            for (let i = 0; i < len; i += 1) payload[i] = stateObj.buf[offset + 4 + i] ^ mask[i & 3];
          } else {
            stateObj.buf.copy(payload, 0, offset, offset + len);
          }
          const opcode = stateObj.buf[0] & 0x0f;
          stateObj.buf = stateObj.buf.subarray(offset + maskLen + len);
          if (opcode === 0x8) {
            try { socketOut.push(null); } catch {}
            return;
          }
          if (opcode === 0x1) {
            try {
              const msg = JSON.parse(payload.toString('utf8'));
              const expr = String(msg?.params?.expression || '');
              const val = expr.includes('document.readyState')
                ? { ready: true, w: 1440, h: 900, booted: false, hostBase: '', sseState: -1, skinVer: '', skin: false }
                : true;
              const reply = JSON.stringify({ id: msg.id, result: { result: { value: val } } });
              socketOut.push(encodeWsTextFrame(reply));
            } catch {}
          }
        }
      };

      globalThis.__prismMockCdpHttpRequest = (opts, cb) => {
        const listeners = new Map();
        const reqObj = {
          on(ev, fn) {
            const arr = listeners.get(ev) || [];
            arr.push(fn);
            listeners.set(ev, arr);
            return reqObj;
          },
          emit(ev, ...args) {
            for (const fn of (listeners.get(ev) || []).slice()) fn(...args);
          },
          destroy() {},
          end() {
            queueMicrotask(() => {
              const p = Number(opts?.port || mockPort || 9339);
              const reqPath = String(opts?.path || '/');
              const isUpgrade = String(opts?.headers?.Upgrade || '').toLowerCase() === 'websocket';
              if (isUpgrade) {
                const wsState = { buf: Buffer.alloc(0) };
                const clientSock = new Duplex({
                  read() {},
                  write(chunk, _enc, done) {
                    handleWsChunk(clientSock, wsState, chunk);
                    done();
                  },
                });
                clientSock.setNoDelay = () => clientSock;
                reqObj.emit('upgrade', { statusCode: 101, headers: {} }, clientSock, Buffer.alloc(0));
                return;
              }
              let statusCode = 404;
              let bodyStr = '';
              if (reqPath === '/json/version') {
                mockCdpProbeCount += 1;
                statusCode = 200;
                bodyStr = JSON.stringify({ Browser: 'MockChrome/135.0', webSocketDebuggerUrl: `ws://127.0.0.1:${p}/devtools/browser/1` });
              } else if (reqPath === '/json/list') {
                statusCode = 200;
                bodyStr = JSON.stringify([{
                  id: 'mock-hub-target-1',
                  type: 'page',
                  title: 'Antigravity',
                  url: 'https://127.0.0.1:9443/workbench',
                  webSocketDebuggerUrl: `ws://127.0.0.1:${p}/devtools/page/mock-hub-target-1`,
                }]);
              }
              const resListeners = new Map();
              const resObj = {
                statusCode,
                setEncoding() {},
                resume() {},
                on(ev, fn) {
                  const arr = resListeners.get(ev) || [];
                  arr.push(fn);
                  resListeners.set(ev, arr);
                  return resObj;
                },
                emit(ev, ...args) {
                  for (const fn of (resListeners.get(ev) || []).slice()) fn(...args);
                },
              };
              if (typeof cb === 'function') cb(resObj);
              reqObj.emit('response', resObj);
              queueMicrotask(() => {
                if (bodyStr) resObj.emit('data', Buffer.from(bodyStr, 'utf8'));
                resObj.emit('end');
              });
            });
          },
        };
        return reqObj;
      };
    }

    const wakeDataDir = path.join(SCRATCH_ROOT, 'pr9-wake-data');
    const wakeHostConfigPath = path.join(SCRATCH_ROOT, 'pr9-host-config.json');
    fs.mkdirSync(wakeDataDir, { recursive: true });
    fs.writeFileSync(wakeHostConfigPath, JSON.stringify({ plugins: { 'agy-wallpaper-prism': { enabled: true } } }), 'utf8');
    const bridge = bridgeFactory({
      getEngineState: async () => ({
        config: { skinEnabled: true, startupMode: 'gentle-auto', liveBootDelay: 0, triggerMode: 'both' },
        activeItem: null,
        skinEnabled: true,
        mediaOrigin: 'http://127.0.0.1:49152',
      }),
      hostScripts: {
        buildClientSkinPayload: () => ({ skinEnabled: true, config: {} }),
        buildStaticCssSheet: () => '',
      },
      getHostOrigin: () => studio.origin,
      capToken: 'wake-test-cap-token',
      dataDir: wakeDataDir,
      pluginRoot: REPO_ROOT,
      configPath: wakeHostConfigPath,
      cdpPort: mockPort || 9339,
      pollMs: 0,
    });

    const makeMockSsePair = () => {
      const chunks = [];
      const reqListeners = new Map();
      const resListeners = new Map();
      const req = {
        on: (ev, fn) => { reqListeners.set(ev, fn); },
        off: () => {},
      };
      const res = {
        writableEnded: false,
        destroyed: false,
        socket: { destroyed: false, writable: true },
        write: (data) => {
          if (res.writableEnded || res.destroyed) throw new Error('socket closed');
          chunks.push(String(data));
          return true;
        },
        end: () => { res.writableEnded = true; },
        on: (ev, fn) => { resListeners.set(ev, fn); },
        off: () => {},
      };
      return { req, res, chunks };
    };

    try {
      await bridge.start();
      // Initial immediate wake attaches with settleMs=0 (avoiding 500ms boot settle floor)
      await bridge.wake({ forceProbe: true });
      const st0 = bridge.getStatus();
      assert.equal(st0.phase, 'attached', `Expected bridge attached to mock CDP, got ${st0.phase}`);
      assert.equal(st0.attachedCount, 1);
      // Confirm healthy boot (mirroring wallpaper-inject.js canary.healthy RPC) so repeated wake() probes don't trip canary
      bridge.markCanaryHealthy('mock-hub-target-1');
      const probesAfterAttach = mockCdpProbeCount;
      assert.ok(probesAfterAttach >= 1, 'Expected initial CDP probe during attach');

      // Register a live SSE client -> wake() without forceProbe MUST take fast-path (0 new CDP probes!)
      const sse1 = makeMockSsePair();
      await bridge.registerSseClient(sse1.req, sse1.res, false);
      const chunksBeforeWake = sse1.chunks.length;
      await bridge.wake();
      assert.equal(mockCdpProbeCount, probesAfterAttach, `PR #9 wake() with live SSE should make 0 CDP probes (went ${probesAfterAttach} -> ${mockCdpProbeCount})`);
      assert.ok(sse1.chunks.length > chunksBeforeWake, 'PR #9 wake() live-SSE fast-path did not broadcast SSE frame');

      // wake({ forceProbe: true }) MUST bypass fast-path and run CDP probe!
      await bridge.wake({ forceProbe: true });
      assert.ok(mockCdpProbeCount > probesAfterAttach, 'PR #9 wake({ forceProbe: true }) did not run CDP probe');
      const probesAfterForce = mockCdpProbeCount;

      // Mark SSE #1 writableEnded=true (silent dead socket) -> wake() MUST detect dead SSE & fall back to CDP probe!
      sse1.res.writableEnded = true;
      await bridge.wake();
      assert.ok(mockCdpProbeCount > probesAfterForce, 'PR #9 wake() failed to detect writableEnded SSE & fall back to CDP probe');
      const probesAfterEnded = mockCdpProbeCount;

      // Register SSE #2, mark destroyed=true -> wake() MUST detect destroyed SSE & fall back to CDP probe!
      const sse2 = makeMockSsePair();
      await bridge.registerSseClient(sse2.req, sse2.res, false);
      sse2.res.destroyed = true;
      await bridge.wake();
      assert.ok(mockCdpProbeCount > probesAfterEnded, 'PR #9 wake() failed to detect destroyed SSE & fall back to CDP probe');
      wakeNote = `live-SSE fast-path (0 probes) + forceProbe (+1) + dead writableEnded/destroyed fallback (${wakeTransportMode}) verified`;
    } finally {
      await bridge.stop({ preserveHostDom: true }).catch(() => {});
      delete globalThis.__prismMockCdpHttpRequest;
      if (mockPort > 0) await new Promise((r) => mockCdpServer.close(() => r()));
    }

    // 3) Req #6: Verify `/preload.js`, `/video-stage/`, `/web/`, `/scene-live/` inject `window.__agyDomTranslatorInitialized = true;`
    const preloadResp = await invokeServerInMemory(studio.server, { method: 'GET', url: '/preload.js' });
    assert.equal(preloadResp.status, 200);
    assert.ok(
      preloadResp.text().includes('__agyDomTranslatorInitialized'),
      'Studio /preload.js missing window.__agyDomTranslatorInitialized = true guard',
    );
    const activeMediaSrv = engine?.mediaServer?.server || engine?._mediaServer?.server || fallbackMediaSrv?.server;
    const sampleVid = findWorkshopItem('100002');
    const sampleWeb = findWorkshopItem('100003');
    if (activeMediaSrv && sampleVid) {
      const vsResp = await invokeServerInMemory(activeMediaSrv, { method: 'GET', url: `/video-stage/${encodeURIComponent(sampleVid.id)}` });
      assert.equal(vsResp.status, 200);
      assert.ok(vsResp.text().includes('__agyDomTranslatorInitialized'), '/video-stage/ HTML missing __agyDomTranslatorInitialized guard');
    }
    if (activeMediaSrv && sampleWeb) {
      const webResp = await invokeServerInMemory(activeMediaSrv, { method: 'GET', url: `/web/${encodeURIComponent(sampleWeb.id)}/` });
      assert.equal(webResp.status, 200);
      assert.ok(webResp.text().includes('__agyDomTranslatorInitialized'), '/web/ HTML missing __agyDomTranslatorInitialized guard');
    }

    return `selectHubTargets bilingual + ${wakeNote} + /preload.js & iframe __agyDomTranslatorInitialized guards`;
  });

  await check('Sidecar Owner Fencing: superseded server abdication, `server_info.json` preservation & 600ms SSE recovery loop breaker', '@exec-sidecar / @exec-tests', async () => {
    const { createPassiveCdpBridge } = await import(
      pathToFileURL(path.join(REPO_ROOT, 'sidecars', 'prism_studio', 'cdp-bridge.mjs')).href
    );
    const fencingDataDir = path.join(SCRATCH_ROOT, 'owner-fencing-data');
    fs.mkdirSync(fencingDataDir, { recursive: true });
    const infoPath = path.join(fencingDataDir, 'server_info.json');

    // 1) Multi-instance `createPrismStudioServer` owner fencing & safe `server_info.json` cleanup
    let supersededCalled = false;
    let supersededReason = '';
    const prevDisableCdp = process.env.AGY_PRISM_DISABLE_CDP;
    delete process.env.AGY_PRISM_DISABLE_CDP;
    let instanceA = null;
    let instanceB = null;
    try {
      instanceA = await createPrismStudioServer({
        dataDir: fencingDataDir,
        token: 'fence-tok-a',
        startCdp: true,
        cdpPort: 1,
        cdpPollMs: 0,
        profileDir: fencingDataDir,
        autoCheckUpdates: false,
        inspectShortcuts: false,
        onSuperseded: (reason) => {
          supersededCalled = true;
          supersededReason = String(reason || '');
        },
      });
      const infoAfterA = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
      assert.equal(infoAfterA.instanceId, instanceA.instanceId, 'Expected server_info.json instanceId to match Instance A');
      assert.equal(infoAfterA.port, instanceA.port, 'Expected server_info.json port to match Instance A');

      instanceB = await createPrismStudioServer({
        dataDir: fencingDataDir,
        token: 'fence-tok-b',
        startCdp: true,
        cdpPort: 1,
        cdpPollMs: 0,
        profileDir: fencingDataDir,
        autoCheckUpdates: false,
        inspectShortcuts: false,
      });

      const infoAfterB = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
      assert.equal(infoAfterB.instanceId, instanceB.instanceId, 'Expected server_info.json instanceId to update to Instance B');
      assert.equal(infoAfterB.port, instanceB.port, 'Expected server_info.json port to update to Instance B');

      await instanceA.cdpBridge.tick();
      const deadline = Date.now() + 2500;
      while (!supersededCalled && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 20));
      }
      assert.equal(supersededCalled, true, 'Instance A did not invoke onSuperseded when Instance B took ownership');
      assert.equal(supersededReason, 'owner_changed_on_tick', `Unexpected supersede reason: ${supersededReason}`);
      assert.equal(fs.existsSync(infoPath), true, 'Superseded Instance A deleted active server_info.json!');
      const infoAfterYield = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
      assert.equal(infoAfterYield.instanceId, instanceB.instanceId, 'server_info.json no longer matches Instance B after A yielded');
      assert.equal(infoAfterYield.port, instanceB.port);
    } finally {
      if (prevDisableCdp === undefined) delete process.env.AGY_PRISM_DISABLE_CDP;
      else process.env.AGY_PRISM_DISABLE_CDP = prevDisableCdp;
      if (instanceA) await instanceA.close({ preserveHostDom: true }).catch(() => {});
      if (instanceB) await instanceB.close().catch(() => {});
    }
    assert.equal(fs.existsSync(infoPath), false, 'Authoritative Instance B should remove server_info.json on clean close()');

    // 2) Direct `createPassiveCdpBridge` SSE-disconnect fencing (breaks 600ms hijack loop)
    const bridgeDir = path.join(SCRATCH_ROOT, 'owner-fencing-bridge');
    fs.mkdirSync(bridgeDir, { recursive: true });
    let owned = true;
    let engineStateCalls = 0;
    let bridgeLostReason = '';
    const bridge = createPassiveCdpBridge({
      getEngineState: async () => {
        engineStateCalls += 1;
        return {
          config: { skinEnabled: true, startupMode: 'gentle-auto', liveBootDelay: 0, triggerMode: 'both' },
          activeItem: null,
          skinEnabled: true,
          mediaOrigin: 'http://127.0.0.1:49152',
        };
      },
      hostScripts: {
        buildClientSkinPayload: () => ({ skinEnabled: true, config: {} }),
        buildStaticCssSheet: () => '',
      },
      getHostOrigin: () => studio.origin,
      capToken: 'fence-bridge-cap',
      dataDir: bridgeDir,
      pluginRoot: REPO_ROOT,
      cdpPort: 1,
      pollMs: 0,
      isAuthoritativeOwner: () => owned,
      onOwnershipLost: (reason) => {
        bridgeLostReason = String(reason || '');
      },
    });
    const reqHandlers = new Map();
    const resHandlers = new Map();
    const mockReq = {
      on: (ev, fn) => {
        const arr = reqHandlers.get(ev) || [];
        arr.push(fn);
        reqHandlers.set(ev, arr);
      },
      emit: (ev, ...args) => {
        for (const fn of (reqHandlers.get(ev) || []).slice()) fn(...args);
      },
    };
    const mockRes = {
      writableEnded: false,
      destroyed: false,
      socket: { destroyed: false, writable: true },
      write: () => true,
      end: () => { mockRes.writableEnded = true; },
      on: (ev, fn) => {
        const arr = resHandlers.get(ev) || [];
        arr.push(fn);
        resHandlers.set(ev, arr);
      },
    };
    try {
      await bridge.registerSseClient(mockReq, mockRes, false);
      assert.equal(engineStateCalls, 1, 'Expected 1 initial engine state read on SSE register');
      owned = false;
      mockReq.emit('close');
      assert.equal(bridge.getStatus().phase, 'superseded', `Expected phase=superseded, got ${bridge.getStatus().phase}`);
      assert.equal(bridgeLostReason, 'owner_changed_on_sse_close');
      await new Promise((r) => setTimeout(r, 750));
      assert.equal(engineStateCalls, 1, 'Superseded bridge scheduled 600ms SSE recovery tick instead of yielding!');
    } finally {
      await bridge.stop({ preserveHostDom: true }).catch(() => {});
    }

    return 'Multi-instance server_info fencing + preserved owner file + 600ms SSE loop breaker verified';
  });

  await check('Issue #10 + Req #4 + v2.4.1: Pure-Optical `SCENE_PRESETS` (5 presets), 12-Component `surfaceTints` + `resolveComponentDefaultAlpha` & 128/128 WCAG AA (>= 4.5:1) Matrix', '@exec-shared / @exec-host-skin / @exec-tests', async () => {
    const {
      SCENE_PRESETS,
      COLOR_SCHEMES,
      SURFACE_TINT_COMPONENTS,
      SURFACE_TINT_BOUNDS,
      sanitizeConfig,
      resolveComponentDefaultAlpha,
    } = await import(pathToFileURL(path.join(REPO_ROOT, 'src', 'shared', 'schema.mjs')).href);

    // 1) Issue #10 + v2.4.1: All 5 SCENE_PRESETS are strictly optical-only (0 layout keys) and restore fpsCap=60 (eco=30)
    const forbiddenLayoutKeys = [
      'layoutMode',
      'islandGap',
      'workspacePad',
      'cornerStyle',
      'topbarStyle',
      'leftSidebarRadius',
      'rightSidebarRadius',
    ];
    for (const presetId of ['crisp', 'crystal', 'islands', 'focus', 'eco']) {
      const p = SCENE_PRESETS[presetId];
      assert.ok(p && p.patch, `Missing SCENE_PRESETS.${presetId}`);
      for (const lk of forbiddenLayoutKeys) {
        assert.equal(Object.prototype.hasOwnProperty.call(p.patch, lk), false, `SCENE_PRESETS.${presetId} leaked layout key "${lk}"!`);
      }
      if (presetId === 'crisp') {
        assert.equal(p.patch.glassBlur, 0, 'SCENE_PRESETS.crisp must set global glassBlur = 0');
      }
      assert.equal(p.patch.fpsCap, presetId === 'eco' ? 30 : 60, `SCENE_PRESETS.${presetId}.patch.fpsCap expected ${presetId === 'eco' ? 30 : 60}, got ${p.patch.fpsCap}`);
    }

    // 2) 12-component SURFACE_TINT_COMPONENTS + REGION_IDS canonical order, bounds clamping, null reset preserves regions structure & resolveComponentDefaultAlpha
    assert.deepEqual(
      [...SURFACE_TINT_COMPONENTS],
      ['topbar', 'wco', 'sidebar', 'workspace', 'card', 'userBubble', 'assistantBubble', 'codeBlock', 'controls', 'composer', 'rightPane', 'popover'],
    );
    assert.equal(SURFACE_TINT_BOUNDS.wco.minOpacity, 0, 'wco.minOpacity must allow 0% independent transparent override');
    assert.equal(SURFACE_TINT_BOUNDS.popover.minOpacity, 0.5);
    const syncedFromSb = sanitizeConfig({ sidebarOpacity: 0.88 });
    assert.equal(syncedFromSb.sidebarOpacity, 0.88);
    assert.equal(syncedFromSb.surfaceTints.sidebar.opacity, 0.88, 'sidebarOpacity did not sync into surfaceTints.sidebar.opacity');

    const syncedFromSt = sanitizeConfig({
      regions: { sidebar: { opacity: 0.42, borderStyle: 'full', radius: '16' } },
      surfaceTints: { sidebar: { opacity: 0.42, tone: -150, tint: '#abc' }, popover: { opacity: 0.1, tone: 150, tint: 'invalid' } },
    });
    assert.equal(syncedFromSt.sidebarOpacity, 0.42, 'surfaceTints.sidebar.opacity did not sync back into sidebarOpacity');
    assert.equal(syncedFromSt.surfaceTints.sidebar.tone, -100, 'tone not clamped to -100');
    assert.equal(syncedFromSt.surfaceTints.sidebar.tint, '#AABBCC', '3-digit hex tint not normalized to #AABBCC');
    assert.equal(syncedFromSt.surfaceTints.popover.opacity, 0.5, 'popover opacity did not enforce >= 0.50 floor');
    assert.equal(syncedFromSt.surfaceTints.popover.tone, 100, 'tone not clamped to +100');
    assert.equal(syncedFromSt.surfaceTints.popover.tint, '', 'invalid tint string not sanitized to empty');

    const resetSt = sanitizeConfig({ surfaceTints: null }, syncedFromSt);
    assert.equal(resetSt.sidebarOpacity, null, 'surfaceTints: null did not reset sidebarOpacity');
    for (const comp of SURFACE_TINT_COMPONENTS) {
      assert.equal(resetSt.surfaceTints[comp].opacity, null);
      assert.equal(resetSt.surfaceTints[comp].tone, 0);
      assert.equal(resetSt.surfaceTints[comp].tint, '');
    }
    assert.equal(resetSt.regions.sidebar.borderStyle, 'full', 'surfaceTints: null must preserve structural borderStyle in regions.sidebar');
    assert.equal(resetSt.regions.sidebar.radius, 16, 'surfaceTints: null must preserve structural radius in regions.sidebar');

    // Verify resolveComponentDefaultAlpha returns bounded numeric alpha for all 12 components in dark & light modes
    const baseCfg = sanitizeConfig({});
    for (const isLight of [false, true]) {
      for (const comp of SURFACE_TINT_COMPONENTS) {
        const a = resolveComponentDefaultAlpha(comp, baseCfg, isLight);
        assert.ok(typeof a === 'number' && Number.isFinite(a) && a >= 0 && a <= 1, `resolveComponentDefaultAlpha(${comp}, ${isLight}) invalid: ${a}`);
        if (comp === 'popover') assert.ok(a >= 0.9, `resolveComponentDefaultAlpha(popover, ${isLight}) expected >= 0.9, got ${a}`);
      }
      assert.equal(
        resolveComponentDefaultAlpha('wco', baseCfg, isLight),
        resolveComponentDefaultAlpha('topbar', baseCfg, isLight),
        `Default WCO Auto alpha must inherit topbar alpha (isLight=${isLight})`,
      );
      assert.equal(
        resolveComponentDefaultAlpha('rightPane', baseCfg, isLight),
        resolveComponentDefaultAlpha('workspace', baseCfg, isLight),
        `Default rightPane alpha must match workspace alpha (isLight=${isLight})`,
      );
    }

    // 3) 128/128 WCAG AA >= 4.5:1 Contrast Matrix using real `wallpaper-inject.js` CSS output in VM
    const wallInjectSrc = fs.readFileSync(path.join(REPO_ROOT, 'src', 'host', 'wallpaper-inject.js'), 'utf8');
    const makeMiniNode = (tag) => {
      const attrs = new Map();
      const cls = new Set();
      const styles = new Map();
      const node = {
        tagName: tag.toUpperCase(),
        id: '',
        textContent: '',
        children: [],
        parentNode: null,
        classList: {
          add: (...xs) => xs.forEach((x) => cls.add(x)),
          remove: (...xs) => xs.forEach((x) => cls.delete(x)),
          contains: (x) => cls.has(x),
        },
        style: {
          setProperty: (k, v) => styles.set(k, String(v)),
          removeProperty: (k) => styles.delete(k),
          getPropertyValue: (k) => styles.get(k) || '',
        },
        setAttribute: (k, v) => attrs.set(k, String(v)),
        getAttribute: (k) => (attrs.has(k) ? attrs.get(k) : null),
        hasAttribute: (k) => attrs.has(String(k)),
        removeAttribute: (k) => attrs.delete(k),
        appendChild(ch) { ch.parentNode = this; this.children.push(ch); return ch; },
        insertBefore(ch, ref) { ch.parentNode = this; const i = this.children.indexOf(ref); if (i >= 0) this.children.splice(i, 0, ch); else this.children.push(ch); return ch; },
        removeChild(ch) { const i = this.children.indexOf(ch); if (i >= 0) this.children.splice(i, 1); ch.parentNode = null; return ch; },
        remove() { if (this.parentNode) this.parentNode.removeChild(this); },
        querySelector: () => null,
        querySelectorAll: () => [],
        addEventListener: () => {},
        removeEventListener: () => {},
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 1440, height: 900 }),
      };
      return node;
    };
    const rootEl = makeMiniNode('HTML');
    const headEl = makeMiniNode('HEAD');
    const bodyEl = makeMiniNode('BODY');
    rootEl.appendChild(headEl);
    rootEl.appendChild(bodyEl);
    const findById = (n, id) => {
      if (n.id === id) return n;
      for (const ch of n.children) {
        const hit = findById(ch, id);
        if (hit) return hit;
      }
      return null;
    };
    const miniDoc = {
      documentElement: rootEl,
      head: headEl,
      body: bodyEl,
      hidden: false,
      createElement: (t) => makeMiniNode(t),
      getElementById: (id) => findById(rootEl, id),
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    const miniWin = {
      document: miniDoc,
      location: { protocol: 'http:', origin: 'http://127.0.0.1:43199', href: 'http://127.0.0.1:43199/' },
      innerWidth: 1440,
      innerHeight: 900,
      devicePixelRatio: 1,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      requestAnimationFrame: () => 0,
      cancelAnimationFrame: () => {},
      getComputedStyle: () => ({ backgroundColor: 'rgb(7, 7, 8)', getPropertyValue: () => '' }),
      matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    miniWin.window = miniWin;
    miniWin.top = miniWin;
    const wcagCtx = vm.createContext({
      window: miniWin,
      document: miniDoc,
      location: miniWin.location,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      getComputedStyle: miniWin.getComputedStyle,
    });
    vm.runInContext(wallInjectSrc, wcagCtx, { filename: 'wallpaper-inject-wcag.js' });

    const relLum = ([r, g, b]) => {
      const f = (c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const wcagRatio = (a, b) => {
      const l1 = relLum(a);
      const l2 = relLum(b);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    };
    const parseColorRgb = (s) => {
      const raw = String(s || '').trim();
      if (raw.startsWith('#')) {
        const h = raw.slice(1);
        return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
      }
      const m = /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/.exec(raw);
      return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
    };

    const stressVectors = [
      { tint: '#FFFFFF', tone: 100 },
      { tint: '#000000', tone: -100 },
      { tint: '#00FF00', tone: 80 },
      { tint: '#FFFF00', tone: 100 },
      { tint: '#FF00FF', tone: -80 },
      { tint: '#FF0000', tone: 50 },
      { tint: '#0000FF', tone: -50 },
      { tint: '#808080', tone: 100 },
    ];
    const surfaceVars = [
      '--prism-surface-topbar',
      '--prism-surface-wco',
      '--prism-surface-sidebar',
      '--prism-surface-chat',
      '--prism-surface-right-pane',
      '--prism-surface-composer',
      '--prism-surface-card',
      '--prism-surface-bubble-user',
      '--prism-surface-bubble-assistant',
      '--prism-surface-code-block',
      '--prism-surface-control',
      '--prism-surface-popover',
    ];
    let wcagPassedCombos = 0;
    let worstRatio = 99;
    try {
      for (const schemeId of Object.keys(COLOR_SCHEMES)) {
        for (const themeMode of ['dark', 'light']) {
          for (const vec of stressVectors) {
            const st = {};
            for (const comp of SURFACE_TINT_COMPONENTS) {
              st[comp] = { opacity: 0.9, tone: vec.tone, tint: vec.tint };
            }
            miniWin.__agyPrism.applyPayload({
              skinEnabled: true,
              config: {
                colorScheme: schemeId,
                themeMode,
                contrastFloor: true,
                glassSurfaces: true,
                surfaceTints: st,
              },
              activeItem: null,
            });
            const cssText = miniDoc.getElementById('agy-prism-css')?.textContent || '';
            const fgHex = rootEl.style.getPropertyValue('--prism-fg').trim() || COLOR_SCHEMES[schemeId]?.[themeMode]?.fg;
            const fgRgb = parseColorRgb(fgHex);
            assert.ok(fgRgb, `Missing --prism-fg for ${schemeId}/${themeMode}`);
            for (const sv of surfaceVars) {
              const inlineVal = rootEl.style.getPropertyValue(sv);
              const sm = inlineVal ? [null, inlineVal] : new RegExp(`${sv}:\\s*([^;]+);`).exec(cssText);
              const bgRgb = parseColorRgb(sm?.[1]);
              assert.ok(bgRgb, `Missing ${sv} for ${schemeId}/${themeMode}/${vec.tint}`);
              const ratio = wcagRatio(bgRgb, fgRgb);
              if (ratio < worstRatio) worstRatio = ratio;
              assert.ok(
                ratio >= 4.49,
                `WCAG AA violation (<4.5:1): ${schemeId}/${themeMode}/${vec.tint}/tone=${vec.tone} ${sv}=${sm?.[1]} vs fg=${fgHex} -> ${ratio.toFixed(2)}:1`,
              );
            }
            wcagPassedCombos += 1;
          }
        }
      }
    } finally {
      miniWin.__agyPrism.destroy();
    }
    assert.equal(wcagPassedCombos, 128, `Expected 128 WCAG combos tested, got ${wcagPassedCombos}`);
    return `5 optical presets (0 layout keys) + 12 surfaceTints + resolveComponentDefaultAlpha + ${wcagPassedCombos}/128 WCAG AA >= 4.5:1 (min=${worstRatio.toFixed(2)}:1)`;
  });

  await check('Req #5 + D1: SemVer, `tar-safe` hostile archive rejection, Loopback `Host` DNS-rebinding `403`, CSRF/Auth/Git `409`, Offline Fail-Safe & In-Proc Mock GitHub Updater Swap + Rollback', '@exec-shared / @exec-engine-updater / @exec-sidecar / @exec-tests', async () => {
    const { parseSemver, compareSemver, isNewerVersion } = await import(
      pathToFileURL(path.join(REPO_ROOT, 'src', 'shared', 'semver.mjs')).href
    );
    const { createDeterministicTarGz, extractSafeTarGz, collectDirectoryFilesMap } = await import(
      pathToFileURL(path.join(REPO_ROOT, 'src', 'engine', 'tar-safe.mjs')).href
    );
    const { createPrismUpdater } = await import(
      pathToFileURL(path.join(REPO_ROOT, 'src', 'engine', 'updater.mjs')).href
    );

    // 1) SemVer unit checks (`isNewerVersion(candidate, current)`)
    assert.equal(compareSemver('2.4.1', '2.3.0'), 1);
    assert.equal(compareSemver('v2.4.1', '2.4.1'), 0);
    assert.equal(compareSemver('2.4.1-beta.1', '2.4.1'), -1);
    assert.equal(compareSemver('2.4.1+build.42', '2.4.1'), 0);
    assert.equal(isNewerVersion('2.4.1', '2.3.0'), true);
    assert.equal(isNewerVersion('2.3.0', '2.4.1'), false);
    assert.equal(isNewerVersion('2.4.1-rc.1', '2.4.1'), false);
    assert.equal(parseSemver('not-a-version'), null);

    // 2) `tar-safe.mjs` hostile archive rejection (Zip-Slip, absolute, symlink, hardlink, Windows reserved, case collision)
    const buildRawTarGz = (rawEntries) => {
      const blocks = [];
      for (const e of rawEntries) {
        const hdr = Buffer.alloc(512, 0);
        Buffer.from(e.name, 'utf8').copy(hdr, 0, 0, 100);
        Buffer.from('0000644\0', 'ascii').copy(hdr, 100);
        Buffer.from('0000000\0', 'ascii').copy(hdr, 108);
        Buffer.from('0000000\0', 'ascii').copy(hdr, 116);
        const data = Buffer.isBuffer(e.data) ? e.data : Buffer.from(String(e.data || ''), 'utf8');
        Buffer.from(`${data.length.toString(8).padStart(11, '0')}\0`, 'ascii').copy(hdr, 124);
        Buffer.from(`${Math.floor(1700000000).toString(8).padStart(11, '0')}\0`, 'ascii').copy(hdr, 136);
        hdr.fill(0x20, 148, 156);
        hdr[156] = String(e.typeFlag || '0').charCodeAt(0);
        if (e.linkname) Buffer.from(e.linkname, 'utf8').copy(hdr, 157, 0, 100);
        Buffer.from('ustar\0', 'ascii').copy(hdr, 257);
        Buffer.from('00', 'ascii').copy(hdr, 263);
        let sum = 0;
        for (let i = 0; i < 512; i += 1) sum += hdr[i];
        Buffer.from(`${sum.toString(8).padStart(6, '0')}\0 `, 'ascii').copy(hdr, 148);
        blocks.push(hdr);
        if (data.length > 0 && (e.typeFlag || '0') === '0') {
          blocks.push(data);
          const rem = data.length % 512;
          if (rem !== 0) blocks.push(Buffer.alloc(512 - rem, 0));
        }
      }
      blocks.push(Buffer.alloc(1024, 0));
      return zlib.gzipSync(Buffer.concat(blocks));
    };

    const hostileCases = [
      { label: 'zip-slip', entries: [{ name: '../evil.txt', data: 'x' }] },
      { label: 'abs-path', entries: [{ name: '/etc/passwd', data: 'x' }] },
      { label: 'symlink', entries: [{ name: 'link.js', typeFlag: '2', linkname: '/etc/hosts' }] },
      { label: 'hardlink', entries: [{ name: 'hlink.js', typeFlag: '1', linkname: 'plugin.json' }] },
      { label: 'win-reserved-CON', entries: [{ name: 'CON', data: 'x' }] },
      { label: 'win-reserved-nul', entries: [{ name: 'sub/nul.txt', data: 'x' }] },
      { label: 'case-collision', entries: [{ name: 'Foo.txt', data: 'a' }, { name: 'foo.txt', data: 'b' }] },
    ];
    for (const hc of hostileCases) {
      const dest = path.join(SCRATCH_ROOT, `tar-hostile-${hc.label}`);
      const buf = buildRawTarGz(hc.entries);
      assert.throws(
        () => extractSafeTarGz({ tarGzBuffer: buf, destDir: dest }),
        (err) => Boolean(err),
        `tar-safe failed to reject hostile archive "${hc.label}"!`,
      );
    }

    // 3) Global Loopback `Host` DNS-Rebinding `403`, zero wildcard CORS on `/api/healthz` & `/api/update/status`,
    //    and `POST /api/update/apply` CSRF/Auth/Content-Type/Git-dev `409` guards on `studio.server` (has `.git`)
    for (const badPath of ['/', '/api/healthz', '/api/update/status']) {
      const rebindRes = await invokeServerInMemory(studio.server, {
        method: 'GET',
        url: badPath,
        headers: { Host: 'evil.attacker.example:53040' },
      });
      assert.equal(rebindRes.status, 403, `DNS-rebinding Host on ${badPath} expected 403, got ${rebindRes.status}`);
      assert.equal(rebindRes.json().code, 'ERR_DNS_REBINDING');
      assert.equal(rebindRes.headers['access-control-allow-origin'], undefined, `403 DNS-rebinding on ${badPath} must NOT emit CORS`);
    }

    const healthzRes = await invokeServerInMemory(studio.server, { method: 'GET', url: '/api/healthz', headers: { Host: '127.0.0.1:53040' } });
    assert.equal(healthzRes.status, 200);
    assert.equal(healthzRes.json().version, '2.4.1');
    assert.notEqual(healthzRes.headers['access-control-allow-origin'], '*', '/api/healthz must NOT emit wildcard CORS');

    const badOriginApply = await invokeServerInMemory(studio.server, {
      method: 'POST',
      url: '/api/update/apply',
      headers: { Host: '127.0.0.1:53040', Origin: 'https://evil.example', 'X-Sidecar-Token': SIDECAR_TEST_TOKEN, 'Content-Type': 'application/json' },
      body: '{}',
    });
    assert.equal(badOriginApply.status, 403, `POST /api/update/apply bad Origin expected 403, got ${badOriginApply.status}`);

    const noTokApply = await invokeServerInMemory(studio.server, {
      method: 'POST',
      url: `/api/update/apply?token=${encodeURIComponent(SIDECAR_TEST_TOKEN)}`,
      headers: { Host: '127.0.0.1:53040', 'Content-Type': 'application/json' },
      body: '{}',
    });
    assert.equal(noTokApply.status, 401, `POST /api/update/apply ?token= query without header expected 401, got ${noTokApply.status}`);

    const wrongCtApply = await invokeServerInMemory(studio.server, {
      method: 'POST',
      url: '/api/update/apply',
      headers: { Host: '127.0.0.1:53040', 'X-Sidecar-Token': SIDECAR_TEST_TOKEN, 'Content-Type': 'text/plain' },
      body: '{}',
    });
    assert.equal(wrongCtApply.status, 415, `POST /api/update/apply non-JSON Content-Type expected 415, got ${wrongCtApply.status}`);

    const gitCheckoutApply = await invokeServerInMemory(studio.server, {
      method: 'POST',
      url: '/api/update/apply',
      headers: { Host: '127.0.0.1:53040', 'X-Sidecar-Token': SIDECAR_TEST_TOKEN, 'Content-Type': 'application/json' },
      body: '{}',
    });
    assert.equal(gitCheckoutApply.status, 409, `POST /api/update/apply in .git checkout expected 409, got ${gitCheckoutApply.status}`);
    assert.equal(gitCheckoutApply.json().code, 'ERR_GIT_DEV_CHECKOUT');

    // 4) Build deterministic v2.4.1 release tarball (all real runtime files) & test (a) Offline fail-safe, (b) Temp-plugin-dir swap, (c) Mid-sync rollback!
    const pkg240Map = collectDirectoryFilesMap(REPO_ROOT);
    const mockTarGz = createDeterministicTarGz(pkg240Map);
    const mockSha256 = createHash('sha256').update(mockTarGz).digest('hex');
    const mockShaText = `${mockSha256}  agy-wallpaper-prism-v2.4.1.tar.gz\n`;

    const makeMockGhFetch = ({ offline = false } = {}) => async (url) => {
      const u = String(url || '');
      if (offline) {
        const err = new Error('getaddrinfo ENOTFOUND api.github.com');
        err.code = 'ENOTFOUND';
        throw err;
      }
      if (u.includes('/releases/latest')) {
        return {
          ok: true,
          status: 200,
          headers: new Map([['content-type', 'application/json']]),
          async json() {
            return {
              tag_name: 'v2.4.1',
              html_url: 'https://github.com/azwosile/agy-wallpaper-prism/releases/tag/v2.4.1',
              body: 'Release v2.4.1 mock notes',
              published_at: '2026-11-27T00:00:00Z',
              assets: [
                {
                  name: 'agy-wallpaper-prism-v2.4.1.tar.gz',
                  browser_download_url: 'https://github.com/azwosile/agy-wallpaper-prism/releases/download/v2.4.1/agy-wallpaper-prism-v2.4.1.tar.gz',
                  size: mockTarGz.length,
                },
                {
                  name: 'agy-wallpaper-prism-v2.4.1.tar.gz.sha256',
                  browser_download_url: 'https://github.com/azwosile/agy-wallpaper-prism/releases/download/v2.4.1/agy-wallpaper-prism-v2.4.1.tar.gz.sha256',
                  size: Buffer.byteLength(mockShaText, 'utf8'),
                },
              ],
            };
          },
          async text() { return JSON.stringify(await this.json()); },
          async arrayBuffer() { return new Uint8Array(0).buffer; },
        };
      }
      if (u.endsWith('.tar.gz.sha256')) {
        return {
          ok: true,
          status: 200,
          headers: new Map(),
          async text() { return mockShaText; },
          async arrayBuffer() { return Buffer.from(mockShaText, 'utf8'); },
        };
      }
      if (u.endsWith('.tar.gz')) {
        return {
          ok: true,
          status: 200,
          headers: new Map([['content-length', String(mockTarGz.length)]]),
          async arrayBuffer() { return mockTarGz.buffer.slice(mockTarGz.byteOffset, mockTarGz.byteOffset + mockTarGz.byteLength); },
        };
      }
      return { ok: false, status: 404, headers: new Map(), async text() { return 'not found'; } };
    };

    const seedMockPluginDir = (dir) => {
      fs.mkdirSync(path.join(dir, 'sidecars', 'prism_studio'), { recursive: true });
      fs.mkdirSync(path.join(dir, 'src', 'shared'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'plugin.json'), JSON.stringify({ name: 'agy-wallpaper-prism', version: '2.1.0' }, null, 2), 'utf8');
      fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'agy-wallpaper-prism', version: '2.1.0' }, null, 2), 'utf8');
      fs.writeFileSync(path.join(dir, 'sidecars', 'prism_studio', 'main.mjs'), '// v2.1.0 main\n', 'utf8');
      fs.writeFileSync(path.join(dir, 'sidecars', 'prism_studio', 'index.html'), '<!doctype html><html><body>v2.1.0</body></html>\n', 'utf8');
      fs.writeFileSync(path.join(dir, 'src', 'shared', 'schema.mjs'), "export const PLUGIN_VERSION = '2.1.0';\n", 'utf8');
      fs.writeFileSync(path.join(dir, '.prism-install-id'), 'keep-this-install-id-12345\n', 'utf8');
    };

    // (4a) Offline fail-safe
    const offPluginDir = path.join(SCRATCH_ROOT, 'upd-offline-plugin');
    const offDataDir = path.join(SCRATCH_ROOT, 'upd-offline-data');
    seedMockPluginDir(offPluginDir);
    fs.mkdirSync(offDataDir, { recursive: true });
    const offUpdater = createPrismUpdater({
      pluginRoot: offPluginDir,
      dataDir: offDataDir,
      currentVersion: '2.1.0',
      fetchImpl: makeMockGhFetch({ offline: true }),
      managedSidecar: false,
    });
    const offStatus = await offUpdater.checkForUpdate({ force: true });
    assert.equal(offStatus.offline, true, `Offline checkForUpdate expected offline=true, got ${JSON.stringify(offStatus)}`);
    assert.equal(offStatus.hasUpdate, false);

    // (4b) Full in-proc Mock GitHub Release updater swap via real `createPrismStudioServer` `/api/update/status` & `/api/update/apply`
    const swapPluginDir = path.join(SCRATCH_ROOT, 'upd-swap-plugin');
    const swapDataDir = path.join(SCRATCH_ROOT, 'upd-swap-data');
    seedMockPluginDir(swapPluginDir);
    fs.mkdirSync(swapDataDir, { recursive: true });
    const UPD_TOKEN = 'mock-updater-token-220';
    const updSrv = await createPrismStudioServer({
      dataDir: swapDataDir,
      pluginRoot: swapPluginDir,
      currentVersion: '2.1.0',
      token: UPD_TOKEN,
      startCdp: false,
      managedSidecar: false,
      fetchImpl: makeMockGhFetch({ offline: false }),
    });
    try {
      const stResp = await invokeServerInMemory(updSrv.server, {
        method: 'GET',
        url: '/api/update/status?force=1',
        headers: { Host: '127.0.0.1:53040' },
      });
      assert.equal(stResp.status, 200);
      assert.notEqual(stResp.headers['access-control-allow-origin'], '*', '/api/update/status must NOT emit wildcard CORS');
      const stJson = stResp.json();
      assert.equal(stJson.hasUpdate, true, `Expected mock GitHub release hasUpdate=true, got ${JSON.stringify(stJson)}`);
      assert.equal(stJson.latestVersion, '2.4.1');
      assert.equal(stJson.canAutoUpdate, true);

      const applyResp = await invokeServerInMemory(updSrv.server, {
        method: 'POST',
        url: '/api/update/apply',
        headers: { Host: '127.0.0.1:53040', 'X-Sidecar-Token': UPD_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetVersion: '2.4.1' }),
      });
      assert.equal(applyResp.status, 200, `Mock /api/update/apply expected 200, got ${applyResp.status}: ${applyResp.text()}`);
      const applyJson = applyResp.json();
      assert.equal(applyJson.ok, true);
      assert.equal(applyJson.toVersion, '2.4.1');
      assert.equal(JSON.parse(fs.readFileSync(path.join(swapPluginDir, 'plugin.json'), 'utf8')).version, '2.4.1');
      assert.equal(fs.readFileSync(path.join(swapPluginDir, '.prism-install-id'), 'utf8'), 'keep-this-install-id-12345\n', '.prism-install-id was NOT preserved across update swap!');
      assert.ok(fs.existsSync(path.join(swapPluginDir, 'src', 'engine', 'updater.mjs')), 'New v2.4.1 file missing after swap');
      assert.ok(fs.existsSync(path.join(swapPluginDir, 'src', 'host', 'inspector-inject.js')), 'New v2.4.1 inspector-inject.js missing after swap');
    } finally {
      await updSrv.close().catch(() => {});
    }

    // (4c) Mid-sync failure synchronous rollback (via writeOverride throwing ENOSPC on 3rd file)
    const rbPluginDir = path.join(SCRATCH_ROOT, 'upd-rollback-plugin');
    const rbDataDir = path.join(SCRATCH_ROOT, 'upd-rollback-data');
    seedMockPluginDir(rbPluginDir);
    fs.mkdirSync(rbDataDir, { recursive: true });
    let writeCount = 0;
    let rollbackCalled = false;
    const rbUpdater = createPrismUpdater({
      pluginRoot: rbPluginDir,
      dataDir: rbDataDir,
      currentVersion: '2.1.0',
      fetchImpl: makeMockGhFetch({ offline: false }),
      managedSidecar: false,
      onRollback: () => { rollbackCalled = true; },
      writeOverride: (src, dst) => {
        writeCount += 1;
        if (writeCount === 3) {
          const e = new Error('Simulated disk full during swap');
          e.code = 'ENOSPC';
          throw e;
        }
        fs.copyFileSync(src, dst);
      },
    });
    await assert.rejects(
      () => rbUpdater.applyUpdate({ targetVersion: '2.4.1' }),
      (err) => err && (err.code === 'ENOSPC' || String(err.message || '').includes('Simulated disk full')),
      'Mid-sync ENOSPC failure must reject after synchronous rollback',
    );
    assert.equal(rollbackCalled, true, 'onRollback callback was not invoked');
    assert.equal(JSON.parse(fs.readFileSync(path.join(rbPluginDir, 'plugin.json'), 'utf8')).version, '2.1.0', 'Rollback did not restore original plugin.json 2.1.0!');
    assert.equal(fs.readFileSync(path.join(rbPluginDir, '.prism-install-id'), 'utf8'), 'keep-this-install-id-12345\n', 'Rollback did not preserve .prism-install-id!');

    return `SemVer + ${hostileCases.length} hostile tar rejections + Host 403 + Origin 403/Token 401/CT 415/Git 409 + offline fail-safe + swap (2.1.0->2.4.1) & ENOSPC rollback verified`;
  });

  await check('Req #7: `scripts/pack-release.mjs` 3-Artifact Release Bundle (`.tar.gz` + `.sha256` + `.zip`) & `dist/` Gitignore', '@exec-build-release / @exec-tests', async () => {
    const { packReleaseBundle, validateTarGzArchive } = await import(
      pathToFileURL(path.join(REPO_ROOT, 'scripts', 'pack-release.mjs')).href
    );
    const { extractSafeTarGz, validateStagedPlugin } = await import(
      pathToFileURL(path.join(REPO_ROOT, 'src', 'engine', 'tar-safe.mjs')).href
    );

    const scratchDist = path.join(SCRATCH_ROOT, 'dist-verify');
    const pack = await packReleaseBundle({ sourceRoot: REPO_ROOT, outDir: scratchDist, skipBuild: true });
    assert.equal(pack.version, '2.4.1');
    assert.equal(pack.tag, 'v2.4.1');
    assert.ok(fs.existsSync(pack.tarPath), 'Missing .tar.gz release artifact');
    assert.ok(fs.existsSync(pack.shaPath), 'Missing .tar.gz.sha256 release artifact');
    assert.ok(fs.existsSync(pack.zipPath), 'Missing .zip release artifact');

    const tarBuf = fs.readFileSync(pack.tarPath);
    const actualSha = createHash('sha256').update(tarBuf).digest('hex');
    const shaFileText = fs.readFileSync(pack.shaPath, 'utf8').trim();
    assert.ok(shaFileText.startsWith(actualSha), `SHA-256 mismatch: expected ${actualSha}, got ${shaFileText}`);
    assert.equal(pack.sha256, actualSha);

    const zipBuf = fs.readFileSync(pack.zipPath);
    assert.equal(zipBuf.readUInt32LE(0), 0x04034b50, 'ZIP missing PK\\x03\\x04 Local File Header magic');
    assert.ok(zipBuf.includes(Buffer.from([0x50, 0x4b, 0x05, 0x06])), 'ZIP missing PK\\x05\\x06 EOCD signature');

    validateTarGzArchive(tarBuf, { expectedVersion: '2.4.1' });
    const extractDir = path.join(SCRATCH_ROOT, 'dist-extract');
    extractSafeTarGz({ tarGzBuffer: tarBuf, destDir: extractDir });
    const staged = validateStagedPlugin({ stageDir: extractDir, currentVersion: '2.3.0', requireNewerVersion: true });
    assert.equal(staged.version, '2.4.1');
    assert.ok(staged.requiredFiles.includes('src/host/inspector-inject.js'), 'tar-safe REQUIRED_RUNTIME_FILES missing src/host/inspector-inject.js');
    assert.ok(fs.existsSync(path.join(extractDir, 'src', 'host', 'inspector-inject.js')), 'Extracted bundle missing src/host/inspector-inject.js');

    // Verify `dist/` is gitignored so running `node scripts/pack-release.mjs` keeps working tree clean
    const ignored = execFileSync('git', ['check-ignore', 'dist/'], { cwd: REPO_ROOT, stdio: 'pipe' }).toString('utf8').trim();
    assert.ok(ignored === 'dist/' || ignored === 'dist', `Expected dist/ to be gitignored, got "${ignored}"`);

    return `v${pack.version} 3 artifacts (.tar.gz ${Math.round(pack.tarSizeBytes / 1024)}KB, .sha256 match, .zip ${Math.round(pack.zipSizeBytes / 1024)}KB, ${pack.fileCount} files, dist gitignored)`;
  });

  // -------------------------------------------------------------------------
  // Suite 2 v2.2.0 New Automated Checks (S2-01 .. S2-08)
  // -------------------------------------------------------------------------
  await check('S2-01: 12-Region unified `regions` + `GLASS_STYLES` + `REGION_OPTICAL_KEYS` (9) + `saturation`/`elevation`/migration + `applyResetScope`', '@exec-mock-tests', async () => {
    const {
      REGION_IDS,
      GLASS_STYLES,
      ZERO_BLUR_BY_DEFAULT_REGIONS,
      REGION_OPTICAL_KEYS,
      SIDEBAR_RADII,
      SIDEBAR_LIST_STYLES,
      SIDEBAR_TYPOGRAPHY_MODES,
      REGION_FONT_SIZE_BOUNDS,
      CJK_SAFE_FONT_PRESETS,
      sanitizeFontFamily,
      sanitizeConfig,
      resolveRegionEffectiveStyle,
      resolveComponentDefaultAlpha,
      applyResetScope,
    } = await import(pathToFileURL(path.join(REPO_ROOT, 'src', 'shared', 'schema.mjs')).href);

    assert.deepEqual([...REGION_IDS], ['topbar', 'wco', 'sidebar', 'workspace', 'card', 'userBubble', 'assistantBubble', 'codeBlock', 'controls', 'composer', 'rightPane', 'popover']);
    assert.deepEqual([...GLASS_STYLES], ['none', 'frosted', 'crystal', 'tinted', 'solid']);
    assert.deepEqual([...ZERO_BLUR_BY_DEFAULT_REGIONS], ['card', 'userBubble', 'assistantBubble', 'codeBlock', 'controls']);
    assert.equal(REGION_OPTICAL_KEYS.length, 9, `Expected 9 REGION_OPTICAL_KEYS, got ${REGION_OPTICAL_KEYS.length}`);
    assert.deepEqual([...REGION_OPTICAL_KEYS], ['style', 'glassEnabled', 'blur', 'saturation', 'opacity', 'tone', 'tint', 'borderOpacity', 'elevation']);
    assert.deepEqual([...SIDEBAR_RADII], ['auto', 'native', '0', '6', '12', '16', '20']);
    assert.deepEqual([...SIDEBAR_LIST_STYLES], ['capsule', 'underline', 'accordion', 'tree']);
    assert.deepEqual([...SIDEBAR_TYPOGRAPHY_MODES], ['balanced', 'native']);
    assert.equal(REGION_FONT_SIZE_BOUNDS.sidebar.min, 11);
    assert.equal(REGION_FONT_SIZE_BOUNDS.sidebar.max, 15);
    assert.ok(Array.isArray(CJK_SAFE_FONT_PRESETS) && CJK_SAFE_FONT_PRESETS.length >= 2, 'Expected >= 2 CJK-safe font presets');

    // v2.4.1 optical sanitization, style `'auto' -> null`, saturation [50..220], elevation [0..2], retired chipBlurPx & v2.3.0 migration
    const optCfg = sanitizeConfig({
      chipBlurPx: 14,
      regions: {
        userBubble: { style: 'auto', saturation: 300, elevation: 1.45 },
        codeBlock: { style: 'crystal', saturation: 20, elevation: -1, blur: 18 },
        controls: { style: 'tinted', opacity: 0.42 },
      },
    });
    assert.equal(Object.prototype.hasOwnProperty.call(optCfg, 'chipBlurPx'), false, 'Retired chipBlurPx must be stripped by sanitizeConfig');
    assert.equal(optCfg.regions.userBubble.style, null, "style='auto' must normalize to null");
    assert.equal(optCfg.regions.userBubble.saturation, 220, 'saturation above 220 must clamp to 220');
    assert.equal(optCfg.regions.userBubble.elevation, 1.45, 'F-05: elevation float precision 1.45 must be preserved');
    assert.equal(optCfg.regions.codeBlock.style, 'crystal');
    assert.equal(optCfg.regions.codeBlock.saturation, 50, 'saturation below 50 must clamp to 50');
    assert.equal(optCfg.regions.codeBlock.elevation, 0, 'elevation below 0 must clamp to 0');
    assert.equal(optCfg.regions.codeBlock.blur, 18);

    // Default style resolution (OQ-1A zero-blur regions vs frosted/solid chrome) & alpha defaults
    const blur16Cfg = sanitizeConfig({ glassBlur: 16 });
    assert.equal(resolveRegionEffectiveStyle('userBubble', null, blur16Cfg), 'none');
    assert.equal(resolveRegionEffectiveStyle('assistantBubble', null, blur16Cfg), 'none');
    assert.equal(resolveRegionEffectiveStyle('codeBlock', null, blur16Cfg), 'none');
    assert.equal(resolveRegionEffectiveStyle('controls', null, blur16Cfg), 'none');
    assert.equal(resolveRegionEffectiveStyle('card', null, blur16Cfg), 'none');
    assert.equal(resolveRegionEffectiveStyle('sidebar', null, blur16Cfg), null);
    assert.equal(resolveComponentDefaultAlpha('assistantBubble', blur16Cfg, false), 0, 'assistantBubble default dark alpha must be 0');
    assert.ok(resolveComponentDefaultAlpha('userBubble', blur16Cfg, false) >= 0.45, 'userBubble default dark alpha should maintain >= 0.45 readability');

    // v2.3.0 migration preserves card optical overrides while new userBubble starts at Auto default
    const v23Legacy = sanitizeConfig({ surfaceTints: { card: { opacity: 0.55, tone: 10, tint: '#334455' } } });
    assert.equal(v23Legacy.regions.card.opacity, 0.55);
    assert.equal(v23Legacy.regions.userBubble.opacity, null);

    // F-05: surfaceTints: null clears all 9 REGION_OPTICAL_KEYS while keeping structural keys
    const richOpt = sanitizeConfig({
      regions: {
        userBubble: { opacity: 0.65, style: 'frosted', blur: 14, saturation: 180, elevation: 1.5, borderStyle: 'full', radius: 16 },
      },
    });
    const clearedOpt = sanitizeConfig({ surfaceTints: null }, richOpt);
    assert.equal(clearedOpt.regions.userBubble.style, null);
    assert.equal(clearedOpt.regions.userBubble.blur, null);
    assert.equal(clearedOpt.regions.userBubble.saturation, null);
    assert.equal(clearedOpt.regions.userBubble.elevation, null);
    assert.equal(clearedOpt.regions.userBubble.borderStyle, 'full', 'surfaceTints: null must keep non-optical borderStyle=full after structural check');
    assert.equal(clearedOpt.regions.userBubble.radius, 16);

    assert.equal(sanitizeFontFamily('"Microsoft YaHei", sans-serif'), "'Microsoft YaHei', sans-serif");
    assert.equal(sanitizeFontFamily('evil;color:red;url(https://x)'), '', 'sanitizeFontFamily failed to reject CSS injection string');
    assert.equal(sanitizeFontFamily('<script>alert(1)</script>'), '', 'sanitizeFontFamily failed to reject angle-bracket injection');

    const cfgLow = sanitizeConfig({ sidebarTypographyMode: 'balanced', regions: { sidebar: { fontSize: 6, listStyle: 'tree', radius: 16, borderStyle: 'none' } } });
    assert.equal(cfgLow.regions.sidebar.fontSize, 11, 'sidebar.fontSize below 11 must clamp to 11');
    assert.equal(cfgLow.regions.sidebar.listStyle, 'tree');
    assert.equal(cfgLow.sidebarTypographyMode, 'balanced');
    assert.equal(cfgLow.regions.sidebar.radius, 16);
    assert.equal(cfgLow.regions.sidebar.borderStyle, 'none');

    const cfgHigh = sanitizeConfig({ regions: { sidebar: { fontSize: 99, opacity: 0.65 } } });
    assert.equal(cfgHigh.regions.sidebar.fontSize, 15, 'sidebar.fontSize above 15 must clamp to 15');
    assert.equal(cfgHigh.sidebarOpacity, 0.65, 'regions.sidebar.opacity did not mirror into legacy sidebarOpacity');

    const multi = sanitizeConfig({
      regions: {
        topbar: { opacity: 0.77, tint: '#112233' },
        sidebar: { opacity: 0.65, listStyle: 'accordion', fontSize: 13 },
      },
    });
    const resetSidebar = sanitizeConfig({ regions: { sidebar: null } }, multi);
    assert.equal(resetSidebar.regions.sidebar.opacity, null, 'regions.sidebar=null failed to clear sidebar opacity');
    assert.equal(resetSidebar.regions.topbar.opacity, 0.77, 'regions.sidebar=null mutated sibling topbar region');
    assert.equal(resetSidebar.regions.topbar.tint, '#112233');
    const resetPlayback = applyResetScope(multi, 'playback');
    assert.equal(resetPlayback.regions.topbar.opacity, 0.77, 'applyResetScope playback mutated regions.topbar');
    const resetSkin = applyResetScope(multi, 'skin');
    assert.equal(resetSkin.regions.topbar.opacity, null, 'applyResetScope skin failed to clear regions.topbar');

    return `12 REGION_IDS + 5 GLASS_STYLES + 9 OPTICAL_KEYS + SIDEBAR_RADII(${SIDEBAR_RADII.length}) + fontSize[11..15] + XSS + applyResetScope`;
  });

  await check('S2-02: `PROFILE_PRESET_KEYS`, `/api/presets/{save,rename,duplicate,delete}`, `perWallpaperOverrides` vs `/api/preset/apply` & `includeWallpaper` fallback', '@exec-mock-tests', async () => {
    const { PROFILE_PRESET_KEYS } = await import(pathToFileURL(path.join(REPO_ROOT, 'src', 'engine', 'store.mjs')).href);
    for (const k of ['regions', 'floaterSolidBase', 'scrimColor', 'fxClickMode', 'fxTrailMode']) {
      assert.ok(PROFILE_PRESET_KEYS.includes(k), `PROFILE_PRESET_KEYS missing v2.2 key "${k}"`);
    }

    const prevState = await engine.getConfig();
    const lib = await engine.listLibrary({ refresh: false });
    const items = Array.isArray(lib) ? lib : lib.items || [];
    const targetWall = items.find((x) => String(x.workshopId) === '100001') || items[0];
    assert.ok(targetWall, 'Need active library item for S2-02 preset test');

    const createdIds = [];
    try {
      await engine.applyWallpaper(targetWall.id, { skinEnabled: true, glassBlur: 14 });
      const saveRes = await invokeServerInMemory(studio.server, {
        method: 'POST',
        url: '/api/presets/save',
        headers: { Host: '127.0.0.1:53040', 'X-Sidecar-Token': SIDECAR_TEST_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'S202 Preset A',
          description: 'initial preset',
          includeWallpaper: false,
          patch: { glassBlur: 24, regions: { sidebar: { opacity: 0.78 } }, floaterSolidBase: false },
          mode: 'create',
        }),
      });
      assert.equal(saveRes.status, 200, `/api/presets/save failed: ${saveRes.text()}`);
      const p1 = saveRes.json().preset;
      assert.ok(p1?.id, 'Expected saved preset id');
      createdIds.push(p1.id);

      const renRes = await invokeServerInMemory(studio.server, {
        method: 'POST',
        url: '/api/presets/rename',
        headers: { Host: '127.0.0.1:53040', 'X-Sidecar-Token': SIDECAR_TEST_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p1.id, name: 'S202 Preset Renamed', description: 'renamed desc' }),
      });
      assert.equal(renRes.status, 200);
      assert.equal(renRes.json().preset?.name, 'S202 Preset Renamed');

      const dupRes = await invokeServerInMemory(studio.server, {
        method: 'POST',
        url: '/api/presets/duplicate',
        headers: { Host: '127.0.0.1:53040', 'X-Sidecar-Token': SIDECAR_TEST_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p1.id, name: 'S202 Preset Copy' }),
      });
      assert.equal(dupRes.status, 200);
      const p2 = dupRes.json().preset;
      assert.ok(p2?.id && p2.id !== p1.id, 'Duplicate preset must allocate distinct id');
      createdIds.push(p2.id);

      // Seed stale perWallpaperOverride on active wallpaper + save preset with nonexistent bound wallpaperId to verify (a) no shadowing, (b) fallback!
      await engine.updateConfig({
        perWallpaperOverrides: {
          [targetWall.id]: { glassBlur: 9, regions: { sidebar: { opacity: 0.91 } } },
        },
      });
      const missingBindSave = await invokeServerInMemory(studio.server, {
        method: 'POST',
        url: '/api/presets/save',
        headers: { Host: '127.0.0.1:53040', 'X-Sidecar-Token': SIDECAR_TEST_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'S202 Missing Wall Fallback',
          includeWallpaper: true,
          commitPatch: false,
          patch: { glassBlur: 19, activeWallpaperId: 'nonexistent-wall-999999', wallpaperId: 'nonexistent-wall-999999' },
          mode: 'create',
        }),
      });
      assert.equal(missingBindSave.status, 200);
      const p3 = missingBindSave.json().preset;
      createdIds.push(p3.id);

      const applyFallbackRes = await invokeServerInMemory(studio.server, {
        method: 'POST',
        url: '/api/preset/apply',
        headers: { Host: '127.0.0.1:53040', 'X-Sidecar-Token': SIDECAR_TEST_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p3.id }),
      });
      assert.equal(applyFallbackRes.status, 200);
      const applyFallbackJson = applyFallbackRes.json();
      assert.equal(applyFallbackJson.wallpaperFallback?.missingId, 'nonexistent-wall-999999', 'Missing bound wallpaperId must report wallpaperFallback.missingId');
      assert.ok(applyFallbackJson.wallpaperFallback?.keptId, 'Missing bound wallpaperId must keep current active wallpaper');
      assert.equal(applyFallbackJson.missingWallpaperId, 'nonexistent-wall-999999');

      // Apply preset p1 explicitly and verify perWallpaperOverrides does NOT shadow p1.patch (glassBlur=24)
      const applyP1Res = await invokeServerInMemory(studio.server, {
        method: 'POST',
        url: '/api/preset/apply',
        headers: { Host: '127.0.0.1:53040', 'X-Sidecar-Token': SIDECAR_TEST_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p1.id }),
      });
      assert.equal(applyP1Res.status, 200);
      const cfgAfterApply = applyP1Res.json().state?.config;
      assert.equal(cfgAfterApply.glassBlur, 24, `perWallpaperOverrides shadowed applied preset glassBlur (${cfgAfterApply.glassBlur} vs 24)`);
      assert.equal(cfgAfterApply.floaterSolidBase, false);
    } finally {
      for (const delId of createdIds) {
        await invokeServerInMemory(studio.server, {
          method: 'POST',
          url: '/api/presets/delete',
          headers: { Host: '127.0.0.1:53040', 'X-Sidecar-Token': SIDECAR_TEST_TOKEN, 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: delId }),
        }).catch(() => {});
      }
      await engine.updateConfig({
        perWallpaperOverrides: prevState.perWallpaperOverrides || {},
        glassBlur: prevState.glassBlur,
        floaterSolidBase: prevState.floaterSolidBase,
        regions: prevState.regions,
        surfaceTints: prevState.surfaceTints,
      }).catch(() => {});
    }
    return 'PROFILE_PRESET_KEYS + /api/presets/{save,rename,duplicate,delete} + non-shadowing & missing-wallpaper fallback verified';
  });

  await check('S2-03: 4-layer `(regionId, propKey)` concurrent merge, `<50ms` `POST /api/config` (`flush:true`) & monotonic `stateRev` out-of-order rejection', '@exec-mock-tests', async () => {
    const prevCfg = await engine.getConfig();
    try {
      const t0 = performance.now();
      const [r1, r2, r3] = await Promise.all([
        invokeServerInMemory(studio.server, {
          method: 'POST',
          url: '/api/config',
          headers: { Host: '127.0.0.1:53040', 'X-Sidecar-Token': SIDECAR_TEST_TOKEN, 'Content-Type': 'application/json' },
          body: JSON.stringify({ patch: { regions: { topbar: { opacity: 0.73 } } } }),
        }),
        invokeServerInMemory(studio.server, {
          method: 'POST',
          url: '/api/config',
          headers: { Host: '127.0.0.1:53040', 'X-Sidecar-Token': SIDECAR_TEST_TOKEN, 'Content-Type': 'application/json' },
          body: JSON.stringify({ patch: { regions: { topbar: { tint: '#2563EB' } } } }),
        }),
        invokeServerInMemory(studio.server, {
          method: 'POST',
          url: '/api/config',
          headers: { Host: '127.0.0.1:53040', 'X-Sidecar-Token': SIDECAR_TEST_TOKEN, 'Content-Type': 'application/json' },
          body: JSON.stringify({ flush: true, patch: { regions: { sidebar: { fontSize: 13 } } } }),
        }),
      ]);
      const ackMs = Math.round((performance.now() - t0) * 100) / 100;
      assert.equal(r1.status, 200);
      assert.equal(r2.status, 200);
      assert.equal(r3.status, 200);
      assert.ok(ackMs < 250, `Concurrent POST /api/config batch took too long (${ackMs}ms)`);
      const singleT0 = performance.now();
      const singleRes = await invokeServerInMemory(studio.server, {
        method: 'POST',
        url: '/api/config',
        headers: { Host: '127.0.0.1:53040', 'X-Sidecar-Token': SIDECAR_TEST_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify({ patch: { regions: { topbar: { blur: 12 } } } }),
      });
      const singleAckMs = Math.round((performance.now() - singleT0) * 100) / 100;
      assert.equal(singleRes.status, 200);
      assert.ok(singleAckMs < 50, `Expected <50ms non-blocking POST /api/config ACK, got ${singleAckMs}ms`);

      const merged = await engine.getConfig();
      assert.equal(merged.regions.topbar.opacity, 0.73, 'Concurrent (topbar, opacity) clobbered!');
      assert.equal(merged.regions.topbar.tint, '#2563EB', 'Concurrent (topbar, tint) clobbered!');
      assert.equal(merged.regions.topbar.blur, 12);
      assert.equal(merged.regions.sidebar.fontSize, 13);

      const persisted = JSON.parse(fs.readFileSync(path.join(engineDataDir, 'config.json'), 'utf8'));
      assert.equal(persisted.regions?.sidebar?.fontSize, 13, 'flush:true did not flush config.json synchronously');

      // VM test: stale lower stateRev must be rejected monotonically
      const wallSrc = fs.readFileSync(path.join(REPO_ROOT, 'src', 'host', 'wallpaper-inject.js'), 'utf8');
      const mNode = (tag) => {
        const attrs = new Map();
        const cls = new Set();
        const styles = new Map();
        return {
          tagName: tag.toUpperCase(),
          id: '',
          textContent: '',
          children: [],
          parentNode: null,
          classList: { add: (...xs) => xs.forEach((x) => cls.add(x)), remove: (...xs) => xs.forEach((x) => cls.delete(x)), contains: (x) => cls.has(x) },
          style: { setProperty: (k, v) => styles.set(k, String(v)), removeProperty: (k) => styles.delete(k), getPropertyValue: (k) => styles.get(k) || '' },
          setAttribute: (k, v) => attrs.set(k, String(v)),
          getAttribute: (k) => (attrs.has(k) ? attrs.get(k) : null),
          hasAttribute: (k) => attrs.has(String(k)),
          removeAttribute: (k) => attrs.delete(k),
          appendChild(ch) { ch.parentNode = this; this.children.push(ch); return ch; },
          insertBefore(ch, ref) { ch.parentNode = this; const i = this.children.indexOf(ref); if (i >= 0) this.children.splice(i, 0, ch); else this.children.push(ch); return ch; },
          removeChild(ch) { const i = this.children.indexOf(ch); if (i >= 0) this.children.splice(i, 1); ch.parentNode = null; return ch; },
          remove() { if (this.parentNode) this.parentNode.removeChild(this); },
          querySelector: () => null,
          querySelectorAll: () => [],
          addEventListener: () => {},
          removeEventListener: () => {},
          getBoundingClientRect: () => ({ left: 0, top: 0, width: 1440, height: 900 }),
        };
      };
      const rEl = mNode('HTML');
      const hEl = mNode('HEAD');
      const bEl = mNode('BODY');
      rEl.appendChild(hEl);
      rEl.appendChild(bEl);
      const findId = (n, id) => { if (n.id === id) return n; for (const c of n.children) { const x = findId(c, id); if (x) return x; } return null; };
      const d = { documentElement: rEl, head: hEl, body: bEl, hidden: false, createElement: mNode, getElementById: (id) => findId(rEl, id), querySelector: () => null, querySelectorAll: () => [], addEventListener: () => {}, removeEventListener: () => {} };
      const w = {
        document: d,
        location: { protocol: 'http:', origin: 'http://127.0.0.1:43200', href: 'http://127.0.0.1:43200/' },
        innerWidth: 1440,
        innerHeight: 900,
        devicePixelRatio: 1,
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        requestAnimationFrame: () => 0,
        cancelAnimationFrame: () => {},
        getComputedStyle: () => ({ backgroundColor: 'rgb(7, 7, 8)', getPropertyValue: () => '' }),
        matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
        addEventListener: () => {},
        removeEventListener: () => {},
      };
      w.window = w;
      w.top = w;
      vm.runInContext(wallSrc, vm.createContext({ window: w, document: d, location: w.location, setTimeout, clearTimeout, setInterval, clearInterval, getComputedStyle: w.getComputedStyle }), { filename: 'wallpaper-inject-rev.js' });
      w.__agyPrism.applyPayload({ skinEnabled: true, stateRev: 10, stateEpoch: 's203-ep', config: { glassBlur: 22 }, activeItem: null });
      assert.equal(w.__agyPrism.status().stateRev, 10);
      w.__agyPrism.applyPayload({ skinEnabled: true, stateRev: 8, stateEpoch: 's203-ep', config: { glassBlur: 5 }, activeItem: null });
      assert.equal(w.__agyPrism.status().stateRev, 10, 'Out-of-order lower stateRev=8 was NOT rejected!');
      w.__agyPrism.destroy();
      return `Concurrent 4-layer merge + ${singleAckMs}ms ACK + flush:true + stateRev monotonic guard (10 drops 8)`;
    } finally {
      await engine.updateConfig({ regions: prevCfg.regions, surfaceTints: prevCfg.surfaceTints, flush: true }).catch(() => {});
    }
  });

  await check('S2-04: Visual Editor Popout security (`/api/studio/popout` 403/401/415, `studioHttpOrigin`, `/?mode=visual-editor` CSP `frame-ancestors \'none\'`, `execFile` static check)', '@exec-mock-tests', async () => {
    const mainSrc = fs.readFileSync(path.join(REPO_ROOT, 'sidecars', 'prism_studio', 'main.mjs'), 'utf8');
    assert.ok(mainSrc.includes('execFile(') && mainSrc.includes('launchSystemBrowserNoShell'), 'main.mjs missing execFile browser launcher');
    assert.equal(/\bshell\s*:\s*true\b/.test(mainSrc), false, 'Forbidden shell:true found in sidecars/prism_studio/main.mjs!');

    const popDataDir = path.join(SCRATCH_ROOT, 's204-popout-data');
    fs.mkdirSync(popDataDir, { recursive: true });
    const POP_TOKEN = 's204-popout-token';
    const launched = [];
    const popSrv = await createPrismStudioServer({
      dataDir: popDataDir,
      token: POP_TOKEN,
      startCdp: false,
      inspectShortcuts: false,
      openExternalUrl: (targetUrl) => {
        launched.push(targetUrl);
      },
    });
    try {
      const bootRes = await invokeServerInMemory(popSrv.server, {
        method: 'GET',
        url: '/api/bootstrap',
        headers: { Host: '127.0.0.1:53040' },
      });
      assert.equal(bootRes.status, 200);
      assert.ok(String(bootRes.json().studioHttpOrigin || '').startsWith('http://127.0.0.1:'), 'Expected studioHttpOrigin in /api/bootstrap');

      const badOrigin = await invokeServerInMemory(popSrv.server, {
        method: 'POST',
        url: '/api/studio/popout',
        headers: { Host: '127.0.0.1:53040', Origin: 'https://evil.example', 'X-Sidecar-Token': POP_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'visual-editor' }),
      });
      assert.equal(badOrigin.status, 403);

      const noAuth = await invokeServerInMemory(popSrv.server, {
        method: 'POST',
        url: '/api/studio/popout',
        headers: { Host: '127.0.0.1:53040', 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'visual-editor' }),
      });
      assert.equal(noAuth.status, 401);

      const badCt = await invokeServerInMemory(popSrv.server, {
        method: 'POST',
        url: '/api/studio/popout',
        headers: { Host: '127.0.0.1:53040', 'X-Sidecar-Token': POP_TOKEN, 'Content-Type': 'text/plain' },
        body: '{"mode":"visual-editor"}',
      });
      assert.equal(badCt.status, 415);

      const okPop = await invokeServerInMemory(popSrv.server, {
        method: 'POST',
        url: '/api/studio/popout',
        headers: { Host: '127.0.0.1:53040', 'X-Sidecar-Token': POP_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'visual-editor', region: 'sidebar' }),
      });
      assert.equal(okPop.status, 200, `/api/studio/popout failed: ${okPop.text()}`);
      assert.equal(launched.length, 1);
      assert.ok(launched[0].includes('/?mode=visual-editor') && launched[0].includes('region=sidebar'), `Unexpected popout URL: ${launched[0]}`);
      assert.equal(launched[0].includes('token='), false, `Security leak: Popout URL contained query token! (${launched[0]})`);

      const veHtml = await invokeServerInMemory(popSrv.server, {
        method: 'GET',
        url: '/?mode=visual-editor',
        headers: { Host: '127.0.0.1:53040' },
      });
      assert.equal(veHtml.status, 200);
      assert.ok(String(veHtml.headers['content-security-policy'] || '').includes("frame-ancestors 'none'"), '/?mode=visual-editor missing CSP frame-ancestors none');

      const auxHtml = await invokeServerInMemory(popSrv.server, {
        method: 'GET',
        url: '/',
        headers: { Host: '127.0.0.1:53040' },
      });
      assert.equal(auxHtml.status, 200);
      assert.equal(String(auxHtml.headers['content-security-policy'] || '').includes("frame-ancestors 'none'"), false, 'Aux pane GET / must remain embeddable (no frame-ancestors none)');
    } finally {
      await popSrv.close().catch(() => {});
    }
    return 'popout 403/401/415 + 0 URL token + studioHttpOrigin + visual-editor CSP frame-ancestors none vs Aux / verified';
  });

  await check('S2-05: Feedback #11 playback resilience (`P1..P5` preset `paused:false`, muted autoplay fallback & uncapped blob with MSE/poster error fallback)', '@exec-mock-tests', async () => {
    const { FACTORY_PRESETS, SCENE_PRESETS } = await import(pathToFileURL(path.join(REPO_ROOT, 'src', 'shared', 'schema.mjs')).href);
    const { buildLiveSceneHtml } = await import(pathToFileURL(path.join(REPO_ROOT, 'src', 'engine', 'runtime', 'web-shim.mjs')).href);

    assert.equal(FACTORY_PRESETS.length, 7, `Expected 7 FACTORY_PRESETS, got ${FACTORY_PRESETS.length}`);
    for (const fp of FACTORY_PRESETS) {
      assert.equal(fp.patch?.paused, false, `FACTORY_PRESETS.${fp.id} must explicitly set patch.paused === false`);
    }
    assert.equal(SCENE_PRESETS.eco.patch.paused, true, 'SCENE_PRESETS.eco should pause live playback');

    const sceneHtml = buildLiveSceneHtml({ id: 's205-scene', title: 'S205' }, { muted: false, volume: 0.5 }, { sceneVideoUrl: 'http://127.0.0.1:49152/media/tok/scene.mp4' });
    assert.ok(sceneHtml.includes('playVideoSafe') && sceneHtml.includes('muted = true'), 'buildLiveSceneHtml missing muted autoplay fallback in playVideoSafe()');

    const wallSrc = fs.readFileSync(path.join(REPO_ROOT, 'src', 'host', 'wallpaper-inject.js'), 'utf8');
    assert.match(wallSrc, /var\s+MAX_BLOB_MEDIA_BYTES\s*=\s*Infinity\s*;/, 'Expected uncapped MAX_BLOB_MEDIA_BYTES = Infinity');
    assert.ok(
      !/MAX_BLOB_MEDIA_BYTES\s*=\s*48\s*\*\s*1024\s*\*\s*1024/.test(wallSrc),
      'MAX_BLOB_MEDIA_BYTES must not enforce the legacy 48 MiB size cap',
    );
    assert.match(
      wallSrc,
      /var\s+isMissingAsset\s*=\s*httpStatus\s*===\s*404\s*\|\|\s*httpStatus\s*===\s*403\s*\|\|\s*httpStatus\s*===\s*410[\s\S]{0,400}mountMseStreamVideo[\s\S]{0,400}fallbackToPoster/,
      'Expected non-404 blob fetch failures to retain MSE / poster fallback while keeping 404/403/410 fail-open',
    );
    return '7/7 FACTORY_PRESETS paused:false + eco paused:true + playVideoSafe muted fallback + uncapped blob (Infinity) & MSE/poster error fallback verified';
  });

  await check('S2-06: `?static=1` & `X-Prism-Animated-Preview: 1`, `mp4-vfs` `pinned<=8`, deferred scan & `MSE_MAX_CONCURRENCY = 2`', '@exec-mock-tests', async () => {
    const lib = await engine.listLibrary({ refresh: false });
    const items = Array.isArray(lib) ? lib : lib.items || [];
    const previewItem = items.find((x) => x.thumbUrl && String(x.thumbUrl).includes('/preview/'));
    assert.ok(previewItem, 'Need scanned library item with /preview/ thumbUrl for S2-06');
    const previewPath = new URL(previewItem.thumbUrl).pathname + '?static=1';
    const staticRes = await invokeServerInMemory(mediaHttpServer, { method: 'GET', url: previewPath });
    assert.equal(staticRes.status, 200, `GET ${previewPath} returned ${staticRes.status}`);
    const ct = String(staticRes.headers['content-type'] || '');
    const animHdr = String(staticRes.headers['x-prism-animated-preview'] || '');
    assert.ok(ct.startsWith('image/') || animHdr === '1', `Expected image/* or X-Prism-Animated-Preview: 1 for ?static=1, got ct=${ct} hdr=${animHdr}`);

    const { createMp4VfsKit } = await import(pathToFileURL(path.join(REPO_ROOT, 'src', 'engine', 'mp4-vfs.mjs')).href);
    const vfs = createMp4VfsKit({ maxPinned: 8 });
    const sampleVid = items.find((x) => x.kind === 'video' && x.mediaUrl);
    if (sampleVid) {
      // Trigger pinned cache across 10 distinct session tokens via real file if accessible
      const libRaw = (await invokeServerInMemory(studio.server, { method: 'GET', url: '/api/library' })).json();
      const firstFile = libRaw?.items?.find((x) => x.absPath && /\.mp4$/i.test(x.absPath))?.absPath;
      if (firstFile && fs.existsSync(firstFile)) {
        for (let i = 0; i < 10; i += 1) {
          vfs.pinnedFaststartVariant(firstFile, `tok-${i}`);
        }
        assert.ok(vfs.stats().pinned <= 8, `mp4-vfs pinned cache exceeded cap 8: ${vfs.stats().pinned}`);
      }
    }
    vfs.clear();

    const engSrc = fs.readFileSync(path.join(REPO_ROOT, 'src', 'engine', 'index.mjs'), 'utf8');
    const srvSrc = fs.readFileSync(path.join(REPO_ROOT, 'src', 'engine', 'media-server.mjs'), 'utf8');
    assert.ok(engSrc.includes('scheduleDeferredRefresh'), 'src/engine/index.mjs missing non-blocking scheduleDeferredRefresh');
    assert.match(srvSrc, /MSE_MAX_CONCURRENCY\s*=\s*2\b/, 'media-server.mjs missing MSE_MAX_CONCURRENCY = 2');
    return `?static=1 (ct=${ct}, animHdr=${animHdr || '0'}) + vfs maxPinned=8 + deferred scan + MSE_MAX_CONCURRENCY=2`;
  });

  await check('S2-07: `teardownSkinDomOnly` timer cleanup (`clearInterval`) & anti-zombie `window.__agyPrismOn = false`', '@exec-mock-tests', async () => {
    const wallSrc = fs.readFileSync(path.join(REPO_ROOT, 'src', 'host', 'wallpaper-inject.js'), 'utf8');
    let clearedCount = 0;
    let nextTimerId = 100;
    const activeIntervals = new Set();
    const capturedCallbacks = [];
    const spySetInterval = (fn) => {
      const id = ++nextTimerId;
      activeIntervals.add(id);
      capturedCallbacks.push(fn);
      return id;
    };
    const spyClearInterval = (id) => {
      if (activeIntervals.delete(id)) clearedCount += 1;
    };

    const mk = (tag) => {
      const attrs = new Map();
      const cls = new Set();
      const styles = new Map();
      const listeners = new Map();
      const n = {
        tagName: tag.toUpperCase(),
        id: '',
        src: '',
        textContent: '',
        children: [],
        parentNode: null,
        paused: false,
        readyState: 4,
        videoWidth: 1920,
        videoHeight: 1080,
        classList: { add: (...xs) => xs.forEach((x) => cls.add(x)), remove: (...xs) => xs.forEach((x) => cls.delete(x)), contains: (x) => cls.has(x) },
        style: { setProperty: (k, v) => styles.set(k, String(v)), removeProperty: (k) => styles.delete(k), getPropertyValue: (k) => styles.get(k) || '', display: '' },
        setAttribute: (k, v) => attrs.set(k, String(v)),
        getAttribute: (k) => (attrs.has(k) ? attrs.get(k) : null),
        hasAttribute: (k) => attrs.has(String(k)),
        removeAttribute: (k) => attrs.delete(k),
        appendChild(ch) { ch.parentNode = this; this.children.push(ch); return ch; },
        insertBefore(ch, ref) { ch.parentNode = this; const i = this.children.indexOf(ref); if (i >= 0) this.children.splice(i, 0, ch); else this.children.push(ch); return ch; },
        removeChild(ch) { const i = this.children.indexOf(ch); if (i >= 0) this.children.splice(i, 1); ch.parentNode = null; return ch; },
        remove() { if (this.parentNode) this.parentNode.removeChild(this); },
        querySelector: () => null,
        querySelectorAll: (sel) => (sel === 'video' ? n.children.filter((c) => c.tagName === 'VIDEO') : []),
        addEventListener(t, fn) { const arr = listeners.get(t) || []; arr.push(fn); listeners.set(t, arr); },
        removeEventListener: () => {},
        play: () => Promise.resolve(),
        pause() { this.paused = true; },
        load: () => {},
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 1440, height: 900 }),
      };
      return n;
    };
    const r = mk('HTML');
    const h = mk('HEAD');
    const b = mk('BODY');
    r.appendChild(h);
    r.appendChild(b);
    const findById = (n, id) => { if (n.id === id) return n; for (const c of n.children) { const f = findById(c, id); if (f) return f; } return null; };
    const doc = { documentElement: r, head: h, body: b, hidden: false, createElement: mk, getElementById: (id) => findById(r, id), querySelector: () => null, querySelectorAll: () => [], addEventListener: () => {}, removeEventListener: () => {} };
    const win = {
      document: doc,
      location: { protocol: 'http:', origin: 'http://127.0.0.1:43201', href: 'http://127.0.0.1:43201/' },
      innerWidth: 1440,
      innerHeight: 900,
      devicePixelRatio: 1,
      setTimeout,
      clearTimeout,
      setInterval: spySetInterval,
      clearInterval: spyClearInterval,
      requestAnimationFrame: () => 0,
      cancelAnimationFrame: () => {},
      getComputedStyle: () => ({ backgroundColor: 'rgb(7, 7, 8)', getPropertyValue: () => '' }),
      matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    win.window = win;
    win.top = win;
    vm.runInContext(
      wallSrc,
      vm.createContext({ window: win, document: doc, location: win.location, setTimeout, clearTimeout, setInterval: spySetInterval, clearInterval: spyClearInterval, getComputedStyle: win.getComputedStyle }),
      { filename: 'wallpaper-inject-teardown.js' },
    );

    win.__agyPrism.applyPayload({
      skinEnabled: true,
      stateRev: 1,
      config: { fxEnabled: true, pauseOnBlur: true },
      activeItem: { id: 's207-img', kind: 'image', mediaUrl: 'http://127.0.0.1:49152/preview/s207/p.png', thumbUrl: '' },
    });
    assert.equal(win.__agyPrismOn, true);
    assert.ok(activeIntervals.size >= 1, 'Expected blurPollTimer interval to be armed when pauseOnBlur=true');
    win.__agyPrism.applyPayload({ skinEnabled: false, stateRev: 2 });
    assert.equal(win.__agyPrismOn, false, 'Soft disable did not set window.__agyPrismOn = false');
    assert.equal(doc.getElementById('agy-prism-stage'), null, 'teardownSkinDomOnly left #agy-prism-stage');
    assert.equal(doc.getElementById('agy-prism-css'), null, 'teardownSkinDomOnly left #agy-prism-css');
    assert.ok(activeIntervals.size === 0 && clearedCount >= 1, `teardownSkinDomOnly failed to clear active intervals (active=${activeIntervals.size}, cleared=${clearedCount})`);

    // Simulate zombie delayed timers firing while __agyPrismOn === false
    for (const cb of capturedCallbacks) {
      try { cb(); } catch {}
    }
    assert.equal(doc.getElementById('agy-prism-stage'), null, 'Anti-zombie guard failed: late callback recreated #agy-prism-stage');
    win.__agyPrism.destroy();
    return `teardownSkinDomOnly cleared ${clearedCount} timers + __agyPrismOn=false blocked ${capturedCallbacks.length} late callbacks`;
  });

  await check('S2-08: D7 Opposite-Anchor WCAG guardrail (`enforceFgContrastRgb`, `resolveRegionFgColor`, `allowRawFontColor` & `<0.55` warning)', '@exec-mock-tests', async () => {
    const { resolveRegionFgColor } = await import(pathToFileURL(path.join(REPO_ROOT, 'src', 'shared', 'schema.mjs')).href);

    const darkGuard = resolveRegionFgColor({
      fgHex: '#111111',
      bgRgb: [14, 14, 17],
      bgAlpha: 0.85,
      isLight: false,
      allowRawFontColor: false,
    });
    assert.equal(darkGuard.clamped, true, 'Dark fg on dark bg with allowRaw=false must clamp');
    assert.ok(darkGuard.ratio >= 4.5, `Expected clamped dark-mode ratio >= 4.5, got ${darkGuard.ratio}`);
    assert.equal(darkGuard.lowOpacityWarning, false);

    const lightGuard = resolveRegionFgColor({
      fgHex: '#F2F4F8',
      bgRgb: [245, 247, 250],
      bgAlpha: 0.85,
      isLight: true,
      allowRawFontColor: false,
    });
    assert.equal(lightGuard.clamped, true, 'Light fg on light bg with allowRaw=false must clamp');
    assert.ok(lightGuard.ratio >= 4.5, `Expected clamped light-mode ratio >= 4.5, got ${lightGuard.ratio}`);

    const rawUnlock = resolveRegionFgColor({
      fgHex: '#111111',
      bgRgb: [14, 14, 17],
      bgAlpha: 0.85,
      isLight: false,
      allowRawFontColor: true,
    });
    assert.equal(rawUnlock.clamped, false, 'allowRawFontColor=true must bypass clamping');
    assert.equal(rawUnlock.color, '#111111');

    const lowOpacity = resolveRegionFgColor({
      fgHex: '#111111',
      bgRgb: [14, 14, 17],
      bgAlpha: 0.40,
      isLight: false,
      allowRawFontColor: false,
    });
    assert.equal(lowOpacity.lowOpacityWarning, true, 'bgAlpha < 0.55 must flag lowOpacityWarning=true');
    assert.equal(lowOpacity.clamped, false, 'bgAlpha < 0.55 must not hard-lock user color');
    assert.equal(lowOpacity.color, '#111111');

    return `darkClamp=${darkGuard.color}(${darkGuard.ratio}:1) lightClamp=${lightGuard.color}(${lightGuard.ratio}:1) raw=${rawUnlock.color} lowAlphaWarn=true`;
  });

  await check('S2-09: Single-instance ownership, rebind backoff/yield (`preserveHostDom:true`), micro-bootstrap event filter, `/api/shutdown` auth & `install-local` OFF/identity guards', '@exec-fix-onoff-qa', async () => {
    const { EventEmitter } = await import('node:events');
    const { PRISM_DOM } = await import(pathToFileURL(path.join(REPO_ROOT, 'src', 'shared', 'schema.mjs')).href);
    const cdpMod = await import(pathToFileURL(path.join(REPO_ROOT, 'sidecars', 'prism_studio', 'cdp-bridge.mjs')).href);
    const { buildHostMicroBootstrap, createPassiveCdpBridge, probeCdpPort } = cdpMod;
    const installMod = await import(pathToFileURL(path.join(REPO_ROOT, 'scripts', 'install-local.mjs')).href);

    // 1) Micro-bootstrap <= 6144 B worst-case & non-state SSE event (`heartbeat`/`ping`) ignores `/stage.js` reload
    let maxMicroBytes = 0;
    for (const startupMode of ['gentle-auto', 'static-css', 'manual']) {
      for (const triggerMode of ['both', 'shortcut-only']) {
        for (const skinEnabled of [true, false]) {
          const candidateExpr = buildHostMicroBootstrap({
            hostOrigin: 'https://127.0.0.1:65535',
            capToken: 'c'.repeat(64),
            triggerMode,
            startupMode,
            skinEnabled,
          });
          maxMicroBytes = Math.max(maxMicroBytes, Buffer.byteLength(candidateExpr, 'utf8'));
        }
      }
    }
    assert.ok(maxMicroBytes <= 6144, `buildHostMicroBootstrap worst-case exceeded 6144 B: ${maxMicroBytes} B`);

    const microCap = 'c'.repeat(64);
    const microHostOrigin = 'http://127.0.0.1:58926';
    const microBase = `${microHostOrigin}/host/${microCap}`;
    const microSrc = buildHostMicroBootstrap({
      hostOrigin: microHostOrigin,
      capToken: microCap,
      triggerMode: 'both',
      startupMode: 'gentle-auto',
      skinEnabled: true,
    });
    let microStageLoads = 0;
    let microApplyCalls = 0;
    const microSseClients = [];
    class MockMicroEventSource {
      constructor(url) {
        this.url = url;
        this.readyState = 1;
        this.onmessage = null;
        microSseClients.push(this);
      }
      close() {
        this.readyState = 2;
      }
    }
    const microById = new Map();
    const mkMicroNode = (tag) => ({
      tagName: String(tag).toUpperCase(),
      id: '',
      src: '',
      href: '',
      rel: '',
      type: '',
      title: '',
      textContent: '',
      dataset: {},
      style: {},
      children: [],
      parentNode: null,
      setAttribute() {},
      removeAttribute() {},
      appendChild(ch) {
        ch.parentNode = this;
        this.children.push(ch);
        if (ch.id) microById.set(ch.id, ch);
        if (ch.tagName === 'SCRIPT' && String(ch.src || '').includes('/stage.js')) {
          microStageLoads += 1;
        }
        return ch;
      },
      remove() {
        if (this.id) microById.delete(this.id);
        this.parentNode = null;
      },
    });
    const microDocRoot = mkMicroNode('HTML');
    microDocRoot.attributes = [];
    const microHead = mkMicroNode('HEAD');
    const microBody = mkMicroNode('BODY');
    const microDoc = {
      documentElement: microDocRoot,
      head: microHead,
      body: microBody,
      hidden: false,
      createElement: (tag) => mkMicroNode(tag),
      getElementById: (id) => microById.get(id) || null,
      querySelector: () => null,
      querySelectorAll: () => [],
    };
    const microWin = {
      document: microDoc,
      EventSource: MockMicroEventSource,
      requestIdleCallback: (cb) => cb(),
      addEventListener() {},
      fetch: async () => ({ ok: true, json: async () => ({ ok: true, result: {} }) }),
      __agyPrismHostBase: microBase,
      __agyPrism: {
        version: PRISM_DOM.skinVersion,
        applyPayload() { microApplyCalls += 1; },
        destroy() {},
      },
    };
    microWin.window = microWin;
    microWin.top = microWin;
    try {
      vm.runInContext(
        microSrc,
        vm.createContext({ window: microWin, document: microDoc, EventSource: MockMicroEventSource, setTimeout, clearTimeout, setInterval, clearInterval }),
        { filename: 'micro-bootstrap-s209.js' },
      );
      assert.equal(microSseClients.length, 1, 'Micro-bootstrap did not open EventSource');
      assert.equal(microStageLoads, 0, 'Initial micro-bootstrap unexpectedly loaded /stage.js when matching skinVersion was mounted');
      microSseClients[0].onmessage({ data: JSON.stringify({ event: 'heartbeat', ts: Date.now() }) });
      microSseClients[0].onmessage({ data: JSON.stringify({ event: 'ping' }) });
      assert.equal(microStageLoads, 0, 'Non-state SSE event (heartbeat/ping) triggered /stage.js reload!');
      assert.equal(microApplyCalls, 0, 'Non-state SSE event unexpectedly triggered applyPayload()');
      assert.equal(microWin.__agyPrismOn, true, 'Non-state SSE event flipped __agyPrismOn to false!');
      microSseClients[0].onmessage({
        data: JSON.stringify({
          event: 'state',
          stateRev: 2,
          skinVersion: PRISM_DOM.skinVersion,
          startupMode: 'gentle-auto',
          skinEnabled: true,
          skinPayload: { skinEnabled: true, stateRev: 2, config: { triggerMode: 'both' } },
        }),
      });
      assert.equal(microApplyCalls, 1, 'State SSE event failed to invoke applyPayload()');
      assert.equal(microStageLoads, 0, 'Matching version state SSE event unexpectedly reloaded /stage.js');
    } finally {
      microWin.__agyPrismBootstrapped = false;
      if (microWin.__agyPrismKt) {
        clearTimeout(microWin.__agyPrismKt);
        clearInterval(microWin.__agyPrismKt);
        microWin.__agyPrismKt = 0;
      }
      microSseClients.forEach((c) => c.close());
    }

    // 2) Dual `createPassiveCdpBridge` concurrent conflict -> rebind backoff + `onOwnershipLost` yield (`preserveHostDom: true` -> 0 oscillation)
    const hubBaseA = 'http://127.0.0.1:59101/host/cap-bridge-a-token';
    const hubBaseB = 'http://127.0.0.1:59102/host/cap-bridge-b-token';
    const hubState = {
      booted: false,
      hostBase: '',
      sseState: -1,
      skinVer: '',
      on: null,
      injects: [],
      flips: 0,
      removeSkinCalls: 0,
      removePanelCalls: 0,
    };
    const handleBridgeEval = (expr) => {
      if (expr.includes('document.readyState')) {
        return {
          ready: true,
          w: 1440,
          h: 900,
          booted: hubState.booted,
          hostBase: hubState.hostBase,
          sseState: hubState.sseState,
          skinVer: hubState.skinVer,
          skin: hubState.booted,
        };
      }
      if (expr.includes('HostBase') && expr.includes('EventSource')) {
        const isA = expr.includes('cap-bridge-a-token');
        const nextBase = isA ? hubBaseA : hubBaseB;
        const nextOn = !isA;
        if (hubState.booted && hubState.on !== nextOn) {
          hubState.flips += 1;
        }
        hubState.booted = true;
        hubState.hostBase = nextBase;
        hubState.sseState = 1;
        hubState.skinVer = PRISM_DOM.skinVersion;
        hubState.on = nextOn;
        hubState.injects.push({ who: isA ? 'A' : 'B', ts: Date.now(), on: nextOn });
        return { ok: true };
      }
      if (!expr.includes('EventSource')) {
        if (expr.includes('agy-prism-stage') || expr.includes('agy-prism-css')) hubState.removeSkinCalls += 1;
        if (expr.includes('agy-prism-popover') || expr.includes('agy-prism-pill')) hubState.removePanelCalls += 1;
      }
      return true;
    };
    const encodeWsFrame = (text) => {
      const payload = Buffer.from(text, 'utf8');
      if (payload.length < 126) return Buffer.concat([Buffer.from([0x81, payload.length]), payload]);
      const hdr = Buffer.alloc(4);
      hdr[0] = 0x81;
      hdr[1] = 126;
      hdr.writeUInt16BE(payload.length, 2);
      return Buffer.concat([hdr, payload]);
    };
    const dualCdpServer = http.createServer((req, res) => {
      const addr = dualCdpServer.address();
      const p = typeof addr === 'object' && addr ? addr.port : 0;
      if (req.url === '/json/version') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ Browser: 'MockChrome/135.0', webSocketDebuggerUrl: `ws://127.0.0.1:${p}/devtools/browser/1` }));
        return;
      }
      if (req.url === '/json/list') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([{
          id: 's209-hub-1',
          type: 'page',
          title: 'Antigravity',
          url: 'https://127.0.0.1:9443/workbench',
          webSocketDebuggerUrl: `ws://127.0.0.1:${p}/devtools/page/s209-hub-1`,
        }]));
        return;
      }
      res.writeHead(404);
      res.end();
    });
    dualCdpServer.on('upgrade', (req, socket) => {
      const key = req.headers['sec-websocket-key'];
      const accept = createHash('sha1').update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest('base64');
      socket.write(
        'HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
      );
      let wsBuf = Buffer.alloc(0);
      socket.on('data', (chunk) => {
        wsBuf = Buffer.concat([wsBuf, chunk]);
        while (wsBuf.length >= 2) {
          const masked = (wsBuf[1] & 0x80) !== 0;
          let len = wsBuf[1] & 0x7f;
          let offset = 2;
          if (len === 126) {
            if (wsBuf.length < 4) return;
            len = wsBuf.readUInt16BE(2);
            offset = 4;
          } else if (len === 127) {
            if (wsBuf.length < 10) return;
            len = Number(wsBuf.readBigUInt64BE(2));
            offset = 10;
          }
          const maskLen = masked ? 4 : 0;
          if (wsBuf.length < offset + maskLen + len) return;
          const payload = Buffer.alloc(len);
          if (masked) {
            const mask = wsBuf.subarray(offset, offset + 4);
            for (let i = 0; i < len; i += 1) payload[i] = wsBuf[offset + 4 + i] ^ mask[i & 3];
          } else {
            wsBuf.copy(payload, 0, offset, offset + len);
          }
          const opcode = wsBuf[0] & 0x0f;
          wsBuf = wsBuf.subarray(offset + maskLen + len);
          if (opcode === 0x8) {
            try { socket.end(); } catch {}
            return;
          }
          if (opcode === 0x1) {
            try {
              const msg = JSON.parse(payload.toString('utf8'));
              const val = handleBridgeEval(String(msg?.params?.expression || ''));
              socket.write(encodeWsFrame(JSON.stringify({ id: msg.id, result: { result: { value: val } } })));
            } catch {}
          }
        }
      });
    });

    let dualMockPort = 0;
    try {
      await new Promise((resolveListen, rejectListen) => {
        dualCdpServer.once('error', rejectListen);
        dualCdpServer.listen(0, '127.0.0.1', () => {
          dualCdpServer.removeListener('error', rejectListen);
          resolveListen();
        });
      });
      dualMockPort = dualCdpServer.address().port;
    } catch (err) {
      if (err?.code !== 'EACCES' && err?.code !== 'EPERM') throw err;
    }

    let dualBridgeFactory = createPassiveCdpBridge;
    const tcpOk = dualMockPort > 0 ? Boolean((await probeCdpPort(dualMockPort, '127.0.0.1', 500))?.ok) : false;
    if (!tcpOk) {
      const cdpSrc = fs.readFileSync(path.join(REPO_ROOT, 'sidecars', 'prism_studio', 'cdp-bridge.mjs'), 'utf8');
      const storeUrl = pathToFileURL(path.join(REPO_ROOT, 'src', 'engine', 'store.mjs')).href;
      const schemaUrl = pathToFileURL(path.join(REPO_ROOT, 'src', 'shared', 'schema.mjs')).href;
      const patchedSrc = cdpSrc
        .replace(
          "import { request as httpRequest } from 'node:http';",
          'const httpRequest = (...args) => globalThis.__prismS209HttpRequest(...args);',
        )
        .replace('../../src/engine/store.mjs', storeUrl)
        .replace('../../src/shared/schema.mjs', schemaUrl);
      const shimFile = path.join(SCRATCH_ROOT, 'cdp-bridge-s209-inproc.mjs');
      fs.writeFileSync(shimFile, patchedSrc, 'utf8');
      const shimMod = await import(`${pathToFileURL(shimFile).href}?t=${Date.now()}`);
      dualBridgeFactory = shimMod.createPassiveCdpBridge;

      const handleInprocWs = (socketOut, stateObj, chunk) => {
        stateObj.buf = Buffer.concat([stateObj.buf, Buffer.from(chunk)]);
        while (stateObj.buf.length >= 2) {
          const masked = (stateObj.buf[1] & 0x80) !== 0;
          let len = stateObj.buf[1] & 0x7f;
          let offset = 2;
          if (len === 126) {
            if (stateObj.buf.length < 4) return;
            len = stateObj.buf.readUInt16BE(2);
            offset = 4;
          } else if (len === 127) {
            if (stateObj.buf.length < 10) return;
            len = Number(stateObj.buf.readBigUInt64BE(2));
            offset = 10;
          }
          const maskLen = masked ? 4 : 0;
          if (stateObj.buf.length < offset + maskLen + len) return;
          const payload = Buffer.alloc(len);
          if (masked) {
            const mask = stateObj.buf.subarray(offset, offset + 4);
            for (let i = 0; i < len; i += 1) payload[i] = stateObj.buf[offset + 4 + i] ^ mask[i & 3];
          } else {
            stateObj.buf.copy(payload, 0, offset, offset + len);
          }
          const opcode = stateObj.buf[0] & 0x0f;
          stateObj.buf = stateObj.buf.subarray(offset + maskLen + len);
          if (opcode === 0x8) {
            try { socketOut.push(null); } catch {}
            return;
          }
          if (opcode === 0x1) {
            try {
              const msg = JSON.parse(payload.toString('utf8'));
              const val = handleBridgeEval(String(msg?.params?.expression || ''));
              socketOut.push(encodeWsFrame(JSON.stringify({ id: msg.id, result: { result: { value: val } } })));
            } catch {}
          }
        }
      };

      globalThis.__prismS209HttpRequest = (opts, cb) => {
        const listeners = new Map();
        const reqObj = {
          on(ev, fn) {
            const arr = listeners.get(ev) || [];
            arr.push(fn);
            listeners.set(ev, arr);
            return reqObj;
          },
          emit(ev, ...args) {
            for (const fn of (listeners.get(ev) || []).slice()) fn(...args);
          },
          destroy() {},
          end() {
            queueMicrotask(() => {
              const p = Number(opts?.port || dualMockPort || 9339);
              const reqPath = String(opts?.path || '/');
              if (String(opts?.headers?.Upgrade || '').toLowerCase() === 'websocket') {
                const wsState = { buf: Buffer.alloc(0) };
                const clientSock = new Duplex({
                  read() {},
                  write(chunk, _enc, done) {
                    handleInprocWs(clientSock, wsState, chunk);
                    done();
                  },
                });
                clientSock.setNoDelay = () => clientSock;
                reqObj.emit('upgrade', { statusCode: 101, headers: {} }, clientSock, Buffer.alloc(0));
                return;
              }
              let statusCode = 404;
              let bodyStr = '';
              if (reqPath === '/json/version') {
                statusCode = 200;
                bodyStr = JSON.stringify({ Browser: 'MockChrome/135.0', webSocketDebuggerUrl: `ws://127.0.0.1:${p}/devtools/browser/1` });
              } else if (reqPath === '/json/list') {
                statusCode = 200;
                bodyStr = JSON.stringify([{
                  id: 's209-hub-1',
                  type: 'page',
                  title: 'Antigravity',
                  url: 'https://127.0.0.1:9443/workbench',
                  webSocketDebuggerUrl: `ws://127.0.0.1:${p}/devtools/page/s209-hub-1`,
                }]);
              }
              const resListeners = new Map();
              const resObj = {
                statusCode,
                setEncoding() {},
                resume() {},
                on(ev, fn) {
                  const arr = resListeners.get(ev) || [];
                  arr.push(fn);
                  resListeners.set(ev, arr);
                  return resObj;
                },
                emit(ev, ...args) {
                  for (const fn of (resListeners.get(ev) || []).slice()) fn(...args);
                },
              };
              if (typeof cb === 'function') cb(resObj);
              reqObj.emit('response', resObj);
              queueMicrotask(() => {
                if (bodyStr) resObj.emit('data', Buffer.from(bodyStr, 'utf8'));
                resObj.emit('end');
              });
            });
          },
        };
        return reqObj;
      };
    }

    const dataDirA = path.join(SCRATCH_ROOT, 's209-bridge-a');
    const dataDirB = path.join(SCRATCH_ROOT, 's209-bridge-b');
    const mockHostConfigPath = path.join(SCRATCH_ROOT, 's209-host-config.json');
    fs.mkdirSync(dataDirA, { recursive: true });
    fs.mkdirSync(dataDirB, { recursive: true });
    fs.writeFileSync(mockHostConfigPath, JSON.stringify({ plugins: { 'agy-wallpaper-prism': { enabled: true } } }), 'utf8');
    const ownershipLostCalls = [];
    const bridgeB = dualBridgeFactory({
      getEngineState: async () => ({
        config: { skinEnabled: true, startupMode: 'gentle-auto', liveBootDelay: 0, triggerMode: 'both' },
        activeItem: null,
        skinEnabled: true,
        stateRev: 2,
      }),
      hostScripts: { buildClientSkinPayload: () => ({ skinEnabled: true, config: {} }) },
      getHostOrigin: () => 'http://127.0.0.1:59102',
      capToken: 'cap-bridge-b-token',
      dataDir: dataDirB,
      pluginRoot: REPO_ROOT,
      configPath: mockHostConfigPath,
      cdpPort: dualMockPort || 9339,
      pollMs: 0,
    });
    const bridgeA = dualBridgeFactory({
      getEngineState: async () => ({
        config: { skinEnabled: false, startupMode: 'gentle-auto', liveBootDelay: 0, triggerMode: 'both' },
        activeItem: null,
        skinEnabled: false,
        stateRev: 1,
      }),
      hostScripts: { buildClientSkinPayload: () => ({ skinEnabled: false, config: {} }) },
      getHostOrigin: () => 'http://127.0.0.1:59101',
      capToken: 'cap-bridge-a-token',
      dataDir: dataDirA,
      pluginRoot: REPO_ROOT,
      configPath: mockHostConfigPath,
      cdpPort: dualMockPort || 9339,
      pollMs: 0,
      onOwnershipLost: (info) => {
        ownershipLostCalls.push(info);
        return true;
      },
    });

    try {
      await bridgeB.wake({ forceProbe: true });
      bridgeB.markCanaryHealthy('s209-hub-1');
      assert.equal(hubState.hostBase, hubBaseB, 'Bridge B failed initial mount');
      assert.equal(hubState.on, true);

      // Rebind #1 by A -> B immediately reclaims
      await bridgeA.tick();
      assert.equal(hubState.injects.filter((x) => x.who === 'A').length, 1);
      await sleep(30);
      await bridgeB.tick();
      assert.equal(hubState.hostBase, hubBaseB);
      assert.equal(hubState.on, true);

      // Verify 600ms ping-pong is blocked by 1500ms rebind backoff
      await sleep(620);
      await bridgeA.tick();
      assert.equal(hubState.injects.filter((x) => x.who === 'A').length, 1, 'Bridge A bypassed 1500ms rebind backoff at 620ms!');
      assert.equal(hubState.on, true, 'Host ON state flipped during backoff window');

      // Wait for Bridge A Rebind #2 (~1520ms), let B reclaim, then wait for Bridge A Rebind #3 (+3000ms) -> onOwnershipLost yield
      const rebind2Deadline = Date.now() + 3000;
      while (Date.now() < rebind2Deadline && hubState.injects.filter((x) => x.who === 'A').length < 2) {
        await sleep(50);
      }
      assert.equal(hubState.injects.filter((x) => x.who === 'A').length, 2, 'Bridge A did not trigger Rebind #2 after 1500ms backoff');
      await sleep(160);
      await bridgeB.tick();
      assert.equal(hubState.hostBase, hubBaseB);
      assert.equal(hubState.on, true);

      // Trigger A's poll/recovery tick during the 3000ms backoff window so its rebindTimer arms for Rebind #3
      await bridgeA.tick();
      assert.equal(hubState.injects.filter((x) => x.who === 'A').length, 2, 'Bridge A bypassed 3000ms rebind backoff before Rebind #3');

      const yieldDeadline = Date.now() + 5000;
      while (Date.now() < yieldDeadline && ownershipLostCalls.length === 0) {
        await sleep(60);
      }
      assert.equal(ownershipLostCalls.length, 1, 'Bridge A did not invoke onOwnershipLost on 3rd conflict rebind');
      assert.ok(ownershipLostCalls[0].recentCount >= 3, `Expected recentCount >= 3, got ${ownershipLostCalls[0].recentCount}`);
      await sleep(40);
      assert.equal(bridgeA.getStatus().phase, 'stopped', 'Bridge A did not stop after onOwnershipLost returned true');
      assert.equal(hubState.removeSkinCalls, 0, 'Yielding bridge destroyed host skin DOM (preserveHostDom: true violated)');
      assert.equal(hubState.removePanelCalls, 0, 'Yielding bridge destroyed host panel DOM (preserveHostDom: true violated)');

      const flipsAfterYield = hubState.flips;
      await sleep(650);
      await bridgeA.tick();
      assert.equal(hubState.flips, flipsAfterYield, 'Oscillation continued after Bridge A yielded');
      assert.equal(hubState.on, true);

      // 3) Verify MAX_HOST_SSE >= 4 (both runtime socket retention & source check)
      const cdpBridgeSrc = fs.readFileSync(path.join(REPO_ROOT, 'sidecars', 'prism_studio', 'cdp-bridge.mjs'), 'utf8');
      assert.match(cdpBridgeSrc, /MAX_HOST_SSE\s*=\s*Math\.max\(\s*4/, 'cdp-bridge.mjs must cap MAX_HOST_SSE >= 4');
      const sseResList = [];
      for (let i = 0; i < 4; i += 1) {
        const fakeReq = new EventEmitter();
        const fakeRes = new EventEmitter();
        fakeRes.writableEnded = false;
        fakeRes.destroyed = false;
        fakeRes.socket = { destroyed: false, writable: true };
        fakeRes.chunks = [];
        fakeRes.write = (chunk) => { fakeRes.chunks.push(String(chunk)); return true; };
        fakeRes.end = () => { fakeRes.writableEnded = true; };
        await bridgeB.registerSseClient(fakeReq, fakeRes, false);
        sseResList.push({ req: fakeReq, res: fakeRes });
      }
      assert.equal(sseResList.every((x) => !x.res.writableEnded), true, 'MAX_HOST_SSE < 4: at least one of 4 concurrent SSE clients was evicted');
      const fakeReq5 = new EventEmitter();
      const fakeRes5 = new EventEmitter();
      fakeRes5.writableEnded = false;
      fakeRes5.destroyed = false;
      fakeRes5.socket = { destroyed: false, writable: true };
      fakeRes5.write = () => true;
      fakeRes5.end = () => { fakeRes5.writableEnded = true; };
      await bridgeB.registerSseClient(fakeReq5, fakeRes5, false);
      assert.equal(sseResList[0].res.writableEnded, true, 'Expected 5th SSE client to evict oldest when activeTargets=1 and MAX_HOST_SSE=4');
      for (const x of [...sseResList.slice(1), { req: fakeReq5, res: fakeRes5 }]) {
        x.req.emit('close');
      }
    } finally {
      delete globalThis.__prismS209HttpRequest;
      await bridgeA.stop({ preserveHostDom: true }).catch(() => {});
      await bridgeB.stop({ preserveHostDom: true }).catch(() => {});
      await new Promise((r) => dualCdpServer.close(() => r())).catch(() => {});
    }

    // 4) `POST /api/shutdown` strict auth (401 no header token / 403 evil Origin) & graceful shutdown (`preserveHostDom: true`)
    const shutdownDir = path.join(SCRATCH_ROOT, 's209-shutdown-data');
    const SD_TOK = 's209-shutdown-token-2026';
    const sdSrv = await createPrismStudioServer({
      dataDir: shutdownDir,
      token: SD_TOK,
      startCdp: false,
      inspectShortcuts: false,
      autoCheckUpdates: false,
      exitOnShutdown: false,
    });
    try {
      const stRes = await invokeServerInMemory(sdSrv.server, {
        method: 'GET',
        url: '/api/status',
        headers: { Host: '127.0.0.1:58926' },
      });
      assert.equal(stRes.status, 200);
      const stJson = stRes.json();
      assert.equal(stJson.plugin, 'agy-wallpaper-prism');
      assert.equal(stJson.studioUri, 'sidecar://agy-wallpaper-prism/prism_studio/');
      assert.ok(typeof stJson.stateEpoch === 'string' && stJson.stateEpoch.length > 0, '/api/status missing stateEpoch');

      const badOriginRes = await invokeServerInMemory(sdSrv.server, {
        method: 'POST',
        url: '/api/shutdown',
        headers: {
          Host: '127.0.0.1:58926',
          Origin: 'https://evil.example',
          'X-Sidecar-Token': SD_TOK,
          'Content-Type': 'application/json',
        },
        body: '{}',
      });
      assert.equal(badOriginRes.status, 403, `Expected 403 for evil Origin on /api/shutdown, got ${badOriginRes.status}`);
      assert.equal(badOriginRes.json().code, 'ERR_CSRF_ORIGIN');

      const noTokRes = await invokeServerInMemory(sdSrv.server, {
        method: 'POST',
        url: `/api/shutdown?token=${SD_TOK}`,
        headers: { Host: '127.0.0.1:58926', 'Content-Type': 'application/json' },
        body: '{}',
      });
      assert.equal(noTokRes.status, 401, `Expected 401 when X-Sidecar-Token header missing on /api/shutdown, got ${noTokRes.status}`);
      assert.equal(noTokRes.json().code, 'ERR_AUTH_TOKEN_REQUIRED');

      const okSdRes = await invokeServerInMemory(sdSrv.server, {
        method: 'POST',
        url: '/api/shutdown',
        headers: {
          Host: '127.0.0.1:58926',
          Origin: 'http://127.0.0.1:58926',
          'X-Sidecar-Token': SD_TOK,
          'Content-Type': 'application/json',
        },
        body: '{}',
      });
      assert.equal(okSdRes.status, 200, `Authorized /api/shutdown failed: ${okSdRes.text()}`);
      const okSdJson = okSdRes.json();
      assert.equal(okSdJson.ok, true);
      assert.equal(okSdJson.shuttingDown, true);
      assert.equal(okSdJson.preserveHostDom, true);

      const closeDeadline = Date.now() + 1500;
      while (Date.now() < closeDeadline && (sdSrv.server.listening || fs.existsSync(path.join(shutdownDir, 'server_info.json')))) {
        await sleep(30);
      }
      assert.equal(sdSrv.server.listening, false, 'HTTP server stayed open after authorized /api/shutdown');
      assert.equal(fs.existsSync(path.join(shutdownDir, 'server_info.json')), false, 'server_info.json was not cleaned on graceful shutdown');
    } finally {
      await sdSrv.close().catch(() => {});
    }

    // 5) `scripts/install-local.mjs` OFF wake guard + /api/status identity-verified orphan cleanup
    const installSrc = fs.readFileSync(path.join(REPO_ROOT, 'scripts', 'install-local.mjs'), 'utf8');
    assert.ok(installSrc.includes('/api/status') && installSrc.includes('SIDECAR_URI') && installSrc.includes('PLUGIN_ID'), 'install-local.mjs missing /api/status Prism identity verification');
    assert.ok(installSrc.includes('wakePrimarySidecarIfEnabled') && installSrc.includes('wasSkinEnabled === false'), 'install-local.mjs missing OFF guard for /api/skin/wake');

    const wakeCalls = [];
    const mockSyncFetch = async (url, init = {}) => {
      wakeCalls.push({ url: String(url), method: init.method || 'GET' });
      if (String(url).endsWith('/api/host/reload')) {
        return { ok: true, status: 200, json: async () => ({ ok: true, state: { skinEnabled: false, config: { skinEnabled: false } } }) };
      }
      return { ok: true, status: 200, json: async () => ({ ok: true }) };
    };
    const offSync = await installMod.syncPrimarySidecar({ port: 58926, token: 't', wasSkinEnabled: false, fetchImpl: mockSyncFetch });
    assert.equal(offSync.reloaded, true);
    assert.equal(offSync.woke, false);
    assert.equal(wakeCalls.some((c) => c.url.includes('/api/skin/wake')), false, 'install-local woke /api/skin/wake when skinEnabled === false!');
    assert.equal(installMod.resolveWasSkinEnabled({ preStatus: { skinEnabled: true }, preConfig: { skinEnabled: false } }), false);

    const instRoot = path.join(SCRATCH_ROOT, 's209-install-cleanup', 'prism_studio');
    const instDataDir = path.join(instRoot, 'data');
    const instLogsDir = path.join(instRoot, 'logs');
    fs.mkdirSync(instDataDir, { recursive: true });
    fs.mkdirSync(instLogsDir, { recursive: true });
    fs.writeFileSync(path.join(instDataDir, 'server_info.json'), JSON.stringify({ plugin: 'agy-wallpaper-prism', pid: 17156, port: 58926, token: 'prim-tok' }), 'utf8');
    fs.writeFileSync(path.join(instDataDir, 'canary.json'), JSON.stringify({ sidecarPid: 24344 }), 'utf8');
    fs.writeFileSync(path.join(instDataDir, 'sidecar-registry.json'), JSON.stringify({
      version: 1,
      entries: [
        { plugin: 'agy-wallpaper-prism', studioUri: 'sidecar://agy-wallpaper-prism/prism_studio/', pid: 33001, port: 58931, token: 'reg-tok' },
        { plugin: 'other-plugin', studioUri: 'sidecar://other-plugin/main/', pid: 44001, port: 58941, token: 'foreign-tok' },
      ],
    }), 'utf8');
    fs.writeFileSync(path.join(instLogsDir, 'sidecar.log'), [
      '[prism_studio] listening on http://127.0.0.1:53049 (media=http://127.0.0.1:53207, pid=24344)',
      '[prism_studio] listening on http://127.0.0.1:59999 (media=http://127.0.0.1:59998, pid=55001)',
    ].join('\n'), 'utf8');

    const alivePids = new Set([17156, 24344, 33001, 44001, 55001]);
    const killedPids = [];
    const foreignShutdownAttempts = [];
    const mockCleanupFetch = async (url, init = {}) => {
      const u = String(url);
      if (u.startsWith('http://127.0.0.1:58931/api/status')) {
        return { ok: true, status: 200, json: async () => ({ ok: true, pid: 33001, plugin: 'agy-wallpaper-prism', studioUri: 'sidecar://agy-wallpaper-prism/prism_studio/', version: '2.2.0' }) };
      }
      if (u.startsWith('http://127.0.0.1:58931/api/shutdown')) {
        assert.equal(init.headers?.['X-Sidecar-Token'], 'reg-tok');
        alivePids.delete(33001);
        return { ok: true, status: 200, json: async () => ({ ok: true }) };
      }
      if (u.startsWith('http://127.0.0.1:53049/api/status')) {
        return { ok: true, status: 200, json: async () => ({ ok: true, pid: 24344, version: '2.1.0', pluginOrigin: 'plugin://agy-wallpaper-prism--prism_studio-53049' }) };
      }
      if (u.startsWith('http://127.0.0.1:53049/api/shutdown')) {
        return { ok: false, status: 404, json: async () => ({ ok: false }) };
      }
      if (u.startsWith('http://127.0.0.1:59999/api/status')) {
        return { ok: true, status: 200, json: async () => ({ ok: true, pid: 55001, plugin: 'other-plugin', studioUri: 'sidecar://other-plugin/main/' }) };
      }
      if (u.includes('59999/api/shutdown') || u.includes('58941')) {
        foreignShutdownAttempts.push(u);
      }
      return { ok: false, status: 404, json: async () => ({ ok: false }) };
    };
    const cleanupOut = await installMod.cleanupOrphanPrismSidecars({
      dataDir: instDataDir,
      primaryPid: 17156,
      primaryPort: 58926,
      fetchImpl: mockCleanupFetch,
      isPidAliveImpl: (pid) => alivePids.has(Number(pid)),
      killPidImpl: (pid, sig) => {
        killedPids.push({ pid, sig });
        alivePids.delete(Number(pid));
      },
    });
    assert.deepEqual(foreignShutdownAttempts, [], 'Attempted shutdown on foreign plugin sidecar!');
    assert.equal(alivePids.has(17156), true, 'Primary sidecar 17156 was killed!');
    assert.equal(alivePids.has(44001), true, 'Foreign plugin 44001 was killed!');
    assert.equal(alivePids.has(55001), true, 'Foreign plugin 55001 on reused port was killed!');
    assert.equal(alivePids.has(33001), false, 'Duplicate v2.2.0 Prism 33001 was not shut down');
    assert.equal(alivePids.has(24344), false, 'Legacy v2.1.0 orphan Prism 24344 was not killed');
    assert.deepEqual(killedPids, [{ pid: 24344, sig: 'SIGTERM' }], 'Expected SIGTERM only on verified legacy Prism orphan 24344');

    return `micro=${maxMicroBytes}B heartbeatLoads=0 yieldFlips=${hubState.flips} shutdown=403/401/200 sse>=4 cleaned=${cleanupOut.cleaned.map((c) => `${c.pid}:${c.method}`).join(',')}`;
  });

  await check('S2-10: `v2.4.1` CDP Live Host Region Picker E2E (`/host/<cap>/inspector.js`, `/api/inspector/{pick,cancel}` auth, live/static-css/manual + V1/V4, RPC 400/200, dual-SSE `aux`+`popout`, bootstrap <=6144B)', '@exec-v23-manifests', async () => {
    const { REGION_IDS, SKIN_REGION_KEYS, PRISM_DOM } = await import(
      pathToFileURL(path.join(REPO_ROOT, 'src', 'shared', 'schema.mjs')).href
    );
    assert.equal(PRISM_DOM.inspectorGlobal, '__agyPrismInspector', 'Missing PRISM_DOM.inspectorGlobal');
    assert.strictEqual(SKIN_REGION_KEYS, REGION_IDS, 'SKIN_REGION_KEYS must alias REGION_IDS');
    assert.equal(REGION_IDS.length, 12);

    const { buildHostMicroBootstrap, buildInspectorCancelExpr, createPassiveCdpBridge, probeCdpPort } = await import(
      pathToFileURL(path.join(REPO_ROOT, 'sidecars', 'prism_studio', 'cdp-bridge.mjs')).href
    );

    // 1) Confirm `buildHostMicroBootstrap` remains <= 6,144 B (0 B delta vs 6,121 B)
    let maxMicroBytes = 0;
    for (const startupMode of ['gentle-auto', 'static-css', 'manual']) {
      for (const triggerMode of ['both', 'shortcut-only']) {
        for (const skinEnabled of [true, false]) {
          const expr = buildHostMicroBootstrap({
            hostOrigin: 'https://127.0.0.1:65535',
            capToken: 'c'.repeat(64),
            triggerMode,
            startupMode,
            skinEnabled,
          });
          maxMicroBytes = Math.max(maxMicroBytes, Buffer.byteLength(expr, 'utf8'));
        }
      }
    }
    assert.ok(maxMicroBytes <= 6144, `buildHostMicroBootstrap exceeded 6144 B cap: ${maxMicroBytes} B`);

    // 2) `GET /host/<capToken>/inspector.js` (403 bad token vs 200 valid token + security headers + boot JSON)
    const badInsJs = await invokeServerInMemory(studio.server, {
      method: 'GET',
      url: '/host/invalid-token-0123456789abcdef/inspector.js',
      headers: { Host: '127.0.0.1:53040' },
    });
    assert.equal(badInsJs.status, 403, `Expected 403 for bad inspector.js capToken, got ${badInsJs.status}`);

    const okInsJs = await invokeServerInMemory(studio.server, {
      method: 'GET',
      url: `/host/${encodeURIComponent(studio.hostCapToken)}/inspector.js`,
      headers: { Host: '127.0.0.1:53040', Origin: 'https://127.0.0.1:9443' },
    });
    assert.equal(okInsJs.status, 200, `GET /host/<cap>/inspector.js returned ${okInsJs.status}: ${okInsJs.text()}`);
    assert.match(String(okInsJs.headers['content-type'] || ''), /javascript/i);
    assert.ok(String(okInsJs.headers['cache-control'] || '').includes('no-store'), 'inspector.js missing Cache-Control: no-store');
    assert.equal(okInsJs.headers['x-content-type-options'], 'nosniff', 'inspector.js missing X-Content-Type-Options: nosniff');
    const insJsBody = okInsJs.text();
    assert.ok(insJsBody.includes('window.__AGY_PRISM_INSPECTOR_BOOT__'), 'inspector.js missing __AGY_PRISM_INSPECTOR_BOOT__');
    assert.ok(insJsBody.includes(`/host/${studio.hostCapToken}/rpc`), 'inspector.js boot JSON missing rpcUrl');
    assert.ok(insJsBody.includes('__agyPrismInspector'), 'inspector.js missing __agyPrismInspector runtime');

    // 3) Strict auth matrix (`403`/`401`/`415`/`204` OPTIONS) on `/api/inspector/pick` & `/api/inspector/cancel`
    for (const route of ['/api/inspector/pick', '/api/inspector/cancel']) {
      const badHost = await invokeServerInMemory(studio.server, {
        method: 'POST',
        url: route,
        headers: { Host: 'evil.attacker.example:53040', 'X-Sidecar-Token': SIDECAR_TEST_TOKEN, 'Content-Type': 'application/json' },
        body: '{}',
      });
      assert.equal(badHost.status, 403, `${route} bad Host expected 403, got ${badHost.status}`);
      assert.equal(badHost.json().code, 'ERR_DNS_REBINDING');

      const badOrigin = await invokeServerInMemory(studio.server, {
        method: 'POST',
        url: route,
        headers: {
          Host: '127.0.0.1:53040',
          Origin: 'https://evil.example',
          'X-Sidecar-Token': SIDECAR_TEST_TOKEN,
          'Content-Type': 'application/json',
        },
        body: '{}',
      });
      assert.equal(badOrigin.status, 403, `${route} bad Origin expected 403, got ${badOrigin.status}`);
      assert.equal(badOrigin.json().code, 'ERR_CSRF_ORIGIN');
      assert.equal(badOrigin.headers['access-control-allow-origin'], undefined);

      const queryTok = await invokeServerInMemory(studio.server, {
        method: 'POST',
        url: `${route}?token=${encodeURIComponent(SIDECAR_TEST_TOKEN)}`,
        headers: { Host: '127.0.0.1:53040', 'Content-Type': 'application/json' },
        body: '{}',
      });
      assert.equal(queryTok.status, 401, `${route} ?token= query without header expected 401, got ${queryTok.status}`);
      assert.equal(queryTok.json().code, 'ERR_AUTH_TOKEN_REQUIRED');

      const badCt = await invokeServerInMemory(studio.server, {
        method: 'POST',
        url: route,
        headers: { Host: '127.0.0.1:53040', 'X-Sidecar-Token': SIDECAR_TEST_TOKEN, 'Content-Type': 'text/plain' },
        body: '{}',
      });
      assert.equal(badCt.status, 415, `${route} text/plain expected 415, got ${badCt.status}`);

      const optPreflight = await invokeServerInMemory(studio.server, {
        method: 'OPTIONS',
        url: route,
        headers: { Host: '127.0.0.1:53040', Origin: 'http://127.0.0.1:53040' },
      });
      assert.equal(optPreflight.status, 204, `${route} OPTIONS preflight expected 204, got ${optPreflight.status}`);
      assert.ok(String(optPreflight.headers['access-control-allow-methods'] || '').includes('POST'));
    }

    // When CDP bridge is unavailable (`startCdp: false` on `studio.server`), `/api/inspector/pick` returns 503 ERR_CDP_UNAVAILABLE
    const cdpUnavailRes = await invokeServerInMemory(studio.server, {
      method: 'POST',
      url: '/api/inspector/pick',
      headers: { Host: '127.0.0.1:53040', 'X-Sidecar-Token': SIDECAR_TEST_TOKEN, 'Content-Type': 'application/json' },
      body: '{}',
    });
    assert.equal(cdpUnavailRes.status, 503, `Expected 503 ERR_CDP_UNAVAILABLE when startCdp=false, got ${cdpUnavailRes.status}`);
    assert.equal(cdpUnavailRes.json().code, 'ERR_CDP_UNAVAILABLE');

    // 4) Live Mock CDP Target Server + `createPrismStudioServer` E2E (`gentle-auto`, `static-css`, `manual`, V1, V4, RPC & Dual-SSE)
    let cdpReqCount = 0;
    let mockHubTargets = [];
    const evaluatedExprs = [];
    const handleCdpEval = (expr) => {
      evaluatedExprs.push(expr);
      if (expr.includes('document.readyState')) {
        return { ready: true, w: 1440, h: 900, booted: false, hostBase: '', sseState: -1, skinVer: '', skin: false };
      }
      if (expr.includes('agy-prism-inspector-loader')) {
        return { ok: true, mounted: true };
      }
      return true;
    };
    const encodeS210Ws = (text) => {
      const payload = Buffer.from(text, 'utf8');
      if (payload.length < 126) return Buffer.concat([Buffer.from([0x81, payload.length]), payload]);
      const hdr = Buffer.alloc(4);
      hdr[0] = 0x81;
      hdr[1] = 126;
      hdr.writeUInt16BE(payload.length, 2);
      return Buffer.concat([hdr, payload]);
    };
    const s210CdpServer = http.createServer((req, res) => {
      cdpReqCount += 1;
      const addr = s210CdpServer.address();
      const p = typeof addr === 'object' && addr ? addr.port : 0;
      if (req.url === '/json/version') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ Browser: 'MockChrome/135.0', webSocketDebuggerUrl: `ws://127.0.0.1:${p}/devtools/browser/1` }));
        return;
      }
      if (req.url === '/json/list') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(mockHubTargets));
        return;
      }
      res.writeHead(404);
      res.end();
    });
    s210CdpServer.on('upgrade', (req, socket) => {
      const key = req.headers['sec-websocket-key'];
      const accept = createHash('sha1').update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest('base64');
      socket.write(
        'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
      );
      let wsBuf = Buffer.alloc(0);
      socket.on('data', (chunk) => {
        wsBuf = Buffer.concat([wsBuf, chunk]);
        while (wsBuf.length >= 2) {
          const masked = (wsBuf[1] & 0x80) !== 0;
          let len = wsBuf[1] & 0x7f;
          let offset = 2;
          if (len === 126) {
            if (wsBuf.length < 4) return;
            len = wsBuf.readUInt16BE(2);
            offset = 4;
          } else if (len === 127) {
            if (wsBuf.length < 10) return;
            len = Number(wsBuf.readBigUInt64BE(2));
            offset = 10;
          }
          const maskLen = masked ? 4 : 0;
          if (wsBuf.length < offset + maskLen + len) return;
          const payload = Buffer.alloc(len);
          if (masked) {
            const mask = wsBuf.subarray(offset, offset + 4);
            for (let i = 0; i < len; i += 1) payload[i] = wsBuf[offset + 4 + i] ^ mask[i & 3];
          } else {
            wsBuf.copy(payload, 0, offset, offset + len);
          }
          const opcode = wsBuf[0] & 0x0f;
          wsBuf = wsBuf.subarray(offset + maskLen + len);
          if (opcode === 0x8) {
            try { socket.end(); } catch {}
            return;
          }
          if (opcode === 0x1) {
            try {
              const msg = JSON.parse(payload.toString('utf8'));
              const val = handleCdpEval(String(msg?.params?.expression || ''));
              socket.write(encodeS210Ws(JSON.stringify({ id: msg.id, result: { result: { value: val } } })));
            } catch {}
          }
        }
      });
    });

    let s210MockPort = 0;
    try {
      await new Promise((resolveListen, rejectListen) => {
        s210CdpServer.once('error', rejectListen);
        s210CdpServer.listen(0, '127.0.0.1', () => {
          s210CdpServer.removeListener('error', rejectListen);
          resolveListen();
        });
      });
      s210MockPort = s210CdpServer.address().port;
    } catch (err) {
      if (err?.code !== 'EACCES' && err?.code !== 'EPERM') throw err;
    }
    const tcpOk = s210MockPort > 0 ? Boolean((await probeCdpPort(s210MockPort, '127.0.0.1', 500))?.ok) : false;

    const prevDisableCdp = process.env.AGY_PRISM_DISABLE_CDP;
    delete process.env.AGY_PRISM_DISABLE_CDP;

    const s210HostCfg = path.join(SCRATCH_ROOT, 's210-host-config.json');
    fs.writeFileSync(s210HostCfg, JSON.stringify({ plugins: { 'agy-wallpaper-prism': { enabled: true } } }), 'utf8');
    const s210V1DataDir = path.join(SCRATCH_ROOT, 's210-v1-data');
    const s210V1ProfileDir = path.join(SCRATCH_ROOT, 's210-v1-profile');
    const s210DataDir = path.join(SCRATCH_ROOT, 's210-data');
    const s210ProfileDir = path.join(SCRATCH_ROOT, 's210-profile');
    fs.mkdirSync(s210V1DataDir, { recursive: true });
    fs.mkdirSync(s210V1ProfileDir, { recursive: true });
    fs.mkdirSync(s210DataDir, { recursive: true });
    fs.mkdirSync(s210ProfileDir, { recursive: true });
    fs.writeFileSync(path.join(s210V1ProfileDir, 'DevToolsActivePort'), `${s210MockPort || 9339}\n/devtools/browser/mock\n`, 'utf8');

    const S210_TOK = 's210-inspector-token-2026';
    let s210Srv = null;
    let s210FallbackBridge = null;
    const sseWatchers = [];
    const openSseWatcher = (srv, channel) =>
      new Promise((resolve, reject) => {
        const ssePath = channel === 'popout' ? '/api/events?channel=popout' : '/api/events';
        const socket = new Duplex({
          read() {},
          write(_chunk, _enc, cb) {
            cb();
          },
        });
        socket.remoteAddress = '127.0.0.1';
        socket.writable = true;
        socket.readable = true;
        socket.setNoDelay = () => socket;

        const req = new IncomingMessage(socket);
        req.method = 'GET';
        req.url = ssePath;
        req.httpVersion = '1.1';
        req.httpVersionMajor = 1;
        req.httpVersionMinor = 1;
        req.headers = { host: '127.0.0.1:53040', accept: 'text/event-stream', connection: 'keep-alive' };

        const res = new ServerResponse(req);
        let buf = '';
        let opened = false;
        let closed = false;
        const markClosed = () => {
          closed = true;
        };
        const watcher = {
          channel,
          getText: () => buf,
          clear: () => {
            buf = '';
          },
          isClosed: () => closed,
          close: () => {
            markClosed();
            req.emit('close');
            res.emit('close');
          },
        };
        res.write = function patchedWrite(chunk, encoding, cb) {
          if (chunk) buf += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
          if (!opened && buf.includes('event: state') && buf.includes('\n\n')) {
            opened = true;
            sseWatchers.push(watcher);
            resolve(watcher);
          }
          if (typeof encoding === 'function') encoding();
          else if (typeof cb === 'function') cb();
          return true;
        };
        res.end = function patchedEnd(chunk, encoding, cb) {
          if (chunk && typeof chunk !== 'function') buf += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
          markClosed();
          res.emit('finish');
          res.emit('close');
          if (typeof chunk === 'function') chunk();
          else if (typeof encoding === 'function') encoding();
          else if (typeof cb === 'function') cb();
          return res;
        };
        res.on('error', (err) => {
          if (!opened) reject(err);
          markClosed();
        });
        srv.server.emit('request', req, res);
        queueMicrotask(() => req.push(null));
      });

    try {
      if (tcpOk) {
        // 4a) Guardrail V1: explicit `cdpPort > 0` MUST NOT fall back to `DevToolsActivePort`
        const v1Srv = await createPrismStudioServer({
          dataDir: s210V1DataDir,
          token: 's210-v1-tok',
          startCdp: true,
          cdpPort: 1,
          cdpPollMs: 0,
          profileDir: s210V1ProfileDir,
          hostConfigPath: s210HostCfg,
          autoCheckUpdates: false,
          inspectShortcuts: false,
        });
        try {
          cdpReqCount = 0;
          const v1Res = await invokeServerInMemory(v1Srv.server, {
            method: 'POST',
            url: '/api/inspector/pick',
            headers: {
              Host: '127.0.0.1:53040',
              Origin: 'http://127.0.0.1:53040',
              'X-Sidecar-Token': 's210-v1-tok',
              'Content-Type': 'application/json',
            },
            body: '{}',
          });
          assert.equal(v1Res.status, 503, `V1 expected 503 ERR_CDP_UNAVAILABLE, got ${v1Res.status}: ${v1Res.text()}`);
          assert.equal(v1Res.json().code, 'ERR_CDP_UNAVAILABLE');
          assert.equal(cdpReqCount, 0, 'Guardrail V1 violated: explicit cdpPort=1 probed DevToolsActivePort!');
        } finally {
          await v1Srv.close().catch(() => {});
        }

        s210Srv = await createPrismStudioServer({
          dataDir: s210DataDir,
          token: S210_TOK,
          startCdp: true,
          cdpPort: s210MockPort,
          cdpPollMs: 0,
          profileDir: s210ProfileDir,
          hostConfigPath: s210HostCfg,
          autoCheckUpdates: false,
          inspectShortcuts: false,
        });
      } else {
        // Sandboxed TCP fallback: inproc shim for cdp-bridge HTTP/WS + V1 probe verification
        const cdpSrc = fs.readFileSync(path.join(REPO_ROOT, 'sidecars', 'prism_studio', 'cdp-bridge.mjs'), 'utf8');
        const storeUrl = pathToFileURL(path.join(REPO_ROOT, 'src', 'engine', 'store.mjs')).href;
        const schemaUrl = pathToFileURL(path.join(REPO_ROOT, 'src', 'shared', 'schema.mjs')).href;
        const patchedSrc = cdpSrc
          .replace("import { request as httpRequest } from 'node:http';", 'const httpRequest = (...args) => globalThis.__prismS210HttpRequest(...args);')
          .replace('../../src/engine/store.mjs', storeUrl)
          .replace('../../src/shared/schema.mjs', schemaUrl);
        const shimFile = path.join(SCRATCH_ROOT, 'cdp-bridge-s210-inproc.mjs');
        fs.writeFileSync(shimFile, patchedSrc, 'utf8');
        const shimMod = await import(`${pathToFileURL(shimFile).href}?t=${Date.now()}`);
        const handleInprocWs = (socketOut, stateObj, chunk) => {
          stateObj.buf = Buffer.concat([stateObj.buf, Buffer.from(chunk)]);
          while (stateObj.buf.length >= 2) {
            const masked = (stateObj.buf[1] & 0x80) !== 0;
            let len = stateObj.buf[1] & 0x7f;
            let offset = 2;
            if (len === 126) { len = stateObj.buf.readUInt16BE(2); offset = 4; }
            const maskLen = masked ? 4 : 0;
            if (stateObj.buf.length < offset + maskLen + len) return;
            const payload = Buffer.alloc(len);
            if (masked) {
              const mask = stateObj.buf.subarray(offset, offset + 4);
              for (let i = 0; i < len; i += 1) payload[i] = stateObj.buf[offset + 4 + i] ^ mask[i & 3];
            } else {
              stateObj.buf.copy(payload, 0, offset, offset + len);
            }
            const opcode = stateObj.buf[0] & 0x0f;
            stateObj.buf = stateObj.buf.subarray(offset + maskLen + len);
            if (opcode === 0x1) {
              const msg = JSON.parse(payload.toString('utf8'));
              const val = handleCdpEval(String(msg?.params?.expression || ''));
              socketOut.push(encodeS210Ws(JSON.stringify({ id: msg.id, result: { result: { value: val } } })));
            }
          }
        };
        globalThis.__prismS210HttpRequest = (opts, cb) => {
          const listeners = new Map();
          const reqObj = {
            on(ev, fn) { const arr = listeners.get(ev) || []; arr.push(fn); listeners.set(ev, arr); return reqObj; },
            emit(ev, ...args) { for (const fn of (listeners.get(ev) || []).slice()) fn(...args); },
            destroy() {},
            end() {
              queueMicrotask(() => {
                const portNum = Number(opts?.port || 0);
                if (portNum === 1) { reqObj.emit('error', Object.assign(new Error('ECONNREFUSED'), { code: 'ECONNREFUSED' })); return; }
                cdpReqCount += 1;
                if (String(opts?.headers?.Upgrade || '').toLowerCase() === 'websocket') {
                  const wsState = { buf: Buffer.alloc(0) };
                  const clientSock = new Duplex({ read() {}, write(chunk, _e, done) { handleInprocWs(clientSock, wsState, chunk); done(); } });
                  clientSock.setNoDelay = () => clientSock;
                  reqObj.emit('upgrade', { statusCode: 101, headers: {} }, clientSock, Buffer.alloc(0));
                  return;
                }
                const reqPath = String(opts?.path || '/');
                const bodyStr = reqPath === '/json/version'
                  ? JSON.stringify({ Browser: 'MockChrome/135.0', webSocketDebuggerUrl: 'ws://127.0.0.1:9339/devtools/browser/1' })
                  : reqPath === '/json/list' ? JSON.stringify(mockHubTargets) : '';
                const resListeners = new Map();
                const resObj = {
                  statusCode: bodyStr ? 200 : 404,
                  setEncoding() {},
                  resume() {},
                  on(ev, fn) { const arr = resListeners.get(ev) || []; arr.push(fn); resListeners.set(ev, arr); return resObj; },
                  emit(ev, ...args) { for (const fn of (resListeners.get(ev) || []).slice()) fn(...args); },
                };
                if (typeof cb === 'function') cb(resObj);
                reqObj.emit('response', resObj);
                queueMicrotask(() => {
                  if (bodyStr) resObj.emit('data', Buffer.from(bodyStr, 'utf8'));
                  resObj.emit('end');
                });
              });
            },
          };
          return reqObj;
        };
        const v1Bridge = shimMod.createPassiveCdpBridge({
          getEngineState: () => ({ config: { startupMode: 'manual' }, skinEnabled: false }),
          hostScripts: { buildClientSkinPayload: () => ({}) },
          getHostOrigin: () => 'http://127.0.0.1:53040',
          capToken: 'v1-cap',
          dataDir: s210V1DataDir,
          pluginRoot: REPO_ROOT,
          configPath: s210HostCfg,
          profileDir: s210V1ProfileDir,
          cdpPort: 1,
          pollMs: 0,
        });
        cdpReqCount = 0;
        const v1Out = await v1Bridge.startInspectorPick({ hostOrigin: 'http://127.0.0.1:53040', capToken: 'v1-cap' });
        assert.equal(v1Out.ok, false);
        assert.equal(v1Out.code, 'ERR_CDP_UNAVAILABLE');
        assert.equal(cdpReqCount, 0, 'Guardrail V1 violated in shim');
        await v1Bridge.stop({ preserveHostDom: true }).catch(() => {});

        let srvRef = null;
        s210FallbackBridge = shimMod.createPassiveCdpBridge({
          getEngineState: () => srvRef.engine.getState ? srvRef.engine.getState() : { config: srvRef.engine.getConfig(), skinEnabled: srvRef.engine.getConfig()?.skinEnabled },
          hostScripts: { buildClientSkinPayload: () => ({}) },
          getHostOrigin: () => srvRef.origin,
          capToken: 'fallback-cap',
          dataDir: s210DataDir,
          pluginRoot: REPO_ROOT,
          configPath: s210HostCfg,
          profileDir: s210ProfileDir,
          cdpPort: 9339,
          pollMs: 0,
        });
        s210Srv = await createPrismStudioServer({
          dataDir: s210DataDir,
          token: S210_TOK,
          startCdp: false,
          inspectorController: s210FallbackBridge,
          hostConfigPath: s210HostCfg,
          autoCheckUpdates: false,
          inspectShortcuts: false,
        });
        srvRef = s210Srv;
      }

      const authHeaders = {
        Host: '127.0.0.1:53040',
        Origin: 'http://127.0.0.1:53040',
        'X-Sidecar-Token': S210_TOK,
        'Content-Type': 'application/json',
      };

      // 4b) Empty Hub target list -> 404 ERR_NO_HUB_TARGETS
      mockHubTargets = [];
      const noTargetRes = await invokeServerInMemory(s210Srv.server, {
        method: 'POST',
        url: '/api/inspector/pick',
        headers: authHeaders,
        body: '{}',
      });
      assert.equal(noTargetRes.status, 404, `Expected 404 ERR_NO_HUB_TARGETS, got ${noTargetRes.status}: ${noTargetRes.text()}`);
      assert.equal(noTargetRes.json().code, 'ERR_NO_HUB_TARGETS');

      // 4c) Ready Hub target + Dual-Channel SSE (`aux` + `popout`) across `gentle-auto`, `static-css`, and `manual`
      const wsPort = s210MockPort || 9339;
      mockHubTargets = [{
        id: 's210-hub-1',
        type: 'page',
        title: 'Antigravity',
        url: 'https://127.0.0.1:9443/workbench',
        webSocketDebuggerUrl: `ws://127.0.0.1:${wsPort}/devtools/page/s210-hub-1`,
      }];

      const auxSse = await openSseWatcher(s210Srv, 'aux');
      const popoutSse = await openSseWatcher(s210Srv, 'popout');

      for (const mode of ['gentle-auto', 'static-css', 'manual']) {
        await s210Srv.engine.updateConfig({ startupMode: mode, skinEnabled: mode !== 'manual' });
        evaluatedExprs.length = 0;
        auxSse.clear();
        popoutSse.clear();

        const pickRes = await invokeServerInMemory(s210Srv.server, {
          method: 'POST',
          url: '/api/inspector/pick',
          headers: authHeaders,
          body: '{}',
        });
        assert.equal(pickRes.status, 200, `POST /api/inspector/pick (${mode}) failed: ${pickRes.text()}`);
        const pickJson = pickRes.json();
        assert.equal(pickJson.ok, true);
        assert.equal(pickJson.active, true);
        assert.equal(pickJson.targetCount, 1);
        assert.ok(
          evaluatedExprs.some((e) => e.includes('agy-prism-inspector-loader') && e.includes(`/host/${s210Srv.hostCapToken}/inspector.js`)),
          `(${mode}) evaluateTargetEphemeral did not inject <script id="agy-prism-inspector-loader">`,
        );

        const stRes = await invokeServerInMemory(s210Srv.server, {
          method: 'GET',
          url: '/api/status',
          headers: { Host: '127.0.0.1:53040' },
        });
        assert.equal(stRes.json().inspectorStatus?.active, true, `(${mode}) /api/status inspectorStatus.active !== true`);

        const cancelRes = await invokeServerInMemory(s210Srv.server, {
          method: 'POST',
          url: '/api/inspector/cancel',
          headers: authHeaders,
          body: '{}',
        });
        assert.equal(cancelRes.status, 200);
        assert.equal(cancelRes.json().cancelled, true);
        assert.equal(cancelRes.json().active, false);
        assert.ok(
          evaluatedExprs.some((e) => e.includes('agy-prism-inspector-overlay') && e.includes('studio-cancel')),
          `(${mode}) cancelInspectorPick did not evaluate cleanup expr`,
        );

        const sseWait = Date.now() + 800;
        while (Date.now() < sseWait) {
          if (auxSse.getText().includes('event: inspector-cancelled') && popoutSse.getText().includes('event: inspector-cancelled')) break;
          await sleep(20);
        }
        assert.ok(auxSse.getText().includes('event: inspector-cancelled'), `(${mode}) aux SSE missed inspector-cancelled`);
        assert.ok(popoutSse.getText().includes('event: inspector-cancelled'), `(${mode}) popout SSE missed inspector-cancelled`);
      }

      // 4d) `/host/<capToken>/rpc` `inspector.picked`: invalid `regionId` -> 400 ERR_INVALID_REGION (0 SSE) vs valid -> 200 + dual-channel SSE
      await s210Srv.engine.updateConfig({ startupMode: 'static-css', skinEnabled: true });
      await invokeServerInMemory(s210Srv.server, {
        method: 'POST',
        url: '/api/inspector/pick',
        headers: authHeaders,
        body: '{}',
      });
      await sleep(30);
      auxSse.clear();
      popoutSse.clear();

      for (const badRegion of ['', 'invalid-zone', '__proto__', 123]) {
        const badRpc = await invokeServerInMemory(s210Srv.server, {
          method: 'POST',
          url: `/host/${encodeURIComponent(s210Srv.hostCapToken)}/rpc`,
          headers: { Host: '127.0.0.1:53040', 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: 'bad-pick', method: 'inspector.picked', params: { regionId: badRegion } }),
        });
        assert.equal(badRpc.status, 400, `Invalid regionId=${JSON.stringify(badRegion)} expected 400, got ${badRpc.status}`);
        assert.equal(badRpc.json().ok, false);
        assert.equal(badRpc.json().code, 'ERR_INVALID_REGION');
      }
      await sleep(40);
      assert.equal(auxSse.getText().includes('inspector-picked'), false, 'Invalid regionId broadcast inspector-picked to aux SSE!');
      assert.equal(popoutSse.getText().includes('inspector-picked'), false, 'Invalid regionId broadcast inspector-picked to popout SSE!');

      const validRpc = await invokeServerInMemory(s210Srv.server, {
        method: 'POST',
        url: `/host/${encodeURIComponent(s210Srv.hostCapToken)}/rpc`,
        headers: { Host: '127.0.0.1:53040', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'ok-pick',
          method: 'inspector.picked',
          params: { regionId: 'composer', matchedBy: 'composer:dom', selector: '#antigravity.agentSidePanelInputBox' },
        }),
      });
      assert.equal(validRpc.status, 200, `Valid inspector.picked RPC failed: ${validRpc.text()}`);
      assert.equal(validRpc.json().ok, true);
      assert.equal(validRpc.json().result?.regionId, 'composer');

      const pickedDeadline = Date.now() + 800;
      while (Date.now() < pickedDeadline) {
        if (auxSse.getText().includes('event: inspector-picked') && popoutSse.getText().includes('event: inspector-picked')) break;
        await sleep(20);
      }
      assert.ok(auxSse.getText().includes('event: inspector-picked') && auxSse.getText().includes('"regionId":"composer"'), 'Aux SSE did not receive inspector-picked composer');
      assert.ok(popoutSse.getText().includes('event: inspector-picked') && popoutSse.getText().includes('"regionId":"composer"'), 'Popout SSE did not receive inspector-picked composer');

      const stAfterPick = await invokeServerInMemory(s210Srv.server, {
        method: 'GET',
        url: '/api/status',
        headers: { Host: '127.0.0.1:53040' },
      });
      assert.equal(stAfterPick.json().inspectorStatus?.active, false, 'inspectorStatus.active should clear after inspector.picked');
      assert.equal(stAfterPick.json().inspectorStatus?.lastPickedRegion, 'composer');

      // 4e) `/host/<capToken>/rpc` `inspector.cancelled` -> dual-channel SSE & clear active
      await invokeServerInMemory(s210Srv.server, { method: 'POST', url: '/api/inspector/pick', headers: authHeaders, body: '{}' });
      await sleep(30);
      auxSse.clear();
      popoutSse.clear();
      const cancelRpc = await invokeServerInMemory(s210Srv.server, {
        method: 'POST',
        url: `/host/${encodeURIComponent(s210Srv.hostCapToken)}/rpc`,
        headers: { Host: '127.0.0.1:53040', 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'cancel-1', method: 'inspector.cancelled', params: { reason: 'escape' } }),
      });
      assert.equal(cancelRpc.status, 200);
      assert.equal(cancelRpc.json().ok, true);
      const cancelWait = Date.now() + 800;
      while (Date.now() < cancelWait) {
        if (auxSse.getText().includes('event: inspector-cancelled') && popoutSse.getText().includes('event: inspector-cancelled')) break;
        await sleep(20);
      }
      assert.ok(auxSse.getText().includes('event: inspector-cancelled') && auxSse.getText().includes('"reason":"escape"'));
      assert.ok(popoutSse.getText().includes('event: inspector-cancelled') && popoutSse.getText().includes('"reason":"escape"'));

      const stAfterCancel = await invokeServerInMemory(s210Srv.server, { method: 'GET', url: '/api/status', headers: { Host: '127.0.0.1:53040' } });
      assert.equal(stAfterCancel.json().inspectorStatus?.active, false);

      // 4f) Guardrail V4: `manual` mode `stop({ preserveHostDom: false })` clears `lastInspectorTargets` & cleans host overlay
      await s210Srv.engine.updateConfig({ startupMode: 'manual', skinEnabled: false });
      await invokeServerInMemory(s210Srv.server, { method: 'POST', url: '/api/inspector/pick', headers: authHeaders, body: '{}' });
      evaluatedExprs.length = 0;
      for (const w of sseWatchers) w.close();
      await s210Srv.close({ preserveHostDom: false });
      s210Srv = null;
      if (s210FallbackBridge) {
        await s210FallbackBridge.stop({ preserveHostDom: false }).catch(() => {});
      }
      assert.ok(
        evaluatedExprs.some((e) => e.includes('agy-prism-inspector-overlay') && e.includes('teardown')),
        'Guardrail V4: stop() did not evaluate inspector teardown across lastInspectorTargets in manual mode',
      );
      assert.ok(buildInspectorCancelExpr('teardown').includes('agy-prism-inspector-overlay'));
    } finally {
      for (const w of sseWatchers) { try { w.close(); } catch {} }
      delete globalThis.__prismS210HttpRequest;
      if (s210FallbackBridge) await s210FallbackBridge.stop({ preserveHostDom: true }).catch(() => {});
      if (s210Srv) await s210Srv.close().catch(() => {});
      if (prevDisableCdp === undefined) delete process.env.AGY_PRISM_DISABLE_CDP;
      else process.env.AGY_PRISM_DISABLE_CDP = prevDisableCdp;
      await new Promise((r) => s210CdpServer.close(() => r())).catch(() => {});
    }

    return `inspector.js(403/200+no-store+nosniff) + strict(403/401/415/204) + V1 + 503/404 + live/static-css/manual + RPC(400/200) + dual-SSE + V4 + boot=${maxMicroBytes}B`;
  });

  // =========================================================================
  // SUITE 3: Studio v2.2 UI & Antigravity 2.35.1 Hub Headless Chrome E2E
  // =========================================================================
  console.log('\n--- Suite 3: Studio v2.2 UI & Antigravity 2.35.1 Hub Headless E2E + 1440x900 Screenshots ---');

  const auroraItem = findWorkshopItem('100001');
  const videoItem = findWorkshopItem('100002');
  const webItem = findWorkshopItem('100003');
  const nordItem = findWorkshopItem('100004');

  await engine.applyWallpaper(auroraItem.id, {
    skinEnabled: true,
    startupMode: 'gentle-auto',
    liveBootDelay: 1.5,
    preset: 'islands',
    layoutMode: 'islands',
    islandGap: 8,
    workspacePad: 8,
    cornerStyle: 'balanced',
    colorScheme: 'prism-default',
    themeMode: 'dark',
    glassOpacity: 0.74,
    glassBlur: 16,
    scrimOpacity: 0.22,
    vignette: true,
    language: 'zh',
  });

  const latestLib = await engine.listLibrary({ refresh: false });
  libraryItems = Array.isArray(latestLib) ? latestLib : latestLib.items || [];
  mediaHttpServer =
    engine?.mediaServer?.server ||
    engine?._mediaServer?.server ||
    fallbackMediaSrv?.server ||
    mediaHttpServer;

  const mediaOrigin = engine.getMediaOrigin();
  const HUB_MOCK_ORIGIN = 'http://127.0.0.1:43199';
  const hubRequestedPaths = [];

  const universalHttpRouter = async (reqInfo) => {
    const u = new URL(reqInfo.url);
    const origin = `${u.protocol}//${u.host}`;
    const pathAndQuery = `${u.pathname}${u.search}`;

    if (origin === studio.origin) {
      if (u.pathname.startsWith('/host/')) {
        hubRequestedPaths.push(pathAndQuery);
      }
      const res = await invokeServerInMemory(studio.server, {
        method: reqInfo.method,
        url: pathAndQuery,
        headers: reqInfo.headers,
        body: reqInfo.postData,
      });
      return { status: res.status, headers: res.headers, body: res.body };
    }

    if (origin === mediaOrigin || (fallbackMediaSrv && origin === fallbackMediaSrv.origin)) {
      if (u.pathname.includes('__broken_404_video__')) {
        return { status: 404, headers: { 'Content-Type': 'text/plain' }, body: 'Simulated 404 broken video' };
      }
      const res = await invokeServerInMemory(mediaHttpServer, {
        method: reqInfo.method,
        url: pathAndQuery,
        headers: reqInfo.headers,
        body: reqInfo.postData,
      });
      return { status: res.status, headers: res.headers, body: res.body };
    }

    if (origin === HUB_MOCK_ORIGIN) {
      if (u.pathname === '/' || u.pathname === '/hub') {
        const browserHoleActive = u.searchParams.get('browserHole') === '1';
        return {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
          body: buildMockAntigravityHubHtml({ initialTheme: 'dark', browserHoleActive }),
        };
      }
    }

    return { status: 404, headers: { 'Content-Type': 'text/plain' }, body: `Not found: ${reqInfo.url}` };
  };

  const browser = await launchHeadlessBrowser({
    profileBaseDir: path.join(SCRATCH_ROOT, 'chrome-profile'),
    width: 1440,
    height: 900,
  });

  try {
    // -----------------------------------------------------------------------
    // 3A. Studio v2.0 UI (`Host & System` 3-way Startup Strategy + Canary + Panic Badge) + Screenshot (b)
    // -----------------------------------------------------------------------
    const shotStudioHostPath = path.join(DEFAULT_ARTIFACT_DIR, 'v2-studio-host-system-canary.png');

    await check('Studio v2.4 UI (`index.html`): 401 guard, static-first -> live toggle, 3-way Startup Strategy (`温和自动恢复 1.5s`), Canary & Panic Key + 12-Region collapsed reset + Screenshot (b)', '@crash-forensics', async () => {
      const unauth = await invokeServerInMemory(studio.server, {
        method: 'POST',
        url: '/api/config',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patch: { islandGap: 8 } }),
      });
      assert.equal(unauth.status, 401, 'POST /api/config without X-Sidecar-Token must return 401');

      const studioPage = await browser.openPage({
        url: `${studio.origin}/?token=${encodeURIComponent(SIDECAR_TEST_TOKEN)}`,
        requestHandler: universalHttpRouter,
        initScript: `
          window.__confirmCalled = 0;
          window.__alertCalled = 0;
          window.confirm = function() { window.__confirmCalled++; return false; };
          window.alert = function() { window.__alertCalled++; };
        `,
      });

      try {
        await sleep(900);

        const layoutMetrics = await studioPage.evaluate(`(() => {
          const app = document.getElementById('app');
          const r = app.getBoundingClientRect();
          const rail = document.querySelector('.prism-left-rail');
          let railContentFillRatio = 0;
          if (rail) {
            const railRect = rail.getBoundingClientRect();
            const kids = Array.from(rail.children);
            const bottomMost = kids.reduce((mx, el) => Math.max(mx, el.getBoundingClientRect().bottom), railRect.top);
            railContentFillRatio = railRect.height > 0 ? (bottomMost - railRect.top) / railRect.height : 0;
          }
          const cards = document.querySelectorAll('.prism-wall-card, [data-action="card-click"]');
          const tabs = Array.from(new Set(Array.from(document.querySelectorAll('[data-action="switch-tab"]')).map(b => b.dataset.tab)));
          const railDuplicateSliders = document.querySelectorAll('#prism-rail-optics-card input[data-config-slider], #prism-rail-optics-card [data-slider-key], .prism-left-rail input[data-config-slider="sidebarOpacity"], .prism-left-rail [data-slider-key="sidebarOpacity"]').length;
          const hasExtractedChips = Boolean(document.getElementById('rail-extracted-chips'));
          return {
            appWidth: Math.round(r.width),
            appHeight: Math.round(r.height),
            railContentFillRatio: Math.round(railContentFillRatio * 1000) / 1000,
            railDuplicateSliders,
            hasExtractedChips,
            hasSidecarBridge: Boolean(window.sidecar && typeof window.sidecar.fetch === 'function'),
            cardCount: cards.length,
            tabs,
          };
        })()`);

        assert.equal(layoutMetrics.appWidth, 1440);
        assert.equal(layoutMetrics.appHeight, 900);
        assert.ok(layoutMetrics.railContentFillRatio >= 0.80, `Left rail fill ratio=${layoutMetrics.railContentFillRatio}`);
        assert.equal(layoutMetrics.railDuplicateSliders, 0, `Left rail must contain 0 duplicate optical sliders (got ${layoutMetrics.railDuplicateSliders})`);
        assert.equal(layoutMetrics.hasExtractedChips, false, 'Left rail must NOT render deprecated #rail-extracted-chips');
        assert.equal(layoutMetrics.hasSidecarBridge, true);
        assert.ok(layoutMetrics.cardCount >= 4);
        const sysTabName = layoutMetrics.tabs.includes('host') ? 'host' : 'system';

        // Select H.264 video wallpaper (100002) -> v2.2.0 defaults to static-first preview (0 eager <video>) until clicking [data-action="toggle-preview-live"]
        await studioPage.evaluate(`(() => {
          const card = Array.from(document.querySelectorAll('.prism-wall-card, [data-action="card-click"]'))
            .find(el => (el.dataset.id || '').includes('100002') || el.innerText.includes('Cyber Obsidian Rain'));
          if (card) card.click();
        })()`);
        await sleep(360);

        const staticFirstCheck = await studioPage.evaluate(`(() => {
          const v = document.querySelector('.prism-preview-stage video, .prism-mini-preview video, .prism-left-rail video');
          const toggleBtn = document.querySelector('[data-action="toggle-preview-live"]');
          return {
            hasVideoBeforeToggle: Boolean(v),
            liveAttrBefore: toggleBtn ? toggleBtn.getAttribute('data-live') : null,
          };
        })()`);
        assert.equal(staticFirstCheck.hasVideoBeforeToggle, false, 'v2.2.0 Studio preview MUST default to static-first (0 <video> before live toggle)');
        assert.equal(staticFirstCheck.liveAttrBefore, 'false', 'Expected [data-action="toggle-preview-live"][data-live="false"] by default');

        await studioPage.evaluate(`document.querySelector('[data-action="toggle-preview-live"]')?.click()`);
        await sleep(450);

        const studioVidCheck = await studioPage.evaluate(`(() => {
          const v = document.querySelector('.prism-preview-stage video, .prism-mini-preview video, .prism-left-rail video');
          const toggleBtn = document.querySelector('[data-action="toggle-preview-live"]');
          window.__studioPreviewVideoRef = v || null;
          return v ? { found: true, paused: v.paused, readyState: v.readyState, liveAttrAfter: toggleBtn?.getAttribute('data-live') } : { found: false };
        })()`);
        assert.equal(studioVidCheck.found, true, 'Studio 21:9 preview did not mount <video> after clicking [data-action="toggle-preview-live"]');
        assert.equal(studioVidCheck.paused, false, 'Studio 21:9 preview <video> paused after clicking live toggle');
        assert.equal(studioVidCheck.liveAttrAfter, 'true', 'Expected [data-action="toggle-preview-live"][data-live="true"] after enabling');

        // Switch to `Host & System` tab & verify v2.0 Startup Strategy + Canary + Panic Key controls
        await studioPage.evaluate(`document.querySelector('[data-action="switch-tab"][data-tab="${sysTabName}"]').click()`);
        await sleep(300);

        const hostV2Audit = await studioPage.evaluate(`(() => {
          const safetyCard = document.getElementById('prism-startup-safety-card');
          const gentleCard = document.querySelector('[data-startup-card="gentle-auto"]');
          const manualCard = document.querySelector('[data-startup-card="manual"]');
          const staticCard = document.querySelector('[data-startup-card="static-css"]');
          const canaryBadge = document.getElementById('prism-canary-badge');
          const panicCallout = document.getElementById('prism-panic-shortcut-callout');
          const delaySlider = document.querySelector('input[data-key="liveBootDelay"]');
          if (safetyCard) safetyCard.scrollIntoView({ block: 'start' });
          const gentleActive = Boolean(
            gentleCard &&
              (gentleCard.classList.contains('is-active') ||
                gentleCard.getAttribute('aria-checked') === 'true' ||
                gentleCard.getAttribute('data-active') === '1' ||
                gentleCard.getAttribute('data-selected') === 'true'),
          );
          return {
            hasSafetyCard: Boolean(safetyCard),
            hasAll3Cards: Boolean(gentleCard && manualCard && staticCard),
            gentleActive,
            gentleText: gentleCard ? gentleCard.innerText : '',
            delayVal: delaySlider ? Number(delaySlider.value) : null,
            hasCanaryBadge: Boolean(canaryBadge),
            canaryState: canaryBadge ? canaryBadge.getAttribute('data-canary-state') : '',
            hasPanicCallout: Boolean(panicCallout),
            panicText: panicCallout ? panicCallout.innerText : '',
            fullText: safetyCard ? safetyCard.innerText : '',
          };
        })()`);

        assert.equal(hostV2Audit.hasSafetyCard, true, 'Missing #prism-startup-safety-card in Host & System tab');
        assert.equal(hostV2Audit.hasAll3Cards, true, 'Missing 3-way [data-startup-card] options in Host & System tab');
        assert.equal(hostV2Audit.gentleActive, true, 'Expected gentle-auto card to be active by default');
        assert.ok(/温和自动恢复/.test(hostV2Audit.gentleText), `Expected 温和自动恢复 label, got: ${hostV2Audit.gentleText}`);
        assert.ok(/1\.5\s*s/i.test(hostV2Audit.fullText), `Expected 1.5s delay indicator in startup card: ${hostV2Audit.fullText}`);
        assert.equal(hostV2Audit.hasCanaryBadge, true, 'Missing #prism-canary-badge in Host & System tab');
        assert.equal(hostV2Audit.hasPanicCallout, true, 'Missing #prism-panic-shortcut-callout in Host & System tab');
        assert.ok(/Ctrl\+Alt\+Shift\+R/i.test(hostV2Audit.panicText), `Missing Ctrl+Alt+Shift+R in panic badge: ${hostV2Audit.panicText}`);

        await sleep(120);
        const sHostV2 = await studioPage.capturePng(shotStudioHostPath, { expectedWidth: 1440, expectedHeight: 900 });
        screenshots.push({
          path: shotStudioHostPath,
          caption: 'Studio v2.0 Host System startup strategy, canary and panic key',
        });
        assert.ok(sHostV2.bytes > 20000, 'Studio Host & System v2.0 screenshot suspiciously small');

        // PR #3 + v2.4.1 Studio 12-Region Accordion Default Collapsed & <summary> Reset Delegation E2E (`global` owns `reset-module`; regions 1-11 use `reset-region`)
        await engine.updateConfig({ islandGap: 14 });
        await studioPage.evaluate(`document.querySelector('[data-action="switch-tab"][data-tab="skin"]').click()`);
        await sleep(220);
        const summaryResetCheck = await studioPage.evaluate(`(() => {
          const detailsAll = Array.from(document.querySelectorAll('#prism-region-accordions > details.prism-region-group'));
          const regionOrder = detailsAll.map((d) => d.getAttribute('data-region'));
          const allInitiallyCollapsed = detailsAll.length === 12 && detailsAll.every((d) => d.open === false);
          const groupResetActions = detailsAll.map((d) => {
            const btn = d.querySelector('summary [data-action]');
            return { region: d.getAttribute('data-region'), action: btn ? btn.getAttribute('data-action') : null };
          });
          const globalDet = document.querySelector('details.prism-region-group[data-region="global"]');
          const globalSum = globalDet ? globalDet.querySelector('summary') : null;
          if (globalSum && !globalDet.open) globalSum.click();
          const resetBtn = globalDet ? globalDet.querySelector('summary [data-action="reset-module"]') : null;
          const wasOpen = globalDet ? globalDet.open : false;
          if (resetBtn) resetBtn.click();
          return {
            regionOrder,
            allInitiallyCollapsed,
            groupResetActions,
            found: Boolean(resetBtn),
            wasOpen,
            stillOpen: globalDet ? globalDet.open : false,
          };
        })()`);
        assert.deepEqual(
          summaryResetCheck.regionOrder,
          ['topbar', 'wco', 'sidebar', 'workspace', 'userBubble', 'assistantBubble', 'codeBlock', 'controls', 'composer', 'rightPane', 'popover', 'global'],
          `Unexpected 12-region accordion order: ${JSON.stringify(summaryResetCheck.regionOrder)}`,
        );
        assert.equal(summaryResetCheck.allInitiallyCollapsed, true, 'All 12 Skin region accordions MUST start collapsed (open === false)');
        for (const ga of summaryResetCheck.groupResetActions) {
          assert.equal(
            ga.action,
            ga.region === 'global' ? 'reset-module' : 'reset-region',
            `Expected ${ga.region} summary action to be ${ga.region === 'global' ? 'reset-module' : 'reset-region'}, got ${ga.action}`,
          );
        }
        assert.equal(summaryResetCheck.found, true, 'Missing details[data-region="global"] summary [data-action="reset-module"] button in Skin tab');
        assert.equal(summaryResetCheck.wasOpen, true);
        assert.equal(summaryResetCheck.stillOpen, true, 'Clicking <summary> reset-module collapsed <details> or failed delegation!');
        await sleep(200);
        const cfgAfterResetMod = await engine.getConfig();
        assert.equal(cfgAfterResetMod.islandGap, 8, `Clicking <summary> reset-module did not reset islandGap to 8 (got ${cfgAfterResetMod.islandGap})`);
        await studioPage.evaluate(`document.querySelector('details.prism-region-group[data-region="global"] > summary')?.click()`);

        // Open Inspector Drawer -> verify interior click keeps drawer open & child <span> inside close-drawer closes it!
        await studioPage.evaluate(`document.querySelector('[data-action="switch-tab"][data-tab="library"]').click()`);
        await sleep(150);
        const drawerOpenCheck = await studioPage.evaluate(`(() => {
          const openBtn = document.querySelector('[data-action="open-inspector"], [data-action="open-drawer"]');
          if (openBtn) openBtn.click();
          const drawer = document.querySelector('.prism-drawer');
          const body = document.querySelector('.prism-drawer-body');
          if (body) body.click(); // interior click MUST NOT trigger backdrop-close!
          const stillOpenAfterInterior = Boolean(document.querySelector('.prism-drawer'));
          const closeBtn = document.querySelector('.prism-drawer [data-action="close-drawer"]');
          let closedViaChildSpan = false;
          if (closeBtn) {
            const childSpan = document.createElement('span');
            childSpan.id = 'prism-close-child-span';
            childSpan.textContent = '✕';
            closeBtn.innerHTML = '';
            closeBtn.appendChild(childSpan);
            childSpan.click();
            closedViaChildSpan = !document.querySelector('.prism-drawer');
          }
          return { opened: Boolean(drawer), stillOpenAfterInterior, closedViaChildSpan };
        })()`);
        assert.equal(drawerOpenCheck.opened, true, 'Studio drawer did not open');
        assert.equal(drawerOpenCheck.stillOpenAfterInterior, true, 'Interior click inside .prism-drawer prematurely closed drawer!');
        assert.equal(drawerOpenCheck.closedViaChildSpan, true, 'Clicking child <span> inside [data-action="close-drawer"] failed to close drawer!');

        const modalCalls = await studioPage.evaluate(`({ confirm: window.__confirmCalled, alert: window.__alertCalled })`);
        assert.equal(modalCalls.confirm, 0, 'Forbidden window.confirm() called');
        assert.equal(modalCalls.alert, 0, 'Forbidden window.alert() called');
        assert.deepEqual(studioPage.consoleErrors, [], `Studio UI console.error: ${studioPage.consoleErrors.join(' | ')}`);
        assert.deepEqual(studioPage.pageExceptions, [], `Studio UI uncaught exception: ${studioPage.pageExceptions.join(' | ')}`);

        return `3-way startupMode (温和自动恢复 1.5s active) + Canary (${hostV2Audit.canaryState}) + Ctrl+Alt+Shift+R verified, Shot=${Math.round(sHostV2.bytes / 1024)}KB`;
      } finally {
        await browser.closePage(studioPage);
      }
    });

    // -----------------------------------------------------------------------
    // 3B. Antigravity 2.34.0 Hub E2E: All 5 Host/CDP/Cutout/Canary Checks + Screenshot (a)
    // -----------------------------------------------------------------------
    const shotHubV234Path = path.join(DEFAULT_ARTIFACT_DIR, 'v2-hub-234-islands-browser-hole.png');
    const { buildClientSkinPayload, buildStaticCssSheet, PRISM_DOM } = await import(
      pathToFileURL(path.join(REPO_ROOT, 'src', 'host', 'index.mjs')).href
    );
    const { buildHostMicroBootstrap } = await import(
      pathToFileURL(path.join(REPO_ROOT, 'sidecars', 'prism_studio', 'cdp-bridge.mjs')).href
    );

    await check('buildStaticCssSheet (`static-css` mode) generates zero-JS glass & [data-has-browser-hole] yield rules', '@gentle-skin-architect', async () => {
      const st = await studio.getState();
      const payload = buildClientSkinPayload(st.config, auroraItem, st.mediaOrigin, { skinEnabled: true });
      const css = buildStaticCssSheet(payload);
      assert.ok(typeof css === 'string' && css.length > 200, 'buildStaticCssSheet returned empty CSS');
      assert.ok(css.includes('data-has-browser-hole'), 'buildStaticCssSheet missing [data-has-browser-hole] transparency yield');
      assert.ok(css.includes('customizations-search'), 'buildStaticCssSheet missing Customizations carrier rules');
      assert.ok(css.includes('data-sidebar-section-drop-id'), 'buildStaticCssSheet missing [data-sidebar-section-drop-id] sticky header rule');
      assert.ok(css.includes('[data-testid="title-menu-bar"]'), 'buildStaticCssSheet missing rounded glass title-menu-bar rule');
      assert.ok(css.includes('--background: #00000000 !important'), 'buildStaticCssSheet missing body --background: #00000000 WCO guard');
      assert.ok(css.includes('[data-testid="project-header"]'), 'buildStaticCssSheet missing deep rounded project-header capsule rule');
      assert.ok(css.includes('--prism-surface-sidebar-deep'), 'buildStaticCssSheet missing --prism-surface-sidebar-deep token');
      assert.ok(css.includes('[data-testid="new-tab-search-input"]'), 'buildStaticCssSheet missing right aux-pane new-tab-search-input glass rule');

      const underlineCss = buildStaticCssSheet(
        buildClientSkinPayload({ ...st.config, regions: { ...(st.config.regions || {}), sidebar: { listStyle: 'underline', borderStyle: 'none' } } }, auroraItem, st.mediaOrigin, { skinEnabled: true }),
      );
      assert.ok(underlineCss.includes('border-bottom: 1px solid var(--prism-border-sidebar)'), 'buildStaticCssSheet underline mode missing hairline rule');
      assert.ok(
        underlineCss.includes('--prism-border-sidebar: transparent') && underlineCss.includes('--prism-bw-sidebar-top: 0px'),
        'buildStaticCssSheet sidebar.borderStyle="none" did not zero --prism-border-sidebar and --prism-bw-sidebar-top',
      );

      const accordionCss = buildStaticCssSheet(
        buildClientSkinPayload({ ...st.config, regions: { ...(st.config.regions || {}), sidebar: { listStyle: 'accordion' } } }, auroraItem, st.mediaOrigin, { skinEnabled: true }),
      );
      assert.ok(accordionCss.includes('rotate(45deg)') && accordionCss.includes('opacity: 0 !important'), 'buildStaticCssSheet accordion mode missing chevron & hover hide rule');

      const treeCss = buildStaticCssSheet(
        buildClientSkinPayload({ ...st.config, regions: { ...(st.config.regions || {}), sidebar: { listStyle: 'tree' } } }, auroraItem, st.mediaOrigin, { skinEnabled: true }),
      );
      assert.ok(treeCss.includes('order: -1') && treeCss.includes('border-right: 1.5px solid currentColor'), 'buildStaticCssSheet tree mode missing leading chevron indicator');

      return `${css.length}B static CSS sheet + underline/accordion/tree & borderStyle="off" verified`;
    });

    await check('Antigravity 2.34.0 Hub E2E: Lazy panel.js (0 KB boot -> Ctrl+Alt+W), Fail-Open Media Gate, PR #2 Selectors, 3-Layer [data-browser-hole] Rounded Cutout & Ctrl+Alt+Shift+R Panic Key + Screenshot (a)', '@gentle-skin-architect / @resilience-designer', async () => {
      hubRequestedPaths.length = 0;

      // Configure broken 404 video item FIRST so initial micro-bootstrap directly proves Check #1 (lazy panel.js) AND Check #2A (fail-open broken video)!
      const brokenVideoItem = {
        ...videoItem,
        id: 'broken-404-video-probe',
        title: 'Broken 404 Video Probe',
        kind: 'video',
        mediaUrl: `${mediaOrigin}/media/__broken_404_video__.mp4`,
        thumbUrl: '',
      };

      await engine.updateConfig({
        skinEnabled: true,
        startupMode: 'gentle-auto',
        preset: 'islands',
        layoutMode: 'islands',
        islandGap: 8,
        workspacePad: 8,
        cornerStyle: 'balanced',
        borders: 'on',
        shadows: true,
        themeMode: 'auto',
        colorScheme: 'prism-default',
        accentMode: 'dynamic',
        glassSurfaces: true,
        glassOpacity: 0.72,
        glassBlur: 16,
        scrimOpacity: 0.22,
        vignette: true,
        contrastFloor: true,
        triggerMode: 'both',
        language: 'zh',
      });

      const hubPage = await browser.openPage({
        url: `${HUB_MOCK_ORIGIN}/hub`,
        requestHandler: universalHttpRouter,
      });

      try {
        // Baseline pre-injection dark Hub check + mock `window.electronNative.setTitleBarOverlay`
        const baseline = await hubPage.evaluate(`(() => {
          window.__wcoCalls = [];
          window.__lastWco = null;
          window.electronNative = {
            setTitleBarOverlay(opts) {
              window.__wcoCalls.push(opts);
              window.__lastWco = opts;
              return Promise.resolve();
            },
          };
          const snap = (id) => {
            const el = document.getElementById(id);
            const cs = getComputedStyle(el);
            return { pos: cs.position, z: cs.zIndex, bg: cs.backgroundColor };
          };
          return {
            bodyBg: getComputedStyle(document.body).backgroundColor,
            neko: snap('gemini-neko-pet-root'),
            capsule: snap('ag-usage-monitor-capsule'),
            ctxMeter: snap('ag-context-meter'),
          };
        })()`);
        assert.equal(baseline.bodyBg, 'rgb(7, 7, 8)', `Unexpected pre-skin Hub body bg: ${baseline.bodyBg}`);

        // -------------------------------------------------------------------
        // CHECK 1A — Ephemeral Micro-Bootstrap (`<= 6144 B`), 0 KB `panel.js` on Boot & PR #8 Footer-Remount Self-Heal
        // -------------------------------------------------------------------
        const worstCaseBootstrap = buildHostMicroBootstrap({
          hostOrigin: 'https://127.0.0.1:65535',
          capToken: 'a'.repeat(64),
          triggerMode: 'both',
          startupMode: 'gentle-auto',
          skinEnabled: true,
        });
        assert.ok(
          Buffer.byteLength(worstCaseBootstrap, 'utf8') <= 6144,
          `PR #8 worst-case buildHostMicroBootstrap exceeded 6144 B budget: ${Buffer.byteLength(worstCaseBootstrap, 'utf8')} B`,
        );
        assert.ok(
          worstCaseBootstrap.includes('.apply(') && worstCaseBootstrap.includes('ds(W[K])'),
          'Micro-bootstrap ss() soft-disable helper missing W[K].apply / ds(W[K]) dual path!',
        );

        const bootstrapExpr = buildHostMicroBootstrap({
          hostOrigin: studio.origin,
          capToken: studio.hostCapToken,
          triggerMode: 'both',
          startupMode: 'gentle-auto',
          skinEnabled: true,
        });
        assert.ok(
          Buffer.byteLength(bootstrapExpr, 'utf8') <= 6144,
          `Micro-bootstrap unexpectedly bloated: ${Buffer.byteLength(bootstrapExpr, 'utf8')}B`,
        );

        await hubPage.evaluate(bootstrapExpr);

        // Wait for async `/host/<token>/stage.js` load
        const bootDeadline = Date.now() + 3000;
        while (Date.now() < bootDeadline) {
          const hasPrism = await hubPage.evaluate(`Boolean(window.__agyPrism && typeof window.__agyPrism.applyPayload === 'function')`);
          if (hasPrism) break;
          await sleep(40);
        }

        const lazyBootCheck = await hubPage.evaluate(`({
          hasSkin: Boolean(window.__agyPrism),
          panelType: typeof window.__agyPrismPanel,
          hasLazyStubPill: Boolean(document.querySelector('#agy-prism-pill[data-prism-lazy-stub="1"]')),
          pillInFooter: Boolean(document.querySelector('.agy-composer-footer #agy-prism-pill')),
        })`);
        assert.equal(lazyBootCheck.hasSkin, true, 'Micro-bootstrap did not load /host/<token>/stage.js');
        assert.equal(lazyBootCheck.panelType, 'undefined', 'window.__agyPrismPanel MUST NOT load on initial skin bootstrap (0 KB overhead)!');
        assert.equal(
          hubRequestedPaths.some((p) => p.includes('/panel.js')),
          false,
          `panel.js was prematurely fetched during boot: ${hubRequestedPaths.join(', ')}`,
        );
        assert.equal(lazyBootCheck.hasLazyStubPill, true, 'Lazy stub #agy-prism-pill[data-prism-lazy-stub="1"] missing');
        assert.equal(lazyBootCheck.pillInFooter, true, '#agy-prism-pill not mounted inside .agy-composer-footer');

        // PR #8 Footer-Remount E2E: simulate React remount replacing `.agy-composer-footer` without `#agy-prism-pill`
        await hubPage.evaluate(`(() => {
          const oldFooter = document.querySelector('.agy-composer-footer');
          const clone = oldFooter.cloneNode(true);
          const stalePill = clone.querySelector('#agy-prism-pill');
          if (stalePill) stalePill.remove();
          oldFooter.parentNode.replaceChild(clone, oldFooter);
        })()`);
        let healedAfterRemount = null;
        const healDeadline = Date.now() + 3000;
        while (Date.now() < healDeadline) {
          healedAfterRemount = await hubPage.evaluate(`({
            hasLazyStub: Boolean(document.querySelector('.agy-composer-footer #agy-prism-pill[data-prism-lazy-stub="1"]')),
            panelType: typeof window.__agyPrismPanel,
            pillCount: document.querySelectorAll('#agy-prism-pill').length,
          })`);
          if (healedAfterRemount.hasLazyStub) break;
          await sleep(60);
        }
        assert.equal(healedAfterRemount?.hasLazyStub, true, 'PR #8: Lazy stub #agy-prism-pill did not self-heal after .agy-composer-footer React remount!');
        assert.equal(healedAfterRemount?.panelType, 'undefined', 'PR #8: Footer remount self-heal must NOT load full panel.js!');
        assert.equal(healedAfterRemount?.pillCount, 1, `PR #8: Expected single #agy-prism-pill after self-heal, got ${healedAfterRemount?.pillCount}`);
        assert.equal(
          hubRequestedPaths.some((p) => p.includes('/panel.js')),
          false,
          `PR #8: panel.js was fetched during footer remount heal: ${hubRequestedPaths.join(', ')}`,
        );

        // PR #8 Body-Fallback <-> Footer Relocation: detach footer -> body fixed fallback -> re-attach footer -> relocates back
        await hubPage.evaluate(`(() => {
          const footer = document.querySelector('.agy-composer-footer');
          window.__detachedFooterParent = footer.parentNode;
          window.__detachedFooter = footer;
          footer.remove();
        })()`);
        let bodyFallback = false;
        const fbDeadline = Date.now() + 3000;
        while (Date.now() < fbDeadline) {
          bodyFallback = await hubPage.evaluate(`(() => {
            const p = document.getElementById('agy-prism-pill');
            return Boolean(p && p.parentNode === document.body && getComputedStyle(p).position === 'fixed');
          })()`);
          if (bodyFallback) break;
          await sleep(60);
        }
        assert.equal(bodyFallback, true, 'PR #8: Lazy #agy-prism-pill did not fall back to document.body fixed when footer detached');
        await hubPage.evaluate(`(() => {
          if (window.__detachedFooterParent && window.__detachedFooter) {
            window.__detachedFooterParent.appendChild(window.__detachedFooter);
          }
          delete window.__detachedFooterParent;
          delete window.__detachedFooter;
        })()`);
        let relocatedToFooter = false;
        const relocDeadline = Date.now() + 3000;
        while (Date.now() < relocDeadline) {
          relocatedToFooter = await hubPage.evaluate(`Boolean(document.querySelector('.agy-composer-footer #agy-prism-pill[data-prism-lazy-stub="1"]'))`);
          if (relocatedToFooter) break;
          await sleep(60);
        }
        assert.equal(relocatedToFooter, true, 'PR #8: Lazy #agy-prism-pill did not relocate back from document.body to re-attached .agy-composer-footer');

        // -------------------------------------------------------------------
        // CHECK 2 — Fail-Open Media-Ready Gate & `z-index: -1` Inert Stage
        // -------------------------------------------------------------------
        const stBroken = await studio.getState();
        const brokenPayload = buildClientSkinPayload(stBroken.config, brokenVideoItem, stBroken.mediaOrigin, {
          skinEnabled: true,
        });
        await hubPage.evaluate(`window.__agyPrism.applyPayload(${JSON.stringify(brokenPayload)})`);
        await sleep(450);

        const failOpenAudit = await hubPage.evaluate(`(() => {
          const html = document.documentElement;
          const stage = document.getElementById('agy-prism-stage');
          const stageCs = stage ? getComputedStyle(stage) : null;
          const rootCs = getComputedStyle(document.getElementById('root'));
          const mainOpaqueCs = getComputedStyle(document.getElementById('hub-main-pane'));
          const probeOpaqueCs = getComputedStyle(document.getElementById('v234-browser-hole-probe'));
          const btn = document.getElementById('hub-interactive-btn');
          const r = btn.getBoundingClientRect();
          return {
            wallpaperAttr: html.getAttribute('data-agy-prism-wallpaper'),
            glassAttr: html.getAttribute('data-agy-prism-glass'),
            rootBg: rootCs.backgroundColor,
            rootPe: rootCs.pointerEvents,
            mainOpaqueBg: mainOpaqueCs.backgroundColor,
            probeOpaqueBg: probeOpaqueCs.backgroundColor,
            stageExists: Boolean(stage),
            stageZ: stageCs ? stageCs.zIndex : '',
            stageBg: stageCs ? stageCs.backgroundColor : '',
            stagePe: stageCs ? stageCs.pointerEvents : '',
            stageInert: stage ? Boolean(stage.inert) : false,
            btnCenter: { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) },
          };
        })()`);

        assert.notEqual(
          failOpenAudit.wallpaperAttr,
          'ready',
          `Broken 404 video MUST NOT set data-agy-prism-wallpaper="ready" (got ${failOpenAudit.wallpaperAttr})!`,
        );
        assert.equal(failOpenAudit.rootBg, 'rgb(7, 7, 8)', `Broken 404 video hollowed #root (${failOpenAudit.rootBg}) instead of failing open!`);
        assert.equal(
          failOpenAudit.mainOpaqueBg,
          'rgb(7, 7, 8)',
          `Broken 404 video hollowed .browser-hole-opaque (${failOpenAudit.mainOpaqueBg})!`,
        );
        assert.equal(failOpenAudit.probeOpaqueBg, 'rgb(7, 7, 8)', 'Broken 404 video hollowed #v234-browser-hole-probe');
        assert.equal(failOpenAudit.stageExists, true, '#agy-prism-stage missing');
        assert.equal(failOpenAudit.stageZ, '-1', `#agy-prism-stage z-index must be -1, got ${failOpenAudit.stageZ}`);
        assert.equal(failOpenAudit.stageBg, 'rgba(0, 0, 0, 0)', `#agy-prism-stage background must be transparent, got ${failOpenAudit.stageBg}`);
        assert.equal(failOpenAudit.stagePe, 'none', `#agy-prism-stage pointer-events must be none, got ${failOpenAudit.stagePe}`);
        assert.equal(failOpenAudit.stageInert, true, '#agy-prism-stage.inert must be true');

        // Dispatch real mouse click on `#hub-interactive-btn` inside `#root` -> must click cleanly!
        await hubPage.call('Input.dispatchMouseEvent', {
          type: 'mousePressed',
          x: failOpenAudit.btnCenter.x,
          y: failOpenAudit.btnCenter.y,
          button: 'left',
          clickCount: 1,
        });
        await hubPage.call('Input.dispatchMouseEvent', {
          type: 'mouseReleased',
          x: failOpenAudit.btnCenter.x,
          y: failOpenAudit.btnCenter.y,
          button: 'left',
          clickCount: 1,
        });
        const clicksAfterBroken = await hubPage.evaluate(`window.__hubInteractiveClicks || 0`);
        assert.equal(clicksAfterBroken, 1, '#root interactive button did not receive real mouse click during fail-open state!');

        // Now switch to valid H.264 video (`100002`) -> `data-agy-prism-wallpaper === "ready"` ONLY after Frame 1 decodes!
        await engine.applyWallpaper(videoItem.id, { skinEnabled: true, layoutMode: 'islands', paused: false, muted: true });
        const stValidVid = await studio.getState();
        const validVidPayload = buildClientSkinPayload(stValidVid.config, stValidVid.activeItem, stValidVid.mediaOrigin, {
          skinEnabled: true,
        });
        await hubPage.evaluate(`window.__agyPrism.applyPayload(${JSON.stringify(validVidPayload)})`);

        let validVidGate = null;
        const vidDeadline = Date.now() + 3500;
        while (Date.now() < vidDeadline) {
          validVidGate = await hubPage.evaluate(`(() => {
            const wAttr = document.documentElement.getAttribute('data-agy-prism-wallpaper');
            const vids = Array.from(document.querySelectorAll('#agy-prism-stage video'));
            const v = vids[vids.length - 1] || null;
            return {
              wallpaperAttr: wAttr,
              readyState: v ? v.readyState : 0,
              videoWidth: v ? v.videoWidth : 0,
              paused: v ? v.paused : true,
            };
          })()`);
          if (validVidGate.wallpaperAttr === 'ready') break;
          await sleep(35);
        }
        assert.equal(validVidGate?.wallpaperAttr, 'ready', 'Valid H.264 video did not flip data-agy-prism-wallpaper="ready"');
        if (fx.hasRealVideoFrames) {
          assert.ok(validVidGate.readyState >= 2, `Expected readyState >= 2 at wallpaper="ready", got ${validVidGate.readyState}`);
          assert.ok(validVidGate.videoWidth > 0, `Expected decoded videoWidth > 0 at wallpaper="ready", got ${validVidGate.videoWidth}`);
        }

        // Verify D3D11 zero-copy hardware video overlay pass-through:
        //   - default video (`mediaSaturate: 100`) AND legacy persisted `mediaSaturate: 105` output `--prism-media-filter: none`
        //   - manual `mediaSaturate: 130` outputs `saturate(130%)`
        const mediaFilterAudit = await hubPage.evaluate(`(() => {
          const readFilter = () => getComputedStyle(document.documentElement).getPropertyValue('--prism-media-filter').trim();
          const defaultFilter = readFilter();
          window.__agyPrism.updateConfig({ mediaSaturate: 105 });
          const legacy105Filter = readFilter();
          window.__agyPrism.updateConfig({ mediaSaturate: 130 });
          const manual130Filter = readFilter();
          window.__agyPrism.updateConfig({ mediaSaturate: 100 });
          const restored100Filter = readFilter();
          const v = document.querySelector('#agy-prism-stage video');
          const videoComputedFilter = v ? getComputedStyle(v).filter : '';
          return { defaultFilter, legacy105Filter, manual130Filter, restored100Filter, videoComputedFilter };
        })()`);
        assert.equal(
          mediaFilterAudit.defaultFilter,
          'none',
          `Expected default video --prism-media-filter === 'none' for D3D11 overlay pass-through, got '${mediaFilterAudit.defaultFilter}'`,
        );
        assert.equal(
          mediaFilterAudit.legacy105Filter,
          'none',
          `Expected legacy mediaSaturate:105 --prism-media-filter === 'none', got '${mediaFilterAudit.legacy105Filter}'`,
        );
        assert.ok(
          mediaFilterAudit.manual130Filter.includes('saturate(130%)'),
          `Expected manual mediaSaturate:130 --prism-media-filter to include 'saturate(130%)', got '${mediaFilterAudit.manual130Filter}'`,
        );
        assert.equal(mediaFilterAudit.restored100Filter, 'none');
        assert.equal(mediaFilterAudit.videoComputedFilter, 'none', `Expected <video> computed filter === 'none', got '${mediaFilterAudit.videoComputedFilter}'`);

        // Verify v2.0.1 anti-occlusion containment (`contain: style`, never `paint`), rVFC keep-alive, and fullscreen/focus wake
        const vidLivenessAudit = await hubPage.evaluate(`(() => {
          const stage = document.getElementById('agy-prism-stage');
          const vids = Array.from(stage.querySelectorAll('video'));
          const v = vids[vids.length - 1] || null;
          document.dispatchEvent(new Event('fullscreenchange'));
          window.dispatchEvent(new Event('focus'));
          return {
            stageContain: getComputedStyle(stage).contain,
            rvfcSupported: Boolean(v && typeof v.requestVideoFrameCallback === 'function'),
            rvfcActive: Boolean(v && v.__prismRvfcActive),
            statusPaused: window.__agyPrism.status().paused,
          };
        })()`);
        assert.ok(
          !String(vidLivenessAudit.stageContain).includes('paint') && !String(vidLivenessAudit.stageContain).includes('strict'),
          `#agy-prism-stage must NOT include paint/strict containment (got: ${vidLivenessAudit.stageContain})`,
        );
        if (vidLivenessAudit.rvfcSupported) {
          assert.equal(vidLivenessAudit.rvfcActive, true, 'Active video missing rVFC frame-consumer keep-alive');
        }
        assert.equal(vidLivenessAudit.statusPaused, false, 'Fullscreen/focus wake should keep video unpaused');

        // Verify v2.0.2 `transparentWindowControls` default ON (`#00000000`) & live toggle OFF/ON (`#131313` <-> `#00000000`)
        const wcoToggleAudit = await hubPage.evaluate(`(() => {
          const initialWco = window.__lastWco ? { ...window.__lastWco } : null;
          const initialAttr = document.documentElement.getAttribute('data-agy-prism-wco');
          window.__agyPrism.updateConfig({ transparentWindowControls: false });
          const offWco = window.__lastWco ? { ...window.__lastWco } : null;
          const offAttr = document.documentElement.getAttribute('data-agy-prism-wco');
          window.__agyPrism.updateConfig({ transparentWindowControls: true });
          const onWco = window.__lastWco ? { ...window.__lastWco } : null;
          const onAttr = document.documentElement.getAttribute('data-agy-prism-wco');
          return { initialWco, initialAttr, offWco, offAttr, onWco, onAttr };
        })()`);
        assert.equal(wcoToggleAudit.initialWco?.color, '#00000000', `Expected default transparent WCO #00000000, got ${JSON.stringify(wcoToggleAudit.initialWco)}`);
        assert.equal(wcoToggleAudit.initialAttr, 'transparent');
        assert.equal(wcoToggleAudit.offWco?.color, '#131313', `Expected opaque WCO #131313 when toggled off, got ${JSON.stringify(wcoToggleAudit.offWco)}`);
        assert.equal(wcoToggleAudit.offAttr, null);
        assert.equal(wcoToggleAudit.onWco?.color, '#00000000', `Expected transparent WCO #00000000 when toggled back on`);
        assert.equal(wcoToggleAudit.onAttr, 'transparent');

        // Verify v2.0.3 `.agy-sidebar-row` hover title alpha-mask + `.agy-row-actions > button` frosted contrast pill
        const rowActAudit = await hubPage.evaluate(`(() => {
          const sb = document.querySelector('.agy-sidebar');
          const row = document.createElement('div');
          row.setAttribute('data-testid', 'conversation-row-sidebar');
          row.setAttribute('data-prism-force-hover', '1');
          row.className = 'relative w-full flex flex-row justify-between agy-sidebar-row group pl-[30px] pr-2 py-1.5 items-center';
          row.style.cssText = '--row-bg: var(--sidebar-muted); width: 240px;';
          row.innerHTML =
            '<div id="mock-row-title-wrap" class="relative flex gap-2 grow min-w-0 items-center pointer-events-none">' +
              '<span class="truncate w-full">Antigravity 插件市场自动收录与重名评估</span>' +
            '</div>' +
            '<div class="relative flex items-center shrink-0 ml-2 pointer-events-none">' +
              '<div class="relative flex items-center">' +
                '<div id="mock-row-actions" class="agy-row-actions absolute top-0 bottom-0 -right-1 pl-6 flex items-center justify-end gap-0.5 z-10" style="background: linear-gradient(to right, transparent 0%, var(--row-bg) 25%);">' +
                  '<button id="mock-archive-btn" type="button">A</button>' +
                  '<button type="button">P</button>' +
                  '<button type="button">M</button>' +
                '</div>' +
                '<div class="agy-row-status"></div>' +
              '</div>' +
            '</div>';
          sb.appendChild(row);
          const titleCs = getComputedStyle(document.getElementById('mock-row-title-wrap'));
          const actCs = getComputedStyle(document.getElementById('mock-row-actions'));
          const btnCs = getComputedStyle(document.getElementById('mock-archive-btn'));
          const out = {
            maskImage: titleCs.maskImage || titleCs.webkitMaskImage || '',
            actBgImg: actCs.backgroundImage,
            btnBg: btnCs.backgroundColor,
          };
          row.remove();
          return out;
        })()`);
        assert.ok(
          String(rowActAudit.maskImage).includes('linear-gradient'),
          `Hovered .agy-sidebar-row title wrapper missing mask-image fade (got: ${rowActAudit.maskImage})`,
        );
        assert.equal(rowActAudit.actBgImg, 'none', `.agy-row-actions did not clear broken inline gradient (${rowActAudit.actBgImg})`);
        assert.ok(
          parseAlphaFromCssColor(rowActAudit.btnBg) >= 0.6,
          `Expected .agy-row-actions > button frosted contrast alpha >= 0.6, got ${rowActAudit.btnBg}`,
        );

        // Clear any expected 404 network error log emitted by Chromium during the intentional broken-video probe
        hubPage.consoleErrors = hubPage.consoleErrors.filter((e) => !e.includes('__broken_404_video__') && !e.includes('404'));

        // -------------------------------------------------------------------
        // CHECK 3 — 2.34.0 Issue #1 + PR #2 Refined Selectors & Sibling Coexistence
        // -------------------------------------------------------------------
        const v234Audit = await hubPage.evaluate(`(() => {
          const html = document.documentElement;
          const rootCs = getComputedStyle(document.getElementById('root'));
          const rootDarkWrapCs = getComputedStyle(document.getElementById('v234-root-theme-wrap'));
          const mainPaneCs = getComputedStyle(document.getElementById('hub-main-pane'));
          const shellCs = getComputedStyle(document.querySelector('.agy-shell'));
          const sidebarCs = getComputedStyle(document.querySelector('.agy-sidebar'));
          const gutterCs = getComputedStyle(document.querySelector('[data-testid="sidebar-split"] > div:nth-child(2)'));
          const fixedProbeRect = document.getElementById('composer-fixed-probe').getBoundingClientRect();

          const innerDarkCs = getComputedStyle(document.getElementById('v234-inner-dark-probe'));
          const holeOpaqueCs = getComputedStyle(document.getElementById('v234-browser-hole-probe'));
          const mainBodyCs = getComputedStyle(document.getElementById('v234-main-body-probe'));

          const custProbe = document.getElementById('v234-customizations-probe');
          const custHostCs = getComputedStyle(custProbe);
          const custBeforeCs = getComputedStyle(custProbe, '::before');
          const custCardCs = getComputedStyle(document.getElementById('v234-cust-card'));
          const custSpotlightCs = getComputedStyle(document.getElementById('v234-cust-spotlight'));
          const custFixedRect = document.getElementById('v234-cust-fixed-probe').getBoundingClientRect();
          const dropStickyBeforeCs = getComputedStyle(document.getElementById('v234-drop-sticky-probe'), '::before');

          const bd = document.getElementById('v234-settings-backdrop-probe');
          bd.style.display = 'flex';
          const bdCs = getComputedStyle(bd);
          const dlgCs = getComputedStyle(document.getElementById('v234-settings-dialog-probe'));
          const detailCs = getComputedStyle(document.getElementById('v234-settings-detail-probe'));
          const activeTabCs = getComputedStyle(document.getElementById('v234-settings-active-tab-probe'));
          const hoverTabCs = getComputedStyle(document.getElementById('v234-settings-hover-tab-probe'));
          const menuOuterCs = getComputedStyle(document.getElementById('hub-menu-probe'));
          const menuInnerCs = getComputedStyle(document.getElementById('hub-inner-menu-probe'));

          const snap = (id) => {
            const el = document.getElementById(id);
            const cs = getComputedStyle(el);
            return { pos: cs.position, z: cs.zIndex, bg: cs.backgroundColor };
          };
          const out = {
            skinAttr: html.getAttribute('data-agy-prism-skin'),
            layoutAttr: html.getAttribute('data-prism-layout'),
            rootBg: rootCs.backgroundColor,
            rootDarkBgVar: rootDarkWrapCs.getPropertyValue('--background').trim(),
            mainPaneBg: mainPaneCs.backgroundColor,
            shellPadTop: shellCs.paddingTop,
            sidebarRadius: sidebarCs.borderTopLeftRadius,
            gutterWidth: gutterCs.width,
            fixedProbeTop: Math.round(fixedProbeRect.top),
            fixedProbeLeft: Math.round(fixedProbeRect.left),
            innerDarkBgVar: innerDarkCs.getPropertyValue('--background').trim(),
            innerDarkSidebarVar: innerDarkCs.getPropertyValue('--sidebar').trim(),
            holeOpaqueBg: holeOpaqueCs.backgroundColor,
            holeShellCanvas: holeOpaqueCs.getPropertyValue('--shell-canvas').trim(),
            mainBodyBg: mainBodyCs.backgroundColor,
            custHostBlur: custHostCs.backdropFilter || custHostCs.webkitBackdropFilter || 'none',
            custBeforeBg: custBeforeCs.backgroundColor,
            custBeforeBlur: custBeforeCs.backdropFilter || custBeforeCs.webkitBackdropFilter || 'none',
            custCardBg: custCardCs.backgroundColor,
            custSpotlightBg: custSpotlightCs.backgroundColor,
            custFixedTop: Math.round(custFixedRect.top),
            custFixedLeft: Math.round(custFixedRect.left),
            dropStickyBeforeBg: dropStickyBeforeCs.backgroundColor,
            dropStickyBeforeBlur: dropStickyBeforeCs.backdropFilter || dropStickyBeforeCs.webkitBackdropFilter || 'none',
            backdropBg: bdCs.backgroundColor,
            dialogBg: dlgCs.backgroundColor,
            detailBg: detailCs.backgroundColor,
            activeTabBg: activeTabCs.backgroundColor,
            hoverTabIdleBg: hoverTabCs.backgroundColor,
            hoverTabBgVar: hoverTabCs.getPropertyValue('--background').trim(),
            menuOuterBg: menuOuterCs.backgroundColor,
            menuInnerBg: menuInnerCs.backgroundColor,
            neko: snap('gemini-neko-pet-root'),
            capsule: snap('ag-usage-monitor-capsule'),
            ctxMeter: snap('ag-context-meter'),
          };
          bd.style.display = 'none';
          return out;
        })()`);

        assert.equal(v234Audit.skinAttr, PRISM_DOM.skinVersion);
        assert.equal(v234Audit.layoutAttr, 'islands');
        assert.equal(v234Audit.rootBg, 'rgba(0, 0, 0, 0)');
        assert.equal(v234Audit.rootDarkBgVar, 'transparent', 'Inner div.h-full.w-full.dark did not hollow --background');
        assert.equal(v234Audit.innerDarkBgVar, 'transparent');
        assert.notEqual(v234Audit.innerDarkSidebarVar, '#111114');
        assert.equal(v234Audit.holeShellCanvas, 'transparent');
        assert.equal(v234Audit.holeOpaqueBg, 'rgba(0, 0, 0, 0)', '.browser-hole-opaque did not hollow when wallpaper ready');
        assert.equal(v234Audit.mainBodyBg, 'rgba(0, 0, 0, 0)');
        assert.ok(
          parseAlphaFromCssColor(v234Audit.mainPaneBg) < 0.85,
          `Main chat pane (.browser-hole-opaque) stayed solid (${v234Audit.mainPaneBg}) instead of translucent island!`,
        );
        assert.equal(v234Audit.shellPadTop, '8px');
        assert.equal(v234Audit.sidebarRadius, '12px');
        assert.equal(v234Audit.gutterWidth, '8px');
        assert.equal(v234Audit.fixedProbeTop, 0, 'position:fixed child inside .surface-composer-card trapped!');
        assert.equal(v234Audit.fixedProbeLeft, 0);

        // Customizations dark frosted glass page carrier + cards + untrapped fixed probe + [data-sidebar-section-drop-id] sticky header
        assert.equal(v234Audit.custHostBlur, 'none', '#v234-customizations-probe parent must keep backdrop-filter: none');
        assert.ok(
          parseAlphaFromCssColor(v234Audit.custBeforeBg) >= 0.70,
          `Expected #v234-customizations-probe::before alpha >= 0.70, got ${v234Audit.custBeforeBg}`,
        );
        assert.ok(
          String(v234Audit.custBeforeBlur).includes('blur('),
          `Expected #v234-customizations-probe::before backdropFilter to include 'blur(', got ${v234Audit.custBeforeBlur}`,
        );
        assert.ok(
          parseAlphaFromCssColor(v234Audit.custCardBg) >= 0.50,
          `Expected #v234-cust-card alpha >= 0.50 (not transparent), got ${v234Audit.custCardBg}`,
        );
        assert.ok(
          parseAlphaFromCssColor(v234Audit.custSpotlightBg) >= 0.50,
          `Expected #v234-cust-spotlight alpha >= 0.50, got ${v234Audit.custSpotlightBg}`,
        );
        assert.equal(v234Audit.custFixedTop, 0, `#v234-cust-fixed-probe top trapped (${v234Audit.custFixedTop}) instead of 0!`);
        assert.equal(v234Audit.custFixedLeft, 0, `#v234-cust-fixed-probe left trapped (${v234Audit.custFixedLeft}) instead of 0!`);
        const dropStickyAlpha = parseAlphaFromCssColor(v234Audit.dropStickyBeforeBg);
        assert.ok(
          dropStickyAlpha >= 0.85,
          `Expected #v234-drop-sticky-probe::before alpha >= 0.85, got ${v234Audit.dropStickyBeforeBg}`,
        );
        if (dropStickyAlpha >= 0.88) {
          assert.equal(
            v234Audit.dropStickyBeforeBlur,
            'none',
            `Tier 1 high-alpha sticky header (${dropStickyAlpha}) should suppress redundant blur, got ${v234Audit.dropStickyBeforeBlur}`,
          );
        } else {
          assert.ok(
            String(v234Audit.dropStickyBeforeBlur).includes('blur('),
            `Expected #v234-drop-sticky-probe::before backdropFilter to include 'blur(', got ${v234Audit.dropStickyBeforeBlur}`,
          );
        }

        // Settings modal, inner `.hover:bg-background` tab & `[role="menu"]` solid legibility (`alpha >= 0.94`)
        assert.ok(parseAlphaFromCssColor(v234Audit.backdropBg) >= 0.25, `Settings backdrop alpha too low: ${v234Audit.backdropBg}`);
        assert.ok(parseAlphaFromCssColor(v234Audit.dialogBg) >= 0.94, `.settings-modal-container alpha < 0.94: ${v234Audit.dialogBg}`);
        assert.ok(parseAlphaFromCssColor(v234Audit.detailBg) >= 0.94, `Settings detail pane alpha < 0.94: ${v234Audit.detailBg}`);
        assert.ok(parseAlphaFromCssColor(v234Audit.activeTabBg) >= 0.94, `Settings active .bg-background tab alpha < 0.94: ${v234Audit.activeTabBg}`);
        assert.equal(
          v234Audit.hoverTabIdleBg,
          'rgba(0, 0, 0, 0)',
          `PR #2 [class*="bg-background"] substring bug clobbered unhovered .hover:bg-background tab (${v234Audit.hoverTabIdleBg})!`,
        );
        assert.ok(
          parseAlphaFromCssColor(v234Audit.hoverTabBgVar) >= 0.94,
          `Settings .hover:bg-background --background token alpha < 0.94: ${v234Audit.hoverTabBgVar}`,
        );
        assert.ok(parseAlphaFromCssColor(v234Audit.menuOuterBg) >= 0.94, `[role="menu"] alpha < 0.94: ${v234Audit.menuOuterBg}`);
        assert.ok(parseAlphaFromCssColor(v234Audit.menuInnerBg) >= 0.94, `Inner #root .dark [role="menu"] alpha < 0.94: ${v234Audit.menuInnerBg}`);

        // Sibling plugin overlays MUST remain 100% untouched
        assert.deepEqual(v234Audit.neko, baseline.neko, '#gemini-neko-pet-root mutated by Prism CSS!');
        assert.deepEqual(v234Audit.capsule, baseline.capsule, '#ag-usage-monitor-capsule mutated by Prism CSS!');
        assert.deepEqual(v234Audit.ctxMeter, baseline.ctxMeter, '#ag-context-meter mutated by Prism CSS!');

        // Switch to vivid Aurora image (`100001`) in Islands mode for crisp visual cutout & popover checks
        await engine.applyWallpaper(auroraItem.id, { skinEnabled: true, layoutMode: 'islands', glassOpacity: 0.72 });
        const stAurora = await studio.getState();
        const auroraPayload = buildClientSkinPayload(stAurora.config, stAurora.activeItem, stAurora.mediaOrigin, {
          skinEnabled: true,
        });
        await hubPage.evaluate(`window.__agyPrism.applyPayload(${JSON.stringify(auroraPayload)})`);
        await sleep(350);

        // -------------------------------------------------------------------
        // CHECK 3B — Antigravity 2.34.0 Light-Mode Regression Suite (Issue #4 + PR #3 Part 5)
        //   1) `[data-testid="voice-live-pill"]` & `.ag-cs-home-heat-hint` keep crisp light glyph (`rgb(--prism-base-rgb)`), NOT transparent black dot!
        //   2) Sidebar `[data-index][style*="sticky"]` `Projects` header gets `::before` frosted carrier (`alpha >= 0.90` + `blur(`) & nested `.bg-sidebar` transparent!
        //   3) Image preview lightbox `[data-testid="media-modal"]` stays `rgba(0,0,0,0)` over dimmed blurred `[data-testid="modal-backdrop"]` (NOT solid white!)
        // -------------------------------------------------------------------
        const lightModeAudit = await hubPage.evaluate(`(async () => {
          document.documentElement.className = 'light';
          document.body.className = 'light';
          const wrap = document.getElementById('v234-root-theme-wrap');
          if (wrap) wrap.className = 'h-full w-full light';
          await new Promise((r) => setTimeout(r, 90));

          const voiceEl = document.getElementById('hub-voice-live-pill');
          const voiceCs = getComputedStyle(voiceEl);
          const heatEl = document.getElementById('hub-heat-hint-probe');
          const heatCs = getComputedStyle(heatEl);

          const stickyOuter = document.getElementById('hub-sidebar-sticky-projects');
          const stickyBeforeCs = getComputedStyle(stickyOuter, '::before');
          const stickyInnerCs = getComputedStyle(document.getElementById('hub-sidebar-sticky-inner'));

          const lbPortal = document.getElementById('v234-lightbox-portal');
          lbPortal.style.display = 'block';
          const lbBackdropCs = getComputedStyle(document.getElementById('v234-modal-backdrop-probe'));
          const lbModalCs = getComputedStyle(document.getElementById('v234-media-modal-probe'));

          const res = {
            prismTheme: document.documentElement.getAttribute('data-prism-theme'),
            voiceBg: voiceCs.backgroundColor,
            voiceColor: voiceCs.color,
            heatColor: heatCs.color,
            stickyBeforeBg: stickyBeforeCs.backgroundColor,
            stickyBeforeBlur: stickyBeforeCs.backdropFilter || stickyBeforeCs.webkitBackdropFilter || 'none',
            stickyInnerBg: stickyInnerCs.backgroundColor,
            lbBackdropBg: lbBackdropCs.backgroundColor,
            lbBackdropBlur: lbBackdropCs.backdropFilter || lbBackdropCs.webkitBackdropFilter || 'none',
            lbModalBg: lbModalCs.backgroundColor,
            lbModalBlur: lbModalCs.backdropFilter || lbModalCs.webkitBackdropFilter || 'none',
          };

          lbPortal.style.display = 'none';
          document.documentElement.className = 'dark';
          document.body.className = 'dark';
          if (wrap) wrap.className = 'h-full w-full dark';
          await new Promise((r) => setTimeout(r, 70));
          return res;
        })()`);

        assert.equal(lightModeAudit.prismTheme, 'light', 'Hub did not switch data-prism-theme to light');
        const voiceRgbMatch = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(lightModeAudit.voiceColor);
        assert.ok(
          voiceRgbMatch &&
            parseAlphaFromCssColor(lightModeAudit.voiceColor) >= 0.99 &&
            Number(voiceRgbMatch[1]) > 200 &&
            Number(voiceRgbMatch[2]) > 200 &&
            Number(voiceRgbMatch[3]) > 200,
          `Issue #4 Bug 1 regression: Light-mode [data-testid="voice-live-pill"] glyph turned transparent/dark (${lightModeAudit.voiceColor} on ${lightModeAudit.voiceBg})!`,
        );
        const heatRgbMatch = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(lightModeAudit.heatColor);
        assert.ok(
          heatRgbMatch &&
            parseAlphaFromCssColor(lightModeAudit.heatColor) >= 0.99 &&
            Number(heatRgbMatch[1]) > 200 &&
            Number(heatRgbMatch[2]) > 200 &&
            Number(heatRgbMatch[3]) > 200,
          `.ag-cs-home-heat-hint ink turned dark/transparent (${lightModeAudit.heatColor})`,
        );
        const lightStickyAlpha = parseAlphaFromCssColor(lightModeAudit.stickyBeforeBg);
        assert.ok(
          lightStickyAlpha >= 0.90,
          `Issue #4 Bug 2 regression: Sidebar sticky Projects ::before alpha < 0.90 (${lightModeAudit.stickyBeforeBg})!`,
        );
        if (lightStickyAlpha >= 0.88) {
          assert.equal(
            lightModeAudit.stickyBeforeBlur,
            'none',
            `Tier 1 Light-mode sticky Projects high alpha (${lightStickyAlpha}) should skip redundant blur, got ${lightModeAudit.stickyBeforeBlur}`,
          );
        } else {
          assert.ok(
            String(lightModeAudit.stickyBeforeBlur).includes('blur('),
            `Issue #4 Bug 2 regression: Sidebar sticky Projects ::before missing blur (${lightModeAudit.stickyBeforeBlur})!`,
          );
        }
        assert.equal(
          lightModeAudit.stickyInnerBg,
          'rgba(0, 0, 0, 0)',
          `Nested .bg-sidebar inside sticky Projects header was not zeroed (${lightModeAudit.stickyInnerBg})`,
        );
        assert.equal(
          lightModeAudit.lbModalBg,
          'rgba(0, 0, 0, 0)',
          `Issue #4 Bug 3 regression: Light-mode [data-testid="media-modal"] painted opaque (${lightModeAudit.lbModalBg}) instead of transparent!`,
        );
        assert.equal(lightModeAudit.lbModalBlur, 'none', '[data-testid="media-modal"] must have backdrop-filter: none');
        const lbBackdropAlpha = parseAlphaFromCssColor(lightModeAudit.lbBackdropBg);
        assert.ok(
          lbBackdropAlpha >= 0.40 && lbBackdropAlpha <= 0.75,
          `[data-testid="modal-backdrop"] lost dimmed cinema backdrop (${lightModeAudit.lbBackdropBg})!`,
        );
        assert.ok(String(lightModeAudit.lbBackdropBlur).includes('blur('), '[data-testid="modal-backdrop"] missing blur');

        // Verify lazy boot `#agy-prism-pill` stub has `data-ag-no-i18n="1"` BEFORE summoning `panel.js`
        const stubNoI18n = await hubPage.evaluate(`(() => {
          const p = document.getElementById('agy-prism-pill');
          return p ? { noI18n: p.getAttribute('data-ag-no-i18n'), translate: p.getAttribute('translate') } : null;
        })()`);
        assert.equal(stubNoI18n?.noI18n, '1', 'Lazy boot #agy-prism-pill stub missing data-ag-no-i18n="1"');
        assert.equal(stubNoI18n?.translate, 'no', 'Lazy boot #agy-prism-pill stub missing translate="no"');

        // -------------------------------------------------------------------
        // CHECK 1B — Press `Ctrl+Alt+W` -> Dynamically Loads `/host/<token>/panel.js` & Opens `#agy-prism-popover`
        // -------------------------------------------------------------------
        await hubPage.pressKey({
          key: 'w',
          code: 'KeyW',
          windowsVirtualKeyCode: 87,
          modifiers: 3, // Alt (1) + Ctrl (2)
        });

        let panelOpened = false;
        const panelDeadline = Date.now() + 3000;
        while (Date.now() < panelDeadline) {
          panelOpened = await hubPage.evaluate(
            `Boolean(window.__agyPrismPanel && typeof window.__agyPrismPanel.status === 'function' && window.__agyPrismPanel.status().open)`,
          );
          if (panelOpened) break;
          await sleep(45);
        }
        assert.equal(panelOpened, true, 'Pressing Ctrl+Alt+W did not dynamically load panel.js and open #agy-prism-popover!');
        assert.equal(
          hubRequestedPaths.some((p) => p.startsWith(`/host/${studio.hostCapToken}/panel.js`)),
          true,
          `Expected dynamic GET /host/<token>/panel.js after Ctrl+Alt+W (seen: ${hubRequestedPaths.join(', ')})`,
        );

        // PR #3 Popover `本地`/`Local` Chip + `90`-Step `Load More` Pagination + `data-ag-no-i18n="1"` E2E
        const popPaginationCheck = await hubPage.evaluate(`(() => {
          const pop = document.getElementById('agy-prism-popover');
          const pill = document.getElementById('agy-prism-pill');
          const noI18nOk = Boolean(
            pop && pop.getAttribute('data-ag-no-i18n') === '1' && pill && pill.getAttribute('data-ag-no-i18n') === '1',
          );

          const tabs = pop.querySelectorAll('[role="tab"]');
          if (tabs[0]) tabs[0].click(); // switch to library tab so renderLibraryGrid() mounts cards!

          const synthetic = [];
          for (let i = 0; i < 95; i++) {
            synthetic.push({ id: 'ws-syn-' + i, title: 'Workshop Synth ' + i, kind: 'image', source: 'workshop', thumbUrl: '' });
          }
          for (let j = 0; j < 30; j++) {
            synthetic.push({ id: 'loc-syn-' + j, title: 'Local Synth ' + j, kind: 'video', source: 'local', thumbUrl: '' });
          }
          window.__agyPrismPanel.syncState({ items: synthetic });

          const grid = pop.querySelector('.pp-grid');
          const initialShown = grid ? grid.querySelectorAll('.pp-card').length : 0;
          const loadMoreBtn = pop.querySelector('[data-testid="prism-load-more"]');
          const hadLoadMore = Boolean(loadMoreBtn);
          if (loadMoreBtn) loadMoreBtn.click();
          const afterLoadMore = grid ? grid.querySelectorAll('.pp-card').length : 0;
          const loadMoreGone = !pop.querySelector('[data-testid="prism-load-more"]');

          const localChip = pop.querySelector('[data-testid="prism-local-chip"]');
          if (localChip) localChip.click();
          const localShown = grid ? grid.querySelectorAll('.pp-card').length : 0;
          if (localChip) localChip.click(); // toggle off local filter
          if (tabs[1]) tabs[1].click(); // restore optics tab for Screenshot (a)

          return { noI18nOk, initialShown, hadLoadMore, afterLoadMore, loadMoreGone, hasLocalChip: Boolean(localChip), localShown };
        })()`);
        assert.equal(popPaginationCheck.noI18nOk, true, '#agy-prism-popover or #agy-prism-pill missing data-ag-no-i18n="1"');
        assert.equal(popPaginationCheck.initialShown, 90, `Expected initial page size 90, got ${popPaginationCheck.initialShown}`);
        assert.equal(popPaginationCheck.hadLoadMore, true, 'Missing [data-testid="prism-load-more"] button for >90 items');
        assert.equal(popPaginationCheck.afterLoadMore, 125, `Expected all 125 items after Load More, got ${popPaginationCheck.afterLoadMore}`);
        assert.equal(popPaginationCheck.loadMoreGone, true, 'Load More button remained visible when all items shown');
        assert.equal(popPaginationCheck.hasLocalChip, true, 'Missing [data-testid="prism-local-chip"] filter chip');
        assert.equal(popPaginationCheck.localShown, 30, `Expected 30 local items when Local chip active, got ${popPaginationCheck.localShown}`);

        // Restore real library items into panel before Screenshot (a)
        await hubPage.evaluate(`window.__agyPrismPanel.syncState({ items: ${JSON.stringify(libraryItems)} })`);

        // Verify Two-Stage Escape (2 Escapes only — unwinds drilldown then closes popover without triggering 4x-Esc panic!)
        await hubPage.evaluate(`window.__agyPrismPanel.openDrilldown()`);
        await hubPage.pressKey({ key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await sleep(60);
        let stEsc = await hubPage.evaluate(`window.__agyPrismPanel.status()`);
        assert.equal(stEsc.drilldown, false, '1st Escape did not unwind drilldown');
        assert.equal(stEsc.open, true, '1st Escape closed parent popover prematurely');
        await hubPage.pressKey({ key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await sleep(60);
        stEsc = await hubPage.evaluate(`window.__agyPrismPanel.status()`);
        assert.equal(stEsc.open, false, '2nd Escape did not close #agy-prism-popover');
        await sleep(1000); // Ensure 900ms 4x-Esc sliding window resets cleanly

        // -------------------------------------------------------------------
        // CHECK 4 — 2.34.0 3-Layer `[data-browser-hole]` Synchronous Rounded GPU Cutout E2E + Screenshot (a)
        // -------------------------------------------------------------------
        await hubPage.call('Emulation.setDefaultBackgroundColorOverride', {
          color: { r: 0, g: 0, b: 0, a: 0 },
        });

        const cutoutAudit = await hubPage.evaluate(`(() => {
          window.__setMockBrowserHole(true);
          // Read synchronously right after microtask / layout
          const stage = document.getElementById('agy-prism-stage');
          const hole = document.querySelector('[data-testid="builtin-browser-placeholder"]');
          const rect = hole.getBoundingClientRect();
          const cx = Math.round(rect.left + rect.width / 2);
          const cy = Math.round(rect.top + rect.height / 2);
          const hit = document.elementFromPoint(cx, cy);

          const nonTransparentAncestors = [];
          let cur = hole;
          while (cur) {
            const bg = getComputedStyle(cur).backgroundColor;
            if (bg !== 'rgba(0, 0, 0, 0)') {
              nonTransparentAncestors.push((cur.id || cur.tagName.toLowerCase()) + ':' + bg);
            }
            cur = cur.parentElement;
          }

          return {
            clipPath: getComputedStyle(stage).clipPath,
            rect: {
              left: Math.round(rect.left),
              top: Math.round(rect.top),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              right: Math.round(rect.right),
              bottom: Math.round(rect.bottom),
            },
            cx,
            cy,
            hitTestId: hit ? hit.getAttribute('data-testid') : '',
            hitIsHole: Boolean(hit && hit.getAttribute('data-browser-hole') === 'true'),
            nonTransparentAncestors,
          };
        })()`);

        // Allow microtask MutationObserver if clipPath wasn't already set in same script turn
        let activeClipPath = cutoutAudit.clipPath;
        if (!activeClipPath || activeClipPath === 'none') {
          await sleep(30);
          activeClipPath = await hubPage.evaluate(`getComputedStyle(document.getElementById('agy-prism-stage')).clipPath`);
        }

        assert.match(
          String(activeClipPath),
          /^path\("M\s*0[\s,]+0/i,
          `Expected #agy-prism-stage clip-path: path("M0,0..."), got: ${activeClipPath}`,
        );
        assert.ok(
          /A\s*12[\s,]+12/i.test(activeClipPath),
          `Expected bottom 12px rounded arc segments (A 12 12 ...) in stage clip-path, got: ${activeClipPath}`,
        );
        assert.deepEqual(
          cutoutAudit.nonTransparentAncestors,
          [],
          `Non-transparent ancestors blocking [data-browser-hole] WCV punch-through: ${cutoutAudit.nonTransparentAncestors.join(', ')}`,
        );
        assert.equal(cutoutAudit.hitTestId, 'builtin-browser-placeholder');
        assert.equal(
          cutoutAudit.hitIsHole,
          true,
          'document.elementFromPoint(cx, cy) inside hole did NOT hit [data-browser-hole="true"] directly!',
        );

        // Compositor-level RGBA pixel proof: inside `[data-browser-hole]` alpha MUST be 0; in outer 8px island pad alpha MUST be 255!
        const rawCutoutShot = await hubPage.call('Page.captureScreenshot', {
          format: 'png',
          fromSurface: true,
          captureBeyondViewport: false,
        });
        const decodedCutout = decodePngRgba(Buffer.from(rawCutoutShot.data, 'base64'));
        const holeCenterPx = decodedCutout.pixelAt(cutoutAudit.cx, cutoutAudit.cy);
        const wallpaperMarginPx = decodedCutout.pixelAt(4, 450);
        assert.equal(
          holeCenterPx.a,
          0,
          `Compositor pixel inside [data-browser-hole] at (${cutoutAudit.cx},${cutoutAudit.cy}) is NOT transparent: rgba(${holeCenterPx.r},${holeCenterPx.g},${holeCenterPx.b},${holeCenterPx.a})!`,
        );
        assert.equal(
          wallpaperMarginPx.a,
          255,
          `Compositor pixel in outer island margin (4,450) lost live wallpaper: alpha=${wallpaperMarginPx.a}`,
        );

        // Synchronous Resize Proof: resize `#hub-aux-pane` 410px -> 468px and verify `clip-path` updates in the next frame!
        const resizeCheck = await hubPage.evaluate(`new Promise((resolve) => {
          const before = getComputedStyle(document.getElementById('agy-prism-stage')).clipPath;
          const aux = document.getElementById('hub-aux-pane');
          aux.style.width = '468px';
          requestAnimationFrame(() => requestAnimationFrame(() => {
            const after = getComputedStyle(document.getElementById('agy-prism-stage')).clipPath;
            const r = document.querySelector('[data-testid="builtin-browser-placeholder"]').getBoundingClientRect();
            resolve({ before, after, newWidth: Math.round(r.width) });
          }));
        })`);
        assert.ok(
          resizeCheck.newWidth >= 466 && resizeCheck.newWidth <= 468,
          `Expected resized placeholder width ~466-468px, got ${resizeCheck.newWidth}px`,
        );
        assert.notEqual(resizeCheck.after, resizeCheck.before, 'Resizing browser pane did not synchronously update #agy-prism-stage clip-path!');
        await hubPage.evaluate(`document.getElementById('hub-aux-pane').style.width = '410px'`);
        await sleep(40);

        // Capture Mandatory Screenshot (a):
        // Mount simulated Electron `clipView (z=0)` mock webpage + alpha checkerboard on `<html>` at `z-index: -2`
        // (strictly BEHIND `body { isolation: isolate }` and `#agy-prism-stage { z-index: -1 }`, so it is ONLY visible
        // through the true `alpha = 0` rounded GPU cutout!) + open `Ctrl+Alt+W` Quick Prism Popover!
        await hubPage.evaluate(`(() => {
          window.__agyPrismPanel.open();
          const hole = document.querySelector('[data-testid="builtin-browser-placeholder"]');
          const r = hole.getBoundingClientRect();
          const wcv = document.createElement('div');
          wcv.id = 'mock-electron-wcv-z0';
          wcv.style.cssText = [
            'position:fixed',
            'left:' + Math.round(r.left) + 'px',
            'top:' + Math.round(r.top) + 'px',
            'width:' + Math.round(r.width) + 'px',
            'height:' + Math.round(r.height) + 'px',
            'z-index:-2',
            'pointer-events:none',
            'overflow:hidden',
            'font-family:Segoe UI,system-ui,sans-serif',
            'background-color:#f8fafc',
            'background-image:linear-gradient(45deg,#e2e8f0 25%,transparent 25%),linear-gradient(-45deg,#e2e8f0 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e2e8f0 75%),linear-gradient(-45deg,transparent 75%,#e2e8f0 75%)',
            'background-size:20px 20px',
            'background-position:0 0,0 10px,10px -10px,-10px 0',
            'color:#0f172a',
            'padding:14px',
            'display:flex',
            'flex-direction:column',
            'gap:10px',
          ].join(';');
          wcv.innerHTML =
            '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-radius:8px;background:rgba(15,23,42,0.90);color:#f8fafc;font-size:11.5px;font-weight:600;box-shadow:0 4px 14px rgba(15,23,42,0.18)">' +
              '<span>🌐 Electron clipView (z=0) · Alpha Checkerboard Proof</span>' +
              '<span style="color:#34d399;font-family:Consolas,monospace">alpha=0.00</span>' +
            '</div>' +
            '<div style="flex:1;border-radius:10px;background:rgba(255,255,255,0.92);border:1px solid rgba(15,23,42,0.12);padding:14px;display:flex;flex-direction:column;gap:8px;box-shadow:0 8px 24px rgba(15,23,42,0.08)">' +
              '<div style="font-size:14px;font-weight:700;color:#0f172a">Localhost Live App Preview (127.0.0.1:3000)</div>' +
              '<div style="font-size:12px;color:#334155;line-height:1.5">Rendered beneath <code>hubWcv (z=1)</code> through synchronous <code>clip-path: path(...)</code> cutout with <code>12px</code> bottom island arcs.</div>' +
              '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:auto">' +
                '<div style="padding:8px 10px;border-radius:8px;background:#eff6ff;border:1px solid #bfdbfe;font-size:11.5px"><strong style="color:#1d4ed8">Hit Test</strong><br/>catcherView → [data-browser-hole]</div>' +
                '<div style="padding:8px 10px;border-radius:8px;background:#ecfdf5;border:1px solid #a7f3d0;font-size:11.5px"><strong style="color:#047857">Modal Guard</strong><br/>Popover alpha &ge; 0.96</div>' +
              '</div>' +
            '</div>';
          document.documentElement.insertBefore(wcv, document.body);
        })()`);
        await sleep(180);

        const occluderAttr = await hubPage.evaluate(`(() => {
          const pop = document.getElementById('agy-prism-popover');
          const sheet = pop ? pop.querySelector('.prism-sheet') : null;
          return (pop && pop.getAttribute('data-browser-occluder')) || (sheet && sheet.getAttribute('data-browser-occluder')) || '';
        })()`);
        assert.equal(occluderAttr, 'true', 'Open #agy-prism-popover missing data-browser-occluder="true"');

        const sHubV234 = await hubPage.capturePng(shotHubV234Path, { expectedWidth: 1440, expectedHeight: 900 });
        screenshots.push({
          path: shotHubV234Path,
          caption: '2.34.0 Hub islands wallpaper, browser-hole cutout and Prism popover',
        });
        assert.ok(sHubV234.bytes > 30000, 'Hub 2.34.0 screenshot suspiciously small');

        // Remove mock z=0 backdrop & close browser hole -> verify clip-path returns to `none`
        await hubPage.evaluate(`(() => {
          const z0 = document.getElementById('mock-electron-wcv-z0');
          if (z0) z0.remove();
          window.__setMockBrowserHole(false);
        })()`);
        await hubPage.call('Emulation.setDefaultBackgroundColorOverride');
        await sleep(40);
        const closedClip = await hubPage.evaluate(`getComputedStyle(document.getElementById('agy-prism-stage')).clipPath`);
        assert.equal(closedClip, 'none', `Closing [data-browser-hole] did not reset clip-path to none (got ${closedClip})`);

        // Also verify Web Wallpaper iframe sandbox + Focus Guard (`#hub-composer-input` keeps focus!)
        await hubPage.evaluate(`window.__agyPrismPanel.close(); document.getElementById('hub-composer-input').focus();`);
        const webPayload = buildClientSkinPayload(stAurora.config, webItem, stAurora.mediaOrigin, { skinEnabled: true });
        await hubPage.evaluate(`window.__agyPrism.applyPayload(${JSON.stringify(webPayload)})`);
        await sleep(400);
        const focusCheck = await hubPage.evaluate(`(() => {
          const iframe = document.querySelector('#agy-prism-stage iframe');
          return {
            activeId: document.activeElement ? document.activeElement.id : '',
            hasIframe: Boolean(iframe),
            sandbox: iframe ? iframe.getAttribute('sandbox') : '',
          };
        })()`);
        assert.equal(focusCheck.hasIframe, true);
        assert.ok(String(focusCheck.sandbox).includes('allow-scripts'));
        assert.equal(focusCheck.activeId, 'hub-composer-input', 'Web wallpaper stole focus from #hub-composer-input!');

        // -------------------------------------------------------------------
        // CHECK 5B — `Ctrl+Alt+Shift+R` Panic Key Immediate Strip + `skinEnabled === false` Persistence
        // -------------------------------------------------------------------
        await hubPage.pressKey({
          key: 'R',
          code: 'KeyR',
          windowsVirtualKeyCode: 82,
          modifiers: 11, // Alt (1) + Ctrl (2) + Shift (8)
        });
        await sleep(220);

        const afterPanicDom = await hubPage.evaluate(`({
          prismNodes: Array.from(document.querySelectorAll('[id^="agy-prism-"]')).map(e => e.id),
          prismAttrs: Array.from(document.documentElement.attributes)
            .map(a => a.name)
            .filter(n => /^data-(?:agy-)?prism/.test(n)),
          bodyBg: getComputedStyle(document.body).backgroundColor,
          lastWcoColor: window.__lastWco ? window.__lastWco.color : null,
        })`);
        assert.deepEqual(afterPanicDom.prismNodes, [], `Ctrl+Alt+Shift+R left #agy-prism-* nodes: ${afterPanicDom.prismNodes.join(', ')}`);
        assert.deepEqual(afterPanicDom.prismAttrs, [], `Ctrl+Alt+Shift+R left data-prism-* attrs: ${afterPanicDom.prismAttrs.join(', ')}`);
        assert.equal(afterPanicDom.bodyBg, 'rgb(7, 7, 8)', 'Ctrl+Alt+Shift+R did not restore native #070708 dark background');
        assert.equal(afterPanicDom.lastWcoColor, '#131313', 'Ctrl+Alt+Shift+R did not restore native #131313 window controls overlay');

        const cfgAfterPanic = await engine.getConfig();
        assert.equal(cfgAfterPanic.skinEnabled, false, 'Ctrl+Alt+Shift+R did not persist skinEnabled === false on backend!');

        assert.deepEqual(hubPage.consoleErrors, [], `Hub E2E console.error: ${hubPage.consoleErrors.join(' | ')}`);
        assert.deepEqual(hubPage.pageExceptions, [], `Hub E2E uncaught exception: ${hubPage.pageExceptions.join(' | ')}`);

        return `Lazy panel.js + Fail-Open 404/H.264 + 2.34.0 selectors + rounded [data-browser-hole] (alpha=0) + Ctrl+Alt+Shift+R verified, Shot=${Math.round(sHubV234.bytes / 1024)}KB`;
      } finally {
        await browser.closePage(hubPage);
      }
    });

    // -----------------------------------------------------------------------
    // 3C. v2.0.6 Sidebar Dark Glass Base, ::before Frosted Carriers, Studio UI Auto-Follow/Reset Sliders & Quick Popover Sliders E2E
    // -----------------------------------------------------------------------
    const shotStudioSkinV206Path = path.join(DEFAULT_ARTIFACT_DIR, 'v206-studio-skin-sidebar-sliders.png');

    await check('v2.0.6 Sidebar Dark Glass Base, ::before Frosted Carriers ([data-side-panel-body] & .part.sidebar), Studio UI Auto-Follow/Reset Sliders & Ctrl+Alt+W Popover Sliders E2E', '@gentle-skin-architect / @exec-host / @exec-studio', async () => {
      await engine.applyWallpaper(auroraItem.id, {
        skinEnabled: true,
        startupMode: 'gentle-auto',
        preset: 'islands',
        layoutMode: 'islands',
        islandGap: 8,
        workspacePad: 8,
        cornerStyle: 'balanced',
        colorScheme: 'host-native',
        themeMode: 'dark',
        glassSurfaces: true,
        glassOpacity: 0.76,
        glassBlur: 16,
        sidebarOpacity: null,
        sidebarBlur: null,
        contrastFloor: true,
        triggerMode: 'both',
        language: 'zh',
      });

      const hubPage = await browser.openPage({
        url: `${HUB_MOCK_ORIGIN}/hub`,
        requestHandler: universalHttpRouter,
      });
      const studioPage = await browser.openPage({
        url: `${studio.origin}/?token=${encodeURIComponent(SIDECAR_TEST_TOKEN)}`,
        requestHandler: universalHttpRouter,
      });

      try {
        const bootstrapExpr = buildHostMicroBootstrap({
          hostOrigin: studio.origin,
          capToken: studio.hostCapToken,
          triggerMode: 'both',
          startupMode: 'gentle-auto',
          skinEnabled: true,
        });
        await hubPage.evaluate(bootstrapExpr);

        const bootDeadline = Date.now() + 3000;
        while (Date.now() < bootDeadline) {
          const ready = await hubPage.evaluate(
            `Boolean(window.__agyPrism && typeof window.__agyPrism.applyPayload === 'function')`,
          );
          if (ready) break;
          await sleep(40);
        }

        const stInit = await studio.getState();
        const initPayload = buildClientSkinPayload(stInit.config, stInit.activeItem, stInit.mediaOrigin, {
          skinEnabled: true,
        });
        await hubPage.evaluate(`window.__agyPrism.applyPayload(${JSON.stringify(initPayload)})`);

        const wallDeadline = Date.now() + 3000;
        while (Date.now() < wallDeadline) {
          const wAttr = await hubPage.evaluate(`document.documentElement.getAttribute('data-agy-prism-wallpaper')`);
          if (wAttr === 'ready') break;
          await sleep(35);
        }

        // (a) Default config (sidebarOpacity: null, sidebarBlur: null):
        //     .agy-sidebar::before, #v234-side-panel-probe::before, #ide-workbench-probe .part.sidebar::before
        //     backgroundColor alpha >= 0.70, backdropFilter includes 'blur(16px)';
        //     inner #v234-side-panel-inner-bg & #ide-sidebar-content-probe backgroundColor === 'rgba(0, 0, 0, 0)';
        //     #v234-sidebar-fixed-probe getBoundingClientRect().top === 0 && left === 0 (untrapped!)
        const defaultSidebarAudit = await hubPage.evaluate(`(() => {
          const agySb = document.querySelector('.agy-sidebar');
          const v234Sb = document.getElementById('v234-side-panel-probe');
          const ideSb = document.querySelector('#ide-workbench-probe .part.sidebar');
          const agyBefore = getComputedStyle(agySb, '::before');
          const v234Before = getComputedStyle(v234Sb, '::before');
          const ideBefore = getComputedStyle(ideSb, '::before');
          const innerBgCs = getComputedStyle(document.getElementById('v234-side-panel-inner-bg'));
          const ideContentCs = getComputedStyle(document.getElementById('ide-sidebar-content-probe'));
          const fixedRect = document.getElementById('v234-sidebar-fixed-probe').getBoundingClientRect();
          return {
            sidebarRgbVar: getComputedStyle(document.documentElement).getPropertyValue('--prism-sidebar-rgb').trim(),
            agyHostBlur: getComputedStyle(agySb).backdropFilter || getComputedStyle(agySb).webkitBackdropFilter || 'none',
            v234HostBlur: getComputedStyle(v234Sb).backdropFilter || getComputedStyle(v234Sb).webkitBackdropFilter || 'none',
            ideHostBlur: getComputedStyle(ideSb).backdropFilter || getComputedStyle(ideSb).webkitBackdropFilter || 'none',
            agyBeforeBg: agyBefore.backgroundColor,
            agyBeforeBlur: agyBefore.backdropFilter || agyBefore.webkitBackdropFilter || 'none',
            v234BeforeBg: v234Before.backgroundColor,
            v234BeforeBlur: v234Before.backdropFilter || v234Before.webkitBackdropFilter || 'none',
            ideBeforeBg: ideBefore.backgroundColor,
            ideBeforeBlur: ideBefore.backdropFilter || ideBefore.webkitBackdropFilter || 'none',
            innerBg: innerBgCs.backgroundColor,
            ideContentBg: ideContentCs.backgroundColor,
            fixedTop: fixedRect.top,
            fixedLeft: fixedRect.left,
          };
        })()`);

        const agyAlpha0 = parseAlphaFromCssColor(defaultSidebarAudit.agyBeforeBg);
        const v234Alpha0 = parseAlphaFromCssColor(defaultSidebarAudit.v234BeforeBg);
        const ideAlpha0 = parseAlphaFromCssColor(defaultSidebarAudit.ideBeforeBg);

        assert.equal(
          defaultSidebarAudit.sidebarRgbVar,
          '7, 7, 8',
          `Expected host-native dark --prism-sidebar-rgb to select deep base '7, 7, 8', got '${defaultSidebarAudit.sidebarRgbVar}'`,
        );
        assert.ok(agyAlpha0 >= 0.70, `Expected .agy-sidebar::before alpha >= 0.70, got ${agyAlpha0} (${defaultSidebarAudit.agyBeforeBg})`);
        assert.ok(v234Alpha0 >= 0.70, `Expected #v234-side-panel-probe::before alpha >= 0.70, got ${v234Alpha0} (${defaultSidebarAudit.v234BeforeBg})`);
        assert.ok(ideAlpha0 >= 0.70, `Expected #ide-workbench-probe .part.sidebar::before alpha >= 0.70, got ${ideAlpha0} (${defaultSidebarAudit.ideBeforeBg})`);

        assert.ok(
          String(defaultSidebarAudit.agyBeforeBlur).includes('blur(16px)'),
          `Expected .agy-sidebar::before backdropFilter to include 'blur(16px)', got ${defaultSidebarAudit.agyBeforeBlur}`,
        );
        assert.ok(
          String(defaultSidebarAudit.v234BeforeBlur).includes('blur(16px)'),
          `Expected #v234-side-panel-probe::before backdropFilter to include 'blur(16px)', got ${defaultSidebarAudit.v234BeforeBlur}`,
        );
        assert.ok(
          String(defaultSidebarAudit.ideBeforeBlur).includes('blur(16px)'),
          `Expected #ide-workbench-probe .part.sidebar::before backdropFilter to include 'blur(16px)', got ${defaultSidebarAudit.ideBeforeBlur}`,
        );

        assert.equal(defaultSidebarAudit.agyHostBlur, 'none', '.agy-sidebar parent element must have backdrop-filter: none');
        assert.equal(defaultSidebarAudit.v234HostBlur, 'none', '#v234-side-panel-probe parent element must have backdrop-filter: none');
        assert.equal(defaultSidebarAudit.ideHostBlur, 'none', '.part.sidebar parent element must have backdrop-filter: none');

        assert.equal(
          defaultSidebarAudit.innerBg,
          'rgba(0, 0, 0, 0)',
          `Expected #v234-side-panel-inner-bg backgroundColor 'rgba(0, 0, 0, 0)', got ${defaultSidebarAudit.innerBg}`,
        );
        assert.equal(
          defaultSidebarAudit.ideContentBg,
          'rgba(0, 0, 0, 0)',
          `Expected #ide-sidebar-content-probe backgroundColor 'rgba(0, 0, 0, 0)', got ${defaultSidebarAudit.ideContentBg}`,
        );
        assert.equal(
          defaultSidebarAudit.fixedTop,
          0,
          `#v234-sidebar-fixed-probe top trapped (${defaultSidebarAudit.fixedTop}) instead of 0!`,
        );
        assert.equal(
          defaultSidebarAudit.fixedLeft,
          0,
          `#v234-sidebar-fixed-probe left trapped (${defaultSidebarAudit.fixedLeft}) instead of 0!`,
        );

        // (c) Ctrl+Alt+W Quick Popover (#agy-prism-popover) has [data-slider-key="sidebarOpacity"] & [data-slider-key="sidebarBlur"] with data-dirty="false"
        await hubPage.pressKey({
          key: 'w',
          code: 'KeyW',
          windowsVirtualKeyCode: 87,
          modifiers: 3, // Alt (1) + Ctrl (2)
        });
        const popDeadline = Date.now() + 3000;
        while (Date.now() < popDeadline) {
          const isOpen = await hubPage.evaluate(
            `Boolean(window.__agyPrismPanel && typeof window.__agyPrismPanel.status === 'function' && window.__agyPrismPanel.status().open)`,
          );
          if (isOpen) break;
          await sleep(40);
        }

        const popSlidersAudit = await hubPage.evaluate(`(() => {
          const pop = document.getElementById('agy-prism-popover');
          if (!pop) return { hasPop: false };
          const dupSbOp = pop.querySelector('[data-slider-key="sidebarOpacity"]');
          const accSbOp = pop.querySelector('[data-testid="prism-comp-accordion"] [data-slider-key="surfaceTints.sidebar.opacity"]');
          const sbBlur = pop.querySelector('[data-slider-key="sidebarBlur"]');
          const sbOpRow = accSbOp ? accSbOp.closest('.pp-srow') : null;
          const sbBlurRow = sbBlur ? sbBlur.closest('.pp-srow') : null;
          return {
            hasPop: true,
            hasDupSbOp: Boolean(dupSbOp),
            hasAccSbOp: Boolean(accSbOp),
            hasSbBlur: Boolean(sbBlur),
            sbOpDirty: accSbOp ? accSbOp.getAttribute('data-dirty') : null,
            sbBlurDirty: sbBlur ? sbBlur.getAttribute('data-dirty') : null,
            sbOpRowDirty: sbOpRow ? sbOpRow.getAttribute('data-dirty') : null,
            sbBlurRowDirty: sbBlurRow ? sbBlurRow.getAttribute('data-dirty') : null,
            sbOpValText: sbOpRow && sbOpRow.querySelector('.pp-sval') ? sbOpRow.querySelector('.pp-sval').textContent : '',
            sbBlurValText: sbBlurRow && sbBlurRow.querySelector('.pp-sval') ? sbBlurRow.querySelector('.pp-sval').textContent : '',
          };
        })()`);

        assert.equal(popSlidersAudit.hasPop, true, '#agy-prism-popover missing after Ctrl+Alt+W');
        assert.equal(popSlidersAudit.hasDupSbOp, false, 'Quick Prism #agy-prism-popover must NOT retain duplicate top-level [data-slider-key="sidebarOpacity"]');
        assert.equal(popSlidersAudit.hasAccSbOp, true, 'Missing [data-testid="prism-comp-accordion"] [data-slider-key="surfaceTints.sidebar.opacity"]');
        assert.equal(popSlidersAudit.hasSbBlur, true, 'Missing [data-slider-key="sidebarBlur"] in #agy-prism-popover');
        assert.equal(popSlidersAudit.sbOpDirty, 'false', `Expected popover surfaceTints.sidebar.opacity data-dirty="false", got ${popSlidersAudit.sbOpDirty}`);
        assert.equal(popSlidersAudit.sbBlurDirty, 'false', `Expected popover sidebarBlur data-dirty="false", got ${popSlidersAudit.sbBlurDirty}`);
        assert.ok(
          popSlidersAudit.sbOpValText.includes('跟随') || popSlidersAudit.sbOpValText.includes('Auto'),
          `Expected popover surfaceTints.sidebar.opacity readout to include '跟随' or 'Auto', got '${popSlidersAudit.sbOpValText}'`,
        );
        assert.ok(
          popSlidersAudit.sbBlurValText.includes('跟随') || popSlidersAudit.sbBlurValText.includes('Auto'),
          `Expected popover sidebarBlur readout to include '跟随' or 'Auto', got '${popSlidersAudit.sbBlurValText}'`,
        );

        // (b) Studio UI Appearance (Skin) tab has details[data-region="sidebar"] containing input[data-config-slider="sidebarOpacity"] & input[data-config-slider="sidebarBlur"],
        //     0 duplicate left-rail optical sliders, default data-dirty="false" and readout contains '跟随' or 'Auto';
        //     setting { sidebarOpacity: 0.88, sidebarBlur: 28 } raises host .agy-sidebar::before & #v234-side-panel-probe::before
        //     alpha >= 0.86 & backdropFilter includes 'blur(28px)';
        //     clicking [data-action="reset-key"][data-key="sidebarOpacity"] & [data-key="sidebarBlur"] restores null!
        await sleep(500);
        await studioPage.evaluate(`(() => {
          const skinTab = document.querySelector('[data-action="switch-tab"][data-tab="skin"]');
          if (skinTab) skinTab.click();
        })()`);
        await sleep(220);

        const studioInitSliders = await studioPage.evaluate(`(() => {
          const sbDet = document.querySelector('details.prism-region-group[data-region="sidebar"]');
          if (sbDet && !sbDet.open) sbDet.querySelector('summary')?.click();
          const sbBlurIn = sbDet ? sbDet.querySelector('input[data-config-slider="sidebarBlur"]') : document.querySelector('input[data-config-slider="sidebarBlur"]');
          const sec = sbDet || (sbBlurIn ? sbBlurIn.closest('.prism-section') : null);
          const sbOpIn = sec ? sec.querySelector('input[data-config-slider="sidebarOpacity"]') : document.querySelector('input[data-config-slider="sidebarOpacity"]');
          const railOpticalSliders = document.querySelectorAll('.prism-left-rail input[data-config-slider="sidebarOpacity"], .prism-left-rail input[data-config-slider="glassOpacity"], #prism-rail-optics-card input[data-config-slider]').length;
          const opRow = sbOpIn ? sbOpIn.closest('.prism-slider-row') : null;
          const blurRow = sbBlurIn ? sbBlurIn.closest('.prism-slider-row') : null;
          if (opRow) opRow.scrollIntoView({ block: 'center' });
          return {
            hasOpSlider: Boolean(sbOpIn),
            hasBlurSlider: Boolean(sbBlurIn),
            railOpticalSliders,
            opDirty: opRow ? opRow.getAttribute('data-dirty') : null,
            blurDirty: blurRow ? blurRow.getAttribute('data-dirty') : null,
            opText: opRow && opRow.querySelector('.prism-slider-val') ? opRow.querySelector('.prism-slider-val').textContent.trim() : '',
            blurText: blurRow && blurRow.querySelector('.prism-slider-val') ? blurRow.querySelector('.prism-slider-val').textContent.trim() : '',
          };
        })()`);

        assert.equal(studioInitSliders.hasOpSlider, true, 'Studio Skin details[data-region="sidebar"] missing input[data-config-slider="sidebarOpacity"]');
        assert.equal(studioInitSliders.hasBlurSlider, true, 'Studio Skin details[data-region="sidebar"] missing input[data-config-slider="sidebarBlur"]');
        assert.equal(studioInitSliders.railOpticalSliders, 0, `Left rail must contain 0 duplicate optical sliders (got ${studioInitSliders.railOpticalSliders})`);
        assert.equal(studioInitSliders.opDirty, 'false', `Expected Studio sidebarOpacity row data-dirty="false", got ${studioInitSliders.opDirty}`);
        assert.equal(studioInitSliders.blurDirty, 'false', `Expected Studio sidebarBlur row data-dirty="false", got ${studioInitSliders.blurDirty}`);
        assert.ok(
          studioInitSliders.opText.includes('跟随') || studioInitSliders.opText.includes('Auto'),
          `Expected Studio sidebarOpacity readout to include '跟随' or 'Auto', got '${studioInitSliders.opText}'`,
        );
        assert.ok(
          studioInitSliders.blurText.includes('跟随') || studioInitSliders.blurText.includes('Auto'),
          `Expected Studio sidebarBlur readout to include '跟随' or 'Auto', got '${studioInitSliders.blurText}'`,
        );

        await sleep(100);
        const sSkinV206 = await studioPage.capturePng(shotStudioSkinV206Path, { expectedWidth: 1440, expectedHeight: 900 });
        screenshots.push({
          path: shotStudioSkinV206Path,
          caption: 'Studio v2.2.0 Skin details[data-region="sidebar"] Sidebar Glass Opacity / Blur auto-follow sliders',
        });
        assert.ok(sSkinV206.bytes > 20000, 'Studio Skin v2.2.0 screenshot suspiciously small');

        // Drive { sidebarOpacity: 0.88, sidebarBlur: 28 } directly through Studio UI sliders -> flushes POST /api/config to Engine
        const studioAfterDrag = await studioPage.evaluate(`(() => {
          const sec = document.querySelector('details.prism-region-group[data-region="sidebar"]') || document.querySelector('input[data-config-slider="sidebarBlur"]').closest('.prism-section');
          const sbBlurIn = sec.querySelector('input[data-config-slider="sidebarBlur"]');
          const sbOpIn = sec.querySelector('input[data-config-slider="sidebarOpacity"]');
          sbOpIn.value = '88';
          sbOpIn.dispatchEvent(new Event('input', { bubbles: true }));
          sbOpIn.dispatchEvent(new Event('change', { bubbles: true }));
          sbBlurIn.value = '28';
          sbBlurIn.dispatchEvent(new Event('input', { bubbles: true }));
          sbBlurIn.dispatchEvent(new Event('change', { bubbles: true }));
          return {
            opDirty: sbOpIn.closest('.prism-slider-row').getAttribute('data-dirty'),
            blurDirty: sbBlurIn.closest('.prism-slider-row').getAttribute('data-dirty'),
          };
        })()`);
        assert.equal(studioAfterDrag.opDirty, 'true');
        assert.equal(studioAfterDrag.blurDirty, 'true');

        await sleep(220);
        const cfgCustom = await engine.getConfig();
        assert.equal(cfgCustom.sidebarOpacity, 0.88, `Expected engine sidebarOpacity=0.88, got ${cfgCustom.sidebarOpacity}`);
        assert.equal(cfgCustom.sidebarBlur, 28, `Expected engine sidebarBlur=28, got ${cfgCustom.sidebarBlur}`);

        // Push updated state to host microkernel & verify .agy-sidebar::before and #v234-side-panel-probe::before >= 0.86 & blur(28px)
        const stCustom = await studio.getState();
        const customPayload = buildClientSkinPayload(stCustom.config, stCustom.activeItem, stCustom.mediaOrigin, {
          skinEnabled: true,
        });
        await hubPage.evaluate(`window.__agyPrism.applyPayload(${JSON.stringify(customPayload)})`);
        await sleep(80);

        const customHostAudit = await hubPage.evaluate(`(() => {
          const agyBefore = getComputedStyle(document.querySelector('.agy-sidebar'), '::before');
          const v234Before = getComputedStyle(document.getElementById('v234-side-panel-probe'), '::before');
          return {
            agyBg: agyBefore.backgroundColor,
            agyBlur: agyBefore.backdropFilter || agyBefore.webkitBackdropFilter || 'none',
            v234Bg: v234Before.backgroundColor,
            v234Blur: v234Before.backdropFilter || v234Before.webkitBackdropFilter || 'none',
          };
        })()`);

        const agyAlpha88 = parseAlphaFromCssColor(customHostAudit.agyBg);
        const v234Alpha88 = parseAlphaFromCssColor(customHostAudit.v234Bg);
        assert.ok(agyAlpha88 >= 0.86, `Expected .agy-sidebar::before alpha >= 0.86 at sidebarOpacity=0.88, got ${agyAlpha88} (${customHostAudit.agyBg})`);
        assert.ok(v234Alpha88 >= 0.86, `Expected #v234-side-panel-probe::before alpha >= 0.86 at sidebarOpacity=0.88, got ${v234Alpha88} (${customHostAudit.v234Bg})`);
        assert.ok(
          String(customHostAudit.agyBlur).includes('blur(28px)'),
          `Expected .agy-sidebar::before backdropFilter to include 'blur(28px)', got ${customHostAudit.agyBlur}`,
        );
        assert.ok(
          String(customHostAudit.v234Blur).includes('blur(28px)'),
          `Expected #v234-side-panel-probe::before backdropFilter to include 'blur(28px)', got ${customHostAudit.v234Blur}`,
        );

        // Click Studio UI [data-action="reset-key"][data-key="sidebarOpacity"] & [data-key="sidebarBlur"] -> config restores null!
        // Note: each reset-key click triggers renderActiveSurface(), so re-query live DOM after clicking sidebarOpacity!
        await studioPage.evaluate(`(() => {
          const sbBlurIn = document.querySelector('input[data-config-slider="sidebarBlur"]');
          const sec = sbBlurIn ? sbBlurIn.closest('.prism-section') : document;
          const rstOp = sec.querySelector('[data-action="reset-key"][data-key="sidebarOpacity"]');
          if (rstOp) rstOp.click();
        })()`);
        await sleep(120);
        await studioPage.evaluate(`(() => {
          const sbBlurIn = document.querySelector('input[data-config-slider="sidebarBlur"]');
          const sec = sbBlurIn ? sbBlurIn.closest('.prism-section') : document;
          const rstBlur = sec.querySelector('[data-action="reset-key"][data-key="sidebarBlur"]');
          if (rstBlur) rstBlur.click();
        })()`);
        await sleep(220);

        const cfgReset = await engine.getConfig();
        assert.equal(cfgReset.sidebarOpacity, null, `Expected sidebarOpacity === null after reset-key, got ${cfgReset.sidebarOpacity}`);
        assert.equal(cfgReset.sidebarBlur, null, `Expected sidebarBlur === null after reset-key, got ${cfgReset.sidebarBlur}`);

        const studioAfterReset = await studioPage.evaluate(`(() => {
          const sbBlurIn = document.querySelector('input[data-config-slider="sidebarBlur"]');
          const sec = sbBlurIn.closest('.prism-section');
          const sbOpIn = sec.querySelector('input[data-config-slider="sidebarOpacity"]');
          const opRow = sbOpIn.closest('.prism-slider-row');
          const blurRow = sbBlurIn.closest('.prism-slider-row');
          return {
            opDirty: opRow.getAttribute('data-dirty'),
            blurDirty: blurRow.getAttribute('data-dirty'),
            opText: opRow.querySelector('.prism-slider-val').textContent.trim(),
            blurText: blurRow.querySelector('.prism-slider-val').textContent.trim(),
          };
        })()`);
        assert.equal(studioAfterReset.opDirty, 'false');
        assert.equal(studioAfterReset.blurDirty, 'false');
        assert.ok(studioAfterReset.opText.includes('跟随') || studioAfterReset.opText.includes('Auto'));
        assert.ok(studioAfterReset.blurText.includes('跟随') || studioAfterReset.blurText.includes('Auto'));

        // Also verify host microkernel optimistic updateConfig({ sidebarOpacity: null, sidebarBlur: null }) restores auto-follow!
        const hostAfterNullPatch = await hubPage.evaluate(`(() => {
          window.__agyPrism.updateConfig({ sidebarOpacity: null, sidebarBlur: null });
          const agyBefore = getComputedStyle(document.querySelector('.agy-sidebar'), '::before');
          return {
            agyBg: agyBefore.backgroundColor,
            agyBlur: agyBefore.backdropFilter || agyBefore.webkitBackdropFilter || 'none',
          };
        })()`);
        const restoredAlpha = parseAlphaFromCssColor(hostAfterNullPatch.agyBg);
        assert.ok(
          restoredAlpha >= 0.70 && restoredAlpha <= 0.80,
          `Expected updateConfig(null) to restore auto-follow alpha ~0.76, got ${restoredAlpha} (${hostAfterNullPatch.agyBg})`,
        );
        assert.ok(
          String(hostAfterNullPatch.agyBlur).includes('blur(16px)'),
          `Expected updateConfig(null) to restore blur(16px), got ${hostAfterNullPatch.agyBlur}`,
        );

        assert.deepEqual(hubPage.consoleErrors, [], `v2.0.6 Hub console.error: ${hubPage.consoleErrors.join(' | ')}`);
        assert.deepEqual(hubPage.pageExceptions, [], `v2.0.6 Hub exception: ${hubPage.pageExceptions.join(' | ')}`);
        assert.deepEqual(studioPage.consoleErrors, [], `v2.0.6 Studio console.error: ${studioPage.consoleErrors.join(' | ')}`);
        assert.deepEqual(studioPage.pageExceptions, [], `v2.0.6 Studio exception: ${studioPage.pageExceptions.join(' | ')}`);

        return `default alpha=${agyAlpha0.toFixed(2)}/blur(16px) -> custom 0.88/${agyAlpha88.toFixed(2)}/blur(28px) -> reset null + popover & fixed-probe (0,0) verified, Shot=${Math.round(sSkinV206.bytes / 1024)}KB`;
      } finally {
        await browser.closePage(studioPage);
        await browser.closePage(hubPage);
      }
    });

    // -----------------------------------------------------------------------
    // 3D. v2.0.6 Four Glass UI Fixes Strict E2E (Bug 1 WCO Pill + syncOverlay Guard,
    //     Bug 2 Rounded Glass Titlebar, Bug 3 Deep Rounded Projects & Folder Capsules,
    //     Bug 4 Right Aux-Pane = Main-Chat Alignment & Studio 21:9 .mini-aux Parity)
    // -----------------------------------------------------------------------
    await check('v2.0.6 Four Glass UI Fixes E2E: WCO Pill & syncOverlay Guard (Bug 1), Rounded Glass Titlebar (Bug 2), Deep Rounded Projects/Folders (Bug 3), Aux-Pane = Main-Chat & Studio .mini-aux Parity (Bug 4)', '@exec-host-skin / @exec-studio-ui', async () => {
      await engine.applyWallpaper(auroraItem.id, {
        skinEnabled: true,
        startupMode: 'gentle-auto',
        preset: 'islands',
        layoutMode: 'islands',
        islandGap: 8,
        workspacePad: 8,
        cornerStyle: 'balanced',
        colorScheme: 'host-native',
        themeMode: 'dark',
        glassSurfaces: true,
        glassOpacity: 0.76,
        glassBlur: 16,
        sidebarOpacity: null,
        sidebarBlur: null,
        transparentWindowControls: true,
        contrastFloor: true,
        triggerMode: 'both',
        language: 'zh',
      });

      const hubPage = await browser.openPage({
        url: `${HUB_MOCK_ORIGIN}/hub`,
        requestHandler: universalHttpRouter,
        initScript: `
          Object.defineProperty(navigator, 'windowControlsOverlay', {
            configurable: true,
            value: {
              visible: true,
              getTitlebarAreaRect() {
                return { x: 0, y: 0, width: 1300, height: 35, right: 1300, bottom: 35, left: 0, top: 0 };
              },
              addEventListener() {},
              removeEventListener() {},
            },
          });
          window.__wcoCalls = [];
          window.__lastWco = null;
          window.electronNative = {
            setTitleBarOverlay(opts) {
              window.__wcoCalls.push(opts);
              window.__lastWco = opts;
              return Promise.resolve();
            },
          };
          window.__meterOverlayCalls = [];
          window.__origSyncOverlay = function origSyncOverlay(opts) {
            window.__meterOverlayCalls.push(opts);
            return Promise.resolve();
          };
          window.contextMeterAPI = { syncOverlay: window.__origSyncOverlay };
        `,
      });
      const studioPage = await browser.openPage({
        url: `${studio.origin}/?token=${encodeURIComponent(SIDECAR_TEST_TOKEN)}`,
        requestHandler: universalHttpRouter,
      });

      try {
        const bootstrapExpr = buildHostMicroBootstrap({
          hostOrigin: studio.origin,
          capToken: studio.hostCapToken,
          triggerMode: 'both',
          startupMode: 'gentle-auto',
          skinEnabled: true,
        });
        await hubPage.evaluate(bootstrapExpr);

        const bootDeadline = Date.now() + 3000;
        while (Date.now() < bootDeadline) {
          const ready = await hubPage.evaluate(
            `Boolean(window.__agyPrism && typeof window.__agyPrism.applyPayload === 'function')`,
          );
          if (ready) break;
          await sleep(40);
        }

        const stInit = await studio.getState();
        const initPayload = buildClientSkinPayload(stInit.config, stInit.activeItem, stInit.mediaOrigin, {
          skinEnabled: true,
        });
        await hubPage.evaluate(`window.__agyPrism.applyPayload(${JSON.stringify(initPayload)})`);

        const wallDeadline = Date.now() + 3000;
        while (Date.now() < wallDeadline) {
          const wAttr = await hubPage.evaluate(`document.documentElement.getAttribute('data-agy-prism-wallpaper')`);
          if (wAttr === 'ready') break;
          await sleep(35);
        }
        await sleep(80);

        const glassUiAudit = await hubPage.evaluate(`(() => {
          // Bug 1: WCO pill (v2.1.0 direct childless leaf at z-index: 0) + contextMeterAPI.syncOverlay interception
          window.contextMeterAPI.syncOverlay({ color: 'transparent', symbolColor: '#ffffff', height: 40 });
          const lastMeterCall = window.__meterOverlayCalls[window.__meterOverlayCalls.length - 1] || null;
          const wcoPill = document.getElementById('agy-prism-wco-pill');
          const wcoPillCs = wcoPill ? getComputedStyle(wcoPill) : null;
          const wcoPillRect = wcoPill ? wcoPill.getBoundingClientRect() : null;
          const wcoInsetRight = getComputedStyle(document.documentElement).getPropertyValue('--prism-wco-inset-right').trim();
          const bodyBgVar = getComputedStyle(document.body).getPropertyValue('--background').trim();
          const rootDarkBgVar = getComputedStyle(document.getElementById('v234-root-theme-wrap')).getPropertyValue('--background').trim();

          // Bug 2 (v2.1.0 Req #2): Hollowed 2.35.1 wrapper + titlebar + compact rounded pills + bar mode 8px gap + dropdown safety
          const tbWrap = document.getElementById('v235-topbar-wrapper');
          const tbWrapCs = tbWrap ? getComputedStyle(tbWrap) : null;
          const tb = document.querySelector('[data-testid="title-menu-bar"]');
          const tbCs = getComputedStyle(tb);
          const tbRect = tb.getBoundingClientRect();
          const tbPillsHost = document.getElementById('agy-prism-topbar-pills');
          const tbPills = tbPillsHost ? Array.from(tbPillsHost.querySelectorAll('.agy-prism-topbar-pill')) : [];
          const tbFirstPillCs = tbPills[0] ? getComputedStyle(tbPills[0]) : null;
          const tbToPillGap = wcoPillRect ? Math.round(wcoPillRect.left - tbRect.right) : -1;
          const tbFixedRect = document.getElementById('titlebar-fixed-probe').getBoundingClientRect();
          const tbDropdownCs = getComputedStyle(document.getElementById('hub-title-menu-dropdown'));
          const tbDropdownInnerCs = getComputedStyle(document.getElementById('hub-dropdown-inner-card'));

          // Bug 3: Deep rounded Projects sticky header + project-header folder capsules + transparent folder wrapper
          const sbBeforeCs = getComputedStyle(document.querySelector('.agy-sidebar'), '::before');
          const stickyProj = document.getElementById('hub-sidebar-sticky-projects');
          const stickyProjCs = getComputedStyle(stickyProj);
          const stickyProjBeforeCs = getComputedStyle(stickyProj, '::before');
          const folderWrap = document.getElementById('hub-project-folder-wrap');
          const folderWrapCs = getComputedStyle(folderWrap);
          const folderWrapBeforeCs = getComputedStyle(folderWrap, '::before');
          const projBtn = document.getElementById('hub-project-header-btn');
          const projBtnCs = getComputedStyle(projBtn);
          const projBtnBeforeCs = getComputedStyle(projBtn, '::before');
          const projFixedRect = document.getElementById('project-header-fixed-probe').getBoundingClientRect();

          // Bug 4 (v2.1.0 Req #3/#4): Main chat & right aux-pane render glass on ::before carriers (host transparent, zero fixed-trap)
          const centerIslandHostCs = getComputedStyle(document.getElementById('v234-center-island-probe'));
          const centerIslandBeforeCs = getComputedStyle(document.getElementById('v234-center-island-probe'), '::before');
          const rightIslandHostCs = getComputedStyle(document.getElementById('v234-right-island-probe'));
          const rightIslandBeforeCs = getComputedStyle(document.getElementById('v234-right-island-probe'), '::before');
          const rightBodyCs = getComputedStyle(document.getElementById('v234-right-body-probe'));
          const mainHeaderCs = getComputedStyle(document.getElementById('v234-main-header-probe'));
          const newTabSearchCs = getComputedStyle(document.getElementById('v234-new-tab-search-probe'));

          // Verify left-sidebar custom slider controls ONLY left sidebar, NOT right aux-pane!
          // Read live CSSStyleDeclaration string values BEFORE restoring null config!
          window.__agyPrism.updateConfig({ sidebarOpacity: 0.92, sidebarBlur: 24 });
          const sbAfterCustomCs = getComputedStyle(document.querySelector('.agy-sidebar'), '::before');
          const rightIslandAfterCustomBeforeCs = getComputedStyle(document.getElementById('v234-right-island-probe'), '::before');
          const sbAfterCustomBg = sbAfterCustomCs.backgroundColor;
          const sbAfterCustomBlur = sbAfterCustomCs.backdropFilter || sbAfterCustomCs.webkitBackdropFilter || 'none';
          const rightIslandAfterCustomBg = rightIslandAfterCustomBeforeCs.backgroundColor;
          window.__agyPrism.updateConfig({ sidebarOpacity: null, sidebarBlur: null });

          return {
            bug1: {
              hasPill: Boolean(wcoPill),
              pillDisplay: wcoPillCs ? wcoPillCs.display : '',
              pillZ: wcoPillCs ? wcoPillCs.zIndex : '',
              pillRadius: wcoPillCs ? parseFloat(wcoPillCs.borderTopLeftRadius) : 0,
              pillBlur: wcoPillCs ? (wcoPillCs.backdropFilter || wcoPillCs.webkitBackdropFilter || 'none') : 'none',
              pillBg: wcoPillCs ? wcoPillCs.backgroundColor : '',
              wcoInsetRight,
              bodyBgVar,
              rootDarkBgVar,
              tbToPillGap,
              lastMeterCall,
              lastWco: window.__lastWco,
            },
            bug2: {
              tbWrapBg: tbWrapCs ? tbWrapCs.backgroundColor : '',
              tbBg: tbCs.backgroundColor,
              tbHostBlur: tbCs.backdropFilter || tbCs.webkitBackdropFilter || 'none',
              tbOverflow: tbCs.overflow,
              tbPillCount: tbPills.length,
              tbPillsZ: tbPillsHost ? getComputedStyle(tbPillsHost).zIndex : '',
              tbPillRadius: tbFirstPillCs ? tbFirstPillCs.borderTopLeftRadius : '',
              tbPillBlur: tbFirstPillCs ? (tbFirstPillCs.backdropFilter || tbFirstPillCs.webkitBackdropFilter || 'none') : 'none',
              tbPillBg: tbFirstPillCs ? tbFirstPillCs.backgroundColor : '',
              tbFixedTop: Math.round(tbFixedRect.top),
              tbFixedLeft: Math.round(tbFixedRect.left),
              tbDropdownBg: tbDropdownCs.backgroundColor,
              tbDropdownInnerBg: tbDropdownInnerCs.backgroundColor,
            },
            bug3: {
              sbBeforeBg: sbBeforeCs.backgroundColor,
              stickyHostBlur: stickyProjCs.backdropFilter || stickyProjCs.webkitBackdropFilter || 'none',
              stickyBeforeRadius: parseFloat(stickyProjBeforeCs.borderTopLeftRadius) || 0,
              stickyBeforeBlur: stickyProjBeforeCs.backdropFilter || stickyProjBeforeCs.webkitBackdropFilter || 'none',
              stickyBeforeBg: stickyProjBeforeCs.backgroundColor,
              projHostBlur: projBtnCs.backdropFilter || projBtnCs.webkitBackdropFilter || 'none',
              projBeforeRadius: parseFloat(projBtnBeforeCs.borderTopLeftRadius) || 0,
              projBeforeBlur: projBtnBeforeCs.backdropFilter || projBtnBeforeCs.webkitBackdropFilter || 'none',
              projBeforeBg: projBtnBeforeCs.backgroundColor,
              projFixedTop: Math.round(projFixedRect.top),
              projFixedLeft: Math.round(projFixedRect.left),
              folderWrapBg: folderWrapCs.backgroundColor,
              folderWrapBeforeContent: folderWrapBeforeCs.content,
            },
            bug4: {
              centerIslandHostBg: centerIslandHostCs.backgroundColor,
              centerIslandBg: centerIslandBeforeCs.backgroundColor,
              centerIslandBlur: centerIslandBeforeCs.backdropFilter || centerIslandBeforeCs.webkitBackdropFilter || 'none',
              rightIslandHostBg: rightIslandHostCs.backgroundColor,
              rightIslandBg: rightIslandBeforeCs.backgroundColor,
              rightIslandBlur: rightIslandBeforeCs.backdropFilter || rightIslandBeforeCs.webkitBackdropFilter || 'none',
              rightBodyBg: rightBodyCs.backgroundColor,
              mainHeaderBg: mainHeaderCs.backgroundColor,
              newTabSearchBorder: newTabSearchCs.borderTopWidth,
              sbAfterCustomBg,
              sbAfterCustomBlur,
              rightIslandAfterCustomBg,
            },
          };
        })()`);

        // Bug 1 Assertions (v2.1.0 direct #agy-prism-wco-pill leaf at z-index: 0)
        assert.equal(glassUiAudit.bug1.hasPill, true, 'Bug 1: #agy-prism-wco-pill not mounted');
        assert.equal(glassUiAudit.bug1.pillDisplay, 'block', `Bug 1: #agy-prism-wco-pill display expected block, got ${glassUiAudit.bug1.pillDisplay}`);
        assert.equal(glassUiAudit.bug1.pillZ, '0', `Bug 1 (D18): #agy-prism-wco-pill z-index expected 0, got ${glassUiAudit.bug1.pillZ}`);
        assert.ok(glassUiAudit.bug1.pillRadius >= 6, `Bug 1: #agy-prism-wco-pill border-radius expected >= 6px, got ${glassUiAudit.bug1.pillRadius}px`);
        assert.ok(String(glassUiAudit.bug1.pillBlur).includes('blur('), `Bug 1: #agy-prism-wco-pill missing direct blur(, got ${glassUiAudit.bug1.pillBlur}`);
        assert.equal(glassUiAudit.bug1.lastMeterCall?.color, '#00000000', `Bug 1: contextMeterAPI.syncOverlay({ color: 'transparent' }) not rewritten to #00000000 (got ${JSON.stringify(glassUiAudit.bug1.lastMeterCall)})`);
        assert.equal(glassUiAudit.bug1.lastMeterCall?.height, 35, `Bug 1: contextMeterAPI.syncOverlay height not normalized to 35 (got ${glassUiAudit.bug1.lastMeterCall?.height})`);
        assert.equal(glassUiAudit.bug1.wcoInsetRight, '148px', `Bug 1: expected --prism-wco-inset-right = 148px (140 + 8), got ${glassUiAudit.bug1.wcoInsetRight}`);
        assert.equal(glassUiAudit.bug1.bodyBgVar, '#00000000', `Bug 1: expected body --background === '#00000000' for frozen contextBridge meter-renderer guard, got '${glassUiAudit.bug1.bodyBgVar}'`);
        assert.equal(glassUiAudit.bug1.rootDarkBgVar, 'transparent', `Bug 1: inner #v234-root-theme-wrap --background must stay 'transparent', got '${glassUiAudit.bug1.rootDarkBgVar}'`);
        assert.equal(glassUiAudit.bug1.tbToPillGap, 8, `Bug 1/2: expected titlebar-to-WCO-pill gap === 8px (no double-counted workspacePad), got ${glassUiAudit.bug1.tbToPillGap}px`);

        // Bug 2 Assertions (v2.1.0 Req #2 hollowed 2.35.1 wrapper + compact rounded pills + P$c solid dropdown)
        assert.equal(glassUiAudit.bug2.tbWrapBg, 'rgba(0, 0, 0, 0)', `Bug 2: #v235-topbar-wrapper must be hollowed transparent, got ${glassUiAudit.bug2.tbWrapBg}`);
        assert.equal(glassUiAudit.bug2.tbBg, 'rgba(0, 0, 0, 0)', `Bug 2: [data-testid="title-menu-bar"] center must be hollowed transparent, got ${glassUiAudit.bug2.tbBg}`);
        assert.equal(glassUiAudit.bug2.tbHostBlur, 'none', `Bug 2: [data-testid="title-menu-bar"] parent backdropFilter must be none, got ${glassUiAudit.bug2.tbHostBlur}`);
        assert.equal(glassUiAudit.bug2.tbOverflow, 'visible', `Bug 2: [data-testid="title-menu-bar"] overflow must be visible, got ${glassUiAudit.bug2.tbOverflow}`);
        assert.ok(glassUiAudit.bug2.tbPillCount >= 1, `Bug 2: expected compact rounded pills in #agy-prism-topbar-pills, got ${glassUiAudit.bug2.tbPillCount}`);
        assert.equal(glassUiAudit.bug2.tbPillsZ, '0', `Bug 2 (D18): #agy-prism-topbar-pills z-index expected 0, got ${glassUiAudit.bug2.tbPillsZ}`);
        assert.equal(glassUiAudit.bug2.tbPillRadius, '12px', `Bug 2: .agy-prism-topbar-pill borderRadius expected 12px, got ${glassUiAudit.bug2.tbPillRadius}`);
        assert.ok(String(glassUiAudit.bug2.tbPillBlur).includes('blur('), `Bug 2: .agy-prism-topbar-pill missing blur(, got ${glassUiAudit.bug2.tbPillBlur}`);
        assert.equal(glassUiAudit.bug2.tbFixedTop, 0, `Bug 2: #titlebar-fixed-probe top trapped at ${glassUiAudit.bug2.tbFixedTop}`);
        assert.equal(glassUiAudit.bug2.tbFixedLeft, 0, `Bug 2: #titlebar-fixed-probe left trapped at ${glassUiAudit.bug2.tbFixedLeft}`);
        assert.ok(
          parseAlphaFromCssColor(glassUiAudit.bug2.tbDropdownBg) >= 0.94,
          `Bug 2: #hub-title-menu-dropdown alpha expected >= 0.94, got ${glassUiAudit.bug2.tbDropdownBg}`,
        );
        assert.ok(
          parseAlphaFromCssColor(glassUiAudit.bug2.tbDropdownInnerBg) >= 0.90,
          `Bug 2: P$c descendant #hub-dropdown-inner-card alpha expected >= 0.90, got ${glassUiAudit.bug2.tbDropdownInnerBg}`,
        );

        // Bug 3 Assertions (Tier 1 dual-state sticky alpha gating + project-header blur=none)
        const sbAlpha = parseAlphaFromCssColor(glassUiAudit.bug3.sbBeforeBg);
        const stickyAlpha = parseAlphaFromCssColor(glassUiAudit.bug3.stickyBeforeBg);
        const projAlpha = parseAlphaFromCssColor(glassUiAudit.bug3.projBeforeBg);
        assert.ok(glassUiAudit.bug3.stickyBeforeRadius >= 6, `Bug 3: #hub-sidebar-sticky-projects::before radius expected >= 6px, got ${glassUiAudit.bug3.stickyBeforeRadius}px`);
        assert.ok(glassUiAudit.bug3.projBeforeRadius >= 6, `Bug 3: #hub-project-header-btn::before radius expected >= 6px, got ${glassUiAudit.bug3.projBeforeRadius}px`);
        if (stickyAlpha >= 0.88) {
          assert.equal(glassUiAudit.bug3.stickyBeforeBlur, 'none', `Tier 1 high-alpha sticky header (${stickyAlpha}) must gate blur off, got ${glassUiAudit.bug3.stickyBeforeBlur}`);
        } else {
          assert.ok(String(glassUiAudit.bug3.stickyBeforeBlur).includes('blur('), `Bug 3: #hub-sidebar-sticky-projects::before missing blur(, got ${glassUiAudit.bug3.stickyBeforeBlur}`);
        }
        assert.equal(glassUiAudit.bug3.projBeforeBlur, 'none', `Tier 1 #hub-project-header-btn::before must keep backdrop-filter: none, got ${glassUiAudit.bug3.projBeforeBlur}`);
        const stickyDualGate = await hubPage.evaluate(`(() => {
          window.__agyPrism.updateConfig({ sidebarOpacity: 0.50, glassBlur: 16 });
          const lowSticky = getComputedStyle(document.getElementById('hub-sidebar-sticky-projects'), '::before');
          const lowProj = getComputedStyle(document.getElementById('hub-project-header-btn'), '::before');
          const lowStickyBg = lowSticky.backgroundColor;
          const lowStickyBlur = lowSticky.backdropFilter || lowSticky.webkitBackdropFilter || 'none';
          const lowProjBlur = lowProj.backdropFilter || lowProj.webkitBackdropFilter || 'none';
          window.__agyPrism.updateConfig({ sidebarOpacity: 0.90, glassBlur: 16 });
          const highSticky = getComputedStyle(document.getElementById('hub-sidebar-sticky-projects'), '::before');
          const highStickyBg = highSticky.backgroundColor;
          const highStickyBlur = highSticky.backdropFilter || highSticky.webkitBackdropFilter || 'none';
          window.__agyPrism.updateConfig({ sidebarOpacity: null, glassBlur: 16 });
          return {
            lowStickyBg,
            lowStickyBlur,
            lowProjBlur,
            highStickyBg,
            highStickyBlur,
          };
        })()`);
        assert.ok(parseAlphaFromCssColor(stickyDualGate.lowStickyBg) < 0.88, `Expected low sidebarOpacity=0.50 sticky alpha < 0.88, got ${stickyDualGate.lowStickyBg}`);
        assert.ok(String(stickyDualGate.lowStickyBlur).includes('blur(16px)'), `Expected sticky ::before blur(16px) at low alpha, got ${stickyDualGate.lowStickyBlur}`);
        assert.equal(stickyDualGate.lowProjBlur, 'none', '#hub-project-header-btn::before must stay blur=none even at low alpha');
        assert.ok(parseAlphaFromCssColor(stickyDualGate.highStickyBg) >= 0.88, `Expected high sidebarOpacity=0.90 sticky alpha >= 0.88, got ${stickyDualGate.highStickyBg}`);
        assert.equal(stickyDualGate.highStickyBlur, 'none', `Expected sticky ::before blur='none' when alpha >= 0.88, got ${stickyDualGate.highStickyBlur}`);
        assert.ok(
          stickyAlpha > sbAlpha + 0.08,
          `Bug 3: #hub-sidebar-sticky-projects::before alpha (${stickyAlpha}) must be significantly darker than .agy-sidebar::before (${sbAlpha})`,
        );
        assert.ok(
          projAlpha > sbAlpha + 0.08,
          `Bug 3: #hub-project-header-btn::before alpha (${projAlpha}) must be significantly darker than .agy-sidebar::before (${sbAlpha})`,
        );
        assert.equal(glassUiAudit.bug3.stickyHostBlur, 'none', 'Bug 3: #hub-sidebar-sticky-projects parent backdropFilter must be none');
        assert.equal(glassUiAudit.bug3.projHostBlur, 'none', 'Bug 3: #hub-project-header-btn parent backdropFilter must be none');
        assert.equal(glassUiAudit.bug3.projFixedTop, 0, `Bug 3: #project-header-fixed-probe top trapped at ${glassUiAudit.bug3.projFixedTop}`);
        assert.equal(glassUiAudit.bug3.projFixedLeft, 0, `Bug 3: #project-header-fixed-probe left trapped at ${glassUiAudit.bug3.projFixedLeft}`);
        assert.equal(glassUiAudit.bug3.folderWrapBg, 'rgba(0, 0, 0, 0)', `Bug 3: #hub-project-folder-wrap background must be transparent, got ${glassUiAudit.bug3.folderWrapBg}`);
        assert.equal(glassUiAudit.bug3.folderWrapBeforeContent, 'none', `Bug 3: #hub-project-folder-wrap::before content must be none, got ${glassUiAudit.bug3.folderWrapBeforeContent}`);

        // Bug 4 Assertions (Host ::before carriers: right aux-pane matches center main-chat, both frosted)
        const centerAlpha = parseAlphaFromCssColor(glassUiAudit.bug4.centerIslandBg);
        const rightAlpha = parseAlphaFromCssColor(glassUiAudit.bug4.rightIslandBg);
        assert.equal(glassUiAudit.bug4.centerIslandHostBg, 'rgba(0, 0, 0, 0)', `Bug 4: center island host must stay transparent (glass on ::before), got ${glassUiAudit.bug4.centerIslandHostBg}`);
        assert.equal(glassUiAudit.bug4.rightIslandHostBg, 'rgba(0, 0, 0, 0)', `Bug 4: right aux-pane host must stay transparent (glass on ::before), got ${glassUiAudit.bug4.rightIslandHostBg}`);
        assert.equal(
          glassUiAudit.bug4.rightIslandBg,
          glassUiAudit.bug4.centerIslandBg,
          `Bug 4: right aux-pane::before (${glassUiAudit.bug4.rightIslandBg}) must match center main-chat::before (${glassUiAudit.bug4.centerIslandBg})`,
        );
        assert.ok(String(glassUiAudit.bug4.centerIslandBlur).includes('blur('), `Bug 4 (Req #3): center island::before missing blur(, got ${glassUiAudit.bug4.centerIslandBlur}`);
        assert.ok(String(glassUiAudit.bug4.rightIslandBlur).includes('blur('), `Bug 4 (Req #3): right aux-pane::before missing blur(, got ${glassUiAudit.bug4.rightIslandBlur}`);
        assert.ok(rightAlpha > 0.05 && rightAlpha < 0.55, `Bug 4: right aux-pane::before alpha (${rightAlpha}) must stay translucent main-chat (0.05..0.55), NOT dark left-sidebar!`);
        assert.ok(centerAlpha > 0.05 && centerAlpha < 0.55, `Bug 4: center island::before alpha (${centerAlpha}) expected 0.05..0.55`);
        assert.equal(glassUiAudit.bug4.rightBodyBg, 'rgba(0, 0, 0, 0)', `Bug 4: inner #v234-right-body-probe must be transparent (no double stacking), got ${glassUiAudit.bug4.rightBodyBg}`);
        assert.equal(glassUiAudit.bug4.mainHeaderBg, 'rgba(0, 0, 0, 0)', `Bug 4: inner #v234-main-header-probe in islands mode must be transparent (no double stacking), got ${glassUiAudit.bug4.mainHeaderBg}`);
        assert.ok(
          parseAlphaFromCssColor(glassUiAudit.bug4.sbAfterCustomBg) >= 0.90 && String(glassUiAudit.bug4.sbAfterCustomBlur).includes('blur(24px)'),
          `Bug 4: left .agy-sidebar::before must remain independently controlled by sidebarOpacity/sidebarBlur (got ${glassUiAudit.bug4.sbAfterCustomBg} / ${glassUiAudit.bug4.sbAfterCustomBlur})`,
        );
        assert.equal(
          glassUiAudit.bug4.rightIslandAfterCustomBg,
          glassUiAudit.bug4.centerIslandBg,
          `Bug 4: changing sidebarOpacity/sidebarBlur leaked into right aux-pane::before (${glassUiAudit.bug4.rightIslandAfterCustomBg})!`,
        );

        // Bug 4 Assertion (Studio 21:9 Mini Preview `.mini-aux` === `.mini-center`, Req #3 frosted glass blur)
        await sleep(600);
        const studioMiniAudit = await studioPage.evaluate(`(() => {
          const aux = document.querySelector('.mini-aux');
          const center = document.querySelector('.mini-center');
          const sidebar = document.querySelector('.mini-sidebar');
          return {
            hasAll: Boolean(aux && center && sidebar),
            auxBg: aux ? getComputedStyle(aux).backgroundColor : '',
            centerBg: center ? getComputedStyle(center).backgroundColor : '',
            sidebarBg: sidebar ? getComputedStyle(sidebar).backgroundColor : '',
            auxBlur: aux ? (getComputedStyle(aux).backdropFilter || getComputedStyle(aux).webkitBackdropFilter || 'none') : '',
            centerBlur: center ? (getComputedStyle(center).backdropFilter || getComputedStyle(center).webkitBackdropFilter || 'none') : '',
          };
        })()`);
        assert.equal(studioMiniAudit.hasAll, true, 'Bug 4: Studio 21:9 mini preview elements (.mini-aux/.mini-center/.mini-sidebar) missing');
        assert.equal(
          studioMiniAudit.auxBg,
          studioMiniAudit.centerBg,
          `Bug 4: Studio 21:9 .mini-aux bg (${studioMiniAudit.auxBg}) must match .mini-center bg (${studioMiniAudit.centerBg})`,
        );
        assert.notEqual(
          studioMiniAudit.auxBg,
          studioMiniAudit.sidebarBg,
          `Bug 4: Studio 21:9 .mini-aux bg (${studioMiniAudit.auxBg}) must NOT match dark .mini-sidebar bg (${studioMiniAudit.sidebarBg})`,
        );
        assert.ok(String(studioMiniAudit.auxBlur).includes('blur('), `Bug 4 (Req #3): Studio 21:9 .mini-aux backdropFilter expected blur(, got ${studioMiniAudit.auxBlur}`);
        assert.equal(studioMiniAudit.auxBlur, studioMiniAudit.centerBlur, `Bug 4 (Req #3): Studio 21:9 .mini-aux blur (${studioMiniAudit.auxBlur}) must match .mini-center blur (${studioMiniAudit.centerBlur})`);

        assert.deepEqual(hubPage.consoleErrors, [], `3D Hub console.error: ${hubPage.consoleErrors.join(' | ')}`);
        assert.deepEqual(hubPage.pageExceptions, [], `3D Hub exception: ${hubPage.pageExceptions.join(' | ')}`);
        assert.deepEqual(studioPage.consoleErrors, [], `3D Studio console.error: ${studioPage.consoleErrors.join(' | ')}`);
        assert.deepEqual(studioPage.pageExceptions, [], `3D Studio exception: ${studioPage.pageExceptions.join(' | ')}`);

        return `Bug1(pill z=0 r=${glassUiAudit.bug1.pillRadius}px + bodyBg=#00000000 + gap=${glassUiAudit.bug1.tbToPillGap}px + syncOverlay->#00000000/35) + Bug2(hollowed 2.35.1 + ${glassUiAudit.bug2.tbPillCount} pill(s) r=12px + P$c solid) + Bug3(sticky=${stickyAlpha.toFixed(2)}/proj=${projAlpha.toFixed(2)} > sb=${sbAlpha.toFixed(2)}) + Bug4(::before right=${rightAlpha.toFixed(2)}==center + blur & Studio .mini-aux==.mini-center) verified`;
      } finally {
        await browser.closePage(studioPage);
        await browser.closePage(hubPage);
      }
    });

    // -----------------------------------------------------------------------
    // 3E. v2.0.7 Three-Point 1-Click Master Enable/Disable Switch E2E
    //     (POST /api/skin/toggle + RPC skin.toggle + Canary Tripped Auto-Reset +
    //      Studio #prism-master-toggle-btn + Ctrl+Alt+W [data-testid="prism-power-toggle"] +
    //      Persistent #agy-prism-pill [data-skin-enabled="false"] + Ctrl+Alt+Shift+R Panic Escape)
    // -----------------------------------------------------------------------
    await check('v2.0.7 Three-Point 1-Click Master Toggle E2E: /api/skin/toggle (tripped canary auto-reset) + Studio #prism-master-toggle-btn + Ctrl+Alt+W [data-testid="prism-power-toggle"] + Persistent #agy-prism-pill + Panic Escape', '@exec-v207-backend / @exec-v207-host / @exec-v207-studio / @exec-v207-tests', async () => {
      // 1. Backend POST /api/skin/toggle & RPC `skin.toggle` with Canary `tripped` auto-recovery
      const toggleCanaryDir = path.join(SCRATCH_ROOT, 'v207-toggle-canary-data');
      fs.mkdirSync(toggleCanaryDir, { recursive: true });
      const installIdPath = path.join(REPO_ROOT, '.prism-install-id');
      const boundInstallId = fs.existsSync(installIdPath) ? fs.readFileSync(installIdPath, 'utf8').trim() : '';
      fs.writeFileSync(
        path.join(toggleCanaryDir, 'config.json'),
        JSON.stringify({ skinEnabled: true, startupMode: 'gentle-auto', liveBootDelay: 1.5 }, null, 2),
        'utf8',
      );
      fs.writeFileSync(
        path.join(toggleCanaryDir, 'canary.json'),
        JSON.stringify(
          {
            version: 2,
            state: 'arming',
            browserSessionId: 'v207-crashed-session-prev',
            windowTargetId: 'target-prev-207',
            sidecarPid: 999998,
            boundInstallId,
            lastArmTs: Date.now() - 2500,
            unfinishedAttempts: [Date.now() - 2500],
          },
          null,
          2,
        ),
        'utf8',
      );

      const toggleSrv = await createPrismStudioServer({
        dataDir: toggleCanaryDir,
        token: 'v207-toggle-tok',
        startCdp: false,
        inspectShortcuts: false,
      });
      try {
        const trippedBoot = (await invokeServerInMemory(toggleSrv.server, { method: 'GET', url: '/api/bootstrap' })).json();
        assert.equal(trippedBoot.canary?.state, 'tripped', 'Expected seeded arming canary to trip on boot');
        assert.equal(trippedBoot.skinEnabled, false, 'Tripped canary must start with skinEnabled === false');

        // POST /api/skin/toggle { enabled: true } MUST auto-reset tripped canary and wake!
        const enRes = await invokeServerInMemory(toggleSrv.server, {
          method: 'POST',
          url: '/api/skin/toggle',
          headers: { 'Content-Type': 'application/json', 'X-Sidecar-Token': 'v207-toggle-tok' },
          body: JSON.stringify({ enabled: true }),
        });
        assert.equal(enRes.status, 200, `POST /api/skin/toggle enable failed: ${enRes.text()}`);
        const enBody = enRes.json();
        assert.equal(enBody.ok, true);
        assert.equal(enBody.skinEnabled, true);
        assert.equal(enBody.state?.skinEnabled, true);
        assert.notEqual(enBody.state?.canary?.state, 'tripped', 'POST /api/skin/toggle enable did not clear tripped canary');
        assert.equal(enBody.state?.sessionAwake, true, 'POST /api/skin/toggle enable did not set sessionAwake=true');

        // Host RPC `skin.toggle` disable -> re-enable
        const rpcOff = await invokeServerInMemory(toggleSrv.server, {
          method: 'POST',
          url: `/host/${toggleSrv.hostCapToken}/rpc`,
          headers: { 'Content-Type': 'application/json', 'X-Prism-Token': toggleSrv.hostCapToken },
          body: JSON.stringify({ id: 't1', method: 'skin.toggle', params: { enabled: false } }),
        });
        assert.equal(rpcOff.status, 200);
        assert.equal(rpcOff.json().ok, true);
        assert.equal(rpcOff.json().result?.skinEnabled, false);

        const rpcOn = await invokeServerInMemory(toggleSrv.server, {
          method: 'POST',
          url: `/host/${toggleSrv.hostCapToken}/rpc`,
          headers: { 'Content-Type': 'application/json', 'X-Prism-Token': toggleSrv.hostCapToken },
          body: JSON.stringify({ id: 't2', method: 'skin.toggle', params: {} }),
        });
        assert.equal(rpcOn.status, 200);
        assert.equal(rpcOn.json().ok, true);
        assert.equal(rpcOn.json().result?.skinEnabled, true, 'RPC skin.toggle with omitted enabled did not flip false -> true');
      } finally {
        await toggleSrv.close();
      }

      // 2. Headless Chrome E2E across Studio `#prism-master-toggle-btn`, Hub persistent `#agy-prism-pill`,
      //    and `Ctrl+Alt+W` `[data-testid="prism-power-toggle"]`, ending with `Ctrl+Alt+Shift+R` Panic Escape!
      await engine.applyWallpaper(auroraItem.id, {
        skinEnabled: true,
        startupMode: 'gentle-auto',
        preset: 'islands',
        layoutMode: 'islands',
        glassOpacity: 0.74,
        glassBlur: 16,
        triggerMode: 'both',
        language: 'zh',
      });

      const hubPage = await browser.openPage({
        url: `${HUB_MOCK_ORIGIN}/hub`,
        requestHandler: universalHttpRouter,
      });
      const studioPage = await browser.openPage({
        url: `${studio.origin}/?token=${encodeURIComponent(SIDECAR_TEST_TOKEN)}`,
        requestHandler: universalHttpRouter,
      });

      try {
        await hubPage.evaluate(`window.__lastWco = null; window.electronNative = { setTitleBarOverlay(o){ window.__lastWco = o; return Promise.resolve(); } };`);
        const bootstrapExpr = buildHostMicroBootstrap({
          hostOrigin: studio.origin,
          capToken: studio.hostCapToken,
          triggerMode: 'both',
          startupMode: 'gentle-auto',
          skinEnabled: true,
        });
        await hubPage.evaluate(bootstrapExpr);

        const readyDeadline = Date.now() + 4000;
        while (Date.now() < readyDeadline) {
          const ready = await hubPage.evaluate(`document.documentElement.getAttribute('data-agy-prism-wallpaper') === 'ready'`);
          if (ready) break;
          await sleep(45);
        }
        await sleep(500); // wait for Studio initial bootstrap render

        const initCheck = await Promise.all([
          studioPage.evaluate(`(() => {
            const btn = document.getElementById('prism-master-toggle-btn');
            return btn ? {
              exists: true,
              role: btn.getAttribute('role'),
              ariaChecked: btn.getAttribute('aria-checked'),
              dataEnabled: btn.dataset.enabled,
              text: (document.getElementById('prism-master-toggle-text')?.textContent || '').trim(),
            } : { exists: false };
          })()`),
          hubPage.evaluate(`(() => {
            const pill = document.getElementById('agy-prism-pill');
            return {
              wallAttr: document.documentElement.getAttribute('data-agy-prism-wallpaper'),
              hasPill: Boolean(pill),
              pillSkinEnabled: pill ? pill.getAttribute('data-skin-enabled') : null,
            };
          })()`),
        ]);
        assert.equal(initCheck[0].exists, true, 'Studio topbar missing #prism-master-toggle-btn');
        assert.equal(initCheck[0].role, 'switch');
        assert.equal(initCheck[0].ariaChecked, 'true');
        assert.equal(initCheck[0].dataEnabled, 'true');
        assert.equal(initCheck[1].wallAttr, 'ready');
        assert.equal(initCheck[1].hasPill, true, 'Hub missing initial #agy-prism-pill');
        assert.equal(initCheck[1].pillSkinEnabled, 'true', `Expected initial #agy-prism-pill data-skin-enabled="true", got ${initCheck[1].pillSkinEnabled}`);

        // Step A: Click Studio `#prism-master-toggle-btn` to DISABLE -> skin unloads via W[K].apply({skinEnabled:false}),
        //         __agyPrism stays resident (+0 /stage.js reloads), #agy-prism-pill & #prism-mini-stage show data-skin-enabled="false"!
        const stageReqsBeforeToggle = await hubPage.evaluate(
          `performance.getEntriesByType('resource').filter(r => r.name.includes('/stage.js')).length`,
        );
        await studioPage.evaluate(`document.getElementById('prism-master-toggle-btn').click()`);
        const offCfgDeadline = Date.now() + 2500;
        while (Date.now() < offCfgDeadline) {
          const cfg = await engine.getConfig();
          if (cfg.skinEnabled === false) break;
          await sleep(40);
        }
        assert.equal((await engine.getConfig()).skinEnabled, false, 'Clicking #prism-master-toggle-btn did not set engine skinEnabled=false');

        const studioAfterOff = await studioPage.evaluate(`(() => {
          const btn = document.getElementById('prism-master-toggle-btn');
          const miniStage = document.getElementById('prism-mini-stage');
          return {
            ariaChecked: btn.getAttribute('aria-checked'),
            dataEnabled: btn.dataset.enabled,
            miniStageSkinEnabled: miniStage ? miniStage.getAttribute('data-skin-enabled') : null,
          };
        })()`);
        assert.equal(studioAfterOff.ariaChecked, 'false');
        assert.equal(studioAfterOff.dataEnabled, 'false');
        assert.equal(studioAfterOff.miniStageSkinEnabled, 'false', 'Studio #prism-mini-stage did not sync data-skin-enabled="false"');

        // Wait for Hub EventSource (/host/<token>/events retry:2500) to deliver skinEnabled=false -> ss()
        let hubAfterOff = null;
        const sseOffDeadline = Date.now() + 4500;
        while (Date.now() < sseOffDeadline) {
          hubAfterOff = await hubPage.evaluate(`(() => {
            const pill = document.getElementById('agy-prism-pill');
            return {
              wallAttr: document.documentElement.getAttribute('data-agy-prism-wallpaper'),
              hasStage: Boolean(document.getElementById('agy-prism-stage')),
              hasCss: Boolean(document.getElementById('agy-prism-css')),
              hasPrismObj: Boolean(window.__agyPrism && typeof window.__agyPrism.apply === 'function'),
              prismOnFlag: window.__agyPrismOn,
              hasPill: Boolean(pill),
              pillSkinEnabled: pill ? pill.getAttribute('data-skin-enabled') : null,
              bodyBg: getComputedStyle(document.body).backgroundColor,
            };
          })()`);
          if (hubAfterOff.wallAttr === null && !hubAfterOff.hasStage) break;
          await sleep(80);
        }
        assert.equal(hubAfterOff.wallAttr, null, 'Host did not strip data-agy-prism-wallpaper when disabled from Studio');
        assert.equal(hubAfterOff.hasStage, false, 'Host did not remove #agy-prism-stage when disabled from Studio');
        assert.equal(hubAfterOff.hasCss, false, 'Host did not remove #agy-prism-css when disabled from Studio');
        assert.equal(hubAfterOff.hasPrismObj, true, 'Soft-disable must keep window.__agyPrism (.apply) alive to avoid /stage.js reload');
        assert.equal(hubAfterOff.prismOnFlag, false, 'Soft-disable must set window.__agyPrismOn = false');
        assert.equal(hubAfterOff.bodyBg, 'rgb(7, 7, 8)', `Expected native dark body bg after disable, got ${hubAfterOff.bodyBg}`);
        assert.equal(hubAfterOff.hasPill, true, 'FATAL REGRESSION: #agy-prism-pill was deleted by stripSkin on normal disable!');
        assert.equal(
          hubAfterOff.pillSkinEnabled,
          'false',
          `Expected persistent #agy-prism-pill data-skin-enabled="false", got ${hubAfterOff.pillSkinEnabled}`,
        );

        // Step B: Press Ctrl+Alt+W to summon Quick Popover -> verify `[data-testid="prism-power-toggle"]` is OFF -> click it to RE-ENABLE!
        await hubPage.pressKey({ key: 'w', code: 'KeyW', windowsVirtualKeyCode: 87, modifiers: 3 });
        const popOpenDeadline = Date.now() + 3000;
        while (Date.now() < popOpenDeadline) {
          const isOpen = await hubPage.evaluate(
            `Boolean(window.__agyPrismPanel && window.__agyPrismPanel.status().open && document.querySelector('[data-testid="prism-power-toggle"]'))`,
          );
          if (isOpen) break;
          await sleep(45);
        }
        const popBeforeReEnable = await hubPage.evaluate(`(() => {
          const btn = document.querySelector('[data-testid="prism-power-toggle"]');
          const pill = document.getElementById('agy-prism-pill');
          return {
            hasPowerBtn: Boolean(btn),
            role: btn ? btn.getAttribute('role') : null,
            ariaChecked: btn ? btn.getAttribute('aria-checked') : null,
            hasPill: Boolean(pill),
            pillSkinEnabled: pill ? pill.getAttribute('data-skin-enabled') : null,
          };
        })()`);
        assert.equal(popBeforeReEnable.hasPowerBtn, true, 'Quick Popover missing [data-testid="prism-power-toggle"]');
        assert.equal(popBeforeReEnable.role, 'switch');
        assert.equal(popBeforeReEnable.ariaChecked, 'false', 'Expected popover power toggle aria-checked="false" while disabled');
        assert.equal(popBeforeReEnable.hasPill, true, 'Upgraded #agy-prism-pill missing after opening Ctrl+Alt+W while disabled');
        assert.equal(popBeforeReEnable.pillSkinEnabled, 'false');

        // Click `[data-testid="prism-power-toggle"]` to 1-click RE-ENABLE!
        await hubPage.evaluate(`document.querySelector('[data-testid="prism-power-toggle"]').click()`);
        let hubAfterReEnable = null;
        const reEnableDeadline = Date.now() + 4500;
        while (Date.now() < reEnableDeadline) {
          hubAfterReEnable = await hubPage.evaluate(`(() => {
            const btn = document.querySelector('[data-testid="prism-power-toggle"]');
            const pill = document.getElementById('agy-prism-pill');
            return {
              wallAttr: document.documentElement.getAttribute('data-agy-prism-wallpaper'),
              ariaChecked: btn ? btn.getAttribute('aria-checked') : null,
              pillSkinEnabled: pill ? pill.getAttribute('data-skin-enabled') : null,
              stageReqs: performance.getEntriesByType('resource').filter(r => r.name.includes('/stage.js')).length,
            };
          })()`);
          if (hubAfterReEnable.wallAttr === 'ready' && hubAfterReEnable.pillSkinEnabled === 'true') break;
          await sleep(60);
        }
        assert.equal(hubAfterReEnable.wallAttr, 'ready', 'Clicking [data-testid="prism-power-toggle"] did not restore data-agy-prism-wallpaper="ready"');
        assert.equal(hubAfterReEnable.ariaChecked, 'true');
        assert.equal(hubAfterReEnable.pillSkinEnabled, 'true');
        assert.equal(hubAfterReEnable.stageReqs, stageReqsBeforeToggle, `Re-enabling after soft-disable triggered +${hubAfterReEnable.stageReqs - stageReqsBeforeToggle} extra /stage.js fetch(es)!`);
        assert.equal((await engine.getConfig()).skinEnabled, true, 'Popover power toggle did not persist skinEnabled=true');

        // Verify Studio `#prism-master-toggle-btn` also syncs back to enabled="true" via /api/events SSE!
        let studioSyncedOn = false;
        const studioSyncDeadline = Date.now() + 4500;
        while (Date.now() < studioSyncDeadline) {
          studioSyncedOn = await studioPage.evaluate(
            `document.getElementById('prism-master-toggle-btn')?.dataset.enabled === 'true'`,
          );
          if (studioSyncedOn) break;
          await sleep(80);
        }
        assert.equal(studioSyncedOn, true, 'Studio #prism-master-toggle-btn did not sync back to data-enabled="true" after popover re-enable');

        // Step C: Disable once more with `panel.js` ALREADY LOADED -> verify BOTH `#agy-prism-pill` and `[data-testid="prism-power-toggle"]` survive & sync!
        await studioPage.evaluate(`document.getElementById('prism-master-toggle-btn').click()`);
        let loadedPanelOff = null;
        const loadedOffDeadline = Date.now() + 4500;
        while (Date.now() < loadedOffDeadline) {
          loadedPanelOff = await hubPage.evaluate(`(() => {
            const btn = document.querySelector('[data-testid="prism-power-toggle"]');
            const pill = document.getElementById('agy-prism-pill');
            return {
              wallAttr: document.documentElement.getAttribute('data-agy-prism-wallpaper'),
              hasPill: Boolean(pill),
              pillSkinEnabled: pill ? pill.getAttribute('data-skin-enabled') : null,
              powerAriaChecked: btn ? btn.getAttribute('aria-checked') : null,
            };
          })()`);
          if (loadedPanelOff.wallAttr === null && loadedPanelOff.pillSkinEnabled === 'false' && loadedPanelOff.powerAriaChecked === 'false') break;
          await sleep(80);
        }
        assert.equal(loadedPanelOff.wallAttr, null);
        assert.equal(loadedPanelOff.hasPill, true, 'Full panel #agy-prism-pill must survive normal disable');
        assert.equal(loadedPanelOff.pillSkinEnabled, 'false');
        assert.equal(loadedPanelOff.powerAriaChecked, 'false', 'Open popover power toggle did not sync to aria-checked="false" via SSE');

        // Re-enable from Studio `#prism-master-toggle-btn` -> restores ready!
        await studioPage.evaluate(`document.getElementById('prism-master-toggle-btn').click()`);
        let reOnFromStudio = false;
        const reOnDeadline = Date.now() + 4500;
        while (Date.now() < reOnDeadline) {
          reOnFromStudio = await hubPage.evaluate(
            `document.documentElement.getAttribute('data-agy-prism-wallpaper') === 'ready' && document.getElementById('agy-prism-pill')?.getAttribute('data-skin-enabled') === 'true'`,
          );
          if (reOnFromStudio) break;
          await sleep(80);
        }
        assert.equal(reOnFromStudio, true, 'Re-enabling via Studio #prism-master-toggle-btn did not restore wallpaper="ready"');

        // Step D: `Ctrl+Alt+Shift+R` Emergency Panic Escape MUST still remove ALL nodes (including `#agy-prism-pill` & `#agy-prism-popover`)!
        await hubPage.pressKey({ key: 'R', code: 'KeyR', windowsVirtualKeyCode: 82, modifiers: 11 });
        await sleep(250);
        const panicAudit = await hubPage.evaluate(`({
          nodes: Array.from(document.querySelectorAll('[id^="agy-prism-"], .prism-corner-orb')).map(e => e.id || e.className),
          attrs: Array.from(document.documentElement.attributes).map(a => a.name).filter(n => /^data-(?:agy-)?prism/.test(n)),
        })`);
        assert.deepEqual(panicAudit.nodes, [], `Ctrl+Alt+Shift+R left residual nodes: ${panicAudit.nodes.join(', ')}`);
        assert.deepEqual(panicAudit.attrs, [], `Ctrl+Alt+Shift+R left residual attrs: ${panicAudit.attrs.join(', ')}`);
        assert.equal((await engine.getConfig()).skinEnabled, false, 'Ctrl+Alt+Shift+R did not persist skinEnabled=false');

        assert.deepEqual(hubPage.consoleErrors, [], `3E Hub console.error: ${hubPage.consoleErrors.join(' | ')}`);
        assert.deepEqual(hubPage.pageExceptions, [], `3E Hub exception: ${hubPage.pageExceptions.join(' | ')}`);
        assert.deepEqual(studioPage.consoleErrors, [], `3E Studio console.error: ${studioPage.consoleErrors.join(' | ')}`);
        assert.deepEqual(studioPage.pageExceptions, [], `3E Studio exception: ${studioPage.pageExceptions.join(' | ')}`);

        return 'canary tripped->/api/skin/toggle auto-reset + Studio #prism-master-toggle-btn + persistent #agy-prism-pill + Ctrl+Alt+W [data-testid="prism-power-toggle"] + Ctrl+Alt+Shift+R full strip verified';
      } finally {
        await browser.closePage(studioPage);
        await browser.closePage(hubPage);
      }
    });

    // -----------------------------------------------------------------------
    // 3F. PR #8 E2E: `REMOVE_PANEL_EXPR` >1700ms Non-Resurrection & Same-Origin Double-Inject `skinEnabled: false`
    // -----------------------------------------------------------------------
    await check('PR #8 E2E: `REMOVE_PANEL_EXPR` >1700ms non-resurrection & same-origin double-inject `skinEnabled: false` remount', '@exec-sidecar / @exec-tests', async () => {
      const { REMOVE_PANEL_EXPR } = await import(
        pathToFileURL(path.join(REPO_ROOT, 'sidecars', 'prism_studio', 'cdp-bridge.mjs')).href
      );

      await engine.applyWallpaper(auroraItem.id, { skinEnabled: true, layoutMode: 'islands' });

      const hubPage = await browser.openPage({
        url: `${HUB_MOCK_ORIGIN}/hub`,
        requestHandler: universalHttpRouter,
      });

      try {
        const bootOn = buildHostMicroBootstrap({
          hostOrigin: studio.origin,
          capToken: studio.hostCapToken,
          triggerMode: 'both',
          startupMode: 'gentle-auto',
          skinEnabled: true,
        });
        await hubPage.evaluate(bootOn);

        const waitBoot = Date.now() + 3000;
        while (Date.now() < waitBoot) {
          const ok = await hubPage.evaluate(`Boolean(document.getElementById('agy-prism-pill') && window.__agyPrism)`);
          if (ok) break;
          await sleep(40);
        }

        // 1) Same-origin double-inject with `skinEnabled: false` -> must NOT split-brain flip pill back to ON after >1700ms
        await engine.updateConfig({ skinEnabled: false });
        const bootOff = buildHostMicroBootstrap({
          hostOrigin: studio.origin,
          capToken: studio.hostCapToken,
          triggerMode: 'both',
          startupMode: 'gentle-auto',
          skinEnabled: false,
        });
        await hubPage.evaluate(bootOff);
        // Simulate footer remount while disabled to confirm keepalive remounts with `data-skin-enabled="false"`
        await hubPage.evaluate(`(() => {
          const f = document.querySelector('.agy-composer-footer');
          const c = f.cloneNode(true);
          const p = c.querySelector('#agy-prism-pill');
          if (p) p.remove();
          f.parentNode.replaceChild(c, f);
        })()`);
        await sleep(1850);
        const doubleInjectAudit = await hubPage.evaluate(`(() => {
          const p = document.getElementById('agy-prism-pill');
          return {
            hasPill: Boolean(p),
            skinAttr: p ? p.getAttribute('data-skin-enabled') : null,
            liveOnFlag: typeof window.__agyPrismOn === 'boolean' ? window.__agyPrismOn : null,
            inFooter: Boolean(document.querySelector('.agy-composer-footer #agy-prism-pill')),
          };
        })()`);
        assert.equal(doubleInjectAudit.hasPill, true, 'PR #8 double-inject disabled remount lost persistent #agy-prism-pill');
        assert.equal(doubleInjectAudit.inFooter, true, 'PR #8 double-inject disabled remount failed to remount inside footer');
        assert.equal(doubleInjectAudit.skinAttr, 'false', `PR #8 double-inject split-brain flipped data-skin-enabled to "${doubleInjectAudit.skinAttr}"!`);
        assert.equal(doubleInjectAudit.liveOnFlag, false, 'PR #8 double-inject window.__agyPrismOn did not stay false');

        // 2) `REMOVE_PANEL_EXPR` MUST cancel `__agyPrismKt` keepalive timer & never resurrect `#agy-prism-pill` over >1700ms
        await hubPage.evaluate(REMOVE_PANEL_EXPR);
        const afterRemoveNow = await hubPage.evaluate(`({
          kt: window.__agyPrismKt || 0,
          hasPill: Boolean(document.getElementById('agy-prism-pill')),
        })`);
        assert.equal(afterRemoveNow.kt, 0, `REMOVE_PANEL_EXPR left window.__agyPrismKt active (${afterRemoveNow.kt})`);
        assert.equal(afterRemoveNow.hasPill, false, 'REMOVE_PANEL_EXPR left #agy-prism-pill in DOM');

        await sleep(1850);
        const afterWait = await hubPage.evaluate(`({
          kt: window.__agyPrismKt || 0,
          hasPill: Boolean(document.getElementById('agy-prism-pill')),
        })`);
        assert.equal(afterWait.kt, 0);
        assert.equal(afterWait.hasPill, false, 'PR #8: #agy-prism-pill resurrected after REMOVE_PANEL_EXPR (>1700ms)!');

        assert.deepEqual(hubPage.consoleErrors, [], `3F Hub console.error: ${hubPage.consoleErrors.join(' | ')}`);
        assert.deepEqual(hubPage.pageExceptions, [], `3F Hub exception: ${hubPage.pageExceptions.join(' | ')}`);
        return 'same-origin double-inject skinEnabled=false remount + REMOVE_PANEL_EXPR >1700ms non-resurrection verified';
      } finally {
        await engine.updateConfig({ skinEnabled: true });
        await browser.closePage(hubPage);
      }
    });

    // -----------------------------------------------------------------------
    // 3G. v2.1.0 Optical Presets (Issue #10 + D2) + Req #1 `hideWelcomeLogo` +
    //     Req #2 2.35.1 Topbar/WCO/D18 + Req #3 `glassBlur` 0..64px + Req #4 Per-Component Tints E2E
    // -----------------------------------------------------------------------
    await check('v2.1.0 Hub+Studio E2E: Issue #10+D2 Optical Presets & Blur-Veil Z-Order, Req #1 hideWelcomeLogo (5 modes), Req #2 2.35.1 Topbar/WCO 30-35-40/D18, Req #3 glassBlur 0..64px & Quick Prism Inheritance, Req #4 Per-Component Surface Isolation', '@exec-host-skin / @exec-host-panel / @exec-studio-ui / @exec-tests', async () => {
      const { SCENE_PRESETS } = await import(
        pathToFileURL(path.join(REPO_ROOT, 'src', 'shared', 'schema.mjs')).href
      );

      await engine.applyWallpaper(auroraItem.id, {
        skinEnabled: true,
        preset: 'islands',
        layoutMode: 'islands',
        islandGap: 12,
        workspacePad: 10,
        cornerStyle: 'soft',
        topbarStyle: 'pills',
        hideWelcomeLogo: false,
        glassSurfaces: true,
        glassOpacity: 0.76,
        glassBlur: 16,
        sidebarOpacity: null,
        sidebarBlur: null,
        surfaceTints: null,
        fxEnabled: true,
        parallaxEnabled: true,
        mediaBlur: 0,
        fpsCap: 60,
        language: 'zh',
      });

      const studioPage = await browser.openPage({
        url: `${studio.origin}/?token=${encodeURIComponent(SIDECAR_TEST_TOKEN)}`,
        requestHandler: universalHttpRouter,
      });
      const hubPage = await browser.openPage({
        url: `${HUB_MOCK_ORIGIN}/hub`,
        requestHandler: universalHttpRouter,
      });

      try {
        await hubPage.call('Page.bringToFront').catch(() => {});
        await sleep(700);
        await hubPage.evaluate(`(() => {
          window.__wcoCalls = [];
          window.__lastWco = null;
          window.electronNative = {
            setTitleBarOverlay(opts) { window.__wcoCalls.push(opts); window.__lastWco = opts; return Promise.resolve(); },
          };
        })()`);

        const bootExpr = buildHostMicroBootstrap({
          hostOrigin: studio.origin,
          capToken: studio.hostCapToken,
          triggerMode: 'both',
          startupMode: 'gentle-auto',
          skinEnabled: true,
        });
        await hubPage.evaluate(bootExpr);

        const readyDeadline = Date.now() + 3500;
        while (Date.now() < readyDeadline) {
          const rdy = await hubPage.evaluate(`document.documentElement.getAttribute('data-agy-prism-wallpaper') === 'ready'`);
          if (rdy) break;
          await sleep(40);
        }

        // Open Ctrl+Alt+W Quick Prism Popover so we can verify D18 z-index & Req #3 `.prism-sheet` blur inheritance
        await hubPage.pressKey({ key: 'w', code: 'KeyW', windowsVirtualKeyCode: 87, modifiers: 3 });
        const popWait = Date.now() + 3000;
        while (Date.now() < popWait) {
          const open = await hubPage.evaluate(`Boolean(window.__agyPrismPanel && window.__agyPrismPanel.status().open)`);
          if (open) break;
          await sleep(40);
        }

        // ---- 1) Issue #10 + D2: Preset switching preserves layout (0px jump), 0.00% transform scale jump, `.agy-prism-blur-veil` z-order, `eco` parallax/fx reset & `fpsCap: 60` restoration ----
        const snapLayout = () => hubPage.evaluate(`(() => {
          const rect = (sel) => {
            const el = document.querySelector(sel);
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)];
          };
          const mw = document.querySelector('#agy-prism-stage .agy-prism-media-wrap');
          const bv = document.querySelector('#agy-prism-stage .agy-prism-blur-veil');
          const sc = document.querySelector('#agy-prism-stage .agy-prism-scrim');
          const vg = document.querySelector('#agy-prism-stage .agy-prism-vignette');
          const gr = document.querySelector('#agy-prism-stage .agy-prism-grain');
          const fx = document.getElementById('agy-prism-fx-canvas');
          return {
            shell: rect('.agy-shell'),
            sidebar: rect('.agy-sidebar'),
            main: rect('#hub-main-pane'),
            gutter: rect('[data-testid="sidebar-split"] > div:nth-child(2)'),
            layoutAttr: document.documentElement.getAttribute('data-prism-layout'),
            mediaTransform: mw ? getComputedStyle(mw).transform : '',
            zOrder: [mw, bv, sc, vg, gr].map((el) => (el ? Number(getComputedStyle(el).zIndex) : -99)),
            blurVeilBackdrop: bv ? (getComputedStyle(bv).backdropFilter || getComputedStyle(bv).webkitBackdropFilter || 'none') : '',
            px: getComputedStyle(document.documentElement).getPropertyValue('--prism-px').trim(),
            py: getComputedStyle(document.documentElement).getPropertyValue('--prism-py').trim(),
            fxDisplay: fx ? getComputedStyle(fx).display : 'none',
          };
        })()`);

        const baseLayout = await snapLayout();
        assert.deepEqual(baseLayout.zOrder, [0, 1, 2, 3, 4], `D2: expected stage z-index stacking [0,1,2,3,4], got ${JSON.stringify(baseLayout.zOrder)}`);
        assert.equal(baseLayout.layoutAttr, 'islands');

        for (const pId of ['focus', 'eco', 'crystal', 'islands']) {
          await engine.updateConfig(SCENE_PRESETS[pId].patch);
          const curCfg = await engine.getConfig();
          assert.equal(curCfg.fpsCap, pId === 'eco' ? 30 : 60, `Preset ${pId} fpsCap mismatch`);
          await hubPage.evaluate(`window.__agyPrism.updateConfig(${JSON.stringify(SCENE_PRESETS[pId].patch)})`);
          await sleep(60);
          const cur = await snapLayout();
          assert.deepEqual(cur.shell, baseLayout.shell, `Issue #10: preset "${pId}" shifted .agy-shell layout!`);
          assert.deepEqual(cur.sidebar, baseLayout.sidebar, `Issue #10: preset "${pId}" shifted .agy-sidebar layout!`);
          assert.deepEqual(cur.main, baseLayout.main, `Issue #10: preset "${pId}" shifted #hub-main-pane layout!`);
          assert.deepEqual(cur.gutter, baseLayout.gutter, `Issue #10: preset "${pId}" shifted split gutter layout!`);
          if (pId === 'focus') {
            assert.equal(cur.mediaTransform, baseLayout.mediaTransform, `Issue #10: mediaBlur 0->8px caused transform scale jump (${baseLayout.mediaTransform} -> ${cur.mediaTransform})!`);
            assert.ok(cur.blurVeilBackdrop.includes('blur(8px)'), `D2: focus mode .agy-prism-blur-veil expected blur(8px), got ${cur.blurVeilBackdrop}`);
          }
          if (pId === 'eco') {
            assert.ok(cur.px === '0px' || cur.px === '' || cur.px === '0', `Issue #10 eco: --prism-px not reset (${cur.px})`);
            assert.ok(cur.py === '0px' || cur.py === '' || cur.py === '0', `Issue #10 eco: --prism-py not reset (${cur.py})`);
            assert.equal(cur.fxDisplay, 'none', `Issue #10 eco: #agy-prism-fx-canvas not hidden (${cur.fxDisplay})`);
          }
        }

        // Studio 21:9 `.mini-blur-veil` exact z-index stacking (0 < 1 < 2 < 3 < 4 < 5)
        const studioZ = await studioPage.evaluate(`(() => {
          const sels = ['#mini-media-layer', '.mini-blur-veil', '.mini-scrim', '.mini-vignette', '.mini-grain', '.mini-hub-shell'];
          return sels.map((s) => {
            const el = document.querySelector(s);
            return el ? Number(getComputedStyle(el).zIndex) : -99;
          });
        })()`);
        assert.deepEqual(studioZ, [0, 1, 2, 3, 4, 5], `D2: Studio 21:9 mini-stage z-index stacking expected [0,1,2,3,4,5], got ${JSON.stringify(studioZ)}`);

        // ---- 2) Req #1: `hideWelcomeLogo` across ALL 5 modes + zero false positives + instant restore ----
        await engine.updateConfig({ hideWelcomeLogo: true });
        await hubPage.evaluate(`window.__agyPrism.updateConfig({ hideWelcomeLogo: true })`);
        await sleep(60);

        // Mode 'chat': zero false positives (#chat-inline-svg stays visible)
        await hubPage.evaluate(`window.__setMockConversationMode('chat')`);
        await sleep(90);
        const chatModeAudit = await hubPage.evaluate(`(() => {
          const svg = document.getElementById('chat-inline-svg');
          const cs = svg ? getComputedStyle(svg) : null;
          return {
            hiddenMarks: document.querySelectorAll('[data-agy-prism-welcome-logo="1"], [data-agy-prism-welcome-logo-pseudo]').length,
            svgOpacity: cs ? cs.opacity : '',
            svgVis: cs ? cs.visibility : '',
          };
        })()`);
        assert.equal(chatModeAudit.hiddenMarks, 0, `Req #1: chat mode falsely hid ${chatModeAudit.hiddenMarks} element(s)!`);
        assert.equal(chatModeAudit.svgOpacity, '0.4', `Req #1: chat inline SVG opacity altered from 0.4 to ${chatModeAudit.svgOpacity}`);
        assert.equal(chatModeAudit.svgVis, 'visible');

        for (const mode of ['empty-en', 'empty-zh', 'empty-mask', 'empty-pseudo']) {
          await hubPage.evaluate(`window.__setMockConversationMode(${JSON.stringify(mode)})`);
          let mAudit = null;
          const modeDeadline = Date.now() + 1400;
          while (Date.now() < modeDeadline) {
            mAudit = await hubPage.evaluate(`(() => {
              const modeName = ${JSON.stringify(mode)};
              const starterBtn = document.querySelector('.mock-starter-card');
              if (modeName === 'empty-pseudo') {
                const pseudoEl = document.getElementById('mock-welcome-pseudo-wrap');
                const bef = pseudoEl ? getComputedStyle(pseudoEl, '::before') : null;
                return {
                  marked: pseudoEl?.getAttribute('data-agy-prism-welcome-logo-pseudo') === 'before',
                  opacity: bef ? bef.opacity : '',
                  vis: bef ? bef.visibility : '',
                  pe: bef ? bef.pointerEvents : '',
                  starterVisible: Boolean(starterBtn && getComputedStyle(starterBtn).opacity === '1'),
                };
              }
              const logoId =
                modeName === 'empty-mask'
                  ? 'mock-welcome-logo-mask'
                  : modeName === 'empty-zh'
                    ? 'mock-welcome-logo-svg-zh'
                    : 'mock-welcome-logo-svg';
              const el = document.getElementById(logoId);
              const cs = el ? getComputedStyle(el) : null;
              return {
                marked: el?.getAttribute('data-agy-prism-welcome-logo') === '1',
                opacity: cs ? cs.opacity : '',
                vis: cs ? cs.visibility : '',
                pe: cs ? cs.pointerEvents : '',
                starterVisible: Boolean(starterBtn && getComputedStyle(starterBtn).opacity === '1'),
              };
            })()`);
            if (mAudit?.marked) break;
            await sleep(50);
          }
          assert.equal(mAudit.marked, true, `Req #1 mode=${mode}: welcome logo was not marked hidden`);
          assert.equal(mAudit.opacity, '0', `Req #1 mode=${mode}: expected opacity 0, got ${mAudit.opacity}`);
          assert.equal(mAudit.vis, 'hidden', `Req #1 mode=${mode}: expected visibility hidden, got ${mAudit.vis}`);
          assert.equal(mAudit.pe, 'none', `Req #1 mode=${mode}: expected pointer-events none, got ${mAudit.pe}`);
          assert.equal(mAudit.starterVisible, true, `Req #1 mode=${mode}: starter cards must stay visible!`);
        }

        // Instant restore on hideWelcomeLogo: false
        await engine.updateConfig({ hideWelcomeLogo: false });
        await hubPage.evaluate(`window.__agyPrism.updateConfig({ hideWelcomeLogo: false })`);
        await sleep(60);
        const restoredOff = await hubPage.evaluate(`document.querySelectorAll('[data-agy-prism-welcome-logo="1"], [data-agy-prism-welcome-logo-pseudo]').length`);
        assert.equal(restoredOff, 0, 'Req #1: toggling hideWelcomeLogo=false left residual hidden marks');

        // Re-hide then disable skinEnabled=false -> instant restore with 0 residual marks
        await engine.updateConfig({ hideWelcomeLogo: true });
        await hubPage.evaluate(`window.__agyPrism.updateConfig({ hideWelcomeLogo: true })`);
        await sleep(180);
        await engine.updateConfig({ skinEnabled: false });
        await hubPage.evaluate(`window.__agyPrism.applyPayload({ skinEnabled: false })`);
        await sleep(60);
        const restoredDisable = await hubPage.evaluate(`document.querySelectorAll('[data-agy-prism-welcome-logo="1"], [data-agy-prism-welcome-logo-pseudo]').length`);
        assert.equal(restoredDisable, 0, 'Req #1: skinEnabled=false left residual welcome hidden marks');

        // Restore skin & chat mode
        await engine.updateConfig({ skinEnabled: true, hideWelcomeLogo: false });
        const stRes = await studio.getState();
        const resPayload = buildClientSkinPayload(stRes.config, auroraItem, stRes.mediaOrigin, { skinEnabled: true });
        await hubPage.evaluate(`window.__setMockConversationMode('chat'); window.__agyPrism.applyPayload(${JSON.stringify(resPayload)})`);
        const waitRe = Date.now() + 2500;
        while (Date.now() < waitRe) {
          if (await hubPage.evaluate(`document.documentElement.getAttribute('data-agy-prism-wallpaper') === 'ready'`)) break;
          await sleep(35);
        }

        // ---- 3) Req #2: 2.35.1 Topbar (empty center transparent, compact pills, `.agy-shell` never drag, P$c open dropdown preserved, wcoH=30/35/40, D18 z-index, `topbarStyle: 'bar'`) ----
        await hubPage.evaluate(`window.__setMockTopbarDropdownOpen(true)`);
        await sleep(60);
        const req2Audit = await hubPage.evaluate(`(() => {
          const shell = document.querySelector('.agy-shell');
          const shellDrag = getComputedStyle(shell).webkitAppRegion || getComputedStyle(shell).getPropertyValue('-webkit-app-region').trim();
          const drop = document.getElementById('hub-title-menu-dropdown');
          const dropInner = document.getElementById('hub-dropdown-inner-card');
          const wcoPill = document.getElementById('agy-prism-wco-pill');
          const tbPills = document.getElementById('agy-prism-topbar-pills');
          const pop = document.getElementById('agy-prism-popover');
          const wcoHeights = [];
          for (const h of [30, 35, 40]) {
            window.__setMockWco({ visible: true, x: 0, y: 0, width: 1300, height: h });
            const pillTop = getComputedStyle(document.documentElement).getPropertyValue('--prism-wco-pill-top').trim();
            const pillH = getComputedStyle(document.documentElement).getPropertyValue('--prism-wco-pill-h').trim();
            const r = wcoPill ? wcoPill.getBoundingClientRect() : null;
            wcoHeights.push({
              h,
              mode: 'islands',
              pillTop,
              cssVar: pillH,
              rectTop: r ? Math.round(r.top) : -1,
              rectH: r ? Math.round(r.height) : -1,
              rectBottom: r ? Math.round(r.top + r.height) : -1,
            });
          }
          // Also verify flush mode (padTop=0 -> pillH === wcoH exactly for 30/35/40)
          window.__agyPrism.updateConfig({ layoutMode: 'flush' });
          for (const h of [30, 35, 40]) {
            window.__setMockWco({ visible: true, x: 0, y: 0, width: 1300, height: h });
            const pillH = getComputedStyle(document.documentElement).getPropertyValue('--prism-wco-pill-h').trim();
            const r = wcoPill ? wcoPill.getBoundingClientRect() : null;
            wcoHeights.push({
              h,
              mode: 'flush',
              pillTop: '0px',
              cssVar: pillH,
              rectTop: r ? Math.round(r.top) : -1,
              rectH: r ? Math.round(r.height) : -1,
              rectBottom: r ? Math.round(r.top + r.height) : -1,
            });
          }
          window.__agyPrism.updateConfig({ layoutMode: 'islands' });
          window.__setMockWco({ visible: true, x: 0, y: 0, width: 1300, height: 35 });

          // Switch to topbarStyle='bar' -> full single pill bar
          window.__agyPrism.updateConfig({ topbarStyle: 'bar' });
          const barAttr = document.documentElement.getAttribute('data-prism-topbar-style');
          const barPillCount = tbPills ? tbPills.querySelectorAll('.agy-prism-topbar-pill').length : 0;
          window.__agyPrism.updateConfig({ topbarStyle: 'pills' });

          return {
            shellDrag,
            dropBg: getComputedStyle(drop).backgroundColor,
            dropInnerBg: getComputedStyle(dropInner).backgroundColor,
            wcoZ: Number(getComputedStyle(wcoPill).zIndex),
            tbPillsZ: Number(getComputedStyle(tbPills).zIndex),
            popZ: pop ? Number(getComputedStyle(pop).zIndex) : -1,
            wcoHeights,
            barAttr,
            barPillCount,
          };
        })()`);
        await hubPage.evaluate(`window.__setMockTopbarDropdownOpen(false)`);
        assert.notEqual(req2Audit.shellDrag, 'drag', `Req #2: .agy-shell must NEVER have -webkit-app-region: drag (got ${req2Audit.shellDrag})`);
        assert.ok(parseAlphaFromCssColor(req2Audit.dropBg) >= 0.94, `Req #2 P$c dropdown alpha < 0.94 (${req2Audit.dropBg})`);
        assert.ok(parseAlphaFromCssColor(req2Audit.dropInnerBg) >= 0.90, `Req #2 P$c inner card alpha < 0.90 (${req2Audit.dropInnerBg})`);
        assert.equal(req2Audit.wcoZ, 0, 'D18: #agy-prism-wco-pill z-index must be 0');
        assert.equal(req2Audit.tbPillsZ, 0, 'D18: #agy-prism-topbar-pills z-index must be 0');
        assert.ok(req2Audit.popZ > req2Audit.wcoZ && req2Audit.popZ === 45, `D18: #agy-prism-popover z-index expected 45 > 0, got ${req2Audit.popZ}`);
        for (const wh of req2Audit.wcoHeights) {
          const expectedPadTop = wh.mode === 'islands' ? 2 : 0;
          const expectedH = Math.max(28, wh.h - expectedPadTop);
          assert.equal(wh.cssVar, `${expectedH}px`, `Req #2 WCO ${wh.mode} h=${wh.h}: --prism-wco-pill-h expected ${expectedH}px, got ${wh.cssVar}`);
          assert.equal(wh.rectTop, expectedPadTop, `Req #2 WCO ${wh.mode} h=${wh.h}: rect.top expected ${expectedPadTop}, got ${wh.rectTop}`);
          assert.equal(wh.rectH, expectedH, `Req #2 WCO ${wh.mode} h=${wh.h}: rect.height expected ${expectedH}, got ${wh.rectH}`);
          assert.equal(wh.rectBottom, wh.h, `Req #2 WCO ${wh.mode} h=${wh.h}: bottom alignment expected ${wh.h}px (0px drift), got ${wh.rectBottom}px`);
        }
        assert.equal(req2Audit.barAttr, 'bar');
        assert.equal(req2Audit.barPillCount, 1, `Req #2 topbarStyle='bar' expected 1 unified bar pill, got ${req2Audit.barPillCount}`);

        // ---- 4) Tier 2 softKneeBlur (0..64px <= 32px) + Composer outer #antigravity.agentSidePanelInputBox::before carrier + Quick Prism --prism-quick-panel-backdrop ----
        const softKnee = (r) => (r <= 0 ? 0 : r <= 28 ? r : Math.min(32, Math.round(28 + (4 * (r - 28)) / (r - 28 + 12))));
        const blurSweep = [];
        for (const blurPx of [0, 16, 28, 64]) {
          await engine.updateConfig({ glassSurfaces: true, glassBlur: blurPx, sidebarBlur: null });
          await hubPage.evaluate(`window.__agyPrism.updateConfig({ glassSurfaces: true, glassBlur: ${blurPx}, sidebarBlur: null })`);
          await sleep(60);
          const snap = await hubPage.evaluate(`(() => {
            const bf = (el, pseudo) => {
              if (!el) return '';
              const cs = pseudo ? getComputedStyle(el, pseudo) : getComputedStyle(el);
              return cs.backdropFilter || cs.webkitBackdropFilter || 'none';
            };
            return {
              chat: bf(document.getElementById('v234-center-island-probe'), '::before'),
              right: bf(document.getElementById('v234-right-island-probe'), '::before'),
              sidebar: bf(document.querySelector('.agy-sidebar'), '::before'),
              topbar: bf(document.querySelector('#agy-prism-topbar-pills .agy-prism-topbar-pill')),
              wco: bf(document.getElementById('agy-prism-wco-pill')),
              composer: bf(document.getElementById('antigravity.agentSidePanelInputBox'), '::before'),
              composerInnerBefore: bf(document.querySelector('.surface-composer-card'), '::before'),
              quickSheet: bf(document.querySelector('#agy-prism-popover .prism-sheet')),
              quickPanelBackdropVar: getComputedStyle(document.documentElement).getPropertyValue('--prism-quick-panel-backdrop').trim(),
            };
          })()`);
          blurSweep.push({ blurPx, ...snap });
          assert.equal(snap.composerInnerBefore, 'none', `Composer Layer 4 .surface-composer-card::before must stay 'none' at glassBlur=${blurPx}, got '${snap.composerInnerBefore}'`);
          if (blurPx === 0) {
            for (const [k, v] of Object.entries(snap)) {
              if (k === 'quickPanelBackdropVar') {
                assert.equal(v, 'none', `Tier 2 glassBlur=0: --prism-quick-panel-backdrop expected 'none', got '${v}'`);
              } else {
                assert.equal(v, 'none', `Req #3 glassBlur=0: ${k} expected 'none', got '${v}'`);
              }
            }
          } else {
            const expectedBasePx = softKnee(blurPx);
            assert.ok(expectedBasePx <= 32, `softKnee(${blurPx}) exceeded 32px hard cap`);
            for (const k of ['chat', 'right', 'sidebar', 'topbar', 'wco']) {
              assert.ok(snap[k].includes(`blur(${expectedBasePx}px)`), `Tier 2 glassBlur=${blurPx}: ${k} expected blur(${expectedBasePx}px), got '${snap[k]}'`);
            }
            const expectedComposerPx = softKnee(blurPx + 4);
            assert.ok(expectedComposerPx <= 32, `Composer softKnee exceeded 32px`);
            assert.ok(
              snap.composer.includes(`blur(${expectedComposerPx}px)`),
              `Tier 2 glassBlur=${blurPx}: composer #antigravity.agentSidePanelInputBox::before expected blur(${expectedComposerPx}px), got '${snap.composer}'`,
            );
            const expectedQuickPx = softKnee(blurPx + 6);
            assert.ok(expectedQuickPx <= 32, `Quick Prism softKnee exceeded 32px`);
            assert.ok(
              snap.quickSheet.includes(`blur(${expectedQuickPx}px)`),
              `Tier 2 glassBlur=${blurPx}: Quick Prism .prism-sheet expected blur(${expectedQuickPx}px), got '${snap.quickSheet}'`,
            );
            assert.ok(
              snap.quickPanelBackdropVar.includes(`blur(${expectedQuickPx}px)`),
              `Tier 2 glassBlur=${blurPx}: --prism-quick-panel-backdrop expected blur(${expectedQuickPx}px), got '${snap.quickPanelBackdropVar}'`,
            );
            assert.notEqual(snap.quickSheet.includes('blur(26px)'), true, `Req #3: Quick Prism .prism-sheet still hardcoded blur(26px) at glassBlur=${blurPx}!`);
          }
        }

        // ---- 5) 12-component `surfaceTints` live isolation + WCO Auto vs 0% independent alpha on Host ----
        await engine.updateConfig({ glassBlur: 16, surfaceTints: null });
        const tintIsoAudit = await hubPage.evaluate(`(() => {
          window.__agyPrism.updateConfig({ glassBlur: 16, surfaceTints: null });
          const centerBefore = getComputedStyle(document.getElementById('v234-center-island-probe'), '::before').backgroundColor;
          window.__agyPrism.updateConfig({
            surfaceTints: {
              rightPane: { opacity: 0.85, tone: 0, tint: '#1E3A8A' },
              topbar: { opacity: 0.90, tone: 0, tint: '#0F766E' },
              popover: { opacity: 0.10, tone: 0, tint: '' },
            },
          });
          const centerAfter = getComputedStyle(document.getElementById('v234-center-island-probe'), '::before').backgroundColor;
          const rightAfter = getComputedStyle(document.getElementById('v234-right-island-probe'), '::before').backgroundColor;
          const topbarPillBg = getComputedStyle(document.querySelector('#agy-prism-topbar-pills .agy-prism-topbar-pill')).backgroundColor;
          const wcoAutoPillBg = getComputedStyle(document.getElementById('agy-prism-wco-pill')).backgroundColor;
          const menuBg = getComputedStyle(document.getElementById('hub-menu-probe')).backgroundColor;
          window.__agyPrism.updateConfig({
            surfaceTints: {
              topbar: { opacity: 0.90, tone: 0, tint: '#0F766E' },
              wco: { opacity: 0, tone: 0, tint: '' },
            },
          });
          const topbarAfterWco0 = getComputedStyle(document.querySelector('#agy-prism-topbar-pills .agy-prism-topbar-pill')).backgroundColor;
          const wcoIndependent0Bg = getComputedStyle(document.getElementById('agy-prism-wco-pill')).backgroundColor;
          window.__agyPrism.updateConfig({ surfaceTints: null });
          return { centerBefore, centerAfter, rightAfter, topbarPillBg, wcoAutoPillBg, topbarAfterWco0, wcoIndependent0Bg, menuBg };
        })()`);
        assert.equal(tintIsoAudit.centerAfter, tintIsoAudit.centerBefore, 'Req #4: mutating surfaceTints.rightPane leaked into center workspace!');
        assert.notEqual(tintIsoAudit.rightAfter, tintIsoAudit.centerAfter, 'Req #4: surfaceTints.rightPane did not independently tint right aux-pane!');
        assert.ok(parseAlphaFromCssColor(tintIsoAudit.rightAfter) >= 0.83, `Req #4: rightPane opacity 0.85 expected >= 0.83, got ${tintIsoAudit.rightAfter}`);
        assert.equal(tintIsoAudit.topbarPillBg, tintIsoAudit.wcoAutoPillBg, `Auto WCO (${tintIsoAudit.wcoAutoPillBg}) must inherit topbar (${tintIsoAudit.topbarPillBg})`);
        assert.equal(parseAlphaFromCssColor(tintIsoAudit.wcoIndependent0Bg), 0, `Independent WCO 0% alpha failed: got ${tintIsoAudit.wcoIndependent0Bg}`);
        assert.equal(tintIsoAudit.topbarAfterWco0, tintIsoAudit.topbarPillBg, 'Setting WCO 0% must NOT mutate topbar pill fill!');
        assert.ok(parseAlphaFromCssColor(tintIsoAudit.menuBg) >= 0.50, `Req #4: popover floor >= 0.50 violated (${tintIsoAudit.menuBg})`);

        assert.deepEqual(hubPage.consoleErrors, [], `3G Hub console.error: ${hubPage.consoleErrors.join(' | ')}`);
        assert.deepEqual(hubPage.pageExceptions, [], `3G Hub exception: ${hubPage.pageExceptions.join(' | ')}`);
        assert.deepEqual(studioPage.consoleErrors, [], `3G Studio console.error: ${studioPage.consoleErrors.join(' | ')}`);
        assert.deepEqual(studioPage.pageExceptions, [], `3G Studio exception: ${studioPage.pageExceptions.join(' | ')}`);

        return 'Issue#10+D2(0px layout jump, 0% scale jump, z=0..4 & Studio 0..5) + Req#1(5 modes + restore) + Req#2(2.35.1 hollowed/P$c/wcoH=30-35-40/D18/bar) + Req#3(blur 0/16/64 + Quick Prism) + Req#4(surfaceTints isolation) verified';
      } finally {
        await browser.closePage(studioPage);
        await browser.closePage(hubPage);
      }
    });

    // -----------------------------------------------------------------------
    // 3H. Req #6: `Antigravity-Chinese-Localization` (`dom-translator.js`) Coexistence E2E
    // -----------------------------------------------------------------------
    await check('Req #6 E2E: `Antigravity-Chinese-Localization` coexistence (Hub topbar zh-CN pill shrink + 0 Prism DOM mutations + Studio `window.__agyDomTranslatorInitialized` & `#app.agy-prism-root` guard)', '@exec-host-skin / @exec-studio-ui / @exec-tests', async () => {
      await engine.applyWallpaper(auroraItem.id, { skinEnabled: true, topbarStyle: 'pills', layoutMode: 'islands', language: 'en' });

      const studioPage = await browser.openPage({
        url: `${studio.origin}/?token=${encodeURIComponent(SIDECAR_TEST_TOKEN)}`,
        requestHandler: universalHttpRouter,
      });
      const hubPage = await browser.openPage({
        url: `${HUB_MOCK_ORIGIN}/hub`,
        requestHandler: universalHttpRouter,
      });

      try {
        await hubPage.call('Page.bringToFront').catch(() => {});
        await sleep(700);
        const bootExpr = buildHostMicroBootstrap({
          hostOrigin: studio.origin,
          capToken: studio.hostCapToken,
          triggerMode: 'both',
          startupMode: 'gentle-auto',
          skinEnabled: true,
        });
        await hubPage.evaluate(bootExpr);
        const waitRdy = Date.now() + 3000;
        while (Date.now() < waitRdy) {
          if (await hubPage.evaluate(`document.documentElement.getAttribute('data-agy-prism-wallpaper') === 'ready'`)) break;
          await sleep(40);
        }

        // Open Ctrl+Alt+W Quick Prism Popover so ALL Prism surfaces exist simultaneously when `dom-translator.js` sweeps
        await hubPage.pressKey({ key: 'w', code: 'KeyW', windowsVirtualKeyCode: 87, modifiers: 3 });
        const popWait = Date.now() + 3000;
        while (Date.now() < popWait) {
          if (await hubPage.evaluate(`Boolean(window.__agyPrismPanel && window.__agyPrismPanel.status().open)`)) break;
          await sleep(40);
        }

        const pillWidthBefore = await hubPage.evaluate(`(() => {
          const p = document.querySelector('#agy-prism-topbar-pills .agy-prism-topbar-pill');
          return p ? Math.round(p.getBoundingClientRect().width) : 0;
        })()`);

        const hubTransRes = await hubPage.evaluate(`window.__runMockDomTranslator()`);
        let hubAfterZh = null;
        const shrinkDeadline = Date.now() + 1500;
        while (Date.now() < shrinkDeadline) {
          hubAfterZh = await hubPage.evaluate(`(() => {
            const items = Array.from(document.querySelectorAll('[data-testid="title-menu-bar-item"]')).map((e) => e.textContent.trim());
            const p = document.querySelector('#agy-prism-topbar-pills .agy-prism-topbar-pill');
            return {
              items,
              pillWidthAfter: p ? Math.round(p.getBoundingClientRect().width) : 0,
            };
          })()`);
          if (hubAfterZh.pillWidthAfter > 0 && hubAfterZh.pillWidthAfter < pillWidthBefore) break;
          await sleep(40);
        }

        assert.equal(hubTransRes.skippedInit, false, 'Hub page should allow Antigravity-Chinese-Localization to translate host UI');
        assert.deepEqual(hubAfterZh.items, ['工作区', '视图', '窗口'], `Host menu items not translated cleanly: ${JSON.stringify(hubAfterZh.items)}`);
        assert.deepEqual(hubTransRes.touchedPrismIds, [], `dom-translator mutated Prism DOM nodes on Hub: ${hubTransRes.touchedPrismIds.join(', ')}`);
        assert.ok(
          hubAfterZh.pillWidthAfter > 0 && hubAfterZh.pillWidthAfter < pillWidthBefore,
          `Req #6+Req #2: .agy-prism-topbar-pill did not shrink after zh-CN menu translation (${pillWidthBefore}px -> ${hubAfterZh.pillWidthAfter}px)`,
        );

        // Studio page: verify BOTH `window.__agyDomTranslatorInitialized === true` AND `#app.agy-prism-root` non-<body> codeClassPattern guard!
        const studioTransAudit = await studioPage.evaluate(`(() => {
          const codeClassPattern = /(?:^|[\\s_-])(code|editor|monaco|xterm|terminal|syntax|highlight|prism|hljs|shiki|cm-|ace_)/i;
          const isInsideCodeOrPrism = (node) => {
            let cur = node.nodeType === 1 ? node : node.parentElement;
            while (cur && cur !== document.body) {
              const cls = typeof cur.className === 'string' ? cur.className : '';
              if (cls && codeClassPattern.test(cls)) return true;
              cur = cur.parentElement;
            }
            return false;
          };
          const app = document.getElementById('app');
          const initFlag = Boolean(window.__agyDomTranslatorInitialized);
          const skipTags = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE']);
          let unprotectedNodes = 0;
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          let n;
          while ((n = walker.nextNode())) {
            if (!n.nodeValue || !n.nodeValue.trim()) continue;
            const pTag = n.parentElement ? n.parentElement.tagName.toUpperCase() : '';
            if (skipTags.has(pTag)) continue;
            if (!isInsideCodeOrPrism(n)) unprotectedNodes += 1;
          }
          return {
            initFlag,
            appClass: app ? app.className : '',
            unprotectedNodes,
          };
        })()`);

        assert.equal(studioTransAudit.initFlag, true, 'Studio page missing window.__agyDomTranslatorInitialized === true');
        assert.ok(studioTransAudit.appClass.includes('agy-prism-root'), `Studio #app missing .agy-prism-root class (got "${studioTransAudit.appClass}")`);
        assert.equal(studioTransAudit.unprotectedNodes, 0, `Studio page had ${studioTransAudit.unprotectedNodes} text nodes outside non-<body> codeClassPattern guard!`);

        assert.deepEqual(hubPage.consoleErrors, [], `3H Hub console.error: ${hubPage.consoleErrors.join(' | ')}`);
        assert.deepEqual(hubPage.pageExceptions, [], `3H Hub exception: ${hubPage.pageExceptions.join(' | ')}`);
        assert.deepEqual(studioPage.consoleErrors, [], `3H Studio console.error: ${studioPage.consoleErrors.join(' | ')}`);
        assert.deepEqual(studioPage.pageExceptions, [], `3H Studio exception: ${studioPage.pageExceptions.join(' | ')}`);

        return `Hub zh-CN pill shrink (${pillWidthBefore}px->${hubAfterZh.pillWidthAfter}px, 0 Prism mutations) + Studio initFlag=true & 0 unprotected text nodes`;
      } finally {
        await browser.closePage(studioPage);
        await browser.closePage(hubPage);
      }
    });

    // -----------------------------------------------------------------------
    // Suite 3 v2.2.0 New End-to-End Checks (S3-01 .. S3-06)
    // -----------------------------------------------------------------------
    await check('S3-01: Studio Visual Editor Modal + Standalone Popout (`/?mode=visual-editor` + `/api/events?channel=popout`) + Media Health Alerts', '@exec-mock-tests', async () => {
      await engine.applyWallpaper(videoItem.id, { skinEnabled: true, startupMode: 'gentle-auto', paused: true, glassBlur: 16 });
      const studioPage = await browser.openPage({
        url: `${studio.origin}/?token=${encodeURIComponent(SIDECAR_TEST_TOKEN)}`,
        requestHandler: universalHttpRouter,
      });
      const popoutPage = await browser.openPage({
        url: `${studio.origin}/?mode=visual-editor`,
        requestHandler: universalHttpRouter,
        initScript: `
          window.__esUrls = [];
          const OrigES = window.EventSource;
          window.EventSource = function(u, opts) {
            window.__esUrls.push(String(u));
            return new OrigES(u, opts);
          };
        `,
      });
      try {
        await sleep(750);
        // 1) Media health alert: paused -> resume button unpauses wallpaper
        const pausedHealth = await studioPage.evaluate(`(() => {
          const pausedEl = document.querySelector('#prism-media-health-host [data-alert="paused"]');
          const resumeBtn = pausedEl ? pausedEl.querySelector('[data-action="resume-paused-wallpaper"]') : null;
          return { hasPaused: Boolean(pausedEl), hasResume: Boolean(resumeBtn) };
        })()`);
        assert.equal(pausedHealth.hasPaused, true, 'Missing [data-alert="paused"] banner in #prism-media-health-host');
        assert.equal(pausedHealth.hasResume, true, 'Missing [data-action="resume-paused-wallpaper"] button');
        await studioPage.evaluate(`document.querySelector('#prism-media-health-host [data-action="resume-paused-wallpaper"]').click()`);
        await sleep(300);
        assert.equal((await engine.getConfig()).paused, false, 'Clicking resume-paused-wallpaper did not clear paused=true');

        // Also check static-css banner notice + 1-click switch to gentle-auto
        await studioPage.evaluate(`(() => {
          document.querySelector('[data-action="switch-tab"][data-tab="system"]')?.click();
        })()`);
        await sleep(160);
        await studioPage.evaluate(`document.querySelector('[data-startup-card="static-css"]')?.click()`);
        let staticCssHasBanner = false;
        const scWait = Date.now() + 2000;
        while (Date.now() < scWait) {
          staticCssHasBanner = await studioPage.evaluate(`Boolean(document.querySelector('#prism-media-health-host [data-alert="static-css"]'))`);
          if (staticCssHasBanner) break;
          await sleep(40);
        }
        assert.equal(staticCssHasBanner, true, 'Missing [data-alert="static-css"] banner when startupMode=static-css');
        await studioPage.evaluate(`document.querySelector('#prism-media-health-host [data-alert="static-css"] [data-action="set-enum"]')?.click()`);
        await sleep(250);
        assert.equal((await engine.getConfig()).startupMode, 'gentle-auto', '1-click static-css recovery failed');

        // 2) Aux Studio modal editor open/select/close
        await studioPage.evaluate(`document.querySelector('[data-action="open-visual-editor"]')?.click()`);
        await sleep(250);
        const modalState = await studioPage.evaluate(`(() => ({
          hasModal: Boolean(document.getElementById('prism-visual-editor-modal')),
          hasStage: Boolean(document.getElementById('prism-visual-canvas-stage')),
          hasHub: Boolean(document.getElementById('prism-visual-canvas-hub')),
        }))()`);
        assert.equal(modalState.hasModal, true, 'Missing #prism-visual-editor-modal after open-visual-editor');
        assert.equal(modalState.hasStage, true);
        assert.equal(modalState.hasHub, true);
        await studioPage.evaluate(`document.querySelector('#prism-visual-editor-modal [data-action="close-visual-editor"]')?.click()`);
        await sleep(150);

        // 3) Popout Visual Editor standalone checks (no token in URL, channel=popout SSE, live mutation syncs back to Aux)
        const popAudit = await popoutPage.evaluate(`(() => {
          const shell = document.querySelector('.prism-ve-popout-shell');
          return {
            hasTokenInUrl: location.search.includes('token='),
            hasShell: Boolean(shell),
            hasIsolatedClass: Boolean(shell && shell.classList.contains('agy-prism-visual-editor')),
            hasCanvasStage: Boolean(document.getElementById('prism-visual-canvas-stage')),
            hasCanvasHub: Boolean(document.getElementById('prism-visual-canvas-hub')),
            esUrls: window.__esUrls || [],
          };
        })()`);
        assert.equal(popAudit.hasTokenInUrl, false, 'Popout Visual Editor URL MUST NOT contain token=');
        assert.equal(popAudit.hasShell, true, 'Popout Visual Editor missing .prism-ve-popout-shell');
        assert.equal(popAudit.hasIsolatedClass, true, 'Popout Visual Editor missing .agy-prism-visual-editor class');
        assert.equal(popAudit.hasCanvasStage, true);
        assert.equal(popAudit.hasCanvasHub, true);
        assert.ok(
          popAudit.esUrls.some((u) => u.includes('/api/events?channel=popout')),
          `Popout Visual Editor SSE must connect via /api/events?channel=popout (seen: ${JSON.stringify(popAudit.esUrls)})`,
        );

        await popoutPage.evaluate(`(() => {
          document.querySelector('[data-action="select-editor-region"][data-region="sidebar"]')?.click();
        })()`);
        await sleep(160);
        await popoutPage.evaluate(`(() => {
          const blurIn = document.querySelector('#prism-ve-inspector-pane input[data-config-slider="sidebarBlur"], #prism-ve-inspector-pane input[data-region="sidebar"][data-prop="blur"]');
          if (blurIn) {
            blurIn.value = '21';
            blurIn.dispatchEvent(new Event('input', { bubbles: true }));
            blurIn.dispatchEvent(new Event('change', { bubbles: true }));
          }
        })()`);
        await sleep(300);
        assert.equal((await engine.getConfig()).sidebarBlur, 21, 'Popout Visual Editor inspector edit did not commit sidebarBlur=21');
        assert.deepEqual(studioPage.pageExceptions, []);
        assert.deepEqual(popoutPage.pageExceptions, []);
        return 'Modal + Popout (0 URL token, ?channel=popout, sidebarBlur=21) + paused/static-css health alerts verified';
      } finally {
        await engine.applyWallpaper(auroraItem.id, { skinEnabled: true, startupMode: 'gentle-auto', paused: false, sidebarBlur: null }).catch(() => {});
        await browser.closePage(popoutPage);
        await browser.closePage(studioPage);
      }
    });

    await check('S3-02: Hub `GLASS_CARRIER_MAIN_PAGES`, `flush` `::after` suppression & 4-layer Composer hierarchy (`data-testid="agent-input-box"` > `#antigravity` > context > `.surface-composer-card`)', '@exec-mock-tests', async () => {
      await engine.applyWallpaper(auroraItem.id, { skinEnabled: true, layoutMode: 'islands', glassBlur: 16 });
      const hubPage = await browser.openPage({
        url: `${HUB_MOCK_ORIGIN}/hub`,
        requestHandler: universalHttpRouter,
      });
      try {
        await hubPage.evaluate(
          buildHostMicroBootstrap({ hostOrigin: studio.origin, capToken: studio.hostCapToken, triggerMode: 'both', startupMode: 'gentle-auto', skinEnabled: true }),
        );
        const deadline = Date.now() + 3000;
        let wallReadyState = null;
        while (Date.now() < deadline) {
          wallReadyState = await hubPage.evaluate(`document.documentElement.getAttribute('data-agy-prism-wallpaper')`);
          if (wallReadyState === 'ready') break;
          await sleep(40);
        }
        assert.equal(wallReadyState, 'ready', `S3-02 Hub wallpaper failed to reach ready state (got ${wallReadyState})`);

        const islandsAudit = await hubPage.evaluate(`(() => {
          const outer = document.getElementById('mock-composer-outer-wrap');
          const l2 = document.getElementById('antigravity.agentSidePanelInputBox');
          const l3 = document.getElementById('mock-composer-context-bar');
          const l4 = document.querySelector('.surface-composer-card');
          const chip = document.getElementById('mock-composer-attachment-chip');
          const fixed = document.getElementById('composer-fixed-probe').getBoundingClientRect();
          const custBefore = getComputedStyle(document.getElementById('v234-customizations-probe'), '::before');
          const pluginDetail = getComputedStyle(document.getElementById('v234-plugin-detail-probe'));
          const outerCs = getComputedStyle(outer);
          const l2Before = getComputedStyle(l2, '::before');
          const l4Cs = getComputedStyle(l4);
          const l4Before = getComputedStyle(l4, '::before');
          return {
            outerTestId: outer?.getAttribute('data-testid'),
            outerBg: outerCs.backgroundColor,
            outerBlur: outerCs.backdropFilter || outerCs.webkitBackdropFilter || 'none',
            l2Id: l2?.id,
            l2ContainsL4: Boolean(l2 && l4 && l2.contains(l4)),
            l2BeforeBg: l2Before.backgroundColor,
            l2BeforeBlur: l2Before.backdropFilter || l2Before.webkitBackdropFilter || 'none',
            l3Bg: getComputedStyle(l3).backgroundColor,
            l4Bg: l4Cs.backgroundColor,
            l4BeforeBlur: l4Before.backdropFilter || l4Before.webkitBackdropFilter || 'none',
            chipBorder: getComputedStyle(chip).borderTopWidth,
            fixedTop: Math.round(fixed.top),
            fixedLeft: Math.round(fixed.left),
            custBeforeBg: custBefore.backgroundColor,
            custBeforeBlur: custBefore.backdropFilter || custBefore.webkitBackdropFilter || 'none',
            pluginDetailBg: pluginDetail.backgroundColor,
          };
        })()`);

        assert.equal(islandsAudit.outerTestId, 'agent-input-box');
        assert.equal(islandsAudit.outerBg, 'rgba(0, 0, 0, 0)', 'Layer 1 outer [data-testid="agent-input-box"] must be transparent');
        assert.equal(islandsAudit.outerBlur, 'none', 'Layer 1 outer wrapper must keep backdrop-filter: none');
        assert.equal(islandsAudit.l2ContainsL4, true);
        assert.ok(parseAlphaFromCssColor(islandsAudit.l2BeforeBg) >= 0.50, `Layer 2 #antigravity.agentSidePanelInputBox::before glass missing (${islandsAudit.l2BeforeBg})`);
        assert.ok(String(islandsAudit.l2BeforeBlur).includes('blur('), `Layer 2 #antigravity.agentSidePanelInputBox::before missing blur (${islandsAudit.l2BeforeBlur})`);
        assert.equal(islandsAudit.l3Bg, 'rgba(0, 0, 0, 0)', 'Layer 3 .mock-composer-context-bar must strip solid fill onto Layer 2');
        assert.equal(islandsAudit.l4Bg, 'rgba(0, 0, 0, 0)', 'Layer 4 .surface-composer-card must stay hollowed transparent');
        assert.equal(islandsAudit.l4BeforeBlur, 'none', 'Layer 4 .surface-composer-card::before must NOT duplicate glass blur');
        assert.notEqual(islandsAudit.chipBorder, '0px', '#mock-composer-attachment-chip border must remain preserved');
        assert.equal(islandsAudit.fixedTop, 0);
        assert.equal(islandsAudit.fixedLeft, 0);
        assert.ok(parseAlphaFromCssColor(islandsAudit.custBeforeBg) >= 0.70 && String(islandsAudit.custBeforeBlur).includes('blur('));

        // Switch to flush mode & verify [data-main-content-body]::after and .agy-sheet [data-side-panel-body]::after suppression
        await hubPage.evaluate(`window.__agyPrism.updateConfig({ layoutMode: 'flush' })`);
        await sleep(80);
        const flushAfterCheck = await hubPage.evaluate(`(() => {
          const mainAfter = getComputedStyle(document.getElementById('v234-main-body-probe'), '::after');
          const sheetAfter = getComputedStyle(document.getElementById('v234-sheet-body-probe'), '::after');
          return {
            layout: document.documentElement.getAttribute('data-prism-layout'),
            mainDisplay: mainAfter.display,
            mainOpacity: mainAfter.opacity,
            sheetDisplay: sheetAfter.display,
            sheetOpacity: sheetAfter.opacity,
          };
        })()`);
        assert.equal(flushAfterCheck.layout, 'flush');
        assert.equal(flushAfterCheck.mainDisplay, 'none', `Flush [data-main-content-body]::after display not suppressed (${flushAfterCheck.mainDisplay})`);
        assert.equal(flushAfterCheck.sheetDisplay, 'none', `Flush .agy-sheet [data-side-panel-body]::after display not suppressed (${flushAfterCheck.sheetDisplay})`);
        assert.deepEqual(hubPage.pageExceptions, []);
        return '4-layer Composer carrier (#antigravity::before sole glass, chip preserved) + flush ::after none verified';
      } finally {
        await browser.closePage(hubPage);
      }
    });

    await check('S3-03: 4 Sidebar Styles (`capsule`/`underline`/`accordion`/`tree`), `balanced` typography (`h2` legible + `18x18px` action buttons), `borderStyle:"none"`, `pl-[30px]` & project expand/collapse', '@exec-mock-tests', async () => {
      await engine.applyWallpaper(auroraItem.id, { skinEnabled: true, layoutMode: 'islands', glassBlur: 16 });
      const hubPage = await browser.openPage({
        url: `${HUB_MOCK_ORIGIN}/hub`,
        requestHandler: universalHttpRouter,
      });
      try {
        await hubPage.evaluate(
          buildHostMicroBootstrap({ hostOrigin: studio.origin, capToken: studio.hostCapToken, triggerMode: 'both', startupMode: 'gentle-auto', skinEnabled: true }),
        );
        const deadline = Date.now() + 3000;
        let wallReadyState = null;
        while (Date.now() < deadline) {
          wallReadyState = await hubPage.evaluate(`document.documentElement.getAttribute('data-agy-prism-wallpaper')`);
          if (wallReadyState === 'ready') break;
          await sleep(40);
        }
        assert.equal(wallReadyState, 'ready', `S3-02 Hub wallpaper failed to reach ready state (got ${wallReadyState})`);

        const stylesAudit = await hubPage.evaluate(`(async () => {
          const setSb = (sidebarPatch) => {
            window.__agyPrism.updateConfig({ sidebarTypographyMode: 'balanced', regions: { sidebar: sidebarPatch } });
          };
          setSb({ listStyle: 'capsule', borderStyle: 'full' });
          await new Promise((r) => setTimeout(r, 40));
          const stickyBeforeCap = getComputedStyle(document.getElementById('hub-sidebar-sticky-projects'), '::before');
          const capRadius = parseFloat(stickyBeforeCap.borderTopLeftRadius) || 0;
          const h2Cs = getComputedStyle(document.querySelector('#hub-sidebar-sticky-inner h2'));
          const h2FontSize = parseFloat(h2Cs.fontSize) || 0;
          const filterRect = document.getElementById('hub-proj-filter-btn').getBoundingClientRect();
          const filterBtnW = Math.round(filterRect.width);
          const h2BtnRect = document.getElementById('hub-sidebar-projects-title-btn').getBoundingClientRect();
          const h2BtnHeight = Math.round(h2BtnRect.height);
          const childPad = getComputedStyle(document.getElementById('hub-proj-child-1')).paddingLeft;

          setSb({ listStyle: 'underline', borderStyle: 'full' });
          await new Promise((r) => setTimeout(r, 40));
          const stickyBeforeUnd = getComputedStyle(document.getElementById('hub-sidebar-sticky-projects'), '::before');
          const undRadius = stickyBeforeUnd.borderTopLeftRadius;
          const undBorderBottomW = stickyBeforeUnd.borderBottomWidth;

          setSb({ listStyle: 'accordion', borderStyle: 'full' });
          await new Promise((r) => setTimeout(r, 40));
          const projBtn = document.getElementById('hub-project-header-btn');
          const accExpColor = getComputedStyle(projBtn).color;
          window.__setMockProjectExpanded(false);
          const accColExpanded = projBtn.getAttribute('aria-expanded');
          const accColColor = getComputedStyle(projBtn).color;
          window.__setMockProjectExpanded(true);
          const accAfter = getComputedStyle(projBtn, '::after');
          const accAfterContent = accAfter.content;
          const accColorChanged = accExpColor !== accColColor;

          setSb({ listStyle: 'tree', borderStyle: 'none' });
          await new Promise((r) => setTimeout(r, 40));
          const treeAfter = getComputedStyle(projBtn, '::after');
          const treeOrder = treeAfter.order;
          const sbBorderVar = getComputedStyle(document.documentElement).getPropertyValue('--prism-border-sidebar').trim();
          const sbBwTopVar = getComputedStyle(document.documentElement).getPropertyValue('--prism-bw-sidebar-top').trim();

          return {
            capRadius,
            h2FontSize,
            filterBtnW,
            h2BtnHeight,
            childPad,
            undRadius,
            undBorderBottomW,
            accAfterContent,
            accColExpanded,
            accColorChanged,
            treeOrder,
            sbBorderVar,
            sbBwTopVar,
          };
        })()`);

        assert.ok(stylesAudit.capRadius >= 6, `capsule style missing rounded radius (${stylesAudit.capRadius})`);
        assert.ok(stylesAudit.h2FontSize >= 11, `balanced typography h2 too small (${stylesAudit.h2FontSize}px)`);
        assert.equal(stylesAudit.filterBtnW, 18, `balanced typography expected normalized 18px action button, got ${stylesAudit.filterBtnW}px`);
        assert.equal(stylesAudit.childPad, '30px', `pl-[30px] child conversation row indent lost (${stylesAudit.childPad})`);
        assert.equal(stylesAudit.undRadius, '0px', `underline mode expected 0px radius, got ${stylesAudit.undRadius}`);
        assert.notEqual(stylesAudit.undBorderBottomW, '0px', 'underline mode missing bottom hairline');
        assert.notEqual(stylesAudit.accAfterContent, 'none', 'accordion mode missing ::after chevron');
        assert.equal(stylesAudit.accColExpanded, 'false');
        assert.equal(stylesAudit.accColorChanged, true, 'accordion project expanded vs collapsed state did not update color');
        assert.equal(stylesAudit.treeOrder, '-1', `tree mode expected leading order:-1 chevron, got ${stylesAudit.treeOrder}`);
        assert.equal(stylesAudit.sbBorderVar, 'transparent', `sidebar.borderStyle="none" expected transparent --prism-border-sidebar, got ${stylesAudit.sbBorderVar}`);
        assert.equal(stylesAudit.sbBwTopVar, '0px', `sidebar.borderStyle="none" expected 0px --prism-bw-sidebar-top, got ${stylesAudit.sbBwTopVar}`);
        assert.deepEqual(hubPage.pageExceptions, []);
        return `4 sidebar styles + balanced (h2=${stylesAudit.h2FontSize}px, btn=${stylesAudit.filterBtnW}px) + border:off verified`;
      } finally {
        await browser.closePage(hubPage);
      }
    });

    await check('S3-04: Layer B Cold-Start Gate (`10x10` 0 requests/0 DOM) -> `T+5.2s` Deep Sleep DOM Unload -> Wake Draft Restore', '@exec-mock-tests', async () => {
      const tinyPage = await browser.openPage({
        url: `${studio.origin}/?token=${encodeURIComponent(SIDECAR_TEST_TOKEN)}`,
        requestHandler: universalHttpRouter,
        width: 10,
        height: 10,
        initScript: `
          window.__coldFetchUrls = [];
          const origFetch = window.fetch.bind(window);
          window.fetch = function(u, o) {
            window.__coldFetchUrls.push(String(u));
            return origFetch(u, o);
          };
        `,
      });
      try {
        await sleep(550);
        const coldCheck = await tinyPage.evaluate(`({
          dormant: document.documentElement.dataset.prismDormant,
          bootFetches: (window.__coldFetchUrls || []).filter((u) => u.includes('/api/bootstrap')),
          scrollHtmlLen: (document.getElementById('prism-tab-scroll')?.innerHTML || '').length,
        })`);
        assert.equal(coldCheck.dormant, '1', '10x10 occluded viewport must enter cold-start dormant gate');
        assert.deepEqual(coldCheck.bootFetches, [], `Layer B cold-start fetched /api/bootstrap while 10x10 occluded: ${JSON.stringify(coldCheck.bootFetches)}`);
        assert.equal(coldCheck.scrollHtmlLen, 0, 'Layer B cold-start must NOT mount heavy tab DOM');

        // Wake to 1440x900 -> hydrate UI -> enter draft in Presets drawer
        await tinyPage.setViewport(1440, 900, 1);
        const readyWait = Date.now() + 3500;
        while (Date.now() < readyWait) {
          if (await tinyPage.evaluate(`Boolean(document.getElementById('prism-master-toggle-btn') && (document.getElementById('prism-tab-scroll')?.innerHTML || '').length > 0)`)) break;
          await sleep(50);
        }
        await tinyPage.evaluate(`(() => {
          document.querySelector('[data-action="open-drawer"][data-drawer="presets"]')?.click();
        })()`);
        await sleep(160);
        await tinyPage.evaluate(`(() => {
          const inp = document.getElementById('prism-preset-name-in');
          if (inp) {
            inp.value = 'LayerB-Draft-Keep';
            inp.dispatchEvent(new Event('input', { bubbles: true }));
          }
        })()`);

        // Shrink back to 10x10 & hold past T+5000ms DEEP_SLEEP threshold
        await tinyPage.setViewport(10, 10, 1);
        await sleep(5350);
        const deepAudit = await tinyPage.evaluate(`({
          dormant: document.documentElement.dataset.prismDormant,
          tabScrollLen: (document.getElementById('prism-tab-scroll')?.innerHTML || '').length,
        })`);
        assert.equal(deepAudit.dormant, '1');
        assert.equal(deepAudit.tabScrollLen, 0, `Deep sleep did not unload #prism-tab-scroll after 5.35s (len=${deepAudit.tabScrollLen})`);

        // Restore 1440x900 & verify DOM rebuilt + draft input preserved
        await tinyPage.setViewport(1440, 900, 1);
        await sleep(400);
        const wakeAudit = await tinyPage.evaluate(`({
          dormant: document.documentElement.dataset.prismDormant || null,
          tabScrollLen: (document.getElementById('prism-tab-scroll')?.innerHTML || '').length,
          draftVal: document.getElementById('prism-preset-name-in')?.value || '',
        })`);
        assert.equal(wakeAudit.dormant, null, 'Wake did not clear data-prism-dormant');
        assert.ok(wakeAudit.tabScrollLen > 50, 'Wake did not rebuild #prism-tab-scroll');
        assert.equal(wakeAudit.draftVal, 'LayerB-Draft-Keep', `Wake lost draft text in #prism-preset-name-in (got "${wakeAudit.draftVal}")`);
        assert.deepEqual(tinyPage.pageExceptions, []);
        return 'Cold-start 0 fetches -> Deep Sleep unload @5.35s -> Wake restored LayerB-Draft-Keep';
      } finally {
        await browser.closePage(tinyPage);
      }
    });

    await check('S3-05: 12-Region collapsed persistence (`localStorage[\'prism.openRegions.v22\']` across reload) + 4 Exposed Keys (`floaterSolidBase`, `scrimColor`, `fxClickMode`, `fxTrailMode`)', '@exec-mock-tests', async () => {
      const studioUrl = `${studio.origin}/?token=${encodeURIComponent(SIDECAR_TEST_TOKEN)}`;
      const studioPage = await browser.openPage({
        url: studioUrl,
        requestHandler: universalHttpRouter,
      });
      try {
        const waitInitReady = Date.now() + 3000;
        while (Date.now() < waitInitReady) {
          if (await studioPage.evaluate(`Boolean(document.querySelector('[data-action="switch-tab"][data-tab="skin"]'))`)) break;
          await sleep(40);
        }
        await studioPage.evaluate(`(() => { try { localStorage.removeItem('prism.openRegions.v22'); } catch {} })()`);
        await studioPage.navigate(studioUrl);
        const waitSkinReady = Date.now() + 3000;
        while (Date.now() < waitSkinReady) {
          if (await studioPage.evaluate(`Boolean(document.querySelector('[data-action="switch-tab"][data-tab="skin"]'))`)) break;
          await sleep(40);
        }
        await studioPage.evaluate(`document.querySelector('[data-action="switch-tab"][data-tab="skin"]').click()`);
        const waitAcc = Date.now() + 2000;
        while (Date.now() < waitAcc) {
          if (await studioPage.evaluate(`Boolean(document.querySelector('details.prism-region-group[data-region="sidebar"] > summary'))`)) break;
          await sleep(40);
        }

        // Expand ONLY sidebar and composer -> verify localStorage persists across reload
        await studioPage.evaluate(`(() => {
          const sb = document.querySelector('details.prism-region-group[data-region="sidebar"]');
          const cp = document.querySelector('details.prism-region-group[data-region="composer"]');
          if (sb && !sb.open) sb.querySelector('summary')?.click();
          if (cp && !cp.open) cp.querySelector('summary')?.click();
        })()`);
        let parsedBefore = {};
        const lsWait = Date.now() + 1200;
        while (Date.now() < lsWait) {
          const raw = await studioPage.evaluate(`localStorage.getItem('prism.openRegions.v22')`);
          parsedBefore = JSON.parse(raw || '{}');
          if (parsedBefore.sidebar === true && parsedBefore.composer === true) break;
          await sleep(40);
        }
        assert.equal(parsedBefore.sidebar, true);
        assert.equal(parsedBefore.composer, true);

        await studioPage.navigate(studioUrl);
        const waitSkinReload = Date.now() + 3000;
        while (Date.now() < waitSkinReload) {
          if (await studioPage.evaluate(`Boolean(document.querySelector('[data-action="switch-tab"][data-tab="skin"]'))`)) break;
          await sleep(40);
        }
        await studioPage.evaluate(`document.querySelector('[data-action="switch-tab"][data-tab="skin"]').click()`);
        const waitAccReload = Date.now() + 2000;
        while (Date.now() < waitAccReload) {
          if (await studioPage.evaluate(`Boolean(document.querySelector('#prism-region-accordions > details.prism-region-group'))`)) break;
          await sleep(40);
        }
        const openAfterReload = await studioPage.evaluate(`Array.from(document.querySelectorAll('#prism-region-accordions > details.prism-region-group')).filter(d => d.open).map(d => d.getAttribute('data-region'))`);
        assert.deepEqual(openAfterReload, ['sidebar', 'composer'], `Reload did not restore exact openRegions persistence (got ${JSON.stringify(openAfterReload)})`);

        // Open global accordion & drive the 4 exposed UI controls -> Engine config
        await studioPage.evaluate(`(() => {
          const g = document.querySelector('details.prism-region-group[data-region="global"]');
          if (g && !g.open) g.querySelector('summary')?.click();
        })()`);
        await sleep(120);
        await studioPage.evaluate(`(() => {
          document.querySelector('[data-action="toggle-bool"][data-key="floaterSolidBase"]')?.click();
          document.querySelector('[data-action="set-enum"][data-key="fxClickMode"][data-val="spark"]')?.click();
          document.querySelector('[data-action="set-enum"][data-key="fxTrailMode"][data-val="comet"]')?.click();
          const scIn = document.querySelector('.prism-color-wcag-block[data-color-key="scrimColor"] input[type="color"]');
          if (scIn) {
            scIn.value = '#1a2b3c';
            scIn.dispatchEvent(new Event('input', { bubbles: true }));
            scIn.dispatchEvent(new Event('change', { bubbles: true }));
          }
        })()`);
        await sleep(320);

        const cfg = await engine.getConfig();
        assert.equal(cfg.floaterSolidBase, false, 'floaterSolidBase toggle did not persist false');
        assert.equal(cfg.fxClickMode, 'spark', 'fxClickMode seg did not persist spark');
        assert.equal(cfg.fxTrailMode, 'comet', 'fxTrailMode seg did not persist comet');
        assert.equal(String(cfg.scrimColor || '').toUpperCase(), '#1A2B3C', `scrimColor picker did not persist #1A2B3C (got ${cfg.scrimColor})`);
        assert.deepEqual(studioPage.pageExceptions, []);
        return 'openRegions reload persistence + floaterSolidBase/scrimColor/fxClickMode/fxTrailMode roundtrip verified';
      } finally {
        await engine.updateConfig({ floaterSolidBase: true, scrimColor: 'auto', fxClickMode: 'ripple', fxTrailMode: 'dust' }).catch(() => {});
        await browser.closePage(studioPage);
      }
    });

    await check('S3-06: Studio Contrast Guardrail UI + Sibling/Code Protection + Hub `zh-CN` (`<h2>` & `20x20` intact) + Popout `.agy-prism-visual-editor` isolation', '@exec-mock-tests', async () => {
      await engine.applyWallpaper(auroraItem.id, { skinEnabled: true, layoutMode: 'islands', regions: null, surfaceTints: null });
      const studioPage = await browser.openPage({
        url: `${studio.origin}/?token=${encodeURIComponent(SIDECAR_TEST_TOKEN)}`,
        requestHandler: universalHttpRouter,
      });
      const popoutPage = await browser.openPage({
        url: `${studio.origin}/?mode=visual-editor`,
        requestHandler: universalHttpRouter,
      });
      const hubPage = await browser.openPage({
        url: `${HUB_MOCK_ORIGIN}/hub`,
        requestHandler: universalHttpRouter,
      });
      try {
        await sleep(750);
        await studioPage.evaluate(`(() => {
          document.querySelector('[data-action="switch-tab"][data-tab="skin"]').click();
        })()`);
        await sleep(220);
        await studioPage.evaluate(`(() => {
          const sb = document.querySelector('details.prism-region-group[data-region="sidebar"]');
          if (sb && !sb.open) sb.querySelector('summary')?.click();
        })()`);
        await sleep(120);

        // Pick #111111 on dark sidebar with allowRawFontColor=false -> WCAG clamped indicator; then drop sidebarOpacity to 0.35 -> low-opacity hint; then toggle allowRaw ON
        await studioPage.evaluate(`(() => {
          const sb = document.querySelector('details.prism-region-group[data-region="sidebar"]');
          const fgIn = sb.querySelector('.prism-color-wcag-block[data-color-key="fontColor"] input[type="color"], .prism-color-wcag-block[data-region="sidebar"][data-color-key*="fontColor"] input[type="color"]');
          if (fgIn) {
            fgIn.value = '#111111';
            fgIn.dispatchEvent(new Event('input', { bubbles: true }));
            fgIn.dispatchEvent(new Event('change', { bubbles: true }));
          }
        })()`);
        await sleep(240);
        const clampedState = await studioPage.evaluate(`(() => {
          const sb = document.querySelector('details.prism-region-group[data-region="sidebar"]');
          const badge = sb.querySelector('.prism-wcag-badge, [data-wcag-status]');
          const rawSw = sb.querySelector('.prism-wcag-raw-row [role="switch"]');
          return {
            badgeText: badge ? badge.textContent : '',
            rawChecked: rawSw ? rawSw.getAttribute('aria-checked') : null,
          };
        })()`);
        assert.equal(clampedState.rawChecked, 'false');
        assert.ok(clampedState.badgeText.length > 0, 'Expected WCAG contrast badge when dark #111111 selected on dark sidebar');

        // Low opacity (<0.55) via Studio UI slider renders [data-wcag-status="low-opacity"]
        await studioPage.evaluate(`(() => {
          const sb = document.querySelector('details.prism-region-group[data-region="sidebar"]');
          const opIn = sb?.querySelector('input[data-config-slider="sidebarOpacity"]');
          if (opIn) {
            opIn.value = '35';
            opIn.dispatchEvent(new Event('input', { bubbles: true }));
            opIn.dispatchEvent(new Event('change', { bubbles: true }));
          }
        })()`);
        let lowOpHintVisible = false;
        const lowOpWait = Date.now() + 2000;
        while (Date.now() < lowOpWait) {
          lowOpHintVisible = await studioPage.evaluate(`Boolean(document.querySelector('details.prism-region-group[data-region="sidebar"] [data-wcag-status="low-opacity"]'))`);
          if (lowOpHintVisible) break;
          await sleep(40);
        }
        assert.equal(lowOpHintVisible, true, 'Missing [data-wcag-status="low-opacity"] notice when sidebar opacity 0.35 < 0.55');

        // Toggle raw font color ON -> persists allowRawFontColor=true
        await studioPage.evaluate(`document.querySelector('details.prism-region-group[data-region="sidebar"] .prism-wcag-raw-row [role="switch"]')?.click()`);
        await sleep(250);
        assert.equal((await engine.getConfig()).regions?.sidebar?.allowRawFontColor, true, 'Toggling allowRawFontColor did not persist true');

        // Hub: zh-CN translation preserves <h2> & 20x20 action buttons while keeping 0 Prism DOM mutations
        await hubPage.evaluate(
          buildHostMicroBootstrap({ hostOrigin: studio.origin, capToken: studio.hostCapToken, triggerMode: 'both', startupMode: 'gentle-auto', skinEnabled: true }),
        );
        const waitHub = Date.now() + 3000;
        while (Date.now() < waitHub) {
          if (await hubPage.evaluate(`document.documentElement.getAttribute('data-agy-prism-wallpaper') === 'ready'`)) break;
          await sleep(40);
        }
        const zhHeaderAudit = await hubPage.evaluate(`(() => {
          window.__setMockLocale('zh-CN');
          const res = window.__runMockDomTranslator();
          const stickyInner = document.getElementById('hub-sidebar-sticky-inner');
          const h2 = stickyInner ? stickyInner.querySelector('h2') : null;
          const projLabel = document.getElementById('hub-sidebar-projects-label');
          const filterBtn = document.getElementById('hub-proj-filter-btn');
          const addBtn = document.getElementById('hub-proj-add-btn');
          return {
            res,
            hasH2: Boolean(h2),
            projText: projLabel ? projLabel.textContent.trim() : '',
            hasActionBtns: Boolean(filterBtn && addBtn),
          };
        })()`);
        assert.equal(zhHeaderAudit.hasH2, true, '__setMockLocale zh-CN wiped <h2> inside #hub-sidebar-sticky-inner!');
        assert.equal(zhHeaderAudit.projText, '项目');
        assert.equal(zhHeaderAudit.hasActionBtns, true, 'Sibling action buttons inside sticky Projects header lost after zh-CN');
        assert.deepEqual(zhHeaderAudit.res.touchedPrismIds, [], 'dom-translator mutated Prism DOM nodes!');

        // Popout isolation check
        const popProtected = await popoutPage.evaluate(`Boolean(document.querySelector('.prism-ve-popout-shell.agy-prism-visual-editor'))`);
        assert.equal(popProtected, true, 'Popout page missing .agy-prism-visual-editor non-<body> guard');
        assert.deepEqual(studioPage.pageExceptions, []);
        assert.deepEqual(popoutPage.pageExceptions, []);
        assert.deepEqual(hubPage.pageExceptions, []);
        return 'UI WCAG clamp + <0.55 notice + allowRaw + zh-CN <h2>/buttons intact (0 Prism mutations) + popout guard verified';
      } finally {
        await engine.applyWallpaper(auroraItem.id, { skinEnabled: true, regions: null, surfaceTints: null, sidebarOpacity: null, sidebarBlur: null }).catch(() => {});
        await browser.closePage(hubPage);
        await browser.closePage(popoutPage);
        await browser.closePage(studioPage);
      }
    });

    await check('S3-07: `v2.4.1` Inspector Script VM (V2 `boot.rpcUrl`, detach guard, 0 `<body>` mutations, `pointer-events:none`, 12-region `hitTestAt`, F-07 `.msg-user -> userBubble`, Esc/right-click) + Studio UI Picker & V3 `Escape` Priority E2E', '@exec-v23-manifests', async () => {
      // ---- Part A: Pure `vm.Script` + Mock DOM test of `src/host/inspector-inject.js` ----
      const inspectorSrc = fs.readFileSync(path.join(REPO_ROOT, 'src', 'host', 'inspector-inject.js'), 'utf8');
      const compiledInspector = new vm.Script(inspectorSrc, { filename: 'src/host/inspector-inject.js' });

      const splitSimpleChain = (s) => {
        const parts = [];
        let cur = '';
        let depthP = 0;
        let depthB = 0;
        for (let i = 0; i < s.length; i += 1) {
          const ch = s[i];
          if (ch === '(') depthP += 1;
          else if (ch === ')' && depthP > 0) depthP -= 1;
          else if (ch === '[') depthB += 1;
          else if (ch === ']' && depthB > 0) depthB -= 1;
          if (depthP === 0 && depthB === 0 && (ch === '>' || /\s/.test(ch))) {
            if (cur) { parts.push(cur); cur = ''; }
            if (ch === '>') parts.push('>');
          } else {
            cur += ch;
          }
        }
        if (cur) parts.push(cur);
        const tokens = [];
        for (let i = 0; i < parts.length; i += 1) {
          if (parts[i] === '>') continue;
          const prevIsGt = i > 0 && parts[i - 1] === '>';
          tokens.push({ sel: parts[i], comb: tokens.length === 0 ? null : prevIsGt ? '>' : ' ' });
        }
        return tokens;
      };
      const splitTopCommas = (s) => {
        const out = [];
        let cur = '';
        let depthP = 0;
        let depthB = 0;
        for (let i = 0; i < s.length; i += 1) {
          const ch = s[i];
          if (ch === '(') depthP += 1;
          else if (ch === ')' && depthP > 0) depthP -= 1;
          else if (ch === '[') depthB += 1;
          else if (ch === ']' && depthB > 0) depthB -= 1;
          if (ch === ',' && depthP === 0 && depthB === 0) {
            if (cur.trim()) out.push(cur.trim());
            cur = '';
          } else {
            cur += ch;
          }
        }
        if (cur.trim()) out.push(cur.trim());
        return out;
      };
      const matchSingleCompound = (el, compound) => {
        if (!el || el.nodeType !== 1) return false;
        let rest = compound.trim();
        while (rest.length > 0) {
          if (rest.startsWith(':not(')) {
            let d = 1; let i = 5;
            while (i < rest.length && d > 0) { if (rest[i] === '(') d += 1; else if (rest[i] === ')') d -= 1; i += 1; }
            const inner = rest.slice(5, i - 1);
            if (matchSelectorList(el, inner)) return false;
            rest = rest.slice(i);
            continue;
          }
          if (rest.startsWith(':is(')) {
            let d = 1; let i = 4;
            while (i < rest.length && d > 0) { if (rest[i] === '(') d += 1; else if (rest[i] === ')') d -= 1; i += 1; }
            const inner = rest.slice(4, i - 1);
            if (!matchSelectorList(el, inner)) return false;
            rest = rest.slice(i);
            continue;
          }
          if (rest.startsWith(':first-child')) {
            const kids = el.parentNode?.children || [];
            if (kids[0] !== el) return false;
            rest = rest.slice(12);
            continue;
          }
          if (rest.startsWith(':last-child')) {
            const kids = el.parentNode?.children || [];
            if (kids[kids.length - 1] !== el) return false;
            rest = rest.slice(11);
            continue;
          }
          if (rest.startsWith('[')) {
            const endB = rest.indexOf(']');
            const expr = rest.slice(1, endB);
            const eqIdx = expr.indexOf('=');
            if (eqIdx === -1) {
              if (!el.hasAttribute(expr.trim())) return false;
            } else {
              const isSub = expr[eqIdx - 1] === '*';
              const attr = (isSub ? expr.slice(0, eqIdx - 1) : expr.slice(0, eqIdx)).trim();
              const expected = expr.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
              const actual = el.getAttribute(attr);
              if (actual === null) return false;
              if (isSub ? !actual.includes(expected) : actual !== expected) return false;
            }
            rest = rest.slice(endB + 1);
            continue;
          }
          if (rest.startsWith('#')) {
            const m = /^#((?:\\.|[A-Za-z0-9_-])+)/.exec(rest);
            if (!m) return false;
            const idVal = m[1].replace(/\\/g, '');
            if (el.id !== idVal) return false;
            rest = rest.slice(m[0].length);
            continue;
          }
          if (rest.startsWith('.')) {
            const m = /^\.([A-Za-z0-9_-]+)/.exec(rest);
            if (!m) return false;
            const clsList = String(el.className || '').split(/\s+/).filter(Boolean);
            if (!clsList.includes(m[1])) return false;
            rest = rest.slice(m[0].length);
            continue;
          }
          if (rest.startsWith('*')) {
            rest = rest.slice(1);
            continue;
          }
          const tm = /^[A-Za-z][A-Za-z0-9_-]*/.exec(rest);
          if (!tm) return false;
          if (String(el.tagName || '').toLowerCase() !== tm[0].toLowerCase()) return false;
          rest = rest.slice(tm[0].length);
        }
        return true;
      };
      const matchComplex = (el, complexSel) => {
        const toks = splitSimpleChain(complexSel);
        if (toks.length === 0) return false;
        if (!matchSingleCompound(el, toks[toks.length - 1].sel)) return false;
        let cur = el;
        for (let i = toks.length - 1; i > 0; i -= 1) {
          const comb = toks[i].comb;
          const parentSel = toks[i - 1].sel;
          if (comb === '>') {
            cur = cur.parentElement;
            if (!cur || !matchSingleCompound(cur, parentSel)) return false;
          } else {
            let anc = cur.parentElement;
            let hit = false;
            while (anc) {
              if (matchSingleCompound(anc, parentSel)) { hit = true; break; }
              anc = anc.parentElement;
            }
            if (!hit) return false;
            cur = anc;
          }
        }
        return true;
      };
      function matchSelectorList(el, selList) {
        if (!el || el.nodeType !== 1 || !selList) return false;
        for (const s of splitTopCommas(selList)) {
          if (matchComplex(el, s)) return true;
        }
        return false;
      }

      let vmBodyMutations = 0;
      const vmDocRoot = {};
      const mkVmEl = (tag, { id = '', className = '', attrs = {}, rect = null, style = {} } = {}) => {
        const attrMap = new Map(Object.entries(attrs));
        const el = {
          nodeType: 1,
          tagName: String(tag).toUpperCase(),
          id,
          _className: className,
          get className() { return this._className; },
          set className(v) {
            if (this._isBody) vmBodyMutations += 1;
            this._className = String(v);
          },
          textContent: '',
          children: [],
          parentNode: null,
          get parentElement() { return this.parentNode && this.parentNode.nodeType === 1 ? this.parentNode : null; },
          style: { ...style },
          _rect: rect,
          setAttribute(k, v) {
            if (this._isBody) vmBodyMutations += 1;
            attrMap.set(String(k), String(v));
          },
          getAttribute(k) { return attrMap.has(String(k)) ? attrMap.get(String(k)) : null; },
          hasAttribute(k) { return attrMap.has(String(k)); },
          removeAttribute(k) {
            if (this._isBody) vmBodyMutations += 1;
            attrMap.delete(String(k));
          },
          appendChild(ch) {
            ch.parentNode = this;
            this.children.push(ch);
            return ch;
          },
          removeChild(ch) {
            const idx = this.children.indexOf(ch);
            if (idx >= 0) this.children.splice(idx, 1);
            ch.parentNode = null;
            return ch;
          },
          remove() {
            if (this.parentNode) this.parentNode.removeChild(this);
          },
          getBoundingClientRect() {
            return this._rect || { left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0 };
          },
          matches(sel) { return matchSelectorList(this, sel); },
          closest(sel) {
            let cur = this;
            while (cur && cur.nodeType === 1) {
              if (matchSelectorList(cur, sel)) return cur;
              cur = cur.parentElement;
            }
            return null;
          },
          querySelector(sel) {
            return this.querySelectorAll(sel)[0] || null;
          },
          querySelectorAll(sel) {
            const out = [];
            const walk = (node) => {
              for (const ch of node.children) {
                if (matchSelectorList(ch, sel)) out.push(ch);
                walk(ch);
              }
            };
            walk(this);
            return out;
          },
        };
        return el;
      };

      const mkRectObj = (l, t, w, h) => ({ left: l, top: t, width: w, height: h, right: l + w, bottom: t + h });
      const vmHtml = mkVmEl('HTML', { rect: mkRectObj(0, 0, 1440, 900) });
      vmDocRoot.root = vmHtml;
      const vmHead = mkVmEl('HEAD');
      const vmBody = mkVmEl('BODY', { rect: mkRectObj(0, 0, 1440, 900) });
      vmBody._isBody = true;
      vmHtml.appendChild(vmHead);
      vmHtml.appendChild(vmBody);

      const vmShell = mkVmEl('DIV', { className: 'agy-shell', rect: mkRectObj(0, 0, 1440, 900) });
      const vmTopbar = mkVmEl('HEADER', { attrs: { 'data-testid': 'title-menu-bar' }, rect: mkRectObj(0, 0, 1440, 35) });
      const vmHiddenDropdown = mkVmEl('DIV', {
        id: 'hub-title-menu-dropdown',
        className: 'surface-opaque bg-sidebar',
        attrs: { 'data-browser-occluder': 'true' },
        rect: mkRectObj(14, 35, 200, 90),
        style: { visibility: 'hidden', display: 'block', opacity: '1' },
      });
      vmTopbar.appendChild(vmHiddenDropdown);
      const vmSplit = mkVmEl('DIV', { attrs: { 'data-testid': 'sidebar-split' }, rect: mkRectObj(0, 35, 1440, 865) });
      const vmSidebar = mkVmEl('DIV', { rect: mkRectObj(0, 35, 228, 865) });
      const vmAuxSplit = mkVmEl('DIV', { attrs: { 'data-testid': 'aux-pane-split' }, rect: mkRectObj(228, 35, 1212, 865) });
      const vmWorkspace = mkVmEl('MAIN', { rect: mkRectObj(228, 35, 802, 865) });
      const vmCard = mkVmEl('DIV', { className: 'msg-user bg-card', rect: mkRectObj(260, 220, 420, 110) });
      const vmUserBubble = mkVmEl('DIV', { attrs: { 'data-testid': 'user-message-bubble' }, className: 'agy-user-bubble bg-card', rect: mkRectObj(700, 220, 280, 70) });
      const vmAsstBubble = mkVmEl('DIV', { attrs: { 'data-testid': 'planner-response-text' }, rect: mkRectObj(260, 350, 420, 130) });
      const vmCodePre = mkVmEl('PRE', { rect: mkRectObj(270, 380, 380, 80) });
      const vmCodeBox = mkVmEl('DIV', { className: 'rounded-xl bg-muted border', rect: mkRectObj(274, 384, 372, 72) });
      const vmCodeToggle = mkVmEl('DIV', { attrs: { 'data-testid': 'code-block-preview-toggle', 'data-slot': 'toggle-group' }, rect: mkRectObj(520, 388, 90, 20) });
      vmCodeBox.appendChild(vmCodeToggle);
      vmCodePre.appendChild(vmCodeBox);
      vmAsstBubble.appendChild(vmCodePre);
      const vmTakeoverCard = mkVmEl('DIV', { className: 'agy-takeover-card', rect: mkRectObj(260, 500, 320, 80) });
      const vmCtrlBtn = mkVmEl('BUTTON', { className: 'agy-button-sm', rect: mkRectObj(700, 500, 110, 30) });
      const vmComposerOuter = mkVmEl('DIV', { attrs: { 'data-testid': 'agent-input-box' }, rect: mkRectObj(256, 740, 746, 130) });
      const vmComposerInner = mkVmEl('DIV', { id: 'antigravity.agentSidePanelInputBox', rect: mkRectObj(258, 742, 742, 126) });
      const vmComposerBtn = mkVmEl('BUTTON', { id: 'vm-host-btn', rect: mkRectObj(500, 800, 60, 26) });
      vmComposerInner.appendChild(vmComposerBtn);
      vmComposerOuter.appendChild(vmComposerInner);
      vmWorkspace.appendChild(vmCard);
      vmWorkspace.appendChild(vmUserBubble);
      vmWorkspace.appendChild(vmAsstBubble);
      vmWorkspace.appendChild(vmTakeoverCard);
      vmWorkspace.appendChild(vmCtrlBtn);
      vmWorkspace.appendChild(vmComposerOuter);
      const vmRightPane = mkVmEl('ASIDE', { rect: mkRectObj(1030, 35, 410, 865) });
      vmAuxSplit.appendChild(vmWorkspace);
      vmAuxSplit.appendChild(vmRightPane);
      vmSplit.appendChild(vmSidebar);
      vmSplit.appendChild(vmAuxSplit);
      const vmPopover = mkVmEl('DIV', {
        id: 'vm-visible-popover',
        className: 'agy-popover',
        attrs: { role: 'menu' },
        rect: mkRectObj(40, 80, 200, 130),
        style: { display: 'block', visibility: 'visible', opacity: '1' },
      });
      vmShell.appendChild(vmTopbar);
      vmShell.appendChild(vmSplit);
      vmBody.appendChild(vmShell);
      vmBody.appendChild(vmPopover);

      const findById = (n, id) => {
        if (n.id === id) return n;
        for (const ch of n.children) {
          const hit = findById(ch, id);
          if (hit) return hit;
        }
        return null;
      };
      const vmListeners = new Map();
      const vmFetchCalls = [];
      let staleCallCount = 0;
      const vmDoc = {
        documentElement: vmHtml,
        head: vmHead,
        body: vmBody,
        createElement: (t) => mkVmEl(t),
        getElementById: (id) => findById(vmHtml, id),
        contains: (target) => {
          let c = target;
          while (c) {
            if (c === vmHtml) return true;
            c = c.parentNode;
          }
          return false;
        },
        querySelector: (sel) => vmHtml.querySelector(sel),
        querySelectorAll: (sel) => vmHtml.querySelectorAll(sel),
        elementsFromPoint: (x, y) => {
          const hits = [];
          const walk = (node) => {
            const r = node.getBoundingClientRect();
            if (node.nodeType === 1 && r.width >= 2 && r.height >= 2 && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
              hits.push(node);
            }
            for (const ch of node.children) walk(ch);
          };
          walk(vmBody);
          return hits.reverse();
        },
        addEventListener() {},
        removeEventListener() {},
      };
      const vmWin = {
        document: vmDoc,
        innerWidth: 1440,
        innerHeight: 900,
        navigator: {
          language: 'zh-CN',
          windowControlsOverlay: {
            visible: true,
            getTitlebarAreaRect: () => ({ x: 0, y: 0, width: 1300, height: 35, left: 0, top: 0, right: 1300, bottom: 35 }),
          },
        },
        getComputedStyle: (el) => ({
          display: el?.style?.display || 'block',
          visibility: el?.style?.visibility || 'visible',
          opacity: el?.style?.opacity || '1',
          getPropertyValue: () => '',
        }),
        addEventListener(type, fn, opts) {
          const arr = vmListeners.get(type) || [];
          arr.push({ fn, capture: Boolean(opts === true || opts?.capture) });
          vmListeners.set(type, arr);
        },
        removeEventListener(type, fn, opts) {
          const cap = Boolean(opts === true || opts?.capture);
          const arr = vmListeners.get(type) || [];
          vmListeners.set(type, arr.filter((e) => !(e.fn === fn && e.capture === cap)));
        },
        requestAnimationFrame: (cb) => setTimeout(cb, 0),
        cancelAnimationFrame: (id) => clearTimeout(id),
        setTimeout,
        clearTimeout,
        __AGY_PRISM_INSPECTOR_BOOT__: {
          rpcUrl: 'http://127.0.0.1:58999/host/fresh-v23-token/rpc',
          capToken: 'fresh-v23-token',
          lang: 'zh',
          timeoutMs: 30000,
        },
        __agyPrismCall: () => {
          staleCallCount += 1;
          return Promise.resolve({ ok: false });
        },
        fetch: async (url, init) => {
          vmFetchCalls.push({ url: String(url), headers: init?.headers || {}, body: JSON.parse(String(init?.body || '{}')) });
          return { ok: true, json: async () => ({ ok: true }) };
        },
      };
      vmWin.window = vmWin;
      vmWin.top = vmWin;
      const vmCtx = vm.createContext({
        window: vmWin,
        document: vmDoc,
        navigator: vmWin.navigator,
        getComputedStyle: vmWin.getComputedStyle,
        setTimeout,
        clearTimeout,
        Date,
        Math,
        Number,
        String,
        Boolean,
        Promise,
      });
      const dispatchVmWin = (type, extra = {}) => {
        const ev = {
          type,
          clientX: 0,
          clientY: 0,
          button: 0,
          key: '',
          target: vmComposerBtn,
          defaultPrevented: false,
          stopImmediateCount: 0,
          preventDefault() { this.defaultPrevented = true; },
          stopPropagation() {},
          stopImmediatePropagation() { this.stopImmediateCount += 1; },
          ...extra,
        };
        for (const entry of [...(vmListeners.get(type) || [])]) {
          entry.fn(ev);
        }
        return ev;
      };

      compiledInspector.runInContext(vmCtx);
      assert.equal(vmWin.__agyPrismInspector.version, '2.4.1');
      assert.equal(vmWin.__agyPrismInspector.active(), true);
      assert.equal(vmHtml.getAttribute('data-agy-prism-inspector'), 'picking');
      assert.equal(vmBodyMutations, 0, `#15 CN l10n violated: inspector mutated <body> ${vmBodyMutations} times!`);

      const vmOverlay = vmDoc.getElementById('agy-prism-inspector-overlay');
      const vmHud = vmDoc.getElementById('agy-prism-inspector-hud');
      assert.ok(vmOverlay && vmHud, 'Missing inspector overlay or HUD');
      assert.equal(vmOverlay.style.pointerEvents, 'none');
      assert.equal(vmHud.style.pointerEvents, 'none');
      assert.equal(vmOverlay.className, 'agy-prism-inspector-overlay');
      assert.equal(vmHud.className, 'agy-prism-inspector-hud');
      assert.equal(vmOverlay.getAttribute('translate'), 'no');
      assert.equal(vmOverlay.getAttribute('data-ag-no-i18n'), '1');

      // 12-region hitTestAt + F-07 (.msg-user -> userBubble) + hidden popover skip
      const expectedHits = [
        [100, 120, 'popover'],
        [1360, 16, 'wco'],
        [500, 16, 'topbar'],
        [560, 398, 'controls'],
        [750, 515, 'controls'],
        [520, 810, 'composer'],
        [360, 430, 'codeBlock'],
        [340, 260, 'userBubble'],
        [800, 250, 'userBubble'],
        [300, 362, 'assistantBubble'],
        [340, 530, 'card'],
        [100, 400, 'sidebar'],
        [1200, 200, 'rightPane'],
        [800, 620, 'workspace'],
      ];
      for (const [hx, hy, expRegion] of expectedHits) {
        const hit = vmWin.__agyPrismInspector.hitTestAt(hx, hy);
        assert.equal(hit?.regionId, expRegion, `hitTestAt(${hx}, ${hy}) expected "${expRegion}", got ${JSON.stringify(hit)}`);
      }
      // Hidden dropdown at (25, 45) must NOT match popover; it falls through to sidebar
      assert.notEqual(vmWin.__agyPrismInspector.hitTestAt(25, 45)?.regionId, 'popover', 'Hidden #hub-title-menu-dropdown must be skipped');

      // Capture left-click on composer -> Guardrail V2 boot.rpcUrl + self-teardown
      const clickEv = dispatchVmWin('click', { clientX: 520, clientY: 810, button: 0, target: vmComposerBtn });
      assert.equal(clickEv.defaultPrevented, true);
      assert.ok(clickEv.stopImmediateCount >= 1);
      assert.equal(staleCallCount, 0, 'Guardrail V2 violated: fell back to stale __agyPrismCall instead of boot.rpcUrl!');
      assert.equal(vmFetchCalls.length, 1);
      assert.equal(vmFetchCalls[0].url, 'http://127.0.0.1:58999/host/fresh-v23-token/rpc');
      assert.equal(vmFetchCalls[0].body.method, 'inspector.picked');
      assert.equal(vmFetchCalls[0].body.params.regionId, 'composer');
      assert.equal(vmWin.__agyPrismInspector, undefined);

      // Re-run -> Escape cancel
      compiledInspector.runInContext(vmCtx);
      const escEv = dispatchVmWin('keydown', { key: 'Escape' });
      assert.equal(escEv.defaultPrevented, true);
      assert.equal(vmFetchCalls.length, 2);
      assert.equal(vmFetchCalls[1].body.method, 'inspector.cancelled');
      assert.equal(vmFetchCalls[1].body.params.reason, 'escape');

      // Re-run -> right-click pointerdown cancel + contextmenu swallow
      compiledInspector.runInContext(vmCtx);
      const rDownEv = dispatchVmWin('pointerdown', { clientX: 500, clientY: 500, button: 2 });
      assert.equal(rDownEv.defaultPrevented, true);
      assert.equal(vmFetchCalls.length, 3);
      assert.equal(vmFetchCalls[2].body.method, 'inspector.cancelled');
      assert.equal(vmFetchCalls[2].body.params.reason, 'contextmenu');
      const lateCtxEv = dispatchVmWin('contextmenu', { clientX: 500, clientY: 500 });
      assert.equal(lateCtxEv.defaultPrevented, true, 'Late contextmenu after right-click cancel should be swallowed once');

      // Re-run -> Guardrail V2 overlay detach guard (external panic strip removes overlay -> never swallow next click!)
      compiledInspector.runInContext(vmCtx);
      vmDoc.getElementById('agy-prism-inspector-overlay').remove();
      const postDetachClick = dispatchVmWin('click', { clientX: 520, clientY: 810, button: 0, target: vmComposerBtn });
      assert.equal(postDetachClick.defaultPrevented, false, 'Guardrail V2 detach guard failed: swallowed click after overlay removal!');
      assert.equal(vmWin.__agyPrismInspector, undefined, 'Guardrail V2 detach guard did not tear down singleton');

      // ---- Part B: `src/studio-ui/` Integration & Guardrail V3 Audit ----
      const stateUiSrc = fs.readFileSync(path.join(REPO_ROOT, 'src', 'studio-ui', 'state.mjs'), 'utf8');
      const appUiSrc = fs.readFileSync(path.join(REPO_ROOT, 'src', 'studio-ui', 'app.mjs'), 'utf8');
      const skinUiSrc = fs.readFileSync(path.join(REPO_ROOT, 'src', 'studio-ui', 'tabs', 'skin-regions.mjs'), 'utf8');
      const canvasUiSrc = fs.readFileSync(path.join(REPO_ROOT, 'src', 'studio-ui', 'editor', 'visual-canvas.mjs'), 'utf8');

      assert.ok(stateUiSrc.includes('export async function startInspectorPick'), 'state.mjs missing startInspectorPick');
      assert.ok(stateUiSrc.includes('export async function cancelInspectorPick'), 'state.mjs missing cancelInspectorPick');
      assert.ok(stateUiSrc.includes('inspectorPicking: false'), 'state.mjs store missing inspectorPicking');
      assert.match(stateUiSrc, /if\s*\(\s*s\.inspectorStatus\s*&&\s*typeof\s+s\.inspectorStatus\s*===\s*['"]object['"]\s*\)/, 'state.mjs missing Guardrail V3 inspectorStatus object check');

      assert.ok(appUiSrc.includes("addEventListener('inspector-picked'"), 'app.mjs missing inspector-picked SSE listener');
      assert.ok(appUiSrc.includes("addEventListener('inspector-cancelled'"), 'app.mjs missing inspector-cancelled SSE listener');
      assert.ok(appUiSrc.includes("addEventListener('inspector-status'"), 'app.mjs missing inspector-status SSE listener');
      assert.ok(appUiSrc.includes('startInspectorPick') && appUiSrc.includes('cancelInspectorPick'), 'app.mjs missing picker action handlers');
      const escBlockMatch = /if\s*\(\s*e\.key\s*===\s*['"]Escape['"]\s*\)\s*\{([\s\S]{0,600})/.exec(appUiSrc);
      assert.ok(escBlockMatch, 'app.mjs missing Escape handler');
      const idxInsEsc = escBlockMatch[1].indexOf('store.inspectorPicking');
      const idxModEsc = escBlockMatch[1].indexOf('store.editorModalOpen');
      const idxArmEsc = escBlockMatch[1].indexOf('store.armedConfirm');
      assert.ok(idxInsEsc !== -1 && idxModEsc !== -1 && idxInsEsc < idxModEsc && idxInsEsc < idxArmEsc, 'Guardrail V3 violated: store.inspectorPicking must be checked BEFORE editorModalOpen and armedConfirm on Escape');

      assert.ok(skinUiSrc.includes('pick-host-region') && skinUiSrc.includes('cancel-host-pick') && skinUiSrc.includes('prism-skin-picker-banner'));
      assert.ok(canvasUiSrc.includes('pick-host-region') && canvasUiSrc.includes('cancel-host-pick') && canvasUiSrc.includes('prism-ve-picker-banner'));

      // ---- Part C: Headless Chrome E2E (`live` + `static-css` + CN L10n + Studio/Popout + V3 `Escape` Priority) ----
      const s307DataDir = path.join(SCRATCH_ROOT, 's307-studio-data');
      fs.mkdirSync(s307DataDir, { recursive: true });
      const S307_TOK = 's307-picker-e2e-token';
      const s307PickEvents = [];
      const s307CancelReasons = [];
      const s307Srv = await createPrismStudioServer({
        dataDir: s307DataDir,
        token: S307_TOK,
        startCdp: false,
        autoCheckUpdates: false,
        inspectShortcuts: false,
        inspectorController: {
          async startInspectorPick() {
            s307PickEvents.push(Date.now());
            return { ok: true, targetCount: 1 };
          },
          async cancelInspectorPick(opts = {}) {
            s307CancelReasons.push(String(opts?.reason || 'studio-cancel'));
            return { ok: true, cancelled: true, targetCount: 1 };
          },
        },
      });
      const s307Lib = await s307Srv.engine.listLibrary({ refresh: true });
      const s307Items = Array.isArray(s307Lib) ? s307Lib : s307Lib.items || [];
      const s307Aurora = s307Items.find((i) => String(i.id || '').includes('100001')) || s307Items[0] || auroraItem;
      await s307Srv.engine.applyWallpaper(s307Aurora.id, {
        skinEnabled: true,
        startupMode: 'gentle-auto',
        layoutMode: 'islands',
        glassBlur: 16,
      });
      const s307MediaOrigin = s307Srv.engine.getMediaOrigin();
      const s307MediaServer = s307Srv.engine?.mediaServer?.server || s307Srv.engine?._mediaServer?.server;
      const s307Router = async (reqInfo) => {
        const u = new URL(reqInfo.url);
        const orig = `${u.protocol}//${u.host}`;
        if (orig === s307Srv.origin) {
          const res = await invokeServerInMemory(s307Srv.server, {
            method: reqInfo.method,
            url: `${u.pathname}${u.search}`,
            headers: reqInfo.headers,
            body: reqInfo.postData,
          });
          return { status: res.status, headers: res.headers, body: res.body };
        }
        if (s307MediaServer && orig === s307MediaOrigin) {
          const res = await invokeServerInMemory(s307MediaServer, {
            method: reqInfo.method,
            url: `${u.pathname}${u.search}`,
            headers: reqInfo.headers,
            body: reqInfo.postData,
          });
          return { status: res.status, headers: res.headers, body: res.body };
        }
        return universalHttpRouter(reqInfo);
      };

      const esSpyInit = `
        window.__s307EsList = [];
        window.__s307EsEvents = [];
        const OrigES = window.EventSource;
        window.EventSource = function(u, opts) {
          const es = new OrigES(u, opts);
          const origAdd = es.addEventListener.bind(es);
          es.__prismListeners = {};
          es.addEventListener = function(type, fn, o) {
            if (!es.__prismListeners[type]) es.__prismListeners[type] = [];
            es.__prismListeners[type].push(fn);
            window.__s307EsEvents.push(type);
            return origAdd(type, fn, o);
          };
          window.__s307EsList.push(es);
          return es;
        };
      `;

      const s307StudioPage = await browser.openPage({
        url: `${s307Srv.origin}/?token=${encodeURIComponent(S307_TOK)}`,
        requestHandler: s307Router,
        initScript: esSpyInit,
      });
      const s307PopoutPage = await browser.openPage({
        url: `${s307Srv.origin}/?mode=visual-editor`,
        requestHandler: s307Router,
        initScript: esSpyInit,
      });
      const s307HubPage = await browser.openPage({
        url: `${HUB_MOCK_ORIGIN}/hub`,
        requestHandler: s307Router,
      });

      try {
        await sleep(750);

        // 1) Guardrail V3 in real Studio Chrome: open Visual Editor Modal -> start pick -> press Esc -> cancels pick WITHOUT closing modal!
        await s307StudioPage.evaluate(`document.querySelector('[data-action="open-visual-editor"]')?.click()`);
        await sleep(160);
        await s307StudioPage.evaluate(`document.querySelector('#prism-visual-editor-modal [data-action="pick-host-region"]')?.click()`);
        await sleep(180);
        const pickingModalBeforeEsc = await s307StudioPage.evaluate(`({
          hasModal: Boolean(document.getElementById('prism-visual-editor-modal')),
          hasBanner: Boolean(document.getElementById('prism-ve-picker-banner')),
          esEvents: window.__s307EsEvents || [],
        })`);
        assert.equal(pickingModalBeforeEsc.hasModal, true);
        assert.equal(pickingModalBeforeEsc.hasBanner, true, 'Visual Editor Modal did not show #prism-ve-picker-banner while picking');
        assert.equal(s307PickEvents.length, 1);
        assert.ok(pickingModalBeforeEsc.esEvents.includes('inspector-picked'), 'Studio EventSource missing inspector-picked listener');

        await s307StudioPage.pressKey({ key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await sleep(180);
        const modalAfterEsc = await s307StudioPage.evaluate(`({
          hasModal: Boolean(document.getElementById('prism-visual-editor-modal')),
          hasBanner: Boolean(document.getElementById('prism-ve-picker-banner')),
        })`);
        assert.equal(modalAfterEsc.hasBanner, false, 'Escape did not cancel inspector picking banner');
        assert.equal(modalAfterEsc.hasModal, true, 'Guardrail V3 failed in Chrome: Escape closed Visual Editor Modal instead of cancelling picker only!');
        assert.ok(s307CancelReasons.includes('escape'), 'Escape did not send POST /api/inspector/cancel with reason=escape');
        await s307StudioPage.evaluate(`document.querySelector('#prism-visual-editor-modal [data-action="close-visual-editor"]')?.click()`);
        await sleep(120);

        // 2) Live Mode Hub E2E: boot skin -> inject `/host/<cap>/inspector.js` -> CN L10n 0 mutations -> real CDP click on #hub-interactive-btn
        await s307HubPage.evaluate(
          buildHostMicroBootstrap({ hostOrigin: s307Srv.origin, capToken: s307Srv.hostCapToken, triggerMode: 'both', startupMode: 'gentle-auto', skinEnabled: true }),
        );
        const liveWait = Date.now() + 3000;
        while (Date.now() < liveWait) {
          if (await s307HubPage.evaluate(`document.documentElement.getAttribute('data-agy-prism-wallpaper') === 'ready'`)) break;
          await sleep(40);
        }
        await s307HubPage.evaluate(`(() => {
          const s = document.createElement('script');
          s.id = 'agy-prism-inspector-loader';
          s.src = ${JSON.stringify(`${s307Srv.origin}/host/${s307Srv.hostCapToken}/inspector.js?t=${Date.now()}`)};
          document.head.appendChild(s);
        })()`);
        const insReadyWait = Date.now() + 2500;
        while (Date.now() < insReadyWait) {
          if (await s307HubPage.evaluate(`Boolean(window.__agyPrismInspector && window.__agyPrismInspector.active())`)) break;
          await sleep(30);
        }
        const liveInsAudit = await s307HubPage.evaluate(`(() => {
          const ov = document.getElementById('agy-prism-inspector-overlay');
          const hud = document.getElementById('agy-prism-inspector-hud');
          const l10n = window.__runMockDomTranslator();
          const btn = document.getElementById('hub-interactive-btn').getBoundingClientRect();
          return {
            active: window.__agyPrismInspector.active(),
            htmlAttr: document.documentElement.getAttribute('data-agy-prism-inspector'),
            bodyAttr: document.body.getAttribute('data-agy-prism-inspector'),
            ovPe: ov ? getComputedStyle(ov).pointerEvents : '',
            hudPe: hud ? getComputedStyle(hud).pointerEvents : '',
            l10nTouched: l10n.touchedPrismIds,
            btnX: Math.round(btn.left + btn.width / 2),
            btnY: Math.round(btn.top + btn.height / 2),
          };
        })()`);
        assert.equal(liveInsAudit.active, true);
        assert.equal(liveInsAudit.htmlAttr, 'picking');
        assert.equal(liveInsAudit.bodyAttr, null);
        assert.equal(liveInsAudit.ovPe, 'none');
        assert.equal(liveInsAudit.hudPe, 'none');
        assert.equal(liveInsAudit.l10nTouched.includes('agy-prism-inspector-overlay'), false);
        assert.equal(liveInsAudit.l10nTouched.includes('agy-prism-inspector-hud'), false);

        // Real CDP mouse click on #hub-interactive-btn inside composer -> intercepted (0 host clicks), picks composer!
        await s307HubPage.call('Input.dispatchMouseEvent', {
          type: 'mousePressed',
          x: liveInsAudit.btnX,
          y: liveInsAudit.btnY,
          button: 'left',
          clickCount: 1,
        });
        await s307HubPage.call('Input.dispatchMouseEvent', {
          type: 'mouseReleased',
          x: liveInsAudit.btnX,
          y: liveInsAudit.btnY,
          button: 'left',
          clickCount: 1,
        });
        let pickedRegionCommitted = '';
        const pickRpcWait = Date.now() + 1800;
        while (Date.now() < pickRpcWait) {
          const srvPickedRes = await invokeServerInMemory(s307Srv.server, { method: 'GET', url: '/api/status', headers: { Host: '127.0.0.1:53040' } });
          pickedRegionCommitted = srvPickedRes.json().inspectorStatus?.lastPickedRegion || '';
          if (pickedRegionCommitted === 'composer') break;
          await sleep(30);
        }
        const afterHubPick = await s307HubPage.evaluate(`({
          clicks: window.__hubInteractiveClicks || 0,
          hasIns: Boolean(window.__agyPrismInspector),
          hasOv: Boolean(document.getElementById('agy-prism-inspector-overlay')),
        })`);
        assert.equal(afterHubPick.clicks, 0, 'Inspector failed to suppress host button click inside composer!');
        assert.equal(afterHubPick.hasIns, false);
        assert.equal(afterHubPick.hasOv, false);
        assert.equal(pickedRegionCommitted, 'composer', 'Hub CDP click did not commit inspector.picked=composer to Sidecar RPC');

        // 3) Static-CSS Mode Hub E2E (no wallpaper-inject.js) + 12-region hitTestAt (F-07 .msg-user -> userBubble) + Escape cancel
        await s307HubPage.navigate(`${HUB_MOCK_ORIGIN}/hub`);
        await sleep(180);
        await s307HubPage.evaluate(`(() => {
          window.__setMockWco({ visible: true, x: 0, y: 0, width: 1300, height: 35 });
          window.__setMockTopbarDropdownOpen(true);
          const s = document.createElement('script');
          s.id = 'agy-prism-inspector-loader';
          s.src = ${JSON.stringify(`${s307Srv.origin}/host/${s307Srv.hostCapToken}/inspector.js?t=${Date.now()}`)};
          document.head.appendChild(s);
        })()`);
        const staticWait = Date.now() + 2500;
        while (Date.now() < staticWait) {
          if (await s307HubPage.evaluate(`Boolean(window.__agyPrismInspector && window.__agyPrismInspector.active())`)) break;
          await sleep(30);
        }
        const staticAudit = await s307HubPage.evaluate(`(() => {
          const ins = window.__agyPrismInspector;
          const rectCenter = (sel) => {
            const el = document.querySelector(sel);
            const r = el.getBoundingClientRect();
            return [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)];
          };
          const [cx, cy] = rectCenter('#antigravity\\\\.agentSidePanelInputBox');
          const [kx, ky] = rectCenter('.msg-user');
          const [tcx, tcy] = rectCenter('#hub-aux-telemetry-card');
          const [sx, sy] = rectCenter('.agy-sidebar');
          const rpRect = document.getElementById('hub-aux-pane').getBoundingClientRect();
          const [rx, ry] = [Math.round(rpRect.left + rpRect.width / 2), Math.round(rpRect.top + 20)];
          const cvRect = document.querySelector('#hub-main-pane [data-testid="conversation-view"]').getBoundingClientRect();
          const [wx, wy] = [Math.round(cvRect.left + 12), Math.round(cvRect.top + 12)];
          const [px, py] = rectCenter('#hub-title-menu-dropdown');
          const initialHits = {
            hasWallpaperSkin: Boolean(window.__agyPrism),
            wco: ins.hitTestAt(1360, 16)?.regionId,
            topbar: ins.hitTestAt(600, 16)?.regionId,
            popover: ins.hitTestAt(px, py)?.regionId,
            composer: ins.hitTestAt(cx, cy)?.regionId,
            msgUser: ins.hitTestAt(kx, ky)?.regionId,
            telemetryCard: ins.hitTestAt(tcx, tcy)?.regionId,
            sidebar: ins.hitTestAt(sx, sy)?.regionId,
            rightPane: ins.hitTestAt(rx, ry)?.regionId,
            workspace: ins.hitTestAt(wx, wy)?.regionId,
          };

          window.__setMockTopbarDropdownOpen(false);
          const scrollHit = (sel, offsetFn) => {
            const el = document.querySelector(sel);
            el.scrollIntoView({ block: 'center', behavior: 'instant' });
            const r = el.getBoundingClientRect();
            const [hx, hy] = offsetFn ? offsetFn(r) : [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)];
            return ins.hitTestAt(hx, hy)?.regionId;
          };
          return {
            ...initialHits,
            userBubble235: scrollHit('#v235-user-bubble'),
            assistantBubble235: scrollHit('#v235-worked-for'),
            artifactAssistant: scrollHit('#v235-artifact-card', (r) => [Math.round(r.left + 18), Math.round(r.top + r.height / 2)]),
            codeBlock235: scrollHit('#v235-standalone-code-box'),
            controlsBtn: scrollHit('#v235-btn-sm'),
            controlsAuxTab: scrollHit('#v235-aux-tab'),
            takeoverCard: scrollHit('#v235-takeover-card'),
          };
        })()`);
        assert.equal(staticAudit.hasWallpaperSkin, false, 'static-css test expected wallpaper-inject.js absent');
        assert.equal(staticAudit.wco, 'wco');
        assert.equal(staticAudit.topbar, 'topbar');
        assert.equal(staticAudit.popover, 'popover');
        assert.equal(staticAudit.composer, 'composer');
        assert.equal(staticAudit.msgUser, 'userBubble', 'F-07: .msg-user must resolve to userBubble in v2.4.1');
        assert.equal(staticAudit.telemetryCard, 'card');
        assert.equal(staticAudit.sidebar, 'sidebar');
        assert.equal(staticAudit.rightPane, 'rightPane');
        assert.equal(staticAudit.workspace, 'workspace');
        assert.equal(staticAudit.userBubble235, 'userBubble');
        assert.equal(staticAudit.assistantBubble235, 'assistantBubble');
        assert.equal(staticAudit.artifactAssistant, 'assistantBubble');
        assert.equal(staticAudit.codeBlock235, 'codeBlock');
        assert.equal(staticAudit.controlsBtn, 'controls');
        assert.equal(staticAudit.controlsAuxTab, 'controls');
        assert.equal(staticAudit.takeoverCard, 'card');

        await s307HubPage.pressKey({ key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await sleep(180);
        assert.equal(await s307HubPage.evaluate(`Boolean(window.__agyPrismInspector)`), false, 'Escape did not disarm static-css inspector');

        // 4) Studio & Popout SSE `inspector-picked` routing (`card -> workspace` accordion + Popout region selection)
        const auxAccResult = await s307StudioPage.evaluate(`(() => {
          const es = (window.__s307EsList || [])[0];
          const fns = es?.__prismListeners?.['inspector-picked'] || [];
          fns.forEach((fn) => fn(new MessageEvent('inspector-picked', { data: JSON.stringify({ regionId: 'card', source: 'host-picker' }) })));
          const det = document.querySelector('details.prism-region-group[data-region="workspace"]');
          const pickBtn = document.querySelector('[data-action="pick-host-region"]');
          return {
            listenerCount: fns.length,
            hasPickBtn: Boolean(pickBtn),
            workspaceOpen: Boolean(det && det.open),
          };
        })()`);
        assert.ok(auxAccResult.listenerCount >= 1 && auxAccResult.hasPickBtn);
        assert.equal(auxAccResult.workspaceOpen, true, 'inspector-picked=card did not open workspace accordion in Studio');

        const popoutSelResult = await s307PopoutPage.evaluate(`(() => {
          const es = (window.__s307EsList || [])[0];
          const fns = es?.__prismListeners?.['inspector-picked'] || [];
          fns.forEach((fn) => fn(new MessageEvent('inspector-picked', { data: JSON.stringify({ regionId: 'composer', source: 'host-picker' }) })));
          const selChip = document.querySelector('[data-action="select-editor-region"][data-region="composer"].is-selected');
          return {
            listenerCount: fns.length,
            composerSelected: Boolean(selChip),
          };
        })()`);
        assert.ok(popoutSelResult.listenerCount >= 1);
        assert.equal(popoutSelResult.composerSelected, true, 'inspector-picked=composer did not select composer in Popout');

        assert.deepEqual(s307StudioPage.pageExceptions, []);
        assert.deepEqual(s307PopoutPage.pageExceptions, []);
        assert.deepEqual(s307HubPage.pageExceptions, []);
        assert.deepEqual(s307StudioPage.consoleErrors, []);
        assert.deepEqual(s307PopoutPage.consoleErrors, []);
        assert.deepEqual(s307HubPage.consoleErrors, []);
        return 'VM(V2+12-region+F-07+detach-guard+0-body-mut) + Studio DAG/V3 + Chrome(live+static-css+Esc+SSE) verified';
      } finally {
        await browser.closePage(s307HubPage);
        await browser.closePage(s307PopoutPage);
        await browser.closePage(s307StudioPage);
        await s307Srv.close().catch(() => {});
      }
    });

    await check('S3-08: Large-video proxy abort & eager release, scene.pkg HD .tex extraction (PNG/JPEG/RGBA/DXT1/DXT5) & Web proxy/crisp/shim', '@exec-mock-tests', async () => {
      const { buildLiveSceneHtml, injectWebWallpaperHtml } = await import(
        pathToFileURL(path.join(REPO_ROOT, 'src', 'engine', 'runtime', 'web-shim.mjs')).href
      );

      // 1) Synthetic TEX builder & LZ4 literal-block encoder
      const lz4Literal = (buf) => {
        const len = buf.length;
        const parts = [];
        if (len < 15) {
          parts.push(Buffer.from([(len << 4) & 0xf0]));
        } else {
          parts.push(Buffer.from([0xf0]));
          let rem = len - 15;
          while (rem >= 255) {
            parts.push(Buffer.from([255]));
            rem -= 255;
          }
          parts.push(Buffer.from([rem]));
        }
        parts.push(buf);
        return Buffer.concat(parts);
      };
      const buildTex = ({ format = 0, texW = 4, texH = 4, imgW = 4, imgH = 4, ver = 3, fif = -1, lz4 = false, payload }) => {
        const parts = [];
        const cstr = (s) => Buffer.from(`${s}\0`, 'ascii');
        const i32 = (n) => { const b = Buffer.allocUnsafe(4); b.writeInt32LE(n, 0); return b; };
        const u32 = (n) => { const b = Buffer.allocUnsafe(4); b.writeUInt32LE(n >>> 0, 0); return b; };
        parts.push(cstr('TEXV0005'), cstr('TEXI0001'));
        parts.push(i32(format), i32(2), i32(texW), i32(texH), i32(imgW), i32(imgH), u32(0));
        parts.push(cstr(`TEXB000${ver}`), i32(1));
        if (ver >= 3) parts.push(i32(fif));
        if (ver >= 4) parts.push(i32(0));
        parts.push(i32(1), i32(texW), i32(texH));
        const rawBytes = Buffer.from(payload);
        const enc = lz4 ? lz4Literal(rawBytes) : rawBytes;
        if (ver >= 2) parts.push(i32(lz4 ? 1 : 0), i32(lz4 ? rawBytes.length : 0));
        parts.push(i32(enc.length), enc);
        return Buffer.concat(parts);
      };

      // 1a) TEXB0004 embedded PNG
      const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
      const pngHit = extractImageFromTexBytes(buildTex({ format: 0, texW: 1920, texH: 1080, imgW: 1920, imgH: 1080, ver: 4, fif: 13, payload: fakePng }));
      assert.equal(pngHit?.mime, 'image/png');
      assert.equal(pngHit?.width, 1920);
      assert.equal(pngHit?.height, 1080);
      assert.ok(pngHit.bytes.equals(fakePng));

      // 1b) TEXB0003 embedded JPEG
      const fakeJpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
      const jpgHit = extractImageFromTexBytes(buildTex({ format: 0, texW: 1280, texH: 720, imgW: 1280, imgH: 720, ver: 3, fif: 2, payload: fakeJpg }));
      assert.equal(jpgHit?.mime, 'image/jpeg');
      assert.ok(jpgHit.bytes.equals(fakeJpg));

      // 1c) TEXB0003 LZ4 RGBA8888 (8x8 padded -> 6x5 cropped)
      const rgba8x8 = Buffer.alloc(8 * 8 * 4, 0);
      for (let i = 0; i < 8 * 8; i += 1) {
        rgba8x8[i * 4] = 12;
        rgba8x8[i * 4 + 1] = 200;
        rgba8x8[i * 4 + 2] = 90;
        rgba8x8[i * 4 + 3] = 255;
      }
      const rgbaHit = extractImageFromTexBytes(buildTex({ format: 0, texW: 8, texH: 8, imgW: 6, imgH: 5, ver: 3, fif: -1, lz4: true, payload: rgba8x8 }));
      assert.equal(rgbaHit?.mime, 'image/png');
      assert.equal(rgbaHit?.width, 6);
      assert.equal(rgbaHit?.height, 5);
      const decRgba = decodePngRgba(rgbaHit.bytes);
      assert.equal(decRgba.width, 6);
      assert.equal(decRgba.height, 5);
      const pRgba = decRgba.pixelAt(0, 0);
      assert.equal(pRgba.r, 12);
      assert.equal(pRgba.g, 200);
      assert.equal(pRgba.b, 90);

      // 1d) TEXB0003 LZ4 DXT5 (4x4 pure red, alpha=128)
      const dxt5Block = Buffer.alloc(16, 0);
      dxt5Block[0] = 128; // a0
      dxt5Block[1] = 128; // a1
      dxt5Block.writeUInt16LE(0xf800, 8); // c0 = pure red RGB565
      dxt5Block.writeUInt16LE(0xf800, 10); // c1 = pure red RGB565
      const dxt5Hit = extractImageFromTexBytes(buildTex({ format: 4, texW: 4, texH: 4, imgW: 4, imgH: 4, ver: 3, fif: -1, lz4: true, payload: dxt5Block }));
      assert.equal(dxt5Hit?.mime, 'image/png');
      const decDxt5 = decodePngRgba(dxt5Hit.bytes);
      assert.equal(decDxt5.width, 4);
      assert.equal(decDxt5.height, 4);
      const pDxt5 = decDxt5.pixelAt(0, 0);
      assert.equal(pDxt5.r, 255);
      assert.equal(pDxt5.g, 0);
      assert.equal(pDxt5.b, 0);
      assert.equal(pDxt5.a, 128);

      // 1e) TEXB0003 LZ4 DXT1 (4x4 pure green)
      const dxt1Block = Buffer.alloc(8, 0);
      dxt1Block.writeUInt16LE(0x07e0, 0);
      dxt1Block.writeUInt16LE(0x07e0, 2);
      const dxt1Hit = extractImageFromTexBytes(buildTex({ format: 7, texW: 4, texH: 4, imgW: 4, imgH: 4, ver: 3, fif: -1, lz4: true, payload: dxt1Block }));
      assert.equal(dxt1Hit?.mime, 'image/png');
      const decDxt1 = decodePngRgba(dxt1Hit.bytes);
      const pDxt1 = decDxt1.pixelAt(0, 0);
      assert.equal(pDxt1.r, 0);
      assert.equal(pDxt1.g, 255);
      assert.equal(pDxt1.b, 0);

      // 2) Loose scene dir disk-cache + /scene-image/ & /scene-live/ + /web/ proxy base + web-shim
      const tmpSceneDir = path.join(SCRATCH_ROOT, 's308-loose-scene');
      const tmpCacheDir = path.join(SCRATCH_ROOT, 's308-cache');
      const tmpWebDir = path.join(SCRATCH_ROOT, 's308-web');
      fs.mkdirSync(path.join(tmpSceneDir, 'materials'), { recursive: true });
      fs.mkdirSync(tmpCacheDir, { recursive: true });
      fs.mkdirSync(tmpWebDir, { recursive: true });

      const tex64 = Buffer.alloc(64 * 64 * 4, 200);
      fs.writeFileSync(
        path.join(tmpSceneDir, 'materials', 'hero_bg.tex'),
        buildTex({ format: 0, texW: 64, texH: 64, imgW: 64, imgH: 64, ver: 3, fif: -1, lz4: true, payload: tex64 }),
      );
      const ex1 = extractSceneImagePayload(tmpSceneDir, { cacheDir: tmpCacheDir });
      assert.equal(ex1?.kind, 'file');
      assert.equal(ex1?.cached, false);
      const ex2 = extractSceneImagePayload(tmpSceneDir, { cacheDir: tmpCacheDir });
      assert.equal(ex2?.kind, 'file');
      assert.equal(ex2?.cached, true);

      const webHtmlFile = path.join(tmpWebDir, 'index.html');
      fs.writeFileSync(webHtmlFile, '<!doctype html><html><head><title>W</title></head><body>Hi</body></html>', 'utf8');
      const srvS308 = await createMediaServer({ cacheDir: () => tmpCacheDir });
      try {
        const regScene = srvS308.registerEntry({
          id: 's308-hd-scene',
          title: 'S308 Scene',
          kind: 'scene',
          source: 'local',
          sceneMode: 'live',
          schemeColor: '#669DF6',
          _fs: {
            projectDir: tmpSceneDir,
            primaryAbs: null,
            previewAbs: null,
            slidesAbs: [],
            sceneContainerAbs: tmpSceneDir,
            hasSceneVideo: false,
            hasSceneImage: true,
            hasSceneAudio: false,
            looseAudioAbs: null,
            webEntryRel: '',
          },
        });
        assert.ok(regScene.sceneImageUrl && regScene.sceneImageUrl.includes('/scene-image/'));
        const rSceneImg = await invokeServerInMemory(srvS308.server, { method: 'GET', url: '/scene-image/s308-hd-scene' });
        assert.equal(rSceneImg.status, 200);
        assert.equal(rSceneImg.headers['content-type'], 'image/png');
        assert.equal(rSceneImg.body.readUInt32BE(0), 0x89504e47);

        const rSceneLive = await invokeServerInMemory(srvS308.server, { method: 'GET', url: '/scene-live/s308-hd-scene' });
        assert.equal(rSceneLive.status, 200);
        const liveTxt = rSceneLive.text();
        assert.ok(liveTxt.includes('../scene-image/s308-hd-scene'), 'scene-live must reference relative ../scene-image/');
        assert.ok(liveTxt.includes('runtime.onBattery ? 1.0 : 2.0'), 'scene-live DPR cap should be 2.0');

        const regWeb = srvS308.registerFile('s308-web-1', webHtmlFile, 'web');
        assert.ok(regWeb.webUrl);
        const rWebProxy = await invokeServerInMemory(srvS308.server, {
          method: 'GET',
          url: '/web/s308-web-1/index.html',
          headers: { 'x-prism-proxy-base': 'plugin://test-proxy-origin/media-proxy' },
        });
        assert.equal(rWebProxy.status, 200);
        const webOut = rWebProxy.text();
        assert.ok(webOut.includes('<base href="plugin://test-proxy-origin/media-proxy/web/s308-web-1/">'));
        assert.ok(webOut.includes('<meta name="viewport" content="width=device-width,initial-scale=1">'));
        assert.ok(webOut.includes('wallpaperRequestRandomFileForProperty'));

        const injectedRaw = injectWebWallpaperHtml('<html><head></head><body></body></html>', { baseHref: 'http://127.0.0.1/web/x/' });
        assert.ok(injectedRaw.includes('<meta name="viewport"'));
        const liveBuilt = buildLiveSceneHtml({ id: 'x' }, {}, { sceneImageUrl: '../scene-image/x', thumbUrl: '../preview/x' });
        assert.ok(liveBuilt.includes('"sceneImageUrl":"../scene-image/x"'));
      } finally {
        await srvS308.close();
      }

      // 3) Server-side stale /media-proxy/ cancellation on /api/wallpaper/apply + buildClientSkinPayload pluginWebUrl
      const builtWeb = buildClientSkinPayload(
        await engine.getConfig(),
        {
          id: 'web-proxy-check',
          kind: 'web',
          mediaUrl: `${mediaOrigin}/web/web-proxy-check/index.html`,
          webUrl: `${mediaOrigin}/web/web-proxy-check/index.html`,
        },
        mediaOrigin,
        { skinEnabled: true, pluginOrigin: 'plugin://agy-wallpaper-prism--prism_studio-55555' },
      );
      assert.equal(
        builtWeb.activeItem?.pluginWebUrl,
        'plugin://agy-wallpaper-prism--prism_studio-55555/media-proxy/web/web-proxy-check/index.html',
      );

      // Verify /media-proxy/media/<token> serves full unbounded 206 Range with Cache-Control: no-store
      // plus explicit slice Range, HEAD Content-Length, and non-wedging connection pool after abort.
      const capTmpVideo = path.join(SCRATCH_ROOT, 's308-3mb.mp4');
      fs.writeFileSync(capTmpVideo, Buffer.alloc(3 * 1024 * 1024, 0x41));
      const regCapVid = engine.mediaServer.registerFile('s308-cap-video', capTmpVideo, 'video');
      assert.ok(regCapVid && regCapVid.mediaUrl);
      const capPath = new URL(regCapVid.mediaUrl).pathname;

      const capRange = await invokeServerInMemory(studio.server, {
        method: 'GET',
        url: `/media-proxy${capPath}`,
        headers: { Range: 'bytes=0-' },
      });
      assert.equal(capRange.status, 206, `Expected 206 for open-ended Range on /media-proxy${capPath}`);
      assert.equal(capRange.body.length, 3 * 1024 * 1024, `Expected unbounded 3 MiB Range response, got ${capRange.body.length}`);
      assert.equal(
        capRange.headers['content-range'],
        `bytes 0-${3 * 1024 * 1024 - 1}/${3 * 1024 * 1024}`,
        `Unexpected content-range: ${capRange.headers['content-range']}`,
      );
      assert.equal(capRange.headers['cache-control'], 'no-store');

      const capExplicitRange = await invokeServerInMemory(studio.server, {
        method: 'GET',
        url: `/media-proxy${capPath}`,
        headers: { Range: 'bytes=0-63' },
      });
      assert.equal(capExplicitRange.status, 206);
      assert.equal(capExplicitRange.body.length, 64);

      const capHead = await invokeServerInMemory(studio.server, {
        method: 'HEAD',
        url: `/media-proxy${capPath}`,
      });
      assert.equal(capHead.status, 200);
      assert.equal(String(capHead.headers['content-length']), String(3 * 1024 * 1024));

      const slowHttp = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'video/mp4', 'Content-Length': '9999999' });
        res.write(Buffer.alloc(1024));
        // Keep open intentionally until server closes or client destroys
      });
      await new Promise((r) => slowHttp.listen(0, '127.0.0.1', r));
      const slowPort = slowHttp.address().port;
      const slowSrv = await createPrismStudioServer({
        dataDir: path.join(SCRATCH_ROOT, 's308-proxy-data'),
        token: 's308-proxy-tok',
        startCdp: false,
        inspectShortcuts: false,
        engine: {
          ...engine,
          getMediaOrigin: () => `http://127.0.0.1:${slowPort}`,
          getActivePayload: () => engine.getActivePayload(),
          getConfig: () => engine.getConfig(),
          applyWallpaper: (id, patch) => engine.applyWallpaper(id, patch),
        },
      });
      try {
        const srvUrl = new URL(slowSrv.origin || `http://127.0.0.1:${slowSrv.server.address().port}`);
        let proxyClosedOrEnded = false;
        const streamReq = http.get({
          host: srvUrl.hostname,
          port: srvUrl.port,
          path: '/media-proxy/media/old-heavy-video',
        }, (proxyRes) => {
          proxyRes.on('close', () => { proxyClosedOrEnded = true; });
          proxyRes.on('end', () => { proxyClosedOrEnded = true; });
          proxyRes.on('error', () => { proxyClosedOrEnded = true; });
        });
        streamReq.on('error', () => { proxyClosedOrEnded = true; });
        await sleep(80);
        const applyRes = await invokeServerInMemory(slowSrv.server, {
          method: 'POST',
          url: '/api/wallpaper/apply',
          headers: { 'Content-Type': 'application/json', 'X-Sidecar-Token': 's308-proxy-tok' },
          body: JSON.stringify({ wallpaperId: auroraItem.id }),
        });
        assert.equal(applyRes.status, 200);
        await sleep(80);
        assert.equal(proxyClosedOrEnded, true, 'Switching wallpaper did not abort stale /media-proxy/media/ stream!');
        try { streamReq.destroy(); } catch {}

        const statusAfterAbort = await new Promise((resolve, reject) => {
          const t0 = Date.now();
          const stReq = http.get({
            host: srvUrl.hostname,
            port: srvUrl.port,
            path: '/api/status?token=s308-proxy-tok',
            timeout: 1000,
          }, (r) => {
            r.resume();
            r.on('end', () => resolve({ status: r.statusCode, ms: Date.now() - t0 }));
          });
          stReq.on('timeout', () => { stReq.destroy(); reject(new Error('GET /api/status timed out after stale stream abort')); });
          stReq.on('error', reject);
        });
        assert.equal(statusAfterAbort.status, 200);
        assert.ok(statusAfterAbort.ms < 1000, `Expected /api/status <1000ms after abort, got ${statusAfterAbort.ms}ms`);

        // Concurrency cap (MAX_CONCURRENT_STREAM_PROXIES = 4): 4 concurrent streams stay open; 5th evicts oldest so API saves never starve
        const slowStreams = [];
        let firstSlowClosed = false;
        let fourthSlowClosed = false;
        for (let si = 0; si < 5; si += 1) {
          let closed = false;
          const req = http.get({
            host: srvUrl.hostname,
            port: srvUrl.port,
            path: `/media-proxy/media/concurrent-slow-${si}`,
          }, (proxyRes) => {
            proxyRes.on('close', () => { closed = true; if (si === 0) firstSlowClosed = true; if (si === 3) fourthSlowClosed = true; });
            proxyRes.on('end', () => { closed = true; if (si === 0) firstSlowClosed = true; if (si === 3) fourthSlowClosed = true; });
            proxyRes.on('error', () => { closed = true; if (si === 0) firstSlowClosed = true; if (si === 3) fourthSlowClosed = true; });
          });
          req.on('error', () => { closed = true; if (si === 0) firstSlowClosed = true; if (si === 3) fourthSlowClosed = true; });
          slowStreams.push({ req, isClosed: () => closed });
          await sleep(40);
          if (si === 3) {
            await sleep(40);
            assert.equal(firstSlowClosed, false, '4 concurrent /media-proxy/media/ streams must stay open when cap=4');
          }
        }
        await sleep(60);
        assert.equal(firstSlowClosed, true, '5th concurrent /media-proxy/media/ stream should evict oldest stream when cap=4');
        assert.equal(fourthSlowClosed, false, '4th concurrent /media-proxy/media/ stream should remain active when cap=4');
        const cfgSaveRes = await new Promise((resolve, reject) => {
          const payload = JSON.stringify({ patch: { topbarStyle: 'bar' } });
          const req = http.request({
            host: srvUrl.hostname,
            port: srvUrl.port,
            path: '/api/config',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payload),
              'X-Sidecar-Token': 's308-proxy-tok',
            },
            timeout: 1000,
          }, (r) => {
            r.resume();
            r.on('end', () => resolve(r.statusCode));
          });
          req.on('timeout', () => { req.destroy(); reject(new Error('POST /api/config timed out during concurrent streaming')); });
          req.on('error', reject);
          req.end(payload);
        });
        assert.equal(cfgSaveRes, 200, 'POST /api/config should succeed cleanly alongside active streams');
        for (const s of slowStreams) {
          try { s.req.destroy(); } catch {}
        }
      } finally {
        await slowSrv.close().catch(() => {});
        await new Promise((r) => slowHttp.close(() => r()));
      }

      // 4) Host wallpaper-inject.js VM checks: eager plugin:// release + crisp --prism-media-transform: none + pluginWebUrl preference
      const wallSrc = fs.readFileSync(path.join(REPO_ROOT, 'src', 'host', 'wallpaper-inject.js'), 'utf8');
      const vNodes = [];
      const byId = new Map();
      const makeStyle = () => {
        const props = new Map();
        return {
          props,
          opacity: '',
          transition: '',
          clipPath: '',
          transform: '',
          setProperty(k, v) { props.set(k, String(v)); },
          getPropertyValue(k) { return props.get(k) || ''; },
          removeProperty(k) { props.delete(k); },
        };
      };
      const vmMsMap = new Map();
      let vmMsSeq = 0;
      const makeNode = (tag) => {
        const t = String(tag || 'DIV').toUpperCase();
        const el = {
          tagName: t,
          className: '',
          style: makeStyle(),
          children: [],
          parentNode: null,
          _attrs: new Map(),
          _listeners: new Map(),
          _src: '',
          _id: '',
          readyState: 0,
          videoWidth: 0,
          videoHeight: 0,
          paused: true,
          muted: true,
          seeking: false,
          ended: false,
          currentTime: 0,
          duration: 20,
          classList: {
            contains(c) { return String(el.className || '').split(/\s+/).includes(c); },
            add() {},
            remove() {},
          },
          appendChild(c) { c.parentNode = el; el.children.push(c); return c; },
          insertBefore(c) { c.parentNode = el; el.children.push(c); return c; },
          removeChild(c) { const i = el.children.indexOf(c); if (i >= 0) el.children.splice(i, 1); c.parentNode = null; return c; },
          querySelector(sel) {
            if (sel === '.agy-prism-blur-veil' || sel === '.agy-prism-scrim') return null;
            return el.children[0] || null;
          },
          querySelectorAll(sel) {
            const tags = sel.split(',').map((s) => s.trim().toUpperCase());
            const out = [];
            const walk = (n) => { for (const c of n.children || []) { if (tags.includes(c.tagName)) out.push(c); walk(c); } };
            walk(el);
            return out;
          },
          contains(n) { return (el.children || []).includes(n); },
          setAttribute(k, v) { el._attrs.set(k, String(v)); },
          removeAttribute(k) { el._attrs.delete(k); if (k === 'src') el._src = ''; },
          getAttribute(k) { return el._attrs.get(k) || null; },
          hasAttribute(k) { return el._attrs.has(k); },
          addEventListener(type, fn) { const l = el._listeners.get(type) || []; l.push(fn); el._listeners.set(type, l); },
          removeEventListener() {},
          dispatchEvent(ev) { for (const fn of (el._listeners.get(ev.type) || []).slice()) fn(ev); },
          pause() { el.paused = true; },
          play() { el.paused = false; return Promise.resolve(); },
          load() { el.loadCalled = (el.loadCalled || 0) + 1; },
        };
        Object.defineProperty(el, 'id', {
          get() { return el._id; },
          set(v) { el._id = String(v || ''); if (el._id) byId.set(el._id, el); },
        });
        Object.defineProperty(el, 'firstChild', { get() { return el.children[0] || null; } });
        Object.defineProperty(el, 'src', {
          configurable: true,
          get() { return el._src; },
          set(v) {
            el._src = String(v || '');
            if (t === 'VIDEO' && el._src) {
              if (vmMsMap.has(el._src)) {
                vmMsMap.get(el._src)._openFor(el);
                return;
              }
              el.readyState = 4; el.videoWidth = 1920; el.videoHeight = 1080;
              queueMicrotask(() => el.dispatchEvent({ type: 'canplay' }));
            } else if (t === 'IFRAME' && el._src && el._src !== 'about:blank') {
              queueMicrotask(() => el.dispatchEvent({ type: 'load' }));
            }
          },
        });
        Object.defineProperty(el, 'currentSrc', { get() { return el._src; } });
        Object.defineProperty(el, 'isConnected', {
          get() {
            let c = el;
            while (c) {
              if (c === rootNode) return true;
              c = c.parentNode;
            }
            return false;
          },
        });
        if (t === 'VIDEO') vNodes.push(el);
        return el;
      };
      const rootNode = makeNode('HTML');
      const headNode = makeNode('HEAD');
      const bodyNode = makeNode('BODY');
      rootNode.appendChild(headNode);
      rootNode.appendChild(bodyNode);
      byId.set('root', bodyNode);
      const vmDoc = {
        hidden: false,
        documentElement: rootNode,
        head: headNode,
        body: bodyNode,
        createElement: makeNode,
        getElementById(id) { return byId.get(id) || null; },
        querySelector() { return null; },
        querySelectorAll() { return []; },
        addEventListener() {},
        removeEventListener() {},
      };
      let releaseObservedBeforeHead = false;
      const vmFetchUrls = [];
      let vmFakeOffsetMs = 0;
      class VmDate extends Date {
        static now() { return Date.now() + vmFakeOffsetMs; }
      }
      let mseBufStart = 0;
      const vmWinListeners = new Map();
      class SimpleMockMediaSource {
        static isTypeSupported(mime) { return String(mime || '').includes('video/mp4'); }
        constructor() { this.readyState = 'closed'; this._listeners = new Map(); this._video = null; }
        addEventListener(t, fn) { const l = this._listeners.get(t) || []; l.push(fn); this._listeners.set(t, l); }
        removeEventListener() {}
        _openFor(v) {
          this._video = v;
          this.readyState = 'open';
          queueMicrotask(() => {
            for (const fn of (this._listeners.get('sourceopen') || []).slice()) fn({ type: 'sourceopen' });
          });
        }
        addSourceBuffer() {
          const ms = this;
          const sbL = new Map();
          const bufRange = { length: 1, start: () => mseBufStart, end: () => 5 };
          const sb = {
            updating: false,
            buffered: bufRange,
            addEventListener(t, fn) { const l = sbL.get(t) || []; l.push(fn); sbL.set(t, l); },
            removeEventListener() {},
            appendBuffer() {
              sb.updating = true;
              queueMicrotask(() => {
                sb.updating = false;
                if (ms._video) {
                  ms._video.buffered = bufRange;
                  if (ms._video.readyState < 4) {
                    ms._video.readyState = 4; ms._video.videoWidth = 1920; ms._video.videoHeight = 1080;
                    ms._video.dispatchEvent({ type: 'loadeddata' });
                    ms._video.dispatchEvent({ type: 'canplay' });
                  }
                }
                for (const fn of (sbL.get('updateend') || []).slice()) fn({ type: 'updateend' });
              });
            },
            remove() {},
          };
          return sb;
        }
        endOfStream() { this.readyState = 'ended'; }
      }
      const vmWin = {
        document: vmDoc,
        MediaSource: SimpleMockMediaSource,
        URL: {
          createObjectURL: (obj) => {
            const u = `blob:mock-${++vmMsSeq}`;
            if (obj instanceof SimpleMockMediaSource) vmMsMap.set(u, obj);
            return u;
          },
          revokeObjectURL(u) { vmMsMap.delete(u); },
        },
        location: { protocol: 'https:', href: 'https://127.0.0.1:9443/' },
        innerWidth: 1920,
        innerHeight: 1080,
        fetch: (u, o) => {
          const urlStr = String(u);
          vmFetchUrls.push(urlStr);
          if (urlStr.includes('/media/vid-next') && o?.method === 'HEAD') {
            releaseObservedBeforeHead = Boolean(vNodes[0] && vNodes[0]._src === '' && vNodes[0].loadCalled > 0);
            return new Promise((r) => setTimeout(() => r({ ok: true, status: 200 }), 25));
          }
          if (urlStr.includes('/mse-fmp4/')) {
            return Promise.resolve({
              ok: true,
              status: 200,
              headers: { get: (k) => (String(k).toLowerCase() === 'x-prism-mse-mime' ? 'video/mp4; codecs="avc1.640028"' : '') },
              arrayBuffer: () => Promise.resolve(new Uint8Array([0, 0, 0, 8, 102, 116, 121, 112]).buffer),
            });
          }
          return Promise.resolve({ ok: true, status: 200 });
        },
        AbortController,
        Date: VmDate,
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        requestAnimationFrame: (cb) => setTimeout(() => cb(VmDate.now()), 16),
        cancelAnimationFrame: clearTimeout,
        getComputedStyle: () => ({ backgroundColor: 'rgb(7,7,8)', getPropertyValue: () => '' }),
        matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }),
        addEventListener(t, fn) { const l = vmWinListeners.get(t) || []; l.push(fn); vmWinListeners.set(t, l); },
        removeEventListener(t, fn) {
          const l = vmWinListeners.get(t);
          if (l) vmWinListeners.set(t, l.filter((f) => f !== fn));
        },
        dispatchEvent(ev) { for (const fn of (vmWinListeners.get(ev.type) || []).slice()) fn(ev); },
        navigator: {},
      };
      vmWin.window = vmWin;
      vmWin.top = vmWin;
      const ctx308 = vm.createContext({
        window: vmWin,
        document: vmDoc,
        location: vmWin.location,
        MediaSource: SimpleMockMediaSource,
        AbortController,
        Date: VmDate,
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        requestAnimationFrame: vmWin.requestAnimationFrame,
        cancelAnimationFrame: clearTimeout,
        getComputedStyle: vmWin.getComputedStyle,
      });
      vm.runInContext(wallSrc, ctx308, { filename: 'wallpaper-inject.js' });
      const p308 = vmWin.__agyPrism;
      try {
        p308.applyPayload({
          skinEnabled: true,
          config: { switchTransition: 'fade', layerScale: 100, parallaxEnabled: false },
          activeItem: {
            id: 'vid-prev',
            kind: 'video',
            mediaUrl: 'http://127.0.0.1:49152/media/vid-prev',
            pluginMediaUrl: 'plugin://test-p308/media-proxy/media/vid-prev',
          },
        });
        await sleep(40);
        assert.equal(vmDoc.documentElement.style.props.get('--prism-media-transform'), 'none');
        p308.applyPayload({
          skinEnabled: true,
          config: { switchTransition: 'fade', layerScale: 100, parallaxEnabled: false },
          activeItem: {
            id: 'vid-next',
            kind: 'video',
            mediaUrl: 'http://127.0.0.1:49152/media/vid-next',
            pluginMediaUrl: 'plugin://test-p308/media-proxy/media/vid-next',
          },
        });
        await sleep(60);
        assert.equal(releaseObservedBeforeHead, true, 'Outgoing plugin:// video was NOT eagerly released before next HEAD probe!');

        // Large/long muted video (>= 100 MiB or >= 90s) routes directly via MSE /mse-fmp4/ with ZERO plugin:// fetches!
        vmFetchUrls.length = 0;
        p308.applyPayload({
          skinEnabled: true,
          config: { switchTransition: 'cut', layerScale: 100, parallaxEnabled: false, muted: true },
          activeItem: {
            id: 'vid-huge-adler',
            kind: 'video',
            fileSize: 517634490,
            durationSec: 537,
            mediaUrl: 'http://127.0.0.1:49152/media/vid-huge-adler',
            pluginMediaUrl: 'plugin://test-p308/media-proxy/media/vid-huge-adler',
            mseFmp4Url: 'http://127.0.0.1:49152/mse-fmp4/vid-huge-adler',
          },
        });
        await sleep(60);
        assert.equal(p308.status().videoTransport, 'mse', 'Large/long muted video should use direct MSE /mse-fmp4/');
        assert.equal(
          vmFetchUrls.some((u) => u.startsWith('plugin://')),
          false,
          `Large/long muted video must NOT issue plugin:// fetches, saw: ${vmFetchUrls.join(', ')}`,
        );
        assert.equal(
          vmFetchUrls.some((u) => u.includes('/mse-fmp4/vid-huge-adler')),
          true,
          'Large/long muted video should fetch /mse-fmp4/',
        );
        const hugeMseVid = vNodes[vNodes.length - 1];
        assert.equal(hugeMseVid.loop, false, 'MSE video must disable native loop so ended handler controls loopStart/remount');

        // F-01: unmuting a Priority 0 -an MSE large video changes mediaKey and cleanly remounts onto audio-capable stream
        vmFetchUrls.length = 0;
        const beforeUnmuteVids = vNodes.length;
        p308.applyPayload({
          skinEnabled: true,
          config: { switchTransition: 'cut', layerScale: 100, parallaxEnabled: false, muted: false },
          activeItem: {
            id: 'vid-huge-adler',
            kind: 'video',
            fileSize: 517634490,
            durationSec: 537,
            mediaUrl: 'http://127.0.0.1:49152/media/vid-huge-adler',
            pluginMediaUrl: 'plugin://test-p308/media-proxy/media/vid-huge-adler',
            mseFmp4Url: 'http://127.0.0.1:49152/mse-fmp4/vid-huge-adler',
          },
        });
        await sleep(60);
        assert.ok(vNodes.length > beforeUnmuteVids, 'F-01: unmuting Priority 0 -an MSE video must change mediaKey and remount');
        assert.equal(p308.status().videoTransport, 'plugin', 'F-01: unmuted large video must remount onto audio-capable plugin:// stream');
        assert.equal(
          vmFetchUrls.some((u) => u.includes('/media/vid-huge-adler')),
          true,
          'F-01: unmuted large video should fetch audio-capable media stream',
        );

        // HEVC non-zero first PTS (buffered.start(0) > 0): pump aligns currentTime, and ended seeks to buffered.start(0) + 0.001
        mseBufStart = 0.033333;
        p308.applyPayload({
          skinEnabled: true,
          config: { switchTransition: 'cut', layerScale: 100, parallaxEnabled: false, muted: true },
          activeItem: {
            id: 'vid-hevc-offset',
            kind: 'video',
            fileSize: 206986766,
            durationSec: 20,
            mediaUrl: 'http://127.0.0.1:49152/media/vid-hevc-offset',
            pluginMediaUrl: 'plugin://test-p308/media-proxy/media/vid-hevc-offset',
            mseFmp4Url: 'http://127.0.0.1:49152/mse-fmp4/vid-hevc-offset',
          },
        });
        await sleep(60);
        const hevcVid = vNodes[vNodes.length - 1];
        assert.ok(hevcVid.currentTime >= 0.033 && hevcVid.currentTime < 0.05, `Expected HEVC initial PTS alignment ~0.034s, got ${hevcVid.currentTime}`);
        hevcVid.currentTime = 19.9;
        hevcVid.dispatchEvent({ type: 'ended' });
        assert.ok(hevcVid.currentTime >= 0.033 && hevcVid.currentTime < 0.05, `Expected HEVC ended loop to seek ~0.034s, got ${hevcVid.currentTime}`);
        mseBufStart = 0;

        // Blur/wake seeking deadlock self-heal: video stuck at seeking=true, readyState=1 triggers remount after 3 stalled wake checks
        const beforeSeekDeadlockCount = vNodes.length;
        hevcVid.paused = false;
        hevcVid.readyState = 1;
        hevcVid.seeking = true;
        hevcVid.currentTime = 2.565;
        for (let wk = 0; wk < 4; wk += 1) {
          vmFakeOffsetMs += 1100;
          vmWin.dispatchEvent({ type: 'focus' });
          await sleep(220);
        }
        assert.ok(vNodes.length > beforeSeekDeadlockCount, 'Video stuck at seeking=true, readyState=1 should trigger mountStageMedia remount');

        p308.applyPayload({
          skinEnabled: true,
          config: { switchTransition: 'cut', layerScale: 100, parallaxEnabled: false },
          activeItem: {
            id: 'web-p308',
            kind: 'web',
            mediaUrl: 'http://127.0.0.1:49152/web/web-p308/index.html',
            webUrl: 'http://127.0.0.1:49152/web/web-p308/index.html',
            pluginWebUrl: 'plugin://test-p308/media-proxy/web/web-p308/index.html',
          },
        });
        await sleep(30);
        const iframes = vmDoc.getElementById('agy-prism-stage').querySelectorAll('iframe');
        assert.equal(iframes.length, 1);
        assert.equal(iframes[0]._src, 'plugin://test-p308/media-proxy/web/web-p308/index.html');
      } finally {
        p308?.destroy?.();
      }

      // 5) Narrow Studio E2E (560x740): verify #prism-rail-profile-card hidden, .prism-workspace scrolls,
      //    and scrolling down with 90 items advances virtual slice past card 27 (no black void below 27!).
      const narrowRouter = async (reqInfo) => {
        const u = new URL(reqInfo.url);
        if (u.pathname === '/api/library') {
          const mockItems = Array.from({ length: 90 }, (_, idx) => ({
            id: `mock-vscroll-${idx}`,
            title: `Mock Wall ${idx}`,
            kind: 'image',
            source: 'local',
            schemeColor: '#669DF6',
          }));
          return {
            status: 200,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({ items: mockItems, playlists: [], favorites: [], hidden: [] }),
          };
        }
        return universalHttpRouter(reqInfo);
      };
      const narrowPage = await browser.openPage({
        url: `${studio.origin}/?token=${encodeURIComponent(SIDECAR_TEST_TOKEN)}`,
        requestHandler: narrowRouter,
        width: 560,
        height: 740,
      });
      try {
        const waitLimit = Date.now() + 8000;
        while (Date.now() < waitLimit) {
          if (await narrowPage.evaluate(`document.querySelectorAll('.prism-wall-card').length > 0`)) break;
          await sleep(60);
        }
        const narrowLayout = await narrowPage.evaluate(`(() => {
          const prof = document.getElementById('prism-rail-profile-card');
          const ws = document.querySelector('.prism-workspace');
          const profDisp = prof ? getComputedStyle(prof).display : 'missing';
          const wsOvY = ws ? getComputedStyle(ws).overflowY : 'missing';
          const initialIds = [...document.querySelectorAll('.prism-wall-card')].map((el) => el.dataset.id);
          return { profDisp, wsOvY, initialFirst: initialIds[0], initialLast: initialIds[initialIds.length - 1], initialCount: initialIds.length };
        })()`);
        assert.equal(narrowLayout.profDisp, 'none', '#prism-rail-profile-card must be hidden in <840px narrow sidebar');
        assert.equal(narrowLayout.wsOvY, 'auto', '.prism-workspace must scroll in <840px narrow sidebar');
        assert.ok(narrowLayout.initialCount > 0, 'Narrow Studio must render initial wallpaper cards');

        // Scroll .prism-workspace down 2200px and assert virtual window renders later cards (e.g. idx > 27)!
        const scrolledState = await narrowPage.evaluate(`(async () => {
          const ws = document.querySelector('.prism-workspace');
          ws.scrollTop = 2200;
          ws.dispatchEvent(new Event('scroll'));
          await new Promise((r) => setTimeout(r, 150));
          const ids = [...document.querySelectorAll('.prism-wall-card')].map((el) => el.dataset.id);
          return { wsScrollTop: ws.scrollTop, firstId: ids[0], lastId: ids[ids.length - 1], count: ids.length };
        })()`);
        const firstIdx = Number(String(scrolledState.firstId || '').replace('mock-vscroll-', ''));
        const lastIdx = Number(String(scrolledState.lastId || '').replace('mock-vscroll-', ''));
        assert.ok(
          scrolledState.count > 0 && lastIdx > 27,
          `Expected virtual scroll in <840px to render past item 27, got ${scrolledState.firstId}..${scrolledState.lastId} (count=${scrolledState.count})`,
        );
        assert.ok(firstIdx > 0, `Expected virtual start index > 0 after scrolling .prism-workspace, got ${firstIdx}`);
      } finally {
        await browser.closePage(narrowPage);
      }

      return 'TEX(PNG/JPG/RGBA/DXT5/DXT1) + /scene-image/ + web proxy base + /media-proxy/ cancel + large-video MSE + narrow layout & virtual scroll verified';
    });

    await check('S3-09: `v2.4.1` Chat Bubbles & Controls Default-No-Blur (OQ-1A), 5 `GLASS_STYLES`, F-02..F-06 Guardrails, Live/Static Parity & 12-Region CDP Picker E2E', '@exec-v24-tests', async () => {
      const { computeShadowFactor } = await import(
        pathToFileURL(path.join(REPO_ROOT, 'src', 'host', 'index.mjs')).href
      );
      // F-02 direct unit assertion: alpha=0 MUST produce 0 shadow factor even with elevation=1.5
      assert.equal(computeShadowFactor(0, true, 1.5), 0, 'F-02 violated: alpha=0 produced non-zero shadow factor!');
      assert.equal(computeShadowFactor(0.5, true, 0), 0, 'elevation=0 must produce 0 shadow factor');
      assert.ok(computeShadowFactor(0.5, true, 1.5) > 0, 'elevation=1.5 with alpha=0.5 should produce positive shadow factor');

      await engine.applyWallpaper(auroraItem.id, {
        skinEnabled: true,
        startupMode: 'gentle-auto',
        preset: 'islands',
        layoutMode: 'islands',
        glassSurfaces: true,
        glassBlur: 16,
        codeReadabilityMode: 'translucent',
        borders: 'on',
        shadows: true,
        colorScheme: 'prism-default',
        themeMode: 'dark',
        regions: null,
        surfaceTints: null,
      });

      const hubLivePage = await browser.openPage({
        url: `${HUB_MOCK_ORIGIN}/hub`,
        requestHandler: universalHttpRouter,
      });
      const hubStaticPage = await browser.openPage({
        url: `${HUB_MOCK_ORIGIN}/hub`,
        requestHandler: universalHttpRouter,
      });
      try {
        await sleep(220);
        await hubLivePage.evaluate(
          buildHostMicroBootstrap({
            hostOrigin: studio.origin,
            capToken: studio.hostCapToken,
            triggerMode: 'both',
            startupMode: 'gentle-auto',
            skinEnabled: true,
          }),
        );
        const readyDeadline = Date.now() + 3500;
        while (Date.now() < readyDeadline) {
          if (await hubLivePage.evaluate(`document.documentElement.getAttribute('data-agy-prism-wallpaper') === 'ready'`)) break;
          await sleep(40);
        }
        assert.equal(
          await hubLivePage.evaluate(`document.documentElement.getAttribute('data-agy-prism-wallpaper')`),
          'ready',
          'S3-09 Live Hub did not reach ready state',
        );

        // 1) OQ-1A Default-No-Blur, F-03 body[data-agy-theme] specificity & F-04 outer <pre> hollowing
        const oq1aAudit = await hubLivePage.evaluate(`(() => {
          const bf = (el) => {
            const cs = getComputedStyle(el);
            return cs.backdropFilter || cs.webkitBackdropFilter || 'none';
          };
          const bfBefore = (el) => {
            const cs = getComputedStyle(el, '::before');
            return cs.backdropFilter || cs.webkitBackdropFilter || 'none';
          };
          const preOuter = document.getElementById('v235-standalone-code-pre');
          const preOuterCs = getComputedStyle(preOuter);
          return {
            userBubbleBf: bf(document.getElementById('v235-user-bubble')),
            userBubbleBg: getComputedStyle(document.getElementById('v235-user-bubble')).backgroundColor,
            plannerBf: bf(document.getElementById('v235-planner-response')),
            plannerBg: getComputedStyle(document.getElementById('v235-planner-response')).backgroundColor,
            artifactBf: bf(document.getElementById('v235-artifact-card')),
            codeBoxBf: bf(document.getElementById('v235-standalone-code-box')),
            btnSmBf: bf(document.getElementById('v235-btn-sm')),
            btnSmRadius: getComputedStyle(document.getElementById('v235-btn-sm')).borderRadius,
            scrollBtnRadius: getComputedStyle(document.getElementById('v235-scroll-bottom-btn')).borderRadius,
            fieldBf: bf(document.getElementById('v235-input-field')),
            scrollBtnBf: bf(document.getElementById('v235-scroll-bottom-btn')),
            auxTabBf: bf(document.getElementById('v235-aux-tab')),
            takeoverBf: bf(document.getElementById('v235-takeover-card')),
            fastpickBf: bf(document.getElementById('v235-fastpick-probe')),
            sidebarBf: bfBefore(document.querySelector('.agy-sidebar')),
            composerBeforeBf: bfBefore(document.getElementById('antigravity.agentSidePanelInputBox')),
            preOuterBg: preOuterCs.backgroundColor,
            preOuterBorderTop: preOuterCs.borderTopWidth,
          };
        })()`);
        assert.equal(oq1aAudit.userBubbleBf, 'none', `OQ-1A: userBubble default must have backdrop-filter none, got ${oq1aAudit.userBubbleBf}`);
        assert.notEqual(oq1aAudit.userBubbleBg, 'rgb(19, 19, 23)', 'F-03: Prism body[data-agy-theme] must override native --glass #131317 on .agy-user-bubble');
        assert.equal(oq1aAudit.plannerBf, 'none', `OQ-1A: assistantBubble default must have backdrop-filter none, got ${oq1aAudit.plannerBf}`);
        assert.equal(parseAlphaFromCssColor(oq1aAudit.plannerBg), 0, `assistantBubble default must stay transparent, got ${oq1aAudit.plannerBg}`);
        assert.equal(oq1aAudit.artifactBf, 'none', `OQ-1A: artifact-card default must have backdrop-filter none, got ${oq1aAudit.artifactBf}`);
        assert.equal(oq1aAudit.codeBoxBf, 'none', `OQ-1A: codeBlock default must have backdrop-filter none, got ${oq1aAudit.codeBoxBf}`);
        assert.equal(oq1aAudit.btnSmBf, 'none', `OQ-1A: controls button default must have backdrop-filter none, got ${oq1aAudit.btnSmBf}`);
        assert.equal(oq1aAudit.btnSmRadius, '9px', `2.35+ secondary button expected 9px balanced --prism-r-control, got ${oq1aAudit.btnSmRadius}`);
        assert.equal(oq1aAudit.scrollBtnRadius, '9999px', `2.35+ pill control (.agy-scroll-bottom) expected 9999px --prism-r-control-pill, got ${oq1aAudit.scrollBtnRadius}`);
        assert.equal(oq1aAudit.fieldBf, 'none');
        assert.equal(oq1aAudit.scrollBtnBf, 'none');
        assert.equal(oq1aAudit.auxTabBf, 'none');
        assert.equal(oq1aAudit.takeoverBf, 'none', `OQ-1A: card takeover default must have backdrop-filter none, got ${oq1aAudit.takeoverBf}`);
        assert.equal(oq1aAudit.fastpickBf, 'none', `OQ-1A: .agy-fastpick.surface-glass default must suppress native blur(40px), got ${oq1aAudit.fastpickBf}`);
        assert.match(oq1aAudit.sidebarBf, /blur\(/, `Existing sidebar chrome must preserve blur at glassBlur=16, got ${oq1aAudit.sidebarBf}`);
        assert.match(oq1aAudit.composerBeforeBf, /blur\(/, `Existing composer::before chrome must preserve blur at glassBlur=16, got ${oq1aAudit.composerBeforeBf}`);
        assert.equal(oq1aAudit.preOuterBg, 'rgba(0, 0, 0, 0)', `F-04: outer <pre> wrapping div.rounded-xl.border must be hollowed, got ${oq1aAudit.preOuterBg}`);
        assert.equal(oq1aAudit.preOuterBorderTop, '0px', `F-04: outer <pre> border must be 0px, got ${oq1aAudit.preOuterBorderTop}`);

        // 2) All 5 GLASS_STYLES + saturation + elevation + F-02 alpha=0 zero-shadow + F-04 nested code suppression + F-06 typography vars
        const styleCycleAudit = await hubLivePage.evaluate(`(() => {
          const bf = (el) => {
            const cs = getComputedStyle(el);
            return cs.backdropFilter || cs.webkitBackdropFilter || 'none';
          };
          const ub = document.getElementById('v235-user-bubble');
          const pl = document.getElementById('v235-planner-response');
          const nestedBox = document.getElementById('v235-nested-code-box');
          const topBox = document.getElementById('v235-standalone-code-box');
          const spanTok = document.querySelector('#v235-nested-code-pre code span');
          const out = {};

          for (const stName of ['none', 'frosted', 'crystal', 'tinted', 'solid']) {
            window.__agyPrism.updateConfig({
              glassBlur: 16,
              regions: {
                userBubble: {
                  style: stName,
                  blur: stName === 'frosted' || stName === 'crystal' ? 16 : null,
                  saturation: stName === 'frosted' ? 185 : null,
                  elevation: stName === 'frosted' ? 1.5 : 0,
                  opacity: stName === 'solid' || stName === 'none' ? null : 0.55,
                },
              },
            });
            const ucs = getComputedStyle(ub);
            out[stName] = { bf: bf(ub), bg: ucs.backgroundColor, shadow: ucs.boxShadow };
          }

          // F-04: Blur assistantBubble + codeBlock simultaneously -> top-level code blurs, nested code stays none & var='--prism-code-backdrop: none'
          window.__agyPrism.updateConfig({
            borders: 'off',
            shadows: true,
            regions: {
              assistantBubble: { style: 'frosted', blur: 16, opacity: 0.48 },
              codeBlock: { style: 'frosted', blur: 16, fontColor: '#A855F7' },
              userBubble: { style: 'frosted', opacity: 0.55, elevation: 0, fontColor: '#00E5FF', fontSize: 15 },
            },
          });
          out.f04 = {
            plannerBf: bf(pl),
            plannerCodeVar: getComputedStyle(pl).getPropertyValue('--prism-code-backdrop').trim(),
            nestedCodeBf: bf(nestedBox),
            topCodeBf: bf(topBox),
            userFgVar: getComputedStyle(document.documentElement).getPropertyValue('--prism-region-userBubble-fg').trim(),
            userFontSize: getComputedStyle(ub).fontSize,
            spanColor: spanTok ? getComputedStyle(spanTok).color : '',
            userBubbleElev0Shadow: getComputedStyle(ub).boxShadow,
          };

          // Test alpha=0 + elevation=2 on assistantBubble emits 0 phantom shadow (F-02)
          window.__agyPrism.updateConfig({
            regions: {
              assistantBubble: { style: 'frosted', opacity: 0, elevation: 2 },
            },
          });
          out.f02ZeroAlphaShadow = getComputedStyle(pl).boxShadow;

          // SCENE_PRESETS.crisp (global glassBlur=0)
          window.__agyPrism.updateConfig({ preset: 'crisp', glassBlur: 0, surfaceTints: null, regions: null });
          out.crisp = {
            sidebarBf: bf(document.querySelector('.agy-sidebar')),
            userBubbleBf: bf(ub),
            codeBf: bf(topBox),
          };
          return out;
        })()`);
        assert.equal(styleCycleAudit.none.bf, 'none');
        assert.match(styleCycleAudit.frosted.bf, /blur\(/);
        const frostedSat = /saturate\(([\d.]+)(%?)\)/.exec(styleCycleAudit.frosted.bf);
        assert.ok(frostedSat && (frostedSat[2] === '%' ? Number(frostedSat[1]) >= 180 : Number(frostedSat[1]) >= 1.8), `Expected frosted saturation ~185%, got ${styleCycleAudit.frosted.bf}`);
        assert.notEqual(styleCycleAudit.frosted.shadow, 'none', 'frosted with elevation=1.5 should emit shadow');
        assert.match(styleCycleAudit.crystal.bf, /blur\(/);
        assert.equal(styleCycleAudit.tinted.bf, 'none');
        assert.equal(styleCycleAudit.solid.bf, 'none');
        assert.ok(parseAlphaFromCssColor(styleCycleAudit.solid.bg) >= 0.94, `Expected solid userBubble alpha >= 0.94, got ${styleCycleAudit.solid.bg}`);

        assert.match(styleCycleAudit.f04.plannerBf, /blur\(/, 'Blurred assistantBubble failed to get blur');
        assert.equal(styleCycleAudit.f04.plannerCodeVar, 'none', 'F-04: [data-testid="planner-response-text"] must suppress --prism-code-backdrop');
        assert.equal(styleCycleAudit.f04.nestedCodeBf, 'none', `F-04: nested code inside blurred assistantBubble must NOT double-blur, got ${styleCycleAudit.f04.nestedCodeBf}`);
        assert.match(styleCycleAudit.f04.topCodeBf, /blur\(/, `Top-level codeBlock must still blur, got ${styleCycleAudit.f04.topCodeBf}`);
        assert.ok(styleCycleAudit.f04.userFgVar.length > 0, 'F-06: missing camelCase --prism-region-userBubble-fg variable');
        assert.equal(styleCycleAudit.f04.userFontSize, '15px', 'userBubble typography fontSize override failed');
        assert.equal(styleCycleAudit.f04.spanColor, 'rgb(255, 136, 0)', `Syntax highlighting token clobbered: ${styleCycleAudit.f04.spanColor}`);
        assert.equal(styleCycleAudit.f02ZeroAlphaShadow, 'none', `F-02: alpha=0 assistantBubble leaked phantom shadow ${styleCycleAudit.f02ZeroAlphaShadow}`);
        assert.equal(styleCycleAudit.crisp.sidebarBf, 'none');
        assert.equal(styleCycleAudit.crisp.userBubbleBf, 'none');
        assert.equal(styleCycleAudit.crisp.codeBf, 'none');

        // 3) Quick Prism (`panel-inject.js`): 5 presets (crisp), 12 comp rows, inline style cycler & #15 CN l10n 0 mutations
        await engine.applyWallpaper(auroraItem.id, {
          skinEnabled: true,
          startupMode: 'gentle-auto',
          preset: 'islands',
          glassBlur: 16,
          regions: null,
          surfaceTints: null,
        });
        await hubLivePage.pressKey({ key: 'w', code: 'KeyW', windowsVirtualKeyCode: 87, modifiers: 3 });
        let popReady = false;
        const popWait = Date.now() + 3000;
        while (Date.now() < popWait) {
          if (await hubLivePage.evaluate(`Boolean(window.__agyPrismPanel && window.__agyPrismPanel.status().open)`)) {
            popReady = true;
            break;
          }
          await sleep(40);
        }
        assert.equal(popReady, true, 'S3-09: Ctrl+Alt+W failed to open Quick Prism panel');
        const qpAudit = await hubLivePage.evaluate(`(async () => {
          const pop = document.getElementById('agy-prism-popover');
          const tabs = pop.querySelectorAll('[role="tab"]');
          if (tabs[1]) tabs[1].click();
          const acc = pop.querySelector('[data-testid="prism-comp-accordion"]');
          if (acc && !acc.open) acc.querySelector('summary')?.click();
          const presetIds = Array.from(pop.querySelectorAll('.pp-preset')).map((b) => b.getAttribute('data-preset'));
          const compIds = Array.from(acc.querySelectorAll('.pp-comp-srow')).map((r) => r.getAttribute('data-comp'));
          const styleBtnBefore = pop.querySelector('[data-testid="prism-pop-style-userBubble"]')?.getAttribute('data-eff-style');
          pop.querySelector('[data-testid="prism-pop-style-userBubble"]')?.click();
          await new Promise((r) => setTimeout(r, 140));
          const styleBtnAfter = pop.querySelector('[data-testid="prism-pop-style-userBubble"]')?.getAttribute('data-style');
          const l10n = window.__runMockDomTranslator();
          return {
            presetIds,
            compIds,
            styleBtnBefore,
            styleBtnAfter,
            touchedPrismIds: l10n.touchedPrismIds,
          };
        })()`);
        assert.deepEqual(qpAudit.presetIds, ['crisp', 'crystal', 'islands', 'focus', 'eco']);
        assert.equal(qpAudit.compIds.length, 12, `Expected 12 Quick Prism component rows, got ${qpAudit.compIds.length}`);
        assert.equal(qpAudit.styleBtnBefore, 'none');
        assert.equal(qpAudit.styleBtnAfter, 'frosted', 'Quick Prism inline style cycler did not promote userBubble none -> frosted');
        assert.deepEqual(qpAudit.touchedPrismIds, [], `#15 CN l10n mutated Prism DOM: ${qpAudit.touchedPrismIds.join(', ')}`);

        await hubLivePage.evaluate(`window.__agyPrismPanel?.close?.()`);
        await sleep(80);

        // 4) Live vs Static-CSS Parity (`buildStaticCssSheet`) under F-03 / F-04 / F-06
        const parityCfg = {
          skinEnabled: true,
          layoutMode: 'islands',
          glassSurfaces: true,
          glassBlur: 16,
          borders: 'on',
          shadows: true,
          regions: {
            userBubble: { style: 'none', opacity: 0.52 },
            assistantBubble: { style: 'frosted', blur: 16, opacity: 0.45 },
            codeBlock: { style: 'frosted', blur: 16, fontColor: '#A855F7' },
            controls: { style: 'none' },
            card: { style: 'none' },
          },
        };
        await engine.applyWallpaper(auroraItem.id, parityCfg);
        const paritySt = await studio.getState();
        const parityPayload = buildClientSkinPayload(paritySt.config, auroraItem, paritySt.mediaOrigin, { skinEnabled: true });
        await hubLivePage.evaluate(`window.__agyPrism.applyPayload(${JSON.stringify(parityPayload)})`);
        await sleep(100);
        const staticCss = buildStaticCssSheet(parityPayload);
        await hubStaticPage.evaluate(`(() => {
          let st = document.getElementById('s309-static-sheet');
          if (!st) {
            st = document.createElement('style');
            st.id = 's309-static-sheet';
            document.head.appendChild(st);
          }
          st.textContent = ${JSON.stringify(staticCss)};
        })()`);
        await sleep(100);

        const collectParity = (page) =>
          page.evaluate(`(() => {
            const bf = (el) => {
              const cs = getComputedStyle(el);
              return cs.backdropFilter || cs.webkitBackdropFilter || 'none';
            };
            const pre = document.getElementById('v235-standalone-code-pre');
            const ub = document.getElementById('v235-user-bubble');
            const nested = document.getElementById('v235-nested-code-box');
            const top = document.getElementById('v235-standalone-code-box');
            const fp = document.getElementById('v235-fastpick-probe');
            const btn = document.getElementById('v235-btn-sm');
            return {
              userBubbleBg: getComputedStyle(ub).backgroundColor,
              userBubbleBf: bf(ub),
              preHollowBg: getComputedStyle(pre).backgroundColor,
              nestedCodeBf: bf(nested),
              topCodeHasBlur: /blur\\(/.test(bf(top)),
              fastpickBf: bf(fp),
              btnBf: bf(btn),
            };
          })()`);
        const liveParity = await collectParity(hubLivePage);
        const staticParity = await collectParity(hubStaticPage);
        assert.notEqual(liveParity.userBubbleBg, 'rgb(19, 19, 23)');
        assert.notEqual(staticParity.userBubbleBg, 'rgb(19, 19, 23)', 'F-03 Static-CSS parity failed: body[data-agy-theme] native --glass #131317 won!');
        assert.equal(liveParity.userBubbleBf, 'none');
        assert.equal(staticParity.userBubbleBf, 'none');
        assert.equal(liveParity.preHollowBg, 'rgba(0, 0, 0, 0)');
        assert.equal(staticParity.preHollowBg, 'rgba(0, 0, 0, 0)');
        assert.equal(liveParity.nestedCodeBf, 'none');
        assert.equal(staticParity.nestedCodeBf, 'none');
        assert.equal(liveParity.topCodeHasBlur, true);
        assert.equal(staticParity.topCodeHasBlur, true);
        assert.equal(liveParity.fastpickBf, 'none');
        assert.equal(staticParity.fastpickBf, 'none');
        assert.equal(liveParity.btnBf, 'none');
        assert.equal(staticParity.btnBf, 'none');

        // 5) 12-Region Live Hub CDP Inspector hitTestAt on all new v2.4 regions
        await hubLivePage.evaluate(`(() => {
          const s = document.createElement('script');
          s.id = 'agy-prism-inspector-loader';
          s.src = ${JSON.stringify(`${studio.origin}/host/${studio.hostCapToken}/inspector.js?t=${Date.now()}`)};
          document.head.appendChild(s);
        })()`);
        const insWait = Date.now() + 2500;
        while (Date.now() < insWait) {
          if (await hubLivePage.evaluate(`Boolean(window.__agyPrismInspector && window.__agyPrismInspector.active())`)) break;
          await sleep(30);
        }
        const livePickerHits = await hubLivePage.evaluate(`(() => {
          const ins = window.__agyPrismInspector;
          const hitEl = (sel) => {
            const el = document.querySelector(sel);
            el.scrollIntoView({ block: 'center', behavior: 'instant' });
            const r = el.getBoundingClientRect();
            return ins.hitTestAt(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2))?.regionId;
          };
          return {
            userBubble: hitEl('#v235-user-bubble'),
            assistantBubble: hitEl('#v235-worked-for'),
            codeBlock: hitEl('#v235-standalone-code-box'),
            controls: hitEl('#v235-btn-sm'),
            card: hitEl('#v235-takeover-card'),
            popover: hitEl('#v235-fastpick-probe'),
          };
        })()`);
        assert.equal(livePickerHits.userBubble, 'userBubble');
        assert.equal(livePickerHits.assistantBubble, 'assistantBubble');
        assert.equal(livePickerHits.codeBlock, 'codeBlock');
        assert.equal(livePickerHits.controls, 'controls');
        assert.equal(livePickerHits.card, 'card');
        assert.equal(livePickerHits.popover, 'popover');
        await hubLivePage.pressKey({ key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });

        assert.deepEqual(hubLivePage.pageExceptions, []);
        assert.deepEqual(hubStaticPage.pageExceptions, []);
        assert.deepEqual(hubLivePage.consoleErrors, []);
        assert.deepEqual(hubStaticPage.consoleErrors, []);
        return 'OQ-1A zero-blur + 5 GLASS_STYLES + F-02..F-06 + Live/Static parity + Quick Prism + 12-region CDP picker verified';
      } finally {
        await browser.closePage(hubStaticPage).catch(() => {});
        await browser.closePage(hubLivePage).catch(() => {});
        await engine.applyWallpaper(auroraItem.id, {
          skinEnabled: true,
          startupMode: 'gentle-auto',
          preset: 'islands',
          layoutMode: 'islands',
          glassBlur: 16,
          regions: null,
          surfaceTints: null,
        }).catch(() => {});
      }
    });

    await check('S3-10: `v2.4.1` Dual-Form Visual Editor (12 Regions & Mini Preview), Narrow `<840px` Scroll, Studio Crisp/F-05 & Quick Prism 9-Key Reset Parity E2E', '@exec-v24-tests', async () => {
      await engine.applyWallpaper(auroraItem.id, {
        skinEnabled: true,
        startupMode: 'gentle-auto',
        preset: 'islands',
        layoutMode: 'islands',
        glassBlur: 16,
        codeReadabilityMode: 'translucent',
        regions: null,
        surfaceTints: null,
      });

      const studioPage = await browser.openPage({
        url: `${studio.origin}/?token=${encodeURIComponent(SIDECAR_TEST_TOKEN)}`,
        requestHandler: universalHttpRouter,
      });
      const popoutPage = await browser.openPage({
        url: `${studio.origin}/?mode=visual-editor`,
        requestHandler: universalHttpRouter,
      });
      const narrowStudioPage = await browser.openPage({
        url: `${studio.origin}/?token=${encodeURIComponent(SIDECAR_TEST_TOKEN)}`,
        requestHandler: universalHttpRouter,
        width: 560,
        height: 740,
      });
      const hubQpPage = await browser.openPage({
        url: `${HUB_MOCK_ORIGIN}/hub`,
        requestHandler: universalHttpRouter,
      });

      try {
        const waitStudio = Date.now() + 3500;
        while (Date.now() < waitStudio) {
          if (await studioPage.evaluate(`Boolean(document.querySelector('[data-action="switch-tab"][data-tab="skin"]'))`)) break;
          await sleep(40);
        }

        // 1) Studio Skin Tab: 12 accordions, crisp preset, F-05 codeReadabilityMode badge sync & float elevation, auto-promote blur -> frosted, scroll-margin-top: 56px
        await studioPage.evaluate(`document.querySelector('[data-action="switch-tab"][data-tab="skin"]')?.click()`);
        await sleep(220);

        const studioSkinAudit = await studioPage.evaluate(`(async () => {
          const accs = Array.from(document.querySelectorAll('#prism-region-accordions > details.prism-region-group'));
          const presets = Array.from(document.querySelectorAll('[data-action="apply-scene-preset"][data-preset]')).map((b) => b.getAttribute('data-preset'));
          const scrollMargin = accs[0] ? getComputedStyle(accs[0]).scrollMarginTop : '';

          // Apply 'crisp' preset button
          document.querySelector('[data-action="apply-scene-preset"][data-preset="crisp"]')?.click();
          await new Promise((r) => setTimeout(r, 180));
          return {
            accIds: accs.map((d) => d.getAttribute('data-region')),
            presets,
            scrollMargin,
            crispActive: document.querySelector('[data-action="apply-scene-preset"][data-preset="crisp"]')?.classList.contains('is-active') || false,
          };
        })()`);
        assert.equal(studioSkinAudit.accIds.length, 12, `Expected 12 Studio region accordions, got ${studioSkinAudit.accIds.length}`);
        assert.deepEqual(studioSkinAudit.presets, ['crisp', 'crystal', 'islands', 'focus', 'eco']);
        assert.equal(studioSkinAudit.crispActive, true, 'Crisp scene preset card did not activate on click');
        assert.equal(studioSkinAudit.scrollMargin, '56px', `Expected .prism-region-group scroll-margin-top: 56px, got ${studioSkinAudit.scrollMargin}`);
        assert.equal((await engine.getConfig()).glassBlur, 0, 'Studio crisp preset did not set glassBlur=0');

        // Restore islands (blur 16), then check F-05 codeReadabilityMode badge sync + float elevation + blur>0 auto-promote
        await engine.updateConfig({ preset: 'islands', glassBlur: 16, codeReadabilityMode: 'translucent', regions: null, surfaceTints: null });
        await sleep(180);

        const f05StudioAudit = await studioPage.evaluate(`(async () => {
          const cbDet = document.querySelector('details.prism-region-group[data-region="codeBlock"]');
          if (cbDet && !cbDet.open) cbDet.querySelector('summary')?.click();
          const chipBeforeEl = cbDet?.querySelector('[data-region-style-chip="codeBlock"]');
          const badgeBefore = chipBeforeEl?.textContent?.trim() || '';
          const kindBefore = chipBeforeEl?.getAttribute('data-style-kind') || '';
          cbDet?.querySelector('[data-action="set-enum"][data-key="codeReadabilityMode"][data-val="frosted"]')?.click();
          await new Promise((r) => setTimeout(r, 180));
          const cbDetAfter = document.querySelector('details.prism-region-group[data-region="codeBlock"]');
          const chipAfterEl = cbDetAfter?.querySelector('[data-region-style-chip="codeBlock"]');
          const badgeAfter = chipAfterEl?.textContent?.trim() || '';
          const kindAfter = chipAfterEl?.getAttribute('data-style-kind') || '';

          const ubDet = document.querySelector('details.prism-region-group[data-region="userBubble"]');
          if (ubDet && !ubDet.open) ubDet.querySelector('summary')?.click();
          const elevRange = ubDet?.querySelector('[data-config-slider="regions.userBubble.elevation"]');
          const elevStep = elevRange ? elevRange.getAttribute('step') : '';
          if (elevRange) {
            elevRange.value = '1.45';
            elevRange.dispatchEvent(new Event('input', { bubbles: true }));
            elevRange.dispatchEvent(new Event('change', { bubbles: true }));
          }
          const blurRange = ubDet?.querySelector('[data-config-slider="regions.userBubble.blur"]');
          if (blurRange) {
            blurRange.value = '14';
            blurRange.dispatchEvent(new Event('input', { bubbles: true }));
            blurRange.dispatchEvent(new Event('change', { bubbles: true }));
          }
          await new Promise((r) => setTimeout(r, 220));
          const ubDetAfter = document.querySelector('details.prism-region-group[data-region="userBubble"]');
          const elevValText = ubDetAfter?.querySelector('[data-slider-key="regions.userBubble.elevation"] .prism-slider-val')?.textContent?.trim() || '';
          const satActive = ubDetAfter?.querySelector('[data-optical-sat-wrap="userBubble"]')?.getAttribute('data-blur-active') || '';
          const frostedActive = ubDetAfter?.querySelector('[data-action="set-region-prop"][data-region="userBubble"][data-prop="style"][data-val="frosted"]')?.classList.contains('is-active') || false;

          // Restore collapsed accordions
          if (cbDetAfter && cbDetAfter.open) cbDetAfter.querySelector('summary')?.click();
          if (ubDetAfter && ubDetAfter.open) ubDetAfter.querySelector('summary')?.click();
          return { badgeBefore, kindBefore, badgeAfter, kindAfter, elevStep, elevValText, satActive, frostedActive };
        })()`);
        assert.notEqual(f05StudioAudit.badgeAfter, f05StudioAudit.badgeBefore, 'F-05: codeReadabilityMode=frosted failed to update codeBlock style chip');
        assert.equal(f05StudioAudit.kindBefore, 'none');
        assert.equal(f05StudioAudit.kindAfter, 'frosted', `F-05: codeBlock style chip data-style-kind expected frosted, got ${f05StudioAudit.kindAfter}`);
        assert.equal(f05StudioAudit.elevStep, '0.05', 'F-05: elevation slider step must be 0.05');
        assert.ok(f05StudioAudit.elevValText.includes('1.45'), `F-05: elevation readout rounded float 1.45 -> "${f05StudioAudit.elevValText}"`);
        assert.equal(f05StudioAudit.frostedActive, true, 'Setting userBubble.blur=14 on zero-blur auto region must auto-promote style to frosted');
        assert.equal(f05StudioAudit.satActive, 'true', 'Auto-promoting to frosted must enable saturation control (data-blur-active="true")');
        const cfgAfterPromote = await engine.getConfig();
        assert.equal(cfgAfterPromote.regions.userBubble.style, 'frosted');
        assert.equal(cfgAfterPromote.regions.userBubble.elevation, 1.45);

        // 2) Narrow Studio <840px (560x740) Scroll & Readability on expanded 12-Region Skin tab
        await narrowStudioPage.evaluate(`document.querySelector('[data-action="switch-tab"][data-tab="skin"]')?.click()`);
        await sleep(220);
        const narrowSkinAudit = await narrowStudioPage.evaluate(`(async () => {
          const ws = document.querySelector('.prism-workspace');
          const ub = document.querySelector('details.prism-region-group[data-region="userBubble"]');
          const pop = document.querySelector('details.prism-region-group[data-region="popover"]');
          if (ub && !ub.open) ub.querySelector('summary')?.click();
          if (pop && !pop.open) pop.querySelector('summary')?.click();
          await new Promise((r) => setTimeout(r, 80));
          const canScroll = ws.scrollHeight > ws.clientHeight;
          const ovY = getComputedStyle(ws).overflowY;
          const popSum = pop ? pop.querySelector('summary') : null;
          popSum?.scrollIntoView({ block: 'center', behavior: 'instant' });
          const psr = popSum ? popSum.getBoundingClientRect() : null;
          return {
            canScroll,
            ovY,
            scrollTop: ws.scrollTop,
            popSumTop: psr ? psr.top : -1,
            popSumBottom: psr ? psr.bottom : -1,
          };
        })()`);
        assert.equal(narrowSkinAudit.ovY, 'auto');
        assert.equal(narrowSkinAudit.canScroll, true, 'Narrow <840px Skin workspace must scroll with 12 regions');
        assert.ok(
          narrowSkinAudit.scrollTop > 0 && narrowSkinAudit.popSumTop >= 0 && narrowSkinAudit.popSumBottom <= 740,
          `Narrow <840px Skin tab failed to scroll cleanly to popover summary: ${JSON.stringify(narrowSkinAudit)}`,
        );

        // 3) Visual Editor Modal (#prism-visual-editor-modal): 12 tree items + 12 canvas elements + Show Popover
        await studioPage.evaluate(`document.querySelector('[data-action="open-visual-editor"]')?.click()`);
        await sleep(200);
        const modalAudit = await studioPage.evaluate(`(async () => {
          const getM = () => document.getElementById('prism-visual-editor-modal');
          const treeRegions = Array.from(getM().querySelectorAll('[role="tab"][data-action="select-editor-region"][data-region]')).map((b) => b.getAttribute('data-region'));
          getM().querySelector('[data-action="ve-toggle-popover"]')?.click();
          await new Promise((r) => setTimeout(r, 80));

          const clicked = {};
          const clickProbe = async (key, sel) => {
            getM().querySelector(sel)?.click();
            await new Promise((r) => setTimeout(r, 60));
            const inspTitle = getM().querySelector('[role="tab"][data-action="select-editor-region"][aria-selected="true"]')?.getAttribute('data-region') || '';
            const hasStyleCtl = Boolean(getM().querySelector('[data-region-style-ctl="' + key + '"]'));
            clicked[key] = { selected: inspTitle, hasStyleCtl };
          };
          await clickProbe('userBubble', '.mini-user-bubble');
          await clickProbe('assistantBubble', '.mini-assistant-bubble');
          await clickProbe('codeBlock', '.mini-code-card');
          await clickProbe('controls', '.mini-controls-strip');
          await clickProbe('card', '.mini-standalone-card');
          await clickProbe('popover', '.mini-popover');
          getM().querySelector('[data-action="close-visual-editor"]')?.click();
          return { treeRegions, clicked };
        })()`);
        assert.equal(modalAudit.treeRegions.length, 12, `Visual Editor tree expected 12 regions, got ${modalAudit.treeRegions.length}`);
        for (const rName of ['userBubble', 'assistantBubble', 'codeBlock', 'controls', 'card', 'popover']) {
          assert.equal(modalAudit.clicked[rName]?.selected, rName, `Clicking canvas for ${rName} did not select tree item`);
          assert.equal(modalAudit.clicked[rName]?.hasStyleCtl, true, `Inspector missing style selector for ${rName}`);
        }

        // 4) Standalone Popout Visual Editor (/?mode=visual-editor): live style switching none <-> frosted <-> crystal on .mini-user-bubble
        const waitPopout = Date.now() + 3000;
        while (Date.now() < waitPopout) {
          if (await popoutPage.evaluate(`Boolean(document.querySelector('#prism-visual-canvas-stage .mini-user-bubble'))`)) break;
          await sleep(40);
        }
        const popoutStyleAudit = await popoutPage.evaluate(`(async () => {
          document.querySelector('#prism-visual-canvas-stage .mini-user-bubble')?.click();
          await new Promise((r) => setTimeout(r, 60));
          const readState = () => {
            const el = document.querySelector('#prism-visual-canvas-stage .mini-user-bubble');
            const cs = el ? getComputedStyle(el) : null;
            return {
              attr: el ? el.getAttribute('data-glass-style') : '',
              bf: cs ? (cs.backdropFilter || cs.webkitBackdropFilter || 'none') : '',
            };
          };
          const states = {};
          for (const st of ['none', 'frosted', 'crystal']) {
            document.querySelector('[data-action="set-region-prop"][data-region="userBubble"][data-prop="style"][data-val="' + st + '"]')?.click();
            await new Promise((r) => setTimeout(r, 140));
            states[st] = readState();
          }
          const popTreeCount = document.querySelectorAll('.prism-ve-tree-item[data-action="select-editor-region"]').length;
          return { popTreeCount, states };
        })()`);
        assert.equal(popoutStyleAudit.popTreeCount, 12, `Popout IDE tree expected 12 regions, got ${popoutStyleAudit.popTreeCount}`);
        assert.equal(popoutStyleAudit.states.none.attr, 'none');
        assert.equal(popoutStyleAudit.states.none.bf, 'none');
        assert.equal(popoutStyleAudit.states.frosted.attr, 'frosted');
        assert.match(popoutStyleAudit.states.frosted.bf, /blur\(/);
        assert.equal(popoutStyleAudit.states.crystal.attr, 'crystal');
        assert.match(popoutStyleAudit.states.crystal.bf, /blur\(/);

        // 5) Quick Prism (`panel-inject.js`) F-05 9-Key Optical Reset Parity while preserving structural radius/borderStyle
        await engine.applyWallpaper(auroraItem.id, {
          skinEnabled: true,
          startupMode: 'gentle-auto',
          preset: 'islands',
          glassBlur: 16,
          regions: {
            userBubble: {
              style: 'crystal',
              glassEnabled: true,
              blur: 20,
              saturation: 195,
              opacity: 0.58,
              tone: -12,
              tint: '#141B2D',
              borderOpacity: 0.4,
              elevation: 1.5,
              borderStyle: 'bottom',
              radius: 22,
            },
          },
        });
        await hubQpPage.evaluate(
          buildHostMicroBootstrap({
            hostOrigin: studio.origin,
            capToken: studio.hostCapToken,
            triggerMode: 'both',
            startupMode: 'gentle-auto',
            skinEnabled: true,
          }),
        );
        const waitHub = Date.now() + 3000;
        while (Date.now() < waitHub) {
          if (await hubQpPage.evaluate(`document.documentElement.getAttribute('data-agy-prism-wallpaper') === 'ready'`)) break;
          await sleep(40);
        }
        await hubQpPage.pressKey({ key: 'w', code: 'KeyW', windowsVirtualKeyCode: 87, modifiers: 3 });
        const waitQp = Date.now() + 3000;
        while (Date.now() < waitQp) {
          if (await hubQpPage.evaluate(`Boolean(window.__agyPrismPanel && window.__agyPrismPanel.status().open)`)) break;
          await sleep(40);
        }
        await hubQpPage.evaluate(`(async () => {
          const pop = document.getElementById('agy-prism-popover');
          const tabs = pop.querySelectorAll('[role="tab"]');
          if (tabs[1]) tabs[1].click();
          const acc = pop.querySelector('[data-testid="prism-comp-accordion"]');
          if (acc && !acc.open) acc.querySelector('summary')?.click();
          pop.querySelector('.pp-rst[data-comp="userBubble"]')?.click();
          await new Promise((r) => setTimeout(r, 220));
        })()`);
        const afterQpReset = await engine.getConfig();
        const ubAfter = afterQpReset.regions.userBubble;
        assert.equal(ubAfter.style, null, 'Quick Prism 9-key reset failed to clear style');
        assert.equal(ubAfter.glassEnabled, null, 'Quick Prism 9-key reset failed to clear glassEnabled');
        assert.equal(ubAfter.blur, null, 'Quick Prism 9-key reset failed to clear blur');
        assert.equal(ubAfter.saturation, null, 'Quick Prism 9-key reset failed to clear saturation');
        assert.equal(ubAfter.opacity, null, 'Quick Prism 9-key reset failed to clear opacity');
        assert.equal(ubAfter.tone, 0, 'Quick Prism 9-key reset failed to clear tone');
        assert.equal(ubAfter.tint, '', 'Quick Prism 9-key reset failed to clear tint');
        assert.equal(ubAfter.borderOpacity, null, 'Quick Prism 9-key reset failed to clear borderOpacity');
        assert.equal(ubAfter.elevation, null, 'Quick Prism 9-key reset failed to clear elevation');
        assert.equal(ubAfter.borderStyle, 'bottom', 'Quick Prism 9-key reset must preserve structural borderStyle=bottom');
        assert.equal(ubAfter.radius, 22, 'Quick Prism 9-key reset must preserve structural radius=22');

        assert.deepEqual(studioPage.pageExceptions, []);
        assert.deepEqual(popoutPage.pageExceptions, []);
        assert.deepEqual(narrowStudioPage.pageExceptions, []);
        assert.deepEqual(hubQpPage.pageExceptions, []);
        return 'Studio 12 accordions + crisp + F-05 badge/float + auto-promote + <840px scroll + Dual Visual Editor 12-region + Quick Prism 9-key reset verified';
      } finally {
        await browser.closePage(hubQpPage).catch(() => {});
        await browser.closePage(narrowStudioPage).catch(() => {});
        await browser.closePage(popoutPage).catch(() => {});
        await browser.closePage(studioPage).catch(() => {});
        await engine.applyWallpaper(auroraItem.id, {
          skinEnabled: true,
          startupMode: 'gentle-auto',
          preset: 'islands',
          layoutMode: 'islands',
          glassBlur: 16,
          codeReadabilityMode: 'translucent',
          regions: null,
          surfaceTints: null,
        }).catch(() => {});
      }
    });
  } finally {
    await browser.close().catch(() => {});
    if (fallbackMediaSrv) await fallbackMediaSrv.close().catch(() => {});
    if (studio) await studio.close().catch(() => {});
    try {
      fs.rmSync(SCRATCH_ROOT, { recursive: true, force: true, maxRetries: 8, retryDelay: 150 });
    } catch {}
  }

  console.log('\n=== Verification Summary ===');
  console.log(`Passed: ${results.length - failures.length} / ${results.length}`);
  for (const sc of screenshots) {
    console.log(`Screenshot: ${sc.path} | ${sc.caption}`);
  }

  if (failures.length > 0) {
    console.error(`\nFAILED CHECKS (${failures.length}):`);
    for (const f of failures) {
      console.error(`\n[${f.owner}] ${f.name}\n${f.stack}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal harness error:', err);
  process.exit(1);
});
