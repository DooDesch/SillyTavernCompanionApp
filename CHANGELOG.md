# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow semver.
Android `versionCode` increases by 1 per release (0.9.0 = 2).

## [0.13.0] - 2026-06-10 (Beta)

### Added
- Chat actions (open, rename, delete) via long-press directly on the Chats tab -
  previously only available on the character page.

### Fixed
- Deleting or renaming a chat now updates the Chats tab immediately (the two screens
  used different caches; deletions only showed up after a manual reload).

## [0.12.0] - 2026-06-10 (Beta)

### Added
- **In-app updates**: the app checks GitHub for a new release on launch and offers
  to download and install it directly from Settings - no more manual GitHub visits.
  A manual "Check for updates" button lives at the bottom of Settings.
- **All greetings usable**: starting a new chat now exposes every alternate greeting
  as swipes on the first message (e.g. < 1/4 >), exactly like SillyTavern. Swiping
  past the last greeting no longer triggers a pointless generation.

### Changed
- **Character definitions redesigned**: each field is its own collapsible card with
  markdown rendering; example dialogues are split into their <START> blocks and
  greetings are browsable individually. Much closer to the desktop editor.

## [0.11.1] - 2026-06-10 (Beta)

### Fixed
- The "AI backend not connected" banner no longer truncates its call to action.

## [0.11.0] - 2026-06-10 (Beta)

### Added
- **Character page redesign with spoiler protection**: creator notes and tags are shown
  openly (they are written for the player), while all prompt material - description,
  personality, scenario, first message (incl. alternate-greeting count), example
  dialogues, character note, system prompt, embedded lorebook - sits behind an explicit
  "Show definitions" reveal, like SillyTavern's spoiler-free mode. No more accidental
  self-spoilers when opening a character.
- **Read-aloud notification**: while text-to-speech runs, a notification with a Stop
  button is available from the lockscreen/notification shade.
- **App lock v2**: the lock now engages whenever the phone locks (screen off) - the new
  default. Optionally, auto-lock after a configurable time in the background can be
  enabled additionally (slider, 1-30 minutes).

### Changed
- Versions/screenshots refreshed in the README.

## [0.10.0] - 2026-06-10 (Beta)

### Added
- **Optional app lock**: biometric unlock with system fallback to the device
  PIN/pattern/password. Locks on launch and after one minute in the background.
  Off by default; enabling requires a successful authentication so you can't
  lock yourself out.
- **Chats tab can show every chat** per character (with chat name, preview and
  timestamp) instead of only the most recent one - configurable under
  Settings > Display.
- **Full generation-settings screen** ("All generation settings" from the quick
  settings): every sampler and option the SillyTavern frontend offers for the
  active backend - sampling (incl. dynamic temperature, smoothing, Mirostat),
  penalties, DRY, XTC, CFG, grammar, banned tokens, KoboldCpp sampler order,
  token toggles and seed for text completion; the full OpenAI-style set for
  chat completion. Grouped in collapsible sections with search, long-press
  reset to SillyTavern defaults, and diff-only sync back to the PC (only
  fields you actually changed are written).

### Fixed
- The prompt now includes banned tokens/strings, no-repeat-ngram-size and
  temperature-last from your SillyTavern settings (previously ignored by the
  app's prompt engine).

## [0.9.2] - 2026-06-10 (Beta)

### Added
- Phone-friendly generation controls: temperature and response length as sliders
  (tap the value for exact input), context size as a preset stepper (2k-128k).
  Untouched values are never written back, so desktop settings outside the mobile
  ranges stay intact.
- Hint texts explaining the difference between "Streaming" (backend, synced with
  SillyTavern) and "Smooth streaming" (app-side display only).
- Read-aloud playback bar above the composer with a stop button; long texts are
  now chunked below Android's TTS limit (previously >4000 chars threw).

### Fixed
- Bottom sheets no longer show a dead padding band under their buttons while the
  keyboard is open.
- Gestures inside bottom sheets (slider drag, pan-to-dismiss on the handle) were
  inert on Android; they work now.
- Stopping a generation before the first token no longer leaves an empty reply
  bubble behind.

### Changed
- APK size reduced from 98.4 MB to ~37 MB (arm64-only native libs + R8 code
  shrinking). 32-bit devices are no longer supported by the prebuilt APK.
- Releases are now built and published automatically when a version tag is pushed.

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
