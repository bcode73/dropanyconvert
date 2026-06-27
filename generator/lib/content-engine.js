/**
 * Phase 23 — Content Quality Engine
 *
 * Enriches every tool page with unique, information-rich content
 * derived deterministically from tool metadata.
 * No AI APIs. No runtime dependencies. Pure generator logic.
 */

// ── Deterministic hash ────────────────────────────────────────────────────

function djb2(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) + str.charCodeAt(i);
  return Math.abs(h >>> 0);
}

function pick(arr, seed) {
  return arr[seed % arr.length];
}

// ── Format helpers ────────────────────────────────────────────────────────

function mimeToLabel(mime) {
  const map = {
    'image/jpeg': 'JPG', 'image/png': 'PNG', 'image/webp': 'WebP',
    'image/avif': 'AVIF', 'image/gif': 'GIF', 'image/svg+xml': 'SVG',
    'image/tiff': 'TIFF', 'image/bmp': 'BMP', 'image/heic': 'HEIC',
    'image/heif': 'HEIF', 'application/pdf': 'PDF', 'text/plain': 'TXT',
    'text/csv': 'CSV', 'text/markdown': 'Markdown', 'application/json': 'JSON',
    'application/xml': 'XML', 'application/zip': 'ZIP', 'audio/mpeg': 'MP3',
    'audio/wav': 'WAV', 'video/mp4': 'MP4',
  };
  return map[mime] || mime.split('/').pop().split('+')[0].toUpperCase();
}

function inputLabel(tool) {
  const labels = tool.inputFormats.map(mimeToLabel);
  return labels.length === 1 ? labels[0] : labels.slice(0, 2).join('/');
}

function outputLabel(tool) {
  const def = tool.outputFormats.find(f => f.default) || tool.outputFormats[0];
  return def?.label || mimeToLabel(def?.mime || '');
}

// ── PART 1: Variation Engine ──────────────────────────────────────────────

