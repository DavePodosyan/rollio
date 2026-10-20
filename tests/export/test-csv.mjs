// Exercises the pure CSV builder and file-name helper under Node.
import '../db/harness.mjs';
import assert from 'node:assert/strict';

const { buildFilmCsv, exportFileName, CSV_BOM } = await import('@/services/exportCsv');

const film = {
    id: 1, title: 'Portra 400, "Trip"', iso: 400, camera: 'Leica M6', status: 'archived',
    expected_shots: 36, push_pull: 1, frame_count: 3,
    created_at: '2026-10-12T08:00:00.000Z', completed_at: null,
};
const frames = [
    { id: 12, film_id: 1, frame_no: 2, aperture: '2.8', shutter_speed: '1/500', lens: null, note: 'line one\nline two', image: null, created_at: '2026-10-12T09:00:00.000Z', latitude: null, longitude: null },
    { id: 11, film_id: 1, frame_no: 1, aperture: 'Auto', shutter_speed: 'Auto', lens: '50mm', note: null, image: 'frames/a.jpg', created_at: '2026-10-12T08:30:00.000Z', latitude: 40.1872, longitude: 44.5152 },
    { id: 13, film_id: 1, frame_no: 3, aperture: '4', shutter_speed: '1/125', lens: '35mm', note: 'said "hi"', image: null, created_at: '2026-10-12T10:00:00.000Z', latitude: null, longitude: null },
];
const header = 'Film,Camera,ISO,Push/Pull,Status,Frame,Date,Aperture,Shutter,Lens,Note,Latitude,Longitude';

// builds exact csv
{
    const expected = '﻿' + header + '\r\n'
        + '"Portra 400, ""Trip""",Leica M6,400,1,archived,1,2026-10-12T08:30:00.000Z,Auto,Auto,50mm,,40.1872,44.5152\r\n'
        + '"Portra 400, ""Trip""",Leica M6,400,1,archived,2,2026-10-12T09:00:00.000Z,2.8,1/500,,"line one\nline two",,\r\n'
        + '"Portra 400, ""Trip""",Leica M6,400,1,archived,3,2026-10-12T10:00:00.000Z,4,1/125,35mm,"said ""hi""",,\r\n';
    assert.equal(buildFilmCsv(film, frames), expected);
    assert.equal(CSV_BOM, '﻿');
}

// sorts rows by frame number
{
    const rows = buildFilmCsv({ ...film, title: 'Plain' }, frames).split('\r\n').slice(1, 4);
    assert.deepEqual(rows.map((r) => r.split(',')[5]), ['1', '2', '3']);
}

// empty film is header only
assert.equal(buildFilmCsv({ ...film, camera: null }, []), '﻿' + header + '\r\n');

// null camera is an empty field
assert.ok(buildFilmCsv({ ...film, camera: null }, frames.slice(0, 1)).includes(',,400,'));

// negative push pull
assert.ok(buildFilmCsv({ ...film, push_pull: -0.5 }, frames.slice(0, 1)).includes(',400,-0.5,archived,'));

// prints negative coordinates as-is
assert.ok(buildFilmCsv({ ...film, title: 'Neg' }, [{ ...frames[0], latitude: -33.86882, longitude: -151.209296 }]).includes('"line one\nline two",-33.86882,-151.209296\r\n'));

// exportFileName sanitizes
assert.equal(exportFileName(' My/Roll: "B&W"? ', 'Contact Sheet', 'pdf'), 'My Roll B&W – Contact Sheet.pdf');
assert.equal(exportFileName('', null, 'csv'), 'Film.csv');
assert.equal(exportFileName('Tab\there', null, 'csv'), 'Tab here.csv');
{
    const long = 'x'.repeat(90);
    assert.equal(exportFileName(long, 'Contact Sheet', 'pdf'), 'x'.repeat(60) + ' – Contact Sheet.pdf');
}

console.log('ok');
