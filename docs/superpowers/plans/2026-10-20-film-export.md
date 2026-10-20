# Film Export (PDF contact sheet and CSV) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Export one film from its detail screen as a print-quality A4 PDF contact sheet or a CSV, through the system share sheet.

**Architecture:** Two pure builders (`services/exportCsv.ts`, `services/exportHtml.ts`) produce the documents from plain data and are unit-tested under Node. A glue module (`services/exportFilm.ts`) resolves fonts, thumbnails, translations and dates, renders the HTML with expo-print, writes files into a per-export cache directory and shares them. A hook (`hooks/useFilmExport.ts`) owns busy state and alerts; the film detail screen adds menu entries and a busy overlay.

**Tech Stack:** Expo SDK 58 (expo-print, expo-image-manipulator, expo-asset, expo-sharing, expo-file-system File/Directory/Paths), react-i18next, Node 26 test harness in `tests/db/harness.mjs`.

**Spec:** `docs/superpowers/specs/2026-10-20-film-export-design.md`

## Global Constraints

- Node tests use strip-only TypeScript: no enums, no parameter properties, no `@/i18n` import in pure modules. Pure modules may `import type` from `@/types` only.
- expo-file-system 58: `copy`, `move`, `write`, `text`, `base64` are async and must be awaited; `create`, `delete`, `list`, `exists` are sync. Use fresh `File`/`Directory` instances per operation.
- Every user-facing string is an i18n key with `en`, `ja`, `ko` entries. Plural keys: `_one`/`_other` in `en`, `_other` only in `ja`/`ko`.
- Raw sentinel values are never shown: `'Auto'` → `getAutoValueLabel()`, status → `getFilmStatusLabel()`.
- Aperture/shutter display: `t('cameraSettings.apertureFormat', { value })`, `t('cameraSettings.shutterSpeedFormat', { value })`.
- PDF page: `width: 595, height: 842` on both platforms; iOS `margins: { top: 36, right: 36, bottom: 36, left: 36 }`; Android `@page { margin: 36pt }` emitted in CSS only when `platform === 'android'`.
- Colours and sizes exactly as the spec's "The PDF: layout as approved" section.
- CSV: UTF-8 BOM, CRLF, RFC 4180 quoting, header `Film,Camera,ISO,Push/Pull,Status,Frame,Date,Aperture,Shutter,Lens,Note`.
- Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Android is best-effort: code paths exist, verification is iOS only.

## Review Focus

1. A frame whose `image` points to a file that no longer exists on disk: the export must succeed with an empty tile, never fail. (Task 3 `makeThumbnail` returns `null`; simulator check in Task 4 includes such a frame.)
2. A title or note containing `<`, `&`, `"` or `'`: rendered as text, never as markup. (Task 2 test `escapes html in title and notes`.)
3. A 600-character note with line breaks: present in full under the right strip, with `white-space: pre-wrap`. (Task 2 test `keeps long multi-line notes in full`; simulator check in Task 4.)
4. Frame numbers of 100 or more and unsorted input: sorted ascending, three digits shown as-is, two-digit padding otherwise. (Task 2 test `sorts frames and pads numbers`; Task 1 test `sorts rows by frame number`.)
5. Share sheet dismissed by the user: no error alert, overlay cleared. (Task 4: `shareAsync` resolving is success; the overlay is cleared in `finally`; simulator check cancels the share sheet.)

---

### Task 1: CSV builder and file names

**Files:**
- Create: `services/exportCsv.ts`
- Create: `tests/export/test-csv.mjs`
- Modify: `package.json` (scripts)

**Interfaces:**
- Consumes: `Film`, `Frame` from `@/types` (type-only).
- Produces:
  - `buildFilmCsv(film: Film, frames: Frame[]): string`
  - `exportFileName(title: string, suffix: string | null, ext: string): string` → `"<clean title> – <suffix>.<ext>"` or `"<clean title>.<ext>"` when suffix is null.
  - `CSV_BOM = '﻿'`.

- [ ] **Step 1: Write the failing tests**

