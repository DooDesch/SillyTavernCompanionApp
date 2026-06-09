import { create } from 'zustand';
import { StClient, type BasicAuthCredentials, type DiscoveredInstance } from '@st/core';
import { fetchLike } from '@/lib/expoFetch';
import { rememberBaseUrl } from '@/lib/storage';
import { rememberStHint } from '@/lib/discoveryHints';

interface ConnectionState {
  instance: DiscoveredInstance | null;
  client: StClient | null;
  connect: (instance: DiscoveredInstance, basicAuth?: BasicAuthCredentials) => void;
  disconnect: () => void;
}

/** Holds the single active SillyTavern connection. Building the StClient here keeps the
 *  platform fetch adapter out of @st/core. */
export const useConnection = create<ConnectionState>((set) => ({
  instance: null,
  client: null,
  connect: (instance, basicAuth) => {
    rememberBaseUrl(instance.baseUrl);
    // Persist this host as the last-known-good ST so future discovery probes it first.
    void rememberStHint(instance.ip, instance.port);
    set({
      instance,
      client: new StClient({
        baseUrl: instance.baseUrl,
        fetchImpl: fetchLike,
        ...(basicAuth ? { basicAuth } : {}),
      }),
    });
  },
  disconnect: () => set({ instance: null, client: null }),
}));
