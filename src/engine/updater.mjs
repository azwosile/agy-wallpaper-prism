/**
 * Secure Zero-Dependency Self-Updater Engine (`src/engine/updater.mjs`).
 *
 * Implements:
 * - Official GitHub Release update checking (`checkForUpdate`, `getCachedStatus`) with 6h TTL cache,
 *   5s timeout, ETag `304`, rate-limit backoff + zero-quota `HEAD /releases/latest` redirect fallback,
 *   and offline-safe fail-silent behavior.
 * - Hardened one-click update pipeline (`applyUpdate`) with single-flight mutex (`409`), `.git` &
 *   symlink plugin-root refusal (`409`), zero client-supplied URLs, manual per-hop HTTPS redirect
 *   allowlisting (`<= 5` hops), dedicated companion `.sha256` fetch (`<= 4 KiB`, `5s`) with fail-closed
 *   SHA-256 verification, pure-Node `tar-safe.mjs` extraction & pre-swap validation gate, `onBeforeSync`
 *   hook (pauses `watchTimer`), Windows lock-safe in-place sync preserving `.prism-install-id` and
 *   retiring `EBUSY` files to `.old.<ts>`, synchronous rollback on error (+ `onRollback`), crash-recovery
 *   journal (`recoverPendingJournal`), and `canary.json` `arming` settlement.
 * - Managed sidecar runtime detection (`isManagedSidecar`).
 */

import { createHash, randomBytes } from 'node:crypto';
import {
  copyFileSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  unlinkSync,
} from 'node:fs';
import { dirname, join, posix, resolve } from 'node:path';
import { compareSemver, isNewerVersion, parseSemver } from '../shared/semver.mjs';
import { writeAtomicJsonSync, writeFsyncJsonSync } from './store.mjs';
import { extractSafeTarGz, validateStagedPlugin } from './tar-safe.mjs';

export const DEFAULT_REPO = 'azwosile/agy-wallpaper-prism';
export const DEFAULT_API_BASE = 'https://api.github.com';
export const DEFAULT_WEB_BASE = 'https://github.com';
export const UPDATE_CHECK_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
export const UPDATE_REQUEST_TIMEOUT_MS = 5000; // 5 seconds
export const UPDATE_DOWNLOAD_TIMEOUT_MS = 60_000; // 60 seconds
export const MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024; // 25 MiB
export const MAX_SHA256_BYTES = 4096; // 4 KiB
export const MAX_REDIRECT_HOPS = 5;

const MAX_CHANGELOG_CHARS = 8000;
const MIN_RATELIMIT_BACKOFF_MS = 60 * 1000;
const DEFAULT_RATELIMIT_BACKOFF_MS = 5 * 60 * 1000;
const MAX_RATELIMIT_BACKOFF_MS = 60 * 60 * 1000;
const CANARY_WINDOW_MS = 90_000;

const LOCK_ERROR_CODES = new Set(['EBUSY', 'EPERM', 'EACCES']);
const RETIRED_FILE_RE = /\.old\.\d{10,}(?:\.\d+)?$/;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

export const ALLOWED_REDIRECT_HOSTS = Object.freeze([
  'github.com',
  'api.github.com',
  'codeload.github.com',
  'objects.githubusercontent.com',
  'release-assets.githubusercontent.com',
  'github-releases.githubusercontent.com',
]);

export const MANAGED_SIDECAR_ENV_VARS = Object.freeze([
  'ANTIGRAVITY_SIDECAR_WEB_PORT',
  'ANTIGRAVITY_SIDECAR_PORT',
  'ANTIGRAVITY_EXECUTABLE_DATA_DIR',
  'ANTIGRAVITY_SIDECAR_UI_TOKEN',
  'ANTIGRAVITY_SIDECAR_AUTH_TOKEN',
  'ANTIGRAVITY_SIDECAR_WEB_TOKEN',
  // Short-form aliases supported alongside canonical ANTIGRAVITY_SIDECAR_* vars
  'ANTIGRAVITY_WEB_PORT',
  'ANTIGRAVITY_PORT',
  'ANTIGRAVITY_UI_TOKEN',
  'ANTIGRAVITY_AUTH_TOKEN',
  'ANTIGRAVITY_WEB_TOKEN',
]);

function makeUpdaterError(code, message, statusCode = 400) {
  const err = new Error(`${code}: ${message}`);
  err.code = code;
  err.statusCode = statusCode;
  return err;
}

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readJsonSafe(filePath) {
  if (!filePath || !existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    return null;
  }
}

function truncateChangelog(raw, maxLen = MAX_CHANGELOG_CHARS) {
  const text = String(raw || '').trim();
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen).trimEnd()}\n...`;
}

function extractChangelogSummary(raw) {
  const lines = String(raw || '').split(/\r?\n/);
  for (const line of lines) {
    const cleaned = line
      .trim()
      .replace(/^#+\s*/, '')
      .replace(/^[-*+]\s+/, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*_`]/g, '')
      .trim();
    if (!cleaned) continue;
    if (/^(?:what'?s changed|highlights?|changelog|full changelog)$/i.test(cleaned)) continue;
    return cleaned.length > 160 ? `${cleaned.slice(0, 157).trimEnd()}...` : cleaned;
  }
  return '';
}

function parseRepoSlug(repo) {
  const clean = String(repo || DEFAULT_REPO).trim().replace(/^\/+|\/+$/g, '');
  const m = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/.exec(clean);
  if (!m) {
    throw makeUpdaterError('ERR_INVALID_REPO', `Invalid GitHub repository slug "${clean}"`, 400);
  }
  return { owner: m[1], name: m[2], slug: `${m[1]}/${m[2]}` };
}

/**
 * Parses standard sha256sum format (`<64-hex>  <filename>`) or bare `<64-hex>`.
 */
export function parseSha256Text(rawText) {
  const m = /^\s*([0-9a-f]{64})(?:\s+\*?[^\r\n]+)?\s*$/im.exec(String(rawText || ''));
  return m ? m[1].toLowerCase() : '';
}

/**
 * Detects whether this process is running as an Antigravity-managed sidecar
 * (where `process.exit(1)` triggers `restart_policy: "on-failure"` respawn)
 * vs. a standalone CLI/Node invocation.
 */
export function isManagedSidecar(env = process.env, override = undefined) {
  if (typeof override === 'boolean') return override;
  if (override && typeof override === 'object' && typeof override.managedSidecar === 'boolean') {
    return override.managedSidecar;
  }
  if (!env || typeof env !== 'object') return false;
  const rawOverride = String(env.PRISM_MANAGED_SIDECAR || '').trim().toLowerCase();
  if (rawOverride === '1' || rawOverride === 'true') return true;
  if (rawOverride === '0' || rawOverride === 'false') return false;
  return MANAGED_SIDECAR_ENV_VARS.some((key) => {
    const val = env[key];
    return val !== undefined && val !== null && String(val).trim() !== '';
  });
}

/**
 * Inspects the plugin installation root for Git dev-checkout or symlink/junction guards.
 */
