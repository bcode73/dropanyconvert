/**
 * Phase 22 — API Documentation & Developer Portal Generator
 *
 * Generates all API documentation pages from existing tool metadata.
 * No backend required — all content is statically derived.
 *
 * Routes produced (per language):
 *   /{lang}/api/                    — Developer portal home
 *   /{lang}/api/{topic}             — 20 topic pages
 *   /{lang}/api/tools/{slug}        — 82 tool API pages
 *   /{lang}/api/sdks/{sdk}          — 7 SDK pages
 *
 * Total: (21 + 82 + 7) × 5 = 550 pages
 */

// ── HTML helpers ───────────────────────────────────────────────────────────

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function code(lang, src) {
  return `<pre class="dac-api-code"><code class="dac-api-code--${esc(lang)}">${esc(src.trim())}</code></pre>`;
}

// ── Critical CSS for API doc layout ───────────────────────────────────────

const API_CRITICAL_CSS = `<style>
*,::before,::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;font-family:system-ui,-apple-system,sans-serif;line-height:1.6;background:#fff;color:#111}
[data-theme=dark]{background:#0a0a0a;color:#e5e5e5}
.dac-api-wrap{display:grid;grid-template-columns:260px 1fr;min-height:100vh}
@media(max-width:900px){.dac-api-wrap{grid-template-columns:1fr}}
.dac-api-sidebar{position:sticky;top:0;height:100vh;overflow-y:auto;border-right:1px solid #e5e5e5;padding:1.25rem 0;background:#fafafa}
[data-theme=dark] .dac-api-sidebar{background:#111;border-color:#222}
@media(max-width:900px){.dac-api-sidebar{display:none}}
.dac-api-sidebar__section{font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#9ca3af;padding:.75rem 1.25rem .25rem;margin-top:.5rem}
.dac-api-sidebar__link{display:block;padding:.4rem 1.25rem;font-size:.875rem;text-decoration:none;color:#374151;border-left:2px solid transparent;transition:all .12s}
.dac-api-sidebar__link:hover{color:#6366f1;background:#f0f0ff}
.dac-api-sidebar__link--active{color:#6366f1;border-left-color:#6366f1;background:#ede9fe;font-weight:600}
[data-theme=dark] .dac-api-sidebar__link{color:#d1d5db}
[data-theme=dark] .dac-api-sidebar__link--active{background:#1e1b4b}
.dac-api-topbar{position:sticky;top:0;z-index:50;background:#fff;border-bottom:1px solid #e5e5e5;padding:.625rem 2rem;display:flex;align-items:center;gap:1rem}
[data-theme=dark] .dac-api-topbar{background:#0a0a0a;border-color:#222}
.dac-api-topbar__logo{font-weight:700;text-decoration:none;color:inherit;display:flex;align-items:center;gap:.5rem;font-size:1rem}
.dac-api-topbar__badge{font-size:.65rem;font-weight:700;background:#6366f1;color:#fff;padding:.1rem .4rem;border-radius:4px;letter-spacing:.04em}
.dac-api-topbar__nav{margin-left:auto;display:flex;gap:1.25rem}
.dac-api-topbar__nav a{font-size:.875rem;text-decoration:none;color:#6b7280}
.dac-api-topbar__nav a:hover{color:#6366f1}
.dac-api-main{min-width:0;padding:2.5rem 3rem;max-width:860px}
@media(max-width:900px){.dac-api-main{padding:1.5rem}}
.dac-api-main h1{font-size:2rem;margin:0 0 .5rem;font-weight:800}
.dac-api-main h2{font-size:1.25rem;font-weight:700;margin:2rem 0 .75rem;padding-top:2rem;border-top:1px solid #f3f4f6}
[data-theme=dark] .dac-api-main h2{border-color:#1f1f1f}
.dac-api-main h3{font-size:1rem;font-weight:700;margin:1.5rem 0 .5rem}
.dac-api-main p{margin:0 0 1rem;color:#374151}
[data-theme=dark] .dac-api-main p{color:#d1d5db}
.dac-api-lead{font-size:1.1rem;color:#6b7280;margin-bottom:2rem}
.dac-api-code{background:#0f172a;color:#e2e8f0;padding:1.25rem 1.5rem;border-radius:8px;overflow-x:auto;font-size:.825rem;line-height:1.6;margin:.75rem 0 1.5rem;font-family:ui-monospace,monospace}
.dac-api-code code{background:none;padding:0}
.dac-endpoint-badge{display:inline-flex;align-items:center;gap:.75rem;background:#0f172a;color:#e2e8f0;padding:.625rem 1rem;border-radius:8px;font-family:ui-monospace,monospace;font-size:.875rem;margin:.75rem 0 1.5rem}
.dac-method{background:#6366f1;color:#fff;padding:.2rem .5rem;border-radius:4px;font-size:.75rem;font-weight:700;text-transform:uppercase}
.dac-method--get{background:#10b981}
.dac-method--delete{background:#ef4444}
.dac-param-table{width:100%;border-collapse:collapse;font-size:.875rem;margin:.75rem 0 1.5rem}
.dac-param-table th{text-align:left;padding:.5rem .75rem;background:#f9fafb;font-weight:600;border-bottom:1px solid #e5e5e5}
.dac-param-table td{padding:.5rem .75rem;border-bottom:1px solid #f3f4f6;vertical-align:top}
[data-theme=dark] .dac-param-table th{background:#1a1a1a;border-color:#2a2a2a}
[data-theme=dark] .dac-param-table td{border-color:#1f1f1f}
.dac-badge{display:inline-block;font-size:.7rem;font-weight:600;padding:.15rem .4rem;border-radius:4px;margin-left:.25rem}
.dac-badge--required{background:#fee2e2;color:#b91c1c}
.dac-badge--optional{background:#f3f4f6;color:#6b7280}
.dac-badge--plan{background:#ede9fe;color:#6366f1}
.dac-tabs{display:flex;gap:0;border-bottom:2px solid #e5e5e5;margin-bottom:1rem}
.dac-tab{padding:.5rem 1rem;font-size:.8rem;font-weight:600;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;background:none;border-top:none;border-left:none;border-right:none;color:#6b7280}
.dac-tab--active,.dac-tab:hover{color:#6366f1;border-bottom-color:#6366f1}
.dac-tab-panel{display:none}.dac-tab-panel--active{display:block}
.dac-plan-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;margin:1rem 0 2rem}
.dac-plan-card{border:1px solid #e5e5e5;border-radius:10px;padding:1.25rem}
.dac-plan-card--featured{border-color:#6366f1;background:#fafafe}
.dac-plan-card__name{font-weight:700;margin-bottom:.25rem}
.dac-plan-card__price{font-size:1.5rem;font-weight:800;margin:.5rem 0}
.dac-plan-card__price span{font-size:.875rem;font-weight:400;color:#6b7280}
.dac-plan-features{list-style:none;margin:.75rem 0 0;padding:0;font-size:.875rem}
.dac-plan-features li{padding:.2rem 0;display:flex;gap:.4rem}
.dac-plan-features li::before{content:'✓';color:#6366f1;font-weight:700}
.dac-event-list{display:grid;gap:.75rem;margin:1rem 0 2rem}
.dac-event-card{border:1px solid #e5e5e5;border-radius:8px;padding:1rem}
.dac-event-card__name{font-family:ui-monospace,monospace;font-size:.875rem;color:#6366f1;font-weight:600}
.dac-event-card__desc{font-size:.875rem;color:#6b7280;margin:.25rem 0 0}
.dac-sdk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:1rem;margin:1rem 0 2rem}
.dac-sdk-card{border:1px solid #e5e5e5;border-radius:10px;padding:1.25rem;text-align:center;text-decoration:none;color:inherit;transition:border-color .15s}
.dac-sdk-card:hover{border-color:#6366f1}
.dac-sdk-card__icon{font-size:2rem;margin-bottom:.5rem}
.dac-sdk-card__name{font-weight:600;font-size:.875rem}
.dac-sdk-card__status{font-size:.75rem;color:#9ca3af;margin-top:.25rem}
.dac-breadcrumb{font-size:.8rem;color:#9ca3af;margin-bottom:1.5rem}
.dac-breadcrumb a{color:#6366f1;text-decoration:none}
.dac-breadcrumb a:hover{text-decoration:underline}
.dac-mime-list{display:flex;flex-wrap:wrap;gap:.4rem;margin:.5rem 0 1rem}
.dac-mime{background:#f3f4f6;color:#374151;font-size:.75rem;padding:.2rem .5rem;border-radius:4px;font-family:ui-monospace,monospace}
[data-theme=dark] .dac-mime{background:#1f1f1f;color:#d1d5db}
.dac-alert{padding:.875rem 1rem;border-radius:8px;margin:1rem 0;font-size:.875rem}
.dac-alert--info{background:#eff6ff;border-left:3px solid #3b82f6;color:#1e40af}
.dac-alert--warn{background:#fffbeb;border-left:3px solid #f59e0b;color:#92400e}
[data-theme=dark] .dac-alert--info{background:#1e3a5f;color:#93c5fd}
</style>`;

