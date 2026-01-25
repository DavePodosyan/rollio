import { CreateFilmInput, Film, Frame, FilmStatus, CreateFrameInput } from '@/types';
import { type SQLiteDatabase } from 'expo-sqlite';

export const initDatabase = async (db: SQLiteDatabase) => {
    console.log('Initializing database...');

    await db.execAsync(`
      PRAGMA journal_mode = 'wal';
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS films (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        title TEXT NOT NULL,
        iso INTEGER NOT NULL,
        camera TEXT DEFAULT NULL,
        expected_shots INTEGER NOT NULL DEFAULT 36,
        push_pull INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'in-camera',
        frame_count INTEGER NOT NULL,
        created_at DATETIME NOT NULL,
        completed_at DATETIME
      );
      CREATE TABLE IF NOT EXISTS frames (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        film_id INTEGER NOT NULL,
        lens TEXT DEFAULT NULL,
        aperture TEXT NOT NULL,
        shutter_speed TEXT NOT NULL,
        image TEXT DEFAULT NULL,
        frame_no INTEGER NOT NULL,
        note TEXT DEFAULT NULL,
        created_at DATETIME NOT NULL,
        FOREIGN KEY (film_id) REFERENCES films(id) ON DELETE CASCADE
    );
    `);

    const [{ user_version: currentVersion }] = await db.getAllAsync<{ user_version: number }>('PRAGMA user_version');
    const TARGET_VERSION = 2;

    if (currentVersion < TARGET_VERSION) {
        console.log(`Migrating database from version ${currentVersion} to ${TARGET_VERSION}...`);

        if (currentVersion < 2) {
            await migrateToV2(db);
        }

        await db.execAsync(`PRAGMA user_version = ${TARGET_VERSION}`);
    } else {
        console.log('Database is up to date.');
    }

    console.log(db.databasePath);


};

const migrateToV2 = async (db: SQLiteDatabase) => {
    console.log('Applying migration to version 2...');

    await db.execAsync(`
        UPDATE frames 
        SET aperture = 'Auto' 
        WHERE aperture = '0';
    `);

    console.log('Migration to version 2 completed.');
}

export const getFilms = async (db: SQLiteDatabase): Promise<Film[]> => {
    if (!db) throw new Error('Database not provided');

    const results: Film[] = await db.getAllAsync(`
        SELECT * FROM films ORDER BY created_at DESC
    `);

    // console.log('Fetched film rolls:', results);

    return results;
};

export const getFilmById = async (db: SQLiteDatabase, id: number): Promise<Film | null> => {
    if (!db) throw new Error('Database not provided');

    const film = await db.getFirstAsync<Film>(`SELECT * FROM films WHERE id = ?`, [id]);

    return film || null;
};

