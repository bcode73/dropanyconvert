/**
 * Generates per-language sitemaps and a root sitemap index.
 * Returns array of { path, content } objects.
 */

export async function generateSitemaps(routes, config) {
  const baseUrl = config.site.baseUrl;
  const lastmod = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const langCodes = [...new Set(
    routes.filter(r => r.type !== 'root').map(r => r.lang)
  )];

  const sitemaps = [];

  // Per-language sitemap
  for (const lang of langCodes) {
    const knowledgeTypes = new Set(['tool','category','home','legal','article','comparison','glossary','guides-index','compare-index','glossary-index','collection','collections-index','landing','faq-hub']);
    const langRoutes = routes.filter(r => r.lang === lang && knowledgeTypes.has(r.type));

    // Deterministic order: home → categories → guides-index → compare-index → glossary-index → articles → comparisons → glossary → tools → legal
    const sorted = [...langRoutes].sort((a, b) => {
      const order = { home: 0, category: 1, 'guides-index': 2, 'compare-index': 3, 'glossary-index': 4, 'collections-index': 5, 'faq-hub': 5, article: 6, comparison: 7, glossary: 8, collection: 8, landing: 8, tool: 9, legal: 10 };
      return (order[a.type] ?? 10) - (order[b.type] ?? 10) || a.path.localeCompare(b.path);
    });

    const urls = sorted.map(r => {
      const priorityMap = { home: '1.0', category: '0.9', 'guides-index': '0.8', 'compare-index': '0.8', 'glossary-index': '0.7', 'collections-index': '0.8', 'faq-hub': '0.7', article: '0.7', comparison: '0.7', glossary: '0.6', collection: '0.8', landing: '0.8', legal: '0.3' };
      const changefreqMap = { home: 'weekly', category: 'weekly', 'guides-index': 'weekly', 'compare-index': 'weekly', 'glossary-index': 'weekly', 'collections-index': 'weekly', 'faq-hub': 'monthly', article: 'monthly', comparison: 'monthly', glossary: 'monthly', collection: 'weekly', landing: 'monthly', legal: 'yearly' };
      const priority   = priorityMap[r.type] || '0.8';
      const changefreq = changefreqMap[r.type] || 'monthly';
      return `  <url>
    <loc>${baseUrl}${r.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
    }).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>`;

    sitemaps.push({ path: `/sitemap-${lang}.xml`, content: xml });
  }

  // Root sitemap index — sorted alphabetically for deterministic output
  const indexEntries = [...langCodes].sort().map(lang =>
    `  <sitemap>
    <loc>${baseUrl}/sitemap-${lang}.xml</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>`
  ).join('\n');

  const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexEntries}
</sitemapindex>`;

  sitemaps.push({ path: '/sitemap.xml', content: indexXml });

  return sitemaps;
}
