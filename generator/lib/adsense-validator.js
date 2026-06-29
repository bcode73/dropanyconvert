/**
 * Phase 35 — Enhanced AdSense readiness validator.
 * Scored breakdown: Architecture(20) + Trust(20) + Content(20) + UX(15) + Navigation(10) + Legal(10) + Accessibility(5)
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
  '/en/editorial-team/index.html',
];

const PLACEHOLDER_PATTERNS = [
  /lorem ipsum/i,
  /placeholder text/i,
  /under construction/i,
  /\[INSERT/i,
  /ca-pub-XXXX/i,
];

export function validateAdsenseReadiness(pages, sitemaps, robots, config, rssFeeds) {
  const warnings = [];
  const missingPages = [];
  const trustSignals = [];
  const deductions = [];

  const cat = {
    architecture:  { max: 20, score: 0 },
    trust:         { max: 20, score: 0 },
    content:       { max: 20, score: 0 },
    ux:            { max: 15, score: 0 },
    navigation:    { max: 10, score: 0 },
    legal:         { max: 10, score: 0 },
    accessibility: { max:  5, score: 0 },
  };

  const pageMap = new Map(pages.map(p => [p.path, p]));

  // ─── ARCHITECTURE (20pts) ────────────────────────────────────────────
  // Sitemap (5pts)
  const hasSitemap = (sitemaps || []).some(s => s.path?.includes('sitemap'));
  if (hasSitemap) { cat.architecture.score += 5; trustSignals.push('sitemap'); }
  else { deductions.push('No sitemap: -5 architecture'); warnings.push('No sitemap found'); }

  // Robots (5pts)
  if (robots?.content) { cat.architecture.score += 5; trustSignals.push('robots_txt'); }
  else { deductions.push('No robots.txt: -5 architecture'); warnings.push('robots.txt missing'); }

  // Canonical tags (5pts)
  const homePage = pageMap.get('/en/index.html');
  if (homePage?.content?.includes('rel="canonical"')) { cat.architecture.score += 5; trustSignals.push('canonicals'); }
  else { deductions.push('No canonical on home: -5 architecture'); warnings.push('Missing canonical on home page'); }

  // AdSense meta tag (5pts)
  if (homePage?.content?.includes('google-adsense-account')) { cat.architecture.score += 5; trustSignals.push('adsense_meta'); }
  else { deductions.push('No AdSense meta: -5 architecture'); warnings.push('google-adsense-account meta tag missing'); }

  // ─── TRUST (20pts) ──────────────────────────────────────────────────
  // RSS feed present (5pts)
  const hasRss = (rssFeeds || []).some(f => f.path === '/rss.xml') ||
    pages.some(p => p.path === '/rss.xml') ||
    (sitemaps || []).some(s => s.path === '/rss.xml');
  if (hasRss) { cat.trust.score += 5; trustSignals.push('rss_feed'); }
  else { deductions.push('No RSS feed: -5 trust'); warnings.push('RSS feed (/rss.xml) not found'); }

  // Editorial team page (5pts)
  if (pageMap.has('/en/editorial-team/index.html')) { cat.trust.score += 5; trustSignals.push('editorial_team_page'); }
  else { deductions.push('No editorial team page: -5 trust'); warnings.push('Missing /en/editorial-team page'); }

  // Contact email not placeholder (5pts)
  const contactEmail = config.contact?.email || '';
  if (contactEmail && !contactEmail.includes('example') && !contactEmail.includes('placeholder') && contactEmail.includes('@')) {
    cat.trust.score += 5; trustSignals.push('real_contact_email');
  } else { deductions.push('Placeholder contact email: -5 trust'); warnings.push(`Contact email appears to be a placeholder: "${contactEmail}"`); }

  // Homepage trust section (5pts)
  if (homePage?.content?.includes('dac-trust-section') || homePage?.content?.includes('dac-trust-pillars') || homePage?.content?.includes('dac-trust-stat')) {
    cat.trust.score += 5; trustSignals.push('homepage_trust_section');
  } else { deductions.push('No homepage trust section: -5 trust'); warnings.push('Homepage missing trust section'); }

  // ─── CONTENT (20pts) ────────────────────────────────────────────────
  // No placeholder text in sampled pages (10pts)
  let placeholderCount = 0;
  for (const page of pages.slice(0, 30)) {
    for (const pat of PLACEHOLDER_PATTERNS) {
      if (pat.test(page.content || '')) { placeholderCount++; break; }
    }
  }
  if (placeholderCount === 0) { cat.content.score += 10; trustSignals.push('no_placeholder_text'); }
  else {
    const deduct = Math.min(10, placeholderCount * 2);
    deductions.push(`${placeholderCount} pages with placeholder text: -${deduct} content`);
    warnings.push(`Placeholder text found on ${placeholderCount} page(s)`);
    cat.content.score += Math.max(0, 10 - deduct);
  }

  // No duplicate titles (5pts)
  const titles = new Map();
  let dupeTitles = 0;
  for (const page of pages) {
    const m = (page.content || '').match(/<title>([^<]+)<\/title>/i);
    if (m) { if (titles.has(m[1])) dupeTitles++; else titles.set(m[1], page.path); }
  }
  if (dupeTitles === 0) { cat.content.score += 5; }
  else if (dupeTitles <= 5) { cat.content.score += 3; deductions.push(`${dupeTitles} duplicate titles: -2 content`); warnings.push(`${dupeTitles} duplicate page title(s) found`); }
  else { deductions.push(`${dupeTitles} duplicate titles: -5 content`); warnings.push(`${dupeTitles} duplicate page title(s) — review translation pages`); }

  // Authority bars on knowledge pages (5pts)
  const articlePage = pages.find(p => p.path?.includes('/guides/') && p.path?.endsWith('/index.html'));
  if (articlePage?.content?.includes('dac-authority-bar')) { cat.content.score += 5; trustSignals.push('authority_bars'); }
  else { deductions.push('No authority bars on articles: -5 content'); warnings.push('Authority bar not found on article pages'); }

  // ─── UX (15pts) ─────────────────────────────────────────────────────
  // 404 page exists (5pts)
  if (pageMap.has('/404.html')) { cat.ux.score += 5; trustSignals.push('404_page'); }
  else { deductions.push('No 404 page: -5 ux'); warnings.push('404.html not found'); }

  // Search overlay present (5pts)
  if (homePage?.content?.includes('dac-search-overlay')) { cat.ux.score += 5; trustSignals.push('search_overlay'); }
  else { deductions.push('No search overlay: -5 ux'); warnings.push('Search overlay missing from home page'); }

  // Category pages have related content (5pts)
  const catPage = pages.find(p => {
    const m = p.path?.match(/^\/en\/([^/]+)\/index\.html$/);
    if (!m) return false;
    const slug = m[1];
    return !['guides','compare','glossary','collections','for','faq','trust','about','contact',
             'privacy-policy','terms-of-service','cookie-policy','disclaimer','accessibility',
             'editorial-team','changelog','entity','editorial'].includes(slug);
  });
  if (catPage?.content?.includes('dac-kh-related') || catPage?.content?.includes('dac-cat-related') || catPage?.content?.includes('dac-related-grid') || catPage?.content?.includes('dac-kh-index-grid')) {
    cat.ux.score += 5; trustSignals.push('category_related_content');
  } else { deductions.push('Category pages lack related content: -5 ux'); warnings.push('Category pages missing related guides/comparisons'); }

  // ─── NAVIGATION (10pts) ─────────────────────────────────────────────
  // Footer has all legal links (5pts)
  const hasAllLegalInFooter = homePage && ['privacy-policy','terms-of-service','cookie-policy','disclaimer','accessibility'].every(slug =>
    (homePage.content || '').includes(`/${slug}`)
  );
  if (hasAllLegalInFooter) { cat.navigation.score += 5; trustSignals.push('footer_legal_links'); }
  else { deductions.push('Footer missing legal links: -5 navigation'); warnings.push('Footer missing one or more required legal page links'); }

  // Breadcrumbs on inner pages (5pts)
  const innerPage = pages.find(p => p.path?.includes('/guides/') && p.path?.endsWith('/index.html'));
  if (innerPage?.content?.includes('dac-breadcrumb')) { cat.navigation.score += 5; trustSignals.push('breadcrumbs'); }
  else { deductions.push('No breadcrumbs: -5 navigation'); warnings.push('Breadcrumbs not found on inner pages'); }

  // ─── LEGAL (10pts) ──────────────────────────────────────────────────
  let presentLegal = 0;
  for (const path of REQUIRED_PATHS) {
    if (pageMap.has(path)) { presentLegal++; }
    else { missingPages.push(path); warnings.push(`Missing required page: ${path}`); }
  }
  cat.legal.score = Math.round((presentLegal / REQUIRED_PATHS.length) * 10);
  if (missingPages.length === 0) trustSignals.push('complete_legal_set');

  // ─── ACCESSIBILITY (5pts) ───────────────────────────────────────────
  if (pageMap.has('/en/accessibility/index.html')) { cat.accessibility.score += 3; }
  if (homePage?.content?.includes('dac-skip')) { cat.accessibility.score += 2; trustSignals.push('skip_links'); }

  // ─── TOTAL ──────────────────────────────────────────────────────────
  const totalScore = Object.values(cat).reduce((sum, c) => sum + c.score, 0);
  const maxScore   = Object.values(cat).reduce((sum, c) => sum + c.max, 0);
  const score      = Math.round((totalScore / maxScore) * 100);

  const breakdown = Object.fromEntries(
    Object.entries(cat).map(([k, v]) => [k, { score: v.score, max: v.max }])
  );

  return {
    warnings,
    missingPages,
    trustSignals,
    deductions,
    breakdown,
    stats: {
      score,
      passed_checks: trustSignals.length,
      total_checks: Math.round(maxScore / 5),
      missing_pages: missingPages.length,
      duplicate_titles: dupeTitles,
      placeholder_pages: placeholderCount,
      trust_signal_count: trustSignals.length,
      ready_for_review: score >= 90,
    },
  };
}
