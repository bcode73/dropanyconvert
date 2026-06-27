/**
 * Phase 21 — Subscription System
 *
 * Plan definitions and feature flag resolution.
 * Source of truth for what each plan can do.
 * No payment logic — pricing schema only.
 */

// ── Plan IDs ───────────────────────────────────────────────────────────────

export const PLAN_IDS = {
  FREE:     'free',
  PRO:      'pro',
  BUSINESS: 'business',
};

// ── Feature flag keys ─────────────────────────────────────────────────────

export const FEATURE = {
  MAX_FILE_SIZE_MB:      'maxFileSizeMb',
  DAILY_CONVERSIONS:     'dailyConversions',
  MONTHLY_CONVERSIONS:   'monthlyConversions',
  PREMIUM_TOOLS:         'premiumTools',
  CLOUD_CONVERSIONS:     'cloudConversions',
  OCR:                   'ocr',
  AI:                    'ai',
  API_ACCESS:            'apiAccess',
  BATCH_LIMIT:           'batchLimit',
  STORAGE_GB:            'storageGb',
  PRIORITY_QUEUE:        'priorityQueue',
  CUSTOM_BRANDING:       'customBranding',
  TEAM_SEATS:            'teamSeats',
  DOWNLOAD_EXPIRY_DAYS:  'downloadExpiryDays',
  WEBHOOK_ENDPOINTS:     'webhookEndpoints',
  HISTORY_DAYS:          'historyDays',
};

// ── Plan catalogue ─────────────────────────────────────────────────────────

export const PLANS = {
  [PLAN_IDS.FREE]: {
    id:    PLAN_IDS.FREE,
    name:  'Free',
    badge: null,
    price: {
      monthly: 0,
      annual:  0,
      currency: 'USD',
    },
    limits: {
      [FEATURE.MAX_FILE_SIZE_MB]:     25,
      [FEATURE.DAILY_CONVERSIONS]:    10,
      [FEATURE.MONTHLY_CONVERSIONS]:  100,
      [FEATURE.PREMIUM_TOOLS]:        false,
      [FEATURE.CLOUD_CONVERSIONS]:    false,
      [FEATURE.OCR]:                  false,
      [FEATURE.AI]:                   false,
      [FEATURE.API_ACCESS]:           false,
      [FEATURE.BATCH_LIMIT]:          1,
      [FEATURE.STORAGE_GB]:           0,
      [FEATURE.PRIORITY_QUEUE]:       false,
      [FEATURE.CUSTOM_BRANDING]:      false,
      [FEATURE.TEAM_SEATS]:           1,
      [FEATURE.DOWNLOAD_EXPIRY_DAYS]: 1,
      [FEATURE.WEBHOOK_ENDPOINTS]:    0,
      [FEATURE.HISTORY_DAYS]:         7,
    },
  },

  [PLAN_IDS.PRO]: {
    id:    PLAN_IDS.PRO,
    name:  'Pro',
    badge: 'Most Popular',
    price: {
      monthly: 9,
      annual:  79,
      currency: 'USD',
    },
    limits: {
      [FEATURE.MAX_FILE_SIZE_MB]:     100,
      [FEATURE.DAILY_CONVERSIONS]:    100,
      [FEATURE.MONTHLY_CONVERSIONS]:  1000,
      [FEATURE.PREMIUM_TOOLS]:        true,
      [FEATURE.CLOUD_CONVERSIONS]:    true,
      [FEATURE.OCR]:                  true,
      [FEATURE.AI]:                   true,
      [FEATURE.API_ACCESS]:           false,
      [FEATURE.BATCH_LIMIT]:          10,
      [FEATURE.STORAGE_GB]:           5,
      [FEATURE.PRIORITY_QUEUE]:       true,
      [FEATURE.CUSTOM_BRANDING]:      false,
      [FEATURE.TEAM_SEATS]:           1,
      [FEATURE.DOWNLOAD_EXPIRY_DAYS]: 7,
      [FEATURE.WEBHOOK_ENDPOINTS]:    3,
      [FEATURE.HISTORY_DAYS]:         90,
    },
  },

  [PLAN_IDS.BUSINESS]: {
    id:    PLAN_IDS.BUSINESS,
    name:  'Business',
    badge: 'Best Value',
    price: {
      monthly: 29,
      annual:  249,
      currency: 'USD',
    },
    limits: {
      [FEATURE.MAX_FILE_SIZE_MB]:     500,
      [FEATURE.DAILY_CONVERSIONS]:    1000,
      [FEATURE.MONTHLY_CONVERSIONS]:  10000,
      [FEATURE.PREMIUM_TOOLS]:        true,
      [FEATURE.CLOUD_CONVERSIONS]:    true,
      [FEATURE.OCR]:                  true,
      [FEATURE.AI]:                   true,
      [FEATURE.API_ACCESS]:           true,
      [FEATURE.BATCH_LIMIT]:          100,
      [FEATURE.STORAGE_GB]:           50,
      [FEATURE.PRIORITY_QUEUE]:       true,
      [FEATURE.CUSTOM_BRANDING]:      true,
      [FEATURE.TEAM_SEATS]:           5,
      [FEATURE.DOWNLOAD_EXPIRY_DAYS]: 30,
      [FEATURE.WEBHOOK_ENDPOINTS]:    20,
      [FEATURE.HISTORY_DAYS]:         365,
    },
  },
};

// ── Feature resolution helpers ─────────────────────────────────────────────

export function getPlanFeature(planId, featureKey) {
  const plan = PLANS[planId] || PLANS[PLAN_IDS.FREE];
  return plan.limits[featureKey] ?? PLANS[PLAN_IDS.FREE].limits[featureKey];
}

export function canUseFeature(planId, featureKey) {
  const val = getPlanFeature(planId, featureKey);
  return typeof val === 'boolean' ? val : val > 0;
}

export function exceedsLimit(planId, featureKey, currentValue) {
  const limit = getPlanFeature(planId, featureKey);
  if (typeof limit === 'boolean') return !limit;
  return currentValue >= limit;
}

export function getUpgradeTarget(planId) {
  if (planId === PLAN_IDS.FREE)     return PLAN_IDS.PRO;
  if (planId === PLAN_IDS.PRO)      return PLAN_IDS.BUSINESS;
  return null;
}

export function comparePlans(planA, planB) {
  const order = [PLAN_IDS.FREE, PLAN_IDS.PRO, PLAN_IDS.BUSINESS];
  return order.indexOf(planA) - order.indexOf(planB);
}

export function planIsAtLeast(planId, minimumPlanId) {
  return comparePlans(planId, minimumPlanId) >= 0;
}

// ── Plan list (sorted by tier) ─────────────────────────────────────────────

export const PLAN_LIST = [
  PLANS[PLAN_IDS.FREE],
  PLANS[PLAN_IDS.PRO],
  PLANS[PLAN_IDS.BUSINESS],
];
