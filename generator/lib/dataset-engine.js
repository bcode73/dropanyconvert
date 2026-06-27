/**
 * Phase 24 — Dataset Engine, Research Center & Future AI Training Foundation
 *
 * Builds structured datasets from existing tool definitions.
 * All data is derived from tool JSON files — no hardcoded page counts or external sources.
 * Emits static JSON files consumed by pages and future search/AI systems.
 */

// ── PART 1: Format Specification Database ────────────────────────────────────

const FORMAT_SPECS = {
  'image/jpeg': {
    name: 'JPEG',
    fullName: 'Joint Photographic Experts Group',
    extension: 'jpg',
    aliases: ['jpg', 'jpeg', 'jpe', 'jfif'],
    category: 'image',
    creator: 'Joint Photographic Experts Group (JPEG committee)',
    firstRelease: 1992,
    latestVersion: 'ISO/IEC 10918-1:1994',
    specification: 'https://www.iso.org/standard/18902.html',
    standard: 'open',
    compression: 'lossy',
    transparency: false,
    animation: false,
    colorDepth: '24-bit RGB',
    colorSpaces: ['sRGB', 'CMYK', 'Grayscale'],
    metadataSupport: true,
    metadataFormats: ['EXIF', 'IPTC', 'XMP'],
    browserSupport: 'full',
    typicalSizeRange: '50 KB – 5 MB',
    commonUseCases: ['Photography', 'Product images', 'Social media photos', 'Email attachments'],
    limitations: ['No transparency', 'Quality degrades with each re-save', 'Not ideal for text or line art'],
    alternatives: ['image/png', 'image/webp', 'image/avif'],
    maxColorDepth: 24,
    dpi: 'Variable (72–600+)',
  },
  'image/png': {
    name: 'PNG',
    fullName: 'Portable Network Graphics',
    extension: 'png',
    aliases: ['png'],
    category: 'image',
    creator: 'PNG Development Group',
    firstRelease: 1996,
    latestVersion: 'ISO/IEC 15948:2004',
    specification: 'https://www.w3.org/TR/PNG/',
    standard: 'open',
    compression: 'lossless',
    transparency: true,
    animation: false,
    colorDepth: '8/16/24/32-bit',
    colorSpaces: ['sRGB', 'Grayscale', 'Indexed'],
    metadataSupport: true,
    metadataFormats: ['tEXt chunks', 'EXIF via zTXt'],
    browserSupport: 'full',
    typicalSizeRange: '10 KB – 20 MB',
    commonUseCases: ['Screenshots', 'Logos', 'Transparent graphics', 'Icons', 'Diagrams'],
    limitations: ['Larger file sizes than JPG for photos', 'No animation (use APNG or GIF)'],
    alternatives: ['image/webp', 'image/avif', 'image/jpeg'],
    maxColorDepth: 48,
    dpi: 'Variable',
  },
  'image/webp': {
    name: 'WebP',
    fullName: 'Web Picture format',
    extension: 'webp',
    aliases: ['webp'],
    category: 'image',
    creator: 'Google',
    firstRelease: 2010,
    latestVersion: 'Libwebp 1.3',
    specification: 'https://developers.google.com/speed/webp',
    standard: 'open',
    compression: 'both',
    transparency: true,
    animation: true,
    colorDepth: '24-bit + 8-bit alpha',
    colorSpaces: ['sRGB'],
    metadataSupport: true,
    metadataFormats: ['EXIF', 'XMP', 'ICC'],
    browserSupport: 'full',
    typicalSizeRange: '5 KB – 3 MB',
    commonUseCases: ['Web page images', 'App assets', 'Optimised photos', 'Animated banners'],
    limitations: ['Limited support in older software', 'Not ideal for print workflows'],
    alternatives: ['image/avif', 'image/jpeg', 'image/png'],
    maxColorDepth: 24,
    dpi: 'Variable',
  },
  'image/avif': {
    name: 'AVIF',
    fullName: 'AV1 Image File Format',
    extension: 'avif',
    aliases: ['avif'],
    category: 'image',
    creator: 'Alliance for Open Media (AOM)',
    firstRelease: 2019,
    latestVersion: 'AVIF 1.0.0 (2019)',
    specification: 'https://aomediacodec.github.io/av1-avif/',
    standard: 'open',
    compression: 'both',
    transparency: true,
    animation: true,
    colorDepth: '10/12-bit HDR capable',
    colorSpaces: ['sRGB', 'P3', 'Rec. 2020', 'HDR'],
    metadataSupport: true,
    metadataFormats: ['EXIF', 'XMP', 'ICC'],
    browserSupport: 'partial',
    typicalSizeRange: '3 KB – 1 MB',
    commonUseCases: ['Next-gen web images', 'Hero images', 'HDR photography', 'Streaming thumbnails'],
    limitations: ['Slow encoding', 'Limited support in older browsers (pre-2021)', 'Poor Photoshop support'],
    alternatives: ['image/webp', 'image/jpeg', 'image/png'],
    maxColorDepth: 12,
    dpi: 'Variable',
  },
  'image/gif': {
    name: 'GIF',
    fullName: 'Graphics Interchange Format',
    extension: 'gif',
    aliases: ['gif'],
    category: 'image',
    creator: 'CompuServe',
    firstRelease: 1987,
    latestVersion: 'GIF89a (1989)',
    specification: 'https://www.w3.org/Graphics/GIF/spec-gif89a.txt',
    standard: 'open',
    compression: 'lossless',
    transparency: true,
    animation: true,
    colorDepth: '8-bit (256 colours max)',
    colorSpaces: ['Indexed'],
    metadataSupport: false,
    metadataFormats: [],
    browserSupport: 'full',
    typicalSizeRange: '10 KB – 20 MB',
    commonUseCases: ['Animated stickers', 'Memes', 'Loading spinners', 'Simple logos'],
    limitations: ['Only 256 colours', 'Dithering artefacts', 'Large animated file sizes'],
    alternatives: ['image/webp', 'image/avif', 'image/png'],
    maxColorDepth: 8,
    dpi: '72 (screen only)',
  },
  'image/svg+xml': {
    name: 'SVG',
    fullName: 'Scalable Vector Graphics',
    extension: 'svg',
    aliases: ['svg', 'svgz'],
    category: 'image',
    creator: 'World Wide Web Consortium (W3C)',
    firstRelease: 1999,
    latestVersion: 'SVG 2 (W3C Candidate Recommendation)',
    specification: 'https://www.w3.org/TR/SVG2/',
    standard: 'open',
    compression: 'lossless',
    transparency: true,
    animation: true,
    colorDepth: 'Unlimited (vector)',
    colorSpaces: ['sRGB', 'HSL', 'Named colours'],
    metadataSupport: true,
    metadataFormats: ['Embedded XML metadata', 'Dublin Core', 'RDF'],
    browserSupport: 'full',
    typicalSizeRange: '1 KB – 5 MB',
    commonUseCases: ['Logos', 'Icons', 'Illustrations', 'Data visualisations', 'UI graphics'],
    limitations: ['Complex SVGs can be slow to render', 'Raster images must be embedded as base64'],
    alternatives: ['image/png', 'image/webp'],
    maxColorDepth: null,
    dpi: 'Resolution-independent',
  },
  'image/tiff': {
    name: 'TIFF',
    fullName: 'Tagged Image File Format',
    extension: 'tiff',
    aliases: ['tif', 'tiff'],
    category: 'image',
    creator: 'Aldus Corporation (now Adobe)',
    firstRelease: 1986,
    latestVersion: 'TIFF 6.0 (1992)',
    specification: 'https://www.itu.int/itudoc/itu-t/com16/tiff-fx/docs/tiff6.pdf',
    standard: 'open',
    compression: 'both',
    transparency: true,
    animation: false,
    colorDepth: '8/16/32/64-bit',
    colorSpaces: ['sRGB', 'CMYK', 'LAB', 'Grayscale', 'YCbCr'],
    metadataSupport: true,
    metadataFormats: ['EXIF', 'IPTC', 'XMP', 'ICC'],
    browserSupport: 'none',
    typicalSizeRange: '1 MB – 500 MB',
    commonUseCases: ['Print publishing', 'Archival scanning', 'Medical imaging', 'Professional photography'],
    limitations: ['Not supported in browsers', 'Very large file sizes', 'Limited web tool support'],
    alternatives: ['image/png', 'image/jpeg'],
    maxColorDepth: 64,
    dpi: 'Variable (300–1200 for print)',
  },
  'image/bmp': {
    name: 'BMP',
    fullName: 'Bitmap Image File',
    extension: 'bmp',
    aliases: ['bmp', 'dib'],
    category: 'image',
    creator: 'Microsoft',
    firstRelease: 1988,
    latestVersion: 'BMP v5 (Windows NT 5.x)',
    specification: 'https://docs.microsoft.com/en-us/windows/win32/gdi/bitmap-storage',
    standard: 'open',
    compression: 'none',
    transparency: true,
    animation: false,
    colorDepth: '1/4/8/16/24/32-bit',
    colorSpaces: ['sRGB'],
    metadataSupport: false,
    metadataFormats: [],
    browserSupport: 'partial',
    typicalSizeRange: '100 KB – 50 MB',
    commonUseCases: ['Windows system graphics', 'Legacy applications', 'Raw pixel storage'],
    limitations: ['No compression — very large files', 'Not web-compatible', 'Poor software support outside Windows'],
    alternatives: ['image/png', 'image/jpeg'],
    maxColorDepth: 32,
    dpi: 'Variable',
  },
  'application/pdf': {
    name: 'PDF',
    fullName: 'Portable Document Format',
    extension: 'pdf',
    aliases: ['pdf'],
    category: 'document',
    creator: 'Adobe Systems',
    firstRelease: 1993,
    latestVersion: 'PDF 2.0 (ISO 32000-2:2020)',
    specification: 'https://www.iso.org/standard/75839.html',
    standard: 'open',
    compression: 'both',
    transparency: true,
    animation: false,
    colorDepth: 'Unlimited',
    colorSpaces: ['sRGB', 'CMYK', 'LAB', 'Grayscale', 'Spot colours'],
    metadataSupport: true,
    metadataFormats: ['XMP', 'DocInfo dictionary'],
    browserSupport: 'full',
    typicalSizeRange: '50 KB – 500 MB',
    commonUseCases: ['Contracts', 'Invoices', 'Ebooks', 'Forms', 'Reports', 'Presentations'],
    limitations: ['Difficult to edit without specialised software', 'Can embed active content (security risk)'],
    alternatives: ['text/plain', 'application/xml'],
    maxColorDepth: null,
    dpi: 'Variable (72–1200)',
  },
  'application/json': {
    name: 'JSON',
    fullName: 'JavaScript Object Notation',
    extension: 'json',
    aliases: ['json'],
    category: 'data',
    creator: 'Douglas Crockford',
    firstRelease: 2001,
    latestVersion: 'RFC 8259 (2017)',
    specification: 'https://www.rfc-editor.org/rfc/rfc8259',
    standard: 'open',
    compression: 'none',
    transparency: false,
    animation: false,
    colorDepth: null,
    colorSpaces: [],
    metadataSupport: false,
    metadataFormats: [],
    browserSupport: 'full',
    typicalSizeRange: '1 KB – 100 MB',
    commonUseCases: ['REST API responses', 'Configuration files', 'Data exchange', 'NoSQL documents'],
    limitations: ['No comments', 'No trailing commas', 'Numbers have precision limits', 'No binary data support'],
    alternatives: ['application/xml', 'text/yaml', 'text/csv'],
    maxColorDepth: null,
    dpi: null,
  },
  'application/xml': {
    name: 'XML',
    fullName: 'Extensible Markup Language',
    extension: 'xml',
    aliases: ['xml', 'xhtml', 'xsl', 'xsd'],
    category: 'data',
    creator: 'World Wide Web Consortium (W3C)',
    firstRelease: 1998,
    latestVersion: 'XML 1.1 (2006)',
    specification: 'https://www.w3.org/TR/xml/',
    standard: 'open',
    compression: 'none',
    transparency: false,
    animation: false,
    colorDepth: null,
    colorSpaces: [],
    metadataSupport: true,
    metadataFormats: ['Embedded attributes', 'Schema definitions'],
    browserSupport: 'full',
    typicalSizeRange: '1 KB – 500 MB',
    commonUseCases: ['SOAP APIs', 'RSS/Atom feeds', 'Config files (Maven, Spring, Android)', 'Document markup'],
    limitations: ['Verbose syntax', 'Slower parsing than JSON', 'More complex tooling'],
    alternatives: ['application/json', 'text/yaml'],
    maxColorDepth: null,
    dpi: null,
  },
  'text/csv': {
    name: 'CSV',
    fullName: 'Comma-Separated Values',
    extension: 'csv',
    aliases: ['csv', 'tsv'],
    category: 'data',
    creator: 'Multiple (informal standard)',
    firstRelease: 1972,
    latestVersion: 'RFC 4180 (2005)',
    specification: 'https://www.rfc-editor.org/rfc/rfc4180',
    standard: 'open',
    compression: 'none',
    transparency: false,
    animation: false,
    colorDepth: null,
    colorSpaces: [],
    metadataSupport: false,
    metadataFormats: [],
    browserSupport: 'full',
    typicalSizeRange: '1 KB – 500 MB',
    commonUseCases: ['Spreadsheet data', 'Database exports', 'Analytics reports', 'Data pipelines'],
    limitations: ['No data types', 'No schema', 'Encoding inconsistencies', 'No nested data'],
    alternatives: ['application/json', 'application/xml'],
    maxColorDepth: null,
    dpi: null,
  },
  'text/plain': {
    name: 'TXT',
    fullName: 'Plain Text',
    extension: 'txt',
    aliases: ['txt', 'text'],
    category: 'text',
    creator: 'Multiple',
    firstRelease: 1963,
    latestVersion: 'UTF-8 (RFC 3629, 2003)',
    specification: 'https://www.rfc-editor.org/rfc/rfc3629',
    standard: 'open',
    compression: 'none',
    transparency: false,
    animation: false,
    colorDepth: null,
    colorSpaces: [],
    metadataSupport: false,
    metadataFormats: [],
    browserSupport: 'full',
    typicalSizeRange: '1 B – 100 MB',
    commonUseCases: ['Log files', 'Notes', 'Code snippets', 'Simple data output'],
    limitations: ['No formatting', 'No structure', 'Encoding ambiguity'],
    alternatives: ['text/markdown', 'application/json'],
    maxColorDepth: null,
    dpi: null,
  },
  'text/markdown': {
    name: 'Markdown',
    fullName: 'Markdown (text/markdown)',
    extension: 'md',
    aliases: ['md', 'markdown', 'mkd'],
    category: 'text',
    creator: 'John Gruber & Aaron Swartz',
    firstRelease: 2004,
    latestVersion: 'CommonMark 0.30 (2021)',
    specification: 'https://spec.commonmark.org/',
    standard: 'open',
    compression: 'none',
    transparency: false,
    animation: false,
    colorDepth: null,
    colorSpaces: [],
    metadataSupport: true,
    metadataFormats: ['YAML front matter'],
    browserSupport: 'partial',
    typicalSizeRange: '1 KB – 5 MB',
    commonUseCases: ['Documentation', 'Blog posts', 'README files', 'Note-taking'],
    limitations: ['Multiple incompatible dialects', 'No native browser rendering', 'Limited structure'],
    alternatives: ['text/plain', 'text/html'],
    maxColorDepth: null,
    dpi: null,
  },
  'text/html': {
    name: 'HTML',
    fullName: 'HyperText Markup Language',
    extension: 'html',
    aliases: ['html', 'htm'],
    category: 'text',
    creator: 'Tim Berners-Lee / W3C / WHATWG',
    firstRelease: 1993,
    latestVersion: 'HTML Living Standard (WHATWG)',
    specification: 'https://html.spec.whatwg.org/',
    standard: 'open',
    compression: 'none',
    transparency: false,
    animation: true,
    colorDepth: null,
    colorSpaces: [],
    metadataSupport: true,
    metadataFormats: ['meta tags', 'Open Graph', 'Schema.org'],
    browserSupport: 'full',
    typicalSizeRange: '1 KB – 10 MB',
    commonUseCases: ['Web pages', 'Email templates', 'Documentation'],
    limitations: ['Requires browser to render', 'Verbose for data exchange'],
    alternatives: ['text/markdown', 'application/xml'],
    maxColorDepth: null,
    dpi: null,
  },
  'text/css': {
    name: 'CSS',
    fullName: 'Cascading Style Sheets',
    extension: 'css',
    aliases: ['css'],
    category: 'text',
    creator: 'Håkon Wium Lie / W3C',
    firstRelease: 1996,
    latestVersion: 'CSS Snapshot 2023',
    specification: 'https://www.w3.org/TR/CSS/',
    standard: 'open',
    compression: 'none',
    transparency: false,
    animation: true,
    colorDepth: null,
    colorSpaces: [],
    metadataSupport: false,
    metadataFormats: [],
    browserSupport: 'full',
    typicalSizeRange: '1 KB – 2 MB',
    commonUseCases: ['Web page styling', 'UI component theming', 'Print stylesheets'],
    limitations: ['Browser inconsistencies', 'No native logic (without preprocessors)'],
    alternatives: ['text/plain'],
    maxColorDepth: null,
    dpi: null,
  },
  'text/javascript': {
    name: 'JavaScript',
    fullName: 'ECMAScript / JavaScript',
    extension: 'js',
    aliases: ['js', 'mjs', 'cjs'],
    category: 'text',
    creator: 'Brendan Eich / Ecma International',
    firstRelease: 1995,
    latestVersion: 'ECMAScript 2024 (ES15)',
    specification: 'https://tc39.es/ecma262/',
    standard: 'open',
    compression: 'none',
    transparency: false,
    animation: false,
    colorDepth: null,
    colorSpaces: [],
    metadataSupport: false,
    metadataFormats: [],
    browserSupport: 'full',
    typicalSizeRange: '1 KB – 10 MB',
    commonUseCases: ['Web app logic', 'Node.js scripts', 'Browser automation', 'Data processing'],
    limitations: ['Security risk if executed from untrusted source', 'No native type safety'],
    alternatives: ['text/plain'],
    maxColorDepth: null,
    dpi: null,
  },
  'text/yaml': {
    name: 'YAML',
    fullName: "YAML Ain't Markup Language",
    extension: 'yaml',
    aliases: ['yaml', 'yml'],
    category: 'data',
    creator: 'Clark Evans, Ingy döt Net, Oren Ben-Kiki',
    firstRelease: 2001,
    latestVersion: 'YAML 1.2.2 (2021)',
    specification: 'https://yaml.org/spec/1.2.2/',
    standard: 'open',
    compression: 'none',
    transparency: false,
    animation: false,
    colorDepth: null,
    colorSpaces: [],
    metadataSupport: false,
    metadataFormats: [],
    browserSupport: 'none',
    typicalSizeRange: '1 KB – 50 MB',
    commonUseCases: ['CI/CD configuration (GitHub Actions, Docker Compose)', 'Kubernetes manifests', 'App config files'],
    limitations: ['Whitespace-sensitive', 'Implicit type coercion', 'No native browser support'],
    alternatives: ['application/json', 'application/xml'],
    maxColorDepth: null,
    dpi: null,
  },
};

