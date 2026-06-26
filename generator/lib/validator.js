import { readFile } from 'fs/promises';
import path from 'path';
import { validate } from './schema-validator.js';

/**
 * Validates loaded data for schema conformance and referential integrity.
 * Returns { errors: string[], warnings: string[] }.
 */
export async function validateData(data, config) {
  const errors = [];
  const warnings = [];

  // Load and parse the canonical tool schema
  const schemaPath = path.join(config._dataDir, 'tool.schema.json');
  const toolSchema = JSON.parse(await readFile(schemaPath, 'utf8'));

  // Extract the capabilities enum from the schema for runtime validation
  const capabilitiesEnum = new Set(
    toolSchema.properties?.capabilities?.items?.enum ?? []
  );

  const categoryIds = new Set(data.categories.map(c => c.id));

  // Track slugs and primary keywords for uniqueness
  const slugsSeen = new Map();
  const toolIdsSeen = new Map();
  const primaryKeywordsSeen = new Map();

  for (const tool of data.tools) {
    const toolLabel = tool.toolId || tool.slug || '(unknown)';

    // Full JSON Schema validation
    const schemaErrors = validate(toolSchema, tool, `tool:${toolLabel}`);
    for (const e of schemaErrors) {
      errors.push(e);
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

    // Category reference (belt-and-suspenders — schema enum handles it too)
    if (tool.category && !categoryIds.has(tool.category)) {
      errors.push(`Tool "${tool.toolId}" references unknown category: "${tool.category}"`);
    }

    // Capabilities against schema enum
    if (Array.isArray(tool.capabilities) && capabilitiesEnum.size > 0) {
      for (const cap of tool.capabilities) {
        if (!capabilitiesEnum.has(cap)) {
          errors.push(`Tool "${tool.toolId}" has unknown capability: "${cap}". Valid values: [${[...capabilitiesEnum].join(', ')}]`);
        }
      }
    }

    // SEO primary keyword uniqueness
    if (tool.seo?.primaryKeyword) {
      if (primaryKeywordsSeen.has(tool.seo.primaryKeyword)) {
        warnings.push(`Duplicate primaryKeyword "${tool.seo.primaryKeyword}" in tools "${tool.toolId}" and "${primaryKeywordsSeen.get(tool.seo.primaryKeyword)}"`);
      } else {
        primaryKeywordsSeen.set(tool.seo.primaryKeyword, tool.toolId);
      }
    }

    // FAQ non-empty (schema enforces minItems:1 already, but give a clearer message)
    if (tool.faq && tool.faq.length === 0) {
      warnings.push(`Tool "${tool.toolId}" has an empty faq array`);
    }

    // Self-reference in relatedTools
    if (tool.relatedTools) {
      for (const related of tool.relatedTools) {
        if (related === tool.slug) {
          errors.push(`Tool "${tool.toolId}" lists itself in relatedTools`);
        }
      }
    }
  }

  // Cross-check relatedTools references
  for (const tool of data.tools) {
    if (tool.relatedTools) {
      for (const related of tool.relatedTools) {
        if (!slugsSeen.has(related)) {
          warnings.push(`Tool "${tool.toolId}" references unknown relatedTool slug: "${related}"`);
        }
      }
    }
  }

  // Validate engineFn against actual engine exports
  await validateEngineFunctions(data.tools, config, errors);

  // Language config consistency
  const configLangs = new Set(config.languages.supported);
  for (const lang of data.languages) {
    if (!configLangs.has(lang.code)) {
      warnings.push(`Language "${lang.code}" is enabled in languages.json but not listed in config.json supported array`);
    }
  }

  return { errors, warnings };
}

/**
 * Reads each engine's source file and checks that the referenced engineFn
 * is actually exported. Uses static analysis (regex) — no import() needed.
 */
async function validateEngineFunctions(tools, config, errors) {
  const enginesRoot = path.join(config._root, 'engines');
  const checked = new Map(); // engineDir → Set<exportedFnName>

  for (const tool of tools) {
    if (!tool.engine || !tool.engineFn) continue;

    if (!checked.has(tool.engine)) {
      const src = path.join(enginesRoot, tool.engine, 'index.js');
      try {
        const code = await readFile(src, 'utf8');
        // Match: export async function foo, export function foo, export { foo }
        const names = new Set();
        for (const m of code.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)) {
          names.add(m[1]);
        }
        for (const m of code.matchAll(/export\s*\{([^}]+)\}/g)) {
          for (const name of m[1].split(',')) {
            names.add(name.trim().split(/\s+as\s+/).pop().trim());
          }
        }
        checked.set(tool.engine, names);
      } catch {
        errors.push(`Engine "${tool.engine}" has no index.js at engines/${tool.engine}/index.js`);
        checked.set(tool.engine, new Set());
      }
    }

    const exports = checked.get(tool.engine);
    if (exports && !exports.has(tool.engineFn)) {
      errors.push(
        `Tool "${tool.toolId}" references engineFn "${tool.engineFn}" which is not exported by engine "${tool.engine}". ` +
        `Exported functions: [${[...exports].join(', ')}]`
      );
    }
  }
}