// ── i18n labels ────────────────────────────────────────────────────────────

const I18N = {
  en: {
    apiDocs:'API Docs', devPortal:'Developer Portal', getStarted:'Getting Started',
    quickstart:'Quick Start', auth:'Authentication', keys:'API Keys',
    rateLimits:'Rate Limits', errors:'Errors', responses:'Responses',
    uploads:'File Uploads', batch:'Batch Processing', pagination:'Pagination',
    webhooks:'Webhooks', sdks:'SDKs', apiChangelog:'API Changelog',
    bestPractices:'Best Practices', playground:'Playground', reference:'API Reference',
    pricing:'API Pricing', status:'API Status', support:'Support', faq:'FAQ',
    examples:'Examples', tools:'Tools', backToSite:'← Back to Site',
    endpoint:'Endpoint', request:'Request', response:'Response', parameters:'Parameters',
    codeExamples:'Code Examples', tryIt:'Try in Playground', limits:'Limits',
    inputFormats:'Input Formats', outputFormats:'Output Formats', plan:'Plan',
    comingSoon:'Coming soon', sdkExamples:'SDK Examples',
  },
  es: {
    apiDocs:'Docs API', devPortal:'Portal Desarrolladores', getStarted:'Comenzar',
    quickstart:'Inicio Rápido', auth:'Autenticación', keys:'Claves API',
    rateLimits:'Límites de Tasa', errors:'Errores', responses:'Respuestas',
    uploads:'Subida de Archivos', batch:'Procesamiento por Lotes', pagination:'Paginación',
    webhooks:'Webhooks', sdks:'SDKs', apiChangelog:'Historial API',
    bestPractices:'Mejores Prácticas', playground:'Playground', reference:'Referencia API',
    pricing:'Precios API', status:'Estado API', support:'Soporte', faq:'FAQ',
    examples:'Ejemplos', tools:'Herramientas', backToSite:'← Volver al Sitio',
    endpoint:'Endpoint', request:'Solicitud', response:'Respuesta', parameters:'Parámetros',
    codeExamples:'Ejemplos de Código', tryIt:'Probar en Playground', limits:'Límites',
    inputFormats:'Formatos de Entrada', outputFormats:'Formatos de Salida', plan:'Plan',
    comingSoon:'Próximamente', sdkExamples:'Ejemplos de SDK',
  },
  fr: {
    apiDocs:'Docs API', devPortal:'Portail Développeurs', getStarted:'Démarrer',
    quickstart:'Démarrage rapide', auth:'Authentification', keys:'Clés API',
    rateLimits:'Limites de taux', errors:'Erreurs', responses:'Réponses',
    uploads:'Upload de fichiers', batch:'Traitement par lot', pagination:'Pagination',
    webhooks:'Webhooks', sdks:'SDKs', apiChangelog:'Journal des modifications',
    bestPractices:'Meilleures pratiques', playground:'Playground', reference:'Référence API',
    pricing:'Tarifs API', status:'État API', support:'Support', faq:'FAQ',
    examples:'Exemples', tools:'Outils', backToSite:'← Retour au site',
    endpoint:'Endpoint', request:'Requête', response:'Réponse', parameters:'Paramètres',
    codeExamples:'Exemples de code', tryIt:'Tester dans Playground', limits:'Limites',
    inputFormats:'Formats d\'entrée', outputFormats:'Formats de sortie', plan:'Plan',
    comingSoon:'Bientôt disponible', sdkExamples:'Exemples de SDK',
  },
  de: {
    apiDocs:'API-Docs', devPortal:'Entwicklerportal', getStarted:'Loslegen',
    quickstart:'Schnellstart', auth:'Authentifizierung', keys:'API-Schlüssel',
    rateLimits:'Ratenlimits', errors:'Fehler', responses:'Antworten',
    uploads:'Datei-Upload', batch:'Stapelverarbeitung', pagination:'Paginierung',
    webhooks:'Webhooks', sdks:'SDKs', apiChangelog:'API-Changelog',
    bestPractices:'Best Practices', playground:'Playground', reference:'API-Referenz',
    pricing:'API-Preise', status:'API-Status', support:'Support', faq:'FAQ',
    examples:'Beispiele', tools:'Tools', backToSite:'← Zurück zur Website',
    endpoint:'Endpoint', request:'Anfrage', response:'Antwort', parameters:'Parameter',
    codeExamples:'Code-Beispiele', tryIt:'Im Playground testen', limits:'Limits',
    inputFormats:'Eingabeformate', outputFormats:'Ausgabeformate', plan:'Plan',
    comingSoon:'Demnächst', sdkExamples:'SDK-Beispiele',
  },
  pt: {
    apiDocs:'Docs API', devPortal:'Portal do Desenvolvedor', getStarted:'Começar',
    quickstart:'Início Rápido', auth:'Autenticação', keys:'Chaves API',
    rateLimits:'Limites de Taxa', errors:'Erros', responses:'Respostas',
    uploads:'Upload de Arquivos', batch:'Processamento em Lote', pagination:'Paginação',
    webhooks:'Webhooks', sdks:'SDKs', apiChangelog:'Changelog da API',
    bestPractices:'Melhores Práticas', playground:'Playground', reference:'Referência API',
    pricing:'Preços API', status:'Status API', support:'Suporte', faq:'FAQ',
    examples:'Exemplos', tools:'Ferramentas', backToSite:'← Voltar ao Site',
    endpoint:'Endpoint', request:'Requisição', response:'Resposta', parameters:'Parâmetros',
    codeExamples:'Exemplos de Código', tryIt:'Testar no Playground', limits:'Limites',
    inputFormats:'Formatos de Entrada', outputFormats:'Formatos de Saída', plan:'Plan',
    comingSoon:'Em breve', sdkExamples:'Exemplos de SDK',
  },
};

// ── Navigation structure ───────────────────────────────────────────────────

const NAV_SECTIONS = [
  { label: 'Overview',     items: [
    { key: 'getStarted',  slug: '' },
    { key: 'quickstart',  slug: 'quickstart' },
    { key: 'examples',    slug: 'examples' },
  ]},
  { label: 'API Guide',    items: [
    { key: 'auth',         slug: 'auth' },
    { key: 'keys',         slug: 'keys' },
    { key: 'uploads',      slug: 'uploads' },
    { key: 'responses',    slug: 'responses' },
    { key: 'errors',       slug: 'errors' },
    { key: 'rateLimits',   slug: 'rate-limits' },
    { key: 'pagination',   slug: 'pagination' },
    { key: 'batch',        slug: 'batch' },
    { key: 'webhooks',     slug: 'webhooks' },
    { key: 'bestPractices',slug: 'best-practices' },
  ]},
  { label: 'SDKs',         items: [
    { key: 'sdks',         slug: 'sdks' },
  ]},
  { label: 'Resources',    items: [
    { key: 'playground',   slug: 'playground' },
    { key: 'reference',    slug: 'reference' },
    { key: 'pricing',      slug: 'pricing' },
    { key: 'status',       slug: 'status' },
    { key: 'faq',          slug: 'faq' },
    { key: 'apiChangelog', slug: 'changelog' },
    { key: 'support',      slug: 'support' },
  ]},
];

