/**
 * Decide whether an HTTP responder is a SillyTavern server, from `/version` (preferred) or the
 * root HTML. `/version` returns `{ agent: "SillyTavern:<ver>:<author>", pkgVersion, gitRevision, ... }`
 * (src/util.js getVersion).
 */

export interface Fingerprint {
  isSillyTavern: boolean;
  version?: string;
  agent?: string;
}

const NEGATIVE: Fingerprint = { isSillyTavern: false };

export function fingerprintVersion(body: unknown): Fingerprint {
  if (typeof body !== 'object' || body === null) return NEGATIVE;
  const v = body as { agent?: unknown; pkgVersion?: unknown; gitRevision?: unknown };

  const agent = typeof v.agent === 'string' ? v.agent : undefined;
  const pkgVersion = typeof v.pkgVersion === 'string' ? v.pkgVersion : undefined;

  const looksLikeSt =
    (agent?.includes('SillyTavern') ?? false) ||
    (pkgVersion !== undefined && typeof v.gitRevision === 'string');

  if (!looksLikeSt) return NEGATIVE;

  const result: Fingerprint = { isSillyTavern: true };
  if (pkgVersion) result.version = pkgVersion;
  else if (agent) {
    const parts = agent.split(':');
    if (parts[1]) result.version = parts[1];
  }
  if (agent) result.agent = agent;
  return result;
}

export function htmlLooksLikeSillyTavern(html: string): boolean {
  return /SillyTavern/i.test(html);
}
