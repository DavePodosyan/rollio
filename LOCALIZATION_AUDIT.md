# Rollio — Localization Feasibility Audit

Read-only audit. No source files were modified. All figures below are traceable to file:line citations in the sections that follow.

## Headline numbers

| Metric | Value |
|---|---|
| Expo SDK | 55 (`expo ~55.0.28`) |
| React Native | 0.83.6 (React 19.2.0) |
| Routing | Expo Router (file-based), native tab bar via `NativeTabs` — layered on `@react-navigation/native` |
| TypeScript | 5.9.2 |
| i18n library present today | **None.** No `expo-localization`, `i18n-js`, `i18next`, or `react-i18next` in `package.json` or anywhere in source. |
| Translatable UI strings (occurrences) | **146**, plus 4 more render sites for the `FilmStatus` enum that are currently unwrapped English text → **150 total occurrences** needing i18n treatment |
| Non-translatable domain-data strings (correctly excluded) | ~313 (photographic constants: ISO/aperture/shutter-speed option arrays + internal SKU/icon-key identifiers) |
| Files requiring string-level edits | ~18 |
| Strings requiring structural rework (concatenation / word-order) | 11 |
| **Confirmed blocker** | `"Auto"` is stored as a literal English word in `frames.aperture` / `frames.shutter_speed` and compared with `===` in ~15 places, including a schema migration that back-filled it into historical rows |
| **Confirmed round-trip risk** | EV value: `.toFixed(2)` → route param string → `Number()` → drives live exposure math and gets saved back to a frame |
| Hardcoded (non-locale) date formatting | 2 sites pinned to `'en-GB'` despite a locale-aware date component existing elsewhere in the app |
| Manual pluralization strings found | 0 (the app has no "N item(s)" copy today — but see caveat in §3b) |
| One-time i18n infrastructure estimate | **35–50 hours** |
| Per-language incremental cost (after infra exists) | **10–15 hours** |
| Layout QA per language | **6–10 hours** (higher end for Japanese/Korean) |
| Bottom line | Not a weekend project. Realistically 1.5–2 weeks of focused solo work to ship the *first* localized language (infra + JA or KO), then ~2–3 days per additional language. |

---

## 1. Environment baseline

- **Expo SDK 55** (`"expo": "~55.0.28"`), **React Native 0.83.6**, **React 19.2.0**.
- **Routing**: Expo Router (`main: "expo-router/entry"`, `expo-router: ~55.0.17`), using the newer native tab bar (`NativeTabs.Trigger.Label` in `app/(tabs)/_layout.tsx:29,34,39`), built on top of `@react-navigation/native` / `@react-navigation/bottom-tabs` / `@react-navigation/elements`.
- **TypeScript**: `~5.9.2`, project is 100% TypeScript (40 `.ts`/`.tsx` files, ~7,100 lines).
- **No i18n tooling exists anywhere in the codebase.** `grep -i "i18n|expo-localization|react-i18next|i18next"` across `package.json` and all source returns nothing. This is a true from-scratch retrofit, not a partial one.
- Native modules of note for localization: `expo-sqlite` (data layer, see §3a), `@react-native-async-storage/async-storage` (one key only, non-text), `expo-iap` (tip jar, App Store Connect–managed strings, see §5), a custom native module `modules/my-segmented-control` (iOS `UISegmentedControl` wrapper / Android Jetpack Compose `SegmentedButton`) with no text-fitting props exposed in its TS interface.

---

## 2. String inventory

### Totals

| Bucket | Count |
|---|---|
| Translatable UI strings (occurrence-level) | 146 |
| + `FilmStatus` enum values rendered as raw UI text (unmapped, 4 render sites, 3 unique values) | +4 |
| **Translatable total** | **150 occurrences** |
| Domain-data strings excluded (photographic constants) | ~313 |

