import type { StCharacter } from '../types/character';
import type { StChatMessage } from '../types/chat';
import type { Identity, PowerUserSubset } from './types';
import {
  buildTextCompletionPrompt,
  type BuildPromptResult,
  type HistoryMessage,
  type TokenCounter,
} from './buildPrompt';
import { getCharacterCardFields, type ChatFieldOverrides } from './characterFields';
import { createTextgenBody, type TextgenSettings } from './textgenBody';
import { checkWorldInfo, type TimedWorldInfoState } from './worldinfo/activate';
import type { WorldInfoEntry, WorldInfoSettings } from './worldinfo/types';
import { EXTENSION_ROLE, roleFromString, type DepthInjection } from './depthInject';
import {
  createKoboldGenerationData,
  normalizeKaiSettings,
  KOBOLD_GENERATE_PATH,
  type KaiFlags,
} from './kobold';
import { presetsByName } from './presetArrays';
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
    maxContext: params.maxContext,
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
  if (
    fields.persona &&
    (params.power.persona_description_position ?? 0) === 2 // PERSONA_AT_DEPTH
  ) {
    depthInjections.push({
      depth:
        typeof params.power.persona_description_depth === 'number'
          ? params.power.persona_description_depth
          : 2,
      role: params.power.persona_description_role ?? EXTENSION_ROLE.SYSTEM,
      content: fields.persona,
    });
  }
  if (params.authorsNote?.content) depthInjections.push(params.authorsNote);

  const type = params.type ?? 'normal';

  // "Start reply with" bias (script.js getBiasStrings 5735-5767): empty on continue/impersonate,
  // otherwise the explicit override or power_user.user_prompt_bias. Substituted in buildMessages.
  const promptBias =
    type === 'continue' || type === 'impersonate'
      ? ''
      : (params.promptBias ?? String(params.power.user_prompt_bias ?? ''));

  const messages = await buildChatCompletionMessages({
    oai: params.oai,
    fields,
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
