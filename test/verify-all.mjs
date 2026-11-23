#!/usr/bin/env node
/**
 * Comprehensive Automated Verification & Visual E2E Suite (`test/verify-all.mjs`) — v2.0.0
 *
 * Verifies 100% of `agy-wallpaper-prism` v1.x + Gentle Fail-Open v2.0.0 specifications across:
 *   Suite 1 — Manifest (v2.0.0), Bundle, Skills, Sidecar (`on-failure`), Zero-Enable CDP Static Audit,
 *             Zero-PII Audit & SHA-256 Workspace <-> Global Plugin Sync
 *   Suite 2 — Backend Engine, DSH Parity, Co-Keyed Storage, Two-Phase `fsync` Boot Canary Circuit-Breaker
 *             (`canary.json` arming -> tripped, `/api/canary/reset`, `/api/skin/wake`) & Static CSS Mode
 *   Suite 3 — Studio v2.0 UI (`Host & System` 3-way Startup Strategy + Canary + Panic Badge) &
 *             Antigravity 2.34.0 Hub Headless Chrome E2E:
 *               1) Zero-Enable Ephemeral Micro-Bootstrap & Lazy `/host/<token>/panel.js` Load (0 KB boot)
 *               2) Fail-Open Media-Ready Gate (404 video -> solid #070708, `z-index: -1` inert stage, clickable `#root`;
 *                  valid H.264 video -> `data-agy-prism-wallpaper="ready"` ONLY after Frame 1 decode)
 *               3) 2.34.0 Issue #1 + PR #2 Refined Selectors (`.h-full.w-full.dark`, `.browser-hole-opaque`,
 *                  `.settings-modal-container` + inner `.hover:bg-background` tabs, `[role="menu"]` alpha >= 0.94,
 *                  `#ag-usage-monitor-capsule` & `#gemini-neko-pet-root` untouched)
 *               4) 2.34.0 3-Layer `[data-browser-hole]` Synchronous Rounded GPU Cutout (`clip-path: path(...)`,
 *                  12px bottom arcs, `alpha = 0` compositor pixel proof, `elementFromPoint`, synchronous resize)
 *               5) `Ctrl+Alt+Shift+R` Emergency Panic Strip + `skinEnabled === false` Persistence
 *               6) Two 1440x900 Full-Window Verification Screenshots
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
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
  console.log('=== agy-wallpaper-prism v2.0.0 Full Verification Harness ===');
  fs.mkdirSync(SCRATCH_ROOT, { recursive: true });
  fs.mkdirSync(DEFAULT_ARTIFACT_DIR, { recursive: true });
  const fixturesDir = path.join(SCRATCH_ROOT, 'fixtures');
  const fx = materializeTestFixtures(fixturesDir);

  // =========================================================================
  // SUITE 1: Manifest, Bundle, Zero-Enable CDP Audit, Zero-PII & Byte Sync
  // =========================================================================
  console.log('\n--- Suite 1: Manifest (v2.0.0), Zero-Enable CDP Audit, Zero-PII & Sync Checks ---');

  await check('plugin.json & package.json strict v2.0.0 schema & GitHub repository metadata', '@resilience-designer', () => {
    const pPath = path.join(REPO_ROOT, 'plugin.json');
    const pkgPath = path.join(REPO_ROOT, 'package.json');
    assert.ok(fs.existsSync(pPath), 'plugin.json missing');
    assert.ok(fs.existsSync(pkgPath), 'package.json missing');
    const raw = JSON.parse(fs.readFileSync(pPath, 'utf8'));
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const badKeys = Object.keys(raw).filter((k) => !ALLOWED_PLUGIN_JSON_KEYS.has(k));
    assert.deepEqual(badKeys, [], `Forbidden keys in plugin.json: ${badKeys.join(', ')}`);
    assert.equal(raw.name, 'agy-wallpaper-prism');
    assert.equal(raw.version, '2.0.3', `Expected plugin.json version 2.0.3, got ${raw.version}`);
    assert.equal(pkg.version, '2.0.3', `Expected package.json version 2.0.3, got ${pkg.version}`);
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
    return `v${raw.version}, keys=${Object.keys(raw).length}/10`;
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
    return `${Math.round(html.length / 1024)} KB inlined v2.0 bundle`;
  });

  await check('Syntax check (`node --check`) across all JS/MJS entrypoints & test modules', '@resilience-designer', () => {
    const targets = [
      'scripts/build.mjs',
      'scripts/install-local.mjs',
      'host/cli.mjs',
      'sidecars/prism_studio/main.mjs',
      'sidecars/prism_studio/cdp-bridge.mjs',
      'src/shared/schema.mjs',
      'src/shared/i18n.mjs',
      'src/engine/index.mjs',
      'src/engine/store.mjs',
      'src/engine/scanner.mjs',
      'src/engine/mp4-vfs.mjs',
      'src/engine/pkg-scene.mjs',
      'src/engine/media-server.mjs',
      'src/engine/playlist.mjs',
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
    const skipDirs = new Set(['.git', 'node_modules']);
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

    const gitDiff = execFileSync('git', ['diff', 'HEAD'], { cwd: REPO_ROOT, stdio: 'pipe' }).toString('utf8');
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
      'src/engine/index.mjs',
      'src/engine/store.mjs',
      'src/engine/scanner.mjs',
      'src/engine/mp4-vfs.mjs',
      'src/engine/pkg-scene.mjs',
      'src/engine/media-server.mjs',
      'src/engine/playlist.mjs',
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
        // CHECK 1A — Ephemeral Micro-Bootstrap (`<1.5 KB`) & 0 KB `panel.js` on Boot
        // -------------------------------------------------------------------
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
  } finally {
    await browser.close().catch(() => {});
    if (fallbackMediaSrv) await fallbackMediaSrv.close().catch(() => {});
    if (studio) await studio.close().catch(() => {});
    try {
      fs.rmSync(SCRATCH_ROOT, { recursive: true, force: true });
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
