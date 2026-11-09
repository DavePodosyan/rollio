import { openDb, database, fsStub, check, done } from './harness.mjs';

const { initDatabase, createFilm, createFrame, updateFrame, deleteFrame, deleteFilm, getFilmById, getFramesByFilmId, getFrameById, skipFrame } = database;

async function fresh() {
    const db = openDb();
    await initDatabase(db);
    const film = await createFilm(db, { title: 'Portra', iso: 400, camera: null, status: 'in-camera', expected_shots: 36, push_pull: 0, created_at: '2025-01-01' });
    return { db, film };
}
const frameInput = (film_id, n, image = null) => ({ film_id, aperture: 'f/2', shutter_speed: '1/125', frame_no: n, created_at: '2025-01-01', image });

console.log('createFrame: insert and frame_count move together');
{
    const { db, film } = await fresh();
    await createFrame(db, frameInput(film.id, 1));
    await createFrame(db, frameInput(film.id, 2));
    check((await getFilmById(db, film.id)).frame_count === 2, 'frame_count is 2 after two inserts');

    // Make the frame_count update fail: a trigger that aborts the UPDATE on films.
    db.raw.exec(`CREATE TRIGGER boom BEFORE UPDATE OF frame_count ON films BEGIN SELECT RAISE(ABORT, 'simulated'); END;`);
    let threw = false;
    try { await createFrame(db, frameInput(film.id, 3)); } catch { threw = true; }
    db.raw.exec('DROP TRIGGER boom');
    check(threw, 'createFrame rejects when the count update fails');
    check((await getFramesByFilmId(db, film.id)).length === 2, 'the orphan frame row was rolled back');
    check((await getFilmById(db, film.id)).frame_count === 2, 'frame_count unchanged after rollback');
    check(db.raw.prepare('SELECT * FROM sqlite_master WHERE type=\'trigger\'').all().length === 0, 'test trigger removed');
    // Connection still usable (transaction properly ended)
    await createFrame(db, frameInput(film.id, 3));
    check((await getFilmById(db, film.id)).frame_count === 3, 'connection works after rollback');
}

console.log('\ndeleteFrame: file removed only after the row is gone');
{
    const { db, film } = await fresh();
    const f = await createFrame(db, frameInput(film.id, 1, 'frames/rollio_a.jpg'));
    fsStub.deleted.length = 0;
    await deleteFrame(db, f.id);
    check(fsStub.deleted.includes('DOC/frames/rollio_a.jpg'), 'image file deleted on success');
    check((await getFilmById(db, film.id)).frame_count === 0, 'frame_count recounted to 0');

    const g = await createFrame(db, frameInput(film.id, 2, 'frames/rollio_b.jpg'));
    fsStub.deleted.length = 0;
    db.raw.exec(`CREATE TRIGGER boom BEFORE UPDATE OF frame_count ON films BEGIN SELECT RAISE(ABORT, 'simulated'); END;`);
    let threw = false;
    try { await deleteFrame(db, g.id); } catch { threw = true; }
    db.raw.exec('DROP TRIGGER boom');
    check(threw, 'deleteFrame rejects when the recount fails');
    check((await getFramesByFilmId(db, film.id)).length === 1, 'frame row still present after rollback');
    check(fsStub.deleted.length === 0, 'image file NOT deleted when the row delete rolled back');
}

console.log('\ndeleteFilm: files removed only after the row is gone');
{
    const { db, film } = await fresh();
    await createFrame(db, frameInput(film.id, 1, 'frames/rollio_c.jpg'));
    await createFrame(db, frameInput(film.id, 2, null));
    fsStub.deleted.length = 0;
    await deleteFilm(db, film.id);
    check((await getFilmById(db, film.id)) === null, 'film row deleted');
    check((await getFramesByFilmId(db, film.id)).length === 0, 'frames cascaded');
    check(fsStub.deleted.length === 1 && fsStub.deleted[0] === 'DOC/frames/rollio_c.jpg', 'only the one image file deleted');

    const { db: db2, film: film2 } = await fresh();
    await createFrame(db2, frameInput(film2.id, 1, 'frames/rollio_d.jpg'));
    fsStub.deleted.length = 0;
    db2.raw.exec(`CREATE TRIGGER boom BEFORE DELETE ON films BEGIN SELECT RAISE(ABORT, 'simulated'); END;`);
    let threw = false;
    try { await deleteFilm(db2, film2.id); } catch { threw = true; }
    check(threw, 'deleteFilm rejects when the row delete fails');
    check(fsStub.deleted.length === 0, 'no files deleted when the row delete failed');
}

