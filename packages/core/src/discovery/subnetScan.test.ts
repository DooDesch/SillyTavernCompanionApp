import { describe, expect, it, vi } from 'vitest';
import { probeInstance, scanSubnet } from './subnetScan';
import type { FetchInitLike, FetchResponseLike } from '../net/http';

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

const ST_VERSION = { agent: 'SillyTavern:1.18.0:Cohee', pkgVersion: '1.18.0', gitRevision: 'deadbee' };

describe('probeInstance', () => {
  it('returns an instance when /version fingerprints as SillyTavern', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, ST_VERSION));
    const inst = await probeInstance('192.168.178.23', 8000, { fetchImpl, now: () => 0 });
    expect(inst).toMatchObject({
      baseUrl: 'http://192.168.178.23:8000',
      ip: '192.168.178.23',
      port: 8000,
      version: '1.18.0',
      source: 'scan',
    });
    expect(fetchImpl).toHaveBeenCalledWith('http://192.168.178.23:8000/version', expect.objectContaining({ method: 'GET' }));
  });

  it('returns null for a non-SillyTavern responder', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, { server: 'nginx' }));
    expect(await probeInstance('192.168.178.1', 8000, { fetchImpl })).toBeNull();
  });

  it('returns null when the request rejects (refused/timeout)', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('ECONNREFUSED');
    });
    expect(await probeInstance('192.168.178.2', 8000, { fetchImpl })).toBeNull();
  });

  it('returns null immediately if already aborted', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, ST_VERSION));
    const ac = new AbortController();
    ac.abort();
    expect(await probeInstance('192.168.178.23', 8000, { fetchImpl, signal: ac.signal })).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('scanSubnet', () => {
  it('finds the single live ST host among many dead ones and fires onFound', async () => {
    const fetchImpl = async (url: string, _init?: FetchInitLike): Promise<FetchResponseLike> => {
      if (url.startsWith('http://192.168.178.23:8000')) return jsonResponse(200, ST_VERSION);
      throw new Error('dead');
    };
    const hosts = Array.from({ length: 254 }, (_, i) => `192.168.178.${i + 1}`);
    const onFound = vi.fn();

    const found = await scanSubnet({ fetchImpl, hosts, concurrency: 32, now: () => 0, onFound });

    expect(found).toHaveLength(1);
    expect(found[0]?.ip).toBe('192.168.178.23');
    expect(onFound).toHaveBeenCalledTimes(1);
  });

  it('probes priorityHosts before the rest of the range', async () => {
    const calls: string[] = [];
    const fetchImpl = async (url: string, _init?: FetchInitLike): Promise<FetchResponseLike> => {
      calls.push(url);
      throw new Error('dead'); // nothing alive — we only care about probe order
    };
    const hosts = ['192.168.178.1', '192.168.178.2', '192.168.178.99'];
    // concurrency 1 makes the order deterministic.
    await scanSubnet({
      fetchImpl,
      hosts,
      priorityHosts: ['192.168.178.99'],
      concurrency: 1,
      now: () => 0,
    });

    expect(calls[0]).toBe('http://192.168.178.99:8000/version');
    // The priority host is also in `hosts` but must be probed exactly once (de-duplicated).
    expect(calls.filter((u) => u.startsWith('http://192.168.178.99:8000')).length).toBe(1);
    expect(calls).toHaveLength(3);
  });

  it('surfaces the priority host first via onFound when it is the live one', async () => {
    const order: string[] = [];
    const fetchImpl = async (url: string): Promise<FetchResponseLike> => {
      if (url.startsWith('http://192.168.178.50:8000')) return jsonResponse(200, ST_VERSION);
      throw new Error('dead');
    };
    const hosts = Array.from({ length: 254 }, (_, i) => `192.168.178.${i + 1}`);
    const found = await scanSubnet({
      fetchImpl,
      hosts,
      priorityHosts: ['192.168.178.50'],
      concurrency: 1,
      now: () => 0,
      onFound: (i) => order.push(i.ip),
    });

    expect(order[0]).toBe('192.168.178.50');
    expect(found).toHaveLength(1);
  });
});
