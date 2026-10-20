import { Platform } from 'react-native';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import Storage from 'expo-sqlite/kv-store';
import { Directory, File, Paths } from 'expo-file-system';
import { unzip, zip } from 'react-native-zip-archive';
import { shareAsync } from 'expo-sharing';
import * as Application from 'expo-application';

import { initDatabase } from '@/services/database';
import {
    BackupError,
    TARGET_VERSION,
    inspectImportedDatabase,
    readCounts,
    replaceAllData,
    snapshotDatabase,
    type BackupCounts,
} from '@/services/backupDb';

export type BackupManifest = {
    format: 1;
    schemaVersion: number;
    appVersion: string;
    createdAt: string;
    platform: 'ios' | 'android';
    filmCount: number;
    frameCount: number;
    imageCount: number;
};

export const BACKUP_EXTENSION = '.rollio';
export const FRAMES_DIR = 'frames';
export const LAST_BACKUP_KEY = 'last_backup_created_at';

const MANIFEST_NAME = 'manifest.json';
const DB_NAME = 'rollio.db';

/** Filesystem path for the zip library, which does not take `file://` URIs. */
const fsPath = (uri: string) => decodeURI(uri.replace(/^file:\/\//, ''));

const backupFileName = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `Rollio Backup ${yyyy}-${mm}-${dd}${BACKUP_EXTENSION}`;
};

/**
 * Removes archives left in the cache by earlier backups. They are kept after
 * sharing because the receiving app may still be reading them.
 */
export const cleanupStaleArchives = (): void => {
    try {
        for (const entry of Paths.cache.list()) {
            if (entry instanceof File && entry.name.endsWith(BACKUP_EXTENSION)) {
                entry.delete();
            }
        }
    } catch (err) {
        console.warn('Could not clean up old backup archives:', err);
    }
};

export const createBackupArchive = async (db: SQLiteDatabase): Promise<{ file: File; manifest: BackupManifest }> => {
    const now = new Date();
    const staging = new Directory(Paths.cache, `backup-${now.getTime()}`);
    staging.create({ intermediates: true, idempotent: true });

    try {
        await snapshotDatabase(db, fsPath(new File(staging, DB_NAME).uri));

        const framesSource = new Directory(Paths.document, FRAMES_DIR);
        const framesTarget = new Directory(staging, FRAMES_DIR);
        if (framesSource.exists) {
            framesSource.copy(framesTarget);
        } else {
            framesTarget.create();
        }

        const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
        const counts = await readCounts(db);
        const manifest: BackupManifest = {
            format: 1,
            schemaVersion: versionRow?.user_version ?? 0,
            appVersion: Application.nativeApplicationVersion ?? 'unknown',
            createdAt: now.toISOString(),
            platform: Platform.OS === 'android' ? 'android' : 'ios',
            ...counts,
        };
        new File(staging, MANIFEST_NAME).write(JSON.stringify(manifest, null, 2));

        const archive = new File(Paths.cache, backupFileName(now));
        if (archive.exists) {
            archive.delete();
        }
        await zip(fsPath(staging.uri), fsPath(archive.uri));
        return { file: archive, manifest };
    } finally {
        try {
            staging.delete();
        } catch (err) {
            console.warn('Could not remove backup staging directory:', err);
        }
    }
};

export const shareBackup = async (file: File): Promise<void> => {
    await shareAsync(file.uri, { UTI: 'public.zip-archive', mimeType: 'application/zip' });
};

/**
 * Builds a fresh archive, hands it to the share sheet and records when it was
 * created. The share sheet cannot say whether the user saved the file, so the
 * recorded date only means "a backup file was created".
 */
export const backupAndShare = async (db: SQLiteDatabase): Promise<BackupManifest> => {
    cleanupStaleArchives();
    const { file, manifest } = await createBackupArchive(db);
    await shareBackup(file);
    await Storage.setItem(LAST_BACKUP_KEY, manifest.createdAt);
    return manifest;
};

// ---------------------------------------------------------------------------
// Restore
// ---------------------------------------------------------------------------

export type PendingRestore = {
    dir: Directory;
    manifest: BackupManifest;
    dbFile: File;
    framesDir: Directory;
    /** Deletes the unpacked archive. Safe to call more than once. */
    discard: () => void;
};

const SET_ASIDE_DIR = `${FRAMES_DIR}-restore-backup`;

const isManifest = (value: unknown): value is BackupManifest => {
    if (typeof value !== 'object' || value === null) return false;
    const m = value as Record<string, unknown>;
    return m.format === 1
        && typeof m.schemaVersion === 'number'
        && typeof m.createdAt === 'string'
        && typeof m.filmCount === 'number'
        && typeof m.frameCount === 'number';
};

const deleteQuietly = (entry: File | Directory) => {
    try {
        if (entry.exists) entry.delete();
    } catch (err) {
        console.warn('Could not delete', entry.uri, err);
    }
};

/**
 * Lets the user pick a file, then unpacks and validates it. Returns null when
 * the picker is cancelled. See unpackAndValidate for the errors thrown.
 */
export const pickAndValidateBackup = async (): Promise<PendingRestore | null> => {
    const picked = await File.pickFileAsync();
    if (picked.canceled) {
        return null;
    }
    return unpackAndValidate(picked.result.uri);
};

/**
 * Unpacks an archive and checks that it is a Rollio backup the current app can
 * read. Throws BackupError('invalid' | 'tooNew'); nothing in the app's data is
 * touched, and the unpacked files are removed on failure.
 */
export const unpackAndValidate = async (archiveUri: string): Promise<PendingRestore> => {
    const dir = new Directory(Paths.cache, `restore-${Date.now()}`);
    dir.create({ intermediates: true, idempotent: true });
    const discard = () => deleteQuietly(dir);

    try {
        try {
            await unzip(fsPath(archiveUri), fsPath(dir.uri));
        } catch (err) {
            throw new BackupError('invalid', `unzip failed: ${err instanceof Error ? err.message : String(err)}`);
        }

        const manifestFile = new File(dir, MANIFEST_NAME);
        const dbFile = new File(dir, DB_NAME);
        if (!manifestFile.exists || !dbFile.exists) {
            throw new BackupError('invalid', 'manifest.json or rollio.db missing');
        }

        let manifest: unknown;
        try {
            manifest = JSON.parse(await manifestFile.text());
        } catch {
            throw new BackupError('invalid', 'manifest.json unreadable');
        }
        if (!isManifest(manifest)) {
            throw new BackupError('invalid', 'manifest.json has an unknown format');
        }
        if (manifest.schemaVersion > TARGET_VERSION) {
            throw new BackupError('tooNew', `schema ${manifest.schemaVersion} > ${TARGET_VERSION}`);
        }

        const imported = await openDatabaseAsync(DB_NAME, { useNewConnection: true }, fsPath(dir.uri));
        try {
            const info = await inspectImportedDatabase(imported);
            if (info.schemaVersion > TARGET_VERSION) {
                throw new BackupError('tooNew', `db schema ${info.schemaVersion} > ${TARGET_VERSION}`);
            }
        } finally {
            await imported.closeAsync();
        }

        const framesDir = new Directory(dir, FRAMES_DIR);
        if (!framesDir.exists) {
            framesDir.create();
        }

        return { dir, manifest, dbFile, framesDir, discard };
    } catch (err) {
        discard();
        if (err instanceof BackupError) throw err;
        throw new BackupError('invalid', err instanceof Error ? err.message : String(err));
    }
};

/**
 * Replaces all live data with the validated backup. The live connection stays
 * open. If anything fails the rows roll back (transaction) and the original
 * photo folder is put back; the error is rethrown as BackupError('failed').
 */
export const applyRestore = async (live: SQLiteDatabase, pending: PendingRestore): Promise<BackupCounts> => {
    // 1. Bring the imported database up to the current schema.
    try {
        const imported = await openDatabaseAsync(DB_NAME, { useNewConnection: true }, fsPath(pending.dir.uri));
        try {
            await initDatabase(imported);
        } finally {
            await imported.closeAsync();
        }
    } catch (err) {
        pending.discard();
        throw new BackupError('failed', `migration failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Fresh Directory instances per operation: a moved instance's uri follows
    // the folder, and moving onto an existing directory moves *into* it.
    const framesDir = () => new Directory(Paths.document, FRAMES_DIR);
    const setAsideDir = () => new Directory(Paths.document, SET_ASIDE_DIR);

    deleteQuietly(setAsideDir());
    if (setAsideDir().exists) {
        pending.discard();
        throw new BackupError('failed', 'could not clear the set-aside photo folder');
    }

    // 2. Set the current photos aside (a rename, since the target is absent).
    const hadFrames = framesDir().exists;
    if (hadFrames) {
        framesDir().move(setAsideDir());
    }

    try {
        // 3. Move the imported photos into place, 4. replace the rows.
        pending.framesDir.move(framesDir());
        const counts = await replaceAllData(live, fsPath(pending.dbFile.uri));

        // 5. Success: drop the old photos and the unpacked archive.
        deleteQuietly(setAsideDir());
        pending.discard();
        return counts;
    } catch (err) {
        // 6. Undo the folder swap; the transaction already rolled the rows back.
        deleteQuietly(framesDir());
        if (hadFrames) {
            try {
                setAsideDir().move(framesDir());
            } catch (moveErr) {
                console.error('Could not put the original photos back:', moveErr);
            }
        }
        pending.discard();
        throw err instanceof BackupError ? err : new BackupError('failed', err instanceof Error ? err.message : String(err));
    }
};
