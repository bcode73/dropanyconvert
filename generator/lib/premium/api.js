/**
 * Phase 21 — API Foundation
 *
 * REST API architecture: versioning, rate limiting, auth middleware,
 * usage middleware, response helpers, and error model.
 * No endpoint implementations — contract/schema only.
 */

// ── API versioning ─────────────────────────────────────────────────────────

export const API_VERSION = {
  V1: 'v1',
};

export const API_BASE = '/api/v1';

// ── HTTP status helpers ────────────────────────────────────────────────────

export const HTTP = {
  OK:                  200,
  CREATED:             201,
  ACCEPTED:            202,
  NO_CONTENT:          204,
  BAD_REQUEST:         400,
  UNAUTHORIZED:        401,
  FORBIDDEN:           403,
  NOT_FOUND:           404,
  METHOD_NOT_ALLOWED:  405,
  CONFLICT:            409,
  UNPROCESSABLE:       422,
  TOO_MANY_REQUESTS:   429,
  INTERNAL_ERROR:      500,
  SERVICE_UNAVAILABLE: 503,
};

// ── API error model ────────────────────────────────────────────────────────

export const API_ERROR = {
  INVALID_API_KEY:    { code: 'invalid_api_key',    status: HTTP.UNAUTHORIZED },
  MISSING_AUTH:       { code: 'missing_auth',       status: HTTP.UNAUTHORIZED },
  INSUFFICIENT_SCOPE: { code: 'insufficient_scope', status: HTTP.FORBIDDEN    },
  RATE_LIMITED:       { code: 'rate_limited',       status: HTTP.TOO_MANY_REQUESTS },
  QUOTA_EXCEEDED:     { code: 'quota_exceeded',     status: HTTP.FORBIDDEN    },
  PLAN_REQUIRED:      { code: 'plan_required',      status: HTTP.FORBIDDEN    },
  NOT_FOUND:          { code: 'not_found',          status: HTTP.NOT_FOUND    },
  VALIDATION_ERROR:   { code: 'validation_error',   status: HTTP.UNPROCESSABLE },
  INTERNAL_ERROR:     { code: 'internal_error',     status: HTTP.INTERNAL_ERROR },
  SERVICE_DOWN:       { code: 'service_down',       status: HTTP.SERVICE_UNAVAILABLE },
};

// ── Response envelope ─────────────────────────────────────────────────────

export function apiSuccess(data, meta = {}) {
  return {
    ok:   true,
    data,
    meta: {
      version:     API_VERSION.V1,
      generatedAt: new Date().toISOString(),
      ...meta,
    },
  };
}

export function apiError(error, details = null, requestId = null) {
  return {
    ok:        false,
    error:     error.code,
    message:   details || error.code,
    status:    error.status,
    requestId: requestId || null,
    meta: {
      version:     API_VERSION.V1,
      generatedAt: new Date().toISOString(),
    },
  };
}

export function apiPaginated(items, { page, perPage, total }) {
  return apiSuccess(items, {
    pagination: {
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
      hasNext:    page * perPage < total,
      hasPrev:    page > 1,
    },
  });
}

// ── Rate limit configuration ───────────────────────────────────────────────

export const RATE_LIMITS = {
  // unauthenticated public endpoints
  anonymous: {
    requests:  60,
    windowSec: 60,
  },
  // authenticated free-plan users
  free: {
    requests:  120,
    windowSec: 60,
  },
  // Pro plan
  pro: {
    requests:  600,
    windowSec: 60,
  },
  // Business plan
  business: {
    requests:  3000,
    windowSec: 60,
  },
};

// ── Middleware signatures (interface contracts) ────────────────────────────
// Implementations must follow these signatures.

export const MIDDLEWARE = {
  // Parse and validate Authorization header. Sets req.user or returns 401.
  auth:       '(req, res, next) => void',

  // Check API key against DB, set req.user and req.apiKey, or return 401.
  apiKey:     '(req, res, next) => void',

  // Check rate limit based on user plan. Returns 429 with Retry-After on breach.
  rateLimit:  '(req, res, next) => void',

  // Verify user plan has the required feature. Returns 403 on insufficient plan.
  requirePlan: '(minimumPlan) => (req, res, next) => void',

  // Increment usage counter after successful response.
  trackUsage: '(key, amount?) => (req, res, next) => void',

  // Log request/response for audit trail.
  audit:      '(req, res, next) => void',
};

// ── Endpoint route table (no implementations) ─────────────────────────────

export const API_ROUTES = {
  // Auth
  'POST /auth/login':            { auth: false, rateLimit: 'anonymous' },
  'POST /auth/register':         { auth: false, rateLimit: 'anonymous' },
  'POST /auth/logout':           { auth: true,  rateLimit: 'free'      },
  'POST /auth/refresh':          { auth: false, rateLimit: 'anonymous' },
  'POST /auth/magic-link':       { auth: false, rateLimit: 'anonymous' },
  'GET  /auth/me':               { auth: true,  rateLimit: 'free'      },

  // Users
  'GET  /users/me':              { auth: true,  rateLimit: 'free'      },
  'PUT  /users/me':              { auth: true,  rateLimit: 'free'      },
  'DELETE /users/me':            { auth: true,  rateLimit: 'free'      },
  'GET  /users/me/usage':        { auth: true,  rateLimit: 'free'      },
  'GET  /users/me/favorites':    { auth: true,  rateLimit: 'free'      },
  'POST /users/me/favorites':    { auth: true,  rateLimit: 'free'      },
  'DELETE /users/me/favorites/:slug': { auth: true, rateLimit: 'free'  },

  // Conversions
  'POST /convert':               { auth: true,  rateLimit: 'free',     usageKey: 'conversionsToday' },
  'GET  /jobs/:id':              { auth: true,  rateLimit: 'free'      },
  'GET  /jobs':                  { auth: true,  rateLimit: 'free'      },
  'DELETE /jobs/:id':            { auth: true,  rateLimit: 'free'      },
  'GET  /jobs/:id/download':     { auth: true,  rateLimit: 'free'      },

  // Subscriptions
  'GET  /subscription':          { auth: true,  rateLimit: 'free'      },
  'POST /subscription/checkout': { auth: true,  rateLimit: 'free'      },
  'POST /subscription/portal':   { auth: true,  rateLimit: 'free'      },
  'POST /subscription/cancel':   { auth: true,  rateLimit: 'free'      },

  // API Keys
  'GET  /api-keys':              { auth: true,  rateLimit: 'free',     plan: 'business' },
  'POST /api-keys':              { auth: true,  rateLimit: 'free',     plan: 'business' },
  'DELETE /api-keys/:id':        { auth: true,  rateLimit: 'free',     plan: 'business' },

  // Webhooks (provider callbacks — no auth middleware, signature verification only)
  'POST /webhooks/payment':      { auth: false, rateLimit: 'anonymous' },

  // Admin (separate auth)
  'GET  /admin/users':           { auth: 'admin', rateLimit: 'business' },
  'GET  /admin/jobs':            { auth: 'admin', rateLimit: 'business' },
  'GET  /admin/stats':           { auth: 'admin', rateLimit: 'business' },
};
