import { useLanguage } from '../lib/i18n';
import { Link } from 'wouter';

export function CollectionHero() {
  const { t } = useLanguage();
  return <section className="market-hero" id="new">
    <p className="hero-eyebrow"><span aria-hidden="true">✧</span>{t('heroEyebrow')}</p>
    <h1>{t('heroTitle')}<br /><span>{t('heroSubtitle')}</span></h1>
    <p className="hero-description">{t('heroDescription')}</p>
    <Link href="/#catalog">{t('viewCollection')}<span aria-hidden="true">↗</span></Link>
    <span className="hero-note">{t('heroNote')}</span>
    <div className="hero-signature" aria-hidden="true">Shine<span>JEWELRY COLLECTION</span></div>
  </section>;
}