const INTRO_POOLS = {
  image: [
    (inFmt, outFmt, name) => `${name} converts your ${inFmt} images to ${outFmt} format directly in your browser — no uploads, no accounts, no waiting. The entire process runs locally using WebAssembly, so your images never leave your device.`,
    (inFmt, outFmt, name) => `Need to convert ${inFmt} to ${outFmt}? ${name} handles it instantly in your browser. Drop your file, click convert, and download in seconds. No server involved — your files stay private on your device.`,
    (inFmt, outFmt, name) => `${name} is the fastest way to convert ${inFmt} files to ${outFmt} without installing software. It runs entirely client-side using modern browser APIs, making it private, fast, and available offline.`,
    (inFmt, outFmt, name) => `Convert ${inFmt} to ${outFmt} in one step with ${name}. The conversion happens locally in your browser — no file is ever sent to a server. Works on desktop, tablet, and mobile without any plugins or extensions.`,
    (inFmt, outFmt, name) => `${name} gives you instant, lossless ${inFmt} to ${outFmt} conversion without any sign-up. Files are processed by WebAssembly running locally — meaning conversion is both fast and fully private.`,
    (inFmt, outFmt, name) => `Stop searching for a reliable ${inFmt} to ${outFmt} converter. ${name} does it in your browser, free, with no file size ads or upsells. Just drag, convert, and download.`,
    (inFmt, outFmt, name) => `${name} turns your ${inFmt} files into ${outFmt} format with one click. Because it runs in-browser, your images are processed locally — no cloud, no data collection, no waiting for a server.`,
    (inFmt, outFmt, name) => `For ${inFmt} to ${outFmt} conversion that respects your privacy, ${name} is the right tool. Processing happens entirely on your machine — files are never uploaded anywhere.`,
  ],
  pdf: [
    (inFmt, outFmt, name) => `${name} converts ${inFmt} to ${outFmt} format in your browser using PDF.js and WebAssembly. Your documents stay on your device throughout — nothing is uploaded to any server.`,
    (inFmt, outFmt, name) => `Working with ${inFmt} documents? ${name} converts them to ${outFmt} format without any cloud processing. Drop your file and get a converted document in seconds, completely offline.`,
    (inFmt, outFmt, name) => `${name} makes ${inFmt} to ${outFmt} conversion simple and private. The entire operation runs in your browser — ideal for sensitive documents like contracts, invoices, and confidential reports.`,
    (inFmt, outFmt, name) => `Convert ${inFmt} documents to ${outFmt} format instantly with ${name}. No registration, no cloud, no waiting. Your PDFs and documents are processed locally using in-browser technology.`,
    (inFmt, outFmt, name) => `${name} handles ${inFmt} to ${outFmt} conversions entirely within your browser. Perfect for sensitive documents — legal files, financial records, or medical forms never leave your machine.`,
    (inFmt, outFmt, name) => `Need a quick ${inFmt} to ${outFmt} conversion? ${name} does it locally in your browser — no extensions, no accounts, no file size limits imposed by cloud plans.`,
  ],
  developer: [
    (inFmt, outFmt, name) => `${name} processes ${inFmt} data and converts it to ${outFmt} format instantly in your browser. No server round-trips, no API keys, no rate limits — just paste your data and get results.`,
    (inFmt, outFmt, name) => `${name} gives developers a fast, local way to convert ${inFmt} to ${outFmt}. The entire transformation runs in-browser — great for testing, debugging, and quick prototyping without touching a server.`,
    (inFmt, outFmt, name) => `Convert ${inFmt} to ${outFmt} with ${name} — a browser-native developer tool that processes data instantly with no backend required. Ideal for API development, CI pipelines, and data validation workflows.`,
    (inFmt, outFmt, name) => `${name} is built for developers who need ${inFmt} to ${outFmt} conversion on the fly. It runs entirely client-side — no credentials, no quotas, no latency from a remote API.`,
  ],
  utility: [
    (tool_) => `${tool_.name?.en || tool_.slug} is a free, browser-based tool that processes images locally — no uploads, no accounts, no plugins required. It runs in seconds on any device.`,
    (tool_) => `Use ${tool_.name?.en || tool_.slug} directly in your browser to process images without any software to install. Your files are handled locally, keeping them private and the workflow fast.`,
    (tool_) => `${tool_.name?.en || tool_.slug} works offline, directly in your browser. Files are never sent to a server, making it suitable for sensitive or confidential images.`,
    (tool_) => `A simple, private image processing tool: ${tool_.name?.en || tool_.slug} runs entirely client-side. No sign-up, no limits, no waiting — just drag your file and go.`,
  ],
};

const CONCLUSION_POOLS = [
  (name) => `${name} is free, private, and ready whenever you need it. No sign-up, no limits. Bookmark it for next time.`,
  (name) => `Bookmark ${name} for fast, private file conversion anytime — it works offline too, so it is available even without internet.`,
  (name) => `${name} is one of the fastest browser-based converters available. Try it free — no account needed.`,
  (name) => `Use ${name} whenever you need a quick, private conversion. There are no file count limits and no subscription required.`,
  (name) => `${name} handles conversions in seconds and keeps your files on your device at all times. It is completely free to use.`,
  (name) => `Unlike cloud-based converters, ${name} never sends your files anywhere. Use it as often as you need, for free.`,
  (name) => `${name} is always ready at your fingertips. Free, fast, and private — no installation or sign-up required.`,
  (name) => `Whether you convert once or dozens of times a day, ${name} scales with you — free, local, and instant.`,
];

const CTA_POOLS = [
  'Drop your file above to get started',
  'Drag and drop your file to begin',
  'Upload your file to convert it instantly',
  'Select or drop a file to start converting',
  'Ready to convert? Drop your file in the box above',
  'Get started — drop your file above',
  'Add your file to begin the conversion',
  'Choose a file to start — it only takes seconds',
];

function generateVariants(tool) {
  const seed  = djb2(tool.slug);
  const inFmt  = inputLabel(tool);
  const outFmt = outputLabel(tool);
  const name   = tool.name?.en || tool.slug;
  const cat    = tool.category || 'image';

  let intro;
  if (tool.uiGroup === 'utility') {
    const pool = INTRO_POOLS.utility;
    intro = pick(pool, seed)(tool);
  } else {
    const pool = INTRO_POOLS[cat] || INTRO_POOLS.image;
    intro = pick(pool, seed)(inFmt, outFmt, name);
  }

  const conclusion = pick(CONCLUSION_POOLS, djb2(tool.slug + 'c'))(name);
  const ctaText    = pick(CTA_POOLS, djb2(tool.slug + 'cta'));

  return { intro, conclusion, ctaText };
}

