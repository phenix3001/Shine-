import assert from 'node:assert/strict';
import { test } from 'node:test';
import { adjacentCatalogPages, CatalogPageCache } from '../src/lib/catalogPageCache.ts';

test('preloads only existing previous and next pages', () => {
  assert.deepEqual(adjacentCatalogPages(0, 72, 24), [1]);
  assert.deepEqual(adjacentCatalogPages(1, 72, 24), [0, 2]);
  assert.deepEqual(adjacentCatalogPages(2, 72, 24), [1]);
  assert.deepEqual(adjacentCatalogPages(0, 0, 24), []);
  assert.deepEqual(adjacentCatalogPages(0, 24, 24), []);
  assert.deepEqual(adjacentCatalogPages(1, 25, 24), [0]);
});

test('switching to a prefetched page reuses its data without another request', async () => {
  let requests = 0;
  const cache = new CatalogPageCache(async (page) => { requests++; return { products: [], total: 72 + page }; });
  const prefetched = await cache.load(1);
  assert.equal(await cache.load(1), prefetched);
  assert.equal(requests, 1);
});

test('navigation shares an unfinished prefetch instead of duplicating it', async () => {
  let complete = () => {};
  let requests = 0;
  const cache = new CatalogPageCache(async () => {
    requests++;
    await new Promise<void>((resolve) => { complete = resolve; });
    return { products: [], total: 72 };
  });
  const prefetch = cache.load(1);
  const navigation = cache.load(1);
  assert.equal(prefetch, navigation);
  complete();
  await navigation;
  assert.equal(requests, 1);
});

test('expired pages and explicit retries request current catalog data', async (context) => {
  let clock = 1000;
  context.mock.method(Date, 'now', () => clock);
  let requests = 0;
  const cache = new CatalogPageCache(async () => ({ products: [], total: ++requests }));
  await cache.load(0);
  clock += 59_999;
  await cache.load(0);
  assert.equal(requests, 1);
  clock++;
  assert.equal(cache.isFresh(0), false);
  await cache.load(0);
  assert.equal(requests, 2);
  cache.invalidate(0);
  assert.ok(cache.get(0), 'Keep the last result available if retry fails');
  await cache.load(0);
  assert.equal(requests, 3);
});

test('failed background requests can retry without discarding successful pages', async () => {
  let fail = true;
  const cache = new CatalogPageCache(async (page) => {
    if (page === 1 && fail) throw new Error('Network unavailable');
    return { products: [], total: 72 };
  });
  await cache.load(0);
  await assert.rejects(cache.load(1), /Network unavailable/);
  assert.equal(cache.isFresh(0), true);
  fail = false;
  await cache.load(1);
  assert.equal(cache.isFresh(1), true);
});

test('changing filters aborts old requests and prevents stale cache writes', async () => {
  let complete = () => {};
  let previousSignal: AbortSignal | undefined;
  let requestCount = 0;
  const cache = new CatalogPageCache(async (_page, signal) => {
    if (++requestCount === 1) {
      previousSignal = signal;
      await new Promise<void>((resolve) => { complete = resolve; });
    }
    return { products: [], total: requestCount };
  });
  const oldRequest = cache.load(0);
  const rejected = assert.rejects(oldRequest, { name: 'AbortError' });
  cache.abort();
  assert.equal(previousSignal?.aborted, true);
  const newRequest = cache.load(0);
  complete();
  await rejected;
  await newRequest;
  assert.equal(cache.get(0)?.total, 2);
});

test('memory cache has a fixed page limit', async () => {
  const cache = new CatalogPageCache(async () => ({ products: [], total: 120 }), 2);
  await cache.load(0);
  await cache.load(1);
  await cache.load(2);
  assert.equal(cache.get(0), undefined);
  assert.ok(cache.get(1));
  assert.ok(cache.get(2));
});
