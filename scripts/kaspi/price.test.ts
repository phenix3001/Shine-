import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isProductImageUrl, parseProductPrice } from '../../src/lib/productValidation.ts';

test('accepts explicit zero and whole tenge prices within the database range', () => {
  assert.equal(parseProductPrice('0'), 0);
  assert.equal(parseProductPrice(' 12500 '), 12500);
  assert.equal(parseProductPrice('12500.00'), 12500);
  assert.equal(parseProductPrice('2147483647'), 2147483647);
});

test('rejects missing, fractional, negative and overflowing prices before saving', () => {
  for (const value of ['', ' ', '-1', '12.5', '2147483648', 'Infinity', 'NaN', 'not a price']) {
    assert.equal(parseProductPrice(value), null, value);
  }
});

test('product photos only accept valid web URLs', () => {
  assert.equal(isProductImageUrl('https://example.com/ring.webp'), true);
  assert.equal(isProductImageUrl('http://example.com/photo.png'), true);
  for (const value of ['photo.png', 'javascript:alert(1)', 'file:///photo.png', 'data:image/png;base64,AAAA', 'https://']) {
    assert.equal(isProductImageUrl(value), false, value);
  }
});
