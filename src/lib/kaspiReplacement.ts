import { supabase } from './supabase';

export type ImportStatus = {
  found: number; pages: number; complete: boolean; prepared: number; photos: number;
  errors: number; error?: string; updatedAt: string; stage: string; ready: boolean;
  expected?: number; verified?: number; verificationDetail?: string;
};
type SourceProduct = { id: string; url: string; price: number; merchantSku: string; category: string };
type Manifest = ImportStatus & { ownerId: string; oldIds: string[]; products: SourceProduct[] };
type Prepared = { id: string; name: string; brand: string; description: string;
  specifications: { group: string; name: string; values: string[] }[];
  images: { file: string; source: string }[]; imageUrls: string[] };
export type UploadProgress = { products: number; total: number; photos: number; message: string; done?: boolean };

export async function readLocal<T>(path: string): Promise<T> {
  const response = await fetch(`/__kaspi/${path}`, { cache: 'no-store', signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error('Локальный сборщик пока недоступен. Откройте страницу через npm run dev.');
  return response.json() as Promise<T>;
}
function category(source: string) {
  if (/кольц/i.test(source)) return 'Кольца';
  if (/серьг/i.test(source)) return 'Серьги';
  if (/браслет/i.test(source)) return 'Браслеты';
  if (/колье|цеп/i.test(source)) return 'Колье';
  if (/подвес|кулон/i.test(source)) return 'Подвески';
  if (/брош/i.test(source)) return 'Броши';
  return 'Другое украшение';
}
export async function replaceKaspiCatalog(userId: string, report: (progress: UploadProgress) => void) {
  const manifest = await readLocal<Manifest>('manifest');
  if (!manifest.ready || !manifest.products.length) throw new Error('Сначала дождитесь завершения сбора товаров и фотографий.');
  if (manifest.ownerId !== userId) throw new Error('Войдите в аккаунт владельца текущих 3674 товаров. Другие аккаунты не могут заменить этот каталог.');
  const ids = manifest.products.map((product) => product.id);
  const { data: jobs, error: jobsError } = await supabase.from('catalog_import_jobs')
    .select('status,expected_ids').eq('user_id', userId).order('created_at', { ascending: false }).limit(1);
  if (jobsError) throw jobsError;
  if (jobs?.[0]?.status === 'complete' && jobs[0].expected_ids.length === ids.length
    && ids.every((id) => (jobs[0].expected_ids as string[]).includes(id))) {
    report({ products: ids.length, total: ids.length, photos: manifest.photos, message: 'Каталог уже перенесён.', done: true }); return;
  }
  const { data: jobId, error: startError } = await supabase.rpc('begin_kaspi_import', { old_ids: manifest.oldIds, new_ids: ids });
  if (startError) throw startError;
  if (typeof jobId !== 'string') throw new Error('Не удалось создать задачу импорта');
  const completed = new Set<string>();
  let photos = 0;
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from('seller_products').select('kaspi_id,image_urls')
      .eq('user_id', userId).eq('import_job_id', jobId).order('id').range(offset, offset + 499);
    if (error) throw error;
    for (const row of data ?? []) { completed.add(row.kaspi_id as string); photos += (row.image_urls as string[]).length; }
    if (!data || data.length < 500) break;
  }
  for (const source of manifest.products) {
    if (completed.has(source.id)) continue;
    const product = await readLocal<Prepared>(`product/${source.id}`);
    if (product.id !== source.id || !product.images.length || product.images.length !== product.imageUrls.length) throw new Error(`Неполная карточка ${source.id}`);
    const imageUrls: string[] = [];
    for (let index = 0; index < product.images.length; index++) {
      const response = await fetch(`/__kaspi/image/${source.id}/${index + 1}`, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error(`Не удалось прочитать фото товара ${source.id}`);
      const blob = await response.blob();
      const path = `${userId}/${jobId}/${source.id}/${index + 1}`;
      const { error } = await supabase.storage.from('product-images').upload(path, blob, { upsert: true, contentType: blob.type });
      if (error) throw error;
      imageUrls.push(supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl);
      report({ products: completed.size, total: ids.length, photos: ++photos, message: `${product.name}: фото ${index + 1}/${product.images.length}` });
    }
    const { error } = await supabase.rpc('stage_kaspi_product', { job_id: jobId, product: {
      user_id: userId, name: product.name, brand: product.brand, price: source.price,
      description: product.description, category: category(source.category),
      source_sku: `KASPI:${jobId}:${source.id}`, kaspi_id: source.id, import_job_id: jobId,
      image_url: imageUrls[0], image_urls: imageUrls, publication_status: 'draft',
      specifications: [...product.specifications, { group: 'Kaspi', name: 'Артикул продавца', values: [source.merchantSku] }],
    } });
    if (error) throw error;
    completed.add(source.id);
    report({ products: completed.size, total: ids.length, photos, message: product.name });
  }
  const { data: removed, error } = await supabase.rpc('finish_kaspi_import', { job_id: jobId });
  if (error) throw error;
  report({ products: completed.size, total: ids.length, photos, message: `Готово. Старых товаров удалено: ${removed}.`, done: true });
}
