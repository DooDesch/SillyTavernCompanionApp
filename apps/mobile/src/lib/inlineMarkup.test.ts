import { describe, expect, it } from 'vitest';
import { parseInline, type InlineSpan } from './inlineMarkup';

const texts = (spans: InlineSpan[]) => spans.map((s) => s.text);

describe('parseInline - user-reported cases', () => {
  it('parses italics inside double quotes', () => {
    expect(parseInline('"Sie laechelt *und nickt*"')).toEqual([
      { text: '"', quote: true },
      { text: 'Sie laechelt ', quote: true },
      { text: 'und nickt', quote: true, italic: true },
      { text: '"', quote: true },
    ]);
  });

  it('parses bold inside italics', () => {
    expect(parseInline('*she smiles **broadly** at you*')).toEqual([
      { text: 'she smiles ', italic: true },
      { text: 'broadly', italic: true, bold: true },
      { text: ' at you', italic: true },
    ]);
  });
});

describe('parseInline - emphasis', () => {
  it('parses triple asterisks as bold italic', () => {
    expect(parseInline('***wichtig***')).toEqual([{ text: 'wichtig', bold: true, italic: true }]);
  });

  it('parses bold containing a quote', () => {
    expect(parseInline('**Er ruft "Hallo!" laut**')).toEqual([
      { text: 'Er ruft ', bold: true },
      { text: '"', bold: true, quote: true },
      { text: 'Hallo!', bold: true, quote: true },
      { text: '"', bold: true, quote: true },
      { text: ' laut', bold: true },
    ]);
  });

  it('parses a quote containing bold', () => {
    expect(parseInline('"Er sagt **laut** hallo"')).toEqual([
      { text: '"', quote: true },
      { text: 'Er sagt ', quote: true },
      { text: 'laut', quote: true, bold: true },
      { text: ' hallo', quote: true },
      { text: '"', quote: true },
    ]);
  });

  it('parses trailing-nested emphasis (shared closing run)', () => {
    expect(parseInline('*she smiles **broadly***')).toEqual([
      { text: 'she smiles ', italic: true },
      { text: 'broadly', italic: true, bold: true },
    ]);
    expect(parseInline('**text *italic***')).toEqual([
      { text: 'text ', bold: true },
      { text: 'italic', bold: true, italic: true },
    ]);
  });

  it('handles punctuation-adjacent markers', () => {
    expect(parseInline('*wait*, dann **geh!**')).toEqual([
      { text: 'wait', italic: true },
      { text: ', dann ' },
      { text: 'geh!', bold: true },
    ]);
  });

  it('leaves space-padded asterisks literal (math)', () => {
    expect(parseInline('2 * 3 * 4 = 24')).toEqual([{ text: '2 * 3 * 4 = 24' }]);
    expect(parseInline('a * b * c')).toEqual([{ text: 'a * b * c' }]);
  });

  it('emphasis may cross newlines within a block', () => {
    expect(parseInline('*a\nb*')).toEqual([{ text: 'a\nb', italic: true }]);
  });
});

describe('parseInline - code', () => {
  it('keeps asterisks literal inside inline code', () => {
    expect(parseInline('`code *not italic*`')).toEqual([{ text: 'code *not italic*', code: true }]);
  });

  it('keeps quotes unstyled inside code, and parses code inside quotes', () => {
    expect(parseInline('`a "b" c`')).toEqual([{ text: 'a "b" c', code: true }]);
    expect(parseInline('"quote with `code` inside"')).toEqual([
      { text: '"', quote: true },
      { text: 'quote with ', quote: true },
      { text: 'code', quote: true, code: true },
      { text: ' inside', quote: true },
      { text: '"', quote: true },
    ]);
  });
});

