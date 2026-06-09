import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  characterBookToEntries,
  extractWorldInfoSettings,
  getSettings,
  getWorldInfo,
  globalWorldNames,
  worldFileToEntries,
  type StCharacter,
  type WorldInfoEntry,
  type WorldInfoSettings,
} from '@st/core';
import { useConnection } from '@/stores/connectionStore';

function parseSettings(data: unknown): Record<string, unknown> | null {
  if (!data) return null;
  const field = (data as { settings?: unknown }).settings;
  try {
    return typeof field === 'string' ? JSON.parse(field) : ((field as Record<string, unknown>) ?? (data as Record<string, unknown>));
  } catch {
    return data as Record<string, unknown>;
  }
}

export interface Lorebook {
  entries: WorldInfoEntry[];
  settings: WorldInfoSettings;
}

/**
 * Resolves the active lorebook for a character: embedded `character_book` + the character-linked
 * world (`data.extensions.world`) + globally-selected worlds, loaded via /api/worldinfo/get.
 */
export function useLorebook(character?: StCharacter): Lorebook | undefined {
  const client = useConnection((s) => s.client);

  const { data: settingsData } = useQuery({
    queryKey: ['settings', client?.baseUrl],
    queryFn: () => getSettings(client!),
    enabled: !!client,
    staleTime: 5 * 60_000,
  });

  const parsed = useMemo(() => parseSettings(settingsData), [settingsData]);
  const wiSettings = useMemo(() => (parsed ? extractWorldInfoSettings(parsed) : null), [parsed]);

  const linkedWorld = (character?.data?.extensions as { world?: string } | undefined)?.world;
  const worldNames = useMemo(() => {
    const names = parsed ? [...globalWorldNames(parsed)] : [];
    if (linkedWorld) names.push(linkedWorld);
    return [...new Set(names.filter(Boolean))];
  }, [parsed, linkedWorld]);

  const { data: worldEntries } = useQuery({
    queryKey: ['worlds', client?.baseUrl, worldNames],
    queryFn: async () => {
      const loaded = await Promise.all(
        worldNames.map((n) => getWorldInfo(client!, n).catch(() => null)),
      );
      return loaded.flatMap((w) => (w ? worldFileToEntries(w) : []));
    },
    enabled: !!client && worldNames.length > 0,
    staleTime: 5 * 60_000,
  });

  return useMemo(() => {
    if (!wiSettings) return undefined;
    const embedded = character?.data?.character_book
      ? characterBookToEntries(character.data.character_book)
      : [];
    const entries = [...embedded, ...(worldEntries ?? [])];
    if (entries.length === 0) return undefined;
    return { entries, settings: wiSettings };
  }, [wiSettings, character, worldEntries]);
}
