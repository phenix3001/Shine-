export const jewelryCategories = [
  'Кольца',
  'Серьги',
  'Браслеты',
  'Колье',
  'Подвески',
  'Броши',
  'Другое украшение',
] as const;

export const catalogJewelryCategories = [...jewelryCategories, 'Украшения'];

const categoryLabels: Record<Language, Record<string, string>> = {
  ru: {},
  kk: { Кольца: 'Сақиналар', Серьги: 'Сырғалар', Браслеты: 'Білезіктер', Колье: 'Алқалар', Подвески: 'Аспалар', Броши: 'Түйреуіштер', Украшения: 'Әшекейлер', 'Другое украшение': 'Басқа әшекей' },
  en: { Кольца: 'Rings', Серьги: 'Earrings', Браслеты: 'Bracelets', Колье: 'Necklaces', Подвески: 'Pendants', Броши: 'Brooches', Украшения: 'Jewelry', 'Другое украшение': 'Other jewelry' },
};

export function getJewelryCategoryLabel(category: string, language: Language) {
  return categoryLabels[language][category] ?? category;
}
import type { Language } from './i18n';
