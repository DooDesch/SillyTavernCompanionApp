# Graph Report - .  (2026-06-10)

## Corpus Check
- 173 files · ~91.768 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 714 nodes · 1578 edges · 42 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output
- Edge kinds: contains: 541 · imports: 389 · imports_from: 347 · re_exports: 177 · calls: 98 · method: 26


## Input Scope
- Requested: auto
- Resolved: committed (source: default-auto)
- Included files: 173 · Candidates: 193
- Excluded: 0 untracked · 64894 ignored · 3 sensitive · 0 missing committed
- Recommendation: Use --scope all or graphify.yaml inputs.corpus for a knowledge-base folder.

## Graph Freshness
- Built from Git commit: `fc6e30d`
- Compare this hash to `git rev-parse HEAD` before trusting freshness-sensitive graph output.
## God Nodes (most connected - your core abstractions)
1. `Icon()` - 18 edges
2. `haptics` - 16 edges
3. `useConnection` - 15 edges
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

### Community 40 - "Community 40"
Cohesion: 1.00
Nodes (1): config

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (52): TAB_ICON, TabBarProps, CharacterCard, ImageViewerModal(), TextColor, COLOR, AppTextProps, AppText() (+44 more)

### Community 20 - "Community 20"
Cohesion: 0.22
Nodes (9): relativeTime(), Bucket, chatFileLabel(), Row, RecentChatRow(), ChatFileRow(), FALLBACK_TINTS, tintFor() (+1 more)

### Community 16 - "Community 16"
Cohesion: 0.18
Nodes (9): PickerOption, PickerSheet(), useBackendStatus(), ConnectionSettingsView, useConnectionProfiles(), useEngineConfig(), parseStSettings(), ChatListMode (+1 more)

### Community 23 - "Community 23"
Cohesion: 0.31
Nodes (5): persister, LockGate(), queryClient, PrefsState, usePrefs

### Community 13 - "Community 13"
Cohesion: 0.11
Nodes (10): GenMode, Bubble, AuthorsNoteValue, ROLES, AuthorsNoteSheet(), ReadAloudBar(), CHUNK_MAX, chunkForSpeech() (+2 more)

### Community 19 - "Community 19"
Cohesion: 0.23
Nodes (5): Lorebook, useLorebook(), fetchLike(), ConnectionState, useConnection

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (27): OPEN_BY_DEFAULT, CONTEXT_PRESETS, QuickSettingsSheet(), ToggleRow(), TextAreaRow(), SegmentedRow(), OrderListRow(), CollapsibleHeader() (+19 more)

### Community 38 - "Community 38"
Cohesion: 0.67
Nodes (2): { defineConfig }, expoConfig

### Community 36 - "Community 36"
Cohesion: 0.50
Nodes (3): { getDefaultConfig }, { withNativeWind }, config

### Community 39 - "Community 39"
Cohesion: 0.67
Nodes (2): { withGradleProperties }, PROPS

### Community 41 - "Community 41"
Cohesion: 1.00
Nodes (1): { withAppBuildGradle }

### Community 37 - "Community 37"
Cohesion: 0.50
Nodes (2): entryUid(), LoreSheet()

### Community 18 - "Community 18"
Cohesion: 0.18
Nodes (13): COLORS, Span, Block, splitFences(), proseToBlocks(), parseBlocks(), INLINE, parseInline() (+5 more)

### Community 33 - "Community 33"
Cohesion: 0.33
Nodes (3): StreamingBubbleContent(), DOT, ReasoningBlock()

### Community 24 - "Community 24"
Cohesion: 0.24
Nodes (6): SUPPORTED_LANGUAGES, AppLanguage, deviceLanguage(), LanguagePref, LocaleState, useLocale

### Community 14 - "Community 14"
Cohesion: 0.22
Nodes (16): DiscoverOptions, uniq(), localIpv4(), usableHint(), discoverInstances(), KoboldDiscoverOptions, discoverKobold(), HostHint (+8 more)

### Community 25 - "Community 25"
Cohesion: 0.22
Nodes (7): GenerateOptions, GenerationChunk, history, countTokens, delta, events, streamDebug

### Community 34 - "Community 34"
Cohesion: 0.60
Nodes (5): nowSendDate(), newMessageId(), ensureIds(), makeUserMessage(), makeAssistantMessage()

### Community 28 - "Community 28"
Cohesion: 0.31
Nodes (6): fileStorage, draftKey(), ChatDraft, writeChatDraft(), readChatDraft(), clearChatDraft()

### Community 17 - "Community 17"
Cohesion: 0.14
Nodes (8): mem, storage, secrets, rememberBaseUrl(), ProfilesState, SavedServer, ServersState, useServers

### Community 29 - "Community 29"
Cohesion: 0.28
Nodes (7): StreamSnapshot, IDLE, listeners, emit(), finishDrain(), loop(), streamingSession

