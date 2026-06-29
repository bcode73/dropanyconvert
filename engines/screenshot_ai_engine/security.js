/**
 * Screenshot AI — Security Layer
 *
 * All safeguards are pure functions. No I/O, no secrets.
 * Returns { safe: boolean, reason: string|null } on every check.
 */

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_IMAGE_BYTES       = 10 * 1024 * 1024;  // 10 MB
const MAX_IMAGE_DIMENSION   = 8192;               // px
const MIN_IMAGE_DIMENSION   = 16;                 // px

const ALLOWED_MIME_TYPES = new Set([
  'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif',
]);

// ── Upload validation ─────────────────────────────────────────────────────────

/**
 * Validate image MIME type.
 * @param {string} mimeType
 * @returns {{ safe: boolean, reason: string|null }}
 */
export function validateMimeType(mimeType) {
  if (!mimeType) return { safe: false, reason: 'No MIME type provided' };
  const normalized = mimeType.split(';')[0].trim().toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(normalized)) {
    return { safe: false, reason: `Rejected MIME type: "${normalized}". Allowed: ${[...ALLOWED_MIME_TYPES].join(', ')}` };
  }
  return { safe: true, reason: null };
}

/**
 * Validate image size (base64 data URI length → approximate byte count).
 * @param {string|number} sizeOrDataUri  — byte count or base64 data URI
 * @returns {{ safe: boolean, reason: string|null }}
 */
export function validateImageSize(sizeOrDataUri) {
  const bytes = typeof sizeOrDataUri === 'number'
    ? sizeOrDataUri
    : Math.ceil((sizeOrDataUri.length * 3) / 4);
  if (bytes > MAX_IMAGE_BYTES) {
    return { safe: false, reason: `Image too large: ${(bytes / 1024 / 1024).toFixed(1)} MB (max ${MAX_IMAGE_BYTES / 1024 / 1024} MB)` };
  }
  return { safe: true, reason: null };
}

/**
 * Validate image dimensions.
 * @param {number} width
 * @param {number} height
 * @returns {{ safe: boolean, reason: string|null }}
 */
export function validateImageDimensions(width, height) {
  if (width < MIN_IMAGE_DIMENSION || height < MIN_IMAGE_DIMENSION) {
    return { safe: false, reason: `Image too small: ${width}×${height}px (min ${MIN_IMAGE_DIMENSION}px)` };
  }
  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    return { safe: false, reason: `Image too large: ${width}×${height}px (max ${MAX_IMAGE_DIMENSION}px)` };
  }
  return { safe: true, reason: null };
}

// ── Malicious SVG detection ───────────────────────────────────────────────────

const SVG_DANGEROUS_PATTERNS = [
  /<script[\s>]/i,
  /javascript\s*:/i,
  /on\w+\s*=/i,             // event handlers (onload, onerror, etc.)
  /<foreignObject/i,        // HTML injection vector
  /xlink:href\s*=\s*["']data:text\/html/i,
  /<!ENTITY/i,              // XXE
  /<\?xml-stylesheet/i,
];

/**
 * Detect malicious SVG content in image data or generated output.
 * @param {string} content
 * @returns {{ safe: boolean, reason: string|null }}
 */
export function validateSvgSafety(content) {
  for (const pattern of SVG_DANGEROUS_PATTERNS) {
    if (pattern.test(content)) {
      return { safe: false, reason: `Potentially malicious SVG pattern detected: ${pattern}` };
    }
  }
  return { safe: true, reason: null };
}

// ── Prompt injection filtering ────────────────────────────────────────────────

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions?/i,
  /you\s+are\s+now\s+(?:an?\s+)?(?:ai|assistant|chatgpt|gpt|claude)/i,
  /system\s*prompt/i,
  /jailbreak/i,
  /act\s+as\s+(?:a\s+)?(?:developer|human|user|admin)/i,
  /reveal\s+(your\s+)?(prompt|instructions?|system)/i,
  /\bDAN\b/,   // "Do Anything Now" jailbreak
];

/**
 * Scan a user-supplied extra prompt for injection attempts.
 * @param {string} prompt
 * @returns {{ safe: boolean, reason: string|null }}
 */
export function filterPromptInjection(prompt) {
  if (!prompt) return { safe: true, reason: null };
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(prompt)) {
      return { safe: false, reason: 'Prompt contains instruction injection attempt' };
    }
  }
  if (prompt.length > 2000) {
    return { safe: false, reason: 'Extra prompt too long (max 2000 characters)' };
  }
  return { safe: true, reason: null };
}

// ── Generated code sanitization ───────────────────────────────────────────────

const CODE_DANGEROUS_PATTERNS = [
  { pattern: /<script\b[^>]*>[\s\S]*?<\/script>/gi, label: 'inline <script> block' },
  { pattern: /javascript\s*:/gi,                    label: 'javascript: URI' },
  { pattern: /on\w+\s*=\s*["'][^"']*["']/gi,        label: 'inline event handler' },
  { pattern: /eval\s*\(/gi,                         label: 'eval() call' },
  { pattern: /document\.write\s*\(/gi,              label: 'document.write()' },
  { pattern: /innerHTML\s*=/gi,                     label: 'innerHTML assignment' },
];

/**
 * Sanitize AI-generated code before returning to the client.
 * Removes dangerous patterns, reports what was removed.
 *
 * @param {string} code
 * @param {string} framework
 * @returns {{ code: string, sanitized: boolean, removed: string[] }}
 */
export function sanitizeGeneratedCode(code, framework) {
  // React/Vue/Angular/Svelte legitimately use innerHTML and event handlers
  const isComponentFramework = ['react', 'nextjs', 'vue', 'svelte', 'angular', 'react-native'].includes(framework);

  let result = code;
  const removed = [];

  for (const { pattern, label } of CODE_DANGEROUS_PATTERNS) {
    // Skip event handler check for component frameworks (they use onClick={} etc.)
    if (isComponentFramework && label === 'inline event handler') continue;
    if (isComponentFramework && label === 'innerHTML assignment') continue;

    if (pattern.test(result)) {
      removed.push(label);
      result = result.replace(pattern, `/* [REMOVED: ${label}] */`);
    }
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
  }

  return {
    code:      result,
    sanitized: removed.length > 0,
    removed,
  };
}

// ── Rate limit hook (stub) ────────────────────────────────────────────────────

/**
 * Rate limit hook — architecture stub.
 * Real implementation checks per-user request counts via KV store.
 *
 * @param {string} userId
 * @param {string} plan
 * @returns {{ allowed: boolean, retryAfterMs: number|null }}
 */
export function checkRateLimit(userId, plan) {
  // Limits (requests/hour): free=0, pro=20, business=200
  void userId; void plan;
  return { allowed: true, retryAfterMs: null };
}

// ── Combined upload check ─────────────────────────────────────────────────────

/**
 * Run all upload-time security checks.
 * @param {{ mimeType, imageData, width, height }} params
 * @returns {{ safe: boolean, reason: string|null }}
 */
export function validateUpload({ mimeType, imageData, width, height }) {
  const checks = [
    validateMimeType(mimeType),
    imageData ? validateImageSize(imageData) : { safe: true, reason: null },
    width && height ? validateImageDimensions(width, height) : { safe: true, reason: null },
    mimeType === 'image/svg+xml' && imageData ? validateSvgSafety(imageData) : { safe: true, reason: null },
  ];
  const failed = checks.find(c => !c.safe);
  return failed ?? { safe: true, reason: null };
}
