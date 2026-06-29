/**
 * Phase 33 — Footer validation.
 */
export function validateFooter(pages, config) {
  const errors   = [];
  const warnings = [];
  const stats    = { pages_checked: 0, duplicate_links: 0, empty_columns: 0, total_links: 0 };

  // Sample footer from first English home page
  const homePage = pages.find(p => p.path === '/en/index.html' || p.path === '/index.html');
  if (!homePage) return { errors, warnings, stats };

  stats.pages_checked = 1;

  // Extract all footer links
  const footerMatch = homePage.content.match(/<footer[\s\S]*?<\/footer>/i);
  if (!footerMatch) {
    warnings.push('Footer not found in home page');
    return { errors, warnings, stats };
  }
  const footerHtml = footerMatch[0];

  // Check for duplicate hrefs
  const hrefMatches = [...footerHtml.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
  stats.total_links = hrefMatches.length;
  const seen = new Set();
  const dupes = new Set();
  for (const href of hrefMatches) {
    if (seen.has(href)) dupes.add(href);
    seen.add(href);
  }
  stats.duplicate_links = dupes.size;
  if (dupes.size > 0) {
    warnings.push(`Footer has ${dupes.size} duplicate link(s): ${[...dupes].slice(0, 3).join(', ')}`);
  }

  // Check for empty columns (column title with no links following)
  const emptyColMatches = footerHtml.match(/dac-footer__col-title[\s\S]*?<\/p>\s*<\/div>/g);
  if (emptyColMatches) {
    stats.empty_columns = emptyColMatches.length;
    warnings.push(`${emptyColMatches.length} empty footer column(s) detected`);
  }

  const validationScore = Math.max(0, 100 - (stats.duplicate_links * 5) - (stats.empty_columns * 10) - (errors.length * 20) - (warnings.length * 2));

  return { errors, warnings, stats: { ...stats, validation_score: validationScore } };
}
