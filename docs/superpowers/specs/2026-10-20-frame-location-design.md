# Frame Location — Design

Date: 2026-10-20
Status: approved in chat (form row as mocked up; film-screen option **A** chosen)
Ships as: version **2.3.0** with a What's New entry

## Intent

A user suggested saving GPS coordinates with each frame. Shooting film, you
only see the pictures weeks later, and by then "where was frame 14?" is a real
question: for geotagging the scans, for going back to a spot, for captions.
Version 1 is deliberately small: collect the spot, carry it into the CSV, and
let the user open it in the maps app they already have. No maps inside Rollio.

## Goals

- A per-frame **Save Location** choice in the frame form, placed with the other
  optional things (above Attach Image), that remembers the last choice and
  carries it forward until changed, the way aperture, shutter and lens already
  carry forward.
- Coordinates and accuracy are stored on the frame; a place name is stored when
  one can be looked up.
- A frame that has a location shows a small pin on its row in the film screen,
  and its form offers **Open in Maps**.
- The CSV export gains Latitude and Longitude columns.
- Backups carry the new columns; older backups restore cleanly.
- The row fits the app's existing design exactly: same glass surface, radius,
  type and colours as the cards around it.

## Non-goals

- Any embedded map, per-film map tab, or clustering.
- Showing location on the PDF contact sheet.
- Writing GPS EXIF into attached photos.
- Background location, or tracking between frames.
- Reading the location out of an attached photo's EXIF (may come later).

## Anti-goals

- A global "always save location" switch in Settings. The choice lives on each
  frame.
- A permission prompt before the user has asked for anything. The system
  prompt appears the first time the row is switched on, never on launch or on
  opening the form.
- A frame that cannot be saved because there is no GPS fix yet.

## Constraints

- Expo SDK 58, React Native 0.88, new architecture. New dependency:
  `expo-location` (SDK 58 line, `npx expo install expo-location`), with its
  config plugin in `app.json`. Everything else is already in the project.
- Pure logic lives in a module with no Expo or React Native imports so it runs
  under the Node test harness (`tests/db/harness.mjs`, strip-only TypeScript,
  no enums, no `@/i18n` imports).
- All user-facing strings go through react-i18next with `en`, `ja`, `ko`
  entries. iOS permission text goes in `app.json` and the three
  `native-locales/*.json` files.
- Minimum change to existing screens; no restyling of what is already there.

## Data

### Schema, version 4

`frames` gains four nullable columns, added with the existing
`addMissingColumns` pattern (idempotent `ALTER TABLE … ADD COLUMN`):

| column              | type | meaning                                              |
|---------------------|------|------------------------------------------------------|
| `latitude`          | REAL | WGS84 degrees, rounded to 6 decimals (≈ 0.1 m)       |
| `longitude`         | REAL | WGS84 degrees, rounded to 6 decimals                 |
| `location_accuracy` | REAL | horizontal accuracy in metres, rounded to 1 decimal; NULL if unknown |
| `place`             | TEXT | short human label from reverse geocoding; NULL if none |

`TARGET_VERSION` becomes 4; `migrateToV4` adds the columns. A frame "has a
location" when `latitude` and `longitude` are both non-null. Either both are
set or both are NULL; the database layer enforces this (a write with only one
of the pair stores neither).

`Frame` and `CreateFrameInput` in `types/index.ts` gain the four fields
(`latitude?: number | null`, etc.). `createFrame` and `updateFrame` write them;
`updateFrame` with explicit `null`s clears a location.

### Backup

Nothing new to do. `VACUUM INTO` carries the columns; `replaceAllData` matches
columns by name, so a 2.2 backup restores with NULL locations and a 2.3 backup
restored into a 2.2 app is already refused as "too new".

### CSV

`buildFilmCsv` appends two columns after `Note`: `Latitude,Longitude`. Values
are the stored numbers as-is (`40.1872`), empty when the frame has no location.
Accuracy and place are not exported.

## Capturing a location

All of this lives in one hook, `useFrameLocation`, used by the frame form.
Behaviour, in the form's terms:

**Default for a new frame.** The last choice the user made on any frame is
kept in the key-value store (`frame_location_enabled`, `'1'`/`'0'`). A new
frame starts with that value; absent key means off. (My call: the previous
frame on the roll cannot be the source, because a frame saved while still
"Waiting for GPS" has no coordinates and would wrongly flip the next frame
off. The key is written only when the user flips the switch, in either mode,
so merely editing an old frame that has no location never turns the default
off.)

**Default for an existing frame.** On if it has a location, off otherwise.

**Switching on** (new or edit):

