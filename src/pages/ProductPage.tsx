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

export function ProductPage() {
  const [, params] = useRoute('/product/:id');
  const [product, setProduct] = useState<SellerProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const { language, locale, t } = useLanguage();
  const { user } = useAuth();
  const { addItem, items, removeItem, setQuantity } = useCart();
  const cartItem = product ? items.find((item) => item.id === product.id) : undefined;

  useEffect(() => {
    if (!params?.id) return;
    let isCancelled = false;
    setIsLoading(true);
    void loadProductById(params.id)
      .then((result) => {
        if (!isCancelled) setProduct(result);
        if (result && user) void recordProductView(user.id, result.id).catch(() => undefined);
        const viewKey = `shine-viewed-${params.id}`;
        if (result && !sessionStorage.getItem(viewKey)) {
          sessionStorage.setItem(viewKey, '1');
          void incrementProductView(params.id).catch(() => undefined);
        }
      })
      .catch(() => { if (!isCancelled) setHasError(true); })
      .finally(() => { if (!isCancelled) setIsLoading(false); });
    return () => { isCancelled = true; };
  }, [params?.id, user]);

  return <main className="product-page">
    <header className="seller-header">
      <BrandLogo />
      <div className="product-page-actions"><ThemeToggle /></div>
    </header>
    <Link href="/#catalog" className="product-back">{t('backToCatalog')}</Link>
    {isLoading ? <p className="product-page-state">{t('loading')}</p> : hasError || !product ? <p className="product-page-state">{t('productNotFound')}</p> :
      <article className="product-details">
        <div className="product-details-image">
          {product.image_url ? <img src={product.image_url} alt={product.name} /> : <div className="product-image-placeholder"><strong>Shine</strong><span>Фото скоро появится</span></div>}
        </div>
        <div className="product-details-info">
          <p>{product.brand || getJewelryCategoryLabel(product.category, language)}</p>
          <h1>{product.name}</h1>
          <strong className="product-details-price">{product.price.toLocaleString(locale)} ₸</strong>
          {cartItem ? <InlineQuantityControl wide quantity={cartItem.quantity} onDecrease={() => cartItem.quantity === 1 ? removeItem(cartItem.id) : setQuantity(cartItem.id, cartItem.quantity - 1)} onIncrease={() => setQuantity(cartItem.id, cartItem.quantity + 1)} /> : <button className="product-add-button" onClick={() => addItem({ id: product.id, name: product.name, price: product.price, image: product.image_url })}>{t('addToCart')}</button>}
          <h2>{t('productDetails')}</h2>
          <dl>
            <div><dt>{t('category')}</dt><dd>{getJewelryCategoryLabel(product.category, language)}</dd></div>
            {product.source_sku && <div><dt>{t('sku')}</dt><dd>{product.source_sku}</dd></div>}
          </dl>
          <h2>{t('description')}</h2>
          <p className="product-description">{product.description || t('noDescription')}</p>
        </div>
      </article>}
  </main>;
}