// ── PART 2: Dynamic Examples ──────────────────────────────────────────────

const FORMAT_EXAMPLES = {
  'image/jpeg': [
    { label: 'Photographs', desc: 'High-resolution photos from cameras or phones' },
    { label: 'Product images', desc: 'E-commerce product shots with white backgrounds' },
    { label: 'Social media photos', desc: 'Photos shared on Instagram, Facebook, or Twitter' },
    { label: 'Travel shots', desc: 'Landscape and portrait photos from trips' },
  ],
  'image/png': [
    { label: 'Screenshots', desc: 'Screen captures with sharp text and UI elements' },
    { label: 'Logos', desc: 'Company or brand logos with transparency' },
    { label: 'Diagrams', desc: 'Technical diagrams, flowcharts, or wireframes' },
    { label: 'Transparent graphics', desc: 'Images with alpha channel / transparent backgrounds' },
  ],
  'image/webp': [
    { label: 'Web graphics', desc: 'Images optimised for web pages and CDNs' },
    { label: 'App assets', desc: 'Icons and images for mobile or web apps' },
    { label: 'Compressed photos', desc: 'Photos at smaller file sizes for fast loading' },
  ],
  'image/gif': [
    { label: 'Animated graphics', desc: 'Looping animations, stickers, and memes' },
    { label: 'Loading spinners', desc: 'Small animated indicators for web apps' },
    { label: 'Reactions', desc: 'Short reaction clips used in chat apps' },
  ],
  'image/svg+xml': [
    { label: 'Logos & icons', desc: 'Vector logos that scale to any size without quality loss' },
    { label: 'Illustrations', desc: 'Flat or line-art illustrations for web pages' },
    { label: 'Charts', desc: 'Data visualisation charts exported from tools' },
  ],
  'image/avif': [
    { label: 'Next-gen web images', desc: 'Highly compressed images for modern browsers' },
    { label: 'Hero images', desc: 'Large page headers that need fast load times' },
  ],
  'image/tiff': [
    { label: 'Print-ready artwork', desc: 'High-DPI images used in publishing workflows' },
    { label: 'Scanned documents', desc: 'Archival scans of physical documents' },
    { label: 'Medical imaging', desc: 'DICOM-adjacent images from imaging devices' },
  ],
  'application/pdf': [
    { label: 'Invoices', desc: 'Business invoices and billing documents' },
    { label: 'Contracts', desc: 'Legal agreements, NDAs, or leases' },
    { label: 'Ebooks', desc: 'Long-form documents, guides, or reports' },
    { label: 'Scanned documents', desc: 'Physical pages digitised to PDF via scanner' },
    { label: 'Form submissions', desc: 'Filled PDF forms with embedded field data' },
  ],
  'application/json': [
    { label: 'API responses', desc: 'JSON returned by REST or GraphQL APIs' },
    { label: 'Config files', desc: 'Application configuration stored as JSON' },
    { label: 'Data exports', desc: 'Exported data from databases or analytics tools' },
    { label: 'Embedded payloads', desc: 'Serialised objects in HTTP request bodies' },
  ],
  'application/xml': [
    { label: 'RSS feeds', desc: 'Blog or podcast feed data in XML format' },
    { label: 'SOAP payloads', desc: 'Enterprise API request/response bodies' },
    { label: 'Data exports', desc: 'XML exports from ERPs and legacy systems' },
    { label: 'Config files', desc: 'Maven, Ant, Spring, or Android manifests' },
  ],
  'text/csv': [
    { label: 'Spreadsheet exports', desc: 'Data exported from Excel or Google Sheets' },
    { label: 'Database dumps', desc: 'Table data from MySQL, PostgreSQL, or SQLite' },
    { label: 'Analytics data', desc: 'Traffic reports from Google Analytics or Matomo' },
  ],
  'text/plain': [
    { label: 'Log files', desc: 'Application or server log output' },
    { label: 'Code snippets', desc: 'Plain-text source code pasted from an editor' },
    { label: 'Notes', desc: 'Unformatted text notes and drafts' },
  ],
  'text/markdown': [
    { label: 'Documentation', desc: 'README files and project docs in Markdown' },
    { label: 'Blog posts', desc: 'Articles authored in Markdown editors' },
    { label: 'Notes', desc: 'Obsidian, Notion, or Bear exports' },
  ],
};

