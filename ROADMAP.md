# Roadmap

Living document - priorities can shift, nothing here is a commitment.

## Open

- [ ] Author's Note sheet: remove the last bits of visual dead space on devices with
      large bottom insets (largely fixed in 0.9.2; verify across more devices).
- [ ] Read-aloud: optional Android MediaSession notification with system media controls
      (lockscreen/quick-settings) for long reads.
- [ ] Slider fine-tuning: optional haptic ticks and full-width value scrubbing.

## Shipped

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
