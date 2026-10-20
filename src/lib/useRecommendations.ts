import { useEffect, useState } from 'react';
import { getDiscoverySeed, getVisitorId } from './discoveryIdentity';
import { loadRecommendations } from './recommendations';
import type { SellerProduct } from './sellerProducts';

type State = { owner: string; products: SellerProduct[]; loading: boolean; error: boolean };

export function useRecommendations(excludedIds: string[], userId?: string, enabled = true) {
  const owner = userId ?? getVisitorId();
  const seed = getDiscoverySeed();
  const exclusions = JSON.stringify([...new Set(excludedIds)].sort());
  const [reload, setReload] = useState(0);
  const [state, setState] = useState<State>({ owner, products: [], loading: true, error: false });
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const deadline = AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]);
    setState((current) => ({ owner, products: current.owner === owner ? current.products : [], loading: true, error: false }));
    void loadRecommendations(JSON.parse(exclusions) as string[], seed, deadline)
      .then((products) => { if (!controller.signal.aborted) setState({ owner, products, loading: false, error: false }); })
      .catch(() => { if (!controller.signal.aborted) setState({ owner, products: [], loading: false, error: true }); });
    return () => controller.abort();
  }, [owner, exclusions, seed, enabled, reload]);
  const products = state.owner === owner ? state.products.filter((product) => !excludedIds.includes(product.id)) : [];
  return { products, loading: !enabled || state.owner !== owner || state.loading,
    error: state.owner === owner && state.error, retry: () => setReload((value) => value + 1) };
}
