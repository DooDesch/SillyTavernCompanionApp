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
import { checkWorldInfo } from './worldinfo/activate';
import type { WorldInfoEntry, WorldInfoSettings } from './worldinfo/types';
import {
  buildChatCompletionMessages,
  createChatCompletionBody,
  CHAT_COMPLETION_GENERATE_PATH,
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
  lorebook?: { entries: WorldInfoEntry[]; settings: WorldInfoSettings };
  /** Override the backend URL (api_server), e.g. from the active connection profile. */
  apiServerOverride?: string;
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

  let worldInfo: { before: string; after: string } | undefined;
  if (params.lorebook && params.lorebook.entries.length > 0) {
    const wi = checkWorldInfo({
      entries: params.lorebook.entries,
      chatMessages: params.history.map((m) => `${m.name}: ${m.mes}`),
      settings: params.lorebook.settings,
      maxContext: params.maxContext,
      identity: params.identity,
      countTokens: syncCount,
    });
    worldInfo = { before: wi.before, after: wi.after };
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
  lorebook?: { entries: WorldInfoEntry[]; settings: WorldInfoSettings };
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
  if (params.lorebook && params.lorebook.entries.length > 0) {
    const wi = checkWorldInfo({
      entries: params.lorebook.entries,
      chatMessages: params.history.map((m) => `${m.name}: ${m.mes}`),
      settings: params.lorebook.settings,
      maxContext,
      identity: params.identity,
      countTokens: syncCount,
    });
    worldInfoBefore = wi.before;
    worldInfoAfter = wi.after;
  }

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
  });

  const body = createChatCompletionBody(params.oai, messages, {
    stream: params.stream,
    identity: params.identity,
    type: params.type === 'continue' ? 'continue' : 'normal',
  });

  return { url: CHAT_COMPLETION_GENERATE_PATH, body, messages };
}
