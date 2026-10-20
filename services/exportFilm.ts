import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';

import i18n from '@/i18n';
import type { Film, Frame } from '@/types';
import { getAutoValueLabel } from '@/utils/cameraSettingsLabels';
import { getFilmStatusLabel } from '@/utils/filmStatusLabels';
import { EXPORT_PREFIX, cleanupStaleArchives } from '@/services/backup';
import { CSV_BOM, buildFilmCsv, exportFileName } from '@/services/exportCsv';
import { buildContactSheetHtml, formatShotDates, type SheetFrame, type SheetLabels } from '@/services/exportHtml';

// Native glue for the film export: resolves fonts, thumbnails, labels and
// dates, renders the contact sheet with expo-print, writes the files into a
// per-export cache folder and hands them to the share sheet. Rendering and
// sharing are separate steps so the caller can drop its busy state before the
// share sheet comes up. The documents themselves are built by the pure
// modules exportHtml.ts / exportCsv.ts.

const PAGE = { width: 595, height: 842 } as const; // A4 in points
const PAGE_MARGIN = 36;
const THUMBNAIL_WIDTH = 480;
const THUMBNAIL_QUALITY = 0.7;
const PDF_SUFFIX = 'Contact Sheet';

// ---------------------------------------------------------------------------
// Fonts
// ---------------------------------------------------------------------------

let fontsPromise: Promise<{ regular: string; medium: string }> | null = null;

const readAssetBase64 = async (moduleId: number): Promise<string> => {
    const asset = Asset.fromModule(moduleId);
    await asset.downloadAsync();
    if (!asset.localUri) throw new Error('font asset has no local uri');
    return new File(asset.localUri).base64();
};

/** The two Lufga faces as base64, read once per app session. */
const loadFonts = () => {
    if (!fontsPromise) {
        fontsPromise = Promise.all([
            readAssetBase64(require('../assets/fonts/Lufga-Regular.ttf')),
            readAssetBase64(require('../assets/fonts/Lufga-Medium.ttf')),
        ]).then(([regular, medium]) => ({ regular, medium }));
        // A failed read must not poison later exports.
        fontsPromise.catch(() => { fontsPromise = null; });
    }
    return fontsPromise;
};

// ---------------------------------------------------------------------------
// Thumbnails
// ---------------------------------------------------------------------------

/**
 * A small JPEG data URI for the frame's photo, or null when the frame has no
 * photo or the file cannot be read. Never throws: a broken photo must not
 * fail the whole export.
 */
export const makeThumbnail = async (frame: Frame): Promise<string | null> => {
    if (!frame.image) return null;
    try {
        const source = new File(Paths.document, frame.image);
        if (!source.exists) return null;
        const context = ImageManipulator.manipulate(source.uri);
        context.resize({ width: THUMBNAIL_WIDTH });
        const image = await context.renderAsync();
        try {
            const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: THUMBNAIL_QUALITY, base64: true });
            try {
                new File(result.uri).delete();
            } catch {
                // The temp file is in the cache; the launch sweep is not responsible
                // for it, but leaving it behind is harmless.
            }
            return result.base64 ? `data:image/jpeg;base64,${result.base64}` : null;
        } finally {
            image.release();
            context.release();
        }
    } catch (err) {
        console.warn(`Could not render thumbnail for frame ${frame.frame_no}:`, err);
        return null;
    }
};

// ---------------------------------------------------------------------------
// Labels and dates
// ---------------------------------------------------------------------------

const dateFormatter = () =>
    new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' });

const buildLabels = (film: Film, frameCount: number): SheetLabels => {
    const auto = getAutoValueLabel();
    return {
        iso: i18n.t('export.sheet.iso', { iso: film.iso }),
        exposures: i18n.t('export.sheet.exposures', { count: film.expected_shots }),
        pushPull: film.push_pull === 0
            ? null
            : film.push_pull < 0
                ? i18n.t('rollDetail.pushPull.pull', { stops: film.push_pull })
                : i18n.t('rollDetail.pushPull.push', { stops: film.push_pull }),
        status: getFilmStatusLabel(film.status),
        aperture: (value) => (value === 'Auto' ? auto : i18n.t('cameraSettings.apertureFormat', { value })),
        shutter: (value) => (value === 'Auto' ? auto : i18n.t('cameraSettings.shutterSpeedFormat', { value })),
        noPhoto: i18n.t('export.sheet.noPhoto'),
        noFrames: i18n.t('export.sheet.noFrames'),
        framesCount: i18n.t('export.sheet.framesCount', { count: frameCount }),
        exportedOn: i18n.t('export.sheet.exportedOn', { date: dateFormatter().format(new Date()) }),
    };
};

// ---------------------------------------------------------------------------
// Output folder and sharing
// ---------------------------------------------------------------------------

const createOutputDir = (): Directory => {
    cleanupStaleArchives();
    const dir = new Directory(Paths.cache, `${EXPORT_PREFIX}${Date.now()}`);
    dir.create();
    return dir;
};

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

/** Renders the contact sheet and returns the PDF file in a fresh export folder. */
export const renderContactSheet = async (film: Film, frames: Frame[]): Promise<File> => {
    const fonts = await loadFonts();
    const sheetFrames: SheetFrame[] = [];
    for (const frame of frames) {
        sheetFrames.push({ ...frame, thumbnail: await makeThumbnail(frame) });
    }
    const html = buildContactSheetHtml({
        film,
        frames: sheetFrames,
        labels: buildLabels(film, frames.length),
        shotDates: formatShotDates(frames, film, i18n.language),
        fonts,
        platform: Platform.OS === 'android' ? 'android' : 'ios',
    });

    const printed = await Print.printToFileAsync({
        html,
        width: PAGE.width,
        height: PAGE.height,
        base64: false,
        ...(Platform.OS === 'ios'
            ? { margins: { top: PAGE_MARGIN, right: PAGE_MARGIN, bottom: PAGE_MARGIN, left: PAGE_MARGIN } }
            : {}),
    });

    const dir = createOutputDir();
    const target = new File(dir, exportFileName(film.title, PDF_SUFFIX, 'pdf'));
    await new File(printed.uri).move(target);
    return target;
};

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

/** Writes the CSV into a fresh export folder and returns the file. */
export const writeFilmCsv = async (film: Film, frames: Frame[]): Promise<File> => {
    const dir = createOutputDir();
    const target = new File(dir, exportFileName(film.title, null, 'csv'));
    const csv = buildFilmCsv(film, frames);
    if (!csv.startsWith(CSV_BOM)) throw new Error('csv builder dropped the byte-order mark');
    await target.write(csv);
    return target;
};

export type ExportKind = 'pdf' | 'csv';

const SHARE_OPTIONS: Record<ExportKind, { UTI: string; mimeType: string }> = {
    pdf: { UTI: 'com.adobe.pdf', mimeType: 'application/pdf' },
    csv: { UTI: 'public.comma-separated-values-text', mimeType: 'text/csv' },
};

/** Hands a rendered export to the share sheet; resolves when the sheet closes. */
export const shareExportedFile = async (file: File, kind: ExportKind): Promise<void> => {
    await shareAsync(file.uri, { ...SHARE_OPTIONS[kind], dialogTitle: file.name });
};
