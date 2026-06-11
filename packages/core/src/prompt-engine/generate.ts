import type { StCharacter } from '../types/character';
import type { StChatMessage } from '../types/chat';
import type { Identity, PowerUserSubset } from './types';
import {
  buildTextCompletionPrompt,
  placePersonaDescription,
  type BuildPromptResult,
  type HistoryMessage,
  type TokenCounter,
} from './buildPrompt';
import { getCharacterCardFields, type ChatFieldOverrides } from './characterFields';
import { createTextgenBody, type TextgenSettings } from './textgenBody';
import { checkWorldInfo, type TimedWorldInfoState } from './worldinfo/activate';
import type { WorldInfoEntry, WorldInfoSettings } from './worldinfo/types';
import { roleFromString, type DepthInjection } from './depthInject';
import {
  createKoboldGenerationData,
  normalizeKaiSettings,
  KOBOLD_GENERATE_PATH,
  type KaiFlags,
} from './kobold';
import { presetsByName } from './presetArrays';
import {
  createNovelGenerationData,
  getNovelMaxContext,
  normalizeNaiSettings,
  NOVELAI_GENERATE_PATH,
  type NovelEncode,
} from './novelai';
import { substituteParams } from './substituteParams';
import {
  buildChatCompletionMessages,
  calculateLogitBias,
  createChatCompletionBody,
  getOaiCustomStoppingStrings,
  CHAT_COMPLETION_GENERATE_PATH,
  type ChatCompletionGenerateType,
  type ChatCompletionMessage,
  type OaiSettings,
} from './chatcompletion/index';

export const TEXT_COMPLETION_GENERATE_PATH = '/api/backends/text-completions/generate';

/** Map stored chat messages into the engine's history shape (skips hidden/system messages). */
export function historyFromMessages(messages: readonly StChatMessage[], charName: string): HistoryMessage[] {
  const out: HistoryMessage[] = [];
  for (const m of messages) {
    if (m.is_system) continue;
    out.push({
      name: m.is_user ? m.name : m.name || charName,
      mes: currentSwipeText(m),
      isUser: m.is_user,
      isNarrator: m.extra?.['type'] === 'narrator',
      ...(m.extra?.image ? { image: m.extra.image } : {}),
    });
  }
  return out;
}

/** The visible text of a message (its active swipe, if swipes exist). */
export function currentSwipeText(m: StChatMessage): string {
  if (Array.isArray(m.swipes) && typeof m.swipe_id === 'number' && m.swipes[m.swipe_id] !== undefined) {
    return m.swipes[m.swipe_id]!;
  }
  return m.mes ?? '';
}

export interface TextgenGenerateParams {
  character: StCharacter;
  power: PowerUserSubset;
  textgen: TextgenSettings;
  identity: Identity;
  history: HistoryMessage[];
  maxContext: number;
  maxTokens: number;
  countTokens: TokenCounter;
  stream: boolean;
  chatMetadata?: ChatFieldOverrides;
  /** Active lorebook entries + settings; when present, World Info is scanned and injected. */
  lorebook?: { entries: WorldInfoEntry[]; settings: WorldInfoSettings; timedState?: TimedWorldInfoState };
  /** Override the backend URL (api_server), e.g. from the active connection profile. */
  apiServerOverride?: string;
  /**
   * Body truncation_length/num_ctx override. Desktop budgets the PROMPT against
   * getMaxPromptTokens() (max_context - amount_gen, script.js:5922-5929) while the body
   * keeps the FULL max_context (textgen-settings.js:1641/1698) - pass the full context
   * here and the response-reserved budget as `maxContext`.
   */
  bodyMaxContext?: number;
  /** Author's Note injected in-chat at a depth. */
  authorsNote?: DepthInjection;
  /** Generate the user's next turn instead of the character's. */
  isImpersonate?: boolean;
  type?: 'normal' | 'continue' | 'regenerate' | 'swipe';
}

export interface TextgenGenerateRequest {
  url: string;
  body: Record<string, unknown>;
  prompt: string;
  stoppingStrings: string[];
  includedMessages: number;
}

/** Shared params of the text-completion-prompt request builders (textgen + kobold). */
type TextPromptParams = Pick<
  TextgenGenerateParams,
  | 'character'
  | 'power'
  | 'identity'
  | 'history'
  | 'maxContext'
  | 'countTokens'
  | 'chatMetadata'
  | 'lorebook'
  | 'authorsNote'
  | 'isImpersonate'
  | 'type'
>;

