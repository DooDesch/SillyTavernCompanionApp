import { uploadUserAvatar, type StClient } from '@st/core';

/**
 * Persona avatar uploads through `StClient.postForm` + `expo/fetch`.
 *
 * MULTIPART NOTE (verified against expo SDK 56 source, expo/src/winter/fetch/convertFormData.ts):
 * expo/fetch does NOT support React Native's `{ uri, name, type }` FormData file parts - it
 * throws 'Unsupported FormDataPart implementation'. It DOES serialize parts that are plain
 * objects with `name` (filename), `type` (content type) and a `bytes()` method. So we decode
 * the picked image's base64 (expo-image-picker is asked for base64) into bytes and hand
 * expo/fetch exactly that shape - no global-fetch fallback needed, auth stays in StClient.
 */
export interface AvatarFilePart {
  /** File name for the multipart content-disposition. */
  name: string;
  /** Content type for the part. */
  type: string;
  bytes(): Uint8Array;
}

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_LOOKUP = (() => {
  const table = new Int16Array(128).fill(-1);
  for (let i = 0; i < B64_ALPHABET.length; i++) table[B64_ALPHABET.charCodeAt(i)] = i;
  // base64url variants, tolerated for robustness.
  table['-'.charCodeAt(0)] = 62;
  table['_'.charCodeAt(0)] = 63;
  return table;
})();

/** Decode base64 to bytes (dependency-free - Hermes' atob availability varies by RN version). */
export function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/_-]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i + 1 < clean.length; i += 4) {
    const a = B64_LOOKUP[clean.charCodeAt(i)]!;
    const b = B64_LOOKUP[clean.charCodeAt(i + 1)]!;
    out[o++] = (a << 2) | (b >> 4);
    if (i + 2 < clean.length) {
      const c = B64_LOOKUP[clean.charCodeAt(i + 2)]!;
      out[o++] = ((b & 15) << 4) | (c >> 2);
      if (i + 3 < clean.length) {
        const d = B64_LOOKUP[clean.charCodeAt(i + 3)]!;
        out[o++] = ((c & 3) << 6) | d;
      }
    }
  }
  return out;
}

/** Build the expo/fetch-compatible multipart file part (see module note above). */
export function makeAvatarFilePart(filename: string, mime: string, base64: string): AvatarFilePart {
  return { name: filename, type: mime, bytes: () => base64ToBytes(base64) };
}

/**
 * Generated avatar id for new personas - desktop parity (personas.js createDummyPersona:496):
 * timestamp + ASCII-only name, `.png` extension (the server re-encodes every upload to PNG).
 */
export function newPersonaAvatarId(name: string, now: number = Date.now()): string {
  return `${now}-${name.replace(/[^a-zA-Z0-9]/g, '')}.png`;
}

export interface PersonaImageSource {
  base64: string;
  mime?: string;
  width?: number;
  height?: number;
}

/**
 * Upload a persona image under `avatarId` (always with overwrite_name, so the stored file
 * name is deterministic). When dimensions are known, requests the desktop-standard resize
 * (512x768 cover) so phone photos do not land full-size on the PC. Best-effort boolean.
 */
export async function uploadPersonaImage(
  client: StClient,
  image: PersonaImageSource,
  avatarId: string,
): Promise<boolean> {
  try {
    const form = new FormData();
    const part = makeAvatarFilePart(avatarId, image.mime ?? 'image/png', image.base64);
    form.append('avatar', part as unknown as Blob);
    const crop =
      image.width && image.height
        ? { x: 0, y: 0, width: image.width, height: image.height, want_resize: true }
        : undefined;
    const result = await uploadUserAvatar(client, form, avatarId, crop);
    return result != null;
  } catch {
    return false;
  }
}
