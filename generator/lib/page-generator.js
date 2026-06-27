import { renderAdBlock } from './ads.js';

/**
 * Generates HTML for every route.
 * Returns array of { path, content } objects.
 */
export async function generatePages(routes, seoData, links, data, config) {
  const pages = [];

  for (const route of routes) {
    const seo = seoData.get(route.path) || {};
    let html = '';

    if (route.type === 'tool') {
      html = renderToolPage(route, seo, links.get(route.path) || [], data, config);
      pages.push({ path: route.path + '/index.html', content: html });
    } else if (route.type === 'category') {
      html = renderCategoryPage(route, seo, data, config);
      pages.push({ path: route.path + '/index.html', content: html });
    } else if (route.type === 'home') {
      html = renderHubPage(route, seo, data, config);
      pages.push({ path: route.path + '/index.html', content: html });
    } else if (route.type === 'root') {
      const d = config.languages.default;
      html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/${d}"><link rel="canonical" href="${config.site.baseUrl}/${d}"></head><body></body></html>`;
      pages.push({ path: '/index.html', content: html });
    }
  }

  return pages;
}

// ── SEO Head ──────────────────────────────────────────────────────────────

function renderHead(seo, config, toolIndex) {
  const schemas = (seo.schemas || [])
    .map(s => `  <script type="application/ld+json">\n${JSON.stringify(s, null, 2)}\n  </script>`)
    .join('\n');

  const hreflang = (seo.hreflang || [])
    .map(h => `  <link rel="alternate" hreflang="${h.lang}" href="${h.url}">`)
    .join('\n');

  const xDefault = seo.hreflangDefault
    ? `  <link rel="alternate" hreflang="x-default" href="${seo.hreflangDefault}">`
    : '';

  // Inline theme init to prevent flash of unstyled content
  const themeInit = `<script>try{var t=JSON.parse(localStorage.getItem('dac_settings')||'{}').theme||'auto';document.documentElement.dataset.theme=t==='auto'?(window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'):t;}catch(e){}</script>`;

  const toolIndexScript = toolIndex
    ? `<script>window.DAC_TOOLS=${JSON.stringify(toolIndex)};</script>`
    : '';

  return `  <meta charset="UTF-8">
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
  <link rel="manifest" href="/assets/manifest.json">
  <meta name="theme-color" content="#6366f1">
  <link rel="apple-touch-icon" href="/assets/images/icon-192.png">
${hreflang}
${xDefault}
  <link rel="stylesheet" href="/assets/css/main.css">
  ${themeInit}
  ${toolIndexScript}
${schemas}`;
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
      <h3 class="dac-footer__col-title">Company</h3>
      <div class="dac-footer__col-links">
        <a href="/${langCode}/about" class="dac-footer__link">About</a>
        <a href="/${langCode}/blog" class="dac-footer__link">Blog</a>
        <a href="/${langCode}/contact" class="dac-footer__link">Contact</a>
        <a href="/${langCode}/privacy-policy" class="dac-footer__link">Privacy Policy</a>
        <a href="/${langCode}/terms-of-service" class="dac-footer__link">Terms of Service</a>
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

function renderToolPage(route, seo, relatedTools, data, config) {
  const tool = route.tool;
  const langCode = route.lang;
  const lang = route.language;
  const ui = lang.ui;
  const ads = data.ads;

  const toolName = tool.name[langCode] || tool.name.en;
  const h1 = seo.h1 || toolName;
  const intro = tool.seo.intro?.[langCode] || tool.seo.intro?.en || '';
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

  // ── FAQ ───────────────────────────────────────────────────────────────
  const faqHtml = tool.faq.map(item =>
    `<details class="dac-faq__item">
      <summary class="dac-faq__question">${esc(item.question[langCode] || item.question.en)}</summary>
      <div class="dac-faq__answer">${esc(item.answer[langCode] || item.answer.en)}</div>
    </details>`
  ).join('\n    ');

  // ── Related tools ─────────────────────────────────────────────────────
  const relatedHtml = relatedTools.map(r =>
    `<a href="${r.path}" class="dac-related-tool">
        <span class="dac-related-tool__name">${esc(r.name)}</span>
        ${r.tagline ? `<span class="dac-related-tool__tagline">${esc(r.tagline)}</span>` : ''}
      </a>`
  ).join('\n      ');

  const adTop    = renderAdBlock('top', ads, langCode);
  const adMiddle = renderAdBlock('middle', ads, langCode);
  const adBottom = renderAdBlock('bottom', ads, langCode);

  const breadcrumbHtml = renderBreadcrumb(seo.breadcrumbs || []);
  const toolIndex = buildToolIndex(data.tools, langCode);

  return `<!DOCTYPE html>
<html lang="${langCode}" dir="ltr">
<head>
${renderHead(seo, config, toolIndex)}
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

  <!-- How To -->
  <section class="dac-howto" aria-labelledby="dac-howto-title">
    <h2 class="dac-section-title" id="dac-howto-title">How to convert ${esc(inputFormatsLabel(tool))} to ${esc(outputFormatsLabel(tool))}</h2>
    <ol class="dac-howto__steps">
      ${howToHtml}
    </ol>
  </section>

  <!-- Features -->
  ${featuresHtml ? `<section class="dac-features" aria-label="${esc(ui.features)}">
    <h2 class="dac-section-title">${esc(ui.features)}</h2>
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

  ${adBottom}

</main>

${renderFooter(langCode, config, data.categories, popularTools(data.tools))}

<script src="/assets/js/analytics.js" defer></script>
<script src="/assets/js/platform.js" defer></script>
<script src="/assets/js/runtime.js" defer></script>
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

  const adTop    = renderAdBlock('top', ads, langCode);
  const adMiddle = renderAdBlock('middle', ads, langCode);
  const adBottom = renderAdBlock('bottom', ads, langCode);

  const breadcrumbHtml = renderBreadcrumb(seo.breadcrumbs || []);
  const toolIndex = buildToolIndex(data.tools, langCode);

  return `<!DOCTYPE html>
<html lang="${langCode}" dir="ltr">
<head>
${renderHead(seo, config, toolIndex)}
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
    <h2 class="dac-section-title" id="dac-conv-title">Format Converters</h2>
    <div class="dac-tool-grid">
      ${renderToolCards(conversionTools)}
    </div>
  </section>` : ''}

  ${adMiddle}

  <!-- Utility Tools -->
  ${utilityTools.length > 0 ? `<section class="dac-tool-section" aria-labelledby="dac-util-title">
    <h2 class="dac-section-title" id="dac-util-title">Image Editing Tools</h2>
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

  return `<!DOCTYPE html>
<html lang="${langCode}" dir="ltr">
<head>
${renderHead(seo, config, toolIndex)}
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
