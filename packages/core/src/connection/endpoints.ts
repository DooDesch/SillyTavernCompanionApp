import type { StClient } from './StClient';
import type { StCharacter } from '../types/character';
import type { StChat } from '../types/chat';
import type { StVersion } from '../types/version';
import { chatFromArray, chatToArray } from '../chat/serialize';
import { isIntegrityConflict } from '../chat/integrity';

/**
 * Typed wrappers over the SillyTavern private API. Request body field names mirror the server
 * exactly (verified against src/endpoints/chats.js and characters.js):
 *   /api/chats/get   { avatar_url, file_name }          file_name without the .jsonl extension
 *   /api/chats/save  { avatar_url, file_name, chat, force }
 *   /api/characters/get   { avatar_url }
 *   /api/characters/chats { avatar_url }
 */

export async function getVersion(client: StClient): Promise<StVersion> {
  const res = await client.get<StVersion>('/version');
  return res.data ?? {};
}

/** Lightweight reachability/auth probe; true when the instance answers `/version`. */
export async function isReachable(client: StClient): Promise<boolean> {
  try {
    const res = await client.get('/version');
    return res.ok;
  } catch {
    return false;
  }
}

/** Full user settings blob (`/api/settings/get`) — includes power_user, instruct, context, presets. */
export async function getSettings(client: StClient): Promise<Record<string, unknown>> {
  const res = await client.post<Record<string, unknown>>('/api/settings/get', {});
  return res.data ?? {};
}

/** Load a named lorebook (`/api/worldinfo/get`) — returns the world file `{ entries: {...} }`. */
export async function getWorldInfo(client: StClient, name: string): Promise<unknown> {
  const res = await client.post<unknown>('/api/worldinfo/get', { name });
  return res.data;
}

export async function getAllCharacters(client: StClient): Promise<StCharacter[]> {
  const res = await client.post<StCharacter[]>('/api/characters/all', {});
  return Array.isArray(res.data) ? res.data : [];
}

export async function getCharacter(client: StClient, avatarUrl: string): Promise<StCharacter> {
  const res = await client.post<StCharacter>('/api/characters/get', { avatar_url: avatarUrl });
  return res.data;
}

export interface ChatFileInfo {
  /** File name without extension — used as the chat id for /api/chats/get. */
  file_id?: string;
  /** File name with the .jsonl extension. */
  file_name: string;
  /** Preview of the last message (truncated by the server). */
  mes?: string;
  /** Timestamp (ms) of the last message. */
  last_mes?: number | string;
  chat_items?: number;
  [key: string]: unknown;
}

export async function getCharacterChats(client: StClient, avatarUrl: string): Promise<ChatFileInfo[]> {
  // Non-simple mode returns getChatInfo per chat: { file_id, file_name, mes (last-message preview),
  // last_mes }. The server replies `{ error: true }` (handled as []) only when no chats exist.
  const res = await client.post<ChatFileInfo[] | Record<string, unknown>>('/api/characters/chats', {
    avatar_url: avatarUrl,
  });
  return Array.isArray(res.data) ? (res.data as ChatFileInfo[]) : [];
}

/**
 * Load a chat. `fileName` is the base name (no .jsonl). Returns null when the chat does not exist
 * (the server replies with `{}` rather than an array).
 */
export async function getChat(
  client: StClient,
  avatarUrl: string,
  fileName: string,
): Promise<StChat | null> {
  const res = await client.post<unknown>('/api/chats/get', {
    avatar_url: avatarUrl,
    file_name: fileName,
  });
  if (!Array.isArray(res.data) || res.data.length === 0) return null;
  return chatFromArray(res.data);
}

export interface SaveChatResult {
  ok: boolean;
  /** True when the save was rejected because the PC changed the chat (HTTP 400 integrity). */
  conflict: boolean;
  status: number;
}

export async function saveChat(
  client: StClient,
  params: { avatarUrl: string; fileName: string; chat: StChat; force?: boolean },
): Promise<SaveChatResult> {
  const res = await client.post<unknown>('/api/chats/save', {
    avatar_url: params.avatarUrl,
    file_name: params.fileName,
    chat: chatToArray(params.chat),
    force: params.force ?? false,
  });
  return {
    ok: res.ok,
    conflict: isIntegrityConflict(res.status, res.data),
    status: res.status,
  };
}
