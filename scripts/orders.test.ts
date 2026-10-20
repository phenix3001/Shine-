import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildOrderItems, OrderInputError } from '../src/lib/orderItems.ts';

const product = { id: 'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA', name: 'Ring', price: 15000, image: null, quantity: 2 };

test('checkout sends the displayed price and exact quantity for every product', () => {
  assert.deepEqual(buildOrderItems([product]), [{ product_id: product.id.toLowerCase(), quantity: 2, expected_price: 15000 }]);
  assert.deepEqual(buildOrderItems([{ ...product, price: 0, quantity: 99 }]), [{ product_id: product.id.toLowerCase(), quantity: 99, expected_price: 0 }]);
});

test('checkout rejects an empty cart and duplicate UUIDs regardless of letter case', () => {
  assert.throws(() => buildOrderItems([]), new OrderInputError('ORDER_EMPTY_CART'));
  assert.throws(() => buildOrderItems([product, { ...product, id: product.id.toLowerCase() }]), new OrderInputError('ORDER_DUPLICATE_PRODUCT'));
});

test('checkout rejects malformed product IDs and quantities instead of rounding', () => {
  assert.throws(() => buildOrderItems([{ ...product, id: 'invalid' }]), new OrderInputError('ORDER_INVALID_CART'));
  for (const quantity of [0, -1, 1.5, 100, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => buildOrderItems([{ ...product, quantity }]), new OrderInputError('ORDER_INVALID_CART'));
  }
});

test('checkout rejects invalid or overflowing expected prices', () => {
  for (const price of [-1, 1.5, 2147483648, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => buildOrderItems([{ ...product, price }]), new OrderInputError('ORDER_INVALID_PRICE'));
  }
});
