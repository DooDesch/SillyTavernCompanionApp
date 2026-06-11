import type { Identity, PowerUserSubset } from './types';
import type { TextgenSettings } from './textgenBody';
import type { OaiSettings } from './chatcompletion/types';
import { normalizeMainApi, type MainApi } from './apiMap';

/**
 * Raw per-backend settings block (kai_settings / nai_settings / horde_settings).
 * The per-backend modules (kobold.ts / novelai.ts / horde.ts) type their own views
 * and cast at the boundary, so this stays a permissive bag.
 */
export type BackendSettingsBlock = Record<string, unknown>;

/**
 * Engine configuration extracted from the parsed `/api/settings/get` settings object
 * (the `settings` field of that response is a JSON string - parse it first).
 */
export interface EngineConfig {
  power: PowerUserSubset;
  textgen: TextgenSettings;
  /** Chat-completion settings (used when mode === 'cc'). */
  oai: OaiSettings;
  /** KoboldAI Classic settings (desktop: settings.kai_settings, legacy fallback root). */
  kai: BackendSettingsBlock;
  /** NovelAI settings (desktop: settings.nai_settings, legacy fallback root). */
  nai: BackendSettingsBlock;
  /** AI Horde settings (desktop: settings.horde_settings). */
  horde: BackendSettingsBlock;
  /**
   * Convenience derivation of mainApi: 'cc' iff mainApi === 'openai'. Prefer routing on
   * `mainApi`; mode remains for prompt-shape decisions (tc prompt vs cc messages).
   */
  mode: 'tc' | 'cc';
  identity: Identity;
  maxContext: number;
  maxTokens: number;
  /** Desktop main_api routing key. */
  mainApi: MainApi;
  /** Backend URL to forward generation to (api_server), overriding textgen.server_urls. */
  apiServerOverride?: string;
  /**
   * NovelAI preset collection from the /api/settings/get RESPONSE ROOT (not the parsed
   * settings string): an array of RAW JSON strings plus the parallel names array. Populated
   * by the app layer; resolved via presetsByName for the nai order fallback.
   */
  novelaiSettings?: unknown;
  novelaiSettingNames?: unknown;
}

interface RawSettings {
  main_api?: string;
  user_avatar?: string;
  amount_gen?: number;
  max_context?: number;
  power_user?: PowerUserSubset & { personas?: Record<string, string> };
  textgenerationwebui_settings?: TextgenSettings;
  oai_settings?: OaiSettings;
  kai_settings?: Record<string, unknown>;
  nai_settings?: Record<string, unknown>;
  horde_settings?: Record<string, unknown>;
  [key: string]: unknown;
}

export function extractEngineConfig(parsed: RawSettings, charName: string): EngineConfig {
  const power = (parsed.power_user ?? {}) as PowerUserSubset & { personas?: Record<string, string> };
  const textgen = (parsed.textgenerationwebui_settings ?? { type: 'koboldcpp' }) as TextgenSettings;
  const oai = (parsed.oai_settings ?? { chat_completion_source: 'openai' }) as OaiSettings;
  // Desktop fallbacks (script.js loadKoboldSettings/loadNovelSettings): legacy saves kept
  // these at the settings root.
  const kai = (parsed.kai_settings ?? parsed) as BackendSettingsBlock;
  const nai = (parsed.nai_settings ?? parsed) as BackendSettingsBlock;
  const horde = (parsed.horde_settings ?? {}) as BackendSettingsBlock;
  const userAvatar = parsed.user_avatar ?? '';
  const userName = power.personas?.[userAvatar] || 'User';
  const mainApi = normalizeMainApi(parsed.main_api);

  return {
    power,
    textgen,
    oai,
    kai,
    nai,
    horde,
    mode: mainApi === 'openai' ? 'cc' : 'tc',
    identity: { user: userName, char: charName },
    maxContext: Number(parsed.max_context) || 16384,
    maxTokens: Number(parsed.amount_gen) || 512,
    mainApi,
  };
}

/** A simple, dependency-free token estimate used when the ST tokenizer endpoint isn't wired up. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

export interface Persona {
  /** Persona avatar filename (the id). */
  avatar: string;
  name: string;
  description: string;
}

export interface PersonaList {
  personas: Persona[];
  activeAvatar?: string;
}

/** Extract the user personas (power_user.personas + persona_descriptions) and the active one. */
export function extractPersonas(parsed: Record<string, unknown>): PersonaList {
  const pu = (parsed.power_user ?? {}) as {
    personas?: Record<string, string>;
    persona_descriptions?: Record<string, { description?: string }>;
  };
  const names = pu.personas ?? {};
  const descriptions = pu.persona_descriptions ?? {};
  const personas: Persona[] = Object.entries(names).map(([avatar, name]) => ({
    avatar,
    name: String(name),
    description: descriptions[avatar]?.description ?? '',
  }));
  return { personas, activeAvatar: parsed.user_avatar ? String(parsed.user_avatar) : undefined };
}

/** Apply a chosen persona to an engine config (overrides name1 + persona description). */
export function applyPersonaToConfig(config: EngineConfig, persona: Persona): EngineConfig {
  return {
    ...config,
    identity: { ...config.identity, user: persona.name },
    power: { ...config.power, persona_description: persona.description },
  };
}
