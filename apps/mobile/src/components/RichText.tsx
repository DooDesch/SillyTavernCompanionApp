import { memo } from 'react';
import { Text, View, type TextStyle } from 'react-native';
import { parseInline, type InlineSpan } from '@/lib/inlineMarkup';
import { colors, fonts } from '@/theme/tokens';

/**
 * SillyTavern-style message renderer (Hermes-safe, no eval).
 * Block level: fenced code blocks, ATX headings, blockquotes, and bullet/numbered lists; everything
 * else is paragraph prose (consecutive non-blank lines kept together so multi-line actions / "quotes"
 * don't split mid-span). Inline (prose): bold, italic (actions), inline code, "quoted speech".
 *
 * Colors are drawn from the design tokens so prose stays legible (>= 4.5:1) on the character bubble.
 */
const COLORS = {
  base: colors.text, // prose
  quote: '#8FB6FF', // speech
  italic: '#C4A6F2', // actions / narration
  bold: colors.text,
  code: colors.warning, // inline code
  heading: colors.text,
  codeBlock: '#CDD6F4',
};

const MONO = fonts.mono;

type Block =
  | { type: 'code'; content: string }
  | { type: 'heading'; level: number; content: string }
  | { type: 'quote'; content: string }
  | { type: 'list'; items: string[]; ordered: boolean }
  | { type: 'para'; content: string };

function splitFences(text: string): { code: boolean; content: string }[] {
  const out: { code: boolean; content: string }[] = [];
  const re = /```[\w-]*\n?([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ code: false, content: text.slice(last, m.index) });
    out.push({ code: true, content: (m[1] ?? '').replace(/\n$/, '') });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ code: false, content: text.slice(last) });
  return out;
}

/** Split a prose chunk into heading/quote/list/paragraph blocks. */
function proseToBlocks(text: string): Block[] {
  const lines = text.split('\n');
  const blocks: Block[] = [];
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) {
      const joined = para.join('\n').trim();
      if (joined) blocks.push({ type: 'para', content: joined });
      para = [];
    }
  };
  for (const line of lines) {
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    const quote = /^>\s?(.*)$/.exec(line);
    const list = /^\s*([-*+]|\d+\.)\s+(.*)$/.exec(line);
    if (heading) {
      flushPara();
      blocks.push({ type: 'heading', level: heading[1]!.length, content: heading[2] ?? '' });
    } else if (quote) {
      flushPara();
      const prev = blocks[blocks.length - 1];
      if (prev && prev.type === 'quote') prev.content += '\n' + (quote[1] ?? '');
      else blocks.push({ type: 'quote', content: quote[1] ?? '' });
    } else if (list) {
      const ordered = /\d+\./.test(list[1] ?? '');
      const prev = blocks[blocks.length - 1];
      if (prev && prev.type === 'list' && prev.ordered === ordered) prev.items.push(list[2] ?? '');
      else {
        flushPara();
        blocks.push({ type: 'list', items: [list[2] ?? ''], ordered });
      }
    } else if (line.trim() === '') {
      flushPara();
    } else {
      para.push(line);
    }
  }
  flushPara();
  return blocks;
}

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  for (const chunk of splitFences(text)) {
    if (chunk.code) blocks.push({ type: 'code', content: chunk.content });
    else blocks.push(...proseToBlocks(chunk.content));
  }
  return blocks;
}

// Compositional styling (nesting-capable parser): bold+italic combine, and the quote
// color wins over the italic color inside quotes (desktop ST: .mes_text q em { color: inherit }).
function spanStyle(s: InlineSpan): TextStyle {
  if (s.code) return { color: COLORS.code, fontFamily: MONO, fontSize: 13.5 };
  const style: TextStyle = {
    color: s.quote ? COLORS.quote : s.italic ? COLORS.italic : COLORS.base,
    fontFamily: s.bold ? fonts.semibold : fonts.regular,
  };
  if (s.italic) style.fontStyle = 'italic';
  if (s.underline && s.strike) style.textDecorationLine = 'underline line-through';
  else if (s.underline) style.textDecorationLine = 'underline';
  else if (s.strike) style.textDecorationLine = 'line-through';
  return style;
}

function InlineText({ text }: { text: string }) {
  return (
    <Text selectable style={{ color: COLORS.base, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 }}>
      {parseInline(text).map((s, j) => (
        <Text key={j} style={spanStyle(s)}>
          {s.text}
        </Text>
      ))}
    </Text>
  );
}

function RichTextImpl({ text }: { text: string }) {
  const blocks = parseBlocks(text);
  return (
    <View>
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'code':
            return (
              <View key={i} className="my-1 rounded-field bg-surface-2 px-3 py-2">
                <Text selectable style={{ color: COLORS.codeBlock, fontFamily: MONO, fontSize: 13, lineHeight: 19 }}>
                  {b.content}
                </Text>
              </View>
            );
          case 'heading':
            return (
              <Text
                key={i}
                selectable
                style={{
                  color: COLORS.heading,
                  fontFamily: fonts.semibold,
                  fontSize: b.level <= 2 ? 18 : 16,
                  marginVertical: 2,
                }}
              >
                {b.content}
              </Text>
            );
          case 'quote':
            return (
              <View key={i} className="my-1 border-l-2 border-border-strong pl-2.5">
                <InlineText text={b.content} />
              </View>
            );
          case 'list':
            return (
              <View key={i} className="my-1">
                {b.items.map((it, k) => (
                  <View key={k} className="flex-row">
                    <Text style={{ color: COLORS.base, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 }}>
                      {b.ordered ? `${k + 1}. ` : '•  '}
                    </Text>
                    <View className="flex-1">
                      <InlineText text={it} />
                    </View>
                  </View>
                ))}
              </View>
            );
          default:
            // Desktop parity: paragraphs separate with 10px (.mes_text p), none after the
            // last - otherwise blank-line breaks visible during streaming vanish on finalize.
            return (
              <View key={i} style={{ marginBottom: i === blocks.length - 1 ? 0 : 10 }}>
                <InlineText text={b.content} />
              </View>
            );
        }
      })}
    </View>
  );
}

export const RichText = memo(RichTextImpl);
