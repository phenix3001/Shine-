import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { useLanguage } from '../lib/i18n';
import { loadFavoriteProductIds, loadFavoriteProducts, loadViewedProducts, setFavorite } from '../lib/profileProducts';
import type { SellerProduct } from '../lib/sellerProducts';
import { Product, ProductCard } from './ProductCard';

type CollectionMode = 'favorites' | 'viewed';
type ProfileProductCollectionProps = { mode: CollectionMode };
const pageSize = 12;

function toProduct(product: SellerProduct): Product {
  return { id: product.id, name: product.name, brand: product.brand, price: product.price, category: product.category, image: product.image_url };
}

export function ProfileProductCollection({ mode }: ProfileProductCollectionProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) { setIsLoading(false); return; }
    let isCancelled = false;
    setIsLoading(true);
    const loader = mode === 'favorites' ? loadFavoriteProducts : loadViewedProducts;
    void Promise.all([loader(page * pageSize, pageSize), loadFavoriteProductIds()])
      .then(([result, ids]) => {
        if (isCancelled) return;
        setProducts(result.products);
        setTotal(result.total);
        setFavoriteIds(ids);
      })
      .finally(() => { if (!isCancelled) setIsLoading(false); });
    return () => { isCancelled = true; };
  }, [mode, page, user]);

  async function toggleFavorite(id: Product['id']) {
    if (!user || typeof id !== 'string') return;
    const nextValue = !favoriteIds.includes(id);
    await setFavorite(user.id, id, nextValue);
    setFavoriteIds((current) => nextValue ? [...current, id] : current.filter((item) => item !== id));
    if (mode === 'favorites' && !nextValue) { setProducts((current) => current.filter((item) => item.id !== id)); setTotal((current) => current - 1); }
  }

  if (!user) return <p className="profile-collection-state">{t('signInHint')}</p>;
  if (isLoading) return <p className="profile-collection-state">{t('loading')}</p>;
  if (products.length === 0) return <p className="profile-collection-state">{t(mode === 'favorites' ? 'emptyFavorites' : 'emptyViewed')}</p>;

  const totalPages = Math.ceil(total / pageSize);
  return <section className="profile-collection">
    <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={toProduct(product)} isFavorite={favoriteIds.includes(product.id)} onToggleFavorite={(id) => void toggleFavorite(id)} />)}</div>
    {totalPages > 1 && <nav className="catalog-pagination"><button disabled={page === 0} onClick={() => setPage((value) => value - 1)}>{t('previous')}</button><span>{t('page')} {page + 1} {t('of')} {totalPages}</span><button disabled={page + 1 >= totalPages} onClick={() => setPage((value) => value + 1)}>{t('next')}</button></nav>}
  </section>;
}