export function inspectInstallEnvironment(pluginRoot) {
  const absRoot = pluginRoot ? resolve(String(pluginRoot)) : '';
  if (!absRoot || !existsSync(absRoot)) {
    return {
      pluginRoot: absRoot,
      isGitCheckout: false,
      isSymlink: false,
      canAutoUpdate: false,
      canSelfUpdate: false,
      blockReason: 'missing_plugin_root',
      disabledReason: 'missing_plugin_root',
    };
  }

  let isSymlink = false;
  try {
    isSymlink = lstatSync(absRoot).isSymbolicLink();
  } catch {
    isSymlink = false;
  }

  const isGitCheckout = !isSymlink && existsSync(join(absRoot, '.git'));
  const blockReason = isSymlink
    ? 'symlink_plugin_root'
    : isGitCheckout
      ? 'git_dev_checkout'
      : '';
  const canAutoUpdate = !isSymlink && !isGitCheckout;

  return {
    pluginRoot: absRoot,
    isGitCheckout,
    isSymlink,
    canAutoUpdate,
    canSelfUpdate: canAutoUpdate,
    blockReason,
    disabledReason: blockReason,
  };
}

function isRateLimitResponse(res, bodyText = '') {
  const status = Number(res?.status || 0);
  if (status === 429) return true;
  if (status !== 403) return false;
  const remaining = res?.headers?.get?.('x-ratelimit-remaining');
  const retryAfter = res?.headers?.get?.('retry-after');
  if (remaining === '0' || Boolean(retryAfter)) return true;
  const trimmed = String(bodyText || '').trim();
  if (!trimmed) return true;
  return /rate\s*limit|secondary rate|abuse detection/i.test(trimmed);
}

function computeRateLimitResetMs(res, nowMs) {
  const retryAfterRaw = res?.headers?.get?.('retry-after');
  if (retryAfterRaw) {
    const secs = Number(retryAfterRaw);
    if (Number.isFinite(secs) && secs > 0) {
      return Math.min(
        nowMs + MAX_RATELIMIT_BACKOFF_MS,
        Math.max(nowMs + MIN_RATELIMIT_BACKOFF_MS, nowMs + secs * 1000),
      );
    }
  }
  const resetEpochRaw = res?.headers?.get?.('x-ratelimit-reset');
  if (resetEpochRaw) {
    const resetEpochSec = Number(resetEpochRaw);
    if (Number.isFinite(resetEpochSec) && resetEpochSec > 0) {
      const target = resetEpochSec * 1000;
      if (target > nowMs) {
        return Math.min(
          nowMs + MAX_RATELIMIT_BACKOFF_MS,
          Math.max(nowMs + MIN_RATELIMIT_BACKOFF_MS, target),
        );
      }
    }
  }
  return nowMs + DEFAULT_RATELIMIT_BACKOFF_MS;
}

function readRetiredFilesList(updatesDir) {
  const parsed = readJsonSafe(join(updatesDir, 'retired-files.json'));
  return Array.isArray(parsed) ? parsed.filter((p) => typeof p === 'string' && p.trim()) : [];
}

function writeRetiredFilesList(updatesDir, list) {
  mkdirSync(updatesDir, { recursive: true });
  writeAtomicJsonSync(join(updatesDir, 'retired-files.json'), [...new Set(list)]);
}

/**
 * Sweeps unlocked `*.old.<ts>` retired files recorded during Windows EBUSY swaps.
 */
export function sweepRetiredFiles(updatesDir) {
  const list = readRetiredFilesList(updatesDir);
  if (list.length === 0) return { removed: 0, remaining: 0 };

  const remaining = [];
  let removed = 0;
  for (const oldPath of list) {
    const absOld = resolve(oldPath);
    if (!existsSync(absOld)) {
      removed += 1;
      continue;
    }
    try {
      const lst = lstatSync(absOld);
      if (lst.isSymbolicLink() || !lst.isFile() || !RETIRED_FILE_RE.test(absOld)) {
        continue;
      }
      unlinkSync(absOld);
      removed += 1;
    } catch {
      remaining.push(oldPath);
    }
  }
  writeRetiredFilesList(updatesDir, remaining);
  return { removed, remaining: remaining.length };
}

function listAllRelFiles(rootDir) {
  const out = [];
  if (!existsSync(rootDir)) return out;

  function walk(curAbs, relPrefix) {
    for (const name of readdirSync(curAbs)) {
      const full = join(curAbs, name);
      const rel = relPrefix ? posix.join(relPrefix, name) : name;
      const lst = lstatSync(full);
      if (lst.isSymbolicLink()) {
        continue;
      }
      if (lst.isDirectory()) {
        walk(full, rel);
      } else if (lst.isFile()) {
        out.push(rel);
      }
    }
  }
  walk(rootDir, '');
  return out;
}

function buildPreserveSet(preservePaths = []) {
  const set = new Set(['.prism-install-id']);
  for (const p of Array.isArray(preservePaths) ? preservePaths : []) {
    const clean = String(p || '').trim().replace(/\\/g, '/').replace(/^\.\/+/, '').replace(/\/+$/, '');
    if (clean && !clean.includes('..')) set.add(clean);
  }
  return set;
}

function isPreservedPath(relPosix, preserveSet) {
  for (const entry of preserveSet) {
    if (relPosix === entry || relPosix.startsWith(`${entry}/`)) return true;
  }
  return false;
}

function allocateRetiredPath(dstFile, nowMs) {
  let candidate = `${dstFile}.old.${nowMs}`;
  let seq = 1;
  while (existsSync(candidate)) {
    candidate = `${dstFile}.old.${nowMs}.${seq}`;
    seq += 1;
  }
  return candidate;
}

/**
 * Windows lock-safe in-place directory sync:
 * - Overwrites files in place without deleting the root directory (avoids CWD `EBUSY` handle failure).
 * - On `EBUSY`/`EPERM`/`EACCES`, renames locked file aside to `<file>.old.<ts>` and records it for boot GC.
 * - Preserves `.prism-install-id` (Boot Canary co-key) across both incoming overwrite & stale-file pruning.
 */
