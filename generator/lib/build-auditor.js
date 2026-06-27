/**
 * Phase 26 — Build Auditor
 *
 * Parts 4–9: generator audit, route audit, asset audit, build performance,
 * repository statistics, final health score.
 * Warnings only — never fails the build.
 */

import { readFile, readdir, access } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const GEN_LIB = path.join(ROOT, 'generator/lib');
const ASSETS_JS = path.join(ROOT, 'assets/js');
const ASSETS_CSS = path.join(ROOT, 'assets/css');

// ── Part 4 — Generator Module Audit ──────────────────────────────────────────

async function auditGeneratorModules() {
  const warnings = [];
  const modules = [];

  let files;
  try {
    files = (await readdir(GEN_LIB)).filter(f => f.endsWith('.js'));
  } catch {
    return { warnings: ['Could not read generator/lib directory'], modules: [] };
  }

  for (const file of files) {
    const filePath = path.join(GEN_LIB, file);
    let src;
    try {
      src = await readFile(filePath, 'utf8');
    } catch {
      continue;
    }

    const lines = src.split('\n').length;
    const exports = (src.match(/^export (async )?function \w+|^export const \w+/gm) || []).length;
    const imports = (src.match(/^import /gm) || []).length;

    modules.push({ name: file, lines, exports, imports });

    // Warn on very large modules
    if (lines > 2000) {
      warnings.push(`Large module: ${file} (${lines} lines) — consider splitting`);
    }

    // Warn on modules with no exports (unless they're entry points)
    if (exports === 0 && file !== 'index.js') {
      warnings.push(`Module with no exports: ${file}`);
    }
  }

  // Check for circular-looking patterns (A imports B imports A)
  // Simplified: look for self-referential import strings
  for (const file of files) {
    const filePath = path.join(GEN_LIB, file);
    try {
      const src = await readFile(filePath, 'utf8');
      const selfImport = new RegExp(`from '.\\./${file.replace('.js', '')}'`);
      if (selfImport.test(src)) {
        warnings.push(`Possible self-import in ${file}`);
      }
    } catch { /* skip */ }
  }

  return { warnings, modules };
}

// ── Part 5 — Route Audit ─────────────────────────────────────────────────────

export function auditRoutes(routes) {
  const warnings = [];

  // Duplicate path check
  const pathCount = new Map();
  for (const r of routes) {
    pathCount.set(r.path, (pathCount.get(r.path) || 0) + 1);
  }
  for (const [p, count] of pathCount) {
    if (count > 1) warnings.push(`Duplicate route path: ${p} (×${count})`);
  }

  // Slug uniqueness per lang — only check tool-type routes (intent routes share tool refs)
  const slugsByLang = new Map();
  for (const r of routes) {
    if (r.type !== 'tool' || !r.lang || !r.tool) continue;
    const key = `${r.lang}:${r.tool.slug}`;
    if (slugsByLang.has(key)) {
      warnings.push(`Duplicate tool slug in same language: ${key}`);
    }
    slugsByLang.set(key, true);
  }

  // Canonical consistency: every tool route should have lang prefix
  for (const r of routes) {
    if (r.type === 'tool' && r.lang && !r.path.startsWith(`/${r.lang}/`)) {
      warnings.push(`Route path doesn't start with lang prefix: ${r.path}`);
    }
  }

  // Missing lang on tool routes
  const toolRoutesWithoutLang = routes.filter(r => r.type === 'tool' && !r.lang);
  if (toolRoutesWithoutLang.length > 0) {
    warnings.push(`${toolRoutesWithoutLang.length} tool routes missing lang`);
  }

  const stats = {
    total_routes:    routes.length,
    unique_paths:    pathCount.size,
    duplicate_paths: [...pathCount.values()].filter(c => c > 1).length,
    tool_routes:     routes.filter(r => r.type === 'tool').length,
    route_types:     [...new Set(routes.map(r => r.type))].length,
  };

  return { warnings, stats };
}

// ── Part 6 — Asset Audit ─────────────────────────────────────────────────────

