/**
 * Phase 21 — User Dashboard Generator
 *
 * Generates static HTML shells for dashboard pages.
 * Pages show empty states — client-side JS populates them post-login.
 * No server-side user data. Generator-first.
 *
 * Routes (per language):
 *   /{lang}/dashboard/             — overview
 *   /{lang}/dashboard/history      — recent conversions
 *   /{lang}/dashboard/favorites    — favorited tools
 *   /{lang}/dashboard/files        — saved files
 *   /{lang}/dashboard/usage        — usage stats
 *   /{lang}/dashboard/subscription — plan & billing
 *   /{lang}/dashboard/api-keys     — API key management
 *   /{lang}/dashboard/settings     — user preferences
 */

import { PLAN_LIST } from './premium/plans.js';

// ── i18n labels ────────────────────────────────────────────────────────────

const I18N = {
  en: {
    dashboard:     'Dashboard',
    history:       'Recent Conversions',
    favorites:     'Favorites',
    files:         'Saved Files',
    usage:         'Usage',
    subscription:  'Subscription',
    apiKeys:       'API Keys',
    settings:      'Settings',
    signInTitle:   'Sign in to access your dashboard',
    signInDesc:    'Track conversions, manage your subscription, and access premium features.',
    signIn:        'Sign In',
    createAccount: 'Create Free Account',
    emptyHistory:  'Your conversion history will appear here',
    emptyFavorites: 'Tools you favorite will appear here',
    emptyFiles:    'Your saved files will appear here',
    planFree:      'Free Plan',
    planPro:       'Pro Plan',
    planBusiness:  'Business Plan',
    upgrade:       'Upgrade',
    manage:        'Manage Billing',
    loading:       'Loading…',
  },
  es: {
    dashboard:     'Panel',
    history:       'Conversiones Recientes',
    favorites:     'Favoritos',
    files:         'Archivos Guardados',
    usage:         'Uso',
    subscription:  'Suscripción',
    apiKeys:       'Claves API',
    settings:      'Configuración',
    signInTitle:   'Inicia sesión para acceder a tu panel',
    signInDesc:    'Sigue tus conversiones, administra tu suscripción y accede a funciones premium.',
    signIn:        'Iniciar sesión',
    createAccount: 'Crear cuenta gratis',
    emptyHistory:  'Tu historial de conversiones aparecerá aquí',
    emptyFavorites: 'Las herramientas que marques como favoritas aparecerán aquí',
    emptyFiles:    'Tus archivos guardados aparecerán aquí',
    planFree:      'Plan Gratuito',
    planPro:       'Plan Pro',
    planBusiness:  'Plan Business',
    upgrade:       'Mejorar',
    manage:        'Gestionar facturación',
    loading:       'Cargando…',
  },
  fr: {
    dashboard:     'Tableau de bord',
    history:       'Conversions récentes',
    favorites:     'Favoris',
    files:         'Fichiers sauvegardés',
    usage:         'Utilisation',
    subscription:  'Abonnement',
    apiKeys:       'Clés API',
    settings:      'Paramètres',
    signInTitle:   'Connectez-vous pour accéder à votre tableau de bord',
    signInDesc:    'Suivez vos conversions, gérez votre abonnement et accédez aux fonctionnalités premium.',
    signIn:        'Se connecter',
    createAccount: 'Créer un compte gratuit',
    emptyHistory:  'Votre historique de conversions apparaîtra ici',
    emptyFavorites: 'Les outils que vous aimez apparaîtront ici',
    emptyFiles:    'Vos fichiers enregistrés apparaîtront ici',
    planFree:      'Plan gratuit',
    planPro:       'Plan Pro',
    planBusiness:  'Plan Business',
    upgrade:       'Mettre à niveau',
    manage:        'Gérer la facturation',
    loading:       'Chargement…',
  },
  de: {
    dashboard:     'Dashboard',
    history:       'Letzte Konvertierungen',
    favorites:     'Favoriten',
    files:         'Gespeicherte Dateien',
    usage:         'Nutzung',
    subscription:  'Abonnement',
    apiKeys:       'API-Schlüssel',
    settings:      'Einstellungen',
    signInTitle:   'Melden Sie sich an, um auf Ihr Dashboard zuzugreifen',
    signInDesc:    'Verfolgen Sie Konvertierungen, verwalten Sie Ihr Abonnement und nutzen Sie Premium-Funktionen.',
    signIn:        'Anmelden',
    createAccount: 'Kostenloses Konto erstellen',
    emptyHistory:  'Ihr Konvertierungsverlauf wird hier angezeigt',
    emptyFavorites: 'Favorisierte Tools werden hier angezeigt',
    emptyFiles:    'Ihre gespeicherten Dateien werden hier angezeigt',
    planFree:      'Kostenloses Abo',
    planPro:       'Pro-Abo',
    planBusiness:  'Business-Abo',
    upgrade:       'Upgrade',
    manage:        'Abrechnung verwalten',
    loading:       'Laden…',
  },
  pt: {
    dashboard:     'Painel',
    history:       'Conversões Recentes',
    favorites:     'Favoritos',
    files:         'Arquivos Salvos',
    usage:         'Uso',
    subscription:  'Assinatura',
    apiKeys:       'Chaves de API',
    settings:      'Configurações',
    signInTitle:   'Entre para acessar seu painel',
    signInDesc:    'Acompanhe conversões, gerencie sua assinatura e acesse recursos premium.',
    signIn:        'Entrar',
    createAccount: 'Criar conta grátis',
    emptyHistory:  'Seu histórico de conversões aparecerá aqui',
    emptyFavorites: 'As ferramentas favoritas aparecerão aqui',
    emptyFiles:    'Seus arquivos salvos aparecerão aqui',
    planFree:      'Plano Gratuito',
    planPro:       'Plano Pro',
    planBusiness:  'Plano Business',
    upgrade:       'Fazer upgrade',
    manage:        'Gerenciar cobrança',
    loading:       'Carregando…',
  },
};

