import { describe, expect, it } from 'vitest';
import { parseNovelData } from './novelai';

describe('parseNovelData', () => {
  it('extracts the incremental token text from a {token} frame', () => {
    expect(parseNovelData('{"token":"He"}')).toEqual({ text: 'He', done: false });
    expect(parseNovelData('{"token":" world","final":false}')).toEqual({ text: ' world', done: false });
  });

  it('treats frames without a token as empty increments (e.g. logprobs-only)', () => {
    expect(parseNovelData('{"logprobs":{}}')).toEqual({ text: '', done: false });
  });

  it('accumulates like the desktop streamData loop (nai-settings.js:758-772)', () => {
    const frames = ['{"token":"Hel"}', '{"token":"lo"}', '{"token":"!"}'];
    let text = '';
    for (const f of frames) {
      const delta = parseNovelData(f);
      if (delta && !delta.done) text += delta.text;
    }
    expect(text).toBe('Hello!');
  });

  it('returns null for non-JSON payloads', () => {
    expect(parseNovelData('not json')).toBeNull();
    expect(parseNovelData('42')).toBeNull();
  });

  it('handles a [DONE] sentinel defensively', () => {
    expect(parseNovelData('[DONE]')).toEqual({ text: '', done: true });
  });
});
