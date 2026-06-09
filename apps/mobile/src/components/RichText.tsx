import { memo } from 'react';
import { Platform, Text, View, type TextStyle } from 'react-native';

/**
 * SillyTavern-style message renderer (Hermes-safe, no eval).
 * Block level: fenced code blocks, ATX headings, blockquotes, and bullet/numbered lists; everything
 * else is paragraph prose (consecutive non-blank lines kept together so multi-line actions / "quotes"
 * don't split mid-span). Inline (prose): bold, italic (actions), inline code, "quoted speech".
 */

const COLORS = {
  base: '#d9d9e3',
  quote: '#8fb6ff', // speech
  italic: '#c2a8f0', // actions / narration
  bold: '#ffffff',
  code: '#ffd479',
  heading: '#ffffff',
};

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

interface Span {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  quote?: boolean;
}

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

// Ordered so bold ('**') is tested before italic ('*'); spans may cross newlines within a block.
const INLINE: { re: RegExp; make: (m: RegExpExecArray) => Span }[] = [
  { re: /\*\*([^*]+)\*\*/g, make: (m) => ({ text: m[1] ?? '', bold: true }) },
  { re: /`([^`]+)`/g, make: (m) => ({ text: m[1] ?? '', code: true }) },
  { re: /\*([^*]+)\*/g, make: (m) => ({ text: m[1] ?? '', italic: true }) },
  { re: /"([^"]*)"/g, make: (m) => ({ text: `"${m[1] ?? ''}"`, quote: true }) },
];

function parseInline(text: string): Span[] {
  const spans: Span[] = [];
  let i = 0;
  while (i < text.length) {
    let best: { idx: number; len: number; span: Span } | null = null;
    for (const p of INLINE) {
      p.re.lastIndex = i;
      const m = p.re.exec(text);
      if (m && (best === null || m.index < best.idx)) {
        best = { idx: m.index, len: m[0].length, span: p.make(m) };
      }
    }
    if (!best) {
      spans.push({ text: text.slice(i) });
      break;
    }
    if (best.idx > i) spans.push({ text: text.slice(i, best.idx) });
    spans.push(best.span);
    i = best.idx + best.len;
  }
  return spans;
}

function spanStyle(s: Span): TextStyle {
  if (s.code) return { color: COLORS.code, fontFamily: MONO, fontSize: 13 };
  if (s.quote) return { color: COLORS.quote };
  if (s.bold) return { color: COLORS.bold, fontWeight: '700' };
  if (s.italic) return { color: COLORS.italic, fontStyle: 'italic' };
  return { color: COLORS.base };
}

function InlineText({ text, className }: { text: string; className?: string }) {
  return (
    <Text selectable className={className} style={{ color: COLORS.base, fontSize: 15, lineHeight: 21 }}>
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
              <View key={i} className="my-1 rounded-lg bg-surface2 px-3 py-2">
                <Text selectable style={{ color: '#cdd6f4', fontFamily: MONO, fontSize: 13, lineHeight: 18 }}>
                  {b.content}
                </Text>
              </View>
            );
          case 'heading':
            return (
              <Text
                key={i}
                selectable
                style={{ color: COLORS.heading, fontWeight: '700', fontSize: b.level <= 2 ? 18 : 16, marginVertical: 2 }}
              >
                {b.content}
              </Text>
            );
          case 'quote':
            return (
              <View key={i} className="my-1 border-l-2 border-border pl-2">
                <InlineText text={b.content} />
              </View>
            );
          case 'list':
            return (
              <View key={i} className="my-1">
                {b.items.map((it, k) => (
                  <View key={k} className="flex-row">
                    <Text style={{ color: COLORS.base, fontSize: 15, lineHeight: 21 }}>
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
            return <InlineText key={i} text={b.content} />;
        }
      })}
    </View>
  );
}

export const RichText = memo(RichTextImpl);
