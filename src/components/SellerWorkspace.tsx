import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { createSellerProduct, deleteSellerProduct, loadSellerProducts, NewSellerProduct, ProductPublicationStatus, SellerProduct, updateSellerProductStatus } from '../lib/sellerProducts';
import { isSupabaseConfigured } from '../lib/supabase';
import { useLanguage } from '../lib/i18n';
import { KaspiImport } from './KaspiImport';
import { SellerProductForm } from './SellerProductForm';
import { SellerProductList } from './SellerProductList';

function getLoadErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') return error.message;
  return 'неизвестная ошибка';
}

export function SellerWorkspace() {
  const pageSize = 7;
  const { user, isLoading } = useAuth();
  const { t } = useLanguage();
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const reloadProducts = useCallback(async (targetPage: number) => {
    setIsProductsLoading(true);
    try {
      if (!user) return;
      const result = await loadSellerProducts(user.id, targetPage * pageSize, pageSize);
      setProducts(result.products);
      setTotal(result.total);
    } finally {
      setIsProductsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void reloadProducts(page).catch((error) => setMessage(`Не удалось загрузить товары: ${getLoadErrorMessage(error)}`));
  }, [page, reloadProducts, user]);

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
    } catch {
      setMessage('Не удалось добавить товар. Попробуйте ещё раз.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteSellerProduct(id);
      const targetPage = products.length === 1 && page > 0 ? page - 1 : page;
      setPage(targetPage);
      await reloadProducts(targetPage);
    } catch {
      setMessage('Не удалось удалить товар. Попробуйте ещё раз.');
    }
  }

  async function handleStatusChange(id: string, status: ProductPublicationStatus) {
    try {
      await updateSellerProductStatus(id, status);
      setProducts((current) => current.map((product) => product.id === id ? { ...product, publication_status: status } : product));
    } catch {
      setMessage('Не удалось изменить статус товара.');
    }
  }

  if (!isSupabaseConfigured) return <p className="seller-state">Добавьте настройки Supabase в .env, чтобы включить кабинет.</p>;
  if (isLoading) return <p className="seller-state">Загружаем аккаунт...</p>;
  if (!user) return <p className="seller-state">Чтобы добавлять товары, сначала войдите в аккаунт.</p>;

  return <div className="seller-content">
    <section className="seller-panel">
      <KaspiImport userId={user.id} onImported={reloadFirstPage} />
      <div className="seller-panel-divider" />
      <h2>Новый товар</h2>
      <SellerProductForm isSaving={isSaving} onSubmit={handleAdd} />
      {message && <p className="seller-message" role="status">{message}</p>}
    </section>
    <section className="seller-catalog">
      <div><h2>Последние товары</h2><span>{total}</span></div>
      {isProductsLoading ? <p className="seller-state">{t('loading')}</p> : <SellerProductList products={products} onDelete={(id) => void handleDelete(id)} onStatusChange={(id, status) => void handleStatusChange(id, status)} />}
      {total > pageSize && <nav className="catalog-pagination" aria-label="Страницы моих товаров">
        <button disabled={page === 0 || isProductsLoading} onClick={() => setPage((current) => current - 1)}>{t('previous')}</button>
        <span>{t('page')} {page + 1} {t('of')} {Math.ceil(total / pageSize)}</span>
        <button disabled={(page + 1) * pageSize >= total || isProductsLoading} onClick={() => setPage((current) => current + 1)}>{t('next')}</button>
      </nav>}
    </section>
  </div>;
}
