/**
 * Subset of SillyTavern's settings needed to build a text-completion prompt faithfully.
 * Field names mirror `power_user.*` from `/api/settings/get` exactly so they can be passed through.
 */

export const NAMES_BEHAVIOR = { NONE: 'none', FORCE: 'force', ALWAYS: 'always' } as const;
export type NamesBehavior = (typeof NAMES_BEHAVIOR)[keyof typeof NAMES_BEHAVIOR];

/** extension_prompt_types: IN_PROMPT=0, IN_CHAT=1 (the two that affect the story string). */
export const PROMPT_POSITION = { IN_PROMPT: 0, IN_CHAT: 1 } as const;

export interface InstructSettings {
  enabled: boolean;
  input_sequence: string;
  output_sequence: string;
  first_input_sequence?: string;
  first_output_sequence?: string;
  last_input_sequence?: string;
  last_output_sequence?: string;
  system_sequence?: string;
  last_system_sequence?: string;
  stop_sequence?: string;
  input_suffix?: string;
  output_suffix?: string;
  system_suffix?: string;
  wrap: boolean;
  macro: boolean;
  names_behavior: NamesBehavior;
  system_same_as_user?: boolean;
  sequences_as_stop_strings?: boolean;
  story_string_prefix?: string;
  story_string_suffix?: string;
  skip_examples?: boolean;
  user_alignment_message?: string;
  [key: string]: unknown;
}

export interface ContextSettings {
  story_string: string;
  chat_start?: string;
  example_separator?: string;
  use_stop_strings?: boolean;
  names_as_stop_strings?: boolean;
  story_string_position?: number;
  story_string_depth?: number;
  story_string_role?: number;
  [key: string]: unknown;
}

export interface SyspromptSettings {
  enabled: boolean;
  content: string;
  post_history?: string;
}

/** The slice of `power_user` the engine reads. */
export interface PowerUserSubset {
  instruct: InstructSettings;
  context: ContextSettings;
  sysprompt: SyspromptSettings;
  persona_description?: string;
  persona_description_position?: number;
  prefer_character_prompt?: boolean;
  prefer_character_jailbreak?: boolean;
  collapse_newlines?: boolean;
  token_padding?: number;
  single_line?: boolean;
  strip_examples?: boolean;
  pin_examples?: boolean;
  custom_stopping_strings?: string;
  custom_stopping_strings_macro?: boolean;
  [key: string]: unknown;
}

/** Identity values used by macros and instruct formatting. */
export interface Identity {
  /** User/persona name (name1). */
  user: string;
  /** Character name (name2). */
  char: string;
}
