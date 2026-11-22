#!/usr/bin/env node
// Safe thin CLI for agy-wallpaper-prism: status | preset | restore | create-shortcut
// Communicates with the running Prism Studio Sidecar over loopback HTTP (or writes
// config.json atomically when offline). NEVER kills or restarts Antigravity.exe.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import {
  DEFAULT_CONFIG,
  DEFAULT_DEBUG_PORT,
  PLUGIN_ID,
  PLUGIN_VERSION,
  SCENE_PRESETS,
  SCENE_PRESET_IDS,
  sanitizeConfig,
} from '../src/shared/schema.mjs';
import {
  createDebugShortcut,
  disableNormalShortcutAutoLoad,
  enableNormalShortcutAutoLoad,
  inspectNormalShortcuts,
  isPluginEnabledInHostConfig,
  probeCdpPort,
  readDevToolsActivePort,
  resolveAntigravityExe,
} from '../sidecars/prism_studio/cdp-bridge.mjs';

export function resolvePrismDataDir() {
  if (process.env.AGY_PRISM_DATA_DIR) return resolve(process.env.AGY_PRISM_DATA_DIR);
  return join(homedir(), '.agy-wallpaper-prism');
}

function readJsonSafe(fp) {
  try {
    if (!existsSync(fp)) return null;
    return JSON.parse(readFileSync(fp, 'utf8'));
  } catch {
    return null;
  }
}

