# Graph Report - .  (2026-06-10)

## Corpus Check
- 168 files · ~85.996 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 680 nodes · 1502 edges · 36 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output
- Edge kinds: contains: 512 · imports: 363 · imports_from: 330 · re_exports: 177 · calls: 94 · method: 26


## Input Scope
- Requested: auto
- Resolved: committed (source: default-auto)
- Included files: 168 · Candidates: 188
- Excluded: 0 untracked · 69700 ignored · 3 sensitive · 0 missing committed
- Recommendation: Use --scope all or graphify.yaml inputs.corpus for a knowledge-base folder.

## Graph Freshness
- Built from Git commit: `25a4bad`
- Compare this hash to `git rev-parse HEAD` before trusting freshness-sensitive graph output.
## God Nodes (most connected - your core abstractions)
1. `Icon()` - 17 edges
2. `useConnection` - 14 edges
3. `haptics` - 14 edges
4. `StClient` - 14 edges
5. `AppText()` - 13 edges
6. `Identity` - 12 edges
7. `SmoothPacer` - 12 edges
8. `substituteParams()` - 10 edges
9. `IconName` - 8 edges
10. `CookieJar` - 8 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 34 - "Community 34"
Cohesion: 1.00
Nodes (1): config

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (52): TAB_ICON, TabBarProps, CharacterCard, ImageViewerModal(), TextColor, COLOR, AppTextProps, AppText() (+44 more)

### Community 19 - "Community 19"
Cohesion: 0.24
Nodes (7): relativeTime(), Bucket, Row, RecentChatRow(), FALLBACK_TINTS, tintFor(), Avatar()

### Community 12 - "Community 12"
Cohesion: 0.17
Nodes (9): PickerOption, PickerSheet(), useBackendStatus(), ConnectionSettingsView, useConnectionProfiles(), useEngineConfig(), parseStSettings(), ProfilesState (+1 more)

### Community 10 - "Community 10"
Cohesion: 0.12
Nodes (12): persister, queryClient, mem, storage, secrets, rememberBaseUrl(), useLocale, PrefsState (+4 more)

### Community 11 - "Community 11"
Cohesion: 0.11
Nodes (10): GenMode, Bubble, AuthorsNoteValue, ROLES, AuthorsNoteSheet(), ReadAloudBar(), CHUNK_MAX, chunkForSpeech() (+2 more)

### Community 17 - "Community 17"
Cohesion: 0.23
Nodes (5): Lorebook, useLorebook(), fetchLike(), ConnectionState, useConnection

### Community 32 - "Community 32"
Cohesion: 0.67
Nodes (2): { defineConfig }, expoConfig

### Community 30 - "Community 30"
Cohesion: 0.50
Nodes (3): { getDefaultConfig }, { withNativeWind }, config

### Community 33 - "Community 33"
Cohesion: 0.67
Nodes (2): { withGradleProperties }, PROPS

### Community 35 - "Community 35"
Cohesion: 1.00
Nodes (1): { withAppBuildGradle }

### Community 31 - "Community 31"
Cohesion: 0.50
Nodes (2): entryUid(), LoreSheet()

### Community 16 - "Community 16"
Cohesion: 0.24
Nodes (9): CONTEXT_PRESETS, QuickSettingsSheet(), safe(), syncPersonaToPc(), syncSelectedProfileToPc(), syncPowerUser(), syncTextgen(), syncOai() (+1 more)

### Community 15 - "Community 15"
Cohesion: 0.18
Nodes (13): COLORS, Span, Block, splitFences(), proseToBlocks(), parseBlocks(), INLINE, parseInline() (+5 more)

### Community 27 - "Community 27"
Cohesion: 0.33
Nodes (3): StreamingBubbleContent(), DOT, ReasoningBlock()

### Community 22 - "Community 22"
Cohesion: 0.28
Nodes (5): SUPPORTED_LANGUAGES, AppLanguage, deviceLanguage(), LanguagePref, LocaleState

### Community 13 - "Community 13"
Cohesion: 0.22
Nodes (16): DiscoverOptions, uniq(), localIpv4(), usableHint(), discoverInstances(), KoboldDiscoverOptions, discoverKobold(), HostHint (+8 more)

### Community 20 - "Community 20"
Cohesion: 0.22
Nodes (7): GenerateOptions, GenerationChunk, history, countTokens, delta, events, streamDebug

