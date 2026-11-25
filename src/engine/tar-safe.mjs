/**
 * Pure-Node POSIX USTAR + PAX Safe `.tar.gz` Extractor, Pre-Swap Plugin Validator
 * & Deterministic Archive Builder (`src/engine/tar-safe.mjs`).
 *
 * Zero external npm dependencies, zero shell execution.
 * Enforces:
 * - Decompressed cap <= 50 MiB, per-file cap <= 25 MiB, entry cap <= 1000
 * - Symlink / hardlink / special device rejection (typeflags != '0', '\0', '5', 'x', 'g', 'L')
 * - Zip-Slip containment check via `path.relative` + NUL / drive / `..` rejection
 * - Windows reserved device-name (`CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9`) & case-collision rejection
 * - 9-root runtime allowlist matching `scripts/install-local.mjs`
 * - Pre-swap validation of `plugin.json` (10-key whitelist, `name`, SemVer `isNewerVersion`),
 *   `package.json`, `sidecar.json`, 14 required runtime files, and prebuilt `sidecars/prism_studio/index.html`
 */

import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, join, posix, relative, resolve } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import { compareSemver, isNewerVersion, parseSemver } from '../shared/semver.mjs';

export const MAX_DECOMPRESSED_BYTES = 50 * 1024 * 1024; // 50 MiB
export const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MiB
export const MAX_TAR_ENTRIES = 1000;
const MAX_META_PAYLOAD_BYTES = 64 * 1024; // 64 KiB cap for PAX / GNU LongName headers

export const EXPECTED_PLUGIN_NAME = 'agy-wallpaper-prism';

export const DEFAULT_ALLOWED_ROOTS = Object.freeze([
  'plugin.json',
  'package.json',
  'README.md',
  'assets',
  'skills',
  'sidecars',
  'src',
  'host',
  'docs',
]);

