import type { StChat, StChatHeader, StChatMessage } from '../types/chat';

/**
 * Convert the array returned by `POST /api/chats/get` into a header + messages split.
 * Element 0 is the metadata header; the remainder are messages.
 */
export function chatFromArray(rows: readonly unknown[]): StChat {
  if (rows.length === 0) {
    throw new Error('chatFromArray: empty chat array (expected at least a header row)');
  }
  const header = rows[0] as StChatHeader;
  const messages = rows.slice(1) as StChatMessage[];
  return { header, messages };
}

/** Convert a header + messages split back into the array body for `POST /api/chats/save`. */
export function chatToArray(chat: StChat): unknown[] {
  return [chat.header, ...chat.messages];
}

/** Parse an on-disk JSONL chat file into a header + messages split. */
export function parseChatJsonl(content: string): StChat {
  const rows: unknown[] = [];
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (line.length === 0) continue;
    rows.push(JSON.parse(line));
  }
  return chatFromArray(rows);
}

/** Serialize a header + messages split into the on-disk JSONL representation. */
export function stringifyChatJsonl(chat: StChat): string {
  return chatToArray(chat)
    .map((row) => JSON.stringify(row))
    .join('\n');
}

/** Build a fresh header for a brand-new chat (no integrity slug → server skips the check). */
export function createChatHeader(params: {
  userName: string;
  characterName: string;
  createDate: string;
}): StChatHeader {
  return {
    user_name: params.userName,
    character_name: params.characterName,
    create_date: params.createDate,
    chat_metadata: {},
  };
}
