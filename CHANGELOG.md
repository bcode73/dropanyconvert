# Changelog

All notable changes to DropAnyConvert are documented here. Entries are grouped by build phase.

---

## Phase 27 — Architecture Documentation & Contributor Experience
_2026-06-27_

- Created `ARCHITECTURE.md` — full generator pipeline, folder structure, data flow, all subsystems
- Created `CONTRIBUTING.md` — how to add tools, categories, articles, comparisons, glossary, languages, entities
- Created `ROADMAP.md` — completed phases 1–27, operator roadmap, known limitations
- Created `CHANGELOG.md` — this file
- Created `BUILD_ARCHITECTURE.json` — machine-readable pipeline manifest
- Updated `reporter.js` — added `documentation` block with completeness flags and architecture version
- **Generator frozen** after this phase

---

## Phase 26 — Final Cleanup, Refactor & Build Hygiene
_2026-06-27_

- Removed duplicate `djb2` implementation from `page-generator.js`; now imported from `content-engine.js`
- Removed `export` from `getFreshnessEntry` in `freshness.js` (unused external export)
- Created `generator/lib/build-auditor.js`:
  - Generator module audit (line count, export count, self-import detection)
  - Route audit (duplicate paths, slug uniqueness, lang prefix consistency)
  - Asset audit (JS/CSS/vendor file counts, manifest check)
  - Build performance report (slowest phases, memory estimate)
  - Repository LOC statistics (generator, premium, assets, data)
  - Health score 0–100 graded A–F (architecture 25 + maintainability 20 + build stability 20 + validation 20 + technical debt 15)
- Wired `runBuildAudit` into build pipeline
- Added `build_audit` block to `build-report.json`
- Build health score: 95/100 (A)

---

## Phase 25 — Advanced SEO Sweep & Search Feature Enhancement
_2026-06-27_

- Created `generator/lib/seo-sweep.js`:
  - `validateLinkHealth` — checks broken internal hrefs, empty hrefs, duplicate IDs across all emitted pages; builds valid path set from routes + pages + static assets to eliminate false positives
  - `validateMetadata` — title 30–60 chars, desc 120–160, OG title 20–90, OG desc 60–200
  - `buildCrawlHints` — prev/next pagination for article sequences, canonical URL consistency check
  - `computeSeoSweepMetrics` — aggregate metrics: total links, anchor diversity %, metadata quality %, link health score, pages with prev/next
- Added anchor text diversity to `page-generator.js`: 8 templates, `djb2(caller:slug)` for deterministic variation
- Increased related content quotas in `linker.js`: guides 4–6, glossary 3–5, comparisons 3–5, entities up to 5
- Added FAQPage JSON-LD schema generation and FAQ deduplication (5-word stem)
- Added table of contents auto-generation with smooth-scroll JS (skipped if fewer than 3 headings)
- Added `seo_sweep` block to `build-report.json`
- Fixed 21,843 false positive broken link warnings caused by API doc pages not appearing in route registry

---

## Phase 24 — Dataset Engine, Research Center & AI Training Foundation
_2026-06-27_

- Created `generator/lib/dataset-engine.js`:
  - FORMAT_SPECS for 17 MIME types
  - Conversion matrix from tool input/output declarations
  - Capability database per tool
  - Comparison engine (head-to-head format pairs)
  - Recommendation rules (use-case based)
  - Full-text search index
  - Semantic knowledge graph
  - AI/ML training corpus
  - Emits 8 static JSON files to `dist/`
- Created `generator/lib/dataset-validator.js`:
  - Duplicate MIME type detection
  - Duplicate extension detection
  - Missing required metadata field warnings
  - Broken tool→format reference detection
  - Invalid self-conversion pair detection
- Wired both into build pipeline; added `dataset` block to `build-report.json`
- Fixed crash: `converterTools` is `{input, output}` object, not an array

---

