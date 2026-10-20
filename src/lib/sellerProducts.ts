import { supabase } from './supabase';
import { catalogJewelryCategories } from './jewelry';
import type { SpecificationFilters } from './catalogSpecifications';

export type SellerProduct = {
  id: string;
  name: string;
  brand: string;
  description: string;
  price: number;
  category: string;
  image_url: string | null;
  image_urls?: string[];
  specifications?: { group: string; name: string; values: string[] }[];
  kaspi_id?: string | null;
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
  categories: string[];
  manufacturers: string[];
  minPrice: number | null;
  maxPrice: number | null;
  sort: CatalogSort;
  specifications?: SpecificationFilters;
};

const productFields = 'id, name, brand, description, price, category, image_url, image_urls, specifications, kaspi_id, source_sku, views_count, rating, discount_percent, publication_status, created_at';

export async function loadSellerProducts(userId: string, offset: number, limit: number, search = '', status: ProductPublicationStatus | '' = '', signal?: AbortSignal) {
  let request = supabase
    .from('seller_products')
    .select(productFields, { count: 'exact' })
    .eq('user_id', userId)
    .in('category', catalogJewelryCategories)
    .order('created_at', { ascending: false }).order('id')
    .range(offset, offset + limit - 1);
  if (search) request = request.ilike('name', `%${search}%`);
  if (status) request = request.eq('publication_status', status);
  const deadline = AbortSignal.timeout(15_000);
  const { data, error, count } = await request.abortSignal(signal ? AbortSignal.any([signal, deadline]) : deadline);

  if (error) throw error;
  return { products: data as SellerProduct[], total: count ?? 0 };
}

export async function loadCatalogProducts(filters: CatalogFilters, offset: number, limit: number, signal?: AbortSignal) {
  if (filters.sort === 'popular' || Object.values(filters.specifications ?? {}).some((values) => values.length > 0)) {
    const { data, error } = await supabase.rpc('diverse_catalog', {
      filters, page_offset: offset, page_limit: limit,
    }).abortSignal(signal ?? AbortSignal.timeout(15_000));
    if (error) throw error;
    return data as { products: SellerProduct[]; total: number };
  }
  let request = supabase
    .from('seller_products')
    .select(productFields, { count: 'exact' })
    .in('category', catalogJewelryCategories.filter((category) => !filters.categories.length || filters.categories.includes(category)))
    .eq('publication_status', 'published');

  if (filters.search.trim()) request = request.ilike('name', `%${filters.search.trim()}%`);
  if (filters.manufacturers.length) request = request.in('brand', filters.manufacturers);
  if (filters.minPrice !== null) request = request.gte('price', filters.minPrice);
  if (filters.maxPrice !== null) request = request.lte('price', filters.maxPrice);

  if (filters.sort === 'price-asc') request = request.order('price', { ascending: true });
  else if (filters.sort === 'price-desc') request = request.order('price', { ascending: false });
  else if (filters.sort === 'newest') request = request.order('created_at', { ascending: false });
  else if (filters.sort === 'rating') request = request.order('rating', { ascending: false }).order('views_count', { ascending: false });
  else if (filters.sort === 'discount') request = request.order('discount_percent', { ascending: false }).order('views_count', { ascending: false });
  else request = request.order('views_count', { ascending: false }).order('name');

  request = request.order('id').range(offset, offset + limit - 1).abortSignal(signal ?? AbortSignal.timeout(15_000));
  const { data, error, count } = await request;
  if (error) throw error;
  return { products: data as SellerProduct[], total: count ?? 0 };
}

export async function loadProductById(id: string, signal?: AbortSignal) {
  if (!/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id)) return null;
  const { data, error } = await supabase
    .from('seller_products')
    .select(productFields)
    .eq('id', id).abortSignal(signal ?? AbortSignal.timeout(15_000))
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
