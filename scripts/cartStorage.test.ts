import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadCart, normalizeQuantity, parseCart, saveCart } from '../src/lib/cartStorage.ts';
import { readPreference, savePreference } from '../src/lib/browserStorage.ts';

const item = { id: 'ring-1', name: 'Ring', price: 12500, image: null, quantity: 2 };

test('corrupt saved data never becomes a partially valid cart', () => {
  for (const value of ['{', 'null', '{}', '[null]', '[{"id":"broken"}]']) assert.deepEqual(parseCart(value), []);
  for (const invalid of [{ ...item, name: '' }, { ...item, price: '12500' }, { ...item, price: -1 }, { ...item, quantity: null }]) {
    assert.deepEqual(parseCart(JSON.stringify([invalid])), []);
  }
  assert.deepEqual(parseCart(JSON.stringify([{ id: 'broken' }, item])), [item]);
});

test('duplicate products merge and quantities stay within the supported limits', () => {
  assert.deepEqual(parseCart(JSON.stringify([item, { ...item, quantity: 3 }])), [{ ...item, quantity: 5 }]);
  assert.equal(parseCart(JSON.stringify([{ ...item, quantity: 1000 }]))[0].quantity, 99);
  assert.equal(normalizeQuantity(2.9), 2);
  assert.equal(normalizeQuantity(0), 1);
});

test('browser storage restrictions do not crash carts or preferences', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Storage blocked'); } });
  try {
    assert.deepEqual(loadCart(), []);
    assert.equal(readPreference('theme'), null);
    assert.doesNotThrow(() => saveCart([item]));
    assert.doesNotThrow(() => savePreference('theme', 'dark'));
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