describe('parseInline - quotes', () => {
  it('keeps separate quote groups separate', () => {
    expect(parseInline('Sie sagt "Hallo" und dann "Tschuess" leise')).toEqual([
      { text: 'Sie sagt ' },
      { text: '"', quote: true },
      { text: 'Hallo', quote: true },
      { text: '"', quote: true },
      { text: ' und dann ' },
      { text: '"', quote: true },
      { text: 'Tschuess', quote: true },
      { text: '"', quote: true },
      { text: ' leise' },
    ]);
  });

  it('styles typographic quotes and guillemets, keeps German low quotes literal (ST parity)', () => {
    expect(parseInline('“Typografisch”')).toEqual([
      { text: '“', quote: true },
      { text: 'Typografisch', quote: true },
      { text: '”', quote: true },
    ]);
    expect(parseInline('«Guillemets»')).toEqual([
      { text: '«', quote: true },
      { text: 'Guillemets', quote: true },
      { text: '»', quote: true },
    ]);
    expect(parseInline('„Tiefgestellt“')).toEqual([{ text: '„Tiefgestellt“' }]);
  });

  it('quotes never cross newlines (ST parity)', () => {
    expect(parseInline('"a\nb"')).toEqual([{ text: '"a\nb"' }]);
  });

  it('handles an empty quote pair without crashing', () => {
    expect(parseInline('""')).toEqual([
      { text: '"', quote: true },
      { text: '"', quote: true },
    ]);
  });
});

describe('parseInline - underscores and strikethrough', () => {
  it('parses _italic_ and __underline__', () => {
    expect(parseInline('_kursiv_ und __unterstrichen__')).toEqual([
      { text: 'kursiv', italic: true },
      { text: ' und ' },
      { text: 'unterstrichen', underline: true },
    ]);
  });

  it('keeps mid-word underscores literal (literalMidWordUnderscores)', () => {
    expect(parseInline('snake_case_name bleibt')).toEqual([{ text: 'snake_case_name bleibt' }]);
  });

  it('parses ~~strikethrough~~', () => {
    expect(parseInline('~~weg~~ damit')).toEqual([{ text: 'weg', strike: true }, { text: ' damit' }]);
  });
});

describe('parseInline - graceful degradation', () => {
  it('renders unbalanced markers literally, dropping nothing', () => {
    expect(parseInline('*unbalanced')).toEqual([{ text: '*unbalanced' }]);
    expect(parseInline('**unbalanced bold')).toEqual([{ text: '**unbalanced bold' }]);
    expect(parseInline('"unclosed quote')).toEqual([{ text: '"unclosed quote' }]);
  });

  it('degrades pathological mixes without losing text', () => {
    // Documented divergence from showdown: bold wins the first pair, the tail stays literal.
    expect(parseInline('***bold** rest*')).toEqual([{ text: '*bold', bold: true }, { text: ' rest*' }]);
  });

  it('mixed German RP line', () => {
    expect(parseInline('"Na gut," *sie seufzt* "du hast **recht**."')).toEqual([
      { text: '"', quote: true },
      { text: 'Na gut,', quote: true },
      { text: '"', quote: true },
      { text: ' ' },
      { text: 'sie seufzt', italic: true },
      { text: ' ' },
      { text: '"', quote: true },
      { text: 'du hast ', quote: true },
      { text: 'recht', quote: true, bold: true },
      { text: '.', quote: true },
      { text: '"', quote: true },
    ]);
  });

  it('survives a recursion depth bomb and never returns empty for non-empty input', () => {
    const bomb = '*"'.repeat(40) + 'x' + '"*'.repeat(40);
    const spans = parseInline(bomb);
    expect(spans.length).toBeGreaterThan(0);
    expect(spans.map((s) => s.text).join('').length).toBeGreaterThan(0);
  });

  it('hits MAX_DEPTH on genuinely nested distinct pairs and degrades to literal text', () => {
    // 10 syntactically nested levels (> MAX_DEPTH 8): the innermost levels must come
    // back literally instead of overflowing the stack, and no text may be dropped.
    const open = '*_~~**"«「『“';
    const close = '”』」»"**~~_*';
    const spans = parseInline(`${open}x${close}`);
    expect(spans.length).toBeGreaterThan(0);
    const joined = spans.map((s) => s.text).join('');
    expect(joined).toContain('x');
  });

  it('marker soup invariant: never throws, never drops all text', () => {
    const soups = ['***', '**a*', '*a**', '"*"', '*"*', '`*`"`', '~~*~_"', 'a*b**c***d', '_*"`~'];
    for (const s of soups) {
      const spans = parseInline(s);
      expect(Array.isArray(spans)).toBe(true);
      expect(texts(spans).join('').length).toBeGreaterThan(0);
    }
  });
});
