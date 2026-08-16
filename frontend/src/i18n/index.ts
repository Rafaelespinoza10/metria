import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import es from './locales/es.json';

export const supportedLanguages = ['en', 'es'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

function detectLanguage(): SupportedLanguage {
  const deviceLanguage = getLocales()[0]?.languageCode;
  return deviceLanguage === 'es' ? 'es' : 'en';
}

// i18next's documented API is the default export's fluent chain.
// eslint-disable-next-line import/no-named-as-default-member
void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  lng: detectLanguage(),
  fallbackLng: 'en',
  interpolation: {
    // React already escapes rendered strings.
    escapeValue: false,
  },
});

export default i18n;
