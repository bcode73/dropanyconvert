# DropAnyConvert — Architecture

## Overview

DropAnyConvert is a **100% static** file conversion platform. All pages are pre-rendered at build time by a Node.js generator. There is no server-side runtime, no database, and no build-time network requests. Conversions run entirely in the user's browser using native Web APIs and bundled WASM engines.

```
data/ (JSON)  ──►  generator/  ──►  dist/ (static HTML/JSON/txt)
                        │
                   engines/ (WASM)  ──►  bundled into dist/assets/
```

---

## Folder Structure

```
/
├── generator/
│   ├── index.js              # Build entry point — orchestrates all 26+ phases
│   └── lib/
│       ├── config.js         # Load site config (site.json)
│       ├── loader.js         # Load all data files from data/
│       ├── validator.js      # Schema + referential integrity checks
│       ├── registry.js       # Route registry builder
│       ├── router.js         # Generate all routes (lang × content)
│       ├── seo.js            # SEO metadata per route (title, desc, OG, schema)
│       ├── seo-validator.js  # Post-generation SEO quality gate
│       ├── seo-sweep.js      # Phase 25 — link health, metadata polish, crawl hints
│       ├── linker.js         # Authority-weighted internal link generation
│       ├── page-generator.js # HTML rendering (~4,200 lines, all page types)
│       ├── content-engine.js # Phase 23 — FAQ generation, reading quality, djb2 hash
│       ├── duplicate-detector.js  # Jaccard similarity duplicate content detection
│       ├── authority.js      # PageRank-style authority graph over all content nodes
│       ├── freshness.js      # Content freshness scoring + staleness detection
│       ├── sitemap.js        # Sitemap XML generation (index + per-lang)
│       ├── robots.js         # robots.txt
│       ├── static-files.js   # humans.txt, security.txt, browserconfig.xml, webmanifest
│       ├── indexing-validator.js  # Search Console / indexing readiness checks
│       ├── llms.js           # /llms.txt and /ai.txt for AI discoverability
│       ├── openapi-generator.js   # OpenAPI 3.1 spec (openapi.json)
│       ├── api-doc-generator.js   # 550 developer doc pages + search index
│       ├── api-validator.js  # API doc consistency validation
│       ├── dashboard-generator.js # Premium dashboard HTML shells
│       ├── dataset-engine.js # Phase 24 — 8 research/AI dataset JSON files
│       ├── dataset-validator.js   # Dataset consistency checks
│       ├── build-auditor.js  # Phase 26 — module audit, health score (0–100)
│       ├── reporter.js       # Build report → build-report.json + console summary
│       ├── emitter.js        # Write all files to dist/
│       ├── ads.js            # Ad block rendering helpers
│       ├── premium-validator.js   # Premium architecture validation
│       └── premium/          # 10 premium foundation modules (plans, auth, payments…)
│           ├── plans.js
│           ├── auth.js
│           ├── payments.js
│           ├── storage.js
│           ├── usage.js
│           ├── webhooks.js
│           ├── email.js
│           ├── api-keys.js
│           ├── team.js
│           └── compliance.js
├── data/
│   ├── tools/                # One JSON file per tool (82 tools)
│   ├── categories.json
│   ├── languages.json        # 5 languages: en, es, fr, de, pt
│   ├── articles/             # Long-form guides
│   ├── comparisons/          # Head-to-head format comparisons
│   ├── glossary/             # File format glossary entries
│   ├── entities/             # File format knowledge entities (17 formats)
│   ├── collections/          # Curated tool collections
│   ├── authors.json
│   ├── intents.json          # Search intent clusters for programmatic SEO
│   ├── platforms.json        # Platform-specific intent pages
│   ├── seo-global.json       # Global SEO defaults
│   └── ads.json              # Ad placement configuration
├── assets/
│   ├── css/
│   │   ├── main.css          # Core styles
│   │   └── article.css       # Long-form content styles
│   └── js/
│       ├── runtime.js        # Core interactivity (upload, convert, download)
│       ├── platform.js       # Platform detection + premium feature stubs
│       ├── analytics.js      # Privacy-first analytics
│       ├── developer-runtime.js  # API playground / code examples
│       └── vendor/           # Bundled WASM engine wrappers
├── engines/                  # Browser-side conversion engine sources
├── dist/                     # Build output (git-ignored)
├── ARCHITECTURE.md           # This file
├── CONTRIBUTING.md
├── ROADMAP.md
├── CHANGELOG.md
└── BUILD_ARCHITECTURE.json   # Machine-readable pipeline manifest
```

---

## Build Pipeline

The generator runs as a single-process Node.js script (`generator/index.js`). Phases execute sequentially; within each phase, independent sub-tasks run in parallel via `Promise.all`.

| # | Phase | Key output |
|---|-------|-----------|
| 1 | Load config | `config` object |
| 2 | Load data | `data` (tools, languages, articles, …) |
| 3 | Validate data | Schema + referential integrity errors |
| 4 | Build registry | Route registry (`registry.routes`) |
| 5 | Generate routes | Full route list (1,226+ routes) |
| 5a | Validate routes | Route integrity check |
| 6 | Generate SEO | `seoData` Map per route |
| 6a | Freshness engine | Stale content detection |
| 6b | Authority graph | PageRank-style node authority scores |
| 7 | Internal links | Authority-weighted `links` per route |
| 8a | SEO validation | Post-generation SEO quality gate |
| 8b | Generate pages | HTML for all routes |
| 8c | Content quality | Duplicate detection, FAQ enrichment stats |
| 9 | Sitemaps | Sitemap XML (index + per-language) |
| 10 | robots.txt | |
| 10a | Static files | humans.txt, security.txt, webmanifest |
| 10b | Indexing validation | Search Console readiness |
| 11c | Premium validation | Architecture consistency check |
| 11d | Dashboard pages | Premium dashboard HTML shells |
| 11e | API ecosystem | OpenAPI spec, doc pages, search index |
| 11f | Dataset engine | 8 research JSON dataset files |
| 11 | AI discoverability | /llms.txt, /ai.txt |
| 12 | Emit dist | Write all files to `dist/` |
| 12a | SEO sweep | Link health, metadata polish, crawl hints |
| 12b | Build audit | Module audit, health score |
| 13 | Build report | `build-report.json`, console summary |