const ALL_TOPIC_SLUGS = NAV_SECTIONS.flatMap(s => s.items.map(i => i.slug));

const SDK_LIST = [
  { id: 'javascript', label: 'JavaScript', icon: '⬡', ext: 'js',  pkg: 'npm install @dropanyconvert/sdk' },
  { id: 'typescript', label: 'TypeScript', icon: '⬡', ext: 'ts',  pkg: 'npm install @dropanyconvert/sdk' },
  { id: 'python',     label: 'Python',     icon: '🐍', ext: 'py',  pkg: 'pip install dropanyconvert' },
  { id: 'php',        label: 'PHP',        icon: '🐘', ext: 'php', pkg: 'composer require dropanyconvert/sdk' },
  { id: 'go',         label: 'Go',         icon: '⟳',  ext: 'go',  pkg: 'go get github.com/dropanyconvert/sdk-go' },
  { id: 'csharp',     label: 'C#',         icon: '#',  ext: 'cs',  pkg: 'dotnet add package DropAnyConvert' },
  { id: 'java',       label: 'Java',       icon: '☕', ext: 'java', pkg: 'implementation "com.dropanyconvert:sdk:1.0.0"' },
];

// ── Shared layout wrappers ─────────────────────────────────────────────────

function renderApiHead(title, desc, canonical, langCode, schemas = []) {
  const schemaTags = schemas.map(s => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join('');
  const themeInit  = `<script>try{var t=JSON.parse(localStorage.getItem('dac_settings')||'{}').theme||'auto';document.documentElement.dataset.theme=t==='auto'?(window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'):t}catch(e){}</script>`;
  return `<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta name="theme-color" content="#6366f1">
<link rel="icon" href="/assets/images/icon-192.png" type="image/png">
<link rel="apple-touch-icon" href="/assets/images/icon-192.png">
<link rel="manifest" href="/site.webmanifest">
${API_CRITICAL_CSS}
<link rel="preload" href="/assets/css/main.css" as="style">
<link rel="stylesheet" href="/assets/css/main.css" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="/assets/css/main.css"></noscript>
${themeInit}${schemaTags}`;
}

function renderApiSidebar(lang, activeSlug, t, data) {
  const lines = [];
  for (const section of NAV_SECTIONS) {
    lines.push(`<div class="dac-api-sidebar__section">${esc(section.label)}</div>`);
    for (const item of section.items) {
      const href   = `/${lang}/api${item.slug ? '/' + item.slug : ''}`;
      const active = item.slug === activeSlug;
      lines.push(`<a href="${href}" class="dac-api-sidebar__link${active ? ' dac-api-sidebar__link--active' : ''}">${esc(t[item.key] || item.key)}</a>`);
    }
  }
  // Tools section (first 6)
  lines.push(`<div class="dac-api-sidebar__section">${esc(t.tools)}</div>`);
  for (const tool of (data.tools || []).slice(0, 6)) {
    const href = `/${lang}/api/tools/${tool.slug}`;
    lines.push(`<a href="${href}" class="dac-api-sidebar__link" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(tool.name[lang] || tool.name.en)}</a>`);
  }
  if ((data.tools || []).length > 6) {
    lines.push(`<a href="/${lang}/api/reference" class="dac-api-sidebar__link" style="color:#6366f1">All ${data.tools.length} tools →</a>`);
  }
  return `<aside class="dac-api-sidebar" aria-label="API navigation">${lines.join('\n')}</aside>`;
}

function renderApiTopbar(lang, siteName, t) {
  return `<div class="dac-api-topbar">
  <a href="/${lang}/api" class="dac-api-topbar__logo">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
    ${esc(siteName)} <span class="dac-api-topbar__badge">API</span>
  </a>
  <nav class="dac-api-topbar__nav" aria-label="API navigation links">
    <a href="/${lang}/api/reference">${esc(t.reference)}</a>
    <a href="/${lang}/api/playground">${esc(t.playground)}</a>
    <a href="/${lang}/api/sdks">${esc(t.sdks)}</a>
    <a href="/${lang}/api/pricing">${esc(t.pricing)}</a>
    <a href="/${lang}">${esc(t.backToSite)}</a>
  </nav>
  <button class="dac-icon-btn" id="dac-theme-btn" aria-label="Toggle theme" title="Toggle theme" style="margin-left:.5rem">⬤</button>
</div>`;
}

function wrapApiPage(lang, content, sidebar, topbar) {
  return `<body>
<a class="dac-skip" href="#main" style="position:absolute;left:-9999px">Skip to content</a>
${topbar}
<div class="dac-api-wrap">
${sidebar}
<main id="main" class="dac-api-main">${content}</main>
</div>
<script src="/assets/js/platform.js" defer></script>
<script>
// Tab switcher for code examples
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('dac-tab')) {
    var panel = e.target.dataset.tab;
    var wrap  = e.target.closest('.dac-tabs-wrap');
    if (!wrap) return;
    wrap.querySelectorAll('.dac-tab').forEach(function(t){ t.classList.remove('dac-tab--active'); });
    wrap.querySelectorAll('.dac-tab-panel').forEach(function(p){ p.classList.remove('dac-tab-panel--active'); });
    e.target.classList.add('dac-tab--active');
    var active = wrap.querySelector('[data-panel="'+panel+'"]');
    if (active) active.classList.add('dac-tab-panel--active');
  }
});
</script>
</body>`;
}

function renderBreadcrumb(crumbs) {
  return `<nav class="dac-breadcrumb" aria-label="Breadcrumb">${
    crumbs.map((c, i) => i < crumbs.length - 1
      ? `<a href="${c.url}">${esc(c.name)}</a> / `
      : `<span aria-current="page">${esc(c.name)}</span>`).join('')
  }</nav>`;
}

// ── Code example generators ────────────────────────────────────────────────

function genCurl(tool, config) {
  const url   = `${config.site.baseUrl}/api/v1/convert/${tool.slug}`;
  const inExt = (tool.inputFormats[0] || 'application/octet-stream').split('/').pop();
  const outMime = (tool.outputFormats.find(f => f.default) || tool.outputFormats[0])?.mime || '';
  const outLine = tool.outputFormats.length > 1 ? `  -F "outputFormat=${outMime}" \\` : '';
  return `curl -X POST ${url} \\
  -H "Authorization: Bearer dac_your_api_key_here" \\
  -H "Content-Type: multipart/form-data" \\
  -F "file=@input.${inExt}" \\${outLine ? '\n' + outLine : ''}
  --output result.${(tool.outputFormats[0]?.ext || 'bin')}`;
}

function genJavaScript(tool, config) {
  const url   = `${config.site.baseUrl}/api/v1/convert/${tool.slug}`;
  const inExt = (tool.inputFormats[0] || 'application/octet-stream').split('/').pop();
  const outLine = tool.outputFormats.length > 1
    ? `\nform.append('outputFormat', '${(tool.outputFormats.find(f => f.default) || tool.outputFormats[0])?.mime}');` : '';
  return `import { readFileSync, writeFileSync } from 'fs';

const form = new FormData();
form.append('file', new Blob([readFileSync('input.${inExt}')]), 'input.${inExt}');${outLine}

const response = await fetch('${url}', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer dac_your_api_key_here' },
  body: form,
});

const result = await response.json();
console.log('Job:', result.data.jobId, '| Status:', result.data.status);

if (result.data.downloadUrl) {
  const file = await fetch(result.data.downloadUrl);
  writeFileSync('output.${tool.outputFormats[0]?.ext || 'bin'}', Buffer.from(await file.arrayBuffer()));
}`;
}

function genPython(tool, config) {
  const url   = `${config.site.baseUrl}/api/v1/convert/${tool.slug}`;
  const inExt = (tool.inputFormats[0] || 'application/octet-stream').split('/').pop();
  const outMime = (tool.outputFormats.find(f => f.default) || tool.outputFormats[0])?.mime || '';
  const dataLine = tool.outputFormats.length > 1
    ? `\ndata = {"outputFormat": "${outMime}"}` : '\ndata = {}';
  return `import requests

API_KEY = "dac_your_api_key_here"
${dataLine}

with open("input.${inExt}", "rb") as f:
    response = requests.post(
        "${url}",
        headers={"Authorization": f"Bearer {API_KEY}"},
        files={"file": f},
        data=data,
    )

result = response.json()
print(f"Job: {result['data']['jobId']} | Status: {result['data']['status']}")

if result["data"].get("downloadUrl"):
    out = requests.get(result["data"]["downloadUrl"])
    with open("output.${tool.outputFormats[0]?.ext || 'bin'}", "wb") as f:
        f.write(out.content)`;
}

function genPhp(tool, config) {
  const url   = `${config.site.baseUrl}/api/v1/convert/${tool.slug}`;
  const inExt = (tool.inputFormats[0] || 'application/octet-stream').split('/').pop();
  return `<?php
$apiKey = 'dac_your_api_key_here';
$file   = new CURLFile('input.${inExt}');

$ch = curl_init('${url}');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_HTTPHEADER     => ["Authorization: Bearer {$apiKey}"],
    CURLOPT_POSTFIELDS     => ['file' => $file],
]);

$body   = curl_exec($ch);
$result = json_decode($body, true);

echo "Job: " . $result['data']['jobId'] . " | Status: " . $result['data']['status'] . PHP_EOL;

if (!empty($result['data']['downloadUrl'])) {
    file_put_contents('output.${tool.outputFormats[0]?.ext || 'bin'}',
        file_get_contents($result['data']['downloadUrl']));
}`;
}

function genGo(tool, config) {
  const url   = `${config.site.baseUrl}/api/v1/convert/${tool.slug}`;
  const inExt = (tool.inputFormats[0] || 'application/octet-stream').split('/').pop();
  return `package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "mime/multipart"
    "net/http"
    "os"
)

func main() {
    f, _ := os.Open("input.${inExt}")
    defer f.Close()

    var buf bytes.Buffer
    w := multipart.NewWriter(&buf)
    fw, _ := w.CreateFormFile("file", "input.${inExt}")
    io.Copy(fw, f)
    w.Close()

    req, _ := http.NewRequest("POST", "${url}", &buf)
    req.Header.Set("Authorization", "Bearer dac_your_api_key_here")
    req.Header.Set("Content-Type", w.FormDataContentType())

    resp, _ := http.DefaultClient.Do(req)
    defer resp.Body.Close()

    var result map[string]any
    json.NewDecoder(resp.Body).Decode(&result)
    data := result["data"].(map[string]any)
    fmt.Printf("Job: %s | Status: %s\\n", data["jobId"], data["status"])
}`;
}

function renderCodeTabs(examples) {
  const tabs = examples.map((ex, i) =>
    `<button class="dac-tab${i === 0 ? ' dac-tab--active' : ''}" data-tab="${ex.id}">${esc(ex.label)}</button>`
  ).join('');
  const panels = examples.map((ex, i) =>
    `<div class="dac-tab-panel${i === 0 ? ' dac-tab-panel--active' : ''}" data-panel="${ex.id}">${code(ex.lang, ex.src)}</div>`
  ).join('');
  return `<div class="dac-tabs-wrap"><div class="dac-tabs">${tabs}</div>${panels}</div>`;
}

// ── Mock playground response ───────────────────────────────────────────────

function renderPlaygroundBlock(tool, config) {
  const url     = `${config.site.baseUrl}/api/v1/convert/${tool.slug}`;
  const mockResp = JSON.stringify({
    ok: true,
    data: {
      jobId:        'job_1718000000_ab3f2c',
      status:       'completed',
      outputFormat: (tool.outputFormats.find(f => f.default) || tool.outputFormats[0])?.mime,
      downloadUrl:  `${config.site.baseUrl}/api/v1/jobs/job_1718000000_ab3f2c/download`,
      expiresAt:    new Date(Date.now() + 86400000).toISOString(),
      sizeBytes:    204800,
      durationMs:   320,
    },
    meta: { version: 'v1', generatedAt: new Date().toISOString() },
  }, null, 2);

  return `<div class="dac-api-playground" style="border:1px solid #e5e5e5;border-radius:10px;padding:1.25rem;margin:1rem 0 2rem">
  <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:1rem">
    <span style="font-weight:700;font-size:.9rem">⚡ Playground</span>
    <span style="font-size:.75rem;color:#6b7280">(Mock mode — no real requests)</span>
  </div>
  <div style="margin-bottom:.75rem">
    <label style="font-size:.8rem;font-weight:600;display:block;margin-bottom:.25rem">Endpoint</label>
    <code style="display:block;background:#f3f4f6;padding:.5rem .75rem;border-radius:6px;font-size:.8rem">POST ${url}</code>
  </div>
  <div style="margin-bottom:.75rem">
    <label style="font-size:.8rem;font-weight:600;display:block;margin-bottom:.25rem">Authorization</label>
    <input type="text" value="Bearer dac_your_api_key_here" readonly style="width:100%;padding:.4rem .75rem;border:1px solid #e5e5e5;border-radius:6px;font-family:monospace;font-size:.8rem;background:#f9fafb">
  </div>
  <div style="margin-bottom:1rem">
    <label style="font-size:.8rem;font-weight:600;display:block;margin-bottom:.25rem">File</label>
    <input type="file" accept="${tool.inputFormats.join(',')}" style="font-size:.8rem" disabled>
    <span style="font-size:.75rem;color:#9ca3af;display:block;margin-top:.25rem">Accepts: ${tool.inputFormats.join(', ')}</span>
  </div>
  <button onclick="this.nextElementSibling.hidden=false;this.style.display='none'" style="background:#6366f1;color:#fff;border:none;padding:.6rem 1.25rem;border-radius:8px;font-weight:600;font-size:.875rem;cursor:pointer">Send Mock Request</button>
  <div hidden>
    <div style="display:flex;align-items:center;gap:.5rem;margin:.75rem 0 .4rem">
      <span style="font-size:.8rem;font-weight:600">Response</span>
      <span style="font-size:.75rem;background:#d1fae5;color:#065f46;padding:.1rem .4rem;border-radius:4px">200 OK</span>
    </div>
    ${code('json', mockResp)}
  </div>
</div>`;
}

// ── Topic page content renderers ───────────────────────────────────────────

function topicContent(slug, t, lang, data, config) {
  const siteName = config.site.name || 'DropAnyConvert';
  const baseUrl  = config.site.baseUrl;

  switch (slug) {
    case '': return `
<h1>${esc(t.devPortal)}</h1>
<p class="dac-api-lead">The ${siteName} API lets you convert files programmatically. Submit a file, receive a download URL. ${data.tools.length} conversion tools. 5 languages. No browser required.</p>
<div class="dac-alert dac-alert--info">🚧 <strong>Developer Preview</strong> — The API is in active development. Sign up at <a href="/${lang}/dashboard/api-keys">/${lang}/dashboard/api-keys</a> for early access.</div>
<h2>Quick Example</h2>
${code('bash', `curl -X POST ${baseUrl}/api/v1/convert/jpg-to-png \\
  -H "Authorization: Bearer dac_your_api_key_here" \\
  -F "file=@photo.jpg" \\
  --output result.png`)}
<h2>Base URL</h2>
${code('text', `${baseUrl}/api/v1`)}
<h2>What You Can Do</h2>
<ul>
  <li>Convert between ${data.tools.length} file formats</li>
  <li>Track job status asynchronously</li>
  <li>Receive webhooks on completion</li>
  <li>Process files up to 500 MB (Business plan)</li>
  <li>Batch up to 100 files per request (Business plan)</li>
</ul>
<h2>Browse Tools</h2>
<p>Every tool has its own API endpoint. <a href="/${lang}/api/reference">Browse the full API reference →</a></p>`;

    case 'quickstart': return `
<h1>${esc(t.quickstart)}</h1>
<p class="dac-api-lead">Convert your first file in under 2 minutes.</p>
<h2>1. Get an API Key</h2>
<p>Create a free account and generate an API key at <a href="/${lang}/dashboard/api-keys">your dashboard</a>. Free plan includes 10 conversions/day.</p>
<h2>2. Make Your First Request</h2>
${code('bash', `curl -X POST ${baseUrl}/api/v1/convert/jpg-to-png \\
  -H "Authorization: Bearer dac_YOUR_KEY" \\
  -F "file=@photo.jpg" \\
  -o result.png`)}
<h2>3. Check the Response</h2>
${code('json', `{
  "ok": true,
  "data": {
    "jobId": "job_1718000000_ab3f2c",
    "status": "completed",
    "downloadUrl": "${baseUrl}/api/v1/jobs/job_1718000000_ab3f2c/download",
    "expiresAt": "2024-06-12T00:00:00.000Z",
    "sizeBytes": 204800,
    "durationMs": 320
  }
}`)}
<h2>4. Download Your File</h2>
${code('bash', `curl "${baseUrl}/api/v1/jobs/job_1718000000_ab3f2c/download" \\
  -H "Authorization: Bearer dac_YOUR_KEY" \\
  -o converted.png`)}
<div class="dac-alert dac-alert--info">For large files (&gt;5 MB) the response returns <code>status: "queued"</code>. Poll <code>GET /api/v1/jobs/{jobId}</code> until <code>status: "completed"</code>.</div>`;

    case 'auth': return `
<h1>${esc(t.auth)}</h1>
<p class="dac-api-lead">All API requests require authentication via a Bearer token.</p>
<h2>API Key Authentication</h2>
<p>Pass your API key as a Bearer token in the <code>Authorization</code> header:</p>
${code('bash', `Authorization: Bearer dac_your_api_key_here`)}
<h2>Obtaining an API Key</h2>
<p>API keys are available on <strong>Business plan</strong> and above. Generate one at <a href="/${lang}/dashboard/api-keys">/${lang}/dashboard/api-keys</a>.</p>
<h2>Key Format</h2>
<p>All API keys start with the prefix <code>dac_</code> followed by a 32-character alphanumeric string.</p>
${code('text', `dac_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`)}
<h2>Security Best Practices</h2>
<ul>
  <li>Never commit API keys to version control</li>
  <li>Use environment variables: <code>DAC_API_KEY=dac_...</code></li>
  <li>Rotate keys regularly from your dashboard</li>
  <li>Use separate keys per environment (dev/staging/prod)</li>
  <li>Restrict key scopes to only what's needed</li>
</ul>
<h2>Key Scopes</h2>
<table class="dac-param-table"><thead><tr><th>Scope</th><th>Description</th></tr></thead><tbody>
<tr><td><code>convert</code></td><td>Submit conversion jobs</td></tr>
<tr><td><code>read</code></td><td>Read job status and results</td></tr>
<tr><td><code>batch</code></td><td>Submit batch jobs</td></tr>
<tr><td><code>webhook</code></td><td>Manage webhook endpoints</td></tr>
</tbody></table>`;

    case 'rate-limits': return `
<h1>${esc(t.rateLimits)}</h1>
<p class="dac-api-lead">Rate limits are enforced per API key, per rolling 60-second window.</p>
<table class="dac-param-table"><thead><tr><th>Plan</th><th>Requests/min</th><th>Conversions/day</th><th>Conversions/month</th><th>Max file size</th></tr></thead><tbody>
<tr><td>Free</td><td>60</td><td>10</td><td>100</td><td>25 MB</td></tr>
<tr><td>Pro</td><td>600</td><td>100</td><td>1,000</td><td>100 MB</td></tr>
<tr><td>Business</td><td>3,000</td><td>1,000</td><td>10,000</td><td>500 MB</td></tr>
<tr><td>Enterprise</td><td>Custom</td><td>Custom</td><td>Custom</td><td>Custom</td></tr>
</tbody></table>
<h2>Rate Limit Headers</h2>
<p>Every response includes rate limit state in headers:</p>
${code('text', `X-RateLimit-Limit: 600
X-RateLimit-Remaining: 597
X-RateLimit-Reset: 1718000060
Retry-After: 43   (only on 429 responses)`)}
<h2>Handling 429 Responses</h2>
${code('javascript', `const response = await fetch(url, options);
if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After');
  await new Promise(r => setTimeout(r, Number(retryAfter) * 1000));
  // retry the request
}`)}`;

    case 'errors': return `
<h1>${esc(t.errors)}</h1>
<p class="dac-api-lead">All errors return a consistent JSON envelope with a machine-readable code.</p>
<h2>Error Shape</h2>
${code('json', `{
  "ok": false,
  "error": "quota_exceeded",
  "message": "Daily conversion limit reached. Upgrade to Pro for 100/day.",
  "status": 429,
  "requestId": "req_abc123"
}`)}
<h2>Error Codes</h2>
<table class="dac-param-table"><thead><tr><th>Code</th><th>HTTP</th><th>Description</th></tr></thead><tbody>
<tr><td><code>invalid_api_key</code></td><td>401</td><td>API key missing, invalid, or revoked</td></tr>
<tr><td><code>insufficient_scope</code></td><td>403</td><td>Key lacks required scope for this action</td></tr>
<tr><td><code>plan_required</code></td><td>403</td><td>Feature requires a higher plan</td></tr>
<tr><td><code>quota_exceeded</code></td><td>429</td><td>Daily or monthly conversion limit reached</td></tr>
<tr><td><code>rate_limited</code></td><td>429</td><td>Too many requests per minute</td></tr>
<tr><td><code>file_too_large</code></td><td>413</td><td>File exceeds plan file size limit</td></tr>
<tr><td><code>unsupported_format</code></td><td>400</td><td>Input MIME type not accepted by this tool</td></tr>
<tr><td><code>validation_error</code></td><td>422</td><td>Missing or invalid request parameters</td></tr>
<tr><td><code>not_found</code></td><td>404</td><td>Job or resource not found</td></tr>
<tr><td><code>processing_failed</code></td><td>422</td><td>File could not be processed (corrupt or unsupported content)</td></tr>
<tr><td><code>internal_error</code></td><td>500</td><td>Unexpected server error — safe to retry</td></tr>
</tbody></table>`;

    case 'uploads': return `
<h1>${esc(t.uploads)}</h1>
<p class="dac-api-lead">All conversion endpoints accept <code>multipart/form-data</code> with the file as the <code>file</code> field.</p>
<h2>Request Format</h2>
${code('bash', `curl -X POST ${baseUrl}/api/v1/convert/{tool-slug} \\
  -H "Authorization: Bearer dac_your_key" \\
  -H "Content-Type: multipart/form-data" \\
  -F "file=@/path/to/your/file.jpg" \\
  -F "outputFormat=image/png"   # optional if tool has multiple output formats`)}
<h2>File Size Limits</h2>
<table class="dac-param-table"><thead><tr><th>Plan</th><th>Max file size</th></tr></thead><tbody>
<tr><td>Free</td><td>25 MB</td></tr><tr><td>Pro</td><td>100 MB</td></tr>
<tr><td>Business</td><td>500 MB</td></tr><tr><td>Enterprise</td><td>Custom</td></tr>
</tbody></table>
<h2>Async Processing</h2>
<p>Files over 5 MB are processed asynchronously. The initial response returns <code>"status":"queued"</code>. Poll <code>GET /jobs/{jobId}</code> for completion.</p>`;

    case 'webhooks': return `
<h1>${esc(t.webhooks)}</h1>
<p class="dac-api-lead">Receive real-time notifications when conversion jobs complete.</p>
<h2>Webhook Events</h2>
<div class="dac-event-list">
${[
  ['conversion.completed', 'File converted successfully. Includes download URL.'],
  ['conversion.failed',    'Conversion failed. Includes error code and message.'],
  ['subscription.updated', 'Plan changed, cancelled, or renewed.'],
  ['usage.limit',          'Approaching or exceeded daily/monthly quota.'],
  ['api.key.created',      'New API key generated for your account.'],
  ['job.completed',        'Async job finished processing.'],
  ['job.failed',           'Async job failed after max retries.'],
].map(([name, desc]) => `<div class="dac-event-card"><div class="dac-event-card__name">${name}</div><div class="dac-event-card__desc">${desc}</div></div>`).join('')}
</div>
<h2>Webhook Payload</h2>
${code('json', `{
  "event": "conversion.completed",
  "id": "evt_abc123",
  "createdAt": "2024-06-11T12:00:00Z",
  "data": {
    "jobId": "job_1718000000_ab3f2c",
    "toolSlug": "jpg-to-png",
    "status": "completed",
    "downloadUrl": "${baseUrl}/api/v1/jobs/job_1718000000_ab3f2c/download",
    "expiresAt": "2024-06-12T12:00:00Z"
  }
}`)}
<h2>Signature Verification</h2>
${code('javascript', `import { createHmac } from 'crypto';
function verifyWebhook(rawBody, signature, secret) {
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  return \`sha256=\${expected}\` === signature;
}
// In your handler:
const sig = req.headers['x-dac-signature'];
if (!verifyWebhook(req.rawBody, sig, process.env.WEBHOOK_SECRET)) {
  return res.status(401).send('Invalid signature');
}`)}`;

    case 'sdks': return `
<h1>${esc(t.sdks)}</h1>
<p class="dac-api-lead">Official SDKs for ${SDK_LIST.length} languages — coming soon. All examples are production-ready patterns you can use today with the REST API.</p>
<div class="dac-sdk-grid">
${SDK_LIST.map(sdk => `<a href="/${lang}/api/sdks/${sdk.id}" class="dac-sdk-card">
  <div class="dac-sdk-card__icon">${sdk.icon}</div>
  <div class="dac-sdk-card__name">${sdk.label}</div>
  <div class="dac-sdk-card__status">${esc(t.comingSoon)}</div>
</a>`).join('\n')}
</div>`;

    case 'pricing': return `
<h1>${esc(t.pricing)}</h1>
<p class="dac-api-lead">API access is included with every plan. Limits scale with your subscription.</p>
<div class="dac-plan-grid">
<div class="dac-plan-card"><div class="dac-plan-card__name">Free</div><div class="dac-plan-card__price">$0<span>/month</span></div><ul class="dac-plan-features"><li>10 conversions/day</li><li>25 MB max file</li><li>REST API access</li><li>1-day download links</li></ul></div>
<div class="dac-plan-card dac-plan-card--featured"><div class="dac-plan-card__name">Pro <span class="dac-badge dac-badge--plan">Popular</span></div><div class="dac-plan-card__price">$9<span>/month</span></div><ul class="dac-plan-features"><li>100 conversions/day</li><li>100 MB max file</li><li>600 req/min rate limit</li><li>7-day download links</li><li>Webhooks (3 endpoints)</li><li>Cloud processing</li></ul></div>
<div class="dac-plan-card"><div class="dac-plan-card__name">Business</div><div class="dac-plan-card__price">$29<span>/month</span></div><ul class="dac-plan-features"><li>1,000 conversions/day</li><li>500 MB max file</li><li>3,000 req/min rate limit</li><li>30-day download links</li><li>Webhooks (20 endpoints)</li><li>API key access</li><li>Batch (100 files)</li><li>Priority queue</li></ul></div>
<div class="dac-plan-card"><div class="dac-plan-card__name">Enterprise</div><div class="dac-plan-card__price">Custom</div><ul class="dac-plan-features"><li>Unlimited conversions</li><li>Custom file limits</li><li>Dedicated rate limits</li><li>SLA &amp; support</li><li>Custom integrations</li></ul></div>
</div>
<p><a href="/${lang}/dashboard" class="dac-btn" style="background:#6366f1;color:#fff;padding:.625rem 1.25rem;border-radius:8px;font-weight:600;text-decoration:none;display:inline-block">Upgrade Plan →</a></p>`;

    case 'playground': return `
<h1>${esc(t.playground)}</h1>
<p class="dac-api-lead">Test any API endpoint interactively. Mock mode — no real requests are made.</p>
<div style="margin-bottom:1rem">
  <label style="font-weight:600;display:block;margin-bottom:.4rem">Select Tool</label>
  <select id="pg-tool-select" style="padding:.5rem .75rem;border:1px solid #e5e5e5;border-radius:6px;font-size:.875rem;width:100%;max-width:400px">
    ${(data.tools || []).map(tool => `<option value="${tool.slug}">${tool.name[lang] || tool.name.en}</option>`).join('')}
  </select>
</div>
<div id="pg-endpoint" style="font-family:monospace;background:#0f172a;color:#e2e8f0;padding:.75rem 1rem;border-radius:8px;font-size:.875rem;margin-bottom:1rem">
  POST ${baseUrl}/api/v1/convert/<span id="pg-slug">select-a-tool</span>
</div>
<button onclick="document.getElementById('pg-response').hidden=false" style="background:#6366f1;color:#fff;border:none;padding:.625rem 1.25rem;border-radius:8px;font-weight:600;cursor:pointer">⚡ Run Mock Request</button>
<div id="pg-response" hidden style="margin-top:1rem">
  ${code('json', `{"ok":true,"data":{"jobId":"job_mock_example","status":"completed","downloadUrl":"${baseUrl}/api/v1/jobs/job_mock_example/download","sizeBytes":204800,"durationMs":320}}`)}
</div>
<script>
document.getElementById('pg-tool-select').addEventListener('change', function() {
  document.getElementById('pg-slug').textContent = this.value;
  document.getElementById('pg-response').hidden = true;
});
</script>`;

    case 'reference': return `
<h1>${esc(t.reference)}</h1>
<p class="dac-api-lead">All ${data.tools.length} API endpoints. Search by tool name, MIME type, or category.</p>
<input type="search" id="api-ref-search" placeholder="Search endpoints…" autocomplete="off"
  style="width:100%;max-width:500px;padding:.625rem 1rem;border:1px solid #e5e5e5;border-radius:8px;font-size:.875rem;margin-bottom:1.5rem;display:block">
<div id="api-ref-results">
${(data.tools || []).map(tool => `
<div class="dac-api-ref-entry" data-name="${tool.name.en.toLowerCase()}" data-slug="${tool.slug}" data-mimes="${tool.inputFormats.concat(tool.outputFormats.map(f=>f.mime)).join(' ')}" data-cat="${tool.category}" style="display:flex;align-items:center;gap:1rem;padding:.6rem 0;border-bottom:1px solid #f3f4f6">
  <span class="dac-method" style="flex-shrink:0">POST</span>
  <a href="/${lang}/api/tools/${tool.slug}" style="font-family:monospace;font-size:.875rem;flex:1;text-decoration:none;color:#6366f1">/convert/${tool.slug}</a>
  <span style="font-size:.8rem;color:#6b7280;flex-shrink:0">${esc(tool.name[lang] || tool.name.en)}</span>
</div>`).join('')}
</div>
<script>
var entries = document.querySelectorAll('.dac-api-ref-entry');
document.getElementById('api-ref-search').addEventListener('input', function() {
  var q = this.value.toLowerCase();
  entries.forEach(function(el) {
    var match = !q || el.dataset.name.includes(q) || el.dataset.slug.includes(q) || el.dataset.mimes.includes(q) || el.dataset.cat.includes(q);
    el.style.display = match ? '' : 'none';
  });
});
</script>`;

    case 'faq': return `
<h1>API FAQ</h1>
<p class="dac-api-lead">Common questions about the ${siteName} API.</p>
<h2>Do I need an account to use the API?</h2>
<p>Yes. API access requires an account and an API key. Free accounts get 10 conversions per day. API keys are generated in your <a href="/${lang}/dashboard/api-keys">dashboard</a>.</p>
<h2>Are conversions done server-side?</h2>
<p>Yes. Unlike the browser tools (which run entirely client-side), the API processes files on our servers using the same engines.</p>
<h2>How long are download URLs valid?</h2>
<p>Free: 1 day. Pro: 7 days. Business: 30 days. After expiry the download returns 410 Gone.</p>
<h2>Can I use the API for commercial projects?</h2>
<p>Yes, on Pro or Business plans. The Free plan is for personal and development use only.</p>
<h2>Is there a batch API?</h2>
<p>Yes, on Business plan. Send up to 100 files in a single request. See the <a href="/${lang}/api/batch">Batch Processing</a> guide.</p>
<h2>What file formats are supported?</h2>
<p>All ${data.tools.length} tools are available via API. See the <a href="/${lang}/api/reference">API Reference</a> for the complete list.</p>`;

    default: return `<h1>${esc(t[slug.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] || slug)}</h1><p class="dac-api-lead">Documentation coming soon.</p>`;
  }
}

// ── Tool API page ──────────────────────────────────────────────────────────

function renderToolApiPage(tool, lang, t, data, config) {
  const toolName  = tool.name[lang] || tool.name.en;
  const tagline   = tool.tagline?.[lang] || tool.tagline?.en || '';
  const baseUrl   = config.site.baseUrl;
  const endpoint  = `/api/v1/convert/${tool.slug}`;
  const outputMimes = tool.outputFormats.map(f => f.mime);

  const examples = [
    { id: 'curl',       label: 'cURL',       lang: 'bash',       src: genCurl(tool, config) },
    { id: 'javascript', label: 'JavaScript', lang: 'javascript', src: genJavaScript(tool, config) },
    { id: 'python',     label: 'Python',     lang: 'python',     src: genPython(tool, config) },
    { id: 'php',        label: 'PHP',        lang: 'php',        src: genPhp(tool, config) },
    { id: 'go',         label: 'Go',         lang: 'go',         src: genGo(tool, config) },
  ];

  const techArticleSchema = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    name:        `${toolName} API Reference`,
    description: `API documentation for the ${toolName}. Endpoint: POST ${endpoint}`,
    url:         `${baseUrl}/${lang}/api/tools/${tool.slug}`,
    keywords:    [tool.slug, 'api', 'convert', ...tool.inputFormats, ...outputMimes],
    author: { '@type': 'Organization', name: config.site.name },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'API', item: `${baseUrl}/${lang}/api` },
      { '@type': 'ListItem', position: 2, name: 'Tools', item: `${baseUrl}/${lang}/api/reference` },
      { '@type': 'ListItem', position: 3, name: toolName, item: `${baseUrl}/${lang}/api/tools/${tool.slug}` },
    ],
  };

  const head = renderApiHead(
    `${toolName} API — ${config.site.name}`,
    `API reference for ${toolName}. POST ${endpoint}. ${tagline}`,
    `${baseUrl}/${lang}/api/tools/${tool.slug}`,
    lang,
    [techArticleSchema, breadcrumbSchema],
  );

  const content = `
${renderBreadcrumb([
  { name: 'API', url: `/${lang}/api` },
  { name: t.reference, url: `/${lang}/api/reference` },
  { name: toolName, url: `/${lang}/api/tools/${tool.slug}` },
])}
<h1>${esc(toolName)}</h1>
<p class="dac-api-lead">${esc(tagline)}</p>
<div class="dac-endpoint-badge"><span class="dac-method">POST</span>${endpoint}</div>
<h2>${esc(t.inputFormats)}</h2>
<div class="dac-mime-list">${tool.inputFormats.map(m => `<span class="dac-mime">${esc(m)}</span>`).join('')}</div>
<h2>${esc(t.outputFormats)}</h2>
<div class="dac-mime-list">${tool.outputFormats.map(f => `<span class="dac-mime">${esc(f.mime)}</span>`).join('')}</div>
<h2>${esc(t.parameters)}</h2>
<table class="dac-param-table"><thead><tr><th>Parameter</th><th>Type</th><th>Required</th><th>Description</th></tr></thead><tbody>
<tr><td><code>file</code></td><td>binary</td><td><span class="dac-badge dac-badge--required">required</span></td><td>Input file. Accepts: ${tool.inputFormats.join(', ')}</td></tr>
${outputMimes.length > 1 ? `<tr><td><code>outputFormat</code></td><td>string</td><td><span class="dac-badge dac-badge--optional">optional</span></td><td>Output MIME type. One of: ${outputMimes.map(m => `<code>${m}</code>`).join(', ')}. Default: <code>${(tool.outputFormats.find(f => f.default) || tool.outputFormats[0])?.mime}</code></td></tr>` : ''}
<tr><td><code>options</code></td><td>JSON string</td><td><span class="dac-badge dac-badge--optional">optional</span></td><td>Conversion options. See tool documentation.</td></tr>
<tr><td><code>webhook</code></td><td>URL</td><td><span class="dac-badge dac-badge--optional">optional</span></td><td>Callback URL on completion. <span class="dac-badge dac-badge--plan">Pro+</span></td></tr>
</tbody></table>
<h2>${esc(t.limits)}</h2>
<table class="dac-param-table"><thead><tr><th>Plan</th><th>Max file size</th><th>Conversions/day</th></tr></thead><tbody>
<tr><td>Free</td><td>25 MB</td><td>10</td></tr>
<tr><td>Pro</td><td>100 MB</td><td>100</td></tr>
<tr><td>Business</td><td>500 MB</td><td>1,000</td></tr>
</tbody></table>
<h2>${esc(t.codeExamples)}</h2>
${renderCodeTabs(examples)}
${renderPlaygroundBlock(tool, config)}
<h2>${esc(t.response)}</h2>
${code('json', `{
  "ok": true,
  "data": {
    "jobId": "job_1718000000_ab3f2c",
    "status": "completed",
    "outputFormat": "${(tool.outputFormats.find(f => f.default) || tool.outputFormats[0])?.mime}",
    "downloadUrl": "${baseUrl}/api/v1/jobs/job_1718000000_ab3f2c/download",
    "expiresAt": "2024-06-12T00:00:00.000Z",
    "sizeBytes": 204800,
    "durationMs": 320
  }
}`)}
<p>Also see: <a href="/${lang}/${tool.slug}">${esc(toolName)} browser tool</a> — <a href="/${lang}/api/errors">${esc(t.errors)}</a></p>`;

  const sidebar = renderApiSidebar(lang, `tools/${tool.slug}`, t, data);
  const topbar  = renderApiTopbar(lang, config.site.name, t);

  return `<!DOCTYPE html>\n<html lang="${lang}">\n<head>\n${head}\n</head>\n${wrapApiPage(lang, content, sidebar, topbar)}`;
}

// ── SDK page ───────────────────────────────────────────────────────────────

function renderSdkPage(sdk, lang, t, data, config) {
  const baseUrl = config.site.baseUrl;
  const siteName = config.site.name;
  // Pick first tool as example
  const exTool = data.tools[0];

  let installBlock, authBlock, convertBlock;

  if (sdk.id === 'javascript' || sdk.id === 'typescript') {
    const ts = sdk.id === 'typescript';
    installBlock = code('bash', `npm install @dropanyconvert/sdk\n# or: yarn add @dropanyconvert/sdk`);
    authBlock    = code(sdk.id, `${ts ? 'import' : 'const'} { DropAnyConvert } ${ts ? 'from' : '='} ${ts ? "'@dropanyconvert/sdk'" : "require('@dropanyconvert/sdk')"};

const client = new DropAnyConvert({
  apiKey: process.env.DAC_API_KEY, // 'dac_your_key'
});`);
    convertBlock = code(sdk.id, `const result = await client.convert('${exTool?.slug || 'jpg-to-png'}', {
  file: fs.createReadStream('photo.jpg'),
});
console.log(result.downloadUrl);`);
  } else if (sdk.id === 'python') {
    installBlock = code('bash', `pip install dropanyconvert`);
    authBlock    = code('python', `from dropanyconvert import DropAnyConvert\n\nclient = DropAnyConvert(api_key="dac_your_key")`);
    convertBlock = code('python', `result = client.convert("${exTool?.slug || 'jpg-to-png'}", file=open("photo.jpg","rb"))\nprint(result.download_url)`);
  } else if (sdk.id === 'php') {
    installBlock = code('bash', `composer require dropanyconvert/sdk`);
    authBlock    = code('php', `<?php\nuse DropAnyConvert\\Client;\n$client = new Client(['apiKey' => 'dac_your_key']);`);
    convertBlock = code('php', `$result = $client->convert('${exTool?.slug || 'jpg-to-png'}', ['file' => fopen('photo.jpg','r')]);\necho $result->downloadUrl;`);
  } else if (sdk.id === 'go') {
    installBlock = code('bash', `go get github.com/dropanyconvert/sdk-go`);
    authBlock    = code('go', `import dac "github.com/dropanyconvert/sdk-go"\nclient := dac.New(dac.WithAPIKey("dac_your_key"))`);
    convertBlock = code('go', `f, _ := os.Open("photo.jpg")\nresult, _ := client.Convert("${exTool?.slug || 'jpg-to-png'}", dac.File(f))\nfmt.Println(result.DownloadURL)`);
  } else if (sdk.id === 'csharp') {
    installBlock = code('bash', `dotnet add package DropAnyConvert`);
    authBlock    = code('csharp', `using DropAnyConvert;\nvar client = new DACClient("dac_your_key");`);
    convertBlock = code('csharp', `var result = await client.ConvertAsync("${exTool?.slug || 'jpg-to-png'}", File.OpenRead("photo.jpg"));\nConsole.WriteLine(result.DownloadUrl);`);
  } else {
    installBlock = code('xml', `<dependency>\n  <groupId>com.dropanyconvert</groupId>\n  <artifactId>sdk</artifactId>\n  <version>1.0.0</version>\n</dependency>`);
    authBlock    = code('java', `import com.dropanyconvert.DACClient;\nDACClient client = new DACClient("dac_your_key");`);
    convertBlock = code('java', `DACResult result = client.convert("${exTool?.slug || 'jpg-to-png'}", new File("photo.jpg"));\nSystem.out.println(result.getDownloadUrl());`);
  }

  const head = renderApiHead(
    `${sdk.label} SDK — ${siteName} API`,
    `${sdk.label} code examples for the ${siteName} API. Convert files programmatically in ${sdk.label}.`,
    `${baseUrl}/${lang}/api/sdks/${sdk.id}`,
    lang,
    [{ '@context': 'https://schema.org', '@type': 'TechArticle', name: `${sdk.label} SDK`, description: `${sdk.label} examples for ${siteName} API`, url: `${baseUrl}/${lang}/api/sdks/${sdk.id}` }],
  );

  const content = `
${renderBreadcrumb([
  { name: 'API', url: `/${lang}/api` },
  { name: t.sdks, url: `/${lang}/api/sdks` },
  { name: sdk.label, url: `/${lang}/api/sdks/${sdk.id}` },
])}
<h1>${sdk.icon} ${sdk.label} SDK</h1>
<p class="dac-api-lead">${sdk.label} examples for the ${siteName} API. Full SDK ${esc(t.comingSoon)} — use these patterns with the REST API today.</p>
<div class="dac-alert dac-alert--warn">📦 <strong>SDK Preview</strong> — Official packages are not yet published. Examples use the REST API directly.</div>
<h2>Installation</h2>
${installBlock}
<h2>Authentication</h2>
${authBlock}
<h2>Convert a File</h2>
${convertBlock}
<h2>All ${data.tools.length} tools via REST</h2>
<p>Every tool listed in the <a href="/${lang}/api/reference">API Reference</a> follows the same pattern — just change the tool slug in the endpoint URL.</p>`;

  const sidebar = renderApiSidebar(lang, `sdks/${sdk.id}`, t, data);
  const topbar  = renderApiTopbar(lang, siteName, t);
  return `<!DOCTYPE html>\n<html lang="${lang}">\n<head>\n${head}\n</head>\n${wrapApiPage(lang, content, sidebar, topbar)}`;
}

