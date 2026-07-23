import 'i18next';
import en from './locales/en.json';

// en.json is the source of truth for every t() call in the app: add/rename a
// key here and every call site that used the old key becomes a compile error
// instead of silently falling back to the key name at runtime.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof en;
    };
  }
}
