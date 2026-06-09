import { describe, expect, it } from 'vitest';
import { SseParser } from './sseParser';

describe('SseParser', () => {
  it('parses a single complete frame', () => {
    const p = new SseParser();
    const events = p.push('data: {"choices":[{"text":"hi"}]}\n\n');
    expect(events).toEqual([{ data: '{"choices":[{"text":"hi"}]}' }]);
  });

  it('reassembles a frame split across chunks (including mid-token)', () => {
    const p = new SseParser();
    expect(p.push('data: {"choices":[{"te')).toEqual([]);
    expect(p.push('xt":"hi"}]}')).toEqual([]);
    const events = p.push('\n\n'); // blank-line terminator arrives in a later chunk
    expect(events).toEqual([{ data: '{"choices":[{"text":"hi"}]}' }]);
  });

  it('emits multiple frames from one chunk and recognizes [DONE]', () => {
    const p = new SseParser();
    const events = p.push('data: {"a":1}\n\ndata: [DONE]\n\n');
    expect(events.map((e) => e.data)).toEqual(['{"a":1}', '[DONE]']);
  });

  it('tolerates CRLF line endings', () => {
    const p = new SseParser();
    const events = p.push('data: x\r\n\r\n');
    expect(events).toEqual([{ data: 'x' }]);
  });

  it('joins multi-line data fields and ignores comments', () => {
    const p = new SseParser();
    const events = p.push(': keep-alive\ndata: line1\ndata: line2\n\n');
    expect(events).toEqual([{ data: 'line1\nline2' }]);
  });

  it('flush() emits a frame missing its trailing blank line', () => {
    const p = new SseParser();
    expect(p.push('data: tail')).toEqual([]);
    expect(p.flush()).toEqual([{ data: 'tail' }]);
  });
});
