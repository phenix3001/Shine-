import type { NewSellerProduct } from './sellerProducts';
import { detectManufacturer } from './manufacturers';

export type KaspiParseResult = {
  products: NewSellerProduct[];
  skipped: number;
};

function directChildText(element: Element, name: string) {
  return Array.from(element.children)
    .find((child) => child.localName === name)
    ?.textContent?.trim() ?? '';
}

export async function parseKaspiPriceList(file: File): Promise<KaspiParseResult> {
  const maxFileSize = 15 * 1024 * 1024;
  const maxOffers = 20_000;
  if (file.size > maxFileSize) throw new Error('XML-файл слишком большой. Максимальный размер — 15 МБ.');
  const document = new DOMParser().parseFromString(await file.text(), 'application/xml');
  if (document.querySelector('parsererror')) throw new Error('Файл содержит ошибку XML.');

  const offers = Array.from(document.getElementsByTagName('offer'));
  if (offers.length > maxOffers) throw new Error(`В одном файле можно загрузить не больше ${maxOffers} товаров.`);
  const productsBySku = new Map<string, NewSellerProduct>();
  let skipped = 0;

  for (const offer of offers) {
    const sourceSku = offer.getAttribute('sku')?.trim().toLocaleUpperCase() ?? '';
    const name = directChildText(offer, 'model');
    const brand = detectManufacturer(name, directChildText(offer, 'brand'));
    const price = Number(directChildText(offer, 'price'));

    if (!sourceSku || name.length < 2 || name.length > 100 || !Number.isFinite(price) || price < 0) {
      skipped += 1;
      continue;
    }

    if (productsBySku.has(sourceSku)) skipped += 1;
    productsBySku.set(sourceSku, {
      name,
      brand,
      price: Math.round(price),
      category: 'Украшения',
      description: '',
      image_url: null,
      source_sku: sourceSku,
      publication_status: 'published',
    });
  }

  const products = [...productsBySku.values()];
  if (products.length === 0) throw new Error('В файле не найдено подходящих товаров.');
  return { products, skipped };
}
