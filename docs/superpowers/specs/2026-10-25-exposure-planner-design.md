# Exposure Planner (scene EV without a reading) — Design

Date: 2026-10-25
Status: direction approved in chat (tall sheet, ruler on top, existing Save to Frame kept, no photo)
Ships as: version **2.4.0** with a What's New entry
Branch: `feat/scene-ev-calculator`

## Intent

The light meter's reading sheet is the best exposure calculator in the app,
but it only opens after a camera reading. That makes it useless for the
night before a shoot: "will Portra 400 at f/2.8 still give me a handheld
shutter at dusk?", "which lenses do I bring for an overcast day?". A user
asked for exactly this, pointing at omnicalculator's exposure page where you
pick a target EV from a slider with scene icons and descriptions and the
rest works like a meter.

Rollio's answer is the same sheet with one addition: a scene ruler across
the top that sets the target EV. Everything below it, the three columns, the
locks, the over/under pill, the film list and Save to Frame, is the code that
exists today. No photo is carried along, because there is none.

## Goals

- Open the reading sheet without a reading, from the light meter tab, in
  one tap.
- Set the target EV by sliding through named scenes (snow, full sun, hazy
  sun, overcast, sunset, lit street, candlelight, moonlight…), with a short
  description so a user who does not think in EV still lands on the right
  light.
- Fine control in third stops, so the ruler is both presets and tuning.
- Live: the scene name and EV value follow the ruler tick by tick; the
  unlocked column recalculates the moment the ruler settles, so the user can
  slide from overcast to sunset and watch the shutter fall.
- Works where the camera does not: no permission, no camera device,
  simulator. Those screens get the same entry point.
- Looks like it was always there. Same glass cards, radii, Lufga sizes,
  grey glyphs and system colours as the sheet around it.

## Non-goals

- No persistence of the chosen scene between sessions.
- No incident-light or reflected-light modes, no exposure compensation
  field, no reciprocity failure. The ruler is EV100 and nothing else.
- No change to how a camera reading works. Metered sheets look and behave
  exactly as they do today.
- No maps, weather or time-of-day lookups to guess a scene.

## Anti-goals

- A frame saved from a planned exposure must not carry a photo. The frame
  form is opened without the `image` param; nothing else about it changes.
- The ruler must not fight the columns. One gesture moves one thing; the
  recalculation rules below are the existing ones, not a new solver.
- No new dependency. The ruler reuses the existing horizontal ruler
  picker's look (the one in the film and frame forms), and the sheet reuses
  its own pickers.
- Do not move or shrink the camera screen's shutter button. The entry
  point sits beside it.

## Constraints

- Expo SDK 58, React Native 0.88, expo-router native form sheets on iOS,
  `@gorhom/bottom-sheet` on Android (the sheet already supports both via
  `presentation: 'native-sheet' | 'bottom-sheet'`).
- The sheet component is `app/(tabs)/light_meter/formsheet.tsx`
  (`LightMeterReadingSheet`). It takes the target EV as the string param
  `ev` and otherwise owns its state. The light meter screen
  (`app/(tabs)/light_meter/index.tsx`) pushes the `formsheet` route on iOS
  and mounts the component inside a bottom sheet on Android.
- Only one column can be locked at a time (`lockedPicker`), and in film mode
  ISO is force-locked. Keep that model.
- Pure logic lives in a module with no React or Expo imports so it runs
  under the Node harness in `tests/` (strip-only TypeScript: no enums, no
  parameter properties).
- Strings in `i18n/locales/{en,ja,ko}.json`. Japanese and Korean are
  shipped languages; new keys are added in all three.
- Fonts: LufgaMedium for values and titles, LufgaRegular for secondary
  text. Glyphs: SF Symbols on iOS, Material Icons on Android through the
  sheet's existing `SheetIcon` mapping.

## The entry point (light meter screen)

A round glass button in the **top-right corner** of the camera view, where
the Films tab keeps its secondary action:

- 48 pt, same glass style, shadow and fallback colours as the shutter pill,
  containing one glyph at 22 pt in the label colour: SF `sun.haze.fill`,
  Material `wb-twilight`. No text. Accessibility label: the planner title
  string. Placed at the top safe-area inset plus 8 pt, inset from the right
  edge by 10 pt plus the side safe-area inset (iPhone Duo rail).
- Only the glyph turns with the device, like the Camera app; the button
  stays put. The shutter pill keeps its own rotation behaviour, alone at the
  bottom.
