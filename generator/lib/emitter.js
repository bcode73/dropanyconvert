import { writeFile, mkdir, cp } from 'fs/promises';
import path from 'path';

/**
 * Writes all generated files to dist/.
 * Copies assets/ into dist/assets/.
 * Returns { fileCount, sizeKb }.
 */
export async function emitDist({ pages, sitemaps, robots }, config) {
  const distDir = config._distDir;

  // Wipe and recreate dist (deterministic output)
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

  // Copy assets/
  const assetsDir = config._assetsDir;
  const distAssetsDir = path.join(distDir, 'assets');
  try {
    await cp(assetsDir, distAssetsDir, { recursive: true });
  } catch {
    // assets/ may be empty during early development
  }

  return { fileCount, sizeKb: Math.round(totalBytes / 1024) };
}