`tests/export/test-csv.mjs` starts with `import '../db/harness.mjs';` (registers the `@/` resolver) and uses `node:assert/strict`. Fixture film: `{ id: 1, title: 'Portra 400, "Trip"', iso: 400, camera: 'Leica M6', status: 'archived', expected_shots: 36, push_pull: 1, frame_count: 3, created_at: '2026-10-12T08:00:00.000Z', completed_at: null }`. Frames (given out of order): frame_no 2 `{ aperture: '2.8', shutter_speed: '1/500', lens: null, note: 'line one\nline two', image: null, created_at: '2026-10-12T09:00:00.000Z' }`, frame_no 1 `{ aperture: 'Auto', shutter_speed: 'Auto', lens: '50mm', note: null, ... '2026-10-12T08:30:00.000Z' }`, frame_no 3 `{ aperture: '4', shutter_speed: '1/125', lens: '35mm', note: 'said "hi"', ... }`.

Tests:
- `builds exact csv`: `buildFilmCsv(film, frames)` equals
  `'﻿' + 'Film,Camera,ISO,Push/Pull,Status,Frame,Date,Aperture,Shutter,Lens,Note\r\n' + '"Portra 400, ""Trip""",Leica M6,400,1,archived,1,2026-10-12T08:30:00.000Z,Auto,Auto,50mm,\r\n' + '"Portra 400, ""Trip""",Leica M6,400,1,archived,2,2026-10-12T09:00:00.000Z,2.8,1/500,,"line one\nline two"\r\n' + '"Portra 400, ""Trip""",Leica M6,400,1,archived,3,2026-10-12T10:00:00.000Z,4,1/125,35mm,"said ""hi"""\r\n'`
