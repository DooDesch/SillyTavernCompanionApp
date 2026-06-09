import { DEFAULT_WORLD_INFO_SETTINGS, type WorldInfoEntry, type WorldInfoSettings } from './types';

/** Convert a SillyTavern world file (`{ entries: { uid: {...} } }`) to engine entries. */
export function worldFileToEntries(world: unknown): WorldInfoEntry[] {
  const entries = (world as { entries?: unknown })?.entries;
  if (!entries) return [];
  const list = Array.isArray(entries) ? entries : Object.values(entries as Record<string, unknown>);
  return list as WorldInfoEntry[];
}

/** Convert an embedded character_book (TavernCard v2/v3) to engine entries. */
export function characterBookToEntries(book: unknown): WorldInfoEntry[] {
  const raw = (book as { entries?: unknown })?.entries;
  if (!Array.isArray(raw)) return [];
  return raw.map((e: Record<string, any>): WorldInfoEntry => {
    const ext = (e.extensions ?? {}) as Record<string, any>;
    const position =
      ext.position !== undefined ? Number(ext.position) : e.position === 'after_char' ? 1 : 0;
    return {
      uid: e.id,
      key: e.keys ?? [],
      keysecondary: e.secondary_keys ?? [],
      content: e.content ?? '',
      comment: e.comment ?? e.name ?? '',
      constant: e.constant ?? false,
      selective: e.selective ?? true,
      selectiveLogic: ext.selectiveLogic,
      order: e.insertion_order ?? 100,
      position,
      depth: ext.depth ?? 4,
      role: ext.role ?? null,
      probability: ext.probability ?? 100,
      useProbability: ext.useProbability ?? true,
      disable: e.enabled === false,
      caseSensitive: e.case_sensitive ?? null,
      matchWholeWords: ext.match_whole_words ?? null,
      excludeRecursion: ext.exclude_recursion ?? false,
      preventRecursion: ext.prevent_recursion ?? false,
    };
  });
}

/** Extract World Info settings from the parsed `/api/settings/get` object (top-level fields). */
export function extractWorldInfoSettings(parsed: Record<string, unknown>): WorldInfoSettings {
  const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d);
  return {
    depth: num(parsed.world_info_depth, DEFAULT_WORLD_INFO_SETTINGS.depth),
    budget: num(parsed.world_info_budget, DEFAULT_WORLD_INFO_SETTINGS.budget),
    budgetCap: num(parsed.world_info_budget_cap, DEFAULT_WORLD_INFO_SETTINGS.budgetCap),
    caseSensitive: parsed.world_info_case_sensitive === true,
    matchWholeWords: parsed.world_info_match_whole_words !== false,
    recursive: parsed.world_info_recursive !== false,
    maxRecursionSteps: num(parsed.world_info_max_recursion_steps, 0),
    includeNames: parsed.world_info_include_names !== false,
  };
}

/** Names of globally-selected lorebooks (settings.world_info.globalSelect). */
export function globalWorldNames(parsed: Record<string, unknown>): string[] {
  const wi = parsed.world_info as { globalSelect?: unknown } | undefined;
  return Array.isArray(wi?.globalSelect) ? (wi!.globalSelect as string[]) : [];
}
