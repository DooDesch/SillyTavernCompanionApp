import { describe, expect, it } from 'vitest';
import { parseKoboldData, parseTokenFrame } from './kobold';

describe('parseKoboldData', () => {
  it('extracts the token from a {token} frame', () => {
    expect(parseKoboldData('{"token":"Hel"}')).toEqual({ text: 'Hel' });
    expect(parseKoboldData('{"token":" world"}')).toEqual({ text: ' world' });
  });

  it('returns empty text when the token field is missing or not a string', () => {
    expect(parseKoboldData('{}')).toEqual({ text: '' });
    expect(parseKoboldData('{"token":42}')).toEqual({ text: '' });
  });

  it('returns null for non-JSON frames (no [DONE] sentinel exists for kobold)', () => {
    expect(parseKoboldData('[DONE]')).toBeNull();
    expect(parseKoboldData('not json')).toBeNull();
    expect(parseKoboldData('"just a string"')).toBeNull();
  });

  it('shares the implementation with the NovelAI-shaped parseTokenFrame', () => {
    expect(parseKoboldData).toBe(parseTokenFrame);
  });
});
