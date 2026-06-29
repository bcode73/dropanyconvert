/**
 * Output validator — CSS
 *
 * Static analysis only. No external dependencies.
 */

/**
 * @param {string} css
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateCss(css) {
  const errors = [];
  const warnings = [];

  if (!css || typeof css !== 'string') {
    return { valid: false, errors: ['Input is empty or not a string'], warnings };
  }

  // ── Balanced braces ───────────────────────────────────────────────────────

  let depth = 0;
  for (const ch of css) {
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth < 0) { errors.push('Unexpected closing brace }'); depth = 0; }
    }
  }
  if (depth > 0) errors.push(`${depth} unclosed rule block(s) — missing }`);

  // ── Duplicate selectors ───────────────────────────────────────────────────

  const rulePattern = /([^{}]+)\{[^{}]*\}/g;
  const selectorCounts = {};
  let match;
  while ((match = rulePattern.exec(css)) !== null) {
    const sel = match[1].trim();
    if (!sel.startsWith('@')) {
      selectorCounts[sel] = (selectorCounts[sel] ?? 0) + 1;
    }
  }
  for (const [sel, count] of Object.entries(selectorCounts)) {
    if (count > 1) warnings.push(`Duplicate selector "${sel}" (${count} occurrences)`);
  }

  // ── Invalid property syntax ───────────────────────────────────────────────

  const declPattern = /\{([^{}]+)\}/g;
  while ((match = declPattern.exec(css)) !== null) {
    const block = match[1];
    for (const decl of block.split(';')) {
      const trimmed = decl.trim();
      if (!trimmed) continue;
      if (!trimmed.includes(':')) {
        warnings.push(`Possibly invalid declaration (no colon): "${trimmed.slice(0, 50)}"`);
      }
    }
  }

  // ── Known invalid values ──────────────────────────────────────────────────

  const invalidUnits = css.match(/\d+px\s*px|\d+em\s*em/g);
  if (invalidUnits?.length) {
    warnings.push(`Doubled units detected: ${invalidUnits.slice(0, 3).join(', ')}`);
  }

  // ── !important overuse ────────────────────────────────────────────────────

  const importantCount = (css.match(/!important/g) ?? []).length;
  if (importantCount > 5) {
    warnings.push(`High !important usage (${importantCount} occurrences) — may indicate specificity issues`);
  }

  return { valid: errors.length === 0, errors, warnings };
}
