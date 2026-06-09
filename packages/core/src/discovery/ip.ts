/** IPv4 <-> 32-bit integer helpers and subnet host enumeration for the LAN scanner. */

export function ipv4ToInt(ip: string): number {
  const parts = ip.split('.');
  if (parts.length !== 4) throw new Error(`Invalid IPv4 address: ${ip}`);
  let value = 0;
  for (const part of parts) {
    const octet = Number(part);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) {
      throw new Error(`Invalid IPv4 address: ${ip}`);
    }
    value = value * 256 + octet;
  }
  return value >>> 0;
}

export function intToIpv4(value: number): string {
  const v = value >>> 0;
  return [(v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff].join('.');
}

/**
 * Enumerate the usable host addresses of the subnet that `ip` belongs to, given a prefix length.
 * Excludes the network and broadcast addresses, and (optionally) `ip` itself.
 * Capped at /22 (1022 hosts) so a misconfigured /8 can't generate millions of probes.
 */
export function enumerateSubnetHosts(
  ip: string,
  prefix: number,
  options: { excludeSelf?: boolean } = {},
): string[] {
  if (prefix < 22 || prefix > 30) {
    throw new Error(`Unsupported prefix /${prefix}; expected /22../30`);
  }
  const ipInt = ipv4ToInt(ip);
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const network = (ipInt & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;

  const hosts: string[] = [];
  for (let addr = network + 1; addr < broadcast; addr++) {
    if (options.excludeSelf && addr === ipInt) continue;
    hosts.push(intToIpv4(addr >>> 0));
  }
  return hosts;
}

/** Convenience: the 254 usable hosts of the /24 containing `ip`. */
export function enumerateSubnet24(ip: string, options: { excludeSelf?: boolean } = {}): string[] {
  return enumerateSubnetHosts(ip, 24, options);
}

/**
 * True when both IPv4 addresses sit in the same /24 - i.e. the subnet the scanner actually sweeps.
 * Used to discard a stored discovery hint after the device has moved to another network, so a
 * guaranteed-dead off-subnet host is never probed as a "fast path". Returns false on bad input.
 */
export function sameSubnet24(a: string, b: string): boolean {
  try {
    const netA = (ipv4ToInt(a) & 0xffffff00) >>> 0;
    const netB = (ipv4ToInt(b) & 0xffffff00) >>> 0;
    return netA === netB;
  } catch {
    return false;
  }
}

/** Derive the prefix length from a dotted netmask (e.g. "255.255.255.0" -> 24). */
export function netmaskToPrefix(netmask: string): number {
  const value = ipv4ToInt(netmask);
  let prefix = 0;
  let seenZero = false;
  for (let bit = 31; bit >= 0; bit--) {
    const isSet = (value & (1 << bit)) !== 0;
    if (isSet) {
      if (seenZero) throw new Error(`Non-contiguous netmask: ${netmask}`);
      prefix += 1;
    } else {
      seenZero = true;
    }
  }
  return prefix;
}
