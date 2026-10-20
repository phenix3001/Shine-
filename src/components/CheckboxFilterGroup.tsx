import { useId, useState } from 'react';
import type { FilterOption } from '../lib/catalogFacets';
import { useLanguage } from '../lib/i18n';

type Props = { title: string; options: FilterOption[]; selected: string[]; defaultOpen?: boolean; onChange: (values: string[]) => void };
const visibleLimit = 5;

export function CheckboxFilterGroup({ title, options, selected, defaultOpen = true, onChange }: Props) {
  const { t } = useLanguage();
  const listId = useId();
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');
  const choices: FilterOption[] = [...options, ...selected.filter((value) => !options.some((option) => option.value === value)).map((value) => ({ value }))];
  const matching = choices.filter((option) => (option.label ?? option.value).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const visible = expanded ? matching : matching.filter((option, index) => index < visibleLimit || selected.includes(option.value));
  if (!choices.length) return null;

  return <details className="checkbox-filter-group" open={defaultOpen}>
    <summary><span>{title}</span>{selected.length > 0 && <span className="filter-count">{selected.length}</span>}<span className="filter-chevron" aria-hidden="true" /></summary>
    {expanded && choices.length > 10 && <input className="filter-option-search" type="search" aria-label={`${t('searchInFilter')}: ${title}`} placeholder={t('search')} value={search} onChange={(event) => setSearch(event.target.value)} />}
    <div className="filter-option-list" id={listId} role="group" aria-label={title}>
      {visible.map((option) => <label className="filter-option" key={option.value}>
        <input type="checkbox" checked={selected.includes(option.value)} onChange={(event) => onChange(event.target.checked ? [...selected, option.value] : selected.filter((value) => value !== option.value))} />
        {option.color && <span className="filter-color" style={{ backgroundColor: option.color }} aria-hidden="true" />}
        <span className="filter-option-label">{option.label ?? option.value}</span>
        {option.count !== undefined && <span className="filter-option-count" aria-hidden="true">{option.count}</span>}
      </label>)}
      {matching.length === 0 && <p className="filter-option-empty">{t('noResults')}</p>}
    </div>
    {choices.length > visibleLimit && <button className="filter-show-more" type="button" aria-expanded={expanded} aria-controls={listId} onClick={() => { setExpanded(!expanded); setSearch(''); }}>{t(expanded ? 'showLess' : 'showMore')}</button>}
  </details>;
}
