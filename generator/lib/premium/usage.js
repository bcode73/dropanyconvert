/**
 * Phase 21 — Usage Tracking Service
 *
 * Interface and data model for tracking per-user consumption.
 * Provider-independent. No persistence — interface contract only.
 */

import { FEATURE, getPlanFeature, exceedsLimit } from './plans.js';

// ── Usage counter keys ─────────────────────────────────────────────────────

export const USAGE_KEY = {
  CONVERSIONS_TODAY:     'conversionsToday',
  CONVERSIONS_MONTH:     'conversionsThisMonth',
  STORAGE_BYTES:         'storageUsedBytes',
  CLOUD_JOBS_TOTAL:      'cloudJobsTotal',
  CLOUD_JOBS_MONTH:      'cloudJobsThisMonth',
  API_CALLS_MONTH:       'apiCallsThisMonth',
};

// ── Usage period helpers ───────────────────────────────────────────────────

export function getUtcDay() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function getUtcMonth() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

// ── Usage snapshot model ───────────────────────────────────────────────────

export function createUsageSnapshot(userId, planId, rawUsage) {
  return {
    userId,
    planId,
    period: {
      day:   getUtcDay(),
      month: getUtcMonth(),
    },
    counters: {
      [USAGE_KEY.CONVERSIONS_TODAY]:  rawUsage[USAGE_KEY.CONVERSIONS_TODAY]  || 0,
      [USAGE_KEY.CONVERSIONS_MONTH]:  rawUsage[USAGE_KEY.CONVERSIONS_MONTH]  || 0,
      [USAGE_KEY.STORAGE_BYTES]:      rawUsage[USAGE_KEY.STORAGE_BYTES]      || 0,
      [USAGE_KEY.CLOUD_JOBS_TOTAL]:   rawUsage[USAGE_KEY.CLOUD_JOBS_TOTAL]   || 0,
      [USAGE_KEY.CLOUD_JOBS_MONTH]:   rawUsage[USAGE_KEY.CLOUD_JOBS_MONTH]   || 0,
      [USAGE_KEY.API_CALLS_MONTH]:    rawUsage[USAGE_KEY.API_CALLS_MONTH]    || 0,
    },
    limits: {
      dailyConversions:   getPlanFeature(planId, FEATURE.DAILY_CONVERSIONS),
      monthlyConversions: getPlanFeature(planId, FEATURE.MONTHLY_CONVERSIONS),
      storageGb:          getPlanFeature(planId, FEATURE.STORAGE_GB),
      batchLimit:         getPlanFeature(planId, FEATURE.BATCH_LIMIT),
    },
    computed: {
      dailyRemaining:   Math.max(0, getPlanFeature(planId, FEATURE.DAILY_CONVERSIONS) - (rawUsage[USAGE_KEY.CONVERSIONS_TODAY] || 0)),
      monthlyRemaining: Math.max(0, getPlanFeature(planId, FEATURE.MONTHLY_CONVERSIONS) - (rawUsage[USAGE_KEY.CONVERSIONS_MONTH] || 0)),
      storageUsedGb:    ((rawUsage[USAGE_KEY.STORAGE_BYTES] || 0) / (1024 ** 3)).toFixed(3),
      dailyPct:         Math.min(100, Math.round(((rawUsage[USAGE_KEY.CONVERSIONS_TODAY] || 0) / Math.max(1, getPlanFeature(planId, FEATURE.DAILY_CONVERSIONS))) * 100)),
      monthlyPct:       Math.min(100, Math.round(((rawUsage[USAGE_KEY.CONVERSIONS_MONTH] || 0) / Math.max(1, getPlanFeature(planId, FEATURE.MONTHLY_CONVERSIONS))) * 100)),
    },
    generatedAt: new Date().toISOString(),
  };
}

// ── Gate check helpers ─────────────────────────────────────────────────────

export function checkConversionAllowed(planId, usage) {
  if (exceedsLimit(planId, FEATURE.DAILY_CONVERSIONS, usage[USAGE_KEY.CONVERSIONS_TODAY] || 0)) {
    return { allowed: false, reason: 'daily_limit_reached', upgradeNeeded: true };
  }
  if (exceedsLimit(planId, FEATURE.MONTHLY_CONVERSIONS, usage[USAGE_KEY.CONVERSIONS_MONTH] || 0)) {
    return { allowed: false, reason: 'monthly_limit_reached', upgradeNeeded: true };
  }
  return { allowed: true, reason: null, upgradeNeeded: false };
}

export function checkFileSizeAllowed(planId, fileSizeBytes) {
  const maxMb = getPlanFeature(planId, FEATURE.MAX_FILE_SIZE_MB);
  const fileMb = fileSizeBytes / (1024 * 1024);
  if (fileMb > maxMb) {
    return { allowed: false, reason: 'file_too_large', limitMb: maxMb, upgradeNeeded: true };
  }
  return { allowed: true, reason: null };
}

// ── Usage service interface ────────────────────────────────────────────────
// Concrete implementations (Redis, Firestore, Postgres…) implement this.

export const USAGE_SERVICE_INTERFACE = {
  // Returns current usage counters for a user
  getUsage:       async (userId) => { throw new Error('not implemented'); },

  // Increment a counter atomically
  increment:      async (userId, key, amount = 1) => { throw new Error('not implemented'); },

  // Reset daily counters (called by scheduler)
  resetDaily:     async (userId) => { throw new Error('not implemented'); },

  // Reset monthly counters (called by scheduler)
  resetMonthly:   async (userId) => { throw new Error('not implemented'); },

  // Add storage usage (bytes)
  addStorage:     async (userId, bytes) => { throw new Error('not implemented'); },

  // Remove storage usage (bytes, on file deletion)
  removeStorage:  async (userId, bytes) => { throw new Error('not implemented'); },
};
