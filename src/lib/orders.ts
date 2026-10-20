import type { CartItem } from './cart';
import { supabase } from './supabase';
import { buildOrderItems, OrderInputError } from './orderItems';
import { getAccountCopy } from './accountCopy';
import type { Language } from './i18n';

export class OrderValidationError extends Error {}

const orderErrors: Record<string, keyof ReturnType<typeof getAccountCopy>> = {
  ORDER_AUTH_REQUIRED: 'orderAuthRequired', ORDER_INVALID_DETAILS: 'orderInvalidDetails',
  ORDER_EMPTY_CART: 'orderEmptyCart', ORDER_INVALID_CART: 'orderInvalidCart',
  ORDER_DUPLICATE_PRODUCT: 'orderDuplicateProduct', ORDER_CONFIRMATION_REQUIRED: 'orderConfirmationRequired',
  ORDER_INVALID_PRICE: 'orderInvalidPrice', ORDER_PRODUCT_UNAVAILABLE: 'orderProductUnavailable',
  ORDER_PRICE_CHANGED: 'orderPriceChanged', ORDER_TOTAL_TOO_LARGE: 'orderTotalTooLarge',
};

export async function createOrder(items: CartItem[], customerName: string, phone: string, address: string, language: Language = 'ru') {
  const copy = getAccountCopy(language);
  let cartItems: ReturnType<typeof buildOrderItems>;
  try { cartItems = buildOrderItems(items); }
  catch (error) {
    if (error instanceof OrderInputError) throw new OrderValidationError(copy[orderErrors[error.code]]);
    throw error;
  }
  const name = customerName.trim();
  const customerPhone = phone.trim();
  const deliveryAddress = address.trim();
  if (name.length < 2 || name.length > 100 || customerPhone.length < 5 || customerPhone.length > 30 || deliveryAddress.length < 5 || deliveryAddress.length > 300) {
    throw new OrderValidationError(copy.orderInvalidDetails);
  }
  const { data: products, error: productError } = await supabase.from('seller_products')
    .select('id, price, publication_status').eq('is_silver', true)
    .in('id', cartItems.map((item) => item.product_id)).abortSignal(AbortSignal.timeout(15_000));
  if (productError) throw productError;
  if (cartItems.some((item) => !products.some((product) => product.id === item.product_id && product.publication_status === 'published'))) {
    throw new OrderValidationError(copy.orderProductUnavailable);
  }
  if (cartItems.some((item) => products.find((product) => product.id === item.product_id)?.price !== item.expected_price)) {
    throw new OrderValidationError(copy.orderPriceChanged);
  }
  const { data, error } = await supabase.rpc('create_market_order', {
    cart_items: cartItems,
    customer_name: name,
    customer_phone: customerPhone,
    customer_address: deliveryAddress,
  });
  if (error) {
    if (orderErrors[error.message]) throw new OrderValidationError(copy[orderErrors[error.message]]);
    throw error;
  }
  if (typeof data !== 'string' || data.length === 0) throw new Error('Order confirmation is missing');
  return data;
}
