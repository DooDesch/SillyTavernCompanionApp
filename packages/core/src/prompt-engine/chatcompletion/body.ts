import type { Identity } from '../types';
import { substituteParams } from '../substituteParams';
import { getChatCompletionModel } from './model';
import type { ChatCompletionMessage, OaiSettings } from './types';

export const CHAT_COMPLETION_GENERATE_PATH = '/api/backends/chat-completions/generate';

export interface ChatCompletionBodyOptions {
  stream: boolean;
  identity: Identity;
  type?: 'normal' | 'continue' | 'quiet' | 'impersonate';
}

/** Build the /api/backends/chat-completions/generate request body (openai.js createGenerationParameters). */
export function createChatCompletionBody(
  oai: OaiSettings,
  messages: ChatCompletionMessage[],
  opts: ChatCompletionBodyOptions,
): Record<string, unknown> {
  const source = oai.chat_completion_source;
  const body: Record<string, unknown> = {
    messages,
    model: getChatCompletionModel(oai),
    temperature: oai.temp_openai,
    top_p: oai.top_p_openai,
    frequency_penalty: oai.freq_pen_openai,
    presence_penalty: oai.pres_pen_openai,
    max_tokens: oai.openai_max_tokens,
    stream: opts.stream,
    chat_completion_source: source,
    char_name: opts.identity.char,
    user_name: opts.identity.user,
    custom_prompt_post_processing: oai.custom_prompt_post_processing ?? '',
    include_reasoning: oai.show_thoughts ?? false,
  };
  if (oai.reasoning_effort) body.reasoning_effort = oai.reasoning_effort;
  if (typeof oai.seed === 'number' && oai.seed >= 0) body.seed = oai.seed;

  if (source === 'claude') {
    body.top_k = oai.top_k_openai;
    body.use_sysprompt = oai.use_sysprompt ?? true;
    if (opts.type !== 'quiet' && oai.assistant_prefill) {
      body.assistant_prefill = substituteParams(oai.assistant_prefill, { identity: opts.identity });
    }
  } else if (source === 'openrouter') {
    body.top_k = oai.top_k_openai;
    body.min_p = oai.min_p_openai;
    body.top_a = oai.top_a_openai;
    body.repetition_penalty = oai.repetition_penalty_openai;
  } else if (source === 'makersuite' || source === 'vertexai') {
    body.top_k = oai.top_k_openai;
    body.use_sysprompt = oai.use_sysprompt ?? true;
  }

  for (const key of Object.keys(body)) {
    if (body[key] === undefined) delete body[key];
  }
  return body;
}
