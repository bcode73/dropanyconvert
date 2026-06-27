/**
 * PDF Engine — Browser implementation.
 *
 * This file is copied to dist/assets/js/engines/pdf_engine.js at build time
 * and runs entirely in the browser. No server uploads. No Node.js APIs.
 *
 * Libraries (loaded lazily from /assets/js/vendor/, copied there at build time):
 *   pdf-lib  1.x (MIT)       — create/merge/split/rotate/protect/metadata
 *   pdfjs-dist 6.x (Apache)  — render pages to canvas (thumbnails, PDF→images)
 *
 * Contract: every exported function receives (File[], ToolContext) and returns
 *   Promise<{ outputs: ConvertedFile[], errors: string[] }>
 *
 * ConvertedFile: { name: string, blob: Blob, mime: string, sizeBytes: number }
 */

// ── Engine meta ───────────────────────────────────────────────────────────────

export const engineMeta = {
  id: 'pdf_engine',
  version: '1.0.0',
  runtime: 'browser',
  workerReady: false,
  supportedMimes: ['application/pdf'],
};

// ── Library loaders (lazy, cached per page load) ──────────────────────────────

let _pdfLib = null;
let _pdfjs  = null;

async function loadPdfLib() {
  if (!_pdfLib) {
    _pdfLib = await import('/assets/js/vendor/pdf-lib.esm.js');
  }
  return _pdfLib;
}

async function loadPdfJs() {
  if (!_pdfjs) {
    _pdfjs = await import('/assets/js/vendor/pdfjs.mjs');
    _pdfjs.GlobalWorkerOptions.workerSrc = '/assets/js/vendor/pdfjs.worker.mjs';
  }
  return _pdfjs;
}

// ── Shared helpers ────────────────────────────────────────────────────────────

async function fileToArrayBuffer(file) {
  return file.arrayBuffer();
}

function swapExt(name, newExt) {
  return name.replace(/\.[^.]+$/, '') + '.' + newExt;
}

function bytesToBlob(bytes, mime) {
  return new Blob([bytes], { type: mime });
}

/**
 * Parse a page-range string ("1, 3-5, 7") into 0-based sorted indices.
 * Clamps to valid page indices. Returns all pages if input is blank.
 */
function parsePageRange(str, total) {
  if (!str || !str.trim()) return Array.from({ length: total }, (_, i) => i);
  const indices = new Set();
  for (const part of str.split(',')) {
    const p = part.trim();
    if (!p) continue;
    const m = p.match(/^(\d+)(?:\s*[-–]\s*(\d+))?$/);
    if (!m) continue;
    const from = parseInt(m[1], 10) - 1;
    const to   = m[2] ? parseInt(m[2], 10) - 1 : from;
    for (let i = Math.max(0, from); i <= Math.min(total - 1, to); i++) {
      indices.add(i);
      if (indices.size > 1000) throw new Error('Page range too large. Maximum 1000 pages per operation.');
    }
  }
  return [...indices].sort((a, b) => a - b);
}

/**
 * Parse a page-order string ("3, 1, 2") into a 0-based array.
 */
function parsePageOrder(str, total) {
  if (!str || !str.trim()) return Array.from({ length: total }, (_, i) => i);
  const order = [];
  for (const part of str.split(',')) {
    const n = parseInt(part.trim(), 10);
    if (!isNaN(n) && n >= 1 && n <= total) order.push(n - 1);
  }
  // If the order is incomplete or invalid, fall back to natural order
  if (order.length !== total) return Array.from({ length: total }, (_, i) => i);
  return order;
}

/**
 * Load a PDF document via pdf-lib with graceful encrypted-PDF handling.
 */
async function loadDoc(bytes, password, PDFDocument) {
  const opts = { ignoreEncryption: !password };
  if (password) opts.password = password;
  try {
    return await PDFDocument.load(bytes, opts);
  } catch (err) {
    if (err.message?.includes('encrypted') || err.message?.includes('password')) {
      throw new Error('This PDF is password-protected. Use the "Unlock PDF" tool first, or enter the password in the options.');
    }
    throw err;
  }
}

/** Produce a canvas for rendering (OffscreenCanvas where available, else DOM canvas). */
function makeCanvas(width, height) {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }
  const c = document.createElement('canvas');
  c.width  = width;
  c.height = height;
  return c;
}

