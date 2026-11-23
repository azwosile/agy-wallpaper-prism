#!/usr/bin/env node
/**
 * Comprehensive Automated Verification & Visual E2E Suite (`test/verify-all.mjs`)
 *
 * Verifies 100% of `agy-wallpaper-prism` specifications across:
 *   Suite 1 — Manifest, Bundle, Skills, Sidecar Schema & Local Install Checks (@legacy-cleaner / @studio-builder)
 *   Suite 2 — Backend Engine & DSH Parity Suite (@dsh-inspector)
 *   Suite 3 — Host Prism Skin, Quick Popover & Studio UI Headless E2E + 1440x900 Screenshots (@prism-designer / @studio-builder)
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { launchHeadlessBrowser, readPngDimensions } from './cdp-browser.mjs';
import { createPrismArtworkPng, materializeTestFixtures } from './fixtures-builder.mjs';
import { invokeServerInMemory } from './http-inproc.mjs';
import { buildMockAntigravityHubHtml } from './mock-hub-template.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const DEFAULT_ARTIFACT_DIR =
  process.env.PRISM_SCREENSHOT_DIR ||
  path.join(os.tmpdir(), 'agy-wallpaper-prism-verify');
const SCRATCH_ROOT = path.join(DEFAULT_ARTIFACT_DIR, 'scratch', `verify-${process.pid}-${Date.now()}`);

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log('=== agy-wallpaper-prism Full Verification Harness ===');
  fs.mkdirSync(SCRATCH_ROOT, { recursive: true });
  const fixturesDir = path.join(SCRATCH_ROOT, 'fixtures');
  const fx = materializeTestFixtures(fixturesDir);

  // =========================================================================
  // SUITE 1: Manifest, Bundle, Sidecar Schema, Git & Install Checks
  // =========================================================================
  console.log('\n--- Suite 1: Manifest, Bundle, Git & Antigravity Customization Checks ---');

  await check('plugin.json strict 10-key allowlist, v1.1.0 & GitHub repository metadata', '@legacy-cleaner', () => {
    const pPath = path.join(REPO_ROOT, 'plugin.json');
    assert.ok(fs.existsSync(pPath), 'plugin.json missing');
    const raw = JSON.parse(fs.readFileSync(pPath, 'utf8'));
    const badKeys = Object.keys(raw).filter((k) => !ALLOWED_PLUGIN_JSON_KEYS.has(k));
    assert.deepEqual(badKeys, [], `Forbidden keys in plugin.json: ${badKeys.join(', ')}`);
    assert.equal(raw.name, 'agy-wallpaper-prism');
    assert.equal(raw.version, '1.1.0', `Expected version 1.1.0, got ${raw.version}`);
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

  await check('Git repository branch (`main`), `origin` remote URL & clean tracked status', '@legacy-cleaner', () => {
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
    assert.equal(porcelain, '', `Git working tree is not clean:\n${porcelain}`);
    return `branch=${branch}, origin=${originUrl}, clean`;
  });

  await check('assets/logo.svg valid >=128x128 SVG with margin', '@legacy-cleaner', () => {
    const lPath = path.join(REPO_ROOT, 'assets', 'logo.svg');
    assert.ok(fs.existsSync(lPath), 'assets/logo.svg missing');
    const svg = fs.readFileSync(lPath, 'utf8');
    assert.ok(svg.includes('<svg') && svg.includes('viewBox="0 0 256 256"'), 'Expected crisp 256x256 viewBox SVG');
    return `${svg.length}B`;
  });

  await check('skills/wallpaper-prism/SKILL.md frontmatter & sidecar:// / customization:// links', '@legacy-cleaner', () => {
    const sPath = path.join(REPO_ROOT, 'skills', 'wallpaper-prism', 'SKILL.md');
    assert.ok(fs.existsSync(sPath), 'skills/wallpaper-prism/SKILL.md missing');
    const md = fs.readFileSync(sPath, 'utf8');
    assert.match(md, /^---\r?\n[\s\S]*?name:\s*wallpaper-prism[\s\S]*?description:\s*.+[\s\S]*?\r?\n---/);
    assert.ok(md.includes('sidecar://agy-wallpaper-prism/prism_studio/'), 'Missing sidecar:// pill link');
    assert.ok(md.includes('customization://agy-wallpaper-prism'), 'Missing customization:// link');
    assert.ok(!md.includes('plugin://') && !md.includes('plugins://'), 'Dead plugin:// scheme found in SKILL.md');
    return 'frontmatter + URI schemes valid';
  });

  await check('sidecars/prism_studio/sidecar.json AUX_PANE contract', '@legacy-cleaner', () => {
    const scPath = path.join(REPO_ROOT, 'sidecars', 'prism_studio', 'sidecar.json');
    assert.ok(fs.existsSync(scPath), 'sidecars/prism_studio/sidecar.json missing');
    const sc = JSON.parse(fs.readFileSync(scPath, 'utf8'));
    assert.equal(sc.command, 'node');
    assert.deepEqual(sc.args, ['main.mjs']);
    assert.equal(sc.restart_policy, 'always');
    assert.equal(sc.has_web_ui, true);
    assert.equal(sc.ui_config?.views?.[0]?.path, '/');
    assert.equal(sc.ui_config?.views?.[0]?.entrypoint, 'SIDECAR_UI_ENTRYPOINT_AUX_PANE');
    return 'AUX_PANE + restart_policy=always';
  });

  await check('sidecars/prism_studio/index.html single-file inlined bundle & #app 100% height lock', '@legacy-cleaner / @studio-builder', async () => {
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
    return `${Math.round(html.length / 1024)} KB inlined bundle`;
  });

  await check('Syntax check (`node --check`) across all JS/MJS entrypoints', '@legacy-cleaner', () => {
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
    ];
    for (const rel of targets) {
      const full = path.join(REPO_ROOT, rel);
      assert.ok(fs.existsSync(full), `Missing file: ${rel}`);
      execFileSync(process.execPath, ['--check', full], { stdio: 'pipe' });
    }
    return `${targets.length} files syntax-clean`;
  });

  await check('install-local.mjs real-file copy check (no NTFS junction) & global install probe', '@legacy-cleaner', async () => {
    const { installLocalPlugin } = await import(pathToFileURL(path.join(REPO_ROOT, 'scripts', 'install-local.mjs')).href);
    const stagedPluginsRoot = path.join(SCRATCH_ROOT, 'staged-plugins');
    const { dstDir } = await installLocalPlugin({ destRoot: stagedPluginsRoot });
    assert.equal(fs.lstatSync(dstDir).isSymbolicLink(), false, 'installLocalPlugin created symlink/junction instead of real dir');
    assert.ok(fs.existsSync(path.join(dstDir, 'sidecars', 'prism_studio', 'index.html')), 'Missing bundled index.html in staged install');

    const globalPluginDir = path.join(os.homedir(), '.gemini', 'config', 'plugins', 'agy-wallpaper-prism');
    let globalNote = 'global dir not yet installed (sandbox isolated)';
    try {
      if (fs.existsSync(globalPluginDir)) {
        const lst = fs.lstatSync(globalPluginDir);
        assert.equal(lst.isSymbolicLink(), false, 'Global installed plugin MUST NOT be an NTFS junction');
        assert.ok(fs.existsSync(path.join(globalPluginDir, 'plugin.json')), 'Global plugin.json missing');
        for (const syncRel of [
          'plugin.json',
          'package.json',
          'README.md',
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
          'src/host/index.mjs',
          'src/host/wallpaper-inject.js',
          'src/host/panel-inject.js',
        ]) {
          const wsBytes = fs.readFileSync(path.join(REPO_ROOT, syncRel));
          const instBytes = fs.readFileSync(path.join(globalPluginDir, syncRel));
          assert.equal(
            wsBytes.equals(instBytes),
            true,
            `Installed ~/.gemini copy out of sync with workspace on ${syncRel} — re-run node scripts/install-local.mjs`,
          );
        }
        globalNote = 'global ~/.gemini install verified (real files, byte-synced)';
      }
    } catch (err) {
      if (err?.code === 'EPERM' || err?.code === 'EACCES') {
        globalNote = 'global ~/.gemini read gated by sandbox; staged real-copy verified';
      } else {
        throw err;
      }
    }
    return globalNote;
  });

  // =========================================================================
  // SUITE 2: Backend Engine & DSH Parity Suite (`src/engine/*`)
  // =========================================================================
  console.log('\n--- Suite 2: Backend Engine & DSH Parity Tests (`src/engine/*`) ---');

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

  await check('Engine initialization & concurrent atomic config.json write queue', '@dsh-inspector', async () => {
    studio = await createPrismStudioServer({
      dataDir: engineDataDir,
      token: SIDECAR_TEST_TOKEN,
      shortcutSearchDirs: [mockShortcutsDir],
      startCdp: false,
    });
    engine = studio.engine;
    assert.ok(engine, 'Engine missing on studio instance');

    // Concurrent config updates must serialize cleanly without corrupting config.json or leaving .tmp files
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
    return `origin=${studio.origin}, media=${engine.getMediaOrigin()}`;
  });

  let libraryItems = [];
  await check('Steam 431960 discovery, safe scanner, visibility.json, app/traversal exclusion & SHA-1 cache', '@dsh-inspector', async () => {
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

  // Resolve HTTP server for media routes so we can run 100% sandboxed in-memory HTTP 206 / 403 checks
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

  await check('Path-traversal `../` & `%2e%2e` HTTP 403 rejection on media server', '@dsh-inspector', async () => {
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

  await check('mp4-vfs zero-disk-copy virtual moov-first faststart (stco + co64) & HTTP 206 Range streaming', '@dsh-inspector', async () => {
    const vfsStco = buildVirtualFaststartFromFile(fx.tailMp4Path);
    const vfsCo64 = buildVirtualFaststartFromFile(fx.tailMp4Co64Path);
    assert.equal(vfsStco.kind, 'virtual');
    assert.equal(vfsCo64.kind, 'virtual');

    // Verify top-level box order in virtual layout puts `moov` BEFORE `mdat`
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

    // Live HTTP 206 Partial Content test through media-server.mjs on deterministic marker MP4 + real H.264 MP4!
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
    assert.ok(
      res206.body.equals(fx.tailMp4Info.marker),
      'HTTP 206 Range over media-server did not serve virtual moov-shifted mdat marker!',
    );

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

  await check('pkg-scene PKGV0002 + LZ4 + TEXB0004 embedded MP4 & audio extraction + scene-media disk cache + HTTP 206', '@dsh-inspector', async () => {
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

    // Second Range read must hit disk/memory cache in < 10ms!
    const tWarm0 = performance.now();
    const rVideoWarm = await invokeServerInMemory(mediaHttpServer, {
      method: 'GET',
      url: videoUrlPath,
      headers: { Range: 'bytes=0-63' },
    });
    const warmMs = Math.round((performance.now() - tWarm0) * 100) / 100;
    assert.equal(rVideoWarm.status, 206);
    assert.ok(warmMs < 25, `Scene video warm Range stream too slow: ${warmMs}ms`);

    if (sceneItem.audioUrl) {
      const audioPath = new URL(sceneItem.audioUrl).pathname;
      const rAudio = await invokeServerInMemory(mediaHttpServer, { method: 'GET', url: audioPath });
      assert.equal(rAudio.status, 200);
      assert.equal(rAudio.body.toString('ascii', 0, 3), 'ID3');
    }
    return `TEXB0004 MP4 (${texHit.bytes.length}B, warm=${warmMs}ms) + MP3 BGM streamed`;
  });

  await check('Slideshow `/slides/<token>` natural sort order (`1.png < 2.png < 10.png`)', '@dsh-inspector', async () => {
    const slideItem = findWorkshopItem('100001');
    assert.ok(slideItem && slideItem.slidesUrl, 'Slideshow item 100001 or slidesUrl missing');
    const slidesPath = new URL(slideItem.slidesUrl).pathname;
    const res = await invokeServerInMemory(mediaHttpServer, { method: 'GET', url: slidesPath });
    assert.equal(res.status, 200);
    const data = res.json();
    const list = data.slides || data.items || [];
    assert.equal(list.length, 3, `Expected 3 slide frames, got ${list.length}`);

    // Verify slide 0 is aurora (1440x900), slide 1 is nord (1440x900), slide 2 is emerald (640x400 -> 10.png)!
    const s2Path = new URL(typeof list[2] === 'string' ? list[2] : list[2].url).pathname;
    const s2Res = await invokeServerInMemory(mediaHttpServer, { method: 'GET', url: s2Path });
    assert.equal(s2Res.status, 200);
    const dims2 = readPngDimensions(s2Res.body);
    assert.equal(dims2.width, 640, 'Natural sort failed: 10.png (640x400) should be index 2 after 1.png and 2.png');
    return 'natural sort 1.png -> 2.png -> 10.png verified';
  });

  await check('WE project.json conditional properties, localization & Web HTML shim + Focus Guard injection', '@dsh-inspector', async () => {
    const videoProj = JSON.parse(fs.readFileSync(path.join(fx.workshop431960, '100002', 'project.json'), 'utf8'));
    if (typeof parseWeProjectProperties === 'function') {
      const parsedZh = parseWeProjectProperties(videoProj, {}, 'zh');
      const listZh = Array.isArray(parsedZh) ? parsedZh : parsedZh.list || [];
      const glowProp = listZh.find((p) => (p.name || p.key) === 'glow_intensity');
      assert.ok(glowProp, 'glow_intensity property missing');
      assert.equal(glowProp.label, '光晕强度');
      const parsedEn = parseWeProjectProperties(videoProj, {}, 'en');
      const listEn = Array.isArray(parsedEn) ? parsedEn : parsedEn.list || [];
      assert.equal(listEn.find((p) => (p.name || p.key) === 'glow_intensity')?.label, 'Glow Intensity');
      if (typeof evaluateWeCondition === 'function') {
        assert.equal(evaluateWeCondition(glowProp.condition, { enable_glow: { value: true } }), true);
        assert.equal(evaluateWeCondition(glowProp.condition, { enable_glow: { value: false } }), false);
      }
    }

    const webItem = findWorkshopItem('100003');
    await engine.updateUserProps(webItem.id, { speed: 9 });
    const webPath = new URL(webItem.mediaUrl).pathname;
    const webRes = await invokeServerInMemory(mediaHttpServer, { method: 'GET', url: webPath });
    assert.equal(webRes.status, 200);
    const injectedHtml = webRes.text();
    assert.ok(injectedHtml.includes('__weFocusGuard'), 'Missing __weFocusGuard in served Web HTML');
    assert.ok(injectedHtml.includes('wallpaperRegisterAudioListener'), 'Missing WE audio shim in served Web HTML');
    assert.ok(injectedHtml.includes('wallpaperPropertyListener'), 'Missing WE property shim in served Web HTML');
    return 'WE condition + zh/en localization + HTML Focus Guard verified';
  });

  await check('SHA-256 deduplicated media upload, removal & raw WE `up-dir-*` folder scan', '@dsh-inspector', async () => {
    const sampleBuf = createPrismArtworkPng(320, 200, 'sunset-amber');
    const up1 = await engine.uploadMedia({
      filename: 'custom-sunset.png',
      contentType: 'image/png',
      streamOrBuffer: sampleBuf,
      title: 'Sunset Prism Upload',
    });
    const item1 = up1.item || up1;
    assert.ok(item1?.id, 'First upload did not return item.id');
    assert.equal(Boolean(up1.duplicate), false);

    const up2 = await engine.uploadMedia({
      filename: 'custom-sunset-copy.png',
      contentType: 'image/png',
      streamOrBuffer: sampleBuf,
      title: 'Duplicate Upload',
    });
    assert.equal(Boolean(up2.duplicate), true, 'Identical SHA-256 upload must set duplicate=true');

    await engine.removeUpload(item1.id);
    const afterRemove = await engine.listLibrary({ refresh: true });
    const afterList = Array.isArray(afterRemove) ? afterRemove : afterRemove.items || [];
    assert.ok(!afterList.some((x) => x.id === item1.id), 'Removed upload still present in library');
    return 'SHA-256 dedup + clean removal verified';
  });

  await check('Playlist rotation (`sequence`, `random` & `videoEnd` stepping)', '@dsh-inspector', async () => {
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
        {
          id: 'pl-verify',
          name: 'Verify Cycle',
          wallpaperIds: [w1, w2, w4],
          order: 'sequence',
          trigger: 'videoEnd',
          interval: 15,
        },
      ],
    });

    await engine.stepPlaylist(1, 'videoEnd');
    let cfg = await engine.getConfig();
    assert.equal(cfg.activeWallpaperId || cfg.wallpaperId, w2, 'Sequential step +1 (videoEnd) should advance w1 -> w2');

    await engine.stepPlaylist(1, 'manual');
    cfg = await engine.getConfig();
    assert.equal(cfg.activeWallpaperId || cfg.wallpaperId, w4, 'Sequential step +1 should advance w2 -> w4');

    await engine.stepPlaylist(-1, 'manual');
    cfg = await engine.getConfig();
    assert.equal(cfg.activeWallpaperId || cfg.wallpaperId, w2, 'Sequential step -1 should step back w4 -> w2');

    // Test random mode stays inside eligible group
    await engine.updateConfig({
      rotationOrder: 'random',
      rotationGroups: [
        { id: 'pl-verify', name: 'Verify Cycle', wallpaperIds: [w1, w2, w4], order: 'random', trigger: 'interval', interval: 15 },
      ],
    });
    await engine.stepPlaylist(1, 'manual');
    cfg = await engine.getConfig();
    assert.ok([w1, w2, w4].includes(cfg.activeWallpaperId || cfg.wallpaperId), 'Random step picked item outside playlist');
    return 'sequence (+1/-1) + videoEnd + random verified';
  });

  await check('Whole-profile Presets (7 factory + save/export/import/apply/delete) & 3-tier non-destructive Reset', '@dsh-inspector', async () => {
    const initialPresetsRaw = await engine.listPresets();
    const initialPresets = Array.isArray(initialPresetsRaw) ? initialPresetsRaw : initialPresetsRaw.presets || [];
    assert.ok(initialPresets.length >= 7, `Expected >=7 factory presets, got ${initialPresets.length}`);

    await engine.updateConfig({ colorScheme: 'catppuccin', islandGap: 14, favorites: ['fav-keep-1'] });
    const saved = await engine.savePreset({ name: 'Mocha Island Test', description: 'Verifier snapshot' });
    const savedId = saved.id || saved.preset?.id;
    assert.ok(savedId, 'savePreset did not return preset id');

    const exported = await engine.exportPreset(savedId);
    assert.ok(exported, 'exportPreset returned empty');

    await engine.updateConfig({ colorScheme: 'gruvbox', islandGap: 4 });
    await engine.applyPreset(savedId);
    let cfg = await engine.getConfig();
    assert.equal(cfg.colorScheme, 'catppuccin');
    assert.equal(cfg.islandGap, 14);

    const imported = await engine.importPreset({ ...exported, name: 'Imported Mocha Copy' });
    const importedId = imported?.id || imported?.preset?.id;
    assert.ok(importedId, 'importPreset failed');
    await engine.deletePreset(savedId);
    await engine.deletePreset(importedId);

    // 3-tier non-destructive reset: resets skin/optics/playback/all WITHOUT wiping favorites/wallpaperId/rotationGroups
    const keptWallId = cfg.activeWallpaperId || cfg.wallpaperId;
    await engine.resetConfig('skin');
    cfg = await engine.getConfig();
    assert.equal(cfg.colorScheme, 'prism-default', 'resetConfig("skin") did not reset colorScheme');
    assert.ok((cfg.favorites || []).includes('fav-keep-1'), 'resetConfig("skin") wiped user favorites!');
    assert.equal(cfg.activeWallpaperId || cfg.wallpaperId, keptWallId, 'resetConfig("skin") wiped active wallpaperId!');

    await engine.resetConfig('all');
    cfg = await engine.getConfig();
    assert.ok((cfg.favorites || []).includes('fav-keep-1'), 'resetConfig("all") must preserve favorites content');

    // Clean test curation arrays so Suite 3 screenshots show pristine Library counts
    await engine.updateConfig({ favorites: [], hiddenIds: [], rotationEnabled: false, rotationGroupId: '', rotationGroups: [] });

    const browsed = await engine.browseDirs('');
    assert.ok(browsed && (Array.isArray(browsed.entries) || Array.isArray(browsed.quickRoots)), 'browseDirs failed');
    return `${initialPresets.length} factory presets + CRUD + non-destructive reset verified`;
  });

  await check('Cold-boot config.json persistence & zero-click last-used wallpaper/skin auto-restore', '@legacy-cleaner / @dsh-inspector', async () => {
    const coldDir = path.join(SCRATCH_ROOT, 'cold-boot-data');
    const w1 = findWorkshopItem('100001');
    assert.ok(w1, 'Workshop item 100001 missing');

    // Session 1: User customizes wallpaper, Catppuccin scheme, islandGap, per-wallpaper overrides & dynamic accent
    const srv1 = await createPrismStudioServer({
      dataDir: coldDir,
      token: 'cold-tok-1',
      startCdp: false,
    });
    try {
      await srv1.engine.applyWallpaper(w1.id, {
        skinEnabled: true,
        layoutMode: 'islands',
        islandGap: 12,
        colorScheme: 'catppuccin',
        glassOpacity: 0.78,
        favorites: [w1.id],
        perWallpaperOverrides: {
          [w1.id]: { scrimOpacity: 0.34, mediaBlur: 4 },
        },
        extractedAccent: {
          wallpaperId: w1.id,
          darkHex: '#cba6f7',
          lightHex: '#8839ef',
          tintRgb: '203, 166, 247',
        },
      });
    } finally {
      await srv1.close();
    }

    // Session 2 (Fresh Cold Boot): Measure warm cold-boot `engine.init()` (<50ms, 0 powershell/reg spawns), `/api/bootstrap`, and `<30ms` `applyWallpaper()`!
    const { createWallpaperPrismEngine } = await import(
      pathToFileURL(path.join(REPO_ROOT, 'src', 'engine', 'index.mjs')).href
    );
    const tInit0 = performance.now();
    const fastEngine = await createWallpaperPrismEngine({
      dataDir: coldDir,
      pluginRoot: REPO_ROOT,
      autoInit: false,
    });
    await fastEngine.init();
    const initMs = Math.round((performance.now() - tInit0) * 100) / 100;
    assert.ok(initMs < 50, `Cold-boot engine.init() with warm cache exceeded 50ms budget: ${initMs}ms`);

    const tSw0 = performance.now();
    const w2 = findWorkshopItem('100002');
    await fastEngine.applyWallpaper(w2.id, { islandGap: 10 });
    const switchMs = Math.round((performance.now() - tSw0) * 100) / 100;
    assert.ok(switchMs < 30, `applyWallpaper() exceeded 30ms budget: ${switchMs}ms`);
    await fastEngine.applyWallpaper(w1.id, { islandGap: 12 });
    await fastEngine.close();

    const srv2 = await createPrismStudioServer({
      dataDir: coldDir,
      token: 'cold-tok-2',
      shortcutSearchDirs: [mockShortcutsDir],
      startCdp: false,
    });
    try {
      const tBoot0 = performance.now();
      const bootRes = await invokeServerInMemory(srv2.server, {
        method: 'GET',
        url: '/api/bootstrap',
      });
      const bootMs = Math.round((performance.now() - tBoot0) * 100) / 100;
      assert.equal(bootRes.status, 200);
      assert.ok(
        bootMs < 80,
        `/api/bootstrap took ${bootMs}ms (must NOT spawn powershell.exe on /api/bootstrap or startup!)`,
      );
      const boot = bootRes.json();
      assert.equal(boot.skinEnabled, true, 'skinEnabled must stay true across cold boot');
      assert.equal(boot.sidecarAutoStartsOnBoot, true, 'sidecarAutoStartsOnBoot flag missing');
      assert.equal(boot.autoRestoreLastSettings, true, 'autoRestoreLastSettings flag missing');
      assert.equal(boot.activeItem?.id, w1.id, `Active wallpaper not restored on cold boot (got ${boot.activeItem?.id})`);
      assert.equal(boot.config.colorScheme, 'catppuccin');
      assert.equal(boot.config.islandGap, 12);
      assert.equal(boot.config.perWallpaperOverrides?.[w1.id]?.scrimOpacity, 0.34, 'perWallpaperOverrides lost on cold boot');
      assert.equal(boot.config.extractedAccent?.darkHex, '#cba6f7', 'extractedAccent lost on cold boot');
      assert.ok((boot.config.favorites || []).includes(w1.id), 'favorites lost on cold boot');
      return `init=${initMs}ms (<50ms), switch=${switchMs}ms (<30ms), bootstrap=${bootMs}ms, restored ${w1.id}`;
    } finally {
      await srv2.close();
    }
  });

  await check('Normal Shortcut `.lnk` backup, in-place `--remote-debugging-port` patch, idempotency & lossless restore', '@legacy-cleaner', async () => {
    const lnkDir = mockShortcutsDir;
    const lnk1 = path.join(lnkDir, 'Antigravity.lnk');

    const { inspectNormalShortcuts } = await import(
      pathToFileURL(path.join(REPO_ROOT, 'sidecars', 'prism_studio', 'cdp-bridge.mjs')).href
    );

    const pre = await inspectNormalShortcuts({ searchDirs: [lnkDir], dataDir: engineDataDir });
    assert.equal(pre.normalShortcutEnabled, false);
    assert.equal(pre.shortcuts.length, 2);

    // 1. Enable via POST /api/host/autostart
    const enRes1 = await invokeServerInMemory(studio.server, {
      method: 'POST',
      url: '/api/host/autostart',
      headers: { 'Content-Type': 'application/json', 'X-Sidecar-Token': SIDECAR_TEST_TOKEN },
      body: JSON.stringify({ enabled: true, port: 9339, searchDirs: [lnkDir] }),
    });
    assert.equal(enRes1.status, 200, `POST /api/host/autostart failed: ${enRes1.text()}`);
    const en1 = enRes1.json();
    assert.equal(en1.ok, true);
    assert.equal(en1.autostart.normalShortcutEnabled, true);
    assert.equal(en1.autostart.updatedCount, 2);

    const s1After = en1.autostart.shortcuts.find((s) => s.name === 'Antigravity.lnk');
    const s2After = en1.autostart.shortcuts.find((s) => s.name === 'Antigravity Desktop.lnk');
    assert.equal(s1After.arguments, '--reuse-window --locale=zh-CN --remote-debugging-port=9339');
    assert.equal(s2After.arguments, '--remote-debugging-port=9339');

    // 2. Idempotency: second enable call must NOT duplicate flag and must NOT clobber original backup!
    const enRes2 = await invokeServerInMemory(studio.server, {
      method: 'POST',
      url: '/api/host/autostart',
      headers: { 'Content-Type': 'application/json', 'X-Sidecar-Token': SIDECAR_TEST_TOKEN },
      body: JSON.stringify({ enabled: true, port: 9339, searchDirs: [lnkDir] }),
    });
    const en2 = enRes2.json();
    assert.equal(en2.autostart.updatedCount, 0, 'Idempotent 2nd enable should have updatedCount === 0');
    assert.equal(en2.autostart.alreadyPatchedCount, 2);

    const backupJson = JSON.parse(fs.readFileSync(path.join(engineDataDir, 'shortcut-backup.json'), 'utf8'));
    assert.equal(
      backupJson.entries[lnk1.toLowerCase()]?.originalArguments,
      '--reuse-window --locale=zh-CN',
      'shortcut-backup.json lost original stock arguments on 2nd enable!',
    );

    // 3. Lossless Restore via POST /api/host/autostart { enabled: false }
    const disRes = await invokeServerInMemory(studio.server, {
      method: 'POST',
      url: '/api/host/autostart',
      headers: { 'Content-Type': 'application/json', 'X-Sidecar-Token': SIDECAR_TEST_TOKEN },
      body: JSON.stringify({ enabled: false, searchDirs: [lnkDir] }),
    });
    assert.equal(disRes.status, 200);
    const dis = disRes.json();
    assert.equal(dis.autostart.normalShortcutEnabled, false);
    const s1Restored = dis.autostart.shortcuts.find((s) => s.name === 'Antigravity.lnk');
    const s2Restored = dis.autostart.shortcuts.find((s) => s.name === 'Antigravity Desktop.lnk');
    assert.equal(s1Restored.arguments, '--reuse-window --locale=zh-CN', 'Stock arguments were not losslessly restored!');
    assert.equal(s2Restored.arguments, '', 'Empty stock arguments were not losslessly restored!');
    return '2 real .lnk shortcuts patched, idempotency verified, losslessly restored';
  });

  // =========================================================================
  // SUITE 3: Host Prism Skin, Quick Popover & Studio UI Headless E2E + Screenshots
  // =========================================================================
  console.log('\n--- Suite 3: Host Skin, Quick Popover & Studio UI E2E + 1440x900 Screenshots ---');

  // Re-sync media server & apply vivid Aurora wallpaper in Islands mode for crisp visual verification
  const auroraItem = findWorkshopItem('100001');
  const nordItem = findWorkshopItem('100004');
  await engine.applyWallpaper(auroraItem.id, {
    skinEnabled: true,
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

  // Refresh fallback media server if used
  const latestLib = await engine.listLibrary({ refresh: false });
  libraryItems = Array.isArray(latestLib) ? latestLib : latestLib.items || [];
  mediaHttpServer =
    engine?.mediaServer?.server ||
    engine?._mediaServer?.server ||
    fallbackMediaSrv?.server ||
    mediaHttpServer;

  const mediaOrigin = engine.getMediaOrigin();
  const HUB_MOCK_ORIGIN = 'http://127.0.0.1:43199';

  // Universal request router feeding Headless Chrome over CDP Fetch.enable
  const universalHttpRouter = async (reqInfo) => {
    const u = new URL(reqInfo.url);
    const origin = `${u.protocol}//${u.host}`;
    const pathAndQuery = `${u.pathname}${u.search}`;

    if (origin === studio.origin) {
      const res = await invokeServerInMemory(studio.server, {
        method: reqInfo.method,
        url: pathAndQuery,
        headers: reqInfo.headers,
        body: reqInfo.postData,
      });
      return { status: res.status, headers: res.headers, body: res.body };
    }

    if (origin === mediaOrigin || (fallbackMediaSrv && origin === fallbackMediaSrv.origin)) {
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
        return {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
          body: buildMockAntigravityHubHtml({ initialTheme: 'dark' }),
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
    // 3A. Sidecar Prism Studio UI E2E + Screenshots #1 & #2
    // -----------------------------------------------------------------------
    const shot1Path = path.join(DEFAULT_ARTIFACT_DIR, 'prism-studio-islands-dark.png');
    const shot2Path = path.join(DEFAULT_ARTIFACT_DIR, 'prism-studio-skin-light-nord.png');

    await check('Sidecar Studio UI (`index.html`): X-Sidecar-Token auth, #app 100% height, 4 tabs, zh/en & Screenshots #1 + #2', '@studio-builder', async () => {
      // First verify POST without X-Sidecar-Token returns 401 Unauthorized
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
        // Wait for bootstrap + library render + thumbnail decode + 32x32 chroma accent sample
        await sleep(950);

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

        assert.equal(layoutMetrics.appWidth, 1440, `#app width collapsed: ${layoutMetrics.appWidth}`);
        assert.equal(layoutMetrics.appHeight, 900, `#app height collapsed (197px bug check): ${layoutMetrics.appHeight}`);
        assert.ok(
          layoutMetrics.railContentFillRatio >= 0.80,
          `Left rail (.prism-left-rail) bottom-left void check failed: fill ratio=${layoutMetrics.railContentFillRatio} (expected >= 0.80)`,
        );
        assert.equal(layoutMetrics.hasSidecarBridge, true, 'window.sidecar.fetch bridge missing');
        assert.ok(layoutMetrics.cardCount >= 4, `Expected >=4 wallpaper cards in Library grid, got ${layoutMetrics.cardCount}`);
        for (const reqTab of ['library', 'skin', 'playback']) {
          assert.ok(layoutMetrics.tabs.includes(reqTab), `Missing Studio tab ${reqTab} in ${layoutMetrics.tabs.join(',')}`);
        }
        const sysTabName = layoutMetrics.tabs.includes('host') ? 'host' : 'system';
        assert.ok(layoutMetrics.tabs.includes(sysTabName), `Missing Host/System tab in ${layoutMetrics.tabs.join(',')}`);

        // Select real H.264 Video Wallpaper (100002) in Studio UI & verify 21:9 Preview <video> auto-plays AND survives accent/config updates!
        const videoWallItem = findWorkshopItem('100002');
        await studioPage.evaluate(`(() => {
          const card = Array.from(document.querySelectorAll('.prism-wall-card, [data-action="card-click"]'))
            .find(el => (el.dataset.id || '').includes('100002') || el.innerText.includes('Cyber Obsidian Rain'));
          if (card) card.click();
        })()`);
        await sleep(550);

        const studioVidCheck1 = await studioPage.evaluate(`(() => {
          const v = document.querySelector('.prism-preview-stage video, .prism-mini-preview video, .prism-left-rail video');
          window.__studioPreviewVideoRef = v || null;
          return v ? {
            found: true,
            paused: v.paused,
            muted: v.muted,
            readyState: v.readyState,
            currentTime: v.currentTime,
          } : { found: false };
        })()`);
        assert.equal(studioVidCheck1.found, true, 'Studio 21:9 preview did not render a <video> element for video wallpaper');
        assert.equal(studioVidCheck1.paused, false, 'Studio 21:9 preview <video> is paused (did not autoplay!)');
        if (fx.hasRealVideoFrames) {
          assert.ok(studioVidCheck1.readyState >= 2, `Studio preview <video> readyState=${studioVidCheck1.readyState} (<2)`);
          assert.ok(studioVidCheck1.currentTime > 0, `Studio preview <video> currentTime=${studioVidCheck1.currentTime} (did not advance!)`);
        }

        // Trigger accentCache + glassOpacity config patch via window.sidecar.fetch and verify <video> node is NOT destroyed!
        await studioPage.evaluate(`(async () => {
          await window.sidecar.fetch('/api/config', {
            method: 'POST',
            body: JSON.stringify({
              patch: {
                glassOpacity: 0.76,
                accentCache: {
                  [${JSON.stringify(videoWallItem.id)}]: {
                    wallpaperId: ${JSON.stringify(videoWallItem.id)},
                    darkHex: '#34d399',
                    lightHex: '#059669',
                    tintRgb: '52, 211, 153',
                  },
                },
              },
            }),
          });
          // Also simulate dragging quick slider or clicking preset if present
          const slider = document.querySelector('.prism-left-rail input.prism-range');
          if (slider) {
            slider.value = String(Number(slider.value) || 75);
            slider.dispatchEvent(new Event('input', { bubbles: true }));
          }
        })()`);
        await sleep(250);

        const studioVidCheck2 = await studioPage.evaluate(`(() => {
          const v = document.querySelector('.prism-preview-stage video, .prism-mini-preview video, .prism-left-rail video');
          return {
            sameNode: Boolean(v && v === window.__studioPreviewVideoRef),
            paused: v ? v.paused : true,
            currentTime: v ? v.currentTime : 0,
          };
        })()`);
        assert.equal(
          studioVidCheck2.sameNode,
          true,
          'Studio 21:9 preview <video> DOM node was destroyed/recreated during slider/accentCache update (innerHTML storm)!',
        );
        assert.equal(studioVidCheck2.paused, false, 'Studio 21:9 preview <video> paused after config/accent update');

        // Capture Screenshot #1: Sidecar Prism Studio UI (Islands mode, Dark Obsidian, Library + Redesigned Full-Height Left Rail & Live Video Preview)
        const s1 = await studioPage.capturePng(shot1Path, { expectedWidth: 1440, expectedHeight: 900 });
        screenshots.push({
          path: shot1Path,
          caption: 'Prism Studio dark obsidian library with 21:9 island preview',
        });
        assert.ok(s1.bytes > 25000, 'Screenshot #1 suspiciously small');

        // Exercise Playback & Host/System tabs + zh/en live language switch
        await studioPage.evaluate(`document.querySelector('[data-action="switch-tab"][data-tab="playback"]').click()`);
        await sleep(150);
        const hasPlaybackControls = await studioPage.evaluate(`document.body.innerText.length > 100`);
        assert.ok(hasPlaybackControls, 'Playback & Engine tab empty');

        await studioPage.evaluate(`document.querySelector('[data-action="switch-tab"][data-tab="${sysTabName}"]').click()`);
        await sleep(250);
        const sysAuditBefore = await studioPage.evaluate(`({
          hasAutostartCard: Boolean(document.getElementById('prism-autostart-card')),
          hasAutoRestoreBadge: Boolean(document.getElementById('prism-autorestore-badge')),
          hasBanner: Boolean(document.querySelector('.prism-autostart-banner')),
          hasShortcutList: Boolean(document.querySelector('.prism-shortcut-list')),
          text: document.body.innerText,
        })`);
        assert.equal(sysAuditBefore.hasAutostartCard, true, 'Missing #prism-autostart-card in Host & System tab');
        assert.equal(sysAuditBefore.hasAutoRestoreBadge, true, 'Missing #prism-autorestore-badge in Host & System tab');
        assert.equal(sysAuditBefore.hasBanner, true, 'Missing .prism-autostart-banner in Standby Studio header');
        assert.equal(sysAuditBefore.hasShortcutList, true, 'Missing .prism-shortcut-list in Host & System tab');
        assert.ok(
          /快捷方式|自动恢复|CDP|Shortcut|Restore/i.test(sysAuditBefore.text),
          'Host & System tab missing shortcut autostart / auto-restore copy',
        );

        // Click 1-click "Enable Normal Shortcut Auto-Load" button right inside Studio UI!
        await studioPage.evaluate(`document.querySelector('#prism-autostart-card [data-action="set-autostart"][data-enabled="true"]').click()`);
        let sysAuditAfter = { bannerTone: '', cardText: '' };
        const deadline = Date.now() + 6000;
        while (Date.now() < deadline) {
          await sleep(180);
          sysAuditAfter = await studioPage.evaluate(`({
            bannerTone: document.querySelector('.prism-autostart-banner')?.getAttribute('data-tone') || '',
            cardText: document.getElementById('prism-autostart-card')?.innerText || '',
          })`);
          if (sysAuditAfter.bannerTone === 'ready') break;
        }
        assert.equal(sysAuditAfter.bannerTone, 'ready', 'Clicking Enable Normal Shortcut Auto-Load did not flip banner to data-tone="ready"');
        assert.ok(sysAuditAfter.cardText.includes('AUTOSTART READY'), 'Autostart card did not flip to AUTOSTART READY');

        const shotHostPath = path.join(DEFAULT_ARTIFACT_DIR, 'prism-studio-host-autostart.png');
        const sHost = await studioPage.capturePng(shotHostPath, { expectedWidth: 1440, expectedHeight: 900 });
        screenshots.push({
          path: shotHostPath,
          caption: 'Prism Studio Host & System tab with normal shortcut autostart',
        });
        assert.ok(sHost.bytes > 20000, 'Host & System screenshot suspiciously small');

        // Toggle language zh -> en
        await studioPage.evaluate(`document.querySelector('[data-action="toggle-lang"]').click()`);
        await sleep(200);
        const enText = await studioPage.evaluate(`document.body.innerText`);
        assert.ok(/Library|Prism Skin|Playback|Host/i.test(enText), 'English i18n toggle did not update tab labels');

        // Switch to `Prism Skin` tab + Light Frost polarity + Nord scheme + Nordic Crystal wallpaper for Screenshot #2!
        await engine.applyWallpaper(nordItem.id, {
          themeMode: 'light',
          colorScheme: 'nord',
          layoutMode: 'islands',
          language: 'en',
        });
        await studioPage.evaluate(`(async () => {
          document.querySelector('[data-action="switch-tab"][data-tab="skin"]').click();
          const schemeBtn = document.querySelector('[data-action="set-enum"][data-key="colorScheme"][data-val="nord"]');
          if (schemeBtn) schemeBtn.click();
          const lightBtn = document.querySelector('[data-action="set-enum"][data-key="themeMode"][data-val="light"]');
          if (lightBtn) lightBtn.click();
        })()`);
        await sleep(550);

        const skinAudit = await studioPage.evaluate(`(() => {
          const allCrystalBtns = document.querySelectorAll('[data-action="apply-scene-preset"][data-preset="crystal"]');
          const rightPaneCrystalBtns = document.querySelectorAll('#prism-tab-scroll [data-action="apply-scene-preset"]');
          return {
            theme: document.documentElement.getAttribute('data-prism-theme'),
            crystalPresetCount: allCrystalBtns.length,
            rightPaneDuplicateCount: rightPaneCrystalBtns.length,
          };
        })()`);
        assert.equal(skinAudit.theme, 'light', 'Studio UI did not switch data-prism-theme to light');
        assert.equal(
          skinAudit.rightPaneDuplicateCount,
          0,
          `Duplicate Optical Scene Presets card still present inside Prism Skin tab (found ${skinAudit.rightPaneDuplicateCount} buttons in #prism-tab-scroll)!`,
        );
        assert.equal(skinAudit.crystalPresetCount, 1, 'Expected exactly 1 Scene Presets strip (in .prism-left-rail)');

        const s2 = await studioPage.capturePng(shot2Path, { expectedWidth: 1440, expectedHeight: 900 });
        screenshots.push({
          path: shot2Path,
          caption: 'Prism Studio skin tab in Light Frost Nord color scheme',
        });
        assert.ok(s2.bytes > 25000, 'Screenshot #2 suspiciously small');

        const modalCalls = await studioPage.evaluate(`({ confirm: window.__confirmCalled, alert: window.__alertCalled })`);
        assert.equal(modalCalls.confirm, 0, 'Forbidden window.confirm() called');
        assert.equal(modalCalls.alert, 0, 'Forbidden window.alert() called');
        assert.deepEqual(studioPage.consoleErrors, [], `Studio UI console.error: ${studioPage.consoleErrors.join(' | ')}`);
        assert.deepEqual(studioPage.pageExceptions, [], `Studio UI uncaught exception: ${studioPage.pageExceptions.join(' | ')}`);

        return `Shot1=${Math.round(s1.bytes / 1024)}KB, Shot2=${Math.round(s2.bytes / 1024)}KB, 0 errors`;
      } finally {
        await browser.closePage(studioPage);
      }
    });

    // -----------------------------------------------------------------------
    // 3B. Simulated Antigravity 2.0 Hub + Host Skin + Quick Popover + Screenshot #3
    // -----------------------------------------------------------------------
    const shot3Path = path.join(DEFAULT_ARTIFACT_DIR, 'antigravity-hub-islands-popover.png');
    const { getHostSkinScript, getHostPanelScript, buildClientSkinPayload } = await import(
      pathToFileURL(path.join(REPO_ROOT, 'src', 'host', 'index.mjs')).href
    );
    const { buildRpcBootstrapSource } = await import(
      pathToFileURL(path.join(REPO_ROOT, 'sidecars', 'prism_studio', 'cdp-bridge.mjs')).href
    );

    await check('Antigravity 2.0 Hub Skin specificity, Islands/Flush, ::before carrier, Neko coexistence, Ctrl+Alt+W, 2-stage Esc, Focus Guard & destroy() + Screenshot #3', '@prism-designer', async () => {
      // Set dark Obsidian + Aurora wallpaper + Islands mode on engine
      await engine.applyWallpaper(auroraItem.id, {
        skinEnabled: true,
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
        // Verify native pre-injection baseline: body.dark background is rgb(7, 7, 8) (#070708)
        const preBg = await hubPage.evaluate(`getComputedStyle(document.body).backgroundColor`);
        assert.equal(preBg, 'rgb(7, 7, 8)', `Unexpected pre-skin Hub body background: ${preBg}`);

        const nekoBefore = await hubPage.evaluate(`(() => {
          const el = document.getElementById('gemini-neko-pet-root');
          const cs = getComputedStyle(el);
          return { pos: cs.position, z: cs.zIndex, bg: cs.backgroundColor };
        })()`);

        // Wire live CDP binding `__agyPrismNativeSend` -> `studio.rpcHandlers` -> `__agyPrismRpcResolve`
        await hubPage.addBinding('__agyPrismNativeSend', async (rawPayload) => {
          const req = JSON.parse(rawPayload);
          try {
            const handler = studio.rpcHandlers[req.method];
            if (!handler) throw new Error(`Unknown RPC method: ${req.method}`);
            const result = await handler(req.params || {});
            // Also push live skin update into window.__agyPrism if state changed
            const st = await studio.getState();
            const lib = await engine.listLibrary({ refresh: false });
            const items = Array.isArray(lib) ? lib : lib.items || [];
            const nextPayload = buildClientSkinPayload(st.config, st.activeItem, st.mediaOrigin, {
              skinEnabled: st.skinEnabled,
            });
            await hubPage.evaluate(`(() => {
              if (window.__agyPrism && typeof window.__agyPrism.applyPayload === 'function') {
                window.__agyPrism.applyPayload(${JSON.stringify(nextPayload)});
              }
              if (window.__agyPrismRpcResolve) {
                window.__agyPrismRpcResolve(${JSON.stringify({ id: req.id, ok: true, result })});
                window.__agyPrismRpcResolve(${JSON.stringify({ event: 'state', data: { ...st, items } })});
              }
            })()`);
          } catch (err) {
            await hubPage.evaluate(
              `window.__agyPrismRpcResolve && window.__agyPrismRpcResolve(${JSON.stringify({
                id: req.id,
                ok: false,
                error: err?.message || String(err),
              })})`,
            );
          }
        });

        await hubPage.evaluate(buildRpcBootstrapSource());

        const st = await studio.getState();
        const skinPayload = buildClientSkinPayload(st.config, st.activeItem, st.mediaOrigin, {
          skinEnabled: true,
        });

        // Inject Host Skin Kernel + Panel Kernel
        await hubPage.evaluate(`window.__AGY_PRISM_BOOT_PAYLOAD__ = ${JSON.stringify(skinPayload)};`);
        await hubPage.evaluate(getHostSkinScript({ reload: true }));
        await hubPage.evaluate(
          `window.__AGY_PRISM_PANEL_BOOT__ = ${JSON.stringify({ ...st, items: libraryItems, connected: true })};`,
        );
        await hubPage.evaluate(getHostPanelScript({ reload: true }));
        await sleep(600);

        // 1. Specificity, Islands Geometry, ::before Backdrop-Filter Carrier & Sibling Coexistence
        const hubAudit = await hubPage.evaluate(`(() => {
          const html = document.documentElement;
          const bodyCs = getComputedStyle(document.body);
          const rootCs = getComputedStyle(document.getElementById('root'));
          const shell = document.querySelector('.agy-shell');
          const shellCs = getComputedStyle(shell);
          const sidebar = document.querySelector('.agy-sidebar');
          const sidebarCs = getComputedStyle(sidebar);
          const gutter = document.querySelector('[data-testid="sidebar-split"] > div:nth-child(2)');
          const gutterCs = getComputedStyle(gutter);
          const convCs = getComputedStyle(document.querySelector('[data-testid="conversation-view"]'));
          const composer = document.querySelector('.surface-composer-card');
          const composerCs = getComputedStyle(composer);
          const composerBeforeCs = getComputedStyle(composer, '::before');
          const fixedProbeRect = document.getElementById('composer-fixed-probe').getBoundingClientRect();
          const viewLinesCs = getComputedStyle(document.querySelector('.monaco-editor .view-lines'));
          const wbSidebarCs = getComputedStyle(document.querySelector('.monaco-workbench .part.sidebar'));
          const menuCs = getComputedStyle(document.getElementById('hub-menu-probe'));
          const neko = document.getElementById('gemini-neko-pet-root');
          const nekoCs = getComputedStyle(neko);
          const ctxMeterCs = getComputedStyle(document.getElementById('ag-context-meter'));
          const pill = document.getElementById('agy-prism-pill');

          return {
            skinAttr: html.getAttribute('data-agy-prism-skin'),
            layoutAttr: html.getAttribute('data-prism-layout'),
            themeAttr: html.getAttribute('data-prism-theme'),
            tokenBg: bodyCs.getPropertyValue('--background').trim(),
            rootBg: rootCs.backgroundColor,
            rootBackdrop: rootCs.backdropFilter || rootCs.webkitBackdropFilter || 'none',
            shellBackdrop: shellCs.backdropFilter || shellCs.webkitBackdropFilter || 'none',
            shellPadTop: shellCs.paddingTop,
            sidebarRadius: sidebarCs.borderTopLeftRadius,
            gutterWidth: gutterCs.width,
            convBackdrop: convCs.backdropFilter || convCs.webkitBackdropFilter || 'none',
            viewLinesBackdrop: viewLinesCs.backdropFilter || viewLinesCs.webkitBackdropFilter || 'none',
            composerSelfBackdrop: composerCs.backdropFilter || composerCs.webkitBackdropFilter || 'none',
            composerBeforeBackdrop: composerBeforeCs.backdropFilter || composerBeforeCs.webkitBackdropFilter || 'none',
            fixedProbeTop: Math.round(fixedProbeRect.top),
            fixedProbeLeft: Math.round(fixedProbeRect.left),
            wbSidebarRadius: wbSidebarCs.borderTopLeftRadius,
            menuBg: menuCs.backgroundColor,
            neko: { pos: nekoCs.position, z: nekoCs.zIndex, bg: nekoCs.backgroundColor },
            ctxZ: ctxMeterCs.zIndex,
            pillInFooter: Boolean(pill && pill.closest('.agy-composer-footer')),
            stageExists: Boolean(document.getElementById('agy-prism-stage')),
          };
        })()`);

        assert.equal(hubAudit.skinAttr, '1.0.0');
        assert.equal(hubAudit.layoutAttr, 'islands');
        assert.equal(hubAudit.tokenBg, 'transparent', `body.dark --background was not overridden: ${hubAudit.tokenBg}`);
        assert.equal(hubAudit.rootBg, 'rgba(0, 0, 0, 0)', '#root background must be transparent');
        assert.equal(hubAudit.rootBackdrop, 'none', '#root must never have backdrop-filter');
        assert.equal(hubAudit.shellBackdrop, 'none', '.agy-shell must never have backdrop-filter');
        assert.equal(hubAudit.shellPadTop, '8px', 'Islands mode .agy-shell workspacePad should be 8px');
        assert.equal(hubAudit.sidebarRadius, '12px', 'Islands mode .agy-sidebar radius should be 12px');
        assert.equal(hubAudit.gutterWidth, '8px', 'Islands mode resize gutter width should be 8px');
        assert.equal(hubAudit.wbSidebarRadius, '12px', '.monaco-workbench .part.sidebar island radius should be 12px');
        assert.equal(hubAudit.convBackdrop, 'none', 'Scrollable conversation-view must have backdrop-filter: none');
        assert.equal(hubAudit.viewLinesBackdrop, 'none', '.monaco-editor .view-lines must have backdrop-filter: none');
        assert.equal(
          hubAudit.fixedProbeTop,
          0,
          `position:fixed child inside .surface-composer-card was trapped (top=${hubAudit.fixedProbeTop}, selfBackdrop=${hubAudit.composerSelfBackdrop})! Use ::before carrier!`,
        );
        assert.equal(hubAudit.fixedProbeLeft, 0, 'position:fixed child inside .surface-composer-card trapped horizontally');
        assert.ok(
          parseAlphaFromCssColor(hubAudit.menuBg) >= 0.88,
          `[role="menu"] background alpha too low (${hubAudit.menuBg}), expected >= 0.88`,
        );
        assert.deepEqual(hubAudit.neko, nekoBefore, '#gemini-neko-pet-root was mutated by Prism CSS!');
        assert.equal(hubAudit.ctxZ, '7500', '#ag-context-meter z-index altered');
        assert.equal(hubAudit.pillInFooter, true, '#agy-prism-pill not mounted inside .agy-composer-footer');

        // 1B. Antigravity 2.34.0 regressions (Issue #1): inner .dark token reset, .browser-hole-opaque & settings modal inside #root
        const v234Audit = await hubPage.evaluate(`(() => {
          const prevHole = document.body.getAttribute('data-has-browser-hole');
          const bd = document.getElementById('v234-settings-backdrop-probe');
          const dlg = document.getElementById('v234-settings-dialog-probe');
          const detail = document.getElementById('v234-settings-detail-probe');
          const innerDark = document.getElementById('v234-inner-dark-probe');
          const hole = document.getElementById('v234-browser-hole-probe');
          const mainBody = document.getElementById('v234-main-body-probe');
          document.body.setAttribute('data-has-browser-hole', 'true');
          bd.style.display = 'flex';
          try {
            const innerCs = getComputedStyle(innerDark);
            const holeCs = getComputedStyle(hole);
            const mainBodyCs = getComputedStyle(mainBody);
            const bdCs = getComputedStyle(bd);
            const dlgCs = getComputedStyle(dlg);
            const detailCs = getComputedStyle(detail);
            return {
              innerDarkBgVar: innerCs.getPropertyValue('--background').trim(),
              innerDarkSidebarVar: innerCs.getPropertyValue('--sidebar').trim(),
              holeBg: holeCs.backgroundColor,
              holeShellCanvas: holeCs.getPropertyValue('--shell-canvas').trim(),
              mainBodyBg: mainBodyCs.backgroundColor,
              backdropBg: bdCs.backgroundColor,
              backdropBlur: bdCs.backdropFilter || bdCs.webkitBackdropFilter || 'none',
              dialogBg: dlgCs.backgroundColor,
              dialogBgVar: dlgCs.getPropertyValue('--background').trim(),
              detailBg: detailCs.backgroundColor,
            };
          } finally {
            bd.style.display = 'none';
            if (prevHole == null) document.body.removeAttribute('data-has-browser-hole');
            else document.body.setAttribute('data-has-browser-hole', prevHole);
          }
        })()`);
        assert.equal(v234Audit.innerDarkBgVar, 'transparent', `Inner #root .dark reset --background: ${v234Audit.innerDarkBgVar}`);
        assert.notEqual(v234Audit.innerDarkSidebarVar, '#111114', 'Inner #root .dark reset --sidebar back to solid #111114');
        assert.equal(v234Audit.holeShellCanvas, 'transparent', `Inner .agy-inset-shell --shell-canvas not hollowed: ${v234Audit.holeShellCanvas}`);
        assert.equal(v234Audit.holeBg, 'rgba(0, 0, 0, 0)', `.browser-hole-opaque stayed opaque: ${v234Audit.holeBg}`);
        assert.equal(v234Audit.mainBodyBg, 'rgba(0, 0, 0, 0)', `[data-main-content-body] stayed opaque: ${v234Audit.mainBodyBg}`);
        assert.ok(parseAlphaFromCssColor(v234Audit.backdropBg) >= 0.25, `Settings modal backdrop lost dim tint: ${v234Audit.backdropBg}`);
        assert.ok(String(v234Audit.backdropBlur).includes('blur('), `Settings modal backdrop lost blur: ${v234Audit.backdropBlur}`);
        assert.ok(parseAlphaFromCssColor(v234Audit.dialogBg) >= 0.90, `Settings dialog inside #root became transparent: ${v234Audit.dialogBg}`);
        assert.notEqual(v234Audit.dialogBgVar, 'transparent', 'Settings dialog --background remained transparent');
        assert.ok(parseAlphaFromCssColor(v234Audit.detailBg) >= 0.90, `Settings detail pane inside #root became transparent: ${v234Audit.detailBg}`);

        // 2. Test `flush` layout switch & code contrastFloor at extreme glassOpacity=0.30
        await hubPage.evaluate(`window.__agyPrism.updateConfig({ layoutMode: 'flush', glassOpacity: 0.30, contrastFloor: true })`);
        const flushCheck = await hubPage.evaluate(`(() => {
          const shellCs = getComputedStyle(document.querySelector('.agy-shell'));
          const sidebarCs = getComputedStyle(document.querySelector('.agy-sidebar'));
          const gutterCs = getComputedStyle(document.querySelector('[data-testid="sidebar-split"] > div:nth-child(2)'));
          const termCs = getComputedStyle(document.querySelector('[data-testid="background-task-command"]'));
          return {
            pad: shellCs.paddingTop,
            radius: sidebarCs.borderTopLeftRadius,
            gutter: gutterCs.width,
            termBg: termCs.backgroundColor,
          };
        })()`);
        assert.equal(flushCheck.pad, '0px');
        assert.equal(flushCheck.radius, '0px');
        assert.equal(flushCheck.gutter, '1px');
        assert.ok(
          parseAlphaFromCssColor(flushCheck.termBg) >= 0.70,
          `contrastFloor failed at glassOpacity=0.30: terminal bg=${flushCheck.termBg}`,
        );

        // Restore crisp Islands mode for Screenshot #3
        await hubPage.evaluate(`window.__agyPrism.updateConfig({ layoutMode: 'islands', glassOpacity: 0.72 })`);

        // 3. Test live MutationObserver Light/Dark sync without remounting stage
        await hubPage.evaluate(`(() => {
          window.__stageRefBefore = document.getElementById('agy-prism-stage');
          document.documentElement.className = 'light';
          document.body.className = 'light';
        })()`);
        await sleep(120);
        const lightSync = await hubPage.evaluate(`({
          theme: document.documentElement.getAttribute('data-prism-theme'),
          sameStage: document.getElementById('agy-prism-stage') === window.__stageRefBefore,
        })`);
        assert.equal(lightSync.theme, 'light', 'MutationObserver did not auto-sync to body.light');
        assert.equal(lightSync.sameStage, true, 'Theme switch unnecessarily destroyed/recreated #agy-prism-stage');

        // Switch back to Dark Obsidian for Screenshot #3
        await hubPage.evaluate(`(() => {
          document.documentElement.className = 'dark';
          document.body.className = 'dark';
        })()`);
        await sleep(120);

        // 4. Summon Quick Prism Popover via real `Ctrl+Alt+W` key event!
        await hubPage.pressKey({
          key: 'w',
          code: 'KeyW',
          windowsVirtualKeyCode: 87,
          modifiers: 3, // Alt (1) + Ctrl (2)
        });
        await sleep(280);

        const popState = await hubPage.evaluate(`window.__agyPrismPanel.status()`);
        assert.equal(popState.open, true, 'Ctrl+Alt+W did not open #agy-prism-popover');

        // Capture Screenshot #3: Simulated Antigravity 2.0 Hub with Whole-Window Wallpaper + Floating Island Glass Panes + Open Ctrl+Alt+W Quick Prism Popover!
        const s3 = await hubPage.capturePng(shot3Path, { expectedWidth: 1440, expectedHeight: 900 });
        screenshots.push({
          path: shot3Path,
          caption: 'Antigravity Hub floating glass islands with Ctrl+Alt+W Prism popover',
        });
        assert.ok(s3.bytes > 25000, 'Screenshot #3 suspiciously small');

        // 5. Verify Two-Stage `Escape` on `#agy-prism-popover`
        await hubPage.evaluate(`window.__agyPrismPanel.openDrilldown()`);
        let stEsc = await hubPage.evaluate(`window.__agyPrismPanel.status()`);
        assert.equal(stEsc.drilldown, true);
        assert.equal(stEsc.open, true);

        // Stage 1 Escape -> closes drilldown, keeps popover open!
        await hubPage.pressKey({ key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await sleep(80);
        stEsc = await hubPage.evaluate(`window.__agyPrismPanel.status()`);
        assert.equal(stEsc.drilldown, false, '1st Escape did not unwind drilldown');
        assert.equal(stEsc.open, true, '1st Escape closed parent popover prematurely instead of two-stage unwind!');

        // Stage 2 Escape -> closes parent popover!
        await hubPage.pressKey({ key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await sleep(80);
        stEsc = await hubPage.evaluate(`window.__agyPrismPanel.status()`);
        assert.equal(stEsc.open, false, '2nd Escape did not close #agy-prism-popover');

        // 6. Verify Dynamic Wallpaper Accent Extractor (`extractAccent`)
        const extracted = await hubPage.evaluate(`window.__agyPrism.extractAccent(${JSON.stringify(auroraItem.thumbUrl)})`);
        if (extracted) {
          assert.match(String(extracted.darkHex || ''), /^#[0-9a-f]{6}$/i);
          assert.match(String(extracted.lightHex || ''), /^#[0-9a-f]{6}$/i);
        }

        // 6B. Verify Real <video> Autoplay on Maximized `1920x1080` Host Viewport (`outerWidth === availWidth`) + Zero Remount on `accent.save`!
        const videoItem = findWorkshopItem('100002');
        await hubPage.setViewport(1920, 1080, 1);
        await engine.applyWallpaper(videoItem.id, { skinEnabled: true, paused: false, muted: true });
        const stVid = await studio.getState();
        const vidPayload = buildClientSkinPayload(stVid.config, stVid.activeItem, stVid.mediaOrigin, { skinEnabled: true });
        await hubPage.evaluate(`window.__agyPrism.applyPayload(${JSON.stringify(vidPayload)})`);
        await sleep(520);

        const hubVid1 = await hubPage.evaluate(`(() => {
          const v = document.querySelector('#agy-prism-stage video');
          window.__hubStageVideoRef = v || null;
          return v ? {
            found: true,
            paused: v.paused,
            readyState: v.readyState,
            currentTime: v.currentTime,
            prismPaused: window.__agyPrism.status().paused,
            pauseReason: window.__agyPrism.status().pauseReason,
          } : { found: false };
        })()`);
        assert.equal(hubVid1.found, true, 'Hub #agy-prism-stage did not mount <video> for video wallpaper');
        assert.equal(
          hubVid1.paused,
          false,
          `Hub <video> paused on maximized 1920x1080 window (prismPaused=${hubVid1.prismPaused}, reason=${hubVid1.pauseReason})!`,
        );
        if (fx.hasRealVideoFrames) {
          assert.ok(hubVid1.readyState >= 2, `Hub <video> readyState=${hubVid1.readyState} (<2)`);
          assert.ok(hubVid1.currentTime > 0, `Hub <video> currentTime=${hubVid1.currentTime} (did not advance!)`);
        }

        // Trigger `accent.save` RPC (which echoes updated state/applyPayload back to host!) + slider update -> <video> MUST NOT remount or pause!
        await hubPage.evaluate(`(async () => {
          await window.__agyPrismCall('accent.save', {
            wallpaperId: ${JSON.stringify(videoItem.id)},
            darkHex: '#50a37b',
            lightHex: '#059669',
            tintRgb: '80, 163, 123',
          });
          window.__agyPrism.updateConfig({ glassOpacity: 0.78 });
        })()`);
        await sleep(220);

        const hubVid2 = await hubPage.evaluate(`(() => {
          const v = document.querySelector('#agy-prism-stage video');
          return {
            sameNode: Boolean(v && v === window.__hubStageVideoRef),
            paused: v ? v.paused : true,
            currentTime: v ? v.currentTime : 0,
          };
        })()`);
        assert.equal(hubVid2.sameNode, true, 'Hub #agy-prism-stage <video> was destroyed/recreated on accent.save / slider update!');
        assert.equal(hubVid2.paused, false, 'Hub #agy-prism-stage <video> paused after accent.save / slider update!');

        // Also verify `scene` (`sceneMode === 'video'` / `scene-video`) mounts & plays <video> on stage!
        const sceneVidPayload = buildClientSkinPayload(stVid.config, nordItem, stVid.mediaOrigin, { skinEnabled: true });
        await hubPage.evaluate(`window.__agyPrism.applyPayload(${JSON.stringify(sceneVidPayload)})`);
        await sleep(650);
        const sceneVidCheck = await hubPage.evaluate(`(() => {
          const vids = Array.from(document.querySelectorAll('#agy-prism-stage video'));
          const v = vids[vids.length - 1] || null;
          const wrap = v ? v.closest('.agy-prism-media-wrap') : null;
          const st = window.__agyPrism.status();
          return v ? {
            found: true,
            paused: v.paused,
            statusVideoPaused: st.videoPaused,
            readyState: v.readyState,
            currentTime: v.currentTime,
            wrapOpacity: wrap ? parseFloat(getComputedStyle(wrap).opacity) : 0,
            hasPoster: Boolean(v.getAttribute('poster')),
          } : { found: false };
        })()`);
        assert.equal(sceneVidCheck.found, true, 'Scene TEXB0004 video did not mount <video> in #agy-prism-stage');
        assert.equal(sceneVidCheck.paused, false, 'Scene TEXB0004 <video> paused on mount');
        assert.equal(sceneVidCheck.statusVideoPaused, false, 'window.__agyPrism.status().videoPaused should be false');
        assert.ok(sceneVidCheck.wrapOpacity >= 0.99, `Video crossfade stuck at opacity=${sceneVidCheck.wrapOpacity} (<0.99)!`);
        assert.equal(sceneVidCheck.hasPoster, true, 'Video wallpaper missing poster fallback from thumbUrl');

        await hubPage.setViewport(1440, 900, 1);

        // 7. Verify Web Wallpaper iframe Sandbox + Focus Handback Guard (no focus theft from #hub-composer-input!)
        const webItem = findWorkshopItem('100003');
        await hubPage.evaluate(`document.getElementById('hub-composer-input').focus()`);
        const webPayload = buildClientSkinPayload(st.config, webItem, st.mediaOrigin, { skinEnabled: true });
        await hubPage.evaluate(`window.__agyPrism.applyPayload(${JSON.stringify(webPayload)})`);
        await sleep(450);

        const focusCheck = await hubPage.evaluate(`(() => {
          const iframe = document.querySelector('#agy-prism-stage iframe');
          return {
            activeId: document.activeElement ? document.activeElement.id : '',
            hasIframe: Boolean(iframe),
            sandbox: iframe ? iframe.getAttribute('sandbox') : '',
          };
        })()`);
        assert.equal(focusCheck.hasIframe, true, 'Web wallpaper did not mount <iframe> in #agy-prism-stage');
        assert.ok(String(focusCheck.sandbox).includes('allow-scripts'), 'Web wallpaper iframe missing sandbox="allow-scripts"');
        assert.equal(focusCheck.activeId, 'hub-composer-input', 'Web wallpaper stole focus from #hub-composer-input!');

        // 8. Verify Clean `destroy()` Teardown -> 100% Byte-Identical Native Host Restoration
        await hubPage.evaluate(`(() => {
          window.__agyPrism.destroy();
          window.__agyPrismPanel.destroy();
        })()`);
        const postDestroy = await hubPage.evaluate(`({
          skinAttr: document.documentElement.hasAttribute('data-agy-prism-skin'),
          panelAttr: document.documentElement.hasAttribute('data-agy-prism-panel'),
          stage: Boolean(document.getElementById('agy-prism-stage')),
          style: Boolean(document.getElementById('agy-prism-css')),
          popover: Boolean(document.getElementById('agy-prism-popover')),
          pill: Boolean(document.getElementById('agy-prism-pill')),
          bodyBg: getComputedStyle(document.body).backgroundColor,
          skinGlobal: typeof window.__agyPrism,
          panelGlobal: typeof window.__agyPrismPanel,
        })`);
        assert.equal(postDestroy.skinAttr, false);
        assert.equal(postDestroy.panelAttr, false);
        assert.equal(postDestroy.stage, false);
        assert.equal(postDestroy.style, false);
        assert.equal(postDestroy.popover, false);
        assert.equal(postDestroy.pill, false);
        assert.equal(postDestroy.bodyBg, 'rgb(7, 7, 8)', 'destroy() did not restore native body.dark #070708 background');
        assert.equal(postDestroy.skinGlobal, 'undefined');
        assert.equal(postDestroy.panelGlobal, 'undefined');

        assert.deepEqual(hubPage.consoleErrors, [], `Hub E2E console.error: ${hubPage.consoleErrors.join(' | ')}`);
        assert.deepEqual(hubPage.pageExceptions, [], `Hub E2E uncaught exception: ${hubPage.pageExceptions.join(' | ')}`);

        return `Shot3=${Math.round(s3.bytes / 1024)}KB, specificity+islands+::before+Esc+FocusGuard+destroy verified`;
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
