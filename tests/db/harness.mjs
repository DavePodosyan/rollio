// Loads the app's real services/database.ts under Node, with `@/` aliases
// resolved to the project root and expo-file-system stubbed out.
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(HERE, '..', '..');

registerHooks({
    resolve(specifier, context, next) {
        if (specifier === 'expo-file-system') {
            return { url: pathToFileURL(path.join(HERE, 'stub-expo-file-system.mjs')).href, shortCircuit: true };
        }
        if (specifier === 'expo-sqlite') {
            return { url: pathToFileURL(path.join(HERE, 'stub-empty.mjs')).href, shortCircuit: true };
        }
        if (specifier === '@/types') {
            return { url: pathToFileURL(path.join(HERE, 'stub-types.mjs')).href, shortCircuit: true };
        }
        if (specifier.startsWith('@/')) {
            const base = path.join(ROOT, specifier.slice(2));
            for (const ext of ['.ts', '.tsx', '/index.ts']) {
                if (fs.existsSync(base + ext)) {
                    return { url: pathToFileURL(base + ext).href, shortCircuit: true };
                }
            }
        }
        return next(specifier, context);
    },
});

/** Minimal expo-sqlite SQLiteDatabase shim over node:sqlite. */
export function openDb(dbPath = ':memory:') {
    const raw = new DatabaseSync(dbPath);
    const db = {
        raw,
        databasePath: dbPath,
        async execAsync(sql) { raw.exec(sql); },
        async getAllAsync(sql, params = []) { return raw.prepare(sql).all(...params); },
        async getFirstAsync(sql, params = []) { return raw.prepare(sql).get(...params) ?? null; },
        async runAsync(sql, params = []) {
            const r = raw.prepare(sql).run(...params);
            return { lastInsertRowId: Number(r.lastInsertRowid), changes: r.changes };
        },
        async withTransactionAsync(fn) {
            raw.exec('BEGIN');
            try { await fn(); raw.exec('COMMIT'); }
            catch (e) { raw.exec('ROLLBACK'); throw e; }
        },
    };
    return db;
}

export const database = await import(path.join(ROOT, 'services/database.ts'));
export const fsStub = await import(path.join(HERE, 'stub-expo-file-system.mjs'));

export function columns(db, table) {
    return db.raw.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
}
export function userVersion(db) {
    return db.raw.prepare('PRAGMA user_version').get().user_version;
}

let failures = 0;
export function check(cond, msg) {
    console.log((cond ? '  ok   ' : '  FAIL ') + msg);
    if (!cond) failures++;
}
export function done() {
    console.log(failures === 0 ? '\nALL PASSED' : `\n${failures} FAILED`);
    process.exit(failures === 0 ? 0 : 1);
}
