#!/usr/bin/env node
// Local installer for agy-wallpaper-prism: copies real directories & files into
// ~/.gemini/config/plugins/agy-wallpaper-prism (NEVER uses NTFS junctions, which
// Antigravity's GetAllPlugins silently skips on Windows).

import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
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
  mkdirSync(dstDir, { recursive: true });

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

  // Trigger clean Sidecar hot-restart under `restart_policy: "always"` when installing into default host root
  if (!destRoot) {
    try {
      const serverInfoPath = join(homedir(), '.agy-wallpaper-prism', 'server_info.json');
      if (existsSync(serverInfoPath)) {
        const info = JSON.parse(readFileSync(serverInfoPath, 'utf8'));
        const pid = Number(info?.pid);
        if (info?.plugin === 'agy-wallpaper-prism' && Number.isInteger(pid) && pid > 0 && pid !== process.pid) {
          process.kill(pid, 'SIGTERM');
        }
      }
    } catch {
      /* best-effort hot reload; never fail installation */
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