export function syncDirectoryLockSafe({
  stagingBundleDir,
  targetPluginDir,
  updatesDir,
  preservePaths = ['.prism-install-id'],
  nowMs = Date.now(),
  writeOverride = null,
}) {
  const absSrc = resolve(stagingBundleDir);
  const absDst = resolve(targetPluginDir);
  mkdirSync(absDst, { recursive: true });

  const preserveSet = buildPreserveSet(preservePaths);
  const incomingFiles = listAllRelFiles(absSrc);
  const incomingSet = new Set(incomingFiles);
  const existingFiles = listAllRelFiles(absDst);
  const newlyRetired = [];

  // 1. Copy/overwrite incoming files
  for (const rel of incomingFiles) {
    const srcFile = join(absSrc, rel);
    const dstFile = join(absDst, rel);

    if (existsSync(dstFile) && isPreservedPath(rel, preserveSet)) {
      continue;
    }

    mkdirSync(dirname(dstFile), { recursive: true });
    try {
      if (typeof writeOverride === 'function') {
        writeOverride(srcFile, dstFile, rel);
      } else {
        copyFileSync(srcFile, dstFile);
      }
    } catch (err) {
      if (LOCK_ERROR_CODES.has(err?.code) && existsSync(dstFile)) {
        const retiredFile = allocateRetiredPath(dstFile, nowMs);
        renameSync(dstFile, retiredFile);
        copyFileSync(srcFile, dstFile);
        newlyRetired.push(retiredFile);
      } else {
        throw err;
      }
    }
  }

  // 2. Remove stale files no longer present in the new bundle
  let removedStale = 0;
  for (const rel of existingFiles) {
    if (incomingSet.has(rel)) continue;
    if (isPreservedPath(rel, preserveSet)) continue;
    if (RETIRED_FILE_RE.test(rel)) continue;

    const staleFile = join(absDst, rel);
    try {
      unlinkSync(staleFile);
      removedStale += 1;
    } catch (err) {
      if (LOCK_ERROR_CODES.has(err?.code) && existsSync(staleFile)) {
        const retiredFile = allocateRetiredPath(staleFile, nowMs);
        try {
          renameSync(staleFile, retiredFile);
          newlyRetired.push(retiredFile);
        } catch {
          /* leave for next sweep */
        }
      }
    }
  }

  if (newlyRetired.length > 0 && updatesDir) {
    const prev = readRetiredFilesList(updatesDir);
    writeRetiredFilesList(updatesDir, [...prev, ...newlyRetired]);
  }

  // 3. Prune empty non-root subdirectories inside targetPluginDir
  function pruneEmptyDirs(curDir) {
    if (!existsSync(curDir)) return;
    for (const entry of readdirSync(curDir)) {
      const sub = join(curDir, entry);
      try {
        const lst = lstatSync(sub);
        if (lst.isSymbolicLink() || !lst.isDirectory()) continue;
        pruneEmptyDirs(sub);
        if (readdirSync(sub).length === 0) {
          rmSync(sub, { recursive: true, force: true });
        }
      } catch {
        /* ignore locked directory */
      }
    }
  }
  pruneEmptyDirs(absDst);

  return {
    syncedFiles: incomingFiles.length,
    removedStale,
    retiredFiles: newlyRetired,
  };
}

function settleArmingCanary(dataDir, nowMs) {
  const canaryPath = join(dataDir, 'canary.json');
  if (!existsSync(canaryPath)) return false;
  const cur = readJsonSafe(canaryPath);
  if (!cur || typeof cur !== 'object' || cur.state !== 'arming') return false;

  const unfinished = Array.isArray(cur.unfinishedAttempts)
    ? cur.unfinishedAttempts
        .map(Number)
        .filter((ts) => Number.isFinite(ts) && ts > 0 && ts !== cur.lastArmTs && nowMs - ts <= CANARY_WINDOW_MS)
    : [];

  writeFsyncJsonSync(canaryPath, {
    ...cur,
    state: 'healthy',
    lastHealthyTs: nowMs,
    trippedReason: null,
    unfinishedAttempts: unfinished,
  });
  return true;
}

async function readResponseBytesBounded(res, { maxBytes, requireGzipMagic = false, urlForError = '' }) {
  const hash = createHash('sha256');
  const chunks = [];
  let totalBytes = 0;

  if (res.body && typeof res.body.getReader === 'function') {
    const reader = res.body.getReader();
    const magic = [];
    let magicChecked = !requireGzipMagic;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
        if (chunk.length === 0) continue;
        totalBytes += chunk.length;
        if (totalBytes > maxBytes) {
          try { await reader.cancel(); } catch { /* ignore */ }
          throw makeUpdaterError('ERR_DOWNLOAD_TOO_LARGE', `Download exceeds ${maxBytes} bytes limit`, 400);
        }
        if (!magicChecked) {
          for (let i = 0; i < chunk.length && magic.length < 2; i += 1) {
            magic.push(chunk[i]);
          }
          if (magic.length >= 2) {
            if (magic[0] !== 0x1f || magic[1] !== 0x8b) {
              try { await reader.cancel(); } catch { /* ignore */ }
              throw makeUpdaterError(
                'ERR_NOT_GZIP_ARCHIVE',
                `Response from ${urlForError} is not a gzip archive`,
                400,
              );
            }
            magicChecked = true;
          }
        }
        hash.update(chunk);
        chunks.push(chunk);
      }
      if (!magicChecked) {
        throw makeUpdaterError(
          'ERR_NOT_GZIP_ARCHIVE',
          `Response from ${urlForError} is empty or truncated (< 2 bytes)`,
          400,
        );
      }
    } finally {
      try { reader.releaseLock(); } catch { /* ignore */ }
    }
    return { buffer: Buffer.concat(chunks), sha256: hash.digest('hex'), bytes: totalBytes };
  }

  const ab = await res.arrayBuffer();
  const buf = Buffer.from(ab);
  totalBytes = buf.length;
  if (totalBytes > maxBytes) {
    throw makeUpdaterError('ERR_DOWNLOAD_TOO_LARGE', `Download exceeds ${maxBytes} bytes limit`, 400);
  }
  if (requireGzipMagic && (buf.length < 2 || buf[0] !== 0x1f || buf[1] !== 0x8b)) {
    throw makeUpdaterError(
      'ERR_NOT_GZIP_ARCHIVE',
      `Response from ${urlForError} is not a gzip archive`,
      400,
    );
  }
  hash.update(buf);
  return { buffer: buf, sha256: hash.digest('hex'), bytes: totalBytes };
}

/**
 * Creates a Wallpaper Prism auto-updater bound to `pluginRoot` and `dataDir`.
 */
