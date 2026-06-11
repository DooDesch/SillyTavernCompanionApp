/**
 * Data-driven schema + pure merge helpers for the Advanced-Formatting template editor
 * (instruct / context / sysprompt). Field inventory and defaults mirror desktop
 * SillyTavern: public/scripts/power-user.js (instruct + context defaults, contextControls),
 * public/scripts/instruct-mode.js (controls + migrateInstructModeSettings) and
 * public/scripts/sysprompt.js. Pure TS - no React Native imports (vitest, node env).
 */

export type TemplateKind = 'instruct' | 'context' | 'sysprompt';

export const TEMPLATE_KINDS: TemplateKind[] = ['instruct', 'context', 'sysprompt'];

export interface TemplateFieldOption {
  value: string | number;
  /** Plain label (technical values stay untranslated). */
  label: string;
}

export interface TemplateField {
  key: string;
  type: 'textarea' | 'toggle' | 'segmented';
  section: string;
  /** Desktop default - applied on long-press reset. */
  def: unknown;
  options?: TemplateFieldOption[];
  /** Taller textarea (story_string, sysprompt content). */
  tall?: boolean;
  /** Has a formatting.hints.<key> entry. */
  hint?: boolean;
}

const NAMES_BEHAVIOR_OPTIONS: TemplateFieldOption[] = [
  { value: 'none', label: 'None' },
  { value: 'force', label: 'Groups & past' },
  { value: 'always', label: 'Always' },
];

/** Editor fields per kind (desktop instruct defaults block, contextControls, sysprompt.js). */
export const TEMPLATE_FIELDS: Record<TemplateKind, TemplateField[]> = {
  instruct: [
    // ---- Behavior ----
    { key: 'wrap', type: 'toggle', section: 'behavior', def: true, hint: true },
    { key: 'macro', type: 'toggle', section: 'behavior', def: true, hint: true },
    { key: 'names_behavior', type: 'segmented', section: 'behavior', def: 'force', options: NAMES_BEHAVIOR_OPTIONS, hint: true },
    { key: 'system_same_as_user', type: 'toggle', section: 'behavior', def: false },
    { key: 'sequences_as_stop_strings', type: 'toggle', section: 'behavior', def: true },
    { key: 'bind_to_context', type: 'toggle', section: 'behavior', def: false, hint: true },
    { key: 'skip_examples', type: 'toggle', section: 'behavior', def: false },

    // ---- User message sequences ----
    { key: 'input_sequence', type: 'textarea', section: 'user', def: '### Instruction:' },
    { key: 'input_suffix', type: 'textarea', section: 'user', def: '' },
    { key: 'first_input_sequence', type: 'textarea', section: 'user', def: '' },
    { key: 'last_input_sequence', type: 'textarea', section: 'user', def: '' },

    // ---- Assistant message sequences ----
    { key: 'output_sequence', type: 'textarea', section: 'assistant', def: '### Response:' },
    { key: 'output_suffix', type: 'textarea', section: 'assistant', def: '' },
    { key: 'first_output_sequence', type: 'textarea', section: 'assistant', def: '' },
    { key: 'last_output_sequence', type: 'textarea', section: 'assistant', def: '' },

    // ---- System message sequences ----
    { key: 'system_sequence', type: 'textarea', section: 'system', def: '' },
    { key: 'system_suffix', type: 'textarea', section: 'system', def: '' },
    { key: 'last_system_sequence', type: 'textarea', section: 'system', def: '' },

    // ---- System prompt wrappers ----
    { key: 'story_string_prefix', type: 'textarea', section: 'story', def: '' },
    { key: 'story_string_suffix', type: 'textarea', section: 'story', def: '' },

    // ---- Misc ----
    { key: 'stop_sequence', type: 'textarea', section: 'misc', def: '', hint: true },
    { key: 'user_alignment_message', type: 'textarea', section: 'misc', def: '', hint: true },
    { key: 'activation_regex', type: 'textarea', section: 'misc', def: '', hint: true },
  ],
  context: [
    { key: 'story_string', type: 'textarea', section: 'template', def: '{{#if system}}{{system}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{char}}\'s personality: {{personality}}\n{{/if}}{{#if scenario}}Scenario: {{scenario}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}', tall: true, hint: true },
    { key: 'chat_start', type: 'textarea', section: 'template', def: '***' },
    { key: 'example_separator', type: 'textarea', section: 'template', def: '***' },
    { key: 'use_stop_strings', type: 'toggle', section: 'behavior', def: false, hint: true },
    { key: 'names_as_stop_strings', type: 'toggle', section: 'behavior', def: true, hint: true },
  ],
  sysprompt: [
    { key: 'content', type: 'textarea', section: 'content', def: '', tall: true, hint: true },
    { key: 'post_history', type: 'textarea', section: 'content', def: '', hint: true },
  ],
};

export const TEMPLATE_SECTIONS: Record<TemplateKind, string[]> = {
  instruct: ['behavior', 'user', 'assistant', 'system', 'story', 'misc'],
  context: ['template', 'behavior'],
  sysprompt: ['content'],
};

