import { useState } from 'react';
import { Link } from 'wouter';
import { BrandLogo } from '../components/BrandLogo';
import { ProfileProductCollection } from '../components/ProfileProductCollection';
import { ProfileSettings } from '../components/ProfileSettings';
import { getUserAvatarUrl, useAuth } from '../lib/auth';
import { useLanguage } from '../lib/i18n';

type ProfileTab = 'favorites' | 'viewed' | 'settings';

export function ProfilePage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const avatarUrl = getUserAvatarUrl(user);
  const [activeTab, setActiveTab] = useState<ProfileTab>('favorites');
  const tabs: { value: ProfileTab; label: string }[] = [
    { value: 'favorites', label: t('favorites') },
    { value: 'viewed', label: t('recentlyViewed') },
    { value: 'settings', label: t('settings') },
  ];

  return <main className="seller-page">
    <header className="seller-header"><BrandLogo /><Link href="/">{t('backToShop')}</Link></header>
    <section className="profile-hero">
      <div className="profile-hero-avatar">
        {avatarUrl ? <img src={avatarUrl} alt="" referrerPolicy="no-referrer" /> : user?.email?.charAt(0).toUpperCase() ?? 'S'}
      </div>
      <div><p>{t('personalArea')}</p><h1>{t('profile')}</h1><span>{user?.email ?? t('profileCollectionsIntro')}</span></div>
      <i aria-hidden="true">◇</i>
    </section>
    <div className="profile-tabs" role="tablist" aria-label={t('profile')}>
      {tabs.map((tab) => <button
        key={tab.value}
        className={activeTab === tab.value ? 'active' : ''}
        role="tab"
        aria-selected={activeTab === tab.value}
        onClick={() => setActiveTab(tab.value)}
      >{tab.label}</button>)}
    </div>
    {activeTab === 'favorites' && <ProfileProductCollection mode="favorites" />}
    {activeTab === 'viewed' && <ProfileProductCollection mode="viewed" />}
    {activeTab === 'settings' && <ProfileSettings />}
  </main>;
}
