/**
 * Document Manifest — shared document descriptor.
 *
 * Every document engine produces a DocumentManifest during the pipeline's
 * manifest stage. Downstream stages (capability detection, engine execution,
 * UI rendering) consume manifests instead of reading raw File objects.
 *
 * This decouples format-specific parsing from processing logic and allows
 * the UI to adapt to what a document actually contains — not what the tool
 * schema declares it might contain.
 *
 * Contract:
 *   - Engines call createManifest(file, overrides) to build a base manifest.
 *   - Engines then enrich the manifest with parsed metadata (pageCount, etc.).
 *   - The manifest is frozen before passing to execute stage — engines must
 *     not mutate it during processing.
 *   - Thumbnails are populated lazily and are always optional.
 */

export const MANIFEST_VERSION = '1.0.0';

/**
 * MIME type registry.
 * Used when file.type is empty (common with drag-and-drop on some OSes).
 */
export const EXTENSION_MIME_MAP = {
  // PDF
  pdf:  'application/pdf',

  // Office Open XML
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

  // Legacy Office
  doc:  'application/msword',
  xls:  'application/vnd.ms-excel',
  ppt:  'application/vnd.ms-powerpoint',

  // OpenDocument
  odt:  'application/vnd.oasis.opendocument.text',
  ods:  'application/vnd.oasis.opendocument.spreadsheet',
  odp:  'application/vnd.oasis.opendocument.presentation',

  // Text formats
  txt:  'text/plain',
  md:   'text/markdown',
  csv:  'text/csv',
  rtf:  'application/rtf',

  // Web formats
  html: 'text/html',
  htm:  'text/html',
  xml:  'application/xml',
  json: 'application/json',

  // eBook
  epub: 'application/epub+zip',
};

/**
 * Detect MIME type from file extension.
 * Used as a fallback when file.type is absent or unreliable.
 *
 * @param {string} filename
 * @returns {string}
 */
export function detectMime(filename) {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSION_MIME_MAP[ext] ?? 'application/octet-stream';
}

/**
 * Create a DocumentManifest.
 *
 * @param {File} file                      — source file
 * @param {Partial<DocumentManifest>} overrides — engine-supplied parsed metadata
 * @returns {DocumentManifest}
 */
export function createManifest(file, overrides = {}) {
  const manifest = {
    manifestVersion: MANIFEST_VERSION,

    // ── Identity ────────────────────────────────────────────────────────────
    filename: file.name,
    mime: file.type || detectMime(file.name),
    sizeBytes: file.size,

    // ── Structure ───────────────────────────────────────────────────────────
    pageCount: null,              // number | null
    orientation: null,            // 'portrait' | 'landscape' | 'mixed' | null
    dimensions: null,             // { width, height, unit: 'pt'|'px'|'mm' } | null
    sheetCount: null,             // XLSX: number | null
    slideCount: null,             // PPTX: number | null
    wordCount: null,              // DOCX/TXT: number | null
    charCount: null,              // text formats: number | null

    // ── Security ────────────────────────────────────────────────────────────
    encrypted: false,
    passwordProtected: false,
    hasDigitalSignature: false,

    // ── Content analysis ────────────────────────────────────────────────────
    scanned: false,               // heuristic: PDF appears to be a scan
    hasEmbeddedFonts: null,       // PDF: boolean | null
    hasAnnotations: false,
    hasForms: false,
    hasBookmarks: false,
    hasHyperlinks: false,
    hasEmbeddedMedia: false,
    hasTrackedChanges: false,     // DOCX: boolean
    language: null,               // detected document language code, e.g. 'en'

    // ── Metadata ────────────────────────────────────────────────────────────
    title: null,
    author: null,
    subject: null,
    keywords: [],
    description: null,
    producer: null,               // PDF: producing software
    creator: null,                // PDF: authoring software
    createdAt: null,              // ISO 8601 string | null
    modifiedAt: null,             // ISO 8601 string | null
    version: null,                // document format version, if available

    // ── Visuals ─────────────────────────────────────────────────────────────
    thumbnails: [],               // [{ pageIndex: number, dataUrl: string }]

    // ── Runtime capability hints ─────────────────────────────────────────────
    // Populated by detectCapabilities() in pipeline.js.
    // Represents what THIS DOCUMENT supports based on its content,
    // not what the tool schema declares.
    capabilities: [],

    // ── Non-fatal issues ────────────────────────────────────────────────────
    warnings: [],

    ...overrides,
  };

  return Object.freeze(manifest);
}

/**
 * Produce a minimal safe manifest for files that cannot be parsed
 * (e.g. encrypted, corrupted). Only identity fields are populated.
 *
 * @param {File} file
 * @param {string[]} warnings
 * @returns {DocumentManifest}
 */
export function createFallbackManifest(file, warnings = []) {
  return createManifest(file, { warnings });
}

/**
 * Produce an enriched copy of a manifest with additional fields.
 * Preserves immutability — returns a new frozen object.
 *
 * @param {DocumentManifest} manifest
 * @param {Partial<DocumentManifest>} additions
 * @returns {DocumentManifest}
 */
export function enrichManifest(manifest, additions) {
  return Object.freeze({ ...manifest, ...additions });
}
