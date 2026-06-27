/**
 * Builds the route registry from validated tool and language data.
 * Detects reserved slug collisions and tool vs. category slug conflicts.
 */

const RESERVED_SLUGS = new Set([
  'admin', 'api', 'static', 'assets', 'dist', 'generator', 'data',
  'sitemap', 'robots', 'manifest', 'favicon', 'sw', 'service-worker',
  'privacy-policy', 'terms-of-service', 'cookie-policy',
  'blog', 'category', 'categories', 'search',
]);

export async function buildRegistry(data, config) {
  const errors = [];
  const routes = [];

  // Index category slugs so tool slugs can be checked against them
  const categorySlugs = new Set(data.categories.map(c => c.slug));

  for (const tool of data.tools) {
    // Reserved slug check
    if (RESERVED_SLUGS.has(tool.slug)) {
      errors.push(`Tool slug "${tool.slug}" conflicts with a reserved keyword`);
      continue;
    }

    // Tool slug vs. category slug collision
    if (categorySlugs.has(tool.slug)) {
      errors.push(`Tool slug "${tool.slug}" (toolId: ${tool.toolId}) conflicts with a category slug — they would occupy the same URL path`);
      continue;
    }

    for (const lang of data.languages) {
      const route = {
        type: 'tool',
        lang: lang.code,
        slug: tool.slug,
        path: `/${lang.code}/${tool.slug}`,
        tool,
        language: lang,
      };
      routes.push(route);
    }
  }

  // Category hub routes
  for (const category of data.categories) {
    for (const lang of data.languages) {
      routes.push({
        type: 'category',
        lang: lang.code,
        slug: category.slug,
        path: `/${lang.code}/${category.slug}`,
        category,
        language: lang,
        tools: data.tools.filter(t => t.category === category.id),
      });
    }
  }

  // Home routes per language
  for (const lang of data.languages) {
    routes.push({
      type: 'home',
      lang: lang.code,
      slug: '',
      path: `/${lang.code}`,
      language: lang,
    });
  }

  // Legal page routes (per language)
  if (data.legal?.pages) {
    for (const [, legalPage] of Object.entries(data.legal.pages)) {
      for (const lang of data.languages) {
        routes.push({
          type: 'legal',
          lang: lang.code,
          slug: legalPage.slug,
          path: `/${lang.code}/${legalPage.slug}`,
          legal: legalPage,
          language: lang,
        });
      }
    }
  }

  // Article (guide) routes
  for (const article of (data.articles || [])) {
    for (const lang of data.languages) {
      routes.push({
        type: 'article',
        lang: lang.code,
        slug: article.slug,
        path: `/${lang.code}/guides/${article.slug}`,
        article,
        language: lang,
      });
    }
  }

  // Guides index per language
  if ((data.articles || []).length > 0) {
    for (const lang of data.languages) {
      routes.push({
        type: 'guides-index',
        lang: lang.code,
        slug: 'guides',
        path: `/${lang.code}/guides`,
        articles: data.articles,
        language: lang,
      });
    }
  }

  // Comparison routes
  for (const comparison of (data.comparisons || [])) {
    for (const lang of data.languages) {
      routes.push({
        type: 'comparison',
        lang: lang.code,
        slug: comparison.slug,
        path: `/${lang.code}/compare/${comparison.slug}`,
        comparison,
        language: lang,
      });
    }
  }

  // Compare index per language
  if ((data.comparisons || []).length > 0) {
    for (const lang of data.languages) {
      routes.push({
        type: 'compare-index',
        lang: lang.code,
        slug: 'compare',
        path: `/${lang.code}/compare`,
        comparisons: data.comparisons,
        language: lang,
      });
    }
  }

  // Glossary term routes
  for (const term of (data.glossary || [])) {
    for (const lang of data.languages) {
      routes.push({
        type: 'glossary',
        lang: lang.code,
        slug: term.slug,
        path: `/${lang.code}/glossary/${term.slug}`,
        term,
        language: lang,
      });
    }
  }

  // Glossary index per language
  if ((data.glossary || []).length > 0) {
    for (const lang of data.languages) {
      routes.push({
        type: 'glossary-index',
        lang: lang.code,
        slug: 'glossary',
        path: `/${lang.code}/glossary`,
        terms: data.glossary,
        language: lang,
      });
    }
  }

  // Collection routes
  for (const collection of (data.collections || [])) {
    for (const lang of data.languages) {
      routes.push({
        type: 'collection',
        lang: lang.code,
        slug: collection.slug,
        path: `/${lang.code}/collections/${collection.slug}`,
        collection,
        language: lang,
        tools: (collection.toolSlugs || []).map(s => data.tools.find(t => t.slug === s)).filter(Boolean),
      });
    }
  }

  // Collections index per language
  if ((data.collections || []).length > 0) {
    for (const lang of data.languages) {
      routes.push({
        type: 'collections-index',
        lang: lang.code,
        slug: 'collections',
        path: `/${lang.code}/collections`,
        collections: data.collections,
        language: lang,
      });
    }
  }

  // Landing page routes
  for (const landing of (data.landings || [])) {
    for (const lang of data.languages) {
      routes.push({
        type: 'landing',
        lang: lang.code,
        slug: landing.slug,
        path: `/${lang.code}/for/${landing.slug}`,
        landing,
        language: lang,
        tools: (landing.toolSlugs || []).map(s => data.tools.find(t => t.slug === s)).filter(Boolean),
      });
    }
  }

  // FAQ Hub per language
  for (const lang of data.languages) {
    routes.push({
      type: 'faq-hub',
      lang: lang.code,
      slug: 'faq',
      path: `/${lang.code}/faq`,
      language: lang,
    });
  }

  // Trust Center per language
  if (data.trust) {
    for (const lang of data.languages) {
      routes.push({
        type: 'trust',
        lang: lang.code,
        slug: 'trust',
        path: `/${lang.code}/trust`,
        trust: data.trust,
        language: lang,
      });
    }
  }

  // Editorial pages per language
  for (const page of (data.editorial?.pages || [])) {
    for (const lang of data.languages) {
      routes.push({
        type: 'editorial',
        lang: lang.code,
        slug: page.slug,
        path: `/${lang.code}/editorial/${page.slug}`,
        editorialPage: page,
        language: lang,
      });
    }
  }

  // Changelog per language
  if ((data.changelog?.releases || []).length > 0) {
    for (const lang of data.languages) {
      routes.push({
        type: 'changelog',
        lang: lang.code,
        slug: 'changelog',
        path: `/${lang.code}/changelog`,
        changelog: data.changelog,
        language: lang,
      });
    }
  }

  // Entity routes per language
  for (const entity of (data.entities || [])) {
    for (const lang of data.languages) {
      routes.push({
        type: 'entity',
        lang: lang.code,
        slug: entity.slug,
        path: `/${lang.code}/entity/${entity.slug}`,
        entity,
        language: lang,
      });
    }
  }

  // Entity index per language
  if ((data.entities || []).length > 0) {
    for (const lang of data.languages) {
      routes.push({
        type: 'entity-index',
        lang: lang.code,
        slug: 'entity',
        path: `/${lang.code}/entity`,
        entities: data.entities,
        language: lang,
      });
    }
  }

  // Author routes per language
  for (const author of (data.authors || [])) {
    for (const lang of data.languages) {
      routes.push({
        type: 'author',
        lang: lang.code,
        slug: author.slug,
        path: `/${lang.code}/author/${author.slug}`,
        author,
        language: lang,
      });
    }
  }

  // ── Phase 17: Programmatic Long-tail SEO routes ─────────────────────────

  const toolBySlug = new Map(data.tools.map(t => [t.slug, t]));

  // Intent pages: /en/how-to/{intent-slug}-{modifier-slug}
  for (const intent of (data.intents || [])) {
    const tool = toolBySlug.get(intent.toolSlug);
    if (!tool) continue;
    for (const modifier of (intent.modifiers || [])) {
      const pageSlug = `${intent.slug}-${modifier.slug}`;
      for (const lang of data.languages) {
        routes.push({
          type: 'intent',
          lang: lang.code,
          slug: pageSlug,
          path: `/${lang.code}/how-to/${pageSlug}`,
          intent,
          modifier,
          pageSlug,
          tool,
          language: lang,
        });
      }
    }
  }

  // How-to index per language
  if ((data.intents || []).length > 0) {
    for (const lang of data.languages) {
      routes.push({
        type: 'how-to-index',
        lang: lang.code,
        slug: 'how-to',
        path: `/${lang.code}/how-to`,
        intents: data.intents,
        language: lang,
      });
    }
  }

  // Platform pages: /en/platform/{slug}
  for (const platform of (data.platforms || [])) {
    for (const lang of data.languages) {
      // Filter tools by category, optionally by mobile capability
      let filteredTools = data.tools.filter(t => t.category === platform.category);
      if (platform.mobileOnly) {
        filteredTools = filteredTools.filter(t => (t.capabilities || []).includes('mobile-supported'));
      }
      routes.push({
        type: 'platform',
        lang: lang.code,
        slug: platform.slug,
        path: `/${lang.code}/platform/${platform.slug}`,
        platform,
        tools: filteredTools,
        language: lang,
      });
    }
  }

  // Use-case pages: /en/use-case/{slug}
  for (const useCase of (data.useCases || [])) {
    for (const lang of data.languages) {
      const tools = (useCase.toolSlugs || []).map(s => toolBySlug.get(s)).filter(Boolean);
      routes.push({
        type: 'use-case',
        lang: lang.code,
        slug: useCase.slug,
        path: `/${lang.code}/use-case/${useCase.slug}`,
        useCase,
        tools,
        language: lang,
      });
    }
  }

  // Feature pages: /en/feature/{slug}
  for (const feature of (data.features || [])) {
    for (const lang of data.languages) {
      const cap = feature.capability;
      const featureTools = cap === 'browser-native' || cap === 'privacy' || cap === 'offline' || cap === 'fast'
        ? data.tools  // all tools qualify
        : data.tools.filter(t => (t.capabilities || []).includes(cap));
      routes.push({
        type: 'feature',
        lang: lang.code,
        slug: feature.slug,
        path: `/${lang.code}/feature/${feature.slug}`,
        feature,
        tools: featureTools,
        language: lang,
      });
    }
  }

  // Format FAQ pages: /en/faq/{entity-slug}  (entities with at least 1 FAQ item)
  for (const entity of (data.entities || [])) {
    if (!entity.faq || entity.faq.length === 0) continue;
    for (const lang of data.languages) {
      routes.push({
        type: 'format-faq',
        lang: lang.code,
        slug: entity.slug,
        path: `/${lang.code}/faq/${entity.slug}`,
        entity,
        language: lang,
        tools: (entity.relatedTools || []).map(s => toolBySlug.get(s)).filter(Boolean),
      });
    }
  }

  // Root redirect
  routes.push({
    type: 'root',
    lang: config.languages.default,
    slug: '',
    path: '/',
    language: data.languages.find(l => l.code === config.languages.default),
  });

  if (errors.length > 0) {
    throw new Error('Registry build failed:\n' + errors.join('\n'));
  }

  return { routes };
}
