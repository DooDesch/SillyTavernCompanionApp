import { useQuery } from '@tanstack/react-query';
import {
  getChatCompletionStatus,
  getHordeStatus,
  getKoboldStatus,
  getTextCompletionStatus,
  getTextgenServer,
  type BackendStatus,
  type EngineConfig,
} from '@st/core';
import { useConnection } from '@/stores/connectionStore';

/**
 * Polls whether the AI backend (KoboldCpp for text-completion, the cloud provider for chat-
 * completion, KoboldAI Classic, or the AI Horde) is actually reachable - the same status
 * SillyTavern shows. Lets the UI warn the user BEFORE they generate into the void (instead
 * of only reacting to an empty response).
 */
export function useBackendStatus(engine: EngineConfig | null) {
  const client = useConnection((s) => s.client);
  const mainApi = engine?.mainApi;
  const isCc = engine?.mode === 'cc';
  const apiServer = engine ? engine.apiServerOverride || getTextgenServer(engine.textgen) : '';
  const apiType = engine?.textgen?.type ?? '';
  const source = engine?.oai?.chat_completion_source ?? '';
  // KoboldAI Classic stores its backend URL in kai_settings.api_server.
  const kaiServer = engine
    ? engine.apiServerOverride || String(engine.kai['api_server'] ?? '')
    : '';
  const hordeModels = engine && Array.isArray(engine.horde['models'])
    ? (engine.horde['models'] as unknown[]).map(String).join(', ')
    : '';

  const branchKey =
    mainApi === 'kobold'
      ? `kobold:${kaiServer}`
      : mainApi === 'koboldhorde'
        ? `horde:${hordeModels}`
        : isCc
          ? `cc:${source}`
          : `tc:${apiType}:${apiServer}`;

  return useQuery<BackendStatus>({
    queryKey: ['backendStatus', client?.baseUrl, branchKey],
    queryFn: async () => {
      if (!client || !engine) return { connected: false };
      if (mainApi === 'kobold') {
        return getKoboldStatus(client, kaiServer);
      }
      if (mainApi === 'koboldhorde') {
        const status = await getHordeStatus(client);
        // Desktop shows "Connected"; the selected models are the closest thing to a model name.
        return status.connected && hordeModels ? { ...status, model: hordeModels } : status;
      }
      return isCc
        ? getChatCompletionStatus(client, source)
        : getTextCompletionStatus(client, { apiServer, apiType });
    },
    enabled: !!client && !!engine,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}
