import { describe, expect, it } from 'vitest';
import { isExternalUrl, splitImages } from './markdownImages';

describe('splitImages', () => {
  it('returns a line without images as one text part', () => {
    expect(splitImages('she smiles')).toEqual([{ kind: 'text', text: 'she smiles' }]);
  });

  it('finds an image on its own line', () => {
    expect(splitImages('![L](https://files.catbox.moe/bo16nj.jpg)')).toEqual([
      { kind: 'image', url: 'https://files.catbox.moe/bo16nj.jpg', alt: 'L' },
    ]);
  });

  it('keeps the text around an inline image, with title and angle brackets', () => {
    expect(splitImages('before ![a b](<https://x.test/i.png> "title") after')).toEqual([
      { kind: 'text', text: 'before ' },
      { kind: 'image', url: 'https://x.test/i.png', alt: 'a b' },
      { kind: 'text', text: ' after' },
    ]);
  });

  it('leaves a link without the bang as text', () => {
    expect(splitImages('[L](https://x.test)')).toEqual([{ kind: 'text', text: '[L](https://x.test)' }]);
  });
});

describe('isExternalUrl', () => {
  it('matches absolute and protocol-relative URLs only', () => {
    expect(isExternalUrl('https://x.test/a.png')).toBe(true);
    expect(isExternalUrl('//x.test/a.png')).toBe(true);
    expect(isExternalUrl('/user/images/a.png')).toBe(false);
  });
});
