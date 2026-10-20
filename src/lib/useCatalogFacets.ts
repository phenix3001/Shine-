import { useEffect, useState } from 'react';
import { emptyCatalogFacets, loadCatalogFacets } from './catalogFacets';

export function useCatalogFacets(userId?: string) {
  const [facets, setFacets] = useState(emptyCatalogFacets);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    void loadCatalogFacets(AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]))
      .then((result) => { if (!controller.signal.aborted) setFacets(result); })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [userId, reload]);
  return { facets, loading, error, retry: () => setReload((value) => value + 1) };
}
