/**
 * Data-driven schema for the full generation-settings screen: every sampler/option the
 * SillyTavern frontend exposes for text completion (KoboldCpp) and chat completion,
 * with ST's UI ranges and defaults (long-press reset). The screen renders rows and
 * builds diff-only save patches purely from this table - no per-field JSX.
 */

export type GenTarget = 'textgen' | 'oai' | 'root';
export type GenMode = 'tc' | 'cc' | 'both';
export type GenSection =
  | 'tokens'
  | 'sampling'
  | 'penalties'
  | 'dynatemp'
  | 'mirostat'
  | 'dry'
  | 'xtc'
  | 'cfg'
  | 'advanced';

export interface GenFieldOption {
  value: number | string;
  /** Plain label (technical terms stay untranslated). */
  label: string;
}

export interface GenField {
  key: string;
  target: GenTarget;
  mode: GenMode;
  section: GenSection;
  type: 'slider' | 'stepper' | 'toggle' | 'textarea' | 'segmented' | 'order';
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;
  /** Typed values may exceed the drag range up to these (ST allows wider ranges). */
  hardMin?: number;
  hardMax?: number;
  /** Stepper presets. */
  presets?: number[];
  options?: GenFieldOption[];
  /** ST default - applied on long-press reset. */
  def: unknown;
  /** Has a genSettings.hints.<key> entry. */
  hint?: boolean;
  /** Textarea must parse as a JSON string array. */
  jsonArray?: boolean;
  showIf?: { key: string; equals: unknown };
}

export const KOBOLDCPP_ORDER = [6, 0, 1, 3, 4, 2, 5];
export const SAMPLER_LABELS: Record<number, string> = {
  0: 'Top-K',
  1: 'Top-A',
  2: 'Top-P',
  3: 'TFS',
  4: 'Typical-P',
  5: 'Temperature',
  6: 'Rep-Pen',
};

const CTX_PRESETS = [2048, 4096, 8192, 16384, 32768, 65536, 131072];

