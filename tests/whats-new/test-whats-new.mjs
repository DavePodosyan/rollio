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

// 2.3.0: frame location; 2.3.1: the launch tab; 2.4.0: the exposure planner; 2.4.1: color contact sheets;
// 2.5.0: skipping a frame and the What's New history; 2.6.0: home screen widgets
assert.ok(WHATS_NEW.some((r) => r.version === '2.3.0'), 'has a 2.3.0 entry');
assert.equal(WHATS_NEW[0].version, '2.6.0', 'newest release first');
assert.deepEqual(itemsSince('2.4.0', '2.4.1').map((i) => i.titleKey), ['whatsNew.releases.2_4_1.contactSheet.title']);
assert.deepEqual(itemsSince('2.3.1', '2.4.0').map((i) => i.titleKey), ['whatsNew.releases.2_4_0.planner.title']);
assert.deepEqual(itemsSince('2.3.0', '2.3.1').map((i) => i.titleKey), ['whatsNew.releases.2_3_1.launchTab.title']);
assert.deepEqual(itemsSince('2.2.0', '2.3.1').map((i) => i.titleKey), [
    'whatsNew.releases.2_3_1.launchTab.title',
    'whatsNew.releases.2_3_0.location.title',
]);
assert.deepEqual(itemsSince('2.4.1', '2.5.0').map((i) => i.titleKey), [
    'whatsNew.releases.2_5_0.skipFrame.title',
    'whatsNew.releases.2_5_0.history.title',
]);
assert.deepEqual(itemsSince('2.5.0', '2.6.0').map((i) => i.titleKey), [
    'whatsNew.releases.2_6_0.widgets.title',
    'whatsNew.releases.2_6_0.widgetRoll.title',
]);
// every announced item has its text in all three languages
{
    const fs = await import('node:fs');
    const at = (obj, key) => key.split('.').reduce((o, k) => o?.[k], obj);
    for (const lang of ['en', 'ja', 'ko']) {
        const strings = JSON.parse(fs.readFileSync(new URL(`../../i18n/locales/${lang}.json`, import.meta.url), 'utf8'));
        for (const release of WHATS_NEW) for (const i of release.items) {
            assert.equal(typeof at(strings, i.titleKey), 'string', `${lang} is missing ${i.titleKey}`);
            assert.equal(typeof at(strings, i.bodyKey), 'string', `${lang} is missing ${i.bodyKey}`);
        }
    }
}

// The history page in Settings: every release up to the running app, newest
// first, grouped by version. Unlike the sheet it needs no "last seen".
{
    const { releasesUpTo } = await import('@/services/whatsNew');
    const shuffled = [releases[0], { version: '2.10.0', items: [item('future')] }, releases[1]];
    assert.deepEqual(releasesUpTo('2.3.0', shuffled).map((r) => r.version), ['2.3.0', '2.2.0']);
    assert.deepEqual(releasesUpTo('2.2.5', shuffled).map((r) => r.version), ['2.2.0']);
    assert.deepEqual(releasesUpTo('2.10.0', shuffled).map((r) => r.version), ['2.10.0', '2.3.0', '2.2.0']);
    assert.deepEqual(releasesUpTo('2.0.0', shuffled), []);
    // an unknown version (a build without one) hides nothing
    assert.deepEqual(releasesUpTo('', shuffled).map((r) => r.version), ['2.10.0', '2.3.0', '2.2.0']);
    // items come through untouched
    assert.deepEqual(releasesUpTo('2.2.0', shuffled)[0].items.map((i) => i.sf), ['backup', 'export']);
    // every string of the real list exists in every language
    const fs = await import('node:fs');
    for (const lang of ['en', 'ja', 'ko']) {
        const strings = JSON.parse(fs.readFileSync(new URL(`../../i18n/locales/${lang}.json`, import.meta.url), 'utf8'));
        const lookup = (key) => key.split('.').reduce((node, part) => node?.[part], strings);
        for (const release of WHATS_NEW) {
            for (const i of release.items) {
                assert.equal(typeof lookup(i.titleKey), 'string', `${lang} has ${i.titleKey}`);
                assert.equal(typeof lookup(i.bodyKey), 'string', `${lang} has ${i.bodyKey}`);
            }
        }
    }
}
