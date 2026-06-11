import { CookieJar } from './cookies';
import type { FetchLike } from '../net/http';

export interface BasicAuthCredentials {
  username: string;
  password: string;
}

export interface StClientOptions {
  baseUrl: string;
  fetchImpl: FetchLike;
  basicAuth?: BasicAuthCredentials;
  /** Base64 encoder override (defaults to global btoa / Node Buffer). */
  base64?: (input: string) => string;
}

export interface StResponse<T = unknown> {
  status: number;
  ok: boolean;
  data: T;
}

function defaultBase64(input: string): string {
  if (typeof btoa === 'function') return btoa(input);
  return Buffer.from(input, 'utf-8').toString('base64');
}

/**
 * Authenticated transport for one SillyTavern instance.
 *
 * Handshake: `GET /csrf-token` (captures the session cookie and CSRF token), then every POST sends
 * `X-CSRF-Token` + the `Cookie` header. A 403 (stale/rotated token) triggers one transparent
 * token refresh and retry. Optional HTTP Basic Auth is attached to every request.
 */
export class StClient {
  readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;
  private readonly cookies = new CookieJar();
  private readonly authHeader: string | undefined;
  private csrfToken: string | undefined;

  constructor(options: StClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.fetchImpl = options.fetchImpl;
    if (options.basicAuth) {
      const encode = options.base64 ?? defaultBase64;
      this.authHeader = `Basic ${encode(`${options.basicAuth.username}:${options.basicAuth.password}`)}`;
    }
  }

  url(path: string): string {
    return `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  }

  /** Fetch (and cache) the CSRF token. Pass `force` to refresh after a 403. */
  async ensureCsrf(force = false): Promise<string> {
    if (this.csrfToken && !force) return this.csrfToken;
    const res = await this.fetchImpl(this.url('/csrf-token'), {
      method: 'GET',
      headers: this.baseHeaders(),
    });
    this.cookies.ingestFromHeaders(res.headers);
    const body = (await res.json()) as { token?: unknown };
    if (typeof body.token !== 'string') {
      throw new Error('csrf-token response did not contain a token');
    }
    this.csrfToken = body.token;
    return this.csrfToken;
  }

  /** Headers for an authenticated POST (Content-Type + CSRF + Cookie + optional Basic Auth). */
  async authHeaders(): Promise<Record<string, string>> {
    const token = await this.ensureCsrf();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-CSRF-Token': token,
      ...this.baseHeaders(),
    };
    return headers;
  }

  async get<T = unknown>(path: string): Promise<StResponse<T>> {
    const res = await this.fetchImpl(this.url(path), { method: 'GET', headers: this.baseHeaders() });
    this.cookies.ingestFromHeaders(res.headers);
    return this.toResponse<T>(res);
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<StResponse<T>> {
    return this.postOnce<T>(path, body, true);
  }

  /**
   * POST a multipart form (e.g. `/api/avatars/upload`). Sends the same CSRF/cookie/basic-auth
   * headers as `post` but deliberately NO `Content-Type` - the fetch implementation must set
   * `multipart/form-data` with its own boundary. The body is passed through unchanged.
   */
  async postForm<T = unknown>(path: string, form: object): Promise<StResponse<T>> {
    return this.postFormOnce<T>(path, form, true);
  }

  private async postFormOnce<T>(path: string, form: object, allowRetry: boolean): Promise<StResponse<T>> {
    const headers = await this.authHeaders();
    delete headers['Content-Type'];
    const res = await this.fetchImpl(this.url(path), { method: 'POST', headers, body: form });
    this.cookies.ingestFromHeaders(res.headers);

    if (res.status === 403 && allowRetry) {
      await this.ensureCsrf(true);
      return this.postFormOnce<T>(path, form, false);
    }
    return this.toResponse<T>(res);
  }

  private async postOnce<T>(path: string, body: unknown, allowRetry: boolean): Promise<StResponse<T>> {
    const headers = await this.authHeaders();
    const res = await this.fetchImpl(this.url(path), {
      method: 'POST',
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    this.cookies.ingestFromHeaders(res.headers);

    if (res.status === 403 && allowRetry) {
      await this.ensureCsrf(true);
      return this.postOnce<T>(path, body, false);
    }
    return this.toResponse<T>(res);
  }

  private baseHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    const cookie = this.cookies.header;
    if (cookie) headers['Cookie'] = cookie;
    if (this.authHeader) headers['Authorization'] = this.authHeader;
    return headers;
  }

  private async toResponse<T>(res: {
    status: number;
    ok: boolean;
    json(): Promise<unknown>;
  }): Promise<StResponse<T>> {
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      data = undefined;
    }
    return { status: res.status, ok: res.ok, data: data as T };
  }
}