/** World-Info scan + text-completion prompt assembly shared by the textgen and kobold builders. */
async function buildTextPrompt(params: TextPromptParams): Promise<BuildPromptResult> {
  const syncCount = (t: string): number => {
    const r = params.countTokens(t);
    return typeof r === 'number' ? r : Math.ceil(t.length / 3.5);
  };

  let worldInfo: { before: string; after: string; depth?: DepthInjection[] } | undefined;
  if (params.lorebook && params.lorebook.entries.length > 0) {
    const wi = checkWorldInfo({
      entries: params.lorebook.entries,
      chatMessages: params.history.map((m) => `${m.name}: ${m.mes}`),
      settings: params.lorebook.settings,
      maxContext: params.maxContext,
      identity: params.identity,
      countTokens: syncCount,
      personaDescription: params.power.persona_description ?? '',
      characterDescription: params.character.description ?? '',
      ...(params.lorebook.timedState ? { timedState: params.lorebook.timedState } : {}),
    });
    worldInfo = { before: wi.before, after: wi.after, depth: wi.depth };
  }

  return buildTextCompletionPrompt({
    character: params.character,
    power: params.power,
    identity: params.identity,
    history: params.history,
    maxContext: params.maxContext,
    countTokens: params.countTokens,
    ...(params.chatMetadata ? { chatMetadata: params.chatMetadata } : {}),
    ...(worldInfo ? { worldInfo } : {}),
    ...(params.authorsNote ? { authorsNote: params.authorsNote } : {}),
    ...(params.isImpersonate ? { isImpersonate: params.isImpersonate } : {}),
    type: params.type === 'regenerate' || params.type === 'swipe' ? 'normal' : params.type,
  });
}

/** Build the full `/api/backends/text-completions/generate` request (prompt + sampler body). */
export async function buildTextgenGenerateRequest(
  params: TextgenGenerateParams,
): Promise<TextgenGenerateRequest> {
  const built: BuildPromptResult = await buildTextPrompt(params);

  const body = createTextgenBody(params.textgen, {
    prompt: built.prompt,
    maxTokens: params.maxTokens,
    maxContext: params.bodyMaxContext ?? params.maxContext,
    stoppingStrings: built.stoppingStrings,
    stream: params.stream,
    isContinue: params.type === 'continue',
    ...(params.apiServerOverride ? { apiServerOverride: params.apiServerOverride } : {}),
  });

  return {
    url: TEXT_COMPLETION_GENERATE_PATH,
    body,
    prompt: built.prompt,
    stoppingStrings: built.stoppingStrings,
    includedMessages: built.includedMessages,
  };
}

export interface KoboldGenerateParams extends TextPromptParams {
  /** Raw kai_settings block; desktop defaults are backfilled (normalizeKaiSettings). */
  kai: Record<string, unknown>;
  /** Response length (desktop amount_gen, possibly Horde-adjusted). */
  maxTokens: number;
  /** Feature gates from the kobold status versions (computeKaiFlags). */
  flags: KaiFlags;
  /** Backend URL forwarded as api_server (kai.api_server or the profile override). */
  apiServer: string;
  /**
   * Named-preset arrays from the /api/settings/get RESPONSE root (raw JSON-string
   * presets + parallel names). The active preset is resolved by kai.preset_settings;
   * a missing/unknown name falls back to the GUI preset like desktop.
   */
  presets?: { koboldai_settings?: unknown; koboldai_setting_names?: unknown };
  /** True when building for AI Horde (forces the version gates open). */
  isHorde?: boolean;
  /**
   * Body max_context_length override. Horde auto-adjust passes the worker-adjusted
   * context here while `maxContext` carries the (smaller) prompt-token budget,
   * mirroring desktop's this_max_context vs adjustedParams.maxContextLength split.
   */
  bodyMaxContext?: number;
}

export interface KoboldGenerateRequest {
  url: string;
  body: Record<string, unknown>;
  prompt: string;
  stoppingStrings: string[];
  includedMessages: number;
  /** The preset the body was built from ('gui' when none/unknown). */
  presetName: string;
}

/**
 * Build the full `/api/backends/kobold/generate` request: the same text-completion
 * prompt assembly as the textgen path, then `createKoboldGenerationData` (desktop
 * getKoboldGenerationData incl. the GUI short body).
 */
