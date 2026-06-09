import { describe, expect, it } from 'vitest';
import {
  enumerateSubnet24,
  enumerateSubnetHosts,
  intToIpv4,
  ipv4ToInt,
  netmaskToPrefix,
  sameSubnet24,
} from './ip';

describe('ipv4 helpers', () => {
  it('round-trips ip <-> int', () => {
    for (const ip of ['0.0.0.0', '127.0.0.1', '192.168.178.42', '255.255.255.255']) {
      expect(intToIpv4(ipv4ToInt(ip))).toBe(ip);
    }
  });

  it('rejects invalid addresses', () => {
    expect(() => ipv4ToInt('192.168.1')).toThrow();
    expect(() => ipv4ToInt('192.168.1.256')).toThrow();
  });

  it('enumerates a /24 as 254 usable hosts, network+broadcast excluded', () => {
    const hosts = enumerateSubnet24('192.168.178.10');
    expect(hosts).toHaveLength(254);
    expect(hosts[0]).toBe('192.168.178.1');
    expect(hosts.at(-1)).toBe('192.168.178.254');
    expect(hosts).not.toContain('192.168.178.0');
    expect(hosts).not.toContain('192.168.178.255');
  });

  it('can exclude the scanning device itself', () => {
    const hosts = enumerateSubnet24('192.168.178.10', { excludeSelf: true });
    expect(hosts).toHaveLength(253);
    expect(hosts).not.toContain('192.168.178.10');
  });

  it('supports a /22 and caps wider prefixes', () => {
    expect(enumerateSubnetHosts('10.0.0.5', 22)).toHaveLength(1022);
    expect(() => enumerateSubnetHosts('10.0.0.5', 16)).toThrow();
  });

  it('converts netmask to prefix', () => {
    expect(netmaskToPrefix('255.255.255.0')).toBe(24);
    expect(netmaskToPrefix('255.255.252.0')).toBe(22);
    expect(() => netmaskToPrefix('255.0.255.0')).toThrow(/Non-contiguous/);
  });

  it('sameSubnet24: true within a /24, false across, false on bad input', () => {
    expect(sameSubnet24('192.168.178.10', '192.168.178.250')).toBe(true);
    expect(sameSubnet24('192.168.178.10', '192.168.179.10')).toBe(false);
    expect(sameSubnet24('192.168.178.10', '10.0.0.10')).toBe(false);
    expect(sameSubnet24('192.168.178.10', 'not-an-ip')).toBe(false);
  });
});
