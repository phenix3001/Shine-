import assert from 'node:assert/strict';
import test from 'node:test';
import { loadEnv } from 'vite';

// Read-only integration checks against the configured public catalog.
const env = loadEnv('development', process.cwd(), 'VITE_SUPABASE_');
const key = env.VITE_SUPABASE_ANON_KEY;
const headers = { apikey: key, 'Content-Type': 'application/json' };
if (!key.startsWith('sb_publishable_')) headers.Authorization = `Bearer ${key}`;
const defaults = { search: '', category: 'All', manufacturer: 'All', sort: 'popular' };
async function catalog(filters = {}, offset = 0, limit = 24) {
  const response = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/diverse_catalog`, {
    method: 'POST', headers, signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({ filters: { ...defaults, ...filters }, page_offset: offset, page_limit: limit }),
  });
  assert.equal(response.status, 200, `Catalog HTTP status: ${response.status}`);
  return response.json();
}
const normalize = (value) => value.trim().toLowerCase().replaceAll('ё', 'е').replaceAll(',', '.');
const aliases = { 'вид изделия': 'вид', 'тип застежки': 'застежка', 'страна-производитель': 'страна производитель' };
const nameOf = (name) => aliases[normalize(name)] ?? normalize(name);
const allowed = ['Вид', 'Застежка', 'Артикул производителя', 'Цвет металла', 'Цвет вставки',
  'Для кого', 'Проба', 'Материал', 'Вставка', 'Страна производитель', 'Вес изделия', 'Особенности'];
function matches(product, filters) {
  return Object.entries(filters).every(([name, value]) => product.specifications.some((spec) =>
    nameOf(spec.name) === normalize(name) && spec.values.some((item) => normalize(item).includes(normalize(value)))));
}

test('public catalog filters, ordering and pagination', async (t) => {
  const baseline = await catalog({}, 0, 100);
  assert.ok(baseline.products.length > 0, 'Requires published catalog products');
  const fixture = baseline.products.find((product) => allowed.filter((name) =>
    product.specifications.some((spec) => nameOf(spec.name) === normalize(name) && spec.values.some((value) => value.trim()))).length >= 2);
  assert.ok(fixture, 'Requires a product with at least two searchable characteristics');
  const specifications = Object.fromEntries(allowed.flatMap((name) => {
    const spec = fixture.specifications.find((item) => nameOf(item.name) === normalize(name));
    const value = spec?.values.find((item) => item.trim());
    return value ? [[name, value]] : [];
  }));

  await t.test('each available characteristic matches actual product values', async () => {
    for (const [name, value] of Object.entries(specifications)) {
      const filter = { [name]: ` ${value.toUpperCase()} ` };
      const result = await catalog({ specifications: filter });
      assert.ok(result.total > 0, name);
      assert.ok(result.products.every((product) => matches(product, filter)), name);
    }
  });
  await t.test('combined characteristics, category, manufacturer and price', async () => {
    const result = await catalog({ specifications, category: fixture.category,
      manufacturer: fixture.brand, minPrice: fixture.price, maxPrice: fixture.price });
    assert.ok(result.total > 0);
    assert.ok(result.products.every((product) => matches(product, specifications)
      && product.category === fixture.category && product.brand === fixture.brand && product.price === fixture.price));
  });
  await t.test('missing value returns no results', async () => {
    const result = await catalog({ specifications: { Материал: 'nonexistent-catalog-material-48bb7d1e' } });
    assert.equal(result.total, 0);
    assert.deepEqual(result.products, []);
  });
  await t.test('checkbox values use OR within groups and AND across groups', async () => {
    const names = Object.keys(specifications).slice(0, 2);
    const selections = Object.fromEntries(names.map((name) => [name, [specifications[name]]]));
    const categories = [...new Set(baseline.products.map((p) => p.category))].slice(0, 2);
    const manufacturers = [...new Set(baseline.products.map((p) => p.brand))].slice(0, 2);
    const broad = await catalog({ categories, manufacturers });
    assert.ok(broad.total > 0);
    assert.ok(broad.products.every((p) => categories.includes(p.category) && manufacturers.includes(p.brand)));
    const exact = await catalog({ specifications: selections });
    assert.ok(exact.total > 0);
    assert.ok(exact.products.every((p) => Object.entries(selections).every(([name, values]) =>
      p.specifications.some((spec) => nameOf(spec.name) === normalize(name)
        && spec.values.some((value) => values.some((choice) => normalize(choice) === normalize(value)))))));
    const name = names[0];
    const choices = [...new Set(baseline.products.flatMap((p) => p.specifications
      .filter((s) => nameOf(s.name) === normalize(name)).flatMap((s) => s.values)))].slice(0, 2);
    const union = await catalog({ specifications: { [name]: choices } });
    assert.ok(union.total > 0);
    assert.ok(union.products.every((p) => p.specifications.some((s) => nameOf(s.name) === normalize(name)
      && s.values.some((v) => choices.some((choice) => normalize(choice) === normalize(v))))));
    assert.equal((await catalog({ categories: [], manufacturers: [], specifications: { [name]: [] } })).total, baseline.total);
  });
  await t.test('facet choices have real positive counts and include known product values', async () => {
    const response = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/get_catalog_facets`, {
      method: 'POST', headers, body: '{}', signal: AbortSignal.timeout(15_000),
    });
    assert.equal(response.status, 200);
    const facets = await response.json();
    assert.equal(facets.categories.reduce((total, option) => total + option.count, 0), baseline.total);
    assert.ok(facets.manufacturers.every((option) => option.value.trim() && option.count > 0));
    assert.ok(Object.entries(facets.specifications).every(([name, options]) => allowed.includes(name)
      && options.every((option) => option.value.trim() && option.count > 0)));
  });
  const broadFilter = { [Object.keys(specifications)[0]]: Object.values(specifications)[0] };
  await t.test('all sorts preserve filtering and order', async () => {
    for (const [sort, field, direction] of [
      ['price-asc', 'price', 1], ['price-desc', 'price', -1],
      ['rating', 'rating', -1], ['discount', 'discount_percent', -1], ['newest', 'created_at', -1],
    ]) {
      const result = await catalog({ specifications: broadFilter, sort });
      assert.ok(result.total > 0);
      assert.ok(result.products.every((product) => matches(product, broadFilter)));
      const values = result.products.map((product) => field === 'created_at' ? Date.parse(product[field]) : product[field]);
      assert.ok(values.every((value, index) => index === 0 || (value - values[index - 1]) * direction >= 0), sort);
    }
  });
  await t.test('pagination is stable and empty filters restore the catalog', async () => {
    const first = await catalog({}, 0, 2);
    const second = await catalog({}, 2, 2);
    assert.equal(first.total, second.total);
    assert.deepEqual([...first.products, ...second.products].map((p) => p.id), baseline.products.slice(0, 4).map((p) => p.id));
    const reset = await catalog({ specifications: { Материал: '   ' } }, 0, 2);
    assert.deepEqual(reset, first);
  });
});
