import { substituteMacros, type EnvObject } from './macros';
import type { Identity } from './types';

export interface CardMacroValues {
  description?: string;
  personality?: string;
  scenario?: string;
  persona?: string;
  mesExamples?: string;
}

export interface SubstituteOptions {
  identity: Identity;
  /** Value for the {{original}} macro (used when nesting a default system prompt). */
  original?: string;
  card?: CardMacroValues;
  /** When false, the character-card macros ({{description}} etc.) are NOT injected (avoids recursion
   *  while substituting the card fields themselves). Mirrors ST's `replaceCharacterCard`. */
  replaceCharacterCard?: boolean;
}

/** Port of SillyTavern's `substituteParams`. Builds the macro env and runs the macro pipeline. */
export function substituteParams(content: string, opts: SubstituteOptions): string {
  const env: EnvObject = {
    user: opts.identity.user,
    char: opts.identity.char,
    group: opts.identity.char,
  };
  if (opts.original !== undefined) env.original = opts.original;
  if (opts.replaceCharacterCard !== false && opts.card) {
    env.description = opts.card.description ?? '';
    env.personality = opts.card.personality ?? '';
    env.scenario = opts.card.scenario ?? '';
    env.persona = opts.card.persona ?? '';
    env.mesExamples = opts.card.mesExamples ?? '';
  }
  return substituteMacros(content, env);
}

/** Collapse any run of newlines into a single newline (ST `collapseNewlines`). */
export function collapseNewlines(value: string): string {
  return value.replace(/\n+/g, '\n');
}
