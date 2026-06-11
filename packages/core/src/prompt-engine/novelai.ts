/**
 * NovelAI request building, ported 1:1 from desktop SillyTavern:
 *   - public/scripts/nai-settings.js (nai_settings shape 36-62, getNovelGenerationData 515-607,
 *     selectPrefix 609-625, tokenizer pick 627-638, getBadWordPermutations 488-513,
 *     getBadWordIds 434-486, calculateLogitBias 682-707, adjustNovelInstructionPrompt 716-722,
 *     getNovelMaxResponseTokens 105-116, getKayraMaxContextTokens 92-103, nai_tiers 64-69)
 *   - public/script.js getMaxContextTokens novel branch 5874-5896
 *
 * Tokenization is server-side here (desktop tokenizes client-side): the async `encode`
 * callback POSTs to /api/tokenizers/{nerdstash|nerdstash_v2|llama3}/encode and returns ids.
 * The ST server adds eos_token_id (theme_textadventure) and the model-default bad words /
 * logit biases itself (src/endpoints/novelai.js 183-256) - the client must NOT send those.
 */

export const NOVELAI_GENERATE_PATH = '/api/novelai/generate';

/** nai-settings.js:24 */
export const NAI_DEFAULT_PREAMBLE = '[ Style: chat, complex, sensory, visceral ]';
/** nai-settings.js:25 */
export const NAI_DEFAULT_ORDER = [1, 5, 0, 2, 3, 4];
/** nai-settings.js:26 (maximum_output_length) */
const MAXIMUM_OUTPUT_LENGTH = 150;
const MAX_STOP_SEQUENCES = 1024;

/** nai_tiers (nai-settings.js:64-69). */
export const NAI_TIERS: Record<number, string> = {
  0: 'Paper',
  1: 'Tablet',
  2: 'Scroll',
  3: 'Opus',
};

/** Subscription tier id -> display name ('no_connection' fallback like getNovelTier). */
export function getNovelTierName(tier: number | undefined): string {
  return (tier !== undefined ? NAI_TIERS[tier] : undefined) ?? 'no_connection';
}

/** A logit bias entry as stored in nai_settings.logit_bias (logit-bias.js createNewLogitBiasEntry). */
export interface NaiLogitBiasEntry {
  id?: string;
  text?: string;
  value?: number;
  [key: string]: unknown;
}

/** Mirror of the desktop `nai_settings` object (nai-settings.js:36-62 + preset-loaded fields). */
export interface NaiSettings {
  temperature?: number;
  repetition_penalty?: number;
  repetition_penalty_range?: number;
  repetition_penalty_slope?: number;
  repetition_penalty_frequency?: number;
  repetition_penalty_presence?: number;
  tail_free_sampling?: number;
  top_k?: number;
  top_p?: number;
  top_a?: number;
  typical_p?: number;
  min_p: number;
  math1_temp: number;
  math1_quad: number;
  math1_quad_entropy_scale: number;
  min_length?: number;
  model_novel: string;
  preset_settings_novel?: string;
  streaming_novel: boolean;
  preamble: string;
  prefix?: string;
  banned_tokens: string;
  order?: number[];
  logit_bias: NaiLogitBiasEntry[];
  extensions?: Record<string, unknown>;
  /** Loaded from preset/settings (loadNovelSettings:252-254), not part of the defaults literal. */
  phrase_rep_pen?: string;
  mirostat_lr?: number;
  mirostat_tau?: number;
  [key: string]: unknown;
}

/**
 * Normalize the raw `nai_settings` block from /api/settings/get into NaiSettings, applying
 * exactly the `||` fallbacks desktop loadNovelSettings (nai-settings.js:230-266) applies.
 * Plain assignments stay passthrough (desktop also overwrites its defaults with undefined).
 * Deviation: `order` is NOT defaulted here so the getNovelGenerationData fallback chain
 * `nai.order || preset.order || default_order` (nai-settings.js:604) stays live.
 */
export function normalizeNaiSettings(raw: Record<string, unknown>): NaiSettings {
  const r = raw as Partial<NaiSettings> & Record<string, unknown>;
  return {
    ...r,
    model_novel: String(r.model_novel || 'clio-v1'),
    streaming_novel: !!r.streaming_novel,
    preamble: (typeof r.preamble === 'string' && r.preamble) || NAI_DEFAULT_PREAMBLE,
    banned_tokens: (typeof r.banned_tokens === 'string' && r.banned_tokens) || '',
    ...(Array.isArray(r.order) ? { order: r.order as number[] } : {}),
    logit_bias: Array.isArray(r.logit_bias) ? (r.logit_bias as NaiLogitBiasEntry[]) : [],
    min_p: (r.min_p as number) || 0,
    math1_temp: (r.math1_temp as number) || 1,
    math1_quad: (r.math1_quad as number) || 0,
    math1_quad_entropy_scale: (r.math1_quad_entropy_scale as number) || 0,
  };
}