### Community 35 - "Community 35"
Cohesion: 0.50
Nodes (3): palette, radii, { palette, radii }

### Community 7 - "Community 7"
Cohesion: 0.14
Nodes (18): chat, getIntegritySlug(), isIntegrityConflict(), header, msg1, msg2, chat, arr (+10 more)

### Community 15 - "Community 15"
Cohesion: 0.20
Nodes (8): makeResponse(), Recorded, calls, fetchImpl(), client, postCall, lastPost, StClient

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (19): BasicAuthCredentials, StClientOptions, StResponse, header, message, client, chat, jsonResponse() (+11 more)

### Community 21 - "Community 21"
Cohesion: 0.26
Nodes (6): jar, headers, SetCookieReadable, splitSetCookieHeader(), readSetCookie(), CookieJar

### Community 8 - "Community 8"
Cohesion: 0.16
Nodes (21): getVersion(), isReachable(), getSettings(), saveSettings(), withJsonl(), renameChat(), deleteChat(), BackendStatus (+13 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (18): fp, Fingerprint, NEGATIVE, fingerprintVersion(), htmlLooksLikeSillyTavern(), mapPool(), jsonResponse(), ST_VERSION (+10 more)

### Community 30 - "Community 30"
Cohesion: 0.53
Nodes (7): hosts, ipv4ToInt(), intToIpv4(), enumerateSubnetHosts(), enumerateSubnet24(), sameSubnet24(), netmaskToPrefix()

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (32): power, seraphina, many, BuildPromptInput, gatherDepthInjections(), buildTextCompletionPrompt(), CharacterCardFields, ChatFieldOverrides (+24 more)

### Community 12 - "Community 12"
Cohesion: 0.19
Nodes (18): HistoryMessage, TokenCounter, BuildPromptResult, EXTENSION_ROLE, DepthInjection, roleFromString(), injectAtDepth(), historyFromMessages() (+10 more)

### Community 5 - "Community 5"
Cohesion: 0.17
Nodes (19): ChatCompletionBodyOptions, createChatCompletionBody(), BuildMessagesInput, sanitizeName(), squashSystemMessages(), buildChatCompletionMessages(), fields, oai (+11 more)

### Community 32 - "Community 32"
Cohesion: 0.48
Nodes (6): parseMesExamples(), ExampleMessage, parseExampleIntoIndividual(), applyName(), formatInstructModeExamples(), getExampleBlocks()

### Community 31 - "Community 31"
Cohesion: 0.22
Nodes (8): plainPower, char, base, story, example, turn, lore, depth

### Community 26 - "Community 26"
Cohesion: 0.22
Nodes (4): MacroValue, EnvObject, escapeRegex(), substituteMacros()

### Community 10 - "Community 10"
Cohesion: 0.11
Nodes (21): parsed, { profiles, selectedId }, base, response, out, ConnectionProfile, ConnectionProfiles, findConnectionManager() (+13 more)

### Community 22 - "Community 22"
Cohesion: 0.26
Nodes (10): base, opts, r, body, TextgenSettings, TextgenBodyOptions, parseSequenceBreakers(), getTextgenServer() (+2 more)

### Community 1 - "Community 1"
Cohesion: 0.10
Nodes (31): CheckWorldInfoParams, TimedWorldInfoState, emptyTimedState(), pickGroupWinner(), filterByInclusionGroups(), checkWorldInfo(), worldFileToEntries(), characterBookToEntries() (+23 more)

### Community 11 - "Community 11"
Cohesion: 0.10
Nodes (11): clock, pacer, pending, t, behind, clock2, normal, smoothDelayMs() (+3 more)

### Community 6 - "Community 6"
Cohesion: 0.10
Nodes (16): p, events, SseEvent, SseParser, stream, tokens, delta, reader (+8 more)

### Community 27 - "Community 27"
Cohesion: 0.31
Nodes (7): StDepthPrompt, StCharacterExtensions, StCharacterData, StCharacter, StChatMetadata, StMessageExtra, StVersion

## Knowledge Gaps
- **155 isolated node(s):** `config`, `TAB_ICON`, `TabBarProps`, `CharacterCard`, `Bucket` (+150 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 40`** (1 nodes): `config`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (2 nodes): `{ defineConfig }`, `expoConfig`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (2 nodes): `{ withGradleProperties }`, `PROPS`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (1 nodes): `{ withAppBuildGradle }`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (2 nodes): `entryUid()`, `LoreSheet()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SmoothPacer` connect `Community 11` to `Community 8`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `StClient` connect `Community 15` to `Community 4`, `Community 8`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `SseParser` connect `Community 6` to `Community 8`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `config`, `TAB_ICON`, `TabBarProps` to the rest of the system?**
  _155 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.056687565308254965 - nodes in this community are weakly interconnected._
- **Should `Community 13` be split into smaller, more focused modules?**
  _Cohesion score 0.11428571428571428 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.08708708708708708 - nodes in this community are weakly interconnected._