# Graph Report - .  (2026-10-19)

## Corpus Check
- 229 files · ~152.403 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1200 nodes · 2543 edges · 62 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output
- Edge kinds: contains: 970 · imports: 625 · imports_from: 489 · re_exports: 283 · calls: 142 · method: 34


## Input Scope
- Requested: auto
- Resolved: committed (source: default-auto)
- Included files: 229 · Candidates: 255
- Excluded: 3 untracked · 48419 ignored · 3 sensitive · 5 missing committed
- Recommendation: Use --scope all or graphify.yaml inputs.corpus for a knowledge-base folder.

## Graph Freshness
- Built from Git commit: `d235171`
- Compare this hash to `git rev-parse HEAD` before trusting freshness-sensitive graph output.
## God Nodes (most connected - your core abstractions)
1. `StClient` - 22 edges
2. `useConnection` - 21 edges
3. `Icon()` - 21 edges
4. `haptics` - 18 edges
5. `PowerUserSubset` - 14 edges
6. `Identity` - 14 edges
7. `StCharacter` - 14 edges
8. `AppText()` - 13 edges
9. `safe()` - 12 edges
10. `substituteParams()` - 12 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 60 - "Community 60"
Cohesion: 1.00
Nodes (1): config

### Community 39 - "Community 39"
Cohesion: 0.22
Nodes (4): TAB_ICON, TabBarProps, useBottomInset(), easeOut

### Community 30 - "Community 30"
Cohesion: 0.19
Nodes (7): CharacterCard, rawField(), splitExamples(), CharacterScreen(), ImageViewerModal(), ICONS, Icon()

### Community 16 - "Community 16"
Cohesion: 0.13
Nodes (14): relativeTime(), Bucket, chatFileLabel(), Row, RecentChatRow(), ChatFileRow(), FALLBACK_TINTS, tintFor() (+6 more)

### Community 25 - "Community 25"
Cohesion: 0.16
Nodes (9): useBackendStatus(), ConnectionSettingsView, useConnectionProfiles(), useEngineConfig(), parseStSettings(), StoredBackendOverride, ProfilesState, useProfiles (+1 more)

### Community 12 - "Community 12"
Cohesion: 0.10
Nodes (19): persister, ScreenStateModule, ScreenState, addScreenOffListener(), LockGate(), SUPPORTED_LANGUAGES, AppLanguage, deviceLanguage() (+11 more)

### Community 13 - "Community 13"
Cohesion: 0.08
Nodes (15): GenMode, MVCP, Bubble, AuthorsNoteValue, ROLES, AuthorsNoteSheet(), entryUid(), LoreSheet() (+7 more)

### Community 10 - "Community 10"
Cohesion: 0.13
Nodes (20): TextColor, COLOR, AppTextProps, AppText(), Tone, DOT, TEXT, Badge() (+12 more)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (52): OPEN_BY_DEFAULT, isKind(), TemplateEditorScreen(), PickerOption, PickerSheet(), ToggleRow(), TextAreaRow(), SegmentedRow() (+44 more)

### Community 23 - "Community 23"
Cohesion: 0.16
Nodes (15): Draft, CONTEXT_PRESETS, QuickSettingsSheet(), safe(), syncPersonaToPc(), syncPersonaUpsert(), syncPersonaDelete(), syncDefaultPersona() (+7 more)

### Community 31 - "Community 31"
Cohesion: 0.19
Nodes (11): cases, b64, bytes, part, AvatarFilePart, B64_LOOKUP, base64ToBytes(), makeAvatarFilePart() (+3 more)

### Community 58 - "Community 58"
Cohesion: 0.67
Nodes (2): { defineConfig }, expoConfig

### Community 54 - "Community 54"
Cohesion: 0.50
Nodes (3): { getDefaultConfig }, { withNativeWind }, config

### Community 59 - "Community 59"
Cohesion: 0.67
Nodes (2): { withGradleProperties }, PROPS

### Community 61 - "Community 61"
Cohesion: 1.00
Nodes (1): { withAppBuildGradle }

### Community 40 - "Community 40"
Cohesion: 0.35
Nodes (5): Card(), IconButtonProps, ListRow(), PressableScale(), haptics

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (25): COLORS, Block, splitFences(), proseToBlocks(), parseBlocks(), loggedBlocked, InlineText(), RichTextImpl() (+17 more)

### Community 32 - "Community 32"
Cohesion: 0.17
Nodes (11): StreamingBubbleContent(), DOT, ReasoningBlock(), AnimatedPressable, Sheet(), SheetActionRow(), durations, springs (+3 more)

### Community 34 - "Community 34"
Cohesion: 0.16
Nodes (11): Variant, Size, CONTAINER, LABEL_COLOR, ICON_COLOR, ButtonProps, Button(), EmptyState() (+3 more)