export const ALLOWED_PLUGIN_JSON_KEYS = Object.freeze([
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

const ALLOWED_PLUGIN_JSON_KEY_SET = new Set(ALLOWED_PLUGIN_JSON_KEYS);

export const REQUIRED_RUNTIME_FILES = Object.freeze([
  'plugin.json',
  'assets/logo.svg',
  'skills/wallpaper-prism/SKILL.md',
  'sidecars/prism_studio/sidecar.json',
  'sidecars/prism_studio/main.mjs',
  'sidecars/prism_studio/cdp-bridge.mjs',
  'sidecars/prism_studio/index.html',
  'src/shared/schema.mjs',
  'src/shared/i18n.mjs',
  'src/engine/index.mjs',
  'src/host/index.mjs',
  'src/host/wallpaper-inject.js',
  'src/host/panel-inject.js',
  'host/cli.mjs',
]);

const WINDOWS_RESERVED_SEGMENT_RE = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
const CONTROL_CHAR_RE = /[\x00-\x1f]/;

function makeTarError(code, message, statusCode = 400) {
  const err = new Error(`${code}: ${message}`);
  err.code = code;
  err.statusCode = statusCode;
  return err;
}

function readCleanString(buf, start, length) {
  const sub = buf.subarray(start, start + length);
  const nul = sub.indexOf(0);
  return (nul === -1 ? sub : sub.subarray(0, nul)).toString('utf8');
}

function parseTarOctal(buf, start, length) {
  if ((buf[start] & 0x80) !== 0) {
    let val = 0n;
    for (let i = start + 1; i < start + length; i += 1) {
      val = (val << 8n) | BigInt(buf[i]);
    }
    if (val > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw makeTarError('ERR_TAR_CORRUPT', 'Tar header numeric field exceeds safe integer range');
    }
    return Number(val);
  }
  const str = readCleanString(buf, start, length).trim();
  if (!str) return 0;
  if (!/^[0-7]+$/.test(str)) {
    throw makeTarError('ERR_TAR_CORRUPT', `Invalid octal header value "${str}"`);
  }
  const parsed = parseInt(str, 8);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw makeTarError('ERR_TAR_CORRUPT', `Invalid octal header value "${str}"`);
  }
  return parsed;
}

export function parsePaxRecords(buf) {
  const attrs = {};
  let offset = 0;
  while (offset < buf.length) {
    const sp = buf.indexOf(0x20, offset);
    if (sp === -1) break;
    const lenStr = buf.subarray(offset, sp).toString('ascii');
    if (!/^\d+$/.test(lenStr)) break;
    const len = parseInt(lenStr, 10);
    if (!Number.isSafeInteger(len) || len <= sp - offset + 1 || offset + len > buf.length) break;
    let end = offset + len;
    if (buf[end - 1] === 0x0a) end -= 1;
    const record = buf.subarray(sp + 1, end).toString('utf8');
    const eq = record.indexOf('=');
    if (eq !== -1) {
      attrs[record.slice(0, eq)] = record.slice(eq + 1);
    }
    offset += len;
  }
  return attrs;
}

export function encodePaxRecord(key, value) {
  const body = `${key}=${value}\n`;
  const bodyBytes = Buffer.byteLength(body, 'utf8');
  let totalLen = String(bodyBytes + 3).length + 1 + bodyBytes;
  while (String(totalLen).length + 1 + bodyBytes !== totalLen) {
    totalLen = String(totalLen).length + 1 + bodyBytes;
  }
  return Buffer.from(`${totalLen} ${body}`, 'utf8');
}

/**
 * Validates and normalizes an archive-relative POSIX path.
 * Rejects NUL/control characters, absolute/drive paths, `..` traversal,
 * NTFS alternate data stream colons, trailing dots/spaces, and Windows reserved device names.
 */
export function validateSafeRelPath(rawPath, { allowEmpty = false } = {}) {
  if (typeof rawPath !== 'string' || rawPath.length === 0) {
    throw makeTarError('ERR_TAR_UNSAFE_PATH', 'Empty archive path');
  }
  if (CONTROL_CHAR_RE.test(rawPath)) {
    throw makeTarError('ERR_TAR_UNSAFE_PATH', 'Control or NUL byte in archive path');
  }

  const norm = rawPath.replace(/\\/g, '/');
  if (norm.startsWith('/') || /^[A-Za-z]:/.test(norm)) {
    throw makeTarError('ERR_TAR_UNSAFE_PATH', `Absolute archive path "${rawPath}" prohibited`);
  }

  const clean = [];
  for (const seg of norm.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') {
      throw makeTarError('ERR_TAR_PATH_TRAVERSAL', `Parent traversal ".." prohibited ("${rawPath}")`);
    }
    if (seg.includes(':')) {
      throw makeTarError('ERR_TAR_UNSAFE_PATH', `Colon in path segment "${seg}" prohibited ("${rawPath}")`);
    }
    if (WINDOWS_RESERVED_SEGMENT_RE.test(seg)) {
      throw makeTarError('ERR_TAR_RESERVED_NAME', `Windows reserved device name "${seg}" prohibited ("${rawPath}")`);
    }
    if (/[. ]$/.test(seg)) {
      throw makeTarError('ERR_TAR_UNSAFE_PATH', `Trailing dot or space in "${seg}" prohibited ("${rawPath}")`);
    }
    clean.push(seg);
  }

  if (clean.length === 0) {
    if (allowEmpty) return '';
    throw makeTarError('ERR_TAR_UNSAFE_PATH', `Archive path "${rawPath}" resolves to empty path`);
  }

  return clean.join('/');
}

function assertNoCaseCollisions(filesMap) {
  const seenLowerFiles = new Map();
  const seenLowerDirs = new Map();

  for (const relPath of filesMap.keys()) {
    const lower = relPath.toLowerCase();
    const existingFile = seenLowerFiles.get(lower);
    if (existingFile !== undefined) {
      throw makeTarError(
        'ERR_TAR_CASE_COLLISION',
        `Case-colliding archive file paths: "${existingFile}" vs "${relPath}"`,
      );
    }
    if (seenLowerDirs.has(lower)) {
      throw makeTarError(
        'ERR_TAR_CASE_COLLISION',
        `Archive file "${relPath}" collides case-insensitively with directory "${seenLowerDirs.get(lower)}"`,
      );
    }
    seenLowerFiles.set(lower, relPath);

    const parts = relPath.split('/');
    let prefix = '';
    for (let i = 0; i < parts.length - 1; i += 1) {
      prefix = prefix ? `${prefix}/${parts[i]}` : parts[i];
      const lowerPrefix = prefix.toLowerCase();
      if (seenLowerFiles.has(lowerPrefix)) {
        throw makeTarError(
          'ERR_TAR_CASE_COLLISION',
          `Archive directory "${prefix}" collides case-insensitively with file "${seenLowerFiles.get(lowerPrefix)}"`,
        );
      }
      const existingDir = seenLowerDirs.get(lowerPrefix);
      if (existingDir !== undefined && existingDir !== prefix) {
        throw makeTarError(
          'ERR_TAR_CASE_COLLISION',
          `Case-colliding archive directories: "${existingDir}" vs "${prefix}"`,
        );
      }
      seenLowerDirs.set(lowerPrefix, prefix);
    }
  }
}

