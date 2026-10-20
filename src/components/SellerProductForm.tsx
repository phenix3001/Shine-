import { FormEvent, useState } from 'react';
import { jewelryCategories } from '../lib/jewelry';
import type { NewSellerProduct, ProductPublicationStatus } from '../lib/sellerProducts';
import { JewelryFields, jewelryFields } from './JewelryFields';
import { ProductPhotoPicker } from './ProductPhotoPicker';
import { uploadProductPhotos } from '../lib/productPhotos';
import { isProductImageUrl, parseProductPrice } from '../lib/productValidation';

type SellerProductFormProps = {
  isSaving: boolean;
  onSubmit: (product: NewSellerProduct) => Promise<void>;
};

export function SellerProductForm({ isSaving, onSubmit }: SellerProductFormProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<string>(jewelryCategories[0]);
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [publicationStatus, setPublicationStatus] = useState<ProductPublicationStatus>('draft');
  const [features, setFeatures] = useState<Record<string, string>>({ Материал: 'серебро' });
  const [photos, setPhotos] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const canContinue = sku.trim().length > 0 && name.trim().length >= 2;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploading || isSaving) return;
    if (!canContinue) { setStep(1); return; }
    if (step === 1) { setStep(2); return; }
    const parsedPrice = parseProductPrice(price);
    if (parsedPrice === null) { setError('Укажите целую цену от 0 до 2 147 483 647 ₸.'); return; }
    if (imageUrl.trim() && !isProductImageUrl(imageUrl.trim())) {
      setError('Ссылка на фото должна начинаться с https:// или http://.'); return;
    }
    setUploading(true); setError('');
    try {
    const imageUrls = await uploadProductPhotos(photos);
    if (imageUrl.trim()) imageUrls.push(imageUrl.trim());
    await onSubmit({
      name: name.trim(),
      brand: brand.trim(),
      price: parsedPrice,
      category,
      description: description.trim(),
      image_url: imageUrls[0] ?? null,
      image_urls: imageUrls,
      specifications: jewelryFields.filter((field) => features[field]?.trim()).map((field) => ({
        group: 'Характеристики', name: field, values: [features[field].trim()],
      })),
      source_sku: sku.trim().toLocaleUpperCase(),
      publication_status: publicationStatus,
    });
    setStep(1);
    setSku('');
    setName('');
    setBrand('');
    setPrice('');
    setDescription('');
    setImageUrl('');
    setPublicationStatus('draft');
    setCategory(jewelryCategories[0]);
    setFeatures({ Материал: 'серебро' }); setPhotos([]);
    } catch (failure) {
      setError(typeof failure === 'object' && failure && 'message' in failure ? String(failure.message) : 'Не удалось сохранить товар. Попробуйте ещё раз.');
    } finally { setUploading(false); }
  }

  return <form className="seller-form" onSubmit={handleSubmit}>
    {error && <p role="alert">{error}</p>}
    <fieldset className="seller-form-body" disabled={uploading || isSaving}>
    <div className="product-form-progress" aria-label={`Шаг ${step} из 2`}>
      <span className="active">1. Товар</span><i /><span className={step === 2 ? 'active' : ''}>2. Продажа</span>
    </div>

    {step === 1 ? <>
      <p className="seller-step-help">В Shine продаются только серебряные украшения. Добавьте основные данные товара.</p>
      <label>Артикул продавца<input value={sku} onChange={(event) => setSku(event.target.value)} maxLength={50} placeholder="Например, SHINE-001" required /></label>
      <label>Название товара<input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={100} required /></label>
      <label>Категория украшения<select value={category} onChange={(event) => setCategory(event.target.value)}>{jewelryCategories.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>Бренд <span>(необязательно)</span><input value={brand} onChange={(event) => setBrand(event.target.value)} maxLength={100} /></label>
      <JewelryFields values={features} onChange={(field, value) => setFeatures((current) => ({ ...current, [field]: value }))} />
      <button type="button" className="seller-submit" disabled={!canContinue} onClick={() => setStep(2)}>Продолжить</button>
    </> : <>
      <div className="seller-product-summary"><span>{sku}</span><strong>{name}</strong><small>{brand || category}</small></div>
      <label>Цена, ₸<input type="number" value={price} onChange={(event) => setPrice(event.target.value)} min="0" max="2147483647" step="1" required /></label>
      <label>Описание<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} placeholder="Расскажите о товаре" /></label>
      <ProductPhotoPicker files={photos} onChange={setPhotos} />
      <label>Ссылка на фото <span>(необязательно)</span><input type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://..." /></label>
      <label>Статус товара<select value={publicationStatus} onChange={(event) => setPublicationStatus(event.target.value as ProductPublicationStatus)}>
        <option value="draft">Черновик</option><option value="published">Опубликован</option><option value="out_of_stock">Нет в наличии</option>
      </select></label>
      <div className="seller-form-actions">
        <button type="button" className="seller-back" onClick={() => setStep(1)}>Назад</button>
        <button className="seller-submit" disabled={isSaving || uploading}>{uploading || isSaving ? 'Сохраняем товар и фото...' : 'Создать товар'}</button>
      </div>
    </>}
    </fieldset>
  </form>;
}
