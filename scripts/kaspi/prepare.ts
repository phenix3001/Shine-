import { mkdir, open, readFile, unlink } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { parseArgs } from 'node:util';
import { setTimeout as pause } from 'node:timers/promises';
import { download } from './network.ts';
import { parseProduct, productId, productUrl } from './parser.ts';
import { loadState, saveJson, saveProduct } from './storage.ts';

const { values } = parseArgs({ options: {
  url: { type: 'string', multiple: true }, links: { type: 'string' },
  limit: { type: 'string', default: '5' }, help: { type: 'boolean' },
} });
if (values.help || (!values.url && !values.links)) {
  console.log('Usage: npm run kaspi:prepare -- --url https://kaspi.kz/shop/p/.../ [--limit 5]\nOr --links products.txt (one product URL per line). Preparation only; no site/database writes.');
  process.exit(values.help ? 0 : 1);
}
const limit = Number(values.limit);
if (!Number.isSafeInteger(limit) || limit < 1 || limit > 20_000) throw new Error('Limit must be between 1 and 20000');
const lines = values.links ? (await readFile(values.links, 'utf8')).split(/\r?\n/).map((line) => line.trim()).filter(Boolean) : [];
const urls = [...new Map([...values.url ?? [], ...lines].map((url) => [productId(url), productUrl(url).href])).values()];
const directory = resolve('kaspi-staging');
await mkdir(directory, { recursive: true });
const lockPath = join(directory, 'run.lock');
const lock = await open(lockPath, 'wx').catch(() => { throw new Error('Another run may be active. See scripts/kaspi/README.md'); });
let stopped = false;
process.on('SIGINT', () => { stopped = true; console.log('\nStopping after the current product; progress will be saved.'); });
try {
  const state = await loadState(directory);
  state.stage = 'preparing';
  state.total = urls.length;
  const queue = urls.filter((url) => !state.products[productId(url)]).slice(0, limit);
  const started = Date.now();
  let processed = 0;
  async function progress(message: string) {
    state.updatedAt = new Date().toISOString();
    await saveJson(join(directory, 'progress.json'), state);
    const completed = urls.filter((url) => state.products[productId(url)]).length;
    const photos = urls.reduce((sum, url) => sum + (state.products[productId(url)]?.images ?? 0), 0);
    const speed = processed ? processed / ((Date.now() - started) / 60_000) : 0;
    const remaining = speed && completed < urls.length ? `~${Math.ceil((urls.length - completed) / speed)} min remaining` : 'ETA: —';
    const percent = urls.length ? Math.round(completed / urls.length * 100) : 0;
    const errors = urls.filter((url) => state.errors[productId(url)]).length;
    console.log(`${completed}/${urls.length} products (${percent}%) | ${photos} saved photos | ${errors} errors | ${speed.toFixed(1)}/min | ${remaining} | ${message}`);
  }
  await progress(`Preparation started; up to ${queue.length} new products this run`);
  for (const url of queue) {
    if (stopped) break;
    const id = productId(url);
    try {
      const page = await download(url);
      const product = parseProduct(new TextDecoder().decode(page.bytes), url);
      let images = 0;
      await saveProduct(directory, product, () => console.log(`  ${id}: photo ${++images}/${product.imageUrls.length}`));
      state.products[id] = { name: product.name, images };
      delete state.errors[id];
      processed++;
      await progress(`Prepared ${id}: ${product.name}`);
    } catch (error) {
      state.errors[id] = error instanceof Error ? error.message : 'Unknown error';
      await progress(`Failed ${id}: ${state.errors[id]}`);
      if (/HTTP (401|403|429)/.test(state.errors[id])) { stopped = true; break; }
    }
    if (!stopped) await pause(2000);
  }
  state.stage = urls.every((url) => state.products[productId(url)]) ? 'finished' : 'stopped';
  await progress(`Stage: ${state.stage}. Files: ${directory}. Uploaded to site: 0.`);
  if (urls.some((url) => state.errors[productId(url)])) process.exitCode = 1;
} finally {
  await lock.close();
  await unlink(lockPath);
}
