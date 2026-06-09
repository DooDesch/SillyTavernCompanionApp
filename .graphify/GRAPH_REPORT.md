# Graph Report - .  (2026-06-09)

## Corpus Check
- 137 files · ~67.485 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 618 nodes · 1392 edges · 27 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output
- Edge kinds: contains: 471 · imports: 340 · imports_from: 304 · re_exports: 170 · calls: 90 · method: 17


## Input Scope
- Requested: auto
- Resolved: committed (source: default-auto)
- Included files: 137 · Candidates: 156
- Excluded: 0 untracked · 71663 ignored · 3 sensitive · 0 missing committed
- Recommendation: Use --scope all or graphify.yaml inputs.corpus for a knowledge-base folder.

## Graph Freshness
- Built from Git commit: `4368834`
- Compare this hash to `git rev-parse HEAD` before trusting freshness-sensitive graph output.
## God Nodes (most connected - your core abstractions)
1. `Icon()` - 15 edges
2. `useConnection` - 14 edges
3. `haptics` - 14 edges
4. `StClient` - 14 edges
5. `Identity` - 12 edges
6. `AppText()` - 11 edges
7. `substituteParams()` - 10 edges
8. `IconName` - 8 edges
9. `CookieJar` - 8 edges
10. `PowerUserSubset` - 8 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (86): BuildPromptInput, BuildPromptResult, buildTextCompletionPrompt(), gatherDepthInjections(), HistoryMessage, many, power, seraphina (+78 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (48): ImageViewerModal(), CharacterCard, TAB_ICON, TabBarProps, haptics, Icon(), IconName, ICONS (+40 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (32): Bubble, DOT, GenMode, AuthorsNoteSheet(), AuthorsNoteValue, ROLES, entryUid(), LoreSheet() (+24 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (31): checkWorldInfo(), CheckWorldInfoParams, emptyTimedState(), filterByInclusionGroups(), pickGroupWinner(), TimedWorldInfoState, characterBookToEntries(), extractWorldInfoSettings() (+23 more)

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (19): chat, client, header, message, BasicAuthCredentials, StClientOptions, StResponse, KoboldInstance (+11 more)

### Community 5 - "Community 5"
Cohesion: 0.10
Nodes (16): SseEvent, SseParser, events, p, chunk, decoder, GenerateStreamRequest, parser (+8 more)

### Community 6 - "Community 6"
Cohesion: 0.15
Nodes (19): ChatCompletionBodyOptions, createChatCompletionBody(), buildChatCompletionMessages(), BuildMessagesInput, sanitizeName(), squashSystemMessages(), fields, oai (+11 more)

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
Cohesion: 0.22
Nodes (16): discoverInstances(), discoverKobold(), DiscoverOptions, KoboldDiscoverOptions, localIpv4(), uniq(), usableHint(), getHint() (+8 more)

### Community 11 - "Community 11"
Cohesion: 0.20
Nodes (8): StClient, calls, client, fetchImpl(), lastPost, makeResponse(), postCall, Recorded

### Community 12 - "Community 12"
Cohesion: 0.19
Nodes (8): PickerOption, PickerSheet(), useBackendStatus(), ConnectionSettingsView, useConnectionProfiles(), useEngineConfig(), parseStSettings(), useProfiles

### Community 13 - "Community 13"
Cohesion: 0.18
Nodes (13): Block, COLORS, INLINE, InlineText(), MONO, parseBlocks(), parseInline(), proseToBlocks() (+5 more)

### Community 14 - "Community 14"
Cohesion: 0.23
Nodes (5): Lorebook, useLorebook(), fetchLike(), ConnectionState, useConnection

### Community 15 - "Community 15"
Cohesion: 0.18
Nodes (6): persister, queryClient, useLocale, SavedServer, ServersState, useServers

### Community 16 - "Community 16"
Cohesion: 0.26
Nodes (6): CookieJar, readSetCookie(), SetCookieReadable, splitSetCookieHeader(), headers, jar

### Community 17 - "Community 17"
Cohesion: 0.24
Nodes (7): Avatar(), FALLBACK_TINTS, tintFor(), Bucket, RecentChatRow(), relativeTime(), Row

### Community 18 - "Community 18"
Cohesion: 0.31
Nodes (7): StCharacter, StCharacterData, StCharacterExtensions, StDepthPrompt, StChatMetadata, StMessageExtra, StVersion

### Community 19 - "Community 19"
Cohesion: 0.25
Nodes (5): mem, rememberBaseUrl(), secrets, storage, ProfilesState

### Community 20 - "Community 20"
Cohesion: 0.53
Nodes (7): enumerateSubnet24(), enumerateSubnetHosts(), intToIpv4(), ipv4ToInt(), netmaskToPrefix(), sameSubnet24(), hosts

### Community 21 - "Community 21"
Cohesion: 0.22
Nodes (8): base, char, depth, example, lore, plainPower, story, turn

### Community 22 - "Community 22"
Cohesion: 0.32
Nodes (5): AppLanguage, deviceLanguage(), SUPPORTED_LANGUAGES, LanguagePref, LocaleState

### Community 23 - "Community 23"
Cohesion: 0.50
Nodes (3): { palette, radii }, palette, radii

### Community 24 - "Community 24"
Cohesion: 0.50
Nodes (3): config, { getDefaultConfig }, { withNativeWind }

### Community 25 - "Community 25"
Cohesion: 0.67
Nodes (2): { defineConfig }, expoConfig

### Community 26 - "Community 26"
Cohesion: 1.00
Nodes (1): config

## Knowledge Gaps
- **127 isolated node(s):** `config`, `TAB_ICON`, `TabBarProps`, `CharacterCard`, `Bucket` (+122 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 25`** (2 nodes): `{ defineConfig }`, `expoConfig`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (1 nodes): `config`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `StClient` connect `Community 11` to `Community 4`, `Community 8`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `SseParser` connect `Community 5` to `Community 8`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `CookieJar` connect `Community 16` to `Community 4`, `Community 8`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `config`, `TAB_ICON`, `TabBarProps` to the rest of the system?**
  _127 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05054211843202669 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06049382716049383 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05519480519480519 - nodes in this community are weakly interconnected._