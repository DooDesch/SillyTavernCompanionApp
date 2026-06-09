import type { StCharacter } from '../types/character';
import type { Identity, PowerUserSubset } from './types';
import { collapseNewlines, substituteParams } from './substituteParams';

export interface CharacterCardFields {
  system: string;
  mesExamples: string;
  description: string;
  personality: string;
  persona: string;
  scenario: string;
  jailbreak: string;
  charDepthPrompt: string;
  firstMessage: string;
}

/** Per-chat overrides stored in `chat_metadata` (set when the user edits these in the ST UI). */
export interface ChatFieldOverrides {
  system_prompt?: string;
  scenario?: string;
  mes_example?: string;
}

/**
 * Port of SillyTavern's `baseChatReplace`: macro substitution (without the card macros, to avoid
 * recursion) → optional newline collapsing → strip CR.
 */
export function baseChatReplace(
  value: string | undefined,
  identity: Identity,
  collapse: boolean,
): string {
  if (typeof value !== 'string' || value.length === 0) return value ?? '';
  let out = substituteParams(value, { identity, replaceCharacterCard: false });
  if (collapse) out = collapseNewlines(out);
  return out.replace(/\r/g, '');
}

/**
 * Port of `getCharacterCardFields` for the single-character text-completion path.
 * Resolves each card field through `baseChatReplace`, honouring the prefer_* flags.
 */
export function getCharacterCardFields(
  character: StCharacter,
  power: PowerUserSubset,
  identity: Identity,
  overrides: ChatFieldOverrides = {},
): CharacterCardFields {
  const collapse = power.collapse_newlines === true;
  const replace = (v: string | undefined) => baseChatReplace(v, identity, collapse);

  // chat_metadata overrides take precedence over the card fields (ST getCharacterCardFieldsLazy).
  const system = power.prefer_character_prompt
    ? replace((overrides.system_prompt || character.data?.system_prompt)?.trim())
    : '';
  const jailbreak = power.prefer_character_jailbreak
    ? replace(character.data?.post_history_instructions?.trim())
    : '';

  return {
    persona: replace(power.persona_description?.trim()),
    system,
    jailbreak,
    charDepthPrompt: replace(character.data?.extensions?.depth_prompt?.prompt?.trim()),
    description: replace(character.description?.trim()),
    personality: replace(character.personality?.trim()),
    scenario: replace(((overrides.scenario || character.scenario) ?? '').trim()),
    mesExamples: replace(((overrides.mes_example || character.mes_example) ?? '').trim()),
    firstMessage: replace((character.first_mes ?? '').trim()),
  };
}
