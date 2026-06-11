import type { StClient } from './StClient';

/**
 * Typed wrappers over SillyTavern's preset file API (src/endpoints/presets.js). The server
 * maps `apiId` to a per-user directory (data/<user>/instruct|context|sysprompt) and writes
 * `<name>.json` with the POSTed `preset` object verbatim - so callers must send the FULL
 * template object (unknown keys included), not a diff.
 */

/** Advanced-Formatting template kinds (subset of the server's apiId switch). */
export type PresetApiId = 'instruct' | 'context' | 'sysprompt';

export interface PresetRef {
  apiId: PresetApiId;
  /** Template name = file name without `.json` (server runs it through sanitize-filename). */
  name: string;
}

/** Write a template file (`POST /api/presets/save`). Returns true when the server saved it. */
export async function savePreset(
  client: StClient,
  params: PresetRef & { preset: Record<string, unknown> },
): Promise<boolean> {
  const res = await client.post<{ name?: string }>('/api/presets/save', {
    apiId: params.apiId,
    name: params.name,
    preset: params.preset,
  });
  return res.ok;
}

/** Delete a template file (`POST /api/presets/delete`). 404 (already gone) counts as failure. */
export async function deletePreset(client: StClient, params: PresetRef): Promise<boolean> {
  const res = await client.post('/api/presets/delete', { apiId: params.apiId, name: params.name });
  return res.ok;
}

export interface RestorePresetResult {
  /** True when the name matches a factory default - `preset` then holds the pristine content. */
  isDefault: boolean;
  preset: Record<string, unknown>;
}

/**
 * Look up the factory-default content for a template (`POST /api/presets/restore`). Returns null
 * on transport/server failure. A non-default (user-created) name yields `{ isDefault: false }`.
 */
export async function restorePreset(
  client: StClient,
  params: PresetRef,
): Promise<RestorePresetResult | null> {
  const res = await client.post<{ isDefault?: boolean; preset?: Record<string, unknown> }>(
    '/api/presets/restore',
    { apiId: params.apiId, name: params.name },
  );
  if (!res.ok) return null;
  return { isDefault: res.data?.isDefault === true, preset: res.data?.preset ?? {} };
}
