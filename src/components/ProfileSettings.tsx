import { Theme, useTheme } from '../lib/theme';
import { Language, useLanguage } from '../lib/i18n';
import { Link } from 'wouter';
import { AccountActions } from './AccountActions';

const languages: { value: Language; label: string }[] = [
  { value: 'kk', label: 'Қазақша' },
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' },
];

export function ProfileSettings() {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const themes: { value: Theme; title: string; description: string }[] = [
    { value: 'light', title: t('light'), description: t('lightDescription') },
    { value: 'dark', title: t('dark'), description: t('darkDescription') },
  ];

  return <section className="profile-settings">
    <h2>{t('settings')}</h2>
    <p>{t('settingsIntro')}</p>
    <h3 className="settings-section-title">{t('siteTheme')}</h3>
    <div className="theme-options" role="radiogroup" aria-label={t('siteTheme')}>
      {themes.map((option) => <button
        key={option.value}
        className={`theme-option theme-option--${option.value}${theme === option.value ? ' selected' : ''}`}
        role="radio"
        aria-checked={theme === option.value}
        onClick={() => setTheme(option.value)}
      >
        <span className="theme-preview" aria-hidden="true" />
        <strong>{option.title}</strong>
        <small>{option.description}</small>
      </button>)}
    </div>
    <h3 className="settings-section-title">{t('language')}</h3>
    <p>{t('languageIntro')}</p>
    <div className="language-options" role="radiogroup" aria-label={t('language')}>
      {languages.map((option) => <button
        key={option.value}
        className={language === option.value ? 'selected' : ''}
        role="radio"
        aria-checked={language === option.value}
        lang={option.value}
        onClick={() => setLanguage(option.value)}
      >{option.label}</button>)}
    </div>
    <div className="seller-settings-link">
      <div><strong>{t('forSellers')}</strong><p>{t('sellerSettingsLinkIntro')}</p></div>
      <Link href="/seller">{t('openSellerCabinet')}</Link>
    </div>
    <AccountActions />
  </section>;
}
