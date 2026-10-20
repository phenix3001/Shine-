import { useTheme } from '../lib/theme';
import { useLanguage } from '../lib/i18n';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();
  const nextTheme = theme === 'light' ? 'dark' : 'light';

  return <button
    className="theme-toggle"
    onClick={() => setTheme(nextTheme)}
    aria-label={`${t('enableTheme')} ${t(nextTheme === 'dark' ? 'darkTheme' : 'lightTheme')}`}
    title={`${t('enableTheme')} ${t(nextTheme === 'dark' ? 'darkTheme' : 'lightTheme')}`}
    aria-pressed={theme === 'dark'}
  >
    {theme === 'light' ? '☾' : '☀'}
  </button>;
}
