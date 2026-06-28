import { renderAdBlock } from './ads.js';
import {
  djb2,
  enrichTool,
  renderExamplesSection,
  renderUseCasesSection,
  renderReadingQualityBadge,
  renderEnrichedFaq,
} from './content-engine.js';

// ── HTML Minifier ─────────────────────────────────────────────────────────────
// Safe whitespace collapse: preserves <pre>, <script>, <style>, <textarea> content.
function minifyHtml(html) {
  // Protect pre-formatted blocks
  const preserved = [];
  html = html.replace(/<(pre|script|style|textarea)[\s\S]*?<\/\1>/gi, m => {
    preserved.push(m);
    return `\x00PRESERVE${preserved.length - 1}\x00`;
  });
  // Collapse whitespace between tags
  html = html
    .replace(/<!--(?!(\[if|\s*#))[\s\S]*?-->/g, '')  // remove HTML comments (keep IE conditionals)
    .replace(/>\s{2,}</g, '> <')                       // collapse multi-space between tags
    .replace(/\n\s*\n/g, '\n')                         // collapse blank lines
    .replace(/\s{2,}/g, ' ')                           // collapse remaining multi-space
    .replace(/> </g, '><')                             // remove space between tags
    .replace(/\s+>/g, '>');                            // trim trailing space before >
  // Restore preserved blocks
  html = html.replace(/\x00PRESERVE(\d+)\x00/g, (_, i) => preserved[+i]);
  return html.trim();
}

/**
 * Generates HTML for every route.
 * Returns array of { path, content } objects.
 */
export async function generatePages(routes, seoData, links, data, config) {
  const pages = [];

  // Pre-compute tool enrichments (Phase 23) — once per unique tool slug
  const enrichmentCache = new Map();
  for (const tool of data.tools) {
    if (!enrichmentCache.has(tool.slug)) {
      enrichmentCache.set(tool.slug, enrichTool(tool, data));
    }
  }
  // Expose for duplicate detection in index.js
  generatePages._enrichmentCache = enrichmentCache;

  // Build article prev/next map once
  const sortedArticles = [...(data.articles || [])].sort((a, b) =>
    (b.lastUpdated || '').localeCompare(a.lastUpdated || '')
  );
  const articleNavMap = new Map();
  sortedArticles.forEach((a, i) => {
    articleNavMap.set(a.slug, {
      prev: i < sortedArticles.length - 1 ? sortedArticles[i + 1] : null,
      next: i > 0 ? sortedArticles[i - 1] : null,
    });
  });

  for (const route of routes) {
    const seo = seoData.get(route.path) || {};
    let html = '';

    if (route.type === 'tool') {
      html = renderToolPage(route, seo, links.get(route.path) || {}, data, config);
      pages.push({ path: route.path + '/index.html', content: minifyHtml(html) });
    } else if (route.type === 'category') {
      html = renderCategoryPage(route, seo, data, config);
      pages.push({ path: route.path + '/index.html', content: minifyHtml(html) });
    } else if (route.type === 'home') {
      html = renderHubPage(route, seo, data, config);
      pages.push({ path: route.path + '/index.html', content: minifyHtml(html) });
    } else if (route.type === 'legal') {
      html = renderLegalPage(route, seo, data, config);
      pages.push({ path: route.path + '/index.html', content: minifyHtml(html) });
    } else if (route.type === 'article') {
      const nav = articleNavMap.get(route.article.slug) || {};
      html = renderArticlePage(route, seo, data, config, nav);
      pages.push({ path: route.path + '/index.html', content: minifyHtml(html) });
    } else if (route.type === 'comparison') {
      html = renderComparisonPage(route, seo, data, config);
      pages.push({ path: route.path + '/index.html', content: minifyHtml(html) });
    } else if (route.type === 'glossary') {
      html = renderGlossaryTermPage(route, seo, data, config);
      pages.push({ path: route.path + '/index.html', content: minifyHtml(html) });
    } else if (route.type === 'guides-index') {
      html = renderGuidesIndexPage(route, seo, data, config);
      pages.push({ path: route.path + '/index.html', content: minifyHtml(html) });
    } else if (route.type === 'compare-index') {
      html = renderCompareIndexPage(route, seo, data, config);
      pages.push({ path: route.path + '/index.html', content: minifyHtml(html) });
    } else if (route.type === 'glossary-index') {
      html = renderGlossaryIndexPage(route, seo, data, config);
      pages.push({ path: route.path + '/index.html', content: minifyHtml(html) });
    } else if (route.type === 'collection') {
      html = renderCollectionPage(route, seo, data, config);
      pages.push({ path: route.path + '/index.html', content: minifyHtml(html) });
    } else if (route.type === 'collections-index') {
      html = renderCollectionsIndexPage(route, seo, data, config);
      pages.push({ path: route.path + '/index.html', content: minifyHtml(html) });
    } else if (route.type === 'landing') {
      html = renderLandingPage(route, seo, data, config);
      pages.push({ path: route.path + '/index.html', content: minifyHtml(html) });
    } else if (route.type === 'faq-hub') {
      html = renderFaqHubPage(route, seo, data, config);
      pages.push({ path: route.path + '/index.html', content: minifyHtml(html) });
    } else if (route.type === 'trust') {
      html = renderTrustPage(route, seo, data, config);
      pages.push({ path: route.path + '/index.html', content: minifyHtml(html) });
    } else if (route.type === 'editorial') {
      html = renderEditorialPage(route, seo, data, config);
      pages.push({ path: route.path + '/index.html', content: minifyHtml(html) });
    } else if (route.type === 'changelog') {
      html = renderChangelogPage(route, seo, data, config);
      pages.push({ path: route.path + '/index.html', content: minifyHtml(html) });
    } else if (route.type === 'entity') {
      html = renderEntityPage(route, seo, data, config);
      pages.push({ path: route.path + '/index.html', content: minifyHtml(html) });
    } else if (route.type === 'entity-index') {
      html = renderEntityIndexPage(route, seo, data, config);
      pages.push({ path: route.path + '/index.html', content: minifyHtml(html) });
    } else if (route.type === 'author') {
      html = renderAuthorPage(route, seo, data, config);
      pages.push({ path: route.path + '/index.html', content: minifyHtml(html) });
    } else if (route.type === 'intent') {
      html = renderIntentPage(route, seo, data, config);
      pages.push({ path: route.path + '/index.html', content: minifyHtml(html) });
    } else if (route.type === 'how-to-index') {
      html = renderHowToIndexPage(route, seo, data, config);
      pages.push({ path: route.path + '/index.html', content: minifyHtml(html) });
    } else if (route.type === 'platform') {
      html = renderPlatformPage(route, seo, data, config);
      pages.push({ path: route.path + '/index.html', content: minifyHtml(html) });
    } else if (route.type === 'use-case') {
      html = renderUseCasePage(route, seo, data, config);
      pages.push({ path: route.path + '/index.html', content: minifyHtml(html) });
    } else if (route.type === 'feature') {
      html = renderFeaturePage(route, seo, data, config);
      pages.push({ path: route.path + '/index.html', content: minifyHtml(html) });
    } else if (route.type === 'format-faq') {
      html = renderFormatFaqPage(route, seo, data, config);
      pages.push({ path: route.path + '/index.html', content: minifyHtml(html) });
    } else if (route.type === 'root') {
      const d = config.languages.default;
      html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/${d}"><link rel="canonical" href="${config.site.baseUrl}/${d}"></head><body></body></html>`;
      pages.push({ path: '/index.html', content: html });
    }
  }

  return pages;
}

// ── SEO Head ──────────────────────────────────────────────────────────────

function renderAnalyticsSnippet(analytics) {
  if (!analytics?.enabled || !analytics?.provider) return '';
  const p = analytics.provider;
  const cfg = analytics.providers?.[p];
  if (!cfg) return '';
  if (p === 'ga4' && cfg.measurementId) {
    return `  <script async src="https://www.googletagmanager.com/gtag/js?id=${cfg.measurementId}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${cfg.measurementId}');</script>`;
  }
  if (p === 'gtm' && cfg.containerId) {
    return `  <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${cfg.containerId}');</script>`;
  }
  if (p === 'plausible' && cfg.domain) {
    return `  <script defer data-domain="${cfg.domain}" src="${cfg.src || 'https://plausible.io/js/script.js'}"></script>`;
  }
  if (p === 'umami' && cfg.websiteId) {
    return `  <script defer data-website-id="${cfg.websiteId}" src="${cfg.src || 'https://analytics.umami.is/script.js'}"></script>`;
  }
  return '';
}

function renderHead(seo, config, toolIndex, opts = {}) {
  const { ads = null, analytics = null, isLegal = false, khIndex = null } = opts;
  const schemas = (seo.schemas || [])
    .map(s => `<script type="application/ld+json">${JSON.stringify(s)}</script>`)
    .join('');

  const hreflang = (seo.hreflang || [])
    .map(h => `  <link rel="alternate" hreflang="${h.lang}" href="${h.url}">`)
    .join('\n');

  const xDefault = seo.hreflangDefault
    ? `  <link rel="alternate" hreflang="x-default" href="${seo.hreflangDefault}">`
    : '';

  // AdSense publisher script (non-legal pages only, when client ID is configured)
  const adsenseScript = (!isLegal && ads?.enabled && ads?.clientId && !ads.clientId.includes('XXXX'))
    ? `  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ads.clientId}" crossorigin="anonymous"></script>`
    : '';

  // Provider-agnostic analytics snippet
  const analyticsSnippet = renderAnalyticsSnippet(analytics);

  // Inline theme init — must run before paint to prevent FOUC
  const themeInit = `<script>try{var t=JSON.parse(localStorage.getItem('dac_settings')||'{}').theme||'auto';document.documentElement.dataset.theme=t==='auto'?(window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'):t}catch(e){}</script>`;

  const toolIndexScript = toolIndex
    ? `<script>window.DAC_TOOLS=${JSON.stringify(toolIndex)};${khIndex ? `window.DAC_KH_INDEX=${JSON.stringify(khIndex)};` : ''}</script>`
    : '';

  // Critical CSS: enough to render above-the-fold without layout shift.
  // The full stylesheet is loaded async to avoid render-blocking.
  const criticalCss = `<style>*,::before,::after{box-sizing:border-box}html{-webkit-text-size-adjust:100%}body{margin:0;font-family:system-ui,-apple-system,sans-serif;line-height:1.5;background:#fff;color:#111}[data-theme=dark]{background:#0f0f0f;color:#e5e5e5}.dac-nav{position:sticky;top:0;z-index:100;background:#fff;border-bottom:1px solid #e5e5e5}[data-theme=dark] .dac-nav{background:#0f0f0f;border-color:#2a2a2a}.dac-skip-link{position:absolute;left:-9999px}.dac-skip-link:focus{left:1rem;top:1rem;z-index:9999;background:#6366f1;color:#fff;padding:.5rem 1rem;border-radius:4px}.dac-page--hub,.dac-page--tool,.dac-page--category{max-width:1200px;margin:0 auto;padding:0 1.5rem}</style>`;

  return `<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(seo.title || config.site.name)}</title><meta name="description" content="${esc(seo.description || '')}"><meta name="robots" content="${seo.robots || 'index, follow'}">${seo.canonical ? `<link rel="canonical" href="${seo.canonical}">` : ''}<meta property="og:title" content="${esc(seo.ogTitle || seo.title || '')}"><meta property="og:description" content="${esc(seo.ogDescription || seo.description || '')}"><meta property="og:url" content="${seo.ogUrl || seo.canonical || ''}"><meta property="og:type" content="${seo.ogType || 'website'}"><meta property="og:site_name" content="${esc(seo.ogSiteName || config.site.name)}"><meta property="og:image" content="${seo.ogImage || config.seo?.defaultImagePath || ''}"><meta name="twitter:card" content="${seo.twitterCard || 'summary_large_image'}"><meta name="twitter:site" content="${seo.twitterSite || config.seo?.twitterHandle || ''}"><meta name="twitter:title" content="${esc(seo.twitterTitle || seo.title || '')}"><meta name="twitter:description" content="${esc(seo.twitterDescription || seo.description || '')}"><meta name="msapplication-config" content="/browserconfig.xml"><link rel="manifest" href="/site.webmanifest"><meta name="theme-color" content="#6366f1"><link rel="icon" href="/assets/images/icon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/assets/images/icon.svg">${hreflang}${xDefault}${criticalCss}<link rel="preload" href="/assets/css/main.css" as="style"><link rel="stylesheet" href="/assets/css/main.css" media="print" onload="this.media='all'"><noscript><link rel="stylesheet" href="/assets/css/main.css"></noscript>${themeInit}${toolIndexScript}${adsenseScript}${analyticsSnippet}${schemas}`;
}

// ── Shared Partials ────────────────────────────────────────────────────────

function renderHeader(langCode, activeCategory, categories, config, hreflang) {
  const navLinks = categories.map(c =>
    `    <a href="/${langCode}/${c.slug}" class="dac-nav__link${c.id === activeCategory ? ' dac-nav__link--active' : ''}">${esc(c.name[langCode] || c.name.en)}</a>`
  ).join('\n');

  const LANG_NAMES = { en: 'English', es: 'Español', fr: 'Français', de: 'Deutsch', pt: 'Português' };
  const LANG_FLAGS = { en: '🇬🇧', es: '🇪🇸', fr: '🇫🇷', de: '🇩🇪', pt: '🇧🇷' };

  const langLinks = (hreflang || []).map(h =>
    `<a href="${h.url}" ${h.lang === langCode ? 'aria-current="true"' : ''}>${LANG_FLAGS[h.lang] || ''} ${LANG_NAMES[h.lang] || h.lang.toUpperCase()}</a>`
  ).join('\n');

  const mobileNavLinks = categories.map(c =>
    `<a href="/${langCode}/${c.slug}">${esc(c.name[langCode] || c.name.en)}</a>`
  ).join('\n');

  const LOGO_SVG = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
    </svg>`;

  return `<a class="dac-skip" href="#main">Skip to content</a>
<header class="dac-header" role="banner">
  <a href="/${langCode}" class="dac-header__logo dac-header__logo-icon" aria-label="${esc(config.site.name)} — Home">
    ${LOGO_SVG}${esc(config.site.name)}
  </a>
  <nav class="dac-header__nav" aria-label="Tool categories">
${navLinks}
  </nav>
  <div class="dac-header__actions">
    <button class="dac-search-trigger" id="dac-search-btn" aria-label="Search tools" aria-haspopup="dialog">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      Search tools…
      <span class="dac-search-trigger__kbd" aria-hidden="true">⌘K</span>
    </button>
    ${langLinks ? `<div class="dac-lang-wrap">
      <button class="dac-lang-btn" id="dac-lang-btn" aria-haspopup="true" aria-expanded="false" aria-label="Select language">
        ${LANG_FLAGS[langCode] || ''} ${langCode.toUpperCase()} <span aria-hidden="true">▾</span>
      </button>
      <div class="dac-lang-panel" id="dac-lang-panel" hidden>
        ${langLinks}
      </div>
    </div>` : ''}
    <button class="dac-icon-btn" id="dac-theme-btn" aria-label="Toggle theme" title="Toggle theme">⬤</button>
    <button class="dac-icon-btn dac-menu-btn" id="dac-menu-btn" aria-label="Open menu" aria-expanded="false" aria-controls="dac-mobile-nav">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
    </button>
  </div>
</header>

<div class="dac-mobile-nav" id="dac-mobile-nav" hidden aria-label="Mobile navigation">
  <span class="dac-mobile-nav__section-label">Tools</span>
  ${mobileNavLinks}
  <span class="dac-mobile-nav__section-label">Settings</span>
  ${(hreflang || []).map(h =>
    `<a href="${h.url}">${LANG_FLAGS[h.lang] || ''} ${LANG_NAMES[h.lang] || h.lang.toUpperCase()}</a>`
  ).join('\n')}
</div>

<!-- Search Overlay -->
<div class="dac-search-overlay" id="dac-search-overlay" hidden role="dialog" aria-modal="true" aria-label="Search tools">
  <div class="dac-search-box">
    <div class="dac-search-top">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      <input type="search" id="dac-search-input" placeholder="Search tools…" autocomplete="off" spellcheck="false" aria-label="Search tools">
      <button class="dac-search-close" id="dac-search-close" aria-label="Close search">Esc</button>
    </div>
    <div id="dac-search-results" role="listbox" aria-label="Search results"></div>
  </div>
</div>`;
}

function renderBreadcrumb(crumbs) {
  return crumbs.map((b, i) =>
    i < crumbs.length - 1
      ? `<a href="${b.url}" class="dac-breadcrumb__link">${esc(b.name)}</a><span class="dac-breadcrumb__sep" aria-hidden="true">/</span>`
      : `<span class="dac-breadcrumb__current" aria-current="page">${esc(b.name)}</span>`
  ).join('');
}

function renderFooter(langCode, config, categories, popularTools) {
  const catLinks = (categories || []).map(c =>
    `<a href="/${langCode}/${c.slug}" class="dac-footer__link">${esc(c.name[langCode] || c.name.en)}</a>`
  ).join('\n');

  const popularLinks = (popularTools || []).slice(0, 6).map(t =>
    `<a href="/${langCode}/${t.slug}" class="dac-footer__link">${esc(t.name[langCode] || t.name.en)}</a>`
  ).join('\n');

  const year = new Date().getFullYear();

  return `<footer class="dac-footer" role="contentinfo">
  <div class="dac-footer__grid">
    <div class="dac-footer__brand">
      <span class="dac-footer__brand-name">${esc(config.site.name)}</span>
      <p class="dac-footer__brand-desc">${esc(config.site.tagline)}</p>
      <div class="dac-footer__social" aria-label="Social links">
        <a href="#" class="dac-footer__social-link" aria-label="Twitter / X" rel="noopener">𝕏</a>
        <a href="#" class="dac-footer__social-link" aria-label="GitHub" rel="noopener">⌥</a>
      </div>
    </div>
    <div class="dac-footer__col">
      <h3 class="dac-footer__col-title">Tools</h3>
      <div class="dac-footer__col-links">
        ${catLinks}
      </div>
    </div>
    <div class="dac-footer__col">
      <h3 class="dac-footer__col-title">Popular</h3>
      <div class="dac-footer__col-links" id="dac-footer-popular">
        ${popularLinks}
      </div>
      <div class="dac-footer__col-links" id="dac-footer-recent" style="margin-top:8px"></div>
    </div>
    <div class="dac-footer__col">
      <h3 class="dac-footer__col-title">Knowledge Hub</h3>
      <div class="dac-footer__col-links">
        <a href="/${langCode}/guides" class="dac-footer__link">Guides</a>
        <a href="/${langCode}/compare" class="dac-footer__link">Comparisons</a>
        <a href="/${langCode}/glossary" class="dac-footer__link">Glossary</a>
        <a href="/${langCode}/collections" class="dac-footer__link">Collections</a>
        <a href="/${langCode}/faq" class="dac-footer__link">FAQ</a>
        <a href="/${langCode}/changelog" class="dac-footer__link">Changelog</a>
      </div>
    </div>
    <div class="dac-footer__col">
      <h3 class="dac-footer__col-title">Company</h3>
      <div class="dac-footer__col-links">
        <a href="/${langCode}/trust" class="dac-footer__link">Trust &amp; Security</a>
        <a href="/${langCode}/editorial/editorial-process" class="dac-footer__link">Editorial</a>
        <a href="/${langCode}/privacy-policy" class="dac-footer__link">Privacy Policy</a>
        <a href="/${langCode}/terms-of-service" class="dac-footer__link">Terms of Service</a>
        <a href="/${langCode}/disclaimer" class="dac-footer__link">Disclaimer</a>
      </div>
    </div>
  </div>
  <div class="dac-footer__bottom">
    <p class="dac-footer__copy">&copy; ${year} ${esc(config.site.name)}. All rights reserved.</p>
    <div class="dac-footer__bottom-links" aria-label="Legal">
      <a href="/${langCode}/privacy-policy">Privacy</a>
      <a href="/${langCode}/terms-of-service">Terms</a>
      <a href="/${langCode}/cookie-policy">Cookies</a>
    </div>
  </div>
</footer>
<script src="/assets/js/sw-register.js" defer></script>`;
}

// ── Tool Index for client-side search ────────────────────────────────────

function buildToolIndex(tools, langCode) {
  return tools.map(t => ({
    toolId:   t.toolId,
    slug:     t.slug,
    name:     t.name[langCode] || t.name.en,
    tagline:  t.tagline?.[langCode] || t.tagline?.en || '',
    category: t.category,
    keywords: [
      ...(t.seo?.secondaryKeywords || []),
      t.seo?.primaryKeyword || '',
    ].filter(Boolean),
  }));
}

function buildKhIndex(data, langCode) {
  const items = [];
  for (const a of (data.articles || [])) {
    items.push({
      type: 'article',
      slug: a.slug,
      path: `/${langCode}/guides/${a.slug}`,
      name: a.h1?.[langCode] || a.h1?.en || a.title?.[langCode] || a.title?.en || a.slug,
      tagline: a.description?.[langCode] || a.description?.en || '',
      keywords: [a.seo?.primaryKeyword || ''],
    });
  }
  for (const c of (data.comparisons || [])) {
    items.push({
      type: 'comparison',
      slug: c.slug,
      path: `/${langCode}/compare/${c.slug}`,
      name: c.h1?.[langCode] || c.h1?.en || `${c.subjectA} vs ${c.subjectB}`,
      tagline: c.description?.[langCode] || c.description?.en || '',
      keywords: [c.seo?.primaryKeyword || ''],
    });
  }
  for (const g of (data.glossary || [])) {
    items.push({
      type: 'glossary',
      slug: g.slug,
      path: `/${langCode}/glossary/${g.slug}`,
      name: g.term?.[langCode] || g.term?.en || g.slug,
      tagline: g.shortDef?.[langCode] || g.shortDef?.en || '',
      keywords: [],
    });
  }
  for (const col of (data.collections || [])) {
    items.push({
      type: 'collection',
      slug: col.slug,
      path: `/${langCode}/collections/${col.slug}`,
      name: col.title?.[langCode] || col.title?.en || col.slug,
      tagline: col.description?.[langCode] || col.description?.en || '',
      keywords: [col.seo?.primaryKeyword || '', ...(col.seo?.secondaryKeywords || [])].filter(Boolean),
    });
  }
  for (const l of (data.landings || [])) {
    items.push({
      type: 'landing',
      slug: l.slug,
      path: `/${langCode}/for/${l.slug}`,
      name: l.h1?.[langCode] || l.h1?.en || l.slug,
      tagline: l.description?.[langCode] || l.description?.en || '',
      keywords: [l.seo?.primaryKeyword || '', ...(l.seo?.secondaryKeywords || [])].filter(Boolean),
    });
  }
  if (data.trust) {
    items.push({
      type: 'trust',
      slug: 'trust',
      path: `/${langCode}/trust`,
      name: data.trust.h1?.[langCode] || data.trust.h1?.en || 'Trust & Security Center',
      tagline: data.trust.description?.[langCode] || data.trust.description?.en || '',
      keywords: ['privacy', 'security', 'browser-first', 'no upload'],
    });
  }
  for (const ep of (data.editorial?.pages || [])) {
    items.push({
      type: 'editorial',
      slug: ep.slug,
      path: `/${langCode}/editorial/${ep.slug}`,
      name: ep.h1?.[langCode] || ep.h1?.en || ep.slug,
      tagline: ep.description?.[langCode] || ep.description?.en || '',
      keywords: ['editorial', 'policy'],
    });
  }
  if ((data.changelog?.releases || []).length > 0) {
    items.push({
      type: 'changelog',
      slug: 'changelog',
      path: `/${langCode}/changelog`,
      name: 'Changelog',
      tagline: 'Version history and release notes for DropAnyConvert.',
      keywords: ['changelog', 'release notes', 'updates'],
    });
  }
  for (const e of (data.entities || [])) {
    items.push({
      type: 'entity',
      slug: e.slug,
      path: `/${langCode}/entity/${e.slug}`,
      name: e.name,
      tagline: e.description ? e.description.slice(0, 100) : '',
      keywords: [e.fullName || '', ...(e.aliases || [])].filter(Boolean),
    });
  }
  for (const a of (data.authors || [])) {
    items.push({
      type: 'author',
      slug: a.slug,
      path: `/${langCode}/author/${a.slug}`,
      name: a.name,
      tagline: a.bio ? a.bio.slice(0, 100) : '',
      keywords: (a.specialties || []),
    });
  }
  for (const intent of (data.intents || [])) {
    for (const modifier of (intent.modifiers || [])) {
      const pageSlug = `${intent.slug}-${modifier.slug}`;
      items.push({
        type: 'how-to',
        slug: pageSlug,
        path: `/${langCode}/how-to/${pageSlug}`,
        name: `${intent.baseTitle?.en || intent.slug} ${modifier.label?.en || modifier.slug}`.trim(),
        tagline: modifier.description?.en ? modifier.description.en.slice(0, 100) : '',
        keywords: [`${intent.slug} ${modifier.slug}`.replace(/-/g, ' ')],
      });
    }
  }
  for (const p of (data.platforms || [])) {
    items.push({
      type: 'platform',
      slug: p.slug,
      path: `/${langCode}/platform/${p.slug}`,
      name: p.title?.en || p.slug,
      tagline: p.description?.en ? p.description.en.slice(0, 100) : '',
      keywords: (p.seo?.secondaryKeywords || []),
    });
  }
  for (const uc of (data.useCases || [])) {
    items.push({
      type: 'use-case',
      slug: uc.slug,
      path: `/${langCode}/use-case/${uc.slug}`,
      name: uc.title?.en || uc.slug,
      tagline: uc.description?.en ? uc.description.en.slice(0, 100) : '',
      keywords: (uc.seo?.secondaryKeywords || []),
    });
  }
  for (const f of (data.features || [])) {
    items.push({
      type: 'feature',
      slug: f.slug,
      path: `/${langCode}/feature/${f.slug}`,
      name: f.title?.en || f.slug,
      tagline: f.description?.en ? f.description.en.slice(0, 100) : '',
      keywords: (f.seo?.secondaryKeywords || []),
    });
  }
  return items;
}

// ── Tool Quality Badges ───────────────────────────────────────────────────

function toolQualityBadges(tool) {
  const caps = new Set(tool.capabilities || []);
  const hints = tool.runtimeHints || {};
  const badges = [];

  if (tool.runtime === 'browser') {
    badges.push({ label: 'Browser First', icon: '🌐' });
    badges.push({ label: 'Privacy Friendly', icon: '🔒' });
    badges.push({ label: 'No Upload Required', icon: '🚫' });
    badges.push({ label: 'Free', icon: '✓' });
  } else if (tool.runtime === 'hybrid') {
    badges.push({ label: 'Hybrid Processing', icon: '⚡' });
    badges.push({ label: 'Free', icon: '✓' });
  } else if (tool.runtime === 'cloud') {
    badges.push({ label: 'Cloud Assisted', icon: '☁' });
    badges.push({ label: 'Free', icon: '✓' });
  }

  if (tool.batch?.supported || caps.has('batch')) {
    badges.push({ label: 'Batch Supported', icon: '📦' });
  }
  if (caps.has('mobile-supported')) {
    badges.push({ label: 'Mobile Friendly', icon: '📱' });
  }
  if (caps.has('offline') || hints.requiresWorker) {
    badges.push({ label: 'Works Offline', icon: '📶' });
  }
  badges.push({ label: 'Open Source Libraries', icon: '⚙' });

  return badges.map(b =>
    `<span class="dac-badge" title="${esc(b.label)}">${b.icon} ${esc(b.label)}</span>`
  ).join('');
}

function renderToolBadges(tool) {
  const badgesHtml = toolQualityBadges(tool);
  if (!badgesHtml) return '';
  return `<div class="dac-tool-badges" aria-label="Tool quality badges">${badgesHtml}</div>`;
}

// ── Compatibility Table ────────────────────────────────────────────────────

function browserCompat(tool) {
  const hints = tool.runtimeHints || {};
  const caps  = new Set(tool.capabilities || []);
  // Derive per-browser support from runtime and hints
  const isBrowser = tool.runtime === 'browser' || tool.runtime === 'hybrid';
  // offscreenCanvas usage → Safari/iOS may have partial support
  const safariPartial = hints.preferOffscreenCanvas || caps.has('webgl');
  const mobileOk = caps.has('mobile-supported') || tool.runtime === 'browser';

  return [
    { browser: 'Chrome',  icon: '🟠', status: isBrowser ? '✅' : '✅', note: 'Full support' },
    { browser: 'Firefox', icon: '🦊', status: isBrowser ? '✅' : '✅', note: 'Full support' },
    { browser: 'Safari',  icon: '🧭', status: safariPartial ? '⚠' : isBrowser ? '✅' : '✅', note: safariPartial ? 'Partial support' : 'Full support' },
    { browser: 'Edge',    icon: '🔵', status: isBrowser ? '✅' : '✅', note: 'Full support' },
    { browser: 'iOS',     icon: '📱', status: mobileOk ? (safariPartial ? '⚠' : '✅') : '⚠', note: mobileOk && !safariPartial ? 'Full support' : 'Partial support' },
    { browser: 'Android', icon: '🤖', status: mobileOk ? '✅' : '⚠', note: mobileOk ? 'Full support' : 'Partial support' },
  ];
}

function renderCompatibilityTable(tool, langCode) {
  const hints = tool.runtimeHints || {};
  const inputExts = (tool.inputFormats || []).map(f => {
    if (typeof f === 'string') return f.split('/').pop().toUpperCase();
    return (f.ext || f.mime?.split('/').pop() || '?').toUpperCase();
  }).join(', ') || '—';

  const outputExts = (tool.outputFormats || []).map(f =>
    (f.ext || f.label || '?').toUpperCase()
  ).join(', ') || '—';

  const maxSize = hints.maxFileSizeMb ? `${hints.maxFileSizeMb} MB` : 'Browser RAM';
  const batchMax = tool.batch?.supported ? (tool.batch.maxFiles ? `Yes (max ${tool.batch.maxFiles})` : 'Yes') : 'No';
  const cloudRequired = tool.runtime === 'cloud' ? 'Yes' : tool.runtime === 'hybrid' ? 'Optional' : 'No';

  const browserRows = browserCompat(tool).map(b =>
    `<tr><th scope="row">${b.icon} ${esc(b.browser)}</th><td class="dac-compat-status">${b.status}</td><td class="dac-compat-note">${esc(b.note)}</td></tr>`
  ).join('\n        ');

  return `<section class="dac-compat-table-section">
  <h2 class="dac-section-title">Compatibility</h2>
  <div class="dac-compat-table-wrap">
    <table class="dac-compat-table">
      <tbody>
        <tr><th scope="row">Supported Input</th><td colspan="2">${esc(inputExts)}</td></tr>
        <tr><th scope="row">Supported Output</th><td colspan="2">${esc(outputExts)}</td></tr>
        <tr><th scope="row">Batch Processing</th><td colspan="2">${esc(batchMax)}</td></tr>
        <tr><th scope="row">Max File Size</th><td colspan="2">${esc(maxSize)}</td></tr>
        <tr><th scope="row">Runtime</th><td colspan="2">${esc(tool.runtime === 'browser' ? 'In-Browser' : tool.runtime === 'cloud' ? 'Cloud Server' : 'Hybrid')}</td></tr>
        <tr><th scope="row">Cloud Required</th><td colspan="2">${esc(cloudRequired)}</td></tr>
      </tbody>
      <tbody>
        <tr><th scope="row" colspan="3" class="dac-compat-section-header">Browser Support</th></tr>
        ${browserRows}
      </tbody>
    </table>
  </div>
  <p class="dac-compat-legend"><span>✅ Full</span> <span>⚠ Partial</span> <span>❌ Not supported</span></p>
</section>`;
}

// ── Performance Metrics (star ratings) ────────────────────────────────────

function starRating(score, max = 5) {
  const filled = Math.round(score);
  return '★'.repeat(filled) + '☆'.repeat(max - filled);
}

function renderPerformanceMetrics(tool) {
  const hints = tool.runtimeHints || {};
  const caps  = new Set(tool.capabilities || []);

  // Derive speed score (1–5 stars)
  let speedScore = 3;
  if (tool.runtime === 'browser') speedScore = hints.memoryBudgetMb > 512 ? 4 : 5;
  else if (tool.runtime === 'hybrid') speedScore = 3;
  else if (tool.runtime === 'cloud') speedScore = 2;

  const privacyLabel = tool.runtime === 'browser' ? '100% Local' : tool.runtime === 'hybrid' ? 'Mostly Local' : 'Server-side';
  const internetRequired = tool.runtime === 'cloud' ? 'Yes' : tool.runtime === 'hybrid' ? 'Optional' : 'No';
  const batchLabel = tool.batch?.supported ? (tool.batch.maxFiles ? `Yes (up to ${tool.batch.maxFiles} files)` : 'Yes') : 'No';
  const maxSize = hints.maxFileSizeMb ? `${hints.maxFileSizeMb} MB` : 'Limited by RAM';
  const speedLabel = tool.runtime === 'browser'
    ? (hints.memoryBudgetMb > 512 ? 'Fast (1–5 seconds)' : 'Instant')
    : tool.runtime === 'cloud' ? 'Server-dependent' : 'Fast';

  // Compatibility score — more capabilities = higher compat rating
  const compatScore = tool.runtime === 'browser'
    ? (caps.has('mobile-supported') ? 5 : 4)
    : tool.runtime === 'hybrid' ? 4 : 3;

  return `<section class="dac-perf-metrics">
  <h2 class="dac-section-title">Performance &amp; Privacy</h2>
  <div class="dac-perf-grid">
    <div class="dac-perf-item">
      <span class="dac-perf-label">Processing Speed</span>
      <span class="dac-perf-value dac-perf-stars" aria-label="${speedScore} out of 5 stars">${starRating(speedScore)}</span>
      <span class="dac-perf-sub">${esc(speedLabel)}</span>
    </div>
    <div class="dac-perf-item">
      <span class="dac-perf-label">Browser Compatibility</span>
      <span class="dac-perf-value dac-perf-stars" aria-label="${compatScore} out of 5 stars">${starRating(compatScore)}</span>
      <span class="dac-perf-sub">All modern browsers</span>
    </div>
    <div class="dac-perf-item">
      <span class="dac-perf-label">Privacy</span>
      <span class="dac-perf-value">${esc(privacyLabel)}</span>
    </div>
    <div class="dac-perf-item">
      <span class="dac-perf-label">Internet Required</span>
      <span class="dac-perf-value">${esc(internetRequired)}</span>
    </div>
    <div class="dac-perf-item">
      <span class="dac-perf-label">Batch Support</span>
      <span class="dac-perf-value">${esc(batchLabel)}</span>
    </div>
    <div class="dac-perf-item">
      <span class="dac-perf-label">Max Recommended Size</span>
      <span class="dac-perf-value">${esc(maxSize)}</span>
    </div>
  </div>
</section>`;
}

// ── Article / Knowledge Hub Metadata ─────────────────────────────────────

function renderKhMeta(item, langCode) {
  const lastUpdated   = item.lastUpdated   || '';
  const publishedDate = item.publishedDate || '';
  const reviewedBy    = item.reviewedBy    || 'Editorial Team';
  const version       = item.version       || '1.0';
  const sectionCount  = (item.sections || []).length;

  // Estimate reading time from stringified sections
  const textLength = JSON.stringify(item.sections || item.body || '').length;
  const words = Math.round(textLength / 5);
  const readMins = Math.max(1, Math.round(words / 200));

  // Update frequency: derive from version number
  const vNum = parseFloat(version) || 1.0;
  const updateFreq = vNum >= 2 ? 'Regularly updated' : 'Published once, reviewed';

  const parts = [];
  if (publishedDate) parts.push(`<span class="dac-kh-meta__item">Published: <time datetime="${esc(publishedDate)}">${esc(publishedDate)}</time></span>`);
  if (lastUpdated)   parts.push(`<span class="dac-kh-meta__item">Updated: <time datetime="${esc(lastUpdated)}">${esc(lastUpdated)}</time></span>`);
  parts.push(`<span class="dac-kh-meta__item">Reviewed by: ${esc(reviewedBy)}</span>`);
  parts.push(`<span class="dac-kh-meta__item">v${esc(version)}</span>`);
  parts.push(`<span class="dac-kh-meta__item">${readMins} min read</span>`);
  if (sectionCount > 0) parts.push(`<span class="dac-kh-meta__item">${sectionCount} sections</span>`);
  parts.push(`<span class="dac-kh-meta__item">${esc(updateFreq)}</span>`);

  return `<div class="dac-kh-meta" aria-label="Article metadata">${parts.join('')}</div>`;
}

// ── AI Citation Blocks ────────────────────────────────────────────────────

function renderAiCitationBlock(item, langCode, data) {
  const sections = item.sections || [];
  const intro    = item.intro?.[langCode] || item.intro?.en || '';
  const faq      = item.faq || [];

  // Key Takeaways from section headings
  const takeaways = sections.slice(0, 5).map(s =>
    s.heading?.[langCode] || s.heading?.en || ''
  ).filter(Boolean);

  // Quick Answer from intro or description
  const quickAnswer = intro
    ? (intro.length > 200 ? intro.slice(0, 197) + '…' : intro)
    : (item.description?.[langCode] || item.description?.en || '').slice(0, 200);

  // Common Mistakes from FAQ questions that contain "mistake"/"avoid"/"wrong"/"don't"
  const mistakes = faq
    .filter(f => {
      const q = (f.question?.[langCode] || f.question?.en || '').toLowerCase();
      return q.includes('avoid') || q.includes('mistake') || q.includes("don't") || q.includes('wrong') || q.includes('problem');
    })
    .slice(0, 3)
    .map(f => f.question?.[langCode] || f.question?.en || '');

  // Best Tool from relatedTools[0]
  const bestToolSlug = (item.relatedTools || [])[0];
  const bestTool = bestToolSlug ? data.tools.find(t => t.slug === bestToolSlug) : null;

  if (!takeaways.length && !quickAnswer && !mistakes.length && !bestTool) return '';

  const parts = [];

  if (quickAnswer) {
    parts.push(`<div class="dac-citation__block">
      <h3 class="dac-citation__label">Quick Answer</h3>
      <p class="dac-citation__text">${esc(quickAnswer)}</p>
    </div>`);
  }

  if (takeaways.length > 0) {
    parts.push(`<div class="dac-citation__block">
      <h3 class="dac-citation__label">Key Takeaways</h3>
      <ul class="dac-citation__list">
        ${takeaways.map(t => `<li>${esc(t)}</li>`).join('\n        ')}
      </ul>
    </div>`);
  }

  if (mistakes.length > 0) {
    parts.push(`<div class="dac-citation__block">
      <h3 class="dac-citation__label">Common Questions</h3>
      <ul class="dac-citation__list">
        ${mistakes.map(m => `<li>${esc(m)}</li>`).join('\n        ')}
      </ul>
    </div>`);
  }

  if (bestTool) {
    const toolName = bestTool.name?.[langCode] || bestTool.name?.en || bestTool.slug;
    parts.push(`<div class="dac-citation__block">
      <h3 class="dac-citation__label">Recommended Tool</h3>
      <a href="/${langCode}/${bestTool.slug}" class="dac-citation__tool-link">${esc(toolName)}</a>
    </div>`);
  }

  return `<aside class="dac-ai-citation" aria-label="Summary for AI and quick reference">
  <div class="dac-citation__header">
    <span class="dac-citation__icon" aria-hidden="true">⚡</span>
    <h2 class="dac-citation__title">At a Glance</h2>
  </div>
  <div class="dac-citation__body">
    ${parts.join('\n    ')}
  </div>
</aside>`;
}

// ── Related Collections & Landings ────────────────────────────────────────

function relatedCollectionCards(toolSlug, collections, langCode) {
  const relevant = (collections || []).filter(c => (c.toolSlugs || []).includes(toolSlug)).slice(0, 3);
  if (!relevant.length) return '';
  const cards = relevant.map(c => `
    <a href="/${langCode}/collections/${c.slug}" class="dac-kh-article-card">
      <h3 class="dac-kh-article-card__title">${esc(c.title?.[langCode] || c.title?.en || c.slug)}</h3>
      <p class="dac-kh-article-card__desc">${esc(c.description?.[langCode] || c.description?.en || '')}</p>
    </a>`).join('');
  return `<section class="dac-related-collections">
  <h2 class="dac-section-title">Related Collections</h2>
  <div class="dac-kh-article-grid">${cards}</div>
</section>`;
}

function relatedLandingCards(toolSlug, landings, langCode) {
  const relevant = (landings || []).filter(l => (l.toolSlugs || []).includes(toolSlug)).slice(0, 2);
  if (!relevant.length) return '';
  const cards = relevant.map(l => `
    <a href="/${langCode}/for/${l.slug}" class="dac-kh-article-card">
      <h3 class="dac-kh-article-card__title">${esc(l.h1?.[langCode] || l.h1?.en || l.slug)}</h3>
      <p class="dac-kh-article-card__desc">${esc(l.description?.[langCode] || l.description?.en || '')}</p>
    </a>`).join('');
  return `<section class="dac-related-landings">
  <h2 class="dac-section-title">More Use Cases</h2>
  <div class="dac-kh-article-grid">${cards}</div>
</section>`;
}

// ── Site Statistics (auto-computed) ───────────────────────────────────────

function buildSiteStats(data) {
  const toolCount = data.tools.length;
  const langCount = data.languages.length;
  const knowledgeCount = (data.articles?.length || 0) + (data.comparisons?.length || 0) + (data.glossary?.length || 0) + (data.collections?.length || 0);
  const pageApprox = toolCount * langCount + knowledgeCount * langCount;
  return { toolCount, langCount, knowledgeCount, pageApprox };
}

// ── Popular tools selection ───────────────────────────────────────────────

function popularTools(tools) {
  // Pick 6 tools to feature in the footer: prioritise cross-category variety
  const picks = [];
  const seen  = new Set();
  for (const t of tools) {
    if (!seen.has(t.category) && picks.length < 6) {
      picks.push(t);
      seen.add(t.category);
    }
  }
  return picks.length < 6 ? tools.slice(0, 6) : picks;
}

// ── Upload SVG icon (inline, no external request) ─────────────────────────

const UPLOAD_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>`;

// ── Tool Page ──────────────────────────────────────────────────────────────

function renderToolPage(route, seo, toolLinks, data, config) {
  if (route.tool.uiGroup === 'developer') return renderDevToolPage(route, seo, toolLinks, data, config);
  const { relatedTools = [], guides = [], comparisons: relatedComparisons = [], glossary: relatedGlossary = [], collections: linkerCollections = [], landings: linkerLandings = [], entities: linkerEntities = [], howToGuides = [] } = toolLinks;

  const tool = route.tool;
  const langCode = route.lang;

  // Phase 23 enrichment
  const enrichment   = (generatePages._enrichmentCache || new Map()).get(tool.slug) || enrichTool(tool, data);
  const { variants, examples, faqs, useCases, readingQuality } = enrichment;
  const lang = route.language;
  const ui = lang.ui;
  const ads = data.ads;

  const toolName = tool.name[langCode] || tool.name.en;
  const h1 = seo.h1 || toolName;
  // Phase 23: use engine-generated unique intro when no lang-specific intro exists
  const intro = tool.seo.intro?.[langCode] || tool.seo.intro?.en || variants.intro;
  const inputAccept = tool.inputFormats.join(',');
  const category = data.categories.find(c => c.id === tool.category);
  const hasQuality    = tool.capabilities.includes('quality-control');
  const hasBatch      = tool.capabilities.includes('batch');
  const hasMultiOutput = tool.outputFormats.length > 1;
  const hasResize     = tool.capabilities.includes('resize');
  const hasRotate     = tool.capabilities.includes('rotate');
  const hasFlip       = tool.capabilities.includes('flip');
  const hasWatermark  = tool.capabilities.includes('watermark');
  const hasCrop       = tool.capabilities.includes('crop');
  const hasTextInput  = tool.capabilities.includes('text-input');
  const isUtility     = tool.uiGroup === 'utility';
  const limitation    = tool.runtimeHints?.limitation || null;

  // ── Variant picker: same-input-format conversion tools ──────────────
  // Utility tools (resize, rotate, etc.) don't show the format variant picker.
  const sameInputTools = isUtility ? [] : data.tools.filter(t =>
    t.slug !== tool.slug &&
    t.uiGroup !== 'utility' &&
    t.category === tool.category &&
    t.inputFormats.some(f => tool.inputFormats.includes(f))
  );

  const variantPickerHtml = (() => {
    const defaultOut = tool.outputFormats.find(f => f.default) || tool.outputFormats[0];
    const chips = [
      `<span class="dac-variant-chip dac-variant-chip--active" aria-current="page">${esc(defaultOut.label)}</span>`,
      ...sameInputTools.slice(0, 5).map(t => {
        const out = t.outputFormats.find(f => f.default) || t.outputFormats[0];
        return `<a href="/${langCode}/${t.slug}" class="dac-variant-chip">${esc(out.label)}</a>`;
      }),
    ].join('\n      ');

    return `<div class="dac-variant-picker" aria-label="Output format options">
    <span class="dac-variant-picker__label">Convert to:</span>
    <div class="dac-variant-chips">
      ${chips}
    </div>
  </div>`;
  })();

  // ── Quality slider ────────────────────────────────────────────────────
  const qualityHtml = hasQuality ? `
      <div class="dac-quality-control">
        <label for="dac-quality" class="dac-label">Quality</label>
        <div class="dac-quality-row">
          <input type="range"
                 id="dac-quality"
                 class="dac-slider"
                 min="1" max="100" value="85"
                 step="1"
                 aria-valuemin="1"
                 aria-valuemax="100"
                 aria-valuenow="85">
          <output for="dac-quality" id="dac-quality-output" class="dac-quality-value">85</output>
        </div>
        <div class="dac-quality-hints" aria-hidden="true">
          <span>Smaller file</span>
          <span>Better quality</span>
        </div>
      </div>` : '';

  // ── Output format selector ────────────────────────────────────────────
  const formatHtml = hasMultiOutput ? `
      <div class="dac-format-control">
        <label for="dac-output-format" class="dac-label">Output format</label>
        <select id="dac-output-format" class="dac-select" aria-label="Choose output format">
          ${tool.outputFormats.map(f =>
            `<option value="${f.ext}"${f.default ? ' selected' : ''}>${f.label} — ${f.mime}</option>`
          ).join('\n          ')}
        </select>
      </div>` : '';

  // ── Resize controls ───────────────────────────────────────────────────
  const resizeHtml = hasResize ? `
      <div class="dac-resize-control">
        <label class="dac-label">Resize to (pixels)</label>
        <div class="dac-dim-row">
          <input type="number" id="dac-opt-width" class="dac-input dac-context-input"
                 data-context-key="width" placeholder="Width" min="1" max="10000" aria-label="Target width in pixels">
          <span class="dac-dim-sep" aria-hidden="true">×</span>
          <input type="number" id="dac-opt-height" class="dac-input dac-context-input"
                 data-context-key="height" placeholder="Height" min="1" max="10000" aria-label="Target height in pixels">
        </div>
        <label class="dac-checkbox-label">
          <input type="checkbox" id="dac-opt-aspect" class="dac-context-input"
                 data-context-key="maintainAspectRatio" checked>
          Maintain aspect ratio
        </label>
      </div>` : '';

  // ── Rotate controls ───────────────────────────────────────────────────
  const rotateHtml = hasRotate ? `
      <div class="dac-rotate-control">
        <label for="dac-opt-angle" class="dac-label">Rotation</label>
        <select id="dac-opt-angle" class="dac-select dac-context-input" data-context-key="angle">
          <option value="90">90° clockwise</option>
          <option value="180">180°</option>
          <option value="270">270° clockwise (90° counter-clockwise)</option>
          <option value="-90">90° counter-clockwise</option>
        </select>
      </div>` : '';

  // ── Flip controls ─────────────────────────────────────────────────────
  const flipHtml = hasFlip ? `
      <fieldset class="dac-flip-control">
        <legend class="dac-label">Flip direction</legend>
        <div class="dac-radio-row">
          <label class="dac-radio-label">
            <input type="radio" name="dac-flip-axis" value="horizontal"
                   class="dac-context-input" data-context-key="flipAxis" checked>
            Horizontal (mirror left–right)
          </label>
          <label class="dac-radio-label">
            <input type="radio" name="dac-flip-axis" value="vertical"
                   class="dac-context-input" data-context-key="flipAxis">
            Vertical (mirror top–bottom)
          </label>
        </div>
      </fieldset>` : '';

  // ── Watermark controls ────────────────────────────────────────────────
  const watermarkHtml = hasWatermark ? `
      <div class="dac-watermark-control">
        <div>
          <label for="dac-opt-wm-text" class="dac-label">Watermark text</label>
          <input type="text" id="dac-opt-wm-text" class="dac-input dac-context-input"
                 data-context-key="watermarkText" placeholder="© Your Name" maxlength="100">
        </div>
        <div>
          <label for="dac-opt-wm-pos" class="dac-label">Position</label>
          <select id="dac-opt-wm-pos" class="dac-select dac-context-input" data-context-key="watermarkPosition">
            <option value="bottom-right">Bottom right</option>
            <option value="bottom-left">Bottom left</option>
            <option value="top-right">Top right</option>
            <option value="top-left">Top left</option>
            <option value="center">Center</option>
          </select>
        </div>
        <div class="dac-quality-control">
          <label for="dac-opt-wm-opacity" class="dac-label">Opacity</label>
          <div class="dac-quality-row">
            <input type="range" id="dac-opt-wm-opacity" class="dac-slider dac-context-input"
                   data-context-key="watermarkOpacity" min="10" max="100" value="50" step="5">
            <output for="dac-opt-wm-opacity" id="dac-wm-opacity-out" class="dac-quality-value">50</output>
          </div>
        </div>
      </div>` : '';

  // ── Crop controls ─────────────────────────────────────────────────────
  const cropHtml = hasCrop ? `
      <div class="dac-crop-control">
        <label class="dac-label">Crop region (pixels from top-left corner)</label>
        <div class="dac-crop-grid">
          <div>
            <label for="dac-opt-crop-x" class="dac-label-sm">Left (X)</label>
            <input type="number" id="dac-opt-crop-x" class="dac-input dac-context-input"
                   data-context-key="cropX" value="0" min="0">
          </div>
          <div>
            <label for="dac-opt-crop-y" class="dac-label-sm">Top (Y)</label>
            <input type="number" id="dac-opt-crop-y" class="dac-input dac-context-input"
                   data-context-key="cropY" value="0" min="0">
          </div>
          <div>
            <label for="dac-opt-crop-w" class="dac-label-sm">Width</label>
            <input type="number" id="dac-opt-crop-w" class="dac-input dac-context-input"
                   data-context-key="cropW" placeholder="Full width" min="1">
          </div>
          <div>
            <label for="dac-opt-crop-h" class="dac-label-sm">Height</label>
            <input type="number" id="dac-opt-crop-h" class="dac-input dac-context-input"
                   data-context-key="cropH" placeholder="Full height" min="1">
          </div>
        </div>
      </div>` : '';

  // ── PDF Page selection ────────────────────────────────────────────────
  const hasPageSelection = tool.capabilities.includes('page-selection');
  const pageSelectionHtml = hasPageSelection ? `
      <div class="dac-page-selection-control">
        <label for="dac-opt-pages" class="dac-label">Pages (e.g. 1, 3–5, 7)</label>
        <input type="text" id="dac-opt-pages" class="dac-input dac-context-input"
               data-context-key="pages" placeholder="All pages" maxlength="200"
               aria-label="Enter page numbers or ranges">
        <p class="dac-hint-text">Leave blank to process all pages.</p>
      </div>` : '';

  // ── PDF Remove password ───────────────────────────────────────────────
  const hasRemovePassword = tool.capabilities.includes('remove-password');
  const removePasswordHtml = hasRemovePassword ? `
      <div class="dac-password-control">
        <label for="dac-opt-password" class="dac-label">PDF password</label>
        <input type="password" id="dac-opt-password" class="dac-input dac-context-input"
               data-context-key="password" placeholder="Enter current password"
               autocomplete="current-password" aria-label="Enter the PDF password to remove">
      </div>` : '';

  // ── PDF Password protect ──────────────────────────────────────────────
  const hasPasswordProtect = tool.capabilities.includes('password-protect');
  const protectHtml = hasPasswordProtect ? `
      <div class="dac-protect-control">
        <div>
          <label for="dac-opt-user-pw" class="dac-label">Open password <span class="dac-required" aria-hidden="true">*</span></label>
          <input type="password" id="dac-opt-user-pw" class="dac-input dac-context-input"
                 data-context-key="userPassword" placeholder="Password to open the PDF"
                 autocomplete="new-password" aria-label="User password required to open the PDF">
        </div>
        <div>
          <label for="dac-opt-owner-pw" class="dac-label">Owner password <span class="dac-hint-inline">(optional — to restrict editing)</span></label>
          <input type="password" id="dac-opt-owner-pw" class="dac-input dac-context-input"
                 data-context-key="ownerPassword" placeholder="Password to edit or print"
                 autocomplete="new-password" aria-label="Owner password to restrict editing">
        </div>
      </div>` : '';

  // ── PDF DPI selector ──────────────────────────────────────────────────
  const hasImageDpi = tool.capabilities.includes('image-dpi');
  const dpiHtml = hasImageDpi ? `
      <div class="dac-dpi-control">
        <label for="dac-opt-dpi" class="dac-label">Image resolution (DPI)</label>
        <select id="dac-opt-dpi" class="dac-select dac-context-input" data-context-key="dpi">
          <option value="72">72 DPI — Screen / preview</option>
          <option value="96">96 DPI — Standard web</option>
          <option value="150" selected>150 DPI — Good quality</option>
          <option value="300">300 DPI — Print quality</option>
        </select>
      </div>` : '';

  // ── PDF Metadata editor ───────────────────────────────────────────────
  const hasMetadataEdit = tool.capabilities.includes('metadata-edit');
  const metadataHtml = hasMetadataEdit ? `
      <div class="dac-metadata-control">
        <div class="dac-metadata-grid">
          <div>
            <label for="dac-opt-title" class="dac-label">Title</label>
            <input type="text" id="dac-opt-title" class="dac-input dac-context-input"
                   data-context-key="pdfTitle" placeholder="Document title" maxlength="255">
          </div>
          <div>
            <label for="dac-opt-author" class="dac-label">Author</label>
            <input type="text" id="dac-opt-author" class="dac-input dac-context-input"
                   data-context-key="pdfAuthor" placeholder="Author name" maxlength="255">
          </div>
          <div>
            <label for="dac-opt-subject" class="dac-label">Subject</label>
            <input type="text" id="dac-opt-subject" class="dac-input dac-context-input"
                   data-context-key="pdfSubject" placeholder="Document subject" maxlength="255">
          </div>
          <div>
            <label for="dac-opt-keywords" class="dac-label">Keywords</label>
            <input type="text" id="dac-opt-keywords" class="dac-input dac-context-input"
                   data-context-key="pdfKeywords" placeholder="keyword1, keyword2" maxlength="500">
          </div>
        </div>
      </div>` : '';

  // ── PDF Page reorder ──────────────────────────────────────────────────
  const hasPageReorder = tool.capabilities.includes('reorder');
  const reorderHtml = hasPageReorder ? `
      <div class="dac-reorder-control">
        <label for="dac-opt-page-order" class="dac-label">New page order (comma-separated page numbers)</label>
        <input type="text" id="dac-opt-page-order" class="dac-input dac-context-input"
               data-context-key="pageOrder" placeholder="e.g. 3, 1, 2, 4" maxlength="500"
               aria-label="Enter all page numbers in the desired new order">
        <p class="dac-hint-text">List every page number in the order you want them. Example: "3, 1, 2" puts page 3 first.</p>
      </div>` : '';

  const hasOptions = hasQuality || hasMultiOutput || hasResize || hasRotate || hasFlip || hasWatermark || hasCrop
    || hasPageSelection || hasRemovePassword || hasPasswordProtect || hasImageDpi || hasMetadataEdit || hasPageReorder;

  // ── Supported formats section ─────────────────────────────────────────
  const inputChips = tool.inputFormats
    .map(f => f.split('/')[1]?.toUpperCase() || f)
    .map(ext => `<span class="dac-format-chip dac-format-chip--in">${esc(ext)}</span>`)
    .join('\n      ');

  const outputChips = tool.outputFormats
    .map(f => `<span class="dac-format-chip dac-format-chip--out">${esc(f.label)}</span>`)
    .join('\n      ');

  // ── How-to steps (auto-generated from capabilities + formats) ─────────
  const howToSteps = buildHowToSteps(tool, langCode, ui);
  const howToHtml = howToSteps.map(s => `<li class="dac-howto__step">
        <span class="dac-howto__step-text">${s}</span>
      </li>`).join('\n      ');

  // ── Features ──────────────────────────────────────────────────────────
  const featuresHtml = (tool.features || []).map(f =>
    `<div class="dac-feature">
        <span class="dac-feature__icon dac-icon--${esc(f.icon)}" aria-hidden="true"></span>
        <h3 class="dac-feature__title">${esc(f.title[langCode] || f.title.en)}</h3>
        <p class="dac-feature__desc">${esc(f.description[langCode] || f.description.en)}</p>
      </div>`
  ).join('\n      ');

  // ── FAQ (Phase 23 — enriched, 8–15 questions) ────────────────────────
  const faqHtml = renderEnrichedFaq(faqs, langCode);

  // ── Part 4: Anchor text diversity — varied anchors per related tool ──────
  const relatedHtml = relatedTools.map(r =>
    `<a href="${r.path}" class="dac-related-tool">
        <span class="dac-related-tool__name">${esc(diverseAnchorText(r.name, r.slug, tool.slug))}</span>
        ${r.tagline ? `<span class="dac-related-tool__tagline">${esc(r.tagline)}</span>` : ''}
      </a>`
  ).join('\n      ');

  // ── Part 6: Table of Contents ─────────────────────────────────────────
  const tocHeadings = [
    { level: 2, text: 'How to Use', id: 'how-to-use' },
    ...(tool.features?.length > 0 ? [{ level: 2, text: 'Features', id: 'features' }] : []),
    { level: 2, text: 'Frequently Asked Questions', id: 'faq' },
    ...(relatedTools.length > 0 ? [{ level: 2, text: 'Related Tools', id: 'related-tools' }] : []),
    ...(guides.length > 0 ? [{ level: 2, text: 'Related Guides', id: 'related-guides' }] : []),
    { level: 2, text: 'Compatibility', id: 'compatibility' },
    { level: 2, text: 'Performance & Privacy', id: 'performance-privacy' },
  ];
  const tocHtml = renderTableOfContents(tocHeadings);

  // ── Related guides (from knowledge hub) ──────────────────────────────
  const guidesHtml = guides.length > 0 ? `<section class="dac-kh-related" aria-labelledby="dac-guides-title">
    <h2 class="dac-section-title" id="dac-guides-title">Related Guides</h2>
    <div class="dac-kh-article-grid">
      ${guides.map(g => `<a href="${esc(g.path)}" class="dac-kh-article-card">
        <span class="dac-kh-article-card__tag">Guide</span>
        <span class="dac-kh-article-card__title">${esc(g.title)}</span>
        ${g.description ? `<span class="dac-kh-article-card__desc">${esc(g.description)}</span>` : ''}
      </a>`).join('\n')}
    </div>
  </section>` : '';

  // ── Related glossary terms ────────────────────────────────────────────
  const glossaryHtml = relatedGlossary.length > 0 ? `<section class="dac-kh-related" aria-labelledby="dac-glossary-title">
    <h2 class="dac-section-title" id="dac-glossary-title">Key Concepts</h2>
    <div class="dac-glossary-related-terms">
      ${relatedGlossary.map(g => `<a href="${esc(g.path)}" class="dac-glossary-term-chip">${esc(g.term)}</a>`).join('\n')}
    </div>
  </section>` : '';

  // ── Related comparisons ───────────────────────────────────────────────
  const cmpHtml = relatedComparisons.length > 0 ? `<section class="dac-kh-related" aria-labelledby="dac-cmp-title">
    <h2 class="dac-section-title" id="dac-cmp-title">Format Comparisons</h2>
    <div class="dac-kh-article-grid">
      ${relatedComparisons.map(c => `<a href="${esc(c.path)}" class="dac-kh-article-card">
        <span class="dac-kh-article-card__tag">Compare</span>
        <span class="dac-kh-article-card__title">${esc(c.title)}</span>
        ${c.description ? `<span class="dac-kh-article-card__desc">${esc(c.description)}</span>` : ''}
      </a>`).join('\n')}
    </div>
  </section>` : '';

  const adTop    = renderAdBlock('top', ads, langCode);
  const adMiddle = renderAdBlock('middle', ads, langCode);
  const adBottom = renderAdBlock('bottom', ads, langCode);

  const breadcrumbHtml = renderBreadcrumb(seo.breadcrumbs || []);
  const toolIndex = buildToolIndex(data.tools, langCode);

  const headOpts = { ads: data.ads, analytics: data.analytics, khIndex: buildKhIndex(data, langCode) };
  return `<!DOCTYPE html>
<html lang="${langCode}" dir="ltr">
<head>
${renderHead(seo, config, toolIndex, headOpts)}
  <link rel="preload" href="/assets/css/article.css" as="style"><link rel="stylesheet" href="/assets/css/article.css" media="print" onload="this.media='all'"><noscript><link rel="stylesheet" href="/assets/css/article.css"></noscript>
</head>
<body class="dac-page dac-page--tool">

${renderHeader(langCode, tool.category, data.categories, config, seo.hreflang)}


<nav class="dac-breadcrumb" aria-label="Breadcrumb">
  ${breadcrumbHtml}
</nav>

${adTop}

<main class="dac-main" id="main">

  <!-- Hero -->
  <section class="dac-hero" aria-labelledby="dac-tool-title">
    <div class="dac-hero__title-row">
      <h1 class="dac-hero__title" id="dac-tool-title">${esc(h1)}</h1>
      <button class="dac-fav-btn" id="dac-fav-btn"
              data-slug="${esc(tool.slug)}"
              data-name="${esc(toolName)}"
              aria-label="Add to favorites">♡ Save</button>
    </div>
    ${intro ? `<p class="dac-hero__intro">${esc(intro)}</p>` : ''}
    <p class="dac-privacy-note">${esc(ui.privacyNote)}</p>
  </section>

  <!-- Converter -->
  <section class="dac-converter" aria-label="${esc(toolName)}">

    ${variantPickerHtml}

    <div class="dac-dropzone"
         id="dac-dropzone"
         data-tool-id="${tool.toolId}"
         data-engine="${tool.engine}"
         data-engine-fn="${tool.engineFn}"
         data-accept="${inputAccept}"
         data-max-files="${tool.batch.maxFiles}"
         data-batch="${tool.batch.supported}"
         data-runtime="${tool.runtime}"
         role="button"
         tabindex="0"
         aria-label="${esc(ui.dropzone)}">
      <div class="dac-dropzone__icon">${UPLOAD_ICON_SVG}</div>
      <span class="dac-dropzone__label">
        <strong>${esc(ui.dropzone)}</strong>
      </span>
      ${tool.capabilities.includes('clipboard-paste')
        ? `<span class="dac-dropzone__hint">or paste an image (Ctrl+V / ⌘+V)</span>`
        : ''
      }
      <input type="file"
             id="dac-file-input"
             class="dac-dropzone__input"
             accept="${inputAccept}"
             ${hasBatch ? 'multiple' : ''}
             aria-hidden="true"
             tabindex="-1">
    </div>

    <div class="dac-batch-queue" id="dac-batch-queue" hidden aria-label="Selected files"></div>

    ${hasTextInput ? `
    <div class="dac-text-input-panel">
      <label for="dac-text-input" class="dac-label">Or paste a Base64 string or Data URL</label>
      <textarea id="dac-text-input" class="dac-textarea"
                placeholder="data:image/png;base64,iVBORw0KGgo..." rows="4"
                aria-label="Paste base64 encoded image data"></textarea>
    </div>` : ''}

    ${limitation ? `<div class="dac-limitation-notice" role="note">
      <strong>ℹ Browser limitation:</strong> ${esc(limitation)}
    </div>` : ''}

    ${hasOptions ? `<div class="dac-options" id="dac-options" hidden aria-label="Conversion options">${qualityHtml}${formatHtml}${resizeHtml}${rotateHtml}${flipHtml}${watermarkHtml}${cropHtml}${pageSelectionHtml}${removePasswordHtml}${protectHtml}${dpiHtml}${metadataHtml}${reorderHtml}
    </div>` : ''}

    <div class="dac-controls" id="dac-controls" hidden>
      <button class="dac-btn dac-btn--primary" id="dac-convert-btn" type="button">
        ${esc(ui.convertButton)}
      </button>
      <button class="dac-btn dac-btn--ghost" id="dac-clear-btn" type="button">
        ${esc(ui.clearAll)}
      </button>
    </div>

    <div class="dac-progress-wrap" id="dac-progress-wrap" hidden
         role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"
         aria-label="Conversion progress">
      <div class="dac-progress">
        <div class="dac-progress__bar" id="dac-progress-bar"></div>
      </div>
      <p class="dac-progress__label" id="dac-progress-label" aria-live="polite">Converting…</p>
    </div>

    <div class="dac-results" id="dac-results" hidden aria-live="polite"></div>

  </section>

  ${adMiddle}

  <!-- Supported Formats -->
  <section class="dac-formats" aria-label="${esc(ui.supportedFormats)}">
    <h2 class="dac-section-title">${esc(ui.supportedFormats)}</h2>
    <div class="dac-formats__flow">
      <div class="dac-formats__group">
        <span class="dac-formats__group-label">Input</span>
        <div class="dac-format-chips-row">${inputChips}</div>
      </div>
      <span class="dac-formats__arrow" aria-hidden="true">→</span>
      <div class="dac-formats__group">
        <span class="dac-formats__group-label">Output</span>
        <div class="dac-format-chips-row">${outputChips}</div>
      </div>
    </div>
  </section>

  <!-- Part 6: Table of Contents -->
  ${tocHtml}

  <!-- How To -->
  <section class="dac-howto" aria-labelledby="dac-howto-title" id="how-to-use">
    <h2 class="dac-section-title" id="dac-howto-title">How to convert ${esc(inputFormatsLabel(tool))} to ${esc(outputFormatsLabel(tool))}</h2>
    <ol class="dac-howto__steps">
      ${howToHtml}
    </ol>
  </section>

  <!-- Features -->
  ${featuresHtml ? `<section class="dac-features" aria-label="${esc(ui.features)}" id="features">
    <h2 class="dac-section-title">${esc(ui.features)}</h2>
    <div class="dac-features__grid">
      ${featuresHtml}
    </div>
  </section>` : ''}

  <!-- Phase 23: Reading Quality Badge -->
  ${renderReadingQualityBadge(readingQuality)}

  <!-- Phase 23: Common Use Cases / Examples -->
  ${renderExamplesSection(examples)}

  <!-- FAQ -->
  <section class="dac-faq" aria-labelledby="dac-faq-title" id="faq">
    <h2 class="dac-section-title" id="dac-faq-title">${esc(ui.faq)}</h2>
    ${faqHtml}
  </section>

  <!-- Phase 23: When to Use / Use Cases -->
  ${renderUseCasesSection(useCases, toolName)}

  <!-- Related Tools -->
  ${relatedHtml ? `<section class="dac-related" aria-labelledby="dac-related-title" id="related-tools">
    <h2 class="dac-section-title" id="dac-related-title">${esc(ui.relatedTools)}</h2>
    <div class="dac-related__grid">
      ${relatedHtml}
    </div>
  </section>` : ''}

  ${guidesHtml}
  ${glossaryHtml}
  ${cmpHtml}
  ${linkerCollections.length > 0 ? `<section class="dac-related-collections">
  <h2 class="dac-section-title">Related Collections</h2>
  <div class="dac-kh-article-grid">${linkerCollections.map(c => `<a href="${esc(c.path)}" class="dac-kh-article-card"><h3 class="dac-kh-article-card__title">${esc(c.title)}</h3>${c.description ? `<p class="dac-kh-article-card__desc">${esc(c.description)}</p>` : ''}</a>`).join('')}</div>
</section>` : ''}
  ${linkerLandings.length > 0 ? `<section class="dac-related-landings">
  <h2 class="dac-section-title">More Use Cases</h2>
  <div class="dac-kh-article-grid">${linkerLandings.map(l => `<a href="${esc(l.path)}" class="dac-kh-article-card"><h3 class="dac-kh-article-card__title">${esc(l.title)}</h3>${l.description ? `<p class="dac-kh-article-card__desc">${esc(l.description)}</p>` : ''}</a>`).join('')}</div>
</section>` : ''}

  ${linkerEntities.length > 0 ? `<section class="dac-related-entities">
  <h2 class="dac-section-title">File Format Reference</h2>
  <div class="dac-entity-chips">${linkerEntities.map(e => `<a href="${esc(e.path)}" class="dac-entity-chip">${esc(e.name)}</a>`).join('')}</div>
</section>` : ''}

  ${howToGuides.length > 0 ? `<section class="dac-how-to-guides">
  <h2 class="dac-section-title">How-To Guides</h2>
  <ul class="dac-how-to-list">${howToGuides.map(g => `<li><a href="${esc(g.path)}" class="dac-how-to-link">${esc(g.title)}</a></li>`).join('')}</ul>
</section>` : ''}

  <!-- Quality Badges -->
  ${renderToolBadges(tool)}

  <!-- Compatibility -->
  <div id="compatibility">${renderCompatibilityTable(tool, langCode)}</div>

  <!-- Performance -->
  <div id="performance-privacy">${renderPerformanceMetrics(tool)}</div>

  ${adBottom}

</main>

${renderFooter(langCode, config, data.categories, popularTools(data.tools))}

<script src="/assets/js/analytics.js" defer></script>
<script src="/assets/js/platform.js" defer></script>
<script src="/assets/js/runtime.js" defer></script>
</body>
</html>`;
}

// ── Developer Tool Page ────────────────────────────────────────────────────

function renderDevToolPage(route, seo, toolLinks, data, config) {
  const { relatedTools = [], guides = [], comparisons: relatedComparisons = [], glossary: relatedGlossary = [], collections: linkerCollections = [], landings: linkerLandings = [], entities: linkerEntities = [], howToGuides = [] } = toolLinks;
  const tool     = route.tool;
  const langCode = route.lang;
  const lang     = route.language;
  const ui       = lang.ui;
  const ads      = data.ads;
  const devOpts  = tool.devOptions || {};

  // Phase 23 enrichment
  const enrichment = (generatePages._enrichmentCache || new Map()).get(tool.slug) || enrichTool(tool, data);
  const { variants: devVariants, examples: devExamples, faqs: devFaqs, useCases: devUseCases, readingQuality: devRQ } = enrichment;

  const intro    = tool.seo.intro?.[langCode] || tool.seo.intro?.en || devVariants.intro;
  const toolName = tool.name[langCode] || tool.name.en;
  const h1       = seo.h1 || toolName;

  const outputType  = devOpts.outputType  || 'text';
  const inputType   = devOpts.inputType   || 'text';
  const livePreview = devOpts.livePreview !== false;
  const runLabel    = devOpts.runButtonLabel || 'Convert';
  const outputLabel = devOpts.outputLabel    || 'Output';
  const inputPlaceholder = devOpts.inputPlaceholder || 'Paste or type input here…';
  const sampleInput      = devOpts.sampleInput || '';
  const testInput        = devOpts.testInput   || '';
  const downloadExt  = devOpts.downloadExt  || 'txt';
  const downloadMime = devOpts.downloadMime || 'text/plain';
  const extraOptions = JSON.stringify(devOpts.extraOptions || []).replace(/</g, '\\u003c');

  // ── Input panel ──────────────────────────────────────────────────────────

  const inputPanel = inputType === 'none' ? '' : inputType === 'image' ? `
    <div class="dac-dev-panel">
      <div class="dac-dev-panel__header">
        <span class="dac-dev-panel__label">Input Image</span>
      </div>
      <div class="dac-dev-drop" id="dac-dev-drop" role="button" tabindex="0" aria-label="Drop image or click to browse">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
        <span class="dac-dev-drop__label">Drop a QR code image or click to browse</span>
        <span class="dac-dev-drop__hint">PNG, JPEG, WebP, BMP accepted</span>
      </div>
      <input type="hidden" id="dac-dev-input">
    </div>` : `
    <div class="dac-dev-panel">
      <div class="dac-dev-panel__header">
        <span class="dac-dev-panel__label">Input</span>
        <div class="dac-dev-panel__actions">
          <button class="dac-dev-btn" id="dac-dev-sample" type="button">Sample</button>
          <button class="dac-dev-btn" id="dac-dev-clear"  type="button">Clear</button>
        </div>
      </div>
      ${inputType === 'dual' ? `
      <label class="dac-dev-secondary-label" for="dac-dev-input">Regex Pattern</label>` : ''}
      <textarea id="dac-dev-input"
                class="dac-dev-textarea"
                placeholder="${esc(inputPlaceholder)}"
                spellcheck="false"
                aria-label="${esc(toolName)} input"
                rows="10"></textarea>
      ${inputType === 'dual' ? `
      <label class="dac-dev-secondary-label" for="dac-dev-test">Test String</label>
      <textarea id="dac-dev-test"
                class="dac-dev-textarea dac-dev-textarea--secondary"
                placeholder="Enter the string to test your regex against…"
                spellcheck="false"
                aria-label="Test string"
                rows="6"></textarea>` : ''}
      <div class="dac-dev-drop-hint" id="dac-dev-drop">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        Drop a text file here to load it
      </div>
    </div>`;

  // ── Options panel ─────────────────────────────────────────────────────────

  const optionsPanel = (devOpts.extraOptions && devOpts.extraOptions.length) ? `
    <div class="dac-dev-options-panel" id="dac-dev-options" hidden></div>` : '';

  // ── Controls ─────────────────────────────────────────────────────────────

  const controls = inputType === 'none' ? `
    <div class="dac-dev-controls">
      <button class="dac-btn dac-btn--primary" id="dac-dev-run" type="button">${esc(runLabel)}</button>
    </div>` : `
    <div class="dac-dev-controls">
      <button class="dac-btn dac-btn--primary" id="dac-dev-run" type="button">${esc(runLabel)}</button>
    </div>`;

  // ── Output panel ──────────────────────────────────────────────────────────

  const outputPanel = `
    <div class="dac-dev-panel" id="dac-dev-output-wrap" hidden>
      <div class="dac-dev-panel__header">
        <span class="dac-dev-panel__label">${esc(outputLabel)}</span>
        <div class="dac-dev-panel__actions">
          ${outputType === 'color' ? `<div class="dac-dev-color-swatch" id="dac-dev-color-preview" hidden></div>` : ''}
          <button class="dac-dev-btn" id="dac-dev-copy"     type="button" disabled>Copy</button>
          <button class="dac-dev-btn dac-dev-btn--primary" id="dac-dev-download" type="button" disabled>Download</button>
        </div>
      </div>
      <img id="dac-dev-output-img" class="dac-dev-output-img" alt="Generated output" hidden>
      <textarea id="dac-dev-output"
                class="dac-dev-textarea dac-dev-textarea--output"
                readonly
                aria-label="${esc(outputLabel)}"
                aria-live="polite"
                rows="10" hidden></textarea>
    </div>`;

  const statusBar = `<p class="dac-dev-status" id="dac-dev-status" hidden aria-live="polite"></p>`;

  // ── FAQ (Phase 23 — enriched) ─────────────────────────────────────────────

  const faqHtml = renderEnrichedFaq(devFaqs, langCode);

  // ── Features ──────────────────────────────────────────────────────────────

  const featuresHtml = (tool.features || []).map(f =>
    `<div class="dac-feature">
      <span class="dac-feature__icon dac-icon--${esc(f.icon)}" aria-hidden="true"></span>
      <h3 class="dac-feature__title">${esc(f.title[langCode] || f.title.en)}</h3>
      <p class="dac-feature__desc">${esc(f.description[langCode] || f.description.en)}</p>
    </div>`
  ).join('\n      ');

  // ── Related tools ──────────────────────────────────────────────────────────

  const relatedHtml = relatedTools.map(r =>
    `<a href="${r.path}" class="dac-related-tool">
      <span class="dac-related-tool__name">${esc(r.name)}</span>
      ${r.tagline ? `<span class="dac-related-tool__tagline">${esc(r.tagline)}</span>` : ''}
    </a>`
  ).join('\n      ');

  const adTop    = renderAdBlock('top', ads, langCode);
  const adBottom = renderAdBlock('bottom', ads, langCode);
  const breadcrumbHtml = renderBreadcrumb(seo.breadcrumbs || []);
  const toolIndex = buildToolIndex(data.tools, langCode);

  // Data attributes on the root dev tool element carry config to the runtime
  const devToolAttrs = [
    `data-tool-id="${esc(tool.toolId)}"`,
    `data-engine="${esc(tool.engine)}"`,
    `data-engine-fn="${esc(tool.engineFn)}"`,
    `data-output-type="${esc(outputType)}"`,
    `data-input-type="${esc(inputType)}"`,
    `data-live-preview="${livePreview}"`,
    `data-download-ext="${esc(downloadExt)}"`,
    `data-download-mime="${esc(downloadMime)}"`,
    `data-sample="${esc(sampleInput)}"`,
    `data-test-input="${esc(testInput)}"`,
    `data-extra-options="${esc(extraOptions)}"`,
  ].join('\n         ');

  const headOpts = { ads: data.ads, analytics: data.analytics, khIndex: buildKhIndex(data, langCode) };
  return `<!DOCTYPE html>
<html lang="${langCode}" dir="ltr">
<head>
${renderHead(seo, config, toolIndex, headOpts)}
</head>
<body class="dac-page dac-page--tool dac-page--developer">

${renderHeader(langCode, tool.category, data.categories, config, seo.hreflang)}

<nav class="dac-breadcrumb" aria-label="Breadcrumb">
  ${breadcrumbHtml}
</nav>

${adTop}

<main class="dac-main" id="main">

  <!-- Hero -->
  <section class="dac-hero" aria-labelledby="dac-tool-title">
    <div class="dac-hero__title-row">
      <h1 class="dac-hero__title" id="dac-tool-title">${esc(h1)}</h1>
      <button class="dac-fav-btn" id="dac-fav-btn"
              data-slug="${esc(tool.slug)}"
              data-name="${esc(toolName)}"
              aria-label="Add to favorites">♡ Save</button>
    </div>
    ${intro ? `<p class="dac-hero__intro">${esc(intro)}</p>` : ''}
    <p class="dac-privacy-note">${esc(ui.privacyNote)}</p>
  </section>

  <!-- Developer Tool Editor -->
  <section class="dac-dev-editor" aria-label="${esc(toolName)}"
           id="dac-dev-tool"
           ${devToolAttrs}>

    ${statusBar}

    ${inputPanel}

    ${optionsPanel}

    ${controls}

    ${outputPanel}

  </section>

  <!-- Features -->
  ${featuresHtml ? `<section class="dac-features" aria-label="Features">
    <h2 class="dac-section-title">Why use ${esc(toolName)}?</h2>
    <div class="dac-features__grid">
      ${featuresHtml}
    </div>
  </section>` : ''}

  <!-- FAQ -->
  <section class="dac-faq" aria-labelledby="dac-faq-title">
    <h2 class="dac-section-title" id="dac-faq-title">${esc(ui.faq)}</h2>
    ${faqHtml}
  </section>

  <!-- Related Tools -->
  ${relatedHtml ? `<section class="dac-related" aria-labelledby="dac-related-title">
    <h2 class="dac-section-title" id="dac-related-title">${esc(ui.relatedTools)}</h2>
    <div class="dac-related__grid">
      ${relatedHtml}
    </div>
  </section>` : ''}

  ${guides.length > 0 ? `<section class="dac-kh-related" aria-labelledby="dac-dev-guides-title">
    <h2 class="dac-section-title" id="dac-dev-guides-title">Related Guides</h2>
    <div class="dac-kh-article-grid">
      ${guides.map(g => `<a href="${esc(g.path)}" class="dac-kh-article-card">
        <span class="dac-kh-article-card__tag">Guide</span>
        <span class="dac-kh-article-card__title">${esc(g.title)}</span>
        ${g.description ? `<span class="dac-kh-article-card__desc">${esc(g.description)}</span>` : ''}
      </a>`).join('\n')}
    </div>
  </section>` : ''}

  ${linkerCollections.length > 0 ? `<section class="dac-related-collections">
  <h2 class="dac-section-title">Related Collections</h2>
  <div class="dac-kh-article-grid">${linkerCollections.map(c => `<a href="${esc(c.path)}" class="dac-kh-article-card"><h3 class="dac-kh-article-card__title">${esc(c.title)}</h3>${c.description ? `<p class="dac-kh-article-card__desc">${esc(c.description)}</p>` : ''}</a>`).join('')}</div>
</section>` : ''}
  ${linkerLandings.length > 0 ? `<section class="dac-related-landings">
  <h2 class="dac-section-title">More Use Cases</h2>
  <div class="dac-kh-article-grid">${linkerLandings.map(l => `<a href="${esc(l.path)}" class="dac-kh-article-card"><h3 class="dac-kh-article-card__title">${esc(l.title)}</h3>${l.description ? `<p class="dac-kh-article-card__desc">${esc(l.description)}</p>` : ''}</a>`).join('')}</div>
</section>` : ''}
  ${linkerEntities.length > 0 ? `<section class="dac-related-entities">
  <h2 class="dac-section-title">File Format Reference</h2>
  <div class="dac-entity-chips">${linkerEntities.map(e => `<a href="${esc(e.path)}" class="dac-entity-chip">${esc(e.name)}</a>`).join('')}</div>
</section>` : ''}

  <!-- Phase 23: Reading Quality Badge -->
  ${renderReadingQualityBadge(devRQ)}

  <!-- Phase 23: Common Use Cases -->
  ${renderExamplesSection(devExamples)}

  <!-- Phase 23: When to Use -->
  ${renderUseCasesSection(devUseCases, tool.name[langCode] || tool.name.en)}

  ${renderToolBadges(tool)}
  ${renderCompatibilityTable(tool, langCode)}
  ${renderPerformanceMetrics(tool)}

  ${adBottom}

</main>

${renderFooter(langCode, config, data.categories, popularTools(data.tools))}

<script src="/assets/js/analytics.js" defer></script>
<script src="/assets/js/platform.js" defer></script>
<script src="/assets/js/developer-runtime.js" defer></script>
</body>
</html>`;
}

// ── Category Page ──────────────────────────────────────────────────────────

function renderCategoryPage(route, seo, data, config) {
  const category = route.category;
  const langCode = route.lang;
  const lang = route.language;
  const ui = lang.ui;
  const tools = route.tools;
  const ads = data.ads;

  const catName = category.name[langCode] || category.name.en;
  const catDesc = category.description[langCode] || category.description.en;

  // Split tools into conversion and utility groups for cleaner presentation
  const conversionTools = tools.filter(t => t.uiGroup !== 'utility');
  const utilityTools    = tools.filter(t => t.uiGroup === 'utility');

  const renderToolCards = (toolList) => toolList.map(t =>
    `<a href="/${langCode}/${t.slug}" class="dac-tool-card">
      <h3 class="dac-tool-card__name">${esc(t.name[langCode] || t.name.en)}</h3>
      <p class="dac-tool-card__tagline">${esc(t.tagline?.[langCode] || t.tagline?.en || '')}</p>
    </a>`
  ).join('\n    ');

  // Category features (if defined in categories.json)
  const featuresHtml = (category.features || []).map(f =>
    `<div class="dac-feature">
      <span class="dac-feature__icon dac-icon--${esc(f.icon)}" aria-hidden="true"></span>
      <h3 class="dac-feature__title">${esc(f.title[langCode] || f.title.en)}</h3>
      <p class="dac-feature__desc">${esc(f.description[langCode] || f.description.en)}</p>
    </div>`
  ).join('\n      ');

  // Category FAQ (if defined in categories.json)
  const faqHtml = (category.faq || []).map(item =>
    `<details class="dac-faq__item">
      <summary class="dac-faq__question">${esc(item.question[langCode] || item.question.en)}</summary>
      <div class="dac-faq__answer">${esc(item.answer[langCode] || item.answer.en)}</div>
    </details>`
  ).join('\n    ');

  // Related categories (all other categories)
  const otherCats = data.categories.filter(c => c.id !== category.id);
  const relatedCatHtml = otherCats.map(c =>
    `<a href="/${langCode}/${c.slug}" class="dac-related-cat">
      <span class="dac-related-cat__name">${esc(c.name[langCode] || c.name.en)}</span>
      <span class="dac-related-cat__desc">${esc(c.description[langCode] || c.description.en)}</span>
    </a>`
  ).join('\n      ');

  // Knowledge hub: related guides for this category
  const catGuides = (data.articles || []).filter(a => a.category === category.id).slice(0, 4);
  const catGuidesHtml = catGuides.length > 0 ? catGuides.map(a => {
    const title = a.h1?.[langCode] || a.h1?.en || '';
    const desc = a.description?.[langCode] || a.description?.en || '';
    return `<a href="/${langCode}/guides/${a.slug}" class="dac-kh-index-card">
      <span class="dac-kh-index-card__tag">Guide</span>
      <h3 class="dac-kh-index-card__title">${esc(title)}</h3>
      ${desc ? `<p class="dac-kh-index-card__desc">${esc(desc)}</p>` : ''}
      <span class="dac-kh-index-card__cta">Read →</span>
    </a>`;
  }).join('\n') : '';

  // Knowledge hub: related comparisons for this category
  const catTools = tools.map(t => t.slug);
  const catComparisons = (data.comparisons || []).filter(c =>
    (c.relatedTools || []).some(s => catTools.includes(s))
  ).slice(0, 3);
  const catComparisonsHtml = catComparisons.length > 0 ? catComparisons.map(c => {
    const title = c.h1?.[langCode] || c.h1?.en || `${c.subjectA} vs ${c.subjectB}`;
    const desc = c.description?.[langCode] || c.description?.en || '';
    return `<a href="/${langCode}/compare/${c.slug}" class="dac-kh-index-card">
      <span class="dac-kh-index-card__tag">Compare</span>
      <h3 class="dac-kh-index-card__title">${esc(title)}</h3>
      ${desc ? `<p class="dac-kh-index-card__desc">${esc(desc)}</p>` : ''}
      <span class="dac-kh-index-card__cta">Compare →</span>
    </a>`;
  }).join('\n') : '';

  // Knowledge hub: glossary terms for this category
  const catGlossary = (data.glossary || []).filter(g => g.category === category.id).slice(0, 6);
  const catGlossaryHtml = catGlossary.length > 0 ? catGlossary.map(g =>
    `<a href="/${langCode}/glossary/${g.slug}" class="dac-glossary-term-chip">${esc(g.term?.[langCode] || g.term?.en || g.slug)}</a>`
  ).join('\n') : '';

  const adTop    = renderAdBlock('top', ads, langCode);
  const adMiddle = renderAdBlock('middle', ads, langCode);
  const adBottom = renderAdBlock('bottom', ads, langCode);

  const breadcrumbHtml = renderBreadcrumb(seo.breadcrumbs || []);
  const toolIndex = buildToolIndex(data.tools, langCode);

  const headOpts = { ads: data.ads, analytics: data.analytics, khIndex: buildKhIndex(data, langCode) };
  return `<!DOCTYPE html>
<html lang="${langCode}" dir="ltr">
<head>
${renderHead(seo, config, toolIndex, headOpts)}
</head>
<body class="dac-page dac-page--category">

${renderHeader(langCode, category.id, data.categories, config, seo.hreflang)}

<nav class="dac-breadcrumb" aria-label="Breadcrumb">
  ${breadcrumbHtml}
</nav>

${adTop}

<main class="dac-main" id="main">

  <!-- Hero -->
  <section class="dac-hero" aria-labelledby="dac-cat-title">
    <h1 class="dac-hero__title" id="dac-cat-title">${esc(catName)}</h1>
    <p class="dac-hero__intro">${esc(catDesc)}</p>
    <p class="dac-privacy-note">${esc(lang?.ui?.privacyNote || 'Your files never leave your device.')}</p>
  </section>

  <!-- Conversion Tools -->
  ${conversionTools.length > 0 ? `<section class="dac-tool-section" aria-labelledby="dac-conv-title">
    <h2 class="dac-section-title" id="dac-conv-title">${esc(category.sectionLabels?.conversionSection?.[langCode] || category.sectionLabels?.conversionSection?.en || 'Tools')}</h2>
    <div class="dac-tool-grid">
      ${renderToolCards(conversionTools)}
    </div>
  </section>` : ''}

  ${adMiddle}

  <!-- Utility Tools -->
  ${utilityTools.length > 0 ? `<section class="dac-tool-section" aria-labelledby="dac-util-title">
    <h2 class="dac-section-title" id="dac-util-title">${esc(category.sectionLabels?.utilitySection?.[langCode] || category.sectionLabels?.utilitySection?.en || 'Tools')}</h2>
    <div class="dac-tool-grid">
      ${renderToolCards(utilityTools)}
    </div>
  </section>` : ''}

  <!-- Features -->
  ${featuresHtml ? `<section class="dac-features" aria-labelledby="dac-feat-title">
    <h2 class="dac-section-title" id="dac-feat-title">${esc(ui.features || 'Features')}</h2>
    <div class="dac-features__grid">
      ${featuresHtml}
    </div>
  </section>` : ''}

  <!-- FAQ -->
  ${faqHtml ? `<section class="dac-faq" aria-labelledby="dac-faq-title">
    <h2 class="dac-section-title" id="dac-faq-title">${esc(ui.faq || 'FAQ')}</h2>
    ${faqHtml}
  </section>` : ''}

  <!-- Knowledge Hub: Guides for this category -->
  ${catGuidesHtml ? `<section class="dac-kh-related" aria-labelledby="dac-cat-guides-title">
    <h2 class="dac-section-title" id="dac-cat-guides-title">Guides &amp; Articles</h2>
    <div class="dac-kh-index-grid">${catGuidesHtml}</div>
  </section>` : ''}

  <!-- Knowledge Hub: Format Comparisons -->
  ${catComparisonsHtml ? `<section class="dac-kh-related" aria-labelledby="dac-cat-cmp-title">
    <h2 class="dac-section-title" id="dac-cat-cmp-title">Format Comparisons</h2>
    <div class="dac-kh-index-grid">${catComparisonsHtml}</div>
  </section>` : ''}

  <!-- Knowledge Hub: Glossary terms -->
  ${catGlossaryHtml ? `<section class="dac-kh-related" aria-labelledby="dac-cat-gloss-title">
    <h2 class="dac-section-title" id="dac-cat-gloss-title">Key Terms</h2>
    <div class="dac-glossary-related-terms">${catGlossaryHtml}</div>
  </section>` : ''}

  <!-- Related Categories -->
  ${relatedCatHtml ? `<section class="dac-related" aria-labelledby="dac-related-title">
    <h2 class="dac-section-title" id="dac-related-title">Other Tools</h2>
    <div class="dac-related__grid">
      ${relatedCatHtml}
    </div>
  </section>` : ''}

  ${adBottom}

</main>

${renderFooter(langCode, config, data.categories, popularTools(data.tools))}
<script src="/assets/js/analytics.js" defer></script>
<script src="/assets/js/platform.js" defer></script>
</body>
</html>`;
}

// ── Hub (Home) Page ────────────────────────────────────────────────────────

function renderHubPage(route, seo, data, config) {
  const langCode = route.lang;
  const ads = data.ads;

  const categoriesHtml = data.categories.map(cat =>
    `<a href="/${langCode}/${cat.slug}" class="dac-category-card" style="--cat-color:${cat.color}">
      <h2 class="dac-category-card__name">${esc(cat.name[langCode] || cat.name.en)}</h2>
      <p class="dac-category-card__desc">${esc(cat.description[langCode] || cat.description.en)}</p>
    </a>`
  ).join('\n    ');

  const adTop    = renderAdBlock('top', ads, langCode);
  const adBottom = renderAdBlock('bottom', ads, langCode);
  const toolIndex = buildToolIndex(data.tools, langCode);

  const headOpts = { ads: data.ads, analytics: data.analytics, khIndex: buildKhIndex(data, langCode) };
  return `<!DOCTYPE html>
<html lang="${langCode}" dir="ltr">
<head>
${renderHead(seo, config, toolIndex, headOpts)}
</head>
<body class="dac-page dac-page--hub">

${renderHeader(langCode, null, data.categories, config, seo.hreflang)}

${adTop}

<main class="dac-main" id="main">
  <section class="dac-hero">
    <h1 class="dac-hero__title">${esc(config.site.name)}</h1>
    <p class="dac-hero__intro">${esc(config.site.tagline)}</p>
    <p class="dac-privacy-note">${esc(route.language?.ui?.privacyNote || 'Your files never leave your device.')}</p>
  </section>

  <!-- Recent tools — populated by platform.js from localStorage -->
  <section class="dac-dynamic-section" id="dac-recent-section" hidden aria-labelledby="dac-recent-title">
    <div class="dac-dynamic-section__header">
      <h2 class="dac-section-title" id="dac-recent-title">Recently Used</h2>
    </div>
    <div class="dac-tool-grid" id="dac-recent-grid"></div>
  </section>

  <!-- Favorites — populated by platform.js from localStorage -->
  <section class="dac-dynamic-section" id="dac-favorites-section" hidden aria-labelledby="dac-fav-title">
    <div class="dac-dynamic-section__header">
      <h2 class="dac-section-title" id="dac-fav-title">Your Favorites</h2>
    </div>
    <div class="dac-tool-grid" id="dac-favorites-grid"></div>
  </section>

  <section aria-label="Tool categories">
    <div class="dac-categories__grid">
      ${categoriesHtml}
    </div>
  </section>

  <!-- Conversion History — populated by platform.js from localStorage -->
  <section class="dac-dynamic-section" id="dac-history-section" hidden aria-labelledby="dac-hist-title">
    <div class="dac-dynamic-section__header">
      <h2 class="dac-section-title" id="dac-hist-title">Conversion History</h2>
      <button class="dac-dynamic-section__clear" id="dac-clear-history" type="button">Clear history</button>
    </div>
    <div id="dac-history-list"></div>
  </section>

  ${(() => {
    const recentArticles = [...(data.articles || [])].filter(a => a.lastUpdated).sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated)).slice(0, 4);
    const recentComparisons = [...(data.comparisons || [])].filter(c => c.lastUpdated).sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated)).slice(0, 2);
    const recentGlossary = [...(data.glossary || [])].filter(g => g.lastUpdated).sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated)).slice(0, 3);
    const allRecent = [
      ...recentArticles.map(a => ({ type: 'article', title: a.h1?.[langCode] || a.h1?.en || a.slug, path: `/${langCode}/guides/${a.slug}`, date: a.lastUpdated })),
      ...recentComparisons.map(c => ({ type: 'comparison', title: c.h1?.[langCode] || c.h1?.en || `${c.subjectA} vs ${c.subjectB}`, path: `/${langCode}/compare/${c.slug}`, date: c.lastUpdated })),
      ...recentGlossary.map(g => ({ type: 'glossary', title: g.term?.[langCode] || g.term?.en || g.slug, path: `/${langCode}/glossary/${g.slug}`, date: g.lastUpdated })),
    ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
    if (allRecent.length === 0) return '';
    return `<section class="dac-freshness-section" aria-labelledby="dac-freshness-title">
  <h2 class="dac-section-title" id="dac-freshness-title">Recently Updated</h2>
  <div class="dac-kh-article-grid">${allRecent.map(item => `<a href="${esc(item.path)}" class="dac-kh-article-card"><span class="dac-kh-type-badge">${esc(item.type)}</span><h3 class="dac-kh-article-card__title">${esc(item.title)}</h3><p class="dac-kh-article-card__desc">${esc(item.date)}</p></a>`).join('')}</div>
</section>`;
  })()}

  ${adBottom}
</main>

${renderFooter(langCode, config, data.categories, popularTools(data.tools))}
<script src="/assets/js/analytics.js" defer></script>
<script src="/assets/js/platform.js" defer></script>
</body>
</html>`;
}

// ── How-To Step Builder ────────────────────────────────────────────────────

function buildHowToSteps(tool, langCode, ui) {
  const inLabel = inputFormatsLabel(tool);
  const outLabel = outputFormatsLabel(tool);
  const hasPaste   = tool.capabilities.includes('clipboard-paste');
  const hasBatch   = tool.capabilities.includes('batch');
  const hasQuality = tool.capabilities.includes('quality-control');
  const hasResize  = tool.capabilities.includes('resize');
  const hasRotate  = tool.capabilities.includes('rotate');
  const hasFlip    = tool.capabilities.includes('flip');
  const hasWmark   = tool.capabilities.includes('watermark');
  const hasCrop    = tool.capabilities.includes('crop');
  const hasTextIn  = tool.capabilities.includes('text-input');

  const uploadStep = hasTextIn
    ? `<strong>Paste or type</strong> your Base64 string or data URL into the text area below, or drop a <code>.txt</code> file containing the encoded data.`
    : `<strong>Upload</strong> your ${inLabel} file${hasBatch ? 's' : ''} by dragging and dropping onto the converter${hasPaste ? ', pasting from clipboard (Ctrl+V),' : ''} or clicking to browse your device.`;

  const optionSteps = [
    ...(hasQuality  ? [`<strong>Adjust quality</strong> using the slider. Higher values produce sharper images with larger file sizes — 85 is a good starting point for most uses.`] : []),
    ...(hasResize   ? [`<strong>Enter the target dimensions</strong> in pixels. Check "Maintain aspect ratio" to avoid distorting the image — leave one field blank to scale proportionally.`] : []),
    ...(hasRotate   ? [`<strong>Choose the rotation angle</strong> from the dropdown — 90°, 180°, or 270° clockwise.`] : []),
    ...(hasFlip     ? [`<strong>Select the flip direction</strong> — horizontal mirrors the image left-to-right, vertical mirrors it top-to-bottom.`] : []),
    ...(hasWmark    ? [`<strong>Enter your watermark text</strong>, choose a position on the image, and set the opacity level.`] : []),
    ...(hasCrop     ? [`<strong>Enter the crop coordinates</strong> — X and Y define the top-left corner; Width and Height define the crop size. Leave Width/Height blank to extend to the image edge.`] : []),
  ];

  const convertStep = `<strong>Click "${ui.convertButton}"</strong> to start. Processing happens instantly in your browser — your files are never uploaded to any server.`;

  const downloadStep = hasBatch && tool.batch.maxFiles > 1
    ? `<strong>Download</strong> your ${outLabel} file${hasBatch ? 's' : ''}. Multiple files are automatically packaged as a single ZIP for easy download.`
    : `<strong>Download</strong> your ${outLabel} file directly — no account or sign-up required.`;

  return [uploadStep, ...optionSteps, convertStep, downloadStep];
}

function inputFormatsLabel(tool) {
  return tool.inputFormats
    .map(f => (f.split('/')[1] || f).toUpperCase())
    .join('/');
}

function outputFormatsLabel(tool) {
  return tool.outputFormats.map(f => f.label).join('/');
}

// ── Legal Pages ────────────────────────────────────────────────────────────

function getLegalContent(slug) {
  switch (slug) {
    case 'privacy-policy': return `
      <section style="margin-bottom:2rem">
        <h2 style="font-size:1.25rem;margin-bottom:.5rem">1. Overview</h2>
        <p>DropAnyConvert is a browser-based file conversion platform. We are committed to protecting your privacy. This policy explains what data we collect, how we use it, and your rights.</p>
      </section>
      <section style="margin-bottom:2rem">
        <h2 style="font-size:1.25rem;margin-bottom:.5rem">2. Data We Do Not Collect</h2>
        <p>All file conversions run entirely in your browser using standard Web APIs (Canvas, WebAssembly, Web Crypto). <strong>Your files are never uploaded to any server.</strong> We cannot see, store, or access the files you process.</p>
        <p>We do not require account registration. We do not collect names, email addresses, or any personally identifiable information.</p>
      </section>
      <section style="margin-bottom:2rem">
        <h2 style="font-size:1.25rem;margin-bottom:.5rem">3. Local Storage</h2>
        <p>We use browser <code>localStorage</code> to store your preferences (theme, recent tools, favourites). This data never leaves your device and is not transmitted to us.</p>
      </section>
      <section style="margin-bottom:2rem">
        <h2 style="font-size:1.25rem;margin-bottom:.5rem">4. Analytics</h2>
        <p>If analytics are enabled on your deployment, we may collect aggregated, anonymised usage data (page views, tool usage frequency) to improve the service. No personal data or file content is included. See our <a href="cookie-policy" rel="noopener">Cookie Policy</a> for details.</p>
      </section>
      <section style="margin-bottom:2rem">
        <h2 style="font-size:1.25rem;margin-bottom:.5rem">5. Advertising</h2>
        <p>We display advertisements via Google AdSense. Google may use cookies to serve personalised ads based on your browsing activity. You can opt out via <a href="https://adssettings.google.com" rel="noopener noreferrer" target="_blank">Google Ad Settings</a> or by enabling Do Not Track in your browser.</p>
      </section>
      <section style="margin-bottom:2rem">
        <h2 style="font-size:1.25rem;margin-bottom:.5rem">6. Your Rights (GDPR)</h2>
        <p>If you are located in the European Economic Area, you have the right to access, rectify, and erase personal data we hold about you. Because we hold no personal data beyond anonymous analytics, there is typically nothing to erase. For advertising-related data, please refer to Google's privacy controls.</p>
      </section>
      <section style="margin-bottom:2rem">
        <h2 style="font-size:1.25rem;margin-bottom:.5rem">7. Children's Privacy</h2>
        <p>DropAnyConvert does not knowingly collect data from children under 13. If you believe a child has provided personal information, please contact us and we will take appropriate action.</p>
      </section>
      <section style="margin-bottom:2rem">
        <h2 style="font-size:1.25rem;margin-bottom:.5rem">8. Changes to This Policy</h2>
        <p>We may update this policy periodically. The "Last Updated" date at the top of this page indicates when the most recent revision was made. Continued use of the service constitutes acceptance of the updated policy.</p>
      </section>
      <section style="margin-bottom:2rem">
        <h2 style="font-size:1.25rem;margin-bottom:.5rem">9. Contact</h2>
        <p>For privacy inquiries, contact us at <a href="mailto:privacy@dropanyconvert.com">privacy@dropanyconvert.com</a>.</p>
      </section>`;

    case 'terms-of-service': return `
      <section style="margin-bottom:2rem">
        <h2 style="font-size:1.25rem;margin-bottom:.5rem">1. Acceptance</h2>
        <p>By accessing or using DropAnyConvert, you agree to be bound by these Terms of Service. If you do not agree, please do not use the service.</p>
      </section>
      <section style="margin-bottom:2rem">
        <h2 style="font-size:1.25rem;margin-bottom:.5rem">2. License to Use</h2>
        <p>We grant you a limited, non-exclusive, non-transferable, revocable licence to use DropAnyConvert for personal and commercial purposes, subject to these Terms.</p>
      </section>
      <section style="margin-bottom:2rem">
        <h2 style="font-size:1.25rem;margin-bottom:.5rem">3. Acceptable Use</h2>
        <p>You agree not to use DropAnyConvert to process files that contain malware, violate third-party intellectual property rights, or contravene applicable law. You are solely responsible for the content of any files you process.</p>
      </section>
      <section style="margin-bottom:2rem">
        <h2 style="font-size:1.25rem;margin-bottom:.5rem">4. No Warranties</h2>
        <p>DropAnyConvert is provided "as is" and "as available" without warranties of any kind, express or implied. We do not warrant that the service will be uninterrupted, error-free, or that output files will be accurate or fit for any particular purpose.</p>
      </section>
      <section style="margin-bottom:2rem">
        <h2 style="font-size:1.25rem;margin-bottom:.5rem">5. Limitation of Liability</h2>
        <p>To the maximum extent permitted by law, DropAnyConvert and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service.</p>
      </section>
      <section style="margin-bottom:2rem">
        <h2 style="font-size:1.25rem;margin-bottom:.5rem">6. Intellectual Property</h2>
        <p>The DropAnyConvert name, logo, and platform code are proprietary. You retain all rights to any files you process. You grant no rights to us by using the service — we never receive your files.</p>
      </section>
      <section style="margin-bottom:2rem">
        <h2 style="font-size:1.25rem;margin-bottom:.5rem">7. Changes and Termination</h2>
        <p>We reserve the right to modify or discontinue the service at any time without notice. We may also revise these Terms at any time. Continued use after changes constitutes acceptance.</p>
      </section>
      <section style="margin-bottom:2rem">
        <h2 style="font-size:1.25rem;margin-bottom:.5rem">8. Governing Law</h2>
        <p>These Terms shall be governed by and construed in accordance with applicable law. Any disputes shall be subject to the exclusive jurisdiction of the competent courts.</p>
      </section>`;

    case 'cookie-policy': return `
      <section style="margin-bottom:2rem">
        <h2 style="font-size:1.25rem;margin-bottom:.5rem">1. What Are Cookies?</h2>
        <p>Cookies are small text files stored in your browser. DropAnyConvert uses cookies and similar technologies minimally and only for the purposes described below.</p>
      </section>
      <section style="margin-bottom:2rem">
        <h2 style="font-size:1.25rem;margin-bottom:.5rem">2. Essential Storage (localStorage)</h2>
        <p>We use browser <code>localStorage</code> (not cookies) to remember your preferences: colour theme, recently used tools, and favourites. This storage is local to your device and is never transmitted to a server.</p>
      </section>
      <section style="margin-bottom:2rem">
        <h2 style="font-size:1.25rem;margin-bottom:.5rem">3. Advertising Cookies (Google AdSense)</h2>
        <p>We display ads via Google AdSense. Google sets cookies (<code>IDE</code>, <code>DSID</code>, and others) to serve personalised advertisements based on your interests. These cookies are set by Google domains, not by us. You can manage these preferences at <a href="https://adssettings.google.com" rel="noopener noreferrer" target="_blank">Google Ad Settings</a>.</p>
      </section>
      <section style="margin-bottom:2rem">
        <h2 style="font-size:1.25rem;margin-bottom:.5rem">4. Analytics Cookies (optional)</h2>
        <p>If analytics are enabled, anonymous usage data may be collected to help us understand how the service is used. No personal data is included. The analytics provider may set session cookies. You can opt out via your browser's Do Not Track setting or by using a browser extension such as uBlock Origin.</p>
      </section>
      <section style="margin-bottom:2rem">
        <h2 style="font-size:1.25rem;margin-bottom:.5rem">5. How to Manage Cookies</h2>
        <p>You can control cookies through your browser settings. Blocking all cookies may affect the functionality of some websites, but DropAnyConvert's core conversion tools will continue to work because they do not rely on cookies.</p>
      </section>`;

    case 'disclaimer': return `
      <section style="margin-bottom:2rem">
        <h2 style="font-size:1.25rem;margin-bottom:.5rem">1. General Disclaimer</h2>
        <p>The information and tools provided by DropAnyConvert are for general informational and utility purposes only. We make no representations or warranties of any kind, express or implied, about the completeness, accuracy, reliability, or fitness for a particular purpose of any output produced by the tools.</p>
      </section>
      <section style="margin-bottom:2rem">
        <h2 style="font-size:1.25rem;margin-bottom:.5rem">2. File Conversion Accuracy</h2>
        <p>File conversions are performed using browser APIs (Canvas, WebAssembly) and open-source libraries. Output quality may vary depending on the input file, browser version, and device capabilities. Always verify output files before relying on them for critical purposes.</p>
      </section>
      <section style="margin-bottom:2rem">
        <h2 style="font-size:1.25rem;margin-bottom:.5rem">3. No Liability for File Loss</h2>
        <p>DropAnyConvert processes files entirely within your browser. We are not responsible for any data loss, corruption, or unintended modification of your files. We strongly recommend keeping backups of original files before conversion.</p>
      </section>
      <section style="margin-bottom:2rem">
        <h2 style="font-size:1.25rem;margin-bottom:.5rem">4. Third-Party Links</h2>
        <p>Our service may contain links to third-party websites. We have no control over the content or privacy practices of these sites and accept no responsibility for them.</p>
      </section>
      <section style="margin-bottom:2rem">
        <h2 style="font-size:1.25rem;margin-bottom:.5rem">5. No Guarantee of Availability</h2>
        <p>We do not guarantee that DropAnyConvert will be available at all times or that it will be free from errors or interruptions. We may suspend, withdraw, or restrict the availability of all or any part of the service at any time.</p>
      </section>`;

    default: return '<p>Page not found.</p>';
  }
}

function renderLegalPage(route, seo, data, config) {
  const langCode = route.lang;
  const legalPage = route.legal;
  const pageTitle = legalPage.titles[langCode] || legalPage.titles.en;
  const isEnglish = langCode === 'en';

  const breadcrumbHtml = renderBreadcrumb(seo.breadcrumbs || []);
  const toolIndex = buildToolIndex(data.tools, langCode);
  const headOpts = { ads: data.ads, analytics: data.analytics, isLegal: true, khIndex: buildKhIndex(data, langCode) };

  const langNotice = !isEnglish
    ? `<div style="background:var(--dac-surface-2,#f3f4f6);border-left:3px solid var(--dac-primary,#6366f1);padding:.75rem 1rem;margin-bottom:1.5rem;font-size:.875rem">
        This document is only available in English. The English version governs in all cases.
      </div>`
    : '';

  const content = getLegalContent(legalPage.slug);

  return `<!DOCTYPE html>
<html lang="${langCode}" dir="ltr">
<head>
${renderHead(seo, config, toolIndex, headOpts)}
</head>
<body class="dac-page dac-page--legal">

${renderHeader(langCode, null, data.categories, config, seo.hreflang)}

<nav class="dac-breadcrumb" aria-label="Breadcrumb">
  ${breadcrumbHtml}
</nav>

<main class="dac-main" id="main" style="max-width:760px;margin:0 auto;padding:2rem 1.5rem 4rem">
  <h1 style="font-size:2rem;margin-bottom:.5rem">${esc(pageTitle)}</h1>
  <p style="font-size:.875rem;color:var(--dac-text-muted,#666);margin-bottom:2rem">Last updated: ${esc(legalPage.lastUpdated)}</p>

  ${langNotice}

  <div class="dac-legal-body" style="line-height:1.75;color:var(--dac-text,#111)">
    ${content}
  </div>

  <div style="margin-top:3rem;padding-top:2rem;border-top:1px solid var(--dac-border,#e5e7eb)">
    <a href="/${langCode}" class="dac-btn dac-btn--ghost">← Back to tools</a>
  </div>
</main>

${renderFooter(langCode, config, data.categories, popularTools(data.tools))}
<script src="/assets/js/analytics.js" defer></script>
<script src="/assets/js/platform.js" defer></script>
</body>
</html>`;
}

// ── Knowledge Hub shared helpers ───────────────────────────────────────────

function estReadingTime(text) {
  const words = (text || '').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function renderKnowledgeBreadcrumb(seo) {
  return renderBreadcrumb(seo.breadcrumbs || []);
}

function knowledgeRelatedToolCards(slugs, tools, langCode, baseUrl) {
  if (!slugs || slugs.length === 0) return '';
  const cards = slugs
    .map(s => tools.find(t => t.slug === s))
    .filter(Boolean)
    .slice(0, 6)
    .map(t => {
      const name = t.name?.[langCode] || t.name?.en || t.slug;
      const tagline = t.tagline?.[langCode] || t.tagline?.en || '';
      return `<a href="/${langCode}/${t.slug}" class="dac-kh-tool-card">
        <span class="dac-kh-tool-card__name">${esc(name)}</span>
        ${tagline ? `<span class="dac-kh-tool-card__desc">${esc(tagline)}</span>` : ''}
      </a>`;
    }).join('\n');
  if (!cards) return '';
  return `<section class="dac-kh-related" aria-labelledby="related-tools-heading">
    <h2 class="dac-kh-related__title" id="related-tools-heading">Related Tools</h2>
    <div class="dac-kh-tool-grid">${cards}</div>
  </section>`;
}

function knowledgeRelatedArticleCards(slugs, articles, comparisons, langCode) {
  if (!slugs || slugs.length === 0) return '';
  const allKnowledge = [...(articles || []), ...(comparisons || [])];
  const cards = slugs
    .map(s => allKnowledge.find(a => a.slug === s))
    .filter(Boolean)
    .slice(0, 6)
    .map(a => {
      const isComparison = a.articleType === 'comparison';
      const href = isComparison ? `/${langCode}/compare/${a.slug}` : `/${langCode}/guides/${a.slug}`;
      const title = a.h1?.[langCode] || a.h1?.en || a.title?.[langCode] || a.title?.en || a.slug;
      const desc = a.description?.[langCode] || a.description?.en || '';
      return `<a href="${href}" class="dac-kh-article-card">
        <span class="dac-kh-article-card__tag">${isComparison ? 'Compare' : 'Guide'}</span>
        <span class="dac-kh-article-card__title">${esc(title)}</span>
        ${desc ? `<span class="dac-kh-article-card__desc">${esc(desc)}</span>` : ''}
      </a>`;
    }).join('\n');
  if (!cards) return '';
  return `<section class="dac-kh-related" aria-labelledby="related-articles-heading">
    <h2 class="dac-kh-related__title" id="related-articles-heading">Related Guides</h2>
    <div class="dac-kh-article-grid">${cards}</div>
  </section>`;
}

function renderKnowledgeFaq(faq, langCode) {
  if (!faq || faq.length === 0) return '';
  const items = faq.map(item => {
    const q = item.question?.[langCode] || item.question?.en || '';
    const a = item.answer?.[langCode] || item.answer?.en || '';
    return `<details class="dac-faq__item">
      <summary class="dac-faq__question">${esc(q)}</summary>
      <div class="dac-faq__answer">${esc(a)}</div>
    </details>`;
  }).join('\n');
  return `<section class="dac-kh-faq" aria-labelledby="faq-heading">
    <h2 class="dac-kh-section-title" id="faq-heading">Frequently Asked Questions</h2>
    <div class="dac-faq">${items}</div>
  </section>`;
}

function renderArticleToc(sections, langCode) {
  if (!sections || sections.length === 0) return '';
  const items = sections.map(s => {
    const heading = s.heading?.[langCode] || s.heading?.en || '';
    return `<li><a href="#${esc(s.id)}" class="dac-kh-toc__link">${esc(heading)}</a></li>`;
  }).join('\n');
  return `<nav class="dac-kh-toc" aria-label="Table of contents">
    <h2 class="dac-kh-toc__title">Contents</h2>
    <ol class="dac-kh-toc__list">${items}</ol>
  </nav>`;
}

function renderProgressBar() {
  return `<div class="dac-reading-progress" role="progressbar" aria-label="Reading progress" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
    <div class="dac-reading-progress__bar" id="dac-progress-bar"></div>
  </div>`;
}

// ── Article Page ───────────────────────────────────────────────────────────

function renderArticlePage(route, seo, data, config, nav = {}) {
  const article = route.article;
  const langCode = route.lang;
  const lang = route.language;
  const toolIndex = buildToolIndex(data.tools, langCode);
  const headOpts = { ads: data.ads, analytics: data.analytics, isLegal: false, khIndex: buildKhIndex(data, langCode) };
  const { prev, next } = nav;

  const h1 = seo.h1 || article.h1?.en || '';
  const intro = article.intro?.[langCode] || article.intro?.en || '';
  const sections = article.sections || [];
  const allText = [intro, ...sections.map(s => s.content?.[langCode] || s.content?.en || '')].join(' ');
  const readingTime = estReadingTime(allText);
  const lastUpdated = article.lastUpdated || '';

  const tocHtml = renderArticleToc(sections, langCode);
  const sectionsHtml = sections.map(s => {
    const heading = s.heading?.[langCode] || s.heading?.en || '';
    const content = s.content?.[langCode] || s.content?.en || '';
    return `<section class="dac-kh-section" id="${esc(s.id)}">
      <h2 class="dac-kh-section-title">${esc(heading)}</h2>
      <p class="dac-kh-section-content">${esc(content)}</p>
    </section>`;
  }).join('\n');

  const faqHtml = renderKnowledgeFaq(article.faq, langCode);
  const relToolsHtml = knowledgeRelatedToolCards(article.relatedTools, data.tools, langCode, config.site.baseUrl);
  const relArticlesHtml = knowledgeRelatedArticleCards(article.relatedArticles, data.articles, data.comparisons, langCode);

  return `<!DOCTYPE html>
<html lang="${langCode}" dir="ltr">
<head>
${renderHead(seo, config, toolIndex, headOpts)}
  <link rel="preload" href="/assets/css/article.css" as="style"><link rel="stylesheet" href="/assets/css/article.css" media="print" onload="this.media='all'"><noscript><link rel="stylesheet" href="/assets/css/article.css"></noscript>
</head>
<body class="dac-page dac-page--article">
${renderProgressBar()}

${renderHeader(langCode, null, data.categories, config, seo.hreflang)}

<nav class="dac-breadcrumb" aria-label="Breadcrumb">
  ${renderKnowledgeBreadcrumb(seo)}
</nav>

<main class="dac-main dac-article-layout" id="main">
  <article class="dac-article" itemscope itemtype="https://schema.org/Article">
    <header class="dac-article__header">
      <div class="dac-article__meta">
        <span class="dac-article__tag">Guide</span>
        <span class="dac-article__reading-time">${readingTime} min read</span>
        ${lastUpdated ? `<time class="dac-article__date" datetime="${esc(lastUpdated)}">Updated ${esc(lastUpdated)}</time>` : ''}
      </div>
      <h1 class="dac-article__title" itemprop="headline">${esc(h1)}</h1>
      ${intro ? `<p class="dac-article__intro" itemprop="description">${esc(intro)}</p>` : ''}
    </header>

    ${renderAiCitationBlock(article, langCode, data)}

    ${tocHtml}

    <div class="dac-article__body" itemprop="articleBody">
      ${sectionsHtml}
    </div>

    ${faqHtml}

    <footer class="dac-article__footer">
      <div class="dac-article__actions">
        <button class="dac-btn dac-btn--ghost dac-btn--sm" onclick="window.print()">Print</button>
        <button class="dac-btn dac-btn--ghost dac-btn--sm" id="dac-share-btn">Share</button>
        <a href="#" class="dac-btn dac-btn--ghost dac-btn--sm" id="dac-back-top">↑ Back to top</a>
      </div>
      ${renderKhMeta(article, langCode)}
      ${(prev || next) ? `<nav class="dac-article-nav" aria-label="Article navigation">
        ${prev ? `<a href="/${langCode}/guides/${prev.slug}" class="dac-article-nav__prev">
          <span class="dac-article-nav__label">← Previous</span>
          <span class="dac-article-nav__title">${esc(prev.h1?.[langCode] || prev.h1?.en || prev.slug)}</span>
        </a>` : '<span></span>'}
        ${next ? `<a href="/${langCode}/guides/${next.slug}" class="dac-article-nav__next">
          <span class="dac-article-nav__label">Next →</span>
          <span class="dac-article-nav__title">${esc(next.h1?.[langCode] || next.h1?.en || next.slug)}</span>
        </a>` : '<span></span>'}
      </nav>` : ''}
    </footer>
  </article>

  <aside class="dac-article-sidebar">
    ${tocHtml ? `<div class="dac-sidebar-toc" aria-label="Quick navigation">${tocHtml}</div>` : ''}
  </aside>
</main>

<div class="dac-article-related-wrapper">
  ${relToolsHtml}
  ${relArticlesHtml}
</div>

${renderFooter(langCode, config, data.categories, popularTools(data.tools))}
<script src="/assets/js/article-runtime.js" defer></script>
<script src="/assets/js/platform.js" defer></script>
</body>
</html>`;
}

// ── Comparison Page ────────────────────────────────────────────────────────

function renderComparisonPage(route, seo, data, config) {
  const cmp = route.comparison;
  const langCode = route.lang;
  const toolIndex = buildToolIndex(data.tools, langCode);
  const headOpts = { ads: data.ads, analytics: data.analytics, khIndex: buildKhIndex(data, langCode) };

  const h1 = seo.h1 || cmp.h1?.en || '';
  const intro = cmp.intro?.[langCode] || cmp.intro?.en || '';
  const lastUpdated = cmp.lastUpdated || '';

  const tableRows = (cmp.comparisonTable?.rows || []).map(row => {
    const aspect = row.aspect?.[langCode] || row.aspect?.en || '';
    const a = row.a?.[langCode] || row.a?.en || '';
    const b = row.b?.[langCode] || row.b?.en || '';
    return `<tr>
      <th scope="row" class="dac-cmp-table__aspect">${esc(aspect)}</th>
      <td class="dac-cmp-table__cell">${esc(a)}</td>
      <td class="dac-cmp-table__cell">${esc(b)}</td>
    </tr>`;
  }).join('\n');

  const tableHtml = tableRows ? `<div class="dac-cmp-table-wrap">
    <table class="dac-cmp-table" aria-label="${esc(cmp.subjectA)} vs ${esc(cmp.subjectB)} comparison">
      <thead>
        <tr>
          <th class="dac-cmp-table__heading">Feature</th>
          <th class="dac-cmp-table__heading dac-cmp-table__heading--a">${esc(cmp.subjectA)}</th>
          <th class="dac-cmp-table__heading dac-cmp-table__heading--b">${esc(cmp.subjectB)}</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  </div>` : '';

  const renderAdvList = (items, lang) => (items || []).map(i => `<li>${esc(i?.[lang] || i?.en || '')}</li>`).join('\n');

  const advantagesHtml = (cmp.advantages?.a || cmp.advantages?.b) ? `<div class="dac-cmp-adv-grid">
    <div class="dac-cmp-adv dac-cmp-adv--a">
      <h3 class="dac-cmp-adv__title">${esc(cmp.subjectA)} Advantages</h3>
      <ul class="dac-cmp-adv__list">${renderAdvList(cmp.advantages?.a, langCode)}</ul>
    </div>
    <div class="dac-cmp-adv dac-cmp-adv--b">
      <h3 class="dac-cmp-adv__title">${esc(cmp.subjectB)} Advantages</h3>
      <ul class="dac-cmp-adv__list">${renderAdvList(cmp.advantages?.b, langCode)}</ul>
    </div>
  </div>` : '';

  const disadvHtml = (cmp.disadvantages?.a || cmp.disadvantages?.b) ? `<div class="dac-cmp-adv-grid">
    <div class="dac-cmp-adv dac-cmp-adv--a">
      <h3 class="dac-cmp-adv__title">${esc(cmp.subjectA)} Disadvantages</h3>
      <ul class="dac-cmp-adv__list dac-cmp-adv__list--neg">${renderAdvList(cmp.disadvantages?.a, langCode)}</ul>
    </div>
    <div class="dac-cmp-adv dac-cmp-adv--b">
      <h3 class="dac-cmp-adv__title">${esc(cmp.subjectB)} Disadvantages</h3>
      <ul class="dac-cmp-adv__list dac-cmp-adv__list--neg">${renderAdvList(cmp.disadvantages?.b, langCode)}</ul>
    </div>
  </div>` : '';

  const whenHtml = (cmp.whenToUse?.a || cmp.whenToUse?.b) ? `<section class="dac-kh-section">
    <h2 class="dac-kh-section-title">When to Use Each</h2>
    <div class="dac-cmp-when-grid">
      <div class="dac-cmp-when dac-cmp-when--a">
        <h3 class="dac-cmp-when__title">Use ${esc(cmp.subjectA)} when</h3>
        <p>${esc(cmp.whenToUse?.a?.[langCode] || cmp.whenToUse?.a?.en || '')}</p>
      </div>
      <div class="dac-cmp-when dac-cmp-when--b">
        <h3 class="dac-cmp-when__title">Use ${esc(cmp.subjectB)} when</h3>
        <p>${esc(cmp.whenToUse?.b?.[langCode] || cmp.whenToUse?.b?.en || '')}</p>
      </div>
    </div>
  </section>` : '';

  const verdictHtml = cmp.verdict ? `<section class="dac-kh-section dac-cmp-verdict">
    <h2 class="dac-kh-section-title">Verdict</h2>
    <p class="dac-cmp-verdict__text">${esc(cmp.verdict?.[langCode] || cmp.verdict?.en || '')}</p>
  </section>` : '';

  const perfHtml = cmp.performanceNote ? `<section class="dac-kh-section">
    <h2 class="dac-kh-section-title">Performance</h2>
    <p>${esc(cmp.performanceNote?.[langCode] || cmp.performanceNote?.en || '')}</p>
  </section>` : '';

  const browserHtml = (cmp.browserSupport?.a || cmp.browserSupport?.b) ? `<section class="dac-kh-section">
    <h2 class="dac-kh-section-title">Browser Support</h2>
    <div class="dac-cmp-when-grid">
      <div><strong>${esc(cmp.subjectA)}:</strong> <span>${esc(cmp.browserSupport?.a?.[langCode] || cmp.browserSupport?.a?.en || '')}</span></div>
      <div><strong>${esc(cmp.subjectB)}:</strong> <span>${esc(cmp.browserSupport?.b?.[langCode] || cmp.browserSupport?.b?.en || '')}</span></div>
    </div>
  </section>` : '';

  const faqHtml = renderKnowledgeFaq(cmp.faq, langCode);
  const relToolsHtml = knowledgeRelatedToolCards(cmp.relatedTools, data.tools, langCode, config.site.baseUrl);
  const relArticlesHtml = knowledgeRelatedArticleCards(cmp.relatedArticles, data.articles, data.comparisons, langCode);

  return `<!DOCTYPE html>
<html lang="${langCode}" dir="ltr">
<head>
${renderHead(seo, config, toolIndex, headOpts)}
  <link rel="preload" href="/assets/css/article.css" as="style"><link rel="stylesheet" href="/assets/css/article.css" media="print" onload="this.media='all'"><noscript><link rel="stylesheet" href="/assets/css/article.css"></noscript>
</head>
<body class="dac-page dac-page--comparison">
${renderProgressBar()}

${renderHeader(langCode, null, data.categories, config, seo.hreflang)}

<nav class="dac-breadcrumb" aria-label="Breadcrumb">
  ${renderKnowledgeBreadcrumb(seo)}
</nav>

<main class="dac-main dac-article-layout" id="main">
  <article class="dac-article" itemscope itemtype="https://schema.org/Article">
    <header class="dac-article__header">
      <div class="dac-article__meta">
        <span class="dac-article__tag">Comparison</span>
        ${lastUpdated ? `<time class="dac-article__date" datetime="${esc(lastUpdated)}">Updated ${esc(lastUpdated)}</time>` : ''}
      </div>
      <h1 class="dac-article__title" itemprop="headline">${esc(h1)}</h1>
      ${intro ? `<p class="dac-article__intro" itemprop="description">${esc(intro)}</p>` : ''}
    </header>

    <div class="dac-article__body" itemprop="articleBody">
      ${tableHtml}

      ${advantagesHtml ? `<section class="dac-kh-section"><h2 class="dac-kh-section-title">Advantages</h2>${advantagesHtml}</section>` : ''}
      ${disadvHtml ? `<section class="dac-kh-section"><h2 class="dac-kh-section-title">Disadvantages</h2>${disadvHtml}</section>` : ''}
      ${whenHtml}
      ${perfHtml}
      ${browserHtml}
      ${verdictHtml}
    </div>

    ${faqHtml}

    <footer class="dac-article__footer">
      <div class="dac-article__actions">
        <button class="dac-btn dac-btn--ghost dac-btn--sm" onclick="window.print()">Print</button>
        <button class="dac-btn dac-btn--ghost dac-btn--sm" id="dac-share-btn">Share</button>
      </div>
      ${renderKhMeta(cmp, langCode)}
    </footer>
  </article>
  <aside class="dac-article-sidebar"></aside>
</main>

<div class="dac-article-related-wrapper">
  ${relToolsHtml}
  ${relArticlesHtml}
</div>

${renderFooter(langCode, config, data.categories, popularTools(data.tools))}
<script src="/assets/js/article-runtime.js" defer></script>
<script src="/assets/js/platform.js" defer></script>
</body>
</html>`;
}

// ── Glossary Term Page ─────────────────────────────────────────────────────

function renderGlossaryTermPage(route, seo, data, config) {
  const term = route.term;
  const langCode = route.lang;
  const toolIndex = buildToolIndex(data.tools, langCode);
  const headOpts = { ads: data.ads, analytics: data.analytics, khIndex: buildKhIndex(data, langCode) };

  const termName = term.term?.[langCode] || term.term?.en || '';
  const shortDef = term.shortDef?.[langCode] || term.shortDef?.en || '';
  const definition = term.definition?.[langCode] || term.definition?.en || '';
  const examples = (term.examples || []).map(e => e?.[langCode] || e?.en || '').filter(Boolean);
  const lastUpdated = term.lastUpdated || '';

  const relatedTermsHtml = (term.relatedTerms || []).length > 0 ? `<section class="dac-kh-section">
    <h2 class="dac-kh-section-title">Related Terms</h2>
    <div class="dac-glossary-related-terms">
      ${(term.relatedTerms || []).map(s => `<a href="/${langCode}/glossary/${esc(s)}" class="dac-glossary-term-chip">${esc(s.replace(/-/g, ' '))}</a>`).join('\n')}
    </div>
  </section>` : '';

  const examplesHtml = examples.length > 0 ? `<section class="dac-kh-section">
    <h2 class="dac-kh-section-title">Examples</h2>
    <ul class="dac-glossary-examples">
      ${examples.map(e => `<li>${esc(e)}</li>`).join('\n')}
    </ul>
  </section>` : '';

  const relToolsHtml = knowledgeRelatedToolCards(term.relatedTools, data.tools, langCode, config.site.baseUrl);

  return `<!DOCTYPE html>
<html lang="${langCode}" dir="ltr">
<head>
${renderHead(seo, config, toolIndex, headOpts)}
  <link rel="preload" href="/assets/css/article.css" as="style"><link rel="stylesheet" href="/assets/css/article.css" media="print" onload="this.media='all'"><noscript><link rel="stylesheet" href="/assets/css/article.css"></noscript>
</head>
<body class="dac-page dac-page--glossary">

${renderHeader(langCode, null, data.categories, config, seo.hreflang)}

<nav class="dac-breadcrumb" aria-label="Breadcrumb">
  ${renderKnowledgeBreadcrumb(seo)}
</nav>

<main class="dac-main dac-article-layout" id="main">
  <article class="dac-article dac-glossary-article">
    <header class="dac-article__header">
      <div class="dac-article__meta">
        <span class="dac-article__tag">Glossary</span>
        ${lastUpdated ? `<time class="dac-article__date" datetime="${esc(lastUpdated)}">Updated ${esc(lastUpdated)}</time>` : ''}
      </div>
      <h1 class="dac-article__title" itemprop="name">${esc(termName)}</h1>
      ${shortDef ? `<p class="dac-glossary-shortdef" itemprop="description">${esc(shortDef)}</p>` : ''}
    </header>

    <div class="dac-article__body">
      <section class="dac-kh-section">
        <h2 class="dac-kh-section-title">Definition</h2>
        <p class="dac-glossary-definition">${esc(definition)}</p>
      </section>

      ${examplesHtml}
      ${relatedTermsHtml}
    </div>

    <footer class="dac-article__footer">
      ${renderKhMeta(term, langCode)}
      <a href="/${langCode}/glossary" class="dac-btn dac-btn--ghost dac-btn--sm">← All Glossary Terms</a>
    </footer>
  </article>
  <aside class="dac-article-sidebar"></aside>
</main>

<div class="dac-article-related-wrapper">
  ${relToolsHtml}
</div>

${renderFooter(langCode, config, data.categories, popularTools(data.tools))}
<script src="/assets/js/platform.js" defer></script>
</body>
</html>`;
}

// ── Guides Index Page ──────────────────────────────────────────────────────

function renderGuidesIndexPage(route, seo, data, config) {
  const langCode = route.lang;
  const toolIndex = buildToolIndex(data.tools, langCode);
  const headOpts = { ads: data.ads, analytics: data.analytics, khIndex: buildKhIndex(data, langCode) };
  const articles = (route.articles || []).sort((a, b) => (b.lastUpdated || '').localeCompare(a.lastUpdated || ''));

  const cards = articles.map(a => {
    const title = a.h1?.[langCode] || a.h1?.en || '';
    const desc = a.description?.[langCode] || a.description?.en || '';
    return `<a href="/${langCode}/guides/${a.slug}" class="dac-kh-index-card">
      <span class="dac-kh-index-card__tag">Guide</span>
      <h2 class="dac-kh-index-card__title">${esc(title)}</h2>
      ${desc ? `<p class="dac-kh-index-card__desc">${esc(desc)}</p>` : ''}
      <span class="dac-kh-index-card__cta">Read guide →</span>
    </a>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="${langCode}" dir="ltr">
<head>
${renderHead(seo, config, toolIndex, headOpts)}
  <link rel="preload" href="/assets/css/article.css" as="style"><link rel="stylesheet" href="/assets/css/article.css" media="print" onload="this.media='all'"><noscript><link rel="stylesheet" href="/assets/css/article.css"></noscript>
</head>
<body class="dac-page dac-page--knowledge-index">

${renderHeader(langCode, null, data.categories, config, seo.hreflang)}

<nav class="dac-breadcrumb" aria-label="Breadcrumb">
  ${renderKnowledgeBreadcrumb(seo)}
</nav>

<main class="dac-main" id="main" style="max-width:1100px;margin:0 auto;padding:2rem 1.5rem 4rem">
  <header class="dac-kh-index-header">
    <h1 class="dac-kh-index-title">Guides</h1>
    <p class="dac-kh-index-desc">In-depth guides to image, PDF, and developer file formats — how they work, when to use them, and how to convert between them.</p>
  </header>
  <div class="dac-kh-index-grid">${cards}</div>
</main>

${renderFooter(langCode, config, data.categories, popularTools(data.tools))}
<script src="/assets/js/platform.js" defer></script>
</body>
</html>`;
}

// ── Compare Index Page ─────────────────────────────────────────────────────

function renderCompareIndexPage(route, seo, data, config) {
  const langCode = route.lang;
  const toolIndex = buildToolIndex(data.tools, langCode);
  const headOpts = { ads: data.ads, analytics: data.analytics, khIndex: buildKhIndex(data, langCode) };
  const comparisons = route.comparisons || [];

  const cards = comparisons.map(c => {
    const title = c.h1?.[langCode] || c.h1?.en || `${c.subjectA} vs ${c.subjectB}`;
    const desc = c.description?.[langCode] || c.description?.en || '';
    return `<a href="/${langCode}/compare/${c.slug}" class="dac-kh-index-card">
      <span class="dac-kh-index-card__tag">Comparison</span>
      <h2 class="dac-kh-index-card__title">${esc(title)}</h2>
      ${desc ? `<p class="dac-kh-index-card__desc">${esc(desc)}</p>` : ''}
      <span class="dac-kh-index-card__cta">Compare →</span>
    </a>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="${langCode}" dir="ltr">
<head>
${renderHead(seo, config, toolIndex, headOpts)}
  <link rel="preload" href="/assets/css/article.css" as="style"><link rel="stylesheet" href="/assets/css/article.css" media="print" onload="this.media='all'"><noscript><link rel="stylesheet" href="/assets/css/article.css"></noscript>
</head>
<body class="dac-page dac-page--knowledge-index">

${renderHeader(langCode, null, data.categories, config, seo.hreflang)}

<nav class="dac-breadcrumb" aria-label="Breadcrumb">
  ${renderKnowledgeBreadcrumb(seo)}
</nav>

<main class="dac-main" id="main" style="max-width:1100px;margin:0 auto;padding:2rem 1.5rem 4rem">
  <header class="dac-kh-index-header">
    <h1 class="dac-kh-index-title">Format Comparisons</h1>
    <p class="dac-kh-index-desc">Side-by-side comparisons of image formats, data formats, and document types — which to choose and when.</p>
  </header>
  <div class="dac-kh-index-grid">${cards}</div>
</main>

${renderFooter(langCode, config, data.categories, popularTools(data.tools))}
<script src="/assets/js/platform.js" defer></script>
</body>
</html>`;
}

// ── Glossary Index Page ────────────────────────────────────────────────────

function renderGlossaryIndexPage(route, seo, data, config) {
  const langCode = route.lang;
  const toolIndex = buildToolIndex(data.tools, langCode);
  const headOpts = { ads: data.ads, analytics: data.analytics, khIndex: buildKhIndex(data, langCode) };
  const terms = (route.terms || []).sort((a, b) => {
    const ta = a.term?.[langCode] || a.term?.en || '';
    const tb = b.term?.[langCode] || b.term?.en || '';
    return ta.localeCompare(tb);
  });

  const cards = terms.map(t => {
    const name = t.term?.[langCode] || t.term?.en || '';
    const shortDef = t.shortDef?.[langCode] || t.shortDef?.en || '';
    return `<a href="/${langCode}/glossary/${t.slug}" class="dac-kh-index-card dac-glossary-card">
      <h2 class="dac-kh-index-card__title">${esc(name)}</h2>
      ${shortDef ? `<p class="dac-kh-index-card__desc">${esc(shortDef)}</p>` : ''}
    </a>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="${langCode}" dir="ltr">
<head>
${renderHead(seo, config, toolIndex, headOpts)}
  <link rel="preload" href="/assets/css/article.css" as="style"><link rel="stylesheet" href="/assets/css/article.css" media="print" onload="this.media='all'"><noscript><link rel="stylesheet" href="/assets/css/article.css"></noscript>
</head>
<body class="dac-page dac-page--knowledge-index">

${renderHeader(langCode, null, data.categories, config, seo.hreflang)}

<nav class="dac-breadcrumb" aria-label="Breadcrumb">
  ${renderKnowledgeBreadcrumb(seo)}
</nav>

<main class="dac-main" id="main" style="max-width:1100px;margin:0 auto;padding:2rem 1.5rem 4rem">
  <header class="dac-kh-index-header">
    <h1 class="dac-kh-index-title">Glossary</h1>
    <p class="dac-kh-index-desc">Definitions and explanations of image, PDF, and developer terminology.</p>
  </header>
  <div class="dac-kh-index-grid">${cards}</div>
</main>

${renderFooter(langCode, config, data.categories, popularTools(data.tools))}
<script src="/assets/js/platform.js" defer></script>
</body>
</html>`;
}

// ── Collection Page ────────────────────────────────────────────────────────

function renderCollectionPage(route, seo, data, config) {
  const coll = route.collection;
  const langCode = route.lang;
  const toolIndex = buildToolIndex(data.tools, langCode);
  const headOpts = { ads: data.ads, analytics: data.analytics, khIndex: buildKhIndex(data, langCode) };

  const h1 = seo.h1 || coll.h1?.[langCode] || coll.h1?.en || '';
  const intro = coll.intro?.[langCode] || coll.intro?.en || '';
  const tools = route.tools || [];

  const toolCards = tools.map(t => {
    const name = t.name?.[langCode] || t.name?.en || '';
    const tagline = t.tagline?.[langCode] || t.tagline?.en || '';
    return `<a href="/${langCode}/${t.slug}" class="dac-kh-tool-card">
      <span class="dac-kh-tool-card__name">${esc(name)}</span>
      ${tagline ? `<span class="dac-kh-tool-card__desc">${esc(tagline)}</span>` : ''}
    </a>`;
  }).join('\n');

  // Related guides
  const relGuides = (coll.relatedGuides || []).map(slug => (data.articles || []).find(a => a.slug === slug)).filter(Boolean);
  const relComparisons = (coll.relatedComparisons || []).map(slug => (data.comparisons || []).find(c => c.slug === slug)).filter(Boolean);

  const guidesHtml = relGuides.length > 0 ? `<section class="dac-kh-related" aria-labelledby="coll-guides-title">
    <h2 class="dac-kh-related__title" id="coll-guides-title">Related Guides</h2>
    <div class="dac-kh-article-grid">
      ${relGuides.map(a => {
        const title = a.h1?.[langCode] || a.h1?.en || '';
        const desc = a.description?.[langCode] || a.description?.en || '';
        return `<a href="/${langCode}/guides/${a.slug}" class="dac-kh-article-card">
          <span class="dac-kh-article-card__tag">Guide</span>
          <span class="dac-kh-article-card__title">${esc(title)}</span>
          ${desc ? `<span class="dac-kh-article-card__desc">${esc(desc)}</span>` : ''}
        </a>`;
      }).join('\n')}
    </div>
  </section>` : '';

  const cmpHtml = relComparisons.length > 0 ? `<section class="dac-kh-related" aria-labelledby="coll-cmp-title">
    <h2 class="dac-kh-related__title" id="coll-cmp-title">Format Comparisons</h2>
    <div class="dac-kh-article-grid">
      ${relComparisons.map(c => {
        const title = c.h1?.[langCode] || c.h1?.en || `${c.subjectA} vs ${c.subjectB}`;
        const desc = c.description?.[langCode] || c.description?.en || '';
        return `<a href="/${langCode}/compare/${c.slug}" class="dac-kh-article-card">
          <span class="dac-kh-article-card__tag">Compare</span>
          <span class="dac-kh-article-card__title">${esc(title)}</span>
          ${desc ? `<span class="dac-kh-article-card__desc">${esc(desc)}</span>` : ''}
        </a>`;
      }).join('\n')}
    </div>
  </section>` : '';

  return `<!DOCTYPE html>
<html lang="${langCode}" dir="ltr">
<head>
${renderHead(seo, config, toolIndex, headOpts)}
  <link rel="preload" href="/assets/css/article.css" as="style"><link rel="stylesheet" href="/assets/css/article.css" media="print" onload="this.media='all'"><noscript><link rel="stylesheet" href="/assets/css/article.css"></noscript>
</head>
<body class="dac-page dac-page--collection">

${renderHeader(langCode, null, data.categories, config, seo.hreflang)}

<nav class="dac-breadcrumb" aria-label="Breadcrumb">
  ${renderBreadcrumb(seo.breadcrumbs || [])}
</nav>

<main class="dac-main" id="main" style="max-width:1100px;margin:0 auto;padding:2rem 1.5rem 4rem">
  <header class="dac-kh-index-header">
    <h1 class="dac-kh-index-title">${esc(h1)}</h1>
    ${intro ? `<p class="dac-kh-index-desc">${esc(intro)}</p>` : ''}
  </header>

  <div class="dac-kh-tool-grid" style="margin-bottom:3rem">${toolCards}</div>

  ${guidesHtml}
  ${cmpHtml}
</main>

${renderFooter(langCode, config, data.categories, popularTools(data.tools))}
<script src="/assets/js/platform.js" defer></script>
</body>
</html>`;
}

// ── Collections Index Page ─────────────────────────────────────────────────

function renderCollectionsIndexPage(route, seo, data, config) {
  const langCode = route.lang;
  const toolIndex = buildToolIndex(data.tools, langCode);
  const headOpts = { ads: data.ads, analytics: data.analytics, khIndex: buildKhIndex(data, langCode) };
  const collections = route.collections || [];

  const cards = collections.map(c => {
    const title = c.title?.[langCode] || c.title?.en || '';
    const desc = c.description?.[langCode] || c.description?.en || '';
    const count = (c.toolSlugs || []).length;
    return `<a href="/${langCode}/collections/${c.slug}" class="dac-kh-index-card">
      <span class="dac-kh-index-card__tag">Collection · ${count} tools</span>
      <h2 class="dac-kh-index-card__title">${esc(title)}</h2>
      ${desc ? `<p class="dac-kh-index-card__desc">${esc(desc)}</p>` : ''}
      <span class="dac-kh-index-card__cta">View collection →</span>
    </a>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="${langCode}" dir="ltr">
<head>
${renderHead(seo, config, toolIndex, headOpts)}
  <link rel="preload" href="/assets/css/article.css" as="style"><link rel="stylesheet" href="/assets/css/article.css" media="print" onload="this.media='all'"><noscript><link rel="stylesheet" href="/assets/css/article.css"></noscript>
</head>
<body class="dac-page dac-page--knowledge-index">

${renderHeader(langCode, null, data.categories, config, seo.hreflang)}

<nav class="dac-breadcrumb" aria-label="Breadcrumb">
  ${renderKnowledgeBreadcrumb(seo)}
</nav>

<main class="dac-main" id="main" style="max-width:1100px;margin:0 auto;padding:2rem 1.5rem 4rem">
  <header class="dac-kh-index-header">
    <h1 class="dac-kh-index-title">Tool Collections</h1>
    <p class="dac-kh-index-desc">Curated collections of the best free online tools for images, PDFs, and web development.</p>
  </header>
  <div class="dac-kh-index-grid">${cards}</div>
</main>

${renderFooter(langCode, config, data.categories, popularTools(data.tools))}
<script src="/assets/js/platform.js" defer></script>
</body>
</html>`;
}

// ── Landing Page ───────────────────────────────────────────────────────────

function renderLandingPage(route, seo, data, config) {
  const landing = route.landing;
  const langCode = route.lang;
  const toolIndex = buildToolIndex(data.tools, langCode);
  const headOpts = { ads: data.ads, analytics: data.analytics, khIndex: buildKhIndex(data, langCode) };

  const h1 = seo.h1 || landing.h1?.[langCode] || landing.h1?.en || '';
  const intro = landing.intro?.[langCode] || landing.intro?.en || '';
  const tools = route.tools || [];

  const toolCards = tools.map(t => {
    const name = t.name?.[langCode] || t.name?.en || '';
    const tagline = t.tagline?.[langCode] || t.tagline?.en || '';
    return `<a href="/${langCode}/${t.slug}" class="dac-kh-tool-card">
      <span class="dac-kh-tool-card__name">${esc(name)}</span>
      ${tagline ? `<span class="dac-kh-tool-card__desc">${esc(tagline)}</span>` : ''}
    </a>`;
  }).join('\n');

  const faqHtml = renderKnowledgeFaq(landing.faq, langCode);

  // Related guides and comparisons
  const relGuides = (landing.relatedGuides || []).map(slug => (data.articles || []).find(a => a.slug === slug)).filter(Boolean);
  const relCmps = (landing.relatedComparisons || []).map(slug => (data.comparisons || []).find(c => c.slug === slug)).filter(Boolean);

  const guidesHtml = relGuides.length > 0 ? `<section class="dac-kh-related" aria-labelledby="land-guides-title">
    <h2 class="dac-kh-related__title" id="land-guides-title">Helpful Guides</h2>
    <div class="dac-kh-article-grid">
      ${relGuides.map(a => {
        const title = a.h1?.[langCode] || a.h1?.en || '';
        const desc = a.description?.[langCode] || a.description?.en || '';
        return `<a href="/${langCode}/guides/${a.slug}" class="dac-kh-article-card">
          <span class="dac-kh-article-card__tag">Guide</span>
          <span class="dac-kh-article-card__title">${esc(title)}</span>
          ${desc ? `<span class="dac-kh-article-card__desc">${esc(desc)}</span>` : ''}
        </a>`;
      }).join('\n')}
    </div>
  </section>` : '';

  const cmpHtml = relCmps.length > 0 ? `<section class="dac-kh-related" aria-labelledby="land-cmp-title">
    <h2 class="dac-kh-related__title" id="land-cmp-title">Format Comparisons</h2>
    <div class="dac-kh-article-grid">
      ${relCmps.map(c => {
        const title = c.h1?.[langCode] || c.h1?.en || `${c.subjectA} vs ${c.subjectB}`;
        const desc = c.description?.[langCode] || c.description?.en || '';
        return `<a href="/${langCode}/compare/${c.slug}" class="dac-kh-article-card">
          <span class="dac-kh-article-card__tag">Compare</span>
          <span class="dac-kh-article-card__title">${esc(title)}</span>
          ${desc ? `<span class="dac-kh-article-card__desc">${esc(desc)}</span>` : ''}
        </a>`;
      }).join('\n')}
    </div>
  </section>` : '';

  return `<!DOCTYPE html>
<html lang="${langCode}" dir="ltr">
<head>
${renderHead(seo, config, toolIndex, headOpts)}
  <link rel="preload" href="/assets/css/article.css" as="style"><link rel="stylesheet" href="/assets/css/article.css" media="print" onload="this.media='all'"><noscript><link rel="stylesheet" href="/assets/css/article.css"></noscript>
</head>
<body class="dac-page dac-page--landing">

${renderHeader(langCode, null, data.categories, config, seo.hreflang)}

<nav class="dac-breadcrumb" aria-label="Breadcrumb">
  ${renderBreadcrumb(seo.breadcrumbs || [])}
</nav>

<main class="dac-main" id="main" style="max-width:1100px;margin:0 auto;padding:2rem 1.5rem 4rem">
  <header class="dac-kh-index-header">
    <h1 class="dac-kh-index-title">${esc(h1)}</h1>
    ${intro ? `<p class="dac-kh-index-desc">${esc(intro)}</p>` : ''}
  </header>

  <div class="dac-kh-tool-grid" style="margin-bottom:3rem">${toolCards}</div>

  ${faqHtml}
  ${guidesHtml}
  ${cmpHtml}
</main>

${renderFooter(langCode, config, data.categories, popularTools(data.tools))}
<script src="/assets/js/platform.js" defer></script>
</body>
</html>`;
}

// ── FAQ Hub Page ───────────────────────────────────────────────────────────

function renderFaqHubPage(route, seo, data, config) {
  const langCode = route.lang;
  const toolIndex = buildToolIndex(data.tools, langCode);
  const headOpts = { ads: data.ads, analytics: data.analytics, khIndex: buildKhIndex(data, langCode) };

  // Group FAQs by category
  const categoryMap = new Map(data.categories.map(c => [c.id, c]));
  const grouped = new Map();

  for (const tool of data.tools) {
    if (!tool.faq || tool.faq.length === 0) continue;
    const catId = tool.category;
    if (!grouped.has(catId)) grouped.set(catId, []);
    grouped.get(catId).push({ tool, faqs: tool.faq });
  }

  let groupsHtml = '';
  for (const [catId, entries] of grouped) {
    const cat = categoryMap.get(catId);
    if (!cat) continue;
    const catName = cat.name[langCode] || cat.name.en;
    const items = entries.flatMap(({ tool, faqs }) =>
      faqs.slice(0, 2).map(faq => {
        const q = faq.question?.[langCode] || faq.question?.en || '';
        const a = faq.answer?.[langCode] || faq.answer?.en || '';
        const toolName = tool.name?.[langCode] || tool.name?.en || '';
        return `<details class="dac-faq__item">
          <summary class="dac-faq__question">${esc(q)} <a href="/${langCode}/${tool.slug}" class="dac-faq__tool-link">(${esc(toolName)})</a></summary>
          <div class="dac-faq__answer">${esc(a)}</div>
        </details>`;
      })
    ).slice(0, 12).join('\n');

    groupsHtml += `<section class="dac-faq-group" aria-labelledby="faq-cat-${catId}">
      <h2 class="dac-section-title" id="faq-cat-${catId}">${esc(catName)}</h2>
      <div class="dac-faq">${items}</div>
    </section>`;
  }

  return `<!DOCTYPE html>
<html lang="${langCode}" dir="ltr">
<head>
${renderHead(seo, config, toolIndex, headOpts)}
</head>
<body class="dac-page dac-page--faq-hub">

${renderHeader(langCode, null, data.categories, config, seo.hreflang)}

<nav class="dac-breadcrumb" aria-label="Breadcrumb">
  ${renderBreadcrumb(seo.breadcrumbs || [])}
</nav>

<main class="dac-main" id="main" style="max-width:900px;margin:0 auto;padding:2rem 1.5rem 4rem">
  <h1 class="dac-hero__title" style="margin-bottom:2rem">${esc(seo.h1 || 'Frequently Asked Questions')}</h1>
  <p style="margin-bottom:2rem;color:var(--dac-text-muted,#6b7280)">Answers to the most common questions about our image, PDF, and developer tools.</p>
  ${groupsHtml}
</main>

${renderFooter(langCode, config, data.categories, popularTools(data.tools))}
<script src="/assets/js/platform.js" defer></script>
</body>
</html>`;
}

// ── Trust Center Page ─────────────────────────────────────────────────────

function renderTrustPage(route, seo, data, config) {
  const trust = route.trust;
  const langCode = route.lang;
  const toolIndex = buildToolIndex(data.tools, langCode);
  const headOpts = { ads: data.ads, analytics: data.analytics, khIndex: buildKhIndex(data, langCode) };

  const h1 = seo.h1 || trust.h1?.en || 'Trust & Security Center';
  const description = seo.description || trust.description?.[langCode] || trust.description?.en || '';

  const stats = buildSiteStats(data);

  const sectionsHtml = (trust.sections || []).map(s => {
    const title = s.title?.[langCode] || s.title?.en || '';
    const body  = s.body?.[langCode]  || s.body?.en  || '';
    return `<section class="dac-trust-section" id="${esc(s.id)}">
      <h2 class="dac-trust-section__title">${esc(title)}</h2>
      <p class="dac-trust-section__body">${esc(body)}</p>
    </section>`;
  }).join('\n');

  const editorialLinks = (data.editorial?.pages || []).slice(0, 4).map(ep =>
    `<a href="/${langCode}/editorial/${ep.slug}" class="dac-footer__link">${esc(ep.h1?.[langCode] || ep.h1?.en || ep.slug)}</a>`
  ).join('\n');

  return `<!DOCTYPE html>
<html lang="${langCode}" dir="ltr">
<head>
${renderHead(seo, config, toolIndex, headOpts)}
  <link rel="preload" href="/assets/css/article.css" as="style"><link rel="stylesheet" href="/assets/css/article.css" media="print" onload="this.media='all'"><noscript><link rel="stylesheet" href="/assets/css/article.css"></noscript>
</head>
<body class="dac-page dac-page--trust">

${renderHeader(langCode, null, data.categories, config, seo.hreflang)}

<nav class="dac-breadcrumb" aria-label="Breadcrumb">
  ${renderKnowledgeBreadcrumb(seo)}
</nav>

<main class="dac-main dac-article-layout" id="main">
  <article class="dac-article">
    <header class="dac-article__header">
      <div class="dac-article__meta">
        <span class="dac-article__tag">Trust Center</span>
        <time class="dac-article__date" datetime="${esc(trust.lastUpdated || '')}">${esc(trust.lastUpdated || '')}</time>
      </div>
      <h1 class="dac-article__title">${esc(h1)}</h1>
      <p class="dac-article__intro">${esc(description)}</p>
    </header>

    <!-- Platform stats -->
    <div class="dac-trust-stats" aria-label="Platform statistics">
      <div class="dac-trust-stat"><strong>${stats.toolCount}+</strong><span>Browser Tools</span></div>
      <div class="dac-trust-stat"><strong>${stats.langCount}</strong><span>Languages</span></div>
      <div class="dac-trust-stat"><strong>${stats.knowledgeCount * stats.langCount}+</strong><span>Knowledge Pages</span></div>
      <div class="dac-trust-stat"><strong>0</strong><span>File Uploads (browser tools)</span></div>
    </div>

    <div class="dac-article__body">
      ${sectionsHtml}
    </div>

    <footer class="dac-article__footer">
      <p class="dac-article__footer-meta">Last updated: <time datetime="${esc(trust.lastUpdated || '')}">${esc(trust.lastUpdated || '')}</time></p>
    </footer>
  </article>

  <!-- Editorial Links -->
  ${editorialLinks ? `<aside class="dac-trust-editorial">
    <h2 class="dac-section-title">Editorial Policies</h2>
    <nav aria-label="Editorial pages">${editorialLinks}</nav>
  </aside>` : ''}

</main>

${renderFooter(langCode, config, data.categories, popularTools(data.tools))}
<script src="/assets/js/platform.js" defer></script>
</body>
</html>`;
}

// ── Editorial Page ─────────────────────────────────────────────────────────

function renderEditorialPage(route, seo, data, config) {
  const page = route.editorialPage;
  const langCode = route.lang;
  const toolIndex = buildToolIndex(data.tools, langCode);
  const headOpts = { ads: data.ads, analytics: data.analytics, khIndex: buildKhIndex(data, langCode) };

  const h1 = seo.h1 || page.h1?.[langCode] || page.h1?.en || '';
  const description = seo.description || page.description?.[langCode] || page.description?.en || '';

  const sectionsHtml = (page.sections || []).map(s => {
    const heading = s.heading?.[langCode] || s.heading?.en || '';
    const body    = s.body?.[langCode]    || s.body?.en    || '';
    return `<section class="dac-kh-section">
      <h2 class="dac-kh-section-title">${esc(heading)}</h2>
      <p class="dac-kh-section-content">${esc(body)}</p>
    </section>`;
  }).join('\n');

  // Sidebar: other editorial pages
  const siblingLinks = (data.editorial?.pages || []).map(ep =>
    `<a href="/${langCode}/editorial/${ep.slug}" class="dac-footer__link${ep.slug === page.slug ? ' dac-footer__link--active' : ''}">${esc(ep.h1?.[langCode] || ep.h1?.en || ep.slug)}</a>`
  ).join('\n');

  return `<!DOCTYPE html>
<html lang="${langCode}" dir="ltr">
<head>
${renderHead(seo, config, toolIndex, headOpts)}
  <link rel="preload" href="/assets/css/article.css" as="style"><link rel="stylesheet" href="/assets/css/article.css" media="print" onload="this.media='all'"><noscript><link rel="stylesheet" href="/assets/css/article.css"></noscript>
</head>
<body class="dac-page dac-page--editorial">

${renderHeader(langCode, null, data.categories, config, seo.hreflang)}

<nav class="dac-breadcrumb" aria-label="Breadcrumb">
  ${renderKnowledgeBreadcrumb(seo)}
</nav>

<main class="dac-main dac-article-layout" id="main">
  <article class="dac-article">
    <header class="dac-article__header">
      <div class="dac-article__meta">
        <span class="dac-article__tag">Editorial</span>
        ${page.lastUpdated ? `<time class="dac-article__date" datetime="${esc(page.lastUpdated)}">Updated ${esc(page.lastUpdated)}</time>` : ''}
      </div>
      <h1 class="dac-article__title">${esc(h1)}</h1>
      <p class="dac-article__intro">${esc(description)}</p>
    </header>

    <div class="dac-article__body">
      ${sectionsHtml}
    </div>

    <footer class="dac-article__footer">
      ${renderKhMeta(page, langCode)}
      <a href="/${langCode}/trust" class="dac-btn dac-btn--ghost dac-btn--sm">← Trust Center</a>
    </footer>
  </article>

  <!-- Sibling editorial pages -->
  <aside class="dac-article-sidebar">
    <nav class="dac-sidebar-nav" aria-label="Editorial pages">
      <h2 class="dac-sidebar-nav__title">Editorial Policies</h2>
      <div class="dac-sidebar-nav__links">${siblingLinks}</div>
    </nav>
  </aside>
</main>

${renderFooter(langCode, config, data.categories, popularTools(data.tools))}
<script src="/assets/js/platform.js" defer></script>
</body>
</html>`;
}

// ── Changelog Page ─────────────────────────────────────────────────────────

function renderChangelogPage(route, seo, data, config) {
  const changelog = route.changelog;
  const langCode = route.lang;
  const toolIndex = buildToolIndex(data.tools, langCode);
  const headOpts = { ads: data.ads, analytics: data.analytics, khIndex: buildKhIndex(data, langCode) };

  const h1 = seo.h1 || 'Changelog';

  const releasesHtml = (changelog.releases || []).map(r => {
    const summary = r.summary?.[langCode] || r.summary?.en || '';
    const listItems = (items, label) => items?.length
      ? `<div class="dac-cl-group"><strong class="dac-cl-group__label">${esc(label)}</strong><ul class="dac-cl-list">${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>`
      : '';
    return `<article class="dac-cl-release" id="v${esc(r.version)}">
      <header class="dac-cl-release__header">
        <h2 class="dac-cl-release__version">v${esc(r.version)}</h2>
        <time class="dac-cl-release__date" datetime="${esc(r.date)}">${esc(r.date)}</time>
      </header>
      ${summary ? `<p class="dac-cl-release__summary">${esc(summary)}</p>` : ''}
      ${listItems(r.added, 'Added')}
      ${listItems(r.improved, 'Improved')}
      ${listItems(r.fixed, 'Fixed')}
      ${listItems(r.security, 'Security')}
      ${listItems(r.performance, 'Performance')}
    </article>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="${langCode}" dir="ltr">
<head>
${renderHead(seo, config, toolIndex, headOpts)}
  <link rel="preload" href="/assets/css/article.css" as="style"><link rel="stylesheet" href="/assets/css/article.css" media="print" onload="this.media='all'"><noscript><link rel="stylesheet" href="/assets/css/article.css"></noscript>
</head>
<body class="dac-page dac-page--changelog">

${renderHeader(langCode, null, data.categories, config, seo.hreflang)}

<nav class="dac-breadcrumb" aria-label="Breadcrumb">
  ${renderKnowledgeBreadcrumb(seo)}
</nav>

<main class="dac-main" id="main">
  <header class="dac-page-header">
    <h1 class="dac-page-header__title">${esc(h1)}</h1>
    <p class="dac-page-header__desc">Version history, new features, and improvements for ${esc(config.site.name)}.</p>
  </header>

  <div class="dac-cl-feed">
    ${releasesHtml}
  </div>
</main>

${renderFooter(langCode, config, data.categories, popularTools(data.tools))}
<script src="/assets/js/platform.js" defer></script>
</body>
</html>`;
}

// ── Entity Page ────────────────────────────────────────────────────────────

function renderEntityPage(route, seo, data, config) {
  const entity  = route.entity;
  const langCode = route.lang;
  const toolIndex = buildToolIndex(data.tools, langCode);
  const headOpts = { ads: data.ads, analytics: data.analytics, khIndex: buildKhIndex(data, langCode) };

  const h1 = seo.h1 || `What is ${entity.name}?`;
  const relatedToolObjects = (entity.relatedTools || [])
    .map(s => data.tools.find(t => t.slug === s)).filter(Boolean).slice(0, 8);
  const relatedEntityObjects = (entity.relatedEntities || [])
    .map(s => (data.entities || []).find(e => e.slug === s)).filter(Boolean);
  const relatedArticleObjects = (entity.relatedArticles || [])
    .map(s => (data.articles || []).find(a => a.slug === s)).filter(Boolean);
  const relatedGlossaryObjects = (entity.relatedGlossary || [])
    .map(s => (data.glossary || []).find(g => g.slug === s)).filter(Boolean);

  const mimeList  = (entity.mimeTypes || []).join(', ') || '—';
  const extList   = (entity.extensions || []).join(', ') || '—';
  const bsEntries = Object.entries(entity.browserSupport || {});

  const toolCardsHtml = relatedToolObjects.map(t => {
    const name    = t.name?.[langCode] || t.name?.en || t.slug;
    const tagline = t.tagline?.[langCode] || t.tagline?.en || '';
    return `<a href="/${langCode}/${t.slug}" class="dac-kh-tool-card">
      <span class="dac-kh-tool-card__name">${esc(name)}</span>
      ${tagline ? `<span class="dac-kh-tool-card__desc">${esc(tagline)}</span>` : ''}
    </a>`;
  }).join('\n');

  const entityChipsHtml = relatedEntityObjects.map(e =>
    `<a href="/${langCode}/entity/${e.slug}" class="dac-entity-chip">${esc(e.name)}</a>`
  ).join('\n');

  const bsTableHtml = bsEntries.length ? `
  <table class="dac-compat-table">
    <tbody>
      ${bsEntries.map(([browser, status]) =>
        `<tr><th scope="row">${esc(browser.charAt(0).toUpperCase() + browser.slice(1))}</th><td class="dac-compat-status">${esc(status)}</td></tr>`
      ).join('\n      ')}
    </tbody>
  </table>` : '';

  const faqHtml = (entity.faq || []).map(f =>
    `<details class="dac-faq__item">
      <summary class="dac-faq__question">${esc(f.question)}</summary>
      <div class="dac-faq__answer">${esc(f.answer)}</div>
    </details>`
  ).join('\n');

  return `<!DOCTYPE html>
<html lang="${langCode}" dir="ltr">
<head>
${renderHead(seo, config, toolIndex, headOpts)}
  <link rel="preload" href="/assets/css/article.css" as="style"><link rel="stylesheet" href="/assets/css/article.css" media="print" onload="this.media='all'"><noscript><link rel="stylesheet" href="/assets/css/article.css"></noscript>
</head>
<body class="dac-page dac-page--entity">

${renderHeader(langCode, null, data.categories, config, seo.hreflang)}

<nav class="dac-breadcrumb" aria-label="Breadcrumb">
  ${renderBreadcrumb(seo.breadcrumbs || [])}
</nav>

<main class="dac-main dac-article-layout" id="main">
  <article class="dac-article" itemscope itemtype="https://schema.org/DefinedTerm">
    <header class="dac-article__header">
      <div class="dac-article__meta">
        <span class="dac-article__tag">File Format</span>
        ${entity.category ? `<span class="dac-article__tag dac-article__tag--cat">${esc(entity.category)}</span>` : ''}
        ${entity.invented ? `<span class="dac-article__reading-time">Since ${esc(entity.invented)}</span>` : ''}
      </div>
      <h1 class="dac-article__title" itemprop="name">${esc(h1)}</h1>
      ${entity.description ? `<p class="dac-article__intro" itemprop="description">${esc(entity.description)}</p>` : ''}
    </header>

    <div class="dac-article__body">

      <!-- Technical Details -->
      <section class="dac-kh-section">
        <h2 class="dac-kh-section-title">Technical Details</h2>
        <div class="dac-compat-table-wrap">
          <table class="dac-compat-table">
            <tbody>
              <tr><th scope="row">MIME Type</th><td>${esc(mimeList)}</td></tr>
              <tr><th scope="row">File Extensions</th><td>${esc(extList)}</td></tr>
              ${entity.fullName ? `<tr><th scope="row">Full Name</th><td>${esc(entity.fullName)}</td></tr>` : ''}
              ${entity.invented ? `<tr><th scope="row">Invented</th><td>${esc(entity.invented)}</td></tr>` : ''}
              ${entity.firstSpec ? `<tr><th scope="row">First Specification</th><td>${esc(entity.firstSpec)}</td></tr>` : ''}
              ${entity.category ? `<tr><th scope="row">Category</th><td>${esc(entity.category)}</td></tr>` : ''}
            </tbody>
          </table>
        </div>
        ${entity.technicalDetails ? `<p style="margin-top:.75rem">${esc(entity.technicalDetails)}</p>` : ''}
      </section>

      <!-- Browser Support -->
      ${bsTableHtml ? `<section class="dac-kh-section">
        <h2 class="dac-kh-section-title">Browser Support</h2>
        <div class="dac-compat-table-wrap">${bsTableHtml}</div>
      </section>` : ''}

      <!-- Advantages -->
      ${(entity.advantages || []).length > 0 ? `<section class="dac-kh-section">
        <h2 class="dac-kh-section-title">Advantages</h2>
        <ul class="dac-entity-list dac-entity-list--pro">
          ${entity.advantages.map(a => `<li>${esc(a)}</li>`).join('\n          ')}
        </ul>
      </section>` : ''}

      <!-- Disadvantages -->
      ${(entity.disadvantages || []).length > 0 ? `<section class="dac-kh-section">
        <h2 class="dac-kh-section-title">Disadvantages</h2>
        <ul class="dac-entity-list dac-entity-list--con">
          ${entity.disadvantages.map(d => `<li>${esc(d)}</li>`).join('\n          ')}
        </ul>
      </section>` : ''}

      <!-- Common Uses -->
      ${(entity.commonUses || []).length > 0 ? `<section class="dac-kh-section">
        <h2 class="dac-kh-section-title">Common Uses</h2>
        <ul class="dac-entity-list">
          ${entity.commonUses.map(u => `<li>${esc(u)}</li>`).join('\n          ')}
        </ul>
      </section>` : ''}

      <!-- Related Entities -->
      ${entityChipsHtml ? `<section class="dac-kh-section">
        <h2 class="dac-kh-section-title">Related Formats</h2>
        <div class="dac-entity-chips">${entityChipsHtml}</div>
      </section>` : ''}

      <!-- FAQ -->
      ${faqHtml ? `<section class="dac-kh-faq">
        <h2 class="dac-kh-section-title">Frequently Asked Questions</h2>
        <div class="dac-faq">${faqHtml}</div>
      </section>` : ''}

    </div>
  </article>

  <aside class="dac-article-sidebar">
    ${relatedArticleObjects.length > 0 ? `<div class="dac-sidebar-section">
      <h3 class="dac-sidebar-title">Related Guides</h3>
      ${relatedArticleObjects.map(a => `<a href="/${langCode}/guides/${a.slug}" class="dac-sidebar-link">${esc(a.h1?.[langCode] || a.h1?.en || a.slug)}</a>`).join('\n')}
    </div>` : ''}
    ${relatedGlossaryObjects.length > 0 ? `<div class="dac-sidebar-section">
      <h3 class="dac-sidebar-title">Key Terms</h3>
      ${relatedGlossaryObjects.map(g => `<a href="/${langCode}/glossary/${g.slug}" class="dac-sidebar-link">${esc(g.term?.[langCode] || g.term?.en || g.slug)}</a>`).join('\n')}
    </div>` : ''}
  </aside>
</main>

${toolCardsHtml ? `<div class="dac-article-related-wrapper">
  <section class="dac-kh-related" aria-labelledby="entity-tools-title">
    <h2 class="dac-kh-related__title" id="entity-tools-title">Tools for ${esc(entity.name)} Files</h2>
    <div class="dac-kh-tool-grid">${toolCardsHtml}</div>
  </section>
</div>` : ''}

${renderFooter(langCode, config, data.categories, popularTools(data.tools))}
<script src="/assets/js/platform.js" defer></script>
</body>
</html>`;
}

// ── Entity Index Page ──────────────────────────────────────────────────────

function renderEntityIndexPage(route, seo, data, config) {
  const langCode = route.lang;
  const entities = route.entities || data.entities || [];
  const toolIndex = buildToolIndex(data.tools, langCode);
  const headOpts = { ads: data.ads, analytics: data.analytics, khIndex: buildKhIndex(data, langCode) };

  const byCategory = {};
  for (const e of entities) {
    const cat = e.category || 'other';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(e);
  }

  const groupsHtml = Object.entries(byCategory).map(([cat, items]) => `
  <section class="dac-entity-group">
    <h2 class="dac-section-title dac-entity-group__title">${esc(cat.charAt(0).toUpperCase() + cat.slice(1))} Formats</h2>
    <div class="dac-entity-grid">
      ${items.map(e => `<a href="/${langCode}/entity/${e.slug}" class="dac-entity-card">
        <span class="dac-entity-card__name">${esc(e.name)}</span>
        <span class="dac-entity-card__full">${esc(e.fullName || e.name)}</span>
        ${(e.extensions || []).length > 0 ? `<span class="dac-entity-card__ext">${esc(e.extensions.join(', '))}</span>` : ''}
      </a>`).join('\n      ')}
    </div>
  </section>`).join('\n');

  return `<!DOCTYPE html>
<html lang="${langCode}" dir="ltr">
<head>
${renderHead(seo, config, toolIndex, headOpts)}
  <link rel="preload" href="/assets/css/article.css" as="style"><link rel="stylesheet" href="/assets/css/article.css" media="print" onload="this.media='all'"><noscript><link rel="stylesheet" href="/assets/css/article.css"></noscript>
</head>
<body class="dac-page dac-page--entity-index">

${renderHeader(langCode, null, data.categories, config, seo.hreflang)}

<nav class="dac-breadcrumb" aria-label="Breadcrumb">
  ${renderBreadcrumb(seo.breadcrumbs || [])}
</nav>

<main class="dac-main" id="main">
  <header class="dac-page-header">
    <h1 class="dac-page-header__title">${esc(seo.h1 || 'File Format Reference')}</h1>
    <p class="dac-page-header__desc">Complete reference for image, PDF, and developer file formats.</p>
  </header>
  ${groupsHtml}
</main>

${renderFooter(langCode, config, data.categories, popularTools(data.tools))}
<script src="/assets/js/platform.js" defer></script>
</body>
</html>`;
}

// ── Author Page ────────────────────────────────────────────────────────────

function renderAuthorPage(route, seo, data, config) {
  const author  = route.author;
  const langCode = route.lang;
  const toolIndex = buildToolIndex(data.tools, langCode);
  const headOpts = { ads: data.ads, analytics: data.analytics, khIndex: buildKhIndex(data, langCode) };

  // Articles authored/reviewed by this author
  const reviewedArticles = (data.articles || []).filter(a =>
    a.reviewedBy === author.name || a.reviewedBy === author.role || a.writtenBy === author.slug
  ).slice(0, 12);
  const reviewedComparisons = (data.comparisons || []).filter(c =>
    c.reviewedBy === author.name || c.reviewedBy === author.role
  ).slice(0, 6);
  const reviewedGlossary = (data.glossary || []).filter(g =>
    g.reviewedBy === author.name || g.reviewedBy === author.role
  ).slice(0, 6);

  const articlesHtml = reviewedArticles.map(a => {
    const title = a.h1?.[langCode] || a.h1?.en || a.title?.[langCode] || a.title?.en || a.slug;
    return `<a href="/${langCode}/guides/${a.slug}" class="dac-kh-article-card">
      <span class="dac-kh-article-card__tag">Guide</span>
      <span class="dac-kh-article-card__title">${esc(title)}</span>
    </a>`;
  }).join('\n');

  const comparisonsHtml = reviewedComparisons.map(c => {
    const title = c.h1?.[langCode] || c.h1?.en || `${c.subjectA} vs ${c.subjectB}`;
    return `<a href="/${langCode}/compare/${c.slug}" class="dac-kh-article-card">
      <span class="dac-kh-article-card__tag">Compare</span>
      <span class="dac-kh-article-card__title">${esc(title)}</span>
    </a>`;
  }).join('\n');

  const specialtiesHtml = (author.specialties || []).map(s =>
    `<span class="dac-entity-chip">${esc(s)}</span>`
  ).join('\n');

  return `<!DOCTYPE html>
<html lang="${langCode}" dir="ltr">
<head>
${renderHead(seo, config, toolIndex, headOpts)}
  <link rel="preload" href="/assets/css/article.css" as="style"><link rel="stylesheet" href="/assets/css/article.css" media="print" onload="this.media='all'"><noscript><link rel="stylesheet" href="/assets/css/article.css"></noscript>
</head>
<body class="dac-page dac-page--author">

${renderHeader(langCode, null, data.categories, config, seo.hreflang)}

<nav class="dac-breadcrumb" aria-label="Breadcrumb">
  ${renderBreadcrumb(seo.breadcrumbs || [])}
</nav>

<main class="dac-main" id="main">
  <header class="dac-author-header">
    <div class="dac-author-avatar" aria-hidden="true">
      <span class="dac-author-avatar__initials">${esc((author.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2))}</span>
    </div>
    <div class="dac-author-info">
      <h1 class="dac-author-info__name" itemprop="name">${esc(author.name)}</h1>
      <p class="dac-author-info__role">${esc(author.role)}</p>
      ${author.since ? `<p class="dac-author-info__since">Contributing since ${esc(author.since)}</p>` : ''}
      ${author.bio ? `<p class="dac-author-info__bio">${esc(author.bio)}</p>` : ''}
      ${specialtiesHtml ? `<div class="dac-author-specialties" aria-label="Specialties">${specialtiesHtml}</div>` : ''}
    </div>
  </header>

  ${articlesHtml ? `<section class="dac-author-section">
    <h2 class="dac-section-title">Reviewed Guides (${reviewedArticles.length})</h2>
    <div class="dac-kh-article-grid">${articlesHtml}</div>
  </section>` : ''}

  ${comparisonsHtml ? `<section class="dac-author-section">
    <h2 class="dac-section-title">Reviewed Comparisons (${reviewedComparisons.length})</h2>
    <div class="dac-kh-article-grid">${comparisonsHtml}</div>
  </section>` : ''}

  ${reviewedGlossary.length > 0 ? `<section class="dac-author-section">
    <h2 class="dac-section-title">Reviewed Definitions (${reviewedGlossary.length})</h2>
    <div class="dac-entity-chips">
      ${reviewedGlossary.map(g => `<a href="/${langCode}/glossary/${g.slug}" class="dac-entity-chip">${esc(g.term?.[langCode] || g.term?.en || g.slug)}</a>`).join('\n      ')}
    </div>
  </section>` : ''}
</main>

${renderFooter(langCode, config, data.categories, popularTools(data.tools))}
<script src="/assets/js/platform.js" defer></script>
</body>
</html>`;
}

// ── Phase 17: Intent Page ─────────────────────────────────────────────────

function renderIntentPage(route, seo, data, config) {
  const { intent, modifier, tool } = route;
  const langCode = route.lang;
  const ads = data.ads;
  const toolIndex = buildToolIndex(data.tools, langCode);
  const headOpts = { ads, analytics: data.analytics, khIndex: buildKhIndex(data, langCode) };

  const allFaq = [...(intent.faq || []), ...(modifier.faq || [])];
  const howToSteps = intent.howToSteps?.en || [];
  const relatedEntities = (intent.entitySlugs || [])
    .map(s => (data.entities || []).find(e => e.slug === s)).filter(Boolean);

  // Other modifier pages for this intent (cross-links)
  const siblingPages = (intent.modifiers || [])
    .filter(m => m.slug !== modifier.slug)
    .map(m => ({ slug: m.slug, label: m.label?.en || m.slug, path: `/${langCode}/how-to/${intent.slug}-${m.slug}` }));

  const faqHtml = allFaq.length > 0 ? `
<section class="dac-faq" aria-labelledby="dac-faq-title">
  <h2 class="dac-section-title" id="dac-faq-title">Frequently Asked Questions</h2>
  <dl class="dac-faq__list">
    ${allFaq.map(f => `
    <div class="dac-faq__item">
      <dt class="dac-faq__question">${esc(f.question?.en || '')}</dt>
      <dd class="dac-faq__answer">${esc(f.answer?.en || '')}</dd>
    </div>`).join('')}
  </dl>
</section>` : '';

  const stepsHtml = howToSteps.length > 0 ? `
<section class="dac-how-to-steps" aria-labelledby="dac-steps-title">
  <h2 class="dac-section-title" id="dac-steps-title">How To ${esc(intent.baseTitle?.en || '')}</h2>
  <ol class="dac-steps-list">
    ${howToSteps.map(s => `<li class="dac-steps-list__item">${esc(s)}</li>`).join('')}
  </ol>
</section>` : '';

  const intentBadge = `<span class="dac-intent-badge dac-intent-badge--${esc(seo.searchIntent || 'transactional')}">${esc(seo.searchIntent || 'transactional')}</span>`;

  return `<!DOCTYPE html>
<html lang="${langCode}" dir="ltr">
<head>
${renderHead(seo, config, toolIndex, headOpts)}
</head>
<body class="dac-page dac-page--intent">
${renderHeader(langCode, null, data.categories, config, seo.hreflang)}
<main class="dac-main" id="main">
  ${renderBreadcrumb(seo.breadcrumbs)}

  <div class="dac-intent-layout">
    <article class="dac-intent-article">
      <header class="dac-page-header">
        <p class="dac-intent-category">${esc(tool.category)} · ${intentBadge}</p>
        <h1 class="dac-page-header__title">${esc(seo.h1)}</h1>
        <p class="dac-intent-desc">${esc(modifier.description?.en || intent.description?.en || '')}</p>
      </header>

      <div class="dac-intent-cta">
        <a href="/${langCode}/${tool.slug}" class="dac-btn dac-btn--primary dac-btn--large">
          Use ${esc(tool.name?.en || tool.slug)} — Free Online Tool →
        </a>
        <p class="dac-intent-cta__note">Browser-based · No upload · Instant results</p>
      </div>

      ${stepsHtml}

      ${relatedEntities.length > 0 ? `<section class="dac-related-entities">
        <h2 class="dac-section-title">File Format Reference</h2>
        <div class="dac-entity-chips">
          ${relatedEntities.map(e => `<a href="/${langCode}/entity/${esc(e.slug)}" class="dac-entity-chip">${esc(e.name)} — ${esc(e.fullName || '')}</a>`).join('')}
        </div>
      </section>` : ''}

      ${faqHtml}

      ${siblingPages.length > 0 ? `<section class="dac-related-intents">
        <h2 class="dac-section-title">More ${esc(intent.baseTitle?.en || '')} Guides</h2>
        <ul class="dac-how-to-list">
          ${siblingPages.map(p => `<li><a href="${esc(p.path)}" class="dac-how-to-link">${esc(intent.baseTitle?.en || '')} ${esc(p.label)}</a></li>`).join('')}
        </ul>
      </section>` : ''}
    </article>

    <aside class="dac-intent-sidebar">
      <div class="dac-sidebar-section">
        <p class="dac-sidebar-title">Use This Tool</p>
        <a href="/${langCode}/${tool.slug}" class="dac-btn dac-btn--primary" style="width:100%;text-align:center;display:block">
          ${esc(tool.name?.en || tool.slug)}
        </a>
        <ul class="dac-sidebar-tool-meta" style="margin-top:.75rem;padding:0;list-style:none;font-size:.82rem">
          <li>✅ Free · No signup</li>
          <li>🔒 Files stay on your device</li>
          <li>⚡ Instant browser processing</li>
        </ul>
      </div>
      ${relatedEntities.length > 0 ? `<div class="dac-sidebar-section">
        <p class="dac-sidebar-title">Format Info</p>
        ${relatedEntities.map(e => `<a href="/${langCode}/entity/${esc(e.slug)}" class="dac-sidebar-link">${esc(e.name)} — ${esc((e.description || '').slice(0, 60))}…</a>`).join('')}
      </div>` : ''}
    </aside>
  </div>
</main>
${renderFooter(langCode, config, data.categories, popularTools(data.tools))}
<script src="/assets/js/analytics.js" defer></script>
<script src="/assets/js/platform.js" defer></script>
</body>
</html>`;
}

// ── Phase 17: How-To Index Page ──────────────────────────────────────────

function renderHowToIndexPage(route, seo, data, config) {
  const langCode = route.lang;
  const headOpts = { ads: data.ads, analytics: data.analytics, khIndex: buildKhIndex(data, langCode) };
  const toolIndex = buildToolIndex(data.tools, langCode);

  const intentGroups = {};
  for (const intent of (data.intents || [])) {
    const cat = (data.tools.find(t => t.slug === intent.toolSlug) || {}).category || 'other';
    if (!intentGroups[cat]) intentGroups[cat] = [];
    intentGroups[cat].push(intent);
  }

  const groupsHtml = Object.entries(intentGroups).map(([cat, intents]) => `
<section class="dac-kh-section">
  <h2 class="dac-section-title">${esc(cat.charAt(0).toUpperCase() + cat.slice(1))} How-To Guides</h2>
  <ul class="dac-how-to-list">
    ${intents.flatMap(i => (i.modifiers || []).map(m => `<li><a href="/${langCode}/how-to/${esc(i.slug)}-${esc(m.slug)}" class="dac-how-to-link">${esc(i.baseTitle?.en || i.slug)} ${esc(m.label?.en || m.slug)}</a></li>`)).join('')}
  </ul>
</section>`).join('');

  return `<!DOCTYPE html>
<html lang="${langCode}" dir="ltr">
<head>
${renderHead(seo, config, toolIndex, headOpts)}
</head>
<body class="dac-page dac-page--kh">
${renderHeader(langCode, null, data.categories, config, seo.hreflang)}
<main class="dac-main" id="main">
  ${renderBreadcrumb(seo.breadcrumbs)}
  <header class="dac-page-header">
    <h1 class="dac-page-header__title">${esc(seo.h1)}</h1>
    <p class="dac-page-header__desc">Step-by-step guides for every file conversion task. Free, browser-based tools — no upload, no signup.</p>
  </header>
  ${groupsHtml}
</main>
${renderFooter(langCode, config, data.categories, popularTools(data.tools))}
<script src="/assets/js/analytics.js" defer></script>
<script src="/assets/js/platform.js" defer></script>
</body>
</html>`;
}

// ── Phase 17: Platform Page ──────────────────────────────────────────────

function renderPlatformPage(route, seo, data, config) {
  const { platform } = route;
  const langCode = route.lang;
  const headOpts = { ads: data.ads, analytics: data.analytics, khIndex: buildKhIndex(data, langCode) };
  const toolIndex = buildToolIndex(data.tools, langCode);

  const toolCards = (route.tools || []).map(t => `
<a href="/${langCode}/${t.slug}" class="dac-kh-article-card">
  <h3 class="dac-kh-article-card__title">${esc(t.name?.[langCode] || t.name?.en || t.slug)}</h3>
  <p class="dac-kh-article-card__desc">${esc(t.tagline?.[langCode] || t.tagline?.en || '')}</p>
</a>`).join('');

  const faqHtml = (platform.faq || []).length > 0 ? `
<section class="dac-faq" aria-labelledby="faq-title">
  <h2 class="dac-section-title" id="faq-title">Frequently Asked Questions</h2>
  <dl class="dac-faq__list">
    ${(platform.faq || []).map(f => `
    <div class="dac-faq__item">
      <dt class="dac-faq__question">${esc(f.question?.en || '')}</dt>
      <dd class="dac-faq__answer">${esc(f.answer?.en || '')}</dd>
    </div>`).join('')}
  </dl>
</section>` : '';

  return `<!DOCTYPE html>
<html lang="${langCode}" dir="ltr">
<head>
${renderHead(seo, config, toolIndex, headOpts)}
</head>
<body class="dac-page dac-page--platform">
${renderHeader(langCode, null, data.categories, config, seo.hreflang)}
<main class="dac-main" id="main">
  ${renderBreadcrumb(seo.breadcrumbs)}
  <header class="dac-page-header">
    <p class="dac-platform-badge">${esc(platform.platformLabel?.en || platform.platform || '')}</p>
    <h1 class="dac-page-header__title">${esc(seo.h1)}</h1>
    <p class="dac-page-header__desc">${esc(platform.intro?.en || platform.description?.en || '')}</p>
  </header>
  <div class="dac-platform-features" aria-label="Platform features">
    <span class="dac-platform-tag">✅ No software install</span>
    <span class="dac-platform-tag">🔒 Files stay on device</span>
    <span class="dac-platform-tag">⚡ Works offline</span>
    <span class="dac-platform-tag">🆓 Completely free</span>
  </div>
  <section aria-labelledby="tools-title">
    <h2 class="dac-section-title" id="tools-title">All ${esc(platform.title?.en || '')} Tools</h2>
    <div class="dac-kh-article-grid">${toolCards}</div>
  </section>
  ${faqHtml}
</main>
${renderFooter(langCode, config, data.categories, popularTools(data.tools))}
<script src="/assets/js/analytics.js" defer></script>
<script src="/assets/js/platform.js" defer></script>
</body>
</html>`;
}

// ── Phase 17: Use-Case Page ──────────────────────────────────────────────

function renderUseCasePage(route, seo, data, config) {
  const { useCase } = route;
  const langCode = route.lang;
  const headOpts = { ads: data.ads, analytics: data.analytics, khIndex: buildKhIndex(data, langCode) };
  const toolIndex = buildToolIndex(data.tools, langCode);

  const toolCards = (route.tools || []).map(t => `
<a href="/${langCode}/${t.slug}" class="dac-kh-article-card">
  <h3 class="dac-kh-article-card__title">${esc(t.name?.[langCode] || t.name?.en || t.slug)}</h3>
  <p class="dac-kh-article-card__desc">${esc(t.tagline?.[langCode] || t.tagline?.en || '')}</p>
</a>`).join('');

  const benefits = useCase.benefits?.en || [];
  const faqHtml = (useCase.faq || []).length > 0 ? `
<section class="dac-faq" aria-labelledby="faq-title">
  <h2 class="dac-section-title" id="faq-title">Frequently Asked Questions</h2>
  <dl class="dac-faq__list">
    ${(useCase.faq || []).map(f => `
    <div class="dac-faq__item">
      <dt class="dac-faq__question">${esc(f.question?.en || '')}</dt>
      <dd class="dac-faq__answer">${esc(f.answer?.en || '')}</dd>
    </div>`).join('')}
  </dl>
</section>` : '';

  // Link to other use-case pages
  const relatedUseCases = (data.useCases || [])
    .filter(uc => uc.slug !== useCase.slug)
    .slice(0, 4)
    .map(uc => `<a href="/${langCode}/use-case/${esc(uc.slug)}" class="dac-entity-chip">${esc(uc.title?.en || uc.slug)}</a>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="${langCode}" dir="ltr">
<head>
${renderHead(seo, config, toolIndex, headOpts)}
</head>
<body class="dac-page dac-page--use-case">
${renderHeader(langCode, null, data.categories, config, seo.hreflang)}
<main class="dac-main" id="main">
  ${renderBreadcrumb(seo.breadcrumbs)}
  <header class="dac-page-header">
    <h1 class="dac-page-header__title">${esc(seo.h1)}</h1>
    <p class="dac-page-header__desc">${esc(useCase.intro?.en || useCase.description?.en || '')}</p>
  </header>
  ${benefits.length > 0 ? `<section class="dac-use-case-benefits">
    <h2 class="dac-section-title">How These Tools Help</h2>
    <ul class="dac-benefits-list">
      ${benefits.map(b => `<li class="dac-benefits-list__item">${esc(b)}</li>`).join('')}
    </ul>
  </section>` : ''}
  <section aria-labelledby="tools-title">
    <h2 class="dac-section-title" id="tools-title">Essential Tools</h2>
    <div class="dac-kh-article-grid">${toolCards}</div>
  </section>
  ${faqHtml}
  ${relatedUseCases ? `<section class="dac-related-entities">
    <h2 class="dac-section-title">Browse More Use Cases</h2>
    <div class="dac-entity-chips">${relatedUseCases}</div>
  </section>` : ''}
</main>
${renderFooter(langCode, config, data.categories, popularTools(data.tools))}
<script src="/assets/js/analytics.js" defer></script>
<script src="/assets/js/platform.js" defer></script>
</body>
</html>`;
}

// ── Phase 17: Feature Page ───────────────────────────────────────────────

function renderFeaturePage(route, seo, data, config) {
  const { feature } = route;
  const langCode = route.lang;
  const headOpts = { ads: data.ads, analytics: data.analytics, khIndex: buildKhIndex(data, langCode) };
  const toolIndex = buildToolIndex(data.tools, langCode);

  const tools = route.tools || [];
  const toolCards = tools.slice(0, 20).map(t => `
<a href="/${langCode}/${t.slug}" class="dac-kh-article-card">
  <h3 class="dac-kh-article-card__title">${esc(t.name?.[langCode] || t.name?.en || t.slug)}</h3>
  <p class="dac-kh-article-card__desc">${esc(t.tagline?.[langCode] || t.tagline?.en || '')}</p>
</a>`).join('');

  const faqHtml = (feature.faq || []).length > 0 ? `
<section class="dac-faq" aria-labelledby="faq-title">
  <h2 class="dac-section-title" id="faq-title">Frequently Asked Questions</h2>
  <dl class="dac-faq__list">
    ${(feature.faq || []).map(f => `
    <div class="dac-faq__item">
      <dt class="dac-faq__question">${esc(f.question?.en || '')}</dt>
      <dd class="dac-faq__answer">${esc(f.answer?.en || '')}</dd>
    </div>`).join('')}
  </dl>
</section>` : '';

  const relatedFeatures = (data.features || [])
    .filter(f => f.slug !== feature.slug)
    .slice(0, 4)
    .map(f => `<a href="/${langCode}/feature/${esc(f.slug)}" class="dac-entity-chip">${esc(f.title?.en || f.slug)}</a>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="${langCode}" dir="ltr">
<head>
${renderHead(seo, config, toolIndex, headOpts)}
</head>
<body class="dac-page dac-page--feature">
${renderHeader(langCode, null, data.categories, config, seo.hreflang)}
<main class="dac-main" id="main">
  ${renderBreadcrumb(seo.breadcrumbs)}
  <header class="dac-page-header">
    <h1 class="dac-page-header__title">${esc(seo.h1)}</h1>
    <p class="dac-page-header__desc">${esc(feature.intro?.en || feature.description?.en || '')}</p>
  </header>
  <section aria-labelledby="tools-title">
    <h2 class="dac-section-title" id="tools-title">${esc(feature.title?.en || '')} — ${tools.length} Tools</h2>
    <div class="dac-kh-article-grid">${toolCards}</div>
  </section>
  ${faqHtml}
  ${relatedFeatures ? `<section class="dac-related-entities">
    <h2 class="dac-section-title">Browse More Features</h2>
    <div class="dac-entity-chips">${relatedFeatures}</div>
  </section>` : ''}
</main>
${renderFooter(langCode, config, data.categories, popularTools(data.tools))}
<script src="/assets/js/analytics.js" defer></script>
<script src="/assets/js/platform.js" defer></script>
</body>
</html>`;
}

// ── Phase 17: Format FAQ Page ────────────────────────────────────────────

function renderFormatFaqPage(route, seo, data, config) {
  const { entity } = route;
  const langCode = route.lang;
  const headOpts = { ads: data.ads, analytics: data.analytics, khIndex: buildKhIndex(data, langCode) };
  const toolIndex = buildToolIndex(data.tools, langCode);

  const faqItems = entity.faq || [];
  const relatedEntities = (entity.relatedEntities || [])
    .map(s => (data.entities || []).find(e => e.slug === s)).filter(Boolean);

  const toolCards = (route.tools || []).slice(0, 6).map(t => `
<a href="/${langCode}/${t.slug}" class="dac-kh-article-card">
  <h3 class="dac-kh-article-card__title">${esc(t.name?.[langCode] || t.name?.en || t.slug)}</h3>
  <p class="dac-kh-article-card__desc">${esc(t.tagline?.[langCode] || t.tagline?.en || '')}</p>
</a>`).join('');

  // Links to other format FAQs
  const otherFaqs = (data.entities || [])
    .filter(e => e.slug !== entity.slug && e.faq?.length > 0)
    .slice(0, 6)
    .map(e => `<a href="/${langCode}/faq/${esc(e.slug)}" class="dac-entity-chip">${esc(e.name)} FAQ</a>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="${langCode}" dir="ltr">
<head>
${renderHead(seo, config, toolIndex, headOpts)}
</head>
<body class="dac-page dac-page--format-faq">
${renderHeader(langCode, null, data.categories, config, seo.hreflang)}
<main class="dac-main" id="main">
  ${renderBreadcrumb(seo.breadcrumbs)}
  <header class="dac-page-header">
    <h1 class="dac-page-header__title">${esc(seo.h1)}</h1>
    <p class="dac-page-header__desc">${esc(entity.description ? entity.description.slice(0, 200) : '')} <a href="/${langCode}/entity/${esc(entity.slug)}">Learn more about ${esc(entity.name)} →</a></p>
  </header>
  <section class="dac-faq" aria-labelledby="faq-title">
    <h2 class="dac-section-title" id="faq-title">${esc(entity.name)} Questions &amp; Answers</h2>
    <dl class="dac-faq__list">
      ${faqItems.map(f => `
      <div class="dac-faq__item">
        <dt class="dac-faq__question">${esc(f.question?.en || f.question || '')}</dt>
        <dd class="dac-faq__answer">${esc(f.answer?.en || f.answer || '')}</dd>
      </div>`).join('')}
    </dl>
  </section>
  ${toolCards ? `<section>
    <h2 class="dac-section-title">${esc(entity.name)} Tools</h2>
    <div class="dac-kh-article-grid">${toolCards}</div>
  </section>` : ''}
  ${relatedEntities.length > 0 ? `<section class="dac-related-entities">
    <h2 class="dac-section-title">Related Formats</h2>
    <div class="dac-entity-chips">${relatedEntities.map(e => `<a href="/${langCode}/entity/${esc(e.slug)}" class="dac-entity-chip">${esc(e.name)}</a>`).join('')}</div>
  </section>` : ''}
  ${otherFaqs ? `<section class="dac-related-entities">
    <h2 class="dac-section-title">More Format FAQs</h2>
    <div class="dac-entity-chips">${otherFaqs}</div>
  </section>` : ''}
</main>
${renderFooter(langCode, config, data.categories, popularTools(data.tools))}
<script src="/assets/js/analytics.js" defer></script>
<script src="/assets/js/platform.js" defer></script>
</body>
</html>`;
}

// ── HTML Escape ────────────────────────────────────────────────────────────

function esc(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Phase 25 — Part 1: Image SEO ─────────────────────────────────────────────

/**
 * Builds an SEO-optimised <img> tag for tool icons / hero images.
 * - Hero images get fetchpriority="high" and no lazy loading
 * - All others get loading="lazy" decoding="async"
 */
function renderSeoImage({ src, alt, width = 48, height = 48, isHero = false, className = '' }) {
  const lazy   = isHero ? '' : ' loading="lazy"';
  const decode  = isHero ? '' : ' decoding="async"';
  const priority = isHero ? ' fetchpriority="high"' : '';
  const cls     = className ? ` class="${esc(className)}"` : '';
  return `<img src="${esc(src)}" alt="${esc(alt)}" width="${width}" height="${height}"${cls}${lazy}${decode}${priority}>`;
}

// ── Phase 25 — Part 4: Anchor Text Diversity ─────────────────────────────────

const ANCHOR_TEMPLATES = [
  (name) => name,
  (name, slug) => `${slug.replace(/-/g, ' ')} tool`,
  (name) => `convert ${name.toLowerCase()} online`,
  (name) => `${name} converter`,
  (name) => `free ${name.toLowerCase()}`,
  (name) => `browser-based ${name.toLowerCase()}`,
  (name) => `online ${name.toLowerCase()}`,
  (name) => `${name.toLowerCase()} conversion`,
];

/**
 * Returns varied anchor text for a tool link, deterministic per (callerSlug, targetSlug).
 */
export function diverseAnchorText(toolName, toolSlug, callerSlug) {
  const seed = djb2(`${callerSlug}:${toolSlug}`);
  const fn   = ANCHOR_TEMPLATES[seed % ANCHOR_TEMPLATES.length];
  return fn(toolName, toolSlug);
}

// ── Phase 25 — Part 5: FAQ Schema Validation ─────────────────────────────────

/**
 * Deduplicates FAQ items by first 5-word question stem (case-insensitive).
 * Returns a new array with no duplicate questions.
 */
function deduplicateFaqs(faqs, langCode = 'en') {
  const seen = new Set();
  return faqs.filter(f => {
    const q = (f.question?.[langCode] || f.question?.en || (typeof f.question === 'string' ? f.question : '')).toLowerCase();
    const stem = q.split(/\s+/).slice(0, 5).join(' ');
    if (seen.has(stem)) return false;
    seen.add(stem);
    return true;
  });
}

/**
 * Builds a valid FAQPage schema from deduplicated FAQ items.
 */
function buildFaqSchema(faqs, langCode = 'en') {
  const deduplicated = deduplicateFaqs(faqs, langCode);
  if (deduplicated.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: deduplicated.map(f => ({
      '@type': 'Question',
      name: f.question?.[langCode] || f.question?.en || (typeof f.question === 'string' ? f.question : ''),
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer?.[langCode] || f.answer?.en || (typeof f.answer === 'string' ? f.answer : ''),
      },
    })),
  };
}

// ── Phase 25 — Part 6: Table of Contents ─────────────────────────────────────

/**
 * Generates a TOC from a list of heading objects { level, text, id }.
 * Skips pages with fewer than 3 headings.
 */
export function renderTableOfContents(headings) {
  if (!headings || headings.length < 3) return '';
  const items = headings.map(h =>
    `<li class="dac-toc__item dac-toc__item--h${h.level}">
      <a href="#${esc(h.id)}" class="dac-toc__link">${esc(h.text)}</a>
    </li>`
  ).join('\n    ');

  return `<nav class="dac-toc" aria-label="Table of contents">
  <h2 class="dac-toc__title">On this page</h2>
  <ul class="dac-toc__list" id="dac-toc-list">
    ${items}
  </ul>
</nav>
<script>
(function(){
  var toc=document.getElementById('dac-toc-list');
  if(!toc)return;
  var links=[].slice.call(toc.querySelectorAll('.dac-toc__link'));
  var targets=links.map(function(l){return document.querySelector(l.getAttribute('href'))});
  function onScroll(){
    var y=window.scrollY+80;
    var active=null;
    for(var i=0;i<targets.length;i++){if(targets[i]&&targets[i].offsetTop<=y)active=links[i];}
    links.forEach(function(l){l.classList.remove('dac-toc__link--active');});
    if(active)active.classList.add('dac-toc__link--active');
  }
  window.addEventListener('scroll',onScroll,{passive:true});
  onScroll();
  toc.addEventListener('click',function(e){
    var a=e.target.closest('a[href^="#"]');
    if(!a)return;
    e.preventDefault();
    var target=document.querySelector(a.getAttribute('href'));
    if(target)target.scrollIntoView({behavior:'smooth',block:'start'});
  });
})();
</script>`;
}

/**
 * Extracts headings from an array of { heading, text } section items.
 * Assigns stable anchor IDs based on heading text.
 */
function extractHeadings(sections, baseHeadings = []) {
  const headings = [...baseHeadings];
  const seen = new Map();
  for (const s of sections) {
    const text = s.heading?.en || s.heading || '';
    if (!text) continue;
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const count = seen.get(id) || 0;
    seen.set(id, count + 1);
    headings.push({ level: 2, text, id: count > 0 ? `${id}-${count}` : id });
  }
  return headings;
}
