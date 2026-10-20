# Frame Location Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A per-frame Save Location switch that stores GPS coordinates on the frame, shows a pin on the roll, opens the spot in the maps app, and lands in the CSV; shipped as 2.3.0 with a What's New entry.

**Architecture:** Schema v4 adds four nullable columns to `frames`. A pure module (`services/frameLocation.ts`) holds rounding, labels, maps URLs and the row subtitle and is tested under Node. A hook (`hooks/useFrameLocation.ts`) owns permission, the fix, reverse geocoding, the remembered choice and the late fill; a presentational `components/LocationRow.tsx` renders the row; the frame form wires them together. `FrameListItem`, `exportCsv` and `whatsNew` get small additions.

**Tech Stack:** Expo SDK 58, `expo-location` ~58.0.18 (new), `expo-sqlite/kv-store`, react-i18next, Node 26 test harness in `tests/db/harness.mjs`.

**Spec:** `docs/superpowers/specs/2026-10-20-frame-location-design.md`

## Global Constraints

- Node tests use strip-only TypeScript: no enums, no parameter properties, no `@/i18n` or Expo imports in pure modules. Pure modules may `import type` from `@/types` only.
- Every user-facing string is an i18n key with `en`, `ja`, `ko` entries; `en.json` is the type source for `t()`.
- Coordinates stored rounded to 6 decimals, accuracy to 1 decimal; a frame has a location only when latitude and longitude are both non-null; a write with only one of the pair stores neither.
- Row visuals exactly as the spec's "The row (frame form)" section: radius 22, icon circle 40, glyph `mappin.and.ellipse` / `location_on` size 20, accent `#A583EF` dark / `#39128F` light, LufgaMedium 16 title, LufgaRegular 13 subtitle at 60 % opacity.
- No `canOpenURL`; `Linking.openURL` with iOS `maps://?ll=<lat>,<lon>&q=<label>`, Android `geo:<lat>,<lon>?q=<lat>,<lon>(<label>)`, fallback `https://www.google.com/maps/search/?api=1&query=<lat>,<lon>`.
- Key-value key `frame_location_enabled` (`'1'`/`'0'`), written only when the user flips the switch.
- Constants: finding → waiting after 10 000 ms; late fill window 60 000 ms; last-known position `maxAge` 120 000 ms; `Accuracy.Balanced`.
- CSV header becomes `Film,Camera,ISO,Push/Pull,Status,Frame,Date,Aperture,Shutter,Lens,Note,Latitude,Longitude`.
- Version `2.3.0` in `app.json`; What's New release `2.3.0` newest first.
- Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- iOS is verified on the iPhone 18 Pro simulator; Android code paths exist, verified on the POCO only if it is connected.

## Review Focus

1. Location services unavailable or the position request rejecting (airplane mode, simulator location "None"): the row goes to "Waiting for GPS", the frame still saves, nothing crashes. (Task 5: the hook treats a rejected request like no fix; simulator check with Location → None.)
2. Permission denied, including "don't ask again": switch returns to off, alert shown with Settings when `canAskAgain` is false, the remembered choice is not written as on. (Task 5: `toggle(true)` writes the key only after permission is granted; simulator check by denying.)
3. Frame deleted or re-saved while a late fill is pending: the late write must never resurrect or corrupt the row. (Task 5: the late fill updates only the four location columns by id and ignores a rejected update; Task 1 test `updateFrame on a missing id throws`.)
4. Negative and high-precision coordinates in the CSV: printed as numbers, unquoted, exactly as stored. (Task 2 test `prints negative coordinates as-is`.)
5. A place name with commas, quotes or non-ASCII in the maps label: percent-encoded, never breaking the URL. (Task 3 test `mapsUrl encodes the label`.)

---

### Task 1: Schema v4 and frame writes

**Files:**
- Modify: `types/index.ts` (Frame, CreateFrameInput)
- Modify: `services/database.ts` (TARGET_VERSION, migrateToV4, createFrame, updateFrame)
- Test: `tests/db/test-migration.mjs`, `tests/db/test-writes.mjs`, `tests/db/test-backup-db.mjs`

