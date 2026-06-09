import { describe, expect, it } from 'vitest';
import { StClient } from './StClient';
import type { FetchInitLike, FetchLike, FetchResponseLike } from '../net/http';

function makeResponse(opts: { status?: number; body?: unknown; setCookie?: string }): FetchResponseLike {
  const status = opts.status ?? 200;
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name) => (name.toLowerCase() === 'set-cookie' ? (opts.setCookie ?? null) : null),
    },
    json: async () => opts.body ?? {},
    text: async () => JSON.stringify(opts.body ?? {}),
    body: null,
  };
}

interface Recorded {
  url: string;
  init?: FetchInitLike;
}

describe('StClient', () => {
  it('performs the CSRF handshake and replays token + cookie on POST', async () => {
    const calls: Recorded[] = [];
    let csrfCount = 0;
    const fetchImpl: FetchLike = async (url, init) => {
      calls.push({ url, init });
      if (url.endsWith('/csrf-token')) {
        csrfCount += 1;
        return makeResponse({ body: { token: `T${csrfCount}` }, setCookie: 'sess=abc; Path=/; HttpOnly' });
      }
      return makeResponse({ status: 200, body: { ok: true } });
    };

    const client = new StClient({ baseUrl: 'http://host:8000/', fetchImpl });
    const res = await client.post('/api/test', { a: 1 });

    expect(res.ok).toBe(true);
    const postCall = calls.find((c) => c.url.endsWith('/api/test'));
    expect(postCall?.init?.headers?.['X-CSRF-Token']).toBe('T1');
    expect(postCall?.init?.headers?.['Cookie']).toBe('sess=abc');
    expect(postCall?.init?.headers?.['Content-Type']).toBe('application/json');
    expect(postCall?.init?.body).toBe(JSON.stringify({ a: 1 }));
  });

  it('refreshes the CSRF token once and retries on a 403', async () => {
    const calls: Recorded[] = [];
    let csrfCount = 0;
    let postCount = 0;
    const fetchImpl: FetchLike = async (url, init) => {
      calls.push({ url, init });
      if (url.endsWith('/csrf-token')) {
        csrfCount += 1;
        return makeResponse({ body: { token: `T${csrfCount}` }, setCookie: 'sess=1' });
      }
      postCount += 1;
      if (postCount === 1) return makeResponse({ status: 403, body: { error: 'CSRF' } });
      return makeResponse({ status: 200, body: { ok: true } });
    };

    const client = new StClient({ baseUrl: 'http://host:8000', fetchImpl });
    const res = await client.post('/api/test', {});

    expect(res.ok).toBe(true);
    expect(csrfCount).toBe(2); // initial + one refresh
    expect(postCount).toBe(2);
    const lastPost = calls.filter((c) => c.url.endsWith('/api/test')).at(-1);
    expect(lastPost?.init?.headers?.['X-CSRF-Token']).toBe('T2');
  });

  it('attaches HTTP Basic Auth to every request', async () => {
    const calls: Recorded[] = [];
    const fetchImpl: FetchLike = async (url, init) => {
      calls.push({ url, init });
      if (url.endsWith('/csrf-token')) return makeResponse({ body: { token: 'T' } });
      return makeResponse({ body: {} });
    };

    const client = new StClient({
      baseUrl: 'http://host:8000',
      fetchImpl,
      basicAuth: { username: 'u', password: 'p' },
      base64: (s) => Buffer.from(s, 'utf-8').toString('base64'),
    });
    await client.get('/version');

    const expected = `Basic ${Buffer.from('u:p', 'utf-8').toString('base64')}`;
    expect(calls[0]?.init?.headers?.['Authorization']).toBe(expected);
  });
});
