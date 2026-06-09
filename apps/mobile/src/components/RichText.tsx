import { memo } from 'react';
import { Platform, Text, View, type TextStyle } from 'react-native';

/**
 * Minimal SillyTavern-style message renderer (Hermes-safe, no eval).
 * Block level: fenced ```code``` blocks → monospace box; everything else is prose.
 * Inline (prose): **bold**, *italic* (actions), `code`, "quoted speech" — each in its own colour.
 */

const COLORS = {
  base: '#d9d9e3',
  quote: '#8fb6ff', // speech
  italic: '#c2a8f0', // actions / narration
  bold: '#ffffff',
  code: '#ffd479',
};

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

interface Span {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  quote?: boolean;
}

interface Block {
  type: 'code' | 'prose';
  content: string;
}

function splitBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  const re = /```[\w-]*\n?([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) blocks.push({ type: 'prose', content: text.slice(last, m.index) });
    blocks.push({ type: 'code', content: (m[1] ?? '').replace(/\n$/, '') });
    last = m.index + m[0].length;
  }
  if (last < text.length) blocks.push({ type: 'prose', content: text.slice(last) });
  return blocks;
}

// Ordered so bold ('**') is tested before italic ('*') and wins ties at the same index.
const INLINE: { re: RegExp; make: (m: RegExpExecArray) => Span }[] = [
  { re: /\*\*([^*]+)\*\*/g, make: (m) => ({ text: m[1] ?? '', bold: true }) },
  { re: /`([^`]+)`/g, make: (m) => ({ text: m[1] ?? '', code: true }) },
  { re: /\*([^*\n]+)\*/g, make: (m) => ({ text: m[1] ?? '', italic: true }) },
  { re: /"([^"\n]*)"/g, make: (m) => ({ text: `"${m[1] ?? ''}"`, quote: true }) },
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

function RichTextImpl({ text }: { text: string }) {
  const blocks = splitBlocks(text);
  return (
    <View>
      {blocks.map((b, i) => {
        if (b.type === 'code') {
          return (
            <View key={i} className="my-1 rounded-lg bg-surface2 px-3 py-2">
              <Text selectable style={{ color: '#cdd6f4', fontFamily: MONO, fontSize: 13, lineHeight: 18 }}>
                {b.content}
              </Text>
            </View>
          );
        }
        if (b.content.trim().length === 0) return null;
        return (
          <Text key={i} selectable style={{ color: COLORS.base, fontSize: 15, lineHeight: 21 }}>
            {parseInline(b.content).map((s, j) => (
              <Text key={j} style={spanStyle(s)}>
                {s.text}
              </Text>
            ))}
          </Text>
        );
      })}
    </View>
  );
}

export const RichText = memo(RichTextImpl);
