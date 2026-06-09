# SillyTavern Companion (Expo)

Eine native Smartphone-App (Android/iOS), die eine im lokalen WLAN laufende **SillyTavern**-Instanz
automatisch findet, sich verbindet und RP-Chats fortsetzt / neu startet — mit faithful portierter
Prompt-Engine, sodass Generierungen denselben Prompt erzeugen wie der Desktop.

> Architektur-/Phasenplan: `C:\Users\denni\.claude\plans\f-r-sillytavern-gibt-es-valiant-salamander.md`

## Was funktioniert (v1)

- **Zero-Install Discovery** — Subnetz-Scan (`/version`-Fingerprint) + manuelle IP. Kein Server-Plugin nötig.
- **Verbinden** — CSRF-Handshake + Cookie-Tracking; nutzt deine bestehende `config.yaml` (listen/whitelist).
- **Browsen** — Charakterliste, pro Charakter die gespeicherten Chats, neuen Chat starten (mit Greeting).
- **Chatten** — Chat-Verlauf rendern, Nachricht senden, **token-by-token Streaming** vom KoboldCpp-Backend
  (über ST als Proxy), Antwort **zurück auf den PC speichern** (`/api/chats/save`).
- **RP-Komfort** — Swipes (Alternativen durchblättern ‹ › + neue generieren), Regenerieren, Stop,
  Konflikt-Erkennung wenn der PC denselben Chat ändert (Überschreiben/Abbrechen).
- **Faithful Prompt-Engine** — Macros, Character-Card-Felder, Context-Story-String (Hermes-sicherer
  Handlebars-Subset), Instruct-Mode (Gemma/ChatML/…), Token-Budget, Sampler-Body. **Golden-Master-Test**
  bestätigt byte-exakte Übereinstimmung mit SillyTavern für deine Gemma-4-Config.

## Architektur

```
SillyTavernCompanionApp/                 pnpm-Monorepo
├─ packages/core/   @st/core  reines TS, in Node testbar (55 Tests grün)
│  └─ src/
│     ├─ discovery/ connection/ chat/ streaming/   (Scan, StClient+CSRF, JSONL, SSE)
│     └─ prompt-engine/   Port der ST-Generate()-Pipeline (Text-Completion/KoboldCpp):
│        macros, characterFields, storyString, instruct, buildPrompt, textgenBody, generate
└─ apps/mobile/     Expo SDK 56 App (expo-router, NativeWind, TanStack Query, Zustand, MMKV)
   ├─ app/  onboarding/  (tabs)/  character/[avatar]  chat/[avatar]/[file]
   └─ src/  lib/(expoFetch, discovery, streamTransport, generate)  hooks/  stores/
```

Strategie: **ST-Server bleibt Proxy** (Transport + KoboldCpp-Weiterleitung); die App portiert nur die
**Prompt-Konstruktion**. So bleibt das Paritätsrisiko klein.

## Stack (Juni 2026, exakte SDK-56-Versionen)

Expo 56.0.9 · React Native 0.85.3 · React 19.2.3 · expo-router 56.2.9 · expo/fetch (SSE) · expo-network ·
react-native-mmkv 4 · @tanstack/react-query 5 · zustand 5 · NativeWind 4 / Tailwind 3.4 · FlashList 2 ·
Reanimated 4 / worklets. New Architecture (Pflicht), Hermes v1.

## SillyTavern-Voraussetzungen (bereits erfüllt)

`..\SillyTavern\config.yaml`: `listen: true`, `port: 8000`, `whitelistMode: true` mit `192.168.178.*`,
`enableUserAccounts: false`. Backend: KoboldCpp (`textgenerationwebui_settings.type = koboldcpp`,
Server-URL in `server_urls.koboldcpp`). ST + KoboldCpp müssen laufen, Handy im selben WLAN.

## Auf dem Gerät testen

Build-Toolchain ist auf diesem PC vorhanden (Android SDK, JDK 21). Das **Release-APK ist eigenständig**
(JS gebündelt, Debug-Keystore-signiert) — einmal installiert, brauchst du keinen PC/Metro mehr.

```powershell
# Engine-Tests (ohne Gerät)
cd e:\Projects\SillyTavern2026\SillyTavernCompanionApp
pnpm --filter @st/core test          # 55 Tests

# Release-APK bauen (JDK 21!) und auf das angeschlossene Gerät installieren
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-21.0.6.7-hotspot'
cd apps\mobile\android
.\gradlew.bat :app:assembleRelease
adb install -r app\build\outputs\apk\release\app-release.apk
# App "SillyTavern Companion" auf dem Handy öffnen → scannt das WLAN → verbinden → Charakter → Chat
```

Android 9 (S8) braucht kein Runtime-Permission für den LAN-Scan; Cleartext-HTTP ist via
`usesCleartextTraffic` aktiviert.

## Bekannte Lücken (nächste Phasen)

Noch nicht enthalten (bewusst deferred): Beispiel-Dialoge (`mes_example`) im Prompt, World Info/Lorebooks,
Chat-Completion-Pfad (Claude/Gemini/OpenAI/DeepSeek/OpenRouter), Nachrichten-Editieren, Gruppenchats,
Markdown-Rendering der Bubbles, Tokenizer-genaues Budget (aktuell Schätzung). Siehe Plan P5–P7.

## Verifikation

`packages/core` Golden-Master: der von der Engine gebaute Prompt wird gegen den von Hand aus dem
ST-Quellcode abgeleiteten Gemma-Prompt geprüft (byte-exakt). Für neue Configs: in der Desktop-UI
„Prompt anzeigen" mit dem App-Output vergleichen.