// ── Dashboard sections ─────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'index',        slug: '',             icon: '⊞', key: 'dashboard'    },
  { id: 'history',      slug: 'history',      icon: '↩', key: 'history'      },
  { id: 'favorites',    slug: 'favorites',    icon: '♡', key: 'favorites'    },
  { id: 'files',        slug: 'files',        icon: '⊟', key: 'files'        },
  { id: 'usage',        slug: 'usage',        icon: '◎', key: 'usage'        },
  { id: 'subscription', slug: 'subscription', icon: '◇', key: 'subscription' },
  { id: 'api-keys',     slug: 'api-keys',     icon: '⊞', key: 'apiKeys'      },
  { id: 'settings',     slug: 'settings',     icon: '⚙', key: 'settings'     },
];

// ── Shell page renderer ────────────────────────────────────────────────────

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderDashboardShell(lang, section, config) {
  const t = I18N[lang] || I18N.en;
  const siteName = esc(config.site?.name || 'DropAnyConvert');
  const baseUrl  = config.site?.baseUrl || '';
  const canonical = `${baseUrl}/${lang}/dashboard${section.slug ? '/' + section.slug : ''}`;
  const title     = `${t[section.key]} — ${siteName}`;

  const navLinks = SECTIONS.map(s => {
    const href    = `/${lang}/dashboard${s.slug ? '/' + s.slug : ''}`;
    const active  = s.id === section.id;
    return `<a href="${href}" class="dac-dash-nav__link${active ? ' dac-dash-nav__link--active' : ''}" aria-current="${active ? 'page' : 'false'}">${s.icon} ${esc(t[s.key])}</a>`;
  }).join('\n');

  const sectionContent = renderSectionContent(section.id, t, lang, config);

  const criticalCss = `<style>*,::before,::after{box-sizing:border-box}html{-webkit-text-size-adjust:100%}body{margin:0;font-family:system-ui,-apple-system,sans-serif;line-height:1.5;background:#fff;color:#111}[data-theme=dark]{background:#0f0f0f;color:#e5e5e5}.dac-dash-layout{display:grid;grid-template-columns:220px 1fr;min-height:100vh;max-width:1200px;margin:0 auto;padding:2rem 1.5rem;gap:2rem}@media(max-width:768px){.dac-dash-layout{grid-template-columns:1fr}}.dac-dash-nav{display:flex;flex-direction:column;gap:.25rem}.dac-dash-nav__link{display:flex;align-items:center;gap:.6rem;padding:.6rem .9rem;border-radius:6px;text-decoration:none;color:inherit;font-size:.875rem;transition:background .15s}.dac-dash-nav__link:hover{background:#f3f4f6}.dac-dash-nav__link--active{background:#ede9fe;color:#6366f1;font-weight:600}[data-theme=dark] .dac-dash-nav__link:hover{background:#1f1f1f}[data-theme=dark] .dac-dash-nav__link--active{background:#2a1f5e}.dac-dash-main{min-width:0}.dac-dash-gate{text-align:center;padding:4rem 2rem;max-width:480px;margin:0 auto}.dac-dash-gate__icon{font-size:3rem;margin-bottom:1rem}.dac-dash-gate h1{font-size:1.5rem;margin:0 0 .75rem}.dac-dash-gate p{color:#6b7280;margin:0 0 1.5rem}.dac-dash-gate__actions{display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap}.dac-btn{display:inline-flex;align-items:center;padding:.625rem 1.25rem;border-radius:8px;font-weight:600;font-size:.875rem;text-decoration:none;cursor:pointer;border:none;transition:opacity .15s}.dac-btn--primary{background:#6366f1;color:#fff}.dac-btn--secondary{background:#f3f4f6;color:#111}.dac-btn:hover{opacity:.9}.dac-dash-content{display:none}.dac-dash-content--active{display:block}.dac-loading{color:#9ca3af;font-size:.875rem;padding:2rem 0}</style>`;

  const themeInit = `<script>try{var t=JSON.parse(localStorage.getItem('dac_settings')||'{}').theme||'auto';document.documentElement.dataset.theme=t==='auto'?(window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'):t}catch(e){}</script>`;

  return `<!DOCTYPE html>
<html lang="${lang}" data-page="dashboard-${section.id}">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(t[section.key])} — ${siteName}">
<meta name="robots" content="noindex, nofollow">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:type" content="website">
<meta name="theme-color" content="#6366f1">
<link rel="icon" href="/assets/images/icon-192.png" type="image/png">
<link rel="apple-touch-icon" href="/assets/images/icon-192.png">
<link rel="manifest" href="/site.webmanifest">
${criticalCss}
<link rel="preload" href="/assets/css/main.css" as="style">
<link rel="stylesheet" href="/assets/css/main.css" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="/assets/css/main.css"></noscript>
${themeInit}
</head>
<body>
<a class="dac-skip" href="#main">Skip to content</a>
<a href="/${lang}" class="dac-header__logo" style="display:flex;align-items:center;gap:.5rem;padding:.75rem 1.5rem;text-decoration:none;color:inherit;font-weight:700;border-bottom:1px solid #e5e5e5;position:sticky;top:0;background:var(--bg,#fff);z-index:100">
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
  ${siteName}
</a>
<div class="dac-dash-layout">
  <nav class="dac-dash-nav" aria-label="Dashboard navigation">
${navLinks}
  </nav>
  <main id="main" class="dac-dash-main">
    <!-- Auth gate: shown until JS confirms user is logged in -->
    <div class="dac-dash-gate" id="dac-auth-gate">
      <div class="dac-dash-gate__icon">◈</div>
      <h1>${esc(t.signInTitle)}</h1>
      <p>${esc(t.signInDesc)}</p>
      <div class="dac-dash-gate__actions">
        <a href="/${lang}/login" class="dac-btn dac-btn--primary">${esc(t.signIn)}</a>
        <a href="/${lang}/register" class="dac-btn dac-btn--secondary">${esc(t.createAccount)}</a>
      </div>
    </div>
    <!-- Dashboard content: shown after auth confirmed -->
    <div class="dac-dash-content" id="dac-dash-content" hidden>
${sectionContent}
    </div>
  </main>
</div>
<script>
(function(){
  // Hydrate dashboard if user session exists
  var token = null;
  try { token = JSON.parse(localStorage.getItem('dac_session')||'null')?.token; } catch(e) {}
  if (token) {
    var gate = document.getElementById('dac-auth-gate');
    var content = document.getElementById('dac-dash-content');
    if (gate) gate.hidden = true;
    if (content) { content.hidden = false; content.classList.add('dac-dash-content--active'); }
  }
})();
</script>
<script src="/assets/js/platform.js" defer></script>
</body>
</html>`;
}

