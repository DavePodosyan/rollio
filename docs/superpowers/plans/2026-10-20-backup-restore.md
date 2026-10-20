# Backup and Restore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user create one `.rollio` backup file (database + frame photos) from Settings, hand it to the system share sheet, and later restore it, replacing all current data after an explicit warning.

**Architecture:** A pure database layer (`services/backupDb.ts`) does snapshot/validate/replace against an `SQLiteDatabase` and is unit-tested under Node. A file layer (`services/backup.ts`) builds and unpacks the zip archive, orchestrates share/pick, and owns the rollback of the `frames/` folder. The Settings screen adds one glass card with two rows and a footnote, driven by a small hook.

**Tech Stack:** Expo SDK 58, React Native 0.88, expo-sqlite (SQLite 3.53), expo-file-system `File`/`Directory`/`Paths`, expo-sharing 58, react-native-zip-archive 9.5.x, `expo-sqlite/kv-store`, Node 26 `node:sqlite` for tests.

**Spec:** `docs/superpowers/specs/2026-10-20-backup-restore-design.md`

## Global Constraints

- Archive extension `.rollio`; default name `Rollio Backup YYYY-MM-DD.rollio`; it is a standard zip.
- Archive layout: `manifest.json`, `rollio.db`, `frames/…` at the root.
- Manifest fields: `format: 1`, `schemaVersion`, `appVersion`, `createdAt` (ISO 8601), `platform` (`ios` | `android`), `filmCount`, `frameCount`, `imageCount`.
- Database snapshot via `VACUUM INTO`; never copy the live `rollio.db` / `-wal` / `-shm`.
- Restore replaces, never merges; the confirmation alert must say all current films, frames and photos will be deleted and replaced, cannot be undone, and show the backup's date and roll count; the destructive button uses the platform destructive style and is not the default.
- Restore refuses a backup whose `schemaVersion` is newer than the app's target version, with a message to update Rollio.
- Imported database is migrated with the same `initDatabase` used at startup; row copy uses explicit column lists; autoincrement counters reset.
- Live SQLite connection is never closed; no restart.
- Picker is unfiltered; validation rejects non-backups before any alert.
- "Last backup created" date is set after the share sheet returns; stale `.rollio` files in cache are deleted at next backup start and at app launch.
- No files marked excluded from OS backup.
- All user-facing strings in `i18n/locales/{en,ja,ko}.json`.
- Settings rows use the existing glass card style and respect side insets.
- Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Review Focus

1. A backup made on an older schema (user_version 2) restored into the current app must come out migrated (columns present, `user_version` 3). Pinned in Task 2.
2. A picked file that is not a zip, or a zip without `manifest.json`, must stop before the confirm alert with the "not a valid backup" message and leave data untouched. Pinned in Task 4.
3. A failure mid-replace (e.g. constraint error on insert) must roll back the rows and keep the original `frames/` folder. Pinned in Tasks 2 and 4.
4. A film detail screen left open on another tab when a restore deletes that film must not keep showing it. Pinned in Task 6.
5. Backups with zero frames or zero images must still produce a valid archive (empty `frames/` dir). Pinned in Task 3.

---

### Task 0: Spike — does `react-native-zip-archive` build on this project?

**Files:**
- Modify: `package.json` (dependency)

**Interfaces:**
- Produces: a working `zip(sourceDir, targetZip)` / `unzip(archive, outDir)` import from `react-native-zip-archive`, or a documented failure.

- [ ] **Step 1: Install the packages**

Run: `npx expo install expo-sharing && npm install react-native-zip-archive@^9.5.3`

- [ ] **Step 2: Prebuild and build for the simulator**

Run:
```bash
npx expo prebuild --clean --platform ios --no-install && (cd ios && pod install) && \
xcodebuild -workspace ios/Rollio.xcworkspace -scheme Rollio -configuration Debug \
  -destination "id=D3F14B69-9161-4EA1-81D0-B83AE9656DD8" -derivedDataPath ios/build build -quiet
```
Expected: `** BUILD SUCCEEDED **` (or no output with `-quiet`), exit 0.

- [ ] **Step 3: Smoke the module at runtime**

Temporarily add to `app/(tabs)/settings/index.tsx` a `useEffect` that zips `Paths.document.uri` + `frames` into `Paths.cache.uri + 'spike.rollio'` and logs the result; install, launch, check Metro log shows a path and no "TurboModuleRegistry" error. Remove the effect.

