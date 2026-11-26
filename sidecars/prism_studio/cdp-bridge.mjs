// Passive Chrome DevTools Protocol (CDP) bridge & host utilities for agy-wallpaper-prism.
// Zero writes to Antigravity's installation (never touches app.asar or ~/.gemini/config/config.json).

import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { request as httpRequest } from 'node:http';
import { homedir } from 'node:os';
import { basename, delimiter, dirname, join, resolve } from 'node:path';
import { resolveDefaultPrismDataDir, writeFsyncJsonSync } from '../../src/engine/store.mjs';
import {
  DEFAULT_DEBUG_PORT,
  PLUGIN_ID,
  PLUGIN_VERSION,
  PRISM_DOM,
  SIDECAR_URI,
} from '../../src/shared/schema.mjs';

export { resolveDefaultPrismDataDir };

const NATIVE_BINDING = '__agyPrismNativeSend';

// Ensure loopback CDP & media sockets bypass system HTTP_PROXY / Clash (e.g. 127.0.0.1:7890)
for (const key of ['NO_PROXY', 'no_proxy']) {
  const cur = String(process.env[key] || '').trim();
  const needed = ['127.0.0.1', 'localhost', '::1', '[::1]'];
  const parts = cur ? cur.split(',').map((s) => s.trim()).filter(Boolean) : [];
  for (const host of needed) {
    if (!parts.includes(host)) parts.push(host);
  }
  process.env[key] = parts.join(',');
}

const HOSTILE_ENV_KEYS = [
  'ELECTRON_RUN_AS_NODE',
  'ELECTRON_NO_ATTACH_CONSOLE',
  'NODE_OPTIONS',
  'NODE_PATH',
  'NODE_REPL_EXTERNAL_MODULE',
];

/** Strip Electron-as-Node variables before spawning GUI processes. */
export function cleanHostEnv(extra = {}) {
  const out = { ...process.env, ...extra };
  for (const k of HOSTILE_ENV_KEYS) delete out[k];
  return out;
}

/**
 * Resolve a real `node.exe` binary. Inside an Antigravity sidecar, `process.execPath`
 * is `Antigravity.exe` with `ELECTRON_RUN_AS_NODE=1`; spawning `process.execPath`
 * with a cleaned env would boot a second GUI window instead of running a script.
 */
let cachedNode = null;
export function resolveNodeExe() {
  if (cachedNode) return cachedNode;
  const self = process.execPath || '';
  if (process.env.AGY_NODE_EXE && existsSync(process.env.AGY_NODE_EXE)) {
    cachedNode = { exe: process.env.AGY_NODE_EXE, env: {} };
    return cachedNode;
  }
  if (/^node(\.exe)?$/i.test(basename(self)) && existsSync(self)) {
    cachedNode = { exe: self, env: {} };
    return cachedNode;
  }
  const candidates = [];
  for (const dir of String(process.env.PATH || process.env.Path || '').split(delimiter)) {
    if (dir) candidates.push(join(dir, process.platform === 'win32' ? 'node.exe' : 'node'));
  }
  if (process.platform === 'win32') {
    const local = process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local');
    candidates.push(join(local, 'Programs', 'nodejs', 'node.exe'));
    candidates.push('C:\\Program Files\\nodejs\\node.exe');
  }
  for (const c of candidates) {
    if (existsSync(c)) {
      cachedNode = { exe: c, env: {} };
      return cachedNode;
    }
  }
  cachedNode = { exe: self, env: { ELECTRON_RUN_AS_NODE: '1' } };
  return cachedNode;
}

/** Locate Antigravity executable on disk (read-only). */
export function resolveAntigravityExe() {
  if (process.env.AGY_EXE && existsSync(process.env.AGY_EXE)) return process.env.AGY_EXE;
  if (process.platform === 'win32') {
    const local = process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local');
    const candidates = [
      join(local, 'Programs', 'antigravity', 'Antigravity.exe'),
      join(local, 'Programs', 'Antigravity', 'Antigravity.exe'),
      join(local, 'Antigravity', 'Antigravity.exe'),
      'C:\\Program Files\\Antigravity\\Antigravity.exe',
    ];
    for (const c of candidates) if (existsSync(c)) return c;
  } else if (process.platform === 'darwin') {
    const mac = '/Applications/Antigravity.app/Contents/MacOS/Antigravity';
    if (existsSync(mac)) return mac;
  } else {
    for (const c of ['/opt/Antigravity/antigravity', '/usr/bin/antigravity']) {
      if (existsSync(c)) return c;
    }
  }
  return null;
}

/** Read Chromium's DevToolsActivePort file if present. */
export function readDevToolsActivePort(profileDir) {
  const roaming = process.env.APPDATA || join(homedir(), 'AppData', 'Roaming');
  const dir = profileDir || join(roaming, 'Antigravity');
  const file = join(dir, 'DevToolsActivePort');
  try {
    if (!existsSync(file)) return null;
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    const port = Number(lines[0]);
    if (!Number.isInteger(port) || port <= 0 || port > 65535) return null;
    return { port, browserPath: (lines[1] || '').trim(), file };
  } catch {
    return null;
  }
}

const hostConfigEnabledCache = new Map();
const MAX_HOST_CONFIG_CACHE = 16;

function statFileSig(filePath) {
  if (!filePath) return 'none';
  try {
    const st = statSync(filePath);
    return `${st.mtimeMs}:${st.size}:${st.ino || 0}`;
  } catch (err) {
    if (err && (err.code === 'ENOENT' || err.code === 'ENOTDIR')) return 'missing';
    if (err && (err.code === 'EACCES' || err.code === 'EPERM')) return 'eacces';
    return `err:${err?.code || 'unknown'}`;
  }
}

/** Strictly read-only, fail-closed check of ~/.gemini/config/config.json for plugin & sidecar enablement. */
export function isPluginEnabledInHostConfig(configPath, pluginRoot = '') {
  const mf = pluginRoot ? join(resolve(pluginRoot), 'plugin.json') : '';
  const fp =
    configPath ||
    join(
      process.env.ANTIGRAVITY_CONFIG_DIR ? resolve(process.env.ANTIGRAVITY_CONFIG_DIR) : join(homedir(), '.gemini', 'config'),
      'config.json',
    );
  const cacheKey = `${configPath ? '1' : '0'}|${fp}|${mf}`;
  const sig = `${statFileSig(fp)}|${statFileSig(mf)}`;
  const cached = hostConfigEnabledCache.get(cacheKey);
  if (cached && cached.sig === sig) {
    return cached.value;
  }

  const checkPluginManifest = () => {
    if (!mf) return true;
    try {
      if (!existsSync(mf)) return true;
      const parsed = JSON.parse(readFileSync(mf, 'utf8').replace(/^\uFEFF/, ''));
      return parsed?.disabled !== true;
    } catch {
      return false;
    }
  };

  let value;
  try {
    if (!existsSync(fp)) {
      value = checkPluginManifest();
    } else {
      const raw = JSON.parse(readFileSync(fp, 'utf8').replace(/^\uFEFF/, ''));
      if (raw?.plugins?.[PLUGIN_ID]?.enabled === false) value = false;
      else if (raw?.sidecars?.[`${PLUGIN_ID}/prism_studio`]?.enabled === false) value = false;
      else value = checkPluginManifest();
    }
  } catch (err) {
    // In sandboxed test harnesses without ~/.gemini/config read access, fall back to plugin.json;
    // on corrupt JSON or explicit configPath read failure, fail closed (false).
    if (!configPath && err && (err.code === 'EACCES' || err.code === 'EPERM')) {
      value = checkPluginManifest();
    } else {
      value = false;
    }
  }

  if (hostConfigEnabledCache.size >= MAX_HOST_CONFIG_CACHE && !hostConfigEnabledCache.has(cacheKey)) {
    const oldestKey = hostConfigEnabledCache.keys().next().value;
    if (oldestKey !== undefined) hostConfigEnabledCache.delete(oldestKey);
  }
  hostConfigEnabledCache.set(cacheKey, { sig, value });
  return value;
}

/** Create a user-facing shortcut launching Antigravity with --remote-debugging-port (zero host restart). */
export async function createDebugShortcut({ port = DEFAULT_DEBUG_PORT, destDir = '' } = {}) {
  const safePort = Number.isInteger(Number(port)) && Number(port) >= 1024 && Number(port) <= 65535 ? Number(port) : DEFAULT_DEBUG_PORT;
  const exe = resolveAntigravityExe() || 'Antigravity.exe';
  const targetFolder = destDir ? resolve(destDir) : join(homedir(), 'Desktop');
  mkdirSync(targetFolder, { recursive: true });

  if (process.platform === 'win32') {
    const lnkPath = join(targetFolder, 'Antigravity (Prism Glass).lnk');
    const workDir = existsSync(exe) ? dirname(exe) : targetFolder;
    const ps = [
      '$ws = New-Object -ComObject WScript.Shell;',
      `$s = $ws.CreateShortcut('${lnkPath.replace(/'/g, "''")}');`,
      `$s.TargetPath = '${exe.replace(/'/g, "''")}';`,
      `$s.Arguments = '--remote-debugging-port=${safePort}';`,
      `$s.WorkingDirectory = '${workDir.replace(/'/g, "''")}';`,
      "$s.Description = 'Launch Google Antigravity with CDP enabled for Wallpaper Prism whole-window glass';",
      '$s.Save();',
    ].join(' ');

    const ok = await new Promise((resolvePromise) => {
      const powershell = process.env.SystemRoot
        ? `${process.env.SystemRoot}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`
        : 'powershell.exe';
      execFile(
        powershell,
        ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', ps],
        { timeout: 8000, windowsHide: true },
        (err) => resolvePromise(!err && existsSync(lnkPath)),
      );
    });
    if (ok) return { ok: true, shortcutPath: lnkPath, port: safePort, exe };

    // Fallback launcher script when WScript.Shell COM is restricted (e.g. sandboxed CI)
    const cmdPath = join(targetFolder, 'Antigravity (Prism Glass).cmd');
    writeFileSync(
      cmdPath,
      `@echo off\r\nset ELECTRON_RUN_AS_NODE=\r\nstart "" "${exe}" --remote-debugging-port=${safePort}\r\n`,
      'utf8',
    );
    return { ok: true, shortcutPath: cmdPath, port: safePort, exe };
  }

  const shPath = join(targetFolder, 'antigravity-prism-glass.sh');
  writeFileSync(
    shPath,
    `#!/usr/bin/env sh\nunset ELECTRON_RUN_AS_NODE\nexec "${exe}" --remote-debugging-port=${safePort} "$@"\n`,
    { mode: 0o755 },
  );
  return { ok: true, shortcutPath: shPath, port: safePort, exe };
}

// ------------------------------------------------ Normal Shortcut In-Place Auto-Load

/** Pure helper: append or update `--remote-debugging-port=<port>` idempotently without duplicating flags. */
export function patchDebugArg(argsStr = '', port = DEFAULT_DEBUG_PORT) {
  const safePort = Number.isInteger(Number(port)) && Number(port) >= 1024 && Number(port) <= 65535 ? Number(port) : DEFAULT_DEBUG_PORT;
  const flag = `--remote-debugging-port=${safePort}`;
  const raw = String(argsStr || '').trim();
  if (!raw) return flag;
  if (/--remote-debugging-port(?:=\d+|\s+\d+)?/i.test(raw)) {
    return raw.replace(/--remote-debugging-port(?:=\d+|\s+\d+)?/gi, flag).replace(/\s{2,}/g, ' ').trim();
  }
  return `${raw} ${flag}`;
}

/** Pure helper: strip `--remote-debugging-port` back to clean stock arguments. */
export function stripDebugArg(argsStr = '') {
  return String(argsStr || '')
    .replace(/(?:^|\s+)--remote-debugging-port(?:=\d+|\s+\d+)?/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function defaultShortcutSearchRoots() {
  if (process.platform !== 'win32') return [];
  const home = homedir();
  const roaming = process.env.APPDATA || join(home, 'AppData', 'Roaming');
  const pub = process.env.PUBLIC || 'C:\\Users\\Public';
  return [
    { dir: join(home, 'Desktop'), location: 'desktop', maxDepth: 1, writable: true },
    { dir: join(roaming, 'Microsoft', 'Windows', 'Start Menu', 'Programs'), location: 'start-menu', maxDepth: 3, writable: true },
    {
      dir: join(roaming, 'Microsoft', 'Internet Explorer', 'Quick Launch', 'User Pinned', 'TaskBar'),
      location: 'taskbar',
      maxDepth: 1,
      writable: true,
    },
    { dir: join(pub, 'Desktop'), location: 'public-desktop', maxDepth: 1, writable: false },
  ];
}

function collectLnkCandidates(roots) {
  const seen = new Set();
  const out = [];

  const walk = (dir, location, writable, depth, maxDepth) => {
    let entries;
    try {
      if (!existsSync(dir)) return;
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const full = join(dir, ent.name);
      if (ent.isDirectory()) {
        if (depth < maxDepth) walk(full, location, writable, depth + 1, maxDepth);
      } else if (ent.isFile() && /\.lnk$/i.test(ent.name)) {
        // In deep Start Menu trees only inspect plausible shortcuts; in Desktop/TaskBar/custom inspect all .lnk files
        if (location === 'start-menu' && !/antigravity|反重力/i.test(ent.name)) continue;
        const key = full.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ path: full, name: ent.name, location, writable });
      }
    }
  };

  for (const r of roots) {
    walk(r.dir, r.location, r.writable !== false, 1, r.maxDepth || 2);
  }
  return out;
}