// ── Section content renderers ──────────────────────────────────────────────

function renderSectionContent(sectionId, t, lang, config) {
  switch (sectionId) {
    case 'index':        return renderOverview(t, lang);
    case 'history':      return renderHistory(t, lang);
    case 'favorites':    return renderFavorites(t, lang);
    case 'files':        return renderFiles(t, lang);
    case 'usage':        return renderUsage(t, lang);
    case 'subscription': return renderSubscription(t, lang);
    case 'api-keys':     return renderApiKeys(t, lang);
    case 'settings':     return renderSettings(t, lang);
    default:             return '<p class="dac-loading">…</p>';
  }
}

function renderOverview(t) {
  return `
      <h1 style="margin:0 0 1.5rem;font-size:1.75rem">${esc(t.dashboard)}</h1>
      <div id="dac-dash-overview" class="dac-loading">${esc(t.loading)}</div>`;
}

function renderHistory(t) {
  return `
      <h1 style="margin:0 0 1.5rem;font-size:1.75rem">${esc(t.history)}</h1>
      <div id="dac-dash-history">
        <p class="dac-loading" id="dac-history-empty">${esc(t.emptyHistory)}</p>
        <div id="dac-history-list" hidden></div>
      </div>`;
}

function renderFavorites(t) {
  return `
      <h1 style="margin:0 0 1.5rem;font-size:1.75rem">${esc(t.favorites)}</h1>
      <div id="dac-dash-favorites">
        <p class="dac-loading" id="dac-favorites-empty">${esc(t.emptyFavorites)}</p>
        <div id="dac-favorites-list" hidden></div>
      </div>`;
}

