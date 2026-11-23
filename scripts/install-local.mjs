#!/usr/bin/env node
// Local installer for agy-wallpaper-prism: copies real directories & files into
// ~/.gemini/config/plugins/agy-wallpaper-prism (NEVER uses NTFS junctions, which
// Antigravity's GetAllPlugins silently skips on Windows).

import { randomUUID } from 'node:crypto';
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolveDefaultPrismDataDir } from '../src/engine/store.mjs';
import { buildStudioBundle } from './build.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

export async function installLocalPlugin({ destRoot = '' } = {}) {
  const indexHtml = join(repoRoot, 'sidecars', 'prism_studio', 'index.html');
  if (!existsSync(indexHtml)) {
    await buildStudioBundle();
  }

  const pluginsDir = destRoot
    ? resolve(destRoot)
    : join(
        process.env.ANTIGRAVITY_CONFIG_DIR ? resolve(process.env.ANTIGRAVITY_CONFIG_DIR) : join(homedir(), '.gemini', 'config'),
        'plugins',
      );
  const dstDir = join(pluginsDir, 'agy-wallpaper-prism');

  // If a symlink/junction ever existed at dstDir, replace it with a real directory
  if (existsSync(dstDir) && lstatSync(dstDir).isSymbolicLink()) {
    rmSync(dstDir, { recursive: true, force: true });
  }
  const stampPath = join(dstDir, '.prism-install-id');
  const existingStamp = existsSync(stampPath) ? readFileSync(stampPath, 'utf8').trim() : '';
  mkdirSync(dstDir, { recursive: true });
  if (!existingStamp) {
    writeFileSync(stampPath, `${randomUUID()}\n`, 'utf8');
  }

  const itemsToCopy = [
    'plugin.json',
    'package.json',
    'README.md',
    'assets',
    'skills',
    'sidecars',
    'src',
    'host',
    'docs',
  ];

  for (const rel of itemsToCopy) {
    const src = join(repoRoot, rel);
    if (!existsSync(src)) continue;
    cpSync(src, join(dstDir, rel), {
      recursive: true,
      force: true,
      dereference: true,
      filter: (p) => !p.includes('node_modules') && !p.endsWith('.tmp'),
    });
  }

  const required = [
    'plugin.json',
    join('assets', 'logo.svg'),
    join('skills', 'wallpaper-prism', 'SKILL.md'),
    join('sidecars', 'prism_studio', 'sidecar.json'),
    join('sidecars', 'prism_studio', 'main.mjs'),
    join('sidecars', 'prism_studio', 'cdp-bridge.mjs'),
    join('sidecars', 'prism_studio', 'index.html'),
    join('src', 'shared', 'schema.mjs'),
    join('src', 'engine', 'index.mjs'),
    join('src', 'host', 'index.mjs'),
    join('host', 'cli.mjs'),
  ];

  for (const rel of required) {
    if (!existsSync(join(dstDir, rel))) {
      throw new Error(`Installed plugin missing required file: ${rel}`);
    }
  }

  if (lstatSync(dstDir).isSymbolicLink()) {
    throw new Error('Destination directory must be a real directory, not a symlink/junction');
  }

  // Trigger clean in-process Sidecar host script reload (never SIGTERM under `restart_policy: "on-failure"`)
  if (!destRoot) {
    try {
      const serverInfoPath = join(resolveDefaultPrismDataDir(), 'server_info.json');
      if (existsSync(serverInfoPath)) {
        const info = JSON.parse(readFileSync(serverInfoPath, 'utf8'));
        const port = Number(info?.port);
        if (info?.plugin === 'agy-wallpaper-prism' && Number.isInteger(port) && port > 0) {
          const headers = { 'Content-Type': 'application/json' };
          if (info.token) headers['X-Sidecar-Token'] = info.token;
          await fetch(`http://127.0.0.1:${port}/api/host/reload`, {
            method: 'POST',
            headers,
            body: '{}',
            signal: AbortSignal.timeout(1500),
          }).catch(() => {});
        }
      }
    } catch {
      /* best-effort live reload; never fail installation */
    }
  }

  return { dstDir };
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] || '')).href) {
  const { dstDir } = await installLocalPlugin();
  console.log(`[install] Installed agy-wallpaper-prism -> ${dstDir}`);
  console.log(`  Studio Pill: [Wallpaper Prism](sidecar://agy-wallpaper-prism/prism_studio/)`);
  console.log(`  Manage UI:   [Wallpaper Prism](customization://agy-wallpaper-prism)`);
}
