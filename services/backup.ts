import { Platform } from 'react-native';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import Storage from 'expo-sqlite/kv-store';
import { Directory, File, Paths } from 'expo-file-system';
import { listContents, unzip, zip } from 'react-native-zip-archive';
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
/** Set while the live photo folder is set aside during a restore. */
export const RESTORE_IN_PROGRESS_KEY = 'restore_in_progress';

const MANIFEST_NAME = 'manifest.json';
const DB_NAME = 'rollio.db';
const SET_ASIDE_DIR = `${FRAMES_DIR}-restore-backup`;
const STAGING_PREFIX = 'backup-';
const UNPACK_PREFIX = 'restore-';
const PICKED_PREFIX = 'restore-input-';
/** Per-export output folders (PDF/CSV) written by services/exportFilm.ts. */
export const EXPORT_PREFIX = 'export-';

// NOTE: in expo-file-system 58 `copy`, `move`, `write` and `text` are async
// and must be awaited; `create`, `delete`, `list` and `exists` are sync.

/** Filesystem path for the zip library, which does not take `file://` URIs. */
const fsPath = (uri: string) => decodeURIComponent(uri.replace(/^file:\/\//, ''));

const backupFileName = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `Rollio Backup ${yyyy}-${mm}-${dd}${BACKUP_EXTENSION}`;
};

const deleteQuietly = (entry: File | Directory) => {
    try {
        if (entry.exists) entry.delete();
    } catch (err) {
        console.warn('Could not delete', entry.uri, err);
    }
};

const framesDir = () => new Directory(Paths.document, FRAMES_DIR);
const setAsideDir = () => new Directory(Paths.document, SET_ASIDE_DIR);

const countFiles = (dir: Directory): number => dir.list().filter((e) => e instanceof File).length;

// ---------------------------------------------------------------------------
// Housekeeping
// ---------------------------------------------------------------------------

/**
 * Removes archives and working folders left in the cache by earlier backups
 * and restores. Archives are kept after sharing because the receiving app may
 * still be reading them; working folders only survive a crash. Export
 * folders (PDF/CSV) are swept here too, for the same reason.
 */
export const isStaleCacheEntry = (name: string, isDirectory: boolean): boolean => {
    if (isDirectory) {
        return name.startsWith(STAGING_PREFIX) || name.startsWith(UNPACK_PREFIX) || name.startsWith(EXPORT_PREFIX);
    }
    return name.endsWith(BACKUP_EXTENSION) || name.startsWith(PICKED_PREFIX);
};

/**
 * Export folders that can go while the app is in use: every `export-*` except
 * the newest, which the app the user just shared to may still be reading.
 * Names sort by their timestamp suffix.
 */
export const staleExportDirs = (names: string[]): string[] => {
    const exports = names.filter((n) => n.startsWith(EXPORT_PREFIX)).sort();
    return exports.slice(0, -1);
};

/** Sweeps older export folders only; backup/restore work dirs may be live. */
export const cleanupStaleExports = (): void => {
    try {
        const dirs = Paths.cache.list().filter((e): e is Directory => e instanceof Directory);
        const stale = new Set(staleExportDirs(dirs.map((d) => d.name)));
        for (const dir of dirs) {
            if (stale.has(dir.name)) dir.delete();
        }
    } catch (err) {
        console.warn('Could not clean up old export folders:', err);
    }
};

export const cleanupStaleArchives = (): void => {
    try {
        for (const entry of Paths.cache.list()) {
            if (isStaleCacheEntry(entry.name, entry instanceof Directory)) {
                entry.delete();
            }
        }
    } catch (err) {
        console.warn('Could not clean up old backup files:', err);
    }
};

/**
 * Repairs the photo folder after a restore that was interrupted (app killed)
 * between setting the live photos aside and committing the new rows.
 * - Marker set and set-aside folder present: the rows never changed, so the
 *   original photos go back.
 * - Set-aside folder present without the marker: the rows were committed, so
 *   the old photos are no longer needed.
 */
export const recoverInterruptedRestore = async (): Promise<void> => {
    try {
        const aside = setAsideDir();
        const marker = await Storage.getItem(RESTORE_IN_PROGRESS_KEY);
        if (aside.exists) {
            if (marker) {
                deleteQuietly(framesDir());
                await aside.move(framesDir());
            } else {
                aside.delete();
            }
        }
        if (marker) {
            await Storage.removeItem(RESTORE_IN_PROGRESS_KEY);
        }
    } catch (err) {
        console.error('Could not recover from an interrupted restore:', err);
    }
};

// ---------------------------------------------------------------------------
// Backup
// ---------------------------------------------------------------------------

export const createBackupArchive = async (db: SQLiteDatabase): Promise<{ file: File; manifest: BackupManifest }> => {
    const now = new Date();
    const staging = new Directory(Paths.cache, `${STAGING_PREFIX}${now.getTime()}`);
    staging.create({ intermediates: true, idempotent: true });
    const archive = new File(Paths.cache, backupFileName(now));

    try {
        await snapshotDatabase(db, fsPath(new File(staging, DB_NAME).uri));

        const framesSource = framesDir();
        const framesTarget = new Directory(staging, FRAMES_DIR);
        let expectedPhotos = 0;
        if (framesSource.exists) {
            expectedPhotos = countFiles(framesSource);
            await framesSource.copy(framesTarget);
            const copied = countFiles(framesTarget);
            if (copied !== expectedPhotos) {
                throw new BackupError('failed', `copied ${copied} of ${expectedPhotos} photos`);
            }
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
        await new File(staging, MANIFEST_NAME).write(JSON.stringify(manifest, null, 2));

        deleteQuietly(archive);
        await zip(fsPath(staging.uri), fsPath(archive.uri));

        // The archive is the user's only copy of their data; check it before
        // calling the backup a success.
        const entries = await listContents(fsPath(archive.uri));
        const paths = entries.filter((e) => !e.isDirectory).map((e) => e.path);
        const hasManifest = paths.includes(MANIFEST_NAME);
        const hasDb = paths.includes(DB_NAME);
        const photos = paths.filter((p) => p.startsWith(`${FRAMES_DIR}/`)).length;
        if (!hasManifest || !hasDb || photos !== expectedPhotos) {
            throw new BackupError('failed', `archive incomplete: manifest=${hasManifest} db=${hasDb} photos=${photos}/${expectedPhotos}`);
        }

        return { file: archive, manifest };
    } catch (err) {
        deleteQuietly(archive);
        throw err instanceof BackupError ? err : new BackupError('failed', err instanceof Error ? err.message : String(err));
    } finally {
        deleteQuietly(staging);
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

const isManifest = (value: unknown): value is BackupManifest => {
    if (typeof value !== 'object' || value === null) return false;
    const m = value as Record<string, unknown>;
    return m.format === 1
        && typeof m.schemaVersion === 'number'
        && typeof m.createdAt === 'string'
        && typeof m.filmCount === 'number'
        && typeof m.frameCount === 'number';
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
    // The picker may return a content:// (Android) or an Inbox file (iOS);
    // a copy in the cache is a plain path the zip library can open.
    const localCopy = new File(Paths.cache, `${PICKED_PREFIX}${Date.now()}.zip`);
    try {
        await picked.result.copy(localCopy);
        return await unpackAndValidate(localCopy.uri);
    } finally {
        deleteQuietly(localCopy);
    }
};

const unzipOrInvalid = async (archivePath: string, dir: Directory, entries?: string[]) => {
    try {
        if (entries) {
            await unzip(archivePath, fsPath(dir.uri), { entries });
        } else {
            await unzip(archivePath, fsPath(dir.uri));
        }
    } catch (err) {
        throw new BackupError('invalid', `unzip failed: ${err instanceof Error ? err.message : String(err)}`);
    }
};

/**
 * Unpacks an archive and checks that it is a Rollio backup the current app can
 * read. Throws BackupError('invalid' | 'tooNew'); nothing in the app's data is
 * touched, and the unpacked files are removed on failure.
 */
export const unpackAndValidate = async (archiveUri: string): Promise<PendingRestore> => {
    const dir = new Directory(Paths.cache, `${UNPACK_PREFIX}${Date.now()}`);
    dir.create({ intermediates: true, idempotent: true });
    const discard = () => deleteQuietly(dir);
    const archivePath = fsPath(archiveUri);

    try {
        // Validate from the two small entries before extracting any photos, so
        // a huge unrelated zip costs little.
        await unzipOrInvalid(archivePath, dir, [MANIFEST_NAME, DB_NAME]);

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

        await unzipOrInvalid(archivePath, dir);
        const unpackedFrames = new Directory(dir, FRAMES_DIR);
        if (!unpackedFrames.exists) {
            unpackedFrames.create();
        }

        return { dir, manifest, dbFile, framesDir: unpackedFrames, discard };
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

    // A leftover set-aside folder means an earlier restore was interrupted.
    await recoverInterruptedRestore();
    if (setAsideDir().exists) {
        pending.discard();
        throw new BackupError('failed', 'could not clear the set-aside photo folder');
    }

    // Fresh Directory instances per operation: a moved instance's uri follows
    // the folder, and moving onto an existing directory moves *into* it.
    let setAside = false;
    try {
        await Storage.setItem(RESTORE_IN_PROGRESS_KEY, new Date().toISOString());

        // 2. Set the current photos aside (a rename, since the target is absent).
        if (framesDir().exists) {
            await framesDir().move(setAsideDir());
            setAside = true;
        }

        // 3. Move the imported photos into place, 4. replace the rows.
        await pending.framesDir.move(framesDir());
        const counts = await replaceAllData(live, fsPath(pending.dbFile.uri));

        // 5. Committed: from here the old photos are no longer needed.
        await Storage.removeItem(RESTORE_IN_PROGRESS_KEY);
        deleteQuietly(setAsideDir());
        pending.discard();
        return counts;
    } catch (err) {
        // 6. Undo the folder swap; the transaction already rolled the rows back.
        deleteQuietly(framesDir());
        if (setAside) {
            try {
                await setAsideDir().move(framesDir());
            } catch (moveErr) {
                console.error('Could not put the original photos back:', moveErr);
            }
        }
        try {
            await Storage.removeItem(RESTORE_IN_PROGRESS_KEY);
        } catch (markerErr) {
            console.warn('Could not clear the restore marker:', markerErr);
        }
        pending.discard();
        throw err instanceof BackupError ? err : new BackupError('failed', err instanceof Error ? err.message : String(err));
    }
};
