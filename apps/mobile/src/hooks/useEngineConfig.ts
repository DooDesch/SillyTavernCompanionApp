import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  applyPersonaToConfig,
  applyProfileToConfig,
  extractConnectionProfiles,
  extractEngineConfig,
  extractPersonas,
  getSettings,
  type EngineConfig,
} from '@st/core';
import { useConnection } from '@/stores/connectionStore';
import { useProfiles } from '@/stores/profilesStore';
import { parseStSettings } from '@/lib/settings';

/**
 * Loads `/api/settings/get`, parses settings, and produces the engine config for `charName` with the
 * active connection profile applied (named instruct/context/sysprompt/preset + api-url) and any
 * KoboldCpp backend override.
 */
export function useEngineConfig(charName: string): {
  engine: EngineConfig | null;
  isLoading: boolean;
  error: unknown;
} {
  const client = useConnection((s) => s.client);
  const activeProfileId = useProfiles((s) => s.activeProfileId);
  const koboldOverride = useProfiles((s) => s.koboldOverride);
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

    // NovelAI presets ride on the RESPONSE ROOT (raw JSON-string array + parallel names),
    // not inside the parsed settings string - thread them through for the nai order fallback.
    const root = data as { novelai_settings?: unknown; novelai_setting_names?: unknown };
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

    if (koboldOverride) config = { ...config, apiServerOverride: koboldOverride };

    return config;
  }, [data, charName, activeProfileId, koboldOverride, activePersonaAvatar]);

  return { engine, isLoading, error };
}
