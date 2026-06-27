/**
 * Phase 22 — API Documentation Validator
 *
 * Validates the generated API ecosystem for consistency.
 * Warnings only — never fails build.
 */

export function validateApiDocs(openApiFile, apiDocPages, data, config) {
  const warnings = [];
  const errors = [];
  const stats = {};

  // Parse the OpenAPI spec
  let spec = null;
  try {
    spec = JSON.parse(openApiFile.content);
  } catch (e) {
    errors.push(`OpenAPI JSON parse failed: ${e.message}`);
    return { errors, warnings, stats };
  }

  // 1. Endpoint uniqueness — operationId must be unique
  const operationIds = new Set();
  const duplicateOps = new Set();
  for (const [, pathItem] of Object.entries(spec.paths || {})) {
    for (const [, op] of Object.entries(pathItem)) {
      if (op.operationId) {
        if (operationIds.has(op.operationId)) {
          duplicateOps.add(op.operationId);
        }
        operationIds.add(op.operationId);
      }
    }
  }
  if (duplicateOps.size > 0) {
    warnings.push(`Duplicate operationIds: ${[...duplicateOps].join(', ')}`);
  }
  stats.operationIds = operationIds.size;

  // 2. Schema references — every $ref must resolve in components.schemas
  const definedSchemas = new Set(Object.keys(spec.components?.schemas || {}));
  const missingSchemas = new Set();
  function checkRefs(obj) {
    if (!obj || typeof obj !== 'object') return;
    if (obj['$ref']) {
      const name = obj['$ref'].replace('#/components/schemas/', '');
      if (!definedSchemas.has(name)) missingSchemas.add(name);
    }
    for (const v of Object.values(obj)) checkRefs(v);
  }
  checkRefs(spec.paths);
  if (missingSchemas.size > 0) {
    warnings.push(`Missing schema refs: ${[...missingSchemas].join(', ')}`);
  }

  // 3. Every tool must have a convert endpoint
  const toolSlugs = new Set(data.tools.map(t => t.slug));
  const specPaths = new Set(Object.keys(spec.paths || {}));
  const missingToolPaths = [];
  for (const slug of toolSlugs) {
    if (!specPaths.has(`/convert/${slug}`)) {
      missingToolPaths.push(slug);
    }
  }
  if (missingToolPaths.length > 0) {
    warnings.push(`Tools missing OpenAPI paths (${missingToolPaths.length}): ${missingToolPaths.slice(0, 5).join(', ')}${missingToolPaths.length > 5 ? '...' : ''}`);
  }

  // 4. Missing examples — each tool endpoint should have a request example
  const missingExamples = [];
  for (const tool of data.tools) {
    const path = spec.paths?.[`/convert/${tool.slug}`];
    const examples = path?.post?.requestBody?.content?.['multipart/form-data']?.examples;
    if (!examples || Object.keys(examples).length === 0) {
      missingExamples.push(tool.slug);
    }
  }
  if (missingExamples.length > 0) {
    warnings.push(`Tool paths missing request examples (${missingExamples.length}): ${missingExamples.slice(0, 3).join(', ')}${missingExamples.length > 3 ? '...' : ''}`);
  }

  // 5. API doc pages — check expected count
  const LANGUAGES = config.languages || ['en', 'es', 'fr', 'de', 'pt'];
  const TOPIC_COUNT = 21;
  const SDK_COUNT = 7;
  const expectedPages = (TOPIC_COUNT + data.tools.length + SDK_COUNT) * LANGUAGES.length;
  const actualPages = apiDocPages.length;
  stats.expectedPages = expectedPages;
  stats.actualPages = actualPages;
  if (actualPages < expectedPages * 0.95) {
    warnings.push(`API doc pages below expected: got ${actualPages}, expected ~${expectedPages}`);
  }

  // 6. Orphan API pages — every /{lang}/api/tools/{slug}/ should map to a real tool
  const orphans = [];
  for (const page of apiDocPages) {
    const m = page.path.match(/^\/[a-z]{2}\/api\/tools\/([^/]+)\/$/);
    if (m && !toolSlugs.has(m[1])) {
      orphans.push(page.path);
    }
  }
  if (orphans.length > 0) {
    warnings.push(`Orphan API tool pages (${orphans.length}): ${orphans.slice(0, 3).join(', ')}`);
  }

  // 7. Missing SDK snippets — sample check: each tool page for 'en' should contain curl block
  const enToolPages = apiDocPages.filter(p => p.path.startsWith('/en/api/tools/'));
  const missingSdk = enToolPages.filter(p => !p.content.includes('curl'));
  if (missingSdk.length > 0) {
    warnings.push(`Tool API pages missing code examples (${missingSdk.length})`);
  }

  // 8. Required management paths
  const requiredPaths = ['/jobs/{jobId}', '/jobs/{jobId}/download', '/usage'];
  for (const rp of requiredPaths) {
    if (!specPaths.has(rp)) {
      warnings.push(`Missing required API management path: ${rp}`);
    }
  }

  // 9. Security scheme defined
  if (!spec.components?.securitySchemes?.apiKey) {
    warnings.push('OpenAPI spec missing apiKey security scheme');
  }

  // 10. All paths include security
  const unsecuredPaths = [];
  for (const [path, item] of Object.entries(spec.paths || {})) {
    for (const [method, op] of Object.entries(item)) {
      if (typeof op === 'object' && !op.security) {
        unsecuredPaths.push(`${method.toUpperCase()} ${path}`);
      }
    }
  }
  if (unsecuredPaths.length > 0) {
    warnings.push(`Paths without explicit security (${unsecuredPaths.length}): ${unsecuredPaths.slice(0, 3).join(', ')}`);
  }

  stats.warnings = warnings.length;
  stats.errors = errors.length;
  stats.toolsCovered = data.tools.length - missingToolPaths.length;
  stats.schemasValid = missingSchemas.size === 0;

  return { errors, warnings, stats };
}
