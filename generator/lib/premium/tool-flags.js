/**
 * Phase 21 — Premium Tool Framework
 *
 * Allows tools to declare premium requirements without modifying tool logic.
 * Declarations live in a separate registry, not in tool JSON files.
 * The generator reads this registry to render gates, badges, and upgrade prompts.
 */

import { PLAN_IDS, FEATURE, planIsAtLeast } from './plans.js';

// ── Premium flag schema ────────────────────────────────────────────────────

export function createToolPremiumFlags({
  slug,
  requiresPremium    = false,
  requiresCloud      = false,
  requiresLogin      = false,
  minimumPlan        = null,   // PLAN_IDS.FREE | PRO | BUSINESS
  estimatedCredits   = 1,
  priorityQueue      = false,
  features           = [],     // which FEATURE flags this tool needs
  badge              = null,   // display badge: 'Pro' | 'Business' | 'New' | 'Beta'
  upgradePrompt      = null,   // custom upgrade CTA text
}) {
  return {
    slug,
    requiresPremium:  requiresPremium || requiresCloud || (minimumPlan && minimumPlan !== PLAN_IDS.FREE),
    requiresCloud,
    requiresLogin:    requiresLogin || requiresPremium || requiresCloud,
    minimumPlan:      minimumPlan || (requiresCloud ? PLAN_IDS.PRO : (requiresPremium ? PLAN_IDS.PRO : PLAN_IDS.FREE)),
    estimatedCredits,
    priorityQueue,
    features,
    badge,
    upgradePrompt:    upgradePrompt || null,
  };
}

// ── Premium tool registry ─────────────────────────────────────────────────
// Declare premium tools here. Tool logic is NOT changed.
// Generator reads this to render gates and badges.

export const PREMIUM_TOOL_FLAGS = new Map([
  // Example declarations — filled as premium tools are onboarded:
  // ['pdf-ocr', createToolPremiumFlags({
  //   slug:             'pdf-ocr',
  //   requiresPremium:  true,
  //   requiresCloud:    true,
  //   minimumPlan:      PLAN_IDS.PRO,
  //   estimatedCredits: 5,
  //   features:         [FEATURE.OCR, FEATURE.CLOUD_CONVERSIONS],
  //   badge:            'Pro',
  // })],
]);

// ── Lookup helpers ─────────────────────────────────────────────────────────

export function getToolFlags(slug) {
  return PREMIUM_TOOL_FLAGS.get(slug) || null;
}

export function isToolFreeForPlan(slug, planId) {
  const flags = getToolFlags(slug);
  if (!flags || !flags.requiresPremium) return true;
  return planIsAtLeast(planId, flags.minimumPlan);
}

export function getToolBadge(slug) {
  return getToolFlags(slug)?.badge || null;
}

export function toolRequiresCloud(slug) {
  return getToolFlags(slug)?.requiresCloud ?? false;
}

export function toolRequiresLogin(slug) {
  return getToolFlags(slug)?.requiresLogin ?? false;
}

// ── Build-time premium declarations summary ────────────────────────────────
// Used by the build validator to check consistency.

export function getPremiumDeclarationsSummary(tools) {
  const declared    = [...PREMIUM_TOOL_FLAGS.keys()];
  const toolSlugs   = new Set(tools.map(t => t.slug));
  const orphaned    = declared.filter(s => !toolSlugs.has(s));
  const cloudTools  = declared.filter(s => PREMIUM_TOOL_FLAGS.get(s)?.requiresCloud);
  const loginTools  = declared.filter(s => PREMIUM_TOOL_FLAGS.get(s)?.requiresLogin);
  const byPlan      = {};
  for (const [slug, flags] of PREMIUM_TOOL_FLAGS) {
    const p = flags.minimumPlan;
    byPlan[p] = (byPlan[p] || []);
    byPlan[p].push(slug);
  }

  return {
    total_declared: declared.length,
    requires_cloud: cloudTools.length,
    requires_login: loginTools.length,
    orphaned_slugs: orphaned,  // declared but no matching tool
    by_plan:        byPlan,
  };
}
