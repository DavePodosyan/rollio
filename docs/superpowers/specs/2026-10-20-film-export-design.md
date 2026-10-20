# Film Export (PDF contact sheet and CSV) — Design

Date: 2026-10-20
Status: approved in chat (mockup direction "Outline" chosen)

## Intent

Let a user export a single film from its detail screen in two formats:

- a **PDF contact sheet** that looks exceptionally good, prints cheaply, and
  files well next to the negatives or AirDrops to a friend;
- a **CSV** with one row per frame for spreadsheets, exiftool and Lightroom.

The user's stated requirements: PDF quality is the one hard requirement;
pages must be print-friendly (white, little ink); frame numbers must align
across a row; long notes must never be a problem.

## Goals

- One tap from the film detail screen, then the system share sheet.
- PDF renders identically on every export: embedded Lufga fonts, A4 portrait,
  works offline, no external resources.
- Notes of any length appear in full.
- Pure, unit-tested document builders (HTML and CSV) separated from the
  native glue (fonts, thumbnails, print, share).

## Non-goals

- Exporting all films at once (may come later from Settings).
- Writing EXIF into scanned files.
- JSON or plain-text export (backup covers JSON).
- Page numbers in the PDF (the print engine paginates after the fact and
  exposes no per-page counter to HTML; see "Builder's calls").
- Android HEIC thumbnails beyond what expo-image-manipulator already handles.

## Anti-goals

- A black page. Ink matters; the darkroom feel comes from structure, not fill.
- Truncated or clipped notes.
- Thumbnails that depend on `file://` URLs resolving inside the print web view.

## Constraints

- Expo SDK 58, React Native 0.88, new architecture. Libraries:
  `expo-print` (~58.x) for HTML → PDF, `expo-image-manipulator` (~58.x) for
  thumbnails, `expo-asset` for the font files, `expo-sharing` (already used
  by backup) for the share sheet, `expo-file-system` `File`/`Directory`/
  `Paths` API (async `copy`/`move`/`write`, sync `create`/`delete`/`list`).
- Tests run under Node 26 with the existing `tests/db/harness.mjs` style
  (`module.registerHooks` resolving `@/`, strip-only TypeScript: no enums,
  no parameter properties, no `@/i18n` imports in pure modules).
- All user-facing strings go through react-i18next with `en`, `ja`, `ko`
  entries. Persisted sentinel values (`'Auto'`, film status enum values) are
  never shown raw; use `getAutoValueLabel()` and `getFilmStatusLabel()`.
- Aperture and shutter display formats are the app's existing
  `cameraSettings.apertureFormat` ("f/{{value}}") and
  `cameraSettings.shutterSpeedFormat` ("{{value}}s").

## The PDF: layout as approved

Reference mockup: `.superpowers/brainstorm/26807-1792503982/content/contact-sheet-light.html`,
option **2 · Outline** (git-ignored; the description below is authoritative).

### Page

- A4 portrait, 595 × 842 pt: pass `width: 595, height: 842` to
  `printToFileAsync` on both platforms (Android sizes and paginates from
  these options, not from CSS). Margins 36 pt on all sides.
  - iOS: pass `margins` to `printToFileAsync` (it insets the print formatter).
  - Android: `margins` is ignored; emit `@page { margin: 36pt }` in the CSS
    instead. Emit the `@page` rule only on Android so iOS does not double up.
- White background, no page border.
- Fonts: Lufga Regular (400) and Lufga Medium (500) embedded as base64
  `@font-face` data URIs, read from the bundled `assets/fonts/*.ttf` via
  expo-asset. Body stack: `Lufga, -apple-system, "Hiragino Sans", "Apple SD
  Gothic Neo", "Noto Sans CJK JP", "Noto Sans KR", sans-serif`. Lufga has
  no CJK glyphs, so Japanese and Korean titles, notes and status labels fall
  back to the system face; that is accepted. Numbers and settings use a
  monospace stack: `Menlo, "SF Mono", "Roboto Mono", monospace`,
  `font-variant-numeric: tabular-nums`.
- Colours: text `#100528`; secondary `#6B6877`; hairlines `#D9D7E2`;
  sprocket marks `#E6E4EE`; amber frame marker `#C8901F`; empty tile
  background `#FAFAFC`, border dashed `#D9D7E2`, glyph `#B9B6C6`.

### Header (first page only; the document flows after it)

- Title: film title, Lufga Medium, 22 pt, letter-spacing −0.02em, `#100528`.
- Sub line, 8.5 pt, `#6B6877`, parts joined with ` · `, each omitted when
  absent: camera; `ISO 400`; push/pull using the existing
  `rollDetail.pushPull.push` / `.pull` strings (omitted when 0); `36 exp`
  (`expected_shots`, localized unit); shot date range.
