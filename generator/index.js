#!/usr/bin/env node
/**
 * DropAnyConvert — Static Site Generator
 * Entry point. Orchestrates the full build pipeline.
 */

import { loadConfig } from './lib/config.js';
import { loadData } from './lib/loader.js';
import { validateData } from './lib/validator.js';
import { buildRegistry } from './lib/registry.js';
import { generateRoutes } from './lib/router.js';
import { generateSeo } from './lib/seo.js';
import { generateInternalLinks } from './lib/linker.js';
import { generatePages } from './lib/page-generator.js';
import { generateSitemaps } from './lib/sitemap.js';
import { generateRobots } from './lib/robots.js';
import { emitDist } from './lib/emitter.js';
import { generateReport } from './lib/reporter.js';

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

  // 6. Generate SEO data per route
  const seoData = await generateSeo(routes, data, config);
  console.log(`  ✓ SEO generated`);

  // 7. Generate internal links
  const links = await generateInternalLinks(routes, data, config);
  console.log(`  ✓ Internal links resolved`);

  // 8. Generate all pages (HTML)
  const pages = await generatePages(routes, seoData, links, data, config);
  console.log(`  ✓ Pages generated (${pages.length} files)`);

  // 9. Generate sitemaps
  const sitemaps = await generateSitemaps(routes, config);
  console.log(`  ✓ Sitemaps generated`);

  // 10. Generate robots.txt
  const robots = await generateRobots(config);
  console.log(`  ✓ robots.txt generated`);

  // 11. Emit everything to dist/
  const emitResult = await emitDist({ pages, sitemaps, robots }, config);
  console.log(`  ✓ Dist emitted   (${emitResult.fileCount} files, ${emitResult.sizeKb} KB)`);

  // 12. Build report
  const elapsed = Date.now() - startTime;
  const report = await generateReport({ data, registry, routes, pages, sitemaps, validation, emitResult, elapsed });
  console.log(`\n  Build complete in ${elapsed}ms\n`);
  console.log(report.summary);

  return report;
}

build().catch(err => {
  console.error('\n  Build failed:', err.message);
  process.exit(1);
});
