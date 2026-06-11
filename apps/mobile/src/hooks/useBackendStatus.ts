import { useQuery } from '@tanstack/react-query';
import {
  getChatCompletionStatus,
  getNovelStatus,
  getTextCompletionStatus,
  getTextgenServer,
  type BackendStatus,
  type EngineConfig,
} from '@st/core';
import { useConnection } from '@/stores/connectionStore';

/**
 * Polls whether the AI backend (KoboldCpp for text-completion, NovelAI, or the cloud provider for
 * chat-completion) is actually reachable - the same status SillyTavern shows. Lets the UI warn the
 * user BEFORE they generate into the void (instead of only reacting to an empty response).
 */
export function useBackendStatus(engine: EngineConfig | null) {
  const client = useConnection((s) => s.client);
  const isCc = engine?.mode === 'cc';
  const isNovel = engine?.mainApi === 'novel';
  const apiServer = engine ? engine.apiServerOverride || getTextgenServer(engine.textgen) : '';
  const apiType = engine?.textgen?.type ?? '';
  const source = engine?.oai?.chat_completion_source ?? '';

  return useQuery<BackendStatus>({
    queryKey: [
      'backendStatus',
      client?.baseUrl,
      isNovel ? 'novel' : isCc ? `cc:${source}` : `tc:${apiType}:${apiServer}`,
    ],
    queryFn: () => {
      if (!client || !engine) return { connected: false };
      // getNovelStatus exposes the subscription tier name as `model` (the desktop readout).
      if (isNovel) return getNovelStatus(client);
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