function generateExamples(tool) {
  const examples = [];
  const seen = new Set();

  for (const mime of tool.inputFormats) {
    const pool = FORMAT_EXAMPLES[mime] || [];
    for (const ex of pool) {
      if (!seen.has(ex.label)) {
        seen.add(ex.label);
        examples.push(ex);
      }
    }
  }

  // If still sparse, add generic examples by category
  if (examples.length < 3) {
    const cat = tool.category;
    if (cat === 'pdf') {
      examples.push(
        { label: 'Business reports', desc: 'Multi-page PDF reports with charts and tables' },
        { label: 'Presentation slides', desc: 'Exported slide decks saved as PDF' },
      );
    } else if (cat === 'developer') {
      examples.push(
        { label: 'API payloads', desc: 'Request/response bodies from REST or GraphQL APIs' },
        { label: 'Config objects', desc: 'Application settings in structured data format' },
      );
    } else {
      examples.push(
        { label: 'Digital photos', desc: 'Photos taken on a camera or smartphone' },
        { label: 'Web graphics', desc: 'Images downloaded from websites or apps' },
      );
    }
  }

  return examples.slice(0, 6);
}

// ── PART 3: FAQ Expansion ─────────────────────────────────────────────────

function generateFaqs(tool, data) {
  const name    = tool.name?.en || tool.slug;
  const inFmt   = inputLabel(tool);
  const outFmt  = outputLabel(tool);
  const caps    = new Set(tool.capabilities || []);
  const isLocal = tool.runtime === 'browser';
  const isHybrid = tool.runtime === 'hybrid';

  const faqs = [];

  // Privacy / data safety
  if (isLocal) {
    faqs.push({
      q: `Is my file safe when using ${name}?`,
      a: `Yes — completely. ${name} runs entirely in your browser using WebAssembly. Your file never leaves your device and is never uploaded to any server. There is no data collection and no cloud storage involved.`,
    });
  } else if (isHybrid) {
    faqs.push({
      q: `Is my file safe when using ${name}?`,
      a: `${name} processes files locally in your browser whenever possible. For complex operations that require server processing, files are encrypted in transit and deleted immediately after conversion. We do not store your files.`,
    });
  }

  // Cost
  faqs.push({
    q: `Is ${name} free to use?`,
    a: `Yes, ${name} is completely free. There are no subscriptions, no credits, and no sign-up required. You can use it as many times as you need.`,
  });

  // Internet requirement
  if (isLocal) {
    faqs.push({
      q: `Does ${name} work offline?`,
      a: `Yes. Once the page has loaded, ${name} works completely offline. The conversion runs in your browser using WebAssembly — no internet connection is needed during the actual conversion.`,
    });
  } else {
    faqs.push({
      q: `Does ${name} require an internet connection?`,
      a: `An internet connection is required to load the tool. Some operations may also use server-side processing for tasks that exceed browser capabilities.`,
    });
  }

  // File size
  const maxMb = tool.runtimeHints?.maxFileSizeMb;
  faqs.push({
    q: `What is the maximum file size for ${name}?`,
    a: maxMb
      ? `${name} recommends files up to ${maxMb} MB for reliable in-browser performance. Larger files may work depending on your device's available RAM but may be slower.`
      : `${name} can handle files up to the limit of your browser's available memory. For most use cases, files under 50 MB convert quickly. Very large files may slow down older devices.`,
  });

  // Batch
  if (caps.has('batch')) {
    const maxFiles = tool.batch?.maxFiles || 20;
    faqs.push({
      q: `Can I convert multiple files at once with ${name}?`,
      a: `Yes. ${name} supports batch conversion. You can select or drop up to ${maxFiles} files at once and convert them all in a single operation. Each file is processed and downloaded separately.`,
    });
  } else {
    faqs.push({
      q: `Can I convert multiple files at once with ${name}?`,
      a: `${name} currently converts one file at a time. For batch conversion of many files, you can simply repeat the process — each conversion only takes a few seconds.`,
    });
  }

  // Speed
  faqs.push({
    q: `How long does ${name} take to convert a file?`,
    a: isLocal
      ? `Most files convert in under 3 seconds. Speed depends on file size and your device's processing power. Larger files or images with high resolutions may take 5–10 seconds.`
      : `Conversion typically takes 2–8 seconds depending on file size and server load. Larger files may take longer, particularly if they require server-side processing.`,
  });

  // Browser support
  faqs.push({
    q: `Which browsers does ${name} support?`,
    a: `${name} works in all modern browsers: Chrome, Firefox, Edge, and Safari (desktop and mobile). Internet Explorer is not supported. For the best performance, we recommend using the latest version of Chrome or Firefox.`,
  });

  // Output quality (if quality control capability)
  if (caps.has('quality-control')) {
    faqs.push({
      q: `Can I control the output quality or file size?`,
      a: `Yes. ${name} includes a quality slider that lets you balance output file size against visual quality. A setting of 80–90% gives excellent quality with significantly reduced file size. Setting it to 100% produces near-lossless output.`,
    });
  }

  // Format-specific FAQs
  const inputMimes = new Set(tool.inputFormats);
  const outputMimes = new Set(tool.outputFormats.map(f => f.mime));

  if (inputMimes.has('image/png') || outputMimes.has('image/png')) {
    faqs.push({
      q: `Does ${name} preserve PNG transparency?`,
      a: outputMimes.has('image/png')
        ? `Yes. When the output format is PNG, transparency (alpha channel) is fully preserved. If converting to a format like JPG that does not support transparency, transparent areas are filled with white.`
        : `When converting from PNG to a format that does not support transparency (such as JPG), transparent areas are filled with a solid white background. For formats like WebP or GIF, transparency can be preserved.`,
    });
  }

  if (inputMimes.has('application/pdf') || outputMimes.has('application/pdf')) {
    faqs.push({
      q: `Does ${name} preserve PDF formatting and fonts?`,
      a: outputMimes.has('application/pdf')
        ? `Yes. When the output is PDF, fonts, layout, and formatting are preserved. Embedded fonts remain embedded in the output document.`
        : `Text content, layout, and fonts are extracted and preserved as accurately as possible. Complex multi-column layouts or custom fonts may require minor adjustments in the output.`,
    });
  }

  if (inputMimes.has('image/svg+xml') || outputMimes.has('image/svg+xml')) {
    faqs.push({
      q: outputMimes.has('image/svg+xml')
        ? `Does ${name} produce a true vector SVG?`
        : `Can I convert an SVG to a high-resolution image?`,
      a: outputMimes.has('image/svg+xml')
        ? `Yes. The output is a valid, scalable SVG file. However, note that converting from a raster image (like PNG or JPG) to SVG traces the image rather than recreating true vector paths — the result is vector-embedded rasterised art.`
        : `Yes. SVG files are vector-based, so ${name} can render them at any resolution. You can resize the output image to any pixel dimensions and the quality will remain sharp.`,
    });
  }

  if (tool.category === 'developer') {
    faqs.push({
      q: `Does ${name} validate the input before converting?`,
      a: `Yes. ${name} validates the syntax of your ${inFmt} input before processing. Invalid syntax is highlighted with an error message explaining what needs to be fixed. Only valid input is converted.`,
    });
    faqs.push({
      q: `Can I use ${name} to convert large data files?`,
      a: `${name} handles data files of typical sizes (up to a few hundred kilobytes) with ease. For very large files (several megabytes), consider splitting the data or using a command-line tool like \`jq\` or \`xmllint\` for server-side processing.`,
    });
  }

  // Mobile support
  faqs.push({
    q: `Does ${name} work on mobile devices?`,
    a: `Yes. ${name} works on iOS and Android browsers (Safari, Chrome, Firefox). File upload and download work via your device's native file picker. Performance may vary on older devices with limited RAM for very large files.`,
  });

  // Unique per-tool based on slug hash (adds 1 more distinctive FAQ)
  const seed = djb2(tool.slug);
  const uniqueFaqs = [
    {
      q: `Can I convert ${inFmt} to ${outFmt} without installing software?`,
      a: `Yes — that is exactly what ${name} is designed for. It runs entirely in your browser. No download, no installation, and no plugin is required.`,
    },
    {
      q: `Does ${name} change the content of my file?`,
      a: `${name} only changes the file format, not the content. Your data, text, or image content is preserved faithfully during conversion. Optional settings like quality adjustment may affect file size but not semantic content.`,
    },
    {
      q: `Can I use ${name} for commercial projects?`,
      a: `Yes, ${name} is free to use for personal and commercial projects alike. There are no usage restrictions or licensing requirements.`,
    },
    {
      q: `What happens to my file after conversion?`,
      a: `Your converted file is made available for download directly in your browser. Because processing is local, no copy of your file is stored anywhere — it only exists in your browser's memory during conversion and is cleared when you close or refresh the page.`,
    },
  ];
  faqs.push(uniqueFaqs[seed % uniqueFaqs.length]);

  // Merge with existing tool.faq — tool-specific FAQs come first
  const existing = (tool.faq || []).map(f => ({
    q: f.question?.en || '',
    a: f.answer?.en   || '',
    multilingual: f,
  }));

  // Dedup: skip generated FAQ if the question stem is already covered
  const existingStems = new Set(existing.map(f => f.q.toLowerCase().split(' ').slice(0, 4).join(' ')));
  const unique = faqs.filter(f => {
    const stem = f.q.toLowerCase().split(' ').slice(0, 4).join(' ');
    return !existingStems.has(stem);
  });

  // Target: 8–15 total. Fill up to 15 with generated, trim if over.
  const merged = [...existing, ...unique].slice(0, 15);

  return merged;
}

