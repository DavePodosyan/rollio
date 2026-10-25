# Exposure Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open the light meter's reading sheet without a reading, with a scene ruler on top that sets the target EV live.

**Architecture:** A pure module holds the EV range, the scene table, formatting and the "which column moves" rule, tested under Node. The ruler picker gains a bare variant with a per-tick callback. The reading sheet gains a `mode: 'scene'` that renders a scene card above the existing pill and columns and makes the target EV state; the light meter screen gains the entry button and opens the sheet in that mode on all three of its states.

**Tech Stack:** Expo SDK 58, React Native 0.88, expo-router native form sheets (iOS), @gorhom/bottom-sheet (Android), expo-glass-effect, expo-symbols / Material Icons, react-i18next, Node 26 harness in `tests/db/harness.mjs`.

**Spec:** `docs/superpowers/specs/2026-10-25-exposure-planner-design.md`

## Global Constraints

- Pure module has no React or Expo imports; strip-only TypeScript (no enums, no parameter properties).
- New strings go into `i18n/locales/en.json`, `ja.json` and `ko.json` in the same commit.
- Fonts: LufgaMedium for values and titles, LufgaRegular for secondary text. Glyphs: SF Symbols on iOS, Material Icons on Android.
- No new dependency. The film and frame forms' ruler must look and behave exactly as before.
- Metered reading sheets (mode `'reading'`) must be pixel- and behaviour-identical to today.
- Save to Frame from scene mode passes no `image`.
- Ruler: EV −3 … 17 in thirds (61 ticks), opens on 15; initial columns f/16, 1/125, ISO 100.
- Scene bands are ±½ stop around whole stops, open-ended at 16 and 1; the boundary belongs to the brighter band.
- Detents: iOS scene compact 0.62 (reading stays 0.45); Android scene compact 0.70 (reading stays 0.52).
- Version 2.4.0, one What's New item (`sun.haze.fill` / `wb-twilight`).
- Type check with `npx tsc --noEmit`; unit tests with `npm run test:unit`.

## Review Focus

1. Ruler released between ticks or flung past the end: `onTick`/`onChange` must deliver a value inside the list (clamped), never `undefined`. Test in Task 3's manual check; the pure `sceneForEv` test covers −3 and 17.
2. EV moved while the shutter column is at its end (e.g. EV 17 at f/1, ISO 25600): the column clamps and the over/under pill shows the remainder instead of a crash or a silent wrong value. Pin with the `columnToMoveForEv` + calculator tests in Task 1 and the manual check in Task 4.
3. Gear toggle (full stops vs thirds) flipped in scene mode: the shutter re-snaps and a later ruler move uses the new list. Manual check in Task 4.
4. Returning from Save to Frame in scene mode: the sheet resets to the scene compact detent, not the reading one (`compactSheetDetent` must be mode-aware). Manual check in Task 4.
5. Android permission and no-device screens: the planner pill must open the bottom sheet there too, and Back must close it. Manual check in Task 6.

---

### Task 1: Pure module `services/exposurePlanner.ts`

**Files:**
- Create: `services/exposurePlanner.ts`
- Test: `tests/light-meter/test-exposure-planner.mjs`
- Modify: `package.json` scripts (add `test:light-meter`, same shape as `test:location`)

**Interfaces:**
- Produces:
  - `EV_PLANNER_MIN = -3`, `EV_PLANNER_MAX = 17`, `EV_PLANNER_DEFAULT = 15`
  - `EV_PLANNER_VALUES: number[]` (61 values, each `Math.round(x * 3) / 3`)
  - `type SceneKey = 'snow' | 'sun' | 'hazySun' | 'brightOvercast' | 'overcast' | 'heavyOvercast' | 'sunset' | 'afterSunset' | 'brightInterior' | 'litStreet' | 'homeInterior' | 'dimInterior' | 'candlelight' | 'distantLights' | 'nightSkyline' | 'moonlight'`
  - `type ExposureScene = { key: SceneKey; ev: number; sf: string; md: string }`
  - `EV_SCENES: ExposureScene[]` brightest first, `ev` 16 … 1 per the spec table (glyphs from the spec table)
  - `sceneForEv(ev: number): ExposureScene`
  - `formatEv(ev: number): string` → `"15"`, `"12⅓"`, `"12⅔"`, `"-1⅓"`, `"0"`
  - `type PlannerColumn = 'aperture' | 'shutter' | 'iso'`
  - `columnToMoveForEv(locked: PlannerColumn | null, filmMode: boolean): 'shutter' | 'aperture'`
  - `evFor(aperture: number, shutterSeconds: number, iso: number): number`
  - `calculateShutter(aperture: number, iso: number, targetEV: number): number`
  - `calculateAperture(shutterSeconds: number, iso: number, targetEV: number): number`
  - `calculateIso(aperture: number, shutterSeconds: number, targetEV: number): number`

