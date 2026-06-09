import { describe, expect, it } from 'vitest';
import { iterateSseStream } from './stream';
import { parseTextgenData } from './textgen';

function streamFromStrings(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i < chunks.length) {
        controller.enqueue(encoder.encode(chunks[i]!));
        i += 1;
      } else {
        controller.close();
      }
    },
  });
}

describe('iterateSseStream', () => {
  it('decodes a chunked text-completion stream into tokens', async () => {
    const stream = streamFromStrings([
      'data: {"choices":[{"text":"Hel',
      'lo"}]}\n\ndata: {"choices":[{"text":" world"}]}\n\n',
      'data: [DONE]\n\n',
    ]);

    const tokens: string[] = [];
    let done = false;
    for await (const evt of iterateSseStream(stream)) {
      const delta = parseTextgenData(evt.data);
      if (!delta) continue;
      if (delta.done) {
        done = true;
        break;
      }
      tokens.push(delta.text);
    }

    expect(tokens.join('')).toBe('Hello world');
    expect(done).toBe(true);
  });
});
