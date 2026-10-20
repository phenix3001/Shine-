import { Link } from 'wouter';
import { useLanguage } from '../lib/i18n';

export function PageBackLink({ catalog = false }: { catalog?: boolean }) {
  const { t } = useLanguage();
  return <nav className="page-navigation">
    <Link href={catalog ? '/#catalog' : '/'}>{t(catalog ? 'backToCatalog' : 'backToShop')}</Link>
  </nav>;
}