- Shot date range: earliest to latest frame `created_at`; a single date when
  both are the same day; the film's `created_at` when there are no frames.
  Formatted with `Intl.DateTimeFormat` in the current app language, `{ day:
  'numeric', month: 'short', year: 'numeric' }`; the range elides the shared
  month/year where the formatter's `formatRange` supports it, otherwise two
  full dates joined with `–`.
- Right-aligned status chip: `getFilmStatusLabel(status)` uppercased, 7.5 pt
  monospace, letter-spacing 0.1em, 1 pt border `#100528`, 4 × 7 pt padding,
  2 pt radius. No roll number (film ids mean nothing to users).

### Strips

- Frames sorted by `frame_no` ascending, four per strip. A final partial
  strip keeps four cells; unused cells are blank (no number, no tile).
- Strip: 1 pt hairline top and bottom in `#D9D7E2`; a 6 pt sprocket band
  inside each hairline drawn with
  `repeating-linear-gradient(90deg, transparent 0 7px, #E6E4EE 7px 13px,
  transparent 13px 19px)`; 9 pt vertical padding; 18 pt gap between strips.
- Row: 4 equal columns, 8 pt gap, 9 pt horizontal padding.
- Cell, top to bottom:
  1. Edge row, fixed height 11 pt: amber triangle (CSS border triangle,
     4 pt wide) then the frame number zero-padded to two digits, monospace
     7.5 pt, letter-spacing 0.12em, `#100528`. Fixed height is what keeps
     every number in a row on one baseline; nothing may be absolutely
     positioned here.
  2. Thumbnail: 3:2 box, `object-fit: cover`, `filter: grayscale(1)
     contrast(1.06)`, 1 pt radius. When the frame has no usable image: a
     dashed tile of the same size showing `—` centred.
  3. Caption, monospace 7.5 pt, `#6B6877`, parts joined with ` · `:
     aperture (`cameraSettings.apertureFormat` or the Auto label), shutter
     (`cameraSettings.shutterSpeedFormat` or the Auto label), lens when set.
- Frame numbers above 99 are shown as-is (three digits); the zero-pad is to
  a minimum of two.

### Notes

- Notes are rendered **directly under the strip they belong to**, not at the
  bottom of the page. Each strip and its notes block form one unit with
  `break-inside: avoid`; a unit taller than a page is allowed to break
  (the engine handles it). This is what makes long notes safe: nothing is
  sized to a page.
- Notes block: 10 pt top margin, one entry per frame with a non-empty note,
  in frame order. Entry: amber monospace zero-padded number, then the note
  in Lufga Regular 8.5 pt, `#4A4858`, line-height 1.6, hanging indent so
  wrapped lines align under the text, not the number. Line breaks in the
  note are preserved (`white-space: pre-wrap`). Text is HTML-escaped.
- Strips whose four frames have no notes get no notes block.

### Footer

- After the last strip, 24 pt above: a single 7.5 pt line, `#8E8E93`,
  uppercase, letter-spacing 0.1em, left `Rollio · N frames` (localized plural),
  right `Exported 20 Oct 2026` (localized, same date format). It flows with
  the content; it is not pinned to the page bottom.

### Empty film

A film with no frames still exports: header, then a single centred line
`No frames logged yet` (localized) in `#8E8E93`, then the footer.

### Thumbnails

- For each frame with an `image`, resolve the path under the app's photo
  folder (same resolution the app uses for display). Resize with
  expo-image-manipulator to 480 px wide, JPEG, compress 0.7, `base64: true`,
  and embed as `data:image/jpeg;base64,…`.
- A missing or unreadable file produces the empty tile; it never fails the
  export.
- Thumbnails are produced sequentially (not `Promise.all`) to bound memory on
  long rolls.

## CSV

- Encoding UTF-8 with BOM, CRLF line endings, RFC 4180 quoting (quote a field
  when it contains `"`, `,`, CR or LF; double embedded quotes).
- Header row and columns, in order (English, stable, machine-readable; not
  localized):
  `Film,Camera,ISO,Push/Pull,Status,Frame,Date,Aperture,Shutter,Lens,Note`
- One row per frame sorted by `frame_no`. Film columns repeat on every row so
  several rolls can be concatenated in a spreadsheet.
- Values are raw: aperture `2` (not `f/2`), shutter `1/250`, `Auto` as the
  literal `Auto`, push/pull as a signed number (`0`, `1`, `-0.5`), status as
  the persisted enum value, date as the frame's `created_at` ISO 8601 string,
  empty string for null camera/lens/note.
- A film with no frames produces a header row only.

## File names and sharing

- `exportFileName(title, suffix, ext)`: trim the title, replace `/ \ : * ? "
  < > |` and control characters with a space, collapse runs of spaces, cut to
  60 characters, fall back to `Film` when empty. PDF: `<title> – Contact
  Sheet.pdf`; CSV: `<title>.csv`. (The suffix is not localized.)
