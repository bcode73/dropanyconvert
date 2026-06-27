# Contributing to DropAnyConvert

All site content is data-driven. To add or change anything, edit files in `data/` and run the build. No JavaScript knowledge is needed for content changes.

## Running the Build

```bash
node generator/index.js
```

Output goes to `dist/`. The build takes 5–15 seconds depending on hardware.

To verify output without deploying:
```bash
npx serve dist/
```

---

## Adding a Tool

1. Create `data/tools/<slug>.json` using the schema below.
2. Ensure the `category` value matches an entry in `data/categories.json`.
3. Ensure any `relatedTools` slugs exist.
4. Run the build — validation will catch missing references or schema errors.

**Minimal tool schema:**
```json
{
  "toolId": "unique-id",
  "slug": "png-to-jpg",
  "name": "PNG to JPG Converter",
  "category": "image",
  "runtime": "browser",
  "inputFormats": ["png"],
  "outputFormats": ["jpg"],
  "description": "Convert PNG images to JPG format in your browser.",
  "tagline": "Fast, private, no upload required.",
  "faq": [
    {
      "question": "Is it free?",
      "answer": "Yes, completely free with no file size limits."
    }
  ],
  "seo": {
    "primaryKeyword": "PNG to JPG converter",
    "secondaryKeywords": ["convert PNG to JPEG", "image converter"],
    "searchIntent": "commercial"
  },
  "relatedTools": ["jpg-to-png", "png-to-webp"],
  "lastUpdated": "2026-06-27"
}
```

Required fields: `toolId`, `slug`, `name`, `category`, `runtime`, `inputFormats`, `outputFormats`, `description`, `seo`.

---

## Adding a Category

Edit `data/categories.json`. Add an object with `slug`, `name`, and `description`. Ensure at least one tool references this slug in its `category` field.

---

## Adding a Guide (Article)

Create `data/articles/<slug>.json`:
```json
{
  "slug": "how-to-convert-pdf-to-word",
  "title": "How to Convert PDF to Word",
  "description": "Step-by-step guide for converting PDF files to editable Word documents.",
  "content": "...",
  "relatedTools": ["pdf-to-docx"],
  "author": "author-slug",
  "publishedAt": "2026-06-27",
  "lastUpdated": "2026-06-27",
  "readingTime": 5
}
```

The article will be rendered in all 5 languages (en, es, fr, de, pt) using the generator's translation layer.

---

## Adding a Comparison

Create `data/comparisons/<slug>.json`:
```json
{
  "slug": "png-vs-jpg",
  "title": "PNG vs JPG — Which Format Should You Use?",
  "formatA": "png",
  "formatB": "jpg",
  "description": "...",
  "relatedTools": ["png-to-jpg"],
  "lastUpdated": "2026-06-27"
}
```

---

## Adding a Glossary Entry

Create `data/glossary/<slug>.json`:
```json
{
  "slug": "lossless-compression",
  "term": "Lossless Compression",
  "definition": "A data compression method that preserves all original data exactly.",
  "relatedFormats": ["png", "gif", "webp"],
  "lastUpdated": "2026-06-27"
}
```

---

## Adding a Language

1. Add to `data/languages.json`: `{ "code": "ja", "name": "Japanese", "dir": "ltr" }`
2. Add translated strings to `data/i18n/ja.json` (copy from `en.json` as template)
3. Run the build — all existing tool and content routes will be generated for the new language

---

## Adding a File Format Entity

Create `data/entities/<slug>.json` with fields: `slug`, `name`, `mime`, `extensions`, `description`, `pros`, `cons`, `useCases`, `relatedFormats`.

This data feeds both the entity SEO pages and the dataset engine's `formats.json` output.

---

## Validation

The build validates:
- Schema correctness (all required fields present)
- Referential integrity (no broken tool/article/category slugs)
- SEO quality (title/desc lengths, no duplicates)
- Route uniqueness (no duplicate paths)
- Dataset consistency (no duplicate MIME types)
- Indexing readiness (canonical URLs, sitemap coverage)

**Build fails** on hard errors. **Warnings** are printed but do not stop the build.

After the build, check `build-report.json` for detailed diagnostics.

---

## Code Style

The generator uses Node.js ESM (`import`/`export`). No transpilation step.

- One responsibility per module in `generator/lib/`
- Pure functions where possible — inputs in, output out, no side effects
- `djb2(str)` from `content-engine.js` for deterministic seeding (don't reimplement)
- No new npm dependencies — use Node.js built-ins only
- No API keys, secrets, or credentials anywhere in the codebase

---

## Deployment

The `dist/` folder is a self-contained static site. Deploy to any CDN:

- **Cloudflare Pages**: `wrangler pages deploy dist/`
- **Netlify**: point build output to `dist/`
- **Vercel**: `vercel --prod` (vercel.json already configured)
- **GitHub Pages**: push `dist/` to `gh-pages` branch

Headers are configured in `dist/_headers` (Cloudflare/Netlify format).
