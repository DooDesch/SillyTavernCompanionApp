import {
  buildChatCompletionGenerateRequest,
  buildTextgenGenerateRequest,
  estimateTokens,
  historyFromMessages,
  parseChatCompletionData,
  parseTextgenData,
  type EngineConfig,
  type StCharacter,
  type StChatMessage,
  type StClient,
  type WorldInfoEntry,
  type WorldInfoSettings,
} from '@st/core';
import { openSseStream } from './streamTransport';

export interface GenerateOptions {
  type?: 'normal' | 'continue' | 'regenerate' | 'swipe';
  signal?: AbortSignal;
  chatMetadata?: { system_prompt?: string; scenario?: string; mes_example?: string };
  lorebook?: { entries: WorldInfoEntry[]; settings: WorldInfoSettings };
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
): AsyncGenerator<string, string, void> {
  const history = historyFromMessages(messages, character.name);
  const headers = await client.authHeaders();
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
      countTokens: estimateTokens,
      stream: true,
      ...(opts.type ? { type: opts.type } : {}),
      ...(opts.chatMetadata ? { chatMetadata: opts.chatMetadata } : {}),
      ...(opts.lorebook ? { lorebook: opts.lorebook } : {}),
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
      countTokens: estimateTokens,
      stream: true,
      ...(opts.type ? { type: opts.type } : {}),
      ...(opts.chatMetadata ? { chatMetadata: opts.chatMetadata } : {}),
      ...(opts.lorebook ? { lorebook: opts.lorebook } : {}),
      ...(engine.apiServerOverride ? { apiServerOverride: engine.apiServerOverride } : {}),
    });
    url = client.url(req.url);
    body = req.body;
  }

  const source = engine.oai.chat_completion_source;
  let accumulated = '';
  for await (const evt of openSseStream({ url, headers, body, ...(opts.signal ? { signal: opts.signal } : {}) })) {
    const delta = isChat ? parseChatCompletionData(evt.data, source) : parseTextgenData(evt.data);
    if (!delta) continue;
    if (delta.done) break;
    accumulated += delta.text;
    yield accumulated;
  }
  return accumulated;
}