## Phase 23 — Content Quality Engine, Unique Page Generation & Humanization
_2026-06-27_

- Created `generator/lib/content-engine.js`:
  - `enrichTool(tool, data)` — per-tool FAQ generation, use case examples, reading quality score, word count
  - `djb2(str)` — deterministic 32-bit hash for content variation seeding
  - `deduplicateFaqs` — 5-word stem deduplication
  - Module-level `enrichmentCache` Map exposed as `generatePages._enrichmentCache`
- Created `generator/lib/duplicate-detector.js`:
  - Jaccard similarity between tool page descriptions
  - Reports near-duplicate pairs above threshold
- Added content quality stats to build report: avg FAQ count, avg quality score, avg word count, duplicate pairs

---

## Phase 22 — API Platform, Developer Documentation & SDK Ecosystem
_2026-06-27_

- Created `generator/lib/openapi-generator.js` — OpenAPI 3.1 spec with endpoints for all 82 tools
- Created `generator/lib/api-doc-generator.js` — 550 developer doc pages (per-tool API docs, SDK pages, topic pages, search index)
- Created `generator/lib/api-validator.js` — API doc consistency validation (warnings only)
- Dashboard pages emitted for all 5 languages
- Added `api_platform` block to `build-report.json`

---

## Phase 21 — Premium Foundation, User Accounts & Cloud Preparation
_2026-06-27_

- Created `generator/lib/premium/` with 10 foundation modules: plans, auth, payments, storage, usage, webhooks, email, api-keys, team, compliance
- Created `generator/lib/premium-validator.js` — architecture consistency checks
- Created `generator/lib/dashboard-generator.js` — premium dashboard HTML shells
- Premium features are build-time stubs only; no server runtime required yet

---

## Phase 20 — Authority Graph, Crawl Intelligence & Self-Optimizing Internal Link Engine
_2026-06-27_

- Created `generator/lib/authority.js` — PageRank-style authority propagation over all content nodes (tools, articles, comparisons, glossary, entities, collections)
- Updated `generator/lib/linker.js` — uses authority scores to determine per-page internal link quotas
- Added `authority_graph` block to `build-report.json`
- Average authority scores and top-10 most authoritative nodes reported per build

---

## Phase 19 — Search Console & Indexing Readiness
_2026-06-27_

- Created `generator/lib/indexing-validator.js` — validates sitemap coverage, canonical URL format, hreflang consistency, robots.txt correctness, link depth
- Created `generator/lib/static-files.js` — generates humans.txt, security.txt, browserconfig.xml, site.webmanifest
- Added `indexing_readiness` block to `build-report.json`
- Build now fails on indexing readiness errors

---

## Phase 18 — Performance & Core Web Vitals Optimization
_2026-06-27_

- HTML minification (whitespace removal, inline JS/CSS minification)
- JSON-LD minification
- Critical CSS inlined; remaining CSS async-loaded
- All scripts deferred; non-critical JS uses `requestIdleCallback`
- Passive scroll event listeners
- Immutable cache headers for hashed assets
- Added `performance_audit` block to `build-report.json`
- Estimated Lighthouse score: 95–100

---

## Phase 17 — Programmatic Long-Tail SEO & Intent Engine
_2026-06-27_

- Added `data/intents.json` — search intent clusters with modifiers (how-to, online, free, fast, batch, etc.)
- Added `data/platforms.json` — platform-specific pages (Windows, Mac, Linux, iOS, Android)
- Added route types: `intent`, `platform`, `use-case`, `feature`, `format-faq`
- Added `programmatic_seo` block to `build-report.json`

---

## Phase 16 — Authority Graph, Entity SEO & Scale Foundation
_2026-06-27_

- Added `data/entities/` — 17 file format knowledge entities
- Added entity route type (`/en/formats/png/`)
- Added entity index route type
- `search_intent` distribution added to `build-report.json`

---

## Phase 15 — E-E-A-T+, Freshness Engine & Search Dominance
_2026-06-27_

