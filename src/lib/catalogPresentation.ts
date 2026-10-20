import type { Product } from '../components/ProductCard';
import type { SellerProduct } from './sellerProducts';

export function toCatalogProduct(product: SellerProduct): Product {
  return { id: product.id, name: product.name, brand: product.brand, price: product.price,
    category: product.category, image: product.image_url, publicationStatus: product.publication_status };
}
