/**
 * In-chat @depth injection - the mechanism behind World Info `position: atDepth`, the character card's
 * `depth_prompt`, Author's Note (in-chat), and persona@depth. Faithful-but-scoped port of ST's
 * `doChatInject` / extension-prompt-by-depth logic: content is spliced into the message array at
 * `length - depth` (depth 0 = right before the final prompt line), grouped by depth.
 */

/** ST `extension_prompt_roles`: SYSTEM=0, USER=1, ASSISTANT=2. */
export const EXTENSION_ROLE = { SYSTEM: 0, USER: 1, ASSISTANT: 2 } as const;

export interface DepthInjection {
  depth: number;
  /** SYSTEM/USER/ASSISTANT (EXTENSION_ROLE); null → SYSTEM. */
  role: number | null;
  content: string;
}

/** Normalize a card/role value ('system'|'user'|'assistant' or a number) to an EXTENSION_ROLE number. */
export function roleFromString(role: string | number | undefined | null): number {
  if (typeof role === 'number') return role;
  switch (role) {
    case 'user':
      return EXTENSION_ROLE.USER;
    case 'assistant':
      return EXTENSION_ROLE.ASSISTANT;
    default:
      return EXTENSION_ROLE.SYSTEM;
  }
}

/**
 * Splice depth injections into a formatted message array. `format` renders one injection to a string
 * (instruct-wrapped or plain). Insertions are applied shallow→deep (end→start) using the original
 * length as the reference, so each splice index stays valid as the array grows.
 */
export function injectAtDepth(
  messages: string[],
  injections: DepthInjection[],
  format: (inj: DepthInjection) => string,
): string[] {
  const valid = injections.filter((i) => i.content && i.content.length > 0);
  if (valid.length === 0) return messages;

  const byDepth = new Map<number, DepthInjection[]>();
  for (const inj of valid) {
    const d = Math.max(0, inj.depth);
    const arr = byDepth.get(d) ?? [];
    arr.push(inj);
    byDepth.set(d, arr);
  }

  const result = [...messages];
  const origLen = messages.length;
  for (const depth of [...byDepth.keys()].sort((a, b) => a - b)) {
    const segs = byDepth
      .get(depth)!
      .map(format)
      .filter((s) => s.length > 0);
    if (segs.length === 0) continue;
    const idx = Math.max(0, Math.min(result.length, origLen - depth));
    result.splice(idx, 0, ...segs);
  }
  return result;
}
