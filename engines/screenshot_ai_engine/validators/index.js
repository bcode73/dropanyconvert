/**
 * Output Validator Registry
 *
 * Dispatches to the correct framework validator.
 * Falls back to a generic text check for unsupported frameworks.
 */

import { validateHtml } from './html.js';
import { validateCss }  from './css.js';
import { validateReact } from './react.js';
import { validateFlutter } from './flutter.js';
import { validateSwiftUI } from './swiftui.js';

// ── Registry ──────────────────────────────────────────────────────────────────

const VALIDATORS = {
  html:              validateHtml,
  'html-css':        (code) => _combineHtmlCss(code),
  tailwind:          validateHtml,
  bootstrap:         validateHtml,
  react:             validateReact,
  nextjs:            validateReact,
  vue:               _validateVue,
  svelte:            _validateSvelte,
  angular:           _validateAngular,
  flutter:           validateFlutter,
  swiftui:           validateSwiftUI,
  'react-native':    validateReact,
  'jetpack-compose': _validateJetpackCompose,
  blazor:            _validateBlazor,
  alpine:            validateHtml,
  email:             validateHtml,
  svg:               _validateSvg,
  'css-grid':        (code) => _combineHtmlCss(code),
  wireframe:         _validateSvg,
  'component-tree':  _validateComponentTree,
};

/**
 * Validate generated code for a given framework.
 * @param {string} framework
 * @param {string} code
 * @returns {{ valid: boolean, errors: string[], warnings: string[], framework: string }}
 */
export function validateOutput(framework, code) {
  const validator = VALIDATORS[framework] ?? _genericCheck;
  const result = validator(code);
  return { ...result, framework };
}

/**
 * List frameworks with registered validators.
 * @returns {string[]}
 */
export function listValidatedFrameworks() {
  return Object.keys(VALIDATORS);
}

// ── Inline validators for frameworks without dedicated files ──────────────────

function _combineHtmlCss(code) {
  const htmlResult = validateHtml(code);
  const styleMatch = code.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  if (styleMatch) {
    const cssResult = validateCss(styleMatch[1]);
    return {
      valid:    htmlResult.valid && cssResult.valid,
      errors:   [...htmlResult.errors,   ...cssResult.errors.map(e => `[CSS] ${e}`)],
      warnings: [...htmlResult.warnings, ...cssResult.warnings.map(w => `[CSS] ${w}`)],
    };
  }
  return htmlResult;
}

function _validateVue(code) {
  const errors = [];
  const warnings = [];
  if (!/<template>/.test(code))  errors.push('Missing <template> block');
  if (!/<\/template>/.test(code)) errors.push('Unclosed <template> block');
  if (!/<script/.test(code))     warnings.push('No <script> block found');
  if (!/<style/.test(code))      warnings.push('No <style> block — component has no scoped styles');
  if (/<script>/.test(code) && !/<script\s+setup/.test(code)) {
    warnings.push('Consider using <script setup> (Composition API)');
  }
  return { valid: errors.length === 0, errors, warnings };
}

function _validateSvelte(code) {
  const errors = [];
  const warnings = [];
  if (!/<script/.test(code)) warnings.push('No <script> block');
  if (!/<style/.test(code))  warnings.push('No <style> block');
  const hasTemplate = /<(div|main|section|header|footer|nav|article|span|p|h\d|button|input|form)[^>]*>/i.test(code);
  if (!hasTemplate) errors.push('No HTML template content found');
  return { valid: errors.length === 0, errors, warnings };
}

function _validateAngular(code) {
  const errors = [];
  const warnings = [];
  if (!/@Component\s*\(/.test(code))    errors.push('Missing @Component decorator');
  if (!/standalone\s*:\s*true/.test(code)) warnings.push('Consider using standalone: true (Angular 17+)');
  if (!/export\s+class/.test(code))     errors.push('Missing exported component class');
  if (!/template[:\s]/.test(code) && !/@Component/.test(code)) warnings.push('No template defined');
  return { valid: errors.length === 0, errors, warnings };
}

function _validateJetpackCompose(code) {
  const errors = [];
  const warnings = [];
  if (!/import\s+androidx\.compose/.test(code)) errors.push('Missing Jetpack Compose import');
  if (!/@Composable/.test(code)) errors.push('No @Composable function found');
  if (!/fun\s+[A-Z]\w+\s*\(/.test(code)) warnings.push('Composable function name should start with uppercase');
  let depth = 0;
  for (const ch of code) {
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth < 0) depth = 0; }
  }
  if (depth !== 0) errors.push(`Unbalanced braces (net depth: ${depth})`);
  return { valid: errors.length === 0, errors, warnings };
}

function _validateBlazor(code) {
  const errors = [];
  const warnings = [];
  const hasMarkup = /<[a-z]/i.test(code);
  if (!hasMarkup) errors.push('No HTML markup found in Blazor component');
  if (/@code\s*\{/.test(code)) {
    let depth = 0;
    const codeBlock = code.slice(code.indexOf('@code'));
    for (const ch of codeBlock) {
      if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth === 0) break; if (depth < 0) { errors.push('Unbalanced @code block'); break; } }
    }
  }
  return { valid: errors.length === 0, errors, warnings };
}

function _validateSvg(code) {
  const errors = [];
  const warnings = [];
  if (!/<svg/.test(code))  errors.push('No <svg> root element found');
  if (!/<\/svg>/.test(code)) errors.push('Unclosed <svg> element');
  if (!/viewBox=/.test(code)) warnings.push('Missing viewBox attribute — SVG may not scale correctly');
  if (!/xmlns=/.test(code)) warnings.push('Missing xmlns attribute on <svg>');
  return { valid: errors.length === 0, errors, warnings };
}

function _validateComponentTree(code) {
  const errors = [];
  const warnings = [];
  try {
    const parsed = JSON.parse(code);
    if (typeof parsed !== 'object' || !parsed.name) {
      errors.push('Root node must be an object with a "name" property');
    }
    if (!parsed.type) warnings.push('Root node missing "type" property');
    if (!Array.isArray(parsed.children)) warnings.push('Root node missing "children" array');
  } catch (e) {
    errors.push(`Invalid JSON: ${e.message}`);
  }
  return { valid: errors.length === 0, errors, warnings };
}

function _genericCheck(code) {
  const errors = [];
  const warnings = [];
  if (!code || code.trim().length < 10) errors.push('Output is empty or too short');
  if (code.length > 500_000) warnings.push('Output is very large (>500KB) — may cause browser performance issues');
  return { valid: errors.length === 0, errors, warnings };
}