export const createFilm = async (db: SQLiteDatabase, input: CreateFilmInput): Promise<Film> => {
    if (!db) throw new Error('Database not provided');

    const normalized = {
        title: input.title.trim(),
        iso: input.iso,
        camera: input.camera ? input.camera.trim() : null,
        status: input.status || FilmStatus.InCamera,
        expected_shots: input.expected_shots || 36,
        push_pull: input.push_pull || 0,
        created_at: input.created_at || new Date().toISOString(),
    }

    if (!normalized.title) {
        throw new Error('Title is required');
    }

    if (!Number.isInteger(normalized.iso) || normalized.iso <= 0) {
        throw new Error('ISO must be a positive integer');
    }

    const result = await db.runAsync(
        `
            INSERT INTO films (
                title, 
                iso, 
                camera, 
                status,  
                expected_shots, 
                push_pull, 
                frame_count, 
                created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            normalized.title,
            normalized.iso,
            normalized.camera,
            normalized.status,
            normalized.expected_shots,
            normalized.push_pull,
            0,
            normalized.created_at,
        ]
    );

    const id = Number(result.lastInsertRowId);
    const created = await getFilmById(db, id);

    if (!created) throw new Error('Failed to retrieve created film');

    return created;
};

export const updateFilm = async (db: SQLiteDatabase, id: number, input: Partial<CreateFilmInput>): Promise<Film> => {
    if (!db) throw new Error('Database not provided');

    const existing = await getFilmById(db, id);
    if (!existing) throw new Error('Film with id ' + id + ' not found');

    const updated = { ...existing, ...input } as Film;

    console.log(updated);


    await db.runAsync(
        `
            UPDATE films SET
                title = ?,
                iso = ?,
                camera = ?,
                status = ?,
                expected_shots = ?,
                push_pull = ?,
                frame_count = ?,
                created_at = ?
            WHERE id = ?
        `,
        [
            updated.title.trim(),
            updated.iso,
            updated.camera ? updated.camera.trim() : null,
            updated.status,
            updated.expected_shots,
            updated.push_pull,
            updated.frame_count,
            updated.created_at,
            id,
        ]
    );

    return updated;
};

export const deleteFilm = async (db: SQLiteDatabase, id: number): Promise<void> => {
    if (!db) throw new Error('Database not provided');

    //delete frames images
    const frames: Frame[] = await getFramesByFilmId(db, id);

    //TODO: delete images from storage
    for (const frame of frames) {
        if (frame.image) {
            console.log(frame.image);
        }
    }

    await db.runAsync(`DELETE FROM films WHERE id = ?`, [id]);
}

export const getFramesByFilmId = async (db: SQLiteDatabase, film_id: number): Promise<Frame[]> => {
    if (!db) throw new Error('Database not provided');

    const results: Frame[] = await db.getAllAsync(
        `SELECT * FROM frames WHERE film_id = ? ORDER BY frame_no ASC`,
        [film_id]
    );

    return results;
}

export const getFrameById = async (db: SQLiteDatabase, id: number): Promise<Frame | null> => {
    if (!db) throw new Error('Database not provided');

    const frame = await db.getFirstAsync<Frame>(`SELECT * FROM frames WHERE id = ?`, [id]);

    return frame || null;
}

export const createFrame = async (db: SQLiteDatabase, input: CreateFrameInput): Promise<Frame> => {
    if (!db) throw new Error('Database not provided');

    const result = await db.runAsync(
        `
            INSERT INTO frames (
                film_id,
                lens,
                aperture,
                shutter_speed,
                image,
                frame_no,
                note,
                created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            input.film_id,
            input.lens || null,
            input.aperture || "Auto",
            input.shutter_speed || "Auto",
            input.image || null,
            input.frame_no,
            input.note || null,
            input.created_at,
        ]
    );

    const id = Number(result.lastInsertRowId);

    await db.runAsync(
        `UPDATE films SET frame_count = frame_count + 1 WHERE id = ?`,
        [input.film_id]
    );

    const created = await getFrameById(db, id);

    if (!created) throw new Error('Failed to retrieve created frame');

    return created;
};

export const updateFrame = async (db: SQLiteDatabase, id: number, input: Partial<Omit<Frame, 'id'>>): Promise<Frame> => {
    if (!db) throw new Error('Database not provided');

    const existing = await getFrameById(db, id);
    if (!existing) throw new Error('Frame with id ' + id + ' not found');

    const updated = { ...existing, ...input } as Frame;

    await db.runAsync(
        `
            UPDATE frames SET
                film_id = ?,
                lens = ?,
                aperture = ?,
                shutter_speed = ?,
                image = ?,
                frame_no = ?,
                note = ?,
                created_at = ?
            WHERE id = ?
        `,
        [
            updated.film_id,
            updated.lens,
            updated.aperture,
            updated.shutter_speed,
            updated.image,
            updated.frame_no,
            updated.note,
            updated.created_at,
            id,
        ]
    );

    return updated;
};

export const deleteFrame = async (db: SQLiteDatabase, id: number): Promise<void> => {
    if (!db) throw new Error('Database not provided');

    //delete frame image
    const frame = await getFrameById(db, id);

    if (!frame) return;

    if (frame && frame.image) {
        console.log(frame.image);
    }

    await db.runAsync(`DELETE FROM frames WHERE id = ?`, [id]);

    await db.runAsync(
        `UPDATE films SET frame_count = MAX(0, frame_count - 1) WHERE id = ?`,
        [frame.film_id]
    );


};

export const getUniqueFilmNames = async (db: SQLiteDatabase): Promise<string[]> => {
    if (!db) throw new Error('Database not provided');

    const results: { title: string }[] = await db.getAllAsync(`
        SELECT DISTINCT title FROM films ORDER BY title ASC
    `);

    return results.map(r => r.title);
}

export const getUniqueCameraNames = async (db: SQLiteDatabase): Promise<string[]> => {
    if (!db) throw new Error('Database not provided');

    const results: { camera: string }[] = await db.getAllAsync(`
        SELECT DISTINCT camera FROM films WHERE camera IS NOT NULL AND camera != '' ORDER BY camera ASC
    `);

    return results.map(r => r.camera);
}

export const getUniqueLensNames = async (db: SQLiteDatabase): Promise<string[]> => {
    if (!db) throw new Error('Database not provided');

    const results: { lens: string }[] = await db.getAllAsync(`
        SELECT DISTINCT lens FROM frames WHERE lens IS NOT NULL AND lens != '' ORDER BY lens ASC
    `);

    return results.map(r => r.lens);
}

