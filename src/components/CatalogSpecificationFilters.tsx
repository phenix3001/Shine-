import { catalogSpecifications, specificationLabel } from '../lib/catalogSpecifications';
import type { SpecificationFilters, SpecificationName } from '../lib/catalogSpecifications';
import { useLanguage } from '../lib/i18n';
import type { CatalogFacets } from '../lib/catalogFacets';
import { filterColor, stoneColorOptions } from '../lib/filterColors';
import { CheckboxFilterGroup } from './CheckboxFilterGroup';

export function CatalogSpecificationFilters({ values, options, onChange }: {
  values: SpecificationFilters;
  options: CatalogFacets['specifications'];
  onChange: (name: SpecificationName, value: string[]) => void;
}) {
  const { language } = useLanguage();
  return <>{catalogSpecifications.map((field) => <CheckboxFilterGroup key={field.name}
    defaultOpen={['Цвет металла', 'Цвет вставки', 'Для кого', 'Материал'].includes(field.name)}
    title={specificationLabel(field, language)} selected={values[field.name] ?? []}
    options={(field.name === 'Цвет вставки' ? stoneColorOptions(options[field.name] ?? [], language) : options[field.name] ?? []).map((option) => ({ ...option,
      color: field.name.startsWith('Цвет') ? filterColor(option.value) : undefined,
    }))} onChange={(next) => onChange(field.name, next)} />)}</>;
}
