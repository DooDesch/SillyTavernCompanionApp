# Graph Report - .  (2026-06-09)

## Corpus Check
- Corpus is ~46.135 words - fits in a single context window. You may not need a graph.

## Summary
- 427 nodes · 926 edges · 13 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output
- Edge kinds: contains: 316 · imports: 215 · imports_from: 184 · re_exports: 131 · calls: 63 · method: 17


## Input Scope
- Requested: auto
- Resolved: committed (source: default-auto)
- Included files: 100 · Candidates: 113
- Excluded: 0 untracked · 63715 ignored · 0 sensitive · 0 missing committed
- Recommendation: Use --scope all or graphify.yaml inputs.corpus for a knowledge-base folder.

## Graph Freshness
- Built from Git commit: `c59d8f7`
- Compare this hash to `git rev-parse HEAD` before trusting freshness-sensitive graph output.
## God Nodes (most connected - your core abstractions)
1. `StClient` - 14 edges
2. `useConnection` - 13 edges
3. `Identity` - 11 edges
4. `substituteParams()` - 9 edges
5. `CookieJar` - 8 edges
6. `SseParser` - 8 edges
7. `StChat` - 8 edges
8. `FetchLike` - 7 edges
9. `OaiSettings` - 7 edges
10. `PowerUserSubset` - 7 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (72): BuildPromptInput, BuildPromptResult, buildTextCompletionPrompt(), HistoryMessage, TokenCounter, baseChatReplace(), CharacterCardFields, ChatFieldOverrides (+64 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (56): getIntegritySlug(), isIntegrityConflict(), chat, chatFromArray(), chatToArray(), createChatHeader(), parseChatJsonl(), stringifyChatJsonl() (+48 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (28): Bubble, GenMode, Avatar(), PickerOption, PickerSheet(), ConnectionSettingsView, useConnectionProfiles(), useEngineConfig() (+20 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (37): calls, client, fetchImpl(), lastPost, makeResponse(), postCall, Recorded, Fingerprint (+29 more)

### Community 4 - "Community 4"
Cohesion: 0.13
Nodes (24): checkWorldInfo(), CheckWorldInfoParams, characterBookToEntries(), extractWorldInfoSettings(), globalWorldNames(), worldFileToEntries(), escapeRegex(), matchKeys() (+16 more)

### Community 5 - "Community 5"
Cohesion: 0.10
Nodes (16): SseEvent, SseParser, events, p, chunk, decoder, GenerateStreamRequest, parser (+8 more)

### Community 6 - "Community 6"
Cohesion: 0.17
Nodes (17): ChatCompletionBodyOptions, createChatCompletionBody(), buildChatCompletionMessages(), BuildMessagesInput, squashSystemMessages(), fields, oai, getChatCompletionModel() (+9 more)

### Community 7 - "Community 7"
Cohesion: 0.19
Nodes (16): discoverInstances(), discoverKobold(), DiscoverOptions, KoboldDiscoverOptions, localIpv4(), uniq(), usableHint(), getHint() (+8 more)

### Community 8 - "Community 8"
Cohesion: 0.26
Nodes (6): CookieJar, readSetCookie(), SetCookieReadable, splitSetCookieHeader(), headers, jar

### Community 9 - "Community 9"
Cohesion: 0.20
Nodes (8): Block, COLORS, INLINE, MONO, RichText, RichTextImpl(), Span, splitBlocks()

### Community 10 - "Community 10"
Cohesion: 0.47
Nodes (1): StClient

### Community 11 - "Community 11"
Cohesion: 0.50
Nodes (3): config, { getDefaultConfig }, { withNativeWind }

### Community 12 - "Community 12"
Cohesion: 1.00
Nodes (1): config

## Knowledge Gaps
- **84 isolated node(s):** `config`, `GenMode`, `Bubble`, `{ getDefaultConfig }`, `{ withNativeWind }` (+79 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 10`** (1 nodes): `StClient`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 12`** (1 nodes): `config`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `StClient` connect `Community 10` to `Community 3`, `Community 1`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `SseParser` connect `Community 5` to `Community 1`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `CookieJar` connect `Community 8` to `Community 1`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `config`, `GenMode`, `Bubble` to the rest of the system?**
  _84 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.058050645007166744 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05837837837837838 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05357142857142857 - nodes in this community are weakly interconnected._