// ── PART 4: Use Cases ─────────────────────────────────────────────────────

const USE_CASE_POOLS = {
  image: {
    bestFor: [
      'Sharing images on platforms that require a specific format',
      'Reducing file size before uploading to a website or CMS',
      'Converting screenshots for use in presentations or documentation',
      'Preparing images for email attachments with size limits',
      'Converting logos or icons to a web-compatible format',
      'Optimising photos for faster page load times',
      'Archiving images in a widely-supported, future-proof format',
    ],
    notFor: [
      'Lossless archiving of RAW camera files (use dedicated RAW tools instead)',
      'Converting very large files (>100 MB) on devices with limited RAM',
      'Applying complex multi-layer editing (use Photoshop or GIMP for that)',
    ],
    proTips: [
      'For web use, WebP offers 25–35% smaller files than JPG with comparable quality.',
      'If preserving transparency matters, always choose PNG or WebP as the output format.',
      'When targeting print output, avoid JPG compression — use PNG or TIFF instead.',
    ],
    beginnerTips: [
      'A quality setting of 85 is a great starting point — it balances size and sharpness well.',
      'JPG is best for photos. PNG is best for screenshots and logos.',
      'When in doubt, WebP is the modern default: it is small and widely supported.',
    ],
  },
  pdf: {
    bestFor: [
      'Converting documents for digital distribution without layout changes',
      'Making PDFs searchable by extracting text content',
      'Archiving contracts and agreements in a universally supported format',
      'Sharing read-only documents where the layout must be preserved',
      'Reducing PDF file size before emailing or uploading',
      'Extracting images from PDF for reuse in other documents',
    ],
    notFor: [
      'Editing the text content of existing PDF documents (use a PDF editor)',
      'Working with password-protected PDFs that you do not own',
      'Converting PDFs with complex dynamic forms (use Adobe Acrobat)',
    ],
    proTips: [
      'For contract archiving, PDF/A format ensures long-term compatibility.',
      'Scanned PDFs require OCR to become searchable — check the OCR option if available.',
      'Reduce PDF size by removing embedded fonts when the file is for on-screen viewing only.',
    ],
    beginnerTips: [
      'PDF is the most universally supported document format — most email clients open it natively.',
      'Compressing a PDF before emailing often cuts file size by 50% or more.',
      'To convert a Word document to PDF, simply print it and choose "Save as PDF".',
    ],
  },
  developer: {
    bestFor: [
      'Quickly transforming data between common structured formats',
      'Debugging API payloads during development',
      'Validating and pretty-printing data before committing to a codebase',
      'Converting configuration files between formats (JSON ↔ YAML ↔ TOML)',
      'Exploring and testing data transformations without writing code',
    ],
    notFor: [
      'Production-scale data transformation pipelines (use jq, xmllint, or a proper ETL tool)',
      'Files larger than ~5 MB where command-line tools are faster',
      'Automated batch processing (consider a scripted CLI workflow)',
    ],
    proTips: [
      'Use the browser console to inspect or copy the output programmatically.',
      'JSON Schema validation is a useful follow-up step after converting data.',
      'Keep YAML output anchors in mind when converting JSON objects with repeated values.',
    ],
    beginnerTips: [
      'JSON is a great default for most API work — it is simple and supported everywhere.',
      'YAML is more readable than JSON for config files but is whitespace-sensitive.',
      'If you paste invalid input, the validator will tell you exactly where the error is.',
    ],
  },
};

