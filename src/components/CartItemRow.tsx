import type { CartItem } from '../lib/cart';
import { Link } from 'wouter';
import { useLanguage } from '../lib/i18n';
import { getAccountCopy } from '../lib/accountCopy';
import { ProductImage } from './ProductImage';

type CartItemRowProps = {
  item: CartItem;
  locale: string;
  disabled?: boolean;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
};

export function CartItemRow({ item, locale, disabled = false, onQuantityChange, onRemove }: CartItemRowProps) {
  const { language } = useLanguage();
  const copy = getAccountCopy(language);
  return <article className="cart-item">
    <ProductImage src={item.image} alt={item.name} />
    <div><Link href={`/product/${item.id}`}><h2>{item.name}</h2></Link><strong>{item.price.toLocaleString(locale)} ₸</strong></div>
    <div className="cart-quantity"><button type="button" disabled={disabled || item.quantity <= 1} onClick={() => onQuantityChange(item.quantity - 1)} aria-label={`${copy.decreaseQuantity}: ${item.name}`}>−</button><span aria-live="polite">{item.quantity}</span><button type="button" disabled={disabled || item.quantity >= 99} onClick={() => onQuantityChange(item.quantity + 1)} aria-label={`${copy.increaseQuantity}: ${item.name}`}>+</button></div>
    <button type="button" className="cart-remove" disabled={disabled} onClick={onRemove} aria-label={`${copy.removeFromCart}: ${item.name}`}>{copy.remove}</button>
  </article>;
}
