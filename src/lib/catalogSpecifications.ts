import type { Language } from './i18n';

export const catalogSpecifications = [
  { name: 'Цвет металла', kk: 'Металл түсі', en: 'Metal color' },
  { name: 'Цвет вставки', kk: 'Қондырма түсі', en: 'Stone color' },
  { name: 'Для кого', kk: 'Кімге арналған', en: 'For whom' },
  { name: 'Материал', kk: 'Материал', en: 'Material' },
  { name: 'Проба', kk: 'Сынама', en: 'Fineness' },
  { name: 'Вставка', kk: 'Қондырма', en: 'Stone' },
  { name: 'Вид', kk: 'Түрі', en: 'Type' },
  { name: 'Застежка', kk: 'Ілгек', en: 'Clasp' },
  { name: 'Страна производитель', kk: 'Өндіруші ел', en: 'Country of manufacture' },
  { name: 'Вес изделия', kk: 'Бұйым салмағы', en: 'Product weight' },
  { name: 'Особенности', kk: 'Ерекшеліктері', en: 'Features' },
  { name: 'Артикул производителя', kk: 'Өндіруші артикулы', en: 'Manufacturer SKU' },
] as const;

export type SpecificationName = typeof catalogSpecifications[number]['name'];
export type SpecificationFilters = Partial<Record<SpecificationName, string[]>>;

export function specificationLabel(field: typeof catalogSpecifications[number], language: Language) {
  return language === 'ru' ? field.name : field[language];
}
