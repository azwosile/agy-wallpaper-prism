#!/usr/bin/env node
// Offline-capable bundler for agy-wallpaper-prism: compiles src/studio-ui/{template.html,styles.css,app.mjs}
// (+ imported src/shared/*.mjs modules) into a single self-contained sidecars/prism_studio/index.html.
//
// Strategy:
//   1. Prefer esbuild if available locally or in sibling workspace poc/route-b-poc/node_modules/esbuild.
//   2. Fall back automatically to a deterministic zero-dependency ESM-to-IIFE bundler + vm.Script syntax check
//      so `node scripts/build.mjs` succeeds 100% sandboxed offline without `npm install`.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const studioDir = join(repoRoot, 'src', 'studio-ui');
const appEntry = join(studioDir, 'app.mjs');
const cssEntry = join(studioDir, 'styles.css');
const templateEntry = join(studioDir, 'template.html');
const outHtmlPath = join(repoRoot, 'sidecars', 'prism_studio', 'index.html');

const DEFAULT_TEMPLATE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Wallpaper Prism</title>
  <script src="/preload.js"></script>
  <!-- PRISM_INLINE_STYLE -->
</head>
<body>
  <div id="app"></div>
  <!-- PRISM_INLINE_SCRIPT -->
</body>
</html>
`;

async function tryLoadEsbuild() {
  const candidates = [
    join(repoRoot, 'node_modules', 'esbuild', 'lib', 'main.js'),
    join(repoRoot, '..', 'agy-plugin-wallpaper-engine', 'node_modules', 'esbuild', 'lib', 'main.js'),
    join(repoRoot, '..', 'agy-plugin-wallpaper-engine', 'poc', 'route-b-poc', 'node_modules', 'esbuild', 'lib', 'main.js'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) {
      try {
        return await import(pathToFileURL(c).href);
      } catch {
        /* try next */
      }
    }
  }
  return null;
}

/**
 * Pure-Node zero-dependency ESM topological bundler for relative local `.mjs`/`.js` graphs.
 * Handles `import { a, b as c } from './x.mjs'`, `import * as ns from './x.mjs'`,
 * and `export const / let / var / function / async function / class / { ... }`.
 */
function bundleZeroDepEsm(entryFile) {
  const visited = new Set();
  const ordered = [];
  let modSeq = 0;
  const nsMap = new Map(); // absPath -> { nsVar, exports: Set<string> }

  function resolveImport(fromFile, spec) {
    const base = resolve(dirname(fromFile), spec);
    for (const candidate of [base, `${base}.mjs`, `${base}.js`]) {
      if (existsSync(candidate)) return candidate;
    }
    throw new Error(`Cannot resolve import "${spec}" from ${fromFile}`);
  }

  function visit(filePath) {
    const abs = resolve(filePath);
    if (visited.has(abs)) return nsMap.get(abs);
    visited.add(abs);

    let code = readFileSync(abs, 'utf8').replace(/^\uFEFF/, '');
    const nsVar = `__prism_mod_${++modSeq}`;
    const exportedNames = new Set();
    const importBindings = [];

    // Strip static imports (supports multi-line `import { ... } from '...'`)
    const importRe = /^\s*import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]\s*;?/gm;
    code = code.replace(importRe, (_full, clause, spec) => {
      if (!spec.startsWith('.')) {
        throw new Error(`External non-relative import "${spec}" not allowed in browser Studio bundle`);
      }
      const depAbs = resolveImport(abs, spec);
      const depInfo = visit(depAbs);
      const trimmed = clause.trim();
      if (trimmed.startsWith('*')) {
        const m = /\*\s+as\s+([A-Za-z_$][\w$]*)/.exec(trimmed);
        if (m) importBindings.push(`const ${m[1]} = ${depInfo.nsVar};`);
      } else if (trimmed.startsWith('{')) {
        const inner = trimmed.slice(1, trimmed.lastIndexOf('}')).trim();
        for (const part of inner.split(',')) {
          const p = part.trim();
          if (!p) continue;
          const asMatch = /^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/.exec(p);
          if (asMatch) {
            importBindings.push(`const ${asMatch[2]} = ${depInfo.nsVar}.${asMatch[1]};`);
          } else {
            importBindings.push(`const ${p} = ${depInfo.nsVar}.${p};`);
          }
        }
      } else {
        importBindings.push(`const ${trimmed} = ${depInfo.nsVar}.default;`);
      }
      return '';
    });

    // Side-effect-only relative imports: `import './foo.mjs';`
    code = code.replace(/^\s*import\s+['"]([^'"]+)['"]\s*;?/gm, (_full, spec) => {
      const depAbs = resolveImport(abs, spec);
      visit(depAbs);
      return '';
    });

    // Transform `export async function name` / `export function name` / `export class name`
    code = code.replace(/^\s*export\s+(async\s+function|function|class)\s+([A-Za-z_$][\w$]*)/gm, (_m, kw, id) => {
      exportedNames.add(id);
      return `${kw} ${id}`;
    });

    // Transform `export const|let|var name = ...`
    code = code.replace(/^\s*export\s+(const|let|var)\s+([A-Za-z_$][\w$]*)/gm, (_m, kw, id) => {
      exportedNames.add(id);
      return `${kw} ${id}`;
    });

    // Transform `export default ...`
    let hasDefault = false;
    code = code.replace(/^\s*export\s+default\s+/gm, () => {
      hasDefault = true;
      return 'const __prism_default__ = ';
    });

    // Transform `export { a, b as c };`
    const aliasPairs = [];
    code = code.replace(/^\s*export\s*\{([^}]*)\}\s*;?/gm, (_m, inner) => {
      for (const part of inner.split(',')) {
        const p = part.trim();
        if (!p) continue;
        const asMatch = /^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/.exec(p);
        if (asMatch) aliasPairs.push(`${asMatch[2]}: ${asMatch[1]}`);
        else exportedNames.add(p);
      }
      return '';
    });

    const props = [
      ...[...exportedNames].map((n) => `${n}: ${n}`),
      ...aliasPairs,
      ...(hasDefault ? ['default: __prism_default__'] : []),
    ];

    const wrappedModule = [
      `const ${nsVar} = (function() {`,
      ...importBindings,
      code,
      `return { ${props.join(', ')} };`,
      `})();`,
    ].join('\n');

    const info = { nsVar, exports: exportedNames };
    nsMap.set(abs, info);
    ordered.push(wrappedModule);
    return info;
  }

  visit(entryFile);
  return `(function(){\n'use strict';\n${ordered.join('\n\n')}\n})();`;
}

export async function buildStudioBundle() {
  if (!existsSync(appEntry)) {
    throw new Error(`Missing Studio UI entrypoint: ${appEntry}`);
  }

  const rawCss = existsSync(cssEntry) ? readFileSync(cssEntry, 'utf8') : '';
  const heightLockCss = /#app\b[\s\S]*?height\s*:\s*100%/i.test(rawCss)
    ? ''
    : '\nhtml, body, #app { width: 100%; height: 100%; margin: 0; overflow: hidden; }\n';
  const safeCss = (heightLockCss + rawCss).replace(/<\/style>/gi, '<\\/style>');

  let jsBundle = '';
  let bundlerUsed = 'zero-dep-inline';

  const esbuild = await tryLoadEsbuild();
  if (esbuild) {
    try {
      const res = await esbuild.build({
        entryPoints: [appEntry],
        bundle: true,
        format: 'iife',
        target: 'es2022',
        minify: false,
        write: false,
      });
      jsBundle = res.outputFiles[0].text;
      bundlerUsed = 'esbuild';
    } catch {
      jsBundle = bundleZeroDepEsm(appEntry);
      bundlerUsed = 'zero-dep-inline';
    }
  } else {
    jsBundle = bundleZeroDepEsm(appEntry);
  }

  // Validate compiled JS syntax before writing
  new vm.Script(jsBundle, { filename: 'prism-studio-bundle.js' });
  const safeJs = jsBundle.replace(/<\/script>/gi, '<\\/script>');

  let html = existsSync(templateEntry) ? readFileSync(templateEntry, 'utf8') : DEFAULT_TEMPLATE;
  if (!html.includes('/preload.js')) {
    html = html.replace('</head>', '  <script src="/preload.js"></script>\n</head>');
  }

  const styleBlock = `<style id="prism-studio-styles">\n${safeCss}\n</style>`;
  const scriptBlock = `<script id="prism-studio-bundle">\n${safeJs}\n</script>`;

  if (html.includes('<!-- PRISM_INLINE_STYLE -->')) {
    html = html.replace('<!-- PRISM_INLINE_STYLE -->', () => styleBlock);
  } else if (html.includes('</head>')) {
    html = html.replace('</head>', () => `${styleBlock}\n</head>`);
  } else {
    html = `${styleBlock}\n${html}`;
  }

  if (html.includes('<!-- PRISM_INLINE_SCRIPT -->')) {
    html = html.replace('<!-- PRISM_INLINE_SCRIPT -->', () => scriptBlock);
  } else if (html.includes('</body>')) {
    html = html.replace('</body>', () => `${scriptBlock}\n</body>`);
  } else {
    html = `${html}\n${scriptBlock}`;
  }

  mkdirSync(dirname(outHtmlPath), { recursive: true });
  writeFileSync(outHtmlPath, html, 'utf8');
  return { outHtmlPath, bytes: Buffer.byteLength(html, 'utf8'), bundlerUsed };
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] || '')).href) {
  const res = await buildStudioBundle();
  console.log(`[build] Built ${res.outHtmlPath} (${res.bytes} bytes, bundler=${res.bundlerUsed})`);
}
