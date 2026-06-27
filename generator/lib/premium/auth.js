/**
 * Phase 21 — Authentication Foundation
 *
 * Provider-agnostic auth adapter interface.
 * No SDK integration — architecture only.
 * Concrete providers plug in via the adapter contract.
 */

// ── Supported provider IDs ─────────────────────────────────────────────────

export const AUTH_PROVIDERS = {
  EMAIL:  'email',
  GOOGLE: 'google',
  APPLE:  'apple',
  GITHUB: 'github',
};

// ── Token types ────────────────────────────────────────────────────────────

export const TOKEN_TYPE = {
  ACCESS:  'access',
  REFRESH: 'refresh',
  MAGIC:   'magic',  // passwordless email link
};

// ── Auth error codes ───────────────────────────────────────────────────────

export const AUTH_ERROR = {
  INVALID_CREDENTIALS:  'invalid_credentials',
  EMAIL_NOT_VERIFIED:   'email_not_verified',
  ACCOUNT_DISABLED:     'account_disabled',
  PROVIDER_ERROR:       'provider_error',
  TOKEN_EXPIRED:        'token_expired',
  RATE_LIMITED:         'rate_limited',
  USER_EXISTS:          'user_exists',
};

// ── Auth session shape (not stored — passed in memory) ────────────────────

export function createAuthSession(userId, provider, { accessToken, refreshToken, expiresAt }) {
  return {
    userId,
    provider,
    accessToken,
    refreshToken,
    expiresAt,
    createdAt: new Date().toISOString(),
  };
}

// ── Provider adapter interface ─────────────────────────────────────────────
// Each concrete adapter must implement this interface.

export const AUTH_ADAPTER_INTERFACE = {
  id:          '',   // must be one of AUTH_PROVIDERS values

  // Initiate OAuth flow or send magic link.
  // Returns { redirectUrl } for OAuth, { sent: true } for email.
  initiateAuth:    async (params) => { throw new Error('not implemented'); },

  // Exchange OAuth callback code or verify magic token.
  // Returns createAuthSession(…) result.
  handleCallback:  async (params) => { throw new Error('not implemented'); },

  // Refresh access token using refresh token.
  // Returns { accessToken, expiresAt }.
  refreshToken:    async (refreshToken) => { throw new Error('not implemented'); },

  // Revoke session (logout from provider).
  revokeToken:     async (token) => { throw new Error('not implemented'); },

  // Validate a token and return { valid, userId, expiresAt }.
  validateToken:   async (token) => { throw new Error('not implemented'); },
};

// ── Provider registry ─────────────────────────────────────────────────────
// Adapters register here at runtime.

const _registry = new Map();

export function registerAuthProvider(adapter) {
  if (!adapter.id || !AUTH_PROVIDERS[adapter.id.toUpperCase()]) {
    throw new Error(`Unknown auth provider: ${adapter.id}`);
  }
  _registry.set(adapter.id, adapter);
}

export function getAuthProvider(providerId) {
  return _registry.get(providerId) || null;
}

export function listAuthProviders() {
  return [..._registry.keys()];
}

// ── Email/password helpers (adapter-independent) ──────────────────────────

export const PASSWORD_RULES = {
  minLength:        8,
  requireUppercase: true,
  requireNumber:    true,
  requireSymbol:    false,
};

export function validatePassword(password) {
  const errors = [];
  if (password.length < PASSWORD_RULES.minLength)
    errors.push(`Minimum ${PASSWORD_RULES.minLength} characters`);
  if (PASSWORD_RULES.requireUppercase && !/[A-Z]/.test(password))
    errors.push('At least one uppercase letter');
  if (PASSWORD_RULES.requireNumber && !/[0-9]/.test(password))
    errors.push('At least one number');
  return errors;
}