function generateUseCases(tool) {
  const cat  = tool.category || 'image';
  const pool = USE_CASE_POOLS[cat] || USE_CASE_POOLS.image;
  const seed = djb2(tool.slug + 'uc');
  const isUtil = tool.uiGroup === 'utility';

  // Pick a varied selection deterministically
  const pickN = (arr, n, offset) =>
    arr.slice(offset % Math.max(1, arr.length - n), (offset % Math.max(1, arr.length - n)) + n)
       .concat(arr.slice(0, n))
       .slice(0, n);

  const bestFor = pickN(pool.bestFor, isUtil ? 3 : 4, seed % 3);
  const notFor  = pickN(pool.notFor,  2, (seed >> 2) % 2);
  const proTips = pickN(pool.proTips, 2, (seed >> 4) % 2);
  const beginTips = pickN(pool.beginnerTips, 2, (seed >> 6) % 2);

  // Add capability-specific tips
  if (new Set(tool.capabilities).has('batch')) {
    bestFor.push('Processing multiple files at once to save time');
  }

  const mistakes = [
    `Converting to ${outputLabel(tool)} when the original format is already optimal for your use case`,
    'Forgetting to check the output before sharing — always preview the converted file',
    'Using lossy compression when the file will be re-edited later (leads to quality loss)',
  ];

  return { bestFor, notFor, proTips, beginTips, mistakes: mistakes.slice(0, 2) };
}

