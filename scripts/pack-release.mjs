#!/usr/bin/env node
// Deterministic Zero-Dependency GitHub Release Packager (`scripts/pack-release.mjs`) for `agy-wallpaper-prism`.
//
// Unconditionally builds 3 reproducible cross-platform release artifacts in `dist/`:
//   1. `agy-wallpaper-prism-v<version>.tar.gz`       (POSIX USTAR + PAX, mtime=0, uid=0, gid=0, deterministic order)
//   2. `agy-wallpaper-prism-v<version>.tar.gz.sha256` (`<64-hex>  agy-wallpaper-prism-v<version>.tar.gz\n`)
//   3. `agy-wallpaper-prism-v<version>.zip`          (pure-Node `zlib.deflateRawSync` + IEEE CRC-32, zero shell/zip binary)
//
// Self-validates the generated `.tar.gz` against `src/engine/tar-safe.mjs` security & runtime invariants:
//   - entries <= 1000, uncompressed <= 50 MiB, per-file <= 25 MiB
//   - zero symlinks/hardlinks, zero Zip-Slip / absolute / Windows-reserved / case-colliding paths
//   - valid 10-key `plugin.json` (`name === 'agy-wallpaper-prism'`), synced `package.json` & `PLUGIN_VERSION`
//   - all required runtime files including pure-LF prebuilt `sidecars/prism_studio/index.html`

import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { deflateRawSync, gunzipSync, gzipSync } from 'node:zlib';
import { buildStudioBundle } from './build.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

export const MAX_TAR_ENTRIES = 1000;
export const MAX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024; // 50 MiB
export const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MiB

