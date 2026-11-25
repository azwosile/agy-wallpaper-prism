/**
 * Loopback Media Server (`127.0.0.1:0`) with HTTP `206` Range, Virtual MP4 Faststart,
 * `scene.pkg` Video/Audio Extraction, Directory-Fenced Web Serving & Shim Injection (`media-server.mjs`)
 */

import { execFile, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import {
  closeSync,
  createReadStream,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  realpathSync,
  renameSync,
  statSync,
  unlinkSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { delimiter, dirname, extname, join, posix, relative, resolve, sep } from 'node:path';
import { Writable } from 'node:stream';
import { createMp4VfsKit, createVirtualSegmentStream } from './mp4-vfs.mjs';
import {
  extractSceneAudioPayload,
  extractSceneVideoPayload,
} from './pkg-scene.mjs';
import {
  buildBuiltinAuroraSvg,
  buildLiveSceneHtml,
  injectWebWallpaperHtml,
} from './runtime/web-shim.mjs';
import { cleanHostEnv } from './scanner.mjs';

const MIME_BY_EXT = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.mkv': 'video/x-matroska',
  '.webm': 'video/webm',
  '.ogv': 'video/ogg',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.flac': 'audio/flac',
  '.aac': 'audio/aac',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.txt': 'text/plain; charset=utf-8',
  '.frag': 'text/plain; charset=utf-8',
  '.vert': 'text/plain; charset=utf-8',
  '.glsl': 'text/plain; charset=utf-8',
});

const SAFE_TOKEN_RE = /^[a-zA-Z0-9_-]{1,120}$/;
const SCENE_BUFFER_CACHE_MAX_BYTES = 192 * 1024 * 1024;
const SCENE_BUFFER_CACHE_MAX_ENTRIES = 6;

let cachedFfmpegResolution = null;

function resolveFfmpegCapability() {
  const envOverride = String(process.env.FFMPEG_PATH || process.env.PRISM_FFMPEG_PATH || '').trim();
  if (envOverride) {
    if (envOverride === '__none__' || envOverride === '0' || envOverride === 'false') {
      return { available: false, bin: '' };
    }
    try {
      if (existsSync(envOverride) && statSync(envOverride).isFile()) {
        return { available: true, bin: envOverride };
      }
    } catch { /* fall through */ }
    return { available: false, bin: '' };
  }
  if (cachedFfmpegResolution) return cachedFfmpegResolution;

  const exeNames = process.platform === 'win32' ? ['ffmpeg.exe', 'ffmpeg.cmd', 'ffmpeg.bat'] : ['ffmpeg'];
  const pathDirs = String(process.env.PATH || process.env.Path || '').split(delimiter).filter(Boolean);
  for (const dir of pathDirs) {
    for (const exe of exeNames) {
      try {
        const cand = join(dir.trim().replace(/^"+|"+$/g, ''), exe);
        if (existsSync(cand) && statSync(cand).isFile()) {
          cachedFfmpegResolution = { available: true, bin: cand };
          return cachedFfmpegResolution;
        }
      } catch { /* ignore inaccessible PATH entry */ }
    }
  }
  cachedFfmpegResolution = { available: false, bin: '' };
  return cachedFfmpegResolution;
}

function probeMseVideoMime(absPath) {
  let fd = -1;
  try {
    fd = openSync(absPath, 'r');
    const buf = Buffer.allocUnsafe(65536);
    const bytesRead = readSync(fd, buf, 0, buf.length, 0);
    const head = buf.subarray(0, bytesRead);
    if (head.includes('hvc1')) return 'video/mp4; codecs="hvc1.1.6.L120.90"';
    if (head.includes('hev1') || head.includes('hvcC')) return 'video/mp4; codecs="hev1.1.6.L120.90"';
    if (head.includes('av01')) return 'video/mp4; codecs="av01.0.08M.08"';
    if (head.includes('vp09')) return 'video/mp4; codecs="vp09.00.41.08"';
  } catch {
    /* fall back to H.264 High profile */
  } finally {
    if (fd >= 0) {
      try { closeSync(fd); } catch { /* ignore */ }
    }
  }
  return 'video/mp4; codecs="avc1.640028"';
}

export function mimeForPath(filePath, fallback = 'application/octet-stream') {
  const ext = extname(String(filePath || '')).toLowerCase();
  return MIME_BY_EXT[ext] || fallback;
}

export function tokenForWallpaperId(id) {
  const s = String(id || '').trim();
  if (SAFE_TOKEN_RE.test(s)) return s;
  return `tok-${createHash('sha1').update(s).digest('hex').slice(0, 20)}`;
}

function encodeUrlSubpath(relPosix) {
  return String(relPosix || '')
    .split('/')
    .filter(Boolean)
    .map((seg) => encodeURIComponent(seg))
    .join('/');
}

/**
 * Detect any path traversal attempt in raw URL BEFORE `new URL(...)` collapses `..` segments!
 */
export function hasRawTraversalAttempt(rawUrl) {
  if (typeof rawUrl !== 'string') return true;
  const qIdx = rawUrl.indexOf('?');
  const pathPart = qIdx >= 0 ? rawUrl.slice(0, qIdx) : rawUrl;
  if (pathPart.includes('\0') || pathPart.includes('\\')) return true;

  let decoded = pathPart;
  try {
    decoded = decodeURIComponent(pathPart);
  } catch {
    return true;
  }
  if (decoded.includes('\0') || decoded.includes('\\')) return true;

  // Check both raw and decoded segments for `.` traversal (`..`)
  for (const candidate of [pathPart, decoded]) {
    const segs = candidate.split('/');
    for (const seg of segs) {
      if (seg === '..' || seg.toLowerCase() === '%2e%2e' || seg.toLowerCase() === '.%2e' || seg.toLowerCase() === '%2e.') {
        return true;
      }
    }
  }
  return false;
}

/**
 * Strictly resolve a relative request path inside `rootDir`, failing closed (`null`) on
 * any traversal, null byte, or symlink escaping outside `realpathSync(rootDir)`.
 */
function resolveWebAssetPath(rootDir, subSegments) {
  if (!rootDir || !Array.isArray(subSegments) || subSegments.length === 0) {
    return { status: 404, absPath: null };
  }
  const decodedSegs = [];
  for (const rawSeg of subSegments) {
    let seg = '';
    try {
      seg = decodeURIComponent(rawSeg);
    } catch {
      return { status: 403, absPath: null };
    }
    if (!seg || seg === '.') continue;
    if (seg === '..' || seg.includes('/') || seg.includes('\\') || seg.includes('\0')) {
      return { status: 403, absPath: null };
    }
    decodedSegs.push(seg);
  }
  if (decodedSegs.length === 0) return { status: 404, absPath: null };

  const absRoot = resolve(rootDir);
  let realRoot;
  try {
    realRoot = realpathSync(absRoot);
  } catch {
    return { status: 404, absPath: null };
  }

  const candidate = resolve(absRoot, ...decodedSegs);
  const relCheck = relative(absRoot, candidate);
  if (!relCheck || relCheck.startsWith('..') || relCheck.includes(`..${sep}`)) {
    return { status: 403, absPath: null };
  }

  if (!existsSync(candidate)) {
    return { status: 404, absPath: null };
  }

  try {
    const lst = lstatSync(candidate);
    if (lst.isSymbolicLink()) {
      return { status: 403, absPath: null };
    }
    const realCand = realpathSync(candidate);
    if (realCand !== realRoot && !realCand.startsWith(realRoot + sep)) {
      return { status: 403, absPath: null };
    }
    if (!lst.isFile()) {
      return { status: 404, absPath: null };
    }
    return { status: 200, absPath: realCand, relPosix: decodedSegs.join('/') };
  } catch {
    return { status: 403, absPath: null };
  }
}

