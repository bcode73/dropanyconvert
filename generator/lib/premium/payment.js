/**
 * Phase 21 — Payment Abstraction Layer
 *
 * Provider-agnostic payment adapter interface.
 * No SDK integration — contract only.
 * Supports: Stripe, Paddle, LemonSqueezy, Paystack, Flutterwave.
 */

// ── Supported provider IDs ─────────────────────────────────────────────────

export const PAYMENT_PROVIDER = {
  STRIPE:        'stripe',
  PADDLE:        'paddle',
  LEMON_SQUEEZY: 'lemonsqueezy',
  PAYSTACK:      'paystack',
  FLUTTERWAVE:   'flutterwave',
};

// ── Webhook event types ────────────────────────────────────────────────────

export const PAYMENT_EVENT = {
  SUBSCRIPTION_CREATED:   'subscription.created',
  SUBSCRIPTION_UPDATED:   'subscription.updated',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',
  SUBSCRIPTION_EXPIRED:   'subscription.expired',
  PAYMENT_SUCCEEDED:      'payment.succeeded',
  PAYMENT_FAILED:         'payment.failed',
  REFUND_CREATED:         'refund.created',
  TRIAL_STARTED:          'trial.started',
  TRIAL_ENDED:            'trial.ended',
};

// ── Payment error codes ────────────────────────────────────────────────────

export const PAYMENT_ERROR = {
  CARD_DECLINED:       'card_declined',
  INSUFFICIENT_FUNDS:  'insufficient_funds',
  EXPIRED_CARD:        'expired_card',
  INVALID_CARD:        'invalid_card',
  PROVIDER_ERROR:      'provider_error',
  FRAUD_DETECTED:      'fraud_detected',
  CURRENCY_UNSUPPORTED: 'currency_unsupported',
};

// ── Checkout session model ─────────────────────────────────────────────────

export function createCheckoutSession({ userId, planId, billingCycle, currency = 'USD', successUrl, cancelUrl }) {
  return {
    id:           null,   // filled by provider after creation
    userId,
    planId,
    billingCycle, // 'monthly' | 'annual'
    currency,
    successUrl,
    cancelUrl,
    createdAt:    new Date().toISOString(),
    expiresAt:    null,
    providerRef:  null,   // provider's session ID
    status:       'pending', // pending | completed | cancelled | expired
  };
}

// ── Subscription model ────────────────────────────────────────────────────

export function createSubscription({ userId, planId, billingCycle, currency = 'USD' }) {
  const now = new Date().toISOString();
  return {
    id:           null,
    userId,
    planId,
    billingCycle,
    currency,
    status:       'active', // active | past_due | cancelled | trialing | paused
    trialEndsAt:  null,
    currentPeriodStart: now,
    currentPeriodEnd:   null,
    cancelAtPeriodEnd:  false,
    providerRef:  null,
    providerName: null,
    createdAt:    now,
    updatedAt:    now,
  };
}

// ── Payment adapter interface ─────────────────────────────────────────────
// Each concrete adapter must implement all methods.

export const PAYMENT_ADAPTER_INTERFACE = {
  id: '',  // one of PAYMENT_PROVIDER values

  // Create a hosted checkout session. Returns { sessionId, url }.
  createCheckout:        async (session) => { throw new Error('not implemented'); },

  // Create a portal session for managing existing subscription.
  createPortalSession:   async (userId, returnUrl) => { throw new Error('not implemented'); },

  // Cancel a subscription (at period end or immediately).
  cancelSubscription:    async (subscriptionId, immediately) => { throw new Error('not implemented'); },

  // Pause / resume a subscription.
  pauseSubscription:     async (subscriptionId) => { throw new Error('not implemented'); },
  resumeSubscription:    async (subscriptionId) => { throw new Error('not implemented'); },

  // Change plan within existing subscription.
  upgradeSubscription:   async (subscriptionId, newPlanId) => { throw new Error('not implemented'); },
  downgradeSubscription: async (subscriptionId, newPlanId) => { throw new Error('not implemented'); },

  // Verify and parse an incoming webhook payload.
  // Returns { event: PAYMENT_EVENT, data: {} } or throws on invalid signature.
  parseWebhook:          async (rawBody, headers) => { throw new Error('not implemented'); },

  // Apply a coupon/promo code to a checkout or subscription.
  applyPromoCode:        async (code, userId) => { throw new Error('not implemented'); },
};

// ── Adapter registry ──────────────────────────────────────────────────────

const _registry = new Map();

export function registerPaymentAdapter(adapter) {
  if (!Object.values(PAYMENT_PROVIDER).includes(adapter.id)) {
    throw new Error(`Unknown payment provider: ${adapter.id}`);
  }
  _registry.set(adapter.id, adapter);
}

export function getPaymentAdapter(providerId) {
  return _registry.get(providerId) || null;
}

export function listPaymentAdapters() {
  return [..._registry.keys()];
}
