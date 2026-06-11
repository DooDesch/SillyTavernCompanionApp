import type { StClient } from './StClient';
import type { StCharacter } from '../types/character';
import type { StChat } from '../types/chat';
import type { StVersion } from '../types/version';
import type { HordeModel, HordeWorker } from '../prompt-engine/horde';
import { chatFromArray, chatToArray } from '../chat/serialize';
import { isIntegrityConflict } from '../chat/integrity';
import { getNovelTierName } from '../prompt-engine/novelai';

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

/** Full user settings blob (`/api/settings/get`) - includes power_user, instruct, context, presets. */
export async function getSettings(client: StClient): Promise<Record<string, unknown>> {
  const res = await client.post<Record<string, unknown>>('/api/settings/get', {});
  return res.data ?? {};
}

/**
 * Persist a change back to the desktop. **`/api/settings/save` OVERWRITES the whole settings file**
 * with the POST body (no merge), so we read the current settings, apply `mutate` to only the target
 * keys, and write the full object back. Returns the saved settings object, or null on failure.
 */
export async function saveSettings(
  client: StClient,
  mutate: (settings: Record<string, unknown>) => void,
): Promise<Record<string, unknown> | null> {
  const res = await client.post<{ settings?: unknown }>('/api/settings/get', {});
  const raw = res.data?.settings;
  let settings: Record<string, unknown>;
  if (typeof raw === 'string') {
    try {
      settings = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  } else if (raw && typeof raw === 'object') {
    settings = raw as Record<string, unknown>;
  } else {
    return null;
  }
  mutate(settings);
  const save = await client.post('/api/settings/save', settings);
  return save.ok ? settings : null;
}

const withJsonl = (name: string): string => (/\.jsonl$/i.test(name) ? name : `${name}.jsonl`);

/** Rename a saved chat file (`/api/chats/rename`). Names may be passed with or without `.jsonl`. */
export async function renameChat(
  client: StClient,
  params: { avatarUrl: string; originalFile: string; renamedFile: string },
): Promise<boolean> {
  const res = await client.post('/api/chats/rename', {
    avatar_url: params.avatarUrl,
    original_file: withJsonl(params.originalFile),
    renamed_file: withJsonl(params.renamedFile),
    is_group: false,
  });
  return res.ok;
}

/** Delete a saved chat file (`/api/chats/delete`). */
export async function deleteChat(
  client: StClient,
  params: { avatarUrl: string; chatFile: string },
): Promise<boolean> {
  const res = await client.post('/api/chats/delete', {
    avatar_url: params.avatarUrl,
    chatfile: withJsonl(params.chatFile),
  });
  return res.ok;
}

export interface BackendStatus {
  /** True when the AI backend (KoboldCpp / cloud provider) answered and is usable. */
  connected: boolean;
  /** The loaded model id, when the backend reports one. */
  model?: string;
}

/**
 * Check whether the text-completion backend (KoboldCpp etc.) is reachable, via ST's status endpoint
 * (which fetches the backend's model list). Mirrors ST's `getStatusTextgen` - 200+`result` = online,
 * 400 = no connection. Never throws.
 */
export async function getTextCompletionStatus(
  client: StClient,
  params: { apiServer: string; apiType: string },
): Promise<BackendStatus> {
  try {
    const res = await client.post<{ result?: string }>('/api/backends/text-completions/status', {
      api_server: params.apiServer,
      api_type: params.apiType,
    });
    if (res.ok && res.data?.result && res.data.result !== 'no_connection') {
      return { connected: true, model: res.data.result };
    }
    return { connected: false };
  } catch {
    return { connected: false };
  }
}

export interface KoboldBackendStatus extends BackendStatus {
  /** Kobold United API version (KoboldCpp emulates it) - drives the stop_sequence/badwords gates. */
  koboldUnitedVersion?: string;
  /**
   * KoboldCpp marker - the ST server forwards /extra/version's `result` field, which is the
   * literal string 'KoboldCpp' on real KoboldCpp (and absent on Kobold United). versionCompare's
   * letters-after-digits collation then unlocks all KoboldCpp feature gates, like desktop.
   */
  koboldCppVersion?: string;
}

/**
 * KoboldAI Classic status via the ST server (`/api/backends/kobold/status` fans out to
 * {api_server}/v1/info/version + /extra/version + /v1/model). Mirrors desktop's
 * `getStatusKobold`: connected requires a model (not 'no_connection'/ReadOnly) AND the
 * mandatory koboldUnitedVersion. Never throws.
 */
export async function getKoboldStatus(client: StClient, apiServer: string): Promise<KoboldBackendStatus> {
  try {
    const res = await client.post<{
      model?: string;
      koboldUnitedVersion?: string;
      koboldCppVersion?: string;
    }>('/api/backends/kobold/status', {
      main_api: 'kobold',
      api_server: apiServer,
    });
    const model = res.data?.model;
    const united = res.data?.koboldUnitedVersion;
    const connected = !!(res.ok && united && model && model !== 'no_connection');
    return {
      connected,
      ...(connected && model ? { model } : {}),
      ...(united ? { koboldUnitedVersion: united } : {}),
      ...(res.data?.koboldCppVersion ? { koboldCppVersion: res.data.koboldCppVersion } : {}),
    };
  } catch {
    return { connected: false };
  }
}

/** AI Horde heartbeat via the ST server (`/api/horde/status` -> `{ ok }`). Never throws. */
export async function getHordeStatus(client: StClient): Promise<BackendStatus> {
  try {
    const res = await client.post<{ ok?: boolean }>('/api/horde/status', {});
    return { connected: res.ok && res.data?.ok === true };
  } catch {
    return { connected: false };
  }
}

/** Available AI Horde text models (`/api/horde/text-models`; server caches 60s, force bypasses). */
export async function getHordeModels(client: StClient, force = false): Promise<HordeModel[]> {
  const res = await client.post<HordeModel[]>('/api/horde/text-models', { force });
  return Array.isArray(res.data) ? res.data : [];
}

/** Available AI Horde text workers (`/api/horde/text-workers`). */
export async function getHordeWorkers(client: StClient, force = false): Promise<HordeWorker[]> {
  const res = await client.post<HordeWorker[]>('/api/horde/text-workers', { force });
  return Array.isArray(res.data) ? res.data : [];
}

/** Check whether the chat-completion (cloud) backend is usable - validates the server-side API key. */
export async function getChatCompletionStatus(client: StClient, source: string): Promise<BackendStatus> {
  try {
    const res = await client.post('/api/backends/chat-completions/status', { chat_completion_source: source });
    return { connected: res.ok };
  } catch {
    return { connected: false };
  }
}

export interface NovelStatus extends BackendStatus {
  /** NovelAI subscription tier (0 Paper, 1 Tablet, 2 Scroll, 3 Opus). */
  tier?: number;
}

/**
 * Check the NovelAI connection via ST's `/api/novelai/status` (proxies /user/subscription).
 * The server replies 400 when no NOVEL secret is stored and `{ error: true }` for a bad key -
 * both mean `connected: false`. On success the subscription tier name is exposed as `model`
 * (desktop shows the tier as the "model" readout). Never throws.
 */
export async function getNovelStatus(client: StClient): Promise<NovelStatus> {
  try {
    const res = await client.post<{ tier?: unknown; error?: unknown }>('/api/novelai/status', {});
    if (!res.ok || !res.data || res.data.error) return { connected: false };
    const tier = typeof res.data.tier === 'number' ? res.data.tier : undefined;
    return {
      connected: true,
      model: getNovelTierName(tier),
      ...(tier !== undefined ? { tier } : {}),
    };
  } catch {
    return { connected: false };
  }
}

/** Load a named lorebook (`/api/worldinfo/get`) - returns the world file `{ entries: {...} }`. */
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
  /** File name without extension - used as the chat id for /api/chats/get. */
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
