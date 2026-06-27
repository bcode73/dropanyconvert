import { readFile, readdir, access } from 'fs/promises';
import path from 'path';

async function loadJsonDir(dir) {
  try {
    await access(dir);
  } catch {
    return [];
  }
  const files = await readdir(dir);
  return Promise.all(
    files
      .filter(f => f.endsWith('.json'))
      .map(async f => {
        const raw = await readFile(path.join(dir, f), 'utf8');
        return JSON.parse(raw);
      })
  );
}

export async function loadData(config) {
  const dataDir = config._dataDir;

  const [categoriesRaw, languagesRaw, seoGlobalRaw, adsRaw, legalRaw, analyticsRaw] = await Promise.all([
    readFile(path.join(dataDir, 'categories.json'), 'utf8'),
    readFile(path.join(dataDir, 'languages.json'), 'utf8'),
    readFile(path.join(dataDir, 'seo.global.json'), 'utf8'),
    readFile(path.join(dataDir, 'ads.json'), 'utf8'),
    readFile(path.join(dataDir, 'legal.json'), 'utf8'),
    readFile(path.join(dataDir, 'analytics.json'), 'utf8'),
  ]);

  const categories = JSON.parse(categoriesRaw).categories;
  const languages = JSON.parse(languagesRaw).languages.filter(l => l.enabled);
  const seoGlobal = JSON.parse(seoGlobalRaw);
  const ads = JSON.parse(adsRaw);
  const legal = JSON.parse(legalRaw);
  const analytics = JSON.parse(analyticsRaw);

  const [tools, articles, comparisons, glossary, collections, landings] = await Promise.all([
    loadJsonDir(path.join(dataDir, 'tools')),
    loadJsonDir(path.join(dataDir, 'articles')),
    loadJsonDir(path.join(dataDir, 'comparisons')),
    loadJsonDir(path.join(dataDir, 'glossary')),
    loadJsonDir(path.join(dataDir, 'collections')),
    loadJsonDir(path.join(dataDir, 'landings')),
  ]);

  return { categories, languages, seoGlobal, ads, legal, analytics, tools, articles, comparisons, glossary, collections, landings };
}
