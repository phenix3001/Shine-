import type { Language } from './i18n';
import { accountEn } from './accountLocales/en';
import { accountKk } from './accountLocales/kk';
import { accountRu } from './accountLocales/ru';

const dictionaries = { ru: accountRu, en: accountEn, kk: accountKk };
export function getAccountCopy(language: Language) { return dictionaries[language]; }
