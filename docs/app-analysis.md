# Rollio App Analysis

Last analyzed: 2026-06-04

## App Identity

Rollio is an offline analog photography log for tracking film rolls and individual frames. The public README describes the core promise as no login, no cloud, and local-only storage.

## Stack

- Expo app using `expo-router` with `main` set to `expo-router/entry`.
- React 19.2, React Native 0.83, Expo SDK 55-era packages.
- TypeScript is strict and uses the `@/*` path alias for repo-root imports.
- Local persistence is handled with `expo-sqlite`.
- UI depends heavily on iOS/native-feeling primitives: `expo-router/unstable-native-tabs`, `@expo/ui/swift-ui`, `expo-symbols`, `expo-glass-effect`, `expo-linear-gradient`, haptics, and custom Lufga fonts.
- Camera/light meter work uses `react-native-vision-camera`.
- Image picking/saving uses `expo-image-picker`, `expo-media-library`, `expo-file-system`, and `@lodev09/react-native-exify`.
- There is a local Expo module at `modules/my-segmented-control`.

## Project Layout

- `app/`: Expo Router screens and layouts.
- `app/(tabs)/films`: film list and film detail.
- `app/(tabs)/light_meter`: camera light meter and form sheet result UI.
- `app/(tabs)/support`: support tab.
- `app/(modal)`: add/edit film and frame modal screens.
- `components/`: reusable UI pieces such as list items, ruler picker, image uploader, and EXIF suggestion UI.
- `hooks/`: screen-facing data hooks around SQLite services.
- `services/database.ts`: SQLite schema, migrations, and CRUD operations.
- `types/index.ts`: canonical app data types.
- `utils/`: constants, exposure calculations, image file service, status colors, and camera setting options.
- `assets/`: fonts, icons, app images, screenshots.

## Navigation

- Root layout `app/_layout.tsx` loads fonts, initializes `SQLiteProvider` with `rollio.db`, wraps safe area and gesture handling, then renders a root `Stack`.
- Main tabs are in `app/(tabs)/_layout.tsx` using `NativeTabs` with tabs:
  - `films`
  - `light_meter`
  - `support`
- Films stack `app/(tabs)/films/_layout.tsx` has large transparent headers and screens:
  - `index`: Film Rolls
  - `[id]`: film detail
- Modals are grouped under `app/(modal)` and presented as modal stack screens:
  - `new-film`
  - `new-frame`
- Light meter has a hidden root header and presents `formsheet` as a `formSheet` with detents.

## Data Model

The database is initialized in `services/database.ts` with WAL and foreign keys enabled.

`films` table:

- `id`
- `title`
- `iso`
- `camera`
- `expected_shots`
- `push_pull`
- `status`
- `frame_count`
- `created_at`
- `completed_at`

`frames` table:

- `id`
- `film_id`
- `lens`
- `aperture`
- `shutter_speed`
- `image`
- `frame_no`
- `note`
- `created_at`

Current database `PRAGMA user_version` target is `2`. Migration v2 updates legacy frame aperture value `'0'` to `'Auto'`.

Canonical TypeScript models are in `types/index.ts`. There is also an older duplicate-ish `utils/types.tsx`; prefer `types/index.ts` for new work unless a file already depends on the utility type.

## Data Flow

- Screens own form and navigation state.
- Hooks call `useSQLiteContext()` and wrap service functions.
- `useFilms` loads all films and unique film/camera suggestions; it can disable initial fetch with `useFilms(false)`.
- `useFilm(id)` loads, refreshes, updates, and deletes one film.
- `useFrames(filmId)` loads frames, creates/updates/deletes frames, loads unique lenses, and can prefill a new frame from the last frame.
- `useFrame(id)` loads, refreshes, updates, and deletes one frame.
- `createFrame` increments parent film `frame_count`; `deleteFrame` decrements it with `MAX(0, frame_count - 1)`.
- `deleteFilm` deletes attached frame images before deleting the film. Frames also cascade through the DB foreign key.

## Image Storage

- Persisted frame images are stored as relative paths like `frames/rollio_<timestamp>_<random>.<ext>` under `Paths.document`.
- New images may be temporary `file://` URIs until the frame is saved.
- `utils/ImageService.ts` converts temporary file URIs to document-relative paths and deletes saved frame images.
- `ImageUploader` resolves stored relative paths back to `File(Paths.document, value).uri` for display.
- Any export, sharing, migration, or frame editing work must preserve the difference between temporary file URIs and saved relative paths.

## Main User Flows

- Film list fetches on focus, shows a gradient background, and opens `/new-film` from a toolbar plus button.
- Film cards route to `/(tabs)/films/[id]`.
- Film detail refreshes film and frames on focus, shows film metadata/status/progress, opens `/new-frame`, and supports edit/delete from toolbar menu.
- Add/edit film screen:
  - Uses `CreateFilmInput`.
  - Supports suggestions from unique film and camera names.
  - Uses `usePreventRemove` to guard unsaved changes.
  - Emits `DeviceEventEmitter` event `added_film` after saving.
  - Home listens for `added_film` and may prompt for App Store review if conditions are met.
- Add/edit frame screen:
  - Defaults next frame number from `frameCount + 1`.
  - Can accept light-meter params for aperture, shutter speed, ISO, and image.
  - Prefills aperture, shutter speed, and lens from the previous frame for the selected film.
  - Converts temporary image URIs to persisted frame paths on save.
  - Deletes old saved image if it is replaced or removed during edit.
- Light meter:
  - Uses VisionCamera to capture a photo, reads EXIF values, computes EV100, and opens a form sheet.
  - Form sheet normalizes aperture/shutter/ISO values and lets user choose settings before saving to a selected film.

## Styling And UX Conventions

- Fonts are loaded globally in `app/_layout.tsx`: `LufgaRegular` and `LufgaMedium`.
- Common palette:
  - Dark gradient: `#09090B`, `#100528`, `#09090B`
  - Light gradient: `#EFF0F4`, `#E5E0FF`, `#EFF0F4`
  - Primary dark text: `#100528`
- Many surfaces use `GlassView`/`GlassContainer`; when liquid glass is unavailable, code usually falls back to semi-transparent colors.
- Use `PlatformColor` and SF Symbols through `expo-symbols`/native toolbar where appropriate.
- Haptics are used for focus, selection, save, and confirmation interactions.
- Forms use `usePreventRemove` to protect unsaved changes.

## Build And Validation Notes

- Available scripts:
  - `npm run start`
  - `npm run ios`
  - `npm run android`
  - `npm run web`
  - `npm run test`
  - `npm run lint`
- `npm run lint` currently attempts to auto-configure ESLint because no ESLint config/dependencies are present. In this restricted environment it failed while trying to fetch `eslint` and `eslint-config-expo` from npm. Do not treat lint as currently configured unless those dependencies/config are intentionally added.
- `package-lock.json` exists and `node_modules` is present.
- Worktree was clean before adding this analysis file.

## Known Implementation Caveats

- Several files include debug `console.log` calls and commented-out code. Avoid broad cleanup unless requested.
- `useFilms` imports `deleteFilm` but does not expose or use it.
- `useFrames` imports `updateFilm` but does not use it.
- In `FilmListItem`, the `onPress` prop is passed but not used; the component routes directly.
- `ImageUploader` sets `previewVisible` to `false` when pressing an existing image, so preview modal opening may be incomplete.
- Some screens import unused symbols/components; keep changes scoped rather than doing opportunistic cleanup.
- The app is strongly iOS/native styled, but Android config exists. Check platform assumptions before using iOS-only APIs.
