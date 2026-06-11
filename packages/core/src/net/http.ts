/**
 * Minimal, runtime-agnostic `fetch` surface shared by the discovery scanner and the API client.
 * Satisfied structurally by the global WHATWG `fetch` and by `expo/fetch`, so callers can inject
 * either one (and tests can inject a fake).
 */

export interface FetchInitLike {
  method?: string;
  headers?: Record<string, string>;
  /**
   * A JSON string for normal POSTs, or a platform FormData object for multipart uploads
   * (passed through to the underlying fetch unchanged so it can derive the boundary).
   */
  body?: string | object;
  signal?: AbortSignal;
}

export interface FetchResponseLike {
  readonly ok: boolean;
  readonly status: number;
  readonly headers: { get(name: string): string | null };
  json(): Promise<unknown>;
  text(): Promise<string>;
  readonly body?: ReadableStream<Uint8Array> | null;
}

export type FetchLike = (url: string, init?: FetchInitLike) => Promise<FetchResponseLike>;
