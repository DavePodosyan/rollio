# 📦 Rollio Changelog

All notable changes to this project will be documented in this file.

## [2.4.0] – Unreleased

### ✨ New Feature
- **Exposure Planner**: open the light meter's calculator without taking a reading. Slide through scenes from snow in full sun to moonlight to set the EV, then work the aperture, shutter and ISO columns as usual. Handy for deciding which film and lenses to bring.

---

## [2.3.1] – 2026-10-21

### ✨ New Feature
- **Open on Launch** in Settings: start Rollio on Films or the Light Meter.

### 🐞 Bug Fixes
- Two frames saved in a row no longer get the same frame number.
- An untouched New Film or New Frame form no longer asks to discard changes.
- Editing a frame without touching Save Location leaves its stored location alone.
- Roll rows refresh when expected shots change; frame rows refresh when the roll's ISO changes.
- The review prompt only follows adding a roll, not editing one.
- CSV shutter speeds carry their unit so spreadsheets stop reading them as dates.
- Android: every tip purchase is finished so it is not refunded, and Back closes the light meter reading sheet.

---

## [2.3.0] – 2026-10-20

### ✨ New Feature
- **Save Location** on a frame keeps its GPS spot with a short place label. The switch stays on for the next frames until you change it.
- Frames with a location show a pin on the roll and an **Open in Maps** link in the frame form.
- Latitude and longitude columns in the CSV export.
- If you save while the position is still being found, Rollio asks first and fills the spot in once it arrives.

### 🔧 Internal
- Database schema v4 with per-frame location columns.
- Privacy policy updated for location use.

---

## [2.2.0] – 2026-10-20

### ✨ New Features
- **Back Up and Restore** in Settings: every roll, frame and photo in one `.rollio` file you can keep in iCloud Drive, Google Drive or anywhere the share sheet reaches. Restoring replaces all current data after a warning and rolls back if it fails.
- **Export a roll** from the film's menu as a print-ready A4 **PDF contact sheet** or a **CSV spreadsheet**.
- **What's New** sheet shown once after an update.
- **Contact the developer** mail link on the Support tab.

### 🐞 Bug Fixes
- Android: exported files are shared with the app you pick, not just the chooser.
- Android: long contact sheets paginate correctly.

---

## [2.1.7] – 2026-10-20

### ✨ New Feature
- **Settings** tab with an App Language row that opens the system language settings.

### 🛠 Improvements
- Side safe-area insets respected for iPhone Duo and Split View, including modal forms.
- Save and delete failures are shown instead of closing the form silently.
- The review prompt can fire after the first roll.

### 🐞 Bug Fixes
- Restored the 1.x column and image-path migrations so upgrades from old versions keep their data.
- Frame writes are atomic; image files are deleted after their row.

### 🔧 Internal
- Upgraded to Expo SDK 58 for Xcode 27.
- Removed debug logging.

---

## [2.1.6] – 2026-07-24

### ✨ New Feature
- Rollio is now localized in **Japanese** and **Korean**, following the device language.

### 🔧 Internal
- i18n infrastructure with react-i18next; see `i18n/ADDING_A_LANGUAGE.md`.

---

## [2.1.5] – 2026-06-06

### ✨ New Features
- Delete a frame from its form.
- Delete a frame's attached image.

### 🛠 Improvements
- Android layout and UI adjustments, segmented control instead of a picker.
- Image picker permission strings.

---

## [2.1.1] – [2.1.4] – 2026-02-15 to 2026-03-07

### 🛠 Improvements
- Light meter offers full-stop shutter speeds and favors wider apertures and slower shutters when options are closely matched.
- Camera moved to react-native-vision-camera.

### 🔧 Internal
- Upgraded to Expo SDK 55.

---

## [2.1.0] – 2026-02-12

### ✨ New Feature
- **Light Meter** tab: take a reading through the camera and send aperture, shutter speed and ISO straight into a new frame.

---

## [2.0.0] – 2026-01-26

### 🎉 Complete Rewrite
- Rebuilt on native tabs and modal form sheets with full **iOS 26** support, including the Liquid Glass app icon.
- Roll list and roll detail redesigned, with context menus on rolls.
- **Film settings from a photo**: pick a scan and Rollio suggests the settings from its EXIF data.

---

## [1.4.0] – 2025-06-25

### ✨ New Feature
- Introduced a dedicated **Support Page** to thank contributors and offer in-app purchase options.
- Users can now support the project with **optional contributions** via App Store or Play Store.

### 🛠 Improvements
- Product buttons now show a loading indicator while a purchase is in progress.
- Frame animations on the Support Page now appear sequentially for a smoother feel.

---

## [1.3.2] – 2025-06-23

### ✨ New Feature
 - You can now view when each frame was added, and if you made a mistake, you can delete the last frame of a roll.

---

## [1.3.1] – 2025-06-22

### ✨ New Feature
 - You can now set Aperture and Shutter Speed to Auto (green tick at the end of each scale).
 - When adding a new frame, Aperture and Shutter Speed are now copied from the previous frame to save you time.


### 🛠 Improvements
- Deleting a film now shows a confirmation dialog so you don’t remove anything by accident.

---

## [1.3.0] – 2025-05-08

### ✨ New Feature
- You can now view frame details even when the film is marked as "developing" or "archived"
- Frames open in **read-only mode** for non-active rolls

### 🛠 Improvements
- Improved the consistency of frame interaction across film statuses

---

## [1.2.1] – 2025-05-01

### 🐞 Bug Fix
- Fixed a bug where films could not be deleted if any of their frames had an empty string as the image value
- Image deletion now properly handles empty or invalid paths
- Added missing `await` to database deletion to ensure proper cleanup

---

## [1.2.0] – 2025-04-30

### ✨ New Feature
- Added support for attaching an image to each frame (optional)
  - Perfect for logging scans, previews, or behind-the-scenes photos

### 🛠 Improvements
- Small internal cleanup and prep for future features

---

## [1.1.2] – 2025-04-26

### 🛠 Improvements
-  Improved number picker scrolling for a smoother experience.

---

## [1.1.1] – 2025-04-13

### 🛠 Improvements
- Added smart review prompt — users are asked to review the app after logging 3 rolls (only once)
- Fixed minor scroll UI polish for suggestion fields

---

## [1.1.0] – 2025-04-09

### ✨ New Features
- Frames can now be **edited** after being logged
- Added **expected shots** field to rolls (e.g. 36, 24, 12)
- Added **push/pull development** options for film rolls (e.g. Push +1)
- Frames now include a **lens** field, autofilled from the previous frame

### 🎯 Improvements
- **Camera, film, and lens fields** now show **suggestions based on previous entries**

### 🔧 Internal
- Database schema updated to support new fields
- Smooth fade UI for suggestion scroll views (visual polish)

---

## [1.0.0] – 2025-04-01
### 🎉 Initial Release

- Create and manage film rolls with:
  - Film stock
  - ISO
  - Camera used
- Log individual frames with:
  - Notes
  - Exposure settings (f/stop, shutter speed, etc.)
- Data stored **locally** using Expo SQLite
- Simple and offline-first — no login or cloud required
- Clean, minimal interface optimized for quick access

---

*This changelog follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format.*
