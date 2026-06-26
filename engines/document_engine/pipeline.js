/**
 * Document Pipeline — reusable 7-stage processing pipeline.
 *
 * Every document engine extends DocumentPipeline (or composes it).
 * The pipeline is completely decoupled from:
 *   - The static site generator and templates
 *   - The browser runtime and UI
 *   - Any specific document format
 *   - Any cloud provider
 *
 * Stage flow:
 *   1. input       — receive and normalize File[]
 *   2. validate    — MIME, size, format compatibility
 *   3. manifest    — parse file → DocumentManifest
 *   4. capabilities — compute what operations this document supports
 *   5. execute     — run the engine-specific transform
 *   6. results     — normalize outputs to ConvertedFile[]
 *   7. package     — ZIP assembly is delegated to runtime.js
 *
 * Usage pattern for engine authors:
 *
 *   class PdfEngine extends DocumentPipeline {
 *     constructor() {
 *       super({ allowedMimes: ['application/pdf'], maxSizeMb: 500 });
 *     }
 *
 *     async generateManifest(file) {
 *       const base = await super.generateManifest(file);
 *       const pageCount = await parsePdfPageCount(file);
 *       return enrichManifest(base, { pageCount });
 *     }
 *
 *     computeCapabilities(manifest) {
 *       const caps = super.computeCapabilities(manifest);
 *       if (manifest.hasForms) caps.push('form-extract');
 *       return caps;
 *     }
 *   }
 *
 *   export const engine = new PdfEngine();
 *
 *   export async function mergePdfs(files, context) {
 *     return engine.run(files, context, async (file, manifest, ctx) => {
 *       // merge logic
 *     });
 *   }
 */

import { createManifest, createFallbackManifest, enrichManifest, detectMime } from './manifest.js';

export { enrichManifest };

// ── Pipeline Error ────────────────────────────────────────────────────────────

export class PipelineError extends Error {
  /**
   * @param {string} code   — machine-readable error code (e.g. 'NO_FILES', 'ALL_INVALID')
   * @param {string} message
   */
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = 'PipelineError';
  }
}

// ── Document Pipeline ─────────────────────────────────────────────────────────

export class DocumentPipeline {
  /**
   * @param {PipelineOptions} options
   */
  constructor(options = {}) {
    this.allowedMimes  = options.allowedMimes  ?? [];
    this.maxSizeBytes  = (options.maxSizeMb ?? 500) * 1024 * 1024;
    this.maxFiles      = options.maxFiles ?? 20;
    this.requireWorker = options.requireWorker ?? false;
  }

  // ── Stage 1: Input ──────────────────────────────────────────────────────────

  /**
   * Normalize and guard the input file list.
   * @param {File[]} files
   * @returns {File[]}
   */
  async input(files) {
    if (!Array.isArray(files) || files.length === 0) {
      throw new PipelineError('NO_FILES', 'No files provided.');
    }
    if (files.length > this.maxFiles) {
      throw new PipelineError(
        'TOO_MANY_FILES',
        `Maximum ${this.maxFiles} files per conversion. Received ${files.length}.`
      );
    }
    return files;
  }

  // ── Stage 2: Validate ───────────────────────────────────────────────────────

  /**
   * Filter files by MIME type and size. Returns accepted files and rejection reasons.
   * @param {File[]} files
   * @returns {{ valid: File[], skipped: string[] }}
   */
  async validate(files) {
    const valid = [];
    const skipped = [];

    for (const file of files) {
      const mime = file.type || detectMime(file.name);

      if (this.allowedMimes.length > 0 && !this.allowedMimes.includes(mime)) {
        skipped.push(`${file.name}: unsupported format "${mime}"`);
        continue;
      }

      if (file.size > this.maxSizeBytes) {
        const mb = (file.size / 1048576).toFixed(1);
        const limit = (this.maxSizeBytes / 1048576).toFixed(0);
        skipped.push(`${file.name}: file too large (${mb} MB, limit ${limit} MB)`);
        continue;
      }

      if (file.size === 0) {
        skipped.push(`${file.name}: file is empty`);
        continue;
      }

      valid.push(file);
    }

    if (valid.length === 0) {
      const reasons = skipped.length ? ` Reasons: ${skipped.join('; ')}` : '';
      throw new PipelineError('ALL_INVALID', `No valid files to process.${reasons}`);
    }

    return { valid, skipped };
  }

  // ── Stage 3: Manifest ───────────────────────────────────────────────────────

