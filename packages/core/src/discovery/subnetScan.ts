import { mapPool } from './pool';
import { fingerprintVersion } from './fingerprint';
import type { DiscoveredInstance } from './types';
import type { FetchLike } from '../net/http';

export interface ProbeOptions {
  fetchImpl: FetchLike;
  /** Hard per-host timeout. Dead IPs otherwise hang until the OS TCP timeout (seconds). */
  timeoutMs?: number;
  now?: () => number;
  signal?: AbortSignal;
}

const DEFAULT_TIMEOUT_MS = 800;

/**
 * Probe a single host:port for a SillyTavern server via `GET /version`.
 * Returns a `DiscoveredInstance` on a positive fingerprint, otherwise `null` (including on
 * timeout, connection refused, or non-ST responder).
 */
export async function probeInstance(
  ip: string,
  port: number,
  opts: ProbeOptions,
): Promise<DiscoveredInstance | null> {
  if (opts.signal?.aborted) return null;
  const now = opts.now ?? (() => Date.now());
  const baseUrl = `http://${ip}:${port}`;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  const onParentAbort = () => controller.abort();
  opts.signal?.addEventListener('abort', onParentAbort, { once: true });
  let timer: ReturnType<typeof setTimeout> | undefined;

  const started = now();
  const probe = async (): Promise<DiscoveredInstance | null> => {
    const res = await opts.fetchImpl(`${baseUrl}/version`, { method: 'GET', signal: controller.signal });
    if (!res.ok) return null;
    const body = await res.json().catch(() => null);
    const fp = fingerprintVersion(body);
    if (!fp.isSillyTavern) return null;
    const instance: DiscoveredInstance = { baseUrl, ip, port, source: 'scan', rttMs: now() - started };
    if (fp.version) instance.version = fp.version;
    if (fp.agent) instance.agent = fp.agent;
    return instance;
  };

  try {
    // Hard-bound each probe: some platforms don't abort an in-flight connect promptly, so race the
    // fetch against a timeout that resolves null. Guarantees the whole scan finishes in bounded time.
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => {
        controller.abort();
        resolve(null);
      }, timeoutMs);
    });
    return await Promise.race([probe(), timeout]);
  } catch {
    // Aborted, refused, or unparseable — not a reachable ST instance.
    return null;
  } finally {
    if (timer) clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onParentAbort);
  }
}

export interface ScanOptions extends ProbeOptions {
  hosts: readonly string[];
  /** Ports to try per host. ST default is 8000. */
  ports?: readonly number[];
  /**
   * Hosts to probe FIRST, ahead of the rest of the range. Pass the last-known-good host(s) here so a
   * returning instance surfaces within one RTT instead of after the whole /24 drains. Priority hosts
   * are de-duplicated against `hosts` (never probed twice) and may include addresses outside `hosts`.
   */
  priorityHosts?: readonly string[];
  /** Max simultaneous probes. Keep modest so weak Wi-Fi hardware copes. */
  concurrency?: number;
  /** Called as soon as each instance is found, so the UI can render incrementally. */
  onFound?: (instance: DiscoveredInstance) => void;
}

/** Scan a list of hosts × ports for SillyTavern instances, found-callbacks fired incrementally. */
export async function scanSubnet(opts: ScanOptions): Promise<DiscoveredInstance[]> {
  const ports = opts.ports ?? [8000];
  const concurrency = opts.concurrency ?? 28;
  const priority = opts.priorityHosts ?? [];
  const prioritySet = new Set(priority);
  // Priority hosts first (probed in the leading pool slots), then the remaining range minus any
  // host already covered by the priority list, so no host is probed twice.
  const orderedHosts = [...priority, ...opts.hosts.filter((ip) => !prioritySet.has(ip))];
  const targets = orderedHosts.flatMap((ip) => ports.map((port) => ({ ip, port })));

  const found: DiscoveredInstance[] = [];
  await mapPool(targets, concurrency, async (target) => {
    if (opts.signal?.aborted) return;
    const instance = await probeInstance(target.ip, target.port, opts);
    if (instance) {
      found.push(instance);
      opts.onFound?.(instance);
    }
  });

  found.sort((a, b) => (a.rttMs ?? Infinity) - (b.rttMs ?? Infinity));
  return found;
}
