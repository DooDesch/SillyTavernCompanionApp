import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  extractConnectionProfiles,
  extractPersonas,
  getSettings,
  type ConnectionProfile,
  type Persona,
} from '@st/core';
import { useConnection } from '@/stores/connectionStore';
import { useProfiles } from '@/stores/profilesStore';
import { parseStSettings } from '@/lib/settings';

export interface ConnectionSettingsView {
  profiles: ConnectionProfile[];
  activeId?: string;
  setActiveProfile: (id?: string) => void;
  personas: Persona[];
  activePersonaAvatar?: string;
  /** power_user.default_persona (used by the desktop for new chats). */
  defaultPersonaAvatar?: string;
  setActivePersona: (avatar?: string) => void;
  koboldOverride?: string;
  setKoboldOverride: (url?: string) => void;
  isLoading: boolean;
}

/** ST connection profiles + personas + the app's active selections (for the Settings UI). */
export function useConnectionProfiles(): ConnectionSettingsView {
  const client = useConnection((s) => s.client);
  const activeProfileId = useProfiles((s) => s.activeProfileId);
  const activePersonaAvatar = useProfiles((s) => s.activePersonaAvatar);
  const koboldOverride = useProfiles((s) => s.koboldOverride);
  const setActiveProfile = useProfiles((s) => s.setActiveProfile);
  const setActivePersona = useProfiles((s) => s.setActivePersona);
  const setKoboldOverride = useProfiles((s) => s.setKoboldOverride);

  const { data, isLoading } = useQuery({
    queryKey: ['settings', client?.baseUrl],
    queryFn: () => getSettings(client!),
    enabled: !!client,
    staleTime: 5 * 60_000,
  });

  const { profiles, selectedId, personas, activeAvatar, defaultPersona } = useMemo(() => {
    const parsed = parseStSettings(data);
    if (!parsed) {
      return {
        profiles: [],
        selectedId: undefined,
        personas: [],
        activeAvatar: undefined,
        defaultPersona: undefined,
      };
    }
    const cp = extractConnectionProfiles(parsed);
    const pl = extractPersonas(parsed);
    return {
      profiles: cp.profiles,
      selectedId: cp.selectedId,
      personas: pl.personas,
      activeAvatar: pl.activeAvatar,
      defaultPersona: pl.defaultPersona,
    };
  }, [data]);

  return {
    profiles,
    activeId: activeProfileId ?? selectedId,
    setActiveProfile,
    personas,
    activePersonaAvatar: activePersonaAvatar ?? activeAvatar,
    defaultPersonaAvatar: defaultPersona,
    setActivePersona,
    koboldOverride,
    setKoboldOverride,
    isLoading,
  };
}
