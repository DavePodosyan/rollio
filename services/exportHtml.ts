import type { Film, Frame } from '@/types';

// Pure HTML builder for the PDF contact sheet. Everything platform-specific
// (fonts, thumbnails, translations, dates) is resolved by the caller so this
// module runs unchanged under Node for tests. Layout per
// docs/superpowers/specs/2026-10-20-film-export-design.md.

export type SheetFrame = Frame & { thumbnail: string | null };

export type SheetLabels = {
    iso: string;
    exposures: string;
    pushPull: string | null;
    status: string;
    aperture: (value: string) => string;
    shutter: (value: string) => string;
    noPhoto: string;
    noFrames: string;
    framesCount: string;
    exportedOn: string;
};

export type ContactSheetInput = {
    film: Film;
    frames: SheetFrame[];
    labels: SheetLabels;
    shotDates: string;
    fonts: { regular: string; medium: string };
    platform: 'ios' | 'android';
};

export const FRAMES_PER_STRIP = 4;

export const escapeHtml = (text: string): string =>
    text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const dateFormatter = (locale: string) =>
    new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' });

/** "12–19 Oct 2026", a single date when all frames share a day, the film's date with no frames. */
export const formatShotDates = (
    frames: Pick<Frame, 'created_at'>[],
    film: Pick<Film, 'created_at'>,
    locale: string
): string => {
    const fmt = dateFormatter(locale);
    if (frames.length === 0) return fmt.format(new Date(film.created_at));
    const times = frames.map((f) => new Date(f.created_at).getTime());
    const start = new Date(Math.min(...times));
    const end = new Date(Math.max(...times));
    const startText = fmt.format(start);
    const endText = fmt.format(end);
    if (startText === endText) return startText;
    const withRange = fmt as Intl.DateTimeFormat & { formatRange?: (a: Date, b: Date) => string };
    if (typeof withRange.formatRange === 'function') {
        try {
            return withRange.formatRange(start, end);
        } catch {
            // Hermes may expose formatRange without full support; fall through.
        }
    }
    return `${startText} – ${endText}`;
};

const css = (fonts: ContactSheetInput['fonts'], platform: ContactSheetInput['platform']) => `
@font-face { font-family: 'Lufga'; font-weight: 400; src: url(data:font/truetype;base64,${fonts.regular}) format('truetype'); }
@font-face { font-family: 'Lufga'; font-weight: 500; src: url(data:font/truetype;base64,${fonts.medium}) format('truetype'); }
${platform === 'android' ? '@page { margin: 36pt }' : ''}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; }
body {
  font-family: Lufga, -apple-system, "Hiragino Sans", "Apple SD Gothic Neo", "Noto Sans CJK JP", "Noto Sans KR", sans-serif;
  color: #100528; font-weight: 400; font-size: 9pt;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.mono { font-family: Menlo, "SF Mono", "Roboto Mono", monospace; font-variant-numeric: tabular-nums; }
.head { display: flex; justify-content: space-between; align-items: flex-end; gap: 12pt; }
.title { font-weight: 500; font-size: 22pt; line-height: 1.1; letter-spacing: -0.02em; margin: 0; }
.sub { font-size: 8.5pt; color: #6B6877; margin-top: 6pt; letter-spacing: 0.04em; }
.chip { font-family: Menlo, "SF Mono", "Roboto Mono", monospace; font-size: 7.5pt; letter-spacing: 0.1em; text-transform: uppercase; border: 1pt solid #100528; padding: 4pt 7pt; border-radius: 2pt; white-space: nowrap; flex-shrink: 0; }
.unit { margin-top: 18pt; break-inside: avoid; page-break-inside: avoid; }
.strip { border-top: 1pt solid #D9D7E2; border-bottom: 1pt solid #D9D7E2; padding: 3pt 0; }
.sprockets { display: flex; justify-content: space-between; height: 6pt; padding: 0 6pt; }
.sprockets i { display: block; width: 6pt; height: 6pt; background: #E6E4EE; }
.row { display: grid; grid-template-columns: repeat(${FRAMES_PER_STRIP}, 1fr); gap: 8pt; padding: 9pt 9pt 6pt; }
.cell { display: flex; flex-direction: column; min-width: 0; }
.edge { height: 11pt; line-height: 11pt; font-family: Menlo, "SF Mono", "Roboto Mono", monospace; font-variant-numeric: tabular-nums; font-size: 7.5pt; letter-spacing: 0.12em; color: #100528; display: flex; align-items: center; }
.edge::before { content: ''; width: 0; height: 0; border-left: 4pt solid #C8901F; border-top: 3pt solid transparent; border-bottom: 3pt solid transparent; margin-right: 4pt; }
.photo { display: block; width: 100%; aspect-ratio: 3 / 2; object-fit: cover; border-radius: 1pt; filter: grayscale(1) contrast(1.06); }
.tile { width: 100%; aspect-ratio: 3 / 2; display: flex; align-items: center; justify-content: center; font-size: 9pt; color: #B9B6C6; background: #FAFAFC; border: 1pt dashed #D9D7E2; border-radius: 1pt; }
.cap { font-family: Menlo, "SF Mono", "Roboto Mono", monospace; font-variant-numeric: tabular-nums; font-size: 7.5pt; color: #6B6877; margin-top: 4pt; letter-spacing: 0.02em; }
.notes { margin-top: 10pt; }
.note { display: flex; align-items: baseline; gap: 6pt; margin-top: 2pt; }
.n { flex-shrink: 0; width: 18pt; font-family: Menlo, "SF Mono", "Roboto Mono", monospace; font-variant-numeric: tabular-nums; font-size: 7.5pt; color: #C8901F; }
.text { flex: 1; min-width: 0; font-size: 8.5pt; color: #4A4858; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; }
.no-frames { text-align: center; color: #8E8E93; margin: 36pt 0 9pt; }
.foot { margin-top: 24pt; display: flex; justify-content: space-between; font-size: 7.5pt; color: #8E8E93; letter-spacing: 0.1em; text-transform: uppercase; }
`;

