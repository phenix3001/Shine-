import { AboutSection } from '../components/AboutSection';
import { PageBackLink } from '../components/PageBackLink';
import { useLanguage } from '../lib/i18n';

export function AboutPage() {
  const { t } = useLanguage();

  return (
    <main className="about-page">
      <PageBackLink />
      <AboutSection />
      <footer className="market-footer"><span>{t('footer')}</span><span>Almaty, Kazakhstan</span></footer>
    </main>
  );
}