function normalizeAllowedRoots(allowedRoots) {
  if (allowedRoots === null) return null;
  const list = Array.isArray(allowedRoots) ? allowedRoots : DEFAULT_ALLOWED_ROOTS;
  return list
    .map((entry) => String(entry || '').trim().replace(/\\/g, '/').replace(/^\.\/+/, '').replace(/\/+$/, ''))
    .filter(Boolean);
}

export function isPathAllowedByRoots(relPath, allowedRoots = DEFAULT_ALLOWED_ROOTS) {
  const norm = String(relPath || '').replace(/\\/g, '/');
  if (!norm) return false;
  const segs = norm.split('/');
  if (segs.some((s) => s.toLowerCase() === 'node_modules')) return false;
  if (norm.toLowerCase().endsWith('.tmp')) return false;

  const roots = normalizeAllowedRoots(allowedRoots);
  if (roots === null) return true;
  return roots.some((root) => norm === root || norm.startsWith(`${root}/`));
}

/**
 * Parses a `.tar.gz` buffer into `{ files, globalPax, strippedTopDir, entryCount, totalFileBytes }`.
 */
export function parseTarGzWithMeta(
  compressedInput,
  {
    maxUncompressedBytes = MAX_DECOMPRESSED_BYTES,
    maxFileBytes = MAX_FILE_BYTES,
    maxEntries = MAX_TAR_ENTRIES,
    stripSingleTopDir = true,
  } = {},
) {
  const compressedBuf = Buffer.isBuffer(compressedInput)
    ? compressedInput
    : compressedInput instanceof Uint8Array
      ? Buffer.from(compressedInput.buffer, compressedInput.byteOffset, compressedInput.byteLength)
      : null;

  if (!compressedBuf || compressedBuf.length === 0) {
    throw makeTarError('ERR_TAR_EMPTY', 'Archive buffer is empty');
  }
  if (compressedBuf.length < 2 || compressedBuf[0] !== 0x1f || compressedBuf[1] !== 0x8b) {
    throw makeTarError('ERR_NOT_GZIP_ARCHIVE', 'Archive buffer does not start with gzip magic bytes (0x1f 0x8b)');
  }

  let tarBuf;
  try {
    tarBuf = gunzipSync(compressedBuf, { maxOutputLength: maxUncompressedBytes });
  } catch (err) {
    const msg = err?.message || String(err);
    if (err?.code === 'ERR_BUFFER_TOO_LARGE' || /maxOutputLength|output length|limit/i.test(msg)) {
      throw makeTarError(
        'ERR_TAR_DECOMPRESSED_TOO_LARGE',
        `Decompressed archive exceeds ${maxUncompressedBytes} bytes limit`,
      );
    }
    throw makeTarError('ERR_TAR_GUNZIP', msg);
  }

  const rawFiles = new Map();
  const seenRawLowerFiles = new Map();
  const seenRawLowerDirs = new Map();

  let offset = 0;
  let nextPax = {};
  let globalPax = {};
  let nextLongName = '';
  let entryCount = 0;
  let headerCount = 0;
  let totalFileBytes = 0;
  let consecutiveZeroBlocks = 0;
  const maxHeaders = maxEntries * 4 + 32;

  while (offset + 512 <= tarBuf.length) {
    const header = tarBuf.subarray(offset, offset + 512);
    offset += 512;

    let allZero = true;
    for (let i = 0; i < 512; i += 1) {
      if (header[i] !== 0) {
        allZero = false;
        break;
      }
    }
    if (allZero) {
      consecutiveZeroBlocks += 1;
      if (consecutiveZeroBlocks >= 2) break;
      continue;
    }
    consecutiveZeroBlocks = 0;

    headerCount += 1;
    if (headerCount > maxHeaders) {
      throw makeTarError('ERR_TAR_TOO_MANY_ENTRIES', `Archive header count exceeds limit (${maxHeaders})`);
    }

    const namePart = readCleanString(header, 0, 100);
    const prefixPart = readCleanString(header, 345, 155);
    const typeFlag = header[156] === 0 ? '0' : String.fromCharCode(header[156]);
    let size = parseTarOctal(header, 124, 12);

    if (nextPax.size !== undefined) {
      const sizeStr = String(nextPax.size).trim();
      if (!/^\d+$/.test(sizeStr)) {
        throw makeTarError('ERR_TAR_CORRUPT', `Invalid PAX size "${nextPax.size}"`);
      }
      size = Number(sizeStr);
      if (!Number.isSafeInteger(size) || size < 0) {
        throw makeTarError('ERR_TAR_CORRUPT', `PAX size out of safe integer range: "${nextPax.size}"`);
      }
    }

    if (typeFlag === 'x' || typeFlag === 'g' || typeFlag === 'L') {
      if (size > MAX_META_PAYLOAD_BYTES) {
        throw makeTarError('ERR_TAR_CORRUPT', `Tar metadata header payload too large (${size} bytes)`);
      }
    } else if (typeFlag === '0' && size > maxFileBytes) {
      throw makeTarError('ERR_TAR_FILE_TOO_LARGE', `Archive entry exceeds per-file limit (${maxFileBytes} bytes)`);
    }

    if (offset + size > tarBuf.length) {
      throw makeTarError('ERR_TAR_TRUNCATED', 'Archive truncated mid-entry');
    }

    const payload = tarBuf.subarray(offset, offset + size);
    offset += Math.ceil(size / 512) * 512;

    if (typeFlag === 'x') {
      nextPax = parsePaxRecords(payload);
      continue;
    }
    if (typeFlag === 'g') {
      globalPax = { ...globalPax, ...parsePaxRecords(payload) };
      continue;
    }
    if (typeFlag === 'L') {
      nextLongName = readCleanString(payload, 0, payload.length);
      continue;
    }

    const mergedPax = { ...globalPax, ...nextPax };
    nextPax = {};
    const entryName = nextLongName || mergedPax.path || (prefixPart ? `${prefixPart}/${namePart}` : namePart);
    nextLongName = '';

    if (typeFlag === '1' || typeFlag === '2') {
      throw makeTarError(
        'ERR_TAR_SYMLINK_FORBIDDEN',
        `Link entry "${entryName}" (typeflag=${typeFlag}) is forbidden`,
      );
    }
    if (typeFlag !== '0' && typeFlag !== '5') {
      throw makeTarError(
        'ERR_TAR_UNSUPPORTED_TYPE',
        `Disallowed entry type "${typeFlag}" for "${entryName}"`,
      );
    }

    entryCount += 1;
    if (entryCount > maxEntries) {
      throw makeTarError('ERR_TAR_TOO_MANY_ENTRIES', `Archive exceeds maximum entry limit (${maxEntries})`);
    }

    const isDirEntry = typeFlag === '5' || (entryName.endsWith('/') && size === 0);
    if (isDirEntry) {
      validateSafeRelPath(entryName, { allowEmpty: true });
      continue;
    }

    if (entryName.endsWith('/')) {
      throw makeTarError('ERR_TAR_UNSAFE_PATH', `Non-empty file entry cannot end with "/" ("${entryName}")`);
    }

    const safe = validateSafeRelPath(entryName, { allowEmpty: false });
    const lower = safe.toLowerCase();
    if (seenRawLowerFiles.has(lower)) {
      throw makeTarError(
        'ERR_TAR_CASE_COLLISION',
        `Duplicate or case-colliding archive path: "${seenRawLowerFiles.get(lower)}" vs "${safe}"`,
      );
    }
    if (seenRawLowerDirs.has(lower)) {
      throw makeTarError(
        'ERR_TAR_CASE_COLLISION',
        `Archive file "${safe}" collides case-insensitively with directory "${seenRawLowerDirs.get(lower)}"`,
      );
    }
    seenRawLowerFiles.set(lower, safe);

    const segs = safe.split('/');
    let dirPrefix = '';
    for (let i = 0; i < segs.length - 1; i += 1) {
      dirPrefix = dirPrefix ? `${dirPrefix}/${segs[i]}` : segs[i];
      const lowerDir = dirPrefix.toLowerCase();
      if (seenRawLowerFiles.has(lowerDir)) {
        throw makeTarError(
          'ERR_TAR_CASE_COLLISION',
          `Archive directory "${dirPrefix}" collides case-insensitively with file "${seenRawLowerFiles.get(lowerDir)}"`,
        );
      }
      const existingDir = seenRawLowerDirs.get(lowerDir);
      if (existingDir !== undefined && existingDir !== dirPrefix) {
        throw makeTarError(
          'ERR_TAR_CASE_COLLISION',
          `Case-colliding archive directories: "${existingDir}" vs "${dirPrefix}"`,
        );
      }
      seenRawLowerDirs.set(lowerDir, dirPrefix);
    }

    totalFileBytes += size;
    if (totalFileBytes > maxUncompressedBytes) {
      throw makeTarError(
        'ERR_TAR_DECOMPRESSED_TOO_LARGE',
        `Total extracted bytes exceed ${maxUncompressedBytes} bytes limit`,
      );
    }

    rawFiles.set(safe, Buffer.from(payload));
  }

  let files = rawFiles;
  let strippedTopDir = '';

  if (stripSingleTopDir && !rawFiles.has('plugin.json') && rawFiles.size > 0) {
    const roots = new Set();
    let allNested = true;
    for (const p of rawFiles.keys()) {
      const idx = p.indexOf('/');
      if (idx === -1) {
        allNested = false;
        break;
      }
      roots.add(p.slice(0, idx));
    }
    if (allNested && roots.size === 1) {
      const [onlyRoot] = roots;
      strippedTopDir = onlyRoot;
      const unwrapped = new Map();
      for (const [p, buf] of rawFiles.entries()) {
        const sub = p.slice(onlyRoot.length + 1);
        const safeSub = validateSafeRelPath(sub, { allowEmpty: false });
        unwrapped.set(safeSub, buf);
      }
      assertNoCaseCollisions(unwrapped);
      files = unwrapped;
    }
  }

  return { files, globalPax, strippedTopDir, entryCount, totalFileBytes };
}