/** Convert canvas to blob (PNG, JPEG or WebP). */
async function canvasToBlob(canvas, mime, quality = 0.90) {
  if (canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({ type: mime, quality });
  }
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Canvas rendering timed out. Try reducing DPI or file size.')), 30000);
    canvas.toBlob(blob => { clearTimeout(t); resolve(blob); }, mime, quality);
  });
}

// ── 1. Merge PDFs ─────────────────────────────────────────────────────────────

export async function mergePdfs(files, context) {
  if (!files.length) return { outputs: [], errors: ['No files provided.'] };
  const { PDFDocument } = await loadPdfLib();
  const errors = [];
  const merged = await PDFDocument.create();
  let merged_count = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    context.onProgress?.(Math.round((i / files.length) * 80));
    try {
      const bytes = await fileToArrayBuffer(file);
      const doc   = await loadDoc(bytes, context.password, PDFDocument);
      const indices = doc.getPageIndices();
      const pages = await merged.copyPages(doc, indices);
      pages.forEach(p => merged.addPage(p));
      merged_count += indices.length;
    } catch (err) {
      errors.push(`${file.name}: ${err.message}`);
    }
  }

  if (merged_count === 0) return { outputs: [], errors: errors.length ? errors : ['No pages were merged.'] };

  context.onProgress?.(95);
  merged.setProducer('DropAnyConvert');
  const bytes = await merged.save();
  const blob  = bytesToBlob(bytes, 'application/pdf');
  context.onProgress?.(100);

  const baseName = files.length === 1 ? swapExt(files[0].name, 'pdf') : 'merged.pdf';
  return {
    outputs: [{ name: baseName, blob, mime: 'application/pdf', sizeBytes: blob.size }],
    errors,
  };
}

// ── 2. Split PDF ──────────────────────────────────────────────────────────────

export async function splitPdf(files, context) {
  const { PDFDocument } = await loadPdfLib();
  const outputs = [];
  const errors  = [];

  for (const file of files) {
    try {
      const bytes = await fileToArrayBuffer(file);
      const doc   = await loadDoc(bytes, context.password, PDFDocument);
      const total = doc.getPageCount();
      const base  = file.name.replace(/\.[^.]+$/, '');

      for (let i = 0; i < total; i++) {
        context.onProgress?.(Math.round((i / total) * 90));
        const single = await PDFDocument.create();
        const [page] = await single.copyPages(doc, [i]);
        single.addPage(page);
        single.setProducer('DropAnyConvert');
        const pageBytes = await single.save();
        const blob = bytesToBlob(pageBytes, 'application/pdf');
        const pad = String(i + 1).padStart(String(total).length, '0');
        outputs.push({
          name: `${base}_page${pad}.pdf`,
          blob,
          mime: 'application/pdf',
          sizeBytes: blob.size,
        });
      }
    } catch (err) {
      errors.push(`${file.name}: ${err.message}`);
    }
  }

  context.onProgress?.(100);
  return { outputs, errors };
}

// ── 3. Compress PDF ───────────────────────────────────────────────────────────
// Note: pdf-lib's save() with useObjectStreams removes redundant objects and
// reserialises cross-reference tables. True image recompression requires
// server-side tools (Ghostscript). Results vary; heavily-scanned PDFs see
// little benefit.

export async function compressPdf(files, context) {
  const { PDFDocument } = await loadPdfLib();
  const outputs = [];
  const errors  = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    context.onProgress?.(Math.round((i / files.length) * 85));
    try {
      const bytes = await fileToArrayBuffer(file);
      const doc   = await loadDoc(bytes, context.password, PDFDocument);
      doc.setProducer('DropAnyConvert');
      const compressed = await doc.save({ useObjectStreams: true });
      const blob = bytesToBlob(compressed, 'application/pdf');
      outputs.push({
        name: swapExt(file.name, 'pdf').replace(/\.pdf$/, '_compressed.pdf'),
        blob,
        mime: 'application/pdf',
        sizeBytes: blob.size,
      });
    } catch (err) {
      errors.push(`${file.name}: ${err.message}`);
    }
  }

  context.onProgress?.(100);
  return { outputs, errors };
}

// ── 4. Rotate PDF Pages ───────────────────────────────────────────────────────

