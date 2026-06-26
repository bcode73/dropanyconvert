import { readFile } from 'fs/promises';
import path from 'path';
import { renderAdBlock } from './ads.js';

/**
 * Generates HTML for every route using templates.
 * Returns array of { path, content } objects.
 */
export async function generatePages(routes, seoData, links, data, config) {
  const templatesDir = config._templatesDir;

  // Load templates once
  const [toolTpl, categoryTpl, hubTpl] = await Promise.all([
    readFile(path.join(templatesDir, 'tool_page.html'), 'utf8').catch(() => DEFAULT_TOOL_TPL),
    readFile(path.join(templatesDir, 'category_page.html'), 'utf8').catch(() => DEFAULT_CATEGORY_TPL),
    readFile(path.join(templatesDir, 'hub_page.html'), 'utf8').catch(() => DEFAULT_HUB_TPL),
  ]);

  const pages = [];

  for (const route of routes) {
    const seo = seoData.get(route.path) || {};
    let html = '';

    if (route.type === 'tool') {
      const relatedTools = links.get(route.path) || [];
      html = renderToolPage(toolTpl, route, seo, relatedTools, data, config);
      pages.push({ path: route.path + '/index.html', content: html });
    } else if (route.type === 'category') {
      html = renderCategoryPage(categoryTpl, route, seo, data, config);
      pages.push({ path: route.path + '/index.html', content: html });
    } else if (route.type === 'home') {
      html = renderHubPage(hubTpl, route, seo, data, config);
      pages.push({ path: route.path + '/index.html', content: html });
    } else if (route.type === 'root') {
      // Root redirect to default language
      const defaultLang = config.languages.default;
      html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/${defaultLang}"><link rel="canonical" href="${config.site.baseUrl}/${defaultLang}"></head><body></body></html>`;
      pages.push({ path: '/index.html', content: html });
    }
  }

  return pages;
}

function renderSeoHead(seo, config) {
  const schemas = (seo.schemas || [])
    .map(s => `<script type="application/ld+json">${JSON.stringify(s, null, 2)}</script>`)
    .join('\n  ');

  const hreflangTags = (seo.hreflang || [])
    .map(h => `<link rel="alternate" hreflang="${h.lang}" href="${h.url}">`)
    .join('\n  ');

  const xDefault = seo.hreflangDefault
    ? `<link rel="alternate" hreflang="x-default" href="${seo.hreflangDefault}">`
    : '';

  return `
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(seo.title || config.site.name)}</title>
  <meta name="description" content="${esc(seo.description || '')}">
  <meta name="robots" content="${seo.robots || 'index, follow'}">
  ${seo.canonical ? `<link rel="canonical" href="${seo.canonical}">` : ''}
  <meta property="og:title" content="${esc(seo.ogTitle || seo.title || '')}">
  <meta property="og:description" content="${esc(seo.ogDescription || seo.description || '')}">
  <meta property="og:url" content="${seo.ogUrl || seo.canonical || ''}">
  <meta property="og:type" content="${seo.ogType || 'website'}">
  <meta property="og:site_name" content="${esc(seo.ogSiteName || config.site.name)}">
  <meta property="og:image" content="${seo.ogImage || ''}">
  <meta name="twitter:card" content="${seo.twitterCard || 'summary_large_image'}">
  <meta name="twitter:site" content="${seo.twitterSite || ''}">
  <meta name="twitter:title" content="${esc(seo.twitterTitle || seo.title || '')}">
  <meta name="twitter:description" content="${esc(seo.twitterDescription || seo.description || '')}">
  ${hreflangTags}
  ${xDefault}
  <link rel="stylesheet" href="/assets/css/main.css">
  ${schemas}`;
}

