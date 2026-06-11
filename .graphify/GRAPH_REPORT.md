# Graph Report - .  (2026-06-11)

## Corpus Check
- 201 files · ~121.861 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 891 nodes · 1903 edges · 55 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output
- Edge kinds: contains: 692 · imports: 456 · imports_from: 394 · re_exports: 218 · calls: 113 · method: 30


## Input Scope
- Requested: auto
- Resolved: committed (source: default-auto)
- Included files: 201 · Candidates: 222
- Excluded: 0 untracked · 44878 ignored · 3 sensitive · 0 missing committed
- Recommendation: Use --scope all or graphify.yaml inputs.corpus for a knowledge-base folder.

## Graph Freshness
- Built from Git commit: `d686042`
- Compare this hash to `git rev-parse HEAD` before trusting freshness-sensitive graph output.
## God Nodes (most connected - your core abstractions)
1. `Icon()` - 19 edges
2. `haptics` - 17 edges
3. `useConnection` - 16 edges
4. `StClient` - 14 edges
5. `AppText()` - 13 edges
6. `Identity` - 13 edges
7. `SmoothPacer` - 12 edges
8. `substituteParams()` - 11 edges
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
Nodes (33): ChatCompletionBodyOptions, createChatCompletionBody(), buildChatCompletionMessages(), BuildMessagesInput, sanitizeName(), squashSystemMessages(), fields, oai (+25 more)

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
Cohesion: 0.07
Nodes (31): adjustHordeParams(), createHordePayload(), HORDE_DEFAULT_SETTINGS, HordeAbortError, HordeError, HordeFailure, HordeModel, HordePostResponse (+23 more)

