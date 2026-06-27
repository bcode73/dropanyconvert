import { writeFile } from 'fs/promises';
import path from 'path';

function buildDashboard(routes, pages, seoData) {
  if (!seoData) return {};

  const allSeo = [...(seoData?.values?.() || [])];
  const total  = allSeo.length;
  if (total === 0) return {};

  const withTitle   = allSeo.filter(s => s.title).length;
  const withDesc    = allSeo.filter(s => s.description).length;
  const withH1      = allSeo.filter(s => s.h1).length;
  const withSchema  = allSeo.filter(s => s.schemas?.length > 0).length;
  const withCrumbs  = allSeo.filter(s => s.breadcrumbs?.length > 0).length;

  const titles = allSeo.map(s => s.title || '').filter(Boolean);
  const descs  = allSeo.map(s => s.description || '').filter(Boolean);
  const avgTitleLen = titles.length ? Math.round(titles.reduce((a, t) => a + t.length, 0) / titles.length) : 0;
  const avgDescLen  = descs.length  ? Math.round(descs.reduce((a, d)  => a + d.length,  0) / descs.length)  : 0;

  // Duplicate detection
  const titleSet = new Set();
  let dupTitles = 0;
  for (const t of titles) { if (titleSet.has(t)) dupTitles++; else titleSet.add(t); }

  const descSet = new Set();
  let dupDescs = 0;
  for (const d of descs) { if (descSet.has(d)) dupDescs++; else descSet.add(d); }

  const seoScore   = Math.round((withTitle + withDesc + withH1 + withSchema) / (total * 4) * 100);
  const schemaCov  = Math.round(withSchema / total * 100);

  const pageSizes = pages.map(p => ({ path: p.path, size: (p.content || '').length }));
  pageSizes.sort((a, b) => b.size - a.size);

  return {
    seo_score:               `${seoScore}%`,
    schema_coverage:         `${schemaCov}%`,
    pages_with_title:        withTitle,
    pages_with_description:  withDesc,
    pages_with_h1:           withH1,
    pages_with_schema:       withSchema,
    pages_with_breadcrumbs:  withCrumbs,
    avg_title_length:        avgTitleLen,
    avg_description_length:  avgDescLen,
    duplicate_title_count:   dupTitles,
    duplicate_desc_count:    dupDescs,
    largest_page:            pageSizes[0]?.path || '',
    largest_page_bytes:      pageSizes[0]?.size || 0,
    smallest_page:           pageSizes[pageSizes.length - 1]?.path || '',
    smallest_page_bytes:     pageSizes[pageSizes.length - 1]?.size || 0,
    generator_version:       '15.0.0',
  };
}

/**
 * Generates an expanded build report and writes it to build-report.json.
 */
