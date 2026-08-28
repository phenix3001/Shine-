import type { Language } from '../lib/i18n';
import { useLanguage } from '../lib/i18n';

const copy: Record<Language, { eyebrow: string; title: string; description: string }> = {
  ru: {
    eyebrow: 'Наша философия',
    title: 'Украшения для твоего света.',
    description: 'Shine собирает в одном месте выразительные украшения от локальных брендов. Мы верим, что каждая деталь должна помогать тебе звучать ярче.',
  },
  kk: {
    eyebrow: 'Біздің философиямыз',
    title: 'Өз сәулеңе арналған әшекейлер.',
    description: 'Shine жергілікті брендтердің мәнерлі әшекейлерін бір жерге жинайды. Әрбір бөлшек сенің жарқын болуыңа көмектесуі керек.',
  },
  en: {
    eyebrow: 'Our philosophy',
    title: 'Jewelry for your own light.',
    description: 'Shine brings expressive jewelry from local brands into one place. We believe every detail should help you show your brightest self.',
  },
};

export function AboutSection() {
  const { language } = useLanguage();
  const text = copy[language];

  return (
    <section className="about-section" id="about">
      <p>{text.eyebrow}</p>
      <h2>{text.title}</h2>
      <span>{text.description}</span>
    </section>
  );
}
