import { useLanguage } from '../lib/i18n';

export function PageLoading() {
  const { t } = useLanguage();
  return <main className="market-page route-loading" tabIndex={-1} aria-busy="true">
    <p role="status">{t('loading')}</p>
  </main>;
}