// ── PART 2: Conversion Matrix ─────────────────────────────────────────────────

const LOSSLESS_OUTPUTS = new Set(['image/png', 'image/gif', 'image/svg+xml', 'image/tiff', 'image/bmp',
  'application/pdf', 'application/json', 'application/xml', 'text/csv', 'text/plain', 'text/markdown',
  'text/yaml', 'text/html', 'text/css', 'text/javascript']);

const TRANSPARENCY_FORMATS = new Set(['image/png', 'image/webp', 'image/avif', 'image/gif',
  'image/svg+xml', 'image/tiff', 'image/bmp', 'application/pdf']);

const ANIMATION_FORMATS = new Set(['image/gif', 'image/webp', 'image/avif', 'image/svg+xml', 'text/html']);

function deriveConversionPair(tool, srcMime, dstObj) {
  const dstMime = dstObj.mime;
  const caps = new Set(tool.capabilities || []);

  const isLossy = caps.has('quality-control') && !LOSSLESS_OUTPUTS.has(dstMime);
  const preservesTransparency = TRANSPARENCY_FORMATS.has(dstMime);
  const preservesAnimation    = ANIMATION_FORMATS.has(srcMime) && ANIMATION_FORMATS.has(dstMime);
  const preservesMetadata     = caps.has('metadata-edit') ||
    (FORMAT_SPECS[dstMime]?.metadataSupport && FORMAT_SPECS[srcMime]?.metadataSupport);

  // Quality impact: lossy→lossy = some loss; lossless→lossy = loss; lossless→lossless = none
  const srcLossless = LOSSLESS_OUTPUTS.has(srcMime);
  const dstLossless = LOSSLESS_OUTPUTS.has(dstMime);
  let qualityImpact;
  if (isLossy || (!srcLossless && !dstLossless)) qualityImpact = 'lossy';
  else if (srcLossless && !dstLossless)           qualityImpact = 'lossy';
  else if (!srcLossless && dstLossless)           qualityImpact = 'upsampled-lossless';
  else                                            qualityImpact = 'lossless';

  // Speed estimate from runtime + file type complexity
  const speedMs = tool.runtime === 'browser'
    ? (tool.runtimeHints?.memoryBudgetMb > 512 ? '500–3000ms' : '100–1000ms')
    : '1000–5000ms';

  return {
    toolSlug:             tool.slug,
    source:               srcMime,
    destination:          dstMime,
    lossless:             !isLossy && dstLossless,
    preservesTransparency,
    preservesAnimation,
    preservesMetadata,
    qualityImpact,
    expectedSpeedMs:      speedMs,
    batchSupported:       tool.batch?.supported ?? false,
    offlineCapable:       tool.runtime === 'browser',
    engine:               tool.engine || tool.engineFn || 'browser-native',
  };
}

