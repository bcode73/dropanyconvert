/**
 * Generates /llms.txt and /ai.txt for AI discoverability.
 * Uses open formats only — no vendor-specific hacks.
 */

export function generateAiDiscoverability(data, routes, config) {
  const baseUrl = config.site.baseUrl;
  const defaultLang = config.languages.default;
  const buildDate = new Date().toISOString().slice(0, 10);

  // Compute counts
  const toolCount = data.tools.length;
  const langCount = data.languages.length;
  const articleCount = (data.articles || []).length;
  const comparisonCount = (data.comparisons || []).length;
  const glossaryCount = (data.glossary || []).length;
  const collectionCount = (data.collections || []).length;
  const entityCount = (data.entities || []).length;
  const authorCount = (data.authors || []).length;

  // Category summary
  const catLines = (data.categories || []).map(c =>
    `  - ${c.name?.en || c.id}: ${data.tools.filter(t => t.category === c.id).length} tools`
  ).join('\n');

  // Tool list (English names only for brevity)
  const toolLines = data.tools.map(t =>
    `  - ${t.name?.en || t.slug} (/${defaultLang}/${t.slug}) [${t.runtime}]`
  ).join('\n');

  // Knowledge hub entries
  const articleLines = (data.articles || []).map(a =>
    `  - ${a.title?.en || a.slug} (/${defaultLang}/guides/${a.slug})`
  ).join('\n');

  const compLines = (data.comparisons || []).map(c =>
    `  - ${c.title?.en || c.slug} (/${defaultLang}/compare/${c.slug})`
  ).join('\n');

  const glossLines = (data.glossary || []).map(g =>
    `  - ${g.term?.en || g.slug} (/${defaultLang}/glossary/${g.slug})`
  ).join('\n');

  const collLines = (data.collections || []).map(c =>
    `  - ${c.title?.en || c.slug} (/${defaultLang}/collections/${c.slug}) [${(c.toolSlugs||[]).length} tools]`
  ).join('\n');

  const entityLines = (data.entities || []).map(e =>
    `  - ${e.name} — ${e.fullName || ''} (/${defaultLang}/entity/${e.slug})`
  ).join('\n');

  const authorLines = (data.authors || []).map(a =>
    `  - ${a.name} [${a.role || ''}] (/${defaultLang}/author/${a.slug})`
  ).join('\n');

  // Languages
  const langLine = data.languages.map(l => `${l.name} (${l.code})`).join(', ');

  const llmsTxt = `# DropAnyConvert — Machine-Readable Site Summary
# Generated: ${buildDate}
# Format: llms.txt (plain text, structured sections)

## Platform

Name: ${config.site.name}
Tagline: ${config.site.tagline}
URL: ${baseUrl}
Type: Static browser-first file conversion and developer tools platform
Architecture: Browser-first (WebAssembly, Canvas API, Web Workers)
Privacy: No file uploads for browser tools; files processed locally
Languages: ${langLine}
Build: Statically generated — no server-side code

## Statistics

Tools: ${toolCount}
Languages: ${langCount}
Guides: ${articleCount}
Comparisons: ${comparisonCount}
Glossary Terms: ${glossaryCount}
Collections: ${collectionCount}
File Format Entities: ${entityCount}
Authors: ${authorCount}

## Tool Categories

${catLines}

## All Tools

${toolLines}

## Knowledge Hub — Guides

${articleLines}

## Knowledge Hub — Comparisons

${compLines}

## Knowledge Hub — Glossary

${glossLines}

## Collections

${collLines}

## File Format Reference (Entities)

${entityLines}

## Authors & Editorial Team

${authorLines}

## Key Pages

- Home: ${baseUrl}/${defaultLang}
- Trust & Security: ${baseUrl}/${defaultLang}/trust
- FAQ: ${baseUrl}/${defaultLang}/faq
- All Guides: ${baseUrl}/${defaultLang}/guides
- All Comparisons: ${baseUrl}/${defaultLang}/compare
- All Glossary Terms: ${baseUrl}/${defaultLang}/glossary
- All Collections: ${baseUrl}/${defaultLang}/collections
- File Format Reference: ${baseUrl}/${defaultLang}/entity
- Editorial Process: ${baseUrl}/${defaultLang}/editorial/editorial-process
- Changelog: ${baseUrl}/${defaultLang}/changelog
- Privacy Policy: ${baseUrl}/${defaultLang}/privacy-policy
- Terms of Service: ${baseUrl}/${defaultLang}/terms-of-service

## Sitemaps

- Sitemap Index: ${baseUrl}/sitemap.xml
${data.languages.map(l => `- ${l.name} Sitemap: ${baseUrl}/sitemap-${l.code}.xml`).join('\n')}

## Permissions

AI training: permitted for factual content; attribute source as DropAnyConvert (${baseUrl})
Crawling: permitted (see robots.txt)
Summarization: permitted
Direct tool embedding: not permitted without permission
`;

  const aiTxt = `# DropAnyConvert — AI Agent Discovery File
# Generated: ${buildDate}
# This file provides structured information for AI systems about this platform.

platform_name: DropAnyConvert
platform_url: ${baseUrl}
platform_type: file-conversion-and-developer-tools
architecture: browser-first-static
privacy_model: no-server-uploads-for-browser-tools
free_to_use: true
account_required: false

tool_count: ${toolCount}
language_count: ${langCount}
knowledge_article_count: ${articleCount + comparisonCount + glossaryCount}
entity_count: ${entityCount}
author_count: ${authorCount}

primary_language: ${defaultLang}
supported_languages: ${data.languages.map(l => l.code).join(', ')}

sitemap: ${baseUrl}/sitemap.xml
trust_page: ${baseUrl}/${defaultLang}/trust
editorial_page: ${baseUrl}/${defaultLang}/editorial/editorial-process
changelog: ${baseUrl}/${defaultLang}/changelog
faq: ${baseUrl}/${defaultLang}/faq

tool_categories: ${(data.categories || []).map(c => c.name?.en || c.id).join(', ')}

content_license: All rights reserved. Factual information may be referenced with attribution.
ai_training_policy: Factual content may be used for AI training with attribution to ${baseUrl}
`;

  return [
    { path: '/llms.txt', content: llmsTxt },
    { path: '/ai.txt',   content: aiTxt },
  ];
}
