/**
 * Output validator — HTML
 *
 * Static analysis only. No external dependencies.
 * Returns { valid: boolean, errors: string[], warnings: string[] }.
 */

// Void elements (self-closing, no end tag required)
const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

// Block elements that cannot be nested inside inline elements
const BLOCK_ELEMENTS = new Set([
  'div', 'p', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'thead', 'tbody',
  'tfoot', 'section', 'article', 'aside', 'header', 'footer', 'main', 'nav',
  'figure', 'figcaption', 'blockquote', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
]);

const INLINE_ELEMENTS = new Set([
  'span', 'a', 'strong', 'em', 'b', 'i', 'u', 's', 'small', 'label',
  'abbr', 'cite', 'code', 'kbd', 'mark', 'q', 'sub', 'sup',
]);

/**
 * @param {string} html
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateHtml(html) {
  const errors = [];
  const warnings = [];

  if (!html || typeof html !== 'string') {
    return { valid: false, errors: ['Input is empty or not a string'], warnings };
  }

  // ── Balanced tags ─────────────────────────────────────────────────────────

  const tagPattern = /<(\/?)([\w-]+)([^>]*)>/g;
  const stack = [];
  const ids = [];
  let match;

  while ((match = tagPattern.exec(html)) !== null) {
    const [, closing, tagName, attrs] = match;
    const tag = tagName.toLowerCase();

    if (VOID_ELEMENTS.has(tag)) continue;

    if (!closing) {
      // Opening tag — check for id
      const idMatch = attrs.match(/\bid=["']([^"']+)["']/);
      if (idMatch) ids.push(idMatch[1]);

      // Self-closing shorthand (e.g. <div />)
      if (attrs.trimEnd().endsWith('/')) continue;

      stack.push(tag);
    } else {
      // Closing tag
      if (stack.length === 0) {
        errors.push(`Unexpected closing tag </${tag}> with no matching opening tag`);
      } else if (stack[stack.length - 1] !== tag) {
        const expected = stack[stack.length - 1];
        errors.push(`Mismatched tags: expected </${expected}>, got </${tag}>`);
        // Pop until we find a match to recover
        const idx = stack.lastIndexOf(tag);
        if (idx !== -1) stack.splice(idx);
        else stack.pop();
      } else {
        stack.pop();
      }
    }
  }

  for (const unclosed of stack) {
    errors.push(`Unclosed tag: <${unclosed}>`);
  }

  // ── Duplicate IDs ─────────────────────────────────────────────────────────

  const idCounts = {};
  for (const id of ids) idCounts[id] = (idCounts[id] ?? 0) + 1;
  for (const [id, count] of Object.entries(idCounts)) {
    if (count > 1) errors.push(`Duplicate id="${id}" (found ${count} times)`);
  }

  // ── Invalid nesting: block inside inline ──────────────────────────────────

  const nestPattern = /<(span|a|strong|em|b|i|label)[^>]*>([\s\S]*?)<\/\1>/gi;
  while ((match = nestPattern.exec(html)) !== null) {
    const inner = match[2];
    const innerTag = inner.match(/<(\w+)/)?.[1]?.toLowerCase();
    if (innerTag && BLOCK_ELEMENTS.has(innerTag)) {
      warnings.push(`Block element <${innerTag}> nested inside inline element <${match[1].toLowerCase()}>`);
    }
  }

  // ── Empty required attributes ─────────────────────────────────────────────

  const imgWithoutAlt = html.match(/<img(?![^>]*\balt=)[^>]*>/gi);
  if (imgWithoutAlt?.length) {
    warnings.push(`${imgWithoutAlt.length} <img> element(s) missing alt attribute`);
  }

  const aWithoutHref = html.match(/<a(?![^>]*\bhref=)[^>]*>/gi);
  if (aWithoutHref?.length) {
    warnings.push(`${aWithoutHref.length} <a> element(s) missing href attribute`);
  }

  return { valid: errors.length === 0, errors, warnings };
}
