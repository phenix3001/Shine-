import { supabase } from './supabase';
import { getVisitorId } from './discoveryIdentity';
import { settleProductViews } from './productDiscovery';
import type { SellerProduct } from './sellerProducts';

export async function loadRecommendations(excludedIds: string[], seed: string, signal: AbortSignal): Promise<SellerProduct[]> {
  await settleProductViews();
  signal.throwIfAborted();
  const { data, error } = await supabase.rpc('catalog_recommendations', {
    viewed_ids: [], excluded_ids: excludedIds, seed, result_limit: 8, visitor_id: getVisitorId(),
  }).abortSignal(signal);
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('Invalid recommendations response');
  return data as SellerProduct[];
}
