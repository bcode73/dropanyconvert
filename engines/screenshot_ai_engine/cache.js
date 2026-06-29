/**
 * Screenshot AI — Cache Layer
 *
 * Deterministic cache key design. In-memory store for architecture phase;
 * replace _store with Redis/KV at server runtime.
 *
 * Cache key: sha256(imageHash + framework + promptVersion + provider + modelVersion)
 * All fields must be known before lookup — no partial keys.
 */

import { isCurrentVersion } from './prompts/index.js';

// ── Key builder ───────────────────────────────────────────────────────────────

/**
 * Build a deterministic cache key from generation parameters.
 * Uses djb2 hash (matches DropAnyConvert content-engine convention) since
 * SubtleCrypto is async and unavailable in all environments.
 *
 * @param {object} p
 * @param {string} p.imageHash      — djb2 hash of the image data URI
 * @param {string} p.framework      — target framework slug
 * @param {string} p.promptVersion  — prompt template version (e.g. "v1.0")
 * @param {string} p.provider       — AI provider slug
 * @param {string} p.modelVersion   — model identifier (e.g. "deepseek-vl2")
 * @returns {string}
 */
export function buildCacheKey({ imageHash, framework, promptVersion, provider, modelVersion }) {
  const raw = `${imageHash}|${framework}|${promptVersion}|${provider}|${modelVersion}`;
  return `ai:${_djb2(raw)}`;
}

/**
 * Compute djb2 hash of an arbitrary string (matches content-engine.js convention).
 * @param {string} str
 * @returns {string} hex string
 */
export function hashString(str) {
  return _djb2(str);
}

/**
 * Compute djb2 hash of image data (base64 URI or binary string).
 * For large images, sample first 64KB + last 1KB to keep hashing fast.
 * @param {string} imageData
 * @returns {string}
 */
export function hashImage(imageData) {
  const SAMPLE = 64 * 1024;
  const sample = imageData.length > SAMPLE + 1024
    ? imageData.slice(0, SAMPLE) + imageData.slice(-1024)
    : imageData;
  return _djb2(sample);
}

function _djb2(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
    h = h >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

// ── Cache entry ───────────────────────────────────────────────────────────────

/**
 * @typedef {object} CacheEntry
 * @property {string} key
 * @property {string} code          — generated output code
 * @property {string} framework
 * @property {string} promptVersion
 * @property {string} provider
 * @property {string} modelVersion
 * @property {number} createdAt     — unix ms
 * @property {number} expiresAt     — unix ms
 * @property {number} hitCount
 * @property {object} usage         — token/cost metadata
 */

// ── In-memory store (replace with Redis at runtime) ───────────────────────────

const _store = new Map(); // key → CacheEntry

export const CACHE_TTL_MS = {
  html:              24 * 60 * 60 * 1000,  // 24h — stable output
  tailwind:          24 * 60 * 60 * 1000,
  bootstrap:         24 * 60 * 60 * 1000,
  react:             12 * 60 * 60 * 1000,  // 12h — framework-specific
  nextjs:            12 * 60 * 60 * 1000,
  vue:               12 * 60 * 60 * 1000,
  svelte:            12 * 60 * 60 * 1000,
  flutter:            6 * 60 * 60 * 1000,  // 6h — mobile, changes more
  swiftui:            6 * 60 * 60 * 1000,
  'react-native':     6 * 60 * 60 * 1000,
  'jetpack-compose':  6 * 60 * 60 * 1000,
  wireframe:         48 * 60 * 60 * 1000,  // 48h — layout rarely changes
  'component-tree':  48 * 60 * 60 * 1000,
  DEFAULT:           12 * 60 * 60 * 1000,
};

// ── Cache operations ──────────────────────────────────────────────────────────

/**
 * Look up a cache entry.
 * Returns null on miss, expired entry, or stale prompt version.
 * @param {string} key
 * @param {string} framework      — used for prompt version staleness check
 * @returns {CacheEntry|null}
 */
export function cacheGet(key, framework) {
  const entry = _store.get(key);
  if (!entry) return null;

  // Expired?
  if (Date.now() > entry.expiresAt) {
    _store.delete(key);
    return null;
  }

  // Stale prompt version?
  if (!isCurrentVersion(framework, entry.promptVersion)) {
    _store.delete(key);
    return null;
  }

  entry.hitCount++;
  return entry;
}

/**
 * Store a cache entry.
 * @param {string}     key
 * @param {object}     data   — { code, framework, promptVersion, provider, modelVersion, usage }
 * @returns {CacheEntry}
 */
export function cacheSet(key, data) {
  const ttl = CACHE_TTL_MS[data.framework] ?? CACHE_TTL_MS.DEFAULT;
  const entry = {
    key,
    code:          data.code,
    framework:     data.framework,
    promptVersion: data.promptVersion,
    provider:      data.provider,
    modelVersion:  data.modelVersion,
    createdAt:     Date.now(),
    expiresAt:     Date.now() + ttl,
    hitCount:      0,
    usage:         data.usage ?? {},
  };
  _store.set(key, entry);
  return entry;
}

/**
 * Invalidate a specific cache entry.
 * @param {string} key
 * @returns {boolean} true if entry existed
 */
export function cacheInvalidate(key) {
  return _store.delete(key);
}

/**
 * Invalidate all entries for a given framework (e.g. after prompt bump).
 * @param {string} framework
 * @returns {number} entries removed
 */
export function cacheInvalidateFramework(framework) {
  let count = 0;
  for (const [k, entry] of _store) {
    if (entry.framework === framework) { _store.delete(k); count++; }
  }
  return count;
}

/**
 * Remove all expired entries. Call periodically.
 * @returns {number} entries removed
 */
export function cachePurgeExpired() {
  const now = Date.now();
  let count = 0;
  for (const [k, entry] of _store) {
    if (now > entry.expiresAt) { _store.delete(k); count++; }
  }
  return count;
}

/**
 * Cache statistics for the observability / admin dashboard.
 * @returns {object}
 */
export function cacheStats() {
  const now = Date.now();
  let valid = 0, expired = 0, totalHits = 0;
  const byFramework = {};
  for (const entry of _store.values()) {
    if (now > entry.expiresAt) { expired++; continue; }
    valid++;
    totalHits += entry.hitCount;
    byFramework[entry.framework] = (byFramework[entry.framework] ?? 0) + 1;
  }
  return {
    total:      _store.size,
    valid,
    expired,
    totalHits,
    byFramework,
    hitRate:    totalHits > 0 ? (totalHits / (totalHits + valid)) : 0,
  };
}
