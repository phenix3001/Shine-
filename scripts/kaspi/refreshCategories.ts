import { setTimeout as pause } from 'node:timers/promises';
import { merchantPage } from './merchant.ts';
import type { MerchantProduct } from './merchant.ts';
import type { Partition } from './categories.ts';

export async function refreshCategories(previous: Partition[], current: Partition[],
  products: Map<string, MerchantProduct>, verified: Set<string>, stopped: () => boolean) {
  const changed = current.filter((item) => previous.find((old) => old.id === item.id)?.count !== item.count);
  const removed = previous.filter((item) => !current.some((next) => next.id === item.id));
  const replacement = new Map<string, MerchantProduct>();
  for (const partition of changed) {
    for (let page = 0; page < partition.pages; page++) {
      if (stopped()) throw new Error('Catalog refresh stopped; resume later');
      const batch = await merchantPage(page, partition.id);
      batch.forEach((product) => replacement.set(product.id, product));
      console.log(`Refresh ${partition.title}: page ${page + 1}/${partition.pages}`);
      await pause(1500);
    }
    const count = () => [...replacement.values()].filter((product) => product.category === partition.title).length;
    // A second ordering recovers cards shifted between pages while the store changes.
    for (let page = 0; count() < partition.count && page < partition.pages; page++) {
      if (stopped()) throw new Error('Catalog refresh stopped; resume later');
      const batch = await merchantPage(page, partition.id, 'price-asc');
      batch.forEach((product) => replacement.set(product.id, product));
      console.log(`Recover ${partition.title}: ${count()}/${partition.count}, page ${page + 1}`);
      await pause(1500);
    }
    if (count() !== partition.count) throw new Error(`Category changed during refresh: ${partition.title}, found ${count()}, expected ${partition.count}; resume later`);
  }
  const titles = new Set([...changed, ...removed].map((item) => item.title));
  for (const [id, product] of products) {
    if (titles.has(product.category)) { products.delete(id); verified.delete(id); }
  }
  for (const [id, product] of replacement) { products.set(id, product); verified.add(id); }
}
