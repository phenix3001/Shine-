import { useLocation, useSearch } from 'wouter';

export function useCatalogSearch() {
  const [location, navigate] = useLocation();
  const search = useSearch();
  const query = new URLSearchParams(search).get('search') ?? '';

  function setQuery(value: string) {
    const parameters = new URLSearchParams(search);
    if (value) parameters.set('search', value);
    else parameters.delete('search');
    const nextSearch = parameters.toString();
    navigate(`${location}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`, { replace: true });
  }

  return { query, setQuery };
}