- [ ] **Step 4: Decide**

If build or runtime fails: stop, report to the user with the error, and propose the local Expo module fallback from the spec. Do not proceed to Task 1 without that decision.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add expo-sharing and react-native-zip-archive for backups"
```

---

### Task 1: Node test harness committed under `tests/db/`

**Files:**
- Create: `tests/db/harness.mjs`, `tests/db/stub-expo-file-system.mjs`, `tests/db/stub-empty.mjs`, `tests/db/stub-types.mjs`
- Create: `tests/db/test-migration.mjs`, `tests/db/test-writes.mjs` (ported from the session scratchpad at `/private/tmp/claude-501/-Users-dav-iOS-Development-Rollio/03a2ac56-caee-4952-9253-c38d3d257c8a/scratchpad/dbtest/`)
- Modify: `package.json` scripts

**Interfaces:**
- Produces: `openDb(path = ':memory:')` returning the expo-sqlite shim `{ raw, execAsync, getAllAsync, getFirstAsync, runAsync, withTransactionAsync }`; `check(cond, msg)`, `done()`; `fsStub` with `deleted: string[]`, `failOn: Set<string>`; `columns(db, table)`, `userVersion(db)`.
- Change from the scratchpad: `ROOT` is derived from `import.meta.url` (`path.resolve(HERE, '../..')`), not hard-coded. `openDb(path)` accepts a file path so Task 2 can test `VACUUM INTO` and `ATTACH` against real files.

- [ ] **Step 1: Copy the six harness files into `tests/db/`, fix `ROOT`, add the `path` argument to `openDb`**

- [ ] **Step 2: Add script**

In `package.json` scripts: `"test:db": "for f in tests/db/test-*.mjs; do node --no-warnings \"$f\" || exit 1; done"`.

- [ ] **Step 3: Run**

Run: `npm run test:db`
Expected: both files print `ALL PASSED`, exit 0.

- [ ] **Step 4: Commit**

```bash
git add tests/db package.json
git commit -m "test: commit the Node sqlite harness for services/database.ts"
```

---

### Task 2: `services/backupDb.ts` — snapshot, inspect, replace

**Files:**
- Create: `services/backupDb.ts`
- Modify: `services/database.ts` (export `TARGET_VERSION`)
- Test: `tests/db/test-backup-db.mjs`

**Interfaces:**
- Consumes: `initDatabase(db)` from `services/database.ts`; `SQLiteDatabase` type.
- Produces:
  ```ts
  export const TARGET_VERSION = 3;                       // moved out of initDatabase in database.ts
  export type BackupCounts = { filmCount: number; frameCount: number; imageCount: number };
  export const snapshotDatabase = (db: SQLiteDatabase, destPath: string) => Promise<void>;  // VACUUM INTO
  export const readCounts = (db: SQLiteDatabase) => Promise<BackupCounts>;                  // imageCount = frames with image NOT NULL
  export const inspectImportedDatabase = (db: SQLiteDatabase) => Promise<{ schemaVersion: number }>;
      // throws BackupError('invalid') if films/frames tables are missing; returns user_version
  export const replaceAllData = (live: SQLiteDatabase, importedPath: string) => Promise<BackupCounts>;
      // ATTACH importedPath AS backup (outside the transaction); inside withTransactionAsync:
      // DELETE frames, DELETE films, INSERT INTO films(<cols>) SELECT <cols> FROM backup.films,
      // same for frames, DELETE FROM sqlite_sequence WHERE name IN ('films','frames'),
      // then re-insert sqlite_sequence rows from backup.sqlite_sequence; DETACH in finally.
      // <cols> = names from PRAGMA table_info(main.<table>) that also exist in backup.<table>.
  export class BackupError extends Error { constructor(public code: 'invalid' | 'tooNew' | 'failed', message?: string) }
  ```

- [ ] **Step 1: Write failing tests in `tests/db/test-backup-db.mjs`**

```js
// snapshotDatabase: file exists, opens, has the rows, user_version 3
// readCounts: { filmCount: 1, frameCount: 2, imageCount: 1 } after one film, two frames, one with image
// inspectImportedDatabase: throws BackupError code 'invalid' on an empty db; returns { schemaVersion: 3 } on a real one
// replaceAllData: live has film A; imported has films B, C with frames -> after: only B, C; frame_count preserved;
//                 next insert id continues after max imported id (sqlite_sequence restored)
// replaceAllData: imported db with an extra column order (create frames with columns in a different order) still copies
// replaceAllData: imported at user_version 2 after initDatabase(imported) becomes 3 and copy succeeds (Review Focus 1)
// replaceAllData: a BEFORE INSERT trigger on live.frames that RAISEs -> rejects, live still has film A only (Review Focus 3)
// replaceAllData: live connection usable afterwards (foreign_keys still ON, can insert)
```
Use `openDb(tmpPath)` with files under `os.tmpdir()`; clean up in `finally`.

- [ ] **Step 2: Run to verify failure**

Run: `node --no-warnings tests/db/test-backup-db.mjs`
Expected: fails on import (`services/backupDb.ts` not found).

- [ ] **Step 3: Implement `services/backupDb.ts` and export `TARGET_VERSION` from `services/database.ts`**

`VACUUM INTO` takes the path as a quoted string literal; escape single quotes. `ATTACH` likewise. Keep `PRAGMA foreign_keys` on; deleting `films` cascades `frames` anyway, delete `frames` first regardless.

- [ ] **Step 4: Run tests**

Run: `npm run test:db`
Expected: `ALL PASSED` for all three files. `npx tsc --noEmit -p .` clean.

- [ ] **Step 5: Commit**

```bash
git add services/backupDb.ts services/database.ts tests/db/test-backup-db.mjs
git commit -m "feat(backup): database snapshot, inspect and replace primitives"
```

---

### Task 3: `services/backup.ts` — build the archive and share it

**Files:**
- Create: `services/backup.ts`
- Modify: `app/_layout.tsx` (call `cleanupStaleArchives()` once on mount)

**Interfaces:**
- Consumes: Task 2 exports; `zip`, `unzip` from `react-native-zip-archive`; `shareAsync` from `expo-sharing`; `File`, `Directory`, `Paths` from `expo-file-system`; `Application.nativeApplicationVersion`; `Platform.OS`.
- Produces:
  ```ts
  export type BackupManifest = { format: 1; schemaVersion: number; appVersion: string; createdAt: string;
                                 platform: 'ios' | 'android'; filmCount: number; frameCount: number; imageCount: number };
  export const BACKUP_EXTENSION = '.rollio';
  export const FRAMES_DIR = 'frames';
  export const LAST_BACKUP_KEY = 'last_backup_created_at';
  export const cleanupStaleArchives = () => void;                // deletes *.rollio in Paths.cache, swallow errors
  export const createBackupArchive = (db: SQLiteDatabase) => Promise<{ file: File; manifest: BackupManifest }>;
      // staging dir Paths.cache/'backup-<timestamp>' with manifest.json, rollio.db (snapshot), frames/ (copied, created empty if missing);
      // zip(staging.uri path, Paths.cache/'Rollio Backup YYYY-MM-DD.rollio'); delete staging; return file
  export const shareBackup = (file: File) => Promise<void>;      // shareAsync(file.uri, { UTI: 'public.zip-archive', mimeType: 'application/zip' })
  export const backupAndShare = (db: SQLiteDatabase) => Promise<BackupManifest>;
      // cleanupStaleArchives(); createBackupArchive; shareBackup; Storage.setItem(LAST_BACKUP_KEY, manifest.createdAt); return manifest
  ```
  Paths given to the zip library are filesystem paths (`uri` with the `file://` prefix stripped).

