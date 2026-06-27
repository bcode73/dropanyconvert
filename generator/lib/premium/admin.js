/**
 * Phase 21 — Admin Foundation
 *
 * Module architecture for internal admin capabilities.
 * No UI, no API endpoints — module contracts only.
 * Access is restricted to admin-scoped sessions.
 */

// ── Admin module IDs ───────────────────────────────────────────────────────

export const ADMIN_MODULE = {
  USERS:         'users',
  SUBSCRIPTIONS: 'subscriptions',
  CLOUD_JOBS:    'cloud_jobs',
  REPORTS:       'reports',
  USAGE:         'usage',
  PAYMENTS:      'payments',
  ANALYTICS:     'analytics',
  SUPPORT:       'support',
};

// ── Permission model ──────────────────────────────────────────────────────

export const ADMIN_ROLE = {
  SUPER:   'super',    // all modules, all actions
  OPS:     'ops',      // jobs + support
  FINANCE: 'finance',  // subscriptions + payments + reports
  ANALYST: 'analyst',  // reports + analytics (read-only)
  SUPPORT: 'support',  // users (read) + support
};

export const ROLE_PERMISSIONS = {
  [ADMIN_ROLE.SUPER]:   Object.values(ADMIN_MODULE),
  [ADMIN_ROLE.OPS]:     [ADMIN_MODULE.CLOUD_JOBS, ADMIN_MODULE.SUPPORT, ADMIN_MODULE.USERS],
  [ADMIN_ROLE.FINANCE]: [ADMIN_MODULE.SUBSCRIPTIONS, ADMIN_MODULE.PAYMENTS, ADMIN_MODULE.REPORTS],
  [ADMIN_ROLE.ANALYST]: [ADMIN_MODULE.REPORTS, ADMIN_MODULE.ANALYTICS],
  [ADMIN_ROLE.SUPPORT]: [ADMIN_MODULE.USERS, ADMIN_MODULE.SUPPORT],
};

export function roleCanAccess(role, moduleId) {
  return (ROLE_PERMISSIONS[role] || []).includes(moduleId);
}

// ── Module operation schemas ───────────────────────────────────────────────

export const ADMIN_MODULES = {

  [ADMIN_MODULE.USERS]: {
    id:          ADMIN_MODULE.USERS,
    operations:  ['list', 'get', 'search', 'suspend', 'unsuspend', 'delete', 'impersonate', 'export'],
    filters:     ['plan', 'status', 'createdAfter', 'createdBefore', 'email'],
    sortFields:  ['createdAt', 'lastLoginAt', 'plan'],
  },

  [ADMIN_MODULE.SUBSCRIPTIONS]: {
    id:          ADMIN_MODULE.SUBSCRIPTIONS,
    operations:  ['list', 'get', 'cancel', 'refund', 'grantTrial', 'changePlan', 'export'],
    filters:     ['plan', 'status', 'provider', 'renewsBefore'],
    sortFields:  ['createdAt', 'renewsAt', 'plan'],
  },

  [ADMIN_MODULE.CLOUD_JOBS]: {
    id:          ADMIN_MODULE.CLOUD_JOBS,
    operations:  ['list', 'get', 'cancel', 'retry', 'purge'],
    filters:     ['state', 'userId', 'toolSlug', 'createdAfter', 'priority'],
    sortFields:  ['queuedAt', 'completedAt', 'state', 'priority'],
  },

  [ADMIN_MODULE.REPORTS]: {
    id:          ADMIN_MODULE.REPORTS,
    operations:  ['revenue', 'churn', 'conversion', 'toolUsage', 'userGrowth', 'export'],
    filters:     ['period', 'plan', 'lang'],
    sortFields:  ['date', 'value'],
  },

  [ADMIN_MODULE.USAGE]: {
    id:          ADMIN_MODULE.USAGE,
    operations:  ['overview', 'topUsers', 'topTools', 'quotaBreaches', 'storageReport'],
    filters:     ['period', 'plan'],
    sortFields:  ['conversions', 'storage', 'cloudJobs'],
  },

  [ADMIN_MODULE.PAYMENTS]: {
    id:          ADMIN_MODULE.PAYMENTS,
    operations:  ['list', 'get', 'refund', 'dispute', 'export'],
    filters:     ['provider', 'status', 'currency', 'createdAfter'],
    sortFields:  ['createdAt', 'amount'],
  },

  [ADMIN_MODULE.ANALYTICS]: {
    id:          ADMIN_MODULE.ANALYTICS,
    operations:  ['pageViews', 'toolUsageHeatmap', 'funnelConversion', 'retentionCohort', 'featureAdoption'],
    filters:     ['period', 'lang', 'toolSlug'],
    sortFields:  ['date', 'views', 'conversions'],
  },

  [ADMIN_MODULE.SUPPORT]: {
    id:          ADMIN_MODULE.SUPPORT,
    operations:  ['listTickets', 'getTicket', 'reply', 'close', 'escalate', 'notes'],
    filters:     ['status', 'priority', 'assignee', 'createdAfter'],
    sortFields:  ['createdAt', 'updatedAt', 'priority'],
  },
};

// ── Admin session shape ────────────────────────────────────────────────────

export function createAdminSession({ adminId, role, sessionToken }) {
  return {
    adminId,
    role,
    sessionToken,
    permissions:  ROLE_PERMISSIONS[role] || [],
    createdAt:    new Date().toISOString(),
    expiresAt:    new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8h
    ipAddress:    null,
    userAgent:    null,
  };
}

// ── Audit log model ────────────────────────────────────────────────────────

export function createAuditEntry({ adminId, module, operation, targetId, before, after }) {
  return {
    id:         `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    adminId,
    module,
    operation,
    targetId:   targetId || null,
    before:     before   || null,
    after:      after    || null,
    at:         new Date().toISOString(),
  };
}
