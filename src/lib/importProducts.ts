import { supabase } from './supabase';
import type { NewSellerProduct } from './sellerProducts';

// XML has no photos, description, category detail or publication status.
// Updating only its own fields preserves concurrent edits to those values.
export async function importSellerProducts(
  userId: string, products: NewSellerProduct[], onProgress: (processed: number) => void,
) {
  if (products.some((product) => !product.source_sku?.trim())) throw new Error('Для импорта нужен артикул каждого товара.');
  const unique = [...new Map(products.map((product) => [product.source_sku, product])).values()];
  let processed = 0;
  for (let start = 0; start < unique.length; start += 200) {
    const batch = unique.slice(start, start + 200);
    // ON CONFLICT DO NOTHING: existing records are never replaced by empty XML fields.
    const inserted = await supabase.from('seller_products').upsert(
      batch.map((product) => ({ ...product, user_id: userId })),
      { onConflict: 'user_id,source_sku', ignoreDuplicates: true },
    );
    if (inserted.error) throw inserted.error;
    for (const product of batch) {
      const { error } = await supabase.from('seller_products').update({
        name: product.name, price: product.price,
        ...(product.brand.trim() ? { brand: product.brand } : {}),
      }).eq('user_id', userId).eq('source_sku', product.source_sku!).select('id').single();
      if (error) throw error;
      onProgress(++processed);
    }
  }
}
