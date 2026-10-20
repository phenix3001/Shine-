import { supabase } from './supabase';
import { getVisitorId } from './discoveryIdentity';

const visits = new Map<string, Promise<boolean>>();

export function recordCatalogView(productId: string, userId?: string): Promise<boolean> {
  const visitorId = getVisitorId();
  const key = `${userId ?? visitorId}:${new Date().toISOString().slice(0, 10)}:${productId}`;
  const existing = visits.get(key);
  if (existing) return existing;
  const request = (async () => {
    const { data, error } = await supabase.rpc('record_catalog_view', {
      product_id: productId, visitor_id: visitorId,
    }).abortSignal(AbortSignal.timeout(15_000));
    if (error) throw error;
    return data === true;
  })();
  visits.set(key, request);
  void request.catch(() => { if (visits.get(key) === request) visits.delete(key); });
  if (visits.size > 512) visits.delete(visits.keys().next().value as string);
  return request;
}

export async function settleProductViews() {
  await Promise.allSettled([...visits.values()]);
}