- [ ] **Step 1: Write the failing test** `tests/light-meter/test-exposure-planner.mjs` (import `'../db/harness.mjs'` first, like `tests/settings/test-launch-tab.mjs`):

```js
assert.equal(EV_PLANNER_VALUES.length, 61);
assert.equal(EV_PLANNER_VALUES[0], -3);
assert.equal(EV_PLANNER_VALUES.at(-1), 17);
for (let i = 1; i < EV_PLANNER_VALUES.length; i++) assert.ok(Math.abs(EV_PLANNER_VALUES[i] - EV_PLANNER_VALUES[i-1] - 1/3) < 1e-9);
assert.ok(EV_PLANNER_VALUES.includes(EV_PLANNER_DEFAULT));
assert.equal(EV_SCENES.length, 16);
assert.deepEqual(EV_SCENES.map(s => s.ev), [16,15,14,13,12,11,10,9,8,7,6,5,4,3,2,1]);
assert.equal(sceneForEv(15).key, 'sun');
assert.equal(sceneForEv(15.4).key, 'sun');
assert.equal(sceneForEv(15.5).key, 'snow');
assert.equal(sceneForEv(14.5).key, 'sun');
assert.equal(sceneForEv(17).key, 'snow');
assert.equal(sceneForEv(1.4).key, 'moonlight');
assert.equal(sceneForEv(-3).key, 'moonlight');
assert.equal(sceneForEv(12 + 1/3).key, 'overcast');
assert.equal(formatEv(15), '15');
assert.equal(formatEv(12 + 1/3), '12⅓');
assert.equal(formatEv(12 + 2/3), '12⅔');
assert.equal(formatEv(-1 - 1/3), '-1⅓');
assert.equal(formatEv(0), '0');
assert.equal(columnToMoveForEv(null, false), 'shutter');
assert.equal(columnToMoveForEv('shutter', false), 'aperture');
assert.equal(columnToMoveForEv('aperture', false), 'shutter');
assert.equal(columnToMoveForEv('iso', false), 'shutter');
assert.equal(columnToMoveForEv(null, true), 'shutter');
assert.ok(Math.abs(evFor(16, 1/125, 100) - 15) < 0.05);
assert.ok(Math.abs(calculateShutter(16, 100, 15) - 1/125) / (1/125) < 0.03);
assert.ok(Math.abs(calculateAperture(1/125, 100, 15) - 16) / 16 < 0.03);
assert.ok(Math.abs(calculateIso(16, 1/125, 15) - 100) / 100 < 0.03);
```

- [ ] **Step 2: Run** `node --no-warnings tests/light-meter/test-exposure-planner.mjs` → fails: cannot find `@/services/exposurePlanner`.
- [ ] **Step 3: Implement** the module. `sceneForEv`: first scene whose `ev - 0.5 <= value`, falling back to the last; `formatEv`: round to thirds, integer part plus `⅓`/`⅔` (handle negatives by formatting `|x|` and prefixing `-`). Calculators are the formulas from `formsheet.tsx` lines 219–231 and 567–570, copied verbatim.
- [ ] **Step 4: Run** the test → `ALL PASSED`. Add `"test:light-meter"` to `package.json` scripts and run `npm run test:unit` → all pass.
- [ ] **Step 5: Commit** `feat(planner): pure EV scene table, formatting and calculators`.

### Task 2: Strings

**Files:**
- Modify: `i18n/locales/en.json`, `ja.json`, `ko.json` under `lightMeter`

**Interfaces:**
- Produces keys: `lightMeter.planner.title`, `lightMeter.planner.open`, `lightMeter.planner.ev` (`"EV {{value}}"`), `lightMeter.planner.scenes.<SceneKey>.name`, `lightMeter.planner.scenes.<SceneKey>.description` for all 16 keys.

- [ ] **Step 1: Add** the English values from the spec's scene table and strings section.
- [ ] **Step 2: Add** Japanese and Korean, matching the tone of the existing `lightMeterSheet` strings; names short enough for one line.
- [ ] **Step 3: Verify** with a Node one-liner that each of the three files has the 16 `name` and 16 `description` keys plus `title`, `open`, `ev`, and that `i18next.d.ts` type check passes (`npx tsc --noEmit`).
- [ ] **Step 4: Commit** `chore(planner): strings for the exposure planner in en, ja, ko`.

### Task 3: Bare ruler with per-tick callback

**Files:**
- Modify: `components/RulerPicker.tsx` (props at lines 15–21, scroll listener ~99–114, momentum end ~85–97, render ~210–280)

