import type { ProductPublicationStatus, SellerProduct } from '../lib/sellerProducts';
import { ProductImage } from './ProductImage';

type SellerProductListProps = {
  products: SellerProduct[];
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: ProductPublicationStatus) => void;
  pendingIds: string[];
};

export function SellerProductList({ products, onDelete, onStatusChange, pendingIds }: SellerProductListProps) {
  if (products.length === 0) return <p className="seller-empty">Товаров пока нет. Добавьте первый товар или импортируйте прайс-лист Kaspi.</p>;

  return <div className="seller-product-list">
    {products.map((product) => <article className="seller-product" key={product.id}>
      <ProductImage src={product.image_url} alt={product.name} />
      <div>
        <p>{product.brand || product.category}</p>
        <h3>{product.name}</h3>
        <strong>{product.price.toLocaleString('ru-RU')} ₸</strong>
        {product.source_sku && <span>Артикул: {product.source_sku}</span>}
        {product.description && <span>{product.description}</span>}
        <select disabled={pendingIds.includes(product.id)} className="seller-product-status" value={product.publication_status} onChange={(event) => onStatusChange(product.id, event.target.value as ProductPublicationStatus)} aria-label={`Статус ${product.name}`}>
          <option value="draft">Черновик</option><option value="published">Опубликован</option><option value="out_of_stock">Нет в наличии</option>
        </select>
      </div>
      <button disabled={pendingIds.includes(product.id)} onClick={() => onDelete(product.id)} aria-label={`Удалить ${product.name}`}>Удалить</button>
    </article>)}
  </div>;
}
