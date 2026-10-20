import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../lib/auth';
import { useLanguage } from '../lib/i18n';
import { loadFavoriteProductIds, loadFavoriteProducts, loadViewedProducts, setFavorite } from '../lib/profileProducts';
import type { SellerProduct } from '../lib/sellerProducts';
import { Product, ProductCard } from './ProductCard';

type CollectionMode = 'favorites' | 'viewed';
type ProfileProductCollectionProps = { mode: CollectionMode };
const pageSize = 12;

function toProduct(product: SellerProduct): Product {
  return { id: product.id, name: product.name, brand: product.brand, price: product.price, category: product.category, image: product.image_url, publicationStatus: product.publication_status };
}

export function ProfileProductCollection({ mode }: ProfileProductCollectionProps) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { t } = useLanguage();
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [favoriteMessage, setFavoriteMessage] = useState('');
  const [reload, setReload] = useState(0);
  const pendingFavorites = useRef(new Set<string>());
  const userId = user?.id;

  useEffect(() => {
    if (!userId) { setProducts([]); setFavoriteIds([]); setTotal(0); setIsLoading(false); return; }
    let isCancelled = false;
    setIsLoading(true);
    setHasLoadError(false);
    const loader = mode === 'favorites' ? loadFavoriteProducts : loadViewedProducts;
    void Promise.all([loader(page * pageSize, pageSize), loadFavoriteProductIds()])
      .then(([result, ids]) => {
        if (isCancelled) return;
        const lastPage = Math.max(0, Math.ceil(result.total / pageSize) - 1);
        if (page > lastPage) { setPage(lastPage); return; }
        setProducts(result.products);
        setTotal(result.total);
        setFavoriteIds(ids);
      })
      .catch(() => { if (!isCancelled) setHasLoadError(true); })
      .finally(() => { if (!isCancelled) setIsLoading(false); });
    return () => { isCancelled = true; };
  }, [mode, page, userId, reload]);

  async function toggleFavorite(id: Product['id']) {
    if (!userId || typeof id !== 'string' || pendingFavorites.current.has(id)) return;
    pendingFavorites.current.add(id);
    setFavoriteMessage('');
    const nextValue = !favoriteIds.includes(id);
    try {
      await setFavorite(userId, id, nextValue);
      setFavoriteIds((current) => nextValue ? [...current, id] : current.filter((item) => item !== id));
      if (mode === 'favorites' && !nextValue) setReload((value) => value + 1);
    } catch { setFavoriteMessage('Не удалось изменить избранное. Попробуйте ещё раз.'); }
    finally { pendingFavorites.current.delete(id); }
  }

  if (isAuthLoading) return <p className="profile-collection-state" role="status">{t('loading')}</p>;
  if (!user) return <p className="profile-collection-state">{t('signInHint')}</p>;
  if (isLoading) return <p className="profile-collection-state">{t('loading')}</p>;
  if (hasLoadError) return <div className="profile-collection-state" role="status"><p>{t('loadError')}</p><button type="button" className="seller-submit" onClick={() => setReload((value) => value + 1)}>{t('retry')}</button></div>;
  if (products.length === 0) return <p className="profile-collection-state">{t(mode === 'favorites' ? 'emptyFavorites' : 'emptyViewed')}</p>;

  const totalPages = Math.ceil(total / pageSize);
  return <section className="profile-collection">
    {favoriteMessage && <p className="seller-message" role="status">{favoriteMessage}</p>}
    <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={toProduct(product)} isFavorite={favoriteIds.includes(product.id)} onToggleFavorite={(id) => void toggleFavorite(id)} />)}</div>
    {totalPages > 1 && <nav className="catalog-pagination"><button disabled={page === 0} onClick={() => setPage((value) => value - 1)}>{t('previous')}</button><span>{t('page')} {page + 1} {t('of')} {totalPages}</span><button disabled={page + 1 >= totalPages} onClick={() => setPage((value) => value + 1)}>{t('next')}</button></nav>}
  </section>;
}