- Created `generator/lib/freshness.js` — tracks `lastUpdated` dates, surfaces stale content
- Added `data/authors.json` — author profiles for E-E-A-T signals
- Added author route type (`/en/authors/jane-doe/`)

---

## Phase 14 — Trust, Authority & AI Discoverability
_2026-06-27_

- Created `generator/lib/llms.js` — generates `/llms.txt` and `/ai.txt` for AI crawler discoverability
- Added trust signals to tool pages (security badges, privacy-first messaging)

---

## Phase 13 — Topical Authority, Internal Linking & Programmatic SEO Expansion
_2026-06-27_

- Created `generator/lib/linker.js` — generates authority-weighted internal links per page
- Added `data/collections/` — curated tool collections (`/en/collections/image-tools/`)
- Added collection and landing route types

---

## Phase 12 — Knowledge Hub
_2026-06-27_

- Added `data/articles/` — long-form guides
- Added `data/comparisons/` — format comparison pages
- Added `data/glossary/` — file format glossary
- New route types: `article`, `comparison`, `glossary`, `guides-index`, `compare-index`, `glossary-index`

---

## Phase 11 — Launch Readiness
_2026-06-27_

- Added legal pages (Privacy Policy, Terms of Service, Disclaimer, Cookie Policy) — route type `legal`
- Added error pages (404, 500)
- Added editorial and changelog route types
- Created `generator/lib/seo-validator.js` — post-generation SEO quality gate (build fails on errors)
- Wired Cloudflare Analytics

---

## Phase 10 — Security, SEO & Distribution Hardening
_2026-06-27_

- Added `_headers` file for Cloudflare Pages (CSP, HSTS, X-Frame-Options, Referrer-Policy)
- Added `netlify.toml`, `vercel.json`, `wrangler.jsonc`
- Added `robots.txt` (previously hardcoded; now generated via `generator/lib/robots.js`)
- URL patterns locked — no further URL changes

---

## Phase 9 — Production Hardening
_2026-06-27_

- Schema validation hardened (required field checks, type checks)
- Build fails fast on missing tool category references
- Error reporting improved with line-level diagnostics

---

## Phase 8 — Developer Tools Factory
_2026-06-27_

- Added 43 browser-only developer tools (Base64, JSON formatter, hash generators, color converters, etc.)
- Tool runtime type: `browser` (no server required)

---

## Phase 7 — Production UX & Platform Polish
_2026-06-27_

- Drag-and-drop file upload
- Progress bar during conversion
- Download button after conversion
- Mobile-responsive layout
- Dark mode support

---

## Phase 6 — PDF Tool Factory
_2026-06-27_

- Added 15 PDF tools (PDF to Word, PDF to PNG, PDF compress, PDF merge, PDF split, etc.)
- PDF conversion using pdf.js and browser PDF APIs

---

## Phase 5 — Universal Document Engine Architecture
_2026-06-27_

- Refactored page generator to support arbitrary content types
- Added category index pages
- Multilingual support (5 languages: en, es, fr, de, pt)

---

## Phase 4 — Image Tool Factory
_2026-06-27_

- Added 24 image conversion tools
- 156 pages generated (24 tools × 5 languages + category pages)
- Image conversion using Canvas API

---

## Phase 3 — Stabilization
_2026-06-27_

- Build pipeline stabilized
- Data schema finalized
- Category and language data structures locked

---

## Phase 2 — Vertical Slice (PNG to JPG)
_2026-06-27_

- End-to-end working tool: PNG to JPG converter
- Build generates HTML, sitemap, robots.txt
- Browser-side Canvas API conversion

---

## Phase 1 — Project Skeleton
_2026-06-27_

- Node.js ESM static site generator
- Data schema designed (`tools`, `categories`, `languages`)
- `generator/index.js` build entry point
- `dist/` output directory
- Basic HTML template
