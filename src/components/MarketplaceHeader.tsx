import { BrandLogo } from './BrandLogo';
import { ThemeToggle } from './ThemeToggle';
import { useLanguage } from '../lib/i18n';

type MarketplaceHeaderProps = { query: string; onQueryChange: (query: string) => void };

export function MarketplaceHeader({ query, onQueryChange }: MarketplaceHeaderProps) {
  const { t } = useLanguage();
  return (
    <header className="market-header">
      <div className="market-header__top">
        <BrandLogo />
        <div className="header-actions">
          <ThemeToggle />
        </div>
      </div>
      <label className="search-box"><span>{t('search')}</span><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={t('searchPlaceholder')} /></label>
    </header>
  );
}
