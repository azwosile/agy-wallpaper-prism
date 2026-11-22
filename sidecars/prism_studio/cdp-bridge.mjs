// Passive Chrome DevTools Protocol (CDP) bridge & host utilities for agy-wallpaper-prism.
// Zero writes to Antigravity's installation (never touches app.asar or ~/.gemini/config/config.json).

import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { request as httpRequest } from 'node:http';
import { homedir } from 'node:os';
import { basename, delimiter, dirname, join, resolve } from 'node:path';
import {
  DEFAULT_DEBUG_PORT,
  PLUGIN_ID,
  PLUGIN_VERSION,
  PRISM_DOM,
  SIDECAR_URI,
} from '../../src/shared/schema.mjs';

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

/** Strictly read-only check of ~/.gemini/config/config.json for plugin enablement. */
export function isPluginEnabledInHostConfig(configPath) {
  const fp =
    configPath ||
    join(
      process.env.ANTIGRAVITY_CONFIG_DIR ? resolve(process.env.ANTIGRAVITY_CONFIG_DIR) : join(homedir(), '.gemini', 'config'),
      'config.json',
    );
  try {
    if (!existsSync(fp)) return true;
    const raw = JSON.parse(readFileSync(fp, 'utf8').replace(/^\uFEFF/, ''));
    if (raw?.plugins?.[PLUGIN_ID]?.enabled === false) return false;
    return true;
  } catch {
    return true;
  }
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

function resolveDefaultPrismDataDir(explicitDir = '') {
  if (explicitDir) return resolve(explicitDir);
  if (process.env.AGY_PRISM_DATA_DIR) return resolve(process.env.AGY_PRISM_DATA_DIR);
  return join(homedir(), '.agy-wallpaper-prism');
}

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
    const isAgyTarget = /antigravity\.exe$/i.test(target) || (/antigravity/i.test(c.name) && Boolean(target));
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
      if (/antigravity/i.test(title)) score += 50;
      if (/curtain|splash|loading/i.test(title)) score -= 100;
      return { t, score };
    })
    .sort((a, b) => b.score - a.score);

  const high = scored.filter((x) => x.score >= 100).map((x) => x.t);
  if (high.length > 0) return high;
  return scored[0] && scored[0].score > 0 ? [scored[0].t] : [];
}

export class CdpSession {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.handlers = new Map();
    this.closeHandlers = [];
    this.closed = false;

    ws.addEventListener('message', (ev) => {
      let msg;
      try {
        msg = JSON.parse(typeof ev.data === 'string' ? ev.data : String(ev.data));
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
          try {
            fn(msg.params || {});
          } catch {
            /* isolate listener errors */
          }
        }
      }
    });

    ws.addEventListener('close', () => {
      this.closed = true;
      for (const { reject } of this.pending.values()) reject(new Error('CDP socket closed'));
      this.pending.clear();
      for (const fn of this.closeHandlers.splice(0)) {
        try {
          fn();
        } catch {
          /* ignore */
        }
      }
    });
    ws.addEventListener('error', () => {});
  }

  static async connect(wsUrl, timeoutMs = 5000) {
    const ws = new WebSocket(wsUrl);
    await new Promise((resolvePromise, reject) => {
      const timer = setTimeout(() => reject(new Error(`CDP WebSocket timeout: ${wsUrl}`)), timeoutMs);
      ws.addEventListener('open', () => {
        clearTimeout(timer);
        resolvePromise();
      });
      ws.addEventListener('error', () => {
        clearTimeout(timer);
        reject(new Error(`CDP WebSocket error: ${wsUrl}`));
      });
    });
    return new CdpSession(ws);
  }

  send(method, params = {}, timeoutMs = 12000) {
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
        this.ws.send(JSON.stringify({ id, method, params }));
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

  async evaluate(expression, { returnByValue = true, awaitPromise = false } = {}) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue,
      awaitPromise,
      userGesture: true,
    });
    if (res?.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text || 'Evaluate failed');
    }
    return returnByValue ? res?.result?.value : res?.result;
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    try {
      this.ws.close();
    } catch {
      /* ignore */
    }
  }
}

// --------------------------------------------------------- Page Bootstrap & Cleanup

