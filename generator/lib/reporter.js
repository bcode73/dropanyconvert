import { writeFile } from 'fs/promises';
import path from 'path';

/**
 * Generates a build report and writes it to dist/build-report.json.
 */
export async function generateReport({ data, registry, routes, pages, sitemaps, validation, emitResult, elapsed, config }) {
  const toolCount = data.tools.length;
  const langCount = data.languages.length;
  const pageCount = pages.length;
  const routeCount = routes.length;

  const report = {
    timestamp: new Date().toISOString(),
    elapsed_ms: elapsed,
    tools: toolCount,
    languages: langCount,
    routes: routeCount,
    pages_generated: pageCount,
    sitemaps_generated: sitemaps.length,
    files_emitted: emitResult.fileCount,
    output_size_kb: emitResult.sizeKb,
    warnings: validation.warnings,
    errors: validation.errors,
    toolList: data.tools.map(t => ({
      id: t.toolId,
      slug: t.slug,
      category: t.category,
      runtime: t.runtime,
      primaryKeyword: t.seo?.primaryKeyword,
    })),
  };

  const summary = [
    `  Pages:    ${pageCount}`,
    `  Tools:    ${toolCount}`,
    `  Languages:${langCount}`,
    `  Sitemaps: ${sitemaps.length}`,
    `  Output:   ${emitResult.sizeKb} KB`,
    `  Warnings: ${validation.warnings.length}`,
  ].join('\n');

  // Write report to project root — never into dist/ (would be publicly served)
  try {
    await writeFile(path.join(config._root, 'build-report.json'), JSON.stringify(report, null, 2), 'utf8');
  } catch {
    // Non-fatal
  }

  return { report, summary };
}