export const ALLOWED_PLUGIN_JSON_KEYS = new Set([
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

// Exact 9 runtime roots matching `scripts/install-local.mjs`
export const RELEASE_ROOTS = Object.freeze([
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

export const REQUIRED_RUNTIME_FILES = Object.freeze([
  'plugin.json',
  'package.json',
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

const FORBIDDEN_TOP_DIRS = new Set(['.git', '.github', 'test', 'dist', 'swarm', 'node_modules', 'out-host', '.studio-data']);
const WINDOWS_RESERVED_BASENAME_RE = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC32_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

export function validateSafeRelPath(rawPath) {
  if (typeof rawPath !== 'string' || !rawPath.length) {
    throw new Error('ERR_PACK_UNSAFE_PATH: Empty archive path');
  }
  if (rawPath.includes('\0')) {
    throw new Error('ERR_PACK_UNSAFE_PATH: NUL byte in archive path');
  }
  const norm = rawPath.replace(/\\/g, '/');
  if (norm.startsWith('/') || /^[A-Za-z]:/.test(norm)) {
    throw new Error(`ERR_PACK_UNSAFE_PATH: Absolute archive path "${rawPath}" prohibited`);
  }
  const clean = [];
  for (const seg of norm.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') {
      throw new Error(`ERR_PACK_PATH_TRAVERSAL: Parent traversal ".." prohibited ("${rawPath}")`);
    }
    if (WINDOWS_RESERVED_BASENAME_RE.test(seg)) {
      throw new Error(`ERR_PACK_RESERVED_NAME: Windows reserved path segment "${seg}" in "${rawPath}"`);
    }
    clean.push(seg);
  }
  if (clean.length === 0) {
    throw new Error(`ERR_PACK_UNSAFE_PATH: Path resolved to empty ("${rawPath}")`);
  }
  return clean.join('/');
}

function defaultExcludeFilter(relPosix) {
  const norm = String(relPosix || '').replace(/\\/g, '/');
  const segs = norm.split('/').filter(Boolean);
  if (segs.length === 0) return false;
  if (FORBIDDEN_TOP_DIRS.has(segs[0])) return true;
  for (const seg of segs) {
    if (seg === '.git' || seg === 'node_modules' || seg === 'dist' || seg === 'swarm') return true;
    if (seg.startsWith('.tmp') || seg.endsWith('.tmp') || seg.includes('.tmp.')) return true;
    if (seg === '.prism-install-id' || seg === '.DS_Store' || seg === 'Thumbs.db' || seg === 'Desktop.ini' || seg === '.gitkeep') {
      return true;
    }
    if (/\.old\.\d+$/.test(seg) || seg.endsWith('.log')) return true;
  }
  return false;
}

export function collectDirectoryFilesMap(rootDir, includePaths = RELEASE_ROOTS, { excludeFilter = defaultExcludeFilter } = {}) {
  const map = new Map();
  const seenLower = new Set();
  const absRoot = resolve(rootDir);

  function walk(absCurrent, relPosix) {
    if (excludeFilter && excludeFilter(relPosix, absCurrent)) return;
    const st = lstatSync(absCurrent);
    if (st.isSymbolicLink()) {
      throw new Error(`ERR_PACK_SYMLINK_FORBIDDEN: Symlink "${relPosix}" is forbidden inside release archive`);
    }
    if (st.isDirectory()) {
      const children = readdirSync(absCurrent).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
      for (const child of children) {
        walk(join(absCurrent, child), relPosix ? posix.join(relPosix, child) : child);
      }
    } else if (st.isFile()) {
      const safe = validateSafeRelPath(relPosix);
      const lower = safe.toLowerCase();
      if (seenLower.has(lower)) {
        throw new Error(`ERR_PACK_CASE_COLLISION: Case-insensitive duplicate path "${safe}"`);
      }
      seenLower.add(lower);
      map.set(safe, readFileSync(absCurrent));
    }
  }

  for (const item of includePaths) {
    const absItem = resolve(absRoot, item);
    if (!existsSync(absItem)) continue;
    walk(absItem, item.replace(/\\/g, '/'));
  }
  return map;
}

function encodePaxRecord(key, value) {
  const body = `${key}=${value}\n`;
  const bodyBytes = Buffer.byteLength(body, 'utf8');
  let totalLen = String(bodyBytes + 3).length + 1 + bodyBytes;
  while (String(totalLen).length + 1 + bodyBytes !== totalLen) {
    totalLen = String(totalLen).length + 1 + bodyBytes;
  }
  return Buffer.from(`${totalLen} ${body}`, 'utf8');
}

function writeOctal(buf, strVal, offset, length) {
  const oct = strVal.padStart(length - 1, '0');
  if (oct.length > length - 1) {
    throw new Error(`ERR_TAR_OCTAL_OVERFLOW: Value "${strVal}" exceeds field width ${length - 1}`);
  }
  buf.write(oct, offset, length - 1, 'ascii');
  buf[offset + length - 1] = 0;
}

function buildUstarHeader(relPath, byteLength, mode = 0o644, typeFlagChar = '0') {
  const header = Buffer.alloc(512, 0);
  const safe = validateSafeRelPath(relPath);
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
  writeOctal(header, '0', 108, 8); // uid = 0
  writeOctal(header, '0', 116, 8); // gid = 0
  writeOctal(header, byteLength <= 0o77777777777 ? byteLength.toString(8) : '0', 124, 12);
  writeOctal(header, '0', 136, 12); // mtime = 0 for reproducible builds
  header.fill(0x20, 148, 156); // checksum field placeholder spaces
  header.write(typeFlagChar, 156, 1, 'ascii');
  header.write('ustar\0', 257, 6, 'ascii');
  header.write('00', 263, 2, 'ascii');
  if (prefix) header.write(prefix, 345, Math.min(155, Buffer.byteLength(prefix, 'utf8')), 'utf8');

  let sum = 0;
  for (let i = 0; i < 512; i++) sum += header[i];
  header.write(sum.toString(8).padStart(6, '0'), 148, 6, 'ascii');
  header[154] = 0;
  header[155] = 0x20;
  return header;
}

function normalizeSortedEntries(entries) {
  const pairs = entries instanceof Map ? [...entries.entries()] : Object.entries(entries || {});
  const seenLower = new Set();
  const normalized = pairs.map(([p, content]) => {
    const safe = validateSafeRelPath(p);
    const lower = safe.toLowerCase();
    if (seenLower.has(lower)) {
      throw new Error(`ERR_PACK_CASE_COLLISION: Case-insensitive duplicate path "${safe}"`);
    }
    seenLower.add(lower);
    const buf = Buffer.isBuffer(content) ? content : Buffer.from(String(content), 'utf8');
    return [safe, buf];
  });
  normalized.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return normalized;
}

export function createDeterministicTarGz(entries, { forcePax = false } = {}) {
  const sorted = normalizeSortedEntries(entries);
  const chunks = [];
  let paxSeq = 0;

  for (const [relPath, buf] of sorted) {
    const slash = relPath.lastIndexOf('/');
    const baseName = slash === -1 ? relPath : relPath.slice(slash + 1);
    const dirPrefix = slash === -1 ? '' : relPath.slice(0, slash);
    const hasNonAscii = /[^\x20-\x7e]/.test(relPath);
    const needsPax =
      forcePax ||
      hasNonAscii ||
      Buffer.byteLength(baseName, 'utf8') > 100 ||
      Buffer.byteLength(dirPrefix, 'utf8') > 155 ||
      buf.length > 0o77777777777;

    if (needsPax) {
      const paxPayload = Buffer.concat([
        encodePaxRecord('mtime', '0'),
        encodePaxRecord('path', relPath),
        encodePaxRecord('size', String(buf.length)),
      ]);
      chunks.push(buildUstarHeader(`PaxHeader/entry-${++paxSeq}`, paxPayload.length, 0o644, 'x'));
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

  // POSIX tar EOF: two 512-byte zero blocks
  chunks.push(Buffer.alloc(1024, 0));

  const gz = gzipSync(Buffer.concat(chunks), { level: 9 });
  // Zero RFC-1952 GZIP MTIME (bytes 4..7) & normalize OS (byte 9 = 3 Unix) for cross-OS reproducibility
  if (gz.length >= 10 && gz[0] === 0x1f && gz[1] === 0x8b) {
    gz[4] = 0;
    gz[5] = 0;
    gz[6] = 0;
    gz[7] = 0;
    gz[9] = 3;
  }
  return gz;
}

export function createDeterministicZip(entries) {
  const sorted = normalizeSortedEntries(entries);
  const DOS_TIME = 0x0000; // 00:00:00
  const DOS_DATE = 0x0021; // 1980-01-01
  const UTF8_FLAG = 0x0800;

  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const [relPath, rawBuf] of sorted) {
    const nameBuf = Buffer.from(relPath, 'utf8');
    const checksum = crc32(rawBuf);
    const deflated = deflateRawSync(rawBuf, { level: 9 });
    const useDeflate = deflated.length < rawBuf.length;
    const method = useDeflate ? 8 : 0;
    const compBuf = useDeflate ? deflated : rawBuf;
    const mode = relPath.startsWith('bin/') || relPath.endsWith('.sh') ? 0o755 : 0o644;
    const externalAttr = ((0o100000 | mode) << 16) >>> 0;

    // Local File Header (30 bytes + filename)
    const lfh = Buffer.alloc(30);
    lfh.writeUInt32LE(0x04034b50, 0);
    lfh.writeUInt16LE(20, 4); // version needed to extract (2.0)
    lfh.writeUInt16LE(UTF8_FLAG, 6);
    lfh.writeUInt16LE(method, 8);
    lfh.writeUInt16LE(DOS_TIME, 10);
    lfh.writeUInt16LE(DOS_DATE, 12);
    lfh.writeUInt32LE(checksum, 14);
    lfh.writeUInt32LE(compBuf.length, 18);
    lfh.writeUInt32LE(rawBuf.length, 22);
    lfh.writeUInt16LE(nameBuf.length, 26);
    lfh.writeUInt16LE(0, 28); // extra field length

    localParts.push(lfh, nameBuf, compBuf);

    // Central Directory File Header (46 bytes + filename)
    const cdfh = Buffer.alloc(46);
    cdfh.writeUInt32LE(0x02014b50, 0);
    cdfh.writeUInt16LE((3 << 8) | 20, 4); // version made by: Unix (3) + 2.0
    cdfh.writeUInt16LE(20, 6); // version needed to extract
    cdfh.writeUInt16LE(UTF8_FLAG, 8);
    cdfh.writeUInt16LE(method, 10);
    cdfh.writeUInt16LE(DOS_TIME, 12);
    cdfh.writeUInt16LE(DOS_DATE, 14);
    cdfh.writeUInt32LE(checksum, 16);
    cdfh.writeUInt32LE(compBuf.length, 20);
    cdfh.writeUInt32LE(rawBuf.length, 24);
    cdfh.writeUInt16LE(nameBuf.length, 28);
    cdfh.writeUInt16LE(0, 30); // extra field length
    cdfh.writeUInt16LE(0, 32); // file comment length
    cdfh.writeUInt16LE(0, 34); // disk number start
    cdfh.writeUInt16LE(0, 36); // internal file attributes
    cdfh.writeUInt32LE(externalAttr, 38);
    cdfh.writeUInt32LE(offset, 42); // relative offset of local header

    centralParts.push(cdfh, nameBuf);
    offset += lfh.length + nameBuf.length + compBuf.length;
  }

  const centralDirBuf = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4); // disk number
  eocd.writeUInt16LE(0, 6); // central dir start disk
  eocd.writeUInt16LE(sorted.length, 8);
  eocd.writeUInt16LE(sorted.length, 10);
  eocd.writeUInt32LE(centralDirBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...localParts, centralDirBuf, eocd]);
}

function readCleanTarString(buf, start, length) {
  const sub = buf.subarray(start, start + length);
  const nul = sub.indexOf(0);
  return (nul === -1 ? sub : sub.subarray(0, nul)).toString('utf8');
}

function parseTarOctal(buf, start, length) {
  const str = readCleanTarString(buf, start, length).trim();
  if (!str) return 0;
  const parsed = parseInt(str, 8);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`ERR_TAR_CORRUPT: Invalid octal header value "${str}"`);
  }
  return parsed;
}

function parsePaxRecords(buf) {
  const attrs = {};
  let offset = 0;
  while (offset < buf.length) {
    const sp = buf.indexOf(0x20, offset);
    if (sp === -1) break;
    const len = parseInt(buf.subarray(offset, sp).toString('ascii'), 10);
    if (!Number.isFinite(len) || len <= sp - offset + 1 || offset + len > buf.length) break;
    let end = offset + len;
    if (buf[end - 1] === 0x0a) end -= 1;
    const record = buf.subarray(sp + 1, end).toString('utf8');
    const eq = record.indexOf('=');
    if (eq !== -1) attrs[record.slice(0, eq)] = record.slice(eq + 1);
    offset += len;
  }
  return attrs;
}

/**
 * Round-trip validator mirroring `src/engine/tar-safe.mjs` security & runtime invariants.
 */
export function validateTarGzArchive(gzBuf, { expectedVersion = '' } = {}) {
  if (!Buffer.isBuffer(gzBuf) || gzBuf.length < 18 || gzBuf[0] !== 0x1f || gzBuf[1] !== 0x8b) {
    throw new Error('ERR_TAR_INVALID_GZIP: Archive missing gzip magic bytes 1f 8b');
  }
  const tarBuf = gunzipSync(gzBuf, { maxOutputLength: MAX_UNCOMPRESSED_BYTES });
  if (tarBuf.length > MAX_UNCOMPRESSED_BYTES) {
    throw new Error(`ERR_TAR_TOO_LARGE: Uncompressed tar (${tarBuf.length} B) exceeds 50 MiB cap`);
  }

  const files = new Map();
  const seenLower = new Set();
  let offset = 0;
  let entryCount = 0;
  let nextPax = {};
  let globalPax = {};
  let nextLongName = '';

  while (offset + 512 <= tarBuf.length) {
    const header = tarBuf.subarray(offset, offset + 512);
    offset += 512;

    let allZero = true;
    for (let i = 0; i < 512; i++) {
      if (header[i] !== 0) {
        allZero = false;
        break;
      }
    }
    if (allZero) continue;

    // Verify USTAR header checksum
    const storedChecksum = parseTarOctal(header, 148, 8);
    let computedChecksum = 0;
    for (let i = 0; i < 512; i++) {
      computedChecksum += i >= 148 && i < 156 ? 0x20 : header[i];
    }
    if (computedChecksum !== storedChecksum) {
      throw new Error(`ERR_TAR_CHECKSUM: Header checksum mismatch (${computedChecksum} !== ${storedChecksum})`);
    }

    const namePart = readCleanTarString(header, 0, 100);
    const prefixPart = readCleanTarString(header, 345, 155);
    const typeFlag = header[156] === 0 ? '0' : String.fromCharCode(header[156]);
    let size = parseTarOctal(header, 124, 12);
    if (nextPax.size !== undefined) size = Number(nextPax.size);

    if (offset + size > tarBuf.length) {
      throw new Error('ERR_TAR_TRUNCATED: Archive truncated mid-entry');
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
      nextLongName = readCleanTarString(payload, 0, payload.length);
      continue;
    }

    const mergedPax = { ...globalPax, ...nextPax };
    nextPax = {};
    const entryName = nextLongName || mergedPax.path || (prefixPart ? `${prefixPart}/${namePart}` : namePart);
    nextLongName = '';

    if (typeFlag === '1' || typeFlag === '2') {
      throw new Error(`ERR_TAR_SYMLINK_FORBIDDEN: Link entry "${entryName}" (typeflag=${typeFlag}) forbidden`);
    }
    if (typeFlag !== '0' && typeFlag !== '5') {
      throw new Error(`ERR_TAR_UNSUPPORTED_TYPE: Disallowed entry type "${typeFlag}" for "${entryName}"`);
    }

    const safe = validateSafeRelPath(entryName);
    if (typeFlag === '5' || entryName.endsWith('/')) continue;

    entryCount++;
    if (entryCount > MAX_TAR_ENTRIES) {
      throw new Error(`ERR_TAR_TOO_MANY_ENTRIES: Exceeded ${MAX_TAR_ENTRIES} entries`);
    }
    if (payload.length > MAX_FILE_BYTES) {
      throw new Error(`ERR_TAR_FILE_TOO_LARGE: "${safe}" (${payload.length} B) exceeds 25 MiB cap`);
    }
    const lower = safe.toLowerCase();
    if (seenLower.has(lower)) {
      throw new Error(`ERR_TAR_CASE_COLLISION: Duplicate case-insensitive entry "${safe}"`);
    }
    seenLower.add(lower);

    const topDir = safe.split('/')[0];
    if (FORBIDDEN_TOP_DIRS.has(topDir) || safe === '.prism-install-id') {
      throw new Error(`ERR_TAR_FORBIDDEN_FILE: Forbidden path "${safe}" found in release archive`);
    }
    files.set(safe, Buffer.from(payload));
  }

  // Validate plugin.json inside the archive
  const manifestBuf = files.get('plugin.json');
  if (!manifestBuf) {
    throw new Error('ERR_TAR_MISSING_MANIFEST: plugin.json missing from archive root');
  }
  const manifest = JSON.parse(manifestBuf.toString('utf8'));
  for (const key of Object.keys(manifest)) {
    if (!ALLOWED_PLUGIN_JSON_KEYS.has(key)) {
      throw new Error(`ERR_MANIFEST_PURITY: Forbidden key "${key}" in plugin.json`);
    }
  }
  if (manifest.name !== 'agy-wallpaper-prism') {
    throw new Error(`ERR_MANIFEST_IDENTITY: Expected name="agy-wallpaper-prism", got "${manifest.name}"`);
  }
  if (!SEMVER_RE.test(String(manifest.version || ''))) {
    throw new Error(`ERR_MANIFEST_VERSION: Invalid SemVer "${manifest.version}"`);
  }
  if (expectedVersion && manifest.version !== expectedVersion) {
    throw new Error(`ERR_MANIFEST_VERSION_MISMATCH: Archive plugin.json=${manifest.version}, expected=${expectedVersion}`);
  }

  for (const reqRel of REQUIRED_RUNTIME_FILES) {
    const f = files.get(reqRel);
    if (!f || f.length === 0) {
      throw new Error(`ERR_TAR_MISSING_REQUIRED_FILE: Missing or empty "${reqRel}"`);
    }
  }

  const indexHtml = files.get('sidecars/prism_studio/index.html').toString('utf8');
  if (indexHtml.length <= 10 * 1024) {
    throw new Error(`ERR_TAR_INVALID_BUNDLE: sidecars/prism_studio/index.html unexpectedly small (${indexHtml.length} B)`);
  }
  if (indexHtml.includes('\r')) {
    throw new Error('ERR_TAR_BUNDLE_CRLF: sidecars/prism_studio/index.html must be pure LF (0 CR/CRLF)');
  }
  if (!indexHtml.includes('<style') || !indexHtml.includes('<script') || !indexHtml.includes('id="app"')) {
    throw new Error('ERR_TAR_INVALID_BUNDLE: sidecars/prism_studio/index.html missing <style>/<script>/id="app"');
  }
  if (/<script[^>]+type=["']module["'][^>]+src=/i.test(indexHtml)) {
    throw new Error('ERR_TAR_INVALID_BUNDLE: External ES module <script src> forbidden in index.html');
  }

  const skillMd = files.get('skills/wallpaper-prism/SKILL.md').toString('utf8');
  if (skillMd.includes('\r')) {
    throw new Error('ERR_TAR_SKILL_CRLF: skills/wallpaper-prism/SKILL.md must be pure LF (0 CR/CRLF)');
  }
  if (skillMd.includes('plugin://') || skillMd.includes('plugins://')) {
    throw new Error('ERR_TAR_SKILL_PROTOCOL: skills/wallpaper-prism/SKILL.md must not contain plugin:// or plugins://');
  }

  return {
    entryCount,
    uncompressedBytes: tarBuf.length,
    manifest,
    files,
  };
}

export async function packReleaseBundle({
  sourceRoot = repoRoot,
  outDir = join(repoRoot, 'dist'),
  skipBuild = false,
} = {}) {
  const absSourceRoot = resolve(sourceRoot);
  if (!skipBuild && absSourceRoot === repoRoot) {
    await buildStudioBundle();
  }

  const manifestPath = join(absSourceRoot, 'plugin.json');
  const pkgPath = join(absSourceRoot, 'package.json');
  const sidecarPath = join(absSourceRoot, 'sidecars', 'prism_studio', 'sidecar.json');
  const schemaPath = join(absSourceRoot, 'src', 'shared', 'schema.mjs');

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  for (const key of Object.keys(manifest)) {
    if (!ALLOWED_PLUGIN_JSON_KEYS.has(key)) {
      throw new Error(`ERR_MANIFEST_PURITY: Unknown top-level key "${key}" in plugin.json`);
    }
  }
  if (manifest.name !== 'agy-wallpaper-prism') {
    throw new Error(`ERR_MANIFEST_IDENTITY: Expected plugin.json name="agy-wallpaper-prism", got "${manifest.name}"`);
  }
  const version = String(manifest.version || '').trim();
  if (!SEMVER_RE.test(version)) {
    throw new Error(`ERR_MANIFEST_VERSION: Invalid plugin.json version "${version}"`);
  }

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  if (pkg.name !== 'agy-wallpaper-prism' || pkg.version !== version) {
    throw new Error(`ERR_VERSION_MISMATCH: package.json (${pkg.name}@${pkg.version}) != plugin.json (${manifest.name}@${version})`);
  }

  if (existsSync(schemaPath)) {
    const schemaSrc = readFileSync(schemaPath, 'utf8');
    const verMatch = /export\s+const\s+PLUGIN_VERSION\s*=\s*['"]([^'"]+)['"]/.exec(schemaSrc);
    if (verMatch && verMatch[1] !== version) {
      throw new Error(`ERR_VERSION_MISMATCH: src/shared/schema.mjs PLUGIN_VERSION="${verMatch[1]}" != plugin.json "${version}"`);
    }
  }

  const sidecar = JSON.parse(readFileSync(sidecarPath, 'utf8'));
  if (sidecar.command !== 'node' || sidecar.args?.[0] !== 'main.mjs' || sidecar.restart_policy !== 'on-failure') {
    throw new Error('ERR_SIDECAR_CONTRACT: Invalid sidecars/prism_studio/sidecar.json contract');
  }

  const filesMap = collectDirectoryFilesMap(absSourceRoot, RELEASE_ROOTS);
  const gzBuf = createDeterministicTarGz(filesMap);
  const tarCheck = validateTarGzArchive(gzBuf, { expectedVersion: version });
  const zipBuf = createDeterministicZip(filesMap);

  // Sanity-check ZIP Local File Header & EOCD markers
  if (zipBuf.length < 22 || zipBuf.readUInt32LE(0) !== 0x04034b50 || zipBuf.readUInt32LE(zipBuf.length - 22) !== 0x06054b50) {
    throw new Error('ERR_ZIP_INVALID: Generated ZIP failed header/EOCD signature check');
  }

  const sha256 = createHash('sha256').update(gzBuf).digest('hex');
  const tag = `v${version}`;
  const baseName = `agy-wallpaper-prism-${tag}`;
  const tarFileName = `${baseName}.tar.gz`;
  const shaFileName = `${baseName}.tar.gz.sha256`;
  const zipFileName = `${baseName}.zip`;

  const absOutDir = resolve(outDir);
  mkdirSync(absOutDir, { recursive: true });
  const tarPath = join(absOutDir, tarFileName);
  const shaPath = join(absOutDir, shaFileName);
  const zipPath = join(absOutDir, zipFileName);

  writeFileSync(tarPath, gzBuf);
  writeFileSync(shaPath, `${sha256}  ${tarFileName}\n`, 'utf8');
  writeFileSync(zipPath, zipBuf);

  return {
    version,
    tag,
    tarPath,
    shaPath,
    zipPath,
    sha256,
    tarSizeBytes: gzBuf.length,
    zipSizeBytes: zipBuf.length,
    uncompressedBytes: tarCheck.uncompressedBytes,
    fileCount: filesMap.size,
    exists: existsSync(tarPath) && existsSync(shaPath) && existsSync(zipPath),
  };
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] || '')).href) {
  const res = await packReleaseBundle();
  console.log(`[pack:release] Version: ${res.tag} (${res.fileCount} files, uncompressed=${res.uncompressedBytes} bytes)`);
  console.log(`  tar.gz: ${res.tarPath} (${res.tarSizeBytes} bytes)`);
  console.log(`  sha256: ${res.shaPath} (${res.sha256})`);
  console.log(`  zip:    ${res.zipPath} (${res.zipSizeBytes} bytes)`);
}
