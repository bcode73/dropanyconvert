/**
 * Auto-generates related tool links for each route.
 *
 * Priority order:
 *   1. Explicit relatedTools from tool definition (by slug)
 *   2. Same category tools (by category match)
 *   3. Format similarity (shared input/output format strings)
 *
 * Returns a Map<routePath, RelatedTool[]> limited to MAX_RELATED tools per page.
 */

const MAX_RELATED = 8;

export async function generateInternalLinks(routes, data, config) {
  const links = new Map();
  const toolRoutes = routes.filter(r => r.type === 'tool');

  // Index tools by slug for quick lookup
  const toolBySlug = new Map(data.tools.map(t => [t.slug, t]));

  for (const route of toolRoutes) {
    const tool = route.tool;
    const lang = route.lang;
    const related = [];
    const seen = new Set([tool.slug]);

    // 1. Explicit overrides
    if (tool.relatedTools) {
      for (const slug of tool.relatedTools) {
        if (seen.has(slug)) continue;
        const relTool = toolBySlug.get(slug);
        if (relTool) {
          related.push({ slug, score: 100, source: 'explicit', tool: relTool });
          seen.add(slug);
        }
      }
    }

    // 2. Same category
    for (const candidate of data.tools) {
      if (seen.has(candidate.slug)) continue;
      if (candidate.category === tool.category) {
        related.push({ slug: candidate.slug, score: 50, source: 'category', tool: candidate });
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
        related.push({ slug: candidate.slug, score: intersection * 10, source: 'format', tool: candidate });
        seen.add(candidate.slug);
      }
    }

    // Sort by score desc, cap at MAX_RELATED
    related.sort((a, b) => b.score - a.score);
    const capped = related.slice(0, MAX_RELATED);

    // Resolve to display-ready objects
    const resolved = capped.map(r => ({
      slug: r.tool.slug,
      name: r.tool.name[lang] || r.tool.name.en,
      path: `/${lang}/${r.tool.slug}`,
      tagline: r.tool.tagline?.[lang] || r.tool.tagline?.en || '',
      source: r.source,
    }));

    links.set(route.path, resolved);
  }

  return links;
}