function buildConversionMatrix(data) {
  const pairs = [];
  const pairIndex = new Map(); // 'src→dst' → array of tool options

  for (const tool of data.tools) {
    for (const srcMime of tool.inputFormats) {
      for (const dstObj of tool.outputFormats) {
        const pair = deriveConversionPair(tool, srcMime, dstObj);
        pairs.push(pair);
        const key = `${srcMime}→${dstObj.mime}`;
        if (!pairIndex.has(key)) pairIndex.set(key, []);
        pairIndex.get(key).push(tool.slug);
      }
    }
  }

  // Unique source → destination pairs (deduped)
  const uniquePairs = new Map();
  for (const pair of pairs) {
    const key = `${pair.source}→${pair.destination}`;
    if (!uniquePairs.has(key)) uniquePairs.set(key, { ...pair, tools: [] });
    uniquePairs.get(key).tools.push(pair.toolSlug);
  }

  const stats = {
    totalPairs:      uniquePairs.size,
    losslessPairs:   [...uniquePairs.values()].filter(p => p.lossless).length,
    lossyPairs:      [...uniquePairs.values()].filter(p => !p.lossless).length,
    uniqueSources:   new Set([...uniquePairs.values()].map(p => p.source)).size,
    uniqueTargets:   new Set([...uniquePairs.values()].map(p => p.destination)).size,
    formatsWithTransparency: [...uniquePairs.values()].filter(p => p.preservesTransparency).length,
  };

  return { pairs: [...uniquePairs.values()], index: Object.fromEntries(pairIndex), stats };
}

