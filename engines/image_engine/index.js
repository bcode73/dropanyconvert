/**
 * Image Engine — Browser-only Canvas API conversion.
 *
 * Contract:
 *   receive: File[], ToolContext { toolId, quality?, outputFormat?, onProgress?, ...extraOptions }
 *   return:  Promise<EngineResult>
 *
 * EngineResult:  { outputs: ConvertedFile[], errors: string[] }
 * ConvertedFile: { name: string, blob: Blob, mime: string, sizeBytes: number }
 *                OR for text output: { name, blob (text/plain), mime: 'text/plain', sizeBytes }
 *
 * Rules:
 *   - No DOM manipulation beyond canvas creation.
 *   - No routing, SEO, or UI ownership.
 *   - Release canvas memory after each file.
 *   - Call context.onProgress(0–100) to report batch progress.
 */

export const engineMeta = {
  id: 'image_engine',
  version: '2.0.0',
  runtime: 'browser',
  supportedMimes: [
    'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    'image/bmp', 'image/tiff', 'image/avif', 'image/svg+xml',
  ],
  capabilities: [
    'batch', 'quality-control', 'preview', 'resize', 'crop',
    'rotate', 'flip', 'watermark', 'text-input', 'text-output',
  ],
  dependencies: [],
  workerReady: false,
};

// Images larger than this can crash browser tabs — reject before Canvas allocation
const MAX_MEGAPIXELS = 30;
const MAX_PIXELS = MAX_MEGAPIXELS * 1_000_000;

// ── MIME → extension map ─────────────────────────────────────────────────────

const MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/bmp': 'bmp',
  'image/tiff': 'tif',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

// ── Public API — Format Conversions ─────────────────────────────────────────

export async function convertToJpg(files, context) {
  const quality = normalizeQuality(context.quality ?? 85) / 100;
  return processBatch(files, context, async (file) => {
    const blob = await canvasConvert(file, 'image/jpeg', quality, true);
    return { name: swapExt(file.name, 'jpg'), blob, mime: 'image/jpeg', sizeBytes: blob.size };
  });
}

export async function convertToWebP(files, context) {
  const quality = normalizeQuality(context.quality ?? 85) / 100;
  return processBatch(files, context, async (file) => {
    const blob = await canvasConvert(file, 'image/webp', quality, false);
    return { name: swapExt(file.name, 'webp'), blob, mime: 'image/webp', sizeBytes: blob.size };
  });
}

export async function convertToPng(files, context) {
  return processBatch(files, context, async (file) => {
    const blob = await canvasConvert(file, 'image/png', 1, false);
    return { name: swapExt(file.name, 'png'), blob, mime: 'image/png', sizeBytes: blob.size };
  });
}

export async function convertToAvif(files, context) {
  if (!checkFormatSupport('image/avif')) {
    throw new Error('AVIF encoding is not supported in this browser. Try Chrome 85+, Firefox 93+, or Safari 16+.');
  }
  const quality = normalizeQuality(context.quality ?? 80) / 100;
  return processBatch(files, context, async (file) => {
    const blob = await canvasConvert(file, 'image/avif', quality, false);
    return { name: swapExt(file.name, 'avif'), blob, mime: 'image/avif', sizeBytes: blob.size };
  });
}

export async function convertToBmp(files, context) {
  return processBatch(files, context, async (file) => {
    const blob = await canvasConvertRaw(file, writeBmp);
    return { name: swapExt(file.name, 'bmp'), blob, mime: 'image/bmp', sizeBytes: blob.size };
  });
}

export async function convertToTiff(files, context) {
  return processBatch(files, context, async (file) => {
    const blob = await canvasConvertRaw(file, writeTiff);
    return { name: swapExt(file.name, 'tif'), blob, mime: 'image/tiff', sizeBytes: blob.size };
  });
}

export async function svgToPng(files, context) {
  const width = parseInt(context.width, 10) || 0;
  const height = parseInt(context.height, 10) || 0;
  return processBatch(files, context, async (file) => {
    const blob = await svgToCanvas(file, width, height);
    return { name: swapExt(file.name, 'png'), blob, mime: 'image/png', sizeBytes: blob.size };
  });
}

