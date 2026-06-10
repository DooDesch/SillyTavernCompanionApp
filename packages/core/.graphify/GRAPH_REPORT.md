# Graph Report - .  (2026-06-10)

## Corpus Check
- Corpus is ~23.116 words - fits in a single context window. You may not need a graph.

## Summary
- 390 nodes · 893 edges · 13 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output
- Edge kinds: contains: 296 · imports: 198 · imports_from: 161 · re_exports: 152 · calls: 60 · method: 26


## Input Scope
- Requested: auto
- Resolved: committed (source: default-auto)
- Included files: 68 · Candidates: 71
- Excluded: 0 untracked · 1 ignored · 1 sensitive · 0 missing committed
- Recommendation: Use --scope all or graphify.yaml inputs.corpus for a knowledge-base folder.

## Graph Freshness
- Built from Git commit: `15c1989`
- Compare this hash to `git rev-parse HEAD` before trusting freshness-sensitive graph output.
## God Nodes (most connected - your core abstractions)
1. `StClient` - 14 edges
2. `Identity` - 12 edges
3. `SmoothPacer` - 12 edges
4. `substituteParams()` - 10 edges
5. `CookieJar` - 8 edges
6. `PowerUserSubset` - 8 edges
7. `SseParser` - 8 edges
8. `StCharacter` - 8 edges
9. `StChat` - 8 edges
10. `FetchLike` - 7 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (75): BuildPromptInput, BuildPromptResult, buildTextCompletionPrompt(), gatherDepthInjections(), HistoryMessage, TokenCounter, baseChatReplace(), CharacterCardFields (+67 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (46): getIntegritySlug(), isIntegrityConflict(), chat, chatFromArray(), chatToArray(), createChatHeader(), parseChatJsonl(), stringifyChatJsonl() (+38 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (37): calls, client, fetchImpl(), lastPost, makeResponse(), postCall, Recorded, Fingerprint (+29 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (31): checkWorldInfo(), CheckWorldInfoParams, emptyTimedState(), filterByInclusionGroups(), pickGroupWinner(), TimedWorldInfoState, characterBookToEntries(), extractWorldInfoSettings() (+23 more)

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (16): SseEvent, SseParser, events, p, chunk, decoder, GenerateStreamRequest, parser (+8 more)

### Community 5 - "Community 5"
Cohesion: 0.15
Nodes (19): ChatCompletionBodyOptions, createChatCompletionBody(), buildChatCompletionMessages(), BuildMessagesInput, sanitizeName(), squashSystemMessages(), fields, oai (+11 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (18): many, power, seraphina, base, char, depth, example, lore (+10 more)

### Community 7 - "Community 7"
Cohesion: 0.10
Nodes (11): PacerTick, smoothDelayMs(), SmoothPacer, SmoothPacerOptions, behind, clock, clock2, normal (+3 more)

### Community 8 - "Community 8"
Cohesion: 0.26
Nodes (6): CookieJar, readSetCookie(), SetCookieReadable, splitSetCookieHeader(), headers, jar

### Community 9 - "Community 9"
Cohesion: 0.27
Nodes (9): createTextgenBody(), getTextgenServer(), parseBannedTokens(), parseSequenceBreakers(), base, body, opts, r (+1 more)

### Community 10 - "Community 10"
Cohesion: 0.47
Nodes (1): StClient

### Community 11 - "Community 11"
Cohesion: 0.22
Nodes (4): EnvObject, escapeRegex(), MacroValue, substituteMacros()

### Community 12 - "Community 12"
Cohesion: 0.53
Nodes (7): enumerateSubnet24(), enumerateSubnetHosts(), intToIpv4(), ipv4ToInt(), netmaskToPrefix(), sameSubnet24(), hosts

## Knowledge Gaps
- **85 isolated node(s):** `chat`, `header`, `msg1`, `msg2`, `chat` (+80 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 10`** (1 nodes): `StClient`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SmoothPacer` connect `Community 7` to `Community 1`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `StClient` connect `Community 10` to `Community 2`, `Community 1`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `SseParser` connect `Community 4` to `Community 1`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `chat`, `header`, `msg1` to the rest of the system?**
  _85 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06446886446886448 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06836158192090395 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06294326241134751 - nodes in this community are weakly interconnected._