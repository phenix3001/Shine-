const manufacturerPrefixes = [
  'Красносельский ювелирпром', 'Красная пресня', 'Вознесенский ЮЗ',
  'Sokolov', 'TALANT', 'Altea', 'Алькор', 'Кубачи', 'AQUAMARINE',
  'Svitozar', 'Diamant', 'Кристалл-L', 'KRASNOE', 'Вознесенский',
  'Prestige', 'David', 'POKROVSKY', 'TEOSA', 'Красцветмет',
  'Бронницкий', 'EVORA', 'Viart', 'Efendi-Art', 'Ювелита',
];

export function detectManufacturer(name: string, explicitBrand: string) {
  const normalizedBrand = explicitBrand.trim();
  const genericBrands = ['украшения', 'jewelry', 'әшекейлер'];
  if (normalizedBrand && !genericBrands.includes(normalizedBrand.toLocaleLowerCase())) return normalizedBrand;
  const normalizedName = name.toLocaleLowerCase();
  return manufacturerPrefixes.find((manufacturer) =>
    name.localeCompare(manufacturer, undefined, { sensitivity: 'accent', usage: 'search' }) === 0
    || normalizedName.includes(manufacturer.toLocaleLowerCase()),
  ) ?? '';
}
