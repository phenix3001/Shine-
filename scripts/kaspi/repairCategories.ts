import { setTimeout as pause } from 'node:timers/promises';
import { merchantPage, verifyMerchantProducts } from './merchant.ts';
import type { MerchantProduct } from './merchant.ts';
import type { Partition } from './categories.ts';

// A second public sort can recover entries shifted between pages during a scan.
export async function repairCategories(partitions: Partition[], products: Map<string, MerchantProduct>,
  verified: Set<string>, stopped: () => boolean, save: () => Promise<void>) {
  const pending = [...products.values()].filter((product) => !verified.has(product.id));
  for (let offset = 0; offset < pending.length && !stopped(); offset += 12) {
    const confirmed = await verifyMerchantProducts(pending.slice(offset, offset + 12));
    confirmed.forEach((product) => { products.set(product.id, product); verified.add(product.id); });
    await save();
    console.log(`Merchant offers confirmed: ${confirmed.length}, verified total ${verified.size}`);
  }
  for (const partition of partitions) {
    const count = () => [...products.values()].filter((item) => verified.has(item.id) && item.category === partition.title).length;
    if (count() >= partition.count) continue;
    for (let page = 0; page < partition.pages && !stopped(); page++) {
      const batch = await merchantPage(page, partition.id, 'price-asc');
      for (const product of batch) { products.set(product.id, product); verified.add(product.id); }
      await save();
      console.log(`Recheck ${partition.title}: ${count()}/${partition.count}`);
      if (count() >= partition.count) break;
      await pause(1500);
    }
  }
}
