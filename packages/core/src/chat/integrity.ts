import type { StChat } from '../types/chat';

/** Error code returned by `POST /api/chats/save` when the on-disk chat changed underneath us. */
export const INTEGRITY_ERROR = 'integrity';

/** The integrity slug carried by a loaded chat (header row), if any. */
export function getIntegritySlug(chat: StChat): string | undefined {
  return chat.header.chat_metadata?.integrity;
}

/**
 * True when a save response indicates a conflict (HTTP 400 `{ error: 'integrity' }`).
 * The PC has modified the same chat since we loaded it.
 */
export function isIntegrityConflict(status: number, body: unknown): boolean {
  return (
    status === 400 &&
    typeof body === 'object' &&
    body !== null &&
    (body as { error?: unknown }).error === INTEGRITY_ERROR
  );
}
