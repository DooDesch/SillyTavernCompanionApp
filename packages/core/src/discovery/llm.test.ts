import { describe, expect, it } from 'vitest';
import { StClient } from '../connection/StClient';
import type { FetchLike, FetchResponseLike } from '../net/http';
import { detectLlmsViaServer, mergeLlmCandidates } from './llm';

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

/** ST server stub: answers the status route only for the given `${type}@${url}` keys. */
function serverWith(online: Record<string, { result: string; data: Array<{ id: string }> }>): StClient {
  const fetchImpl: FetchLike = async (url, init) => {
    if (url.endsWith('/csrf-token')) return res(200, { token: 'T' });
    if (url.endsWith('/api/backends/text-completions/status')) {
      const body = JSON.parse(String(init?.body)) as { api_server: string; api_type: string };
      const hit = online[`${body.api_type}@${body.api_server}`];
      return hit ? res(200, hit) : res(400, {});
    }
    return res(404, {});
  };
  return new StClient({ baseUrl: 'http://host:8000', fetchImpl });
}

describe('detectLlmsViaServer', () => {
  it('finds a local Ollama with all its models', async () => {
    const client = serverWith({
      'ollama@http://127.0.0.1:11434': {
        result: 'smollm:135m',
        data: [{ id: 'smollm:135m' }, { id: 'qwen-rp:latest' }],
      },
    });
    expect(await detectLlmsViaServer(client)).toEqual([
      { type: 'ollama', url: 'http://127.0.0.1:11434', models: ['smollm:135m', 'qwen-rp:latest'] },
    ]);
  });

  it('keeps one result per URL, the first candidate wins', async () => {
    const both = { result: 'm', data: [{ id: 'm' }] };
    const client = serverWith({ 'tabby@http://127.0.0.1:5000': both, 'ooba@http://127.0.0.1:5000': both });
    const found = await detectLlmsViaServer(client);
    expect(found.map((f) => f.type)).toEqual(['tabby']);
  });

  it('returns nothing when no backend answers', async () => {
    expect(await detectLlmsViaServer(serverWith({}))).toEqual([]);
  });

  it('probes remembered backends, also on LAN hosts', async () => {
    const client = serverWith({
      'koboldcpp@http://192.168.1.20:5001': { result: 'koboldcpp/x', data: [{ id: 'koboldcpp/x' }] },
    });
    const remembered = [{ type: 'koboldcpp', url: 'http://192.168.1.20:5001' }];
    const found = await detectLlmsViaServer(client, mergeLlmCandidates(remembered));
    expect(found).toEqual([{ type: 'koboldcpp', url: 'http://192.168.1.20:5001', models: ['koboldcpp/x'] }]);
  });
});

describe('detectLlmsViaServer timeout', () => {
  it('drops a probe that hangs and keeps the others', async () => {
    const fetchImpl: FetchLike = async (url, init) => {
      if (url.endsWith('/csrf-token')) return res(200, { token: 'T' });
      const body = JSON.parse(String(init?.body)) as { api_server: string };
      if (body.api_server.includes('192.168.1.99')) return new Promise<FetchResponseLike>(() => {});
      return res(200, { result: 'm', data: [{ id: 'm' }] });
    };
    const client = new StClient({ baseUrl: 'http://host:8000', fetchImpl });
    const found = await detectLlmsViaServer(
      client,
      [
        { type: 'koboldcpp', url: 'http://192.168.1.99:5001' },
        { type: 'ollama', url: 'http://127.0.0.1:11434' },
      ],
      50,
    );
    expect(found.map((f) => f.url)).toEqual(['http://127.0.0.1:11434']);
  });
});

describe('mergeLlmCandidates', () => {
  it('puts remembered backends first and drops duplicates', () => {
    const merged = mergeLlmCandidates(
      [
        { type: 'ollama', url: 'http://127.0.0.1:11434' },
        { type: 'koboldcpp', url: 'http://192.168.1.20:5001' },
      ],
      [
        { type: 'koboldcpp', url: 'http://127.0.0.1:5001' },
        { type: 'ollama', url: 'http://127.0.0.1:11434' },
      ],
    );
    expect(merged.map((c) => `${c.type}@${c.url}`)).toEqual([
      'ollama@http://127.0.0.1:11434',
      'koboldcpp@http://192.168.1.20:5001',
      'koboldcpp@http://127.0.0.1:5001',
    ]);
  });
});
