/**
 * Output validator — SwiftUI
 *
 * Static analysis only. No external dependencies.
 */

/**
 * @param {string} code
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateSwiftUI(code) {
  const errors = [];
  const warnings = [];

  if (!code || typeof code !== 'string') {
    return { valid: false, errors: ['Input is empty or not a string'], warnings };
  }

  // ── Import SwiftUI ────────────────────────────────────────────────────────

  if (!/import\s+SwiftUI/.test(code)) {
    errors.push('Missing "import SwiftUI"');
  }

  // ── View conformance ──────────────────────────────────────────────────────

  if (!/(struct|class)\s+\w+\s*:\s*View/.test(code)) {
    errors.push('No View-conforming struct found — expected "struct MyView: View"');
  }

  // ── body computed property ────────────────────────────────────────────────

  if (!/var\s+body\s*:\s*some\s+View/.test(code)) {
    errors.push('Missing required "var body: some View" computed property');
  }

  // ── Balanced braces ───────────────────────────────────────────────────────

  let depth = 0;
  for (const ch of code) {
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth < 0) depth = 0; }
  }
  if (depth !== 0) errors.push(`Unbalanced braces (net depth: ${depth})`);

  // ── Common SwiftUI view modifiers ─────────────────────────────────────────

  const hasLayout = /VStack|HStack|ZStack|LazyVStack|LazyHStack|List|Form|NavigationView|NavigationStack/.test(code);
  if (!hasLayout) {
    warnings.push('No common SwiftUI layout container found (VStack, HStack, List, etc.)');
  }

  // ── @State on let ─────────────────────────────────────────────────────────

  if (/@State\s+let\s/.test(code)) {
    errors.push('@State properties must be declared as "var", not "let"');
  }

  // ── PreviewProvider ───────────────────────────────────────────────────────

  if (!/#Preview|PreviewProvider/.test(code)) {
    warnings.push('No preview (#Preview or PreviewProvider) found — Xcode Canvas will not render');
  }

  return { valid: errors.length === 0, errors, warnings };
}
