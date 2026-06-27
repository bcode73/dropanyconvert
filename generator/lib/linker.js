/**
 * Auto-generates related content links for each route.
 *
 * Returns a Map<routePath, { relatedTools, guides, comparisons, glossary }>
 *
 * relatedTools priority:
 *   1. Explicit relatedTools from tool definition (score 100)
 *   2. Same category tools (score 50)
 *   3. Format similarity (shared MIME types × 10)
 *
 * guides / comparisons / glossary matched by:
 *   - slug present in knowledge item's relatedTools array, OR
 *   - category matches
 */

const MAX_RELATED = 8;
const MAX_GUIDES  = 3;
const MAX_CMP     = 3;
const MAX_GLOSS   = 4;

export async function generateInternalLinks(routes, data, config) {
  const links = new Map();

  const toolBySlug = new Map(data.tools.map(t => [t.slug, t]));

  // Compute ranked candidate list per tool slug — done once, shared across languages
  const rankedCandidates = new Map();

  for (const tool of data.tools) {
    const candidates = [];
    const seen = new Set([tool.slug]);

    // 1. Explicit overrides
    if (tool.relatedTools) {
      for (const slug of tool.relatedTools) {
        if (seen.has(slug)) continue;
        const relTool = toolBySlug.get(slug);
        if (relTool) {
          candidates.push({ slug, score: 100, source: 'explicit', tool: relTool });
          seen.add(slug);
        }
      }
    }

    // 2. Same category
    for (const candidate of data.tools) {
      if (seen.has(candidate.slug)) continue;
      if (candidate.category === tool.category) {
        candidates.push({ slug: candidate.slug, score: 50, source: 'category', tool: candidate });
        seen.add(candidate.slug);
      }
    }

    // 3. Format similarity
    const toolFormats = new Set([
      ...tool.inputFormats,
      ...tool.outputFormats.map(f => f.mime),
    ]);
    for (const candidate of data.tools) {
      if (seen.has(candidate.slug)) continue;
      const candidateFormats = new Set([
        ...candidate.inputFormats,
        ...candidate.outputFormats.map(f => f.mime),
      ]);
      const intersection = [...toolFormats].filter(f => candidateFormats.has(f)).length;
      if (intersection > 0) {
        candidates.push({ slug: candidate.slug, score: intersection * 10, source: 'format', tool: candidate });
        seen.add(candidate.slug);
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    rankedCandidates.set(tool.slug, candidates.slice(0, MAX_RELATED));
  }

  // Build knowledge indices for fast lookup
  const articles    = data.articles    || [];
  const comparisons = data.comparisons || [];
  const glossary    = data.glossary    || [];
  const collections = data.collections || [];
  const landings    = data.landings    || [];

  const MAX_COLL    = 3;
  const MAX_LANDING = 2;

  // Resolve to display-ready objects per route (language-specific names/paths)
  const toolRoutes = routes.filter(r => r.type === 'tool');
  for (const route of toolRoutes) {
    const lang = route.lang;
    const tool = route.tool;
    const candidates = rankedCandidates.get(tool.slug) ?? [];

    const relatedTools = candidates.map(r => ({
      slug: r.tool.slug,
      name: r.tool.name[lang] || r.tool.name.en,
      path: `/${lang}/${r.tool.slug}`,
      tagline: r.tool.tagline?.[lang] || r.tool.tagline?.en || '',
      source: r.source,
    }));

    const guides = articles
      .filter(a =>
        (a.relatedTools || []).includes(tool.slug) ||
        a.category === tool.category
      )
      .slice(0, MAX_GUIDES)
      .map(a => ({
        slug: a.slug,
        title: a.h1?.[lang] || a.h1?.en || a.title?.[lang] || a.title?.en || a.slug,
        path: `/${lang}/guides/${a.slug}`,
        description: a.description?.[lang] || a.description?.en || '',
      }));

    const relatedComparisons = comparisons
      .filter(c =>
        (c.relatedTools || []).includes(tool.slug)
      )
      .slice(0, MAX_CMP)
      .map(c => ({
        slug: c.slug,
        title: c.h1?.[lang] || c.h1?.en || `${c.subjectA} vs ${c.subjectB}`,
        path: `/${lang}/compare/${c.slug}`,
        description: c.description?.[lang] || c.description?.en || '',
      }));

    const relatedGlossary = glossary
      .filter(g =>
        (g.relatedTools || []).includes(tool.slug) ||
        g.category === tool.category
      )
      .slice(0, MAX_GLOSS)
      .map(g => ({
        slug: g.slug,
        term: g.term?.[lang] || g.term?.en || g.slug,
        path: `/${lang}/glossary/${g.slug}`,
        shortDef: g.shortDef?.[lang] || g.shortDef?.en || '',
      }));

    const relatedCollections = collections
      .filter(c => (c.toolSlugs || []).includes(tool.slug))
      .slice(0, MAX_COLL)
      .map(c => ({
        slug: c.slug,
        title: c.title?.[lang] || c.title?.en || c.slug,
        path: `/${lang}/collections/${c.slug}`,
        description: c.description?.[lang] || c.description?.en || '',
      }));

    const relatedLandings = landings
      .filter(l => (l.toolSlugs || []).includes(tool.slug))
      .slice(0, MAX_LANDING)
      .map(l => ({
        slug: l.slug,
        title: l.h1?.[lang] || l.h1?.en || l.slug,
        path: `/${lang}/for/${l.slug}`,
        description: l.description?.[lang] || l.description?.en || '',
      }));

    links.set(route.path, {
      relatedTools,
      guides,
      comparisons: relatedComparisons,
      glossary: relatedGlossary,
      collections: relatedCollections,
      landings: relatedLandings,
    });
  }

  return links;
}