console.log('\nlocation: rounded, both-or-neither, clearable');
{
    const { db, film } = await fresh();
    const a = await createFrame(db, { ...frameInput(film.id, 1), latitude: 40.18723456, longitude: 44.51523456, location_accuracy: 12.34, place: 'Mashtots Ave, Yerevan' });
    check(a.latitude === 40.187235 && a.longitude === 44.515235, 'coordinates rounded to 6 decimals');
    check(a.location_accuracy === 12.3 && a.place === 'Mashtots Ave, Yerevan', 'accuracy rounded to 1 decimal, place kept');
    const b = await createFrame(db, { ...frameInput(film.id, 2), latitude: 40.1 });
    check(b.latitude === null && b.longitude === null && b.location_accuracy === null && b.place === null, 'latitude alone stores nothing');
    const c = await createFrame(db, frameInput(film.id, 3));
    check(c.latitude === null && c.longitude === null, 'no location by default');
    const cleared = await updateFrame(db, a.id, { latitude: null, longitude: null, location_accuracy: null, place: null });
    check(cleared.latitude === null && cleared.place === null, 'updateFrame clears the location');
    const kept = await updateFrame(db, a.id, { latitude: 1.5, longitude: 2.5, location_accuracy: null, place: null });
    check(kept.latitude === 1.5 && kept.longitude === 2.5 && kept.location_accuracy === null, 'updateFrame stores a location with unknown accuracy');
    let threw = false;
    try { await updateFrame(db, 99999, { latitude: null, longitude: null, location_accuracy: null, place: null }); } catch { threw = true; }
    check(threw, 'updateFrame on a missing id throws');
}

console.log('\nskipFrame: logs the next frame as skipped');
{
    const { db, film } = await fresh();
    const first = await skipFrame(db, film.id, '2025-03-01T10:00:00.000Z');
    check(first.frame_no === 1 && first.skipped === 1, 'an empty roll skips frame 1');
    check(first.aperture === 'Auto' && first.shutter_speed === 'Auto' && first.lens === null && first.image === null, 'a skipped frame carries no exposure data');
    check(first.created_at === '2025-03-01T10:00:00.000Z', 'keeps the given time');
    check((await getFilmById(db, film.id)).frame_count === 1, 'frame_count counts the skipped frame');

    const logged = await createFrame(db, frameInput(film.id, 2));
    check(logged.skipped === 0, 'a normal frame is not skipped');
    await createFrame(db, frameInput(film.id, 7));
    const next = await skipFrame(db, film.id, '2025-03-02T10:00:00.000Z');
    check(next.frame_no === 8, 'skips the number after the highest one, across gaps');
    check((await getFilmById(db, film.id)).frame_count === 4, 'frame_count is 4 after two logged and two skipped');

    const { db: other } = await fresh();
    let threw = false;
    try { await skipFrame(other, 9999, '2025-03-01T10:00:00.000Z'); } catch { threw = true; }
    check(threw, 'skipFrame on a missing film throws');
    check(other.raw.prepare('SELECT COUNT(*) AS n FROM frames').get().n === 0, 'and leaves no orphan frame');
}

console.log('\nupdateFrame: a skipped frame can be logged after all, and keeps its note meanwhile');
{
    const { db, film } = await fresh();
    const skipped = await skipFrame(db, film.id, '2025-03-01T10:00:00.000Z');
    const noted = await updateFrame(db, skipped.id, { note: 'Lens cap on' });
    check(noted.skipped === 1 && noted.note === 'Lens cap on', 'a note does not un-skip the frame');
    await updateFrame(db, skipped.id, { skipped: 0, aperture: '2.8', shutter_speed: '1/60', lens: '50mm' });
    const stored = await getFrameById(db, skipped.id);
    check(stored.skipped === 0 && stored.aperture === '2.8' && stored.shutter_speed === '1/60' && stored.lens === '50mm', 'the frame is stored as a normal frame');
    check(stored.frame_no === skipped.frame_no && stored.note === 'Lens cap on', 'number and note are kept');
    check((await getFilmById(db, film.id)).frame_count === 1, 'frame_count unchanged');
}

done();