export function createPrismUpdater({
  pluginRoot,
  dataDir,
  currentVersion = '',
  repo = DEFAULT_REPO,
  apiBase = '',
  githubApiBaseUrl = '',
  githubWebBaseUrl = '',
  allowedHosts = null,
  updateCheckTtlMs = UPDATE_CHECK_TTL_MS,
  timeoutMs = UPDATE_REQUEST_TIMEOUT_MS,
  downloadTimeoutMs = UPDATE_DOWNLOAD_TIMEOUT_MS,
  managedSidecar = undefined,
  onBeforeSync = null,
  onRollback = null,
  onBeforeRestart = null,
  env = process.env,
  fetchImpl = fetch,
  nowFn = () => Date.now(),
  writeOverride = null,
} = {}) {
  const absPluginRoot = pluginRoot ? resolve(String(pluginRoot)) : '';
  const absDataDir = dataDir ? resolve(String(dataDir)) : '';
  const cacheDir = join(absDataDir, 'cache');
  const updatesDir = join(absDataDir, 'updates');
  const statusCachePath = join(cacheDir, 'update-status.json');
  const rateLimitPath = join(cacheDir, 'update-ratelimit.json');
  const journalPath = join(updatesDir, 'pending-journal.json');
  const justUpdatedPath = join(updatesDir, '.just-updated.json');

  const { owner, name: repoName, slug: repoSlug } = parseRepoSlug(repo);
  const escapedSlug = `${escapeRegExp(owner)}/${escapeRegExp(repoName)}`;

  const explicitApiBase = String(apiBase || githubApiBaseUrl || '').trim().replace(/\/+$/, '');
  const normalizedApiBase = explicitApiBase || DEFAULT_API_BASE;

  // Loopback origin is permitted ONLY when explicitly injected via `apiBase` / `githubApiBaseUrl` in tests.
  let injectedLoopbackOrigin = '';
  if (explicitApiBase && explicitApiBase !== DEFAULT_API_BASE) {
    try {
      const parsedApi = new URL(explicitApiBase);
      if (
        (parsedApi.protocol === 'http:' || parsedApi.protocol === 'https:')
        && parsedApi.username === ''
        && parsedApi.password === ''
        && LOOPBACK_HOSTS.has(parsedApi.hostname.toLowerCase())
      ) {
        injectedLoopbackOrigin = parsedApi.origin.toLowerCase();
      }
    } catch {
      /* invalid apiBase will be rejected on URL validation */
    }
  }

  const webBase = String(githubWebBaseUrl || '').trim().replace(/\/+$/, '')
    || (injectedLoopbackOrigin || DEFAULT_WEB_BASE);

  const effectiveAllowedHosts = new Set(
    Array.isArray(allowedHosts) && allowedHosts.length > 0
      ? allowedHosts.map((h) => String(h || '').trim().toLowerCase()).filter(Boolean)
      : ALLOWED_REDIRECT_HOSTS,
  );

  // Strict initial download URL allowlist regexes (server-resolved official GitHub URLs only)
  const officialTarballPatterns = [
    new RegExp(`^https://github\\.com/${escapedSlug}/releases/download/[^/?#]+/[^/?#]+\\.(?:tar\\.gz|tgz)$`, 'i'),
    new RegExp(`^https://api\\.github\\.com/repos/${escapedSlug}/tarball/[^/?#]+$`, 'i'),
    new RegExp(`^https://codeload\\.github\\.com/${escapedSlug}/tar\\.gz/[^?#]+$`, 'i'),
    new RegExp(`^https://github\\.com/${escapedSlug}/archive/refs/tags/[^/?#]+\\.tar\\.gz$`, 'i'),
  ];
  const officialSha256Pattern = new RegExp(
    `^https://github\\.com/${escapedSlug}/releases/download/[^/?#]+/[^/?#]+\\.(?:tar\\.gz|tgz)\\.sha256$`,
    'i',
  );

  const loopbackTarballPathPatterns = [
    new RegExp(`^/${escapedSlug}/releases/download/[^/?#]+/[^/?#]+\\.(?:tar\\.gz|tgz)$`, 'i'),
    new RegExp(`^/repos/${escapedSlug}/tarball/[^/?#]+$`, 'i'),
    new RegExp(`^/${escapedSlug}/tar\\.gz/[^?#]+$`, 'i'),
    new RegExp(`^/${escapedSlug}/archive/refs/tags/[^/?#]+\\.tar\\.gz$`, 'i'),
  ];
  const loopbackSha256PathPattern = new RegExp(
    `^/${escapedSlug}/releases/download/[^/?#]+/[^/?#]+\\.(?:tar\\.gz|tgz)\\.sha256$`,
    'i',
  );

  let memCache = null;
  let inFlightCheck = null;
  let applyInProgress = false;

  function resolveCurrentVersion() {
    if (currentVersion && String(currentVersion).trim()) {
      const parsed = parseSemver(currentVersion);
      return parsed ? parsed.version : String(currentVersion).trim();
    }
    if (absPluginRoot) {
      const manifest = readJsonSafe(join(absPluginRoot, 'plugin.json'));
      const parsed = parseSemver(manifest?.version);
      if (parsed) return parsed.version;
    }
    return '0.0.0';
  }

  function userAgent() {
    return `agy-wallpaper-prism/${resolveCurrentVersion()}`;
  }

  function assertAllowedRedirectUrl(rawUrl) {
    let u;
    try {
      u = new URL(String(rawUrl || ''));
    } catch {
      throw makeUpdaterError('ERR_UNTRUSTED_DOWNLOAD_URL', `Invalid URL "${rawUrl}"`, 400);
    }
    if (u.username !== '' || u.password !== '') {
      throw makeUpdaterError('ERR_UNTRUSTED_DOWNLOAD_URL', 'Credentials in download URL are forbidden', 400);
    }
    if (injectedLoopbackOrigin && u.origin.toLowerCase() === injectedLoopbackOrigin) {
      return u;
    }
    if (u.protocol !== 'https:') {
      throw makeUpdaterError(
        'ERR_UNTRUSTED_DOWNLOAD_URL',
        `Non-HTTPS protocol "${u.protocol}" forbidden for "${u.hostname}"`,
        400,
      );
    }
    if (!effectiveAllowedHosts.has(u.hostname.toLowerCase())) {
      throw makeUpdaterError(
        'ERR_UNTRUSTED_DOWNLOAD_URL',
        `Host "${u.hostname}" is not in the official GitHub allowlist`,
        400,
      );
    }
    return u;
  }

  function assertAllowedInitialTarballUrl(rawUrl) {
    const u = assertAllowedRedirectUrl(rawUrl);
    if (injectedLoopbackOrigin && u.origin.toLowerCase() === injectedLoopbackOrigin) {
      if (loopbackTarballPathPatterns.some((re) => re.test(u.pathname))) {
        return u;
      }
      throw makeUpdaterError(
        'ERR_UNTRUSTED_DOWNLOAD_URL',
        `Test tarball URL path "${u.pathname}" does not match repository allowlist`,
        400,
      );
    }
    if (officialTarballPatterns.some((re) => re.test(u.href))) {
      return u;
    }
    throw makeUpdaterError(
      'ERR_UNTRUSTED_DOWNLOAD_URL',
      `Initial tarball URL "${u.href}" does not match official ${repoSlug} release patterns`,
      400,
    );
  }

  function assertAllowedInitialSha256Url(rawUrl) {
    const u = assertAllowedRedirectUrl(rawUrl);
    if (injectedLoopbackOrigin && u.origin.toLowerCase() === injectedLoopbackOrigin) {
      if (loopbackSha256PathPattern.test(u.pathname)) {
        return u;
      }
      throw makeUpdaterError(
        'ERR_UNTRUSTED_DOWNLOAD_URL',
        `Test checksum URL path "${u.pathname}" does not match .sha256 allowlist`,
        400,
      );
    }
    if (officialSha256Pattern.test(u.href)) {
      return u;
    }
    throw makeUpdaterError(
      'ERR_UNTRUSTED_DOWNLOAD_URL',
      `Companion checksum URL "${u.href}" does not match official ${repoSlug} .sha256 pattern`,
      400,
    );
  }

  async function fetchWithManualRedirects({ initialUrl, assertInitialUrl, reqTimeoutMs }) {
    assertInitialUrl(initialUrl);
    let currentUrl = String(initialUrl);

    for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop += 1) {
      const res = await fetchImpl(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        headers: {
          'User-Agent': userAgent(),
          Accept: 'application/octet-stream, text/plain, */*',
        },
        signal: AbortSignal.timeout(reqTimeoutMs),
      });

      if (REDIRECT_STATUSES.has(res.status)) {
        try { res.body?.cancel?.().catch?.(() => {}); } catch { /* ignore */ }
        if (hop >= MAX_REDIRECT_HOPS) {
          throw makeUpdaterError(
            'ERR_TOO_MANY_REDIRECTS',
            `Exceeded maximum redirect hops (${MAX_REDIRECT_HOPS})`,
            400,
          );
        }
        const loc = String(res.headers?.get?.('location') || '').trim();
        if (!loc) {
          throw makeUpdaterError('ERR_DOWNLOAD_FAILED', `HTTP ${res.status} redirect missing Location header`, 502);
        }
        let nextUrl;
        try {
          nextUrl = new URL(loc, currentUrl).toString();
        } catch {
          throw makeUpdaterError('ERR_UNTRUSTED_DOWNLOAD_URL', `Invalid redirect Location "${loc}"`, 400);
        }
        assertAllowedRedirectUrl(nextUrl);
        currentUrl = nextUrl;
        continue;
      }

      return { res, finalUrl: currentUrl, hops: hop };
    }

    throw makeUpdaterError('ERR_TOO_MANY_REDIRECTS', `Exceeded maximum redirect hops (${MAX_REDIRECT_HOPS})`, 400);
  }

  async function fetchCompanionSha256(sha256Url) {
    let fetched;
    try {
      fetched = await fetchWithManualRedirects({
        initialUrl: sha256Url,
        assertInitialUrl: assertAllowedInitialSha256Url,
        reqTimeoutMs: timeoutMs,
      });
    } catch (err) {
      if (err?.code === 'ERR_UNTRUSTED_DOWNLOAD_URL' || err?.code === 'ERR_TOO_MANY_REDIRECTS') {
        throw err;
      }
      throw makeUpdaterError(
        'ERR_SHA256_FETCH_FAILED',
        `Failed to fetch companion .sha256 checksum: ${err?.message || String(err)}`,
        400,
      );
    }

    if (!fetched.res.ok) {
      throw makeUpdaterError(
        'ERR_SHA256_FETCH_FAILED',
        `Companion .sha256 checksum returned HTTP ${fetched.res.status}`,
        400,
      );
    }

    let payload;
    try {
      payload = await readResponseBytesBounded(fetched.res, {
        maxBytes: MAX_SHA256_BYTES,
        requireGzipMagic: false,
        urlForError: fetched.finalUrl,
      });
    } catch (err) {
      throw makeUpdaterError(
        'ERR_SHA256_FETCH_FAILED',
        `Companion .sha256 read failed: ${err?.message || String(err)}`,
        400,
      );
    }

    const digest = parseSha256Text(payload.buffer.toString('utf8'));
    if (!digest) {
      throw makeUpdaterError(
        'ERR_SHA256_FETCH_FAILED',
        'Companion .sha256 asset did not contain a valid 64-hex SHA-256 digest',
        400,
      );
    }
    return digest;
  }

  function loadDiskCache() {
    if (memCache) return memCache;
    const disk = readJsonSafe(statusCachePath);
    if (disk && typeof disk === 'object') {
      memCache = disk;
    }
    return memCache;
  }

  function saveDiskCache(record) {
    memCache = record;
    if (absDataDir) {
      try {
        mkdirSync(cacheDir, { recursive: true });
        writeAtomicJsonSync(statusCachePath, record);
      } catch {
        /* non-fatal cache write failure */
      }
    }
  }

  function parseReleasePayload(data) {
    if (!data || typeof data !== 'object') return null;
    if (data.draft === true || data.prerelease === true) return null;

    const tagName = String(data.tag_name || '').trim();
    const sem = parseSemver(tagName);
    if (!sem || sem.prerelease.length > 0) return null;

    const assets = Array.isArray(data.assets) ? data.assets : [];
    const primaryAsset =
      assets.find((a) => /^agy-wallpaper-prism.*\.(?:tar\.gz|tgz)$/i.test(String(a?.name || '')))
      || assets.find((a) => /\.(?:tar\.gz|tgz)$/i.test(String(a?.name || '')));

    let assetSource = 'source-tarball';
    let assetUrl = '';
    let sha256AssetUrl = '';
    let assetDigest = '';

    if (primaryAsset && typeof primaryAsset.browser_download_url === 'string' && primaryAsset.browser_download_url.trim()) {
      assetSource = 'release-tarball';
      assetUrl = primaryAsset.browser_download_url.trim();
      const rawDigest = String(primaryAsset.digest || '').trim();
      const digestMatch = /^sha256:([0-9a-f]{64})$/i.exec(rawDigest);
      if (digestMatch) {
        assetDigest = digestMatch[1].toLowerCase();
      }
      const expectedCompanionName = `${String(primaryAsset.name || '').toLowerCase()}.sha256`;
      const companion =
        assets.find((a) => String(a?.name || '').toLowerCase() === expectedCompanionName)
        || assets.find((a) => /\.(?:tar\.gz|tgz)\.sha256$/i.test(String(a?.name || '')));
      if (companion && typeof companion.browser_download_url === 'string' && companion.browser_download_url.trim()) {
        sha256AssetUrl = companion.browser_download_url.trim();
      }
    } else {
      assetSource = 'source-tarball';
      assetUrl =
        typeof data.tarball_url === 'string' && data.tarball_url.trim()
          ? data.tarball_url.trim()
          : `${normalizedApiBase}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/tarball/${encodeURIComponent(tagName)}`;
    }

    const releaseUrl =
      typeof data.html_url === 'string' && data.html_url.trim()
        ? data.html_url.trim()
        : `${DEFAULT_WEB_BASE}/${repoSlug}/releases/tag/${encodeURIComponent(tagName)}`;

    const changelog = truncateChangelog(data.body || '');

    return {
      latestVersion: sem.version,
      latestTag: tagName,
      releaseUrl,
      publishedAt: data.published_at || data.created_at || null,
      changelog,
      changelogSummary: extractChangelogSummary(changelog),
      assetSource,
      assetUrl,
      sha256AssetUrl,
      assetDigest,
      hasSha256: Boolean(assetDigest || sha256AssetUrl),
    };
  }

  async function probeLatestReleaseRedirect() {
    const url = `${webBase}/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/releases/latest`;
    try {
      const res = await fetchImpl(url, {
        method: 'HEAD',
        redirect: 'manual',
        headers: { 'User-Agent': userAgent() },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.status !== 301 && res.status !== 302) return null;
      const loc = String(res.headers?.get?.('location') || '').trim();
      const m = /\/releases\/tag\/([^/?#]+)/i.exec(loc);
      if (!m) return null;
      const tagName = decodeURIComponent(m[1]);
      const sem = parseSemver(tagName);
      if (!sem || sem.prerelease.length > 0) return null;
      return {
        latestVersion: sem.version,
        latestTag: tagName,
        releaseUrl: `${DEFAULT_WEB_BASE}/${repoSlug}/releases/tag/${encodeURIComponent(tagName)}`,
        publishedAt: null,
        changelog: '',
        changelogSummary: '',
        assetSource: 'source-tarball',
        assetUrl: `${normalizedApiBase}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/tarball/${encodeURIComponent(tagName)}`,
        sha256AssetUrl: '',
        assetDigest: '',
        hasSha256: false,
      };
    } catch {
      return null;
    }
  }

  function formatPublicStatus(cacheRec, { fromCache = false, offline = false, rateLimited = false } = {}) {
    const curVer = resolveCurrentVersion();
    const installEnv = inspectInstallEnvironment(absPluginRoot);
    const rel = cacheRec?.release || null;
    const latestVersion = rel?.latestVersion || null;
    const hasUpdate = !offline && Boolean(latestVersion && isNewerVersion(latestVersion, curVer));

    return {
      ok: true,
      currentVersion: curVer,
      latestVersion,
      latestTag: rel?.latestTag || null,
      hasUpdate,
      releaseUrl: rel?.releaseUrl || `${DEFAULT_WEB_BASE}/${repoSlug}/releases`,
      publishedAt: rel?.publishedAt || null,
      changelog: rel?.changelog || '',
      changelogSummary: rel?.changelogSummary || '',
      assetSource: rel?.assetSource || null,
      hasSha256: Boolean(rel?.hasSha256),
      fromCache: Boolean(fromCache),
      offline: Boolean(offline),
      rateLimited: Boolean(rateLimited),
      checkedAt: cacheRec?.checkedAt || null,
      canAutoUpdate: installEnv.canAutoUpdate,
      canSelfUpdate: installEnv.canSelfUpdate,
      blockReason: installEnv.blockReason,
      disabledReason: installEnv.disabledReason,
      installEnv,
      updateInProgress: applyInProgress,
    };
  }

  /**
   * Non-blocking synchronous read of cached update status (zero network).
   */
  function getCachedStatus() {
    const cached = loadDiskCache();
    return formatPublicStatus(cached, { fromCache: Boolean(cached), offline: false, rateLimited: false });
  }

  function getUpdateSummary() {
    const st = getCachedStatus();
    return {
      hasUpdate: st.hasUpdate,
      currentVersion: st.currentVersion,
      latestVersion: st.latestVersion,
      latestTag: st.latestTag,
      releaseUrl: st.releaseUrl,
      canAutoUpdate: st.canAutoUpdate,
      blockReason: st.blockReason,
    };
  }

  async function runCheckForUpdate({ force = false } = {}) {
    const nowMs = nowFn();
    const cached = loadDiskCache();

    // 1. Return valid TTL cache if not forced
    if (!force && cached && Number.isFinite(cached.checkedAtMs) && nowMs - cached.checkedAtMs < updateCheckTtlMs) {
      return formatPublicStatus(cached, { fromCache: true, offline: false, rateLimited: false });
    }

    // 2. Respect active rate-limit backoff window (with zero-quota HEAD redirect fallback)
    const rlState = readJsonSafe(rateLimitPath);
    if (!force && rlState && Number.isFinite(rlState.resetAtMs) && nowMs < rlState.resetAtMs) {
      const redirectRel = await probeLatestReleaseRedirect();
      const mergedRel =
        redirectRel && (!cached?.release || compareSemver(redirectRel.latestVersion, cached.release.latestVersion) > 0)
          ? redirectRel
          : cached?.release || null;
      const mergedRecord = {
        schemaVersion: 1,
        checkedAt: cached?.checkedAt || new Date(nowMs).toISOString(),
        checkedAtMs: cached?.checkedAtMs || nowMs,
        etag: cached?.etag || '',
        release: mergedRel,
      };
      if (redirectRel) saveDiskCache(mergedRecord);
      return formatPublicStatus(mergedRecord, {
        fromCache: Boolean(cached) && !redirectRel,
        offline: false,
        rateLimited: true,
      });
    }

    // 3. Query GitHub Releases `/repos/{owner}/{repo}/releases/latest`
    const releaseApiUrl = `${normalizedApiBase}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/releases/latest`;
    const headers = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': userAgent(),
    };
    if (cached?.etag) {
      headers['If-None-Match'] = cached.etag;
    }

    try {
      const res = await fetchImpl(releaseApiUrl, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (res.status === 304) {
        const refreshed = {
          schemaVersion: 1,
          checkedAt: new Date(nowMs).toISOString(),
          checkedAtMs: nowMs,
          etag: res.headers?.get?.('etag') || cached?.etag || '',
          release: cached?.release || null,
        };
        saveDiskCache(refreshed);
        return formatPublicStatus(refreshed, { fromCache: false, offline: false, rateLimited: false });
      }

      if (res.status === 200) {
        const data = await res.json();
        const parsedRel = parseReleasePayload(data);
        const record = {
          schemaVersion: 1,
          checkedAt: new Date(nowMs).toISOString(),
          checkedAtMs: nowMs,
          etag: res.headers?.get?.('etag') || '',
          release: parsedRel,
        };
        saveDiskCache(record);
        return formatPublicStatus(record, { fromCache: false, offline: false, rateLimited: false });
      }

      if (res.status === 404) {
        const record = {
          schemaVersion: 1,
          checkedAt: new Date(nowMs).toISOString(),
          checkedAtMs: nowMs,
          etag: res.headers?.get?.('etag') || '',
          release: null,
        };
        saveDiskCache(record);
        return formatPublicStatus(record, { fromCache: false, offline: false, rateLimited: false });
      }

      const bodyText = await res.text().catch(() => '');
      if (isRateLimitResponse(res, bodyText)) {
        const resetAtMs = computeRateLimitResetMs(res, nowMs);
        if (absDataDir) {
          try {
            mkdirSync(cacheDir, { recursive: true });
            writeAtomicJsonSync(rateLimitPath, {
              schemaVersion: 1,
              resetAtMs,
              recordedAt: new Date(nowMs).toISOString(),
            });
          } catch {
            /* ignore */
          }
        }
        const redirectRel = await probeLatestReleaseRedirect();
        const mergedRel =
          redirectRel && (!cached?.release || compareSemver(redirectRel.latestVersion, cached.release.latestVersion) > 0)
            ? redirectRel
            : cached?.release || null;
        const record = {
          schemaVersion: 1,
          checkedAt: new Date(nowMs).toISOString(),
          checkedAtMs: nowMs,
          etag: cached?.etag || '',
          release: mergedRel,
        };
        if (redirectRel) saveDiskCache(record);
        return formatPublicStatus(record, { fromCache: false, offline: false, rateLimited: true });
      }

      // Unexpected HTTP status -> fail silent offline-safe
      return formatPublicStatus(cached, { fromCache: false, offline: true, rateLimited: false });
    } catch {
      // Offline / DNS / timeout -> fail silent, never throw
      return formatPublicStatus(cached, { fromCache: false, offline: true, rateLimited: false });
    }
  }

  /**
   * Checks GitHub for newer stable releases with single-flight deduplication and 6h TTL cache.
   */
  async function checkForUpdate({ force = false } = {}) {
    if (!force && inFlightCheck) return inFlightCheck;
    const promise = runCheckForUpdate({ force }).finally(() => {
      if (inFlightCheck === promise) inFlightCheck = null;
    });
    if (!force) inFlightCheck = promise;
    return promise;
  }

  /**
   * Runs boot-time crash-recovery journal replay/rollback and sweeps retired `.old.<ts>` files.
   */
  function recoverPendingJournal() {
    const swept = absDataDir ? sweepRetiredFiles(updatesDir) : { removed: 0, remaining: 0 };
    if (!absDataDir || !existsSync(journalPath)) {
      return { recovered: false, action: 'none', swept };
    }

    const journal = readJsonSafe(journalPath);
    if (!journal || typeof journal !== 'object') {
      rmSync(journalPath, { force: true });
      return { recovered: false, action: 'corrupt-cleared', swept };
    }

    const targetDir = journal.pluginRoot ? resolve(String(journal.pluginRoot)) : absPluginRoot;
    const envCheck = inspectInstallEnvironment(targetDir);
    if (envCheck.isSymlink || envCheck.isGitCheckout) {
      rmSync(journalPath, { force: true });
      return { recovered: false, action: 'blocked-env-cleared', swept };
    }

    try {
      if (journal.stagingBundleDir && existsSync(join(journal.stagingBundleDir, 'plugin.json'))) {
        let stageValid = false;
        try {
          validateStagedPlugin({
            stageDir: journal.stagingBundleDir,
            requireNewerVersion: false,
          });
          stageValid = true;
        } catch {
          stageValid = false;
        }

        if (stageValid) {
          syncDirectoryLockSafe({
            stagingBundleDir: journal.stagingBundleDir,
            targetPluginDir: targetDir,
            updatesDir,
            preservePaths: journal.preservePaths || ['.prism-install-id'],
            nowMs: nowFn(),
          });
          if (journal.stagingRootDir) {
            rmSync(journal.stagingRootDir, { recursive: true, force: true });
          }
          rmSync(journalPath, { force: true });
          return { recovered: true, action: 'completed-forward', toVersion: journal.toVersion || null, swept };
        }
      }

      if (journal.backupDir && existsSync(join(journal.backupDir, 'plugin.json'))) {
        syncDirectoryLockSafe({
          stagingBundleDir: journal.backupDir,
          targetPluginDir: targetDir,
          updatesDir,
          preservePaths: journal.preservePaths || ['.prism-install-id'],
          nowMs: nowFn(),
        });
        if (journal.stagingRootDir) {
          rmSync(journal.stagingRootDir, { recursive: true, force: true });
        } else {
          rmSync(journal.backupDir, { recursive: true, force: true });
        }
        rmSync(journalPath, { force: true });
        return { recovered: true, action: 'rolled-back', fromVersion: journal.fromVersion || null, swept };
      }
    } catch (err) {
      return { recovered: false, action: 'error', error: err?.message || String(err), swept };
    }

    rmSync(journalPath, { force: true });
    return { recovered: false, action: 'stale-cleared', swept };
  }

  /**
   * Consumes and deletes `${dataDir}/updates/.just-updated.json` on post-update sidecar boot.
   */
  function consumeJustUpdatedMarker() {
    if (!absDataDir || !existsSync(justUpdatedPath)) return null;
    const marker = readJsonSafe(justUpdatedPath);
    try { rmSync(justUpdatedPath, { force: true }); } catch { /* ignore */ }
    return marker;
  }

  /**
   * Executes the full hardened self-update pipeline:
   * - Single-flight mutex (`409 ERR_UPDATE_IN_PROGRESS`)
   * - Rejects `.git` dev checkout (`409 ERR_GIT_DEV_CHECKOUT`) & symlinked root (`409 ERR_SYMLINK_PLUGIN_ROOT`)
   * - Zero client-supplied URLs (only optional SemVer `expectedVersion` / `targetTag`)
   * - Manual per-hop HTTPS redirect allowlist (`<= 5` hops) + fail-closed SHA-256 verification
   * - Pure-Node safe tarball extraction & pre-swap validation gate
   * - Backup + `onBeforeSync` + crash-recovery journal + lock-safe in-place sync preserving `.prism-install-id`
   * - Synchronous rollback in `catch` (+ `onRollback`) + `canary.json` `arming` settlement
   */
  async function applyUpdate({ expectedVersion = '', targetTag = '', _writeOverride = null } = {}) {
    // Reject invalid client-supplied target version format (never accept URLs or paths)
    const rawTarget = String(expectedVersion || targetTag || '').trim();
    let expectedSem = null;
    if (rawTarget) {
      if (!/^v?\d+\.\d+\.\d+$/.test(rawTarget)) {
        throw makeUpdaterError(
          'ERR_INVALID_TARGET_VERSION',
          `Invalid expectedVersion/targetTag "${rawTarget}" (must match vX.Y.Z)`,
          400,
        );
      }
      expectedSem = parseSemver(rawTarget);
    }

    if (applyInProgress) {
      throw makeUpdaterError('ERR_UPDATE_IN_PROGRESS', 'An update is already in progress', 409);
    }

    applyInProgress = true;
    const opId = `upd-${nowFn()}-${randomBytes(4).toString('hex')}`;
    const stagingRootDir = join(updatesDir, 'staging', opId);
    const bundleDir = join(stagingRootDir, 'bundle');
    const backupDir = join(stagingRootDir, 'backup');

    let beforeSyncCalled = false;
    let syncStarted = false;

    try {
      // 1. Pre-flight install environment guards
      const envInfo = inspectInstallEnvironment(absPluginRoot);
      if (envInfo.isSymlink) {
        throw makeUpdaterError(
          'ERR_SYMLINK_PLUGIN_ROOT',
          'Refusing to overwrite a symlinked plugin root directory',
          409,
        );
      }
      if (envInfo.isGitCheckout) {
        throw makeUpdaterError(
          'ERR_GIT_DEV_CHECKOUT',
          'Refusing to overwrite a Git development checkout; update via git pull && node scripts/build.mjs && node scripts/install-local.mjs',
          409,
        );
      }
      if (!existsSync(absPluginRoot)) {
        throw makeUpdaterError('ERR_PLUGIN_ROOT_MISSING', `Plugin root does not exist: ${absPluginRoot}`, 400);
      }

      // 2. Server-side release resolution from official GitHub API (zero client URLs)
      const currentVer = resolveCurrentVersion();
      const status = await runCheckForUpdate({ force: true });
      if (status.offline) {
        throw makeUpdaterError('ERR_UPDATE_OFFLINE', 'Unable to reach GitHub Releases API to resolve latest update', 502);
      }

      const releaseMeta = memCache?.release || null;
      if (!releaseMeta || !releaseMeta.latestVersion || !isNewerVersion(releaseMeta.latestVersion, currentVer)) {
        return {
          ok: true,
          updated: false,
          alreadyUpToDate: true,
          updatedFrom: currentVer,
          updatedTo: currentVer,
          fromVersion: currentVer,
          toVersion: currentVer,
          tag: releaseMeta?.latestTag || '',
          sha256: '',
          channel: releaseMeta?.assetSource || 'none',
          retiredFiles: [],
          willRestart: false,
          restartRequired: false,
          restartMode: 'none',
          message: `Already up to date (v${currentVer}).`,
        };
      }

      if (expectedSem && releaseMeta.latestVersion !== expectedSem.version) {
        throw makeUpdaterError(
          'ERR_VERSION_MISMATCH',
          `Expected version ${expectedSem.version} does not match latest official release ${releaseMeta.latestVersion}`,
          409,
        );
      }

      // 3. Determine expected SHA-256 (FAIL-CLOSED whenever asset.digest or companion .sha256 is advertised)
      let expectedSha256 = releaseMeta.assetDigest || '';
      if (!expectedSha256 && releaseMeta.sha256AssetUrl) {
        expectedSha256 = await fetchCompanionSha256(releaseMeta.sha256AssetUrl);
      }

      // 4. Download tarball with manual per-hop HTTPS redirect allowlisting & streaming SHA-256
      mkdirSync(stagingRootDir, { recursive: true });
      const fetched = await fetchWithManualRedirects({
        initialUrl: releaseMeta.assetUrl,
        assertInitialUrl: assertAllowedInitialTarballUrl,
        reqTimeoutMs: downloadTimeoutMs,
      });
      if (!fetched.res.ok) {
        throw makeUpdaterError(
          'ERR_DOWNLOAD_FAILED',
          `Tarball download returned HTTP ${fetched.res.status}`,
          502,
        );
      }

      const dlResult = await readResponseBytesBounded(fetched.res, {
        maxBytes: MAX_DOWNLOAD_BYTES,
        requireGzipMagic: true,
        urlForError: fetched.finalUrl,
      });

      if (expectedSha256 && dlResult.sha256.toLowerCase() !== expectedSha256.toLowerCase()) {
        throw makeUpdaterError(
          'ERR_SHA256_MISMATCH',
          `Tarball SHA-256 mismatch: expected ${expectedSha256}, got ${dlResult.sha256}`,
          400,
        );
      }

      // 5. Pure-Node safe extraction + Pre-Swap Validation Gate (strictly out-of-tree)
      extractSafeTarGz({
        tarGzBuffer: dlResult.buffer,
        destDir: bundleDir,
      });

      const staged = validateStagedPlugin({
        stageDir: bundleDir,
        currentVersion: currentVer,
        requireNewerVersion: true,
      });

      if (expectedSem && staged.version !== expectedSem.version) {
        throw makeUpdaterError(
          'ERR_INVALID_BUNDLE',
          `Staged plugin.json version ${staged.version} does not match expected version ${expectedSem.version}`,
          400,
        );
      }

      // 6. Snapshot current installation -> backupDir (excluding node_modules, .git, *.old.*)
      cpSync(absPluginRoot, backupDir, {
        recursive: true,
        dereference: true,
        filter: (p) => {
          const norm = String(p).replace(/\\/g, '/');
          if (norm.includes('/node_modules') || norm.endsWith('/.git')) return false;
          if (RETIRED_FILE_RE.test(norm)) return false;
          return true;
        },
      });

      // 7. Pause host script watcher before mutating pluginRoot
      if (typeof onBeforeSync === 'function') {
        await onBeforeSync({
          fromVersion: currentVer,
          toVersion: staged.version,
          tag: releaseMeta.latestTag,
        });
      }
      beforeSyncCalled = true;

      // 8. Persist crash-recovery journal via fsync before touching target files
      mkdirSync(updatesDir, { recursive: true });
      writeFsyncJsonSync(journalPath, {
        version: 1,
        opId,
        action: 'self-update',
        pluginRoot: absPluginRoot,
        fromVersion: currentVer,
        toVersion: staged.version,
        stagingRootDir,
        stagingBundleDir: bundleDir,
        backupDir,
        preservePaths: ['.prism-install-id'],
        startedAt: new Date(nowFn()).toISOString(),
      });

      // 9. Windows lock-safe in-place sync preserving `.prism-install-id`
      syncStarted = true;
      const syncStats = syncDirectoryLockSafe({
        stagingBundleDir: bundleDir,
        targetPluginDir: absPluginRoot,
        updatesDir,
        preservePaths: ['.prism-install-id'],
        nowMs: nowFn(),
        writeOverride: _writeOverride || writeOverride,
      });

      // 10. Clear journal & temporary staging/backup artifacts
      rmSync(journalPath, { force: true });
      rmSync(stagingRootDir, { recursive: true, force: true });

      // 11. Settle any active `canary.json` `arming` state before restart
      settleArmingCanary(absDataDir, nowFn());

      // 12. Record `.just-updated.json` marker for post-restart Studio iframe reload
      writeAtomicJsonSync(justUpdatedPath, {
        fromVersion: currentVer,
        toVersion: staged.version,
        tag: releaseMeta.latestTag || `v${staged.version}`,
        sha256: dlResult.sha256,
        updatedAt: new Date(nowFn()).toISOString(),
      });

      const managed = isManagedSidecar(env, managedSidecar);
      const willRestart = Boolean(managed);
      const restartMode = willRestart ? 'managed-exit-1' : 'standalone-manual';

      if (willRestart && typeof onBeforeRestart === 'function') {
        await onBeforeRestart({
          fromVersion: currentVer,
          toVersion: staged.version,
          tag: releaseMeta.latestTag || `v${staged.version}`,
        });
      }

      return {
        ok: true,
        updated: true,
        updatedFrom: currentVer,
        updatedTo: staged.version,
        fromVersion: currentVer,
        toVersion: staged.version,
        tag: releaseMeta.latestTag || `v${staged.version}`,
        sha256: dlResult.sha256,
        channel: releaseMeta.assetSource,
        retiredFiles: syncStats.retiredFiles,
        willRestart,
        restartRequired: !willRestart,
        restartMode,
        message: willRestart
          ? `Updated Wallpaper Prism from v${currentVer} to v${staged.version}; restarting sidecar.`
          : `Updated Wallpaper Prism from v${currentVer} to v${staged.version}; restart the standalone sidecar process to activate.`,
      };
    } catch (err) {
      let rollbackOk = false;
      if (syncStarted && existsSync(join(backupDir, 'plugin.json'))) {
        try {
          syncDirectoryLockSafe({
            stagingBundleDir: backupDir,
            targetPluginDir: absPluginRoot,
            updatesDir,
            preservePaths: ['.prism-install-id'],
            nowMs: nowFn(),
          });
          rollbackOk = true;
        } catch {
          // Leave pending-journal.json & backupDir intact for boot-time crash recovery
          rollbackOk = false;
        }
      }

      if (!syncStarted || rollbackOk) {
        try { rmSync(journalPath, { force: true }); } catch { /* ignore */ }
        try { rmSync(stagingRootDir, { recursive: true, force: true }); } catch { /* ignore */ }
      }

      if (beforeSyncCalled && typeof onRollback === 'function') {
        try {
          await onRollback(err);
        } catch {
          /* preserve original error */
        }
      }

      throw err;
    } finally {
      applyInProgress = false;
    }
  }

  return {
    checkForUpdate,
    checkForUpdates: checkForUpdate,
    getCachedStatus,
    getUpdateSummary,
    applyUpdate,
    recoverPendingJournal,
    recoverPendingUpdateOnBoot: recoverPendingJournal,
    sweepRetiredFiles: () => (absDataDir ? sweepRetiredFiles(updatesDir) : { removed: 0, remaining: 0 }),
    consumeJustUpdatedMarker,
    inspectInstallEnvironment: () => inspectInstallEnvironment(absPluginRoot),
    isManagedSidecar: () => isManagedSidecar(env, managedSidecar),
    isUpdateInProgress: () => applyInProgress,
  };
}
