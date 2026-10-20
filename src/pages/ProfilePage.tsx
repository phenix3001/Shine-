import { useState } from 'react';
import { PageBackLink } from '../components/PageBackLink';
import { ProfileProductCollection } from '../components/ProfileProductCollection';
import { ProfileSettings } from '../components/ProfileSettings';
import { useAuth } from '../lib/auth';
import { UserAvatar } from '../components/UserAvatar';
import { useLanguage } from '../lib/i18n';

type ProfileTab = 'favorites' | 'viewed' | 'settings';

export function ProfilePage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<ProfileTab>('favorites');
  const tabs: { value: ProfileTab; label: string }[] = [
    { value: 'favorites', label: t('favorites') },
    { value: 'viewed', label: t('recentlyViewed') },
    { value: 'settings', label: t('settings') },
  ];

  return <main className="seller-page">
    <PageBackLink />
    <section className="profile-hero">
      <div className="profile-hero-avatar">
        <UserAvatar user={user} />
      </div>
      <div><h1>{t('profile')}</h1><span>{user?.email ?? t('profileCollectionsIntro')}</span></div>
      <i aria-hidden="true">◇</i>
    </section>
    <div className="profile-tabs" role="tablist" aria-label={t('profile')}>
      {tabs.map((tab) => <button
        key={tab.value}
        className={activeTab === tab.value ? 'active' : ''}
        role="tab"
        id={`profile-tab-${tab.value}`}
        aria-controls="profile-panel"
        aria-selected={activeTab === tab.value}
        tabIndex={activeTab === tab.value ? 0 : -1}
        onClick={() => setActiveTab(tab.value)}
        onKeyDown={(event) => {
          const index = tabs.findIndex((item) => item.value === activeTab);
          const nextIndex = event.key === 'ArrowRight' ? (index + 1) % tabs.length
            : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length
              : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
          if (nextIndex === null) return;
          event.preventDefault();
          setActiveTab(tabs[nextIndex].value);
          document.getElementById(`profile-tab-${tabs[nextIndex].value}`)?.focus();
        }}
      >{tab.label}</button>)}
    </div>
    <section id="profile-panel" role="tabpanel" aria-labelledby={`profile-tab-${activeTab}`}>
      {activeTab === 'favorites' && <ProfileProductCollection key={`${user?.id}:favorites`} mode="favorites" />}
      {activeTab === 'viewed' && <ProfileProductCollection key={`${user?.id}:viewed`} mode="viewed" />}
      {activeTab === 'settings' && <ProfileSettings />}
    </section>
  </main>;
}
