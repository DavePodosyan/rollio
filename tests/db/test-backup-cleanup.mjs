// The launch-time cache sweep must recognise every temporary artifact the app
// leaves in the cache (backup staging, restore unpacking, picked copies,
// export folders) and nothing else.
import './harness.mjs';
import assert from 'node:assert/strict';

const { isStaleCacheEntry, EXPORT_PREFIX } = await import('@/services/backup');

assert.equal(EXPORT_PREFIX, 'export-');

assert.equal(isStaleCacheEntry('export-1760000000', true), true);
assert.equal(isStaleCacheEntry('backup-1', true), true);
assert.equal(isStaleCacheEntry('restore-1', true), true);
assert.equal(isStaleCacheEntry('Rollio Backup.rollio', false), true);
assert.equal(isStaleCacheEntry('restore-input-1.zip', false), true);

assert.equal(isStaleCacheEntry('export-1', false), false);
assert.equal(isStaleCacheEntry('frames', true), false);
assert.equal(isStaleCacheEntry('rollio.db', false), false);

console.log('ok');
