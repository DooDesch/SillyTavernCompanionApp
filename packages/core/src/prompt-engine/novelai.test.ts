import { beforeEach, describe, expect, it } from 'vitest';
import {
  adjustNovelInstructionPrompt,
  clearNovelBadWordsCache,
  createNovelGenerationData,
  getBadWordPermutations,
  getKayraMaxContextTokens,
  getNovelMaxContext,
  getNovelMaxResponseTokens,
  getNovelTierName,
  getNovelTokenizerSlug,
  normalizeNaiSettings,
  selectPrefix,
  NAI_DEFAULT_ORDER,
  NAI_DEFAULT_PREAMBLE,
  type NaiSettings,
  type NovelEncode,
  type NovelTokenizerSlug,
} from './novelai';

// Deterministic fake encoder: [slug marker, ...codepoints]. The NOVEL secret is not available
// in CI, so all body assertions are fixture-based byte-parity checks against desktop
// getNovelGenerationData (public/scripts/nai-settings.js:515-607).
const SLUG_NUM: Record<NovelTokenizerSlug, number> = { nerdstash: 1, nerdstash_v2: 2, llama3: 3 };
const ids = (slug: NovelTokenizerSlug, text: string): number[] => [
  SLUG_NUM[slug],
  ...Array.from(text, (c) => c.codePointAt(0)!),
];

function makeEncoder(): { encode: NovelEncode; calls: string[] } {
  const calls: string[] = [];
  const encode: NovelEncode = (slug, text) => {
    calls.push(`${slug}:${text}`);
    return Promise.resolve(ids(slug, text));
  };
  return { encode, calls };
}

/** Desktop default nai_settings (nai-settings.js:36-62) + the usual persisted extras. */
const clioSettings: NaiSettings = {
  temperature: 1.5,
  repetition_penalty: 2.25,
  repetition_penalty_range: 2048,
  repetition_penalty_slope: 0.09,
  repetition_penalty_frequency: 0,
  repetition_penalty_presence: 0.005,
  tail_free_sampling: 0.975,
  top_k: 10,
  top_p: 0.75,
  top_a: 0.08,
  typical_p: 0.975,
  min_p: 0,
  math1_temp: 1,
  math1_quad: 0,
  math1_quad_entropy_scale: 0,
  min_length: 1,
  model_novel: 'clio-v1',
  preset_settings_novel: 'Talker-Chat-Clio',
  streaming_novel: false,
  preamble: NAI_DEFAULT_PREAMBLE,
  prefix: 'vanilla',
  banned_tokens: '',
  order: [1, 5, 0, 2, 3, 4],
  logit_bias: [],
  extensions: {},
  phrase_rep_pen: 'off',
  mirostat_lr: 1,
  mirostat_tau: 0,
};

const stops = ['\nDennis:', '\nSeraphina:'];

beforeEach(() => clearNovelBadWordsCache());