function renderToolPage(tpl, route, seo, relatedTools, data, config) {
  const tool = route.tool;
  const lang = route.language;
  const langCode = route.lang;
  const ui = lang.ui;
  const ads = data.ads;

  const relatedHtml = relatedTools.map(r =>
    `<a href="${r.path}" class="dac-related-tool">
      <span class="dac-related-tool__name">${esc(r.name)}</span>
      ${r.tagline ? `<span class="dac-related-tool__tagline">${esc(r.tagline)}</span>` : ''}
    </a>`
  ).join('\n');

  const faqHtml = tool.faq.map(item =>
    `<details class="dac-faq__item">
      <summary class="dac-faq__question">${esc(item.question[langCode] || item.question.en)}</summary>
      <div class="dac-faq__answer">${esc(item.answer[langCode] || item.answer.en)}</div>
    </details>`
  ).join('\n');

  const featuresHtml = (tool.features || []).map(f =>
    `<div class="dac-feature">
      <span class="dac-feature__icon dac-icon--${f.icon}"></span>
      <h3 class="dac-feature__title">${esc(f.title[langCode] || f.title.en)}</h3>
      <p class="dac-feature__desc">${esc(f.description[langCode] || f.description.en)}</p>
    </div>`
  ).join('\n');

  const inputAccept = tool.inputFormats.join(',');
  const toolName = tool.name[langCode] || tool.name.en;
  const h1 = seo.h1 || toolName;
  const intro = tool.seo.intro?.[langCode] || tool.seo.intro?.en || '';
  const privacyNote = ui.privacyNote;
  const adTop = renderAdBlock('top', ads, langCode);
  const adMiddle = renderAdBlock('middle', ads, langCode);
  const adBottom = renderAdBlock('bottom', ads, langCode);
  const breadcrumbHtml = (seo.breadcrumbs || []).map((b, i) =>
    i < (seo.breadcrumbs.length - 1)
      ? `<a href="${b.url}" class="dac-breadcrumb__link">${esc(b.name)}</a>`
      : `<span class="dac-breadcrumb__current">${esc(b.name)}</span>`
  ).join('<span class="dac-breadcrumb__sep"> / </span>');

  return `<!DOCTYPE html>
<html lang="${langCode}">
<head>${renderSeoHead(seo, config)}
</head>
<body class="dac-page dac-page--tool">

<header class="dac-header">
  <a href="/${langCode}" class="dac-header__logo">${esc(config.site.name)}</a>
  <nav class="dac-header__nav" aria-label="Categories">
    ${data.categories.map(c =>
    `<a href="/${langCode}/${c.slug}" class="dac-nav__link${c.id === tool.category ? ' dac-nav__link--active' : ''}">${esc(c.name[langCode] || c.name.en)}</a>`
  ).join('\n    ')}
  </nav>
</header>

<nav class="dac-breadcrumb" aria-label="Breadcrumb">
  ${breadcrumbHtml}
</nav>

${adTop}

<main class="dac-main" id="main">
  <section class="dac-hero">
    <h1 class="dac-hero__title">${esc(h1)}</h1>
    ${intro ? `<p class="dac-hero__intro">${esc(intro)}</p>` : ''}
    <p class="dac-privacy-note">${esc(privacyNote)}</p>
  </section>

  <section class="dac-converter" aria-label="${esc(toolName)}">
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
      <span class="dac-dropzone__label">${esc(ui.dropzone)}</span>
      <input type="file"
             accept="${inputAccept}"
             ${tool.batch.supported ? 'multiple' : ''}
             class="dac-dropzone__input"
             id="dac-file-input"
             aria-hidden="true">
    </div>

    <div class="dac-batch-queue" id="dac-batch-queue" hidden></div>

    <div class="dac-controls" id="dac-controls" hidden>
      <button class="dac-btn dac-btn--primary" id="dac-convert-btn">${esc(ui.convertButton)}</button>
      <button class="dac-btn dac-btn--ghost" id="dac-clear-btn">${esc(ui.clearAll)}</button>
    </div>

    <div class="dac-progress" id="dac-progress" hidden role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
      <div class="dac-progress__bar" id="dac-progress-bar"></div>
    </div>

    <div class="dac-results" id="dac-results" hidden></div>
  </section>

  ${adMiddle}

  ${featuresHtml ? `<section class="dac-features" aria-label="Features"><div class="dac-features__grid">${featuresHtml}</div></section>` : ''}

  <section class="dac-faq" aria-label="${esc(ui.faq)}">
    <h2 class="dac-section-title">${esc(ui.faq)}</h2>
    ${faqHtml}
  </section>

  ${relatedHtml ? `<section class="dac-related" aria-label="${esc(ui.relatedTools)}">
    <h2 class="dac-section-title">${esc(ui.relatedTools)}</h2>
    <div class="dac-related__grid">${relatedHtml}</div>
  </section>` : ''}

  ${adBottom}
</main>

<footer class="dac-footer">
  <p class="dac-footer__copy">&copy; ${new Date().getFullYear()} ${esc(config.site.name)}</p>
  <nav class="dac-footer__links" aria-label="Legal">
    <a href="/${langCode}/privacy-policy">Privacy Policy</a>
    <a href="/${langCode}/terms-of-service">Terms of Service</a>
    <a href="/${langCode}/cookie-policy">Cookies</a>
  </nav>
</footer>

<script src="/assets/js/runtime.js" defer></script>
</body>
</html>`;
}

