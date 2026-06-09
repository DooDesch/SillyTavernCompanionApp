# Graph Report - .  (2026-06-09)

## Corpus Check
- 114 files · ~58.593 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 532 nodes · 1165 edges · 28 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output
- Edge kinds: contains: 408 · imports: 276 · imports_from: 228 · re_exports: 148 · calls: 88 · method: 17


## Input Scope
- Requested: auto
- Resolved: committed (source: default-auto)
- Included files: 114 · Candidates: 132
- Excluded: 0 untracked · 63273 ignored · 2 sensitive · 0 missing committed
- Recommendation: Use --scope all or graphify.yaml inputs.corpus for a knowledge-base folder.

## Graph Freshness
- Built from Git commit: `4c3412e`
- Compare this hash to `git rev-parse HEAD` before trusting freshness-sensitive graph output.
## God Nodes (most connected - your core abstractions)
1. `useConnection` - 14 edges
2. `StClient` - 14 edges
3. `Identity` - 12 edges
4. `substituteParams()` - 10 edges
5. `CookieJar` - 8 edges
6. `PowerUserSubset` - 8 edges
7. `SseParser` - 8 edges
8. `StCharacter` - 8 edges
9. `StChat` - 8 edges
10. `safe()` - 7 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (79): BuildPromptInput, BuildPromptResult, buildTextCompletionPrompt(), gatherDepthInjections(), HistoryMessage, TokenCounter, baseChatReplace(), CharacterCardFields (+71 more)

### Community 1 - "Community 1"
Cohesion: 0.10
Nodes (31): checkWorldInfo(), CheckWorldInfoParams, emptyTimedState(), filterByInclusionGroups(), pickGroupWinner(), TimedWorldInfoState, characterBookToEntries(), extractWorldInfoSettings() (+23 more)

### Community 2 - "Community 2"
Cohesion: 0.10
Nodes (16): SseEvent, SseParser, events, p, chunk, decoder, GenerateStreamRequest, parser (+8 more)

### Community 3 - "Community 3"
Cohesion: 0.15
Nodes (19): ChatCompletionBodyOptions, createChatCompletionBody(), buildChatCompletionMessages(), BuildMessagesInput, sanitizeName(), squashSystemMessages(), fields, oai (+11 more)

### Community 4 - "Community 4"
Cohesion: 0.13
Nodes (12): Bubble, GenMode, AuthorsNoteSheet(), AuthorsNoteValue, ROLES, entryUid(), LoreSheet(), ensureIds() (+4 more)

### Community 5 - "Community 5"
Cohesion: 0.14
Nodes (18): getIntegritySlug(), isIntegrityConflict(), chat, chatFromArray(), chatToArray(), createChatHeader(), parseChatJsonl(), stringifyChatJsonl() (+10 more)

### Community 6 - "Community 6"
Cohesion: 0.16
Nodes (21): BackendStatus, ChatFileInfo, deleteChat(), getAllCharacters(), getCharacter(), getCharacterChats(), getChat(), getChatCompletionStatus() (+13 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (18): many, power, seraphina, base, char, depth, example, lore (+10 more)

### Community 8 - "Community 8"
Cohesion: 0.16
Nodes (7): Avatar(), ImageViewerModal(), fetchLike(), ConnectionState, useConnection, RecentChatRow(), relativeTime()

### Community 9 - "Community 9"
Cohesion: 0.19
Nodes (16): discoverInstances(), discoverKobold(), DiscoverOptions, KoboldDiscoverOptions, localIpv4(), uniq(), usableHint(), getHint() (+8 more)

### Community 10 - "Community 10"
Cohesion: 0.20
Nodes (8): StClient, calls, client, fetchImpl(), lastPost, makeResponse(), postCall, Recorded

### Community 11 - "Community 11"
Cohesion: 0.17
Nodes (9): PickerOption, PickerSheet(), useBackendStatus(), AppLanguage, deviceLanguage(), SUPPORTED_LANGUAGES, LanguagePref, LocaleState (+1 more)

### Community 12 - "Community 12"
Cohesion: 0.16
Nodes (10): ConnectionSettingsView, useConnectionProfiles(), useEngineConfig(), parseStSettings(), mem, rememberBaseUrl(), secrets, storage (+2 more)

### Community 13 - "Community 13"
Cohesion: 0.18
Nodes (13): Block, COLORS, INLINE, InlineText(), MONO, parseBlocks(), parseInline(), proseToBlocks() (+5 more)

### Community 14 - "Community 14"
Cohesion: 0.16
Nodes (9): chat, client, header, message, BasicAuthCredentials, StClientOptions, StResponse, FetchInitLike (+1 more)

### Community 15 - "Community 15"
Cohesion: 0.20
Nodes (9): Fingerprint, fingerprintVersion(), htmlLooksLikeSillyTavern(), NEGATIVE, fp, mapPool(), probeInstance(), ProbeOptions (+1 more)

### Community 16 - "Community 16"
Cohesion: 0.19
Nodes (10): KoboldInstance, KoboldProbeOptions, KoboldScanOptions, probeKobold(), scanForKobold(), calls, fetchImpl, jsonResponse() (+2 more)

### Community 17 - "Community 17"
Cohesion: 0.20
Nodes (5): persister, queryClient, SavedServer, ServersState, useServers

### Community 18 - "Community 18"
Cohesion: 0.30
Nodes (8): QuickSettingsSheet(), safe(), syncOai(), syncPersonaToPc(), syncPowerUser(), syncRoot(), syncSelectedProfileToPc(), syncTextgen()

### Community 19 - "Community 19"
Cohesion: 0.26
Nodes (6): CookieJar, readSetCookie(), SetCookieReadable, splitSetCookieHeader(), headers, jar

### Community 20 - "Community 20"
Cohesion: 0.22
Nodes (9): scanSubnet(), ac, calls, fetchImpl, hosts, jsonResponse(), onFound, order (+1 more)

### Community 21 - "Community 21"
Cohesion: 0.22
Nodes (4): EnvObject, escapeRegex(), MacroValue, substituteMacros()

### Community 22 - "Community 22"
Cohesion: 0.31
Nodes (6): ChatDraft, clearChatDraft(), draftKey(), fileStorage, readChatDraft(), writeChatDraft()

### Community 23 - "Community 23"
Cohesion: 0.53
Nodes (7): enumerateSubnet24(), enumerateSubnetHosts(), intToIpv4(), ipv4ToInt(), netmaskToPrefix(), sameSubnet24(), hosts

### Community 24 - "Community 24"
Cohesion: 0.25
Nodes (5): countTokens, delta, GenerateOptions, GenerationChunk, history

### Community 25 - "Community 25"
Cohesion: 0.50
Nodes (3): config, { getDefaultConfig }, { withNativeWind }

### Community 26 - "Community 26"
Cohesion: 0.50
Nodes (2): Lorebook, useLorebook()

### Community 27 - "Community 27"
Cohesion: 1.00
Nodes (1): config

## Knowledge Gaps
- **105 isolated node(s):** `config`, `persister`, `GenMode`, `Bubble`, `{ getDefaultConfig }` (+100 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 26`** (2 nodes): `Lorebook`, `useLorebook()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (1 nodes): `config`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `StClient` connect `Community 10` to `Community 14`, `Community 6`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `SseParser` connect `Community 2` to `Community 6`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `CookieJar` connect `Community 19` to `Community 14`, `Community 6`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `config`, `persister`, `GenMode` to the rest of the system?**
  _105 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06118421052631579 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.09971509971509972 - nodes in this community are weakly interconnected._