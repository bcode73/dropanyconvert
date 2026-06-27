import { readFile, readdir } from 'fs/promises';
import path from 'path';

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

  const toolFiles = await readdir(path.join(dataDir, 'tools'));
  const tools = await Promise.all(
    toolFiles
      .filter(f => f.endsWith('.json'))
      .map(async f => {
        const raw = await readFile(path.join(dataDir, 'tools', f), 'utf8');
        return JSON.parse(raw);
      })
  );

  return { categories, languages, seoGlobal, ads, legal, analytics, tools };
}
