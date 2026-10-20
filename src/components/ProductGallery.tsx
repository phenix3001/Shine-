import { useState } from 'react';
import { useLanguage } from '../lib/i18n';
import { ProductImage } from './ProductImage';

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const { t } = useLanguage();
  const uniqueImages = [...new Set(images.filter(Boolean))];
  const image = selected && uniqueImages.includes(selected) ? selected : uniqueImages[0];
  return <div className="product-gallery">
    <div className="product-details-image">
      <ProductImage src={image ?? null} alt={name} loading="eager" />
    </div>
    {uniqueImages.length > 1 && <div className="product-gallery-thumbnails">
      {uniqueImages.map((url, index) => <button key={url} aria-label={`${t('photoLabel')} ${index + 1}`} aria-pressed={url === image} onClick={() => setSelected(url)}>
        <ProductImage src={url} alt="" />
      </button>)}
    </div>}
  </div>;
}