describe('createNovelGenerationData - byte parity', () => {
  it('clio body matches the desktop body byte-for-byte (incl. key order)', async () => {
    const { encode } = makeEncoder();
    const body = await createNovelGenerationData({
      prompt: 'Hello world',
      nai: clioSettings,
      maxLength: 512,
      stoppingStrings: stops,
      encode,
    });

    const expected = {
      input: 'Hello world',
      model: 'clio-v1',
      use_string: true,
      temperature: 1.5,
      max_length: 150, // clio is hard-capped at maximum_output_length
      min_length: 1,
      tail_free_sampling: 0.975,
      repetition_penalty: 2.25,
      repetition_penalty_range: 2048,
      repetition_penalty_slope: 0.09,
      repetition_penalty_frequency: 0,
      repetition_penalty_presence: 0.005,
      top_a: 0.08,
      top_p: 0.75,
      top_k: 10,
      min_p: 0,
      math1_temp: 1,
      math1_quad: 0,
      math1_quad_entropy_scale: 0,
      typical_p: 0.975,
      mirostat_lr: 1,
      mirostat_tau: 0,
      phrase_rep_pen: 'off',
      stop_sequences: [ids('nerdstash', '\nDennis:'), ids('nerdstash', '\nSeraphina:')],
      bad_words_ids: [],
      logit_bias_exp: [],
      generate_until_sentence: true,
      use_cache: false,
      return_full_text: false,
      prefix: 'vanilla',
      order: [1, 5, 0, 2, 3, 4],
    };
    expect(JSON.stringify(body)).toBe(JSON.stringify(expected));
  });

  it('kayra body uses nerdstash_v2 and the tier-3 response cap', async () => {
    const { encode } = makeEncoder();
    const body = await createNovelGenerationData({
      prompt: 'P',
      nai: { ...clioSettings, model_novel: 'kayra-v1' },
      maxLength: 512,
      stoppingStrings: ['\nDennis:'],
      encode,
      tier: 3,
    });
    expect(body.model).toBe('kayra-v1');
    expect(body.max_length).toBe(250);
    expect(body.stop_sequences).toEqual([ids('nerdstash_v2', '\nDennis:')]);
  });

  it('serializes missing mirostat values to null exactly like desktop (Number(undefined) -> NaN)', async () => {
    const { encode } = makeEncoder();
    const { mirostat_lr: _lr, mirostat_tau: _tau, ...rest } = clioSettings;
    const body = await createNovelGenerationData({
      prompt: 'P',
      nai: rest as NaiSettings,
      maxLength: 100,
      stoppingStrings: [],
      encode,
    });
    const json = JSON.stringify(body);
    expect(json).toContain('"mirostat_lr":null');
    expect(json).toContain('"mirostat_tau":null');
    // num_logprobs is undefined -> dropped from the JSON, same as desktop.
    expect(json).not.toContain('num_logprobs');
  });

  it('eos_token_id and streaming are never part of the client body (server-side additions)', async () => {
    const { encode } = makeEncoder();
    const body = await createNovelGenerationData({
      prompt: '> look',
      nai: { ...clioSettings, prefix: 'theme_textadventure' },
      maxLength: 100,
      stoppingStrings: [],
      encode,
    });
    expect('eos_token_id' in body).toBe(false);
    expect('streaming' in body).toBe(false);
  });
});

describe('createNovelGenerationData - erato', () => {
  it('expands every \\n-stopping-string with the exact 12 punctuation prefixes, in order', async () => {
    const { encode, calls } = makeEncoder();
    await createNovelGenerationData({
      prompt: 'P',
      nai: { ...clioSettings, model_novel: 'llama-3-erato-v1' },
      maxLength: 100,
      stoppingStrings: ['\nDennis:', 'no-newline'],
      encode,
    });
    const stopCalls = calls.map((c) => c.replace(/^llama3:/, ''));
    expect(stopCalls).toEqual([
      '\nDennis:',
      'no-newline',
      '.\nDennis:',
      '!\nDennis:',
      '?\nDennis:',
      '*\nDennis:',
      '"\nDennis:',
      '_\nDennis:',
      '...\nDennis:',
      '."\nDennis:',
      '?"\nDennis:',
      '!"\nDennis:',
      '.*\nDennis:',
      ')\nDennis:',
    ]);
  });

  it('prepends the erato start tokens AFTER prefix selection scanned the raw prompt', async () => {
    const { encode } = makeEncoder();
    const body = await createNovelGenerationData({
      prompt: 'Tale',
      nai: { ...clioSettings, model_novel: 'llama-3-erato-v1' },
      maxLength: 100,
      stoppingStrings: [],
      encode,
    });
    expect(body.input).toBe('<|startoftext|><|reserved_special_token81|>Tale');
    expect(body.prefix).toBe('vanilla');
  });

  it('clamps erato max_length by tier (unknown tier -> 150, Opus -> 250, smaller request wins)', async () => {
    const { encode } = makeEncoder();
    const mk = (maxLength: number, tier?: number) =>
      createNovelGenerationData({
        prompt: 'P',
        nai: { ...clioSettings, model_novel: 'llama-3-erato-v1' },
        maxLength,
        stoppingStrings: [],
        encode,
        tier,
      });
    expect((await mk(512)).max_length).toBe(150);
    expect((await mk(512, 1)).max_length).toBe(150);
    expect((await mk(512, 3)).max_length).toBe(250);
    expect((await mk(80, 3)).max_length).toBe(80);
  });
});

