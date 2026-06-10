# Graph Report - .  (2026-06-10)

## Corpus Check
- 184 files · ~109.228 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 741 nodes · 1634 edges · 45 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output
- Edge kinds: contains: 562 · imports: 405 · imports_from: 361 · re_exports: 177 · calls: 103 · method: 26


## Input Scope
- Requested: auto
- Resolved: committed (source: default-auto)
- Included files: 184 · Candidates: 205
- Excluded: 0 untracked · 71049 ignored · 3 sensitive · 0 missing committed
- Recommendation: Use --scope all or graphify.yaml inputs.corpus for a knowledge-base folder.

## Graph Freshness
- Built from Git commit: `1d790ed`
- Compare this hash to `git rev-parse HEAD` before trusting freshness-sensitive graph output.
## God Nodes (most connected - your core abstractions)
1. `Icon()` - 19 edges
2. `haptics` - 17 edges
3. `useConnection` - 16 edges
4. `StClient` - 14 edges
5. `AppText()` - 13 edges
6. `Identity` - 12 edges
7. `SmoothPacer` - 12 edges
8. `substituteParams()` - 10 edges
9. `safe()` - 8 edges
10. `IconName` - 8 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (55): CharacterScreen(), rawField(), splitExamples(), ImageViewerModal(), CharacterCard, TAB_ICON, TabBarProps, haptics (+47 more)

