import { create } from 'zustand';
import { secrets } from '@/lib/storage';

/**
 * Saved SillyTavern servers, so users with more than one instance (home + remote/tunneled) can switch
 * with one tap instead of re-discovering. The list lives in secure-store; Basic-Auth credentials are
 * stored per-server (also in secure-store, never in the React-Query disk cache).
 */

export interface SavedServer {
  id: string;
  label: string;
  baseUrl: string;
  ip: string;
  port: number;
  hasAuth: boolean;
}

const KEY_LIST = 'servers.list';
const credUserKey = (id: string) => `server.${id}.user`;
const credPassKey = (id: string) => `server.${id}.pass`;

interface ServersState {
  servers: SavedServer[];
  hydrate: () => Promise<void>;
  upsert: (server: SavedServer, creds?: { user: string; pass: string }) => Promise<void>;
  remove: (id: string) => Promise<void>;
  getCreds: (id: string) => Promise<{ username: string; password: string } | undefined>;
}

function persistList(list: SavedServer[]): void {
  void secrets.set(KEY_LIST, JSON.stringify(list)).catch(() => {});
}

export const useServers = create<ServersState>((set, get) => ({
  servers: [],
  hydrate: async () => {
    try {
      const raw = await secrets.get(KEY_LIST);
      if (raw) set({ servers: JSON.parse(raw) as SavedServer[] });
    } catch {
      // ignore - start empty
    }
  },
  upsert: async (server, creds) => {
    const list = [...get().servers.filter((s) => s.id !== server.id), server];
    set({ servers: list });
    persistList(list);
    if (creds) {
      await Promise.all([
        secrets.set(credUserKey(server.id), creds.user).catch(() => {}),
        secrets.set(credPassKey(server.id), creds.pass).catch(() => {}),
      ]);
    }
  },
  remove: async (id) => {
    const list = get().servers.filter((s) => s.id !== id);
    set({ servers: list });
    persistList(list);
    await Promise.all([
      secrets.remove(credUserKey(id)).catch(() => {}),
      secrets.remove(credPassKey(id)).catch(() => {}),
    ]);
  },
  getCreds: async (id) => {
    try {
      const [username, password] = await Promise.all([secrets.get(credUserKey(id)), secrets.get(credPassKey(id))]);
      if (username && password) return { username, password };
    } catch {
      // ignore
    }
    return undefined;
  },
}));
