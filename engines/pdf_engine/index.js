/**
 * PDF Engine — stub.
 *
 * Implements the document engine contract using the DocumentPipeline foundation.
 * Actual PDF processing (pdf-lib, pdfjs, ilovepdf adapter) is Phase 6.
 *
 * Runtime: hybrid
 *   - Phase 6 goal: browser for lightweight ops (merge small PDFs, compress)
 *   - Cloud fallback (ilovepdf) for heavy ops (OCR, large files)
 */

import {
  DocumentPipeline,
  PipelineError,
  enrichManifest,
  BASE_ENGINE_META,
} from '../document_engine/index.js';

// ── Engine meta ───────────────────────────────────────────────────────────────

export const engineMeta = {
  ...BASE_ENGINE_META,
  id:      'pdf_engine',
  version: '0.1.0',

  runtime:         'hybrid',
  workerReady:     false,
  cloudProvider:   null,        // Phase 6: 'ilovepdf'
  fallbackRuntime: 'browser',

  maxFileSizeMb:   500,
  memoryBudgetMb:  512,

  supportedMimes: ['application/pdf'],

  capabilities: [
    'merge',
    'split',
    'compress',
    'extract-pages',
    'reorder',
    'rotate-pages',
    'watermark-doc',
    'password-protect',
    'remove-password',
    'metadata-edit',
    'form-extract',
    'ocr',
    'convert-to-pdf',
    'convert-from-pdf',
    'thumbnail-generation',
  ],

  featureFlags: {
    thumbnailGeneration: false,   // Phase 6
    ocrSupport:          false,   // Phase 6
    cloudFallback:       false,   // Phase 6
    aiEnhancement:       false,
  },
};

// ── PDF Pipeline subclass ─────────────────────────────────────────────────────

class PdfPipeline extends DocumentPipeline {
  constructor() {
    super({
      allowedMimes: ['application/pdf'],
      maxSizeMb:    500,
      maxFiles:     20,
    });
  }

  async generateManifest(file) {
    const base = await super.generateManifest(file);
    // Phase 6: parse actual PDF metadata (page count, encryption, forms, etc.)
    return base;
  }

  computeCapabilities(manifest) {
    const caps = super.computeCapabilities(manifest);
    // Phase 6: add PDF-specific capabilities based on manifest content
    return caps;
  }
}

const engine = new PdfPipeline();

// ── Public API ────────────────────────────────────────────────────────────────

export async function mergePdfs(files, context) {
  return engine.run(files, context, async (file, manifest, ctx) => {
    throw new PipelineError('NOT_IMPLEMENTED', 'mergePdfs: not yet implemented (Phase 6)');
  });
}

export async function splitPdf(files, context) {
  return engine.run(files, context, async (file, manifest, ctx) => {
    throw new PipelineError('NOT_IMPLEMENTED', 'splitPdf: not yet implemented (Phase 6)');
  });
}

export async function compressPdf(files, context) {
  return engine.run(files, context, async (file, manifest, ctx) => {
    throw new PipelineError('NOT_IMPLEMENTED', 'compressPdf: not yet implemented (Phase 6)');
  });
}
