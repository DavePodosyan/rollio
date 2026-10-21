// The launch tab preference: which tab the app opens on. Unknown or missing
// stored values fall back to Films so a bad write can never strand the user.
import '../db/harness.mjs';
import assert from 'node:assert/strict';

const { LAUNCH_TAB_KEY, LAUNCH_TABS, DEFAULT_LAUNCH_TAB, parseLaunchTab, launchTabHref } = await import('@/services/launchTab');

assert.equal(LAUNCH_TAB_KEY, 'launch_tab');
assert.deepEqual(LAUNCH_TABS, ['films', 'light_meter']);
assert.equal(DEFAULT_LAUNCH_TAB, 'films');

// stored values round-trip
assert.equal(parseLaunchTab('films'), 'films');
assert.equal(parseLaunchTab('light_meter'), 'light_meter');
// nothing stored yet, or garbage, falls back to the default
assert.equal(parseLaunchTab(null), 'films');
assert.equal(parseLaunchTab(''), 'films');
assert.equal(parseLaunchTab('settings'), 'films');
assert.equal(parseLaunchTab('LIGHT_METER'), 'films');

// each tab maps onto its route inside the tab group
assert.equal(launchTabHref('films'), '/(tabs)/films');
assert.equal(launchTabHref('light_meter'), '/(tabs)/light_meter');

console.log('ALL PASSED');
