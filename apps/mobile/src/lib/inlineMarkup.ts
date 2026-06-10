/**
 * Inline RP-markup parser (SillyTavern parity, Hermes-safe, no RN imports).
 *
 * Desktop ST wraps "quoted speech" in <q> BEFORE running showdown, so markdown inside
 * quotes is still parsed; showdown applies *** then ** then * in sequential passes, which
 * makes nesting work. This recursive-descent parser reproduces both behaviors and returns
 * FLAT leaf spans with composed style flags, ready for <Text> mapping.
 *
 * Unbalanced or whitespace-adjacent markers degrade to literal text - nothing is ever
 * dropped and parsing never throws.
 */

export interface InlineSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  code?: boolean;
  quote?: boolean;
}

type Flags = Omit<InlineSpan, 'text'>;

// Quote pairs styled by desktop ST (script.js quote wrapping). German low quotes are
// deliberately absent - desktop does not style them either.
const QUOTE_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['"', '"'],
  ['“', '”'], // curly double quotes
  ['«', '»'], // guillemets
  ['「', '」'], // CJK corner brackets
  ['『', '』'], // CJK white corner brackets
  ['＂', '＂'], // fullwidth quotation mark
];

// Anchored emphasis matchers replicating showdown semantics: content starts/ends with
// non-whitespace; the single-star closer must not be part of a '**' pair, so inner bold
// survives for the recursive pass. Emphasis may cross newlines within a block.
const TRIPLE_STAR = /^\*\*\*(?=\S)([\s\S]*?\S)\*\*\*/;
const DOUBLE_STAR = /^\*\*(?=\S)([\s\S]*?\S)\*\*/;
const SINGLE_STAR = /^\*(?=[^\s*])([\s\S]*?[^\s*])\*(?!\*)/;
// Shared-run fallbacks for trailing-nested emphasis where the inner marker's closer
// merges with the outer one ('**a *b***' / '*a **b***'): the content itself ends on the
// inner marker and is resolved by the recursive pass.
const DOUBLE_STAR_SHARED = /^\*\*(?=\S)([\s\S]*?\*)\*\*(?!\*)/;
const SINGLE_STAR_SHARED = /^\*(?=[^\s*])([\s\S]*?\*\*)\*(?!\*)/;
const DOUBLE_UNDER = /^__(?=\S)([\s\S]*?\S)__(?!_)/; // ST underline:true -> <u>
const SINGLE_UNDER = /^_(?=[^\s_])([\s\S]*?[^\s_])_(?![\w_])/; // ST showdown-underscore ext -> <em>
const STRIKE = /^~~(?=\S)([\s\S]*?\S)~~/; // ST strikethrough -> <del>

// Hard recursion cap: beyond this, render literally (never crash on marker soup).
const MAX_DEPTH = 8;

function tryEmphasis(rest: string, re: RegExp): { content: string; length: number } | null {
  const m = re.exec(rest);
  return m ? { content: m[1]!, length: m[0].length } : null;
}

export function parseInline(text: string, flags: Flags = {}, depth = 0): InlineSpan[] {
  if (depth > MAX_DEPTH) return text ? [{ text, ...flags }] : [];
  const out: InlineSpan[] = [];
  let plain = '';
  const flush = () => {
    if (plain) {
      out.push({ text: plain, ...flags });
      plain = '';
    }
  };
  const recurse = (content: string, add: Flags) => {
    flush();
    out.push(...parseInline(content, { ...flags, ...add }, depth + 1));
  };
  let i = 0;
  while (i < text.length) {
    const ch = text[i]!;
    // 1) Inline code: atomic, highest precedence (desktop excludes code before quote-wrap).
    if (ch === '`') {
      const end = text.indexOf('`', i + 1);
      if (end > i + 1) {
        flush();
        out.push({ text: text.slice(i + 1, end), ...flags, code: true });
        i = end + 1;
        continue;
      }
    }
    // 2) Quoted speech: children ARE parsed (desktop wraps <q> before markdown). Quotes
    //    never cross newlines (desktop regex has no s-flag); the close is lazy.
    const pair = QUOTE_PAIRS.find((p) => p[0] === ch);
    if (pair) {
      const nl = text.indexOf('\n', i + 1);
      const end = text.indexOf(pair[1], i + 1);
      if (end !== -1 && (nl === -1 || end < nl)) {
        flush();
        const inner: Flags = { ...flags, quote: true };
        out.push({ text: pair[0], ...inner }); // keep the visible quote marks, like <q>"..."</q>
        out.push(...parseInline(text.slice(i + 1, end), inner, depth + 1));
        out.push({ text: pair[1], ...inner });
        i = end + 1;
        continue;
      }
    }
    // 3) Asterisk emphasis: longest marker first (showdown pass order *** > ** > *).
    if (ch === '*') {
      const rest = text.slice(i);
      const m3 = tryEmphasis(rest, TRIPLE_STAR);
      if (m3) {
        recurse(m3.content, { bold: true, italic: true });
        i += m3.length;
        continue;
      }
      const m2s = tryEmphasis(rest, DOUBLE_STAR_SHARED);
      if (m2s) {
        recurse(m2s.content, { bold: true });
        i += m2s.length;
        continue;
      }
      const m2 = tryEmphasis(rest, DOUBLE_STAR);
      if (m2) {
        recurse(m2.content, { bold: true });
        i += m2.length;
        continue;
      }
      const m1 = tryEmphasis(rest, SINGLE_STAR);
      if (m1) {
        recurse(m1.content, { italic: true });
        i += m1.length;
        continue;
      }
      const m1s = tryEmphasis(rest, SINGLE_STAR_SHARED);
      if (m1s) {
        recurse(m1s.content, { italic: true });
        i += m1s.length;
        continue;
      }
    }
    // 4) Underscores (ST parity): __x__ underline; _x_ italic; both word-bounded
    //    (literalMidWordUnderscores - snake_case stays literal).
    if (ch === '_') {
      const boundaryOk = i === 0 || !/[\w_]/.test(text[i - 1]!);
      if (boundaryOk) {
        const rest = text.slice(i);
        const mu = tryEmphasis(rest, DOUBLE_UNDER);
        if (mu) {
          recurse(mu.content, { underline: true });
          i += mu.length;
          continue;
        }
        const mi = tryEmphasis(rest, SINGLE_UNDER);
        if (mi) {
          recurse(mi.content, { italic: true });
          i += mi.length;
          continue;
        }
      }
    }
    // 5) Strikethrough.
    if (ch === '~' && text[i + 1] === '~') {
      const ms = tryEmphasis(text.slice(i), STRIKE);
      if (ms) {
        recurse(ms.content, { strike: true });
        i += ms.length;
        continue;
      }
    }
    // No match: the character is literal.
    plain += ch;
    i += 1;
  }
  flush();
  return out;
}