// ── PART 1 continued: Build Format Database ───────────────────────────────────

function buildFormatDatabase(data) {
  const usedMimes = new Set();
  for (const tool of data.tools) {
    for (const m of tool.inputFormats) usedMimes.add(m);
    for (const f of tool.outputFormats) usedMimes.add(f.mime);
  }

  const formats = [];
  for (const mime of usedMimes) {
    const spec = FORMAT_SPECS[mime];
    if (!spec) continue;

    // Derive which tools support this format
    const inputTools  = data.tools.filter(t => t.inputFormats.includes(mime)).map(t => t.slug);
    const outputTools = data.tools.filter(t => t.outputFormats.some(f => f.mime === mime)).map(t => t.slug);

    // Derive related articles and comparisons
    const relatedArticles = (data.articles || [])
      .filter(a => (a.relatedFormats || []).includes(spec.extension) ||
        (a.slug || '').includes(spec.extension))
      .map(a => a.slug);

    const relatedComparisons = (data.comparisons || [])
      .filter(c => (c.slug || '').includes(spec.extension))
      .map(c => c.slug);

    const relatedGlossary = (data.glossary || [])
      .filter(g => (g.relatedFormats || []).includes(spec.extension) ||
        (g.slug || '').includes(spec.extension))
      .map(g => g.slug);

    formats.push({
      mime,
      ...spec,
      converterTools: { input: inputTools, output: outputTools },
      knowledgeLinks: {
        articles:    relatedArticles,
        comparisons: relatedComparisons,
        glossary:    relatedGlossary,
      },
    });
  }

  return formats.sort((a, b) => a.name.localeCompare(b.name));
}