export async function rotatePdf(files, context) {
  const { PDFDocument, degrees } = await loadPdfLib();
  const outputs = [];
  const errors  = [];
  const angleDelta = parseInt(context.angle ?? '90', 10);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    context.onProgress?.(Math.round((i / files.length) * 85));
    try {
      const bytes   = await fileToArrayBuffer(file);
      const doc     = await loadDoc(bytes, context.password, PDFDocument);
      const total   = doc.getPageCount();
      const targets = parsePageRange(context.pages, total);

      for (const idx of targets) {
        const page    = doc.getPage(idx);
        const current = page.getRotation().angle;
        page.setRotation(degrees((current + angleDelta + 360) % 360));
      }

      doc.setProducer('DropAnyConvert');
      const outBytes = await doc.save();
      const blob = bytesToBlob(outBytes, 'application/pdf');
      outputs.push({
        name: swapExt(file.name, 'pdf').replace(/\.pdf$/, '_rotated.pdf'),
        blob,
        mime: 'application/pdf',
        sizeBytes: blob.size,
      });
    } catch (err) {
      errors.push(`${file.name}: ${err.message}`);
    }
  }

  context.onProgress?.(100);
  return { outputs, errors };
}

// ── 5. Unlock PDF ─────────────────────────────────────────────────────────────

export async function unlockPdf(files, context) {
  const { PDFDocument } = await loadPdfLib();
  const outputs = [];
  const errors  = [];
  const password = String(context.password || '').slice(0, 256);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    context.onProgress?.(Math.round((i / files.length) * 85));
    try {
      const bytes = await fileToArrayBuffer(file);
      let doc;
      try {
        doc = await PDFDocument.load(bytes, { password });
      } catch {
        throw new Error('Incorrect password or this PDF cannot be unlocked in the browser.');
      }
      doc.setProducer('DropAnyConvert');
      const unlocked = await doc.save();
      const blob = bytesToBlob(unlocked, 'application/pdf');
      outputs.push({
        name: swapExt(file.name, 'pdf').replace(/\.pdf$/, '_unlocked.pdf'),
        blob,
        mime: 'application/pdf',
        sizeBytes: blob.size,
      });
    } catch (err) {
      errors.push(`${file.name}: ${err.message}`);
    }
  }

  context.onProgress?.(100);
  return { outputs, errors };
}

// ── 6. Protect PDF ────────────────────────────────────────────────────────────

export async function protectPdf(files, context) {
  const { PDFDocument } = await loadPdfLib();
  const outputs = [];
  const errors  = [];
  const userPw  = String(context.userPassword  || '').slice(0, 256);
  const ownerPw = String(context.ownerPassword || userPw + '_owner').slice(0, 256);

  if (!userPw) {
    return { outputs: [], errors: ['Please enter an open password before protecting.'] };
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    context.onProgress?.(Math.round((i / files.length) * 85));
    try {
      const bytes = await fileToArrayBuffer(file);
      const doc   = await loadDoc(bytes, undefined, PDFDocument);

      await doc.encrypt({
        userPassword:  userPw,
        ownerPassword: ownerPw,
        permissions: {
          printing:             'highResolution',
          modifying:            false,
          copying:              false,
          annotating:           false,
          fillingForms:         false,
          contentAccessibility: true,
          documentAssembly:     false,
        },
      });

      doc.setProducer('DropAnyConvert');
      const outBytes = await doc.save();
      const blob = bytesToBlob(outBytes, 'application/pdf');
      outputs.push({
        name: swapExt(file.name, 'pdf').replace(/\.pdf$/, '_protected.pdf'),
        blob,
        mime: 'application/pdf',
        sizeBytes: blob.size,
      });
    } catch (err) {
      errors.push(`${file.name}: ${err.message}`);
    }
  }

  context.onProgress?.(100);
  return { outputs, errors };
}

// ── 7. PDF to Images ──────────────────────────────────────────────────────────