export async function pngToSvg(files, context) {
  return processBatch(files, context, async (file) => {
    const blob = await rasterToEmbeddedSvg(file);
    return { name: swapExt(file.name, 'svg'), blob, mime: 'image/svg+xml', sizeBytes: blob.size };
  });
}

export async function gifToWebp(files, context) {
  const quality = normalizeQuality(context.quality ?? 85) / 100;
  return processBatch(files, context, async (file) => {
    const blob = await canvasConvert(file, 'image/webp', quality, false);
    return { name: swapExt(file.name, 'webp'), blob, mime: 'image/webp', sizeBytes: blob.size };
  });
}

export async function gifToPng(files, context) {
  return processBatch(files, context, async (file) => {
    const blob = await canvasConvert(file, 'image/png', 1, false);
    return { name: swapExt(file.name, 'png'), blob, mime: 'image/png', sizeBytes: blob.size };
  });
}

// ── Public API — Utilities ───────────────────────────────────────────────────

export async function compressImage(files, context) {
  const quality = normalizeQuality(context.quality ?? 75) / 100;
  return processBatch(files, context, async (file) => {
    const outMime = resolveOutputMime(context.outputFormat, file.type, 'image/jpeg');
    const fillW = outMime === 'image/jpeg';
    const blob = await canvasConvert(file, outMime, quality, fillW);
    const ext = MIME_TO_EXT[outMime] || 'jpg';
    return { name: swapExt(file.name, ext), blob, mime: outMime, sizeBytes: blob.size };
  });
}

export async function resizeImage(files, context) {
  const targetW = parseInt(context.width, 10) || 0;
  const targetH = parseInt(context.height, 10) || 0;
  const maintainAspect = context.maintainAspectRatio !== 'false' && context.maintainAspectRatio !== false;
  const quality = normalizeQuality(context.quality ?? 85) / 100;

  if (!targetW && !targetH) {
    throw new Error('Please specify at least one dimension (width or height).');
  }

  return processBatch(files, context, async (file) => {
    const outMime = resolveOutputMime(context.outputFormat, file.type, 'image/jpeg');
    const ext = MIME_TO_EXT[outMime] || 'jpg';
    const blob = await resizeCanvas(file, targetW, targetH, maintainAspect, outMime, quality);
    return { name: swapExt(file.name, ext), blob, mime: outMime, sizeBytes: blob.size };
  });
}

export async function cropImage(files, context) {
  const cropX = parseInt(context.cropX, 10) || 0;
  const cropY = parseInt(context.cropY, 10) || 0;
  const cropW = parseInt(context.cropW, 10) || 0;
  const cropH = parseInt(context.cropH, 10) || 0;
  const quality = normalizeQuality(context.quality ?? 85) / 100;

  return processBatch(files, context, async (file) => {
    const outMime = resolveOutputMime(context.outputFormat, file.type, 'image/jpeg');
    const ext = MIME_TO_EXT[outMime] || 'jpg';
    const blob = await cropCanvas(file, cropX, cropY, cropW, cropH, outMime, quality);
    return { name: swapExt(file.name, ext), blob, mime: outMime, sizeBytes: blob.size };
  });
}

export async function rotateImage(files, context) {
  const angle = parseInt(context.angle, 10) || 90;
  const quality = normalizeQuality(context.quality ?? 85) / 100;

  return processBatch(files, context, async (file) => {
    const outMime = resolveOutputMime(context.outputFormat, file.type, 'image/jpeg');
    const ext = MIME_TO_EXT[outMime] || 'jpg';
    const blob = await rotateCanvas(file, angle, outMime, quality);
    return { name: swapExt(file.name, ext), blob, mime: outMime, sizeBytes: blob.size };
  });
}

export async function flipImage(files, context) {
  const axis = context.flipAxis || 'horizontal';
  const quality = normalizeQuality(context.quality ?? 85) / 100;

  return processBatch(files, context, async (file) => {
    const outMime = resolveOutputMime(context.outputFormat, file.type, 'image/jpeg');
    const ext = MIME_TO_EXT[outMime] || 'jpg';
    const blob = await flipCanvas(file, axis, outMime, quality);
    return { name: swapExt(file.name, ext), blob, mime: outMime, sizeBytes: blob.size };
  });
}

