/**
 * Output validator — React JSX
 *
 * Static analysis only. No AST parsing. No external dependencies.
 */

const REQUIRED_REACT_IMPORTS = ['React', 'useState', 'useEffect', 'useRef', 'useCallback', 'useMemo'];

/**
 * @param {string} code
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateReact(code) {
  const errors = [];
  const warnings = [];

  if (!code || typeof code !== 'string') {
    return { valid: false, errors: ['Input is empty or not a string'], warnings };
  }

  // ── Default export ────────────────────────────────────────────────────────

  if (!/export\s+default\s+/.test(code)) {
    errors.push('No default export found — React component must export default');
  }

  // ── JSX balanced tags (basic heuristic) ──────────────────────────────────

  const openTags  = (code.match(/<[A-Z][A-Za-z]*[\s/>]/g)  ?? []).length;
  const closeTags = (code.match(/<\/[A-Z][A-Za-z]*>/g)     ?? []).length;
  const selfClose = (code.match(/<[A-Z][A-Za-z]*[^>]*\/>/g) ?? []).length;
  const unclosed  = openTags - closeTags - selfClose;
  if (unclosed > 0) {
    warnings.push(`Possibly ${unclosed} unclosed JSX component tag(s)`);
  }

  // ── Hooks usage without import ────────────────────────────────────────────

  for (const hook of ['useState', 'useEffect', 'useRef', 'useCallback', 'useMemo', 'useContext']) {
    const used    = new RegExp(`\\b${hook}\\s*\\(`).test(code);
    const imported = new RegExp(`import.*\\b${hook}\\b`).test(code) ||
                     /from ['"]react['"]/.test(code);
    if (used && !imported) {
      warnings.push(`Hook "${hook}" used but not imported from 'react'`);
    }
  }

  // ── className vs class ────────────────────────────────────────────────────

  const classAttr = code.match(/\bclass=["']/g);
  if (classAttr?.length) {
    errors.push(`Use "className" instead of "class" in JSX (${classAttr.length} occurrence(s))`);
  }

  // ── htmlFor vs for ────────────────────────────────────────────────────────

  if (/\bfor=["']/.test(code)) {
    errors.push('Use "htmlFor" instead of "for" on <label> in JSX');
  }

  // ── Key prop in lists ─────────────────────────────────────────────────────

  const mapWithJsx = code.match(/\.map\(\s*\(?[^)]*\)?\s*=>\s*(<|\([\s\S]*?<)/g);
  if (mapWithJsx?.length) {
    const missingKeys = mapWithJsx.filter(m => !m.includes('key=')).length;
    if (missingKeys > 0) {
      warnings.push(`${missingKeys} .map() rendering JSX without "key" prop`);
    }
  }

  // ── Inline event handler anti-pattern ────────────────────────────────────

  const arrowInEvents = (code.match(/on[A-Z]\w+=\{[^}]*=>/g) ?? []).length;
  if (arrowInEvents > 3) {
    warnings.push(`${arrowInEvents} inline arrow function event handlers detected — consider extracting handlers`);
  }

  return { valid: errors.length === 0, errors, warnings };
}
