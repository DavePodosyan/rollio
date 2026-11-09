// Pure rules for skipped frames: what counts as skipped, and which frame a
// new frame copies its settings from.
import '../db/harness.mjs';
import assert from 'node:assert/strict';

const { isSkipped, lastLoggedFrame } = await import('@/services/skippedFrames');

const frame = (no, extra = {}) => ({ id: no, frame_no: no, aperture: '2.8', shutter_speed: '1/125', lens: '50mm', skipped: 0, ...extra });

assert.equal(isSkipped(frame(1)), false);
assert.equal(isSkipped(frame(1, { skipped: 1 })), true);
// rows read before the column existed, and nothing at all
assert.equal(isSkipped({ ...frame(1), skipped: undefined }), false);
assert.equal(isSkipped(null), false);

// the settings to copy come from the last frame that has any
assert.equal(lastLoggedFrame([]), null);
assert.equal(lastLoggedFrame([frame(1), frame(2)]).frame_no, 2);
assert.equal(lastLoggedFrame([frame(1), frame(2, { skipped: 1 }), frame(3, { skipped: 1 })]).frame_no, 1);
assert.equal(lastLoggedFrame([frame(1, { skipped: 1 })]), null);
// order of the list does not matter
assert.equal(lastLoggedFrame([frame(3, { skipped: 1 }), frame(2), frame(1)]).frame_no, 2);

// a skipped frame being logged after all copies from the frames before it
assert.equal(lastLoggedFrame([frame(1), frame(2, { skipped: 1 }), frame(3)], 2).frame_no, 1);
assert.equal(lastLoggedFrame([frame(1, { skipped: 1 }), frame(2)], 1), null);

console.log('ok');
