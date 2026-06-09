/** Parse the embedded settings JSON from a `/api/settings/get` response. */
export function parseStSettings(data: unknown): Record<string, unknown> | null {
  if (!data) return null;
  const field = (data as { settings?: unknown }).settings;
  try {
    return typeof field === 'string'
      ? JSON.parse(field)
      : ((field as Record<string, unknown>) ?? (data as Record<string, unknown>));
  } catch {
    return data as Record<string, unknown>;
  }
}