export async function buildKoboldGenerateRequest(
  params: KoboldGenerateParams,
): Promise<KoboldGenerateRequest> {
  const built: BuildPromptResult = await buildTextPrompt(params);

  const kai = normalizeKaiSettings(params.kai);
  let preset: Record<string, unknown> | null = null;
  if (kai.preset_settings !== 'gui') {
    const byName = presetsByName(
      params.presets?.koboldai_settings,
      params.presets?.koboldai_setting_names,
    );
    // Desktop resets an unknown preset name to 'gui' (loadKoboldSettings).
    preset = byName.get(String(kai.preset_settings)) ?? null;
  }

  const type = params.isImpersonate
    ? 'impersonate'
    : params.type === 'regenerate' || params.type === 'swipe'
      ? 'normal'
      : params.type;

  const body = createKoboldGenerationData({
    finalPrompt: built.prompt,
    kai,
    preset,
    flags: params.flags,
    maxLength: params.maxTokens,
    maxContextLength: params.bodyMaxContext ?? params.maxContext,
    isHorde: params.isHorde ?? false,
    type,
    stoppingStrings: built.stoppingStrings,
    apiServer: params.apiServer,
    identity: params.identity,
  });

  return {
    url: KOBOLD_GENERATE_PATH,
    body,
    prompt: built.prompt,
    stoppingStrings: built.stoppingStrings,
    includedMessages: built.includedMessages,
    presetName: preset ? String(kai.preset_settings) : 'gui',
  };
}

export interface NovelGenerateParams {
  character: StCharacter;
  power: PowerUserSubset;
  /** Raw nai_settings block from /api/settings/get (normalized at this boundary). */
  nai: Record<string, unknown>;
  /**
   * Raw novelai_settings preset array (RAW-JSON-string entries, from the settings response
   * root). Currently unused: the only preset read on the desktop (the order fallback,
   * nai-settings.js:604) is dead code because loadNovelSettings (:259) always backfills
   * nai_settings.order. Kept so the config plumbing stays in place.
   */
  novelaiSettings?: unknown;
  /** Parallel novelai_setting_names array (see novelaiSettings). */
  novelaiSettingNames?: unknown;
  identity: Identity;
  history: HistoryMessage[];
  maxContext: number;
  maxTokens: number;
  countTokens: TokenCounter;
  /** Server-side NovelAI tokenizer: POST /api/tokenizers/{slug}/encode -> ids. */
  encode: NovelEncode;
  /** NovelAI subscription tier (POST /api/novelai/status) for the kayra/erato clamps. */
  tier?: number;
  chatMetadata?: ChatFieldOverrides;
  lorebook?: { entries: WorldInfoEntry[]; settings: WorldInfoSettings; timedState?: TimedWorldInfoState };
  /** Author's Note injected in-chat at a depth. */
  authorsNote?: DepthInjection;
  /** Generate the user's next turn instead of the character's. */
  isImpersonate?: boolean;
  type?: 'normal' | 'continue' | 'regenerate' | 'swipe';
}

export interface NovelGenerateRequest {
  url: string;
  body: Record<string, unknown>;
  prompt: string;
  stoppingStrings: string[];
  includedMessages: number;
  /** nai_settings.streaming_novel - whether the caller should open an SSE stream. */
  streaming: boolean;
}

/**
 * Build the full `/api/novelai/generate` request, mirroring `buildTextgenGenerateRequest` plus
 * the two desktop-only novel prompt nuances:
 *  - force_name2: desktop forces it for novel (script.js:4549; cleared for impersonate at 4553)
 *    so `modifyLastPromptLine` (script.js:5010-5029) appends `\n{{char}}:` (or `\n{{user}}:` when
 *    impersonating) after the last in-context line - including the continue-specific conditions.
 *  - preamble: `substituteParams(nai.preamble) + '\n'` prepended to the chat block, after the
 *    examples and before chat_start (addChatsPreamble, script.js:5128-5131/5954-5958).
 */
