import type { PropsWithChildren } from 'react';
import { useLanguage } from '../lib/i18n';
import { HomeSectionMenu } from './HomeSectionMenu';
import { SiteHeader } from './SiteHeader';

export function StorefrontLayout({ children }: PropsWithChildren) {
  const { t } = useLanguage();
  return <div className="storefront-layout">
    <button className="skip-link" onClick={() => document.querySelector<HTMLElement>('main')?.focus()}>{t('skipToContent')}</button>
    <SiteHeader />
    <HomeSectionMenu />
    {children}
  </div>;
}