describe('prefix selection', () => {
  it('switches to special_instruct when an instruct bracket is within the last 1500 chars', async () => {
    const { encode } = makeEncoder();
    const instruction = adjustNovelInstructionPrompt('Write a [poem]');
    expect(instruction).toBe('{ Write a poem }');
    const body = await createNovelGenerationData({
      prompt: `Story so far.\n${instruction}\n`,
      nai: clioSettings,
      maxLength: 100,
      stoppingStrings: [],
      encode,
    });
    expect(body.prefix).toBe('special_instruct');
  });

  it('keeps the selected prefix when the bracket is older than 1500 chars', () => {
    const prompt = '{ old instruction }' + 'x'.repeat(1500);
    expect(selectPrefix('clio-v1', 'vanilla', prompt)).toBe('vanilla');
  });

  it('returns vanilla for legacy models regardless of content', () => {
    expect(selectPrefix('krake-v2', 'theme_textadventure', '{ hi }')).toBe('vanilla');
  });

  it('keeps an already-instruct prompt unchanged in adjustNovelInstructionPrompt', () => {
    expect(adjustNovelInstructionPrompt('{ already wrapped }')).toBe('{ already wrapped }');
  });
});

describe('bad words', () => {
  it('generates the 10 case/space permutations, de-duplicated', () => {
    expect(getBadWordPermutations('aB')).toEqual(['aB', ' aB', 'AB', ' AB', 'ab', ' ab']);
    expect(getBadWordPermutations('Tea')).toEqual(['Tea', ' Tea', 'tea', ' tea', 'TEA', ' TEA']);
  });

  it('assembles permutations, verbatim {…} and raw [..] lines; skips blanks and bad JSON', async () => {
    const { encode } = makeEncoder();
    const body = await createNovelGenerationData({
      prompt: 'P',
      nai: { ...clioSettings, banned_tokens: 'rat\n\n{verbatim}\n[7, 9]\n[oops]' },
      maxLength: 100,
      stoppingStrings: [],
      encode,
    });
    expect(body.bad_words_ids).toEqual([
      ...['rat', ' rat', 'Rat', ' Rat', 'RAT', ' RAT'].map((t) => ids('nerdstash', t)),
      ids('nerdstash', 'verbatim'),
      [7, 9],
    ]);
  });

  it('caches the assembled ids per (banned_tokens, slug) - the same input encodes once', async () => {
    const { encode, calls } = makeEncoder();
    const params = {
      prompt: 'P',
      nai: { ...clioSettings, banned_tokens: 'rat' },
      maxLength: 100,
      stoppingStrings: [],
      encode,
    };
    await createNovelGenerationData(params);
    const afterFirst = calls.length;
    expect(afterFirst).toBe(6);
    await createNovelGenerationData(params);
    expect(calls.length).toBe(afterFirst); // cache hit - no re-encode

    // A different tokenizer slug is a different cache entry.
    await createNovelGenerationData({
      ...params,
      nai: { ...params.nai, model_novel: 'kayra-v1' },
    });
    expect(calls.length).toBe(afterFirst + 6);
  });
});

describe('logit bias', () => {
  it('builds {bias, ensure_sequence_finish, generate_once, sequence} objects like desktop', async () => {
    const { encode } = makeEncoder();
    const body = await createNovelGenerationData({
      prompt: 'P',
      nai: {
        ...clioSettings,
        logit_bias: [
          { id: '1', text: 'bad', value: -2 },
          { id: '2', text: '[5, 6]', value: 3 },
          { id: '3', text: '{verbatim}', value: 1 },
          { id: '4', text: '', value: 9 },
        ],
      },
      maxLength: 100,
      stoppingStrings: [],
      encode,
    });
    expect(body.logit_bias_exp).toEqual([
      // Plain text is encoded with a leading space (logit-bias.js:135).
      { bias: -2, ensure_sequence_finish: false, generate_once: false, sequence: ids('nerdstash', ' bad') },
      { bias: 3, ensure_sequence_finish: false, generate_once: false, sequence: [5, 6] },
      { bias: 1, ensure_sequence_finish: false, generate_once: false, sequence: ids('nerdstash', 'verbatim') },
    ]);
  });
});

describe('order fallback (nai.order || default; the desktop preset fallback is dead code)', () => {
  const mk = (order: number[] | undefined) => {
    const { encode } = makeEncoder();
    const nai = { ...clioSettings } as NaiSettings;
    if (order === undefined) delete nai.order;
    else nai.order = order;
    return createNovelGenerationData({
      prompt: 'P',
      nai,
      maxLength: 100,
      stoppingStrings: [],
      encode,
    });
  };

  it('prefers the live nai order', async () => {
    expect((await mk([2, 3])).order).toEqual([2, 3]);
  });
  it('falls back to the default order (loadNovelSettings backfill, nai-settings.js:259)', async () => {
    expect((await mk(undefined)).order).toEqual(NAI_DEFAULT_ORDER);
    expect((await mk(undefined)).order).toEqual([1, 5, 0, 2, 3, 4]);
  });
});

