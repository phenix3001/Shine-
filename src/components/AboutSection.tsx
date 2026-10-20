import type { Language } from '../lib/i18n';
import { useLanguage } from '../lib/i18n';

const copy: Record<Language, { eyebrow: string; title: string; description: string }> = {
  ru: {
    eyebrow: 'Наша философия',
    title: 'Серебро для твоего света.',
    description: 'Shine — магазин серебряных украшений. Кольца, серьги, цепочки и браслеты для повседневных образов и особенных моментов. Найди деталь, в которой узнаешь себя.',
  },
  kk: {
    eyebrow: 'Біздің философиямыз',
    title: 'Өз сәулеңе арналған күміс.',
    description: 'Shine — күміс әшекейлер дүкені. Күнделікті бейнелер мен ерекше сәттерге арналған сақиналар, сырғалар, алқалар және білезіктер. Өзіңе жарасатын әшекейді тап.',
  },
  en: {
    eyebrow: 'Our philosophy',
    title: 'Silver for your own light.',
    description: 'Shine is a silver jewelry store. Discover rings, earrings, chains and bracelets for everyday looks and special moments. Find the detail that feels like you.',
  },
};

export function AboutSection() {
  const { language } = useLanguage();
  const text = copy[language];

  return (
    <section className="about-section" id="about">
      <p>{text.eyebrow}</p>
      <h1>{text.title}</h1>
      <span>{text.description}</span>
    </section>
  );
}