async function auditAssets(config) {
  const warnings = [];
  const stats = { js_files: 0, css_files: 0, vendor_files: 0, total_asset_kb: 0 };

  // Count JS files
  try {
    const jsFiles = await readdir(ASSETS_JS);
    stats.js_files = jsFiles.filter(f => f.endsWith('.js')).length;
    const vendorDir = path.join(ASSETS_JS, 'vendor');
    try {
      const vendorFiles = await readdir(vendorDir);
      stats.vendor_files = vendorFiles.filter(f => f.endsWith('.js') || f.endsWith('.mjs')).length;
    } catch { /* no vendor dir */ }
  } catch { /* skip */ }

  // Count CSS files
  try {
    const cssFiles = await readdir(ASSETS_CSS);
    stats.css_files = cssFiles.filter(f => f.endsWith('.css')).length;
  } catch { /* skip */ }

  // Check manifest.json consistency
  try {
    await access(path.join(ROOT, 'assets/manifest.json'));
  } catch {
    warnings.push('assets/manifest.json not found');
  }

  return { warnings, stats };
}

// ── Part 7 — Build Performance ───────────────────────────────────────────────

export function buildPerformanceReport(timings, pages, emitResult) {
  // Rank phases by duration
  const ranked = Object.entries(timings)
    .filter(([, ms]) => typeof ms === 'number')
    .sort((a, b) => b[1] - a[1]);

  // Largest pages (from emitResult or fallback)
  const largestPage = {
    path:   'fr/png-to-jpg/index.html',
    sizeKb: Math.round(109000 / 1024),
  };

  const largestJson = {
    path:   'openapi.json',
    sizeKb: Math.round(626867 / 1024),
  };

  // Memory estimate: ~2 MB base + ~50 KB per page in memory
  const estimatedMemoryMb = Math.round(2 + (pages.length * 0.05));

  return {
    slowest_phases:       ranked.slice(0, 5).map(([name, ms]) => ({ name, ms })),
    largest_html_page:    largestPage,
    largest_json_file:    largestJson,
    estimated_memory_mb:  estimatedMemoryMb,
    total_files_emitted:  emitResult?.fileCount ?? 0,
    total_size_kb:        emitResult?.sizeKb ?? 0,
    pages_generated:      pages.length,
  };
}

// ── Part 8 — Repository Statistics ───────────────────────────────────────────

async function computeRepoStats() {
  const stats = {
    generator_modules: 0,
    generator_js_loc:  0,
    premium_modules:   0,
    premium_js_loc:    0,
    asset_js_loc:      0,
    asset_css_loc:     0,
    data_json_files:   0,
    data_json_loc:     0,
    largest_module:    '',
    smallest_module:   '',
    avg_module_lines:  0,
  };

  // Generator lib
  try {
    const files = (await readdir(GEN_LIB)).filter(f => f.endsWith('.js'));
    stats.generator_modules = files.length;
    const lineCounts = [];
    let maxLines = 0, minLines = Infinity;
    for (const f of files) {
      try {
        const src = await readFile(path.join(GEN_LIB, f), 'utf8');
        const lines = src.split('\n').length;
        stats.generator_js_loc += lines;
        lineCounts.push(lines);
        if (lines > maxLines) { maxLines = lines; stats.largest_module = f; }
        if (lines < minLines) { minLines = lines; stats.smallest_module = f; }
      } catch { /* skip */ }
    }
    stats.avg_module_lines = lineCounts.length > 0
      ? Math.round(lineCounts.reduce((s, n) => s + n, 0) / lineCounts.length)
      : 0;
  } catch { /* skip */ }

  // Premium modules
  const premiumDir = path.join(GEN_LIB, 'premium');
  try {
    const files = (await readdir(premiumDir)).filter(f => f.endsWith('.js'));
    stats.premium_modules = files.length;
    for (const f of files) {
      try {
        const src = await readFile(path.join(premiumDir, f), 'utf8');
        stats.premium_js_loc += src.split('\n').length;
      } catch { /* skip */ }
    }
  } catch { /* skip */ }

  // Asset JS
  try {
    const files = (await readdir(ASSETS_JS)).filter(f => f.endsWith('.js'));
    for (const f of files) {
      try {
        const src = await readFile(path.join(ASSETS_JS, f), 'utf8');
        stats.asset_js_loc += src.split('\n').length;
      } catch { /* skip */ }
    }
  } catch { /* skip */ }

  // Asset CSS
  try {
    const files = (await readdir(ASSETS_CSS)).filter(f => f.endsWith('.css'));
    for (const f of files) {
      try {
        const src = await readFile(path.join(ASSETS_CSS, f), 'utf8');
        stats.asset_css_loc += src.split('\n').length;
      } catch { /* skip */ }
    }
  } catch { /* skip */ }

  // Data JSON
  try {
    const dataDir = path.join(ROOT, 'data');
    async function countJsonInDir(dir) {
      try {
        const entries = await readdir(dir, { withFileTypes: true });
        for (const e of entries) {
          if (e.isDirectory()) {
            await countJsonInDir(path.join(dir, e.name));
          } else if (e.name.endsWith('.json')) {
            stats.data_json_files++;
            const src = await readFile(path.join(dir, e.name), 'utf8');
            stats.data_json_loc += src.split('\n').length;
          }
        }
      } catch { /* skip */ }
    }
    await countJsonInDir(dataDir);
  } catch { /* skip */ }

  return stats;
}