// ── PART 3: Capability Database ───────────────────────────────────────────────

function buildCapabilityDatabase(data) {
  const tools = {};
  const capFrequency = new Map();

  for (const tool of data.tools) {
    const caps = new Set(tool.capabilities || []);
    const hints = tool.runtimeHints || {};

    // Track capability frequency
    for (const cap of caps) capFrequency.set(cap, (capFrequency.get(cap) || 0) + 1);

    // Privacy score: browser=100, hybrid=60, cloud=20
    const privacyScore = tool.runtime === 'browser' ? 100 : tool.runtime === 'hybrid' ? 60 : 20;

    // Memory usage estimate
    const memMb = hints.memoryBudgetMb || (tool.runtime === 'browser' ? 128 : 0);

    tools[tool.slug] = {
      slug:              tool.slug,
      category:          tool.category,
      offline:           tool.runtime === 'browser',
      browserOnly:       tool.runtime === 'browser',
      batch:             caps.has('batch'),
      batchMaxFiles:     tool.batch?.maxFiles ?? null,
      dragDrop:          caps.has('drag-and-drop'),
      mobile:            caps.has('mobile-supported'),
      clipboardPaste:    caps.has('clipboard-paste'),
      qualityControl:    caps.has('quality-control'),
      preview:           caps.has('preview'),
      downloadZip:       caps.has('download-zip'),
      resize:            caps.has('resize'),
      rotate:            caps.has('rotate'),
      crop:              caps.has('crop'),
      watermark:         caps.has('watermark'),
      maxRecommendedMb:  hints.maxFileSizeMb ?? null,
      memoryUsageMb:     memMb,
      processingEngine:  tool.engine || (tool.runtime === 'browser' ? 'WebAssembly / Canvas API' : 'Server'),
      privacyScore,
      runtime:           tool.runtime,
      capabilityCount:   caps.size,
      allCapabilities:   [...caps],
    };
  }

  // Aggregate stats
  const allTools = Object.values(tools);
  const stats = {
    totalTools:            allTools.length,
    offlineTools:          allTools.filter(t => t.offline).length,
    batchTools:            allTools.filter(t => t.batch).length,
    mobileTools:           allTools.filter(t => t.mobile).length,
    qualityControlTools:   allTools.filter(t => t.qualityControl).length,
    avgPrivacyScore:       Math.round(allTools.reduce((s, t) => s + t.privacyScore, 0) / allTools.length),
    avgCapabilityCount:    +(allTools.reduce((s, t) => s + t.capabilityCount, 0) / allTools.length).toFixed(1),
    topCapabilities:       [...capFrequency.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([cap, count]) => ({ cap, count })),
  };

  return { tools, stats };
}

