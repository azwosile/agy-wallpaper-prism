import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// Precomputed CRC32 table for valid PNG encoding
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, crcInput, crcBuf]);
}

/**
 * Generates a rich, vivid aurora/prism geometric PNG image in pure Node.js (zero external deps).
 * Ensures high visual quality for 1440x900 screenshots AND strong chroma for 32x32 dynamic accent extraction.
 */
export function createPrismArtworkPng(width, height, palette = 'obsidian-aurora') {
  const palettes = {
    'obsidian-aurora': {
      tl: [12, 22, 54],
      tr: [88, 38, 158],
      bl: [14, 108, 146],
      br: [24, 34, 78],
      orb1: [56, 189, 248, 0.34, 0.36, 0.34],
      orb2: [168, 85, 247, 0.72, 0.44, 0.30],
      orb3: [59, 130, 246, 0.50, 0.72, 0.28],
    },
    'nordic-daylight': {
      tl: [38, 86, 138],
      tr: [94, 156, 198],
      bl: [66, 132, 168],
      br: [136, 192, 208],
      orb1: [129, 212, 250, 0.28, 0.32, 0.35],
      orb2: [180, 142, 173, 0.74, 0.38, 0.28],
      orb3: [163, 190, 140, 0.52, 0.74, 0.25],
    },
    'sunset-amber': {
      tl: [36, 18, 42],
      tr: [168, 58, 76],
      bl: [92, 38, 68],
      br: [234, 138, 62],
      orb1: [245, 158, 11, 0.66, 0.42, 0.32],
      orb2: [244, 63, 94, 0.32, 0.52, 0.28],
      orb3: [139, 92, 246, 0.48, 0.26, 0.24],
    },
    'emerald-cyber': {
      tl: [10, 32, 36],
      tr: [16, 118, 96],
      bl: [18, 58, 86],
      br: [14, 88, 74],
      orb1: [52, 211, 153, 0.38, 0.42, 0.32],
      orb2: [45, 212, 191, 0.70, 0.55, 0.28],
      orb3: [56, 189, 248, 0.52, 0.28, 0.24],
    },
  };
  const p = palettes[palette] || palettes['obsidian-aurora'];
  const stride = width * 3 + 1;
  const raw = Buffer.alloc(stride * height);
  const invW = 1 / Math.max(1, width - 1);
  const invH = 1 / Math.max(1, height - 1);

  for (let y = 0; y < height; y++) {
    const v = y * invH;
    const rowOff = y * stride;
    raw[rowOff] = 0; // filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const u = x * invW;
      // Bilinear base gradient
      let r =
        p.tl[0] * (1 - u) * (1 - v) +
        p.tr[0] * u * (1 - v) +
        p.bl[0] * (1 - u) * v +
        p.br[0] * u * v;
      let g =
        p.tl[1] * (1 - u) * (1 - v) +
        p.tr[1] * u * (1 - v) +
        p.bl[1] * (1 - u) * v +
        p.br[1] * u * v;
      let b =
        p.tl[2] * (1 - u) * (1 - v) +
        p.tr[2] * u * (1 - v) +
        p.bl[2] * (1 - u) * v +
        p.br[2] * u * v;

      // Soft glowing aurora orbs + diagonal prism beam
      for (const orb of [p.orb1, p.orb2, p.orb3]) {
        const dx = (u - orb[3]) * (width / height);
        const dy = v - orb[4];
        const distSq = dx * dx + dy * dy;
        const radSq = orb[5] * orb[5];
        if (distSq < radSq) {
          const t = 1 - distSq / radSq;
          const w = t * t * 0.68;
          r = r * (1 - w) + orb[0] * w;
          g = g * (1 - w) + orb[1] * w;
          b = b * (1 - w) + orb[2] * w;
        }
      }

      // Crisp diagonal prism refraction ribbon
      const diag = Math.abs(u * 0.82 + v * 0.58 - 0.72);
      if (diag < 0.045) {
        const beam = (1 - diag / 0.045) * 0.28;
        r += (255 - r) * beam;
        g += (255 - g) * beam;
        b += (255 - b) * beam;
      }

      const px = rowOff + 1 + x * 3;
      raw[px] = Math.max(0, Math.min(255, r | 0));
      raw[px + 1] = Math.max(0, Math.min(255, g | 0));
      raw[px + 2] = Math.max(0, Math.min(255, b | 0));
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = zlib.deflateSync(raw, { level: 3 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function mp4Box(type, ...children) {
  const payload = Buffer.concat(children);
  const hdr = Buffer.alloc(8);
  hdr.writeUInt32BE(8 + payload.length, 0);
  hdr.write(type, 4, 4, 'ascii');
  return Buffer.concat([hdr, payload]);
}

function mp4FullBox(type, version, flags, body) {
  const vf = Buffer.alloc(4);
  vf[0] = version & 0xff;
  vf[1] = (flags >>> 16) & 0xff;
  vf[2] = (flags >>> 8) & 0xff;
  vf[3] = flags & 0xff;
  return mp4Box(type, vf, body);
}

/**
 * Builds a synthetic ISO-BMFF MP4 file where `moov` sits AFTER `mdat` (tail-moov).
 * Contains valid mvhd -> trak -> tkhd -> mdia -> mdhd/hdlr/minf -> vmhd/stbl -> stsd/stts/stsc/stsz/stco (or co64)
 * so mp4-vfs.mjs can parse boxes, patch chunk offsets (+len(moov)), and stream [ftyp][...][moov][mdat] virtually.
 */
export function buildTailMoovMp4({ mdatPayloadSize = 4096, useCo64 = false, width = 1920, height = 1080 } = {}) {
  const ftypBody = Buffer.alloc(16);
  ftypBody.write('isom', 0, 4, 'ascii');
  ftypBody.writeUInt32BE(0x200, 4);
  ftypBody.write('isom', 8, 4, 'ascii');
  ftypBody.write('mp42', 12, 4, 'ascii');
  const ftyp = mp4Box('ftyp', ftypBody);
  const free = mp4Box('free', Buffer.alloc(8));

  const marker = Buffer.from('PRISM_MDAT_CHUNK_0_MAGIC_PAYLOAD!!', 'ascii');
  const mdatPayload = Buffer.alloc(mdatPayloadSize, 0x42);
  marker.copy(mdatPayload, 0);
  const mdat = mp4Box('mdat', mdatPayload);

  // Chunk 0 starts right at the beginning of mdatPayload
  const originalChunk0Offset = ftyp.length + free.length + 8;

  // mvhd (version 0, 100 bytes body)
  const mvhdBody = Buffer.alloc(96);
  mvhdBody.writeUInt32BE(1000, 8); // timescale = 1000
  mvhdBody.writeUInt32BE(5000, 12); // duration = 5000 (5s)
  mvhdBody.writeUInt32BE(0x00010000, 16); // rate 1.0
  mvhdBody.writeUInt16BE(0x0100, 20); // volume 1.0
  mvhdBody.writeUInt32BE(2, 92); // next_track_ID
  const mvhd = mp4FullBox('mvhd', 0, 0, mvhdBody);

  // tkhd (version 0, 80 bytes body)
  const tkhdBody = Buffer.alloc(80);
  tkhdBody.writeUInt32BE(1, 8); // track_ID = 1
  tkhdBody.writeUInt32BE(5000, 16); // duration
  tkhdBody.writeUInt32BE(width << 16, 72);
  tkhdBody.writeUInt32BE(height << 16, 76);
  const tkhd = mp4FullBox('tkhd', 0, 3, tkhdBody);

  // mdhd (version 0, 20 bytes body)
  const mdhdBody = Buffer.alloc(20);
  mdhdBody.writeUInt32BE(60000, 8); // timescale 60000
  mdhdBody.writeUInt32BE(300000, 12); // duration 5s (300 frames @ 60fps)
  const mdhd = mp4FullBox('mdhd', 0, 0, mdhdBody);

  // hdlr ('vide')
  const hdlrBody = Buffer.alloc(24);
  hdlrBody.write('vide', 4, 4, 'ascii');
  const hdlr = mp4FullBox('hdlr', 0, 0, hdlrBody);

  const vmhd = mp4FullBox('vmhd', 0, 1, Buffer.alloc(8));

  // stsd ('avc1')
  const avc1Sample = Buffer.alloc(78);
  avc1Sample.writeUInt16BE(1, 6);
  avc1Sample.writeUInt16BE(width, 24);
  avc1Sample.writeUInt16BE(height, 26);
  avc1Sample.writeUInt32BE(0x00480000, 28);
  avc1Sample.writeUInt32BE(0x00480000, 32);
  avc1Sample.writeUInt16BE(1, 40);
  avc1Sample.writeUInt16BE(0x0018, 74);
  avc1Sample.writeInt16BE(-1, 76);
  const avc1 = mp4Box('avc1', avc1Sample);
  const stsdHeader = Buffer.alloc(4);
  stsdHeader.writeUInt32BE(1, 0);
  const stsd = mp4FullBox('stsd', 0, 0, Buffer.concat([stsdHeader, avc1]));

  // stts: 1 entry -> sample_count=300, sample_delta=1000 (60fps under timescale=60000)
  const sttsBody = Buffer.alloc(12);
  sttsBody.writeUInt32BE(1, 0);
  sttsBody.writeUInt32BE(300, 4);
  sttsBody.writeUInt32BE(1000, 8);
  const stts = mp4FullBox('stts', 0, 0, sttsBody);

  // stsc: 1 entry -> first_chunk=1, samples_per_chunk=300, sample_desc_idx=1
  const stscBody = Buffer.alloc(16);
  stscBody.writeUInt32BE(1, 0);
  stscBody.writeUInt32BE(1, 4);
  stscBody.writeUInt32BE(300, 8);
  stscBody.writeUInt32BE(1, 12);
  const stsc = mp4FullBox('stsc', 0, 0, stscBody);

  // stsz: constant sample_size=12, sample_count=300
  const stszBody = Buffer.alloc(8);
  stszBody.writeUInt32BE(12, 0);
  stszBody.writeUInt32BE(300, 4);
  const stsz = mp4FullBox('stsz', 0, 0, stszBody);

  let chunkOffsetBox;
  if (useCo64) {
    const co64Body = Buffer.alloc(12);
    co64Body.writeUInt32BE(1, 0);
    co64Body.writeBigUInt64BE(BigInt(originalChunk0Offset), 4);
    chunkOffsetBox = mp4FullBox('co64', 0, 0, co64Body);
  } else {
    const stcoBody = Buffer.alloc(8);
    stcoBody.writeUInt32BE(1, 0);
    stcoBody.writeUInt32BE(originalChunk0Offset, 4);
    chunkOffsetBox = mp4FullBox('stco', 0, 0, stcoBody);
  }

  const stbl = mp4Box('stbl', stsd, stts, stsc, stsz, chunkOffsetBox);
  const minf = mp4Box('minf', vmhd, stbl);
  const mdia = mp4Box('mdia', mdhd, hdlr, minf);
  const trak = mp4Box('trak', tkhd, mdia);
  const moov = mp4Box('moov', mvhd, trak);

  const fullBuffer = Buffer.concat([ftyp, free, mdat, moov]);
  return {
    buffer: fullBuffer,
    marker,
    originalChunk0Offset,
    moovOffset: ftyp.length + free.length + mdat.length,
    moovLength: moov.length,
  };
}

/**
 * Valid standard LZ4 raw block compressor.
 * Emits a valid LZ4 sequence with back-reference match when input contains repeated bytes,
 * otherwise emits a clean literal-only LZ4 block.
 */
export function lz4CompressBlock(src) {
  // Simple valid LZ4 block: encode all bytes as a literal-only final sequence (100% spec-compliant LZ4 raw block).
  // Wait — if src has a 64-byte repeated tail of 0x42 before the final 16 literals, we can even encode 1 real match + final literals!
  const out = [];
  const len = src.length;
  if (len >= 64) {
    // Check if there is a 16-byte repeat at some offset with >= 12 trailing bytes
    let matchPos = -1;
    let matchOffset = 0;
    for (let i = 16; i + 28 <= len; i++) {
      let ok = true;
      for (let k = 0; k < 8; k++) {
        if (src[i + k] !== src[i - 8 + k]) {
          ok = false;
          break;
        }
      }
      if (ok) {
        matchPos = i;
        matchOffset = 8;
        break;
      }
    }
    if (matchPos !== -1) {
      // Sequence 1: literals [0..matchPos), match length = 8 (min match 4 -> mlCode = 4), offset = 8
      const litLen = matchPos;
      const mlCode = 8 - 4; // 4
      const litCode = Math.min(15, litLen);
      out.push((litCode << 4) | mlCode);
      if (litLen >= 15) {
        let rem = litLen - 15;
        while (rem >= 255) {
          out.push(255);
          rem -= 255;
        }
        out.push(rem);
      }
      for (let j = 0; j < litLen; j++) out.push(src[j]);
      out.push(matchOffset & 0xff, (matchOffset >>> 8) & 0xff);

      // Sequence 2 (final): remaining literals [matchPos + 8 .. len)
      const tailStart = matchPos + 8;
      const tailLen = len - tailStart;
      const tailCode = Math.min(15, tailLen);
      out.push(tailCode << 4);
      if (tailLen >= 15) {
        let rem = tailLen - 15;
        while (rem >= 255) {
          out.push(255);
          rem -= 255;
        }
        out.push(rem);
      }
      for (let j = tailStart; j < len; j++) out.push(src[j]);
      return Buffer.from(out);
    }
  }

  const litCode = Math.min(15, len);
  out.push(litCode << 4);
  if (len >= 15) {
    let rem = len - 15;
    while (rem >= 255) {
      out.push(255);
      rem -= 255;
    }
    out.push(rem);
  }
  for (let i = 0; i < len; i++) out.push(src[i]);
  return Buffer.from(out);
}

/**
 * Builds a Wallpaper Engine TEXV0005 / TEXI0001 / TEXB0004 container embedding an LZ4-compressed MP4 payload.
 * Layout matches standard WE TEX v4:
 *   "TEXV0005\0" (9B) + "TEXI0001\0" (9B) + TexHeader (7 ints = 28B, flags bit 5 = isVideoMp4)
 *   + "TEXB0004\0" (9B) + imageCount(i32=1) + freeImageFormat(i32=20 mp4) + isVideoMp4(i32=1)
 *   + mipmapCount(i32=1) + width(i32) + height(i32) + lz4Flag(i32=1) + decompressedBytes(i32) + compressedBytes(i32) + payload
 */
export function buildTexb0004VideoTex(mp4Buf, { useLz4 = true, width = 1920, height = 1080 } = {}) {
  const texv = Buffer.from('TEXV0005\0', 'ascii');
  const texi = Buffer.from('TEXI0001\0', 'ascii');
  const texHeader = Buffer.alloc(28);
  texHeader.writeUInt32LE(0, 0); // format
  texHeader.writeUInt32LE(1 << 5, 4); // flags (video / mp4 texture flag)
  texHeader.writeUInt32LE(width, 8);
  texHeader.writeUInt32LE(height, 12);
  texHeader.writeUInt32LE(width, 16);
  texHeader.writeUInt32LE(height, 20);
  texHeader.writeUInt32LE(0, 24);

  const texb = Buffer.from('TEXB0004\0', 'ascii');
  const bodyHdr = Buffer.alloc(36);
  const compressed = useLz4 ? lz4CompressBlock(mp4Buf) : mp4Buf;
  bodyHdr.writeInt32LE(1, 0); // imageCount
  bodyHdr.writeInt32LE(20, 4); // FreeImageFormat (MP4 = 20 in WE TEXB0003/0004)
  bodyHdr.writeInt32LE(1, 8); // isVideoMp4 = 1
  bodyHdr.writeInt32LE(1, 12); // mipmapCount = 1
  bodyHdr.writeInt32LE(width, 16);
  bodyHdr.writeInt32LE(height, 20);
  bodyHdr.writeInt32LE(useLz4 ? 1 : 0, 24); // lz4Compressed
  bodyHdr.writeInt32LE(mp4Buf.length, 28); // decompressedSize
  bodyHdr.writeInt32LE(compressed.length, 32); // byteCount

  return Buffer.concat([texv, texi, texHeader, texb, bodyHdr, compressed]);
}

/**
 * Wraps a buffer in a PKGV LZ4 block-chain envelope: [u64LE origLen][i32LE decLen][i32LE cmpLen][lz4Block].
 */
export function wrapPkgLz4Chain(rawBuf) {
  const compressed = lz4CompressBlock(rawBuf);
  const hdr = Buffer.alloc(16);
  hdr.writeUInt32LE(rawBuf.length >>> 0, 0);
  hdr.writeUInt32LE(0, 4);
  hdr.writeInt32LE(rawBuf.length, 8);
  hdr.writeInt32LE(compressed.length, 12);
  return Buffer.concat([hdr, compressed]);
}

/**
 * Builds a Wallpaper Engine PKGV0002 archive from [{ path, data: Buffer }].
 */
export function buildPkgvArchive(entries, magic = 'PKGV0002') {
  const magicBuf = Buffer.from(magic, 'ascii');
  const hdrParts = [];
  const magicLen = Buffer.alloc(4);
  magicLen.writeUInt32LE(magicBuf.length, 0);
  hdrParts.push(magicLen, magicBuf);

  const countBuf = Buffer.alloc(4);
  countBuf.writeUInt32LE(entries.length, 0);
  hdrParts.push(countBuf);

  let dataOffset = 0;
  const dataParts = [];
  for (const entry of entries) {
    const pBuf = Buffer.from(entry.path, 'utf8');
    const pLen = Buffer.alloc(4);
    pLen.writeUInt32LE(pBuf.length, 0);
    const meta = Buffer.alloc(8);
    meta.writeUInt32LE(dataOffset, 0);
    meta.writeUInt32LE(entry.data.length, 4);
    hdrParts.push(pLen, pBuf, meta);
    dataParts.push(entry.data);
    dataOffset += entry.data.length;
  }

  return Buffer.concat([...hdrParts, ...dataParts]);
}

export function buildSyntheticMp3Buffer() {
  // Minimal ID3v2 header + MPEG1 Layer 3 frame sync bytes
  const id3 = Buffer.from([0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  const frame = Buffer.alloc(417, 0x00);
  frame[0] = 0xff;
  frame[1] = 0xfb;
  frame[2] = 0x90;
  frame[3] = 0x64;
  return Buffer.concat([id3, frame, frame]);
}

/**
 * Materializes the complete test fixture suite on disk inside `fixturesDir`.
 */
export function materializeTestFixtures(fixturesDir) {
  fs.rmSync(fixturesDir, { recursive: true, force: true });
  fs.mkdirSync(fixturesDir, { recursive: true });

  // 1. Standalone high-res artwork & media fixtures
  const auroraPng = createPrismArtworkPng(1440, 900, 'obsidian-aurora');
  const nordPng = createPrismArtworkPng(1440, 900, 'nordic-daylight');
  const sunsetPng = createPrismArtworkPng(640, 400, 'sunset-amber');
  const emeraldPng = createPrismArtworkPng(640, 400, 'emerald-cyber');

  const tailMp4 = buildTailMoovMp4({ mdatPayloadSize: 8192, useCo64: false });
  const tailMp4Co64 = buildTailMoovMp4({ mdatPayloadSize: 4096, useCo64: true });
  const mp3Buf = buildSyntheticMp3Buffer();

  fs.writeFileSync(path.join(fixturesDir, 'aurora-1440x900.png'), auroraPng);
  fs.writeFileSync(path.join(fixturesDir, 'nord-1440x900.png'), nordPng);
  fs.writeFileSync(path.join(fixturesDir, 'tail-moov-sample.mp4'), tailMp4.buffer);
  fs.writeFileSync(path.join(fixturesDir, 'tail-moov-co64.mp4'), tailMp4Co64.buffer);

  // Generate a genuine decodable H.264 tail-moov animated video via ffmpeg (for real Chromium <video> autoplay & currentTime > 0 tests)
  const playableMp4Path = path.join(fixturesDir, 'playable-aurora.mp4');
  let playableMp4Buf = tailMp4.buffer;
  let hasRealVideoFrames = false;
  try {
    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-f',
        'lavfi',
        '-i',
        'gradients=s=960x540:r=30:d=2.4:c0=#0b132b:c1=#5a189a:c2=#2563eb:c3=#06b6d4:speed=0.28',
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-crf',
        '24',
        playableMp4Path,
        '-loglevel',
        'error',
      ],
      { stdio: 'pipe', timeout: 10000 },
    );
    if (fs.existsSync(playableMp4Path) && fs.statSync(playableMp4Path).size > 2048) {
      playableMp4Buf = fs.readFileSync(playableMp4Path);
      hasRealVideoFrames = true;
    }
  } catch {
    fs.writeFileSync(playableMp4Path, tailMp4.buffer);
  }

  // 2. Mock Steam + Workshop 431960 Root
  const steamRoot = path.join(fixturesDir, 'steam-mock');
  const workshop431960 = path.join(steamRoot, 'steamapps', 'workshop', 'content', '431960');
  fs.mkdirSync(workshop431960, { recursive: true });

  const escapedPath = steamRoot.replace(/\\/g, '\\\\');
  fs.writeFileSync(
    path.join(steamRoot, 'steamapps', 'libraryfolders.vdf'),
    `"libraryfolders"\n{\n\t"0"\n\t{\n\t\t"path"\t\t"${escapedPath}"\n\t\t"apps"\n\t\t{\n\t\t\t"431960"\t\t"1"\n\t\t}\n\t}\n}\n`,
    'utf8',
  );

  // WE install dir with visibility.json + config.json playlists
  const weInstallDir = path.join(steamRoot, 'steamapps', 'common', 'wallpaper_engine');
  fs.mkdirSync(path.join(weInstallDir, 'projects', 'defaultprojects'), { recursive: true });
  fs.writeFileSync(path.join(weInstallDir, 'wallpaper64.exe'), 'MOCK_BIN', 'utf8');
  fs.writeFileSync(
    path.join(weInstallDir, 'visibility.json'),
    JSON.stringify({ '999999': false }, null, 2),
    'utf8',
  );
  fs.writeFileSync(
    path.join(steamRoot, 'visibility.json'),
    JSON.stringify({ '999999': false }, null, 2),
    'utf8',
  );
  fs.writeFileSync(
    path.join(weInstallDir, 'config.json'),
    JSON.stringify(
      {
        general: {
          playlists: [
            {
              name: 'WE Prism Favorites',
              items: [
                path.join(workshop431960, '100001', 'project.json'),
                path.join(workshop431960, '100002', 'project.json'),
              ],
              settings: { delay: 15, mode: 'timer', order: 'sorted' },
            },
          ],
        },
      },
      null,
      2,
    ),
    'utf8',
  );

  // Secret file outside Workshop items to test path-traversal containment
  const outsideSecretPath = path.join(steamRoot, 'outside-secret.png');
  fs.writeFileSync(outsideSecretPath, sunsetPng);

  // Item 100001: Image / Multi-Image Slideshow with natural sort (1, 2, 10)
  const item100001 = path.join(workshop431960, '100001');
  fs.mkdirSync(path.join(item100001, 'slides'), { recursive: true });
  fs.writeFileSync(path.join(item100001, 'aurora.png'), auroraPng);
  fs.writeFileSync(path.join(item100001, 'preview.png'), auroraPng);
  fs.writeFileSync(path.join(item100001, 'slides', '10.png'), emeraldPng);
  fs.writeFileSync(path.join(item100001, 'slides', '2.png'), nordPng);
  fs.writeFileSync(path.join(item100001, 'slides', '1.png'), auroraPng);
  fs.writeFileSync(
    path.join(item100001, 'project.json'),
    JSON.stringify(
      {
        title: 'Aurora Prism Sanctuary 4K',
        type: 'image',
        file: 'aurora.png',
        preview: 'preview.png',
        contentrating: 'Everyone',
        tags: ['Landscape', 'Abstract', 'Prism', '4K'],
        schemecolor: '0.22 0.56 0.96',
        preset: {
          wallpapermode: 2,
          imageswitchtimes: 2,
          customdirectory: 'slides',
        },
      },
      null,
      2,
    ),
    'utf8',
  );

  // Item 100002: Video Wallpaper (real H.264 tail-moov MP4) + conditional WE user properties & zh/en localization
  const item100002 = path.join(workshop431960, '100002');
  fs.mkdirSync(item100002, { recursive: true });
  fs.writeFileSync(path.join(item100002, 'cyber-rain.mp4'), playableMp4Buf);
  fs.writeFileSync(path.join(item100002, 'preview.png'), emeraldPng);
  fs.writeFileSync(
    path.join(item100002, 'project.json'),
    JSON.stringify(
      {
        title: 'Cyber Obsidian Rain 60FPS',
        type: 'video',
        file: 'cyber-rain.mp4',
        preview: 'preview.png',
        contentrating: 'Everyone',
        tags: ['Cyberpunk', 'Sci-Fi', 'Rain'],
        schemecolor: '0.13 0.82 0.60',
        general: {
          localization: {
            'zh-chs': { ui_glow: '开启霓虹光晕', ui_intensity: '光晕强度', ui_mode: '色彩模式' },
            'en-us': { ui_glow: 'Enable Neon Glow', ui_intensity: 'Glow Intensity', ui_mode: 'Color Mode' },
          },
          properties: {
            schemecolor: { order: 0, text: 'Scheme Color', type: 'color', value: '0.13 0.82 0.60' },
            enable_glow: { order: 1, text: 'ui_glow', type: 'bool', value: true },
            glow_intensity: {
              order: 2,
              text: 'ui_intensity',
              type: 'slider',
              min: 0,
              max: 100,
              value: 75,
              condition: 'enable_glow.value == true',
            },
            palette_mode: {
              order: 3,
              text: 'ui_mode',
              type: 'combo',
              value: 1,
              options: [
                { label: 'Obsidian', value: 1 },
                { label: 'Emerald', value: 2 },
              ],
            },
          },
        },
      },
      null,
      2,
    ),
    'utf8',
  );

  // Item 100003: Web Interactive Wallpaper attempting window.focus() & element.focus() on load
  const item100003 = path.join(workshop431960, '100003');
  fs.mkdirSync(item100003, { recursive: true });
  fs.writeFileSync(path.join(item100003, 'preview.png'), sunsetPng);
  fs.writeFileSync(
    path.join(item100003, 'index.html'),
    `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Interactive Nebula</title></head>
<body style="margin:0;background:linear-gradient(135deg,#1a1033,#ea8a3e);color:#fff">
  <input id="focus-thief" value="trap" />
  <canvas id="nebula" width="640" height="360"></canvas>
  <script>
    window.__focusAttempted = false;
    window.__receivedProps = null;
    window.__audioRegistered = false;
    window.wallpaperPropertyListener = {
      applyUserProperties: function(props) {
        window.__receivedProps = props;
      }
    };
    if (typeof window.wallpaperRegisterAudioListener === 'function') {
      window.wallpaperRegisterAudioListener(function() {});
      window.__audioRegistered = true;
    }
    try {
      window.__focusAttempted = true;
      window.focus();
      document.getElementById('focus-thief').focus();
    } catch (e) {}
  </script>
</body>
</html>`,
    'utf8',
  );
  fs.writeFileSync(
    path.join(item100003, 'project.json'),
    JSON.stringify(
      {
        title: 'Interactive Nebula Shader Web',
        type: 'web',
        file: 'index.html',
        preview: 'preview.png',
        contentrating: 'PG13',
        tags: ['Interactive', 'Audio', 'Nebula'],
        schemecolor: '0.92 0.54 0.24',
        general: {
          properties: {
            speed: { order: 1, text: 'Orbit Speed', type: 'slider', min: 1, max: 10, value: 4 },
          },
        },
      },
      null,
      2,
    ),
    'utf8',
  );

  // Item 100004: Scene Wallpaper with PKGV0002 + LZ4 + TEXB0004 embedded MP4 + packaged MP3
  const item100004 = path.join(workshop431960, '100004');
  fs.mkdirSync(item100004, { recursive: true });
  fs.writeFileSync(path.join(item100004, 'preview.png'), nordPng);
  const sceneJsonBuf = Buffer.from(
    JSON.stringify({
      camera: { center: '0 0 0' },
      objects: [{ name: 'hero_video', image: 'materials/hero_loop.json' }],
    }),
    'utf8',
  );
  const heroTexBuf = buildTexb0004VideoTex(playableMp4Buf, { useLz4: true, width: 960, height: 540 });
  const maskTexBuf = buildTexb0004VideoTex(Buffer.from('NOT_A_MAIN_VIDEO'), { useLz4: false, width: 64, height: 64 });
  const scenePkgBuf = buildPkgvArchive([
    { path: 'scene.json', data: wrapPkgLz4Chain(sceneJsonBuf) },
    { path: 'materials/opacity_mask.tex', data: maskTexBuf },
    { path: 'materials/hero_loop.tex', data: heroTexBuf },
    { path: 'sounds/ambient_theme.mp3', data: mp3Buf },
  ]);
  fs.writeFileSync(path.join(item100004, 'scene.pkg'), scenePkgBuf);
  fs.writeFileSync(
    path.join(item100004, 'project.json'),
    JSON.stringify(
      {
        title: 'Nordic Crystal Dimension Scene',
        type: 'scene',
        file: 'scene.pkg',
        preview: 'preview.png',
        contentrating: 'Everyone',
        tags: ['Nord', 'Crystal', 'Scene', 'Anime'],
        schemecolor: '0.53 0.75 0.82',
      },
      null,
      2,
    ),
    'utf8',
  );

  // Item 999999: Hidden by visibility.json (should be excluded!)
  const item999999 = path.join(workshop431960, '999999');
  fs.mkdirSync(item999999, { recursive: true });
  fs.writeFileSync(path.join(item999999, 'preview.png'), sunsetPng);
  fs.writeFileSync(
    path.join(item999999, 'project.json'),
    JSON.stringify({ title: 'Hidden Default Wallpaper', type: 'image', file: 'preview.png', preview: 'preview.png' }),
    'utf8',
  );

  // Item 100005: Application type WITH preview.png (must STILL NOT be playable!)
  const item100005 = path.join(workshop431960, '100005');
  fs.mkdirSync(item100005, { recursive: true });
  fs.writeFileSync(path.join(item100005, 'app.exe'), 'MZ_DUMMY', 'utf8');
  fs.writeFileSync(path.join(item100005, 'preview.png'), sunsetPng);
  fs.writeFileSync(
    path.join(item100005, 'project.json'),
    JSON.stringify({ title: 'Unsafe Executable Wallpaper', type: 'application', file: 'app.exe', preview: 'preview.png' }),
    'utf8',
  );

  // Item 100006: Path traversal attempt in project.json `file`
  const item100006 = path.join(workshop431960, '100006');
  fs.mkdirSync(item100006, { recursive: true });
  fs.writeFileSync(
    path.join(item100006, 'project.json'),
    JSON.stringify({
      title: 'Malicious Traversal Project',
      type: 'image',
      file: '../../../../../outside-secret.png',
      preview: '../../../../../outside-secret.png',
    }),
    'utf8',
  );

  return {
    fixturesDir,
    steamRoot,
    workshop431960,
    weInstallDir,
    auroraPngPath: path.join(fixturesDir, 'aurora-1440x900.png'),
    nordPngPath: path.join(fixturesDir, 'nord-1440x900.png'),
    tailMp4Path: path.join(fixturesDir, 'tail-moov-sample.mp4'),
    tailMp4Co64Path: path.join(fixturesDir, 'tail-moov-co64.mp4'),
    tailMp4Info: tailMp4,
    playableMp4Path,
    playableMp4Bytes: playableMp4Buf.length,
    hasRealVideoFrames,
    scenePkgPath: path.join(item100004, 'scene.pkg'),
    outsideSecretPath,
  };
}
