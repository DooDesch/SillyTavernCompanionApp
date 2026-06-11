import {
  buildChatCompletionGenerateRequest,
  buildNovelGenerateRequest,
  buildTextgenGenerateRequest,
  getChatCompletionModel,
  getNovelStatus,
  getNovelTokenizerSlug,
  historyFromMessages,
  parseChatCompletionData,
  parseNovelData,
  parseTextgenData,
  resolveTokenizer,
  type DepthInjection,
  type EngineConfig,
  type HistoryMessage,
  type NovelEncode,
  type StCharacter,
  type StChatMessage,
  type StClient,
  type WorldInfoEntry,
  type WorldInfoSettings,
} from '@st/core';
import i18n from '@/i18n';
import { openSseStream, SseHttpError } from './streamTransport';
import { streamDebug } from './streamDebug';
import { makeTokenCounter } from './tokenizer';

/** Build the prompt-budget token counter for the active backend (faithful to the desktop tokenizer). */
function tokenCounterFor(client: StClient, engine: EngineConfig) {
  if (engine.mainApi === 'novel') {
    // NovelAI tokenizes by model (clio=nerdstash, kayra=nerdstash_v2, erato=llama3). The
    // /api/tokenizers/{slug}/encode routes return { ids, count } - makeTokenCounter reads
    // `count`; unknown legacy models fall back to the estimate (null url).
    const slug = getNovelTokenizerSlug(String((engine.nai as { model_novel?: unknown }).model_novel ?? ''));
    return makeTokenCounter(client, slug ? `/api/tokenizers/${slug}/encode` : null);
  }
  if (engine.mode === 'cc') {
    const model = getChatCompletionModel(engine.oai);
    return makeTokenCounter(client, `/api/tokenizers/openai/count?model=${encodeURIComponent(model)}`);
  }
  const modelHint =
    (engine.textgen as { model?: string; custom_model?: string }).model ??
    (engine.textgen as { model?: string; custom_model?: string }).custom_model;
  const { url } = resolveTokenizer(engine.power.tokenizer, modelHint);
  return makeTokenCounter(client, url);
}

export interface GenerateOptions {
  type?: 'normal' | 'continue' | 'regenerate' | 'swipe';
  signal?: AbortSignal;
  chatMetadata?: { system_prompt?: string; scenario?: string; mes_example?: string };
  lorebook?: { entries: WorldInfoEntry[]; settings: WorldInfoSettings };
  /** Author's Note injected in-chat at a depth. */
  authorsNote?: DepthInjection;
  /** Draft the user's next turn instead of the character's (text-completion only). */
  isImpersonate?: boolean;
}

/** Running accumulated output of a generation: visible text plus any separate reasoning/thinking. */
export interface GenerationChunk {
  text: string;
  reasoning: string;
  /**
   * Non-token progress (e.g. the AI Horde queue position). The chat screen translates
   * the key via t() and shows it while no text has streamed yet.
   */
  status?: { key: string; params?: Record<string, string | number> };
}

/** The selected main_api has no app implementation (yet). */
export class UnsupportedApiError extends Error {
  constructor(readonly mainApi: string) {
    super(`Unsupported main_api: ${mainApi}`);
    this.name = 'UnsupportedApiError';
  }
}

/** A generation failure with a user-presentable translated message (shown instead of the generic alert). */
export class FriendlyGenerationError extends Error {
  constructor(readonly i18nKey: string) {
    super(i18n.t(i18nKey));
    this.name = 'FriendlyGenerationError';
  }
}

/**
 * NovelAI subscription data cache (desktop keeps `novel_data` from the status check). The tier
 * drives the kayra context clamp and the kayra/erato response-length clamp. Refreshed lazily;
 * without a NOVEL secret the status is 400 and the tier stays unknown (safe defaults apply).
 */
let novelTier: number | undefined;
let novelTierFetchedAt = 0;
const NOVEL_TIER_TTL_MS = 5 * 60_000;

async function getNovelTierCached(client: StClient): Promise<number | undefined> {
  if (Date.now() - novelTierFetchedAt < NOVEL_TIER_TTL_MS) return novelTier;
  const status = await getNovelStatus(client);
  novelTierFetchedAt = Date.now();
  novelTier = status.connected ? status.tier : undefined;
  return novelTier;
}

/**
 * NovelAI flow: ST proxies to api/text.novelai.net (src/endpoints/novelai.js). Streaming uses
 * {token} SSE frames; non-streaming parses `{ output }` (script.js extractMessageFromData).
 * The server replies 400 when no NOVEL secret is configured -> friendly translated error.
 */