// ── Topic page wrapper ─────────────────────────────────────────────────────

function renderTopicPage(slug, lang, t, data, config) {
  const baseUrl  = config.site.baseUrl;
  const siteName = config.site.name;
  const labelKey = NAV_SECTIONS.flatMap(s => s.items).find(i => i.slug === slug)?.key || 'apiDocs';
  const label    = t[labelKey] || slug;
  const canonical = `${baseUrl}/${lang}/api${slug ? '/' + slug : ''}`;

  const techArticle = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    name:   `${label} — ${siteName} API`,
    url:    canonical,
    author: { '@type': 'Organization', name: siteName },
  };

  const head = renderApiHead(
    `${label} — ${siteName} API`,
    `${label} documentation for the ${siteName} REST API.`,
    canonical, lang, [techArticle],
  );

  const content = topicContent(slug, t, lang, data, config);
  const sidebar = renderApiSidebar(lang, slug, t, data);
  const topbar  = renderApiTopbar(lang, siteName, t);
  return `<!DOCTYPE html>\n<html lang="${lang}">\n<head>\n${head}\n</head>\n${wrapApiPage(lang, content, sidebar, topbar)}`;
}

// ── Search index ───────────────────────────────────────────────────────────

export function generateApiSearchIndex(data, config) {
  const baseUrl = config.site.baseUrl;
  const entries = (data.tools || []).map(tool => ({
    slug:     tool.slug,
    name:     tool.name.en,
    endpoint: `/api/v1/convert/${tool.slug}`,
    category: tool.category,
    inputs:   tool.inputFormats,
    outputs:  tool.outputFormats.map(f => f.mime),
    docsUrl:  `/en/api/tools/${tool.slug}`,
  }));

  return {
    path:    '/api-search-index.json',
    content: JSON.stringify({ version: 1, generated: new Date().toISOString(), entries }, null, 0),
  };
}