export async function pdfToImages(files, context) {
  const pdfjsLib = await loadPdfJs();
  const outputs  = [];
  const errors   = [];
  const dpi      = Math.min(Math.max(parseFloat(context.dpi ?? '150') || 150, 72), 600);
  const scale    = dpi / 72;  // pdfjs default viewport is at 72 DPI

  const fmtMap = {
    png:  'image/png',
    jpg:  'image/jpeg',
    webp: 'image/webp',
  };
  const mime = fmtMap[context.outputFormat] ?? 'image/png';
  const ext  = context.outputFormat === 'jpg' ? 'jpg' : (context.outputFormat ?? 'png');

  for (const file of files) {
    try {
      const bytes = await fileToArrayBuffer(file);
      const pdf   = await pdfjsLib.getDocument({ data: bytes }).promise;
      const total = pdf.numPages;
      const targets = parsePageRange(context.pages, total).map(i => i + 1); // pdfjs is 1-indexed
      const base = file.name.replace(/\.[^.]+$/, '');

      for (let t = 0; t < targets.length; t++) {
        const pageNum = targets[t];
        context.onProgress?.(Math.round((t / targets.length) * 90));
        const page     = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const canvas   = makeCanvas(Math.round(viewport.width), Math.round(viewport.height));
        const ctx      = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;
        const blob = await canvasToBlob(canvas, mime, 0.92);
        const pad  = String(pageNum).padStart(String(total).length, '0');
        outputs.push({
          name: `${base}_page${pad}.${ext}`,
          blob,
          mime,
          sizeBytes: blob.size,
        });
      }
    } catch (err) {
      errors.push(`${file.name}: ${err.message}`);
    }
  }

  context.onProgress?.(100);
  return { outputs, errors };
}

// ── 8. Images to PDF ─────────────────────────────────────────────────────────

export async function imagesToPdf(files, context) {
  if (!files.length) return { outputs: [], errors: ['No images provided.'] };
  const { PDFDocument } = await loadPdfLib();
  const errors = [];
  const doc    = await PDFDocument.create();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    context.onProgress?.(Math.round((i / files.length) * 85));
    try {
      const bytes = await fileToArrayBuffer(file);
      const mime  = file.type || 'image/jpeg';
      let embedded;

      if (mime === 'image/png') {
        embedded = await doc.embedPng(bytes);
      } else if (mime === 'image/jpeg' || mime === 'image/jpg') {
        embedded = await doc.embedJpg(bytes);
      } else {
        // For webp/bmp etc., draw on canvas and get PNG
        const blob    = await convertImageToPng(file);
        const pngBytes = await blob.arrayBuffer();
        embedded = await doc.embedPng(pngBytes);
      }

      const page = doc.addPage([embedded.width, embedded.height]);
      page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
    } catch (err) {
      errors.push(`${file.name}: ${err.message}`);
    }
  }

  if (doc.getPageCount() === 0) {
    return { outputs: [], errors: errors.length ? errors : ['No images could be embedded.'] };
  }

  context.onProgress?.(95);
  doc.setProducer('DropAnyConvert');
  const pdfBytes = await doc.save();
  const blob = bytesToBlob(pdfBytes, 'application/pdf');
  context.onProgress?.(100);

  const baseName = files.length === 1 ? swapExt(files[0].name, 'pdf') : 'images.pdf';
  return {
    outputs: [{ name: baseName, blob, mime: 'application/pdf', sizeBytes: blob.size }],
    errors,
  };
}

/** Convert any image file to PNG via Canvas for embedding in PDF. */
async function convertImageToPng(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(resolve, 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not load image.')); };
    img.src = url;
  });
}

// ── 9. Extract PDF Pages ──────────────────────────────────────────────────────

export async function extractPdfPages(files, context) {
  const { PDFDocument } = await loadPdfLib();
  const outputs = [];
  const errors  = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    context.onProgress?.(Math.round((i / files.length) * 85));
    try {
      const bytes   = await fileToArrayBuffer(file);
      const doc     = await loadDoc(bytes, context.password, PDFDocument);
      const total   = doc.getPageCount();
      const targets = parsePageRange(context.pages, total);

      if (!targets.length) throw new Error('No valid pages specified.');

      const extracted = await PDFDocument.create();
      const pages     = await extracted.copyPages(doc, targets);
      pages.forEach(p => extracted.addPage(p));
      extracted.setProducer('DropAnyConvert');

      const outBytes = await extracted.save();
      const blob = bytesToBlob(outBytes, 'application/pdf');
      outputs.push({
        name: swapExt(file.name, 'pdf').replace(/\.pdf$/, '_extracted.pdf'),
        blob,
        mime: 'application/pdf',
        sizeBytes: blob.size,
      });
    } catch (err) {
      errors.push(`${file.name}: ${err.message}`);
    }
  }

  context.onProgress?.(100);
  return { outputs, errors };
}

