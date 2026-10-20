import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

type Replacement = (id: string, report: (value: unknown) => void) => Promise<void>;
function harness(failure?: 'image' | 'stage', ready = true) {
  const calls: string[] = [];
  const exports: { replaceKaspiCatalog?: Replacement } = {};
  const supabase = {
    from: () => {
      const query = { select: () => query, eq: () => query, order: () => query,
        limit: async () => ({ data: [], error: null }), range: async () => ({ data: [], error: null }) };
      return query;
    },
    rpc: async (name: string) => {
      calls.push(name);
      return { data: name === 'begin_kaspi_import' ? 'job' : 1,
        error: failure === 'stage' && name === 'stage_kaspi_product' ? new Error('Stage failed') : null };
    },
    storage: { from: () => ({ upload: async () => ({ error: failure === 'image' ? new Error('Image failed') : null }),
      getPublicUrl: () => ({ data: { publicUrl: 'https://storage/photo' } }) }) },
  };
  const fetch = async (path: string) => ({ ok: true,
    json: async () => path.endsWith('/manifest') ? { ready, ownerId: 'owner', oldIds: ['old'], photos: 1,
      products: [{ id: '123', price: 100, category: 'Кольца', merchantSku: 'SKU' }] }
      : { id: '123', name: 'Ring', brand: 'Brand', description: '', specifications: [], images: [{ file: 'image-1' }], imageUrls: ['photo'] },
    blob: async () => new Blob(['photo'], { type: 'image/png' }),
  });
  const source = readFileSync('src/lib/kaspiReplacement.ts', 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(code, { exports, require: () => ({ supabase }), fetch, AbortSignal, Blob });
  return { run: exports.replaceKaspiCatalog!, calls };
}
test('replacement is finalized only after all photo uploads and staging succeed', async () => {
  const { run, calls } = harness();
  await run('owner', () => {});
  assert.deepEqual(calls, ['begin_kaspi_import', 'stage_kaspi_product', 'finish_kaspi_import']);
});
for (const failure of ['image', 'stage'] as const) {
  test(`${failure} failure never finalizes or deletes the old catalog`, async () => {
    const { run, calls } = harness(failure);
    await assert.rejects(run('owner', () => {}));
    assert.equal(calls.includes('finish_kaspi_import'), false);
  });
}
test('wrong owner cannot start replacement', async () => {
  const { run, calls } = harness();
  await assert.rejects(run('other', () => {}));
  assert.equal(calls.length, 0);
});
test('incomplete preparation cannot start replacement', async () => {
  const { run, calls } = harness(undefined, false);
  await assert.rejects(run('owner', () => {}));
  assert.equal(calls.length, 0);
});
