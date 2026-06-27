/**
 * Phase 23 — Duplicate Content Detector
 *
 * Detects pages with highly similar generated content.
 * Report-only — never fails the build.
 */

// ── Tokeniser ─────────────────────────────────────────────────────────────

function tokenise(text) {
  return new Set(
    String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3)   // skip short stop-words
  );
}

// ── Jaccard similarity ────────────────────────────────────────────────────

function jaccard(setA, setB) {
  if (!setA.size && !setB.size) return 1;
  if (!setA.size || !setB.size) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  return intersection / (setA.size + setB.size - intersection);
}

// ── Main export ───────────────────────────────────────────────────────────

/**
 * @param {Array<{slug, lang, intro, faqText, conclusionText}>} items
 * @returns {{ warnings: string[], stats: object }}
 */
export function detectDuplicates(items) {
  const warnings = [];
  const THRESHOLD = 0.80;

  // Group by lang + category
  const groups = new Map();
  for (const item of items) {
    const key = `${item.lang}:${item.category}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  let pairsChecked = 0;
  let introDupes = 0;
  let faqDupes   = 0;
  let concDupes  = 0;

  for (const [groupKey, group] of groups) {
    const [lang, category] = groupKey.split(':');
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];
        pairsChecked++;

        const introSim = jaccard(tokenise(a.intro), tokenise(b.intro));
        if (introSim >= THRESHOLD) {
          introDupes++;
          if (warnings.length < 30) {
            warnings.push(
              `[${lang}/${category}] Intro similarity ${(introSim * 100).toFixed(0)}% between "${a.slug}" and "${b.slug}"`
            );
          }
        }

        const faqSim = jaccard(tokenise(a.faqText), tokenise(b.faqText));
        if (faqSim >= THRESHOLD) {
          faqDupes++;
          if (warnings.length < 30) {
            warnings.push(
              `[${lang}/${category}] FAQ similarity ${(faqSim * 100).toFixed(0)}% between "${a.slug}" and "${b.slug}"`
            );
          }
        }

        const concSim = jaccard(tokenise(a.conclusionText), tokenise(b.conclusionText));
        if (concSim >= THRESHOLD) {
          concDupes++;
          if (warnings.length < 30) {
            warnings.push(
              `[${lang}/${category}] Conclusion similarity ${(concSim * 100).toFixed(0)}% between "${a.slug}" and "${b.slug}"`
            );
          }
        }
      }
    }
  }

  if (warnings.length >= 30) {
    warnings.push(`... and more (capped at 30). Run with --verbose for full list.`);
  }

  const stats = {
    pairsChecked,
    introDuplicatePairs: introDupes,
    faqDuplicatePairs:   faqDupes,
    conclusionDuplicatePairs: concDupes,
    totalDuplicatePairs: introDupes + faqDupes + concDupes,
  };

  return { warnings, stats };
}

/**
 * Builds the input array for detectDuplicates from enrichments.
 * Call once per language to keep comparisons within-language.
 */
export function buildDuplicateInputs(tools, enrichments, lang) {
  return tools.map(tool => {
    const e = enrichments.get(tool.slug) || {};
    const faqs = e.faqs || [];
    return {
      slug:           tool.slug,
      lang,
      category:       tool.category,
      intro:          e.variants?.intro || '',
      faqText:        faqs.map(f => f.a || '').join(' '),
      conclusionText: e.variants?.conclusion || '',
    };
  });
}
