import { fetch as expoFetch } from 'expo/fetch';
import type { FetchLike, FetchResponseLike } from '@st/core';

/**
 * Adapt `expo/fetch` to the FetchLike surface `@st/core` expects. `expo/fetch` is used (over the
 * RN global fetch) for deterministic header/cookie behaviour and real `ReadableStream` bodies,
 * which the streaming transport relies on.
 */
export const fetchLike: FetchLike = async (url, init) => {
  const res = await expoFetch(url, init as Parameters<typeof expoFetch>[1]);
  return res as unknown as FetchResponseLike;
};
