import { useEffect, useState } from 'react';
import { CatalogFilters } from '../components/CatalogFilters';
import { CatalogSortBar } from '../components/CatalogSortBar';
import { MarketplaceHeader } from '../components/MarketplaceHeader';
import { Product, ProductCard } from '../components/ProductCard';
import { useAuth } from '../lib/auth';
import { useLanguage } from '../lib/i18n';
import { loadFavoriteProductIds, setFavorite } from '../lib/profileProducts';
import { CatalogSort, loadCatalogBrands, loadCatalogProducts } from '../lib/sellerProducts';

const pageSize = 24;
export function MarketplacePage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [manufacturer, setManufacturer] = useState('All');
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [sort, setSort] = useState<CatalogSort>('popular');
  const [databaseProducts, setDatabaseProducts] = useState<Product[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [favorites, setFavorites] = useState<Array<Product['id']>>([]);
  const [notice, setNotice] = useState('');
  const { user } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    setSelectedCategory('All');
    setManufacturer('All');
    setPage(0);
    if (!user) setFavorites([]);
    else void loadFavoriteProductIds().then(setFavorites).catch(() => setFavorites([]));
    void loadCatalogBrands().then(setManufacturers).catch(() => setManufacturers([]));
  }, [user]);

  useEffect(() => {
    let isCancelled = false;
    setIsCatalogLoading(true);
    const timer = window.setTimeout(() => {
      void loadCatalogProducts({
        search: query,
        category: selectedCategory,
        manufacturer,
        minPrice: minPrice === '' ? null : Number(minPrice),
        maxPrice: maxPrice === '' ? null : Number(maxPrice),
        sort,
      }, page * pageSize, pageSize)
        .then((result) => {
          if (isCancelled) return;
          const nextProducts: Product[] = result.products.map((product) => ({
            id: product.id,
            name: product.name,
            brand: product.brand,
            price: product.price,
            category: product.category,
            image: product.image_url,
          }));
          setDatabaseProducts(nextProducts);
          setTotal(result.total);
          setNotice('');
        })
        .catch(() => setNotice(t('loadError')))
        .finally(() => {
          if (!isCancelled) setIsCatalogLoading(false);
        });
    }, 250);

    return () => {
      isCancelled = true;
      window.clearTimeout(timer);
    };
  }, [manufacturer, maxPrice, minPrice, page, query, selectedCategory, sort, t, user]);

  const displayedProducts: Product[] = databaseProducts ?? [];
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function handleQueryChange(nextQuery: string) {
    setQuery(nextQuery);
    setPage(0);
  }

  function resetFilters() {
    setSelectedCategory('All');
    setManufacturer('All');
    setMinPrice('');
    setMaxPrice('');
    setSort('popular');
    setPage(0);
  }

  async function toggleFavorite(id: Product['id']) {
    if (!user) { setNotice(t('favoriteLogin')); return; }
    if (typeof id !== 'string') return;
    setNotice('');
    const nextValue = !favorites.includes(id);
    setFavorites((current) => nextValue ? [...current, id] : current.filter((item) => item !== id));
    try {
      await setFavorite(user.id, id, nextValue);
    } catch {
      setFavorites((current) => nextValue ? current.filter((item) => item !== id) : [...current, id]);
      setNotice(t('loadError'));
    }
  }

  return <main className="market-page">
    <MarketplaceHeader query={query} onQueryChange={handleQueryChange} />
    <div className="market-layout">
      <div className="market-content">
      <section className="market-hero" id="new"><p>{t('heroEyebrow')}</p><h1>{t('heroTitle')}<br />{t('heroSubtitle')}</h1><a href="#catalog">{t('viewCollection')}</a></section>
      <section className="catalog" id="catalog">
      <div className="catalog-heading"><div><h2>{t('newCollection')}</h2></div><span>{total} {t('products')}</span></div>
      <div className="catalog-layout">
        <CatalogFilters
          category={selectedCategory} manufacturer={manufacturer} manufacturers={manufacturers} minPrice={minPrice} maxPrice={maxPrice}
          onCategoryChange={(value) => { setSelectedCategory(value); setPage(0); }}
          onManufacturerChange={(value) => { setManufacturer(value); setPage(0); }}
          onMinPriceChange={(value) => { setMinPrice(value); setPage(0); }}
          onMaxPriceChange={(value) => { setMaxPrice(value); setPage(0); }} onReset={resetFilters}
        />
        <div className="catalog-results">
          <CatalogSortBar value={sort} onChange={(value) => { setSort(value); setPage(0); }} />
          {notice && <p className="auth-notice" role="status">{notice}</p>}
          {isCatalogLoading ? <p className="catalog-loading">{t('loading')}</p> : displayedProducts.length > 0 ? <div className="product-grid">{displayedProducts.map((product) => <ProductCard key={product.id} product={product} isFavorite={favorites.includes(product.id)} onToggleFavorite={(id) => void toggleFavorite(id)} />)}</div> : <p className="no-results">{t('noResults')}</p>}
          {databaseProducts !== null && totalPages > 1 && <nav className="catalog-pagination" aria-label="Страницы каталога">
            <button disabled={page === 0 || isCatalogLoading} onClick={() => setPage((current) => current - 1)}>{t('previous')}</button>
            <span>{t('page')} {page + 1} {t('of')} {totalPages}</span>
            <button disabled={page >= totalPages - 1 || isCatalogLoading} onClick={() => setPage((current) => current + 1)}>{t('next')}</button>
          </nav>}
        </div>
      </div>
      </section>
      </div>
    </div>
    <footer className="market-footer"><span>{t('footer')}</span><span>Almaty, Kazakhstan</span></footer>
  </main>;
}
