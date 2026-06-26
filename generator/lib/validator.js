/**
 * Validates loaded data for schema conformance and referential integrity.
 * Returns { errors: string[], warnings: string[] }.
 */
export async function validateData(data, config) {
  const errors = [];
  const warnings = [];

  const categoryIds = new Set(data.categories.map(c => c.id));
  const languageCodes = new Set(data.languages.map(l => l.code));
  const enabledLangs = data.languages.map(l => l.code);

  // Track slugs and primary keywords for uniqueness
  const slugsSeen = new Map();
  const toolIdsSeen = new Map();
  const primaryKeywordsSeen = new Map();

  for (const tool of data.tools) {
    // Required fields
    const required = ['schemaVersion', 'toolId', 'slug', 'name', 'category', 'engine', 'engineFn',
      'inputFormats', 'outputFormats', 'batch', 'runtime', 'seo', 'faq', 'capabilities'];
    for (const field of required) {
      if (tool[field] === undefined) {
        errors.push(`Tool "${tool.toolId || tool.slug || '(unknown)'}" is missing required field: ${field}`);
      }
    }

    if (!tool.toolId) continue;

    // Unique toolId
    if (toolIdsSeen.has(tool.toolId)) {
      errors.push(`Duplicate toolId: "${tool.toolId}" (also in ${toolIdsSeen.get(tool.toolId)})`);
    } else {
      toolIdsSeen.set(tool.toolId, tool.slug);
    }

    // Unique slug
    if (slugsSeen.has(tool.slug)) {
      errors.push(`Duplicate slug: "${tool.slug}" (toolId: ${tool.toolId})`);
    } else {
      slugsSeen.set(tool.slug, tool.toolId);
    }

    // Category reference
    if (tool.category && !categoryIds.has(tool.category)) {
      errors.push(`Tool "${tool.toolId}" references unknown category: "${tool.category}"`);
    }

    // Runtime value
    if (tool.runtime && !['browser', 'hybrid', 'cloud'].includes(tool.runtime)) {
      errors.push(`Tool "${tool.toolId}" has invalid runtime: "${tool.runtime}"`);
    }

    // SEO
    if (tool.seo) {
      if (!tool.seo.primaryKeyword) {
        errors.push(`Tool "${tool.toolId}" is missing seo.primaryKeyword`);
      } else {
        if (primaryKeywordsSeen.has(tool.seo.primaryKeyword)) {
          warnings.push(`Duplicate primaryKeyword "${tool.seo.primaryKeyword}" in tools "${tool.toolId}" and "${primaryKeywordsSeen.get(tool.seo.primaryKeyword)}"`);
        } else {
          primaryKeywordsSeen.set(tool.seo.primaryKeyword, tool.toolId);
        }
      }
      if (!tool.seo.title?.en) {
        errors.push(`Tool "${tool.toolId}" is missing seo.title.en`);
      }
      if (!tool.seo.description?.en) {
        errors.push(`Tool "${tool.toolId}" is missing seo.description.en`);
      }
    }

    // FAQ
    if (tool.faq && tool.faq.length === 0) {
      warnings.push(`Tool "${tool.toolId}" has an empty faq array`);
    }

    // Related tools (warn if slug not known yet — cross-checked after all tools loaded)
    if (tool.relatedTools) {
      for (const related of tool.relatedTools) {
        if (related === tool.slug) {
          errors.push(`Tool "${tool.toolId}" lists itself in relatedTools`);
        }
      }
    }
  }

  // Cross-check relatedTools references after all tools loaded
  for (const tool of data.tools) {
    if (tool.relatedTools) {
      for (const related of tool.relatedTools) {
        if (!slugsSeen.has(related)) {
          warnings.push(`Tool "${tool.toolId}" references unknown relatedTool slug: "${related}"`);
        }
      }
    }
  }

  // Language config consistency
  const configLangs = new Set(config.languages.supported);
  for (const lang of data.languages) {
    if (!configLangs.has(lang.code)) {
      warnings.push(`Language "${lang.code}" is enabled in languages.json but not listed in config.json supported array`);
    }
  }

  return { errors, warnings };
}
