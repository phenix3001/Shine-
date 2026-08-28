import type { CartItem } from '../lib/cart';

type CartItemRowProps = {
  item: CartItem;
  locale: string;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
};

export function CartItemRow({ item, locale, onQuantityChange, onRemove }: CartItemRowProps) {
  return <article className="cart-item">
    {item.image ? <img src={item.image} alt={item.name} /> : <div className="cart-item-placeholder">Shine</div>}
    <div><h2>{item.name}</h2><strong>{item.price.toLocaleString(locale)} ₸</strong></div>
    <div className="cart-quantity"><button onClick={() => onQuantityChange(item.quantity - 1)} aria-label="Уменьшить">−</button><span>{item.quantity}</span><button onClick={() => onQuantityChange(item.quantity + 1)} aria-label="Увеличить">+</button></div>
    <button className="cart-remove" onClick={onRemove}>Удалить</button>
  </article>;
}