/** ST server tokenizer endpoint slugs for the NovelAI models. */
export type NovelTokenizerSlug = 'nerdstash' | 'nerdstash_v2' | 'llama3';

/** Injected server-side tokenizer: POST /api/tokenizers/{slug}/encode -> { ids }. */
export type NovelEncode = (tokenizerSlug: NovelTokenizerSlug, text: string) => Promise<number[]>;

/** getTokenizerTypeForModel (nai-settings.js:627-638), expressed as endpoint slugs. */
export function getNovelTokenizerSlug(model: string): NovelTokenizerSlug | null {
  if (model.includes('clio')) return 'nerdstash';
  if (model.includes('kayra')) return 'nerdstash_v2';
  if (model.includes('erato')) return 'llama3';
  return null;
}

/** getKayraMaxContextTokens (nai-settings.js:92-103). */
export function getKayraMaxContextTokens(tier: number | undefined): number | null {
  switch (tier) {
    case 1:
      return 4096;
    case 2:
      return 8192;
    case 3:
      return 8192;
  }
  return null;
}

/** getNovelMaxResponseTokens (nai-settings.js:105-116). */
export function getNovelMaxResponseTokens(tier: number | undefined): number {
  switch (tier) {
    case 1:
      return 150;
    case 2:
      return 150;
    case 3:
      return 250;
  }
  return MAXIMUM_OUTPUT_LENGTH;
}

/**
 * Novel branch of getMaxContextTokens (script.js:5874-5896): every model is clamped to 8192,
 * kayra additionally to the subscription tier limit, erato loses 10 tokens for special tokens.
 */
export function getNovelMaxContext(nai: NaiSettings, maxContext: number, tier?: number): number {
  let thisMaxContext = Number(maxContext);
  if (nai.model_novel.includes('clio')) {
    thisMaxContext = Math.min(maxContext, 8192);
  }
  if (nai.model_novel.includes('kayra')) {
    thisMaxContext = Math.min(maxContext, 8192);

    const subscriptionLimit = getKayraMaxContextTokens(tier);
    if (typeof subscriptionLimit === 'number' && thisMaxContext > subscriptionLimit) {
      thisMaxContext = subscriptionLimit;
    }
  }
  if (nai.model_novel.includes('erato')) {
    // subscriber limits coming soon (desktop comment)
    thisMaxContext = Math.min(maxContext, 8192);

    // Added special tokens and whatnot
    thisMaxContext -= 10;
  }
  return thisMaxContext;
}

/**
 * Check if the prefix needs to be overridden to use instruct mode (nai-settings.js:609-625).
 * NovelAI scans backwards ~1000 characters for instruct brackets; desktop scans 1500.
 */
export function selectPrefix(model: string, selectedPrefix: string | undefined, finalPrompt: string): string | undefined {
  const clio = model.includes('clio');
  const kayra = model.includes('kayra');
  const erato = model.includes('erato');
  const isNewModel = clio || kayra || erato;

  if (isNewModel) {
    const tail = finalPrompt.slice(-1500);
    const useInstruct = tail.includes('}');
    return useInstruct ? 'special_instruct' : selectedPrefix;
  }

  return 'vanilla';
}

/**
 * Transforms an instruction into NovelAI's instruct format (nai-settings.js:716-722):
 * wrapped in `{ }` with spaces, square brackets stripped (they have a different meaning in NAI).
 */
export function adjustNovelInstructionPrompt(prompt: string): string {
  const stripedPrompt = prompt.replace(/[[\]]/g, '').trim();
  if (!stripedPrompt.includes('{ ')) {
    return `{ ${stripedPrompt} }`;
  }
  return stripedPrompt;
}

/** getBadWordPermutations (nai-settings.js:488-513) - 10 case/space variants, de-duplicated. */
export function getBadWordPermutations(text: string): string[] {
  const result: string[] = [];

  // Original text
  result.push(text);
  // Original text + leading space
  result.push(` ${text}`);
  // First letter capitalized
  result.push(text[0]!.toUpperCase() + text.slice(1));
  // Ditto + leading space
  result.push(` ${text[0]!.toUpperCase() + text.slice(1)}`);
  // First letter lower cased
  result.push(text[0]!.toLowerCase() + text.slice(1));
  // Ditto + leading space
  result.push(` ${text[0]!.toLowerCase() + text.slice(1)}`);
  // Original all upper cased
  result.push(text.toUpperCase());
  // Ditto + leading space
  result.push(` ${text.toUpperCase()}`);
  // Original all lower cased
  result.push(text.toLowerCase());
  // Ditto + leading space
  result.push(` ${text.toLowerCase()}`);

  return result.filter((value, index, self) => self.indexOf(value) === index);
}

