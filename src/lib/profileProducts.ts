import { supabase } from './supabase';
import type { SellerProduct } from './sellerProducts';

const joinedProductFields = 'id, name, brand, description, price, category, image_url, source_sku, views_count, rating, discount_percent, created_at';
type ProductRow = { seller_products: SellerProduct };

export async function loadFavoriteProductIds() {
  const { data, error } = await supabase.from('product_favorites').select('product_id');
  if (error) throw error;
  return data.map((row) => row.product_id as string);
}

export async function loadFavoriteProducts(offset: number, limit: number) {
  const { data, error, count } = await supabase
    .from('product_favorites')
    .select(`seller_products!inner(${joinedProductFields})`, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return { products: (data as unknown as ProductRow[]).map((row) => row.seller_products), total: count ?? 0 };
}

export async function loadViewedProducts(offset: number, limit: number) {
  const { data, error, count } = await supabase
    .from('product_history')
    .select(`seller_products!inner(${joinedProductFields})`, { count: 'exact' })
    .order('viewed_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return { products: (data as unknown as ProductRow[]).map((row) => row.seller_products), total: count ?? 0 };
}

export async function setFavorite(userId: string, productId: string, isFavorite: boolean) {
  const request = isFavorite
    ? supabase.from('product_favorites').upsert({ user_id: userId, product_id: productId })
    : supabase.from('product_favorites').delete().eq('user_id', userId).eq('product_id', productId);
  const { error } = await request;
  if (error) throw error;
}

export async function recordProductView(userId: string, productId: string) {
  const { error } = await supabase.from('product_history').upsert(
    { user_id: userId, product_id: productId, viewed_at: new Date().toISOString() },
    { onConflict: 'user_id,product_id' },
  );
  if (error) throw error;
}
