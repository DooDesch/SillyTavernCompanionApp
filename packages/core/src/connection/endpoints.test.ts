import { describe, expect, it } from 'vitest';
import { StClient } from './StClient';
import { getChat, saveChat, getAllCharacters, getKoboldStatus, getHordeStatus } from './endpoints';
import type { FetchLike, FetchResponseLike } from '../net/http';
import type { StChat } from '../types/chat';

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

const header = { user_name: 'Dennis', character_name: 'Seraphina', create_date: 'x', chat_metadata: { integrity: 's1' } };
const message = { name: 'Seraphina', is_user: false, send_date: 1, mes: 'Hi' };

function clientReturning(routes: Record<string, FetchResponseLike>): StClient {
  const fetchImpl: FetchLike = async (url) => {
    if (url.endsWith('/csrf-token')) return res(200, { token: 'T' });
    for (const [suffix, response] of Object.entries(routes)) {
      if (url.endsWith(suffix)) return response;
    }
    return res(404, {});
  };
  return new StClient({ baseUrl: 'http://host:8000', fetchImpl });
}

describe('endpoints', () => {
  it('parses /api/chats/get array into header + messages', async () => {
    const client = clientReturning({ '/api/chats/get': res(200, [header, message]) });
    const chat = await getChat(client, 'Seraphina.png', 'chat1');
    expect(chat?.header.character_name).toBe('Seraphina');
    expect(chat?.messages).toHaveLength(1);
  });

  it('returns null when a chat does not exist (server replies {})', async () => {
    const client = clientReturning({ '/api/chats/get': res(200, {}) });
    expect(await getChat(client, 'Seraphina.png', 'missing')).toBeNull();
  });

  it('reports an integrity conflict on save (HTTP 400)', async () => {
    const client = clientReturning({ '/api/chats/save': res(400, { error: 'integrity' }) });
    const chat: StChat = { header, messages: [message] };
    const result = await saveChat(client, { avatarUrl: 'Seraphina.png', fileName: 'chat1', chat });
    expect(result.conflict).toBe(true);
    expect(result.ok).toBe(false);
  });

  it('returns characters from /api/characters/all', async () => {
    const client = clientReturning({ '/api/characters/all': res(200, [{ name: 'Seraphina', avatar: 'Seraphina.png' }]) });
    const chars = await getAllCharacters(client);
    expect(chars).toHaveLength(1);
    expect(chars[0]?.avatar).toBe('Seraphina.png');
  });

  it('maps the kobold status (model + versions) like desktop getStatusKobold', async () => {
    const client = clientReturning({
      '/api/backends/kobold/status': res(200, {
        model: 'koboldcpp/MythoMax-13B',
        koboldUnitedVersion: '1.2.5',
        koboldCppVersion: 'KoboldCpp',
      }),
    });
    const status = await getKoboldStatus(client, 'http://192.168.178.94:5001/api');
    expect(status).toEqual({
      connected: true,
      model: 'koboldcpp/MythoMax-13B',
      koboldUnitedVersion: '1.2.5',
      koboldCppVersion: 'KoboldCpp',
    });
  });

  it('reports kobold as disconnected for no_connection or a missing united version', async () => {
    const noModel = clientReturning({
      '/api/backends/kobold/status': res(200, { model: 'no_connection', koboldUnitedVersion: '1.2.5' }),
    });
    expect((await getKoboldStatus(noModel, 'http://x/api')).connected).toBe(false);
    const noVersion = clientReturning({
      '/api/backends/kobold/status': res(200, { model: 'some-model' }),
    });
    expect((await getKoboldStatus(noVersion, 'http://x/api')).connected).toBe(false);
  });

  it('maps the horde heartbeat to connected', async () => {
    const up = clientReturning({ '/api/horde/status': res(200, { ok: true }) });
    expect(await getHordeStatus(up)).toEqual({ connected: true });
    const down = clientReturning({ '/api/horde/status': res(200, { ok: false }) });
    expect(await getHordeStatus(down)).toEqual({ connected: false });
  });
});