/**
 * Parse HTTP `Range: bytes=start-end` header against `totalSize`.
 * Returns `null` if no Range header, `{ valid: false }` for 416, or `{ valid: true, start, end }`.
 */
export function parseByteRange(rangeHeader, totalSize) {
  if (!rangeHeader || typeof rangeHeader !== 'string') return null;
  if (totalSize <= 0) return { valid: false };
  const m = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
  if (!m) return { valid: false };

  const startStr = m[1];
  const endStr = m[2];
  if (startStr === '' && endStr === '') return { valid: false };

  let start;
  let end;
  if (startStr === '') {
    // Suffix byte-range-spec: bytes=-500
    const suffixLen = Number(endStr);
    if (!Number.isInteger(suffixLen) || suffixLen <= 0) return { valid: false };
    start = Math.max(0, totalSize - suffixLen);
    end = totalSize - 1;
  } else {
    start = Number(startStr);
    end = endStr === '' ? totalSize - 1 : Number(endStr);
    if (!Number.isInteger(start) || !Number.isInteger(end)) return { valid: false };
    if (start < 0 || start >= totalSize || start > end) return { valid: false };
    end = Math.min(end, totalSize - 1);
  }
  return { valid: true, start, end };
}

export function buildVideoStageHtml({ mediaSrc, audioSrc = '', posterSrc = '', sid = '', cfg = {} } = {}) {
  const fitCss = cfg.fit === 'center' ? 'none' : String(cfg.fit || 'cover');
  const posX = Number.isFinite(Number(cfg.layerPosX)) ? Number(cfg.layerPosX) : 50;
  const posY = Number.isFinite(Number(cfg.layerPosY)) ? Number(cfg.layerPosY) : 50;
  const rate = Number.isFinite(Number(cfg.playbackRate)) ? Math.max(0.25, Math.min(2, Number(cfg.playbackRate))) : 1;
  const wantLoop = !(cfg.rotationEnabled && cfg.rotationTrigger === 'videoEnd');
  const initState = {
    sid: String(sid || ''),
    mediaSrc: String(mediaSrc || ''),
    audioSrc: String(audioSrc || ''),
    posterSrc: String(posterSrc || ''),
    paused: Boolean(cfg.paused),
    muted: cfg.audioEnabled != null ? !cfg.audioEnabled : Boolean(cfg.muted ?? true),
    volume: Number.isFinite(Number(cfg.volume)) ? Math.max(0, Math.min(1, Number(cfg.volume))) : 0.5,
    playbackRate: rate,
    loop: wantLoop,
    fit: fitCss,
    pos: `${posX}% ${posY}%`,
  };
  const safeInit = JSON.stringify(initState).replace(/</g, '\\u003c');
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
  html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:transparent;}
  video{position:fixed;inset:0;width:100%;height:100%;display:block;object-fit:${fitCss};object-position:${posX}% ${posY}%;filter: none; will-change: auto; background: transparent;}
