import { createHash } from 'crypto';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

/**
 * Freshness Engine — tracks content hashes for articles, comparisons, and glossary.
 * Compares current hashes against stored hashes to detect stale content.
 * Writes updated hashes to data/freshness.json.
 */

function hashContent(item) {
  const stable = JSON.stringify({
    sections: item.sections,
    body: item.body,
    definition: item.definition,
    comparisonTable: item.comparisonTable,
  });
  return createHash('md5').update(stable).digest('hex').slice(0, 12);
}

export async function runFreshnessEngine(data, config) {
  const freshnessPath = path.join(config._dataDir, 'freshness.json');

  let stored = {};
  try {
    stored = JSON.parse(await readFile(freshnessPath, 'utf8'));
  } catch {
    // First run — no stored hashes yet
  }

  const now = new Date().toISOString().split('T')[0];
  const updated = { ...stored };
  const staleItems = [];
  const newItems   = [];

  const allItems = [
    ...(data.articles    || []).map(a => ({ item: a, type: 'article',    key: `article:${a.slug}` })),
    ...(data.comparisons || []).map(c => ({ item: c, type: 'comparison', key: `comparison:${c.slug}` })),
    ...(data.glossary    || []).map(g => ({ item: g, type: 'glossary',   key: `glossary:${g.slug}` })),
  ];

  for (const { item, type, key } of allItems) {
    const hash = hashContent(item);
    const entry = stored[key];

    if (!entry) {
      // First time seeing this item
      updated[key] = {
        hash,
        publishedDate: item.publishedDate || item.lastUpdated || now,
        lastReviewed:  now,
        version: item.version || '1.0',
      };
      newItems.push(`${type}:${item.slug}`);
    } else if (entry.hash !== hash) {
      // Content changed since last build
      updated[key] = {
        hash,
        publishedDate: entry.publishedDate || item.publishedDate || item.lastUpdated || now,
        lastReviewed:  now,
        version: item.version || entry.version || '1.0',
      };
      staleItems.push(`${type}:${item.slug}`);
    } else {
      // Unchanged — preserve stored entry but ensure publishedDate is set
      updated[key] = {
        ...entry,
        publishedDate: entry.publishedDate || item.publishedDate || item.lastUpdated || now,
      };
    }
  }

  try {
    await writeFile(freshnessPath, JSON.stringify(updated, null, 2), 'utf8');
  } catch {
    // Non-fatal — freshness tracking is best-effort
  }

  return { hashes: updated, staleItems, newItems };
}

/**
 * Returns freshness metadata for a given item key.
 * Falls back gracefully when freshness data is unavailable.
 */
function getFreshnessEntry(hashes, type, slug) {
  return hashes[`${type}:${slug}`] || null;
}
