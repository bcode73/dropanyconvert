/**
 * Generates robots.txt.
 */

export async function generateRobots(config) {
  const baseUrl = config.site.baseUrl;

  const content = `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`;

  return { path: '/robots.txt', content };
}
