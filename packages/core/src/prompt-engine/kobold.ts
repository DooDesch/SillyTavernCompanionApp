import type { Identity } from './types';
import { substituteParams } from './substituteParams';

/**
 * KoboldAI Classic (main_api 'kobold') request building, ported 1:1 from desktop
 * SillyTavern's public/scripts/kai-settings.js. The ST server proxies the body to
 * `{api_server}/extra/generate/stream` (SSE) or `{api_server}/v1/generate` depending
 * on `body.streaming` (src/endpoints/backends/kobold.js).
 */

export const KOBOLD_GENERATE_PATH = '/api/backends/kobold/generate';

/** kai_settings shape (kai-settings.js defaults). */
export interface KaiSettings {
  temp: number;
  rep_pen: number;
  rep_pen_range: number;
  top_p: number;
  min_p: number;
  top_a: number;
  top_k: number;
  typical: number;
  tfs: number;
  rep_pen_slope: number;
  streaming_kobold: boolean;
  sampler_order: number[];
  mirostat: number;
  mirostat_tau: number;
  mirostat_eta: number;
  use_default_badwordsids: boolean;
  grammar: string;
  seed: number;
  api_server: string;
  preset_settings: string;
  [key: string]: unknown;
}

/** Desktop kai_settings defaults (kai-settings.js:28-50). */
export const KAI_DEFAULT_SETTINGS: Readonly<KaiSettings> = Object.freeze({
  temp: 1,
  rep_pen: 1,
  rep_pen_range: 0,
  top_p: 1,
  min_p: 0,
  top_a: 1,
  top_k: 0,
  typical: 1,
  tfs: 1,
  rep_pen_slope: 0.9,
  streaming_kobold: false,
  sampler_order: [0, 1, 2, 3, 4, 5, 6],
  mirostat: 0,
  mirostat_tau: 5.0,
  mirostat_eta: 0.1,
  use_default_badwordsids: false,
  grammar: '',
  seed: -1,
  api_server: '',
  preset_settings: 'gui',
});

/**
 * Backfill desktop defaults into a raw kai_settings block, mirroring
 * loadKoboldSettingsFromPreset's `preset[name] ?? defaultValues[name]`.
 */
export function normalizeKaiSettings(raw: Record<string, unknown>): KaiSettings {
  const out: Record<string, unknown> = { ...raw };
  for (const [key, value] of Object.entries(KAI_DEFAULT_SETTINGS)) {
    out[key] = raw[key] ?? value;
  }
  return out as KaiSettings;
}

/**
 * Feature gates for the KoboldAI backend (kai_flags). Stable KoboldAI United rejects
 * payload keys it does not know, so each gated key is dropped below its minimum version.
 */
export interface KaiFlags {
  can_use_tokenization: boolean;
  can_use_stop_sequence: boolean;
  can_use_streaming: boolean;
  can_use_default_badwordsids: boolean;
  can_use_mirostat: boolean;
  can_use_grammar: boolean;
  can_use_min_p: boolean;
}

const MIN_STOP_SEQUENCE_VERSION = '1.2.2';
const MIN_UNBAN_VERSION = '1.2.4';
const MIN_STREAMING_KCPPVERSION = '1.30';
const MIN_TOKENIZATION_KCPPVERSION = '1.41';
const MIN_MIROSTAT_KCPPVERSION = '1.35';
const MIN_GRAMMAR_KCPPVERSION = '1.44';
const MIN_MIN_P_KCPPVERSION = '1.48';

/**
 * True when srcVersion >= minVersion. Inlined port of desktop's `versionCompare`
 * (utils.js), which uses `localeCompare(..., { numeric: true })`: digit runs compare
 * numerically and digits collate BEFORE letters. The letter rule matters in practice -
 * the ST server reports `koboldCppVersion: 'KoboldCpp'` (the /extra/version `result`
 * field), which must compare GREATER than any numeric gate so all KoboldCpp features
 * unlock, exactly like desktop.
 */
export function versionCompare(srcVersion: string | null | undefined, minVersion: string): boolean {
  const a = String(srcVersion || '0.0.0').split('.');
  const b = String(minVersion).split('.');
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i];
    const y = b[i];
    if (x === undefined) return false; // shorter + equal so far -> smaller ("1.2" < "1.2.2")
    if (y === undefined) return true; // longer -> bigger ("1.48.1" >= "1.48")
    if (x === y) continue;
    const nx = /^\d+$/.test(x) ? Number(x) : NaN;
    const ny = /^\d+$/.test(y) ? Number(y) : NaN;
    if (!Number.isNaN(nx) && !Number.isNaN(ny)) {
      if (nx !== ny) return nx > ny;
      continue; // "01" vs "1" - numerically equal
    }
    if (!Number.isNaN(nx)) return false; // numeric < non-numeric
    if (!Number.isNaN(ny)) return true; // non-numeric > numeric ("KoboldCpp" >= "1.30")
    return x > y;
  }
  return true; // equal
}