/** Verify both PID liveness and exact Sidecar `/api/status` PID identity with zero child-process spawns. */
async function verifySidecarServer(info) {
  if (!info || info.plugin !== PLUGIN_ID || !Number.isInteger(Number(info.pid)) || !Number.isInteger(Number(info.port))) {
    return false;
  }
  const pid = Number(info.pid);
  try {
    process.kill(pid, 0);
  } catch {
    return false;
  }
  try {
    const res = await fetch(`http://127.0.0.1:${info.port}/api/status`, {
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return Number(data?.pid) === pid;
  } catch {
    return false;
  }
}

async function callSidecar(method, pathname, body = null) {
  const dataDir = resolvePrismDataDir();
  const info = readJsonSafe(join(dataDir, 'server_info.json'));
  if (!(await verifySidecarServer(info))) return null;
  const headers = { 'Content-Type': 'application/json' };
  if (info.token) headers['X-Sidecar-Token'] = info.token;
  const res = await fetch(`http://127.0.0.1:${info.port}${pathname}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) throw new Error(`Sidecar HTTP ${res.status}`);
  return res.json();
}

function writeOfflineConfigPatch(patch) {
  const dataDir = resolvePrismDataDir();
  const cfgPath = join(dataDir, 'config.json');
  mkdirSync(dirname(cfgPath), { recursive: true });
  const prev = readJsonSafe(cfgPath) || DEFAULT_CONFIG;
  const next = sanitizeConfig(patch, prev);
  const tmp = `${cfgPath}.tmp.${process.pid}.${Date.now()}`;
  writeFileSync(tmp, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  writeFileSync(cfgPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  try {
    if (existsSync(tmp)) writeFileSync(tmp, '', 'utf8');
  } catch {
    /* ignore */
  }
  return next;
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) out[k] = true;
      else {
        out[k] = next;
        i += 1;
      }
    } else {
      out._.push(a);
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const cmd = args._[0] || 'status';

if (cmd === 'status') {
  const live = await callSidecar('GET', '/api/status').catch(() => null);
  const dataDir = resolvePrismDataDir();
  const cfg = live?.activeItem ? live : readJsonSafe(join(dataDir, 'config.json')) || DEFAULT_CONFIG;
  const portFile = readDevToolsActivePort();
  const cdpPort = portFile?.port || Number(args.port || DEFAULT_DEBUG_PORT);
  const cdp = await probeCdpPort(cdpPort);
  const autostart = live?.autostart || (await inspectNormalShortcuts({ dataDir, port: cdpPort }));

  console.log(`== ${PLUGIN_ID} v${PLUGIN_VERSION} ==`);
  console.log(`  host exe        ${resolveAntigravityExe() || '(not found)'}`);
  console.log(`  plugin enabled  ${isPluginEnabledInHostConfig()}`);
  console.log(`  cdp (${cdpPort})      ${cdp.ok ? `reachable (${cdp.browser})` : `standby (${cdp.error})`}`);
  console.log(
    `  normal shortcut ${autostart.normalShortcutEnabled ? `enabled (${autostart.patchedShortcuts.length} patched)` : `stock (${autostart.shortcuts.length} found — run enable-autostart)`}`,
  );
  console.log(`  cold-boot sync  ready (sidecar restart_policy=always, config=${join(dataDir, 'config.json')})`);
  console.log(`  sidecar server  ${live ? `online (pid ${live.pid}, media ${live.mediaOrigin || 'n/a'})` : 'offline'}`);
  console.log(`  skinEnabled     ${live ? live.skinEnabled : cfg.skinEnabled ?? true}`);
  if (live?.activeItem) {
    console.log(`  active item     ${live.activeItem.title} [${live.activeItem.kind}]`);
  }
} else if (cmd === 'enable-autostart') {
  const port = Number(args.port || DEFAULT_DEBUG_PORT);
  const searchDirs = typeof args['search-dir'] === 'string' ? [args['search-dir']] : null;
  const live = !searchDirs ? await callSidecar('POST', '/api/host/autostart', { enabled: true, port }).catch(() => null) : null;
  const res = live?.autostart || (await enableNormalShortcutAutoLoad({ port, searchDirs, dataDir: resolvePrismDataDir() }));
  console.log(
    `[prism] normal shortcut auto-load enabled (updated=${res.updatedCount}, alreadyPatched=${res.alreadyPatchedCount}, total=${res.patchedShortcuts.length})`,
  );
  for (const p of res.patchedShortcuts || []) console.log(`  -> ${p}`);
  console.log(`  backup saved: ${res.backupPath}`);
} else if (cmd === 'disable-autostart') {
  const searchDirs = typeof args['search-dir'] === 'string' ? [args['search-dir']] : null;
  const live = !searchDirs ? await callSidecar('POST', '/api/host/autostart', { enabled: false }).catch(() => null) : null;
  const res = live?.autostart || (await disableNormalShortcutAutoLoad({ searchDirs, dataDir: resolvePrismDataDir() }));
  console.log(`[prism] normal shortcut stock arguments restored (restored=${res.restoredCount})`);
} else if (cmd === 'preset') {
  const name = String(args._[1] || 'islands').toLowerCase();
  if (!SCENE_PRESET_IDS.includes(name)) {
    console.error(`Unknown scene preset "${name}". Expected one of: ${SCENE_PRESET_IDS.join(', ')}`);
    process.exit(2);
  }
  const live = await callSidecar('POST', '/api/preset/apply', { presetId: name }).catch(() => null);
  if (live?.ok) {
    console.log(`[prism] applied preset "${name}" live via Sidecar`);
  } else {
    writeOfflineConfigPatch({ ...SCENE_PRESETS[name].patch, skinEnabled: true });
    console.log(`[prism] saved preset "${name}" to ${resolvePrismDataDir()}/config.json`);
  }
} else if (cmd === 'restore') {
  const live = await callSidecar('POST', '/api/skin/restore', {}).catch(() => null);
  if (live?.ok) {
    console.log('[prism] host skin restored cleanly via Sidecar (skinEnabled=false)');
  } else {
    writeOfflineConfigPatch({ skinEnabled: false });
    console.log(`[prism] marked skinEnabled=false in ${resolvePrismDataDir()}/config.json`);
  }
} else if (cmd === 'create-shortcut') {
  const port = Number(args.port || DEFAULT_DEBUG_PORT);
  const destDir = typeof args.dest === 'string' ? args.dest : '';
  const res = await createDebugShortcut({ port, destDir });
  console.log(`[prism] created debuggable shortcut -> ${res.shortcutPath} (port ${res.port})`);
} else {
  console.log(
    'Usage: node host/cli.mjs <status | enable-autostart [--port 9339] | disable-autostart | preset <crystal|islands|focus|eco> | restore | create-shortcut [--port 9339]>',
  );
  process.exit(2);
}
