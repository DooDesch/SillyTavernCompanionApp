import { create } from 'zustand';
import { secrets } from '@/lib/storage';

// NOTE: expo-secure-store keys must match /^[\w.-]+$/ - a ":" throws in ensureValidKey, which used to
// reject every write here (an unhandled rejection - `void` does NOT swallow it). Use dot-separated
// keys, and treat persistence as best-effort (see `persist` below).
const KEY_ACTIVE = 'profile.active';
const KEY_KOBOLD = 'profile.koboldUrl';
const KEY_PERSONA = 'profile.persona';
const KEY_SYNC = 'profile.syncToPc';

/** Best-effort secure-store write - a failed persist just means the value won't survive cold start. */
function persist(key: string, value?: string): void {
  const op = value ? secrets.set(key, value) : secrets.remove(key);
  void op.catch(() => {});
}

interface ProfilesState {
  /** The ST connection profile the app applies (overrides ST's selectedProfile when set). */
  activeProfileId?: string;
  /** Auto-detected / manual KoboldCpp backend URL override (api_server). */
  koboldOverride?: string;
  /** Chosen persona avatar (overrides ST's active persona when set). */
  activePersonaAvatar?: string;
  /** When true, persona/profile/quick-tweak changes are written back to the desktop (settings/save). */
  syncToPc: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setActiveProfile: (id?: string) => void;
  setKoboldOverride: (url?: string) => void;
  setActivePersona: (avatar?: string) => void;
  setSyncToPc: (on: boolean) => void;
}

export const useProfiles = create<ProfilesState>((set) => ({
  hydrated: false,
  syncToPc: true,
  hydrate: async () => {
    try {
      const [id, url, persona, sync] = await Promise.all([
        secrets.get(KEY_ACTIVE),
        secrets.get(KEY_KOBOLD),
        secrets.get(KEY_PERSONA),
        secrets.get(KEY_SYNC),
      ]);
      set({
        activeProfileId: id ?? undefined,
        koboldOverride: url ?? undefined,
        activePersonaAvatar: persona ?? undefined,
        syncToPc: sync !== 'off',
      });
    } catch {
      // Reading prefs failed (e.g. keychain locked) - fall back to defaults, app still works.
    } finally {
      set({ hydrated: true });
    }
  },
  setActiveProfile: (id) => {
    set({ activeProfileId: id });
    persist(KEY_ACTIVE, id);
  },
  setKoboldOverride: (url) => {
    set({ koboldOverride: url });
    persist(KEY_KOBOLD, url);
  },
  setActivePersona: (avatar) => {
    set({ activePersonaAvatar: avatar });
    persist(KEY_PERSONA, avatar);
  },
  setSyncToPc: (on) => {
    set({ syncToPc: on });
    persist(KEY_SYNC, on ? 'on' : 'off');
  },
}));
