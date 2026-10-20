import { supabase } from './supabase';
import { catalogSpecifications } from './catalogSpecifications';
import type { SpecificationName } from './catalogSpecifications';

export type FilterOption = { value: string; count?: number; label?: string; color?: string };
export type CatalogFacets = {
  categories: FilterOption[];
  manufacturers: FilterOption[];
  specifications: Partial<Record<SpecificationName, FilterOption[]>>;
};

export const emptyCatalogFacets: CatalogFacets = { categories: [], manufacturers: [], specifications: {} };

function readOptions(value: unknown): FilterOption[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item: unknown) => {
    if (!item || typeof item !== 'object' || !('value' in item) || typeof item.value !== 'string' || !item.value.trim()) return [];
    const count = 'count' in item && typeof item.count === 'number' && Number.isFinite(item.count) && item.count > 0 ? item.count : undefined;
    return [{ value: item.value, count }];
  });
}

export async function loadCatalogFacets(signal: AbortSignal): Promise<CatalogFacets> {
  const { data, error } = await supabase.rpc('get_catalog_facets').abortSignal(signal);
  if (error) throw error;
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid catalog facets');
  const raw = data as Record<string, unknown>;
  const specifications: CatalogFacets['specifications'] = {};
  if (raw.specifications && typeof raw.specifications === 'object') {
    const fields = raw.specifications as Record<string, unknown>;
    for (const field of catalogSpecifications) specifications[field.name] = readOptions(fields[field.name]);
  }
  return { categories: readOptions(raw.categories), manufacturers: readOptions(raw.manufacturers), specifications };
}
