import { fetch as expoFetch } from 'expo/fetch';
import { iterateSseStream, type GenerateStreamRequest, type SseEvent } from '@st/core';

/**
 * Open an SSE POST stream over `expo/fetch` and yield raw SSE events. The caller parses each event
 * per backend (text-completion vs the active chat-completion source). Aborting `req.signal` closes
 * the socket, which makes the ST server abort the upstream generation too.
 */
export async function* openSseStream(req: GenerateStreamRequest): AsyncGenerator<SseEvent, void, void> {
  const res = await expoFetch(req.url, {
    method: 'POST',
    headers: req.headers,
    body: JSON.stringify(req.body),
    signal: req.signal,
  });
  if (!res.ok) {
    throw new Error(`Generierung fehlgeschlagen: HTTP ${res.status}`);
  }
  if (!res.body) {
    throw new Error('Streaming-Antwort ohne Body');
  }
  for await (const evt of iterateSseStream(res.body as ReadableStream<Uint8Array>)) {
    yield evt;
  }
}
