import type { StClient } from './StClient';

/**
 * Typed wrappers over the user-avatar (persona image) endpoints. Field names mirror the
 * server exactly (verified against src/endpoints/avatars.js):
 *   POST /api/avatars/get     {}                            -> string[] (image file names)
 *   POST /api/avatars/delete  { avatar }                    -> { result: 'ok' }
 *   POST /api/avatars/upload  multipart field 'avatar'      -> { path: fileName }
 *     optional body field `overwrite_name`, optional `?crop=` query (Jimp crop/resize;
 *     `want_resize` resizes to the desktop AVATAR_WIDTH x AVATAR_HEIGHT = 512x768).
 * The server re-encodes every upload to PNG (characters.js applyAvatarCropResize).
 */

/** Minimal multipart form surface - satisfied by the RN/undici/browser FormData. */
export interface FormDataLike {
  append(name: string, value: unknown, fileName?: string): void;
}

/** Optional server-side crop/resize for uploads (parsed from the `?crop=` query). */
export interface AvatarCrop {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Resize the cropped region to the desktop standard avatar size (512x768). */
  want_resize?: boolean;
}

/** List the user avatar image files (each file is a potential persona id). */
export async function getUserAvatars(client: StClient): Promise<string[]> {
  const res = await client.post<unknown>('/api/avatars/get', {});
  if (!Array.isArray(res.data)) return [];
  return res.data.filter((entry): entry is string => typeof entry === 'string');
}

/** Delete a user avatar image file. The settings-side persona entry is removed separately. */
export async function deleteUserAvatar(client: StClient, avatar: string): Promise<boolean> {
  const res = await client.post('/api/avatars/delete', { avatar });
  return res.ok;
}

/**
 * Upload a user avatar image. `form` must already contain the file under the field name
 * `avatar` (multer is mounted globally with `.single('avatar')`, server-main.js:269).
 * Pass `overwriteName` to replace an existing avatar file (also busts its thumbnail).
 * Returns the stored file name, or null on failure.
 */
export async function uploadUserAvatar(
  client: StClient,
  form: FormDataLike,
  overwriteName?: string,
  crop?: AvatarCrop,
): Promise<{ path: string } | null> {
  if (overwriteName) form.append('overwrite_name', overwriteName);
  const query = crop ? `?crop=${encodeURIComponent(JSON.stringify(crop))}` : '';
  const res = await client.postForm<{ path?: unknown }>(`/api/avatars/upload${query}`, form);
  if (!res.ok || typeof res.data?.path !== 'string') return null;
  return { path: res.data.path };
}
