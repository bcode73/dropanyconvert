/**
 * Output validator — Flutter / Dart
 *
 * Static analysis only. No external dependencies.
 */

const REQUIRED_IMPORT = "import 'package:flutter/material.dart'";

/**
 * @param {string} code
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateFlutter(code) {
  const errors = [];
  const warnings = [];

  if (!code || typeof code !== 'string') {
    return { valid: false, errors: ['Input is empty or not a string'], warnings };
  }

  // ── Required import ───────────────────────────────────────────────────────

  if (!code.includes(REQUIRED_IMPORT)) {
    errors.push(`Missing required import: "${REQUIRED_IMPORT}"`);
  }

  // ── StatelessWidget or StatefulWidget ────────────────────────────────────

  const hasStateless = /extends\s+StatelessWidget/.test(code);
  const hasStateful  = /extends\s+StatefulWidget/.test(code);
  if (!hasStateless && !hasStateful) {
    errors.push('No Widget class found — expected "extends StatelessWidget" or "extends StatefulWidget"');
  }

  // ── build() method ────────────────────────────────────────────────────────

  if (!/Widget\s+build\s*\(\s*BuildContext/.test(code)) {
    errors.push('Missing required "Widget build(BuildContext context)" method');
  }

  // ── Balanced braces ───────────────────────────────────────────────────────

  let depth = 0;
  for (const ch of code) {
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth < 0) depth = 0; }
  }
  if (depth !== 0) errors.push(`Unbalanced braces (net depth: ${depth})`);

  // ── Balanced parentheses ──────────────────────────────────────────────────

  let parenDepth = 0;
  for (const ch of code) {
    if (ch === '(') parenDepth++;
    else if (ch === ')') { parenDepth--; if (parenDepth < 0) parenDepth = 0; }
  }
  if (parenDepth !== 0) errors.push(`Unbalanced parentheses (net depth: ${parenDepth})`);

  // ── Widget tree basics ────────────────────────────────────────────────────

  if (!code.includes('Scaffold(') && !code.includes('MaterialApp(') && !code.includes('Container(') && !code.includes('Column(') && !code.includes('Row(')) {
    warnings.push('No common Flutter layout widget found (Scaffold, Column, Row, Container)');
  }

  // ── const constructors ────────────────────────────────────────────────────

  const newKeyword = (code.match(/\bnew\s+[A-Z]/g) ?? []).length;
  if (newKeyword > 0) {
    warnings.push(`${newKeyword} use(s) of "new" keyword — not required in modern Dart`);
  }

  // ── Hardcoded colors ──────────────────────────────────────────────────────

  const hexColors = (code.match(/0xFF[0-9A-Fa-f]{6}/g) ?? []).length;
  if (hexColors > 8) {
    warnings.push(`${hexColors} hardcoded hex colors — consider using a ThemeData color scheme`);
  }

  return { valid: errors.length === 0, errors, warnings };
}
