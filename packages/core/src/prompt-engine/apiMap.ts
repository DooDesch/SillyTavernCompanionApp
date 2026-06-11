/**
 * Port of SillyTavern's CONNECT_API_MAP (slash-commands.js setupConnectAPIMap):
 * maps connection-profile API slugs to the main_api routing key plus the
 * textgen type or chat-completion source they select.
 */

/** Desktop `main_api` values the engine can route on. */
export type MainApi = 'textgenerationwebui' | 'openai' | 'novel' | 'kobold' | 'koboldhorde';

export const MAIN_APIS: readonly MainApi[] = [
  'textgenerationwebui',
  'openai',
  'novel',
  'kobold',
  'koboldhorde',
];

export function normalizeMainApi(value: unknown): MainApi {
  return MAIN_APIS.includes(value as MainApi) ? (value as MainApi) : 'textgenerationwebui';
}

export interface ResolvedApiSlug {
  mainApi: MainApi;
  /** textgenerationwebui_settings.type when mainApi is textgenerationwebui. */
  textgenType?: string;
  /** oai_settings.chat_completion_source when mainApi is openai. */
  ccSource?: string;
}

/** textgen_types (textgen-settings.js). */
const TEXTGEN_TYPES = [
  'ooba',
  'mancer',
  'vllm',
  'aphrodite',
  'tabby',
  'koboldcpp',
  'togetherai',
  'llamacpp',
  'ollama',
  'infermaticai',
  'dreamgen',
  'openrouter',
  'featherless',
  'huggingface',
  'generic',
] as const;

/** chat_completion_sources (openai.js). */
const CC_SOURCES = [
  'openai',
  'claude',
  'openrouter',
  'ai21',
  'makersuite',
  'vertexai',
  'mistralai',
  'custom',
  'cohere',
  'perplexity',
  'groq',
  'electronhub',
  'chutes',
  'nanogpt',
  'deepseek',
  'aimlapi',
  'xai',
  'pollinations',
  'moonshot',
  'fireworks',
  'cometapi',
  'azure_openai',
  'zai',
  'siliconflow',
  'workers_ai',
  'minimax',
] as const;

const MAP = new Map<string, ResolvedApiSlug>();

// Explicit entries first - they win over the auto-filled ones (desktop semantics:
// 'openrouter' selects the CC source, 'openrouter-text' the textgen type).
MAP.set('kobold', { mainApi: 'kobold' });
MAP.set('horde', { mainApi: 'koboldhorde' });
MAP.set('novel', { mainApi: 'novel' });
MAP.set('koboldcpp', { mainApi: 'textgenerationwebui', textgenType: 'koboldcpp' });
MAP.set('kcpp', { mainApi: 'textgenerationwebui', textgenType: 'koboldcpp' });
MAP.set('openai', { mainApi: 'openai', ccSource: 'openai' });
MAP.set('oai', { mainApi: 'openai', ccSource: 'openai' });
MAP.set('google', { mainApi: 'openai', ccSource: 'makersuite' });
MAP.set('openrouter', { mainApi: 'openai', ccSource: 'openrouter' });
MAP.set('openrouter-text', { mainApi: 'textgenerationwebui', textgenType: 'openrouter' });

for (const t of TEXTGEN_TYPES) {
  if (!MAP.has(t)) MAP.set(t, { mainApi: 'textgenerationwebui', textgenType: t });
}
for (const s of CC_SOURCES) {
  if (!MAP.has(s)) MAP.set(s, { mainApi: 'openai', ccSource: s });
}

/** Resolve a connection-profile `api` slug; null for unknown slugs. */
export function resolveApiSlug(slug: string | undefined | null): ResolvedApiSlug | null {
  if (!slug) return null;
  return MAP.get(String(slug).toLowerCase()) ?? null;
}