async function* streamNovelGeneration(
  client: StClient,
  engine: EngineConfig,
  character: StCharacter,
  history: HistoryMessage[],
  headers: Record<string, string>,
  countTokens: ReturnType<typeof tokenCounterFor>,
  opts: GenerateOptions,
): AsyncGenerator<GenerationChunk, GenerationChunk, void> {
  // The body's stop strings / bad words / logit biases are tokenized SERVER-SIDE via the
  // /api/tokenizers/{slug}/encode routes (desktop runs the same tokenizers client-side).
  const encode: NovelEncode = async (slug, text) => {
    const res = await client.post<{ ids?: number[] }>(`/api/tokenizers/${slug}/encode`, { text });
    return Array.isArray(res.data?.ids) ? res.data.ids : [];
  };
  const tier = await getNovelTierCached(client);

  const req = await buildNovelGenerateRequest({
    character,
    power: engine.power,
    nai: engine.nai,
    novelaiSettings: engine.novelaiSettings,
    novelaiSettingNames: engine.novelaiSettingNames,
    identity: engine.identity,
    history,
    maxContext: engine.maxContext,
    maxTokens: engine.maxTokens,
    countTokens,
    encode,
    ...(tier !== undefined ? { tier } : {}),
    ...(opts.type ? { type: opts.type } : {}),
    ...(opts.chatMetadata ? { chatMetadata: opts.chatMetadata } : {}),
    ...(opts.lorebook ? { lorebook: opts.lorebook } : {}),
    ...(opts.authorsNote ? { authorsNote: opts.authorsNote } : {}),
    ...(opts.isImpersonate ? { isImpersonate: opts.isImpersonate } : {}),
  });

  let text = '';
  if (req.streaming) {
    // Desktop generateNovelWithStreaming sets generate_data.streaming = nai.streaming_novel.
    const body = { ...req.body, streaming: true };
    try {
      for await (const evt of openSseStream({
        url: client.url(req.url),
        headers,
        body,
        ...(opts.signal ? { signal: opts.signal } : {}),
      })) {
        const delta = parseNovelData(evt.data);
        if (!delta) continue;
        if (delta.done) break;
        text += delta.text;
        streamDebug.mark('sse', text.length);
        yield { text, reasoning: '' };
      }
    } catch (err) {
      if (err instanceof SseHttpError && err.status === 400) {
        throw new FriendlyGenerationError('chat.novelNoKey');
      }
      throw err;
    }
    return { text, reasoning: '' };
  }

  // Non-streaming: single POST, the reply carries { output } (or { error } / { message }).
  const res = await client.post<{ output?: unknown; error?: { message?: string } | boolean; message?: string }>(
    req.url,
    req.body,
  );
  if (res.status === 400) {
    throw new FriendlyGenerationError('chat.novelNoKey');
  }
  if (!res.ok) {
    const message =
      (typeof res.data?.error === 'object' && res.data.error?.message) || res.data?.message || undefined;
    throw new Error(message || i18n.t('errors.generationFailed', { status: res.status }));
  }
  text = typeof res.data?.output === 'string' ? res.data.output : '';
  if (text) yield { text, reasoning: '' };
  return { text, reasoning: '' };
}

/**
 * Stream a generation, routing to the active backend:
 *  - text completion (KoboldCpp etc.) → /api/backends/text-completions/generate
 *  - chat completion (Claude/OpenAI/Gemini/DeepSeek/OpenRouter…) → /api/backends/chat-completions/generate
 * In both cases ST is the proxy (it holds API keys + does provider conversion). Yields the running
 * accumulated text.
 */
export async function* streamGeneration(
  client: StClient,
  engine: EngineConfig,
  character: StCharacter,
  messages: StChatMessage[],
  opts: GenerateOptions = {},
): AsyncGenerator<GenerationChunk, GenerationChunk, void> {
  const history = historyFromMessages(messages, character.name);
  const headers = await client.authHeaders();
  const countTokens = tokenCounterFor(client, engine);

  // Backend dispatcher (desktop main_api routing). The wave-1 integrations replace the
  // stub cases with real request flows (novel: SSE, kobold: SSE/single-POST, horde: poll).
  switch (engine.mainApi) {
    case 'textgenerationwebui':
    case 'openai':
      break;
    case 'novel':
      return yield* streamNovelGeneration(client, engine, character, history, headers, countTokens, opts);
    case 'kobold':
    case 'koboldhorde':
      throw new UnsupportedApiError(engine.mainApi);
    default:
      break; // unknown values fall through to the textgen path (legacy behavior)
  }

  const isChat = engine.mode === 'cc';
  let url: string;
  let body: unknown;

  if (isChat) {
    const req = await buildChatCompletionGenerateRequest({
      character,
      power: engine.power,
      oai: engine.oai,
      identity: engine.identity,
      history,
      maxContext: engine.maxContext,
      maxTokens: engine.maxTokens,
      countTokens,
      stream: true,
      ...(opts.type ? { type: opts.type } : {}),
      ...(opts.chatMetadata ? { chatMetadata: opts.chatMetadata } : {}),
      ...(opts.lorebook ? { lorebook: opts.lorebook } : {}),
      ...(opts.authorsNote ? { authorsNote: opts.authorsNote } : {}),
    });
    url = client.url(req.url);
    body = req.body;
  } else {
    const req = await buildTextgenGenerateRequest({
      character,
      power: engine.power,
      textgen: engine.textgen,
      identity: engine.identity,
      history,
      maxContext: engine.maxContext,
      maxTokens: engine.maxTokens,
      countTokens,
      stream: true,
      ...(opts.type ? { type: opts.type } : {}),
      ...(opts.chatMetadata ? { chatMetadata: opts.chatMetadata } : {}),
      ...(opts.lorebook ? { lorebook: opts.lorebook } : {}),
      ...(opts.authorsNote ? { authorsNote: opts.authorsNote } : {}),
      ...(opts.isImpersonate ? { isImpersonate: opts.isImpersonate } : {}),
      ...(engine.apiServerOverride ? { apiServerOverride: engine.apiServerOverride } : {}),
    });
    url = client.url(req.url);
    body = req.body;
  }

  const source = engine.oai.chat_completion_source;
  let text = '';
  let reasoning = '';
  for await (const evt of openSseStream({ url, headers, body, ...(opts.signal ? { signal: opts.signal } : {}) })) {
    if (isChat) {
      const delta = parseChatCompletionData(evt.data, source);
      if (!delta) continue;
      if (delta.done) break;
      text += delta.text;
      if (delta.reasoning) reasoning += delta.reasoning;
    } else {
      const delta = parseTextgenData(evt.data);
      if (!delta) continue;
      if (delta.done) break;
      text += delta.text;
      if (delta.thinking) reasoning += delta.thinking;
    }
    streamDebug.mark('sse', text.length);
    yield { text, reasoning };
  }
  return { text, reasoning };
}