export async function watermarkImage(files, context) {
  const text = context.watermarkText || '© Watermark';
  const position = context.watermarkPosition || 'bottom-right';
  const opacity = Math.max(0.1, Math.min(1, (parseInt(context.watermarkOpacity, 10) || 50) / 100));
  const quality = normalizeQuality(context.quality ?? 85) / 100;

  return processBatch(files, context, async (file) => {
    const outMime = resolveOutputMime(context.outputFormat, file.type, 'image/jpeg');
    const ext = MIME_TO_EXT[outMime] || 'jpg';
    const blob = await watermarkCanvas(file, text, position, opacity, outMime, quality);
    return { name: swapExt(file.name, ext), blob, mime: outMime, sizeBytes: blob.size };
  });
}

export async function imageToBase64(files, context) {
  return processBatch(files, context, async (file) => {
    const base64 = await fileToBase64(file);
    const dataUrl = `data:${file.type};base64,${base64}`;
    const blob = new Blob([dataUrl], { type: 'text/plain' });
    return { name: swapExt(file.name, 'txt'), blob, mime: 'text/plain', sizeBytes: blob.size };
  });
}

export async function base64ToImage(files, context) {
  const outMime = resolveOutputMime(context.outputFormat, 'image/png', 'image/png');
  const ext = MIME_TO_EXT[outMime] || 'png';
  const quality = normalizeQuality(context.quality ?? 85) / 100;

  return processBatch(files, context, async (file) => {
    const blob = await decodeBase64ToImage(file, outMime, quality);
    return {
      name: swapExt(file.name.replace(/\.txt$/i, ''), ext),
      blob,
      mime: outMime,
      sizeBytes: blob.size,
    };
  });
}

// ── Core Batch Runner ────────────────────────────────────────────────────────

async function processBatch(files, context, handler) {
  const outputs = [];
  const errors = [];

  for (let i = 0; i < files.length; i++) {
    try {
      outputs.push(await handler(files[i]));
    } catch (err) {
      errors.push(`${files[i].name}: ${err.message}`);
    }
    context.onProgress?.(Math.round(((i + 1) / files.length) * 100));
  }

  return { outputs, errors };
}

// ── Canvas Conversion Primitives ─────────────────────────────────────────────

function canvasConvert(file, mime, quality, fillWhite) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    const loadTimeout = setTimeout(() => { URL.revokeObjectURL(url); reject(new Error('Image load timed out.')); }, 30000);

    img.onload = () => {
      clearTimeout(loadTimeout);
      URL.revokeObjectURL(url);
      guardDimensions(img, reject);

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');

      if (fillWhite) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0);

      const blobTimeout = setTimeout(() => {
        releaseCanvas(canvas);
        reject(new Error('Canvas encoding timed out. Try a smaller image or different format.'));
      }, 30000);
      canvas.toBlob(
        blob => {
          clearTimeout(blobTimeout);
          releaseCanvas(canvas);
          if (blob) resolve(blob);
          else reject(new Error('Canvas failed to encode image'));
        },
        mime,
        quality,
      );
    };

    img.onerror = () => { clearTimeout(loadTimeout); URL.revokeObjectURL(url); reject(new Error('Image could not be decoded')); };
    img.src = url;
  });
}

// Variant that gives the raw ImageData to a writer function instead of toBlob
function canvasConvertRaw(file, writerFn) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      guardDimensions(img, reject);

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        releaseCanvas(canvas);
        resolve(writerFn(canvas.width, canvas.height, imageData));
      } catch (err) {
        releaseCanvas(canvas);
        reject(err);
      }
    };

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image could not be decoded')); };
    img.src = url;
  });
}

function svgToCanvas(file, targetW, targetH) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      // SVGs with only viewBox (no intrinsic size) return 0×0 — use defaults
      const w = targetW || img.naturalWidth || 1024;
      const h = targetH || img.naturalHeight || 1024;

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(blob => {
        releaseCanvas(canvas);
        if (blob) resolve(blob);
        else reject(new Error('Canvas failed to encode image'));
      }, 'image/png');
    };

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG could not be decoded')); };
    img.src = url;
  });
}