### Community 28 - "Community 28"
Cohesion: 0.60
Nodes (5): nowSendDate(), newMessageId(), ensureIds(), makeUserMessage(), makeAssistantMessage()

### Community 23 - "Community 23"
Cohesion: 0.31
Nodes (6): fileStorage, draftKey(), ChatDraft, writeChatDraft(), readChatDraft(), clearChatDraft()

### Community 24 - "Community 24"
Cohesion: 0.28
Nodes (7): StreamSnapshot, IDLE, listeners, emit(), finishDrain(), loop(), streamingSession

### Community 29 - "Community 29"
Cohesion: 0.50
Nodes (3): palette, radii, { palette, radii }

### Community 6 - "Community 6"
Cohesion: 0.14
Nodes (18): chat, getIntegritySlug(), isIntegrityConflict(), header, msg1, msg2, chat, arr (+10 more)

### Community 14 - "Community 14"
Cohesion: 0.20
Nodes (8): makeResponse(), Recorded, calls, fetchImpl(), client, postCall, lastPost, StClient

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (19): BasicAuthCredentials, StClientOptions, StResponse, header, message, client, chat, jsonResponse() (+11 more)

### Community 18 - "Community 18"
Cohesion: 0.26
Nodes (6): jar, headers, SetCookieReadable, splitSetCookieHeader(), readSetCookie(), CookieJar

### Community 7 - "Community 7"
Cohesion: 0.16
Nodes (21): getVersion(), isReachable(), getSettings(), saveSettings(), withJsonl(), renameChat(), deleteChat(), BackendStatus (+13 more)

### Community 8 - "Community 8"
Cohesion: 0.11
Nodes (18): fp, Fingerprint, NEGATIVE, fingerprintVersion(), htmlLooksLikeSillyTavern(), mapPool(), jsonResponse(), ST_VERSION (+10 more)

### Community 25 - "Community 25"
Cohesion: 0.53
Nodes (7): hosts, ipv4ToInt(), intToIpv4(), enumerateSubnetHosts(), enumerateSubnet24(), sameSubnet24(), netmaskToPrefix()

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (86): power, seraphina, many, HistoryMessage, TokenCounter, BuildPromptInput, BuildPromptResult, gatherDepthInjections() (+78 more)

### Community 5 - "Community 5"
Cohesion: 0.15
Nodes (19): ChatCompletionBodyOptions, createChatCompletionBody(), BuildMessagesInput, sanitizeName(), squashSystemMessages(), buildChatCompletionMessages(), fields, oai (+11 more)

### Community 26 - "Community 26"
Cohesion: 0.22
Nodes (8): plainPower, char, base, story, example, turn, lore, depth

### Community 2 - "Community 2"
Cohesion: 0.10
Nodes (31): CheckWorldInfoParams, TimedWorldInfoState, emptyTimedState(), pickGroupWinner(), filterByInclusionGroups(), checkWorldInfo(), worldFileToEntries(), characterBookToEntries() (+23 more)

### Community 9 - "Community 9"
Cohesion: 0.10
Nodes (11): clock, pacer, pending, t, behind, clock2, normal, smoothDelayMs() (+3 more)

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (16): p, events, SseEvent, SseParser, stream, tokens, delta, reader (+8 more)

### Community 21 - "Community 21"
Cohesion: 0.31
Nodes (7): StDepthPrompt, StCharacterExtensions, StCharacterData, StCharacter, StChatMetadata, StMessageExtra, StVersion

## Knowledge Gaps
- **145 isolated node(s):** `config`, `TAB_ICON`, `TabBarProps`, `CharacterCard`, `Bucket` (+140 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 34`** (1 nodes): `config`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (2 nodes): `{ defineConfig }`, `expoConfig`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (2 nodes): `{ withGradleProperties }`, `PROPS`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (1 nodes): `{ withAppBuildGradle }`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (2 nodes): `entryUid()`, `LoreSheet()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SmoothPacer` connect `Community 9` to `Community 7`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `StClient` connect `Community 14` to `Community 3`, `Community 7`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `SseParser` connect `Community 4` to `Community 7`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `config`, `TAB_ICON`, `TabBarProps` to the rest of the system?**
  _145 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.056687565308254965 - nodes in this community are weakly interconnected._
- **Should `Community 10` be split into smaller, more focused modules?**
  _Cohesion score 0.11688311688311688 - nodes in this community are weakly interconnected._
- **Should `Community 11` be split into smaller, more focused modules?**
  _Cohesion score 0.11428571428571428 - nodes in this community are weakly interconnected._