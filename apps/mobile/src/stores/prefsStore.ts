import { create } from 'zustand';
import { secrets } from '@/lib/storage';

/**
 * Device-local UI preferences (NOT synced to the desktop's power_user - these are
 * phone-rendering/behavior concerns). Persisted best-effort via secure-store; keys must
 * match /^[\w.-]+$/ (dots, never colons).
 */
const KEY_SMOOTH = 'prefs.smoothStream';
const KEY_CHATLIST = 'prefs.chatList';
const KEY_APPLOCK = 'prefs.appLock';

export type ChatListMode = 'latest' | 'all';

interface PrefsState {
  /** ST-style smooth streaming (character-by-character reveal). Default ON on mobile. */
  smoothStreaming: boolean;
  /** Chats tab: latest chat per character (default) or every chat file. */
  chatList: ChatListMode;
  /** Biometric/device-credential app lock. Default off. */
  appLock: boolean;
  /** True once hydrate() resolved - the lock gate must not flash content before that. */
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setSmoothStreaming: (on: boolean) => void;
  setChatList: (mode: ChatListMode) => void;
  setAppLock: (on: boolean) => void;
}

export const usePrefs = create<PrefsState>((set) => ({
  smoothStreaming: true,
  chatList: 'latest',
  appLock: false,
  hydrated: false,
  hydrate: async () => {
    try {
      const [smooth, chatList, appLock] = await Promise.all([
        secrets.get(KEY_SMOOTH),
        secrets.get(KEY_CHATLIST),
        secrets.get(KEY_APPLOCK),
      ]);
      set({
        ...(smooth === '0' ? { smoothStreaming: false } : {}),
        ...(smooth === '1' ? { smoothStreaming: true } : {}),
        ...(chatList === 'all' || chatList === 'latest' ? { chatList } : {}),
        ...(appLock === '1' ? { appLock: true } : {}),
        hydrated: true,
      });
    } catch {
      set({ hydrated: true }); // keep defaults, never block the gate forever
    }
  },
  setSmoothStreaming: (on) => {
    set({ smoothStreaming: on });
    void secrets.set(KEY_SMOOTH, on ? '1' : '0').catch(() => {});
  },
  setChatList: (mode) => {
    set({ chatList: mode });
    void secrets.set(KEY_CHATLIST, mode).catch(() => {});
  },
  setAppLock: (on) => {
    set({ appLock: on });
    void secrets.set(KEY_APPLOCK, on ? '1' : '0').catch(() => {});
  },
}));
