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
    const knowledgeTypes = new Set(['tool','category','home','legal','article','comparison','glossary','guides-index','compare-index','glossary-index']);
    const langRoutes = routes.filter(r => r.lang === lang && knowledgeTypes.has(r.type));

    // Deterministic order: home → categories → guides-index → compare-index → glossary-index → articles → comparisons → glossary → tools → legal
    const sorted = [...langRoutes].sort((a, b) => {
      const order = { home: 0, category: 1, 'guides-index': 2, 'compare-index': 3, 'glossary-index': 4, article: 5, comparison: 6, glossary: 7, tool: 8, legal: 9 };
      return (order[a.type] ?? 10) - (order[b.type] ?? 10) || a.path.localeCompare(b.path);
    });

    const urls = sorted.map(r => {
      const priorityMap = { home: '1.0', category: '0.9', 'guides-index': '0.8', 'compare-index': '0.8', 'glossary-index': '0.7', article: '0.7', comparison: '0.7', glossary: '0.6', legal: '0.3' };
      const changefreqMap = { home: 'weekly', category: 'weekly', 'guides-index': 'weekly', 'compare-index': 'weekly', 'glossary-index': 'weekly', article: 'monthly', comparison: 'monthly', glossary: 'monthly', legal: 'yearly' };
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
