import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation } from 'wouter';
import { BrandLogo } from './BrandLogo';
import { ThemeToggle } from './ThemeToggle';
import { NotificationsMenu } from './NotificationsMenu';
import { useLanguage } from '../lib/i18n';
import { useCatalogSearch } from '../lib/useCatalogSearch';

export function SiteHeader() {
  const { t } = useLanguage();
  const [location, navigate] = useLocation();
  const { query, setQuery } = useCatalogSearch();
  const isCatalog = location === '/' || location === '/market';
  const [draft, setDraft] = useState(isCatalog ? query : '');

  useEffect(() => { setDraft(isCatalog ? query : ''); }, [isCatalog, location, query]);

  function searchCatalog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parameters = new URLSearchParams();
    if (draft.trim()) parameters.set('search', draft.trim());
    const search = parameters.toString();
    navigate(`/market${search ? `?${search}` : ''}`);
  }

  return <header className="market-header site-header">
    <div className="market-header__top">
      <BrandLogo />
      <form className="search-box" role="search" onSubmit={searchCatalog}>
        <button className="search-submit" type="submit" aria-label={t('search')}>
          <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></svg>
        </button>
        <input aria-label={t('search')} type="search" value={draft}
          onChange={(event) => {
            const value = event.target.value;
            setDraft(value);
            if (isCatalog) setQuery(value);
          }} placeholder={t('searchPlaceholder')} />
      </form>
      <div className="header-actions"><ThemeToggle /><NotificationsMenu /></div>
    </div>
  </header>;
}
