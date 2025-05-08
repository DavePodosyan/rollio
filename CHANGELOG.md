# 📦 Rollio Changelog

All notable changes to this project will be documented in this file.

## [1.3.0] – 2024-05-08

### ✨ New Feature
- You can now view frame details even when the film is marked as "developing" or "archived"
- Frames open in **read-only mode** for non-active rolls

### 🛠 Improvements
- Improved the consistency of frame interaction across film statuses

---

## [1.2.1] – 2024-05-01

### 🐞 Bug Fix
- Fixed a bug where films could not be deleted if any of their frames had an empty string as the image value
- Image deletion now properly handles empty or invalid paths
- Added missing `await` to database deletion to ensure proper cleanup

---

## [1.2.0] – 2024-04-30

### ✨ New Feature
- Added support for attaching an image to each frame (optional)
  - Perfect for logging scans, previews, or behind-the-scenes photos

### 🛠 Improvements
- Small internal cleanup and prep for future features

---

## [1.1.2] – 2024-04-26

### 🛠 Improvements
-  Improved number picker scrolling for a smoother experience.

---

## [1.1.1] – 2024-04-03

### 🛠 Improvements
- Added smart review prompt — users are asked to review the app after logging 3 rolls (only once)
- Fixed minor scroll UI polish for suggestion fields

---

## [1.1.0] – 2024-04-02

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

## 🔜 Coming Soon

- Edit and delete logged frames
- Push/Pull setting when creating a roll
- Set custom number of frames per roll
- Export rolls to PDF for archiving
- Attach scanned photos to rolls/frames
- Optional frame date field
- Android release
- EU availability (pending DSA approval)

---

*This changelog follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format.*



export ANDROID_HOME=$HOME/Library/Android/sdk                             ─╯
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools