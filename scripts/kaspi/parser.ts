import type { PreparedProduct } from './types.ts';

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Unexpected Kaspi data format');
  return value as Record<string, unknown>;
}
function text(value: unknown) { return typeof value === 'string' ? value : ''; }
function list(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }

export function productUrl(input: string) {
  const url = new URL(input);
  if (url.protocol !== 'https:' || url.hostname !== 'kaspi.kz' || url.port || url.username || url.password
    || !/^\/shop\/p\/[^/]+-\d+\/$/.test(url.pathname)) throw new Error('Expected a public Kaspi product URL');
  url.hash = '';
  return url;
}

export function productId(input: string) {
  return productUrl(input).pathname.match(/-(\d+)\/$/)![1];
}

// Read the JSON object without executing scripts from the source page.
export function extractItem(html: string): unknown {
  const marker = /\bBACKEND\.components\.item\s*=\s*/g.exec(html);
  if (!marker) throw new Error('Product data missing; page may require browser access');
  const start = marker.index + marker[0].length;
  if (html[start] !== '{') throw new Error('Expected product JSON');
  let depth = 0, quoted = false, escaped = false;
  for (let index = start; index < html.length; index++) {
    const character = html[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') quoted = false;
    } else if (character === '"') quoted = true;
    else if (character === '{') depth++;
    else if (character === '}' && --depth === 0) return JSON.parse(html.slice(start, index + 1));
  }
  throw new Error('Incomplete product JSON');
}

export function parseProduct(html: string, sourceUrl: string): PreparedProduct {
  const item = object(extractItem(html));
  const card = object(item.card);
  const id = productId(sourceUrl);
  if (String(card.id) !== id || !text(card.title).trim()) throw new Error('Product ID or title does not match');
  const specifications = list(item.specifications).flatMap((rawGroup) => {
    const group = object(rawGroup);
    return list(group.features).map((rawFeature) => {
      const feature = object(rawFeature);
      return { group: text(group.name), name: text(feature.name),
        values: list(feature.featureValues).map((value) => String(object(value).value ?? '')) };
    });
  });
  const imageUrls = [...new Set(list(item.galleryImages).map((image) => text(object(image).large)).filter(Boolean))];
  return {
    id, sourceUrl, name: text(card.title), brand: text(object(card.promoConditions ?? {}).brand),
    description: text(item.description), specifications, imageUrls,
    referencePrice: typeof card.price === 'number' && Number.isFinite(card.price) ? card.price : null,
  };
}
