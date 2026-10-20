import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { useCart } from '../lib/cart';
import { useLanguage } from '../lib/i18n';
import { useRecommendations } from '../lib/useRecommendations';
import { useCatalogFavorites } from '../lib/useCatalogFavorites';
import { toCatalogProduct } from '../lib/catalogPresentation';
import { CatalogSkeleton } from './CatalogSkeleton';
import { ProductCard } from './ProductCard';

export function CartRecommendations() {
  const { user, isLoading } = useAuth();
  const { items } = useCart();
  const { t } = useLanguage();
  const { products, loading, error, retry } = useRecommendations(items.map((item) => item.id), user?.id, !isLoading);
  const { favorites, toggle, isPending } = useCatalogFavorites(user?.id);
  const [notice, setNotice] = useState('');

  async function toggleFavorite(id: string | number) {
    if (!user) { setNotice(t('favoriteLogin')); return; }
    if (typeof id !== 'string') return;
    setNotice('');
    try { await toggle(id); } catch { setNotice(t('loadError')); }
  }

  return <section className="cart-recommendations" aria-labelledby="cart-recommendations-title" aria-busy={loading}>
    <div className="recommendations-heading"><h2 id="cart-recommendations-title">{t('recommendedForYou')}</h2><p>{t('recommendationsHint')}</p></div>
    {notice && <p className="auth-notice" role="status">{notice}</p>}
    {loading && products.length === 0 ? <CatalogSkeleton /> : error ? <div className="recommendations-state" role="status"><p>{t('recommendationsError')}</p><button className="add-button" type="button" onClick={retry}>{t('retry')}</button></div>
      : products.length > 0 ? <div className="product-grid">{products.map((product) => <ProductCard key={product.id}
        product={toCatalogProduct(product)} isFavorite={favorites.includes(product.id)} isFavoritePending={isPending(product.id)}
        onToggleFavorite={(id) => void toggleFavorite(id)} />)}</div>
      : <p className="recommendations-state">{t('recommendationsEmpty')}</p>}
  </section>;
}
