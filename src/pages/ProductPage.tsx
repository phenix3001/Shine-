import { useEffect, useState } from 'react';
import { Link, useRoute } from 'wouter';
import { BrandLogo } from '../components/BrandLogo';
import { ThemeToggle } from '../components/ThemeToggle';
import { getJewelryCategoryLabel } from '../lib/jewelry';
import { useAuth } from '../lib/auth';
import { useLanguage } from '../lib/i18n';
import { recordProductView } from '../lib/profileProducts';
import { incrementProductView, loadProductById, SellerProduct } from '../lib/sellerProducts';
import { useCart } from '../lib/cart';
import { InlineQuantityControl } from '../components/InlineQuantityControl';
import { ProductGallery } from '../components/ProductGallery';

export function ProductPage() {
  const [, params] = useRoute('/product/:id');
  const [product, setProduct] = useState<SellerProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [reload, setReload] = useState(0);
  const { language, locale, t } = useLanguage();
  const { user } = useAuth();
  const { addItem, items, removeItem, setQuantity } = useCart();
  const cartItem = product ? items.find((item) => item.id === product.id) : undefined;

  useEffect(() => {
    if (!params?.id) return;
    let isCancelled = false;
    const controller = new AbortController();
    const deadline = window.setTimeout(() => controller.abort(), 15_000);
    setIsLoading(true);
    setHasError(false);
    setProduct(null);
    void loadProductById(params.id, controller.signal)
      .then((result) => {
        if (isCancelled) return;
        setProduct(result);
        if (result?.publication_status === 'published') {
          const viewKey = `shine-viewed-${result.id}`;
          try {
            if (sessionStorage.getItem(viewKey)) return;
            sessionStorage.setItem(viewKey, '1');
          } catch { /* Product details still work when browser storage is blocked. */ }
          void incrementProductView(result.id).catch(() => undefined);
        }
      })
      .catch(() => { if (!isCancelled) setHasError(true); })
      .finally(() => { window.clearTimeout(deadline); if (!isCancelled) setIsLoading(false); });
    return () => { isCancelled = true; controller.abort(); window.clearTimeout(deadline); };
  }, [params?.id, user?.id, reload]);

  useEffect(() => {
    if (product && user) void recordProductView(user.id, product.id).catch(() => undefined);
  }, [product, user?.id]);

  return <main className="product-page">
    <header className="seller-header">
      <BrandLogo />
      <div className="product-page-actions"><ThemeToggle /></div>
    </header>
    <Link href="/#catalog" className="product-back">{t('backToCatalog')}</Link>
    {isLoading ? <p className="product-page-state" role="status">{t('loading')}</p> : hasError || !product ? <section className="product-page-state" role="status"><h1>{t(hasError ? 'loadError' : 'productNotFound')}</h1>{hasError && <button className="add-button" onClick={() => setReload((current) => current + 1)}>{t('retry')}</button>}</section> :
      <article className="product-details">
        <ProductGallery key={product.id} name={product.name} images={product.image_urls?.length ? product.image_urls : product.image_url ? [product.image_url] : []} />
        <div className="product-details-info">
          <p>{product.brand || getJewelryCategoryLabel(product.category, language)}</p>
          <h1>{product.name}</h1>
          <strong className="product-details-price">{product.price.toLocaleString(locale)} ₸</strong>
          {product.publication_status !== 'published' ? <p className="auth-notice" role="status">{t('productUnavailable')}</p> : cartItem ? <InlineQuantityControl wide quantity={cartItem.quantity} onDecrease={() => cartItem.quantity === 1 ? removeItem(cartItem.id) : setQuantity(cartItem.id, cartItem.quantity - 1)} onIncrease={() => setQuantity(cartItem.id, cartItem.quantity + 1)} /> : <button className="product-add-button" onClick={() => addItem({ id: product.id, name: product.name, price: product.price, image: product.image_url })}>{t('addToCart')}</button>}
          <h2>{t('productDetails')}</h2>
          <dl>
            <div><dt>{t('category')}</dt><dd>{getJewelryCategoryLabel(product.category, language)}</dd></div>
            {(product.kaspi_id || product.source_sku) && <div><dt>{t('sku')}</dt><dd>{product.kaspi_id || product.source_sku}</dd></div>}
            {product.specifications?.map((feature, index) => <div key={`${feature.name}-${index}`}><dt>{feature.name}</dt><dd>{feature.values.join(', ')}</dd></div>)}
          </dl>
          <h2>{t('description')}</h2>
          <p className="product-description">{product.description || t('noDescription')}</p>
        </div>
      </article>}
  </main>;
}