// ── Main export ────────────────────────────────────────────────────────────

export function generateApiDocPages(data, config) {
  const pages = [];
  const langs = (data.languages || []).map(l => l.code);

  for (const lang of langs) {
    const t = I18N[lang] || I18N.en;

    // Topic / portal pages
    for (const slug of ALL_TOPIC_SLUGS) {
      const pathSlug = slug ? `/${slug}` : '';
      pages.push({
        path:    `/${lang}/api${pathSlug}/index.html`,
        content: renderTopicPage(slug, lang, t, data, config),
      });
    }

    // Per-tool API pages
    for (const tool of (data.tools || [])) {
      pages.push({
        path:    `/${lang}/api/tools/${tool.slug}/index.html`,
        content: renderToolApiPage(tool, lang, t, data, config),
      });
    }

    // Per-SDK pages
    for (const sdk of SDK_LIST) {
      pages.push({
        path:    `/${lang}/api/sdks/${sdk.id}/index.html`,
        content: renderSdkPage(sdk, lang, t, data, config),
      });
    }
  }

  return pages;
}

export function getApiDocStats(data) {
  const langs    = 5;
  const topics   = ALL_TOPIC_SLUGS.length;
  const toolDocs = (data.tools || []).length;
  const sdkDocs  = SDK_LIST.length;
  return {
    topic_pages:   topics * langs,
    tool_api_pages: toolDocs * langs,
    sdk_pages:     sdkDocs * langs,
    total_pages:   (topics + toolDocs + sdkDocs) * langs,
    endpoints:     toolDocs,
    sdks:          sdkDocs,
    languages:     langs,
  };
}
