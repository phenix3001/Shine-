type InlineQuantityControlProps = {
  quantity: number;
  wide?: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
};

export function InlineQuantityControl({ quantity, wide = false, onDecrease, onIncrease }: InlineQuantityControlProps) {
  return <div className={`inline-quantity-control${wide ? ' wide' : ''}`} aria-label="Количество товара">
    <button type="button" onClick={onDecrease} aria-label="Уменьшить количество">−</button>
    <span aria-live="polite">{quantity}</span>
    <button type="button" onClick={onIncrease} aria-label="Увеличить количество">+</button>
  </div>;
}
