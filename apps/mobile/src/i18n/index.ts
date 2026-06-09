import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import de from './locales/de.json';
import en from './locales/en.json';

export const SUPPORTED_LANGUAGES = ['de', 'en'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/** The device's preferred language, falling back to English when it isn't one we support. */
export function deviceLanguage(): AppLanguage {
  const code = getLocales()[0]?.languageCode ?? 'en';
  return code === 'de' ? 'de' : 'en';
}

// Initialized once (side-effect import). The persisted user override, if any, is applied later by
// the locale store's hydrate(); until then we use the device language.
void i18n.use(initReactI18next).init({
  resources: {
    de: { translation: de },
    en: { translation: en },
  },
  lng: deviceLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