**Interfaces:**
- Produces: `RulerPickerProps` gains `variant?: 'card' | 'bare'` (default `'card'`) and `onTick?: (value: number | string) => void`.
  - `'bare'`: renders only the tick strip (the inner `View` + `Animated.FlatList`), no outer `GlassView`, no label pill, no value text; height 68, width 100 %.
  - `onTick` fires from the scroll listener whenever `selectedIndex` changes (same place as the haptic), with the clamped value. `onChange` keeps firing only on momentum end.

- [ ] **Step 1: Implement** both props. Keep every existing call site's output identical (they pass neither prop).
- [ ] **Step 2: Verify** `npx tsc --noEmit` passes and `npx expo lint components/RulerPicker.tsx` adds no new problems.
- [ ] **Step 3: Manual check** in the running app: New Film's ISO and Expected Shots rulers unchanged (label pill, value, glass card, haptics, snap).
- [ ] **Step 4: Commit** `feat(ruler): bare variant and per-tick callback for the exposure planner`.

### Task 4: Scene mode in the reading sheet

**Files:**
- Create: `components/ExposureSceneCard.tsx`
- Modify: `app/(tabs)/light_meter/formsheet.tsx`:
  - `LightMeterReadingParams` (238–245): add `mode?: 'reading' | 'scene'`
  - props destructure (259–270) and route wrapper (1393–1405): pass `mode`
  - compact detent (280): mode-aware
  - `targetEV` (346): state in scene mode
  - initial values (297–303): scene defaults when `mode === 'scene'` and no params
  - materialIconNames (72–80): not needed if the card maps its own glyphs
  - pill `top` (1050): add the card height in scene mode
  - JSX (1046): render the card above the pill wrapper in scene mode
  - header effect (427–432) and inline header: planner title in scene mode

**Interfaces:**
- Consumes: Task 1 exports; Task 2 keys; Task 3 `variant="bare"` + `onTick`.
- Produces: `ExposureSceneCardProps = { ev: number; onTick: (ev: number) => void; onSettle: (ev: number) => void; labelColor: ColorValue; secondaryLabelColor: ColorValue; isAndroid: boolean }`. Exports `EXPOSURE_SCENE_CARD_HEIGHT: number` (measured once built; expected ≈ 130).

