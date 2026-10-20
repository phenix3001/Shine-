import { supabase } from './supabase';

const uploaded = new WeakMap<File, { owner: string; url: string }>();
export async function uploadProductPhotos(files: File[]) {
  if (!files.length) return [];
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Войдите в аккаунт для загрузки фотографий.');
  const urls: string[] = [];
  for (const file of files) {
    const existing = uploaded.get(file);
    if (existing?.owner === data.user.id) { urls.push(existing.url); continue; }
    const path = `${data.user.id}/manual/${crypto.randomUUID()}`;
    const { error: uploadError } = await supabase.storage.from('product-images').upload(path, file, { contentType: file.type });
    if (uploadError) throw uploadError;
    const url = supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
    uploaded.set(file, { owner: data.user.id, url }); urls.push(url);
  }
  return urls;
}
