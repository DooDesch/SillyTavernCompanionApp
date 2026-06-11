# Graph Report - .  (2026-06-11)

## Corpus Check
- 203 files · ~120.806 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 852 nodes · 1866 edges · 46 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output
- Edge kinds: contains: 652 · imports: 466 · imports_from: 408 · re_exports: 195 · calls: 116 · method: 29


## Input Scope
- Requested: auto
- Resolved: committed (source: default-auto)
- Included files: 203 · Candidates: 224
- Excluded: 0 untracked · 44884 ignored · 3 sensitive · 0 missing committed
- Recommendation: Use --scope all or graphify.yaml inputs.corpus for a knowledge-base folder.

## Graph Freshness
- Built from Git commit: `589d2a2`
- Compare this hash to `git rev-parse HEAD` before trusting freshness-sensitive graph output.
## God Nodes (most connected - your core abstractions)
1. `Icon()` - 20 edges
2. `useConnection` - 18 edges
3. `StClient` - 18 edges
4. `haptics` - 17 edges
5. `AppText()` - 13 edges
6. `Identity` - 12 edges
7. `SmoothPacer` - 12 edges
8. `safe()` - 11 edges
9. `substituteParams()` - 10 edges
10. `PowerUserSubset` - 9 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 44 - "Community 44"
Cohesion: 1.00
Nodes (1): config

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (55): TAB_ICON, TabBarProps, CharacterCard, rawField(), splitExamples(), CharacterScreen(), ImageViewerModal(), TextColor (+47 more)

### Community 21 - "Community 21"
Cohesion: 0.17
Nodes (11): relativeTime(), Bucket, chatFileLabel(), Row, RecentChatRow(), ChatFileRow(), FALLBACK_TINTS, tintFor() (+3 more)

### Community 17 - "Community 17"
Cohesion: 0.17
Nodes (9): PickerOption, PickerSheet(), useBackendStatus(), ConnectionSettingsView, useConnectionProfiles(), useEngineConfig(), parseStSettings(), ProfilesState (+1 more)

### Community 8 - "Community 8"
Cohesion: 0.11
Nodes (16): persister, ScreenStateModule, ScreenState, addScreenOffListener(), LockGate(), SUPPORTED_LANGUAGES, AppLanguage, deviceLanguage() (+8 more)

### Community 10 - "Community 10"
Cohesion: 0.09
Nodes (13): GenMode, MVCP, Bubble, AuthorsNoteValue, ROLES, AuthorsNoteSheet(), ReadAloudBar(), CHUNK_MAX (+5 more)

### Community 18 - "Community 18"
Cohesion: 0.16
Nodes (8): Lorebook, useLorebook(), fetchLike(), mem, storage, rememberBaseUrl(), ConnectionState, useConnection

### Community 11 - "Community 11"
Cohesion: 0.13
Nodes (18): OPEN_BY_DEFAULT, Draft, ToggleRow(), TextAreaRow(), SegmentedRow(), OrderListRow(), CollapsibleHeader(), GenTarget (+10 more)

### Community 22 - "Community 22"
Cohesion: 0.19
Nodes (11): cases, b64, bytes, part, AvatarFilePart, B64_LOOKUP, base64ToBytes(), makeAvatarFilePart() (+3 more)

### Community 42 - "Community 42"
Cohesion: 0.67
Nodes (2): { defineConfig }, expoConfig

### Community 39 - "Community 39"
Cohesion: 0.50
Nodes (3): { getDefaultConfig }, { withNativeWind }, config

### Community 43 - "Community 43"
Cohesion: 0.67
Nodes (2): { withGradleProperties }, PROPS

### Community 45 - "Community 45"
Cohesion: 1.00
Nodes (1): { withAppBuildGradle }

### Community 40 - "Community 40"
Cohesion: 0.50
Nodes (2): entryUid(), LoreSheet()

