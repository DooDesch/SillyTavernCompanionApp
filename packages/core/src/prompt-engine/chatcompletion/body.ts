import type { Identity } from '../types';
import { substituteParams } from '../substituteParams';
import { getChatCompletionModel } from './model';
import type { ChatCompletionMessage, OaiSettings } from './types';

export const CHAT_COMPLETION_GENERATE_PATH = '/api/backends/chat-completions/generate';

/** openai.js:142 - the default stop-string cap for the base body. */
export const OPENAI_MAX_STOP_STRINGS = 4;

/** "OpenAI-like" sources (openai.js:2653-2657 gptSources). */
const GPT_SOURCES = ['openai', 'azure_openai', 'openrouter'];

/** Sources that support the "seed" parameter (openai.js:2660-2676). */
const SEED_SUPPORTED_SOURCES = [
  'openai',
  'azure_openai',
  'openrouter',
  'mistralai',
  'custom',
  'cohere',
  'groq',
  'electronhub',
  'nanogpt',
  'xai',
  'pollinations',
  'aimlapi',
  'vertexai',
  'makersuite',
  'chutes',
];

/** Sources that support proxying (openai.js:2679-2689). */
export const PROXY_SUPPORTED_SOURCES = [
  'claude',
  'openai',
  'mistralai',
  'makersuite',
  'vertexai',
  'deepseek',
  'xai',
  'zai',
  'moonshot',
];

/** Sources that support logprobs (openai.js:2692-2700). */
const LOGPROBS_SUPPORTED_SOURCES = ['openai', 'azure_openai', 'custom', 'deepseek', 'xai', 'aimlapi', 'chutes'];

/** Sources that support logit bias (openai.js:2703-2710). */
export const LOGIT_BIAS_SOURCES = ['openai', 'azure_openai', 'openrouter', 'electronhub', 'chutes', 'custom'];

/** Sources that support the "n" multi-swipe parameter (openai.js:2713-2720). */
export const MULTISWIPE_SOURCES = ['openai', 'azure_openai', 'custom', 'xai', 'aimlapi', 'moonshot'];

/** Generation types that never multi-swipe (openai.js:2726). */
const NO_MULTISWIPE_TYPES = ['quiet', 'impersonate', 'continue'];

/** Sources that expect the reasoning effort mapped to a string (openai.js:2528-2541). */
const REASONING_EFFORT_SOURCES = [
  'openai',
  'azure_openai',
  'custom',
  'xai',
  'aimlapi',
  'openrouter',
  'pollinations',
  'perplexity',
  'cometapi',
  'electronhub',
  'chutes',
  'deepseek',
];

export type ChatCompletionGenerateType =
  | 'normal'
  | 'continue'
  | 'quiet'
  | 'impersonate'
  | 'regenerate'
  | 'swipe';

export interface ChatCompletionBodyOptions {
  stream: boolean;
  identity: Identity;
  type?: ChatCompletionGenerateType;
  /**
   * Custom stopping strings, already macro-substituted (power-user.js getCustomStoppingStrings).
   * Use getOaiCustomStoppingStrings() to derive them from power_user; injected as an option so
   * the chat-completion body stays free of power_user concerns. Desktop additionally appends
   * EPHEMERAL_STOPPING_STRINGS (the /genstop slash command) - not supported in the app.
   */
  customStoppingStrings?: string[];
  /** power_user.request_token_probabilities - requests logprobs (max 5, openai.js:2794-2798). */
  requestTokenProbabilities?: boolean;
  /**
   * Pre-computed logit bias map (token id -> bias value), see calculateLogitBias(). Desktop
   * resolves the active bias preset via POST /api/backends/chat-completions/bias and caches it
   * (BIAS_CACHE); the app computes it per request in buildChatCompletionGenerateRequest with an
   * injected encoder. When absent, logit_bias is omitted.
   */
  logitBias?: Record<string, number>;
}

