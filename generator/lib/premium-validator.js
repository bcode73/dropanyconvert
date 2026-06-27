/**
 * Phase 21 — Premium Architecture Build Validator
 *
 * Validates premium declarations against the tool and plan catalogue.
 * Warnings only — never fails the build.
 * Called once per build to surface mismatches early.
 */

import { PLANS, PLAN_IDS, PLAN_LIST, FEATURE } from './premium/plans.js';
import { PREMIUM_TOOL_FLAGS, getPremiumDeclarationsSummary } from './premium/tool-flags.js';
import { AUTH_PROVIDERS } from './premium/auth.js';
import { PAYMENT_PROVIDER } from './premium/payment.js';
import { STORAGE_PROVIDER } from './premium/storage.js';
import { API_ROUTES, API_BASE } from './premium/api.js';
import { ADMIN_MODULE, ADMIN_MODULES } from './premium/admin.js';

export function validatePremiumArchitecture(data, config) {
  const warnings = [];
  const errors   = [];

  // ── 1. Feature flag completeness ─────────────────────────────────────────
  const featureKeys = Object.values(FEATURE);
  for (const plan of PLAN_LIST) {
    for (const key of featureKeys) {
      if (!(key in plan.limits)) {
        warnings.push(`PREMIUM: plan "${plan.id}" missing feature flag "${key}"`);
      }
    }
  }

  // ── 2. Premium tool declarations ─────────────────────────────────────────
  const summary = getPremiumDeclarationsSummary(data.tools || []);
  for (const slug of summary.orphaned_slugs) {
    warnings.push(`PREMIUM: declared premium tool "${slug}" has no matching tool in data`);
  }

  // ── 3. Plan references in flags ───────────────────────────────────────────
  for (const [slug, flags] of PREMIUM_TOOL_FLAGS) {
    if (!PLANS[flags.minimumPlan]) {
      warnings.push(`PREMIUM: tool "${slug}" references unknown minimumPlan "${flags.minimumPlan}"`);
    }
    for (const feat of (flags.features || [])) {
      if (!featureKeys.includes(feat)) {
        warnings.push(`PREMIUM: tool "${slug}" references unknown feature "${feat}"`);
      }
    }
  }

  // ── 4. Auth providers are declared ───────────────────────────────────────
  const authProviderCount = Object.keys(AUTH_PROVIDERS).length;
  if (authProviderCount < 4) {
    warnings.push(`PREMIUM: expected 4 auth providers, found ${authProviderCount}`);
  }

  // ── 5. Payment adapter coverage ───────────────────────────────────────────
  const paymentProviderCount = Object.keys(PAYMENT_PROVIDER).length;
  if (paymentProviderCount < 5) {
    warnings.push(`PREMIUM: expected 5 payment adapters declared, found ${paymentProviderCount}`);
  }

  // ── 6. Storage adapter coverage ───────────────────────────────────────────
  const storageProviderCount = Object.keys(STORAGE_PROVIDER).length;
  if (storageProviderCount < 5) {
    warnings.push(`PREMIUM: expected 5 storage adapters declared, found ${storageProviderCount}`);
  }

  // ── 7. API routes reference valid plans ────────────────────────────────────
  for (const [route, opts] of Object.entries(API_ROUTES)) {
    if (opts.plan && !PLANS[opts.plan]) {
      warnings.push(`PREMIUM: API route "${route}" references unknown plan "${opts.plan}"`);
    }
  }

  // ── 8. Admin modules completeness ────────────────────────────────────────
  for (const moduleId of Object.values(ADMIN_MODULE)) {
    if (!ADMIN_MODULES[moduleId]) {
      warnings.push(`PREMIUM: admin module "${moduleId}" has no definition`);
    }
  }

  // ── 9. Plan pricing sanity check ─────────────────────────────────────────
  for (const plan of PLAN_LIST) {
    if (plan.price.annual > plan.price.monthly * 12) {
      warnings.push(`PREMIUM: plan "${plan.id}" annual price (${plan.price.annual}) exceeds 12× monthly — unusual`);
    }
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = {
    plans:                  PLAN_LIST.length,
    feature_flags:          featureKeys.length,
    premium_tools_declared: summary.total_declared,
    cloud_tools:            summary.requires_cloud,
    login_tools:            summary.requires_login,
    orphaned_declarations:  summary.orphaned_slugs.length,
    auth_providers:         authProviderCount,
    payment_adapters:       paymentProviderCount,
    storage_adapters:       storageProviderCount,
    api_routes:             Object.keys(API_ROUTES).length,
    admin_modules:          Object.keys(ADMIN_MODULES).length,
  };

  return { errors, warnings, stats };
}