function renderFiles(t) {
  return `
      <h1 style="margin:0 0 1.5rem;font-size:1.75rem">${esc(t.files)}</h1>
      <div id="dac-dash-files">
        <p class="dac-loading" id="dac-files-empty">${esc(t.emptyFiles)}</p>
        <div id="dac-files-list" hidden></div>
      </div>`;
}

function renderUsage(t) {
  return `
      <h1 style="margin:0 0 1.5rem;font-size:1.75rem">${esc(t.usage)}</h1>
      <div id="dac-dash-usage" class="dac-loading">${esc(t.loading)}</div>`;
}

function renderSubscription(t) {
  const planCards = PLAN_LIST.map(plan => `
        <div class="dac-plan-card" data-plan="${plan.id}" style="border:1px solid #e5e5e5;border-radius:10px;padding:1.25rem;min-width:180px">
          <div style="font-weight:700;margin-bottom:.5rem">${esc(plan.name)}</div>
          ${plan.badge ? `<div style="font-size:.75rem;color:#6366f1;margin-bottom:.5rem">${esc(plan.badge)}</div>` : ''}
          <div style="font-size:1.5rem;font-weight:800;margin-bottom:.75rem">$${plan.price.monthly}<span style="font-size:.875rem;font-weight:400">/mo</span></div>
        </div>`).join('');

  return `
      <h1 style="margin:0 0 1.5rem;font-size:1.75rem">${esc(t.subscription)}</h1>
      <div id="dac-dash-subscription">
        <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:1.5rem">${planCards}</div>
        <div id="dac-sub-actions" class="dac-loading">${esc(t.loading)}</div>
      </div>`;
}

function renderApiKeys(t) {
  return `
      <h1 style="margin:0 0 1.5rem;font-size:1.75rem">${esc(t.apiKeys)}</h1>
      <div id="dac-dash-api-keys" class="dac-loading">${esc(t.loading)}</div>`;
}

function renderSettings(t) {
  return `
      <h1 style="margin:0 0 1.5rem;font-size:1.75rem">${esc(t.settings)}</h1>
      <div id="dac-dash-settings" class="dac-loading">${esc(t.loading)}</div>`;
}

// ── Main export ────────────────────────────────────────────────────────────

export function generateDashboardPages(data, config) {
  const pages = [];
  const langs = data.languages.map(l => l.code);

  for (const lang of langs) {
    for (const section of SECTIONS) {
      const pathSlug = section.slug ? `/${section.slug}` : '';
      const filePath = `/${lang}/dashboard${pathSlug}/index.html`;
      const html     = renderDashboardShell(lang, section, config);
      pages.push({ path: filePath, content: html });
    }
  }

  return pages;
}

// ── Route metadata (for sitemap exclusion + report) ───────────────────────

export function getDashboardRouteCount(data) {
  const langs = data.languages.map(l => l.code);
  return langs.length * SECTIONS.length;
}
