import type { Film, Frame } from '@/types';

/** Byte-order mark so spreadsheet apps read the file as UTF-8. */
export const CSV_BOM = '﻿';

const COLUMNS = ['Film', 'Camera', 'ISO', 'Push/Pull', 'Status', 'Frame', 'Date', 'Aperture', 'Shutter', 'Lens', 'Note', 'Latitude', 'Longitude'];

const field = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined) return '';
    const text = String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/**
 * One row per frame, sorted by frame number, with the film's columns repeated
 * on every row so several rolls can be concatenated. RFC 4180 quoting, CRLF.
 */
export const buildFilmCsv = (film: Film, frames: Frame[]): string => {
    const sorted = [...frames].sort((a, b) => a.frame_no - b.frame_no);
    const rows = sorted.map((frame) => [
        film.title, film.camera, film.iso, film.push_pull, film.status,
        frame.frame_no, frame.created_at, frame.aperture, frame.shutter_speed, frame.lens, frame.note, frame.latitude, frame.longitude,
    ].map(field).join(','));
    return CSV_BOM + [COLUMNS.join(','), ...rows].map((line) => line + '\r\n').join('');
};

const MAX_TITLE_LENGTH = 60;

/** A share-sheet friendly file name: `<title> – <suffix>.<ext>` or `<title>.<ext>`. */
export const exportFileName = (title: string, suffix: string | null, ext: string): string => {
    const clean = title
        .replace(/[\\/:*?"<>|\u0000-\u001F]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, MAX_TITLE_LENGTH)
        .trim();
    const base = clean || 'Film';
    return suffix ? `${base} – ${suffix}.${ext}` : `${base}.${ext}`;
};
