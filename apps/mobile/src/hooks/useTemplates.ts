import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSettings, parsePresetArray } from '@st/core';
import { useConnection } from '@/stores/connectionStore';
import { parseStSettings } from '@/lib/settings';
import type { TemplateKind, TemplateObject } from '@/lib/templateSchema';

export interface TemplatesView {
  /** Parsed template arrays from /api/settings/get (objects with `name`, server-parsed). */
  instruct: TemplateObject[];
  context: TemplateObject[];
  sysprompt: TemplateObject[];
  /** Currently selected template name per kind (power_user.*.preset / sysprompt.name). */
  selected: Partial<Record<TemplateKind, string>>;
  /** Live enabled flags (context has none on desktop). */
  enabled: { instruct: boolean; sysprompt: boolean };
  isLoading: boolean;
}

function sub(parsed: Record<string, unknown> | null, key: TemplateKind): Record<string, unknown> {
  const pu = parsed?.power_user as Record<string, unknown> | undefined;
  return (pu?.[key] as Record<string, unknown>) ?? {};
}

/**
 * Advanced-Formatting templates from the shared ['settings'] query. The template arrays live on
 * the RESPONSE root (settings.js readAndParseFromDirectory - already parsed objects), while the
 * selection/enabled state lives inside the embedded power_user settings blob.
 */
export function useTemplates(): TemplatesView {
  const client = useConnection((s) => s.client);

  const { data, isLoading } = useQuery({
    queryKey: ['settings', client?.baseUrl],
    queryFn: () => getSettings(client!),
    enabled: !!client,
    staleTime: 5 * 60_000,
  });

  return useMemo<TemplatesView>(() => {
    const response = (data ?? {}) as Record<string, unknown>;
    const parsed = parseStSettings(data);
    const instructSub = sub(parsed, 'instruct');
    const contextSub = sub(parsed, 'context');
    const syspromptSub = sub(parsed, 'sysprompt');
    return {
      instruct: parsePresetArray<TemplateObject>(response.instruct),
      context: parsePresetArray<TemplateObject>(response.context),
      sysprompt: parsePresetArray<TemplateObject>(response.sysprompt),
      selected: {
        instruct: typeof instructSub.preset === 'string' ? instructSub.preset : undefined,
        context: typeof contextSub.preset === 'string' ? contextSub.preset : undefined,
        sysprompt: typeof syspromptSub.name === 'string' ? syspromptSub.name : undefined,
      },
      enabled: {
        instruct: instructSub.enabled === true,
        sysprompt: syspromptSub.enabled === true,
      },
      isLoading,
    };
  }, [data, isLoading]);
}
