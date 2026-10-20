import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

type Row = Record<string, unknown>;
type Importer = (user: string, products: Row[], progress: (value: number) => void) => Promise<void>;
const source = readFileSync('src/lib/importProducts.ts', 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function setup(rows: Row[], failUpdate = false) {
  const exports: { importSellerProducts?: Importer } = {};
  const supabase = { from: () => ({
    upsert: async (batch: Row[], options: { ignoreDuplicates: boolean }) => {
      assert.equal(options.ignoreDuplicates, true);
      for (const item of batch) {
        if (!rows.some((row) => row.user_id === item.user_id && row.source_sku === item.source_sku)) rows.push({ ...item });
      }
      return { error: null };
    },
    update: (patch: Row) => {
      const filters: Row = {};
      const query = {
        eq: (key: string, value: unknown) => { filters[key] = value; return query; },
        select: () => query,
        single: async () => {
          if (failUpdate) return { error: new Error('Disconnected') };
          const row = rows.find((item) => Object.entries(filters).every(([key, value]) => item[key] === value));
          if (!row) return { error: new Error('Missing row') };
          Object.assign(row, patch);
          return { error: null };
        },
      };
      return query;
    },
  }) };
  runInNewContext(code, { exports, require: () => ({ supabase }) });
  return exports.importSellerProducts!;
}
const incoming = { source_sku: 'RING-1', name: 'Updated ring', price: 200, brand: '',
  image_url: null, description: '', category: 'Украшения', publication_status: 'published' };
test('repeat XML import preserves enriched fields and another seller’s rows', async () => {
  const original = { ...incoming, user_id: 'owner', name: 'Old name', price: 100, brand: 'Altea',
    image_url: 'stored-photo', description: 'Full details', category: 'Кольца', publication_status: 'draft' };
  const other = { ...original, user_id: 'another' };
  const rows = [{ ...original }, { ...other }];
  const run = setup(rows);
  await run('owner', [incoming], () => {});
  await run('owner', [incoming], () => {});
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], { ...original, name: incoming.name, price: incoming.price });
  assert.deepEqual(rows[1], other);
});
test('failed run can resume without duplicating newly inserted products', async () => {
  const rows: Row[] = [];
  await assert.rejects(setup(rows, true)('owner', [incoming], () => {}));
  let completed = 0;
  await setup(rows)('owner', [incoming], (value) => { completed = value; });
  assert.equal(rows.length, 1);
  assert.equal(completed, 1);
});
test('missing SKU stops import before modifying data', async () => {
  const rows: Row[] = [];
  await assert.rejects(setup(rows)('owner', [{ ...incoming, source_sku: null }], () => {}));
  assert.equal(rows.length, 0);
});
