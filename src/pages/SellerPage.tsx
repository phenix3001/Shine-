import { useState } from 'react';
import { Link } from 'wouter';
import { BrandLogo } from '../components/BrandLogo';
import { SellerSettings } from '../components/SellerSettings';
import { SellerWorkspace } from '../components/SellerWorkspace';
import { useLanguage } from '../lib/i18n';

export function SellerPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'products' | 'settings'>('products');
  return <main className="seller-page">
    <header className="seller-header"><BrandLogo /><Link href="/profile">{t('backToProfile')}</Link></header>
    <section className="seller-intro"><p>Shine</p><h1>{t('sellerCabinet')}</h1><span>{t('sellerIntro')}</span></section>
    <div className="profile-tabs" role="tablist" aria-label={t('sellerCabinet')}>
      <button className={activeTab === 'products' ? 'active' : ''} role="tab" aria-selected={activeTab === 'products'} onClick={() => setActiveTab('products')}>{t('myProducts')}</button>
      <button className={activeTab === 'settings' ? 'active' : ''} role="tab" aria-selected={activeTab === 'settings'} onClick={() => setActiveTab('settings')}>{t('sellerSettings')}</button>
    </div>
    {activeTab === 'products' ? <SellerWorkspace /> : <SellerSettings />}
  </main>;
}