- [ ] **Step 1: Build `ExposureSceneCard`.** One `GlassView` (radius 24, `isInteractive`, same fallback background rule as the sheet's `wheelGlass`). Scene row: glyph 22 pt (SymbolView `scene.sf` on iOS, MaterialIcons `scene.md` on Android), name LufgaMedium 17, description LufgaRegular 13 secondary (two-line fixed height, `numberOfLines={2}` without ellipsis clipping of real text), EV value right LufgaMedium 24 via `t('lightMeter.planner.ev', { value: formatEv(ev) })`. Below: `<RulerPicker variant="bare" valueKind="plain" values={EV_PLANNER_VALUES} initial={ev} onTick={…} onChange={…} />`. On a band change: `Animated` opacity cross-fade 150 ms on the scene row and `Haptics.impactAsync(Light)`.
- [ ] **Step 2: Wire scene mode in the sheet.**
  - `const isSceneMode = mode === 'scene'`; `const [sceneEv, setSceneEv] = useState(EV_PLANNER_DEFAULT)`; `const targetEV = isSceneMode ? sceneEv : (Number(ev) || 0)`.
  - Initial strings when scene mode and params absent: aperture `'16'`, shutter `'1/125'`, iso `100`.
  - `compactSheetDetent`: `isSceneMode ? (bottom-sheet ? 0.70 : 0.62) : existing`.
  - `applySceneEv(nextEv: number)`: `setSceneEv(nextEv)`; `const column = columnToMoveForEv(lockedPicker, isFilmMode)`; compute with the same clamp + `findClosest*` + `scrollToValue` pattern as `onIsoScrollEnd` for shutter, `onShutterScrollEnd` for aperture; never touch ISO. Pass as `onSettle`; `onTick` only calls `setSceneEv`.
  - Pill wrapper `top`: `+ EXPOSURE_SCENE_CARD_HEIGHT + 12` in scene mode; render `<ExposureSceneCard>` just above it inside `styles.container` with `marginTop` matching the pill's current offset so the columns keep their spacing.
  - Header: in scene mode `navigation.setOptions({ title: t('lightMeter.planner.title') })` on iOS; inline header title on Android.
  - Reading mode: no code path changes (guard every addition with `isSceneMode`).
- [ ] **Step 3: Verify** `npx tsc --noEmit`; `npm run test:unit`.
- [ ] **Step 4: Manual check** (iPhone Duo simulator, via a temporary deep link `rollio:///(tabs)/light_meter/formsheet?mode=scene` until Task 6 adds the button): opens at EV 15 / f/16 / 1/125 / ISO 100 with no pill; sliding to EV 12 moves the shutter to 1/15; lock shutter, slide to EV 10 moves aperture; gear toggle re-snaps shutter; EV 17 at ISO 25600 clamps and shows the pill; Save to Frame → New Frame opens with no image; dark mode; Japanese.
- [ ] **Step 5: Commit** `feat(planner): scene mode on the reading sheet with the EV scene card`.

### Task 5: iOS route opens at the scene detent

**Files:**
- Modify: `app/(tabs)/light_meter/_layout.tsx` (Stack.Screen `formsheet`, lines 24–42)

- [ ] **Step 1: Change** `options={{…}}` to `options={({ route }) => { const scene = (route.params as { mode?: string } | undefined)?.mode === 'scene'; return { …existing, sheetAllowedDetents: [scene ? 0.62 : 0.45] }; }}`.
- [ ] **Step 2: Manual check**: the deep link from Task 4 opens at the tall detent with no grow after mount; a camera reading still opens at 0.45.
- [ ] **Step 3: Commit** `feat(planner): scene sheet opens at its own detent`.

### Task 6: Entry points on the light meter screen

**Files:**
- Modify: `app/(tabs)/light_meter/index.tsx`:
  - `handleFormSheetOpen` area (473–565): add `openPlanner()`
  - shutter button block (703–761): wrap in a row with the round button
  - permission branch (578–629) and no-device branch (631–648): add the pill
  - Android `BottomSheet` block (763–790): extract to `renderAndroidSheet()` and render it in all three branches

**Interfaces:**
- Consumes: Task 2 keys, `mode: 'scene'` param from Task 4.

- [ ] **Step 1: `openPlanner`**: `if (loading) return; Haptics.impactAsync(Light); if (isAndroid) { setAndroidSheetDetent(0.70); setReading({ mode: 'scene' }); } else { router.push({ pathname: '/(tabs)/light_meter/formsheet', params: { mode: 'scene' } }); }`.
- [ ] **Step 2: Round button** 56 pt (60 Android), `GlassView` with the same glass/fallback/shadow props as the pill, glyph `sun.haze.fill` / `wb-twilight` 22 pt in `lightMeterColors.label`, `accessibilityLabel={t('lightMeter.planner.title')}`; row `flexDirection: 'row', gap: 12, alignItems: 'center'` inside the existing `Animated.View`; adjust the `translateX` output range so the row stays centred at 90/270.
- [ ] **Step 3: Pills** on the permission and no-device screens: same neutral glass style as the shutter pill, glyph + `t('lightMeter.planner.open')`, `marginTop: 20`, placed after the existing buttons / message.
- [ ] **Step 4: Android sheet everywhere**: `renderAndroidSheet()` returns the existing `BottomSheet` JSX when `isAndroid && reading`; call it in all three returns. `shouldFreezeCameraPreview` already checks `reading?.image`, so a scene sheet does not freeze the preview.
- [ ] **Step 5: Verify** `npx tsc --noEmit`. Manual: Duo simulator (no device → pill opens planner); phone (round button beside the pill, portrait and landscape; a reading still works).
- [ ] **Step 6: Commit** `feat(planner): open the exposure planner from the light meter screen`.

### Task 7: Release bookkeeping

**Files:**
- Modify: `app.json` (`version` → `2.4.0`), `services/whatsNew.ts` (new first entry), `tests/whats-new/test-whats-new.mjs` (newest-version assertion → `2.4.0`), `i18n/locales/{en,ja,ko}.json` (`whatsNew.releases.2_4_0.planner.title/body`), `CHANGELOG.md` (2.4.0 entry).

- [ ] **Step 1: Update** the test assertion to `2.4.0`, run `npm run test:unit` → fails on `WHATS_NEW`.
- [ ] **Step 2: Add** the entry `{ version: '2.4.0', items: [{ sf: 'sun.haze.fill', md: 'wb-twilight', titleKey: 'whatsNew.releases.2_4_0.planner.title', bodyKey: 'whatsNew.releases.2_4_0.planner.body' }] }`, strings in three languages, version bump, changelog entry.
- [ ] **Step 3: Run** `npm run test:unit` → all pass; `npx tsc --noEmit`.
- [ ] **Step 4: Commit** `chore: version 2.4.0, What's New entry for the exposure planner`.

### Task 8: Whole-feature check

- [ ] **Step 1:** Fresh install on the iPhone Duo simulator; walk the Review Focus list; take screenshots of the planner in light and dark for the user.
- [ ] **Step 2:** `npm run test:unit`, `npx tsc --noEmit`, `npx expo lint` with no new problems relative to `main`.
