import { describe, expect, it } from 'vitest';
import { createTextgenBody, parseBannedTokens, type TextgenSettings } from './textgenBody';

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
