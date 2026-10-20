import { kaspiJson, merchantId, cityId } from './merchant.ts';

export type Partition = { id: string; count: number; pages: number; title: string };
type CategoryNode = { id: string; count: number; title: string; items?: CategoryNode[] };
export async function catalogPartitions() {
  const query = new URLSearchParams({ q: `:allMerchants:${merchantId}`, text: '', page: '0', ui: 'd', c: cityId });
  const response = await kaspiJson(`/yml/product-view/pl/filters?${query}`) as {
    data: { total: number; limit: number; treeCategory: { items: CategoryNode[] } };
  };
  const { total, limit, treeCategory } = response.data;
  if (!Number.isSafeInteger(total) || total < 1 || !Number.isSafeInteger(limit) || limit < 1) throw new Error('Invalid catalog totals');
  const partitions: Partition[] = [];
  function visit(node: CategoryNode) {
    if (node.items?.length) node.items.forEach(visit);
    else if (node.count > 0 && node.id.startsWith(':category:')) {
      partitions.push({ id: node.id, count: node.count, pages: Math.ceil(node.count / limit), title: node.title });
    }
  }
  treeCategory.items.forEach(visit);
  if (partitions.reduce((sum, partition) => sum + partition.count, 0) !== total) throw new Error('Category counts do not cover the entire store');
  return { total, partitions };
}