**Interfaces:**
- Produces: `Frame` gains `latitude: number | null; longitude: number | null; location_accuracy: number | null; place: string | null;`. `CreateFrameInput` gains the same four as optional (`latitude?: number | null`, …). `createFrame`/`updateFrame` persist them; `updateFrame(db, id, { latitude: null, longitude: null, location_accuracy: null, place: null })` clears. `TARGET_VERSION === 4`.

- [ ] **Step 1: Write the failing migration tests**

In `tests/db/test-migration.mjs`, change every `userVersion(db) === 3` check to `=== 4` and add, after Scenario B, a Scenario C:

```js
console.log('\nScenario C: v3 schema (2.2.0) gains the location columns');
{
    const db = openDb();
    db.raw.exec(`/* the exact CREATE TABLE films/frames from initDatabase, then */ PRAGMA user_version = 3;
        INSERT INTO films (title, iso, frame_count, created_at) VALUES ('Portra', 400, 1, '2024-01-01');
        INSERT INTO frames (film_id, aperture, shutter_speed, frame_no, created_at) VALUES (1, 'f/2', '1/125', 1, '2024-01-01');`);
    await initDatabase(db);
    check(userVersion(db) === 4, 'user_version is 4');
    const fr = columns(db, 'frames');
    check(['latitude', 'longitude', 'location_accuracy', 'place'].every((c) => fr.includes(c)), 'frames gained the four location columns');
    const frame = db.raw.prepare('SELECT * FROM frames').get();
    check(frame.latitude === null && frame.longitude === null && frame.location_accuracy === null && frame.place === null, 'existing frame has NULL location');
    await initDatabase(db);
    check(userVersion(db) === 4, 'running the migration twice is harmless');
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --no-warnings tests/db/test-migration.mjs`
Expected: FAIL lines for `user_version is 4` and the new columns.

- [ ] **Step 3: Write the failing write tests**

In `tests/db/test-writes.mjs`, before `done()`:

```js
console.log('\nlocation: rounded, both-or-neither, clearable');
{
    const { db, film } = await fresh();
    const a = await createFrame(db, { ...frameInput(film.id, 1), latitude: 40.18723456, longitude: 44.51523456, location_accuracy: 12.34, place: 'Mashtots Ave, Yerevan' });
    check(a.latitude === 40.187235 && a.longitude === 44.515235, 'coordinates rounded to 6 decimals');
    check(a.location_accuracy === 12.3 && a.place === 'Mashtots Ave, Yerevan', 'accuracy rounded to 1 decimal, place kept');
    const b = await createFrame(db, { ...frameInput(film.id, 2), latitude: 40.1 });
    check(b.latitude === null && b.longitude === null && b.location_accuracy === null && b.place === null, 'latitude alone stores nothing');
    const c = await createFrame(db, frameInput(film.id, 3));
    check(c.latitude === null && c.longitude === null, 'no location by default');
    const cleared = await updateFrame(db, a.id, { latitude: null, longitude: null, location_accuracy: null, place: null });
    check(cleared.latitude === null && cleared.place === null, 'updateFrame clears the location');
    const kept = await updateFrame(db, a.id, { latitude: 1.5, longitude: 2.5, location_accuracy: null, place: null });
    check(kept.latitude === 1.5 && kept.longitude === 2.5 && kept.location_accuracy === null, 'updateFrame stores a location with unknown accuracy');
    let threw = false;
    try { await updateFrame(db, 99999, { latitude: null, longitude: null, location_accuracy: null, place: null }); } catch { threw = true; }
    check(threw, 'updateFrame on a missing id throws');
}
```

(`updateFrame` must be added to the destructured imports at the top of the file.)

- [ ] **Step 4: Run it to verify it fails**

Run: `node --no-warnings tests/db/test-writes.mjs`
Expected: FAIL on `coordinates rounded to 6 decimals` (columns missing / values undefined).

- [ ] **Step 5: Implement**

