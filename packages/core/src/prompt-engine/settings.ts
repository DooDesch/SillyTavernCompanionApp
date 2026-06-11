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
  /** persona_description_positions value (defaults to IN_PROMPT = 0). */
  position: number;
  /** In-chat injection depth (only meaningful for position AT_DEPTH = 4). */
  depth: number;
  /** extension_prompt_roles value: 0 system, 1 user, 2 assistant. */
  role: number;
  /** Display-only persona title. */
  title: string;
}

export interface PersonaList {
  personas: Persona[];
  activeAvatar?: string;
  /** power_user.default_persona - the persona used for new chats. */
  defaultPersona?: string;
}

/** Extract the user personas (power_user.personas + persona_descriptions), active + default. */
export function extractPersonas(parsed: Record<string, unknown>): PersonaList {
  const pu = (parsed.power_user ?? {}) as {
    personas?: Record<string, string>;
    persona_descriptions?: Record<
      string,
      { description?: string; position?: number; depth?: number; role?: number; title?: string }
    >;
    default_persona?: unknown;
  };
  const names = pu.personas ?? {};
  const descriptions = pu.persona_descriptions ?? {};
  const personas: Persona[] = Object.entries(names).map(([avatar, name]) => {
    const d = descriptions[avatar];
    return {
      avatar,
      name: String(name),
      description: d?.description ?? '',
      position: typeof d?.position === 'number' ? d.position : 0,
      depth: typeof d?.depth === 'number' ? d.depth : 2,
      role: typeof d?.role === 'number' ? d.role : 0,
      title: typeof d?.title === 'string' ? d.title : '',
    };
  });
  return {
    personas,
    activeAvatar: parsed.user_avatar ? String(parsed.user_avatar) : undefined,
    defaultPersona: typeof pu.default_persona === 'string' ? pu.default_persona : undefined,
  };
}

/** Apply a chosen persona to an engine config (overrides name1 + persona description). */
export function applyPersonaToConfig(config: EngineConfig, persona: Persona): EngineConfig {
  return {
    ...config,
    identity: { ...config.identity, user: persona.name },
    power: { ...config.power, persona_description: persona.description },
  };
}
