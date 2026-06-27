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

  return { errors, warnings };
}