- [ ] **Step 1: Implement `services/backup.ts` (backup half only)**

- [ ] **Step 2: Wire `cleanupStaleArchives()` into `app/_layout.tsx` inside a `useEffect(() => {...}, [])`**

- [ ] **Step 3: Verify on the simulator**

Temporarily call `backupAndShare(db)` from a `useEffect` in Settings (remove after). Launch on `D3F14B69-…`, screenshot the share sheet, then in Metro log confirm the manifest. Pull the archive out: `xcrun simctl get_app_container D3F14B69-… com.davitpodosyan.rollio data`, find `Library/Caches/Rollio Backup *.rollio`, `unzip -l` it. Expected listing: `manifest.json`, `rollio.db`, `frames/` (and photos if any). Also test with a fresh install (no frames dir): archive still lists `frames/` (Review Focus 5).

- [ ] **Step 4: `npx tsc --noEmit -p .` clean; commit**

```bash
git add services/backup.ts app/_layout.tsx
git commit -m "feat(backup): build the .rollio archive and hand it to the share sheet"
```

---

### Task 4: `services/backup.ts` — pick, validate, restore with rollback

**Files:**
- Modify: `services/backup.ts`

**Interfaces:**
- Consumes: Task 2 `inspectImportedDatabase`, `replaceAllData`, `TARGET_VERSION`, `BackupError`; `initDatabase`; `openDatabaseAsync` from `expo-sqlite`; `File.pickFileAsync()`; `unzip`.
- Produces:
  ```ts
  export type PendingRestore = { dir: Directory; manifest: BackupManifest; dbFile: File; framesDir: Directory; discard: () => void };
  export const pickAndValidateBackup = () => Promise<PendingRestore | null>;
      // null when the picker is cancelled. Unzips to Paths.cache/'restore-<timestamp>'. Throws BackupError:
      //   'invalid' when unzip fails, manifest.json missing/unparsable, format !== 1, rollio.db missing, or inspect throws
      //   'tooNew'  when manifest.schemaVersion > TARGET_VERSION
      // On any throw the temp dir is deleted first.
  export const applyRestore = (live: SQLiteDatabase, pending: PendingRestore) => Promise<BackupCounts>;
  ```
  `applyRestore` order:
  1. `openDatabaseAsync` on `pending.dbFile` path → `initDatabase(imported)` → `closeAsync()`.
  2. Set aside live frames: rename `Paths.document/frames` to `frames-restore-backup` (skip if missing).
  3. Move `pending.framesDir` to `Paths.document/frames`.
  4. `replaceAllData(live, pending.dbFile path)`.
  5. On success: delete the set-aside folder, `pending.discard()`, return counts.
  6. On failure in 3 or 4: remove the half-moved `frames`, rename the set-aside folder back, `pending.discard()`, rethrow as `BackupError('failed')`.

  (Rows roll back via the transaction in `replaceAllData`; the folder swap is undone by hand. Doing the folder move before the row copy keeps the window where photos and rows disagree inside the try.)

