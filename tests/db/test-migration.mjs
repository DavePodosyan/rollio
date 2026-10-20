import { openDb, database, columns, userVersion, check, done } from './harness.mjs';

const { initDatabase } = database;

console.log('Scenario A: early 1.x schema (no expected_shots/push_pull/lens/image), user_version 0');
{
    const db = openDb();
    db.raw.exec(`
        CREATE TABLE films (
            id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
            title TEXT NOT NULL, iso INTEGER NOT NULL, camera TEXT,
            status TEXT NOT NULL DEFAULT 'in-camera', frame_count INTEGER NOT NULL,
            created_at DATETIME NOT NULL, completed_at DATETIME
        );
        CREATE TABLE frames (
            id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
            film_id INTEGER NOT NULL, aperture TEXT NOT NULL, shutter_speed TEXT NOT NULL,
            frame_no INTEGER NOT NULL, note TEXT, created_at DATETIME NOT NULL,
            FOREIGN KEY (film_id) REFERENCES films(id) ON DELETE CASCADE
        );
        INSERT INTO films (title, iso, frame_count, created_at) VALUES ('Portra', 400, 1, '2024-01-01');
        INSERT INTO frames (film_id, aperture, shutter_speed, frame_no, created_at) VALUES (1, '0', '1/125', 1, '2024-01-01');
    `);
    await initDatabase(db);
    check(userVersion(db) === 3, 'user_version is 3');
    const f = columns(db, 'films'), fr = columns(db, 'frames');
    check(f.includes('expected_shots') && f.includes('push_pull'), 'films gained expected_shots and push_pull');
    check(fr.includes('lens') && fr.includes('image'), 'frames gained lens and image');
    const film = db.raw.prepare('SELECT * FROM films').get();
    check(film.expected_shots === 36 && film.push_pull === 0, 'existing film row got defaults 36 / 0');
    const frame = db.raw.prepare('SELECT * FROM frames').get();
    check(frame.aperture === 'Auto', 'v2 migration still ran (aperture 0 -> Auto)');
    check(frame.lens === null && frame.image === null, 'existing frame row has NULL lens/image');
    // The app must be able to insert with the new columns afterwards
    const created = await database.createFilm(db, { title: 'HP5', iso: 400, camera: null, status: 'in-camera', expected_shots: 24, push_pull: 1, created_at: '2024-02-01' });
    check(created.expected_shots === 24 && created.push_pull === 1, 'createFilm works after migration');
}

console.log('\nScenario B: late 1.x schema with absolute file:// image paths, user_version 0');
{
    const db = openDb();
    db.raw.exec(`
        CREATE TABLE films (
            id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
            title TEXT NOT NULL, iso INTEGER NOT NULL, camera TEXT,
            expected_shots INTEGER DEFAULT 36, push_pull INTEGER DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'in-camera', frame_count INTEGER NOT NULL,
            created_at DATETIME NOT NULL, completed_at DATETIME
        );
        CREATE TABLE frames (
            id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
            film_id INTEGER NOT NULL, lens TEXT DEFAULT "", aperture TEXT NOT NULL, shutter_speed TEXT NOT NULL,
            image TEXT DEFAULT "", frame_no INTEGER NOT NULL, note TEXT, created_at DATETIME NOT NULL,
            FOREIGN KEY (film_id) REFERENCES films(id) ON DELETE CASCADE
        );
        INSERT INTO films (title, iso, frame_count, created_at) VALUES ('Portra', 400, 3, '2024-01-01');
        INSERT INTO frames (film_id, aperture, shutter_speed, image, frame_no, created_at) VALUES
          (1, 'f/2', '1/125', 'file:///var/mobile/Containers/Data/Application/ABC/Documents/frames/rollio_1.jpg', 1, '2024-01-01'),
          (1, 'f/2', '1/125', 'frames/rollio_2.jpg', 2, '2024-01-01'),
          (1, 'f/2', '1/125', NULL, 3, '2024-01-01'),
          (1, 'f/2', '1/125', 'file:///somewhere/else/x.jpg', 4, '2024-01-01');
    `);
    await initDatabase(db);
    const imgs = db.raw.prepare('SELECT id, image FROM frames ORDER BY id').all().map(r => r.image);
    check(imgs[0] === 'frames/rollio_1.jpg', 'absolute path rewritten to relative');
    check(imgs[1] === 'frames/rollio_2.jpg', 'already-relative path untouched');
    check(imgs[2] === null, 'NULL image untouched');
    check(imgs[3] === 'file:///somewhere/else/x.jpg', 'absolute path without /frames/ left alone');
    check(userVersion(db) === 3, 'user_version is 3');

    // Idempotence: running again must be a no-op
    await initDatabase(db);
    check(userVersion(db) === 3, 'second run keeps version 3');
    check(columns(db, 'frames').filter(c => c === 'image').length === 1, 'no duplicate columns on re-run');
}

console.log('\nScenario C: 2.0 database already at user_version 2');
{
    const db = openDb();
    await initDatabase(db);           // creates fresh schema at v3
    db.raw.exec('PRAGMA user_version = 2');
    db.raw.exec(`INSERT INTO films (title, iso, frame_count, created_at) VALUES ('Gold', 200, 0, '2025-01-01')`);
    await initDatabase(db);
    check(userVersion(db) === 3, 'upgraded 2 -> 3 without error');
    check(db.raw.prepare('SELECT COUNT(*) AS n FROM films').get().n === 1, 'data preserved');
}

console.log('\nScenario D: fresh install');
{
    const db = openDb();
    await initDatabase(db);
    check(userVersion(db) === 3, 'fresh database starts at version 3');
    check(columns(db, 'films').includes('expected_shots'), 'fresh schema has all columns');
}

done();
