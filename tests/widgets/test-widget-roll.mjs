// The roll the widgets show: the in-camera roll with the most recent activity,
// the links their buttons open, and the snapshot handed to the widget views.
import { openDb, database } from '../db/harness.mjs';
import assert from 'node:assert/strict';

const {
    rankRolls, pickCurrentRoll, getInCameraRolls, getCurrentRoll, resolveLogRoll, logFrameHref, rollHref,
    buildWidgetSnapshot, widgetView, widgetRollOptions, parseWidgetSnapshot, widgetChoiceKey, WIDGET_ROLL_LATEST, WIDGET_LINKS,
} = await import('@/services/widgetRoll');

const row = (id, extra = {}) => ({
    id, title: `Film ${id}`, camera: null, iso: 400, frame_count: 0, expected_shots: 36,
    created_at: '2026-01-01T10:00:00.000Z', last_frame_at: null, ...extra,
});

// --- pickCurrentRoll ---------------------------------------------------------
assert.equal(pickCurrentRoll([]), null);
assert.deepEqual(pickCurrentRoll([row(1, { camera: 'Leica M6', frame_count: 15 })]), {
    id: 1, title: 'Film 1', camera: 'Leica M6', iso: 400, frameCount: 15, expectedShots: 36,
});
// the roll logged to most recently wins, whatever order the rows come in
const older = row(1, { last_frame_at: '2026-03-01T09:00:00.000Z' });
const newer = row(2, { last_frame_at: '2026-03-02T09:00:00.000Z' });
assert.equal(pickCurrentRoll([older, newer]).id, 2);
assert.equal(pickCurrentRoll([newer, older]).id, 2);
// a roll loaded after the last frame anywhere is the one in hand, even with no frames yet
const justLoaded = row(3, { created_at: '2026-03-03T09:00:00.000Z' });
assert.equal(pickCurrentRoll([older, newer, justLoaded]).id, 3);
// a frame on an old roll beats a newer roll that has seen nothing since
assert.equal(pickCurrentRoll([row(1, { last_frame_at: '2026-04-01T00:00:00.000Z' }), row(2, { created_at: '2026-03-03T09:00:00.000Z' })]).id, 1);
// same moment: the roll added later
assert.equal(pickCurrentRoll([row(4), row(5)]).id, 5);
assert.equal(pickCurrentRoll([row(5), row(4)]).id, 5);
// an unreadable date never beats a readable one
assert.equal(pickCurrentRoll([row(9, { created_at: 'garbage' }), row(1)]).id, 1);

// every in-camera roll, most recently used first: the widget settings list them in this order
assert.deepEqual(rankRolls([older, justLoaded, newer]).map((r) => r.id), [3, 2, 1]);
assert.deepEqual(rankRolls([]), []);

// --- getCurrentRoll (real schema) --------------------------------------------
const db = openDb();
await database.initDatabase(db);
assert.equal(await getCurrentRoll(db), null);

const film = (title, status, created_at, extra = {}) => database.createFilm(db, {
    title, iso: 400, camera: 'Leica M6', status, expected_shots: 36, push_pull: 0, created_at, ...extra,
});
const frameAt = (film_id, frame_no, created_at) => database.createFrame(db, {
    film_id, frame_no, aperture: '2.8', shutter_speed: '1/125', created_at, image: null,
});

const portra = await film('Kodak Portra 400', 'in-camera', '2026-02-01T10:00:00.000Z');
const hp5 = await film('Ilford HP5', 'in-camera', '2026-02-10T10:00:00.000Z', { camera: null, expected_shots: 24 });
const archived = await film('Fuji Superia', 'archived', '2026-05-01T10:00:00.000Z');
await frameAt(archived.id, 1, '2026-05-02T10:00:00.000Z');