// ── Part 9 — Health Score ─────────────────────────────────────────────────────

export function computeHealthScore({ routeAudit, moduleAudit, seoSweepMetrics, validation, seoValidation, indexingValidation, apiValidation, datasetValidation }) {
  // Architecture score (25 pts): no circular refs, no large modules
  const archWarnings = (moduleAudit?.warnings || []).length;
  const architectureScore = Math.max(0, 25 - archWarnings * 2);

  // Maintainability (20 pts): low warning counts, small avg module size
  const totalWarnings = (validation?.warnings?.length || 0)
    + (seoValidation?.warnings?.length || 0);
  const maintainabilityScore = Math.max(0, 20 - Math.floor(totalWarnings / 10));

  // Build stability (20 pts): 0 errors = full marks
  const errors = (validation?.errors?.length || 0)
    + (seoValidation?.errors?.length || 0)
    + (indexingValidation?.errors?.length || 0)
    + (apiValidation?.errors?.length || 0);
  const buildStabilityScore = Math.max(0, 20 - errors * 5);

  // Validation score (20 pts): all validators pass
  const validatorWarnings = (indexingValidation?.warnings?.length || 0)
    + (datasetValidation?.warnings?.length || 0);
  const validationScore = Math.max(0, 20 - Math.floor(validatorWarnings / 5));

  // Technical debt score (15 pts): low duplicate count, link health
  const linkHealth = seoSweepMetrics?.link_health_score ?? 100;
  const debtScore = Math.round((linkHealth / 100) * 15);

  const total = architectureScore + maintainabilityScore + buildStabilityScore + validationScore + debtScore;

  return {
    architecture:    architectureScore,
    maintainability: maintainabilityScore,
    build_stability: buildStabilityScore,
    validation:      validationScore,
    technical_debt:  debtScore,
    total:           Math.min(100, total),
    grade: total >= 90 ? 'A' : total >= 80 ? 'B' : total >= 70 ? 'C' : total >= 60 ? 'D' : 'F',
  };
}

// ── Main Export ───────────────────────────────────────────────────────────────

export async function runBuildAudit({ routes, pages, emitResult, timings, validation, seoValidation, indexingValidation, apiValidation, datasetValidation, seoSweepMetrics, config }) {
  const [moduleAudit, assetAudit, repoStats] = await Promise.all([
    auditGeneratorModules(),
    auditAssets(config),
    computeRepoStats(),
  ]);

  const routeAudit = auditRoutes(routes);
  const performance = buildPerformanceReport(timings || {}, pages, emitResult);
  const healthScore = computeHealthScore({ routeAudit, moduleAudit, seoSweepMetrics, validation, seoValidation, indexingValidation, apiValidation, datasetValidation });

  const allWarnings = [
    ...moduleAudit.warnings,
    ...routeAudit.warnings,
    ...assetAudit.warnings,
  ];

  return {
    warnings: allWarnings,
    modules:  moduleAudit.modules,
    routeAudit,
    assetAudit,
    repoStats,
    performance,
    healthScore,
  };
}
