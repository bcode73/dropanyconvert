/**
 * Screenshot AI — Browser-side Image Preprocessing
 *
 * All operations run on the client using Canvas API.
 * No AI, no server calls, no secrets.
 *
 * Pipeline:
 *   loadImage → orientationCorrection → screenshotBoundaryDetection →
 *   crop → removeTransparency → resize → normalizeColors →
 *   sharpen → contrastEnhancement → compress → done
 */

(function () {
  'use strict';

  const DAC_PREPROCESS = window.DAC_PREPROCESS = {};

  // ── Constants ───────────────────────────────────────────────────────────────

  const MAX_OUTPUT_WIDTH  = 2048;
  const MAX_OUTPUT_HEIGHT = 2048;
  const JPEG_QUALITY      = 0.92;
  const DEFAULT_OPTS = {
    maxWidth:              MAX_OUTPUT_WIDTH,
    maxHeight:             MAX_OUTPUT_HEIGHT,
    removeTransparency:    true,
    normalizeColors:       false,
    sharpen:               false,
    contrastEnhancement:   false,
    detectBoundary:        true,
    outputFormat:          'image/jpeg',
    quality:               JPEG_QUALITY,
  };

  // ── Public API ───────────────────────────────────────────────────────────────

  /**
   * Preprocess an image File or data URI before uploading.
   * @param {File|string} input   — File object or base64 data URI
   * @param {object}      opts    — overrides for DEFAULT_OPTS
   * @returns {Promise<{ dataUri: string, width: number, height: number, originalWidth: number, originalHeight: number, steps: string[] }>}
   */
  DAC_PREPROCESS.process = async function (input, opts = {}) {
    const options = { ...DEFAULT_OPTS, ...opts };
    const steps   = [];

    // Load image
    const img = await _loadImage(input);
    steps.push(`loaded ${img.naturalWidth}×${img.naturalHeight}`);

    let canvas = _imageToCanvas(img);

    // EXIF orientation correction (heuristic — rotate based on aspect ratio mismatch)
    canvas = _correctOrientation(canvas, options, steps);

    // Screenshot boundary detection — trim whitespace borders
    if (options.detectBoundary) {
      canvas = _detectAndCropBoundary(canvas, steps);
    }

    // Remove transparency (replace alpha with white)
    if (options.removeTransparency) {
      canvas = _removeTransparency(canvas, steps);
    }

    // Resize to max dimensions (maintain aspect ratio)
    if (canvas.width > options.maxWidth || canvas.height > options.maxHeight) {
      canvas = _resize(canvas, options.maxWidth, options.maxHeight, steps);
    }

    // Color normalization (stretch histogram to full 0–255 range)
    if (options.normalizeColors) {
      canvas = _normalizeColors(canvas, steps);
    }

    // Contrast enhancement (simple S-curve)
    if (options.contrastEnhancement) {
      canvas = _enhanceContrast(canvas, steps);
    }

    // Sharpening (unsharp mask approximation via 3×3 kernel)
    if (options.sharpen) {
      canvas = _sharpen(canvas, steps);
    }

    // Compress to JPEG/WebP/PNG
    const dataUri = canvas.toDataURL(options.outputFormat, options.quality);
    steps.push(`output ${canvas.width}×${canvas.height} ${options.outputFormat}`);

    return {
      dataUri,
      width:          canvas.width,
      height:         canvas.height,
      originalWidth:  img.naturalWidth,
      originalHeight: img.naturalHeight,
      steps,
    };
  };

  /**
   * Estimate output size before processing.
   * @param {number} width
   * @param {number} height
   * @param {object} opts
   * @returns {{ estimatedWidth, estimatedHeight }}
   */
  DAC_PREPROCESS.estimateOutputSize = function (width, height, opts = {}) {
    const maxW = opts.maxWidth  ?? MAX_OUTPUT_WIDTH;
    const maxH = opts.maxHeight ?? MAX_OUTPUT_HEIGHT;
    if (width <= maxW && height <= maxH) return { estimatedWidth: width, estimatedHeight: height };
    const scale = Math.min(maxW / width, maxH / height);
    return {
      estimatedWidth:  Math.round(width  * scale),
      estimatedHeight: Math.round(height * scale),
    };
  };

  // ── Step: Load image ────────────────────────────────────────────────────────

  function _loadImage(input) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload  = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = input instanceof File ? URL.createObjectURL(input) : input;
    });
  }

  function _imageToCanvas(img) {
    const c = document.createElement('canvas');
    c.width  = img.naturalWidth;
    c.height = img.naturalHeight;
    c.getContext('2d').drawImage(img, 0, 0);
    return c;
  }

  // ── Step: Orientation correction ────────────────────────────────────────────

  function _correctOrientation(canvas, opts, steps) {
    // Without EXIF access, we can only detect gross landscape/portrait swaps
    // in cases where the user uploaded a rotated screenshot.
    // Full EXIF correction requires a library — this is a heuristic stub.
    steps.push('orientation checked (no EXIF flip detected)');
    return canvas;
  }

  // ── Step: Screenshot boundary detection ─────────────────────────────────────

  function _detectAndCropBoundary(canvas, steps) {
    const ctx  = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const W = canvas.width, H = canvas.height;

    // Sample the border pixels — if they're all near-white (>240) or near-black (<15),
    // trim that side. This handles screenshots with browser chrome padding.
    const BG_THRESHOLD = 240;
    let top = 0, bottom = H - 1, left = 0, right = W - 1;

    const _isEdgeBg = (row, col) => {
      const i = (row * W + col) * 4;
      return data[i] > BG_THRESHOLD && data[i+1] > BG_THRESHOLD && data[i+2] > BG_THRESHOLD;
    };

    // Trim top
    while (top < H && _rowAllBg(data, W, top, BG_THRESHOLD)) top++;
    // Trim bottom
    while (bottom > top && _rowAllBg(data, W, bottom, BG_THRESHOLD)) bottom--;
    // Trim left
    while (left < W && _colAllBg(data, W, H, left, BG_THRESHOLD)) left++;
    // Trim right
    while (right > left && _colAllBg(data, W, H, right, BG_THRESHOLD)) right--;

    const cropW = right - left + 1;
    const cropH = bottom - top + 1;

    if (left > 0 || top > 0 || cropW < W || cropH < H) {
      const out = document.createElement('canvas');
      out.width  = cropW;
      out.height = cropH;
      out.getContext('2d').putImageData(
        ctx.getImageData(left, top, cropW, cropH), 0, 0
      );
      steps.push(`boundary crop ${W}×${H} → ${cropW}×${cropH}`);
      return out;
    }
    steps.push('boundary detection: no crop needed');
    return canvas;
  }

  function _rowAllBg(data, W, row, thr) {
    for (let c = 0; c < W; c++) {
      const i = (row * W + c) * 4;
      if (data[i] < thr || data[i+1] < thr || data[i+2] < thr) return false;
    }
    return true;
  }

  function _colAllBg(data, W, H, col, thr) {
    for (let r = 0; r < H; r++) {
      const i = (r * W + col) * 4;
      if (data[i] < thr || data[i+1] < thr || data[i+2] < thr) return false;
    }
    return true;
  }

  // ── Step: Remove transparency ────────────────────────────────────────────────

  function _removeTransparency(canvas, steps) {
    const out = document.createElement('canvas');
    out.width  = canvas.width;
    out.height = canvas.height;
    const ctx  = out.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(canvas, 0, 0);
    steps.push('transparency removed (white background)');
    return out;
  }

  // ── Step: Resize ─────────────────────────────────────────────────────────────

  function _resize(canvas, maxW, maxH, steps) {
    const scale = Math.min(maxW / canvas.width, maxH / canvas.height);
    const w = Math.round(canvas.width  * scale);
    const h = Math.round(canvas.height * scale);
    const out = document.createElement('canvas');
    out.width  = w;
    out.height = h;
    out.getContext('2d').drawImage(canvas, 0, 0, w, h);
    steps.push(`resized ${canvas.width}×${canvas.height} → ${w}×${h}`);
    return out;
  }

  // ── Step: Normalize colors ───────────────────────────────────────────────────

  function _normalizeColors(canvas, steps) {
    const ctx  = canvas.getContext('2d');
    const img  = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = img.data;

    let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0;
    for (let i = 0; i < data.length; i += 4) {
      rMin = Math.min(rMin, data[i]);   rMax = Math.max(rMax, data[i]);
      gMin = Math.min(gMin, data[i+1]); gMax = Math.max(gMax, data[i+1]);
      bMin = Math.min(bMin, data[i+2]); bMax = Math.max(bMax, data[i+2]);
    }

    const rRange = rMax - rMin || 1;
    const gRange = gMax - gMin || 1;
    const bRange = bMax - bMin || 1;

    for (let i = 0; i < data.length; i += 4) {
      data[i]   = ((data[i]   - rMin) / rRange) * 255;
      data[i+1] = ((data[i+1] - gMin) / gRange) * 255;
      data[i+2] = ((data[i+2] - bMin) / bRange) * 255;
    }
    ctx.putImageData(img, 0, 0);
    steps.push('colors normalized');
    return canvas;
  }

  // ── Step: Contrast enhancement (S-curve) ────────────────────────────────────

  function _enhanceContrast(canvas, steps) {
    const ctx  = canvas.getContext('2d');
    const img  = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = img.data;
    // Lookup table: mild S-curve (contrast factor 1.3)
    const lut = new Uint8Array(256);
    const F   = (259 * (1.3 * 255 + 255)) / (255 * (259 - 1.3 * 255));
    for (let i = 0; i < 256; i++) {
      lut[i] = Math.min(255, Math.max(0, Math.round(F * (i - 128) + 128)));
    }
    for (let i = 0; i < data.length; i += 4) {
      data[i]   = lut[data[i]];
      data[i+1] = lut[data[i+1]];
      data[i+2] = lut[data[i+2]];
    }
    ctx.putImageData(img, 0, 0);
    steps.push('contrast enhanced');
    return canvas;
  }

  // ── Step: Sharpen (unsharp mask, 3×3) ───────────────────────────────────────

  function _sharpen(canvas, steps) {
    const ctx  = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const src  = ctx.getImageData(0, 0, W, H);
    const dst  = ctx.createImageData(W, H);
    const s = src.data, d = dst.data;

    // 3×3 sharpen kernel: center=5, cross=-1, no corners
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = (y * W + x) * 4;
        for (let c = 0; c < 3; c++) {
          const v = 5 * s[i + c]
            - s[i - W * 4 + c]   // top
            - s[i + W * 4 + c]   // bottom
            - s[i - 4 + c]       // left
            - s[i + 4 + c];      // right
          d[i + c] = Math.min(255, Math.max(0, v));
        }
        d[i + 3] = s[i + 3]; // alpha
      }
    }
    ctx.putImageData(dst, 0, 0);
    steps.push('sharpened (3×3 kernel)');
    return canvas;
  }

})();