### Community 19 - "Community 19"
Cohesion: 0.20
Nodes (13): CONTEXT_PRESETS, QuickSettingsSheet(), safe(), syncPersonaToPc(), syncPersonaUpsert(), syncPersonaDelete(), syncDefaultPersona(), syncSelectedProfileToPc() (+5 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (21): COLORS, Block, splitFences(), proseToBlocks(), parseBlocks(), InlineText(), RichTextImpl(), RichText (+13 more)

### Community 30 - "Community 30"
Cohesion: 0.25
Nodes (5): StreamingBubbleContent(), DOT, ReasoningBlock(), events, streamDebug

### Community 20 - "Community 20"
Cohesion: 0.22
Nodes (16): DiscoverOptions, uniq(), localIpv4(), usableHint(), discoverInstances(), KoboldDiscoverOptions, discoverKobold(), HostHint (+8 more)

### Community 31 - "Community 31"
Cohesion: 0.22
Nodes (6): GenerateOptions, GenerationChunk, UnsupportedApiError, history, countTokens, delta

### Community 37 - "Community 37"
Cohesion: 0.60
Nodes (5): nowSendDate(), newMessageId(), ensureIds(), makeUserMessage(), makeAssistantMessage()

### Community 32 - "Community 32"
Cohesion: 0.31
Nodes (6): fileStorage, draftKey(), ChatDraft, writeChatDraft(), readChatDraft(), clearChatDraft()

### Community 33 - "Community 33"
Cohesion: 0.28
Nodes (7): StreamSnapshot, IDLE, listeners, emit(), finishDrain(), loop(), streamingSession

### Community 41 - "Community 41"
Cohesion: 0.67
Nodes (3): ensureSetup(), showTtsNotification(), hideTtsNotification()

### Community 27 - "Community 27"
Cohesion: 0.29
Nodes (8): UpdateInfo, compareVersions(), GithubRelease, releaseVersion(), checkForUpdate(), downloadAndInstallUpdate(), UpdateState, useUpdates

### Community 35 - "Community 35"
Cohesion: 0.32
Nodes (6): SavedServer, safeKey(), credUserKey(), credPassKey(), ServersState, useServers

### Community 38 - "Community 38"
Cohesion: 0.50
Nodes (3): palette, radii, { palette, radii }

### Community 13 - "Community 13"
Cohesion: 0.14
Nodes (18): chat, getIntegritySlug(), isIntegrityConflict(), header, msg1, msg2, chat, arr (+10 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (26): makeResponse(), Recorded, calls, fetchImpl(), client, postCall, lastPost, BasicAuthCredentials (+18 more)

### Community 6 - "Community 6"
Cohesion: 0.13
Nodes (12): StClient, Recorded, { client, calls }, form, call, { client }, crop, FormDataLike (+4 more)

### Community 25 - "Community 25"
Cohesion: 0.26
Nodes (6): jar, headers, SetCookieReadable, splitSetCookieHeader(), readSetCookie(), CookieJar

### Community 14 - "Community 14"
Cohesion: 0.16
Nodes (21): getVersion(), isReachable(), getSettings(), saveSettings(), withJsonl(), renameChat(), deleteChat(), BackendStatus (+13 more)

### Community 15 - "Community 15"
Cohesion: 0.11
Nodes (18): fp, Fingerprint, NEGATIVE, fingerprintVersion(), htmlLooksLikeSillyTavern(), mapPool(), jsonResponse(), ST_VERSION (+10 more)

### Community 34 - "Community 34"
Cohesion: 0.53
Nodes (7): hosts, ipv4ToInt(), intToIpv4(), enumerateSubnetHosts(), enumerateSubnet24(), sameSubnet24(), netmaskToPrefix()

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (36): arr, map, base, next, horde, MainApi, MAIN_APIS, normalizeMainApi() (+28 more)

### Community 23 - "Community 23"
Cohesion: 0.13
Nodes (13): power, seraphina, many, gatherDepthInjections(), buildTextCompletionPrompt(), plainPower, char, base (+5 more)

### Community 5 - "Community 5"
Cohesion: 0.17
Nodes (24): HistoryMessage, TokenCounter, BuildPromptResult, CharacterCardFields, ChatFieldOverrides, baseChatReplace(), getCharacterCardFields(), EXTENSION_ROLE (+16 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (34): BuildPromptInput, ChatCompletionBodyOptions, createChatCompletionBody(), BuildMessagesInput, sanitizeName(), squashSystemMessages(), buildChatCompletionMessages(), fields (+26 more)

### Community 12 - "Community 12"
Cohesion: 0.17
Nodes (20): InstructContext, subst(), applyNameMacro(), formatInstructModeChat(), formatInstructModeStoryString(), formatInstructModePrompt(), getInstructStoppingSequences(), getCustomStoppingStrings() (+12 more)

### Community 36 - "Community 36"
Cohesion: 0.48
Nodes (6): parseMesExamples(), ExampleMessage, parseExampleIntoIndividual(), applyName(), formatInstructModeExamples(), getExampleBlocks()

### Community 28 - "Community 28"
Cohesion: 0.22
Nodes (4): MacroValue, EnvObject, escapeRegex(), substituteMacros()

### Community 24 - "Community 24"
Cohesion: 0.19
Nodes (11): s, pu, list, PERSONA_POSITIONS, PERSONA_SELECTABLE_POSITIONS, PersonaFields, PersonaPowerUser, upsertPersona() (+3 more)

### Community 26 - "Community 26"
Cohesion: 0.26
Nodes (10): base, opts, r, body, TextgenSettings, TextgenBodyOptions, parseSequenceBreakers(), getTextgenServer() (+2 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (31): CheckWorldInfoParams, TimedWorldInfoState, emptyTimedState(), pickGroupWinner(), filterByInclusionGroups(), checkWorldInfo(), worldFileToEntries(), characterBookToEntries() (+23 more)

### Community 16 - "Community 16"
Cohesion: 0.10
Nodes (11): clock, pacer, pending, t, behind, clock2, normal, smoothDelayMs() (+3 more)

### Community 7 - "Community 7"
Cohesion: 0.10
Nodes (16): p, events, SseEvent, SseParser, stream, tokens, delta, reader (+8 more)

### Community 29 - "Community 29"
Cohesion: 0.31
Nodes (7): StDepthPrompt, StCharacterExtensions, StCharacterData, StCharacter, StChatMetadata, StMessageExtra, StVersion

## Knowledge Gaps
- **207 isolated node(s):** `config`, `TAB_ICON`, `TabBarProps`, `CharacterCard`, `Bucket` (+202 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 44`** (1 nodes): `config`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (2 nodes): `{ defineConfig }`, `expoConfig`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (2 nodes): `{ withGradleProperties }`, `PROPS`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (1 nodes): `{ withAppBuildGradle }`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (2 nodes): `entryUid()`, `LoreSheet()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `StClient` connect `Community 6` to `Community 4`, `Community 14`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `SmoothPacer` connect `Community 16` to `Community 14`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `StCharacter` connect `Community 29` to `Community 14`, `Community 23`, `Community 5`, `Community 12`, `Community 1`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `config`, `TAB_ICON`, `TabBarProps` to the rest of the system?**
  _207 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05021929824561404 - nodes in this community are weakly interconnected._
- **Should `Community 8` be split into smaller, more focused modules?**
  _Cohesion score 0.11076923076923077 - nodes in this community are weakly interconnected._
- **Should `Community 10` be split into smaller, more focused modules?**
  _Cohesion score 0.09333333333333334 - nodes in this community are weakly interconnected._