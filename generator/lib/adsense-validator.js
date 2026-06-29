/**
 * Phase 34 — AdSense readiness validator.
 * Checks that all required pages and trust signals are present.
 * Returns warnings only — never fails build.
 */

const REQUIRED_PATHS = [
  '/en/index.html',
  '/en/privacy-policy/index.html',
  '/en/terms-of-service/index.html',
  '/en/cookie-policy/index.html',
  '/en/disclaimer/index.html',
  '/en/accessibility/index.html',
  '/en/about/index.html',
  '/en/contact/index.html',
  '/en/trust/index.html',
];

const PLACEHOLDER_PATTERNS = [
  /lorem ipsum/i,
  /placeholder text/i,
  /coming soon/i,
  /under construction/i,
  /TODO/,
  /\[INSERT/i,
  /ca-pub-XXXX/i,
];

export function validateAdsenseReadiness(pages, sitemaps, robots, config) {
  const warnings = [];
  const missingPages = [];
  const trustSignals = [];

  // Index pages by path
  const pageMap = new Map(pages.map(p => [p.path, p]));

  // 1. Required pages
  for (const path of REQUIRED_PATHS) {
    if (!pageMap.has(path)) {
      missingPages.push(path);
      warnings.push(`Missing required page: ${path}`);
    }
  }

  // 2. Sitemap present
  const hasSitemap = (sitemaps || []).some(s => s.path === '/sitemap.xml' || s.path === '/sitemap-en.xml');
  if (!hasSitemap) warnings.push('No sitemap found');
  else trustSignals.push('sitemap');

  // 3. Robots present
  if (!robots?.content) warnings.push('robots.txt missing or empty');
  else trustSignals.push('robots_txt');

  // 4. Placeholder text check (sample first 20 pages)
  let placeholderCount = 0;
  for (const page of pages.slice(0, 20)) {
    for (const pattern of PLACEHOLDER_PATTERNS) {
      if (pattern.test(page.content || '')) {
        placeholderCount++;
        warnings.push(`Placeholder text found on: ${page.path}`);
        break;
      }
    }
  }

  // 5. Duplicate title check
  const titles = new Map();
  let dupeTitleCount = 0;
  for (const page of pages) {
    const match = (page.content || '').match(/<title>([^<]+)<\/title>/i);
    if (match) {
      const title = match[1];
      if (titles.has(title)) {
        dupeTitleCount++;
        if (dupeTitleCount <= 3) warnings.push(`Duplicate title: "${title}" on ${page.path}`);
      } else {
        titles.set(title, page.path);
      }
    }
  }
  if (dupeTitleCount > 3) warnings.push(`...and ${dupeTitleCount - 3} more duplicate titles`);

  // 6. AdSense meta tag
  const homePage = pageMap.get('/en/index.html');
  if (homePage && homePage.content?.includes('google-adsense-account')) {
    trustSignals.push('adsense_meta_tag');
  } else {
    warnings.push('google-adsense-account meta tag not found on home page');
  }

  // 7. Google verification file
  const hasGoogleVerify = pages.some(p => p.path?.includes('google') && p.path?.endsWith('.html'));
  if (hasGoogleVerify) trustSignals.push('google_verification');
  else warnings.push('Google site verification file not found');

  // 8. Canonical on all pages
  let missingCanonical = 0;
  for (const page of pages.slice(0, 50)) {
    if (!(page.content || '').includes('rel="canonical"')) missingCanonical++;
  }
  if (missingCanonical > 0) warnings.push(`${missingCanonical} pages (sampled) missing canonical tag`);
  else trustSignals.push('canonicals');

  // 9. Trust signals from required pages present
  if (missingPages.length === 0) trustSignals.push('all_required_pages');
  if (REQUIRED_PATHS.every(p => pageMap.has(p))) trustSignals.push('complete_legal_set');

  // Score
  const totalChecks = REQUIRED_PATHS.length + 7;
  const passedChecks = totalChecks - warnings.length;
  const score = Math.max(0, Math.min(100, Math.round((passedChecks / totalChecks) * 100)));

  return {
    warnings,
    missingPages,
    trustSignals,
    stats: {
      score,
      passed_checks: passedChecks,
      total_checks: totalChecks,
      missing_pages: missingPages.length,
      duplicate_titles: dupeTitleCount,
      placeholder_pages: placeholderCount,
      trust_signal_count: trustSignals.length,
    },
  };
}
