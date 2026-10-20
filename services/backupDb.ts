import { type SQLiteDatabase } from 'expo-sqlite';
import { TARGET_VERSION } from '@/services/database';

export { TARGET_VERSION };

export type BackupCounts = { filmCount: number; frameCount: number; imageCount: number };

export type BackupErrorCode = 'invalid' | 'tooNew' | 'failed';

export class BackupError extends Error {
    readonly code: BackupErrorCode;

    constructor(code: BackupErrorCode, message?: string) {
        super(message ?? `backup ${code}`);
        this.name = 'BackupError';
        this.code = code;
    }
}

const TABLES = ['films', 'frames'] as const;

/** SQL string literal with single quotes escaped. */
const quote = (value: string) => `'${value.replace(/'/g, "''")}'`;

/**
 * Writes a consistent single-file copy of the live database. Safe while the
 * connection is open and in WAL mode; the copy is a plain non-WAL database.
 */
export const snapshotDatabase = async (db: SQLiteDatabase, destPath: string): Promise<void> => {
    await db.execAsync(`VACUUM INTO ${quote(destPath)}`);
};

export const readCounts = async (db: SQLiteDatabase): Promise<BackupCounts> => {
    const row = await db.getFirstAsync<{ filmCount: number; frameCount: number; imageCount: number }>(`
        SELECT
            (SELECT COUNT(*) FROM films) AS filmCount,
            (SELECT COUNT(*) FROM frames) AS frameCount,
            (SELECT COUNT(*) FROM frames WHERE image IS NOT NULL) AS imageCount
    `);
    return { filmCount: row?.filmCount ?? 0, frameCount: row?.frameCount ?? 0, imageCount: row?.imageCount ?? 0 };
};

/**
 * Checks that a database opened from a backup looks like a Rollio database and
 * reports its schema version. Throws BackupError('invalid') otherwise.
 */
export const inspectImportedDatabase = async (db: SQLiteDatabase): Promise<{ schemaVersion: number }> => {
    const tables = await db.getAllAsync<{ name: string }>(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('films', 'frames')`
    );
    if (tables.length !== TABLES.length) {
        throw new BackupError('invalid', 'missing films or frames table');
    }
    const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    return { schemaVersion: row?.user_version ?? 0 };
};

const tableColumns = async (db: SQLiteDatabase, schema: string, table: string): Promise<string[]> => {
    const rows = await db.getAllAsync<{ name: string }>(`PRAGMA ${schema}.table_info(${table})`);
    return rows.map((r) => r.name);
};

/**
 * Replaces every film and frame in `live` with the rows from the database file
 * at `importedPath`, which must already be migrated to the current schema.
 * Runs inside one transaction so a failure leaves `live` untouched. Columns are
 * matched by name so the two databases may list them in different orders.
 */
export const replaceAllData = async (live: SQLiteDatabase, importedPath: string): Promise<BackupCounts> => {
    await live.execAsync(`ATTACH DATABASE ${quote(importedPath)} AS backup`);
    try {
        await live.withTransactionAsync(async () => {
            const columnLists: Record<string, string> = {};
            for (const table of TABLES) {
                const liveCols = await tableColumns(live, 'main', table);
                const backupCols = new Set(await tableColumns(live, 'backup', table));
                columnLists[table] = liveCols.filter((c) => backupCols.has(c)).join(', ');
            }

            await live.execAsync('DELETE FROM main.frames; DELETE FROM main.films;');
            for (const table of TABLES) {
                await live.execAsync(
                    `INSERT INTO main.${table} (${columnLists[table]}) SELECT ${columnLists[table]} FROM backup.${table}`
                );
            }

            // Continue AUTOINCREMENT ids after the imported ones.
            await live.execAsync(`DELETE FROM main.sqlite_sequence WHERE name IN ('films', 'frames')`);
            await live.execAsync(
                `INSERT INTO main.sqlite_sequence (name, seq) SELECT name, seq FROM backup.sqlite_sequence WHERE name IN ('films', 'frames')`
            );
        });
    } catch (err) {
        throw new BackupError('failed', err instanceof Error ? err.message : String(err));
    } finally {
        await live.execAsync('DETACH DATABASE backup');
    }
    return readCounts(live);
};
