import { create } from 'zustand';
import { checkForUpdate, type UpdateInfo } from '@/lib/updates';

/**
 * In-memory result of the automatic release check (runs once per app launch; failures are
 * silent - the Settings screen also offers a manual re-check). Not persisted on purpose:
 * a fresh launch should re-validate against GitHub anyway.
 */
interface UpdateState {
  available: UpdateInfo | null;
  checking: boolean;
  checkedAt: number | null;
  check: () => Promise<void>;
}

export const useUpdates = create<UpdateState>((set, get) => ({
  available: null,
  checking: false,
  checkedAt: null,
  check: async () => {
    if (get().checking) return;
    set({ checking: true });
    try {
      const info = await checkForUpdate();
      set({ available: info, checkedAt: Date.now() });
    } catch {
      // offline / rate-limited - keep previous state
    } finally {
      set({ checking: false });
    }
  },
}));
