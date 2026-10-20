import { setTimeout as pause } from 'node:timers/promises';

export async function download(url: string, image = false): Promise<{ bytes: Uint8Array; contentType: string }> {
  const parsed = new URL(url);
  const host = image ? 'resources.cdn-kaspi.kz' : 'kaspi.kz';
  if (parsed.protocol !== 'https:' || parsed.hostname !== host || parsed.port || parsed.username || parsed.password) {
    throw new Error('Unexpected download host');
  }
  const maximum = image ? 15 * 1024 * 1024 : 5 * 1024 * 1024;
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(parsed, { redirect: 'error', signal: AbortSignal.timeout(30_000) });
    if ((response.status === 429 || response.status >= 500) && attempt < 2) {
      await response.body?.cancel();
      await pause(5000 * (attempt + 1));
      continue;
    }
    if (!response.ok) { await response.body?.cancel(); throw new Error(`HTTP ${response.status}; download stopped`); }
    const contentType = response.headers.get('content-type')?.split(';')[0] ?? '';
    if (image && !['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(contentType)) {
      await response.body?.cancel(); throw new Error('Unexpected image format');
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Empty response');
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximum) { await reader.cancel(); throw new Error('Download exceeds size limit'); }
      chunks.push(value);
    }
    if (!size) throw new Error('Empty download');
    return { bytes: Buffer.concat(chunks), contentType };
  }
  throw new Error('Retry limit reached');
}
