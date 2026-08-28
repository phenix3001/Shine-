import { catalogJewelryCategories, getJewelryCategoryLabel } from '../lib/jewelry';
import { useLanguage } from '../lib/i18n';
import { AnimatedSelect } from './AnimatedSelect';
type CatalogFiltersProps = {
  category: string;
  manufacturer: string;
  manufacturers: string[];
  minPrice: string;
  maxPrice: string;
  onCategoryChange: (value: string) => void;
  onManufacturerChange: (value: string) => void;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  onReset: () => void;
};

export function CatalogFilters(props: CatalogFiltersProps) {
  const { language, t } = useLanguage();
  const categoryOptions = [
    { value: 'All', label: t('all') },
    ...catalogJewelryCategories.map((category) => ({ value: category, label: getJewelryCategoryLabel(category, language) })),
  ];
  const manufacturerOptions = [
    { value: 'All', label: t('allManufacturers') },
    ...props.manufacturers.map((manufacturer) => ({ value: manufacturer, label: manufacturer })),
  ];

  return <section className="catalog-filters" aria-label={t('filters')}>
    <AnimatedSelect label={t('category')} value={props.category} options={categoryOptions} onChange={props.onCategoryChange} />
    <AnimatedSelect label={t('manufacturer')} value={props.manufacturer} options={manufacturerOptions} onChange={props.onManufacturerChange} />
    <label>{t('priceFrom')}<input type="number" min="0" inputMode="numeric" value={props.minPrice} onChange={(event) => props.onMinPriceChange(event.target.value)} /></label>
    <label>{t('priceTo')}<input type="number" min="0" inputMode="numeric" value={props.maxPrice} onChange={(event) => props.onMaxPriceChange(event.target.value)} /></label>
    <button type="button" onClick={props.onReset}>{t('reset')}</button>
  </section>;
}