/**
 * Installs a universal `window.__agyPrismCall` bridge supporting BOTH:
 *   1) Two-arg Promise style: `await window.__agyPrismCall('playlist.step', { direction: 1 })`
 *   2) JSON envelope style:   `window.__agyPrismCall(JSON.stringify({ id, method, params }))`
 */
export function buildRpcBootstrapSource() {
  return `;(function(){
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
            reject(new Error('Prism CDP bridge not connected'));
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

function deferUntilBody(code) {
  return `;(function(){
    var run = function(){ try { ${code} } catch (e) { try { console.warn('[agy-prism]', e); } catch (_) {} } };
    if (document && document.documentElement && document.body) { run(); return; }
    document.addEventListener('DOMContentLoaded', run, { once: true });
  })();`;
}

export const REMOVE_SKIN_EXPR = `(function(){
  try { if (window.${PRISM_DOM.skinGlobal} && typeof window.${PRISM_DOM.skinGlobal}.destroy === 'function') window.${PRISM_DOM.skinGlobal}.destroy(); } catch (_) {}
  try {
    var st = document.getElementById(${JSON.stringify(PRISM_DOM.styleId)}); if (st) st.remove();
    var ct = document.getElementById('agy-prism-caret-css'); if (ct) ct.remove();
    var sg = document.getElementById(${JSON.stringify(PRISM_DOM.stageId)}); if (sg) sg.remove();
    var fx = document.getElementById('agy-prism-fx-canvas'); if (fx) fx.remove();
    var r = document.documentElement;
    [
      ${JSON.stringify(PRISM_DOM.skinAttr)},
      ${JSON.stringify(PRISM_DOM.themeAttr)},
      ${JSON.stringify(PRISM_DOM.schemeAttr)},
      ${JSON.stringify(PRISM_DOM.accentModeAttr)},
      ${JSON.stringify(PRISM_DOM.layoutAttr)},
      ${JSON.stringify(PRISM_DOM.cornersAttr)},
      ${JSON.stringify(PRISM_DOM.bordersAttr)},
      ${JSON.stringify(PRISM_DOM.shadowsAttr)},
      ${JSON.stringify(PRISM_DOM.kindAttr)}
    ].forEach(function(a){ r.removeAttribute(a); });
  } catch (_) {}
  return true;
})()`;

export const REMOVE_PANEL_EXPR = `(function(){
  try { if (window.${PRISM_DOM.panelGlobal} && typeof window.${PRISM_DOM.panelGlobal}.destroy === 'function') window.${PRISM_DOM.panelGlobal}.destroy(); } catch (_) {}
  try {
    var p = document.getElementById(${JSON.stringify(PRISM_DOM.popoverId)}); if (p) p.remove();
    var s = document.getElementById(${JSON.stringify(PRISM_DOM.popoverStyleId)}); if (s) s.remove();
    var pill = document.getElementById(${JSON.stringify(PRISM_DOM.pillId)}); if (pill) pill.remove();
    document.querySelectorAll('.' + ${JSON.stringify(PRISM_DOM.cornerOrbClass)}).forEach(function(el){ el.remove(); });
  } catch (_) {}
  return true;
})()`;

function safeJsonLiteral(value) {
  return JSON.stringify(value).replace(/[\u2028\u2029<]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

// --------------------------------------------------------- Passive CDP Controller

export function createPassiveCdpBridge({
  getEngineState, // async () => { config, activeItem, skinEnabled, presets, stats, mediaOrigin }
  hostScripts, // { getHostSkinScript(), getHostPanelScript(), buildClientSkinPayload(config, activeItem, mediaOrigin) }
  rpcHandlers, // Record<method, async (params) => result>
  pollMs = 3000,
  configPath = '',
  profileDir = '',
  log = () => {},
} = {}) {
  const attached = new Map(); // targetId -> { target, session, scriptIds: { rpc, skin, panel } }
  let timer = null;
  let stopped = false;
  let tickInFlight = null;

  let lastStatus = {
    phase: 'standby',
    cdpReachable: false,
    port: DEFAULT_DEBUG_PORT,
    browser: '',
    pluginEnabled: true,
    attachedTargets: [],
    version: PLUGIN_VERSION,
    lastCheckAt: null,
  };

  const replaceDocScript = async (entry, key, source) => {
    const prev = entry.scriptIds[key];
    if (prev) {
      await entry.session.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: prev }).catch(() => {});
      entry.scriptIds[key] = null;
    }
    if (!source) return;
    const res = await entry.session.send('Page.addScriptToEvaluateOnNewDocument', { source }).catch(() => null);
    entry.scriptIds[key] = res?.identifier || null;
  };

  const buildPagePushBundle = async () => {
    const st = await getEngineState();
    const skinScript = hostScripts?.getHostSkinScript ? hostScripts.getHostSkinScript() : '';
    const panelScript = hostScripts?.getHostPanelScript ? hostScripts.getHostPanelScript() : '';
    const skinPayload = hostScripts?.buildClientSkinPayload
      ? hostScripts.buildClientSkinPayload(st.config, st.activeItem, st.mediaOrigin, {
          skinEnabled: st.skinEnabled,
          slides: st.activeItem?.slides,
        })
      : { config: st.config, activeItem: st.activeItem, mediaOrigin: st.mediaOrigin, skinEnabled: st.skinEnabled };
    return { st, skinScript, panelScript, skinPayload };
  };

  const syncEntry = async (entry, bundle = null) => {
    if (entry.session.closed) return;
    const { st, skinScript, panelScript, skinPayload } = bundle || (await buildPagePushBundle());
    const rpcSrc = buildRpcBootstrapSource();
    await replaceDocScript(entry, 'rpc', rpcSrc);
    await entry.session.evaluate(rpcSrc).catch(() => {});

    // 1. Panel (always available while plugin is enabled so Ctrl+Alt+W can re-enable skin after Restore)
    if (panelScript) {
      const panelState = {
        config: st.config,
        activeItem: st.activeItem,
        skinEnabled: Boolean(st.skinEnabled),
        presets: st.presets || [],
        stats: st.stats || {},
        mediaOrigin: st.mediaOrigin || '',
        hostStatus: getStatus(),
        studioUri: SIDECAR_URI,
      };
      const panelBoot = deferUntilBody(`${panelScript};\nif (window.${PRISM_DOM.panelGlobal} && typeof window.${PRISM_DOM.panelGlobal}.syncState === 'function') window.${PRISM_DOM.panelGlobal}.syncState(${safeJsonLiteral(panelState)});`);
      await replaceDocScript(entry, 'panel', panelBoot);
      await entry.session.evaluate(panelBoot).catch((err) => log(`panel eval warn: ${err.message}`));
    }

    // 2. Skin (strictly gated on st.skinEnabled !== false!)
    if (st.skinEnabled !== false && skinScript) {
      const applyExpr = `if (window.${PRISM_DOM.skinGlobal} && typeof window.${PRISM_DOM.skinGlobal}.applyPayload === 'function') window.${PRISM_DOM.skinGlobal}.applyPayload(${safeJsonLiteral(skinPayload)});`;
      const fullSkinBoot = deferUntilBody(`${skinScript};\n${applyExpr}`);
      await replaceDocScript(entry, 'skin', fullSkinBoot);
      // Fast-path: if __agyPrism is already mounted, call applyPayload in-place without re-running full IIFE
      const updatedInPlace = await entry.session
        .evaluate(
          `(function(){ if (window.${PRISM_DOM.skinGlobal} && typeof window.${PRISM_DOM.skinGlobal}.applyPayload === 'function') { window.${PRISM_DOM.skinGlobal}.applyPayload(${safeJsonLiteral(skinPayload)}); return true; } return false; })()`,
        )
        .catch(() => false);
      if (!updatedInPlace) {
        await entry.session.evaluate(fullSkinBoot).catch((err) => log(`skin eval warn: ${err.message}`));
      }
    } else {
      await replaceDocScript(entry, 'skin', null);
      await entry.session.evaluate(REMOVE_SKIN_EXPR).catch(() => {});
    }
  };

  const attachTarget = async (target) => {
    if (attached.has(target.id)) return attached.get(target.id);
    const session = await CdpSession.connect(target.webSocketDebuggerUrl);
    const entry = {
      target,
      session,
      scriptIds: { rpc: null, skin: null, panel: null },
    };
    attached.set(target.id, entry);

    session.onClose(() => {
      if (attached.get(target.id) === entry) attached.delete(target.id);
    });

    await session.send('Page.enable').catch(() => {});
    await session.send('Runtime.enable').catch(() => {});
    await session.send('Runtime.addBinding', { name: NATIVE_BINDING }).catch(() => {});

    session.on('Runtime.executionContextsCleared', () => {
      session.send('Runtime.addBinding', { name: NATIVE_BINDING }).catch(() => {});
    });

    session.on('Page.loadEventFired', () => {
      syncEntry(entry).catch((err) => log(`reload heal warn: ${err.message}`));
    });

    session.on('Runtime.bindingCalled', async (ev) => {
      if (!ev || ev.name !== NATIVE_BINDING) return;
      let parsed;
      try {
        parsed = JSON.parse(String(ev.payload || '{}'));
      } catch {
        return;
      }
      const id = parsed?.id ?? null;
      const method = String(parsed?.method || '');
      const params = parsed?.params && typeof parsed.params === 'object' ? parsed.params : {};
      const handler = rpcHandlers && typeof rpcHandlers[method] === 'function' ? rpcHandlers[method] : null;
      let reply;
      if (!handler) {
        reply = { id, ok: false, error: `Unknown RPC method: ${method}` };
      } else {
        try {
          const result = await handler(params);
          reply = { id, ok: true, result: result === undefined ? null : result };
        } catch (err) {
          reply = { id, ok: false, error: err?.message || String(err) };
        }
      }
      if (!session.closed) {
        await session
          .evaluate(`window.__agyPrismRpcResolve && window.__agyPrismRpcResolve(${safeJsonLiteral(reply)})`)
          .catch(() => {});
      }
    });

    try {
      await syncEntry(entry);
      log(`CDP attached: ${String(target.url || '').slice(0, 90)}`);
      return entry;
    } catch (err) {
      attached.delete(target.id);
      session.close();
      throw err;
    }
  };

  const detachAll = async ({ removeSkin = true, removePanel = true } = {}) => {
    for (const entry of [...attached.values()]) {
      if (!entry.session.closed) {
        await replaceDocScript(entry, 'rpc', null);
        await replaceDocScript(entry, 'skin', null);
        await replaceDocScript(entry, 'panel', null);
        if (removeSkin) await entry.session.evaluate(REMOVE_SKIN_EXPR).catch(() => {});
        if (removePanel) await entry.session.evaluate(REMOVE_PANEL_EXPR).catch(() => {});
      }
      entry.session.close();
    }
    attached.clear();
  };

  const broadcastState = async () => {
    if (attached.size === 0) return;
    const bundle = await buildPagePushBundle();
    const stateEnvelope = {
      event: 'state',
      data: {
        config: bundle.st.config,
        activeItem: bundle.st.activeItem,
        skinEnabled: Boolean(bundle.st.skinEnabled),
        presets: bundle.st.presets || [],
        stats: bundle.st.stats || {},
        mediaOrigin: bundle.st.mediaOrigin || '',
        hostStatus: getStatus(),
        studioUri: SIDECAR_URI,
      },
    };
    for (const entry of [...attached.values()]) {
      if (entry.session.closed) continue;
      await syncEntry(entry, bundle).catch(() => {});
      await entry.session
        .evaluate(`window.__agyPrismRpcResolve && window.__agyPrismRpcResolve(${safeJsonLiteral(stateEnvelope)})`)
        .catch(() => {});
    }
  };

  const candidatePorts = async () => {
    const set = new Set();
    const pf = readDevToolsActivePort(profileDir);
    if (pf?.port) set.add(pf.port);
    try {
      const st = await getEngineState();
      if (st?.config?.debugPort) set.add(Number(st.config.debugPort));
    } catch {
      /* ignore */
    }
    set.add(DEFAULT_DEBUG_PORT);
    return [...set].filter((n) => Number.isInteger(n) && n > 0 && n <= 65535);
  };

  const bootedAtMs = Date.now();
  let idleTickCount = 0;

  const runTick = async () => {
    if (stopped) return getStatus();
    const pluginEnabled = isPluginEnabledInHostConfig(configPath);
    if (!pluginEnabled) {
      if (attached.size > 0) await detachAll({ removeSkin: true, removePanel: true });
      lastStatus = {
        ...lastStatus,
        phase: 'disabled',
        cdpReachable: false,
        pluginEnabled: false,
        attachedTargets: [],
        lastCheckAt: new Date().toISOString(),
      };
      return lastStatus;
    }

    // Fast-path standby guard: after initial 20s boot window, if not attached and no DevToolsActivePort file exists,
    // skip opening TCP probe sockets on 3 out of 4 ticks to keep idle overhead near zero.
    const portFile = readDevToolsActivePort(profileDir);
    idleTickCount += 1;
    if (attached.size === 0 && !portFile && Date.now() - bootedAtMs > 20_000 && idleTickCount % 4 !== 0) {
      return lastStatus;
    }

    const ports = await candidatePorts();
    let activeProbe = null;
    for (const p of ports) {
      const pr = await probeCdpPort(p);
      if (pr.ok) {
        activeProbe = pr;
        break;
      }
    }

    if (!activeProbe) {
      if (attached.size > 0) await detachAll({ removeSkin: false, removePanel: false });
      lastStatus = {
        ...lastStatus,
        phase: 'standby',
        cdpReachable: false,
        port: ports[0] || DEFAULT_DEBUG_PORT,
        browser: '',
        pluginEnabled: true,
        attachedTargets: [],
        lastCheckAt: new Date().toISOString(),
      };
      return lastStatus;
    }

    try {
      const targets = await listCdpTargets(activeProbe.port, activeProbe.host || '127.0.0.1');
      const hubs = selectHubTargets(targets);
      for (const h of hubs) {
        if (!attached.has(h.id)) {
          await attachTarget(h).catch((err) => log(`attach warn: ${err.message}`));
        }
      }
      lastStatus = {
        phase: attached.size > 0 ? 'attached' : 'standby',
        cdpReachable: true,
        port: activeProbe.port,
        browser: activeProbe.browser,
        pluginEnabled: true,
        attachedTargets: [...attached.values()].map((e) => String(e.target.url || '')),
        version: PLUGIN_VERSION,
        lastCheckAt: new Date().toISOString(),
      };
    } catch {
      lastStatus = {
        ...lastStatus,
        phase: 'standby',
        cdpReachable: false,
        lastCheckAt: new Date().toISOString(),
      };
    }
    return lastStatus;
  };

  const tick = () => {
    if (!tickInFlight) {
      tickInFlight = runTick().finally(() => {
        tickInFlight = null;
      });
    }
    return tickInFlight;
  };

  const scheduleNext = () => {
    if (stopped || pollMs <= 0) return;
    // Gentle adaptive backoff: 900ms when CDP is up and waiting for Hub splash -> 1500ms during initial boot -> 5000ms steady-state
    let delayMs = Math.max(pollMs, 5000);
    if (attached.size === 0 && lastStatus.cdpReachable) {
      delayMs = Math.min(900, pollMs);
    } else if (attached.size === 0 && Date.now() - bootedAtMs < 15_000) {
      delayMs = Math.min(1500, pollMs);
    }
    timer = setTimeout(() => {
      tick().finally(scheduleNext);
    }, delayMs);
    timer.unref?.();
  };

  function getStatus() {
    const isAttached = attached.size > 0;
    return {
      ...lastStatus,
      attachedCount: attached.size,
      attached: isAttached,
      cdpConnected: isAttached,
    };
  }

  return {
    async start() {
      stopped = false;
      await tick();
      scheduleNext();
      return getStatus();
    },
    tick,
    getStatus,
    broadcastState,
    async stop({ removeSkin = true, removePanel = true } = {}) {
      stopped = true;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (tickInFlight) await tickInFlight.catch(() => {});
      await detachAll({ removeSkin, removePanel });
      lastStatus = {
        ...lastStatus,
        phase: 'stopped',
        cdpReachable: false,
        attachedTargets: [],
        lastCheckAt: new Date().toISOString(),
      };
      return getStatus();
    },
  };
}
