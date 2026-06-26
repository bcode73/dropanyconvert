/**
 * Image Engine — Phase 3 implementation.
 *
 * All functions receive (files: File[], context: ToolContext) and return
 * Promise<EngineResult>.
 *
 * EngineResult: { outputs: ConvertedFile[], errors: string[] }
 * ConvertedFile: { name: string, blob: Blob, mime: string, sizeBytes: number }
 *
 * This module runs entirely in the browser (runtime: "browser").
 * No DOM manipulation. No routing. No SEO.
 */

export const engineMeta = {
  id: 'image_engine',
  version: '0.1.0',
  runtime: 'browser',
};

/** Convert PNG/image to JPEG */
export async function convertToJpg(files, context) {
  // Phase 3 implementation placeholder
  throw new Error('image_engine.convertToJpg: not yet implemented (Phase 3)');
}

/** Convert to WebP */
export async function convertToWebP(files, context) {
  throw new Error('image_engine.convertToWebP: not yet implemented (Phase 3)');
}

/** Convert to PNG */
export async function convertToPng(files, context) {
  throw new Error('image_engine.convertToPng: not yet implemented (Phase 3)');
}

/** Compress image */
export async function compressImage(files, context) {
  throw new Error('image_engine.compressImage: not yet implemented (Phase 3)');
}
