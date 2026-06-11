# Graph Report - .  (2026-06-11)

## Corpus Check
- 195 files · ~118.111 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 829 nodes · 1784 edges · 52 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output
- Edge kinds: contains: 638 · imports: 432 · imports_from: 384 · re_exports: 192 · calls: 110 · method: 28


## Input Scope
- Requested: auto
- Resolved: committed (source: default-auto)
- Included files: 195 · Candidates: 216
- Excluded: 6 untracked · 44866 ignored · 3 sensitive · 0 missing committed
- Recommendation: Use --scope all or graphify.yaml inputs.corpus for a knowledge-base folder.

## Graph Freshness
- Built from Git commit: `5581d92`
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
9. `PowerUserSubset` - 9 edges
10. `StCharacter` - 9 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (37): CC_SOURCES, MAIN_APIS, MainApi, MAP, normalizeMainApi(), resolveApiSlug(), ResolvedApiSlug, arr (+29 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (34): ChatCompletionBodyOptions, createChatCompletionBody(), buildChatCompletionMessages(), BuildMessagesInput, sanitizeName(), squashSystemMessages(), fields, oai (+26 more)

### Community 2 - "Community 2"
Cohesion: 0.10
Nodes (31): checkWorldInfo(), CheckWorldInfoParams, emptyTimedState(), filterByInclusionGroups(), pickGroupWinner(), TimedWorldInfoState, characterBookToEntries(), extractWorldInfoSettings() (+23 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (27): CONTEXT_PRESETS, QuickSettingsSheet(), CollapsibleHeader(), OrderListRow(), SegmentedRow(), TextAreaRow(), ToggleRow(), CTX_PRESETS (+19 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (20): AppText(), AppTextProps, COLOR, TextColor, Badge(), DOT, TEXT, Tone (+12 more)

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (26): BackendStatus, ChatFileInfo, deleteChat(), getAllCharacters(), getCharacter(), getCharacterChats(), getChat(), getChatCompletionStatus() (+18 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (15): Bubble, DOT, GenMode, MVCP, MVCP_FOLLOW, MVCP_READ, AuthorsNoteSheet(), AuthorsNoteValue (+7 more)

### Community 7 - "Community 7"
Cohesion: 0.17
Nodes (21): HistoryMessage, TokenCounter, baseChatReplace(), CharacterCardFields, ChatFieldOverrides, getCharacterCardFields(), applyName(), ExampleMessage (+13 more)

### Community 8 - "Community 8"
Cohesion: 0.10
Nodes (16): SseEvent, SseParser, events, p, chunk, decoder, GenerateStreamRequest, parser (+8 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (21): Block, COLORS, INLINE, InlineText(), MONO, parseBlocks(), parseInline(), proseToBlocks() (+13 more)

### Community 10 - "Community 10"
Cohesion: 0.14
Nodes (18): getIntegritySlug(), isIntegrityConflict(), chat, chatFromArray(), chatToArray(), createChatHeader(), parseChatJsonl(), stringifyChatJsonl() (+10 more)

### Community 11 - "Community 11"
Cohesion: 0.09
Nodes (16): adjusted, countTokens, delta, flags, GenerateOptions, GenerationChunk, GenerationUserError, history (+8 more)

### Community 12 - "Community 12"
Cohesion: 0.10
Nodes (11): PacerTick, smoothDelayMs(), SmoothPacer, SmoothPacerOptions, behind, clock, clock2, normal (+3 more)

### Community 13 - "Community 13"
Cohesion: 0.15
Nodes (11): PickerOption, PickerSheet(), useBackendStatus(), ConnectionSettingsView, useConnectionProfiles(), useEngineConfig(), parseStSettings(), secrets (+3 more)

### Community 14 - "Community 14"
Cohesion: 0.20
Nodes (18): BuildPromptResult, DepthInjection, EXTENSION_ROLE, injectAtDepth(), roleFromString(), buildChatCompletionGenerateRequest(), buildKoboldGenerateRequest(), buildTextgenGenerateRequest() (+10 more)

### Community 15 - "Community 15"
Cohesion: 0.22
Nodes (16): discoverInstances(), discoverKobold(), DiscoverOptions, KoboldDiscoverOptions, localIpv4(), uniq(), usableHint(), getHint() (+8 more)

### Community 16 - "Community 16"
Cohesion: 0.20
Nodes (8): StClient, calls, client, fetchImpl(), lastPost, makeResponse(), postCall, Recorded

### Community 17 - "Community 17"
Cohesion: 0.15
Nodes (12): Fingerprint, fingerprintVersion(), htmlLooksLikeSillyTavern(), NEGATIVE, fp, mapPool(), probeInstance(), ProbeOptions (+4 more)

### Community 18 - "Community 18"
Cohesion: 0.17
Nodes (11): Avatar(), FALLBACK_TINTS, tintFor(), ChatActionsSheets(), ChatTarget, Bucket, chatFileLabel(), ChatFileRow() (+3 more)

### Community 19 - "Community 19"
Cohesion: 0.19
Nodes (7): CharacterScreen(), rawField(), splitExamples(), ImageViewerModal(), CharacterCard, Icon(), ICONS

### Community 20 - "Community 20"
Cohesion: 0.17
Nodes (12): KoboldInstance, KoboldProbeOptions, KoboldScanOptions, probeKobold(), scanForKobold(), calls, fetchImpl, jsonResponse() (+4 more)

### Community 21 - "Community 21"
Cohesion: 0.13
Nodes (13): buildTextCompletionPrompt(), gatherDepthInjections(), many, power, seraphina, base, char, depth (+5 more)

### Community 22 - "Community 22"
Cohesion: 0.24
Nodes (13): applyNameMacro(), FORCE_SEQUENCE, ForceSequence, formatInstructModeChat(), formatInstructModePrompt(), formatInstructModeStoryString(), getInstructStoppingSequences(), subst() (+5 more)

### Community 23 - "Community 23"
Cohesion: 0.21
Nodes (6): fetchLike(), mem, rememberBaseUrl(), storage, ConnectionState, useConnection

### Community 24 - "Community 24"
Cohesion: 0.21
Nodes (8): persister, LockGate(), queryClient, addScreenOffListener(), ScreenState, ScreenStateModule, PrefsState, usePrefs

### Community 25 - "Community 25"
Cohesion: 0.21
Nodes (9): durations, easeIn, easeOut, springs, usePressScale(), useReducedMotion(), AnimatedPressable, Sheet() (+1 more)

### Community 26 - "Community 26"
Cohesion: 0.16
Nodes (11): IconName, Button(), ButtonProps, CONTAINER, ICON_COLOR, LABEL_COLOR, Size, Variant (+3 more)

### Community 27 - "Community 27"
Cohesion: 0.26
Nodes (6): CookieJar, readSetCookie(), SetCookieReadable, splitSetCookieHeader(), headers, jar

### Community 28 - "Community 28"
Cohesion: 0.26
Nodes (10): createTextgenBody(), getTextgenServer(), parseBannedTokens(), parseSequenceBreakers(), base, body, opts, r (+2 more)

### Community 29 - "Community 29"
Cohesion: 0.35
Nodes (5): haptics, PressableScale(), Card(), IconButtonProps, ListRow()

### Community 30 - "Community 30"
Cohesion: 0.18
Nodes (8): chat, client, down, header, message, noModel, noVersion, up

### Community 31 - "Community 31"
Cohesion: 0.24
Nodes (6): AppLanguage, deviceLanguage(), SUPPORTED_LANGUAGES, LanguagePref, LocaleState, useLocale

### Community 32 - "Community 32"
Cohesion: 0.29
Nodes (8): checkForUpdate(), compareVersions(), downloadAndInstallUpdate(), GithubRelease, releaseVersion(), UpdateInfo, UpdateState, useUpdates

### Community 33 - "Community 33"
Cohesion: 0.22
Nodes (9): scanSubnet(), ac, calls, fetchImpl, hosts, jsonResponse(), onFound, order (+1 more)

### Community 34 - "Community 34"
Cohesion: 0.22
Nodes (4): EnvObject, escapeRegex(), MacroValue, substituteMacros()

### Community 35 - "Community 35"
Cohesion: 0.31
Nodes (7): StCharacter, StCharacterData, StCharacterExtensions, StDepthPrompt, StChatMetadata, StMessageExtra, StVersion

### Community 36 - "Community 36"
Cohesion: 0.25
Nodes (5): DOT, ReasoningBlock(), StreamingBubbleContent(), events, streamDebug

### Community 37 - "Community 37"
Cohesion: 0.31
Nodes (6): ChatDraft, clearChatDraft(), draftKey(), fileStorage, readChatDraft(), writeChatDraft()

### Community 38 - "Community 38"
Cohesion: 0.28
Nodes (7): emit(), finishDrain(), IDLE, listeners, loop(), streamingSession, StreamSnapshot

### Community 39 - "Community 39"
Cohesion: 0.53
Nodes (7): enumerateSubnet24(), enumerateSubnetHosts(), intToIpv4(), ipv4ToInt(), netmaskToPrefix(), sameSubnet24(), hosts

### Community 40 - "Community 40"
Cohesion: 0.32
Nodes (6): credPassKey(), credUserKey(), safeKey(), SavedServer, ServersState, useServers

### Community 41 - "Community 41"
Cohesion: 0.33
Nodes (3): TAB_ICON, TabBarProps, useBottomInset()

### Community 42 - "Community 42"
Cohesion: 0.60
Nodes (5): ensureIds(), makeAssistantMessage(), makeUserMessage(), newMessageId(), nowSendDate()

### Community 43 - "Community 43"
Cohesion: 0.50
Nodes (3): { palette, radii }, palette, radii

### Community 44 - "Community 44"
Cohesion: 0.50
Nodes (3): config, { getDefaultConfig }, { withNativeWind }

### Community 45 - "Community 45"
Cohesion: 0.50
Nodes (2): Lorebook, useLorebook()

### Community 46 - "Community 46"
Cohesion: 0.67
Nodes (3): ensureSetup(), hideTtsNotification(), showTtsNotification()

### Community 47 - "Community 47"
Cohesion: 0.67
Nodes (3): renderStoryString(), resolveConditionals(), StoryStringData

### Community 48 - "Community 48"
Cohesion: 0.67
Nodes (2): { defineConfig }, expoConfig

### Community 49 - "Community 49"
Cohesion: 0.67
Nodes (2): PROPS, { withGradleProperties }

### Community 50 - "Community 50"
Cohesion: 1.00
Nodes (1): config

### Community 51 - "Community 51"
Cohesion: 1.00
Nodes (1): { withAppBuildGradle }

## Knowledge Gaps
- **203 isolated node(s):** `config`, `TAB_ICON`, `TabBarProps`, `CharacterCard`, `Bucket` (+198 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 45`** (2 nodes): `Lorebook`, `useLorebook()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (2 nodes): `{ defineConfig }`, `expoConfig`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (2 nodes): `PROPS`, `{ withGradleProperties }`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (1 nodes): `config`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (1 nodes): `{ withAppBuildGradle }`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SmoothPacer` connect `Community 12` to `Community 5`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `StClient` connect `Community 16` to `Community 5`, `Community 30`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `StCharacter` connect `Community 35` to `Community 5`, `Community 21`, `Community 7`, `Community 1`, `Community 14`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `config`, `TAB_ICON`, `TabBarProps` to the rest of the system?**
  _203 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07087486157253599 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07781649245063879 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._