  /**
   * Build manifests for all valid files.
   * @param {File[]} files
   * @returns {Promise<DocumentManifest[]>}
   */
  async buildManifests(files) {
    return Promise.all(files.map(async (file) => {
      try {
        return await this.generateManifest(file);
      } catch (err) {
        // Manifest generation failure is non-fatal — return a fallback
        return createFallbackManifest(file, [`Manifest generation failed: ${err.message}`]);
      }
    }));
  }

  /**
   * Parse a single file and return its DocumentManifest.
   * Override in subclass to add format-specific metadata extraction.
   *
   * @param {File} file
   * @returns {Promise<DocumentManifest>}
   */
  async generateManifest(file) {
    return createManifest(file);
  }

  // ── Stage 4: Capability Detection ──────────────────────────────────────────

  /**
   * Compute per-document capability lists from manifests.
   * @param {DocumentManifest[]} manifests
   * @returns {Array<{ manifest: DocumentManifest, capabilities: string[] }>}
   */
  detectCapabilities(manifests) {
    return manifests.map(m => ({
      manifest: m,
      capabilities: this.computeCapabilities(m),
    }));
  }

  /**
   * Derive what operations are possible given this document's manifest.
   * Override in subclass to add format-specific capabilities.
   *
   * @param {DocumentManifest} manifest
   * @returns {string[]}
   */
  computeCapabilities(manifest) {
    const caps = [];
    if (manifest.pageCount != null && manifest.pageCount > 1) {
      caps.push('split', 'extract-pages', 'reorder', 'rotate-pages');
    }
    if (!manifest.encrypted && !manifest.passwordProtected) {
      caps.push('compress', 'watermark', 'metadata-edit');
    }
    if (manifest.hasForms) caps.push('form-extract');
    if (manifest.scanned)  caps.push('ocr');
    return caps;
  }

  // ── Stage 5+6: Execute & Results ───────────────────────────────────────────

  /**
   * Run the full pipeline.
   *
   * @param {File[]} files
   * @param {ToolContext} context
   * @param {ExecuteFn} executeFn — async (file, manifest, context) => ConvertedFile
   * @returns {Promise<EngineResult>}
   */
  async run(files, context, executeFn) {
    // Stage 1
    const normalized = await this.input(files);

    // Stage 2
    const { valid, skipped } = await this.validate(normalized);

    // Stage 3
    const manifests = await this.buildManifests(valid);

    // Stage 4 — informational; UI may read from context.manifests if needed
    const withCaps = this.detectCapabilities(manifests);
    context._manifests = withCaps;  // expose non-destructively for UI

    // Stages 5+6
    const outputs = [];
    const errors = [...skipped];

    for (let i = 0; i < valid.length; i++) {
      try {
        context.onProgress?.(Math.round((i / valid.length) * 90));
        const output = await executeFn(valid[i], manifests[i], context);
        if (Array.isArray(output)) {
          outputs.push(...output);   // engine can return multiple outputs per file
        } else {
          outputs.push(output);
        }
      } catch (err) {
        errors.push(`${valid[i].name}: ${err.message}`);
      }
      context.onProgress?.(Math.round(((i + 1) / valid.length) * 90));
    }

    context.onProgress?.(100);

    // Stage 7: ZIP packaging is handled by runtime.js — not the pipeline's concern
    return { outputs, errors };
  }
}

/**
 * Type documentation (JSDoc — not enforced at runtime):
 *
 * @typedef {object} PipelineOptions
 * @property {string[]} [allowedMimes]     — permitted MIME types; empty = all
 * @property {number}   [maxSizeMb=500]    — per-file size limit in MB
 * @property {number}   [maxFiles=20]      — max files per batch
 * @property {boolean}  [requireWorker]    — hint: engine needs a Worker context
 *
 * @typedef {object} ToolContext
 * @property {string}   toolId
 * @property {number}   [quality]
 * @property {string}   [outputFormat]
 * @property {function} [onProgress]       — (pct: number) => void
 * @property {Array}    [_manifests]       — set by pipeline, read by UI
 *
 * @typedef {object} ConvertedFile
 * @property {string} name
 * @property {Blob}   blob
 * @property {string} mime
 * @property {number} sizeBytes
 * @property {number} [pageCount]          — populated by multi-page outputs
 *
 * @typedef {object} EngineResult
 * @property {ConvertedFile[]} outputs
 * @property {string[]}        errors
 *
 * @typedef {function} ExecuteFn
 * (file: File, manifest: DocumentManifest, context: ToolContext) => Promise<ConvertedFile | ConvertedFile[]>
 */
