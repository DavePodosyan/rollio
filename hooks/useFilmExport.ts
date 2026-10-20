import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { Film, Frame } from '@/types';
import { renderContactSheet, shareExportedFile, writeFilmCsv, type ExportKind } from '@/services/exportFilm';
import type { File } from 'expo-file-system';

export type ExportBusy = 'idle' | ExportKind;

/** Busy state and error alerts around the film export; mirrors useBackup. */
export const useFilmExport = () => {
    const { t } = useTranslation();
    const [busy, setBusy] = useState<ExportBusy>('idle');
    // Two taps in the same frame both see busy === 'idle'; the ref closes that gap.
    const busyRef = useRef<ExportBusy>('idle');

    // The overlay covers only the rendering; the share sheet is modal on its own
    // and resolves when the user dismisses it, which is not an error.
    const run = useCallback(async (kind: ExportKind, render: () => Promise<File>) => {
        if (busyRef.current !== 'idle') return;
        busyRef.current = kind;
        setBusy(kind);
        let file: File;
        try {
            file = await render();
        } catch (err) {
            console.warn(`Export (${kind}) failed:`, err);
            Alert.alert(t('shared.error'), t('export.errorMessage'));
            return;
        } finally {
            busyRef.current = 'idle';
            setBusy('idle');
        }
        try {
            await shareExportedFile(file, kind);
        } catch (err) {
            console.warn(`Sharing the ${kind} failed:`, err);
            Alert.alert(t('shared.error'), t('export.errorMessage'));
        }
    }, [t]);

    const exportPdf = useCallback(
        (film: Film, frames: Frame[]) => run('pdf', () => renderContactSheet(film, frames)),
        [run]
    );
    const exportCsv = useCallback(
        (film: Film, frames: Frame[]) => run('csv', () => writeFilmCsv(film, frames)),
        [run]
    );

    return { busy, exportPdf, exportCsv };
};
