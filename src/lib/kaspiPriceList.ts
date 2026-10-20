import type { NewSellerProduct } from './sellerProducts';
import { detectManufacturer } from './manufacturers';
import { parseProductPrice } from './productValidation';

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

  const offers = Array.from(document.getElementsByTagNameNS('*', 'offer'));
  if (offers.length > maxOffers) throw new Error(`В одном файле можно загрузить не больше ${maxOffers} товаров.`);
  const productsBySku = new Map<string, NewSellerProduct>();
  let skipped = 0;

  for (const offer of offers) {
    const sourceSku = offer.getAttribute('sku')?.trim().toLocaleUpperCase() ?? '';
    const name = directChildText(offer, 'model');
    const brand = detectManufacturer(name, directChildText(offer, 'brand'));
    const price = parseProductPrice(directChildText(offer, 'price'));

    if (!sourceSku || name.length < 2 || name.length > 500 || price === null) {
      skipped += 1;
      continue;
    }

    if (productsBySku.has(sourceSku)) skipped += 1;
    productsBySku.set(sourceSku, {
      name,
      brand,
      price,
      category: 'Украшения',
      description: '',
      image_url: null,
      source_sku: sourceSku,
      publication_status: Array.from(offer.getElementsByTagNameNS('*', 'availability')).length > 0
        && !Array.from(offer.getElementsByTagNameNS('*', 'availability')).some((item) => item.getAttribute('available')?.toLowerCase() === 'yes')
        ? 'out_of_stock' : 'published',
    });
  }

  const products = [...productsBySku.values()];
  if (products.length === 0) throw new Error('В файле не найдено подходящих товаров.');
  return { products, skipped };
}