async function rasterToEmbeddedSvg(file) {
  const base64 = await fileToBase64(file);
  const dataUrl = `data:${file.type};base64,${base64}`;

  // We need dimensions — draw to canvas first
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      guardDimensions(img, reject);
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n  <image href="${dataUrl}" width="${w}" height="${h}"/>\n</svg>`;
      resolve(new Blob([svg], { type: 'image/svg+xml' }));
    };

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image could not be decoded')); };
    img.src = url;
  });
}

function resizeCanvas(file, targetW, targetH, maintainAspect, outMime, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      guardDimensions(img, reject);

      let w = targetW || img.naturalWidth;
      let h = targetH || img.naturalHeight;

      if (maintainAspect) {
        const ratio = img.naturalWidth / img.naturalHeight;
        if (targetW && !targetH) h = Math.round(targetW / ratio);
        else if (targetH && !targetW) w = Math.round(targetH * ratio);
        else if (targetW && targetH) {
          const fitByW = targetW / ratio;
          if (fitByW <= targetH) { w = targetW; h = Math.round(fitByW); }
          else { h = targetH; w = Math.round(targetH * ratio); }
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (outMime === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); }
      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(blob => {
        releaseCanvas(canvas);
        if (blob) resolve(blob);
        else reject(new Error('Canvas failed to encode image'));
      }, outMime, quality);
    };

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image could not be decoded')); };
    img.src = url;
  });
}

function cropCanvas(file, cropX, cropY, cropW, cropH, outMime, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      guardDimensions(img, reject);

      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const sx = Math.max(0, Math.min(cropX, iw - 1));
      const sy = Math.max(0, Math.min(cropY, ih - 1));
      const sw = cropW > 0 ? Math.min(cropW, iw - sx) : iw - sx;
      const sh = cropH > 0 ? Math.min(cropH, ih - sy) : ih - sy;

      if (sw <= 0 || sh <= 0) {
        reject(new Error('Crop region is outside image bounds'));
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext('2d');
      if (outMime === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, sw, sh); }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

      canvas.toBlob(blob => {
        releaseCanvas(canvas);
        if (blob) resolve(blob);
        else reject(new Error('Canvas failed to encode image'));
      }, outMime, quality);
    };

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image could not be decoded')); };
    img.src = url;
  });
}

function rotateCanvas(file, angle, outMime, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      guardDimensions(img, reject);

      const rad = (angle * Math.PI) / 180;
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const cos = Math.abs(Math.cos(rad));
      const sin = Math.abs(Math.sin(rad));
      const cw = Math.round(iw * cos + ih * sin);
      const ch = Math.round(iw * sin + ih * cos);

      const canvas = document.createElement('canvas');
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext('2d');
      if (outMime === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cw, ch); }
      ctx.translate(cw / 2, ch / 2);
      ctx.rotate(rad);
      ctx.drawImage(img, -iw / 2, -ih / 2);

      canvas.toBlob(blob => {
        releaseCanvas(canvas);
        if (blob) resolve(blob);
        else reject(new Error('Canvas failed to encode image'));
      }, outMime, quality);
    };

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image could not be decoded')); };
    img.src = url;
  });
}

function flipCanvas(file, axis, outMime, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      guardDimensions(img, reject);

      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const canvas = document.createElement('canvas');
      canvas.width = iw;
      canvas.height = ih;
      const ctx = canvas.getContext('2d');
      if (outMime === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, iw, ih); }

      if (axis === 'horizontal') {
        ctx.translate(iw, 0);
        ctx.scale(-1, 1);
      } else {
        ctx.translate(0, ih);
        ctx.scale(1, -1);
      }
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(blob => {
        releaseCanvas(canvas);
        if (blob) resolve(blob);
        else reject(new Error('Canvas failed to encode image'));
      }, outMime, quality);
    };

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image could not be decoded')); };
    img.src = url;
  });
}

function watermarkCanvas(file, text, position, opacity, outMime, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      guardDimensions(img, reject);

      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const canvas = document.createElement('canvas');
      canvas.width = iw;
      canvas.height = ih;
      const ctx = canvas.getContext('2d');
      if (outMime === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, iw, ih); }
      ctx.drawImage(img, 0, 0);

      // Watermark text — size relative to image dimensions
      const fontSize = Math.max(12, Math.round(Math.min(iw, ih) / 20));
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.globalAlpha = opacity;
      ctx.fillStyle = '#ffffff';

      const margin = Math.round(fontSize * 0.75);
      const metrics = ctx.measureText(text);
      const tw = metrics.width;
      const th = fontSize;

      const positions = {
        'top-left':     [margin, margin + th],
        'top-right':    [iw - tw - margin, margin + th],
        'bottom-left':  [margin, ih - margin],
        'bottom-right': [iw - tw - margin, ih - margin],
        'center':       [(iw - tw) / 2, (ih + th) / 2],
      };

      const [tx, ty] = positions[position] || positions['bottom-right'];

      // Shadow for readability on both light and dark backgrounds
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = Math.round(fontSize * 0.3);
      ctx.fillText(text, tx, ty);

      ctx.globalAlpha = 1;
      ctx.shadowColor = 'transparent';

      canvas.toBlob(blob => {
        releaseCanvas(canvas);
        if (blob) resolve(blob);
        else reject(new Error('Canvas failed to encode image'));
      }, outMime, quality);
    };

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image could not be decoded')); };
    img.src = url;
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      // Strip the data URL prefix to get raw base64
      const b64 = result.split(',')[1];
      resolve(b64 || result);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

async function decodeBase64ToImage(file, outMime, quality) {
  const text = await file.text();
  const trimmed = text.trim();

  // Accept either a full data URL or raw base64
  let dataUrl = trimmed;
  if (!trimmed.startsWith('data:')) {
    // Guess the image type — default to PNG
    dataUrl = `data:image/png;base64,${trimmed}`;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      guardDimensions(img, reject);

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (outMime === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(blob => {
        releaseCanvas(canvas);
        if (blob) resolve(blob);
        else reject(new Error('Canvas failed to encode image'));
      }, outMime, quality);
    };

    img.onerror = () => reject(new Error('Could not decode base64 data. Check that the string is a valid image data URL.'));
    img.src = dataUrl;
  });
}

// ── Raw Format Writers ───────────────────────────────────────────────────────

function writeBmp(width, height, imageData) {
  const rowBytes = width * 3;
  const rowPadding = (4 - (rowBytes % 4)) % 4;
  const paddedRow = rowBytes + rowPadding;
  const pixelDataSize = paddedRow * height;
  const fileSize = 54 + pixelDataSize;

  const buf = new ArrayBuffer(fileSize);
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);

  // BITMAPFILEHEADER
  bytes[0] = 0x42; bytes[1] = 0x4D;         // 'BM'
  view.setUint32(2, fileSize, true);          // bfSize
  view.setUint32(6, 0, true);                 // bfReserved
  view.setUint32(10, 54, true);               // bfOffBits = 14 + 40

  // BITMAPINFOHEADER
  view.setUint32(14, 40, true);               // biSize
  view.setInt32(18, width, true);             // biWidth
  view.setInt32(22, height, true);            // biHeight (positive → bottom-to-top)
  view.setUint16(26, 1, true);                // biPlanes
  view.setUint16(28, 24, true);              // biBitCount (24-bit RGB)
  view.setUint32(30, 0, true);               // biCompression = BI_RGB
  view.setUint32(34, pixelDataSize, true);   // biSizeImage
  view.setInt32(38, 2835, true);             // biXPelsPerMeter (≈ 72 DPI)
  view.setInt32(42, 2835, true);             // biYPelsPerMeter
  view.setUint32(46, 0, true);               // biClrUsed
  view.setUint32(50, 0, true);               // biClrImportant

  // Pixel data — BMP stores rows bottom-to-top in BGR order
  let pos = 54;
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      bytes[pos++] = imageData.data[i + 2]; // B
      bytes[pos++] = imageData.data[i + 1]; // G
      bytes[pos++] = imageData.data[i];     // R
    }
    pos += rowPadding;
  }

  return new Blob([buf], { type: 'image/bmp' });
}

function writeTiff(width, height, imageData) {
  const NUM_IFD = 12;
  const IFD_OFFSET = 8;
  const IFD_SIZE = 2 + NUM_IFD * 12 + 4;
  const BPS_OFFSET = IFD_OFFSET + IFD_SIZE;       // BitsPerSample (6 bytes)
  const XRES_OFFSET = BPS_OFFSET + 6;              // XResolution rational (8 bytes)
  const YRES_OFFSET = XRES_OFFSET + 8;             // YResolution rational (8 bytes)
  const PIXEL_OFFSET = YRES_OFFSET + 8;            // pixel data
  const pixelSize = width * height * 3;
  const fileSize = PIXEL_OFFSET + pixelSize;

  const buf = new ArrayBuffer(fileSize);
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);

  // TIFF header (little-endian)
  bytes[0] = 0x49; bytes[1] = 0x49;               // 'II'
  view.setUint16(2, 42, true);                      // TIFF magic
  view.setUint32(4, IFD_OFFSET, true);              // Offset to first IFD

  // IFD entry count
  view.setUint16(IFD_OFFSET, NUM_IFD, true);

  let ep = IFD_OFFSET + 2;
  const w32 = (tag, type, count, val) => {
    view.setUint16(ep, tag, true);
    view.setUint16(ep + 2, type, true);
    view.setUint32(ep + 4, count, true);
    view.setUint32(ep + 8, val, true);
    ep += 12;
  };

  // type 3=SHORT, 4=LONG, 5=RATIONAL
  w32(256, 4, 1, width);               // ImageWidth
  w32(257, 4, 1, height);              // ImageLength
  w32(258, 3, 3, BPS_OFFSET);          // BitsPerSample → offset (3×SHORT)
  w32(259, 3, 1, 1);                   // Compression = 1 (none)
  w32(262, 3, 1, 2);                   // PhotometricInterpretation = 2 (RGB)
  w32(273, 4, 1, PIXEL_OFFSET);        // StripOffsets
  w32(278, 4, 1, height);              // RowsPerStrip (1 strip)
  w32(279, 4, 1, pixelSize);           // StripByteCounts
  w32(282, 5, 1, XRES_OFFSET);         // XResolution → offset (RATIONAL)
  w32(283, 5, 1, YRES_OFFSET);         // YResolution → offset (RATIONAL)
  w32(284, 3, 1, 1);                   // PlanarConfiguration = 1 (chunky)
  w32(296, 3, 1, 2);                   // ResolutionUnit = 2 (inch)

  // Next IFD offset = 0
  view.setUint32(ep, 0, true);

  // BitsPerSample: 8, 8, 8
  view.setUint16(BPS_OFFSET, 8, true);
  view.setUint16(BPS_OFFSET + 2, 8, true);
  view.setUint16(BPS_OFFSET + 4, 8, true);

  // XResolution: 72/1
  view.setUint32(XRES_OFFSET, 72, true);
  view.setUint32(XRES_OFFSET + 4, 1, true);

  // YResolution: 72/1
  view.setUint32(YRES_OFFSET, 72, true);
  view.setUint32(YRES_OFFSET + 4, 1, true);

  // Pixel data — TIFF stores RGB top-to-bottom (no alpha)
  let pos = PIXEL_OFFSET;
  for (let i = 0; i < imageData.data.length; i += 4) {
    bytes[pos++] = imageData.data[i];     // R
    bytes[pos++] = imageData.data[i + 1]; // G
    bytes[pos++] = imageData.data[i + 2]; // B
  }

  return new Blob([buf], { type: 'image/tiff' });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function swapExt(name, newExt) {
  return name.replace(/\.[^.]+$/, '') + '.' + newExt;
}

function normalizeQuality(q) {
  const n = parseInt(q, 10);
  return Math.max(1, Math.min(100, isNaN(n) ? 85 : n));
}

function guardDimensions(img, reject) {
  if (img.naturalWidth * img.naturalHeight > MAX_PIXELS) {
    reject(new Error(
      `Image is too large (${img.naturalWidth}×${img.naturalHeight} px = ` +
      `${Math.round(img.naturalWidth * img.naturalHeight / 1_000_000)} MP). ` +
      `Maximum is ${MAX_MEGAPIXELS} MP.`,
    ));
    return true;
  }
  return false;
}

function releaseCanvas(canvas) {
  canvas.width = 0;
  canvas.height = 0;
}

function checkFormatSupport(mime) {
  try {
    const c = document.createElement('canvas');
    c.width = 1; c.height = 1;
    return c.toDataURL(mime).startsWith(`data:${mime}`);
  } catch { return false; }
}

function resolveOutputMime(outputFormat, fallback, defaultMime) {
  const map = {
    'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
    'avif': 'image/avif',
  };
  return map[outputFormat] || fallback || defaultMime;
}