/** Port of `setKoboldFlags` (kai-settings.js:379-389) without the DOM side-effects. */
export function computeKaiFlags(
  koboldUnitedVersion: string | undefined,
  koboldCppVersion: string | undefined,
): KaiFlags {
  return {
    can_use_stop_sequence: versionCompare(koboldUnitedVersion, MIN_STOP_SEQUENCE_VERSION),
    can_use_streaming: versionCompare(koboldCppVersion, MIN_STREAMING_KCPPVERSION),
    can_use_tokenization: versionCompare(koboldCppVersion, MIN_TOKENIZATION_KCPPVERSION),
    can_use_default_badwordsids: versionCompare(koboldUnitedVersion, MIN_UNBAN_VERSION),
    can_use_mirostat: versionCompare(koboldCppVersion, MIN_MIROSTAT_KCPPVERSION),
    can_use_grammar: versionCompare(koboldCppVersion, MIN_GRAMMAR_KCPPVERSION),
    can_use_min_p: versionCompare(koboldCppVersion, MIN_MIN_P_KCPPVERSION),
  };
}

export interface KoboldGenerationDataOptions {
  /** Final assembled text prompt. */
  finalPrompt: string;
  /** Normalized kai_settings (run through normalizeKaiSettings). */
  kai: KaiSettings;
  /**
   * The resolved named preset, or null for the GUI preset. Only `sampler_order` is read
   * from it (desktop: `kai_settings.sampler_order || settings.sampler_order`); null
   * selects the short `gui_settings: true` body built at the desktop call site
   * (script.js:5199-5205).
   */
  preset: Record<string, unknown> | null;
  flags: KaiFlags;
  maxLength: number;
  maxContextLength: number;
  /** True for AI Horde - forces the version-gated keys open (desktop `|| isHorde`). */
  isHorde: boolean;
  /** Desktop generation type ('continue' | 'impersonate' | 'quiet' | ...). */
  type?: string | undefined;
  /** Stopping strings (desktop computes them via getStoppingStrings at this point). */
  stoppingStrings: string[];
  apiServer: string;
  /** When set, the grammar string runs through substituteParams like desktop. */
  identity?: Identity | undefined;
}

/**
 * Port of `getKoboldGenerationData` (kai-settings.js:174-210) plus the GUI short body
 * from the script.js call site. Key ORDER matches desktop exactly; `undefined` values
 * are deleted so JSON.stringify output is byte-identical to desktop's.
 */
export function createKoboldGenerationData(opts: KoboldGenerationDataOptions): Record<string, unknown> {
  const { kai, flags, type } = opts;

  if (opts.preset === null) {
    // GUI KoboldAI Settings preset: the backend supplies its own samplers.
    return {
      prompt: opts.finalPrompt,
      gui_settings: true,
      max_length: opts.maxLength,
      max_context_length: opts.maxContextLength,
      api_server: opts.apiServer,
    };
  }

  const isContinue = type === 'continue';
  const samplerOrder = kai.sampler_order || (opts.preset['sampler_order'] as number[] | undefined);
  const grammar =
    opts.identity !== undefined ? substituteParams(kai.grammar, { identity: opts.identity }) : kai.grammar;

  const generateData: Record<string, unknown> = {
    prompt: opts.finalPrompt,
    gui_settings: false,
    sampler_order: samplerOrder,
    max_context_length: Number(opts.maxContextLength),
    max_length: opts.maxLength,
    rep_pen: Number(kai.rep_pen),
    rep_pen_range: Number(kai.rep_pen_range),
    rep_pen_slope: kai.rep_pen_slope,
    temperature: Number(kai.temp),
    tfs: kai.tfs,
    top_a: kai.top_a,
    top_k: kai.top_k,
    top_p: kai.top_p,
    min_p: flags.can_use_min_p || opts.isHorde ? kai.min_p : undefined,
    typical: kai.typical,
    use_world_info: false,
    singleline: false,
    stop_sequence: flags.can_use_stop_sequence || opts.isHorde ? opts.stoppingStrings : undefined,
    streaming: Boolean(kai.streaming_kobold) && flags.can_use_streaming && type !== 'quiet',
    can_abort: flags.can_use_streaming,
    mirostat: flags.can_use_mirostat || opts.isHorde ? kai.mirostat : undefined,
    mirostat_tau: flags.can_use_mirostat || opts.isHorde ? kai.mirostat_tau : undefined,
    mirostat_eta: flags.can_use_mirostat || opts.isHorde ? kai.mirostat_eta : undefined,
    use_default_badwordsids:
      flags.can_use_default_badwordsids || opts.isHorde ? kai.use_default_badwordsids : undefined,
    grammar: flags.can_use_grammar || opts.isHorde ? grammar : undefined,
    grammar_retain_state: flags.can_use_grammar && !!isContinue ? true : undefined,
    sampler_seed: kai.seed >= 0 ? kai.seed : undefined,
    api_server: opts.apiServer,
  };

  // Desktop relies on JSON.stringify dropping undefined values; delete for byte parity.
  for (const key of Object.keys(generateData)) {
    if (generateData[key] === undefined) delete generateData[key];
  }
  return generateData;
}
