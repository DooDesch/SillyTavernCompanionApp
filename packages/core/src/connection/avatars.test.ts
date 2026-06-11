import { describe, expect, it } from 'vitest';
import { StClient } from './StClient';
import { deleteUserAvatar, getUserAvatars, uploadUserAvatar, type FormDataLike } from './avatars';
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

function makeClient(routes: Record<string, { status?: number; body?: unknown }>): {
  client: StClient;
  calls: Recorded[];
} {
  const calls: Recorded[] = [];
  const fetchImpl: FetchLike = async (url, init) => {
    calls.push({ url, init });
    if (url.endsWith('/csrf-token')) {
      return makeResponse({ body: { token: 'T1' }, setCookie: 'sess=abc; Path=/; HttpOnly' });
    }
    const route = Object.keys(routes).find((path) => url.includes(path));
    return makeResponse(route ? routes[route]! : { status: 404 });
  };
  return { client: new StClient({ baseUrl: 'http://host:8000', fetchImpl }), calls };
}

function makeForm(): FormDataLike & { parts: [string, unknown][] } {
  const parts: [string, unknown][] = [];
  return { parts, append: (name, value) => parts.push([name, value]) };
}

describe('StClient.postForm', () => {
  it('sends X-CSRF-Token + Cookie but NO Content-Type, and passes the body through unchanged', async () => {
    const { client, calls } = makeClient({ '/api/avatars/upload': { body: { path: 'x.png' } } });
    const form = makeForm();

    const res = await client.postForm('/api/avatars/upload', form);

    expect(res.ok).toBe(true);
    const call = calls.find((c) => c.url.includes('/api/avatars/upload'));
    expect(call?.init?.headers?.['X-CSRF-Token']).toBe('T1');
    expect(call?.init?.headers?.['Cookie']).toBe('sess=abc');
    expect(call?.init?.headers).not.toHaveProperty('Content-Type');
    expect(call?.init?.body).toBe(form);
  });
});

describe('avatars endpoints', () => {
  it('getUserAvatars lists the avatar image files', async () => {
    const { client, calls } = makeClient({ '/api/avatars/get': { body: ['a.png', 'b.png'] } });
    const avatars = await getUserAvatars(client);
    expect(avatars).toEqual(['a.png', 'b.png']);
    const call = calls.find((c) => c.url.endsWith('/api/avatars/get'));
    expect(call?.init?.body).toBe(JSON.stringify({}));
  });

  it('getUserAvatars returns [] on a non-array response', async () => {
    const { client } = makeClient({ '/api/avatars/get': { status: 500, body: {} } });
    expect(await getUserAvatars(client)).toEqual([]);
  });

  it('deleteUserAvatar posts { avatar }', async () => {
    const { client, calls } = makeClient({ '/api/avatars/delete': { body: { result: 'ok' } } });
    expect(await deleteUserAvatar(client, 'a.png')).toBe(true);
    const call = calls.find((c) => c.url.endsWith('/api/avatars/delete'));
    expect(call?.init?.body).toBe(JSON.stringify({ avatar: 'a.png' }));
  });

  it('uploadUserAvatar appends overwrite_name, applies ?crop=, and returns { path }', async () => {
    const { client, calls } = makeClient({ '/api/avatars/upload': { body: { path: 'mine.png' } } });
    const form = makeForm();

    const crop = { x: 0, y: 0, width: 100, height: 150, want_resize: true };
    const result = await uploadUserAvatar(client, form, 'mine.png', crop);

    expect(result).toEqual({ path: 'mine.png' });
    expect(form.parts).toContainEqual(['overwrite_name', 'mine.png']);
    const call = calls.find((c) => c.url.includes('/api/avatars/upload'));
    expect(call?.url).toBe(`http://host:8000/api/avatars/upload?crop=${encodeURIComponent(JSON.stringify(crop))}`);
  });

  it('uploadUserAvatar returns null when the upload fails', async () => {
    const { client } = makeClient({ '/api/avatars/upload': { status: 400, body: 'Is not a valid image' } });
    expect(await uploadUserAvatar(client, makeForm())).toBeNull();
  });
});
