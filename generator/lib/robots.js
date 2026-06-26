/**
 * Generates robots.txt.
 */

export async function generateRobots(config) {
  const baseUrl = config.site.baseUrl;

  const content = `User-agent: *
Allow: /

Disallow: /generator/
Disallow: /data/
Disallow: /dist/
Disallow: /node_modules/

Sitemap: ${baseUrl}/sitemap.xml
`;

  return { path: '/robots.txt', content };
}