export function parseTarGzToMap(compressedBuf, opts = {}) {
  return parseTarGzWithMeta(compressedBuf, opts).files;
}

/**
 * Safely extracts a `.tar.gz` buffer into `destDir`, applying the 9-root runtime allowlist,
 * strict `path.relative` Zip-Slip containment check, and real-file-only materialization.
 */
export function extractSafeTarGz({
  tarGzBuffer,
  destDir,
  allowedRoots = DEFAULT_ALLOWED_ROOTS,
  maxDecompressedBytes = MAX_DECOMPRESSED_BYTES,
  maxFileBytes = MAX_FILE_BYTES,
  maxEntries = MAX_TAR_ENTRIES,
  stripSingleTopDir = true,
} = {}) {
  if (!destDir || typeof destDir !== 'string') {
    throw makeTarError('ERR_TAR_DEST_REQUIRED', 'destDir must be a non-empty path string');
  }

  const buf = typeof tarGzBuffer === 'string' ? readFileSync(tarGzBuffer) : tarGzBuffer;
  const parsed = parseTarGzWithMeta(buf, {
    maxUncompressedBytes: maxDecompressedBytes,
    maxFileBytes,
    maxEntries,
    stripSingleTopDir,
  });

  const absDest = resolve(destDir);
  mkdirSync(absDest, { recursive: true });

  const writtenFiles = [];
  let skippedCount = 0;
  let totalBytes = 0;

  for (const [relPath, fileBuf] of parsed.files.entries()) {
    if (!isPathAllowedByRoots(relPath, allowedRoots)) {
      skippedCount += 1;
      continue;
    }

    const safeSub = validateSafeRelPath(relPath, { allowEmpty: false });
    const fullOut = resolve(absDest, safeSub);
    const relCheck = relative(absDest, fullOut);
    if (!relCheck || relCheck.startsWith('..') || isAbsolute(relCheck)) {
      throw makeTarError('ERR_TAR_ESCAPE', `Resolved output path escaped destination ("${safeSub}")`);
    }

    mkdirSync(dirname(fullOut), { recursive: true });
    writeFileSync(fullOut, fileBuf);
    writtenFiles.push(safeSub);
    totalBytes += fileBuf.length;
  }

  if (writtenFiles.length === 0) {
    throw makeTarError('ERR_TAR_NO_PLUGIN_FILES', 'Archive yielded 0 allowed runtime plugin files');
  }

  return {
    writtenCount: writtenFiles.length,
    skippedCount,
    totalBytes,
    files: writtenFiles,
    strippedTopDir: parsed.strippedTopDir,
    globalPax: parsed.globalPax,
  };
}