- `types/index.ts`: add the four fields to `Frame` (non-optional, nullable) and to `CreateFrameInput` (optional, nullable).
- `services/database.ts`: `TARGET_VERSION = 4`; `const migrateToV4 = async (db) => { ... }` that adds the four columns through the existing `addMissingColumns` pattern (extend `columnsToAdd` with the four `frames` entries so v3 also adds them, and call `addMissingColumns` from `migrateToV4`); add `if (currentVersion < 4) await migrateToV4(db);`; add the four columns to the `CREATE TABLE frames` statement.
- Add a private `normalizeLocation(input: { latitude?: number | null; longitude?: number | null; location_accuracy?: number | null; place?: string | null }): { latitude: number | null; longitude: number | null; location_accuracy: number | null; place: string | null }` in `services/database.ts`: both coordinates finite numbers → round 6 dp, accuracy round 1 dp or null, place trimmed or null; otherwise all four null. Use it in `createFrame` (INSERT gains the four columns) and in `updateFrame` (after the merge with `existing`, UPDATE gains the four columns).

- [ ] **Step 6: Run the db suite**

Run: `npm run test:db`
Expected: `ALL PASSED` for every file. If `test-backup-db.mjs` fails on `user_version === 3` checks, update those to 4 (the restore path migrates to the current version).

- [ ] **Step 7: Add the backup check**

In `tests/db/test-backup-db.mjs`, in the scenario "an old-schema backup is migrated first, then copied", add after the existing frame checks:

```js
const [oldFrame] = await getFramesByFilmId(live, film.id);
check(oldFrame.latitude === null && oldFrame.longitude === null && oldFrame.place === null, 'pre-2.3 backup restores with NULL location');
```

Run: `node --no-warnings tests/db/test-backup-db.mjs`
Expected: `ALL PASSED`.

- [ ] **Step 8: Commit**

```bash
git add types/index.ts services/database.ts tests/db/test-migration.mjs tests/db/test-writes.mjs tests/db/test-backup-db.mjs
git commit -m "feat(db): schema v4 with per-frame location columns"
```

---

### Task 2: CSV columns

**Files:**
- Modify: `services/exportCsv.ts`
- Test: `tests/export/test-csv.mjs`

**Interfaces:**
- Consumes: `Frame.latitude`, `Frame.longitude` from Task 1.

- [ ] **Step 1: Write the failing test**

In `tests/export/test-csv.mjs`: change `header` to end with `,Note,Latitude,Longitude`; give frame id 11 `latitude: 40.1872, longitude: 44.5152` and the other two `latitude: null, longitude: null`; update the exact-csv expectation so row 1 ends `50mm,,40.1872,44.5152\r\n` and rows 2 and 3 end `,,\r\n` after their note. Add:

```js
// prints negative coordinates as-is
assert.ok(buildFilmCsv({ ...film, title: 'Neg' }, [{ ...frames[0], latitude: -33.86882, longitude: -151.209296 }]).includes('"line one\nline two",-33.86882,-151.209296\r\n'));
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --no-warnings tests/export/test-csv.mjs`
Expected: AssertionError on the header.

- [ ] **Step 3: Implement**

Append `'Latitude', 'Longitude'` to `COLUMNS` and `frame.latitude, frame.longitude` to the row in `buildFilmCsv`.

- [ ] **Step 4: Run the export suite**

Run: `npm run test:export`
Expected: `ok` for both files.

- [ ] **Step 5: Commit**

```bash
git add services/exportCsv.ts tests/export/test-csv.mjs
git commit -m "feat(export): latitude and longitude columns in the CSV"
```

---

### Task 3: Pure location helpers

**Files:**
- Create: `services/frameLocation.ts`
- Create: `tests/location/test-frame-location.mjs`
- Modify: `package.json` (`test:unit` already globs `tests/*/test-*.mjs`; add `"test:location": "for f in tests/location/test-*.mjs; do node --no-warnings \"$f\" || exit 1; done"`)

