/**
 * Parse the payload of a text-completion SSE `data:` frame.
 *
 * SillyTavern's server emits `{ choices: [{ text, thinking }] }` for KoboldCpp/text-completion
 * (src/endpoints/backends/text-completions.js). llama.cpp-style servers may instead use a
 * top-level `content`. A swipe/alternative is signalled by `choices[0].index > 0`.
 */
export interface TextgenDelta {
  /** Incremental visible text for this frame. */
  text: string;
  /** Incremental reasoning/thinking text, if the backend streams it separately. */
  thinking?: string;
  /** Choice index - > 0 indicates an alternative swipe stream. */
  index: number;
  /** True only for the terminal `[DONE]` sentinel. */
  done: boolean;
}

export function parseTextgenData(data: string): TextgenDelta | null {
  if (data === '[DONE]') return { text: '', index: 0, done: true };

  let obj: unknown;
  try {
    obj = JSON.parse(data);
  } catch {
    return null;
  }
  if (typeof obj !== 'object' || obj === null) return null;

  const root = obj as {
    choices?: Array<{ text?: unknown; thinking?: unknown; reasoning?: unknown; index?: unknown }>;
    content?: unknown;
  };
  const choice = root.choices?.[0];

  const rawText = choice?.text ?? root.content ?? '';
  const text = typeof rawText === 'string' ? rawText : '';

  const rawThinking = choice?.thinking ?? choice?.reasoning;
  const thinking = typeof rawThinking === 'string' ? rawThinking : undefined;

  const index = typeof choice?.index === 'number' ? choice.index : 0;

  const delta: TextgenDelta = { text, index, done: false };
  if (thinking !== undefined) delta.thinking = thinking;
  return delta;
}
