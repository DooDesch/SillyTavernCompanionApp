import { AppState } from 'react-native';
import {
  adjustHordeParams,
  buildChatCompletionGenerateRequest,
  buildKoboldGenerateRequest,
  buildNovelGenerateRequest,
  buildTextgenGenerateRequest,
  computeKaiFlags,
  createHordePayload,
  getChatCompletionModel,
  getHordeModels,
  getHordeWorkers,
  getKoboldStatus,
  getNovelStatus,
  getNovelTokenizerSlug,
  historyFromMessages,
  normalizeHordeSettings,
  parseChatCompletionData,
  parseKoboldData,
  parseNovelData,
  parseTextgenData,
  resolveTokenizer,
  runHordeTask,
  HordeAbortError,
  HordeError,
  type DepthInjection,
  type EngineConfig,
  type HistoryMessage,
  type HordeProgress,
  type HordeTaskResult,
  type NovelEncode,
  type StCharacter,
  type StChatMessage,
  type StClient,
  type TokenCounter,
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

/** A generation failure whose message is already translated for direct display. */
export class GenerationUserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GenerationUserError';
  }
}

/** A generation failure carrying an i18n key (subclass so one catch handles both). */
export class FriendlyGenerationError extends GenerationUserError {
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

  // Backend dispatcher (desktop main_api routing).
  switch (engine.mainApi) {
    case 'textgenerationwebui':
    case 'openai':
      break;
    case 'novel':
      return yield* streamNovelGeneration(client, engine, character, history, headers, countTokens, opts);
    case 'kobold':
      return yield* streamKobold(client, engine, character, history, countTokens, headers, opts);
    case 'koboldhorde':
      return yield* streamHorde(client, engine, character, history, countTokens, opts);
    case 'novel':
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

/** Common options forwarded into the kobold/horde request builders. */
function builderOpts(opts: GenerateOptions) {
  return {
    ...(opts.type ? { type: opts.type } : {}),
    ...(opts.chatMetadata ? { chatMetadata: opts.chatMetadata } : {}),
    ...(opts.lorebook ? { lorebook: opts.lorebook } : {}),
    ...(opts.authorsNote ? { authorsNote: opts.authorsNote } : {}),
    ...(opts.isImpersonate ? { isImpersonate: opts.isImpersonate } : {}),
  };
}

/**
 * KoboldAI Classic (main_api 'kobold'): one status round-trip per generation derives the
 * version gates (desktop getStatusKobold -> setKoboldFlags), then either an SSE stream of
 * {token} frames or a single POST returning {results:[{text}]}.
 */
async function* streamKobold(
  client: StClient,
  engine: EngineConfig,
  character: StCharacter,
  history: HistoryMessage[],
  countTokens: TokenCounter,
  headers: Record<string, string>,
  opts: GenerateOptions,
): AsyncGenerator<GenerationChunk, GenerationChunk, void> {
  const kai = engine.kai;
  const apiServer = engine.apiServerOverride || String(kai['api_server'] ?? '');
  const status = await getKoboldStatus(client, apiServer);
  const flags = computeKaiFlags(status.koboldUnitedVersion, status.koboldCppVersion);

  const req = await buildKoboldGenerateRequest({
    character,
    power: engine.power,
    kai,
    identity: engine.identity,
    history,
    maxContext: engine.maxContext,
    maxTokens: engine.maxTokens,
    countTokens,
    flags,
    apiServer,
    ...(engine.koboldPresets ? { presets: engine.koboldPresets } : {}),
    ...builderOpts(opts),
  });

  let text = '';
  if (req.body['streaming'] === true) {
    const url = client.url(req.url);
    for await (const evt of openSseStream({
      url,
      headers,
      body: req.body,
      ...(opts.signal ? { signal: opts.signal } : {}),
    })) {
      const delta = parseKoboldData(evt.data);
      if (!delta) continue;
      text += delta.text;
      streamDebug.mark('sse', text.length);
      yield { text, reasoning: '' };
    }
    // No [DONE] sentinel - the kobold stream just closes.
    return { text, reasoning: '' };
  }

  // Non-streaming (incl. the GUI preset, which has no streaming field): single POST.
  const res = await client.post<{ results?: Array<{ text?: string }>; error?: unknown }>(
    req.url,
    req.body,
  );
  if (!res.ok || res.data?.error) {
    throw new Error(i18n.t('errors.generationFailed', { status: res.status }));
  }
  text = res.data?.results?.[0]?.text ?? '';
  yield { text, reasoning: '' };
  return { text, reasoning: '' };
}

/**
 * Sleep that wakes early when the app returns to the foreground, so a Horde poll loop
 * that Android froze in the background catches up immediately on resume instead of
 * waiting out the remaining interval.
 */
function resumeFriendlyDelay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    let sub: { remove(): void } | null = null;
    const finish = (): void => {
      clearTimeout(timer);
      sub?.remove();
      resolve();
    };
    const timer = setTimeout(finish, ms);
    sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') finish();
    });
  });
}

