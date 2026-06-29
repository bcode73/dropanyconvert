/**
 * Screenshot AI Engine — Usage & Credits Accounting
 *
 * Tracks AI credit consumption, token usage, image tokens, provider costs,
 * monthly limits, queue priority, retry billing, and usage analytics.
 *
 * Architecture only. All state management stubs — wire to a real persistence
 * layer (Supabase, Firebase, R2, etc.) when activating the premium runtime.
 */

// ── Credit tiers (matches premium/plans.js) ────────────────────────────────────
export const CREDIT_TIERS = {
  free:     { monthlyCredits: 0,    queuePriority: 0, maxImagePx: 0     },
  pro:      { monthlyCredits: 500,  queuePriority: 1, maxImagePx: 2048  },
  business: { monthlyCredits: 5000, queuePriority: 2, maxImagePx: 4096  },
};

// ── Credit costs per operation ─────────────────────────────────────────────────
export const OPERATION_COSTS = {
  'screenshot-to-html':             1,
  'screenshot-to-html-css':         1,
  'screenshot-to-tailwind':         1,
  'screenshot-to-bootstrap':        1,
  'screenshot-to-react':            2,
  'screenshot-to-nextjs':           2,
  'screenshot-to-vue':              2,
  'screenshot-to-svelte':           2,
  'screenshot-to-angular':          2,
  'screenshot-to-flutter':          3,
  'screenshot-to-swiftui':          3,
  'screenshot-to-react-native':     3,
  'screenshot-to-jetpack-compose':  3,
  'screenshot-to-blazor':           2,
  'screenshot-to-alpine':           1,
  'screenshot-to-email':            2,
  'screenshot-to-svg':              1,
  'screenshot-to-css-grid':         1,
  'screenshot-to-wireframe':        1,
  'screenshot-to-component-tree':   2,
  regenerate:                       1,
  'partial-regenerate':             1,
};

// ── Usage event schema ─────────────────────────────────────────────────────────
/**
 * @typedef {Object} UsageEvent
 * @property {string}  userId
 * @property {string}  toolSlug
 * @property {string}  provider       AI provider used
 * @property {string}  framework      Output framework
 * @property {number}  inputTokens
 * @property {number}  outputTokens
 * @property {number}  imageWidth
 * @property {number}  imageHeight
 * @property {number}  costUsd        Actual provider cost in USD
 * @property {number}  creditsUsed    Credits deducted from user balance
 * @property {number}  latencyMs
 * @property {boolean} success
 * @property {string}  [errorCode]    If not success
 * @property {string}  timestamp      ISO 8601
 */

export class UsageAccounting {
  constructor(storage = null) {
    // storage: any object implementing { get(key), set(key, value), increment(key, by) }
    // Architecture stub — inject real storage at runtime
    this._storage = storage;
  }

  // ── Credit checks ────────────────────────────────────────────────────────

  /**
   * Check if a user has enough credits for an operation.
   * @param {string} userId
   * @param {string} toolSlug
   * @returns {Promise<{ allowed: boolean, creditsRequired: number, creditsRemaining: number }>}
   */
  async checkCredits(userId, toolSlug) {
    return _notImplemented('checkCredits');
  }

  /**
   * Deduct credits from a user's balance.
   * @param {string} userId
   * @param {string} toolSlug
   * @returns {Promise<{ newBalance: number, deducted: number }>}
   */
  async deductCredits(userId, toolSlug) {
    return _notImplemented('deductCredits');
  }

  /**
   * Refund credits if an AI call fails and the user was pre-charged.
   * @param {string} userId
   * @param {number} amount
   * @returns {Promise<void>}
   */
  async refundCredits(userId, amount) {
    return _notImplemented('refundCredits');
  }

  // ── Event recording ───────────────────────────────────────────────────────

  /**
   * Record a completed AI generation event.
   * @param {UsageEvent} event
   * @returns {Promise<void>}
   */
  async recordEvent(event) {
    return _notImplemented('recordEvent');
  }

  // ── Usage analytics ───────────────────────────────────────────────────────

  /**
   * Get usage summary for a user over a time period.
   * @param {string} userId
   * @param {{ start: Date, end: Date }} period
   * @returns {Promise<UsageSummary>}
   */
  async getUserSummary(userId, period) {
    return _notImplemented('getUserSummary');
  }

  /**
   * Get aggregate platform-wide usage analytics.
   * @param {{ start: Date, end: Date }} period
   * @returns {Promise<PlatformAnalytics>}
   */
  async getPlatformAnalytics(period) {
    return _notImplemented('getPlatformAnalytics');
  }

  // ── Queue priority ────────────────────────────────────────────────────────

  /**
   * Get queue priority for a user based on their plan.
   * @param {string} userId
   * @returns {Promise<number>} 0 = free, 1 = pro, 2 = business
   */
  async getQueuePriority(userId) {
    return _notImplemented('getQueuePriority');
  }

  // ── Monthly limits ────────────────────────────────────────────────────────

  /**
   * Check and enforce monthly credit limit reset.
   * @param {string} userId
   * @returns {Promise<void>}
   */
  async resetMonthlyCreditsIfDue(userId) {
    return _notImplemented('resetMonthlyCreditsIfDue');
  }
}

/**
 * @typedef {Object} UsageSummary
 * @property {number} totalCreditsUsed
 * @property {number} creditsRemaining
 * @property {number} totalTokensInput
 * @property {number} totalTokensOutput
 * @property {number} totalCostUsd
 * @property {Record<string, number>} byTool   credits per tool slug
 * @property {Record<string, number>} byProvider
 * @property {number} successRate
 * @property {number} avgLatencyMs
 */

/**
 * @typedef {Object} PlatformAnalytics
 * @property {number} totalRequests
 * @property {number} totalCostUsd
 * @property {Record<string, number>} providerDistribution
 * @property {Record<string, number>} frameworkDistribution
 * @property {number} avgLatencyMs
 * @property {number} p95LatencyMs
 * @property {number} errorRate
 */

function _notImplemented(method) {
  throw new Error(
    `UsageAccounting.${method}() is not yet implemented. ` +
    `Inject a real storage adapter (Supabase, Firebase, R2, etc.) to activate.`
  );
}

export const operationCost = (slug) => OPERATION_COSTS[slug] ?? 1;