/** Number(value) but preserving undefined/null (desktop settings are always defined; app ones may not be). */
const num = (v: unknown): number | undefined => (v === undefined || v === null ? undefined : Number(v));

/**
 * Port of openai.js getReasoningEffort (2523-2618). The ElectronHub supported-effort check
 * (2606-2615) needs the live model_list metadata and is skipped in the app.
 */
function getReasoningEffort(oai: OaiSettings, model: string): string | undefined {
  const source = oai.chat_completion_source;
  const effort = oai.reasoning_effort;

  if (!REASONING_EFFORT_SOURCES.includes(source)) return effort;

  // Desktop always has reasoning_effort set (default 'auto'); guard a missing app field so the
  // deepseek 'high' fallback below is not injected out of thin air.
  if (effort === undefined) return undefined;

  if (source === 'deepseek') {
    switch (effort) {
      case 'auto':
        return undefined;
      case 'max':
        return 'max';
      default:
        return 'high';
    }
  }

  if (source === 'custom' && /^koboldcpp\/(.+)$/.test(model)) {
    switch (effort) {
      case 'auto':
        return undefined;
      case 'min':
        return 'minimal';
      case 'low':
        return 'low';
      case 'medium':
        return 'medium';
      case 'high':
        return 'high';
      case 'max':
        return 'xhigh';
      default:
        return effort;
    }
  }

  switch (effort) {
    case 'auto':
      return undefined;
    case 'min':
      if (source === 'openrouter' && !oai.show_thoughts) return 'none';
      if (source === 'openai' || source === 'azure_openai') {
        if (/^gpt-5\.(4|5)/.test(model)) return 'none';
        if (/^gpt-5/.test(model)) return 'min';
      }
      return 'low';
    case 'max':
      return 'high';
    default:
      return effort;
  }
}

/** Port of openai.js getVerbosity (2625-2634): 'auto' means "do not send". */
function getVerbosity(oai: OaiSettings): string | undefined {
  return oai.verbosity === 'auto' ? undefined : oai.verbosity;
}

/**
 * Port of power-user.js getCustomStoppingStrings (3072-3113) minus the limit (callers cap) and
 * minus EPHEMERAL_STOPPING_STRINGS (/genstop, not supported in the app): parse the JSON list,
 * keep non-empty strings, macro-substitute when custom_stopping_strings_macro is on.
 */
export function getOaiCustomStoppingStrings(
  power: { custom_stopping_strings?: string; custom_stopping_strings_macro?: boolean },
  identity: Identity,
): string[] {
  try {
    if (!power.custom_stopping_strings) return [];
    const parsed: unknown = JSON.parse(power.custom_stopping_strings);
    if (!Array.isArray(parsed)) return [];
    const macro = power.custom_stopping_strings_macro !== false;
    return parsed
      .filter((s): s is string => typeof s === 'string' && s.length > 0)
      .map((s) => (macro ? substituteParams(s, { identity }) : s));
  } catch {
    return [];
  }
}

/**
 * Compute the logit_bias map from the active bias preset. Mirrors openai.js calculateLogitBias
 * (3306-3323) + the server's /api/backends/chat-completions/bias endpoint
 * (src/endpoints/backends/chat-completions.js:2073-2155): each entry's text is tokenized (or
 * parsed as a raw `[token, ids]` JSON array) and every token maps to the entry's value.
 *
 * The encoder is injected (e.g. POST /api/tokenizers/openai/encode) so core stays fetch-free.
 * Returns undefined when the source does not support logit bias, no preset entries are
 * selected, or nothing could be encoded - matching desktop's `logit_bias = undefined` cleanup.
 */
