import { create } from 'zustand';
import { secrets } from '@/lib/storage';

/**
 * Device-local UI preferences (NOT synced to the desktop's power_user — pacing is a
 * phone-rendering concern). Persisted best-effort via secure-store; keys must match
 * /^[\w.-]+$/ (dots, never colons).
 */
const KEY_SMOOTH = 'prefs.smoothStream';

interface PrefsState {
  /** ST-style smooth streaming (character-by-character reveal). Default ON on mobile. */
  smoothStreaming: boolean;
  hydrate: () => Promise<void>;
  setSmoothStreaming: (on: boolean) => void;
}

export const usePrefs = create<PrefsState>((set) => ({
  smoothStreaming: true,
  hydrate: async () => {
    try {
      const stored = await secrets.get(KEY_SMOOTH);
      if (stored === '0') set({ smoothStreaming: false });
      if (stored === '1') set({ smoothStreaming: true });
    } catch {
      // keep defaults
    }
  },
  setSmoothStreaming: (on) => {
    set({ smoothStreaming: on });
    void secrets.set(KEY_SMOOTH, on ? '1' : '0').catch(() => {});
  },
}));
