import { useEffect, useId, useRef, useState } from 'react';

export type SelectOption = { value: string; label: string };

type AnimatedSelectProps = {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
};

export function AnimatedSelect({ label, value, options, onChange }: AnimatedSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const selectedLabel = options.find((option) => option.value === value)?.label ?? options[0]?.label;

  useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  return (
    <div className="catalog-filter-field" ref={rootRef}>
      <span id={labelId}>{label}</span>
      <div className={`animated-select${isOpen ? ' open' : ''}`}>
        <button className="animated-select-trigger" type="button" aria-labelledby={labelId} aria-expanded={isOpen} onClick={() => setIsOpen((open) => !open)}>
          {selectedLabel}<i aria-hidden="true">⌄</i>
        </button>
        <div className="animated-select-options" role="listbox" aria-labelledby={labelId}>
          {options.map((option) => (
            <button
              className={`animated-select-option${option.value === value ? ' selected' : ''}`}
              type="button"
              role="option"
              aria-selected={option.value === value}
              key={option.value}
              onClick={() => { onChange(option.value); setIsOpen(false); }}
            >{option.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
