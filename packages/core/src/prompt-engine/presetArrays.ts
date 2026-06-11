/**
 * SillyTavern's /api/settings/get response carries SOME preset collections as arrays of
 * RAW JSON STRINGS (readPresetsFromDirectory: koboldai_settings, novelai_settings,
 * openai_settings, textgenerationwebui_presets) and others as parsed objects
 * (readAndParseFromDirectory: instruct, context, sysprompt, reasoning).
 *
 * Spreading a raw string as if it were an object yields indexed char properties and
 * silently applies nothing - always normalize through here before use.
 */
export function parsePresetArray<T extends object = Record<string, unknown>>(
  contents: unknown,
): T[] {
  if (!Array.isArray(contents)) return [];
  const out: T[] = [];
  for (const item of contents) {
    if (item && typeof item === 'object') {
      out.push(item as T);
      continue;
    }
    if (typeof item === 'string') {
      try {
        const parsed = JSON.parse(item) as unknown;
        if (parsed && typeof parsed === 'object') out.push(parsed as T);
      } catch {
        // skip malformed entries, like desktop's per-file try/catch
      }
    }
  }
  return out;
}

/** Pair a preset array with its parallel `*_names` array (desktop convention). */
export function presetsByName<T extends object = Record<string, unknown>>(
  contents: unknown,
  names: unknown,
): Map<string, T> {
  const presets = parsePresetArray<T>(contents);
  const nameList = Array.isArray(names) ? names.map(String) : [];
  const map = new Map<string, T>();
  for (let i = 0; i < presets.length; i++) {
    const name = nameList[i];
    if (name !== undefined) map.set(name, presets[i]!);
  }
  return map;
}