**Interfaces:**
- Produces (all exported from `services/frameLocation.ts`):
  - `type FrameFix = { latitude: number; longitude: number; accuracy: number | null; place: string | null }`
  - `type LocationFields = { latitude: number | null; longitude: number | null; location_accuracy: number | null; place: string | null }`
  - `LOCATION_CHOICE_KEY = 'frame_location_enabled'`, `FINDING_TIMEOUT_MS = 10000`, `LATE_FILL_TIMEOUT_MS = 60000`, `LAST_KNOWN_MAX_AGE_MS = 120000`
  - `roundCoordinate(value: number): number` (6 dp), `roundAccuracy(value: number | null | undefined): number | null` (1 dp, null for non-finite)
  - `hasLocation(f: { latitude?: number | null; longitude?: number | null } | null | undefined): boolean`
  - `formatCoordinates(latitude: number, longitude: number): string` → `"40.1872, 44.5152"` (4 dp, `toFixed`)
  - `placeLabel(g: { street?: string | null; name?: string | null; city?: string | null; region?: string | null; subregion?: string | null } | null | undefined): string | null`
  - `mapsUrl(args: { latitude: number; longitude: number; label: string; platform: 'ios' | 'android' | 'web' }): string`
  - `fixToFields(fix: FrameFix | null): LocationFields`
  - `fixedSubtitle(fix: FrameFix, strings: { accuracy: (meters: number) => string; openInMaps: string }): [string, string]`

- [ ] **Step 1: Write the failing test**

`tests/location/test-frame-location.mjs`:

```js
import '../db/harness.mjs';
import assert from 'node:assert/strict';
const L = await import('@/services/frameLocation');

assert.equal(L.LOCATION_CHOICE_KEY, 'frame_location_enabled');
assert.equal(L.FINDING_TIMEOUT_MS, 10000);
assert.equal(L.LATE_FILL_TIMEOUT_MS, 60000);
assert.equal(L.LAST_KNOWN_MAX_AGE_MS, 120000);

assert.equal(L.roundCoordinate(40.18723456), 40.187235);
assert.equal(L.roundCoordinate(-151.2092961), -151.209296);
assert.equal(L.roundAccuracy(12.34), 12.3);
assert.equal(L.roundAccuracy(null), null);
assert.equal(L.roundAccuracy(NaN), null);

assert.equal(L.hasLocation({ latitude: 1, longitude: 2 }), true);
assert.equal(L.hasLocation({ latitude: 1, longitude: null }), false);
assert.equal(L.hasLocation(null), false);

assert.equal(L.formatCoordinates(40.187235, 44.515235), '40.1872, 44.5152');
assert.equal(L.formatCoordinates(-33.86882, 151.2), '-33.8688, 151.2000');

// placeLabel: street + city, else name + city, else city, else region, else null
assert.equal(L.placeLabel({ street: 'Mashtots Ave', city: 'Yerevan', name: '12' }), 'Mashtots Ave, Yerevan');
assert.equal(L.placeLabel({ street: null, name: 'Tower Bridge', city: 'London' }), 'Tower Bridge, London');
assert.equal(L.placeLabel({ city: 'Yerevan' }), 'Yerevan');
assert.equal(L.placeLabel({ region: 'Kotayk', subregion: null }), 'Kotayk');
assert.equal(L.placeLabel({ street: 'Only St' }), 'Only St');
assert.equal(L.placeLabel({}), null);
assert.equal(L.placeLabel(null), null);

// mapsUrl per platform; label encoded
const args = { latitude: 40.187235, longitude: 44.515235, label: 'Frame 3' };
assert.equal(L.mapsUrl({ ...args, platform: 'ios' }), 'maps://?ll=40.187235,44.515235&q=Frame%203');
assert.equal(L.mapsUrl({ ...args, platform: 'android' }), 'geo:40.187235,44.515235?q=40.187235,44.515235(Frame%203)');
assert.equal(L.mapsUrl({ ...args, platform: 'web' }), 'https://www.google.com/maps/search/?api=1&query=40.187235,44.515235');
// mapsUrl encodes the label
assert.equal(L.mapsUrl({ ...args, label: 'Ave, "B" & Ç', platform: 'ios' }), 'maps://?ll=40.187235,44.515235&q=Ave%2C%20%22B%22%20%26%20%C3%87');
assert.equal(L.mapsUrl({ ...args, label: 'a(b)', platform: 'android' }), 'geo:40.187235,44.515235?q=40.187235,44.515235(a%28b%29)');

// fixToFields
assert.deepEqual(L.fixToFields({ latitude: 1, longitude: 2, accuracy: 3, place: 'x' }), { latitude: 1, longitude: 2, location_accuracy: 3, place: 'x' });
assert.deepEqual(L.fixToFields(null), { latitude: null, longitude: null, location_accuracy: null, place: null });

// fixedSubtitle: every combination of place and accuracy
const strings = { accuracy: (m) => `±${m} m`, openInMaps: 'Open in Maps' };
assert.deepEqual(L.fixedSubtitle({ latitude: 40.187235, longitude: 44.515235, accuracy: 12.3, place: 'Mashtots Ave, Yerevan' }, strings),
    ['Mashtots Ave, Yerevan', '40.1872, 44.5152 · ±12 m · Open in Maps']);
assert.deepEqual(L.fixedSubtitle({ latitude: 40.187235, longitude: 44.515235, accuracy: null, place: 'Yerevan' }, strings),
    ['Yerevan', '40.1872, 44.5152 · Open in Maps']);
assert.deepEqual(L.fixedSubtitle({ latitude: 40.187235, longitude: 44.515235, accuracy: 7.8, place: null }, strings),
    ['40.1872, 44.5152', '±8 m · Open in Maps']);
assert.deepEqual(L.fixedSubtitle({ latitude: 40.187235, longitude: 44.515235, accuracy: null, place: null }, strings),
    ['40.1872, 44.5152', 'Open in Maps']);
console.log('ok');
```