- Tap: light haptic, then open the sheet in scene mode (below). The `loading`
  guard that stops double taps on the pill applies here too.

While the planner is up the camera is off duty: the preview pauses
(`isActive` false), the gradient used on the permission and no-camera
screens fades in over it in 250 ms, and the shutter pill and the round
button fade out underneath. Closing the sheet reverses the fade and resumes
the camera. (Decided in chat on 2026-10-26, replacing an earlier placement
beside the shutter pill.)

On the **no camera permission** and **no camera device** screens, the
message stays and gains one glass pill beneath it, in the same neutral style
as the shutter pill (not the blue permission button): glyph `sun.haze.fill`
plus "Plan an exposure". It opens the same sheet. On the permission screen it
sits below the existing Grant Permission / Open Settings button.

## Opening in scene mode

- iOS: `router.push({ pathname: '/(tabs)/light_meter/formsheet', params:
  { mode: 'scene' } })`. No `ev`, `aperture`, `shutterSpeed`, `iso`,
  `image`, `title`.
- Android: `setReading({ mode: 'scene' })` with the planner detent (below)
  and the existing bottom sheet.
- `LightMeterReadingParams` gains `mode?: 'reading' | 'scene'` (default
  `'reading'`). Everything in this section is gated on `mode === 'scene'`.

## The sheet in scene mode

Top to bottom:

1. **Header.** iOS native sheet keeps the toolbar (xmark left, gear menu
   right). The Android inline header's title and the iOS `fallbackTitle`
   path both read the planner title string, "Exposure Planner".
2. **Scene card.** One `GlassView`, radius 24, same horizontal inset (20 pt)
   as the wheels container, 12 pt above the over/under pill's row. Inside:
   - Scene row: glyph (22 pt, label colour) at the left, then the scene
     name (LufgaMedium 17, label colour) with the description beneath it
     (LufgaRegular 13, secondary label colour, may wrap to two lines, never
     truncated), and the EV value right-aligned (LufgaMedium 24, label
     colour) formatted as `EV 12`, `EV 12⅓`, `EV 12⅔`. The row's height is
     fixed to the two-line case so changing scene never shifts the ruler.
   - Ruler: the same tick ruler as the film form's ISO row, exactly as it
     looks today: uniform ticks that scale and brighten toward the centre,
     snapping, one selection haptic per tick. No new tick styling (no thick
     whole-stop ticks, no marker). Width measured from its own layout so it
     is right inside sheets and on iPhone Duo. No label pill and no value
     above the ticks; the scene row above is the value. Builder's call
     whether this is a `RulerPicker` option (e.g. `variant: 'bare'`) or the
     ruler extracted into a shared piece; the film and frame forms must look
     identical afterwards.
   - Values: EV −3 to 17 in third stops (61 ticks). Starts on **EV 15**.
   - Two update rates. The scene row (glyph, name, description, EV value)
     updates on every tick during the drag; `RulerPicker` currently reports
     only on momentum end, so the planner ruler needs a per-tick callback
     that the film and frame forms do not opt into. The columns recalculate
     once, when the ruler settles, using the sheet's existing animated
     `scrollToValue`; it must not be called per tick (it holds a single
     350 ms programmatic-scroll flag and would stack animations).
3. **Over/under pill**, **three columns** (aperture, shutter, ISO) with
   their lock buttons, and **Save to Frame** exactly as today.

### Starting values

Aperture `16`, shutter `1/125`, ISO `100`: the Sunny 16 triple, EV 14.97,
inside the pill's 0.1 threshold so the sheet opens with no over/under pill.
Nothing is locked.

### Recalculation when the ruler moves

The target EV becomes state in scene mode (`targetEV = mode === 'scene' ?
sceneEv : Number(ev)`). When the ruler lands on a new EV, move exactly one
column, chosen by the existing lock:

| Locked column | Column that moves | Column that stays |
|---|---|---|
| none | shutter | aperture, ISO |
| shutter | aperture | shutter, ISO |
| aperture | shutter | aperture, ISO |
| ISO (or film mode) | shutter | aperture, ISO |

ISO never moves on an EV change; it is a property of the film. The moving
column takes the nearest option in its list (for shutter, the full-stop or
half/third-stop list per the gear toggle; aperture has one third-stop list)
and scrolls there with the same animated scroll the columns use. If the ideal value is outside the column's
range it clamps to the end and the over/under pill shows the remainder, as
it does today when a column is pinned at its end. The builder reuses the
sheet's `calculateShutter` / `calculateAperture` and the scroll helpers;
they may be lifted into the pure module (below) unchanged.

