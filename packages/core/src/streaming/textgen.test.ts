import { describe, expect, it } from 'vitest';
import { parseTextgenData } from './textgen';

describe('parseTextgenData', () => {
  it('extracts choices[0].text', () => {
    expect(parseTextgenData('{"choices":[{"text":"hello"}]}')).toEqual({
      text: 'hello',
      index: 0,
      done: false,
    });
  });

  it('falls back to top-level content (llama.cpp style)', () => {
    expect(parseTextgenData('{"content":" world"}')).toEqual({
      text: ' world',
      index: 0,
      done: false,
    });
  });

  it('captures thinking and swipe index', () => {
    expect(parseTextgenData('{"choices":[{"text":"x","thinking":"hmm","index":2}]}')).toEqual({
      text: 'x',
      thinking: 'hmm',
      index: 2,
      done: false,
    });
  });

  it('recognizes the [DONE] sentinel', () => {
    expect(parseTextgenData('[DONE]')).toEqual({ text: '', index: 0, done: true });
  });

  it('returns null on malformed JSON', () => {
    expect(parseTextgenData('{not json')).toBeNull();
  });
});
