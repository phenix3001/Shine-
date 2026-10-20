import { useId, useRef, useState } from 'react';
import { catalogJewelryCategories, getJewelryCategoryLabel } from '../lib/jewelry';
import { useLanguage } from '../lib/i18n';
import { CheckboxFilterGroup } from './CheckboxFilterGroup';
import { CatalogSpecificationFilters } from './CatalogSpecificationFilters';
import type { SpecificationFilters, SpecificationName } from '../lib/catalogSpecifications';
import type { CatalogFacets } from '../lib/catalogFacets';

type CatalogFiltersProps = {
  categories: string[];
  manufacturers: string[];
  facets: CatalogFacets;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  minPrice: string;
  maxPrice: string;
  specifications: SpecificationFilters;
  onSpecificationChange: (name: SpecificationName, value: string[]) => void;
  onCategoryChange: (value: string[]) => void;
  onManufacturerChange: (value: string[]) => void;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  onReset: () => void;
};

export function CatalogFilters(props: CatalogFiltersProps) {
  const { language, t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const panel = useRef<HTMLElement>(null);
  const bodyId = useId();
  const activeCount = props.categories.length + props.manufacturers.length
    + Object.values(props.specifications).reduce((sum, values) => sum + values.length, 0)
    + Number(props.minPrice !== '') + Number(props.maxPrice !== '');
  const categoryOptions = catalogJewelryCategories.map((value) => ({ value,
    label: getJewelryCategoryLabel(value, language), count: props.facets.categories.find((option) => option.value === value)?.count,
  })).filter((option) => !props.facets.categories.length || option.count !== undefined || props.categories.includes(option.value));

  return <aside className="catalog-filters" aria-label={t('filters')} ref={panel}>
    <div className="filter-panel-heading"><h3>{t('filters')}{activeCount > 0 && <span className="filter-count">{activeCount}</span>}</h3>
      <button className="filter-reset" type="button" onClick={props.onReset}>{t('reset')}</button></div>
    <p className="filter-hint">{t('filterHint')}</p>
    <button className="filter-mobile-toggle" type="button" aria-expanded={mobileOpen} aria-controls={bodyId} onClick={() => setMobileOpen(!mobileOpen)}>{t(mobileOpen ? 'hideFilters' : 'showFilters')}<span aria-hidden="true">{mobileOpen ? '−' : '+'}</span></button>
    <div className="catalog-filter-body" id={bodyId} data-mobile-open={mobileOpen}>
      <CheckboxFilterGroup title={t('productType')} selected={props.categories} options={categoryOptions} onChange={props.onCategoryChange} />
      <fieldset className="filter-price-range"><legend>{t('price')}, ₸</legend><div>
        <label>{t('priceFrom')}<input type="number" min="0" step="1" inputMode="numeric" placeholder="0" value={props.minPrice} onChange={(event) => props.onMinPriceChange(event.target.value)} /></label>
        <label>{t('priceTo')}<input type="number" min="0" step="1" inputMode="numeric" placeholder="∞" value={props.maxPrice} onChange={(event) => props.onMaxPriceChange(event.target.value)} /></label>
      </div></fieldset>
      <CatalogSpecificationFilters values={props.specifications} options={props.facets.specifications} onChange={props.onSpecificationChange} />
      <CheckboxFilterGroup title={t('manufacturer')} selected={props.manufacturers} options={props.facets.manufacturers} onChange={props.onManufacturerChange} />
      {props.loading && <p className="filter-status" role="status">{t('filtersLoading')}</p>}
      {props.error && <div className="filter-status" role="status"><p>{t('filtersError')}</p><button type="button" onClick={props.onRetry}>{t('retry')}</button></div>}
    </div>
    <button className="filter-view-results" type="button" data-mobile-open={mobileOpen} onClick={() => { setMobileOpen(false); requestAnimationFrame(() => panel.current?.scrollIntoView({ block: 'start' })); }}>{t('showProducts')}<span aria-hidden="true">↓</span></button>
  </aside>;
}
