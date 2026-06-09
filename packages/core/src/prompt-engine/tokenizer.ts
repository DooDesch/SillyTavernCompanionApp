/**
 * Maps SillyTavern's `power_user.tokenizer` selection to the server token-count endpoint, so the app
 * can budget the prompt with the SAME tokenizer the desktop uses (instead of a chars/3.5 estimate).
 * Faithful to `public/scripts/tokenizers.js` (the `tokenizers` enum + `getTokenizerBestMatch` model
 * branch). The `/api/tokenizers/{name}/encode` endpoints accept `{ text }` and reply `{ count }`.
 */

export const TOKENIZER = {
  NONE: 0,
  GPT2: 1,
  OPENAI: 2,
  LLAMA: 3,
  NERD: 4,
  NERD2: 5,
  API_CURRENT: 6,
  MISTRAL: 7,
  YI: 8,
  API_TEXTGENERATIONWEBUI: 9,
  API_KOBOLD: 10,
  CLAUDE: 11,
  LLAMA3: 12,
  GEMMA: 13,
  JAMBA: 14,
  QWEN2: 15,
  COMMAND_R: 16,
  NEMO: 17,
  DEEPSEEK: 18,
  COMMAND_A: 19,
  BEST_MATCH: 99,
} as const;

/** Concrete tokenizer id → ST endpoint slug (local encoders that return a real `count`). */
const LOCAL_SLUG: Record<number, string> = {
  [TOKENIZER.GPT2]: 'gpt2',
  [TOKENIZER.OPENAI]: 'openai',
  [TOKENIZER.LLAMA]: 'llama',
  [TOKENIZER.NERD]: 'nerdstash',
  [TOKENIZER.NERD2]: 'nerdstash_v2',
  [TOKENIZER.MISTRAL]: 'mistral',
  [TOKENIZER.YI]: 'yi',
  [TOKENIZER.CLAUDE]: 'claude',
  [TOKENIZER.LLAMA3]: 'llama3',
  [TOKENIZER.GEMMA]: 'gemma',
  [TOKENIZER.JAMBA]: 'jamba',
  [TOKENIZER.QWEN2]: 'qwen2',
  [TOKENIZER.COMMAND_R]: 'command-r',
  [TOKENIZER.COMMAND_A]: 'command-a',
  [TOKENIZER.NEMO]: 'nemo',
  [TOKENIZER.DEEPSEEK]: 'deepseek',
};

/** Port of the textgen model branch of `getTokenizerBestMatch` (model name → tokenizer slug). */
export function tokenizerSlugFromModel(model: string): string | null {
  const m = (model || '').toLowerCase();
  if (m.includes('llama3') || m.includes('llama-3')) return 'llama3';
  if (m.includes('mistral') || m.includes('mixtral')) return 'mistral';
  if (m.includes('gemma')) return 'gemma';
  if (m.includes('nemo') || m.includes('pixtral')) return 'nemo';
  if (m.includes('deepseek')) return 'deepseek';
  if (m.includes('command-a')) return 'command-a';
  if (m.includes('command-r')) return 'command-r';
  if (m.includes('qwen')) return 'qwen2';
  if (m.includes('jamba')) return 'jamba';
  if (m.includes('yi')) return 'yi';
  if (m.includes('claude')) return 'claude';
  return null;
}

export interface ResolvedTokenizer {
  /** ST count endpoint path, or null when no faithful endpoint applies (caller uses the estimate). */
  url: string | null;
  /** Friendly tokenizer slug ('gemma', 'llama3', …) or 'estimate'. */
  name: string;
}

/**
 * Resolve the count endpoint for `power_user.tokenizer`. Concrete ids map directly; BEST_MATCH and
 * the API_* placeholders fall back to a model-name match, then to the estimate (null url) so we never
 * silently count with the *wrong* tokenizer (which would diverge from the desktop just like the
 * estimate does, but invisibly).
 */
export function resolveTokenizer(tokenizerId: number | undefined, modelHint?: string): ResolvedTokenizer {
  const id = tokenizerId ?? TOKENIZER.BEST_MATCH;
  const slug = LOCAL_SLUG[id];
  if (slug) return { url: `/api/tokenizers/${slug}/encode`, name: slug };
  if (modelHint) {
    const byModel = tokenizerSlugFromModel(modelHint);
    if (byModel) return { url: `/api/tokenizers/${byModel}/encode`, name: byModel };
  }
  return { url: null, name: 'estimate' };
}