function assertNoSymlinksRecursive(dirPath) {
  for (const name of readdirSync(dirPath)) {
    const full = join(dirPath, name);
    const lst = lstatSync(full);
    if (lst.isSymbolicLink()) {
      throw makeTarError('ERR_INVALID_BUNDLE', `Symlink forbidden in staged plugin bundle: "${name}"`);
    }
    if (lst.isDirectory()) {
      assertNoSymlinksRecursive(full);
    }
  }
}

function readStagedJsonFile(absStage, relPath) {
  const full = resolve(absStage, relPath);
  const relCheck = relative(absStage, full);
  if (!relCheck || relCheck.startsWith('..') || isAbsolute(relCheck)) {
    throw makeTarError('ERR_INVALID_BUNDLE', `Invalid staged file path "${relPath}"`);
  }
  if (!existsSync(full)) {
    throw makeTarError('ERR_INVALID_BUNDLE', `Staged plugin missing required JSON file "${relPath}"`);
  }
  const lst = lstatSync(full);
  if (lst.isSymbolicLink() || !lst.isFile()) {
    throw makeTarError('ERR_INVALID_BUNDLE', `Staged file "${relPath}" must be a regular file`);
  }
  try {
    const parsed = JSON.parse(readFileSync(full, 'utf8').replace(/^\uFEFF/, ''));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('not a JSON object');
    }
    return parsed;
  } catch (err) {
    throw makeTarError('ERR_INVALID_BUNDLE', `Malformed JSON in "${relPath}": ${err?.message || String(err)}`);
  }
}