// no frames yet: the roll loaded last
assert.deepEqual(await getCurrentRoll(db), { id: hp5.id, title: 'Ilford HP5', camera: null, iso: 400, frameCount: 0, expectedShots: 24 });
// logging to the older roll makes it current; skipped frames count as activity and as frames
await frameAt(portra.id, 1, '2026-02-11T10:00:00.000Z');
await database.skipFrame(db, portra.id, '2026-02-11T10:05:00.000Z');
assert.deepEqual(await getCurrentRoll(db), { id: portra.id, title: 'Kodak Portra 400', camera: 'Leica M6', iso: 400, frameCount: 2, expectedShots: 36 });
// rolls out of the camera are never current
assert.deepEqual((await getInCameraRolls(db)).map((r) => r.title), ['Kodak Portra 400', 'Ilford HP5']);
await database.updateFilm(db, portra.id, { status: 'developing' });
assert.equal((await getCurrentRoll(db)).id, hp5.id);
await database.updateFilm(db, hp5.id, { status: 'archived' });
assert.equal(await getCurrentRoll(db), null);

// --- links ---------------------------------------------------------------------
assert.deepEqual(WIDGET_LINKS, {
    logFrame: 'rollio:///log-frame',
    lightMeter: 'rollio:///light_meter',
    newFilm: 'rollio:///new-film',
    films: 'rollio:///films',
});
const roll = { id: 7, title: 'Kodak Portra 400', camera: 'Leica M6', iso: 400, frameCount: 15, expectedShots: 36 };
// Log Frame opens the form the roll's own + button opens; with no roll it offers a new one
// (showRoll: after saving, the form opens the roll so it is plain which roll the frame went to)
assert.deepEqual(logFrameHref(roll), { pathname: '/new-frame', params: { mode: 'new', filmId: '7', iso: '400', frameCount: '15', showRoll: '1' } });
assert.equal(logFrameHref(null), '/new-film');
assert.equal(rollHref(7), '/films/7');
assert.equal(rollHref('7'), '/films/7');

// a widget set to one roll logs to that roll for as long as it is in the camera; otherwise to the latest
const hp5Roll = { id: 9, title: 'Ilford HP5', camera: null, iso: 400, frameCount: 0, expectedShots: 24 };
assert.equal(resolveLogRoll([roll, hp5Roll], '9').id, 9);
assert.equal(resolveLogRoll([roll, hp5Roll], undefined).id, 7);
assert.equal(resolveLogRoll([roll, hp5Roll], '').id, 7);
assert.equal(resolveLogRoll([roll, hp5Roll], '123').id, 7);
assert.equal(resolveLogRoll([roll, hp5Roll], 'latest').id, 7);
assert.equal(resolveLogRoll([], '9'), null);

// --- snapshot: everything the widgets need, for every roll a widget may be set to ---
const strings = {
    noRollTitle: 'No roll in camera', noRollBody: 'Load a film to start logging.', startRoll: 'Start a roll',
    logFrame: 'Log Frame', lightMeter: 'Light Meter', framesOf: (count, total) => `${count} of ${total} frames`,
    latestRoll: 'Latest roll', latestRollHint: 'Follows the roll you logged to last',
};
const snapshot = buildWidgetSnapshot([roll, hp5Roll], strings);
assert.deepEqual(snapshot, {
    rolls: [
        { id: '7', title: 'Kodak Portra 400', camera: 'Leica M6', count: 15, total: 36, progressLabel: '15 of 36 frames', rollUrl: 'rollio:///films/7', logUrl: 'rollio:///log-frame?filmId=7' },
        // no camera on the roll: an empty line, never "null"
        { id: '9', title: 'Ilford HP5', camera: '', count: 0, total: 24, progressLabel: '0 of 24 frames', rollUrl: 'rollio:///films/9', logUrl: 'rollio:///log-frame?filmId=9' },
    ],
    logUrl: 'rollio:///log-frame', meterUrl: 'rollio:///light_meter', newRollUrl: 'rollio:///new-film', filmsUrl: 'rollio:///films',
    noRollTitle: 'No roll in camera', noRollBody: 'Load a film to start logging.', startRollLabel: 'Start a roll',
    logFrameLabel: 'Log Frame', lightMeterLabel: 'Light Meter',
});