function runPowerShellEncoded(psScript, timeoutMs = 8000) {
  const powershell = process.env.SystemRoot
    ? `${process.env.SystemRoot}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`
    : 'powershell.exe';
  const wrapped = `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; $ErrorActionPreference = 'Stop'; ${psScript}`;
  const encoded = Buffer.from(wrapped, 'utf16le').toString('base64');
  return new Promise((resolvePromise, reject) => {
    execFile(
      powershell,
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded],
      { timeout: timeoutMs, windowsHide: true, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          reject(new Error(stderr ? String(stderr).trim() : err.message));
          return;
        }
        resolvePromise(String(stdout || '').trim());
      },
    );
  });
}

function readNullTerminatedAnsi(buf, start) {
  let end = start;
  while (end < buf.length && buf[end] !== 0) end += 1;
  return buf.subarray(start, end).toString('utf8');
}

function readNullTerminatedUtf16(buf, start) {
  let end = start;
  while (end + 1 < buf.length && (buf[end] !== 0 || buf[end + 1] !== 0)) end += 2;
  return buf.subarray(start, end).toString('utf16le');
}

/**
 * Pure-Node [MS-SHLLINK] binary `.lnk` parser (< 0.1 ms, ZERO child process spawns!).
 * Extracts `targetPath`, `arguments`, and `workingDirectory` directly from `.lnk` bytes.
 */
export function parseWindowsLnkBuffer(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 76) return null;
  if (buf.readUInt32LE(0) !== 0x0000004c) return null;
  const linkFlags = buf.readUInt32LE(20);
  const isUnicode = (linkFlags & 0x00000080) !== 0;
  let offset = 76;

  // 1. LinkTargetIDList (HasLinkTargetIDList = 0x01)
  if (linkFlags & 0x01) {
    if (offset + 2 > buf.length) return null;
    const idListSize = buf.readUInt16LE(offset);
    offset += 2 + idListSize;
  }

  let targetPath = '';

  // 2. LinkInfo (HasLinkInfo = 0x02)
  if (linkFlags & 0x02) {
    if (offset + 12 > buf.length) return null;
    const infoStart = offset;
    const infoSize = buf.readUInt32LE(infoStart);
    if (infoSize < 12 || infoStart + infoSize > buf.length) return null;
    const infoHeaderSize = buf.readUInt32LE(infoStart + 4);
    const infoFlags = buf.readUInt32LE(infoStart + 8);
    if (infoFlags & 0x01) {
      if (infoHeaderSize >= 0x24 && infoStart + 0x20 <= buf.length) {
        const uniOff = buf.readUInt32LE(infoStart + 0x1c);
        if (uniOff > 0 && infoStart + uniOff < infoStart + infoSize) {
          targetPath = readNullTerminatedUtf16(buf, infoStart + uniOff);
        }
      }
      if (!targetPath && infoStart + 20 <= buf.length) {
        const baseOff = buf.readUInt32LE(infoStart + 16);
        if (baseOff > 0 && infoStart + baseOff < infoStart + infoSize) {
          targetPath = readNullTerminatedAnsi(buf, infoStart + baseOff);
        }
      }
    }
    offset = infoStart + infoSize;
  }

  // 3. StringData sections in [MS-SHLLINK] order
  const readCountedString = () => {
    if (offset + 2 > buf.length) return '';
    const count = buf.readUInt16LE(offset);
    offset += 2;
    if (isUnicode) {
      const bytes = count * 2;
      const val = buf.subarray(offset, Math.min(buf.length, offset + bytes)).toString('utf16le');
      offset += bytes;
      return val;
    }
    const val = buf.subarray(offset, Math.min(buf.length, offset + count)).toString('utf8');
    offset += count;
    return val;
  };

  if (linkFlags & 0x04) readCountedString(); // NAME_STRING
  const relativePath = linkFlags & 0x08 ? readCountedString() : '';
  const workingDirectory = linkFlags & 0x10 ? readCountedString() : '';
  const args = linkFlags & 0x20 ? readCountedString() : '';
  if (linkFlags & 0x40) readCountedString(); // ICON_LOCATION

  // 4. ExtraData EnvironmentVariableDataBlock fallback (sig 0xA0000001) when TargetPath is env-expanded
  if (!targetPath) {
    while (offset + 8 <= buf.length) {
      const blockSize = buf.readUInt32LE(offset);
      if (blockSize < 4 || offset + blockSize > buf.length) break;
      const sig = buf.readUInt32LE(offset + 4);
      if (sig === 0xa0000001 && blockSize >= 788) {
        targetPath = readNullTerminatedUtf16(buf, offset + 268) || readNullTerminatedAnsi(buf, offset + 8);
        break;
      }
      offset += blockSize;
    }
  }
  if (!targetPath && relativePath) targetPath = relativePath;

  return {
    targetPath: targetPath.trim(),
    arguments: args.trim(),
    workingDirectory: workingDirectory.trim(),
  };
}

function readWindowsLnkMetadataSync(candidates = []) {
  if (process.platform !== 'win32' || candidates.length === 0) return [];
  const out = [];
  for (const c of candidates) {
    try {
      const buf = readFileSync(c.path);
      const parsed = parseWindowsLnkBuffer(buf);
      if (parsed) out.push({ path: c.path, ...parsed });
    } catch {
      /* unreadable shortcut */
    }
  }
  return out;
}

