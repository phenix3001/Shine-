import { supabase } from './supabase';
import { catalogJewelryCategories } from './jewelry';

export type SellerProduct = {
  id: string;
  name: string;
  brand: string;
  description: string;
  price: number;
  category: string;
  image_url: string | null;
  source_sku: string | null;
  views_count: number;
  rating: number;
  discount_percent: number;
  publication_status: ProductPublicationStatus;
  created_at: string;
};

export type ProductPublicationStatus = 'draft' | 'published' | 'out_of_stock';
export type NewSellerProduct = Omit<SellerProduct, 'id' | 'created_at' | 'views_count' | 'rating' | 'discount_percent'>;
export type CatalogSort = 'popular' | 'price-asc' | 'price-desc' | 'newest' | 'rating' | 'discount';

export type CatalogFilters = {
  search: string;
  category: string;
  manufacturer: string;
  minPrice: number | null;
  maxPrice: number | null;
  sort: CatalogSort;
};

const productFields = 'id, name, brand, description, price, category, image_url, source_sku, views_count, rating, discount_percent, publication_status, created_at';

export async function loadSellerProducts(userId: string, offset: number, limit: number) {
  const { data, error, count } = await supabase
    .from('seller_products')
    .select(productFields, { count: 'exact' })
    .eq('user_id', userId)
    .in('category', catalogJewelryCategories)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { products: data as SellerProduct[], total: count ?? 0 };
}

export async function loadCatalogProducts(filters: CatalogFilters, offset: number, limit: number) {
  let request = supabase
    .from('seller_products')
    .select(productFields, { count: 'exact' })
    .in('category', catalogJewelryCategories)
    .eq('publication_status', 'published');

  if (filters.search.trim()) request = request.ilike('name', `%${filters.search.trim()}%`);
  if (filters.category !== 'All') request = request.eq('category', filters.category);
  if (filters.manufacturer !== 'All') request = request.eq('brand', filters.manufacturer);
  if (filters.minPrice !== null) request = request.gte('price', filters.minPrice);
  if (filters.maxPrice !== null) request = request.lte('price', filters.maxPrice);

  if (filters.sort === 'price-asc') request = request.order('price', { ascending: true });
  else if (filters.sort === 'price-desc') request = request.order('price', { ascending: false });
  else if (filters.sort === 'newest') request = request.order('created_at', { ascending: false });
  else if (filters.sort === 'rating') request = request.order('rating', { ascending: false }).order('views_count', { ascending: false });
  else if (filters.sort === 'discount') request = request.order('discount_percent', { ascending: false }).order('views_count', { ascending: false });
  else request = request.order('views_count', { ascending: false }).order('name');

  request = request.range(offset, offset + limit - 1);
  const { data, error, count } = await request;
  if (error) throw error;
  return { products: data as SellerProduct[], total: count ?? 0 };
}

export async function loadCatalogBrands() {
  const { data, error } = await supabase.rpc('get_seller_product_brands');
  if (error) throw error;
  return (data as Array<{ brand: string }>).map((row) => row.brand);
}

export async function loadProductById(id: string) {
  const { data, error } = await supabase
    .from('seller_products')
    .select(productFields)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as SellerProduct | null;
}

export async function incrementProductView(id: string) {
  const { error } = await supabase.rpc('increment_product_view', { product_id: id });
  if (error) throw error;
}

export async function createSellerProduct(product: NewSellerProduct) {
  const { data, error } = await supabase
    .from('seller_products')
    .upsert(product, { onConflict: 'user_id,source_sku' })
    .select(productFields)
    .single();

  if (error) throw error;
  return data as SellerProduct;
}

export async function importSellerProducts(
  userId: string,
  products: NewSellerProduct[],
  onProgress: (processed: number) => void,
) {
  const batchSize = 200;
  const uniqueProducts = [...new Map(products.map((product) => [product.source_sku, product])).values()];
  for (let start = 0; start < uniqueProducts.length; start += batchSize) {
    const batch = uniqueProducts.slice(start, start + batchSize).map((product) => ({ ...product, user_id: userId }));
    const { error } = await supabase
      .from('seller_products')
      .upsert(batch, { onConflict: 'user_id,source_sku' });
    if (error) throw error;
    onProgress(Math.min(start + batch.length, uniqueProducts.length));
  }
}

export async function deleteSellerProduct(id: string) {
  const { error } = await supabase.from('seller_products').delete().eq('id', id);
  if (error) throw error;
}

export async function updateSellerProductStatus(id: string, publicationStatus: ProductPublicationStatus) {
  const { error } = await supabase
    .from('seller_products')
    .update({ publication_status: publicationStatus })
    .eq('id', id);
  if (error) throw error;
}