export async function buildNovelGenerateRequest(params: NovelGenerateParams): Promise<NovelGenerateRequest> {
  const nai = normalizeNaiSettings(params.nai);
  // Desktop budgets the prompt against getMaxPromptTokens() = getMaxContextTokens() -
  // amount_gen (script.js:5922-5929): clamp to the novel context limits FIRST
  // (getMaxContextTokens novel branch), then reserve the response length.
  const maxContext = getNovelMaxContext(nai, params.maxContext, params.tier) - params.maxTokens;

  const syncCount = (t: string): number => {
    const r = params.countTokens(t);
    return typeof r === 'number' ? r : Math.ceil(t.length / 3.5);
  };

  let worldInfo: { before: string; after: string; depth?: DepthInjection[] } | undefined;
  if (params.lorebook && params.lorebook.entries.length > 0) {
    const wi = checkWorldInfo({
      entries: params.lorebook.entries,
      chatMessages: params.history.map((m) => `${m.name}: ${m.mes}`),
      settings: params.lorebook.settings,
      maxContext,
      identity: params.identity,
      countTokens: syncCount,
      personaDescription: params.power.persona_description ?? '',
      characterDescription: params.character.description ?? '',
      ...(params.lorebook.timedState ? { timedState: params.lorebook.timedState } : {}),
    });
    worldInfo = { before: wi.before, after: wi.after, depth: wi.depth };
  }

  const type = params.type === 'regenerate' || params.type === 'swipe' ? 'normal' : (params.type ?? 'normal');
  const isContinue = type === 'continue';
  const isImpersonate = params.isImpersonate === true;
  const isInstruct = params.power.instruct.enabled;
  const lastMessageIsUser = params.history[params.history.length - 1]?.isUser === true;

  // force_name2 semantics (modifyLastPromptLine, script.js:5010-5029). Instruct mode gets its
  // prompt line from formatInstructModePrompt instead; impersonate clears force_name2 and uses
  // the user's name (only when not continuing). Ported literally, including the continue rule
  // "append {{char}}: unless continuing on a user message or the first message".
  let lastLineAppend: string | undefined;
  if (!isInstruct) {
    if (isImpersonate) {
      if (!isContinue) lastLineAppend = `${params.identity.user}:`;
    } else {
      const isContinuingOnFirstMessage = isContinue && params.history.length === 1;
      if (!isContinuingOnFirstMessage) {
        lastLineAppend = !isContinue || !lastMessageIsUser ? `${params.identity.char}:` : '';
      }
    }
  }

  // addChatsPreamble (script.js:5954-5958): unconditional for novel, macro-substituted, '\n'-joined.
  const mesSendPrefix = substituteParams(nai.preamble, { identity: params.identity }) + '\n';

  const built: BuildPromptResult = await buildTextCompletionPrompt({
    character: params.character,
    power: params.power,
    identity: params.identity,
    history: params.history,
    maxContext,
    countTokens: params.countTokens,
    mesSendPrefix,
    ...(lastLineAppend !== undefined ? { lastLineAppend } : {}),
    ...(params.chatMetadata ? { chatMetadata: params.chatMetadata } : {}),
    ...(worldInfo ? { worldInfo } : {}),
    ...(params.authorsNote ? { authorsNote: params.authorsNote } : {}),
    ...(isImpersonate ? { isImpersonate } : {}),
    type,
  });

  // Desktop: getStoppingStrings(isImpersonate, isContinue) inside getNovelGenerationData.
  // buildTextCompletionPrompt computes them with the exact same context and flags
  // (isImpersonate/isContinue/lastMessageIsUser), so the built list is byte-identical.
  const stoppingStrings = built.stoppingStrings;

  const body = await createNovelGenerationData({
    prompt: built.prompt,
    nai,
    maxLength: params.maxTokens,
    stoppingStrings,
    encode: params.encode,
    tier: params.tier,
  });

  return {
    url: NOVELAI_GENERATE_PATH,
    body,
    prompt: built.prompt,
    stoppingStrings,
    includedMessages: built.includedMessages,
    streaming: nai.streaming_novel,
  };
}

export interface ChatCompletionGenerateParams {
  character: StCharacter;
  power: PowerUserSubset;
  oai: OaiSettings;
  identity: Identity;
  history: HistoryMessage[];
  maxContext: number;
  maxTokens: number;
  countTokens: TokenCounter;
  stream: boolean;
  chatMetadata?: ChatFieldOverrides;
  lorebook?: { entries: WorldInfoEntry[]; settings: WorldInfoSettings; timedState?: TimedWorldInfoState };
  /** Author's Note injected in-chat at a depth. */
  authorsNote?: DepthInjection;
  type?: ChatCompletionGenerateType;
  /**
   * Async tokenizer (text -> token ids), e.g. POST /api/tokenizers/openai/encode. Enables
   * logit_bias from the selected oai bias preset (desktop resolves it via
   * POST /api/backends/chat-completions/bias). When absent, logit_bias is omitted.
   */
  encodeTokens?: (text: string) => Promise<number[]>;
  /**
   * "Start reply with" bias override (script.js getBiasStrings: textarea {{}} bias or a recent
   * message's extra.bias). Defaults to power_user.user_prompt_bias; ignored on continue/impersonate.
   */
  promptBias?: string;
}

