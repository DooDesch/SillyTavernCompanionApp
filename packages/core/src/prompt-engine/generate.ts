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
  buildChatCompletionMessages,
  createChatCompletionBody,
  CHAT_COMPLETION_GENERATE_PATH,
  type ChatCompletionMessage,
  type OaiSettings,
} from './chatcompletion/index';
import {
  createNovelGenerationData,
  getNovelMaxContext,
  normalizeNaiSettings,
  NOVELAI_GENERATE_PATH,
  type NovelEncode,
} from './novelai';
import { presetsByName } from './presetArrays';
import { getStoppingStrings } from './stoppingStrings';
import { substituteParams } from './substituteParams';
import type { InstructContext } from './instruct';

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

/** Build the full `/api/backends/text-completions/generate` request (prompt + sampler body). */
export async function buildTextgenGenerateRequest(
  params: TextgenGenerateParams,
): Promise<TextgenGenerateRequest> {
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

  const built: BuildPromptResult = await buildTextCompletionPrompt({
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

export interface NovelGenerateParams {
  character: StCharacter;
  power: PowerUserSubset;
  /** Raw nai_settings block from /api/settings/get (normalized at this boundary). */
  nai: Record<string, unknown>;
  /** Raw novelai_settings preset array (RAW-JSON-string entries, from the settings response root). */
  novelaiSettings?: unknown;
  /** Parallel novelai_setting_names array. */
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
  // Desktop budgets the prompt against the novel-clamped context (getMaxContextTokens novel branch).
  const maxContext = getNovelMaxContext(nai, params.maxContext, params.tier);

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
  const ctx: InstructContext = {
    instruct: params.power.instruct,
    context: params.power.context,
    identity: params.identity,
    selectedGroup: false,
  };
  const stoppingStrings = getStoppingStrings(ctx, params.power, {
    isImpersonate,
    isContinue,
    lastMessageIsUser,
  });

  // The active preset is only consulted for the order fallback chain (nai-settings.js:604);
  // every other field comes from the live nai_settings (loadNovelPreset copies preset fields
  // into nai_settings at selection time, which the server has already persisted).
  const preset = presetsByName(params.novelaiSettings, params.novelaiSettingNames).get(
    String(nai.preset_settings_novel ?? ''),
  );

  const body = await createNovelGenerationData({
    prompt: built.prompt,
    nai,
    preset,
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
  type?: 'normal' | 'continue' | 'regenerate' | 'swipe';
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
    ...(params.type === 'continue' ? { type: 'continue' as const } : {}),
  });

  const body = createChatCompletionBody(params.oai, messages, {
    stream: params.stream,
    identity: params.identity,
    type: params.type === 'continue' ? 'continue' : 'normal',
  });

  return { url: CHAT_COMPLETION_GENERATE_PATH, body, messages };
}
