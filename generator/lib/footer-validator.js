/**
 * Phase 33 — Footer validator for premium redesign.
 */
export function validateFooter(pages, config) {
  const errors   = [];
  const warnings = [];
  const stats    = {
    pages_checked:    0,
    columns:          0,
    total_links:      0,
    duplicate_links:  0,
    github_refs:      0,
    over_link_limit:  false,
    validation_score: 0,
  };

  const homePage = pages.find(p => p.path === '/en/index.html' || p.path === '/index.html');
  if (!homePage) { warnings.push('Home page not found for footer validation'); return { errors, warnings, stats }; }

  stats.pages_checked = 1;
  const footerMatch = homePage.content.match(/<footer[\s\S]*?<\/footer>/i);
  if (!footerMatch) { warnings.push('Footer not found in home page'); return { errors, warnings, stats }; }

  const footerHtml = footerMatch[0];

  // Column count
  stats.columns = (footerHtml.match(/class="[^"]*dac-footer__col[^"]*"/g) || []).length;

  // Total links
  const hrefs = [...footerHtml.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
  stats.total_links = hrefs.length;

  // Duplicate links
  const seen = new Set();
  const dupes = new Set();
  for (const h of hrefs) { if (seen.has(h)) dupes.add(h); seen.add(h); }
  stats.duplicate_links = dupes.size;
  if (dupes.size > 0) warnings.push(`${dupes.size} duplicate link(s): ${[...dupes].slice(0,2).join(', ')}`);

  // GitHub references (must be zero)
  const ghRefs = (footerHtml.match(/github/gi) || []).length;
  stats.github_refs = ghRefs;
  if (ghRefs > 0) errors.push(`Footer contains ${ghRefs} GitHub reference(s) — must be removed`);

  // Link count sanity
  stats.over_link_limit = stats.total_links > 35;
  if (stats.over_link_limit) warnings.push(`Footer has ${stats.total_links} links — target is ≤30`);

  // Score
  let score = 100;
  score -= errors.length * 20;
  score -= stats.duplicate_links * 3;
  score -= Math.max(0, stats.total_links - 30) * 2;
  score -= stats.github_refs * 15;
  score -= warnings.filter(w => !w.includes('duplicate') && !w.includes('links')).length * 5;
  stats.validation_score = Math.max(0, Math.min(100, score));

  return { errors, warnings, stats };
}
