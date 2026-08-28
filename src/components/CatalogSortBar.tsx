import { useLanguage } from '../lib/i18n';
import type { CatalogSort } from '../lib/sellerProducts';
import { AnimatedSelect } from './AnimatedSelect';

type CatalogSortBarProps = {
  value: CatalogSort;
  onChange: (value: CatalogSort) => void;
};

export function CatalogSortBar({ value, onChange }: CatalogSortBarProps) {
  const { t } = useLanguage();
  const options: { value: CatalogSort; label: string }[] = [
    { value: 'popular', label: t('popular') },
    { value: 'newest', label: t('newestFirst') },
    { value: 'price-asc', label: t('priceAscending') },
    { value: 'price-desc', label: t('priceDescending') },
    { value: 'rating', label: t('highRating') },
    { value: 'discount', label: t('bigDiscounts') },
  ];

  return <div className="catalog-sort-select">
    <AnimatedSelect label={t('sort')} value={value} options={options} onChange={(nextValue) => onChange(nextValue as CatalogSort)} />
  </div>;
}
