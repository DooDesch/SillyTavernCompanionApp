import { describe, expect, it } from 'vitest';
import {
  computeKaiFlags,
  createKoboldGenerationData,
  normalizeKaiSettings,
  versionCompare,
  KAI_DEFAULT_SETTINGS,
  KOBOLD_GENERATE_PATH,
  type KaiFlags,
} from './kobold';

const identity = { user: 'Dennis', char: 'Seraphina' };

/** A realistic kai_settings block (what /api/settings/get carries after preset selection). */
const KAI = normalizeKaiSettings({
  temp: 0.7,
  rep_pen: 1.1,
  rep_pen_range: 320,
  top_p: 0.92,
  min_p: 0.05,
  top_a: 0,
  top_k: 100,
  typical: 1,
  tfs: 1,
  rep_pen_slope: 0.9,
  streaming_kobold: true,
  sampler_order: [6, 0, 1, 3, 4, 2, 5],
  mirostat: 2,
  mirostat_tau: 5,
  mirostat_eta: 0.1,
  use_default_badwordsids: false,
  grammar: '',
  seed: -1,
  api_server: 'http://192.168.178.94:5001/api',
  preset_settings: 'Classic',
});

const PRESET = { sampler_order: [0, 1, 2, 3, 4, 5, 6] };
const STOPS = ['\nDennis:', '\nSeraphina:'];

const ALL_ON: KaiFlags = computeKaiFlags('1.2.5', 'KoboldCpp');
const ALL_OFF: KaiFlags = computeKaiFlags(undefined, undefined);

function build(over: Partial<Parameters<typeof createKoboldGenerationData>[0]> = {}) {
  return createKoboldGenerationData({
    finalPrompt: 'PROMPT',
    kai: KAI,
    preset: PRESET,
    flags: ALL_ON,
    maxLength: 250,
    maxContextLength: 4096,
    isHorde: false,
    stoppingStrings: STOPS,
    apiServer: 'http://192.168.178.94:5001/api',
    identity,
    ...over,
  });
}

describe('versionCompare', () => {
  it('compares numeric segments numerically (1.2.2 vs 1.30)', () => {
    expect(versionCompare('1.2.2', '1.30')).toBe(false);
    expect(versionCompare('1.30', '1.2.2')).toBe(true);
  });

  it('treats equal versions as >=', () => {
    expect(versionCompare('1.2.2', '1.2.2')).toBe(true);
    expect(versionCompare('1.48', '1.48')).toBe(true);
  });

  it('handles shorter/longer versions', () => {
    expect(versionCompare('1.2', '1.2.2')).toBe(false);
    expect(versionCompare('1.48.1', '1.48')).toBe(true);
  });

  it('falls back to 0.0.0 for empty input', () => {
    expect(versionCompare(undefined, '1.30')).toBe(false);
    expect(versionCompare('', '1.2.2')).toBe(false);
  });

  it('collates non-numeric after numeric (the koboldCppVersion="KoboldCpp" quirk)', () => {
    expect(versionCompare('KoboldCpp', '1.30')).toBe(true);
    expect(versionCompare('KoboldCpp', '1.48')).toBe(true);
  });

  it('compares the digit-run prefix of letter-suffixed segments numerically first', () => {
    // localeCompare({ numeric: true }) semantics: 29 < 30 decides before the 'b' tail.
    expect(versionCompare('1.29b', '1.30')).toBe(false);
    expect(versionCompare('1.30', '1.29b')).toBe(true);
    expect(versionCompare('1.2.3b', '1.2.4')).toBe(false);
    expect(versionCompare('1.2.4', '1.2.3b')).toBe(true);
    // A letter tail only breaks numeric ties ('29b' > '29').
    expect(versionCompare('1.29b', '1.29')).toBe(true);
    expect(versionCompare('1.29', '1.29b')).toBe(false);
    expect(versionCompare('1.29b', '1.29b')).toBe(true);
  });
});

describe('computeKaiFlags', () => {
  it('opens all gates for KoboldCpp (united 1.2.5 + "KoboldCpp" marker)', () => {
    expect(ALL_ON).toEqual({
      can_use_tokenization: true,
      can_use_stop_sequence: true,
      can_use_streaming: true,
      can_use_default_badwordsids: true,
      can_use_mirostat: true,
      can_use_grammar: true,
      can_use_min_p: true,
    });
  });

  it('closes all gates without versions', () => {
    expect(Object.values(ALL_OFF).every((v) => v === false)).toBe(true);
  });

  it('gates by united version (pre-1.2.2 / pre-1.2.4)', () => {
    const flags = computeKaiFlags('1.2.3', undefined);
    expect(flags.can_use_stop_sequence).toBe(true);
    expect(flags.can_use_default_badwordsids).toBe(false);
    expect(flags.can_use_streaming).toBe(false);
  });
});