- [ ] **Step 1: Implement**

- [ ] **Step 2: Verify on the simulator**

Push a known archive to the simulator with `xcrun simctl addmedia`? No, media only. Instead: copy an archive produced in Task 3 into the simulator's `Documents` via `xcrun simctl get_app_container … data`, then pick it through the Files app "On My iPhone > Rollio" from the picker. Check: after restore, Films tab shows the restored rolls and photos render. Then validate rejection: create `bad.rollio` containing only `hello.txt`, pick it, expect the "not a valid backup" path and unchanged data (Review Focus 2). Then rollback: temporarily make `replaceAllData` throw after the folder move, pick a good archive, expect data and photos unchanged (Review Focus 3); remove the throw.

- [ ] **Step 3: `npx tsc --noEmit -p .` clean; commit**

```bash
git add services/backup.ts
git commit -m "feat(backup): pick, validate and restore a .rollio archive with rollback"
```

---

### Task 5: Settings UI — Backup card, strings, hook

**Files:**
- Create: `hooks/useBackup.ts`
- Modify: `app/(tabs)/settings/index.tsx`
- Modify: `i18n/locales/en.json`, `ja.json`, `ko.json`

**Interfaces:**
- Consumes: Task 3 `backupAndShare`, `LAST_BACKUP_KEY`; Task 4 `pickAndValidateBackup`, `applyRestore`, `BackupError`; `useSQLiteContext`; `Storage` from `expo-sqlite/kv-store`; `DeviceEventEmitter`.
- Produces:
  ```ts
  export const useBackup = () => ({
      busy: 'idle' | 'backup' | 'restore',
      lastBackupAt: string | null,            // ISO, read from Storage on mount and after backup
      backUp: () => Promise<void>,            // alerts settings.backup.errorMessage on failure
      restore: () => Promise<void>,           // pick → confirm alert → apply → DeviceEventEmitter.emit('data_restored') → success alert
  });
  ```
  Confirm alert copy (en):
  - title: `settings.restore.confirmTitle` = "Replace all data?"
  - message: `settings.restore.confirmMessage` = "Restoring will delete all films, frames and photos currently in Rollio and replace them with this backup from {{date}} ({{count}} rolls). This cannot be undone."
  - buttons: cancel (default, `shared.cancel` if it exists, else add), `settings.restore.confirmButton` = "Delete and Restore" with `style: 'destructive'`.
  Other keys: `settings.backup.heading` "Backup" (section label inside the footnote only, no heading above the card, matching the language card), `settings.backup.backUp` "Back Up Rollio", `settings.backup.restore` "Restore from Backup", `settings.backup.footnote` "A backup includes all films, frames and photos. Save it to iCloud Drive, Google Drive or anywhere else from the share sheet.", `settings.backup.lastCreated` "Last backup created {{date}}", `settings.backup.errorMessage` "Could not create the backup.", `settings.restore.invalidMessage` "That file is not a Rollio backup.", `settings.restore.tooNewMessage` "This backup was made with a newer version of Rollio. Update the app and try again.", `settings.restore.failedMessage` "The backup could not be restored. Your current data was left unchanged.", `settings.restore.successTitle` "Restore complete", `settings.restore.successMessage` "{{films}} rolls and {{frames}} frames were restored."
  Date shown with `toLocaleDateString(i18n.language, { dateStyle: 'medium' })`.

