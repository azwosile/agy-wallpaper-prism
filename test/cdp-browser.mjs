import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CANDIDATE_BROWSERS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

export function findBrowserExecutable() {
  for (const p of CANDIDATE_BROWSERS) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Neither chrome.exe nor msedge.exe found in standard Windows paths.');
}

export function readPngDimensions(buf) {
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) {
    throw new Error('Invalid PNG header');
  }
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
  };
}

class PipeTransport {
  constructor(writeStream, readStream) {
    this.writeStream = writeStream;
    this.readStream = readStream;
    this.seq = 0;
    this.pending = new Map();
    this.eventListeners = new Set();
    this.buffer = '';

    this.readStream.setEncoding('utf8');
    this.readStream.on('data', (chunk) => {
      this.buffer += chunk;
      let idx;
      while ((idx = this.buffer.indexOf('\0')) !== -1) {
        const raw = this.buffer.slice(0, idx);
        this.buffer = this.buffer.slice(idx + 1);
        if (!raw) continue;
        let msg;
        try {
          msg = JSON.parse(raw);
        } catch {
          continue;
        }
        this._handleMessage(msg);
      }
    });
  }

  _handleMessage(msg) {
    if (msg.id) {
      const entry = this.pending.get(msg.id);
      if (entry) {
        this.pending.delete(msg.id);
        if (msg.error) {
          entry.reject(new Error(`${entry.method}: ${msg.error.message || JSON.stringify(msg.error)}`));
        } else {
          entry.resolve(msg.result);
        }
      }
      return;
    }
    if (msg.method) {
      for (const fn of [...this.eventListeners]) {
        fn(msg);
      }
    }
  }

  onEvent(fn) {
    this.eventListeners.add(fn);
    return () => this.eventListeners.delete(fn);
  }

