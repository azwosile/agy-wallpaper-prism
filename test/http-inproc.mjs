import { IncomingMessage, ServerResponse } from 'node:http';
import { Duplex } from 'node:stream';

/**
 * Dispatches an HTTP request directly into a Node `http.Server` or `(req, res)` listener in-memory.
 * Supports streaming bodies (`req` Readable), `stream.pipe(res)`, `res.writeHead(206, ...)`,
 * `res.setHeader(...)`, `HEAD`, `OPTIONS`, and binary buffers — 100% compatible with sandboxed environments
 * where OS loopback TCP `connect()` is blocked (`EACCES`).
 */
export function invokeServerInMemory(serverOrHandler, { method = 'GET', url = '/', headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const handler =
      typeof serverOrHandler === 'function'
        ? serverOrHandler
        : (req, res) => serverOrHandler.emit('request', req, res);

    // Dummy duplex socket for IncomingMessage / ServerResponse
    const socket = new Duplex({
      read() {},
      write(_chunk, _enc, cb) {
        cb();
      },
    });
    socket.remoteAddress = '127.0.0.1';
    socket.writable = true;
    socket.readable = true;

    const req = new IncomingMessage(socket);
    req.method = method.toUpperCase();
    req.url = url;
    req.httpVersion = '1.1';
    req.httpVersionMajor = 1;
    req.httpVersionMinor = 1;

    const normHeaders = {};
    for (const [k, v] of Object.entries(headers || {})) {
      if (v !== undefined && v !== null) {
        normHeaders[k.toLowerCase()] = String(v);
      }
    }
    const bodyBuf =
      body === null || body === undefined
        ? null
        : Buffer.isBuffer(body)
          ? body
          : typeof body === 'string'
            ? Buffer.from(body, 'utf8')
            : Buffer.from(body);

    if (bodyBuf && normHeaders['content-length'] === undefined) {
      normHeaders['content-length'] = String(bodyBuf.length);
    }
    req.headers = normHeaders;

    const res = new ServerResponse(req);
    const bodyChunks = [];
    let statusCode = 200;
    let explicitHeaders = {};
    let settled = false;

    const origWriteHead = res.writeHead.bind(res);
    let sseTimer = null;
    const isSseResponse = () => {
      const ct = String(explicitHeaders['content-type'] || res.getHeader('content-type') || '').toLowerCase();
      return ct.includes('text/event-stream');
    };
    const settleResponse = () => {
      if (settled) return;
      settled = true;
      if (sseTimer) {
        clearTimeout(sseTimer);
        sseTimer = null;
      }
      const outHeaders = { ...res.getHeaders(), ...explicitHeaders };
      const finalBuf = Buffer.concat(bodyChunks);
      queueMicrotask(() => {
        req.emit('close');
        res.emit('finish');
        res.emit('close');
        resolve({
          status: res.statusCode || statusCode || 200,
          headers: outHeaders,
          body: finalBuf,
          text: () => finalBuf.toString('utf8'),
          json: () => JSON.parse(finalBuf.toString('utf8')),
        });
      });
    };

    res.writeHead = function patchedWriteHead(code, statusMsgOrHeaders, maybeHeaders) {
      statusCode = Number(code) || 200;
      const hdrs =
        typeof statusMsgOrHeaders === 'object' && statusMsgOrHeaders !== null
          ? statusMsgOrHeaders
          : maybeHeaders || {};
      for (const [hk, hv] of Object.entries(hdrs)) {
        explicitHeaders[hk.toLowerCase()] = hv;
      }
      const out = origWriteHead(code, statusMsgOrHeaders, maybeHeaders);
      if (isSseResponse() && !sseTimer) {
        sseTimer = setTimeout(settleResponse, 35);
      }
      return out;
    };

    res.write = function patchedWrite(chunk, encoding, cb) {
      if (chunk) {
        bodyChunks.push(Buffer.isBuffer(chunk) ? Buffer.from(chunk) : Buffer.from(chunk, encoding || 'utf8'));
      }
      if (isSseResponse()) {
        const joined = Buffer.concat(bodyChunks).toString('utf8');
        if (joined.includes('data:') && joined.includes('\n\n')) {
          if (sseTimer) clearTimeout(sseTimer);
          sseTimer = setTimeout(settleResponse, 8);
        } else if (!sseTimer) {
          sseTimer = setTimeout(settleResponse, 35);
        }
      }
      if (typeof encoding === 'function') encoding();
      else if (typeof cb === 'function') cb();
      return true;
    };

    res.end = function patchedEnd(chunk, encoding, cb) {
      if (chunk && typeof chunk !== 'function') {
        bodyChunks.push(Buffer.isBuffer(chunk) ? Buffer.from(chunk) : Buffer.from(chunk, encoding || 'utf8'));
      }
      settleResponse();
      if (typeof chunk === 'function') chunk();
      else if (typeof encoding === 'function') encoding();
      else if (typeof cb === 'function') cb();
      return res;
    };

    res.on('error', (err) => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    });

    try {
      handler(req, res);
      // Push request body ticks asynchronously so handler can attach 'data' / 'end' listeners first
      queueMicrotask(() => {
        if (bodyBuf && bodyBuf.length > 0) {
          req.push(bodyBuf);
        }
        req.push(null);
      });
    } catch (err) {
      if (!settled) {
        settled = true;
        reject(err);
      }
    }
  });
}
