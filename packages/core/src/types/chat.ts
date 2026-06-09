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
  /** Attached image (data URL or server path) for multimodal/vision chat-completion. */
  image?: string;
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
  /**
   * Transient client-side stable id (for React list keys after delete/insert). Not part of the ST
   * wire format - stripped by `chatToArray`/`stringifyChatJsonl` before a message is sent/persisted.
   */
  _cid?: string;
  [key: string]: unknown;
}

/** A parsed chat: header split from the message list. */
export interface StChat {
  header: StChatHeader;
  messages: StChatMessage[];
}
