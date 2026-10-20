import { useEffect, useState } from 'react';
import { CatalogFilters } from '../components/CatalogFilters';
import { CatalogSkeleton } from '../components/CatalogSkeleton';
import { CollectionHero } from '../components/CollectionHero';
import { CatalogSortBar } from '../components/CatalogSortBar';
import { Product, ProductCard } from '../components/ProductCard';
import { useAuth } from '../lib/auth';
import { useLanguage } from '../lib/i18n';
import { CatalogSort } from '../lib/sellerProducts';
import { useCatalog } from '../lib/useCatalog';
import type { SpecificationFilters } from '../lib/catalogSpecifications';
import { useCatalogFavorites } from '../lib/useCatalogFavorites';
import { parseProductPrice } from '../lib/productValidation';
import { useCatalogFacets } from '../lib/useCatalogFacets';
import { useCatalogSearch } from '../lib/useCatalogSearch';

const pageSize = 24;
export function MarketplacePage() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const { query, setQuery } = useCatalogSearch();
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [sort, setSort] = useState<CatalogSort>('popular');
  const [specifications, setSpecifications] = useState<SpecificationFilters>({});

  const [page, setPage] = useState(0);

  const [notice, setNotice] = useState('');
  const { user } = useAuth();
  const { t } = useLanguage();
  const { favorites, toggle, isPending } = useCatalogFavorites(user?.id);
  const { facets, loading: facetsLoading, error: facetsError, retry: retryFacets } = useCatalogFacets(user?.id);

  useEffect(() => {
    setSelectedCategories([]);
    setManufacturers([]);
    setPage(0);
  }, [user?.id]);

  useEffect(() => { setPage(0); }, [query]);

  const fromPrice = parseProductPrice(minPrice);
  const toPrice = parseProductPrice(maxPrice);
  const invalidPrices = (minPrice !== '' && fromPrice === null) || (maxPrice !== '' && toPrice === null)
    || (fromPrice !== null && toPrice !== null && fromPrice > toPrice);

  const { products: databaseProducts, total, isLoading: isCatalogLoading, error: catalogError, retry } = useCatalog({
    search: query, categories: selectedCategories, manufacturers,
    minPrice: fromPrice, maxPrice: toPrice, sort, specifications,
  }, page, pageSize, user?.id, !invalidPrices);

  const displayedProducts: Product[] = databaseProducts ?? [];
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  useEffect(() => {
    if (!isCatalogLoading && !catalogError && databaseProducts && page >= totalPages) setPage(totalPages - 1);
  }, [databaseProducts, isCatalogLoading, catalogError, page, totalPages]);

  function resetFilters() {
    setSpecifications({});
    setQuery('');
    setSelectedCategories([]);
    setManufacturers([]);
    setMinPrice('');
    setMaxPrice('');
    setSort('popular');
    setPage(0);
  }

  async function toggleFavorite(id: Product['id']) {
    if (!user) { setNotice(t('favoriteLogin')); return; }
    if (typeof id !== 'string') return;
    setNotice('');
    try { await toggle(id); } catch { setNotice(t('loadError')); }
  }

  return <main className="market-page">
    <div className="market-layout">
      <div className="market-content">
      <CollectionHero />
      <section className="catalog" id="catalog">
      <div className="catalog-heading"><div><h2>{t('newCollection')}</h2></div>{!invalidPrices && !isCatalogLoading && !catalogError && <span>{total} {t('products')}</span>}</div>
      <div className="catalog-layout">
        <CatalogFilters
          facets={facets} loading={facetsLoading} error={facetsError} onRetry={retryFacets}
          specifications={specifications}
          onSpecificationChange={(name, value) => { setSpecifications((current) => ({ ...current, [name]: value })); setPage(0); }}
          categories={selectedCategories} manufacturers={manufacturers} minPrice={minPrice} maxPrice={maxPrice}
          onCategoryChange={(value) => { setSelectedCategories(value); setPage(0); }}
          onManufacturerChange={(value) => { setManufacturers(value); setPage(0); }}
          onMinPriceChange={(value) => { setMinPrice(value); setPage(0); }}
          onMaxPriceChange={(value) => { setMaxPrice(value); setPage(0); }} onReset={resetFilters}
        />
        <div className="catalog-results" aria-busy={isCatalogLoading}>
          <CatalogSortBar value={sort} onChange={(value) => { setSort(value); setPage(0); }} />
          {notice && <p className="auth-notice" role="status">{notice}</p>}
          {invalidPrices && <p className="catalog-error" role="alert">{t('invalidPriceRange')}</p>}
          {!invalidPrices && catalogError && <div className="catalog-error" role="alert"><p>{t(databaseProducts ? 'catalogSavedResults' : 'loadError')}</p><button onClick={retry}>{t('retry')}</button></div>}
          {!invalidPrices && (databaseProducts === null ? (isCatalogLoading ? <CatalogSkeleton count={pageSize} /> : null) : displayedProducts.length > 0 ? <div className="product-grid">{displayedProducts.map((product) => <ProductCard key={product.id} product={product} isFavorite={favorites.includes(String(product.id))} isFavoritePending={isPending(product.id)} onToggleFavorite={(id) => void toggleFavorite(id)} />)}</div> : <div className="no-results"><p>{t('noResults')}</p><button className="empty-filter-reset" type="button" onClick={resetFilters}>{t('resetFilters')}</button></div>)}
          {!invalidPrices && !catalogError && databaseProducts !== null && totalPages > 1 && <nav className="catalog-pagination" aria-label={t('catalogPages')}>
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
