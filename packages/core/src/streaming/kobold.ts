/**
 * Parse the payload of a KoboldAI Classic SSE `data:` frame.
 *
 * KoboldCpp's /extra/generate/stream emits `{ token }` frames (proxied untouched by the
 * ST server). There is NO `[DONE]` sentinel - the stream simply closes when generation
 * ends. NovelAI streams the same frame shape, hence the shared `parseTokenFrame` name.
 */
export interface TokenFrameDelta {
  /** Incremental visible text for this frame. */
  text: string;
}

export function parseTokenFrame(data: string): TokenFrameDelta | null {
  let obj: unknown;
  try {
    obj = JSON.parse(data);
  } catch {
    return null;
  }
  if (typeof obj !== 'object' || obj === null) return null;
  const token = (obj as { token?: unknown }).token;
  return { text: typeof token === 'string' ? token : '' };
}

export const parseKoboldData = parseTokenFrame;
