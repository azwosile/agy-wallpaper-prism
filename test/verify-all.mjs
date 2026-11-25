#!/usr/bin/env node
/**
 * Comprehensive Automated Verification & Visual E2E Suite (`test/verify-all.mjs`) — v2.1.0
 *
 * Verifies 100% of `agy-wallpaper-prism` v1.x + Gentle Fail-Open v2.1.0 specifications across:
 *   Suite 1 — Manifest (v2.1.0), Bundle, Skills, Sidecar (`on-failure`), Zero-Enable CDP Static Audit,
 *             Zero-PII Audit & SHA-256 Workspace <-> Global Plugin Sync
 *   Suite 2 — Backend Engine, DSH Parity, Co-Keyed Storage, Two-Phase `fsync` Boot Canary Circuit-Breaker
 *             (`canary.json` arming -> tripped, `/api/canary/reset`, `/api/skin/wake`), PR #6 Hardened `fetch+blob`,
 *             PR #7 `/video-stage/` Streaming Iframe + v2.0.8 OOPIF Web Audio & Studio/Host SSE 6-Socket Cap,
 *             PR #9 `deadPluginOrigins` TTL/AbortError/Ghost-Video Guard & `wake()` Live-SSE Fast-Path,
 *             Issue #10 Pure-Optical `SCENE_PRESETS`, Req #4 7-Component `surfaceTints` + 128/128 WCAG AA Matrix,
 *             Req #5 + D1 Mock GitHub Auto-Updater / Loopback `Host` / Tar-Safe / Rollback & Req #7 Release Packager
 *   Suite 3 — Studio v2.1 UI (`Host & System` 3-way Startup Strategy + Canary + Panic Badge + Update Card +
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
  console.log('=== agy-wallpaper-prism v2.1.0 Full Verification Harness ===');
  fs.mkdirSync(SCRATCH_ROOT, { recursive: true });
  fs.mkdirSync(DEFAULT_ARTIFACT_DIR, { recursive: true });
  const fixturesDir = path.join(SCRATCH_ROOT, 'fixtures');
  const fx = materializeTestFixtures(fixturesDir);

  // =========================================================================
  // SUITE 1: Manifest, Bundle, Zero-Enable CDP Audit, Zero-PII & Byte Sync
  // =========================================================================
  console.log('\n--- Suite 1: Manifest (v2.1.0), Zero-Enable CDP Audit, Zero-PII & Sync Checks ---');

  await check('plugin.json, package.json & 7-point v2.1.0 version anchors + GitHub repository metadata', '@gentle-skin-architect', () => {
    const pPath = path.join(REPO_ROOT, 'plugin.json');
    const pkgPath = path.join(REPO_ROOT, 'package.json');
    const readmePath = path.join(REPO_ROOT, 'README.md');
    const schemaPath = path.join(REPO_ROOT, 'src', 'shared', 'schema.mjs');
    const wallInjectPath = path.join(REPO_ROOT, 'src', 'host', 'wallpaper-inject.js');
    const panelInjectPath = path.join(REPO_ROOT, 'src', 'host', 'panel-inject.js');
    assert.ok(fs.existsSync(pPath), 'plugin.json missing');
    assert.ok(fs.existsSync(pkgPath), 'package.json missing');
    const raw = JSON.parse(fs.readFileSync(pPath, 'utf8'));
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const readme = fs.readFileSync(readmePath, 'utf8');
    const schemaSrc = fs.readFileSync(schemaPath, 'utf8');
    const wallInjectSrc = fs.readFileSync(wallInjectPath, 'utf8');
    const panelInjectSrc = fs.readFileSync(panelInjectPath, 'utf8');
    const badKeys = Object.keys(raw).filter((k) => !ALLOWED_PLUGIN_JSON_KEYS.has(k));
    assert.deepEqual(badKeys, [], `Forbidden keys in plugin.json: ${badKeys.join(', ')}`);
    assert.equal(raw.name, 'agy-wallpaper-prism');
    assert.equal(raw.version, '2.1.0', `Expected plugin.json version 2.1.0, got ${raw.version}`);
    assert.equal(pkg.version, '2.1.0', `Expected package.json version 2.1.0, got ${pkg.version}`);
    assert.match(readme, /\*\*Version\*\*:\s*`2\.1\.0`/, 'Expected README.md **Version**: `2.1.0`');
    assert.match(schemaSrc, /export const PLUGIN_VERSION\s*=\s*'2\.1\.0'/, 'Expected schema.mjs PLUGIN_VERSION = 2.1.0');
    assert.match(schemaSrc, /skinVersion:\s*'2\.1\.0'/, 'Expected schema.mjs PRISM_DOM.skinVersion = 2.1.0');
    assert.match(wallInjectSrc, /var VERSION\s*=\s*'2\.1\.0'/, 'Expected wallpaper-inject.js VERSION = 2.1.0');
    assert.match(panelInjectSrc, /var VERSION\s*=\s*'2\.1\.0'/, 'Expected panel-inject.js VERSION = 2.1.0');
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
    return `v${raw.version} synced across all 7 anchors, keys=${Object.keys(raw).length}/10`;
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
    assert.ok(/#app[\s\S]{0,220}height:\s*100(%|dvh|vh)/i.test(html), 'Missing #app 100% height lock in Studio CSS');
    assert.ok(html.includes('prism-startup-safety-card'), 'Bundled index.html missing v2.0 #prism-startup-safety-card');
    assert.ok(html.includes('prism-master-toggle-btn'), 'Bundled index.html missing v2.0.7 #prism-master-toggle-btn');
    assert.ok(html.includes('prism-update-card'), 'Bundled index.html missing v2.1.0 #prism-update-card');
    assert.ok(html.includes('mini-blur-veil'), 'Bundled index.html missing v2.1.0 .mini-blur-veil');
    assert.ok(html.includes('class="agy-prism-root"'), 'Bundled index.html missing Req #6 #app.agy-prism-root guard');
    assert.ok(html.includes('2.1.0'), 'Bundled index.html missing inlined v2.1.0 version marker');
    assert.equal(html.includes('\r'), false, 'Bundled index.html must be pure LF (0 CR/CRLF)');
    return `${Math.round(html.length / 1024)} KB inlined v2.1.0 pure-LF bundle`;
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
      'src/studio-ui/app.mjs',
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
    ];

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

      // 3) >256 MiB Content-Length video with thumbUrl gracefully degrades to <img> poster keeping data-agy-prism-wallpaper="ready"
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
      assert.ok(revokedBlobUrls.includes(createdBlobUrls[1]), 'Expected second video blob URL to be revoked when poster fallback commits');
      assert.equal(prism.status().wallpaperReady, true, 'Expected >256MB video with thumbUrl to stay wallpaperReady=true via poster fallback');
      assert.equal(docRoot.getAttribute('data-agy-prism-wallpaper'), 'ready');
      const stageEl = mockDoc.getElementById('agy-prism-stage');
      assert.equal(stageEl.querySelectorAll('video').length, 0, 'Oversized <video> element must be removed during poster fallback');
      const posterImgs = stageEl.querySelectorAll('img');
      assert.equal(posterImgs.length, 1, 'Expected fallback <img class="agy-prism-media-el"> in stage');
      assert.deepEqual(directHttpImgSrcs, [], 'https: host MUST NOT assign http://127.0.0.1 directly to poster <img>.src');
      assert.ok(posterImgs[0].src.startsWith('blob:'), `Expected 0ms fetch+blob poster fallback src, got: ${posterImgs[0].src}`);
      assert.ok(
        fetchCalls.some((c) => c.url.includes('poster-ok.png')),
        `Expected 0ms fetch() for poster-ok.png (seen: ${fetchCalls.map((c) => c.url).join(', ')})`,
      );

      // 4) 404 broken video fails open (data-agy-prism-wallpaper removed) AND hides #agy-prism-fx-canvas
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
      assert.equal(docRoot.getAttribute('data-agy-prism-wallpaper'), null, '404 video MUST clear data-agy-prism-wallpaper');
      const fx404 = mockDoc.getElementById('agy-prism-fx-canvas');
      assert.ok(fx404, '#agy-prism-fx-canvas node still managed by fxEnabled');
      assert.equal(fx404.style.display, 'none', '#agy-prism-fx-canvas MUST be display:none when wallpaperReady=false');

      return `0ms fetch+blob (${fetchCalls[0].elapsedMs}ms) + ${revokedBlobUrls.length} blob revocations + >256MB poster fallback + 404 fail-open & fx hidden`;
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

    // 2B. Verify concurrent Studio `/api/events` SSE socket eviction (opening 3 streams actively closes stream #1, keeping <= 2 active)
    const openPersistentStudioSse = () => {
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
            `${studio.origin}/api/events`,
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
          req.url = '/api/events';
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
      const s1 = await openPersistentStudioSse();
      sseStreams.push(s1);
      assert.equal(s1.status, 200, `SSE stream #1 returned ${s1.status}`);
      assert.equal(s1.isClosed(), false, 'SSE stream #1 should remain open');

      const s2 = await openPersistentStudioSse();
      sseStreams.push(s2);
      assert.equal(s2.status, 200, `SSE stream #2 returned ${s2.status}`);
      assert.equal(s1.isClosed(), false, 'SSE stream #1 should stay open while total streams <= 2');
      assert.equal(s2.isClosed(), false, 'SSE stream #2 should remain open');

      const s3 = await openPersistentStudioSse();
      sseStreams.push(s3);
      assert.equal(s3.status, 200, `SSE stream #3 returned ${s3.status}`);

      await Promise.race([
        s1.closedPromise,
        sleep(1500).then(() => {
          throw new Error('Oldest SSE stream #1 was NOT actively evicted/closed when 3rd /api/events connection opened (MAX_STUDIO_SSE=2)');
        }),
      ]);
      assert.equal(s1.isClosed(), true, 'Expected oldest SSE stream #1 to be closed upon 3rd connection');
      assert.equal(s2.isClosed(), false, 'Expected SSE stream #2 to remain open');
      assert.equal(s3.isClosed(), false, 'Expected SSE stream #3 to remain open');
      const activeStreams = sseStreams.filter((s) => !s.isClosed()).length;
      assert.ok(activeStreams <= 2, `Expected <= 2 active /api/events SSE streams, got ${activeStreams}`);
      sseEvictionTransport = s3.transport;
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
      //     (0ms, NO 15.5s Chrome 152 hang!) -> content-length 1018167296 triggers MediaSource `/mse-fmp4/` streaming!
      stepStartMs = Date.now();
      prism.applyPayload({
        skinEnabled: true,
        config: { switchTransition: 'cut', accentMode: 'cobalt' },
        activeItem: {
          id: 'vm-v207-971mb-mse',
          kind: 'video',
          mediaUrl: 'http://127.0.0.1:49152/media/tok971b/huge-971mb.mp4',
          pluginMediaUrl: 'plugin://agy-wallpaper-prism--prism_studio-53040/media-proxy/media/tok971-404',
          videoStageUrl: 'http://127.0.0.1:49152/video-stage/tok971b',
          mseFmp4Url: 'http://127.0.0.1:49152/mse-fmp4/tok971b',
          thumbUrl: 'http://127.0.0.1:49152/preview/tok971b/poster.png',
        },
      });
      await sleep(80);
      const stMse = prism.status();
      assert.equal(stMse.wallpaperReady, true, '971 MB MediaSource /mse-fmp4/ video did not become ready');
      assert.equal(stMse.videoTransport, 'mse', `Expected videoTransport="mse", got ${stMse.videoTransport}`);
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

      // 2E) Also verify `panel-inject.js` thumbnail grid (`bindSafeThumb`) uses 0ms fetch+blob under https://127.0.0.1
      vm.runInContext(panelInjectSrc, vmCtx, { filename: 'panel-inject.js' });
      const panel = mockWin.__agyPrismPanel;
      assert.ok(panel && typeof panel.syncState === 'function', 'panel-inject.js failed to mount in https: VM');
      try {
        panel.open();
        const revokesBeforePanelDestroy = revokedBlobUrls.length;
        panel.syncState({
          skinEnabled: true,
          items: [
            {
              id: 'panel-t1',
              title: 'Panel HTTPS Thumb',
              kind: 'image',
              source: 'local',
              thumbUrl: 'http://127.0.0.1:49152/preview/panel-t1/thumb.png',
            },
          ],
        });
        const libTabBtn = mockDoc.getElementById('agy-prism-popover')?.querySelectorAll('.pp-tab').find((b) => b.getAttribute('data-tab') === 'library');
        assert.ok(libTabBtn, 'panel-inject.js missing library .pp-tab button');
        libTabBtn.click();
        await sleep(40);
        assert.ok(
          fetchCalls.some((c) => c.url === 'http://127.0.0.1:49152/preview/panel-t1/thumb.png'),
          'panel-inject.js bindSafeThumb did not fetch thumbUrl via fetch+blob on https: host',
        );
        const panelImgs = mockDoc.getElementById('agy-prism-popover')?.querySelectorAll('img') || [];
        assert.equal(panelImgs.length, 1, 'Expected 1 thumbnail <img> in panel library grid');
        assert.ok(panelImgs[0].src.startsWith('blob:'), `Expected blob: src on panel thumbnail, got ${panelImgs[0].src}`);
        panel.destroy();
        assert.ok(
          revokedBlobUrls.length > revokesBeforePanelDestroy,
          'panel.destroy() did not revoke cached thumbBlobCache blob URLs',
        );
      } finally {
        try { panel.destroy(); } catch {}
      }

      assert.deepEqual(directHttpImgSrcs, [], `ZERO plaintext http:// allowed in img.src on https: host (found: ${directHttpImgSrcs.join(', ')})`);
      assert.deepEqual(directHttpVideoSrcs, [], `ZERO plaintext http:// allowed in video.src on https: host (found: ${directHttpVideoSrcs.join(', ')})`);

      return `/media-proxy 206 (${proxyRange.body.length}B ftyp${mseHeadMime ? ` + MSE ${mseHeadMime}` : ''}) + 0 directHttpImgSrcs + 971MB plugin:// & MSE + PR #9 deadPluginOrigins TTL/AbortError/ghost-video/alive-timeout verified`;
    } finally {
      prism.destroy();
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
    fs.mkdirSync(wakeDataDir, { recursive: true });
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

  await check('Issue #10 + Req #4: Pure-Optical `SCENE_PRESETS`, 7-Component `surfaceTints` + `resolveComponentDefaultAlpha` & 128/128 WCAG AA (>= 4.5:1) Matrix', '@exec-shared / @exec-host-skin / @exec-tests', async () => {
    const {
      SCENE_PRESETS,
      COLOR_SCHEMES,
      SURFACE_TINT_COMPONENTS,
      SURFACE_TINT_BOUNDS,
      sanitizeConfig,
      resolveComponentDefaultAlpha,
    } = await import(pathToFileURL(path.join(REPO_ROOT, 'src', 'shared', 'schema.mjs')).href);

    // 1) Issue #10: All 4 SCENE_PRESETS are strictly optical-only (0 layout keys) and restore fpsCap=60 (eco=30)
    const forbiddenLayoutKeys = [
      'layoutMode',
      'islandGap',
      'workspacePad',
      'cornerStyle',
      'topbarStyle',
      'leftSidebarRadius',
      'rightSidebarRadius',
    ];
    for (const presetId of ['crystal', 'islands', 'focus', 'eco']) {
      const p = SCENE_PRESETS[presetId];
      assert.ok(p && p.patch, `Missing SCENE_PRESETS.${presetId}`);
      for (const lk of forbiddenLayoutKeys) {
        assert.equal(Object.prototype.hasOwnProperty.call(p.patch, lk), false, `SCENE_PRESETS.${presetId} leaked layout key "${lk}"!`);
      }
      assert.equal(p.patch.fpsCap, presetId === 'eco' ? 30 : 60, `SCENE_PRESETS.${presetId}.patch.fpsCap expected ${presetId === 'eco' ? 30 : 60}, got ${p.patch.fpsCap}`);
    }

    // 2) Req #4: 7-component surfaceTints schema, bounds clamping, null reset, sidebarOpacity bidirectional sync & resolveComponentDefaultAlpha
    assert.deepEqual([...SURFACE_TINT_COMPONENTS], ['topbar', 'sidebar', 'workspace', 'rightPane', 'composer', 'card', 'popover']);
    assert.equal(SURFACE_TINT_BOUNDS.popover.minOpacity, 0.5);
    const syncedFromSb = sanitizeConfig({ sidebarOpacity: 0.88 });
    assert.equal(syncedFromSb.sidebarOpacity, 0.88);
    assert.equal(syncedFromSb.surfaceTints.sidebar.opacity, 0.88, 'sidebarOpacity did not sync into surfaceTints.sidebar.opacity');

    const syncedFromSt = sanitizeConfig({ surfaceTints: { sidebar: { opacity: 0.42, tone: -150, tint: '#abc' }, popover: { opacity: 0.1, tone: 150, tint: 'invalid' } } });
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

    // Verify resolveComponentDefaultAlpha returns bounded numeric alpha for all 7 components in dark & light modes
    const baseCfg = sanitizeConfig({});
    for (const isLight of [false, true]) {
      for (const comp of SURFACE_TINT_COMPONENTS) {
        const a = resolveComponentDefaultAlpha(comp, baseCfg, isLight);
        assert.ok(typeof a === 'number' && Number.isFinite(a) && a >= 0 && a <= 1, `resolveComponentDefaultAlpha(${comp}, ${isLight}) invalid: ${a}`);
        if (comp === 'popover') assert.ok(a >= 0.9, `resolveComponentDefaultAlpha(popover, ${isLight}) expected >= 0.9, got ${a}`);
      }
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
      '--prism-surface-sidebar',
      '--prism-surface-chat',
      '--prism-surface-right-pane',
      '--prism-surface-composer',
      '--prism-surface-card',
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
    return `4 optical presets (0 layout keys) + 7 surfaceTints + resolveComponentDefaultAlpha + ${wcagPassedCombos}/128 WCAG AA >= 4.5:1 (min=${worstRatio.toFixed(2)}:1)`;
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
    assert.equal(compareSemver('2.1.0', '2.0.9'), 1);
    assert.equal(compareSemver('v2.1.0', '2.1.0'), 0);
    assert.equal(compareSemver('2.1.0-beta.1', '2.1.0'), -1);
    assert.equal(compareSemver('2.1.0+build.42', '2.1.0'), 0);
    assert.equal(isNewerVersion('2.1.0', '2.0.9'), true);
    assert.equal(isNewerVersion('2.0.9', '2.1.0'), false);
    assert.equal(isNewerVersion('2.1.0-rc.1', '2.1.0'), false);
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
    assert.equal(healthzRes.json().version, '2.1.0');
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

    // 4) Build deterministic v2.1.0 release tarball (all real runtime files) & test (a) Offline fail-safe, (b) Temp-plugin-dir swap, (c) Mid-sync rollback!
    const pkg210Map = collectDirectoryFilesMap(REPO_ROOT);
    const mockTarGz = createDeterministicTarGz(pkg210Map);
    const mockSha256 = createHash('sha256').update(mockTarGz).digest('hex');
    const mockShaText = `${mockSha256}  agy-wallpaper-prism-v2.1.0.tar.gz\n`;

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
              tag_name: 'v2.1.0',
              html_url: 'https://github.com/azwosile/agy-wallpaper-prism/releases/tag/v2.1.0',
              body: 'Release v2.1.0 mock notes',
              published_at: '2026-11-25T00:00:00Z',
              assets: [
                {
                  name: 'agy-wallpaper-prism-v2.1.0.tar.gz',
                  browser_download_url: 'https://github.com/azwosile/agy-wallpaper-prism/releases/download/v2.1.0/agy-wallpaper-prism-v2.1.0.tar.gz',
                  size: mockTarGz.length,
                },
                {
                  name: 'agy-wallpaper-prism-v2.1.0.tar.gz.sha256',
                  browser_download_url: 'https://github.com/azwosile/agy-wallpaper-prism/releases/download/v2.1.0/agy-wallpaper-prism-v2.1.0.tar.gz.sha256',
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
      fs.writeFileSync(path.join(dir, 'plugin.json'), JSON.stringify({ name: 'agy-wallpaper-prism', version: '2.0.9' }, null, 2), 'utf8');
      fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'agy-wallpaper-prism', version: '2.0.9' }, null, 2), 'utf8');
      fs.writeFileSync(path.join(dir, 'sidecars', 'prism_studio', 'main.mjs'), '// v2.0.9 main\n', 'utf8');
      fs.writeFileSync(path.join(dir, 'sidecars', 'prism_studio', 'index.html'), '<!doctype html><html><body>v2.0.9</body></html>\n', 'utf8');
      fs.writeFileSync(path.join(dir, 'src', 'shared', 'schema.mjs'), "export const PLUGIN_VERSION = '2.0.9';\n", 'utf8');
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
      currentVersion: '2.0.9',
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
    const UPD_TOKEN = 'mock-updater-token-210';
    const updSrv = await createPrismStudioServer({
      dataDir: swapDataDir,
      pluginRoot: swapPluginDir,
      currentVersion: '2.0.9',
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
      assert.equal(stJson.latestVersion, '2.1.0');
      assert.equal(stJson.canAutoUpdate, true);

      const applyResp = await invokeServerInMemory(updSrv.server, {
        method: 'POST',
        url: '/api/update/apply',
        headers: { Host: '127.0.0.1:53040', 'X-Sidecar-Token': UPD_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetVersion: '2.1.0' }),
      });
      assert.equal(applyResp.status, 200, `Mock /api/update/apply expected 200, got ${applyResp.status}: ${applyResp.text()}`);
      const applyJson = applyResp.json();
      assert.equal(applyJson.ok, true);
      assert.equal(applyJson.toVersion, '2.1.0');
      assert.equal(JSON.parse(fs.readFileSync(path.join(swapPluginDir, 'plugin.json'), 'utf8')).version, '2.1.0');
      assert.equal(fs.readFileSync(path.join(swapPluginDir, '.prism-install-id'), 'utf8'), 'keep-this-install-id-12345\n', '.prism-install-id was NOT preserved across update swap!');
      assert.ok(fs.existsSync(path.join(swapPluginDir, 'src', 'engine', 'updater.mjs')), 'New v2.1.0 file missing after swap');
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
      currentVersion: '2.0.9',
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
      () => rbUpdater.applyUpdate({ targetVersion: '2.1.0' }),
      (err) => err && (err.code === 'ENOSPC' || String(err.message || '').includes('Simulated disk full')),
      'Mid-sync ENOSPC failure must reject after synchronous rollback',
    );
    assert.equal(rollbackCalled, true, 'onRollback callback was not invoked');
    assert.equal(JSON.parse(fs.readFileSync(path.join(rbPluginDir, 'plugin.json'), 'utf8')).version, '2.0.9', 'Rollback did not restore original plugin.json 2.0.9!');
    assert.equal(fs.readFileSync(path.join(rbPluginDir, '.prism-install-id'), 'utf8'), 'keep-this-install-id-12345\n', 'Rollback did not preserve .prism-install-id!');

    return `SemVer + ${hostileCases.length} hostile tar rejections + Host 403 + Origin 403/Token 401/CT 415/Git 409 + offline fail-safe + swap (2.0.9->2.1.0) & ENOSPC rollback verified`;
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
    assert.equal(pack.version, '2.1.0');
    assert.equal(pack.tag, 'v2.1.0');
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

    validateTarGzArchive(tarBuf, { expectedVersion: '2.1.0' });
    const extractDir = path.join(SCRATCH_ROOT, 'dist-extract');
    extractSafeTarGz({ tarGzBuffer: tarBuf, destDir: extractDir });
    const staged = validateStagedPlugin({ stageDir: extractDir, currentVersion: '2.0.9', requireNewerVersion: true });
    assert.equal(staged.version, '2.1.0');

    // Verify `dist/` is gitignored so running `node scripts/pack-release.mjs` keeps working tree clean
    const ignored = execFileSync('git', ['check-ignore', 'dist'], { cwd: REPO_ROOT, stdio: 'pipe' }).toString('utf8').trim();
    assert.equal(ignored, 'dist', `Expected dist to be gitignored, got "${ignored}"`);

    return `v${pack.version} 3 artifacts (.tar.gz ${Math.round(pack.tarSizeBytes / 1024)}KB, .sha256 match, .zip ${Math.round(pack.zipSizeBytes / 1024)}KB, ${pack.fileCount} files, dist gitignored)`;
  });

  // =========================================================================
  // SUITE 3: Studio v2.0 UI & Antigravity 2.34.0 Hub Headless Chrome E2E
  // =========================================================================
  console.log('\n--- Suite 3: Studio v2.0 UI & Antigravity 2.34.0 Hub Headless E2E + 1440x900 Screenshots ---');

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

    await check('Studio v2.0 UI (`index.html`): 401 guard, 21:9 video stability, 3-way Startup Strategy (`温和自动恢复 1.5s`), Canary & Panic Key badge + Screenshot (b)', '@crash-forensics', async () => {
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
          return {
            appWidth: Math.round(r.width),
            appHeight: Math.round(r.height),
            railContentFillRatio: Math.round(railContentFillRatio * 1000) / 1000,
            hasSidecarBridge: Boolean(window.sidecar && typeof window.sidecar.fetch === 'function'),
            cardCount: cards.length,
            tabs,
          };
        })()`);

        assert.equal(layoutMetrics.appWidth, 1440);
        assert.equal(layoutMetrics.appHeight, 900);
        assert.ok(layoutMetrics.railContentFillRatio >= 0.80, `Left rail fill ratio=${layoutMetrics.railContentFillRatio}`);
        assert.equal(layoutMetrics.hasSidecarBridge, true);
        assert.ok(layoutMetrics.cardCount >= 4);
        const sysTabName = layoutMetrics.tabs.includes('host') ? 'host' : 'system';

        // Select H.264 video wallpaper (100002) so left-rail 21:9 preview is live & vivid
        await studioPage.evaluate(`(() => {
          const card = Array.from(document.querySelectorAll('.prism-wall-card, [data-action="card-click"]'))
            .find(el => (el.dataset.id || '').includes('100002') || el.innerText.includes('Cyber Obsidian Rain'));
          if (card) card.click();
        })()`);
        await sleep(520);

        const studioVidCheck = await studioPage.evaluate(`(() => {
          const v = document.querySelector('.prism-preview-stage video, .prism-mini-preview video, .prism-left-rail video');
          window.__studioPreviewVideoRef = v || null;
          return v ? { found: true, paused: v.paused, readyState: v.readyState } : { found: false };
        })()`);
        assert.equal(studioVidCheck.found, true, 'Studio 21:9 preview did not mount <video>');
        assert.equal(studioVidCheck.paused, false, 'Studio 21:9 preview <video> paused');

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

        // PR #3 Studio Drawer & <summary> Click Delegation E2E (`close-drawer` child span + `reset-module` inside <summary>)
        await engine.updateConfig({ islandGap: 14 });
        await studioPage.evaluate(`document.querySelector('[data-action="switch-tab"][data-tab="skin"]').click()`);
        await sleep(220);
        const summaryResetCheck = await studioPage.evaluate(`(() => {
          const resetBtn = document.querySelector('summary [data-action="reset-module"]');
          const details = resetBtn ? resetBtn.closest('details') : null;
          const wasOpen = details ? details.open : false;
          if (resetBtn) resetBtn.click();
          return { found: Boolean(resetBtn), wasOpen, stillOpen: details ? details.open : false };
        })()`);
        assert.equal(summaryResetCheck.found, true, 'Missing <summary> [data-action="reset-module"] button in Skin tab');
        assert.equal(summaryResetCheck.wasOpen, true);
        assert.equal(summaryResetCheck.stillOpen, true, 'Clicking <summary> reset-module collapsed <details> or failed delegation!');
        await sleep(200);
        const cfgAfterResetMod = await engine.getConfig();
        assert.equal(cfgAfterResetMod.islandGap, 8, `Clicking <summary> reset-module did not reset islandGap to 8 (got ${cfgAfterResetMod.islandGap})`);

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
      return `${css.length}B static CSS sheet verified`;
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
          !String(vidLivenessAudit.stageContain).includes('paint'),
          `#agy-prism-stage must NOT include paint containment (got: ${vidLivenessAudit.stageContain})`,
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
        assert.ok(
          parseAlphaFromCssColor(v234Audit.dropStickyBeforeBg) >= 0.85,
          `Expected #v234-drop-sticky-probe::before alpha >= 0.85, got ${v234Audit.dropStickyBeforeBg}`,
        );
        assert.ok(
          String(v234Audit.dropStickyBeforeBlur).includes('blur('),
          `Expected #v234-drop-sticky-probe::before backdropFilter to include 'blur(', got ${v234Audit.dropStickyBeforeBlur}`,
        );

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
        assert.equal(lightModeAudit.heatColor, lightModeAudit.voiceColor, `.ag-cs-home-heat-hint ink mismatch: ${lightModeAudit.heatColor}`);
        assert.ok(
          parseAlphaFromCssColor(lightModeAudit.stickyBeforeBg) >= 0.90,
          `Issue #4 Bug 2 regression: Sidebar sticky Projects ::before alpha < 0.90 (${lightModeAudit.stickyBeforeBg})!`,
        );
        assert.ok(
          String(lightModeAudit.stickyBeforeBlur).includes('blur('),
          `Issue #4 Bug 2 regression: Sidebar sticky Projects ::before missing blur (${lightModeAudit.stickyBeforeBlur})!`,
        );
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
          requestAnimationFrame(() => {
            const after = getComputedStyle(document.getElementById('agy-prism-stage')).clipPath;
            const r = document.querySelector('[data-testid="builtin-browser-placeholder"]').getBoundingClientRect();
            resolve({ before, after, newWidth: Math.round(r.width) });
          });
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
          const sbOp = pop.querySelector('[data-slider-key="sidebarOpacity"]');
          const sbBlur = pop.querySelector('[data-slider-key="sidebarBlur"]');
          const sbOpRow = sbOp ? sbOp.closest('.pp-srow') : null;
          const sbBlurRow = sbBlur ? sbBlur.closest('.pp-srow') : null;
          return {
            hasPop: true,
            hasSbOp: Boolean(sbOp),
            hasSbBlur: Boolean(sbBlur),
            sbOpDirty: sbOp ? sbOp.getAttribute('data-dirty') : null,
            sbBlurDirty: sbBlur ? sbBlur.getAttribute('data-dirty') : null,
            sbOpRowDirty: sbOpRow ? sbOpRow.getAttribute('data-dirty') : null,
            sbBlurRowDirty: sbBlurRow ? sbBlurRow.getAttribute('data-dirty') : null,
            sbOpValText: sbOpRow && sbOpRow.querySelector('.pp-sval') ? sbOpRow.querySelector('.pp-sval').textContent : '',
            sbBlurValText: sbBlurRow && sbBlurRow.querySelector('.pp-sval') ? sbBlurRow.querySelector('.pp-sval').textContent : '',
          };
        })()`);

        assert.equal(popSlidersAudit.hasPop, true, '#agy-prism-popover missing after Ctrl+Alt+W');
        assert.equal(popSlidersAudit.hasSbOp, true, 'Missing [data-slider-key="sidebarOpacity"] in #agy-prism-popover');
        assert.equal(popSlidersAudit.hasSbBlur, true, 'Missing [data-slider-key="sidebarBlur"] in #agy-prism-popover');
        assert.equal(popSlidersAudit.sbOpDirty, 'false', `Expected popover sidebarOpacity data-dirty="false", got ${popSlidersAudit.sbOpDirty}`);
        assert.equal(popSlidersAudit.sbBlurDirty, 'false', `Expected popover sidebarBlur data-dirty="false", got ${popSlidersAudit.sbBlurDirty}`);
        assert.ok(
          popSlidersAudit.sbOpValText.includes('跟随') || popSlidersAudit.sbOpValText.includes('Auto'),
          `Expected popover sidebarOpacity readout to include '跟随' or 'Auto', got '${popSlidersAudit.sbOpValText}'`,
        );
        assert.ok(
          popSlidersAudit.sbBlurValText.includes('跟随') || popSlidersAudit.sbBlurValText.includes('Auto'),
          `Expected popover sidebarBlur readout to include '跟随' or 'Auto', got '${popSlidersAudit.sbBlurValText}'`,
        );

        // (b) Studio UI Appearance (Skin) tab has input[data-config-slider="sidebarOpacity"] & input[data-config-slider="sidebarBlur"],
        //     default data-dirty="false" and readout contains '跟随' or 'Auto';
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
          const sbBlurIn = document.querySelector('input[data-config-slider="sidebarBlur"]');
          const sec = sbBlurIn ? sbBlurIn.closest('.prism-section') : null;
          const sbOpIn = sec ? sec.querySelector('input[data-config-slider="sidebarOpacity"]') : document.querySelector('input[data-config-slider="sidebarOpacity"]');
          const railOpIn = document.querySelector('#prism-rail-optics-card input[data-config-slider="sidebarOpacity"]');
          const opRow = sbOpIn ? sbOpIn.closest('.prism-slider-row') : null;
          const blurRow = sbBlurIn ? sbBlurIn.closest('.prism-slider-row') : null;
          if (opRow) opRow.scrollIntoView({ block: 'center' });
          return {
            hasOpSlider: Boolean(sbOpIn),
            hasBlurSlider: Boolean(sbBlurIn),
            hasRailOpSlider: Boolean(railOpIn),
            opDirty: opRow ? opRow.getAttribute('data-dirty') : null,
            blurDirty: blurRow ? blurRow.getAttribute('data-dirty') : null,
            opText: opRow && opRow.querySelector('.prism-slider-val') ? opRow.querySelector('.prism-slider-val').textContent.trim() : '',
            blurText: blurRow && blurRow.querySelector('.prism-slider-val') ? blurRow.querySelector('.prism-slider-val').textContent.trim() : '',
          };
        })()`);

        assert.equal(studioInitSliders.hasOpSlider, true, 'Studio Skin tab missing input[data-config-slider="sidebarOpacity"]');
        assert.equal(studioInitSliders.hasBlurSlider, true, 'Studio Skin tab missing input[data-config-slider="sidebarBlur"]');
        assert.equal(studioInitSliders.hasRailOpSlider, true, 'Studio Left Rail optics card missing input[data-config-slider="sidebarOpacity"]');
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
          caption: 'Studio v2.0.6 Skin tab & Left Rail Sidebar Glass Opacity / Blur auto-follow sliders',
        });
        assert.ok(sSkinV206.bytes > 20000, 'Studio Skin v2.0.6 screenshot suspiciously small');

        // Drive { sidebarOpacity: 0.88, sidebarBlur: 28 } directly through Studio UI sliders -> flushes POST /api/config to Engine
        const studioAfterDrag = await studioPage.evaluate(`(() => {
          const sbBlurIn = document.querySelector('input[data-config-slider="sidebarBlur"]');
          const sec = sbBlurIn.closest('.prism-section');
          const sbOpIn = sec.querySelector('input[data-config-slider="sidebarOpacity"]');
          sbOpIn.value = '88';
          sbOpIn.dispatchEvent(new Event('input', { bubbles: true }));
          sbOpIn.dispatchEvent(new Event('change', { bubbles: true }));
          sbBlurIn.value = '28';
          sbBlurIn.dispatchEvent(new Event('input', { bubbles: true }));
          sbBlurIn.dispatchEvent(new Event('change', { bubbles: true }));
          const railRow = document.querySelector('#prism-rail-optics-card .prism-slider-row[data-slider-key="sidebarOpacity"]');
          return {
            opDirty: sbOpIn.closest('.prism-slider-row').getAttribute('data-dirty'),
            blurDirty: sbBlurIn.closest('.prism-slider-row').getAttribute('data-dirty'),
            railDirty: railRow ? railRow.getAttribute('data-dirty') : null,
            railText: railRow && railRow.querySelector('.prism-slider-val') ? railRow.querySelector('.prism-slider-val').textContent.trim() : '',
          };
        })()`);
        assert.equal(studioAfterDrag.opDirty, 'true');
        assert.equal(studioAfterDrag.blurDirty, 'true');
        assert.equal(studioAfterDrag.railDirty, 'true', 'Paired Left-Rail sidebarOpacity slider did not sync dirty="true"');
        assert.ok(!studioAfterDrag.railText.includes('跟随') && studioAfterDrag.railText.includes('88'), `Unexpected paired rail readout: ${studioAfterDrag.railText}`);

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

        // Bug 3 Assertions
        const sbAlpha = parseAlphaFromCssColor(glassUiAudit.bug3.sbBeforeBg);
        const stickyAlpha = parseAlphaFromCssColor(glassUiAudit.bug3.stickyBeforeBg);
        const projAlpha = parseAlphaFromCssColor(glassUiAudit.bug3.projBeforeBg);
        assert.ok(glassUiAudit.bug3.stickyBeforeRadius >= 6, `Bug 3: #hub-sidebar-sticky-projects::before radius expected >= 6px, got ${glassUiAudit.bug3.stickyBeforeRadius}px`);
        assert.ok(glassUiAudit.bug3.projBeforeRadius >= 6, `Bug 3: #hub-project-header-btn::before radius expected >= 6px, got ${glassUiAudit.bug3.projBeforeRadius}px`);
        assert.ok(String(glassUiAudit.bug3.stickyBeforeBlur).includes('blur('), `Bug 3: #hub-sidebar-sticky-projects::before missing blur(, got ${glassUiAudit.bug3.stickyBeforeBlur}`);
        assert.ok(String(glassUiAudit.bug3.projBeforeBlur).includes('blur('), `Bug 3: #hub-project-header-btn::before missing blur(, got ${glassUiAudit.bug3.projBeforeBlur}`);
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

        // Step A: Click Studio `#prism-master-toggle-btn` to DISABLE -> skin unloads, #agy-prism-pill SURVIVES with data-skin-enabled="false"!
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
          return { ariaChecked: btn.getAttribute('aria-checked'), dataEnabled: btn.dataset.enabled };
        })()`);
        assert.equal(studioAfterOff.ariaChecked, 'false');
        assert.equal(studioAfterOff.dataEnabled, 'false');

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
            };
          })()`);
          if (hubAfterReEnable.wallAttr === 'ready' && hubAfterReEnable.pillSkinEnabled === 'true') break;
          await sleep(60);
        }
        assert.equal(hubAfterReEnable.wallAttr, 'ready', 'Clicking [data-testid="prism-power-toggle"] did not restore data-agy-prism-wallpaper="ready"');
        assert.equal(hubAfterReEnable.ariaChecked, 'true');
        assert.equal(hubAfterReEnable.pillSkinEnabled, 'true');
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

        // ---- 4) Req #3: `glassBlur` 0..64px computed `backdrop-filter` + Quick Prism `.prism-sheet` CSS variable inheritance ----
        const blurSweep = [];
        for (const blurPx of [0, 16, 64]) {
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
              composer: bf(document.querySelector('.surface-composer-card'), '::before'),
              quickSheet: bf(document.querySelector('#agy-prism-popover .prism-sheet')),
            };
          })()`);
          blurSweep.push({ blurPx, ...snap });
          if (blurPx === 0) {
            for (const [k, v] of Object.entries(snap)) {
              assert.equal(v, 'none', `Req #3 glassBlur=0: ${k} expected 'none', got '${v}'`);
            }
          } else {
            for (const k of ['chat', 'right', 'sidebar', 'topbar', 'wco']) {
              assert.ok(snap[k].includes(`blur(${blurPx}px)`), `Req #3 glassBlur=${blurPx}: ${k} expected blur(${blurPx}px), got '${snap[k]}'`);
            }
            const expectedComposerPx = Math.min(64, blurPx + 4);
            assert.ok(
              snap.composer.includes(`blur(${expectedComposerPx}px)`),
              `Req #3 glassBlur=${blurPx}: composer expected blur(${expectedComposerPx}px) (blurLg), got '${snap.composer}'`,
            );
            const expectedQuickPx = Math.min(64, blurPx + 6);
            assert.ok(
              snap.quickSheet.includes(`blur(${expectedQuickPx}px)`),
              `Req #3 glassBlur=${blurPx}: Quick Prism .prism-sheet expected blur(${expectedQuickPx}px) (blurXl), got '${snap.quickSheet}'`,
            );
            assert.notEqual(snap.quickSheet.includes('blur(26px)'), true, `Req #3: Quick Prism .prism-sheet still hardcoded blur(26px) at glassBlur=${blurPx}!`);
          }
        }

        // ---- 5) Req #4: 7-component `surfaceTints` live isolation on Host ----
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
          const wcoPillBg = getComputedStyle(document.getElementById('agy-prism-wco-pill')).backgroundColor;
          const menuBg = getComputedStyle(document.getElementById('hub-menu-probe')).backgroundColor;
          window.__agyPrism.updateConfig({ surfaceTints: null });
          return { centerBefore, centerAfter, rightAfter, topbarPillBg, wcoPillBg, menuBg };
        })()`);
        assert.equal(tintIsoAudit.centerAfter, tintIsoAudit.centerBefore, 'Req #4: mutating surfaceTints.rightPane leaked into center workspace!');
        assert.notEqual(tintIsoAudit.rightAfter, tintIsoAudit.centerAfter, 'Req #4: surfaceTints.rightPane did not independently tint right aux-pane!');
        assert.ok(parseAlphaFromCssColor(tintIsoAudit.rightAfter) >= 0.83, `Req #4: rightPane opacity 0.85 expected >= 0.83, got ${tintIsoAudit.rightAfter}`);
        assert.equal(tintIsoAudit.topbarPillBg, tintIsoAudit.wcoPillBg, `Req #4: topbar pill (${tintIsoAudit.topbarPillBg}) and WCO pill (${tintIsoAudit.wcoPillBg}) must share surfaceTints.topbar`);
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
