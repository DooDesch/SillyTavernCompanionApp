# Roadmap

Living document - priorities can shift, nothing here is a commitment.

## Open

- [ ] Read-aloud: a true Android MediaSession (system media player UI) would need a custom
      native module - the 0.11.0 sticky notification with stop action covers the practical
      case; revisit if richer controls are wanted.

## Shipped

### 0.14.0
- [x] **Swipe gesture for variants**: swipe horizontally on the last reply to cycle its
      swipes/greetings, like the desktop.
- [x] **Confirmation dialogs** before regenerate, new-variant generation and continue -
      a misclick next to the swipe controls no longer costs a reply.
- [x] Lorebook duplicate fix (embedded book vs linked world) + exact-duplicate collapse.
- [x] Chats tab freshness: new chats appear immediately (save invalidation + focus refetch).
- [x] Full in-app update loop verified on device: 0.13.1 -> download -> Android installer ->
      0.14.0, data preserved.

### 0.13.x
- [x] Chat actions (open, rename, delete) via long-press directly on the Chats tab.
- [x] Delete/rename updates the Chats tab immediately (shared query cache).
- [x] Update check fixed for prerelease-only repos (release list instead of /latest).
- [x] README: content-safe screenshots + QR code to releases; repo description/topics.

### 0.12.0
- [x] **In-app updates**: automatic GitHub release check on launch + download/install
      directly from Settings (manual re-check button included).
- [x] **All greetings usable**: alternate greetings appear as swipes on the first message
      of a new chat (< 1/4 >), like SillyTavern; no generation past the last greeting.
- [x] **Character definitions redesigned**: collapsible card per field with markdown
      rendering; example dialogues split into <START> blocks.

### 0.11.0
- [x] **Character page: spoiler-gated definitions** - creator notes and tags shown openly,
      all prompt material (description, personality, scenario, greetings, examples, character
      note, system prompt) hidden behind an explicit reveal, like ST's spoiler-free mode.
- [x] **Read-aloud notification** with stop action (lockscreen/notification shade).
- [x] **App lock v2**: locks whenever the phone locks (screen off, default); optional
      auto-lock after a configurable time in the background (slider, 1-30 min).
- [x] Author's Note sheet dead-space fix verified on device (0.9.2 change).
- [x] Slider behavior confirmed good as-is (no further fine-tuning planned).

### 0.10.0
- [x] **Optional app lock** - biometric unlock with device-credential (PIN/pattern/password)
      fallback; locks on launch and after 1 minute in the background.
- [x] **Chats tab: all chats per character** with timestamps, configurable in settings
      (latest-only vs all).
- [x] **Full generation-settings screen** with complete SillyTavern parity (sampling,
      penalties, dynatemp, Mirostat, DRY, XTC, CFG, grammar, banned tokens, sampler order,
      seed; full CC set) - collapsible sections, search, long-press reset to ST defaults,
      diff-only sync back to the PC.

### 0.9.2
- [x] Author's Note sheet dead space below Cancel/Save (keyboard-aware padding).
- [x] Clear hint texts for "Streaming" vs "Smooth streaming".
- [x] Slider/stepper controls for temperature, response length and context size.
- [x] **Read-aloud playback bar** above the composer with stop; TTS chunking below
      Android's 4000-char limit.
- [x] **APK size reduced 98.4 MB -> ~37 MB** (arm64-only + R8 + resource shrinking).
- [x] Tag-triggered release workflow (CI builds, signs, guards and publishes the APK).

## Deferred by design (desktop-only for now)

- Group chats (large subsystem: turn order, multi-bot, separate storage).
- Stateful variable macros (`getvar` / `setvar`).
- Server-side TTS configuration (the app uses on-device TTS instead).
- Full preset / instruct-template / character-card authoring.
