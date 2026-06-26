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