/**
 * Pre-swap validation gate executed strictly on an out-of-tree staged plugin directory
 * before any file in `pluginRoot` is touched.
 */
export function validateStagedPlugin({
  stageDir,
  currentVersion = '',
  requireNewerVersion = true,
  minIndexHtmlBytes = 10 * 1024,
} = {}) {
  if (!stageDir || typeof stageDir !== 'string') {
    throw makeTarError('ERR_INVALID_BUNDLE', 'stageDir is required');
  }

  const absStage = resolve(stageDir);
  if (!existsSync(absStage)) {
    throw makeTarError('ERR_INVALID_BUNDLE', `Staged directory does not exist: ${absStage}`);
  }
  const rootStat = lstatSync(absStage);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    throw makeTarError('ERR_INVALID_BUNDLE', 'Staged directory must be a real directory');
  }

  // Defense in depth: guarantee zero symlinks exist anywhere in the staged bundle
  assertNoSymlinksRecursive(absStage);

  // 1. Validate `plugin.json` (10-key whitelist, exact name, valid SemVer, newer than currentVersion)
  const manifest = readStagedJsonFile(absStage, 'plugin.json');
  const unknownKeys = Object.keys(manifest).filter((k) => !ALLOWED_PLUGIN_JSON_KEY_SET.has(k));
  if (unknownKeys.length > 0) {
    throw makeTarError(
      'ERR_INVALID_BUNDLE',
      `plugin.json contains disallowed key(s): ${unknownKeys.join(', ')}`,
    );
  }
  if (manifest.name !== EXPECTED_PLUGIN_NAME) {
    throw makeTarError(
      'ERR_INVALID_BUNDLE',
      `plugin.json name "${String(manifest.name || '')}" does not match "${EXPECTED_PLUGIN_NAME}"`,
    );
  }
  const stagedSem = parseSemver(manifest.version);
  if (!stagedSem) {
    throw makeTarError(
      'ERR_INVALID_BUNDLE',
      `plugin.json has invalid SemVer version "${String(manifest.version || '')}"`,
    );
  }
  if (currentVersion && requireNewerVersion) {
    if (!isNewerVersion(stagedSem.version, currentVersion) || compareSemver(stagedSem.version, currentVersion) <= 0) {
      throw makeTarError(
        'ERR_INVALID_BUNDLE',
        `Staged version "${stagedSem.version}" is not newer than current version "${currentVersion}" (downgrade/replay blocked)`,
      );
    }
  }

  // 2. Validate `package.json` sync
  const pkg = readStagedJsonFile(absStage, 'package.json');
  if (pkg.name !== EXPECTED_PLUGIN_NAME) {
    throw makeTarError(
      'ERR_INVALID_BUNDLE',
      `package.json name "${String(pkg.name || '')}" does not match "${EXPECTED_PLUGIN_NAME}"`,
    );
  }
  if (String(pkg.version || '').trim() !== stagedSem.version) {
    throw makeTarError(
      'ERR_INVALID_BUNDLE',
      `package.json version "${String(pkg.version || '')}" does not match plugin.json version "${stagedSem.version}"`,
    );
  }

  // 3. Validate `sidecars/prism_studio/sidecar.json`
  const sidecar = readStagedJsonFile(absStage, 'sidecars/prism_studio/sidecar.json');
  if (
    sidecar.command !== 'node'
    || !Array.isArray(sidecar.args)
    || sidecar.args[0] !== 'main.mjs'
    || sidecar.restart_policy !== 'on-failure'
  ) {
    throw makeTarError(
      'ERR_INVALID_BUNDLE',
      'sidecars/prism_studio/sidecar.json violates required sidecar contract (node main.mjs + on-failure)',
    );
  }

  // 4. Verify all 14 required runtime files exist as non-empty regular files
  for (const relPath of REQUIRED_RUNTIME_FILES) {
    const full = resolve(absStage, relPath);
    const relCheck = relative(absStage, full);
    if (!relCheck || relCheck.startsWith('..') || isAbsolute(relCheck) || !existsSync(full)) {
      throw makeTarError('ERR_INVALID_BUNDLE', `Missing required runtime file: ${relPath}`);
    }
    const lst = lstatSync(full);
    if (lst.isSymbolicLink() || !lst.isFile() || lst.size <= 0) {
      throw makeTarError('ERR_INVALID_BUNDLE', `Required runtime file is empty or invalid: ${relPath}`);
    }
  }

  // 5. Verify prebuilt `sidecars/prism_studio/index.html` integrity
  const indexHtmlPath = resolve(absStage, 'sidecars/prism_studio/index.html');
  const indexHtmlBuf = readFileSync(indexHtmlPath);
  if (indexHtmlBuf.length <= minIndexHtmlBytes) {
    throw makeTarError(
      'ERR_INVALID_BUNDLE',
      `Prebuilt sidecars/prism_studio/index.html is unexpectedly small (${indexHtmlBuf.length} bytes <= ${minIndexHtmlBytes})`,
    );
  }
  const indexHtml = indexHtmlBuf.toString('utf8');
  if (
    !/<style\b/i.test(indexHtml)
    || !/<script\b/i.test(indexHtml)
    || !indexHtml.includes('id="app"')
  ) {
    throw makeTarError(
      'ERR_INVALID_BUNDLE',
      'Prebuilt sidecars/prism_studio/index.html missing required <style>, <script>, or id="app"',
    );
  }
  if (
    /<script\b[^>]*\btype\s*=\s*["']module["'][^>]*\bsrc\s*=/i.test(indexHtml)
    || /<script\b[^>]*\bsrc\s*=[^>]*\btype\s*=\s*["']module["']/i.test(indexHtml)
  ) {
    throw makeTarError(
      'ERR_INVALID_BUNDLE',
      'sidecars/prism_studio/index.html contains unbundled external <script type="module" src=...> tag',
    );
  }

  return {
    ok: true,
    version: stagedSem.version,
    manifest,
    pkg,
    sidecar,
    requiredFiles: [...REQUIRED_RUNTIME_FILES],
  };
}

function writeOctal(buf, strVal, offset, length) {
  const oct = strVal.padStart(length - 1, '0');
  buf.write(oct, offset, length - 1, 'ascii');
  buf[offset + length - 1] = 0;
}

function buildUstarHeader(relPath, byteLength, mode = 0o644, typeFlagChar = '0') {
  const header = Buffer.alloc(512, 0);
  const safe = validateSafeRelPath(relPath, { allowEmpty: false });
  let name = safe;
  let prefix = '';

  if (Buffer.byteLength(safe, 'utf8') > 100) {
    const slash = safe.lastIndexOf('/');
    if (slash !== -1) {
      prefix = safe.slice(0, slash);
      name = safe.slice(slash + 1);
    }
  }

  while (Buffer.byteLength(name, 'utf8') > 100) name = name.slice(0, -1);
  while (Buffer.byteLength(prefix, 'utf8') > 155) prefix = prefix.slice(0, -1);

  header.write(name, 0, Math.min(100, Buffer.byteLength(name, 'utf8')), 'utf8');
  writeOctal(header, mode.toString(8), 100, 8);
  writeOctal(header, '0', 108, 8);
  writeOctal(header, '0', 116, 8);
  writeOctal(header, byteLength.toString(8), 124, 12);
  writeOctal(header, '0', 136, 12); // mtime = 0 for reproducible archives
  header.fill(0x20, 148, 156);
  header.write(typeFlagChar, 156, 1, 'ascii');
  header.write('ustar\0', 257, 6, 'ascii');
  header.write('00', 263, 2, 'ascii');
  if (prefix) header.write(prefix, 345, Math.min(155, Buffer.byteLength(prefix, 'utf8')), 'utf8');

  let sum = 0;
  for (let i = 0; i < 512; i += 1) sum += header[i];
  header.write(sum.toString(8).padStart(6, '0'), 148, 6, 'ascii');
  header[154] = 0;
  header[155] = 0x20;
  return header;
}

/**
 * Builds a deterministic POSIX USTAR/PAX `.tar.gz` buffer from a Map or plain object of `{ relPath: Buffer|string }`.
 */
export function createDeterministicTarGz(entries, { forcePax = false } = {}) {
  const pairs = entries instanceof Map ? [...entries.entries()] : Object.entries(entries || {});
  const sorted = pairs
    .map(([p, content]) => [
      validateSafeRelPath(p, { allowEmpty: false }),
      Buffer.isBuffer(content) ? content : Buffer.from(String(content), 'utf8'),
    ])
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

  const chunks = [];
  let paxSeq = 0;
  for (const [relPath, buf] of sorted) {
    const slash = relPath.lastIndexOf('/');
    const baseName = slash === -1 ? relPath : relPath.slice(slash + 1);
    const dirPrefix = slash === -1 ? '' : relPath.slice(0, slash);
    const needsPax =
      forcePax
      || Buffer.byteLength(baseName, 'utf8') > 100
      || Buffer.byteLength(dirPrefix, 'utf8') > 155;

    if (needsPax) {
      paxSeq += 1;
      const paxPayload = Buffer.concat([
        encodePaxRecord('mtime', '0'),
        encodePaxRecord('path', relPath),
        encodePaxRecord('size', String(buf.length)),
      ]);
      chunks.push(buildUstarHeader(`PaxHeader/entry-${paxSeq}`, paxPayload.length, 0o644, 'x'));
      chunks.push(paxPayload);
      const paxRem = paxPayload.length % 512;
      if (paxRem !== 0) chunks.push(Buffer.alloc(512 - paxRem, 0));
    }

    const mode = relPath.startsWith('bin/') || relPath.endsWith('.sh') ? 0o755 : 0o644;
    chunks.push(buildUstarHeader(relPath, buf.length, mode, '0'));
    chunks.push(buf);
    const rem = buf.length % 512;
    if (rem !== 0) chunks.push(Buffer.alloc(512 - rem, 0));
  }
  chunks.push(Buffer.alloc(1024, 0));

  const gz = gzipSync(Buffer.concat(chunks), { level: 9 });
  if (gz.length >= 10 && gz[0] === 0x1f && gz[1] === 0x8b) {
    // Normalize gzip header mtime & OS byte for byte-for-byte reproducibility across Windows/macOS/Linux
    gz[4] = 0;
    gz[5] = 0;
    gz[6] = 0;
    gz[7] = 0;
    gz[9] = 3;
  }
  return gz;
}

export function collectDirectoryFilesMap(rootDir, includePaths = DEFAULT_ALLOWED_ROOTS, { excludeFilter = null } = {}) {
  const map = new Map();
  const absRoot = resolve(rootDir);

  function walk(absCurrent, relPosix) {
    if (excludeFilter && excludeFilter(relPosix, absCurrent)) return;
    const lst = lstatSync(absCurrent);
    if (lst.isSymbolicLink()) return;
    if (lst.isDirectory()) {
      for (const child of readdirSync(absCurrent).sort()) {
        walk(join(absCurrent, child), relPosix ? posix.join(relPosix, child) : child);
      }
    } else if (lst.isFile()) {
      map.set(relPosix, readFileSync(absCurrent));
    }
  }

  for (const item of includePaths) {
    const absItem = resolve(absRoot, item);
    try {
      if (existsSync(absItem)) {
        walk(absItem, item.replace(/\\/g, '/'));
      }
    } catch {
      /* skip absent optional path */
    }
  }
  return map;
}
