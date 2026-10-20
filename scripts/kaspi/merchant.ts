import { setTimeout as pause } from 'node:timers/promises';

export const merchantId = 'IPKOJEVYATOVA';
export const cityId = '750000000';
export type MerchantProduct = {
  id: string; url: string; name: string; price: number; merchantSku: string; category: string;
};
type Card = { id: string; shopLink: string; title: string; brand: string; categoryCodes: string[]; categoryRu: string[] };
type Offer = { masterSku: string; merchantId: string; merchantSku: string; price: number };

export async function verifyMerchantProducts(products: MerchantProduct[]): Promise<MerchantProduct[]> {
  if (!products.length) return [];
  const offers = await kaspiJson('/yml/offer-view/offers', {
    options: ['PRICE'], cityId,
    entries: products.map((product) => ({ sku: product.id, hasVariants: false, merchantId,
      product: { brand: '', categoryCodes: [], baseProductCodes: [], groups: [] } })),
  }) as Offer[];
  if (!Array.isArray(offers)) throw new Error('Unexpected merchant verification response');
  return products.flatMap((product) => {
    const offer = offers.find((item) => item.masterSku === product.id && item.merchantId === merchantId);
    return offer?.merchantSku && Number.isSafeInteger(offer.price) && offer.price >= 0
      ? [{ ...product, price: offer.price, merchantSku: offer.merchantSku }] : [];
  });
}

export async function kaspiJson(path: string, body?: unknown): Promise<unknown> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await requestKaspiJson(path, body);
    } catch (error) {
      const retryable = error instanceof Error &&
        (['TimeoutError', 'AbortError', 'TypeError'].includes(error.name) || /Kaspi HTTP (429|5\d\d)/.test(error.message));
      if (!retryable || attempt >= 3) throw error;
      console.log(`Temporary Kaspi failure; retry ${attempt + 1}/3`);
      await pause(5000 * (attempt + 1));
    }
  }
}

async function requestKaspiJson(path: string, body?: unknown): Promise<unknown> {
  const response = await fetch(`https://kaspi.kz${path}`, {
    method: body ? 'POST' : 'GET', redirect: 'error', signal: AbortSignal.timeout(30_000),
    headers: { Accept: 'application/json', Referer: 'https://kaspi.kz/shop/', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`Kaspi HTTP ${response.status}; resume later`);
  return response.json();
}
export async function merchantPage(page: number, categoryFilter = '', sort = 'created-desc'): Promise<MerchantProduct[]> {
  const query = new URLSearchParams({ q: `:allMerchants:${merchantId}${categoryFilter}`, text: '', page: String(page), sort, ui: 'd', c: cityId });
  const response = await kaspiJson(`/yml/product-view/pl/results?${query}`) as { data: Card[] };
  if (!Array.isArray(response.data)) throw new Error('Unexpected catalog format');
  const cards = response.data;
  if (!cards.length) return [];
  const offers = await kaspiJson('/yml/offer-view/offers', {
    options: ['PRICE'], cityId,
    entries: cards.map((card) => ({ sku: card.id, hasVariants: false, merchantId,
      product: { brand: card.brand, categoryCodes: card.categoryCodes, baseProductCodes: [], groups: [] } })),
  }) as Offer[];
  if (!Array.isArray(offers)) throw new Error('Unexpected merchant offers format');
  return cards.map((card) => {
    const offer = offers.find((item) => item.masterSku === card.id && item.merchantId === merchantId);
    if (!offer || !offer.merchantSku || !Number.isSafeInteger(offer.price) || offer.price < 0) {
      throw new Error(`Merchant price or SKU missing for ${card.id}`);
    }
    const url = new URL(`/shop${card.shopLink}`, 'https://kaspi.kz');
    url.searchParams.set('m', merchantId);
    return { id: card.id, url: url.href, name: card.title, price: offer.price,
      merchantSku: offer.merchantSku, category: card.categoryRu?.at(-1) ?? 'Украшения' };
  });
}
