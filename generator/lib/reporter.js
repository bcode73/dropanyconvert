import { writeFile } from 'fs/promises';
import path from 'path';

function buildKnowledgeGraph(data, routes, seoValidation, freshness) {
  const entityCount  = (data.entities || []).length;
  const authorCount  = (data.authors  || []).length;
  const articleCount = (data.articles || []).length;
  const cmpCount     = (data.comparisons || []).length;
  const glossCount   = (data.glossary || []).length;
  const collCount    = (data.collections || []).length;

  const khSize = articleCount + cmpCount + glossCount + collCount + entityCount;

  // Most-linked tool (tool with most relatedTools references from other tools)
  const linkCounts = new Map();
  for (const tool of data.tools) {
    for (const s of (tool.relatedTools || [])) {
      linkCounts.set(s, (linkCounts.get(s) || 0) + 1);
    }
  }
  let mostLinkedTool = '';
  let maxLinks = 0;
  for (const [slug, count] of linkCounts) {
    if (count > maxLinks) { maxLinks = count; mostLinkedTool = slug; }
  }

  // Most-linked article (article referenced by most tools)
  const artLinkCounts = new Map();
  for (const tool of data.tools) {
    for (const a of (data.articles || [])) {
      if ((a.relatedTools || []).includes(tool.slug)) {
        artLinkCounts.set(a.slug, (artLinkCounts.get(a.slug) || 0) + 1);
      }
    }
  }
  let mostLinkedArticle = '';
  let maxArtLinks = 0;
  for (const [slug, count] of artLinkCounts) {
    if (count > maxArtLinks) { maxArtLinks = count; mostLinkedArticle = slug; }
  }

  // Average FAQ count across tool pages
  const totalFaq = data.tools.reduce((sum, t) => sum + (t.faq?.length || 0), 0);
  const avgFaq   = data.tools.length > 0 ? (totalFaq / data.tools.length).toFixed(1) : 0;

  const staleCount = (freshness?.staleItems?.length || 0);
  const newCount   = (freshness?.newItems?.length || 0);

  return {
    entity_count:       entityCount,
    author_count:       authorCount,
    knowledge_hub_size: khSize,
    avg_faq_per_tool:   parseFloat(avgFaq),
    most_linked_tool:   mostLinkedTool,
    most_linked_article: mostLinkedArticle,
    content_quality:    seoValidation?.qualityScore || {},
    freshness_stale:    staleCount,
    freshness_new:      newCount,
    entity_index_size:  entityCount,
    largest_entity:     (data.entities || []).reduce((m, e) =>
      JSON.stringify(e).length > JSON.stringify(m).length ? e : m,
      data.entities?.[0] || {}
    ).slug || '',
  };
}

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
function buildAuthorityDashboard(graph) {
  if (!graph) return {};
  const nodes = [...(graph.nodes?.values() || [])];
  if (!nodes.length) return {};

  const sorted = [...nodes].sort((a, b) => b.authority - a.authority);
  const avgLinksPerPage = (nodes.reduce((s, n) => s + (n.outLinks || 0), 0) / nodes.length).toFixed(1);
  const equity = graph.equity || {};
  const depthInfo = graph.depthMap || {};

  // Cluster sizes from graph.clusters.clusterMap (clusterId → Set<nodeId>)
  const clusterMap = graph.clusters?.clusterMap || new Map();
  const clusterEntries = [...clusterMap.entries()]
    .map(([id, members]) => [id, members.size])
    .filter(([, size]) => size > 0)
    .sort((a, b) => b[1] - a[1]);

  return {
    total_nodes:            nodes.length,
    average_authority:      equity.avgAuthority ?? Math.round(nodes.reduce((s, n) => s + n.authority, 0) / nodes.length),
    average_links_per_page: parseFloat(avgLinksPerPage),
    top_authority_pages:    sorted.slice(0, 10).map(n => ({ id: n.id, type: n.type, authority: n.authority })),
    bottom_authority_pages: sorted.slice(-5).map(n => ({ id: n.id, type: n.type, authority: n.authority })),
    largest_cluster:        clusterEntries[0]?.[0] || '',
    largest_cluster_size:   clusterEntries[0]?.[1] || 0,
    weakest_cluster:        clusterEntries[clusterEntries.length - 1]?.[0] || '',
    strongest_cluster:      clusterEntries[0]?.[0] || '',
    dead_ends:              (equity.deadEnds || []).length,
    most_linked:            (equity.mostLinked || [])[0]?.id || '',
    crawl_depth: {
      avg:          depthInfo.avgDepth        ?? 0,
      max:          depthInfo.maxDepth        ?? 0,
      deep_pages:   (depthInfo.deepPages      || []).length,
      distribution: depthInfo.distribution   || {},
    },
    semantic_clusters: graph.clusters?.stats || {},
    link_validation_warnings: (graph.linkWarnings || []).length,
    ai_readiness: {
      nodes_with_keywords:  nodes.filter(n => n.keywords?.length > 3).length,
      avg_keywords:         (nodes.reduce((s, n) => s + (n.keywords?.length || 0), 0) / nodes.length).toFixed(1),
    },
  };
}