export async function calculateLogitBias(
  oai: OaiSettings,
  encode: (text: string) => Promise<number[]>,
): Promise<Record<string, number> | undefined> {
  if (!LOGIT_BIAS_SOURCES.includes(oai.chat_completion_source)) return undefined;
  const preset = oai.bias_preset_selected;
  const entries = preset ? oai.bias_presets?.[preset] : undefined;
  if (!Array.isArray(entries) || entries.length === 0) return undefined;

  const result: Record<string, number> = {};
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object' || !entry.text) continue;
    const value = Number(entry.value);
    if (Number.isNaN(value)) continue;

    // Raw token ids as a JSON array (server getEntryTokens).
    let tokens: number[] | null = null;
    const trimmed = entry.text.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const json: unknown = JSON.parse(trimmed);
        if (Array.isArray(json) && json.every((x) => typeof x === 'number')) tokens = json as number[];
      } catch {
        // fall through to the encoder
      }
    }
    if (!tokens) {
      try {
        tokens = await encode(entry.text);
      } catch {
        continue; // server: "Tokenizer failed to encode" -> entry skipped
      }
    }
    for (const token of tokens) result[String(token)] = value;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Build the /api/backends/chat-completions/generate request body. 1:1 port of openai.js
 * createGenerationParameters (2645-3033); desktop line references are noted per block.
 *
 * Intentionally not ported (desktop-only concerns):
 *  - tool calling (ToolManager.registerFunctionToolsOpenAI, 2779-2781) - no tool support in the app,
 *    so the related `tools`/`tool_choice`/`top_logprobs` deletions are no-ops kept for parity;
 *  - group chats: group_names is always [] (desktop getGroupNames(), 2758);
 *  - jsonSchema / Workers AI json mode (2723, 3028-3030) - no structured-output flow in the app;
 *  - validateReverseProxy (2789) - a desktop UI confirmation dialog; the proxy URL is forwarded as-is.
 */
