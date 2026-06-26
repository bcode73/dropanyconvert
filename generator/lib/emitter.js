import { writeFile, mkdir, cp, readdir, copyFile, rm } from 'fs/promises';
import path from 'path';

/**
 * Clears dist/ then writes all generated files.
 * Copies assets/ into dist/assets/.
 * Copies each engines/{name}/index.js to dist/assets/js/engines/{name}.js
 * so the browser runtime can dynamically import them.
 */
export async function emitDist({ pages, sitemaps, robots }, config) {
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

  return { fileCount, sizeKb: Math.round(totalBytes / 1024) };
}