export type TemplateObject = Record<string, unknown> & { name?: string };

/** Resolve a template by its `name` field (desktop arrays are parsed objects). */
export function byName<T extends { name?: string }>(arr: T[] | undefined, name?: string): T | undefined {
  return name && Array.isArray(arr) ? arr.find((x) => x.name === name) : undefined;
}

/**
 * Build the object written to the template FILE: full base (unknown keys like
 * story_string_position survive) + touched draft values + the target name.
 * Never trims - sequences legitimately contain leading/trailing newlines.
 */
export function mergeTemplate(
  base: TemplateObject | undefined,
  draft: Record<string, unknown>,
  name: string,
): TemplateObject {
  return { ...(base ?? {}), ...draft, name };
}

/**
 * Result of applying desktop "select template" semantics: `fields` is merged into
 * power_user[kind]; `globals` (context only) is merged into power_user itself.
 */
export interface SelectPatch {
  fields: Record<string, unknown>;
  globals?: Record<string, unknown>;
}

/** migrateInstructModeSettings defaults - missing keys get RESET on select (instruct-mode.js). */
const INSTRUCT_MIGRATE_DEFAULTS: Record<string, unknown> = {
  input_suffix: '',
  system_sequence: '',
  system_suffix: '',
  user_alignment_message: '',
  last_system_sequence: '',
  first_input_sequence: '',
  last_input_sequence: '',
  skip_examples: false,
  system_same_as_user: false,
  names_behavior: 'force',
  sequences_as_stop_strings: true,
  story_string_prefix: '',
  story_string_suffix: '',
};

/** Properties the desktop instruct select copies when defined (instruct-mode.js controls[]). */
const INSTRUCT_COPY_PROPS = [
  'enabled',
  'wrap',
  'macro',
  'story_string_prefix',
  'story_string_suffix',
  'input_sequence',
  'input_suffix',
  'output_sequence',
  'output_suffix',
  'system_sequence',
  'system_suffix',
  'last_system_sequence',
  'user_alignment_message',
  'stop_sequence',
  'first_output_sequence',
  'last_output_sequence',
  'first_input_sequence',
  'last_input_sequence',
  'activation_regex',
  'bind_to_context',
  'skip_examples',
  'names_behavior',
  'system_same_as_user',
  'sequences_as_stop_strings',
] as const;

/** Context-scoped properties + select-time fallbacks (power-user.js contextControls). */
const CONTEXT_COPY_PROPS: { key: string; def?: unknown }[] = [
  { key: 'story_string' },
  { key: 'example_separator' },
  { key: 'chat_start' },
  { key: 'use_stop_strings', def: false },
  { key: 'names_as_stop_strings', def: true },
  { key: 'story_string_position', def: 0 },
  { key: 'story_string_depth', def: 1 },
  { key: 'story_string_role', def: 0 },
];

/** Global power_user properties a context template may carry (power-user.js contextControls). */
const CONTEXT_GLOBAL_PROPS: { key: string; def: unknown }[] = [
  { key: 'always_force_name2', def: true },
  { key: 'trim_sentences', def: false },
  { key: 'single_line', def: false },
];

/**
 * Desktop select semantics for a template, faithful to the per-kind handlers:
 * - instruct (#instruct_presets change): migrate-defaults for absent keys, copy defined
 *   control props, set `.preset`. Does NOT touch `enabled` unless the file defines it.
 * - context (#context_presets change): copy props with select-time fallbacks, set `.preset`,
 *   plus the global power_user keys the template may carry.
 * - sysprompt ($select change): set `.name`, content/post_history (with '' fallback) and
 *   force `enabled: true` (desktop enables sysprompt when one is picked).
 */
export function buildSelectPatch(kind: TemplateKind, template: TemplateObject): SelectPatch {
  const name = String(template.name ?? '');

  if (kind === 'instruct') {
    const migrated: TemplateObject = { ...INSTRUCT_MIGRATE_DEFAULTS, ...definedOnly(template) };
    // separator_sequence => output_suffix (legacy files)
    if (migrated.separator_sequence !== undefined) {
      migrated.output_suffix = migrated.separator_sequence || '';
      delete migrated.separator_sequence;
    }
    const fields: Record<string, unknown> = { preset: name };
    for (const prop of INSTRUCT_COPY_PROPS) {
      if (migrated[prop] !== undefined) fields[prop] = migrated[prop];
    }
    return { fields };
  }

  if (kind === 'context') {
    const fields: Record<string, unknown> = { preset: name };
    for (const { key, def } of CONTEXT_COPY_PROPS) {
      const value = template[key] ?? def;
      if (value !== undefined) fields[key] = value;
    }
    const globals: Record<string, unknown> = {};
    for (const { key, def } of CONTEXT_GLOBAL_PROPS) {
      globals[key] = template[key] ?? def;
    }
    return { fields, globals };
  }

  return {
    fields: {
      name,
      enabled: true,
      content: (template.content as string | undefined) || '',
      post_history: (template.post_history as string | undefined) || '',
    },
  };
}

function definedOnly(obj: TemplateObject): TemplateObject {
  const out: TemplateObject = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}