export function createChatCompletionBody(
  oai: OaiSettings,
  messages: ChatCompletionMessage[],
  opts: ChatCompletionBodyOptions,
): Record<string, unknown> {
  const source = oai.chat_completion_source;
  const model = getChatCompletionModel(oai);
  const type = opts.type ?? 'normal';
  const subst = (s: string): string => substituteParams(s, { identity: opts.identity });
  /** getCustomStoppingStrings(limit) - pre-substituted strings, optionally capped. */
  const stops = (limit?: number): string[] => {
    const all = opts.customStoppingStrings ?? [];
    return limit && limit > 0 ? all.slice(0, limit) : [...all];
  };

  // openai.js:2722-2727 - o1 cannot stream; n only for multi-swipe-capable sources and types.
  const isO1 = GPT_SOURCES.includes(source) && ['o1-2024-12-17', 'o1'].includes(model);
  const stream = opts.stream && type !== 'quiet' && !isO1;
  const n = num(oai.n);
  const canMultiSwipe =
    n !== undefined && n > 1 && !NO_MULTISWIPE_TYPES.includes(type) && MULTISWIPE_SOURCES.includes(source);

  // openai.js:2729-2740 - pre-computed in buildChatCompletionGenerateRequest (see options doc).
  const logitBias = opts.logitBias && Object.keys(opts.logitBias).length > 0 ? opts.logitBias : undefined;

  // Base body (openai.js:2742-2767). `type` is the Generate() type; a plain send is undefined.
  const body: Record<string, unknown> = {
    type: type === 'normal' ? undefined : type,
    messages,
    model,
    temperature: num(oai.temp_openai),
    frequency_penalty: num(oai.freq_pen_openai),
    presence_penalty: num(oai.pres_pen_openai),
    top_p: num(oai.top_p_openai),
    max_tokens: oai.openai_max_tokens,
    stream,
    logit_bias: logitBias,
    stop: stops(OPENAI_MAX_STOP_STRINGS),
    chat_completion_source: source,
    n: canMultiSwipe ? n : undefined,
    user_name: opts.identity.user,
    char_name: opts.identity.char,
    group_names: [], // no group-chat support in the app (desktop: getGroupNames())
    include_reasoning: Boolean(oai.show_thoughts),
    reasoning_effort: getReasoningEffort(oai, model),
    enable_web_search: Boolean(oai.enable_web_search),
    request_images: Boolean(oai.request_images),
    request_image_resolution: String(oai.request_image_resolution ?? ''),
    request_image_aspect_ratio: String(oai.request_image_aspect_ratio ?? ''),
    custom_prompt_post_processing: oai.custom_prompt_post_processing ?? '',
    verbosity: getVerbosity(oai),
  };

  // Azure OpenAI (openai.js:2769-2777).
  if (source === 'azure_openai') {
    body.azure_base_url = oai.azure_base_url;
    body.azure_deployment_name = oai.azure_deployment_name;
    body.azure_api_version = oai.azure_api_version;
    // Reasoning effort is not supported on some Azure models (e.g. GPT-3.x, GPT-4.x).
    if (/^gpt-[34]/.test(model)) delete body.reasoning_effort;
  }

  // An empty stop array would produce a validation error (openai.js:2784-2786).
  if (!Array.isArray(body.stop) || body.stop.length === 0) delete body.stop;

  // Reverse proxy (openai.js:2788-2792).
  if (oai.reverse_proxy && PROXY_SUPPORTED_SOURCES.includes(source)) {
    body.reverse_proxy = oai.reverse_proxy;
    body.proxy_password = oai.proxy_password;
  }

  // Logprobs request, max 5 per OpenAI docs (openai.js:2794-2798).
  if (opts.requestTokenProbabilities && LOGPROBS_SUPPORTED_SOURCES.includes(source)) {
    body.logprobs = 5;
  }

  // Remove logit bias/logprobs/stop strings if not supported by the model (openai.js:2800-2809).
  const isVision = ['gpt', 'vision'].every((x) => model.includes(x));
  if (GPT_SOURCES.includes(source) && isVision) {
    delete body.logit_bias;
    delete body.stop;
    delete body.logprobs;
  }
  if (GPT_SOURCES.includes(source) && /gpt-4.5/.test(model)) {
    delete body.logprobs;
  }

  // Claude (openai.js:2811-2821).
  if (source === 'claude') {
    body.top_k = num(oai.top_k_openai);
    body.use_sysprompt = oai.use_sysprompt ?? true;
    body.stop = stops(); // Claude shouldn't have limits on stop strings.
    // No body prefill on quiet gens (summarization) and when continue-prefilling: with
    // continue_prefill the displaced partial reply IS the prefill - sending the body
    // field too would make the server append it after the partial.
    if (type !== 'quiet' && !(type === 'continue' && oai.continue_prefill)) {
      body.assistant_prefill =
        type === 'impersonate' ? subst(oai.assistant_impersonation ?? '') : subst(oai.assistant_prefill ?? '');
    }
  }

  // OpenRouter (openai.js:2823-2833).
  if (source === 'openrouter') {
    body.top_k = num(oai.top_k_openai);
    body.min_p = num(oai.min_p_openai);
    body.repetition_penalty = num(oai.repetition_penalty_openai);
    body.top_a = num(oai.top_a_openai);
    body.use_fallback = oai.openrouter_use_fallback;
    body.provider = oai.openrouter_providers;
    body.quantizations = oai.openrouter_quantizations;
    body.allow_fallbacks = oai.openrouter_allow_fallbacks;
    body.middleout = oai.openrouter_middleout;
  }

  // NanoGPT provider fields (openai.js:2835-2838).
  if (source === 'nanogpt') {
    body.nanogpt_provider = oai.nanogpt_provider;
    body.nanogpt_payg_override = oai.nanogpt_payg_override;
  }

  // Google MakerSuite / Vertex AI (openai.js:2840-2850).
  if (source === 'makersuite' || source === 'vertexai') {
    const stopStringsLimit = 5;
    body.top_k = num(oai.top_k_openai);
    body.stop = stops(stopStringsLimit)
      .slice(0, stopStringsLimit)
      .filter((x) => x.length >= 1 && x.length <= 16);
    body.use_sysprompt = oai.use_sysprompt ?? true;
    if (source === 'vertexai') {
      body.vertexai_auth_mode = oai.vertexai_auth_mode;
      body.vertexai_region = oai.vertexai_region;
      body.vertexai_express_project_id = oai.vertexai_express_project_id;
    }
  }

  // MistralAI (openai.js:2852-2855).
  if (source === 'mistralai') {
    body.safe_prompt = false; // already defaults to false, but just in case they change that
    body.stop = stops(); // Mistral shouldn't have limits on stop strings.
  }

  // Custom OpenAI-compatible endpoint (openai.js:2857-2862).
  if (source === 'custom') {
    body.custom_url = oai.custom_url;
    body.custom_include_body = oai.custom_include_body;
    body.custom_exclude_body = oai.custom_exclude_body;
    body.custom_include_headers = oai.custom_include_headers;
  }

  // Cohere (openai.js:2864-2872).
  if (source === 'cohere') {
    const topP = num(oai.top_p_openai);
    if (topP !== undefined) body.top_p = Math.min(Math.max(topP, 0.01), 0.99); // clamp to 0.01 -> 0.99
    body.top_k = num(oai.top_k_openai);
    const freq = num(oai.freq_pen_openai);
    if (freq !== undefined) body.frequency_penalty = Math.min(Math.max(freq, 0), 1); // clamp to 0 -> 1
    const pres = num(oai.pres_pen_openai);
    if (pres !== undefined) body.presence_penalty = Math.min(Math.max(pres, 0), 1);
    body.stop = stops(5);
  }

  // Perplexity (openai.js:2874-2879).
  if (source === 'perplexity') {
    body.top_k = num(oai.top_k_openai);
    body.frequency_penalty = num(oai.freq_pen_openai);
    body.presence_penalty = num(oai.pres_pen_openai);
    delete body.stop;
  }

  // Groq, https://console.groq.com/docs/openai (openai.js:2882-2887).
  if (source === 'groq') {
    delete body.logprobs;
    delete body.logit_bias;
    delete body.top_logprobs;
    delete body.n;
  }

  // DeepSeek, https://api-docs.deepseek.com (openai.js:2890-2892).
  if (source === 'deepseek') {
    body.top_p = (body.top_p as number | undefined) || Number.EPSILON;
  }

  // xAI Grok model quirks (openai.js:2894-2913).
  if (source === 'xai') {
    if (model.includes('grok-3-mini')) {
      delete body.presence_penalty;
      delete body.frequency_penalty;
      delete body.stop;
    } else {
      // As of 2025/09/21, only grok-3-mini accepts reasoning_effort.
      delete body.reasoning_effort;
    }
    if (model.includes('grok-4') || model.includes('grok-code')) {
      delete body.presence_penalty;
      delete body.frequency_penalty;
      // grok-4-fast-non-reasoning accepts stop
      if (!model.includes('grok-4-fast-non-reasoning')) delete body.stop;
    }
  }

  // ElectronHub (openai.js:2916-2918).
  if (source === 'electronhub') {
    body.top_k = num(oai.top_k_openai);
  }

  // Chutes (openai.js:2920-2925).
  if (source === 'chutes') {
    const topK = num(oai.top_k_openai);
    body.min_p = num(oai.min_p_openai);
    body.top_k = topK !== undefined && topK > 0 ? topK : undefined;
    body.repetition_penalty = num(oai.repetition_penalty_openai);
    body.stop = stops();
  }

  // Z.AI, https://docs.z.ai (openai.js:2928-2934).
  if (source === 'zai') {
    body.top_p = (body.top_p as number | undefined) || 0.01;
    body.stop = stops(1);
    body.zai_endpoint = oai.zai_endpoint || 'common';
    delete body.presence_penalty;
    delete body.frequency_penalty;
  }

  // SiliconFlow (openai.js:2936-2938).
  if (source === 'siliconflow') {
    body.siliconflow_endpoint = oai.siliconflow_endpoint || 'global';
  }

  // MiniMax (openai.js:2940-2946) - temperature must be in (0.0, 1.0].
  if (source === 'minimax') {
    body.minimax_endpoint = oai.minimax_endpoint || 'global';
    if (typeof body.temperature === 'number' && Number.isFinite(body.temperature)) {
      body.temperature = Math.min(Math.max(body.temperature, Number.EPSILON), 1.0);
    }
  }

  // Cloudflare Workers AI (openai.js:2948-2956).
  if (source === 'workers_ai') {
    body.workers_ai_account_id = oai.workers_ai_account_id;
    const topK = num(oai.top_k_openai);
    body.top_k = topK !== undefined && topK > 0 ? Math.min(topK, 50) : undefined;
    body.repetition_penalty = num(oai.repetition_penalty_openai);
    const seed = num(oai.seed);
    body.seed = seed !== undefined && seed >= 1 ? seed : undefined;
    const topP = num(oai.top_p_openai);
    if (topP !== undefined) body.top_p = Math.max(topP, 0.001);
    delete body.n;
    delete body.logit_bias;
  }

  // NanoGPT samplers, https://docs.nano-gpt.com (openai.js:2959-2964).
  if (source === 'nanogpt') {
    body.top_k = num(oai.top_k_openai);
    body.min_p = num(oai.min_p_openai);
    body.repetition_penalty = num(oai.repetition_penalty_openai);
    body.top_a = num(oai.top_a_openai);
  }

  // Moonshot Kimi (openai.js:2967-2975).
  if (source === 'moonshot' && /kimi-k2.5/.test(model)) {
    delete body.temperature;
    delete body.top_p;
    delete body.frequency_penalty;
    delete body.presence_penalty;
  }

  // Seed, gated by source support (openai.js:2977-2979).
  const seed = num(oai.seed);
  if (SEED_SUPPORTED_SOURCES.includes(source) && seed !== undefined && seed >= 0) {
    body.seed = seed;
  }

  // OpenAI o-series reasoning models (openai.js:2981-3003).
  if (
    ((source === 'openai' || source === 'azure_openai') && /^(o1|o3|o4)/.test(model)) ||
    (source === 'openrouter' && /^openai\/(o1|o3|o4)/.test(model))
  ) {
    body.max_completion_tokens = body.max_tokens;
    delete body.max_tokens;
    delete body.logprobs;
    delete body.top_logprobs;
    delete body.stop;
    delete body.logit_bias;
    delete body.temperature;
    delete body.top_p;
    delete body.frequency_penalty;
    delete body.presence_penalty;
    if (/^(openai\/)?(o1)/.test(model)) {
      body.messages = (body.messages as ChatCompletionMessage[]).map((m) =>
        m.role === 'system' ? { ...m, role: 'user' as const } : m,
      );
      delete body.n;
      delete body.tools;
      delete body.tool_choice;
    }
  }

  // GPT-5 family (openai.js:3005-3026).
  if (GPT_SOURCES.includes(source) && /gpt-5/.test(model)) {
    body.max_completion_tokens = body.max_tokens;
    delete body.max_tokens;
    delete body.logprobs;
    delete body.top_logprobs;
    if (/gpt-5-chat-latest/.test(model)) {
      delete body.tools;
      delete body.tool_choice;
    } else if (/gpt-5\.(1|2|3|4)/.test(model) && !/chat-latest/.test(model) && !body.reasoning_effort) {
      delete body.frequency_penalty;
      delete body.presence_penalty;
      delete body.logit_bias;
      delete body.stop;
    } else {
      delete body.temperature;
      delete body.top_p;
      delete body.frequency_penalty;
      delete body.presence_penalty;
      delete body.logit_bias;
      delete body.stop;
    }
  }

  // Desktop relies on JSON.stringify dropping undefined values; do it eagerly instead.
  for (const key of Object.keys(body)) {
    if (body[key] === undefined) delete body[key];
  }
  return body;
}