### Community 55 - "Community 55"
Cohesion: 0.50
Nodes (2): Lorebook, useLorebook()

### Community 26 - "Community 26"
Cohesion: 0.19
Nodes (18): DiscoverOptions, uniq(), localIpv4(), usableHint(), discoverInstances(), KoboldDiscoverOptions, discoverKobold(), HostHint (+10 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (23): GenerateOptions, GenerationChunk, GenerationUserError, FriendlyGenerationError, novelTierCache, body, delta, res (+15 more)

### Community 51 - "Community 51"
Cohesion: 0.60
Nodes (5): nowSendDate(), newMessageId(), ensureIds(), makeUserMessage(), makeAssistantMessage()

### Community 46 - "Community 46"
Cohesion: 0.31
Nodes (6): fileStorage, draftKey(), ChatDraft, writeChatDraft(), readChatDraft(), clearChatDraft()

### Community 47 - "Community 47"
Cohesion: 0.28
Nodes (7): StreamSnapshot, IDLE, listeners, emit(), finishDrain(), loop(), streamingSession

### Community 56 - "Community 56"
Cohesion: 0.67
Nodes (3): ensureSetup(), showTtsNotification(), hideTtsNotification()

### Community 42 - "Community 42"
Cohesion: 0.29
Nodes (8): UpdateInfo, compareVersions(), GithubRelease, releaseVersion(), checkForUpdate(), downloadAndInstallUpdate(), UpdateState, useUpdates

### Community 49 - "Community 49"
Cohesion: 0.32
Nodes (6): SavedServer, safeKey(), credUserKey(), credPassKey(), ServersState, useServers

### Community 53 - "Community 53"
Cohesion: 0.50
Nodes (3): palette, radii, { palette, radii }

### Community 17 - "Community 17"
Cohesion: 0.13
Nodes (19): chat, getIntegritySlug(), isIntegrityConflict(), header, msg1, msg2, chat, arr (+11 more)

### Community 19 - "Community 19"
Cohesion: 0.11
Nodes (20): makeResponse(), Recorded, calls, fetchImpl(), client, postCall, lastPost, ac (+12 more)

### Community 21 - "Community 21"
Cohesion: 0.10
Nodes (17): BasicAuthCredentials, StClientOptions, StResponse, StRequestInit, { client, bodies }, preset, { client }, ok (+9 more)

### Community 38 - "Community 38"
Cohesion: 0.42
Nodes (1): StClient

### Community 33 - "Community 33"
Cohesion: 0.16
Nodes (11): Recorded, { client, calls }, form, call, { client }, crop, FormDataLike, AvatarCrop (+3 more)

### Community 37 - "Community 37"
Cohesion: 0.26
Nodes (6): jar, headers, SetCookieReadable, splitSetCookieHeader(), readSetCookie(), CookieJar

### Community 35 - "Community 35"
Cohesion: 0.15
Nodes (10): header, message, client, chat, noModel, noVersion, up, down (+2 more)

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (33): getVersion(), isReachable(), getSettings(), saveSettings(), withJsonl(), renameChat(), deleteChat(), BackendStatus (+25 more)

### Community 14 - "Community 14"
Cohesion: 0.09
Nodes (22): fp, Fingerprint, NEGATIVE, fingerprintVersion(), htmlLooksLikeSillyTavern(), mapPool(), jsonResponse(), ST_VERSION (+14 more)

### Community 48 - "Community 48"
Cohesion: 0.53
Nodes (7): hosts, ipv4ToInt(), intToIpv4(), enumerateSubnetHosts(), enumerateSubnet24(), sameSubnet24(), netmaskToPrefix()

### Community 43 - "Community 43"
Cohesion: 0.22
Nodes (8): res(), client, both, remembered, fetchImpl(), merged, mergeLlmCandidates(), detectLlmsViaServer()

### Community 41 - "Community 41"
Cohesion: 0.24
Nodes (9): arr, map, base, next, horde, normalizeMainApi(), parsePresetArray(), presetsByName() (+1 more)

### Community 50 - "Community 50"
Cohesion: 0.25
Nodes (7): MainApi, MAIN_APIS, ResolvedApiSlug, TEXTGEN_TYPES, CC_SOURCES, MAP, resolveApiSlug()

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (34): power, seraphina, many, plainPower, persona, history, char, history (+26 more)

### Community 8 - "Community 8"
Cohesion: 0.14
Nodes (30): PersonaPlacement, ChatFieldOverrides, baseChatReplace(), getCharacterCardFields(), parseMesExamples(), ExampleMessage, parseExampleIntoIndividual(), applyName() (+22 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (38): HistoryMessage, TokenCounter, BuildPromptResult, placePersonaDescription(), gatherDepthInjections(), buildTextCompletionPrompt(), EXTENSION_ROLE, DepthInjection (+30 more)

### Community 29 - "Community 29"
Cohesion: 0.12
Nodes (15): BuildPromptInput, power, seraphina, fields, oai, history, identity, order (+7 more)

### Community 18 - "Community 18"
Cohesion: 0.14
Nodes (19): CharacterCardFields, BuildMessagesInput, sanitizeName(), squashSystemMessages(), buildChatCompletionMessages(), fields, oai, getChatCompletionModel() (+11 more)

### Community 11 - "Community 11"
Cohesion: 0.06
Nodes (29): identity, messages, base, opts, commonBody, oai, claudeUnset, claudeOff (+21 more)

### Community 27 - "Community 27"
Cohesion: 0.18
Nodes (16): GPT_SOURCES, SEED_SUPPORTED_SOURCES, PROXY_SUPPORTED_SOURCES, LOGPROBS_SUPPORTED_SOURCES, LOGIT_BIAS_SOURCES, MULTISWIPE_SOURCES, NO_MULTISWIPE_TYPES, REASONING_EFFORT_SOURCES (+8 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (33): SETTINGS, koboldData, payload, models, workers, r, { deps, calls }, progress (+25 more)

### Community 24 - "Community 24"
Cohesion: 0.12
Nodes (19): identity, KAI, PRESET, STOPS, ALL_ON, ALL_OFF, flags, body (+11 more)

### Community 44 - "Community 44"
Cohesion: 0.22
Nodes (4): MacroValue, EnvObject, escapeRegex(), substituteMacros()

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (34): SLUG_NUM, makeEncoder(), clioSettings, stops, { encode }, expected, json, { encode, calls } (+26 more)

### Community 20 - "Community 20"
Cohesion: 0.11
Nodes (19): s, pu, config, list, PERSONA_POSITIONS, PERSONA_SELECTABLE_POSITIONS, PersonaFields, PersonaPowerUser (+11 more)

### Community 36 - "Community 36"
Cohesion: 0.15
Nodes (12): parsed, { profiles, selectedId }, base, response, out, minimalBase, { profiles }, google (+4 more)

### Community 45 - "Community 45"
Cohesion: 0.24
Nodes (9): ConnectionProfile, ConnectionProfiles, findConnectionManager(), extractConnectionProfiles(), SettingsResponseArrays, byName(), applyProfileToConfig(), BackendOverride (+1 more)

### Community 57 - "Community 57"
Cohesion: 0.67
Nodes (3): StoryStringData, resolveConditionals(), renderStoryString()

### Community 28 - "Community 28"
Cohesion: 0.16
Nodes (16): base, opts, r, body, settings, sampled, TextgenSettings, TextgenBodyOptions (+8 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (31): CheckWorldInfoParams, TimedWorldInfoState, emptyTimedState(), pickGroupWinner(), filterByInclusionGroups(), checkWorldInfo(), worldFileToEntries(), characterBookToEntries() (+23 more)

### Community 52 - "Community 52"
Cohesion: 0.40
Nodes (4): frames, delta, NovelDelta, parseNovelData()

### Community 22 - "Community 22"
Cohesion: 0.10
Nodes (11): clock, pacer, pending, t, behind, clock2, normal, smoothDelayMs() (+3 more)

### Community 15 - "Community 15"
Cohesion: 0.10
Nodes (16): p, events, SseEvent, SseParser, stream, tokens, delta, reader (+8 more)

## Knowledge Gaps
- **373 isolated node(s):** `config`, `TAB_ICON`, `TabBarProps`, `CharacterCard`, `Bucket` (+368 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 60`** (1 nodes): `config`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (2 nodes): `{ defineConfig }`, `expoConfig`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (2 nodes): `{ withGradleProperties }`, `PROPS`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (1 nodes): `{ withAppBuildGradle }`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (2 nodes): `Lorebook`, `useLorebook()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (1 nodes): `StClient`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `StClient` connect `Community 38` to `Community 19`, `Community 21`, `Community 33`, `Community 35`, `Community 4`, `Community 43`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `StCharacter` connect `Community 1` to `Community 4`, `Community 8`, `Community 11`, `Community 29`, `Community 2`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `SmoothPacer` connect `Community 22` to `Community 4`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `config`, `TAB_ICON`, `TabBarProps` to the rest of the system?**
  _373 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 16` be split into smaller, more focused modules?**
  _Cohesion score 0.12923076923076923 - nodes in this community are weakly interconnected._
- **Should `Community 12` be split into smaller, more focused modules?**
  _Cohesion score 0.09655172413793103 - nodes in this community are weakly interconnected._
- **Should `Community 13` be split into smaller, more focused modules?**
  _Cohesion score 0.08374384236453201 - nodes in this community are weakly interconnected._