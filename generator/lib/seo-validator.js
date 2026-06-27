/**
 * Content quality score: rates pages on internal links, schema, FAQ, entity coverage.
 * Returns a score object rather than modifying errors/warnings.
 */
function computeContentQuality(routes, seoData, data) {
  const entitySlugs = new Set((data.entities || []).map(e => e.slug));

  let totalScore  = 0;
  let scoredPages = 0;

  const toolRoutes = routes.filter(r => r.type === 'tool');
  for (const route of toolRoutes) {
    const seo  = seoData.get(route.path);
    if (!seo) continue;
    const tool = route.tool;
    let score  = 0;

    if (seo.schemas?.length > 0)                          score += 20; // schema present
    if (seo.schemas?.find(s => s['@type'] === 'FAQPage')) score += 20; // FAQ schema
    if (seo.breadcrumbs?.length > 0)                      score += 10; // breadcrumbs
    if ((tool.relatedTools || []).length > 0)             score += 15; // internal links
    if ((tool.features || []).length > 0)                 score += 10; // feature content
    if ((tool.faq || []).length >= 3)                     score += 15; // sufficient FAQ
    const hasMimeEntity = (tool.inputFormats || []).some(m =>
      entitySlugs.has(m.split('/')[1]?.toLowerCase())
    );
    if (hasMimeEntity)                                    score += 10; // entity coverage

    totalScore  += Math.min(score, 100);
    scoredPages += 1;
  }

  const avgScore = scoredPages > 0 ? Math.round(totalScore / scoredPages) : 0;

  const articleRoutes = routes.filter(r => r.type === 'article');
  let articleScore = 0;
  for (const route of articleRoutes) {
    const article = route.article;
    let s = 0;
    if ((article.sections || []).length >= 3) s += 30;
    if ((article.faq     || []).length >= 2)  s += 25;
    if ((article.relatedTools || []).length > 0) s += 20;
    if (article.reviewedBy)                   s += 15;
    if (article.lastUpdated)                  s += 10;
    articleScore += Math.min(s, 100);
  }
  const avgArticleScore = articleRoutes.length > 0 ? Math.round(articleScore / articleRoutes.length) : 0;

  return {
    tool_pages_avg:    `${avgScore}/100`,
    article_pages_avg: `${avgArticleScore}/100`,
    scored_tool_pages: scoredPages,
    scored_article_pages: articleRoutes.length,
  };
}

/**
 * Post-generation SEO quality validator.
 * Runs after generateSeo() so it can inspect the full SEO dataset.
 * Critical errors fail the build. Warnings are logged only.
 */

export function validateSeo(routes, seoData, data) {
  const errors = [];
  const warnings = [];

  // Group titles and H1s by language — cross-language duplicates are expected
  // for untranslated tools and are not an SEO problem (hreflang handles it).
  const titlesByLang = {};
  const h1sByLang    = {};

  for (const [routePath, seo] of seoData) {
    // Missing title
    if (!seo.title) {
      errors.push(`SEO: missing title at ${routePath}`);
      continue;
    }

    // Missing description
    if (!seo.description) {
      warnings.push(`SEO: missing meta description at ${routePath}`);
    }

    const lang = routePath.split('/')[1] || 'root';

    // Duplicate titles within the same language (critical)
    if (!titlesByLang[lang]) titlesByLang[lang] = new Map();
    if (titlesByLang[lang].has(seo.title)) {
      errors.push(`SEO: duplicate title within "${lang}": "${seo.title}" at ${routePath} and ${titlesByLang[lang].get(seo.title)}`);
    } else {
      titlesByLang[lang].set(seo.title, routePath);
    }

    // Duplicate H1s within same language
    if (seo.h1) {
      if (!h1sByLang[lang]) h1sByLang[lang] = new Map();
      if (h1sByLang[lang].has(seo.h1)) {
        warnings.push(`SEO: duplicate H1 "${seo.h1}" (${lang}) at ${routePath} and ${h1sByLang[lang].get(seo.h1)}`);
      } else {
        h1sByLang[lang].set(seo.h1, routePath);
      }
    }
  }

  // Missing H1 on content pages (error — critical for SEO)
  // Exclude home, root, and index pages which generate H1 dynamically
  const H1_REQUIRED_TYPES = new Set(['tool', 'category', 'article', 'comparison', 'glossary', 'legal', 'trust', 'editorial', 'changelog', 'intent', 'how-to-index', 'platform', 'use-case', 'feature', 'format-faq']);
  for (const route of routes) {
    if (!H1_REQUIRED_TYPES.has(route.type)) continue;
    const seo = seoData.get(route.path);
    if (seo && !seo.h1) {
      errors.push(`SEO: missing H1 at ${route.path}`);
    }
  }

  // Missing breadcrumbs on content pages (warning — important for structured data)
  const CRUMB_REQUIRED_TYPES = new Set(['tool', 'category', 'article', 'comparison', 'glossary', 'legal', 'trust', 'editorial', 'changelog', 'intent', 'platform', 'use-case', 'feature', 'format-faq']);
  for (const route of routes) {
    if (!CRUMB_REQUIRED_TYPES.has(route.type)) continue;
    const seo = seoData.get(route.path);
    if (seo && (!seo.breadcrumbs || seo.breadcrumbs.length === 0)) {
      warnings.push(`SEO: missing breadcrumbs at ${route.path}`);
    }
  }

  // Missing schemas on tool pages
  for (const route of routes) {
    if (route.type !== 'tool') continue;
    const seo = seoData.get(route.path);
    if (!seo?.schemas?.length) {
      warnings.push(`SEO: no structured data schemas on tool page ${route.path}`);
    }
    if (!seo?.schemas?.find(s => s['@type'] === 'FAQPage')) {
      warnings.push(`SEO: no FAQPage schema on tool page ${route.path}`);
    }
  }

  // Missing schemas on article pages (warning)
  for (const route of routes) {
    if (route.type !== 'article') continue;
    const seo = seoData.get(route.path);
    if (!seo?.schemas?.find(s => s['@type'] === 'Article' || s['@type'] === 'TechArticle')) {
      warnings.push(`SEO: no Article schema on article page ${route.path}`);
    }
  }

  // Duplicate descriptions within same language
  const descByLang = {};
  for (const [routePath, seo] of seoData) {
    if (!seo.description) continue;
    const lang = routePath.split('/')[1] || 'root';
    if (!descByLang[lang]) descByLang[lang] = new Map();
    if (descByLang[lang].has(seo.description)) {
      warnings.push(`SEO: duplicate description within "${lang}" at ${routePath}`);
    } else {
      descByLang[lang].set(seo.description, routePath);
    }
  }

  // Orphan tools (not assigned to any category)
  const catToolSlugs = new Set(
    data.categories.flatMap(c => data.tools.filter(t => t.category === c.id).map(t => t.slug))
  );
  for (const tool of data.tools) {
    if (!catToolSlugs.has(tool.slug)) {
      warnings.push(`SEO: orphan tool "${tool.toolId}" — not reachable from any category page`);
    }
  }

  // Missing relatedTools (reduces internal linking)
  for (const tool of data.tools) {
    if (!tool.relatedTools || tool.relatedTools.length === 0) {
      warnings.push(`SEO: tool "${tool.toolId}" has no relatedTools (reduces internal linking)`);
    }
  }

  // Content Quality Score — thin pages, missing FAQs, poor internal linking
  const qualityScore = computeContentQuality(routes, seoData, data);

  return { errors, warnings, qualityScore };
}