const padNumber = (n: number) => String(n).padStart(2, '0');

// Sprocket holes are real elements rather than a CSS gradient: WebKit's print
// path rendered the gradient as solid black blocks.
const SPROCKETS_PER_ROW = 28;
const sprockets = `<div class="sprockets">${'<i></i>'.repeat(SPROCKETS_PER_ROW)}</div>`;

const renderCell = (frame: SheetFrame, labels: SheetLabels): string => {
    const caption = [labels.aperture(frame.aperture), labels.shutter(frame.shutter_speed), frame.lens]
        .filter((part): part is string => !!part)
        .map(escapeHtml)
        .join(' · ');
    const picture = frame.thumbnail
        ? `<img class="photo" src="${frame.thumbnail}">`
        : `<div class="tile">${escapeHtml(labels.noPhoto)}</div>`;
    return `<div class="cell"><div class="edge">${padNumber(frame.frame_no)}</div>${picture}<div class="cap">${caption}</div></div>`;
};

const renderUnit = (strip: SheetFrame[], labels: SheetLabels): string => {
    const cells = strip.map((frame) => renderCell(frame, labels));
    while (cells.length < FRAMES_PER_STRIP) cells.push('<div class="cell empty-cell"></div>');
    const notes = strip
        .filter((frame) => frame.note && frame.note.trim().length > 0)
        .map((frame) => `<div class="note"><span class="n">${padNumber(frame.frame_no)}</span><span class="text">${escapeHtml(frame.note as string)}</span></div>`);
    const notesBlock = notes.length ? `<div class="notes">${notes.join('')}</div>` : '';
    return `<section class="unit"><div class="strip">${sprockets}<div class="row">${cells.join('')}</div>${sprockets}</div>${notesBlock}</section>`;
};

export const buildContactSheetHtml = (input: ContactSheetInput): string => {
    const { film, labels, fonts, platform, shotDates } = input;
    const frames = [...input.frames].sort((a, b) => a.frame_no - b.frame_no);

    const sub = [film.camera, labels.iso, labels.pushPull, labels.exposures, shotDates]
        .filter((part): part is string => !!part)
        .map(escapeHtml)
        .join(' · ');

    const units: string[] = [];
    for (let i = 0; i < frames.length; i += FRAMES_PER_STRIP) {
        units.push(renderUnit(frames.slice(i, i + FRAMES_PER_STRIP), labels));
    }
    const body = frames.length
        ? units.join('')
        : `<div class="no-frames">${escapeHtml(labels.noFrames)}</div>`;

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${escapeHtml(film.title)}</title><style>${css(fonts, platform)}</style></head>
<body>
<header class="head"><div><h1 class="title">${escapeHtml(film.title)}</h1><div class="sub">${sub}</div></div><span class="chip">${escapeHtml(labels.status.toUpperCase())}</span></header>
${body}
<div class="foot"><span>${escapeHtml(labels.framesCount)}</span><span>${escapeHtml(labels.exportedOn)}</span></div>
</body></html>`;
};