// --- what one widget draws, given its own setting ---------------------------------
assert.equal(WIDGET_ROLL_LATEST, 'latest');
const latestView = {
    hasRoll: true, title: 'Kodak Portra 400', camera: 'Leica M6', count: 15, total: 36, progressLabel: '15 of 36 frames',
    // the latest roll is looked up again when the link opens, so its link names no roll
    rollUrl: 'rollio:///films/7', logUrl: 'rollio:///log-frame', meterUrl: 'rollio:///light_meter', newRollUrl: 'rollio:///new-film',
    noRollTitle: 'No roll in camera', noRollBody: 'Load a film to start logging.', startRollLabel: 'Start a roll',
    logFrameLabel: 'Log Frame', lightMeterLabel: 'Light Meter',
};
assert.deepEqual(widgetView(snapshot, 'latest'), latestView);
// never set, or set to something unreadable: the latest roll
assert.deepEqual(widgetView(snapshot, null), latestView);
assert.deepEqual(widgetView(snapshot, undefined), latestView);
// set to a roll: that roll, and Log Frame goes to it
const pinnedView = widgetView(snapshot, '9');
assert.deepEqual([pinnedView.title, pinnedView.camera, pinnedView.count, pinnedView.total], ['Ilford HP5', '', 0, 24]);
assert.equal(pinnedView.rollUrl, 'rollio:///films/9');
assert.equal(pinnedView.logUrl, 'rollio:///log-frame?filmId=9');
// set to a roll that has left the camera: back to the latest
assert.deepEqual(widgetView(snapshot, '123'), latestView);
// no roll at all: nothing roll-shaped leaks through, and the roll area opens the film list
const empty = widgetView(buildWidgetSnapshot([], strings), '9');
assert.equal(empty.hasRoll, false);
assert.deepEqual([empty.title, empty.camera, empty.count, empty.total, empty.progressLabel], ['', '', 0, 0, '']);
assert.equal(empty.rollUrl, 'rollio:///films');
assert.equal(empty.logUrl, 'rollio:///log-frame');
assert.equal(empty.newRollUrl, 'rollio:///new-film');

// --- the choices a widget's settings offer ----------------------------------------
assert.deepEqual(widgetRollOptions(snapshot, strings), [
    { name: 'Latest roll', value: 'latest', subtitle: 'Follows the roll you logged to last' },
    { name: 'Kodak Portra 400', value: '7', subtitle: 'Leica M6 · 15/36' },
    // rolls often share a name; the count tells them apart even without a camera
    { name: 'Ilford HP5', value: '9', subtitle: '0/24' },
]);
assert.deepEqual(widgetRollOptions(buildWidgetSnapshot([], strings), strings).map((o) => o.value), ['latest']);
// each Android widget keeps its own choice
assert.equal(widgetChoiceKey(42), 'widget_roll_choice_42');

// --- stored snapshot (Android redraws from it without the app running) -------------
const stored = JSON.stringify(snapshot);
assert.deepEqual(parseWidgetSnapshot(stored), snapshot);
assert.deepEqual(parseWidgetSnapshot(JSON.stringify(buildWidgetSnapshot([], strings))).rolls, []);
// nothing stored yet, or something unreadable: the widget shows nothing rather than a wrong roll
assert.equal(parseWidgetSnapshot(null), null);
assert.equal(parseWidgetSnapshot(''), null);
assert.equal(parseWidgetSnapshot('{not json'), null);
assert.equal(parseWidgetSnapshot('"a string"'), null);
assert.equal(parseWidgetSnapshot(JSON.stringify({ rolls: [] })), null);
assert.equal(parseWidgetSnapshot(JSON.stringify({ ...snapshot, rolls: 'none' })), null);
assert.equal(parseWidgetSnapshot(JSON.stringify({ ...snapshot, rolls: [{ id: 7 }] })), null);

console.log('ALL PASSED');
