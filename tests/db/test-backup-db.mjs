import { openDb, database, check, done, userVersion, columns } from './harness.mjs';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const { initDatabase, createFilm, createFrame, getFilms, getFramesByFilmId } = database;
const backupDb = await import(path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../services/backupDb.ts'));
const { snapshotDatabase, readCounts, inspectImportedDatabase, replaceAllData, BackupError, TARGET_VERSION } = backupDb;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rollio-backup-'));
const tmpPath = (name) => path.join(tmp, name);

const filmInput = (title) => ({ title, iso: 400, camera: null, status: 'in-camera', expected_shots: 36, push_pull: 0, created_at: '2025-01-01' });
const frameInput = (film_id, n, image = null) => ({ film_id, aperture: 'f/2', shutter_speed: '1/125', frame_no: n, created_at: '2025-01-01', image });

try {
    console.log('TARGET_VERSION is exported');
    check(TARGET_VERSION === 3, 'TARGET_VERSION === 3');

    console.log('\nsnapshotDatabase: VACUUM INTO writes a consistent copy');
    {
        const db = openDb(tmpPath('live1.db'));
        await initDatabase(db);
        const film = await createFilm(db, filmInput('Portra'));
        await createFrame(db, frameInput(film.id, 1, 'frames/a.jpg'));
        const dest = tmpPath('snap1.db');
        await snapshotDatabase(db, dest);
        check(fs.existsSync(dest), 'snapshot file exists');
        const copy = new DatabaseSync(dest);
        check(copy.prepare('SELECT COUNT(*) AS n FROM films').get().n === 1, 'snapshot has the film');
        check(copy.prepare('SELECT COUNT(*) AS n FROM frames').get().n === 1, 'snapshot has the frame');
        check(copy.prepare('PRAGMA user_version').get().user_version === 3, 'snapshot keeps user_version 3');
        copy.close();
        // live connection still works
        await createFilm(db, filmInput('Gold'));
        check((await getFilms(db)).length === 2, 'live connection usable after snapshot');
    }

    console.log('\nreadCounts');
    {
        const db = openDb();
        await initDatabase(db);
        const film = await createFilm(db, filmInput('Portra'));
        await createFrame(db, frameInput(film.id, 1, 'frames/a.jpg'));
        await createFrame(db, frameInput(film.id, 2));
        const counts = await readCounts(db);
        check(counts.filmCount === 1, 'filmCount 1');
        check(counts.frameCount === 2, 'frameCount 2');
        check(counts.imageCount === 1, 'imageCount counts frames with an image');
    }

    console.log('\ninspectImportedDatabase');
    {
        const empty = openDb();
        let err = null;
        try { await inspectImportedDatabase(empty); } catch (e) { err = e; }
        check(err instanceof BackupError && err.code === 'invalid', 'empty db throws BackupError(invalid)');

        const real = openDb();
        await initDatabase(real);
        const info = await inspectImportedDatabase(real);
        check(info.schemaVersion === 3, 'returns schemaVersion 3 for a current db');
    }

    console.log('\nreplaceAllData: replaces rows and continues ids');
    {
        const live = openDb(tmpPath('live2.db'));
        await initDatabase(live);
        await createFilm(live, filmInput('A'));

        const importedPath = tmpPath('import2.db');
        const imported = openDb(importedPath);
        await initDatabase(imported);
        const b = await createFilm(imported, filmInput('B'));
        const c = await createFilm(imported, filmInput('C'));
        await createFrame(imported, frameInput(b.id, 1, 'frames/b1.jpg'));
        await createFrame(imported, frameInput(c.id, 1));
        await createFrame(imported, frameInput(c.id, 2));
        imported.raw.close();

        const counts = await replaceAllData(live, importedPath);
        check(counts.filmCount === 2 && counts.frameCount === 3 && counts.imageCount === 1, 'returns counts of the imported data');
        const films = await getFilms(live);
        check(films.map(f => f.title).sort().join() === 'B,C', 'only imported films remain');
        const cFilm = films.find(f => f.title === 'C');
        check(cFilm.frame_count === 2, 'frame_count preserved');
        check((await getFramesByFilmId(live, cFilm.id)).length === 2, 'frames follow their film');
        const next = await createFilm(live, filmInput('D'));
        check(next.id > Math.max(...films.map(f => f.id)), `new id ${next.id} continues after imported ids`);
    }

    console.log('\nreplaceAllData: copies by column name, not position');
    {
        const live = openDb(tmpPath('live3.db'));
        await initDatabase(live);

        const importedPath = tmpPath('import3.db');
        const raw = new DatabaseSync(importedPath);
        raw.exec(`
            CREATE TABLE films (
                id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                created_at DATETIME NOT NULL,
                title TEXT NOT NULL,
                iso INTEGER NOT NULL,
                camera TEXT DEFAULT NULL,
                status TEXT NOT NULL DEFAULT 'in-camera',
                frame_count INTEGER NOT NULL,
                completed_at DATETIME,
                expected_shots INTEGER NOT NULL DEFAULT 36,
                push_pull INTEGER NOT NULL DEFAULT 0
            );
            CREATE TABLE frames (
                id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                image TEXT DEFAULT NULL,
                film_id INTEGER NOT NULL,
                aperture TEXT NOT NULL,
                shutter_speed TEXT NOT NULL,
                frame_no INTEGER NOT NULL,
                note TEXT DEFAULT NULL,
                created_at DATETIME NOT NULL,
                lens TEXT DEFAULT NULL
            );
            PRAGMA user_version = 3;
            INSERT INTO films (created_at, title, iso, status, frame_count, expected_shots) VALUES ('2025-01-01', 'Shuffled', 200, 'archived', 1, 24);
            INSERT INTO frames (image, film_id, aperture, shutter_speed, frame_no, created_at, lens) VALUES ('frames/s.jpg', 1, 'f/8', '1/250', 7, '2025-01-02', '50mm');
        `);
        raw.close();

        await replaceAllData(live, importedPath);
        const [film] = await getFilms(live);
        check(film.title === 'Shuffled' && film.iso === 200 && film.expected_shots === 24, 'film columns land in the right places');
        const [frame] = await getFramesByFilmId(live, film.id);
        check(frame.image === 'frames/s.jpg' && frame.aperture === 'f/8' && frame.lens === '50mm' && frame.frame_no === 7, 'frame columns land in the right places');
    }

    console.log('\nreplaceAllData: an old-schema backup is migrated first, then copied');
    {
        const live = openDb(tmpPath('live4.db'));
        await initDatabase(live);

        const importedPath = tmpPath('import4.db');
        const raw = new DatabaseSync(importedPath);
        raw.exec(`
            CREATE TABLE films (
                id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                title TEXT NOT NULL,
                iso INTEGER NOT NULL,
                camera TEXT DEFAULT NULL,
                status TEXT NOT NULL DEFAULT 'in-camera',
                frame_count INTEGER NOT NULL,
                created_at DATETIME NOT NULL,
                completed_at DATETIME
            );
            CREATE TABLE frames (
                id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                film_id INTEGER NOT NULL,
                aperture TEXT NOT NULL,
                shutter_speed TEXT NOT NULL,
                frame_no INTEGER NOT NULL,
                note TEXT DEFAULT NULL,
                created_at DATETIME NOT NULL,
                FOREIGN KEY (film_id) REFERENCES films(id) ON DELETE CASCADE
            );
            PRAGMA user_version = 2;
            INSERT INTO films (title, iso, status, frame_count, created_at) VALUES ('Old', 100, 'in-camera', 1, '2024-01-01');
            INSERT INTO frames (film_id, aperture, shutter_speed, frame_no, created_at) VALUES (1, '0', '1/60', 1, '2024-01-02');
        `);
        raw.close();

        const imported = openDb(importedPath);
        await initDatabase(imported);            // same migration path as app startup
        check(userVersion(imported) === 3, 'imported db migrated to 3');
        check(columns(imported, 'frames').includes('lens'), 'imported frames gained lens column');
        imported.raw.close();

        await replaceAllData(live, importedPath);
        const [film] = await getFilms(live);
        check(film.title === 'Old' && film.expected_shots === 36, 'old film copied with defaulted new columns');
    }

    console.log('\nreplaceAllData: image paths outside frames/ are dropped');
    {
        const live = openDb(tmpPath('live6.db'));
        await initDatabase(live);
        const importedPath = tmpPath('import6.db');
        const imported = openDb(importedPath);
        await initDatabase(imported);
        const f = await createFilm(imported, filmInput('Crafted'));
        await createFrame(imported, frameInput(f.id, 1, 'frames/ok.jpg'));
        await createFrame(imported, frameInput(f.id, 2, '../../etc/passwd'));
        await createFrame(imported, frameInput(f.id, 3, 'frames/../secret.jpg'));
        await createFrame(imported, frameInput(f.id, 4, '/absolute/path.jpg'));
        imported.raw.close();

        const counts = await replaceAllData(live, importedPath);
        const [film] = await getFilms(live);
        const frames = await getFramesByFilmId(live, film.id);
        const images = frames.sort((a, b) => a.frame_no - b.frame_no).map(fr => fr.image);
        check(images[0] === 'frames/ok.jpg', 'relative frames/ path kept');
        check(images[1] === null && images[2] === null && images[3] === null, 'traversal and absolute paths nulled');
        check(counts.imageCount === 1, 'imageCount reflects the sanitized rows');
    }

    console.log('\nreplaceAllData: failure mid-copy rolls back and keeps the live data');
    {
        const live = openDb(tmpPath('live5.db'));
        await initDatabase(live);
        const a = await createFilm(live, filmInput('A'));
        await createFrame(live, frameInput(a.id, 1, 'frames/a1.jpg'));

        const importedPath = tmpPath('import5.db');
        const imported = openDb(importedPath);
        await initDatabase(imported);
        const b = await createFilm(imported, filmInput('B'));
        await createFrame(imported, frameInput(b.id, 1));
        imported.raw.close();

        live.raw.exec(`CREATE TRIGGER boom BEFORE INSERT ON frames BEGIN SELECT RAISE(ABORT, 'simulated'); END;`);
        let err = null;
        try { await replaceAllData(live, importedPath); } catch (e) { err = e; }
        live.raw.exec('DROP TRIGGER boom');
        check(err instanceof BackupError && err.code === 'failed', 'rejects with BackupError(failed)');
        const films = await getFilms(live);
        check(films.length === 1 && films[0].title === 'A', 'live film A still there');
        check((await getFramesByFilmId(live, films[0].id)).length === 1, 'live frames still there');
        check(live.raw.prepare('PRAGMA database_list').all().every(d => d.name !== 'backup'), 'backup detached after failure');

        // connection still usable
        check(live.raw.prepare('PRAGMA foreign_keys').get().foreign_keys === 1, 'foreign_keys still on');
        await createFilm(live, filmInput('E'));
        check((await getFilms(live)).length === 2, 'can insert after a failed restore');
    }
} finally {
    fs.rmSync(tmp, { recursive: true, force: true });
}

done();
