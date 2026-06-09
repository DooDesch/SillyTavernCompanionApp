import { NAMES_BEHAVIOR, PROMPT_POSITION, type ContextSettings, type Identity, type InstructSettings } from './types';
import { substituteParams } from './substituteParams';

export const FORCE_SEQUENCE = { NONE: 0, FIRST: 1, LAST: 2 } as const;
export type ForceSequence = (typeof FORCE_SEQUENCE)[keyof typeof FORCE_SEQUENCE];

export interface InstructContext {
  instruct: InstructSettings;
  context: ContextSettings;
  identity: Identity;
  /** Single-character chats only for now. */
  selectedGroup: boolean;
}

function subst(value: string, identity: Identity): string {
  return substituteParams(value, { identity });
}

function applyNameMacro(value: string, name: string): string {
  return value.replace(/{{name}}/gi, name || 'System');
}

/** Port of `formatInstructModeChat`. */
export function formatInstructModeChat(
  ctx: InstructContext,
  params: {
    name: string;
    mes: string;
    isUser: boolean;
    isNarrator: boolean;
    forceAvatar: boolean;
    forceOutputSequence?: ForceSequence;
  },
): string {
  const { instruct, identity } = ctx;
  const { name, mes, isUser, isNarrator, forceAvatar, forceOutputSequence = FORCE_SEQUENCE.NONE } = params;

  let includeNames = isNarrator ? false : instruct.names_behavior === NAMES_BEHAVIOR.ALWAYS;
  if (
    !isNarrator &&
    instruct.names_behavior === NAMES_BEHAVIOR.FORCE &&
    ((ctx.selectedGroup && name !== identity.user) || (forceAvatar && name !== identity.user))
  ) {
    includeNames = true;
  }

  const getPrefix = (): string => {
    if (isNarrator) {
      return (instruct.system_same_as_user ? instruct.input_sequence : instruct.system_sequence) ?? '';
    }
    if (isUser) {
      if (forceOutputSequence === FORCE_SEQUENCE.FIRST) return instruct.first_input_sequence || instruct.input_sequence;
      if (forceOutputSequence === FORCE_SEQUENCE.LAST) return instruct.last_input_sequence || instruct.input_sequence;
      return instruct.input_sequence;
    }
    if (forceOutputSequence === FORCE_SEQUENCE.FIRST) return instruct.first_output_sequence || instruct.output_sequence;
    if (forceOutputSequence === FORCE_SEQUENCE.LAST) return instruct.last_output_sequence || instruct.output_sequence;
    return instruct.output_sequence;
  };

  const getSuffix = (): string => {
    if (isNarrator) {
      return (instruct.system_same_as_user ? instruct.input_suffix : instruct.system_suffix) ?? '';
    }
    return (isUser ? instruct.input_suffix : instruct.output_suffix) ?? '';
  };

  let prefix = getPrefix() || '';
  let suffix = getSuffix() || '';

  if (instruct.macro) {
    prefix = applyNameMacro(subst(prefix, identity), name);
    suffix = applyNameMacro(subst(suffix, identity), name);
  }

  if (!suffix && instruct.wrap) suffix = '\n';
  const separator = instruct.wrap ? '\n' : '';

  const textArray = includeNames && name ? [prefix, `${name}: ${mes}${suffix}`] : [prefix, mes + suffix];
  return textArray.filter((x) => x).join(separator);
}

/** Port of `formatInstructModeStoryString`. */
export function formatInstructModeStoryString(storyString: string, ctx: InstructContext): string {
  if (!storyString) return '';
  const { instruct, context, identity } = ctx;
  const position = context.story_string_position ?? PROMPT_POSITION.IN_PROMPT;
  const applySequences = position !== PROMPT_POSITION.IN_CHAT;
  const separator = instruct.wrap ? '\n' : '';

  let result = storyString;
  if (applySequences && instruct.story_string_prefix) {
    const prefix = applyNameMacro(subst(instruct.story_string_prefix, identity), 'System');
    result = prefix + separator + result;
  }
  if (applySequences && instruct.story_string_suffix) {
    result = result + subst(instruct.story_string_suffix, identity);
  }
  return result;
}

/** Port of `formatInstructModePrompt` (the trailing prompt line that elicits the AI response). */
export function formatInstructModePrompt(
  ctx: InstructContext,
  params: { name: string; isImpersonate: boolean; promptBias: string },
): string {
  const { instruct, identity } = ctx;
  const { name, isImpersonate, promptBias } = params;
  const includeNames =
    !!name &&
    (instruct.names_behavior === NAMES_BEHAVIOR.ALWAYS ||
      (ctx.selectedGroup && instruct.names_behavior === NAMES_BEHAVIOR.FORCE));

  let sequence = (isImpersonate
    ? instruct.last_input_sequence || instruct.input_sequence
    : instruct.last_output_sequence || instruct.output_sequence) || '';

  if (instruct.macro) sequence = applyNameMacro(subst(sequence, identity), name);

  const separator = instruct.wrap ? '\n' : '';
  let text = includeNames ? `${separator}${sequence}${separator}${name}:` : `${separator}${sequence}`;

  if (!isImpersonate && promptBias) {
    text += includeNames ? promptBias : separator + promptBias.trimStart();
  }

  return (instruct.wrap ? text.trimEnd() : text) + (includeNames ? '' : separator);
}

/** Port of `getInstructStoppingSequences`. */
export function getInstructStoppingSequences(ctx: InstructContext): string[] {
  const { instruct, identity } = ctx;
  const result: string[] = [];

  if (instruct.enabled) {
  const replaceName = (s: string | undefined, n: string) => (s ?? '').replace(/{{name}}/gi, n);
  const stop_sequence = instruct.stop_sequence || '';
  const combined = [stop_sequence];
  if (instruct.sequences_as_stop_strings) {
    combined.push(
      replaceName(instruct.input_sequence, identity.user),
      replaceName(instruct.output_sequence, identity.char),
      replaceName(instruct.first_output_sequence, identity.char),
      replaceName(instruct.last_output_sequence, identity.char),
      replaceName(instruct.system_sequence, 'System'),
      replaceName(instruct.last_system_sequence, 'System'),
    );
  }

  const seen = new Set<string>();
  for (const seq of combined.join('\n').split('\n')) {
    if (seen.has(seq)) continue;
    seen.add(seq);
    if (typeof seq === 'string' && seq.trim().length > 0) {
      const wrapped = instruct.wrap ? '\n' + seq : seq;
      result.push(instruct.macro ? subst(wrapped, identity) : wrapped);
    }
  }
  }

  // Context "Chat Start" / "Example Separator" as stop strings (ST getInstructStoppingSequences).
  if (ctx.context.use_stop_strings) {
    if (ctx.context.chat_start) result.push(`\n${subst(ctx.context.chat_start, identity)}`);
    if (ctx.context.example_separator) result.push(`\n${subst(ctx.context.example_separator, identity)}`);
  }

  return result;
}
