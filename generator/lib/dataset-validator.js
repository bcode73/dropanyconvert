/**
 * Phase 24 — Dataset Validator
 *
 * Validates the generated dataset for consistency and completeness.
 * Warnings only — never fails the build.
 */

const REQUIRED_FORMAT_FIELDS = [
  'name', 'fullName', 'extension', 'category', 'compression',
  'transparency', 'animation', 'browserSupport', 'commonUseCases', 'alternatives',
];

const REQUIRED_CONVERSION_FIELDS = [
  'toolSlug', 'source', 'destination', 'lossless', 'preservesTransparency',
];

/**
 * @param {object} formatDb   — output of buildFormatDatabase
 * @param {object} convMatrix — output of buildConversionMatrix
 * @param {object} capDb      — output of buildCapabilityDatabase
 * @param {object} data       — full site data (tools, etc.)
 * @returns {{ warnings: string[], stats: object }}
 */
export function validateDatasets(formatDb, convMatrix, capDb, data) {
  const warnings = [];

  // ── 1. Check for duplicate MIME types in format DB ──────────────────────────
  const seenMimes = new Set();
  for (const fmt of formatDb) {
    if (seenMimes.has(fmt.mime)) {
      warnings.push(`Duplicate MIME type in format DB: ${fmt.mime}`);
    }
    seenMimes.add(fmt.mime);
  }

  // ── 2. Check for duplicate extensions ───────────────────────────────────────
  const seenExt = new Map();
  for (const fmt of formatDb) {
    const ext = fmt.extension;
    if (seenExt.has(ext)) {
      warnings.push(`Duplicate extension ".${ext}" in format DB: ${fmt.mime} vs ${seenExt.get(ext)}`);
    } else {
      seenExt.set(ext, fmt.mime);
    }
  }

  // ── 3. Missing required metadata fields ─────────────────────────────────────
  for (const fmt of formatDb) {
    for (const field of REQUIRED_FORMAT_FIELDS) {
      if (fmt[field] === undefined || fmt[field] === null) {
        warnings.push(`Format ${fmt.mime} is missing required field: ${field}`);
      }
    }
  }

  // ── 4. Broken tool→format relationships ─────────────────────────────────────
  const toolSlugs = new Set(data.tools.map(t => t.slug));
  for (const fmt of formatDb) {
    const ct = fmt.converterTools || {};
    const slugs = Array.isArray(ct) ? ct : [...(ct.input || []), ...(ct.output || [])];
    for (const slug of slugs) {
      if (!toolSlugs.has(slug)) {
        warnings.push(`Format ${fmt.mime} references unknown tool slug: ${slug}`);
      }
    }
  }

  // ── 5. Invalid conversion pairs (source === destination) ────────────────────
  let invalidPairs = 0;
  for (const pair of (convMatrix?.pairs || [])) {
    if (pair.source === pair.destination) {
      invalidPairs++;
      if (warnings.length < 50) {
        warnings.push(`Invalid self-conversion pair: ${pair.source} → ${pair.destination} (tool: ${pair.toolSlug})`);
      }
    }
  }

  // ── 6. Conversion pairs missing required fields ──────────────────────────────
  let malformedPairs = 0;
  for (const pair of (convMatrix?.pairs || [])) {
    for (const field of REQUIRED_CONVERSION_FIELDS) {
      if (pair[field] === undefined) {
        malformedPairs++;
        break;
      }
    }
  }
  if (malformedPairs > 0) {
    warnings.push(`${malformedPairs} conversion pair(s) are missing required fields`);
  }

  // ── 7. Tools in capability DB but not in data.tools ────────────────────────
  const capTools = Object.keys(capDb?.tools || {});
  for (const slug of capTools) {
    if (!toolSlugs.has(slug)) {
      warnings.push(`Capability DB references unknown tool: ${slug}`);
    }
  }

  // ── 8. Tools with no MIME type coverage in format DB ───────────────────────
  const mimeSet = new Set(formatDb.map(f => f.mimeType));
  let noMimeCoverage = 0;
  for (const tool of data.tools) {
    const inputs  = (tool.accepts?.formats  || []).map(f => typeof f === 'string' ? f : f.mime).filter(Boolean);
    const outputs = (tool.produces?.formats || []).map(f => typeof f === 'string' ? f : f.mime).filter(Boolean);
    const allMimes = [...new Set([...inputs, ...outputs])];
    const covered = allMimes.filter(m => mimeSet.has(m));
    if (allMimes.length > 0 && covered.length === 0) {
      noMimeCoverage++;
    }
  }
  if (noMimeCoverage > 0) {
    warnings.push(`${noMimeCoverage} tool(s) have MIME types not covered by the format database`);
  }

  if (warnings.length >= 50) {
    warnings.push(`... and more (capped at 50)`);
  }

  const stats = {
    formats_validated:    formatDb.length,
    conversion_pairs:     (convMatrix?.pairs || []).length,
    capability_tools:     capTools.length,
    duplicate_mimes:      formatDb.length - seenMimes.size,
    invalid_pairs:        invalidPairs,
    malformed_pairs:      malformedPairs,
    no_mime_coverage:     noMimeCoverage,
    warnings_total:       warnings.length,
  };

  return { warnings, stats };
}