  send(method, params = {}, sessionId = undefined, timeoutMs = 15000) {
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP timeout on ${method} after ${timeoutMs}ms`));
      }, timeoutMs);
      this.pending.set(id, {
        method,
        resolve: (res) => {
          clearTimeout(timer);
          resolve(res);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
      });
      const payload = sessionId ? { id, method, params, sessionId } : { id, method, params };
      this.writeStream.write(JSON.stringify(payload) + '\0');
    });
  }

  close() {
    for (const [, p] of this.pending) {
      p.reject(new Error('CDP pipe closed'));
    }
    this.pending.clear();
  }
}

export class CdpPageSession {
  constructor(transport, sessionId, targetId) {
    this.transport = transport;
    this.sessionId = sessionId;
    this.targetId = targetId;
    this.listeners = new Map();
    this.consoleLogs = [];
    this.consoleErrors = [];
    this.pageExceptions = [];
    this.bindings = new Map();
    this.requestHandler = null;

    this._off = this.transport.onEvent((msg) => {
      if (msg.sessionId !== this.sessionId) return;
      const { method, params } = msg;
      if (method === 'Runtime.consoleAPICalled') {
        const text = (params?.args || [])
          .map((a) => a.value ?? a.description ?? JSON.stringify(a))
          .join(' ');
        this.consoleLogs.push({ type: params?.type, text });
        if (params?.type === 'error') {
          this.consoleErrors.push(text);
        }
      } else if (method === 'Runtime.exceptionThrown') {
        const d = params?.exceptionDetails;
        this.pageExceptions.push(d?.exception?.description || d?.text || JSON.stringify(d));
      } else if (method === 'Runtime.bindingCalled') {
        const fn = this.bindings.get(params?.name);
        if (fn) {
          Promise.resolve(fn(params.payload, params.executionContextId)).catch((err) => {
            this.pageExceptions.push(`Binding ${params?.name} error: ${err?.message || err}`);
          });
        }
      } else if (method === 'Fetch.requestPaused' && this.requestHandler) {
        this._handleFetchPaused(params).catch(() => {});
      }

      const set = this.listeners.get(method);
      if (set) {
        for (const fn of [...set]) fn(params);
      }
    });
  }

  async _handleFetchPaused(params) {
    const { requestId, request } = params;
    try {
      const reply = await this.requestHandler({
        url: request.url,
        method: request.method || 'GET',
        headers: request.headers || {},
        postData: request.postData
          ? Buffer.from(request.postData, 'utf8')
          : request.postDataEntries?.length
            ? Buffer.concat(request.postDataEntries.map((e) => Buffer.from(e.bytes || '', 'base64')))
            : null,
        resourceType: params.resourceType,
      });
      if (!reply) {
        await this.call('Fetch.failRequest', { requestId, errorReason: 'ConnectionRefused' });
        return;
      }
      const responseHeaders = [];
      for (const [k, v] of Object.entries(reply.headers || {})) {
        if (v === undefined || v === null) continue;
        if (Array.isArray(v)) {
          for (const item of v) responseHeaders.push({ name: k, value: String(item) });
        } else {
          responseHeaders.push({ name: k, value: String(v) });
        }
      }
      const bodyBuf = Buffer.isBuffer(reply.body)
        ? reply.body
        : typeof reply.body === 'string'
          ? Buffer.from(reply.body, 'utf8')
          : Buffer.alloc(0);
      await this.call('Fetch.fulfillRequest', {
        requestId,
        responseCode: reply.status || 200,
        responseHeaders,
        body: bodyBuf.toString('base64'),
      });
    } catch (err) {
      try {
        await this.call('Fetch.fulfillRequest', {
          requestId,
          responseCode: 500,
          responseHeaders: [{ name: 'Content-Type', value: 'text/plain; charset=utf-8' }],
          body: Buffer.from(String(err?.stack || err), 'utf8').toString('base64'),
        });
      } catch {}
    }
  }

  on(method, fn) {
    if (!this.listeners.has(method)) this.listeners.set(method, new Set());
    this.listeners.get(method).add(fn);
    return () => this.listeners.get(method)?.delete(fn);
  }

  call(method, params = {}, timeoutMs = 15000) {
    return this.transport.send(method, params, this.sessionId, timeoutMs);
  }

  async enableRequestRouter(handler, patterns = [{ urlPattern: 'http://*' }, { urlPattern: 'https://*' }]) {
    this.requestHandler = handler;
    await this.call('Fetch.enable', { patterns });
  }

  async addBinding(name, handler) {
    this.bindings.set(name, handler);
    await this.call('Runtime.addBinding', { name });
  }

  async addInitScript(source) {
    return this.call('Page.addScriptToEvaluateOnNewDocument', { source });
  }

  async evaluate(expression, { awaitPromise = true, returnByValue = true } = {}) {
    const res = await this.call('Runtime.evaluate', {
      expression,
      awaitPromise,
      returnByValue,
    });
    if (res.exceptionDetails) {
      const desc = res.exceptionDetails.exception?.description || res.exceptionDetails.text || 'Eval failed';
      throw new Error(`Page evaluate exception: ${desc}`);
    }
    return res.result?.value;
  }

  async setViewport(width = 1440, height = 900, deviceScaleFactor = 1) {
    await this.call('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor,
      mobile: false,
      screenWidth: width,
      screenHeight: height,
    });
  }

  async navigate(url) {
    const loadP = new Promise((resolve) => {
      const off = this.on('Page.loadEventFired', () => {
        off();
        resolve();
      });
      setTimeout(() => {
        off();
        resolve();
      }, 10000);
    });
    await this.call('Page.navigate', { url });
    await loadP;
  }

  async pressKey({
    key,
    code,
    windowsVirtualKeyCode,
    modifiers = 0, // 1=Alt, 2=Ctrl, 4=Meta, 8=Shift
  }) {
    await this.call('Input.dispatchKeyEvent', {
      type: 'rawKeyDown',
      key,
      code,
      windowsVirtualKeyCode,
      nativeVirtualKeyCode: windowsVirtualKeyCode,
      modifiers,
    });
    await this.call('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key,
      code,
      windowsVirtualKeyCode,
      nativeVirtualKeyCode: windowsVirtualKeyCode,
      modifiers,
    });
  }

  async capturePng(outPath, { expectedWidth = 1440, expectedHeight = 900 } = {}) {
    const res = await this.call('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: false,
    });
    const buf = Buffer.from(res.data, 'base64');
    const dims = readPngDimensions(buf);
    if (expectedWidth && dims.width !== expectedWidth) {
      throw new Error(`Screenshot width mismatch: got ${dims.width}, expected ${expectedWidth}`);
    }
    if (expectedHeight && dims.height !== expectedHeight) {
      throw new Error(`Screenshot height mismatch: got ${dims.height}, expected ${expectedHeight}`);
    }
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, buf);
    return { bytes: buf.length, ...dims, path: outPath };
  }

  dispose() {
    this._off?.();
    this.listeners.clear();
    this.bindings.clear();
  }
}

export async function launchHeadlessBrowser({
  profileBaseDir = path.join(os.tmpdir(), 'agy-prism-headless'),
  width = 1440,
  height = 900,
} = {}) {
  const exe = findBrowserExecutable();
  const userDataDir = path.join(
    profileBaseDir,
    `run-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  );
  fs.mkdirSync(userDataDir, { recursive: true });