Note the accuracy string receives the metres **rounded to a whole number** (`Math.round(accuracy)`); the stored value keeps one decimal.

- [ ] **Step 2: Run it to verify it fails**

Run: `node --no-warnings tests/location/test-frame-location.mjs`
Expected: fails to resolve `@/services/frameLocation`.

- [ ] **Step 3: Implement `services/frameLocation.ts`**

Pure functions as in the Interfaces block. `mapsUrl` uses `encodeURIComponent` on the label and additionally replaces `(` and `)` with `%28`/`%29` (Android's geo `q=` syntax uses parentheses as delimiters). Coordinates in URLs are `String(latitude)`.

- [ ] **Step 4: Run it to verify it passes**

Run: `npm run test:unit`
Expected: every file passes (`ok` / `ALL PASSED`).

- [ ] **Step 5: Commit**

```bash
git add services/frameLocation.ts tests/location/test-frame-location.mjs package.json
git commit -m "feat(location): pure helpers for coordinates, labels, maps URLs and the row subtitle"
```

---

### Task 4: Dependency, permissions, strings, privacy policy

**Files:**
- Modify: `package.json`, `package-lock.json` (expo-location)
- Modify: `app.json` (plugin + `expo.version` stays 2.2.0 until Task 7)
- Modify: `native-locales/en.json`, `native-locales/ja.json`, `native-locales/ko.json`
- Modify: `i18n/locales/en.json`, `i18n/locales/ja.json`, `i18n/locales/ko.json`
- Modify: `privacy-policy.md`, `privacy-policy-ja.md`, `privacy-policy-ko.md`

**Interfaces:**
- Produces: i18n keys under `newFrame.location`: `title`, `off`, `finding`, `waiting`, `accuracy` (`"±{{meters}} m"`), `openInMaps`, `frameLabel` (`"Frame {{number}}"`), `permission.title`, `permission.message`, `openMapsError`. And `whatsNew.releases.2_3_0.location.title` / `.body` (used in Task 7).

- [ ] **Step 1: Install expo-location**

Run: `npx expo install expo-location`
Expected: `package.json` gains `"expo-location": "~58.0.18"`; `postinstall` (patch-package) still applies the expo-sharing patch (`grep -c queryIntentActivities node_modules/expo-sharing/android/src/main/java/expo/modules/sharing/SharingModule.kt` prints 1 and the patched comment is present).

- [ ] **Step 2: Config plugin**

In `app.json` `expo.plugins`, add:

```json
["expo-location", {
  "locationWhenInUsePermission": "$(PRODUCT_NAME) saves where each frame was shot, only when you switch Save Location on for a frame.",
  "locationAlwaysAndWhenInUsePermission": false,
  "locationAlwaysPermission": false,
  "motionUsagePermission": false,
  "isAndroidBackgroundLocationEnabled": false
}]
```

Add `NSLocationWhenInUseUsageDescription` to the `ios` object of each `native-locales/*.json` with the English sentence above (ja/ko translated in the tone of the existing camera strings).

Run: `npx expo config --type introspect | grep -n "NSLocation\|ACCESS_.*LOCATION"`
Expected: `NSLocationWhenInUseUsageDescription` present, no `NSLocationAlways*`, `ACCESS_COARSE_LOCATION` and `ACCESS_FINE_LOCATION` present, no `ACCESS_BACKGROUND_LOCATION`.

- [ ] **Step 3: Strings**

Add to `en.json` under `newFrame`:

```json
"location": {
  "title": "Save Location",
  "off": "Off",
  "finding": "Finding location…",
  "waiting": "Waiting for GPS",
  "accuracy": "±{{meters}} m",
  "openInMaps": "Open in Maps",
  "frameLabel": "Frame {{number}}",
  "permission": {
    "title": "Location Access Needed",
    "message": "Allow location access in Settings to save where this frame was shot."
  },
  "openMapsError": "Could not open a maps app."
}
```

and under `whatsNew.releases` a `"2_3_0": { "location": { "title": "Save where you shot", "body": "Switch on Save Location on a frame to keep its GPS spot. It stays on for the next frames until you change it, shows as a pin on the roll, opens in your maps app, and goes into the CSV." } }`. Mirror both blocks in `ja.json` and `ko.json` with natural translations.

Run: `node -e 'for (const l of ["en","ja","ko"]) { const j=require("./i18n/locales/"+l+".json"); const k=j.newFrame.location; if(!k||!k.permission||!j.whatsNew.releases["2_3_0"]) throw l; } console.log("ok")'`
Expected: `ok`.

- [ ] **Step 4: Privacy policy**

In section 3 (Permissions) of `privacy-policy.md`, add: "Rollio asks for location access only when you switch Save Location on for a frame. The coordinates are stored on your device next to that frame and leave it only in backups and CSV exports you create yourself." Add the same sentence, translated, to the ja and ko files.

- [ ] **Step 5: Type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json app.json native-locales i18n/locales privacy-policy.md privacy-policy-ja.md privacy-policy-ko.md
git commit -m "chore(location): expo-location, permission text, strings and privacy note"
```

---

### Task 5: Location hook, row component and frame-form wiring

**Files:**
- Create: `hooks/useFrameLocation.ts`
- Create: `components/LocationRow.tsx`
- Modify: `hooks/useFrames.ts` (`addFrame` returns the created `Frame`)
- Modify: `app/(modal)/new-frame.tsx`

**Interfaces:**
- Consumes: Task 1 types and `updateFrame(db, id, fields)`; Task 3 helpers and constants; Task 4 strings.
- Produces:
  - `useFrames(...).addFrame(input: CreateFrameInput): Promise<Frame>` (was `Promise<void>`; it returns what `dbCreateFrame` returns).
  - `type LocationStatus = 'off' | 'finding' | 'waiting' | 'fixed'`
  - `useFrameLocation(args: { mode: 'new' | 'edit'; frame: Frame | null }): { ready: boolean; enabled: boolean; status: LocationStatus; fix: FrameFix | null; toggle: (next: boolean) => Promise<void>; fields: () => LocationFields; fillWhenReady: (frameId: number) => void; openInMaps: (label: string) => Promise<void> }`
    - `ready` becomes true once the stored choice has been read (new mode) or immediately (edit mode).
    - `toggle(true)`: request permission; on denial show the `newFrame.location.permission` alert (Settings button when `!canAskAgain`) and leave `enabled` false; on grant set `enabled`, write `LOCATION_CHOICE_KEY = '1'`, status `finding`, show last-known (`maxAge: LAST_KNOWN_MAX_AGE_MS`) if any as `fix`, then request `getCurrentPositionAsync({ accuracy: Accuracy.Balanced })`; after `FINDING_TIMEOUT_MS` without a fix status becomes `waiting`; when a fix arrives status `fixed`, then `reverseGeocodeAsync` → `placeLabel` fills `fix.place` (errors ignored). A rejected position request is treated as "no fix yet" (status follows the timer).
    - `toggle(false)`: cancel timers and the pending request, `fix = null`, `enabled = false`, write key `'0'`, status `off`.
    - `fields()`: `fixToFields(enabled ? fix : null)`.
    - `fillWhenReady(frameId)`: if `enabled` and no fix, keep the pending request alive for `LATE_FILL_TIMEOUT_MS`; when it resolves, round and reverse-geocode, then `updateFrame(db, frameId, fields)`; any error is logged with `console.warn` and ignored. Must survive the component's unmount (hold the promise in module scope, not in React state).
    - `openInMaps(label)`: `Linking.openURL(mapsUrl({ platform: Platform.OS }))`, on rejection `Linking.openURL(mapsUrl({ platform: 'web' }))`, on second rejection `Alert.alert(t('shared.error'), t('newFrame.location.openMapsError'))`.
    - Edit mode with a frame that has a location: `enabled = true`, `status = 'fixed'`, `fix` built from the frame, no request made.
  - `LocationRow` props: `{ enabled: boolean; status: LocationStatus; fix: FrameFix | null; onToggle: (next: boolean) => void; onOpenMaps: () => void }`. Renders per the spec: subtitle from `t('newFrame.location.off' | 'finding' | 'waiting')`, or the two lines from `fixedSubtitle(fix, { accuracy: (m) => t('newFrame.location.accuracy', { meters: m }), openInMaps: t('newFrame.location.openInMaps') })` with line 2 in the accent colour; the icon-and-text area is a `Pressable` calling `onOpenMaps` only in the fixed state; the `Switch` calls `onToggle` and fires `Haptics.impactAsync(Light)`.

- [ ] **Step 1: `addFrame` returns the frame**

In `hooks/useFrames.ts`, `addFrame` captures `const created = await dbCreateFrame(db, input)` and returns it after `loadFrames()`; its signature becomes `Promise<Frame>` (throw if `!db` instead of returning undefined).

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 2: Write `hooks/useFrameLocation.ts`**

As in the Interfaces block. `expo-location` import: `import * as Location from 'expo-location'`. Database from `useSQLiteContext()`; the late fill uses `updateFrame` from `@/services/database`. Keep the finding/waiting timer and the pending promise in refs; clear both on unmount unless a late fill claimed them.

- [ ] **Step 3: Write `components/LocationRow.tsx`**

As in the Interfaces block and the spec's row section. Use `GlassView` with the Attach Image card's tint/fallback colours, `SymbolView name={{ ios: 'mappin.and.ellipse', android: 'location_on' }} size={20}`, React Native `Switch` (`trackColor={{ true: accent }}`, `thumbColor="#fff"`).

- [ ] **Step 4: Wire the form**

In `app/(modal)/new-frame.tsx`:
- `const location = useFrameLocation({ mode: mode === 'edit' ? 'edit' : 'new', frame: mode === 'edit' ? frame : null })`.
- Render `<View style={{ paddingHorizontal: 20 }}><LocationRow … /></View>` directly above the Attach Image block (`onOpenMaps` label: `frame?.place ?? t('newFrame.location.frameLabel', { number: formData.frame_no })`).
- `hasUnsavedChanges`: compare `formData` and `initialDataRef.current` with the four location fields stripped, OR `location.enabled !== initialEnabledRef.current` (set `initialEnabledRef` once `location.ready`).
- `handleSaveFrame`: `const dataToSave = { ...formData, ...location.fields() }`; after `addFrame` (new mode) call `location.fillWhenReady(created.id)`; after `updateFrame` (edit mode) call `location.fillWhenReady(frame.id)`.
- The loading guard also waits for `location.ready` in new mode so the row never flashes off → on.

- [ ] **Step 5: Lint and type check**

Run: `npm run lint && npx tsc --noEmit`
Expected: no errors or warnings in the touched files.

- [ ] **Step 6: Build and verify on the simulator**

Run: `npx expo prebuild --platform ios` then `npx expo run:ios --device "iPhone 18 Pro"` (first native build after adding expo-location; subsequent runs can use Metro). With the simulator's Features → Location set to "Apple":
1. Add Frame on a roll: row reads "Save Location · Off". Flip on → system prompt → allow → "Finding location…" then place line + `coords · ±N m · Open in Maps`. Save. The row on the roll shows the pin before the paperclip.
2. Add another frame: row starts **on** and finds a fix without a prompt.
3. Set Location → None, add a frame with the row on: "Finding location…" → after 10 s "Waiting for GPS"; save; the frame appears without a pin. Set Location → Apple within 60 s, reopen the roll: the pin appears.
4. Open frame 1 (edit): row on, fixed subtitle, no new request; tap the text → Apple Maps opens at the spot. Flip off, save → pin gone, CSV export shows empty Latitude/Longitude for it.
5. Open Add Frame, change nothing, cancel: no discard prompt.
6. Reset location privacy (`xcrun simctl privacy booted reset location com.davitpodosyan.rollio`), add a frame, flip on, deny: switch returns to off, alert shown; next Add Frame starts off.
Expected: every step behaves as listed; nothing logged red in Metro.

- [ ] **Step 7: Commit**

```bash
git add hooks/useFrameLocation.ts components/LocationRow.tsx hooks/useFrames.ts "app/(modal)/new-frame.tsx"
git commit -m "feat(location): Save Location row in the frame form with Open in Maps"
```

---

### Task 6: Pin on the frame row

**Files:**
- Modify: `components/FrameListItem.tsx`

**Interfaces:**
- Consumes: `hasLocation` from Task 3.

- [ ] **Step 1: Implement**

In the settings row, replace the lone paperclip block with a trailing `View` (`flexDirection: 'row', gap: 10, alignItems: 'center', marginLeft: 'auto'`) containing, in order, the pin `SymbolView name={{ ios: 'mappin.and.ellipse', android: 'location_on' }} size={20}` when `hasLocation(frame)` and the existing paperclip when `frame.image`. Render the trailing view only when at least one of them shows. Extend the memo comparator with `prev.frame.latitude === next.frame.latitude && prev.frame.longitude === next.frame.longitude`.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean. On the simulator (Metro reload): a frame with location and image shows pin then paperclip; location only shows the pin at the trailing edge; neither shows nothing; the row height is unchanged.

- [ ] **Step 3: Commit**

```bash
git add components/FrameListItem.tsx
git commit -m "feat(location): pin on frame rows that have a location"
```

---

### Task 7: Version 2.3.0 and What's New

**Files:**
- Modify: `app.json` (`expo.version`)
- Modify: `services/whatsNew.ts`
- Test: `tests/whats-new/test-whats-new.mjs`

- [ ] **Step 1: Write the failing test**

Append to `tests/whats-new/test-whats-new.mjs`:

```js
assert.ok(WHATS_NEW.some((r) => r.version === '2.3.0'), 'has a 2.3.0 entry');
assert.equal(WHATS_NEW[0].version, '2.3.0', 'newest release first');
assert.deepEqual(itemsSince('2.2.0', '2.3.0').map((i) => i.titleKey), ['whatsNew.releases.2_3_0.location.title']);
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --no-warnings tests/whats-new/test-whats-new.mjs`
Expected: AssertionError `has a 2.3.0 entry`.

- [ ] **Step 3: Implement**

Prepend to `WHATS_NEW`: `{ version: '2.3.0', items: [{ sf: 'mappin.and.ellipse', md: 'location-on', titleKey: 'whatsNew.releases.2_3_0.location.title', bodyKey: 'whatsNew.releases.2_3_0.location.body' }] }`. Set `app.json` `expo.version` to `"2.3.0"`.

- [ ] **Step 4: Run the whole unit suite**

Run: `npm run test:unit && npx tsc --noEmit && npm run lint`
Expected: all pass, no lint findings.

- [ ] **Step 5: Verify the sheet**

On the simulator: set the stored key back (`whats_new_last_seen_version` = `2.2.0`) by temporarily running in Metro's console or by reinstalling after creating a roll on the 2.2.0 build; launch → sheet shows "Version 2.3.0" with the single location item and its pin icon. (The native version comes from the built app, so rebuild after changing `app.json`: `npx expo run:ios --device "iPhone 18 Pro"`.)

- [ ] **Step 6: Commit**

```bash
git add app.json services/whatsNew.ts tests/whats-new/test-whats-new.mjs
git commit -m "chore: version 2.3.0 with What's New entry for frame location"
```
