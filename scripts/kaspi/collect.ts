import { mkdir, readFile, open, unlink, writeFile } from 'node:fs/promises';
import { setTimeout as pause } from 'node:timers/promises';
import { spawn } from 'node:child_process';
import { merchantPage, merchantId } from './merchant.ts';
import type { MerchantProduct } from './merchant.ts';
import { catalogPartitions } from './categories.ts';
import type { Partition } from './categories.ts';
import { saveJson } from './storage.ts';
import { repairCategories } from './repairCategories.ts';
import { refreshCategories } from './refreshCategories.ts';

type Manifest = { version: 1; merchant: string; complete: boolean; nextPage: number;
  products: MerchantProduct[]; error?: string; updatedAt: string; expected?: number;
  partitions?: Partition[]; partitionIndex?: number; partitionPage?: number; verifiedIds?: string[] };
await mkdir('kaspi-staging', { recursive: true });
const lock = await open('kaspi-staging/collect.lock', 'wx');
let manifest: Manifest;
try {
  manifest = JSON.parse(await readFile('kaspi-staging/merchant.json', 'utf8')) as Manifest;
  if (manifest.version !== 1 || manifest.merchant !== merchantId || !Array.isArray(manifest.products)) throw new Error('Invalid manifest');
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') { await lock.close(); await unlink('kaspi-staging/collect.lock'); throw error; }
  manifest = { version: 1, merchant: merchantId, complete: false, nextPage: 0, products: [], updatedAt: '' };
}
let stopping = false;
process.on('SIGINT', () => { stopping = true; });
try {
  delete manifest.error;
  manifest.updatedAt = new Date().toISOString();
  await saveJson('kaspi-staging/merchant.json', manifest);
  if (!manifest.partitions) {
    const { total, partitions } = await catalogPartitions();
    Object.assign(manifest, { expected: total, partitions, partitionIndex: 0, partitionPage: 0, verifiedIds: [], complete: false });
    await saveJson('kaspi-staging/merchant.json', manifest);
  }
  const verified = new Set(manifest.verifiedIds);
  const products = new Map(manifest.products.map((product) => [product.id, product]));
  while (manifest.partitionIndex! < manifest.partitions!.length && !stopping) {
    const partition = manifest.partitions![manifest.partitionIndex!];
    const page = await merchantPage(manifest.partitionPage!, partition.id);
    if (!page.length) throw new Error(`Category ${partition.title} ended before expected count`);
    page.forEach((product) => { products.set(product.id, product); verified.add(product.id); });
    manifest.partitionPage!++;
    manifest.nextPage++;
    if (manifest.partitionPage! >= partition.pages) { manifest.partitionIndex!++; manifest.partitionPage = 0; }
    manifest.products = [...products.values()]; manifest.verifiedIds = [...verified];
    manifest.updatedAt = new Date().toISOString();
    await saveJson('kaspi-staging/merchant.json', manifest);
    console.log(`${partition.title}: verified ${verified.size}/${manifest.expected}, discovered ${products.size}`);
    await pause(1500);
  }
  if (!stopping && !manifest.complete) {
    if (verified.size !== manifest.expected) {
      await repairCategories(manifest.partitions!, products, verified, () => stopping, async () => {
        manifest.products = [...products.values()]; manifest.verifiedIds = [...verified];
        manifest.updatedAt = new Date().toISOString();
        await saveJson('kaspi-staging/merchant.json', manifest);
      });
    }
    let current = await catalogPartitions();
    if (current.total !== manifest.expected || current.partitions.some((item) =>
      manifest.partitions!.find((old) => old.id === item.id)?.count !== item.count)) {
      await refreshCategories(manifest.partitions!, current.partitions, products, verified, () => stopping);
      manifest.products = [...products.values()]; manifest.verifiedIds = [...verified];
      manifest.partitions = current.partitions; manifest.expected = current.total;
      manifest.partitionIndex = current.partitions.length; manifest.partitionPage = 0;
      manifest.updatedAt = new Date().toISOString();
      await saveJson('kaspi-staging/merchant.json', manifest);
      current = await catalogPartitions();
    }
    if (verified.size !== manifest.expected || current.total !== manifest.expected) throw new Error(`Catalog count mismatch: verified ${verified.size}, expected ${manifest.expected}, current ${current.total}. Replacement blocked.`);
    manifest.products = manifest.products.filter((product) => verified.has(product.id));
    manifest.complete = true; manifest.updatedAt = new Date().toISOString();
    await saveJson('kaspi-staging/merchant.json', manifest);
  }
} catch (error) {
  manifest.error = error instanceof Error ? error.message : 'Unknown error';
  manifest.updatedAt = new Date().toISOString();
  await saveJson('kaspi-staging/merchant.json', manifest);
  console.error(manifest.error); process.exitCode = 1;
} finally {
  await lock.close(); await unlink('kaspi-staging/collect.lock');
}
if (manifest.complete && !stopping && !manifest.error) {
  await writeFile('kaspi-staging/products.txt', manifest.products.map((product) => product.url).join('\n'));
  const preparing = await readFile('kaspi-staging/run.lock').then(() => true, (error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return false;
    throw error;
  });
  if (preparing) { console.log('Catalog verified. Photo preparation is already running.'); process.exit(0); }
  const child = spawn(process.execPath, ['scripts/kaspi/prepare.ts', '--links', 'kaspi-staging/products.txt', '--limit', '20000'], { stdio: 'inherit', windowsHide: true });
  child.on('exit', (code) => { process.exitCode = code ?? 1; });
}
