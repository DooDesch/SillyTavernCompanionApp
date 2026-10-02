import { describe, expect, it } from 'vitest';
import { createTextgenBody, getTextgenModel, parseBannedTokens, type TextgenSettings } from './textgenBody';

const base: TextgenSettings = { type: 'koboldcpp', temp: 1 };
const opts = { prompt: 'p', maxTokens: 100, maxContext: 4096, stoppingStrings: [], stream: false };

describe('parseBannedTokens (ST getCustomTokenBans port)', () => {
  it('returns nothing when send_banned_tokens is off or list empty', () => {
    expect(parseBannedTokens({ ...base, banned_tokens: '"x"' })).toEqual({});
    expect(parseBannedTokens({ ...base, send_banned_tokens: true })).toEqual({});
  });

  it('splits quoted lines into banned_strings and id arrays into custom_token_bans', () => {
    const r = parseBannedTokens({
      ...base,
      send_banned_tokens: true,
      banned_tokens: '"shivers down"\n[1, 2, 3]\n"spine"\n[3, 4]',
    });
    expect(r.banned_strings).toEqual(['shivers down', 'spine']);
    expect(r.custom_token_bans).toBe('1,2,3,4'); // de-duped like ST
  });

  it('treats bare text lines as banned strings (no client tokenizer - documented deviation)', () => {
    const r = parseBannedTokens({ ...base, send_banned_tokens: true, banned_tokens: 'ministrations' });
    expect(r.banned_strings).toEqual(['ministrations']);
    expect(r.custom_token_bans).toBeUndefined();
  });

  it('keeps malformed id arrays as strings instead of crashing', () => {
    const r = parseBannedTokens({ ...base, send_banned_tokens: true, banned_tokens: '[1, "x"]\n[broken' });
    expect(r.banned_strings).toEqual(['[1, "x"]', '[broken']);
  });
});

describe('createTextgenBody new field pass-throughs', () => {
  it('includes the selected Ollama model', () => {
    const body = createTextgenBody(
      { ...base, type: 'ollama', ollama_model: 'dolphin3:8b' },
      opts,
    );

    expect(body.model).toBe('dolphin3:8b');
  });

  it('sends temperature_last and no_repeat_ngram_size when set', () => {
    const body = createTextgenBody({ ...base, temperature_last: true, no_repeat_ngram_size: 3 }, opts);
    expect(body.temperature_last).toBe(true);
    expect(body.no_repeat_ngram_size).toBe(3);
  });

  it('omits them when unset (payload parity with ST)', () => {
    const body = createTextgenBody(base, opts);
    expect('temperature_last' in body).toBe(false);
    expect('no_repeat_ngram_size' in body).toBe(false);
    expect('banned_strings' in body).toBe(false);
    expect('custom_token_bans' in body).toBe(false);
  });

  it('includes banned tokens in the request body when enabled', () => {
    const body = createTextgenBody(
      { ...base, send_banned_tokens: true, banned_tokens: '"foo"\n[7]' },
      opts,
    );
    expect(body.banned_strings).toEqual(['foo']);
    expect(body.custom_token_bans).toBe('7');
  });
});

describe('getTextgenModel (ST getTextGenModel port)', () => {
  it.each([
    ['ooba', 'custom_model'],
    ['generic', 'generic_model'],
    ['mancer', 'mancer_model'],
    ['togetherai', 'togetherai_model'],
    ['infermaticai', 'infermaticai_model'],
    ['dreamgen', 'dreamgen_model'],
    ['openrouter', 'openrouter_model'],
    ['vllm', 'vllm_model'],
    ['aphrodite', 'aphrodite_model'],
    ['ollama', 'ollama_model'],
    ['featherless', 'featherless_model'],
    ['tabby', 'tabby_model'],
    ['llamacpp', 'llamacpp_model'],
  ])('reads the %s model from %s', (type, field) => {
    const settings: TextgenSettings = {
      ...base,
      type,
      custom_model: 'other',
      ollama_model: 'other',
      [field]: 'picked-model',
    };
    expect(getTextgenModel(settings)).toBe('picked-model');
    expect(createTextgenBody(settings, opts).model).toBe('picked-model');
  });

  it('sends the fixed model name for huggingface', () => {
    expect(getTextgenModel({ ...base, type: 'huggingface' })).toBe('tgi');
  });

  it('sends no model for koboldcpp, even when other model fields are set', () => {
    const body = createTextgenBody({ ...base, ollama_model: 'a', custom_model: 'b' }, opts);
    expect('model' in body).toBe(false);
  });

  it('sends no model when the selection is empty', () => {
    const body = createTextgenBody({ ...base, type: 'ollama', ollama_model: '' }, opts);
    expect('model' in body).toBe(false);
  });
});

describe('createTextgenBody llama.cpp aliases', () => {
  const sampled: TextgenSettings = { ...base, rep_pen: 1.1, rep_pen_range: 512, ban_eos_token: true };

  it('sends context size, response length and repetition settings under the names Ollama reads', () => {
    const body = createTextgenBody({ ...sampled, type: 'ollama', ollama_model: 'm' }, opts);
    expect(body.num_ctx).toBe(4096);
    expect(body.num_predict).toBe(100);
    expect(body.n_predict).toBe(100);
    expect(body.repeat_penalty).toBe(1.1);
    expect(body.repeat_last_n).toBe(512);
    expect(body.ignore_eos).toBe(true);
  });

  it('keeps num_ctx equal to truncation_length', () => {
    const body = createTextgenBody(sampled, { ...opts, maxContext: 2048 });
    expect(body.num_ctx).toBe(2048);
    expect(body.truncation_length).toBe(2048);
  });

  it.each(['vllm', 'infermaticai', 'aphrodite'])('leaves the aliases out for %s', (type) => {
    const body = createTextgenBody({ ...sampled, type }, opts);
    for (const key of ['num_ctx', 'num_predict', 'n_predict', 'repeat_penalty', 'repeat_last_n', 'ignore_eos']) {
      expect(key in body).toBe(false);
    }
  });
});
