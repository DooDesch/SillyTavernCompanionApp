/**
 * SillyTavern chat shapes.
 *
 * On disk a chat is a JSONL file; over the wire (`/api/chats/get` and `/api/chats/save`) it is a
 * JSON array whose first element is a metadata header and whose remaining elements are messages.
 * The save integrity check reads `array[0].chat_metadata.integrity` (see src/endpoints/chats.js
 * `trySaveChat` / `checkChatIntegrity`).
 */

export interface StChatMetadata {
  /** Conflict-detection slug; preserved on round-trip, compared by the server on save. */
  integrity?: string;
  [key: string]: unknown;
}

/** First line / first array element of a chat. */
export interface StChatHeader {
  user_name: string;
  character_name: string;
  create_date: string;
  chat_metadata: StChatMetadata;
  [key: string]: unknown;
}

export interface StMessageExtra {
  api?: string;
  model?: string;
  reasoning?: string;
  reasoning_signature?: string;
  [key: string]: unknown;
}

/** A single chat message line. */
export interface StChatMessage {
  name: string;
  is_user: boolean;
  is_system?: boolean;
  send_date: string | number;
  mes: string;
  swipes?: string[];
  swipe_id?: number;
  swipe_info?: unknown[];
  gen_started?: string;
  gen_finished?: string;
  extra?: StMessageExtra;
  [key: string]: unknown;
}

/** A parsed chat: header split from the message list. */
export interface StChat {
  header: StChatHeader;
  messages: StChatMessage[];
}
