import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  applyBackendOverride,
  applyPersonaToConfig,
  applyProfileToConfig,
  extractConnectionProfiles,
  extractEngineConfig,
  extractPersonas,
  getSettings,
  type EngineConfig,
} from '@st/core';
import { useConnection } from '@/stores/connectionStore';
import { useProfiles, type StoredBackendOverride } from '@/stores/profilesStore';
import { parseStSettings } from '@/lib/settings';

/**
 * Apply the backend picked in the app. A migrated legacy KoboldCpp URL only replaces the URL of a
 * KoboldCpp text-completion config, like before; every other override switches the backend.
 */
export function withBackendOverride(config: EngineConfig, override: StoredBackendOverride | undefined): EngineConfig {
  if (!override) return config;
  if (override.legacy) {
    const isKobold = config.mainApi === 'textgenerationwebui' && config.textgen.type === 'koboldcpp';
    return isKobold ? { ...config, apiServerOverride: override.url } : config;
  }
  return applyBackendOverride(config, override);
}

/**
 * Loads `/api/settings/get`, parses settings, and produces the engine config for `charName` with the
 * active connection profile applied (named instruct/context/sysprompt/preset + api-url) and the
 * backend picked in the app.
 */
export function useEngineConfig(charName: string): {
  engine: EngineConfig | null;
  isLoading: boolean;
  error: unknown;
} {
  const client = useConnection((s) => s.client);
  const activeProfileId = useProfiles((s) => s.activeProfileId);
  const backendOverride = useProfiles((s) => s.backendOverride);
  const activePersonaAvatar = useProfiles((s) => s.activePersonaAvatar);

  const { data, isLoading, error } = useQuery({
    queryKey: ['settings', client?.baseUrl],
    queryFn: () => getSettings(client!),
    enabled: !!client,
    staleTime: 5 * 60_000,
  });

  const engine = useMemo<EngineConfig | null>(() => {
    if (!data) return null;
    const parsed = parseStSettings(data);
    if (!parsed) return null;

    let config = extractEngineConfig(parsed, charName);

    // Named preset collections live in the RESPONSE root (raw JSON-string arrays + parallel
    // names), not inside the parsed `settings` string - attach them for the per-backend
    // request builders (kobold preset resolution, nai order fallback).
    const root = data as Record<string, unknown>;
    if (root.koboldai_settings || root.koboldai_setting_names) {
      config = {
        ...config,
        koboldPresets: {
          koboldai_settings: root.koboldai_settings,
          koboldai_setting_names: root.koboldai_setting_names,
        },
      };
    }
    if (root.novelai_settings !== undefined || root.novelai_setting_names !== undefined) {
      config = {
        ...config,
        novelaiSettings: root.novelai_settings,
        novelaiSettingNames: root.novelai_setting_names,
      };
    }

    const { profiles, selectedId } = extractConnectionProfiles(parsed);
    const activeId = activeProfileId ?? selectedId;
    const profile = profiles.find((p) => p.id === activeId);
    if (profile) {
      config = applyProfileToConfig(config, profile, data as Parameters<typeof applyProfileToConfig>[2]);
    }

    if (activePersonaAvatar) {
      const persona = extractPersonas(parsed).personas.find((p) => p.avatar === activePersonaAvatar);
      if (persona) config = applyPersonaToConfig(config, persona);
    }

    config = withBackendOverride(config, backendOverride);

    return config;
  }, [data, charName, activeProfileId, backendOverride, activePersonaAvatar]);

  return { engine, isLoading, error };
}