- Output goes to a fresh `Paths.cache/export-<timestamp>/` directory. The
  PDF from `printToFileAsync` is moved there under its final name; the CSV is
  written there directly.
- Share with expo-sharing: PDF `{ UTI: 'com.adobe.pdf', mimeType:
  'application/pdf' }`, CSV `{ UTI: 'public.comma-separated-values-text',
  mimeType: 'text/csv' }`, `dialogTitle` = the file name.
- `export-*` directories are swept on the next launch by the existing
  cache sweep (`cleanupStaleArchives` in `services/backup.ts` gains the
  prefix; the receiving app may still be reading the file right after the
  share sheet closes, so nothing is deleted immediately).

## UI

- Film detail screen (`app/(tabs)/films/[id].tsx`).
  - iOS: the existing ellipsis toolbar menu gains two actions between Edit
    and Delete: `Export PDF…` (icon `doc.richtext`) and `Export CSV…` (icon
    `tablecells`).
  - Android: `Alert.alert` shows at most three buttons, and the existing
    menu (`handleAndroidMenuPress`) already uses three. It becomes Edit /
    `Export…` / Delete with `{ cancelable: true }` (tap outside dismisses);
    `Export…` opens a second Alert with `Export PDF…` / `Export CSV…` /
    Cancel. New key `export.menu` (`Export…`).
- While an export runs, a translucent full-screen overlay with an
  `ActivityIndicator` and the text `Preparing PDF…` / `Preparing CSV…`
  blocks interaction; a second tap is ignored (ref-guarded like
  `useBackup`). The overlay disappears when the share sheet appears or the
  export fails.
- Failure: `Alert.alert(t('shared.error'), t('export.errorMessage'))`. A
  dismissed share sheet is not an error.
- New i18n keys (en/ja/ko): `export.pdf`, `export.csv`, `export.preparingPdf`,
  `export.preparingCsv`, `export.errorMessage`, `export.sheet.iso`
  (`ISO {{iso}}`), `export.sheet.exposures` (`{{count}} exp`),
  `export.sheet.noPhoto` (`—`), `export.sheet.noFrames`, `export.sheet.frames`
  (plural `_one`/`_other`; ja/ko `_other` only), `export.sheet.exportedOn`
  (`Exported {{date}}`).

## Architecture

```
services/exportHtml.ts    pure: buildContactSheetHtml(input) → string
services/exportCsv.ts     pure: buildFilmCsv(film, frames) → string, exportFileName()
services/exportFilm.ts    native glue: fonts, thumbnails, print, write, share
hooks/useFilmExport.ts    busy state, alerts; used by the detail screen
tests/export/             node tests for the two pure modules
```

`buildContactSheetHtml` takes everything already resolved so it has no
platform imports: the film, the frames each with an optional `thumbnail`
data URI, pre-translated `labels`, the formatted date strings, the two font
base64 strings, and a `platform: 'ios' | 'android'` flag for the `@page`
rule. It returns the full HTML document. The glue module does the resolving.

Tests assert on the HTML structure (one strip per four frames, zero-padded
numbers in order, escaped notes under the right strip, empty tile for
missing thumbnails, no `@page` on iOS, `@page` on Android, header parts
omitted when absent, empty-film message) and on exact CSV output for a
small fixture including quotes, commas, newlines and nulls.

## Builder's calls (made by the author, not discussed with the user)

- Notes live under each strip rather than at the page bottom, so the layout
  never has to know page boundaries. Cost if wrong: the page looks less like
  the mockup when notes are short; the user accepted "long notes must not be
  a problem" as the priority.
- No page numbers, because neither print engine exposes them to HTML. Cost
  if wrong: a multi-page sheet has no "2 of 3"; the footer's frame count
  partially compensates.
- Thumbnails are black-and-white (as in the approved mockup). If the CSS
  filter does not survive the print engine on either platform, the fallback
  is colour thumbnails, not a failed export.
- CSV headers and the file-name suffix are English and not localized, to
  keep the files machine-friendly.
- A busy overlay rather than a toolbar spinner, because the native toolbar
  offers no spinner slot.
- Android is best-effort for this feature: the code paths exist (page size,
  `@page` margins, two-level Alert menu) but verification is iOS-only. Cost
  if wrong: Android pagination, `break-inside`, or the grayscale filter may
  differ and would be found by an Android user, not by this work.
- CJK text falls back to system fonts in the PDF (see Fonts).

## Verification

- Node tests for both pure builders.
- Debug build on the iPhone 18 Pro simulator: export a seeded film with 14
  frames, several without photos, one with a 600-character multi-line note,
  one with `Auto` values; pull the PDF from the app container, rasterize
  the pages, and check header, alignment, grayscale, notes, footer, and
  page breaks. Export a film with no frames. Export the CSV and diff against
  the expected fixture.
- Release build on the user's iPhone for a real roll.