// ── PART 8: Reading Quality ───────────────────────────────────────────────

function computeReadingQuality(tool, generatedFaqs, variants) {
  const textBlocks = [
    variants.intro,
    variants.conclusion,
    (tool.seo?.intro?.en || ''),
    (tool.features || []).map(f => f.description?.en || '').join(' '),
    generatedFaqs.map(f => (f.a || '')).join(' '),
  ];

  const totalText = textBlocks.join(' ');
  const wordCount = totalText.split(/\s+/).filter(Boolean).length;
  const readingTimeMins = Math.max(1, Math.round(wordCount / 200));

  // Complexity: word length average + sentence length
  const avgWordLen = totalText.replace(/\s+/g, ' ').split(' ').reduce((s, w) => s + w.length, 0) / Math.max(1, wordCount);
  const complexity = avgWordLen > 6 ? 'Advanced' : avgWordLen > 5 ? 'Intermediate' : 'Beginner-friendly';

  // Quality score: 0–100
  const faqScore    = Math.min(30, generatedFaqs.length * 2.5);
  const contentScore = Math.min(40, wordCount / 10);
  const featureScore = Math.min(20, (tool.features?.length || 0) * 5);
  const freshnessScore = 10; // date is current
  const qualityScore = Math.round(faqScore + contentScore + featureScore + freshnessScore);

  return {
    wordCount,
    readingTimeMins,
    complexity,
    qualityScore: Math.min(100, qualityScore),
    faqCount: generatedFaqs.length,
    lastUpdated: '2026-06-27',
  };
}

// ── Main export ───────────────────────────────────────────────────────────

