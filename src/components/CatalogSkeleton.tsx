import { useLanguage } from '../lib/i18n';

export function CatalogSkeleton({ count = 8 }: { count?: number }) {
  const { t } = useLanguage();
  return <div role="status" aria-label={t('loading')}>
    <div className="product-grid catalog-skeleton" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => <div className="skeleton-card" key={index}>
        <div className="skeleton-image" /><div className="skeleton-line" /><div className="skeleton-line short" />
      </div>)}
    </div>
  </div>;
}
