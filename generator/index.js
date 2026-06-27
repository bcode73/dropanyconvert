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

async function build() {
  const startTime = Date.now();

  console.log('\n🔨 DropAnyConvert — Build started\n');

  // 1. Load configuration
  const config = await loadConfig();
  console.log(`  ✓ Config loaded  (v${config.site.version})`);

  // 2. Load all data (tools, categories, languages, seo global, ads)
  const data = await loadData(config);
  console.log(`  ✓ Data loaded    (${data.tools.length} tools, ${data.languages.length} languages)`);

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

  // 7. Generate internal links
  const links = await generateInternalLinks(routes, data, config);
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

  // 9. Generate sitemaps
  const sitemaps = await generateSitemaps(routes, config);
  console.log(`  ✓ Sitemaps generated`);

  // 10. Generate robots.txt
  const robots = await generateRobots(config);
  console.log(`  ✓ robots.txt generated`);

  // 11a. Freshness Engine — track content hashes, detect stale content
  const freshness = await runFreshnessEngine(data, config);
  if (freshness.staleItems.length > 0) {
    console.log(`  ⚡ Freshness: ${freshness.staleItems.length} updated, ${freshness.newItems.length} new`);
  }

  // 11. Generate AI discoverability files (/llms.txt, /ai.txt)
  const aiFiles = generateAiDiscoverability(data, routes, config);
  console.log(`  ✓ AI discovery generated (llms.txt, ai.txt)`);

  // 12. Emit everything to dist/
  const emitResult = await emitDist({ pages, sitemaps, robots, aiFiles }, config);
  console.log(`  ✓ Dist emitted   (${emitResult.fileCount} files, ${emitResult.sizeKb} KB)`);

  // 12. Build report
  const elapsed = Date.now() - startTime;
  const report = await generateReport({ data, registry, routes, pages, sitemaps, validation, seoValidation, emitResult, elapsed, config, seoData });
  console.log(`\n  Build complete in ${elapsed}ms\n`);
  console.log(report.summary);

  return report;
}

build().catch(err => {
  console.error('\n  Build failed:', err.message);
  process.exit(1);
});
