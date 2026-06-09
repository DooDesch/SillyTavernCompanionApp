import { describe, expect, it } from 'vitest';
import { fingerprintVersion, htmlLooksLikeSillyTavern } from './fingerprint';

describe('fingerprintVersion', () => {
  it('identifies SillyTavern from the agent string', () => {
    const fp = fingerprintVersion({ agent: 'SillyTavern:1.18.0:Cohee#1207', pkgVersion: '1.18.0' });
    expect(fp).toEqual({ isSillyTavern: true, version: '1.18.0', agent: 'SillyTavern:1.18.0:Cohee#1207' });
  });

  it('identifies SillyTavern from pkgVersion + gitRevision when agent is absent', () => {
    const fp = fingerprintVersion({ pkgVersion: '1.18.0', gitRevision: 'abcdef0' });
    expect(fp.isSillyTavern).toBe(true);
    expect(fp.version).toBe('1.18.0');
  });

  it('derives version from the agent string when pkgVersion is missing', () => {
    const fp = fingerprintVersion({ agent: 'SillyTavern:1.20.1:Someone' });
    expect(fp).toEqual({ isSillyTavern: true, version: '1.20.1', agent: 'SillyTavern:1.20.1:Someone' });
  });

  it('rejects non-SillyTavern responders', () => {
    expect(fingerprintVersion({ name: 'some other api' }).isSillyTavern).toBe(false);
    expect(fingerprintVersion(null).isSillyTavern).toBe(false);
    expect(fingerprintVersion('a string').isSillyTavern).toBe(false);
  });

  it('matches SillyTavern in HTML', () => {
    expect(htmlLooksLikeSillyTavern('<title>SillyTavern</title>')).toBe(true);
    expect(htmlLooksLikeSillyTavern('<title>nginx</title>')).toBe(false);
  });
});
