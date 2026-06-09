import { SseParser, type SseEvent } from './sseParser';

/**
 * Decode a binary HTTP stream (e.g. `expo/fetch` `response.body`) into SSE events.
 * Runtime-agnostic: needs only a WHATWG `ReadableStream<Uint8Array>` and `TextDecoder`,
 * both available in React Native (New Architecture) and Node 18+.
 */
export async function* iterateSseStream(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<SseEvent, void, void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const parser = new SseParser();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        for (const evt of parser.push(chunk)) yield evt;
      }
    }
    for (const evt of parser.flush()) yield evt;
  } finally {
    reader.releaseLock();
  }
}

/** A minimal, runtime-agnostic streaming request descriptor. */
export interface GenerateStreamRequest {
  url: string;
  headers: Record<string, string>;
  body: unknown;
  signal?: AbortSignal;
}

/** One streamed step of generation, already mapped from the backend's wire shape. */
export interface StreamToken {
  text: string;
  thinking?: string;
  index: number;
}

/**
 * Pluggable streaming transport. The mobile app provides an `expo/fetch`-backed implementation;
 * tests provide a fake. Keeping it behind an interface mirrors the DiscoveryProvider pattern.
 */
export interface StreamTransport {
  generate(req: GenerateStreamRequest): AsyncIterable<StreamToken>;
}
