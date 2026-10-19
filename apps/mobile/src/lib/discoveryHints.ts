import type { LlmEndpoint } from '@st/core';
import { secrets } from './storage';

/**
 * Persistent "last-known-good" discovery hints. When auto-detect previously found a server, we store
 * its host so future scans probe it FIRST, before sweeping the whole /24 (instant reconnect on the
 * common case where the server hasn't moved).
 *
 * Persisted via expo-secure-store (the only store that survives cold starts here - `storage` is
 * in-memory). Keys use dots, not ":", because secure-store rejects ":" in keys.
 */

export interface HostHint {
  ip: string;
  port: number;
}

// secure-store keys must match /^[\w.-]+$/
const KEY_ST = 'discovery.lastSt';
const KEY_KOBOLD = 'discovery.lastKobold';

/** Value format is "ip:port" (the colon is fine in a value - only keys are restricted). */
function parseHint(raw: string | null | undefined): HostHint | null {
  if (!raw) return null;
  const idx = raw.lastIndexOf(':');
  if (idx <= 0) return null;
  const ip = raw.slice(0, idx);
  const port = Number(raw.slice(idx + 1));
  if (!ip || !Number.isInteger(port) || port <= 0 || port > 65535) return null;
  return { ip, port };
}

async function getHint(key: string): Promise<HostHint | null> {
  try {
    return parseHint(await secrets.get(key));
  } catch {
    return null;
  }
}

async function rememberHint(key: string, ip: string, port: number): Promise<void> {
  try {
    await secrets.set(key, `${ip}:${port}`);
  } catch {
    // Persistence is best-effort; a failed write just means no fast-path next run.
  }
}

/** Parse "http://1.2.3.4:5001" (or "1.2.3.4:5001") into a host hint. */
export function parseHostPort(url: string | undefined | null): HostHint | null {
  if (!url) return null;
  const m = url.match(/^(?:https?:\/\/)?([^:/\s]+):(\d+)/);
  if (!m) return null;
  return parseHint(`${m[1]}:${m[2]}`);
}

export const getStHint = (): Promise<HostHint | null> => getHint(KEY_ST);
export const rememberStHint = (ip: string, port: number): Promise<void> =>
  rememberHint(KEY_ST, ip, port);

export const getKoboldHint = (): Promise<HostHint | null> => getHint(KEY_KOBOLD);
export const rememberKoboldHint = (ip: string, port: number): Promise<void> =>
  rememberHint(KEY_KOBOLD, ip, port);

const KEY_LLMS = 'discovery.lastLlms';
/** Enough for every default port plus a few LAN hosts; each entry costs one fast server probe. */
const MAX_LLM_HINTS = 10;

/** LLM backends found by earlier auto-detect runs, most recent first. */
export async function getLlmHints(): Promise<LlmEndpoint[]> {
  try {
    const raw = await secrets.get(KEY_LLMS);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn('[discovery] stored LLM hints are not a list, ignored');
      return [];
    }
    return parsed.filter(
      (e): e is LlmEndpoint =>
        !!e && typeof (e as LlmEndpoint).type === 'string' && typeof (e as LlmEndpoint).url === 'string',
    );
  } catch (e) {
    console.warn('[discovery] reading LLM hints failed', e);
    return [];
  }
}

/** Store the backends found now in front of the earlier ones, so the next run probes them first. */
export async function rememberLlmHints(found: LlmEndpoint[], previous: LlmEndpoint[]): Promise<void> {
  const seen = new Set<string>();
  const merged = [...found, ...previous]
    .filter((e) => {
      const key = `${e.type}|${e.url}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_LLM_HINTS)
    .map((e) => ({ type: e.type, url: e.url }));
  try {
    await secrets.set(KEY_LLMS, JSON.stringify(merged));
    console.info(`[discovery] remembered ${merged.length} LLM backend(s)`);
  } catch (e) {
    console.warn('[discovery] storing LLM hints failed', e);
  }
}
