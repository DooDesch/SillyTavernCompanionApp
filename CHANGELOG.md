# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow semver.
Android `versionCode` increases by 1 per release (0.9.0 = 2).

## [0.9.1] - 2026-06-10 (Beta)

### Added
- Keep the screen awake while a reply is being generated (prompt build + token streaming).
  Previously the display timing out could pause the app and abort the stream mid-reply.

### Fixed
- Bottom sheets (Author's Note, message editing, quick settings, rename) were pushed
  off-screen when the keyboard opened, making typing impossible. They now lift above
  the keyboard as intended.

### Changed
- Repo-wide style cleanup: em-dashes replaced with plain hyphens.

## [0.9.0] - 2026-06-10 (Beta)

Initial public beta.

### Added
- Zero-install discovery: Wi-Fi subnet scan with `/version` fingerprint, last-known-good
  fast path, manual IP/Basic-Auth pairing, multi-server management.
- Chat: history rendering (markdown), send, **word-by-word streaming** with ST-style smooth
  streaming (device-local toggle), swipes, regenerate, continue, stop, edit/copy/hide/delete,
  branching, read-aloud (device TTS), reasoning ("thoughts") blocks, image attachments for
  vision models (chat-completion).
- Faithful prompt engine (`@st/core`, 106 tests): macros, character fields, story string,
  instruct mode, examples, `@depth` injections, Author's Note, World Info (selective logic,
  inclusion groups, min activations, sticky/cooldown/delay), tokenizer-accurate budgeting;
  golden-master verified byte-exact against desktop SillyTavern.
- Backends: text completion (KoboldCpp, …) and chat completion (Claude, OpenAI, Gemini,
  Mistral, Cohere, …) via SillyTavern connection profiles, KoboldCpp auto-detect.
- Two-way sync: chat save-back with integrity conflict detection, persona/profile/sampler
  sync into SillyTavern settings; crash drafts with restore; offline cache.
- Personas, lorebook panel with live "active" badges and per-entry mute, quick generation
  settings, impersonate.
- Full i18n (English/German), dark "cinema" design system, custom app icon + splash.

### Notes
- Signed release APK, distributed via GitHub Releases (sideload).
- Deferred: group chats, stateful variable macros, server-side TTS, full preset editors
  (heavy configuration stays on the desktop by design).
