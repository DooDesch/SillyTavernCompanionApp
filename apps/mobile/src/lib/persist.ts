import * as FileSystem from 'expo-file-system/legacy';

/**
 * File-based persistence (Expo's own FileSystem). MMKV/Nitro crashed at startup on the S8 (Android 9),
 * so we deliberately avoid it. Used for: (1) the React-Query offline cache (character/chat lists survive
 * a cold start) and (2) per-chat crash drafts so an in-progress reply is not lost if the app dies before
 * the server save completes. Everything is best-effort and never throws.
 */

const DIR = `${FileSystem.documentDirectory ?? ''}st-companion/`;

async function ensureDir(): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(DIR);
    if (!info.exists) await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
  } catch {
    // ignore - writes below will no-op on failure
  }
}

const pathFor = (key: string): string => `${DIR}${encodeURIComponent(key)}.json`;

/** AsyncStorage-shaped string KV (for createAsyncStoragePersister + drafts). */
export const fileStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      const info = await FileSystem.getInfoAsync(pathFor(key));
      if (!info.exists) return null;
      return await FileSystem.readAsStringAsync(pathFor(key));
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      await ensureDir();
      await FileSystem.writeAsStringAsync(pathFor(key), value);
    } catch {
      // best-effort
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      await FileSystem.deleteAsync(pathFor(key), { idempotent: true });
    } catch {
      // best-effort
    }
  },
};

const draftKey = (avatarUrl: string, fileName: string): string => `draft:${avatarUrl}:${fileName}`;

export interface ChatDraft<H = unknown, M = unknown> {
  savedAt: number;
  header: H;
  messages: M[];
}

export function writeChatDraft<H, M>(
  avatarUrl: string,
  fileName: string,
  header: H,
  messages: M[],
  savedAt: number,
): void {
  const payload: ChatDraft<H, M> = { savedAt, header, messages };
  void fileStorage.setItem(draftKey(avatarUrl, fileName), JSON.stringify(payload));
}

export async function readChatDraft<H, M>(
  avatarUrl: string,
  fileName: string,
): Promise<ChatDraft<H, M> | null> {
  const raw = await fileStorage.getItem(draftKey(avatarUrl, fileName));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ChatDraft<H, M>;
  } catch {
    return null;
  }
}

export function clearChatDraft(avatarUrl: string, fileName: string): void {
  void fileStorage.removeItem(draftKey(avatarUrl, fileName));
}
