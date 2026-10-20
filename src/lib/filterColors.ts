import type { FilterOption } from './catalogFacets';
import type { Language } from './i18n';

const colors: Record<string, string> = {
  'зеленый': '#299b50', 'черный': '#151515', 'красный': '#e23d3d', 'синий': '#3168dd',
  'белый': '#fff', 'желтый': '#e5bd28', 'розовый': '#e394b4', 'голубой': '#6fb7e0',
  'фиолетовый': '#9152bd', 'серый': '#90979f', 'коричневый': '#976745', 'оранжевый': '#ec8a32',
  'серебристый': '#bcc3cb', 'золотистый': '#c6a54f', 'бесцветный': '#f5f8fa',
};

const popularStoneColors = [
  { value: 'зеленый', ru: 'Зелёный', kk: 'Жасыл', en: 'Green' },
  { value: 'черный', ru: 'Чёрный', kk: 'Қара', en: 'Black' },
  { value: 'красный', ru: 'Красный', kk: 'Қызыл', en: 'Red' },
  { value: 'синий', ru: 'Синий', kk: 'Көк', en: 'Blue' },
  { value: 'белый', ru: 'Белый', kk: 'Ақ', en: 'White' },
];

function normalizeColor(value: string) {
  return value.trim().toLowerCase().replace(/ё/g, 'е');
}

export function filterColor(value: string) {
  return colors[normalizeColor(value)];
}

export function stoneColorOptions(options: FilterOption[], language: Language): FilterOption[] {
  return options.map((option) => {
    const rank = popularStoneColors.findIndex((color) => color.value === normalizeColor(option.value));
    return { option: rank < 0 ? option : { ...option, label: popularStoneColors[rank][language] },
      rank: rank < 0 ? popularStoneColors.length : rank };
  }).sort((first, second) => first.rank - second.rank).map(({ option }) => option);
}
