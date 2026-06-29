/**
 * Phase 32 — Layout validation.
 * Scans emitted pages for layout system violations.
 */

const INLINE_STYLE_PATTERN  = /style=["'][^"']*max-width\s*:/i;
const EMPTY_ASIDE_PATTERN   = /<aside[^>]*>\s*<\/aside>/i;
const UNKNOWN_CSS_VAR       = /--color-(?!transparent)[a-z-]+/g;
const MISSING_CONTAINER     = /<main[^>]*>(?![\s\S]*?class="[^"]*dac-container)/;
const AD_NO_MINHEIGHT       = /class="[^"]*dac-ad(?!.*dac-ad--)[^"]*"/;

export function validateLayout(pages) {
  const errors   = [];
  const warnings = [];
  const stats    = {
    pages_checked:         pages.length,
    inline_style_pages:    0,
    empty_sidebar_pages:   0,
    unknown_var_pages:     0,
    ad_no_height_pages:    0,
  };

  for (const page of pages) {
    const { path, content } = page;
    if (!content) continue;

    if (INLINE_STYLE_PATTERN.test(content)) {
      stats.inline_style_pages++;
      warnings.push(`Inline max-width style on: ${path}`);
    }
    if (EMPTY_ASIDE_PATTERN.test(content)) {
      stats.empty_sidebar_pages++;
      errors.push(`Empty <aside> on: ${path}`);
    }
    const unknownVars = content.match(UNKNOWN_CSS_VAR);
    if (unknownVars) {
      stats.unknown_var_pages++;
      warnings.push(`Unknown CSS vars [${[...new Set(unknownVars)].join(', ')}] on: ${path}`);
    }
    if (AD_NO_MINHEIGHT.test(content)) {
      stats.ad_no_height_pages++;
      warnings.push(`Ad block without size class on: ${path}`);
    }
  }

  return { errors, warnings, stats };
}