/** Map typed Horde failures onto translated, user-displayable errors. */
function mapHordeError(e: unknown): unknown {
  if (e instanceof HordeAbortError) return e; // user stop - no alert, like other backends
  if (e instanceof HordeError) {
    switch (e.code) {
      case 'faulted':
        return new GenerationUserError(i18n.t('chat.hordeFaulted'));
      case 'impossible':
        return new GenerationUserError(i18n.t('chat.hordeImpossible'));
      case 'timeout':
        return new GenerationUserError(i18n.t('chat.hordeTimeout'));
      default:
        return new GenerationUserError(e.message); // rejected: carries the server reason
    }
  }
  return e;
}

/**
 * AI Horde (main_api 'koboldhorde'): build the kobold generation data with isHorde
 * semantics, submit it through the ST server and poll the task. Yields status chunks
 * (queue position -> generating) while polling, then ONE final text chunk.
 */
async function* streamHorde(
  client: StClient,
  engine: EngineConfig,
  character: StCharacter,
  history: HistoryMessage[],
  countTokens: TokenCounter,
  opts: GenerateOptions,
): AsyncGenerator<GenerationChunk, GenerationChunk, void> {
  // Desktop isHordeGenerationNotAllowed(): the GUI preset has no sampler values to send.
  if (String(engine.kai['preset_settings'] ?? 'gui') === 'gui') {
    throw new GenerationUserError(i18n.t('chat.hordeGuiPreset'));
  }

  const horde = normalizeHordeSettings(engine.horde);

  // Desktop adjustHordeGenerationParams: shrink to the weakest selected worker. The
  // prompt budget additionally drops by the response length (script.js this_max_context).
  let bodyMaxContext = engine.maxContext;
  let promptMaxContext = engine.maxContext;
  let maxLength = engine.maxTokens;
  if (horde.auto_adjust_context_length || horde.auto_adjust_response_length) {
    const [workers, models] = await Promise.all([getHordeWorkers(client), getHordeModels(client)]);
    const adjusted = adjustHordeParams(workers, models, horde, engine.maxContext, engine.maxTokens);
    if (horde.auto_adjust_response_length) maxLength = adjusted.maxLength;
    if (horde.auto_adjust_context_length) {
      bodyMaxContext = adjusted.maxContextLength;
      promptMaxContext = adjusted.maxContextLength - adjusted.maxLength;
    }
  }

  // isHorde forces the version-gated sampler keys open inside createKoboldGenerationData;
  // the flags stay all-false like desktop (no kobold backend connected), so the params
  // carry streaming:false / can_abort:false.
  const req = await buildKoboldGenerateRequest({
    character,
    power: engine.power,
    kai: engine.kai,
    identity: engine.identity,
    history,
    maxContext: promptMaxContext,
    maxTokens: maxLength,
    countTokens,
    flags: computeKaiFlags(undefined, undefined),
    apiServer: String(engine.kai['api_server'] ?? ''),
    isHorde: true,
    bodyMaxContext,
    ...(engine.koboldPresets ? { presets: engine.koboldPresets } : {}),
    ...builderOpts(opts),
  });
  if (req.presetName === 'gui') {
    // The configured preset name was not found in the preset arrays - same rejection.
    throw new GenerationUserError(i18n.t('chat.hordeGuiPreset'));
  }

  const payload = createHordePayload(req.prompt, req.body, horde);

  // Bridge runHordeTask's onProgress callback into generator yields: progress events
  // queue up and the pump below drains them between poll iterations.
  const statusQueue: GenerationChunk[] = [];
  let notify: (() => void) | null = null;
  const pushStatus = (p: HordeProgress): void => {
    statusQueue.push({
      text: '',
      reasoning: '',
      status:
        p.queuePosition > 0
          ? { key: 'chat.hordeQueued', params: { position: p.queuePosition } }
          : { key: 'chat.hordeGenerating' },
    });
    notify?.();
  };

  let result: HordeTaskResult | null = null;
  let error: unknown = null;
  let done = false;
  const task = runHordeTask(
    {
      post: async (path, body) => {
        const res = await client.post(path, body);
        return { ok: res.ok, data: res.data };
      },
      delay: resumeFriendlyDelay,
    },
    payload,
    {
      ...(opts.signal ? { signal: opts.signal } : {}),
      onProgress: pushStatus,
    },
  ).then(
    (r) => {
      result = r;
    },
    (e: unknown) => {
      error = e;
    },
  );
  void task.finally(() => {
    done = true;
    notify?.();
  });

  while (!done || statusQueue.length > 0) {
    if (statusQueue.length > 0) {
      yield statusQueue.shift()!;
      continue;
    }
    await new Promise<void>((resolve) => {
      notify = resolve;
    });
    notify = null;
  }
  await task;

  if (error) throw mapHordeError(error);
  const final: HordeTaskResult = result ?? { text: '', workerName: '', model: '' };
  yield { text: final.text, reasoning: '' };
  return { text: final.text, reasoning: '' };
}
