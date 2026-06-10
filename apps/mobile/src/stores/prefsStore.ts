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
const KEY_APPLOCK_TIMER = 'prefs.appLockTimer';
const KEY_APPLOCK_MINUTES = 'prefs.appLockMinutes';

export type ChatListMode = 'latest' | 'all';

interface PrefsState {
  /** ST-style smooth streaming (character-by-character reveal). Default ON on mobile. */
  smoothStreaming: boolean;
  /** Chats tab: latest chat per character (default) or every chat file. */
  chatList: ChatListMode;
  /** Biometric/device-credential app lock. Default off. */
  appLock: boolean;
  /** Optional extra: also auto-lock after time in the background (default: only when the phone locks). */
  appLockTimer: boolean;
  /** Auto-lock delay in minutes when appLockTimer is on. */
  appLockMinutes: number;
  /** True once hydrate() resolved - the lock gate must not flash content before that. */
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setSmoothStreaming: (on: boolean) => void;
  setChatList: (mode: ChatListMode) => void;
  setAppLock: (on: boolean) => void;
  setAppLockTimer: (on: boolean) => void;
  setAppLockMinutes: (minutes: number) => void;
}

export const usePrefs = create<PrefsState>((set) => ({
  smoothStreaming: true,
  chatList: 'latest',
  appLock: false,
  appLockTimer: false,
  appLockMinutes: 1,
  hydrated: false,
  hydrate: async () => {
    try {
      const [smooth, chatList, appLock, lockTimer, lockMinutes] = await Promise.all([
        secrets.get(KEY_SMOOTH),
        secrets.get(KEY_CHATLIST),
        secrets.get(KEY_APPLOCK),
        secrets.get(KEY_APPLOCK_TIMER),
        secrets.get(KEY_APPLOCK_MINUTES),
      ]);
      const minutes = Number(lockMinutes);
      set({
        ...(smooth === '0' ? { smoothStreaming: false } : {}),
        ...(smooth === '1' ? { smoothStreaming: true } : {}),
        ...(chatList === 'all' || chatList === 'latest' ? { chatList } : {}),
        ...(appLock === '1' ? { appLock: true } : {}),
        ...(lockTimer === '1' ? { appLockTimer: true } : {}),
        ...(Number.isFinite(minutes) && minutes >= 1 ? { appLockMinutes: minutes } : {}),
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
  setAppLockTimer: (on) => {
    set({ appLockTimer: on });
    void secrets.set(KEY_APPLOCK_TIMER, on ? '1' : '0').catch(() => {});
  },
  setAppLockMinutes: (minutes) => {
    set({ appLockMinutes: minutes });
    void secrets.set(KEY_APPLOCK_MINUTES, String(minutes)).catch(() => {});
  },
}));