The translatable count — not the domain-data count — is what drives project cost. Domain data (film stocks aren't present as a preset list in this app; users free-type film/camera/lens names) is dominated by the ISO/aperture/shutter-speed/push-pull numeric option arrays that feed the ruler pickers and light-meter wheels. These are photographic notation, not language, and correctly stay untranslated.

One judgment call: the literal word `"Auto"` lives inside those same numeric-option arrays (`utils/cameraSettings.ts`, `app/(tabs)/light_meter/formsheet.tsx:107-108`). It reads like domain data but it is an actual English word, not a technical value — see §3a, where it turns out to be the single biggest blocker in the codebase.

### Breakdown by screen / feature area

| Screen / feature area | Count |
|---|---|
| Image attach component (`ImageUploader.tsx`, used from new-frame) | 35 |
| Light meter formsheet (`light_meter/formsheet.tsx`) | 25 |
| New-frame modal (`new-frame.tsx`) | 19 |
| Support / tip jar (`support/index.tsx`, `support/_layout.tsx`) | 16 |
| Roll detail (`films/[id].tsx`) | 15 |
| New-film modal (`new-film.tsx`) + modal layout titles | 15 |
| Light meter camera screen (`light_meter/index.tsx`) | 10 |
| Roll list (`films/index.tsx`, `films/_layout.tsx`) | 3 |
| Tab bar labels (`(tabs)/_layout.tsx`) | 3 |
| Film-settings-from-photo suggestion panel (`FilmSettingsFromPhoto.tsx`) | 4 |
| Shared "Enjoying Rollio?" CTA (`EnjoyingRollio.tsx`) | 1 |
| **Total** | **146** |

### Breakdown by kind

| Kind | Count |
|---|---|
| `Alert.alert` titles/messages/buttons | 69 |
| Static labels / body text | 42 |
| Button text (non-Alert: Pressable/TouchableOpacity, toolbar menu actions) | 15 |
| Screen/navigation titles | 8 |
| Placeholder text | 4 |
| Empty-state copy | 4 |
| Tab bar labels | 3 |
| Share-sheet text (message/title/subject) | 3 |
| Accessibility labels/hints | **0 — none exist in the codebase today** |
| **Total** | **146** |

Nearly half the translatable surface (69/146) is `Alert.alert` copy — permission prompts, confirmation dialogs, error messages. That skews the effort toward careful, context-heavy sentence translation rather than short label swaps.

Not counted: `hooks/useFilm.ts`, `useFilms.ts`, `useFrame.ts`, `useFrames.ts` set `error` state strings (e.g. `'Failed to load film'`) that are **never rendered anywhere** — screens only branch on `if (error)`. Dead strings, excluded.

<details>
<summary>Full per-string inventory (146 occurrences, by file) — click to expand</summary>

### `app/(tabs)/_layout.tsx`
| Line | String | Kind |
|---|---|---|
| 29 | "Films" | Tab label |
| 34 | "Light Meter" | Tab label |
| 39 | "Support" | Tab label |

### `app/(modal)/_layout.tsx`
| Line | String | Kind |
|---|---|---|
| 25 | "Add New Film" | Screen title |
| 29 | "Add New Frame" | Screen title |

### `app/(tabs)/films/_layout.tsx`
| Line | String | Kind |
|---|---|---|
| 35 | "Film Rolls" | Screen title |

### `app/(tabs)/support/_layout.tsx`
| Line | String | Kind |
|---|---|---|
| 34 | "About Rollio" | Screen title |

### `app/(tabs)/films/index.tsx`
| Line | String | Kind |
|---|---|---|
| 104 | "You don't have any film rolls yet." | Empty state |
| 107 | "Click the + button to add one." | Empty state |

### `app/(tabs)/films/[id].tsx`
| Line | String | Kind |
|---|---|---|
| 45 | "Delete Film" | Alert title |
| 46 | "Are you sure you want to delete this film?" | Alert message |
| 48 | "Cancel" | Alert button |
| 50 | "Delete" | Alert button |
| 73 | "Film actions" | Alert title (Android) |
| 75 | "Edit" | Alert button (Android) |
| 79 | "Delete" | Alert button (Android) |
| 84 | "Cancel" | Alert button (Android) |
| 187 | "ISO: " | Static label prefix |
| 212 | "Pull " / "Push +" | Conditional prefix (see §3b) |
| 282 | "Edit" | Toolbar menu action |
| 288 | "Delete" | Toolbar menu action |
| 326 | "You don't have any film rolls yet." | Empty state (reused text — arguably a copy bug independent of i18n: this is the *detail* screen) |
| 329 | "Click the + button to add one." | Empty state |

### `app/(modal)/new-film.tsx`
| Line | String | Kind |
|---|---|---|
| 99 | "Discard changes?" | Alert title |
| 100 | "You have unsaved changes. Discard them and leave the screen?" | Alert message |
| 102 | "Don't leave" | Alert button |
| 104 | "Discard" | Alert button |
| 206 | "Missing film name" / "Please enter a name for the film roll." | Alert title/message |
| 232 | "Add New Film" / "Edit Film" | Screen title (dynamic) |
| 333 | "Film Name" | Placeholder |
| 367 | "Camera (optional)" | Placeholder |
| 389 | "ISO" | Static label |
| 399 | "Push/Pull" | Static label |
| 409 | "Expected Shots" | Static label |

### `app/(modal)/new-frame.tsx`
| Line | String | Kind |
|---|---|---|
| 121 | "Discard changes?" | Alert title |
| 122 | "You have unsaved changes. Discard them and leave the screen?" | Alert message |
| 124 | "Don't leave" | Alert button |
| 126 | "Discard" | Alert button |
| 301 | "Error" / "Could not save the frame." | Alert title/message |
| 312 | "Add New Frame" / "Edit Frame" | Screen title (dynamic) |
| 351 | "Delete Frame" | Alert title |
| 352 | "Are you sure you want to delete this frame?" | Alert message |
| 354 | "Cancel" | Alert button |
| 356 | "Delete" | Alert button |
| 366 | "Error" / "Could not delete the frame." | Alert title/message |
| 425 | "Aperture" | Static label |
| 434 | "Shutter Speed" | Static label |
| 456 | "Lens (optional)" | Placeholder |
| 490 | "Note (optional)" | Placeholder |
| 553 | "Delete Frame" | Button text |

### `app/(tabs)/light_meter/index.tsx`
| Line | String | Kind |
|---|---|---|
| 489 | "Error" / "Failed to take photo. Please try again." | Alert |
| 505 | "Error" / "Failed to read camera data. Please try again." | Alert |
| 569 | "Error" / "Failed to capture image. Please try again." | Alert |
| 586 | "We need your permission to show the camera" | Static label |
| 603 | "Grant Permission" | Button text |
| 620 | "Open Settings" | Button text |
| 640 | "No camera device available" | Static label |
| 753 | "Take a reading" | Button text |

### `app/(tabs)/light_meter/formsheet.tsx`
| Line | String | Kind |
|---|---|---|
| 260 | "Light Meter Reading" | Screen title (default) |
| 421 | "Exposure Settings" | Screen title (fallback) |
| 791 | "Settings" | Alert title (Android) |
| 792 | "Currently showing full stops only." / "...half/third stops." | Alert message (conditional) |
| 795 | "Show half/third stops" / "Show full stops only" | Alert button (conditional) |
| 801 | "Cancel" | Alert button |
| 966 | "Select a film to save this reading" | Static label |
| 977 | "No films available.\nCreate a film first to save readings." | Empty state (hardcoded `\n`) |
| 993 | "ISO " | Label prefix |
| 1016 | "Show half/third stops" | Toolbar menu action (iOS) |
| 1076 | " EV ", "over"/"under" | Badge fragments (see §3b) |
| 1091 | "Aperture" | Column label |
| 1133 | "Shutter" | Column label |
| 1174 | "ISO", " (Film)" | Column label + conditional suffix |
| 1230 | "Save to Frame" | Button text |
| 1253 | "Select Film" | Modal title |
| 1310 | "ISO ", " • Frame " | Label fragments |
| 1330 | "ISO locked to film. Adjust aperture or shutter if needed." | Hint text |
| 1363 | "Save Frame" | Button text |

### `app/(tabs)/support/index.tsx`
| Line | String | Kind |
|---|---|---|
| 83 | "Thank you ❤️" / "Your support is greatly appreciated!" | Alert |
| 115 | "Check out Rollio – the app for film photography enthusiasts!\n\nhttps://rollio.davitp.dev/app-link" | Share message |
| 117 | "Share Rollio" | Share dialog title |
| 118 | "Rollio - Film Photography App" | Share subject |
| 123 | "Error" / "Failed to share the app. Please try again later." | Alert |
| 163 | "Rollio is a passion project built with love for the film photography community. If you enjoy using the app and want to show your appreciation, you can make a small contribution below." | Body text |
| 175 | "Support the Project" | Heading |
| 264 | "Spread the Word" | Heading |
| 284 | "Error" / "Failed to open the store URL. Please try again later." | Alert |
| 313 | "Write a Review" | Button text |
| 348 | "Share the App" | Button text |
| 383 | "Version " | Label prefix |

### `components/EnjoyingRollio.tsx`
| Line | String | Kind |
|---|---|---|
| 16 | "Enjoying Rollio?" | Static label / button |

### `components/FilmSettingsFromPhoto.tsx`
| Line | String | Kind |
|---|---|---|
| 90 | "Could not read EXIF data from the attached photo." | Error message |
| 104 | "Attached photo is missing required EXIF data." | Error message |
| 162 | "Suggested Settings" | Heading |
| 172 | "Based on the attached photo's EXIF data and the film's ISO ({filmIso}), here are some suggested aperture and shutter speed combinations to achieve a similar exposure." | Body text (templated, see §3b) |

### `components/ImageUploader.tsx`
| Line | String | Kind |
|---|---|---|
| 50 | "Select Image" / "Choose an option" | Alert |
| 53–55 | "Take Photo" / "Pick from Photos" / "Cancel" | Alert buttons |
| 66–67 | "Settings" / "OK" | Alert buttons |
| 78–79 | "Camera Permission Required" / "Rollio needs camera access to take photos for frames." | Alert |
| 103 | "Camera Error" / "Rollio could not open the camera. Please try again." | Alert |
| 113–114 | "Photos Permission Required" / "Rollio needs photo access to attach images to frames." | Alert |
| 131 | "Photo Picker Error" / "Rollio could not open your photo library. Please try again." | Alert |
| 152–154 | "Permission Required" / "Rollio needs access to your gallery to save photos." / "Settings" | Alert |
| 159 | "Success" / "Image saved to your photo gallery." | Alert |
| 161 | "Error" / "Failed to save image: " | Alert (concatenated with `error.message`) |
| 168–174 | "Remove Image" / "Are you sure you want to remove the image?" / "Cancel" / "Remove" | Alert |
| 184–190 | "Image" / "Replace" / "Save to photos" / "Remove" / "Cancel" | Alert |
| 250–261 | "Replace" / "Save to photos" / "Remove" | Menu button labels (iOS) |
| 273 | "Attach image" | Static label |

No new translatable literal strings in `FilmListItem.tsx`, `FrameListItem.tsx`, `RulerPicker.tsx`, `AdaptiveDatePicker.tsx` beyond props already counted at call sites, plus the `FilmStatus` special case below.

</details>

### Special case: `FilmStatus` enum rendered as raw UI text (not in the 146)

`types/index.ts:1-5`:
```ts
export enum FilmStatus {
    InCamera = 'in-camera',
    Developing = 'developing',
    Archived = 'archived',
}
```
These values are displayed **verbatim, with no label-mapping layer**, at:
- `components/FilmListItem.tsx:110` — `{film.status}` (roll-list status pill)
- `app/(tabs)/films/[id].tsx:236` — `{film.status}` (roll-detail status pill)
- `app/(modal)/new-film.tsx:268,425` — `Object.values(FilmStatus)` fed directly into `MySegmentedControl`'s `values` prop, so the segmented control literally shows "in-camera" / "developing" / "archived" as its segment titles today.

This is both a string-inventory gap and a data-layer risk — see §3a.

<details>
<summary>Domain-data strings excluded (appendix) — click to expand</summary>

| Source | What | Approx. count | Why excluded |
|---|---|---|---|
| `utils/constants.tsx` | `apertureValues` (40), `shutterSpeedValues` (42), `isoValues` (35) | ~117 | Numeric f-stop/shutter/ISO scale values; appears currently unused (superseded by `cameraSettings.ts`) but still domain data |
| `utils/cameraSettings.ts` | `ISO_OPTIONS` (36), `PUSH_PULL_OPTIONS` (23), `EXPECTED_SHOTS` (72), `SHUTTER_SPEED_OPTIONS` (53), `APERTURE_OPTIONS` (41) | ~225 | Picker option values feeding `RulerPicker` and the light-meter wheels |
| `app/(tabs)/light_meter/formsheet.tsx:107-108` | `FULL_STOP_SHUTTER_SPEEDS` | 19 | Standard shutter-speed subset |
| `components/FilmSettingsFromPhoto.tsx:143` | Aperture whitelist | 10 | Standard f-stop filter list |
| `app/(tabs)/support/index.tsx:26-32` | `productSkus` (3), `operations` (3) | 6 | Internal IAP SKU/operation identifiers, never shown to user |
| `app/(tabs)/light_meter/formsheet.tsx:69-77` | `materialIconNames` map | 7 | SF Symbol → Material icon lookup, not user text |
| `types/index.ts`, `utils/statusColors.ts` | `FilmStatus` enum literals / lookup keys | 3 | Internal identifiers (their *render sites* are the special case above) |

`"Auto"`, embedded inside the numeric option arrays, is the one entry in this table that is actually an English word rather than a technical value — flagged and tracked separately in §3a because of its behavior as a stored comparison sentinel.

</details>

---

## 3. Hardest-problem hunt

### 3a. Display strings persisted as data — **this is the real blocker**

**`films.status`** (`services/database.ts:18`, `TEXT NOT NULL DEFAULT 'in-camera'`) stores the `FilmStatus` enum values, which are already stable kebab-case codes (`in-camera`, `developing`, `archived`), not prose. That part is actually fine — no migration needed to translate the *label*. The problem is there is currently **no label-mapping layer at all**: `FilmListItem.tsx:110`, `films/[id].tsx:236`, and the segmented control in `new-film.tsx:268,425` all render the raw stored value directly as UI text, and `utils/statusColors.ts:3-7` does string-matching against the same raw values. Translating this requires building a `status → label` function everywhere the raw value currently reaches a `<Text>` or segmented-control title — straightforward, but zero of that plumbing exists today.

**`frames.aperture` / `frames.shutter_speed`** (`services/database.ts:27-28`, both `TEXT NOT NULL`) mostly hold locale-agnostic numeric strings ("1.4", "1/125") — fine. But the literal English word **`"Auto"`** is written directly into these columns as the default value:
- `services/database.ts:236-237` — `input.aperture || "Auto"`, `input.shutter_speed || "Auto"`
- `services/database.ts:62-63` — a **schema migration** that back-fills historical rows: `UPDATE frames SET aperture = 'Auto' WHERE aperture = '0'`

That value is then read back and compared with `===`/`!==` in roughly 15 places across business logic, not just rendering: `formsheet.tsx:117,128,153,383,394,460,467,765,1095,1108`, `new-frame.tsx:149-150`, `FilmSettingsFromPhoto.tsx:35,121`, `RulerPicker.tsx:140,220,225,227`, `FrameListItem.tsx:114,137`.

**Why this matters**: "Auto" isn't just a label — it's a sentinel value baked into both the schema and the comparison logic. If you translate what the user sees for "Auto" without separating that from what's stored, two things break simultaneously: (1) every `=== "Auto"` check in the exposure-calculation and display code stops matching for **existing rows already saved with the English word**, and (2) any new save path that doesn't independently canonicalize the value will write the translated word into the database, permanently forking the meaning of that column between old and new rows. This is exactly the "display string persisted as data" trap the audit was scoped to find, and it's the single most load-bearing fix required before translation work can safely begin — not a nice-to-have, a prerequisite.

The fix is conceptually simple (keep `"Auto"` as an internal code, forever in English, and only translate it in the ~5 render/label call sites, never in the ~10 comparison sites) but touches enough call sites that it needs to be done deliberately and tested, not caught incidentally during string extraction.

One more latent trap: `RulerPicker.tsx:223-227` does `switch (label)` on the **display label prop** (`'Aperture'` / `'Shutter Speed'`, passed in from `new-frame.tsx:425,434`) to decide whether to render an `f/` prefix or `s` suffix. The moment those labels are translated, this switch silently falls through to its default case and the unit formatting breaks. Needs to switch on a stable identifier instead of the (soon-to-be-translated) label text.

No other display-as-data risk exists: `camera` and `lens` columns are free-text user input (not enums), `push_pull`/`iso`/`expected_shots`/`frame_no` are plain numeric columns, and the one AsyncStorage key in use (`last_review_prompt`, `films/index.tsx:33,43`) stores a numeric timestamp, not text.

### 3b. Concatenated / manually pluralized strings

No `${n} item${n === 1 ? '' : 's'}`-style pluralization exists anywhere in the app today — there's no countable-noun copy like "3 frames" to trip over. But 11 occurrences mix copy and variables in ways that won't survive translation as-is (word order, and in one case a full sentence with an embedded variable):

| File:Line | Snippet | Problem |
|---|---|---|
| `films/[id].tsx:212` | `{film.push_pull < 0 ? 'Pull ' : 'Push +'}{film.push_pull}` | Verb chosen by ternary and concatenated before the number; sign/word placement is English-specific |
| `formsheet.tsx:1076` | `{diff > 0 ? '+' : ''}{diff.toFixed(1)} EV {diff > 0 ? 'over' : 'under'}` | "EV" placed mid-sentence, trailing word chosen by ternary |
| `formsheet.tsx:1310` | `ISO {iso} • Frame {n}/{total}` | Two label+value pairs glued together |
| `formsheet.tsx:993` | `ISO {film.iso}` | Label glued to number |
| `films/[id].tsx:187` | `ISO: {film.iso}` | Label glued to number |
| `FilmSettingsFromPhoto.tsx:172` | Full sentence with `${filmIso}` embedded mid-sentence | Entire clause needs re-ordering per target language |
| `RulerPicker.tsx:225` | `` value === 'Auto' ? value : `f/${value}` `` | Prefix concatenation (low risk, symbol) |
| `RulerPicker.tsx:227` | `` value === 'Auto' ? value : `${value}s` `` | Suffix "seconds" abbreviation concatenated |
| `FrameListItem.tsx:114` | `` frame.aperture !== 'Auto' ? `f/${aperture}` : aperture `` | Same pattern |
| `FrameListItem.tsx:137` | `` frame.shutter_speed !== 'Auto' ? `${shutter}s` : shutter `` | Same pattern |
| `formsheet.tsx:917` | `createRenderItem(selectedShutter, "", "s")` | Same suffix pattern via shared helper |

Each of these needs to become an interpolated i18n key (e.g. `t('pushPull.pull', {stops})` / `t('pushPull.push', {stops})`) rather than a runtime-built string — that restructuring, not the raw string count, is what actually drives the schedule risk here.

### 3c. Locale-sensitive number formatting that round-trips

**Confirmed bug risk — the EV value**: `light_meter/index.tsx:538,550` formats `` `EV ${ev100.toFixed(2)}` `` for display and puts the **same formatted string** into router params (`readingParams`, lines 549-565). It's read back at `formsheet.tsx:338`: `const targetEV = Number(ev) || 0;` — and `targetEV` drives all live exposure math (`exposureDiff`, `calculateShutter/Aperture/Iso` calls throughout `formsheet.tsx:589-830`), ultimately feeding values that get saved to a frame via `handleSaveFrame` (`formsheet.tsx:867-884`).

Today this round-trips correctly only because `.toFixed()` and `Number()` are both locale-invariant (always use `.` as the decimal separator). The display and data layers are **not cleanly separated** — they're the same string. If EV display is ever swapped to a locale-aware formatter (e.g. `Intl.NumberFormat` in a German locale, which would render `12,34`), `Number(ev)` on the other end silently returns `NaN`, `targetEV` falls back to `0`, and every downstream aperture/shutter/ISO calculation — and whatever gets saved to the frame — is silently wrong. This must be explicitly preserved (keep the round-trip value locale-invariant, format only for the label the user sees) if EV formatting is touched during localization.

Everything else is lower risk: aperture/shutter/ISO values come from fixed option arrays of plain numeric strings (`utils/cameraSettings.ts`), not from `toFixed`/`Intl` formatting, and are displayed with simple locale-agnostic prefix/suffix concatenation (§3b). EXIF-derived values are cast with `String()`/`Number()` (`light_meter/index.tsx:552-554`, `formsheet.tsx:193-213`), which are also locale-invariant — safe today, but the same class of bug would appear if a locale-aware formatter were ever inserted before that re-parse step.

### 3d. Date and time formatting

Split behavior:
- **Locale-aware (correct pattern)**: `components/AdaptiveDatePicker.tsx:22-30,33-37` uses `toLocaleString(undefined, {...})` / `toLocaleDateString(undefined, {...})` — `undefined` defers to the device's active locale. Used when editing `created_at` in `new-film.tsx:311-316` and `new-frame.tsx:414-420`.
- **Hardcoded (bug)**: `components/FilmListItem.tsx:121-125` and `app/(tabs)/films/[id].tsx:159-163` both call `toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})` — pinned to British format regardless of device locale or app language, inconsistent with the picker's own pattern. This is a locale-aware **API** misused with a hardcoded locale string, so the fix is a one-line change per site (swap `'en-GB'` for `undefined`), but it needs to be caught explicitly since it won't surface as a "missing translation."

No frame-level timestamp is currently rendered anywhere outside the date picker itself.

---

## 4. Layout risk assessment

No `adjustsFontSizeToFit` is used **anywhere** in the codebase — every `numberOfLines` usage (there are only 2) is an unmitigated truncation risk, and every fixed-size text container has no shrink-to-fit fallback.

**Highest risk — light meter formsheet, two fixed-height header rows with centered flex text, no `numberOfLines`, no shrink-to-fit:**
- `formsheet.tsx:1026` — sheet title, inside `inlineHeader` (fixed **height: 44**, line 1400), flanked by two fixed 44×44 icon buttons. Title is dynamic (`"EV 12.34"` today) but has no wrap/shrink fallback.
- `formsheet.tsx:1253` ("Select Film" modal title) — same pattern, inside `filmSelectorModalHeader` (fixed **height: 56**, line 1509).

**Other concrete risks:**
- `components/AdaptiveDatePicker.tsx:110` — `maxWidth: 280` (datetime) / `180` (date-only) wrapping the formatted-date text; 180px is tight for longer locale date strings.
- `app/(tabs)/support/index.tsx:226,236` — IAP price button fixed at `width: 100` / `minWidth: 60`.
- `app/(modal)/new-film.tsx:424` — `MySegmentedControl` fixed at `height: 40`, showing 4 `FilmStatus` segments; the native module exposes no text-fitting prop (`modules/my-segmented-control/src/MySegmentedControl.types.ts`), so behavior under longer translated labels is entirely OS-dependent and untested.
- `components/RulerPicker.tsx:205-217` — the picker's field label is **absolutely positioned** (`top: 17.5, left: 14`) with no width constraint, overlapping ruler tick marks; a longer translated label (e.g. German "Erwartete Aufnahmen" for "Expected Shots") can visually collide with the ruler.
- `components/FilmListItem.tsx:87-112` — the status badge is absolutely positioned (`right: 20`, no left bound); a longer translated status word can overlap the film title below it rather than pushing layout.
- `components/FrameListItem.tsx:92-144` — row of chip pills has no `flexWrap` (RN default is `nowrap`), so longer translated chip content can overflow horizontally off-screen rather than wrap.
- **Tab bar** (`app/(tabs)/_layout.tsx:29,34,39`) — native 3-way equal-split tabs; "Light Meter" (11 chars) is already the longest label, and a German equivalent like "Belichtungsmesser" (18 chars, +64%) is a strong wrap/truncation candidate in a native control the app can't directly style around.
- `light_meter/index.tsx:744-753` — "Take a reading" floating action button has rotation/translate animation (lines 701-716) tuned with fixed pixel offsets (`-40`/`0`/`40`) that assume a short label; a longer translated CTA will visibly widen the button and shift it relative to those hardcoded offsets.
- `formsheet.tsx:977` — `"No films available.\nCreate a film first to save readings."` has a **hardcoded manual line break** — a translation-process risk independent of layout width (translators must decide whether the break still makes sense).

### Top 20 longest English strings (highest expansion risk)

| Rank | Chars | String | File:line |
|---|---|---|---|
| 1 | 183 | "Rollio is a passion project built with love for the film photography community. If you enjoy using the app and want to show your appreciation, you can make a small contribution below." | `app/(tabs)/support/index.tsx:163-164` |
| 2 | 167 | "Based on the attached photo's EXIF data and the film's ISO (${filmIso}), here are some suggested aperture and shutter speed combinations to achieve a similar exposure." | `components/FilmSettingsFromPhoto.tsx:172` |
| 3 | 96 | "Check out Rollio – the app for film photography enthusiasts!\n\nhttps://rollio.davitp.dev/app-link" | `app/(tabs)/support/index.tsx:115` |
| 4 | 60 | "You have unsaved changes. Discard them and leave the screen?" | `new-film.tsx:100`, `new-frame.tsx:122` |
| 6 | 59 | "Rollio could not open your photo library. Please try again." | `components/ImageUploader.tsx:131` |
| 7 | 57 | "ISO locked to film. Adjust aperture or shutter if needed." | `formsheet.tsx:1330` |
| 7 | 57 | "No films available.\nCreate a film first to save readings." | `formsheet.tsx:977` |
| 9 | 53 | "Rollio needs camera access to take photos for frames." | `components/ImageUploader.tsx:79` |
| 9 | 53 | "Rollio needs photo access to attach images to frames." | `components/ImageUploader.tsx:114` |
| 9 | 53 | "Failed to open the store URL. Please try again later." | `app/(tabs)/support/index.tsx:284` |
| 12 | 51 | "Rollio could not open the camera. Please try again." | `components/ImageUploader.tsx:103` |
| 12 | 51 | "Rollio needs access to your gallery to save photos." | `components/ImageUploader.tsx:153` |
| 14 | 49 | "Could not read EXIF data from the attached photo." | `components/FilmSettingsFromPhoto.tsx:90` |
| 15 | 48 | "Failed to share the app. Please try again later." | `app/(tabs)/support/index.tsx:123` |
| 16 | 45 | "Failed to read camera data. Please try again." | `light_meter/index.tsx:505` |
| 16 | 45 | "Attached photo is missing required EXIF data." | `components/FilmSettingsFromPhoto.tsx:104` |
| 18 | 43 | "Are you sure you want to delete this frame?" | `new-frame.tsx:352` |
| 19 | 42 | "Are you sure you want to remove the image?" | `components/ImageUploader.tsx:169` |
| 19 | 42 | "We need your permission to show the camera" | `light_meter/index.tsx:586` |
| 19 | 42 | "Are you sure you want to delete this film?" | `films/[id].tsx:46` |
| 19 | 42 | "Failed to capture image. Please try again." | `light_meter/index.tsx:569` |

Ranks 1 and 2 are the standout risk: at +30% (German), they'd run ~240 and ~217 characters. Both currently sit in free-flowing, unconstrained `<Text>` blocks, so they'll wrap rather than clip — but they'll push everything below them down by an extra line or two (the IAP product row sits directly below #1; the suggestions grid sits directly below #2), which is a real layout regression even without any clipping bug.

---

## 5. Configuration surface

`app.json` contains string literals that live **outside the JS bundle** and are not reachable by any in-app i18n library (i18next etc. cannot touch these — they need a native localization mechanism):

| Key | String | Path |
|---|---|---|
| `ios.infoPlist.NSCameraUsageDescription` | "Rollio requires access to the camera to add images to your frames." | `app.json` |
| `ios.infoPlist.NSPhotoLibraryUsageDescription` | "Rollio requires access to the photo library to add images to your frames." | `app.json` |
| `expo-media-library` plugin `photosPermission` | "Allow $(PRODUCT_NAME) to access your photos." | `app.json` plugins array |
| `expo-media-library` plugin `savePhotosPermission` | "Allow $(PRODUCT_NAME) to save photos." | `app.json` plugins array |
| `react-native-vision-camera` plugin `cameraPermissionText` | "$(PRODUCT_NAME) needs access to your Camera." | `app.json` plugins array |

Expo's standard config-plugin mechanism bakes these into a **single-locale** native `Info.plist`/`AndroidManifest.xml` at prebuild time — there's no built-in per-locale switching through `app.json` alone. Localizing these requires either a custom Expo config plugin that writes per-locale `InfoPlist.strings` files (iOS's native localization mechanism, `ios/<Name>/<locale>.lproj/InfoPlist.strings`) or manual native-project changes that survive `expo prebuild`. This is a separate, small but real, piece of infrastructure work not covered by installing an i18n JS library — budget for it explicitly (folded into the 35–50 hour infra estimate above, roughly 3–5 hours of it).

Everything else in `app.json` (app name "Rollio", bundle identifiers, splash screen config, icon paths) is either non-user-visible or the brand name, which per the stated rules stays as-is in every locale.

**Strings that live in App Store Connect, not the codebase** (localized through App Store Connect's own localization UI, entirely separate from this JS/i18n effort):
- The 3 in-app purchase product names/descriptions for the tip jar (`app/(tabs)/support/index.tsx:26-32`, `productSkus`) — their *display* names and descriptions are configured per-locale in App Store Connect, not in code; the code only references SKU identifiers.
- The App Store listing itself: app name/subtitle, description, keywords, "what's new" release notes, and screenshots — all managed in App Store Connect independently of this codebase.

---

## 6. Estimate and recommendation

### Scope recap
- **150 translatable occurrences** across **~18 files** (146 general UI strings + 4 unmapped `FilmStatus` render sites). Likely ~100–110 unique strings after de-duplicating repeats like "Cancel"/"Delete"/"Error"/"ISO".
- **11 strings need structural rework** (concatenation/word-order restructuring into interpolated keys) — this list matters more than the raw count because each one requires redesigning, not just wrapping in `t()`.
- **1 hard blocker**: the `"Auto"` sentinel persisted into `frames.aperture`/`frames.shutter_speed` and compared via `===` in ~15 places, including a historical-data migration. This must be fixed (isolate the stored code from the display label) before any translation work touches that value, or you will corrupt both old and new records' exposure logic.
- **1 latent data-integrity risk**: the EV value's `toFixed(2)` → route param → `Number()` round-trip, currently safe only because both sides are locale-invariant.
- **2 fixed-height, no-shrink-to-fit header rows** in the densest screen (light meter formsheet) that will need redesign, not just longer strings dropped in.
- **Native permission strings** (`app.json`) need their own localization pipeline, entirely separate from the JS-level i18n library.

### One-time i18n infrastructure (before any second language exists)

| Task | Hours |
|---|---|
| Install/configure `expo-localization` + `react-i18next` (or equivalent), provider setup, device-locale detection with English fallback | 4–6 |
| Design key structure/namespacing, extract all 146 occurrences into `t()` calls across ~18 files | 12–16 |
| Fix the `"Auto"` sentinel — isolate stored code from display across ~15 comparison sites (§3a) | 4–6 |
| Build the `FilmStatus → label` mapping layer (4 render sites) | 1–2 |
| Restructure the 11 concatenated/templated strings into interpolation-safe keys (§3b) | 4–6 |
| Fix EV number round-trip to stay locale-invariant regardless of display formatting (§3c) | 2–3 |
| Fix the 2 hardcoded `'en-GB'` date calls to use device locale, consistent with `AdaptiveDatePicker` (§3d) | 1–2 |
| Native permission-string localization path (custom config plugin or `InfoPlist.strings`, §5) | 3–5 |
| Regression QA in English to confirm the refactor changed nothing visible | 4–6 |
| **Total** | **35–50 hours** |

This is genuinely a ~1–1.5 week solo effort before a single translated word ships — the bulk isn't installing a library, it's the extraction-and-refactor labor plus the two structural fixes in §3a/3c that can't be skipped without risking data corruption.

### Per-language incremental cost (after infrastructure exists)

| Task | Hours |
|---|---|
| Translate ~100–110 unique strings (many are full sentences — permission prompts, error messages, the two long body-text blocks) with domain-appropriate review | 8–12 |
| Wire the new locale file, verify fallback chain, spot-check plural/interpolation keys | 2–3 |
| **Total** | **10–15 hours** |

This assumes a competent translator/reviewer who understands the photography domain (so "stop", "push/pull", "EV" aren't mistranslated) — generic translation-service output will need a technical review pass on top of this.

### Layout QA per language (separate from translation)

| Scope | Hours |
|---|---|
| German/French (Latin script, +~30% length, no line-break rule changes) | 6–8 |
| Japanese/Korean (variable length, different line-breaking rules, no `adjustsFontSizeToFit` anywhere to fall back on) | 8–10 |

Focus areas per the layout audit: both fixed-height formsheet header rows, the native tab bar's 3-way split, the 4-way segmented control, the absolutely-positioned status badge and ruler-picker label, and the two 150+ character body-text blocks pushing their neighboring content down.

### Blockers — must be fixed before localization is safe to ship, not optional polish

1. **`"Auto"` stored as literal English text in `frames.aperture`/`frames.shutter_speed`, compared via `===` in ~15 places, including a data migration that back-filled it into old rows.** This is the one item that can silently corrupt user data (both historical and newly-saved frames) if skipped. Fix before touching any translation.
2. **No `FilmStatus` → label mapping layer exists.** Three enum values render directly as raw English UI text in 4 places today; needs to be built from scratch, not adapted.
3. **Zero i18n infrastructure of any kind is present.** Nothing in this app is currently capable of showing a second language — this is a from-scratch build, not an extension of partial work.
4. **The EV `toFixed`/`Number()` round-trip must be explicitly preserved as locale-invariant** if EV display formatting changes — otherwise the exposure math and saved frame data will be silently wrong for certain locales.
5. **`RulerPicker.tsx`'s `switch (label)`** on the display label string (not a stable id) will silently break unit formatting (`f/`, `s`) the moment those labels are translated — small fix, easy to miss.

---

## Recommendation

This is not a weekend project, and it's not really a "week" project either if you count it honestly — it's roughly two weeks of focused solo work to get the *first* language shipped safely (infrastructure + the two structural data-layer fixes + one full translation + layout QA), then two to three days for each additional language after that. The string count (150) looks small and would be a weekend if that were the whole job, but it isn't: the actual cost center is the `"Auto"` sentinel sitting in your SQLite schema and comparison logic, which is a genuine data-integrity hazard, not a translation problem — get that wrong and you corrupt exposure calculations on frames some users already have saved. That single issue, more than the 150 strings or the CJK layout risk, is the thing that turns "add some translation files" into a real engineering project with a data-migration-shaped tail risk. If you decide to proceed, treat §3a as a prerequisite milestone before writing a single `t()` call.
