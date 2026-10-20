export type Product = {
  id: string | number;
  name: string;
  brand: string;
  price: number;
  image: string | null;
  category: string;
  tag?: string;
  publicationStatus?: 'draft' | 'published' | 'out_of_stock';
};

import { Link } from 'wouter';
import { useCart } from '../lib/cart';
import { useLanguage } from '../lib/i18n';
import { InlineQuantityControl } from './InlineQuantityControl';
import { ProductImage } from './ProductImage';
import { getJewelryCategoryLabel } from '../lib/jewelry';

type ProductCardProps = {
  product: Product;
  isFavorite: boolean;
  onToggleFavorite: (id: Product['id']) => void;
  isFavoritePending?: boolean;
};

export function ProductCard({ product, isFavorite, onToggleFavorite, isFavoritePending = false }: ProductCardProps) {
  const { language, locale, t } = useLanguage();
  const { addItem, items, removeItem, setQuantity } = useCart();
  const productUrl = `/product/${product.id}`;
  const cartItem = typeof product.id === 'string' ? items.find((item) => item.id === product.id) : undefined;
  const isAvailable = !product.publicationStatus || product.publicationStatus === 'published';

  return <article className="product-card">
    <div className="product-image-wrap">
      {product.tag && <span className="product-tag">{product.tag}</span>}
      <button className={`favorite-button${isFavorite ? ' active' : ''}`} aria-label={t(isFavorite ? 'removeFavorite' : 'addFavorite')} aria-pressed={isFavorite} disabled={isFavoritePending} onClick={() => onToggleFavorite(product.id)}>
        {isFavorite ? '♥' : '♡'}
      </button>
      <Link href={productUrl} className="product-image-link">
        <ProductImage className="product-image" src={product.image} alt={product.name} />
      </Link>
    </div>
    <div className="product-info">
      <p className="product-brand">{product.brand || getJewelryCategoryLabel(product.category, language)}</p>
      <Link href={productUrl}><h2>{product.name}</h2></Link>
      <div className="product-footer"><strong>{product.price.toLocaleString(locale)} ₸</strong>{!isAvailable ? <span className="product-availability">{t('productUnavailable')}</span> : typeof product.id === 'string' && (cartItem ? <InlineQuantityControl quantity={cartItem.quantity} onDecrease={() => cartItem.quantity === 1 ? removeItem(cartItem.id) : setQuantity(cartItem.id, cartItem.quantity - 1)} onIncrease={() => setQuantity(cartItem.id, cartItem.quantity + 1)} /> : <button className="add-button" onClick={() => addItem({ id: product.id as string, name: product.name, price: product.price, image: product.image })}>{t('addToCart')}</button>)}</div>
    </div>
  </article>;
}