function renderCategoryPage(tpl, route, seo, data, config) {
  const category = route.category;
  const lang = route.language;
  const langCode = route.lang;
  const tools = route.tools;
  const ads = data.ads;
  const catName = category.name[langCode] || category.name.en;
  const catDesc = category.description[langCode] || category.description.en;
  const adTop = renderAdBlock('top', ads, langCode);
  const adBottom = renderAdBlock('bottom', ads, langCode);

  const toolCardsHtml = tools.map(tool =>
    `<a href="/${langCode}/${tool.slug}" class="dac-tool-card">
      <h3 class="dac-tool-card__name">${esc(tool.name[langCode] || tool.name.en)}</h3>
      <p class="dac-tool-card__tagline">${esc(tool.tagline?.[langCode] || tool.tagline?.en || '')}</p>
    </a>`
  ).join('\n');

  return `<!DOCTYPE html>
<html lang="${langCode}">
<head>${renderSeoHead(seo, config)}
</head>
<body class="dac-page dac-page--category">

<header class="dac-header">
  <a href="/${langCode}" class="dac-header__logo">${esc(config.site.name)}</a>
  <nav class="dac-header__nav" aria-label="Categories">
    ${data.categories.map(c =>
    `<a href="/${langCode}/${c.slug}" class="dac-nav__link${c.id === category.id ? ' dac-nav__link--active' : ''}">${esc(c.name[langCode] || c.name.en)}</a>`
  ).join('\n    ')}
  </nav>
</header>

${adTop}

<main class="dac-main" id="main">
  <section class="dac-hero">
    <h1 class="dac-hero__title">${esc(catName)}</h1>
    <p class="dac-hero__intro">${esc(catDesc)}</p>
  </section>

  <section class="dac-tool-grid" aria-label="${esc(catName)}">
    ${toolCardsHtml}
  </section>

  ${adBottom}
</main>

<footer class="dac-footer">
  <p class="dac-footer__copy">&copy; ${new Date().getFullYear()} ${esc(config.site.name)}</p>
  <nav class="dac-footer__links" aria-label="Legal">
    <a href="/${langCode}/privacy-policy">Privacy Policy</a>
    <a href="/${langCode}/terms-of-service">Terms of Service</a>
    <a href="/${langCode}/cookie-policy">Cookies</a>
  </nav>
</footer>

<script src="/assets/js/runtime.js" defer></script>
</body>
</html>`;
}

function renderHubPage(tpl, route, seo, data, config) {
  const lang = route.language;
  const langCode = route.lang;
  const ads = data.ads;
  const adTop = renderAdBlock('top', ads, langCode);
  const adBottom = renderAdBlock('bottom', ads, langCode);

  const categoriesHtml = data.categories.map(cat =>
    `<a href="/${langCode}/${cat.slug}" class="dac-category-card" style="--cat-color: ${cat.color}">
      <h2 class="dac-category-card__name">${esc(cat.name[langCode] || cat.name.en)}</h2>
      <p class="dac-category-card__desc">${esc(cat.description[langCode] || cat.description.en)}</p>
    </a>`
  ).join('\n');

  return `<!DOCTYPE html>
<html lang="${langCode}">
<head>${renderSeoHead(seo, config)}
</head>
<body class="dac-page dac-page--hub">

<header class="dac-header">
  <a href="/${langCode}" class="dac-header__logo">${esc(config.site.name)}</a>
  <nav class="dac-header__nav" aria-label="Categories">
    ${data.categories.map(c =>
    `<a href="/${langCode}/${c.slug}" class="dac-nav__link">${esc(c.name[langCode] || c.name.en)}</a>`
  ).join('\n    ')}
  </nav>
</header>

${adTop}

<main class="dac-main" id="main">
  <section class="dac-hero">
    <h1 class="dac-hero__title">${esc(config.site.name)}</h1>
    <p class="dac-hero__intro">${esc(config.site.tagline)}</p>
  </section>

  <section class="dac-categories" aria-label="Tool Categories">
    <div class="dac-categories__grid">
      ${categoriesHtml}
    </div>
  </section>

  ${adBottom}
</main>

<footer class="dac-footer">
  <p class="dac-footer__copy">&copy; ${new Date().getFullYear()} ${esc(config.site.name)}</p>
  <nav class="dac-footer__links" aria-label="Legal">
    <a href="/${langCode}/privacy-policy">Privacy Policy</a>
    <a href="/${langCode}/terms-of-service">Terms of Service</a>
    <a href="/${langCode}/cookie-policy">Cookies</a>
  </nav>
</footer>

<script src="/assets/js/runtime.js" defer></script>
</body>
</html>`;
}

function esc(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Minimal fallback templates (overridden by files in templates/)
const DEFAULT_TOOL_TPL = '';
const DEFAULT_CATEGORY_TPL = '';
const DEFAULT_HUB_TPL = '';