  const proc = spawn(
    exe,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--force-device-scale-factor=1',
      '--hide-scrollbars',
      `--window-size=${width},${height}`,
      `--user-data-dir=${userDataDir}`,
      '--remote-debugging-pipe',
      'about:blank',
    ],
    { stdio: ['ignore', 'pipe', 'pipe', 'pipe', 'pipe'] },
  );

  proc.stderr.on('data', () => {});
  const transport = new PipeTransport(proc.stdio[3], proc.stdio[4]);
  const version = await transport.send('Browser.getVersion');

  async function openPage({ url = 'about:blank', requestHandler = null, initScript = null, width: w = width, height: h = height } = {}) {
    const { targetId } = await transport.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await transport.send('Target.attachToTarget', { targetId, flatten: true });
    const session = new CdpPageSession(transport, sessionId, targetId);
    await session.call('Page.enable');
    await session.call('Runtime.enable');
    await session.call('DOM.enable');
    await session.setViewport(w, h, 1);
    if (requestHandler) {
      await session.enableRequestRouter(requestHandler);
    }
    if (initScript) {
      await session.addInitScript(initScript);
    }
    if (url && url !== 'about:blank') {
      await session.navigate(url);
    }
    return session;
  }

  async function closePage(session) {
    if (!session) return;
    const targetId = session.targetId;
    session.dispose();
    if (targetId) {
      try {
        await transport.send('Target.closeTarget', { targetId });
      } catch {}
    }
  }

  async function close() {
    try {
      await transport.send('Browser.close', {}, undefined, 1500);
    } catch {}
    transport.close();
    for (const s of proc.stdio || []) {
      try {
        s?.destroy?.();
      } catch {}
    }
    try {
      proc.kill();
    } catch {}
    try {
      proc.unref();
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
  }

  return {
    exe,
    version,
    openPage,
    closePage,
    close,
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain && process.argv.includes('--smoke')) {
  const scratchBase = process.env.PRISM_CDP_SMOKE_DIR || path.join(os.tmpdir(), 'agy-wallpaper-prism-cdp-smoke');
  const browser = await launchHeadlessBrowser({ profileBaseDir: scratchBase });
  try {
    const page = await browser.openPage({
      url: 'http://127.0.0.1:49999/hub',
      requestHandler: async ({ url }) => {
        if (url.endsWith('/hub')) {
          return {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
            body: '<!doctype html><html><body class="dark" style="margin:0;background:#0e0e11;color:#f2f2f5"><h1>Prism CDP Pipe OK</h1><script>fetch("/api/ping").then(r=>r.json()).then(d=>{window.__ping=d.pong;})</script></body></html>',
          };
        }
        if (url.endsWith('/api/ping')) {
          return {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pong: 'crystal-clear' }),
          };
        }
        return { status: 404, body: 'not found' };
      },
    });
    await new Promise((r) => setTimeout(r, 150));
    const check = await page.evaluate('({ h1: document.querySelector("h1").textContent, pong: window.__ping, errs: 0 })');
    const shotPath = path.join(scratchBase, 'smoke.png');
    const shot = await page.capturePng(shotPath);
    console.log(JSON.stringify({ ok: true, product: browser.version.product, check, shot, consoleErrors: page.consoleErrors }));
    await browser.closePage(page);
  } finally {
    await browser.close();
    fs.rmSync(scratchBase, { recursive: true, force: true });
  }
}
