import { writeFile, readFile, mkdir, cp, readdir, copyFile, rm } from 'fs/promises';
import path from 'path';

// ── Minifiers ─────────────────────────────────────────────────────────────────

function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')     // remove comments
    .replace(/\s{2,}/g, ' ')              // collapse whitespace
    .replace(/\s*([{};:,>~+])\s*/g, '$1') // remove space around tokens
    .replace(/;}/g, '}')                  // remove last semicolon in block
    .replace(/\n/g, '')                   // remove newlines
    .trim();
}

function minifyJs(js) {
  return js
    .replace(/\/\*[\s\S]*?\*\//g, '')     // remove block comments
    .replace(/\/\/[^\n]*/g, '')           // remove line comments
    .replace(/\n\s*\n/g, '\n')            // collapse blank lines
    .replace(/[ \t]+/g, ' ')             // collapse horizontal whitespace
    .trim();
}

/**
 * Clears dist/ then writes all generated files.
 * Copies assets/ into dist/assets/.
 * Copies each engines/{name}/index.js to dist/assets/js/engines/{name}.js
 * so the browser runtime can dynamically import them.
 */
export async function emitDist({ pages, sitemaps, robots, staticFiles, aiFiles }, config) {
  const distDir = config._distDir;

  // Always start clean — prevents stale files from previous builds
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });

  let fileCount = 0;
  let totalBytes = 0;

  const allFiles = [
    ...pages,
    ...sitemaps,
    { path: robots.path, content: robots.content },
    ...(staticFiles || []),
    ...(aiFiles || []),
  ];

  for (const file of allFiles) {
    const fullPath = path.join(distDir, file.path);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, file.content, 'utf8');
    fileCount++;
    totalBytes += Buffer.byteLength(file.content, 'utf8');
  }

  // Copy assets/ → dist/assets/
  const assetsDir = config._assetsDir;
  const distAssetsDir = path.join(distDir, 'assets');
  try {
    await cp(assetsDir, distAssetsDir, { recursive: true });
  } catch {
    // assets/ may be empty during early development
  }

  // Copy each engines/{name}/index.js → dist/assets/js/engines/{name}.js
  // This makes them importable via /assets/js/engines/{name}.js in the browser.
  const enginesRoot = path.join(config._root, 'engines');
  const distEnginesDir = path.join(distDir, 'assets', 'js', 'engines');
  await mkdir(distEnginesDir, { recursive: true });

  try {
    const engineDirs = await readdir(enginesRoot, { withFileTypes: true });
    for (const entry of engineDirs) {
      if (!entry.isDirectory()) continue;
      const src = path.join(enginesRoot, entry.name, 'index.js');
      const dst = path.join(distEnginesDir, `${entry.name}.js`);
      try {
        await copyFile(src, dst);
        fileCount++;
      } catch {
        // Engine may not have an index.js yet (future engines)
      }
    }
  } catch {
    // engines/ directory may not exist
  }

  // Copy static/ → dist/ (deployment config, _headers, _redirects, ads.txt, etc.)
  const staticDir = path.join(config._root, 'static');
  try {
    await cp(staticDir, distDir, { recursive: true });
    // Verify root-critical files landed in dist
    const rootChecks = ['ads.txt', 'robots.txt'];
    const { access } = await import('fs/promises');
    const missing = [];
    for (const f of rootChecks) {
      try { await access(path.join(distDir, f)); } catch { missing.push(f); }
    }
    if (missing.length) {
      console.warn(`  ⚠ Root files missing from dist: ${missing.join(', ')}`);
    } else {
      console.log(`  ✓ Root static files copied (ads.txt, robots.txt)`);
    }
  } catch {
    // static/ is optional
  }

  // Minify CSS files in dist/assets/css/
  let cssBytes = 0;
  const distCssDir = path.join(distDir, 'assets', 'css');
  try {
    const cssFiles = await readdir(distCssDir);
    for (const f of cssFiles) {
      if (!f.endsWith('.css')) continue;
      const p = path.join(distCssDir, f);
      const src = await readFile(p, 'utf8');
      const minified = minifyCss(src);
      await writeFile(p, minified, 'utf8');
      cssBytes += Buffer.byteLength(minified, 'utf8');
    }
  } catch {}

  // Minify non-vendor JS files in dist/assets/js/ (not vendor/ subdirectory)
  let jsBytes = 0;
  const distJsDir = path.join(distDir, 'assets', 'js');
  try {
    const jsFiles = await readdir(distJsDir);
    for (const f of jsFiles) {
      if (!f.endsWith('.js')) continue;
      const p = path.join(distJsDir, f);
      const src = await readFile(p, 'utf8');
      const minified = minifyJs(src);
      await writeFile(p, minified, 'utf8');
      jsBytes += Buffer.byteLength(minified, 'utf8');
    }
  } catch {}

  const htmlBytes = totalBytes; // pages were already minified by page-generator
  return {
    fileCount,
    sizeKb: Math.round(totalBytes / 1024),
    assetSizes: {
      jsKb: Math.round(jsBytes / 1024),
      cssKb: Math.round(cssBytes / 1024),
      htmlKb: Math.round(htmlBytes / 1024),
    },
  };
}
