import { describe, expect, it } from 'vitest';
import { StClient } from './StClient';
import { savePreset, deletePreset, restorePreset } from './presets';
import type { FetchLike, FetchResponseLike } from '../net/http';

function res(status: number, body: unknown): FetchResponseLike {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => body,
    text: async () => JSON.stringify(body),
    body: null,
  };
}

/** Fake-fetch client that records every POST body per path suffix. */
function clientRecording(routes: Record<string, FetchResponseLike>) {
  const bodies: Record<string, unknown> = {};
  const fetchImpl: FetchLike = async (url, init) => {
    if (url.endsWith('/csrf-token')) return res(200, { token: 'T' });
    for (const [suffix, response] of Object.entries(routes)) {
      if (url.endsWith(suffix)) {
        bodies[suffix] = init?.body ? JSON.parse(String(init.body)) : undefined;
        return response;
      }
    }
    return res(404, {});
  };
  return { client: new StClient({ baseUrl: 'http://host:8000', fetchImpl }), bodies };
}

describe('presets endpoints', () => {
  it('savePreset posts apiId/name/preset verbatim (full object, newlines intact)', async () => {
    const { client, bodies } = clientRecording({ '/api/presets/save': res(200, { name: 'My ChatML' }) });
    const preset = { input_sequence: '<|im_start|>user\n', wrap: false, custom_unknown: 1, name: 'My ChatML' };
    const ok = await savePreset(client, { apiId: 'instruct', name: 'My ChatML', preset });
    expect(ok).toBe(true);
    expect(bodies['/api/presets/save']).toEqual({ apiId: 'instruct', name: 'My ChatML', preset });
  });

  it('savePreset returns false on server failure', async () => {
    const { client } = clientRecording({ '/api/presets/save': res(400, {}) });
    expect(await savePreset(client, { apiId: 'context', name: 'X', preset: {} })).toBe(false);
  });

  it('deletePreset posts apiId/name and maps 200/404 to true/false', async () => {
    const ok = clientRecording({ '/api/presets/delete': res(200, {}) });
    expect(await deletePreset(ok.client, { apiId: 'sysprompt', name: 'Old' })).toBe(true);
    expect(ok.bodies['/api/presets/delete']).toEqual({ apiId: 'sysprompt', name: 'Old' });

    const missing = clientRecording({ '/api/presets/delete': res(404, {}) });
    expect(await deletePreset(missing.client, { apiId: 'sysprompt', name: 'Old' })).toBe(false);
  });

  it('restorePreset returns the factory default payload', async () => {
    const { client } = clientRecording({
      '/api/presets/restore': res(200, { isDefault: true, preset: { name: 'Alpaca', wrap: true } }),
    });
    const result = await restorePreset(client, { apiId: 'instruct', name: 'Alpaca' });
    expect(result).toEqual({ isDefault: true, preset: { name: 'Alpaca', wrap: true } });
  });

  it('restorePreset reports user-created templates as non-default and failures as null', async () => {
    const user = clientRecording({ '/api/presets/restore': res(200, { isDefault: false, preset: {} }) });
    expect(await restorePreset(user.client, { apiId: 'context', name: 'Mine' })).toEqual({
      isDefault: false,
      preset: {},
    });

    const broken = clientRecording({ '/api/presets/restore': res(500, {}) });
    expect(await restorePreset(broken.client, { apiId: 'context', name: 'Mine' })).toBeNull();
  });
});