1. Ask for foreground permission (`requestForegroundPermissionsAsync`). If
   denied, the switch returns to off and an alert explains; when the system
   will not ask again the alert offers **Settings** (same pattern as the
   image picker's permission alerts). Nothing is stored.
2. Immediately show the last known position if it is under 2 minutes old
   (`getLastKnownPositionAsync({ maxAge: 120000 })`) so the row has
   something right away.
3. Request a current fix with `Accuracy.Balanced`. When it arrives it replaces
   the last-known one.
4. Once a fix is in hand, reverse-geocode it (`reverseGeocodeAsync`) and keep
   the first result's label. This is best effort: no network, no label.

**Row states** (subtitle under "Save Location"):

| state     | subtitle                                        |
|-----------|-------------------------------------------------|
| off       | "Off"                                           |
| finding   | "Finding location…" (first 10 s without any fix) |
| waiting   | "Waiting for GPS" (after 10 s, still no fix)    |
| fixed     | "On · ±12 m" ("On" alone when accuracy is unknown); the address itself goes in a second row, see "Open in Maps" |
| denied    | shown as off, after the alert                   |

**Switching off** clears the pending request and the captured fix; the frame
saves with NULL location (in edit mode this removes a stored location).

**Saving while still finding/waiting.** The frame saves at once without
coordinates. The in-flight request keeps running for up to 60 s more; if it
resolves, the hook writes latitude, longitude, accuracy and (when it can) place
onto that frame row by id. The film screen already refreshes on focus, so the
pin appears on the next visit at the latest. If it never resolves, the frame
simply has no location. (This runs past the form's unmount; the database
connection is app-wide so that is safe.)

**Unsaved-changes guard.** The form's "discard changes?" comparison ignores the
four location fields. Flipping the switch counts as a change; a fix arriving
on its own does not, so opening the form and cancelling never prompts.

**Edit mode does not refetch.** Opening an existing frame with a location shows
the stored one; a new fix is only taken if the user switches off and on again.

**Light meter hand-off** is unchanged: the form still receives aperture,
shutter and image via params and the location row behaves as for any new
frame.

## The row (frame form)

Reference mockup: `.superpowers/brainstorm/97663-1792521514/content/location.html`
(git-ignored; this text is authoritative). Sits in its own padded block
(`paddingHorizontal: 20`) directly above the Attach Image block.

- Modelled on the rows of the iOS Reminders detail sheet (user's reference
  screenshots, light and dark): glyph column, title and value, system switch.
- Surface: `GlassView` `glassEffectStyle="regular"` with the Attach Image
  card's tint (`#09090b6d` dark / `#ffffff` light); fallback background
  `#1c1c1e` dark / `#ffffff` light, 1 pt border `#2a2a2d` / `#e6e6ee` on
  Android. Border radius **22**. Rows: padding 14 vertical, 16 horizontal,
  a 24 pt glyph column, gap 14.
- Glyph: SF Symbol `mappin.and.ellipse` on iOS, Material `location_on` on
  Android, size 22, always secondary grey `#8E8E93`. It never changes colour
  with the state.
- Title "Save Location": LufgaMedium 16, white / `#100528`.
- Subtitle: LufgaRegular 13, one line, tail-truncated; grey `#8E8E93` when
  off, the system blue tint (`systemBlue`, `#0A84FF` on Android) when on,
  like a value in Reminders.
- Switch: the platform `Switch` with its native colours (green on iOS), no
  custom track or thumb colour, vertically centred on the row.
- Haptics: `Haptics.impactAsync(Light)` on every flip, like other toggles.

### Open in Maps

In the **fixed** state (edit mode with a stored location, or a new frame once
a fix has arrived) the card grows a second row under a full-width hairline
divider (12 % of the text colour), modelled on the address row of a
Reminders location: a grey `map` glyph in the glyph column, then the place
name with the street on its own line and the city and country on the next
(`placeLines`), or `40.1872, 44.5152` when there is none, LufgaRegular
15 / 21, wrapping further if it must; no label; a grey
`arrow.up.right` (Material `open_in_new`) size 16 at the trailing edge says
it opens elsewhere. The whole second row is the Pressable that opens the
maps app (accessibility label "Open in Maps"), with a faint pressed
highlight; the switch keeps its own hit area. (Chosen after rejected
attempts: a third text line, a floating chip, a solid accent disc, a
truncating one-line address and a two-line address with a text link.)
Opening calls `Linking.openURL` directly (no
`canOpenURL`, which would need manifest `<queries>` on Android and
`LSApplicationQueriesSchemes` on iOS) with:

- iOS: `maps://?ll=<lat>,<lon>&q=<label>` ;
- Android: `geo:<lat>,<lon>?q=<lat>,<lon>(<label>)` ;
- if that call rejects, try
  `https://www.google.com/maps/search/?api=1&query=<lat>,<lon>`; if that
  rejects too, show the `openMapsError` alert.

`<label>` is the frame's place name if any, else `Frame <n>`, percent-encoded.
The URL builder is pure and unit-tested.

## The film screen (option A)

`FrameListItem` gets a pin glyph in the trailing group of the settings row:
SF Symbol `mappin.and.ellipse` / Material `location_on`, size 20, same tint as
the paperclip, placed **before** the paperclip with gap 10, only when the
frame has a location. With no image the pin alone sits at the trailing edge.
The memo comparator also compares `latitude` and `longitude`.

Nothing else on the film screen changes.

## Permission text

- `app.json` → `expo-location` plugin with
  `locationWhenInUsePermission: "$(PRODUCT_NAME) saves where each frame was shot, only when you switch Save Location on for a frame."`
  and `isAndroidBackgroundLocationEnabled: false`.
- The plugin's other iOS keys are switched off so no unused "Always" strings
  land in Info.plist: `locationAlwaysAndWhenInUsePermission: false`,
  `locationAlwaysPermission: false`, `motionUsagePermission: false`.
- `native-locales/{en,ja,ko}.json` gain `NSLocationWhenInUseUsageDescription`
  with the same sentence translated.
- Android: the plugin adds `ACCESS_FINE_LOCATION` and
  `ACCESS_COARSE_LOCATION`. No background permission.

## Strings

`newFrame.location`: `title` "Save Location", `off` "Off", `finding`
"Finding location…", `waiting` "Waiting for GPS", `accuracy` "±{{meters}} m",
`openInMaps` "Open in Maps", `frameLabel` "Frame {{number}}",
`permission.title` "Location Access Needed", `permission.message` "Allow
location access in Settings to save where this frame was shot.",
`openMapsError` "Could not open a maps app." Japanese and Korean follow the
tone of the existing `imageUploader.*` permission strings.

`whatsNew.releases.2_3_0.location`: title "Save where you shot", body "Switch
on Save Location on a frame to keep its GPS spot. It stays on for the next
frames until you change it, shows as a pin on the roll, opens in your maps
app, and goes into the CSV." Icon `mappin.and.ellipse` / `location-on`.

## Privacy policy

`privacy-policy.md`, `privacy-policy-ja.md` and `privacy-policy-ko.md` section
3 (Permissions) gains a sentence: location is requested only when the user
switches Save Location on for a frame, the coordinates are stored on the
device next to that frame, and they leave the device only in the user's own
backups and CSV exports. The App Store privacy and Play Data Safety answers
are updated by the owner in the consoles at submission time (location: not
collected, since nothing leaves the device to the developer).

## Version

`app.json` `expo.version` → `2.3.0`. Build numbers are managed remotely by
EAS. `WHATS_NEW` gains the `2.3.0` release entry (newest first).

## Tests (Node harness)

- `tests/db/test-migration.mjs`: a v3 database reaches `user_version` 4 with
  the four new columns; existing rows have NULLs; a v0 1.x database also ends
  at 4.
- `tests/db/test-writes.mjs`: `createFrame` stores rounded coordinates;
  `createFrame` with only latitude stores neither; `updateFrame` with nulls
  clears all four fields.
- `tests/db/test-backup-db.mjs`: a backup made before v4 restores with NULL
  locations next to the existing checks.
- `tests/export/test-csv.mjs`: header ends `…,Note,Latitude,Longitude`; a
  frame with a location prints both numbers, one without prints two empty
  fields.
- New `tests/location/test-frame-location.mjs` for the pure module:
  `roundCoordinate`, `hasLocation`, `formatCoordinates` ("40.1872, 44.5152",
  4 decimals for display), `placeLabel(geocode)` (street or name, city or
  region, country, whichever exist, else null), `mapsUrl({ latitude, longitude, label,
  platform })` for ios / android / web fallback, and `fixedSubtitle(fix,
  strings)` returning the two lines for every combination of place and
  accuracy.
- `tests/whats-new/test-whats-new.mjs`: the real list has a `2.3.0` entry.

Manual checks on the iPhone 18 Pro simulator (Features → Location → Custom /
Apple) and, when connected, the POCO: first switch-on prompt, denied path,
finding → fixed, save while waiting then late fill, edit-mode clear, Open in
Maps, pin on the row, CSV columns.

## Builder's calls (left open, decide while building)

- Exact `Accuracy` level and whether to add a single `watchPositionAsync` to
  refine a coarse first fix; Balanced plus one request is the baseline.
- The 60 s late-fill window and the 10 s finding→waiting threshold are
  constants in the hook, named and easy to tune.
- How the hook hands the late fill its database handle (closure over
  `useSQLiteContext` is fine).
- Whether `place` is re-looked-up when the user edits an old frame that has
  coordinates but no place (not required).
