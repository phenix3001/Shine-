import { useId } from 'react';

export type SelectOption = { value: string; label: string };
type AnimatedSelectProps = {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
};

export function AnimatedSelect({ label, value, options, onChange }: AnimatedSelectProps) {
  const id = useId();
  return <div className="catalog-filter-field">
    <label htmlFor={id}>{label}</label>
    <div className="animated-select">
      <select id={id} className="animated-select-trigger" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <span className="select-chevron" aria-hidden="true">⌄</span>
    </div>
  </div>;
}