// ── 10. Delete PDF Pages ──────────────────────────────────────────────────────

export async function deletePdfPages(files, context) {
  const { PDFDocument } = await loadPdfLib();
  const outputs = [];
  const errors  = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    context.onProgress?.(Math.round((i / files.length) * 85));
    try {
      const bytes    = await fileToArrayBuffer(file);
      const doc      = await loadDoc(bytes, context.password, PDFDocument);
      const total    = doc.getPageCount();
      const toDelete = new Set(parsePageRange(context.pages, total));
      const toKeep   = Array.from({ length: total }, (_, i) => i).filter(i => !toDelete.has(i));

      if (!toKeep.length) throw new Error('Cannot delete all pages from the PDF.');

      const result = await PDFDocument.create();
      const pages  = await result.copyPages(doc, toKeep);
      pages.forEach(p => result.addPage(p));
      result.setProducer('DropAnyConvert');

      const outBytes = await result.save();
      const blob = bytesToBlob(outBytes, 'application/pdf');
      outputs.push({
        name: swapExt(file.name, 'pdf').replace(/\.pdf$/, '_edited.pdf'),
        blob,
        mime: 'application/pdf',
        sizeBytes: blob.size,
      });
    } catch (err) {
      errors.push(`${file.name}: ${err.message}`);
    }
  }

  context.onProgress?.(100);
  return { outputs, errors };
}

// ── 11. Reorder PDF Pages ─────────────────────────────────────────────────────

export async function reorderPdfPages(files, context) {
  const { PDFDocument } = await loadPdfLib();
  const outputs = [];
  const errors  = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    context.onProgress?.(Math.round((i / files.length) * 85));
    try {
      const bytes    = await fileToArrayBuffer(file);
      const doc      = await loadDoc(bytes, context.password, PDFDocument);
      const total    = doc.getPageCount();
      const newOrder = parsePageOrder(context.pageOrder, total);

      const result = await PDFDocument.create();
      const pages  = await result.copyPages(doc, newOrder);
      pages.forEach(p => result.addPage(p));
      result.setProducer('DropAnyConvert');

      const outBytes = await result.save();
      const blob = bytesToBlob(outBytes, 'application/pdf');
      outputs.push({
        name: swapExt(file.name, 'pdf').replace(/\.pdf$/, '_reordered.pdf'),
        blob,
        mime: 'application/pdf',
        sizeBytes: blob.size,
      });
    } catch (err) {
      errors.push(`${file.name}: ${err.message}`);
    }
  }

  context.onProgress?.(100);
  return { outputs, errors };
}

// ── 12. PDF Metadata Viewer ───────────────────────────────────────────────────

export async function viewPdfMetadata(files, context) {
  const { PDFDocument } = await loadPdfLib();
  const outputs = [];
  const errors  = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    context.onProgress?.(Math.round((i / files.length) * 85));
    try {
      const bytes = await fileToArrayBuffer(file);
      const doc   = await PDFDocument.load(bytes, { ignoreEncryption: true });

      const lines = [
        `File: ${file.name}`,
        `Size: ${formatBytes(file.size)}`,
        `Pages: ${doc.getPageCount()}`,
        '',
        `Title:    ${doc.getTitle()    ?? '(not set)'}`,
        `Author:   ${doc.getAuthor()   ?? '(not set)'}`,
        `Subject:  ${doc.getSubject()  ?? '(not set)'}`,
        `Keywords: ${doc.getKeywords() ?? '(not set)'}`,
        `Creator:  ${doc.getCreator()  ?? '(not set)'}`,
        `Producer: ${doc.getProducer() ?? '(not set)'}`,
        `Created:  ${doc.getCreationDate()?.toISOString() ?? '(not set)'}`,
        `Modified: ${doc.getModificationDate()?.toISOString() ?? '(not set)'}`,
      ];

      const text = lines.join('\n');
      const blob = new Blob([text], { type: 'text/plain' });
      outputs.push({
        name: swapExt(file.name, 'txt').replace(/\.txt$/, '_metadata.txt'),
        blob,
        mime: 'text/plain',
        sizeBytes: blob.size,
      });
    } catch (err) {
      errors.push(`${file.name}: ${err.message}`);
    }
  }

  context.onProgress?.(100);
  return { outputs, errors };
}

