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
    } else if (route.type === 'article') {
      route.hreflang = data.languages.map(lang => ({
        lang: lang.hreflang,
        url: `${config.site.baseUrl}/${lang.code}/guides/${route.slug}`,
      }));
      route.hreflangDefault = `${config.site.baseUrl}/${config.languages.default}/guides/${route.slug}`;
    } else if (route.type === 'comparison') {
      route.hreflang = data.languages.map(lang => ({
        lang: lang.hreflang,
        url: `${config.site.baseUrl}/${lang.code}/compare/${route.slug}`,
      }));
      route.hreflangDefault = `${config.site.baseUrl}/${config.languages.default}/compare/${route.slug}`;
    } else if (route.type === 'glossary') {
      route.hreflang = data.languages.map(lang => ({
        lang: lang.hreflang,
        url: `${config.site.baseUrl}/${lang.code}/glossary/${route.slug}`,
      }));
      route.hreflangDefault = `${config.site.baseUrl}/${config.languages.default}/glossary/${route.slug}`;
    } else if (route.type === 'guides-index') {
      route.hreflang = data.languages.map(lang => ({
        lang: lang.hreflang,
        url: `${config.site.baseUrl}/${lang.code}/guides`,
      }));
      route.hreflangDefault = `${config.site.baseUrl}/${config.languages.default}/guides`;
    } else if (route.type === 'compare-index') {
      route.hreflang = data.languages.map(lang => ({
        lang: lang.hreflang,
        url: `${config.site.baseUrl}/${lang.code}/compare`,
      }));
      route.hreflangDefault = `${config.site.baseUrl}/${config.languages.default}/compare`;
    } else if (route.type === 'glossary-index') {
      route.hreflang = data.languages.map(lang => ({
        lang: lang.hreflang,
        url: `${config.site.baseUrl}/${lang.code}/glossary`,
      }));
      route.hreflangDefault = `${config.site.baseUrl}/${config.languages.default}/glossary`;
    } else if (route.type === 'collection') {
      route.hreflang = data.languages.map(lang => ({
        lang: lang.hreflang,
        url: `${config.site.baseUrl}/${lang.code}/collections/${route.slug}`,
      }));
      route.hreflangDefault = `${config.site.baseUrl}/${config.languages.default}/collections/${route.slug}`;
    } else if (route.type === 'collections-index') {
      route.hreflang = data.languages.map(lang => ({
        lang: lang.hreflang,
        url: `${config.site.baseUrl}/${lang.code}/collections`,
      }));
      route.hreflangDefault = `${config.site.baseUrl}/${config.languages.default}/collections`;
    } else if (route.type === 'landing') {
      route.hreflang = data.languages.map(lang => ({
        lang: lang.hreflang,
        url: `${config.site.baseUrl}/${lang.code}/for/${route.slug}`,
      }));
      route.hreflangDefault = `${config.site.baseUrl}/${config.languages.default}/for/${route.slug}`;
    } else if (route.type === 'faq-hub') {
      route.hreflang = data.languages.map(lang => ({
        lang: lang.hreflang,
        url: `${config.site.baseUrl}/${lang.code}/faq`,
      }));
      route.hreflangDefault = `${config.site.baseUrl}/${config.languages.default}/faq`;
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
