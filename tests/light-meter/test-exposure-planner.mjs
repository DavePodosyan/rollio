// The exposure planner: the EV ruler's range, the scene each EV falls in,
// how an EV is printed, which column moves when the EV changes, and the
// exposure calculators shared with the reading sheet.
import '../db/harness.mjs';
import assert from 'node:assert/strict';

const {
    EV_PLANNER_MIN, EV_PLANNER_MAX, EV_PLANNER_DEFAULT, EV_PLANNER_VALUES,
    EV_SCENES, sceneForEv, formatEv, columnToMoveForEv,
    evFor, calculateShutter, calculateAperture, calculateIso,
} = await import('@/services/exposurePlanner');

// ruler range: thirds from -3 to 17, 61 ticks, default on a tick
assert.equal(EV_PLANNER_MIN, -3);
assert.equal(EV_PLANNER_MAX, 17);
assert.equal(EV_PLANNER_DEFAULT, 15);
assert.equal(EV_PLANNER_VALUES.length, 61);
assert.equal(EV_PLANNER_VALUES[0], -3);
assert.equal(EV_PLANNER_VALUES.at(-1), 17);
for (let i = 1; i < EV_PLANNER_VALUES.length; i++) {
    assert.ok(Math.abs(EV_PLANNER_VALUES[i] - EV_PLANNER_VALUES[i - 1] - 1 / 3) < 1e-9, `step ${i}`);
}
assert.ok(EV_PLANNER_VALUES.includes(EV_PLANNER_DEFAULT));

// scene table: 16 whole stops, brightest first, each with both glyphs
assert.equal(EV_SCENES.length, 16);
assert.deepEqual(EV_SCENES.map((s) => s.ev), [16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
assert.deepEqual(EV_SCENES.map((s) => s.key), [
    'snow', 'sun', 'hazySun', 'brightOvercast', 'overcast', 'heavyOvercast', 'sunset', 'afterSunset',
    'brightInterior', 'litStreet', 'homeInterior', 'dimInterior', 'candlelight', 'distantLights', 'nightSkyline', 'moonlight',
]);
for (const s of EV_SCENES) {
    assert.ok(s.sf.length > 0 && s.md.length > 0, s.key);
}

// bands are ±½ stop around the whole stop; a boundary belongs to the brighter band; ends are open
assert.equal(sceneForEv(15).key, 'sun');
assert.equal(sceneForEv(15.4).key, 'sun');
assert.equal(sceneForEv(15.5).key, 'snow');
assert.equal(sceneForEv(14.5).key, 'sun');
assert.equal(sceneForEv(17).key, 'snow');
assert.equal(sceneForEv(12 + 1 / 3).key, 'overcast');
assert.equal(sceneForEv(1.4).key, 'moonlight');
assert.equal(sceneForEv(-3).key, 'moonlight');

// thirds print as vulgar fractions
assert.equal(formatEv(15), '15');
assert.equal(formatEv(12 + 1 / 3), '12⅓');
assert.equal(formatEv(12 + 2 / 3), '12⅔');
assert.equal(formatEv(-1 - 1 / 3), '-1⅓');
assert.equal(formatEv(0), '0');
assert.equal(formatEv(-2 / 3), '-⅔');

// on an EV change the shutter moves unless it is the locked column; ISO never moves
assert.equal(columnToMoveForEv(null, false), 'shutter');
assert.equal(columnToMoveForEv('shutter', false), 'aperture');
assert.equal(columnToMoveForEv('aperture', false), 'shutter');
assert.equal(columnToMoveForEv('iso', false), 'shutter');
assert.equal(columnToMoveForEv(null, true), 'shutter');

// Sunny 16 round trips through the calculators
assert.ok(Math.abs(evFor(16, 1 / 125, 100) - 15) < 0.05);
assert.ok(Math.abs(calculateShutter(16, 100, 15) - 1 / 125) / (1 / 125) < 0.03);
assert.ok(Math.abs(calculateAperture(1 / 125, 100, 15) - 16) / 16 < 0.03);
assert.ok(Math.abs(calculateIso(16, 1 / 125, 15) - 100) / 100 < 0.03);

console.log('ALL PASSED');

// full stops only: the ruler ticks in whole EVs, one per scene, and a third
// lands on its nearest whole stop; with thirds showing nothing changes
{
    const { EV_PLANNER_WHOLE_VALUES, plannerEvValues, snapEvToStops } = await import('@/services/exposurePlanner');
    assert.equal(EV_PLANNER_WHOLE_VALUES.length, 21);
    assert.equal(EV_PLANNER_WHOLE_VALUES[0], -3);
    assert.equal(EV_PLANNER_WHOLE_VALUES.at(-1), 17);
    assert.ok(EV_PLANNER_WHOLE_VALUES.every((v) => Number.isInteger(v)));
    assert.ok(EV_PLANNER_WHOLE_VALUES.includes(EV_PLANNER_DEFAULT));
    assert.equal(plannerEvValues(true), EV_PLANNER_WHOLE_VALUES);
    assert.equal(plannerEvValues(false), EV_PLANNER_VALUES);
    assert.equal(snapEvToStops(9 + 1 / 3, true), 9);
    assert.equal(snapEvToStops(9 + 2 / 3, true), 10);
    assert.equal(snapEvToStops(-2 / 3, true), -1);
    assert.equal(snapEvToStops(9, true), 9);
    assert.equal(snapEvToStops(9 + 1 / 3, false), 9 + 1 / 3);
    assert.equal(snapEvToStops(17.2, true), 17);
    assert.equal(snapEvToStops(-3.4, false), -3);
}
