/**
 * Builds the request body for `/api/backends/text-completions/generate`, faithfully mapping the
 * KoboldCpp-relevant subset of SillyTavern's `createTextGenGenerationData`
 * (public/scripts/textgen-settings.js). `api_server` tells the ST server which backend to proxy to.
 */

export interface TextgenSettings {
  type: string;
  temp?: number;
  top_p?: number;
  top_k?: number;
  top_a?: number;
  typical_p?: number;
  min_p?: number;
  tfs?: number;
  rep_pen?: number;
  rep_pen_range?: number;
  rep_pen_slope?: number;
  freq_pen?: number;
  presence_pen?: number;
  mirostat_mode?: number;
  mirostat_tau?: number;
  mirostat_eta?: number;
  smoothing_factor?: number;
  smoothing_curve?: number;
  dynatemp?: boolean;
  min_temp?: number;
  max_temp?: number;
  dynatemp_exponent?: number;
  dry_allowed_length?: number;
  dry_multiplier?: number;
  dry_base?: number;
  dry_penalty_last_n?: number;
  dry_sequence_breakers?: string;
  xtc_threshold?: number;
  xtc_probability?: number;
  nsigma?: number;
  sampler_order?: number[];
  seed?: number;
  ban_eos_token?: boolean;
  skip_special_tokens?: boolean;
  add_bos_token?: boolean;
  temperature_last?: boolean;
  no_repeat_ngram_size?: number;
  banned_tokens?: string;
  send_banned_tokens?: boolean;
  grammar_string?: string;
  min_length?: number;
  guidance_scale?: number;
  negative_prompt?: string;
  streaming?: boolean;
  server_urls?: Record<string, string>;
  [key: string]: unknown;
}

export interface TextgenBodyOptions {
  prompt: string;
  maxTokens: number;
  maxContext: number;
  stoppingStrings: string[];
  stream: boolean;
  isContinue?: boolean;
  /** Override the backend URL (api_server) - e.g. from the active connection profile. */
  apiServerOverride?: string;
}

function parseSequenceBreakers(raw: string | undefined): string[] | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return typeof raw === 'string' ? raw.split(',') : undefined;
  }
}

export function getTextgenServer(settings: TextgenSettings): string {
  return settings.server_urls?.[settings.type] ?? '';
}

/**
 * Port of ST's getCustomTokenBans (textgen-settings.js): one entry per line of
 * `banned_tokens`; `[1,2,3]` lines are raw token ids, `"quoted"` lines are banned
 * strings. DEVIATION: ST tokenizes bare-text lines client-side - the app has no local
 * tokenizer, so bare text is sent as a banned string instead (KoboldCpp bans the
 * sequence either way). Only applies when `send_banned_tokens` is true.
 */
export function parseBannedTokens(settings: TextgenSettings): {
  custom_token_bans?: string;
  banned_strings?: string[];
} {
  if (settings.send_banned_tokens !== true || !settings.banned_tokens) return {};
  const ids: number[] = [];
  const strings: string[] = [];
  for (const raw of settings.banned_tokens.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('[') && line.endsWith(']')) {
      try {
        const tokens: unknown = JSON.parse(line);
        if (Array.isArray(tokens) && tokens.every((t) => Number.isInteger(t))) {
          ids.push(...(tokens as number[]));
          continue;
        }
      } catch {
        // fall through to string handling
      }
      strings.push(line);
    } else if (line.startsWith('"') && line.endsWith('"') && line.length >= 2) {
      strings.push(line.slice(1, -1));
    } else {
      strings.push(line);
    }
  }
  return {
    ...(ids.length ? { custom_token_bans: [...new Set(ids)].join(',') } : {}),
    ...(strings.length ? { banned_strings: strings } : {}),
  };
}

export function createTextgenBody(settings: TextgenSettings, opts: TextgenBodyOptions): Record<string, unknown> {
  const dynatemp = settings.dynatemp === true;
  const temperature = dynatemp ? ((settings.min_temp ?? 0) + (settings.max_temp ?? 0)) / 2 : settings.temp;

  const body: Record<string, unknown> = {
    prompt: opts.prompt,
    max_new_tokens: opts.maxTokens,
    max_tokens: opts.maxTokens,
    max_length: opts.maxTokens,
    temperature,
    top_p: settings.top_p,
    top_k: settings.top_k,
    top_a: settings.top_a,
    typical: settings.typical_p,
    typical_p: settings.typical_p,
    min_p: settings.min_p,
    tfs: settings.tfs,
    rep_pen: settings.rep_pen,
    repetition_penalty: settings.rep_pen,
    rep_pen_range: settings.rep_pen_range,
    repetition_penalty_range: settings.rep_pen_range,
    rep_pen_slope: settings.rep_pen_slope,
    frequency_penalty: settings.freq_pen,
    presence_penalty: settings.presence_pen,
    mirostat: settings.mirostat_mode,
    mirostat_mode: settings.mirostat_mode,
    mirostat_tau: settings.mirostat_tau,
    mirostat_eta: settings.mirostat_eta,
    smoothing_factor: settings.smoothing_factor,
    smoothing_curve: settings.smoothing_curve,
    dynamic_temperature: dynatemp ? true : undefined,
    dynatemp_low: dynatemp ? settings.min_temp : undefined,
    dynatemp_high: dynatemp ? settings.max_temp : undefined,
    dynatemp_range: dynatemp ? ((settings.max_temp ?? 0) - (settings.min_temp ?? 0)) / 2 : undefined,
    dynatemp_exponent: dynatemp ? settings.dynatemp_exponent : undefined,
    dry_allowed_length: settings.dry_allowed_length,
    dry_multiplier: settings.dry_multiplier,
    dry_base: settings.dry_base,
    dry_penalty_last_n: settings.dry_penalty_last_n,
    dry_sequence_breakers: parseSequenceBreakers(settings.dry_sequence_breakers),
    xtc_threshold: settings.xtc_threshold,
    xtc_probability: settings.xtc_probability,
    nsigma: settings.nsigma,
    top_n_sigma: settings.nsigma,
    sampler_order: settings.sampler_order,
    sampler_seed: settings.seed !== undefined && settings.seed >= 0 ? settings.seed : undefined,
    seed: settings.seed !== undefined && settings.seed >= 0 ? settings.seed : undefined,
    min_tokens: settings.min_length,
    guidance_scale: settings.guidance_scale ?? 1,
    negative_prompt: settings.negative_prompt ?? '',
    ban_eos_token: settings.ban_eos_token,
    skip_special_tokens: settings.skip_special_tokens,
    add_bos_token: settings.add_bos_token,
    temperature_last: settings.temperature_last,
    no_repeat_ngram_size: settings.no_repeat_ngram_size,
    ...parseBannedTokens(settings),
    grammar: settings.grammar_string || undefined,
    truncation_length: opts.maxContext,
    stop: opts.stoppingStrings,
    stopping_strings: opts.stoppingStrings,
    trim_stop: true,
    api_type: settings.type,
    api_server: opts.apiServerOverride || getTextgenServer(settings),
    stream: opts.stream,
  };

  // Drop undefined keys so the payload matches ST (which omits them via JSON.stringify).
  for (const key of Object.keys(body)) {
    if (body[key] === undefined) delete body[key];
  }
  return body;
}