Scrolling a column by hand behaves as today: the other unlocked column(s)
move to hold the target EV. The ruler never moves on its own.

### Film list and Save to Frame

Unchanged. Selecting a film locks ISO to the film's ISO and recalculates the
shutter as now. Save to Frame pushes `/new-frame` with `filmId`, `iso`,
`frameCount`, `aperture`, `shutterSpeed` and **no** `image`. The scene is
not written into the frame.

### Layout notes from the code

- The over/under pill is absolutely positioned at `headerHeight - 18`
  inside the wheels container's top margin. In scene mode the card goes
  above it, so that offset (or the pill's row) moves down by the card's
  height; the pill must still sit centred between the card and the columns.
- The iOS route hard-codes `sheetAllowedDetents: [0.45]` in
  `app/(tabs)/light_meter/_layout.tsx`. Scene mode must open at its own
  detent without a visible grow after mount: make the screen options a
  function of `route.params.mode`.
- On Android the bottom sheet is rendered only in the camera-ready branch
  of the light meter screen. The permission and no-device branches need it
  too (or the three returns share one wrapper), otherwise "opens the same
  sheet" is not true there.

### Detents

The scene card adds roughly 130 pt. Builder measures and sets:

- iOS native sheet, compact: **0.68** (reading mode stays 0.45). Film list
  and selected-film states keep their current larger detents (0.85), raised
  only if the card pushes the Save button under the home indicator.
- Android bottom sheet, compact: **0.75** (reading mode stays 0.52).
  Selected film: 0.88 if 0.8 clips the Save button.

The sheet must fit on the smallest supported phone and on iPhone Duo in
both widths without inner scrolling of the sheet.

## Scenes (EV100 table)

The ruler is continuous; the name, description and glyph come from the band
the current EV falls in. Bands are centred on whole stops (±½ stop), with
the ends open.

| EV | Name | Description | SF Symbol | Material |
|---|---|---|---|---|
| ≥ 15.5 | Snow or sand | Full sun on snow, sand or water | `snowflake` | `ac-unit` |
| 15 | Full sun | Clear sky, hard shadows | `sun.max.fill` | `wb-sunny` |
| 14 | Hazy sun | Thin haze, soft shadows | `sun.haze.fill` | `brightness-5` |
| 13 | Bright overcast | Bright cloud, faint shadows | `cloud.sun.fill` | `wb-cloudy` |
| 12 | Overcast | Grey sky, no shadows | `cloud.fill` | `cloud` |
| 11 | Heavy overcast | Dark cloud, or open shade on a sunny day | `smoke.fill` | `filter-drama` |
| 10 | Sunset | Low sun, golden hour | `sunset.fill` | `wb-twilight` |
| 9 | Just after sunset | Twilight, sky still bright | `sun.horizon.fill` | `brightness-4` |
| 8 | Bright interior | Shop windows, bright rooms, stadiums | `lightbulb.fill` | `lightbulb` |
| 7 | Lit street at night | Neon, shopfronts, bright streets | `building.2.fill` | `location-city` |
| 6 | Home interior | A normally lit room at night | `house.fill` | `home` |
| 5 | Dim interior | Restaurants, floodlit buildings | `lamp.table.fill` | `light` |
| 4 | Candlelight | Candles, fireplaces, fairgrounds at night | `flame.fill` | `local-fire-department` |
| 3 | Distant lights | Lit skyline from afar, dark streets | `sparkles` | `auto-awesome` |
| 2 | Night skyline | Lit buildings at night | `moon.stars.fill` | `nights-stay` |
| ≤ 1.5 | Moonlight | Full moon landscapes and darker | `moon.fill` | `bedtime` |

The table is data in the pure module, each row `{ ev, nameKey,
descriptionKey, sf, md }`. If an SF Symbol or Material name in this table
is not available in the installed versions, the builder picks the closest
available glyph and notes it in the commit; the names here are the intent.

When the ruler crosses into a new band the scene row's glyph and text
change with a short cross-fade (150 ms) and a light impact haptic, on top
of the ruler's own per-tick selection haptic.

## Pure module

`services/exposurePlanner.ts` (no React, no Expo):

- `EV_PLANNER_MIN = -3`, `EV_PLANNER_MAX = 17`, `EV_PLANNER_DEFAULT = 15`.
- `EV_PLANNER_VALUES: number[]`: thirds from min to max, stored as
  rounded thirds (−3, −2.667, −2.333, …, 17) so equality checks work.
- `EV_SCENES`: the table above, ordered from brightest to darkest.
- `sceneForEv(ev: number)`: the band for an EV using the ±½ rule and open
  ends.
- `formatEv(ev: number)`: `"15"`, `"12⅓"`, `"12⅔"`, `"-1⅓"`; the UI adds the
  `EV ` prefix from strings so it can be localized.
- `columnToMoveForEv(locked: 'aperture' | 'shutter' | 'iso' | null,
  filmMode: boolean)`: the table in "Recalculation when the ruler moves".
- Optionally the lifted `calculateShutter`, `calculateAperture`,
  `calculateIso`, `evFor(aperture, shutterSeconds, iso)`.

## Strings

New keys, added to en, ja and ko:

- `lightMeter.planner.title`: "Exposure Planner"
- `lightMeter.planner.open`: "Plan an exposure" (pill text on the
  permission and no-camera screens; the round button's accessibility
  label uses `title`)
- `lightMeter.planner.ev`: "EV {{value}}"
- `lightMeter.planner.scenes.<key>.name` and `.description` for each of the
  16 rows, keys: `snow`, `sun`, `hazySun`, `brightOvercast`, `overcast`,
  `heavyOvercast`, `sunset`, `afterSunset`, `brightInterior`, `litStreet`,
  `homeInterior`, `dimInterior`, `candlelight`, `distantLights`,
  `nightSkyline`, `moonlight`.
- `whatsNew.releases.2_4_0.planner.title`: "Plan an exposure"
- `whatsNew.releases.2_4_0.planner.body`: "No light to meter yet? Tap the
  sun in the top corner of the light meter, pick the scene you expect, and
  see what your film and lenses can do before you pack them."

Japanese and Korean translations follow the tone of the existing
`lightMeterSheet` strings. Scene names are kept short enough to sit on one
line beside the EV value at the default text size.

## What's New and version

- `app.json` version `2.4.0`.
- `WHATS_NEW` gets a `2.4.0` entry with one item: `sf: 'sun.haze.fill'`,
  `md: 'wb-twilight'`, the two keys above. `tests/whats-new/test-whats-new.mjs`
  asserts the newest version is `2.3.1` and must be updated to `2.4.0` in
  the same commit.
- Store notes come later, outside this design.

## Tests (Node harness)

`tests/light-meter/test-exposure-planner.mjs`:

- `EV_PLANNER_VALUES` has 61 entries, first −3, last 17, consecutive
  differences ⅓ within 1e-9.
- `sceneForEv`: 15 → sun; 15.4 → sun; 15.5 → snow; 14.5 → sun (boundary
  belongs to the brighter band); 1.4 → moonlight; −3 → moonlight; 17 →
  snow.
- `formatEv`: 15 → "15", 12.333… → "12⅓", 12.666… → "12⅔", −1.333… →
  "-1⅓", 0 → "0".
- `columnToMoveForEv`: the four rows of the table plus film mode.
- `calculateIso` is currently a `useCallback` inside the component; if the
  calculators are lifted it becomes a plain function alongside the others.
- If the calculators are lifted: Sunny 16 round trip, `calculateShutter(16,
  100, 15)` ≈ 1/125 within 3 %, `evFor(16, 1/125, 100)` ≈ 15 within 0.05.

Manual checks before merge, on the iPhone Duo simulator (no camera, so the
planner is the only way the sheet opens there) and on the phone: both
detents, both widths on Duo, dark mode, Japanese, Save to Frame producing a
frame with no image, a metered reading unchanged.

## Builder's calls (left open, decide while building)

- How the per-tick callback is added to the ruler (a second optional prop
  such as `onTick`, or a `notify: 'tick' | 'settle'` option).
- How the bare ruler is shared with `RulerPicker` (option vs extraction).
- Exact detent numbers after measuring the scene card.
- Whether the cross-fade is `Animated` or a key change with
  `LayoutAnimation`; the 150 ms and the light haptic are the requirement.
- Row layout of the two bottom controls in landscape (the translateX
  offsets).
- Whether the lifted calculators move out of `formsheet.tsx` now or stay
  and are re-exported.
