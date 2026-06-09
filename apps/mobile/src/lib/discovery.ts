import * as Network from 'expo-network';
import {
  enumerateSubnet24,
  sameSubnet24,
  scanForKobold,
  scanSubnet,
  type DiscoveredInstance,
  type KoboldInstance,
} from '@st/core';
import i18n from '@/i18n';
import { fetchLike } from './expoFetch';
import {
  getKoboldHint,
  getStHint,
  parseHostPort,
  rememberKoboldHint,
  rememberStHint,
  type HostHint,
} from './discoveryHints';

export interface DiscoverOptions {
  onFound?: (instance: DiscoveredInstance) => void;
  signal?: AbortSignal;
  ports?: number[];
}

const uniq = <T,>(xs: T[]): T[] => [...new Set(xs)];

async function localIpv4(): Promise<string> {
  const ip = await Network.getIpAddressAsync();
  if (!ip || ip === '0.0.0.0') {
    throw new Error(i18n.t('onboarding.noLocalIp'));
  }
  return ip;
}

/**
 * A stored hint is only a useful fast-path target if it's on the /24 we're about to sweep and isn't
 * the device itself. After a Wi-Fi change the old host is on another subnet (guaranteed-dead probe);
 * a self-IP would violate the scanner's excludeSelf guarantee. In both cases we ignore the hint.
 */
function usableHint(hint: HostHint | null, selfIp: string): HostHint | null {
  if (!hint) return null;
  if (hint.ip === selfIp) return null;
  if (!sameSubnet24(hint.ip, selfIp)) return null;
  return hint;
}

/**
 * Zero-install LAN discovery: read this device's IPv4, enumerate the /24 it sits in, and probe each
 * host for a SillyTavern `/version` fingerprint. Results are streamed via `onFound`.
 *
 * If a previous run found/connected to an instance on this subnet, its host is probed FIRST (passed
 * as `priorityHosts`), so it surfaces within one RTT at the top of the list while the rest of the /24
 * keeps scanning. The full sweep stays on the default ports - the hint never widens it.
 *
 * Assumes a /24 (the common home-router case) since expo-network does not expose the netmask.
 * QR-pairing and manual IP entry cover the cases where the scan can't reach the host (AP isolation,
 * wider subnets, blocked multicast, non-default ports).
 */
export async function discoverInstances(options: DiscoverOptions = {}): Promise<DiscoveredInstance[]> {
  const ip = await localIpv4();
  const ports = options.ports ?? [8000];
  const hint = usableHint(await getStHint(), ip);
  const hosts = enumerateSubnet24(ip, { excludeSelf: true });

  const results = await scanSubnet({
    fetchImpl: fetchLike,
    hosts,
    ports,
    ...(hint ? { priorityHosts: [hint.ip] } : {}),
    concurrency: 28,
    timeoutMs: 800,
    ...(options.onFound ? { onFound: options.onFound } : {}),
    ...(options.signal ? { signal: options.signal } : {}),
  });

  // Seed the fast path on "found" (not only on connect): remember the nearest instance so the next
  // run probes it first. scanSubnet returns results sorted by RTT, so results[0] is the closest.
  if (results.length > 0) void rememberStHint(results[0]!.ip, results[0]!.port);
  return results;
}

export interface KoboldDiscoverOptions {
  onFound?: (i: KoboldInstance) => void;
  signal?: AbortSignal;
  /** A URL to try first (e.g. the current manual koboldOverride), in addition to the stored hint. */
  preferUrl?: string;
}

/**
 * Scan the LAN for a KoboldCpp backend on its default port (5001/5000).
 *
 * Fast path: if a previous detect found one on this subnet (or a manual override URL is given), probe
 * those known hosts FIRST - on their exact last-seen port AND the defaults. If one still answers,
 * return immediately and skip the full sweep, turning the common "box hasn't moved" case from an ~8 s
 * /24 scan into one RTT.
 */
export async function discoverKobold(options: KoboldDiscoverOptions = {}): Promise<KoboldInstance[]> {
  const ip = await localIpv4();
  const defaultPorts = [5001, 5000];

  const hints: HostHint[] = [];
  const stored = usableHint(await getKoboldHint(), ip);
  if (stored) hints.push(stored);
  // A manual override is an explicit, possibly-routed target - probe it even if off the local /24,
  // but never probe the device itself.
  const preferred = parseHostPort(options.preferUrl);
  if (preferred && preferred.ip !== ip && !hints.some((h) => h.ip === preferred.ip && h.port === preferred.port)) {
    hints.push(preferred);
  }

  const onFound = options.onFound;
  const signal = options.signal;
  const hintIps = uniq(hints.map((h) => h.ip));

  // Phase 1 - probe the known host(s) first, on their exact port(s) plus the defaults. A hit
  // short-circuits the whole sweep.
  if (hints.length > 0) {
    const quick = await scanForKobold({
      fetchImpl: fetchLike,
      hosts: hintIps,
      ports: uniq([...hints.map((h) => h.port), ...defaultPorts]),
      concurrency: Math.max(1, hintIps.length),
      timeoutMs: 800,
      ...(onFound ? { onFound } : {}),
      ...(signal ? { signal } : {}),
    });
    if (quick.length > 0) {
      void rememberKoboldHint(quick[0]!.ip, quick[0]!.port);
      return quick;
    }
  }

  if (signal?.aborted) return [];

  // Phase 2 - full /24 sweep on the default ports (the hint hosts were just proven unreachable, so
  // they're dropped from the range to avoid re-probing them).
  const hintSet = new Set(hintIps);
  const hosts = enumerateSubnet24(ip, { excludeSelf: false }).filter((h) => !hintSet.has(h));
  const all = await scanForKobold({
    fetchImpl: fetchLike,
    hosts,
    ports: defaultPorts,
    concurrency: 28,
    timeoutMs: 800,
    ...(onFound ? { onFound } : {}),
    ...(signal ? { signal } : {}),
  });
  if (all.length > 0) void rememberKoboldHint(all[0]!.ip, all[0]!.port);
  return all;
}
