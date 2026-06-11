import { describe, expect, it } from 'vitest';
import { base64ToBytes, makeAvatarFilePart, newPersonaAvatarId } from './personaImage';
import { PERSONA_DEFAULT_AVATAR_BASE64 } from './personaDefaultAvatar';

describe('base64ToBytes', () => {
  it('decodes padded and unpadded base64', () => {
    const cases = ['', 'f', 'fo', 'foo', 'foob', 'fooba', 'foobar', 'Hello, Persona! äöü ✓'];
    for (const text of cases) {
      const b64 = Buffer.from(text, 'utf-8').toString('base64');
      expect(Buffer.from(base64ToBytes(b64)).toString('utf-8')).toBe(text);
      expect(Buffer.from(base64ToBytes(b64.replace(/=+$/, ''))).toString('utf-8')).toBe(text);
    }
  });

  it('tolerates whitespace/newlines inside the input', () => {
    const b64 = Buffer.from('chunky bytes', 'utf-8').toString('base64');
    const noisy = b64.slice(0, 4) + '\n' + b64.slice(4, 8) + ' ' + b64.slice(8);
    expect(Buffer.from(base64ToBytes(noisy)).toString('utf-8')).toBe('chunky bytes');
  });

  it('decodes the bundled default avatar to a real PNG', () => {
    const bytes = base64ToBytes(PERSONA_DEFAULT_AVATAR_BASE64);
    // PNG magic: 89 50 4E 47 0D 0A 1A 0A
    expect(Array.from(bytes.slice(0, 8))).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(bytes.length).toBeGreaterThan(1000);
  });
});

describe('makeAvatarFilePart', () => {
  it('produces the expo/fetch multipart shape (name + type + bytes())', () => {
    const b64 = Buffer.from([1, 2, 3]).toString('base64');
    const part = makeAvatarFilePart('p.png', 'image/png', b64);
    expect(part.name).toBe('p.png');
    expect(part.type).toBe('image/png');
    expect(Array.from(part.bytes())).toEqual([1, 2, 3]);
  });
});

describe('newPersonaAvatarId', () => {
  it('mirrors the desktop createDummyPersona id: timestamp + ASCII name + .png', () => {
    expect(newPersonaAvatarId('Käpt\'n Blaubär 7', 1700000000000)).toBe('1700000000000-KptnBlaubr7.png');
  });

  it('handles fully non-ASCII names', () => {
    expect(newPersonaAvatarId('日本語', 42)).toBe('42-.png');
  });
});
