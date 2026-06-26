import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../../../');

export async function loadConfig() {
  const raw = await readFile(path.join(ROOT, 'data/config.json'), 'utf8');
  const config = JSON.parse(raw);
  config._root = ROOT;
  config._dataDir = path.join(ROOT, 'data');
  config._distDir = path.join(ROOT, config.build.outputDir);
  config._assetsDir = path.join(ROOT, config.build.assetsDir);
  config._templatesDir = path.join(ROOT, 'templates');
  return config;
}
