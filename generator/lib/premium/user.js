/**
 * Phase 21 — User Model
 *
 * Canonical user schema definition.
 * No persistence layer — schema contract only.
 */

import { AUTH_PROVIDERS } from './auth.js';
import { PLAN_IDS } from './plans.js';

// ── User shape ─────────────────────────────────────────────────────────────

export function createUser(overrides = {}) {
  const now = new Date().toISOString();
  return {
    // Identity
    id:           overrides.id          || null,
    email:        overrides.email       || null,
    emailVerified: overrides.emailVerified ?? false,

    // Profile
    profile: {
      displayName:  overrides.profile?.displayName  || null,
      avatarUrl:    overrides.profile?.avatarUrl    || null,
      bio:          overrides.profile?.bio          || null,
      website:      overrides.profile?.website      || null,
      locale:       overrides.profile?.locale       || 'en',
      timezone:     overrides.profile?.timezone     || 'UTC',
    },

    // Auth
    authProviders: overrides.authProviders || [],  // [{ provider, providerId, linkedAt }]

    // Subscription
    plan: {
      id:          overrides.plan?.id          || PLAN_IDS.FREE,
      status:      overrides.plan?.status      || 'active',  // active | past_due | cancelled | trialing
      trialEndsAt: overrides.plan?.trialEndsAt || null,
      renewsAt:    overrides.plan?.renewsAt    || null,
      cancelledAt: overrides.plan?.cancelledAt || null,
      paymentRef:  overrides.plan?.paymentRef  || null,  // external subscription ID
    },

    // Usage counters (reset periodically)
    usage: {
      conversionsToday:    overrides.usage?.conversionsToday    || 0,
      conversionsThisMonth: overrides.usage?.conversionsThisMonth || 0,
      storageUsedBytes:    overrides.usage?.storageUsedBytes    || 0,
      cloudJobsTotal:      overrides.usage?.cloudJobsTotal      || 0,
      cloudJobsThisMonth:  overrides.usage?.cloudJobsThisMonth  || 0,
      apiCallsThisMonth:   overrides.usage?.apiCallsThisMonth   || 0,
      lastResetDaily:      overrides.usage?.lastResetDaily      || null,
      lastResetMonthly:    overrides.usage?.lastResetMonthly    || null,
    },

    // API Keys
    apiKeys: overrides.apiKeys || [],  // [{ id, prefix, hash, label, createdAt, lastUsedAt, scopes }]

    // Favorites (tool slugs)
    favorites: overrides.favorites || [],

    // Conversion history references (not full records — IDs only)
    history: overrides.history || [],  // [{ jobId, toolSlug, at, status }]

    // Saved conversions (user bookmarked outputs)
    savedConversions: overrides.savedConversions || [],  // [{ id, jobId, label, savedAt, expiresAt }]

    // Preferences
    preferences: {
      theme:              overrides.preferences?.theme              || 'auto',
      emailNotifications: overrides.preferences?.emailNotifications ?? true,
      marketingEmails:    overrides.preferences?.marketingEmails    ?? false,
      defaultLang:        overrides.preferences?.defaultLang        || 'en',
      downloadHistory:    overrides.preferences?.downloadHistory    ?? true,
      autoDelete:         overrides.preferences?.autoDelete         ?? false,
      autoDeleteDays:     overrides.preferences?.autoDeleteDays     || 30,
    },

    // Audit
    createdAt:  overrides.createdAt  || now,
    updatedAt:  overrides.updatedAt  || now,
    lastLoginAt: overrides.lastLoginAt || null,
    deletedAt:  overrides.deletedAt  || null,  // soft delete
  };
}

// ── API Key model ──────────────────────────────────────────────────────────

export const API_KEY_SCOPES = {
  CONVERT:   'convert',    // submit conversion jobs
  READ:      'read',       // read job status/results
  BATCH:     'batch',      // batch submissions
  WEBHOOK:   'webhook',    // manage webhooks
  ADMIN:     'admin',      // full access (not for end users)
};

export function createApiKey({ label, scopes = [API_KEY_SCOPES.CONVERT, API_KEY_SCOPES.READ] }) {
  const id = `key_${Date.now()}`;
  return {
    id,
    prefix:     id.slice(0, 8),
    hash:       null,       // filled after hashing the actual secret
    label,
    scopes,
    createdAt:  new Date().toISOString(),
    lastUsedAt: null,
    revokedAt:  null,
  };
}

// ── Auth provider link ─────────────────────────────────────────────────────

export function createAuthProviderLink(provider, providerId) {
  if (!Object.values(AUTH_PROVIDERS).includes(provider)) {
    throw new Error(`Unknown provider: ${provider}`);
  }
  return { provider, providerId, linkedAt: new Date().toISOString() };
}

// ── Field validators ───────────────────────────────────────────────────────

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateDisplayName(name) {
  return typeof name === 'string' && name.trim().length >= 2 && name.trim().length <= 50;
}
