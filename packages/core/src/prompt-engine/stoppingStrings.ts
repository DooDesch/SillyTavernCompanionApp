import type { Identity, PowerUserSubset } from './types';
import { getInstructStoppingSequences, type InstructContext } from './instruct';
import { substituteParams } from './substituteParams';

function getCustomStoppingStrings(power: PowerUserSubset, identity: Identity): string[] {
  try {
    const parsed = JSON.parse(power.custom_stopping_strings ?? '[]');
    if (!Array.isArray(parsed)) return [];
    const macro = power.custom_stopping_strings_macro !== false;
    return parsed
      .filter((s): s is string => typeof s === 'string' && s.length > 0)
      .map((s) => (macro ? substituteParams(s, { identity }) : s));
  } catch {
    return [];
  }
}

/** Port of `getStoppingStrings` for the text-completion path. */
export function getStoppingStrings(
  ctx: InstructContext,
  power: PowerUserSubset,
  opts: { isImpersonate?: boolean; isContinue?: boolean; lastMessageIsUser?: boolean } = {},
): string[] {
  const { identity } = ctx;
  const result: string[] = [];

  if (ctx.context.names_as_stop_strings) {
    const charString = `\n${identity.char}:`;
    const userString = `\n${identity.user}:`;
    result.push(opts.isImpersonate ? charString : userString);
    result.push(userString);
    if (opts.isContinue && opts.lastMessageIsUser) {
      result.push(charString);
    }
  }

  result.push(...getInstructStoppingSequences(ctx));
  result.push(...getCustomStoppingStrings(power, identity));

  if (power.single_line) result.unshift('\n');

  const seen = new Set<string>();
  return result.filter((s) => s && !seen.has(s) && seen.add(s));
}