/** In-memory cache for assembled bad-words ids, keyed (banned_tokens, slug) like badWordsCache. */
const badWordsCache = new Map<string, number[][]>();

/** Test/maintenance hook: drop the (banned_tokens, slug) bad-words cache. */
export function clearNovelBadWordsCache(): void {
  badWordsCache.clear();
}

/** getBadWordIds (nai-settings.js:434-486) with the injected async encoder. */
export async function getNovelBadWordsIds(
  bannedTokens: string,
  slug: NovelTokenizerSlug,
  encode: NovelEncode,
): Promise<number[][]> {
  const cacheKey = `${slug} ${bannedTokens}`;
  const cached = badWordsCache.get(cacheKey);
  if (cached) return cached;

  const result: number[][] = [];
  const sequence = bannedTokens.split('\n');

  for (const token of sequence) {
    const trimmed = token.trim();

    // Skip empty lines
    if (trimmed.length === 0) {
      continue;
    }

    // Verbatim text
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      result.push(await encode(slug, trimmed.slice(1, -1)));
    } else if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      // Raw token ids, JSON serialized
      try {
        const tokens: unknown = JSON.parse(trimmed);
        if (Array.isArray(tokens) && tokens.every((t) => Number.isInteger(t))) {
          result.push(tokens as number[]);
        } else {
          throw new Error('Not an array of integers');
        }
      } catch {
        // skip malformed entries, like desktop
      }
    } else {
      // Apply permutations
      for (const permutation of getBadWordPermutations(trimmed)) {
        result.push(await encode(slug, permutation));
      }
    }
  }

  badWordsCache.set(cacheKey, result);
  return result;
}

/** Novel logit bias object (calculateLogitBias getBiasObject, nai-settings.js:696-703). */
export interface NovelLogitBias {
  bias: number;
  ensure_sequence_finish: boolean;
  generate_once: boolean;
  sequence: number[];
}

/** calculateLogitBias (nai-settings.js:682-707) + getLogitBiasListResult (logit-bias.js:104-142). */
export async function calculateNovelLogitBias(
  biasPreset: NaiLogitBiasEntry[],
  slug: NovelTokenizerSlug,
  encode: NovelEncode,
): Promise<NovelLogitBias[]> {
  const getBiasObject = (bias: number, sequence: number[]): NovelLogitBias => ({
    bias,
    ensure_sequence_finish: false,
    generate_once: false,
    sequence,
  });

  const result: NovelLogitBias[] = [];

  for (const entry of biasPreset) {
    if (typeof entry?.text === 'string' && entry.text.length > 0) {
      const text = entry.text.trim();

      // Skip empty lines
      if (text.length === 0) {
        continue;
      }

      const value = Number(entry.value);

      // Verbatim text
      if (text.startsWith('{') && text.endsWith('}')) {
        result.push(getBiasObject(value, await encode(slug, text.slice(1, -1))));
      } else if (text.startsWith('[') && text.endsWith(']')) {
        // Raw token ids, JSON serialized
        try {
          const tokens: unknown = JSON.parse(text);
          if (Array.isArray(tokens) && tokens.every((t) => Number.isInteger(t))) {
            result.push(getBiasObject(value, tokens as number[]));
          } else {
            throw new Error('Not an array of integers');
          }
        } catch {
          // skip malformed entries, like desktop
        }
      } else {
        // Text with a leading space
        result.push(getBiasObject(value, await encode(slug, ` ${text}`)));
      }
    }
  }

  return result;
}

export interface CreateNovelGenerationDataParams {
  /** The fully assembled text-completion prompt (BEFORE the erato start tokens). */
  prompt: string;
  /** Normalized live nai_settings. */
  nai: NaiSettings;
  /** The active preset (novelai_settings[novelai_setting_names[preset_settings_novel]]) - order fallback only. */
  preset?: Record<string, unknown> | undefined;
  /** Requested response length (amount_gen) - clamped to the model/tier maximum. */
  maxLength: number;
  /** Stopping strings (getStoppingStrings(isImpersonate, isContinue)) - erato expansion happens here. */
  stoppingStrings: string[];
  encode: NovelEncode;
  /** NovelAI subscription tier (from /api/novelai/status); undefined when unknown / no key. */
  tier?: number | undefined;
}

