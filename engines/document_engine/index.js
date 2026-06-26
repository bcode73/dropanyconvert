/**
 * Document Engine — base module and convenience re-exports.
 *
 * All future document engines (PDF, DOCX, XLSX, PPTX, Text, Markdown, HTML,
 * OCR, AI) import from this module rather than from the individual files.
 * This gives engine authors a single import path and keeps the internal file
 * layout an implementation detail.
 *
 * Usage in a concrete engine:
 *
 *   import {
 *     DocumentPipeline, PipelineError, enrichManifest,
 *     BASE_ENGINE_META,
 *   } from '../document_engine/index.js';
 *
 *   export const engineMeta = {
 *     ...BASE_ENGINE_META,
 *     id: 'pdf_engine',
 *     version: '0.1.0',
 *     supportedMimes: ['application/pdf'],
 *     cloudProvider: 'ilovepdf',       // optional; omit for browser-only engines
 *     runtime: 'hybrid',
 *     workerReady: false,
 *   };
 *
 *   export const engine = new PdfPipeline();
 */

// ── Re-exports ────────────────────────────────────────────────────────────────

export {
  // Manifest
  MANIFEST_VERSION,
  EXTENSION_MIME_MAP,
  detectMime,
  createManifest,
  createFallbackManifest,
  enrichManifest,
} from './manifest.js';

export {
  // Pipeline
  PipelineError,
  DocumentPipeline,
} from './pipeline.js';

export {
  // Cloud
  CloudAdapter,
  adapterRegistry,
} from './cloud-adapter.js';

// ── Base engine meta ──────────────────────────────────────────────────────────

/**
 * Template for the engineMeta export that every document engine must provide.
 *
 * Concrete engines spread this and override every field that differs.
 * The shape here is the authoritative contract — future validation rules
 * will enforce that all required fields are present in any engine that
 * extends this base.
 *
 * Fields:
 *   id              — unique engine identifier; matches the directory name
 *   version         — semver; bump on breaking changes
 *   runtime         — 'browser' | 'hybrid' | 'cloud'
 *                     browser : all processing runs in the browser (no adapter)
 *                     hybrid  : browser first, cloud fallback if browser fails
 *                     cloud   : cloud adapter always used
 *   supportedMimes  — MIME types this engine accepts as input
 *   workerReady     — true if the engine can run inside a Web Worker
 *   cloudProvider   — provider ID registered in adapterRegistry; omit if no cloud
 *   fallbackRuntime — for hybrid engines: what to try if primary fails
 *   maxFileSizeMb   — recommended per-file cap; may be stricter than the pipeline default
 *   memoryBudgetMb  — expected peak browser memory usage (informational)
 *   requiresWorker  — if true, the runtime MUST dispatch to a Worker
 *   browserSupport  — minimum browser versions for this engine's browser features
 *   dependencies    — external libraries required at runtime
 *   capabilities    — operations this engine family can perform
 *                     (document-level; differs from per-document manifest capabilities)
 *   featureFlags    — optional feature gates for gradual rollout
 */
export const BASE_ENGINE_META = {
  id:             'document_engine',
  version:        '0.1.0',

  // Runtime dispatch
  runtime:        'browser',    // concrete engines override
  workerReady:    false,
  cloudProvider:  null,         // concrete engines set this when cloud is used
  fallbackRuntime: null,        // e.g. 'browser' for a hybrid engine

  // Resource guidance
  maxFileSizeMb:  500,
  memoryBudgetMb: 256,
  requiresWorker: false,

  // What this engine accepts
  supportedMimes: [],           // concrete engines populate

  // Browser minimum versions (informational — not enforced at runtime)
  browserSupport: {
    chrome:  90,
    firefox: 88,
    safari:  14,
    edge:    90,
  },

  // External library dependencies loaded at runtime
  dependencies: [],

  // Operations available across the engine family
  // Per-document capabilities are determined by DocumentPipeline.computeCapabilities()
  capabilities: [],

  // Feature flags — override in concrete engine or at runtime config
  featureFlags: {
    thumbnailGeneration: false,
    ocrSupport:          false,
    cloudFallback:       false,
    aiEnhancement:       false,
  },
};
