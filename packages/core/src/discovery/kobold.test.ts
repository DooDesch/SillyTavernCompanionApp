import { describe, expect, it, vi } from 'vitest';
import { probeKobold, scanForKobold } from './kobold';
import type { FetchResponseLike } from '../net/http';

function jsonResponse(status: number, payload: unknown): FetchResponseLike {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => payload,
    text: async () => JSON.stringify(payload),
    body: null,
  };
}

const KOBOLD_VERSION = { result: 'KoboldCpp', version: '1.80' };

describe('probeKobold', () => {
  it('identifies a KoboldCpp server from /api/extra/version', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, KOBOLD_VERSION));
    const inst = await probeKobold('192.168.178.94', 5001, { fetchImpl });
    expect(inst).toMatchObject({ baseUrl: 'http://192.168.178.94:5001', ip: '192.168.178.94', port: 5001, version: '1.80' });
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://192.168.178.94:5001/api/extra/version',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('returns null for a non-Kobold responder', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, { result: 'something else' }));
    expect(await probeKobold('192.168.178.1', 5001, { fetchImpl })).toBeNull();
  });
});

describe('scanForKobold', () => {
  it('probes priorityHosts first and de-duplicates them against the range', async () => {
    const calls: string[] = [];
    const fetchImpl = async (url: string): Promise<FetchResponseLike> => {
      calls.push(url);
      throw new Error('dead');
    };
    await scanForKobold({
      fetchImpl,
      hosts: ['192.168.178.1', '192.168.178.94'],
      ports: [5001],
      priorityHosts: ['192.168.178.94'],
      concurrency: 1,
    });

    expect(calls[0]).toBe('http://192.168.178.94:5001/api/extra/version');
    expect(calls.filter((u) => u.startsWith('http://192.168.178.94:5001')).length).toBe(1);
    expect(calls).toHaveLength(2);
  });

  it('finds the live Kobold and reports it', async () => {
    const fetchImpl = async (url: string): Promise<FetchResponseLike> => {
      if (url.startsWith('http://192.168.178.94:5001')) return jsonResponse(200, KOBOLD_VERSION);
      throw new Error('dead');
    };
    const found = await scanForKobold({
      fetchImpl,
      hosts: ['192.168.178.1', '192.168.178.94', '192.168.178.95'],
      ports: [5001],
      concurrency: 4,
    });
    expect(found).toHaveLength(1);
    expect(found[0]?.baseUrl).toBe('http://192.168.178.94:5001');
  });
});
