import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as pause } from 'node:timers/promises';
import { download } from './network.ts';
import type { PreparedProduct, PreparationState } from './types.ts';

export async function saveJson(path: string, value: unknown) {
  await writeFile(path + '.tmp', JSON.stringify(value, null, 2));
  for (let attempt = 0; ; attempt++) {
    try { await rename(path + '.tmp', path); break; }
    catch (error) {
      if (attempt >= 9 || !['EPERM', 'EBUSY', 'EACCES'].includes((error as NodeJS.ErrnoException).code ?? '')) throw error;
      await pause(100 * (attempt + 1));
    }
  }
}
export async function loadState(directory: string): Promise<PreparationState> {
  try {
    const state = JSON.parse(await readFile(join(directory, 'progress.json'), 'utf8')) as PreparationState;
    if (state.version !== 1 || !state.products || !state.errors) throw new Error('Invalid progress file');
    return state;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    return { version: 1, stage: 'preparing', startedAt: new Date().toISOString(), updatedAt: '', total: 0, products: {}, errors: {} };
  }
}
export async function saveProduct(directory: string, product: PreparedProduct, onImage: () => void) {
  const folder = join(directory, product.id);
  await mkdir(folder, { recursive: true });
  const images: { source: string; file: string }[] = [];
  for (const [index, url] of product.imageUrls.entries()) {
    const name = `image-${index + 1}`;
    const path = join(folder, name);
    const existing = await stat(path).catch(() => null);
    if (!existing?.size) {
      const image = await download(url, true);
      await writeFile(path + '.tmp', image.bytes);
      await rename(path + '.tmp', path);
    }
    images.push({ source: url, file: name });
    onImage();
  }
  await saveJson(join(folder, 'product.json'), { ...product, images, preparedAt: new Date().toISOString() });
}
