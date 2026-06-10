# Graph Report - .  (2026-06-10)

## Corpus Check
- 160 files · ~82.794 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 664 nodes · 1469 edges · 31 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output
- Edge kinds: contains: 501 · imports: 355 · imports_from: 320 · re_exports: 174 · calls: 93 · method: 26


## Input Scope
- Requested: auto
- Resolved: committed (source: default-auto)
- Included files: 160 · Candidates: 180
- Excluded: 1 untracked · 68454 ignored · 3 sensitive · 0 missing committed
- Recommendation: Use --scope all or graphify.yaml inputs.corpus for a knowledge-base folder.

## Graph Freshness
- Built from Git commit: `d63df9a`
- Compare this hash to `git rev-parse HEAD` before trusting freshness-sensitive graph output.
## God Nodes (most connected - your core abstractions)
1. `Icon()` - 16 edges
2. `useConnection` - 14 edges
3. `haptics` - 14 edges
4. `StClient` - 14 edges
5. `Identity` - 12 edges
6. `SmoothPacer` - 12 edges
7. `AppText()` - 11 edges
8. `substituteParams()` - 10 edges
9. `IconName` - 8 edges
10. `CookieJar` - 8 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 29 - "Community 29"
Cohesion: 1.00
Nodes (1): config

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (48): TAB_ICON, TabBarProps, CharacterCard, ImageViewerModal(), TextColor, COLOR, AppTextProps, AppText() (+40 more)

### Community 20 - "Community 20"
Cohesion: 0.24
Nodes (7): relativeTime(), Bucket, Row, RecentChatRow(), FALLBACK_TINTS, tintFor(), Avatar()

### Community 13 - "Community 13"
Cohesion: 0.17
Nodes (9): PickerOption, PickerSheet(), useBackendStatus(), ConnectionSettingsView, useConnectionProfiles(), useEngineConfig(), parseStSettings(), ProfilesState (+1 more)

### Community 12 - "Community 12"
Cohesion: 0.12
Nodes (11): persister, queryClient, mem, storage, secrets, rememberBaseUrl(), PrefsState, usePrefs (+3 more)

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (13): GenMode, Bubble, AuthorsNoteValue, ROLES, AuthorsNoteSheet(), entryUid(), LoreSheet(), nowSendDate() (+5 more)

### Community 17 - "Community 17"
Cohesion: 0.23
Nodes (5): Lorebook, useLorebook(), fetchLike(), ConnectionState, useConnection

### Community 28 - "Community 28"
Cohesion: 0.67
Nodes (2): { defineConfig }, expoConfig

### Community 27 - "Community 27"
Cohesion: 0.50
Nodes (3): { getDefaultConfig }, { withNativeWind }, config

### Community 30 - "Community 30"
Cohesion: 1.00
Nodes (1): { withAppBuildGradle }

### Community 18 - "Community 18"
Cohesion: 0.27
Nodes (8): QuickSettingsSheet(), safe(), syncPersonaToPc(), syncSelectedProfileToPc(), syncPowerUser(), syncTextgen(), syncOai(), syncRoot()

### Community 16 - "Community 16"
Cohesion: 0.18
Nodes (13): COLORS, Span, Block, splitFences(), proseToBlocks(), parseBlocks(), INLINE, parseInline() (+5 more)

### Community 6 - "Community 6"
Cohesion: 0.10
Nodes (17): StreamingBubbleContent(), DOT, ReasoningBlock(), GenerateOptions, GenerationChunk, history, countTokens, delta (+9 more)

### Community 21 - "Community 21"
Cohesion: 0.24
Nodes (6): SUPPORTED_LANGUAGES, AppLanguage, deviceLanguage(), LanguagePref, LocaleState, useLocale

### Community 14 - "Community 14"
Cohesion: 0.22
Nodes (16): DiscoverOptions, uniq(), localIpv4(), usableHint(), discoverInstances(), KoboldDiscoverOptions, discoverKobold(), HostHint (+8 more)

