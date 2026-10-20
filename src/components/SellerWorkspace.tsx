import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { useAuth } from '../lib/auth';
import { createSellerProduct, deleteSellerProduct, NewSellerProduct, ProductPublicationStatus, updateSellerProductStatus } from '../lib/sellerProducts';
import { isSupabaseConfigured } from '../lib/supabase';
import { useLanguage } from '../lib/i18n';
import { KaspiImport } from './KaspiImport';
import { SellerProductForm } from './SellerProductForm';
import { SellerProductList } from './SellerProductList';
import { useSellerCatalog } from '../lib/useSellerCatalog';

export function SellerWorkspace({ mode = 'products' }: { mode?: 'products' | 'new' | 'upload' }) {
  const pageSize = 7;
  const { user, isLoading } = useAuth();
  const { t } = useLanguage();
  const [page, setPage] = useState(0);
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductPublicationStatus | ''>('');
  const pending = useRef(new Set<string>());
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const { products, total, isProductsLoading, loadError, reloadProducts } = useSellerCatalog(user?.id, page, pageSize, query, statusFilter, mode === 'products');
  useEffect(() => {
    if (!isProductsLoading && !loadError && total > 0 && page * pageSize >= total) setPage(Math.max(0, Math.ceil(total / pageSize) - 1));
    if (!isProductsLoading && !loadError && total === 0 && page > 0) setPage(0);
  }, [isProductsLoading, loadError, total, page]);

  function setPending(id: string, value: boolean) {
    if (value) pending.current.add(id); else pending.current.delete(id);
    setPendingIds([...pending.current]);
  }

  async function reloadFirstPage() {
    setPage(0);
    await reloadProducts(0);
  }

  async function handleAdd(product: NewSellerProduct) {
    setIsSaving(true);
    setMessage('');
    try {
      await createSellerProduct(product);
      await reloadFirstPage();
      setMessage('Товар сохранён. Если артикул уже существовал, его данные обновлены.');
    } catch (error) {
      setMessage('Не удалось добавить товар. Попробуйте ещё раз.');
      throw error;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (pending.current.has(id)) return;
    const product = products.find((item) => item.id === id);
    if (!window.confirm(`Удалить «${product?.name ?? 'товар'}» навсегда? Чтобы только убрать его с витрины, выберите статус «Черновик».`)) return;
    setPending(id, true);
    setMessage('');
    try {
      await deleteSellerProduct(id);
      const targetPage = products.length === 1 && page > 0 ? page - 1 : page;
      setPage(targetPage);
      await reloadProducts(targetPage);
    } catch {
      setMessage('Не удалось удалить товар. Попробуйте ещё раз.');
    } finally { setPending(id, false); }
  }

  async function handleStatusChange(id: string, status: ProductPublicationStatus) {
    if (pending.current.has(id)) return;
    setPending(id, true);
    setMessage('');
    try {
      await updateSellerProductStatus(id, status);
      await reloadProducts(page);
    } catch {
      setMessage('Не удалось изменить статус товара.');
    } finally { setPending(id, false); }
  }

  if (!isSupabaseConfigured) return <p className="seller-state">Добавьте настройки Supabase в .env, чтобы включить кабинет.</p>;
  if (isLoading) return <p className="seller-state">Загружаем аккаунт...</p>;
  if (!user) return <p className="seller-state">Чтобы добавлять товары, сначала войдите в аккаунт.</p>;

  return <div className="seller-content">
    {mode !== 'products' && <section className="seller-panel">
      {import.meta.env.DEV && <p><Link href="/import">Перенос каталога Kaspi →</Link></p>}
      {mode === 'upload' ? <KaspiImport userId={user.id} onImported={reloadFirstPage} />
        : <SellerProductForm isSaving={isSaving} onSubmit={handleAdd} />}
    </section>}
    {message && <p className="seller-message" role="status">{message}</p>}
    {mode === 'products' && <section className="seller-catalog">
      <form className="merchant-search" onSubmit={(event) => { event.preventDefault(); setPage(0); setQuery(search.trim()); }}>
        <input aria-label="Название товара" placeholder="Поиск по названию товара" value={search} onChange={(event) => setSearch(event.target.value)} />
        <button type="submit">Найти</button>
      </form>
      <div className="merchant-toolbar"><label>Статус <select value={statusFilter} onChange={(event) => { setPage(0); setStatusFilter(event.target.value as ProductPublicationStatus | ''); }}>
        <option value="">Все товары</option><option value="published">Опубликованы</option><option value="draft">Черновики</option><option value="out_of_stock">Нет в наличии</option>
      </select></label><span>Найдено: {total}</span>
        <button disabled={isProductsLoading} onClick={() => void reloadProducts(page).catch(() => setMessage('Не удалось обновить товары.'))}>↻ Обновить</button>
      </div>
      {loadError && <p className="seller-message" role="alert">{t('loadError')}</p>}
      {isProductsLoading ? <p className="seller-state">{t('loading')}</p> : <SellerProductList products={products} pendingIds={pendingIds} onDelete={(id) => void handleDelete(id)} onStatusChange={(id, status) => void handleStatusChange(id, status)} />}
      {total > pageSize && <nav className="catalog-pagination" aria-label="Страницы моих товаров">
        <button disabled={page === 0 || isProductsLoading} onClick={() => setPage((current) => current - 1)}>{t('previous')}</button>
        <span>{t('page')} {page + 1} {t('of')} {Math.ceil(total / pageSize)}</span>
        <button disabled={(page + 1) * pageSize >= total || isProductsLoading} onClick={() => setPage((current) => current + 1)}>{t('next')}</button>
      </nav>}
    </section>}
  </div>;
}
