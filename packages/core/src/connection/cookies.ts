/**
 * Manual cookie tracking.
 *
 * SillyTavern binds the CSRF token to the `cookie-session` cookie, so the session cookie returned by
 * `GET /csrf-token` MUST be replayed on subsequent POSTs — even though this setup has no user
 * accounts. React Native's native cookie jar is inconsistent across platforms and hides httpOnly
 * cookies from JS, so we parse and replay cookies ourselves for deterministic behaviour.
 */

export interface SetCookieReadable {
  get(name: string): string | null;
  /** Present on WHATWG Headers (Node/undici) and some RN polyfills. */
  getSetCookie?: () => string[];
}

/** Split a comma-joined Set-Cookie header without breaking on commas inside `Expires=` dates. */
export function splitSetCookieHeader(raw: string): string[] {
  return raw
    .split(/,(?=[^;]+?=)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function readSetCookie(headers: SetCookieReadable): string[] {
  if (typeof headers.getSetCookie === 'function') {
    const arr = headers.getSetCookie();
    if (arr.length > 0) return arr;
  }
  const raw = headers.get('set-cookie');
  return raw ? splitSetCookieHeader(raw) : [];
}

export class CookieJar {
  private readonly jar = new Map<string, string>();

  /** Ingest one or more raw Set-Cookie header values (only the name=value pair is kept). */
  ingest(setCookies: readonly string[]): void {
    for (const sc of setCookies) {
      const firstPair = sc.split(';', 1)[0]?.trim();
      if (!firstPair) continue;
      const eq = firstPair.indexOf('=');
      if (eq <= 0) continue;
      const name = firstPair.slice(0, eq).trim();
      const value = firstPair.slice(eq + 1).trim();
      if (name) this.jar.set(name, value);
    }
  }

  ingestFromHeaders(headers: SetCookieReadable): void {
    this.ingest(readSetCookie(headers));
  }

  /** The `Cookie` request header value, or '' when empty. */
  get header(): string {
    return Array.from(this.jar.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }

  get size(): number {
    return this.jar.size;
  }
}
