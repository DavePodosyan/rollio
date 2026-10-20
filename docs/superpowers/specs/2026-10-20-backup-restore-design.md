# Backup and Restore — design

Date: 2026-10-20

## Intent

Rollio is an offline, local-only app. Everything a user has logged lives in one
SQLite database and one folder of frame photos inside the app's Documents
directory. If the app is deleted, the phone is lost, or the user moves between
iOS and Android, that data is gone.

This feature gives the user a single backup file they own and can put wherever
they like (iCloud Drive on iOS, Google Drive or local storage on Android), and a
way to bring it back into the app later.

## What the OS already does

Both the database and the `frames/` photo folder are in the app's Documents
directory. On iOS that directory is included in iCloud Backup and in the
new-phone transfer automatically, so "I got a new iPhone" already works today.
On Android, Auto Backup only covers 25 MB, which full-size frame photos exceed
quickly.

This feature does not replace or rely on OS backup. Nothing in it marks files
as excluded from OS backup; that free iOS path must keep working.

## Goals

- One tap produces one self-contained backup file that includes every film,
  every frame, and every attached photo.
- The user chooses where the file goes via the system share sheet. On iOS that
  surfaces Files (iCloud Drive by default). On Android it surfaces Google Drive,
  Downloads, and any other installed destination.
- Restoring from a backup file brings all of it back, on either platform,
  without the user reinstalling or restarting the app.
- Restore is a **replace**, and the UI says so explicitly before anything
  happens (user decision, see below).
- A failed restore never leaves the user with less than they had.

## Non-goals

- Continuous sync, or using the same data on two devices at once. That is a
  different, much larger project with conflict handling, and nothing here
  should be designed around it.
- A native iCloud Drive container, or third-party cloud-storage libraries that
  pair iCloud with Google Drive. The share sheet gives the same outcome with
  no Google Cloud project, no OAuth, no new entitlements.
- Scheduled or automatic backups. The user triggers both directions manually.
- Merging a backup into existing data.
- Selective restore (one roll only).

## Anti-goals

- A restore that silently wipes data without a clear warning would be a
  failure even if it technically works.
- A restore that half-applies (rows replaced, photos missing, or vice versa)
  would be a failure.
- Backups that cannot be opened by a newer version of Rollio would be a
  failure. Older-app-opens-newer-backup is allowed to refuse, with a message.

## Decisions already made

### Restore replaces everything, and says so

Restore does not merge. Before doing anything it shows a confirmation alert
that states, in plain words, that **all current films, frames and photos in
Rollio will be deleted and replaced** with the contents of the backup, and that
this cannot be undone. The destructive action is the non-default button, in the
platform's destructive style. The alert also names the backup's date and roll
count so the user can see what they are about to restore.

### Backup file

One file, extension `.rollio`, a standard zip archive. Default name
`Rollio Backup YYYY-MM-DD.rollio`. Contents:

```
manifest.json
rollio.db
frames/
  rollio_<timestamp>_<n>.jpg
  ...
```

`manifest.json` holds:

- `format`: `1` (manifest format; bump only on incompatible layout changes)
- `schemaVersion`: the database `PRAGMA user_version` at backup time
- `appVersion`: the app's marketing version
- `createdAt`: ISO 8601 timestamp
- `platform`: `ios` or `android`
- `filmCount`, `frameCount`, `imageCount`: for display in the restore alert

The database snapshot is produced with SQLite's `VACUUM INTO`, which writes a
consistent single-file copy even while the live database is in WAL mode. The
backup never copies the live `rollio.db` or its `-wal`/`-shm` files directly.

The `frames/` folder is copied as-is. Image paths in the database are already
relative (`frames/<name>`), so no path rewriting is needed in either direction.

The whole archive is assembled in the app's cache directory. See "Where it
goes" for when it is cleaned up.

### Where it goes

Backup hands the finished file to the system share sheet. No destination is
chosen by the app. There is no "last backup location" to remember; the UI
remembers only the date the last backup file was created (see UI).

The share sheet cannot tell the app whether the user saved the file or
cancelled, and on Android the receiving app (Drive, for example) may still be
reading the file after the sheet closes. Two consequences, both builder calls:

- The remembered date means "a backup file was created and handed to the
  share sheet", and the UI wording says so ("Last backup created …"). It is
  never presented as proof that the file was saved somewhere.
- Archives in the cache directory are not deleted immediately after sharing.
  Any `.rollio` files left in the cache are removed at the start of the next
  backup and at app launch.

### Restore flow

1. User taps Restore. The system document picker opens. It is **not**
   filtered to `.rollio` (builder call): filtering on iOS would require
   declaring an exported document type in the Info.plist, which also makes
   Files, Mail and Messages offer "Open in Rollio" and launch the app with a
   file URL that nothing handles. Registering the type and handling incoming
   files is a sensible follow-up, not part of this work. Any file can be
   picked; validation below rejects anything that is not a backup.
