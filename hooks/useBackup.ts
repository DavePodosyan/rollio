import { useCallback, useEffect, useState } from 'react';
import { Alert, DeviceEventEmitter } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import Storage from 'expo-sqlite/kv-store';
import { useTranslation } from 'react-i18next';

import { BackupError } from '@/services/backupDb';
import {
    LAST_BACKUP_KEY,
    applyRestore,
    backupAndShare,
    pickAndValidateBackup,
    type PendingRestore,
} from '@/services/backup';

/** Emitted after a restore replaced all data; open screens refetch or close. */
export const DATA_RESTORED_EVENT = 'data_restored';

export type BackupBusy = 'idle' | 'backup' | 'restore';

// iOS drops an alert presented while the document picker is still animating
// away, so the confirmation waits a moment after the picker closes.
const PICKER_DISMISS_DELAY_MS = 500;

export const useBackup = () => {
    const db = useSQLiteContext();
    const { t, i18n } = useTranslation();
    const [busy, setBusy] = useState<BackupBusy>('idle');
    const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);

    useEffect(() => {
        Storage.getItem(LAST_BACKUP_KEY)
            .then((value) => setLastBackupAt(value))
            .catch(() => setLastBackupAt(null));
    }, []);

    const formatDate = useCallback(
        (iso: string) => new Date(iso).toLocaleDateString(i18n.language, { dateStyle: 'medium' }),
        [i18n.language]
    );

    const backUp = useCallback(async () => {
        if (busy !== 'idle') return;
        setBusy('backup');
        try {
            const manifest = await backupAndShare(db);
            setLastBackupAt(manifest.createdAt);
        } catch (err) {
            console.warn('Backup failed:', err);
            Alert.alert(t('shared.error'), t('settings.backup.errorMessage'));
        } finally {
            setBusy('idle');
        }
    }, [busy, db, t]);

    const confirmRestore = useCallback((pending: PendingRestore) => {
        return new Promise<boolean>((resolve) => {
            Alert.alert(
                t('settings.restore.confirmTitle'),
                t('settings.restore.confirmMessage', {
                    date: formatDate(pending.manifest.createdAt),
                    count: pending.manifest.filmCount,
                }),
                [
                    { text: t('shared.cancel'), style: 'cancel', onPress: () => resolve(false) },
                    { text: t('settings.restore.confirmButton'), style: 'destructive', onPress: () => resolve(true) },
                ],
                { cancelable: true, onDismiss: () => resolve(false) }
            );
        });
    }, [t, formatDate]);

    const restore = useCallback(async () => {
        if (busy !== 'idle') return;
        setBusy('restore');
        try {
            const pending = await pickAndValidateBackup();
            if (!pending) return;

            await new Promise((resolve) => setTimeout(resolve, PICKER_DISMISS_DELAY_MS));
            const confirmed = await confirmRestore(pending);
            if (!confirmed) {
                pending.discard();
                return;
            }

            const counts = await applyRestore(db, pending);
            DeviceEventEmitter.emit(DATA_RESTORED_EVENT);
            Alert.alert(
                t('settings.restore.successTitle'),
                t('settings.restore.successMessage', { films: counts.filmCount, frames: counts.frameCount })
            );
        } catch (err) {
            console.warn('Restore failed:', err);
            const code = err instanceof BackupError ? err.code : 'failed';
            const message = code === 'invalid'
                ? t('settings.restore.invalidMessage')
                : code === 'tooNew'
                    ? t('settings.restore.tooNewMessage')
                    : t('settings.restore.failedMessage');
            await new Promise((resolve) => setTimeout(resolve, PICKER_DISMISS_DELAY_MS));
            Alert.alert(t('shared.error'), message);
        } finally {
            setBusy('idle');
        }
    }, [busy, db, t, confirmRestore]);

    return { busy, lastBackupAt, backUp, restore, formatDate };
};