### Community 6 - "Community 6"
Cohesion: 0.13
Nodes (26): BackendStatus, ChatFileInfo, deleteChat(), getAllCharacters(), getCharacter(), getCharacterChats(), getChat(), getChatCompletionStatus() (+18 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (15): Bubble, DOT, GenMode, MVCP, MVCP_FOLLOW, MVCP_READ, AuthorsNoteSheet(), AuthorsNoteValue (+7 more)

### Community 8 - "Community 8"
Cohesion: 0.16
Nodes (24): BuildPromptResult, ChatFieldOverrides, getCharacterCardFields(), buildChatCompletionGenerateRequest(), buildKoboldGenerateRequest(), buildTextgenGenerateRequest(), buildTextPrompt(), ChatCompletionGenerateParams (+16 more)

### Community 9 - "Community 9"
Cohesion: 0.10
Nodes (16): SseEvent, SseParser, events, p, chunk, decoder, GenerateStreamRequest, parser (+8 more)

### Community 10 - "Community 10"
Cohesion: 0.11
Nodes (21): Block, COLORS, INLINE, InlineText(), MONO, parseBlocks(), parseInline(), proseToBlocks() (+13 more)

### Community 11 - "Community 11"
Cohesion: 0.13
Nodes (19): BuildPromptInput, buildTextCompletionPrompt(), gatherDepthInjections(), HistoryMessage, many, power, seraphina, TokenCounter (+11 more)

### Community 12 - "Community 12"
Cohesion: 0.17
Nodes (20): applyNameMacro(), formatInstructModeChat(), formatInstructModePrompt(), formatInstructModeStoryString(), getInstructStoppingSequences(), InstructContext, subst(), getCustomStoppingStrings() (+12 more)

### Community 13 - "Community 13"
Cohesion: 0.14
Nodes (18): getIntegritySlug(), isIntegrityConflict(), chat, chatFromArray(), chatToArray(), createChatHeader(), parseChatJsonl(), stringifyChatJsonl() (+10 more)

### Community 14 - "Community 14"
Cohesion: 0.09
Nodes (16): adjusted, countTokens, delta, flags, GenerateOptions, GenerationChunk, GenerationUserError, history (+8 more)

### Community 15 - "Community 15"
Cohesion: 0.10
Nodes (11): PacerTick, smoothDelayMs(), SmoothPacer, SmoothPacerOptions, behind, clock, clock2, normal (+3 more)

### Community 16 - "Community 16"
Cohesion: 0.22
Nodes (16): discoverInstances(), discoverKobold(), DiscoverOptions, KoboldDiscoverOptions, localIpv4(), uniq(), usableHint(), getHint() (+8 more)

### Community 17 - "Community 17"
Cohesion: 0.20
Nodes (8): StClient, calls, client, fetchImpl(), lastPost, makeResponse(), postCall, Recorded

### Community 18 - "Community 18"
Cohesion: 0.15
Nodes (12): Fingerprint, fingerprintVersion(), htmlLooksLikeSillyTavern(), NEGATIVE, fp, mapPool(), probeInstance(), ProbeOptions (+4 more)

### Community 19 - "Community 19"
Cohesion: 0.17
Nodes (11): Avatar(), FALLBACK_TINTS, tintFor(), ChatActionsSheets(), ChatTarget, Bucket, chatFileLabel(), ChatFileRow() (+3 more)

### Community 20 - "Community 20"
Cohesion: 0.18
Nodes (9): PickerOption, PickerSheet(), useBackendStatus(), ConnectionSettingsView, useConnectionProfiles(), useEngineConfig(), parseStSettings(), ChatListMode (+1 more)

### Community 21 - "Community 21"
Cohesion: 0.15
Nodes (11): mem, rememberBaseUrl(), secrets, storage, ProfilesState, credPassKey(), credUserKey(), safeKey() (+3 more)

### Community 22 - "Community 22"
Cohesion: 0.19
Nodes (7): CharacterScreen(), rawField(), splitExamples(), ImageViewerModal(), CharacterCard, Icon(), ICONS

### Community 23 - "Community 23"
Cohesion: 0.17
Nodes (12): KoboldInstance, KoboldProbeOptions, KoboldScanOptions, probeKobold(), scanForKobold(), calls, fetchImpl, jsonResponse() (+4 more)

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
Cohesion: 0.15
Nodes (11): ALL_OFF, ALL_ON, body, cont, flags, identity, KAI, keys (+3 more)

### Community 28 - "Community 28"
Cohesion: 0.26
Nodes (6): CookieJar, readSetCookie(), SetCookieReadable, splitSetCookieHeader(), headers, jar

### Community 29 - "Community 29"
Cohesion: 0.26
Nodes (10): createTextgenBody(), getTextgenServer(), parseBannedTokens(), parseSequenceBreakers(), base, body, opts, r (+2 more)

### Community 30 - "Community 30"
Cohesion: 0.35
Nodes (5): haptics, PressableScale(), Card(), IconButtonProps, ListRow()

### Community 31 - "Community 31"
Cohesion: 0.18
Nodes (8): chat, client, down, header, message, noModel, noVersion, up

### Community 32 - "Community 32"
Cohesion: 0.24
Nodes (6): AppLanguage, deviceLanguage(), SUPPORTED_LANGUAGES, LanguagePref, LocaleState, useLocale

### Community 33 - "Community 33"
Cohesion: 0.29
Nodes (8): checkForUpdate(), compareVersions(), downloadAndInstallUpdate(), GithubRelease, releaseVersion(), UpdateInfo, UpdateState, useUpdates

### Community 34 - "Community 34"
Cohesion: 0.22
Nodes (9): scanSubnet(), ac, calls, fetchImpl, hosts, jsonResponse(), onFound, order (+1 more)

### Community 35 - "Community 35"
Cohesion: 0.22
Nodes (4): EnvObject, escapeRegex(), MacroValue, substituteMacros()

### Community 36 - "Community 36"
Cohesion: 0.31
Nodes (7): StCharacter, StCharacterData, StCharacterExtensions, StDepthPrompt, StChatMetadata, StMessageExtra, StVersion

### Community 37 - "Community 37"
Cohesion: 0.36
Nodes (3): fetchLike(), ConnectionState, useConnection

### Community 38 - "Community 38"
Cohesion: 0.25
Nodes (5): DOT, ReasoningBlock(), StreamingBubbleContent(), events, streamDebug

### Community 39 - "Community 39"
Cohesion: 0.31
Nodes (6): ChatDraft, clearChatDraft(), draftKey(), fileStorage, readChatDraft(), writeChatDraft()

### Community 40 - "Community 40"
Cohesion: 0.28
Nodes (7): emit(), finishDrain(), IDLE, listeners, loop(), streamingSession, StreamSnapshot

### Community 41 - "Community 41"
Cohesion: 0.53
Nodes (7): enumerateSubnet24(), enumerateSubnetHosts(), intToIpv4(), ipv4ToInt(), netmaskToPrefix(), sameSubnet24(), hosts

### Community 42 - "Community 42"
Cohesion: 0.22
Nodes (8): base, char, depth, example, lore, plainPower, story, turn

### Community 43 - "Community 43"
Cohesion: 0.33
Nodes (3): TAB_ICON, TabBarProps, useBottomInset()

### Community 44 - "Community 44"
Cohesion: 0.48
Nodes (6): applyName(), ExampleMessage, formatInstructModeExamples(), getExampleBlocks(), parseExampleIntoIndividual(), parseMesExamples()

### Community 45 - "Community 45"
Cohesion: 0.60
Nodes (5): ensureIds(), makeAssistantMessage(), makeUserMessage(), newMessageId(), nowSendDate()

### Community 46 - "Community 46"
Cohesion: 0.50
Nodes (3): { palette, radii }, palette, radii

### Community 47 - "Community 47"
Cohesion: 0.50
Nodes (3): config, { getDefaultConfig }, { withNativeWind }

### Community 48 - "Community 48"
Cohesion: 0.50
Nodes (2): Lorebook, useLorebook()

### Community 49 - "Community 49"
Cohesion: 0.67
Nodes (3): ensureSetup(), hideTtsNotification(), showTtsNotification()

### Community 50 - "Community 50"
Cohesion: 0.67
Nodes (2): parseTokenFrame(), TokenFrameDelta

### Community 51 - "Community 51"
Cohesion: 0.67
Nodes (2): { defineConfig }, expoConfig

### Community 52 - "Community 52"
Cohesion: 0.67
Nodes (2): PROPS, { withGradleProperties }

### Community 53 - "Community 53"
Cohesion: 1.00
Nodes (1): config

### Community 54 - "Community 54"
Cohesion: 1.00
Nodes (1): { withAppBuildGradle }

## Knowledge Gaps
- **229 isolated node(s):** `config`, `TAB_ICON`, `TabBarProps`, `CharacterCard`, `Bucket` (+224 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 48`** (2 nodes): `Lorebook`, `useLorebook()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (2 nodes): `parseTokenFrame()`, `TokenFrameDelta`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (2 nodes): `{ defineConfig }`, `expoConfig`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (2 nodes): `PROPS`, `{ withGradleProperties }`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (1 nodes): `config`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (1 nodes): `{ withAppBuildGradle }`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SmoothPacer` connect `Community 15` to `Community 6`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `StClient` connect `Community 17` to `Community 6`, `Community 31`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `StCharacter` connect `Community 36` to `Community 6`, `Community 11`, `Community 12`, `Community 1`, `Community 8`, `Community 42`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `config`, `TAB_ICON`, `TabBarProps` to the rest of the system?**
  _229 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07087486157253599 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08048780487804878 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._