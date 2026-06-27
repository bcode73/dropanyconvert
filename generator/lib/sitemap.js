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
    const langRoutes = routes.filter(r =>
      r.lang === lang && (r.type === 'tool' || r.type === 'category' || r.type === 'home')
    );

    // Deterministic order: home → categories → tools
    const sorted = [...langRoutes].sort((a, b) => {
      const order = { home: 0, category: 1, tool: 2 };
      return (order[a.type] ?? 3) - (order[b.type] ?? 3) || a.path.localeCompare(b.path);
    });

    const urls = sorted.map(r => {
      const priority   = r.type === 'home' ? '1.0' : r.type === 'category' ? '0.9' : '0.8';
      const changefreq = r.type === 'home' ? 'weekly' : r.type === 'category' ? 'weekly' : 'monthly';
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
