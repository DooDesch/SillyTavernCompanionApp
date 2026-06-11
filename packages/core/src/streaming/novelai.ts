/**
 * Parse the payload of a NovelAI SSE `data:` frame.
 *
 * The ST server pipes NovelAI's /ai/generate-stream response through unchanged
 * (src/endpoints/novelai.js forwardFetchResponse); each frame is `{ token, ..., logprobs? }`
 * and desktop accumulates `data.token` (public/scripts/nai-settings.js:758-772). Logprobs
 * are ignored here (no token-probability UI in the app).
 */
export interface NovelDelta {
  /** Incremental token text for this frame. */
  text: string;
  /** True only for a terminal sentinel (NovelAI itself just closes the stream). */
  done: boolean;
}

export function parseNovelData(data: string): NovelDelta | null {
  if (data === '[DONE]') return { text: '', done: true };

  let obj: unknown;
  try {
    obj = JSON.parse(data);
  } catch {
    return null;
  }
  if (typeof obj !== 'object' || obj === null) return null;

  const token = (obj as { token?: unknown }).token;
  return { text: typeof token === 'string' ? token : '', done: false };
}