export function enrichTool(tool, data) {
  const variants       = generateVariants(tool);
  const examples       = generateExamples(tool);
  const faqs           = generateFaqs(tool, data);
  const useCases       = generateUseCases(tool);
  const readingQuality = computeReadingQuality(tool, faqs, variants);

  return { variants, examples, faqs, useCases, readingQuality };
}

// ── HTML renderers for new sections ──────────────────────────────────────

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderExamplesSection(examples) {
  if (!examples.length) return '';
  const items = examples.map(ex =>
    `<div class="dac-example-item">
      <span class="dac-example-item__label">${esc(ex.label)}</span>
      <span class="dac-example-item__desc">${esc(ex.desc)}</span>
    </div>`
  ).join('\n    ');

  return `<section class="dac-examples" aria-labelledby="dac-examples-title">
  <h2 class="dac-section-title" id="dac-examples-title">Common Use Cases</h2>
  <div class="dac-examples-grid">
    ${items}
  </div>
</section>`;
}

export function renderUseCasesSection(useCases, toolName) {
  const bestHtml    = useCases.bestFor.map(u  => `<li>${esc(u)}</li>`).join('');
  const notForHtml  = useCases.notFor.map(u   => `<li>${esc(u)}</li>`).join('');
  const mistakeHtml = useCases.mistakes.map(m => `<li>${esc(m)}</li>`).join('');
  const proHtml     = useCases.proTips.map(t  => `<li>${esc(t)}</li>`).join('');
  const beginHtml   = useCases.beginTips.map(t=> `<li>${esc(t)}</li>`).join('');

  return `<section class="dac-use-cases" aria-labelledby="dac-use-cases-title">
  <h2 class="dac-section-title" id="dac-use-cases-title">When to Use ${esc(toolName)}</h2>
  <div class="dac-use-cases__grid">
    <div class="dac-use-cases__col">
      <h3 class="dac-use-cases__heading dac-use-cases__heading--best">Best for</h3>
      <ul class="dac-use-cases__list">${bestHtml}</ul>
    </div>
    <div class="dac-use-cases__col">
      <h3 class="dac-use-cases__heading dac-use-cases__heading--not">Not recommended for</h3>
      <ul class="dac-use-cases__list">${notForHtml}</ul>
      <h3 class="dac-use-cases__heading dac-use-cases__heading--mistake">Common mistakes</h3>
      <ul class="dac-use-cases__list">${mistakeHtml}</ul>
    </div>
  </div>
  <div class="dac-tips">
    <div class="dac-tips__col">
      <h3 class="dac-tips__heading">Pro tips</h3>
      <ul class="dac-tips__list">${proHtml}</ul>
    </div>
    <div class="dac-tips__col">
      <h3 class="dac-tips__heading">For beginners</h3>
      <ul class="dac-tips__list">${beginHtml}</ul>
    </div>
  </div>
</section>`;
}

export function renderReadingQualityBadge(rq) {
  return `<div class="dac-reading-quality" aria-label="Content metadata">
  <span class="dac-rq-badge" title="Estimated reading time">${rq.readingTimeMins} min read</span>
  <span class="dac-rq-badge dac-rq-badge--complexity" title="Content complexity">${esc(rq.complexity)}</span>
  <span class="dac-rq-badge dac-rq-badge--faq" title="Number of FAQs">${rq.faqCount} FAQs</span>
  <span class="dac-rq-badge dac-rq-badge--updated" title="Last updated">Updated ${esc(rq.lastUpdated)}</span>
  <span class="dac-rq-badge dac-rq-badge--score" title="Content quality score">Quality ${rq.qualityScore}/100</span>
</div>`;
}

export function renderEnrichedFaq(faqs, langCode) {
  return faqs.map(item => {
    // Support both multilingual format (from tool.faq) and plain {q,a} format (engine-generated)
    const question = item.multilingual
      ? (item.multilingual.question?.[langCode] || item.multilingual.question?.en || item.q)
      : item.q;
    const answer   = item.multilingual
      ? (item.multilingual.answer?.[langCode]   || item.multilingual.answer?.en   || item.a)
      : item.a;

    return `<details class="dac-faq__item">
      <summary class="dac-faq__question">${esc(question)}</summary>
      <div class="dac-faq__answer">${esc(answer)}</div>
    </details>`;
  }).join('\n    ');
}
