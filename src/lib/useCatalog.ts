import { useEffect, useMemo, useState } from 'react';
import { loadCatalogProducts } from './sellerProducts';
import type { CatalogFilters } from './sellerProducts';
import { adjacentCatalogPages, CatalogPageCache } from './catalogPageCache';
import { preloadProductImages } from './preloadProductImages';
import { getDiscoverySeed } from './discoveryIdentity';
import { toCatalogProduct } from './catalogPresentation';

type RequestState = { key: string; loading: boolean; error: boolean };

export function useCatalog(filters: CatalogFilters, page: number, pageSize: number, userId?: string, enabled = true) {
  // Filters and accounts each get an isolated, short-lived cache in memory.
  const contextKey = JSON.stringify({ filters: { ...filters, seed: filters.seed ?? getDiscoverySeed() }, pageSize, userId });
  const key = JSON.stringify([contextKey, page]);
  const cache = useMemo(() => {
    const context = JSON.parse(contextKey) as { filters: CatalogFilters; pageSize: number };
    return new CatalogPageCache(async (targetPage, signal) => {
      const result = await loadCatalogProducts(context.filters, targetPage * context.pageSize, context.pageSize, signal);
      return { total: result.total, products: result.products.map(toCatalogProduct) };
    });
  }, [contextKey]);
  const [reload, setReload] = useState(0);
  const [state, setState] = useState<RequestState>({ key, loading: true, error: false });
  useEffect(() => () => cache.abort(), [cache]);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    function prefetchNeighbors(total: number) {
      for (const neighbor of adjacentCatalogPages(page, total, pageSize)) {
        void cache.load(neighbor).then((result) => {
          if (active) preloadProductImages(result.products);
        }).catch(() => undefined);
      }
    }
    const cached = cache.get(page);
    let timer: number | undefined;
    if (cached && cache.isFresh(page)) {
      setState({ key, loading: false, error: false });
      prefetchNeighbors(cached.total);
    } else {
      setState({ key, loading: true, error: false });
      timer = window.setTimeout(() => {
        void cache.load(page).then((result) => {
          if (!active) return;
          setState({ key, loading: false, error: false });
          prefetchNeighbors(result.total);
        }).catch(() => { if (active) setState({ key, loading: false, error: true }); });
      }, 250);
    }
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [cache, key, page, pageSize, reload, enabled]);
  const snapshot = cache.get(page);
  return {
    products: snapshot?.products ?? null, total: snapshot?.total ?? 0,
    isLoading: enabled && (state.key !== key ? !cache.isFresh(page) : state.loading),
    error: enabled && state.key === key && state.error,
    retry: () => { cache.invalidate(page); setReload((current) => current + 1); },
  };
}
