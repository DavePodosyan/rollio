import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
// Hermes doesn't reliably ship Intl.PluralRules on all platforms/versions;
// this polyfills it so plural-form interpolation works if it's ever used.
import 'intl-pluralrules';

import en from './locales/en.json';

const resources = {
  en: { translation: en },
} as const;

const SUPPORTED_LANGUAGES = Object.keys(resources);

// Read the device language once at startup. No listener, no persistence, no
// in-app switcher — iOS 16+/Android 13+ expose a per-app language picker in
// system settings, which is the intended way to change this.
const [deviceLocale] = getLocales();
const deviceLanguage = deviceLocale.languageTag.split('-')[0];
const initialLanguage = SUPPORTED_LANGUAGES.includes(deviceLanguage) ? deviceLanguage : 'en';

i18next.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: 'en',
  defaultNS: 'translation',
  interpolation: {
    escapeValue: false, // React already escapes values
  },
});

export default i18next;
