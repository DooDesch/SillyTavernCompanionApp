import * as SecureStore from 'expo-secure-store';

/**
 * Lightweight in-memory key-value store for non-secret data.
 *
 * (We previously used react-native-mmkv v4, but its Nitro module failed to initialise at runtime on
 * the target device — `new MMKV()` threw at module load. An in-memory store is dependency-free and
 * sufficient for v1; persistence across cold starts can be reintroduced later via expo-sqlite/MMKV
 * once verified on-device.)
 */
const mem = new Map<string, string>();

export const storage = {
  set: (key: string, value: string) => mem.set(key, value),
  getString: (key: string): string | undefined => mem.get(key),
  delete: (key: string) => mem.delete(key),
};

/** Hardware-backed secret storage (Basic Auth / login passwords). */
export const secrets = {
  get: (key: string) => SecureStore.getItemAsync(key),
  set: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  remove: (key: string) => SecureStore.deleteItemAsync(key),
};

const LAST_BASE_URL = 'connection:lastBaseUrl';

export function rememberBaseUrl(baseUrl: string): void {
  storage.set(LAST_BASE_URL, baseUrl);
}

export function getRememberedBaseUrl(): string | undefined {
  return storage.getString(LAST_BASE_URL);
}
