import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import type { PreparationState } from './types';
import type { MerchantProduct } from './merchant';

export function kaspiProgress(): Plugin {
  return { name: 'kaspi-local-progress', apply: 'serve', configureServer(server) {
    server.middlewares.use('/__kaspi', async (req, res, next) => {
      if (req.method !== 'GET' || !/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host ?? '')) {
        res.statusCode = 403; res.end(); return;
      }
      const path = (req.url ?? '').split('?')[0];
      res.setHeader('Cache-Control', 'no-store');
      try {
        const root = resolve('kaspi-staging');
        if (path === '/status' || path === '/manifest') {
          const manifest = JSON.parse(await readFile(resolve(root, 'merchant.json'), 'utf8')) as {
            products: MerchantProduct[]; complete: boolean; nextPage: number; error?: string;
            expected?: number; verifiedIds?: string[]; updatedAt?: string;
          };
          const progress = JSON.parse(await readFile(resolve(root, 'progress.json'), 'utf8')) as PreparationState;
          const ids = new Set(manifest.products.map((product) => product.id));
          const prepared = Object.entries(progress.products).filter(([id]) => ids.has(id));
          const verificationDetail = !manifest.complete
            ? await readFile(resolve(root, 'collect.log'), 'utf8').then((log) => log.trim().split(/\r?\n/).at(-1), () => undefined)
            : undefined;
          const status = { found: ids.size, expected: manifest.expected, verified: manifest.verifiedIds?.length,
            pages: manifest.nextPage, complete: manifest.complete,
            prepared: prepared.length, photos: prepared.reduce((sum, [, item]) => sum + item.images, 0),
            errors: Object.keys(progress.errors).filter((id) => ids.has(id)).length,
            error: manifest.error, verificationDetail, updatedAt: manifest.complete ? progress.updatedAt : manifest.updatedAt,
            stage: manifest.complete ? progress.stage : 'collecting',
            ready: manifest.complete && ids.size > 0 && prepared.length === ids.size };
          res.setHeader('Content-Type', 'application/json');
          if (path === '/status') { res.end(JSON.stringify(status)); return; }
          const backups = (await readdir(resolve(root, 'backups'))).filter((name) => /^catalog-[\w.:-]+\.json$/.test(name)).sort();
          const backup = JSON.parse(await readFile(resolve(root, 'backups', backups.at(-1)!), 'utf8')) as { products: { id: string; user_id: string }[] };
          if (new Set(backup.products.map((item) => item.user_id)).size !== 1) throw new Error('Expected one catalog owner');
          res.end(JSON.stringify({ ...status, products: manifest.products, ownerId: backup.products[0].user_id, oldIds: backup.products.map((item) => item.id) }));
          return;
        }
        const product = path.match(/^\/product\/(\d+)$/);
        if (product) {
          res.setHeader('Content-Type', 'application/json');
          res.end(await readFile(resolve(root, product[1], 'product.json'))); return;
        }
        const image = path.match(/^\/image\/(\d+)\/(\d+)$/);
        if (image) {
          const bytes = await readFile(resolve(root, image[1], `image-${image[2]}`));
          const mime = bytes[0] === 0x89 ? 'image/png' : bytes[0] === 0xff ? 'image/jpeg'
            : bytes.subarray(8, 12).toString() === 'WEBP' ? 'image/webp' : 'image/avif';
          res.setHeader('Content-Type', mime); res.end(bytes); return;
        }
        next();
      } catch {
        res.statusCode = 503; res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Данные импорта ещё не готовы. Повторите через несколько секунд.' }));
      }
    });
  } };
}