### Community 1 - "Community 1"
Cohesion: 0.10
Nodes (31): checkWorldInfo(), CheckWorldInfoParams, emptyTimedState(), filterByInclusionGroups(), pickGroupWinner(), TimedWorldInfoState, characterBookToEntries(), extractWorldInfoSettings() (+23 more)

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (32): BuildPromptInput, buildTextCompletionPrompt(), gatherDepthInjections(), many, power, seraphina, baseChatReplace(), CharacterCardFields (+24 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (27): CONTEXT_PRESETS, QuickSettingsSheet(), CollapsibleHeader(), OrderListRow(), SegmentedRow(), TextAreaRow(), ToggleRow(), CTX_PRESETS (+19 more)

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (19): chat, client, header, message, BasicAuthCredentials, StClientOptions, StResponse, KoboldInstance (+11 more)

### Community 5 - "Community 5"
Cohesion: 0.17
Nodes (19): ChatCompletionBodyOptions, createChatCompletionBody(), buildChatCompletionMessages(), BuildMessagesInput, sanitizeName(), squashSystemMessages(), fields, oai (+11 more)

### Community 6 - "Community 6"
Cohesion: 0.10
Nodes (16): SseEvent, SseParser, events, p, chunk, decoder, GenerateStreamRequest, parser (+8 more)

### Community 7 - "Community 7"
Cohesion: 0.14
Nodes (18): getIntegritySlug(), isIntegrityConflict(), chat, chatFromArray(), chatToArray(), createChatHeader(), parseChatJsonl(), stringifyChatJsonl() (+10 more)

### Community 8 - "Community 8"
Cohesion: 0.16
Nodes (21): BackendStatus, ChatFileInfo, deleteChat(), getAllCharacters(), getCharacter(), getCharacterChats(), getChat(), getChatCompletionStatus() (+13 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (18): Fingerprint, fingerprintVersion(), htmlLooksLikeSillyTavern(), NEGATIVE, fp, mapPool(), probeInstance(), ProbeOptions (+10 more)

### Community 10 - "Community 10"
Cohesion: 0.11
Nodes (21): applyProfileToConfig(), byName(), ConnectionProfile, ConnectionProfiles, extractConnectionProfiles(), findConnectionManager(), SettingsResponseArrays, base (+13 more)

### Community 11 - "Community 11"
Cohesion: 0.10
Nodes (11): PacerTick, smoothDelayMs(), SmoothPacer, SmoothPacerOptions, behind, clock, clock2, normal (+3 more)

### Community 12 - "Community 12"
Cohesion: 0.19
Nodes (18): BuildPromptResult, HistoryMessage, TokenCounter, DepthInjection, EXTENSION_ROLE, injectAtDepth(), roleFromString(), buildChatCompletionGenerateRequest() (+10 more)

### Community 13 - "Community 13"
Cohesion: 0.11
Nodes (10): Bubble, DOT, GenMode, AuthorsNoteSheet(), AuthorsNoteValue, ROLES, ReadAloudBar(), CHUNK_MAX (+2 more)

### Community 14 - "Community 14"
Cohesion: 0.15
Nodes (12): PickerOption, PickerSheet(), useBackendStatus(), checkForUpdate(), compareVersions(), downloadAndInstallUpdate(), GithubRelease, releaseVersion() (+4 more)

### Community 15 - "Community 15"
Cohesion: 0.22
Nodes (16): discoverInstances(), discoverKobold(), DiscoverOptions, KoboldDiscoverOptions, localIpv4(), uniq(), usableHint(), getHint() (+8 more)

### Community 16 - "Community 16"
Cohesion: 0.20
Nodes (8): StClient, calls, client, fetchImpl(), lastPost, makeResponse(), postCall, Recorded

### Community 17 - "Community 17"
Cohesion: 0.17
Nodes (11): Avatar(), FALLBACK_TINTS, tintFor(), ChatActionsSheets(), ChatTarget, Bucket, chatFileLabel(), ChatFileRow() (+3 more)

### Community 18 - "Community 18"
Cohesion: 0.18
Nodes (13): Block, COLORS, INLINE, InlineText(), MONO, parseBlocks(), parseInline(), proseToBlocks() (+5 more)

### Community 19 - "Community 19"
Cohesion: 0.21
Nodes (8): persister, LockGate(), queryClient, addScreenOffListener(), ScreenState, ScreenStateModule, PrefsState, usePrefs

### Community 20 - "Community 20"
Cohesion: 0.24
Nodes (7): ConnectionSettingsView, useConnectionProfiles(), useEngineConfig(), parseStSettings(), secrets, ProfilesState, useProfiles

### Community 21 - "Community 21"
Cohesion: 0.17
Nodes (6): mem, rememberBaseUrl(), storage, SavedServer, ServersState, useServers

### Community 22 - "Community 22"
Cohesion: 0.26
Nodes (6): CookieJar, readSetCookie(), SetCookieReadable, splitSetCookieHeader(), headers, jar

### Community 23 - "Community 23"
Cohesion: 0.26
Nodes (10): createTextgenBody(), getTextgenServer(), parseBannedTokens(), parseSequenceBreakers(), base, body, opts, r (+2 more)

### Community 24 - "Community 24"
Cohesion: 0.22
Nodes (4): EnvObject, escapeRegex(), MacroValue, substituteMacros()

### Community 25 - "Community 25"
Cohesion: 0.31
Nodes (7): StCharacter, StCharacterData, StCharacterExtensions, StDepthPrompt, StChatMetadata, StMessageExtra, StVersion

### Community 26 - "Community 26"
Cohesion: 0.36
Nodes (3): fetchLike(), ConnectionState, useConnection

### Community 27 - "Community 27"
Cohesion: 0.25
Nodes (5): DOT, ReasoningBlock(), StreamingBubbleContent(), events, streamDebug

### Community 28 - "Community 28"
Cohesion: 0.28
Nodes (6): AppLanguage, deviceLanguage(), SUPPORTED_LANGUAGES, LanguagePref, LocaleState, useLocale

### Community 29 - "Community 29"
Cohesion: 0.31
Nodes (6): ChatDraft, clearChatDraft(), draftKey(), fileStorage, readChatDraft(), writeChatDraft()

### Community 30 - "Community 30"
Cohesion: 0.28
Nodes (7): emit(), finishDrain(), IDLE, listeners, loop(), streamingSession, StreamSnapshot

### Community 31 - "Community 31"
Cohesion: 0.53
Nodes (7): enumerateSubnet24(), enumerateSubnetHosts(), intToIpv4(), ipv4ToInt(), netmaskToPrefix(), sameSubnet24(), hosts

### Community 32 - "Community 32"
Cohesion: 0.22
Nodes (8): base, char, depth, example, lore, plainPower, story, turn

### Community 33 - "Community 33"
Cohesion: 0.25
Nodes (5): countTokens, delta, GenerateOptions, GenerationChunk, history

### Community 34 - "Community 34"
Cohesion: 0.48
Nodes (6): applyName(), ExampleMessage, formatInstructModeExamples(), getExampleBlocks(), parseExampleIntoIndividual(), parseMesExamples()

### Community 35 - "Community 35"
Cohesion: 0.60
Nodes (5): ensureIds(), makeAssistantMessage(), makeUserMessage(), newMessageId(), nowSendDate()

### Community 36 - "Community 36"
Cohesion: 0.50
Nodes (3): { palette, radii }, palette, radii

### Community 37 - "Community 37"
Cohesion: 0.50
Nodes (3): config, { getDefaultConfig }, { withNativeWind }

### Community 38 - "Community 38"
Cohesion: 0.50
Nodes (2): entryUid(), LoreSheet()

### Community 39 - "Community 39"
Cohesion: 0.50
Nodes (2): Lorebook, useLorebook()

### Community 40 - "Community 40"
Cohesion: 0.67
Nodes (3): ensureSetup(), hideTtsNotification(), showTtsNotification()

### Community 41 - "Community 41"
Cohesion: 0.67
Nodes (2): { defineConfig }, expoConfig

### Community 42 - "Community 42"
Cohesion: 0.67
Nodes (2): PROPS, { withGradleProperties }

### Community 43 - "Community 43"
Cohesion: 1.00
Nodes (1): config

### Community 44 - "Community 44"
Cohesion: 1.00
Nodes (1): { withAppBuildGradle }

## Knowledge Gaps
- **159 isolated node(s):** `config`, `TAB_ICON`, `TabBarProps`, `CharacterCard`, `Bucket` (+154 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 38`** (2 nodes): `entryUid()`, `LoreSheet()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (2 nodes): `Lorebook`, `useLorebook()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (2 nodes): `{ defineConfig }`, `expoConfig`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (2 nodes): `PROPS`, `{ withGradleProperties }`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (1 nodes): `config`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (1 nodes): `{ withAppBuildGradle }`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SmoothPacer` connect `Community 11` to `Community 8`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `StClient` connect `Community 16` to `Community 4`, `Community 8`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `SseParser` connect `Community 6` to `Community 8`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `config`, `TAB_ICON`, `TabBarProps` to the rest of the system?**
  _159 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.053750597228858096 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.1214574898785425 - nodes in this community are weakly interconnected._