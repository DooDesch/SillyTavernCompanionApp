export type DiscoverySource = 'scan' | 'qr' | 'manual' | 'mdns';

/** A SillyTavern instance found (or entered) on the local network. */
export interface DiscoveredInstance {
  /** e.g. "http://192.168.178.23:8000" */
  baseUrl: string;
  ip: string;
  port: number;
  /** pkgVersion from `/version`, when known. */
  version?: string;
  /** Full agent string, e.g. "SillyTavern:1.18.0:Cohee#1207". */
  agent?: string;
  /** Whether the instance has user accounts enabled (login required before private endpoints). */
  requiresLogin?: boolean;
  source: DiscoverySource;
  /** Round-trip time of the fingerprint request, for sorting nearest-first. */
  rttMs?: number;
}

/**
 * A pluggable way to find instances. v1 ships scan/qr/manual providers; an mDNS provider
 * (react-native-zeroconf) can be added later behind the same interface with no UI change.
 */
export interface DiscoveryProvider {
  readonly id: string;
  discover(opts: {
    signal?: AbortSignal;
    onFound?: (instance: DiscoveredInstance) => void;
  }): AsyncIterable<DiscoveredInstance>;
}
