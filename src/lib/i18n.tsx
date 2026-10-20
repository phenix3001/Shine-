import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { en } from './locales/en';
import { kk } from './locales/kk';
import { ru } from './locales/ru';
import { readPreference, savePreference } from './browserStorage';

export type Language = 'kk' | 'ru' | 'en';
type TranslationKey = keyof typeof ru;
const dictionaries = { kk, ru, en };

type LanguageContextValue = {
  language: Language;
  locale: string;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getSavedLanguage(): Language {
  const saved = readPreference('shine-language');
  return saved === 'kk' || saved === 'en' ? saved : 'ru';
}

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setLanguage] = useState<Language>(getSavedLanguage);

  useEffect(() => {
    savePreference('shine-language', language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    locale: language === 'kk' ? 'kk-KZ' : language === 'en' ? 'en-US' : 'ru-RU',
    setLanguage,
    t: (key) => dictionaries[language][key],
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}
