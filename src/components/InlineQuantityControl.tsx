import { useLanguage } from '../lib/i18n';

type InlineQuantityControlProps = {
  quantity: number;
  wide?: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
};

export function InlineQuantityControl({ quantity, wide = false, onDecrease, onIncrease }: InlineQuantityControlProps) {
  const { t } = useLanguage();
  return <div className={`inline-quantity-control${wide ? ' wide' : ''}`} role="group" aria-label={t('itemQuantity')}>
    <button type="button" onClick={onDecrease} aria-label={t('decreaseQuantity')}>−</button>
    <span aria-live="polite">{quantity}</span>
    <button type="button" disabled={quantity >= 99} onClick={onIncrease} aria-label={t('increaseQuantity')}>+</button>
  </div>;
}