</style>
</head>
<body translate="no" data-no-translate="true" data-ag-no-i18n="1">
<video id="v" class="agy-prism-video-el" translate="no" data-no-translate="true" data-ag-no-i18n="1" autoplay muted playsinline preload="auto" disablepictureinpicture></video>
<script>
try { window.__agyDomTranslatorInitialized = true; } catch (_) {}
(function(){
  var S=${safeInit};
  var v=document.getElementById('v');
  var a=null;
  var priming=true;
  var readySent=false;
  var effectiveEnd=0;
  var lastT=-1;
  var lastFrames=-1;
  var lastCheckAt=0;
  var stallTicks=0;
  var audioClockFallback=false;
  var audioCtx=null;
  var mediaAudioSrc=null;
  var audioGain=null;
  var rvfcActive=false;
  var rvfcCount=0;
  var ensureWebAudioRoute=function(){
    if(mediaAudioSrc&&audioCtx&&audioGain){
      try{if(audioCtx.state==='suspended')audioCtx.resume().catch(function(){});}catch(_){}
      return true;
    }
    var AC=window.AudioContext||window.webkitAudioContext;
    if(typeof AC!=='function')return false;
    try{
      if(!audioCtx)audioCtx=new AC();
      if(!mediaAudioSrc)mediaAudioSrc=audioCtx.createMediaElementSource(v);
      if(!audioGain){
        audioGain=audioCtx.createGain();
        mediaAudioSrc.connect(audioGain);
        audioGain.connect(audioCtx.destination);
      }
      if(audioCtx.state==='suspended')audioCtx.resume().catch(function(){});
      return true;
    }catch(_){
      return false;
    }
  };
  var syncWebAudioGain=function(){
    if(!audioGain||!audioCtx)return;
    try{
      var wantSound=!S.paused&&!S.muted&&!audioClockFallback&&S.volume>0.005;
      var targetVol=wantSound?Math.max(0,Math.min(1,Number(S.volume)||0)):0;
      audioGain.gain.value=targetVol;
      if(S.paused&&audioCtx.state==='running')audioCtx.suspend().catch(function(){});
      else if(wantSound&&audioCtx.state==='suspended')audioCtx.resume().catch(function(){});
    }catch(_){}
  };
  var post=function(ev,extra){
    try{
      if(window.parent&&window.parent!==window){
        window.parent.postMessage(Object.assign({type:'prism-video-stage',event:ev,sid:S.sid},extra||{}),'*');
      }
    }catch(_){}
  };
  v.crossOrigin='anonymous';
  v.defaultMuted=true;
  v.muted=true;
  v.playsInline=true;
  v.autoplay=true;
  v.preload='auto';
  v.loop=Boolean(S.loop);
  v.playbackRate=S.playbackRate||1;
  if(S.posterSrc)v.poster=S.posterSrc;
  if(S.audioSrc){
    a=document.createElement('audio');
    a.loop=true;
    a.preload='auto';
    a.src=S.audioSrc;
    document.body.appendChild(a);
  }
  var armRvfc=function(){
    if(typeof v.requestVideoFrameCallback!=='function'||rvfcActive)return;
    rvfcActive=true;
    var onF=function(){
      rvfcCount+=1;
      if(!document.hidden&&!S.paused){
        try{v.requestVideoFrameCallback(onF);return;}catch(_){}
      }
      rvfcActive=false;
    };
    try{v.requestVideoFrameCallback(onF);}catch(_){rvfcActive=false;}
  };
  var syncAudio=function(){
    if(!a)return;
    try{
      a.volume=S.muted?0:Math.max(0,Math.min(1,Number(S.volume)||0));
      a.muted=Boolean(S.muted);
      if(S.paused||S.muted)a.pause();
      else a.play().catch(function(){});
    }catch(_){}
  };
  var tryUnmute=function(force){
    if(S.muted||S.volume<=0.005)return;
    if(audioClockFallback&&!force)return;
    if(force)audioClockFallback=false;
    try{
      var routed=ensureWebAudioRoute();
      v.volume=routed?1:Math.max(0,Math.min(1,Number(S.volume)||0));
      v.muted=false;
      syncWebAudioGain();
      var p=v.play();
      if(p&&typeof p.then==='function'){
        p.catch(function(){v.muted=true;syncWebAudioGain();v.play().catch(function(){});});
      }
    }catch(_){v.muted=true;syncWebAudioGain();}
  };
  var syncPlayback=function(forceUnmute){
    try{
      if(S.fit)v.style.objectFit=S.fit;
      if(S.pos)v.style.objectPosition=S.pos;
      if(Number.isFinite(S.playbackRate)&&Math.abs(v.playbackRate-S.playbackRate)>0.01)v.playbackRate=S.playbackRate;
      v.loop=Boolean(S.loop);
      v.volume=mediaAudioSrc?1:Math.max(0,Math.min(1,Number(S.volume)||0));
      if(S.paused){
        if(priming&&v.readyState<2){
          v.muted=true;
          if(v.paused)v.play().catch(function(){});
        }else if(!v.paused){
          v.pause();
        }
      }else{
        if(S.muted||S.volume<=0.005||audioClockFallback){
          v.muted=true;
        }
        if(v.paused){
          var wantUnmute=!S.muted&&S.volume>0.005&&!audioClockFallback;
          if(wantUnmute)v.muted=true;
          var p=v.play();
          if(p&&typeof p.then==='function'){
            p.then(function(){if(wantUnmute)tryUnmute(false);},function(){v.muted=true;syncWebAudioGain();v.play().catch(function(){});});
          }
        }else if((forceUnmute||v.muted)&&!S.muted&&S.volume>0.005&&(!audioClockFallback||forceUnmute)){
          tryUnmute(Boolean(forceUnmute));
        }
      }
      syncWebAudioGain();
      syncAudio();
    }catch(_){}
  };
  var onDecoded=function(){
    if(readySent)return;
    if(v.readyState<2||!(v.videoWidth>0))return;
    readySent=true;
    priming=false;
    syncPlayback(false);
    armRvfc();
    post('ready',{videoWidth:v.videoWidth,videoHeight:v.videoHeight,duration:Number.isFinite(v.duration)?v.duration:0});
  };
  var onEndOrWrap=function(){
    if(!S.loop){
      post('ended',{});
    }else{
      try{
        v.currentTime=0;
        if(!S.paused)v.play().catch(function(){});
      }catch(_){}
    }
  };
  v.addEventListener('loadedmetadata',function(){if(v.paused)syncPlayback(false);});
  v.addEventListener('loadeddata',onDecoded);
  v.addEventListener('canplay',function(){if(v.paused)syncPlayback(false);onDecoded();});
  v.addEventListener('playing',function(){onDecoded();armRvfc();});
  v.addEventListener('timeupdate',function(){
    onDecoded();
    if(effectiveEnd>0&&!v.seeking&&v.currentTime>=effectiveEnd)onEndOrWrap();
  });
  v.addEventListener('ended',onEndOrWrap);
  v.addEventListener('error',function(){post('error',{code:v.error?v.error.code:0});});
  if(typeof v.requestVideoFrameCallback==='function'){
    try{v.requestVideoFrameCallback(onDecoded);}catch(_){}
  }
  window.addEventListener('message',function(ev){
    var m=ev&&ev.data;
    if(!m||typeof m!=='object')return;
    if(m.type!=='prism-video-ctl'&&m.type!=='we-lifecycle')return;
    if(m.sid&&S.sid&&m.sid!==S.sid)return;
    if(typeof m.paused==='boolean')S.paused=m.paused;
    if(typeof m.muted==='boolean')S.muted=m.muted;
    if(typeof m.volume==='number'&&Number.isFinite(m.volume))S.volume=Math.max(0,Math.min(1,m.volume));
    if(typeof m.playbackRate==='number'&&Number.isFinite(m.playbackRate))S.playbackRate=Math.max(0.25,Math.min(2,m.playbackRate));
    if(typeof m.loop==='boolean')S.loop=m.loop;
    if(typeof m.fit==='string'&&m.fit)S.fit=m.fit;
    if(typeof m.pos==='string'&&m.pos)S.pos=m.pos;
    syncPlayback(Boolean(m.unmute));
  });
  setInterval(function(){
    if(document.hidden||S.paused){stallTicks=0;lastT=-1;lastFrames=-1;lastCheckAt=0;return;}
    if(priming||v.readyState<1||v.seeking)return;
    if(v.ended&&!S.loop){stallTicks=0;return;}
    if(v.paused&&!v.ended){syncPlayback(false);lastT=Number(v.currentTime||0);lastCheckAt=Date.now();return;}
    var now=Date.now();
    var curT=Number(v.currentTime||0);
    var dur=Number(v.duration);
    var q=typeof v.getVideoPlaybackQuality==='function'?v.getVideoPlaybackQuality():null;
    var curF=q&&typeof q.totalVideoFrames==='number'?q.totalVideoFrames:rvfcCount;
    var moved=lastT<0||Math.abs(curT-lastT)>0.002||(lastFrames>=0&&curF>lastFrames);
    if(moved){
      stallTicks=0;
      lastT=curT;
      lastFrames=curF;
      lastCheckAt=now;
      return;
    }
    if(lastCheckAt>0&&(now-lastCheckAt)<900)return;
    lastCheckAt=now;
    stallTicks+=1;
    if(stallTicks>=2&&Number.isFinite(dur)&&dur>1.2&&curT>=dur-0.75){
      if(curT>0.8&&(!effectiveEnd||curT<effectiveEnd))effectiveEnd=Math.max(0.5,curT-0.06);
      stallTicks=0;
      lastT=0;
      lastFrames=curF;
      onEndOrWrap();
      return;
    }
    if(!v.muted&&stallTicks>=2&&v.readyState>=2){
      audioClockFallback=true;
      stallTicks=0;
      try{v.muted=true;syncWebAudioGain();v.play().catch(function(){});}catch(_){}
      post('audio-clock-fallback',{currentTime:curT});
      lastT=curT;
      lastFrames=curF;
      return;
    }
    if(stallTicks>=5){
      stallTicks=0;
      try{
        var resumeT=Number.isFinite(dur)&&dur>2&&curT<dur-0.75?curT:0;
        v.load();
        v.muted=Boolean(S.muted||S.volume<=0.005||audioClockFallback);
        syncWebAudioGain();
        if(resumeT>0.05)v.currentTime=resumeT;
        v.play().catch(function(){v.muted=true;syncWebAudioGain();v.play().catch(function(){});});
      }catch(_){}
      lastT=-1;
      lastFrames=-1;
      return;
    }else if(stallTicks>=3){
      try{
        var kickT=Number.isFinite(dur)&&dur>1.5&&curT<dur-0.75?Math.min(dur-0.1,curT+0.04):0;
        v.currentTime=kickT;
        v.play().catch(function(){});
        lastT=Number(v.currentTime||kickT);
        lastFrames=curF;
        return;
      }catch(_){}
    }
    lastT=curT;
    lastFrames=curF;
  },1200);
  window.addEventListener('pagehide',function(){
    try{if(audioCtx&&audioCtx.state!=='closed')audioCtx.close().catch(function(){});}catch(_){}
  });
  v.src=S.mediaSrc;
  syncPlayback(false);
})();
</script>
</body>
</html>`;
}

export async function createMediaServer(opts = {}) {
  const host = '127.0.0.1';
  const requestedPort = Number.isInteger(opts.port) && opts.port >= 0 ? opts.port : 0;
  const keepAlive = Boolean(opts.keepAlive);
  let runtimeContextGetter = typeof opts.getRuntimeContext === 'function'
    ? opts.getRuntimeContext
    : () => ({ config: {}, userProps: {} });
  const cacheDirGetter = typeof opts.getCacheDir === 'function'
    ? opts.getCacheDir
    : () => (typeof opts.cacheDir === 'string' ? opts.cacheDir : '');

  const vfsKit = createMp4VfsKit();
  const registry = new Map(); // token -> entry
  const sockets = new Set();
  const activeStreams = new Set();
  const activeProcs = new Set();

  // Bounded LRU for extracted `scene.pkg` MP4 / audio buffers
  const scenePayloadCache = new Map();
  let sceneCacheBytes = 0;

  // On-demand disk-cached video frame thumbnails via ffmpeg (concurrency-capped & deduplicated)
  const THUMB_MAX_CONCURRENCY = 3;
  const THUMB_FAIL_TTL_MS = 5 * 60 * 1000;
  const thumbInflight = new Map();
  const thumbFailedAt = new Map();
  const thumbQueue = [];
  let thumbActive = 0;
  let serverClosed = false;

  function computeVideoThumbPath(videoAbs) {
    try {
      const lst = lstatSync(videoAbs);
      if (lst.isSymbolicLink() || !lst.isFile()) return null;
      const st = statSync(videoAbs);
      const baseCache = cacheDirGetter() || join(tmpdir(), 'agy-wallpaper-prism-cache');
      const thumbDir = join(baseCache, 'thumbs');
      const hash = createHash('sha1')
        .update(`${videoAbs}|${st.size}|${Math.floor(st.mtimeMs)}`)
        .digest('hex')
        .slice(0, 24);
      return { thumbDir, hash, outPath: join(thumbDir, `${hash}.jpg`) };
    } catch {
      return null;
    }
  }

  function hasVideoThumbReadyOrCapable(videoAbs) {
    const cap = resolveFfmpegCapability();
    if (cap.available) return true;
    const loc = computeVideoThumbPath(videoAbs);
    if (!loc) return false;
    try {
      return existsSync(loc.outPath) && statSync(loc.outPath).size > 0;
    } catch {
      return false;
    }
  }

  function runThumbSlot(taskFn) {
    if (serverClosed) return Promise.resolve(null);
    return new Promise((resolveSlot) => {
      const launch = () => {
        if (serverClosed) {
          resolveSlot(null);
          return;
        }
        thumbActive += 1;
        Promise.resolve()
          .then(taskFn)
          .then(resolveSlot, () => resolveSlot(null))
          .finally(() => {
            thumbActive = Math.max(0, thumbActive - 1);
            if (!serverClosed && thumbQueue.length > 0 && thumbActive < THUMB_MAX_CONCURRENCY) {
              const next = thumbQueue.shift();
              if (next) next();
            }
          });
      };
      if (thumbActive < THUMB_MAX_CONCURRENCY) launch();
      else thumbQueue.push(launch);
    });
  }

  function execFfmpegFrame(bin, videoAbs, seekSec, outPath) {
    return new Promise((resolveExec) => {
      const args = [
        '-nostdin',
        '-hide_banner',
        '-loglevel', 'error',
        '-y',
        ...(seekSec > 0 ? ['-ss', String(seekSec)] : []),
        '-i', videoAbs,
        '-frames:v', '1',
        '-vf', 'scale=480:-2:flags=fast_bilinear',
        '-q:v', '4',
        outPath,
      ];
      execFile(
        bin,
        args,
        {
          timeout: 12000,
          windowsHide: true,
          env: cleanHostEnv(),
          stdio: ['ignore', 'ignore', 'pipe'],
        },
        (err) => {
          if (err) {
            if (err.code === 'ENOENT') {
              cachedFfmpegResolution = { available: false, bin: '' };
              resolveExec({ ok: false, enoent: true });
              return;
            }
            resolveExec({ ok: false, enoent: false });
            return;
          }
          try {
            const st = statSync(outPath);
            resolveExec({ ok: st.isFile() && st.size > 0, enoent: false });
          } catch {
            resolveExec({ ok: false, enoent: false });
          }
        },
      );
    });
  }

  function ensureVideoThumb(videoAbs, durationSec = 0) {
    const loc = computeVideoThumbPath(videoAbs);
    if (!loc) return Promise.resolve(null);
    const { thumbDir, hash, outPath } = loc;

    try {
      if (existsSync(outPath) && statSync(outPath).size > 0) {
        return Promise.resolve(outPath);
      }
    } catch { /* regenerate */ }

    const cap = resolveFfmpegCapability();
    if (!cap.available || !cap.bin || serverClosed) {
      return Promise.resolve(null);
    }

    const failedTs = thumbFailedAt.get(hash);
    if (failedTs && Date.now() - failedTs < THUMB_FAIL_TTL_MS) {
      return Promise.resolve(null);
    }

    if (thumbInflight.has(hash)) {
      return thumbInflight.get(hash);
    }

    const job = runThumbSlot(async () => {
      if (serverClosed) return null;
      try {
        mkdirSync(thumbDir, { recursive: true });
      } catch {
        return null;
      }
      const dur = Number(durationSec) || 0;
      const primarySeek = dur >= 12 ? 5 : dur >= 3 ? 2 : 0;
      const tmpPath = join(thumbDir, `${hash}.${process.pid}.${Math.random().toString(36).slice(2, 8)}.tmp.jpg`);

      let res1 = await execFfmpegFrame(cap.bin, videoAbs, primarySeek, tmpPath);
      if (!res1.ok && !res1.enoent && primarySeek > 0 && !serverClosed) {
        try { if (existsSync(tmpPath)) unlinkSync(tmpPath); } catch { /* ignore */ }
        res1 = await execFfmpegFrame(cap.bin, videoAbs, 0, tmpPath);
      }

      if (!res1.ok) {
        try { if (existsSync(tmpPath)) unlinkSync(tmpPath); } catch { /* ignore */ }
        thumbFailedAt.set(hash, Date.now());
        return null;
      }

      try {
        renameSync(tmpPath, outPath);
        thumbFailedAt.delete(hash);
        return outPath;
      } catch (err) {
        if (err && (err.code === 'EPERM' || err.code === 'EACCES' || err.code === 'EBUSY')) {
          try {
            if (existsSync(outPath)) unlinkSync(outPath);
            renameSync(tmpPath, outPath);
            thumbFailedAt.delete(hash);
            return outPath;
          } catch { /* fall through */ }
        }
        try { if (existsSync(tmpPath)) unlinkSync(tmpPath); } catch { /* ignore */ }
        return existsSync(outPath) ? outPath : null;
      }
    }).finally(() => {
      thumbInflight.delete(hash);
    });

    thumbInflight.set(hash, job);
    return job;
  }

  function getCachedSceneBuffer(cacheKey, loaderFn) {
    const hit = scenePayloadCache.get(cacheKey);
    if (hit) {
      scenePayloadCache.delete(cacheKey);
      scenePayloadCache.set(cacheKey, hit);
      return hit;
    }
    const loaded = loaderFn();
    if (!loaded) return null;
    if (loaded.kind === 'buffer' && loaded.bytes && loaded.bytes.byteLength <= SCENE_BUFFER_CACHE_MAX_BYTES) {
      while (
        scenePayloadCache.size > 0
        && (
          scenePayloadCache.size >= SCENE_BUFFER_CACHE_MAX_ENTRIES
          || sceneCacheBytes + loaded.bytes.byteLength > SCENE_BUFFER_CACHE_MAX_BYTES
        )
      ) {
        const [oldestKey, oldestVal] = scenePayloadCache.entries().next().value;
        scenePayloadCache.delete(oldestKey);
        sceneCacheBytes = Math.max(0, sceneCacheBytes - (oldestVal.bytes?.byteLength || 0));
      }
      scenePayloadCache.set(cacheKey, loaded);
      sceneCacheBytes += loaded.bytes.byteLength;
    }
    return loaded;
  }

  function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, If-None-Match');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, ETag, X-Prism-Mse-Mime');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Timing-Allow-Origin', '*');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }

  function sendJson(req, res, status, obj) {
    const body = Buffer.from(JSON.stringify(obj), 'utf8');
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': body.length,
      'Cache-Control': 'no-store',
    });
    if (req.method === 'HEAD') res.end();
    else res.end(body);
  }

  function pipeTrackedStream(stream, req, res) {
    activeStreams.add(stream);
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      activeStreams.delete(stream);
      try { stream.destroy(); } catch { /* ignore */ }
    };
    req.on('close', cleanup);
    req.on('aborted', cleanup);
    res.on('close', cleanup);
    stream.on('error', () => {
      activeStreams.delete(stream);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      }
      try { res.end(); } catch { /* ignore */ }
    });
    stream.on('end', () => activeStreams.delete(stream));
    stream.pipe(res);
  }

  function serveBufferWithRange(req, res, bytes, mime, etag = '') {
    const buf = Buffer.isBuffer(bytes)
      ? bytes
      : Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const totalSize = buf.length;
    const headers = {
      'Content-Type': mime,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=300',
    };
    if (etag) {
      headers.ETag = etag;
      if (!req.headers.range && req.headers['if-none-match'] === etag) {
        res.writeHead(304, headers);
        res.end();
        return;
      }
    }

    const range = parseByteRange(req.headers.range, totalSize);
    if (range && !range.valid) {
      res.writeHead(416, {
        ...headers,
        'Content-Range': `bytes */${totalSize}`,
        'Content-Length': 0,
      });
      res.end();
      return;
    }

    if (range && range.valid) {
      const slice = buf.subarray(range.start, range.end + 1);
      res.writeHead(206, {
        ...headers,
        'Content-Range': `bytes ${range.start}-${range.end}/${totalSize}`,
        'Content-Length': slice.length,
      });
      if (req.method === 'HEAD') res.end();
      else res.end(slice);
      return;
    }

    res.writeHead(200, {
      ...headers,
      'Content-Length': totalSize,
    });
    if (req.method === 'HEAD') res.end();
    else res.end(buf);
  }

  function serveFileWithRange(req, res, absPath, { useMp4Vfs = false, sessionKey = '', cacheControl = 'public, max-age=300' } = {}) {
    let st;
    try {
      const lst = lstatSync(absPath);
      if (lst.isSymbolicLink() || !lst.isFile()) {
        sendJson(req, res, 403, { error: 'Symbolic links and non-files are forbidden' });
        return;
      }
      st = statSync(absPath);
    } catch {
      sendJson(req, res, 404, { error: 'Media file not found' });
      return;
    }

    const mime = mimeForPath(absPath);
    const ext = extname(absPath).toLowerCase();
    const vfsVariant = useMp4Vfs && (ext === '.mp4' || ext === '.m4v' || ext === '.mov')
      ? vfsKit.pinnedFaststartVariant(absPath, sessionKey || absPath)
      : null;
    const layout = vfsVariant || { kind: 'plain', absPath, size: st.size };

    const totalSize = layout.kind === 'virtual' ? layout.size : st.size;
    const etag = `"${totalSize.toString(16)}-${Math.trunc(st.mtimeMs).toString(16)}-${layout.kind === 'virtual' ? 'vfs' : 'raw'}"`;

    const baseHeaders = {
      'Content-Type': mime,
      'Accept-Ranges': 'bytes',
      'Cache-Control': cacheControl,
      ETag: etag,
    };

    if (!req.headers.range && req.headers['if-none-match'] === etag) {
      res.writeHead(304, baseHeaders);
      res.end();
      return;
    }

    const range = parseByteRange(req.headers.range, totalSize);
    if (range && !range.valid) {
      res.writeHead(416, {
        ...baseHeaders,
        'Content-Range': `bytes */${totalSize}`,
        'Content-Length': 0,
      });
      res.end();
      return;
    }

    const start = range ? range.start : 0;
    const end = range ? range.end : Math.max(0, totalSize - 1);
    const contentLength = totalSize === 0 ? 0 : (end - start + 1);
    const status = range ? 206 : 200;
    const headers = {
      ...baseHeaders,
      'Content-Length': contentLength,
      ...(range ? { 'Content-Range': `bytes ${start}-${end}/${totalSize}` } : {}),
    };

    res.writeHead(status, headers);
    if (req.method === 'HEAD' || totalSize === 0) {
      res.end();
      return;
    }

    const stream = layout.kind === 'virtual'
      ? createVirtualSegmentStream(absPath, layout, start, end)
      : createReadStream(absPath, { start, end, highWaterMark: 512 * 1024 });
    pipeTrackedStream(stream, req, res);
  }

  let origin = '';

  const server = createServer((req, res) => {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      sendJson(req, res, 405, { error: 'Method Not Allowed' });
      return;
    }

    const rawUrl = req.url || '/';
    if (hasRawTraversalAttempt(rawUrl)) {
      sendJson(req, res, 403, { error: 'Forbidden: path traversal blocked' });
      return;
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(rawUrl, 'http://127.0.0.1');
    } catch {
      sendJson(req, res, 400, { error: 'Malformed URL' });
      return;
    }

    const parts = parsedUrl.pathname.split('/').filter(Boolean);
    if (parts.length === 0 || (parts.length === 1 && parts[0] === 'health')) {
      sendJson(req, res, 200, { ok: true, entries: registry.size, origin });
      return;
    }

    const route = parts[0];
    const token = parts[1] ? decodeURIComponent(parts[1]) : '';
    const entry = token ? registry.get(token) : null;

    // Security: even for unknown tokens on `/web/` or `/scene-files/`, traversal was caught above;
    // missing token returns 404.
    if (!entry) {
      sendJson(req, res, 404, { error: 'Unknown media token' });
      return;
    }

    const fsMeta = entry._fs || {};

    if (route === 'media') {
      if (!fsMeta.primaryAbs) {
        sendJson(req, res, 404, { error: 'No primary media file for item' });
        return;
      }
      serveFileWithRange(req, res, fsMeta.primaryAbs, {
        useMp4Vfs: true,
        sessionKey: `${token}:${parsedUrl.searchParams.get('s') || 'main'}`,
      });
      return;
    }

    if (route === 'mse-fmp4') {
      if (!fsMeta.primaryAbs) {
        sendJson(req, res, 404, { error: 'No primary video file for MSE fMP4 stream' });
        return;
      }
      try {
        const lst = lstatSync(fsMeta.primaryAbs);
        if (lst.isSymbolicLink() || !lst.isFile()) {
          sendJson(req, res, 403, { error: 'Symbolic links and non-files are forbidden' });
          return;
        }
      } catch {
        sendJson(req, res, 404, { error: 'Media file not found' });
        return;
      }
      const cap = resolveFfmpegCapability();
      if (!cap.available || !cap.bin) {
        sendJson(req, res, 501, { error: 'ffmpeg is not available for MSE fMP4 remuxing' });
        return;
      }
      const mseMime = probeMseVideoMime(fsMeta.primaryAbs);
      const mseHeaders = {
        'Content-Type': 'video/mp4',
        'X-Prism-Mse-Mime': mseMime,
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': 'X-Prism-Mse-Mime',
      };
      if (req.method === 'HEAD') {
        res.writeHead(200, mseHeaders);
        res.end();
        return;
      }
      const ff = spawn(
        cap.bin,
        [
          '-nostdin',
          '-hide_banner',
          '-loglevel', 'error',
          '-i', fsMeta.primaryAbs,
          '-map', '0:v:0',
          '-c:v', 'copy',
          '-an',
          '-f', 'mp4',
          '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
          'pipe:1',
        ],
        {
          windowsHide: true,
          env: cleanHostEnv(),
          stdio: ['ignore', 'pipe', 'ignore'],
        },
      );
      activeProcs.add(ff);
      let killed = false;
      const killFf = () => {
        if (killed) return;
        killed = true;
        activeProcs.delete(ff);
        try {
          if (!ff.killed && ff.exitCode === null) {
            ff.kill('SIGKILL');
          }
        } catch { /* ignore */ }
        try { ff.stdout?.destroy(); } catch { /* ignore */ }
      };
      req.on('close', killFf);
      req.on('aborted', killFf);
      res.on('close', killFf);
      ff.on('exit', () => {
        activeProcs.delete(ff);
      });
      ff.on('error', () => {
        activeProcs.delete(ff);
        if (!res.headersSent) {
          sendJson(req, res, 501, { error: 'Failed to spawn ffmpeg for MSE fMP4 remuxing' });
        } else {
          try { res.end(); } catch { /* ignore */ }
        }
      });
      res.writeHead(200, mseHeaders);
      ff.stdout.pipe(res);
      return;
    }

    if (route === 'preview') {
      if (fsMeta.isBuiltinAurora) {
        const svg = Buffer.from(buildBuiltinAuroraSvg(), 'utf8');
        serveBufferWithRange(req, res, svg, 'image/svg+xml', '"builtin-prism-aurora-v1"');
        return;
      }
      if (fsMeta.previewAbs) {
        serveFileWithRange(req, res, fsMeta.previewAbs, { cacheControl: 'public, max-age=3600' });
        return;
      }
      if (entry.kind === 'video' && fsMeta.primaryAbs) {
        ensureVideoThumb(fsMeta.primaryAbs, entry.durationSec)
          .then((thumbAbs) => {
            if (res.writableEnded || res.destroyed) return;
            if (!thumbAbs) {
              sendJson(req, res, 404, { error: 'No preview image available' });
              return;
            }
            serveFileWithRange(req, res, thumbAbs, { cacheControl: 'public, max-age=86400' });
          })
          .catch(() => {
            if (!res.writableEnded && !res.destroyed) {
              sendJson(req, res, 500, { error: 'Video thumbnail generation failed' });
            }
          });
        return;
      }
      sendJson(req, res, 404, { error: 'No preview image available' });
      return;
    }

    if (route === 'slides') {
      const slides = Array.isArray(fsMeta.slidesAbs) ? fsMeta.slidesAbs : [];
      const urls = slides.map((_, idx) => `${origin}/slide/${encodeURIComponent(token)}/${idx}`);
      sendJson(req, res, 200, {
        id: entry.id,
        count: urls.length,
        intervalMs: entry.slideIntervalMs || 30_000,
        slides: urls,
      });
      return;
    }

    if (route === 'slide') {
      const idx = Number(parts[2]);
      const slides = Array.isArray(fsMeta.slidesAbs) ? fsMeta.slidesAbs : [];
      if (!Number.isInteger(idx) || idx < 0 || idx >= slides.length) {
        sendJson(req, res, 404, { error: 'Slide index out of bounds' });
        return;
      }
      serveFileWithRange(req, res, slides[idx], { cacheControl: 'public, max-age=600' });
      return;
    }

    if (route === 'audio') {
      if (!fsMeta.looseAudioAbs) {
        sendJson(req, res, 404, { error: 'No loose audio file' });
        return;
      }
      serveFileWithRange(req, res, fsMeta.looseAudioAbs);
      return;
    }

    if (route === 'scene-video') {
      if (!fsMeta.sceneContainerAbs) {
        sendJson(req, res, 404, { error: 'No scene container' });
        return;
      }
      let mtimeTag = '0';
      try { mtimeTag = String(Math.trunc(statSync(fsMeta.sceneContainerAbs).mtimeMs)); } catch { /* ignore */ }
      const cacheDir = cacheDirGetter();
      const payload = getCachedSceneBuffer(
        `vid:${token}:${mtimeTag}:${cacheDir ? 'disk' : 'mem'}`,
        () => extractSceneVideoPayload(fsMeta.sceneContainerAbs, { cacheDir }),
      );
      if (!payload) {
        sendJson(req, res, 404, { error: 'No embedded video inside scene container' });
        return;
      }
      if (payload.kind === 'file' && payload.absPath) {
        serveFileWithRange(req, res, payload.absPath, { useMp4Vfs: true, sessionKey: `scene-vid:${token}` });
      } else if (payload.kind === 'buffer' && payload.bytes) {
        serveBufferWithRange(req, res, payload.bytes, payload.mime || 'video/mp4', `"sv-${token}-${mtimeTag}"`);
      } else {
        sendJson(req, res, 404, { error: 'Empty scene video payload' });
      }
      return;
    }

    if (route === 'scene-audio') {
      if (!fsMeta.sceneContainerAbs) {
        sendJson(req, res, 404, { error: 'No scene container' });
        return;
      }
      let mtimeTag = '0';
      try { mtimeTag = String(Math.trunc(statSync(fsMeta.sceneContainerAbs).mtimeMs)); } catch { /* ignore */ }
      const cacheDir = cacheDirGetter();
      const payload = getCachedSceneBuffer(
        `aud:${token}:${mtimeTag}:${cacheDir ? 'disk' : 'mem'}`,
        () => extractSceneAudioPayload(fsMeta.sceneContainerAbs, { cacheDir }),
      );
      if (!payload) {
        sendJson(req, res, 404, { error: 'No embedded audio inside scene container' });
        return;
      }
      if (payload.kind === 'file' && payload.absPath) {
        serveFileWithRange(req, res, payload.absPath);
      } else if (payload.kind === 'buffer' && payload.bytes) {
        serveBufferWithRange(req, res, payload.bytes, payload.mime || 'audio/mpeg', `"sa-${token}-${mtimeTag}"`);
      } else {
        sendJson(req, res, 404, { error: 'Empty scene audio payload' });
      }
      return;
    }

    if (route === 'video-stage') {
      const srcParam = (parsedUrl.searchParams.get('src') || '').trim();
      const useSceneVideo = srcParam === 'scene-video' || (!fsMeta.primaryAbs && Boolean(fsMeta.hasSceneVideo));
      const hasPlayable = useSceneVideo ? Boolean(fsMeta.sceneContainerAbs) : Boolean(fsMeta.primaryAbs);
      if (!hasPlayable) {
        sendJson(req, res, 404, { error: 'No video file mapped for video-stage' });
        return;
      }
      const ctx = runtimeContextGetter(entry) || {};
      const cfg = ctx.config || {};
      const encToken = encodeURIComponent(token);
      const mediaSrc = useSceneVideo ? `../scene-video/${encToken}` : `../media/${encToken}`;
      const audioSrc = fsMeta.hasSceneAudio
        ? `../scene-audio/${encToken}`
        : fsMeta.looseAudioAbs
          ? `../audio/${encToken}`
          : '';
      const posterSrc = entry.thumbUrl ? `../preview/${encToken}` : '';
      const sid = parsedUrl.searchParams.get('sid') || '';
      const html = buildVideoStageHtml({ mediaSrc, audioSrc, posterSrc, sid, cfg });
      const body = Buffer.from(html, 'utf8');
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Length': body.length,
        'Cache-Control': 'no-store',
      });
      if (req.method === 'HEAD') res.end();
      else res.end(body);
      return;
    }

    if (route === 'scene-live') {
      const ctx = runtimeContextGetter(entry) || {};
      const cfg = ctx.config || {};
      const html = buildLiveSceneHtml(entry, cfg, {
        sceneVideoUrl: entry.sceneVideoUrl || '',
        thumbUrl: entry.thumbUrl || '',
        audioUrl: entry.audioUrl || '',
      });
      const body = Buffer.from(html, 'utf8');
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Length': body.length,
        'Cache-Control': 'no-store',
      });
      if (req.method === 'HEAD') res.end();
      else res.end(body);
      return;
    }

    if (route === 'web' || route === 'scene-files') {
      if (!fsMeta.projectDir) {
        sendJson(req, res, 404, { error: 'No project directory mapped' });
        return;
      }
      const subParts = parts.slice(2);
      const effectiveSub = subParts.length > 0
        ? subParts
        : (fsMeta.webEntryRel ? fsMeta.webEntryRel.split('/') : ['index.html']);

      const resolved = resolveWebAssetPath(fsMeta.projectDir, effectiveSub);
      if (resolved.status === 403) {
        sendJson(req, res, 403, { error: 'Forbidden: path outside wallpaper directory' });
        return;
      }
      if (resolved.status !== 200 || !resolved.absPath) {
        sendJson(req, res, 404, { error: 'Asset not found' });
        return;
      }

      const ext = extname(resolved.absPath).toLowerCase();
      if (route === 'web' && (ext === '.html' || ext === '.htm')) {
        let rawHtml = '';
        try {
          rawHtml = readFileSync(resolved.absPath, 'utf8');
        } catch {
          sendJson(req, res, 500, { error: 'Failed to read HTML entry' });
          return;
        }
        const ctx = runtimeContextGetter(entry) || {};
        const cfg = ctx.config || {};
        const seedProps = ctx.wireProps || entry.wireProps || {};
        const fps = Number(cfg.fpsCap) > 0 ? Number(cfg.fpsCap) : 30;
        const dirRel = posix.dirname(resolved.relPosix);
        const baseSuffix = dirRel && dirRel !== '.' ? `${encodeUrlSubpath(dirRel)}/` : '';
        const baseHref = `${origin}/web/${encodeURIComponent(token)}/${baseSuffix}`;
        const injected = injectWebWallpaperHtml(rawHtml, {
          baseHref,
          seedProps,
          fps,
          paused: Boolean(cfg.paused),
        });
        const body = Buffer.from(injected, 'utf8');
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Length': body.length,
          'Cache-Control': 'no-store',
        });
        if (req.method === 'HEAD') res.end();
        else res.end(body);
        return;
      }

      serveFileWithRange(req, res, resolved.absPath, {
        useMp4Vfs: true,
        sessionKey: `web:${token}:${resolved.relPosix}`,
      });
      return;
    }

    if (route === 'media-info') {
      sendJson(req, res, 200, {
        id: entry.id,
        kind: entry.kind,
        resolution: entry.resolution || '',
        width: entry.width || null,
        height: entry.height || null,
        durationSec: entry.durationSec || null,
        fps: entry.fps || null,
        fileSize: entry.fileSize || 0,
      });
      return;
    }

    sendJson(req, res, 404, { error: 'Route not found' });
  });

  server.on('connection', (sock) => {
    sockets.add(sock);
    if (!keepAlive) sock.unref();
    sock.on('close', () => sockets.delete(sock));
  });

  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(requestedPort, host, () => {
      server.removeListener('error', rejectListen);
      resolveListen();
    });
  });

  if (!keepAlive) server.unref();

  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : requestedPort;
  origin = `http://${host}:${port}`;

  /** Attach loopback HTTP URLs to scanned items and populate the token registry. */
  function syncLibrary(rawItems = []) {
    const nextRegistry = new Map();
    const publicItems = [];
    const ffmpegAvailable = resolveFfmpegCapability().available;

    for (const raw of rawItems) {
      if (!raw || !raw.id) continue;
      const token = tokenForWallpaperId(raw.id);
      const encToken = encodeURIComponent(token);
      const fsMeta = raw._fs || {};

      const thumbUrl = (
        fsMeta.previewAbs
        || fsMeta.isBuiltinAurora
        || (raw.kind === 'video' && fsMeta.primaryAbs && hasVideoThumbReadyOrCapable(fsMeta.primaryAbs))
      )
        ? `${origin}/preview/${encToken}`
        : '';
      const sceneVideoUrl = fsMeta.hasSceneVideo ? `${origin}/scene-video/${encToken}` : '';
      const sceneLiveUrl = raw.kind === 'scene' ? `${origin}/scene-live/${encToken}` : '';
      const videoStageUrl = (raw.kind === 'video' && fsMeta.primaryAbs)
        ? `${origin}/video-stage/${encToken}`
        : fsMeta.hasSceneVideo
          ? `${origin}/video-stage/${encToken}?src=scene-video`
          : '';
      const mseFmp4Url = (raw.kind === 'video' && fsMeta.primaryAbs && ffmpegAvailable)
        ? `${origin}/mse-fmp4/${encToken}`
        : '';
      const slidesUrl = raw.kind === 'slideshow' ? `${origin}/slides/${encToken}` : '';
      const webUrl = raw.kind === 'web'
        ? `${origin}/web/${encToken}/${encodeUrlSubpath(fsMeta.webEntryRel || 'index.html')}`
        : '';
      const audioUrl = fsMeta.hasSceneAudio
        ? `${origin}/scene-audio/${encToken}`
        : fsMeta.looseAudioAbs
          ? `${origin}/audio/${encToken}`
          : '';

      let mediaUrl = '';
      if (raw.kind === 'image' || raw.kind === 'video') {
        mediaUrl = fsMeta.primaryAbs ? `${origin}/media/${encToken}` : thumbUrl;
      } else if (raw.kind === 'slideshow') {
        mediaUrl = fsMeta.slidesAbs?.length ? `${origin}/slide/${encToken}/0` : thumbUrl;
      } else if (raw.kind === 'web') {
        mediaUrl = webUrl;
      } else if (raw.kind === 'scene') {
        if (raw.sceneMode === 'video' && sceneVideoUrl) mediaUrl = sceneVideoUrl;
        else if (raw.sceneMode === 'live') mediaUrl = sceneLiveUrl;
        else mediaUrl = thumbUrl || sceneLiveUrl;
      }

      const slides = raw.kind === 'slideshow' && Array.isArray(fsMeta.slidesAbs)
        ? fsMeta.slidesAbs.slice(0, 500).map((_, idx) => `${origin}/slide/${encToken}/${idx}`)
        : undefined;

      const enrichedInternal = {
        ...raw,
        token,
        thumbUrl,
        mediaUrl,
        audioUrl,
        slidesUrl,
        ...(slides ? { slides } : {}),
        sceneVideoUrl,
        sceneLiveUrl,
        videoStageUrl,
        mseFmp4Url,
        webUrl,
      };
      nextRegistry.set(token, enrichedInternal);

      const { _fs: _hiddenFs, ...publicItem } = enrichedInternal;
      publicItems.push(publicItem);
    }

    registry.clear();
    for (const [k, v] of nextRegistry.entries()) {
      registry.set(k, v);
    }
    return publicItems;
  }

  /** Register an individual file or directory entry directly (useful for unit tests & uploads). */
  function registerEntry(item) {
    if (!item || !item.id) return null;
    const existing = [];
    for (const val of registry.values()) {
      if (val.id !== item.id) existing.push(val);
    }
    existing.push(item);
    const pub = syncLibrary(existing);
    return pub.find((x) => x.id === item.id) || null;
  }

  function registerFile(id, absPath, kind = 'video') {
    const cleanAbs = resolve(absPath);
    return registerEntry({
      id,
      title: id,
      kind,
      source: 'local',
      workshopId: '',
      contentRating: 'everyone',
      tags: [],
      schemeColor: '#669DF6',
      sceneMode: null,
      properties: [],
      wireProps: {},
      fileSize: existsSync(cleanAbs) ? statSync(cleanAbs).size : 0,
      resolution: '',
      _fs: {
        projectDir: dirname(cleanAbs),
        primaryAbs: cleanAbs,
        previewAbs: kind === 'image' ? cleanAbs : null,
        slidesAbs: [],
        sceneContainerAbs: null,
        hasSceneVideo: false,
        hasSceneAudio: false,
        looseAudioAbs: null,
        webEntryRel: kind === 'web' ? posix.basename(cleanAbs.replace(/\\/g, '/')) : '',
      },
    });
  }

  function setRuntimeContextGetter(fn) {
    if (typeof fn === 'function') runtimeContextGetter = fn;
  }

  /**
   * In-process HTTP request injector (`{ method, url, headers } -> { status, headers, body }`).
   * Exercises the exact `server` request listener (including `Range`, `403`, `mp4-vfs` streams)
   * even inside network-isolated AppContainer sandboxes where loopback TCP `connect` is restricted.
   */
  function inject({ method = 'GET', url = '/', headers = {} } = {}) {
    return new Promise((resolveInject, rejectInject) => {
      const normHeaders = {};
      for (const [k, v] of Object.entries(headers || {})) {
        normHeaders[String(k).toLowerCase()] = v;
      }

      const req = new EventEmitter();
      req.method = String(method || 'GET').toUpperCase();
      req.url = String(url || '/');
      req.headers = normHeaders;

      const resHeaders = {};
      const chunks = [];
      let statusCode = 200;
      let headersSent = false;

      const res = new Writable({
        write(chunk, _enc, cb) {
          headersSent = true;
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          cb();
        },
      });

      Object.defineProperty(res, 'headersSent', {
        get: () => headersSent,
      });

      res.setHeader = (name, val) => {
        resHeaders[String(name).toLowerCase()] = val;
      };
      res.getHeader = (name) => resHeaders[String(name).toLowerCase()];
      res.writeHead = (code, hdrs = {}) => {
        statusCode = code;
        headersSent = true;
        for (const [k, v] of Object.entries(hdrs || {})) {
          resHeaders[String(k).toLowerCase()] = v;
        }
        return res;
      };

      res.on('finish', () => {
        res.emit('close');
        resolveInject({
          status: statusCode,
          statusCode,
          headers: resHeaders,
          body: Buffer.concat(chunks),
        });
      });
      res.on('error', rejectInject);

      try {
        server.emit('request', req, res);
      } catch (err) {
        rejectInject(err);
      }
    });
  }

  async function close() {
    serverClosed = true;
    thumbQueue.length = 0;
    thumbInflight.clear();
    for (const proc of activeProcs) {
      try { proc.kill('SIGKILL'); } catch { /* ignore */ }
    }
    activeProcs.clear();
    for (const stream of activeStreams) {
      try { stream.destroy(); } catch { /* ignore */ }
    }
    activeStreams.clear();
    for (const sock of sockets) {
      try { sock.destroy(); } catch { /* ignore */ }
    }
    sockets.clear();
    scenePayloadCache.clear();
    sceneCacheBytes = 0;
    vfsKit.clear();
    await new Promise((resolveClose) => {
      try {
        server.close(() => resolveClose());
      } catch {
        resolveClose();
      }
    });
  }

  return {
    origin,
    port,
    server,
    vfsKit,
    getOrigin: () => origin,
    syncLibrary,
    registerEntry,
    registerFile,
    setRuntimeContextGetter,
    inject,
    close,
  };
}
