import { useEffect } from 'react';
import { useAuth } from './auth';
import { recordCatalogView } from './productDiscovery';
import type { SellerProduct } from './sellerProducts';

export function useProductView(product: SellerProduct | null) {
  const { user, isLoading } = useAuth();
  const id = product?.publication_status === 'published' && product.is_silver ? product.id : undefined;
  useEffect(() => {
    if (!id || isLoading) return;
    void recordCatalogView(id, user?.id).catch(() => undefined);
  }, [id, isLoading, user?.id]);
}
