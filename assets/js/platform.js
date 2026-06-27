/**
 * DropAnyConvert — Platform Layer
 *
 * Handles: theme, search, mobile menu, language selector,
 * recent tools, favorites, conversion history, settings.
 *
 * Reads window.DAC_TOOLS (embedded by generator) for search index.
 * All state stored in localStorage under dac_* keys.
 * Exposes window.DAC.platform for inter-module communication.
 */

(function () {
  'use strict';

  // ── Safe localStorage wrapper ─────────────────────────────────────────────

  const Store = {
    get(key, fallback = null) {
      try {
        const v = localStorage.getItem(key);
        return v !== null ? JSON.parse(v) : fallback;
      } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    },
    remove(key) {
      try { localStorage.removeItem(key); } catch {}
    },
  };

  // ── Settings ──────────────────────────────────────────────────────────────

  const Settings = {
    _defaults: { theme: 'auto', preferredQuality: 85, preferredDpi: 150 },
    get()      { return { ...this._defaults, ...Store.get('dac_settings', {}) }; },
    set(patch) {
      const current = this.get();
      Store.set('dac_settings', { ...current, ...patch });
      window.DAC?.analytics?.track('settings_change', patch);
    },
  };

  // ── Recent Tools ──────────────────────────────────────────────────────────

  const Recent = {
    MAX: 6,
    get()                 { return Store.get('dac_recent', []); },
    add(slug, name, lang) {
      const list = this.get().filter(r => r.slug !== slug);
      list.unshift({ slug, name, lang, ts: Date.now() });
      Store.set('dac_recent', list.slice(0, this.MAX));
    },
    clear()               { Store.remove('dac_recent'); },
  };

  // ── Favorites ─────────────────────────────────────────────────────────────

  const Favorites = {
    get()                 { return Store.get('dac_favorites', []); },
    isFav(slug)           { return this.get().some(f => f.slug === slug); },
    toggle(slug, name, lang) {
      let list = this.get();
      if (this.isFav(slug)) {
        list = list.filter(f => f.slug !== slug);
        window.DAC?.analytics?.track('favorite_remove', { slug });
      } else {
        list.push({ slug, name, lang, ts: Date.now() });
        window.DAC?.analytics?.track('favorite_add', { slug });
      }
      Store.set('dac_favorites', list);
      return this.isFav(slug);
    },
    clear() { Store.remove('dac_favorites'); },
  };

  // ── Conversion History ────────────────────────────────────────────────────

  const History = {
    MAX: 20,
    get()   { return Store.get('dac_history', []); },
    add(entry) {
      const list = this.get();
      list.unshift({ ...entry, ts: Date.now() });
      Store.set('dac_history', list.slice(0, this.MAX));
    },
    clear() {
      Store.remove('dac_history');
      window.DAC?.analytics?.track('history_clear', {});
    },
  };

  // ── Theme ─────────────────────────────────────────────────────────────────

  const Theme = {
    current: 'auto',

    init() {
      this.current = Settings.get().theme || 'auto';
      this.apply(this.current);

      const btn = document.getElementById('dac-theme-btn');
      if (btn) {
        btn.addEventListener('click', () => this.cycle());
        this.updateIcon(btn);
      }
    },

    cycle() {
      const order = ['auto', 'light', 'dark'];
      const next = order[(order.indexOf(this.current) + 1) % order.length];
      this.apply(next);
      Settings.set({ theme: next });
      const btn = document.getElementById('dac-theme-btn');
      if (btn) this.updateIcon(btn);
    },

    apply(theme) {
      this.current = theme;
      const resolved = theme === 'auto'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : theme;
      document.documentElement.dataset.theme = resolved;
    },

    updateIcon(btn) {
      const icons = { light: '☀', dark: '☾', auto: '⬤' };
      const labels = { light: 'Switch to dark mode', dark: 'Switch to auto mode', auto: 'Switch to light mode' };
      btn.textContent = icons[this.current] || '⬤';
      btn.setAttribute('aria-label', labels[this.current] || 'Toggle theme');
    },
  };

  // ── Search ────────────────────────────────────────────────────────────────

  const Search = {
    overlay: null,
    input: null,
    results: null,
    tools: [],
    _debounceTimer: null,

    init() {
      this.overlay = document.getElementById('dac-search-overlay');
      this.input   = document.getElementById('dac-search-input');
      this.results = document.getElementById('dac-search-results');
      this.tools   = window.DAC_TOOLS || [];

      const openBtn  = document.getElementById('dac-search-btn');
      const closeBtn = document.getElementById('dac-search-close');

      if (openBtn)  openBtn.addEventListener('click', () => this.open());
      if (closeBtn) closeBtn.addEventListener('click', () => this.close());

      if (this.overlay) {
        this.overlay.addEventListener('click', e => {
          if (e.target === this.overlay) this.close();
        });
      }

      if (this.input) {
        this.input.addEventListener('input', () => {
          clearTimeout(this._debounceTimer);
          this._debounceTimer = setTimeout(() => this.query(this.input.value), 120);
        });
        this.input.addEventListener('keydown', e => this.handleKey(e));
      }

      document.addEventListener('keydown', e => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); this.open(); }
        if (e.key === 'Escape' && this.overlay && !this.overlay.hidden) this.close();
      });
    },

    open() {
      if (!this.overlay) return;
      this.overlay.hidden = false;
      this.overlay.setAttribute('aria-hidden', 'false');
      this.input?.focus();
      this.query('');
      document.body.style.overflow = 'hidden';
    },

    close() {
      if (!this.overlay) return;
      this.overlay.hidden = true;
      this.overlay.setAttribute('aria-hidden', 'true');
      if (this.input) this.input.value = '';
      document.body.style.overflow = '';
      document.getElementById('dac-search-btn')?.focus();
    },

    query(q) {
      q = q.trim();
      const hits = q.length < 1 ? this.tools.slice(0, 12) : this.match(q);
      window.DAC?.analytics?.track('search', { q, results: hits.length });
      this.render(hits, q);
    },

    match(q) {
      const lq = q.toLowerCase();
      const scored = this.tools.map(t => {
        const fields = [t.name, t.tagline, ...t.keywords].join(' ').toLowerCase();
        if (t.name.toLowerCase().startsWith(lq)) return { t, score: 3 };
        if (t.name.toLowerCase().includes(lq))   return { t, score: 2 };
        if (fields.includes(lq))                  return { t, score: 1 };
        return null;
      }).filter(Boolean);
      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, 12).map(s => s.t);
    },

    highlight(text, q) {
      if (!q) return esc(text);
      const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      return esc(text).replace(re, '<mark class="dac-search-mark">$1</mark>');
    },

    render(hits, q) {
      if (!this.results) return;
      if (!hits.length && q) {
        this.results.innerHTML = `<div class="dac-empty-state dac-empty-state--sm">
          <p class="dac-empty-state__title">No results for "<strong>${esc(q)}</strong>"</p>
          <p class="dac-empty-state__desc">Try a different keyword, like "compress", "resize", or "merge".</p>
        </div>`;
        return;
      }

      // Group by category
      const groups = {};
      hits.forEach(t => {
        if (!groups[t.category]) groups[t.category] = [];
        groups[t.category].push(t);
      });

      const lang = document.documentElement.lang || 'en';
      let html = hits.length === 0 && !q
        ? '<p class="dac-search-hint">Start typing to search all tools…</p>'
        : '';

      for (const [cat, tools] of Object.entries(groups)) {
        html += `<div class="dac-search-group">
          <span class="dac-search-group__label">${esc(cat)}</span>
          ${tools.map(t => `
            <a href="/${lang}/${t.slug}" class="dac-search-result" tabindex="0">
              <span class="dac-search-result__name">${this.highlight(t.name, q)}</span>
              <span class="dac-search-result__tagline">${this.highlight(t.tagline, q)}</span>
            </a>`).join('')}
        </div>`;
      }

      if (q && hits.length === 0) {
        html = `<div class="dac-search-noresults">No tools found for "${esc(q)}"</div>`;
      }

      this.results.innerHTML = html;

      // Wire result clicks: record in recent, close overlay
      this.results.querySelectorAll('.dac-search-result').forEach(a => {
        a.addEventListener('click', () => {
          const slug = a.getAttribute('href')?.split('/').pop() || '';
          const name = a.querySelector('.dac-search-result__name')?.textContent || '';
          Recent.add(slug, name, document.documentElement.lang || 'en');
          this.close();
        });
      });
    },

    handleKey(e) {
      if (!this.results) return;
      const items = [...this.results.querySelectorAll('.dac-search-result')];
      if (!items.length) return;
      const active = this.results.querySelector('.dac-search-result--focused');
      const idx = active ? items.indexOf(active) : -1;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        active?.classList.remove('dac-search-result--focused');
        const next = items[(idx + 1) % items.length];
        next.classList.add('dac-search-result--focused');
        next.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        active?.classList.remove('dac-search-result--focused');
        const prev = items[(idx - 1 + items.length) % items.length];
        prev.classList.add('dac-search-result--focused');
        prev.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter' && active) {
        e.preventDefault();
        active.click();
      }
    },
  };

  // ── Mobile Menu ───────────────────────────────────────────────────────────

  const MobileMenu = {
    panel: null,
    btn: null,
    isOpen: false,

    init() {
      this.panel = document.getElementById('dac-mobile-nav');
      this.btn   = document.getElementById('dac-menu-btn');
      if (!this.btn || !this.panel) return;

      this.btn.addEventListener('click', () => this.toggle());
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && this.isOpen) this.close();
      });
      this.panel.addEventListener('click', e => {
        if (e.target.tagName === 'A') this.close();
      });
    },

    toggle() { this.isOpen ? this.close() : this.open(); },

    open() {
      this.isOpen = true;
      this.panel.hidden = false;
      this.btn.setAttribute('aria-expanded', 'true');
      this.btn.setAttribute('aria-label', 'Close menu');
      document.body.classList.add('dac-menu-open');
    },

    close() {
      this.isOpen = false;
      this.panel.hidden = true;
      this.btn.setAttribute('aria-expanded', 'false');
      this.btn.setAttribute('aria-label', 'Open menu');
      document.body.classList.remove('dac-menu-open');
    },
  };

  // ── Dynamic Sections (homepage / category) ────────────────────────────────

  function initDynamicSections() {
    const lang = document.documentElement.lang || 'en';

    // Recent tools section
    const recentSection = document.getElementById('dac-recent-section');
    const recentGrid    = document.getElementById('dac-recent-grid');
    if (recentSection && recentGrid) {
      const recent = Recent.get();
      if (recent.length) {
        recentGrid.innerHTML = recent.map(r =>
          `<a href="/${lang}/${r.slug}" class="dac-tool-card">
            <h3 class="dac-tool-card__name">${esc(r.name)}</h3>
          </a>`
        ).join('');
        recentSection.hidden = false;
      }
    }

    // Favorites section
    const favSection = document.getElementById('dac-favorites-section');
    const favGrid    = document.getElementById('dac-favorites-grid');
    if (favSection && favGrid) {
      const favs = Favorites.get();
      if (favs.length) {
        favGrid.innerHTML = favs.map(f =>
          `<a href="/${lang}/${f.slug}" class="dac-tool-card">
            <h3 class="dac-tool-card__name">${esc(f.name)}</h3>
          </a>`
        ).join('');
        favSection.hidden = false;
      }
    }

    // History section on homepage
    const histSection = document.getElementById('dac-history-section');
    const histList    = document.getElementById('dac-history-list');
    if (histSection && histList) {
      const hist = History.get();
      if (hist.length) {
        histList.innerHTML = hist.slice(0, 10).map(h =>
          `<div class="dac-history-item">
            <a href="/${lang}/${h.slug}" class="dac-history-item__tool">${esc(h.toolName)}</a>
            <span class="dac-history-item__file">${esc(h.filename)}</span>
            <span class="dac-history-item__date">${relTime(h.ts)}</span>
          </div>`
        ).join('');
        histSection.hidden = false;
      }
    }

    // Clear history button
    const clearHistBtn = document.getElementById('dac-clear-history');
    if (clearHistBtn) {
      clearHistBtn.addEventListener('click', () => {
        History.clear();
        if (histSection) histSection.hidden = true;
      });
    }

    // Recent tools in footer
    const footerRecent = document.getElementById('dac-footer-recent');
    if (footerRecent) {
      const recent = Recent.get();
      if (recent.length) {
        footerRecent.innerHTML = recent.slice(0, 4).map(r =>
          `<a href="/${lang}/${r.slug}" class="dac-footer__link">${esc(r.name)}</a>`
        ).join('');
      }
    }
  }

  // ── Favorite Button on Tool Pages ─────────────────────────────────────────

  function initFavoriteButton() {
    const btn = document.getElementById('dac-fav-btn');
    if (!btn) return;

    const slug = btn.dataset.slug;
    const name = btn.dataset.name;
    const lang = document.documentElement.lang || 'en';

    const update = () => {
      const isFav = Favorites.isFav(slug);
      btn.classList.toggle('dac-fav-btn--active', isFav);
      btn.setAttribute('aria-label', isFav ? 'Remove from favorites' : 'Add to favorites');
      btn.title = isFav ? 'Remove from favorites' : 'Add to favorites';
    };

    update();
    btn.addEventListener('click', () => {
      Favorites.toggle(slug, name, lang);
      update();
    });
  }

  // ── Record tool page visit in Recent ──────────────────────────────────────

  function trackPageVisit() {
    const dropzone = document.getElementById('dac-dropzone');
    const lang = document.documentElement.lang || 'en';

    if (dropzone) {
      // Tool page
      const toolId = dropzone.dataset.toolId;
      const toolName = document.getElementById('dac-tool-title')?.textContent || toolId;
      if (toolId) {
        const slug = location.pathname.split('/').filter(Boolean).pop() || toolId;
        Recent.add(slug, toolName, lang);
        window.DAC?.analytics?.track('tool_page_visit', { toolId });
      }
    } else if (document.querySelector('.dac-page--hub')) {
      window.DAC?.analytics?.track('homepage_visit', {});
    } else if (document.querySelector('.dac-page--category')) {
      const catSlug = location.pathname.split('/').filter(Boolean).pop();
      window.DAC?.analytics?.track('category_visit', { catSlug });
    }

    // Apply preferred settings to controls (quality, DPI)
    const settings = Settings.get();
    const qualSlider = document.getElementById('dac-quality');
    if (qualSlider && settings.preferredQuality) {
      qualSlider.value = settings.preferredQuality;
      qualSlider.dispatchEvent(new Event('input'));
    }
    const dpiSelect = document.getElementById('dac-opt-dpi');
    if (dpiSelect && settings.preferredDpi) {
      dpiSelect.value = settings.preferredDpi;
    }
  }

  // ── Listen to analytics events for history recording ─────────────────────

  function hookAnalytics() {
    const orig = window.DAC?.analytics?.track?.bind(window.DAC.analytics);
    if (!orig) return;

    window.DAC.analytics.track = function (event, props = {}) {
      orig(event, props);

      if (event === 'conversion_completed' && props.filename) {
        const dropzone = document.getElementById('dac-dropzone');
        const toolName = document.getElementById('dac-tool-title')?.textContent || props.toolId;
        const slug = location.pathname.split('/').filter(Boolean).pop();
        History.add({
          toolId: props.toolId,
          toolName,
          slug,
          filename: props.filename,
        });
      }

      // Persist quality preference changes
      if (event === 'settings_change') return; // avoid loop
      if (event === 'conversion_started' && props.quality) {
        Settings.set({ preferredQuality: props.quality });
      }
    };
  }

  // ── Relative time ─────────────────────────────────────────────────────────

  function relTime(ts) {
    const diff = Date.now() - ts;
    if (diff < 60000)    return 'just now';
    if (diff < 3600000)  return Math.round(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.round(diff / 3600000) + 'h ago';
    return Math.round(diff / 86400000) + 'd ago';
  }

  // ── HTML escape (DOM-safe, no server risk) ────────────────────────────────

  function esc(str) {
    const d = document.createElement('span');
    d.textContent = String(str ?? '');
    return d.innerHTML;
  }

  // ── Language Selector ─────────────────────────────────────────────────────

  function initLangSelector() {
    const btn   = document.getElementById('dac-lang-btn');
    const panel = document.getElementById('dac-lang-panel');
    if (!btn || !panel) return;

    btn.addEventListener('click', () => {
      const open = panel.hidden;
      panel.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
    });

    document.addEventListener('click', e => {
      if (!btn.contains(e.target) && !panel.contains(e.target)) {
        panel.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ── Boot ──────────────────────────────────────────────────────────────────

  // Theme must init before DOMContentLoaded to prevent flash
  // (inline script in <head> also handles this as first resort)
  const earlyTheme = Settings.get().theme || 'auto';
  Theme.apply(earlyTheme);
  Theme.current = earlyTheme;

  document.addEventListener('DOMContentLoaded', () => {
    Theme.init();
    Search.init();
    MobileMenu.init();
    initLangSelector();
    initDynamicSections();
    initFavoriteButton();
    hookAnalytics();
    trackPageVisit();
  });

  // Expose on global namespace
  window.DAC = window.DAC || {};
  window.DAC.platform = { Recent, Favorites, History, Settings, Theme, Search };

})();
