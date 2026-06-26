/**
 * Image Engine — Browser-only Canvas API conversion.
 *
 * Contract:
 *   receive: File[], ToolContext { toolId, quality?, outputFormat?, onProgress? }
 *   return:  Promise<EngineResult>
 *
 * EngineResult:  { outputs: ConvertedFile[], errors: string[] }
 * ConvertedFile: { name: string, blob: Blob, mime: string, sizeBytes: number }
 *
 * Rules:
 *   - No DOM manipulation beyond canvas creation.
 *   - No routing, SEO, or UI ownership.
 *   - Release canvas memory after each file.
 *   - Call context.onProgress(0–100) to report batch progress.
 */

export const engineMeta = {
  id: 'image_engine',
  version: '1.0.0',
  runtime: 'browser',
};

// ── Public API ──────────────────────────────────────────────────────────────

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

export async function compressImage(files, context) {
  const quality = normalizeQuality(context.quality ?? 75) / 100;
  return processBatch(files, context, async (file) => {
    const outMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await canvasConvert(file, outMime, quality, outMime === 'image/jpeg');
    return { name: file.name, blob, mime: outMime, sizeBytes: blob.size };
  });
}

// ── Core ────────────────────────────────────────────────────────────────────

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

function canvasConvert(file, mime, quality, fillWhite) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');

      if (fillWhite) {
        // JPEG has no alpha — replace transparency with white
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        blob => {
          // Release GPU/RAM immediately
          canvas.width = 0;
          canvas.height = 0;
          if (blob) resolve(blob);
          else reject(new Error('Canvas failed to encode image'));
        },
        mime,
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image could not be decoded'));
    };

    img.src = url;
  });
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function swapExt(name, newExt) {
  return name.replace(/\.[^.]+$/, '') + '.' + newExt;
}

function normalizeQuality(q) {
  const n = parseInt(q, 10);
  return Math.max(1, Math.min(100, isNaN(n) ? 85 : n));
}
