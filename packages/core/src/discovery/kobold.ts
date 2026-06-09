import { mapPool } from './pool';
import type { FetchLike } from '../net/http';

/** A KoboldCpp backend found on the LAN (the URL ST forwards generation to). */
export interface KoboldInstance {
  baseUrl: string;
  ip: string;
  port: number;
  version?: string;
}

export interface KoboldProbeOptions {
  fetchImpl: FetchLike;
  timeoutMs?: number;
  signal?: AbortSignal;
}

/** True when `/api/extra/version` identifies a KoboldCpp (or compatible) server. */
function isKobold(body: unknown): { ok: boolean; version?: string } {
  if (typeof body !== 'object' || body === null) return { ok: false };
  const v = body as { result?: unknown; version?: unknown };
  const result = typeof v.result === 'string' ? v.result : '';
  if (/kobold/i.test(result)) {
    return { ok: true, version: typeof v.version === 'string' ? v.version : undefined };
  }
  return { ok: false };
}

export async function probeKobold(
  ip: string,
  port: number,
  opts: KoboldProbeOptions,
): Promise<KoboldInstance | null> {
  if (opts.signal?.aborted) return null;
  const baseUrl = `http://${ip}:${port}`;
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  opts.signal?.addEventListener('abort', onAbort, { once: true });
  let timer: ReturnType<typeof setTimeout> | undefined;

  const probe = async (): Promise<KoboldInstance | null> => {
    const res = await opts.fetchImpl(`${baseUrl}/api/extra/version`, { method: 'GET', signal: controller.signal });
    if (!res.ok) return null;
    const body = await res.json().catch(() => null);
    const fp = isKobold(body);
    if (!fp.ok) return null;
    const instance: KoboldInstance = { baseUrl, ip, port };
    if (fp.version) instance.version = fp.version;
    return instance;
  };

  try {
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => {
        controller.abort();
        resolve(null);
      }, opts.timeoutMs ?? 800);
    });
    return await Promise.race([probe(), timeout]);
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onAbort);
  }
}

export interface KoboldScanOptions extends KoboldProbeOptions {
  hosts: readonly string[];
  /** KoboldCpp's default port is 5001. */
  ports?: readonly number[];
  /** Hosts to probe first (last-known-good), de-duplicated against `hosts`. See scanSubnet. */
  priorityHosts?: readonly string[];
  concurrency?: number;
  onFound?: (instance: KoboldInstance) => void;
}

/** Scan the subnet for KoboldCpp servers (default ports 5001, 5000). */
export async function scanForKobold(opts: KoboldScanOptions): Promise<KoboldInstance[]> {
  const ports = opts.ports ?? [5001, 5000];
  const concurrency = opts.concurrency ?? 28;
  const priority = opts.priorityHosts ?? [];
  const prioritySet = new Set(priority);
  const orderedHosts = [...priority, ...opts.hosts.filter((ip) => !prioritySet.has(ip))];
  const targets = orderedHosts.flatMap((ip) => ports.map((port) => ({ ip, port })));
  const found: KoboldInstance[] = [];
  await mapPool(targets, concurrency, async (t) => {
    if (opts.signal?.aborted) return;
    const inst = await probeKobold(t.ip, t.port, opts);
    if (inst) {
      found.push(inst);
      opts.onFound?.(inst);
    }
  });
  return found;
}
