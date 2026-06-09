import type { EngineConfig } from './settings';
import type { ContextSettings, InstructSettings, SyspromptSettings } from './types';
import type { TextgenSettings } from './textgenBody';
import type { OaiSettings } from './chatcompletion/types';

/**
 * SillyTavern Connection Profile (power_user.connectionManager.profiles[]). Each profile bundles a
 * backend (api + api-url) with named instruct/context/sysprompt templates and a sampler preset.
 */
export interface ConnectionProfile {
  id: string;
  name: string;
  mode?: string; // 'tc' = text completion, 'cc' = chat completion
  api?: string;
  apiUrl?: string;
  preset?: string;
  instruct?: string;
  context?: string;
  sysprompt?: string;
  syspromptState?: boolean;
  instructState?: boolean;
  reasoningTemplate?: string;
}

export interface ConnectionProfiles {
  profiles: ConnectionProfile[];
  selectedId?: string;
}

function findConnectionManager(parsed: Record<string, unknown>): { selectedProfile?: string; profiles?: unknown[] } | undefined {
  const candidates = [
    parsed.connectionManager,
    (parsed.power_user as Record<string, unknown> | undefined)?.connectionManager,
    (parsed.extension_settings as Record<string, unknown> | undefined)?.connectionManager,
  ];
  return candidates.find((c) => c && typeof c === 'object') as
    | { selectedProfile?: string; profiles?: unknown[] }
    | undefined;
}

/** Read the connection profiles from a parsed settings object. */
export function extractConnectionProfiles(parsed: Record<string, unknown>): ConnectionProfiles {
  const cm = findConnectionManager(parsed);
  if (!cm || !Array.isArray(cm.profiles)) return { profiles: [] };
  const profiles = cm.profiles.map((entry): ConnectionProfile => {
    const raw = entry as Record<string, any>;
    return {
    id: String(raw.id),
    name: String(raw.name ?? raw.id),
    mode: raw.mode,
    api: raw.api,
    apiUrl: raw['api-url'],
    preset: raw.preset,
    instruct: raw.instruct,
    context: raw.context,
    sysprompt: raw.sysprompt,
    syspromptState: raw['sysprompt-state'] === 'true',
    instructState: raw['instruct-state'] !== 'false',
    reasoningTemplate: raw['reasoning-template'],
    };
  });
  return { profiles, selectedId: cm.selectedProfile ? String(cm.selectedProfile) : undefined };
}

interface SettingsResponseArrays {
  instruct?: Array<InstructSettings & { name?: string }>;
  context?: Array<ContextSettings & { name?: string }>;
  sysprompt?: Array<{ name?: string; content?: string; post_history?: string }>;
  textgenerationwebui_presets?: Array<Partial<TextgenSettings>>;
  textgenerationwebui_preset_names?: string[];
  openai_settings?: Array<Partial<OaiSettings>>;
  openai_setting_names?: string[];
}

const byName = <T extends { name?: string }>(arr: T[] | undefined, name?: string): T | undefined =>
  name && Array.isArray(arr) ? arr.find((x) => x.name === name) : undefined;

/**
 * Apply a connection profile to an engine config by resolving its named templates/preset from the
 * `/api/settings/get` response arrays. Purely client-side — does not modify the server settings.
 */
export function applyProfileToConfig(
  config: EngineConfig,
  profile: ConnectionProfile,
  response: SettingsResponseArrays,
): EngineConfig {
  const next: EngineConfig = {
    ...config,
    power: { ...config.power },
    textgen: { ...config.textgen },
    oai: { ...config.oai },
    mode: profile.mode === 'cc' ? 'cc' : 'tc',
  };

  // Chat-completion profile: pick the source + apply the named OpenAI preset (samplers + prompts).
  if (profile.mode === 'cc') {
    if (profile.api) next.oai.chat_completion_source = profile.api;
    if (profile.preset && Array.isArray(response.openai_setting_names)) {
      const idx = response.openai_setting_names.indexOf(profile.preset);
      const preset = idx >= 0 ? response.openai_settings?.[idx] : undefined;
      if (preset) next.oai = { ...next.oai, ...preset, chat_completion_source: profile.api ?? next.oai.chat_completion_source };
    }
  }

  const instructTemplate = byName(response.instruct, profile.instruct);
  if (instructTemplate) {
    next.power.instruct = { ...instructTemplate, enabled: profile.instructState ?? true } as InstructSettings;
  }

  const contextTemplate = byName(response.context, profile.context);
  if (contextTemplate) {
    next.power.context = { ...contextTemplate } as ContextSettings;
  }

  const syspromptTemplate = byName(response.sysprompt, profile.sysprompt);
  if (syspromptTemplate) {
    next.power.sysprompt = {
      enabled: profile.syspromptState ?? true,
      content: syspromptTemplate.content ?? '',
      post_history: syspromptTemplate.post_history ?? '',
    } as SyspromptSettings;
  } else if (profile.syspromptState === false) {
    next.power.sysprompt = { ...next.power.sysprompt, enabled: false };
  }

  if (profile.preset && Array.isArray(response.textgenerationwebui_preset_names)) {
    const idx = response.textgenerationwebui_preset_names.indexOf(profile.preset);
    const preset = idx >= 0 ? response.textgenerationwebui_presets?.[idx] : undefined;
    if (preset) {
      // Keep the live backend type + server URLs; take sampler values from the preset.
      next.textgen = { ...next.textgen, ...preset, type: config.textgen.type, server_urls: config.textgen.server_urls };
    }
  }

  if (profile.apiUrl) next.apiServerOverride = profile.apiUrl;

  return next;
}
