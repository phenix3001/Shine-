import { FormEvent, useState } from 'react';
import { jewelryCategories } from '../lib/jewelry';
import type { NewSellerProduct, ProductPublicationStatus } from '../lib/sellerProducts';

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

  const canContinue = sku.trim().length > 0 && name.trim().length >= 2;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({
      name: name.trim(),
      brand: brand.trim(),
      price: Number(price),
      category,
      description: description.trim(),
      image_url: imageUrl.trim() || null,
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
  }

  return <form className="seller-form" onSubmit={handleSubmit}>
    <div className="product-form-progress" aria-label={`Шаг ${step} из 2`}>
      <span className="active">1. Товар</span><i /><span className={step === 2 ? 'active' : ''}>2. Продажа</span>
    </div>

    {step === 1 ? <>
      <p className="seller-step-help">Добавьте основные данные, как при создании товара в Kaspi.</p>
      <label>Артикул продавца<input value={sku} onChange={(event) => setSku(event.target.value)} maxLength={50} placeholder="Например, SHINE-001" required /></label>
      <label>Название товара<input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={100} required /></label>
      <label>Категория украшения<select value={category} onChange={(event) => setCategory(event.target.value)}>{jewelryCategories.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>Бренд <span>(необязательно)</span><input value={brand} onChange={(event) => setBrand(event.target.value)} maxLength={100} /></label>
      <button type="button" className="seller-submit" disabled={!canContinue} onClick={() => setStep(2)}>Продолжить</button>
    </> : <>
      <div className="seller-product-summary"><span>{sku}</span><strong>{name}</strong><small>{brand || category}</small></div>
      <label>Цена, ₸<input type="number" value={price} onChange={(event) => setPrice(event.target.value)} min="0" required /></label>
      <label>Описание<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} placeholder="Расскажите о товаре" /></label>
      <label>Ссылка на фото <span>(необязательно)</span><input type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://..." /></label>
      <label>Статус товара<select value={publicationStatus} onChange={(event) => setPublicationStatus(event.target.value as ProductPublicationStatus)}>
        <option value="draft">Черновик</option><option value="published">Опубликован</option><option value="out_of_stock">Нет в наличии</option>
      </select></label>
      <div className="seller-form-actions">
        <button type="button" className="seller-back" onClick={() => setStep(1)}>Назад</button>
        <button className="seller-submit" disabled={isSaving}>{isSaving ? 'Добавляем...' : 'Создать товар'}</button>
      </div>
    </>}
  </form>;
}
