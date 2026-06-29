#!/usr/bin/env node
/**
 * DropAnyConvert — Static Site Generator
 * Entry point. Orchestrates the full build pipeline.
 */

import { loadConfig } from './lib/config.js';
import { loadData } from './lib/loader.js';
import { validateData, validateRoutes } from './lib/validator.js';
import { buildRegistry } from './lib/registry.js';
import { generateRoutes } from './lib/router.js';
import { generateSeo } from './lib/seo.js';
import { generateInternalLinks } from './lib/linker.js';
import { generatePages } from './lib/page-generator.js';
import { generateSitemaps } from './lib/sitemap.js';
import { generateRobots } from './lib/robots.js';
import { emitDist } from './lib/emitter.js';
import { generateReport } from './lib/reporter.js';
import { validateSeo } from './lib/seo-validator.js';
import { generateAiDiscoverability } from './lib/llms.js';
import { runFreshnessEngine } from './lib/freshness.js';
import { generateStaticFiles } from './lib/static-files.js';
import { validateIndexingReadiness } from './lib/indexing-validator.js';
import { buildAuthorityGraph } from './lib/authority.js';
import { validatePremiumArchitecture } from './lib/premium-validator.js';
import { generateDashboardPages } from './lib/dashboard-generator.js';
import { generateOpenApiFile } from './lib/openapi-generator.js';
import { generateApiDocPages, generateApiSearchIndex, getApiDocStats } from './lib/api-doc-generator.js';
import { validateApiDocs } from './lib/api-validator.js';
import { detectDuplicates, buildDuplicateInputs } from './lib/duplicate-detector.js';
import { enrichTool } from './lib/content-engine.js';
import { generateDatasetFiles } from './lib/dataset-engine.js';
import { validateDatasets } from './lib/dataset-validator.js';
import { validateLinkHealth, validateMetadata, buildCrawlHints, computeSeoSweepMetrics } from './lib/seo-sweep.js';
import { runBuildAudit } from './lib/build-auditor.js';
import { validateLayout } from './lib/layout-validator.js';

