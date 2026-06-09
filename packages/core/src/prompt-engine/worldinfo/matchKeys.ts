import type { WorldInfoEntry, WorldInfoSettings } from './types';

/** Port of SillyTavern's `parseRegexFromString` — recognises `/pattern/flags` keys. */
export function parseRegexFromString(input: string): RegExp | null {
  const match = /^\/([\w\W]+?)\/([gimsuy]*)$/.exec(input);
  if (!match) return null;
  const [, pattern, flags] = match;
  if (!pattern) return null;
  try {
    return new RegExp(pattern, flags);
  } catch {
    return null;
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function transform(str: string, entry: WorldInfoEntry, settings: WorldInfoSettings): string {
  const caseSensitive = entry.caseSensitive ?? settings.caseSensitive;
  return caseSensitive ? str : str.toLowerCase();
}

/**
 * Port of `WorldInfoBuffer.matchKeys`. A /regex/ key overrides all options; otherwise plaintext
 * matching honours case-sensitivity and whole-word boundaries.
 */
export function matchKeys(
  haystack: string,
  needle: string,
  entry: WorldInfoEntry,
  settings: WorldInfoSettings,
): boolean {
  const keyRegex = parseRegexFromString(needle);
  if (keyRegex) return keyRegex.test(haystack);

  const hay = transform(haystack, entry, settings);
  const transformed = transform(needle, entry, settings);
  const matchWholeWords = entry.matchWholeWords ?? settings.matchWholeWords;

  if (matchWholeWords) {
    const keyWords = transformed.split(/\s+/);
    if (keyWords.length > 1) {
      return hay.includes(transformed);
    }
    const regex = new RegExp(`(?:^|\\W)(${escapeRegex(transformed)})(?:$|\\W)`);
    return regex.test(hay);
  }
  return hay.includes(transformed);
}