// ── 13. PDF Metadata Editor ───────────────────────────────────────────────────

export async function editPdfMetadata(files, context) {
  const { PDFDocument } = await loadPdfLib();
  const outputs = [];
  const errors  = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    context.onProgress?.(Math.round((i / files.length) * 85));
    try {
      const bytes = await fileToArrayBuffer(file);
      const doc   = await loadDoc(bytes, context.password, PDFDocument);

      if (context.pdfTitle    !== undefined) doc.setTitle(context.pdfTitle    || '');
      if (context.pdfAuthor   !== undefined) doc.setAuthor(context.pdfAuthor  || '');
      if (context.pdfSubject  !== undefined) doc.setSubject(context.pdfSubject || '');
      if (context.pdfKeywords !== undefined) {
        const kws = (context.pdfKeywords || '').split(',').map(k => k.trim()).filter(Boolean);
        doc.setKeywords(kws);
      }
      doc.setModificationDate(new Date());
      doc.setProducer('DropAnyConvert');

      const outBytes = await doc.save();
      const blob = bytesToBlob(outBytes, 'application/pdf');
      outputs.push({
        name: swapExt(file.name, 'pdf').replace(/\.pdf$/, '_metadata.pdf'),
        blob,
        mime: 'application/pdf',
        sizeBytes: blob.size,
      });
    } catch (err) {
      errors.push(`${file.name}: ${err.message}`);
    }
  }

  context.onProgress?.(100);
  return { outputs, errors };
}

// ── 14. PDF Page Counter ──────────────────────────────────────────────────────

export async function countPdfPages(files, context) {
  const { PDFDocument } = await loadPdfLib();
  const outputs = [];
  const errors  = [];

  const lines = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    context.onProgress?.(Math.round((i / files.length) * 85));
    try {
      const bytes = await fileToArrayBuffer(file);
      const doc   = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const count = doc.getPageCount();
      lines.push(`${file.name}: ${count} page${count === 1 ? '' : 's'}`);
    } catch (err) {
      errors.push(`${file.name}: ${err.message}`);
    }
  }

  context.onProgress?.(100);

  if (!lines.length) return { outputs: [], errors };

  const text = lines.join('\n');
  const blob = new Blob([text], { type: 'text/plain' });
  return {
    outputs: [{ name: 'page-counts.txt', blob, mime: 'text/plain', sizeBytes: blob.size }],
    errors,
  };
}

// ── 15. PDF Thumbnail Generator ───────────────────────────────────────────────

export async function generatePdfThumbnails(files, context) {
  const pdfjsLib = await loadPdfJs();
  const outputs  = [];
  const errors   = [];
  const dpi      = Math.min(Math.max(parseFloat(context.dpi ?? '96') || 96, 72), 600);
  const scale    = dpi / 72;
  const mime     = context.outputFormat === 'jpg' ? 'image/jpeg' : 'image/png';
  const ext      = context.outputFormat === 'jpg' ? 'jpg' : 'png';

  for (const file of files) {
    try {
      const bytes   = await fileToArrayBuffer(file);
      const pdf     = await pdfjsLib.getDocument({ data: bytes }).promise;
      const total   = pdf.numPages;
      const targets = parsePageRange(context.pages, total).map(i => i + 1);
      const base    = file.name.replace(/\.[^.]+$/, '');

      for (let t = 0; t < targets.length; t++) {
        const pageNum  = targets[t];
        context.onProgress?.(Math.round((t / targets.length) * 90));
        const page     = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const canvas   = makeCanvas(Math.round(viewport.width), Math.round(viewport.height));
        const ctx      = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;
        const blob = await canvasToBlob(canvas, mime, 0.85);
        const pad  = String(pageNum).padStart(String(total).length, '0');
        outputs.push({
          name: `${base}_thumb${pad}.${ext}`,
          blob,
          mime,
          sizeBytes: blob.size,
        });
      }
    } catch (err) {
      errors.push(`${file.name}: ${err.message}`);
    }
  }

  context.onProgress?.(100);
  return { outputs, errors };
}

// ── Utility ───────────────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1048576)    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}
