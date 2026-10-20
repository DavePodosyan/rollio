// The What's New sheet shows once per update: only when a previous version was
// recorded, and only the entries newer than it.
import '../db/harness.mjs';
import assert from 'node:assert/strict';

const { compareVersions, itemsSince, WHATS_NEW, WHATS_NEW_KEY } = await import('@/services/whatsNew');

assert.equal(WHATS_NEW_KEY, 'whats_new_last_seen_version');

assert.ok(compareVersions('2.2.0', '2.1.7') > 0);
assert.ok(compareVersions('2.10.0', '2.9.0') > 0);
assert.ok(compareVersions('2.2', '2.2.0') === 0);
assert.ok(compareVersions('1.9.9', '2.0.0') < 0);

const item = (name) => ({ sf: name, md: name, titleKey: `t.${name}`, bodyKey: `b.${name}` });
const releases = [
    { version: '2.2.0', items: [item('backup'), item('export')] },
    { version: '2.3.0', items: [item('later')] },
];

// fresh install: nothing to compare against
assert.deepEqual(itemsSince(null, '2.2.0', releases), []);
// same version already seen
assert.deepEqual(itemsSince('2.2.0', '2.2.0', releases), []);
// one update: that version's items
assert.deepEqual(itemsSince('2.1.7', '2.2.0', releases).map((i) => i.sf), ['backup', 'export']);
// skipped two versions: newest first, everything since the last seen one
assert.deepEqual(itemsSince('2.1.7', '2.3.0', releases).map((i) => i.sf), ['later', 'backup', 'export']);
// patch release without notes shows nothing
assert.deepEqual(itemsSince('2.2.0', '2.2.1', releases), []);
// never anything newer than the running app
assert.deepEqual(itemsSince('2.1.0', '2.2.0', releases).map((i) => i.sf), ['backup', 'export']);

// an existing user updating to the first build with this sheet has no stored
// version; the hook passes FIRST_TRACKED_VERSION so everything shows
const { FIRST_TRACKED_VERSION } = await import('@/services/whatsNew');
assert.deepEqual(itemsSince(FIRST_TRACKED_VERSION, '2.3.0', releases).map((i) => i.sf), ['later', 'backup', 'export']);

// the real list is well-formed and has an entry for the current release
assert.ok(WHATS_NEW.some((r) => r.version === '2.2.0'));
for (const release of WHATS_NEW) {
    assert.match(release.version, /^\d+\.\d+\.\d+$/);
    assert.ok(release.items.length > 0);
    for (const i of release.items) assert.ok(i.sf && i.md && i.titleKey && i.bodyKey);
}

console.log('ok');
