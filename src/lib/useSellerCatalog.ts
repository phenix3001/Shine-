import { useCallback, useEffect, useRef, useState } from 'react';
import { loadSellerProducts } from './sellerProducts';
import type { ProductPublicationStatus, SellerProduct } from './sellerProducts';

type CatalogState = { key: string; products: SellerProduct[]; total: number; loading: boolean; error: boolean };

export function useSellerCatalog(userId: string | undefined, page: number, pageSize: number,
  query: string, status: ProductPublicationStatus | '', enabled: boolean) {
  const key = JSON.stringify([userId, page, query, status, enabled]);
  const context = useRef(key);
  context.current = key;
  const requestId = useRef(0);
  const mounted = useRef(false);
  const controller = useRef<AbortController>();
  const [state, setState] = useState<CatalogState>({ key, products: [], total: 0, loading: enabled, error: false });
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const reloadProducts = useCallback(async (targetPage: number) => {
    if (!userId || !enabled || !mounted.current || context.current !== key) return;
    const version = ++requestId.current;
    controller.current?.abort();
    controller.current = new AbortController();
    setState((current) => ({ key, products: current.key === key ? current.products : [], total: current.key === key ? current.total : 0, loading: true, error: false }));
    try {
      const result = await loadSellerProducts(userId, targetPage * pageSize, pageSize, query, status, controller.current.signal);
      if (requestId.current === version && context.current === key) setState({ key, ...result, loading: false, error: false });
    } catch {
      if (requestId.current === version && context.current === key) setState((current) => ({ ...current, loading: false, error: true }));
    }
  }, [userId, enabled, key, pageSize, query, status]);

  useEffect(() => {
    void reloadProducts(page);
    return () => { ++requestId.current; controller.current?.abort(); };
  }, [page, reloadProducts]);

  const current = state.key === key;
  return { products: current ? state.products : [], total: current ? state.total : 0,
    isProductsLoading: enabled && (!current || state.loading), loadError: current && state.error, reloadProducts };
}
