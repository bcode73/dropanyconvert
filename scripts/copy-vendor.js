/**
 * Copies browser-side vendor library bundles from node_modules to assets/js/vendor/.
 * Runs automatically via the `prebuild` npm hook before every build.
 *
 * Libraries copied:
 *   pdf-lib  (MIT)          — PDF creation and manipulation
 *   pdfjs-dist (Apache 2.0) — PDF rendering (page to canvas)
 *
 * These bundles are self-contained (zero top-level imports) so they can be
 * served as plain static files and loaded via dynamic import() in the browser.
 */

import { copyFile, mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root      = path.join(__dirname, '..');
const vendor    = path.join(root, 'assets', 'js', 'vendor');
const nm        = path.join(root, 'node_modules');

await mkdir(vendor, { recursive: true });

const copies = [
  // pdf-lib ESM bundle (self-contained)
  [path.join(nm, 'pdf-lib', 'dist', 'pdf-lib.esm.js'),
   path.join(vendor, 'pdf-lib.esm.js')],

  // pdfjs-dist main module + worker (both self-contained)
  [path.join(nm, 'pdfjs-dist', 'build', 'pdf.mjs'),
   path.join(vendor, 'pdfjs.mjs')],

  [path.join(nm, 'pdfjs-dist', 'build', 'pdf.worker.mjs'),
   path.join(vendor, 'pdfjs.worker.mjs')],
];

for (const [src, dst] of copies) {
  await copyFile(src, dst);
}

console.log('  ✓ Vendor files copied to assets/js/vendor/');
