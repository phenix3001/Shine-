import type { CartItem } from './cart';

type OrderInputErrorCode = 'ORDER_EMPTY_CART' | 'ORDER_INVALID_CART' | 'ORDER_DUPLICATE_PRODUCT' | 'ORDER_INVALID_PRICE';

export class OrderInputError extends Error {
  readonly code: OrderInputErrorCode;
  constructor(code: OrderInputErrorCode) { super(code); this.code = code; }
}

export function buildOrderItems(items: CartItem[]) {
  if (items.length === 0) throw new OrderInputError('ORDER_EMPTY_CART');
  const productIds = new Set<string>();
  return items.map((item) => {
    if (!/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(item.id)
      || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
      throw new OrderInputError('ORDER_INVALID_CART');
    }
    const productId = item.id.toLowerCase();
    if (productIds.has(productId)) throw new OrderInputError('ORDER_DUPLICATE_PRODUCT');
    productIds.add(productId);
    if (!Number.isInteger(item.price) || item.price < 0 || item.price > 2147483647) throw new OrderInputError('ORDER_INVALID_PRICE');
    return { product_id: productId, quantity: item.quantity, expected_price: item.price };
  });
}