---

## Data Flow

```
data/tools/*.json
      │
      ▼
loadData()  ─────────────────────────────────────────────┐
      │                                                   │
      ▼                                                   ▼
validateData()                                     buildRegistry()
      │                                                   │
      └──────────────────┬────────────────────────────────┘
                         ▼
                   generateRoutes()
                         │
              ┌──────────┼──────────────┐
              ▼          ▼              ▼
         generateSeo()  enrichTool()  buildAuthorityGraph()
              │          │              │
              └──────────┼──────────────┘
                         ▼
                generateInternalLinks()
                         │
                         ▼
                   generatePages()  ──►  HTML files
                         │
               ┌─────────┼─────────┐
               ▼         ▼         ▼
          sitemaps   robots.txt  dataset files
               │
               ▼
            emitDist()  ──►  dist/
```

---

## Route Generation

Routes are the atomic unit of the build. Each route becomes exactly one output file. Routes are generated by multiplying content across languages:

```
82 tools × 5 languages       = 410 tool routes
+ category pages × 5 langs
+ home pages × 5 langs
+ articles × 5 langs
+ comparisons × 5 langs
+ glossary × 5 langs
+ intent/platform/use-case/feature pages
+ API doc pages (language-independent)
+ dashboard pages × 5 langs
≈ 1,814 emitted files
```

Each route object carries: `{ type, path, lang, tool?, article?, slug, ... }`

---

## SEO Pipeline

1. `seo.js` — generates per-route metadata: `title`, `description`, `h1`, `ogTitle`, `ogDescription`, `twitterTitle`, `breadcrumbs`, `schemas` (JSON-LD), `canonicalUrl`, `hreflang`, `searchIntent`
2. `seo-validator.js` — checks title/desc length, duplicate titles, missing fields; **build fails on errors**
3. `seo-sweep.js` — post-emit audit: link health (broken hrefs, empty hrefs, duplicate IDs), metadata polish (length ranges), crawl hints (prev/next for article sequences, canonical consistency); **warnings only**

---

## Authority Graph

`authority.js` implements a simplified PageRank over all content nodes:

- Nodes: tools, articles, comparisons, glossary entries, entities, collections
- Edges: `relatedTools`, `relatedArticles`, cross-content references
- Authority propagates from high-link-count nodes outward
- `linker.js` uses authority scores to determine internal link quotas per page type

---

## Content Engine (Phase 23)

`content-engine.js` enriches each tool at build time:

- `enrichTool(tool, data)` — generates FAQs, use cases, reading quality score, word count estimate
- `djb2(str)` — deterministic hash for seeding content variation (exported, shared across modules)
- `deduplicateFaqs(faqs)` — 5-word stem dedup to remove near-duplicate FAQ entries
- `buildFaqSchema(faqs)` — generates FAQPage JSON-LD schema

Page generator uses `enrichmentCache` (module-level Map) to avoid re-running enrichment per language.

---

## Dataset Engine (Phase 24)

`dataset-engine.js` generates 8 static JSON files for researchers and AI training:

| File | Contents |
|------|----------|
| `formats.json` | 17 file format specs with MIME, extensions, capabilities |
| `conversion-matrix.json` | All supported conversion pairs |
| `capabilities.json` | Per-tool capability database |
| `comparisons.json` | Head-to-head format comparisons |
| `recommendations.json` | Use-case-based format recommendation rules |
| `search-index.json` | Full-text search index for all formats |
| `knowledge-graph.json` | Semantic relationship graph |
| `training-dataset.json` | AI/ML training corpus |

---

## Premium Foundation (Phase 21)

The `generator/lib/premium/` directory contains 10 foundation modules that define the **interface** for future premium features. These are **build-time only** — they define data shapes, validation logic, and page shells. No runtime server code exists yet.

Modules: plans, auth, payments, storage, usage, webhooks, email, api-keys, team, compliance.

---

## Validation Gates

Three levels of validation exist:

1. **Hard failures** (exit 1): `validateData`, `validateRoutes`, `validateSeo`, `validateIndexingReadiness`, `validateApiDocs`
2. **Soft warnings** (logged, continued): `validateSeo` warnings, `validateIndexingReadiness` warnings, `validateDatasets`, `validatePremiumArchitecture`, `runBuildAudit`
3. **Report-only**: SEO sweep metrics, duplicate content detection, content quality stats

---

## Key Design Constraints

- **No runtime server** — all output is static files deployable to any CDN
- **No API keys in source** — conversion engines run in the browser; no credentials anywhere in the generator or data files
- **No new runtime dependencies** — the generator uses only Node.js built-ins
- **Deterministic output** — given the same `data/`, two builds produce identical `dist/`
- **Zero URL changes after Phase 10** — all URL patterns are locked; no redirects needed
- **Generator-first** — all new features are implemented as build-time generation, not client-side fetches