// ── PART 4: Comparison Engine ─────────────────────────────────────────────────

function compareFormats(fmtA, fmtB) {
  if (!fmtA || !fmtB) return null;

  const fields = [
    { key: 'compression',   label: 'Compression' },
    { key: 'transparency',  label: 'Transparency' },
    { key: 'animation',     label: 'Animation' },
    { key: 'colorDepth',    label: 'Colour Depth' },
    { key: 'browserSupport',label: 'Browser Support' },
    { key: 'metadataSupport',label: 'Metadata Support' },
    { key: 'standard',      label: 'Standard' },
    { key: 'firstRelease',  label: 'First Release' },
    { key: 'typicalSizeRange', label: 'Typical File Size' },
  ];

  return {
    a:      { name: fmtA.name, mime: fmtA.mime },
    b:      { name: fmtB.name, mime: fmtB.mime },
    rows:   fields.map(f => ({
      field: f.label,
      a:     String(fmtA[f.key] ?? '—'),
      b:     String(fmtB[f.key] ?? '—'),
      match: String(fmtA[f.key]) === String(fmtB[f.key]),
    })),
    winner: (() => {
      // Simple heuristic: count advantages
      let aScore = 0, bScore = 0;
      if (fmtA.transparency && !fmtB.transparency) aScore++;
      if (fmtB.transparency && !fmtA.transparency) bScore++;
      if (fmtA.animation && !fmtB.animation) aScore++;
      if (fmtB.animation && !fmtA.animation) bScore++;
      if (fmtA.browserSupport === 'full' && fmtB.browserSupport !== 'full') aScore++;
      if (fmtB.browserSupport === 'full' && fmtA.browserSupport !== 'full') bScore++;
      if (fmtA.compression === 'lossless' && fmtB.compression !== 'lossless') aScore++;
      if (fmtB.compression === 'lossless' && fmtA.compression !== 'lossless') bScore++;
      return aScore > bScore ? fmtA.name : bScore > aScore ? fmtB.name : 'context-dependent';
    })(),
  };
}

function buildComparisonEngine(formatDb) {
  const comparisons = [];
  // Pre-compute comparisons for all pairs of image formats (most useful)
  const imageFmts = formatDb.filter(f => f.category === 'image');
  for (let i = 0; i < imageFmts.length; i++) {
    for (let j = i + 1; j < imageFmts.length; j++) {
      comparisons.push(compareFormats(imageFmts[i], imageFmts[j]));
    }
  }
  // Data format comparisons
  const dataFmts = formatDb.filter(f => f.category === 'data');
  for (let i = 0; i < dataFmts.length; i++) {
    for (let j = i + 1; j < dataFmts.length; j++) {
      comparisons.push(compareFormats(dataFmts[i], dataFmts[j]));
    }
  }

  return { comparisons, total: comparisons.length };
}

// ── PART 5: Recommendation Engine ────────────────────────────────────────────