describe('createKoboldGenerationData', () => {
  it('produces the desktop body byte-1:1 (all flags on)', () => {
    const body = build();
    // Key order + dropped keys must match desktop getKoboldGenerationData exactly.
    expect(JSON.stringify(body)).toBe(
      JSON.stringify({
        prompt: 'PROMPT',
        gui_settings: false,
        sampler_order: [6, 0, 1, 3, 4, 2, 5],
        max_context_length: 4096,
        max_length: 250,
        rep_pen: 1.1,
        rep_pen_range: 320,
        rep_pen_slope: 0.9,
        temperature: 0.7,
        tfs: 1,
        top_a: 0,
        top_k: 100,
        top_p: 0.92,
        min_p: 0.05,
        typical: 1,
        use_world_info: false,
        singleline: false,
        stop_sequence: STOPS,
        streaming: true,
        can_abort: true,
        mirostat: 2,
        mirostat_tau: 5,
        mirostat_eta: 0.1,
        use_default_badwordsids: false,
        grammar: '',
        api_server: 'http://192.168.178.94:5001/api',
      }),
    );
  });

  it('drops stop_sequence and badwordsids below united 1.2.2/1.2.4', () => {
    const body = build({ flags: computeKaiFlags('1.2.1', 'KoboldCpp') });
    expect(body).not.toHaveProperty('stop_sequence');
    expect(body).not.toHaveProperty('use_default_badwordsids');
    expect(body['streaming']).toBe(true); // KoboldCpp gate unaffected
  });

  it('builds the GUI short body (preset null) in desktop key order', () => {
    const body = build({ preset: null });
    expect(JSON.stringify(body)).toBe(
      JSON.stringify({
        prompt: 'PROMPT',
        gui_settings: true,
        max_length: 250,
        max_context_length: 4096,
        api_server: 'http://192.168.178.94:5001/api',
      }),
    );
  });

  it('omits sampler_seed for seed -1 and sends it for seed >= 0', () => {
    expect(build()).not.toHaveProperty('sampler_seed');
    const seeded = build({ kai: { ...KAI, seed: 1234 } });
    expect(seeded['sampler_seed']).toBe(1234);
    // sampler_seed sits directly before api_server, like desktop.
    const keys = Object.keys(seeded);
    expect(keys.indexOf('sampler_seed')).toBe(keys.indexOf('api_server') - 1);
  });

  it('isHorde forces the version gates open but never streaming/can_abort', () => {
    const body = build({ flags: ALL_OFF, isHorde: true });
    expect(body['min_p']).toBe(0.05);
    expect(body['stop_sequence']).toEqual(STOPS);
    expect(body['mirostat']).toBe(2);
    expect(body['mirostat_tau']).toBe(5);
    expect(body['mirostat_eta']).toBe(0.1);
    expect(body['use_default_badwordsids']).toBe(false);
    expect(body['grammar']).toBe('');
    expect(body['streaming']).toBe(false);
    expect(body['can_abort']).toBe(false);
    expect(body).not.toHaveProperty('grammar_retain_state');
  });

  it('suppresses streaming for quiet generations and sets grammar_retain_state on continue', () => {
    expect(build({ type: 'quiet' })['streaming']).toBe(false);
    const cont = build({ type: 'continue' });
    expect(cont['grammar_retain_state']).toBe(true);
    expect(cont['streaming']).toBe(true);
  });

  it('substitutes macros in the grammar string', () => {
    const body = build({ kai: { ...KAI, grammar: 'root ::= "{{user}}"' } });
    expect(body['grammar']).toBe('root ::= "Dennis"');
  });
});

describe('normalizeKaiSettings', () => {
  it('backfills desktop defaults for missing keys', () => {
    const kai = normalizeKaiSettings({ temp: 0.5 });
    expect(kai.temp).toBe(0.5);
    expect(kai.rep_pen_slope).toBe(KAI_DEFAULT_SETTINGS.rep_pen_slope);
    expect(kai.sampler_order).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(kai.preset_settings).toBe('gui');
    expect(kai.seed).toBe(-1);
  });
});

describe('KOBOLD_GENERATE_PATH', () => {
  it('targets the ST kobold proxy route', () => {
    expect(KOBOLD_GENERATE_PATH).toBe('/api/backends/kobold/generate');
  });
});
