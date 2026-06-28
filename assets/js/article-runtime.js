/**
 * Article reading experience — progress bar, sticky TOC, copy heading links,
 * share, and back-to-top.
 */
(function () {
  'use strict';

  // ── Reading Progress Bar ────────────────────────────────────────────────
  const progressBar = document.getElementById('dac-progress-bar');
  if (progressBar) {
    function updateProgress() {
      const doc = document.documentElement;
      const scrolled = doc.scrollTop || document.body.scrollTop;
      const total = doc.scrollHeight - doc.clientHeight;
      const pct = total > 0 ? Math.round((scrolled / total) * 100) : 0;
      progressBar.style.width = pct + '%';
      progressBar.parentElement.setAttribute('aria-valuenow', pct);
    }
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  }

  // ── Sticky TOC scroll spy ───────────────────────────────────────────────
  const tocLinks = document.querySelectorAll('.dac-kh-toc__link');
  if (tocLinks.length > 0 && 'IntersectionObserver' in window) {
    const headingIds = Array.from(tocLinks).map(l => l.getAttribute('href')?.slice(1)).filter(Boolean);
    const headings = headingIds.map(id => document.getElementById(id)).filter(Boolean);

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          tocLinks.forEach(l => l.classList.remove('is-active'));
          const active = document.querySelector(`.dac-kh-toc__link[href="#${entry.target.id}"]`);
          if (active) active.classList.add('is-active');
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px' });

    headings.forEach(h => observer.observe(h));
  }

  // ── Copy heading anchor links ───────────────────────────────────────────
  document.querySelectorAll('.dac-kh-section-title[id], .dac-kh-section[id] .dac-kh-section-title').forEach(heading => {
    const section = heading.closest('.dac-kh-section');
    const id = section?.id || heading.id;
    if (!id) return;

    const btn = document.createElement('button');
    btn.className = 'dac-heading-anchor';
    btn.setAttribute('aria-label', 'Copy link to this section');
    btn.title = 'Copy link';
    btn.textContent = '#';
    btn.addEventListener('click', () => {
      const url = location.origin + location.pathname + '#' + id;
      navigator.clipboard?.writeText(url).then(() => {
        btn.textContent = '✓';
        setTimeout(() => { btn.textContent = '#'; }, 1500);
      }).catch(() => {});
    });
    heading.appendChild(btn);
  });

  // ── Back to top ─────────────────────────────────────────────────────────
  const backTop = document.getElementById('dac-back-top');
  if (backTop) {
    backTop.addEventListener('click', e => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ── Share ───────────────────────────────────────────────────────────────
  const shareBtn = document.getElementById('dac-share-btn');
  if (shareBtn) {
    if (navigator.share) {
      shareBtn.addEventListener('click', () => {
        navigator.share({
          title: document.title,
          url: location.href,
        }).catch(() => {});
      });
    } else {
      shareBtn.addEventListener('click', () => {
        navigator.clipboard?.writeText(location.href).then(() => {
          shareBtn.textContent = 'Link copied!';
          setTimeout(() => { shareBtn.textContent = 'Share'; }, 2000);
        }).catch(() => {});
      });
    }
  }
})();