export interface ChatCompletionGenerateRequest {
  url: string;
  body: Record<string, unknown>;
  messages: ChatCompletionMessage[];
}

/** Build the /api/backends/chat-completions/generate request (messages[] + body) for cloud backends. */
export async function buildChatCompletionGenerateRequest(
  params: ChatCompletionGenerateParams,
): Promise<ChatCompletionGenerateRequest> {
  const syncCount = (t: string): number => {
    const r = params.countTokens(t);
    return typeof r === 'number' ? r : Math.ceil(t.length / 3.5);
  };
  const maxContext = params.oai.openai_max_context ?? params.maxContext;
  const maxTokens = params.oai.openai_max_tokens ?? params.maxTokens;

  const fields = getCharacterCardFields(params.character, params.power, params.identity, params.chatMetadata ?? {});

  let worldInfoBefore: string | undefined;
  let worldInfoAfter: string | undefined;
  const depthInjections: DepthInjection[] = [];
  if (params.lorebook && params.lorebook.entries.length > 0) {
    const wi = checkWorldInfo({
      entries: params.lorebook.entries,
      chatMessages: params.history.map((m) => `${m.name}: ${m.mes}`),
      settings: params.lorebook.settings,
      maxContext,
      identity: params.identity,
      countTokens: syncCount,
      personaDescription: fields.persona,
      characterDescription: fields.description,
      ...(params.lorebook.timedState ? { timedState: params.lorebook.timedState } : {}),
    });
    worldInfoBefore = wi.before;
    worldInfoAfter = wi.after;
    depthInjections.push(...wi.depth);
  }
  if (fields.charDepthPrompt) {
    const dp = params.character.data?.extensions?.depth_prompt;
    depthInjections.push({
      depth: typeof dp?.depth === 'number' ? dp.depth : 4,
      role: roleFromString(dp?.role),
      content: fields.charDepthPrompt,
    });
  }
  // Persona placement (desktop addPersonaDescriptionExtensionPrompt + openai.js:1424): only
  // IN_PROMPT/AFTER_CHAR keep the personaDescription prompt slot; AT_DEPTH injects in-chat,
  // TOP_AN/BOTTOM_AN ride the Author's Note, NONE drops the persona.
  const personaPlacement = placePersonaDescription(params.power, fields.persona, params.authorsNote);
  if (personaPlacement.personaInjection) depthInjections.push(personaPlacement.personaInjection);
  if (personaPlacement.authorsNote?.content) depthInjections.push(personaPlacement.authorsNote);
  const fieldsForMessages =
    personaPlacement.personaForPrompt === fields.persona
      ? fields
      : { ...fields, persona: personaPlacement.personaForPrompt };

  const type = params.type ?? 'normal';

  // "Start reply with" bias (script.js getBiasStrings 5735-5767): empty on continue/impersonate,
  // otherwise the explicit override or power_user.user_prompt_bias. Substituted in buildMessages.
  const promptBias =
    type === 'continue' || type === 'impersonate'
      ? ''
      : (params.promptBias ?? String(params.power.user_prompt_bias ?? ''));

  const messages = await buildChatCompletionMessages({
    oai: params.oai,
    fields: fieldsForMessages,
    history: params.history,
    identity: params.identity,
    maxContext,
    maxTokens,
    countTokens: params.countTokens,
    ...(worldInfoBefore ? { worldInfoBefore } : {}),
    ...(worldInfoAfter ? { worldInfoAfter } : {}),
    ...(depthInjections.length ? { depthInjections } : {}),
    type,
    ...(promptBias ? { bias: promptBias } : {}),
  });

  // power_user.custom_stopping_strings, macro-substituted (power-user.js getCustomStoppingStrings).
  const customStoppingStrings = getOaiCustomStoppingStrings(params.power, params.identity);

  // Logit bias needs a tokenizer; without an injected encoder it is omitted (documented on the param).
  const logitBias = params.encodeTokens
    ? await calculateLogitBias(params.oai, params.encodeTokens)
    : undefined;

  const body = createChatCompletionBody(params.oai, messages, {
    stream: params.stream,
    identity: params.identity,
    type,
    ...(customStoppingStrings.length ? { customStoppingStrings } : {}),
    ...(logitBias ? { logitBias } : {}),
    ...(params.power.request_token_probabilities ? { requestTokenProbabilities: true } : {}),
  });

  return { url: CHAT_COMPLETION_GENERATE_PATH, body, messages };
}