async function writeWindowsLnkUpdates(updates = []) {
  if (process.platform !== 'win32' || updates.length === 0) return [];
  const payloadB64 = Buffer.from(JSON.stringify(updates), 'utf8').toString('base64');
  const ps = `
    $items = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${payloadB64}')) | ConvertFrom-Json;
    $ws = New-Object -ComObject WScript.Shell;
    $results = foreach ($it in $items) {
      try {
        $s = $ws.CreateShortcut([string]$it.path);
        if ($it.targetPath) { $s.TargetPath = [string]$it.targetPath; }
        if ($it.workingDirectory) { $s.WorkingDirectory = [string]$it.workingDirectory; }
        $s.Arguments = [string]$it.arguments;
        $s.Save();
        [pscustomobject]@{ path = [string]$it.path; ok = $true; error = '' }
      } catch {
        [pscustomobject]@{ path = [string]$it.path; ok = $false; error = $_.Exception.Message }
      }
    };
    ConvertTo-Json -InputObject @($results) -Compress
  `;
  const out = await runPowerShellEncoded(ps);
  if (!out) return [];
  const parsed = JSON.parse(out);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function readShortcutBackup(backupPath) {
  try {
    if (!existsSync(backupPath)) return { version: 1, entries: {} };
    const parsed = JSON.parse(readFileSync(backupPath, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || typeof parsed.entries !== 'object') {
      return { version: 1, entries: {} };
    }
    return { version: 1, entries: { ...parsed.entries } };
  } catch {
    return { version: 1, entries: {} };
  }
}

function writeShortcutBackup(backupPath, backupObj) {
  mkdirSync(dirname(backupPath), { recursive: true });
  const payload = `${JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), entries: backupObj.entries || {} }, null, 2)}\n`;
  const tmp = `${backupPath}.tmp.${process.pid}`;
  writeFileSync(tmp, payload, 'utf8');
  writeFileSync(backupPath, payload, 'utf8');
  try {
    rmSync(tmp, { force: true });
  } catch {
    /* ignore */
  }
}

/**
 * Inspect all standard Antigravity shortcuts (Desktop, Start Menu, TaskBar Pinned, or custom `searchDirs`).
 * Zero child-process spawns: validates `autostart-cache.json` via `fs.statSync(lnk)` (`<0.2ms`)
 * and parses `.lnk` binaries directly in pure Node.js (`parseWindowsLnkBuffer`).
 */
export async function inspectNormalShortcuts({ searchDirs = null, dataDir = '', port = DEFAULT_DEBUG_PORT } = {}) {
  const resolvedDataDir = resolveDefaultPrismDataDir(dataDir);
  const backupPath = join(resolvedDataDir, 'shortcut-backup.json');
  const cachePath = join(resolvedDataDir, 'autostart-cache.json');
  const safePort = Number.isInteger(Number(port)) && Number(port) >= 1024 && Number(port) <= 65535 ? Number(port) : DEFAULT_DEBUG_PORT;

  const isCustomSearch = Array.isArray(searchDirs);
  const roots = isCustomSearch
    ? searchDirs.map((d) => ({ dir: resolve(d), location: 'custom', maxDepth: 2, writable: true }))
    : defaultShortcutSearchRoots();

  const candidates = collectLnkCandidates(roots);
  let backupMtime = 0;
  try {
    if (existsSync(backupPath)) backupMtime = statSync(backupPath).mtimeMs;
  } catch {
    backupMtime = 0;
  }

  const sigParts = [`port:${safePort}`, `bk:${Math.round(backupMtime)}`];
  for (const c of candidates) {
    try {
      const st = statSync(c.path);
      sigParts.push(`${c.path.toLowerCase()}:${Math.round(st.mtimeMs)}:${st.size}`);
    } catch {
      sigParts.push(`${c.path.toLowerCase()}:missing`);
    }
  }
  const signature = sigParts.join('|');

  if (!isCustomSearch) {
    try {
      if (existsSync(cachePath)) {
        const cached = JSON.parse(readFileSync(cachePath, 'utf8'));
        if (cached && cached.signature === signature && cached.result) {
          return cached.result;
        }
      }
    } catch {
      /* rebuild cache */
    }
  }

  const backup = readShortcutBackup(backupPath);
  const metaList = readWindowsLnkMetadataSync(candidates);
  const metaByPath = new Map(metaList.map((m) => [String(m.path).toLowerCase(), m]));

  const shortcuts = [];
  for (const c of candidates) {
    const meta = metaByPath.get(c.path.toLowerCase());
    if (!meta) continue;
    const target = String(meta.targetPath || '');
    const isAgyTarget = /antigravity\.exe$/i.test(target) || (/antigravity|反重力/i.test(c.name) && Boolean(target));
    if (!isAgyTarget) continue;
    const isSeparatePrismLnk = /antigravity\s*\(prism\s*glass\)\.lnk$/i.test(c.name);
    const args = String(meta.arguments || '');
    const portMatch = /--remote-debugging-port(?:=(\d+)|\s+(\d+))/i.exec(args);
    const debugPort = portMatch ? Number(portMatch[1] || portMatch[2]) : null;
    const hasDebugPort = Boolean(portMatch);
    const key = c.path.toLowerCase();

    shortcuts.push({
      path: c.path,
      name: c.name,
      location: c.location,
      writable: c.writable,
      isNormalShortcut: !isSeparatePrismLnk,
      targetPath: target,
      arguments: args,
      hasDebugPort,
      debugPort,
      backedUp: Boolean(backup.entries[key]),
    });
  }

  const normalList = shortcuts.filter((s) => s.isNormalShortcut);
  const evalList = normalList.length > 0 ? normalList : shortcuts;
  const writableList = evalList.filter((s) => s.writable !== false);
  const patchedShortcuts = evalList.filter((s) => s.hasDebugPort).map((s) => s.path);
  const normalShortcutEnabled =
    writableList.length > 0
      ? writableList.every((s) => s.hasDebugPort)
      : patchedShortcuts.length > 0;

  const result = {
    supported: process.platform === 'win32',
    normalShortcutEnabled,
    anyShortcutEnabled: patchedShortcuts.length > 0,
    port: safePort,
    sidecarAutoStartsOnBoot: true,
    autoRestoreLastSettings: true,
    backupPath,
    configPath: join(resolvedDataDir, 'config.json'),
    shortcuts,
    patchedShortcuts,
  };

  if (!isCustomSearch) {
    try {
      mkdirSync(resolvedDataDir, { recursive: true });
      writeFileSync(cachePath, `${JSON.stringify({ signature, updatedAt: Date.now(), result }, null, 2)}\n`, 'utf8');
    } catch {
      /* non-fatal */
    }
  }

  return result;
}

/**
 * Enable in-place `--remote-debugging-port=<port>` on all standard Antigravity.lnk shortcuts,
 * backing up original arguments losslessly into `shortcut-backup.json` (zero interruption to running host).
 */
export async function enableNormalShortcutAutoLoad({
  port = DEFAULT_DEBUG_PORT,
  searchDirs = null,
  dataDir = '',
} = {}) {
  const resolvedDataDir = resolveDefaultPrismDataDir(dataDir);
  const backupPath = join(resolvedDataDir, 'shortcut-backup.json');
  const safePort = Number.isInteger(Number(port)) && Number(port) >= 1024 && Number(port) <= 65535 ? Number(port) : DEFAULT_DEBUG_PORT;
  const before = await inspectNormalShortcuts({ searchDirs, dataDir: resolvedDataDir, port: safePort });
  const backup = readShortcutBackup(backupPath);

  const updates = [];
  let alreadyPatchedCount = 0;

  const targets = before.shortcuts.filter((s) => s.isNormalShortcut);
  if (targets.length === 0 && process.platform === 'win32') {
    // Fallback if no stock Antigravity.lnk exists yet: create normal Antigravity.lnk in first searchDir or Desktop
    const exe = resolveAntigravityExe();
    if (exe) {
      const folder = Array.isArray(searchDirs) && searchDirs[0] ? resolve(searchDirs[0]) : join(homedir(), 'Desktop');
      mkdirSync(folder, { recursive: true });
      const newLnk = join(folder, 'Antigravity.lnk');
      const key = newLnk.toLowerCase();
      if (!backup.entries[key]) {
        backup.entries[key] = {
          path: newLnk,
          originalArguments: '',
          targetPath: exe,
          createdByPrism: true,
          backedUpAt: new Date().toISOString(),
        };
      }
      updates.push({
        path: newLnk,
        targetPath: exe,
        workingDirectory: dirname(exe),
        arguments: patchDebugArg('', safePort),
      });
    }
  } else {
    for (const s of targets) {
      if (!s.writable) continue;
      const key = s.path.toLowerCase();
      if (!backup.entries[key]) {
        backup.entries[key] = {
          path: s.path,
          originalArguments: s.hasDebugPort ? stripDebugArg(s.arguments) : s.arguments,
          targetPath: s.targetPath,
          backedUpAt: new Date().toISOString(),
        };
      }
      const nextArgs = patchDebugArg(s.arguments, safePort);
      if (nextArgs === s.arguments) {
        alreadyPatchedCount += 1;
      } else {
        updates.push({ path: s.path, arguments: nextArgs });
      }
    }
  }

  writeShortcutBackup(backupPath, backup);
  const writeResults = updates.length > 0 ? await writeWindowsLnkUpdates(updates) : [];
  const errors = writeResults.filter((r) => !r.ok).map((r) => `${r.path}: ${r.error}`);
  const updatedCount = writeResults.filter((r) => r.ok).length;
  const after = await inspectNormalShortcuts({ searchDirs, dataDir: resolvedDataDir, port: safePort });

  return {
    ok: errors.length === 0 || after.normalShortcutEnabled,
    action: 'enabled',
    updatedCount,
    alreadyPatchedCount,
    errors,
    ...after,
  };
}

/**
 * Losslessly restore stock arguments on all patched Antigravity.lnk shortcuts from `shortcut-backup.json`.
 */
export async function disableNormalShortcutAutoLoad({ searchDirs = null, dataDir = '' } = {}) {
  const resolvedDataDir = resolveDefaultPrismDataDir(dataDir);
  const backupPath = join(resolvedDataDir, 'shortcut-backup.json');
  const before = await inspectNormalShortcuts({ searchDirs, dataDir: resolvedDataDir });
  const backup = readShortcutBackup(backupPath);

  const updates = [];
  const candidateMap = new Map(before.shortcuts.map((s) => [s.path.toLowerCase(), s]));

  // Include any backed-up paths that might also exist
  for (const [key, entry] of Object.entries(backup.entries)) {
    if (!candidateMap.has(key) && entry?.path && existsSync(entry.path)) {
      candidateMap.set(key, {
        path: entry.path,
        writable: true,
        hasDebugPort: true,
        arguments: '',
      });
    }
  }

  const deletedCreatedFiles = [];
  for (const [key, s] of candidateMap.entries()) {
    if (s.writable === false) continue;
    const bEntry = backup.entries[key];
    if (bEntry?.createdByPrism && existsSync(s.path)) {
      try {
        rmSync(s.path, { force: true });
        deletedCreatedFiles.push(s.path);
        delete backup.entries[key];
        continue;
      } catch {
        /* fall through to argument strip */
      }
    }
    const restoredArgs = bEntry && typeof bEntry.originalArguments === 'string'
      ? bEntry.originalArguments
      : stripDebugArg(s.arguments);
    if (s.hasDebugPort || (bEntry && restoredArgs !== s.arguments)) {
      updates.push({ path: s.path, arguments: restoredArgs });
    }
  }

  const writeResults = updates.length > 0 ? await writeWindowsLnkUpdates(updates) : [];
  const errors = [];
  let restoredCount = deletedCreatedFiles.length;
  for (const r of writeResults) {
    if (r.ok) {
      restoredCount += 1;
      delete backup.entries[String(r.path).toLowerCase()];
    } else {
      errors.push(`${r.path}: ${r.error}`);
    }
  }

  writeShortcutBackup(backupPath, backup);
  const after = await inspectNormalShortcuts({ searchDirs, dataDir: resolvedDataDir });

  return {
    ok: errors.length === 0,
    action: 'disabled',
    restoredCount,
    errors,
    ...after,
  };
}

// ------------------------------------------------------------------ CDP client

function httpGetJson(host, port, pathname, timeoutMs = 1500) {
  return new Promise((resolvePromise, reject) => {
    const req = httpRequest({ host, port, path: pathname, method: 'GET', timeout: timeoutMs }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        try {
          resolvePromise(JSON.parse(text));
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('timeout', () => req.destroy(new Error('CDP timeout')));
    req.on('error', reject);
    req.end();
  });
}

export async function probeCdpPort(port, host = '', timeoutMs = 900) {
  const hosts = host ? [host] : ['127.0.0.1', '::1'];
  let lastErr = 'unreachable';
  for (const h of hosts) {
    try {
      const v = await httpGetJson(h, port, '/json/version', timeoutMs);
      return { ok: true, host: h, port, browser: v.Browser || '', webSocketDebuggerUrl: v.webSocketDebuggerUrl || '' };
    } catch (err) {
      lastErr = err.message;
    }
  }
  return { ok: false, host: hosts[0], port, error: lastErr };
}

export async function listCdpTargets(port, host = '127.0.0.1') {
  try {
    const list = await httpGetJson(host, port, '/json/list', 1800);
    return Array.isArray(list) ? list : [];
  } catch {
    const alt = host === '127.0.0.1' ? '::1' : '127.0.0.1';
    const list = await httpGetJson(alt, port, '/json/list', 1800);
    return Array.isArray(list) ? list : [];
  }
}

/** Score and filter Antigravity Hub / Workbench top-level page targets (excludes sidecar OOPIFs & splashes). */
export function selectHubTargets(targets = []) {
  const pages = targets.filter((t) => t && t.type === 'page' && typeof t.webSocketDebuggerUrl === 'string');
  const scored = pages
    .map((t) => {
      const url = String(t.url || '');
      const title = String(t.title || '');
      if (/^plugin:\/\//i.test(url) || /^devtools:\/\//i.test(url) || /^data:/i.test(url) || /^about:blank/i.test(url)) {
        return { t, score: -200 };
      }
      let score = 0;
      if (/^https:\/\/127\.0\.0\.1:\d+\//i.test(url)) score += 160;
      else if (/^http:\/\/127\.0\.0\.1:\d+\//i.test(url) && !url.includes('/prism_studio')) score += 40;
      if (/monaco-workbench|workbench\.html/i.test(url)) score += 120;
      if (/^vscode-file:\/\//i.test(url)) score += 40;
      const trimmedTitle = title.trim();
      if (/antigravity|反重力/i.test(title)) score += 50;
      if (
        /(?:^|\b)(?:curtain|splash)(?:\b|$)/i.test(trimmedTitle) ||
        /^(?:loading\b|restarting|reconnecting|disconnected|welcome to antigravity)/i.test(trimmedTitle) ||
        /^(?:正在加载|启动中|正在配置|正在重启|正在重新连接|已断开|欢迎使用\s*(?:antigravity|反重力))/i.test(trimmedTitle)
      ) {
        score -= 100;
      }
      return { t, score };
    })
    .sort((a, b) => b.score - a.score);

  const high = scored.filter((x) => x.score >= 100).map((x) => x.t);
  if (high.length > 0) return high;
  return scored[0] && scored[0].score > 0 ? [scored[0].t] : [];
}

function encodeWsClientTextFrame(text) {
  const payload = Buffer.from(String(text), 'utf8');
  const len = payload.length;
  const mask = randomBytes(4);
  let header;
  if (len < 126) {
    header = Buffer.alloc(6);
    header[0] = 0x81;
    header[1] = 0x80 | len;
    mask.copy(header, 2);
  } else if (len < 65536) {
    header = Buffer.alloc(8);
    header[0] = 0x81;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(len, 2);
    mask.copy(header, 4);
  } else {
    header = Buffer.alloc(14);
    header[0] = 0x81;
    header[1] = 0x80 | 127;
    header.writeBigUInt64BE(BigInt(len), 2);
    mask.copy(header, 10);
  }
  const masked = Buffer.allocUnsafe(len);
  for (let i = 0; i < len; i += 1) {
    masked[i] = payload[i] ^ mask[i & 3];
  }
  return Buffer.concat([header, masked]);
}

function encodeWsClientCloseFrame() {
  const mask = randomBytes(4);
  return Buffer.from([0x88, 0x80, mask[0], mask[1], mask[2], mask[3]]);
}

/**
 * Lightweight raw RFC-6455 loopback WebSocket session (omits `Origin` header for clean
 * Chromium DevTools loopback etiquette and supports ephemeral 1-shot `Runtime.evaluate`).
 */
export class CdpSession {
  constructor(socket, initialHead = Buffer.alloc(0)) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.handlers = new Map();
    this.closeHandlers = [];
    this.closed = false;
    this._rxBuf = initialHead.length > 0 ? Buffer.from(initialHead) : Buffer.alloc(0);
    this._fragChunks = [];

    socket.on('data', (chunk) => {
      this._rxBuf = this._rxBuf.length === 0 ? chunk : Buffer.concat([this._rxBuf, chunk]);
      this._drainFrames();
    });

    const handleSocketDone = () => {
      if (this.closed) return;
      this.closed = true;
      for (const { reject } of this.pending.values()) {
        reject(new Error('CDP socket closed'));
      }
      this.pending.clear();
      for (const fn of this.closeHandlers.splice(0)) {
        try { fn(); } catch { /* ignore */ }
      }
    };

    socket.on('close', handleSocketDone);
    socket.on('end', handleSocketDone);
    socket.on('error', () => {});
  }

  _drainFrames() {
    while (this._rxBuf.length >= 2) {
      const b0 = this._rxBuf[0];
      const b1 = this._rxBuf[1];
      const fin = (b0 & 0x80) !== 0;
      const opcode = b0 & 0x0f;
      const isMasked = (b1 & 0x80) !== 0;
      let payloadLen = b1 & 0x7f;
      let offset = 2;

      if (payloadLen === 126) {
        if (this._rxBuf.length < 4) return;
        payloadLen = this._rxBuf.readUInt16BE(2);
        offset = 4;
      } else if (payloadLen === 127) {
        if (this._rxBuf.length < 10) return;
        payloadLen = Number(this._rxBuf.readBigUInt64BE(2));
        offset = 10;
      }

      const maskLen = isMasked ? 4 : 0;
      if (this._rxBuf.length < offset + maskLen + payloadLen) return;

      let body = this._rxBuf.subarray(offset + maskLen, offset + maskLen + payloadLen);
      if (isMasked) {
        const mask = this._rxBuf.subarray(offset, offset + 4);
        const unmasked = Buffer.allocUnsafe(payloadLen);
        for (let i = 0; i < payloadLen; i += 1) unmasked[i] = body[i] ^ mask[i & 3];
        body = unmasked;
      }
      this._rxBuf = this._rxBuf.subarray(offset + maskLen + payloadLen);

      if (opcode === 0x08) {
        this.close();
        return;
      }
      if (opcode === 0x09) {
        // Ping -> Pong
        const pongMask = randomBytes(4);
        const pong = Buffer.alloc(6 + body.length);
        pong[0] = 0x8a;
        pong[1] = 0x80 | Math.min(125, body.length);
        pongMask.copy(pong, 2);
        for (let i = 0; i < Math.min(125, body.length); i += 1) pong[6 + i] = body[i] ^ pongMask[i & 3];
        try { this.socket.write(pong); } catch { /* ignore */ }
        continue;
      }
      if (opcode === 0x0a) continue;

      if (opcode === 0x01 || opcode === 0x00) {
        this._fragChunks.push(Buffer.from(body));
        if (!fin) continue;
        const fullText = Buffer.concat(this._fragChunks).toString('utf8');
        this._fragChunks = [];
        this._dispatchMessage(fullText);
      }
    }
  }

  _dispatchMessage(rawText) {
    let msg;
    try {
      msg = JSON.parse(rawText);
    } catch {
      return;
    }
    if (msg.id != null && this.pending.has(msg.id)) {
      const entry = this.pending.get(msg.id);
      this.pending.delete(msg.id);
      if (msg.error) entry.reject(new Error(msg.error.message || 'CDP error'));
      else entry.resolve(msg.result);
      return;
    }
    if (msg.method) {
      for (const fn of this.handlers.get(msg.method) || []) {
        try { fn(msg.params || {}); } catch { /* isolate */ }
      }
    }
  }

  static async connect(wsUrl, timeoutMs = 3500) {
    const u = new URL(wsUrl);
    const port = Number(u.port || 80);
    const host = u.hostname || '127.0.0.1';
    const pathAndQuery = `${u.pathname || '/'}${u.search || ''}`;
    const wsKey = randomBytes(16).toString('base64');

    return new Promise((resolvePromise, reject) => {
      let settled = false;
      const req = httpRequest({
        host,
        port,
        path: pathAndQuery,
        method: 'GET',
        headers: {
          Connection: 'Upgrade',
          Upgrade: 'websocket',
          'Sec-WebSocket-Version': '13',
          'Sec-WebSocket-Key': wsKey,
        },
        timeout: timeoutMs,
      });

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        try { req.destroy(); } catch { /* ignore */ }
        reject(new Error(`CDP WebSocket timeout: ${wsUrl}`));
      }, timeoutMs);

      req.on('upgrade', (_res, socket, head) => {
        if (settled) {
          try { socket.destroy(); } catch { /* ignore */ }
          return;
        }
        settled = true;
        clearTimeout(timer);
        socket.setNoDelay?.(true);
        resolvePromise(new CdpSession(socket, head));
      });

      req.on('response', (res) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        res.resume();
        reject(new Error(`CDP upgrade rejected (${res.statusCode}): ${wsUrl}`));
      });

      req.on('error', (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(err);
      });

      req.end();
    });
  }

  send(method, params = {}, timeoutMs = 4500) {
    if (this.closed) return Promise.reject(new Error('CDP session closed'));
    const id = this.nextId++;
    return new Promise((resolvePromise, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP ${method} timed out`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (v) => {
          clearTimeout(timer);
          resolvePromise(v);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      });
      try {
        this.socket.write(encodeWsClientTextFrame(JSON.stringify({ id, method, params })));
      } catch (err) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(err);
      }
    });
  }

  on(method, fn) {
    if (!this.handlers.has(method)) this.handlers.set(method, []);
    this.handlers.get(method).push(fn);
  }

  onClose(fn) {
    if (this.closed) queueMicrotask(fn);
    else this.closeHandlers.push(fn);
  }

  async evaluate(expression, { returnByValue = true, awaitPromise = false, timeoutMs = 4000 } = {}) {
    const res = await this.send(
      'Runtime.evaluate',
      {
        expression,
        returnByValue,
        awaitPromise,
        userGesture: true,
      },
      timeoutMs,
    );
    if (res?.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text || 'Evaluate failed');
    }
    return returnByValue ? res?.result?.value : res?.result;
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    try {
      this.socket.write(encodeWsClientCloseFrame());
    } catch {
      /* ignore */
    }
    try {
      this.socket.end();
      setTimeout(() => {
        try { this.socket.destroy(); } catch { /* ignore */ }
      }, 40).unref?.();
    } catch {
      /* ignore */
    }
  }
}

/**
 * Ephemeral 1-shot `Runtime.evaluate` helper: connects raw loopback WS, evaluates in main-frame
 * default context with zero inspector domain enablement, and always closes in `finally`.
 */
export async function evaluateTargetEphemeral(wsUrl, expression, opts = {}) {
  const session = await CdpSession.connect(wsUrl, opts.connectTimeoutMs || 2800);
  try {
    return await session.evaluate(expression, opts);
  } finally {
    session.close();
  }
}

// --------------------------------------------------------- Canary & Install Co-Keying

export function readInstallStamp(pluginRoot = '') {
  if (!pluginRoot) return '';
  try {
    const absRoot = resolve(pluginRoot);
    const stampFile = join(absRoot, '.prism-install-id');
    if (existsSync(stampFile)) {
      return readFileSync(stampFile, 'utf8').trim().slice(0, 120);
    }
    if (existsSync(absRoot)) {
      const st = statSync(absRoot);
      return `dir-${Math.round(st.birthtimeMs || st.ctimeMs || 0)}`;
    }
  } catch {
    /* ignore */
  }
  return '';
}

const CANARY_WINDOW_MS = 90_000;

export function createCanaryController({
  dataDir = '',
  pluginRoot = '',
  onTripSafeMode = async () => {},
} = {}) {
  const resolvedDir = resolveDefaultPrismDataDir(dataDir);
  const canaryPath = join(resolvedDir, 'canary.json');
  const currentInstallId = readInstallStamp(pluginRoot);

  const defaultCanary = () => ({
    version: 2,
    state: 'idle',
    browserSessionId: '',
    windowTargetId: '',
    sidecarPid: process.pid,
    boundInstallId: currentInstallId || '',
    lastArmTs: 0,
    lastHealthyTs: 0,
    trippedAt: 0,
    trippedReason: null,
    unfinishedAttempts: [],
  });

  let lastDiskSig = '';
  let stateObj = null;

  const statCanarySig = () => {
    try {
      const st = statSync(canaryPath);
      return `${st.mtimeMs}:${st.size}:${st.ino || 0}`;
    } catch (err) {
      if (err && (err.code === 'ENOENT' || err.code === 'ENOTDIR')) return 'missing';
      return `err:${err?.code || 'unknown'}`;
    }
  };

  const cloneCanary = (obj) => ({
    ...obj,
    unfinishedAttempts: Array.isArray(obj?.unfinishedAttempts) ? [...obj.unfinishedAttempts] : [],
  });

  const readDisk = () => {
    const sig = statCanarySig();
    if (stateObj && sig === lastDiskSig) {
      return cloneCanary(stateObj);
    }
    if (sig === 'missing') {
      stateObj = defaultCanary();
      lastDiskSig = 'missing';
      return cloneCanary(stateObj);
    }
    try {
      const raw = JSON.parse(readFileSync(canaryPath, 'utf8').replace(/^\uFEFF/, ''));
      if (!raw || typeof raw !== 'object') {
        stateObj = defaultCanary();
        lastDiskSig = sig;
        return cloneCanary(stateObj);
      }
      stateObj = {
        version: 2,
        state: ['idle', 'arming', 'healthy', 'tripped'].includes(raw.state) ? raw.state : 'idle',
        browserSessionId: String(raw.browserSessionId || ''),
        windowTargetId: String(raw.windowTargetId || ''),
        sidecarPid: Number(raw.sidecarPid) || 0,
        boundInstallId: String(raw.boundInstallId || ''),
        lastArmTs: Number(raw.lastArmTs) || 0,
        lastHealthyTs: Number(raw.lastHealthyTs) || 0,
        trippedAt: Number(raw.trippedAt) || 0,
        trippedReason: raw.trippedReason ? String(raw.trippedReason) : null,
        unfinishedAttempts: Array.isArray(raw.unfinishedAttempts)
          ? raw.unfinishedAttempts.map(Number).filter((n) => Number.isFinite(n) && n > 0)
          : [],
      };
      lastDiskSig = sig;
      return cloneCanary(stateObj);
    } catch {
      const fb = defaultCanary();
      stateObj = fb;
      lastDiskSig = '';
      return cloneCanary(fb);
    }
  };

  stateObj = readDisk();

  const persistFsync = (next) => {
    stateObj = cloneCanary(next);
    writeFsyncJsonSync(canaryPath, stateObj);
    lastDiskSig = statCanarySig();
    return cloneCanary(stateObj);
  };

  const evaluateBoot = async (browserSessionId = '') => {
    stateObj = readDisk();
    const now = Date.now();
    const recentUnfinished = stateObj.unfinishedAttempts.filter((ts) => now - ts <= CANARY_WINDOW_MS);

    // 1. Fresh reinstall co-key detection: if plugin folder was deleted & reinstalled with a new stamp,
    // reset skinEnabled to false cleanly so ghost external state never re-injects uninvited.
    if (
      currentInstallId &&
      stateObj.boundInstallId &&
      stateObj.boundInstallId !== currentInstallId
    ) {
      const resetState = persistFsync({
        ...defaultCanary(),
        boundInstallId: currentInstallId,
      });
      await onTripSafeMode('plugin_reinstalled_fresh');
      return resetState;
    }

    if (stateObj.state === 'tripped') {
      await onTripSafeMode(stateObj.trippedReason || 'already_tripped');
      return { ...stateObj };
    }

    // 2. Unfinished `arming` left by a different browserSessionId or dead prior sidecar PID -> Trip Safe Mode!
    const fromPriorSession =
      stateObj.state === 'arming' &&
      ((browserSessionId && stateObj.browserSessionId && stateObj.browserSessionId !== browserSessionId) ||
        (!browserSessionId && stateObj.sidecarPid !== process.pid && (stateObj.browserSessionId || stateObj.sidecarPid > 0)));

    if (fromPriorSession) {
      const updatedAttempts = [...recentUnfinished, stateObj.lastArmTs || now];
      const tripped = persistFsync({
        ...stateObj,
        state: 'tripped',
        sidecarPid: process.pid,
        boundInstallId: currentInstallId || stateObj.boundInstallId,
        trippedAt: now,
        trippedReason: 'unfinished_boot_arming',
        unfinishedAttempts: updatedAttempts.slice(-6),
      });
      await onTripSafeMode('unfinished_boot_arming');
      return tripped;
    }

    // 3. Sliding-window circuit breaker: >= 2 unfinished boot attempts within 90s -> Trip Safe Mode!
    if (recentUnfinished.length >= 2) {
      const tripped = persistFsync({
        ...stateObj,
        state: 'tripped',
        sidecarPid: process.pid,
        boundInstallId: currentInstallId || stateObj.boundInstallId,
        trippedAt: now,
        trippedReason: 'rapid_unfinished_restarts_90s',
        unfinishedAttempts: recentUnfinished.slice(-6),
      });
      await onTripSafeMode('rapid_unfinished_restarts_90s');
      return tripped;
    }

    if (!stateObj.boundInstallId && currentInstallId) {
      persistFsync({ ...stateObj, boundInstallId: currentInstallId, unfinishedAttempts: recentUnfinished });
    }
    return { ...stateObj };
  };

  const arm = (browserSessionId = '', windowTargetId = '') => {
    const cur = readDisk();
    const now = Date.now();
    const recent = cur.unfinishedAttempts.filter((ts) => now - ts <= CANARY_WINDOW_MS);
    recent.push(now);
    return persistFsync({
      ...cur,
      state: 'arming',
      browserSessionId: String(browserSessionId || cur.browserSessionId || `pid-${process.pid}`),
      windowTargetId: String(windowTargetId || ''),
      sidecarPid: process.pid,
      boundInstallId: currentInstallId || cur.boundInstallId || '',
      lastArmTs: now,
      trippedReason: null,
      unfinishedAttempts: recent.slice(-6),
    });
  };

  const markHealthy = (windowTargetId = '') => {
    const cur = readDisk();
    if (cur.state === 'tripped') return { ...cur };
    const now = Date.now();
    // Pop the successfully completed arm timestamp so healthy boots never accumulate toward circuit breaker
    const remaining = cur.unfinishedAttempts.filter((ts) => ts !== cur.lastArmTs && now - ts <= CANARY_WINDOW_MS);
    return persistFsync({
      ...cur,
      state: 'healthy',
      windowTargetId: String(windowTargetId || cur.windowTargetId || ''),
      sidecarPid: process.pid,
      boundInstallId: currentInstallId || cur.boundInstallId || '',
      lastHealthyTs: now,
      trippedReason: null,
      unfinishedAttempts: remaining,
    });
  };

  const rollback = async (reason = 'root_watchdog_rollback', windowTargetId = '') => {
    const cur = readDisk();
    const now = Date.now();
    const tripped = persistFsync({
      ...cur,
      state: 'tripped',
      windowTargetId: String(windowTargetId || cur.windowTargetId || ''),
      sidecarPid: process.pid,
      boundInstallId: currentInstallId || cur.boundInstallId || '',
      trippedAt: now,
      trippedReason: String(reason || 'root_watchdog_rollback'),
    });
    await onTripSafeMode(tripped.trippedReason);
    return tripped;
  };

  const reset = () => {
    return persistFsync({
      ...defaultCanary(),
      state: 'idle',
      boundInstallId: currentInstallId || stateObj.boundInstallId || '',
      lastHealthyTs: stateObj.lastHealthyTs || 0,
    });
  };

  return {
    canaryPath,
    getStatus: () => ({ ...readDisk() }),
    evaluateBoot,
    arm,
    markHealthy,
    rollback,
    reset,
  };
}

// --------------------------------------------------------- Page Bootstrap & Cleanup

function safeJsonLiteral(value) {
  return JSON.stringify(value).replace(/[\u2028\u2029<]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

export const REMOVE_SKIN_EXPR = `(function(){
  try { if (window.${PRISM_DOM.skinGlobal} && typeof window.${PRISM_DOM.skinGlobal}.destroy === 'function') window.${PRISM_DOM.skinGlobal}.destroy(); } catch (_) {}
  try {
    ['agy-prism-css', 'agy-prism-static-css', 'agy-prism-caret-css', 'agy-prism-stage', 'agy-prism-fx-canvas', 'agy-prism-wco-pill', 'agy-prism-topbar-pills', 'agy-prism-stage-loader'].forEach(function(id){
      var n = document.getElementById(id); if (n) n.remove();
    });
    document.querySelectorAll('[data-agy-prism-topbar-anc],[data-agy-prism-topbar-host],[data-agy-prism-welcome-logo],[data-agy-prism-welcome-logo-pseudo]').forEach(function(el){
      el.removeAttribute('data-agy-prism-topbar-anc');
      el.removeAttribute('data-agy-prism-topbar-host');
      el.removeAttribute('data-agy-prism-welcome-logo');
      el.removeAttribute('data-agy-prism-welcome-logo-pseudo');
    });
    var r = document.documentElement;
    [
      ${JSON.stringify(PRISM_DOM.skinAttr)},
      ${JSON.stringify(PRISM_DOM.glassAttr)},
      ${JSON.stringify(PRISM_DOM.wallpaperAttr)},
      ${JSON.stringify(PRISM_DOM.wcoAttr)},
      ${JSON.stringify(PRISM_DOM.wcoActiveAttr || 'data-agy-prism-wco-active')},
      ${JSON.stringify(PRISM_DOM.welcomeLogoAttr || 'data-prism-welcome-logo')},
      ${JSON.stringify(PRISM_DOM.topbarStyleAttr || 'data-prism-topbar-style')},
      ${JSON.stringify(PRISM_DOM.sidebarStyleAttr || 'data-prism-sidebar-style')},
      ${JSON.stringify(PRISM_DOM.themeAttr)},
      ${JSON.stringify(PRISM_DOM.schemeAttr)},
      ${JSON.stringify(PRISM_DOM.accentModeAttr)},
      ${JSON.stringify(PRISM_DOM.layoutAttr)},
      ${JSON.stringify(PRISM_DOM.cornersAttr)},
      ${JSON.stringify(PRISM_DOM.bordersAttr)},
      ${JSON.stringify(PRISM_DOM.shadowsAttr)},
      ${JSON.stringify(PRISM_DOM.kindAttr)},
      'data-prism-glass',
      'data-prism-code-mode'
    ].forEach(function(a){ r.removeAttribute(a); });
    try {
      r.style.removeProperty('--prism-wco-pill-top');
      r.style.removeProperty('--prism-wco-pill-h');
      r.style.removeProperty('--prism-wco-inset-right');
      r.style.removeProperty('--prism-bg-topbar');
    } catch (_) {}
    window.__agyPrismOn = false;
    var p = document.getElementById('agy-prism-pill');
    if (p && p.dataset && p.dataset.prismLazyStub === '1') {
      p.dataset.skinEnabled = 'false';
      p.textContent = '\\u25C7 Prism \\u00B7 OFF';
      p.style.color = '#94a3b8';
      p.style.background = 'rgba(20,20,26,.52)';
      p.style.borderColor = 'rgba(148,163,184,.28)';
      p.style.opacity = '.78';
    }
    if (window.electronNative && typeof window.electronNative.setTitleBarOverlay === 'function') {
      var lt = document.body && document.body.classList && document.body.classList.contains('theme-light');
      window.electronNative.setTitleBarOverlay({ color: lt ? '#FFFFFF' : '#131313', symbolColor: lt ? '#000000' : '#FAFAFA' });
    }
  } catch (_) {}
  return true;
})()`;

export function buildSoftDisableSkinExpr(stateRev = 0) {
  const rev = Number.isInteger(Number(stateRev)) && Number(stateRev) > 0 ? Number(stateRev) : 0;
  return `(function(){
  try { window.__agyPrismOn = false; } catch (_) {}
  var softOk = false;
  try {
    var api = window.${PRISM_DOM.skinGlobal};
    if (api && typeof api.apply === 'function') {
      api.apply({ skinEnabled: false, stateRev: ${rev} });
      softOk = true;
    } else if (api && typeof api.applyPayload === 'function') {
      api.applyPayload({ skinEnabled: false, stateRev: ${rev} });
      softOk = true;
    }
  } catch (_) {
    try { if (window.${PRISM_DOM.skinGlobal} && typeof window.${PRISM_DOM.skinGlobal}.destroy === 'function') window.${PRISM_DOM.skinGlobal}.destroy(); } catch (__) {}
  }
  try {
    var loader = document.getElementById('agy-prism-stage-loader');
    if (loader) loader.remove();
    var staticEl = document.getElementById('agy-prism-static-css');
    if (staticEl) staticEl.remove();
    if (!softOk) {
      ['agy-prism-css', 'agy-prism-caret-css', 'agy-prism-stage', 'agy-prism-fx-canvas', 'agy-prism-wco-pill', 'agy-prism-topbar-pills'].forEach(function(id){
        var n = document.getElementById(id); if (n) n.remove();
      });
      document.querySelectorAll('[data-agy-prism-topbar-anc],[data-agy-prism-topbar-host],[data-agy-prism-welcome-logo],[data-agy-prism-welcome-logo-pseudo]').forEach(function(el){
        el.removeAttribute('data-agy-prism-topbar-anc');
        el.removeAttribute('data-agy-prism-topbar-host');
        el.removeAttribute('data-agy-prism-welcome-logo');
        el.removeAttribute('data-agy-prism-welcome-logo-pseudo');
      });
      var r = document.documentElement;
      [
        ${JSON.stringify(PRISM_DOM.skinAttr)},
        ${JSON.stringify(PRISM_DOM.glassAttr)},
        ${JSON.stringify(PRISM_DOM.wallpaperAttr)},
        ${JSON.stringify(PRISM_DOM.wcoAttr)},
        ${JSON.stringify(PRISM_DOM.wcoActiveAttr || 'data-agy-prism-wco-active')},
        ${JSON.stringify(PRISM_DOM.welcomeLogoAttr || 'data-prism-welcome-logo')},
        ${JSON.stringify(PRISM_DOM.topbarStyleAttr || 'data-prism-topbar-style')},
        ${JSON.stringify(PRISM_DOM.sidebarStyleAttr || 'data-prism-sidebar-style')},
        ${JSON.stringify(PRISM_DOM.themeAttr)},
        ${JSON.stringify(PRISM_DOM.schemeAttr)},
        ${JSON.stringify(PRISM_DOM.accentModeAttr)},
        ${JSON.stringify(PRISM_DOM.layoutAttr)},
        ${JSON.stringify(PRISM_DOM.cornersAttr)},
        ${JSON.stringify(PRISM_DOM.bordersAttr)},
        ${JSON.stringify(PRISM_DOM.shadowsAttr)},
        ${JSON.stringify(PRISM_DOM.kindAttr)},
        'data-prism-glass',
        'data-prism-code-mode'
      ].forEach(function(a){ r.removeAttribute(a); });
      if (window.electronNative && typeof window.electronNative.setTitleBarOverlay === 'function') {
        var lt = document.body && document.body.classList && document.body.classList.contains('theme-light');
        window.electronNative.setTitleBarOverlay({ color: lt ? '#FFFFFF' : '#131313', symbolColor: lt ? '#000000' : '#FAFAFA' });
      }
    }
    var p = document.getElementById('agy-prism-pill');
    if (p && p.dataset && p.dataset.prismLazyStub === '1') {
      p.dataset.skinEnabled = 'false';
      p.textContent = '\\u25C7 Prism \\u00B7 OFF';
      p.style.color = '#94a3b8';
      p.style.background = 'rgba(20,20,26,.52)';
      p.style.borderColor = 'rgba(148,163,184,.28)';
      p.style.opacity = '.78';
    }
  } catch (_) {}
  return true;
})()`;
}

export const SOFT_DISABLE_SKIN_EXPR = buildSoftDisableSkinExpr(0);

export const REMOVE_PANEL_EXPR = `(function(){
  try { window.__agyPrismBootstrapped = false; } catch (_) {}
  try { if (window.__agyPrismKt) { clearTimeout(window.__agyPrismKt); clearInterval(window.__agyPrismKt); window.__agyPrismKt = 0; } } catch (_) {}
  try { if (window.__agyPrismSse) { window.__agyPrismSse.close(); window.__agyPrismSse = null; } } catch (_) {}
  try { if (window.${PRISM_DOM.panelGlobal} && typeof window.${PRISM_DOM.panelGlobal}.destroy === 'function') window.${PRISM_DOM.panelGlobal}.destroy(); } catch (_) {}
  try {
    ['agy-prism-popover', 'agy-prism-popover-css', 'agy-prism-pill', 'agy-prism-pill-css', 'agy-prism-panel-loader'].forEach(function(id){
      var n = document.getElementById(id); if (n) n.remove();
    });
    if (document.documentElement) document.documentElement.removeAttribute('data-agy-prism-panel');
    document.querySelectorAll('.' + ${JSON.stringify(PRISM_DOM.cornerOrbClass)}).forEach(function(el){ el.remove(); });
  } catch (_) {}
  return true;
})()`;

/**
 * Installs a universal `window.__agyPrismCall` bridge supporting:
 *   1) Direct loopback HTTP `/host/<capToken>/rpc` (default in Gentle v2.0 — zero CDP bindings!)
 *   2) Fallback `window.__agyPrismNativeSend` compatibility for isolated unit test harnesses
 */
export function buildRpcBootstrapSource({ rpcUrl = '', capToken = '' } = {}) {
  return `;(function(){
    if (window.top && window !== window.top) return;
    if (${JSON.stringify(Boolean(rpcUrl))}) {
      window.__agyPrismRpcUrl = ${safeJsonLiteral(rpcUrl)};
      window.__agyPrismCapToken = ${safeJsonLiteral(capToken)};
    }
    if (window.__agyPrismRpcBooted && typeof window.${PRISM_DOM.bindingName} === 'function') return;
    window.__agyPrismRpcBooted = true;
    var seq = 1;
    var pending = new Map();
    window.__agyPrismRpcResolve = function(envelope) {
      if (!envelope || typeof envelope !== 'object') return;
      if (envelope.id != null && pending.has(envelope.id)) {
        var p = pending.get(envelope.id);
        pending.delete(envelope.id);
        if (envelope.ok === false) p.reject(new Error(envelope.error || 'RPC error'));
        else p.resolve(envelope.result);
      }
      var panel = window.${PRISM_DOM.panelGlobal};
      if (panel && typeof panel.receive === 'function') {
        try { panel.receive(envelope); } catch (_) {}
      }
      var skinApi = window.${PRISM_DOM.skinGlobal};
      if (skinApi && typeof skinApi.receive === 'function') {
        try { skinApi.receive(envelope); } catch (_) {}
      }
      if (envelope.event === 'state' && panel && typeof panel.syncState === 'function') {
        try { panel.syncState(envelope.data); } catch (_) {}
      }
    };
    window.${PRISM_DOM.bindingName} = function(arg1, arg2) {
      var reqObj;
      if (typeof arg1 === 'string' && arg1.trim().charAt(0) === '{') {
        try { reqObj = JSON.parse(arg1); } catch (e) { return Promise.reject(e); }
      } else {
        reqObj = { id: 'p_' + (seq++) + '_' + Date.now(), method: String(arg1 || ''), params: arg2 && typeof arg2 === 'object' ? arg2 : {} };
      }
      if (reqObj.id == null) reqObj.id = 'p_' + (seq++);
      var httpRpc = window.__agyPrismRpcUrl || '';
      if (httpRpc && typeof window.fetch === 'function') {
        return window.fetch(httpRpc, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Prism-Token': window.__agyPrismCapToken || '' },
          body: JSON.stringify(reqObj)
        }).then(function(r){ return r.json(); }).then(function(env){
          if (env && env.ok === false) throw new Error(env.error || 'RPC error');
          return env ? env.result : null;
        });
      }
      return new Promise(function(resolve, reject) {
        var timer = setTimeout(function() {
          if (pending.has(reqObj.id)) {
            pending.delete(reqObj.id);
            reject(new Error('RPC timeout: ' + reqObj.method));
          }
        }, 10000);
        pending.set(reqObj.id, {
          resolve: function(v) { clearTimeout(timer); resolve(v); },
          reject: function(e) { clearTimeout(timer); reject(e); }
        });
        try {
          if (typeof window.${NATIVE_BINDING} === 'function') {
            window.${NATIVE_BINDING}(JSON.stringify(reqObj));
          } else {
            clearTimeout(timer);
            pending.delete(reqObj.id);
            reject(new Error('Prism bridge not connected'));
          }
        } catch (err) {
          clearTimeout(timer);
          pending.delete(reqObj.id);
          reject(err);
        }
      });
    };
  })();`;
}

/**
 * Compact (<= 6 KB) 1-shot Gentle Host Micro-Bootstrap:
 *   - Top-frame guard (`window === window.top`)
 *   - Dependency-free `Ctrl+Alt+Shift+R` & `4x Escape` (`900ms`) emergency panic strip
 *   - `window.__agyPrismCall` over `/host/<capToken>/rpc` + `EventSource('/host/<capToken>/events')`
 *   - Lazy `Ctrl+Alt+W` & `#agy-prism-pill` stub (`0 KB` `panel.js` overhead until summoned!)
 *   - Idle async `<script src=".../stage.js">` (or `<link rel="stylesheet" href=".../static.css">`)
 */
export function buildHostMicroBootstrap({
  hostOrigin,
  capToken,
  triggerMode = 'both',
  startupMode = 'gentle-auto',
  skinEnabled = true,
} = {}) {
  const hostPrefix = `${String(hostOrigin || '').replace(/\/+$/, '')}/host/`;
  const showStubPill = triggerMode !== 'shortcut-only' ? 1 : 0;
  const isStatic = startupMode === 'static-css' ? 1 : 0;
  const isSkinOn = skinEnabled !== false ? 1 : 0;
  return [
    ';(()=>{var W=window,D=document;if(W.top&&W!==W.top)return{ok:!1};',
    `var T=${safeJsonLiteral(capToken)},B=${safeJsonLiteral(hostPrefix)}+T,P="agy-prism-",K="__agyPrism",N=K+"Panel",BT=K+"Bootstrapped",SS=K+"Sse",KT=K+"Kt",ON=K+"On",PS=K+"PanicStrip",SM=K+"SummonPanel",SC="static-css",PL=P+"panel-loader",SL=P+"stage-loader",PI=P+"pill",pb=W[K+"HostBase"]||"",sb=${showStubPill},kc=0,E=D.documentElement,H=D.head||E,nw=Date.now;W[ON]=!!${isSkinOn};`,
    'var $=i=>D.getElementById(i),pd=e=>{e.preventDefault();e.stopPropagation()},isL=n=>n&&n.dataset&&n.dataset.prismLazyStub==="1",ds=o=>{try{o&&o.destroy&&o.destroy()}catch(_){}},rm=n=>n&&n.remove(),',
    'sk=a=>{if(!a||!sb||W[N]||!W[BT]){if(W[KT]){clearTimeout(W[KT]);clearInterval(W[KT]);W[KT]=0}kc=0;return}if(!W[KT])W[KT]=setTimeout(()=>{W[KT]=0;if(!W[BT]||W[N]||!sb)return;if(!D.hidden)kc=ep(W[ON])?kc+1:0;sk(1)},kc>5?10000:kc>3?5000:1500)},',
    'clr=all=>{if(E)Array.from(E.attributes).forEach(a=>{if(/^data-(?:agy-)?prism/.test(a.name)&&(all||a.name!=="data-agy-prism-panel"))E.removeAttribute(a.name)});try{var en=W.electronNative;if(en&&en.setTitleBarOverlay){var lt=D.body&&D.body.classList.contains("theme-light");en.setTitleBarOverlay({color:lt?"#FFFFFF":"#131313",symbolColor:lt?"#000000":"#FAFAFA"})}}catch(_){}},',
    'ss=r=>{W[ON]=!1;try{W[K]&&W[K].apply?W[K].apply({skinEnabled:!1,stateRev:r||0}):ds(W[K])}catch(_){ds(W[K])}("css,"+SC+",caret-css,stage,fx-canvas,wco-pill,topbar-pills,stage-loader").split(",").forEach(k=>rm($(P+k)));clr(0)},',
    'sa=()=>{W[ON]=!1;sk(0);ds(W[K]);ds(W[N]);D.querySelectorAll(\'[id^="\'+P+\'"],.prism-corner-orb\').forEach(rm);clr(1)},',
    'pp=(p,on)=>{if(!isL(p))return;var en=on!==!1,se=en?"true":"false",d=p.dataset,s=p.style,rg="rgba(";if(d.skinEnabled===se)return;d.skinEnabled=se;p.textContent=en?"\\u25C6 Prism":"\\u25C7 Prism \\u00B7 OFF";s.color=en?"#e2e8f0":"#94a3b8";s.background=rg+"20,20,26,"+(en?".76)":".52)");s.borderColor=rg+(en?"52,211,153,.42)":"148,163,184,.28)");s.opacity=en?"1":".78"},',
    'clk=e=>{pd(e);if(e.shiftKey){W[K+"Call"]("skin.toggle",{}).catch(()=>{});return}W[SM]()},',
    'ep=on=>{W[ON]=on!==!1;var ex=$(PI);if(!sb||W[N]||!D.body){if(isL(ex))rm(ex);if(W[N])sk(0);return 0}if(ex&&!isL(ex))return 1;if(ex&&ex.parentNode&&ex.parentNode!==D.body){if(ex.onclick!==clk)ex.onclick=clk;pp(ex,W[ON]);return 1}var f=D.querySelector(".agy-composer-footer,[data-testid=\\"agent-input-box\\"] footer,.composer-bar"),b=ex||D.createElement("button"),d=b.dataset,t=f||D.body,cs="all:initial;display:inline-flex;align-items:center;white-space:nowrap;flex-shrink:0;cursor:pointer;font:500 11px/18px sans-serif;padding:2px 8px;border-radius:999px;border:1px solid transparent;z-index:44;";if(!ex){b.id=b.className=PI;b.type="button";b.title="Wallpaper Prism (Click: Panel \\u00B7 Shift+Click: Enable/Disable \\u00B7 Ctrl+Alt+W)";b.setAttribute("translate","no");d.noTranslate="true";d.agNoI18n=d.prismLazyStub="1"}else if(!b.className)b.className=PI;if(b.onclick!==clk)b.onclick=clk;if(b.parentNode!==t){d.skinEnabled="";b.style.cssText=f?cs:cs+"position:fixed;right:14px;bottom:10px;";t.appendChild(b)}pp(b,W[ON]);return 0},',
    'ld=(id,u,f)=>{var ex=$(id);if(ex){if(!f)return;rm(ex)}var s=D.createElement("script");s.id=id;s.async=!0;s.onerror=()=>{rm(s);if(id===PL){var p=$(PI);if(isL(p)){p.dataset.skinEnabled="";pp(p,W[ON])}sk(1)}};s.src=B+u+(u.indexOf("?")>0?"&":"?")+"t="+nw();H.appendChild(s)},',
    'css=()=>{var l=$(P+SC);if(!l){l=D.createElement("link");l.id=P+SC;l.rel="stylesheet";H.appendChild(l)}l.href=B+"/static.css?t="+nw()},',
    'sp=m=>{var pn=W[N];if(!pn)return;sk(0);if(m.skinVersion&&pn.version!==m.skinVersion)ld(PL,"/panel.js",1);else if(pn.syncState&&m.data)pn.syncState(m.data)},',
    'rpc=(m,p)=>{var o=typeof m==="string"&&m[0]==="{"?JSON.parse(m):{id:"r"+nw(),method:m,params:p||{}};return W.fetch(B+"/rpc",{method:"POST",headers:{"Content-Type":"application/json","X-Prism-Token":T},body:JSON.stringify(o)}).then(r=>r.json()).then(e=>{if(e&&e.ok===!1)throw Error(e.error||"rpc");var res=e?e.result:null;if(o.method==="skin.toggle"&&res&&typeof res.skinEnabled==="boolean"){ep(res.skinEnabled);if(!res.skinEnabled)ss(res.stateRev);else{W[BT]=!0;if(!W[K]&&!$(P+SC)){var sm=res.state&&res.state.config&&res.state.config.startupMode;if(sm===SC)css();else if(!$(SL))ld(SL,"/stage.js",1)}}}return res})},',
    'sum=()=>{sk(0);if(W[N]&&W[N].toggle)return W[N].toggle();if($(PL))return;var p=$(PI);if(isL(p))p.style.opacity=".55";ld(PL,"/panel.js?open=1",1)};',
    'sk(0);W[K+"HostBase"]=B;W[K+"CapToken"]=T;W[K+"RpcUrl"]=B+"/rpc";W[BT]=!0;W[K+"Call"]=rpc;W[SM]=sum;W[PS]=w=>{W[BT]=!1;sk(0);try{if(W[SS]){W[SS].close();W[SS]=null}}catch(_){}sa();rpc("skin.panicRestore",{reason:w||"panic"}).catch(()=>{})};',
    'if(!W[K+"KeysBound"]){W[K+"KeysBound"]=!0;var esc=[];W.addEventListener("keydown",e=>{var k=String(e.key||""),kl=k.toLowerCase(),c=(e.ctrlKey||e.metaKey)&&e.altKey;if(c&&e.shiftKey&&kl==="r"){pd(e);W[PS]("Ctrl+Alt+Shift+R");return}if(k==="Escape"&&!e.repeat){var n=nw();esc=esc.filter(t=>n-t<=900);esc.push(n);if(esc.length>=4){esc=[];pd(e);W[PS]("4x-Escape");return}}else if(k!=="Escape")esc=[];if(c&&!e.shiftKey&&kl==="w"){if(W[N]&&W[N].toggle)return;pd(e);W[SM]()}},!0)}',
    'ep(W[ON]);sk(1);',
    'if(W.EventSource){if(!W[SS]||W[SS].readyState===2||pb!==B){try{W[SS]&&W[SS].close()}catch(_){}try{W[SS]=new W.EventSource(B+"/events")}catch(_){}}if(W[SS])W[SS].onmessage=v=>{try{if(!W[BT])return;var m=JSON.parse(v.data),on=m.skinEnabled!==!1,tm=m.data&&m.data.config&&m.data.config.triggerMode;if(m.event&&m.event!=="state")return;if(typeof tm==="string")sb=tm!=="shortcut-only"?1:0;var curP=$(PI);if(!sb&&isL(curP)){rm(curP);sk(0);W[ON]=on}else{ep(on);sk(1)}if(!on){ss(m.stateRev);sp(m);return}if(m.startupMode===SC){ds(W[K]);css()}else{rm($(P+SC));var sk0=W[K],okV=sk0&&(!m.skinVersion||sk0.version===m.skinVersion);if(okV&&sk0.applyPayload&&m.skinPayload)sk0.applyPayload(m.skinPayload);else{if(m.skinPayload)W.__AGY_PRISM_BOOT_PAYLOAD__=m.skinPayload;ld(SL,"/stage.js",1)}}sp(m)}catch(_){}}}',
    `if(${isSkinOn}){var go=()=>{${isStatic}?(css()):((W[K]&&W[K].version===${safeJsonLiteral(PRISM_DOM.skinVersion)})||ld(SL,"/stage.js",1))};W.requestIdleCallback?W.requestIdleCallback(go,{timeout:250}):setTimeout(go,16)}`,
    'return{ok:!0}})()',
  ].join('');
}

// Compact (<320 B) read-only Hub readiness probe (0 DOM mutations, 0 inspector domains)
const HUB_READINESS_PROBE_EXPR = `(function(){
if(window.top&&window!==window.top)return{ready:false};
if(document.readyState!=='complete')return{ready:false,booted:Boolean(window.__agyPrismBootstrapped)};
var r=document.getElementById('root')||document.querySelector('.monaco-workbench');
if(!r||!r.childElementCount)return{ready:false,booted:Boolean(window.__agyPrismBootstrapped)};
var b=r.getBoundingClientRect();
return{ready:b.width>=200&&b.height>=150,w:Math.round(b.width),h:Math.round(b.height),booted:Boolean(window.__agyPrismBootstrapped),hostBase:String(window.__agyPrismHostBase||''),sseState:window.__agyPrismSse?Number(window.__agyPrismSse.readyState):-1,skinVer:window.__agyPrism?String(window.__agyPrism.version||''):'',skin:Boolean(window.__agyPrism||document.getElementById('agy-prism-static-css'))};
})()`;

// --------------------------------------------------------- Ephemeral Gentle CDP Bridge

export function createPassiveCdpBridge({
  getEngineState, // async () => { config, activeItem, skinEnabled, presets, stats, mediaOrigin }
  hostScripts, // { getHostSkinScript(), getHostPanelScript(), buildClientSkinPayload(), buildStaticCssSheet?() }
  rpcHandlers,
  getHostOrigin = () => '',
  getPluginOrigin = () => '',
  capToken = '',
  dataDir = '',
  pluginRoot = '',
  canaryController = null,
  onTripSafeMode = async () => {},
  onOwnershipLost = null,
  stateEpoch = '',
  cdpPort = 0,
  pollMs = 3000,
  configPath = '',
  profileDir = '',
  isAuthoritativeOwner = () => true,
  log = () => {},
} = {}) {
  const canary =
    canaryController ||
    createCanaryController({
      dataDir,
      pluginRoot,
      onTripSafeMode,
    });

  const activeTargets = new Map(); // targetId -> { target, browserSessionId, mode, mountedAt }
  const firstReadyAt = new Map(); // targetId -> timestamp ms
  const settleTimers = new Map(); // targetId -> Timeout
  const REBIND_BACKOFF_MS = [0, 1500, 3000, 6000, 15000];
  const REBIND_STEADY_RESET_MS = 30_000;
  const REBIND_CONFLICT_WINDOW_MS = 15_000;
  const rebindStateByTarget = new Map(); // targetId -> { count, lastRebindAt, backoffUntil, timestamps }
  const rebindTimers = new Map(); // targetId -> Timeout
  const sseClients = new Set(); // Set<ServerResponse>
  const sseCleanups = new WeakMap(); // ServerResponse -> (opts?) => void
  let sessionAwake = false;
  let sessionForcedWake = false;
  let bootCanaryChecked = false;
  let ownershipLostNotified = false;
  let timer = null;
  let stopped = false;
  let tickInFlight = null;
  let inOwnershipLostCallback = false;
  let lastBroadcastRev = 0;
  let lastBroadcastLiveSse = 0;

  const isSseResponseAlive = (res) =>
    Boolean(
      res &&
      !res.writableEnded &&
      !res.destroyed &&
      (!res.socket || (!res.socket.destroyed && res.socket.writable !== false)),
    );

  const countLiveSseClients = () => {
    let alive = 0;
    for (const res of [...sseClients]) {
      if (isSseResponseAlive(res)) {
        alive += 1;
      } else {
        const fn = sseCleanups.get(res);
        if (fn) fn({ skipRecovery: true });
        else sseClients.delete(res);
      }
    }
    return alive;
  };

  const closeAllSseClients = () => {
    for (const res of [...sseClients]) {
      const fn = sseCleanups.get(res);
      if (fn) fn({ skipRecovery: true });
      else sseClients.delete(res);
      try {
        res.end();
      } catch {
        /* ignore */
      }
    }
    sseClients.clear();
    lastBroadcastRev = 0;
    lastBroadcastLiveSse = 0;
  };

  let lastStatus = {
    phase: 'standby',
    cdpReachable: false,
    port: cdpPort || DEFAULT_DEBUG_PORT,
    browser: '',
    browserSessionId: '',
    pluginEnabled: true,
    sessionAwake: false,
    attachedTargets: [],
    version: PLUGIN_VERSION,
    lastCheckAt: null,
  };

  const clearSettleTimers = () => {
    for (const t of settleTimers.values()) clearTimeout(t);
    settleTimers.clear();
  };

  const clearRebindTimers = () => {
    for (const t of rebindTimers.values()) clearTimeout(t);
    rebindTimers.clear();
  };

  const pruneSteadyRebindStates = (now = Date.now()) => {
    for (const [tid, rState] of rebindStateByTarget.entries()) {
      if (rState.lastRebindAt > 0 && now - rState.lastRebindAt >= REBIND_STEADY_RESET_MS) {
        rebindStateByTarget.delete(tid);
      }
    }
  };

  const yieldOwnership = (reason = 'owner_changed') => {
    if (stopped) return;
    stopped = true;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    clearSettleTimers();
    clearRebindTimers();
    rebindStateByTarget.clear();
    closeAllSseClients();
    activeTargets.clear();
    firstReadyAt.clear();
    lastStatus = {
      ...lastStatus,
      phase: 'superseded',
      cdpReachable: false,
      sessionAwake: false,
      attachedTargets: [],
      lastCheckAt: new Date().toISOString(),
    };
    log(`CDP bridge yielded ownership (${reason})`);
    if (!ownershipLostNotified && typeof onOwnershipLost === 'function') {
      ownershipLostNotified = true;
      Promise.resolve(onOwnershipLost(reason)).catch(() => {});
    }
  };

  const checkOwnership = (reason = 'owner_changed') => {
    if (stopped) return false;
    let owned = true;
    try {
      owned = isAuthoritativeOwner() !== false;
    } catch {
      owned = true;
    }
    if (!owned) {
      yieldOwnership(reason);
      return false;
    }
    return true;
  };
  const buildEnvelopePayload = async () => {
    const st = await getEngineState();
    const stateRev = Number.isInteger(Number(st?.stateRev)) && Number(st.stateRev) > 0 ? Number(st.stateRev) : 0;
    const resolvedEpoch = String(st?.stateEpoch || stateEpoch || '').trim();
    const startupMode = st.config?.startupMode || 'gentle-auto';
    const skinEnabled = st.skinEnabled !== false && canary.getStatus().state !== 'tripped';
    const pluginOrigin = String(getPluginOrigin() || st.pluginOrigin || '').trim();
    const skinPayload = hostScripts?.buildClientSkinPayload
      ? hostScripts.buildClientSkinPayload(st.config, st.activeItem, st.mediaOrigin, {
          skinEnabled,
          slides: st.activeItem?.slides,
          pluginOrigin,
          stateRev,
          ...(resolvedEpoch ? { stateEpoch: resolvedEpoch } : {}),
        })
      : {
          config: st.config,
          activeItem: st.activeItem,
          mediaOrigin: st.mediaOrigin,
          skinEnabled,
          stateRev,
          ...(resolvedEpoch ? { stateEpoch: resolvedEpoch } : {}),
        };
    if (stateRev > 0 && skinPayload && typeof skinPayload === 'object' && !Number.isInteger(skinPayload.stateRev)) {
      skinPayload.stateRev = stateRev;
    }
    if (resolvedEpoch && skinPayload && typeof skinPayload === 'object' && !skinPayload.stateEpoch) {
      skinPayload.stateEpoch = resolvedEpoch;
    }
    return {
      event: 'state',
      stateRev,
      ...(resolvedEpoch ? { stateEpoch: resolvedEpoch } : {}),
      skinVersion: PRISM_DOM.skinVersion,
      startupMode,
      skinEnabled,
      skinPayload,
      data: {
        stateRev,
        ...(resolvedEpoch ? { stateEpoch: resolvedEpoch } : {}),
        config: st.config,
        activeItem: st.activeItem,
        skinEnabled,
        presets: st.presets || [],
        stats: st.stats || {},
        mediaOrigin: st.mediaOrigin || '',
        pluginOrigin,
        hostStatus: getStatus(),
        canary: canary.getStatus(),
        sessionAwake: isSessionAwake(startupMode),
        studioUri: SIDECAR_URI,
        updateStatus: st.updateStatus || null,
        updateSummary: st.updateSummary || null,
      },
    };
  };

  function isSessionAwake(startupMode = 'gentle-auto') {
    if (canary.getStatus().state === 'tripped') return false;
    return startupMode !== 'manual' || sessionAwake;
  }

  const registerSseClient = async (req, res, isInMemoryProbe = false) => {
    const initial = await buildEnvelopePayload();
    if (isInMemoryProbe) {
      res.write(`retry: 2500\ndata: ${JSON.stringify(initial)}\n\n`);
      res.end();
      return;
    }
    const MAX_HOST_SSE = Math.max(4, activeTargets.size + 2);
    while (sseClients.size >= MAX_HOST_SSE) {
      const oldest = sseClients.values().next().value;
      if (!oldest) break;
      const oldCleanup = sseCleanups.get(oldest);
      if (oldCleanup) oldCleanup({ skipRecovery: true });
      else sseClients.delete(oldest);
      try { oldest.end(); } catch {}
    }
    sseClients.add(res);
    lastBroadcastLiveSse = 0;
    res.write(`retry: 2500\ndata: ${JSON.stringify(initial)}\n\n`);
    let cleaned = false;
    let ka = null;
    const cleanup = ({ skipRecovery = false } = {}) => {
      if (cleaned) return;
      cleaned = true;
      if (ka) clearInterval(ka);
      sseCleanups.delete(res);
      const hadClients = sseClients.delete(res);
      // When Hub reloads (Ctrl+R), EventSource closes -> re-verify & gently re-mount after settle!
      if (!skipRecovery && hadClients && !stopped) {
        if (!checkOwnership('owner_changed_on_sse_close')) return;
        const aliveCount = countLiveSseClients();
        if (aliveCount === 0) {
          activeTargets.clear();
          firstReadyAt.clear();
          const t = setTimeout(() => {
            if (!stopped) void tick();
          }, 600);
          t.unref?.();
        } else if (aliveCount < activeTargets.size) {
          const t = setTimeout(() => {
            if (!stopped) void tick({ immediateWake: true });
          }, 600);
          t.unref?.();
        }
      }
    };
    sseCleanups.set(res, cleanup);
    ka = setInterval(() => {
      if (!isSseResponseAlive(res)) {
        cleanup();
        return;
      }
      try {
        res.write(': keepalive\n\n');
      } catch {
        cleanup();
      }
    }, 15_000);
    ka.unref?.();

    req.on('close', () => cleanup());
    res.on('close', () => cleanup());
    res.on('error', () => cleanup());
  };

  const candidatePorts = async (st) => {
    if (Number.isInteger(Number(cdpPort)) && Number(cdpPort) > 0) {
      return [Number(cdpPort)];
    }
    const configured = Number(st?.config?.debugPort || DEFAULT_DEBUG_PORT);
    const set = new Set([configured, DEFAULT_DEBUG_PORT]);
    const pf = readDevToolsActivePort(profileDir);
    // Never hijack shared port 9222 uninvited on cold boot unless configured or manually awakened,
    // while still honoring ephemeral ports written by Antigravity (--remote-debugging-port=0).
    if (pf?.port && (pf.port !== 9222 || pf.port === configured || sessionForcedWake)) {
      set.add(pf.port);
    }
    return [...set].filter((n) => Number.isInteger(n) && n > 0 && n <= 65535);
  };

  const injectTargetOnce = async (target, browserSessionId, st, immediateWake = false) => {
    if (stopped) return false;
    const hostOrigin = String(getHostOrigin() || '').trim();
    if (!hostOrigin || !capToken) return false;

    const canaryCheck = await canary.evaluateBoot(browserSessionId);
    if (canaryCheck.state === 'tripped') return false;

    const probe = await evaluateTargetEphemeral(target.webSocketDebuggerUrl, HUB_READINESS_PROBE_EXPR).catch(() => null);
    if (!probe?.ready) return false;

    const startupMode = st?.config?.startupMode || 'gentle-auto';
    const skinEnabled = st?.skinEnabled !== false;
    const settleMs = immediateWake ? 0 : Math.round(Math.max(0.5, Number(st?.config?.liveBootDelay ?? 1.5)) * 1000);

    const expectedBase = `${hostOrigin.replace(/\/+$/, '')}/host/${capToken}`;
    const needsBridgeRebind =
      probe.booted &&
      (probe.hostBase !== expectedBase ||
        probe.sseState === 2 ||
        (skinEnabled && startupMode !== 'static-css' && probe.skinVer !== PRISM_DOM.skinVersion));

    if (probe.booted && !needsBridgeRebind) {
      const prevRebind = rebindStateByTarget.get(target.id);
      if (prevRebind && Date.now() - prevRebind.lastRebindAt >= REBIND_STEADY_RESET_MS) {
        rebindStateByTarget.delete(target.id);
        const rt = rebindTimers.get(target.id);
        if (rt) {
          clearTimeout(rt);
          rebindTimers.delete(target.id);
        }
      }
    }

    if (!probe.booted || needsBridgeRebind) {
      if (needsBridgeRebind) {
        const now = Date.now();
        let rState = rebindStateByTarget.get(target.id);
        if (rState && now - rState.lastRebindAt >= REBIND_STEADY_RESET_MS) {
          rebindStateByTarget.delete(target.id);
          rState = null;
        }
        if (!rState) {
          rState = { count: 0, lastRebindAt: 0, backoffUntil: 0, timestamps: [] };
          rebindStateByTarget.set(target.id, rState);
        }
        const requiredDelayMs = REBIND_BACKOFF_MS[Math.min(rState.count, REBIND_BACKOFF_MS.length - 1)];
        if (rState.count > 0) {
          const dueAt = Math.max(rState.backoffUntil, rState.lastRebindAt + requiredDelayMs);
          rState.backoffUntil = dueAt;
          const waitMs = dueAt - now;
          if (waitMs > 0) {
            if (!rebindTimers.has(target.id)) {
              const rt = setTimeout(() => {
                rebindTimers.delete(target.id);
                if (!stopped) void tick();
              }, waitMs + 20);
              rt.unref?.();
              rebindTimers.set(target.id, rt);
            }
            return false;
          }
        }
        const pendingRt = rebindTimers.get(target.id);
        if (pendingRt) {
          clearTimeout(pendingRt);
          rebindTimers.delete(target.id);
        }
        const recent = rState.timestamps.filter((ts) => now - ts <= REBIND_CONFLICT_WINDOW_MS);
        recent.push(now);
        rState.timestamps = recent;
        rState.count += 1;
        rState.lastRebindAt = now;
        const nextDelay = REBIND_BACKOFF_MS[Math.min(rState.count, REBIND_BACKOFF_MS.length - 1)];
        rState.backoffUntil = now + nextDelay;

        if (recent.length >= 3 && typeof onOwnershipLost === 'function') {
          let lost = false;
          inOwnershipLostCallback = true;
          try {
            lost = Boolean(
              await Promise.resolve(
                onOwnershipLost({ targetId: target.id, recentCount: recent.length, count: rState.count }),
              ).catch(() => false),
            );
          } finally {
            inOwnershipLostCallback = false;
          }
          if (stopped) return false;
          if (lost === true) {
            await stop({ preserveHostDom: true, skipTickWait: true }).catch(() => {});
            return false;
          }
        }
      } else if (settleMs > 0) {
        const firstSeen = firstReadyAt.get(target.id) || 0;
        const now = Date.now();
        if (!firstSeen) {
          firstReadyAt.set(target.id, now);
          if (!settleTimers.has(target.id)) {
            const tm = setTimeout(() => {
              settleTimers.delete(target.id);
              if (!stopped) void tick();
            }, settleMs + 30);
            tm.unref?.();
            settleTimers.set(target.id, tm);
          }
          return false;
        }
        if (now - firstSeen < settleMs) {
          return false;
        }
      }

      // Re-verify #root after settle window + fsync canary `arming` BEFORE 1-shot bootstrap eval!
      const recheck = await evaluateTargetEphemeral(target.webSocketDebuggerUrl, HUB_READINESS_PROBE_EXPR).catch(() => null);
      if (!recheck?.ready) {
        firstReadyAt.delete(target.id);
        return false;
      }

      if (!checkOwnership('owner_changed_before_inject')) return false;

      if (skinEnabled && !needsBridgeRebind) {
        canary.arm(browserSessionId, target.id);
      }

      const bootstrapSrc = buildHostMicroBootstrap({
        hostOrigin,
        capToken,
        triggerMode: st?.config?.triggerMode || 'both',
        startupMode,
        skinEnabled,
      });

      await evaluateTargetEphemeral(target.webSocketDebuggerUrl, bootstrapSrc);
      log(`Gentle 1-shot bootstrap mounted on ${String(target.url || '').slice(0, 80)}`);

      // Backup server-side health confirmation in case static-css mode is used or stage.js already finished
      if (skinEnabled) {
        const healthDelay = startupMode === 'static-css' ? 1800 : 8500;
        const hTimer = setTimeout(async () => {
          if (stopped || canary.getStatus().state !== 'arming') return;
          const okProbe = await evaluateTargetEphemeral(target.webSocketDebuggerUrl, HUB_READINESS_PROBE_EXPR).catch(() => null);
          if (okProbe?.ready) {
            canary.markHealthy(target.id);
          }
        }, healthDelay);
        hTimer.unref?.();
      }
    }

    activeTargets.set(target.id, {
      target,
      browserSessionId,
      mode: startupMode,
      mountedAt: Date.now(),
    });
    return true;
  };

  const cleanupTargetsEphemeral = async ({ removeSkin = true, removePanel = true } = {}) => {
    const entries = [...activeTargets.values()];
    activeTargets.clear();
    firstReadyAt.clear();
    clearSettleTimers();
    for (const entry of entries) {
      const exprs = [];
      if (removeSkin) exprs.push(REMOVE_SKIN_EXPR);
      if (removePanel) exprs.push(REMOVE_PANEL_EXPR);
      if (exprs.length > 0 && entry.target?.webSocketDebuggerUrl) {
        await evaluateTargetEphemeral(entry.target.webSocketDebuggerUrl, exprs.join(';')).catch(() => {});
      }
    }
  };

  const broadcastState = async ({ force = false, sseOnly = false } = {}) => {
    if (!checkOwnership('owner_changed_on_broadcast')) return { sseDeliveredCount: 0 };
    const envelope = await buildEnvelopePayload();
    const liveSseBefore = countLiveSseClients();
    if (
      !force &&
      envelope.stateRev > 0 &&
      envelope.stateRev === lastBroadcastRev &&
      liveSseBefore === lastBroadcastLiveSse &&
      liveSseBefore > 0
    ) {
      return { sseDeliveredCount: liveSseBefore, skippedDuplicate: true };
    }
    const serialized = `data: ${JSON.stringify(envelope)}\n\n`;
    let sseDeliveredCount = 0;
    for (const res of [...sseClients]) {
      if (!isSseResponseAlive(res)) {
        const fn = sseCleanups.get(res);
        if (fn) fn({ skipRecovery: true });
        else sseClients.delete(res);
        continue;
      }
      try {
        res.write(serialized);
        sseDeliveredCount += 1;
      } catch {
        const fn = sseCleanups.get(res);
        if (fn) fn({ skipRecovery: true });
        else sseClients.delete(res);
      }
    }
    if (sseDeliveredCount > 0 && envelope.stateRev > 0) {
      lastBroadcastRev = envelope.stateRev;
      lastBroadcastLiveSse = sseDeliveredCount;
    }

    // Fallback ephemeral push when SSE has no open socket (e.g. immediately after Restore or before EventSource opens)
    if (!sseOnly && sseDeliveredCount === 0 && activeTargets.size > 0) {
      for (const [, entry] of [...activeTargets.entries()]) {
        if (!entry.target?.webSocketDebuggerUrl) continue;
        if (!envelope.skinEnabled) {
          const ok = await evaluateTargetEphemeral(
            entry.target.webSocketDebuggerUrl,
            buildSoftDisableSkinExpr(envelope.stateRev),
          ).catch(() => null);
          if (!ok && !stopped) {
            // Never silently drop target from activeTargets on transient timeout; schedule tick() to verify & recover SSE
            const retryTimer = setTimeout(() => {
              if (!stopped) void tick({ immediateWake: true });
            }, 1200);
            retryTimer.unref?.();
          }
        } else if (envelope.startupMode === 'static-css') {
          const hostOrigin = String(getHostOrigin() || '').replace(/\/+$/, '');
          const expr = `(function(){if(window.__agyPrism&&window.__agyPrism.destroy)window.__agyPrism.destroy();var l=document.getElementById('agy-prism-static-css');if(!l){l=document.createElement('link');l.id='agy-prism-static-css';l.rel='stylesheet';(document.head||document.documentElement).appendChild(l);}l.href=${safeJsonLiteral(`${hostOrigin}/host/${capToken}/static.css?t=${Date.now()}`)};})()`;
          await evaluateTargetEphemeral(entry.target.webSocketDebuggerUrl, expr).catch(() => {});
        } else {
          const expr = `(function(){if(window.__agyPrism&&window.__agyPrism.applyPayload){window.__agyPrism.applyPayload(${safeJsonLiteral(envelope.skinPayload)});return true;}return false;})()`;
          const applied = await evaluateTargetEphemeral(entry.target.webSocketDebuggerUrl, expr).catch(() => null);
          if (applied === false) {
            await injectTargetOnce(entry.target, entry.browserSessionId, envelope.data, true).catch(() => {});
          }
        }
      }
    }
    return { sseDeliveredCount };
  };

  const bootedAtMs = Date.now();
  let idleTickCount = 0;

  const runTick = async ({ immediateWake = false } = {}) => {
    if (stopped) return getStatus();
    if (!checkOwnership('owner_changed_on_tick')) return getStatus();

    if (!bootCanaryChecked) {
      bootCanaryChecked = true;
      await canary.evaluateBoot('');
    }

    const pluginEnabled = isPluginEnabledInHostConfig(configPath, pluginRoot);
    if (!pluginEnabled) {
      closeAllSseClients();
      if (activeTargets.size > 0) await cleanupTargetsEphemeral({ removeSkin: true, removePanel: true });
      lastStatus = {
        ...lastStatus,
        phase: 'disabled',
        cdpReachable: false,
        pluginEnabled: false,
        sessionAwake: false,
        attachedTargets: [],
        lastCheckAt: new Date().toISOString(),
      };
      return getStatus();
    }

    const canaryStatus = canary.getStatus();
    if (canaryStatus.state === 'tripped') {
      lastStatus = {
        ...lastStatus,
        phase: 'tripped',
        pluginEnabled: true,
        sessionAwake: false,
        attachedTargets: [],
        lastCheckAt: new Date().toISOString(),
      };
      return getStatus();
    }

    // Steady-state zero-CDP & zero-engine-state polling while SSE is connected!
    if (!immediateWake && activeTargets.size > 0 && countLiveSseClients() > 0) {
      pruneSteadyRebindStates();
      lastStatus = {
        ...lastStatus,
        phase: 'attached',
        cdpReachable: true,
        pluginEnabled: true,
        sessionAwake: true,
        lastCheckAt: new Date().toISOString(),
      };
      return getStatus();
    }

    const st = await getEngineState();
    const startupMode = st?.config?.startupMode || 'gentle-auto';

    // Option 1 (`manual` mode): zero boot CDP probes until explicitly awakened!
    if (startupMode === 'manual' && !sessionAwake && !immediateWake) {
      lastStatus = {
        ...lastStatus,
        phase: 'manual-standby',
        cdpReachable: false,
        pluginEnabled: true,
        sessionAwake: false,
        attachedTargets: [],
        lastCheckAt: new Date().toISOString(),
      };
      return getStatus();
    }

    const portFile = readDevToolsActivePort(profileDir);
    idleTickCount += 1;
    if (!immediateWake && activeTargets.size === 0 && !portFile && Date.now() - bootedAtMs > 20_000 && idleTickCount % 4 !== 0) {
      return getStatus();
    }

    const ports = await candidatePorts(st);
    let activeProbe = null;
    for (const p of ports) {
      const pr = await probeCdpPort(p);
      if (pr.ok) {
        activeProbe = pr;
        break;
      }
    }

    if (!activeProbe) {
      activeTargets.clear();
      firstReadyAt.clear();
      lastStatus = {
        ...lastStatus,
        phase: 'standby',
        cdpReachable: false,
        port: ports[0] || DEFAULT_DEBUG_PORT,
        browser: '',
        browserSessionId: '',
        pluginEnabled: true,
        sessionAwake: isSessionAwake(startupMode),
        attachedTargets: [],
        lastCheckAt: new Date().toISOString(),
      };
      return getStatus();
    }

    const browserSessionId = String(activeProbe.webSocketDebuggerUrl || `cdp:${activeProbe.port}`);
    const canaryAfterProbe = await canary.evaluateBoot(browserSessionId);
    if (canaryAfterProbe.state === 'tripped') {
      lastStatus = {
        ...lastStatus,
        phase: 'tripped',
        cdpReachable: true,
        port: activeProbe.port,
        browser: activeProbe.browser,
        browserSessionId,
        pluginEnabled: true,
        sessionAwake: false,
        attachedTargets: [],
        lastCheckAt: new Date().toISOString(),
      };
      return getStatus();
    }

    try {
      const targets = await listCdpTargets(activeProbe.port, activeProbe.host || '127.0.0.1');
      const hubs = selectHubTargets(targets);
      const liveIds = new Set(hubs.map((h) => h.id));
      for (const oldId of [...activeTargets.keys()]) {
        if (!liveIds.has(oldId)) activeTargets.delete(oldId);
      }

      for (const h of hubs) {
        if (stopped) break;
        if (!activeTargets.has(h.id) || immediateWake || countLiveSseClients() === 0) {
          await injectTargetOnce(h, browserSessionId, st, immediateWake).catch((err) => log(`gentle mount warn: ${err.message}`));
        }
        if (stopped) break;
      }
      if (stopped) return getStatus();

      if (activeTargets.size > 0) sessionAwake = true;

      lastStatus = {
        phase: activeTargets.size > 0 ? 'attached' : 'standby',
        cdpReachable: true,
        port: activeProbe.port,
        browser: activeProbe.browser,
        browserSessionId,
        pluginEnabled: true,
        sessionAwake: isSessionAwake(startupMode),
        attachedTargets: [...activeTargets.values()].map((e) => String(e.target.url || '')),
        version: PLUGIN_VERSION,
        lastCheckAt: new Date().toISOString(),
      };
    } catch {
      if (stopped) return getStatus();
      lastStatus = {
        ...lastStatus,
        phase: 'standby',
        cdpReachable: false,
        lastCheckAt: new Date().toISOString(),
      };
    }
    return getStatus();
  };

  const runSerializedTick = async (opts = {}) => {
    if (tickInFlight) {
      await tickInFlight.catch(() => {});
    }
    if (stopped) return getStatus();
    const p = runTick(opts).finally(() => {
      if (tickInFlight === p) tickInFlight = null;
    });
    tickInFlight = p;
    return p;
  };

  const tick = (opts = {}) => {
    if (!tickInFlight) {
      const p = runTick(opts).finally(() => {
        if (tickInFlight === p) tickInFlight = null;
      });
      tickInFlight = p;
    }
    return tickInFlight;
  };

  const scheduleNext = () => {
    if (stopped || pollMs <= 0) return;
    if (!checkOwnership('owner_changed_on_schedule')) return;
    let delayMs = Math.max(pollMs, 5000);
    if (activeTargets.size === 0 && lastStatus.cdpReachable && lastStatus.phase !== 'tripped' && lastStatus.phase !== 'manual-standby') {
      delayMs = Math.min(1200, pollMs);
    } else if (activeTargets.size === 0 && Date.now() - bootedAtMs < 15_000) {
      delayMs = Math.min(1800, pollMs);
    }
    timer = setTimeout(() => {
      tick().finally(scheduleNext);
    }, delayMs);
    timer.unref?.();
  };

  function getStatus() {
    const isAttached = activeTargets.size > 0;
    const canaryStatus = canary.getStatus();
    return {
      ...lastStatus,
      canary: canaryStatus,
      sessionAwake: canaryStatus.state === 'tripped' ? false : (sessionAwake || isAttached),
      attachedCount: activeTargets.size,
      attached: isAttached,
      cdpConnected: isAttached,
    };
  }

  async function stop({ removeSkin = true, removePanel = true, preserveHostDom = false, skipTickWait = false } = {}) {
    stopped = true;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    clearSettleTimers();
    clearRebindTimers();
    rebindStateByTarget.clear();
    closeAllSseClients();
    if (!skipTickWait && !inOwnershipLostCallback && lastStatus.phase !== 'superseded' && tickInFlight) {
      await tickInFlight.catch(() => {});
    }
    if (preserveHostDom) {
      activeTargets.clear();
      firstReadyAt.clear();
    } else {
      await cleanupTargetsEphemeral({ removeSkin, removePanel });
    }
    if (lastStatus.phase !== 'superseded') {
      lastStatus = {
        ...lastStatus,
        phase: 'stopped',
        cdpReachable: false,
        attachedTargets: [],
        lastCheckAt: new Date().toISOString(),
      };
    }
    return getStatus();
  }

  return {
    canary,
    getCanary: () => canary.getStatus(),
    isSessionAwake: (mode) => isSessionAwake(mode),
    markCanaryHealthy: (targetId) => canary.markHealthy(targetId),
    rollbackCanary: async (reason, targetId) => {
      const res = await canary.rollback(reason, targetId);
      await cleanupTargetsEphemeral({ removeSkin: true, removePanel: false });
      return res;
    },
    resetCanary: async () => {
      const next = canary.reset();
      sessionAwake = true;
      sessionForcedWake = true;
      await runSerializedTick({ immediateWake: true });
      await broadcastState({ force: true });
      return next;
    },
    wake: async (opts = {}) => {
      const forceProbe = Boolean(opts && opts.forceProbe);
      sessionAwake = true;
      sessionForcedWake = true;
      const liveSseAttached =
        activeTargets.size > 0 &&
        countLiveSseClients() > 0 &&
        lastStatus.phase === 'attached' &&
        canary.getStatus().state !== 'tripped';
      const usedFastPath = !forceProbe && liveSseAttached;
      if (!usedFastPath) {
        await runSerializedTick({ immediateWake: true });
      }
      const bc = await broadcastState({ force: forceProbe });
      if (usedFastPath && (!bc || bc.sseDeliveredCount === 0)) {
        await runSerializedTick({ immediateWake: true });
        await broadcastState({ force: true });
      }
      return getStatus();
    },
    reloadHostScripts: async () => {
      clearRebindTimers();
      rebindStateByTarget.clear();
      activeTargets.clear();
      lastBroadcastRev = 0;
      lastBroadcastLiveSse = 0;
      sessionAwake = true;
      sessionForcedWake = true;
      await runSerializedTick({ immediateWake: true });
      await broadcastState({ force: true });
      return getStatus();
    },
    registerSseClient,
    async start() {
      stopped = false;
      await tick();
      scheduleNext();
      return getStatus();
    },
    tick,
    getStatus,
    broadcastState,
    stop,
  };
}