- `sorts rows by frame number` (covered by the exact test; keep as a separate assertion on the order of `Frame` column values `['1','2','3']`).
- `empty film is header only`: `buildFilmCsv({ ...film, camera: null }, [])` equals `'﻿' + header + '\r\n'`.
- `null camera is an empty field`: row contains `,,400,` for a film with `camera: null`.
- `negative push pull`: `push_pull: -0.5` → field `-0.5`.
- `exportFileName sanitizes`: `exportFileName(' My/Roll: "B&W"? ', 'Contact Sheet', 'pdf')` equals `'My Roll B&W – Contact Sheet.pdf'`; `exportFileName('', null, 'csv')` equals `'Film.csv'`; a 90-character title is cut to 60 characters before the suffix; `exportFileName('Tab\there', null, 'csv')` equals `'Tab here.csv'`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --no-warnings tests/export/test-csv.mjs`
Expected: FAIL, module `services/exportCsv.ts` not found.

- [ ] **Step 3: Implement `services/exportCsv.ts`**

`buildFilmCsv`: sort a copy of `frames` by `frame_no` ascending; one quoted-when-needed field per column; `null`/`undefined` → empty string; numbers via `String()`. `exportFileName`: trim, replace `/[\\/:*?"<>|\u0000-\u001F]/g` with a space, collapse whitespace, slice to 60, trim again, fallback `'Film'`; join with `' – '` (en dash) when suffix is set.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --no-warnings tests/export/test-csv.mjs`
Expected: PASS, exits 0 with no output other than `ok`.

- [ ] **Step 5: Add test scripts and commit**

In `package.json` scripts add `"test:export": "for f in tests/export/test-*.mjs; do node --no-warnings \"$f\" || exit 1; done"` and `"test:unit": "npm run test:db && npm run test:export"`.

```bash
git add services/exportCsv.ts tests/export/test-csv.mjs package.json
git commit -m "feat(export): CSV builder and export file names"
```

### Task 2: Contact sheet HTML builder

**Files:**
- Create: `services/exportHtml.ts`
- Create: `tests/export/test-html.mjs`

**Interfaces:**
- Consumes: `Film`, `Frame` from `@/types` (type-only).
- Produces:
  ```ts
  export type SheetFrame = Frame & { thumbnail: string | null };   // data URI or null
  export type SheetLabels = {
      iso: string;               // "ISO 400", already interpolated
      exposures: string;         // "36 exp"
      pushPull: string | null;   // "Push +1" / null when 0
      status: string;            // "Archived"
      aperture: (value: string) => string;  // applies format or Auto label
      shutter: (value: string) => string;
      noPhoto: string;           // "—"
      noFrames: string;          // "No frames logged yet"
      framesCount: string;       // "12 frames"
      exportedOn: string;        // "Exported 20 Oct 2026"
  };
  export type ContactSheetInput = {
      film: Film; frames: SheetFrame[]; labels: SheetLabels;
      shotDates: string;          // formatted range or single date
      fonts: { regular: string; medium: string };  // base64 TTF
      platform: 'ios' | 'android';
  };
  export const FRAMES_PER_STRIP = 4;
  export const buildContactSheetHtml = (input: ContactSheetInput): string;
  export const formatShotDates = (frames: Pick<Frame, 'created_at'>[], film: Pick<Film, 'created_at'>, locale: string): string;
  export const escapeHtml = (text: string): string;
  ```

- [ ] **Step 1: Write the failing tests**

`tests/export/test-html.mjs`, `import '../db/harness.mjs'`, `node:assert/strict`. Helper `makeInput(frames, overrides)` with film `{ id: 1, title: 'Kodak <Portra> & Co', iso: 400, camera: 'Leica M6', status: 'archived', expected_shots: 36, push_pull: 1, frame_count: frames.length, created_at: '2026-10-12T08:00:00.000Z' }`, labels with `iso: 'ISO 400'`, `exposures: '36 exp'`, `pushPull: 'Push +1'`, `status: 'Archived'`, `aperture: v => v === 'Auto' ? 'Auto' : 'f/' + v`, `shutter: v => v === 'Auto' ? 'Auto' : v + 's'`, `noPhoto: '—'`, `noFrames: 'No frames logged yet'`, `framesCount: frames.length + ' frames'`, `exportedOn: 'Exported 20 Oct 2026'`, `shotDates: '12–19 Oct 2026'`, `fonts: { regular: 'AAAA', medium: 'BBBB' }`, `platform: 'ios'`. Frame factory `frame(no, extra)` with `aperture: '2'`, `shutter_speed: '1/250'`, `lens: '50mm'`, `note: null`, `thumbnail: null`, `image: null`.

Count helpers: `count(html, re)` = number of regex matches.

Tests:
- `one strip per four frames`: 9 frames → `count(html, /class="strip"/g) === 3`; 8 frames → 2; 0 frames → 0.
- `sorts frames and pads numbers`: frames given as `[frame(3), frame(100), frame(1)]` → the edge-row numbers in document order are `['01', '03', '100']` (regex `/class="edge">(\d+)</g`).
- `partial strip keeps four cells`: 5 frames → `count(html, /class="cell/g) === 8` and `count(html, /class="cell empty-cell"/g) === 3`.
- `thumbnail or empty tile`: frame with `thumbnail: 'data:image/jpeg;base64,xyz'` → html contains `<img class="photo" src="data:image/jpeg;base64,xyz"`; frame without → contains `<div class="tile">—</div>`; a frame with `image: 'frames/x.jpg'` but `thumbnail: null` still gets the tile.
- `caption uses labels`: frame `{ aperture: 'Auto', shutter_speed: '1/60', lens: null }` → caption text is exactly `Auto · 1/60s`; frame `{ aperture: '2.8', shutter_speed: '1/500', lens: '35mm' }` → `f/2.8 · 1/500s · 35mm`.
- `notes sit under their strip`: 5 frames, note on frame 5 (`'Tripod'`) and frame 1 (`'Haze'`) → html has two `class="notes"` blocks; the first strip's notes block contains `Haze` and not `Tripod`; the second contains `Tripod`; a strip with no notes has no `class="notes"` block (4 frames with no notes → `count === 0`).
- `keeps long multi-line notes in full`: a 600-character note built as `'word '.repeat(100).trim() + '\nsecond line\nthird line'` → the escaped text appears verbatim in the html and the CSS contains `white-space: pre-wrap`.
- `escapes html in title and notes`: title renders as `Kodak &lt;Portra&gt; &amp; Co`; a note `'<b>"x"</b>'` renders as `&lt;b&gt;&quot;x&quot;&lt;/b&gt;`; the html contains no `<b>`.
- `header parts omit absent values`: with `camera: null` and `labels.pushPull: null` the sub line equals `ISO 400 · 36 exp · 12–19 Oct 2026` (regex `/class="sub">([^<]+)</`).
- `status chip`: html contains `class="chip">ARCHIVED<` (builder uppercases).
- `fonts embedded`: contains `url(data:font/truetype;base64,AAAA)` and `url(data:font/truetype;base64,BBBB)`.
- `page rule only on android`: `platform: 'ios'` → html does not contain `@page`; `platform: 'android'` → contains `@page { margin: 36pt }`.
- `empty film`: 0 frames → contains `class="no-frames">No frames logged yet<` and no `class="strip"`.
- `footer`: contains `9 frames` and `Exported 20 Oct 2026` inside `class="foot"`.
- `formatShotDates`: with `locale 'en-US'`: frames on `2026-10-12T08:00:00Z` and `2026-10-19T08:00:00Z` → result contains `12` and `19` and `2026` and is not two full identical dates; two frames on the same day → equals `new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date('2026-10-12T08:00:00Z'))`; no frames → the film's `created_at` formatted the same way.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --no-warnings tests/export/test-html.mjs`
Expected: FAIL, module `services/exportHtml.ts` not found.

- [ ] **Step 3: Implement `services/exportHtml.ts`**

Template-literal HTML with the CSS from the spec (values verbatim: colours, 36 pt margins via `@page` on Android only, 595 pt page width is implied by the engine, body `margin: 0`). Structure:

```
<header> h1.title · div.sub · span.chip
(strips) section.unit > div.strip > div.row > div.cell ×4
         each cell: div.edge (triangle + number) · img.photo | div.tile · div.cap
         then div.notes (only if any note) > div.note > span.n + span.text
div.no-frames (only when no frames)
div.foot > span (framesCount) · span (exportedOn)
```

`.unit { break-inside: avoid; page-break-inside: avoid; }`, `.cell.empty-cell` renders nothing inside. Numbers padded with `String(n).padStart(2, '0')`. `formatShotDates`: compute min/max `created_at`; same calendar day (compare the formatted strings) → single date; otherwise `fmt.formatRange(min, max)` when `typeof fmt.formatRange === 'function'`, else `${fmt.format(min)} – ${fmt.format(max)}`; no frames → format `film.created_at`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:export`
Expected: both files PASS, exit 0.

- [ ] **Step 5: Commit**

```bash
git add services/exportHtml.ts tests/export/test-html.mjs
git commit -m "feat(export): contact sheet HTML builder"
```

### Task 3: Native glue: fonts, thumbnails, print, write, share

**Files:**
- Create: `services/exportFilm.ts`
- Modify: `services/backup.ts` (`cleanupStaleArchives`, add exported predicate)
- Modify: `i18n/locales/en.json`, `ja.json`, `ko.json`
- Modify: `package.json` via `npx expo install expo-asset`
- Test: `tests/db/test-backup-cleanup.mjs`

**Interfaces:**
- Consumes: `buildContactSheetHtml`, `formatShotDates`, `SheetFrame`, `SheetLabels` (Task 2); `buildFilmCsv`, `exportFileName`, `CSV_BOM` (Task 1); `getAutoValueLabel`, `getFilmStatusLabel`; `i18n` default export from `@/i18n` (`i18n.t`, `i18n.language`).
- Produces:
  - In `services/backup.ts`: `export const EXPORT_PREFIX = 'export-';`
  - `exportFilmPdf(film: Film, frames: Frame[]): Promise<void>` — builds, writes `<title> – Contact Sheet.pdf`, shares.
  - `exportFilmCsv(film: Film, frames: Frame[]): Promise<void>` — writes `<title>.csv`, shares.
  - `makeThumbnail(frame: Frame): Promise<string | null>` — exported for clarity, returns a `data:image/jpeg;base64,` URI or `null`.
  - In `services/backup.ts`: `export const isStaleCacheEntry = (name: string, isDirectory: boolean): boolean` used by `cleanupStaleArchives`.

- [ ] **Step 1: Write the failing test for the cache sweep predicate**

`tests/db/test-backup-cleanup.mjs` (harness already stubs expo-file-system and expo-sqlite; `services/backup.ts` also imports `expo-sqlite/kv-store`, `react-native-zip-archive`, `expo-sharing`, `expo-application` or similar — extend `tests/db/harness.mjs` so any specifier in the set `['expo-sqlite/kv-store', 'react-native-zip-archive', 'expo-sharing', 'expo-constants', 'expo-application', 'react-native']` resolves to `stub-empty.mjs`; check the actual import list at the top of `services/backup.ts` and stub exactly those). Assertions:
- `isStaleCacheEntry('export-1760000000', true) === true`
- `isStaleCacheEntry('backup-1', true) === true`, `isStaleCacheEntry('restore-1', true) === true`
- `isStaleCacheEntry('Rollio Backup.rollio', false) === true`, `isStaleCacheEntry('restore-input-1.zip', false) === true`
- `isStaleCacheEntry('export-1', false) === false` (a file with that prefix is not ours)
- `isStaleCacheEntry('frames', true) === false`, `isStaleCacheEntry('rollio.db', false) === false`

- [ ] **Step 2: Run it to verify it fails**

Run: `node --no-warnings tests/db/test-backup-cleanup.mjs`
Expected: FAIL, `isStaleCacheEntry` is not exported (or a stub resolution error that you fix in the harness first, then this failure).

- [ ] **Step 3: Implement `isStaleCacheEntry` and use it**

`services/exportFilm.ts` calls `cleanupStaleArchives()` from `backup.ts`, so to avoid an import cycle `EXPORT_PREFIX` is defined and exported in `services/backup.ts` next to the other prefixes, and `exportFilm.ts` imports it from there. `cleanupStaleArchives` loops `Paths.cache.list()` and deletes entries where `isStaleCacheEntry(entry.name, entry instanceof Directory)`.

- [ ] **Step 4: Run the db tests**

Run: `npm run test:db`
Expected: all files PASS including the new one.

- [ ] **Step 5: Add i18n keys**

`en.json`, new top-level `"export"` block after `"settings"`:
```json
"export": {
  "menu": "Export…",
  "pdf": "Export PDF…",
  "csv": "Export CSV…",
  "preparingPdf": "Preparing PDF…",
  "preparingCsv": "Preparing CSV…",
  "errorMessage": "Could not export this film.",
  "sheet": {
    "iso": "ISO {{iso}}",
    "exposures": "{{count}} exp",
    "noPhoto": "—",
    "noFrames": "No frames logged yet",
    "framesCount_one": "{{count}} frame",
    "framesCount_other": "{{count}} frames",
    "exportedOn": "Exported {{date}}"
  }
}
```
`ja.json`: menu `書き出し…`, pdf `PDFを書き出す…`, csv `CSVを書き出す…`, preparingPdf `PDFを準備中…`, preparingCsv `CSVを準備中…`, errorMessage `このフィルムを書き出せませんでした。`, iso `ISO {{iso}}`, exposures `{{count}}枚撮り`, noPhoto `—`, noFrames `まだコマが記録されていません`, framesCount_other `{{count}}コマ`, exportedOn `書き出し日 {{date}}`.
`ko.json`: menu `내보내기…`, pdf `PDF로 내보내기…`, csv `CSV로 내보내기…`, preparingPdf `PDF 준비 중…`, preparingCsv `CSV 준비 중…`, errorMessage `이 필름을 내보낼 수 없습니다.`, iso `ISO {{iso}}`, exposures `{{count}}장`, noPhoto `—`, noFrames `아직 기록된 프레임이 없습니다`, framesCount_other `프레임 {{count}}개`, exportedOn `내보낸 날짜 {{date}}`.

Run: `node -e "for (const l of ['en','ja','ko']) { const j = require('./i18n/locales/' + l + '.json'); if (!j.export?.sheet?.exportedOn) throw l } console.log('ok')"`
Expected: `ok`.

- [ ] **Step 6: Install expo-asset and implement `services/exportFilm.ts`**

Run: `npx expo install expo-asset` (adds it as a direct dependency at the SDK 58 version).

Implementation decisions the signatures leave open:
- Fonts: `Asset.fromModule(require('../assets/fonts/Lufga-Regular.ttf'))`, `await asset.downloadAsync()`, then `await new File(asset.localUri!).base64()`. Cache the two strings in a module-level promise so repeated exports do not re-read.
- Thumbnail: `const file = new File(Paths.document, frame.image!)`; if `!file.exists` return `null`; `const ctx = ImageManipulator.manipulate(file.uri); ctx.resize({ width: 480 }); const ref = await ctx.renderAsync(); const out = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true }); ref.release(); ctx.release();` return `'data:image/jpeg;base64,' + out.base64`; delete `out.uri` with `new File(out.uri).delete()` in a try; any thrown error → `console.warn` and `null`. Sequential `for` loop over frames.
- Labels from `i18n.t` as in the spec; `pushPull` via `rollDetail.pushPull.push`/`.pull` with `{ stops: Math.abs(push_pull) }` (check how the detail screen formats stops and mirror it), `null` when 0.
- `shotDates = formatShotDates(frames, film, i18n.language)`; `exportedOn = i18n.t('export.sheet.exportedOn', { date: new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date()) })`.
- Print: `Print.printToFileAsync({ html, width: 595, height: 842, base64: false, ...(Platform.OS === 'ios' ? { margins: { top: 36, right: 36, bottom: 36, left: 36 } } : {}) })`.
- Output dir: `new Directory(Paths.cache, EXPORT_PREFIX + Date.now())`, `create()`; PDF: `await new File(result.uri).move(new File(dir, exportFileName(film.title, 'Contact Sheet', 'pdf')))`; CSV: `await new File(dir, exportFileName(film.title, null, 'csv')).write(buildFilmCsv(film, frames))`.
- Share: `Sharing.shareAsync(file.uri, { UTI, mimeType, dialogTitle: file.name })`.
- Run `cleanupStaleArchives()` at the start of each export so old `export-*` dirs do not pile up within one session (it already deletes nothing that is in use: the previous export's share sheet has closed by the time the user taps again).

Type-check: `npx tsc --noEmit -p . 2>&1 | grep -E "exportFilm|backup.ts" ; echo done`
Expected: `done` with no lines above it.

- [ ] **Step 7: Commit**

```bash
git add services/exportFilm.ts services/backup.ts tests/db/harness.mjs tests/db/test-backup-cleanup.mjs i18n/locales package.json package-lock.json
git commit -m "feat(export): render and share the contact sheet PDF and CSV"
```

### Task 4: Hook, menu entries, busy overlay, simulator verification

**Files:**
- Create: `hooks/useFilmExport.ts`
- Create: `components/BusyOverlay.tsx`
- Modify: `app/(tabs)/films/[id].tsx` (menu at ~lines 92–108 and ~303–313; render overlay inside the root `View`)

**Interfaces:**
- Consumes: `exportFilmPdf`, `exportFilmCsv` (Task 3).
- Produces:
  - `useFilmExport(): { busy: 'idle' | 'pdf' | 'csv'; exportPdf: (film: Film, frames: Frame[]) => Promise<void>; exportCsv: (film: Film, frames: Frame[]) => Promise<void> }` — ref-guarded like `useBackup`; on error `Alert.alert(t('shared.error'), t('export.errorMessage'))`; busy reset in `finally`.
  - `BusyOverlay({ visible, label }: { visible: boolean; label: string })` — absolutely positioned full-screen `View` with `backgroundColor: 'rgba(9,9,11,0.45)'`, centred `ActivityIndicator` (white, large) and the label in `LufgaMedium` 15 pt white, `pointerEvents` blocking touches; returns `null` when not visible.

- [ ] **Step 1: Implement the hook and overlay**

No Node test covers React hooks in this repo; the hook is verified on the simulator in Step 3. Keep it a thin mirror of `useBackup`'s `start`/`finish` pattern.

- [ ] **Step 2: Wire the detail screen**

- iOS toolbar menu: after the Edit action add
  `<Stack.Toolbar.MenuAction icon="doc.richtext" onPress={() => film && exportPdf(film, frames)}>{t('export.pdf')}</Stack.Toolbar.MenuAction>` and the CSV one with `icon="tablecells"`, before Delete.
- Android: `handleAndroidMenuPress` buttons become Edit / `t('export.menu')` / Delete, options `{ cancelable: true }`; `t('export.menu')` opens `Alert.alert(t('export.menu'), undefined, [pdf, csv, cancel])`.
- Render `<BusyOverlay visible={exportBusy !== 'idle'} label={exportBusy === 'pdf' ? t('export.preparingPdf') : t('export.preparingCsv')} />` as the last child of the root `View`.

Type-check: `npx tsc --noEmit -p . 2>&1 | grep -E "\[id\]|useFilmExport|BusyOverlay"; echo done`
Expected: `done` only.

- [ ] **Step 3: Verify on the iPhone 18 Pro simulator**

Simulator UDID `D3F14B69-9161-4EA1-81D0-B83AE9656DD8`; Metro is already running on 8081 (do not start another). Build and install the Debug app if the native modules changed (they did: expo-print, expo-image-manipulator, expo-asset):

```bash
npx expo prebuild --clean --platform ios --no-install && (cd ios && pod install)
xcodebuild -workspace ios/Rollio.xcworkspace -scheme Rollio -configuration Debug -destination "id=D3F14B69-9161-4EA1-81D0-B83AE9656DD8" -derivedDataPath ios/build build 2>&1 | tail -3
xcrun simctl install D3F14B69-9161-4EA1-81D0-B83AE9656DD8 ios/build/Build/Products/Debug-iphonesimulator/Rollio.app
```

Seed data: terminate the app, open the container's `Documents/SQLite/rollio.db` (check the actual path with `xcrun simctl get_app_container … data`) with `sqlite3`, insert one film with 14 frames (frames 1–14; frames 3, 7, 12 without image; frame 9 with `image = 'frames/missing.jpg'`; frame 5 with a 600-character three-line note; frame 2 with `Auto`/`Auto`; the rest with real photos copied into `Documents/frames/` from the scratchpad) and one film with no frames.

Drive the export without touching the native menu: add a **temporary** `useEffect` in `[id].tsx` that, when `useLocalSearchParams().verify === 'pdf'`, calls `exportFilmPdf`'s internal render path — simplest is to temporarily export a `renderContactSheetToFile(film, frames): Promise<File>` from `services/exportFilm.ts` (the part before `shareAsync`), copy the result to `Paths.document/'verify.pdf'`, and do the same for CSV to `verify.csv`. Launch with `xcrun simctl openurl … "rollio://films/<id>?verify=pdf"`, pull both files from the container.

Rasterize every PDF page with a Swift script in the scratchpad (PDFKit: `PDFDocument(url:)`, for each page `page.thumbnail(of: CGSize(width: 1190, height: 1684), for: .mediaBox)` written as PNG) and look at each image. Check: header parts, status chip, numbers aligned per row, grayscale thumbnails, empty tiles for 3, 7, 9, 12, the long note in full under strip 2, strip units not split mid-strip, footer, A4 proportions (`mdls -name kMDItemPageWidth`/`sips -g pixelWidth` on the PNGs: 1190 × 1684). Then the empty film. Then diff `verify.csv` against the expected text.

Remove the temporary effect and the temporary export with precise edits (never `git checkout --` a file with wanted changes), confirm `git diff` shows only the intended changes, and run `npm run test:unit`.

Expected: all pages look as specified; CSV matches; `npm run test:unit` exits 0.

- [ ] **Step 4: Commit**

```bash
git add hooks/useFilmExport.ts components/BusyOverlay.tsx 'app/(tabs)/films/[id].tsx'
git commit -m "feat(films): export a film as a PDF contact sheet or CSV"
```

### Task 5: Real-device check

**Files:** none.

- [ ] **Step 1: Release build on the user's iPhone 18 Pro (UDID `00008160-0008541E2E00000A`)**

```bash
xcodebuild -workspace ios/Rollio.xcworkspace -scheme Rollio -configuration Release -destination "id=00008160-0008541E2E00000A" -derivedDataPath ios/build-device DEVELOPMENT_TEAM=P6SVR7BGYZ CODE_SIGN_STYLE=Automatic -allowProvisioningUpdates build 2>&1 | tail -3
xcrun devicectl device install app --device 00008160-0008541E2E00000A ios/build-device/Build/Products/Release-iphoneos/Rollio.app
xcrun devicectl device process launch --terminate-existing --device 00008160-0008541E2E00000A com.davitpodosyan.rollio
```

Expected: build succeeds and the app launches. The user exports a real roll and reports; nothing to commit.
