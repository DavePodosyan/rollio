// Exercises the pure frame-location helpers under Node: rounding, labels,
// maps URLs and the two-line subtitle of the fixed row state.
import '../db/harness.mjs';
import assert from 'node:assert/strict';

const L = await import('@/services/frameLocation');

assert.equal(L.LOCATION_CHOICE_KEY, 'frame_location_enabled');
assert.equal(L.FINDING_TIMEOUT_MS, 10000);
assert.equal(L.LATE_FILL_TIMEOUT_MS, 60000);
assert.equal(L.LAST_KNOWN_MAX_AGE_MS, 120000);

assert.equal(L.roundCoordinate(40.18723456), 40.187235);
assert.equal(L.roundCoordinate(-151.2092961), -151.209296);
assert.equal(L.roundAccuracy(12.34), 12.3);
assert.equal(L.roundAccuracy(null), null);
assert.equal(L.roundAccuracy(NaN), null);

assert.equal(L.hasLocation({ latitude: 1, longitude: 2 }), true);
assert.equal(L.hasLocation({ latitude: 1, longitude: null }), false);
assert.equal(L.hasLocation(null), false);

assert.equal(L.formatCoordinates(40.187235, 44.515235), '40.1872, 44.5152');
assert.equal(L.formatCoordinates(-33.86882, 151.2), '-33.8688, 151.2000');

// placeLabel: street (or name), city (or region), country; whichever exist
assert.equal(L.placeLabel({ street: 'Spandauer Straße', city: 'Berlin', country: 'Germany', name: '1' }), 'Spandauer Straße, Berlin, Germany');
assert.equal(L.placeLabel({ street: 'Mashtots Ave', city: 'Yerevan', name: '12' }), 'Mashtots Ave, Yerevan');
assert.equal(L.placeLabel({ street: null, name: 'Tower Bridge', city: 'London', country: 'United Kingdom' }), 'Tower Bridge, London, United Kingdom');
assert.equal(L.placeLabel({ city: 'Yerevan', country: 'Armenia' }), 'Yerevan, Armenia');
assert.equal(L.placeLabel({ region: 'Kotayk', subregion: null, country: 'Armenia' }), 'Kotayk, Armenia');
assert.equal(L.placeLabel({ country: 'Armenia' }), 'Armenia');
assert.equal(L.placeLabel({ street: 'Only St' }), 'Only St');
assert.equal(L.placeLabel({}), null);
assert.equal(L.placeLabel(null), null);

// mapsUrl per platform; label encoded
const args = { latitude: 40.187235, longitude: 44.515235, label: 'Frame 3' };
assert.equal(L.mapsUrl({ ...args, platform: 'ios' }), 'maps://?ll=40.187235,44.515235&q=Frame%203');
assert.equal(L.mapsUrl({ ...args, platform: 'android' }), 'geo:40.187235,44.515235?q=40.187235,44.515235(Frame%203)');
assert.equal(L.mapsUrl({ ...args, platform: 'web' }), 'https://www.google.com/maps/search/?api=1&query=40.187235,44.515235');
// mapsUrl encodes the label
assert.equal(L.mapsUrl({ ...args, label: 'Ave, "B" & Ç', platform: 'ios' }), 'maps://?ll=40.187235,44.515235&q=Ave%2C%20%22B%22%20%26%20%C3%87');
assert.equal(L.mapsUrl({ ...args, label: 'a(b)', platform: 'android' }), 'geo:40.187235,44.515235?q=40.187235,44.515235(a%28b%29)');

// placeLines: street on its own line, city and country together
assert.deepEqual(L.placeLines('Spandauer Straße, Berlin, Germany'), ['Spandauer Straße', 'Berlin, Germany']);
assert.deepEqual(L.placeLines('Yerevan, Armenia'), ['Yerevan', 'Armenia']);
assert.deepEqual(L.placeLines('Armenia'), ['Armenia']);

// fixToFields
assert.deepEqual(L.fixToFields({ latitude: 1, longitude: 2, accuracy: 3, place: 'x' }), { latitude: 1, longitude: 2, location_accuracy: 3, place: 'x' });
assert.deepEqual(L.fixToFields(null), { latitude: null, longitude: null, location_accuracy: null, place: null });

// fixedSubtitle: "On" with the accuracy when known
const strings = { on: 'On', accuracy: (m) => `±${m} m` };
assert.equal(L.fixedSubtitle({ latitude: 40.187235, longitude: 44.515235, accuracy: 12.3, place: 'Mashtots Ave, Yerevan' }, strings), 'On · ±12 m');
assert.equal(L.fixedSubtitle({ latitude: 40.187235, longitude: 44.515235, accuracy: 7.8, place: null }, strings), 'On · ±8 m');
assert.equal(L.fixedSubtitle({ latitude: 40.187235, longitude: 44.515235, accuracy: null, place: null }, strings), 'On');

console.log('ok');