export const GEN_FIELDS: GenField[] = [
  // ---- Tokens & output ----
  { key: 'amount_gen', target: 'root', mode: 'tc', section: 'tokens', type: 'slider', min: 16, max: 2048, step: 16, hardMax: 32768, def: 512 },
  { key: 'max_context', target: 'root', mode: 'tc', section: 'tokens', type: 'stepper', presets: CTX_PRESETS, def: 8192 },
  { key: 'streaming', target: 'textgen', mode: 'tc', section: 'tokens', type: 'toggle', def: true },
  { key: 'openai_max_tokens', target: 'oai', mode: 'cc', section: 'tokens', type: 'slider', min: 16, max: 4096, step: 16, hardMax: 131072, def: 300 },
  { key: 'openai_max_context', target: 'oai', mode: 'cc', section: 'tokens', type: 'stepper', presets: CTX_PRESETS, def: 4095 },
  { key: 'stream_openai', target: 'oai', mode: 'cc', section: 'tokens', type: 'toggle', def: true },
  { key: 'seed', target: 'textgen', mode: 'tc', section: 'tokens', type: 'stepper', presets: [-1], def: -1, hint: true },
  { key: 'seed_oai', target: 'oai', mode: 'cc', section: 'tokens', type: 'stepper', presets: [-1], def: -1, hint: true },

  // ---- Sampling (TC) ----
  { key: 'temp', target: 'textgen', mode: 'tc', section: 'sampling', type: 'slider', min: 0, max: 5, step: 0.01, decimals: 2, def: 0.7 },
  { key: 'temperature_last', target: 'textgen', mode: 'tc', section: 'sampling', type: 'toggle', def: true, hint: true },
  { key: 'top_k', target: 'textgen', mode: 'tc', section: 'sampling', type: 'slider', min: -1, max: 500, step: 1, def: 40 },
  { key: 'top_p', target: 'textgen', mode: 'tc', section: 'sampling', type: 'slider', min: 0, max: 1, step: 0.01, decimals: 2, def: 0.5 },
  { key: 'min_p', target: 'textgen', mode: 'tc', section: 'sampling', type: 'slider', min: 0, max: 1, step: 0.001, decimals: 3, def: 0 },
  { key: 'typical_p', target: 'textgen', mode: 'tc', section: 'sampling', type: 'slider', min: 0, max: 1, step: 0.01, decimals: 2, def: 1 },
  { key: 'top_a', target: 'textgen', mode: 'tc', section: 'sampling', type: 'slider', min: 0, max: 1, step: 0.01, decimals: 2, def: 0 },
  { key: 'tfs', target: 'textgen', mode: 'tc', section: 'sampling', type: 'slider', min: 0, max: 1, step: 0.001, decimals: 3, def: 1 },
  { key: 'nsigma', target: 'textgen', mode: 'tc', section: 'sampling', type: 'slider', min: 0, max: 5, step: 0.01, decimals: 2, def: 0 },
  { key: 'smoothing_factor', target: 'textgen', mode: 'tc', section: 'sampling', type: 'slider', min: 0, max: 10, step: 0.01, decimals: 2, def: 0, hint: true },
  { key: 'smoothing_curve', target: 'textgen', mode: 'tc', section: 'sampling', type: 'slider', min: 1, max: 10, step: 0.01, decimals: 2, def: 1 },

  // ---- Sampling (CC) ----
  { key: 'temp_openai', target: 'oai', mode: 'cc', section: 'sampling', type: 'slider', min: 0, max: 2, step: 0.01, decimals: 2, def: 1 },
  { key: 'top_p_openai', target: 'oai', mode: 'cc', section: 'sampling', type: 'slider', min: 0, max: 1, step: 0.01, decimals: 2, def: 1 },
  { key: 'top_k_openai', target: 'oai', mode: 'cc', section: 'sampling', type: 'slider', min: 0, max: 500, step: 1, def: 0 },
  { key: 'top_a_openai', target: 'oai', mode: 'cc', section: 'sampling', type: 'slider', min: 0, max: 1, step: 0.01, decimals: 2, def: 0 },
  { key: 'min_p_openai', target: 'oai', mode: 'cc', section: 'sampling', type: 'slider', min: 0, max: 1, step: 0.001, decimals: 3, def: 0 },

  // ---- Penalties ----
  { key: 'rep_pen', target: 'textgen', mode: 'tc', section: 'penalties', type: 'slider', min: 1, max: 3, step: 0.01, decimals: 2, def: 1.2 },
  { key: 'rep_pen_range', target: 'textgen', mode: 'tc', section: 'penalties', type: 'slider', min: 0, max: 8192, step: 1, hardMax: 131072, def: 0 },
  { key: 'rep_pen_slope', target: 'textgen', mode: 'tc', section: 'penalties', type: 'slider', min: 0, max: 10, step: 0.1, decimals: 1, def: 1 },
  { key: 'freq_pen', target: 'textgen', mode: 'tc', section: 'penalties', type: 'slider', min: -2, max: 2, step: 0.01, decimals: 2, def: 0 },
  { key: 'presence_pen', target: 'textgen', mode: 'tc', section: 'penalties', type: 'slider', min: -2, max: 2, step: 0.01, decimals: 2, def: 0 },
  { key: 'no_repeat_ngram_size', target: 'textgen', mode: 'tc', section: 'penalties', type: 'slider', min: 0, max: 20, step: 1, def: 0 },
  { key: 'freq_pen_openai', target: 'oai', mode: 'cc', section: 'penalties', type: 'slider', min: -2, max: 2, step: 0.01, decimals: 2, def: 0 },
  { key: 'pres_pen_openai', target: 'oai', mode: 'cc', section: 'penalties', type: 'slider', min: -2, max: 2, step: 0.01, decimals: 2, def: 0 },
  { key: 'repetition_penalty_openai', target: 'oai', mode: 'cc', section: 'penalties', type: 'slider', min: 1, max: 2, step: 0.01, decimals: 2, def: 1 },

  // ---- Dynamic temperature (TC) ----
  { key: 'dynatemp', target: 'textgen', mode: 'tc', section: 'dynatemp', type: 'toggle', def: false, hint: true },
  { key: 'min_temp', target: 'textgen', mode: 'tc', section: 'dynatemp', type: 'slider', min: 0, max: 5, step: 0.01, decimals: 2, def: 0, showIf: { key: 'dynatemp', equals: true } },
  { key: 'max_temp', target: 'textgen', mode: 'tc', section: 'dynatemp', type: 'slider', min: 0, max: 5, step: 0.01, decimals: 2, def: 2, showIf: { key: 'dynatemp', equals: true } },
  { key: 'dynatemp_exponent', target: 'textgen', mode: 'tc', section: 'dynatemp', type: 'slider', min: 0.01, max: 10, step: 0.01, decimals: 2, def: 1, showIf: { key: 'dynatemp', equals: true } },

  // ---- Mirostat (TC) ----
  { key: 'mirostat_mode', target: 'textgen', mode: 'tc', section: 'mirostat', type: 'segmented', options: [{ value: 0, label: 'Off' }, { value: 1, label: 'V1' }, { value: 2, label: 'V2' }], def: 0, hint: true },
  { key: 'mirostat_tau', target: 'textgen', mode: 'tc', section: 'mirostat', type: 'slider', min: 0, max: 20, step: 0.01, decimals: 2, def: 5, showIf: { key: 'mirostat_mode', equals: 'nonzero' } },
  { key: 'mirostat_eta', target: 'textgen', mode: 'tc', section: 'mirostat', type: 'slider', min: 0, max: 1, step: 0.01, decimals: 2, def: 0.1, showIf: { key: 'mirostat_mode', equals: 'nonzero' } },

  // ---- DRY (TC) ----
  { key: 'dry_multiplier', target: 'textgen', mode: 'tc', section: 'dry', type: 'slider', min: 0, max: 5, step: 0.01, decimals: 2, def: 0, hint: true },
  { key: 'dry_base', target: 'textgen', mode: 'tc', section: 'dry', type: 'slider', min: 1, max: 4, step: 0.01, decimals: 2, def: 1.75 },
  { key: 'dry_allowed_length', target: 'textgen', mode: 'tc', section: 'dry', type: 'slider', min: 1, max: 20, step: 1, def: 2 },
  { key: 'dry_penalty_last_n', target: 'textgen', mode: 'tc', section: 'dry', type: 'slider', min: 0, max: 8192, step: 1, def: 0 },
  { key: 'dry_sequence_breakers', target: 'textgen', mode: 'tc', section: 'dry', type: 'textarea', jsonArray: true, def: '["\\n", ":", "\\"", "*"]', hint: true },

  // ---- XTC (TC) ----
  { key: 'xtc_threshold', target: 'textgen', mode: 'tc', section: 'xtc', type: 'slider', min: 0, max: 0.5, step: 0.01, decimals: 2, def: 0.1 },
  { key: 'xtc_probability', target: 'textgen', mode: 'tc', section: 'xtc', type: 'slider', min: 0, max: 1, step: 0.01, decimals: 2, def: 0, hint: true },

  // ---- CFG (TC) ----
  { key: 'guidance_scale', target: 'textgen', mode: 'tc', section: 'cfg', type: 'slider', min: 0.1, max: 4, step: 0.05, decimals: 2, def: 1, hint: true },
  { key: 'negative_prompt', target: 'textgen', mode: 'tc', section: 'cfg', type: 'textarea', def: '' },

  // ---- Advanced / exotics ----
  { key: 'sampler_order', target: 'textgen', mode: 'tc', section: 'advanced', type: 'order', def: KOBOLDCPP_ORDER, hint: true },
  { key: 'grammar_string', target: 'textgen', mode: 'tc', section: 'advanced', type: 'textarea', def: '', hint: true },
  { key: 'banned_tokens', target: 'textgen', mode: 'tc', section: 'advanced', type: 'textarea', def: '', hint: true },
  { key: 'send_banned_tokens', target: 'textgen', mode: 'tc', section: 'advanced', type: 'toggle', def: true },
  { key: 'ban_eos_token', target: 'textgen', mode: 'tc', section: 'advanced', type: 'toggle', def: false },
  { key: 'add_bos_token', target: 'textgen', mode: 'tc', section: 'advanced', type: 'toggle', def: true },
  { key: 'skip_special_tokens', target: 'textgen', mode: 'tc', section: 'advanced', type: 'toggle', def: true },
  { key: 'n', target: 'oai', mode: 'cc', section: 'advanced', type: 'slider', min: 1, max: 5, step: 1, def: 1 },
  { key: 'squash_system_messages', target: 'oai', mode: 'cc', section: 'advanced', type: 'toggle', def: false, hint: true },
  {
    key: 'names_behavior', target: 'oai', mode: 'cc', section: 'advanced', type: 'segmented', def: 0, hint: true,
    options: [
      { value: -1, label: 'None' },
      { value: 0, label: 'Default' },
      { value: 1, label: 'Completion' },
      { value: 2, label: 'Content' },
    ],
  },
  {
    key: 'reasoning_effort', target: 'oai', mode: 'cc', section: 'advanced', type: 'segmented', def: 'medium',
    options: [
      { value: 'auto', label: 'Auto' },
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Med' },
      { value: 'high', label: 'High' },
      { value: 'max', label: 'Max' },
    ],
  },
  { key: 'show_thoughts', target: 'oai', mode: 'cc', section: 'advanced', type: 'toggle', def: true },
];

export const GEN_SECTIONS: GenSection[] = [
  'tokens',
  'sampling',
  'penalties',
  'dynatemp',
  'mirostat',
  'dry',
  'xtc',
  'cfg',
  'advanced',
];

/** Settings-object key for a field ('seed_oai' is screen-unique but writes oai.seed). */
export function settingsKey(field: GenField): string {
  return field.key === 'seed_oai' ? 'seed' : field.key;
}