describe('getNovelMaxContext (script.js:5874-5896)', () => {
  const nai = (model: string): NaiSettings => ({ ...clioSettings, model_novel: model });

  it('clamps clio to 8192', () => {
    expect(getNovelMaxContext(nai('clio-v1'), 20000)).toBe(8192);
    expect(getNovelMaxContext(nai('clio-v1'), 4096)).toBe(4096);
  });

  it('clamps kayra to 8192 and additionally to the subscription tier', () => {
    expect(getNovelMaxContext(nai('kayra-v1'), 20000)).toBe(8192); // unknown tier: no extra clamp
    expect(getNovelMaxContext(nai('kayra-v1'), 20000, 1)).toBe(4096); // Tablet
    expect(getNovelMaxContext(nai('kayra-v1'), 20000, 2)).toBe(8192); // Scroll
    expect(getNovelMaxContext(nai('kayra-v1'), 20000, 3)).toBe(8192); // Opus
    expect(getNovelMaxContext(nai('kayra-v1'), 2048, 1)).toBe(2048); // below the limit stays
  });

  it('clamps erato to 8192 minus 10 special tokens', () => {
    expect(getNovelMaxContext(nai('llama-3-erato-v1'), 20000)).toBe(8182);
    expect(getNovelMaxContext(nai('llama-3-erato-v1'), 4096)).toBe(4086);
  });

  it('leaves unknown/legacy models unclamped', () => {
    expect(getNovelMaxContext(nai('krake-v2'), 20000)).toBe(20000);
  });

  it('getKayraMaxContextTokens mirrors the desktop tier table', () => {
    expect(getKayraMaxContextTokens(1)).toBe(4096);
    expect(getKayraMaxContextTokens(2)).toBe(8192);
    expect(getKayraMaxContextTokens(3)).toBe(8192);
    expect(getKayraMaxContextTokens(0)).toBeNull();
    expect(getKayraMaxContextTokens(undefined)).toBeNull();
  });

  it('getNovelMaxResponseTokens mirrors the desktop tier table', () => {
    expect(getNovelMaxResponseTokens(1)).toBe(150);
    expect(getNovelMaxResponseTokens(2)).toBe(150);
    expect(getNovelMaxResponseTokens(3)).toBe(250);
    expect(getNovelMaxResponseTokens(undefined)).toBe(150);
  });
});

describe('helpers', () => {
  it('maps models to tokenizer slugs (clio=nerdstash, kayra=nerdstash_v2, erato=llama3)', () => {
    expect(getNovelTokenizerSlug('clio-v1')).toBe('nerdstash');
    expect(getNovelTokenizerSlug('kayra-v1')).toBe('nerdstash_v2');
    expect(getNovelTokenizerSlug('llama-3-erato-v1')).toBe('llama3');
    expect(getNovelTokenizerSlug('krake-v2')).toBeNull();
  });

  it('maps tier ids to display names', () => {
    expect(getNovelTierName(0)).toBe('Paper');
    expect(getNovelTierName(1)).toBe('Tablet');
    expect(getNovelTierName(2)).toBe('Scroll');
    expect(getNovelTierName(3)).toBe('Opus');
    expect(getNovelTierName(undefined)).toBe('no_connection');
  });

  it('normalizeNaiSettings applies exactly the loadNovelSettings || fallbacks', () => {
    const nai = normalizeNaiSettings({ model_novel: 'kayra-v1', streaming_novel: 1 });
    expect(nai.preamble).toBe(NAI_DEFAULT_PREAMBLE);
    expect(nai.banned_tokens).toBe('');
    expect(nai.logit_bias).toEqual([]);
    expect(nai.streaming_novel).toBe(true);
    expect(nai.min_p).toBe(0);
    expect(nai.math1_temp).toBe(1);
    expect(nai.math1_quad).toBe(0);
    expect(nai.math1_quad_entropy_scale).toBe(0);
    // order is left undefined so the preset fallback chain stays live.
    expect(nai.order).toBeUndefined();
  });
});
