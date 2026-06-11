# Graph Report - .  (2026-06-11)

## Corpus Check
- 222 files · ~146.101 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1131 nodes · 2413 edges · 60 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output
- Edge kinds: contains: 907 · imports: 593 · imports_from: 471 · re_exports: 270 · calls: 138 · method: 34


## Input Scope
- Requested: auto
- Resolved: committed (source: default-auto)
- Included files: 222 · Candidates: 248
- Excluded: 0 untracked · 44906 ignored · 3 sensitive · 5 missing committed
- Recommendation: Use --scope all or graphify.yaml inputs.corpus for a knowledge-base folder.

## Graph Freshness
- Built from Git commit: `5fff896`
- Compare this hash to `git rev-parse HEAD` before trusting freshness-sensitive graph output.
## God Nodes (most connected - your core abstractions)
1. `useConnection` - 21 edges
2. `Icon()` - 21 edges
3. `StClient` - 20 edges
4. `haptics` - 18 edges
5. `Identity` - 14 edges
6. `AppText()` - 13 edges
7. `safe()` - 12 edges
8. `substituteParams()` - 12 edges
9. `PowerUserSubset` - 12 edges
10. `SmoothPacer` - 12 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (50): CollapsibleHeader(), OrderListRow(), SegmentedRow(), TextAreaRow(), ToggleRow(), TemplatesView, useTemplates(), CTX_PRESETS (+42 more)

