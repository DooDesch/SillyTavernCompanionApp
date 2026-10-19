import { create } from 'zustand';
import type { BackendOverride } from '@st/core';
import { secrets } from '@/lib/storage';

// NOTE: expo-secure-store keys must match /^[\w.-]+$/ - a ":" throws in ensureValidKey, which used to
// reject every write here (an unhandled rejection - `void` does NOT swallow it). Use dot-separated
// keys, and treat persistence as best-effort (see `persist` below).
const KEY_ACTIVE = 'profile.active';
/** Pre-0.16 key: a bare KoboldCpp URL. Read once and migrated to KEY_BACKEND. */
const KEY_KOBOLD_LEGACY = 'profile.koboldUrl';
const KEY_BACKEND = 'profile.backend';
const KEY_PERSONA = 'profile.persona';
const KEY_SYNC = 'profile.syncToPc';

/** Best-effort secure-store write - a failed persist just means the value won't survive cold start. */
function persist(key: string, value?: string): void {
  const op = value ? secrets.set(key, value) : secrets.remove(key);
  void op.catch((e: unknown) => console.warn(`[profiles] persisting ${key} failed`, e));
}

/**
 * `legacy` marks a migrated pre-0.16 KoboldCpp URL. It keeps its old scope: it only replaces the
 * URL of a KoboldCpp text-completion profile and never switches another backend.
 */
export type StoredBackendOverride = BackendOverride & { legacy?: boolean };

function parseBackendOverride(raw: string | null, legacyKoboldUrl: string | null): StoredBackendOverride | undefined {
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<BackendOverride>;
      if (typeof parsed.type === 'string' && typeof parsed.url === 'string') {
        return { type: parsed.type, url: parsed.url, ...(parsed.model ? { model: parsed.model } : {}) };
      }
      console.warn('[profiles] stored backend override has no type/url, ignored');
    } catch (e) {
      console.warn('[profiles] stored backend override is not JSON, ignored', e);
    }
  }
  return legacyKoboldUrl ? { type: 'koboldcpp', url: legacyKoboldUrl, legacy: true } : undefined;
}

interface ProfilesState {
  /** The ST connection profile the app applies (overrides ST's selectedProfile when set). */
  activeProfileId?: string;
  /** Backend picked in the app (auto-detect or model switch); replaces the profile's backend. */
  backendOverride?: StoredBackendOverride;
  /** Chosen persona avatar (overrides ST's active persona when set). */
  activePersonaAvatar?: string;
  /** When true, persona/profile/quick-tweak changes are written back to the desktop (settings/save). */
  syncToPc: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setActiveProfile: (id?: string) => void;
  setBackendOverride: (override?: BackendOverride) => void;
  setActivePersona: (avatar?: string) => void;
  setSyncToPc: (on: boolean) => void;
}

export const useProfiles = create<ProfilesState>((set) => ({
  hydrated: false,
  syncToPc: true,
  hydrate: async () => {
    try {
      const [id, backend, legacyKobold, persona, sync] = await Promise.all([
        secrets.get(KEY_ACTIVE),
        secrets.get(KEY_BACKEND),
        secrets.get(KEY_KOBOLD_LEGACY),
        secrets.get(KEY_PERSONA),
        secrets.get(KEY_SYNC),
      ]);
      set({
        activeProfileId: id ?? undefined,
        backendOverride: parseBackendOverride(backend, legacyKobold),
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
  setBackendOverride: (override) => {
    set({ backendOverride: override });
    persist(KEY_BACKEND, override ? JSON.stringify(override) : undefined);
    persist(KEY_KOBOLD_LEGACY, undefined);
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
