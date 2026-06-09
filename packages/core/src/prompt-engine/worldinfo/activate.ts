import {
  WORLD_INFO_LOGIC,
  WORLD_INFO_POSITION,
  type WorldInfoActivation,
  type WorldInfoEntry,
  type WorldInfoSettings,
} from './types';
import { matchKeys } from './matchKeys';
import { substituteParams } from '../substituteParams';
import type { Identity } from '../types';

export interface CheckWorldInfoParams {
  entries: WorldInfoEntry[];
  /** Recent chat messages, chronological (newest last). Their text is scanned for keys. */
  chatMessages: string[];
  settings: WorldInfoSettings;
  maxContext: number;
  identity: Identity;
  countTokens: (text: string) => number;
  /** [0,1) source for probability rolls; defaults to Math.random (injectable for tests). */
  random?: () => number;
}

function secondaryActivated(
  entry: WorldInfoEntry,
  scan: string,
  settings: WorldInfoSettings,
): boolean {
  const secondary = (entry.keysecondary ?? []).filter((k) => k);
  if (secondary.length === 0) return true;
  const any = secondary.some((k) => matchKeys(scan, k, entry, settings));
  const all = secondary.every((k) => matchKeys(scan, k, entry, settings));
  switch (entry.selectiveLogic ?? WORLD_INFO_LOGIC.AND_ANY) {
    case WORLD_INFO_LOGIC.AND_ALL:
      return all;
    case WORLD_INFO_LOGIC.NOT_ALL:
      return !all;
    case WORLD_INFO_LOGIC.NOT_ANY:
      return !any;
    case WORLD_INFO_LOGIC.AND_ANY:
    default:
      return any;
  }
}

/**
 * Faithful-but-scoped port of SillyTavern's `checkWorldInfo`: scans the recent chat for entry keys
 * (constant entries always fire), applies selective secondary-key logic, enforces a token budget,
 * and groups activated content by insertion position. Timed effects, inclusion groups and group
 * scoring are intentionally omitted for v1.
 */
export function checkWorldInfo(params: CheckWorldInfoParams): WorldInfoActivation {
  const { entries, settings, maxContext, identity, countTokens } = params;
  const random = params.random ?? Math.random;

  const depth = Math.max(1, settings.depth);
  const scanText = params.chatMessages.slice(-depth).join('\n');

  const candidates = entries.filter((e) => !e.disable && (e.content ?? '').length > 0);
  const active = new Map<string, WorldInfoEntry>();
  const idOf = (e: WorldInfoEntry, i: number) => String(e.uid ?? `i${i}`);

  const shouldActivate = (entry: WorldInfoEntry, scan: string): boolean => {
    if (entry.constant) return true;
    const primary = (entry.key ?? []).some((k) => k && matchKeys(scan, k, entry, settings));
    if (!primary) return false;
    if (entry.selective && (entry.keysecondary?.length ?? 0) > 0 && !secondaryActivated(entry, scan, settings)) {
      return false;
    }
    if (entry.useProbability && (entry.probability ?? 100) < 100) {
      if (random() * 100 >= (entry.probability ?? 100)) return false;
    }
    return true;
  };

  candidates.forEach((entry, i) => {
    if (shouldActivate(entry, scanText)) active.set(idOf(entry, i), entry);
  });

  // Optional bounded recursion: activated content can trigger further entries.
  if (settings.recursive && settings.maxRecursionSteps > 0) {
    let step = 0;
    let added = true;
    while (added && step < settings.maxRecursionSteps) {
      added = false;
      step += 1;
      const recurseText = [...active.values()]
        .filter((e) => !e.preventRecursion)
        .map((e) => e.content)
        .join('\n');
      const combined = `${scanText}\n${recurseText}`;
      candidates.forEach((entry, i) => {
        const id = idOf(entry, i);
        if (active.has(id) || entry.excludeRecursion) return;
        if (shouldActivate(entry, combined)) {
          active.set(id, entry);
          added = true;
        }
      });
    }
  }

  const budget =
    settings.budgetCap > 0
      ? Math.min(settings.budgetCap, Math.round((settings.budget * maxContext) / 100))
      : Math.round((settings.budget * maxContext) / 100);

  // Higher `order` = higher priority; gets budget first.
  const ordered = [...active.values()].sort((a, b) => (b.order ?? 100) - (a.order ?? 100));

  const before: string[] = [];
  const after: string[] = [];
  const depthEntries: { depth: number; role: number | null; content: string }[] = [];
  let used = 0;

  for (const entry of ordered) {
    const content = substituteParams(entry.content ?? '', { identity });
    if (!content) continue;
    const tokens = countTokens(content);
    if (used > 0 && used + tokens > budget) break;
    used += tokens;

    const pos = entry.position ?? WORLD_INFO_POSITION.before;
    if (pos === WORLD_INFO_POSITION.after) {
      after.push(content);
    } else if (pos === WORLD_INFO_POSITION.atDepth) {
      depthEntries.push({ depth: entry.depth ?? 4, role: entry.role ?? null, content });
    } else {
      before.push(content);
    }
  }

  return { before: before.join('\n'), after: after.join('\n'), depth: depthEntries };
}
