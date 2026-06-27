/**
 * Auto-generates related content links for each route.
 *
 * Returns a Map<routePath, { relatedTools, guides, comparisons, glossary, ... }>
 *
 * When graph is provided (Phase 20), uses authority-weighted scoring + dynamic quotas.
 * Falls back to legacy scoring when graph is null.
 */

import { scoreCandidatePair, scoreKnowledgeItem } from './authority.js';

// ── Dynamic quota helpers ─────────────────────────────────────────────────────

function relatedQuota(authority) {
  if (authority >= 70) return 12;
  if (authority >= 50) return 10;
  if (authority >= 30) return 8;
  return 6;
}

function knowledgeQuota(authority, type) {
  const base = authority >= 50 ? 4 : 3;
  if (type === 'glossary') return base + 1;
  return base;
}

export async function generateInternalLinks(routes, data, config, graph = null) {
  const links = new Map();

  const toolBySlug = new Map(data.tools.map(t => [t.slug, t]));

  // Build intent index: toolSlug → array of {intent, modifier} for how-to link display
  const intentsByTool = new Map();
  for (const intent of (data.intents || [])) {
    if (!intentsByTool.has(intent.toolSlug)) intentsByTool.set(intent.toolSlug, []);
    for (const modifier of (intent.modifiers || [])) {
      intentsByTool.get(intent.toolSlug).push({ intent, modifier });
    }
  }

  // Build entity lookup once
  const entityBySlug = new Map((data.entities || []).map(e => [e.slug, e]));

  // Build category → tools index to avoid O(N²) same-category scan
  const toolsByCategory = new Map();
  for (const tool of data.tools) {
    if (!toolsByCategory.has(tool.category)) toolsByCategory.set(tool.category, []);
    toolsByCategory.get(tool.category).push(tool);
  }

  // Build format → tools index to avoid repeated intersection checks
  const toolsByMime = new Map();
  for (const tool of data.tools) {
    const mimes = [
      ...tool.inputFormats,
      ...tool.outputFormats.map(f => f.mime),
    ];
    for (const mime of mimes) {
      if (!toolsByMime.has(mime)) toolsByMime.set(mime, []);
      toolsByMime.get(mime).push(tool);
    }
  }

  // Compute ranked candidate list per tool slug — done once, shared across languages
  const rankedCandidates = new Map();

  for (const tool of data.tools) {
    const candidates = [];
    const seen = new Set([tool.slug]);
    const toolAuthority = graph?.nodes?.get(`tool:${tool.slug}`)?.authority ?? 0;
    const quota = relatedQuota(toolAuthority);
    const explicitSlugs = new Set(tool.relatedTools || []);

    // Collect all candidate tools with authority-weighted scoring
    for (const candidate of data.tools) {
      if (seen.has(candidate.slug)) continue;
      const isExplicit = explicitSlugs.has(candidate.slug);

      let score;
      if (graph) {
        score = scoreCandidatePair(graph, tool.slug, candidate.slug, isExplicit ? 40 : 0);
        // Explicit always wins via bonus; category tools naturally rank high via shared cluster/category
      } else {
        // Legacy scoring fallback
        if (isExplicit) score = 100;
        else if (candidate.category === tool.category) score = 50;
        else {
          const toolMimes = new Set([...tool.inputFormats, ...tool.outputFormats.map(f => f.mime)]);
          const candMimes = [...candidate.inputFormats, ...candidate.outputFormats.map(f => f.mime)];
          const overlap = candMimes.filter(m => toolMimes.has(m)).length;
          score = overlap * 10;
        }
      }

      if (score > 0) {
        candidates.push({
          slug: candidate.slug,
          score,
          source: isExplicit ? 'explicit' : (candidate.category === tool.category ? 'category' : 'format'),
          tool: candidate,
        });
        seen.add(candidate.slug);
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    rankedCandidates.set(tool.slug, candidates.slice(0, quota));
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

    const toolAuthority = graph?.nodes?.get(`tool:${tool.slug}`)?.authority ?? 0;
    const guideQuota = knowledgeQuota(toolAuthority, 'article');
    const cmpQuota   = knowledgeQuota(toolAuthority, 'comparison');
    const glossQuota = knowledgeQuota(toolAuthority, 'glossary');

    const guides = articles
      .filter(a =>
        (a.relatedTools || []).includes(tool.slug) ||
        a.category === tool.category
      )
      .map(a => ({
        item: a,
        score: graph
          ? scoreKnowledgeItem(graph, tool.slug, `article:${a.slug}`, (a.relatedTools || []).includes(tool.slug))
          : ((a.relatedTools || []).includes(tool.slug) ? 100 : 50),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, guideQuota)
      .map(({ item: a }) => ({
        slug: a.slug,
        title: a.h1?.[lang] || a.h1?.en || a.title?.[lang] || a.title?.en || a.slug,
        path: `/${lang}/guides/${a.slug}`,
        description: a.description?.[lang] || a.description?.en || '',
      }));

    const relatedComparisons = comparisons
      .filter(c => (c.relatedTools || []).includes(tool.slug))
      .map(c => ({
        item: c,
        score: graph
          ? scoreKnowledgeItem(graph, tool.slug, `comparison:${c.slug}`, true)
          : 100,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, cmpQuota)
      .map(({ item: c }) => ({
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
      .map(g => ({
        item: g,
        score: graph
          ? scoreKnowledgeItem(graph, tool.slug, `glossary:${g.slug}`, (g.relatedTools || []).includes(tool.slug))
          : ((g.relatedTools || []).includes(tool.slug) ? 100 : 50),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, glossQuota)
      .map(({ item: g }) => ({
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

    // Entities: match by tool's input/output MIME types → entity slug
    const toolMimeSet = new Set([
      ...tool.inputFormats,
      ...tool.outputFormats.map(f => f.mime),
    ]);
    const relatedEntities = (data.entities || [])
      .filter(e =>
        (e.relatedTools || []).includes(tool.slug) ||
        (e.mimeTypes || []).some(m => toolMimeSet.has(m))
      )
      .slice(0, 4)
      .map(e => ({
        slug: e.slug,
        name: e.name,
        path: `/${lang}/entity/${e.slug}`,
        description: e.description ? e.description.slice(0, 100) : '',
      }));

    // How-to intent pages for this tool
    const howToGuides = (intentsByTool.get(tool.slug) || []).slice(0, 6).map(({ intent, modifier }) => ({
      slug: `${intent.slug}-${modifier.slug}`,
      title: `${intent.baseTitle?.en || ''} ${modifier.label?.en || ''}`.trim(),
      path: `/${lang}/how-to/${intent.slug}-${modifier.slug}`,
    }));

    links.set(route.path, {
      relatedTools,
      guides,
      comparisons: relatedComparisons,
      glossary: relatedGlossary,
      collections: relatedCollections,
      landings: relatedLandings,
      entities: relatedEntities,
      howToGuides,
    });
  }

  return links;
}
