/**
 * Phase 21 — Storage Abstraction Layer
 *
 * Provider-agnostic file storage interface.
 * Supports: Local, S3, Cloudflare R2, Firebase Storage, Supabase Storage.
 * No SDK integration — adapter contract only.
 */

// ── Supported provider IDs ─────────────────────────────────────────────────

export const STORAGE_PROVIDER = {
  LOCAL:     'local',
  S3:        's3',
  R2:        'r2',
  FIREBASE:  'firebase',
  SUPABASE:  'supabase',
};

// ── Storage namespaces (bucket / prefix conventions) ──────────────────────

export const STORAGE_NAMESPACE = {
  UPLOADS:   'uploads',    // incoming user files (temporary)
  OUTPUTS:   'outputs',    // processed results (downloadable)
  AVATARS:   'avatars',    // user profile images
  EXPORTS:   'exports',    // batch export archives
};

// ── Storage metadata model ────────────────────────────────────────────────

export function createStorageRef({ provider, namespace, key, mimeType, sizeBytes, userId }) {
  return {
    provider,
    namespace,
    key,          // path within bucket/prefix
    mimeType,
    sizeBytes,
    userId,
    uploadedAt:   new Date().toISOString(),
    expiresAt:    null,      // null = permanent
    checksum:     null,      // SHA-256 hex, filled after upload
    publicUrl:    null,      // null for private files
    downloadUrl:  null,      // presigned / time-limited
  };
}

// ── Upload options ─────────────────────────────────────────────────────────

export function createUploadOptions({
  namespace     = STORAGE_NAMESPACE.UPLOADS,
  expiresIn     = 3600,    // seconds until presigned URL expires
  maxSizeBytes  = 25 * 1024 * 1024,
  mimeTypeAllow = [],      // empty = allow all
  encrypt       = true,
  public_       = false,
} = {}) {
  return { namespace, expiresIn, maxSizeBytes, mimeTypeAllow, encrypt, public: public_ };
}

// ── Storage adapter interface ─────────────────────────────────────────────
// Each concrete adapter must implement all methods.

export const STORAGE_ADAPTER_INTERFACE = {
  id: '',  // one of STORAGE_PROVIDER values

  // Generate a presigned upload URL. Returns { uploadUrl, key }.
  getUploadUrl:    async (userId, fileName, mimeType, opts) => { throw new Error('not implemented'); },

  // Generate a presigned download URL. Returns { downloadUrl, expiresAt }.
  getDownloadUrl:  async (ref, expiresIn) => { throw new Error('not implemented'); },

  // Copy a file within storage.
  copy:            async (srcRef, destNamespace, destKey) => { throw new Error('not implemented'); },

  // Delete a stored file.
  delete:          async (ref) => { throw new Error('not implemented'); },

  // List files for a user within a namespace.
  list:            async (userId, namespace, opts) => { throw new Error('not implemented'); },

  // Get file metadata (size, mimeType, etc.) without downloading.
  stat:            async (ref) => { throw new Error('not implemented'); },

  // Verify file integrity (compare checksum).
  verify:          async (ref, expectedChecksum) => { throw new Error('not implemented'); },

  // Purge all files for a user (GDPR deletion).
  purgeUser:       async (userId) => { throw new Error('not implemented'); },
};

// ── Adapter registry ──────────────────────────────────────────────────────

const _registry = new Map();

export function registerStorageAdapter(adapter) {
  if (!Object.values(STORAGE_PROVIDER).includes(adapter.id)) {
    throw new Error(`Unknown storage provider: ${adapter.id}`);
  }
  _registry.set(adapter.id, adapter);
}

export function getStorageAdapter(providerId) {
  return _registry.get(providerId) || null;
}

export function listStorageAdapters() {
  return [..._registry.keys()];
}

// ── Key helpers ────────────────────────────────────────────────────────────

export function buildStorageKey(userId, namespace, fileName) {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 128);
  return `${namespace}/${userId}/${Date.now()}_${safe}`;
}

export function buildAvatarKey(userId, ext = 'jpg') {
  return `${STORAGE_NAMESPACE.AVATARS}/${userId}/avatar.${ext}`;
}
