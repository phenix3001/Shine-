import { Link } from 'wouter';
import { AboutSection } from '../components/AboutSection';
import { BrandLogo } from '../components/BrandLogo';
import { ThemeToggle } from '../components/ThemeToggle';
import { useLanguage } from '../lib/i18n';

export function AboutPage() {
  const { t } = useLanguage();

  return (
    <main className="about-page">
      <header className="about-page-header">
        <BrandLogo />
        <div><ThemeToggle /><Link href="/">{t('backToShop')}</Link></div>
      </header>
      <AboutSection />
      <footer className="market-footer"><span>{t('footer')}</span><span>Almaty, Kazakhstan</span></footer>
    </main>
  );
}