function buildRecommendationEngine(formatDb, convMatrix) {
  const byMime = Object.fromEntries(formatDb.map(f => [f.mime, f]));

  const rules = [
    // Image recommendations
    {
      goal: 'smallest file size for photos',
      category: 'image',
      recommended: 'image/avif',
      rationale: 'AVIF achieves 50% smaller files than JPG at equivalent quality using AV1 compression.',
      conditions: { animation: false, transparency: false },
      fallback: 'image/webp',
    },
    {
      goal: 'widest browser and software compatibility',
      category: 'image',
      recommended: 'image/jpeg',
      rationale: 'JPG is supported by every browser, OS, and application since 1994.',
      conditions: { animation: false, transparency: false },
      fallback: 'image/png',
    },
    {
      goal: 'transparency support',
      category: 'image',
      recommended: 'image/png',
      rationale: 'PNG provides lossless compression with full alpha channel transparency.',
      conditions: { transparency: true },
      fallback: 'image/webp',
    },
    {
      goal: 'animation',
      category: 'image',
      recommended: 'image/webp',
      rationale: 'Animated WebP offers smaller file sizes than GIF with full colour support.',
      conditions: { animation: true },
      fallback: 'image/gif',
    },
    {
      goal: 'print-ready high quality',
      category: 'image',
      recommended: 'image/tiff',
      rationale: 'TIFF supports lossless compression with 16-bit colour depth at any DPI.',
      conditions: { print: true },
      fallback: 'image/png',
    },
    {
      goal: 'web optimisation',
      category: 'image',
      recommended: 'image/webp',
      rationale: 'WebP provides 25–35% smaller files than JPG with transparency and animation support.',
      conditions: { web: true },
      fallback: 'image/avif',
    },
    {
      goal: 'logos and icons that scale to any size',
      category: 'image',
      recommended: 'image/svg+xml',
      rationale: 'SVG is vector-based — it scales to any size without quality loss.',
      conditions: { vector: true },
      fallback: 'image/png',
    },
    // Document recommendations
    {
      goal: 'universal document sharing',
      category: 'document',
      recommended: 'application/pdf',
      rationale: 'PDF preserves layout and fonts across all devices and operating systems.',
      conditions: {},
      fallback: 'text/plain',
    },
    // Data recommendations
    {
      goal: 'API data exchange',
      category: 'data',
      recommended: 'application/json',
      rationale: 'JSON is the de facto standard for REST APIs — lightweight and universally parsed.',
      conditions: {},
      fallback: 'application/xml',
    },
    {
      goal: 'human-readable configuration',
      category: 'data',
      recommended: 'text/yaml',
      rationale: 'YAML is more readable than JSON for configuration files with fewer brackets.',
      conditions: {},
      fallback: 'application/json',
    },
    {
      goal: 'tabular data for spreadsheets',
      category: 'data',
      recommended: 'text/csv',
      rationale: 'CSV is the universal import/export format for all spreadsheet applications.',
      conditions: {},
      fallback: 'application/json',
    },
    {
      goal: 'enterprise system integration',
      category: 'data',
      recommended: 'application/xml',
      rationale: 'XML with schemas is required by many enterprise APIs and legacy ERP systems.',
      conditions: {},
      fallback: 'application/json',
    },
  ];

  // Enrich each rule with format spec data
  const enriched = rules.map(r => ({
    ...r,
    recommendedSpec: byMime[r.recommended]
      ? { name: byMime[r.recommended].name, extension: byMime[r.recommended].extension }
      : null,
    fallbackSpec: byMime[r.fallback]
      ? { name: byMime[r.fallback].name, extension: byMime[r.fallback].extension }
      : null,
    converterTools: convMatrix.index[`image/jpeg→${r.recommended}`] ||
                    convMatrix.index[`image/png→${r.recommended}`] || [],
  }));

  return { rules: enriched, total: enriched.length };
}

// ── PART 6: Search Dataset ────────────────────────────────────────────────────

function buildSearchDataset(data, formatDb, config) {
  const baseUrl = config.site.baseUrl || '';
  const items = [];

  // Formats
  for (const fmt of formatDb) {
    items.push({
      type: 'format',
      id:   fmt.mime,
      title: `${fmt.name} (.${fmt.extension})`,
      description: (fmt.commonUseCases || []).slice(0, 2).join(', '),
      tags: [fmt.extension, fmt.name.toLowerCase(), fmt.category, ...fmt.aliases.slice(0, 2)],
      url: `${baseUrl}/en/formats/${fmt.extension}`,
    });
  }

  // Tools (English names)
  for (const tool of data.tools) {
    const name = tool.name?.en || tool.slug;
    items.push({
      type:  'tool',
      id:    tool.slug,
      title: name,
      description: tool.tagline?.en || '',
      tags:  [
        tool.slug,
        tool.category,
        ...tool.inputFormats.map(m => m.split('/').pop()),
        ...tool.outputFormats.map(f => f.ext || f.label?.toLowerCase() || ''),
      ].filter(Boolean),
      url: `${baseUrl}/en/${tool.slug}`,
    });
  }

  // Articles
  for (const article of (data.articles || [])) {
    items.push({
      type:  'guide',
      id:    article.slug,
      title: article.title?.en || article.slug,
      description: article.intro?.en?.slice(0, 120) || '',
      tags:  ['guide', ...(article.relatedFormats || []), ...(article.tags || [])],
      url: `${baseUrl}/en/guides/${article.slug}`,
    });
  }

  // Comparisons
  for (const cmp of (data.comparisons || [])) {
    items.push({
      type:  'comparison',
      id:    cmp.slug,
      title: cmp.title?.en || cmp.slug,
      description: cmp.intro?.en?.slice(0, 120) || '',
      tags:  ['comparison', ...(cmp.slug.split('-vs-') || [])],
      url: `${baseUrl}/en/compare/${cmp.slug}`,
    });
  }

  // Glossary
  for (const term of (data.glossary || [])) {
    items.push({
      type:  'glossary',
      id:    term.slug,
      title: term.term?.en || term.slug,
      description: term.definition?.en?.slice(0, 120) || '',
      tags:  ['glossary', ...(term.relatedFormats || [])],
      url: `${baseUrl}/en/glossary/${term.slug}`,
    });
  }

  // Entities
  for (const entity of (data.entities || [])) {
    items.push({
      type:  'entity',
      id:    entity.slug,
      title: entity.name?.en || entity.slug,
      description: entity.description?.en?.slice(0, 120) || '',
      tags:  ['format', 'entity', entity.extension || ''],
      url: `${baseUrl}/en/formats/${entity.slug}`,
    });
  }

  return { items, total: items.length, types: ['format', 'tool', 'guide', 'comparison', 'glossary', 'entity'] };
}

// ── PART 7: Site Statistics ───────────────────────────────────────────────────