### Community 23 - "Community 23"
Cohesion: 0.31
Nodes (6): fileStorage, draftKey(), ChatDraft, writeChatDraft(), readChatDraft(), clearChatDraft()

### Community 26 - "Community 26"
Cohesion: 0.50
Nodes (3): palette, radii, { palette, radii }

### Community 8 - "Community 8"
Cohesion: 0.14
Nodes (18): chat, getIntegritySlug(), isIntegrityConflict(), header, msg1, msg2, chat, arr (+10 more)

### Community 15 - "Community 15"
Cohesion: 0.20
Nodes (8): makeResponse(), Recorded, calls, fetchImpl(), client, postCall, lastPost, StClient

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (19): BasicAuthCredentials, StClientOptions, StResponse, header, message, client, chat, jsonResponse() (+11 more)

### Community 19 - "Community 19"
Cohesion: 0.26
Nodes (6): jar, headers, SetCookieReadable, splitSetCookieHeader(), readSetCookie(), CookieJar

### Community 9 - "Community 9"
Cohesion: 0.16
Nodes (21): getVersion(), isReachable(), getSettings(), saveSettings(), withJsonl(), renameChat(), deleteChat(), BackendStatus (+13 more)

### Community 10 - "Community 10"
Cohesion: 0.11
Nodes (18): fp, Fingerprint, NEGATIVE, fingerprintVersion(), htmlLooksLikeSillyTavern(), mapPool(), jsonResponse(), ST_VERSION (+10 more)

### Community 24 - "Community 24"
Cohesion: 0.53
Nodes (7): hosts, ipv4ToInt(), intToIpv4(), enumerateSubnetHosts(), enumerateSubnet24(), sameSubnet24(), netmaskToPrefix()

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (86): power, seraphina, many, HistoryMessage, TokenCounter, BuildPromptInput, BuildPromptResult, gatherDepthInjections() (+78 more)

### Community 7 - "Community 7"
Cohesion: 0.15
Nodes (19): ChatCompletionBodyOptions, createChatCompletionBody(), BuildMessagesInput, sanitizeName(), squashSystemMessages(), buildChatCompletionMessages(), fields, oai (+11 more)

### Community 25 - "Community 25"
Cohesion: 0.22
Nodes (8): plainPower, char, base, story, example, turn, lore, depth

### Community 2 - "Community 2"
Cohesion: 0.10
Nodes (31): CheckWorldInfoParams, TimedWorldInfoState, emptyTimedState(), pickGroupWinner(), filterByInclusionGroups(), checkWorldInfo(), worldFileToEntries(), characterBookToEntries() (+23 more)

### Community 11 - "Community 11"
Cohesion: 0.10
Nodes (11): clock, pacer, pending, t, behind, clock2, normal, smoothDelayMs() (+3 more)

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (16): p, events, SseEvent, SseParser, stream, tokens, delta, reader (+8 more)

### Community 22 - "Community 22"
Cohesion: 0.31
Nodes (7): StDepthPrompt, StCharacterExtensions, StCharacterData, StCharacter, StChatMetadata, StMessageExtra, StVersion

## Knowledge Gaps
- **141 isolated node(s):** `config`, `TAB_ICON`, `TabBarProps`, `CharacterCard`, `Bucket` (+136 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 29`** (1 nodes): `config`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (2 nodes): `{ defineConfig }`, `expoConfig`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (1 nodes): `{ withAppBuildGradle }`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SmoothPacer` connect `Community 11` to `Community 9`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `StClient` connect `Community 15` to `Community 3`, `Community 9`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `SseParser` connect `Community 4` to `Community 9`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `config`, `TAB_ICON`, `TabBarProps` to the rest of the system?**
  _141 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06049382716049383 - nodes in this community are weakly interconnected._
- **Should `Community 12` be split into smaller, more focused modules?**
  _Cohesion score 0.12380952380952381 - nodes in this community are weakly interconnected._
- **Should `Community 5` be split into smaller, more focused modules?**
  _Cohesion score 0.11384615384615385 - nodes in this community are weakly interconnected._