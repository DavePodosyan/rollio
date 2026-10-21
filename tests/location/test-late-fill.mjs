// The late-fill registry: a frame saved before its fix arrived gets the fix
// written later, unless the fill is cancelled, replaced or times out.
import '../db/harness.mjs';
import assert from 'node:assert/strict';

const { scheduleLateFill, cancelLateFill, hasPendingLateFill } = await import('@/services/lateFill');

const fix = { latitude: 1, longitude: 2, accuracy: 3, place: null };
const tick = () => new Promise((r) => setTimeout(r, 20));
const deferred = () => {
    let resolve;
    const promise = new Promise((r) => { resolve = r; });
    return { promise, resolve };
};

// a fix that arrives is written once
{
    const d = deferred();
    const writes = [];
    scheduleLateFill(1, d.promise, async (f) => { writes.push(f); }, 1000);
    assert.equal(hasPendingLateFill(1), true);
    d.resolve(fix);
    await tick();
    assert.deepEqual(writes, [fix]);
    assert.equal(hasPendingLateFill(1), false);
}

// cancelled before the fix arrives: nothing is written
{
    const d = deferred();
    const writes = [];
    scheduleLateFill(2, d.promise, async (f) => { writes.push(f); }, 1000);
    cancelLateFill(2);
    assert.equal(hasPendingLateFill(2), false);
    d.resolve(fix);
    await tick();
    assert.deepEqual(writes, []);
}

// a newer fill for the same frame replaces the older one
{
    const first = deferred();
    const second = deferred();
    const writes = [];
    scheduleLateFill(3, first.promise, async () => { writes.push('first'); }, 1000);
    scheduleLateFill(3, second.promise, async () => { writes.push('second'); }, 1000);
    first.resolve(fix);
    second.resolve(fix);
    await tick();
    assert.deepEqual(writes, ['second']);
}

// a null fix (request failed) writes nothing
{
    const d = deferred();
    const writes = [];
    scheduleLateFill(4, d.promise, async (f) => { writes.push(f); }, 1000);
    d.resolve(null);
    await tick();
    assert.deepEqual(writes, []);
    assert.equal(hasPendingLateFill(4), false);
}

// timing out writes nothing even if the fix arrives later
{
    const d = deferred();
    const writes = [];
    scheduleLateFill(5, d.promise, async (f) => { writes.push(f); }, 10);
    await new Promise((r) => setTimeout(r, 40));
    d.resolve(fix);
    await tick();
    assert.deepEqual(writes, []);
    assert.equal(hasPendingLateFill(5), false);
}

// cancelled while the write is busy (reverse geocoding): the write can tell
{
    const d = deferred();
    const lookup = deferred();
    const writes = [];
    scheduleLateFill(7, d.promise, async (f, stillWanted) => {
        await lookup.promise;
        if (!stillWanted()) return;
        writes.push(f);
    }, 1000);
    d.resolve(fix);
    await tick();
    cancelLateFill(7);
    lookup.resolve();
    await tick();
    assert.deepEqual(writes, []);
    assert.equal(hasPendingLateFill(7), false);
}

// a failing write (frame deleted meanwhile) is swallowed, not thrown
{
    const d = deferred();
    let unhandled = false;
    const onUnhandled = () => { unhandled = true; };
    process.on('unhandledRejection', onUnhandled);
    scheduleLateFill(6, d.promise, async () => { throw new Error('Frame with id 6 not found'); }, 1000);
    d.resolve(fix);
    await tick();
    process.off('unhandledRejection', onUnhandled);
    assert.equal(unhandled, false);
    assert.equal(hasPendingLateFill(6), false);
}

console.log('ok');
