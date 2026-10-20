import { supabase } from './supabase';
import type { SellerProduct } from './sellerProducts';

const joinedProductFields = 'id, name, brand, description, price, category, image_url, source_sku, views_count, rating, discount_percent, publication_status, is_silver, created_at';
type ProductRow = { seller_products: SellerProduct };

export async function loadFavoriteProductIds() {
  const { data, error } = await supabase.from('product_favorites').select('product_id').abortSignal(AbortSignal.timeout(15_000));
  if (error) throw error;
  return data.map((row) => row.product_id as string);
}

export async function loadFavoriteProducts(offset: number, limit: number) {
  const { data, error, count } = await supabase
    .from('product_favorites')
    .select(`seller_products!inner(${joinedProductFields})`, { count: 'exact' })
    .eq('seller_products.is_silver', true).eq('seller_products.publication_status', 'published')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1).abortSignal(AbortSignal.timeout(15_000));
  if (error) throw error;
  return { products: (data as unknown as ProductRow[]).map((row) => row.seller_products), total: count ?? 0 };
}

export async function loadViewedProducts(offset: number, limit: number) {
  const { data, error, count } = await supabase
    .from('product_history')
    .select(`seller_products!inner(${joinedProductFields})`, { count: 'exact' })
    .eq('seller_products.is_silver', true).eq('seller_products.publication_status', 'published')
    .order('viewed_at', { ascending: false })
    .range(offset, offset + limit - 1).abortSignal(AbortSignal.timeout(15_000));
  if (error) throw error;
  return { products: (data as unknown as ProductRow[]).map((row) => row.seller_products), total: count ?? 0 };
}

export async function setFavorite(userId: string, productId: string, isFavorite: boolean) {
  const request = isFavorite
    ? supabase.from('product_favorites').upsert({ user_id: userId, product_id: productId }, { onConflict: 'user_id,product_id', ignoreDuplicates: true })
    : supabase.from('product_favorites').delete().eq('user_id', userId).eq('product_id', productId);
  const { error } = await request;
  if (error) throw error;
}