async function build() {
  const startTime = Date.now();

  console.log('\n🔨 DropAnyConvert — Build started\n');

  // 1. Load configuration
  const config = await loadConfig();
  console.log(`  ✓ Config loaded  (v${config.site.version})`);

  // 2. Load all data (tools, categories, languages, seo global, ads)
  const data = await loadData(config);
  console.log(`  ✓ Data loaded    (${data.tools.length} tools, ${data.languages.length} languages)`);

  // 2a. Feature flag: ENABLE_AI_DEVELOPMENT
  // When false, strip AI Development tools + category from all downstream pipeline
  // steps (routes, pages, sitemap, search, linking, nav, API docs, dataset, llms.txt).
  // Engine source files are preserved; only the public surface is hidden.
  const AI_ENABLED = config.features?.enableAiDevelopment === true;
  if (!AI_ENABLED) {
    const hiddenTools = data.tools.filter(t => t.category === 'ai-development');
    data.tools      = data.tools.filter(t => t.category !== 'ai-development');
    data.categories = data.categories.filter(c => c.id !== 'ai-development');
    // Remove AI-tool slugs from collections so they don't produce empty-collection warnings
    if (data.collections) {
      const aiSlugs = new Set(hiddenTools.map(t => t.slug));
      data.collections = data.collections.map(col => ({
        ...col,
        toolSlugs: (col.toolSlugs || []).filter(s => !aiSlugs.has(s)),
      })).filter(col => (col.toolSlugs || []).length > 0);
    }
    console.log(`  ⚑ AI Development: DISABLED (${hiddenTools.length} tools hidden, flag: config.features.enableAiDevelopment)`);
  } else {
    console.log(`  ⚑ AI Development: ENABLED`);
  }

  // 3. Validate schema + referential integrity
  const validation = await validateData(data, config);
  if (validation.errors.length > 0) {
    console.error('\n  ✗ Validation errors:\n');
    validation.errors.forEach(e => console.error(`    - ${e}`));
    process.exit(1);
  }
  if (validation.warnings.length > 0) {
    validation.warnings.forEach(w => console.warn(`  ⚠ ${w}`));
  }
  console.log(`  ✓ Validation passed`);

  // 4. Build route registry
  const registry = await buildRegistry(data, config);
  console.log(`  ✓ Registry built (${registry.routes.length} routes)`);

  // 5. Generate routes (language × tools)
  const routes = await generateRoutes(registry, data, config);
  console.log(`  ✓ Routes resolved (${routes.length} pages)`);

  // 5a. Route integrity validation
  const routeValidation = validateRoutes(routes);
  if (routeValidation.errors.length > 0) {
    console.error('\n  ✗ Route validation errors:\n');
    routeValidation.errors.forEach(e => console.error(`    - ${e}`));
    process.exit(1);
  }

  // 6. Generate SEO data per route
  const seoData = await generateSeo(routes, data, config);
  console.log(`  ✓ SEO generated`);

  // 6a. Freshness Engine — must run before authority graph
  const freshness = await runFreshnessEngine(data, config);
  if (freshness.staleItems.length > 0) {
    console.log(`  ⚡ Freshness: ${freshness.staleItems.length} updated, ${freshness.newItems.length} new`);
  }

  // 6b. Authority Graph — PageRank-style authority propagation over all content nodes
  const graph = buildAuthorityGraph(data, freshness);
  console.log(`  ✓ Authority graph built (${graph.nodes.size} nodes, avg authority: ${graph.equity?.avgAuthority?.toFixed(1) ?? 'n/a'})`);

  // 7. Generate internal links (authority-weighted scoring via graph)
  const links = await generateInternalLinks(routes, data, config, graph);
  console.log(`  ✓ Internal links resolved`);

  // 8a. SEO quality validation (post-generation)
  const seoValidation = validateSeo(routes, seoData, data, config);
  if (seoValidation.errors.length > 0) {
    console.error('\n  ✗ SEO validation errors:\n');
    seoValidation.errors.forEach(e => console.error(`    - ${e}`));
    process.exit(1);
  }
  seoValidation.warnings.forEach(w => console.warn(`  ⚠ SEO: ${w}`));
  console.log(`  ✓ SEO validated    (${seoValidation.warnings.length} warnings)`);

  // 8b. Generate all pages (HTML)
  const pages = await generatePages(routes, seoData, links, data, config);
  console.log(`  ✓ Pages generated (${pages.length} files)`);

  // 8c. Phase 23 — Duplicate content detection (report only)
  const enrichmentCache = generatePages._enrichmentCache || new Map();
  // Compute quality stats across all tools (one enrichment per tool, language-independent)
  const qualityItems = data.tools.map(tool => {
    const e = enrichmentCache.get(tool.slug) || enrichTool(tool, data);
    return { tool, enrichment: e };
  });
  const avgFaqCount     = Math.round(qualityItems.reduce((s, x) => s + x.enrichment.faqs.length, 0) / Math.max(1, qualityItems.length));
  const avgQualityScore = Math.round(qualityItems.reduce((s, x) => s + x.enrichment.readingQuality.qualityScore, 0) / Math.max(1, qualityItems.length));
  const avgWordCount    = Math.round(qualityItems.reduce((s, x) => s + x.enrichment.readingQuality.wordCount, 0) / Math.max(1, qualityItems.length));
  const dupInputs       = buildDuplicateInputs(data.tools, enrichmentCache, 'en');
  const dupResult       = detectDuplicates(dupInputs);
  if (dupResult.warnings.length > 0) {
    dupResult.warnings.slice(0, 3).forEach(w => console.warn(`  ⚠ DUPE: ${w}`));
  }
  const contentQualityStats = {
    avg_faq_count:     avgFaqCount,
    avg_quality_score: avgQualityScore,
    avg_word_count:    avgWordCount,
    duplicate_pairs:   dupResult.stats.totalDuplicatePairs,
    pairs_checked:     dupResult.stats.pairsChecked,
    pages_enriched:    data.tools.length,
  };
  console.log(`  ✓ Content quality engine ran (avg FAQs: ${avgFaqCount}, avg quality: ${avgQualityScore}/100, dupe pairs: ${dupResult.stats.totalDuplicatePairs}/${dupResult.stats.pairsChecked})`);

  // 9. Generate sitemaps
  const sitemaps = await generateSitemaps(routes, config);
  console.log(`  ✓ Sitemaps generated`);

  // 10. Generate robots.txt
  const robots = await generateRobots(config);
  console.log(`  ✓ robots.txt generated`);

  // 10a. Generate static indexing files (humans.txt, security.txt, browserconfig.xml, site.webmanifest)
  const staticFiles = generateStaticFiles(config);
  console.log(`  ✓ Static files generated (humans.txt, security.txt, browserconfig.xml, site.webmanifest)`);

  // 10b. Indexing readiness validation
  const indexingValidation = validateIndexingReadiness(routes, seoData, links, sitemaps, robots, config);
  if (indexingValidation.errors.length > 0) {
    console.error('\n  ✗ Indexing readiness errors:\n');
    indexingValidation.errors.forEach(e => console.error(`    - ${e}`));
    process.exit(1);
  }
  indexingValidation.warnings.slice(0, 5).forEach(w => console.warn(`  ⚠ ${w}`));
  if (indexingValidation.warnings.length > 5) {
    console.warn(`  ⚠ ... and ${indexingValidation.warnings.length - 5} more indexing warnings (see build-report.json)`);
  }
  console.log(`  ✓ Indexing validated  (${indexingValidation.errors.length} errors, ${indexingValidation.warnings.length} warnings)`);

  // 11c. Premium architecture validation (warnings only — never fails build)
  const premiumValidation = validatePremiumArchitecture(data, config);
  premiumValidation.warnings.forEach(w => console.warn(`  ⚠ ${w}`));
  console.log(`  ✓ Premium architecture validated (${premiumValidation.stats.plans} plans, ${premiumValidation.stats.feature_flags} flags, ${premiumValidation.stats.premium_tools_declared} premium tools declared)`);

  // 11d. Generate dashboard pages (static HTML shells — empty state)
  const dashboardPages = generateDashboardPages(data, config);
  console.log(`  ✓ Dashboard pages generated (${dashboardPages.length} pages across ${data.languages.length} languages)`);

  // 11e. Generate API ecosystem (OpenAPI spec + developer doc pages + search index)
  const openApiFile    = generateOpenApiFile(data, config);
  const apiDocPages    = generateApiDocPages(data, config);
  const apiSearchIndex = generateApiSearchIndex(data, config);
  const apiStats       = getApiDocStats(data);
  const apiValidation  = validateApiDocs(openApiFile, apiDocPages, data, config);
  if (apiValidation.errors.length > 0) {
    console.error('\n  ✗ API validation errors:\n');
    apiValidation.errors.forEach(e => console.error(`    - ${e}`));
    process.exit(1);
  }
  apiValidation.warnings.slice(0, 3).forEach(w => console.warn(`  ⚠ API: ${w}`));
  console.log(`  ✓ API platform generated (${apiStats.total_pages} pages, ${apiStats.endpoints} endpoints, ${apiStats.sdks} SDKs, ${apiValidation.warnings.length} warnings)`);

  // 11f. Generate dataset files (Phase 24 — Research Center & AI Training Foundation)
  const { files: datasetFiles, datasetStats, formatDb, convMatrix, capDb } = generateDatasetFiles(data, config);
  const datasetValidation = validateDatasets(formatDb, convMatrix, capDb, data);
  if (datasetValidation.warnings.length > 0) {
    datasetValidation.warnings.slice(0, 3).forEach(w => console.warn(`  ⚠ Dataset: ${w}`));
  }
  console.log(`  ✓ Dataset engine ran (${datasetStats.formats} formats, ${datasetStats.conversionPairs} pairs, ${datasetStats.filesEmitted} files, ${datasetValidation.warnings.length} warnings)`);

  // 11. Generate AI discoverability files (/llms.txt, /ai.txt)
  const aiFiles = generateAiDiscoverability(data, routes, config);
  console.log(`  ✓ AI discovery generated (llms.txt, ai.txt)`);

  // 12. Emit everything to dist/
  const emitResult = await emitDist({ pages: [...pages, ...dashboardPages, ...apiDocPages], sitemaps, robots, staticFiles: [...staticFiles, openApiFile, apiSearchIndex, ...datasetFiles], aiFiles }, config);
  console.log(`  ✓ Dist emitted   (${emitResult.fileCount} files, ${emitResult.sizeKb} KB)`);

  // 12a. Phase 25 — SEO Sweep validation (post-emit, report only)
  const allEmittedPages = [...pages, ...dashboardPages, ...apiDocPages];
  const linkHealth    = validateLinkHealth(allEmittedPages, routes);
  const metaValidation = validateMetadata(seoData, config);
  const crawlHints    = buildCrawlHints(routes, seoData);
  const seoSweepMetrics = computeSeoSweepMetrics(allEmittedPages, routes, seoData, linkHealth, metaValidation, crawlHints);
  if (linkHealth.warnings.length > 0) {
    linkHealth.warnings.slice(0, 3).forEach(w => console.warn(`  ⚠ Link: ${w}`));
  }
  if (metaValidation.warnings.length > 0) {
    metaValidation.warnings.slice(0, 2).forEach(w => console.warn(`  ⚠ Meta: ${w}`));
  }
  console.log(`  ✓ SEO sweep (links: ${seoSweepMetrics.total_internal_links}, anchor diversity: ${seoSweepMetrics.anchor_diversity_score}%, metadata: ${seoSweepMetrics.metadata_quality_score}%, broken: ${seoSweepMetrics.broken_link_warnings})`);

  // 12b. Phase 26 — Build audit (generator, routes, assets, repo stats, health score)
  const buildAudit = await runBuildAudit({
    routes,
    pages: allEmittedPages,
    emitResult,
    timings: {},
    validation,
    seoValidation,
    indexingValidation,
    apiValidation,
    datasetValidation,
    seoSweepMetrics,
    config,
  });
  if (buildAudit.warnings.length > 0) {
    buildAudit.warnings.slice(0, 2).forEach(w => console.warn(`  ⚠ Audit: ${w}`));
  }
  console.log(`  ✓ Build audit complete (health: ${buildAudit.healthScore.total}/100 ${buildAudit.healthScore.grade}, modules: ${buildAudit.modules.length}, routes: ${buildAudit.routeAudit.stats.total_routes}, warnings: ${buildAudit.warnings.length})`);

  // 12c. Phase 32 — Layout validation
  const layoutValidation = validateLayout([...pages, ...dashboardPages, ...apiDocPages]);
  if (layoutValidation.errors.length > 0) {
    layoutValidation.errors.slice(0, 3).forEach(e => console.error(`  ✗ Layout: ${e}`));
  }
  layoutValidation.warnings.slice(0, 3).forEach(w => console.warn(`  ⚠ Layout: ${w}`));
  console.log(`  ✓ Layout validated (${layoutValidation.errors.length} errors, ${layoutValidation.warnings.length} warnings)`);

  // 13. Build report
  const elapsed = Date.now() - startTime;
  const report = await generateReport({ data, registry, routes, pages, sitemaps, validation, seoValidation, indexingValidation, emitResult, elapsed, config, seoData, freshness, graph, premiumValidation, dashboardPages, apiValidation, apiStats, contentQualityStats, dupResult, datasetStats, datasetValidation, seoSweepMetrics, linkHealth, metaValidation, crawlHints, buildAudit, layoutValidation });
  console.log(`\n  Build complete in ${elapsed}ms\n`);
  console.log(report.summary);

  return report;
}

build().catch(err => {
  console.error('\n  Build failed:', err.message);
  process.exit(1);
});
