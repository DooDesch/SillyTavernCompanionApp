# Roadmap

Living document - priorities can shift, nothing here is a commitment. Items roughly grouped
by size, not by order.

## UI / UX polish

- [ ] **Author's Note sheet: remove the dead space** below the "Cancel" / "Save" buttons
      (visible especially while the keyboard is open - the bottom inset padding is applied
      even though the sheet is already lifted above the keyboard).
- [ ] **Clearer explanation of "Streaming" vs "Smooth streaming"** in the generation settings:
      Streaming = the backend sends tokens as they are generated (synced to SillyTavern);
      Smooth streaming = on-device typewriter pacing of the received text (app only).
      The two switches need hint texts that make this difference obvious.
- [ ] **Better controls for temperature / response length / context size** - plain number
      inputs are fiddly on the phone. Sliders or steppers with sensible ranges, live value
      display and reset-to-preset.

## Features

- [ ] **Optional app lock**: biometric unlock (fingerprint/face), falling back to the device
      credential (PIN/pattern/password) when no biometrics are enrolled - the standard system
      lock behavior. Off by default, toggle in settings (expo-local-authentication).
- [ ] **Chats tab: show all chats per character**, each with its timestamp - not only the most
      recent one. Configurable in settings: "latest chat per character" (current behavior) vs
      "all chats".
- [ ] **Full generation-settings screen**: navigating to "All generation settings" from the
      quick settings opens a complete editor with every option the SillyTavern frontend offers
      (sampler parameters, penalties, etc.), synced two-way with the desktop like the existing
      quick settings.

## Build & infrastructure

- [ ] **Reduce APK size** (currently ~98 MB): enable R8 minification + resource shrinking,
      per-ABI splits (or at least drop x86), audit packaged assets. Target: ~30-40 MB.
- [ ] Tag-triggered release workflow (CI builds and attaches the signed APK automatically).

## Deferred by design (desktop-only for now)

- Group chats (large subsystem: turn order, multi-bot, separate storage).
- Stateful variable macros (`getvar` / `setvar`).
- Server-side TTS configuration (the app uses on-device TTS instead).
- Full preset / instruct-template / character-card authoring.
