#!/usr/bin/env node
// Offline-capable bundler for agy-wallpaper-prism: compiles src/studio-ui/{template.html,styles.css,app.mjs}
// (+ imported src/shared/*.mjs modules) into a single self-contained sidecars/prism_studio/index.html.
//
// Strategy:
//   1. Default to the deterministic pure-Node zero-dependency ESM-to-IIFE bundler + vm.Script syntax check
//      so local Windows dev machines and Ubuntu CI emit 100% byte-identical pure-LF `index.html`.
//   2. Only probe local `esbuild` when explicitly opted in via `PRISM_USE_ESBUILD=1` (never probes sibling repos).

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
  if (process.env.PRISM_USE_ESBUILD !== '1') {
    return null;
  }
  const localCandidate = join(repoRoot, 'node_modules', 'esbuild', 'lib', 'main.js');
  if (existsSync(localCandidate)) {
    try {
      return await import(pathToFileURL(localCandidate).href);
    } catch {
      /* fall through to package resolution */
    }
  }
  try {
    return await import('esbuild');
  } catch {
    return null;
  }
}

function stripInlineJsComments(specList) {
  return specList.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

/**
 * Pure-Node zero-dependency ESM topological bundler for relative local `.mjs`/`.js` graphs.
 * Handles named/namespace/default/mixed imports, side-effect imports, re-exports
 * (`export { ... } from`, `export * from`, `export * as ns from`), and
 * `export const / let / var / function / async function / class / default / { ... }`.
 */
export function bundleZeroDepEsm(entryFile) {
  const visited = new Set();
  const ordered = [];
  let modSeq = 0;
  const nsMap = new Map(); // absPath -> { nsVar, exports: Set<string> }

  function resolveImport(fromFile, spec) {
    if (!spec.startsWith('.')) {
      throw new Error(`External non-relative import "${spec}" not allowed in browser Studio bundle`);
    }
    const base = resolve(dirname(fromFile), spec);
    for (const candidate of [base, `${base}.mjs`, `${base}.js`]) {
      if (existsSync(candidate)) return candidate;
    }
    throw new Error(`Cannot resolve import "${spec}" from ${fromFile}`);
  }

  function pushNamedBindings(namedClause, depNsVar, targetList) {
    const inner = stripInlineJsComments(namedClause.slice(1, namedClause.lastIndexOf('}'))).trim();
    for (const part of inner.split(',')) {
      const p = part.trim();
      if (!p) continue;
      const asMatch = /^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/.exec(p);
      if (asMatch) {
        targetList.push(`const ${asMatch[2]} = ${depNsVar}.${asMatch[1]};`);
      } else {
        targetList.push(`const ${p} = ${depNsVar}.${p};`);
      }
    }
  }

  function visit(filePath) {
    const abs = resolve(filePath);
    if (visited.has(abs)) return nsMap.get(abs);
    visited.add(abs);

    let code = readFileSync(abs, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    const nsVar = `__prism_mod_${++modSeq}`;
    const exportedNames = new Set();
    const info = { nsVar, exports: exportedNames };
    nsMap.set(abs, info);

    const importBindings = [];
    const reExportProps = [];
    const starReExportVars = [];

    // 1. Strip side-effect-only relative imports FIRST (`import './foo.mjs';`) so they can never be spanned by `importRe`
    code = code.replace(/^[ \t]*import[ \t]+['"]([^'"]+)['"][ \t]*;?/gm, (_full, spec) => {
      const depAbs = resolveImport(abs, spec);
      visit(depAbs);
      return '';
    });

    // 2. Strip static imports (named, namespace, default, and default + named/namespace; grammar-bounded, never spans across `;` or `}`)
    const importRe =
      /^[ \t]*import\s+(\*\s+as\s+[A-Za-z_$][\w$]*|\{[^}]*\}|[A-Za-z_$][\w$]*(?:\s*,\s*(?:\*\s+as\s+[A-Za-z_$][\w$]*|\{[^}]*\}))?)\s+from\s+['"]([^'"]+)['"][ \t]*;?/gm;
    code = code.replace(importRe, (_full, clause, spec) => {
      const depAbs = resolveImport(abs, spec);
      const depInfo = visit(depAbs);
      const trimmed = clause.trim();
      if (trimmed.startsWith('*')) {
        const m = /\*\s+as\s+([A-Za-z_$][\w$]*)/.exec(trimmed);
        if (m) importBindings.push(`const ${m[1]} = ${depInfo.nsVar};`);
      } else if (trimmed.startsWith('{')) {
        pushNamedBindings(trimmed, depInfo.nsVar, importBindings);
      } else {
        const commaIdx = trimmed.indexOf(',');
        if (commaIdx !== -1) {
          const defIdent = trimmed.slice(0, commaIdx).trim();
          const rest = trimmed.slice(commaIdx + 1).trim();
          if (defIdent) importBindings.push(`const ${defIdent} = ${depInfo.nsVar}.default;`);
          if (rest.startsWith('*')) {
            const m = /\*\s+as\s+([A-Za-z_$][\w$]*)/.exec(rest);
            if (m) importBindings.push(`const ${m[1]} = ${depInfo.nsVar};`);
          } else if (rest.startsWith('{')) {
            pushNamedBindings(rest, depInfo.nsVar, importBindings);
          }
        } else {
          importBindings.push(`const ${trimmed} = ${depInfo.nsVar}.default;`);
        }
      }
      return '';
    });

    // Namespace re-exports: `export * as ns from './foo.mjs';`
    code = code.replace(
      /^[ \t]*export\s+\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\s+['"]([^'"]+)['"][ \t]*;?/gm,
      (_full, alias, spec) => {
        const depAbs = resolveImport(abs, spec);
        const depInfo = visit(depAbs);
        reExportProps.push(`${alias}: ${depInfo.nsVar}`);
        return '';
      },
    );

    // Wildcard re-exports: `export * from './foo.mjs';`
    code = code.replace(/^[ \t]*export\s+\*\s+from\s+['"]([^'"]+)['"][ \t]*;?/gm, (_full, spec) => {
      const depAbs = resolveImport(abs, spec);
      const depInfo = visit(depAbs);
      starReExportVars.push(depInfo.nsVar);
      return '';
    });

    // Named re-exports: `export { a, b as c } from './foo.mjs';` (`[^}]*` prevents spanning across preceding local `export { ... };`)
    code = code.replace(/^[ \t]*export\s*\{([^}]*)\}\s*from\s+['"]([^'"]+)['"][ \t]*;?/gm, (_full, inner, spec) => {
      const depAbs = resolveImport(abs, spec);
      const depInfo = visit(depAbs);
      const cleaned = stripInlineJsComments(inner).trim();
      for (const part of cleaned.split(',')) {
        const p = part.trim();
        if (!p) continue;
        const asMatch = /^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/.exec(p);
        if (asMatch) reExportProps.push(`${asMatch[2]}: ${depInfo.nsVar}.${asMatch[1]}`);
        else reExportProps.push(`${p}: ${depInfo.nsVar}.${p}`);
      }
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

    // Transform local `export { a, b as c };`
    const aliasPairs = [];
    code = code.replace(/^\s*export\s*\{([^}]*)\}\s*;?/gm, (_m, inner) => {
      for (const part of stripInlineJsComments(inner).split(',')) {
        const p = part.trim();
        if (!p) continue;
        const asMatch = /^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/.exec(p);
        if (asMatch) aliasPairs.push(`${asMatch[2]}: ${asMatch[1]}`);
        else exportedNames.add(p);
      }
      return '';
    });

    const props = [
      ...starReExportVars.map((v) => `...${v}`),
      ...reExportProps,
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

  const rawCss = existsSync(cssEntry) ? readFileSync(cssEntry, 'utf8').replace(/\r\n?/g, '\n') : '';
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

  html = html.replace(/\r\n?/g, '\n');

  mkdirSync(dirname(outHtmlPath), { recursive: true });
  writeFileSync(outHtmlPath, html, 'utf8');
  return { outHtmlPath, bytes: Buffer.byteLength(html, 'utf8'), bundlerUsed };
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] || '')).href) {
  const res = await buildStudioBundle();
  console.log(`[build] Built ${res.outHtmlPath} (${res.bytes} bytes, bundler=${res.bundlerUsed})`);
}
