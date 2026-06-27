/**
 * Resolves the final flat list of routes from the registry.
 * Adds hreflang alternates to each route.
 */

export async function generateRoutes(registry, data, config) {
  const routes = registry.routes;

  // Build a quick lookup: type+lang+slug → path
  const pathMap = new Map();
  for (const route of routes) {
    const key = `${route.type}:${route.lang}:${route.slug}`;
    pathMap.set(key, route.path);
  }

  // Attach hreflang alternates to all localised routes
  for (const route of routes) {
    if (route.type === 'tool' || route.type === 'category') {
      route.hreflang = data.languages.map(lang => ({
        lang: lang.hreflang,
        url: `${config.site.baseUrl}/${lang.code}/${route.slug}`,
      }));
      route.hreflangDefault = `${config.site.baseUrl}/${config.languages.default}/${route.slug}`;
    } else if (route.type === 'legal') {
      route.hreflang = data.languages.map(lang => ({
        lang: lang.hreflang,
        url: `${config.site.baseUrl}/${lang.code}/${route.slug}`,
      }));
      route.hreflangDefault = `${config.site.baseUrl}/${config.languages.default}/${route.slug}`;
    } else if (route.type === 'home') {
      route.hreflang = data.languages.map(lang => ({
        lang: lang.hreflang,
        url: `${config.site.baseUrl}/${lang.code}`,
      }));
      route.hreflangDefault = `${config.site.baseUrl}/${config.languages.default}`;
    }
  }

  return routes;
}
