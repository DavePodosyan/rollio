# Adding a language to Rollio

The app ships English-only today. Everything below is what it takes to add a second
(or third) language — it's designed to be a translation-file drop-in with no code
changes.

There are **two separate locale systems** in this app. Don't confuse them:

| | Purpose | Lives at |
|---|---|---|
| **JS/UI strings** | Everything rendered by React — screens, alerts, buttons | `i18n/locales/<lang>.json` |
| **Native permission strings** | iOS `Info.plist` camera/photo permission prompts | `native-locales/<lang>.json` |

Both need a file per language. Neither is optional if you want the new language to
look complete — the native one is easy to forget because it's invisible until the OS
shows a permission dialog.

## Steps

1. **Translate the JS strings.**
   Copy `i18n/locales/en.json` to `i18n/locales/<lang>.json` (e.g. `ja.json`,
   `ko.json`) and hand it to a translator. Rules for the translator / reviewer:
   - Every key's English value is what gets replaced. Key *names* never change.
   - Anything inside `{{double braces}}` (e.g. `{{iso}}`, `{{value}}`, `{{stops}}`)
     is a placeholder filled in by code at runtime — it must appear in the
     translated string, but the word inside the braces must stay exactly as-is.
   - **Never translate:** film stock/camera/lens names (this app doesn't have
     presets, but if that ever changes, still never), ISO/aperture/shutter-speed
     *values*, the word "Auto" wherever it appears as a value, "ISO" itself (stays
     "ISO" in every language), and the brand name "Rollio".
   - If a key's English value is a full sentence with a placeholder embedded
     mid-sentence (e.g. `filmSettingsFromPhoto.suggestionIntro`,
     `support.version`), the translator can freely reorder words around the
     placeholder — that's exactly why those are separate interpolated keys
     instead of runtime string concatenation.

2. **Register the new language in `i18n/index.ts`.**
   Add one line to the `resources` object:
   ```ts
   import ja from './locales/ja.json';

   const resources = {
     en: { translation: en },
     ja: { translation: ja },
   } as const;
   ```
   That's it — `SUPPORTED_LANGUAGES` is derived from `Object.keys(resources)`, and
   the device-locale detection in the same file will pick it up automatically if
   the device's language matches.

3. **Translate the native permission strings.**
   Copy `native-locales/en.json` to `native-locales/<lang>.json` and translate its
   3 keys (`NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`,
   `NSPhotoLibraryAddUsageDescription`). Keep `$(PRODUCT_NAME)` literally as-is —
   iOS substitutes it at runtime, it is not translatable text.

4. **Wire the native file into `app.json`.**
   Add an entry to the `locales` field:
   ```json
   "locales": {
     "en": "./native-locales/en.json",
     "ja": "./native-locales/ja.json"
   }
   ```

5. **Add the language to the OS language picker.**
   In `app.json`, extend the `expo-localization` plugin's `supportedLocales`:
   ```json
   [
     "expo-localization",
     { "supportedLocales": ["en", "ja"] }
   ]
   ```
   This is what makes the language show up in iOS/Android's per-app language
   picker (Settings → Rollio → Language, iOS 16+ / Android 13+) — there is no
   in-app language switcher by design; the OS setting is the only way a user
   changes it.

6. **Rebuild the native project.**
   Both `app.json` changes in steps 4–5 only take effect after
   `npx expo prebuild --clean` or a fresh EAS build. A JS-only reload (Fast
   Refresh, `expo start`) is enough to see the new JS translations if you're
   testing in-app, but **not** enough to see the language in the OS picker or to
   get the localized permission prompts — those need the native rebuild.

7. **Test it.**
   - Switch the device/simulator's per-app language for Rollio to the new
     language (iOS: Settings → Rollio → Language; Android: Settings → Apps →
     Rollio → Language), relaunch the app.
   - Walk the regression checklist from the localization work: light meter
     formsheet, image-attach flow, both modals, roll list/detail, support screen,
     tab bar — same screens as the English regression pass, just reading the new
     language instead.
   - Specifically check line-wrapping in the light meter formsheet's two header
     rows and the tab bar — those have the least slack for longer translated text
     (see `LOCALIZATION_AUDIT.md` at the repo root for the full layout-risk
     writeup if things look cramped).
   - Trigger a camera and a photo-library permission prompt to confirm the native
     strings picked up too — this is the step people forget because everything
     else works without it.

## What never needs to change

- `utils/filmStatusLabels.ts` and `utils/cameraSettingsLabels.ts` — these already
  route through `i18n.t()`. Adding a language doesn't touch them.
- Any `t('...')` call site in the app — the *keys* are fixed; only the JSON files
  change.
- The `FilmStatus` enum values (`'in-camera'`, `'developing'`, `'archived'`) or the
  `"Auto"` sentinel stored in SQLite — those are permanent internal codes, not
  translatable text, and must never appear in a translation file's *keys*, only
  as values a translator overwrites.
