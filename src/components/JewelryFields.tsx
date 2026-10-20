export const jewelryFields = ['Артикул', 'Цвет металла', 'Цвет вставки', 'Для кого', 'Проба',
  'Материал', 'Вставка', 'Страна производитель', 'Вес изделия', 'Особенности', 'Вид изделия',
  'Размер', 'Артикул производителя'] as const;

export function JewelryFields({ values, onChange }: {
  values: Record<string, string>; onChange: (name: string, value: string) => void;
}) {
  return <fieldset className="jewelry-fields"><legend>Характеристики украшения</legend>
    {jewelryFields.map((name) => <label key={name}>{name}
      <input value={values[name] ?? ''} maxLength={200}
        readOnly={name === 'Материал'}
        placeholder={name === 'Вес изделия' ? 'Например, 3,5 г' : undefined}
        onChange={(event) => onChange(name, event.target.value)} />
    </label>)}
  </fieldset>;
}