/**
 * getNovelGenerationData (nai-settings.js:515-607), byte-1:1 with desktop including JSON key
 * order and the Number()/undefined coercions (NaN serializes to null, undefined keys drop -
 * exactly what desktop's JSON.stringify sends). eos_token_id and `streaming` are NOT part of
 * the body: the server adds eos_token_id, the streaming flag is set by the transport caller.
 */
export async function createNovelGenerationData(
  params: CreateNovelGenerationDataParams,
): Promise<Record<string, unknown>> {
  const { nai, preset, encode } = params;
  let finalPrompt = params.prompt;

  const isKayra = nai.model_novel.includes('kayra');
  const isErato = nai.model_novel.includes('erato');

  const slug = getNovelTokenizerSlug(nai.model_novel);
  const stoppingStrings = [...params.stoppingStrings];

  // Llama 3 tokenizer, huh? (nai-settings.js:523-543: 12 punctuation prefixes per \n-string)
  if (isErato) {
    const additionalStopStrings: string[] = [];
    for (const stoppingString of stoppingStrings) {
      if (stoppingString.startsWith('\n')) {
        additionalStopStrings.push('.' + stoppingString);
        additionalStopStrings.push('!' + stoppingString);
        additionalStopStrings.push('?' + stoppingString);
        additionalStopStrings.push('*' + stoppingString);
        additionalStopStrings.push('"' + stoppingString);
        additionalStopStrings.push('_' + stoppingString);
        additionalStopStrings.push('...' + stoppingString);
        additionalStopStrings.push('."' + stoppingString);
        additionalStopStrings.push('?"' + stoppingString);
        additionalStopStrings.push('!"' + stoppingString);
        additionalStopStrings.push('.*' + stoppingString);
        additionalStopStrings.push(')' + stoppingString);
      }
    }
    stoppingStrings.push(...additionalStopStrings);
  }

  const stopSequences = slug
    ? await Promise.all(stoppingStrings.slice(0, MAX_STOP_SEQUENCES).map((t) => encode(slug, t)))
    : undefined;

  const badWordIds = slug ? await getNovelBadWordsIds(nai.banned_tokens, slug, encode) : undefined;

  // Prefix selection scans the prompt BEFORE the erato start tokens are prepended.
  const prefix = selectPrefix(nai.model_novel, nai.prefix, finalPrompt);

  let logitBias: NovelLogitBias[] = [];
  if (slug && Array.isArray(nai.logit_bias) && nai.logit_bias.length) {
    logitBias = await calculateNovelLogitBias(nai.logit_bias, slug, encode);
  }

  if (isErato) {
    finalPrompt = '<|startoftext|><|reserved_special_token81|>' + finalPrompt;
  }

  const adjustedMaxLength = isKayra || isErato ? getNovelMaxResponseTokens(params.tier) : MAXIMUM_OUTPUT_LENGTH;

  return {
    input: finalPrompt,
    model: nai.model_novel,
    use_string: true,
    temperature: Number(nai.temperature),
    max_length: params.maxLength < adjustedMaxLength ? params.maxLength : adjustedMaxLength,
    min_length: Number(nai.min_length),
    tail_free_sampling: Number(nai.tail_free_sampling),
    repetition_penalty: Number(nai.repetition_penalty),
    repetition_penalty_range: Number(nai.repetition_penalty_range),
    repetition_penalty_slope: Number(nai.repetition_penalty_slope),
    repetition_penalty_frequency: Number(nai.repetition_penalty_frequency),
    repetition_penalty_presence: Number(nai.repetition_penalty_presence),
    top_a: Number(nai.top_a),
    top_p: Number(nai.top_p),
    top_k: Number(nai.top_k),
    min_p: Number(nai.min_p),
    math1_temp: Number(nai.math1_temp),
    math1_quad: Number(nai.math1_quad),
    math1_quad_entropy_scale: Number(nai.math1_quad_entropy_scale),
    typical_p: Number(nai.typical_p),
    mirostat_lr: Number(nai.mirostat_lr),
    mirostat_tau: Number(nai.mirostat_tau),
    phrase_rep_pen: nai.phrase_rep_pen,
    stop_sequences: stopSequences,
    bad_words_ids: badWordIds,
    logit_bias_exp: logitBias,
    generate_until_sentence: true,
    use_cache: false,
    return_full_text: false,
    prefix,
    order: nai.order || (preset?.order as number[] | undefined) || NAI_DEFAULT_ORDER,
    // power_user.request_token_probabilities is not surfaced in the app - desktop sends
    // undefined in that case too (the key drops out of the JSON).
    num_logprobs: undefined,
  };
}