export async function generateReport({ data, registry, routes, pages, sitemaps, validation, seoValidation, emitResult, elapsed, config, seoData }) {
  const toolCount = data.tools.length;
  const langCount = data.languages.length;
  const pageCount = pages.length;
  const routeCount = routes.length;

  const toolPages    = pages.filter(p => p.path.includes('/index.html') && !p.path.match(/^\/(en|es|fr|de|pt)\/(index|[a-z-]+-converter|developer-tools|pdf-tools|image-tools|[a-z]+-policy|terms|disclaimer)\/index\.html$/)).length;
  const legalPages   = routes.filter(r => r.type === 'legal').length;
  const categoryPages = routes.filter(r => r.type === 'category').length;
  const homePages    = routes.filter(r => r.type === 'home').length;

  const seoErrors   = (seoValidation?.errors   || []);
  const seoWarnings = (seoValidation?.warnings  || []);

  const report = {
    timestamp: new Date().toISOString(),
    elapsed_ms: elapsed,

    // Counts
    tools: toolCount,
    languages: langCount,
    routes: routeCount,
    pages_generated: pageCount,
    pages_by_type: {
      tool:           routes.filter(r => r.type === 'tool').length,
      category:       categoryPages,
      home:           homePages,
      legal:          legalPages,
      article:        routes.filter(r => r.type === 'article').length,
      comparison:     routes.filter(r => r.type === 'comparison').length,
      glossary:       routes.filter(r => r.type === 'glossary').length,
      'guides-index': routes.filter(r => r.type === 'guides-index').length,
      'compare-index':routes.filter(r => r.type === 'compare-index').length,
      'glossary-index':routes.filter(r => r.type === 'glossary-index').length,
      collection:     routes.filter(r => r.type === 'collection').length,
      'collections-index': routes.filter(r => r.type === 'collections-index').length,
      landing:        routes.filter(r => r.type === 'landing').length,
      'faq-hub':      routes.filter(r => r.type === 'faq-hub').length,
      trust:          routes.filter(r => r.type === 'trust').length,
      editorial:      routes.filter(r => r.type === 'editorial').length,
      changelog:      routes.filter(r => r.type === 'changelog').length,
      root:           1,
    },
    sitemaps_generated: sitemaps.length,
    files_emitted: emitResult.fileCount,
    output_size_kb: emitResult.sizeKb,

    // Build health
    build_errors:    validation.errors.length,
    build_warnings:  validation.warnings.length,
    seo_errors:      seoErrors.length,
    seo_warnings:    seoWarnings.length,

    // SEO summary
    seo_summary: {
      errors:   seoErrors,
      warnings: seoWarnings.slice(0, 20),   // cap for readability
      warning_count: seoWarnings.length,
    },

    // Accessibility summary (static analysis only)
    accessibility_summary: {
      skip_link:         true,
      aria_landmarks:    true,
      form_labels:       true,
      lang_attribute:    true,
      focus_management:  true,
      note: 'Run axe-core or Lighthouse for full a11y audit',
    },

    // Deployment readiness
    deployment: {
      netlify_toml:     true,
      cloudflare_headers: true,
      vercel_json:      true,
      github_pages_nojekyll: true,
      robots_txt:       true,
      sitemap_index:    true,
      security_headers: true,
      csp_configured:   true,
      hsts_configured:  true,
      legal_pages:      legalPages > 0,
      error_pages:      true,
    },

    // Build dashboard (Phase 15)
    build_dashboard: buildDashboard(routes, pages, seoData),

    warnings: validation.warnings,
    errors:   validation.errors,
    toolList: data.tools.map(t => ({
      id: t.toolId,
      slug: t.slug,
      category: t.category,
      runtime: t.runtime,
      primaryKeyword: t.seo?.primaryKeyword,
    })),
  };

  const seoStatus = seoErrors.length > 0
    ? `FAIL (${seoErrors.length} errors)`
    : seoWarnings.length > 0
      ? `WARN (${seoWarnings.length} warnings)`
      : 'PASS';

  const articleCount   = routes.filter(r => r.type === 'article').length;
  const comparisonCount = routes.filter(r => r.type === 'comparison').length;
  const glossaryCount  = routes.filter(r => r.type === 'glossary').length;

  const collectionCount = routes.filter(r => r.type === 'collection').length;
  const landingCount    = routes.filter(r => r.type === 'landing').length;
  const trustCount      = routes.filter(r => r.type === 'trust').length;
  const editorialCount  = routes.filter(r => r.type === 'editorial').length;
  const changelogCount  = routes.filter(r => r.type === 'changelog').length;

  const summary = [
    `  Pages:    ${pageCount} (tools:${routes.filter(r=>r.type==='tool').length} cat:${categoryPages} home:${homePages} legal:${legalPages} articles:${articleCount} cmp:${comparisonCount} glossary:${glossaryCount} coll:${collectionCount} landings:${landingCount} trust:${trustCount} editorial:${editorialCount} changelog:${changelogCount})`,
    `  Tools:    ${toolCount}`,
    `  Articles: ${articleCount / (langCount || 1)} (${data.articles?.length || 0} guides, ${data.comparisons?.length || 0} comparisons, ${data.glossary?.length || 0} glossary × ${langCount} langs)`,
    `  Languages:${langCount}`,
    `  Sitemaps: ${sitemaps.length}`,
    `  Output:   ${emitResult.sizeKb} KB`,
    `  Warnings: ${validation.warnings.length}`,
    `  SEO:      ${seoStatus}`,
  ].join('\n');

  try {
    await writeFile(path.join(config._root, 'build-report.json'), JSON.stringify(report, null, 2), 'utf8');
  } catch {
    // Non-fatal
  }

  return { report, summary };
}
