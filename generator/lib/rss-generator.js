/**
 * Phase 35 — RSS feed generator.
 * Generates /rss.xml, /guides.xml, /changelog.xml
 */

function escXml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildRssChannel({ title, description, link, items, buildDate }) {
  const itemsXml = items.slice(0, 50).map(item => `
  <item>
    <title>${escXml(item.title)}</title>
    <link>${escXml(item.link)}</link>
    <description>${escXml(item.description)}</description>
    <guid isPermaLink="true">${escXml(item.link)}</guid>
    ${item.pubDate ? `<pubDate>${item.pubDate}</pubDate>` : ''}
    ${item.category ? `<category>${escXml(item.category)}</category>` : ''}
  </item>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escXml(title)}</title>
    <link>${escXml(link)}</link>
    <description>${escXml(description)}</description>
    <language>en</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link href="${escXml(link + '/rss.xml')}" rel="self" type="application/rss+xml"/>
    ${itemsXml}
  </channel>
</rss>`;
}

export function generateRssFeeds(data, config) {
  const baseUrl = config.site.baseUrl;
  const buildDate = new Date().toUTCString();

  // Main RSS — articles + comparisons
  const allItems = [
    ...(data.articles || []).map(a => ({
      title: a.h1?.en || a.title?.en || a.slug,
      link: `${baseUrl}/en/guides/${a.slug}`,
      description: a.description?.en || a.intro?.en || '',
      pubDate: a.lastUpdated ? new Date(a.lastUpdated).toUTCString() : buildDate,
      category: 'Guide',
    })),
    ...(data.comparisons || []).map(c => ({
      title: c.h1?.en || `${c.subjectA} vs ${c.subjectB}`,
      link: `${baseUrl}/en/compare/${c.slug}`,
      description: c.description?.en || '',
      pubDate: c.lastUpdated ? new Date(c.lastUpdated).toUTCString() : buildDate,
      category: 'Comparison',
    })),
  ].sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  const mainFeed = {
    path: '/rss.xml',
    content: buildRssChannel({
      title: `${config.site.name} — Guides & Resources`,
      description: config.site.tagline || 'File conversion guides and resources',
      link: baseUrl,
      items: allItems,
      buildDate,
    }),
  };

  // Guides-only RSS
  const guideItems = (data.articles || []).map(a => ({
    title: a.h1?.en || a.title?.en || a.slug,
    link: `${baseUrl}/en/guides/${a.slug}`,
    description: a.description?.en || a.intro?.en || '',
    pubDate: a.lastUpdated ? new Date(a.lastUpdated).toUTCString() : buildDate,
    category: 'Guide',
  })).sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  const guidesFeed = {
    path: '/guides.xml',
    content: buildRssChannel({
      title: `${config.site.name} — Guides`,
      description: 'File conversion guides and how-tos',
      link: `${baseUrl}/en/guides`,
      items: guideItems,
      buildDate,
    }),
  };

  // Changelog RSS
  const changelogItems = (data.changelog?.releases || []).map(r => ({
    title: `v${r.version} — ${r.title?.en || r.title || ''}`,
    link: `${baseUrl}/en/changelog`,
    description: (r.highlights || []).join('. '),
    pubDate: r.date ? new Date(r.date).toUTCString() : buildDate,
    category: 'Changelog',
  }));

  const changelogFeed = {
    path: '/changelog.xml',
    content: buildRssChannel({
      title: `${config.site.name} — Changelog`,
      description: 'Version history and release notes',
      link: `${baseUrl}/en/changelog`,
      items: changelogItems,
      buildDate,
    }),
  };

  return [mainFeed, guidesFeed, changelogFeed];
}