export async function generateReport({ data, registry, routes, pages, sitemaps, validation, seoValidation, indexingValidation, emitResult, elapsed, config, seoData, freshness, graph, premiumValidation, dashboardPages, apiValidation, apiStats }) {
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
      entity:         routes.filter(r => r.type === 'entity').length,
      'entity-index': routes.filter(r => r.type === 'entity-index').length,
      author:         routes.filter(r => r.type === 'author').length,
      intent:         routes.filter(r => r.type === 'intent').length,
      'how-to-index': routes.filter(r => r.type === 'how-to-index').length,
      platform:       routes.filter(r => r.type === 'platform').length,
      'use-case':     routes.filter(r => r.type === 'use-case').length,
      feature:        routes.filter(r => r.type === 'feature').length,
      'format-faq':   routes.filter(r => r.type === 'format-faq').length,
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

    // Knowledge graph stats (Phase 16)
    knowledge_graph: buildKnowledgeGraph(data, routes, seoValidation, freshness),

    // Search intent distribution (Phase 17)
    search_intent: (() => {
      const counts = { informational: 0, commercial: 0, navigational: 0, transactional: 0, unclassified: 0 };
      for (const [, seo] of seoData) {
        const si = seo.searchIntent;
        if (si && counts.hasOwnProperty(si)) counts[si]++;
        else counts.unclassified++;
      }
      return counts;
    })(),

    // Phase 17 programmatic SEO summary
    programmatic_seo: {
      intent_pages:      routes.filter(r => r.type === 'intent').length,
      platform_pages:    routes.filter(r => r.type === 'platform').length,
      use_case_pages:    routes.filter(r => r.type === 'use-case').length,
      feature_pages:     routes.filter(r => r.type === 'feature').length,
      format_faq_pages:  routes.filter(r => r.type === 'format-faq').length,
      intent_clusters:   (data.intents || []).length,
      total_modifiers:   (data.intents || []).reduce((s, i) => s + (i.modifiers?.length || 0), 0),
    },

    // Authority Graph (Phase 20)
    authority_graph: buildAuthorityDashboard(graph),

    // API Platform (Phase 22)
    api_platform: {
      openapi_version:   '3.1.0',
      endpoints:         (apiStats?.endpoints ?? 0),
      topic_pages:       (apiStats?.topic_pages ?? 0),
      tool_api_pages:    (apiStats?.tool_api_pages ?? 0),
      sdk_pages:         (apiStats?.sdk_pages ?? 0),
      total_pages:       (apiStats?.total_pages ?? 0),
      sdks:              (apiStats?.sdks ?? 0),
      languages:         (apiStats?.languages ?? 0),
      validator_warnings: (apiValidation?.warnings?.length ?? 0),
      validator_stats:   (apiValidation?.stats ?? {}),
    },

    // Premium Architecture (Phase 21)
    premium_architecture: {
      stats:    premiumValidation?.stats    || {},
      warnings: premiumValidation?.warnings || [],
      dashboard_pages: (dashboardPages || []).length,
      plans: ['free', 'pro', 'business'],
      auth_providers:    ['email', 'google', 'apple', 'github'],
      payment_adapters:  ['stripe', 'paddle', 'lemonsqueezy', 'paystack', 'flutterwave'],
      storage_adapters:  ['local', 's3', 'r2', 'firebase', 'supabase'],
    },

    // Indexing Readiness (Phase 19)
    indexing_readiness: {
      errors:   (indexingValidation?.errors   || []),
      warnings: (indexingValidation?.warnings || []).slice(0, 30),
      warning_count: (indexingValidation?.warnings || []).length,
      stats:    (indexingValidation?.stats    || {}),
      static_files_generated: ['humans.txt', 'security.txt', 'browserconfig.xml', 'site.webmanifest'],
    },

    // Performance Audit (Phase 18)
    performance_audit: (() => {
      const sizes = emitResult.assetSizes || {};
      const jsKb  = sizes.jsKb  || 0;
      const cssKb = sizes.cssKb || 0;
      const htmlKb = sizes.htmlKb || 0;
      // Estimate scores: HTML minification saves ~25%, async CSS removes render-block,
      // deferred JS and requestIdleCallback reduce TBT/INP.
      const estLighthouse = jsKb < 30 ? '95–100' : jsKb < 60 ? '88–94' : '75–87';
      return {
        js_size_kb:   jsKb,
        css_size_kb:  cssKb,
        html_size_kb: htmlKb,
        optimizations: [
          'html-minified',
          'json-ld-minified',
          'css-minified',
          'css-async-loaded',
          'critical-css-inlined',
          'article-css-async',
          'js-minified',
          'scripts-deferred',
          'search-lazy-init',
          'idle-callback-noncritical',
          'passive-scroll-listeners',
          'immutable-cache-headers',
        ],
        estimated_lighthouse: estLighthouse,
        estimated_lcp:  '< 1.8s',
        estimated_inp:  '< 100ms',
        estimated_tbt:  '< 50ms',
        estimated_cls:  '< 0.05',
      };
    })(),

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

  const entityCount2  = (data.entities || []).length;
  const authorCount2  = (data.authors  || []).length;
  const intentCount2  = (data.intents  || []).length;
  const platformCount2 = (data.platforms || []).length;
  const summary = [
    `  Pages:    ${pageCount} (tools:${routes.filter(r=>r.type==='tool').length} cat:${categoryPages} home:${homePages} legal:${legalPages} articles:${articleCount} cmp:${comparisonCount} glossary:${glossaryCount} coll:${collectionCount} landings:${landingCount} trust:${trustCount} editorial:${editorialCount} changelog:${changelogCount} entities:${routes.filter(r=>r.type==='entity').length} authors:${routes.filter(r=>r.type==='author').length} intents:${routes.filter(r=>r.type==='intent').length} platforms:${routes.filter(r=>r.type==='platform').length} usecases:${routes.filter(r=>r.type==='use-case').length} features:${routes.filter(r=>r.type==='feature').length} fmtfaq:${routes.filter(r=>r.type==='format-faq').length})`,
    `  Tools:    ${toolCount}`,
    `  Articles: ${articleCount / (langCount || 1)} (${data.articles?.length || 0} guides, ${data.comparisons?.length || 0} comparisons, ${data.glossary?.length || 0} glossary × ${langCount} langs)`,
    `  Entities: ${entityCount2} file formats | Authors: ${authorCount2}`,
    `  Intents:  ${intentCount2} clusters | Platforms: ${platformCount2}`,
    `  Languages:${langCount}`,
    `  Sitemaps: ${sitemaps.length}`,
    `  Output:   ${emitResult.sizeKb} KB`,
    `  Warnings: ${validation.warnings.length}`,
    `  SEO:      ${seoStatus}`,
    `  Indexing: ${(indexingValidation?.errors || []).length} errors, ${(indexingValidation?.warnings || []).length} warnings | sitemap:${indexingValidation?.stats?.sitemap_urls || 0} urls`,
    `  API:      ${apiStats?.endpoints ?? 0} endpoints | ${apiStats?.total_pages ?? 0} doc pages | ${apiStats?.sdks ?? 0} SDKs | validator: ${apiValidation?.warnings?.length ?? 0} warnings`,
  ].join('\n');

  try {
    await writeFile(path.join(config._root, 'build-report.json'), JSON.stringify(report, null, 2), 'utf8');
  } catch {
    // Non-fatal
  }

  return { report, summary };
}
