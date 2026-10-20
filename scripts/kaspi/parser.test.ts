import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractItem, parseProduct, productUrl } from './parser.ts';

test('reads braces and escaped quotes in strings without running page scripts', () => {
  const value = { description: 'A } brace and "quoted" text', nested: { valid: true } };
  assert.deepEqual(extractItem(`BACKEND.components.item = ${JSON.stringify(value)}; throw new Error();`), value);
});
test('rejects missing or truncated data', () => {
  assert.throws(() => extractItem('<html>Login</html>'));
  assert.throws(() => extractItem('BACKEND.components.item = {"card":'));
});
test('verifies product identity', () => {
  assert.throws(() => parseProduct('BACKEND.components.item = {"card":{"id":"456","title":"Ring"}};', 'https://kaspi.kz/shop/p/ring-123/'));
});
test('preserves characteristics and deduplicates images', () => {
  const item = { card: { id: '123', title: 'Ring', price: 100 }, galleryImages: [{ large: 'photo' }, { large: 'photo' }],
    specifications: [{ name: 'Details', features: [{ name: 'Weight', featureValues: [{ value: '4.01 g' }] }] }] };
  const product = parseProduct(`BACKEND.components.item = ${JSON.stringify(item)};`, 'https://kaspi.kz/shop/p/ring-123/');
  assert.equal(product.specifications[0].values[0], '4.01 g');
  assert.equal(product.imageUrls.length, 1);
  assert.equal(product.description, '');
});
test('only accepts public product links on Kaspi', () => {
  for (const url of ['https://example.com/shop/p/ring-123/', 'https://kaspi.kz/shop/search/', 'http://kaspi.kz/shop/p/ring-123/']) {
    assert.throws(() => productUrl(url));
  }
});