2. The archive is unzipped into a fresh temporary folder in the cache
   directory and validated:
   - `manifest.json` exists and `format` is one the app understands.
   - `rollio.db` exists and opens as an SQLite database with `films` and
     `frames` tables.
   - `schemaVersion` is not newer than the app's current target version.
     If it is, stop with a message asking the user to update Rollio.
   Any failure here stops before the confirmation alert, with a message that
   says the file is not a valid Rollio backup, and nothing is touched.
3. The confirmation alert described above is shown, including the counts from
   the manifest.
4. On confirm, the imported database is opened on its own and migrated forward
   with the **same** migration function used at app startup, so an old backup
   ends up at the current schema.
5. The live database is then replaced **inside one transaction**: attach the
   migrated import, delete all rows from `frames` and `films`, insert the
   imported rows with explicit column lists (not `SELECT *`, because column
   order can differ between databases that were migrated along different
   paths), reset the autoincrement counters so new ids continue after the
   imported ones, detach.
6. The live `frames/` folder is swapped: the current folder is renamed aside,
   the imported folder is moved into place. Only then is the set-aside folder
   deleted. If the move fails, the set-aside folder is renamed back.
7. The Films list refreshes (it already refetches on focus; a broadcast event
   is also acceptable so nothing stale survives).
8. A success alert shows what was restored.

Throughout, the live SQLite connection owned by the app's provider stays open.
Restore never closes, deletes, or re-creates the live database file, so no
restart is needed.

### Rollback

Before step 5, the current live data is snapshotted (a `VACUUM INTO` copy plus
a reference to the set-aside `frames/` folder). If step 5 or 6 fails, the
transaction is rolled back and the folder is restored; the snapshot is deleted
afterwards. If everything succeeds the snapshot is also deleted. Rollback is
internal; it is not exposed as a user feature.

### UI

A new "Backup" section on the Settings tab, below the language row, using the
same glass card and footnote style:

- Row: **Back Up Rollio** — starts the backup, shows a spinner in the row while
  the archive is built, then opens the share sheet.
- Row: **Restore from Backup** — opens the document picker, then the flow
  above. Shows a spinner while importing.
- Footnote under the card: "Last backup: <date>" when known, otherwise a
  sentence explaining that a backup includes all films, frames and photos, and
  can be saved to iCloud Drive or Google Drive from the share sheet.

Both rows are disabled while either operation is running. All strings go
through i18n with English, Japanese and Korean entries.

The last-backup date is stored locally and set only after the share sheet
returns without error. It is informational only.

### Dependencies

- `expo-sharing` (share sheet), official Expo package at the SDK 58 version.
- The file picker built into `expo-file-system` 58 (`File.pickFileAsync`), so
  no separate document-picker package.
- `react-native-zip-archive` for native zip/unzip. JS-only zip libraries are
  ruled out: backups can reach tens of megabytes of photos and Hermes would
  have to round-trip them through base64.

Both autolink under the existing prebuild workflow. The zip package ships a
TurboModule spec, but it has not been built against this project's React
Native version yet, so the plan starts with a spike that installs it, runs
prebuild and builds for the simulator. If that fails, the fallback is a small
local Expo module (the repo already has one under `modules/`) wrapping the
platform zip APIs. That fallback is acceptable but should be reported back
before being chosen.

## Constraints

- Expo SDK 58 / React Native 0.88, config-generated native projects (no
  checked-in `ios/` or `android/`).
- Database access goes through `services/database.ts` and the existing
  `initDatabase` migration path. Backup and restore code must call that
  function for the imported database rather than duplicating migrations.
- File access uses the `expo-file-system` `File` / `Directory` / `Paths` API
  already used in `utils/ImageService.ts`.
- Must work on iPhone Duo and respect side insets like the rest of Settings.
- Frame photos are stored at full size today. Backups will be large. A
  progress indicator per row is required; a byte-level progress bar is not.

## Left to the builder

- Exact module layout (a `services/backup.ts` is the obvious home) and the
  shape of the result/error types.
- Whether the "last backup" date lives in a tiny key-value store or a one-row
  SQLite table.
- How the picker filters on each platform, and the fallback behaviour when a
  user picks a non-backup file.
- Exact alert copy, within the rule that the replace warning must be explicit.
- Test approach for the file and zip half, which will need device or
  simulator testing.

The database half (attach/copy, id sequence reset, rollback) is tested with a
small Node harness that runs the real `services/` code against `node:sqlite`
with stubs for the Expo modules. A version of this harness exists only in a
previous session's scratchpad, so it is recreated and **committed** under
`tests/db/` with an npm script, so that it outlives this session.
- Whether to downscale photos at attach time to keep backups smaller. Out of
  scope here; note it as a follow-up.
