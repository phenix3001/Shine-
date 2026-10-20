import { useState } from 'react';
import { useLanguage } from '../lib/i18n';

type ProductImageProps = {
  src: string | null;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
};

export function ProductImage({ src, alt, className, loading = 'eager' }: ProductImageProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const { t } = useLanguage();
  return src && src !== failedSource
    ? <img className={className} src={src} alt={alt} loading={loading} decoding="async" onError={() => setFailedSource(src)} />
    : <div className="product-image-placeholder"><strong>Shine</strong><span>{t('photoSoon')}</span></div>;
}