function buildSiteStats(data, formatDb, convMatrix, capDb) {
  const mimeTypes = new Set();
  const extensions = new Set();
  for (const fmt of formatDb) {
    mimeTypes.add(fmt.mime);
    extensions.add(fmt.extension);
    for (const a of (fmt.aliases || [])) extensions.add(a);
  }

  const engines = new Set(data.tools.map(t => t.engine).filter(Boolean));

  return {
    generatedAt:        new Date().toISOString(),
    supportedFormats:   formatDb.length,
    mimeTypes:          mimeTypes.size,
    uniqueExtensions:   extensions.size,
    conversionPairs:    convMatrix.stats.totalPairs,
    losslessPairs:      convMatrix.stats.losslessPairs,
    lossyPairs:         convMatrix.stats.lossyPairs,
    browserEngines:     engines.size,
    engineList:         [...engines].sort(),
    categories:         [...new Set(data.tools.map(t => t.category))].sort(),
    tools:              data.tools.length,
    batchTools:         capDb.stats.batchTools,
    offlineTools:       capDb.stats.offlineTools,
    mobileTools:        capDb.stats.mobileTools,
    avgPrivacyScore:    capDb.stats.avgPrivacyScore,
    articles:           (data.articles || []).length,
    comparisons:        (data.comparisons || []).length,
    glossaryTerms:      (data.glossary || []).length,
    entities:           (data.entities || []).length,
    languages:          data.languages.length,
  };
}

// ── PART 8: Knowledge Relationships ──────────────────────────────────────────

function buildKnowledgeRelationships(data, formatDb, convMatrix) {
  const graph = {};

  for (const fmt of formatDb) {
    // Find compatible formats (can convert to/from)
    const compatibleFormats = new Set();
    for (const pair of convMatrix.pairs) {
      if (pair.source === fmt.mime) compatibleFormats.add(pair.destination);
      if (pair.destination === fmt.mime) compatibleFormats.add(pair.source);
    }

    // Tools that handle this format
    const converterSlugs = [
      ...new Set([...fmt.converterTools.input, ...fmt.converterTools.output]),
    ];

    // Guides related to this format
    const guides = (data.articles || [])
      .filter(a => (a.relatedFormats || []).includes(fmt.extension) ||
        (a.slug || '').includes(fmt.extension))
      .map(a => a.slug);

    // Comparisons involving this format
    const comparisons = (data.comparisons || [])
      .filter(c => (c.slug || '').includes(fmt.extension))
      .map(c => c.slug);

    // Glossary terms related to this format
    const glossary = (data.glossary || [])
      .filter(g => (g.relatedFormats || []).includes(fmt.extension))
      .map(g => g.slug);

    // Collections mentioning this format's tools
    const collections = (data.collections || [])
      .filter(c => converterSlugs.some(slug => (c.toolSlugs || []).includes(slug)))
      .map(c => c.slug);

    graph[fmt.mime] = {
      format:           { name: fmt.name, mime: fmt.mime, extension: fmt.extension },
      compatibleFormats: [...compatibleFormats],
      converters:        converterSlugs,
      guides,
      comparisons,
      glossary,
      entities:          data.entities?.filter(e => e.extension === fmt.extension).map(e => e.slug) || [],
      apiDocs:           converterSlugs.map(slug => `/en/api/tools/${slug}`),
      collections,
      relationshipCount: compatibleFormats.size + converterSlugs.length + guides.length +
                         comparisons.length + glossary.length + collections.length,
    };
  }

  const totalRelationships = Object.values(graph).reduce((s, n) => s + n.relationshipCount, 0);

  return { graph, totalNodes: Object.keys(graph).length, totalRelationships };
}

// ── Main export ───────────────────────────────────────────────────────────────

export function generateDatasetFiles(data, config) {
  const formatDb     = buildFormatDatabase(data);
  const convMatrix   = buildConversionMatrix(data);
  const capDb        = buildCapabilityDatabase(data);
  const compEngine   = buildComparisonEngine(formatDb);
  const recEngine    = buildRecommendationEngine(formatDb, convMatrix);
  const searchDs     = buildSearchDataset(data, formatDb, config);
  const siteStats    = buildSiteStats(data, formatDb, convMatrix, capDb);
  const knowledge    = buildKnowledgeRelationships(data, formatDb, convMatrix);

  const files = [
    { path: '/formats.json',          content: JSON.stringify({ formats: formatDb, total: formatDb.length }, null, 2) },
    { path: '/conversion-matrix.json', content: JSON.stringify(convMatrix, null, 2) },
    { path: '/capabilities.json',      content: JSON.stringify(capDb, null, 2) },
    { path: '/comparison-engine.json', content: JSON.stringify(compEngine, null, 2) },
    { path: '/recommendations.json',   content: JSON.stringify(recEngine, null, 2) },
    { path: '/search-dataset.json',    content: JSON.stringify(searchDs, null, 2) },
    { path: '/site-stats.json',        content: JSON.stringify(siteStats, null, 2) },
    { path: '/knowledge-graph.json',   content: JSON.stringify(knowledge, null, 2) },
  ];

  const datasetStats = {
    formats:               formatDb.length,
    conversionPairs:       convMatrix.stats.totalPairs,
    capabilityEntries:     Object.keys(capDb.tools).length,
    comparisonPairs:       compEngine.total,
    recommendations:       recEngine.total,
    searchItems:           searchDs.total,
    knowledgeNodes:        knowledge.totalNodes,
    knowledgeRelationships:knowledge.totalRelationships,
    filesEmitted:          files.length,
    totalBytes:            files.reduce((s, f) => s + f.content.length, 0),
  };

  return { files, datasetStats, formatDb, convMatrix, capDb, knowledge };
}
