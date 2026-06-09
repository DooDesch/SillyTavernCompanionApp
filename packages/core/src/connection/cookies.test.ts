import { describe, expect, it } from 'vitest';
import { CookieJar, splitSetCookieHeader, readSetCookie } from './cookies';

describe('cookie parsing', () => {
  it('keeps only the name=value pair, dropping attributes', () => {
    const jar = new CookieJar();
    jar.ingest(['session=abc123; Path=/; HttpOnly; SameSite=Lax']);
    expect(jar.header).toBe('session=abc123');
  });

  it('accumulates multiple cookies (cookie-session sets value + signature)', () => {
    const jar = new CookieJar();
    jar.ingest(['st=v1; Path=/', 'st.sig=s1; Path=/; HttpOnly']);
    expect(jar.header).toBe('st=v1; st.sig=s1');
    expect(jar.size).toBe(2);
  });

  it('overwrites a cookie when the same name is set again', () => {
    const jar = new CookieJar();
    jar.ingest(['st=old']);
    jar.ingest(['st=new']);
    expect(jar.header).toBe('st=new');
  });

  it('splits a comma-joined header without breaking on Expires dates', () => {
    const raw = 'a=1; Expires=Wed, 09 Jun 2027 10:18:14 GMT; Path=/, b=2; Path=/';
    expect(splitSetCookieHeader(raw)).toEqual([
      'a=1; Expires=Wed, 09 Jun 2027 10:18:14 GMT; Path=/',
      'b=2; Path=/',
    ]);
  });

  it('prefers getSetCookie() when the headers object exposes it', () => {
    const headers = {
      get: () => null,
      getSetCookie: () => ['x=1', 'y=2'],
    };
    expect(readSetCookie(headers)).toEqual(['x=1', 'y=2']);
  });
});