### Community 1 - "Community 1"
Cohesion: 0.10
Nodes (31): checkWorldInfo(), CheckWorldInfoParams, emptyTimedState(), filterByInclusionGroups(), pickGroupWinner(), TimedWorldInfoState, characterBookToEntries(), extractWorldInfoSettings() (+23 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (23): Bubble, DOT, GenMode, MVCP, MVCP_FOLLOW, MVCP_READ, AuthorsNoteSheet(), AuthorsNoteValue (+15 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (23): adjusted, body, ccModel, countTokens, delta, flags, FriendlyGenerationError, GenerateOptions (+15 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (34): adjustNovelInstructionPrompt(), badWordsCache, calculateNovelLogitBias(), clearNovelBadWordsCache(), createNovelGenerationData(), CreateNovelGenerationDataParams, getBadWordPermutations(), getKayraMaxContextTokens() (+26 more)

### Community 5 - "Community 5"
Cohesion: 0.10
Nodes (31): adjustHordeParams(), createHordePayload(), HORDE_DEFAULT_SETTINGS, HordeAbortError, HordeError, HordeFailure, HordeModel, HordePostResponse (+23 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (30): BackendStatus, ChatFileInfo, deleteChat(), getAllCharacters(), getCharacter(), getCharacterChats(), getChat(), getChatCompletionStatus() (+22 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (25): getIntegritySlug(), isIntegrityConflict(), chat, chatFromArray(), chatToArray(), createChatHeader(), parseChatJsonl(), stringifyChatJsonl() (+17 more)

### Community 8 - "Community 8"
Cohesion: 0.13
Nodes (20): AppText(), AppTextProps, COLOR, TextColor, Badge(), DOT, TEXT, Tone (+12 more)

### Community 9 - "Community 9"
Cohesion: 0.06
Nodes (29): base, baseParams, body, character, claude, claudeOff, claudeUnset, commonBody (+21 more)

### Community 10 - "Community 10"
Cohesion: 0.16
Nodes (26): PersonaPlacement, baseChatReplace(), ChatFieldOverrides, getCharacterCardFields(), applyNameMacro(), FORCE_SEQUENCE, ForceSequence, formatInstructModeChat() (+18 more)

### Community 11 - "Community 11"
Cohesion: 0.10
Nodes (16): SseEvent, SseParser, events, p, chunk, decoder, GenerateStreamRequest, parser (+8 more)

### Community 12 - "Community 12"
Cohesion: 0.11
Nodes (14): Lorebook, useLorebook(), fetchLike(), mem, rememberBaseUrl(), storage, ConnectionState, useConnection (+6 more)

### Community 13 - "Community 13"
Cohesion: 0.11
Nodes (21): Block, COLORS, INLINE, InlineText(), MONO, parseBlocks(), parseInline(), proseToBlocks() (+13 more)

### Community 14 - "Community 14"
Cohesion: 0.11
Nodes (21): ac, calls, client, fetchImpl(), lastPost, makeResponse(), plainCall, postCall (+13 more)

### Community 15 - "Community 15"
Cohesion: 0.10
Nodes (22): BuildPromptResult, HistoryMessage, TokenCounter, DepthInjection, EXTENSION_ROLE, injectAtDepth(), roleFromString(), buildNovelGenerateRequest() (+14 more)

### Community 16 - "Community 16"
Cohesion: 0.12
Nodes (16): persister, LockGate(), AppLanguage, deviceLanguage(), SUPPORTED_LANGUAGES, queryClient, secrets, addScreenOffListener() (+8 more)

### Community 17 - "Community 17"
Cohesion: 0.14
Nodes (19): buildChatCompletionMessages(), BuildMessagesInput, sanitizeName(), squashSystemMessages(), fields, oai, getChatCompletionModel(), ChatCompletionDelta (+11 more)

### Community 18 - "Community 18"
Cohesion: 0.11
Nodes (18): Fingerprint, fingerprintVersion(), htmlLooksLikeSillyTavern(), NEGATIVE, fp, mapPool(), probeInstance(), ProbeOptions (+10 more)

### Community 19 - "Community 19"
Cohesion: 0.12
Nodes (18): deletePersonaFromSettings(), PERSONA_POSITIONS, PERSONA_SELECTABLE_POSITIONS, PersonaFields, PersonaPowerUser, setDefaultPersona(), config, list (+10 more)

### Community 20 - "Community 20"
Cohesion: 0.10
Nodes (17): deletePreset(), PresetApiId, PresetRef, restorePreset(), RestorePresetResult, savePreset(), broken, { client } (+9 more)

### Community 21 - "Community 21"
Cohesion: 0.10
Nodes (11): PacerTick, smoothDelayMs(), SmoothPacer, SmoothPacerOptions, behind, clock, clock2, normal (+3 more)

### Community 22 - "Community 22"
Cohesion: 0.16
Nodes (15): CONTEXT_PRESETS, QuickSettingsSheet(), safe(), syncDefaultPersona(), syncGeneration(), syncOai(), syncPersonaDelete(), syncPersonaToPc() (+7 more)

### Community 23 - "Community 23"
Cohesion: 0.12
Nodes (19): computeKaiFlags(), createKoboldGenerationData(), KAI_DEFAULT_SETTINGS, KaiFlags, KaiSettings, KoboldGenerationDataOptions, normalizeKaiSettings(), ALL_OFF (+11 more)

### Community 24 - "Community 24"
Cohesion: 0.16
Nodes (9): PickerOption, PickerSheet(), useBackendStatus(), ConnectionSettingsView, useConnectionProfiles(), useEngineConfig(), parseStSettings(), ProfilesState (+1 more)

### Community 25 - "Community 25"
Cohesion: 0.22
Nodes (16): discoverInstances(), discoverKobold(), DiscoverOptions, KoboldDiscoverOptions, localIpv4(), uniq(), usableHint(), getHint() (+8 more)

### Community 26 - "Community 26"
Cohesion: 0.18
Nodes (16): calculateLogitBias(), ChatCompletionBodyOptions, ChatCompletionGenerateType, createChatCompletionBody(), getOaiCustomStoppingStrings(), getReasoningEffort(), getVerbosity(), GPT_SOURCES (+8 more)

### Community 27 - "Community 27"
Cohesion: 0.17
Nodes (11): Avatar(), FALLBACK_TINTS, tintFor(), ChatActionsSheets(), ChatTarget, Bucket, chatFileLabel(), ChatFileRow() (+3 more)

### Community 28 - "Community 28"
Cohesion: 0.12
Nodes (15): BuildPromptInput, claude, fields, history, identity, noteIdx, nudgeFlavor, oai (+7 more)

### Community 29 - "Community 29"
Cohesion: 0.19
Nodes (7): CharacterScreen(), rawField(), splitExamples(), ImageViewerModal(), CharacterCard, Icon(), ICONS

### Community 30 - "Community 30"
Cohesion: 0.19
Nodes (11): AvatarFilePart, B64_LOOKUP, base64ToBytes(), makeAvatarFilePart(), newPersonaAvatarId(), PersonaImageSource, b64, bytes (+3 more)

### Community 31 - "Community 31"
Cohesion: 0.17
Nodes (11): DOT, ReasoningBlock(), StreamingBubbleContent(), durations, easeIn, springs, usePressScale(), useReducedMotion() (+3 more)

### Community 32 - "Community 32"
Cohesion: 0.16
Nodes (11): AvatarCrop, deleteUserAvatar(), FormDataLike, getUserAvatars(), call, { client }, { client, calls }, crop (+3 more)

### Community 33 - "Community 33"
Cohesion: 0.17
Nodes (14): applyProfileToConfig(), byName(), ConnectionProfile, ConnectionProfiles, extractConnectionProfiles(), findConnectionManager(), SettingsResponseArrays, base (+6 more)

### Community 34 - "Community 34"
Cohesion: 0.16
Nodes (11): IconName, Button(), ButtonProps, CONTAINER, ICON_COLOR, LABEL_COLOR, Size, Variant (+3 more)

### Community 35 - "Community 35"
Cohesion: 0.17
Nodes (11): buildChatCompletionGenerateRequest(), buildKoboldGenerateRequest(), buildTextgenGenerateRequest(), buildTextPrompt(), ChatCompletionGenerateParams, char, history, identity (+3 more)

### Community 36 - "Community 36"
Cohesion: 0.26
Nodes (6): CookieJar, readSetCookie(), SetCookieReadable, splitSetCookieHeader(), headers, jar

### Community 37 - "Community 37"
Cohesion: 0.42
Nodes (1): StClient

### Community 38 - "Community 38"
Cohesion: 0.26
Nodes (10): createTextgenBody(), getTextgenServer(), parseBannedTokens(), parseSequenceBreakers(), base, body, opts, r (+2 more)

### Community 39 - "Community 39"
Cohesion: 0.22
Nodes (4): TAB_ICON, TabBarProps, useBottomInset(), easeOut

### Community 40 - "Community 40"
Cohesion: 0.35
Nodes (5): haptics, PressableScale(), Card(), IconButtonProps, ListRow()

### Community 41 - "Community 41"
Cohesion: 0.18
Nodes (8): chat, client, down, header, message, noModel, noVersion, up

### Community 42 - "Community 42"
Cohesion: 0.24
Nodes (9): normalizeMainApi(), arr, base, horde, map, next, parsePresetArray(), presetsByName() (+1 more)

### Community 43 - "Community 43"
Cohesion: 0.18
Nodes (9): buildTextCompletionPrompt(), gatherDepthInjections(), placePersonaDescription(), history, many, persona, plainPower, power (+1 more)

### Community 44 - "Community 44"
Cohesion: 0.29
Nodes (8): checkForUpdate(), compareVersions(), downloadAndInstallUpdate(), GithubRelease, releaseVersion(), UpdateInfo, UpdateState, useUpdates

### Community 45 - "Community 45"
Cohesion: 0.22
Nodes (4): EnvObject, escapeRegex(), MacroValue, substituteMacros()

### Community 46 - "Community 46"
Cohesion: 0.31
Nodes (6): ChatDraft, clearChatDraft(), draftKey(), fileStorage, readChatDraft(), writeChatDraft()

### Community 47 - "Community 47"
Cohesion: 0.28
Nodes (7): emit(), finishDrain(), IDLE, listeners, loop(), streamingSession, StreamSnapshot

### Community 48 - "Community 48"
Cohesion: 0.53
Nodes (7): enumerateSubnet24(), enumerateSubnetHosts(), intToIpv4(), ipv4ToInt(), netmaskToPrefix(), sameSubnet24(), hosts

### Community 49 - "Community 49"
Cohesion: 0.22
Nodes (8): base, char, depth, example, lore, plainPower, story, turn

### Community 50 - "Community 50"
Cohesion: 0.25
Nodes (7): CC_SOURCES, MAIN_APIS, MainApi, MAP, resolveApiSlug(), ResolvedApiSlug, TEXTGEN_TYPES

### Community 51 - "Community 51"
Cohesion: 0.48
Nodes (6): applyName(), ExampleMessage, formatInstructModeExamples(), getExampleBlocks(), parseExampleIntoIndividual(), parseMesExamples()

### Community 52 - "Community 52"
Cohesion: 0.40
Nodes (4): NovelDelta, parseNovelData(), delta, frames

### Community 53 - "Community 53"
Cohesion: 0.50
Nodes (3): { palette, radii }, palette, radii

### Community 54 - "Community 54"
Cohesion: 0.50
Nodes (3): config, { getDefaultConfig }, { withNativeWind }

### Community 55 - "Community 55"
Cohesion: 0.67
Nodes (3): renderStoryString(), resolveConditionals(), StoryStringData

### Community 56 - "Community 56"
Cohesion: 0.67
Nodes (2): { defineConfig }, expoConfig

### Community 57 - "Community 57"
Cohesion: 0.67
Nodes (2): PROPS, { withGradleProperties }

### Community 58 - "Community 58"
Cohesion: 1.00
Nodes (1): config

### Community 59 - "Community 59"
Cohesion: 1.00
Nodes (1): { withAppBuildGradle }

## Knowledge Gaps
- **341 isolated node(s):** `config`, `TAB_ICON`, `TabBarProps`, `CharacterCard`, `Bucket` (+336 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 37`** (1 nodes): `StClient`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (2 nodes): `{ defineConfig }`, `expoConfig`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (2 nodes): `PROPS`, `{ withGradleProperties }`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (1 nodes): `config`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (1 nodes): `{ withAppBuildGradle }`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `StClient` connect `Community 37` to `Community 14`, `Community 20`, `Community 32`, `Community 41`, `Community 6`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `StCharacter` connect `Community 7` to `Community 6`, `Community 43`, `Community 10`, `Community 9`, `Community 28`, `Community 15`, `Community 35`, `Community 49`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `SmoothPacer` connect `Community 21` to `Community 6`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `config`, `TAB_ICON`, `TabBarProps` to the rest of the system?**
  _341 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05254237288135593 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07422402159244265 - nodes in this community are weakly interconnected._