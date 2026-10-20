import { BrandLogo } from './BrandLogo';
import { ThemeToggle } from './ThemeToggle';
import { NotificationsMenu } from './NotificationsMenu';
import { useLanguage } from '../lib/i18n';

type MarketplaceHeaderProps = { query: string; onQueryChange: (query: string) => void };

export function MarketplaceHeader({ query, onQueryChange }: MarketplaceHeaderProps) {
  const { t } = useLanguage();
  return (
    <header className="market-header">
      <div className="market-header__top">
        <BrandLogo />
        <label className="search-box">
          <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></svg>
          <input aria-label={t('search')} type="search" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={t('searchPlaceholder')} />
        </label>
        <div className="header-actions">
          <ThemeToggle />
          <NotificationsMenu />
        </div>
      </div>
    </header>
  );
}
