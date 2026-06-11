import {
  buildChatCompletionGenerateRequest,
  buildTextgenGenerateRequest,
  getChatCompletionModel,
  historyFromMessages,
  parseChatCompletionData,
  parseTextgenData,
  resolveTokenizer,
  type DepthInjection,
  type EngineConfig,
  type StCharacter,
  type StChatMessage,
  type StClient,
  type WorldInfoEntry,
  type WorldInfoSettings,
} from '@st/core';
import { openSseStream } from './streamTransport';
import { streamDebug } from './streamDebug';
import { makeTokenCounter } from './tokenizer';

/** Build the prompt-budget token counter for the active backend (faithful to the desktop tokenizer). */
function tokenCounterFor(client: StClient, engine: EngineConfig) {
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
