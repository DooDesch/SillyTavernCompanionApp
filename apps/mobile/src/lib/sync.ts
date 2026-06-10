import { saveSettings, type StClient } from '@st/core';

/**
 * Two-way sync helpers: write app-side changes back to the desktop via `saveSettings` (which does a
 * safe read-modify-write of the whole settings file). All best-effort - they return false on failure
 * and never throw, so a sync hiccup never blocks the local change.
 */

function findConnectionManager(s: Record<string, unknown>): Record<string, unknown> | undefined {
  const pu = s.power_user as Record<string, unknown> | undefined;
  const ext = s.extension_settings as Record<string, unknown> | undefined;
  const candidates = [s.connectionManager, pu?.connectionManager, ext?.connectionManager];
  return candidates.find((c) => c && typeof c === 'object') as Record<string, unknown> | undefined;
}

async function safe(run: () => Promise<Record<string, unknown> | null>): Promise<boolean> {
  try {
    return (await run()) != null;
  } catch {
    return false;
  }
}

/** Write the active persona (root `user_avatar`) back to the desktop. */
export function syncPersonaToPc(client: StClient, avatar: string): Promise<boolean> {
  return safe(() => saveSettings(client, (s) => void (s.user_avatar = avatar)));
}

/** Write the selected connection-profile id into whichever connectionManager container exists. */
export function syncSelectedProfileToPc(client: StClient, profileId: string): Promise<boolean> {
  return safe(() =>
    saveSettings(client, (s) => {
      const cm = findConnectionManager(s);
      if (cm) cm.selectedProfile = profileId;
    }),
  );
}

/** Merge a partial `power_user` patch (e.g. tokenizer, context-template toggles). */
export function syncPowerUser(client: StClient, patch: Record<string, unknown>): Promise<boolean> {
  return safe(() =>
    saveSettings(client, (s) => {
      s.power_user = { ...((s.power_user as Record<string, unknown>) ?? {}), ...patch };
    }),
  );
}

/** Merge a partial `textgenerationwebui_settings` patch (text-completion samplers/streaming). */
export function syncTextgen(client: StClient, patch: Record<string, unknown>): Promise<boolean> {
  return safe(() =>
    saveSettings(client, (s) => {
      s.textgenerationwebui_settings = {
        ...((s.textgenerationwebui_settings as Record<string, unknown>) ?? {}),
        ...patch,
      };
    }),
  );
}

/** Merge a partial `oai_settings` patch (chat-completion samplers/streaming). */
export function syncOai(client: StClient, patch: Record<string, unknown>): Promise<boolean> {
  return safe(() =>
    saveSettings(client, (s) => {
      s.oai_settings = { ...((s.oai_settings as Record<string, unknown>) ?? {}), ...patch };
    }),
  );
}

/** Merge root-level settings keys (e.g. `max_context`, `amount_gen`). */
export function syncRoot(client: StClient, patch: Record<string, unknown>): Promise<boolean> {
  return safe(() => saveSettings(client, (s) => void Object.assign(s, patch)));
}

/**
 * Combined generation-settings save: ONE read-modify-write for textgen + oai + root patches
 * (the full settings screen would otherwise do three sequential whole-file writes).
 */
export function syncGeneration(
  client: StClient,
  patches: { textgen?: Record<string, unknown>; oai?: Record<string, unknown>; root?: Record<string, unknown> },
): Promise<boolean> {
  return safe(() =>
    saveSettings(client, (s) => {
      if (patches.textgen && Object.keys(patches.textgen).length) {
        s.textgenerationwebui_settings = {
          ...((s.textgenerationwebui_settings as Record<string, unknown>) ?? {}),
          ...patches.textgen,
        };
      }
      if (patches.oai && Object.keys(patches.oai).length) {
        s.oai_settings = { ...((s.oai_settings as Record<string, unknown>) ?? {}), ...patches.oai };
      }
      if (patches.root && Object.keys(patches.root).length) Object.assign(s, patches.root);
    }),
  );
}