- [ ] **Step 1: Add strings to all three locale files (ja/ko translations of the same keys)**

- [ ] **Step 2: Implement `hooks/useBackup.ts`**

- [ ] **Step 3: Add the card to Settings**

Second `GlassView` card below the language card, same style, two `Pressable` rows separated by a hairline (`StyleSheet.hairlineWidth`, `isDark ? '#ffffff22' : '#10052822'`), each row: label, then an `ActivityIndicator` when `busy` matches, else a chevron. Rows disabled while `busy !== 'idle'`. Footnote below shows `lastCreated` when `lastBackupAt` is set, otherwise `footnote`.

- [ ] **Step 4: Verify on the simulator**

Screenshot Settings light and dark (`xcrun simctl ui D3F14B69-… appearance dark`). Tap through: backup shows spinner then share sheet; footnote shows the date after dismissing. Restore shows confirm alert with date and count, destructive button red. Check iPhone Duo sim `8A5DD17C-…` once for insets.

- [ ] **Step 5: `npx tsc --noEmit -p .` clean; commit**

```bash
git add hooks/useBackup.ts "app/(tabs)/settings/index.tsx" i18n/locales
git commit -m "feat(settings): Back Up and Restore rows"
```

---

### Task 6: Refresh open screens after a restore

**Files:**
- Modify: `app/(tabs)/films/index.tsx`
- Modify: `app/(tabs)/films/[id].tsx`

**Interfaces:**
- Consumes: `DeviceEventEmitter` event `'data_restored'` from Task 5.

- [ ] **Step 1: In `films/index.tsx`, add a listener for `'data_restored'` that calls `fetchFilms()` (next to the existing `'added_film'` listener; remove in cleanup)**

- [ ] **Step 2: In `films/[id].tsx`, add a listener for `'data_restored'` that calls `navigation.goBack()` if `navigation.canGoBack()` (Review Focus 4)**

- [ ] **Step 3: Verify**

Open a film's detail, switch to Settings, restore a backup that does not contain that film, switch back to Films: list shows restored rolls, detail screen is gone.

- [ ] **Step 4: Commit**

```bash
git add "app/(tabs)/films/index.tsx" "app/(tabs)/films/[id].tsx"
git commit -m "fix(films): refresh list and leave stale detail after a restore"
```

---

### Task 7: Device check and wrap-up

- [ ] **Step 1: Build Release for the user's iPhone and install** (commands as in the SDK upgrade session: `-derivedDataPath ios/build-device DEVELOPMENT_TEAM=P6SVR7BGYZ CODE_SIGN_STYLE=Automatic -allowProvisioningUpdates`, then `xcrun devicectl device install app --device 00008160-0008541E2E00000A`).
- [ ] **Step 2: Ask the user to run one backup to iCloud Drive and one restore on the device; the simulator cannot exercise iCloud Drive.**
- [ ] **Step 3: Run `npm run test:db` and `npx tsc --noEmit -p .` one last time; report.**
